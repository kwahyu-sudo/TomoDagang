import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";
import CatatPembelianForm from "@/components/CatatPembelianForm";
import StokBadge from "@/components/StokBadge";
import Table from "@/components/Table";

export default async function BahanPage() {
  const bahan = await prisma.bahanBaku.findMany({ where: { deletedAt: null }, orderBy: { nama: "asc" } });

  return (
    <div className="space-y-4u">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Bahan Baku</h1>
        <p className="text-sm text-ink-faint">{bahan.length} bahan</p>
      </header>

      <Table
        columns={[
          { key: "nama", label: "Nama" },
          { key: "stok", label: "Stok" },
          { key: "min", label: "Min" },
          { key: "status", label: "Status" },
        ]}
        data={bahan}
        renderRow={(b) => (
          <>
            <td className="td font-medium">{b.nama}</td>
            <td className="td">{b.stok} {b.satuan}</td>
            <td className="td text-ink-faint">{b.minStok}</td>
            <td className="td"><StokBadge stok={b.stok} minStok={b.minStok} /></td>
          </>
        )}
        emptyText="Belum ada bahan baku."
      />

      <CatatPembelianForm
        bahanList={bahan.map((b) => ({ id: b.id, nama: b.nama }))}
        supplierEnabled={config.supplierEnabled}
      />
    </div>
  );
}
