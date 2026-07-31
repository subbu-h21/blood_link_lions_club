import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getServerLocale } from "@/lib/i18n/locale";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LocaleProvider initialLocale={locale}>
          <div className="flex justify-end p-2">
            <LanguageToggle />
          </div>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
