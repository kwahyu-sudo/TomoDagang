import { prisma } from "@/lib/prisma";

export default async function StokPage() {
  const produk = await prisma.produk.findMany();
  return (
    <div>
      <h1>Stok Produk</h1>
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
          {produk.map((p) => (
            <tr key={p.id}>
              <td>{p.nama}</td>
              <td>{p.stok}</td>
              <td>{p.minStok}</td>
              <td>{p.stok < p.minStok ? <span className="text-red-600">Menipis!</span> : "OK"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
