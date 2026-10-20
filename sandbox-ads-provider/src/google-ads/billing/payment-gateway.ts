/**
 * Simulated card processor. Like Stripe test mode it only accepts test tokens, never card
 * numbers, and each token has a fixed outcome.
 */
export type CardCharge =
  | { status: "SUCCEEDED"; brand: string; last4: string }
  | { status: "DECLINED"; brand: string; last4: string; declineReason: string };

const TEST_TOKENS: Record<string, CardCharge> = {
  tok_visa: { status: "SUCCEEDED", brand: "VISA", last4: "4242" },
  tok_mastercard: { status: "SUCCEEDED", brand: "MASTERCARD", last4: "4444" },
  tok_amex: { status: "SUCCEEDED", brand: "AMEX", last4: "8431" },
  tok_chargeDeclined: { status: "DECLINED", brand: "VISA", last4: "0002", declineReason: "CARD_DECLINED" },
  tok_insufficientFunds: { status: "DECLINED", brand: "VISA", last4: "9995", declineReason: "INSUFFICIENT_FUNDS" },
  tok_expiredCard: { status: "DECLINED", brand: "VISA", last4: "0069", declineReason: "EXPIRED_CARD" },
  tok_fraudulent: { status: "DECLINED", brand: "VISA", last4: "0019", declineReason: "SUSPECTED_FRAUD" },
};

export const TEST_CARD_TOKENS = Object.keys(TEST_TOKENS);

export function chargeCard(token: string): CardCharge | null {
  return TEST_TOKENS[token] ?? null;
}
