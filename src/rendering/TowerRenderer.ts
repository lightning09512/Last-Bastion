// ─── Tower Renderer ──────────────────────────────────────────────
// Procedural tower drawing with detailed architecture for each type/level
// Replaces simple rectangles with Kingdom Rush-style isometric buildings

import * as THREE from 'three';
import { ThreeRenderer } from './ThreeRenderer';
import { TOWERS } from '../data/towers';

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

export function renderTower(
  renderer: ThreeRenderer,
  tower: TowerRenderData,
): void {
  const towerData = TOWERS[tower.dataId];
  if (!towerData) return;
  
  const size = 56 + tower.level * 4 + (tower.specId ? 8 : 0);
  
  const texture = renderer.generateProceduralTexture(
    size, size + 20,
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h * 0.65;
      const baseColor = towerData.color;
      const animScale = tower.animTimer > 0 ? 1 + tower.animTimer * 0.5 : 1;
      
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(animScale, animScale);
      ctx.translate(-cx, -cy);
      
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 10, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      
      switch (tower.dataId) {
        case 'archer':
          drawArcherTower(ctx, cx, cy, tower.level, tower.specId, baseColor);
          break;
        case 'mage':
          drawMageTower(ctx, cx, cy, tower.level, tower.specId, baseColor);
          break;
        case 'cannon':
          drawCannonTower(ctx, cx, cy, tower.level, tower.specId, baseColor);
          break;
        case 'barracks':
          drawBarracksTower(ctx, cx, cy, tower.level, tower.specId, baseColor);
          break;
        default:
          drawGenericTower(ctx, cx, cy, tower.level, baseColor);
      }
      
      // Stun effect
      if (tower.stunTimer > 0) {
        ctx.fillStyle = 'rgba(255,255,100,0.4)';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡', cx, cy - 20);
      }
      
      ctx.restore();
    },
  );
  
  renderer.createSprite(texture, tower.x, tower.y - 10, size, size + 20, renderer.towerTopLayer);
}

// ─── Archer Tower ───────────────────────────────────────────────

