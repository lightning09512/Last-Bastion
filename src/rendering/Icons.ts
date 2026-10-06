// ─── Vector Icon Set ──────────────────────────────────────────────
// The whole game used to draw emoji and text glyphs for its UI icons
// (bows, orbs, bombs, swords, flames, shields, coins, stars, transport
// triangles, pause bars and crosses). Those are unreadable at 24px, their
// baseline jumps between operating systems, and they can never match the
// gold-bronze-timber palette. This module replaces every one of them
// with a hand drawn, palette-locked vector icon.
//
// Design rules
//   • every icon is authored inside a canonical 100 × 100 box, so the
//     same code is legible at 18px on a HUD chip and at 64px in a modal
//   • 2–4 shapes per icon, each with a dark outline plus a light and a
//     dark tone: the Kingdom Rush "readable at a glance" silhouette
//   • nothing is drawn twice: `sprites.get()` bakes the icon once per
//     (name, size) at 2–3× and every later frame is a single blit
//
// Usage
//   drawIcon(ctx, 'gold', 40, 25, 22);
//   const sprite = getIconSprite('pause', 24);   // blit it yourself

import { sprites } from './SpriteBank';
import { mix } from './Lighting';
import { SHADOW_TINT } from './Palette';

// ─── Public API ──────────────────────────────────────────────────

export type IconName =
  | 'archer' | 'mage' | 'cannon' | 'barracks'
  | 'spec_sharpshooter' | 'spec_rapid_volley' | 'spec_arcane_blast' | 'spec_slow_hex'
  | 'spec_heavy_bombard' | 'spec_cluster_bombs' | 'spec_knights' | 'spec_rangers'
  | 'gold' | 'heart' | 'wave' | 'pause' | 'play' | 'speed' | 'sell' | 'upgrade'
  | 'spell_rain_of_fire' | 'spell_reinforcements' | 'star' | 'lock' | 'sound_on' | 'sound_off'
  | 'settings' | 'back' | 'close' | 'info' | 'priority_first' | 'priority_strong'
  | 'priority_close' | 'plus' | 'hammer' | 'skull' | 'check';

/**
 * Draw an icon centred on (x, y). `size` is the icon's full extent in
 * design pixels; the sprite carries ~14% of transparent padding so tall
 * icons such as `star` never clip their own outline.
 */
export function drawIcon(
  ctx: CanvasRenderingContext2D,
  name: IconName,
  x: number,
  y: number,
  size: number,
  alpha = 1,
): void {
  const sprite = getIconSprite(name, size);
  const prev = ctx.globalAlpha;
  if (alpha !== 1) ctx.globalAlpha = prev * alpha;
  ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
  ctx.globalAlpha = prev;
}

/**
 * Baked sprite for `name` at `size`. The returned canvas is
 * `size * ICON_SUPERSAMPLE` pixels wide; always blit it back at
 * (`size`, `size`) with its centre on the target point.
 */
export function getIconSprite(name: IconName, size: number): HTMLCanvasElement {
  const s = Math.max(6, Math.round(size));
  return sprites.get(`icon:${name}`, s, s, (c, w) => {
    const k = w / 100;
    c.translate(w / 2, w / 2);
    c.scale(k, k);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    ICON_DRAW[name](c);
  }, ICON_SUPERSAMPLE);
}

/** Icons are baked at 3× and blitted down, which is what makes them crisp. */
const ICON_SUPERSAMPLE = 3;

// ─── Palette & primitives ────────────────────────────────────────

const OUTLINE = SHADOW_TINT;
const DEEP = '#241a30';
const GOLD_HI = '#ffe9a8';
const GOLD = '#f2c14a';
const GOLD_DARK = '#8a5f14';
const BRONZE = '#b07c38';
const BRONZE_DARK = '#6d451a';
const WOOD = '#6b4320';
const WOOD_DARK = '#3d2410';
const IRON_HI = '#cfd8e4';
const IRON = '#94a3b4';
const IRON_DARK = '#4c5768';
const CRIMSON = '#c0392b';
const CRIMSON_DARK = '#7d1f16';
const FOREST = '#4f9c3c';
const FOREST_DARK = '#265c1d';
const ARCANE = '#8b5cf6';
const ARCANE_DARK = '#432a86';
const HEX = '#38bdf8';
const HEX_DARK = '#155e88';
const BONE = '#ece0c4';
const BONE_DARK = '#a08d6b';

/** Trace a polygon in the 100-unit icon space. */
function poly(c: CanvasRenderingContext2D, pts: number[][]): void {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
}

/** Trace a circle. */
function circle(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
}

/** Trace an ellipse. */
function ellipse(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

/** Trace a rectangle centred on (x, y). */
function rect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  c.beginPath();
  c.rect(x - w / 2, y - h / 2, w, h);
}

/** Trace a rounded rectangle centred on (x, y). */
function rrect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const x0 = x - w / 2;
  const y0 = y - h / 2;
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x0 + rr, y0);
  c.lineTo(x0 + w - rr, y0);
  c.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + rr);
  c.lineTo(x0 + w, y0 + h - rr);
  c.quadraticCurveTo(x0 + w, y0 + h, x0 + w - rr, y0 + h);
  c.lineTo(x0 + rr, y0 + h);
  c.quadraticCurveTo(x0, y0 + h, x0, y0 + h - rr);
  c.lineTo(x0, y0 + rr);
  c.quadraticCurveTo(x0, y0, x0 + rr, y0);
  c.closePath();
}

/** A 5-point star. */
function starPath(c: CanvasRenderingContext2D, x: number, y: number, r: number, inner = 0.44): void {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * inner;
    const a = (Math.PI * i) / 5 - Math.PI / 2;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
}

