/**
 * Errors mapped to Google API style responses. `errorCode` mirrors GoogleAdsError.errorCode,
 * e.g. { campaignError: "DUPLICATE_CAMPAIGN_NAME" }.
 */
export type FieldPathElement = { fieldName: string; index?: number };

export class ApiError extends Error {
  /** Where in the request the error is, e.g. operations[2].create.name. */
  location?: { fieldPathElements: FieldPathElement[] };

  constructor(
    readonly httpStatus: number,
    readonly status: string,
    message: string,
    readonly errorCode: Record<string, string> = {},
  ) {
    super(message);
  }
}

export class NotFoundError extends ApiError {
  constructor(what: string) {
    super(404, "NOT_FOUND", `${what} was not found`, { mutateError: "RESOURCE_NOT_FOUND" });
  }
}

export class InvalidArgumentError extends ApiError {
  constructor(message: string, errorCode: Record<string, string> = { requestError: "INVALID_INPUT" }) {
    super(400, "INVALID_ARGUMENT", message, errorCode);
  }
}

/** The request is valid but not allowed in the entity's current state. */
export class PreconditionError extends ApiError {
  constructor(message: string, errorCode: Record<string, string>) {
    super(400, "FAILED_PRECONDITION", message, errorCode);
  }
}

export class UnauthenticatedError extends ApiError {
  constructor(message: string) {
    super(401, "UNAUTHENTICATED", message, { authenticationError: "AUTHENTICATION_ERROR" });
  }
}
