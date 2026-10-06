// ─── Tower Renderer ──────────────────────────────────────────────
// Kingdom-Rush-inspired procedural towers, drawn entirely in code.
//
// Art rules followed by every tower below:
//   • one thick dark outline (SHADOW_TINT, never pure black) around each part
//   • three tones per material: highlight towards the upper-left sun,
//     base colour, cool shadow towards the lower-right
//   • materials read as materials: wood grain, staggered stone courses,
//     individual roof tiles, metal speculars
//   • a warm rim light on the upper-left silhouette edge
//   • a contact shadow, a cast shadow thrown to the lower-right and a
//     soft ground AO patch under the footprint
//   • four clearly different silhouettes, three clearly different levels
//     (wooden post → stone tower → crenellated fortress) and two clearly
//     different specialisations per family
//
// Performance: everything static is baked once through SpriteBank at
// supersampled resolution. Only living detail is drawn per frame — banner
// cloth, torch flames, window flicker, muzzle flash/smoke and the stun
// swirl — so the cache never thrashes.

import { TOWERS } from '../data/towers';
import { lighten, darken } from '../core/color';
import { sprites } from './SpriteBank';
import { SHADOW_TINT, RIM_LIGHT, COOL_SHADOW } from './Palette';
import {
  mix,
  outline,
  rimLight,
  bodyGradient,
  contactShadow,
  castShadow,
  groundAO,
} from './Lighting';

interface TowerRenderData {
  x: number;
  y: number;
  dataId: string;
  level: number;
  specId: string | null;
  animTimer: number;
  stunTimer: number;
  id: number;
}

const TAU = Math.PI * 2;
/** Canvas padding below the foot point (design px). */
const PAD_B = 12;
/** Attack animation length, matches BALANCE.tower.attackAnimDuration. */
const ANIM = 0.15;

// ─── Material palette ────────────────────────────────────────────
const WOOD = '#9a6c3c';
const WOOD_D = '#6d4a26';
const WOOD_L = '#c79a5d';
const STONE = '#9d988b';
const STONE_D = '#6b675c';
const IRON = '#757981';
const IRON_D = '#3f4249';
const LEATHER = '#7d5430';
const GOLD = '#efc247';
const SKIN = '#e9c396';
const HAY = '#d8c076';

// ─── Geometry description ────────────────────────────────────────
// One record per (family, level, spec) state: the canvas size the art is
// baked into plus the anchors the live per-frame pass needs.
type FlashKind = 'arrow' | 'magic' | 'powder' | 'melee';

interface GlowSpot {
  x: number;
  y: number;
  w: number;
  h: number;
  arched: boolean;
}

interface TorchSpot {
  x: number;
  y: number;
  s: number;
}

interface BannerSpot {
  len: number;
  w: number;
  color: string;
  flip: boolean;
}

interface OrbSpot {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

interface TowerGeo {
  level: number;
  spec: string | null;
  w: number;
  h: number;
  /** Local y of the highest point of the silhouette (negative = up). */
  top: number;
  /** Silhouette height, feeds the cast shadow elevation. */
  height: number;
  /** How far the weapon layer kicks back on recoil (design px). */
  revolver: number;
  /** Local point the muzzle flash spawns from. */
  muzzle: { x: number; y: number } | null;
  flash: FlashKind;
  glows: GlowSpot[];
  torches: TorchSpot[];
  banner: (BannerSpot & { x: number; y: number }) | null;
  orbs: OrbSpot | null;
}

interface GeoExtra {
  muzzle?: { x: number; y: number };
  flash?: FlashKind;
  revolver?: number;
  glows?: GlowSpot[];
  torches?: TorchSpot[];
  banner?: (BannerSpot & { x: number; y: number }) | null;
  orbs?: OrbSpot | null;
}

/** Common geo assembly: canvas is derived from the tallest point and half width. */
function makeGeo(level: number, spec: string | null, top: number, halfW: number, extra: GeoExtra = {}): TowerGeo {
  return {
    level,
    spec,
    w: Math.ceil(halfW * 2),
    h: Math.ceil(-top + 18 + PAD_B),
    top,
    height: -top,
    revolver: extra.revolver ?? 1.5,
    muzzle: extra.muzzle ?? null,
    flash: extra.flash ?? 'arrow',
    glows: extra.glows ?? [],
    torches: extra.torches ?? [],
    banner: extra.banner ?? null,
    orbs: extra.orbs ?? null,
  };
}

// ─── Path helpers ────────────────────────────────────────────────
function rectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.rect(x, y, w, h);
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function polyPath(ctx: CanvasRenderingContext2D, pts: number[][]): void {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (i === 0) ctx.moveTo(p[0], p[1]);
    else ctx.lineTo(p[0], p[1]);
  }
  ctx.closePath();
}

function ellPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(0.2, rx), Math.max(0.2, ry), 0, 0, TAU);
}

function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, w: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

/** Fill the current path and give it the shared cartoon outline. */
function ink(ctx: CanvasRenderingContext2D, fill: string | CanvasGradient, lw = 1.3): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = SHADOW_TINT;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** Diagonal three-tone gradient (highlight upper-left → base → cool shadow). */
function grad(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  base: string,
  up = 0.26,
  down = 0.34,
): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, mix(base, '#fff3d4', up));
  g.addColorStop(0.55, base);
  g.addColorStop(1, mix(base, COOL_SHADOW, down));
  return g;
}

/** Warm rim light on a path, positioned by a bounding circle. */
function rim(ctx: CanvasRenderingContext2D, path: () => void, cx: number, cy: number, r: number, w = 1.4): void {
  rimLight(ctx, path, cx, cy, r, RIM_LIGHT, w);
}

// ─── Material primitives ─────────────────────────────────────────

/** Vertical wood grain inside a rect (baked, so it can afford detail). */
function woodGrain(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, vertical: boolean): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = 'rgba(65,40,20,0.22)';
  ctx.lineWidth = 0.45;
  const n = Math.max(2, Math.round((vertical ? w : h) / 3));
  for (let i = 1; i < n; i++) {
    if (vertical) {
      const xx = x + (w * i) / n + ((i % 2) * w) / (n * 4);
      ctx.beginPath();
      ctx.moveTo(xx, y);
      ctx.quadraticCurveTo(xx + 0.8, y + h * 0.5, xx - 0.4, y + h);
      ctx.stroke();
    } else {
      const yy = y + (h * i) / n + ((i % 2) * h) / (n * 4);
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.quadraticCurveTo(x + w * 0.5, yy + 0.7, x + w, yy - 0.4);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A wooden post/beam with three tones, outline and a top cap. */
function beam(ctx: CanvasRenderingContext2D, x: number, yTop: number, yBot: number, w: number, base = WOOD): void {
  roundRectPath(ctx, x - w / 2, yTop, w, yBot - yTop, Math.min(1.4, w * 0.3));
  ink(ctx, grad(ctx, x - w / 2, yTop, x + w / 2, yBot, base, 0.3, 0.36), 1.15);
  woodGrain(ctx, x - w / 2, yTop, w, yBot - yTop, true);
  // sunlit edge
  rim(ctx, () => line(ctx, x - w / 2 + 0.5, yTop + 1, x - w / 2 + 0.5, yBot - 1, RIM_LIGHT, 1), x, yTop, w, 1);
}

/** Staggered brick courses inside a rectangular wall. */
function wallCourses(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rows: number): void {
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    if (r % 2 === 0) {
      ctx.fillStyle = 'rgba(42,31,56,0.055)';
      ctx.fillRect(x, y + rh * r, w, rh);
    }
  }
  ctx.strokeStyle = 'rgba(42,31,56,0.30)';
  ctx.lineWidth = 0.5;
  for (let r = 1; r < rows; r++) {
    const yy = y + rh * r;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
    ctx.stroke();
  }
  for (let r = 0; r < rows; r++) {
    const yy = y + rh * r;
    const cols = Math.max(1, Math.round(w / Math.max(5, rh)));
    const off = (r % 2) * (w / cols / 2);
    for (let c = 0; c < cols; c++) {
      const xx = x + off + (w / cols) * c;
      if (xx < x + 1.2 || xx > x + w - 1.2) continue;
      ctx.beginPath();
      ctx.moveTo(xx, yy + 0.4);
      ctx.lineTo(xx, yy + rh - 0.4);
      ctx.stroke();
    }
  }
}

/** A crenellated parapet: evenly spaced merlons along a horizontal edge. */
function crenels(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, count: number, mw: number, mh: number, base = STONE): void {
  const span = x1 - x0;
  for (let i = 0; i < count; i++) {
    const cx = x0 + (span * (i + 0.5)) / count;
    const x = cx - mw / 2;
    roundRectPath(ctx, x, y - mh, mw, mh + 1.5, 1);
    ink(ctx, grad(ctx, x, y - mh, x + mw, y, base, 0.34, 0.3), 1.15);
    // sunlit top face
    rectPath(ctx, x + 0.9, y - mh + 0.9, mw - 1.8, 1.1);
    ctx.fillStyle = mix(base, '#fff3d4', 0.42);
    ctx.fill();
  }
}

/** Cylinder silhouette path (3/4 view): side walls + elliptical top. */
function cylPath(ctx: CanvasRenderingContext2D, cx: number, top: number, bot: number, rTop: number, rBot: number): void {
  ctx.beginPath();
  ctx.moveTo(cx - rTop, top);
  ctx.lineTo(cx - rBot, bot);
  ctx.ellipse(cx, bot, rBot, rBot * 0.3, 0, Math.PI, 0, true);
  ctx.lineTo(cx + rTop, top);
  ctx.ellipse(cx, top, rTop, rTop * 0.3, 0, 0, Math.PI, true);
  ctx.closePath();
}

/** A stone tower shaft: tapered cylinder, courses carved into it, lit top face. */
function shaft(
  ctx: CanvasRenderingContext2D,
  cx: number, top: number, bot: number,
  rTop: number, rBot: number,
  base = STONE,
  rows = 0,
): void {
  cylPath(ctx, cx, top, bot, rTop, rBot);
  ink(ctx, grad(ctx, cx - rBot, 0, cx + rBot, 0, base, 0.34, 0.46), 1.4);
  if (rows > 0) {
    ctx.save();
    cylPath(ctx, cx, top, bot, rTop, rBot);
    ctx.clip();
    ctx.strokeStyle = 'rgba(42,31,56,0.28)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < rows; i++) {
      const t = i / rows;
      const y = top + (bot - top) * t;
      const r = rTop + (rBot - rTop) * t;
      ctx.beginPath();
      ctx.ellipse(cx, y, r, r * 0.3, 0, 0.08, Math.PI - 0.08);
      ctx.stroke();
      // staggered vertical joints
      for (let j = 1; j <= 2; j++) {
        const a = Math.PI * (j / 3) + (i % 2) * 0.35;
        const jx = cx + Math.cos(a) * r;
        const jy = y + Math.sin(a) * r * 0.3;
        ctx.beginPath();
        ctx.moveTo(jx, jy - (bot - top) / rows + 0.4);
        ctx.lineTo(jx, jy - 0.4);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  // lit top face
  ellPath(ctx, cx, top, rTop, rTop * 0.3);
  ink(ctx, grad(ctx, cx - rTop, top - 2, cx + rTop, top + 3, mix(base, '#fff3d4', 0.3), 0.16, 0.24), 1.2);
  // warm rim on the sun side
  rim(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(cx - rTop, top);
    ctx.lineTo(cx - rBot, bot);
  }, cx, top, rBot, 1.5);
}

/** Rock footing every tower stands on. */
function plinth(ctx: CanvasRenderingContext2D, rx: number, base: string, top: string): void {
  const ry = rx * 0.42;
  // side rim
  ellPath(ctx, 0, 3.2, rx, ry);
  ink(ctx, grad(ctx, -rx, -6, rx, 10, base, 0.12, 0.46), 1.5);
  // top slab
  ellPath(ctx, 0, -1.6, rx, ry);
  ink(ctx, grad(ctx, -rx, -8, rx, 6, top, 0.3, 0.34), 1.5);
  outline(ctx, () => {
    ctx.beginPath();
    ctx.ellipse(0, -1.6, rx, ry, 0, 0, TAU);
  }, SHADOW_TINT, 1.4);
  // paving stones on the top face
  const tiles = 7;
  for (let i = 0; i < tiles; i++) {
    const a = Math.PI * (0.06 + (0.88 * i) / (tiles - 1));
    const tx = Math.cos(a) * rx * 0.62;
    const ty = -1.6 + Math.sin(a) * ry * 0.62;
    roundRectPath(ctx, tx - 3, ty - 1.6, 6, 3.2, 1);
    ink(ctx, mix(top, '#ffffff', i % 2 === 0 ? 0.08 : 0.0), 0.6);
  }
  // moss / grass tufts biting into the stone
  ctx.strokeStyle = '#3f6b2c';
  ctx.lineWidth = 0.8;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const gx = -rx * 0.75 + i * (rx * 0.75);
    const gy = 3.4 + ry * 0.55 - Math.abs(i - 1) * 0.8;
    for (let b = -1; b <= 1; b++) {
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + b * 1.4, gy - 2.6, gx + b * 2.6, gy - 4);
      ctx.stroke();
    }
  }
}

/** Level readout: gold studs on the footing, a star once specialised. */
function levelPips(ctx: CanvasRenderingContext2D, level: number, spec: string | null, y: number): void {
  if (spec) {
    sparkle(ctx, 0, y, 3.6, GOLD);
    return;
  }
  for (let i = 0; i <= level; i++) {
    const x = (i - level / 2) * 5.4;
    polyPath(ctx, [[x, y - 2], [x + 1.7, y], [x, y + 2], [x - 1.7, y]]);
    ink(ctx, grad(ctx, x - 2, y - 2, x + 2, y + 2, GOLD, 0.4, 0.3), 0.7);
  }
}

/** A four-point sparkle/star, used for stun stars, spec studs and sparks. */
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, inkW = 0.7): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const rad = i % 2 === 0 ? r : r * 0.34;
    const a = (Math.PI * i) / 4 - Math.PI / 2;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ink(ctx, color, inkW);
}

/** Vertical plank cladding. */
function planks(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base = WOOD, count = 0): void {
  const n = count > 0 ? count : Math.max(2, Math.round(w / 4.6));
  const pw = w / n;
  for (let i = 0; i < n; i++) {
    const px = x + pw * i;
    const tone = i % 2 === 0 ? 0.06 : -0.05;
    rectPath(ctx, px, y, pw + 0.4, h);
    ink(ctx, mix(base, i % 2 === 0 ? '#fff3d4' : COOL_SHADOW, Math.abs(tone)), 0.7);
    woodGrain(ctx, px, y, pw, h, true);
  }
}

/** Roman-tile roof: two slopes lit differently, tile rows, ridge cap. */
function tileRoof(
  ctx: CanvasRenderingContext2D,
  cx: number, eaveY: number, ridgeY: number, halfW: number,
  base: string,
): void {
  polyPath(ctx, [[cx - halfW, eaveY], [cx, ridgeY], [cx + halfW, eaveY]]);
  ink(ctx, grad(ctx, cx - halfW, ridgeY, cx + halfW, eaveY, base, 0.34, 0.34), 1.5);
  ctx.save();
  polyPath(ctx, [[cx - halfW, eaveY], [cx, ridgeY], [cx + halfW, eaveY]]);
  ctx.clip();
  // dark half gives the two-slope read
  polyPath(ctx, [[cx, ridgeY - 4], [cx, eaveY + 4], [cx + halfW + 4, eaveY + 4]]);
  ctx.fillStyle = 'rgba(42,31,56,0.20)';
  ctx.fill();
  // tile rows
  const rows = 5;
  for (let r = rows; r >= 0; r--) {
    const t = r / rows;
    const y = eaveY + (ridgeY - eaveY) * t;
    const hw = halfW * (1 - t);
    const step = 5.2;
    const n = Math.max(2, Math.round((hw * 2) / step));
    ctx.strokeStyle = 'rgba(42,31,56,0.34)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < n; i++) {
      const px = cx - hw + ((hw * 2) / n) * (i + 0.5);
      ctx.beginPath();
      ctx.arc(px, y, (hw * 2) / n / 2, 0, Math.PI);
      ctx.stroke();
    }
  }
  ctx.restore();
  // ridge highlight
  line(ctx, cx - halfW + 1, eaveY - 0.5, cx, ridgeY + 0.5, RIM_LIGHT, 1.2);
}

/** Iron-banded barrel. */
function barrelProp(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base = WOOD): void {
  const r = w / 2;
  ctx.beginPath();
  ctx.moveTo(x - r, y - h);
  ctx.quadraticCurveTo(x - r * 1.3, y - h / 2, x - r, y);
  ctx.lineTo(x + r, y);
  ctx.quadraticCurveTo(x + r * 1.3, y - h / 2, x + r, y - h);
  ctx.closePath();
  ink(ctx, grad(ctx, x - r, y - h, x + r, y, base, 0.3, 0.4), 1.2);
  woodGrain(ctx, x - r, y - h, w, h, true);
  ctx.fillStyle = IRON_D;
  ctx.fillRect(x - r * 1.22, y - h * 0.78, w * 1.22, 1.5);
  ctx.fillRect(x - r * 1.22, y - h * 0.34, w * 1.22, 1.5);
  ctx.fillStyle = 'rgba(255,243,212,0.35)';
  ctx.fillRect(x - r * 1.22, y - h * 0.78, w * 1.22, 0.5);
  ellPath(ctx, x, y - h, r, r * 0.34);
  ink(ctx, mix(base, '#fff3d4', 0.3), 1);
}

