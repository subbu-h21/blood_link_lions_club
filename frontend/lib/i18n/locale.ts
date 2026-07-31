import en from "./en";
import kn from "./kn";

export type Locale = "en" | "kn";
export const LOCALES: Locale[] = ["en", "kn"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

export const dictionaries = { en, kn };

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "kn";
}

/** Server-only. Reads the locale cookie set by <LanguageToggle>. */
export async function getServerLocale(): Promise<Locale> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
