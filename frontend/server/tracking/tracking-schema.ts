import { z } from "zod";

const MAX_PROPERTIES_BYTES = 4096;
const id = z.string().trim().min(1).max(128);

export const trackEventSchema = z
  .object({
    event: z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_.:-]+$/, "Use letters, digits, _ . : -"),
    anonymousId: id.optional(),
    userId: id.optional(),
    url: z.string().max(2048).optional(),
    referrer: z.string().max(2048).optional(),
    timestamp: z.iso.datetime({ offset: true }).optional(),
    properties: z
      .record(z.string(), z.unknown())
      .refine((value) => JSON.stringify(value).length <= MAX_PROPERTIES_BYTES, "properties are too large")
      .optional(),
  })
  .refine((event) => event.anonymousId || event.userId, { message: "anonymousId or userId is required" });

export const trackPayloadSchema = z.object({
  key: z.string().trim().min(1).max(64),
  events: z.array(z.unknown()).min(1).max(50),
});

export type TrackEventInput = z.infer<typeof trackEventSchema>;

/** Accepts `{ key, events: [...] }` or a single event `{ key, event, ... }`. */
export function normalizePayload(body: unknown, headerKey: string | null) {
  const record = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const { key, events, ...single } = record;
  return trackPayloadSchema.safeParse({
    key: headerKey ?? key,
    events: Array.isArray(events) ? events : [single],
  });
}