/** Plank crate with a cross brace. */
function crateProp(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base = WOOD): void {
  rectPath(ctx, x - w / 2, y - h, w, h);
  ink(ctx, grad(ctx, x - w / 2, y - h, x + w / 2, y, base, 0.28, 0.36), 1.2);
  woodGrain(ctx, x - w / 2, y - h, w, h, false);
  ctx.strokeStyle = mix(base, COOL_SHADOW, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + 1, y - h + 1);
  ctx.lineTo(x + w / 2 - 1, y - 1);
  ctx.moveTo(x + w / 2 - 1, y - h + 1);
  ctx.lineTo(x - w / 2 + 1, y - 1);
  ctx.stroke();
  ctx.strokeStyle = SHADOW_TINT;
  ctx.lineWidth = 0.7;
  ctx.strokeRect(x - w / 2 + 0.7, y - h + 0.7, w - 1.4, h - 1.4);
}

/** Coiled rope hanging on a wall. */
function ropeCoil(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.ellipse(x, y + i * 1.8, r - i * 1.1, r - i * 1.1, 0, 0, TAU);
    ctx.strokeStyle = i === 0 ? SHADOW_TINT : '#c9a86a';
    ctx.lineWidth = i === 0 ? 3.2 : 2;
    ctx.stroke();
  }
  line(ctx, x, y - r - 1, x, y - r - 5, '#c9a86a', 1.4);
}

/** Hanging shield with a boss and a rim. */
function shieldProp(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base: string, emblem: 'none' | 'cross' | 'star'): void {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - h * 0.55);
  ctx.quadraticCurveTo(x - w / 2, y + h * 0.3, x, y + h * 0.5);
  ctx.quadraticCurveTo(x + w / 2, y + h * 0.3, x + w / 2, y - h * 0.55);
  ctx.quadraticCurveTo(x, y - h * 0.75, x - w / 2, y - h * 0.55);
  ctx.closePath();
  ink(ctx, grad(ctx, x - w / 2, y - h / 2, x + w / 2, y + h / 2, base, 0.34, 0.36), 1.15);
  line(ctx, x - w / 2 + 0.8, y - h * 0.35, x - w / 2 + 0.8, y + h * 0.2, RIM_LIGHT, 0.9);
  if (emblem === 'cross') {
    ctx.fillStyle = GOLD;
    ctx.fillRect(x - 0.9, y - h * 0.34, 1.8, h * 0.5);
    ctx.fillRect(x - w * 0.22, y - h * 0.16, w * 0.44, 1.8);
  } else if (emblem === 'star') {
    sparkle(ctx, x, y - h * 0.06, w * 0.26, GOLD, 0.5);
  } else {
    ellPath(ctx, x, y - h * 0.06, w * 0.2, w * 0.2);
    ink(ctx, mix(base, '#fff3d4', 0.35), 0.7);
  }
}

/** Banner mast: pole, crossbar, spear finial. The cloth is drawn per frame. */
function mast(ctx: CanvasRenderingContext2D, x: number, yTop: number, yBot: number, color: string): void {
  line(ctx, x, yTop + 3, x, yBot, SHADOW_TINT, 3.4);
  line(ctx, x, yTop + 3, x, yBot, WOOD_D, 2);
  line(ctx, x - 0.4, yTop + 3, x - 0.4, yBot - 1, 'rgba(255,243,212,0.22)', 0.7);
  // spear finial
  polyPath(ctx, [[x, yTop - 2.6], [x + 1.8, yTop + 2.4], [x, yTop + 5], [x - 1.8, yTop + 2.4]]);
  ink(ctx, grad(ctx, x - 2, yTop - 2, x + 2, yTop + 5, GOLD, 0.4, 0.3), 0.8);
  // cloth ties
  ctx.fillStyle = color;
  ctx.fillRect(x - 1.6, yTop + 4, 3.2, 1.2);
}

/** Torch bracket: iron arm plus a burning bowl (flame is drawn per frame). */
function torchBracket(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  line(ctx, x - 6 * s, y + 3 * s, x, y + 0.5 * s, IRON_D, 2.2 * s);
  line(ctx, x - 6 * s, y + 3 * s, x - 6 * s, y + 8 * s, IRON_D, 1.6 * s);
  polyPath(ctx, [[x - 3 * s, y], [x + 3 * s, y], [x + 2.2 * s, y + 3.4 * s], [x - 2.2 * s, y + 3.4 * s]]);
  ink(ctx, grad(ctx, x - 3 * s, y, x + 3 * s, y + 3 * s, IRON, 0.3, 0.4), 0.9);
  ellPath(ctx, x, y, 3 * s, 1.1 * s);
  ink(ctx, IRON_D, 0.7);
}

/** Baked window: stone reveal, dark interior, warm base glow, mullions. */
function windowBaked(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, arched: boolean): void {
  const drawShape = (dw: number, dh: number): void => {
    if (arched) {
      ctx.beginPath();
      ctx.moveTo(x - dw / 2, y + dh / 2);
      ctx.lineTo(x - dw / 2, y);
      ctx.quadraticCurveTo(x, y - dh * 0.98, x + dw / 2, y);
      ctx.lineTo(x + dw / 2, y + dh / 2);
      ctx.closePath();
    } else {
      roundRectPath(ctx, x - dw / 2, y - dh / 2, dw, dh, Math.min(1.6, dw * 0.35));
    }
  };
  drawShape(w + 2.6, h + 2.6);
  ink(ctx, mix(STONE, COOL_SHADOW, 0.2), 1.1);
  drawShape(w, h);
  ink(ctx, grad(ctx, x, y - h / 2, x, y + h / 2, '#3a2a1e', 0.5, 0.1), 0.8);
  drawShape(w * 0.78, h * 0.8);
  ctx.fillStyle = 'rgba(255,196,110,0.72)';
  ctx.fill();
  // mullion
  line(ctx, x, y - h * 0.34, x, y + h * 0.3, SHADOW_TINT, 0.9);
  // sill
  ctx.fillStyle = mix(STONE, '#fff3d4', 0.24);
  ctx.fillRect(x - w * 0.72, y + h * 0.5, w * 1.44, 1.6);
}

/** Arrow slit: narrow embrasure with a faint warm floor. */
function arrowSlit(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  roundRectPath(ctx, x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2, 1.4);
  ink(ctx, mix(STONE, COOL_SHADOW, 0.16), 1);
  roundRectPath(ctx, x - w / 2, y - h / 2, w, h, 1.1);
  ink(ctx, grad(ctx, x, y - h / 2, x, y + h / 2, '#2b2135', 0.2, 0.6), 0.7);
  ctx.fillStyle = 'rgba(255,186,104,0.30)';
  ctx.fillRect(x - w / 2 + 0.4, y + h / 2 - 1.4, w - 0.8, 1);
}

/** Arched plank door with iron bands, set into a wall of any thickness. */
function archDoor(ctx: CanvasRenderingContext2D, cx: number, w: number, h: number): void {
  const hw = w / 2;
  const arch = h * 0.4;
  const doorPath = (): void => {
    ctx.beginPath();
    ctx.moveTo(cx - hw, 0.5);
    ctx.lineTo(cx - hw, -h + arch);
    ctx.quadraticCurveTo(cx, -h - arch * 0.6, cx + hw, -h + arch);
    ctx.lineTo(cx + hw, 0.5);
    ctx.closePath();
  };
  doorPath();
  ink(ctx, '#241c2e', 1.2);
  ctx.save();
  doorPath();
  ctx.clip();
  planks(ctx, cx - hw, -h - arch * 0.5, w, h + arch * 0.6, WOOD_D, 4);
  ctx.restore();
  outline(ctx, doorPath, SHADOW_TINT, 1.3);
  line(ctx, cx - hw + 0.8, -h * 0.4, cx + hw - 0.8, -h * 0.4, IRON_D, 1.3);
  line(ctx, cx - hw + 0.8, -h * 0.76, cx + hw - 0.8, -h * 0.76, IRON_D, 1.1);
  ctx.fillStyle = mix(GOLD, '#fff3d4', 0.24);
  ctx.beginPath();
  ctx.arc(cx + hw * 0.5, -h * 0.28, 0.72, 0, TAU);
  ctx.fill();
}

// ─── Live (per frame) detail ─────────────────────────────────────

/** Warm shimmer over a baked window: very light flicker plus a soft halo. */
function windowFlicker(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, arched: boolean, t: number, ph: number): void {
  const f = Math.max(0, Math.min(1, 0.5 + 0.3 * Math.sin(t * 1.9 + ph) + 0.2 * Math.sin(t * 3.7 + ph * 1.7)));
  const a = 0.10 + f * 0.14;
  const r = Math.max(w, h) * 2.8;
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
  glow.addColorStop(0, `rgba(255,196,110,${a * 0.55})`);
  glow.addColorStop(0.55, `rgba(255,170,90,${a * 0.2})`);
  glow.addColorStop(1, 'rgba(255,150,70,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();

  ctx.fillStyle = `rgba(255,228,168,${a})`;
  if (arched) {
    ctx.beginPath();
    ctx.moveTo(x - w * 0.39, y + h * 0.4);
    ctx.lineTo(x - w * 0.39, y + h * 0.02);
    ctx.quadraticCurveTo(x, y - h * 0.44, x + w * 0.39, y + h * 0.02);
    ctx.lineTo(x + w * 0.39, y + h * 0.4);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(x - w * 0.39, y - h * 0.4, w * 0.78, h * 0.8);
  }
}

/** Living torch flame, halo and drifting embers. */
function torchFlame(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, ph: number): void {
  const wob = Math.sin(t * 6.1 + ph) * 0.5 + Math.sin(t * 9.4 + ph * 2.1) * 0.28;
  const hgt = (7.2 + wob * 1.15) * s;
  const wid = (3.1 + wob * 0.22) * s;
  const r = 17 * s;
  const glow = ctx.createRadialGradient(x, y - hgt * 0.35, 0, x, y - hgt * 0.35, r);
  glow.addColorStop(0, 'rgba(255,178,84,0.34)');
  glow.addColorStop(0.5, 'rgba(255,140,54,0.13)');
  glow.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y - hgt * 0.35, r, 0, TAU);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x, y - hgt);
  ctx.quadraticCurveTo(x + wid * 1.2, y - hgt * 0.42, x + wid * 0.45, y);
  ctx.quadraticCurveTo(x, y + 1.5 * s, x - wid * 0.45, y);
  ctx.quadraticCurveTo(x - wid * 1.2, y - hgt * 0.42, x, y - hgt);
  ctx.closePath();
  ink(ctx, grad(ctx, x, y - hgt, x, y, '#ff8f2c', 0.24, 0.06), 0.9);

  ctx.beginPath();
  ctx.moveTo(x, y - hgt * 0.62);
  ctx.quadraticCurveTo(x + wid * 0.62, y - hgt * 0.3, x, y - 0.6 * s);
  ctx.quadraticCurveTo(x - wid * 0.62, y - hgt * 0.3, x, y - hgt * 0.62);
  ctx.closePath();
  ink(ctx, '#ffeaa4', 0.5);

  ctx.fillStyle = 'rgba(255,206,124,0.8)';
  for (let i = 0; i < 3; i++) {
    const seed = t * 2.2 + ph + i * 2.3;
    const rise = (seed * 1.7) % 9;
    ctx.beginPath();
    ctx.arc(x + Math.sin(seed * 2.3) * 3.4 * s, y - hgt - 2 * s - rise * s, 0.62 * s, 0, TAU);
    ctx.fill();
  }
}

/** Waving swallowtail banner. Cheap: one path, one emblem. */
function clothBanner(ctx: CanvasRenderingContext2D, x: number, y: number, b: BannerSpot & { x: number; y: number }, t: number, ph: number): void {
  void b.x;
  void b.y;
  const dir = b.flip ? -1 : 1;
  const w1 = Math.sin(t * 1.35 + ph) * 0.55 + Math.sin(t * 2.6 + ph * 1.7) * 0.3;
  const w2 = Math.sin(t * 1.7 + ph + 1.1) * 0.7 + Math.sin(t * 3.1 + ph) * 0.35;
  const tipX = x + dir * (b.w + w1 * 1.6);
  const botY = y + b.len;
  ctx.beginPath();
  ctx.moveTo(x - 1.2, y + 1);
  ctx.quadraticCurveTo(x + dir * b.w * 0.6, y - 1.4 + w1, tipX, y + 3 + w1 * 1.4);
  ctx.lineTo(x + dir * (b.w * 0.82) + w2 * 0.9, botY - b.len * 0.42);
  ctx.lineTo(x + dir * (b.w * 0.42) + w2 * 0.6, botY - b.len * 0.5);
  ctx.lineTo(x + dir * (b.w * 0.7) + w2 * 0.5, botY);
  ctx.lineTo(x + dir * 0.6, y + b.len * 0.98);
  ctx.closePath();
  ink(ctx, grad(ctx, x, y, x + dir * b.w, botY, b.color, 0.32, 0.3), 1.15);
  // folds
  ctx.strokeStyle = 'rgba(42,31,56,0.28)';
  ctx.lineWidth = 0.6;
  for (let i = 1; i <= 2; i++) {
    const px = x + dir * (b.w * 0.32 * i) + w1 * i * 0.5;
    ctx.beginPath();
    ctx.moveTo(px, y + 2 + i * 0.8);
    ctx.quadraticCurveTo(px + dir * 1.2, y + b.len * 0.5, px + w2 * 0.4, botY - 1.5 - i * 1.4);
    ctx.stroke();
  }
  // emblem
  sparkle(ctx, x + dir * b.w * 0.42, y + b.len * 0.42, Math.min(3.4, b.w * 0.34), 'rgba(255,240,196,0.92)', 0.4);
}

