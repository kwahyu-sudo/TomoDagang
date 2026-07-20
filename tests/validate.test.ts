import { describe, it, expect } from "vitest";
import { validate, ValidationError } from "@/lib/validate";

describe("validate", () => {
  it("valid object passes", () => {
    const result = validate({ nama: "Kue", harga: 1000 }, { nama: "string", harga: "number" });
    expect(result).toEqual({ nama: "Kue", harga: 1000 });
  });

  it("missing required field throws", () => {
    expect(() => validate({ nama: "Kue" }, { nama: "string", harga: "number" })).toThrow(ValidationError);
  });

  it("wrong type throws", () => {
    expect(() => validate({ nama: 123 }, { nama: "string" })).toThrow(ValidationError);
  });

  it("optional field skipped when missing", () => {
    const result = validate({ nama: "Kue" }, { nama: "string", catatan: "optional_string" });
    expect(result).toEqual({ nama: "Kue" });
  });

  it("optional field validated when present", () => {
    expect(() => validate({ nama: "Kue", catatan: 123 }, { nama: "string", catatan: "optional_string" })).toThrow(
      ValidationError
    );
  });

  it("null body throws", () => {
    expect(() => validate(null, { nama: "string" })).toThrow(ValidationError);
  });
});
