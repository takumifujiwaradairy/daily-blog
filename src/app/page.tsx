import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export default function Home() {
  const posts = getAllPosts();
  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <article key={post.slug} className="border-b border-neutral-800 pb-6">
          <Link href={`/posts/${post.slug}`} className="group">
            <time className="text-sm text-neutral-500">{post.date}</time>
            <h2 className="text-xl font-semibold mt-1 group-hover:text-blue-400 transition-colors">
              {post.title}
            </h2>
            <p className="text-neutral-400 mt-2 text-sm">{post.summary}</p>
          </Link>
        </article>
      ))}
    </div>
  );
}