/** Muzzle flash + smoke, scaled by the fire animation. */
function drawFlash(ctx: CanvasRenderingContext2D, kind: FlashKind, x: number, y: number, ease: number, ph: number): void {
  const k = Math.max(0, Math.min(1, ease));
  if (k <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 1.5);
  const grow = 0.6 + k * 0.6;

  if (kind === 'melee') {
    ctx.strokeStyle = 'rgba(255,248,214,0.95)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = ph + i * 1.57 + 0.3;
      const r0 = 1.6;
      const r1 = (4.4 + i) * grow;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      ctx.stroke();
    }
    sparkle(ctx, x, y, 3.4 * grow, 'rgba(255,255,230,0.95)', 0.5);
    ctx.restore();
    return;
  }

  if (kind === 'arrow') {
    // white-hot streak leaving the bow
    ctx.beginPath();
    ctx.moveTo(x - 7 * grow, y + 0.9);
    ctx.lineTo(x + 13 * grow, y - 1.1);
    ctx.lineTo(x + 13 * grow, y + 1.1);
    ctx.lineTo(x - 7 * grow, y - 0.9);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,252,232,0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,140,0.9)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    sparkle(ctx, x + 1, y, 4.2 * grow, 'rgba(255,255,238,0.95)', 0.5);
    ctx.fillStyle = 'rgba(255,236,190,0.55)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x - 4 - i * 3.2, y + Math.sin(ph + i) * 1.2, 0.8, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (kind === 'magic') {
    const r = 9 * grow;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, 'rgba(255,238,255,0.95)');
    glow.addColorStop(0.4, 'rgba(214,150,255,0.6)');
    glow.addColorStop(1, 'rgba(150,80,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    sparkle(ctx, x, y, 5 * grow, 'rgba(255,250,255,0.95)', 0.5);
    ctx.strokeStyle = 'rgba(226,170,255,0.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.15, r * 0.42, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // powder: hot core, star burst, smoke rings drifting up
  const r = 11 * grow;
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
  glow.addColorStop(0, 'rgba(255,255,236,0.98)');
  glow.addColorStop(0.32, 'rgba(255,206,96,0.85)');
  glow.addColorStop(0.66, 'rgba(255,132,40,0.42)');
  glow.addColorStop(1, 'rgba(180,60,20,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,220,130,0.9)';
  for (let i = 0; i < 6; i++) {
    const a = ph * 1.7 + (i / 6) * TAU;
    const len = (5 + (i % 3) * 3.2) * grow;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 1.4, y + Math.sin(a) * 1.4);
    ctx.lineTo(x + Math.cos(a + 0.22) * len, y + Math.sin(a + 0.22) * len);
    ctx.lineTo(x + Math.cos(a) * len * 0.72, y + Math.sin(a) * len * 0.72);
    ctx.closePath();
    ctx.fill();
  }
  const drift = (1 - k) * 7;
  ctx.fillStyle = `rgba(96,88,96,${0.15 + (1 - k) * 0.22})`;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.arc(x - 3 - i * 5 - drift, y - 2 - drift * 0.7 - i * 1.5, (2.6 + i * 1.7) * grow, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** Three arcane orbs circling the crystal (arcane_blast specialisation). */
function arcaneOrbs(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, t: number, ph: number): void {
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const a = t * 1.6 + ph + (i / 3) * TAU;
    const ox = x + Math.cos(a) * rx;
    const oy = y + Math.sin(a) * ry;
    const depth = 0.7 + 0.3 * Math.sin(a);
    const rr = 3.4 * depth;
    const glow = ctx.createRadialGradient(ox, oy, 0, ox, oy, rr * 3.2);
    glow.addColorStop(0, 'rgba(255,214,255,0.75)');
    glow.addColorStop(0.4, 'rgba(206,120,255,0.34)');
    glow.addColorStop(1, 'rgba(150,60,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(ox, oy, rr * 3.2, 0, TAU);
    ctx.fill();
    ellPath(ctx, ox, oy, rr, rr);
    ink(ctx, '#e9a8ff', 0.7);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(ox - rr * 0.3, oy - rr * 0.35, rr * 0.34, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** Stun: a golden swirl around the top plus orbiting vector stars. */
function drawStun(ctx: CanvasRenderingContext2D, x: number, top: number, t: number, ph: number): void {
  const cy = top - 4;
  ctx.save();
  for (let i = 0; i < 2; i++) {
    const a0 = t * 3.3 + ph + i * Math.PI;
    ctx.beginPath();
    ctx.ellipse(x, cy, 15.5, 5.6, 0, a0, a0 + 2.05);
    ctx.strokeStyle = SHADOW_TINT;
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = i === 0 ? '#ffd54a' : '#ffefa8';
    ctx.lineWidth = 1.9;
    ctx.stroke();
  }
  for (let i = 0; i < 3; i++) {
    const a = t * 2.5 + ph + (i / 3) * TAU;
    const sx = x + Math.cos(a) * 15;
    const sy = cy + Math.sin(a) * 5.4 - 2.6 - Math.cos(a * 2) * 1.6;
    const sc = 0.72 + 0.28 * Math.sin(a * 1.5 + 1);
    sparkle(ctx, sx, sy, 4.6 * sc, GOLD, 0.9);
  }
  ctx.restore();
}

// ═══ ARCHER TOWER ════════════════════════════════════════════════
// L1 a timber watch post on stilts · L2 a braced blockhouse with a
// tiled lean-to · L3 a stone tower with a crenellated parapet.
// Sharpshooter adds a spire + a cloaked sniper and a spyglass,
// Rapid Volley adds an awning and a rack of filled quivers.

interface ArcherGeo extends TowerGeo {
  /** Local y the archers stand on. */
  deckY: number;
  crewScale: number;
}

function archerGeo(level: number, spec: string | null): ArcherGeo {
  if (spec === 'sharpshooter') {
    return {
      ...makeGeo(level, spec, -114, 30, {
        revolver: 1.4,
        muzzle: { x: 15, y: -74 },
        flash: 'arrow',
        glows: [{ x: 0, y: -88, w: 4.4, h: 6.4, arched: true }],
        torches: [{ x: 17, y: -38, s: 1 }],
        banner: { x: -19, y: -84, len: 15, w: 8, color: '#3f8f45', flip: true },
      }),
      deckY: -62,
      crewScale: 1,
    };
  }
  if (spec === 'rapid_volley') {
    return {
      ...makeGeo(level, spec, -88, 31, {
        revolver: 1.6,
        muzzle: { x: 13, y: -74 },
        flash: 'arrow',
        torches: [{ x: 17, y: -38, s: 1 }],
        banner: { x: -19, y: -84, len: 15, w: 8, color: '#3f8f45', flip: true },
      }),
      deckY: -62,
      crewScale: 0.92,
    };
  }
  if (level === 0) {
    return {
      ...makeGeo(level, spec, -62, 28, {
        revolver: 1.4,
        muzzle: { x: 8, y: -50 },
        flash: 'arrow',
        torches: [{ x: 12.6, y: -32, s: 0.92 }],
        banner: { x: -16, y: -60, len: 14, w: 8, color: '#4a9a52', flip: true },
      }),
      deckY: -38,
      crewScale: 1.05,
    };
  }
  if (level === 1) {
    return {
      ...makeGeo(level, spec, -80, 30, {
        revolver: 1.5,
        muzzle: { x: 11, y: -66 },
        flash: 'arrow',
        glows: [{ x: 1, y: -72.5, w: 4.4, h: 5, arched: false }],
        torches: [{ x: -14.6, y: -26, s: 0.95 }],
        banner: { x: 19, y: -78, len: 15, w: 8.5, color: '#4a9a52', flip: false },
      }),
      deckY: -56,
      crewScale: 0.98,
    };
  }
  return {
    ...makeGeo(level, spec, -86, 30, {
      revolver: 1.5,
      muzzle: { x: 12, y: -72 },
      flash: 'arrow',
      glows: [{ x: -5, y: -46, w: 5.4, h: 7.6, arched: true }],
      torches: [{ x: 17, y: -38, s: 1 }],
      banner: { x: -19, y: -84, len: 15, w: 8, color: '#4a9a52', flip: true },
    }),
    deckY: -62,
    crewScale: 1,
  };
}

/** Bow with an optional drawn string. */
function bowProp(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, drawn: number): void {
  const r = 4.7 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI * 0.62, Math.PI * 0.62);
  ctx.strokeStyle = SHADOW_TINT;
  ctx.lineWidth = 2.3 * s;
  ctx.stroke();
  ctx.strokeStyle = '#8a5a2c';
  ctx.lineWidth = 1.2 * s;
  ctx.stroke();
  const a0 = -Math.PI * 0.62;
  const a1 = Math.PI * 0.62;
  const pull = drawn * 3.4 * s;
  ctx.strokeStyle = 'rgba(242,238,222,0.92)';
  ctx.lineWidth = 0.55 * s;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r);
  ctx.lineTo(x - pull, y);
  ctx.lineTo(x + Math.cos(a1) * r, y + Math.sin(a1) * r);
  ctx.stroke();
  // grip
  line(ctx, x + r * 0.9, y - 1.6 * s, x + r * 0.9, y + 1.6 * s, '#5a3a1c', 1.4 * s);
  if (drawn > 0.5) {
    line(ctx, x - pull, y, x + r * 1.9, y, '#c9a86a', 0.7 * s);
    polyPath(ctx, [[x + r * 1.9, y], [x + r * 1.4, y - 1 * s], [x + r * 1.4, y + 1 * s]]);
    ctx.fillStyle = '#e8e4d4';
    ctx.fill();
  }
}

/** Hand-drawn archer: legs, tunic, quiver, head, hood and a bow. */
function archerFigure(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, cloth: string, aim: boolean, cloak: boolean): void {
  const legC = darken(cloth, 0.24);
  const trim = lighten(cloth, 0.22);
  if (cloak) {
    polyPath(ctx, [[x - 1.6 * s, y - 12.4 * s], [x + 2.4 * s, y - 12 * s], [x + 4.6 * s, y + 0.4 * s], [x - 4.2 * s, y + 0.4 * s]]);
    ink(ctx, grad(ctx, x - 3 * s, y - 12 * s, x + 4 * s, y, darken(cloth, 0.3), 0.24, 0.3), 0.9);
  }
  // quiver behind the back
  roundRectPath(ctx, x - 3.6 * s, y - 11.6 * s, 2.4 * s, 6.4 * s, 0.9 * s);
  ink(ctx, grad(ctx, x - 4 * s, y - 12 * s, x - 1 * s, y - 5 * s, LEATHER, 0.3, 0.3), 0.7);
  for (let i = 0; i < 3; i++) {
    line(ctx, x - 3.3 * s + i * 0.8 * s, y - 11.6 * s, x - 3.5 * s + i * 0.8 * s, y - 13.6 * s, '#c9a86a', 0.5 * s);
  }
  // legs
  ctx.lineCap = 'round';
  ctx.strokeStyle = SHADOW_TINT;
  ctx.lineWidth = 2.9 * s;
  ctx.beginPath();
  ctx.moveTo(x - 1.2 * s, y - 5.6 * s);
  ctx.lineTo(x - 1.8 * s, y - 1 * s);
  ctx.moveTo(x + 1.2 * s, y - 5.6 * s);
  ctx.lineTo(x + 2 * s, y - 1 * s);
  ctx.stroke();
  ctx.strokeStyle = legC;
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.moveTo(x - 1.2 * s, y - 5.6 * s);
  ctx.lineTo(x - 1.8 * s, y - 1 * s);
  ctx.moveTo(x + 1.2 * s, y - 5.6 * s);
  ctx.lineTo(x + 2 * s, y - 1 * s);
  ctx.stroke();
  line(ctx, x - 2.6 * s, y - 0.7 * s, x - 1.2 * s, y - 0.7 * s, '#41301f', 1.3 * s);
  line(ctx, x + 1.4 * s, y - 0.7 * s, x + 2.8 * s, y - 0.7 * s, '#41301f', 1.3 * s);
  // tunic
  polyPath(ctx, [[x - 2.6 * s, y - 5.4 * s], [x - 2.3 * s, y - 11.6 * s], [x + 2.3 * s, y - 11.6 * s], [x + 2.6 * s, y - 5.4 * s]]);
  ink(ctx, bodyGradient(ctx, x, y - 11.6 * s, y - 5 * s, cloth, 0.24, 0.3), 1.1);
  line(ctx, x - 2.4 * s, y - 6.6 * s, x + 2.5 * s, y - 6.6 * s, darken(cloth, 0.4), 0.9);
  // pauldron
  ellPath(ctx, x - 2.1 * s, y - 11.2 * s, 1.5 * s, 1.2 * s);
  ink(ctx, trim, 0.7);
  // head
  ellPath(ctx, x + 0.2 * s, y - 13.6 * s, 1.9 * s, 2 * s);
  ink(ctx, SKIN, 0.8);
  // hood
  ctx.beginPath();
  ctx.moveTo(x - 1.9 * s, y - 13.2 * s);
  ctx.quadraticCurveTo(x + 0.2 * s, y - 17.6 * s, x + 2.3 * s, y - 13.4 * s);
  ctx.quadraticCurveTo(x + 2.4 * s, y - 12.2 * s, x + 1.2 * s, y - 12.2 * s);
  ctx.quadraticCurveTo(x + 0.2 * s, y - 14.6 * s, x - 0.4 * s, y - 12.6 * s);
  ctx.closePath();
  ink(ctx, grad(ctx, x - 2 * s, y - 17 * s, x + 2 * s, y - 12 * s, darken(cloth, 0.12), 0.26, 0.3), 0.8);
  // arms
  const ax = aim ? x + 5.2 * s : x + 2.6 * s;
  const ay = aim ? y - 9.4 * s : y - 7.6 * s;
  ctx.strokeStyle = SHADOW_TINT;
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.moveTo(x - 1.6 * s, y - 10.6 * s);
  ctx.lineTo(ax - 0.6 * s, ay - 0.6 * s);
  ctx.moveTo(x + 1.6 * s, y - 10.8 * s);
  ctx.lineTo(ax + 0.2 * s, ay + 0.2 * s);
  ctx.stroke();
  ctx.strokeStyle = darken(cloth, 0.14);
  ctx.lineWidth = 1.3 * s;
  ctx.beginPath();
  ctx.moveTo(x - 1.6 * s, y - 10.6 * s);
  ctx.lineTo(ax - 0.6 * s, ay - 0.6 * s);
  ctx.moveTo(x + 1.6 * s, y - 10.8 * s);
  ctx.lineTo(ax + 0.2 * s, ay + 0.2 * s);
  ctx.stroke();
  bowProp(ctx, aim ? x + 6.6 * s : x + 3.6 * s, aim ? y - 9.6 * s : y - 8.4 * s, s, aim ? 1 : 0);
}

/** Tripod-mounted spyglass (sharpshooter). */
function spyglass(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  line(ctx, x - 3.4 * s, y, x, y - 6 * s, WOOD_D, 1.1 * s);
  line(ctx, x + 3.2 * s, y, x, y - 6 * s, WOOD_D, 1.1 * s);
  line(ctx, x + 0.4 * s, y - 0.4 * s, x, y - 6 * s, '#8a6a44', 1.2 * s);
  line(ctx, x - 3.4 * s, y, x + 3.2 * s, y, WOOD_D, 0.9 * s);
  // brass tube aimed up-right
  ctx.save();
  ctx.translate(x, y - 7.4 * s);
  ctx.rotate(-0.42);
  roundRectPath(ctx, -1.6 * s, -1.5 * s, 7.4 * s, 3 * s, 1.1 * s);
  ink(ctx, grad(ctx, -2 * s, -2 * s, 6 * s, 2 * s, GOLD, 0.34, 0.36), 0.9);
  roundRectPath(ctx, 5.2 * s, -2 * s, 2.6 * s, 4 * s, 1 * s);
  ink(ctx, mix(GOLD, '#fff3d4', 0.2), 0.8);
  ctx.restore();
}

/** Arrow rack: leather quivers stuffed with fletched arrows. */
function quiverRack(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  roundRectPath(ctx, x - 2.3 * s, y - 9 * s, 4.6 * s, 9.4 * s, 1.4 * s);
  ink(ctx, grad(ctx, x - 2.3 * s, y - 9 * s, x + 2.3 * s, y, LEATHER, 0.3, 0.34), 1);
  line(ctx, x - 2.4 * s, y - 5.6 * s, x + 2.4 * s, y - 5.6 * s, '#5c3c20', 1 * s);
  for (let i = 0; i < 4; i++) {
    const ax = x - 1.5 * s + i * 1 * s;
    line(ctx, ax, y - 9 * s, ax + 0.5 * s, y - 13.6 * s, '#c9a86a', 0.6 * s);
    polyPath(ctx, [[ax + 0.5 * s, y - 13.6 * s], [ax - 0.4 * s, y - 12.4 * s], [ax + 1.4 * s, y - 12.4 * s]]);
    ctx.fillStyle = i % 2 === 0 ? color : '#e8e4d4';
    ctx.fill();
  }
}

function archerL1Body(ctx: CanvasRenderingContext2D, g: ArcherGeo, color: string): void {
  const deck = g.deckY;
  const legTop = deck - 3;
  const railY = deck - 20;
  plinth(ctx, 19, '#8d7c60', '#ab9877');
  // ladder leaning on the back left
  line(ctx, -20, 0.5, -15, legTop - 3, SHADOW_TINT, 2.6);
  line(ctx, -20, 0.5, -15, legTop - 3, WOOD_D, 1.6);
  line(ctx, -15.6, 0.6, -10.6, legTop - 3, SHADOW_TINT, 2.6);
  line(ctx, -15.6, 0.6, -10.6, legTop - 3, WOOD_D, 1.6);
  for (let i = 1; i <= 4; i++) {
    const t = i / 5;
    line(ctx, -20 + 5 * t, 0.5 + (legTop - 3.5) * t, -15.6 + 5 * t, 0.6 + (legTop - 3.6) * t, WOOD_L, 1.4);
  }
  // back legs
  beam(ctx, -8.5, legTop - 5, -2, 3.4, WOOD_D);
  beam(ctx, 8.5, legTop - 5, -2, 3.4, WOOD_D);
  // deck
  rectPath(ctx, -17.5, deck - 6.4, 35, 6.4);
  ink(ctx, grad(ctx, -17.5, deck - 6.4, 17.5, deck, WOOD, 0.3, 0.36), 1.3);
  woodGrain(ctx, -17.5, deck - 6.4, 35, 6.4, false);
  ctx.fillStyle = mix(WOOD, '#fff3d4', 0.34);
  ctx.fillRect(-17.5, deck - 6.4, 35, 1.3);
  // support brackets
  for (const bx of [-1, 1]) {
    polyPath(ctx, [[bx * 13, deck], [bx * 17.5, deck], [bx * 13, deck + 8]]);
    ink(ctx, WOOD_D, 1);
  }
  // front legs with cross bracing
  beam(ctx, -12.5, legTop, 0, 4.4, WOOD);
  beam(ctx, 12.5, legTop, 0, 4.4, WOOD);
  line(ctx, -12.5, legTop + 2, 12.5, -4, '#5f4020', 1.6);
  line(ctx, 12.5, legTop + 2, -12.5, -4, '#5f4020', 1.6);
  line(ctx, -12.5, -12, 12.5, -12, WOOD_D, 1.8);
  // railing
  for (const px of [-15, -7.5, 7.5, 15]) {
    beam(ctx, px, railY, deck, 2.4, WOOD);
  }
  rectPath(ctx, -15.5, railY + 1, 31, 2.2);
  ink(ctx, WOOD, 0.9);
  rectPath(ctx, -15.5, railY + 9.5, 31, 2);
  ink(ctx, WOOD_D, 0.9);
  // crate of spare arrows on the deck
  quiverRack(ctx, 12.6, deck, 0.72, color);
  // props on the ground
  barrelProp(ctx, 17.5, -1, 9.6, 12.5);
  crateProp(ctx, -17.5, -1.5, 10, 8.4);
  torchBracket(ctx, 12.6, -32, 0.92);
  mast(ctx, -16, -60, deck, '#4a9a52');
  levelPips(ctx, g.level, g.spec, 7);
}

function archerL2Body(ctx: CanvasRenderingContext2D, g: ArcherGeo, color: string): void {
  const deck = g.deckY;
  const legTop = deck - 2;
  plinth(ctx, 21, '#8d7c60', '#ab9877');
  // stone foundation
  rectPath(ctx, -16, -16, 32, 16);
  ink(ctx, bodyGradient(ctx, 0, -16, 0, STONE, 0.24, 0.34), 1.4);
  wallCourses(ctx, -16, -16, 32, 16, 3);
  // back posts
  beam(ctx, -10, legTop - 8, -13, 4.2, WOOD_D);
  beam(ctx, 10, legTop - 8, -13, 4.2, WOOD_D);
  // wainscot
  planks(ctx, -14, -32, 28, 14, WOOD_D, 7);
  rectPath(ctx, -14, -32, 28, 14);
  ctx.strokeStyle = SHADOW_TINT;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  line(ctx, -14, -32, 14, -32, '#4f3a20', 1.4);
  line(ctx, -14, -18.4, 14, -18.4, '#4f3a20', 1.4);
  // tiled lean-to over the left half
  tileRoof(ctx, -10, deck - 14, deck - 24, 11.5, '#7c5b3c');
  line(ctx, -1, deck - 17, -1, deck - 6, WOOD_D, 2.2);
  line(ctx, -14.5, deck - 12.6, -14.5, deck - 5, WOOD_D, 2);
  // deck
  rectPath(ctx, -19, deck - 6.4, 38, 6.4);
  ink(ctx, grad(ctx, -19, deck - 6.4, 19, deck, WOOD, 0.3, 0.36), 1.3);
  woodGrain(ctx, -19, deck - 6.4, 38, 6.4, false);
  ctx.fillStyle = mix(WOOD, '#fff3d4', 0.34);
  ctx.fillRect(-19, deck - 6.4, 38, 1.4);
  for (const bx of [-1, 1]) {
    polyPath(ctx, [[bx * 14.5, deck], [bx * 19, deck], [bx * 14.5, deck + 9]]);
    ink(ctx, WOOD_D, 1);
  }
  // front posts + bracing
  beam(ctx, -14, legTop, -12, 5.4, WOOD);
  beam(ctx, 14, legTop, -12, 5.4, WOOD);
  line(ctx, -14, legTop - 4, 14, -18, '#5f4020', 2);
  line(ctx, 14, legTop - 4, -14, -18, '#5f4020', 2);
  line(ctx, -14, -40, 14, -40, WOOD_D, 1.8);
  // railing
  for (const px of [-16.5, -5, 6, 16.5]) {
    beam(ctx, px, deck - 18, deck, 2.6, WOOD);
  }
  rectPath(ctx, -17.5, deck - 17, 35, 2.4);
  ink(ctx, WOOD, 1);
  rectPath(ctx, -17.5, deck - 8.5, 35, 2.2);
  ink(ctx, WOOD_D, 1);
  // hanging kit
  shieldProp(ctx, 14, deck - 8, 9, 12, '#6f7f4a', 'none');
  ropeCoil(ctx, -12.5, deck - 12, 4);
  // lantern under the lean-to
  roundRectPath(ctx, -1.5, deck - 20, 5, 7, 1.2);
  ink(ctx, grad(ctx, -1.5, deck - 20, 3.5, deck - 13, IRON, 0.3, 0.4), 0.9);
  line(ctx, -1.5, deck - 20, -1.5, deck - 14, IRON_D, 0.9);
  quiverRack(ctx, -17, deck, 0.78, color);
  // ground props
  barrelProp(ctx, -20, -1, 10, 13);
  crateProp(ctx, 19, -1.5, 10.5, 9);
  torchBracket(ctx, -14.6, -26, 0.95);
  mast(ctx, 19, -78, deck, '#4a9a52');
  levelPips(ctx, g.level, g.spec, 7);
}

function archerL3Body(ctx: CanvasRenderingContext2D, g: ArcherGeo, color: string): void {
  const deck = g.deckY;
  plinth(ctx, 23, '#8d7c60', '#ab9877');
  // footing + shaft
  rectPath(ctx, -16, -18, 32, 18);
  ink(ctx, bodyGradient(ctx, 0, -18, 0, STONE, 0.26, 0.34), 1.4);
  wallCourses(ctx, -16, -18, 32, 18, 3);
  rectPath(ctx, -13.5, deck - 2, 27, -deck - 16);
  ink(ctx, bodyGradient(ctx, 0, deck - 2, -16, STONE, 0.3, 0.34), 1.5);
  wallCourses(ctx, -13.5, -64, 27, 48, 8);
  // corner quoins
  for (let i = 0; i < 6; i++) {
    const y = -18 - i * 8;
    rectPath(ctx, -14.4, y - 6, 4.6, 6.6);
    ink(ctx, mix(STONE, '#fff3d4', i % 2 === 0 ? 0.16 : 0.04), 0.7);
    rectPath(ctx, 9.8, y - 6, 4.6, 6.6);
    ink(ctx, mix(STONE, COOL_SHADOW, 0.14), 0.7);
  }
  // door
  archDoor(ctx, 0, 9, 13);
  // window + slit
  windowBaked(ctx, -5, -46, 5.4, 7.6, true);
  arrowSlit(ctx, 5.6, -30, 3.4, 7.4);
  // corbels under the parapet
  rectPath(ctx, -16.5, deck - 2, 33, 5.4);
  ink(ctx, grad(ctx, -16.5, deck - 2, 16.5, deck + 3, STONE_D, 0.24, 0.3), 1.2);
  for (let i = 0; i < 4; i++) {
    const bx = -12 + i * 8;
    polyPath(ctx, [[bx - 2.4, deck + 3.4], [bx + 2.4, deck + 3.4], [bx + 1.4, deck + 7.4], [bx - 1.4, deck + 7.4]]);
    ink(ctx, STONE_D, 0.7);
  }
  // parapet + crenellations
  rectPath(ctx, -16, deck - 10, 32, 8.6);
  ink(ctx, bodyGradient(ctx, 0, deck - 10, deck - 1.4, STONE, 0.28, 0.32), 1.4);
  wallCourses(ctx, -16, deck - 10, 32, 8.6, 2);
  if (g.spec === 'rapid_volley') crenels(ctx, -16.5, -1, deck - 10.4, 2, 5.6, 6.6);
  else crenels(ctx, -16.5, 16.5, deck - 10.4, 4, 5.6, 6.6);
  // stairs + ground props
  for (let i = 0; i < 3; i++) {
    rectPath(ctx, 15 + i * 1.6, -4 - i * 5.6, 5.4 - i * 1.2, 5.6);
    ink(ctx, mix(STONE, COOL_SHADOW, 0.08 + i * 0.06), 0.8);
  }
  barrelProp(ctx, -20.5, -1, 10, 13);
  quiverRack(ctx, 20, -1.5, 0.9, color);
  torchBracket(ctx, 17, -38, 1);
  if (g.spec === 'sharpshooter') {
    // sniper spire
    shaft(ctx, 0, deck - 34, deck - 8, 5.4, 7.2, STONE, 5);
    windowBaked(ctx, 0, deck - 26, 4.4, 6.4, true);
    ellPath(ctx, 0, deck - 34, 5.6, 1.9);
    ink(ctx, mix(STONE, '#fff3d4', 0.2), 1);
    tileRoof(ctx, 0, deck - 36, deck - 48, 7.4, '#6c4f33');
    line(ctx, 0, deck - 48, 0, deck - 52, WOOD_D, 1.6);
    spyglass(ctx, -9.5, deck, 0.95);
  } else if (g.spec === 'rapid_volley') {
    // an awning covers the right half of the parapet
    beam(ctx, -1, deck - 14, deck, 2.6, WOOD);
    beam(ctx, 18, deck - 14, deck, 2.6, WOOD);
    tileRoof(ctx, 8.5, deck - 14, deck - 26, 10.8, '#6c4f33');
    quiverRack(ctx, -7.5, deck - 1, 0.95, '#4a9a52');
    quiverRack(ctx, 1, deck - 1, 0.95, '#4a9a52');
    quiverRack(ctx, 9.5, deck - 1, 0.95, '#4a9a52');
  }
  mast(ctx, -19, -84, deck - 4, '#3f8f45');
  levelPips(ctx, g.level, g.spec, 7);
}

function archerBody(ctx: CanvasRenderingContext2D, g: ArcherGeo, color: string): void {
  if (g.spec === null && g.level === 0) archerL1Body(ctx, g, color);
  else if (g.spec === null && g.level === 1) archerL2Body(ctx, g, color);
  else archerL3Body(ctx, g, color);
}

function archerCrew(ctx: CanvasRenderingContext2D, g: ArcherGeo, color: string): void {
  const d = g.deckY;
  const s = g.crewScale;
  if (g.spec === 'sharpshooter') {
    archerFigure(ctx, 8.5, d, 1.05, color, true, true);
    return;
  }
  if (g.spec === 'rapid_volley') {
    archerFigure(ctx, -10, d, 0.86 * s, color, true, false);
    archerFigure(ctx, 0.5, d, 0.86 * s, color, true, false);
    archerFigure(ctx, 11, d, 0.86 * s, color, true, false);
    return;
  }
  if (g.level === 0) {
    archerFigure(ctx, 0, d, s, color, false, false);
    return;
  }
  if (g.level === 1) {
    archerFigure(ctx, -5, d, s, color, true, false);
    archerFigure(ctx, 5.5, d, s, color, false, false);
    return;
  }
  archerFigure(ctx, -5.5, d, s, color, true, false);
  archerFigure(ctx, 6.5, d, s, color, false, false);
}

// ═══ MAGE TOWER ══════════════════════════════════════════════════
// L1 an apprentice camp under a striped canvas · L2 a stone chantry
// crowned by a floating crystal · L3 a tapered arcane spire with a
// balcony, twin lit windows and a huge levitating crystal.

interface MageGeo extends TowerGeo {
  standY: number;
  crewScale: number;
}

function mageGeo(level: number, spec: string | null): MageGeo {
  if (spec === 'arcane_blast') {
    return {
      ...makeGeo(level, spec, -116, 34, {
        revolver: 1.2,
        muzzle: { x: 0, y: -96 },
        flash: 'magic',
        glows: [{ x: 0, y: -58, w: 6, h: 9, arched: true }, { x: 0, y: -26, w: 5.4, h: 8.4, arched: true }],
        torches: [{ x: -19, y: -50, s: 0.95 }, { x: 19, y: -50, s: 0.95 }],
        banner: { x: 20, y: -110, len: 16, w: 9, color: '#9a49c4', flip: false },
        orbs: { x: 0, y: -96, rx: 19, ry: 6.5 },
      }),
      standY: -46,
      crewScale: 0.95,
    };
  }
  if (spec === 'slow_hex') {
    return {
      ...makeGeo(level, spec, -114, 33, {
        revolver: 1.2,
        muzzle: { x: 0, y: -98 },
        flash: 'magic',
        glows: [{ x: 0, y: -58, w: 6, h: 9, arched: true }, { x: 0, y: -26, w: 5.4, h: 8.4, arched: true }],
        torches: [{ x: -19, y: -50, s: 0.95 }],
        banner: { x: -20, y: -108, len: 16, w: 9, color: '#3f7fc4', flip: true },
      }),
      standY: -46,
      crewScale: 0.95,
    };
  }
  if (level === 0) {
    return {
      ...makeGeo(level, spec, -60, 28, {
        revolver: 1.2,
        muzzle: { x: -13, y: -32 },
        flash: 'magic',
        glows: [{ x: -3, y: -17, w: 3.4, h: 4.4, arched: false }],
        torches: [{ x: 13, y: -12, s: 1.1 }],
        banner: { x: -13, y: -56, len: 13, w: 7.5, color: '#9a49c4', flip: true },
      }),
      standY: -1,
      crewScale: 1,
    };
  }
  if (level === 1) {
    return {
      ...makeGeo(level, spec, -82, 28, {
        revolver: 1.2,
        muzzle: { x: 0, y: -70 },
        flash: 'magic',
        glows: [{ x: 0, y: -38, w: 6, h: 9, arched: true }],
        torches: [{ x: 16.5, y: -6, s: 1 }],
        banner: { x: -17, y: -78, len: 15, w: 8, color: '#9a49c4', flip: true },
      }),
      standY: -58,
      crewScale: 0.95,
    };
  }
  return {
    ...makeGeo(level, spec, -112, 32, {
      revolver: 1.2,
      muzzle: { x: 0, y: -96 },
      flash: 'magic',
      glows: [{ x: 0, y: -58, w: 6, h: 9, arched: true }, { x: 0, y: -26, w: 5.4, h: 8.4, arched: true }],
      torches: [{ x: 18, y: -50, s: 0.95 }],
      banner: { x: 20, y: -110, len: 16, w: 9, color: '#9a49c4', flip: false },
    }),
    standY: -46,
    crewScale: 0.95,
  };
}

/** Floating crystal: glow, bipyramid body, lit facet, highlight. */
function crystalProp(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, halo = true): void {
  if (halo) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 2.8);
    glow.addColorStop(0, 'rgba(255,255,255,0.32)');
    glow.addColorStop(0.35, 'rgba(214,150,255,0.22)');
    glow.addColorStop(1, 'rgba(150,60,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.8, 0, TAU);
    ctx.fill();
  }
  polyPath(ctx, [[x, y - r * 1.45], [x + r * 0.6, y - r * 0.15], [x, y + r * 0.8], [x - r * 0.6, y - r * 0.15]]);
  ink(ctx, grad(ctx, x - r * 0.6, y - r * 1.4, x + r * 0.6, y + r * 0.7, color, 0.4, 0.3), 1);
  polyPath(ctx, [[x, y - r * 1.45], [x + r * 0.6, y - r * 0.15], [x + r * 0.12, y - r * 0.1], [x - r * 0.06, y - r * 1.2]]);
  ctx.fillStyle = mix(color, '#ffffff', 0.55);
  ctx.fill();
  line(ctx, x - r * 0.6, y - r * 0.15, x + r * 0.6, y - r * 0.15, mix(color, '#ffffff', 0.3), 0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(x - r * 0.18, y - r * 0.85, Math.max(0.5, r * 0.14), 0, TAU);
  ctx.fill();
}

/** Rune ring carved into stone (or hanging in the air under a crystal). */
function runeRing(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, marks: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.34, 0, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < marks; i++) {
    const a = (i / marks) * TAU;
    const mx = x + Math.cos(a) * r;
    const my = y + Math.sin(a) * r * 0.34;
    polyPath(ctx, [[mx, my - 2], [mx + 1.5, my], [mx, my + 2], [mx - 1.5, my]]);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

/** Rune band on a tower shaft: chevrons and dots in a carved groove. */
function runeBand(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string): void {
  ctx.strokeStyle = 'rgba(42,31,56,0.4)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - 3);
  ctx.lineTo(x + w / 2, y - 3);
  ctx.moveTo(x - w / 2, y + 3);
  ctx.lineTo(x + w / 2, y + 3);
  ctx.stroke();
  const n = Math.max(2, Math.round(w / 6));
  for (let i = 0; i < n; i++) {
    const cx = x - w / 2 + (w / n) * (i + 0.5);
    if (i % 2 === 0) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - 2, y + 1.8);
      ctx.lineTo(cx, y - 2);
      ctx.lineTo(cx + 2, y + 1.8);
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, y, 1.1, 0, TAU);
      ctx.fill();
    }
  }
}

function mageL1Body(ctx: CanvasRenderingContext2D, g: MageGeo, color: string): void {
  const eave = -42;
  plinth(ctx, 19, '#87837c', '#a5a199');
  // poles
  beam(ctx, -12.5, -42, 0, 3.6, WOOD);
  beam(ctx, 12.5, -42, 0, 3.6, WOOD);
  beam(ctx, -10, -46, -34, 2.6, WOOD_D);
  beam(ctx, 10, -46, -34, 2.6, WOOD_D);
  // hanging charm string
  line(ctx, -12.5, -40, 12.5, -40, '#c9a86a', 0.8);
  for (let i = 0; i < 3; i++) {
    const cx = -7 + i * 7;
    polyPath(ctx, [[cx, -40], [cx + 1.8, -37.6], [cx, -35.2], [cx - 1.8, -37.6]]);
    ink(ctx, i % 2 === 0 ? color : '#c9a86a', 0.6);
  }
  // canvas canopy
  const cw = 18;
  const cTop = -56;
  const shape = (): void => polyPath(ctx, [[-cw, eave], [-cw + 3, cTop], [cw - 3, cTop], [cw, eave]]);
  shape();
  ink(ctx, grad(ctx, -cw, cTop, cw, eave, color, 0.32, 0.32), 1.4);
  ctx.save();
  shape();
  ctx.clip();
  ctx.strokeStyle = mix(color, '#fff3d4', 0.34);
  ctx.lineWidth = 1.6;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 8 - 2, cTop - 2);
    ctx.lineTo(i * 9.5 - 2, eave + 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(42,31,56,0.22)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 4; i++) {
    const yy = cTop + ((eave - cTop) / 4) * (i + 1);
    ctx.beginPath();
    ctx.moveTo(-cw, yy);
    ctx.lineTo(cw, yy);
    ctx.stroke();
  }
  ctx.restore();
  // scalloped hem
  for (let i = 0; i < 5; i++) {
    const sx = -cw + (cw * 2 / 5) * (i + 0.5);
    ctx.beginPath();
    ctx.arc(sx, eave, cw / 5, 0, Math.PI);
    ink(ctx, mix(color, COOL_SHADOW, 0.16), 0.8);
  }
  // guy ropes
  line(ctx, -cw, eave + 1, -21, 0, '#c9a86a', 0.8);
  line(ctx, cw, eave + 1, 21, 0, '#c9a86a', 0.8);
  // desk with books, scroll and a candle
  rectPath(ctx, -11, -16, 17, 4);
  ink(ctx, grad(ctx, -11, -16, 6, -12, WOOD, 0.3, 0.34), 1.1);
  line(ctx, -10, -12, -10, 0, WOOD_D, 2.4);
  line(ctx, 4.4, -12, 4.4, 0, WOOD_D, 2.4);
  rectPath(ctx, -9.6, -19.6, 6.4, 3.6);
  ink(ctx, '#8d3a3a', 0.7);
  rectPath(ctx, -8.2, -22.6, 6.4, 3.2);
  ink(ctx, '#3a4a8d', 0.7);
  rectPath(ctx, 1.6, -17.6, 6, 2.2);
  ink(ctx, BONE, 0.6);
  line(ctx, -3, -16, -3, -20.6, BONE, 1.8);
  // brazier
  torchBracket(ctx, 13, -12, 1.15);
  barrelProp(ctx, 18.5, -1, 9.6, 12);
  mast(ctx, -13, -56, -42, color);
  levelPips(ctx, g.level, g.spec, 7);
}

