import { prisma } from "@/lib/prisma";

const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);

export default async function KeuanganPage() {
  const tr = await prisma.transaksi.findMany({ orderBy: { tanggal: "desc" } });
  const masuk = tr.filter((t) => t.tipe === "PEMASUKAN").reduce((s, t) => s + t.jumlah, 0);
  const keluar = tr.filter((t) => t.tipe === "PENGELUARAN").reduce((s, t) => s + t.jumlah, 0);
  const laba = masuk - keluar;

  return (
    <div className="space-y-4u">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Keuangan</h1>
        <p className="text-sm text-ink-faint">Ringkasan kas UMKM</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4u">
        <div className="card p-4u">
          <p className="text-sm text-ink-faint">Pemasukan</p>
          <p className="text-2xl font-semibold text-accent-ink mt-1">Rp{fmt(masuk)}</p>
        </div>
        <div className="card p-4u">
          <p className="text-sm text-ink-faint">Pengeluaran</p>
          <p className="text-2xl font-semibold text-danger-ink mt-1">Rp{fmt(keluar)}</p>
        </div>
        <div className="card p-4u">
          <p className="text-sm text-ink-faint">Laba</p>
          <p className="text-2xl font-semibold text-ink mt-1">Rp{fmt(laba)}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-canvas">
            <tr>
              <th className="th">Tanggal</th>
              <th className="th">Tipe</th>
              <th className="th">Jumlah</th>
              <th className="th">Kategori</th>
            </tr>
          </thead>
          <tbody>
            {tr.map((t) => (
              <tr key={t.id}>
                <td className="td text-ink-faint">{t.tanggal.toLocaleDateString("id-ID")}</td>
                <td className="td">
                  {t.tipe === "PEMASUKAN" ? (
                    <span className="badge-ok">Masuk</span>
                  ) : (
                    <span className="badge-danger">Keluar</span>
                  )}
                </td>
                <td className="td font-medium">Rp{fmt(t.jumlah)}</td>
                <td className="td text-ink-faint">{t.kategori}</td>
              </tr>
            ))}
            {tr.length === 0 && (
              <tr>
                <td className="td text-ink-faint" colSpan={4}>Belum ada transaksi.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
