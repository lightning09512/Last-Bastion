// ─── Debug Overlay ───────────────────────────────────────────────
// Frame-time and budget instrumentation, toggled with F1 (A18).
// Numbers produced here are the ones quoted in the Phase reports, so
// they must be measured, never estimated.

import { DESIGN_HEIGHT } from '../data/types';

const SAMPLE_COUNT = 120;

export interface FrameSnapshot {
  entities: number;
  particles: number;
  projectiles: number;
  spriteBakes: number;
  spriteCacheHits: number;
  enemies: number;
}

export class DebugOverlay {
  enabled = false;

  private samples: number[] = [];
  private lastFrameAt = 0;
  private frameStart = 0;
  private latest: FrameSnapshot = {
    entities: 0,
    particles: 0,
    projectiles: 0,
    spriteBakes: 0,
    spriteCacheHits: 0,
    enemies: 0,
  };
  private peaks: { entities: number; particles: number } = { entities: 0, particles: 0 };

  toggle(): boolean {
    this.enabled = !this.enabled;
    this.samples.length = 0;
    return this.enabled;
  }

  /** Call at the very top of the frame. */
  beginFrame(now: number): void {
    if (!this.enabled) return;
    if (this.lastFrameAt > 0) {
      this.samples.push(now - this.lastFrameAt);
      if (this.samples.length > SAMPLE_COUNT) this.samples.shift();
    }
    this.lastFrameAt = now;
    this.frameStart = performance.now();
  }

  /** Call after the frame has been drawn; returns the measured cost in ms. */
  endFrame(): number {
    if (!this.enabled) return 0;
    return performance.now() - this.frameStart;
  }

  report(snapshot: Partial<FrameSnapshot>): void {
    if (!this.enabled) return;
    Object.assign(this.latest, snapshot);
    this.peaks.entities = Math.max(this.peaks.entities, this.latest.entities);
    this.peaks.particles = Math.max(this.peaks.particles, this.latest.particles);
  }

  private percentile(p: number): number {
    if (this.samples.length === 0) return 0;
    const sorted = [...this.samples].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
    return sorted[idx];
  }

  get fps(): number {
    const avg = this.percentile(0.5);
    return avg > 0 ? 1000 / avg : 0;
  }

  get peakEntities(): number {
    return this.peaks.entities;
  }

  get peakParticles(): number {
    return this.peaks.particles;
  }

  get frameP50(): number {
    return this.percentile(0.5);
  }

  get frameP95(): number {
    return this.percentile(0.95);
  }

  /** Draw the overlay in design space (top-left corner, below the HUD). */
  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.enabled) return;

    const lines = [
      `fps ${this.fps.toFixed(0)}  frame p50 ${this.frameP50.toFixed(2)}ms  p95 ${this.frameP95.toFixed(2)}ms`,
      `enemies ${this.latest.enemies}  entities ${this.latest.entities} (peak ${this.peaks.entities})`,
      `particles ${this.latest.particles} (peak ${this.peaks.particles})  projectiles ${this.latest.projectiles}`,
      `sprite bakes ${this.latest.spriteBakes}  cache hits ${this.latest.spriteCacheHits}`,
      'F1 toggle debug',
    ];

    const pad = 8;
    const lineH = 14;
    const width = 380;
    const height = lines.length * lineH + pad * 2;

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(pad, DESIGN_HEIGHT - height - pad, width, height);
    ctx.strokeStyle = 'rgba(120,255,140,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad + 0.5, DESIGN_HEIGHT - height - pad + 0.5, width, height);

    ctx.font = '11px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#8ef58e';
    lines.forEach((line, i) => {
      ctx.fillText(line, pad + 8, DESIGN_HEIGHT - height - pad + pad + lineH * i + lineH / 2);
    });
    ctx.restore();
  }
}