function drawArcherTower(ctx: CanvasRenderingContext2D, cx: number, cy: number, level: number, specId: string | null, color: string): void {
  const h = 22 + level * 6 + (specId ? 8 : 0);
  
  // Base platform (stone/wood)
  ctx.fillStyle = '#8B7355';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a89070';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  
  if (level === 0) {
    // L1: Wooden post with platform
    ctx.fillStyle = '#6a5040';
    ctx.fillRect(cx - 4, cy - h, 8, h);
    ctx.fillStyle = '#7a6050';
    ctx.fillRect(cx - 2, cy - h + 2, 4, h - 4);
    
    // Small platform on top
    ctx.fillStyle = '#8a7060';
    ctx.fillRect(cx - 10, cy - h - 2, 20, 6);
    ctx.fillStyle = '#9a8070';
    ctx.fillRect(cx - 8, cy - h, 16, 4);
    
    // Railing posts
    ctx.fillStyle = '#6a5040';
    ctx.fillRect(cx - 9, cy - h - 6, 2, 6);
    ctx.fillRect(cx + 7, cy - h - 6, 2, 6);
    
    // Archer figure
    drawArcherFigure(ctx, cx, cy - h - 4, color, 1);
  } else if (level === 1) {
    // L2: Wooden tower
    ctx.fillStyle = '#6a5040';
    ctx.fillRect(cx - 8, cy - h, 16, h);
    ctx.fillStyle = '#7a6050';
    ctx.fillRect(cx - 6, cy - h + 2, 12, h - 4);
    
    // Window slits
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(cx - 2, cy - h + 6, 4, 6);
    ctx.fillRect(cx - 2, cy - h + 16, 4, 6);
    
    // Top platform
    ctx.fillStyle = '#8a7060';
    ctx.fillRect(cx - 12, cy - h - 3, 24, 6);
    
    // Battlements
    ctx.fillStyle = '#6a5040';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(cx - 11 + i * 10, cy - h - 7, 6, 6);
    }
    
    // Two archers
    drawArcherFigure(ctx, cx - 4, cy - h - 5, color, 0.8);
    drawArcherFigure(ctx, cx + 4, cy - h - 5, color, 0.8);
  } else {
    // L3: Stone tower
    ctx.fillStyle = '#7a7068';
    ctx.fillRect(cx - 10, cy - h, 20, h);
    ctx.fillStyle = '#8a8078';
    ctx.fillRect(cx - 8, cy - h + 2, 16, h - 4);
    
    // Stone lines
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
      const ry = cy - h + 5 + i * 6;
      ctx.beginPath();
      ctx.moveTo(cx - 8, ry);
      ctx.lineTo(cx + 8, ry);
      ctx.stroke();
    }
    
    // Arrow slits
    ctx.fillStyle = '#1a1010';
    for (let i = 0; i < 2; i++) {
      const sy = cy - h + 8 + i * 10;
      ctx.fillRect(cx - 1.5, sy, 3, 5);
    }
    
    // Wider top
    ctx.fillStyle = '#7a7068';
    ctx.fillRect(cx - 14, cy - h - 4, 28, 8);
    ctx.fillStyle = '#8a8078';
    ctx.fillRect(cx - 12, cy - h - 2, 24, 5);
    
    // Stone battlements
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#7a7068';
      ctx.fillRect(cx - 13 + i * 8, cy - h - 9, 5, 7);
    }
    
    if (specId === 'sharpshooter') {
      // Extra tall spire
      ctx.fillStyle = '#6a6058';
      ctx.fillRect(cx - 3, cy - h - 18, 6, 12);
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(cx, cy - h - 18, 3, 0, Math.PI * 2);
      ctx.fill();
      // Elite archer
      drawArcherFigure(ctx, cx, cy - h - 8, '#daa520', 1.0);
    } else if (specId === 'rapid_volley') {
      // Bow racks
      ctx.strokeStyle = '#8a5020';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(cx - 8 + i * 8, cy - h - 6, 3, Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke();
      }
      // Multiple archers
      drawArcherFigure(ctx, cx - 6, cy - h - 6, color, 0.7);
      drawArcherFigure(ctx, cx, cy - h - 7, color, 0.7);
      drawArcherFigure(ctx, cx + 6, cy - h - 6, color, 0.7);
    } else {
      // Three archers
      drawArcherFigure(ctx, cx - 5, cy - h - 6, color, 0.8);
      drawArcherFigure(ctx, cx + 5, cy - h - 6, color, 0.8);
      drawArcherFigure(ctx, cx, cy - h - 8, color, 0.8);
    }
    
    // Banner
    ctx.fillStyle = '#c41e3a';
    ctx.fillRect(cx + 10, cy - h, 2, 12);
    ctx.fillStyle = '#c41e3a';
    ctx.fillRect(cx + 12, cy - h, 6, 8);
  }
  
  // Level indicator
  drawLevelDots(ctx, cx, cy + 8, level, specId);
}

