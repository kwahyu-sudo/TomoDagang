import { prisma } from "@/lib/prisma";

export default async function RiwayatStokPage() {
  const logs = await prisma.stokLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4u">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Riwayat Stok</h1>
        <p className="text-sm text-ink-faint">Audit masuk &amp; keluar (100 terbaru)</p>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-canvas">
            <tr>
              <th className="th">Waktu</th>
              <th className="th">Tipe</th>
              <th className="th">Ref</th>
              <th className="th">Delta</th>
              <th className="th">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="td text-ink-faint">{l.createdAt.toLocaleString("id-ID")}</td>
                <td className="td">{l.tipe}</td>
                <td className="td text-ink-faint font-mono text-sm">{l.refId.slice(0, 8)}</td>
                <td className="td">
                  <span className={l.delta >= 0 ? "text-accent-ink" : "text-danger-ink"}>
                    {l.delta >= 0 ? "+" : ""}{l.delta}
                  </span>
                </td>
                <td className="td text-ink-faint">{l.keterangan}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td className="td text-ink-faint" colSpan={5}>Belum ada aktivitas stok.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
