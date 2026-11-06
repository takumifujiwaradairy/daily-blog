import type { Metadata } from "next";
import "./private.css";

export const metadata: Metadata = {
  title: "Study",
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
