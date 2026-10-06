// ─── Map Renderer ────────────────────────────────────────────────
// Every environment pixel in the game is drawn here, by code:
// terrain, roads, props, the spawn gate and the last bastion itself.
//
// Kingdom Rush-inspired rules used throughout:
//   • one sun, fixed at the upper-left (Lighting.SUN_DIR)
//   • every silhouette gets a thick dark outline (SHADOW_TINT, never black)
//   • every volume gets three tones: lit top-left, base, shaded bottom-right
//   • a warm rim light on the up-left edges (RIM_LIGHT)
//   • a tight contact shadow plus a soft cast shadow to the lower-right
//   • nothing is flat: noise, patches, speckles, moss, cracks, gravel
//
// Cost model: the terrain, the road, the props, the gate and the castle are
// all baked once into supersampled offscreen canvases (SpriteBank / private
// caches) and only blitted per frame.

import { Vec2, DESIGN_WIDTH, DESIGN_HEIGHT } from '../data/types';
import { sprites } from './SpriteBank';
import {
  contactShadow,
  castShadow,
  castShadowOffset,
  groundAO,
  rimLight,
  outline,
  bodyGradient,
  mix,
} from './Lighting';
import { SHADOW_TINT, RIM_LIGHT, COOL_SHADOW, getThemeArt } from './Palette';

// ─── Deterministic noise ─────────────────────────────────────────

function hash2(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h & 0x7fffffff) / 0x7fffffff;
}

/** Small deterministic PRNG: the scatter must never change between frames. */
function rng(seed: number): () => number {
  let s = (seed | 0) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash2(ix, iy);
  const n10 = hash2(ix + 1, iy);
  const n01 = hash2(ix, iy + 1);
  const n11 = hash2(ix + 1, iy + 1);
  return (n00 * (1 - sx) + n10 * sx) * (1 - sy) + (n01 * (1 - sx) + n11 * sx) * sy;
}

function fbm(x: number, y: number, octaves: number): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += valueNoise(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxValue;
}

/** Seamless value noise (wraps on `period`) so a noise tile can be repeated. */
function wrapNoise(x: number, y: number, period: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const m = Math.max(1, Math.round(period));
  const x0 = ((ix % m) + m) % m;
  const y0 = ((iy % m) + m) % m;
  const x1 = (x0 + 1) % m;
  const y1 = (y0 + 1) % m;
  const n00 = hash2(x0, y0);
  const n10 = hash2(x1, y0);
  const n01 = hash2(x0, y1);
  const n11 = hash2(x1, y1);
  return (n00 * (1 - sx) + n10 * sx) * (1 - sy) + (n01 * (1 - sx) + n11 * sx) * sy;
}

function wrapFbm(x: number, y: number, period: number, octaves: number): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let per = period;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += wrapNoise(x * frequency, y * frequency, per) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
    per *= 2;
  }
  return value / maxValue;
}

/** Greyscale, seamless grain tile used to break up flat fills. */
function noiseTile(seed: number, size: number, cells: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const g = cv.getContext('2d')!;
  const img = g.createImageData(size, size);
  const data = img.data;
  const base = size / cells;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = wrapFbm(x / base, y / base, cells, 4);
      const v = Math.max(0, Math.min(255, Math.round(128 + (n - 0.5) * 156)));
      const i = (y * size + x) * 4;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return cv;
}

// ─── Colour helpers ──────────────────────────────────────────────

function rgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** Towards the sun: warm, saturated highlight. */
function lit(hex: string, t: number): string {
  return mix(hex, '#fff3d2', t);
}

/** Away from the sun: cool, tinted shade (never grey mush). */
function shade(hex: string, t: number): string {
  return mix(hex, COOL_SHADOW, t);
}

// ─── Level themes ────────────────────────────────────────────────

export interface LevelTheme {
  grassBase: string;
  grassHighlight: string;
  grassDark: string;
  pathBase: string;
  pathLight: string;
  pathDark: string;
  waterColor: string;
  skyGradient: [string, string];
  ambientLight: string;
  fogColor: string;
  fogDensity: number;
  treeTrunk: string;
  treeCanopy: string[];
  rockColor: string[];
  flowerColors: string[];
  /** Art tokens mirrored from Palette.THEME_ART (single source of truth). */
  groundTint: string;
  ambient: string;
  fog: string;
  foliageTip: string;
  foliageBase: string;
  accent: string;
  decal: string;
  /** Per-level atmosphere. */
  flavor: 'valley' | 'forest' | 'stone' | 'swamp' | 'wastes';
  grassTuft: [string, string, string];
  pebble: [string, string];
  moss: string;
  haze: string;
  /** Glowing accent (hex) and how strong it is on this level, 0..1. */
  ember: string;
  emberAmount: number;
  /** 0..1: puddles, damp sheen. */
  wet: number;
  /** Charred, leafless vegetation. */
  dead: boolean;
  barkLight: string;
}

function artTokens(levelId: string): Pick<
  LevelTheme,
  'groundTint' | 'ambient' | 'fog' | 'foliageTip' | 'foliageBase' | 'accent' | 'decal'
> {
  const a = getThemeArt(levelId);
  return {
    groundTint: a.groundTint,
    ambient: a.ambient,
    fog: a.fog,
    foliageTip: a.foliageTip,
    foliageBase: a.foliageBase,
    accent: a.accent,
    decal: a.decal,
  };
}

const LEVEL_THEMES: Record<string, LevelTheme> = {
  level_1: {
    ...artTokens('level_1'),
    grassBase: '#52973f',
    grassHighlight: '#6cba4e',
    grassDark: '#3b7a2c',
    pathBase: '#c9a86e',
    pathLight: '#e6cb96',
    pathDark: '#7c6238',
    waterColor: '#4a90c4',
    skyGradient: ['#87CEEB', '#b8e0f0'],
    ambientLight: '#fffbe6',
    fogColor: '#e8f4e8',
    fogDensity: 0,
    treeTrunk: '#6b4a30',
    treeCanopy: ['#2f8a30', '#3fa93c', '#54c04a', '#226f26'],
    rockColor: ['#9a9a86', '#b3b39c', '#7c7c6a'],
    flowerColors: ['#ff6b9d', '#ffd93b', '#e05ffb', '#8a6bff'],
    flavor: 'valley',
    grassTuft: ['#7cc95a', '#57a740', '#3b7c2f'],
    pebble: ['#aaa795', '#84816d'],
    moss: '#6d9b4a',
    haze: 'rgba(255,246,214,0.10)',
    ember: '#ffb648',
    emberAmount: 0,
    wet: 0,
    dead: false,
    barkLight: '#8a6142',
  },
  level_2: {
    ...artTokens('level_2'),
    grassBase: '#37702f',
    grassHighlight: '#4c8f3c',
    grassDark: '#235323',
    pathBase: '#9c8260',
    pathLight: '#bda37c',
    pathDark: '#5d472c',
    waterColor: '#3a7a9a',
    skyGradient: ['#5a8a5a', '#8ab880'],
    ambientLight: '#e0ffe0',
    fogColor: '#a8d8a8',
    fogDensity: 0.18,
    treeTrunk: '#4e3526',
    treeCanopy: ['#1d6b21', '#28802b', '#1a5a1d', '#33a134'],
    rockColor: ['#71806c', '#87957e', '#5c6b58'],
    flowerColors: ['#b6d94a', '#8fbf3a', '#d6ea6a'],
    flavor: 'forest',
    grassTuft: ['#5f9c3f', '#417a2c', '#2a5822'],
    pebble: ['#8b8f7c', '#6b6f5c'],
    moss: '#5d8f3c',
    haze: 'rgba(190,225,190,0.14)',
    ember: '#b6e35c',
    emberAmount: 0.12,
    wet: 0.18,
    dead: false,
    barkLight: '#6d4c35',
  },
  level_3: {
    ...artTokens('level_3'),
    grassBase: '#5f7a58',
    grassHighlight: '#748f68',
    grassDark: '#42583e',
    pathBase: '#8b8175',
    pathLight: '#aba298',
    pathDark: '#4f4840',
    waterColor: '#5c86a8',
    skyGradient: ['#8a9aaa', '#a0aab4'],
    ambientLight: '#d0d8e0',
    fogColor: '#b0b8c0',
    fogDensity: 0.26,
    treeTrunk: '#4a3c2e',
    treeCanopy: ['#3a6a3f', '#4a7c4a', '#2c5730', '#5b8f56'],
    rockColor: ['#82868c', '#9aa0a6', '#666b72', '#4f545b'],
    flowerColors: ['#a9b6c4', '#8d9aa8', '#c3d0dc'],
    flavor: 'stone',
    grassTuft: ['#7d9b6e', '#5d7a50', '#425c3a'],
    pebble: ['#8d9299', '#696e75'],
    moss: '#6f8f5e',
    haze: 'rgba(198,214,228,0.18)',
    ember: '#7fc8ff',
    emberAmount: 0,
    wet: 0.85,
    dead: false,
    barkLight: '#6a5442',
  },
  level_4: {
    ...artTokens('level_4'),
    grassBase: '#33552c',
    grassHighlight: '#436b34',
    grassDark: '#1f3a1a',
    pathBase: '#5f5445',
    pathLight: '#7d7160',
    pathDark: '#382f26',
    waterColor: '#2f5a3a',
    skyGradient: ['#3a4a3a', '#4a5a4a'],
    ambientLight: '#a0c0a0',
    fogColor: '#5a7a5a',
    fogDensity: 0.38,
    treeTrunk: '#3a2c1c',
    treeCanopy: ['#2a5228', '#1d3f1e', '#39682f', '#173317'],
    rockColor: ['#5b5f4c', '#6d7160', '#474a3a'],
    flowerColors: ['#8ff05a', '#4cf08a', '#b6fa3a'],
    flavor: 'swamp',
    grassTuft: ['#6fae44', '#4a8032', '#2b5520'],
    pebble: ['#6f7561', '#525848'],
    moss: '#5f8f46',
    haze: 'rgba(140,190,140,0.20)',
    ember: '#8ff05a',
    emberAmount: 0.7,
    wet: 1,
    dead: false,
    barkLight: '#54402a',
  },
  level_5: {
    ...artTokens('level_5'),
    grassBase: '#4d4438',
    grassHighlight: '#605546',
    grassDark: '#352e27',
    pathBase: '#6b5340',
    pathLight: '#8d6f52',
    pathDark: '#3c2a1c',
    waterColor: '#ff4a2a',
    skyGradient: ['#4a2020', '#6a3030'],
    ambientLight: '#ffa060',
    fogColor: '#4a2020',
    fogDensity: 0.24,
    treeTrunk: '#2e2018',
    treeCanopy: ['#3c3226', '#4a3f2e', '#2a231a', '#574a34'],
    rockColor: ['#4e4540', '#5f544c', '#3a332e'],
    flowerColors: ['#ff6a3a', '#ff4a2a', '#ffaa3a'],
    flavor: 'wastes',
    grassTuft: ['#7a6a4a', '#5c4f38', '#3c3326'],
    pebble: ['#6b625a', '#484140'],
    moss: '#5a5240',
    haze: 'rgba(255,150,90,0.16)',
    ember: '#ff7a2e',
    emberAmount: 1,
    wet: 0,
    dead: true,
    barkLight: '#4a382a',
  },
};

export function getTheme(levelId: string): LevelTheme {
  return LEVEL_THEMES[levelId] || LEVEL_THEMES.level_1;
}

// ─── Shared drawing primitives ───────────────────────────────────

/** Organic closed blob: a circle whose radius breathes with three harmonics. */
function lobePath(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  seed: number,
  wob = 0.14,
  squashY = 1,
  segments = 22,
): void {
  const rand = rng(seed);
  const a1 = rand() * 6.2832;
  const a2 = rand() * 6.2832;
  const a3 = rand() * 6.2832;
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * 6.2832;
    const rr = r * (
      1 +
      wob * Math.sin(3 * t + a1) +
      wob * 0.55 * Math.sin(5 * t + a2) +
      wob * 0.4 * Math.sin(2 * t + a3)
    );
    const x = cx + Math.cos(t) * rr;
    const y = cy + Math.sin(t) * rr * squashY;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Angular faceted outline used for rocks and stone slabs. */
function stonePath(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  rx: number, ry: number,
  seed: number,
  facets = 8,
): void {
  const rand = rng(seed);
  const k: number[] = [];
  for (let i = 0; i < facets; i++) k.push(0.76 + rand() * 0.44);
  ctx.beginPath();
  for (let i = 0; i <= facets; i++) {
    const t = (i / facets) * 6.2832;
    const f = k[i % facets];
    const x = cx + Math.cos(t) * rx * f;
    const y = cy + Math.sin(t) * ry * f;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const len2 = vx * vx + vy * vy;
  let t = len2 > 0 ? (wx * vx + wy * vy) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}

/**
 * Flatten the smoothed road (the exact curve `traceCurvedPath` strokes) into
 * evenly spaced points, so offsets, gravel and edge grass follow the road.
 */
function flattenPath(waypoints: Vec2[], step: number): Vec2[] {
  const out: Vec2[] = [{ x: waypoints[0].x, y: waypoints[0].y }];
  if (waypoints.length < 2) return out;

  const mid = (a: Vec2, b: Vec2): Vec2 => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  const line = (a: Vec2, b: Vec2): void => {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(d / step));
    for (let i = 1; i <= n; i++) {
      out.push({ x: a.x + (b.x - a.x) * (i / n), y: a.y + (b.y - a.y) * (i / n) });
    }
  };

  const quad = (a: Vec2, c: Vec2, b: Vec2): void => {
    const d = Math.hypot(c.x - a.x, c.y - a.y) + Math.hypot(b.x - c.x, b.y - c.y);
    const n = Math.max(2, Math.ceil(d / step));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;
      out.push({
        x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
        y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
      });
    }
  };

  let from = mid(waypoints[0], waypoints[1]);
  line(waypoints[0], from);
  for (let i = 2; i <= waypoints.length - 1; i++) {
    const to = mid(waypoints[i - 1], waypoints[i]);
    quad(from, waypoints[i - 1], to);
    from = to;
  }
  line(from, waypoints[waypoints.length - 1]);
  return out;
}

/** Exact same road shape the stroking code uses. */
function traceCurvedPath(ctx: CanvasRenderingContext2D, waypoints: Vec2[]): void {
  ctx.beginPath();
  ctx.moveTo(waypoints[0].x, waypoints[0].y);
  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    if (i === 1) ctx.lineTo(midX, midY);
    else ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
  }
  const last = waypoints[waypoints.length - 1];
  ctx.lineTo(last.x, last.y);
}

function strokeFlat(ctx: CanvasRenderingContext2D, pts: Vec2[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

function normalAt(pts: Vec2[], i: number): { x: number; y: number } {
  const a = pts[Math.max(0, i - 1)];
  const b = pts[Math.min(pts.length - 1, i + 1)];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: -dy / len, y: dx / len };
}

function offsetPolyline(pts: Vec2[], off: number, wobble: number, seed: number): Vec2[] {
  const rand = rng(seed);
  const out: Vec2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const n = normalAt(pts, i);
    const o = off + (rand() - 0.5) * wobble;
    out.push({ x: pts[i].x + n.x * o, y: pts[i].y + n.y * o });
  }
  return out;
}

