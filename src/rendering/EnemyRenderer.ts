// ─── Enemy Renderer ──────────────────────────────────────────────
// Kingdom-Rush-inspired procedural units, all drawn in code.
//
// Architecture (A-series art pass):
//   • every unit is drawn ONCE per (type, walk frame, facing, hurt state)
//     into a small offscreen sprite through SpriteBank, then only blitted
//     and transformed per frame;
//   • sprites are authored in a local space of "units" (1 unit ≈ one
//     design pixel for a size-8 enemy) and are NOT pre-flipped, so the
//     live pass can flip them for a lean/squash without mirroring the art;
//   • every body part is filled with `bodyGradient` (3 tones), stroked
//     with the shared dark `SHADOW_TINT` outline and kissed with `rimLight`
//     from the fixed upper-left sun in Lighting.ts;
//   • shadows come from `contactShadow` (grounded) / `castShadow` (flying).

import { ENEMIES } from '../data/enemies';
import { SHADOW_TINT } from './Palette';
import {
  bodyGradient,
  castShadow,
  contactShadow,
  mix,
  outline,
  rimLight,
} from './Lighting';
import { sprites, type SpriteDraw } from './SpriteBank';

export interface EnemyRenderData {
  id: number;
  dataId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  armor: number;
  magicResist: number;
  flying: boolean;
  color: string;
  size: number;
  hitFlash: number;
  slowed: number;
  alive: boolean;
  facingLeft?: boolean;
}

export interface SoldierRenderData {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  type: 'militia' | 'footman' | 'knight' | 'reinforcement';
  hitFlash?: number;
  facingLeft?: boolean;
}

// ─── Local-space art helpers ─────────────────────────────────────

/** Palette of one unit. Every entry is a `#rrggbb` colour. */
type Pal = Record<string, string>;

const WALK_FRAMES = 6;

/** Unit-space radius (x and y) of the largest silhouette, per dataId. */
const ART_BOX: Record<string, number> = {
  goblin: 22,
  wolf: 34,
  orc_warrior: 34,
  dark_shaman: 26,
  bat: 40,
  troll: 52,
  orc_warlord: 60,
};

/** Design pixels per unit-space pixel. */
const SPRITE_SCALE: Record<string, number> = {
  goblin: 2.6,
  wolf: 2.4,
  orc_warrior: 2.4,
  dark_shaman: 2.6,
  bat: 3.0,
  troll: 2.2,
  orc_warlord: 2.5,
};

/**
 * Unit-space offset added while baking so the artwork's contact point lands
 * on the bake centre. Without it a short unit would hover above its shadow.
 */
const BASE_OFFSET: Record<string, number> = {
  goblin: 8,
  wolf: 9,
  orc_warrior: 9,
  dark_shaman: 10,
  bat: 8,
  troll: 0,
  orc_warlord: 0,
};

const CACHE_MARGIN = 4;

/** Below this fraction of maxHp nothing but the plate armour is left. */
const ARMOR_UP = 0.45;

function dataIdOf(enemy: EnemyRenderData): string {
  return ENEMIES[enemy.dataId] ? enemy.dataId : 'goblin';
}

function boxOf(dataId: string): number {
  return ART_BOX[dataId] ?? 12;
}

function scaleOf(dataId: string): number {
  return SPRITE_SCALE[dataId] ?? 2.6;
}

/** Blend every colour of a palette towards white (hurt state). */
function flash(p: Pal, t = 0.78): Pal {
  const out: Pal = {};
  for (const key of Object.keys(p)) out[key] = mix(p[key], '#ffffff', t);
  return out;
}

function rgbaOf(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function shade(hex: string, t: number): string {
  return mix(hex, '#1a1226', t);
}

function tint(hex: string, t: number): string {
  return mix(hex, '#ffffff', t);
}

/** Build a path and both fill it and ring it with the shared outline. */
function ink(
  ctx: CanvasRenderingContext2D,
  path: () => void,
  style: string | CanvasGradient,
  line = 1.1,
): void {
  ctx.fillStyle = style;
  ctx.beginPath();
  path();
  ctx.fill();
  outline(ctx, path, SHADOW_TINT, line);
}

function circle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry = rx,
): void {
  ctx.moveTo(x + rx, y);
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

/** One straight body part (bone, limb, haft) with outline + rim light. */
function seg(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  color: string,
  opts: { line?: number; rim?: boolean } = {},
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.01) return;
  const ang = Math.atan2(dy, dx) - Math.PI / 2;
  const hw = width / 2;
  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(ang);
  const rr = Math.min(hw, len / 2);
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(hw, len);
    ctx.lineTo(hw, 0);
    ctx.quadraticCurveTo(hw, -rr, 0, -rr);
    ctx.quadraticCurveTo(-hw, -rr, -hw, 0);
    ctx.lineTo(-hw, len);
    ctx.quadraticCurveTo(-hw, len + rr, 0, len + rr);
    ctx.quadraticCurveTo(hw, len + rr, hw, len);
    ctx.closePath();
  };
  ctx.fillStyle = bodyGradient(ctx, 0, 0, len, color, 0.2, 0.3);
  path();
  ctx.fill();
  outline(ctx, path, SHADOW_TINT, opts.line ?? 1);
  if (opts.rim !== false) {
    rimLight(ctx, path, 0, len / 2, len * 0.7 + hw, 'rgba(255,247,209,0.5)', 1);
  }
  ctx.restore();
}

/** A blocky slab (kite shield, axe head, plank) with outline + rim. */
function slab(
  ctx: CanvasRenderingContext2D,
  pts: Array<[number, number]>,
  color: string,
  opts: { line?: number; light?: number; dark?: number; rim?: number } = {},
): void {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of pts) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  };
  ctx.fillStyle = bodyGradient(ctx, 0, minY, maxY, color, opts.light ?? 0.24, opts.dark ?? 0.28);
  path();
  ctx.fill();
  outline(ctx, path, SHADOW_TINT, opts.line ?? 1.1);
  if (opts.rim !== 0) rimLight(ctx, path, 0, (minY + maxY) / 2, (maxY - minY) * 0.8, 'rgba(255,247,209,0.55)', opts.rim ?? 1);
}

/** A horizontal metal band (belt, greave, armour trim). */
function band(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  slab(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], color, { line: 0.9 });
}

