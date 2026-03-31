import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

export type Locale = "ja" | "en";

export type Post = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  contentHtml: string;
};

function postsDir(locale: Locale) {
  return path.join(process.cwd(), "posts", locale);
}

export function getAllSlugs(locale: Locale): string[] {
  return fs
    .readdirSync(postsDir(locale))
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

export function getAllPosts(locale: Locale): Omit<Post, "contentHtml">[] {
  return getAllSlugs(locale)
    .map((slug) => {
      const { data } = matter(
        fs.readFileSync(path.join(postsDir(locale), `${slug}.md`), "utf8")
      );
      return {
        slug,
        title: (data.title as string) || slug,
        date: (data.date as string) || slug,
        summary: (data.summary as string) || "",
      };
    })
    .sort((a, b) => (a.date > b.date ? -1 : 1));
}

export async function getPost(locale: Locale, slug: string): Promise<Post> {
  const raw = fs.readFileSync(
    path.join(postsDir(locale), `${slug}.md`),
    "utf8"
  );
  const { data, content } = matter(raw);
  const result = await remark().use(html).process(content);
  return {
    slug,
    title: (data.title as string) || slug,
    date: (data.date as string) || slug,
    summary: (data.summary as string) || "",
    contentHtml: result.toString(),
  };
}
