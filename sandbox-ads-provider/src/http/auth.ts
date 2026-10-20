import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { UnauthenticatedError } from "../domain/errors.js";

function same(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Bearer token check; Google Ads additionally requires the developer-token header. */
export function requireAuth(apiToken: string, developerToken?: string): RequestHandler {
  return (req, _res, next) => {
    const bearer = /^Bearer (.+)$/.exec(req.get("authorization") ?? "")?.[1];
    if (!bearer || !same(bearer, apiToken)) return next(new UnauthenticatedError("Missing or invalid OAuth access token"));
    if (developerToken !== undefined && !same(req.get("developer-token") ?? "", developerToken)) {
      const error = new UnauthenticatedError("Missing or invalid developer-token header");
      error.errorCode.authenticationError = "DEVELOPER_TOKEN_INVALID";
      return next(error);
    }
    next();
  };
}
