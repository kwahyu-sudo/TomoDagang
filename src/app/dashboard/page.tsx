import { prisma } from "@/lib/prisma";
import { fmt } from "@/lib/format";
import SummaryCard from "@/components/SummaryCard";

export default async function DashboardHome() {
  const [produk, pesanan, tr] = await Promise.all([
    prisma.produk.findMany({ where: { deletedAt: null } }),
    prisma.pesanan.findMany({ take: 100 }),
    prisma.transaksi.findMany({ take: 100 }),
  ]);

  const low = produk.filter((p) => p.stok < p.minStok).length;
  const baru = pesanan.filter((p) => p.status === "BARU").length;
  const draft = pesanan.filter((p) => p.needsReview).length;
  const omzet = tr.filter((t) => t.tipe === "PEMASUKAN").reduce((s, t) => s + t.jumlah, 0);

  const cards = [
    { label: "Omzet (pemasukan)", value: `Rp${fmt(omzet)}`, tone: "text-accent-ink" },
    { label: "Pesanan Baru", value: String(baru), tone: "text-ink" },
    { label: "Alert Stok", value: String(low), tone: low > 0 ? "text-warn-ink" : "text-ink" },
    { label: "Draft Review", value: String(draft), tone: draft > 0 ? "text-warn-ink" : "text-ink" },
  ];

  return (
    <div className="space-y-4u">
      <h1 className="text-2xl font-semibold text-ink">Ringkasan</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4u">
        {cards.map((c) => (
          <SummaryCard key={c.label} label={c.label} value={c.value} tone={c.tone} />
        ))}
      </div>
    </div>
  );
}
