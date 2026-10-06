// ─── UI & Cartography Renderer ─────────────────────────────────────
// Kingdom-Rush-flavoured fantasy UI, drawn entirely in code:
//   • an epic fortress title screen with a multi-layer night sky, moon,
//     drifting clouds, two-tone mountains, a stone rampart with a
//     portcullis, two animated braziers, hovering embers and a royal crest
//   • a parchment world map with foam-lined coasts, two-tone snow-capped
//     mountains, detailed pine clusters, a carved campaign road, beveled
//     shield markers, wax seals and a 3D star medal
//   • a carved-wood battle HUD with rivets, gold trim, a shaded heart, a
//     horned wave banner and a pulsing "call the horde" medallion
//   • scroll briefing / bestiary modals with dowels, trim bands and
//     MedievalSharp headings
//
// Every panel, button, medallion and icon is baked once into a sprite
// (SpriteBank) and then blitted, so a frame costs blits plus a handful
// of strokes — never a re-tessellated path.
//
// Geometry is frozen: game.ts hit-tests hard-coded rects. This file may
// restyle those controls but must never move or resize them.

import { LevelData, SaveData, Vec2, DESIGN_WIDTH, DESIGN_HEIGHT } from '../data/types';
import { sprites } from './SpriteBank';
import { drawIcon, IconName } from './Icons';
import { SHADOW_TINT } from './Palette';

// ─── Shared UI constants ─────────────────────────────────────────

const FONT_TITLE = '"MedievalSharp", Georgia, serif';
const FONT_UI = '"Inter", system-ui, sans-serif';

/** Warm outline used by every hand-drawn panel edge. */
const UI_INK = SHADOW_TINT;
const WOOD_HI = '#a8712f';
const WOOD = '#7a4d20';
const WOOD_DARK = '#4a2c12';
const GOLD_HI = '#ffe9a8';
const GOLD = '#f2c14a';
const GOLD_DARK = '#8a5f14';
const PARCHMENT_HI = '#fdf3dc';
const PARCHMENT = '#f2e0bb';
const PARCHMENT_DARK = '#cfa972';
const BRONZE = '#b07c38';
const BLOOD = '#b03325';
const BLOOD_DARK = '#6e1a13';

// ─── Caches ──────────────────────────────────────────────────────

// High-detail static parchment terrain, painted once.
let cachedMapCanvas: HTMLCanvasElement | null = null;

// ─── Deterministic noise (stable art between runs) ───────────────

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// ─── Parchment World Map ─────────────────────────────────────────

export function drawParchmentWorldMap(
  ctx: CanvasRenderingContext2D,
  time: number,
  mousePos: Vec2,
  levels: LevelData[],
  save: SaveData,
  hoveredIndex: number,
  selectedLevelIndex: number | null,
  audioMuted: boolean,
): void {
  // 1. Static parchment terrain (baked once).
  if (!cachedMapCanvas) {
    cachedMapCanvas = document.createElement('canvas');
    cachedMapCanvas.width = DESIGN_WIDTH;
    cachedMapCanvas.height = DESIGN_HEIGHT;
    const cCtx = cachedMapCanvas.getContext('2d');
    if (cCtx) renderStaticParchmentBase(cCtx, levels);
  }
  ctx.drawImage(cachedMapCanvas, 0, 0);

  // 2. Living sea: swell, spray and surf breaking on the coast.
  drawAnimatedSeaDetails(ctx, time);

  // 3. Sun-bleached haze across the chart.
  ctx.save();
  const haze = ctx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
  haze.addColorStop(0, 'rgba(255,246,214,0.16)');
  haze.addColorStop(0.45, 'rgba(255,246,214,0.03)');
  haze.addColorStop(1, 'rgba(74,46,18,0.10)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  ctx.restore();

  // 4. Campaign road with a marching ribbon.
  drawCampaignPath(ctx, levels, save, time);

  // 5. Stage markers: beveled shields, flags, medals, padlocks.
  const nodePositions = getLevelNodePositions(levels.length);
  for (let i = 0; i < levels.length; i++) {
    const pos = nodePositions[i];
    const level = levels[i];
    const unlocked = i === 0 || !!save.levelStars[levels[i - 1].id];
    const stars = save.levelStars[level.id] || 0;
    const isHovered = hoveredIndex === i;
    const isSelected = selectedLevelIndex === i;
    const isNextBattle = unlocked && stars === 0 && (i === 0 || (save.levelStars[levels[i - 1].id] || 0) > 0);

    drawLevelStageMarker(ctx, pos.x, pos.y, i + 1, level.name, unlocked, stars,
      isHovered, isSelected, isNextBattle, time);
  }

  // 6. Carved top bar: menu, campaign title, star tally, sound.
  drawWorldMapTopBar(ctx, mousePos, save.totalStars, audioMuted);

  // 7. Stage briefing scroll.
  if (selectedLevelIndex !== null && selectedLevelIndex >= 0 && selectedLevelIndex < levels.length) {
    const selLevel = levels[selectedLevelIndex];
    const selStars = save.levelStars[selLevel.id] || 0;
    drawStageBriefingModal(ctx, selLevel, selectedLevelIndex + 1, selStars, mousePos, time);
  }
}

// Fixed positions across the kingdom map for 5 levels
export function getLevelNodePositions(_count: number): Vec2[] {
  return [
    { x: 180, y: 440 }, // Level 1: The Green Valley (South-West Plains)
    { x: 410, y: 360 }, // Level 2: Forest Pass (Dense Pine Woodlands)
    { x: 650, y: 460 }, // Level 3: Broken Bridge (Rushing River Chasm)
    { x: 880, y: 320 }, // Level 4: Dark Swamp (Misty Mire)
    { x: 1110, y: 220 }, // Level 5: Warlord's Gate (Volcanic Fortress Peaks)
  ];
}

// ─── Static parchment terrain (baked once) ───────────────────────

function renderStaticParchmentBase(ctx: CanvasRenderingContext2D, levels: LevelData[]): void {
  // Aged vellum: warm centre, burnt edges.
  const bg = ctx.createRadialGradient(
    DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.42, 90,
    DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.5, DESIGN_WIDTH * 0.78,
  );
  bg.addColorStop(0, '#f8ecd2');
  bg.addColorStop(0.45, '#eeddb4');
  bg.addColorStop(0.78, '#d9bb84');
  bg.addColorStop(1, '#b58a4e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  drawParchmentFiber(ctx);
  drawParchmentStain(ctx, 210, 170, 62);
  drawParchmentStain(ctx, 968, 566, 78);
  drawParchmentStain(ctx, 640, 250, 44);

  // Sea first, then land on top of it.
  const grade = hash2(3, 1);
  const cx = 640 + (grade - 0.5) * 40;
  const cy = 250 + (grade - 0.5) * 50;
  const r = 470;
  const land = wobblyBlob(cx, cy, r, 64, (a) => (
    1
    + 0.10 * Math.sin(a * 3 + 0.7)
    + 0.06 * Math.sin(a * 5 - 1.9)
    + 0.04 * Math.sin(a * 8 + 2.4)
  ));
  drawSea(ctx, land);
  drawLandMass(ctx, land);
  drawRiverChasm(ctx);
  drawMountainRanges(ctx);
  drawForestPatches(ctx);
  drawSeaMonster(ctx, 470, 638);
  drawCompassRose(ctx, 118, 152, 58);
  drawCartographerNote(ctx);
  drawBurnedMapFrame(ctx);
  void levels;
}

/** Paper fibre: monochrome speckle that never reads as mud. */
function drawParchmentFiber(ctx: CanvasRenderingContext2D): void {
  for (let i = 0; i < 5200; i++) {
    const x = hash2(i, 1) * DESIGN_WIDTH;
    const y = hash2(i, 2) * DESIGN_HEIGHT;
    const a = hash2(i, 3);
    ctx.fillStyle = a > 0.5 ? 'rgba(120,84,38,0.045)' : 'rgba(255,250,232,0.05)';
    ctx.fillRect(x, y, 1 + a * 1.6, 1 + hash2(i, 4) * 1.4);
  }

  // Fold creases of a chart that has been carried to war.
  ctx.strokeStyle = 'rgba(108,68,26,0.10)';
  [0.33, 0.67].forEach((f, i) => {
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(DESIGN_WIDTH * f, 0);
    ctx.bezierCurveTo(DESIGN_WIDTH * f + (i ? -7 : 6), 240, DESIGN_WIDTH * f + (i ? 9 : -5), 470, DESIGN_WIDTH * f, DESIGN_HEIGHT);
    ctx.stroke();
    ctx.lineWidth = 0.9;
    ctx.strokeStyle = 'rgba(255,248,226,0.10)';
    ctx.beginPath();
    ctx.moveTo(DESIGN_WIDTH * f + 2, 0);
    ctx.bezierCurveTo(DESIGN_WIDTH * f + (i ? -5 : 8), 240, DESIGN_WIDTH * f + (i ? 11 : -3), 470, DESIGN_WIDTH * f + 2, DESIGN_HEIGHT);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(108,68,26,0.10)';
  });
  ctx.beginPath();
  ctx.moveTo(0, DESIGN_HEIGHT * 0.52);
  ctx.bezierCurveTo(340, DESIGN_HEIGHT * 0.52 + 5, 900, DESIGN_HEIGHT * 0.52 - 7, DESIGN_WIDTH, DESIGN_HEIGHT * 0.52);
  ctx.lineWidth = 2.2;
  ctx.stroke();
}

function drawParchmentStain(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
  g.addColorStop(0, 'rgba(168,116,48,0.05)');
  g.addColorStop(0.82, 'rgba(140,90,30,0.10)');
  g.addColorStop(1, 'rgba(140,90,30,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(146,96,36,0.13)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.82, 0.4, 4.6);
  ctx.stroke();
  ctx.restore();
}

/** A closed blob whose radius wobbles around `base`, low-frequency. */
function wobblyBlob(
  cx: number, cy: number, base: number, steps: number,
  radiusAt: (angle: number) => number,
): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (Math.PI * 2 * i) / steps;
    const rr = base * radiusAt(a);
    pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.86 });
  }
  return pts;
}

