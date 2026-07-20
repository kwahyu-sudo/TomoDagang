import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/pembelian/route";
import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";

// Mock config
vi.mock("@/lib/config", () => {
  return {
    config: {
      supplierEnabled: false,
    },
  };
});

// Mock prisma
vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      pembelianBahan: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      bahanBaku: {
        update: vi.fn(),
      },
      stokLog: {
        create: vi.fn(),
      },
      transaksi: {
        create: vi.fn(),
      },
      $transaction: vi.fn((cb) => {
        const tx = {
          pembelianBahan: {
            create: vi.fn().mockResolvedValue({ id: "pembelian1" }),
          },
          bahanBaku: {
            update: vi.fn(),
          },
          stokLog: {
            create: vi.fn(),
          },
          transaksi: {
            create: vi.fn(),
          },
        };
        return cb(tx);
      }),
    },
  };
});

// Mock next-auth requireAuth to bypass auth check
vi.mock("@/lib/api-helpers", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api-helpers")>();
  return {
    ...original,
    requireAuth: vi.fn().mockResolvedValue(null),
  };
});

describe("API /api/pembelian", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    config.supplierEnabled = false; // default
  });

  describe("GET", () => {
    it("should return a list of purchases with bahanBaku relation", async () => {
      const mockPurchases = [
        { id: "pembelian1", total: 50000, bahanBaku: { nama: "Gula" } },
      ];
      vi.mocked(prisma.pembelianBahan.findMany).mockResolvedValue(mockPurchases as any);

      const response = await GET(new Request("http://localhost/api/pembelian"));
      const json = await response.json();

      expect(prisma.pembelianBahan.findMany).toHaveBeenCalledWith({
        include: { bahanBaku: true },
        orderBy: { tanggal: "desc" },
      });
      expect(json).toEqual(mockPurchases);
    });
  });

  describe("POST", () => {
    it("should reject SUPPLIER source if supplier feature is disabled", async () => {
      config.supplierEnabled = false;

      const mockRequest = new Request("http://localhost/api/pembelian", {
        method: "POST",
        body: JSON.stringify({
          bahanBakuId: "bahan1",
          qty: 5,
          hargaSatuan: 10000,
          sumber: "SUPPLIER",
          supplierId: "supplier1",
          catatan: "beli grosir",
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe("supplier disabled");
    });

    it("should accept BELANJA_SENDIRI and perform all database updates atomically", async () => {
      const mockRequest = new Request("http://localhost/api/pembelian", {
        method: "POST",
        body: JSON.stringify({
          bahanBakuId: "bahan1",
          qty: 5,
          hargaSatuan: 10000,
          sumber: "BELANJA_SENDIRI",
          catatan: "beli eceran",
        }),
      });

      let capturedTx: any;
      vi.mocked(prisma.$transaction as any).mockImplementation(async (cb: any) => {
        const tx = {
          pembelianBahan: {
            create: vi.fn().mockResolvedValue({ id: "pembelian1", total: 50000 }),
          },
          bahanBaku: {
            update: vi.fn(),
          },
          stokLog: {
            create: vi.fn(),
          },
          transaksi: {
            create: vi.fn(),
          },
        };
        capturedTx = tx;
        return cb(tx);
      });

      const response = await POST(mockRequest);
      const json = await response.json();

      expect(capturedTx.pembelianBahan.create).toHaveBeenCalledWith({
        data: {
          bahanBakuId: "bahan1",
          qty: 5,
          hargaSatuan: 10000,
          total: 50000,
          sumber: "BELANJA_SENDIRI",
          supplierId: null,
          catatan: "beli eceran",
        },
      });

      expect(capturedTx.bahanBaku.update).toHaveBeenCalledWith({
        where: { id: "bahan1" },
        data: { stok: { increment: 5 } },
      });

      expect(capturedTx.stokLog.create).toHaveBeenCalledWith({
        data: { tipe: "BAHAN", refId: "bahan1", delta: 5, keterangan: "pembelian" },
      });

      expect(capturedTx.transaksi.create).toHaveBeenCalledWith({
        data: { tipe: "PENGELUARAN", jumlah: 50000, kategori: "bahan", pembelianId: "pembelian1" },
      });

      expect(json).toEqual({ id: "pembelian1", total: 50000 });
    });
  });
});
