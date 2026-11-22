import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import { locales } from "@/lib/i18n";
import type { Locale } from "@/lib/posts";
import { jsonLdString, pageMetadata, personJsonLd } from "@/lib/site";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: loc } = await params;
  const page = await getPage(loc as Locale, "about");
  return pageMetadata({
    locale: loc as Locale,
    path: "about",
    title: "About",
    description: page.summary,
    type: "profile",
  });
}

export default async function About({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: loc } = await params;
  const locale = loc as Locale;
  const page = await getPage(locale, "about");
  // About は「この人物について書かれたページ」なので ProfilePage で包み、
  // 中身の Person はトップと同じ @id を使って同一人物として扱わせる。
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    inLanguage: locale,
    mainEntity: personJsonLd(locale),
  };
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <h1 className="post-title">{page.title}</h1>
      <div className="post-body cv" dangerouslySetInnerHTML={{ __html: page.contentHtml }} />
    </div>
  );
}
