import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifySignature } from "@/lib/whatsapp";

describe("webhook security", () => {
  it("verifySignature valid saat HMAC cocok", () => {
    const body = "hello";
    const sig = "sha256=" + crypto.createHmac("sha256", "TOKEN").update(body).digest("hex");
    expect(verifySignature(body, sig, "TOKEN")).toBe(true);
  });
  it("verifySignature tolak saat token beda", () => {
    const body = "hello";
    const sig = "sha256=" + crypto.createHmac("sha256", "X").update(body).digest("hex");
    expect(verifySignature(body, sig, "TOKEN")).toBe(false);
  });
  it("verifySignature tolak saat signature null", () => {
    expect(verifySignature("hello", null, "TOKEN")).toBe(false);
  });
});
