import { z } from "zod";
import type { Db } from "../../db.js";
import type { Clock } from "../../domain/clock.js";
import { ApiError, InvalidArgumentError, NotFoundError, type FieldPathElement } from "../../domain/errors.js";
import type { AccountSync } from "../delivery/account-sync.js";
import { toApiError } from "../errors.js";
import type { MutateContext, ResourceHandler } from "./resource-handler.js";

const requestSchema = z.object({
  operations: z
    .array(
      z.object({
        create: z.unknown().optional(),
        update: z.unknown().optional(),
        updateMask: z.string().optional(),
        remove: z.string().optional(),
      }),
    )
    .min(1)
    .max(5000),
  partialFailure: z.boolean().default(false),
  validateOnly: z.boolean().default(false),
});

export type MutateResponse = {
  results: ({ resourceName: string } | Record<string, never>)[];
  partialFailureError?: { code: number; message: string; details: unknown[] };
};

class ValidateOnlyRollback extends Error {}

/**
 * Runs `{collection}:mutate` like Google Ads: all operations in one transaction (atomic unless
 * partialFailure), after the account has been synced so changes never rewrite past delivery.
 */
export class MutateService {
  private readonly handlers: Map<string, ResourceHandler>;

  constructor(
    private readonly db: Db,
    private readonly sync: AccountSync,
    private readonly clock: Clock,
    handlers: ResourceHandler[],
  ) {
    this.handlers = new Map(handlers.map((handler) => [handler.collection, handler]));
  }

  supports(collection: string): boolean {
    return this.handlers.has(collection);
  }

  async mutate(customerId: string, collection: string, body: unknown): Promise<MutateResponse> {
    const handler = this.handlers.get(collection);
    if (!handler) throw new NotFoundError(`Collection ${collection}`);
    const request = requestSchema.parse(body);

    const failures: ApiError[] = [];
    let response: MutateResponse = { results: [] };

    try {
      await this.db.$transaction(
        async (tx) => {
          if (!(await this.sync.sync(tx, customerId))) throw new NotFoundError(`Customer ${customerId}`);
          const ctx: MutateContext = { tx, customerId, now: this.clock.now() };
          const results: MutateResponse["results"] = [];

          for (const [index, operation] of request.operations.entries()) {
            // A savepoint lets a failed operation roll back alone under partialFailure.
            if (request.partialFailure) await tx.$executeRawUnsafe("SAVEPOINT mutate_operation");
            try {
              results.push({ resourceName: await this.apply(handler, ctx, operation) });
              if (request.partialFailure) await tx.$executeRawUnsafe("RELEASE SAVEPOINT mutate_operation");
            } catch (error) {
              const apiError = withLocation(toApiError(error), [{ fieldName: "operations", index }, ...operationField(operation)]);
              if (!request.partialFailure) throw apiError;
              await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT mutate_operation");
              failures.push(apiError);
              results.push({});
            }
          }

          response = { results };
          if (request.validateOnly) throw new ValidateOnlyRollback();
        },
        { timeout: 30_000 },
      );
    } catch (error) {
      if (!(error instanceof ValidateOnlyRollback)) throw error;
      return { results: [] };
    }

    if (failures.length) {
      response.partialFailureError = {
        code: 3,
        message: failures.map((failure) => failure.message).join(", "),
        details: [{ errors: failures.map(errorDetail) }],
      };
    }
    return response;
  }

  private async apply(handler: ResourceHandler, ctx: MutateContext, operation: z.infer<typeof requestSchema>["operations"][number]) {
    const kinds = [operation.create !== undefined, operation.update !== undefined, operation.remove !== undefined].filter(Boolean);
    if (kinds.length !== 1) {
      throw new InvalidArgumentError("Each operation must set exactly one of create, update or remove", { mutateError: "INVALID_OPERATION" });
    }
    const unsupported = () => new InvalidArgumentError(`Operation is not supported for ${handler.collection}`, { mutateError: "OPERATION_NOT_SUPPORTED" });

    if (operation.create !== undefined) {
      if (!handler.create) throw unsupported();
      return handler.create(ctx, operation.create);
    }
    if (operation.update !== undefined) {
      if (!handler.update) throw unsupported();
      return handler.update(ctx, operation.update, operation.updateMask);
    }
    if (!handler.remove) throw unsupported();
    return handler.remove(ctx, operation.remove!);
  }
}

function operationField(operation: { create?: unknown; update?: unknown }): FieldPathElement[] {
  if (operation.create !== undefined) return [{ fieldName: "create" }];
  if (operation.update !== undefined) return [{ fieldName: "update" }];
  return [{ fieldName: "remove" }];
}

function withLocation(error: ApiError, prefix: FieldPathElement[]): ApiError {
  error.location = { fieldPathElements: [...prefix, ...(error.location?.fieldPathElements ?? [])] };
  return error;
}

export function errorDetail(error: ApiError) {
  return { errorCode: error.errorCode, message: error.message, ...(error.location ? { location: error.location } : {}) };
}
