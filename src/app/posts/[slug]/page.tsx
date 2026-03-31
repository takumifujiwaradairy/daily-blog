import { getPost, getAllSlugs } from "@/lib/posts";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export default async function PostPage({
  params,
}: {
  params: { slug: string };
}) {
  try {
    const post = await getPost(params.slug);
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
