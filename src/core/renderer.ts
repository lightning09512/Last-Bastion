// ─── Renderer ────────────────────────────────────────────────────
// Canvas rendering utilities for the game's visual style.

import { Vec2, DESIGN_WIDTH, DESIGN_HEIGHT } from '../data/types';
import { updateViewport, getViewport, SAFE_AREA } from './viewport';
import {
  drawBackgroundDirect,
  drawPathDirect,
  drawTreeDirect,
  drawRockDirect,
  drawBushDirect,
  drawMushroomDirect,
  drawStumpDirect,
  drawBonesDirect,
  drawSignDirect,
  drawSpawnGateDirect,
  drawBaseDirect,
} from '../rendering/MapRenderer';
import { drawBuildSlotDirect } from '../rendering/TowerRenderer';
import {
  drawParchmentWorldMap,
  drawEpicTitleScreen,
  drawMedievalTopHUD,
  getLevelNodePositions,
} from '../rendering/UIRenderer';
import type { SaveData, LevelData } from '../data/types';

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    const vp = updateViewport(cssW, cssH);

    this.canvas.width = Math.round(cssW * vp.dpr);
    this.canvas.height = Math.round(cssH * vp.dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;

    this.applyWorldTransform();
  }

  /**
   * A0: uniform scale + centring, so the 1280×720 design space keeps its
   * aspect ratio on any window instead of being stretched per axis.
   */
  private applyWorldTransform(): void {
    const ctx = this.ctx;
    const vp = getViewport();
    ctx.setTransform(
      vp.dpr * vp.scale, 0,
      0, vp.dpr * vp.scale,
      vp.dpr * vp.offsetX, vp.dpr * vp.offsetY,
    );
  }

  /** Design-space margin UI should keep clear of device edges. */
  get safeArea(): number {
    return SAFE_AREA;
  }

  /** Letterbox scale factor, exposed for diagnostics. */
  get viewportScale(): number {
    return getViewport().scale;
  }

  clear(): void {
    const ctx = this.ctx;
    // Letterbox bars live in device space, outside the world transform.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#07070c';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.applyWorldTransform();
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  }

  // ─── Map Drawing (Kingdom Rush Visuals) ──────────────────────
  drawBackground(levelId = 'level_1', path: Vec2[] = []): void {
    drawBackgroundDirect(this.ctx, levelId, path);
  }

  drawPath(waypoints: Vec2[], levelId = 'level_1'): void {
    drawPathDirect(this.ctx, levelId, waypoints);
  }

  drawSpawnGate(pos: Vec2): void {
    drawSpawnGateDirect(this.ctx, pos);
  }

  drawBase(pos: Vec2): void {
    drawBaseDirect(this.ctx, pos);
  }

  drawBuildSlot(x: number, y: number, occupied: boolean, hovered: boolean, selected: boolean): void {
    drawBuildSlotDirect(this.ctx, x, y, occupied, hovered, selected);
  }

  drawRangeCircle(x: number, y: number, range: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(x, y, range, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ─── Props / Decorations ────────────────────────────────────
  drawTree(x: number, y: number, size: number, levelId = 'level_1', variant = 0): void {
    drawTreeDirect(this.ctx, x, y, size, levelId, variant);
  }

  drawRock(x: number, y: number, size: number, levelId = 'level_1', variant = 0): void {
    drawRockDirect(this.ctx, x, y, size, levelId, variant);
  }

  drawBush(x: number, y: number, size: number, levelId = 'level_1', variant = 0): void {
    drawBushDirect(this.ctx, x, y, size, levelId, variant);
  }

  drawMushroom(x: number, y: number, size: number, levelId = 'level_1'): void {
    drawMushroomDirect(this.ctx, x, y, size, levelId);
  }

  drawStump(x: number, y: number, size: number, levelId = 'level_1'): void {
    drawStumpDirect(this.ctx, x, y, size, levelId);
  }

  drawBones(x: number, y: number, size: number): void {
    drawBonesDirect(this.ctx, x, y, size);
  }

  drawSign(x: number, y: number, size: number, levelId = 'level_1'): void {
    drawSignDirect(this.ctx, x, y, size, levelId);
  }

  // ─── Vignette ───────────────────────────────────────────────
  drawVignette(): void {
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(
      DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, DESIGN_HEIGHT * 0.3,
      DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, DESIGN_WIDTH * 0.8,
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  }

  // ─── UI Elements ────────────────────────────────────────────
  drawText(
    text: string,
    x: number, y: number,
    color: string,
    size: number,
    align: CanvasTextAlign = 'center',
    font: string = 'Inter',
    bold = false,
  ): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  drawTextWithShadow(
    text: string,
    x: number, y: number,
    color: string,
    size: number,
    align: CanvasTextAlign = 'center',
    font: string = 'MedievalSharp',
    bold = false,
  ): void {
    this.drawText(text, x + 2, y + 2, 'rgba(0,0,0,0.5)', size, align, font, bold);
    this.drawText(text, x, y, color, size, align, font, bold);
  }

  drawButton(
    x: number, y: number, w: number, h: number,
    text: string, hovered: boolean, enabled = true,
  ): void {
    const ctx = this.ctx;
    const cornerRadius = 8;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    this.roundRect(x + 2, y + 3, w, h, cornerRadius);
    ctx.fill();

    // Button body
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    if (!enabled) {
      grad.addColorStop(0, '#555');
      grad.addColorStop(1, '#444');
    } else if (hovered) {
      grad.addColorStop(0, '#f0c040');
      grad.addColorStop(1, '#d4a020');
    } else {
      grad.addColorStop(0, '#c9a030');
      grad.addColorStop(1, '#a08020');
    }
    ctx.fillStyle = grad;
    this.roundRect(x, y, w, h, cornerRadius);
    ctx.fill();

    // Border
    ctx.strokeStyle = enabled ? 'rgba(255,220,100,0.5)' : 'rgba(100,100,100,0.3)';
    ctx.lineWidth = 2;
    this.roundRect(x, y, w, h, cornerRadius);
    ctx.stroke();

    // Text
    ctx.fillStyle = enabled ? '#2a1a0a' : '#888';
    ctx.font = `bold ${Math.min(h * 0.45, 18)}px Inter`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  drawPanel(x: number, y: number, w: number, h: number, alpha = 0.85): void {
    const ctx = this.ctx;
    // Shadow
    ctx.fillStyle = `rgba(0,0,0,${alpha * 0.3})`;
    this.roundRect(x + 3, y + 3, w, h, 12);
    ctx.fill();
    // Panel
    ctx.fillStyle = `rgba(30,25,20,${alpha})`;
    this.roundRect(x, y, w, h, 12);
    ctx.fill();
    // Border
    ctx.strokeStyle = `rgba(200,170,100,${alpha * 0.4})`;
    ctx.lineWidth = 2;
    this.roundRect(x, y, w, h, 12);
    ctx.stroke();
  }

  drawStar(cx: number, cy: number, size: number, filled: boolean): void {
    const ctx = this.ctx;
    const spikes = 5;
    const outerRadius = size;
    const innerRadius = size * 0.45;

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const ang = (Math.PI * i) / spikes - Math.PI / 2;
      const x = cx + Math.cos(ang) * radius;
      const y = cy + Math.sin(ang) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    if (filled) {
      const grad = ctx.createLinearGradient(cx, cy - size, cx, cy + size);
      grad.addColorStop(0, '#ffd700');
      grad.addColorStop(1, '#e6a800');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = 'rgba(100,100,100,0.4)';
    }
    ctx.fill();
    ctx.strokeStyle = filled ? '#b38600' : 'rgba(80,80,80,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  drawTitleScreen(time: number, pointer: Vec2, audioMuted: boolean, activeLoreModal: boolean): void {
    drawEpicTitleScreen(this.ctx, time, pointer, audioMuted, activeLoreModal);
  }

  drawWorldMap(
    time: number,
    pointer: Vec2,
    levels: LevelData[],
    save: SaveData,
    hoveredIndex: number,
    selectedLevelIndex: number | null,
    audioMuted: boolean
  ): void {
    drawParchmentWorldMap(this.ctx, time, pointer, levels, save, hoveredIndex, selectedLevelIndex, audioMuted);
  }

  drawTopHUD(
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
    pointer: Vec2,
    time: number
  ): void {
    drawMedievalTopHUD(
      this.ctx,
      gold,
      lives,
      maxLives,
      waveIndex,
      totalWaves,
      paused,
      gameSpeed,
      waitingForWave,
      waveCountdown,
      earlyBonusGold,
      pointer,
      time
    );
  }

  getLevelPositions(count: number): Vec2[] {
    return getLevelNodePositions(count);
  }
}