function makePathProbe(path: Vec2[]): (x: number, y: number) => number {
  if (path.length === 0) return () => 1e9;
  const pts = path.length >= 2 ? flattenPath(path, 14) : path;
  if (pts.length === 1) {
    const p = pts[0];
    return (x, y) => Math.hypot(x - p.x, y - p.y);
  }
  return (x, y) => {
    let best = 1e9;
    for (let i = 1; i < pts.length; i++) {
      const d = distToSegment(x, y, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      if (d < best) best = d;
    }
    return best;
  };
}

/** Cluster of tapered blades — the workhorse of every grassy surface. */
function bladeTuft(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  count: number,
  height: number,
  tones: [string, string, string],
  rand: () => number,
): void {
  for (let t = 0; t < 3; t++) {
    ctx.beginPath();
    let drew = false;
    for (let i = 0; i < count; i++) {
      if (i % 3 !== t) continue;
      const spread = count > 1 ? i / (count - 1) - 0.5 : 0;
      const ang = -Math.PI / 2 + spread * 1.7 + (rand() - 0.5) * 0.3;
      const len = height * (0.5 + rand() * 0.75);
      const bx = x + (rand() - 0.5) * 3.4;
      const tipX = bx + Math.cos(ang) * len * 0.9;
      const tipY = y + Math.sin(ang) * len;
      const w = 0.55 + rand() * 0.5;
      ctx.moveTo(bx - w, y);
      ctx.quadraticCurveTo(bx - w * 1.5, y - len * 0.55, tipX, tipY);
      ctx.quadraticCurveTo(bx + w * 1.5, y - len * 0.55, bx + w, y);
      ctx.closePath();
      drew = true;
    }
    if (drew) {
      ctx.fillStyle = tones[t];
      ctx.fill();
    }
  }
}

function drawFlower(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  r: number,
  petal: string,
  center: string,
  rand: () => number,
): void {
  const stemH = 3 + rand() * 4;
  ctx.strokeStyle = 'rgba(60,110,50,0.85)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + (rand() - 0.5) * 2, y - stemH * 0.6, x, y - stemH);
  ctx.stroke();
  ctx.fillStyle = 'rgba(74,124,58,0.9)';
  lobePath(ctx, x + 2.2, y - stemH * 0.5, 1.9, (x * 13 + y * 7) | 0, 0.3, 0.5, 10);
  ctx.fill();

  const hy = y - stemH;
  const petals = 5 + Math.floor(rand() * 2);
  ctx.fillStyle = petal;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * 6.2832;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.72, hy + Math.sin(a) * r * 0.72, r * 0.62, r * 0.5, a, 0, 6.2832);
    ctx.fill();
  }
  ctx.fillStyle = rgba(lit(petal, 0.5), 0.7);
  for (let i = 0; i < petals; i += 2) {
    const a = (i / petals) * 6.2832;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.6 - r * 0.2, hy + Math.sin(a) * r * 0.6 - r * 0.25, r * 0.3, r * 0.22, a, 0, 6.2832);
    ctx.fill();
  }
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(x, hy, r * 0.42, 0, 6.2832);
  ctx.fill();
  ctx.fillStyle = rgba(lit(center, 0.55), 0.9);
  ctx.beginPath();
  ctx.arc(x - r * 0.14, hy - r * 0.16, r * 0.17, 0, 6.2832);
  ctx.fill();
}

function drawPebble(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  r: number,
  col: string,
  seed: number,
): void {
  ctx.fillStyle = rgba(SHADOW_TINT, 0.28);
  lobePath(ctx, x + r * 0.22, y + r * 0.3, r * 1.05, seed, 0.3, 0.6, 12);
  ctx.fill();
  ctx.fillStyle = col;
  lobePath(ctx, x, y, r, seed + 7, 0.28, 0.68, 12);
  ctx.fill();
  ctx.fillStyle = rgba(lit(col, 0.4), 0.75);
  lobePath(ctx, x - r * 0.22, y - r * 0.24, r * 0.5, seed + 3, 0.2, 0.55, 10);
  ctx.fill();
}

function noiseOverlay(
  ctx: CanvasRenderingContext2D,
  tile: HTMLCanvasElement,
  scale: number,
  alpha: number,
  mode: GlobalCompositeOperation,
): void {
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = alpha;
  ctx.scale(scale, scale);
  const pattern = ctx.createPattern(tile, 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, DESIGN_WIDTH / scale + tile.width, DESIGN_HEIGHT / scale + tile.height);
  }
  ctx.restore();
}

// ─── Terrain (background) ────────────────────────────────────────

const BG_SS = 2; // supersample factor of the baked terrain
let cachedBgCanvas: HTMLCanvasElement | null = null;
let cachedBgLevelId = '';

/** Soft colour patches, 1–2 per jittered cell: kills any banding. */
function paintPatches(
  ctx: CanvasRenderingContext2D,
  theme: LevelTheme,
  rand: () => number,
): void {
  const cellW = 104;
  const cellH = 84;
  for (let gy = -1; gy * cellH < DESIGN_HEIGHT + cellH; gy++) {
    for (let gx = -1; gx * cellW < DESIGN_WIDTH + cellW; gx++) {
      if (rand() > 0.86) continue;
      const cx = gx * cellW + cellW * 0.5 + (rand() - 0.5) * cellW * 0.95;
      const cy = gy * cellH + cellH * 0.5 + (rand() - 0.5) * cellH * 0.95;
      const r = 44 + rand() * 78;
      const kind = rand();
      const col = kind < 0.3
        ? theme.grassHighlight
        : kind < 0.58
          ? theme.grassDark
          : kind < 0.78
            ? theme.foliageBase
            : theme.groundTint;
      const alpha = 0.09 + rand() * 0.15;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, rgba(col, alpha));
      grad.addColorStop(0.6, rgba(col, alpha * 0.5));
      grad.addColorStop(1, rgba(col, 0));
      ctx.globalCompositeOperation = kind < 0.3 ? 'screen' : 'multiply';
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 6.2832);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

/** Moss, mud, leaf litter and twigs scattered over the ground. */
function paintDecals(
  ctx: CanvasRenderingContext2D,
  theme: LevelTheme,
  rand: () => number,
  probe: (x: number, y: number) => number,
): void {
  for (let i = 0; i < 150; i++) {
    const x = rand() * DESIGN_WIDTH;
    const y = rand() * DESIGN_HEIGHT;
    const nearRoad = probe(x, y) < 30;
    const r = 6 + rand() * 20;
    ctx.globalAlpha = (nearRoad ? 0.34 : 0.5) + rand() * 0.4;
    ctx.fillStyle = theme.decal;
    lobePath(ctx, x, y, r, i * 7919 + 13, 0.3, 0.62, 16);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Leaf litter: two-tone leaves with a folded highlight.
  for (let i = 0; i < 130; i++) {
    const x = rand() * DESIGN_WIDTH;
    const y = rand() * DESIGN_HEIGHT;
    if (probe(x, y) < 26) continue;
    const a = rand() * 6.2832;
    const r = 2 + rand() * 2.6;
    const base = rand() < 0.5 ? theme.foliageBase : theme.grassDark;
    ctx.fillStyle = rgba(base, 0.85);
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.55, a, 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = rgba(theme.foliageTip, 0.5);
    ctx.beginPath();
    ctx.ellipse(x - 0.3, y - 0.3, r * 0.5, r * 0.28, a, 0, 6.2832);
    ctx.fill();
  }

  // Twigs / dry stems.
  ctx.strokeStyle = rgba(shade(theme.treeTrunk, 0.2), 0.55);
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 60; i++) {
    const x = rand() * DESIGN_WIDTH;
    const y = rand() * DESIGN_HEIGHT;
    if (probe(x, y) < 24) continue;
    const a = rand() * 6.2832;
    const len = 5 + rand() * 11;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5 - 1.5, x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
}

/** Dense grass cover: jittered grid of tufts, three tones + warm tips. */
function paintGrass(
  ctx: CanvasRenderingContext2D,
  theme: LevelTheme,
  rand: () => number,
  probe: (x: number, y: number) => number,
): void {
  const cellW = 29;
  const cellH = 25;
  for (let gy = 0; gy * cellH < DESIGN_HEIGHT; gy++) {
    for (let gx = 0; gx * cellW < DESIGN_WIDTH; gx++) {
      const cx = gx * cellW + cellW * 0.5 + (rand() - 0.5) * cellW * 0.96;
      const cy = gy * cellH + cellH * 0.5 + (rand() - 0.5) * cellH * 0.96;
      if (probe(cx, cy) < 25) continue;
      const moisture = fbm(cx * 0.0045 + 11, cy * 0.0045 + 7, 3);
      if (rand() > 0.38 + moisture * 0.46) continue;

      ctx.fillStyle = rgba(SHADOW_TINT, 0.16);
      lobePath(ctx, cx, cy + 1, 4.2, (cx * 31 + cy * 17) | 0, 0.3, 0.42, 12);
      ctx.fill();

      const count = 5 + Math.floor(rand() * 8);
      bladeTuft(ctx, cx, cy, count, 6 + rand() * 7, theme.grassTuft, rand);

      if (rand() < 0.34) {
        ctx.globalAlpha = 0.6;
        bladeTuft(ctx, cx + 1, cy, 2, 5 + rand() * 5, [theme.foliageTip, theme.grassTuft[0], theme.grassTuft[1]], rand);
        ctx.globalAlpha = 1;
      }
    }
  }
}

function paintFlowers(
  ctx: CanvasRenderingContext2D,
  theme: LevelTheme,
  rand: () => number,
  probe: (x: number, y: number) => number,
): void {
  const count = theme.dead ? 26 : 90;
  for (let i = 0; i < count; i++) {
    const x = rand() * DESIGN_WIDTH;
    const y = rand() * DESIGN_HEIGHT;
    if (probe(x, y) < 26) continue;
    const petal = theme.flowerColors[i % theme.flowerColors.length];
    drawFlower(ctx, x, y, 2 + rand() * 2.2, petal, theme.dead ? theme.accent : '#ffe9a8', rand);
  }
}

function paintPebbles(
  ctx: CanvasRenderingContext2D,
  theme: LevelTheme,
  rand: () => number,
  probe: (x: number, y: number) => number,
): void {
  const count = theme.flavor === 'stone' ? 220 : 90;
  for (let i = 0; i < count; i++) {
    const x = rand() * DESIGN_WIDTH;
    const y = rand() * DESIGN_HEIGHT;
    const d = probe(x, y);
    if (d < 22) continue;
    const r = 1.4 + rand() * (d < 60 ? 3.4 : 2.2);
    drawPebble(ctx, x, y, r, theme.pebble[rand() < 0.5 ? 0 : 1], i * 6151 + 5);
  }
}

/** Level-specific ground storytelling. */
function paintFlavor(
  ctx: CanvasRenderingContext2D,
  theme: LevelTheme,
  rand: () => number,
  probe: (x: number, y: number) => number,
): void {
  const W = DESIGN_WIDTH;
  const H = DESIGN_HEIGHT;

  if (theme.flavor === 'forest' || theme.flavor === 'swamp') {
    // Ferns: a fan of fronds with a lit central rib.
    const ferns = theme.flavor === 'forest' ? 120 : 70;
    for (let i = 0; i < ferns; i++) {
      const x = rand() * W;
      const y = rand() * H;
      if (probe(x, y) < 30) continue;
      const n = 5 + Math.floor(rand() * 4);
      const size = 10 + rand() * 13;
      for (let f = 0; f < n; f++) {
        const a = -Math.PI / 2 + (f / (n - 1) - 0.5) * 2.1;
        const len = size * (0.7 + rand() * 0.5);
        const midX = x + Math.cos(a) * len * 0.5;
        const midY = y + Math.sin(a) * len * 0.5;
        const tipX = x + Math.cos(a) * len;
        const tipY = y + Math.sin(a) * len;
        ctx.strokeStyle = rgba(theme.grassTuft[0], 0.9);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(midX, midY, tipX, tipY);
        ctx.stroke();
        ctx.strokeStyle = rgba(theme.foliageTip, 0.65);
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.fillStyle = rgba(theme.grassTuft[1], 0.85);
        for (let s = 1; s < 5; s++) {
          const t = s / 5;
          const bx = x + (tipX - x) * t;
          const by = y + (tipY - y) * t;
          ctx.beginPath();
          ctx.ellipse(bx, by, 1.5, 0.8, a, 0, 6.2832);
          ctx.fill();
        }
      }
    }
    // Tree shade pooled on the floor of a dense wood.
    for (let i = 0; i < 26; i++) {
      const x = rand() * W;
      const y = rand() * H;
      const r = 40 + rand() * 70;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, rgba(theme.groundTint, 0.3));
      grad.addColorStop(1, rgba(theme.groundTint, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.2832);
      ctx.fill();
    }
  }

  if (theme.flavor === 'stone') {
    // Wet flagstones with chipped edges and dark joints.
    for (let i = 0; i < 46; i++) {
      const x = rand() * W;
      const y = rand() * H;
      if (probe(x, y) < 34) continue;
      const rx = 18 + rand() * 30;
      const ry = rx * (0.5 + rand() * 0.4);
      const col = theme.rockColor[Math.floor(rand() * theme.rockColor.length)];
      stonePath(ctx, x, y, rx, ry, i * 977 + 3, 9);
      ctx.fillStyle = rgba(shade(col, 0.3), 0.85);
      ctx.fill();
      stonePath(ctx, x - 0.6, y - 1.2, rx * 0.93, ry * 0.88, i * 977 + 3, 9);
      const grad = ctx.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
      grad.addColorStop(0, rgba(lit(col, 0.28), 0.95));
      grad.addColorStop(0.55, rgba(col, 0.92));
      grad.addColorStop(1, rgba(shade(col, 0.35), 0.95));
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = rgba(theme.pebble[1], 0.5);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - rx * 0.5, y - ry * 0.2);
      ctx.lineTo(x + rx * 0.2, y + ry * 0.35);
      ctx.stroke();
    }
  }

  if (theme.wet > 0.1) {
    // Puddles: darker rim, sky reflection, one bright glint.
    const puddles = Math.round(14 * theme.wet);
    for (let i = 0; i < puddles; i++) {
      const x = rand() * W;
      const y = rand() * H;
      if (probe(x, y) < 30) continue;
      const rx = 20 + rand() * 38;
      const ry = rx * (0.28 + rand() * 0.22);
      ctx.fillStyle = rgba(shade(theme.grassDark, 0.3), 0.55);
      lobePath(ctx, x, y, rx, i * 331 + 9, 0.16, ry / rx, 20);
      ctx.fill();
      const grad = ctx.createLinearGradient(x, y - ry, x, y + ry);
      grad.addColorStop(0, rgba(lit(theme.waterColor, 0.45), 0.85));
      grad.addColorStop(0.45, rgba(theme.waterColor, 0.9));
      grad.addColorStop(1, rgba(shade(theme.waterColor, 0.4), 0.9));
      ctx.fillStyle = grad;
      lobePath(ctx, x, y, rx * 0.94, i * 331 + 9, 0.16, ry / rx, 20);
      ctx.fill();
      ctx.strokeStyle = rgba(lit(theme.waterColor, 0.7), 0.7);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x - rx * 0.25, y - ry * 0.2, rx * 0.32, ry * 0.3, -0.2, 0.4, 2.6);
      ctx.stroke();
      if (theme.flavor === 'swamp') {
        for (let b = 0; b < 3; b++) {
          const bx = x + (rand() - 0.5) * rx;
          const by = y + (rand() - 0.5) * ry;
          ctx.fillStyle = rgba(theme.ember, 0.5);
          ctx.beginPath();
          ctx.arc(bx, by, 0.8 + rand() * 1.4, 0, 6.2832);
          ctx.fill();
        }
      }
    }
  }

  if (theme.emberAmount > 0.2) {
    // Glowing fissures: dark channel, ember core, bloom.
    const cracks = Math.round(16 * theme.emberAmount);
    for (let i = 0; i < cracks; i++) {
      let x = rand() * W;
      let y = rand() * H;
      if (probe(x, y) < 26) continue;
      const segs = 3 + Math.floor(rand() * 4);
      const pts: Vec2[] = [{ x, y }];
      let ang = rand() * 6.2832;
      for (let s = 0; s < segs; s++) {
        ang += (rand() - 0.5) * 1.5;
        const len = 14 + rand() * 26;
        x += Math.cos(ang) * len;
        y += Math.sin(ang) * len;
        pts.push({ x, y });
      }
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgba(SHADOW_TINT, 0.6);
      ctx.lineWidth = 4.6;
      strokeFlat(ctx, pts);
      ctx.strokeStyle = rgba(shade(theme.ember, 0.35), 0.95);
      ctx.lineWidth = 2.4;
      strokeFlat(ctx, pts);
      ctx.strokeStyle = rgba(lit(theme.ember, 0.55), 0.95);
      ctx.lineWidth = 1;
      strokeFlat(ctx, pts);
      const ax = pts[0].x;
      const ay = pts[0].y;
      const bloom = ctx.createRadialGradient(ax, ay, 0, ax, ay, 26);
      bloom.addColorStop(0, rgba(theme.ember, 0.34));
      bloom.addColorStop(1, rgba(theme.ember, 0));
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(ax, ay, 26, 0, 6.2832);
      ctx.fill();
    }
    // Ash specks and charred scars.
    for (let i = 0; i < 120; i++) {
      const x = rand() * W;
      const y = rand() * H;
      const r = 8 + rand() * 22;
      ctx.fillStyle = rgba('#1d1614', 0.22 + rand() * 0.3);
      lobePath(ctx, x, y, r, i * 4441 + 21, 0.34, 0.6, 14);
      ctx.fill();
    }
    ctx.fillStyle = rgba('#c9c2b6', 0.5);
    for (let i = 0; i < 260; i++) {
      const x = rand() * W;
      const y = rand() * H;
      ctx.fillRect(x, y, 1 + rand(), 1 + rand() * 0.8);
    }
  }

  if (theme.flavor === 'stone') {
    // Damp sheen on the slabs: a couple of cool streaks lit from up-left.
    for (let i = 0; i < 18; i++) {
      const x = rand() * W;
      const y = rand() * H;
      const w = 30 + rand() * 90;
      const grad = ctx.createLinearGradient(x, y, x + w, y + w * 0.3);
      grad.addColorStop(0, rgba('#dff2ff', 0));
      grad.addColorStop(0.5, rgba('#dff2ff', 0.1 + rand() * 0.1));
      grad.addColorStop(1, rgba('#dff2ff', 0));
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, 3 + rand() * 5);
    }
  }
}

