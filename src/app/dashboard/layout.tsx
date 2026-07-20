import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

const nav = [
  { href: "/dashboard", label: "Ringkasan" },
  { href: "/dashboard/stok", label: "Stok" },
  { href: "/dashboard/stok/log", label: "Riwayat Stok" },
  { href: "/dashboard/bahan-baku", label: "Bahan Baku" },
  { href: "/dashboard/keuangan", label: "Keuangan" },
  { href: "/dashboard/pesanan", label: "Pesanan" },
  { href: "/dashboard/analitik", label: "Analitik" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-line bg-surface px-4 py-9u hidden sm:block">
        <div className="px-2 mb-9u">
          <p className="text-lg font-semibold text-ink">TomoDagang</p>
          <p className="text-xs text-ink-faint">{session.user?.email}</p>
        </div>
        <nav className="space-y-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="block rounded-md px-3 py-2 text-base text-ink-soft hover:bg-canvas hover:text-ink transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 px-4u py-9u sm:px-9u max-w-5xl mx-auto w-full">{children}</main>
    </div>
  );
}
