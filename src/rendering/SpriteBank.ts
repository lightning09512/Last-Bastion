// ─── Sprite Bank ─────────────────────────────────────────────────
// Every detailed entity is drawn ONCE into an offscreen canvas at
// `supersample` times the display size, cached, and then blitted scaled
// down. Downscaling is what gives procedural art its smooth, painted
// edges: no jagged paths, no aliased curves, no flickering outlines.
// This is also what makes richer art affordable — the expensive drawing
// happens once per (type, state, frame) instead of every frame per unit.

export type SpriteDraw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export interface SpriteStats {
  bakes: number;
  hits: number;
  entries: number;
  supersample: number;
}

export interface BlitAnchor {
  /** Horizontal anchor: 0 = left, 0.5 = centre, 1 = right. */
  ax?: number;
  /** Vertical anchor: 0 = top, 0.5 = centre, 1 = bottom. */
  ay?: number;
}

class SpriteBank {
  private cache = new Map<string, HTMLCanvasElement>();
  private capacity = 300;
  private bakeCount = 0;
  private hitCount = 0;
  private ss = 2;

  /** Internal resolution multiplier. Raising it clears the cache. */
  setSupersample(value: number): void {
    const clamped = Math.max(1, Math.min(3, Math.round(value)));
    if (clamped !== this.ss) {
      this.ss = clamped;
      this.cache.clear();
    }
  }

  get supersample(): number {
    return this.ss;
  }

  /**
   * Return a baked sprite for `key`. The returned canvas is
   * `supersample` times larger than (w, h): always blit it back at (w, h)
   * with `blit()` so the downscale stays consistent.
   */
  get(key: string, w: number, h: number, draw: SpriteDraw, supersample = this.ss): HTMLCanvasElement {
    const fullKey = `${key}#${supersample}`;
    const cached = this.cache.get(fullKey);
    if (cached) {
      this.hitCount++;
      // Refresh LRU position.
      this.cache.delete(fullKey);
      this.cache.set(fullKey, cached);
      return cached;
    }

    const scale = Math.max(1, supersample);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(w * scale));
    canvas.height = Math.max(1, Math.ceil(h * scale));

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.save();
    ctx.scale(scale, scale);
    draw(ctx, w, h);
    ctx.restore();

    this.bakeCount++;
    this.cache.set(fullKey, canvas);
    this.evict();
    return canvas;
  }

  /** Draw a baked sprite at display size (w, h) with the given anchor. */
  blit(
    ctx: CanvasRenderingContext2D,
    sprite: HTMLCanvasElement,
    x: number, y: number,
    w: number, h: number,
    anchor: BlitAnchor = {},
  ): void {
    const ax = anchor.ax ?? 0.5;
    const ay = anchor.ay ?? 0.5;
    ctx.drawImage(sprite, x - w * ax, y - h * ay, w, h);
  }

  stats(): SpriteStats {
    return {
      bakes: this.bakeCount,
      hits: this.hitCount,
      entries: this.cache.size,
      supersample: this.ss,
    };
  }

  clear(): void {
    this.cache.clear();
  }

  private evict(): void {
    while (this.cache.size > this.capacity) {
      const oldest = this.cache.keys().next().value;
      if (oldest === undefined) break;
      this.cache.delete(oldest);
    }
  }
}

export const sprites = new SpriteBank();

/** Convenience: bake and blit in one call. */
export function drawBaked(
  ctx: CanvasRenderingContext2D,
  key: string,
  w: number, h: number,
  x: number, y: number,
  draw: SpriteDraw,
  anchor: BlitAnchor = {},
  supersample?: number,
): void {
  const sprite = sprites.get(key, w, h, draw, supersample);
  sprites.blit(ctx, sprite, x, y, w, h, anchor);
}
