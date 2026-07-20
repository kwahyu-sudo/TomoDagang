import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, PATCH } from "@/app/api/pesanan/route";
import { prisma } from "@/lib/prisma";

// Mock prisma
vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      pesanan: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      produk: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      stokLog: {
        create: vi.fn(),
      },
      transaksi: {
        upsert: vi.fn(),
      },
      $transaction: vi.fn((cb) => {
        // Simple transaction wrapper that passes a mocked tx client
        const tx = {
          produk: {
            findUnique: vi.fn(),
            update: vi.fn(),
          },
          stokLog: {
            create: vi.fn(),
          },
          pesanan: {
            update: vi.fn(),
          },
          transaksi: {
            upsert: vi.fn(),
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

describe("API /api/pesanan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST", () => {
    it("should calculate total based on items and create a pesanan", async () => {
      const mockItems = [
        { produkId: "prod1", qty: 2, harga: 15000 },
        { produkId: "prod2", qty: 1, harga: 10000 },
      ];
      
      const mockRequest = new Request("http://localhost/api/pesanan", {
        method: "POST",
        body: JSON.stringify({
          pelanggan: "Budi",
          nomorWa: "62812345678",
          sumber: "MANUAL",
          paid: false,
          needsReview: false,
          items: mockItems,
        }),
      });

      const mockCreatedPesanan = {
        id: "pesanan1",
        pelanggan: "Budi",
        total: 40000,
        status: "BARU",
      };

      vi.mocked(prisma.pesanan.create).mockResolvedValue(mockCreatedPesanan as any);

      const response = await POST(mockRequest);
      const json = await response.json();

      expect(prisma.pesanan.create).toHaveBeenCalledWith({
        data: {
          pelanggan: "Budi",
          nomorWa: "62812345678",
          sumber: "MANUAL",
          paid: false,
          needsReview: false,
          total: 40000,
          items: { create: mockItems },
        },
      });
      expect(json).toEqual(mockCreatedPesanan);
    });
  });

  describe("PATCH", () => {
    it("should complete pesanan, decrement stock, log stock and record transaction when status is SELESAI and paid is true", async () => {
      const mockPesanan = {
        id: "pesanan1",
        pelanggan: "Budi",
        paid: true,
        items: [
          { produkId: "prod1", qty: 2, harga: 15000 },
        ],
      };

      vi.mocked(prisma.pesanan.findUnique).mockResolvedValue(mockPesanan as any);

      const mockRequest = new Request("http://localhost/api/pesanan", {
        method: "PATCH",
        body: JSON.stringify({
          id: "pesanan1",
          status: "SELESAI",
          paid: true,
        }),
      });

      // Setup transactional mock behaviors
      let capturedTx: any;
      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        const tx = {
          produk: {
            findUnique: vi.fn().mockResolvedValue({ id: "prod1", stok: 10 }),
            update: vi.fn(),
          },
          stokLog: {
            create: vi.fn(),
          },
          pesanan: {
            update: vi.fn(),
          },
          transaksi: {
            upsert: vi.fn(),
          },
        };
        capturedTx = tx;
        return cb(tx);
      });

      const response = await PATCH(mockRequest);
      const json = await response.json();

      expect(prisma.pesanan.findUnique).toHaveBeenCalledWith({
        where: { id: "pesanan1" },
        include: { items: true },
      });

      expect(capturedTx.produk.findUnique).toHaveBeenCalledWith({ where: { id: "prod1" } });
      expect(capturedTx.produk.update).toHaveBeenCalledWith({
        where: { id: "prod1" },
        data: { stok: { decrement: 2 } },
      });
      expect(capturedTx.stokLog.create).toHaveBeenCalledWith({
        data: { tipe: "PRODUK", refId: "prod1", delta: -2, keterangan: "pesanan" },
      });
      expect(capturedTx.pesanan.update).toHaveBeenCalledWith({
        where: { id: "pesanan1" },
        data: { status: "SELESAI", paid: true },
      });
      expect(capturedTx.transaksi.upsert).toHaveBeenCalledWith({
        where: { pesananId: "pesanan1" },
        update: {},
        create: { tipe: "PEMASUKAN", jumlah: 30000, kategori: "penjualan", pesananId: "pesanan1" },
      });
      expect(json).toEqual({ ok: true });
    });

    it("should throw error if stock is insufficient", async () => {
      const mockPesanan = {
        id: "pesanan1",
        pelanggan: "Budi",
        paid: true,
        items: [
          { produkId: "prod1", qty: 5, harga: 15000 },
        ],
      };

      vi.mocked(prisma.pesanan.findUnique).mockResolvedValue(mockPesanan as any);

      const mockRequest = new Request("http://localhost/api/pesanan", {
        method: "PATCH",
        body: JSON.stringify({
          id: "pesanan1",
          status: "SELESAI",
        }),
      });

      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        const tx = {
          produk: {
            findUnique: vi.fn().mockResolvedValue({ id: "prod1", stok: 3 }), // Only 3 in stock, but request needs 5
            update: vi.fn(),
          },
          stokLog: {
            create: vi.fn(),
          },
          pesanan: {
            update: vi.fn(),
          },
          transaksi: {
            upsert: vi.fn(),
          },
        };
        return cb(tx);
      });

      const response = await PATCH(mockRequest);
      const json = await response.json();
      expect(response.status).toBe(500);
      expect(json.error).toBe("stok kurang");
    });
  });
});
