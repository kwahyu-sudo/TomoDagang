import { prisma } from "@/lib/prisma";

export default async function KeuanganPage() {
  const tr = await prisma.transaksi.findMany();
  const masuk = tr.filter((t) => t.tipe === "PEMASUKAN").reduce((s, t) => s + t.jumlah, 0);
  const keluar = tr.filter((t) => t.tipe === "PENGELUARAN").reduce((s, t) => s + t.jumlah, 0);
  return (
    <div>
      <h1>Keuangan</h1>
      <p>Pemasukan: Rp{masuk}</p>
      <p>Pengeluaran: Rp{keluar}</p>
      <p>Laba: Rp{masuk - keluar}</p>
      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Tipe</th>
            <th>Jumlah</th>
            <th>Kategori</th>
          </tr>
        </thead>
        <tbody>
          {tr.map((t) => (
            <tr key={t.id}>
              <td>{t.tanggal.toISOString()}</td>
              <td>{t.tipe}</td>
              <td>{t.jumlah}</td>
              <td>{t.kategori}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
