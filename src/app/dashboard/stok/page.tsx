import { prisma } from "@/lib/prisma";
import TambahProdukForm from "@/components/TambahProdukForm";

export default async function StokPage() {
  const produk = await prisma.produk.findMany({ orderBy: { nama: "asc" } });
  const low = produk.filter((p) => p.stok < p.minStok).length;

  return (
    <div className="space-y-4u">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Stok Produk</h1>
          <p className="text-sm text-ink-faint">
            {produk.length} produk{low > 0 && ` · ${low} perlu restock`}
          </p>
        </div>
        <TambahProdukForm />
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
            {produk.map((p) => (
              <tr key={p.id}>
                <td className="td font-medium">{p.nama}</td>
                <td className="td">{p.stok} {p.satuan}</td>
                <td className="td text-ink-faint">{p.minStok}</td>
                <td className="td">
                  {p.stok < p.minStok ? (
                    <span className="badge-warn">Menipis</span>
                  ) : (
                    <span className="badge-ok">Stok aman</span>
                  )}
                </td>
              </tr>
            ))}
            {produk.length === 0 && (
              <tr>
                <td className="td text-ink-faint" colSpan={4}>
                  Belum ada produk. Tambah lewat tombol di atas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
