"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TambahProdukForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      nama: fd.get("nama") as string,
      harga: Number(fd.get("harga")),
      stok: Number(fd.get("stok")),
      satuan: fd.get("satuan") as string,
      minStok: Number(fd.get("minStok")),
    };
    const res = await fetch("/api/produk", {
      method: "POST" as const,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        Tambah Produk
      </button>
    );
  }

  return (
    <div className="card p-4u space-y-4u max-w-md">
      <h2 className="text-lg font-semibold text-ink">Tambah Produk</h2>
      <form onSubmit={submit} className="space-y-4u">
        <div>
          <label className="label" htmlFor="nama">Nama Produk</label>
          <input id="nama" name="nama" className="input" required />
        </div>
        <div className="grid grid-cols-2 gap-4u">
          <div>
            <label className="label" htmlFor="harga">Harga</label>
            <input id="harga" name="harga" type="number" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="satuan">Satuan</label>
            <input id="satuan" name="satuan" className="input" placeholder="pcs" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4u">
          <div>
            <label className="label" htmlFor="stok">Stok Awal</label>
            <input id="stok" name="stok" type="number" className="input" defaultValue={0} required />
          </div>
          <div>
            <label className="label" htmlFor="minStok">Min Stok</label>
            <input id="minStok" name="minStok" type="number" className="input" defaultValue={0} required />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
          <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Batal</button>
        </div>
      </form>
    </div>
  );
}
