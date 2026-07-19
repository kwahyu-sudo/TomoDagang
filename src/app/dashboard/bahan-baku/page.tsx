import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";

export default async function BahanPage() {
  const bahan = await prisma.bahanBaku.findMany({ orderBy: { nama: "asc" } });

  return (
    <div className="space-y-4u">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Bahan Baku</h1>
        <p className="text-sm text-ink-faint">{bahan.length} bahan</p>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-canvas">
            <tr>
              <th className="th">Nama</th>
              <th className="th">Stok</th>
              <th className="th">Min</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody>
            {bahan.map((b) => (
              <tr key={b.id}>
                <td className="td font-medium">{b.nama}</td>
                <td className="td">{b.stok} {b.satuan}</td>
                <td className="td text-ink-faint">{b.minStok}</td>
                <td className="td">
                  {b.stok < b.minStok ? (
                    <span className="badge-warn">Menipis</span>
                  ) : (
                    <span className="badge-ok">Stok aman</span>
                  )}
                </td>
              </tr>
            ))}
            {bahan.length === 0 && (
              <tr>
                <td className="td text-ink-faint" colSpan={4}>Belum ada bahan baku.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <section className="card p-4u space-y-4u max-w-lg">
        <h2 className="text-lg font-semibold text-ink">Catat Pembelian</h2>
        <form action="/api/pembelian" method="post" className="space-y-4u">
          <div>
            <label className="label" htmlFor="bahanBakuId">ID Bahan</label>
            <input id="bahanBakuId" name="bahanBakuId" className="input" required />
          </div>
          <div className="grid grid-cols-2 gap-4u">
            <div>
              <label className="label" htmlFor="qty">Qty</label>
              <input id="qty" name="qty" type="number" className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="hargaSatuan">Harga Satuan</label>
              <input id="hargaSatuan" name="hargaSatuan" type="number" className="input" required />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="catatan">Catatan</label>
            <input id="catatan" name="catatan" className="input" placeholder="mis. pasar X" required />
          </div>
          {config.supplierEnabled && (
            <div>
              <label className="label" htmlFor="supplierId">Supplier (opsional)</label>
              <input id="supplierId" name="supplierId" className="input" />
            </div>
          )}
          <button type="submit" className="btn-primary">Simpan Pembelian</button>
        </form>
      </section>
    </div>
  );
}
