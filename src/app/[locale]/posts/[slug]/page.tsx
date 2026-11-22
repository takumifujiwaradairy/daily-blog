import type { Metadata } from "next";
import Link from "next/link";
import { getPost, getAllSlugs } from "@/lib/posts";
import type { Locale, Post } from "@/lib/posts";
import { locales, t } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { AUTHOR, OG_IMAGE, PERSON_ID, SITE_URL, absoluteUrl, jsonLdString, pageMetadata } from "@/lib/site";

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    getAllSlugs(locale).map((slug) => ({ locale, slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: loc, slug } = await params;
  const locale = loc as Locale;
  try {
    const post = await getPost(locale, slug);
    return {
      ...pageMetadata({
        locale,
        path: `posts/${slug}`,
        title: post.title,
        description: post.summary,
        type: "article",
        publishedTime: post.date,
      }),
      authors: [{ name: AUTHOR.name, url: absoluteUrl(`/${locale}/about`) }],
    };
  } catch {
    return {};
  }
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: loc, slug } = await params;
  const locale = loc as Locale;
  const i = t(locale);
  let post: Post;
  try {
    post = await getPost(locale, slug);
  } catch {
    notFound();
  }
  const url = absoluteUrl(`/${locale}/posts/${slug}`);
  // author は人物情報を書き直さず、トップ・About と同じ @id を参照する。
  // 「同じ Person がこの記事を書いた」と結び付くことが、名前検索で効く部分。
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    inLanguage: locale,
    url,
    mainEntityOfPage: url,
    image: `${SITE_URL}${OG_IMAGE.url}`,
    author: {
      "@type": "Person",
      "@id": PERSON_ID,
      name: AUTHOR.name,
      url: absoluteUrl(`/${locale}/about`),
    },
  };
  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <time dateTime={post.date}>{post.date}</time>
      <h1 className="post-title">{post.title}</h1>
      <p className="post-author">
        {i.author}: <Link href={`/${locale}/about`} rel="author">{AUTHOR.name}</Link>
      </p>
      <div
        className="post-body"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </article>
  );
}