function mageL2Body(ctx: CanvasRenderingContext2D, g: MageGeo, color: string): void {
  plinth(ctx, 20, '#87837c', '#a5a199');
  shaft(ctx, 0, -54, -2, 13, 15, '#8d8a86', 6);
  archDoor(ctx, 0, 10, 14);
  windowBaked(ctx, 0, -38, 6, 9, true);
  runeBand(ctx, 0, -22, 16, 'rgba(196,138,255,0.65)');
  runeRing(ctx, 0, -46, 8.5, 'rgba(196,138,255,0.5)', 6);
  // parapet ring
  ellPath(ctx, 0, -54, 16.5, 5);
  ink(ctx, grad(ctx, -16.5, -58, 16.5, -50, '#9a9791', 0.26, 0.34), 1.3);
  crenels(ctx, -13.5, 13.5, -58, 5, 4.6, 6);
  // pedestal + crystal
  rectPath(ctx, -5, -58, 10, 5);
  ink(ctx, grad(ctx, -5, -58, 5, -53, STONE_D, 0.3, 0.3), 1);
  crystalProp(ctx, 0, -70, 8, '#c07bff');
  runeRing(ctx, 0, -62, 7.5, 'rgba(196,138,255,0.45)', 0);
  torchBracket(ctx, 16.5, -6, 1);
  barrelProp(ctx, -18, -1, 9.6, 12);
  crateProp(ctx, 18.5, -1.5, 10, 8.6);
  mast(ctx, -17, -78, -30, color);
  levelPips(ctx, g.level, g.spec, 7);
}

