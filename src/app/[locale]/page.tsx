import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import type { Locale } from "@/lib/posts";
import type { Metadata } from "next";
import { t } from "@/lib/i18n";
import { SITE_URL, PERSON_ID, jsonLdString, pageMetadata, personJsonLd } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: loc } = await params;
  const locale = loc as Locale;
  return pageMetadata({ locale, path: "", description: t(locale).siteDescription });
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: loc } = await params;
  const locale = loc as Locale;
  const posts = getAllPosts(locale);
  // トップは「このサイトは誰のものか」を宣言する場所なので、
  // サイト(WebSite)とその持ち主(Person)を同じ @id で結び付けて埋め込む。
  const jsonLd = [
    personJsonLd(locale),
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Takumi's Daily Log",
      url: SITE_URL,
      inLanguage: locale,
      author: { "@id": PERSON_ID },
    },
  ];
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      {posts.map((post) => (
        <article key={post.slug}>
          <time>{post.date}</time>
          <h2>
            <Link href={`/${locale}/posts/${post.slug}`}>{post.title}</Link>
          </h2>
          <p className="summary">{post.summary}</p>
        </article>
      ))}
    </div>
  );
}
