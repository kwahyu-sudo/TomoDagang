import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";
import CatatPembelianForm from "@/components/CatatPembelianForm";

export default async function BahanPage() {
  const bahan = await prisma.bahanBaku.findMany({ where: { deletedAt: null }, orderBy: { nama: "asc" } });

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

      <CatatPembelianForm
        bahanList={bahan.map((b) => ({ id: b.id, nama: b.nama }))}
        supplierEnabled={config.supplierEnabled}
      />
    </div>
  );
}