function drawArcherFigure(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, scale: number): void {
  const s = scale;
  // Body
  ctx.fillStyle = color;
  ctx.fillRect(x - 2 * s, y - 3 * s, 4 * s, 5 * s);
  // Head
  ctx.fillStyle = '#e8c090';
  ctx.beginPath();
  ctx.arc(x, y - 4 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  // Bow
  ctx.strokeStyle = '#8a5020';
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.arc(x + 4 * s, y - 1 * s, 3 * s, -Math.PI * 0.6, Math.PI * 0.6);
  ctx.stroke();
}

// ─── Mage Tower ─────────────────────────────────────────────────

function drawMageTower(ctx: CanvasRenderingContext2D, cx: number, cy: number, level: number, specId: string | null, color: string): void {
  const h = 24 + level * 7 + (specId ? 10 : 0);
  
  // Base
  ctx.fillStyle = '#7a6888';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  
  if (level === 0) {
    // L1: Tent/canopy with books
    // Poles
    ctx.fillStyle = '#6a5040';
    ctx.fillRect(cx - 8, cy - h + 6, 3, h - 6);
    ctx.fillRect(cx + 5, cy - h + 6, 3, h - 6);
    
    // Fabric canopy
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - h + 8);
    ctx.lineTo(cx, cy - h - 2);
    ctx.lineTo(cx + 12, cy - h + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ThreeRenderer.lighten(color, 0.15);
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - h + 7);
    ctx.lineTo(cx, cy - h);
    ctx.lineTo(cx + 8, cy - h + 7);
    ctx.closePath();
    ctx.fill();
    
    // Books/desk
    ctx.fillStyle = '#5a3020';
    ctx.fillRect(cx - 5, cy - 4, 10, 5);
    ctx.fillStyle = '#8a3030';
    ctx.fillRect(cx - 4, cy - 6, 3, 3);
    ctx.fillStyle = '#3030aa';
    ctx.fillRect(cx + 1, cy - 6, 3, 3);
    
    // Mage figure
    drawMageFigure(ctx, cx, cy - h + 2, color, 1);
  } else if (level === 1) {
    // L2: Small stone tower with crystal
    ctx.fillStyle = '#6a5878';
    ctx.fillRect(cx - 8, cy - h, 16, h);
    ctx.fillStyle = '#7a6888';
    ctx.fillRect(cx - 6, cy - h + 2, 12, h - 4);
    
    // Rune carvings
    ctx.strokeStyle = 'rgba(200,150,255,0.3)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy - h / 2, 4, 0, Math.PI * 2);
    ctx.stroke();
    
    // Window (glowing)
    ctx.fillStyle = '#ccaaff';
    ctx.globalAlpha = 0.7;
    ctx.fillRect(cx - 2, cy - h + 8, 4, 5);
    ctx.globalAlpha = 1;
    
    // Top
    ctx.fillStyle = '#6a5878';
    ctx.fillRect(cx - 10, cy - h - 2, 20, 5);
    
    // Crystal on top
    drawCrystal(ctx, cx, cy - h - 6, 5, color);
    drawMageFigure(ctx, cx, cy - h - 2, color, 0.8);
  } else {
    // L3: Tall tower with large crystal
    ctx.fillStyle = '#5a4868';
    ctx.fillRect(cx - 10, cy - h, 20, h);
    ctx.fillStyle = '#6a5878';
    ctx.fillRect(cx - 8, cy - h + 2, 16, h - 4);
    
    // Stone texture
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - h + 6 + i * 6);
      ctx.lineTo(cx + 8, cy - h + 6 + i * 6);
      ctx.stroke();
    }
    
    // Rune carvings (glowing)
    ctx.strokeStyle = 'rgba(180,120,255,0.5)';
    ctx.lineWidth = 1;
    // Rune symbols
    for (let i = 0; i < 3; i++) {
      const ry = cy - h + 8 + i * 8;
      ctx.beginPath();
      ctx.moveTo(cx - 3, ry);
      ctx.lineTo(cx, ry - 2);
      ctx.lineTo(cx + 3, ry);
      ctx.lineTo(cx, ry + 2);
      ctx.closePath();
      ctx.stroke();
    }
    
    // Wider top with parapet
    ctx.fillStyle = '#5a4868';
    ctx.fillRect(cx - 13, cy - h - 3, 26, 7);
    
    if (specId === 'arcane_blast') {
      // Large crystal with energy arcs
      drawCrystal(ctx, cx, cy - h - 10, 8, '#ff44ff');
      // Energy arcs
      ctx.strokeStyle = 'rgba(255,100,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy - h - 10, 12, 0, Math.PI * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy - h - 10, 12, Math.PI, Math.PI * 1.5);
      ctx.stroke();
    } else if (specId === 'slow_hex') {
      // Hex rune circle
      drawCrystal(ctx, cx, cy - h - 8, 6, '#44aaff');
      ctx.strokeStyle = 'rgba(68,170,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy - h - 8, 10, 0, Math.PI * 2);
      ctx.stroke();
      // Hex symbols
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const hx = cx + Math.cos(a) * 10;
        const hy = (cy - h - 8) + Math.sin(a) * 10;
        ctx.fillStyle = 'rgba(68,170,255,0.6)';
        ctx.beginPath();
        ctx.arc(hx, hy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      drawCrystal(ctx, cx, cy - h - 8, 7, color);
    }
    
    drawMageFigure(ctx, cx, cy - h - 2, color, 0.9);
  }
  
  drawLevelDots(ctx, cx, cy + 8, level, specId);
}

