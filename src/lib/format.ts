const _fmt = new Intl.NumberFormat("id-ID");

export function fmt(n: number): string {
  return _fmt.format(n);
}