/** Fill the current path with a flat colour and a dark outline. */
function ink(c: CanvasRenderingContext2D, fill: string, width = 4.5): void {
  c.fillStyle = fill;
  c.fill();
  c.lineWidth = width;
  c.strokeStyle = OUTLINE;
  c.stroke();
}

/** Fill the current path with a vertical light→dark body gradient. */
function body(c: CanvasRenderingContext2D, x: number, top: number, bottom: number, hex: string,
  lighten = 0.3, darken = 0.34): void {
  const g = c.createLinearGradient(x, top, x, bottom);
  g.addColorStop(0, mix(hex, '#fff6da', lighten));
  g.addColorStop(0.52, hex);
  g.addColorStop(1, mix(hex, DEEP, darken));
  c.fillStyle = g;
  c.fill();
}

/** Warm metal: bright on the sun side, dark away from it. */
function metal(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, hex = GOLD): void {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, mix(hex, '#fffbe8', 0.62));
  g.addColorStop(0.45, hex);
  g.addColorStop(1, mix(hex, DEEP, 0.42));
  c.fillStyle = g;
  c.fill();
}

/** One-pixel-ish specular streak inside the current path. */
function spec(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a = 0.5): void {
  c.fillStyle = `rgba(255,252,230,${a})`;
  rrect(c, x, y, w, h, Math.min(w, h) / 2);
  c.fill();
}

/** Draw a polyline stroke with a line width and colour. */
function strokeLine(c: CanvasRenderingContext2D, pts: number[][], color: string, width: number): void {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}

/** A leaf/blade shape (bow limb, blade, feather) as a curved wedge. */
function blade(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, bow: number): void {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  c.beginPath();
  c.moveTo(x0, y0);
  c.quadraticCurveTo(mx + nx * bow, my + ny * bow, x1, y1);
  c.quadraticCurveTo(mx - nx * bow * 0.5, my - ny * bow * 0.5, x0, y0);
  c.closePath();
}

/** Crosshair reticle rings, shared by the "targeting order" icons. */
function reticle(c: CanvasRenderingContext2D, r: number, color: string): void {
  circle(c, 0, 0, r);
  c.strokeStyle = color;
  c.lineWidth = 4;
  c.stroke();
  strokeLine(c, [[-r - 8, 0], [-r + 4, 0]], color, 4);
  strokeLine(c, [[r - 4, 0], [r + 8, 0]], color, 4);
  strokeLine(c, [[0, -r - 8], [0, -r + 4]], color, 4);
  strokeLine(c, [[0, r - 4], [0, r + 8]], color, 4);
}

// ─── Tower icons ─────────────────────────────────────────────────

function iconArcher(c: CanvasRenderingContext2D): void {
  // Strung bow: two limbs around a grip, string across the front.
  const limb = (dir: number): void => {
    c.beginPath();
    c.moveTo(30 * dir, -46);
    c.quadraticCurveTo(66 * dir, 0, 30 * dir, 46);
    c.quadraticCurveTo(50 * dir, 0, 30 * dir, -46);
    c.closePath();
    metal(c, 24 * dir, -46, 24 * dir, 46, BRONZE);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 4;
    c.stroke();
  };
  limb(1);
  limb(-1);

  // Grip wrap
  rrect(c, 0, 0, 15, 30, 6);
  body(c, 0, -15, 15, WOOD, 0.24, 0.36);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 3.5;
  c.stroke();

  // Bow string
  strokeLine(c, [[31, -44], [10, 0], [31, 44]], BONE, 3.2);

  // Nocked arrow pointing up-right
  c.save();
  c.rotate(-0.72);
  rect(c, 0, 2, 7, 74);
  body(c, 0, -35, 39, WOOD, 0.3, 0.3);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 3.2;
  c.stroke();
  poly(c, [[-11, -34], [11, -34], [0, -56]]);
  ink(c, IRON_HI, 3.4);
  poly(c, [[-8, 36], [-20, 50], [-6, 52]]);
  ink(c, CRIMSON, 3);
  poly(c, [[8, 36], [20, 50], [6, 52]]);
  ink(c, CRIMSON, 3);
  c.restore();
}

function iconMage(c: CanvasRenderingContext2D): void {
  // Three iron claws cradling a glowing arcane orb.
  [-1, 1].forEach(dir => {
    c.beginPath();
    c.moveTo(10 * dir, 40);
    c.quadraticCurveTo(42 * dir, 24, 30 * dir, -18);
    c.quadraticCurveTo(36 * dir, 24, 20 * dir, 44);
    c.closePath();
    metal(c, 0, -18, 0, 44, IRON);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 4;
    c.stroke();
  });

  circle(c, 0, -4, 31);
  const g = c.createRadialGradient(-10, -16, 4, 0, -4, 33);
  g.addColorStop(0, '#f0e4ff');
  g.addColorStop(0.35, ARCANE);
  g.addColorStop(1, ARCANE_DARK);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  spec(c, -16, -22, 14, 9, 0.65);
  c.strokeStyle = 'rgba(240,228,255,0.55)';
  c.lineWidth = 2;
  ellipse(c, 0, -4, 22, 20, -0.5);
  c.stroke();

  // Sparkles
  [[-34, -34], [36, -26], [30, 26]].forEach(([x, y]) => {
    starPath(c, x, y, 8, 0.32);
    ink(c, GOLD_HI, 2.6);
  });
}

