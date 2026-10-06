// ─── Post-processing (Canvas 2D) ─────────────────────────────────
// A tiny 2D "composer" that runs after the world is painted and before
// the HUD: cheap bloom (downscale → bright-pass → additive re-blend),
// ambient colour grade, fog, vignette and film grain.
//
// Canvas 2D has no render targets, so the bloom reads back the main
// canvas at a fraction of its size. Everything here is a fixed number of
// blits — no per-pixel work — to stay inside the frame budget.

import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../data/types';
import { getThemeArt } from '../rendering/Palette';

const GLOW_DIVISOR = 4; // 320×180 glow buffer at design resolution

export interface PostFxSettings {
  bloom: number;
  grade: number;
  fog: number;
  grain: number;
  vignette: number;
}

const DEFAULT_SETTINGS: PostFxSettings = {
  bloom: 0.42,
  grade: 1,
  fog: 1,
  // Cartoon look: no film grain by default, it only muddies the palette.
  grain: 0,
  vignette: 1,
};

export class PostFx {
  private glow: HTMLCanvasElement | null = null;
  private glowCtx: CanvasRenderingContext2D | null = null;
  private noise: HTMLCanvasElement | null = null;
  settings: PostFxSettings = { ...DEFAULT_SETTINGS };

  /** Bloom buffer size follows the real canvas so nothing is stretched. */
  private ensureBuffers(canvas: HTMLCanvasElement): void {
    const gw = Math.max(80, Math.round(canvas.width / GLOW_DIVISOR));
    const gh = Math.max(45, Math.round(canvas.height / GLOW_DIVISOR));

    if (!this.glow) this.glow = document.createElement('canvas');
    if (this.glow.width !== gw || this.glow.height !== gh) {
      this.glow.width = gw;
      this.glow.height = gh;
      this.glowCtx = this.glow.getContext('2d');
    } else if (!this.glowCtx) {
      this.glowCtx = this.glow.getContext('2d');
    }

    if (!this.noise) this.noise = this.bakeNoise();
  }

  /** A small tiling grain texture, baked once. */
  private bakeNoise(): HTMLCanvasElement {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const image = ctx.createImageData(size, size);
    for (let i = 0; i < image.data.length; i += 4) {
      const v = 110 + Math.random() * 90;
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
  }

  /**
   * Apply the effect stack. `canvas` is the live game canvas; the context
   * must currently be in device space (identity transform).
   */
  apply(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, levelId: string, time: number): void {
    const art = getThemeArt(levelId);
    this.ensureBuffers(canvas);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;

    // ── Bloom: keep only what is already bright, then add it back ──
    if (this.settings.bloom > 0 && this.glow && this.glowCtx) {
      const gw = this.glow.width;
      const gh = this.glow.height;
      const g = this.glowCtx;

      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, gw, gh);
      g.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, gw, gh);

      // Bright-pass by multiplying the buffer with itself: highlights
      // survive, mid-tones collapse.
      g.globalCompositeOperation = 'multiply';
      g.drawImage(this.glow, 0, 0);
      g.drawImage(this.glow, 0, 0);
      g.globalCompositeOperation = 'source-over';

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.settings.bloom;
      ctx.drawImage(this.glow, 0, 0, gw, gh, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    const world = { x: 0, y: 0, w: canvas.width, h: canvas.height };
    const dprX = canvas.width / DESIGN_WIDTH;
    const dprY = canvas.height / DESIGN_HEIGHT;
    const scale = Math.min(dprX, dprY);
    const offX = (canvas.width - DESIGN_WIDTH * scale) / 2;
    const offY = (canvas.height - DESIGN_HEIGHT * scale) / 2;
    const worldRect = {
      x: offX,
      y: offY,
      w: DESIGN_WIDTH * scale,
      h: DESIGN_HEIGHT * scale,
    };

    // ── Fog: a soft haze tinted per level, stronger near the edges ──
    if (this.settings.fog > 0) {
      ctx.globalAlpha = this.settings.fog;
      ctx.fillStyle = art.fog;
      ctx.fillRect(worldRect.x, worldRect.y, worldRect.w, worldRect.h);
      ctx.globalAlpha = 1;
    }

    // ── Colour grade: warm ambience + a touch of contrast ──
    if (this.settings.grade > 0) {
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.16 * this.settings.grade;
      ctx.fillStyle = art.ambient.replace(/[\d.]+\)$/, '1)');
      ctx.fillRect(worldRect.x, worldRect.y, worldRect.w, worldRect.h);

      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.10 * this.settings.grade;
      ctx.fillStyle = art.groundTint;
      ctx.fillRect(worldRect.x, worldRect.y, worldRect.w, worldRect.h);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // ── Film grain: one blit of a baked noise tile ──
    if (this.settings.grain > 0 && this.noise) {
      const tile = 384 * scale; // few, large blits: grain stays cheap
      const ox = -((time * 37) % tile);
      const oy = -((time * 61) % tile);
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = this.settings.grain;
      for (let y = worldRect.y + oy; y < worldRect.y + worldRect.h; y += tile) {
        for (let x = worldRect.x + ox; x < worldRect.x + worldRect.w; x += tile) {
          ctx.drawImage(this.noise, x, y, tile, tile);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // ── Vignette (world area only) ──
    if (this.settings.vignette > 0) {
      const grad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, Math.min(worldRect.w, worldRect.h) * 0.32,
        canvas.width / 2, canvas.height / 2, Math.max(worldRect.w, worldRect.h) * 0.72,
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(8,6,14,${0.42 * this.settings.vignette})`);
      ctx.fillStyle = grad;
      ctx.fillRect(world.x, world.y, world.w, world.h);
    }

    ctx.restore();
  }
}

export const postFx = new PostFx();
