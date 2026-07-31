"use client";

import { useTranslation } from "@/lib/i18n/LocaleProvider";

export function LanguageToggle() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div className="flex gap-1 text-sm" role="group" aria-label="Language">
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={locale === "en" ? "font-semibold underline" : "text-gray-500"}
      >
        {t("languageToggle.english")}
      </button>
      <span aria-hidden>·</span>
      <button
        type="button"
        onClick={() => setLocale("kn")}
        aria-pressed={locale === "kn"}
        className={locale === "kn" ? "font-semibold underline" : "text-gray-500"}
      >
        {t("languageToggle.kannada")}
      </button>
    </div>
  );
}