function iconCannon(c: CanvasRenderingContext2D): void {
  // Barrel
  c.save();
  c.rotate(-0.16);
  poly(c, [[-16, -30], [30, -36], [34, 30], [-18, 34]]);
  metal(c, -20, -36, 34, 34, IRON);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  spec(c, -4, -26, 24, 8, 0.4);
  // Bands
  [-8, 12].forEach(y => {
    rect(c, 6, y, 50, 7);
    ink(c, BRONZE_DARK, 3);
  });
  // Muzzle
  ellipse(c, 32, -3, 8, 31);
  ink(c, IRON_DARK, 4);
  ellipse(c, 32, -3, 4.5, 25);
  c.fillStyle = '#14101f';
  c.fill();
  c.restore();

  // Powder ball + fuse
  circle(c, -30, 28, 15);
  metal(c, -44, 14, -16, 42, '#2f3542');
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4;
  c.stroke();
  spec(c, -38, 20, 10, 7, 0.35);
  strokeLine(c, [[-24, -2], [-14, -12], [-20, -22]], CRIMSON, 4);
  circle(c, -21, -26, 5);
  ink(c, '#ffb648', 2.4);
}

function iconBarracks(c: CanvasRenderingContext2D): void {
  // Two crossed spears behind a tower shield.
  [-1, 1].forEach(dir => {
    c.save();
    c.rotate(dir * 0.72);
    rect(c, 0, 0, 6.5, 104);
    body(c, 0, -52, 52, WOOD, 0.26, 0.3);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 3;
    c.stroke();
    poly(c, [[-10, -50], [10, -50], [0, -74]]);
    ink(c, IRON_HI, 3);
    c.restore();
  });

  shield(c, 0, 4, 34, 42);
  const g = c.createLinearGradient(0, -38, 0, 46);
  g.addColorStop(0, '#3f6fd8');
  g.addColorStop(0.55, '#24479b');
  g.addColorStop(1, '#152a63');
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  strokeLine(c, [[-34, 0], [34, 0]], GOLD, 6);
  strokeLine(c, [[0, -38], [0, 46]], GOLD, 6);
  circle(c, 0, 4, 11);
  ink(c, GOLD_HI, 3.2);
}

function iconSpecSharpshooter(c: CanvasRenderingContext2D): void {
  // Eagle-eye scope over a long shafted arrow.
  c.save();
  c.rotate(-0.6);
  rect(c, 0, 6, 6, 76);
  body(c, 0, -32, 44, WOOD, 0.3, 0.3);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 3;
  c.stroke();
  poly(c, [[-11, -30], [11, -30], [0, -54]]);
  ink(c, GOLD_HI, 3.4);
  c.restore();

  circle(c, 4, -8, 32);
  metal(c, -28, -40, 36, 26, BRONZE);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  circle(c, 4, -8, 22);
  c.fillStyle = 'rgba(24,32,52,0.85)';
  c.fill();
  reticle(c, 17, GOLD_HI);
}

function iconSpecRapidVolley(c: CanvasRenderingContext2D): void {
  // Fanned trio of arrows leaving the bow.
  [-0.5, 0, 0.5].forEach(a => {
    c.save();
    c.rotate(a);
    rect(c, 0, -2, 6, 62);
    body(c, 0, -33, 29, WOOD, 0.28, 0.3);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 2.8;
    c.stroke();
    poly(c, [[-10, -32], [10, -32], [0, -52]]);
    ink(c, IRON_HI, 3);
    c.restore();
  });
  // Bow limb sweeping under the volley
  c.beginPath();
  c.moveTo(-30, 30);
  c.quadraticCurveTo(6, 54, 40, 22);
  c.quadraticCurveTo(8, 66, -34, 40);
  c.closePath();
  metal(c, -34, 22, 40, 54, BRONZE);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4;
  c.stroke();
  strokeLine(c, [[-30, 30], [40, 22]], BONE, 3);
}

function iconSpecArcaneBlast(c: CanvasRenderingContext2D): void {
  // Detonating arcane core with shock spikes.
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * i) / 4 - Math.PI / 2;
    const len = i % 2 === 0 ? 48 : 34;
    poly(c, [
      [Math.cos(a) * len, Math.sin(a) * len],
      [Math.cos(a + 0.28) * 20, Math.sin(a + 0.28) * 20],
      [Math.cos(a - 0.28) * 20, Math.sin(a - 0.28) * 20],
    ]);
    ink(c, i % 2 === 0 ? GOLD : ARCANE, 3.4);
  }
  circle(c, 0, 0, 26);
  const g = c.createRadialGradient(-8, -8, 2, 0, 0, 28);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, '#c4a6ff');
  g.addColorStop(1, ARCANE_DARK);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
}

function iconSpecSlowHex(c: CanvasRenderingContext2D): void {
  // Frost crystal inside a binding hex ring.
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * i) / 3 - Math.PI / 2;
    const x = Math.cos(a) * 44;
    const y = Math.sin(a) * 44;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 9;
  c.stroke();
  c.strokeStyle = GOLD;
  c.lineWidth = 5.5;
  c.stroke();

  const g = c.createLinearGradient(0, -34, 0, 34);
  g.addColorStop(0, '#e8fbff');
  g.addColorStop(0.5, HEX);
  g.addColorStop(1, HEX_DARK);
  poly(c, [[0, -36], [22, 0], [0, 36], [-22, 0]]);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4;
  c.stroke();
  strokeLine(c, [[0, -30], [0, 30]], 'rgba(255,255,255,0.6)', 2.4);
  strokeLine(c, [[-16, -2], [16, -2]], 'rgba(255,255,255,0.35)', 2);
}

