// ─── Object Pool ─────────────────────────────────────────────────
// Generic pool for projectiles, particles, floating texts, etc.
// D4: capped, O(1) release, and reclaims the oldest entry instead of
// silently dropping new effects when the cap is reached.

export class ObjectPool<T> {
  private pool: T[] = [];
  private active: T[] = [];
  private activeIndex = new Map<T, number>();
  private factory: () => T;
  private reset: (obj: T) => void;
  /** Hard cap on simultaneously active objects. */
  readonly maxSize: number;

  constructor(factory: () => T, reset: (obj: T) => void, initialSize = 50, maxSize = Number.POSITIVE_INFINITY) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
    const warmup = Math.min(initialSize, maxSize);
    for (let i = 0; i < warmup; i++) {
      this.pool.push(factory());
    }
  }

  /**
   * Take an object. When the cap is reached the oldest active object is
   * recycled, so callers never receive `undefined` and effects are never
   * dropped without a trace.
   */
  acquire(): T {
    if (this.pool.length === 0 && this.active.length >= this.maxSize) {
      this.release(this.active[0]);
    }
    const obj = this.pool.length > 0 ? this.pool.pop()! : this.factory();
    this.activeIndex.set(obj, this.active.length);
    this.active.push(obj);
    return obj;
  }

  /** Same as acquire() but returns null instead of recycling an older object. */
  tryAcquire(): T | null {
    if (this.pool.length === 0 && this.active.length >= this.maxSize) return null;
    return this.acquire();
  }

  release(obj: T): void {
    const idx = this.activeIndex.get(obj);
    if (idx === undefined) return;

    // Swap-remove keeps release O(1).
    const last = this.active[this.active.length - 1];
    this.active[idx] = last;
    this.activeIndex.set(last, idx);
    this.active.pop();
    this.activeIndex.delete(obj);

    this.reset(obj);
    this.pool.push(obj);
  }

  releaseAll(): void {
    for (const obj of this.active) {
      this.reset(obj);
      this.pool.push(obj);
    }
    this.active.length = 0;
    this.activeIndex.clear();
  }

  getActive(): readonly T[] {
    return this.active;
  }

  get activeCount(): number {
    return this.active.length;
  }

  get pooledCount(): number {
    return this.pool.length;
  }
}