function tracePoly(ctx: CanvasRenderingContext2D, pts: Vec2[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

function drawSea(ctx: CanvasRenderingContext2D, land: Vec2[]): void {
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
  g.addColorStop(0, '#b9cabf');
  g.addColorStop(0.45, '#a9c2c2');
  g.addColorStop(1, '#8fb0b6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  // A paler shelf hugging the coast: two passes, wide then tighter.
  tracePoly(ctx, land);
  ctx.strokeStyle = 'rgba(214,232,228,0.75)';
  ctx.lineWidth = 22;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(238,248,240,0.6)';
  ctx.lineWidth = 9;
  ctx.stroke();

  // Ink coastline with a foam thread just outside it.
  tracePoly(ctx, land);
  ctx.strokeStyle = 'rgba(58,84,96,0.55)';
  ctx.lineWidth = 4.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,250,0.6)';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Wave hatching across the open water.
  for (let y = 40; y < DESIGN_HEIGHT; y += 26) {
    const row = Math.floor(y / 26);
    for (let x = 30 + (row % 2) * 22; x < DESIGN_WIDTH - 20; x += 52) {
      const n = hash2(x, y);
      if (n > 0.72) continue;
      ctx.strokeStyle = `rgba(66,104,118,${0.16 + n * 0.2})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 9, y - 4.5, x + 18, y);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,250,${0.14 + n * 0.18})`;
      ctx.beginPath();
      ctx.moveTo(x + 1, y - 1.6);
      ctx.quadraticCurveTo(x + 9, y - 5.6, x + 17, y - 1.6);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawLandMass(ctx: CanvasRenderingContext2D, land: Vec2[]): void {
  ctx.save();
  tracePoly(ctx, land);
  const g = ctx.createLinearGradient(0, 60, 0, DESIGN_HEIGHT);
  g.addColorStop(0, '#e7d9b0');
  g.addColorStop(0.55, '#dfcda0');
  g.addColorStop(1, '#cdb587');
  ctx.fillStyle = g;
  ctx.fill();

  // Sand rim, then the ink border on top.
  ctx.strokeStyle = '#e3d3a4';
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.strokeStyle = '#6b4a20';
  ctx.lineWidth = 2.6;
  ctx.stroke();

  // Interior shading band: gives the sheet a hint of relief.
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(122,86,40,0.18)';
  ctx.lineWidth = 26;
  tracePoly(ctx, land);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,252,236,0.22)';
  ctx.lineWidth = 12;
  ctx.stroke();

  // Faint terrain hatching so empty plains still read as parchment art.
  for (let i = 0; i < 900; i++) {
    const x = hash2(i, 11) * DESIGN_WIDTH;
    const y = 40 + hash2(i, 12) * (DESIGN_HEIGHT - 90);
    const a = hash2(i, 13);
    ctx.fillStyle = a > 0.5 ? 'rgba(140,104,54,0.05)' : 'rgba(108,132,74,0.05)';
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + a * 5, 1.6 + a * 2.2, a * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

function drawRiverChasm(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  const path = new Path2D();
  path.moveTo(690, 0);
  path.bezierCurveTo(640, 170, 716, 320, 648, 470);
  path.bezierCurveTo(596, 560, 668, 630, 652, 720);

  const layers: Array<[number, string]> = [
    [18, 'rgba(78,104,116,0.55)'],
    [13, '#8fb0b8'],
    [7, '#c3dbe0'],
    [3, 'rgba(255,255,255,0.5)'],
  ];
  layers.forEach(([w, color]) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.stroke(path);
  });

  // Current chevrons drawn as little V marks down the water.
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 16; i++) {
    const t = i / 16;
    const y = 40 + t * 640;
    const x = 660 + Math.sin(t * 7) * 26;
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 4);
    ctx.lineTo(x, y - 2);
    ctx.lineTo(x + 5, y + 4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMountainRanges(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  // Northern range behind levels 1–2.
  drawMountainCluster(ctx, 290, 168, 9, 44, false);
  drawMountainCluster(ctx, 486, 140, 8, 54, false);
  drawMountainCluster(ctx, 660, 190, 6, 34, false);
  // Volcanic spires behind level 5.
  drawMountainCluster(ctx, 1010, 128, 6, 66, true);
  drawMountainCluster(ctx, 1160, 150, 7, 54, true);

  ctx.font = `italic 15px ${FONT_TITLE}`;
  ctx.fillStyle = 'rgba(84,48,16,0.5)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('C R A G G Y   H O R N   P E A K S', 400, 84);
  ctx.fillText('T H E   D O O M   S P I R E S', 1092, 68);
  ctx.restore();
}

function drawMountainCluster(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  count: number,
  avgHeight: number,
  isVolcanic: boolean,
): void {
  ctx.save();
  // Back row first, larger, hazier.
  for (let pass = 1; pass >= 0; pass--) {
    for (let i = 0; i < count; i++) {
      const k = i - count / 2;
      const jitter = (hash2(i, pass * 7 + count) - 0.5) * 22;
      const mx = cx + k * avgHeight * 0.72 + jitter;
      const my = cy + (pass === 1 ? -14 : 0) + (hash2(i, pass + 3) - 0.5) * 8;
      const h = avgHeight * (0.78 + hash2(i, pass + 9) * 0.42);
      const w = h * (0.86 + hash2(i, pass + 13) * 0.2);
      const faceLight = isVolcanic ? '#c39a83' : '#dcc9a4';
      const faceDark = isVolcanic ? 'rgba(64,30,52,0.42)' : 'rgba(96,62,26,0.36)';
      const snow = isVolcanic ? 'rgba(255,214,176,0.55)' : 'rgba(255,252,240,0.85)';

      ctx.globalAlpha = pass === 1 ? 0.75 : 1;

      // Body, split down the ridge into a lit and a shaded face.
      ctx.beginPath();
      ctx.moveTo(mx, my - h);
      ctx.lineTo(mx + w, my);
      ctx.lineTo(mx - w, my);
      ctx.closePath();
      ctx.fillStyle = faceLight;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(mx, my - h);
      ctx.lineTo(mx + w, my);
      ctx.lineTo(mx, my);
      ctx.closePath();
      ctx.fillStyle = faceDark;
      ctx.fill();

      // Snow cap with a ragged bottom edge.
      const capH = h * 0.3;
      const capW = w * 0.3;
      ctx.beginPath();
      ctx.moveTo(mx, my - h);
      ctx.lineTo(mx + capW, my - h + capH);
      ctx.lineTo(mx + capW * 0.45, my - h + capH * 0.72);
      ctx.lineTo(mx, my - h + capH * 1.08);
      ctx.lineTo(mx - capW * 0.5, my - h + capH * 0.74);
      ctx.lineTo(mx - capW, my - h + capH);
      ctx.closePath();
      ctx.fillStyle = snow;
      ctx.fill();

      // Ink silhouette + ridge line.
      ctx.strokeStyle = '#5c3a18';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(mx - w, my);
      ctx.lineTo(mx, my - h);
      ctx.lineTo(mx + w, my);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx, my - h);
      ctx.lineTo(mx + 4, my);
      ctx.strokeStyle = 'rgba(70,42,16,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawForestPatches(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  drawTreeCluster(ctx, 356, 246, 22, '#4f7a3a');
  drawTreeCluster(ctx, 466, 300, 18, '#456d32');
  drawTreeCluster(ctx, 250, 300, 12, '#527f3c');
  drawTreeCluster(ctx, 836, 246, 16, '#465545');
  drawTreeCluster(ctx, 946, 372, 20, '#3b4a37');
  ctx.restore();
}

function drawTreeCluster(ctx: CanvasRenderingContext2D, cx: number, cy: number, count: number, color: string): void {
  for (let i = 0; i < count; i++) {
    const tx = cx + (hash2(i, count) - 0.5) * 108;
    const ty = cy + (hash2(i, count + 41) - 0.5) * 78;
    const r = 8 + hash2(i, count + 77) * 5;

    // Trunk
    ctx.strokeStyle = '#523218';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx, ty + 7);
    ctx.stroke();

    // Two-lobe canopy: lit side then shaded side.
    ctx.beginPath();
    ctx.arc(tx - r * 0.34, ty - 3, r * 0.86, 0, Math.PI * 2);
    ctx.arc(tx + r * 0.42, ty - 1, r * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(tx + r * 0.34, ty + 1.4, r * 0.66, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(28,42,20,0.34)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(tx - r * 0.5, ty - r * 0.52, r * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,230,0.22)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(tx - r * 0.2, ty - 3, r * 0.95, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(34,48,24,0.75)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawCompassRose(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(122,78,34,0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 8; i++) {
    const ang = (Math.PI * 2 * i) / 8 - Math.PI / 2;
    const cardinal = i % 2 === 0;
    const len = cardinal ? r * 0.92 : r * 0.6;
    const halfW = cardinal ? 9 : 6;
    const tipX = cx + Math.cos(ang) * len;
    const tipY = cy + Math.sin(ang) * len;
    const p = ang + Math.PI / 2;
    const hx = Math.cos(p) * halfW;
    const hy = Math.sin(p) * halfW;

    // Two-tone point: lit half + shaded half.
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(cx + hx, cy + hy);
    ctx.closePath();
    ctx.fillStyle = cardinal ? '#8f2b1e' : '#6b431e';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(cx - hx, cy - hy);
    ctx.closePath();
    ctx.fillStyle = cardinal ? GOLD : '#cbb596';
    ctx.fill();

    ctx.strokeStyle = 'rgba(60,34,12,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - hx, cy - hy);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(cx + hx, cy + hy);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fillStyle = GOLD_HI;
  ctx.fill();
  ctx.strokeStyle = '#5c3a18';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.font = `bold 14px ${FONT_TITLE}`;
  ctx.fillStyle = '#5a2d12';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', cx, cy - r - 13);
  ctx.fillText('S', cx, cy + r + 13);
  ctx.fillText('E', cx + r + 14, cy);
  ctx.fillText('W', cx - r - 14, cy);
  ctx.restore();
}

function drawSeaMonster(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.strokeStyle = '#3f5866';
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(78,106,122,0.22)';

  // Three coils breaching, each with a white water collar.
  [[-34, 18, 0.55], [12, 26, 0.8], [62, 20, 0.65]].forEach(([ox, rr, al]) => {
    ctx.globalAlpha = al;
    ctx.beginPath();
    ctx.arc(cx + ox, cy + 6, rr, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx + ox - rr, cy + 6);
    ctx.quadraticCurveTo(cx + ox, cy - 3, cx + ox + rr, cy + 6);
    ctx.stroke();
    ctx.strokeStyle = '#3f5866';
    ctx.lineWidth = 2;
  });
  ctx.globalAlpha = 1;

  // Serpent head
  ctx.beginPath();
  ctx.moveTo(cx + 50, cy - 16);
  ctx.quadraticCurveTo(cx + 62, cy - 54, cx + 84, cy - 48);
  ctx.lineTo(cx + 98, cy - 46);
  ctx.quadraticCurveTo(cx + 92, cy - 34, cx + 84, cy - 28);
  ctx.quadraticCurveTo(cx + 74, cy - 16, cx + 66, cy - 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Horn, eye and fangs
  ctx.beginPath();
  ctx.moveTo(cx + 66, cy - 44);
  ctx.lineTo(cx + 60, cy - 62);
  ctx.lineTo(cx + 76, cy - 50);
  ctx.closePath();
  ctx.fillStyle = '#6d261b';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 88, cy - 42, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f5efe0';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx + 92, cy - 38);
  ctx.lineTo(cx + 89, cy - 30);
  ctx.moveTo(cx + 84, cy - 36);
  ctx.lineTo(cx + 81, cy - 28);
  ctx.stroke();

  // Splash rings on the water
  ctx.strokeStyle = 'rgba(255,255,255,0.42)';
  ctx.lineWidth = 1.2;
  [-22, 34, 74].forEach(ox => {
    ctx.beginPath();
    ctx.ellipse(cx + ox, cy + 9, 20, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
}

function drawCartographerNote(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `italic 13px ${FONT_TITLE}`;
  ctx.fillStyle = 'rgba(80,50,20,0.6)';
  ctx.fillText('Realm of Valoria  •  Royal Cartographer Sir Ethan', DESIGN_WIDTH - 42, DESIGN_HEIGHT - 34);
  ctx.strokeStyle = 'rgba(80,50,20,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(DESIGN_WIDTH - 340, DESIGN_HEIGHT - 28);
  ctx.lineTo(DESIGN_WIDTH - 42, DESIGN_HEIGHT - 28);
  ctx.stroke();
  ctx.restore();
}

function drawBurnedMapFrame(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  const g = ctx.createRadialGradient(
    DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, DESIGN_HEIGHT * 0.36,
    DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, DESIGN_WIDTH * 0.74,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.72, 'rgba(64,32,10,0.16)');
  g.addColorStop(1, 'rgba(28,13,4,0.72)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  // Scorched, uneven border.
  ctx.fillStyle = 'rgba(40,20,8,0.34)';
  for (let i = 0; i < 220; i++) {
    const t = i / 220;
    const edge = i % 4;
    let x = 0;
    let y = 0;
    if (edge === 0) { x = t * DESIGN_WIDTH; y = hash2(i, 5) * 26; }
    else if (edge === 1) { x = t * DESIGN_WIDTH; y = DESIGN_HEIGHT - hash2(i, 6) * 26; }
    else if (edge === 2) { x = hash2(i, 7) * 26; y = t * DESIGN_HEIGHT; }
    else { x = DESIGN_WIDTH - hash2(i, 8) * 26; y = t * DESIGN_HEIGHT; }
    ctx.beginPath();
    ctx.arc(x, y, 6 + hash2(i, 9) * 14, 0, Math.PI * 2);
    ctx.fill();
  }

  // Double ink rule with corner bosses.
  ctx.strokeStyle = '#5a3818';
  ctx.lineWidth = 2.4;
  ctx.strokeRect(17, 17, DESIGN_WIDTH - 34, DESIGN_HEIGHT - 34);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(90,56,24,0.75)';
  ctx.strokeRect(24, 24, DESIGN_WIDTH - 48, DESIGN_HEIGHT - 48);

  [[24, 24], [DESIGN_WIDTH - 24, 24], [24, DESIGN_HEIGHT - 24], [DESIGN_WIDTH - 24, DESIGN_HEIGHT - 24]]
    .forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#6b431e';
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - 1.6, y - 1.6, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = GOLD_HI;
      ctx.fill();
    });
  ctx.restore();
}

// ─── Dynamic world map layer ─────────────────────────────────────

function drawAnimatedSeaDetails(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.save();
  // Slow glints travelling across the water.
  for (let i = 0; i < 9; i++) {
    const x = 120 + i * 132 + Math.sin(time * 0.7 + i * 1.3) * 22;
    const y = 96 + (i % 4) * 168 + Math.cos(time * 0.5 + i) * 10;
    const w = 16 + (i % 3) * 9;
    ctx.strokeStyle = `rgba(255,255,255,${0.10 + (i % 3) * 0.05})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
  }

  // Surf foam pulsing along the southern shore.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 24; i++) {
    const x = 40 + i * 52;
    const base = 688 + Math.sin(i * 1.7) * 22;
    const pulse = (Math.sin(time * 1.6 + i * 0.9) + 1) * 0.5;
    ctx.globalAlpha = 0.16 + pulse * 0.4;
    ctx.beginPath();
    ctx.moveTo(x, base + 6 + pulse * 5);
    ctx.quadraticCurveTo(x + 13, base - 3 + pulse * 5, x + 26, base + 6 + pulse * 5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** The campaign road: a red-and-gold ribbon with a marching dash. */
function drawCampaignPath(ctx: CanvasRenderingContext2D, levels: LevelData[], save: SaveData, time: number): void {
  const nodes = getLevelNodePositions(levels.length);
  ctx.save();
  ctx.lineCap = 'round';

  for (let i = 0; i < nodes.length - 1; i++) {
    const p1 = nodes[i];
    const p2 = nodes[i + 1];
    const unlocked = i === 0 || !!save.levelStars[levels[i].id];
    const cpx = (p1.x + p2.x) / 2 + Math.sin(i * 2.1) * 24;
    const cpy = (p1.y + p2.y) / 2 - 46;

    const ribbon = buildRibbon(p1, { x: cpx, y: cpy }, p2, 72);
    const path = new Path2D();
    path.moveTo(p1.x, p1.y);
    path.quadraticCurveTo(cpx, cpy, p2.x, p2.y);

    // Cast shadow under the road.
    ctx.save();
    ctx.translate(2, 5);
    ctx.fillStyle = 'rgba(58,32,10,0.28)';
    ctx.fill(ribbon);
    ctx.restore();

    // Ribbon plate.
    const band = ctx.createLinearGradient(0, p1.y - 40, 0, p2.y + 40);
    band.addColorStop(0, unlocked ? '#d0533c' : '#8a7f74');
    band.addColorStop(0.5, unlocked ? '#b03426' : '#6f665d');
    band.addColorStop(1, unlocked ? '#7d1f16' : '#544c45');
    ctx.fillStyle = band;
    ctx.fill(ribbon);

    // Gold edging, then the ink key line.
    ctx.strokeStyle = unlocked ? GOLD : '#9c948a';
    ctx.lineWidth = 2.6;
    ctx.stroke(ribbon);
    ctx.strokeStyle = 'rgba(46,24,10,0.75)';
    ctx.lineWidth = 1.1;
    ctx.stroke(ribbon);

    // Marching highlight dashes: the army on the move.
    ctx.save();
    ctx.setLineDash([11, 15]);
    ctx.lineDashOffset = unlocked ? -time * 26 : 0;
    ctx.strokeStyle = unlocked ? 'rgba(255,236,180,0.72)' : 'rgba(226,220,210,0.4)';
    ctx.lineWidth = 2.4;
    ctx.stroke(path);
    ctx.restore();

    // Arrow head at the far end of each unlocked leg.
    if (unlocked) {
      const ang = Math.atan2(p2.y - cpy, p2.x - cpx) * 0.5 + Math.atan2(p2.y - p1.y, p2.x - p1.x) * 0.5;
      ctx.save();
      ctx.translate((p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 26);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-7, -7);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-7, 7);
      ctx.closePath();
      ctx.fillStyle = GOLD_HI;
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,34,12,0.8)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();
}

/** Sample a quadratic curve into a closed band of the given thickness. */
function buildRibbon(p1: Vec2, cp: Vec2, p2: Vec2, thickness: number): Path2D {
  const steps = 22;
  const half = thickness / 2;
  const left: Vec2[] = [];
  const right: Vec2[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * cp.x + t * t * p2.x;
    const y = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * cp.y + t * t * p2.y;
    const dx = 2 * (1 - t) * (cp.x - p1.x) + 2 * t * (p2.x - cp.x);
    const dy = 2 * (1 - t) * (cp.y - p1.y) + 2 * t * (p2.y - cp.y);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    left.push({ x: x + nx * half, y: y + ny * half });
    right.push({ x: x - nx * half, y: y - ny * half });
  }

  const path = new Path2D();
  const cap = half * 0.8;
  path.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i++) path.lineTo(left[i].x, left[i].y);
  const end = left[left.length - 1];
  path.quadraticCurveTo(end.x + cap, end.y + cap, right[right.length - 1].x, right[right.length - 1].y);
  for (let i = right.length - 2; i >= 0; i--) path.lineTo(right[i].x, right[i].y);
  const start = right[0];
  path.quadraticCurveTo(start.x - cap, start.y - cap, left[0].x, left[0].y);
  path.closePath();
  return path;
}

function drawLevelStageMarker(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  stageNum: number,
  stageName: string,
  unlocked: boolean,
  stars: number,
  hovered: boolean,
  selected: boolean,
  isNextBattle: boolean,
  time: number,
): void {
  const active = hovered || selected;

  // Pulsing beacon for the current frontier.
  if (isNextBattle) {
    const pulse = (Math.sin(time * 3) + 1) * 0.5;
    ctx.save();
    ctx.strokeStyle = `rgba(255,214,102,${0.34 + pulse * 0.45})`;
    ctx.lineWidth = 3 + pulse * 4;
    ctx.beginPath();
    ctx.arc(x, y, 44 + pulse * 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,246,214,${0.16 + pulse * 0.3})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x, y, 54 + pulse * 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawNextBattleRibbon(ctx, x, y - 62, time);
  }

  // Grounded shadow + hover glow.
  ctx.save();
  ctx.fillStyle = 'rgba(28,16,6,0.34)';
  ctx.beginPath();
  ctx.ellipse(x, y + 30, 30, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  if (active && unlocked) {
    const glow = ctx.createRadialGradient(x, y, 4, x, y, 62);
    glow.addColorStop(0, 'rgba(255,224,130,0.5)');
    glow.addColorStop(0.5, 'rgba(255,204,90,0.2)');
    glow.addColorStop(1, 'rgba(255,194,70,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 62, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (unlocked) drawStageFlag(ctx, x + 20, y - 22, stars > 0, time + stageNum);

  // Marker body scales a touch and lifts on hover.
  const scale = active ? 1.12 : 1;
  const lift = active ? -2 : 0;
  const sprite = sprites.get(
    `mapnode:${unlocked ? 1 : 0}:${stars > 0 ? 1 : 0}:${active ? 1 : 0}`,
    110, 130,
    (c) => drawShieldMarker(c, 55, 66, unlocked, stars, active),
    2,
  );
  sprites.blit(ctx, sprite, x, y + 4 + lift, 110 * scale, 130 * scale);

  // Stage number / padlock bezel.
  if (unlocked) {
    ctx.save();
    ctx.font = `bold 26px ${FONT_TITLE}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(30,14,4,0.85)';
    ctx.strokeText(`${stageNum}`, x, y + 3);
    ctx.fillStyle = '#fff6d8';
    ctx.fillText(`${stageNum}`, x, y + 3);
    ctx.restore();
  } else {
    drawIcon(ctx, 'lock', x, y + 2, 30, 0.95);
  }

  // Name plate.
  ctx.save();
  ctx.font = `bold 15px ${FONT_TITLE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = 'rgba(52,28,8,0.9)';
  ctx.strokeText(stageName, x, y + 50);
  ctx.fillStyle = unlocked ? (active ? GOLD_HI : '#f4e3bd') : 'rgba(196,186,172,0.85)';
  ctx.fillText(stageName, x, y + 50);
  ctx.restore();

  // Star medal under the plate.
  if (unlocked && stars > 0) {
    ctx.save();
    ctx.translate(x, y + 71);
    const medal = sprites.get('mapmedal', 96, 44, (c) => drawStarMedal(c, 48, 22, stars), 2);
    sprites.blit(ctx, medal, 0, 0, 96, 44);
    ctx.restore();
  }
}

/** Beveled heraldic shield marker, baked per state. */
function drawShieldMarker(
  c: CanvasRenderingContext2D,
  cx: number, cy: number,
  unlocked: boolean, stars: number, active: boolean,
): void {
  const rimLight = unlocked ? (active ? '#fff0b8' : '#e6c060') : '#8d8f9a';
  const rimDark = unlocked ? '#8a5f14' : '#3f434f';
  const fieldTop = unlocked ? (stars > 0 ? '#b8352a' : '#3b5c8a') : '#4a505c';
  const fieldBottom = unlocked ? (stars > 0 ? '#6d1a13' : '#1f3358') : '#2b303a';

  // Outer metal rim with a two-tone bevel.
  c.save();
  c.translate(cx, cy);
  shieldPath(c, 0, 0, 46, 56);
  const rimGrad = c.createLinearGradient(-46, -56, 46, 56);
  rimGrad.addColorStop(0, unlocked ? GOLD_HI : '#b6bac4');
  rimGrad.addColorStop(0.45, rimLight);
  rimGrad.addColorStop(0.55, unlocked ? GOLD : '#6d727d');
  rimGrad.addColorStop(1, rimDark);
  c.fillStyle = rimGrad;
  c.fill();
  c.strokeStyle = UI_INK;
  c.lineWidth = 3.4;
  c.stroke();

  // Field.
  shieldPath(c, 0, 1, 37, 46);
  const fieldGrad = c.createLinearGradient(0, -45, 0, 47);
  fieldGrad.addColorStop(0, fieldTop);
  fieldGrad.addColorStop(0.55, fieldBottom);
  fieldGrad.addColorStop(1, '#150f1e');
  c.fillStyle = fieldGrad;
  c.fill();
  c.strokeStyle = unlocked ? GOLD : '#20242c';
  c.lineWidth = 2.4;
  c.stroke();

  if (unlocked) {
    // Chevron heraldry.
    c.beginPath();
    c.moveTo(-24, 6);
    c.lineTo(0, -12);
    c.lineTo(24, 6);
    c.lineTo(24, 18);
    c.lineTo(0, 0);
    c.lineTo(-24, 18);
    c.closePath();
    c.fillStyle = stars > 0 ? 'rgba(255,214,110,0.85)' : 'rgba(214,226,255,0.5)';
    c.fill();
    c.strokeStyle = 'rgba(40,20,8,0.6)';
    c.lineWidth = 1.4;
    c.stroke();
  } else {
    // A crack across a fallen shield.
    c.beginPath();
    c.moveTo(-14, -30);
    c.lineTo(-4, -12);
    c.lineTo(-12, 2);
    c.lineTo(2, 20);
    c.strokeStyle = 'rgba(16,14,20,0.7)';
    c.lineWidth = 2;
    c.stroke();
  }

  // Rivets on the rim.
  [[-30, -22], [30, -22], [0, 42]].forEach(([rx, ry]) => {
    c.beginPath();
    c.arc(rx, ry, 4, 0, Math.PI * 2);
    c.fillStyle = unlocked ? GOLD_HI : '#9aa0ac';
    c.fill();
    c.strokeStyle = UI_INK;
    c.lineWidth = 1.8;
    c.stroke();
  });

  // Highlight along the top-left rim.
  c.beginPath();
  c.moveTo(-40, -18);
  c.quadraticCurveTo(-34, -48, 0, -54);
  c.strokeStyle = 'rgba(255,252,236,0.55)';
  c.lineWidth = 2.6;
  c.stroke();
  c.restore();
}

function shieldPath(c: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number): void {
  c.beginPath();
  c.moveTo(cx - w, cy - h * 0.7);
  c.lineTo(cx + w, cy - h * 0.7);
  c.lineTo(cx + w, cy + h * 0.1);
  c.quadraticCurveTo(cx + w, cy + h * 0.72, cx, cy + h);
  c.quadraticCurveTo(cx - w, cy + h * 0.72, cx - w, cy + h * 0.1);
  c.closePath();
}

/** A brass medal carrying up to three beveled stars. */
function drawStarMedal(c: CanvasRenderingContext2D, cx: number, cy: number, stars: number): void {
  const w = 44;
  const h = 16;
  c.save();
  // Backing plate.
  roundRect(c, cx - w, cy - h, w * 2, h * 2, 8);
  const plate = c.createLinearGradient(0, cy - h, 0, cy + h);
  plate.addColorStop(0, '#5a3a18');
  plate.addColorStop(0.5, '#3a2410');
  plate.addColorStop(1, '#22140a');
  c.fillStyle = plate;
  c.fill();
  c.strokeStyle = GOLD;
  c.lineWidth = 1.8;
  c.stroke();
  c.strokeStyle = 'rgba(255,244,214,0.22)';
  c.lineWidth = 1;
  roundRect(c, cx - w + 2.5, cy - h + 2.5, (w - 2.5) * 2, (h - 2.5) * 2, 6);
  c.stroke();

  for (let i = 0; i < 3; i++) {
    const on = i < stars;
    const sx = cx - 15 + i * 15;
    const r = 6.6;
    starPath(c, sx, cy, r);
    if (on) {
      const g = c.createLinearGradient(sx, cy - r, sx, cy + r);
      g.addColorStop(0, '#fff6cf');
      g.addColorStop(0.5, GOLD);
      g.addColorStop(1, '#a9741a');
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = UI_INK;
      c.lineWidth = 1.4;
      c.stroke();
      c.beginPath();
      c.arc(sx - 1.6, cy - 2, 1.4, 0, Math.PI * 2);
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.fill();
    } else {
      c.fillStyle = 'rgba(24,16,10,0.6)';
      c.fill();
      c.strokeStyle = 'rgba(180,150,90,0.45)';
      c.lineWidth = 1.2;
      c.stroke();
    }
  }
  c.restore();
}

function starPath(c: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI * i) / 5 - Math.PI / 2;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
}

function drawStageFlag(ctx: CanvasRenderingContext2D, px: number, py: number, victory: boolean, t: number): void {
  ctx.save();
  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px, py + 24);
  ctx.lineTo(px, py - 30);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,200,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px - 1, py + 22);
  ctx.lineTo(px - 1, py - 28);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(px, py - 31, 4, 0, Math.PI * 2);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.strokeStyle = UI_INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Wavy swallowtail pennant.
  const flap = Math.sin(t * 4) * 4;
  ctx.beginPath();
  ctx.moveTo(px, py - 28);
  ctx.quadraticCurveTo(px + 13 + flap, py - 26, px + 26 + flap, py - 23);
  ctx.lineTo(px + 19 + flap * 0.7, py - 14);
  ctx.lineTo(px + 26 + flap, py - 5);
  ctx.quadraticCurveTo(px + 13, py - 7, px, py - 5);
  ctx.closePath();
  const g = ctx.createLinearGradient(px, py - 28, px + 26, py - 5);
  if (victory) {
    g.addColorStop(0, '#63c46a');
    g.addColorStop(1, '#1d6b32');
  } else {
    g.addColorStop(0, '#e2604c');
    g.addColorStop(1, '#8d2019');
  }
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,8,0.75)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

function drawNextBattleRibbon(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const bounce = Math.sin(time * 4) * 3;
  const w = 118;
  const h = 26;
  ctx.save();
  ctx.translate(x, y + bounce);

  // Swallowtail ends.
  [-1, 1].forEach(dir => {
    ctx.beginPath();
    ctx.moveTo(dir * (w / 2 - 1), -h / 2 + 1);
    ctx.lineTo(dir * (w / 2 + 15), 0);
    ctx.lineTo(dir * (w / 2 - 1), h / 2 - 1);
    ctx.closePath();
    ctx.fillStyle = BLOOD_DARK;
    ctx.fill();
    ctx.strokeStyle = UI_INK;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  });

  // Velvet banner body.
  roundRect(ctx, -w / 2, -h / 2, w, h, 5);
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#d8503a');
  g.addColorStop(0.5, BLOOD);
  g.addColorStop(1, BLOOD_DARK);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,206,0.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, -w / 2 + 2.5, -h / 2 + 2.5, w - 5, h - 5, 3);
  ctx.stroke();

  drawIcon(ctx, 'hammer', -42, 0, 17);
  ctx.font = `bold 12px ${FONT_TITLE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(24,10,4,0.8)';
  ctx.fillText('NEXT BATTLE', 9, 1.6);
  ctx.fillStyle = '#fff4dc';
  ctx.fillText('NEXT BATTLE', 8, 0);
  ctx.restore();
}

// ─── Shared 9-slice chrome (baked wood / parchment / metal) ──────

interface FrameState {
  hover?: boolean;
  press?: boolean;
  disabled?: boolean;
  selected?: boolean;
}

function stateKey(st: FrameState): string {
  return `${st.hover ? 'h' : '-'}${st.press ? 'p' : '-'}${st.disabled ? 'd' : '-'}${st.selected ? 's' : '-'}`;
}

/**
 * The workhorse panel: baked wood plank with a two-tone gold bevel,
 * inner highlight, grain and corner rivets. `ctx` stays in design space —
 * the sprite is baked at 2× and blitted down, which is what keeps the
 * bevels smooth instead of aliased.
 */
function drawFrame(
  ctx: CanvasRenderingContext2D,
  key: string,
  x: number, y: number, w: number, h: number,
  st: FrameState = {},
): void {
  const sprite = sprites.get(`frame:${key}:${Math.round(w)}x${Math.round(h)}:${stateKey(st)}`,
    Math.round(w), Math.round(h),
    (c, cw, ch) => paintWoodFrame(c, cw, ch, st),
    2);
  const dy = st.press ? 2 : 0;
  sprites.blit(ctx, sprite, x + w / 2, y + h / 2 + dy, w, h);
}

function paintWoodFrame(c: CanvasRenderingContext2D, w: number, h: number, st: FrameState): void {
  const r = Math.min(9, h * 0.28);
  const pad = 2;

  // Outer dark rim.
  roundRect(c, 1, 1, w - 2, h - 2, r);
  c.fillStyle = st.disabled ? '#2a2530' : UI_INK;
  c.fill();

  // Two-tone gold bevel.
  roundRect(c, pad, pad, w - pad * 2, h - pad * 2, r - 1);
  const bevel = c.createLinearGradient(0, 0, w, h);
  if (st.disabled) {
    bevel.addColorStop(0, '#6c6a72');
    bevel.addColorStop(0.5, '#4d4b55');
    bevel.addColorStop(1, '#33313a');
  } else if (st.press) {
    bevel.addColorStop(0, GOLD_DARK);
    bevel.addColorStop(0.5, '#a97c22');
    bevel.addColorStop(1, GOLD_HI);
  } else {
    bevel.addColorStop(0, st.hover ? '#fff6d2' : GOLD_HI);
    bevel.addColorStop(0.42, st.hover ? GOLD_HI : GOLD);
    bevel.addColorStop(0.58, GOLD_DARK);
    bevel.addColorStop(1, '#5e3f0d');
  }
  c.fillStyle = bevel;
  c.fill();

  // Wood face.
  const inset = 4.5;
  roundRect(c, pad + inset, pad + inset, w - (pad + inset) * 2, h - (pad + inset) * 2, Math.max(2, r - 4));
  const face = c.createLinearGradient(0, pad + inset, 0, h - pad - inset);
  if (st.disabled) {
    face.addColorStop(0, '#4c4a52');
    face.addColorStop(0.55, '#3d3b44');
    face.addColorStop(1, '#2c2a32');
  } else if (st.press) {
    face.addColorStop(0, '#4a2b11');
    face.addColorStop(0.55, '#3c220c');
    face.addColorStop(1, '#2a1607');
  } else if (st.hover) {
    face.addColorStop(0, '#b57c33');
    face.addColorStop(0.5, '#8f5b24');
    face.addColorStop(1, '#5b3714');
  } else if (st.selected) {
    face.addColorStop(0, '#c58c3c');
    face.addColorStop(0.5, '#9c6528');
    face.addColorStop(1, '#653e16');
  } else {
    face.addColorStop(0, WOOD_HI);
    face.addColorStop(0.5, WOOD);
    face.addColorStop(1, WOOD_DARK);
  }
  c.fillStyle = face;
  c.fill();

  // Grain + inner highlight + inner shadow.
  c.save();
  roundRect(c, pad + inset, pad + inset, w - (pad + inset) * 2, h - (pad + inset) * 2, Math.max(2, r - 4));
  c.clip();
  paintGrain(c, w, h, st.disabled ? 0.1 : 0.16);

  const topSheen = c.createLinearGradient(0, pad + inset, 0, pad + inset + Math.max(7, h * 0.42));
  topSheen.addColorStop(0, `rgba(255,246,214,${st.press ? 0.1 : 0.3})`);
  topSheen.addColorStop(1, 'rgba(255,246,214,0)');
  c.fillStyle = topSheen;
  c.fillRect(0, 0, w, h);

  const bottomShade = c.createLinearGradient(0, h - pad - inset - Math.max(7, h * 0.4), 0, h - pad - inset);
  bottomShade.addColorStop(0, 'rgba(24,12,4,0)');
  bottomShade.addColorStop(1, 'rgba(24,12,4,0.42)');
  c.fillStyle = bottomShade;
  c.fillRect(0, 0, w, h);
  c.restore();

  // Inner bright key line, then a dark key line, both inside the bevel.
  roundRect(c, pad + inset, pad + inset, w - (pad + inset) * 2, h - (pad + inset) * 2, Math.max(2, r - 4));
  c.strokeStyle = st.disabled ? 'rgba(180,180,190,0.25)' : 'rgba(255,240,200,0.42)';
  c.lineWidth = 1.4;
  c.stroke();

  // A lit inset ring marks the active / latched state.
  if (st.selected && !st.disabled) {
    roundRect(c, pad + inset + 2, pad + inset + 2, w - (pad + inset + 2) * 2, h - (pad + inset + 2) * 2, Math.max(2, r - 6));
    c.strokeStyle = 'rgba(255,222,132,0.55)';
    c.lineWidth = 1.6;
    c.stroke();
  }

  // Rivets in the four corners, but only when the panel is big enough.
  if (w >= 56 && h >= 28) {
    const rx = 9;
    const ry = 9;
    [[rx, ry], [w - rx, ry], [rx, h - ry], [w - rx, h - ry]].forEach(([px, py], i) => {
      const bright = (i === 0 || i === 3) && !st.press;
      c.beginPath();
      c.arc(px, py, Math.min(3.2, h * 0.075), 0, Math.PI * 2);
      c.fillStyle = st.disabled ? '#71717c' : (bright ? GOLD_HI : '#c79a3a');
      c.fill();
      c.strokeStyle = 'rgba(30,16,4,0.7)';
      c.lineWidth = 1.2;
      c.stroke();
    });
  }
}

/** Wood grain: deterministic knots and streaks, stable across bakes. */
function paintGrain(c: CanvasRenderingContext2D, w: number, h: number, alpha: number): void {
  c.lineCap = 'round';
  const lines = Math.max(4, Math.round(h / 5));
  for (let i = 0; i < lines; i++) {
    const t = (i + 0.5) / lines;
    const y = t * h;
    c.beginPath();
    c.moveTo(-4, y);
    let x = -4;
    let yy = y;
    while (x < w + 4) {
      const step = 22 + hash2(i, x) * 34;
      const nx = x + step;
      const ny = y + (hash2(i, x + 7) - 0.5) * 4.2;
      c.quadraticCurveTo((x + nx) / 2, yy - 2.2, nx, ny);
      x = nx;
      yy = ny;
    }
    c.strokeStyle = i % 3 === 0
      ? `rgba(255,232,182,${alpha * 0.5})`
      : `rgba(44,22,6,${alpha})`;
    c.lineWidth = i % 3 === 0 ? 1 : 1.6;
    c.stroke();
  }

  for (let i = 0; i < 3; i++) {
    const kx = (0.18 + hash2(i, 21) * 0.64) * w;
    const ky = (0.22 + hash2(i, 22) * 0.56) * h;
    c.beginPath();
    c.ellipse(kx, ky, 7 + hash2(i, 23) * 7, 3 + hash2(i, 24) * 2.6, 0, 0, Math.PI * 2);
    c.strokeStyle = `rgba(40,20,6,${alpha * 0.85})`;
    c.lineWidth = 1.3;
    c.stroke();
    c.beginPath();
    c.ellipse(kx, ky, 4 + hash2(i, 25) * 3, 1.6, 0, 0, Math.PI * 2);
    c.strokeStyle = `rgba(255,232,182,${alpha * 0.4})`;
    c.lineWidth = 1;
    c.stroke();
  }
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath();
  c.moveTo(x + rr, y);
  c.lineTo(x + w - rr, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rr);
  c.lineTo(x + w, y + h - rr);
  c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  c.lineTo(x + rr, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rr);
  c.lineTo(x, y + rr);
  c.quadraticCurveTo(x, y, x + rr, y);
  c.closePath();
}

/** Parchment sheet used by every modal, baked per size. */
function drawParchmentModal(
  ctx: CanvasRenderingContext2D,
  key: string,
  x: number, y: number, w: number, h: number,
): void {
  const sprite = sprites.get(`parch:${key}:${Math.round(w)}x${Math.round(h)}`, Math.round(w), Math.round(h),
    (c, cw, ch) => paintParchmentSheet(c, cw, ch), 2);
  sprites.blit(ctx, sprite, x + w / 2, y + h / 2, w, h);
}

function paintParchmentSheet(c: CanvasRenderingContext2D, w: number, h: number): void {
  // Cast shadow.
  c.save();
  c.shadowColor = 'rgba(12,6,2,0.6)';
  c.shadowBlur = 22;
  c.shadowOffsetY = 8;
  roundRect(c, 3, 3, w - 6, h - 6, 8);
  c.fillStyle = PARCHMENT;
  c.fill();
  c.restore();

  // Aged paper body.
  const body = c.createLinearGradient(0, 0, w * 0.4, h);
  body.addColorStop(0, PARCHMENT_HI);
  body.addColorStop(0.5, PARCHMENT);
  body.addColorStop(1, PARCHMENT_DARK);
  roundRect(c, 3, 3, w - 6, h - 6, 8);
  c.fillStyle = body;
  c.fill();

  c.save();
  roundRect(c, 3, 3, w - 6, h - 6, 8);
  c.clip();

  // Corner staining.
  const corner = c.createRadialGradient(0, 0, 10, 0, 0, Math.max(w, h) * 0.75);
  corner.addColorStop(0, 'rgba(160,110,44,0.22)');
  corner.addColorStop(1, 'rgba(160,110,44,0)');
  c.fillStyle = corner;
  c.fillRect(0, 0, w, h);
  const corner2 = c.createRadialGradient(w, h, 10, w, h, Math.max(w, h) * 0.7);
  corner2.addColorStop(0, 'rgba(150,100,40,0.2)');
  corner2.addColorStop(1, 'rgba(150,100,40,0)');
  c.fillStyle = corner2;
  c.fillRect(0, 0, w, h);

  for (let i = 0; i < 700; i++) {
    const px = hash2(i, 31) * w;
    const py = hash2(i, 32) * h;
    const a = hash2(i, 33);
    c.fillStyle = a > 0.5 ? 'rgba(126,90,42,0.05)' : 'rgba(255,250,232,0.06)';
    c.fillRect(px, py, 1 + a * 1.6, 1 + a * 1.4);
  }
  c.restore();

  // Double rule frame.
  roundRect(c, 6, 6, w - 12, h - 12, 6);
  c.strokeStyle = '#9a6b31';
  c.lineWidth = 2.4;
  c.stroke();
  roundRect(c, 11, 11, w - 22, h - 22, 4);
  c.strokeStyle = 'rgba(154,107,49,0.5)';
  c.lineWidth = 1;
  c.stroke();

  roundRect(c, 3, 3, w - 6, h - 6, 8);
  c.strokeStyle = 'rgba(74,44,16,0.85)';
  c.lineWidth = 1.6;
  c.stroke();
}

/** A wooden dowel, as used at the top and bottom of the briefing scroll. */
function drawDowel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, key: string): void {
  const sprite = sprites.get(`dowel:${key}:${Math.round(w)}x${Math.round(h)}`, Math.round(w), Math.round(h),
    (c, cw, ch) => paintDowel(c, cw, ch), 2);
  sprites.blit(ctx, sprite, x + w / 2, y + h / 2, w, h);
}

function paintDowel(c: CanvasRenderingContext2D, w: number, h: number): void {
  const r = h / 2;
  c.save();
  c.shadowColor = 'rgba(10,5,2,0.55)';
  c.shadowBlur = 10;
  c.shadowOffsetY = 4;
  roundRect(c, 1, 1, w - 2, h - 2, r);
  c.fillStyle = WOOD_DARK;
  c.fill();
  c.restore();

  roundRect(c, 1, 1, w - 2, h - 2, r);
  const g = c.createLinearGradient(0, 1, 0, h - 1);
  g.addColorStop(0, '#93602b');
  g.addColorStop(0.28, '#6d4319');
  g.addColorStop(0.62, '#4e2e11');
  g.addColorStop(1, '#2c1807');
  c.fillStyle = g;
  c.fill();

  c.save();
  roundRect(c, 1, 1, w - 2, h - 2, r);
  c.clip();
  paintGrain(c, w, h, 0.14);
  c.fillStyle = 'rgba(255,240,206,0.18)';
  c.fillRect(0, 2, w, Math.max(1, h * 0.18));
  c.restore();

  roundRect(c, 1, 1, w - 2, h - 2, r);
  c.strokeStyle = 'rgba(24,12,4,0.8)';
  c.lineWidth = 1.6;
  c.stroke();

  // Brass end caps with a highlight.
  [0, w - 16].forEach(cx => {
    roundRect(c, cx + 1, 2, 14, h - 4, 5);
    const cap = c.createLinearGradient(cx, 0, cx + 16, h);
    cap.addColorStop(0, GOLD_HI);
    cap.addColorStop(0.5, GOLD);
    cap.addColorStop(1, GOLD_DARK);
    c.fillStyle = cap;
    c.fill();
    c.strokeStyle = 'rgba(60,34,10,0.8)';
    c.lineWidth = 1.2;
    c.stroke();
  });
}

/** A wax seal impressed with a crown. */
function drawWaxSeal(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, key: string): void {
  const sprite = sprites.get(`seal:${key}:${Math.round(r)}`, r * 2, r * 2,
    (c, cw) => paintWaxSeal(c, cw / 2, cw / 2, cw / 2 - 1), 2);
  sprites.blit(ctx, sprite, cx, cy, r * 2, r * 2);
}

function paintWaxSeal(c: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  // Dribbled wax edge.
  c.beginPath();
  for (let i = 0; i < 18; i++) {
    const a = (Math.PI * 2 * i) / 18;
    const rr = r * (0.92 + hash2(i, 51) * 0.12);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
  const g = c.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.15, cx, cy, r);
  g.addColorStop(0, '#e05a45');
  g.addColorStop(0.45, '#ae2a1e');
  g.addColorStop(1, '#66140f');
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = 'rgba(40,10,6,0.8)';
  c.lineWidth = 2;
  c.stroke();

  c.beginPath();
  c.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
  c.strokeStyle = 'rgba(255,190,170,0.35)';
  c.lineWidth = 1.6;
  c.stroke();
  c.beginPath();
  c.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
  c.strokeStyle = 'rgba(60,12,8,0.5)';
  c.lineWidth = 1.4;
  c.stroke();

  // Crown impression.
  const s = r * 0.4;
  c.beginPath();
  c.moveTo(cx - s, cy + s * 0.55);
  c.lineTo(cx + s, cy + s * 0.55);
  c.lineTo(cx + s * 1.15, cy - s * 0.6);
  c.lineTo(cx + s * 0.55, cy - s * 0.05);
  c.lineTo(cx, cy - s * 0.85);
  c.lineTo(cx - s * 0.55, cy - s * 0.05);
  c.lineTo(cx - s * 1.15, cy - s * 0.6);
  c.closePath();
  c.fillStyle = 'rgba(255,214,150,0.85)';
  c.fill();
  c.strokeStyle = 'rgba(70,16,10,0.7)';
  c.lineWidth = 1.2;
  c.stroke();
}

/** A star medal row (used by the briefing to show the earned rating). */
function drawStarRow(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, filled: number): void {
  for (let i = 0; i < 3; i++) {
    const sx = cx - r * 2.6 + i * r * 2.6;
    const on = i < filled;
    const sprite = sprites.get(`star:${on ? 1 : 0}:${Math.round(r)}`, r * 2.6, r * 2.6,
      (c, cw) => paintStar(c, cw / 2, cw / 2, cw / 2 - 2, on), 2);
    sprites.blit(ctx, sprite, sx, cy, r * 2.6, r * 2.6);
  }
}

function paintStar(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, on: boolean): void {
  starPath(c, cx, cy, r);
  if (on) {
    const g = c.createLinearGradient(cx - r * 0.6, cy - r, cx + r * 0.5, cy + r);
    g.addColorStop(0, '#fff8d8');
    g.addColorStop(0.42, GOLD);
    g.addColorStop(1, '#a9741a');
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = UI_INK;
    c.lineWidth = 2;
    c.stroke();
    c.save();
    c.clip();
    c.fillStyle = 'rgba(96,54,10,0.28)';
    c.beginPath();
    c.moveTo(cx, cy - r);
    c.lineTo(cx + r, cy);
    c.lineTo(cx, cy + r);
    c.closePath();
    c.fill();
    c.beginPath();
    c.arc(cx - r * 0.3, cy - r * 0.35, r * 0.13, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.fill();
    c.restore();
  } else {
    c.fillStyle = 'rgba(96,72,40,0.35)';
    c.fill();
    c.strokeStyle = 'rgba(70,44,18,0.7)';
    c.lineWidth = 1.8;
    c.stroke();
  }
}

// ─── Stage Briefing Scroll Modal ─────────────────────────────────

export function drawStageBriefingModal(
  ctx: CanvasRenderingContext2D,
  level: LevelData,
  stageIndex: number,
  stars: number,
  mousePos: Vec2,
  time: number,
): void {
  // Frozen geometry — game.ts hit-tests these numbers.
  const modalW = 540;
  const modalH = 430;
  const mx = (DESIGN_WIDTH - modalW) / 2;
  const my = (DESIGN_HEIGHT - modalH) / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(6,4,12,0.62)';
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  // Dowels top and bottom, then the sheet between them.
  drawDowel(ctx, mx - 26, my - 14, modalW + 52, 26, 'top');
  drawDowel(ctx, mx - 26, my + modalH - 12, modalW + 52, 26, 'bottom');
  drawParchmentModal(ctx, 'brief', mx, my, modalW, modalH);

  // Title band across the head of the scroll.
  const bandH = 52;
  roundRect(ctx, mx + 16, my + 16, modalW - 32, bandH, 7);
  const band = ctx.createLinearGradient(0, my + 16, 0, my + 16 + bandH);
  band.addColorStop(0, '#7d2420');
  band.addColorStop(0.5, '#5d1714');
  band.addColorStop(1, '#38090a');
  ctx.fillStyle = band;
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,236,190,0.3)';
  ctx.lineWidth = 1;
  roundRect(ctx, mx + 19.5, my + 19.5, modalW - 39, bandH - 7, 5);
  ctx.stroke();

  ctx.font = `bold 25px ${FONT_TITLE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const title = `Stage ${stageIndex}: ${level.name}`;
  ctx.fillStyle = 'rgba(20,6,4,0.85)';
  ctx.fillText(title, DESIGN_WIDTH / 2, my + 16 + bandH / 2 + 2);
  ctx.fillStyle = '#ffeec2';
  ctx.fillText(title, DESIGN_WIDTH / 2, my + 16 + bandH / 2);

  // Star rating medal, then the royal wax seal stamped over its corner.
  drawStarRow(ctx, DESIGN_WIDTH / 2, my + 90, 12, stars);
  drawWaxSeal(ctx, DESIGN_WIDTH / 2 + 52, my + 88, 18, 'brief');

  // Ornamental divider.
  drawDivider(ctx, mx + 60, my + 116, modalW - 120);
  drawIcon(ctx, 'hammer', mx + 44, my + 116, 17);

  // Briefing copy, wrapped to the sheet.
  const briefings: Record<string, { lore: string; enemyHint: string }> = {
    level_1: {
      lore: 'Goblin scouts have broken through our border outposts! Form a defensive perimeter.',
      enemyHint: 'Enemies: Goblins & Dire Wolves',
    },
    level_2: {
      lore: 'The enemy is pushing through the dense pine mountain pass. Beware armored Orc Warriors!',
      enemyHint: 'Enemies: Orc Warriors, Wolves & Goblins',
    },
    level_3: {
      lore: 'Hold the chasm crossing at all costs! Airborne Giant Bats are bypassing ground barricades.',
      enemyHint: 'Enemies: Giant Bats (Flying), Orc Warriors, Wolves',
    },
    level_4: {
      lore: 'The swamp waters conceal Dark Shamans who heal nearby wounded allies and colossal Trolls.',
      enemyHint: 'Enemies: Dark Shaman (AoE Heals), Trolls (Regen)',
    },
    level_5: {
      lore: 'THE FINAL STAND. The ferocious Orc Warlord leads the horde to tear down the Bastion gates!',
      enemyHint: 'BOSS BATTLE: The Orc Warlord & Vanguard Elite',
    },
  };
  const info = briefings[level.id] ?? {
    lore: 'Defend the fortress and drive back the invading hordes!',
    enemyHint: 'Multiple enemy types approaching',
  };

  ctx.font = `italic 15px ${FONT_UI}`;
  ctx.fillStyle = '#40301c';
  ctx.textAlign = 'center';
  wrapText(ctx, info.lore, DESIGN_WIDTH / 2, my + 140, modalW - 96, 20, 3);

  // Intel pills: gold / lives / waves.
  const pillsY = my + 196;
  const pillW = 150;
  drawIntelPill(ctx, mx + 30, pillsY, pillW, 44, 'gold', `${level.startingGold}`, 'Gold');
  drawIntelPill(ctx, mx + 195, pillsY, pillW, 44, 'heart', `${level.startingLives}`, 'Lives');
  drawIntelPill(ctx, mx + 360, pillsY, pillW, 44, 'wave', `${level.waves.length}`, 'Waves');

  // Enemy warning.
  ctx.font = `bold 14px ${FONT_UI}`;
  ctx.fillStyle = '#8d2019';
  ctx.textAlign = 'center';
  ctx.fillText(info.enemyHint, DESIGN_WIDTH / 2, my + 268);

  // "TO BATTLE!" — frozen at x = 640-130, y = my+320, 260 x 55.
  const btnW = 260;
  const btnH = 55;
  const btnX = DESIGN_WIDTH / 2 - btnW / 2;
  const btnY = my + 320;
  const btnHover = inRect(mousePos, btnX, btnY, btnW, btnH);
  drawActionButton(ctx, 'tobattle', btnX, btnY, btnW, btnH, 'TO BATTLE', 'hammer', { hover: btnHover });

  // Close button — frozen at (mx+modalW-32, my+22), hit radius 18.
  const closeX = mx + modalW - 32;
  const closeY = my + 22;
  drawRoundIconButton(ctx, 'briefclose', closeX, closeY, 28, 'close',
    inRect(mousePos, closeX - 18, closeY - 18, 36, 36));

  // Idle shimmer so the scroll never looks frozen.
  ctx.save();
  const sheen = ((time * 0.25) % 1) * (modalW + 200) - 100;
  ctx.globalCompositeOperation = 'lighter';
  const sheenGrad = ctx.createLinearGradient(mx + sheen - 60, my, mx + sheen + 60, my + modalH);
  sheenGrad.addColorStop(0, 'rgba(255,244,214,0)');
  sheenGrad.addColorStop(0.5, 'rgba(255,244,214,0.05)');
  sheenGrad.addColorStop(1, 'rgba(255,244,214,0)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(mx, my, modalW, modalH);
  ctx.restore();

  ctx.restore();
}

function drawDivider(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  ctx.save();
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, 'rgba(138,95,20,0)');
  g.addColorStop(0.5, 'rgba(138,95,20,0.85)');
  g.addColorStop(1, 'rgba(138,95,20,0)');
  ctx.strokeStyle = g;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  ctx.fillStyle = 'rgba(138,95,20,0.9)';
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y - 5);
  ctx.lineTo(x + w / 2 + 6, y);
  ctx.lineTo(x + w / 2, y + 5);
  ctx.lineTo(x + w / 2 - 6, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawIntelPill(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  icon: IconName, value: string, label: string,
): void {
  const sprite = sprites.get(`pill:${w}x${h}`, w, h, (c, cw, ch) => paintIntelPill(c, cw, ch), 2);
  sprites.blit(ctx, sprite, x + w / 2, y + h / 2, w, h);

  drawIcon(ctx, icon, x + 24, y + h / 2, 26);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 20px ${FONT_TITLE}`;
  ctx.fillStyle = '#3c2408';
  ctx.fillText(value, x + 44, y + h / 2 - 1);
  const vw = ctx.measureText(value).width;
  ctx.font = `12px ${FONT_UI}`;
  ctx.fillStyle = 'rgba(70,46,18,0.75)';
  ctx.fillText(label, x + 48 + vw, y + h / 2 + 2);
}

function paintIntelPill(c: CanvasRenderingContext2D, w: number, h: number): void {
  roundRect(c, 1, 1, w - 2, h - 2, 7);
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,250,232,0.95)');
  g.addColorStop(0.55, 'rgba(236,215,178,0.95)');
  g.addColorStop(1, 'rgba(206,176,130,0.95)');
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = '#8a5f14';
  c.lineWidth = 1.8;
  c.stroke();
  c.strokeStyle = 'rgba(255,255,240,0.6)';
  c.lineWidth = 1;
  roundRect(c, 3.5, 3.5, w - 7, h - 7, 5);
  c.stroke();
}

/** Carved action button: gold bevel, wood face, rivets and a shadowed label. */
function drawActionButton(
  ctx: CanvasRenderingContext2D,
  key: string,
  x: number, y: number, w: number, h: number,
  label: string,
  icon: IconName | null,
  st: FrameState,
): void {
  applyButtonState(ctx, x, y, w, h, st, () => {
    // Warm accent face so the primary action reads hotter than a menu row.
    drawFrame(ctx, key, x, y, w, h, st);

    ctx.save();
    roundRect(ctx, x + 4.5, y + 4.5, w - 9, h - 9, 5);
    const tint = ctx.createLinearGradient(0, y, 0, y + h);
    if (st.disabled) {
      tint.addColorStop(0, 'rgba(120,120,130,0.35)');
      tint.addColorStop(1, 'rgba(60,60,70,0.35)');
    } else if (st.press) {
      tint.addColorStop(0, 'rgba(120,26,16,0.5)');
      tint.addColorStop(1, 'rgba(60,10,6,0.45)');
    } else {
      tint.addColorStop(0, 'rgba(196,58,40,0.42)');
      tint.addColorStop(0.5, 'rgba(140,30,20,0.34)');
      tint.addColorStop(1, 'rgba(80,14,10,0.42)');
    }
    ctx.fillStyle = tint;
    ctx.fill();
    ctx.restore();

    if (st.hover && !st.disabled) drawSheen(ctx, x, y, w, h, 1);
    drawLabel(ctx, label, x + w / 2 + (icon ? 14 : 0), y + h / 2, Math.min(28, h * 0.46), icon, x + (icon ? 16 : 0));
  });
}

/** Round metal medallion used by the spell / call-wave controls. */
function drawMedallion(
  ctx: CanvasRenderingContext2D,
  key: string,
  cx: number, cy: number, r: number,
  icon: IconName,
  st: FrameState,
  ring?: { color: string; width: number },
): void {
  const size = r * 2;
  const sprite = sprites.get(`medal:${key}:${Math.round(r)}:${stateKey(st)}`,
    Math.round(size), Math.round(size),
    (c, cw) => paintMedallion(c, cw / 2, cw / 2 - 1, cw / 2 - 2, st), 2);
  const dy = st.press ? 2 : 0;
  sprites.blit(ctx, sprite, cx, cy + dy, size, size);

  if (ring) {
    ctx.save();
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = ring.width;
    ctx.beginPath();
    ctx.arc(cx, cy + dy, r + ring.width, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawIcon(ctx, icon, cx, cy + dy, r * 1.15, st.disabled ? 0.55 : 1);
}

function paintMedallion(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, st: FrameState): void {
  // Drop shadow under the medallion.
  c.save();
  c.shadowColor = 'rgba(8,4,2,0.6)';
  c.shadowBlur = 12;
  c.shadowOffsetY = 5;
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.fillStyle = UI_INK;
  c.fill();
  c.restore();

  // Gold bezel with a two-tone bevel.
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  const bezel = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  if (st.disabled) {
    bezel.addColorStop(0, '#7b7982');
    bezel.addColorStop(0.5, '#565460');
    bezel.addColorStop(1, '#35333c');
  } else if (st.press) {
    bezel.addColorStop(0, GOLD_DARK);
    bezel.addColorStop(0.55, '#a97c22');
    bezel.addColorStop(1, GOLD_HI);
  } else {
    bezel.addColorStop(0, st.hover ? '#fff8dc' : GOLD_HI);
    bezel.addColorStop(0.42, st.hover ? GOLD_HI : GOLD);
    bezel.addColorStop(0.62, GOLD_DARK);
    bezel.addColorStop(1, '#5c3d0c');
  }
  c.fillStyle = bezel;
  c.fill();
  c.strokeStyle = UI_INK;
  c.lineWidth = 2.4;
  c.stroke();

  // Inner disc.
  const ir = r * 0.74;
  c.beginPath();
  c.arc(cx, cy, ir, 0, Math.PI * 2);
  const disc = c.createRadialGradient(cx - ir * 0.35, cy - ir * 0.45, ir * 0.12, cx, cy, ir);
  if (st.disabled) {
    disc.addColorStop(0, '#6a6870');
    disc.addColorStop(0.6, '#45434c');
    disc.addColorStop(1, '#26242c');
  } else if (st.press) {
    disc.addColorStop(0, '#6d3a14');
    disc.addColorStop(0.6, '#4a240c');
    disc.addColorStop(1, '#2a1306');
  } else {
    disc.addColorStop(0, '#a8702c');
    disc.addColorStop(0.55, '#7c4c1c');
    disc.addColorStop(1, '#3d2110');
  }
  c.fillStyle = disc;
  c.fill();
  c.strokeStyle = 'rgba(255,238,196,0.35)';
  c.lineWidth = 1.4;
  c.stroke();

  // Rivet studs around the bezel.
  if (r >= 18) {
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8 + Math.PI / 8;
      const px = cx + Math.cos(a) * (r * 0.87);
      const py = cy + Math.sin(a) * (r * 0.87);
      c.beginPath();
      c.arc(px, py, 2.2, 0, Math.PI * 2);
      c.fillStyle = st.disabled ? '#8b8b95' : (i < 4 ? GOLD_HI : '#c19434');
      c.fill();
      c.strokeStyle = 'rgba(30,16,4,0.7)';
      c.lineWidth = 1;
      c.stroke();
    }
  }
}

/** Small round icon button (close / sound / settings). */
function drawRoundIconButton(
  ctx: CanvasRenderingContext2D,
  key: string,
  cx: number, cy: number, d: number,
  icon: IconName,
  hover: boolean,
): void {
  const r = d / 2;
  const sprite = sprites.get(`roundbtn:${key}:${Math.round(d)}:${hover ? 'h' : '-'}`,
    Math.round(d), Math.round(d),
    (c, cw) => paintRoundButton(c, cw / 2, cw / 2 - 1, cw / 2 - 2, hover), 2);
  sprites.blit(ctx, sprite, cx, cy, d, d);
  drawIcon(ctx, icon, cx, cy, r * 1.55);
}

function paintRoundButton(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, hover: boolean): void {
  c.save();
  c.shadowColor = 'rgba(8,4,2,0.55)';
  c.shadowBlur = 10;
  c.shadowOffsetY = 4;
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.fillStyle = UI_INK;
  c.fill();
  c.restore();

  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  const bezel = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  bezel.addColorStop(0, hover ? '#fff6d2' : GOLD_HI);
  bezel.addColorStop(0.45, hover ? GOLD_HI : GOLD);
  bezel.addColorStop(0.62, GOLD_DARK);
  bezel.addColorStop(1, '#54370a');
  c.fillStyle = bezel;
  c.fill();
  c.strokeStyle = UI_INK;
  c.lineWidth = 2;
  c.stroke();

  c.beginPath();
  c.arc(cx, cy, r * 0.76, 0, Math.PI * 2);
  const disc = c.createLinearGradient(0, cy - r, 0, cy + r);
  disc.addColorStop(0, hover ? '#a06a2a' : '#7d4d1c');
  disc.addColorStop(1, '#38200e');
  c.fillStyle = disc;
  c.fill();
  c.strokeStyle = 'rgba(255,238,196,0.35)';
  c.lineWidth = 1.2;
  c.stroke();
}

/** Apply a button's hover scale / press offset to a draw callback. */
function applyButtonState(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  st: FrameState,
  draw: () => void,
): void {
  if (st.disabled) {
    ctx.save();
    ctx.globalAlpha = 0.62;
    draw();
    ctx.restore();
    return;
  }
  if (st.hover && !st.press) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1.025, 1.025);
    ctx.translate(-cx, -cy);
    draw();
    ctx.restore();
    return;
  }
  draw();
}

/** Moving specular sweep across a hovered button. */
function drawSheen(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number): void {
  ctx.save();
  roundRect(ctx, x, y, w, h, 8);
  ctx.clip();
  const sx = x + w * (((Date.now() / 1400) % 1) * 1.6 - 0.3);
  const g = ctx.createLinearGradient(sx - 40, y, sx + 40, y + h);
  g.addColorStop(0, 'rgba(255,252,232,0)');
  g.addColorStop(0.5, `rgba(255,252,232,${0.28 * alpha})`);
  g.addColorStop(1, 'rgba(255,252,232,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** MedievalSharp label with a drop shadow, optionally beside an icon. */
function drawLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  cx: number, cy: number,
  size: number,
  icon?: IconName | null,
  iconX?: number,
): void {
  ctx.save();
  ctx.font = `bold ${size}px ${FONT_TITLE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (icon) drawIcon(ctx, icon, iconX ?? cx - 60, cy, size * 1.05);
  ctx.fillStyle = 'rgba(20,8,4,0.85)';
  ctx.fillText(label, cx + 1.5, cy + 2);
  ctx.fillStyle = '#fff6e0';
  ctx.fillText(label, cx, cy);
  ctx.restore();
}

/** Word-wrapped, centre-aligned italic text. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number, y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): void {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  lines.slice(0, maxLines).forEach((ln, i) => ctx.fillText(ln, cx, y + i * lineHeight));
}

function inRect(p: Vec2, x: number, y: number, w: number, h: number): boolean {
  return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
}

// ─── World map top bar ───────────────────────────────────────────

function drawWorldMapTopBar(
  ctx: CanvasRenderingContext2D,
  mousePos: Vec2,
  totalStars: number,
  audioMuted: boolean,
): void {
  const h = 64;
  drawFrame(ctx, 'mapbar', -14, -14, DESIGN_WIDTH + 28, h, {});

  // Decorative gold key line under the plank.
  ctx.save();
  const trim = ctx.createLinearGradient(0, 0, DESIGN_WIDTH, 0);
  trim.addColorStop(0, 'rgba(138,95,20,0)');
  trim.addColorStop(0.5, GOLD);
  trim.addColorStop(1, 'rgba(138,95,20,0)');
  ctx.strokeStyle = trim;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, h - 1);
  ctx.lineTo(DESIGN_WIDTH, h - 1);
  ctx.stroke();
  ctx.restore();

  // Back button — geometry frozen at x∈[20,130], y∈[10,46].
  const backHover = inRect(mousePos, 20, 10, 110, 36);
  applyButtonState(ctx, 20, 10, 110, 36, { hover: backHover }, () => {
    drawFrame(ctx, 'mapback', 20, 10, 110, 36, { hover: backHover });
    if (backHover) drawSheen(ctx, 20, 10, 110, 36, 0.8);
    drawLabel(ctx, 'MENU', 85, 28, 16, 'back', 40);
  });

  // Campaign title.
  ctx.save();
  ctx.font = `bold 26px ${FONT_TITLE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const title = 'KINGDOM CAMPAIGN';
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(18,8,2,0.9)';
  ctx.strokeText(title, DESIGN_WIDTH / 2 + 26, h / 2 + 1);
  const tg = ctx.createLinearGradient(0, h / 2 - 16, 0, h / 2 + 16);
  tg.addColorStop(0, '#fff6d0');
  tg.addColorStop(0.5, '#ffd866');
  tg.addColorStop(1, '#c8912b');
  ctx.fillStyle = tg;
  ctx.fillText(title, DESIGN_WIDTH / 2 + 26, h / 2);
  ctx.restore();
  drawIcon(ctx, 'hammer', DESIGN_WIDTH / 2 - 130, h / 2, 22);
  drawIcon(ctx, 'hammer', DESIGN_WIDTH / 2 + 182, h / 2, 22);

  // Star tally medallion.
  const starX = DESIGN_WIDTH - 236;
  drawMedallion(ctx, 'stars', starX, h / 2 - 2, 17, 'star', {});
  ctx.save();
  ctx.font = `bold 20px ${FONT_TITLE}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(20,8,2,0.85)';
  ctx.fillText(`${totalStars} / 15`, starX + 22, h / 2 + 1.5);
  ctx.fillStyle = GOLD_HI;
  ctx.fillText(`${totalStars} / 15`, starX + 21, h / 2);
  ctx.restore();

  // Sound button — geometry frozen at x∈[1280-70, 1280-20], y∈[10,46].
  const soundHover = inRect(mousePos, DESIGN_WIDTH - 70, 10, 50, 36);
  applyButtonState(ctx, DESIGN_WIDTH - 70, 10, 50, 36, { hover: soundHover }, () => {
    drawFrame(ctx, 'mapsound', DESIGN_WIDTH - 70, 10, 50, 36, { hover: soundHover });
    if (soundHover) drawSheen(ctx, DESIGN_WIDTH - 70, 10, 50, 36, 0.8);
    drawIcon(ctx, audioMuted ? 'sound_off' : 'sound_on', DESIGN_WIDTH - 45, 28, 26);
  });
}

// ─── Epic Kingdom Rush Title Screen ──────────────────────────────

export function drawEpicTitleScreen(
  ctx: CanvasRenderingContext2D,
  time: number,
  mousePos: Vec2,
  audioMuted: boolean,
  activeLoreModal: boolean,
): void {
  ctx.save();
  drawNightSky(ctx, time);
  drawMoon(ctx, DESIGN_WIDTH * 0.775, 122, time);
  drawNightClouds(ctx, time);
  drawDistantMountains(ctx);
  drawFortressRamparts(ctx, time);
  drawBrazier(ctx, 168, DESIGN_HEIGHT - 196, time);
  drawBrazier(ctx, DESIGN_WIDTH - 168, DESIGN_HEIGHT - 196, time + 2.1);
  drawFloatingEmbers(ctx, time);
  drawTitleHeraldicCrest(ctx, time);

  // "TO BATTLE" — frozen at x = 640-130, y = 720/2+80, 260 x 56.
  const playX = DESIGN_WIDTH / 2 - 130;
  const playY = DESIGN_HEIGHT / 2 + 80;
  const playHover = inRect(mousePos, playX, playY, 260, 56);
  drawActionButton(ctx, 'menubattle', playX, playY, 260, 56, 'TO BATTLE', 'hammer', { hover: playHover });

  // "BESTIARY & LORE" — frozen at x = 640-130, y = playY+68, 260 x 46.
  const loreX = DESIGN_WIDTH / 2 - 130;
  const loreY = playY + 68;
  const loreHover = inRect(mousePos, loreX, loreY, 260, 46);
  applyButtonState(ctx, loreX, loreY, 260, 46, { hover: loreHover }, () => {
    drawFrame(ctx, 'menulore', loreX, loreY, 260, 46, { hover: loreHover });
    if (loreHover) drawSheen(ctx, loreX, loreY, 260, 46, 0.8);
    ctx.save();
    roundRect(ctx, loreX + 4.5, loreY + 4.5, 260 - 9, 46 - 9, 5);
    ctx.fillStyle = 'rgba(64,40,14,0.28)';
    ctx.fill();
    ctx.restore();
    drawLabel(ctx, 'BESTIARY & LORE', loreX + 130 + 13, loreY + 23, 17, 'info', loreX + 30);
  });

  // Sound toggle — frozen at x∈[1280-80, 1280-24], y∈[20,60].
  const soundHover = inRect(mousePos, DESIGN_WIDTH - 80, 20, 56, 40);
  applyButtonState(ctx, DESIGN_WIDTH - 80, 20, 56, 40, { hover: soundHover }, () => {
    drawFrame(ctx, 'menusound', DESIGN_WIDTH - 80, 20, 56, 40, { hover: soundHover });
    if (soundHover) drawSheen(ctx, DESIGN_WIDTH - 80, 20, 56, 40, 0.8);
    drawIcon(ctx, audioMuted ? 'sound_off' : 'sound_on', DESIGN_WIDTH / 2 - 52 + 0, 40, 28);
  });

  // Version ribbon.
  ctx.save();
  ctx.font = `13px ${FONT_UI}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(10,6,4,0.6)';
  ctx.fillRect(DESIGN_WIDTH / 2 - 230, DESIGN_HEIGHT - 36, 460, 26);
  ctx.fillStyle = 'rgba(255,246,214,0.5)';
  ctx.fillText('v1.0 Kingdom Edition  •  Built with Procedural Canvas & Web Audio', DESIGN_WIDTH / 2, DESIGN_HEIGHT - 18);
  ctx.restore();

  if (activeLoreModal) drawLoreBestiaryModal(ctx, mousePos);

  ctx.restore();
}

function drawNightSky(ctx: CanvasRenderingContext2D, time: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
  sky.addColorStop(0, '#05070f');
  sky.addColorStop(0.32, '#0d1526');
  sky.addColorStop(0.62, '#1b2740');
  sky.addColorStop(0.82, '#2a3350');
  sky.addColorStop(1, '#131a2c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  // Aurora-ish warm glow behind the crest.
  const glow = ctx.createRadialGradient(DESIGN_WIDTH / 2, 210, 30, DESIGN_WIDTH / 2, 210, 420);
  glow.addColorStop(0, 'rgba(255,196,110,0.16)');
  glow.addColorStop(0.5, 'rgba(140,110,200,0.08)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, DESIGN_WIDTH, 520);

  // Two layers of stars with a slow twinkle.
  for (let layer = 0; layer < 2; layer++) {
    const count = layer === 0 ? 150 : 70;
    for (let i = 0; i < count; i++) {
      const x = hash2(i, layer * 3 + 1) * DESIGN_WIDTH;
      const y = hash2(i, layer * 3 + 2) * (DESIGN_HEIGHT * 0.72);
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(time * (0.6 + hash2(i, 9)) + i));
      const r = (layer === 0 ? 0.9 : 1.5) + hash2(i, 5) * 0.7;
      ctx.fillStyle = layer === 0
        ? `rgba(214,226,255,${0.3 * tw})`
        : `rgba(255,246,220,${0.55 * tw})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      if (layer === 1 && r > 1.9) {
        ctx.strokeStyle = `rgba(255,250,230,${0.3 * tw})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(x - r * 3, y);
        ctx.lineTo(x + r * 3, y);
        ctx.moveTo(x, y - r * 3);
        ctx.lineTo(x, y + r * 3);
        ctx.stroke();
      }
    }
  }
}

function drawMoon(ctx: CanvasRenderingContext2D, mx: number, my: number, time: number): void {
  // Outer halo, breathing very slowly.
  const breathe = 1 + Math.sin(time * 0.6) * 0.03;
  const halo = ctx.createRadialGradient(mx, my, 30, mx, my, 168 * breathe);
  halo.addColorStop(0, 'rgba(255,252,228,0.36)');
  halo.addColorStop(0.22, 'rgba(252,246,210,0.2)');
  halo.addColorStop(0.55, 'rgba(180,200,240,0.07)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(mx, my, 168 * breathe, 0, Math.PI * 2);
  ctx.fill();

  // Lunar disc with maria.
  ctx.beginPath();
  ctx.arc(mx, my, 42, 0, Math.PI * 2);
  const disc = ctx.createRadialGradient(mx - 14, my - 16, 4, mx, my, 44);
  disc.addColorStop(0, '#fffdf2');
  disc.addColorStop(0.62, '#f6f0d8');
  disc.addColorStop(1, '#cfc6a6');
  ctx.fillStyle = disc;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,244,0.5)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(mx, my, 40, 0, Math.PI * 2);
  ctx.clip();
  [[-16, -8, 9], [6, 12, 12], [16, -14, 7], [-6, 20, 6]].forEach(([ox, oy, rr]) => {
    const g = ctx.createRadialGradient(mx + ox, my + oy, 1, mx + ox, my + oy, rr);
    g.addColorStop(0, 'rgba(186,178,150,0.55)');
    g.addColorStop(1, 'rgba(186,178,150,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(mx + ox, my + oy, rr, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawNightClouds(ctx: CanvasRenderingContext2D, time: number): void {
  // Each band is a baked blob cluster, blitted at drifting offsets. Keep
  // them thin, dark and semi-transparent: they are sky dressing, not the
  // subject — the crest has to stay the brightest thing on screen.
  const bands: Array<[number, number, number, number, number]> = [
    // y, seed, speed, scale, alpha
    [96, 0, 9, 0.8, 0.22],
    [154, 1, 15, 1, 0.3],
    [212, 2, 6, 0.7, 0.2],
    [268, 3, 12, 0.85, 0.26],
  ];
  const span = DESIGN_WIDTH + 400;
  bands.forEach(([y, seed, speed, scale, alpha], bi) => {
    const sprite = sprites.get(`cloud:${seed}`, 320, 120, (c, w, h) => paintCloud(c, w, h, seed), 2);
    for (let i = 0; i < 2; i++) {
      const raw = (bi * 240 + i * span * 0.5 + time * speed) % span;
      const x = raw - 200;
      ctx.save();
      ctx.globalAlpha = alpha;
      sprites.blit(ctx, sprite, x, y, 320 * scale, 120 * scale);
      ctx.restore();
    }
  });

  // Low mist band just above the wall.
  const mist = ctx.createLinearGradient(0, DESIGN_HEIGHT - 330, 0, DESIGN_HEIGHT - 150);
  mist.addColorStop(0, 'rgba(140,160,200,0)');
  mist.addColorStop(0.6, 'rgba(150,166,200,0.14)');
  mist.addColorStop(1, 'rgba(150,166,200,0)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, DESIGN_HEIGHT - 330, DESIGN_WIDTH, 190);
}

function paintCloud(c: CanvasRenderingContext2D, w: number, h: number, seed: number): void {
  const blobs: Array<[number, number, number]> = [
    [0.16, 0.62, 0.2], [0.3, 0.48, 0.26], [0.46, 0.6, 0.22],
    [0.62, 0.44, 0.28], [0.78, 0.6, 0.2], [0.9, 0.66, 0.15],
  ];
  c.beginPath();
  blobs.forEach(([bx, by, br], i) => {
    const jitter = (hash2(seed, i) - 0.5) * 0.06;
    c.moveTo((bx + jitter) * w + br * w, by * h);
    c.arc((bx + jitter) * w, (by + jitter * 0.4) * h, br * w, 0, Math.PI * 2);
  });
  const g = c.createLinearGradient(0, h * 0.2, 0, h);
  g.addColorStop(0, 'rgba(120,140,186,0.9)');
  g.addColorStop(0.45, 'rgba(74,92,138,0.85)');
  g.addColorStop(1, 'rgba(38,50,84,0.8)');
  c.fillStyle = g;
  c.fill();
  // Lit tops.
  c.save();
  c.clip();
  c.fillStyle = 'rgba(196,212,246,0.4)';
  c.beginPath();
  c.ellipse(w * 0.42, h * 0.36, w * 0.4, h * 0.14, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function drawDistantMountains(ctx: CanvasRenderingContext2D): void {
  // Two silhouette layers, the far one lighter (atmospheric depth). They
  // must read as a horizon, so the peaks stay low and dark: the crest is
  // the only thing allowed to own the upper third of the screen.
  const layers: Array<[number, number, number, string, string]> = [
    // baseY, amp, seed, top, bottom
    [418, 68, 1, '#252e48', '#131a2c'],
    [466, 54, 2, '#1a2338', '#0c1220'],
  ];
  layers.forEach(([baseY, amp, seed, top, bottom]) => {
    ctx.beginPath();
    ctx.moveTo(-20, DESIGN_HEIGHT);
    ctx.lineTo(-20, baseY);
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * (DESIGN_WIDTH + 40) - 20;
      const peak = baseY - amp * (0.45 + hash2(i, seed) * 0.85);
      ctx.lineTo(x, peak);
      if (i < steps) {
        const midX = x + (DESIGN_WIDTH + 40) / steps / 2;
        ctx.lineTo(midX, baseY - amp * hash2(i, seed + 11) * 0.3);
      }
    }
    ctx.lineTo(DESIGN_WIDTH + 20, DESIGN_HEIGHT);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, baseY - amp, 0, DESIGN_HEIGHT);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fill();
  });

  // Fog pooling in the valleys.
  const fog = ctx.createLinearGradient(0, 360, 0, 500);
  fog.addColorStop(0, 'rgba(120,140,180,0)');
  fog.addColorStop(0.5, 'rgba(126,146,186,0.16)');
  fog.addColorStop(1, 'rgba(120,140,180,0)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, 360, DESIGN_WIDTH, 150);
}

function drawFortressRamparts(ctx: CanvasRenderingContext2D, time: number): void {
  const wallTop = DESIGN_HEIGHT - 210;
  const sprite = sprites.get('rampart', DESIGN_WIDTH, DESIGN_HEIGHT - wallTop + 60,
    (c, w, h) => paintRampart(c, w, h, wallTop), 2);
  sprites.blit(ctx, sprite, DESIGN_WIDTH / 2, (wallTop - 60 + DESIGN_HEIGHT) / 2 + 2,
    DESIGN_WIDTH, DESIGN_HEIGHT - wallTop + 60);

  // Torch flicker wash on the stone.
  const flick = 0.5 + Math.sin(time * 8) * 0.2;
  [[168, DESIGN_HEIGHT - 196], [DESIGN_WIDTH - 168, DESIGN_HEIGHT - 196]].forEach(([x, y]) => {
    const g = ctx.createRadialGradient(x, y - 30, 8, x, y - 30, 190);
    g.addColorStop(0, `rgba(255,166,64,${0.2 + flick * 0.08})`);
    g.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y - 30, 190, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Stone rampart, battlements, gate arch and iron portcullis, baked once. */
function paintRampart(c: CanvasRenderingContext2D, w: number, h: number, wallTop: number): void {
  const localTop = 60;
  const wallH = h - localTop;

  // Wall body.
  const wall = c.createLinearGradient(0, localTop, 0, h);
  wall.addColorStop(0, '#3b4658');
  wall.addColorStop(0.28, '#29313f');
  wall.addColorStop(0.7, '#1a2130');
  wall.addColorStop(1, '#0d1220');
  c.fillStyle = wall;
  c.fillRect(0, localTop, w, wallH);

  // Stone courses with mortar lines.
  const courseH = 26;
  for (let row = 0; row * courseH < wallH; row++) {
    const y = localTop + row * courseH;
    c.strokeStyle = 'rgba(10,14,24,0.7)';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(w, y);
    c.stroke();
    c.strokeStyle = 'rgba(180,196,224,0.07)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, y + 1.6);
    c.lineTo(w, y + 1.6);
    c.stroke();

    const offset = (row % 2) * 40;
    for (let x = offset; x < w; x += 80) {
      const jitter = (hash2(row, x) - 0.5) * 6;
      c.strokeStyle = 'rgba(10,14,24,0.65)';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(x + jitter, y);
      c.lineTo(x + jitter, y + courseH);
      c.stroke();
      // A few bricks catch the moonlight.
      if (hash2(row, x + 3) > 0.72) {
        c.fillStyle = 'rgba(198,214,240,0.05)';
        c.fillRect(x + jitter + 2, y + 2, 76, courseH - 4);
      }
    }
  }

  // Weathering streaks.
  for (let i = 0; i < 60; i++) {
    const x = hash2(i, 61) * w;
    const y = localTop + hash2(i, 62) * wallH * 0.6;
    c.fillStyle = 'rgba(8,10,18,0.18)';
    c.fillRect(x, y, 3 + hash2(i, 63) * 4, 30 + hash2(i, 64) * 110);
  }

  // Battlements: crenellations with a lit top face.
  const crenW = 42;
  const crenH = 26;
  const gap = 30;
  c.fillStyle = '#2b3444';
  c.fillRect(0, localTop - crenH, w, crenH);
  for (let x = 0; x < w; x += crenW + gap) {
    c.fillStyle = '#39455a';
    c.beginPath();
    c.moveTo(x, localTop - crenH);
    c.lineTo(x + crenW, localTop - crenH);
    c.lineTo(x + crenW - 3, localTop);
    c.lineTo(x + 3, localTop);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(176,196,228,0.18)';
    c.beginPath();
    c.moveTo(x + 3, localTop - crenH + 4);
    c.lineTo(x + crenW - 3, localTop - crenH + 4);
    c.lineTo(x + crenW - 8, localTop - crenH + 11);
    c.lineTo(x + 8, localTop - crenH + 11);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(8,10,18,0.75)';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(x, localTop - crenH);
    c.lineTo(x + crenW, localTop - crenH);
    c.lineTo(x + crenW - 3, localTop);
    c.stroke();
  }
  // Shadow line right under the battlements.
  c.fillStyle = 'rgba(4,6,12,0.45)';
  c.fillRect(0, localTop, w, 14);

  // Flanking towers.
  [70, w - 70].forEach((tx, i) => {
    const tw = 74;
    const th = 150;
    const ty = localTop - th + 24;
    const tower = c.createLinearGradient(tx - tw / 2, 0, tx + tw / 2, 0);
    tower.addColorStop(0, '#3d495e');
    tower.addColorStop(0.5, '#26303f');
    tower.addColorStop(1, '#141a27');
    c.fillStyle = tower;
    c.fillRect(tx - tw / 2, ty, tw, th + 40);
    c.strokeStyle = 'rgba(8,10,18,0.8)';
    c.lineWidth = 2;
    c.strokeRect(tx - tw / 2, ty, tw, th + 40);
    // Conical roof with a banner.
    c.beginPath();
    c.moveTo(tx - tw / 2 - 8, ty);
    c.lineTo(tx + tw / 2 + 8, ty);
    c.lineTo(tx, ty - 52);
    c.closePath();
    const roof = c.createLinearGradient(tx - tw / 2, ty - 52, tx + tw / 2, ty);
    roof.addColorStop(0, '#7d2b22');
    roof.addColorStop(1, '#3a100c');
    c.fillStyle = roof;
    c.fill();
    c.strokeStyle = 'rgba(8,10,18,0.85)';
    c.lineWidth = 2;
    c.stroke();
    c.beginPath();
    c.moveTo(tx, ty - 52);
    c.lineTo(tx, ty - 84);
    c.strokeStyle = '#6b7588';
    c.lineWidth = 2.4;
    c.stroke();
    const flagDir = i === 0 ? 1 : -1;
    c.beginPath();
    c.moveTo(tx, ty - 82);
    c.quadraticCurveTo(tx + flagDir * 14, ty - 78, tx + flagDir * 27, ty - 74);
    c.lineTo(tx + flagDir * 27, ty - 60);
    c.quadraticCurveTo(tx + flagDir * 14, ty - 64, tx, ty - 68);
    c.closePath();
    c.fillStyle = '#b8332a';
    c.fill();
    c.strokeStyle = 'rgba(8,10,18,0.7)';
    c.lineWidth = 1.4;
    c.stroke();
    // Arrow slits.
    [-34, 6].forEach(oy => {
      c.fillStyle = '#05070d';
      roundRect(c, tx - 4, ty + 54 + oy, 8, 24, 3);
      c.fill();
    });
  });

  // Gate arch + iron portcullis.
  const gateW = 220;
  const gateH = 180;
  const gx = w / 2 - gateW / 2;
  const gy = localTop - 10;
  c.fillStyle = '#2e3848';
  roundRect(c, gx - 24, gy - 24, gateW + 48, gateH + 28, 24);
  c.fill();
  c.strokeStyle = 'rgba(8,10,18,0.85)';
  c.lineWidth = 2.4;
  c.stroke();
  // Arch voussoirs.
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI;
    const px = w / 2 + Math.cos(a) * (gateW / 2 + 14);
    const py = gy + 6 + Math.sin(a) * (gateW / 2 + 14) * 0.62;
    c.strokeStyle = 'rgba(12,16,26,0.7)';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(px, py);
    c.lineTo(w / 2 + Math.cos(a) * (gateW / 2 - 6), gy + 6 + Math.sin(a) * (gateW / 2 - 6) * 0.62);
    c.stroke();
  }
  c.fillStyle = '#05070d';
  roundRect(c, gx, gy, gateW, gateH, 22);
  c.fill();

  // Portcullis bars + cross braces.
  c.save();
  roundRect(c, gx, gy, gateW, gateH, 22);
  c.clip();
  const warm = c.createLinearGradient(0, gy, 0, gy + gateH);
  warm.addColorStop(0, 'rgba(255,150,60,0.16)');
  warm.addColorStop(1, 'rgba(180,60,20,0.05)');
  c.fillStyle = warm;
  c.fillRect(gx, gy, gateW, gateH);
  for (let bx = gx + 22; bx < gx + gateW - 8; bx += 26) {
    c.strokeStyle = '#57617a';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(bx, gy);
    c.lineTo(bx, gy + gateH);
    c.stroke();
    c.strokeStyle = 'rgba(200,214,240,0.22)';
    c.lineWidth = 1.6;
    c.stroke();
  }
  [0.32, 0.66].forEach(t => {
    c.strokeStyle = '#4a5468';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(gx, gy + gateH * t);
    c.lineTo(gx + gateW, gy + gateH * t);
    c.stroke();
  });
  c.restore();
}

function drawBrazier(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number): void {
  const sprite = sprites.get('brazier', 92, 150, (c, w, h) => paintBrazier(c, w, h), 2);
  sprites.blit(ctx, sprite, cx, cy + 62, 92, 150);

  // Fire glow.
  const pulse = 0.8 + Math.sin(time * 7) * 0.14;
  const glow = ctx.createRadialGradient(cx, cy - 16, 6, cx, cy - 16, 110 * pulse);
  glow.addColorStop(0, 'rgba(255,190,90,0.6)');
  glow.addColorStop(0.35, 'rgba(232,96,20,0.28)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy - 16, 110 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Procedural flames: an outer orange body with a hot core.
  for (let f = 0; f < 6; f++) {
    const phase = time * 8 + f * 1.35;
    const flameH = 46 + Math.sin(phase) * 14;
    const flameW = 11 + Math.cos(time * 6 + f) * 4;
    const fx = cx + (f - 2.5) * 8 + Math.sin(time * 5 + f) * 3;
    ctx.beginPath();
    ctx.moveTo(fx - flameW, cy - 2);
    ctx.quadraticCurveTo(fx - flameW * 0.5, cy - flameH * 0.55, fx, cy - flameH);
    ctx.quadraticCurveTo(fx + flameW * 0.5, cy - flameH * 0.55, fx + flameW, cy - 2);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, cy - flameH, 0, cy);
    if (f % 2 === 0) {
      g.addColorStop(0, 'rgba(255,224,120,0.5)');
      g.addColorStop(0.4, 'rgba(255,132,26,0.9)');
      g.addColorStop(1, 'rgba(210,50,10,0.75)');
    } else {
      g.addColorStop(0, 'rgba(255,246,190,0.75)');
      g.addColorStop(0.5, 'rgba(255,178,50,0.9)');
      g.addColorStop(1, 'rgba(226,72,14,0.7)');
    }
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(cx, cy - 10, 13, 17 + Math.sin(time * 9) * 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,248,206,0.9)';
  ctx.fill();
}

/** Stone column + iron fire bowl. */
function paintBrazier(c: CanvasRenderingContext2D, w: number, h: number): void {
  const cx = w / 2;
  const baseY = h - 6;
  // Column.
  const col = c.createLinearGradient(cx - 16, 0, cx + 16, 0);
  col.addColorStop(0, '#5a6577');
  col.addColorStop(0.4, '#414c5e');
  col.addColorStop(1, '#242c3a');
  c.fillStyle = col;
  c.fillRect(cx - 15, 40, 30, baseY - 46);
  c.strokeStyle = 'rgba(6,8,14,0.75)';
  c.lineWidth = 2;
  c.strokeRect(cx - 15, 40, 30, baseY - 46);
  // Stone joints.
  for (let y = 52; y < baseY - 10; y += 22) {
    c.strokeStyle = 'rgba(8,10,18,0.6)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(cx - 15, y);
    c.lineTo(cx + 15, y);
    c.stroke();
    c.strokeStyle = 'rgba(200,214,236,0.08)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(cx - 15, y + 1.6);
    c.lineTo(cx + 15, y + 1.6);
    c.stroke();
  }
  // Base slab.
  c.fillStyle = '#4d5768';
  roundRect(c, cx - 26, baseY - 16, 52, 18, 4);
  c.fill();
  c.strokeStyle = 'rgba(6,8,14,0.75)';
  c.lineWidth = 2;
  c.stroke();

  // Fire bowl.
  c.beginPath();
  c.moveTo(cx - 34, 26);
  c.lineTo(cx + 34, 26);
  c.lineTo(cx + 22, 46);
  c.lineTo(cx - 22, 46);
  c.closePath();
  const bowl = c.createLinearGradient(cx - 34, 20, cx + 34, 48);
  bowl.addColorStop(0, '#4a5264');
  bowl.addColorStop(0.5, '#2b3242');
  bowl.addColorStop(1, '#141a26');
  c.fillStyle = bowl;
  c.fill();
  c.strokeStyle = '#0a0e18';
  c.lineWidth = 2.6;
  c.stroke();
  c.beginPath();
  c.moveTo(cx - 34, 26);
  c.lineTo(cx + 34, 26);
  c.strokeStyle = 'rgba(214,226,248,0.25)';
  c.lineWidth = 1.6;
  c.stroke();
  // Embers in the bowl.
  c.beginPath();
  c.ellipse(cx, 27, 30, 6, 0, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,150,50,0.55)';
  c.fill();
}

function drawFloatingEmbers(ctx: CanvasRenderingContext2D, time: number): void {
  for (let i = 0; i < 48; i++) {
    const seed = i * 137.5;
    const x = (seed * 11 + time * 18 + Math.sin(time * 1.6 + i) * 22) % DESIGN_WIDTH;
    const rise = (seed * 7 + time * (34 + (i % 5) * 16)) % (DESIGN_HEIGHT * 0.86);
    const y = DESIGN_HEIGHT - 120 - rise;
    const size = 1.4 + (i % 3) * 0.9;
    // Embers cool as they rise: orange near the fire, dim blue up top.
    const heat = 1 - rise / (DESIGN_HEIGHT * 0.86);
    ctx.fillStyle = i % 2 === 0
      ? `rgba(255,${Math.round(150 + heat * 60)},60,${0.22 + heat * 0.5})`
      : `rgba(255,90,20,${0.16 + heat * 0.42})`;
    ctx.beginPath();
    ctx.arc(x, y, size * (0.6 + heat * 0.7), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTitleHeraldicCrest(ctx: CanvasRenderingContext2D, time: number): void {
  const cx = DESIGN_WIDTH / 2;
  const cy = 206 + Math.sin(time * 1.5) * 4;

  // Warm bloom behind the crest.
  const bloom = ctx.createRadialGradient(cx, cy, 20, cx, cy, 260);
  bloom.addColorStop(0, 'rgba(255,204,120,0.16)');
  bloom.addColorStop(1, 'rgba(255,180,80,0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(cx - 280, cy - 260, 560, 520);

  const sprite = sprites.get('crest', 420, 420, (c, w) => paintCrest(c, w / 2, w / 2 + 4), 2);
  sprites.blit(ctx, sprite, cx, cy, 420, 420);

  drawTitleRibbon(ctx, cx, cy + 74);
}

function paintCrest(c: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Crossed broadswords behind the shield.
  [-1, 1].forEach(dir => {
    c.save();
    c.translate(cx, cy);
    c.rotate((dir * Math.PI) / 4.2);
    // Blade
    c.beginPath();
    c.moveTo(0, -168);
    c.lineTo(9, -146);
    c.lineTo(7, 26);
    c.lineTo(-7, 26);
    c.lineTo(-9, -146);
    c.closePath();
    const blade = c.createLinearGradient(-9, 0, 9, 0);
    blade.addColorStop(0, '#8d9cb4');
    blade.addColorStop(0.42, '#eef4ff');
    blade.addColorStop(0.6, '#c3cede');
    blade.addColorStop(1, '#68758c');
    c.fillStyle = blade;
    c.fill();
    c.strokeStyle = '#1d2432';
    c.lineWidth = 2.4;
    c.stroke();
    // Fuller
    c.beginPath();
    c.moveTo(0, -140);
    c.lineTo(0, 20);
    c.strokeStyle = 'rgba(90,104,128,0.75)';
    c.lineWidth = 2.6;
    c.stroke();
    // Crossguard
    roundRect(c, -26, 26, 52, 10, 4);
    const guard = c.createLinearGradient(-26, 26, 26, 36);
    guard.addColorStop(0, GOLD_HI);
    guard.addColorStop(0.5, GOLD);
    guard.addColorStop(1, GOLD_DARK);
    c.fillStyle = guard;
    c.fill();
    c.strokeStyle = '#2a1a06';
    c.lineWidth = 1.8;
    c.stroke();
    // Grip + pommel
    roundRect(c, -5, 36, 10, 30, 4);
    c.fillStyle = '#5b3018';
    c.fill();
    c.strokeStyle = '#241004';
    c.lineWidth = 1.6;
    c.stroke();
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(-5, 39 + i * 7);
      c.lineTo(5, 43 + i * 7);
      c.strokeStyle = 'rgba(255,220,160,0.35)';
      c.lineWidth = 1.6;
      c.stroke();
    }
    c.beginPath();
    c.arc(0, 72, 9, 0, Math.PI * 2);
    const pom = c.createRadialGradient(-3, 69, 1, 0, 72, 10);
    pom.addColorStop(0, GOLD_HI);
    pom.addColorStop(1, GOLD_DARK);
    c.fillStyle = pom;
    c.fill();
    c.strokeStyle = '#2a1a06';
    c.lineWidth = 1.6;
    c.stroke();
    c.restore();
  });

  // Shield body: gold rim.
  c.save();
  c.translate(cx, cy + 4);
  crestShield(c, 0, 0, 78, 96);
  const rim = c.createLinearGradient(-78, -96, 78, 96);
  rim.addColorStop(0, '#fff0b8');
  rim.addColorStop(0.45, GOLD);
  rim.addColorStop(0.6, GOLD_DARK);
  rim.addColorStop(1, '#4d3208');
  c.fillStyle = rim;
  c.fill();
  c.strokeStyle = UI_INK;
  c.lineWidth = 3.4;
  c.stroke();

  // Quartered field.
  crestShield(c, 0, 0, 66, 84);
  c.save();
  c.clip();
  c.fillStyle = '#8f1d18';
  c.fillRect(-80, -100, 80, 100);
  c.fillRect(0, 0, 80, 110);
  c.fillStyle = '#123a75';
  c.fillRect(0, -100, 80, 100);
  c.fillRect(-80, 0, 80, 110);
  // Quarter shading.
  const qs = c.createLinearGradient(-70, -90, 70, 90);
  qs.addColorStop(0, 'rgba(255,255,255,0.16)');
  qs.addColorStop(0.5, 'rgba(0,0,0,0)');
  qs.addColorStop(1, 'rgba(0,0,0,0.34)');
  c.fillStyle = qs;
  c.fillRect(-80, -100, 160, 210);

  // Rampant lion, drawn as a lit silhouette with a mane.
  const lion = (x: number, y: number, s: number): void => {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.beginPath();
    c.ellipse(0, 6, 11, 17, -0.16, 0, Math.PI * 2);
    c.ellipse(-1, -14, 10, 10, 0, 0, Math.PI * 2);
    c.ellipse(9, -18, 5, 6, 0.4, 0, Math.PI * 2);
    c.ellipse(-6, 22, 5, 12, 0.5, 0, Math.PI * 2);
    c.ellipse(7, 22, 5, 12, -0.4, 0, Math.PI * 2);
    c.fillStyle = GOLD_HI;
    c.fill();
    c.strokeStyle = 'rgba(60,32,6,0.85)';
    c.lineWidth = 1.6;
    c.stroke();
    // Mane spikes.
    c.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = -1.2 + (i / 8) * 4.4;
      const rr = i % 2 === 0 ? 18 : 13;
      const px = -1 + Math.cos(a) * rr;
      const py = -14 + Math.sin(a) * rr;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
    c.fillStyle = 'rgba(224,168,52,0.9)';
    c.fill();
    c.strokeStyle = 'rgba(60,32,6,0.6)';
    c.lineWidth = 1.2;
    c.stroke();
    // Tail.
    c.beginPath();
    c.moveTo(-8, 18);
    c.quadraticCurveTo(-26, 6, -20, -12);
    c.strokeStyle = GOLD_HI;
    c.lineWidth = 3.4;
    c.stroke();
    c.restore();
  };
  lion(-2, 6, 1.05);
  c.restore();

  // Shield boss + cross division.
  c.strokeStyle = GOLD;
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(-66, 0);
  c.lineTo(66, 0);
  c.moveTo(0, -84);
  c.lineTo(0, 88);
  c.stroke();
  c.strokeStyle = 'rgba(60,34,6,0.55)';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(-66, 1.6);
  c.lineTo(66, 1.6);
  c.moveTo(1.6, -84);
  c.lineTo(1.6, 88);
  c.stroke();

  crestShield(c, 0, 0, 66, 84);
  c.strokeStyle = 'rgba(255,240,196,0.4)';
  c.lineWidth = 1.6;
  c.stroke();
  c.restore();

  // Crown above the shield.
  c.save();
  c.translate(cx, cy - 84);
  c.beginPath();
  c.moveTo(-34, 20);
  c.lineTo(34, 20);
  c.lineTo(40, -12);
  c.lineTo(20, -2);
  c.lineTo(0, -26);
  c.lineTo(-20, -2);
  c.lineTo(-40, -12);
  c.closePath();
  const crown = c.createLinearGradient(0, -26, 0, 22);
  crown.addColorStop(0, '#fff4c4');
  crown.addColorStop(0.45, GOLD);
  crown.addColorStop(1, '#9a6a12');
  c.fillStyle = crown;
  c.fill();
  c.strokeStyle = UI_INK;
  c.lineWidth = 2.6;
  c.stroke();
  // Band.
  roundRect(c, 0, 16, 74, 13, 5);
  const band = c.createLinearGradient(0, 10, 0, 24);
  band.addColorStop(0, GOLD_HI);
  band.addColorStop(1, GOLD_DARK);
  c.fillStyle = band;
  c.fill();
  c.strokeStyle = UI_INK;
  c.lineWidth = 1.8;
  c.stroke();
  // Jewels.
  [[-24, -4], [0, -18], [24, -4], [0, 17]].forEach(([jx, jy], i) => {
    c.beginPath();
    c.arc(jx, jy, i === 3 ? 3.6 : 4.4, 0, Math.PI * 2);
    const jg = c.createRadialGradient(jx - 1.6, jy - 1.6, 0.4, jx, jy, 5);
    jg.addColorStop(0, i % 2 === 0 ? '#ff9a8a' : '#8fd0ff');
    jg.addColorStop(1, i % 2 === 0 ? '#8d1a12' : '#0f3a72');
    c.fillStyle = jg;
    c.fill();
    c.strokeStyle = 'rgba(40,20,4,0.8)';
    c.lineWidth = 1.2;
    c.stroke();
  });
  c.restore();
}

function crestShield(c: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number): void {
  c.beginPath();
  c.moveTo(cx - w, cy - h * 0.78);
  c.quadraticCurveTo(cx - w, cy - h * 1.02, cx, cy - h * 0.96);
  c.quadraticCurveTo(cx + w, cy - h * 1.02, cx + w, cy - h * 0.78);
  c.lineTo(cx + w, cy + h * 0.06);
  c.quadraticCurveTo(cx + w, cy + h * 0.74, cx, cy + h);
  c.quadraticCurveTo(cx - w, cy + h * 0.74, cx - w, cy + h * 0.06);
  c.closePath();
}

function drawTitleRibbon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const rw = 300;
  const rh = 50;
  const sprite = sprites.get(`ribbon:${rw}`, rw * 2 + 100, rh + 40,
    (c, w, h) => paintRibbonBody(c, w / 2, h / 2 - 6, rw, rh), 2);
  sprites.blit(ctx, sprite, cx, cy, rw * 2 + 100, rh + 40);

  ctx.save();
  ctx.font = `bold 34px ${FONT_TITLE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = 'LAST BASTION';
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(24,10,2,0.9)';
  ctx.strokeText(label, cx, cy + 1);
  const face = ctx.createLinearGradient(0, cy - 18, 0, cy + 18);
  face.addColorStop(0, '#fff8d8');
  face.addColorStop(0.5, '#ffd866');
  face.addColorStop(1, '#d09a24');
  ctx.fillStyle = face;
  ctx.fillText(label, cx, cy);
  ctx.restore();

  // Subtitle beneath the ribbon.
  ctx.save();
  ctx.font = `italic 15px ${FONT_TITLE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(10,6,2,0.85)';
  ctx.strokeText('—  FRONTIERS OF THE REALM  —', cx, cy + 48);
  ctx.fillStyle = '#e6c88a';
  ctx.fillText('—  FRONTIERS OF THE REALM  —', cx, cy + 48);
  ctx.restore();
}

function paintRibbonBody(c: CanvasRenderingContext2D, cx: number, cy: number, rw: number, rh: number): void {
  // Folded swallowtail ends.
  [-1, 1].forEach(dir => {
    c.beginPath();
    c.moveTo(cx + dir * (rw - 4), cy - rh / 2 + 3);
    c.lineTo(cx + dir * (rw + 46), cy + 6);
    c.lineTo(cx + dir * (rw + 18), cy + rh / 2 + 6);
    c.lineTo(cx + dir * (rw - 4), cy + rh / 2 + 4);
    c.closePath();
    const fold = c.createLinearGradient(cx + dir * rw, cy, cx + dir * (rw + 46), cy + rh / 2);
    fold.addColorStop(0, '#8b5a2b');
    fold.addColorStop(1, '#4c2c10');
    c.fillStyle = fold;
    c.fill();
    c.strokeStyle = UI_INK;
    c.lineWidth = 2;
    c.stroke();
  });

  // Main band.
  roundRect(c, cx - rw, cy - rh / 2, rw * 2, rh, 8);
  const band = c.createLinearGradient(0, cy - rh / 2, 0, cy + rh / 2);
  band.addColorStop(0, '#a8712f');
  band.addColorStop(0.45, '#7a4d20');
  band.addColorStop(1, '#3f240d');
  c.fillStyle = band;
  c.fill();
  c.strokeStyle = UI_INK;
  c.lineWidth = 2.6;
  c.stroke();

  // Gold edging and inner key lines.
  roundRect(c, cx - rw + 4, cy - rh / 2 + 4, rw * 2 - 8, rh - 8, 5);
  c.strokeStyle = GOLD;
  c.lineWidth = 2;
  c.stroke();
  c.strokeStyle = 'rgba(255,244,214,0.28)';
  c.lineWidth = 1;
  roundRect(c, cx - rw + 7, cy - rh / 2 + 7, rw * 2 - 14, rh - 14, 4);
  c.stroke();

  // End studs.
  [-1, 1].forEach(dir => {
    [[cx + dir * (rw - 16), cy - 12], [cx + dir * (rw - 16), cy + 12]].forEach(([sx, sy]) => {
      c.beginPath();
      c.arc(sx, sy, 4, 0, Math.PI * 2);
      const g = c.createRadialGradient(sx - 1.4, sy - 1.4, 0.4, sx, sy, 4.6);
      g.addColorStop(0, GOLD_HI);
      g.addColorStop(1, GOLD_DARK);
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = 'rgba(30,14,4,0.8)';
      c.lineWidth = 1.2;
      c.stroke();
    });
  });
}

// ─── Lore / Bestiary modal ───────────────────────────────────────

function drawLoreBestiaryModal(ctx: CanvasRenderingContext2D, mousePos: Vec2): void {
  ctx.save();
  ctx.fillStyle = 'rgba(4,3,9,0.72)';
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  const w = 680;
  const h = 480;
  const x = (DESIGN_WIDTH - w) / 2;
  const y = (DESIGN_HEIGHT - h) / 2;

  drawParchmentModal(ctx, 'lore', x, y, w, h);

  // Title band.
  roundRect(ctx, x + 18, y + 18, w - 36, 56, 7);
  const band = ctx.createLinearGradient(0, y + 18, 0, y + 74);
  band.addColorStop(0, '#7d2420');
  band.addColorStop(0.5, '#5d1714');
  band.addColorStop(1, '#38090a');
  ctx.fillStyle = band;
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,236,190,0.3)';
  ctx.lineWidth = 1;
  roundRect(ctx, x + 21.5, y + 21.5, w - 43, 49, 5);
  ctx.stroke();

  ctx.font = `bold 24px ${FONT_TITLE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const title = 'KINGDOM BESTIARY & WAR ROOM';
  ctx.fillStyle = 'rgba(20,6,4,0.85)';
  ctx.fillText(title, DESIGN_WIDTH / 2 + 1.5, y + 48);
  ctx.fillStyle = '#ffeec2';
  ctx.fillText(title, DESIGN_WIDTH / 2, y + 46);
  drawIcon(ctx, 'hammer', x + 46, y + 46, 22);
  drawIcon(ctx, 'hammer', x + w - 46, y + 46, 22);

  drawDivider(ctx, x + 60, y + 92, w - 120);

  const loreItems: Array<{ icon: IconName; title: string; desc: string }> = [
    { icon: 'archer', title: 'ARCHER TOWERS', desc: 'Rapid fire bows with long range. Upgrades into Sharpshooters or Rapid Volley.' },
    { icon: 'barracks', title: 'BARRACKS SOLDIERS', desc: 'Spawns 2 armored infantry onto the road to halt advancing creeps in melee combat.' },
    { icon: 'mage', title: 'MAGE TOWERS', desc: 'Pierces heavy iron armor with arcane bolts. Upgrades into Arcane Blast or Slow Hex.' },
    { icon: 'cannon', title: 'CANNON TOWERS', desc: 'Lobs heavy explosive shells dealing area splash damage against swarms of goblins.' },
    { icon: 'spell_rain_of_fire', title: 'GOD SPELLS', desc: 'Press [1] for Rain of Fire meteors; press [2] to summon emergency militia reinforcements.' },
    { icon: 'skull', title: 'ENEMY THREATS', desc: 'Dark Shamans heal allies, Trolls self-regenerate, and the Orc Warlord stuns towers!' },
  ];

  loreItems.forEach((item, idx) => {
    const iy = y + 106 + idx * 57;
    // Alternating row plates.
    if (idx % 2 === 0) {
      roundRect(ctx, x + 28, iy - 4, w - 56, 50, 6);
      ctx.fillStyle = 'rgba(214,186,140,0.28)';
      ctx.fill();
    }
    drawIcon(ctx, item.icon, x + 52, iy + 20, 32);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `bold 16px ${FONT_TITLE}`;
    ctx.fillStyle = 'rgba(255,246,222,0.5)';
    ctx.fillText(item.title, x + 78, iy + 17);
    ctx.fillStyle = '#8d2019';
    ctx.fillText(item.title, x + 77, iy + 16);

    ctx.font = `13px ${FONT_UI}`;
    ctx.fillStyle = '#33210f';
    ctx.fillText(item.desc, x + 78, iy + 35);
  });

  // Close button — frozen at x = 640-60, y = (720-480)/2 + 480 - 55, 120 x 40.
  const btnX = DESIGN_WIDTH / 2 - 60;
  const btnY = y + h - 55;
  const btnHover = inRect(mousePos, btnX, btnY, 120, 40);
  applyButtonState(ctx, btnX, btnY, 120, 40, { hover: btnHover }, () => {
    drawFrame(ctx, 'loreclose', btnX, btnY, 120, 40, { hover: btnHover });
    if (btnHover) drawSheen(ctx, btnX, btnY, 120, 40, 0.8);
    drawLabel(ctx, 'CLOSE', btnX + 60 + 10, btnY + 20, 16, 'close', btnX + 18);
  });

  ctx.restore();
}

// ─── Medieval Carved Wood Top HUD Bar ────────────────────────────

export function drawMedievalTopHUD(
  ctx: CanvasRenderingContext2D,
  gold: number,
  lives: number,
  maxLives: number,
  waveIndex: number,
  totalWaves: number,
  paused: boolean,
  gameSpeed: number,
  waitingForWave: boolean,
  waveCountdown: number,
  earlyBonusGold: number,
  mousePos: Vec2,
  time: number,
): void {
  ctx.save();
  const barH = 50;

  // Carved plank with rivets, spanning the top of the screen.
  drawFrame(ctx, 'hudbar', -14, -16, DESIGN_WIDTH + 28, barH + 16, {});

  // Gold filigree along the bottom edge.
  const trim = ctx.createLinearGradient(0, 0, DESIGN_WIDTH, 0);
  trim.addColorStop(0, 'rgba(138,95,20,0)');
  trim.addColorStop(0.5, GOLD);
  trim.addColorStop(1, 'rgba(138,95,20,0)');
  ctx.strokeStyle = trim;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, barH - 1);
  ctx.lineTo(DESIGN_WIDTH, barH - 1);
  ctx.stroke();

  ctx.restore();

  // 1. Gold pouch (left).
  drawResourceChip(ctx, 14, 5, 'gold', `${gold}`, GOLD_HI);

  // 2. Hearts.
  const livesW = 84 + String(Math.max(lives, 0)).length * 13;
  drawResourceChip(ctx, 14 + 104, 5, 'heart', `${lives}`,
    lives <= Math.max(2, maxLives * 0.25) ? '#ff8577' : '#fff4e2', livesW);

  // 3. Wave banner (centre).
  drawWaveBannerHUD(ctx, DESIGN_WIDTH / 2, barH / 2, waveIndex + 1, totalWaves);

  // 4. Pause / speed, painted over their frozen 44x34 rects.
  const pauseX = DESIGN_WIDTH - 120;
  const speedX = DESIGN_WIDTH - 65;
  const pauseHover = inRect(mousePos, pauseX, 8, 44, 34);
  const speedHover = inRect(mousePos, speedX, 8, 44, 34);

  applyButtonState(ctx, pauseX, 8, 44, 34, { hover: pauseHover }, () => {
    drawFrame(ctx, 'hudpause', pauseX, 8, 44, 34, { hover: pauseHover });
    if (pauseHover) drawSheen(ctx, pauseX, 8, 44, 34, 0.8);
    drawIcon(ctx, paused ? 'play' : 'pause', pauseX + 22, 25, 24);
  });

  applyButtonState(ctx, speedX, 8, 44, 34, { hover: speedHover }, () => {
    const st: FrameState = { hover: speedHover, selected: gameSpeed === 2 };
    drawFrame(ctx, 'hudspeed', speedX, 8, 44, 34, st);
    if (speedHover) drawSheen(ctx, speedX, 8, 44, 34, 0.8);
    // Lit face when running at 2x so the state is readable at a glance.
    if (gameSpeed === 2) {
      ctx.save();
      roundRect(ctx, speedX + 4.5, 8 + 4.5, 44 - 9, 34 - 9, 5);
      ctx.fillStyle = 'rgba(255,206,90,0.22)';
      ctx.fill();
      ctx.restore();
    }
    drawIcon(ctx, 'speed', speedX + 19, 25, 22);
    ctx.save();
    ctx.font = `bold 13px ${FONT_TITLE}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(20,8,2,0.85)';
    ctx.fillText(`${gameSpeed}x`, speedX + 33, 26.5);
    ctx.fillStyle = gameSpeed === 2 ? '#fff6d8' : '#e7d6b0';
    ctx.fillText(`${gameSpeed}x`, speedX + 32.5, 25.5);
    ctx.restore();
  });

  // 5. Early-wave medallion, frozen on the 80x60 call-wave rect at (640, 675).
  if (waitingForWave && waveCountdown > 0) {
    drawEarlyWaveMedallion(ctx, waveCountdown, earlyBonusGold, mousePos, time);
  }
}

/**
 * Icon + number readout, sitting on a small carved plate so the value
 * never floats raw over the wood. `x, y, w, h` is the plate rect.
 */
function drawResourceChip(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  icon: IconName, value: string, valueColor: string, minW = 100,
): void {
  const w = Math.max(minW, 46 + value.length * 13);
  const h = 38;
  const sprite = sprites.get(`chip:${w}x${h}`, w, h, (c, cw, ch) => paintChip(c, cw, ch), 2);
  sprites.blit(ctx, sprite, x + w / 2, y + h / 2, w, h);

  drawIcon(ctx, icon, x + 20, y + h / 2, 26);

  ctx.font = `bold 20px ${FONT_TITLE}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(14,6,2,0.9)';
  ctx.fillText(value, x + 38 + 1.2, y + h / 2 + 1.6);
  ctx.fillStyle = valueColor;
  ctx.fillText(value, x + 38, y + h / 2);
}

function paintChip(c: CanvasRenderingContext2D, w: number, h: number): void {
  roundRect(c, 1, 1, w - 2, h - 2, 7);
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(122,77,32,0.95)');
  g.addColorStop(0.55, 'rgba(74,44,18,0.95)');
  g.addColorStop(1, 'rgba(43,23,7,0.95)');
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = 'rgba(24,12,4,0.9)';
  c.lineWidth = 2;
  c.stroke();
  roundRect(c, 3, 3, w - 6, h - 6, 5);
  c.strokeStyle = 'rgba(255,214,120,0.45)';
  c.lineWidth = 1.2;
  c.stroke();
  c.save();
  roundRect(c, 2, 2, w - 4, h - 4, 6);
  c.clip();
  c.fillStyle = 'rgba(255,240,206,0.14)';
  c.fillRect(0, 0, w, 6);
  c.fillStyle = 'rgba(10,4,0,0.18)';
  c.fillRect(0, h - 7, w, 7);
  c.restore();
}

function drawWaveBannerHUD(ctx: CanvasRenderingContext2D, cx: number, cy: number, current: number, total: number): void {
  const w = 196;
  const h = 38;
  const sprite = sprites.get(`wavebanner:${w}x${h}`, w, h,
    (c, cw, ch) => paintWaveBanner(c, cw, ch), 2);
  sprites.blit(ctx, sprite, cx, cy, w, h);

  drawIcon(ctx, 'wave', cx - 72, cy, 26);

  ctx.font = `bold 17px ${FONT_TITLE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(14,6,2,0.85)';
  ctx.fillText(`Wave ${current} / ${total}`, cx + 12, cy + 1.5);
  ctx.fillStyle = '#f7e7c4';
  ctx.fillText(`Wave ${current} / ${total}`, cx + 11, cy);
}

function paintWaveBanner(c: CanvasRenderingContext2D, w: number, h: number): void {
  // Leather strap with horned ends.
  c.beginPath();
  c.moveTo(8, 2);
  c.lineTo(w - 8, 2);
  c.quadraticCurveTo(w, h / 2, w - 8, h - 2);
  c.lineTo(8, h - 2);
  c.quadraticCurveTo(0, h / 2, 8, 2);
  c.closePath();
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(126,80,36,0.96)');
  g.addColorStop(0.5, 'rgba(74,44,18,0.96)');
  g.addColorStop(1, 'rgba(38,20,6,0.96)');
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = GOLD;
  c.lineWidth = 2;
  c.stroke();
  c.strokeStyle = 'rgba(255,240,206,0.28)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(12, 6);
  c.lineTo(w - 12, 6);
  c.stroke();

  // Horn pair framing the plate.
  [-1, 1].forEach(dir => {
    const hx = dir < 0 ? 16 : w - 16;
    c.save();
    c.translate(hx, h / 2);
    c.scale(dir, 1);
    c.beginPath();
    c.moveTo(-2, -13);
    c.quadraticCurveTo(16, -16, 20, -2);
    c.quadraticCurveTo(16, 4, 6, 4);
    c.quadraticCurveTo(-1, 4, -2, -13);
    c.closePath();
    const hg = c.createLinearGradient(0, -16, 0, 6);
    hg.addColorStop(0, '#fff0c4');
    hg.addColorStop(0.5, GOLD);
    hg.addColorStop(1, BRONZE);
    c.fillStyle = hg;
    c.fill();
    c.strokeStyle = UI_INK;
    c.lineWidth = 1.6;
    c.stroke();
    c.strokeStyle = 'rgba(90,58,14,0.6)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(1, -9);
    c.quadraticCurveTo(11, -11, 15, -3);
    c.stroke();
    c.restore();
  });
}

function drawEarlyWaveMedallion(
  ctx: CanvasRenderingContext2D,
  countdown: number,
  bonusGold: number,
  mousePos: Vec2,
  time: number,
): void {
  const cx = DESIGN_WIDTH / 2;
  const cy = DESIGN_HEIGHT - 45;
  const hovered = Math.hypot(mousePos.x - cx, mousePos.y - cy) < 40;
  const pulse = (Math.sin(time * 6) + 1) * 0.5;

  ctx.save();
  // Two counter-phased rings: the "call the horde" beacon.
  ctx.strokeStyle = `rgba(255,150,60,${0.34 + pulse * 0.4})`;
  ctx.lineWidth = 3 + pulse * 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 42 + pulse * 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,224,140,${0.18 + (1 - pulse) * 0.35})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, cy, 50 + (1 - pulse) * 8, 0, Math.PI * 2);
  ctx.stroke();

  drawMedallion(ctx, 'wave', cx, cy, 40, 'skull', { hover: hovered, selected: true });

  // Countdown + bonus on a dark leather plate.
  const label = `${Math.ceil(countdown)}s  +${bonusGold}g`;
  ctx.font = `bold 15px ${FONT_TITLE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(label).width + 22;
  roundRect(ctx, cx - tw / 2, cy + 44, tw, 22, 7);
  const plate = ctx.createLinearGradient(0, cy + 44, 0, cy + 66);
  plate.addColorStop(0, 'rgba(52,28,10,0.94)');
  plate.addColorStop(1, 'rgba(26,13,4,0.94)');
  ctx.fillStyle = plate;
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = 'rgba(12,6,2,0.9)';
  ctx.fillText(label, cx + 1.2, cy + 55 + 1.2);
  ctx.fillStyle = GOLD_HI;
  ctx.fillText(label, cx, cy + 55);
  ctx.restore();
}
