import { ZodError } from "zod";
import { ApiError, InvalidArgumentError } from "../domain/errors.js";
import { Prisma } from "../generated/prisma/client.js";

/** Normalises expected failures into ApiError; anything unexpected is rethrown as is. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof ZodError) {
    const issue = error.issues[0]!;
    const path = issue.path.map(String);
    const apiError = new InvalidArgumentError(`${path.join(".") || "request"}: ${issue.message}`, {
      fieldError: issue.code === "invalid_type" && issue.input === undefined ? "REQUIRED" : "INVALID_VALUE",
    });
    apiError.location = {
      fieldPathElements: issue.path.map((part) =>
        typeof part === "number" ? { fieldName: "", index: part } : { fieldName: String(part) },
      ),
    };
    return apiError;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return new InvalidArgumentError("A resource with the same unique fields already exists", { mutateError: "DUPLICATE_RESOURCE" });
  }
  throw error;
}
