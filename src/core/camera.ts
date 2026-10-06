// ─── Camera ──────────────────────────────────────────────────────
// Screen shake, zoom punch and the brief freeze that makes heavy hits
// feel physical. Owned by the core so every system shakes the same way.

export class Camera {
  private shakeAmount = 0;
  private shakeDecay = 6;
  private zoom = 1;
  private zoomTarget = 1;
  private zoomSpeed = 3;
  private offsetX = 0;
  private offsetY = 0;

  /** Kick the camera. `intensity` is in design px (3 = light, 10 = heavy). */
  shake(intensity: number, duration = 0.35): void {
    this.shakeAmount = Math.max(this.shakeAmount, intensity);
    this.shakeDecay = intensity / Math.max(0.05, duration);
  }

  /** Punch the zoom in or out; it eases back to 1. */
  punch(amount: number, speed = 3): void {
    this.zoom = amount;
    this.zoomTarget = 1;
    this.zoomSpeed = speed;
  }

  update(dt: number): void {
    if (this.shakeAmount > 0.01) {
      this.offsetX = (Math.random() - 0.5) * this.shakeAmount;
      this.offsetY = (Math.random() - 0.5) * this.shakeAmount;
      this.shakeAmount = Math.max(0, this.shakeAmount - this.shakeDecay * dt);
    } else {
      this.shakeAmount = 0;
      this.offsetX = 0;
      this.offsetY = 0;
    }

    if (Math.abs(this.zoom - this.zoomTarget) > 0.0005) {
      const t = 1 - Math.exp(-this.zoomSpeed * dt);
      this.zoom += (this.zoomTarget - this.zoom) * t;
    } else {
      this.zoom = this.zoomTarget;
    }
  }

  get intensity(): number {
    return this.shakeAmount;
  }

  get currentZoom(): number {
    return this.zoom;
  }

  /**
   * Push the camera transform. Callers must pair it with `reset()` so UI
   * stays pinned to the screen.
   */
  apply(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
    const z = this.zoom;
    ctx.save();
    if (z !== 1) {
      ctx.translate(centerX, centerY);
      ctx.scale(z, z);
      ctx.translate(-centerX, -centerY);
    }
    ctx.translate(this.offsetX, this.offsetY);
  }

  reset(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }

  clear(): void {
    this.shakeAmount = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.zoom = 1;
    this.zoomTarget = 1;
  }
}
