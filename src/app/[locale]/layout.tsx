import type { Metadata } from "next";
import localFont from "next/font/local";
import "../globals.css";
import { t, locales } from "@/lib/i18n";
import type { Locale } from "@/lib/posts";
import Link from "next/link";

const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Metadata {
  const locale = params.locale as Locale;
  const i = t(locale);
  return {
    title: i.siteTitle,
    description: i.siteDescription,
  };
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  const i = t(locale);
  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-neutral-950 text-neutral-100`}
      >
        <header className="border-b border-neutral-800 py-4 px-6 flex items-center justify-between">
          <Link href={`/${locale}`} className="text-lg font-bold tracking-tight">
            {i.siteTitle}
          </Link>
          <Link
            href={`/${i.langSwitchTo}`}
            className="text-sm text-neutral-400 hover:text-white transition-colors border border-neutral-700 rounded px-2 py-1"
          >
            {i.langSwitch}
          </Link>
        </header>
        <main className="max-w-2xl mx-auto px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
