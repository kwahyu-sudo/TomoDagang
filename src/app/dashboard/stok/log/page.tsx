import { prisma } from "@/lib/prisma";
import Table from "@/components/Table";

export default async function RiwayatStokPage() {
  const logs = await prisma.stokLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4u">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Riwayat Stok</h1>
        <p className="text-sm text-ink-faint">Audit masuk &amp; keluar (100 terbaru)</p>
      </header>

      <Table
        columns={[
          { key: "waktu", label: "Waktu" },
          { key: "tipe", label: "Tipe" },
          { key: "ref", label: "Ref" },
          { key: "delta", label: "Delta" },
          { key: "ket", label: "Keterangan" },
        ]}
        data={logs}
        renderRow={(l) => (
          <>
            <td className="td text-ink-faint">{l.createdAt.toLocaleString("id-ID")}</td>
            <td className="td">{l.tipe}</td>
            <td className="td text-ink-faint font-mono text-sm">{l.refId.slice(0, 8)}</td>
            <td className="td">
              <span className={l.delta >= 0 ? "text-accent-ink" : "text-danger-ink"}>
                {l.delta >= 0 ? "+" : ""}{l.delta}
              </span>
            </td>
            <td className="td text-ink-faint">{l.keterangan}</td>
          </>
        )}
        emptyText="Belum ada aktivitas stok."
      />
    </div>
  );
}
