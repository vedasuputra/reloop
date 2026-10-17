"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = [href: string, label: string];

export type NavGroup = { label: string; items: Item[] };

/** Sidebar links in labelled groups (a group with an empty label stands alone, with no heading), with the current screen highlighted. */
export default function SideNav({ groups, qs }: { groups: NavGroup[]; qs: string }) {
  const path = usePathname();
  const link = ([href, label]: Item) => {
    const active = path === href || path.startsWith(href + "/");
    return (
      <Link key={href} href={href + qs} aria-current={active ? "page" : undefined}
        className={`whitespace-nowrap px-7 py-2.5 text-sm transition-colors ${
          active ? "bg-[#FFFEF6]/15 font-semibold" : "opacity-85 hover:bg-[#FFFEF6]/10 hover:opacity-100"}`}>
        {label}
      </Link>
    );
  };
  return (
    <nav className="flex flex-col">
      {groups.map((g, i) => (
        <div key={g.label || "top"} className="flex flex-col">
          {g.label && <p className={`mb-1 px-7 text-xs uppercase tracking-wider opacity-60 ${i > 0 ? "mt-6" : ""}`}>{g.label}</p>}
          {g.items.map(link)}
        </div>
      ))}
    </nav>
  );
}
