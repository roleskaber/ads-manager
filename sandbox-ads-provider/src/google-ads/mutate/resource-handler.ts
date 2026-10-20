import type { Tx } from "../delivery/account-sync.js";

export type MutateContext = { tx: Tx; customerId: string; now: Date };

/** One Google Ads resource collection that supports `:mutate` (create / update / remove). */
export interface ResourceHandler {
  /** URL collection, e.g. "campaigns" for /customers/{id}/campaigns:mutate. */
  readonly collection: string;
  create?(ctx: MutateContext, payload: unknown): Promise<string>;
  update?(ctx: MutateContext, payload: unknown, updateMask: string | undefined): Promise<string>;
  remove?(ctx: MutateContext, resourceName: string): Promise<string>;
}
