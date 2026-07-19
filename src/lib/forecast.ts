export function movingAverage(history: number[], window: number): number {
  if (history.length === 0) return 0;
  const w = Math.min(window, history.length);
  const slice = history.slice(history.length - w);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function weightedMA(history: number[], weights: number[]): number {
  if (history.length !== weights.length) {
    throw new Error("history & weights length must match");
  }
  const sumW = weights.reduce((a, b) => a + b, 0);
  if (Math.abs(sumW - 1) > 1e-9) {
    throw new Error("weights must sum to 1");
  }
  return history.reduce((acc, v, i) => acc + v * weights[i], 0);
}
