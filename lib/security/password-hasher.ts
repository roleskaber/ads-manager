import { compare, hash } from "bcryptjs";

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hashed: string): Promise<boolean>;
}

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly rounds = 12) {}

  hash(plain: string) {
    return hash(plain, this.rounds);
  }

  verify(plain: string, hashed: string) {
    return compare(plain, hashed);
  }
}