function drawMageFigure(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, scale: number): void {
  const s = scale;
  // Robe
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 3 * s, y + 4 * s);
  ctx.lineTo(x - 2 * s, y - 2 * s);
  ctx.lineTo(x + 2 * s, y - 2 * s);
  ctx.lineTo(x + 3 * s, y + 4 * s);
  ctx.closePath();
  ctx.fill();
  // Head
  ctx.fillStyle = '#e8c090';
  ctx.beginPath();
  ctx.arc(x, y - 3.5 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  // Hat
  ctx.fillStyle = ThreeRenderer.darken(color, 0.2);
  ctx.beginPath();
  ctx.moveTo(x - 3 * s, y - 3 * s);
  ctx.lineTo(x, y - 8 * s);
  ctx.lineTo(x + 3 * s, y - 3 * s);
  ctx.closePath();
  ctx.fill();
}

function drawCrystal(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
  // Glow
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  
  // Crystal shape (diamond)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.6, y);
  ctx.lineTo(x, y + size * 0.5);
  ctx.lineTo(x - size * 0.6, y);
  ctx.closePath();
  ctx.fill();
  
  // Highlight
  ctx.fillStyle = ThreeRenderer.lighten(color, 0.4);
  ctx.beginPath();
  ctx.moveTo(x - size * 0.2, y - size * 0.6);
  ctx.lineTo(x, y - size);
  ctx.lineTo(x + size * 0.2, y - size * 0.4);
  ctx.lineTo(x, y - size * 0.1);
  ctx.closePath();
  ctx.fill();
  
  // Sparkle
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(x - size * 0.1, y - size * 0.5, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ─── Cannon Tower ───────────────────────────────────────────────

function drawCannonTower(ctx: CanvasRenderingContext2D, cx: number, cy: number, level: number, specId: string | null, color: string): void {
  const h = 18 + level * 5 + (specId ? 6 : 0);
  
  // Base
  ctx.fillStyle = '#8a7060';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, 18, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  
  if (level === 0) {
    // L1: Wooden platform + small cannon
    ctx.fillStyle = '#7a6050';
    ctx.fillRect(cx - 12, cy - 4, 24, 8);
    ctx.fillStyle = '#8a7060';
    ctx.fillRect(cx - 10, cy - 2, 20, 5);
    
    // Wooden planks
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 10 + i * 6, cy - 2);
      ctx.lineTo(cx - 10 + i * 6, cy + 3);
      ctx.stroke();
    }
    
    // Cannon
    drawCannon(ctx, cx, cy - 6, 0.8, color);
  } else if (level === 1) {
    // L2: Stone platform + medium cannon
    ctx.fillStyle = '#6a6058';
    ctx.fillRect(cx - 13, cy - h + 6, 26, h - 6);
    ctx.fillStyle = '#7a7068';
    ctx.fillRect(cx - 11, cy - h + 8, 22, h - 10);
    
    // Ammo crates
    ctx.fillStyle = '#5a4030';
    ctx.fillRect(cx + 6, cy - 2, 6, 5);
    ctx.fillStyle = '#6a5040';
    ctx.fillRect(cx + 7, cy - 1, 4, 3);
    
    drawCannon(ctx, cx - 2, cy - h + 4, 1.0, color);
  } else {
    // L3: Fortress + heavy cannon
    ctx.fillStyle = '#5a5048';
    ctx.fillRect(cx - 14, cy - h, 28, h);
    ctx.fillStyle = '#6a6058';
    ctx.fillRect(cx - 12, cy - h + 2, 24, h - 4);
    
    // Stone texture
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy - h + 6 + i * 6);
      ctx.lineTo(cx + 12, cy - h + 6 + i * 6);
      ctx.stroke();
    }
    
    // Battlements
    ctx.fillStyle = '#5a5048';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(cx - 13 + i * 10, cy - h - 5, 7, 7);
    }
    
    // Smoke vents
    ctx.fillStyle = '#3a3030';
    ctx.fillRect(cx + 8, cy - h + 4, 4, 3);
    
    if (specId === 'heavy_bombard') {
      drawCannon(ctx, cx, cy - h - 2, 1.5, '#4a3030');
    } else if (specId === 'cluster_bombs') {
      // Multiple tubes
      for (let i = 0; i < 3; i++) {
        drawCannon(ctx, cx - 4 + i * 4, cy - h - 1, 0.7, color);
      }
    } else {
      drawCannon(ctx, cx, cy - h, 1.2, color);
    }
  }
  
  drawLevelDots(ctx, cx, cy + 8, level, specId);
}

