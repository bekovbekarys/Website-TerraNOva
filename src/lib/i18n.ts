import "server-only";
import { cookies } from "next/headers";
import { en, type Messages } from "./dictionaries/en";
import { ru } from "./dictionaries/ru";

export const LOCALES = ["en", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

const DICTS: Record<Locale, Messages> = { en, ru };
export type Dict = Messages;

/** Current locale from the cookie (defaults to English). Server-only. */
export function getLocale(): Locale {
  const value = cookies().get(LOCALE_COOKIE)?.value;
  return value === "ru" ? "ru" : "en";
}

export function getDictionary(locale: Locale): Dict {
  return DICTS[locale];
}

/** Convenience: dictionary for the current request locale. */
export function getDict(): Dict {
  return getDictionary(getLocale());
}

/** Replaces {key} placeholders in a string, e.g. format(t, { n: 3 }). */
export function format(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`
  );
}
