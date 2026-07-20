"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CatatPembelianForm({
  bahanList,
  supplierEnabled,
}: {
  bahanList: { id: string; nama: string }[];
  supplierEnabled: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      bahanBakuId: fd.get("bahanBakuId") as string,
      qty: Number(fd.get("qty")),
      hargaSatuan: Number(fd.get("hargaSatuan")),
      catatan: fd.get("catatan") as string,
    };
    const supplierId = fd.get("supplierId") as string;
    if (supplierId) {
      body.sumber = "SUPPLIER";
      body.supplierId = supplierId;
    }
    const res = await fetch("/api/pembelian", {
      method: "POST" as const,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (res.ok) {
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } else {
      const data = await res.text();
      setError(data || "Gagal menyimpan pembelian.");
    }
  }

  return (
    <section className="card p-4u space-y-4u max-w-lg">
      <h2 className="text-lg font-semibold text-ink">Catat Pembelian</h2>
      <form onSubmit={submit} className="space-y-4u">
        <div>
          <label className="label" htmlFor="bahanBakuId">Bahan</label>
          <select id="bahanBakuId" name="bahanBakuId" className="input" required>
            <option value="">Pilih bahan...</option>
            {bahanList.map((b) => (
              <option key={b.id} value={b.id}>{b.nama}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4u">
          <div>
            <label className="label" htmlFor="qty">Qty</label>
            <input id="qty" name="qty" type="number" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="hargaSatuan">Harga Satuan</label>
            <input id="hargaSatuan" name="hargaSatuan" type="number" className="input" required />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="catatan">Catatan</label>
          <input id="catatan" name="catatan" className="input" placeholder="mis. pasar X" required />
        </div>
        {supplierEnabled && (
          <div>
            <label className="label" htmlFor="supplierId">Supplier (opsional)</label>
            <input id="supplierId" name="supplierId" className="input" />
          </div>
        )}
        {error && <p className="text-danger-ink text-sm">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Menyimpan..." : "Simpan Pembelian"}
        </button>
      </form>
    </section>
  );
}