/** Mist bands / dust veils that sit between the ground and the props. */
function paintHaze(ctx: CanvasRenderingContext2D, theme: LevelTheme, rand: () => number): void {
  const bands = Math.round(6 + theme.fogDensity * 26);
  for (let i = 0; i < bands; i++) {
    const y = rand() * DESIGN_HEIGHT;
    const h = 26 + rand() * 70;
    const grad = ctx.createLinearGradient(0, y - h * 0.5, 0, y + h * 0.5);
    grad.addColorStop(0, rgba(theme.fogColor, 0));
    grad.addColorStop(0.5, rgba(theme.fogColor, 0.1 + rand() * 0.12));
    grad.addColorStop(1, rgba(theme.fogColor, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, y - h * 0.5, DESIGN_WIDTH, h);
  }
}

function bakeTerrain(levelId: string, path: Vec2[]): HTMLCanvasElement {
  const theme = getTheme(levelId);
  const cv = document.createElement('canvas');
  cv.width = DESIGN_WIDTH * BG_SS;
  cv.height = DESIGN_HEIGHT * BG_SS;
  const ctx = cv.getContext('2d')!;
  ctx.save();
  ctx.scale(BG_SS, BG_SS);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const rand = rng(seedFromString(levelId));
  const probe = makePathProbe(path);

  // 1 — big base gradient (far/lit at the top, dark foreground below).
  const base = ctx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
  base.addColorStop(0, mix(theme.grassBase, theme.grassHighlight, 0.5));
  base.addColorStop(0.34, theme.grassBase);
  base.addColorStop(0.74, theme.grassDark);
  base.addColorStop(1, mix(theme.grassDark, theme.groundTint, 0.65));
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  // 2 — distance haze band along the top edge.
  const sky = ctx.createLinearGradient(0, 0, 0, 190);
  sky.addColorStop(0, rgba(theme.skyGradient[0], 0.28));
  sky.addColorStop(0.55, rgba(theme.skyGradient[1], 0.12));
  sky.addColorStop(1, rgba(theme.skyGradient[1], 0));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, DESIGN_WIDTH, 190);

  // 3 — warm sun wash from the upper-left.
  const sun = ctx.createRadialGradient(230, 90, 30, 230, 90, 1180);
  sun.addColorStop(0, rgba(theme.ambientLight, 0.26));
  sun.addColorStop(0.5, rgba(theme.ambientLight, 0.1));
  sun.addColorStop(1, rgba(theme.ambientLight, 0));
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  // 4 — soft colour patches.
  paintPatches(ctx, theme, rand);

  // 5 — fine grain, two scales.
  const tile = noiseTile(seedFromString(levelId) ^ 0x9e3779b9, 256, 6);
  noiseOverlay(ctx, tile, 1, 0.34, 'overlay');
  noiseOverlay(ctx, tile, 2.6, 0.24, 'overlay');
  noiseOverlay(ctx, tile, 0.55, 0.14, 'soft-light');

  // 6 — ground storytelling.
  paintDecals(ctx, theme, rand, probe);
  paintFlavor(ctx, theme, rand, probe);

  // 7 — vegetation.
  paintGrass(ctx, theme, rand, probe);
  paintFlowers(ctx, theme, rand, probe);
  paintPebbles(ctx, theme, rand, probe);

  // 8 — atmospheric depth.
  paintHaze(ctx, theme, rand);

  // 9 — internal vignette: the map darkens towards its own edges.
  const edge = ctx.createRadialGradient(560, 330, 240, 640, 360, 800);
  edge.addColorStop(0, rgba(theme.groundTint, 0));
  edge.addColorStop(0.62, rgba(theme.groundTint, 0.16));
  edge.addColorStop(1, rgba(theme.groundTint, 0.62));
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  const topBand = ctx.createLinearGradient(0, 0, 0, 90);
  topBand.addColorStop(0, rgba(theme.groundTint, 0.34));
  topBand.addColorStop(1, rgba(theme.groundTint, 0));
  ctx.fillStyle = topBand;
  ctx.fillRect(0, 0, DESIGN_WIDTH, 90);

  const bottomBand = ctx.createLinearGradient(0, DESIGN_HEIGHT - 120, 0, DESIGN_HEIGHT);
  bottomBand.addColorStop(0, rgba(theme.groundTint, 0));
  bottomBand.addColorStop(1, rgba(theme.groundTint, 0.44));
  ctx.fillStyle = bottomBand;
  ctx.fillRect(0, DESIGN_HEIGHT - 120, DESIGN_WIDTH, 120);

  // 10 — level light + fog wash over everything.
  ctx.save();
  ctx.globalAlpha = 0.55 + theme.fogDensity;
  ctx.fillStyle = theme.fog;
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  ctx.restore();
  ctx.fillStyle = theme.ambient;
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  ctx.restore();
  return cv;
}

export function drawBackgroundDirect(
  ctx: CanvasRenderingContext2D,
  levelId: string,
  path: Vec2[],
): void {
  if (!cachedBgCanvas || cachedBgLevelId !== levelId) {
    cachedBgCanvas = bakeTerrain(levelId, path);
    cachedBgLevelId = levelId;
  }
  ctx.drawImage(cachedBgCanvas, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
}

// ─── Road ────────────────────────────────────────────────────────

const PATH_SS = 2;
let cachedPathCanvas: HTMLCanvasElement | null = null;
let cachedPathKey = '';
let scratchCanvas: HTMLCanvasElement | null = null;

function scratchCtx(w: number, h: number): CanvasRenderingContext2D {
  if (!scratchCanvas) scratchCanvas = document.createElement('canvas');
  if (scratchCanvas.width !== w || scratchCanvas.height !== h) {
    scratchCanvas.width = w;
    scratchCanvas.height = h;
  }
  const c = scratchCanvas.getContext('2d')!;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  c.clearRect(0, 0, w, h);
  return c;
}

/** Grainy dirt inside the road, masked to the road shape. */
function roadSurfaceNoise(
  ctx: CanvasRenderingContext2D,
  pts: Vec2[],
  half: number,
  levelId: string,
): void {
  const s = scratchCtx(DESIGN_WIDTH, DESIGN_HEIGHT);
  const tile = noiseTile(seedFromString(levelId) ^ 0x2545f491, 256, 5);
  const pattern = s.createPattern(tile, 'repeat');
  if (pattern) {
    s.fillStyle = pattern;
    s.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  }
  s.globalCompositeOperation = 'destination-in';
  s.strokeStyle = '#ffffff';
  s.lineCap = 'round';
  s.lineJoin = 'round';
  s.lineWidth = half * 2;
  strokeFlat(s, pts);
  s.globalCompositeOperation = 'source-over';

  if (!scratchCanvas) return;
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.4;
  ctx.drawImage(scratchCanvas, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  ctx.restore();
}

/**
 * Inset shading: a dark crescent hugging the inner up-left edge and a warm
 * crescent on the inner down-right edge, so the road reads as worn into the
 * ground instead of painted on top of it.
 */
function roadEdgeShading(
  ctx: CanvasRenderingContext2D,
  pts: Vec2[],
  half: number,
): void {
  const s = scratchCtx(DESIGN_WIDTH, DESIGN_HEIGHT);
  s.lineCap = 'round';
  s.lineJoin = 'round';
  s.strokeStyle = rgba(SHADOW_TINT, 0.9);
  s.lineWidth = half * 2;
  strokeFlat(s, pts);
  s.save();
  s.globalCompositeOperation = 'destination-out';
  s.translate(2.8, 3.8);
  s.strokeStyle = '#ffffff';
  strokeFlat(s, pts);
  s.restore();
  if (scratchCanvas) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.drawImage(scratchCanvas, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    ctx.restore();
  }

  const s2 = scratchCtx(DESIGN_WIDTH, DESIGN_HEIGHT);
  s2.lineCap = 'round';
  s2.lineJoin = 'round';
  s2.strokeStyle = rgba(lit('#ffffff', 0), 1);
  s2.strokeStyle = 'rgba(255,246,214,0.85)';
  s2.lineWidth = half * 2;
  strokeFlat(s2, pts);
  s2.save();
  s2.globalCompositeOperation = 'destination-out';
  s2.translate(-2.4, -3.2);
  s2.strokeStyle = '#ffffff';
  strokeFlat(s2, pts);
  s2.restore();
  if (scratchCanvas) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.drawImage(scratchCanvas, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    ctx.restore();
  }
}

/** Cobbles and gravel bedded into the road surface. */
function roadGravel(
  ctx: CanvasRenderingContext2D,
  pts: Vec2[],
  half: number,
  theme: LevelTheme,
  rand: () => number,
): void {
  for (let i = 0; i < pts.length; i++) {
    const n = normalAt(pts, i);
    const p = pts[i];
    const draws = rand() < 0.55 ? 2 : 1;
    for (let k = 0; k < draws; k++) {
      if (rand() > 0.72) continue;
      const off = (rand() * 2 - 1) * (half - 2.5);
      const x = p.x + n.x * off;
      const y = p.y + n.y * off;
      const big = rand() < 0.07;
      const r = big ? 3 + rand() * 3 : 1 + rand() * 2.1;
      const col = theme.pebble[rand() < 0.5 ? 0 : 1];
      if (big) {
        stonePath(ctx, x, y, r * 1.25, r * 0.85, i * 131 + k * 17 + 3, 7);
        ctx.fillStyle = rgba(shade(col, 0.45), 0.9);
        ctx.fill();
        stonePath(ctx, x - 0.5, y - 0.7, r * 1.05, r * 0.7, i * 131 + k * 17 + 3, 7);
        const grad = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
        grad.addColorStop(0, rgba(lit(col, 0.3), 0.95));
        grad.addColorStop(1, rgba(shade(col, 0.3), 0.95));
        ctx.fillStyle = grad;
        ctx.fill();
        outline(ctx, () => stonePath(ctx, x - 0.5, y - 0.7, r * 1.05, r * 0.7, i * 131 + k * 17 + 3, 7), rgba(SHADOW_TINT, 0.55), 1);
      } else {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = rgba(col, 0.95);
        lobePath(ctx, x, y, r, i * 61 + k * 13 + 1, 0.34, 0.7, 10);
        ctx.fill();
        ctx.fillStyle = rgba(lit(col, 0.42), 0.7);
        ctx.beginPath();
        ctx.ellipse(x - r * 0.24, y - r * 0.3, r * 0.44, r * 0.3, 0, 0, 6.2832);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    // Dust speckles between the stones.
    ctx.fillStyle = rgba(theme.pathDark, 0.4);
    for (let k = 0; k < 2; k++) {
      if (rand() > 0.5) continue;
      const off = (rand() * 2 - 1) * (half - 1.5);
      ctx.fillRect(p.x + n.x * off, p.y + n.y * off, 1, 1);
    }
  }
}

/** Two wheel ruts with a lit inner lip. */
function roadRuts(ctx: CanvasRenderingContext2D, pts: Vec2[], theme: LevelTheme): void {
  for (const side of [-1, 1]) {
    const line = offsetPolyline(pts, side * 6.4, 1.6, side > 0 ? 991 : 337);
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = shade(theme.pathDark, 0.25);
    ctx.lineWidth = 2.6;
    ctx.setLineDash([16, 12]);
    strokeFlat(ctx, line);
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = lit(theme.pathLight, 0.3);
    ctx.lineWidth = 1;
    ctx.setLineDash([10, 18]);
    strokeFlat(ctx, line);
    ctx.restore();
    ctx.setLineDash([]);
  }
}

/** Uneven, grassy, stony shoulders that hide the stroked edge. */
function roadEdges(
  ctx: CanvasRenderingContext2D,
  pts: Vec2[],
  half: number,
  theme: LevelTheme,
  rand: () => number,
): void {
  for (let i = 0; i < pts.length; i += 2) {
    const n = normalAt(pts, i);
    const p = pts[i];
    for (const side of [-1, 1]) {
      const roll = rand();
      const off = side * (half - 1.5 + rand() * 5.5);
      const x = p.x + n.x * off;
      const y = p.y + n.y * off;
      if (roll < 0.42) {
        const count = 3 + Math.floor(rand() * 5);
        bladeTuft(ctx, x, y, count, 5 + rand() * 7, theme.grassTuft, rand);
        if (rand() < 0.3) {
          bladeTuft(ctx, x, y, 2, 4 + rand() * 5, [theme.foliageTip, theme.grassTuft[0], theme.grassTuft[1]], rand);
        }
      } else if (roll < 0.55) {
        drawPebble(ctx, x, y, 1.6 + rand() * 3.4, theme.pebble[rand() < 0.5 ? 0 : 1], i * 97 + (side > 0 ? 5 : 11));
      } else if (roll < 0.63) {
        ctx.fillStyle = rgba(theme.moss, 0.55);
        lobePath(ctx, x, y, 2.4 + rand() * 3.4, i * 53 + 7, 0.4, 0.5, 12);
        ctx.fill();
        ctx.fillStyle = rgba(lit(theme.moss, 0.35), 0.5);
        lobePath(ctx, x - 0.6, y - 0.7, 1.4 + rand() * 1.6, i * 53 + 9, 0.4, 0.5, 10);
        ctx.fill();
      }
    }
  }
}

function bakePath(levelId: string, waypoints: Vec2[]): HTMLCanvasElement {
  const theme = getTheme(levelId);
  const cv = document.createElement('canvas');
  cv.width = DESIGN_WIDTH * PATH_SS;
  cv.height = DESIGN_HEIGHT * PATH_SS;
  const ctx = cv.getContext('2d')!;
  ctx.save();
  ctx.scale(PATH_SS, PATH_SS);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const rand = rng(seedFromString(levelId) ^ 0x51ed270b);
  const pts = flattenPath(waypoints, 5);
  const HALF = 19;
  const OUT = 24.5;

  // 1 — soft cast shadow of the raised ground on the lower-right side.
  const off = castShadowOffset(30);
  ctx.save();
  ctx.translate(off.dx, off.dy);
  ctx.strokeStyle = rgba(SHADOW_TINT, 0.22);
  ctx.lineWidth = OUT * 2 + 7;
  traceCurvedPath(ctx, waypoints);
  ctx.stroke();
  ctx.restore();

  // 2 — dark outline / earthen bank.
  ctx.strokeStyle = mix(theme.pathDark, SHADOW_TINT, 0.5);
  ctx.lineWidth = OUT * 2;
  traceCurvedPath(ctx, waypoints);
  ctx.stroke();

  // 3 — bank body, lighter than the outline.
  ctx.strokeStyle = mix(theme.pathDark, theme.pathBase, 0.35);
  ctx.lineWidth = OUT * 2 - 5;
  traceCurvedPath(ctx, waypoints);
  ctx.stroke();

  // 4 — trodden surface, lit from the upper-left of the map.
  const surface = ctx.createLinearGradient(0, 0, DESIGN_WIDTH * 0.75, DESIGN_HEIGHT);
  surface.addColorStop(0, mix(theme.pathBase, theme.pathLight, 0.42));
  surface.addColorStop(0.5, theme.pathBase);
  surface.addColorStop(1, mix(theme.pathBase, theme.pathDark, 0.34));
  ctx.strokeStyle = surface;
  ctx.lineWidth = HALF * 2;
  traceCurvedPath(ctx, waypoints);
  ctx.stroke();

  // 5 — grain, 6 — inset shadow + inner highlight.
  roadSurfaceNoise(ctx, pts, HALF, levelId);
  roadEdgeShading(ctx, pts, HALF);

  // 7 — compacted centre where carts actually roll.
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = mix(theme.pathLight, theme.pathBase, 0.25);
  ctx.lineWidth = HALF * 0.75;
  ctx.translate(-1.2, -1.6);
  traceCurvedPath(ctx, waypoints);
  ctx.stroke();
  ctx.restore();

  // 8 — gravel, 9 — ruts, 10 — shoulders.
  roadGravel(ctx, pts, HALF, theme, rand);
  roadRuts(ctx, pts, theme);
  roadEdges(ctx, pts, HALF, theme, rand);

  ctx.restore();
  return cv;
}

export function drawPathDirect(
  ctx: CanvasRenderingContext2D,
  levelId: string,
  waypoints: Vec2[],
): void {
  if (waypoints.length < 2) return;
  let key = levelId;
  for (let i = 0; i < waypoints.length; i++) {
    key += `|${Math.round(waypoints[i].x)},${Math.round(waypoints[i].y)}`;
  }
  if (!cachedPathCanvas || cachedPathKey !== key) {
    cachedPathCanvas = bakePath(levelId, waypoints);
    cachedPathKey = key;
  }
  ctx.drawImage(cachedPathCanvas, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
}

// ─── Props ───────────────────────────────────────────────────────

interface PropArt {
  w: number;
  h: number;
  /** Y of the ground contact line inside the art box. */
  ground: number;
}

function blitArt(
  ctx: CanvasRenderingContext2D,
  key: string,
  art: PropArt,
  draw: (c: CanvasRenderingContext2D) => void,
  x: number,
  y: number,
  displayH: number,
): void {
  const spr = sprites.get(key, art.w, art.h, (c) => draw(c));
  const w = (displayH * art.w) / art.h;
  sprites.blit(ctx, spr, x, y, w, displayH, { ax: 0.5, ay: art.ground / art.h });
}

/** Contact + cast shadow, always before the body. */
function propShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  ground: number,
  rx: number,
  elevation: number,
  strength = 0.2,
): void {
  castShadow(ctx, cx + 3, ground, rx * 0.92, rx * 0.34, elevation, strength);
  contactShadow(ctx, cx, ground, rx * 0.66, rx * 0.24, 0.42);
}

function leafCluster(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  seed: number,
  tip: string, base: string, deep: string,
): void {
  const path = (): void => lobePath(ctx, cx, cy, r, seed, 0.17, 0.92, 22);
  path();
  const grad = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.42, r * 0.08, cx, cy, r * 1.06);
  grad.addColorStop(0, tip);
  grad.addColorStop(0.48, base);
  grad.addColorStop(1, deep);
  ctx.fillStyle = grad;
  ctx.fill();
  outline(ctx, path, SHADOW_TINT, Math.max(1.3, r * 0.13));
  rimLight(ctx, path, cx, cy, r, RIM_LIGHT, Math.max(1.1, r * 0.11));

  // Leaf marks: little painted strokes that read as foliage texture.
  const rand = rng(seed + 101);
  ctx.lineWidth = Math.max(0.7, r * 0.06);
  for (let i = 0; i < 7; i++) {
    const a = rand() * 6.2832;
    const d = rand() * r * 0.72;
    const lx = cx + Math.cos(a) * d;
    const ly = cy + Math.sin(a) * d * 0.9;
    const up = -0.5 - rand() * 0.7;
    ctx.strokeStyle = rgba(tip, 0.35 + rand() * 0.35);
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + Math.cos(up) * r * 0.22, ly + Math.sin(up) * r * 0.22);
    ctx.stroke();
    ctx.strokeStyle = rgba(deep, 0.3);
    ctx.beginPath();
    ctx.moveTo(lx, ly + r * 0.1);
    ctx.lineTo(lx + r * 0.16, ly + r * 0.22);
    ctx.stroke();
  }
}

function treeTrunk(
  ctx: CanvasRenderingContext2D,
  cx: number, ground: number, topY: number,
  baseHalf: number, topHalf: number,
  theme: LevelTheme,
  seed: number,
  hollow: boolean,
): void {
  const midY = ground - (ground - topY) * 0.55;
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(cx - baseHalf * 1.28, ground);
    ctx.quadraticCurveTo(cx - baseHalf * 0.95, midY, cx - topHalf, topY);
    ctx.lineTo(cx + topHalf, topY);
    ctx.quadraticCurveTo(cx + baseHalf * 0.95, midY, cx + baseHalf * 1.28, ground);
    ctx.closePath();
  };

  path();
  const grad = ctx.createLinearGradient(cx - baseHalf * 1.3, ground, cx + baseHalf * 1.2, ground);
  grad.addColorStop(0, lit(theme.treeTrunk, 0.24));
  grad.addColorStop(0.42, theme.treeTrunk);
  grad.addColorStop(1, shade(theme.treeTrunk, 0.4));
  ctx.fillStyle = grad;
  ctx.fill();
  outline(ctx, path, SHADOW_TINT, 2.4);

  // Root flare.
  for (const side of [-1, 1]) {
    const rx = cx + side * baseHalf * 1.1;
    ctx.beginPath();
    ctx.moveTo(rx, ground + 1);
    ctx.quadraticCurveTo(rx + side * 5, ground - 4, rx + side * 1.5, ground - 11);
    ctx.quadraticCurveTo(rx - side * 3.5, ground - 5, rx, ground + 1);
    ctx.closePath();
    const rg = ctx.createLinearGradient(rx - side * 4, ground - 10, rx + side * 5, ground);
    rg.addColorStop(0, lit(theme.treeTrunk, 0.16));
    rg.addColorStop(1, shade(theme.treeTrunk, 0.42));
    ctx.fillStyle = rg;
    ctx.fill();
    outline(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(rx, ground + 1);
      ctx.quadraticCurveTo(rx + side * 5, ground - 4, rx + side * 1.5, ground - 11);
      ctx.quadraticCurveTo(rx - side * 3.5, ground - 5, rx, ground + 1);
      ctx.closePath();
    }, SHADOW_TINT, 1.8);
  }

  // Bark: vertical grooves, a lit left edge and knots.
  const rand = rng(seed + 4211);
  const grain = 5;
  for (let i = 0; i < grain; i++) {
    const t = (i + 0.5) / grain;
    const x0 = cx - baseHalf * 1.15 + t * baseHalf * 2.3;
    const x1 = cx - topHalf + t * topHalf * 2;
    ctx.strokeStyle = rgba(shade(theme.treeTrunk, 0.42), 0.6);
    ctx.lineWidth = 0.9 + rand() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x0, ground - 2);
    ctx.bezierCurveTo(
      x0 + (rand() - 0.5) * 5, ground - (ground - topY) * 0.35,
      x1 + (rand() - 0.5) * 4, ground - (ground - topY) * 0.7,
      x1, topY + 3,
    );
    ctx.stroke();
  }
  ctx.strokeStyle = rgba(theme.barkLight, 0.55);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - baseHalf * 0.9, ground - 4);
  ctx.quadraticCurveTo(cx - baseHalf * 0.6, midY, cx - topHalf * 0.6, topY + 3);
  ctx.stroke();

  if (hollow) {
    lobePath(ctx, cx + baseHalf * 0.1, ground - (ground - topY) * 0.55, Math.max(3, baseHalf * 0.4), seed + 71, 0.32, 1.35, 14);
    ctx.fillStyle = rgba(SHADOW_TINT, 0.92);
    ctx.fill();
    outline(ctx, () => lobePath(ctx, cx + baseHalf * 0.1, ground - (ground - topY) * 0.55, Math.max(3, baseHalf * 0.4), seed + 71, 0.32, 1.35, 14), SHADOW_TINT, 1.4);
  }
}

