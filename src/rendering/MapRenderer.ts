// ─── Map Renderer ────────────────────────────────────────────────
// Procedural terrain, path, and decoration rendering for Kingdom Rush quality
// Canvas 2D drawing with generated textures for rich visual detail

import { Vec2, DESIGN_WIDTH, DESIGN_HEIGHT } from '../data/types';
import { lighten, darken } from '../core/color';

// ─── Noise function (simplex-like for terrain) ──────────────────
function hash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h & 0x7fffffff) / 0x7fffffff;
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash(ix, iy);
  const n10 = hash(ix + 1, iy);
  const n01 = hash(ix, iy + 1);
  const n11 = hash(ix + 1, iy + 1);
  return (n00 * (1 - sx) + n10 * sx) * (1 - sy) + (n01 * (1 - sx) + n11 * sx) * sy;
}

function fbm(x: number, y: number, octaves = 4): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxValue;
}

// ─── Level Theme Colors ─────────────────────────────────────────
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
}

const LEVEL_THEMES: Record<string, LevelTheme> = {
  level_1: {
    grassBase: '#4a8e3a',
    grassHighlight: '#5eab4a',
    grassDark: '#3a7a2e',
    pathBase: '#c4a06a',
    pathLight: '#ddc08a',
    pathDark: '#8a7040',
    waterColor: '#4a90c4',
    skyGradient: ['#87CEEB', '#b8e0f0'],
    ambientLight: '#fffbe6',
    fogColor: '#e8f4e8',
    fogDensity: 0,
    treeTrunk: '#5c4033',
    treeCanopy: ['#2d8a2e', '#3ca63d', '#4ab84b', '#228B22'],
    rockColor: ['#8a8a7a', '#9a9a8a', '#7a7a6a'],
    flowerColors: ['#ff6b9d', '#ffeb3b', '#e040fb', '#7c4dff'],
  },
  level_2: {
    grassBase: '#3a7a2e',
    grassHighlight: '#4a9a3a',
    grassDark: '#2a6020',
    pathBase: '#9a8060',
    pathLight: '#baa080',
    pathDark: '#705838',
    waterColor: '#3a7a9a',
    skyGradient: ['#5a8a5a', '#8ab880'],
    ambientLight: '#e0ffe0',
    fogColor: '#a8d8a8',
    fogDensity: 0.15,
    treeTrunk: '#4a3025',
    treeCanopy: ['#1a6a1a', '#2a7a2a', '#206020', '#1a5a1a'],
    rockColor: ['#6a7a6a', '#7a8a7a', '#5a6a5a'],
    flowerColors: ['#8aaa3a', '#6a8a2a', '#aaca4a'],
  },
  level_3: {
    grassBase: '#5a7a4a',
    grassHighlight: '#6a8a5a',
    grassDark: '#4a6a3a',
    pathBase: '#8a7a6a',
    pathLight: '#aaa08a',
    pathDark: '#5a5040',
    waterColor: '#3a6a8a',
    skyGradient: ['#8a9aaa', '#a0aab4'],
    ambientLight: '#d0d8e0',
    fogColor: '#b0b8c0',
    fogDensity: 0.25,
    treeTrunk: '#4a3a2a',
    treeCanopy: ['#3a6a3a', '#4a7a4a', '#2a5a2a', '#3a5a3a'],
    rockColor: ['#7a7a7a', '#8a8a8a', '#6a6a6a', '#5a5a5a'],
    flowerColors: ['#8a8a9a', '#7a7a8a'],
  },
  level_4: {
    grassBase: '#3a5a30',
    grassHighlight: '#4a6a3a',
    grassDark: '#2a4020',
    pathBase: '#6a5a4a',
    pathLight: '#8a7a6a',
    pathDark: '#4a3a2a',
    waterColor: '#2a4a3a',
    skyGradient: ['#3a4a3a', '#4a5a4a'],
    ambientLight: '#a0c0a0',
    fogColor: '#5a7a5a',
    fogDensity: 0.35,
    treeTrunk: '#3a2a1a',
    treeCanopy: ['#2a4a2a', '#1a3a1a', '#3a5a2a', '#1a4a1a'],
    rockColor: ['#5a5a4a', '#6a6a5a', '#4a4a3a'],
    flowerColors: ['#7aff4a', '#4aff8a', '#aafa3a'],
  },
  level_5: {
    grassBase: '#4a4a3a',
    grassHighlight: '#5a5a4a',
    grassDark: '#3a3a2a',
    pathBase: '#6a5040',
    pathLight: '#8a6a50',
    pathDark: '#4a3020',
    waterColor: '#ff4a2a',
    skyGradient: ['#4a2020', '#6a3030'],
    ambientLight: '#ffa060',
    fogColor: '#4a2020',
    fogDensity: 0.2,
    treeTrunk: '#2a1a0a',
    treeCanopy: ['#3a3020', '#4a4030', '#2a2a1a'],
    rockColor: ['#4a4040', '#5a4a40', '#3a3030'],
    flowerColors: ['#ff6a3a', '#ff4a2a', '#ffaa3a'],
  },
};

