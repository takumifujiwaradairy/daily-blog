import type { Metadata } from "next";
import "../globals.css";
import { t, locales } from "@/lib/i18n";
import type { Locale } from "@/lib/posts";
import Link from "next/link";
import { SITE_URL, pageMetadata } from "@/lib/site";

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
  const base = pageMetadata({ locale, path: "", description: i.siteDescription });
  return {
    // 相対パスで書いた og:image や canonical を絶対URLに解決する基準。
    metadataBase: new URL(SITE_URL),
    // ページ側で上書きしなかった場合の既定値（OGP・Twitter Card）。
    // canonical と og:url はここに置かない。置くと、個別に指定し忘れたページが
    // 全部「トップの複製」と宣言されてしまうため、各ページで設定する。
    description: base.description,
    openGraph: { ...base.openGraph, url: undefined },
    twitter: base.twitter,
    // 各ページの title に「| 藤原琢巳」を自動で付ける。
    title: {
      default: `${i.siteTitle} | ${i.titleSuffix}`,
      template: `%s | ${i.titleSuffix}`,
    },
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
          <nav>
            <Link href={`/${locale}/about`}>{i.about}</Link>
            <Link href={`/${locale}/cv`}>{i.profile}</Link>
            <Link href={`/${i.langSwitchTo}`} className="lang-switch">
              {i.langSwitch}
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
