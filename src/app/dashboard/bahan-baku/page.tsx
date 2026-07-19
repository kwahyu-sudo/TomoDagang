import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";

export default async function BahanPage() {
  const bahan = await prisma.bahanBaku.findMany();
  return (
    <div>
      <h1>Bahan Baku</h1>
      <table>
        <thead>
          <tr>
            <th>Nama</th>
            <th>Stok</th>
            <th>Min</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {bahan.map((b) => (
            <tr key={b.id}>
              <td>{b.nama}</td>
              <td>{b.stok}</td>
              <td>{b.minStok}</td>
              <td>{b.stok < b.minStok ? "Menipis!" : "OK"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Catat Pembelian</h2>
      <form action="/api/pembelian" method="post">
        <input name="bahanBakuId" placeholder="ID Bahan" />
        <input name="qty" placeholder="Qty" />
        <input name="hargaSatuan" placeholder="Harga Satuan" />
        <input name="catatan" placeholder="Catatan (wajib, mis. pasar X)" />
        {config.supplierEnabled && <input name="supplierId" placeholder="Supplier (opsional)" />}
        <button type="submit">Simpan</button>
      </form>
    </div>
  );
}