function drawCannon(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string): void {
  const s = scale;
  // Barrel
  ctx.fillStyle = '#3a3030';
  ctx.fillRect(x - 2 * s, y - 3 * s, 12 * s, 5 * s);
  // Barrel highlight
  ctx.fillStyle = '#5a5050';
  ctx.fillRect(x - 1 * s, y - 2 * s, 10 * s, 2 * s);
  // Muzzle
  ctx.fillStyle = '#2a2020';
  ctx.beginPath();
  ctx.arc(x + 10 * s, y - 0.5 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  // Wheels
  ctx.fillStyle = '#5a4030';
  ctx.beginPath();
  ctx.arc(x + 1 * s, y + 3 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a3020';
  ctx.beginPath();
  ctx.arc(x + 1 * s, y + 3 * s, 1.5 * s, 0, Math.PI * 2);
  ctx.fill();
  // Fuse
  ctx.strokeStyle = color;
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.moveTo(x - 2 * s, y - 1 * s);
  ctx.quadraticCurveTo(x - 5 * s, y - 4 * s, x - 3 * s, y - 6 * s);
  ctx.stroke();
}

// ─── Barracks ───────────────────────────────────────────────────

function drawBarracksTower(ctx: CanvasRenderingContext2D, cx: number, cy: number, level: number, specId: string | null, color: string): void {
  const h = 16 + level * 4 + (specId ? 6 : 0);
  
  // Base
  ctx.fillStyle = '#8a7a60';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, 18, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  
  if (level === 0) {
    // L1: Simple tent
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy + 2);
    ctx.lineTo(cx, cy - h);
    ctx.lineTo(cx + 14, cy + 2);
    ctx.closePath();
    ctx.fill();
    
    // Tent highlight
    ctx.fillStyle = ThreeRenderer.lighten(color, 0.15);
    ctx.beginPath();
    ctx.moveTo(cx, cy - h);
    ctx.lineTo(cx + 10, cy + 1);
    ctx.lineTo(cx + 2, cy + 1);
    ctx.closePath();
    ctx.fill();
    
    // Opening
    ctx.fillStyle = ThreeRenderer.darken(color, 0.3);
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy + 2);
    ctx.lineTo(cx, cy - 4);
    ctx.lineTo(cx + 4, cy + 2);
    ctx.closePath();
    ctx.fill();
    
    // Sword rack
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + 10, cy - 4);
    ctx.lineTo(cx + 10, cy + 2);
    ctx.stroke();
    ctx.moveTo(cx + 8, cy - 3);
    ctx.lineTo(cx + 12, cy - 3);
    ctx.stroke();
    
    drawSoldierFigure(ctx, cx - 8, cy - 2, color, 0.7);
    drawSoldierFigure(ctx, cx + 6, cy - 1, color, 0.7);
  } else if (level === 1) {
    // L2: Wooden structure
    ctx.fillStyle = '#6a5040';
    ctx.fillRect(cx - 12, cy - h, 24, h + 2);
    ctx.fillStyle = '#7a6050';
    ctx.fillRect(cx - 10, cy - h + 2, 20, h - 3);
    
    // Roof
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy - h + 2);
    ctx.lineTo(cx, cy - h - 6);
    ctx.lineTo(cx + 15, cy - h + 2);
    ctx.closePath();
    ctx.fill();
    
    // Door
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(cx - 4, cy - 4, 8, 7);
    
    // Weapon rack
    ctx.fillStyle = '#aaa';
    ctx.fillRect(cx + 8, cy - h + 6, 1, 10);
    ctx.fillRect(cx + 6, cy - h + 7, 5, 1);
    
    drawSoldierFigure(ctx, cx - 10, cy - 1, color, 0.7);
    drawSoldierFigure(ctx, cx - 4, cy - 2, color, 0.7);
    drawSoldierFigure(ctx, cx + 10, cy - 1, color, 0.7);
  } else {
    // L3: Small fortress
    ctx.fillStyle = '#5a5048';
    ctx.fillRect(cx - 14, cy - h, 28, h);
    ctx.fillStyle = '#6a6058';
    ctx.fillRect(cx - 12, cy - h + 2, 24, h - 4);
    
    // Battlements
    ctx.fillStyle = '#5a5048';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(cx - 13 + i * 8, cy - h - 4, 5, 6);
    }
    
    // Gate
    ctx.fillStyle = '#4a3020';
    ctx.beginPath();
    ctx.arc(cx, cy + 1, 6, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - 6, cy + 1, 12, 3);
    
    if (specId === 'knights') {
      // Holy emblem
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(cx, cy - h - 8);
      ctx.lineTo(cx + 4, cy - h - 4);
      ctx.lineTo(cx, cy - h);
      ctx.lineTo(cx - 4, cy - h - 4);
      ctx.closePath();
      ctx.fill();
      // Holy glow
      ctx.fillStyle = 'rgba(255,215,0,0.15)';
      ctx.beginPath();
      ctx.arc(cx, cy - h - 4, 10, 0, Math.PI * 2);
      ctx.fill();
      // Knights
      drawKnightFigure(ctx, cx - 10, cy - 1, 0.7);
      drawKnightFigure(ctx, cx, cy - 2, 0.7);
      drawKnightFigure(ctx, cx + 10, cy - 1, 0.7);
    } else if (specId === 'rangers') {
      // Ranger banner
      ctx.fillStyle = '#2d6b22';
      ctx.fillRect(cx + 10, cy - h, 2, 10);
      ctx.fillStyle = '#2d6b22';
      ctx.fillRect(cx + 12, cy - h, 5, 6);
      // Rangers
      drawRangerFigure(ctx, cx - 10, cy - 1, 0.7);
      drawRangerFigure(ctx, cx, cy - 2, 0.7);
      drawRangerFigure(ctx, cx + 10, cy - 1, 0.7);
    } else {
      // Banner
      ctx.fillStyle = color;
      ctx.fillRect(cx, cy - h - 2, 2, 10);
      ctx.fillRect(cx + 2, cy - h - 2, 6, 6);
      
      drawSoldierFigure(ctx, cx - 10, cy - 1, color, 0.7);
      drawSoldierFigure(ctx, cx, cy - 2, color, 0.7);
      drawSoldierFigure(ctx, cx + 10, cy - 1, color, 0.7);
    }
  }
  
  drawLevelDots(ctx, cx, cy + 8, level, specId);
}

