import type { Locale } from "./posts";

// 本番URL。canonical・sitemap・JSON-LD の絶対URLはすべてここから組み立てる。
// URLが複数の場所に直書きされていると、ドメイン変更時に一部だけ古いまま残り、
// Google に別サイトとして扱われる原因になる。
export const SITE_URL = "https://takumifujiwara.com";

export const AUTHOR = {
  name: "藤原琢巳",
  nameEn: "Takumi Fujiwara",
  kana: "ふじわらたくみ",
  twitter: "@FujiwaraDairy",
};

// 名前検索で「同一人物のアカウント群」として結び付けてもらうためのリスト。
// JSON-LD の sameAs と About ページのリンクで同じものを使う。
export const SOCIAL_LINKS = [
  { label: "X", url: "https://x.com/FujiwaraDairy" },
  { label: "GitHub", url: "https://github.com/takumifujiwaradairy" },
  { label: "LinkedIn", url: "https://www.linkedin.com/in/takumifujiwaradairy/" },
  { label: "note", url: "https://note.com/fujiwara_diary" },
] as const;

// trailingSlash: true なので、canonical も末尾スラッシュ付きに揃える。
// 揃えないと、実際に配信されるURLと canonical がずれてリダイレクト扱いになる。
export function absoluteUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${p.endsWith("/") ? p : `${p}/`}`;
}

// 同じ人物を全ページで1つのエンティティとして指すための固定ID。
// 記事の author はこのIDを参照するだけにして、人物情報の重複を避ける。
export const PERSON_ID = `${SITE_URL}/#person`;

export function personJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    name: AUTHOR.name,
    alternateName: [AUTHOR.nameEn, AUTHOR.kana],
    url: SITE_URL,
    mainEntityOfPage: absoluteUrl(`/${locale}/about`),
    jobTitle: "Software Engineer",
    // 現職ではないので worksFor は使わず、過去に所属した組織として alumniOf に置く。
    alumniOf: [
      { "@type": "CollegeOrUniversity", name: "法政大学" },
      { "@type": "Organization", name: "Yourtory株式会社" },
    ],
    homeLocation: { "@type": "Place", name: "Brisbane, Australia" },
    knowsAbout: ["TypeScript", "Hono", "Ruby on Rails", "React", "AWS", "Security"],
    sameAs: SOCIAL_LINKS.map((s) => s.url),
  };
}

// <script type="application/ld+json"> にそのまま入れると、
// 文字列中の "</script>" でタグが閉じてしまうため "<" をエスケープする。
export function jsonLdString(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: "藤原琢巳 / Takumi Fujiwara" };

type PageMetaInput = {
  locale: Locale;
  // ロケールを除いたパス。トップは ""、記事は "posts/xxx"。
  path: string;
  title?: string;
  // true のとき、title をテンプレート（「| 藤原琢巳」付与）を通さずそのまま使う。
  // 名前を先頭に置いたタイトルなど、末尾に名前を重ねたくないページ用。
  absoluteTitle?: boolean;
  description: string;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
};

// Next.js は子ページで openGraph / twitter を指定すると親の値を丸ごと置き換える
// （項目ごとのマージではない）。ページごとに書くと og:image の付け忘れが起きるので、
// canonical・hreflang・OGP・Twitter Card を必ずこの関数でまとめて作る。
export function pageMetadata({ locale, path, title, absoluteTitle = false, description, type = "website", publishedTime }: PageMetaInput) {
  const sub = path ? `/${path}` : "";
  const url = absoluteUrl(`/${locale}${sub}`);
  // og:title には title.template が効かないので、名前の付与をここで行う。
  const suffix = locale === "ja" ? AUTHOR.name : `${AUTHOR.nameEn} (${AUTHOR.name})`;
  const ogTitle = absoluteTitle && title ? title : `${title ?? "Takumi's Daily Log"} | ${suffix}`;
  return {
    ...(title ? { title: absoluteTitle ? { absolute: title } : title } : {}),
    description,
    alternates: {
      canonical: url,
      languages: {
        ja: absoluteUrl(`/ja${sub}`),
        en: absoluteUrl(`/en${sub}`),
        "x-default": absoluteUrl(`/ja${sub}`),
      },
    },
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: `Takumi's Daily Log | ${AUTHOR.name}`,
      locale: locale === "ja" ? "ja_JP" : "en_US",
      type,
      images: [OG_IMAGE],
      ...(type === "article" ? { publishedTime, authors: [absoluteUrl(`/${locale}/about`)] } : {}),
    },
    twitter: {
      card: "summary_large_image" as const,
      site: AUTHOR.twitter,
      creator: AUTHOR.twitter,
      title: ogTitle,
      description,
      images: [OG_IMAGE.url],
    },
  };
}
