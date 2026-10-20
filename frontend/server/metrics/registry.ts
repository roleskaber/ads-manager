import "server-only";
import { collectDefaultMetrics, Registry } from "prom-client";

const globalForMetrics = globalThis as unknown as { metricsRegistry?: Registry };

// One registry per process; kept on globalThis so dev hot reloads don't register metrics twice.
function createRegistry() {
  const registry = new Registry();
  registry.setDefaultLabels({ app: "ads-manager" });
  collectDefaultMetrics({ register: registry, prefix: "adsm_" });
  return registry;
}

export const metricsRegistry = (globalForMetrics.metricsRegistry ??= createRegistry());