function iconSpecHeavyBombard(c: CanvasRenderingContext2D): void {
  // Squat mortar with a shell on its way out.
  c.save();
  c.rotate(-1.05);
  poly(c, [[-20, -24], [26, -30], [30, 26], [-22, 30]]);
  metal(c, -24, -30, 30, 30, IRON_DARK);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  spec(c, -8, -22, 22, 8, 0.35);
  rect(c, 2, -22, 54, 8);
  ink(c, BRONZE, 3);
  rect(c, 2, 14, 54, 8);
  ink(c, BRONZE, 3);
  c.restore();

  // Shell + blast
  circle(c, 26, -24, 15);
  metal(c, 12, -38, 40, -10, '#2f3542');
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4;
  c.stroke();
  spec(c, 19, -31, 9, 6, 0.4);
  poly(c, [[36, -46], [56, -58], [44, -36]]);
  ink(c, '#ffb648', 3);
  poly(c, [[44, -18], [62, -12], [42, -6]]);
  ink(c, CRIMSON, 3);
}

function iconSpecClusterBombs(c: CanvasRenderingContext2D): void {
  // Three shells raining down, trails behind them.
  const bomb = (x: number, y: number, r: number): void => {
    circle(c, x, y, r);
    const g = c.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r);
    g.addColorStop(0, '#6b7688');
    g.addColorStop(0.6, '#39404f');
    g.addColorStop(1, '#191d26');
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 4;
    c.stroke();
    spec(c, x - r * 0.5, y - r * 0.55, r * 0.7, r * 0.4, 0.4);
    strokeLine(c, [[x + r * 0.4, y - r], [x + r * 1.1, y - r * 1.9]], CRIMSON, 3.4);
  };
  bomb(-24, 12, 17);
  bomb(24, 20, 14);
  bomb(6, -24, 21);

  // Blast clouds
  [[-44, -30], [44, -18], [0, 46]].forEach(([x, y]) => {
    starPath(c, x, y, 11, 0.3);
    ink(c, '#ffb648', 2.8);
  });
}

function iconSpecKnights(c: CanvasRenderingContext2D): void {
  // Great helm behind a heater shield with a sword.
  c.save();
  c.rotate(0.62);
  poly(c, [[-9, -52], [9, -52], [9, 26], [0, 40], [-9, 26]]);
  metal(c, -9, -52, 9, 40, IRON_HI);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4;
  c.stroke();
  rect(c, 0, 32, 44, 9);
  ink(c, GOLD, 3.2);
  rect(c, 0, 46, 9, 20);
  ink(c, WOOD_DARK, 3);
  c.restore();

  shield(c, 0, 6, 32, 40);
  const g = c.createLinearGradient(0, -34, 0, 46);
  g.addColorStop(0, '#e8eef8');
  g.addColorStop(0.55, '#aab6c8');
  g.addColorStop(1, '#5d6a80');
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  poly(c, [[0, -22], [16, 0], [0, 26], [-16, 0]]);
  ink(c, CRIMSON, 3.4);
  circle(c, 0, 0, 6);
  ink(c, GOLD_HI, 3);
}

function iconSpecRangers(c: CanvasRenderingContext2D): void {
  // Ranger's bow with a falcon feather and twin arrows.
  c.beginPath();
  c.moveTo(-26, -46);
  c.quadraticCurveTo(34, 0, -26, 46);
  c.quadraticCurveTo(6, 0, -26, -46);
  c.closePath();
  metal(c, -26, -46, 10, 46, FOREST_DARK);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4;
  c.stroke();
  strokeLine(c, [[-24, -44], [-10, 0], [-24, 44]], BONE, 3);

  [-0.34, 0.34].forEach(a => {
    c.save();
    c.rotate(a);
    rect(c, 12, 0, 5.5, 66);
    body(c, 12, -33, 33, WOOD, 0.3, 0.3);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 2.6;
    c.stroke();
    poly(c, [[4, -30], [20, -30], [12, -50]]);
    ink(c, GOLD_HI, 2.8);
    c.restore();
  });

  blade(c, -34, 6, -6, -30, 14);
  ink(c, FOREST, 3.4);
  strokeLine(c, [[-34, 6], [-6, -30]], mix(FOREST, '#ffffff', 0.45), 2.2);
}

// ─── Resources & status ──────────────────────────────────────────

function iconGold(c: CanvasRenderingContext2D): void {
  circle(c, 0, 3, 43);
  const g = c.createLinearGradient(-30, -38, 30, 44);
  g.addColorStop(0, '#fff4c9');
  g.addColorStop(0.4, GOLD);
  g.addColorStop(1, GOLD_DARK);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 5;
  c.stroke();

  circle(c, 0, 3, 32);
  c.strokeStyle = mix(GOLD_DARK, DEEP, 0.2);
  c.lineWidth = 3.4;
  c.stroke();
  circle(c, 0, 3, 27);
  c.strokeStyle = 'rgba(255,246,214,0.5)';
  c.lineWidth = 2;
  c.stroke();

  // Mint mark: a cog, the kingdom's coin stamp.
  gear(c, 0, 3, 15, 8, 7);
  ink(c, GOLD_DARK, 2.6);
  circle(c, 0, 3, 5);
  c.fillStyle = mix(GOLD_HI, '#ffffff', 0.2);
  c.fill();
  spec(c, -22, -24, 22, 11, 0.55);
}

function iconHeart(c: CanvasRenderingContext2D): void {
  c.beginPath();
  c.moveTo(0, 42);
  c.bezierCurveTo(-58, 4, -40, -46, -14, -46);
  c.bezierCurveTo(-4, -46, 0, -40, 0, -33);
  c.bezierCurveTo(0, -40, 4, -46, 14, -46);
  c.bezierCurveTo(40, -46, 58, 4, 0, 42);
  c.closePath();
  const g = c.createLinearGradient(0, -46, 0, 44);
  g.addColorStop(0, '#ff8a7a');
  g.addColorStop(0.42, CRIMSON);
  g.addColorStop(1, CRIMSON_DARK);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 5;
  c.stroke();
  // Left lobe shading + specular
  c.save();
  c.clip();
  c.fillStyle = 'rgba(60,12,22,0.28)';
  c.beginPath();
  c.ellipse(20, 6, 30, 34, 0.2, 0, Math.PI * 2);
  c.fill();
  c.restore();
  spec(c, -20, -26, 20, 12, 0.5);
  circle(c, -14, -22, 5);
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.fill();
}

