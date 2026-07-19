import { prisma } from "@/lib/prisma";

export default async function PesananPage() {
  const pesanan = await prisma.pesanan.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  const draft = pesanan.filter((p) => p.needsReview).length;

  return (
    <div className="space-y-4u">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Pesanan</h1>
          <p className="text-sm text-ink-faint">{pesanan.length} total</p>
        </div>
        {draft > 0 && <span className="badge-warn">{draft} draft perlu review</span>}
      </header>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-canvas">
            <tr>
              <th className="th">Pelanggan</th>
              <th className="th">Total</th>
              <th className="th">Status</th>
              <th className="th">Sumber</th>
              <th className="th">Bayar</th>
            </tr>
          </thead>
          <tbody>
            {pesanan.map((p) => (
              <tr key={p.id}>
                <td className="td font-medium">
                  {p.pelanggan}
                  {p.needsReview && <span className="badge-warn ml-2">review</span>}
                </td>
                <td className="td">Rp{new Intl.NumberFormat("id-ID").format(p.total)}</td>
                <td className="td">
                  <span className="badge-ok">{p.status}</span>
                </td>
                <td className="td text-ink-faint">{p.sumber}</td>
                <td className="td">
                  {p.paid ? (
                    <span className="badge-ok">Lunas</span>
                  ) : (
                    <span className="badge-warn">Belum</span>
                  )}
                </td>
              </tr>
            ))}
            {pesanan.length === 0 && (
              <tr>
                <td className="td text-ink-faint" colSpan={5}>Belum ada pesanan.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
