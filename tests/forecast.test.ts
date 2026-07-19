import { describe, it, expect } from "vitest";
import { movingAverage, weightedMA } from "@/lib/forecast";

describe("forecast", () => {
  it("movingAverage rata-rata 3 hari terakhir", () => {
    expect(movingAverage([10, 20, 30, 40], 3)).toBeCloseTo(30);
  });
  it("movingAverage data < window pakai yang ada", () => {
    expect(movingAverage([10, 20], 7)).toBeCloseTo(15);
  });
  it("weightedMA bobot terbaru lebih besar", () => {
    // weights [0.2,0.3,0.5] untuk [10,20,30]
    expect(weightedMA([10, 20, 30], [0.2, 0.3, 0.5])).toBeCloseTo(23);
  });
  it("weightedMA panjang tidak cocok throw", () => {
    expect(() => weightedMA([10, 20], [0.2, 0.3, 0.5])).toThrow();
  });
});
