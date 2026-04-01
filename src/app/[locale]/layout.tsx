import type { Metadata } from "next";
import "../globals.css";
import { t, locales } from "@/lib/i18n";
import type { Locale } from "@/lib/posts";
import Link from "next/link";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: loc } = await params;
  const locale = loc as Locale;
  const i = t(locale);
  return {
    title: i.siteTitle,
    description: i.siteDescription,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: loc } = await params;
  const locale = loc as Locale;
  const i = t(locale);
  return (
    <html lang={locale}>
      <body>
        <header>
          <Link href={`/${locale}`} className="site-title">
            {i.siteTitle}
          </Link>
          <Link href={`/${i.langSwitchTo}`} className="lang-switch">
            {i.langSwitch}
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}
