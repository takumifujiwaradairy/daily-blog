/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare へは完全な静的サイトとして配信する。
  // 記事は markdown → ビルド時にHTML化されるだけで、実行時のサーバー処理が一切ない。
  output: "export",
  // /ja → out/ja/index.html を生成する。拡張子なしURLを静的ホスティングで解決するため。
  trailingSlash: true,
};

export default nextConfig;
