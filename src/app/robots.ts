import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // /private/ はあえて disallow しない。robots.txt で塞ぐとクローラーが
      // ページ内の noindex を読めなくなり、URLだけが検索結果に残ることがある。
      // 非公開ページは Cloudflare Access と noindex の2段で守っている。
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