function mageL3Body(ctx: CanvasRenderingContext2D, g: MageGeo, color: string): void {
  plinth(ctx, 22, '#87837c', '#a5a199');
  shaft(ctx, 0, -76, -2, 11, 17, '#8d8a86', 9);
  archDoor(ctx, 0, 10, 14);
  // balcony
  ellPath(ctx, 0, -46, 20, 6.4);
  ink(ctx, grad(ctx, -20, -50, 20, -40, '#9a9791', 0.26, 0.36), 1.4);
  outline(ctx, () => ellPath(ctx, 0, -46, 20, 6.4), SHADOW_TINT, 1.4);
  ellPath(ctx, 0, -49, 15, 4.6);
  ink(ctx, grad(ctx, -15, -52, 15, -46, '#7d7a75', 0.2, 0.3), 1);
  for (const bx of [-17, 17]) {
    beam(ctx, bx, -62, -48, 2.2, WOOD_D);
  }
  rectPath(ctx, -17.5, -61, 35, 2);
  ink(ctx, WOOD, 0.9);
  // windows
  windowBaked(ctx, 0, -58, 6, 9, true);
  windowBaked(ctx, 0, -26, 5.4, 8.4, true);
  runeBand(ctx, 0, -36, 15, 'rgba(196,138,255,0.6)');
  runeRing(ctx, 0, -68, 9, 'rgba(196,138,255,0.5)', 6);
  // parapet + crenellations
  rectPath(ctx, -12.5, -84, 25, 8.6);
  ink(ctx, bodyGradient(ctx, 0, -84, -75.4, STONE, 0.28, 0.32), 1.4);
  wallCourses(ctx, -12.5, -84, 25, 8.6, 2);
  crenels(ctx, -13, 13, -84.4, 4, 5, 6.4);
  // crystal + rune halo
  crystalProp(ctx, 0, -96, 11, g.spec === 'slow_hex' ? '#7fd6ff' : '#c07bff');
  runeRing(ctx, 0, -82, 11, g.spec === 'slow_hex' ? 'rgba(127,214,255,0.55)' : 'rgba(196,138,255,0.55)', 0);
  if (g.spec === 'arcane_blast') {
    for (const bx of [-15, 15]) crystalProp(ctx, bx, -92, 5.4, '#d08bff', false);
    ctx.strokeStyle = 'rgba(206,140,255,0.55)';
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -96, 17 + i * 3, 6 + i, 0.4, 0, Math.PI * 1.4);
      ctx.stroke();
    }
    runeRing(ctx, 0, -50, 14, 'rgba(206,140,255,0.6)', 6);
  } else if (g.spec === 'slow_hex') {
    // frost armour
    for (let i = 0; i < 4; i++) {
      const a = Math.PI * (0.2 + i * 0.2);
      const ix = Math.cos(a) * 17;
      polyPath(ctx, [[ix, -46 + Math.sin(a) * 5], [ix + 2.6, -50 + Math.sin(a) * 4], [ix + 5, -44 + Math.sin(a) * 5]]);
      ink(ctx, grad(ctx, ix - 3, -52, ix + 5, -42, '#a8e4ff', 0.4, 0.24), 0.8);
    }
    for (let i = 0; i < 6; i++) {
      const ix = -15 + i * 6;
      polyPath(ctx, [[ix, -42], [ix + 2.2, -42], [ix + 1.1, -36 - (i % 3) * 2]]);
      ink(ctx, 'rgba(190,236,255,0.9)', 0.6);
    }
    // hex plate on the shaft
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU - Math.PI / 2;
      const px = Math.cos(a) * 7;
      const py = -66 + Math.sin(a) * 7;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ink(ctx, 'rgba(58,110,140,0.65)', 1);
    ctx.fillStyle = 'rgba(190,236,255,0.85)';
    ctx.beginPath();
    ctx.arc(0, -66, 2, 0, TAU);
    ctx.fill();
  }
  torchBracket(ctx, 18, -50, 0.95);
  barrelProp(ctx, -19.5, -1, 10, 13);
  crateProp(ctx, 20, -1.5, 10, 9);
  mast(ctx, 20, -110, -70, color);
  levelPips(ctx, g.level, g.spec, 7);
}

function mageBody(ctx: CanvasRenderingContext2D, g: MageGeo, color: string): void {
  if (g.spec === null && g.level === 0) mageL1Body(ctx, g, color);
  else if (g.spec === null && g.level === 1) mageL2Body(ctx, g, color);
  else mageL3Body(ctx, g, color);
}

/** Robed spellcaster with a staff, a beard and a pointed hat. */
function mageFigure(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, robe: string, raised: boolean, hat: boolean): void {
  const dark = darken(robe, 0.3);
  // robe
  polyPath(ctx, [[x - 3.4 * s, y + 0.3 * s], [x - 2.1 * s, y - 10.6 * s], [x + 2.1 * s, y - 10.6 * s], [x + 3.4 * s, y + 0.3 * s]]);
  ink(ctx, bodyGradient(ctx, x, y - 10.6 * s, y, robe, 0.28, 0.32), 1.15);
  line(ctx, x - 2.4 * s, y - 4.4 * s, x + 2.6 * s, y - 5.2 * s, dark, 1.2);
  line(ctx, x - 3.2 * s, y - 0.7 * s, x + 3.3 * s, y - 0.7 * s, lighten(robe, 0.22), 0.9);
  // staff
  const sx = x + (raised ? -4.6 * s : -4.2 * s);
  const stop = raised ? y - 16.4 * s : y - 14.6 * s;
  line(ctx, sx, y + 0.4 * s, sx, stop, SHADOW_TINT, 2.4 * s);
  line(ctx, sx, y + 0.4 * s, sx, stop, WOOD_D, 1.4 * s);
  crystalProp(ctx, sx, stop - 1.6 * s, 2.4 * s, '#d89bff', raised);
  // arms
  ctx.lineCap = 'round';
  ctx.strokeStyle = SHADOW_TINT;
  ctx.lineWidth = 2.3 * s;
  ctx.beginPath();
  ctx.moveTo(x - 1.4 * s, y - 9.6 * s);
  ctx.lineTo(sx + 0.6 * s, raised ? stop + 3.4 * s : y - 8.2 * s);
  if (raised) {
    ctx.moveTo(x + 1.6 * s, y - 9.6 * s);
    ctx.lineTo(x + 4.6 * s, y - 14 * s);
  } else {
    ctx.moveTo(x + 1.6 * s, y - 9.6 * s);
    ctx.lineTo(x + 3.6 * s, y - 6.4 * s);
  }
  ctx.stroke();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.2 * s;
  ctx.stroke();
  // head
  ellPath(ctx, x, y - 12.6 * s, 1.9 * s, 2 * s);
  ink(ctx, SKIN, 0.8);
  // beard
  polyPath(ctx, [[x - 1.7 * s, y - 12 * s], [x + 1.7 * s, y - 12 * s], [x, y - 8.6 * s]]);
  ink(ctx, BONE, 0.6);
  if (hat) {
    // brim + cone
    ellPath(ctx, x, y - 14 * s, 3.8 * s, 1.3 * s);
    ink(ctx, grad(ctx, x - 3.8 * s, y - 15 * s, x + 3.8 * s, y - 13 * s, dark, 0.3, 0.3), 0.9);
    polyPath(ctx, [[x - 2.6 * s, y - 14.4 * s], [x + 0.6 * s, y - 21.6 * s], [x + 2.6 * s, y - 14.4 * s]]);
    ink(ctx, grad(ctx, x - 2.6 * s, y - 21 * s, x + 2.6 * s, y - 14 * s, robe, 0.34, 0.3), 1);
    sparkle(ctx, x + 0.4 * s, y - 18.6 * s, 1.1 * s, GOLD, 0.4);
  }
}

function mageCrew(ctx: CanvasRenderingContext2D, g: MageGeo, color: string): void {
  const y = g.standY;
  const s = g.crewScale;
  if (g.level === 0) {
    mageFigure(ctx, -8, y, 1.02, color, false, true);
    return;
  }
  if (g.level === 1) {
    mageFigure(ctx, 6.5, y, 0.92 * s, color, true, true);
    return;
  }
  mageFigure(ctx, 7, y, 1 * s, color, g.spec === 'arcane_blast', true);
  mageFigure(ctx, -7.5, y, 0.78 * s, color, false, false);
}

// ═══ CANNON TOWER ════════════════════════════════════════════════
// L1 a log palisade with a field gun · L2 a stone bastion with a
// garrison gun · L3 a fortress with a siege cannon on the parapet.
// Heavy Bombard swaps the gun for a mortar on a gantry, Cluster Bombs
// for a fanned triple battery plus bomb crates.

interface CannonGeo extends TowerGeo {
  deckY: number;
  /** Trunnion the gun tube pitches around. */
  gunPivot: { x: number; y: number };
}

function cannonGeo(level: number, spec: string | null): CannonGeo {
  if (spec === 'heavy_bombard') {
    return {
      ...makeGeo(level, spec, -108, 36, {
        revolver: 5,
        muzzle: { x: 23, y: -84 },
        flash: 'powder',
        torches: [{ x: 19, y: -50, s: 0.95 }],
        banner: { x: -25, y: -80, len: 16, w: 9, color: '#e2622c', flip: true },
      }),
      deckY: -58,
      gunPivot: { x: -2, y: -76 },
    };
  }
  if (spec === 'cluster_bombs') {
    return {
      ...makeGeo(level, spec, -88, 34, {
        revolver: 4.5,
        muzzle: { x: 18, y: -63 },
        flash: 'powder',
        torches: [{ x: 19, y: -50, s: 0.95 }],
        banner: { x: -25, y: -80, len: 16, w: 9, color: '#e2622c', flip: true },
      }),
      deckY: -58,
      gunPivot: { x: -6, y: -68 },
    };
  }
  if (level === 0) {
    return {
      ...makeGeo(level, spec, -46, 27, {
        revolver: 3.2,
        muzzle: { x: 17, y: -38 },
        flash: 'powder',
        torches: [{ x: 19.5, y: -25, s: 0.9 }],
      }),
      deckY: -24,
      gunPivot: { x: -4, y: -33 },
    };
  }
  if (level === 1) {
    return {
      ...makeGeo(level, spec, -62, 30, {
        revolver: 3.6,
        muzzle: { x: 21, y: -58 },
        flash: 'powder',
        torches: [{ x: 21, y: -36, s: 0.95 }],
      }),
      deckY: -42,
      gunPivot: { x: -8, y: -50 },
    };
  }
  return {
    ...makeGeo(level, spec, -88, 35, {
      revolver: 4,
      muzzle: { x: 25, y: -77 },
      flash: 'powder',
      torches: [{ x: 20, y: -50, s: 0.95 }],
      banner: { x: -24, y: -84, len: 16, w: 9, color: '#e2622c', flip: true },
    }),
    deckY: -58,
    gunPivot: { x: -8, y: -70 },
  };
}

/** Spoked carriage wheel. */
function wheel(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, spokes: number): void {
  ellPath(ctx, x, y, r, r);
  ink(ctx, grad(ctx, x - r, y - r, x + r, y + r, WOOD, 0.32, 0.36), 1.2);
  if (spokes > 0) {
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI;
      line(ctx, x - Math.cos(a) * r * 0.82, y - Math.sin(a) * r * 0.82, x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82, WOOD_D, 1);
    }
  }
  ellPath(ctx, x, y, r * 0.34, r * 0.34);
  ink(ctx, IRON_D, 0.8);
  ctx.fillStyle = 'rgba(255,243,212,0.35)';
  ctx.beginPath();
  ctx.arc(x - r * 0.36, y - r * 0.42, r * 0.2, 0, TAU);
  ctx.fill();
}

/** Iron gun tube from (x0,y0) to (x1,y1) with reinforcing rings. */
function cannonTube(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  r0: number, r1: number,
  rings: number,
  base = IRON,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.max(0.001, Math.hypot(dx, dy));
  const nx = -dy / len;
  const ny = dx / len;
  polyPath(ctx, [
    [x0 + nx * r0, y0 + ny * r0],
    [x1 + nx * r1, y1 + ny * r1],
    [x1 - nx * r1, y1 - ny * r1],
    [x0 - nx * r0, y0 - ny * r0],
  ]);
  ink(ctx, grad(ctx, x0, y0 - r0, x1, y1 + r1, base, 0.36, 0.44), 1.25);
  // specular along the sun side
  ctx.strokeStyle = 'rgba(255,243,212,0.5)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x0 + nx * r0 * 0.6, y0 + ny * r0 * 0.6);
  ctx.lineTo(x1 + nx * r1 * 0.6, y1 + ny * r1 * 0.6);
  ctx.stroke();
  for (let i = 1; i <= rings; i++) {
    const t = i / (rings + 1);
    const rx = x0 + dx * t;
    const ry = y0 + dy * t;
    const rr = r0 + (r1 - r0) * t;
    line(ctx, rx + nx * rr * 1.12, ry + ny * rr * 1.12, rx - nx * rr * 1.12, ry - ny * rr * 1.12, IRON_D, 1.5);
  }
  // muzzle collar
  polyPath(ctx, [
    [x1 + nx * r1 * 1.28, y1 + ny * r1 * 1.28],
    [x1 - dx * 0.03 + nx * r1 * 1.28, y1 - dy * 0.03 + ny * r1 * 1.28],
    [x1 - dx * 0.03 - nx * r1 * 1.28, y1 - dy * 0.03 - ny * r1 * 1.28],
    [x1 - nx * r1 * 1.28, y1 - ny * r1 * 1.28],
  ]);
  ink(ctx, mix(IRON, '#fff3d4', 0.1), 0.9);
  ellPath(ctx, x1, y1, r1 * 0.62, r1 * 0.62);
  ink(ctx, '#241f2c', 0.8);
}

/** Wooden carriage under a gun tube. */
function carriage(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  polyPath(ctx, [[x - w / 2, y], [x + w / 2, y], [x + w / 2 - h * 0.4, y - h], [x - w / 2 + h * 0.4, y - h]]);
  ink(ctx, grad(ctx, x - w / 2, y - h, x + w / 2, y, WOOD_D, 0.3, 0.36), 1.2);
  woodGrain(ctx, x - w / 2, y - h, w, h, false);
  line(ctx, x - w * 0.2, y - h * 0.2, x + w * 0.24, y - h * 0.8, '#54401f', 1.2);
  line(ctx, x + w * 0.24, y - h * 0.2, x - w * 0.2, y - h * 0.8, '#54401f', 1.2);
}

/** Pyramid stack of round shot. */
function ballPile(ctx: CanvasRenderingContext2D, x: number, y: number, n: number, r: number): void {
  let count = n;
  let row = 0;
  let cy = y - r;
  while (count > 0) {
    const inRow = Math.min(count, 3 - row);
    const startX = x - ((inRow - 1) * r * 2.1) / 2;
    for (let i = 0; i < inRow; i++) {
      const bx = startX + i * r * 2.1;
      ellPath(ctx, bx, cy, r, r);
      ink(ctx, grad(ctx, bx - r, cy - r, bx + r, cy + r, '#5d6169', 0.4, 0.4), 1);
      ctx.fillStyle = 'rgba(255,243,212,0.55)';
      ctx.beginPath();
      ctx.arc(bx - r * 0.34, cy - r * 0.38, r * 0.28, 0, TAU);
      ctx.fill();
    }
    count -= inRow;
    row++;
    cy -= r * 1.92;
  }
}

