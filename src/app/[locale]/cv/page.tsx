import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import { locales, t } from "@/lib/i18n";
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
  const locale = loc as Locale;
  const page = await getPage(locale, "cv");
  return pageMetadata({
    locale,
    path: "cv",
    title: t(locale).cvTitle,
    absoluteTitle: true,
    description: page.summary,
    type: "profile",
  });
}

export default async function Cv({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: loc } = await params;
  const locale = loc as Locale;
  const i = t(locale);
  const page = await getPage(locale, "cv");
  return (
    <div>
      {/* Person はトップ・About と同じ @id。CVもこの人物のページだと結び付ける。 */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(personJsonLd(locale)) }} />
      <h1 className="post-title">{page.title}</h1>
      <p className="cv-name">{i.cvName}</p>
      <div className="post-body cv" dangerouslySetInnerHTML={{ __html: page.contentHtml }} />
    </div>
  );
}
