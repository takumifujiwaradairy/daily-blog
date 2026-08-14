import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import { locales } from "@/lib/i18n";
import type { Locale } from "@/lib/posts";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: loc } = await params;
  const page = await getPage(loc as Locale, "cv");
  return { title: page.title, description: page.summary };
}

export default async function Cv({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: loc } = await params;
  const page = await getPage(loc as Locale, "cv");
  return (
    <div>
      <h1 className="post-title">{page.title}</h1>
      <div className="post-body cv" dangerouslySetInnerHTML={{ __html: page.contentHtml }} />
    </div>
  );
}
