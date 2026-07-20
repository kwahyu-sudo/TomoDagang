/** Lightweight validation — no external deps */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

type Rules = Record<string, "string" | "number" | "boolean" | "optional_string" | "optional_number">;

export function validate<T extends Record<string, unknown>>(
  data: unknown,
  rules: Rules
): T {
  if (!data || typeof data !== "object") {
    throw new ValidationError("Body harus berupa objek.");
  }
  const obj = data as Record<string, unknown>;
  for (const [key, rule] of Object.entries(rules)) {
    const val = obj[key];
    if (rule.startsWith("optional")) {
      if (val === undefined || val === null) continue;
      const baseType = rule.replace("optional_", "");
      if (typeof val !== baseType) {
        throw new ValidationError(`${key} harus bertipe ${baseType}.`);
      }
      continue;
    }
    if (val === undefined || val === null) {
      throw new ValidationError(`${key} wajib diisi.`);
    }
    if (typeof val !== rule) {
      throw new ValidationError(`${key} harus bertipe ${rule}.`);
    }
  }
  return obj as T;
}

export function validateEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string
): T {
  if (!allowed.includes(value as T)) {
    throw new ValidationError(`${fieldName} harus salah satu dari: ${allowed.join(", ")}.`);
  }
  return value as T;
}
