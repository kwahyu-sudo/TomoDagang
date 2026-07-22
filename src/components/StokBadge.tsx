type Props = { stok: number; minStok: number };

export default function StokBadge({ stok, minStok }: Props) {
  return stok < minStok ? (
    <span className="badge-warn">Menipis</span>
  ) : (
    <span className="badge-ok">Stok aman</span>
  );
}
