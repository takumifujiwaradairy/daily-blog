import type { Locale } from "./posts";

export const locales: Locale[] = ["ja", "en"];
export const defaultLocale: Locale = "ja";

const dict = {
  ja: {
    siteTitle: "Takumi's Daily Log",
    siteDescription: "日々の学びと作業ログ",
    langSwitch: "EN",
    langSwitchTo: "en" as Locale,
  },
  en: {
    siteTitle: "Takumi's Daily Log",
    siteDescription: "Daily learnings and work log",
    langSwitch: "JA",
    langSwitchTo: "ja" as Locale,
  },
} as const;

export function t(locale: Locale) {
  return dict[locale];
}
