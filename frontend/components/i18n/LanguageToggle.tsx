"use client";

import { useTranslation } from "@/lib/i18n/LocaleProvider";

export function LanguageToggle() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-ink-200 bg-white/60 p-1 text-sm"
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={
          locale === "en"
            ? "rounded-full bg-blood-600 px-3 py-1 font-semibold text-white"
            : "rounded-full px-3 py-1 text-ink-500 transition hover:text-ink-900"
        }
      >
        {t("languageToggle.english")}
      </button>
      <button
        type="button"
        onClick={() => setLocale("kn")}
        aria-pressed={locale === "kn"}
        className={
          locale === "kn"
            ? "rounded-full bg-blood-600 px-3 py-1 font-semibold text-white"
            : "rounded-full px-3 py-1 text-ink-500 transition hover:text-ink-900"
        }
      >
        {t("languageToggle.kannada")}
      </button>
    </div>
  );
}
