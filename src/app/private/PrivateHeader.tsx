import Link from "next/link";

const PAGES = [
  { id: "study", href: "/private/study/", label: "学習時間" },
  { id: "habits", href: "/private/habits/", label: "習慣" },
] as const;

export default function PrivateHeader({
  current,
}: {
  current: (typeof PAGES)[number]["id"];
}) {
  return (
    <header className="topbar">
      {PAGES.map((page) => (
        <Link
          key={page.id}
          href={page.href}
          prefetch={false}
          className="topbar-link"
          aria-current={page.id === current ? "page" : undefined}
        >
          {page.label}
        </Link>
      ))}
    </header>
  );
}
