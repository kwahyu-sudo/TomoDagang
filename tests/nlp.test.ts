import { describe, it, expect } from "vitest";
import { parseMessage } from "@/lib/nlp";

const products = [{ nama: "kue lapis" }, { nama: "es teh" }];

describe("nlp", () => {
  it("keyword trigger PESAN dikenali NEW_ORDER", () => {
    const r = parseMessage("PESAN kue lapis 2, es teh 3", products);
    expect(r.intent).toBe("NEW_ORDER");
    expect(r.items).toEqual([{ nama: "kue lapis", qty: 2 }, { nama: "es teh", qty: 3 }]);
  });
  it("natural tanpa keyword tapi ada produk+qty = NEW_ORDER", () => {
    const r = parseMessage("mau beli kue lapis 1 ya", products);
    expect(r.intent).toBe("NEW_ORDER");
    expect(r.items[0]).toEqual({ nama: "kue lapis", qty: 1 });
  });
  it("produk tidak dikenali masuk unmatched", () => {
    const r = parseMessage("PESAN kue lapis 2, donat 5", products);
    expect(r.items).toEqual([{ nama: "kue lapis", qty: 2 }]);
    expect(r.unmatched).toContain("donat");
  });
  it("sapaan saja = OTHER", () => {
    const r = parseMessage("halo kak", products);
    expect(r.intent).toBe("OTHER");
  });
  it("L1: substring produk tidak memicu false-positive (pesona/border)", () => {
    const r = parseMessage("pesona saya cantik border 5", products);
    expect(r.items).toEqual([]);
    expect(r.intent).toBe("OTHER");
  });
  it("L2: parse ribuan dengan titik (1.000) dan kata angka (dua)", () => {
    const r = parseMessage("PESAN kue lapis 1.000, es teh dua", products);
    expect(r.items).toEqual([{ nama: "kue lapis", qty: 1000 }, { nama: "es teh", qty: 2 }]);
  });
  it("L2: gagal parse pesanan kosong (items=[]) = OTHER", () => {
    const r = parseMessage("PESAN dong", products);
    expect(r.items).toEqual([]);
    expect(r.intent).toBe("OTHER");
  });
});
