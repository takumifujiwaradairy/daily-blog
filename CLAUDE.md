# daily-blog

藤原琢巳のデイリーログブログ。Next.js 14 + Vercel。

## URL

- 本番: https://daily-blog-six.vercel.app
- リポジトリ: https://github.com/takumifujiwaradairy/daily-blog

## 構成

- `posts/ja/` -- 日本語記事（markdown）
- `posts/en/` -- 英語記事（markdown）
- `src/app/[locale]/` -- i18nルーティング（ja/en）
- `/` は `/ja` にリダイレクト

## 記事の追加

1. `posts/ja/YYYY-MM-DD.md` と `posts/en/YYYY-MM-DD.md` を作成
2. frontmatter: title, date, summary
3. 本文は箇条書き
4. pushすればVercelが自動デプロイ

## 記事のルール

- 内容はデイリーノートから公開可能な部分のみ抽出
- 会社名・人名・Slack URL・内部タスク詳細は除外
- 学びや気づきをそのまま箇条書きで載せる（AIが膨らませない）

## デザイン方針

- ミニマルCSS（Tailwind不使用）
- jxck.io / danluu.com を参考にした素朴なスタイル