function drawOakCanopy(
  ctx: CanvasRenderingContext2D,
  cx: number, topY: number,
  spread: number,
  theme: LevelTheme,
  seed: number,
  detail: number,
): void {
  const can = theme.treeCanopy;
  const tip = lit(theme.foliageTip, 0.1);
  const deep = shade(can[3], 0.3);
  const rows = 3;
  for (let row = 0; row < rows; row++) {
    const t = row / (rows - 1);
    const ry = topY + spread * 0.42 - t * spread * 0.82;
    const rr = spread * (0.78 - t * 0.3);
    const count = Math.round(4 + detail - t * 1.5);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + row * 0.9;
      const lx = cx + Math.cos(a) * rr * 0.62;
      const ly = ry + Math.sin(a) * rr * 0.3;
      const r = rr * (0.42 + ((i * 37 + row * 11) % 7) * 0.02);
      leafCluster(ctx, lx, ly, r, seed + row * 131 + i * 17,
        row === rows - 1 ? tip : can[2], row === 0 ? can[0] : can[1], deep);
    }
  }
  leafCluster(ctx, cx, topY - spread * 0.42, spread * 0.36, seed + 907, tip, can[2], deep);
}

function drawPineCanopy(
  ctx: CanvasRenderingContext2D,
  cx: number, topY: number,
  spread: number,
  theme: LevelTheme,
  seed: number,
): void {
  const can = theme.treeCanopy;
  const rows = 5;
  for (let row = 0; row < rows; row++) {
    const t = row / (rows - 1);
    const halfW = spread * (0.95 - t * 0.72);
    const y = topY + spread * 1.75 * (1 - t) * 0.62;
    const h = spread * 0.5;
    const path = (): void => {
      ctx.beginPath();
      ctx.moveTo(cx, y - h);
      ctx.quadraticCurveTo(cx + halfW * 0.7, y - h * 0.25, cx + halfW, y + 1);
      for (let i = 6; i >= 0; i--) {
        const u = i / 6;
        const bx = cx + (u - 0.5) * 2 * halfW;
        ctx.quadraticCurveTo(bx + halfW * 0.08, y + 5, bx - halfW * 0.06, y + 2);
      }
      ctx.closePath();
    };
    path();
    const grad = ctx.createLinearGradient(cx - halfW, y - h, cx + halfW, y + 3);
    grad.addColorStop(0, lit(can[1], 0.24));
    grad.addColorStop(0.42, can[0]);
    grad.addColorStop(1, shade(can[3], 0.36));
    ctx.fillStyle = grad;
    ctx.fill();
    outline(ctx, path, SHADOW_TINT, 2.2);
    rimLight(ctx, path, cx, y - h * 0.3, halfW, RIM_LIGHT, 1.6);
    // Needles hanging off the bottom edge.
    const rand = rng(seed + row * 97);
    ctx.strokeStyle = rgba(can[1], 0.8);
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 9; i++) {
      const bx = cx + (rand() - 0.5) * 2 * halfW * 0.9;
      const by = y + (rand() - 0.5) * 3;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + (rand() - 0.5) * 3, by + 3 + rand() * 4);
      ctx.stroke();
    }
  }
  // Leader spike.
  ctx.beginPath();
  ctx.moveTo(cx, topY - spread * 0.2);
  ctx.lineTo(cx - 2.4, topY + spread * 0.3);
  ctx.lineTo(cx + 2.4, topY + spread * 0.3);
  ctx.closePath();
  ctx.fillStyle = lit(can[2], 0.2);
  ctx.fill();
  outline(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(cx, topY - spread * 0.2);
    ctx.lineTo(cx - 2.4, topY + spread * 0.3);
    ctx.lineTo(cx + 2.4, topY + spread * 0.3);
    ctx.closePath();
  }, SHADOW_TINT, 1.4);
}

function drawWideCanopy(
  ctx: CanvasRenderingContext2D,
  cx: number, topY: number,
  spread: number,
  theme: LevelTheme,
  seed: number,
): void {
  const can = theme.treeCanopy;
  const tip = lit(theme.foliageTip, 0.05);
  const deep = shade(can[2], 0.34);
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const lx = cx + (t - 0.5) * spread * 1.9;
    const ly = topY + spread * 0.5 - Math.cos((t - 0.5) * Math.PI) * spread * 0.42;
    const r = spread * (0.4 + Math.sin(t * Math.PI) * 0.16);
    leafCluster(ctx, lx, ly, r, seed + 300 + i * 29,
      i % 2 === 0 ? tip : can[2], can[1], deep);
  }
  // Drooping leaf strands.
  const rand = rng(seed + 555);
  for (let i = 0; i < 6; i++) {
    const lx = cx + (rand() - 0.5) * spread * 1.8;
    const ly = topY + spread * 0.62;
    const len = spread * (0.35 + rand() * 0.5);
    ctx.strokeStyle = rgba(can[1], 0.9);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.quadraticCurveTo(lx + (rand() - 0.5) * 8, ly + len * 0.6, lx + (rand() - 0.5) * 6, ly + len);
    ctx.stroke();
    ctx.fillStyle = rgba(can[2], 0.95);
    for (let k = 1; k <= 4; k++) {
      const u = k / 4;
      ctx.beginPath();
      ctx.ellipse(lx + (rand() - 0.5) * 5, ly + len * u, 2.2, 1.3, 0.6, 0, 6.2832);
      ctx.fill();
    }
  }
}

function drawBareTree(
  ctx: CanvasRenderingContext2D,
  cx: number, ground: number, topY: number,
  spread: number,
  theme: LevelTheme,
  seed: number,
): void {
  const rand = rng(seed + 77);
  const branch = (x0: number, y0: number, ang: number, len: number, w: number, depth: number): void => {
    const x1 = x0 + Math.cos(ang) * len;
    const y1 = y0 + Math.sin(ang) * len;
    const path = (): void => {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1 - w, y1);
      ctx.lineTo(x1, y1 + w * 0.6);
      ctx.lineTo(x1 + w, y1);
      ctx.closePath();
    };
    path();
    const grad = ctx.createLinearGradient(x0 - w, y0, x1 + w, y1);
    grad.addColorStop(0, lit(theme.treeTrunk, 0.2));
    grad.addColorStop(1, shade(theme.treeTrunk, 0.45));
    ctx.fillStyle = grad;
    ctx.fill();
    outline(ctx, path, SHADOW_TINT, 1.8);
    if (depth > 0) {
      const n = 2 + Math.floor(rand() * 2);
      for (let i = 0; i < n; i++) {
        branch(x1, y1, ang + (rand() - 0.5) * 1.5, len * (0.5 + rand() * 0.24), w * 0.62, depth - 1);
      }
    } else if (!theme.dead && rand() < 0.5) {
      leafCluster(ctx, x1, y1, 5 + rand() * 4, seed + depth * 31 + i0(rand), lit(theme.foliageTip, 0.15), theme.treeCanopy[1], shade(theme.treeCanopy[3], 0.3));
    }
  };
  const trunkTop = topY + spread * 0.7;
  branch(cx, trunkTop, -Math.PI / 2, spread * 0.9, 3.4, 2);
  branch(cx, trunkTop + 6, -Math.PI / 2 - 0.6, spread * 0.72, 2.8, 1);
  branch(cx, trunkTop + 9, -Math.PI / 2 + 0.65, spread * 0.66, 2.8, 1);
  branch(cx, ground - 6, -Math.PI / 2 - 1.15, spread * 0.5, 2, 0);
  branch(cx, ground - 10, -Math.PI / 2 + 1.15, spread * 0.46, 2, 0);
}

/** Helper so the bare-tree leaf tufts get a stable seed. */
function i0(rand: () => number): number {
  return Math.floor(rand() * 1000);
}

const TREE_ART: PropArt = { w: 160, h: 190, ground: 150 };

