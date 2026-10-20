import type { ErrorRequestHandler } from "express";
import { ApiError, InvalidArgumentError } from "../domain/errors.js";
import { toApiError } from "../google-ads/errors.js";

/** Google API error envelope: { error: { code, message, status, details: [{ errors: [...] }] } }. */
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  let apiError: ApiError;
  try {
    apiError =
      error instanceof SyntaxError && "body" in error
        ? new InvalidArgumentError("Request body is not valid JSON", { requestError: "INVALID_INPUT" })
        : toApiError(error);
  } catch {
    console.error(`[${req.method} ${req.originalUrl}]`, error);
    res.status(500).json({ error: { code: 500, message: "Internal error", status: "INTERNAL" } });
    return;
  }

  res.status(apiError.httpStatus).json({
    error: {
      code: apiError.httpStatus,
      message: apiError.message,
      status: apiError.status,
      details: [
        {
          "@type": "type.googleapis.com/google.ads.googleads.v1.errors.GoogleAdsFailure",
          errors: [{ errorCode: apiError.errorCode, message: apiError.message, ...(apiError.location ? { location: apiError.location } : {}) }],
        },
      ],
    },
  });
};
