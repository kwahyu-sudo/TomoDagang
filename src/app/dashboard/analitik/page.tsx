import { prisma } from "@/lib/prisma";
import { movingAverage } from "@/lib/forecast";

const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(Math.round(n));

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
        <div className="card p-4u">
          <p className="text-sm text-ink-faint">Total Omzet (selesai)</p>
          <p className="text-2xl font-semibold text-ink mt-1">Rp{fmt(totalOmzet)}</p>
        </div>
        <div className="card p-4u border-accent/30">
          <p className="text-sm text-ink-faint">Perkiraan Omzet 7 Hari</p>
          <p className="text-2xl font-semibold text-accent-ink mt-1">Rp{fmt(forecast)}</p>
          <p className="text-xs text-ink-faint mt-2">
            Perkiraan statistik, bukan jaminan. Buta terhadap hari besar, promo, atau stok habis.
          </p>
        </div>
      </div>

      <section className="card p-4u">
        <h2 className="text-lg font-semibold text-ink mb-4u">Proyeksi per Hari (Moving Average)</h2>
        <table className="w-full">
          <thead className="bg-canvas">
            <tr>
              <th className="th">Hari ke-</th>
              <th className="th">Estimasi Omzet</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 7 }).map((_, i) => (
              <tr key={i}>
                <td className="td font-medium">+{i + 1}</td>
                <td className="td">Rp{fmt(forecast)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
