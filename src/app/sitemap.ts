import type { MetadataRoute } from "next";
import { getAllPosts, getAllSlugs } from "@/lib/posts";
import { locales } from "@/lib/i18n";
import type { Locale } from "@/lib/posts";
import { absoluteUrl } from "@/lib/site";

// output: "export" ではビルド時に1回だけ生成する静的ファイルにする必要がある。
export const dynamic = "force-static";

// 固定ページ。新しい常設ページを公開したらここに足す。
// （ディレクトリを自動で拾わないのは、作りかけのページを載せないため）
const STATIC_PATHS = ["", "about", "cv"];

// 固定ページは更新日を持たないので、ビルド日時を使う。
// 静的サイトはビルドのたびに中身が作り直されるので、実態とずれない。
const BUILD_TIME = new Date();

// 相互参照は「実在するロケールだけ」に張る。片方の言語にしかない記事で
// 存在しないURLを hreflang に載せると、Search Console でエラーになる。
function alternatesFor(sub: string, available: Locale[] = locales) {
  return {
    languages: Object.fromEntries(available.map((l) => [l, absoluteUrl(`/${l}${sub}`)])),
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = STATIC_PATHS.flatMap((p) => {
    const sub = p ? `/${p}` : "";
    return locales.map((locale) => ({
      url: absoluteUrl(`/${locale}${sub}`),
      lastModified: BUILD_TIME,
      alternates: alternatesFor(sub),
    }));
  });

  const slugsByLocale = new Map(locales.map((l) => [l, new Set(getAllSlugs(l))]));
  const posts = locales.flatMap((locale) =>
    getAllPosts(locale).map((post) => {
      const available = locales.filter((l) => slugsByLocale.get(l)?.has(post.slug));
      return {
        url: absoluteUrl(`/${locale}/posts/${post.slug}`),
        lastModified: post.updated ?? post.date,
        alternates: alternatesFor(`/posts/${post.slug}`, available),
      };
    })
  );

  return [...pages, ...posts];
}
