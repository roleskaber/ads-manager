import { randomBytes, randomInt } from "node:crypto";

const URL_SAFE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const PUBLIC_ID = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomString(alphabet: string, length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}

/** 10-digit Google Ads customer id that never starts with 0. */
export function newCustomerId(): string {
  return String(randomInt(1_000_000_000, 10_000_000_000));
}

/** Google click id appended to landing pages. */
export function newGclid(): string {
  return `Cj0K${randomString(URL_SAFE, 60)}`;
}

/** Conversion label, e.g. "AbC-D_efG-hIjKlMnOp". */
export function newConversionLabel(): string {
  return randomString(URL_SAFE, 20);
}

/** Tag Manager container public id, e.g. "GTM-K7Q2M9X". */
export function newContainerPublicId(): string {
  return `GTM-${randomString(PUBLIC_ID, 7)}`;
}