/** Iron bomb with a burning fuse. */
function bombProp(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ellPath(ctx, x, y, r, r);
  ink(ctx, grad(ctx, x - r, y - r, x + r, y + r, '#4c4a54', 0.4, 0.44), 1.1);
  ctx.fillStyle = 'rgba(255,243,212,0.5)';
  ctx.beginPath();
  ctx.arc(x - r * 0.32, y - r * 0.36, r * 0.26, 0, TAU);
  ctx.fill();
  line(ctx, x + r * 0.1, y - r * 0.9, x + r * 0.5, y - r * 1.7, '#c9a86a', 1);
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.arc(x + r * 0.5, y - r * 1.8, r * 0.22, 0, TAU);
  ctx.fill();
}

/** Sandbag revetment block. */
function sandbag(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  roundRectPath(ctx, x - w / 2, y - h, w, h, h * 0.42);
  ink(ctx, grad(ctx, x - w / 2, y - h, x + w / 2, y, '#b9a173', 0.3, 0.34), 1);
  line(ctx, x - w * 0.34, y - h * 0.72, x + w * 0.34, y - h * 0.72, 'rgba(90,70,40,0.5)', 0.7);
}

function cannonL1Body(ctx: CanvasRenderingContext2D, g: CannonGeo, color: string): void {
  void color;
  const deck = g.deckY;
  plinth(ctx, 20, '#7f7a72', '#9c978d');
  // log palisade
  for (let i = 0; i < 7; i++) {
    const px = -18 + i * 6;
    roundRectPath(ctx, px - 2.9, -16, 5.8, 17, 2.6);
    ink(ctx, grad(ctx, px - 3, -16, px + 3, 0, i % 2 === 0 ? WOOD : mix(WOOD, COOL_SHADOW, 0.08), 0.32, 0.36), 1.2);
    woodGrain(ctx, px - 2.9, -16, 5.8, 17, true);
    ctx.fillStyle = 'rgba(255,243,212,0.28)';
    ctx.beginPath();
    ctx.ellipse(px - 0.9, -14.4, 0.9, 2.6, -0.2, 0, TAU);
    ctx.fill();
  }
  // deck
  rectPath(ctx, -19.5, deck - 8, 39, 8);
  ink(ctx, grad(ctx, -19.5, deck - 8, 19.5, deck, WOOD, 0.3, 0.36), 1.3);
  woodGrain(ctx, -19.5, deck - 8, 39, 8, false);
  ctx.fillStyle = mix(WOOD, '#fff3d4', 0.34);
  ctx.fillRect(-19.5, deck - 8, 39, 1.4);
  for (const bx of [-1, 1]) {
    polyPath(ctx, [[bx * 15, deck], [bx * 19.5, deck], [bx * 15, deck + 9]]);
    ink(ctx, WOOD_D, 1);
  }
  torchBracket(ctx, 19.5, -25, 0.9);
  barrelProp(ctx, -19.5, -1, 10.4, 13);
  crateProp(ctx, 20, -1.5, 10, 9);
  levelPips(ctx, g.level, g.spec, 7);
}

function cannonL2Body(ctx: CanvasRenderingContext2D, g: CannonGeo, color: string): void {
  void color;
  const deck = g.deckY;
  plinth(ctx, 22, '#7f7a72', '#9c978d');
  // bastion wall
  rectPath(ctx, -20, -26, 40, 26);
  ink(ctx, bodyGradient(ctx, 0, -26, 0, 0, '#8a857c', 0.26, 0.36), 1.5);
  wallCourses(ctx, -20, -26, 40, 26, 5);
  archDoor(ctx, -7, 9, 12);
  // machicolation ledge
  rectPath(ctx, -22, -32, 44, 6);
  ink(ctx, grad(ctx, -22, -32, 22, -26, '#7c776e', 0.24, 0.3), 1.2);
  for (let i = 0; i < 5; i++) {
    const bx = -17 + i * 8.5;
    polyPath(ctx, [[bx - 2.6, -26.4], [bx + 2.6, -26.4], [bx + 1.5, -22.4], [bx - 1.5, -22.4]]);
    ink(ctx, '#6d6961', 0.7);
  }
  // parapet + crenellations
  rectPath(ctx, -21, deck - 10, 42, 10);
  ink(ctx, bodyGradient(ctx, 0, deck - 10, deck, '#8a857c', 0.3, 0.34), 1.4);
  wallCourses(ctx, -21, deck - 10, 42, 10, 2);
  crenels(ctx, -21.5, 21.5, deck - 10.4, 4, 6, 6.6);
  ballPile(ctx, -16, deck - 1, 3, 3.1);
  // smoke vent
  rectPath(ctx, 12, deck - 18, 7, 9);
  ink(ctx, grad(ctx, 12, deck - 18, 19, deck - 9, '#6d6961', 0.24, 0.3), 1);
  ctx.fillStyle = 'rgba(28,22,36,0.7)';
  ctx.fillRect(13.4, deck - 17.6, 4.2, 2.4);
  torchBracket(ctx, 21, -36, 0.95);
  barrelProp(ctx, -21, -1, 10.4, 13);
  crateProp(ctx, 21.5, -1.5, 10, 9);
  levelPips(ctx, g.level, g.spec, 7);
}

function cannonL3Body(ctx: CanvasRenderingContext2D, g: CannonGeo, color: string): void {
  void color;
  const deck = g.deckY;
  const heavy = g.spec === 'heavy_bombard';
  const cluster = g.spec === 'cluster_bombs';
  plinth(ctx, 24, '#7f7a72', '#9c978d');
  // keep
  rectPath(ctx, -21, -40, 42, 40);
  ink(ctx, bodyGradient(ctx, 0, -40, 0, 0, '#87827a', 0.28, 0.36), 1.5);
  wallCourses(ctx, -21, -40, 42, 40, 7);
  gatehouse(ctx, 0, 13, 18, true);
  // quoins
  for (let i = 0; i < 5; i++) {
    const y = -40 + i * 8;
    rectPath(ctx, -22.4, y, 4.6, 6.6);
    ink(ctx, mix('#87827a', '#fff3d4', i % 2 === 0 ? 0.16 : 0.04), 0.7);
    rectPath(ctx, 17.8, y, 4.6, 6.6);
    ink(ctx, mix('#87827a', COOL_SHADOW, 0.16), 0.7);
  }
  arrowSlit(ctx, -13, -30, 3.6, 8);
  arrowSlit(ctx, 13.5, -22, 3.6, 8);
  // machicolation
  rectPath(ctx, -24, -46, 48, 6);
  ink(ctx, grad(ctx, -24, -46, 24, -40, '#7c776e', 0.24, 0.3), 1.3);
  for (let i = 0; i < 6; i++) {
    const bx = -19 + i * 7.6;
    polyPath(ctx, [[bx - 2.8, -40.4], [bx + 2.8, -40.4], [bx + 1.6, -36], [bx - 1.6, -36]]);
    ink(ctx, '#6d6961', 0.7);
  }
  // parapet + crenellations
  rectPath(ctx, -22, deck - 12, 44, 12);
  ink(ctx, bodyGradient(ctx, 0, deck - 12, deck, '#87827a', 0.3, 0.34), 1.4);
  wallCourses(ctx, -22, deck - 12, 44, 12, 3);
  crenels(ctx, -22.5, 22.5, deck - 12.4, 4, 6.6, 7);
  // hanging chain from the machicolation
  for (let i = 0; i < 5; i++) {
    ellPath(ctx, 22, -36 + i * 2.6, 1.1, 1.5);
    ink(ctx, IRON_D, 0.5);
  }
  // bomb stores
  ballPile(ctx, -17, deck, heavy ? 6 : 4, 3.4);
  bombProp(ctx, -10.5, deck - 4, 4.4);
  barrelProp(ctx, -21.5, -1, 10.4, 13);
  crateProp(ctx, 22, -1.5, 10, 9);
  torchBracket(ctx, 20, -50, 0.95);
  if (heavy) {
    // gantry crane holding a bomb over the mortar
    beam(ctx, -19, -100, deck - 6, 3.4, WOOD_D);
    line(ctx, -19, -100, -6, deck - 8, WOOD_D, 2.6);
    line(ctx, -19, -74, -6, deck - 8, WOOD_D, 2.2);
    beam(ctx, -17, -98, -10, 2.6, WOOD);
    line(ctx, -13, -96, -13, -88, '#c9a86a', 1.1);
    bombProp(ctx, -13, -84, 5);
    sandbag(ctx, -2, deck, 11, 6.5);
    sandbag(ctx, 8, deck, 11, 6.5);
    sandbag(ctx, 3, deck - 6, 11, 6.5);
  } else if (cluster) {
    for (const bx of [-16, 16]) {
      crateProp(ctx, bx, deck, 12, 10);
      bombProp(ctx, bx - 2.6, deck - 11, 3.6);
      bombProp(ctx, bx + 2.6, deck - 11, 3.6);
    }
    line(ctx, -18, deck - 12, 18, deck - 12, '#c9a86a', 0.9);
  }
  mast(ctx, -24, -74, deck - 6, '#e2622c');
  levelPips(ctx, g.level, g.spec, 7);
}

/** Gate with a portcullis and a lintel. */
function gatehouse(ctx: CanvasRenderingContext2D, cx: number, w: number, h: number, portcullis: boolean): void {
  archDoor(ctx, cx, w, h);
  if (!portcullis) return;
  ctx.strokeStyle = IRON_D;
  ctx.lineWidth = 1.5;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * (w / 3.4), 0.5);
    ctx.lineTo(cx + i * (w / 3.4), -h * 0.78);
    ctx.stroke();
  }
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2 + 0.6, -h * 0.3);
  ctx.lineTo(cx + w / 2 - 0.6, -h * 0.3);
  ctx.moveTo(cx - w / 2 + 0.6, -h * 0.62);
  ctx.lineTo(cx + w / 2 - 0.6, -h * 0.62);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,243,212,0.35)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(cx - w / 3.4, 0.5);
  ctx.lineTo(cx - w / 3.4, -h * 0.78);
  ctx.stroke();
}

function cannonCrew(ctx: CanvasRenderingContext2D, g: CannonGeo, color: string): void {
  void color;
  const deck = g.deckY;
  if (g.spec === 'heavy_bombard') {
    carriage(ctx, -2, deck, 22, 9);
    wheel(ctx, -6, deck - 2, 8.2, 6);
    wheel(ctx, 10, deck - 2, 8.2, 6);
    return;
  }
  if (g.spec === 'cluster_bombs') {
    carriage(ctx, -4, deck, 20, 8);
    wheel(ctx, -8, deck - 2, 7.2, 6);
    wheel(ctx, 8, deck - 2, 7.2, 6);
    // battery mount
    line(ctx, -9, deck - 1, -9, deck - 14, IRON_D, 1.7);
    line(ctx, -9, deck - 14, 2, deck - 14, IRON_D, 1.4);
    line(ctx, -9, deck - 8, 2, deck - 8, IRON_D, 1.2);
    return;
  }
  if (g.level === 0) {
    carriage(ctx, 1, deck, 20, 7.5);
    wheel(ctx, -2.5, deck - 2, 6, 5);
    wheel(ctx, 9.5, deck - 2, 6, 5);
    return;
  }
  if (g.level === 1) {
    carriage(ctx, 1, deck, 24, 9);
    wheel(ctx, -4, deck - 2, 7, 5);
    wheel(ctx, 11, deck - 2, 7, 5);
    return;
  }
  carriage(ctx, 0, deck, 28, 10);
  wheel(ctx, -5.5, deck - 2, 8.6, 7);
  wheel(ctx, 12, deck - 2, 8.6, 7);
}

/** The gun tube itself: baked separately so it can pitch towards its target. */
function cannonGun(ctx: CanvasRenderingContext2D, g: CannonGeo, color: string): void {
  void color;
  const deck = g.deckY;
  if (g.spec === 'heavy_bombard') {
    cannonTube(ctx, -4, deck - 16, 22, deck - 26, 8.4, 7.4, 2, '#5a5e66');
    return;
  }
  if (g.spec === 'cluster_bombs') {
    cannonTube(ctx, -8, deck - 3, 15, deck - 6, 3.8, 3.2, 1);
    cannonTube(ctx, -8, deck - 8, 17, deck - 8, 4.2, 3.4, 1);
    cannonTube(ctx, -8, deck - 13, 15, deck - 10, 3.8, 3.2, 1);
    return;
  }
  if (g.level === 0) {
    cannonTube(ctx, -6, deck - 9, 16, deck - 14, 3.6, 3, 2);
    line(ctx, -6.5, deck - 10.6, -4, deck - 14.4, '#c9a86a', 1);
  } else if (g.level === 1) {
    cannonTube(ctx, -8, deck - 10, 20, deck - 16, 4.4, 3.6, 3);
    line(ctx, -8.5, deck - 11.6, -6, deck - 15.4, '#c9a86a', 1);
  } else {
    cannonTube(ctx, -10, deck - 12, 24, deck - 19, 5.6, 4.4, 3);
    line(ctx, -10.5, deck - 13.6, -7.5, deck - 17.6, '#c9a86a', 1.1);
  }
}

function cannonBody(ctx: CanvasRenderingContext2D, g: CannonGeo, color: string): void {
  if (g.spec === null && g.level === 0) cannonL1Body(ctx, g, color);
  else if (g.spec === null && g.level === 1) cannonL2Body(ctx, g, color);
  else cannonL3Body(ctx, g, color);
}

// ═══ BARRACKS ════════════════════════════════════════════════════
// L1 a canvas tent inside a stake fence with a training dummy ·
// L2 a plank blockhouse under a tiled roof · L3 a stone keep with a
// portcullis gate. Knights gild it and garrison plate armour,
// Rangers fly a green pennant and drill lancers beside a tanning rack.

interface BarracksGeo extends TowerGeo {
  standY: number;
  crewScale: number;
}

function barracksGeo(level: number, spec: string | null): BarracksGeo {
  if (spec === 'knights') {
    return {
      ...makeGeo(level, spec, -88, 38, {
        revolver: 0.8,
        muzzle: { x: -18, y: -18 },
        flash: 'melee',
        glows: [{ x: 0, y: -20, w: 7, h: 9, arched: true }],
        torches: [{ x: -15, y: -16, s: 1 }, { x: 15, y: -16, s: 1 }],
        banner: { x: -25, y: -84, len: 16, w: 9, color: '#3f7fc4', flip: true },
      }),
      standY: -1,
      crewScale: 1.04,
    };
  }
  if (spec === 'rangers') {
    return {
      ...makeGeo(level, spec, -88, 38, {
        revolver: 0.8,
        muzzle: { x: -18, y: -18 },
        flash: 'melee',
        glows: [{ x: 0, y: -20, w: 7, h: 9, arched: true }],
        torches: [{ x: 15, y: -16, s: 1 }],
        banner: { x: -25, y: -84, len: 16, w: 9, color: '#3f8f45', flip: true },
      }),
      standY: -1,
      crewScale: 1,
    };
  }
  if (level === 0) {
    return {
      ...makeGeo(level, spec, -58, 31, {
        revolver: 0.8,
        muzzle: { x: -11, y: -13 },
        flash: 'melee',
        glows: [{ x: 0, y: -17, w: 8, h: 12, arched: true }],
        torches: [{ x: 15, y: -11, s: 0.95 }],
        banner: { x: 0, y: -54, len: 11, w: 7, color: '#3f7fc4', flip: false },
      }),
      standY: -1,
      crewScale: 1,
    };
  }
  if (level === 1) {
    return {
      ...makeGeo(level, spec, -68, 35, {
        revolver: 0.8,
        muzzle: { x: -16, y: -15 },
        flash: 'melee',
        glows: [{ x: 0, y: -30, w: 6, h: 8, arched: true }],
        torches: [{ x: -14, y: -22, s: 0.95 }, { x: 14, y: -22, s: 0.95 }],
        banner: { x: -23, y: -64, len: 15, w: 8.5, color: '#3f7fc4', flip: true },
      }),
      standY: -1,
      crewScale: 1,
    };
  }
  return {
    ...makeGeo(level, spec, -88, 38, {
      revolver: 0.8,
      muzzle: { x: -18, y: -18 },
      flash: 'melee',
      glows: [{ x: 0, y: -20, w: 7, h: 9, arched: true }],
      torches: [{ x: -16, y: -14, s: 1 }, { x: 16, y: -14, s: 1 }],
      banner: { x: -25, y: -84, len: 16, w: 9, color: '#3f7fc4', flip: true },
    }),
    standY: -1,
    crewScale: 1.05,
  };
}

