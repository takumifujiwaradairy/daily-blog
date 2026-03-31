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
  params: { locale: string; slug: string };
}) {
  const locale = params.locale as Locale;
  try {
    const post = await getPost(locale, params.slug);
    return (
      <article>
        <time className="text-sm text-neutral-500">{post.date}</time>
        <h1 className="text-2xl font-bold mt-2 mb-6">{post.title}</h1>
        <div
          className="prose prose-invert prose-neutral max-w-none"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      </article>
    );
  } catch {
    notFound();
  }
}
