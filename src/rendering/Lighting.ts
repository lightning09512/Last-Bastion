// ─── Lighting ────────────────────────────────────────────────────
// One sun for the whole game, fixed at the upper-left (A4 in the
// roadmap). Every shadow in every renderer must come from here so the
// scene reads as a single lit space instead of a collage.
//
// Conventions:
//   • highlights sit on top/left edges
//   • shadows fall to the bottom/right
//   • contact shadow: tight, dark, straight under the object
//   • cast shadow: soft, offset by elevation, drawn in a ground pass

import { SHADOW_TINT } from './Palette';

/** Unit vector pointing from the object towards the sun. */
export const SUN_DIR = { x: -0.56, y: -0.83 };

/** Unit vector the shadows are thrown along (opposite of the sun). */
export const SHADOW_DIR = { x: 0.56, y: 0.83 };

/** Offset of a cast shadow for an object of the given height (design px). */
export function castShadowOffset(elevation: number): { dx: number; dy: number } {
  return { dx: SHADOW_DIR.x * elevation * 0.42, dy: SHADOW_DIR.y * elevation * 0.52 };
}

/**
 * Tight dark ellipse right under an object. `strength` scales the alpha,
 * use ~0.35 for units, ~0.25 for wide buildings.
 */
export function contactShadow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  rx: number, ry: number,
  strength = 0.34,
): void {
  ctx.save();
  const grad = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  grad.addColorStop(0, `rgba(18,14,26,${strength})`);
  grad.addColorStop(0.65, `rgba(18,14,26,${strength * 0.55})`);
  grad.addColorStop(1, 'rgba(18,14,26,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Soft shadow thrown away from the sun. `elevation` is the object's
 * height in design px; the shadow grows and drifts with it.
 */
export function castShadow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  rx: number, ry: number,
  elevation: number,
  strength = 0.18,
): void {
  const { dx, dy } = castShadowOffset(elevation);
  const stretch = 1 + elevation / 220;
  const cx = x + dx;
  const cy = y + dy;
  ctx.save();
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx * stretch, ry * stretch));
  grad.addColorStop(0, `rgba(18,14,26,${strength})`);
  grad.addColorStop(0.7, `rgba(18,14,26,${strength * 0.45})`);
  grad.addColorStop(1, 'rgba(18,14,26,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * stretch, ry * stretch, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Darken the ground right where a building meets it (fake AO). */
export function groundAO(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  rx: number, ry: number,
  strength = 0.22,
): void {
  ctx.save();
  const grad = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  grad.addColorStop(0, `rgba(0,0,0,${strength})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Stroke a shape with a gradient that is bright towards the sun and
 * transparent away from it — the cheap way to get a rim light on any
 * silhouette. `path` must only build the path (no fill/stroke).
 */
export function rimLight(
  ctx: CanvasRenderingContext2D,
  path: () => void,
  cx: number, cy: number, radius: number,
  color = 'rgba(255,248,214,0.75)',
  width = 1.6,
): void {
  ctx.save();
  const grad = ctx.createLinearGradient(
    cx - radius, cy - radius,
    cx + radius, cy + radius,
  );
  grad.addColorStop(0, color);
  grad.addColorStop(0.42, 'rgba(255,255,255,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  path();
  ctx.stroke();
  ctx.restore();
}

/**
 * Thick dark outline that gives the cartoon read of hand-painted art.
 * Applied per part, before the rim light.
 */
export function outline(
  ctx: CanvasRenderingContext2D,
  path: () => void,
  color = SHADOW_TINT,
  width = 1.4,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  path();
  ctx.stroke();
  ctx.restore();
}

/**
 * Vertical body shading: light at the top, shadow at the bottom. Use as
 * the fill style for a rounded body shape.
 */
export function bodyGradient(
  ctx: CanvasRenderingContext2D,
  cx: number, top: number, bottom: number,
  baseHex: string,
  lighten = 0.22,
  darken = 0.26,
): CanvasGradient {
  const grad = ctx.createLinearGradient(cx, top, cx, bottom);
  grad.addColorStop(0, mix(baseHex, '#ffffff', lighten));
  grad.addColorStop(0.55, baseHex);
  grad.addColorStop(1, mix(baseHex, '#1a1226', darken));
  return grad;
}

/** Mix two hex colours; `t` = 0 returns `a`, `t` = 1 returns `b`. */
export function mix(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}
