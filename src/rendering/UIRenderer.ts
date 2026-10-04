// ─── UI & Cartography Renderer ─────────────────────────────────────
// Authentic Kingdom Rush-style fantasy parchment world map, epic fortress title screen,
// medieval carved wood battle HUD, stage briefing scrolls, and lore bestiary.
// Fully procedural with zero external image assets.

import { LevelData, SaveData, Vec2, DESIGN_WIDTH, DESIGN_HEIGHT } from '../data/types';

// Offscreen cache for the high-detail parchment map terrain
let cachedMapCanvas: HTMLCanvasElement | null = null;

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
  // 1. Render or blit static parchment base
  if (!cachedMapCanvas) {
    cachedMapCanvas = document.createElement('canvas');
    cachedMapCanvas.width = DESIGN_WIDTH;
    cachedMapCanvas.height = DESIGN_HEIGHT;
    const cCtx = cachedMapCanvas.getContext('2d')!;
    renderStaticParchmentBase(cCtx, levels);
  }
  ctx.drawImage(cachedMapCanvas, 0, 0);

  // 2. Animated Ocean Waves & Sea Monster
  drawAnimatedOceanDetails(ctx, time);

  // 3. Campaign Dotted Road & Directional Arrows
  drawCampaignPath(ctx, levels, save, time);

  // 4. Level Stage Markers (Shields, Flags, Stars, Padlocks)
  const nodePositions = getLevelNodePositions(levels.length);
  for (let i = 0; i < levels.length; i++) {
    const pos = nodePositions[i];
    const level = levels[i];
    const unlocked = i === 0 || !!save.levelStars[levels[i - 1].id];
    const stars = save.levelStars[level.id] || 0;
    const isHovered = hoveredIndex === i;
    const isSelected = selectedLevelIndex === i;

    // Check if this is the "Next Battle" (first unlocked but uncompleted level)
    const isNextBattle = unlocked && stars === 0 && (i === 0 || (save.levelStars[levels[i - 1].id] || 0) > 0);

    drawLevelStageMarker(ctx, pos.x, pos.y, i + 1, level.name, unlocked, stars, isHovered, isSelected, isNextBattle, time);
  }

  // 5. Top Bar (Wood plank, Total Stars, Back button, Sound button)
  drawWorldMapTopBar(ctx, mousePos, save.totalStars, audioMuted);

  // 6. Stage Briefing Scroll Modal (if a level is clicked/selected)
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

// ─── Static Parchment Map Generation (Cached) ─────────────────────

function renderStaticParchmentBase(ctx: CanvasRenderingContext2D, levels: LevelData[]): void {
  // Base antiqued parchment gradient (warm sepia / aged vellum)
  const bgGrad = ctx.createRadialGradient(
    DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.45, 100,
    DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.5, DESIGN_WIDTH * 0.75
  );
  bgGrad.addColorStop(0, '#f5e6c8');
  bgGrad.addColorStop(0.5, '#edd5ad');
  bgGrad.addColorStop(0.85, '#d9b982');
  bgGrad.addColorStop(1, '#b88d52'); // Burnt / weathered edges
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  // Subtle paper grain & crease lines
  ctx.fillStyle = 'rgba(120, 80, 30, 0.03)';
  for (let i = 0; i < 6000; i++) {
    const rx = Math.random() * DESIGN_WIDTH;
    const ry = Math.random() * DESIGN_HEIGHT;
    ctx.fillRect(rx, ry, Math.random() * 2 + 1, Math.random() * 2 + 1);
  }

  // Vintage fold creases
  ctx.strokeStyle = 'rgba(100, 60, 20, 0.08)';
  ctx.lineWidth = 1.5;
  // Vertical fold
  ctx.beginPath();
  ctx.moveTo(DESIGN_WIDTH * 0.33, 0);
  ctx.bezierCurveTo(DESIGN_WIDTH * 0.33 + 5, 250, DESIGN_WIDTH * 0.33 - 5, 450, DESIGN_WIDTH * 0.33, DESIGN_HEIGHT);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(DESIGN_WIDTH * 0.67, 0);
  ctx.bezierCurveTo(DESIGN_WIDTH * 0.67 - 6, 200, DESIGN_WIDTH * 0.67 + 8, 500, DESIGN_WIDTH * 0.67, DESIGN_HEIGHT);
  ctx.stroke();
  // Horizontal fold
  ctx.beginPath();
  ctx.moveTo(0, DESIGN_HEIGHT * 0.5);
  ctx.bezierCurveTo(350, DESIGN_HEIGHT * 0.5 + 4, 850, DESIGN_HEIGHT * 0.5 - 6, DESIGN_WIDTH, DESIGN_HEIGHT * 0.5);
  ctx.stroke();

  // Tea/Coffee ring water stains
  drawParchmentStain(ctx, 220, 180, 65);
  drawParchmentStain(ctx, 960, 580, 80);

  // Coastlines & Ocean (South & South-East Sea of Storms)
  drawOceanCoastline(ctx);

  // Mountain Ranges (North & North-East Jagged Peaks)
  drawMountainRanges(ctx);

  // River Chasm (Flows through Level 3 Broken Bridge)
  drawRiverChasm(ctx);

  // Forest Patches (Pine clusters near Level 2 & Swamp trees near Level 4)
  drawForestPatches(ctx);

  // Ornate Compass Rose (Top-Left corner)
  drawCompassRose(ctx, 110, 140, 60);

  // Sea Monster / Leviathan illustration in ocean
  drawSeaMonster(ctx, 480, 620);

  // Realm Banner & Cartographer Note
  drawCartographerNote(ctx);

  // Darkened burned border frame
  drawBurnedMapFrame(ctx);
}

function drawParchmentStain(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(140, 90, 30, 0.08)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(150, 100, 40, 0.03)';
  ctx.fill();
  ctx.restore();
}