/** Training dummy: post, crossbar, straw head, arrows, a propped shield. */
function dummyProp(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  beam(ctx, x, y - 20 * s, y, 2.6 * s, WOOD_D);
  rectPath(ctx, x - 5.6 * s, y - 15 * s, 11.2 * s, 3.4 * s);
  ink(ctx, grad(ctx, x - 5.6 * s, y - 15 * s, x + 5.6 * s, y - 11.6 * s, LEATHER, 0.3, 0.3), 1);
  polyPath(ctx, [[x - 3.4 * s, y - 15 * s], [x - 3.4 * s, y - 22.4 * s], [x + 3.4 * s, y - 22.4 * s], [x + 3.4 * s, y - 15 * s]]);
  ink(ctx, grad(ctx, x - 3.4 * s, y - 22.4 * s, x + 3.4 * s, y - 15 * s, HAY, 0.28, 0.32), 1.1);
  line(ctx, x - 3.4 * s, y - 19.4 * s, x + 3.4 * s, y - 20 * s, '#a8912f', 0.8);
  line(ctx, x - 1 * s, y - 17.6 * s, x + 1 * s, y - 18.4 * s, SHADOW_TINT, 0.8);
  line(ctx, x + 1 * s, y - 17.6 * s, x - 1 * s, y - 18.4 * s, SHADOW_TINT, 0.8);
  // arrow in the chest
  line(ctx, x + 3 * s, y - 13 * s, x + 8 * s, y - 16.4 * s, '#c9a86a', 0.9 * s);
  polyPath(ctx, [[x + 8 * s, y - 16.4 * s], [x + 6.4 * s, y - 14.6 * s], [x + 8.8 * s, y - 14.2 * s]]);
  ctx.fillStyle = '#e8e4d4';
  ctx.fill();
  // shield leaning at the base
  shieldProp(ctx, x + 4.6 * s, y - 4.6 * s, 7.4 * s, 9.6 * s, color, 'star');
}

/** Weapon rack: tripod with spears and swords leaning on it. */
function weaponRack(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  line(ctx, x - 4 * s, y, x, y - 12 * s, WOOD_D, 1.8 * s);
  line(ctx, x + 4 * s, y, x, y - 12 * s, WOOD_D, 1.8 * s);
  line(ctx, x - 5.4 * s, y - 7 * s, x + 5.4 * s, y - 7 * s, WOOD, 1.4 * s);
  for (let i = 0; i < 3; i++) {
    const t = (i - 1) * 0.34;
    const bx = x + t * 5 * s;
    line(ctx, bx - 3 * s, y, bx + 2 * s, y - 17 * s, '#b9bcc4', 1.1 * s);
    line(ctx, bx - 3.6 * s, y - 1.6 * s, bx - 2.4 * s, y + 0.4 * s, IRON_D, 1.4 * s);
    polyPath(ctx, [[bx + 2 * s, y - 17 * s], [bx + 0.6 * s, y - 15.4 * s], [bx + 3.4 * s, y - 15.2 * s]]);
    ctx.fillStyle = '#d8dade';
    ctx.fill();
  }
}

/** Militia footman: helmet, tabard, kite shield and a sword. */
function soldierFigure(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, cloth: string, sword: boolean): void {
  const dark = darken(cloth, 0.28);
  // legs
  ctx.lineCap = 'round';
  ctx.strokeStyle = SHADOW_TINT;
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(x - 1.2 * s, y - 5.4 * s);
  ctx.lineTo(x - 2 * s, y - 0.8 * s);
  ctx.moveTo(x + 1.2 * s, y - 5.4 * s);
  ctx.lineTo(x + 2 * s, y - 0.8 * s);
  ctx.stroke();
  ctx.strokeStyle = '#41301f';
  ctx.lineWidth = 1.7 * s;
  ctx.stroke();
  // tabard
  polyPath(ctx, [[x - 2.7 * s, y - 5.2 * s], [x - 2.4 * s, y - 11.8 * s], [x + 2.4 * s, y - 11.8 * s], [x + 2.7 * s, y - 5.2 * s]]);
  ink(ctx, bodyGradient(ctx, x, y - 11.8 * s, y - 5 * s, cloth, 0.26, 0.3), 1.1);
  line(ctx, x, y - 11.4 * s, x, y - 5.6 * s, lighten(cloth, 0.24), 1.2);
  line(ctx, x - 2.5 * s, y - 6.6 * s, x + 2.6 * s, y - 6.6 * s, dark, 1);
  // pauldron + helm
  ellPath(ctx, x - 2.2 * s, y - 11.4 * s, 1.6 * s, 1.3 * s);
  ink(ctx, grad(ctx, x - 4 * s, y - 13 * s, x - 1 * s, y - 10 * s, IRON, 0.34, 0.36), 0.8);
  ellPath(ctx, x, y - 13.9 * s, 1.9 * s, 2 * s);
  ink(ctx, SKIN, 0.8);
  ctx.beginPath();
  ctx.arc(x, y - 14.2 * s, 2.1 * s, Math.PI, 0);
  ctx.closePath();
  ink(ctx, grad(ctx, x - 2 * s, y - 16 * s, x + 2 * s, y - 13 * s, IRON, 0.36, 0.4), 0.8);
  line(ctx, x, y - 14.2 * s, x, y - 12.6 * s, IRON_D, 0.9);
  // shield arm
  shieldProp(ctx, x - 3.4 * s, y - 8.4 * s, 6.6 * s, 8.6 * s, dark, 'none');
  if (sword) {
    line(ctx, x + 3.6 * s, y - 6 * s, x + 3.5 * s, y - 15.6 * s, '#cfd3da', 1.5 * s);
    line(ctx, x + 2.2 * s, y - 7.4 * s, x + 5 * s, y - 7.4 * s, GOLD, 1.2 * s);
    line(ctx, x + 3.6 * s, y - 6.4 * s, x + 3.5 * s, y - 5.4 * s, dark, 1 * s);
  }
}

/** Holy knight: cape, plate, great helm and a cross shield. */
function knightFigure(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  // cape
  polyPath(ctx, [[x - 2.4 * s, y - 12.4 * s], [x + 3 * s, y - 12 * s], [x + 5.4 * s, y + 0.4 * s], [x - 5 * s, y + 0.4 * s]]);
  ink(ctx, grad(ctx, x - 4 * s, y - 12 * s, x + 4 * s, y, '#2f4a86', 0.24, 0.3), 0.9);
  // legs
  ctx.lineCap = 'round';
  ctx.strokeStyle = SHADOW_TINT;
  ctx.lineWidth = 3.4 * s;
  ctx.beginPath();
  ctx.moveTo(x - 1.3 * s, y - 5.6 * s);
  ctx.lineTo(x - 2.2 * s, y - 0.8 * s);
  ctx.moveTo(x + 1.3 * s, y - 5.6 * s);
  ctx.lineTo(x + 2.2 * s, y - 0.8 * s);
  ctx.stroke();
  ctx.strokeStyle = '#9aa0ab';
  ctx.lineWidth = 2 * s;
  ctx.stroke();
  // breastplate
  polyPath(ctx, [[x - 3 * s, y - 5.4 * s], [x - 2.6 * s, y - 12 * s], [x + 2.6 * s, y - 12 * s], [x + 3 * s, y - 5.4 * s]]);
  ink(ctx, grad(ctx, x - 3 * s, y - 12 * s, x + 3 * s, y - 5 * s, '#b6bbc6', 0.3, 0.34), 1.15);
  line(ctx, x - 0.8 * s, y - 11 * s, x - 0.8 * s, y - 6 * s, 'rgba(255,255,255,0.55)', 0.8);
  line(ctx, x - 1.6 * s, y - 8.4 * s, x + 1.6 * s, y - 8.4 * s, GOLD, 1.1);
  line(ctx, x, y - 10.4 * s, x, y - 6.6 * s, GOLD, 1.1);
  // great helm
  ellPath(ctx, x, y - 14 * s, 2.1 * s, 2.3 * s);
  ink(ctx, grad(ctx, x - 2 * s, y - 16 * s, x + 2 * s, y - 12 * s, '#c2c7d1', 0.34, 0.36), 0.9);
  ctx.fillStyle = '#2b2536';
  ctx.fillRect(x - 1.5 * s, y - 14.4 * s, 3 * s, 0.9 * s);
  line(ctx, x - 2 * s, y - 15.4 * s, x + 2 * s, y - 15.4 * s, GOLD, 0.9);
  // cross shield + longsword
  shieldProp(ctx, x - 3.8 * s, y - 8.6 * s, 7.6 * s, 10.4 * s, '#dfe3ea', 'cross');
  line(ctx, x + 4 * s, y - 5.6 * s, x + 3.8 * s, y - 17 * s, '#e2e6ee', 1.6 * s);
  line(ctx, x + 2.4 * s, y - 7.6 * s, x + 5.4 * s, y - 7.6 * s, GOLD, 1.3 * s);
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(x + 3.8 * s, y - 5 * s, 0.9 * s, 0, TAU);
  ctx.fill();
}

/** Ranger lancer: wide hat with a feather, leathers and a long spear. */
function rangerFigure(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  // cloak
  polyPath(ctx, [[x - 2.2 * s, y - 12 * s], [x + 2.6 * s, y - 11.6 * s], [x + 4.2 * s, y + 0.2 * s], [x - 3.8 * s, y + 0.2 * s]]);
  ink(ctx, grad(ctx, x - 3 * s, y - 12 * s, x + 3 * s, y, '#2f6b2a', 0.24, 0.3), 0.9);
  // legs
  ctx.lineCap = 'round';
  ctx.strokeStyle = SHADOW_TINT;
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(x - 1.2 * s, y - 5.4 * s);
  ctx.lineTo(x - 2 * s, y - 0.8 * s);
  ctx.moveTo(x + 1.2 * s, y - 5.4 * s);
  ctx.lineTo(x + 2 * s, y - 0.8 * s);
  ctx.stroke();
  ctx.strokeStyle = '#4a3520';
  ctx.lineWidth = 1.7 * s;
  ctx.stroke();
  // torso + quiver
  polyPath(ctx, [[x - 2.6 * s, y - 5.2 * s], [x - 2.3 * s, y - 11.8 * s], [x + 2.3 * s, y - 11.8 * s], [x + 2.6 * s, y - 5.2 * s]]);
  ink(ctx, bodyGradient(ctx, x, y - 11.8 * s, y - 5 * s, '#4f7a30', 0.26, 0.3), 1.1);
  roundRectPath(ctx, x + 1.8 * s, y - 12.6 * s, 2.2 * s, 6 * s, 0.8 * s);
  ink(ctx, LEATHER, 0.7);
  for (let i = 0; i < 3; i++) {
    line(ctx, x + 2.2 * s + i * 0.7 * s, y - 12.4 * s, x + 2.4 * s + i * 0.7 * s, y - 14.4 * s, '#c9a86a', 0.5 * s);
  }
  // head + hat with a feather
  ellPath(ctx, x, y - 13.8 * s, 1.9 * s, 2 * s);
  ink(ctx, SKIN, 0.8);
  ellPath(ctx, x, y - 15 * s, 4 * s, 1.3 * s);
  ink(ctx, grad(ctx, x - 4 * s, y - 16 * s, x + 4 * s, y - 14 * s, '#3d6b2c', 0.3, 0.32), 0.9);
  polyPath(ctx, [[x - 2.2 * s, y - 15.4 * s], [x + 0.4 * s, y - 16.6 * s], [x + 2.2 * s, y - 15.4 * s]]);
  ink(ctx, '#3d6b2c', 0.8);
  line(ctx, x + 3 * s, y - 15.6 * s, x + 5.6 * s, y - 18.6 * s, '#e8e4d4', 0.9 * s);
  polyPath(ctx, [[x + 5.6 * s, y - 18.6 * s], [x + 3.4 * s, y - 17.6 * s], [x + 5 * s, y - 16.8 * s]]);
  ctx.fillStyle = '#e8b04a';
  ctx.fill();
  // long spear
  line(ctx, x - 6.4 * s, y + 0.4 * s, x + 6.8 * s, y - 20 * s, SHADOW_TINT, 2.1 * s);
  line(ctx, x - 6.4 * s, y + 0.4 * s, x + 6.8 * s, y - 20 * s, WOOD, 1.3 * s);
  polyPath(ctx, [[x + 6.8 * s, y - 20 * s], [x + 4.6 * s, y - 18.6 * s], [x + 7.4 * s, y - 17.2 * s]]);
  ink(ctx, grad(ctx, x + 5 * s, y - 20 * s, x + 7 * s, y - 17 * s, '#d6dae2', 0.34, 0.32), 0.8);
}

