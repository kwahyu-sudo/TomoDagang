import { prisma } from "@/lib/prisma";
import { fmt } from "@/lib/format";
import Table from "@/components/Table";

export default async function PesananPage() {
  const pesanan = await prisma.pesanan.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  const draft = pesanan.filter((p) => p.needsReview).length;

  return (
    <div className="space-y-4u">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Pesanan</h1>
          <p className="text-sm text-ink-faint">{pesanan.length} total</p>
        </div>
        {draft > 0 && <span className="badge-warn">{draft} draft perlu review</span>}
      </header>

      <Table
        columns={[
          { key: "pelanggan", label: "Pelanggan" },
          { key: "total", label: "Total" },
          { key: "status", label: "Status" },
          { key: "sumber", label: "Sumber" },
          { key: "bayar", label: "Bayar" },
        ]}
        data={pesanan}
        renderRow={(p) => (
          <>
            <td className="td font-medium">
              {p.pelanggan}
              {p.needsReview && <span className="badge-warn ml-2">review</span>}
            </td>
            <td className="td">Rp{fmt(p.total || p.items.reduce((s, it) => s + it.qty * it.harga, 0))}</td>
            <td className="td"><span className="badge-ok">{p.status}</span></td>
            <td className="td text-ink-faint">{p.sumber}</td>
            <td className="td">
              {p.paid ? (
                <span className="badge-ok">Lunas</span>
              ) : (
                <span className="badge-warn">Belum</span>
              )}
            </td>
          </>
        )}
        emptyText="Belum ada pesanan."
      />
    </div>
  );
}