export function getTheme(levelId: string): LevelTheme {
  return LEVEL_THEMES[levelId] || LEVEL_THEMES.level_1;
}

// ─── Decoration Drawing Functions ───────────────────────────────

function drawTree(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, variant: number, theme: LevelTheme, _time: number): void {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.4, s * 0.6, s * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Trunk
  const trunkW = s * 0.15;
  const trunkH = s * 0.5;
  ctx.fillStyle = theme.treeTrunk;
  ctx.fillRect(cx - trunkW, cy - trunkH, trunkW * 2, trunkH + s * 0.1);
  
  // Trunk texture
  ctx.fillStyle = lighten(theme.treeTrunk, 0.1);
  ctx.fillRect(cx - trunkW * 0.5, cy - trunkH + 2, trunkW * 0.6, trunkH - 4);
  
  // Bark details
  ctx.strokeStyle = darken(theme.treeTrunk, 0.15);
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 4; i++) {
    const by = cy - trunkH + i * (trunkH / 4) + 3;
    ctx.beginPath();
    ctx.moveTo(cx - trunkW + 1, by);
    ctx.lineTo(cx + trunkW - 1, by + 2);
    ctx.stroke();
  }
  
  // Canopy layers (multiple overlapping circles for natural look)
  const canopyColors = theme.treeCanopy;
  const layers = variant === 0 ? [
    // Round tree
    { ox: 0, oy: -0.7, r: 0.55 },
    { ox: -0.2, oy: -0.8, r: 0.4 },
    { ox: 0.15, oy: -0.9, r: 0.35 },
    { ox: 0, oy: -1.0, r: 0.25 },
  ] : variant === 1 ? [
    // Pine tree (triangular)
    { ox: 0, oy: -0.5, r: 0.5 },
    { ox: 0, oy: -0.7, r: 0.4 },
    { ox: 0, oy: -0.9, r: 0.28 },
    { ox: 0, oy: -1.05, r: 0.15 },
  ] : variant === 2 ? [
    // Wide tree
    { ox: -0.2, oy: -0.6, r: 0.45 },
    { ox: 0.2, oy: -0.6, r: 0.45 },
    { ox: 0, oy: -0.8, r: 0.4 },
    { ox: 0, oy: -0.95, r: 0.25 },
  ] : [
    // Tall slim tree
    { ox: 0, oy: -0.6, r: 0.35 },
    { ox: 0, oy: -0.8, r: 0.3 },
    { ox: 0, oy: -1.0, r: 0.22 },
    { ox: 0, oy: -1.15, r: 0.15 },
  ];
  
  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    const color = canopyColors[i % canopyColors.length];
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx + l.ox * s, cy + l.oy * s, l.r * s, 0, Math.PI * 2);
    ctx.fill();
    
    // Leaf highlight
    ctx.fillStyle = lighten(color, 0.12);
    ctx.beginPath();
    ctx.arc(cx + l.ox * s - l.r * s * 0.2, cy + l.oy * s - l.r * s * 0.2, l.r * s * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRock(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, variant: number, theme: LevelTheme): void {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.2, s * 0.55, s * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  
  const colors = theme.rockColor;
  
  // Main rock body
  ctx.fillStyle = colors[0];
  ctx.beginPath();
  if (variant === 0) {
    ctx.ellipse(cx, cy, s * 0.45, s * 0.35, 0, 0, Math.PI * 2);
  } else if (variant === 1) {
    // Angular rock
    ctx.moveTo(cx - s * 0.4, cy + s * 0.1);
    ctx.lineTo(cx - s * 0.3, cy - s * 0.3);
    ctx.lineTo(cx + s * 0.1, cy - s * 0.35);
    ctx.lineTo(cx + s * 0.4, cy - s * 0.1);
    ctx.lineTo(cx + s * 0.35, cy + s * 0.15);
    ctx.closePath();
  } else {
    // Cluster
    ctx.ellipse(cx - s * 0.1, cy, s * 0.3, s * 0.25, -0.2, 0, Math.PI * 2);
  }
  ctx.fill();
  
  // Highlight
  ctx.fillStyle = colors[1] || colors[0];
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.1, cy - s * 0.1, s * 0.25, s * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Small rock nearby (cluster)
  if (variant !== 0) {
    ctx.fillStyle = colors[2] || colors[0];
    ctx.beginPath();
    ctx.ellipse(cx + s * 0.3, cy + s * 0.05, s * 0.15, s * 0.12, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Moss (on darker levels)
  ctx.fillStyle = 'rgba(80,140,60,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.05, cy - s * 0.15, s * 0.12, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBush(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, variant: number, theme: LevelTheme): void {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.15, s * 0.4, s * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  
  const canopyColors = theme.treeCanopy;
  
  // Bush body (multiple overlapping circles)
  const circles = [
    { ox: -0.15, oy: -0.05, r: 0.28 },
    { ox: 0.1, oy: -0.08, r: 0.25 },
    { ox: 0, oy: -0.15, r: 0.2 },
  ];
  
  for (let i = 0; i < circles.length; i++) {
    const c = circles[i];
    ctx.fillStyle = canopyColors[i % canopyColors.length];
    ctx.beginPath();
    ctx.arc(cx + c.ox * s, cy + c.oy * s, c.r * s, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Berries
  if (variant > 1) {
    const berryColor = theme.flowerColors[0] || '#ff4444';
    ctx.fillStyle = berryColor;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(cx + (Math.random() - 0.5) * s * 0.3, cy - (Math.random() * s * 0.2), 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawMushroom(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, theme: LevelTheme): void {
  const scale = s * 0.06;
  
  // Stem
  ctx.fillStyle = '#e8d8c0';
  ctx.fillRect(cx - 2 * scale, cy - 2 * scale, 4 * scale, 5 * scale);
  
  // Cap
  ctx.fillStyle = theme.flowerColors[0] || '#cc3333';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 2 * scale, 5 * scale, 3 * scale, 0, Math.PI, 0);
  ctx.fill();
  
  // Cap highlight
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(cx - 1.5 * scale, cy - 3.5 * scale, 1.2 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 2 * scale, cy - 2.5 * scale, 0.8 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawStump(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, theme: LevelTheme): void {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.1, s * 0.25, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Stump body
  ctx.fillStyle = theme.treeTrunk;
  ctx.fillRect(cx - s * 0.15, cy - s * 0.15, s * 0.3, s * 0.25);
  
  // Top (ring pattern)
  ctx.fillStyle = lighten(theme.treeTrunk, 0.15);
  ctx.beginPath();
  ctx.ellipse(cx, cy - s * 0.15, s * 0.15, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Growth rings
  ctx.strokeStyle = darken(theme.treeTrunk, 0.1);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy - s * 0.15, s * 0.08, s * 0.04, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawBones(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  ctx.strokeStyle = '#d4c8b0';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  
  // Bone 1
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.2, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.2, cy + s * 0.1);
  ctx.stroke();
  
  // Bone ends
  ctx.fillStyle = '#d4c8b0';
  ctx.beginPath();
  ctx.arc(cx - s * 0.2, cy - s * 0.1, 2, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.2, cy + s * 0.1, 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Skull
  ctx.fillStyle = '#e8dcc8';
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.05, s * 0.08, 0, Math.PI * 2);
  ctx.fill();
  
  // Eye sockets
  ctx.fillStyle = '#2a2020';
  ctx.beginPath();
  ctx.arc(cx - 1.5, cy - s * 0.06, 1, 0, Math.PI * 2);
  ctx.arc(cx + 1.5, cy - s * 0.06, 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawSign(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, theme: LevelTheme): void {
  // Post
  ctx.fillStyle = theme.treeTrunk;
  ctx.fillRect(cx - 1.5, cy - s * 0.4, 3, s * 0.5);
  
  // Sign board
  ctx.fillStyle = lighten(theme.treeTrunk, 0.2);
  ctx.fillRect(cx - s * 0.25, cy - s * 0.4, s * 0.5, s * 0.2);
  
  // Border
  ctx.strokeStyle = darken(theme.treeTrunk, 0.15);
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - s * 0.25, cy - s * 0.4, s * 0.5, s * 0.2);
  
  // "Danger" symbol (skull & crossbones simplified)
  ctx.fillStyle = '#cc3333';
  ctx.font = `${s * 0.12}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚠', cx, cy - s * 0.3);
}

// ─── Direct Canvas2D Rendering ───────────────────────────────────

let cachedBgCanvas: HTMLCanvasElement | null = null;
let cachedBgLevelId = '';

export function drawBackgroundDirect(
  ctx: CanvasRenderingContext2D,
  levelId: string,
  path: Vec2[],
): void {
  if (!cachedBgCanvas || cachedBgLevelId !== levelId) {
    cachedBgCanvas = document.createElement('canvas');
    cachedBgCanvas.width = DESIGN_WIDTH;
    cachedBgCanvas.height = DESIGN_HEIGHT;
    const bCtx = cachedBgCanvas.getContext('2d')!;
    const theme = getTheme(levelId);

    // Base grass gradient
    const baseGrad = bCtx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
    baseGrad.addColorStop(0, theme.grassHighlight);
    baseGrad.addColorStop(0.4, theme.grassBase);
    baseGrad.addColorStop(0.7, theme.grassDark);
    baseGrad.addColorStop(1, theme.grassBase);
    bCtx.fillStyle = baseGrad;
    bCtx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Procedural noise variation
    const imgData = bCtx.getImageData(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    const data = imgData.data;
    for (let py = 0; py < DESIGN_HEIGHT; py += 2) {
      for (let px = 0; px < DESIGN_WIDTH; px += 2) {
        const noise = fbm(px * 0.02, py * 0.02, 3);
        const variation = (noise - 0.5) * 26;
        for (let dy = 0; dy < 2 && py + dy < DESIGN_HEIGHT; dy++) {
          for (let dx = 0; dx < 2 && px + dx < DESIGN_WIDTH; dx++) {
            const i = ((py + dy) * DESIGN_WIDTH + (px + dx)) * 4;
            data[i] = Math.max(0, Math.min(255, data[i] + variation));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + variation * 1.2));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + variation * 0.3));
          }
        }
      }
    }
    bCtx.putImageData(imgData, 0, 0);

    // Wild grass tufts
    bCtx.lineWidth = 1;
    for (let i = 0; i < 350; i++) {
      const gx = (i * 137.5) % DESIGN_WIDTH;
      const gy = (i * 89.3) % DESIGN_HEIGHT;
      const grassColor = i % 2 === 0 ? theme.grassHighlight : theme.grassDark;
      bCtx.strokeStyle = grassColor;
      bCtx.globalAlpha = 0.4;
      bCtx.beginPath();
      bCtx.moveTo(gx, gy);
      bCtx.lineTo(gx - 2, gy - 6);
      bCtx.moveTo(gx, gy);
      bCtx.lineTo(gx + 2, gy - 7);
      bCtx.stroke();
    }
    bCtx.globalAlpha = 1;

    // Wild flowers
    for (let i = 0; i < 60; i++) {
      const fx = (i * 211.3) % DESIGN_WIDTH;
      const fy = (i * 173.7) % DESIGN_HEIGHT;
      bCtx.fillStyle = i % 3 === 0 ? '#fef08a' : (i % 3 === 1 ? '#fda4af' : '#93c5fd');
      bCtx.beginPath();
      bCtx.arc(fx, fy, 2, 0, Math.PI * 2);
      bCtx.fill();
    }

    cachedBgLevelId = levelId;
  }

  ctx.drawImage(cachedBgCanvas, 0, 0);
}

export function drawPathDirect(
  ctx: CanvasRenderingContext2D,
  levelId: string,
  waypoints: Vec2[],
): void {
  if (waypoints.length < 2) return;
  const theme = getTheme(levelId);

  const traceCurvedPath = () => {
    ctx.beginPath();
    ctx.moveTo(waypoints[0].x, waypoints[0].y);
    for (let i = 1; i < waypoints.length; i++) {
      const prev = waypoints[i - 1];
      const curr = waypoints[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      if (i === 1) {
        ctx.lineTo(midX, midY);
      } else {
        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      }
    }
    const last = waypoints[waypoints.length - 1];
    ctx.lineTo(last.x, last.y);
  };

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Path Shadow (dirt depth)
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 46;
  traceCurvedPath();
  ctx.stroke();

  // 2. Dark dirt edge
  ctx.strokeStyle = theme.pathDark;
  ctx.lineWidth = 40;
  traceCurvedPath();
  ctx.stroke();

  // 3. Main dirt path
  ctx.strokeStyle = theme.pathBase;
  ctx.lineWidth = 34;
  traceCurvedPath();
  ctx.stroke();

  // 4. Lighter compacted center
  ctx.strokeStyle = theme.pathLight;
  ctx.lineWidth = 20;
  traceCurvedPath();
  ctx.stroke();

  // 5. Wheel ruts
  ctx.strokeStyle = theme.pathDark;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.35;
  ctx.setLineDash([12, 10]);
  traceCurvedPath();
  ctx.stroke();
  ctx.setLineDash([]);

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
  drawTree(ctx, x, y, size, variant, theme, 0);
}

export function drawRockDirect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  levelId = 'level_1',
  variant = 0,
): void {
  const theme = getTheme(levelId);
  drawRock(ctx, x, y, size, variant, theme);
}

// Prop variety (A5): the remaining decoration types are reachable from the
// level renderer instead of being dead code.

export function drawBushDirect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, levelId = 'level_1', variant = 0,
): void {
  drawBush(ctx, x, y, size, variant, getTheme(levelId));
}

export function drawMushroomDirect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, levelId = 'level_1',
): void {
  drawMushroom(ctx, x, y, size, getTheme(levelId));
}

export function drawStumpDirect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, levelId = 'level_1',
): void {
  drawStump(ctx, x, y, size, getTheme(levelId));
}

export function drawBonesDirect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
): void {
  drawBones(ctx, x, y, size);
}

export function drawSignDirect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, levelId = 'level_1',
): void {
  drawSign(ctx, x, y, size, getTheme(levelId));
}

export function drawSpawnGateDirect(
  ctx: CanvasRenderingContext2D,
  pos: Vec2,
): void {
  const cx = pos.x;
  const cy = pos.y;

  // Gate shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(cx - 24, cy - 14, 48, 42);

  // Stone pillars
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(cx - 24, cy - 24, 11, 48);
  ctx.fillRect(cx + 13, cy - 24, 11, 48);

  // Pillar highlights
  ctx.fillStyle = '#6b7280';
  ctx.fillRect(cx - 22, cy - 22, 5, 44);
  ctx.fillRect(cx + 15, cy - 22, 5, 44);

  // Top beam
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(cx - 26, cy - 28, 52, 9);
  ctx.fillStyle = '#6b7280';
  ctx.fillRect(cx - 24, cy - 26, 48, 4);

  // Dark gate arch entrance
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(cx, cy + 2, 13, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(cx - 13, cy + 2, 26, 18);

  // Ominous fiery red glow
  ctx.fillStyle = 'rgba(220, 38, 38, 0.35)';
  ctx.beginPath();
  ctx.arc(cx, cy + 8, 11, 0, Math.PI * 2);
  ctx.fill();

  // Horned skull on top
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(cx, cy - 18, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(cx - 2.5, cy - 19, 1.5, 1.5);
  ctx.fillRect(cx + 1, cy - 19, 1.5, 1.5);

  // Burning torches on each pillar
  for (const side of [-1, 1]) {
    const tx = cx + side * 19;
    const ty = cy - 10;
    // Sconce
    ctx.fillStyle = '#451a03';
    ctx.fillRect(tx - 1.5, ty, 3, 7);
    // Outer flame
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.arc(tx, ty, 4, 0, Math.PI * 2);
    ctx.fill();
    // Inner hot flame
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(tx, ty - 1, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawBaseDirect(
  ctx: CanvasRenderingContext2D,
  pos: Vec2,
): void {
  const cx = pos.x;
  const cy = pos.y + 4;

  // Castle shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 26, 38, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main fortress wall (stone)
  ctx.fillStyle = '#64748b';
  ctx.fillRect(cx - 28, cy - 20, 56, 42);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(cx - 25, cy - 17, 50, 36);

  // Crenellations / Battlements
  ctx.fillStyle = '#64748b';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(cx - 27 + i * 11, cy - 28, 8, 10);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cx - 26 + i * 11, cy - 27, 6, 8);
    ctx.fillStyle = '#64748b';
  }

  // Left & Right flanking watchtowers
  for (const side of [-1, 1]) {
    const tx = cx + side * 27;
    ctx.fillStyle = '#475569';
    ctx.fillRect(tx - 6, cy - 28, 12, 28);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(tx - 4, cy - 26, 8, 24);
    // Tower roof
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.moveTo(tx - 7, cy - 28);
    ctx.lineTo(tx, cy - 38);
    ctx.lineTo(tx + 7, cy - 28);
    ctx.closePath();
    ctx.fill();
  }

  // Grand Portcullis Arch
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(cx, cy + 6, 10, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(cx - 10, cy + 6, 20, 16);

  // Iron Grate
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  for (let gx = -6; gx <= 6; gx += 4) {
    ctx.beginPath();
    ctx.moveTo(cx + gx, cy - 2);
    ctx.lineTo(cx + gx, cy + 22);
    ctx.stroke();
  }

  // Royal Banner of the Bastion
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(cx - 5, cy - 42, 10, 15);
  ctx.fillStyle = '#ffd700'; // Golden lion emblem
  ctx.fillRect(cx - 3, cy - 38, 6, 6);

  // Flag pole
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 44);
  ctx.lineTo(cx, cy - 20);
  ctx.stroke();
}