function drawTreeArt(
  ctx: CanvasRenderingContext2D,
  variant: number,
  theme: LevelTheme,
  detail: number,
): void {
  const cx = 80;
  const ground = TREE_ART.ground;
  const v = variant % 4;
  const trunkH = v === 1 ? 104 : v === 0 ? 66 : v === 2 ? 82 : 88;
  const topY = ground - trunkH;
  const spread = v === 1 ? 34 : v === 2 ? 52 : v === 0 ? 45 : 40;

  propShadow(ctx, cx, ground, v === 1 ? 34 : 44, trunkH + 40, 0.2);
  treeTrunk(ctx, cx, ground, topY, v === 1 ? 9 : 11, v === 1 ? 6 : 8, theme, variant * 313 + 7, v === 3);

  if (v === 0) drawOakCanopy(ctx, cx, topY - spread * 0.5, spread, theme, 11 + variant * 61, detail);
  else if (v === 1) drawPineCanopy(ctx, cx, topY, spread, theme, 23 + variant * 61);
  else if (v === 2) drawWideCanopy(ctx, cx, topY - spread * 0.3, spread, theme, 37 + variant * 61);
  else drawBareTree(ctx, cx, ground, topY, spread, theme, variant * 61);

  // Swamp dressing: hanging moss curtains and damp sheen.
  if (theme.flavor === 'swamp' && v !== 3) {
    const rand = rng(variant * 91 + 3);
    for (let i = 0; i < 7; i++) {
      const lx = cx + (rand() - 0.5) * spread * 2;
      const ly = topY - spread * 0.1 + rand() * 10;
      const len = 10 + rand() * 26;
      ctx.strokeStyle = rgba(theme.moss, 0.7);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.quadraticCurveTo(lx + (rand() - 0.5) * 5, ly + len * 0.6, lx + (rand() - 0.5) * 4, ly + len);
      ctx.stroke();
      ctx.strokeStyle = rgba(lit(theme.moss, 0.3), 0.5);
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
  }

  // Warm rim light along the whole up-left silhouette.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.14;
  const rim = ctx.createLinearGradient(cx - 60, ground - 150, cx + 60, ground);
  rim.addColorStop(0, rgba('#ffe9b0', 0.75));
  rim.addColorStop(0.5, rgba('#ffe9b0', 0));
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, TREE_ART.w, TREE_ART.h);
  ctx.restore();
}

export function drawTreeDirect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  levelId = 'level_1',
  variant = 0,
): void {
  const theme = getTheme(levelId);
  const bucket = size >= 45 ? 'l' : 's';
  blitArt(
    ctx,
    `prop:${levelId}:tree:${variant % 4}:${bucket}`,
    TREE_ART,
    (c) => drawTreeArt(c, variant, theme, bucket === 'l' ? 2 : 0),
    x, y, size * 2.5,
  );
}

const ROCK_ART: PropArt = { w: 80, h: 56, ground: 44 };

function rockFacets(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  rx: number, ry: number,
  seed: number,
  theme: LevelTheme,
  mossy: boolean,
): void {
  const col = theme.rockColor[seed % theme.rockColor.length];
  const path = (): void => stonePath(ctx, cx, cy, rx, ry, seed, 8);

  // Dark base plate for depth.
  stonePath(ctx, cx + 0.8, cy + 1.4, rx, ry, seed, 8);
  ctx.fillStyle = rgba(shade(col, 0.45), 0.95);
  ctx.fill();

  path();
  const grad = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
  grad.addColorStop(0, lit(col, 0.3));
  grad.addColorStop(0.48, col);
  grad.addColorStop(1, shade(col, 0.42));
  ctx.fillStyle = grad;
  ctx.fill();

  // Facet planes: one lit at the top-left, one shaded to the lower-right.
  ctx.save();
  path();
  ctx.clip();
  ctx.fillStyle = rgba(lit(theme.rockColor[1] ?? col, 0.35), 0.6);
  ctx.beginPath();
  ctx.moveTo(cx - rx, cy - ry);
  ctx.lineTo(cx + rx * 0.2, cy - ry * 0.9);
  ctx.lineTo(cx - rx * 0.1, cy + ry * 0.3);
  ctx.lineTo(cx - rx, cy + ry * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(shade(theme.rockColor[2] ?? col, 0.5), 0.42);
  ctx.beginPath();
  ctx.moveTo(cx + rx * 0.1, cy - ry);
  ctx.lineTo(cx + rx, cy - ry * 0.7);
  ctx.lineTo(cx + rx * 0.9, cy + ry);
  ctx.lineTo(cx, cy + ry * 0.6);
  ctx.closePath();
  ctx.fill();
  // Grain speckles.
  const rand = rng(seed + 313);
  ctx.fillStyle = rgba(shade(col, 0.5), 0.3);
  for (let i = 0; i < 22; i++) {
    ctx.fillRect(cx + (rand() - 0.5) * rx * 1.7, cy + (rand() - 0.5) * ry * 1.6, 1, 1);
  }
  ctx.restore();

  outline(ctx, path, SHADOW_TINT, 2);
  rimLight(ctx, path, cx, cy, Math.max(rx, ry), RIM_LIGHT, 1.5);

  // Cracks.
  ctx.strokeStyle = rgba(SHADOW_TINT, 0.7);
  ctx.lineWidth = 1.1;
  const cr = rng(seed + 17);
  for (let i = 0; i < 2; i++) {
    let x = cx + (cr() - 0.5) * rx;
    let y = cy - ry * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 3; k++) {
      x += (cr() - 0.5) * rx * 0.8;
      y += ry * 0.45;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  if (mossy) {
    const mr = rng(seed + 91);
    for (let i = 0; i < 4; i++) {
      const mx = cx + (mr() - 0.5) * rx * 1.1;
      const my = cy - ry * (0.2 + mr() * 0.5);
      lobePath(ctx, mx, my, 2.4 + mr() * 3.6, seed + i * 13, 0.4, 0.5, 12);
      ctx.fillStyle = rgba(theme.moss, 0.72);
      ctx.fill();
      ctx.fillStyle = rgba(lit(theme.moss, 0.4), 0.45);
      lobePath(ctx, mx - 0.6, my - 0.8, 1.2 + mr() * 1.6, seed + i * 13 + 5, 0.4, 0.5, 10);
      ctx.fill();
    }
  }
}

function drawRockArt(
  ctx: CanvasRenderingContext2D,
  variant: number,
  theme: LevelTheme,
  detail: number,
): void {
  const ground = ROCK_ART.ground;
  const v = variant % 3;
  propShadow(ctx, 40, ground, v === 2 ? 26 : 22, 24, 0.2);
  if (v === 0) {
    rockFacets(ctx, 40, ground - 13, 24, 15, 5, theme, detail > 0);
  } else if (v === 1) {
    rockFacets(ctx, 42, ground - 15, 20, 17, 9, theme, detail > 0);
    rockFacets(ctx, 22, ground - 8, 13, 9, 21, theme, false);
  } else {
    rockFacets(ctx, 26, ground - 9, 15, 11, 33, theme, true);
    rockFacets(ctx, 46, ground - 13, 18, 13, 41, theme, true);
    rockFacets(ctx, 36, ground - 5, 11, 7, 53, theme, false);
  }
}

export function drawRockDirect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  levelId = 'level_1',
  variant = 0,
): void {
  const theme = getTheme(levelId);
  const bucket = size >= 21 ? 'l' : 's';
  blitArt(
    ctx,
    `prop:${levelId}:rock:${variant % 3}:${bucket}`,
    ROCK_ART,
    (c) => drawRockArt(c, variant, theme, bucket === 'l' ? 1 : 0),
    x, y, size * 1.75,
  );
}

const BUSH_ART: PropArt = { w: 70, h: 55, ground: 46 };

function drawBushArt(
  ctx: CanvasRenderingContext2D,
  variant: number,
  theme: LevelTheme,
  detail: number,
): void {
  const cx = 35;
  const ground = BUSH_ART.ground;
  const v = variant % 3;
  const can = theme.treeCanopy;
  const tip = lit(theme.foliageTip, 0.12);
  const deep = shade(can[3], 0.28);
  const spread = v === 2 ? 20 : 24;

  propShadow(ctx, cx, ground, spread * 0.9, 26, 0.2);

  const clusters = v === 2 ? 5 : 4;
  for (let i = 0; i < clusters; i++) {
    const a = (i / clusters) * Math.PI * 2 + 0.7;
    const lx = cx + Math.cos(a) * spread * 0.6;
    const ly = ground - 14 + Math.sin(a) * spread * 0.34 - (i === 0 ? 3 : 0);
    leafCluster(ctx, lx, ly, spread * (0.5 + (i % 3) * 0.06), 700 + variant * 37 + i * 13,
      i % 2 === 0 ? tip : can[2], can[1], deep);
  }
  leafCluster(ctx, cx, ground - 24, spread * 0.52, 900 + variant * 37, tip, can[2], deep);

  if (v === 1 || detail > 0) {
    // Berries with a lit pip and a dark stem.
    const rand = rng(variant * 53 + 19);
    const berry = theme.flowerColors[0];
    for (let i = 0; i < (v === 1 ? 7 : 4); i++) {
      const bx = cx + (rand() - 0.5) * spread * 1.7;
      const by = ground - 16 - rand() * 14;
      const r = 1.8 + rand() * 1.1;
      ctx.fillStyle = rgba(shade(berry, 0.4), 0.95);
      ctx.beginPath();
      ctx.arc(bx + 0.4, by + 0.5, r, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = berry;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = rgba(lit(berry, 0.6), 0.9);
      ctx.beginPath();
      ctx.arc(bx - r * 0.3, by - r * 0.32, r * 0.34, 0, 6.2832);
      ctx.fill();
    }
  }

  if (v === 2) {
    // Thorns along the outline.
    ctx.strokeStyle = rgba(shade(theme.treeTrunk, 0.2), 0.85);
    ctx.lineWidth = 1;
    const rand = rng(variant * 71 + 5);
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.9 + rand() * Math.PI * 1.8;
      const bx = cx + Math.cos(a) * spread * 1.15;
      const by = ground - 18 + Math.sin(a) * spread * 0.7;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a) * 3.4, by + Math.sin(a) * 3.4 - 1.4);
      ctx.stroke();
    }
  }
}

export function drawBushDirect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, levelId = 'level_1', variant = 0,
): void {
  const theme = getTheme(levelId);
  const bucket = size >= 27 ? 'l' : 's';
  blitArt(
    ctx,
    `prop:${levelId}:bush:${variant % 3}:${bucket}`,
    BUSH_ART,
    (c) => drawBushArt(c, variant, theme, bucket === 'l' ? 1 : 0),
    x, y, size * 1.6,
  );
}

const MUSHROOM_ART: PropArt = { w: 56, h: 48, ground: 42 };

function mushroomCap(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  rx: number, ry: number,
  col: string,
  theme: LevelTheme,
): void {
  ctx.beginPath();
  ctx.moveTo(x - rx, y);
  ctx.quadraticCurveTo(x - rx * 0.92, y - ry * 1.6, x, y - ry * 1.7);
  ctx.quadraticCurveTo(x + rx * 0.92, y - ry * 1.6, x + rx, y);
  ctx.quadraticCurveTo(x + rx * 0.4, y + ry * 0.42, x, y + ry * 0.42);
  ctx.quadraticCurveTo(x - rx * 0.4, y + ry * 0.42, x - rx, y);
  ctx.closePath();
  const grad = ctx.createLinearGradient(x - rx, y - ry * 1.7, x + rx, y);
  grad.addColorStop(0, lit(col, 0.34));
  grad.addColorStop(0.5, col);
  grad.addColorStop(1, shade(col, 0.44));
  ctx.fillStyle = grad;
  ctx.fill();
  outline(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(x - rx, y);
    ctx.quadraticCurveTo(x - rx * 0.92, y - ry * 1.6, x, y - ry * 1.7);
    ctx.quadraticCurveTo(x + rx * 0.92, y - ry * 1.6, x + rx, y);
    ctx.quadraticCurveTo(x + rx * 0.4, y + ry * 0.42, x, y + ry * 0.42);
    ctx.quadraticCurveTo(x - rx * 0.4, y + ry * 0.42, x - rx, y);
    ctx.closePath();
  }, SHADOW_TINT, 1.5);

  if (theme.emberAmount < 0.4) {
    ctx.fillStyle = 'rgba(255,248,228,0.85)';
    for (let i = 0; i < 3; i++) {
      const a = -2.4 + i * 0.8;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * rx * 0.5, y - ry * 1.1 + Math.sin(a) * ry * 0.3, rx * 0.16, ry * 0.2, a, 0, 6.2832);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = rgba(theme.ember, 0.85);
    for (let i = 0; i < 4; i++) {
      const a = -2.6 + i * 0.6;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * rx * 0.55, y - ry * 1.05 + Math.sin(a) * ry * 0.4, rx * 0.13, 0, 6.2832);
      ctx.fill();
    }
  }
}

function drawMushroomArt(ctx: CanvasRenderingContext2D, theme: LevelTheme): void {
  const ground = MUSHROOM_ART.ground;
  propShadow(ctx, 28, ground, 15, 18, 0.2);
  const stem = (x: number, y: number, w: number, h: number): void => {
    const path = (): void => {
      ctx.beginPath();
      ctx.moveTo(x - w, y);
      ctx.quadraticCurveTo(x - w * 1.25, y - h * 0.55, x - w * 0.8, y - h);
      ctx.lineTo(x + w * 0.8, y - h);
      ctx.quadraticCurveTo(x + w * 1.25, y - h * 0.55, x + w, y);
      ctx.closePath();
    };
    path();
    const grad = ctx.createLinearGradient(x - w, y - h, x + w, y);
    grad.addColorStop(0, '#f2e6cf');
    grad.addColorStop(0.5, '#dccfae');
    grad.addColorStop(1, '#a99a78');
    ctx.fillStyle = grad;
    ctx.fill();
    outline(ctx, path, SHADOW_TINT, 1.3);
  };
  stem(33, ground, 2.6, 12);
  stem(22, ground - 1, 2.2, 8);
  stem(41, ground - 2, 2, 7);
  mushroomCap(ctx, 33, ground - 11, 8.5, 3.6, theme.flowerColors[0], theme);
  mushroomCap(ctx, 22, ground - 8, 6, 2.7, theme.flowerColors[1] ?? theme.flowerColors[0], theme);
  mushroomCap(ctx, 41, ground - 8.5, 5.2, 2.3, theme.flowerColors[0], theme);

  if (theme.emberAmount > 0.4) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(33, ground - 14, 0, 33, ground - 14, 20);
    glow.addColorStop(0, rgba(theme.ember, 0.4));
    glow.addColorStop(1, rgba(theme.ember, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(33, ground - 14, 20, 0, 6.2832);
    ctx.fill();
    ctx.restore();
  }
}

export function drawMushroomDirect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, levelId = 'level_1',
): void {
  const theme = getTheme(levelId);
  blitArt(ctx, `prop:${levelId}:mushroom`, MUSHROOM_ART, (c) => drawMushroomArt(c, theme), x, y, size * 1.9);
}

const STUMP_ART: PropArt = { w: 60, h: 52, ground: 44 };

