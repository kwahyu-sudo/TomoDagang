import { prisma } from "@/lib/prisma";
import { fmt } from "@/lib/format";
import { movingAverage } from "@/lib/forecast";
import SummaryCard from "@/components/SummaryCard";
import Table from "@/components/Table";

export default async function AnalitikPage() {
  const pesanan = await prisma.pesanan.findMany({
    where: { status: "SELESAI" },
    include: { items: true },
  });

  const daily = new Map<string, number>();
  for (const p of pesanan) {
    const key = p.createdAt.toISOString().slice(0, 10);
    const omzet = p.items.reduce((s, it) => s + it.qty * it.harga, 0);
    daily.set(key, (daily.get(key) ?? 0) + omzet);
  }
  const history = Array.from(daily.values());

  const forecast = movingAverage(history, 7);
  const totalOmzet = history.reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-4u">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Analitik</h1>
        <p className="text-sm text-ink-faint">Tren & perkiraan pesanan</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4u">
        <SummaryCard label="Total Omzet (selesai)" value={`Rp${fmt(Math.round(totalOmzet))}`} />
        <SummaryCard
          label="Perkiraan Omzet 7 Hari"
          value={`Rp${fmt(Math.round(forecast))}`}
          tone="text-accent-ink"
          border="border-accent/30"
          footnote="Perkiraan statistik, bukan jaminan. Buta terhadap hari besar, promo, atau stok habis."
        />
      </div>

      <section className="card p-4u">
        <h2 className="text-lg font-semibold text-ink mb-4u">Proyeksi per Hari (Moving Average)</h2>
        <Table
          columns={[
            { key: "hari", label: "Hari ke-" },
            { key: "estimasi", label: "Estimasi Omzet" },
          ]}
          data={Array.from({ length: 7 }).map((_, i) => ({ day: i + 1 }))}
          renderRow={(d) => (
            <>
              <td className="td font-medium">+{d.day}</td>
              <td className="td">Rp{fmt(Math.round(forecast))}</td>
            </>
          )}
        />
      </section>
    </div>
  );
}