function drawBurnedMapFrame(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  // Outer burnt vignette
  const grad = ctx.createRadialGradient(
    DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, DESIGN_HEIGHT * 0.35,
    DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, DESIGN_WIDTH * 0.72
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.75, 'rgba(60,30,10,0.15)');
  grad.addColorStop(1, 'rgba(30,15,5,0.65)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  // Ornate double ink border with corner flourishes
  ctx.strokeStyle = '#5a3818';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, DESIGN_WIDTH - 32, DESIGN_HEIGHT - 32);
  ctx.lineWidth = 1;
  ctx.strokeRect(22, 22, DESIGN_WIDTH - 44, DESIGN_HEIGHT - 44);

  // Corner fleur-de-lis / corner brackets
  const corners = [
    { x: 22, y: 22 },
    { x: DESIGN_WIDTH - 22, y: 22 },
    { x: 22, y: DESIGN_HEIGHT - 22 },
    { x: DESIGN_WIDTH - 22, y: DESIGN_HEIGHT - 22 },
  ];
  corners.forEach(c => {
    ctx.fillStyle = '#6b431e';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawOceanCoastline(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  // Coastline path
  ctx.fillStyle = '#c7b282'; // Pale sand coast
  ctx.beginPath();
  ctx.moveTo(0, DESIGN_HEIGHT);
  ctx.lineTo(0, 560);
  ctx.bezierCurveTo(150, 580, 260, 530, 380, 570);
  ctx.bezierCurveTo(520, 620, 680, 580, 780, 640);
  ctx.bezierCurveTo(880, 700, 1050, 610, DESIGN_WIDTH, 630);
  ctx.lineTo(DESIGN_WIDTH, DESIGN_HEIGHT);
  ctx.closePath();
  ctx.fill();

  // Water hatching ripples
  ctx.strokeStyle = 'rgba(70, 110, 130, 0.25)';
  ctx.lineWidth = 1.5;
  for (let y = 590; y < DESIGN_HEIGHT - 30; y += 18) {
    for (let x = 40; x < DESIGN_WIDTH - 60; x += 110) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 15, y - 4, x + 30, y);
      ctx.stroke();
    }
  }

  // Ocean Title
  ctx.font = 'italic 16px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = 'rgba(60, 80, 95, 0.45)';
  ctx.textAlign = 'center';
  ctx.fillText('~  THE SOUTHERN SEA OF SERPENTS  ~', 580, 685);
  ctx.restore();
}

function drawMountainRanges(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  // Ridge 1: North mountains behind Level 1 & 2
  drawMountainCluster(ctx, 280, 160, 12, 45);
  drawMountainCluster(ctx, 480, 130, 10, 55);

  // Ridge 2: Craggy Volcanic Peaks behind Level 5 Warlord's Gate
  drawMountainCluster(ctx, 1020, 120, 8, 70, true);
  drawMountainCluster(ctx, 1180, 140, 9, 60, true);

  // Mountain title
  ctx.font = 'italic 14px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = 'rgba(90, 50, 20, 0.4)';
  ctx.textAlign = 'center';
  ctx.fillText('CRAGGY HORN PEAKS', 380, 95);
  ctx.fillText('THE DOOM SPIRES', 1100, 75);
  ctx.restore();
}

function drawMountainCluster(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  count: number,
  avgHeight: number,
  isVolcanic = false
): void {
  for (let i = 0; i < count; i++) {
    const mx = cx + (i - count / 2) * (avgHeight * 0.7) + (Math.sin(i * 3) * 15);
    const my = cy + Math.cos(i * 2) * 10;
    const h = avgHeight * (0.8 + Math.sin(i * 5) * 0.3);
    const w = h * 0.9;

    // Mountain body
    ctx.beginPath();
    ctx.moveTo(mx, my - h);
    ctx.lineTo(mx + w, my);
    ctx.lineTo(mx - w, my);
    ctx.closePath();

    ctx.fillStyle = isVolcanic ? '#a88975' : '#cbb596';
    ctx.fill();

    // Shaded right side (pen hatching shadow)
    ctx.beginPath();
    ctx.moveTo(mx, my - h);
    ctx.lineTo(mx + w, my);
    ctx.lineTo(mx, my);
    ctx.closePath();
    ctx.fillStyle = isVolcanic ? 'rgba(60, 30, 20, 0.28)' : 'rgba(90, 60, 30, 0.22)';
    ctx.fill();

    // Pen stroke outline
    ctx.strokeStyle = '#5a3818';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(mx - w, my);
    ctx.lineTo(mx, my - h);
    ctx.lineTo(mx + w, my);
    ctx.stroke();

    // Ridge line down center
    ctx.beginPath();
    ctx.moveTo(mx, my - h);
    ctx.lineTo(mx + (i % 2 === 0 ? 3 : -3), my);
    ctx.stroke();
  }
}

function drawRiverChasm(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  // Winding river cutting vertically through Level 3
  ctx.strokeStyle = '#8ca8b0';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(680, 0);
  ctx.bezierCurveTo(630, 180, 710, 320, 640, 480);
  ctx.bezierCurveTo(590, 560, 670, 630, 650, 720);
  ctx.stroke();

  // River water highlights & ink edge
  ctx.strokeStyle = 'rgba(50, 70, 90, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawForestPatches(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  // Forest cluster around Level 2
  drawTreeCluster(ctx, 360, 240, 16, '#566e41');
  drawTreeCluster(ctx, 470, 290, 14, '#4c6437');

  // Dark Swamp mangroves around Level 4
  drawTreeCluster(ctx, 830, 240, 12, '#485542');
  drawTreeCluster(ctx, 940, 370, 15, '#3e4c39');
  ctx.restore();
}

function drawTreeCluster(ctx: CanvasRenderingContext2D, cx: number, cy: number, count: number, color: string): void {
  for (let i = 0; i < count; i++) {
    const tx = cx + Math.sin(i * 2.3) * 45;
    const ty = cy + Math.cos(i * 1.7) * 35;
    const r = 8 + (i % 4) * 2;

    // Trunk
    ctx.strokeStyle = '#4a2f16';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx, ty + 6);
    ctx.stroke();

    // Canopy
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(tx, ty - 2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2d3b20';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

function drawCompassRose(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.save();
  // Outer rings
  ctx.strokeStyle = '#7a4e22';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
  ctx.stroke();

  // 8 Points of Compass
  const points = 8;
  for (let i = 0; i < points; i++) {
    const ang = (Math.PI * 2 * i) / points - Math.PI / 2;
    const isCardinal = i % 2 === 0;
    const pLen = isCardinal ? r : r * 0.65;
    const baseW = isCardinal ? 8 : 5;

    const tipX = cx + Math.cos(ang) * pLen;
    const tipY = cy + Math.sin(ang) * pLen;

    const perpAng = ang + Math.PI / 2;
    const b1x = cx + Math.cos(perpAng) * baseW;
    const b1y = cy + Math.sin(perpAng) * baseW;
    const b2x = cx - Math.cos(perpAng) * baseW;
    const b2y = cy - Math.sin(perpAng) * baseW;

    // Dark half
    ctx.fillStyle = isCardinal ? '#6d261b' : '#5a3818';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(b1x, b1y);
    ctx.closePath();
    ctx.fill();

    // Light half
    ctx.fillStyle = isCardinal ? '#d4af37' : '#cbb596';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(b2x, b2y);
    ctx.closePath();
    ctx.fill();
  }

  // Cardinal letters (N, S, E, W)
  ctx.font = 'bold 13px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = '#5a2d12';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', cx, cy - r - 12);
  ctx.fillText('S', cx, cy + r + 12);
  ctx.fillText('E', cx + r + 12, cy);
  ctx.fillText('W', cx - r - 12, cy);
  ctx.restore();
}

function drawSeaMonster(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.strokeStyle = '#4a6070';
  ctx.lineWidth = 1.8;
  ctx.fillStyle = 'rgba(74, 96, 112, 0.15)';

  // Serpent coils emerging from water
  ctx.beginPath();
  // Coil 1
  ctx.arc(cx - 30, cy, 20, Math.PI, 0);
  // Coil 2
  ctx.arc(cx + 25, cy - 5, 26, Math.PI, 0);
  ctx.stroke();

  // Monster Head & Horns
  ctx.beginPath();
  ctx.moveTo(cx + 60, cy - 2);
  ctx.quadraticCurveTo(cx + 70, cy - 35, cx + 85, cy - 30);
  ctx.lineTo(cx + 95, cy - 32); // Snout
  ctx.lineTo(cx + 88, cy - 22); // Jaw
  ctx.quadraticCurveTo(cx + 78, cy - 10, cx + 75, cy);
  ctx.stroke();
  ctx.fill();

  // Eye & Fangs
  ctx.fillStyle = '#6d261b';
  ctx.beginPath();
  ctx.arc(cx + 82, cy - 28, 2, 0, Math.PI * 2);
  ctx.fill();

  // Water splash ripples around coils
  ctx.strokeStyle = 'rgba(80, 120, 140, 0.4)';
  ctx.lineWidth = 1;
  [-30, 25, 68].forEach(ox => {
    ctx.beginPath();
    ctx.arc(cx + ox, cy + 2, 14, 0, Math.PI);
    ctx.stroke();
  });
  ctx.restore();
}

function drawCartographerNote(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.textAlign = 'right';
  ctx.font = 'italic 12px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = 'rgba(80, 50, 20, 0.55)';
  ctx.fillText('Realm of Valoria • Royal Cartographer Sir Ethan', DESIGN_WIDTH - 40, DESIGN_HEIGHT - 35);
  ctx.restore();
}

// ─── Dynamic World Map Layer (Animated & Interactive) ─────────────

function drawAnimatedOceanDetails(ctx: CanvasRenderingContext2D, time: number): void {
  // Gentle shimmer on water
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const x = 200 + i * 140 + Math.sin(time * 0.8 + i) * 15;
    const y = 620 + (i % 3) * 25;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 20, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCampaignPath(ctx: CanvasRenderingContext2D, levels: LevelData[], save: SaveData, time: number): void {
  const nodes = getLevelNodePositions(levels.length);
  ctx.save();

  // Connect level nodes with curved dashed dirt road
  for (let i = 0; i < nodes.length - 1; i++) {
    const p1 = nodes[i];
    const p2 = nodes[i + 1];
    const isUnlocked = i === 0 || !!save.levelStars[levels[i].id];

    // Control point for natural curve
    const cpx = (p1.x + p2.x) / 2;
    const cpy = (p1.y + p2.y) / 2 - 40;

    // Path Shadow
    ctx.strokeStyle = 'rgba(60, 30, 10, 0.18)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y + 2);
    ctx.quadraticCurveTo(cpx, cpy + 2, p2.x, p2.y + 2);
    ctx.stroke();

    // Dotted ink path
    ctx.setLineDash([8, 7]);
    ctx.lineDashOffset = isUnlocked ? -time * 15 : 0;
    ctx.strokeStyle = isUnlocked ? '#8b4513' : '#6b584a';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(cpx, cpy, p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
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
  time: number
): void {
  ctx.save();

  // If this is the active current frontier battle, draw pulsing golden beacon ring
  if (isNextBattle) {
    const pulse = (Math.sin(time * 3) + 1) * 0.5;
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.4 + pulse * 0.5})`;
    ctx.lineWidth = 3 + pulse * 4;
    ctx.beginPath();
    ctx.arc(x, y, 40 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();

    // "NEXT BATTLE" ribbon badge floating on top
    drawNextBattleRibbon(ctx, x, y - 56, time);
  }

  // Ground drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + 26, 28, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Flag pole & banner on top of stage marker
  if (unlocked) {
    drawStageFlag(ctx, x + 16, y - 18, stars > 0, time + stageNum);
  }

  // Wooden Carved Heraldic Shield Marker
  const shieldScale = hovered || selected ? 1.12 : 1.0;
  ctx.translate(x, y);
  ctx.scale(shieldScale, shieldScale);

  // Outer rim (Iron or Gold)
  ctx.fillStyle = unlocked ? (hovered ? '#f1c40f' : '#b8860b') : '#4a4a4a';
  drawShieldShape(ctx, 0, 0, 26, 32);
  ctx.fill();

  // Inner field (Crimson or Stone grey)
  ctx.fillStyle = unlocked ? (stars > 0 ? '#8b0000' : '#2c3e50') : '#2f3542';
  drawShieldShape(ctx, 0, 0, 22, 28);
  ctx.fill();

  // Border stroke
  ctx.strokeStyle = unlocked ? '#ffd700' : '#1e272e';
  ctx.lineWidth = 2;
  drawShieldShape(ctx, 0, 0, 22, 28);
  ctx.stroke();

  // Studs / Rivets
  ctx.fillStyle = unlocked ? '#fff2a8' : '#747d8c';
  [-14, 14].forEach(sx => {
    ctx.beginPath();
    ctx.arc(sx, -10, 2, 0, Math.PI * 2);
    ctx.arc(sx * 0.7, 14, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  if (unlocked) {
    // Stage Number
    ctx.font = 'bold 22px "MedievalSharp", Georgia, serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(`${stageNum}`, 0, 2);
    ctx.shadowBlur = 0;
  } else {
    // Heavy Iron Padlock Icon
    drawIronPadlock(ctx, 0, 0);
  }

  ctx.restore();

  // Stage Title Banner below shield
  ctx.save();
  ctx.font = 'bold 14px "MedievalSharp", Georgia, serif';
  ctx.textAlign = 'center';

  // Text shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillText(stageName, x + 1, y + 46);

  ctx.fillStyle = unlocked ? (hovered ? '#ffeb3b' : '#3d2314') : '#7f8c8d';
  ctx.fillText(stageName, x, y + 45);

  // 3-Star Ribbon below stage title
  if (unlocked && stars > 0) {
    for (let s = 0; s < 3; s++) {
      const starX = x - 20 + s * 20;
      const starY = y + 62;
      drawMiniStar(ctx, starX, starY, 7, s < stars);
    }
  }
  ctx.restore();
}

function drawShieldShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(cx - w, cy - h * 0.7);
  ctx.lineTo(cx + w, cy - h * 0.7);
  ctx.lineTo(cx + w, cy + h * 0.1);
  ctx.quadraticCurveTo(cx + w, cy + h * 0.7, cx, cy + h);
  ctx.quadraticCurveTo(cx - w, cy + h * 0.7, cx - w, cy + h * 0.1);
  ctx.closePath();
}

function drawStageFlag(ctx: CanvasRenderingContext2D, px: number, py: number, victory: boolean, t: number): void {
  ctx.save();
  // Flagpole
  ctx.strokeStyle = '#5a3818';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(px, py + 20);
  ctx.lineTo(px, py - 26);
  ctx.stroke();

  // Gold pole finial ball
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(px, py - 26, 3, 0, Math.PI * 2);
  ctx.fill();

  // Swallowtail fluttering flag
  const flap = Math.sin(t * 4) * 4;
  ctx.fillStyle = victory ? '#27ae60' : '#e74c3c';
  ctx.beginPath();
  ctx.moveTo(px, py - 24);
  ctx.quadraticCurveTo(px + 12 + flap, py - 22, px + 24 + flap, py - 20);
  ctx.lineTo(px + 18 + flap, py - 12); // Notch
  ctx.lineTo(px + 24 + flap, py - 4);
  ctx.quadraticCurveTo(px + 12, py - 6, px, py - 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawNextBattleRibbon(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  ctx.save();
  const bounce = Math.sin(time * 4) * 3;
  ctx.translate(x, y + bounce);

  // Red velvet banner
  ctx.fillStyle = '#b71515';
  ctx.beginPath();
  ctx.moveTo(-45, -10);
  ctx.lineTo(45, -10);
  ctx.lineTo(40, 10);
  ctx.lineTo(-40, 10);
  ctx.closePath();
  ctx.fill();

  // Gold border
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Banner text
  ctx.font = 'bold 10px "Inter", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚔ NEXT BATTLE', 0, 0);
  ctx.restore();
}

function drawIronPadlock(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  // Shackle
  ctx.strokeStyle = '#95a5a6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy - 6, 7, Math.PI, 0);
  ctx.stroke();

  // Lock Body
  ctx.fillStyle = '#7f8c8d';
  ctx.fillRect(cx - 9, cy - 3, 18, 14);
  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - 9, cy - 3, 18, 14);

  // Keyhole
  ctx.fillStyle = '#1e272e';
  ctx.beginPath();
  ctx.arc(cx, cy + 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 1, cy + 2, 2, 4);
  ctx.restore();
}

function drawMiniStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, filled: boolean): void {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const ang = (Math.PI * i) / 5 - Math.PI / 2;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  if (filled) {
    const grad = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    grad.addColorStop(0, '#ffeaa7');
    grad.addColorStop(1, '#f39c12');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(80, 80, 80, 0.4)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(40, 40, 40, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

// ─── Stage Briefing Scroll Modal ─────────────────────────────────

export function drawStageBriefingModal(
  ctx: CanvasRenderingContext2D,
  level: LevelData,
  stageIndex: number,
  stars: number,
  mousePos: Vec2,
  time: number
): void {
  ctx.save();
  // Dim overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  const modalW = 540;
  const modalH = 430;
  const mx = (DESIGN_WIDTH - modalW) / 2;
  const my = (DESIGN_HEIGHT - modalH) / 2;

  // Parchment Scroll Body
  // Top and bottom wooden scroll dowels
  drawScrollDowel(ctx, mx - 20, my - 12, modalW + 40, 24);
  drawScrollDowel(ctx, mx - 20, my + modalH - 12, modalW + 40, 24);

  // Parchment paper sheet
  const paperGrad = ctx.createLinearGradient(mx, my, mx + modalW, my + modalH);
  paperGrad.addColorStop(0, '#fef5e7');
  paperGrad.addColorStop(0.5, '#faebd7');
  paperGrad.addColorStop(1, '#f0d9b5');
  ctx.fillStyle = paperGrad;
  ctx.fillRect(mx, my, modalW, modalH);

  // Scroll borders & subtle creases
  ctx.strokeStyle = '#8b5a2b';
  ctx.lineWidth = 2;
  ctx.strokeRect(mx + 6, my + 6, modalW - 12, modalH - 12);
  ctx.strokeStyle = 'rgba(139, 90, 43, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + 10, my + 10, modalW - 20, modalH - 20);

  // Royal Crest Wax Seal at top center
  drawRoyalWaxSeal(ctx, DESIGN_WIDTH / 2, my + 24);

  // Stage Header
  ctx.font = 'bold 26px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = '#4a2505';
  ctx.textAlign = 'center';
  ctx.fillText(`Stage ${stageIndex}: ${level.name}`, DESIGN_WIDTH / 2, my + 72);

  // Stars display
  for (let s = 0; s < 3; s++) {
    drawMiniStar(ctx, DESIGN_WIDTH / 2 - 28 + s * 28, my + 102, 11, s < stars);
  }

  // Divider ribbon
  ctx.strokeStyle = '#a67c52';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(mx + 50, my + 124);
  ctx.lineTo(mx + modalW - 50, my + 124);
  ctx.stroke();

  // Stage Lore & Strategy Briefing
  ctx.font = 'italic 15px "Inter", serif';
  ctx.fillStyle = '#3e2714';
  ctx.textAlign = 'center';
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

  const info = briefings[level.id] || {
    lore: 'Defend the fortress and drive back the invading hordes!',
    enemyHint: 'Multiple enemy types approaching',
  };

  ctx.fillText(`"${info.lore}"`, DESIGN_WIDTH / 2, my + 155);

  // Intel Pills: Starting Gold, Lives, Waves
  const pillsY = my + 200;
  drawIntelPill(ctx, mx + 50, pillsY, 130, 40, `💰 ${level.startingGold} Gold`);
  drawIntelPill(ctx, mx + 205, pillsY, 130, 40, `🛡 ${level.startingLives} Lives`);
  drawIntelPill(ctx, mx + 360, pillsY, 130, 40, `⚔ ${level.waves.length} Waves`);

  // Enemy Intel Banner
  ctx.font = 'bold 14px "Inter", sans-serif';
  ctx.fillStyle = '#8b0000';
  ctx.fillText(info.enemyHint, DESIGN_WIDTH / 2, my + 275);

  // Large Stamped Wax "TO BATTLE!" Button
  const btnW = 220;
  const btnH = 55;
  const btnX = DESIGN_WIDTH / 2 - btnW / 2;
  const btnY = my + 320;
  const btnHover = mousePos.x >= btnX && mousePos.x <= btnX + btnW && mousePos.y >= btnY && mousePos.y <= btnY + btnH;

  drawToBattleButton(ctx, btnX, btnY, btnW, btnH, btnHover, time);

  // Close "✕" Button in top-right of modal
  const closeX = mx + modalW - 32;
  const closeY = my + 22;
  const closeHover = Math.hypot(mousePos.x - closeX, mousePos.y - closeY) < 16;
  ctx.fillStyle = closeHover ? '#e74c3c' : '#7f8c8d';
  ctx.beginPath();
  ctx.arc(closeX, closeY, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✕', closeX, closeY);

  ctx.restore();
}

function drawScrollDowel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.save();
  // Wood grain gradient
  const dowelGrad = ctx.createLinearGradient(x, y, x, y + h);
  dowelGrad.addColorStop(0, '#5a3818');
  dowelGrad.addColorStop(0.3, '#8b5a2b');
  dowelGrad.addColorStop(0.7, '#6b431e');
  dowelGrad.addColorStop(1, '#3e240f');
  ctx.fillStyle = dowelGrad;

  // Round dowel ends
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();

  // Gold brass end caps
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(x, y, 14, h);
  ctx.fillRect(x + w - 14, y, 14, h);
  ctx.restore();
}

function drawRoyalWaxSeal(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.fillStyle = '#a81c1c';
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#801010';
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fill();

  // Gold Crown impression
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy + 4);
  ctx.lineTo(cx + 7, cy + 4);
  ctx.lineTo(cx + 8, cy - 2);
  ctx.lineTo(cx + 4, cy);
  ctx.lineTo(cx, cy - 5);
  ctx.lineTo(cx - 4, cy);
  ctx.lineTo(cx - 8, cy - 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawIntelPill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, text: string): void {
  ctx.save();
  ctx.fillStyle = 'rgba(235, 215, 180, 0.8)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = '#b89467';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = 'bold 15px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = '#4a2505';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.restore();
}

function drawToBattleButton(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  hovered: boolean,
  time: number
): void {
  ctx.save();
  // Button drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 4, w, h, 8);
  ctx.fill();

  // Medieval red wax / wood gradient
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  if (hovered) {
    grad.addColorStop(0, '#e74c3c');
    grad.addColorStop(0.5, '#c0392b');
    grad.addColorStop(1, '#962d22');
  } else {
    grad.addColorStop(0, '#c0392b');
    grad.addColorStop(0.5, '#a93226');
    grad.addColorStop(1, '#78281f');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();

  // Golden filigree border
  ctx.strokeStyle = hovered ? '#ffeaa7' : '#f1c40f';
  ctx.lineWidth = hovered ? 3 : 2;
  ctx.stroke();

  // Sheen animation across button
  if (hovered) {
    const sheenX = x + ((time * 250) % (w * 1.5));
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.clip();
    const sGrad = ctx.createLinearGradient(sheenX - 30, y, sheenX + 30, y);
    sGrad.addColorStop(0, 'rgba(255,255,255,0)');
    sGrad.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    sGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sGrad;
    ctx.fillRect(sheenX - 30, y, 60, h);
    ctx.restore();
  }

  // Label
  ctx.font = 'bold 20px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText('⚔  TO BATTLE!  ⚔', x + w / 2, y + h / 2);
  ctx.restore();
}

function drawWorldMapTopBar(
  ctx: CanvasRenderingContext2D,
  mousePos: Vec2,
  totalStars: number,
  audioMuted: boolean
): void {
  ctx.save();
  // Carved wooden plank banner across top
  const h = 56;
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#3e240f');
  bgGrad.addColorStop(0.5, '#5a3818');
  bgGrad.addColorStop(1, '#2c1809');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, DESIGN_WIDTH, h);

  // Gold trim bottom border
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(DESIGN_WIDTH, h);
  ctx.stroke();

  // Brass corner rivets
  ctx.fillStyle = '#ffd700';
  for (let x = 30; x < DESIGN_WIDTH; x += 120) {
    ctx.beginPath();
    ctx.arc(x, h - 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // "← MENU" Wooden Button (Left)
  const backHover = mousePos.x >= 20 && mousePos.x <= 130 && mousePos.y >= 10 && mousePos.y <= 46;
  drawSmallWoodButton(ctx, 20, 10, 110, 36, '← MENU', backHover);

  // Campaign Title (Center)
  ctx.font = 'bold 26px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = '#ffd866';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 6;
  ctx.fillText('⚔  KINGDOM CAMPAIGN  ⚔', DESIGN_WIDTH / 2, h / 2);
  ctx.shadowBlur = 0;

  // Total Stars Counter (Right)
  const starMedalX = DESIGN_WIDTH - 190;
  drawMiniStar(ctx, starMedalX, h / 2, 13, true);
  ctx.font = 'bold 20px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'left';
  ctx.fillText(`${totalStars} / 15`, starMedalX + 20, h / 2);

  // Sound Button (Far Right)
  const soundHover = mousePos.x >= DESIGN_WIDTH - 70 && mousePos.x <= DESIGN_WIDTH - 20 && mousePos.y >= 10 && mousePos.y <= 46;
  drawSmallWoodButton(ctx, DESIGN_WIDTH - 70, 10, 50, 36, audioMuted ? '🔇' : '🔊', soundHover);

  ctx.restore();
}

function drawSmallWoodButton(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  text: string,
  hovered: boolean
): void {
  ctx.save();
  ctx.fillStyle = hovered ? '#8b5a2b' : '#5a3818';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = hovered ? '#ffd700' : '#8b6914';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = 'bold 15px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = hovered ? '#ffffff' : '#f0e6d2';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.restore();
}

// ─── Epic Kingdom Rush Title Screen (Main Menu) ───────────────────

export function drawEpicTitleScreen(
  ctx: CanvasRenderingContext2D,
  time: number,
  mousePos: Vec2,
  audioMuted: boolean,
  activeLoreModal: boolean
): void {
  ctx.save();

  // 1. Night Sky with Moonlight & Drifting Clouds
  const skyGrad = ctx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
  skyGrad.addColorStop(0, '#0a0d1a');
  skyGrad.addColorStop(0.4, '#131b2e');
  skyGrad.addColorStop(0.8, '#1e293b');
  skyGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  // Full Moon with Soft Bloom
  const moonX = DESIGN_WIDTH * 0.78;
  const moonY = 120;
  const moonGrad = ctx.createRadialGradient(moonX, moonY, 15, moonX, moonY, 140);
  moonGrad.addColorStop(0, 'rgba(255, 255, 240, 0.95)');
  moonGrad.addColorStop(0.2, 'rgba(255, 250, 220, 0.6)');
  moonGrad.addColorStop(0.6, 'rgba(180, 200, 240, 0.15)');
  moonGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 140, 0, Math.PI * 2);
  ctx.fill();

  // Moon surface
  ctx.fillStyle = '#fffef0';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 40, 0, Math.PI * 2);
  ctx.fill();

  // Night Clouds
  drawNightClouds(ctx, time);

  // 2. Mighty Bastion Fortress Ramparts & Stone Battlements
  drawFortressRamparts(ctx, time);

  // 3. Flaming Stone Braziers with Floating Embers
  drawBrazier(ctx, 160, DESIGN_HEIGHT - 170, time);
  drawBrazier(ctx, DESIGN_WIDTH - 160, DESIGN_HEIGHT - 170, time + 2);

  // Floating orange sparks/embers
  drawFloatingEmbers(ctx, time);

  // 4. Grand Centerpiece: Royal Crest, Broadswords & "LAST BASTION" Ribbon
  drawTitleHeraldicCrest(ctx, time);

  // 5. Kingdom Rush Carved Wooden Buttons
  // "⚔ TO BATTLE"
  const playX = DESIGN_WIDTH / 2 - 130;
  const playY = DESIGN_HEIGHT / 2 + 80;
  const playHover = mousePos.x >= playX && mousePos.x <= playX + 260 && mousePos.y >= playY && mousePos.y <= playY + 56;
  drawMenuWoodButton(ctx, playX, playY, 260, 56, '⚔  TO BATTLE  ⚔', playHover, true);

  // "📜 LORE & BESTIARY"
  const loreX = DESIGN_WIDTH / 2 - 130;
  const loreY = playY + 68;
  const loreHover = mousePos.x >= loreX && mousePos.x <= loreX + 260 && mousePos.y >= loreY && mousePos.y <= loreY + 46;
  drawMenuWoodButton(ctx, loreX, loreY, 260, 46, '📜  BESTIARY & LORE', loreHover, false);

  // "🔊 SOUND TOGGLE" (Top-right)
  const soundHover = mousePos.x >= DESIGN_WIDTH - 80 && mousePos.x <= DESIGN_WIDTH - 24 && mousePos.y >= 20 && mousePos.y <= 60;
  drawMenuWoodButton(ctx, DESIGN_WIDTH - 80, 20, 56, 40, audioMuted ? '🔇' : '🔊', soundHover, false);

  // 6. Version & Subtitle Ribbon at bottom
  ctx.font = '13px "Inter", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.textAlign = 'center';
  ctx.fillText('v1.0 Kingdom Edition • Built with Procedural Canvas & Web Audio', DESIGN_WIDTH / 2, DESIGN_HEIGHT - 22);

  // 7. Lore & Bestiary Modal if open
  if (activeLoreModal) {
    drawLoreBestiaryModal(ctx, mousePos);
  }

  ctx.restore();
}

function drawNightClouds(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(25, 35, 55, 0.45)';
  for (let i = 0; i < 4; i++) {
    const cx = ((i * 380 + time * 12) % (DESIGN_WIDTH + 300)) - 150;
    const cy = 90 + (i % 2) * 50;
    ctx.beginPath();
    ctx.arc(cx, cy, 70, 0, Math.PI * 2);
    ctx.arc(cx + 60, cy - 20, 90, 0, Math.PI * 2);
    ctx.arc(cx + 140, cy, 65, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFortressRamparts(ctx: CanvasRenderingContext2D, _time: number): void {
  ctx.save();
  // Distant mountain silhouettes
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(0, DESIGN_HEIGHT);
  ctx.lineTo(0, 360);
  ctx.lineTo(250, 290);
  ctx.lineTo(550, 340);
  ctx.lineTo(820, 270);
  ctx.lineTo(1100, 330);
  ctx.lineTo(DESIGN_WIDTH, 280);
  ctx.lineTo(DESIGN_WIDTH, DESIGN_HEIGHT);
  ctx.closePath();
  ctx.fill();

  // Heavy stone battlement wall spanning the bottom
  const wallTop = DESIGN_HEIGHT - 200;
  const wallGrad = ctx.createLinearGradient(0, wallTop, 0, DESIGN_HEIGHT);
  wallGrad.addColorStop(0, '#334155');
  wallGrad.addColorStop(0.3, '#1e293b');
  wallGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, wallTop, DESIGN_WIDTH, DESIGN_HEIGHT - wallTop);

  // Crenellations on wall top
  const crenW = 48;
  const crenH = 32;
  const gapW = 32;
  for (let x = 0; x < DESIGN_WIDTH; x += crenW + gapW) {
    ctx.fillRect(x, wallTop - crenH, crenW, crenH);
  }

  // Heavy Iron-banded fortress portcullis in background center
  const gateW = 280;
  const gateH = 220;
  const gx = DESIGN_WIDTH / 2 - gateW / 2;
  const gy = wallTop - 10;

  // Stone arch
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(gx - 20, gy - 20, gateW + 40, gateH + 20, [30, 30, 0, 0]);
  ctx.fill();

  // Dark doorway
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.roundRect(gx, gy, gateW, gateH, [20, 20, 0, 0]);
  ctx.fill();

  // Iron vertical portcullis bars
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 5;
  for (let bx = gx + 25; bx < gx + gateW - 10; bx += 28) {
    ctx.beginPath();
    ctx.moveTo(bx, gy);
    ctx.lineTo(bx, gy + gateH);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBrazier(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number): void {
  ctx.save();
  // Stone Pillar
  ctx.fillStyle = '#475569';
  ctx.fillRect(cx - 18, cy, 36, 120);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(cx - 24, cy, 48, 14);

  // Iron Fire Bowl
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(cx - 35, cy);
  ctx.lineTo(cx + 35, cy);
  ctx.lineTo(cx + 24, cy + 24);
  ctx.lineTo(cx - 24, cy + 24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Fire Glow
  const glowGrad = ctx.createRadialGradient(cx, cy - 20, 5, cx, cy - 20, 90);
  glowGrad.addColorStop(0, 'rgba(255, 160, 0, 0.8)');
  glowGrad.addColorStop(0.4, 'rgba(230, 80, 0, 0.4)');
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(cx, cy - 20, 90, 0, Math.PI * 2);
  ctx.fill();

  // Animated procedural fire flames
  for (let f = 0; f < 5; f++) {
    const flameH = 45 + Math.sin(time * 8 + f * 1.5) * 12;
    const flameW = 12 + Math.cos(time * 6 + f) * 4;
    const fx = cx + (f - 2) * 8 + Math.sin(time * 5 + f) * 3;

    ctx.fillStyle = f % 2 === 0 ? '#ff4500' : '#ffa500';
    ctx.beginPath();
    ctx.moveTo(fx - flameW, cy);
    ctx.quadraticCurveTo(fx, cy - flameH * 0.7, fx, cy - flameH);
    ctx.quadraticCurveTo(fx, cy - flameH * 0.7, fx + flameW, cy);
    ctx.closePath();
    ctx.fill();
  }

  // Inner yellow core
  ctx.fillStyle = '#ffff66';
  ctx.beginPath();
  ctx.arc(cx, cy - 10, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawFloatingEmbers(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.save();
  for (let i = 0; i < 40; i++) {
    const seed = i * 137.5;
    const x = (seed * 11 + time * 20) % DESIGN_WIDTH;
    const y = DESIGN_HEIGHT - ((seed * 7 + time * (40 + (i % 5) * 15)) % (DESIGN_HEIGHT * 0.7));
    const size = 1.5 + (i % 3);

    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 170, 0, 0.75)' : 'rgba(255, 70, 0, 0.6)';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTitleHeraldicCrest(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.save();
  const cx = DESIGN_WIDTH / 2;
  const cy = 190;
  const floatOffset = Math.sin(time * 1.5) * 5;

  ctx.translate(cx, cy + floatOffset);

  // 1. Dual Crossed Steel Broadswords behind shield
  drawCrossedSwords(ctx);

  // 2. Golden Shield Emblem
  // Gold bevel
  ctx.fillStyle = '#d4af37';
  drawShieldShape(ctx, 0, 0, 68, 85);
  ctx.fill();

  // Shield rim
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  drawShieldShape(ctx, 0, 0, 64, 80);
  ctx.stroke();

  // Inner quarters (Royal Crimson & Deep Sapphire)
  ctx.save();
  ctx.beginPath();
  drawShieldShape(ctx, 0, 0, 62, 78);
  ctx.clip();

  // Top-left & Bottom-right: Crimson
  ctx.fillStyle = '#8b0000';
  ctx.fillRect(-70, -90, 70, 90);
  ctx.fillRect(0, 0, 70, 90);

  // Top-right & Bottom-left: Sapphire
  ctx.fillStyle = '#104e8b';
  ctx.fillRect(0, -90, 70, 90);
  ctx.fillRect(-70, 0, 70, 90);

  // Golden Rampant Lion Crest
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(0, -10, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3. Royal Crown atop shield
  drawCrestCrown(ctx, 0, -82);

  // 4. Large Golden Ribbon Banner across the front
  drawTitleRibbon(ctx, 0, 42);

  ctx.restore();
}

function drawCrossedSwords(ctx: CanvasRenderingContext2D): void {
  [-1, 1].forEach(dir => {
    ctx.save();
    ctx.rotate((dir * Math.PI) / 4);

    // Blade
    const bladeGrad = ctx.createLinearGradient(-5, -160, 5, -160);
    bladeGrad.addColorStop(0, '#cbd5e1');
    bladeGrad.addColorStop(0.5, '#ffffff');
    bladeGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(0, -170);
    ctx.lineTo(8, -150);
    ctx.lineTo(6, 40);
    ctx.lineTo(-6, 40);
    ctx.lineTo(-8, -150);
    ctx.closePath();
    ctx.fill();

    // Crossguard
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(-24, 40, 48, 8);

    // Grip
    ctx.fillStyle = '#5c2c16';
    ctx.fillRect(-4, 48, 8, 28);

    // Pommel (Gold sphere)
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(0, 80, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawCrestCrown(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.moveTo(cx - 28, cy + 6);
  ctx.lineTo(cx + 28, cy + 6);
  ctx.lineTo(cx + 32, cy - 14);
  ctx.lineTo(cx + 16, cy - 6);
  ctx.lineTo(cx, cy - 20);
  ctx.lineTo(cx - 16, cy - 6);
  ctx.lineTo(cx - 32, cy - 14);
  ctx.closePath();
  ctx.fill();

  // Ruby jewels on crown tips
  ctx.fillStyle = '#e74c3c';
  [-28, 0, 28].forEach(ox => {
    ctx.beginPath();
    ctx.arc(cx + ox * 0.9, cy - 14 + Math.abs(ox) * 0.15, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawTitleRibbon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  const rw = 260;
  const rh = 46;

  // Ribbon tails (left & right folded swallowtails)
  ctx.fillStyle = '#8b5a2b';
  [-1, 1].forEach(dir => {
    ctx.beginPath();
    ctx.moveTo(cx + dir * rw, cy - 5);
    ctx.lineTo(cx + dir * (rw + 40), cy + 12);
    ctx.lineTo(cx + dir * rw, cy + rh + 8);
    ctx.closePath();
    ctx.fill();
  });

  // Main ribbon body
  const rGrad = ctx.createLinearGradient(cx - rw, cy, cx + rw, cy);
  rGrad.addColorStop(0, '#5a3818');
  rGrad.addColorStop(0.2, '#8b5a2b');
  rGrad.addColorStop(0.5, '#ad7539');
  rGrad.addColorStop(0.8, '#8b5a2b');
  rGrad.addColorStop(1, '#5a3818');
  ctx.fillStyle = rGrad;

  ctx.beginPath();
  ctx.roundRect(cx - rw, cy, rw * 2, rh, 8);
  ctx.fill();

  // Gold border
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 3D Embossed Title Typography
  ctx.font = 'bold 36px "MedievalSharp", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Deep shadow
  ctx.fillStyle = '#1e1106';
  ctx.fillText('⚔  LAST BASTION  ⚔', cx + 2, cy + rh / 2 + 2);

  // Shiny gold face
  ctx.fillStyle = '#ffd866';
  ctx.fillText('⚔  LAST BASTION  ⚔', cx, cy + rh / 2);

  // Subtitle ribbon beneath
  ctx.font = 'italic 15px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = '#e0c080';
  ctx.fillText('—  FRONTIERS OF THE REALM  —', cx, cy + rh + 22);

  ctx.restore();
}

function drawMenuWoodButton(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  text: string,
  hovered: boolean,
  isPrimary = false
): void {
  ctx.save();
  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 4, w, h, 8);
  ctx.fill();

  // Carved Wood Grain Gradient
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  if (isPrimary) {
    if (hovered) {
      grad.addColorStop(0, '#d35400');
      grad.addColorStop(0.5, '#e67e22');
      grad.addColorStop(1, '#b94600');
    } else {
      grad.addColorStop(0, '#c0392b');
      grad.addColorStop(0.5, '#d35400');
      grad.addColorStop(1, '#962d22');
    }
  } else {
    if (hovered) {
      grad.addColorStop(0, '#784d28');
      grad.addColorStop(0.5, '#996335');
      grad.addColorStop(1, '#613c1c');
    } else {
      grad.addColorStop(0, '#4e3118');
      grad.addColorStop(0.5, '#6b4320');
      grad.addColorStop(1, '#3b230e');
    }
  }

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();

  // Golden stud rivets at 4 corners
  ctx.fillStyle = hovered ? '#ffeaa7' : '#ffd700';
  [
    { rx: x + 8, ry: y + 8 },
    { rx: x + w - 8, ry: y + 8 },
    { rx: x + 8, ry: y + h - 8 },
    { rx: x + w - 8, ry: y + h - 8 },
  ].forEach(p => {
    ctx.beginPath();
    ctx.arc(p.rx, p.ry, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Border
  ctx.strokeStyle = hovered ? '#ffd700' : '#8b6914';
  ctx.lineWidth = hovered ? 2.5 : 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.stroke();

  // Text
  ctx.font = `bold ${isPrimary ? 20 : 16}px "MedievalSharp", Georgia, serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText(text, x + w / 2, y + h / 2);

  ctx.restore();
}

function drawLoreBestiaryModal(ctx: CanvasRenderingContext2D, mousePos: Vec2): void {
  ctx.save();
  // Dim overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  const w = 680;
  const h = 480;
  const x = (DESIGN_WIDTH - w) / 2;
  const y = (DESIGN_HEIGHT - h) / 2;

  // Antiqued Parchment Sheet
  ctx.fillStyle = '#faebd7';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();

  ctx.strokeStyle = '#8b5a2b';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Title
  ctx.font = 'bold 24px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = '#4a2505';
  ctx.textAlign = 'center';
  ctx.fillText('📖  KINGDOM BESTIARY & WAR ROOM  📖', DESIGN_WIDTH / 2, y + 42);

  // Lore Sections
  ctx.font = '14px "Inter", sans-serif';
  ctx.fillStyle = '#3e240f';
  ctx.textAlign = 'left';

  const loreItems = [
    { title: '🏹 ARCHER TOWERS', desc: 'Rapid fire bows with long range. Upgrades into Sharpshooters or Rapid Volley.' },
    { title: '🛡 BARRACKS SOLDIERS', desc: 'Spawns 2 armored infantry onto the road to halt advancing creeps in melee combat.' },
    { title: '⚡ MAGE TOWERS', desc: 'Pierces heavy iron armor with arcane bolts. Upgrades into Arcane Blast or Slow Hex.' },
    { title: '💣 CANNON TOWERS', desc: 'Lobs heavy explosive shells dealing area splash damage against swarms of goblins.' },
    { title: '🔥 GOD SPELLS', desc: 'Press [1] for Rain of Fire meteors; press [2] to summon emergency militia reinforcements.' },
    { title: '👹 ENEMY THREATS', desc: 'Dark Shamans heal allies, Trolls self-regenerate, and the Orc Warlord stuns towers!' },
  ];

  loreItems.forEach((item, idx) => {
    const iy = y + 80 + idx * 56;
    ctx.font = 'bold 15px "MedievalSharp", Georgia, serif';
    ctx.fillStyle = '#8b0000';
    ctx.fillText(item.title, x + 40, iy);

    ctx.font = '13px "Inter", sans-serif';
    ctx.fillStyle = '#2c1809';
    ctx.fillText(item.desc, x + 40, iy + 20);
  });

  // Close Button
  const btnX = DESIGN_WIDTH / 2 - 60;
  const btnY = y + h - 55;
  const btnHover = mousePos.x >= btnX && mousePos.x <= btnX + 120 && mousePos.y >= btnY && mousePos.y <= btnY + 40;
  drawSmallWoodButton(ctx, btnX, btnY, 120, 40, 'CLOSE', btnHover);

  ctx.restore();
}

// ─── Medieval Carved Wood Top HUD Bar ─────────────────────────────

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
  time: number
): void {
  ctx.save();
  const barH = 50;

  // Carved wooden plank spanning across top
  const bgGrad = ctx.createLinearGradient(0, 0, 0, barH);
  bgGrad.addColorStop(0, '#2c1809');
  bgGrad.addColorStop(0.5, '#4a2c14');
  bgGrad.addColorStop(1, '#1e0f05');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, DESIGN_WIDTH, barH);

  // Bottom gold filigree border
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, barH);
  ctx.lineTo(DESIGN_WIDTH, barH);
  ctx.stroke();

  // 1. Gold Pouch & Amount (Left)
  drawGoldHUD(ctx, 40, barH / 2, gold);

  // 2. Red Heart Shield & Lives (Left Center)
  drawLivesHUD(ctx, 160, barH / 2, lives, maxLives);

  // 3. Wave Horn Banner (Center)
  drawWaveBannerHUD(ctx, DESIGN_WIDTH / 2, barH / 2, waveIndex + 1, totalWaves);

  // 4. Pause & 2x Speed Buttons (Right)
  const pauseX = DESIGN_WIDTH - 120;
  const speedX = DESIGN_WIDTH - 65;
  const pauseHover = mousePos.x >= pauseX && mousePos.x <= pauseX + 44 && mousePos.y >= 8 && mousePos.y <= 42;
  const speedHover = mousePos.x >= speedX && mousePos.x <= speedX + 44 && mousePos.y >= 8 && mousePos.y <= 42;

  drawSmallWoodButton(ctx, pauseX, 8, 44, 34, paused ? '▶' : '❚❚', pauseHover);
  drawSmallWoodButton(ctx, speedX, 8, 44, 34, gameSpeed === 2 ? '2x' : '1x', speedHover);

  // 5. Early Wave Skull Medallion (If waiting for wave)
  if (waitingForWave && waveCountdown > 0) {
    drawEarlyWaveMedallion(ctx, waveCountdown, earlyBonusGold, mousePos, time);
  }

  ctx.restore();
}

function drawGoldHUD(ctx: CanvasRenderingContext2D, x: number, y: number, gold: number): void {
  // Gold coin stack icon
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(x, y - 2, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = 'bold 11px "Inter", sans-serif';
  ctx.fillStyle = '#7a5200';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', x, y - 2);

  // Gold text
  ctx.font = 'bold 20px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = '#ffdf78';
  ctx.textAlign = 'left';
  ctx.fillText(`${gold}`, x + 16, y);
}

function drawLivesHUD(ctx: CanvasRenderingContext2D, x: number, y: number, lives: number, _maxLives: number): void {
  // Red Heart Shield Icon
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.bezierCurveTo(x - 8, y - 14, x - 14, y - 4, x, y + 8);
  ctx.bezierCurveTo(x + 14, y - 4, x + 8, y - 14, x, y - 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Lives text
  ctx.font = 'bold 20px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = lives <= 5 ? '#ff6b6b' : '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${lives}`, x + 16, y);
}

function drawWaveBannerHUD(ctx: CanvasRenderingContext2D, cx: number, cy: number, current: number, total: number): void {
  ctx.save();
  // Ribbon plate
  ctx.fillStyle = '#3a200e';
  ctx.beginPath();
  ctx.roundRect(cx - 90, cy - 16, 180, 32, 6);
  ctx.fill();
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Battle Horn Icon
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(cx - 65, cy, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = 'bold 16px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = '#f5e6c8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Wave ${current} / ${total}`, cx + 6, cy);
  ctx.restore();
}

function drawEarlyWaveMedallion(
  ctx: CanvasRenderingContext2D,
  countdown: number,
  bonusGold: number,
  mousePos: Vec2,
  time: number
): void {
  ctx.save();
  const cx = DESIGN_WIDTH / 2;
  const cy = DESIGN_HEIGHT - 45;

  const isHovered = Math.hypot(mousePos.x - cx, mousePos.y - cy) < 40;

  // Pulsing ring
  const pulse = (Math.sin(time * 6) + 1) * 0.5;
  ctx.strokeStyle = `rgba(231, 76, 60, ${0.4 + pulse * 0.5})`;
  ctx.lineWidth = 3 + pulse * 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 32 + pulse * 6, 0, Math.PI * 2);
  ctx.stroke();

  // Medallion Disc
  ctx.fillStyle = isHovered ? '#c0392b' : '#962d22';
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Horn & Skull Icon
  ctx.font = 'bold 18px "Inter", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚔', cx, cy - 8);

  // Countdown & Bonus
  ctx.font = 'bold 12px "Inter", sans-serif';
  ctx.fillStyle = '#ffd700';
  ctx.fillText(`${Math.ceil(countdown)}s (+${bonusGold}g)`, cx, cy + 12);

  ctx.restore();
}