function drawStumpArt(ctx: CanvasRenderingContext2D, theme: LevelTheme): void {
  const cx = 30;
  const ground = STUMP_ART.ground;
  propShadow(ctx, cx, ground, 16, 20, 0.2);

  const topY = ground - 22;
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(cx - 13, ground);
    ctx.quadraticCurveTo(cx - 15, ground - 12, cx - 12, topY);
    ctx.lineTo(cx + 12, topY);
    ctx.quadraticCurveTo(cx + 15, ground - 12, cx + 13, ground);
    ctx.closePath();
  };
  path();
  const grad = ctx.createLinearGradient(cx - 14, ground, cx + 14, ground);
  grad.addColorStop(0, lit(theme.treeTrunk, 0.24));
  grad.addColorStop(0.45, theme.treeTrunk);
  grad.addColorStop(1, shade(theme.treeTrunk, 0.44));
  ctx.fillStyle = grad;
  ctx.fill();
  outline(ctx, path, SHADOW_TINT, 2);

  // Vertical bark grooves.
  const rand = rng(4242);
  ctx.strokeStyle = rgba(shade(theme.treeTrunk, 0.45), 0.6);
  for (let i = 0; i < 6; i++) {
    const x = cx - 11 + i * 4.4 + (rand() - 0.5);
    ctx.lineWidth = 0.8 + rand() * 0.7;
    ctx.beginPath();
    ctx.moveTo(x, ground - 1);
    ctx.quadraticCurveTo(x + (rand() - 0.5) * 2.4, ground - 11, x + (rand() - 0.5) * 2, topY + 2);
    ctx.stroke();
  }

  // Sawn top: growth rings plus a couple of cracks radiating outwards.
  ctx.beginPath();
  ctx.ellipse(cx, topY, 12, 4.4, 0, 0, 6.2832);
  const topGrad = ctx.createLinearGradient(cx - 12, topY - 4, cx + 12, topY + 4);
  topGrad.addColorStop(0, lit(theme.treeTrunk, 0.5));
  topGrad.addColorStop(1, mix(theme.treeTrunk, theme.barkLight, 0.5));
  ctx.fillStyle = topGrad;
  ctx.fill();
  outline(ctx, () => ctx.ellipse(cx, topY, 12, 4.4, 0, 0, 6.2832), SHADOW_TINT, 1.5);
  ctx.strokeStyle = rgba(shade(theme.treeTrunk, 0.34), 0.7);
  for (let i = 1; i <= 4; i++) {
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.ellipse(cx, topY, 12 * (i / 5), 4.4 * (i / 5), 0, 0, 6.2832);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 2, topY - 3.4);
  ctx.lineTo(cx + 3.4, topY + 2.6);
  ctx.moveTo(cx + 5, topY - 2);
  ctx.lineTo(cx + 8.6, topY + 1.4);
  ctx.stroke();

  // Moss and a fresh shoot.
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = rgba(theme.moss, 0.7);
    lobePath(ctx, cx - 10 + i * 9, ground - 4 - i, 3.4 + i * 0.6, 900 + i * 17, 0.4, 0.5, 12);
    ctx.fill();
  }
  bladeTuft(ctx, cx + 2, topY + 1, 4, 7, theme.grassTuft, rng(77));
}

export function drawStumpDirect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, levelId = 'level_1',
): void {
  const theme = getTheme(levelId);
  blitArt(ctx, `prop:${levelId}:stump`, STUMP_ART, (c) => drawStumpArt(c, theme), x, y, size * 1.6);
}

const BONES_ART: PropArt = { w: 60, h: 50, ground: 42 };

function drawBonesArt(ctx: CanvasRenderingContext2D): void {
  const cx = 30;
  const ground = BONES_ART.ground;
  const bone = '#e3d9c2';
  const boneDark = '#b3a689';
  propShadow(ctx, cx, ground, 17, 18, 0.2);
  groundAO(ctx, cx, ground - 4, 20, 7, 0.2);

  const limb = (x0: number, y0: number, x1: number, y1: number, w: number): void => {
    ctx.strokeStyle = rgba(boneDark, 0.9);
    ctx.lineWidth = w + 1.6;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + 1);
    ctx.lineTo(x1, y1 + 1);
    ctx.stroke();
    ctx.strokeStyle = bone;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,250,236,0.7)';
    ctx.lineWidth = w * 0.34;
    ctx.beginPath();
    ctx.moveTo(x0, y0 - w * 0.24);
    ctx.lineTo(x1, y1 - w * 0.24);
    ctx.stroke();
    for (const p of [[x0, y0], [x1, y1]]) {
      ctx.fillStyle = bone;
      ctx.beginPath();
      ctx.arc(p[0], p[1], w * 0.85, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = rgba(boneDark, 0.8);
      ctx.beginPath();
      ctx.arc(p[0] + w * 0.3, p[1] + w * 0.3, w * 0.42, 0, 6.2832);
      ctx.fill();
    }
  };

  // Rib cage: arcs stacked like a barrel.
  for (let i = 0; i < 4; i++) {
    const y = ground - 6 - i * 4.4;
    ctx.strokeStyle = rgba(boneDark, 0.95);
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.ellipse(cx + 6, y, 9.4 - i * 0.7, 3.4, 0.14, Math.PI * 1.08, Math.PI * 1.94);
    ctx.stroke();
    ctx.strokeStyle = bone;
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }
  limb(cx - 12, ground - 3, cx + 15, ground - 12, 2.6);
  limb(cx - 8, ground - 9, cx + 12, ground - 2, 2.2);
  limb(cx - 15, ground - 12, cx - 4, ground - 6, 2);

  // Skull: cranium, jaw, sockets, teeth.
  const sx = cx + 8;
  const sy = ground - 17;
  const skull = (): void => {
    ctx.beginPath();
    ctx.moveTo(sx - 8.4, sy - 1);
    ctx.bezierCurveTo(sx - 8.6, sy - 8.4, sx + 8.6, sy - 8.4, sx + 8.4, sy - 1);
    ctx.bezierCurveTo(sx + 8, sy + 4.6, sx + 4.6, sy + 6.4, sx + 3, sy + 8.6);
    ctx.lineTo(sx - 3, sy + 8.6);
    ctx.bezierCurveTo(sx - 4.6, sy + 6.4, sx - 8, sy + 4.6, sx - 8.4, sy - 1);
    ctx.closePath();
  };
  skull();
  const sg = ctx.createLinearGradient(sx - 9, sy - 9, sx + 9, sy + 9);
  sg.addColorStop(0, '#f6efdc');
  sg.addColorStop(0.55, bone);
  sg.addColorStop(1, boneDark);
  ctx.fillStyle = sg;
  ctx.fill();
  outline(ctx, skull, SHADOW_TINT, 1.6);
  ctx.fillStyle = rgba(SHADOW_TINT, 0.92);
  ctx.beginPath();
  ctx.ellipse(sx - 3.4, sy - 0.6, 2.7, 2.9, -0.15, 0, 6.2832);
  ctx.ellipse(sx + 3.4, sy - 0.6, 2.7, 2.9, 0.15, 0, 6.2832);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx, sy + 2.4);
  ctx.lineTo(sx + 1.4, sy + 4.6);
  ctx.lineTo(sx - 1.4, sy + 4.6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(boneDark, 0.95);
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 4; i++) {
    const tx = sx - 3.6 + i * 2.4;
    ctx.beginPath();
    ctx.moveTo(tx, sy + 6.4);
    ctx.lineTo(tx, sy + 8.8);
    ctx.stroke();
  }
  // A small horned helmet look: moss on the crown.
  ctx.fillStyle = 'rgba(120,160,90,0.4)';
  lobePath(ctx, sx - 1, sy - 7.4, 3.4, 55, 0.4, 0.5, 12);
  ctx.fill();
}

export function drawBonesDirect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
): void {
  blitArt(ctx, 'prop:bones', BONES_ART, (c) => drawBonesArt(c), x, y, size * 1.5);
}

const SIGN_ART: PropArt = { w: 60, h: 60, ground: 52 };

function drawSignArt(ctx: CanvasRenderingContext2D, theme: LevelTheme): void {
  const cx = 30;
  const ground = SIGN_ART.ground;
  propShadow(ctx, cx, ground, 12, 34, 0.22);

  // Post with grain and a stone footing.
  const post = (): void => {
    ctx.beginPath();
    ctx.moveTo(cx - 3, ground);
    ctx.lineTo(cx - 2.2, ground - 30);
    ctx.lineTo(cx + 2.2, ground - 30);
    ctx.lineTo(cx + 3, ground);
    ctx.closePath();
  };
  post();
  ctx.fillStyle = bodyGradient(ctx, cx, ground - 30, ground, theme.treeTrunk, 0.3, 0.34);
  ctx.fill();
  outline(ctx, post, SHADOW_TINT, 1.7);
  // Lit left edge + a grain line, so the post reads as a round trunk.
  ctx.strokeStyle = rgba(lit(theme.treeTrunk, 0.35), 0.8);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 2.2, ground - 1.5);
  ctx.lineTo(cx - 1.5, ground - 28.5);
  ctx.stroke();
  ctx.strokeStyle = rgba(shade(theme.treeTrunk, 0.4), 0.6);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(cx + 0.6, ground - 2);
  ctx.lineTo(cx + 1.1, ground - 28);
  ctx.stroke();
  ctx.fillStyle = rgba(theme.pebble[0], 0.95);
  lobePath(ctx, cx, ground - 1, 5, 71, 0.3, 0.55, 12);
  ctx.fill();
  ctx.strokeStyle = rgba(SHADOW_TINT, 0.5);
  ctx.lineWidth = 1;
  ctx.stroke();

  // Tilted plank board with bevel, nails and painted marks.
  ctx.save();
  ctx.translate(cx, ground - 36);
  ctx.rotate(-0.055);
  const bw = 22;
  const bh = 15;
  const board = (): void => {
    ctx.beginPath();
    ctx.moveTo(-bw, -bh);
    ctx.lineTo(bw, -bh - 1);
    ctx.lineTo(bw + 1, bh);
    ctx.lineTo(-bw + 1, bh + 1);
    ctx.closePath();
  };
  board();
  const bg = ctx.createLinearGradient(-bw, -bh, bw, bh);
  bg.addColorStop(0, lit(theme.barkLight, 0.3));
  bg.addColorStop(0.45, theme.barkLight);
  bg.addColorStop(1, shade(theme.barkLight, 0.42));
  ctx.fillStyle = bg;
  ctx.fill();
  outline(ctx, board, SHADOW_TINT, 2);
  ctx.strokeStyle = rgba(shade(theme.treeTrunk, 0.3), 0.55);
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-bw + 2, -bh + 3 + i * 4.4);
    ctx.quadraticCurveTo(0, -bh + 2.4 + i * 4.6, bw - 2, -bh + 3.6 + i * 4.4);
    ctx.stroke();
  }
  // Iron nails with a lit head.
  for (const p of [[-bw + 3, -bh + 2.6], [bw - 3, -bh + 1.8], [-bw + 3, bh - 2.4], [bw - 3, bh - 3]]) {
    ctx.fillStyle = '#4a4f59';
    ctx.beginPath();
    ctx.arc(p[0], p[1], 1.5, 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = 'rgba(226,232,240,0.8)';
    ctx.beginPath();
    ctx.arc(p[0] - 0.4, p[1] - 0.4, 0.6, 0, 6.2832);
    ctx.fill();
  }
  // Warning symbol: vector triangle + exclamation (no text glyphs).
  ctx.beginPath();
  ctx.moveTo(-6.5, -5.6);
  ctx.lineTo(0.6, 5.6);
  ctx.lineTo(-13.6, 5.6);
  ctx.closePath();
  ctx.fillStyle = '#f0c040';
  ctx.fill();
  outline(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-6.5, -5.6);
    ctx.lineTo(0.6, 5.6);
    ctx.lineTo(-13.6, 5.6);
    ctx.closePath();
  }, SHADOW_TINT, 1.3);
  ctx.fillStyle = '#3a2020';
  ctx.beginPath();
  ctx.moveTo(-7.6, -3.4);
  ctx.lineTo(-5.4, -3.4);
  ctx.lineTo(-5, 1.8);
  ctx.lineTo(-8, 1.8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-6.5, 3.6, 1, 0, 6.2832);
  ctx.fill();
  // Painted arrow pointing at the road.
  ctx.beginPath();
  ctx.moveTo(4, -1.4);
  ctx.lineTo(12, -1.4);
  ctx.lineTo(12, -4);
  ctx.lineTo(19, 0.4);
  ctx.lineTo(12, 4.8);
  ctx.lineTo(12, 2.2);
  ctx.lineTo(4, 2.2);
  ctx.closePath();
  ctx.fillStyle = rgba('#f4ead2', 0.92);
  ctx.fill();
  outline(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(4, -1.4);
    ctx.lineTo(12, -1.4);
    ctx.lineTo(12, -4);
    ctx.lineTo(19, 0.4);
    ctx.lineTo(12, 4.8);
    ctx.lineTo(12, 2.2);
    ctx.lineTo(4, 2.2);
    ctx.closePath();
  }, SHADOW_TINT, 1.1);
  ctx.restore();

  // A tuft of grass hides the post's foot.
  bladeTuft(ctx, cx - 2, ground, 4, 7, theme.grassTuft, rng(31));
}

export function drawSignDirect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, levelId = 'level_1',
): void {
  const theme = getTheme(levelId);
  blitArt(ctx, `prop:${levelId}:sign`, SIGN_ART, (c) => drawSignArt(c, theme), x, y, size * 2);
}

// ─── Spawn gate ──────────────────────────────────────────────────

interface GateArt {
  w: number;
  h: number;
  /** Anchor: this fraction of the art box sits on top of pos.y. */
  anchorY: number;
  /** Art-space positions of the two torch flames. */
  flames: [number, number][];
  /** Art-space centre of the gate's inner glow. */
  glow: [number, number];
}

const GATE: GateArt = {
  w: 112,
  h: 52,
  anchorY: 32 / 52,
  flames: [[26, 24], [86, 24]],
  glow: [56, 30],
};

