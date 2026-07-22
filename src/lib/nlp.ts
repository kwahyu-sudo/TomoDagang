export type Parsed = {
  intent: "NEW_ORDER" | "OTHER";
  items: { nama: string; qty: number }[];
  unmatched: string[];
};

const KEYWORDS = ["pesan", "order", "beli"];

// Kata angka dasar (印尼语) — ekstensi mudah kalau perlu.
const WORD_NUMBERS: Record<string, number> = {
  satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5,
  enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10,
};

/** Parse string angka: "1.000", "1000", "1,5" -> number. Return null kalau bukan angka. */
function parseQty(raw: string): number | null {
  const t = raw.trim().toLowerCase();
  if (WORD_NUMBERS[t] !== undefined) return WORD_NUMBERS[t];
  // Terima titik sebagai pemisah ribuan: "1.000" -> 1000
  const cleaned = t.replace(/\./g, "");
  if (/^\d+$/.test(cleaned)) return parseInt(cleaned, 10);
  return null;
}

export function parseMessage(text: string, products: { nama: string }[]): Parsed {
  const lower = text.toLowerCase();
  const hasKeyword = KEYWORDS.some((k) => new RegExp(`\\b${k}\\b`, "i").test(lower));

  const items: { nama: string; qty: number }[] = [];
  const unmatched: string[] = [];

  // Escape nama produk untuk regex aman.
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  for (const p of products) {
    // Word boundary di sekitar nama produk agar "pesona"/"border" tidak ke-trigger.
    const re = new RegExp(`\\b(?:${escape(p.nama)})\\b[^\\d]*?(\\d+(?:\\.\\d{3})*(?:\\.\\d+)?|${Object.keys(WORD_NUMBERS).join("|")})`, "i");
    const m = text.match(re);
    if (m) {
      const qty = parseQty(m[1]);
      if (qty && qty > 0) items.push({ nama: p.nama, qty });
    }
  }

  const knownNames = products.map((p) => p.nama.toLowerCase());
  const tokens = lower.split(/[^a-z0-9.\s]/i);
  for (const t of tokens) {
    const tm = t.match(new RegExp(`([a-z\\s]+?)\\s*(\\d+(?:\\.\\d{3})*(?:\\.\\d+)?|${Object.keys(WORD_NUMBERS).join("|")})`, "i"));
    if (tm && /\d/.test(t)) {
      const name = tm[1].trim().toLowerCase();
      if (name && !knownNames.includes(name) && !KEYWORDS.includes(name)) {
        unmatched.push(name);
      }
    }
  }

  const intent: Parsed["intent"] =
    items.length > 0 || (hasKeyword && unmatched.length > 0) ? "NEW_ORDER" : "OTHER";

  return { intent, items, unmatched };
}
