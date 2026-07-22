import { z, ZodSchema } from "zod";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export const positiveInt = z.number().int().positive();
export const nonNegativeInt = z.number().int().nonnegative();
export const namaProduk = z.string().min(1).max(200);
export const nomorWa = z.string().regex(/^\d{6,15}$/).optional();
export const catatanField = z.string().max(1000).default("");

export const produkSchema = z.object({
  nama: namaProduk,
  harga: positiveInt,
  satuan: z.string().min(1).max(50),
  minStok: nonNegativeInt.default(0),
});

export const bahanSchema = z.object({
  nama: namaProduk,
  satuan: z.string().min(1).max(50),
  minStok: nonNegativeInt.default(0),
});

export const pesananItemSchema = z.object({
  produkId: z.string().min(1),
  qty: positiveInt,
  harga: nonNegativeInt,
});

export const pesananSchema = z.object({
  pelanggan: z.string().min(1).max(200),
  nomorWa: nomorWa,
  sumber: z.enum(["MANUAL", "WHATSAPP"]).optional(),
  paid: z.boolean().optional(),
  needsReview: z.boolean().optional(),
  items: z.array(pesananItemSchema).min(1, "Pesanan harus punya minimal 1 item."),
});

export const pembelianSchema = z.object({
  bahanBakuId: z.string().min(1),
  qty: positiveInt,
  hargaSatuan: nonNegativeInt,
  sumber: z.enum(["BELANJA_SENDIRI", "SUPPLIER"]).optional(),
  supplierId: z.string().optional(),
  catatan: catatanField,
});

// Legacy wrapper — maps old-style Rules to Zod
type Rules = Record<string, "string" | "number" | "boolean" | "optional_string" | "optional_number">;

export function validate<T extends Record<string, unknown>>(
  data: unknown,
  rules: Rules
): T {
  const schema = z.object(
    Object.fromEntries(
      Object.entries(rules).map(([key, rule]) => {
        if (rule === "string") return [key, z.string()];
        if (rule === "number") return [key, z.number()];
        if (rule === "boolean") return [key, z.boolean()];
        if (rule === "optional_string") return [key, z.string().optional()];
        if (rule === "optional_number") return [key, z.number().optional()];
        return [key, z.unknown()];
      })
    )
  );
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error?.issues?.[0];
    const msg = issue?.message ?? "Validasi gagal.";
    throw new ValidationError(msg);
  }
  return result.data as T;
}

/** Validates a non-negative integer (>= 0). Throws ValidationError otherwise. */
export function validateNonNegativeInt(value: unknown, fieldName: string): number {
  const r = nonNegativeInt.safeParse(value);
  if (!r.success) throw new ValidationError(`${fieldName} harus bilangan bulat >= 0.`);
  return r.data;
}

/** Validates a positive integer (> 0). Throws ValidationError otherwise. */
export function validatePositiveInt(value: unknown, fieldName: string): number {
  const r = positiveInt.safeParse(value);
  if (!r.success) throw new ValidationError(`${fieldName} harus bilangan bulat > 0.`);
  return r.data;
}
