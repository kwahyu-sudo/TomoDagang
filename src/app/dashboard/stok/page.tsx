import { prisma } from "@/lib/prisma";
import TambahProdukForm from "@/components/TambahProdukForm";
import StokBadge from "@/components/StokBadge";
import Table from "@/components/Table";

export default async function StokPage() {
  const produk = await prisma.produk.findMany({ where: { deletedAt: null }, orderBy: { nama: "asc" } });
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

      <Table
        columns={[
          { key: "nama", label: "Nama" },
          { key: "stok", label: "Stok" },
          { key: "min", label: "Min" },
          { key: "status", label: "Status" },
        ]}
        data={produk}
        renderRow={(p) => (
          <>
            <td className="td font-medium">{p.nama}</td>
            <td className="td">{p.stok} {p.satuan}</td>
            <td className="td text-ink-faint">{p.minStok}</td>
            <td className="td"><StokBadge stok={p.stok} minStok={p.minStok} /></td>
          </>
        )}
        emptyText="Belum ada produk. Tambah lewat tombol di atas."
      />
    </div>
  );
}
