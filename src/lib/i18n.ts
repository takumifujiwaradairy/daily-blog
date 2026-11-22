import type { Locale } from "./posts";

export const locales: Locale[] = ["ja", "en"];
export const defaultLocale: Locale = "ja";

const dict = {
  ja: {
    siteTitle: "Takumi's Daily Log",
    siteDescription:
      "藤原琢巳（Takumi Fujiwara）のサイト。ソフトウェアエンジニア。元Yourtory株式会社 共同創業 兼 エンジニアリングマネージャー。ブリスベン在住。日々の学びと作業ログ。",
    // 全ページの <title> 末尾に付ける名前。名前検索で本人のサイトだと判別できるようにする。
    titleSuffix: "藤原琢巳",
    // CVは名前検索の着地点なので、名前を末尾ではなく先頭に置いた専用タイトルにする。
    cvTitle: "藤原琢巳 | フルスタックエンジニア プロフィール",
    cvName: "藤原琢巳（Takumi Fujiwara）",
    about: "About",
    author: "著者",
    profile: "プロフィール",
    langSwitch: "EN",
    langSwitchTo: "en" as Locale,
  },
  en: {
    siteTitle: "Takumi's Daily Log",
    siteDescription:
      "Website of Takumi Fujiwara (藤原琢巳), software engineer. Former co-founder and Engineering Manager at Yourtory Inc. Based in Brisbane. Daily learnings and work log.",
    titleSuffix: "Takumi Fujiwara (藤原琢巳)",
    cvTitle: "Takumi Fujiwara | Full-stack Engineer CV",
    cvName: "Takumi Fujiwara (藤原琢巳)",
    about: "About",
    author: "Author",
    profile: "Profile",
    langSwitch: "JA",
    langSwitchTo: "ja" as Locale,
  },
} as const;

export function t(locale: Locale) {
  return dict[locale];
}
