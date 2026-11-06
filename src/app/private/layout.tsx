import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Private",
  robots: { index: false, follow: false },
};

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