function iconWave(c: CanvasRenderingContext2D): void {
  // War horn with an iron mouth band, angled up-right.
  c.save();
  c.rotate(-0.34);
  c.beginPath();
  c.moveTo(-42, -8);
  c.quadraticCurveTo(-12, -30, 20, -34);
  c.quadraticCurveTo(42, -36, 46, -12);
  c.quadraticCurveTo(48, 12, 24, 20);
  c.quadraticCurveTo(-10, 30, -42, 12);
  c.quadraticCurveTo(-34, 2, -42, -8);
  c.closePath();
  const g = c.createLinearGradient(-46, -34, 44, 22);
  g.addColorStop(0, '#fff0c4');
  g.addColorStop(0.4, GOLD);
  g.addColorStop(1, BRONZE_DARK);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();

  // Bell rim
  ellipse(c, 36, -8, 12, 26, -0.1);
  ink(c, mix(BRONZE, '#ffffff', 0.25), 3.6);
  ellipse(c, 36, -8, 6, 18, -0.1);
  c.fillStyle = '#2a1c10';
  c.fill();

  // Grip wrap
  rect(c, -34, 2, 12, 30);
  ink(c, WOOD_DARK, 3);
  strokeLine(c, [[-30, -6], [-30, 10]], 'rgba(255,246,214,0.4)', 2);
  c.restore();

  // Sound arcs
  strokeLine(c, [[22, -46], [34, -56]], GOLD_HI, 4);
  strokeLine(c, [[34, -38], [50, -46]], GOLD_HI, 4);
}

function iconStar(c: CanvasRenderingContext2D): void {
  starPath(c, 0, 0, 46, 0.46);
  const g = c.createLinearGradient(-24, -44, 24, 44);
  g.addColorStop(0, '#fff8d4');
  g.addColorStop(0.42, GOLD);
  g.addColorStop(1, '#b8791a');
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 5;
  c.stroke();

  c.save();
  c.clip();
  // Faceted shading: right half darker, small specular pip.
  c.fillStyle = 'rgba(90,50,10,0.28)';
  c.beginPath();
  c.moveTo(0, -46);
  c.lineTo(46, 0);
  c.lineTo(0, 46);
  c.closePath();
  c.fill();
  spec(c, -14, -22, 14, 8, 0.7);
  c.restore();
}

function iconLock(c: CanvasRenderingContext2D): void {
  // Shackle: dark iron body with a bright sun-side highlight.
  c.beginPath();
  c.arc(0, -14, 24, Math.PI, 0);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 15;
  c.stroke();
  c.strokeStyle = IRON_DARK;
  c.lineWidth = 11;
  c.stroke();
  c.strokeStyle = IRON;
  c.lineWidth = 6;
  c.stroke();
  c.strokeStyle = 'rgba(255,248,222,0.45)';
  c.lineWidth = 2.2;
  c.stroke();

  // Body
  rrect(c, 0, 20, 66, 54, 10);
  const g = c.createLinearGradient(0, -7, 0, 47);
  g.addColorStop(0, '#cdd6e2');
  g.addColorStop(0.5, '#8e9aab');
  g.addColorStop(1, '#4a5262');
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 5;
  c.stroke();
  strokeLine(c, [[-33, 12], [33, 12]], 'rgba(255,255,255,0.35)', 3);
  strokeLine(c, [[-33, 34], [33, 34]], 'rgba(20,16,32,0.35)', 3);
  circle(c, -24, 10, 4);
  ink(c, 'rgba(255,248,222,0.6)', 2.4);
  circle(c, 24, 10, 4);
  ink(c, 'rgba(255,248,222,0.6)', 2.4);

  // Keyhole
  circle(c, 0, 14, 8);
  c.fillStyle = DEEP;
  c.fill();
  poly(c, [[-4, 18], [4, 18], [6, 34], [-6, 34]]);
  c.fillStyle = DEEP;
  c.fill();
}

function iconSkull(c: CanvasRenderingContext2D): void {
  // Cranium
  c.beginPath();
  c.moveTo(-34, 4);
  c.bezierCurveTo(-38, -40, 38, -40, 34, 4);
  c.quadraticCurveTo(34, 20, 22, 24);
  c.lineTo(-22, 24);
  c.quadraticCurveTo(-34, 20, -34, 4);
  c.closePath();
  body(c, 0, -40, 26, BONE, 0.35, 0.3);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();

  // Jaw
  rrect(c, 0, 34, 30, 22, 6);
  body(c, 0, 24, 46, BONE_DARK, 0.3, 0.3);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4;
  c.stroke();
  strokeLine(c, [[-5, 24], [-5, 45]], OUTLINE, 2.6);
  strokeLine(c, [[5, 24], [5, 45]], OUTLINE, 2.6);

  // Sockets + nose
  [-14, 14].forEach(x => {
    c.beginPath();
    c.ellipse(x, -4, 11, 13, x > 0 ? 0.16 : -0.16, 0, Math.PI * 2);
    c.fillStyle = '#160f22';
    c.fill();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 3;
    c.stroke();
  });
  poly(c, [[0, 12], [7, 22], [-7, 22]]);
  c.fillStyle = '#160f22';
  c.fill();

  // Cheek crack
  strokeLine(c, [[-30, 14], [-20, 20]], 'rgba(60,40,20,0.45)', 2.6);
}

// ─── Transport / system controls ─────────────────────────────────

