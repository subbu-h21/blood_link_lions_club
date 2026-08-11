import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Inter, Geist_Mono } from "next/font/google";
import { FadeImage } from "@/components/media/FadeImage";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { dictionaries, getServerLocale } from "@/lib/i18n/locale";
import "./globals.css";

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blood Donor Search",
  description: "Blood donation platform for Lions Club, Uttara Kannada district",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  const t = dictionaries[locale].footer;
  const header = dictionaries[locale].siteHeader;

  return (
    <html
      lang={locale}
      className={`${bodyFont.variable} ${displayFont.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink-900">
        <LocaleProvider initialLocale={locale}>
          <header className="flex items-center justify-between border-b border-ink-100 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <FadeImage src="/lions-club-logo.webp" alt="" width={36} height={34} className="h-8 w-auto sm:h-9" priority />
              <span className="font-display text-lg  tracking-tight text-ink-900">
                {header.brandName}
              </span>
            </Link>
            <LanguageToggle />
          </header>
          <div className="flex-1 flex flex-col">{children}</div>
          <footer className="flex gap-4 justify-center border-t border-ink-100 px-6 py-4 text-sm text-ink-500">
            <Link href="/privacy" className="underline hover:text-ink-900">
              {t.privacyLink}
            </Link>
            <Link href="/terms" className="underline hover:text-ink-900">
              {t.termsLink}
            </Link>
          </footer>
        </LocaleProvider>
      </body>
    </html>
  );
}
