export type Parsed = {
  intent: "NEW_ORDER" | "OTHER";
  items: { nama: string; qty: number }[];
  unmatched: string[];
};

const KEYWORDS = ["pesan", "order", "beli"];

export function parseMessage(text: string, products: { nama: string }[]): Parsed {
  const lower = text.toLowerCase();
  const hasKeyword = KEYWORDS.some((k) => lower.includes(k));

  const items: { nama: string; qty: number }[] = [];
  const unmatched: string[] = [];

  for (const p of products) {
    const re = new RegExp(`(?:${p.nama})\\s*(\\d+)`, "i");
    const m = text.match(re);
    if (m) items.push({ nama: p.nama, qty: parseInt(m[1], 10) });
  }

  const knownNames = products.map((p) => p.nama.toLowerCase());
  const tokens = lower.split(/[^a-z0-9\s]/i);
  for (const t of tokens) {
    const tm = t.match(/([a-z\s]+)\s*(\d+)/i);
    if (tm && /\d/.test(t)) {
      const name = tm[1].trim();
      if (name && !knownNames.includes(name) && !KEYWORDS.includes(name)) {
        unmatched.push(name);
      }
    }
  }

  const intent: Parsed["intent"] =
    items.length > 0 || (hasKeyword && unmatched.length > 0) ? "NEW_ORDER" : "OTHER";

  return { intent, items, unmatched };
}