function iconPause(c: CanvasRenderingContext2D): void {
  [-1, 1].forEach(dir => {
    rrect(c, dir * 16, 0, 20, 72, 6);
    metal(c, dir * 16 - 10, -36, dir * 16 + 10, 36, GOLD);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 4.5;
    c.stroke();
    spec(c, dir * 16 - 5, -26, 6, 34, 0.4);
  });
}

function iconPlay(c: CanvasRenderingContext2D): void {
  poly(c, [[-24, -40], [42, 0], [-24, 40]]);
  metal(c, -24, -40, 42, 40, GOLD);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 5;
  c.stroke();
  poly(c, [[-16, -22], [18, 0], [-16, 22]]);
  c.fillStyle = 'rgba(255,250,224,0.5)';
  c.fill();
}

function iconSpeed(c: CanvasRenderingContext2D): void {
  // Double chevron: "faster than normal".
  [0, 30].forEach(off => {
    poly(c, [[-34 + off, -36], [4 + off, 0], [-34 + off, 36], [-16 + off, 0]]);
    metal(c, -34 + off, -36, 4 + off, 36, GOLD);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 4.5;
    c.stroke();
  });
  strokeLine(c, [[-52, -26], [-30, -26]], 'rgba(255,250,224,0.45)', 4);
}

function iconUpgrade(c: CanvasRenderingContext2D): void {
  // Coin stack with a green up-chevron climbing out of it.
  [[8, 30], [0, 22], [-8, 14]].forEach(([y, w]) => {
    rrect(c, 0, y, w + 26, 15, 7);
    metal(c, -20, y - 8, 20, y + 8, GOLD);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 3.4;
    c.stroke();
  });
  poly(c, [[0, -46], [34, -14], [16, -14], [16, 4], [-16, 4], [-16, -14], [-34, -14]]);
  const g = c.createLinearGradient(0, -46, 0, 6);
  g.addColorStop(0, '#93e07a');
  g.addColorStop(1, FOREST_DARK);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  strokeLine(c, [[-20, -30], [0, -42]], 'rgba(255,255,255,0.5)', 3);
}

function iconSell(c: CanvasRenderingContext2D): void {
  // Price tag with a gold coin.
  c.save();
  c.rotate(-0.5);
  c.beginPath();
  c.moveTo(-18, -40);
  c.lineTo(22, -36);
  c.quadraticCurveTo(40, -34, 38, -16);
  c.lineTo(30, 40);
  c.quadraticCurveTo(28, 52, 14, 50);
  c.lineTo(-26, 42);
  c.quadraticCurveTo(-38, 40, -36, 26);
  c.lineTo(-30, -28);
  c.closePath();
  body(c, 0, -40, 50, '#e0c38c', 0.32, 0.3);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  circle(c, -4, -16, 6);
  c.fillStyle = '#8a6b3c';
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 2.6;
  c.stroke();
  c.restore();

  circle(c, 20, 28, 22);
  metal(c, 0, 6, 42, 50, GOLD);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  circle(c, 20, 28, 13);
  c.strokeStyle = GOLD_DARK;
  c.lineWidth = 3;
  c.stroke();
  spec(c, 10, 12, 14, 8, 0.5);
}

function iconBack(c: CanvasRenderingContext2D): void {
  poly(c, [[28, -40], [-16, 0], [28, 40], [28, 16], [2, 0], [28, -16]]);
  metal(c, -16, -40, 28, 40, GOLD);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  rect(c, -34, 0, 26, 10);
  ink(c, GOLD, 3.4);
}

function iconClose(c: CanvasRenderingContext2D): void {
  circle(c, 0, 0, 42);
  const g = c.createLinearGradient(-30, -34, 30, 34);
  g.addColorStop(0, '#e0685a');
  g.addColorStop(0.5, CRIMSON);
  g.addColorStop(1, CRIMSON_DARK);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 5;
  c.stroke();
  circle(c, 0, 0, 33);
  c.strokeStyle = 'rgba(255,236,196,0.55)';
  c.lineWidth = 2.4;
  c.stroke();
  strokeLine(c, [[-15, -15], [15, 15]], '#fff4dc', 10);
  strokeLine(c, [[15, -15], [-15, 15]], '#fff4dc', 10);
  strokeLine(c, [[-15, -15], [15, 15]], OUTLINE, 3);
  strokeLine(c, [[15, -15], [-15, 15]], OUTLINE, 3);
  spec(c, -20, -24, 18, 9, 0.4);
}

function iconInfo(c: CanvasRenderingContext2D): void {
  circle(c, 0, 0, 42);
  const g = c.createLinearGradient(0, -42, 0, 42);
  g.addColorStop(0, '#4d7fd6');
  g.addColorStop(1, '#1e3d7d');
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 5;
  c.stroke();
  circle(c, 0, 0, 33);
  c.strokeStyle = 'rgba(226,238,255,0.5)';
  c.lineWidth = 2.4;
  c.stroke();
  circle(c, 0, -20, 7);
  ink(c, '#f4f8ff', 3);
  rrect(c, 0, 12, 13, 40, 6);
  ink(c, '#f4f8ff', 3);
}

function iconPriorityFirst(c: CanvasRenderingContext2D): void {
  reticle(c, 20, GOLD_HI);
  circle(c, 0, 0, 9);
  ink(c, CRIMSON, 3.4);
  poly(c, [[0, -48], [10, -30], [-10, -30]]);
  ink(c, GOLD, 3.2);
}