function drawGateArt(ctx: CanvasRenderingContext2D): void {
  const stone = '#8a8478';
  const stoneLit = '#b9b3a3';
  const stoneDark = '#54503f';
  const ground = 36;

  // Ground contact and cast shadow.
  groundAO(ctx, 56, ground + 2, 38, 10, 0.32);
  contactShadow(ctx, 56, ground + 1, 34, 8, 0.42);
  castShadow(ctx, 58, ground, 34, 8, 12, 0.18);

  const block = (x: number, y: number, w: number, h: number, tone: number): void => {
    const col = mix(stone, tone > 0 ? stoneLit : stoneDark, Math.abs(tone));
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = rgba(lit(col, 0.3), 0.85);
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillStyle = rgba(shade(col, 0.45), 0.7);
    ctx.fillRect(x, y + h - 1.1, w, 1.1);
  };

  // Stepped threshold in front of the pillars.
  const steps = (): void => {
    ctx.beginPath();
    ctx.moveTo(14, ground + 4);
    ctx.lineTo(98, ground + 4);
    ctx.lineTo(104, ground + 11);
    ctx.lineTo(8, ground + 11);
    ctx.closePath();
    ctx.fillStyle = shade(stone, 0.3);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      block(14 + i * 21.5, ground + 4, 20, 3.4, ((i * 5) % 3 - 1) * 0.4);
    }
    outline(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(14, ground + 4);
      ctx.lineTo(98, ground + 4);
      ctx.lineTo(104, ground + 11);
      ctx.lineTo(8, ground + 11);
      ctx.closePath();
    }, SHADOW_TINT, 1.8);
  };
  steps();

  // Pillars, coursed in stone blocks.
  const pillar = (px: number): void => {
    const p = (): void => {
      ctx.beginPath();
      ctx.moveTo(px - 13, ground + 5);
      ctx.lineTo(px - 11, ground - 26);
      ctx.lineTo(px + 11, ground - 26);
      ctx.lineTo(px + 13, ground + 5);
      ctx.closePath();
    };
    p();
    const grad = ctx.createLinearGradient(px - 13, ground, px + 13, ground);
    grad.addColorStop(0, stoneLit);
    grad.addColorStop(0.4, stone);
    grad.addColorStop(1, stoneDark);
    ctx.fillStyle = grad;
    ctx.fill();
    outline(ctx, p, SHADOW_TINT, 2.4);
    for (let r = 0; r < 4; r++) {
      const y = ground + 5 - r * 8;
      const halfTop = 12.6 - r * 0.5;
      block(px - halfTop, y - 8, halfTop * 2, 8, ((r * 7) % 3 - 1) * 0.5);
    }
    // Moss creeping up the shaded side.
    const rand = rng(px * 7 + 3);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = rgba('#6f8f52', 0.5 + rand() * 0.3);
      lobePath(ctx, px + 6 + rand() * 5, ground + 2 - rand() * 22, 2.6 + rand() * 3, px + i * 13, 0.45, 0.7, 12);
      ctx.fill();
    }
  };
  pillar(26);
  pillar(86);

  // Dark passage: arches into the rock, lit from inside by an ember glow.
  const arch = (): void => {
    ctx.beginPath();
    ctx.moveTo(40, ground + 5);
    ctx.lineTo(40, ground - 6);
    ctx.quadraticCurveTo(56, ground - 38, 72, ground - 6);
    ctx.lineTo(72, ground + 5);
    ctx.closePath();
  };
  arch();
  ctx.fillStyle = '#120e18';
  ctx.fill();
  ctx.save();
  arch();
  ctx.clip();
  const inner = ctx.createRadialGradient(56, ground + 1, 2, 56, ground + 1, 26);
  inner.addColorStop(0, 'rgba(214,74,46,0.8)');
  inner.addColorStop(0.45, 'rgba(150,40,30,0.45)');
  inner.addColorStop(1, 'rgba(40,16,20,0)');
  ctx.fillStyle = inner;
  ctx.fillRect(30, ground - 30, 52, 40);
  ctx.strokeStyle = 'rgba(255,150,110,0.32)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(44, ground + 4);
  ctx.lineTo(44, ground - 5);
  ctx.quadraticCurveTo(56, ground - 30, 68, ground - 5);
  ctx.lineTo(68, ground + 4);
  ctx.stroke();
  ctx.restore();
  outline(ctx, arch, SHADOW_TINT, 2.2);

  // Iron portcullis teeth hanging in the opening.
  ctx.strokeStyle = '#2c2f38';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 5; i++) {
    const x = 43 + i * 6.5;
    ctx.beginPath();
    ctx.moveTo(x, ground - 20);
    ctx.lineTo(x, ground - 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 2, ground - 4);
    ctx.lineTo(x, ground);
    ctx.lineTo(x + 2, ground - 4);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(41, ground - 15);
  ctx.lineTo(71, ground - 15);
  ctx.stroke();

  // Carved skull boss glaring out of the gateway.
  const sx = 56;
  const sy = ground - 6;
  const skullShape = (): void => {
    ctx.beginPath();
    ctx.moveTo(sx - 6.2, sy - 1.5);
    ctx.bezierCurveTo(sx - 6.6, sy - 8, sx + 6.6, sy - 8, sx + 6.2, sy - 1.5);
    ctx.bezierCurveTo(sx + 5.8, sy + 3, sx + 3.2, sy + 4.4, sx + 1.8, sy + 6.6);
    ctx.lineTo(sx - 1.8, sy + 6.6);
    ctx.bezierCurveTo(sx - 3.2, sy + 4.4, sx - 5.8, sy + 3, sx - 6.2, sy - 1.5);
    ctx.closePath();
  };
  skullShape();
  const sg = ctx.createLinearGradient(sx - 7, sy - 8, sx + 7, sy + 7);
  sg.addColorStop(0, '#efe6cf');
  sg.addColorStop(0.55, '#cfc3a6');
  sg.addColorStop(1, '#8e836c');
  ctx.fillStyle = sg;
  ctx.fill();
  outline(ctx, skullShape, SHADOW_TINT, 1.7);
  ctx.fillStyle = 'rgba(24,16,26,0.94)';
  ctx.beginPath();
  ctx.ellipse(sx - 2.6, sy - 1, 2, 2.2, -0.14, 0, 6.2832);
  ctx.ellipse(sx + 2.6, sy - 1, 2, 2.2, 0.14, 0, 6.2832);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx, sy + 1.4);
  ctx.lineTo(sx + 1.1, sy + 3.2);
  ctx.lineTo(sx - 1.1, sy + 3.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba('#cfc3a6', 0.9);
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const tx = sx - 2.7 + i * 1.8;
    ctx.beginPath();
    ctx.moveTo(tx, sy + 4.8);
    ctx.lineTo(tx, sy + 6.6);
    ctx.stroke();
  }

  // Arch beam across the top: a tapered stone lintel with course lines.
  const lintel = (): void => {
    ctx.beginPath();
    ctx.moveTo(8, ground - 18);
    ctx.quadraticCurveTo(56, ground - 30, 104, ground - 18);
    ctx.lineTo(104, ground - 27);
    ctx.quadraticCurveTo(56, ground - 38, 8, ground - 27);
    ctx.closePath();
  };
  lintel();
  const lg = ctx.createLinearGradient(8, ground - 38, 104, ground - 18);
  lg.addColorStop(0, stoneLit);
  lg.addColorStop(0.5, stone);
  lg.addColorStop(1, stoneDark);
  ctx.fillStyle = lg;
  ctx.fill();
  outline(ctx, lintel, SHADOW_TINT, 2.4);
  for (let i = 0; i < 7; i++) {
    const t = (i + 0.5) / 7;
    const x = 12 + t * 88;
    const y = ground - 22 - Math.sin(t * Math.PI) * 4.4;
    ctx.strokeStyle = rgba(SHADOW_TINT, 0.4);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x - 3, y + 5);
    ctx.lineTo(x, y - 3.5);
    ctx.lineTo(x + 3, y + 5);
    ctx.stroke();
  }
  // Stone finials on both beam ends.
  for (const fx of [12, 100]) {
    ctx.fillStyle = stoneLit;
    lobePath(ctx, fx, ground - 29, 3.4, fx * 9 + 1, 0.22, 0.9, 12);
    ctx.fill();
    outline(ctx, () => lobePath(ctx, fx, ground - 29, 3.4, fx * 9 + 1, 0.22, 0.9, 12), SHADOW_TINT, 1.5);
    ctx.fillStyle = rgba(shade(stone, 0.4), 0.6);
    lobePath(ctx, fx + 1, ground - 27.6, 2, fx * 9 + 3, 0.22, 0.8, 10);
    ctx.fill();
  }

  // Torches: iron bracket, wooden shaft, static layered flame.
  for (const [tx, ty] of GATE.flames) {
    ctx.fillStyle = '#3a2a1c';
    ctx.fillRect(tx - 1.8, ty - 2, 3.6, 9);
    ctx.strokeStyle = '#2c2f38';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, ty + 6);
    ctx.quadraticCurveTo(tx + 5, ty + 7, tx + 5, ty + 2);
    ctx.stroke();
    ctx.fillStyle = '#4a4030';
    lobePath(ctx, tx, ty + 7, 3.6, tx * 13, 0.35, 0.75, 12);
    ctx.fill();
    // Flame: dark outer, orange mid, hot core.
    ctx.fillStyle = 'rgba(180,60,20,0.85)';
    lobePath(ctx, tx, ty - 3.4, 5, tx * 31 + 7, 0.26, 1.3, 16);
    ctx.fill();
    ctx.fillStyle = '#ea6a1e';
    lobePath(ctx, tx, ty - 4, 3.7, tx * 31 + 9, 0.24, 1.35, 16);
    ctx.fill();
    ctx.fillStyle = '#ffc247';
    lobePath(ctx, tx - 0.3, ty - 4.6, 2.3, tx * 31 + 11, 0.22, 1.35, 14);
    ctx.fill();
    ctx.fillStyle = '#fff6cf';
    lobePath(ctx, tx - 0.5, ty - 5.2, 1.1, tx * 31 + 13, 0.2, 1.25, 12);
    ctx.fill();
  }

  // Overall warm rim on the up-left silhouette.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.16;
  const rim = ctx.createLinearGradient(8, 2, 80, 50);
  rim.addColorStop(0, 'rgba(255,236,190,0.9)');
  rim.addColorStop(0.55, 'rgba(255,236,190,0)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, GATE.w, GATE.h);
  ctx.restore();
}

export function drawSpawnGateDirect(
  ctx: CanvasRenderingContext2D,
  pos: Vec2,
): void {
  const spr = sprites.get('prop:gate', GATE.w, GATE.h, (c) => drawGateArt(c));
  sprites.blit(ctx, spr, pos.x, pos.y, GATE.w, GATE.h, { ax: 0.5, ay: GATE.anchorY });

  // Living fire: a slow, stable pulse over the baked flames (no flicker).
  const t = performance.now() * 0.001;
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.7);
  const topX = pos.x - GATE.w / 2;
  const topY = pos.y - GATE.h * GATE.anchorY;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [fx, fy] of GATE.flames) {
    const gx = topX + fx;
    const gy = topY + fy - 4;
    const r = 11 + pulse * 4;
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    glow.addColorStop(0, `rgba(255,190,110,${0.2 + pulse * 0.14})`);
    glow.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(gx, gy, r, 0, 6.2832);
    ctx.fill();
  }
  const [ix, iy] = GATE.glow;
  const igx = topX + ix;
  const igy = topY + iy;
  const ig = ctx.createRadialGradient(igx, igy, 0, igx, igy, 26);
  ig.addColorStop(0, `rgba(226,74,44,${0.12 + pulse * 0.1})`);
  ig.addColorStop(1, 'rgba(226,74,44,0)');
  ctx.fillStyle = ig;
  ctx.beginPath();
  ctx.arc(igx, igy, 26, 0, 6.2832);
  ctx.fill();
  ctx.restore();
}

// ─── The last bastion ────────────────────────────────────────────

interface CastleArt {
  w: number;
  h: number;
  anchorY: number;
  /** Art-space positions of the lit windows. */
  windows: [number, number][];
}

const CASTLE: CastleArt = {
  w: 190,
  h: 170,
  anchorY: 128 / 170,
  windows: [[50, 108], [62, 108], [130, 108], [142, 108]],
};

const CASTLE_PAL = {
  stone: '#8f8b7d',
  stoneLit: '#bab4a3',
  stoneDark: '#575246',
  roof: '#8d3a33',
  roofLit: '#bd5a4a',
  roofDark: '#4e1e1a',
  iron: '#39404a',
  ironLit: '#7c848f',
  gold: '#e8c05a',
  wood: '#5a4433',
};

/** One coursed stone block: lit top-left, shaded bottom-right. */
function castleBrick(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  tone: number,
): void {
  const pal = CASTLE_PAL;
  const base = tone > 0
    ? mix(pal.stone, pal.stoneLit, tone)
    : mix(pal.stone, pal.stoneDark, -tone);
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = rgba(lit(base, 0.3), 0.8);
  ctx.fillRect(x, y, w, Math.min(1.1, h * 0.3));
  ctx.fillRect(x, y, Math.min(1.1, w * 0.3), h);
  ctx.fillStyle = rgba(shade(base, 0.5), 0.72);
  ctx.fillRect(x, y + h - Math.min(1.2, h * 0.3), w, Math.min(1.2, h * 0.3));
  ctx.fillRect(x + w - Math.min(1.2, w * 0.3), y, Math.min(1.2, w * 0.3), h);
}

function castleMasonry(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  seed: number,
): void {
  const bh = 7.4;
  const bw = 15.5;
  const rows = Math.max(1, Math.round(h / bh));
  for (let r = 0; r < rows; r++) {
    const yy = y + r * (h / rows);
    const rh = h / rows - 1.1;
    const offset = (r % 2) * bw * 0.5;
    for (let c = -1; c * bw < w + bw; c++) {
      let bx = x + c * bw + offset;
      let bwid = bw - 1.1;
      if (bx < x) {
        bwid -= x - bx;
        bx = x;
      }
      if (bx + bwid > x + w) bwid = x + w - bx;
      if (bwid <= 0.8) continue;
      const roll = hash2(x + c * 13 + r * 7, y + r * 3 + seed);
      const tone = roll > 0.82 ? -0.3 - roll * 0.2 : (roll - 0.5) * 0.24;
      castleBrick(ctx, bx, yy, bwid, Math.max(1.5, rh), tone);
    }
  }
}

function castleMossAndCracks(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
): void {
  const rand = rng(x * 31 + y * 17 + 5);
  for (let i = 0; i < 12; i++) {
    const mx = x + rand() * w;
    const my = y + h * (0.55 + rand() * 0.45);
    ctx.fillStyle = `rgba(111,143,82,${0.3 + rand() * 0.35})`;
    lobePath(ctx, mx, my, 2.4 + rand() * 5, i * 91 + 7, 0.45, 0.6, 12);
    ctx.fill();
    ctx.fillStyle = 'rgba(168,205,120,0.28)';
    lobePath(ctx, mx - 0.8, my - 1.4, 1.2 + rand() * 2.4, i * 91 + 11, 0.45, 0.6, 10);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(42,31,56,0.55)';
  for (let i = 0; i < 5; i++) {
    let cx = x + rand() * w;
    let cy = y + rand() * h * 0.6;
    ctx.lineWidth = 0.8 + rand() * 0.7;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let k = 0; k < 4; k++) {
      cx += (rand() - 0.5) * 16;
      cy += 4 + rand() * 7;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
}

function castleTower(ctx: CanvasRenderingContext2D, tx: number, baseY: number, halfW: number, topY: number): void {
  const pal = CASTLE_PAL;
  const body = (): void => {
    ctx.beginPath();
    ctx.moveTo(tx - halfW, baseY);
    ctx.lineTo(tx - halfW * 0.86, topY);
    ctx.lineTo(tx + halfW * 0.86, topY);
    ctx.lineTo(tx + halfW, baseY);
    ctx.closePath();
  };
  body();
  const grad = ctx.createLinearGradient(tx - halfW, baseY, tx + halfW, topY);
  grad.addColorStop(0, pal.stoneLit);
  grad.addColorStop(0.45, pal.stone);
  grad.addColorStop(1, pal.stoneDark);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  castleMasonry(ctx, tx - halfW - 1, topY, halfW * 2 + 2, baseY - topY, tx);
  ctx.restore();
  outline(ctx, body, SHADOW_TINT, 2.4);

  // Machicolation band with corbels.
  const band = (): void => {
    ctx.beginPath();
    ctx.moveTo(tx - halfW - 4, topY + 9);
    ctx.lineTo(tx - halfW * 0.82, topY);
    ctx.lineTo(tx + halfW * 0.82, topY);
    ctx.lineTo(tx + halfW + 4, topY + 9);
    ctx.closePath();
  };
  band();
  const bg = ctx.createLinearGradient(tx - halfW - 4, topY, tx + halfW + 4, topY + 9);
  bg.addColorStop(0, pal.stoneLit);
  bg.addColorStop(0.5, pal.stone);
  bg.addColorStop(1, pal.stoneDark);
  ctx.fillStyle = bg;
  ctx.fill();
  outline(ctx, band, SHADOW_TINT, 2);
  ctx.fillStyle = rgba(shade(pal.stone, 0.5), 0.8);
  for (let i = 0; i < 5; i++) {
    const bx = tx - halfW + 3 + i * (halfW * 2 - 6) / 4;
    ctx.beginPath();
    ctx.moveTo(bx - 2.4, topY + 9);
    ctx.lineTo(bx + 2.4, topY + 9);
    ctx.lineTo(bx, topY + 14);
    ctx.closePath();
    ctx.fill();
  }

  // Arrow slits and a lit window.
  for (let i = 0; i < 2; i++) {
    const wy = topY + 20 + i * 22;
    ctx.fillStyle = 'rgba(18,14,24,0.95)';
    ctx.beginPath();
    ctx.moveTo(tx - 1.8, wy + 11);
    ctx.lineTo(tx - 1.8, wy + 2);
    ctx.quadraticCurveTo(tx, wy - 2.4, tx + 1.8, wy + 2);
    ctx.lineTo(tx + 1.8, wy + 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,196,120,0.5)';
    ctx.fillRect(tx - 1, wy + 4, 2, 6);
  }

  // Conical roof with shingles and a gold finial.
  const roof = (): void => {
    ctx.beginPath();
    ctx.moveTo(tx - halfW - 3, topY + 1);
    ctx.quadraticCurveTo(tx - halfW * 0.45, topY - 26, tx, topY - 44);
    ctx.quadraticCurveTo(tx + halfW * 0.45, topY - 26, tx + halfW + 3, topY + 1);
    ctx.quadraticCurveTo(tx, topY + 7, tx - halfW - 3, topY + 1);
    ctx.closePath();
  };
  roof();
  const rg = ctx.createLinearGradient(tx - halfW, topY - 40, tx + halfW, topY + 4);
  rg.addColorStop(0, pal.roofLit);
  rg.addColorStop(0.42, pal.roof);
  rg.addColorStop(1, pal.roofDark);
  ctx.fillStyle = rg;
  ctx.fill();
  ctx.save();
  roof();
  ctx.clip();
  ctx.strokeStyle = 'rgba(40,14,12,0.4)';
  for (let i = 0; i < 6; i++) {
    const ry = topY - 4 - i * 7;
    const rw = (halfW + 3) * (1 - i / 7);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx - rw, ry);
    ctx.quadraticCurveTo(tx, ry + 3.4, tx + rw, ry);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,214,170,0.35)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(tx - halfW + 2, topY - 2);
  ctx.quadraticCurveTo(tx - halfW * 0.5, topY - 26, tx, topY - 42);
  ctx.stroke();
  ctx.restore();
  outline(ctx, roof, SHADOW_TINT, 2.4);

  ctx.fillStyle = pal.gold;
  ctx.beginPath();
  ctx.arc(tx, topY - 46, 2.6, 0, 6.2832);
  ctx.fill();
  ctx.fillStyle = rgba(lit(pal.gold, 0.6), 0.9);
  ctx.beginPath();
  ctx.arc(tx - 0.7, topY - 47, 1.1, 0, 6.2832);
  ctx.fill();
  // Pennant.
  ctx.beginPath();
  ctx.moveTo(tx + 1, topY - 52);
  ctx.lineTo(tx + 15, topY - 47);
  ctx.lineTo(tx + 1, topY - 42);
  ctx.closePath();
  const pg = ctx.createLinearGradient(tx, topY - 52, tx + 15, topY - 42);
  pg.addColorStop(0, '#3a5a9c');
  pg.addColorStop(1, '#1e3566');
  ctx.fillStyle = pg;
  ctx.fill();
  outline(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(tx + 1, topY - 52);
    ctx.lineTo(tx + 15, topY - 47);
    ctx.lineTo(tx + 1, topY - 42);
    ctx.closePath();
  }, SHADOW_TINT, 1.4);
}