function drawSoldierFigure(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, scale: number): void {
  const s = scale;
  // Body (armor)
  ctx.fillStyle = color;
  ctx.fillRect(x - 2 * s, y - 2 * s, 4 * s, 5 * s);
  // Head
  ctx.fillStyle = '#e8c090';
  ctx.beginPath();
  ctx.arc(x, y - 3.5 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  // Helmet
  ctx.fillStyle = '#aaa';
  ctx.beginPath();
  ctx.arc(x, y - 4 * s, 2.2 * s, Math.PI, 0);
  ctx.fill();
  // Sword
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.moveTo(x + 3 * s, y - 1 * s);
  ctx.lineTo(x + 3 * s, y + 4 * s);
  ctx.stroke();
  // Shield
  ctx.fillStyle = ThreeRenderer.darken(color, 0.2);
  ctx.fillRect(x - 4 * s, y - 1 * s, 2 * s, 4 * s);
}

function drawKnightFigure(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  const s = scale;
  // Shining armor
  ctx.fillStyle = '#c0c0d0';
  ctx.fillRect(x - 2.5 * s, y - 2 * s, 5 * s, 5 * s);
  // Head
  ctx.fillStyle = '#c0c0d0';
  ctx.beginPath();
  ctx.arc(x, y - 3.5 * s, 2.5 * s, 0, Math.PI * 2);
  ctx.fill();
  // Visor
  ctx.fillStyle = '#2a2a30';
  ctx.fillRect(x - 1.5 * s, y - 4 * s, 3 * s, 1.5 * s);
  // Holy glow
  ctx.fillStyle = 'rgba(255,215,0,0.2)';
  ctx.beginPath();
  ctx.arc(x, y, 5 * s, 0, Math.PI * 2);
  ctx.fill();
  // Sword
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.moveTo(x + 3 * s, y - 2 * s);
  ctx.lineTo(x + 3 * s, y + 4 * s);
  ctx.stroke();
}

function drawRangerFigure(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  const s = scale;
  // Green leather
  ctx.fillStyle = '#3a6a30';
  ctx.fillRect(x - 2 * s, y - 2 * s, 4 * s, 5 * s);
  // Head
  ctx.fillStyle = '#e8c090';
  ctx.beginPath();
  ctx.arc(x, y - 3.5 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  // Hood
  ctx.fillStyle = '#2a5020';
  ctx.beginPath();
  ctx.arc(x, y - 4 * s, 2.2 * s, Math.PI * 1.1, Math.PI * 1.9);
  ctx.fill();
  // Dual swords
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 0.8 * s;
  ctx.beginPath();
  ctx.moveTo(x + 3 * s, y - 1 * s);
  ctx.lineTo(x + 4 * s, y + 3 * s);
  ctx.moveTo(x - 3 * s, y - 1 * s);
  ctx.lineTo(x - 4 * s, y + 3 * s);
  ctx.stroke();
}

// ─── Generic Tower (fallback) ───────────────────────────────────

function drawGenericTower(ctx: CanvasRenderingContext2D, cx: number, cy: number, level: number, color: string): void {
  const h = 20 + level * 6;
  ctx.fillStyle = color;
  ctx.fillRect(cx - 10, cy - h, 20, h);
  ctx.fillStyle = ThreeRenderer.lighten(color, 0.15);
  ctx.fillRect(cx - 8, cy - h + 2, 8, h - 4);
  drawLevelDots(ctx, cx, cy + 6, level, null);
}

// ─── Level Dots / Spec Star ─────────────────────────────────────

function drawLevelDots(ctx: CanvasRenderingContext2D, cx: number, cy: number, level: number, specId: string | null): void {
  if (specId) {
    // Spec star
    ctx.fillStyle = '#ffd700';
    drawStarShape(ctx, cx, cy - 2, 4);
    return;
  }
  
  ctx.fillStyle = '#ffd700';
  for (let i = 0; i <= level; i++) {
    ctx.beginPath();
    ctx.arc(cx - 4 + i * 4, cy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStarShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = (Math.PI * i) / 5 - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

// ─── Build Slot ─────────────────────────────────────────────────

export function renderBuildSlot(
  renderer: ThreeRenderer,
  x: number, y: number,
  occupied: boolean,
  hovered: boolean,
  selected: boolean,
): void {
  if (occupied) return; // Tower renders on top
  
  const texture = renderer.generateProceduralTexture(48, 32, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Stone platform
    ctx.fillStyle = hovered ? '#e8d5a0' : '#c9a96e';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 18, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Raised center
    ctx.fillStyle = hovered ? '#f0e0b0' : '#d4b880';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 1, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Stone edge details
    ctx.strokeStyle = selected ? '#ffd700' : (hovered ? '#fff' : 'rgba(90,60,30,0.5)');
    ctx.lineWidth = selected ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 18, 11, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Small rocks on edge
    ctx.fillStyle = 'rgba(120,100,60,0.3)';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const rx = cx + Math.cos(a) * 16;
      const ry = cy + Math.sin(a) * 9;
      ctx.beginPath();
      ctx.arc(rx, ry, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // "+" icon
    ctx.fillStyle = hovered ? '#5c4033' : 'rgba(90,60,30,0.5)';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', cx, cy - 1);
    
    // Hover glow
    if (hovered) {
      ctx.fillStyle = 'rgba(255,220,100,0.15)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 22, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  
    renderer.createSprite(texture, x, y, 48, 32, renderer.buildSlotLayer);
}

// ─── Direct Canvas2D Rendering ───────────────────────────────────

export function drawTowerDirect(
  ctx: CanvasRenderingContext2D,
  tower: TowerRenderData,
): void {
  const towerData = TOWERS[tower.dataId];
  if (!towerData) return;

  const cx = tower.x;
  const cy = tower.y;
  const baseColor = towerData.color;
  const animScale = tower.animTimer > 0 ? 1 + tower.animTimer * 0.4 : 1;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(animScale, animScale);
  ctx.translate(-cx, -cy);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 20, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (tower.dataId) {
    case 'archer':
      drawArcherTower(ctx, cx, cy, tower.level, tower.specId, baseColor);
      break;
    case 'mage':
      drawMageTower(ctx, cx, cy, tower.level, tower.specId, baseColor);
      break;
    case 'cannon':
      drawCannonTower(ctx, cx, cy, tower.level, tower.specId, baseColor);
      break;
    case 'barracks':
      drawBarracksTower(ctx, cx, cy, tower.level, tower.specId, baseColor);
      break;
    default:
      drawGenericTower(ctx, cx, cy, tower.level, baseColor);
  }

  // Stun effect
  if (tower.stunTimer > 0) {
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', cx, cy - 35);
  }

  ctx.restore();
}

export function drawBuildSlotDirect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  occupied: boolean,
  hovered: boolean,
  selected: boolean,
): void {
  if (occupied) return;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 22, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stone platform
  ctx.fillStyle = hovered ? '#e8d5a0' : '#c9a96e';
  ctx.beginPath();
  ctx.ellipse(x, y, 20, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Raised center
  ctx.fillStyle = hovered ? '#f0e0b0' : '#d4b880';
  ctx.beginPath();
  ctx.ellipse(x, y - 1, 15, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stone edge border
  ctx.strokeStyle = selected ? '#ffd700' : (hovered ? '#ffffff' : 'rgba(90,60,30,0.6)');
  ctx.lineWidth = selected ? 3 : 2;
  ctx.beginPath();
  ctx.ellipse(x, y, 20, 12, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Small stones on edge
  ctx.fillStyle = 'rgba(120,100,60,0.4)';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rx = x + Math.cos(a) * 17;
    const ry = y + Math.sin(a) * 10;
    ctx.beginPath();
    ctx.arc(rx, ry, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // "+" icon
  ctx.fillStyle = hovered ? '#5c4033' : 'rgba(90,60,30,0.6)';
  ctx.font = 'bold 16px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', x, y - 1);
}