function iconPriorityStrong(c: CanvasRenderingContext2D): void {
  // Iron fist: the "strongest target" order.
  rrect(c, 2, 6, 46, 40, 12);
  body(c, 2, -14, 26, IRON, 0.34, 0.34);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();

  // Knuckles stacked down the front of the fist.
  [-18, -2, 14].forEach(y => {
    rrect(c, 6, y, 34, 16, 7);
    body(c, 6, y - 8, y + 8, IRON_HI, 0.3, 0.34);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 3.6;
    c.stroke();
  });

  // Thumb across the bottom.
  rrect(c, -22, 18, 34, 16, 8);
  body(c, -22, 10, 26, IRON_DARK, 0.3, 0.3);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 3.6;
  c.stroke();

  spec(c, -4, -16, 20, 7, 0.45);
}

function iconPriorityClose(c: CanvasRenderingContext2D): void {
  reticle(c, 20, GOLD_HI);
  // Hooked chain link: "grab the nearest".
  c.save();
  c.rotate(0.6);
  strokeLine(c, [[-30, 20], [-10, 4]], IRON, 9);
  strokeLine(c, [[-30, 20], [-10, 4]], OUTLINE, 3);
  c.beginPath();
  c.arc(0, -2, 14, -0.4, 2.4);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 12;
  c.stroke();
  c.strokeStyle = IRON;
  c.lineWidth = 7;
  c.stroke();
  c.restore();
}

function iconSettings(c: CanvasRenderingContext2D): void {
  gear(c, 0, 0, 34, 15, 9);
  metal(c, -34, -34, 34, 34, IRON);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  circle(c, 0, 0, 15);
  ink(c, mix(IRON_DARK, DEEP, 0.2), 4);
  circle(c, 0, 0, 6);
  c.fillStyle = GOLD_HI;
  c.fill();
}

function iconSoundOn(c: CanvasRenderingContext2D): void {
  speaker(c);
  [0, 1].forEach(i => {
    c.beginPath();
    const r = 22 + i * 16;
    c.arc(-20, 0, r, -0.74, 0.74);
    c.strokeStyle = i === 0 ? GOLD_HI : GOLD;
    c.lineWidth = 7;
    c.stroke();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 2.6;
    c.stroke();
  });
}

function iconSoundOff(c: CanvasRenderingContext2D): void {
  speaker(c);
  strokeLine(c, [[16, -22], [50, 22]], '#fff4dc', 10);
  strokeLine(c, [[50, -22], [16, 22]], '#fff4dc', 10);
  strokeLine(c, [[16, -22], [50, 22]], CRIMSON_DARK, 11);
  strokeLine(c, [[50, -22], [16, 22]], CRIMSON_DARK, 11);
}

function iconPlus(c: CanvasRenderingContext2D): void {
  circle(c, 0, 0, 40);
  const g = c.createLinearGradient(0, -40, 0, 40);
  g.addColorStop(0, '#7fd070');
  g.addColorStop(1, '#1f5c19');
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 5;
  c.stroke();
  circle(c, 0, 0, 31);
  c.strokeStyle = 'rgba(240,255,230,0.5)';
  c.lineWidth = 2.4;
  c.stroke();
  rrect(c, 0, 0, 42, 13, 6);
  ink(c, '#f4ffe8', 3.4);
  rrect(c, 0, 0, 13, 42, 6);
  ink(c, '#f4ffe8', 3.4);
}

function iconHammer(c: CanvasRenderingContext2D): void {
  c.save();
  c.rotate(0.7);
  // Handle
  rect(c, 0, 20, 12, 74);
  body(c, 0, -17, 57, WOOD, 0.3, 0.32);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 3.6;
  c.stroke();
  strokeLine(c, [[-3, 4], [3, 4]], 'rgba(60,40,20,0.4)', 2.4);
  // Head
  rrect(c, 0, -32, 66, 34, 6);
  metal(c, -33, -49, 33, -15, IRON);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  rect(c, -34, -32, 16, 40);
  ink(c, IRON_DARK, 3.4);
  rect(c, 26, -32, 16, 32);
  ink(c, IRON, 3.4);
  spec(c, -14, -42, 26, 8, 0.45);
  c.restore();
}

function iconCheck(c: CanvasRenderingContext2D): void {
  sheetPath(c, 0, 0, 52, 48, 0);
  body(c, 0, -48, 48, '#f3e3c2', 0.3, 0.24);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  strokeLine(c, [[-16, -34], [6, -26]], 'rgba(120,90,50,0.35)', 3);
  strokeLine(c, [[-16, -14], [10, -8]], 'rgba(120,90,50,0.35)', 3);
  strokeLine(c, [[-24, 12], [-6, 32], [30, -18]], '#3f9c35', 13);
  strokeLine(c, [[-24, 12], [-6, 32], [30, -18]], OUTLINE, 4);
}

// ─── Spells ──────────────────────────────────────────────────────

function iconSpellRainOfFire(c: CanvasRenderingContext2D): void {
  // Falling meteor with three flame trails.
  c.save();
  c.rotate(0.6);
  [[-16, 0.7], [0, 1], [16, 0.75]].forEach(([ox, s]) => {
    c.beginPath();
    c.moveTo(ox - 9 * s, 34);
    c.quadraticCurveTo(ox - 3 * s, 0, ox, -8 * s);
    c.quadraticCurveTo(ox + 3 * s, 0, ox + 9 * s, 34);
    c.closePath();
    const g = c.createLinearGradient(0, -10, 0, 36);
    g.addColorStop(0, '#fff2b0');
    g.addColorStop(0.45, '#ff9d2e');
    g.addColorStop(1, 'rgba(214,60,10,0.25)');
    c.fillStyle = g;
    c.fill();
  });
  c.restore();

  circle(c, 12, -22, 24);
  const g = c.createRadialGradient(4, -32, 3, 12, -22, 25);
  g.addColorStop(0, '#ffe9a8');
  g.addColorStop(0.4, '#d9622a');
  g.addColorStop(1, '#5c2312');
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  circle(c, 5, -28, 5);
  c.fillStyle = 'rgba(30,12,6,0.65)';
  c.fill();
  spec(c, 2, -34, 12, 7, 0.4);
}

