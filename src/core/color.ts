// ─── Color Utilities ─────────────────────────────────────────────
// Lighten/darken helpers shared by the Canvas2D renderers.

export function adjustColor(hex: string, amount: number): string {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, Math.min(255, r + Math.round(amount * 255)));
  g = Math.max(0, Math.min(255, g + Math.round(amount * 255)));
  b = Math.max(0, Math.min(255, b + Math.round(amount * 255)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function darken(hex: string, amount: number): string {
  return adjustColor(hex, -amount);
}

export function lighten(hex: string, amount: number): string {
  return adjustColor(hex, amount);
}
