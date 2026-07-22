-- Migration: add CHECK constraint stok >= 0 for Produk and BahanBaku
-- Run this manually when DB is accessible: npx prisma db execute --file prisma/migrations/add_check_constraint_stok.sql

ALTER TABLE "Produk" ADD CONSTRAINT "stok_non_neg" CHECK (stok >= 0);
ALTER TABLE "BahanBaku" ADD CONSTRAINT "stok_non_neg" CHECK (stok >= 0);
