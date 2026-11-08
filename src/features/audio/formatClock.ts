/** Seconds → "m:ss" (e.g. 75.4 → "1:15"). Negative or invalid input shows "0:00". */
export function formatClock(seconds: number): string {
  const s = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
