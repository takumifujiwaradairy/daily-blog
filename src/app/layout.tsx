import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Takumi's Daily Log",
  description: "日々の学びと作業ログ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-neutral-950 text-neutral-100`}
      >
        <header className="border-b border-neutral-800 py-4 px-6">
          <a href="/" className="text-lg font-bold tracking-tight">
            Takumi&apos;s Daily Log
          </a>
        </header>
        <main className="max-w-2xl mx-auto px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
