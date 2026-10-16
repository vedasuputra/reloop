import Link from "next/link";
import { logout } from "@/app/login/actions";

const LINKS = [
  ["/", "Dashboard"],
  ["/orders", "Order Analysis"],
  ["/prediction", "AI Prediction"],
  ["/recommendation", "Recommendation"],
  ["/simulator", "Scenario Simulator"],
  ["/upload", "Upload CSV"],
];

/** Top navigation. `qs` keeps the chosen method/preset when switching screens. */
export default function Nav({ qs = "", email }: { qs?: string; email?: string }) {
  return (
    <header className="border-b pb-3 mb-6 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-lg">ReLoop AI</span>
        <div className="flex items-center gap-3 text-sm">
          {email && <span className="text-gray-500">{email}</span>}
          <form action={logout}><button className="underline">Keluar</button></form>
        </div>
      </div>
      <nav className="flex flex-wrap gap-3 text-sm">
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href + qs} className="underline">{label}</Link>
        ))}
      </nav>
      <p className="text-xs text-gray-500">Semua data adalah data simulasi.</p>
    </header>
  );
}
