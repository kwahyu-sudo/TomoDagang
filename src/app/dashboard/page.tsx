import { prisma } from "@/lib/prisma";

const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);

export default async function DashboardHome() {
  const [produk, pesanan, tr] = await Promise.all([
    prisma.produk.findMany({ where: { deletedAt: null } }),
    prisma.pesanan.findMany(),
    prisma.transaksi.findMany(),
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
          <div key={c.label} className="card p-4u">
            <p className="text-sm text-ink-faint">{c.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${c.tone}`}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
