import { getPost, getAllSlugs } from "@/lib/posts";
import type { Locale } from "@/lib/posts";
import { locales } from "@/lib/i18n";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    getAllSlugs(locale).map((slug) => ({ locale, slug }))
  );
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: loc, slug } = await params;
  const locale = loc as Locale;
  try {
    const post = await getPost(locale, slug);
    return (
      <article>
        <time>{post.date}</time>
        <h1 className="post-title">{post.title}</h1>
        <div
          className="post-body"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      </article>
    );
  } catch {
    notFound();
  }
}
