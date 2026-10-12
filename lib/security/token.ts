import { createHash, randomBytes } from "node:crypto";

export interface TokenService {
  generate(): string;
  hash(token: string): string;
}

export class RandomTokenService implements TokenService {
  generate() {
    return randomBytes(32).toString("base64url");
  }

  hash(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
}
