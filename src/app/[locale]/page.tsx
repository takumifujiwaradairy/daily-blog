import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import type { Locale } from "@/lib/posts";

export default function Home({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const posts = getAllPosts(locale);
  return (
    <div>
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
