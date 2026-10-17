"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = [href: string, label: string];

/** Sidebar links with the current screen highlighted. A row you can scroll sideways on phones, a column on desktop. */
export default function SideNav({ main, settings, settingsLabel, qs }: { main: Item[]; settings: Item[]; settingsLabel: string; qs: string }) {
  const path = usePathname();
  const link = ([href, label]: Item) => {
    const active = path === href || path.startsWith(href + "/");
    return (
      <Link key={href} href={href + qs} aria-current={active ? "page" : undefined}
        className={`whitespace-nowrap px-4 py-2.5 text-sm transition-colors md:px-7 ${
          active ? "bg-[#FFFEF6]/15 font-semibold" : "opacity-85 hover:bg-[#FFFEF6]/10 hover:opacity-100"}`}>
        {label}
      </Link>
    );
  };
  return (
    <nav className="flex overflow-x-auto [scrollbar-width:none] md:flex-col md:overflow-visible [&::-webkit-scrollbar]:hidden">
      {main.map(link)}
      <p className="mb-1 mt-6 hidden px-7 text-xs uppercase tracking-wider opacity-60 md:block">{settingsLabel}</p>
      {settings.map(link)}
    </nav>
  );
}