/** Cartoon eye: white, iris, dark pupil, specular dot. */
function eye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  iris: string,
  opts: { glow?: string; squint?: number } = {},
): void {
  if (opts.glow) {
    ctx.save();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
    g.addColorStop(0, rgbaOf(opts.glow, 0.55));
    g.addColorStop(1, rgbaOf(opts.glow, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const squint = opts.squint ?? 0;
  ink(ctx, () => circle(ctx, x, y, r, r * (1 - squint)), '#f8fafc', 0.7);
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(x + r * 0.16, y + r * 0.1, r * 0.58, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#140f1c';
  ctx.beginPath();
  ctx.arc(x + r * 0.2, y + r * 0.12, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.26, 0, Math.PI * 2);
  ctx.fill();
}

/** Angular fang / tooth pointing down at (x, y). */
function fang(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  flip = false,
): void {
  const s = flip ? -1 : 1;
  slab(ctx, [
    [x - w / 2, y],
    [x + w / 2, y],
    [x + s * w * 0.12, y + h],
  ], '#fdf6e3', { line: 0.6, light: 0.35, dark: 0.12, rim: 0 });
}

// ─── Goblin ──────────────────────────────────────────────────────
// Small, hunched, bandy-legged rascal with a jagged dagger.

function goblinPal(): Pal {
  return {
    skin: '#7cb342',
    skinDk: '#4c7a24',
    skinLt: '#a4d465',
    cloth: '#8c5a33',
    clothDk: '#5a3a20',
    belt: '#3b2617',
    steel: '#cdd5dd',
    wood: '#6b4423',
    eye: '#ffe14d',
  };
}

function drawGoblin(ctx: CanvasRenderingContext2D, frame: number, p: Pal, base: number): void {
  const ph = (frame / WALK_FRAMES) * Math.PI * 2;
  const bob = -Math.sin(ph) * 0.7;
  const step = Math.sin(ph) * 2.2;
  const lean = 0.04 + Math.sin(ph * 2) * 0.015;

  ctx.save();
  ctx.translate(0, base);
  ctx.translate(0, bob);
  ctx.rotate(lean);

  const hipY = 11;

  // Bandy legs, back pair darker.
  seg(ctx, -0.6, hipY, -3.4 + step, 19, 4, p.skinDk, { line: 0.9, rim: false });
  seg(ctx, 3.4, hipY, 1.4 - step, 19, 4.4, p.skin, { line: 0.9 });
  seg(ctx, -3.4 + step, 19.4, -2.2 + step, 21.2, 4.2, shade(p.clothDk, 0.2), { line: 0.7, rim: false });
  seg(ctx, 1.4 - step, 19.4, 3.2 - step, 21.2, 4.6, shade(p.clothDk, 0.1), { line: 0.7 });

  // Hunchbacked torso.
  ink(ctx, () => {
    ctx.moveTo(-7.4, 15.6);
    ctx.bezierCurveTo(-9.4, 6.4, -6.4, -3.6, -0.4, -4.2);
    ctx.bezierCurveTo(6.2, -3.4, 8.4, 6.2, 6.8, 15.4);
    ctx.bezierCurveTo(2.2, 18.6, -3.2, 18.4, -7.4, 15.6);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -4, 18, p.skin, 0.3, 0.3), 1.2);
  // Shoulder hump catches the sun.
  ink(ctx, () => circle(ctx, -3.2, -1.4, 5.2, 4.4), rgbaOf('#ffffff', 0.14), 0.7);

  // Waist rag + rope belt.
  slab(ctx, [[-7.6, 12.2], [7.2, 12.2], [6.2, 16.6], [-6.6, 16.6]], p.cloth, { line: 1 });
  band(ctx, -7.4, 11.2, 14.8, 2, p.belt);
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(-1.2, 11.1, 2.4, 2.4);

  // Dangling dagger arm (far).
  seg(ctx, -6, 1.6, -10.4 + step * 0.5, 8.4, 3.4, p.skinDk, { line: 0.9, rim: false });

  // Long pointed ears, swept back.
  slab(ctx, [[-5.2, -6.4], [-13.6, -12.4], [-6.6, -1.6]], p.skinDk, { line: 0.9, rim: 0.8 });
  slab(ctx, [[4.6, -6.6], [13.4, -13.2], [6.2, -2]], p.skin, { line: 0.9, rim: 0.9 });

  // Head: wide jaw, heavy brow.
  ink(ctx, () => {
    ctx.moveTo(-6.8, -4.6);
    ctx.bezierCurveTo(-7.6, -11.6, -2.2, -15.2, 0.6, -15.2);
    ctx.bezierCurveTo(4.6, -15.2, 8.2, -12.2, 8.4, -7);
    ctx.bezierCurveTo(8.6, -3.2, 6.4, -1.2, 4.4, -1.2);
    ctx.lineTo(-3.4, -1.4);
    ctx.bezierCurveTo(-5.6, -1.6, -6.6, -2.6, -6.8, -4.6);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -15, -1, p.skin, 0.28, 0.26), 1.2);
  // Brow ridge.
  ink(ctx, () => {
    ctx.moveTo(-6.4, -9.8);
    ctx.quadraticCurveTo(0.4, -13.2, 7.4, -9.4);
    ctx.lineTo(7.2, -8.4);
    ctx.quadraticCurveTo(0.4, -11.6, -6.2, -8.8);
    ctx.closePath();
  }, tint(p.skin, 0.3), 0.7);
  // Grimace + underbite.
  ink(ctx, () => {
    ctx.moveTo(-4.2, -3.6);
    ctx.quadraticCurveTo(0.6, -5.2, 5.6, -3.8);
    ctx.quadraticCurveTo(0.6, -1.8, -4.2, -3.6);
    ctx.closePath();
  }, '#2a1520', 0.7);
  fang(ctx, -2.6, -4.2, 1.6, 2.6, true);
  fang(ctx, 3.2, -4.4, 1.4, 2.2);

  // Beady glowing eyes.
  ctx.save();
  ctx.scale(-1, 1); // the goblin faces left in the canonical pose
  eye(ctx, -2.6, -7.4, 1.9, p.eye, { glow: '#ffe14d' });
  eye(ctx, 2.2, -7.6, 1.7, p.eye, { glow: '#ffe14d' });
  ctx.restore();

  // Near arm + jagged dagger.
  seg(ctx, 5.6, 1.2, 9.6 - step * 0.6, 7.6, 3.6, p.skin, { line: 0.9 });
  ctx.save();
  ctx.translate(9.6 - step * 0.6, 7.6);
  ctx.rotate(-0.22);
  band(ctx, -1.6, -1.6, 3.2, 3.2, p.wood);
  slab(ctx, [[0, -1.6], [8.6, -3.4], [10.2, -0.4], [3.2, 1.8]], p.steel, { line: 0.8, light: 0.4, dark: 0.2, rim: 0.8 });
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(1.6, -1.6, 5.6, 0.7);
  ctx.restore();

  ctx.restore();
}

// ─── Wolf Rider ──────────────────────────────────────────────────
// Grey dire wolf at full gallop with a goblin outrider on its back.

function wolfPal(): Pal {
  return {
    fur: '#8593a5',
    furDk: '#4e5a6b',
    furLt: '#b9c4d2',
    belly: '#cfd6de',
    saddle: '#5a3a20',
    gob: '#7cb342',
    gobDk: '#4c7a24',
    leather: '#7a4a25',
    eye: '#ffd166',
  };
}

function wolfLeg(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  swing: number,
  color: string,
  back: boolean,
): void {
  const kx = x + swing * 0.55;
  const ky = y + 9;
  const fx = kx + swing * 0.9;
  const fy = y + 19;
  seg(ctx, x, y, kx, ky, 4.4, color, { line: 0.9, rim: !back });
  seg(ctx, kx, ky, fx, fy, 3.4, shade(color, 0.08), { line: 0.8, rim: false });
  // Paw.
  ink(ctx, () => circle(ctx, fx + 0.8, fy + 0.6, 2.4, 1.7), shade(color, 0.3), 0.7);
}

function drawWolfRider(
  ctx: CanvasRenderingContext2D,
  frame: number,
  p: Pal,
  base: number,
): void {
  const ph = (frame / WALK_FRAMES) * Math.PI * 2;
  const gallop = -Math.sin(ph) * 1.8;
  const swing = Math.sin(ph) * 4.4;

  ctx.save();
  ctx.translate(0, base);
  ctx.translate(0, gallop);

  // Tail.
  ctx.save();
  ctx.translate(-14, -4);
  ctx.rotate(-0.5 + Math.sin(ph * 1.5) * 0.12);
  ink(ctx, () => {
    ctx.moveTo(0, 2.4);
    ctx.quadraticCurveTo(-8, 1.2, -13, -3.4);
    ctx.quadraticCurveTo(-8.6, -0.6, 0, -2.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -4, 3, p.furDk, 0.22, 0.3), 0.9);
  ctx.restore();

  // Far legs first.
  wolfLeg(ctx, -10, 2, swing, p.furDk, true);
  wolfLeg(ctx, 7, 2, -swing * 0.9, p.furDk, true);

  // Barrel chest.
  ink(ctx, () => {
    ctx.moveTo(-15, -3.6);
    ctx.bezierCurveTo(-9, -9.4, 6, -9.8, 13, -5.6);
    ctx.bezierCurveTo(16, -2.6, 15, 2.4, 11, 4.2);
    ctx.bezierCurveTo(2, 7.2, -10, 6.6, -14.4, 3.2);
    ctx.bezierCurveTo(-16, 1.6, -16, -1.8, -15, -3.6);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -10, 7, p.fur, 0.24, 0.3), 1.3);
  ink(ctx, () => {
    ctx.moveTo(-11, 4.6);
    ctx.quadraticCurveTo(0, 8.4, 12, 4.6);
    ctx.quadraticCurveTo(0, 6.4, -11, 4.6);
    ctx.closePath();
  }, rgbaOf(p.belly, 0.65), 0.6);

  // Near legs.
  wolfLeg(ctx, -8, 2, -swing, p.fur, false);
  wolfLeg(ctx, 9, 2, swing * 0.9, p.furLt, false);

  // Ruff of fur behind the head.
  ink(ctx, () => {
    ctx.moveTo(9, -8);
    ctx.quadraticCurveTo(2, -12.6, -4, -9);
    ctx.quadraticCurveTo(2, -8.4, 3, -4.4);
    ctx.quadraticCurveTo(7, -5.4, 9, -8);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -13, -3, p.furLt, 0.2, 0.28), 0.9);

  // Head + muzzle.
  ink(ctx, () => {
    ctx.moveTo(11, -8.4);
    ctx.bezierCurveTo(15, -9.2, 18, -7.6, 18.4, -4.4);
    ctx.lineTo(24.6, -3.4);
    ctx.lineTo(24.8, -0.2);
    ctx.lineTo(17.6, 0.6);
    ctx.bezierCurveTo(13.6, 1.2, 10.4, -1.4, 10.6, -4.6);
    ctx.bezierCurveTo(10.6, -6.8, 10.4, -8, 11, -8.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -9, 1, p.fur, 0.24, 0.26), 1.2);
  // Nose + jaw line.
  ink(ctx, () => circle(ctx, 24.2, -1.8, 1.5, 1.3), '#1b1520', 0.6);
  ctx.strokeStyle = 'rgba(20,15,28,0.8)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(17.4, 0.2);
  ctx.lineTo(24.2, -0.6);
  ctx.stroke();
  fang(ctx, 20.4, 0.4, 1.6, 2.2, true);
  fang(ctx, 22.6, 0.2, 1.5, 2);

  // Ears + golden eye.
  slab(ctx, [[12.2, -8.6], [13.4, -14.2], [16.4, -7.6]], p.furDk, { line: 0.9, rim: 0 });
  slab(ctx, [[15.4, -8.6], [18.6, -13.4], [18.6, -6.6]], p.fur, { line: 0.9, rim: 0.7 });
  eye(ctx, 17.4, -5.4, 1.8, p.eye, { glow: '#ffb703', squint: 0.25 });

  // Saddle blanket.
  slab(ctx, [[-5.2, -10], [3.6, -10.4], [4.8, -5.2], [-6, -4.8]], p.saddle, { line: 1 });
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(-5.4, -8.6, 9.4, 1);

  // Rider: torso, legs gripping the flanks.
  seg(ctx, -2.6, -6.6, -5.4, -1.4, 4, p.leather, { line: 0.9 });
  slab(ctx, [[-4.4, -18.4], [3.6, -18.6], [5.6, -8.4], [-5.4, -8]], p.leather, { line: 1.2 });
  band(ctx, -5.2, -12.6, 10.6, 2, '#3b2617');
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(-1.4, -12.8, 2.6, 2.4);
  // Rider arm holding the reins.
  seg(ctx, 4.6, -16.4, 10.4, -9.6, 3, p.leather, { line: 0.8 });
  // Rider head.
  ink(ctx, () => circle(ctx, 0.2, -21.6, 4.2, 4.4), bodyGradient(ctx, 0, -26, -17, p.gob, 0.3, 0.28), 1.1);
  slab(ctx, [[-3.2, -22.6], [-10.4, -27.6], [-3.6, -19]], p.gobDk, { line: 0.9, rim: 0 });
  slab(ctx, [[3.2, -23.4], [9.6, -28.4], [3.4, -19.6]], p.gob, { line: 0.9, rim: 0.7 });
  // War paint stripe.
  ctx.fillStyle = 'rgba(180,40,50,0.75)';
  ctx.fillRect(-4.2, -23.4, 8.4, 1.2);
  eye(ctx, 2.6, -22.6, 1.5, '#ef4444', { glow: '#ef4444' });

  // Raised scimitar.
  ctx.save();
  ctx.translate(9.6, -15.6);
  ctx.rotate(-0.55 + Math.sin(ph) * 0.08);
  band(ctx, -1.4, 1.2, 2.8, 4, p.saddle);
  ink(ctx, () => {
    ctx.moveTo(-1.2, 1.2);
    ctx.quadraticCurveTo(3.6, -6.4, 1.2, -13.4);
    ctx.quadraticCurveTo(6.4, -8.4, 3.2, 0.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -14, 2, '#e2e8f0', 0.35, 0.2), 0.9);
  ctx.restore();

  ctx.restore();
}

// ─── Orc Warrior ─────────────────────────────────────────────────
// Broad-shouldered brute in iron: horned helm, spike boss shield, cleaver.

function orcPal(): Pal {
  return {
    skin: '#6f9b3f',
    skinDk: '#456322',
    skinLt: '#93bd5c',
    iron: '#64707d',
    ironDk: '#3c4550',
    steel: '#9aa6b2',
    leather: '#8a5a2b',
    leatherDk: '#5b3a1a',
    brass: '#c9a227',
    eye: '#ff5a44',
  };
}

function drawOrcWarrior(
  ctx: CanvasRenderingContext2D,
  frame: number,
  p: Pal,
  base: number,
): void {
  const ph = (frame / WALK_FRAMES) * Math.PI * 2;
  const bob = -Math.abs(Math.sin(ph)) * 1.2;
  const step = Math.sin(ph) * 2.6;
  const sway = Math.sin(ph) * 0.03;

  ctx.save();
  ctx.translate(0, base);
  ctx.translate(0, bob);
  ctx.rotate(sway);

  // Boots and legs (thick, slightly bandy).
  seg(ctx, -5.6, 10, -7 + step, 21, 6.4, p.leatherDk, { line: 1, rim: false });
  seg(ctx, 5.2, 10, 6.6 - step, 21, 6.8, p.leather, { line: 1 });
  ink(ctx, () => {
    ctx.moveTo(-10.6 + step, 18.4);
    ctx.lineTo(-3.6 + step, 18.4);
    ctx.lineTo(-3.2 + step, 22.6);
    ctx.lineTo(-11 + step, 22.6);
    ctx.closePath();
  }, bodyGradient(ctx, 0, 18, 23, p.ironDk, 0.25, 0.3), 1);
  ink(ctx, () => {
    ctx.moveTo(3.2 - step, 18.4);
    ctx.lineTo(10.4 - step, 18.4);
    ctx.lineTo(10.8 - step, 22.6);
    ctx.lineTo(2.8 - step, 22.6);
    ctx.closePath();
  }, bodyGradient(ctx, 0, 18, 23, p.iron, 0.25, 0.3), 1);

  // Cleaver held low behind the body.
  ctx.save();
  ctx.translate(11, 6);
  ctx.rotate(0.34 - Math.sin(ph) * 0.06);
  band(ctx, -1.6, -6, 3.2, 13, p.leatherDk);
  slab(ctx, [[-1.8, -6.4], [6.4, -10.6], [11.4, -4.6], [7.2, 1.6], [-1.6, -1.2]], p.steel,
    { line: 1.1, light: 0.38, dark: 0.24, rim: 1 });
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(-0.4, -5.2, 9.4, 0.9);
  ctx.fillStyle = rgbaOf(p.eye, 0.55);
  ctx.fillRect(5.2, -3.4, 2.6, 1.4);
  ctx.restore();

  // Chest harness over a barrel torso.
  ink(ctx, () => {
    ctx.moveTo(-11.6, 11.6);
    ctx.bezierCurveTo(-13.6, 2.4, -10.4, -8.4, -0.6, -9.4);
    ctx.bezierCurveTo(9.4, -8.6, 12.6, 2.2, 11.2, 11.4);
    ctx.bezierCurveTo(4.4, 14.6, -4.8, 14.4, -11.6, 11.6);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -9, 14, p.skin, 0.28, 0.3), 1.3);
  // Pectoral shadow split.
  ctx.strokeStyle = rgbaOf(p.skinDk, 0.8);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -6.6);
  ctx.lineTo(0, 6.4);
  ctx.stroke();
  // Leather kilt + studded belt.
  slab(ctx, [[-11.4, 8.4], [11, 8.6], [9.6, 14.6], [-10, 14.4]], p.leather, { line: 1 });
  band(ctx, -11.8, 6, 23.6, 3, p.leatherDk);
  ink(ctx, () => circle(ctx, 0, 7.4, 2.8, 2.6), p.brass, 0.8);
  ink(ctx, () => circle(ctx, -7.4, 7.6, 1.5), p.steel, 0.6);
  ink(ctx, () => circle(ctx, 7.2, 7.6, 1.5), p.steel, 0.6);

  // Pauldrons with spikes.
  ink(ctx, () => {
    ctx.moveTo(-17.6, 0.6);
    ctx.bezierCurveTo(-18.4, -8.4, -10.4, -11.4, -6.4, -10.6);
    ctx.lineTo(-6.6, -1.4);
    ctx.bezierCurveTo(-11.6, -1.8, -15.4, -1.4, -17.6, 0.6);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -12, 2, p.iron, 0.26, 0.3), 1.1);
  slab(ctx, [[-16, -9.4], [-15.4, -16.4], [-12.4, -9.8]], p.steel, { line: 0.8, rim: 0 });
  ink(ctx, () => {
    ctx.moveTo(6.6, -10.6);
    ctx.bezierCurveTo(10.6, -11.6, 18.4, -8.6, 17.8, 0.4);
    ctx.bezierCurveTo(15.6, -1.6, 11.6, -2, 6.8, -1.6);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -12, 2, p.iron, 0.32, 0.26), 1.1);
  slab(ctx, [[8.6, -10], [12, -17], [15.4, -10.2]], p.steel, { line: 0.8, rim: 0.8 });

  // Head: heavy brow, tusked jaw.
  ink(ctx, () => {
    ctx.moveTo(-7, -10.4);
    ctx.bezierCurveTo(-7.6, -17.6, -2.4, -20.6, 0.4, -20.6);
    ctx.bezierCurveTo(4.2, -20.4, 7.8, -17.4, 7.6, -12);
    ctx.bezierCurveTo(7.4, -9.6, 6.2, -8.6, 4.6, -8.6);
    ctx.lineTo(-4, -8.8);
    ctx.bezierCurveTo(-6, -9, -6.8, -9.4, -7, -10.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -21, -8, p.skin, 0.26, 0.28), 1.2);
  // Helmet.
  ink(ctx, () => {
    ctx.moveTo(-8, -17.4);
    ctx.bezierCurveTo(-6.4, -23.6, 6.4, -23.8, 8, -17.4);
    ctx.lineTo(8, -16.4);
    ctx.lineTo(-8, -16.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -24, -16, p.iron, 0.3, 0.26), 1.2);
  band(ctx, -8.4, -17.6, 16.8, 2, p.ironDk);
  // Rivets.
  ctx.fillStyle = p.steel;
  for (let i = 0; i < 4; i++) ctx.fillRect(-6.4 + i * 4, -20.6, 1.4, 1.4);
  // Horns.
  ink(ctx, () => {
    ctx.moveTo(-7.4, -18.4);
    ctx.quadraticCurveTo(-15.4, -21.4, -17.4, -27.4);
    ctx.quadraticCurveTo(-12.4, -23.4, -5.6, -19.6);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -28, -18, '#efe6d2', 0.3, 0.3), 1);
  ink(ctx, () => {
    ctx.moveTo(7.4, -18.4);
    ctx.quadraticCurveTo(15.4, -21.6, 17.6, -27.6);
    ctx.quadraticCurveTo(12.4, -23.6, 5.6, -19.6);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -28, -18, '#f7f0dd', 0.34, 0.26), 1);
  // Fierce eyes + tusks + jaw shadow.
  eye(ctx, -3.4, -14.4, 2, p.eye, { glow: '#ff5a44', squint: 0.35 });
  eye(ctx, 2.8, -14.6, 2, p.eye, { glow: '#ff5a44', squint: 0.35 });
  ctx.fillStyle = rgbaOf('#2a1a22', 0.7);
  ctx.fillRect(-5.6, -12.2, 11, 1);
  fang(ctx, -3.6, -10.4, 2.6, 4, true);
  fang(ctx, 3.4, -10.4, 2.4, 3.6, true);

  // Round wooden shield with iron boss.
  ctx.save();
  ctx.translate(-13.4, 4.4);
  ctx.rotate(-0.08 + Math.sin(ph) * 0.04);
  ink(ctx, () => {
    ctx.moveTo(-8.6, -8.6);
    ctx.quadraticCurveTo(0, -10.4, 7.4, -8.4);
    ctx.quadraticCurveTo(9.4, 0, 6.6, 8.6);
    ctx.quadraticCurveTo(0, 11, -7.4, 8.4);
    ctx.quadraticCurveTo(-9.6, 0, -8.6, -8.6);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -10, 11, p.leather, 0.3, 0.32), 1.2);
  // Planks.
  ctx.strokeStyle = rgbaOf(p.leatherDk, 0.85);
  ctx.lineWidth = 0.7;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 4.4, -9.4);
    ctx.lineTo(i * 4.4, 9.4);
    ctx.stroke();
  }
  ink(ctx, () => circle(ctx, 0, 0, 4.4, 4.6), bodyGradient(ctx, 0, -5, 5, p.iron, 0.3, 0.3), 1);
  slab(ctx, [[-1, -1], [0, -5.4], [1.4, -0.6]], p.steel, { line: 0.6, rim: 0 });
  ctx.restore();

  // Near arm + grip on the cleaver.
  seg(ctx, 10.4, -4.6, 12.6, 4.4, 5, p.skin, { line: 1 });
  ink(ctx, () => circle(ctx, 12.8, 5.6, 2.8, 2.6), p.leatherDk, 0.8);

  ctx.restore();
}

// ─── Dark Shaman ─────────────────────────────────────────────────
// Hooded occultist in a purple robe with a skull staff and a floating orb.

function shamanPal(): Pal {
  return {
    robe: '#5b2d8e',
    robeDk: '#331a55',
    robeLt: '#7b46b8',
    trim: '#f0b429',
    bone: '#f2ecdc',
    wood: '#6b4a2a',
    cyan: '#3fe0e0',
  };
}

function drawDarkShaman(
  ctx: CanvasRenderingContext2D,
  frame: number,
  p: Pal,
  t: number,
  base: number,
): void {
  const ph = (frame / WALK_FRAMES) * Math.PI * 2;
  const bob = Math.sin(t * 2.2 + ph) * 1.4 - 1.2;

  ctx.save();
  ctx.translate(0, base);
  ctx.translate(0, bob + Math.sin(ph) * 0.5);

  // Robe: heavy cone with a ragged, waving hem.
  ink(ctx, () => {
    ctx.moveTo(-4.6, -15.4);
    ctx.bezierCurveTo(-9.6, -6, -13.4, 6, -14.6, 18.6);
    ctx.quadraticCurveTo(-8, 21.4 + Math.sin(t * 2) * 0.8, -3.4, 19.8);
    ctx.quadraticCurveTo(0.4, 21.6 + Math.sin(t * 2 + 1) * 0.9, 3.6, 19.6);
    ctx.quadraticCurveTo(8.4, 21.4, 14.6, 18.2);
    ctx.bezierCurveTo(13.4, 5.6, 9.6, -6.4, 4.6, -15.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -16, 20, p.robe, 0.28, 0.32), 1.3);
  // Folds.
  ctx.strokeStyle = rgbaOf(p.robeDk, 0.85);
  ctx.lineWidth = 0.9;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 4.4, -11);
    ctx.quadraticCurveTo(i * 7.6, 4, i * 9.4, 18.4);
    ctx.stroke();
  }
  // Gold hem + clasp.
  slab(ctx, [[-14.2, 15.4], [14.2, 15.2], [13.8, 18.6], [-13.6, 18.8]], p.trim, { line: 0.8, rim: 0.8 });
  ink(ctx, () => {
    ctx.moveTo(-6.6, -11.4);
    ctx.quadraticCurveTo(0, -14.4, 6.6, -11.6);
    ctx.quadraticCurveTo(0, -8.6, -6.6, -11.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -14, -8, p.trim, 0.3, 0.3), 0.9);
  ctx.fillStyle = rgbaOf(p.cyan, 0.9);
  ctx.beginPath();
  ctx.arc(0, -11.4, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Sleeves.
  seg(ctx, -4.4, -10.4, -9.6, 2.4, 4.6, p.robeDk, { line: 1, rim: false });
  seg(ctx, 4.4, -10.6, 9.8, 0.6, 4.8, p.robeLt, { line: 1 });

  // Cowl.
  ink(ctx, () => {
    ctx.moveTo(-7.6, -12.6);
    ctx.bezierCurveTo(-8.4, -21.4, -2.8, -25.4, 0.6, -25.4);
    ctx.bezierCurveTo(5.2, -25.4, 8.6, -21, 7.8, -12.6);
    ctx.quadraticCurveTo(0, -9.6, -7.6, -12.6);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -26, -10, p.robe, 0.26, 0.3), 1.3);
  // Face void.
  ink(ctx, () => {
    ctx.moveTo(-5, -14.6);
    ctx.bezierCurveTo(-5.4, -20, -1.6, -22.4, 0.6, -22.4);
    ctx.bezierCurveTo(3.6, -22.4, 5.8, -19.8, 5.2, -14.8);
    ctx.quadraticCurveTo(0, -12.4, -5, -14.6);
    ctx.closePath();
  }, '#191026', 0.9);
  // Arcane eyes.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(0, -18.4, 0, 0, -18.4, 9);
  glow.addColorStop(0, rgbaOf(p.cyan, 0.75));
  glow.addColorStop(1, rgbaOf(p.cyan, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(-9, -27.4, 18, 18);
  ctx.restore();
  eye(ctx, -2.6, -18.6, 1.7, p.cyan, { glow: '#3fe0e0' });
  eye(ctx, 2.4, -18.8, 1.7, p.cyan, { glow: '#3fe0e0' });

  // Skull staff: skull, horns, jewel, floating orb.
  seg(ctx, 11.4, -13.4, 12.8, 19.4, 3.2, p.wood, { line: 1 });
  ctx.save();
  ctx.translate(12.2, -14.4);
  ctx.rotate(-0.06);
  band(ctx, -1.4, -0.6, 2.8, 3.6, p.trim);
  ink(ctx, () => {
    ctx.moveTo(-4.6, -4.6);
    ctx.bezierCurveTo(-5.4, -9.4, 4.6, -9.6, 4.6, -4.6);
    ctx.lineTo(3.2, 0.6);
    ctx.lineTo(-3, 0.8);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -10, 1, p.bone, 0.3, 0.24), 1);
  ctx.fillStyle = '#241a30';
  ctx.beginPath();
  ctx.arc(-1.6, -4.6, 1.4, 0, Math.PI * 2);
  ctx.arc(1.8, -4.8, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgbaOf(p.cyan, 0.95);
  ctx.beginPath();
  ctx.arc(-1.6, -4.6, 0.7, 0, Math.PI * 2);
  ctx.arc(1.8, -4.8, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgbaOf('#2a1f38', 0.9);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-3.4, -1);
  ctx.lineTo(3.4, -1.2);
  ctx.stroke();
  // Horns.
  ink(ctx, () => {
    ctx.moveTo(-4.2, -6.4);
    ctx.quadraticCurveTo(-9, -8.6, -9.6, -12.4);
    ctx.quadraticCurveTo(-6.4, -9.6, -3.2, -8.2);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -13, -6, p.bone, 0.3, 0.3), 0.8);
  ink(ctx, () => {
    ctx.moveTo(4.2, -6.6);
    ctx.quadraticCurveTo(9, -8.8, 9.8, -12.6);
    ctx.quadraticCurveTo(6.4, -9.8, 3.2, -8.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -13, -6, '#ffffff', 0.34, 0.26), 0.8);
  ctx.restore();

  // Floating orb above the skull, bobbing on its own phase.
  const orbY = -27 - Math.sin(t * 2.6) * 1.6;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const halo = ctx.createRadialGradient(12.4, orbY, 0, 12.4, orbY, 11);
  halo.addColorStop(0, rgbaOf(p.cyan, 0.6));
  halo.addColorStop(0.5, rgbaOf(p.cyan, 0.22));
  halo.addColorStop(1, rgbaOf(p.cyan, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(1, orbY - 11, 23, 22);
  ctx.restore();
  ink(ctx, () => circle(ctx, 12.4, orbY, 3.2, 3.4), bodyGradient(ctx, 0, orbY - 4, orbY + 4, p.cyan, 0.4, 0.25), 0.8);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(11.4, orbY - 1.2, 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ─── Giant Bat ───────────────────────────────────────────────────
// Leathery wings snapped wide, fangs bared, glowing red eyes.

function batPal(): Pal {
  return {
    body: '#4a4460',
    bodyDk: '#2c2740',
    bodyLt: '#6c6489',
    membrane: '#3a3350',
    membraneLt: '#5d5478',
    bone: '#8d84a8',
    eye: '#ff3b3b',
  };
}

function batWing(
  ctx: CanvasRenderingContext2D,
  side: number,
  flap: number,
  p: Pal,
): void {
  ctx.save();
  ctx.translate(1.4 * side, -1.4);
  ctx.scale(side, 1);
  ctx.rotate(flap * 0.85);
  // Membrane.
  ink(ctx, () => {
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(-7, -6.4, -15.6, -3.2);
    ctx.quadraticCurveTo(-12.6, 1.6, -13.4, 4.4);
    ctx.quadraticCurveTo(-9.6, 2.6, -9, 6.2);
    ctx.quadraticCurveTo(-5.4, 3.4, -4.6, 6.6);
    ctx.quadraticCurveTo(-1.6, 4.4, 0, 5.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -7, 7, p.membrane, 0.24, 0.3), 1);
  // Finger bones.
  ctx.strokeStyle = rgbaOf(p.bone, 0.55);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-1, -1.4);
  ctx.lineTo(-15, -3.4);
  ctx.moveTo(-1, -0.6);
  ctx.lineTo(-13.6, 3.6);
  ctx.moveTo(-1, 0.4);
  ctx.lineTo(-9.4, 6);
  ctx.stroke();
  ctx.restore();
}

function drawBat(
  ctx: CanvasRenderingContext2D,
  frame: number,
  p: Pal,
  t: number,
  base: number,
): void {
  const ph = (frame / WALK_FRAMES) * Math.PI * 2;
  const flap = Math.sin(ph) * 0.55;
  const bob = -Math.cos(ph) * 2.4 + Math.sin(t * 3) * 0.5;

  ctx.save();
  ctx.translate(0, base);
  ctx.translate(0, bob + 2);

  // Far wing slightly behind + darker.
  batWing(ctx, -1, flap, { ...p, membrane: p.bodyDk, membraneLt: p.membrane });

  // Tail membrane between the legs.
  ink(ctx, () => {
    ctx.moveTo(-3.6, 6.4);
    ctx.quadraticCurveTo(0, 13.6, 3.6, 6.4);
    ctx.quadraticCurveTo(0, 8.6, -3.6, 6.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, 6, 13, p.bodyDk, 0.2, 0.3), 0.9);

  // Fuzzy pear-shaped body.
  ink(ctx, () => {
    ctx.moveTo(-5.4, -6.6);
    ctx.bezierCurveTo(-8.4, -1, -6.6, 8.6, -2, 11.2);
    ctx.bezierCurveTo(1, 12.8, 5.4, 10.4, 6, 4.6);
    ctx.bezierCurveTo(6.6, -1.6, 5.4, -7, 2.4, -8.4);
    ctx.bezierCurveTo(0, -9.4, -3.6, -9, -5.4, -6.6);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -9, 12, p.body, 0.26, 0.3), 1.2);
  // Chest fur.
  ink(ctx, () => {
    ctx.moveTo(-3, -2.4);
    ctx.quadraticCurveTo(0, 9.2, 3.4, -2.6);
    ctx.quadraticCurveTo(0, -4.4, -3, -2.4);
    ctx.closePath();
  }, rgbaOf(p.bodyLt, 0.75), 0.7);
  // Ribs.
  ctx.strokeStyle = rgbaOf(p.bodyDk, 0.7);
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.moveTo(-4.4, 1.4 + i * 3);
    ctx.quadraticCurveTo(0, 2.8 + i * 3, 4.6, 1 + i * 3);
    ctx.stroke();
  }

  // Head with a blunt muzzle.
  ink(ctx, () => circle(ctx, 0, -11.4, 5.4, 5), bodyGradient(ctx, 0, -17, -6, p.bodyLt, 0.26, 0.28), 1.1);
  ink(ctx, () => {
    ctx.moveTo(-3.4, -9.6);
    ctx.quadraticCurveTo(0, -6.4, 3.4, -9.8);
    ctx.quadraticCurveTo(0, -12.2, -3.4, -9.6);
    ctx.closePath();
  }, rgbaOf(p.bodyDk, 0.9), 0.6);
  // Ears.
  slab(ctx, [[-4, -14.6], [-8.4, -22.6], [-0.8, -16.6]], p.bodyDk, { line: 0.9, rim: 0 });
  slab(ctx, [[4.2, -14.8], [8.8, -22.4], [1, -16.6]], p.bodyLt, { line: 0.9, rim: 0.8 });
  ctx.fillStyle = rgbaOf('#f0a8c0', 0.5);
  slab(ctx, [[-3.6, -15.6], [-6.4, -20.4], [-1.8, -16.6]], '#e8a0b8', { line: 0.5, rim: 0 });
  // Eyes + fangs.
  eye(ctx, -2.4, -12.6, 1.9, p.eye, { glow: '#ff3b3b' });
  eye(ctx, 2.4, -12.8, 1.9, p.eye, { glow: '#ff3b3b' });
  fang(ctx, -1.8, -7.4, 1.7, 2.8, true);
  fang(ctx, 1.8, -7.6, 1.7, 2.8, true);

  // Near wing, plus its claw hook.
  batWing(ctx, 1, flap, p);
  ctx.save();
  ctx.translate(1.4, -1.4);
  ctx.rotate(flap * 0.85);
  ctx.fillStyle = p.bodyDk;
  ctx.beginPath();
  ctx.arc(0.4, -2.2, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

// ─── Troll ───────────────────────────────────────────────────────
// Mossy colossus, hunched, dragging a spiked tree-trunk club.

function trollPal(): Pal {
  return {
    skin: '#5c8a3a',
    skinDk: '#37561f',
    skinLt: '#87b657',
    moss: '#8fc23f',
    hide: '#5a3a20',
    wood: '#6b4a2a',
    woodDk: '#412a16',
    iron: '#7b8794',
    bone: '#f4ecd8',
    eye: '#ffd23f',
  };
}

function drawTroll(ctx: CanvasRenderingContext2D, frame: number, p: Pal): void {
  const ph = (frame / WALK_FRAMES) * Math.PI * 2;
  const bob = -Math.abs(Math.sin(ph)) * 1.6;
  const step = Math.sin(ph) * 3.6;
  const sway = Math.sin(ph) * 2;

  ctx.save();
  ctx.translate(sway * 0.5, bob);
  ctx.rotate(0.02 + Math.sin(ph * 2) * 0.012);

  // Legs: short, thick, splayed.
  seg(ctx, -6.4, 12, -9.4 + step, 30, 6.2, p.skinDk, { line: 1, rim: false });
  seg(ctx, 6.6, 12, 9 - step, 30, 6.6, p.skin, { line: 1 });
  // Feet.
  ink(ctx, () => {
    ctx.moveTo(-14.4 + step, 28.4);
    ctx.quadraticCurveTo(-3.6 + step, 26.6, -2.6 + step, 31.6);
    ctx.quadraticCurveTo(-8 + step, 33.6, -15 + step, 32);
    ctx.closePath();
  }, bodyGradient(ctx, 0, 26, 34, p.skinDk, 0.24, 0.3), 1);
  ink(ctx, () => {
    ctx.moveTo(2.6 - step, 31.6);
    ctx.quadraticCurveTo(3.4 - step, 26.4, 14.6 - step, 28.6);
    ctx.quadraticCurveTo(15.4 - step, 32.4, 8 - step, 33.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, 26, 34, p.skin, 0.3, 0.28), 1);
  // Toenails.
  ctx.fillStyle = p.bone;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(-13.4 + step + i * 3.4, 30.6, 1.8, 1.6);
    ctx.fillRect(5.4 - step + i * 3.2, 31.4, 1.8, 1.6);
  }

  // Gnarled club resting back over the shoulder.
  ctx.save();
  ctx.translate(15.6, 4.6);
  ctx.rotate(0.42);
  ink(ctx, () => {
    ctx.moveTo(-3.4, 14);
    ctx.lineTo(-4.6, -22);
    ctx.lineTo(4.2, -24.4);
    ctx.lineTo(6.4, 13.6);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -25, 15, p.wood, 0.24, 0.32), 1.2);
  ctx.fillStyle = rgbaOf(p.woodDk, 0.85);
  ctx.fillRect(-4.6, -14, 11, 1.8);
  ctx.fillRect(-4.6, -4, 11, 1.8);
  ctx.fillRect(-4.8, 5, 11.4, 1.8);
  // Iron studs + a cracked skull tied to the log.
  ctx.fillStyle = p.iron;
  ctx.fillRect(-6.6, -18, 2.4, 2.4);
  ctx.fillRect(5.4, -12, 2.4, 2.4);
  ctx.fillRect(-6.6, -1, 2.4, 2.4);
  ctx.restore();

  // Far arm hanging low.
  seg(ctx, -11, -10, -17.4, 8.4, 6, p.skinDk, { line: 1, rim: false });
  ink(ctx, () => circle(ctx, -18, 10.4, 3.6, 3.2), shade(p.skinDk, 0.15), 1);

  // Belly: huge, with skin folds.
  ink(ctx, () => {
    ctx.moveTo(-14.6, 12.4);
    ctx.bezierCurveTo(-18.6, -2, -13.6, -17.4, -0.6, -18.6);
    ctx.bezierCurveTo(13.4, -17.6, 18.6, -1.6, 15.4, 12.6);
    ctx.bezierCurveTo(6, 17.6, -6.4, 17.4, -14.6, 12.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -19, 18, p.skin, 0.28, 0.32), 1.4);
  // Pale belly patch + folds.
  ink(ctx, () => {
    ctx.moveTo(-8, 6);
    ctx.bezierCurveTo(-6, -6, 6, -6, 8.6, 5.6);
    ctx.bezierCurveTo(4, 12, -4, 12, -8, 6);
    ctx.closePath();
  }, rgbaOf(tint(p.skin, 0.34), 0.55), 0.8);
  ctx.strokeStyle = rgbaOf(p.skinDk, 0.55);
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-7.4, 1.6 + i * 3.4);
    ctx.quadraticCurveTo(0, 3.6 + i * 3.4, 7.4, 1.2 + i * 3.4);
    ctx.stroke();
  }
  // Moss and lichen.
  ink(ctx, () => {
    ctx.moveTo(-13, -8.4);
    ctx.quadraticCurveTo(-4, -17.6, 8.4, -13.6);
    ctx.quadraticCurveTo(1, -9.6, -4.4, -5.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -18, -4, p.moss, 0.28, 0.3), 0.9);
  ink(ctx, () => circle(ctx, -9.6, -3.4, 3.4, 2.4), rgbaOf(p.moss, 0.8), 0.7);
  ink(ctx, () => circle(ctx, 9.4, 3.4, 2.6, 1.8), rgbaOf(p.moss, 0.7), 0.6);

  // Loincloth.
  slab(ctx, [[-15.4, 9.4], [15, 9.8], [13.4, 15.8], [-13.6, 15.4]], p.hide, { line: 1.1 });
  band(ctx, -15.6, 7.4, 31.2, 2.6, shade(p.hide, 0.3));
  ctx.fillStyle = p.iron;
  ctx.fillRect(-1.6, 7.2, 3.4, 3);

  // Low-slung head sunk into the shoulders.
  ink(ctx, () => {
    ctx.moveTo(-10.6, -20.6);
    ctx.bezierCurveTo(-12, -30.4, -4.6, -36.4, 1, -36.4);
    ctx.bezierCurveTo(7.6, -36.4, 12.4, -31, 11.6, -24.4);
    ctx.bezierCurveTo(11, -19.6, 9, -17.4, 6.6, -17.6);
    ctx.lineTo(-6.4, -17.8);
    ctx.bezierCurveTo(-9.4, -18, -10.2, -19, -10.6, -20.6);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -37, -17, p.skin, 0.26, 0.3), 1.3);
  // Brow, nose, jaw.
  ink(ctx, () => {
    ctx.moveTo(-10.4, -29.4);
    ctx.quadraticCurveTo(0.4, -34.6, 11.4, -28.6);
    ctx.quadraticCurveTo(0.4, -30.6, -10, -27.6);
    ctx.closePath();
  }, tint(p.skin, 0.26), 0.8);
  ink(ctx, () => {
    ctx.moveTo(-3.4, -27.4);
    ctx.quadraticCurveTo(1.6, -24.6, 4.6, -27.8);
    ctx.quadraticCurveTo(1, -29.4, -3.4, -27.4);
    ctx.closePath();
  }, shade(p.skin, 0.3), 0.7);
  // Warty bumps.
  ctx.fillStyle = rgbaOf(p.skinDk, 0.8);
  ctx.beginPath();
  ctx.arc(-7.6, -24.6, 1.5, 0, Math.PI * 2);
  ctx.arc(8.4, -22.4, 1.3, 0, Math.PI * 2);
  ctx.arc(-4.6, -33.4, 1.2, 0, Math.PI * 2);
  ctx.fill();
  // Tusks + teeth.
  fang(ctx, -6.6, -22.4, 3.4, 6.4, true);
  fang(ctx, 6.2, -22.6, 3.2, 5.8, true);
  ctx.fillStyle = '#f4ecd8';
  ctx.fillRect(-4.6, -24.4, 2, 1.6);
  ctx.fillRect(2.6, -24.6, 2, 1.6);
  // Deep-set glowing eyes under a heavy brow.
  eye(ctx, -4.6, -27.8, 2.1, p.eye, { glow: '#ffd23f', squint: 0.2 });
  eye(ctx, 5, -28, 2.1, p.eye, { glow: '#ffd23f', squint: 0.2 });
  // Scars.
  ctx.strokeStyle = rgbaOf('#2c3a1a', 0.9);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(7.4, -34.4);
  ctx.lineTo(10.4, -25.4);
  ctx.moveTo(-8.6, -33);
  ctx.lineTo(-5.6, -30.6);
  ctx.stroke();

  // Near arm reaching down to the club.
  seg(ctx, 13.4, -12.6, 16.6, 4.6, 6.8, p.skin, { line: 1.1 });
  ink(ctx, () => circle(ctx, 16.8, 6.4, 4, 3.6), tint(p.skin, 0.12), 1);
  ctx.strokeStyle = rgbaOf(p.skinDk, 0.7);
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.moveTo(14.4, 2 + i * 2.4);
    ctx.lineTo(18.6, 2.4 + i * 2.4);
    ctx.stroke();
  }

  ctx.restore();
}

// ─── Orc Warlord (BOSS) ──────────────────────────────────────────
// Red-and-black juggernaut: crown, spiked pauldrons, twin-bladed axe, cape.

function warlordPal(): Pal {
  return {
    plate: '#39323c',
    plateDk: '#1d1922',
    plateLt: '#5b5266',
    red: '#b8232c',
    redDk: '#7c141c',
    gold: '#e8c04a',
    goldDk: '#a8801d',
    skin: '#6b9440',
    skinDk: '#3f5c22',
    steel: '#c3ccd6',
    cape: '#a01722',
    capeDk: '#6a0d16',
    eye: '#ff4b3a',
  };
}

function drawWarlord(
  ctx: CanvasRenderingContext2D,
  frame: number,
  p: Pal,
  t: number,
): void {
  const ph = (frame / WALK_FRAMES) * Math.PI * 2;
  const bob = -Math.abs(Math.sin(ph)) * 1.8;
  const step = Math.sin(ph) * 4.2;
  const sway = Math.sin(ph) * 0.028;

  ctx.save();
  ctx.translate(0, bob);
  ctx.rotate(sway);

  // Cape: windswept, behind everything.
  ctx.save();
  ctx.translate(-3, -14);
  ctx.rotate(Math.sin(t * 1.6) * 0.05);
  ink(ctx, () => {
    ctx.moveTo(10, 0);
    ctx.bezierCurveTo(4, 10, -6, 20, -18, 26);
    ctx.quadraticCurveTo(-10, 28.4, -2, 27.4);
    ctx.quadraticCurveTo(2, 32, 8, 30.4);
    ctx.quadraticCurveTo(14, 33, 19, 30);
    ctx.bezierCurveTo(21, 18, 20, 7, 19, 0);
    ctx.closePath();
  }, bodyGradient(ctx, 0, 0, 32, p.cape, 0.24, 0.32), 1.3);
  ctx.strokeStyle = rgbaOf(p.capeDk, 0.9);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(4, 4);
  ctx.quadraticCurveTo(-2, 16, -12, 24);
  ctx.moveTo(12, 4);
  ctx.quadraticCurveTo(10, 18, 2, 27);
  ctx.stroke();
  ctx.fillStyle = p.gold;
  ctx.beginPath();
  ctx.arc(12, 2, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Sabatons and greaves.
  seg(ctx, -7, 12, -10 + step, 28, 7.4, p.plateDk, { line: 1.1, rim: false });
  seg(ctx, 7, 12, 9.6 - step, 28, 7.8, p.plate, { line: 1.1 });
  ink(ctx, () => {
    ctx.moveTo(-16 + step, 25.6);
    ctx.lineTo(-4.6 + step, 25.6);
    ctx.lineTo(-3.6 + step, 31.4);
    ctx.lineTo(-16.6 + step, 31.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, 25, 32, p.plateLt, 0.24, 0.3), 1.2);
  ink(ctx, () => {
    ctx.moveTo(4.2 - step, 25.6);
    ctx.lineTo(15.4 - step, 25.6);
    ctx.lineTo(16.4 - step, 31.4);
    ctx.lineTo(3.4 - step, 31.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, 25, 32, p.plate, 0.3, 0.26), 1.2);
  band(ctx, -16.4 + step, 29.4, 13.4, 2, p.red);
  band(ctx, 3 + step * -1, 29.4, 13.6, 2, p.red);
  // Knee spikes.
  slab(ctx, [[-11 + step, 22], [-9 + step, 16.4], [-6.6 + step, 22.4]], p.steel, { line: 0.8, rim: 0 });
  slab(ctx, [[6.4 - step, 22.4], [9.4 - step, 16.8], [11.6 - step, 22.6]], p.steel, { line: 0.8, rim: 0.7 });

  // Twin-bladed axe held out behind.
  ctx.save();
  ctx.translate(19.6, 0);
  ctx.rotate(0.2 - Math.sin(ph) * 0.05);
  seg(ctx, 0, 14, 0, -24, 4.2, '#4a3220', { line: 1.1 });
  slab(ctx, [[-1.6, -24], [12.6, -30], [14.6, -17.6], [-1.6, -19.4]], p.steel,
    { line: 1.2, light: 0.36, dark: 0.26, rim: 1 });
  slab(ctx, [[1.6, -24], [-11.4, -30.4], [-13.4, -18], [1.6, -19.6]], p.steel,
    { line: 1.2, light: 0.3, dark: 0.3, rim: 0.9 });
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(2, -25.4, 10, 1);
  ctx.fillRect(-11.6, -25.6, 9, 1);
  // Blood runes.
  ctx.fillStyle = p.red;
  ctx.fillRect(6.4, -22.6, 1.8, 1.8);
  ctx.fillRect(-8, -22.8, 1.8, 1.8);
  ctx.restore();

  // Cuirass.
  ink(ctx, () => {
    ctx.moveTo(-14.6, 13.4);
    ctx.bezierCurveTo(-17.6, 2, -13.6, -11.4, -0.6, -12.6);
    ctx.bezierCurveTo(12.6, -11.6, 16.6, 1.6, 14.4, 13.2);
    ctx.bezierCurveTo(5.4, 17, -5.6, 16.8, -14.6, 13.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -13, 17, p.plate, 0.26, 0.32), 1.4);
  // Red chevrons + gold filigree.
  ink(ctx, () => {
    ctx.moveTo(-11.6, 10.4);
    ctx.lineTo(-6, -8.6);
    ctx.lineTo(-3, -8.6);
    ctx.lineTo(-8.6, 10.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -9, 11, p.red, 0.3, 0.3), 0.9);
  ink(ctx, () => {
    ctx.moveTo(11.4, 10.6);
    ctx.lineTo(5.8, -8.4);
    ctx.lineTo(3, -8.4);
    ctx.lineTo(8.6, 10.6);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -9, 11, p.redDk, 0.3, 0.3), 0.9);
  band(ctx, -14.8, 4.6, 29.4, 2.4, p.gold);
  band(ctx, -15.2, 10.4, 30.2, 4.6, p.plateDk);
  ink(ctx, () => circle(ctx, 0, 12.6, 3.4, 3), p.gold, 1);
  ctx.fillStyle = p.plateDk;
  ctx.beginPath();
  ctx.arc(-1, 12.8, 0.9, 0, Math.PI * 2);
  ctx.arc(1.2, 13, 0.9, 0, Math.PI * 2);
  ctx.fill();

  // Colossal spiked pauldrons.
  ink(ctx, () => {
    ctx.moveTo(-21.4, 1.4);
    ctx.bezierCurveTo(-22.6, -10.4, -12.6, -14.6, -7.4, -13.4);
    ctx.lineTo(-7.6, -1.4);
    ctx.bezierCurveTo(-14, -2, -18.6, -1.4, -21.4, 1.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -15, 2, p.plateLt, 0.24, 0.3), 1.2);
  ink(ctx, () => {
    ctx.moveTo(7.6, -13.4);
    ctx.bezierCurveTo(12.8, -14.6, 22.6, -10.4, 21.4, 1.4);
    ctx.bezierCurveTo(18.6, -1.4, 14, -2, 7.8, -1.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -15, 2, p.plate, 0.3, 0.26), 1.2);
  for (let i = 0; i < 3; i++) {
    slab(ctx, [
      [-19.6 + i * 4.4, -12.4],
      [-18.2 + i * 4.4, -19.6 - (i === 1 ? 1.6 : 0)],
      [-15.8 + i * 4.4, -12.6],
    ], p.steel, { line: 0.8, rim: 0 });
    slab(ctx, [
      [12.6 + i * 4.4, -12.6],
      [14 + i * 4.4, -19.8 - (i === 1 ? 1.6 : 0)],
      [16.4 + i * 4.4, -12.4],
    ], p.steel, { line: 0.8, rim: i === 2 ? 0.7 : 0 });
  }
  // Red trim on the pauldron rims.
  ctx.strokeStyle = rgbaOf(p.red, 0.95);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-21, 0.6);
  ctx.quadraticCurveTo(-20, -12.4, -7.8, -12.6);
  ctx.moveTo(21, 0.6);
  ctx.quadraticCurveTo(20, -12.4, 7.8, -12.6);
  ctx.stroke();

  // Neck guard.
  ink(ctx, () => {
    ctx.moveTo(-7.6, -13.4);
    ctx.quadraticCurveTo(0, -17.4, 7.6, -13.4);
    ctx.quadraticCurveTo(0, -10.4, -7.6, -13.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -18, -10, p.plateDk, 0.24, 0.3), 1);

  // Helm: black plate, red visor band, crown of teeth.
  ink(ctx, () => {
    ctx.moveTo(-9.6, -20.6);
    ctx.bezierCurveTo(-11, -31.4, -4.4, -37.4, 0.8, -37.4);
    ctx.bezierCurveTo(6.4, -37.4, 11.6, -31.6, 10.8, -23.4);
    ctx.bezierCurveTo(10.4, -19.6, 8.6, -18.4, 6.4, -18.4);
    ctx.lineTo(-6.6, -18.6);
    ctx.bezierCurveTo(-8.8, -18.6, -9.4, -19.4, -9.6, -20.6);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -38, -18, p.plateLt, 0.24, 0.3), 1.3);
  band(ctx, -9.8, -27.4, 19.6, 3.4, p.redDk);
  band(ctx, -9, -31.4, 18, 1.8, p.plateDk);
  // Crown.
  for (let i = 0; i < 5; i++) {
    const cx1 = -10 + i * 5;
    slab(ctx, [[cx1, -36.4], [cx1 + 2, -45 - (i % 2 === 0 ? 2 : 0)], [cx1 + 4.2, -36.4]], p.gold,
      { line: 0.8, light: 0.34, dark: 0.24, rim: 0 });
  }
  band(ctx, -10.4, -37.4, 20.8, 2.6, p.gold);
  ctx.fillStyle = p.red;
  for (let i = 0; i < 4; i++) ctx.fillRect(-8 + i * 5, -37, 1.4, 1.8);
  // Curved horns sweeping up.
  ink(ctx, () => {
    ctx.moveTo(-8.6, -25.4);
    ctx.bezierCurveTo(-17, -27.4, -21.6, -34.4, -20.6, -43.4);
    ctx.bezierCurveTo(-17.6, -35.4, -12.6, -30.4, -6.6, -28.4);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -44, -24, '#e9dfc9', 0.3, 0.3), 1.1);
  ink(ctx, () => {
    ctx.moveTo(8.6, -25.6);
    ctx.bezierCurveTo(17, -27.6, 21.6, -34.6, 20.8, -43.6);
    ctx.bezierCurveTo(17.6, -35.6, 12.6, -30.6, 6.6, -28.6);
    ctx.closePath();
  }, bodyGradient(ctx, 0, -44, -24, '#f6efdd', 0.34, 0.26), 1.1);
  // Burning eyes through the visor.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const eyeGlow = ctx.createRadialGradient(0, -22.6, 0, 0, -22.6, 13);
  eyeGlow.addColorStop(0, rgbaOf(p.eye, 0.6));
  eyeGlow.addColorStop(1, rgbaOf(p.eye, 0));
  ctx.fillStyle = eyeGlow;
  ctx.fillRect(-13, -35, 26, 26);
  ctx.restore();
  eye(ctx, -4, -22.8, 2.3, p.eye, { glow: '#ff4b3a', squint: 0.4 });
  eye(ctx, 4.6, -23, 2.3, p.eye, { glow: '#ff4b3a', squint: 0.4 });
  ctx.fillStyle = rgbaOf('#151018', 0.85);
  ctx.fillRect(-7.6, -20.2, 15.4, 1.4);

  // Near arm and gauntlet gripping the axe haft.
  seg(ctx, 14, -8.6, 19, 4.6, 6.4, p.plateLt, { line: 1.2 });
  ink(ctx, () => circle(ctx, 19.4, 7, 3.8, 3.4), bodyGradient(ctx, 0, 3, 11, p.plate, 0.3, 0.3), 1.1);

  // Hellfire aura at the feet.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const aura = ctx.createRadialGradient(0, 29, 1, 0, 29, 26);
  aura.addColorStop(0, rgbaOf('#ff3b1f', 0.34 + Math.sin(t * 3) * 0.06));
  aura.addColorStop(0.6, rgbaOf('#ff3b1f', 0.12));
  aura.addColorStop(1, rgbaOf('#ff3b1f', 0));
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.ellipse(0, 29, 26, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

// ─── Generic fallback ────────────────────────────────────────────

function drawGeneric(
  ctx: CanvasRenderingContext2D,
  frame: number,
  color: string,
  size: number,
  base: number,
): void {
  const ph = (frame / WALK_FRAMES) * Math.PI * 2;
  const bob = -Math.abs(Math.sin(ph)) * size * 0.08;
  const step = Math.sin(ph) * size * 0.3;
  ctx.save();
  ctx.translate(0, base);
  ctx.translate(0, bob);
  seg(ctx, -size * 0.3, size * 0.4, -size * 0.4 + step, size, size * 0.34, shade(color, 0.3), { line: 0.9, rim: false });
  seg(ctx, size * 0.3, size * 0.4, size * 0.4 - step, size, size * 0.34, color, { line: 0.9 });
  ink(ctx, () => circle(ctx, 0, 0, size * 0.72, size * 0.8), bodyGradient(ctx, 0, -size, size, color, 0.26, 0.3), 1.2);
  eye(ctx, -size * 0.26, -size * 0.18, size * 0.2, '#ffd23f', { glow: '#ffd23f' });
  eye(ctx, size * 0.26, -size * 0.18, size * 0.2, '#ffd23f', { glow: '#ffd23f' });
  ctx.restore();
}

// ─── Sprite factory ──────────────────────────────────────────────

function makeDraw(dataId: string, frame: number, isHit: boolean): SpriteDraw {
  const base = BASE_OFFSET[dataId] ?? 0;
  return (ctx) => {
    switch (dataId) {
      case 'goblin':
        drawGoblin(ctx, frame, isHit ? flash(goblinPal()) : goblinPal(), base);
        break;
      case 'wolf':
        drawWolfRider(ctx, frame, isHit ? flash(wolfPal()) : wolfPal(), base);
        break;
      case 'orc_warrior':
        drawOrcWarrior(ctx, frame, isHit ? flash(orcPal()) : orcPal(), base);
        break;
      case 'dark_shaman':
        drawDarkShaman(ctx, frame, isHit ? flash(shamanPal()) : shamanPal(), frame * 0.42, base);
        break;
      case 'bat':
        drawBat(ctx, frame, isHit ? flash(batPal()) : batPal(), frame * 0.31, base);
        break;
      case 'troll':
        drawTroll(ctx, frame, isHit ? flash(trollPal()) : trollPal());
        break;
      case 'orc_warlord':
        drawWarlord(ctx, frame, isHit ? flash(warlordPal()) : warlordPal(), frame * 0.37);
        break;
      default:
        drawGeneric(ctx, frame, isHit ? mix('#7fbf3f', '#ffffff', 0.8) : '#7fbf3f', 11, base);
    }
  };
}

/** Sprite bake size in device pixels for a dataId. */
function spriteSizeOf(dataId: string): number {
  return Math.ceil((boxOf(dataId) + CACHE_MARGIN) * 2 * scaleOf(dataId));
}

// ─── Frost / slow overlay ────────────────────────────────────────

function drawFrostEffect(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  t: number,
): void {
  const r = size * 1.35;
  ctx.save();

  // Cold vapour clinging to the body.
  const haze = ctx.createRadialGradient(cx, cy - size * 0.4, size * 0.15, cx, cy - size * 0.2, r * 1.5);
  haze.addColorStop(0, 'rgba(198,232,255,0.42)');
  haze.addColorStop(0.65, 'rgba(150,205,255,0.2)');
  haze.addColorStop(1, 'rgba(150,205,255,0)');
  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.ellipse(cx, cy - size * 0.2, r * 1.4, r * 1.7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ice crystals growing from the feet, shimmering slightly.
  const shards: Array<[number, number, number, number]> = [
    [-0.95, 0.1, 0.5, 0.6],
    [-0.55, 1.0, 0.34, 0.8],
    [0.1, 0.95, 0.28, 0.7],
    [0.75, 0.8, 0.42, 0.9],
    [1.0, 0.05, 0.3, 0.5],
    [-0.2, 1.05, 0.24, 0.55],
  ];
  for (let i = 0; i < shards.length; i++) {
    const [ox, oy, len, up] = shards[i];
    const dir = ox < 0 ? -1 : 1;
    const bx = cx + ox * size * 0.95;
    const by = cy + size * (0.55 + 0.1 * Math.sin(t * 3 + i)) * oy;
    const tipX = bx + dir * len * size * 0.42;
    const tipY = by - up * size * 0.95;
    const path = (): void => {
      ctx.beginPath();
      ctx.moveTo(bx - len * size * 0.2, by);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(bx + len * size * 0.22, by + size * 0.08);
      ctx.closePath();
    };
    const grad = ctx.createLinearGradient(bx, by, tipX, tipY);
    grad.addColorStop(0, 'rgba(120,180,240,0.5)');
    grad.addColorStop(0.45, 'rgba(196,232,255,0.72)');
    grad.addColorStop(1, 'rgba(255,255,255,0.92)');
    ctx.fillStyle = grad;
    path();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 0.8;
    path();
    ctx.stroke();
  }

  // Frozen rime across the shoulders.
  ctx.strokeStyle = 'rgba(226,244,255,0.8)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy - size * 0.45, size * 1.02, size * 0.66, 0, Math.PI * 0.86, Math.PI * 2.14);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(150,205,255,0.5)';
  ctx.lineWidth = 2.6;
  ctx.stroke();

  // Sparkles.
  for (let i = 0; i < 3; i++) {
    const a = t * 1.4 + i * 2.1;
    const sx = cx + Math.cos(a) * size * 1.05;
    const sy = cy - size * 0.3 + Math.sin(a * 1.3) * size * 0.85;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(sx, sy - 1.6);
    ctx.lineTo(sx + 1.1, sy);
    ctx.lineTo(sx, sy + 1.6);
    ctx.lineTo(sx - 1.1, sy);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

// ─── Health bar ──────────────────────────────────────────────────

/** Vector shield badge (armour) / crystal badge (magic resist). */
function drawShieldBadge(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(x - r, y - r * 0.85);
    ctx.lineTo(x + r, y - r * 0.85);
    ctx.lineTo(x + r, y + r * 0.15);
    ctx.quadraticCurveTo(x, y + r * 1.35, x - r, y + r * 0.15);
    ctx.closePath();
  };
  ctx.fillStyle = 'rgba(10,12,20,0.9)';
  path();
  ctx.fill();
  const grad = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  grad.addColorStop(0, '#eef3f8');
  grad.addColorStop(0.45, '#b8c4d2');
  grad.addColorStop(1, '#6c7787');
  ctx.fillStyle = grad;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - r, y - r, r * 2, r * 2);
  ctx.clip();
  path();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#2a1f38';
  ctx.lineWidth = 0.7;
  path();
  ctx.stroke();
  // Boss studs on the shield face.
  ctx.fillStyle = '#f0c040';
  ctx.fillRect(x - r * 0.18, y - r * 0.3, r * 0.36, r * 0.8);
}

function drawCrystalBadge(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.25);
    ctx.lineTo(x + r * 0.85, y);
    ctx.lineTo(x, y + r * 1.25);
    ctx.lineTo(x - r * 0.85, y);
    ctx.closePath();
  };
  const grad = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  grad.addColorStop(0, '#f0d9ff');
  grad.addColorStop(0.45, '#b06cf0');
  grad.addColorStop(1, '#5b1e9c');
  ctx.fillStyle = grad;
  path();
  ctx.fill();
  ctx.strokeStyle = '#2a1f38';
  ctx.lineWidth = 0.7;
  path();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.3, y - r * 0.4);
  ctx.lineTo(x, y + r * 0.5);
  ctx.stroke();
}

// ─── Public API ──────────────────────────────────────────────────

export function drawEnemyDirect(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyRenderData,
  gameTime = 0,
): void {
  if (!enemy.alive) return;

  const dataId = dataIdOf(enemy);
  const enemyDef = ENEMIES[dataId];
  const baseSize = enemyDef ? enemyDef.size : enemy.size;
  const box = boxOf(dataId);
  const scale = scaleOf(dataId);
  const spriteSize = spriteSizeOf(dataId);

  const animSpeed = enemy.flying ? 8 : enemy.speed * 0.12;
  const raw = gameTime * animSpeed + enemy.id * 1.7;
  const frame = ((Math.floor(raw % WALK_FRAMES) % WALK_FRAMES) + WALK_FRAMES) % WALK_FRAMES;

  const hurt = enemy.hitFlash > 0.05;
  const intensity = hurt ? Math.min(1, enemy.hitFlash) : 0;
  const facingLeft = enemy.facingLeft ?? false;

  // Vertical placement: flying units hover and bob on their wing beat.
  const hover = enemy.flying ? -10 - Math.sin(gameTime * 7 + enemy.id) * 2.4 : 0;
  const squash = 1 + intensity * 0.09;
  const stretch = 1 - intensity * 0.09;
  const lean = facingLeft ? 1 : -1;

  ctx.save();

  // ── Shadows (ground pass) ──
  if (enemy.flying) {
    castShadow(ctx, enemy.x, enemy.y + 20, baseSize * 1.5, baseSize * 0.6, 46 + hover * 0.4, 0.2);
    contactShadow(ctx, enemy.x, enemy.y + 20, baseSize * 0.55, baseSize * 0.24, 0.14);
  } else {
    contactShadow(ctx, enemy.x, enemy.y + 2, baseSize * 1.25, baseSize * 0.5, 0.36);
  }

  // ── Body sprite ──
  // Baked unflipped and mirrored here, so the impact lean can be applied
  // in world space instead of being reversed by the mirror.
  const sprite = sprites.get(
    `enemy:${dataId}:${frame}:${hurt ? 'hit' : 'ok'}`,
    spriteSize,
    spriteSize,
    makeDraw(dataId, frame, hurt),
  );

  // Baseline: the unit-space line that sits on the ground, in device px.
  const baseline = spriteSize * 0.5 + box * scale;
  const footY = enemy.y - hover;

  ctx.translate(enemy.x, footY);
  if (hurt) {
    // Squash on impact, kicked back the way the blow came from, then settle.
    ctx.rotate(lean * intensity * 0.15);
    ctx.translate(-lean * intensity * 2.6, 0);
  }
  ctx.scale(facingLeft ? -1 : 1, 1);
  ctx.scale(1 / squash, stretch);

  sprites.blit(ctx, sprite, 0, 0, spriteSize, spriteSize, {
    ax: 0.5,
    ay: baseline / spriteSize,
  });

  // ── Impact flash ──
  if (hurt) {
    const r = baseSize * 2.3;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, -baseSize * 0.4, 0, 0, -baseSize * 0.4, r);
    g.addColorStop(0, `rgba(255,255,255,${0.55 * intensity})`);
    g.addColorStop(0.45, `rgba(255,236,206,${0.22 * intensity})`);
    g.addColorStop(1, 'rgba(255,236,206,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, -baseSize * 0.4, r, r * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  // ── Frost overlay (world space, never flipped) ──
  if (enemy.slowed > 0) {
    drawFrostEffect(ctx, enemy.x, footY - baseSize * 0.45, baseSize, gameTime);
  }

  // ── Health bar ──
  const isBoss = dataId === 'orc_warlord';
  if (enemy.hp < enemy.maxHp || isBoss) {
    drawHealthBarDirect(ctx, enemy, baseSize, hover);
  }
}

export function drawHealthBarDirect(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyRenderData,
  baseSize: number,
  yOffset: number,
): void {
  const isBoss = enemy.dataId === 'orc_warlord';
  const barW = Math.round(isBoss ? 68 : Math.max(26, baseSize * 2.6));
  const barH = isBoss ? 7 : 4;
  const bx = Math.round(enemy.x - barW / 2);
  const by = Math.round(enemy.y - baseSize * (isBoss ? 2.1 : 1.35) - 9 + yOffset);
  const ratio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
  const frame = isBoss ? '#f2c94c' : '#8b93a1';
  const frameDark = isBoss ? '#8a6520' : '#3d434e';

  ctx.save();

  // Beveled metal frame: outer dark ring + two-tone plate.
  ctx.fillStyle = 'rgba(12,10,18,0.92)';
  ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
  ctx.fillStyle = frameDark;
  ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
  ctx.fillStyle = frame;
  ctx.fillRect(bx - 1, by - 1, barW + 2, 1);
  ctx.fillRect(bx - 1, by - 1, 1, barH + 2);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(bx - 1, by + barH, barW + 2, 1);
  ctx.fillRect(bx + barW, by - 1, 1, barH + 2);

  // Empty track.
  ctx.fillStyle = '#211a20';
  ctx.fillRect(bx, by, barW, barH);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(bx, by + barH - 1, barW, 1);

  // Three-tier gradient fill.
  const fillW = Math.round(barW * ratio);
  if (fillW > 0) {
    let top: string;
    let bottom: string;
    if (ratio > 0.5) {
      top = '#8fe04a';
      bottom = '#2f8f1f';
    } else if (ratio > 0.25) {
      top = '#ffd45e';
      bottom = '#d1770a';
    } else {
      top = '#ff6b5e';
      bottom = '#a41313';
    }
    const grad = ctx.createLinearGradient(bx, by, bx, by + barH);
    grad.addColorStop(0, bottom);
    grad.addColorStop(0.45, top);
    grad.addColorStop(1, bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, fillW, barH);
    // 1px specular highlight along the top of the fill.
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(bx, by, fillW, 1);
    // Notch marks every quarter.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (let q = 1; q < 4; q++) {
      const nx = bx + Math.round((barW * q) / 4);
      if (nx < bx + fillW) ctx.fillRect(nx, by, 1, barH);
    }
  }

  // Boss gets a pulsing outer glow.
  if (isBoss) {
    ctx.strokeStyle = `rgba(255,206,84,${0.45 + Math.sin(Date.now() / 260) * 0.2})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx - 3.5, by - 3.5, barW + 7, barH + 7);
  }

  // Armour badge (vector shield).
  if (enemy.armor > 0.15) {
    drawShieldBadge(ctx, bx - 6, by + barH / 2, isBoss ? 5 : 4.2);
  }
  // Magic-resist badge (vector crystal).
  if (enemy.magicResist > 0.15) {
    drawCrystalBadge(ctx, bx + barW + 6, by + barH / 2, isBoss ? 5 : 4.2);
  }

  // Cracked plate: the bar tilts slightly once the armour is gone.
  if (ratio < ARMOR_UP && enemy.armor > 0.15) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(bx + barW * 0.3, by);
    ctx.lineTo(bx + barW * 0.42, by + barH);
    ctx.moveTo(bx + barW * 0.68, by);
    ctx.lineTo(bx + barW * 0.6, by + barH);
    ctx.stroke();
  }

  ctx.restore();
}

// ─── Soldiers ────────────────────────────────────────────────────

function soldierDraw(
  type: SoldierRenderData['type'],
  frame: number,
  hurt: boolean,
): SpriteDraw {
  const p = hurt ? flash(soldierPal(type)) : soldierPal(type);
  return (ctx) => {
    drawSoldierBody(ctx, type, frame, p, 3);
  };
}

function soldierPal(type: SoldierRenderData['type']): Pal {
  switch (type) {
    case 'knight':
      return {
        cloth: '#2f4fa8',
        clothDk: '#1b2f6b',
        armor: '#aab6c6',
        armorDk: '#66727f',
        metal: '#e6ecf3',
        gold: '#e8c04a',
        goldDk: '#a8801d',
        accent: '#c22b3a',
        leather: '#6b4a2a',
        wood: '#8a5a2b',
        skin: '#f0c39a',
      };
    case 'footman':
      return {
        cloth: '#2f5fc4',
        clothDk: '#1c3a7d',
        armor: '#9aa6b2',
        armorDk: '#5c6672',
        metal: '#dfe6ee',
        gold: '#c9a227',
        goldDk: '#8a6a12',
        accent: '#eef3f8',
        leather: '#6b4a2a',
        wood: '#8a5a2b',
        skin: '#f0c39a',
      };
    case 'reinforcement':
      return {
        cloth: '#8a5a2b',
        clothDk: '#5b3a1a',
        armor: '#b8a58c',
        armorDk: '#7d6c58',
        metal: '#c9d2dc',
        gold: '#c9a227',
        goldDk: '#8a6a12',
        accent: '#d9c9a3',
        leather: '#6b4a2a',
        wood: '#8a5a2b',
        skin: '#f0c39a',
      };
    default: // militia
      return {
        cloth: '#9a6b3a',
        clothDk: '#66431f',
        armor: '#a8927a',
        armorDk: '#6f5c48',
        metal: '#c9d2dc',
        gold: '#c9a227',
        goldDk: '#8a6a12',
        accent: '#e2d3b6',
        leather: '#6b4a2a',
        wood: '#7a4a25',
        skin: '#f0c39a',
      };
  }
}

function drawSoldierBody(
  ctx: CanvasRenderingContext2D,
  type: SoldierRenderData['type'],
  frame: number,
  p: Pal,
  base: number,
): void {
  const ph = (frame / WALK_FRAMES) * Math.PI * 2;
  const bob = -Math.abs(Math.sin(ph)) * 0.9;
  const step = Math.sin(ph) * 1.6;

  ctx.save();
  ctx.translate(0, base);

  // ── common: legs, boots ──
  seg(ctx, -2.6, 4, -3.2 + step, 13, 3.2, p.clothDk, { line: 0.8, rim: false });
  seg(ctx, 2.4, 4, 3 - step, 13, 3.4, p.cloth, { line: 0.8 });
  seg(ctx, -3.2 + step, 12.4, -3.6 + step, 15.6, 4, p.leather, { line: 0.7, rim: false });
  seg(ctx, 3 - step, 12.4, 3.4 - step, 15.6, 4.2, tint(p.leather, 0.12), { line: 0.7 });

  ctx.translate(0, bob);

  if (type === 'knight') {
    // Flowing cloak.
    ink(ctx, () => {
      ctx.moveTo(-3.4, -10);
      ctx.quadraticCurveTo(-10.4, -2, -9.4, 10.6);
      ctx.quadraticCurveTo(-5.4, 8.6, -3.6, 10);
      ctx.lineTo(-3, -10);
      ctx.closePath();
    }, bodyGradient(ctx, 0, -11, 11, p.clothDk, 0.22, 0.3), 1);
    // Plate cuirass with gold cross.
    ink(ctx, () => {
      ctx.moveTo(-5.6, -8.6);
      ctx.bezierCurveTo(-7.4, -3, -6.4, 5.4, -5, 8.4);
      ctx.lineTo(5, 8.4);
      ctx.bezierCurveTo(6.6, 4.6, 7.4, -3.4, 5.6, -8.6);
      ctx.quadraticCurveTo(0, -11, -5.6, -8.6);
      ctx.closePath();
    }, bodyGradient(ctx, 0, -11, 9, p.armor, 0.28, 0.3), 1.2);
    ctx.fillStyle = p.gold;
    ctx.fillRect(-1.2, -8, 2.4, 15.4);
    ctx.fillRect(-4.4, -4, 8.8, 2.2);
    band(ctx, -6, 6.4, 12, 2.2, p.leather);
    // Great helm + visor + plume.
    ink(ctx, () => {
      ctx.moveTo(-4.8, -9.4);
      ctx.bezierCurveTo(-5.6, -15.6, -2.4, -18.4, 0.4, -18.4);
      ctx.bezierCurveTo(3.6, -18.4, 5.6, -15.4, 5, -9.4);
      ctx.quadraticCurveTo(0, -7.6, -4.8, -9.4);
      ctx.closePath();
    }, bodyGradient(ctx, 0, -19, -8, p.armor, 0.32, 0.26), 1.2);
    ctx.fillStyle = '#1b1520';
    ctx.fillRect(-3.6, -14.4, 7.2, 1.6);
    ctx.fillStyle = tint(p.metal, 0.2);
    ctx.fillRect(-3.6, -14.4, 7.2, 0.6);
    ink(ctx, () => {
      ctx.moveTo(-1.4, -18);
      ctx.quadraticCurveTo(-3.4, -24.4, 1.4, -23.4);
      ctx.quadraticCurveTo(3.4, -21.4, 1.8, -17.6);
      ctx.closePath();
    }, bodyGradient(ctx, 0, -25, -17, p.accent, 0.32, 0.28), 0.9);
    // Great shield.
    slab(ctx, [[-11.6, -7], [-5, -7], [-5, 4], [-8.4, 9.6], [-11.6, 4]], p.cloth,
      { line: 1.2, light: 0.3, dark: 0.3, rim: 1 });
    ctx.fillStyle = p.gold;
    ctx.fillRect(-9.4, -6, 1.6, 12.4);
    ctx.fillRect(-11, -2.6, 5.6, 1.6);
    // Broadsword.
    ctx.save();
    ctx.translate(7, -2);
    ctx.rotate(-0.42);
    band(ctx, -1, 5, 2, 4, p.leather);
    band(ctx, -5.6, 4.2, 11.2, 1.8, p.gold);
    slab(ctx, [[-1.6, 4], [1.6, 4], [1.2, -16], [0, -18.6], [-1.2, -16]], p.metal,
      { line: 0.9, light: 0.4, dark: 0.2, rim: 0.8 });
    ctx.restore();
  } else if (type === 'footman') {
    // Tabard over chainmail.
    ink(ctx, () => {
      ctx.moveTo(-5, -8.4);
      ctx.bezierCurveTo(-6.6, -2.4, -5.6, 5.4, -4.6, 8.6);
      ctx.lineTo(4.6, 8.6);
      ctx.bezierCurveTo(5.8, 5, 6.6, -2.6, 5, -8.4);
      ctx.quadraticCurveTo(0, -10.6, -5, -8.4);
      ctx.closePath();
    }, bodyGradient(ctx, 0, -11, 9, p.cloth, 0.28, 0.32), 1.2);
    ctx.fillStyle = p.accent;
    ctx.fillRect(-1.2, -8, 2.4, 15.4);
    band(ctx, -5.6, 5.6, 11.2, 2.2, p.leather);
    ink(ctx, () => circle(ctx, 0, 6.6, 1.5), p.gold, 0.6);
    // Kettle hat.
    ink(ctx, () => {
      ctx.moveTo(-6, -11.4);
      ctx.quadraticCurveTo(-4, -17.6, 0.4, -17.6);
      ctx.quadraticCurveTo(4.8, -17.6, 6.4, -11.4);
      ctx.quadraticCurveTo(0, -9.4, -6, -11.4);
      ctx.closePath();
    }, bodyGradient(ctx, 0, -18, -9, p.armor, 0.3, 0.28), 1.2);
    ctx.fillStyle = p.armorDk;
    ctx.fillRect(-6.6, -11.6, 13.4, 1.4);
    // Face.
    ink(ctx, () => circle(ctx, 0, -8.6, 3.6, 3.4), bodyGradient(ctx, 0, -12, -5, p.skin, 0.28, 0.28), 1);
    ctx.fillStyle = '#2a1a22';
    ctx.fillRect(-1.6, -9.4, 1.2, 1.2);
    ctx.fillRect(0.6, -9.4, 1.2, 1.2);
    // Round shield.
    ink(ctx, () => circle(ctx, -7.6, -2.4, 5, 5.2), bodyGradient(ctx, 0, -8, 3, p.cloth, 0.3, 0.3), 1.2);
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-7.6, -2.4, 3.4, 0, Math.PI * 2);
    ctx.stroke();
    ink(ctx, () => circle(ctx, -7.6, -2.4, 1.5), p.metal, 0.6);
    // Short sword.
    ctx.save();
    ctx.translate(5.6, 0.4);
    ctx.rotate(-0.3);
    band(ctx, -0.9, 3.4, 1.8, 3, p.leather);
    band(ctx, -2.6, 2.6, 5.2, 1.4, p.armorDk);
    slab(ctx, [[-1.2, 2.4], [1.2, 2.4], [0.9, -10.4], [0, -12.2], [-0.9, -10.4]], p.metal,
      { line: 0.8, light: 0.4, dark: 0.2, rim: 0.7 });
    ctx.restore();
  } else if (type === 'reinforcement') {
    // Light volunteer: leather jerkin, round buckler, spear.
    ink(ctx, () => {
      ctx.moveTo(-4.6, -8);
      ctx.quadraticCurveTo(-6, -2, -4.6, 8.4);
      ctx.lineTo(4.4, 8.4);
      ctx.quadraticCurveTo(6, -2, 4.6, -8);
      ctx.quadraticCurveTo(0, -10, -4.6, -8);
      ctx.closePath();
    }, bodyGradient(ctx, 0, -10, 9, p.cloth, 0.28, 0.3), 1.2);
    band(ctx, -5, 4.6, 10, 2, p.leather);
    // Shoulder strap.
    ctx.strokeStyle = rgbaOf(p.clothDk, 0.9);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-3.4, -7.6);
    ctx.lineTo(3, 4.2);
    ctx.stroke();
    // Head + hood.
    ink(ctx, () => circle(ctx, 0, -11.4, 3.8, 3.9), bodyGradient(ctx, 0, -15.4, -7.4, p.skin, 0.3, 0.26), 1);
    ink(ctx, () => {
      ctx.moveTo(-4.6, -12.4);
      ctx.quadraticCurveTo(0, -17.6, 4.6, -12.4);
      ctx.quadraticCurveTo(0, -14.4, -4.6, -12.4);
      ctx.closePath();
    }, bodyGradient(ctx, 0, -18, -12, p.accent, 0.28, 0.28), 0.9);
    ctx.fillStyle = '#2a1a22';
    ctx.fillRect(-1.8, -12.2, 1.2, 1.2);
    ctx.fillRect(0.6, -12.2, 1.2, 1.2);
    // Round buckler with boss.
    ink(ctx, () => circle(ctx, -6.6, -1.6, 4.4, 4.5), bodyGradient(ctx, 0, -6, 3, p.armor, 0.3, 0.3), 1.1);
    ctx.strokeStyle = p.armorDk;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(-6.6, -1.6, 3, 0, Math.PI * 2);
    ctx.stroke();
    ink(ctx, () => circle(ctx, -6.6, -1.6, 1.4), p.metal, 0.6);
    // Spear.
    ctx.save();
    ctx.translate(6.2, 0);
    ctx.rotate(-0.08);
    seg(ctx, 0, 8.4, 0, -17.4, 1.8, p.wood, { line: 0.7, rim: false });
    slab(ctx, [[0, -17.4], [2.2, -20.6], [0, -25.4], [-2.2, -20.6]], p.metal,
      { line: 0.8, light: 0.4, dark: 0.22, rim: 0.7 });
    ctx.restore();
  } else {
    // Militia: wool tunic, pitchfork, wooden club.
    ink(ctx, () => {
      ctx.moveTo(-4.4, -8);
      ctx.quadraticCurveTo(-5.8, -2, -4.4, 8.4);
      ctx.lineTo(4.2, 8.4);
      ctx.quadraticCurveTo(5.8, -2, 4.4, -8);
      ctx.quadraticCurveTo(0, -10, -4.4, -8);
      ctx.closePath();
    }, bodyGradient(ctx, 0, -10, 9, p.cloth, 0.26, 0.32), 1.2);
    // Dangling rope belt + patch.
    band(ctx, -4.8, 4.8, 9.6, 2, p.clothDk);
    ctx.fillStyle = rgbaOf(p.armorDk, 0.7);
    ctx.fillRect(-3.4, -2.4, 3, 3);
    // Head: messy hair, cap.
    ink(ctx, () => circle(ctx, 0, -11.2, 3.9, 4), bodyGradient(ctx, 0, -15.2, -7.2, p.skin, 0.3, 0.26), 1);
    ink(ctx, () => {
      ctx.moveTo(-5, -12.6);
      ctx.quadraticCurveTo(0, -18.6, 5, -12.6);
      ctx.quadraticCurveTo(0, -14.8, -5, -12.6);
      ctx.closePath();
    }, bodyGradient(ctx, 0, -19, -12, p.wood, 0.28, 0.3), 1);
    ctx.fillStyle = rgbaOf('#3b2617', 0.85);
    ctx.fillRect(-4.8, -13.4, 9.6, 1);
    ctx.fillStyle = '#2a1a22';
    ctx.fillRect(-1.8, -12, 1.2, 1.2);
    ctx.fillRect(0.6, -12, 1.2, 1.2);
    // Wooden club on the shoulder.
    ctx.save();
    ctx.translate(-6.4, -2);
    ctx.rotate(0.5);
    seg(ctx, 0, 5, 0, -10, 2.6, p.wood, { line: 0.9 });
    ink(ctx, () => circle(ctx, 0, -11.4, 2.8, 3.2), bodyGradient(ctx, 0, -15, -8, p.wood, 0.3, 0.3), 1);
    ctx.fillStyle = p.metal;
    ctx.fillRect(-2.6, -13, 1.4, 1.4);
    ctx.fillRect(1.2, -11, 1.4, 1.4);
    ctx.restore();
    // Pitchfork.
    ctx.save();
    ctx.translate(6, 0.6);
    ctx.rotate(-0.06);
    seg(ctx, 0, 8.6, 0, -16.6, 1.8, p.wood, { line: 0.7, rim: false });
    ctx.strokeStyle = SHADOW_TINT;
    ctx.lineWidth = 0.7;
    ctx.fillStyle = p.metal;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 2 - 0.6, -16.6);
      ctx.lineTo(i * 2 - 0.6, -21.6);
      ctx.lineTo(i * 2 + 0.6, -21.6);
      ctx.lineTo(i * 2 + 0.6, -16.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillRect(-2.6, -17.4, 5.2, 1.4);
    ctx.restore();
  }

  ctx.restore();
}

export function drawSoldierDirect(
  ctx: CanvasRenderingContext2D,
  soldier: SoldierRenderData,
  gameTime = 0,
): void {
  const facingLeft = soldier.facingLeft ?? false;
  const hurt = (soldier.hitFlash ?? 0) > 0.05;
  const intensity = hurt ? Math.min(1, soldier.hitFlash ?? 0) : 0;
  const animSpeed = 6.5;
  const frame = ((Math.floor((gameTime * animSpeed + soldier.id * 2) % WALK_FRAMES) % WALK_FRAMES) + WALK_FRAMES) % WALK_FRAMES;

  const scale = 1.9;
  const box = 18;
  const size = Math.ceil((box + CACHE_MARGIN) * 2 * scale); // 88 px

  ctx.save();
  contactShadow(ctx, soldier.x, soldier.y + 1, 8, 3.4, 0.32);

  const sprite = sprites.get(
    `soldier:${soldier.type}:${frame}:${hurt ? 'hit' : 'ok'}`,
    size,
    size,
    soldierDraw(soldier.type, frame, hurt),
  );

  const sign = facingLeft ? -1 : 1;
  const baseline = size * 0.5 + box * scale;
  ctx.translate(soldier.x, soldier.y);
  if (hurt) {
    ctx.rotate(sign * intensity * 0.13);
    ctx.translate(-sign * intensity * 2, 0);
    ctx.scale(1 + intensity * 0.07, 1 - intensity * 0.07);
  }
  ctx.scale(sign, 1);
  sprites.blit(ctx, sprite, 0, 0, size, size, { ax: 0.5, ay: baseline / size });

  if (hurt) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, -12, 0, 0, -12, 18);
    g.addColorStop(0, `rgba(255,255,255,${0.5 * intensity})`);
    g.addColorStop(1, 'rgba(255,240,214,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, -12, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  // HP bar only once wounded.
  if (soldier.hp < soldier.maxHp) {
    const barW = 18;
    const barH = 3.4;
    const bx = Math.round(soldier.x - barW / 2);
    const by = Math.round(soldier.y - 34);
    const ratio = Math.max(0, Math.min(1, soldier.hp / soldier.maxHp));

    ctx.fillStyle = 'rgba(12,10,18,0.9)';
    ctx.fillRect(bx - 1.5, by - 1.5, barW + 3, barH + 3);
    ctx.fillStyle = '#6f7883';
    ctx.fillRect(bx - 0.5, by - 0.5, barW + 1, barH + 1);
    ctx.fillStyle = '#1d1a22';
    ctx.fillRect(bx, by, barW, barH);
    const grad = ctx.createLinearGradient(bx, by, bx, by + barH);
    if (ratio > 0.5) {
      grad.addColorStop(0, '#8fe04a');
      grad.addColorStop(1, '#2f8f1f');
    } else if (ratio > 0.25) {
      grad.addColorStop(0, '#ffd45e');
      grad.addColorStop(1, '#c86f0a');
    } else {
      grad.addColorStop(0, '#ff6b5e');
      grad.addColorStop(1, '#a41313');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, Math.round(barW * ratio), barH);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(bx, by, Math.round(barW * ratio), 1);
  }
}
