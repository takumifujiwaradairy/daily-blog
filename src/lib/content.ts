import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import type { Locale } from "./posts";

// posts と分けている理由: posts は日付順に並ぶ流れるコンテンツ、
// pages は日付を持たない常設コンテンツ（職歴など）。
// 同じ置き場にすると職歴がトップの時系列に混ざる。

export type Page = {
  slug: string;
  title: string;
  summary: string;
  contentHtml: string;
};

export async function getPage(locale: Locale, slug: string): Promise<Page> {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "content", locale, `${slug}.md`),
    "utf8"
  );
  const { data, content } = matter(raw);
  // 見出しを1段下げる。markdown 側は素の履歴書として読みたいので
  // 最上位を「#」で書いているが、ページの h1 は title が持っている。
  // そのまま出すと h1 が複数になる。
  const demoted = content.replace(/^(#{1,5}) /gm, "#$1 ");
  const result = await remark().use(html).process(demoted);
  return {
    slug,
    title: (data.title as string) || slug,
    summary: (data.summary as string) || "",
    contentHtml: result.toString(),
  };
}