function iconSpellReinforcements(c: CanvasRenderingContext2D): void {
  // Two spears planting behind a kite shield: fresh troops arriving.
  [-1, 1].forEach(dir => {
    c.save();
    c.rotate(dir * 0.5);
    rect(c, 0, -10, 6, 96);
    body(c, 0, -58, 38, WOOD, 0.28, 0.3);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 3;
    c.stroke();
    poly(c, [[-10, -56], [10, -56], [0, -80]]);
    ink(c, IRON_HI, 3);
    c.restore();
  });

  shield(c, 0, 6, 30, 38);
  const g = c.createLinearGradient(0, -32, 0, 46);
  g.addColorStop(0, '#7fd070');
  g.addColorStop(0.5, FOREST);
  g.addColorStop(1, FOREST_DARK);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  strokeLine(c, [[-30, 0], [30, 0]], GOLD, 6);
  strokeLine(c, [[0, -32], [0, 44]], GOLD, 6);
  circle(c, 0, 4, 10);
  ink(c, GOLD_HI, 3);
}

// ─── Shared shapes ───────────────────────────────────────────────

/** Heraldic shield silhouette used across markers and icons. */
function shield(c: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number): void {
  c.beginPath();
  c.moveTo(cx - w, cy - h * 0.72);
  c.lineTo(cx + w, cy - h * 0.72);
  c.lineTo(cx + w, cy + h * 0.08);
  c.quadraticCurveTo(cx + w, cy + h * 0.72, cx, cy + h);
  c.quadraticCurveTo(cx - w, cy + h * 0.72, cx - w, cy + h * 0.08);
  c.closePath();
}

/** Torn parchment sheet. */
function sheetPath(c: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, wobble: number): void {
  const hw = w / 2;
  const hh = h / 2;
  c.beginPath();
  c.moveTo(cx - hw, cy - hh + wobble);
  c.lineTo(cx - hw + wobble, cy - hh);
  c.lineTo(cx + hw - wobble, cy - hh + wobble);
  c.lineTo(cx + hw, cy - hh + wobble * 2);
  c.lineTo(cx + hw - wobble, cy + hh);
  c.lineTo(cx - hw + wobble * 2, cy + hh - wobble);
  c.lineTo(cx - hw, cy + hh - wobble * 2);
  c.closePath();
}

/** Cog wheel with `teeth` square teeth. */
function gear(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, teeth: number, tooth: number): void {
  c.beginPath();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.34;
    const a2 = a0 + step * 0.66;
    const a3 = a0 + step;
    const ri = r - tooth;
    c.lineTo(cx + Math.cos(a0) * ri, cy + Math.sin(a0) * ri);
    c.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
    c.lineTo(cx + Math.cos(a2) * r, cy + Math.sin(a2) * r);
    c.lineTo(cx + Math.cos(a3) * ri, cy + Math.sin(a3) * ri);
  }
  c.closePath();
}

/** Speaker cone shared by sound on/off. */
function speaker(c: CanvasRenderingContext2D): void {
  poly(c, [[-46, -14], [-26, -14], [-4, -38], [-4, 38], [-26, 14], [-46, 14]]);
  metal(c, -46, -38, -4, 38, GOLD);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  strokeLine(c, [[-38, -6], [-38, 6]], 'rgba(255,250,224,0.4)', 3);
}

// ─── Dispatch table ──────────────────────────────────────────────

const ICON_DRAW: Record<IconName, (c: CanvasRenderingContext2D) => void> = {
  archer: iconArcher,
  mage: iconMage,
  cannon: iconCannon,
  barracks: iconBarracks,
  spec_sharpshooter: iconSpecSharpshooter,
  spec_rapid_volley: iconSpecRapidVolley,
  spec_arcane_blast: iconSpecArcaneBlast,
  spec_slow_hex: iconSpecSlowHex,
  spec_heavy_bombard: iconSpecHeavyBombard,
  spec_cluster_bombs: iconSpecClusterBombs,
  spec_knights: iconSpecKnights,
  spec_rangers: iconSpecRangers,
  gold: iconGold,
  heart: iconHeart,
  wave: iconWave,
  pause: iconPause,
  play: iconPlay,
  speed: iconSpeed,
  sell: iconSell,
  upgrade: iconUpgrade,
  spell_rain_of_fire: iconSpellRainOfFire,
  spell_reinforcements: iconSpellReinforcements,
  star: iconStar,
  lock: iconLock,
  sound_on: iconSoundOn,
  sound_off: iconSoundOff,
  settings: iconSettings,
  back: iconBack,
  close: iconClose,
  info: iconInfo,
  priority_first: iconPriorityFirst,
  priority_strong: iconPriorityStrong,
  priority_close: iconPriorityClose,
  plus: iconPlus,
  hammer: iconHammer,
  skull: iconSkull,
  check: iconCheck,
};

/** Every icon name, handy for a debug sheet or an audit loop. */
export const ICON_NAMES: IconName[] = Object.keys(ICON_DRAW) as IconName[];

/**
 * Bake a contact sheet of every icon. Used by the debug overlay and by
 * a visual regression shot so a broken glyph is obvious at a glance.
 */
export function drawIconSheet(ctx: CanvasRenderingContext2D, x: number, y: number, size = 30, columns = 10): void {
  ICON_NAMES.forEach((name, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    drawIcon(ctx, name, x + col * (size + 10) + size / 2, y + row * (size + 10) + size / 2, size);
  });
}