function barracksL1Body(ctx: CanvasRenderingContext2D, g: BarracksGeo, color: string): void {
  plinth(ctx, 22, '#8f8264', '#ada084');
  // stake fence
  for (let i = 0; i < 6; i++) {
    const px = -22 + i * 8.8;
    roundRectPath(ctx, px - 1.6, -11, 3.2, 11, 1.4);
    ink(ctx, grad(ctx, px - 1.6, -11, px + 1.6, 0, WOOD, 0.3, 0.36), 1);
    ctx.fillStyle = 'rgba(255,243,212,0.28)';
    ctx.fillRect(px - 1, -10.4, 0.9, 9);
  }
  line(ctx, -22, -8, 22, -8, WOOD_D, 1.6);
  line(ctx, -22, -3.4, 22, -3.4, WOOD_D, 1.4);
  // guy ropes
  line(ctx, 0, -50, -26, 0, '#c9a86a', 0.9);
  line(ctx, 0, -50, 26, 0, '#c9a86a', 0.9);
  line(ctx, -26, 0, -24.6, -4, WOOD_D, 1.4);
  line(ctx, 26, 0, 24.6, -4, WOOD_D, 1.4);
  // tent
  const apex = -50;
  const eave = -8;
  polyPath(ctx, [[-17, eave], [0, apex], [17, eave]]);
  ink(ctx, grad(ctx, -17, apex, 17, eave, color, 0.32, 0.32), 1.5);
  ctx.save();
  polyPath(ctx, [[-17, eave], [0, apex], [17, eave]]);
  ctx.clip();
  // darker right face for the two-slope read
  polyPath(ctx, [[0, apex - 3], [0, eave + 3], [19, eave + 3]]);
  ctx.fillStyle = 'rgba(42,31,56,0.20)';
  ctx.fill();
  ctx.strokeStyle = mix(color, '#fff3d4', 0.3);
  ctx.lineWidth = 2.4;
  for (let i = -1; i <= 1; i += 2) {
    ctx.beginPath();
    ctx.moveTo(i * 5.4, eave);
    ctx.lineTo(i * 1.6, apex + 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(42,31,56,0.16)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, apex);
  ctx.lineTo(0, eave);
  ctx.stroke();
  ctx.restore();
  // door flap + warm interior
  polyPath(ctx, [[-5.4, eave], [0, -28], [5.4, eave]]);
  ink(ctx, 'rgba(30,22,40,0.85)', 1);
  polyPath(ctx, [[-5.4, eave], [0, -28], [-1.6, eave]]);
  ink(ctx, mix(color, COOL_SHADOW, 0.3), 0.8);
  // ridge pole + pennant mast
  beam(ctx, 0, apex - 6, eave, 2.6, WOOD_D);
  // camp kit
  dummyProp(ctx, 24, -1, 0.95, color);
  weaponRack(ctx, -24, -1, 0.9);
  barrelProp(ctx, 19.5, -1, 9.6, 12);
  crateProp(ctx, -19.5, -1.5, 9.6, 8.4);
  torchBracket(ctx, 15, -11, 0.95);
  levelPips(ctx, g.level, g.spec, 7);
}

function barracksL2Body(ctx: CanvasRenderingContext2D, g: BarracksGeo, color: string): void {
  plinth(ctx, 23, '#8f8264', '#ada084');
  // stone foundation + plank walls
  rectPath(ctx, -21, -14, 42, 14);
  ink(ctx, bodyGradient(ctx, 0, -14, 0, 0, STONE, 0.24, 0.34), 1.4);
  wallCourses(ctx, -21, -14, 42, 14, 3);
  planks(ctx, -19, -36, 38, 22, WOOD, 9);
  rectPath(ctx, -19, -36, 38, 22);
  ctx.strokeStyle = SHADOW_TINT;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  line(ctx, -19, -36, 19, -36, '#54401f', 1.8);
  line(ctx, -19, -16.4, 19, -16.4, '#54401f', 1.6);
  archDoor(ctx, 0, 11, 16);
  windowBaked(ctx, 0, -30, 6, 8, true);
  // roof
  tileRoof(ctx, 0, -36, -56, 23.5, '#6c4f33');
  // chimney with a stone cap
  rectPath(ctx, 12.5, -60, 7.5, 14);
  ink(ctx, grad(ctx, 12.5, -60, 20, -46, '#8a857c', 0.24, 0.3), 1.1);
  wallCourses(ctx, 12.5, -60, 7.5, 14, 3);
  rectPath(ctx, 11.4, -62, 9.8, 2.6);
  ink(ctx, mix(STONE_D, '#fff3d4', 0.16), 0.9);
  // gear
  weaponRack(ctx, 23, -1, 0.95);
  dummyProp(ctx, -24.5, -1, 0.9, color);
  barrelProp(ctx, -21, -1, 10, 13);
  crateProp(ctx, 20, -1.5, 10, 9);
  torchBracket(ctx, -14, -22, 0.95);
  torchBracket(ctx, 14, -22, 0.95);
  mast(ctx, -23, -64, -30, color);
  levelPips(ctx, g.level, g.spec, 7);
}

function barracksL3Body(ctx: CanvasRenderingContext2D, g: BarracksGeo, color: string): void {
  const knight = g.spec === 'knights';
  const ranger = g.spec === 'rangers';
  plinth(ctx, 25, '#8f8264', '#ada084');
  // keep
  rectPath(ctx, -22, -46, 44, 46);
  ink(ctx, bodyGradient(ctx, 0, -46, 0, 0, '#9a948a', 0.28, 0.34), 1.5);
  wallCourses(ctx, -22, -46, 44, 46, 8);
  for (let i = 0; i < 6; i++) {
    const y = -46 + i * 8;
    rectPath(ctx, -23.4, y, 4.6, 6.6);
    ink(ctx, mix('#9a948a', '#fff3d4', i % 2 === 0 ? 0.16 : 0.04), 0.7);
    rectPath(ctx, 18.8, y, 4.6, 6.6);
    ink(ctx, mix('#9a948a', COOL_SHADOW, 0.16), 0.7);
  }
  gatehouse(ctx, 0, 14, 19, true);
  arrowSlit(ctx, -14, -32, 3.6, 8);
  arrowSlit(ctx, 14.5, -38, 3.6, 8);
  // machicolation + parapet
  rectPath(ctx, -25, -52, 50, 6);
  ink(ctx, grad(ctx, -25, -52, 25, -46, '#87827a', 0.24, 0.3), 1.3);
  for (let i = 0; i < 6; i++) {
    const bx = -20 + i * 8;
    polyPath(ctx, [[bx - 2.8, -46.4], [bx + 2.8, -46.4], [bx + 1.6, -42], [bx - 1.6, -42]]);
    ink(ctx, '#6d6961', 0.7);
  }
  rectPath(ctx, -23, -64, 46, 12);
  ink(ctx, bodyGradient(ctx, 0, -64, -52, '#9a948a', 0.3, 0.32), 1.4);
  wallCourses(ctx, -23, -64, 46, 12, 3);
  crenels(ctx, -23.5, 23.5, -64.4, 5, 6.6, 7, knight ? mix(STONE, GOLD, 0.35) : STONE);
  // garrison kit
  dummyProp(ctx, 26, -1, 0.95, color);
  weaponRack(ctx, -26, -1, 0.95);
  barrelProp(ctx, -22, -1, 10.4, 13);
  crateProp(ctx, 22.5, -1.5, 10, 9);
  shieldProp(ctx, -14, -20, 8, 11, knight ? '#dfe3ea' : color, knight ? 'cross' : 'star');
  shieldProp(ctx, 15, -26, 8, 11, ranger ? '#4f7a30' : color, ranger ? 'none' : 'star');
  if (knight) {
    // gilded arch + holy emblem over the gate
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -15);
    ctx.quadraticCurveTo(0, -23, 7, -15);
    ctx.stroke();
    const halo = ctx.createRadialGradient(0, -30, 0, 0, -30, 16);
    halo.addColorStop(0, 'rgba(255,226,140,0.42)');
    halo.addColorStop(1, 'rgba(255,214,90,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, -30, 16, 0, TAU);
    ctx.fill();
    shieldProp(ctx, 0, -30, 15, 19, '#e6eaf2', 'cross');
    for (const bx of [-17, 17]) {
      sparkle(ctx, bx, -42, 3.4, GOLD, 0.6);
    }
  } else if (ranger) {
    // tanning rack and a bundle of spare lances
    line(ctx, -27, -6, -19, -6, WOOD_D, 1.8);
    line(ctx, -27, -6, -29, 0, WOOD_D, 1.6);
    line(ctx, -19, -6, -17, 0, WOOD_D, 1.6);
    rectPath(ctx, -26.6, -14, 7.6, 8.4);
    ink(ctx, grad(ctx, -26.6, -14, -19, -5.6, '#c2a878', 0.3, 0.32), 1);
    ctx.fillStyle = 'rgba(90,70,40,0.35)';
    ctx.beginPath();
    ctx.ellipse(-22.8, -9.8, 2.4, 2.8, 0, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      line(ctx, 18 + i * 1.4, -1, 25 + i * 1.2, -22, WOOD, 1);
      polyPath(ctx, [[25 + i * 1.2, -22], [23.6 + i * 1.2, -20.6], [26 + i * 1.2, -19.8]]);
      ctx.fillStyle = '#d6dae2';
      ctx.fill();
    }
  }
  torchBracket(ctx, -16, -14, 1);
  torchBracket(ctx, 16, -14, 1);
  mast(ctx, -25, -84, -46, ranger ? '#3f8f45' : '#3f7fc4');
  levelPips(ctx, g.level, g.spec, 7);
}

function barracksBody(ctx: CanvasRenderingContext2D, g: BarracksGeo, color: string): void {
  if (g.spec === null && g.level === 0) barracksL1Body(ctx, g, color);
  else if (g.spec === null && g.level === 1) barracksL2Body(ctx, g, color);
  else barracksL3Body(ctx, g, color);
}

function barracksCrew(ctx: CanvasRenderingContext2D, g: BarracksGeo, color: string): void {
  const y = g.standY;
  const s = g.crewScale;
  if (g.spec === 'knights') {
    knightFigure(ctx, -14 * s, y, s);
    knightFigure(ctx, 0, y, s);
    knightFigure(ctx, 14 * s, y, s);
    return;
  }
  if (g.spec === 'rangers') {
    rangerFigure(ctx, -14 * s, y, s);
    rangerFigure(ctx, 0, y, s);
    rangerFigure(ctx, 14 * s, y, s);
    return;
  }
  if (g.level === 0) {
    soldierFigure(ctx, -7, y, s, color, true);
    soldierFigure(ctx, 7, y, s, color, false);
    return;
  }
  if (g.level === 1) {
    soldierFigure(ctx, -12, y, s, color, false);
    soldierFigure(ctx, 0, y, s, color, true);
    soldierFigure(ctx, 12, y, s, color, false);
    return;
  }
  soldierFigure(ctx, -13 * s, y, s, color, false);
  soldierFigure(ctx, 0, y, s, color, true);
  soldierFigure(ctx, 13 * s, y, s, color, false);
}

// ═══ DRIVER ══════════════════════════════════════════════════════

type Painter<G extends TowerGeo> = (ctx: CanvasRenderingContext2D, g: G, color: string) => void;

interface FamilyPaint<G extends TowerGeo> {
  body: Painter<G>;
  crew: Painter<G>;
  /** Optional third layer that pivots towards the target (gun tubes). */
  gun?: Painter<G>;
}

const ARCHER_PAINT: FamilyPaint<ArcherGeo> = { body: archerBody, crew: archerCrew };
const MAGE_PAINT: FamilyPaint<MageGeo> = { body: mageBody, crew: mageCrew };
const CANNON_PAINT: FamilyPaint<CannonGeo> = { body: cannonBody, crew: cannonCrew, gun: cannonGun };
const BARRACKS_PAINT: FamilyPaint<BarracksGeo> = { body: barracksBody, crew: barracksCrew };

/** Fallback silhouette for an unknown tower id. */
function genericGeo(level: number): TowerGeo {
  return makeGeo(level, null, -58, 26, {
    revolver: 1,
    muzzle: { x: 12, y: -50 },
    flash: 'arrow',
    glows: [{ x: 0, y: -34, w: 5.4, h: 7.6, arched: true }],
  });
}

function genericBody(ctx: CanvasRenderingContext2D, g: TowerGeo): void {
  const top = g.top + 8;
  plinth(ctx, 20, '#8a8478', '#a8a295');
  rectPath(ctx, -14, top, 28, -top);
  ink(ctx, bodyGradient(ctx, 0, top, 0, 0, STONE, 0.28, 0.34), 1.5);
  wallCourses(ctx, -14, top, 28, -top, 6);
  windowBaked(ctx, 0, -34, 5.4, 7.6, true);
  crenels(ctx, -14.5, 14.5, top, 4, 5.4, 6.4);
  levelPips(ctx, g.level, g.spec, 7);
}

function genericCrew(ctx: CanvasRenderingContext2D, g: TowerGeo): void {
  sparkle(ctx, 0, g.top - 4, 4, GOLD, 0.8);
}

/** Apply the fire kick-back: the whole tower leans and squashes. */
function recoilTransform(ctx: CanvasRenderingContext2D, x: number, y: number, ease: number): void {
  if (ease <= 0) return;
  ctx.translate(x, y);
  ctx.rotate(-0.03 * ease);
  ctx.scale(1 + 0.028 * ease, 1 - 0.036 * ease);
  ctx.translate(-x, -y);
}

/** Painter for the pivoting gun layer of a cannon. */
function gunPainter<G extends TowerGeo>(
  paint: FamilyPaint<G>,
  x: number,
  y: number,
  w: number,
  h: number,
  ease: number,
): Painter<G> {
  void x;
  void y;
  void w;
  void h;
  void ease;
  return paint.gun ?? paint.crew;
}

function renderTower<G extends TowerGeo>(
  ctx: CanvasRenderingContext2D,
  tower: TowerRenderData,
  color: string,
  t: number,
  ph: number,
  ease: number,
  geo: G,
  paint: FamilyPaint<G>,
): void {
  const x = tower.x;
  const y = tower.y;
  const w = geo.w;
  const h = geo.h;
  const key = `tower:${tower.dataId}:${tower.level}:${tower.specId ?? 'base'}:${w}x${h}`;
  const bake = (layer: string, painter: Painter<G>): HTMLCanvasElement =>
    sprites.get(`${key}:${layer}`, w, h, (c) => {
      c.save();
      c.translate(w / 2, h - PAD_B);
      painter(c, geo, color);
      c.restore();
    });

  const body = bake('b', paint.body);
  const crew = bake('c', paint.crew);
  const gun = paint.gun ? bake('g', paint.gun) : null;

  // Ground contact: tight shadow, thrown shadow, ambient occlusion.
  contactShadow(ctx, x + 1, y + 3, 21, 9, 0.34);
  castShadow(ctx, x + 3, y + 5, 19, 8.5, Math.min(46, geo.height * 0.5), 0.17);
  groundAO(ctx, x, y + 3, 27, 11.5, 0.17);

  ctx.save();
  recoilTransform(ctx, x, y, ease);

  sprites.blit(ctx, body, x, y + PAD_B, w, h, { ax: 0.5, ay: 1 });
  for (let i = 0; i < geo.glows.length; i++) {
    const gl = geo.glows[i];
    windowFlicker(ctx, x + gl.x, y + gl.y, gl.w, gl.h, gl.arched, t, ph);
  }
  for (let i = 0; i < geo.torches.length; i++) {
    const tc = geo.torches[i];
    torchFlame(ctx, x + tc.x, y + tc.y, tc.s, t, ph);
  }
  if (geo.banner) {
    clothBanner(ctx, x + geo.banner.x, y + geo.banner.y, geo.banner, t, ph);
  }

  const wdx = -geo.revolver * ease;
  const wdy = 0.9 * ease;
  let mx = geo.muzzle ? geo.muzzle.x + wdx : 0;
  let my = geo.muzzle ? geo.muzzle.y + wdy : 0;

  if (gun && geo.gunPivot && geo.muzzle) {
    // Artillery pitches with the elevation of what it is shooting at.
    const a = tower.aimAngle ?? -Math.PI / 2;
    const elev = Math.max(-0.6, Math.min(1, -Math.sin(a)));
    const pitch = -0.5 * elev;
    const px = x + geo.gunPivot.x;
    const py = y + geo.gunPivot.y;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(pitch);
    ctx.translate(-px, -py);
    sprites.blit(ctx, gun, x + wdx, y + PAD_B + wdy, w, h, { ax: 0.5, ay: 1 });
    ctx.restore();
    const c = Math.cos(pitch);
    const sn = Math.sin(pitch);
    const rx = geo.muzzle.x - geo.gunPivot.x;
    const ry = geo.muzzle.y - geo.gunPivot.y;
    mx = geo.gunPivot.x + rx * c - ry * sn + wdx;
    my = geo.gunPivot.y + rx * sn + ry * c + wdy;
  } else {
    sprites.blit(ctx, crew, x + wdx, y + PAD_B + wdy, w, h, { ax: 0.5, ay: 1 });
  }
  if (gun) {
    sprites.blit(ctx, crew, x, y + PAD_B, w, h, { ax: 0.5, ay: 1 });
  }
  if (geo.muzzle && ease > 0) {
    drawFlash(ctx, geo.flash, x + mx, y + my, ease, ph);
  }
  if (geo.orbs) {
    arcaneOrbs(ctx, x + geo.orbs.x, y + geo.orbs.y, geo.orbs.rx, geo.orbs.ry, t, ph);
  }
  ctx.restore();

  if (tower.stunTimer > 0) {
    drawStun(ctx, x, y + geo.top, t, ph);
  }
}

export function drawTowerDirect(
  ctx: CanvasRenderingContext2D,
  tower: TowerRenderData,
): void {
  const data = TOWERS[tower.dataId];
  if (!data) return;

  const t = performance.now() / 1000;
  const ph = (tower.id * 2.399963) % TAU;
  const ease = tower.animTimer > 0 ? Math.max(0, Math.min(1, tower.animTimer / ANIM)) : 0;

  switch (tower.dataId) {
    case 'archer':
      renderTower(ctx, tower, data.color, t, ph, ease, archerGeo(tower.level, tower.specId), ARCHER_PAINT);
      break;
    case 'mage':
      renderTower(ctx, tower, data.color, t, ph, ease, mageGeo(tower.level, tower.specId), MAGE_PAINT);
      break;
    case 'cannon':
      renderTower(ctx, tower, data.color, t, ph, ease, cannonGeo(tower.level, tower.specId), CANNON_PAINT);
      break;
    case 'barracks':
      renderTower(ctx, tower, data.color, t, ph, ease, barracksGeo(tower.level, tower.specId), BARRACKS_PAINT);
      break;
    default:
      renderTower(ctx, tower, data.color, t, ph, ease, genericGeo(tower.level), { body: genericBody, crew: genericCrew });
  }
}

export function drawBuildSlotDirect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  occupied: boolean,
  hovered: boolean,
  selected: boolean,
): void {
  if (occupied) return;

  const t = performance.now() / 1000;
  const ph = ((x * 7.3 + y * 3.1) % 100) * 0.063;
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.3 + ph);
  const SW = 60;
  const SH = 40;
  const disc = sprites.get(`slot:${SW}x${SH}`, SW, SH, (c) => {
    c.save();
    c.translate(SW / 2, SH / 2 + 2);
    // rock footing
    ellPath(c, 0, 2.6, 20, 8.4);
    ink(c, grad(c, -20, -4, 20, 10, '#7f7a70', 0.14, 0.44), 1.5);
    ellPath(c, 0, -1.4, 20, 8.4);
    ink(c, grad(c, -20, -8, 20, 6, '#a49d8d', 0.3, 0.34), 1.5);
    outline(c, () => ellPath(c, 0, -1.4, 20, 8.4), SHADOW_TINT, 1.4);
    // paving stones
    for (let i = 0; i < 8; i++) {
      const a = Math.PI * (0.04 + (0.92 * i) / 7);
      const px = Math.cos(a) * 12.5;
      const py = -1.4 + Math.sin(a) * 5.2;
      roundRectPath(c, px - 3.2, py - 1.7, 6.4, 3.4, 1.2);
      ink(c, mix('#a49d8d', '#ffffff', i % 2 === 0 ? 0.09 : 0.0), 0.6);
    }
    // chiselled rune ring
    c.strokeStyle = 'rgba(255,225,150,0.5)';
    c.lineWidth = 0.9;
    c.beginPath();
    c.ellipse(0, -1.4, 15.5, 6.4, 0, 0, TAU);
    c.stroke();
    c.restore();
  });

  contactShadow(ctx, x + 1, y + 3, 22, 9, 0.3);
  groundAO(ctx, x, y + 3, 26, 11, 0.14);
  sprites.blit(ctx, disc, x, y - 2, SW, SH, { ax: 0.5, ay: 0.5 });

  ctx.save();
  // slow-turning rune ticks
  ctx.save();
  ctx.translate(x, y - 1.4);
  ctx.rotate(t * 0.22);
  ctx.strokeStyle = hovered ? 'rgba(255,232,170,0.85)' : 'rgba(255,225,150,0.42)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) {
    ctx.rotate(TAU / 6);
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(0, -9.4);
    ctx.stroke();
  }
  ctx.restore();

  if (hovered || selected) {
    const ring = selected ? 'rgba(255,206,80,0.95)' : `rgba(255,232,170,${0.5 + pulse * 0.45})`;
    ctx.strokeStyle = SHADOW_TINT;
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.ellipse(x, y - 1.4, 21.5, 9.2, 0, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = ring;
    ctx.lineWidth = selected ? 2.6 : 2;
    ctx.beginPath();
    ctx.ellipse(x, y - 1.4, 21.5, 9.2, 0, 0, TAU);
    ctx.stroke();
    if (selected) {
      ctx.strokeStyle = 'rgba(255,206,80,0.75)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.ellipse(x, y - 1.4, 25.4, 11.6, 0, t * 1.6, t * 1.6 + TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // vector "+": two rounded bars, never a glyph
  const grow = hovered ? 1 + pulse * 0.14 : 1;
  const barW = 13 * grow;
  const barT = 3.4 * grow;
  const cy = y - 2.6;
  const plusPath = (): void => {
    roundRectPath(ctx, x - barT / 2, cy - barW / 2, barT, barW, barT / 2);
    roundRectPath(ctx, x - barW / 2, cy - barT / 2, barW, barT, barT / 2);
  };
  plusPath();
  ink(ctx, grad(ctx, x - barW / 2, cy - barW / 2, x + barW / 2, cy + barW / 2, hovered ? '#ffe7a8' : '#e6d3a4', 0.34, 0.28), 1.3);
  ctx.restore();
}
