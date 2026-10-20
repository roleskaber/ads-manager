export const MICROS_PER_UNIT = 1_000_000;

export function toMicros(units: number): number {
  return units * MICROS_PER_UNIT;
}
