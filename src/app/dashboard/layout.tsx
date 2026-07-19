import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return (
    <div className="flex">
      <aside className="w-48 border-r p-4 space-y-2">
        <Link href="/dashboard">Ringkasan</Link>
        <Link href="/dashboard/stok">Stok</Link>
        <Link href="/dashboard/bahan-baku">Bahan Baku</Link>
        <Link href="/dashboard/keuangan">Keuangan</Link>
        <Link href="/dashboard/pesanan">Pesanan</Link>
        <Link href="/dashboard/analitik">Analitik</Link>
      </aside>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