/** Heraldic crest: shield, crowned lion head, mane and fringe. */
function drawCrest(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  const pal = CASTLE_PAL;
  const shield = (): void => {
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - r * 1.1);
    ctx.lineTo(cx + r, cy - r * 1.1);
    ctx.lineTo(cx + r, cy + r * 0.1);
    ctx.quadraticCurveTo(cx + r * 0.8, cy + r * 0.95, cx, cy + r * 1.25);
    ctx.quadraticCurveTo(cx - r * 0.8, cy + r * 0.95, cx - r, cy + r * 0.1);
    ctx.closePath();
  };
  shield();
  const sg = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  sg.addColorStop(0, '#3f63a8');
  sg.addColorStop(0.55, '#2a4478');
  sg.addColorStop(1, '#16233f');
  ctx.fillStyle = sg;
  ctx.fill();
  outline(ctx, shield, SHADOW_TINT, r * 0.16);
  rimLight(ctx, shield, cx, cy, r * 1.4, RIM_LIGHT, r * 0.12);

  // Lion head: mane spikes, face, muzzle, crown.
  const hy = cy + r * 0.05;
  const hr = r * 0.5;
  ctx.fillStyle = pal.gold;
  ctx.beginPath();
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * 6.2832;
    const rr = hr * (i % 2 === 0 ? 1.55 : 1.05);
    const x = cx + Math.cos(a) * rr;
    const y = hy + Math.sin(a) * rr * 0.98;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  outline(ctx, () => {
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * 6.2832;
      const rr = hr * (i % 2 === 0 ? 1.55 : 1.05);
      const x = cx + Math.cos(a) * rr;
      const y = hy + Math.sin(a) * rr * 0.98;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }, SHADOW_TINT, r * 0.12);
  ctx.fillStyle = mix(pal.gold, '#fff3cf', 0.4);
  ctx.beginPath();
  ctx.ellipse(cx, hy, hr * 0.86, hr * 0.9, 0, 0, 6.2832);
  ctx.fill();
  ctx.fillStyle = 'rgba(120,74,26,0.85)';
  ctx.beginPath();
  ctx.ellipse(cx, hy + hr * 0.42, hr * 0.42, hr * 0.34, 0, 0, 6.2832);
  ctx.fill();
  ctx.fillStyle = 'rgba(42,22,12,0.95)';
  ctx.beginPath();
  ctx.arc(cx - hr * 0.34, hy - hr * 0.18, hr * 0.15, 0, 6.2832);
  ctx.arc(cx + hr * 0.34, hy - hr * 0.18, hr * 0.15, 0, 6.2832);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, hy + hr * 0.14);
  ctx.lineTo(cx + hr * 0.22, hy + hr * 0.36);
  ctx.lineTo(cx - hr * 0.22, hy + hr * 0.36);
  ctx.closePath();
  ctx.fill();
  // Crown.
  ctx.fillStyle = pal.gold;
  ctx.beginPath();
  ctx.moveTo(cx - hr * 0.7, hy - hr * 0.78);
  ctx.lineTo(cx - hr * 0.5, hy - hr * 1.35);
  ctx.lineTo(cx - hr * 0.2, hy - hr * 0.92);
  ctx.lineTo(cx, hy - hr * 1.5);
  ctx.lineTo(cx + hr * 0.2, hy - hr * 0.92);
  ctx.lineTo(cx + hr * 0.5, hy - hr * 1.35);
  ctx.lineTo(cx + hr * 0.7, hy - hr * 0.78);
  ctx.closePath();
  const cg = ctx.createLinearGradient(cx, hy - hr * 1.5, cx, hy - hr * 0.78);
  cg.addColorStop(0, '#ffe9a6');
  cg.addColorStop(1, '#c99a2e');
  ctx.fillStyle = cg;
  ctx.fill();
  outline(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(cx - hr * 0.7, hy - hr * 0.78);
    ctx.lineTo(cx - hr * 0.5, hy - hr * 1.35);
    ctx.lineTo(cx - hr * 0.2, hy - hr * 0.92);
    ctx.lineTo(cx, hy - hr * 1.5);
    ctx.lineTo(cx + hr * 0.2, hy - hr * 0.92);
    ctx.lineTo(cx + hr * 0.5, hy - hr * 1.35);
    ctx.lineTo(cx + hr * 0.7, hy - hr * 0.78);
    ctx.closePath();
  }, SHADOW_TINT, r * 0.1);
}

function drawBanner(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
): void {
  const pal = CASTLE_PAL;
  const drape = (): void => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.06, x + w, y);
    ctx.lineTo(x + w, y + h * 0.78);
    ctx.lineTo(x + w * 0.5, y + h);
    ctx.lineTo(x, y + h * 0.78);
    ctx.closePath();
  };
  drape();
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#3f63a8');
  g.addColorStop(0.5, '#27406e');
  g.addColorStop(1, '#152238');
  ctx.fillStyle = g;
  ctx.fill();
  outline(ctx, drape, SHADOW_TINT, 2);
  // Fold shadows and a gold fringe.
  ctx.strokeStyle = 'rgba(12,18,32,0.4)';
  ctx.lineWidth = 1.4;
  for (let i = 1; i < 4; i++) {
    const fx = x + (w * i) / 4;
    ctx.beginPath();
    ctx.moveTo(fx, y + 1);
    ctx.quadraticCurveTo(fx + 2.4, y + h * 0.55, fx, y + h * 0.86);
    ctx.stroke();
  }
  ctx.save();
  drape();
  ctx.clip();
  ctx.fillStyle = rgba(pal.gold, 0.75);
  ctx.fillRect(x, y, w, 1.6);
  ctx.restore();
  drawCrest(ctx, x + w * 0.5, y + h * 0.44, w * 0.26);
}

function drawCastleArt(ctx: CanvasRenderingContext2D): void {
  const pal = CASTLE_PAL;
  const cx = 95;
  const ground = 150;
  const wallHalf = 62;
  const wallTop = ground - 60;

  // Ground contact, ambient occlusion and a soft cast shadow to the right.
  groundAO(ctx, cx, ground + 5, 96, 20, 0.3);
  contactShadow(ctx, cx, ground + 3, 80, 13, 0.34);
  const off = castShadowOffset(130);
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = SHADOW_TINT;
  ctx.beginPath();
  ctx.moveTo(cx - wallHalf, ground + 4);
  ctx.lineTo(cx - wallHalf + off.dx, ground + 4 + off.dy);
  ctx.lineTo(cx + wallHalf + off.dx, ground + 4 + off.dy);
  ctx.lineTo(cx + wallHalf, ground + 4);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.09;
  ctx.beginPath();
  ctx.ellipse(cx + off.dx * 1.5, ground + off.dy * 1.25, 96, 26, 0, 0, 6.2832);
  ctx.fill();
  ctx.restore();

  // Wall body: masonry, moss, cracks.
  const wall = (): void => {
    ctx.beginPath();
    ctx.moveTo(cx - wallHalf, ground);
    ctx.lineTo(cx - wallHalf, wallTop);
    ctx.lineTo(cx + wallHalf, wallTop);
    ctx.lineTo(cx + wallHalf, ground);
    ctx.closePath();
  };
  wall();
  const wg = ctx.createLinearGradient(cx - wallHalf, wallTop, cx + wallHalf, ground);
  wg.addColorStop(0, pal.stoneLit);
  wg.addColorStop(0.45, pal.stone);
  wg.addColorStop(1, pal.stoneDark);
  ctx.fillStyle = wg;
  ctx.fill();
  ctx.save();
  wall();
  ctx.clip();
  castleMasonry(ctx, cx - wallHalf, wallTop, wallHalf * 2, ground - wallTop, 11);
  castleMossAndCracks(ctx, cx - wallHalf, wallTop, wallHalf * 2, ground - wallTop);
  ctx.restore();
  outline(ctx, wall, SHADOW_TINT, 2.6);

  // Battlements: merlons with a lit top face and a shaded flank.
  const merlons = 5;
  for (let i = 0; i < merlons; i++) {
    const mw = 18;
    const gap = (wallHalf * 2 - merlons * mw) / (merlons - 1);
    const mx = cx - wallHalf + i * (mw + gap);
    const my = wallTop - 15;
    const merlon = (): void => {
      ctx.beginPath();
      ctx.moveTo(mx, wallTop + 1);
      ctx.lineTo(mx, my + 2);
      ctx.lineTo(mx + 2.5, my);
      ctx.lineTo(mx + mw - 2.5, my);
      ctx.lineTo(mx + mw, my + 2);
      ctx.lineTo(mx + mw, wallTop + 1);
      ctx.closePath();
    };
    merlon();
    const mg = ctx.createLinearGradient(mx, my, mx + mw, wallTop);
    mg.addColorStop(0, pal.stoneLit);
    mg.addColorStop(0.5, pal.stone);
    mg.addColorStop(1, pal.stoneDark);
    ctx.fillStyle = mg;
    ctx.fill();
    castleMasonry(ctx, mx, my, mw, wallTop - my, i * 3 + 1);
    outline(ctx, merlon, SHADOW_TINT, 2.2);
  }

  // Flanking towers.
  castleTower(ctx, cx - 72, ground + 4, 20, ground - 96);
  castleTower(ctx, cx + 72, ground + 4, 20, ground - 96);

  // Gatehouse: pointed arch, iron portcullis, warm interior.
  const gateW = 50;
  const arch = (): void => {
    ctx.beginPath();
    ctx.moveTo(cx - gateW / 2, ground + 2);
    ctx.lineTo(cx - gateW / 2, ground - 30);
    ctx.quadraticCurveTo(cx, ground - 62, cx + gateW / 2, ground - 30);
    ctx.lineTo(cx + gateW / 2, ground + 2);
    ctx.closePath();
  };
  arch();
  ctx.fillStyle = '#150f1c';
  ctx.fill();
  ctx.save();
  arch();
  ctx.clip();
  const interior = ctx.createRadialGradient(cx, ground - 8, 2, cx, ground - 8, 34);
  interior.addColorStop(0, 'rgba(255,196,120,0.4)');
  interior.addColorStop(0.5, 'rgba(120,70,40,0.28)');
  interior.addColorStop(1, 'rgba(20,12,18,0)');
  ctx.fillStyle = interior;
  ctx.fillRect(cx - 30, ground - 60, 60, 64);
  ctx.restore();
  outline(ctx, arch, SHADOW_TINT, 2.4);

  // Voussoir blocks around the arch.
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const ang = Math.PI * t;
    const bx = cx - Math.cos(ang) * (gateW / 2 + 4);
    const by = ground - 30 - Math.sin(ang) * 32;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(ang - Math.PI / 2);
    castleBrick(ctx, -5.5, -5, 11, 10, i % 3 === 0 ? 0.2 : -0.12);
    ctx.strokeStyle = rgba(SHADOW_TINT, 0.6);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-5.5, -5, 11, 10);
    ctx.restore();
  }

  // Portcullis: bars, cross beams, rivets, spikes.
  ctx.strokeStyle = pal.iron;
  ctx.lineWidth = 2.6;
  for (let i = 0; i < 5; i++) {
    const bx = cx - 16 + i * 8;
    ctx.beginPath();
    ctx.moveTo(bx, ground - 40);
    ctx.lineTo(bx, ground + 1);
    ctx.stroke();
    ctx.strokeStyle = rgba(pal.ironLit, 0.55);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(bx - 0.9, ground - 39);
    ctx.lineTo(bx - 0.9, ground);
    ctx.stroke();
    ctx.strokeStyle = pal.iron;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(bx - 2.2, ground - 2);
    ctx.lineTo(bx, ground + 5);
    ctx.lineTo(bx + 2.2, ground - 2);
    ctx.stroke();
  }
  ctx.strokeStyle = pal.iron;
  for (let i = 0; i < 3; i++) {
    const by = ground - 36 + i * 14;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx - 18, by);
    ctx.lineTo(cx + 18, by);
    ctx.stroke();
    ctx.fillStyle = pal.ironLit;
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      ctx.arc(cx - 16 + k * 8, by, 1, 0, 6.2832);
      ctx.fill();
    }
  }

  // Lit windows flanking the gate.
  for (const [wx, wy] of CASTLE.windows) {
    const win = (): void => {
      ctx.beginPath();
      ctx.moveTo(wx - 5, wy + 9);
      ctx.lineTo(wx - 5, wy - 1);
      ctx.quadraticCurveTo(wx, wy - 8, wx + 5, wy - 1);
      ctx.lineTo(wx + 5, wy + 9);
      ctx.closePath();
    };
    win();
    const glowGrad = ctx.createLinearGradient(wx, wy - 8, wx, wy + 9);
    glowGrad.addColorStop(0, '#fff1c4');
    glowGrad.addColorStop(0.5, '#ffc266');
    glowGrad.addColorStop(1, '#a85c22');
    ctx.fillStyle = glowGrad;
    ctx.fill();
    outline(ctx, win, SHADOW_TINT, 1.6);
    ctx.strokeStyle = 'rgba(40,26,18,0.75)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(wx, wy - 7);
    ctx.lineTo(wx, wy + 8);
    ctx.moveTo(wx - 5, wy + 1);
    ctx.lineTo(wx + 5, wy + 1);
    ctx.stroke();
    // Stone sill.
    ctx.fillStyle = pal.stoneLit;
    ctx.fillRect(wx - 7, wy + 9, 14, 2.6);
    ctx.strokeStyle = rgba(SHADOW_TINT, 0.5);
    ctx.lineWidth = 0.8;
    ctx.strokeRect(wx - 7, wy + 9, 14, 2.6);
  }

  // Two banners flanking the gate, plus a high banner on the wall.
  drawBanner(ctx, cx - 54, wallTop - 2, 28, 46);
  drawBanner(ctx, cx + 26, wallTop - 2, 28, 46);
  drawBanner(ctx, cx - 12, wallTop - 28, 24, 36);

  // Weathering shine on the up-left faces.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.1;
  const rim = ctx.createLinearGradient(cx - wallHalf, wallTop, cx + wallHalf, ground + 10);
  rim.addColorStop(0, 'rgba(255,238,200,0.9)');
  rim.addColorStop(0.5, 'rgba(255,238,200,0)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, CASTLE.w, CASTLE.h);
  ctx.restore();
}

export function drawBaseDirect(
  ctx: CanvasRenderingContext2D,
  pos: Vec2,
): void {
  const spr = sprites.get('prop:castle', CASTLE.w, CASTLE.h, (c) => drawCastleArt(c));
  sprites.blit(ctx, spr, pos.x, pos.y, CASTLE.w, CASTLE.h, { ax: 0.5, ay: CASTLE.anchorY });

  // Windows breathe slowly, like firelight behind the glass.
  const t = performance.now() * 0.001;
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.25 + 1.1);
  const topX = pos.x - CASTLE.w / 2;
  const topY = pos.y - CASTLE.h * CASTLE.anchorY;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [wx, wy] of CASTLE.windows) {
    const gx = topX + wx;
    const gy = topY + wy + 1;
    const r = 15 + pulse * 4;
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    glow.addColorStop(0, `rgba(255,196,120,${0.14 + pulse * 0.1})`);
    glow.addColorStop(1, 'rgba(255,160,70,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(gx, gy, r, 0, 6.2832);
    ctx.fill();
  }
  ctx.restore();
}
