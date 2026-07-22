import { prisma } from "@/lib/prisma";
import { fmt } from "@/lib/format";
import SummaryCard from "@/components/SummaryCard";
import Table from "@/components/Table";

export default async function KeuanganPage() {
  const tr = await prisma.transaksi.findMany({ orderBy: { tanggal: "desc" }, take: 50 });
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
        <SummaryCard label="Pemasukan" value={`Rp${fmt(masuk)}`} tone="text-accent-ink" />
        <SummaryCard label="Pengeluaran" value={`Rp${fmt(keluar)}`} tone="text-danger-ink" />
        <SummaryCard label="Laba" value={`Rp${fmt(laba)}`} />
      </div>

      <Table
        columns={[
          { key: "tanggal", label: "Tanggal" },
          { key: "tipe", label: "Tipe" },
          { key: "jumlah", label: "Jumlah" },
          { key: "kategori", label: "Kategori" },
        ]}
        data={tr}
        renderRow={(t) => (
          <>
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
          </>
        )}
        emptyText="Belum ada transaksi."
      />
    </div>
  );
}
