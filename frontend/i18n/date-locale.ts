import { enUS, ru } from "date-fns/locale";
import type { Locale } from "./config";

export const dateLocales = { en: enUS, ru } satisfies Record<Locale, unknown>;
