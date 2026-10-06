// ─── VFX Library ─────────────────────────────────────────────────
// A self-contained, low-allocation particle/effect system for Kingdom Rush
// grade combat feedback: layered impacts, shockwaves, smoke, debris with
// gravity, sky-to-ground lightning and ground decals that outlive the hit.
//
// Design rules that keep it cheap:
//   • Every particle is a pre-allocated object in one flat ring buffer. The
//     hard cap (default 600) is never exceeded: when the budget is full the
//     OLDEST particle is overwritten and `overwrittenCount` is incremented,
//     so the pressure is measurable instead of silently swallowed.
//   • No gradient, shadow or blur is ever created per frame. Soft radial
//     blobs, smoke puffs and speed streaks are baked ONCE into small
//     offscreen canvases and blitted with rotation/alpha/scale.
//   • Baking is lazy, so importing this module (or the Node smoke harness)
//     never touches `document` until the first spawn.
//   • Additive kinds (fire, magic, gold, lightning) render in a second pass
//     with `globalCompositeOperation = 'lighter'`; smoke, debris and decals
//     stay in the first pass with the default source-over.

export type VfxKind =
  | 'explosion' | 'frostBurst' | 'fireLick' | 'lightning' | 'holySmite'
  | 'poisonCloud' | 'dust' | 'debris' | 'shockwave' | 'smokePuff'
  | 'coinPop' | 'healGlow' | 'shieldBreak' | 'stunStars'
  | 'arrowImpact' | 'magicImpact' | 'bloodSpray' | 'spawnPuff';

export interface VfxOptions {
  scale?: number;
  color?: string;
  count?: number;
}

// ─── Internal shapes ─────────────────────────────────────────────
// Partial sprites (`dx`,`dy` present) are sized in em and positioned along
// the flight direction; whole sprites are centred on the particle.

type VfxShape =
  | 'soft' | 'core' | 'streak' | 'smoke' | 'shard' | 'ring'
  | 'decal' | 'rune' | 'spin' | 'plus' | 'orbit';

/**
 * Draw order, baked into the layer index. `additive` marks the layers that
 * are rendered with `lighter`; the rest use source-over.
 */
const L_DECAL = 0;
const L_DUST = 1;
const L_SMOKE = 2;
const L_GLOW = 3;
const L_CORE = 4;
const L_SPARK = 5;
const L_OVER = 6;
const LAYER_COUNT = 7;

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
  size: number;
  growth: number;
  ang: number;
  spin: number;
  stretch: number;
  grav: number;
  drag: number;
  bounce: number;
  fadeIn: number;
  layer: number;
  additive: boolean;
  shape: VfxShape;
  color: string;
  color2: string;
  alpha: number;
  ringWidth: number;
  /** Partial sprites only: offset along the flight direction, in em. */
  dx: number;
  dy: number;
  /** Orbit shape only: angle, radius, angular speed and orbit centre. */
  orbAng: number;
  orbRadius: number;
  orbSpeed: number;
  orbCx: number;
  orbCy: number;
  /** Ring/decal vertical squash for the ground plane (1 = upright circle). */
  squash: number;
  runeArms: number;
}

/** One procedurally generated sky-to-ground bolt. */
interface Bolt {
  active: boolean;
  x: number;
  y: number;
  t: number;
  life: number;
  scale: number;
  color: string;
  jitter: number[];
}

interface SpriteSet {
  soft: HTMLCanvasElement;
  hard: HTMLCanvasElement;
  smoke: HTMLCanvasElement;
  streak: HTMLCanvasElement | null;
  ember: HTMLCanvasElement;
  glow: CanvasGradient | null;
  hardW: number;
  hardH: number;
}

const ATLAS = 64;
const BOLT_POINTS = 13;
const MAX_BOLTS = 12;
const DEFAULT_MAX = 600;

/** Fade-in for the one-frame flashes, so they pop instead of snapping. */
const FLASH_FADE_IN = 0.25;

/** Layers rendered with `lighter` in the second pass. */
function isAdditiveLayer(layer: number): boolean {
  return layer === L_GLOW || layer === L_CORE || layer === L_SPARK || layer === L_OVER;
}

// ─── Bake helpers (run once) ─────────────────────────────────────

function createCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function bakeSpriteSet(): SpriteSet {
  const half = ATLAS / 2;

  // Hard opaque disc: glowing cores.
  const hard = createCanvas(ATLAS, ATLAS);
  const hctx = hard.getContext('2d')!;
  hctx.fillStyle = '#ffffff';
  hctx.beginPath();
  hctx.arc(half, half, half - 2, 0, Math.PI * 2);
  hctx.fill();

  // Soft radial blob: the workhorse for glow, dust and debris.
  const soft = createCanvas(ATLAS, ATLAS);
  const sctx = soft.getContext('2d')!;
  const sg = sctx.createRadialGradient(half, half, 0, half, half, half);
  sg.addColorStop(0, 'rgba(255,255,255,1)');
  sg.addColorStop(0.32, 'rgba(255,255,255,0.85)');
  sg.addColorStop(0.62, 'rgba(255,255,255,0.3)');
  sg.addColorStop(0.85, 'rgba(255,255,255,0.07)');
  sg.addColorStop(1, 'rgba(255,255,255,0)');
  sctx.fillStyle = sg;
  sctx.fillRect(0, 0, ATLAS, ATLAS);

  // Ember: white-hot core with a compact warm halo. Doubles as the bright
  // centre of fire glows.
  const ember = createCanvas(32, 32);
  const ectx = ember.getContext('2d')!;
  const eg = ectx.createRadialGradient(16, 16, 0, 16, 16, 16);
  eg.addColorStop(0, 'rgba(255,255,255,1)');
  eg.addColorStop(0.2, 'rgba(255,252,232,0.98)');
  eg.addColorStop(0.45, 'rgba(255,236,186,0.6)');
  eg.addColorStop(0.75, 'rgba(255,206,140,0.2)');
  eg.addColorStop(1, 'rgba(255,180,90,0)');
  ectx.fillStyle = eg;
  ectx.fillRect(0, 0, 32, 32);

  // Smoke puff: several soft lobes, deliberately off-centre.
  const smoke = createCanvas(ATLAS, ATLAS);
  const kctx = smoke.getContext('2d')!;
  const lobe = (lx: number, ly: number, lr: number, a: number): void => {
    const lg = kctx.createRadialGradient(lx, ly, 0, lx, ly, lr);
    lg.addColorStop(0, `rgba(255,255,255,${a})`);
    lg.addColorStop(0.45, `rgba(255,255,255,${a * 0.55})`);
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    kctx.fillStyle = lg;
    kctx.beginPath();
    kctx.arc(lx, ly, lr, 0, Math.PI * 2);
    kctx.fill();
  };
  lobe(32, 33, 25, 0.85);
  lobe(22, 27, 17, 0.7);
  lobe(43, 26, 16, 0.7);
  lobe(27, 41, 15, 0.6);
  lobe(41, 42, 14, 0.55);

  // Tapered streak: bright at +x (the hot end), transparent at -x (the tail).
  let streak: HTMLCanvasElement | null = null;
  const streakCanvas = createCanvas(32, 16);
  const tctx = streakCanvas.getContext('2d');
  if (tctx) {
    const tg = tctx.createLinearGradient(0, 0, 32, 0);
    tg.addColorStop(0, 'rgba(255,255,255,0)');
    tg.addColorStop(0.45, 'rgba(255,255,255,0.3)');
    tg.addColorStop(0.8, 'rgba(255,255,255,0.9)');
    tg.addColorStop(1, 'rgba(255,255,255,1)');
    tctx.fillStyle = tg;
    tctx.beginPath();
    tctx.moveTo(31, 8);
    tctx.lineTo(4, 3.4);
    tctx.lineTo(0, 8);
    tctx.lineTo(4, 12.6);
    tctx.closePath();
    tctx.fill();
    streak = streakCanvas;
  }

  return {
    soft,
    hard,
    smoke,
    streak,
    ember,
    glow: null,
    hardW: ATLAS,
    hardH: ATLAS,
  };
}

// ─── VFX System ──────────────────────────────────────────────────

export class VfxSystem {
  readonly maxParticles: number;

  private readonly pool: Particle[] = [];
  private cursor = 0;
  private overwriteCount = 0;
  private boltCount = 0;

  private readonly bolts: Bolt[] = [];

  /** Reusable per-frame layer buckets: no allocation inside update/draw. */
  private readonly layerHead = new Int32Array(LAYER_COUNT);
  private readonly layerCursor = new Int32Array(LAYER_COUNT);
  private readonly layerCount = new Int32Array(LAYER_COUNT);
  private readonly sortedIndex = new Int32Array(DEFAULT_MAX);

  private sprites: SpriteSet | null = null;

  constructor(maxParticles: number = DEFAULT_MAX) {
    const cap = Math.max(16, Math.floor(maxParticles));
    this.maxParticles = cap;
    this.sortedIndex = new Int32Array(cap);

    for (let i = 0; i < cap; i++) this.pool.push(this.blankParticle());
    for (let i = 0; i < MAX_BOLTS; i++) {
      const jitter: number[] = [];
      for (let j = 0; j < BOLT_POINTS; j++) jitter.push(0);
      this.bolts.push({
        active: false,
        x: 0,
        y: 0,
        t: 0,
        life: 1,
        scale: 1,
        color: '#ffffff',
        jitter,
      });
    }
  }

  // ─── Public API ────────────────────────────────────────────────

  /** Number of live particles (decals included). */
  get activeCount(): number {
    let n = 0;
    for (let i = 0; i < this.pool.length; i++) if (this.pool[i].active) n++;
    return n;
  }

  /** How many particles have been dropped because the cap was reached. */
  get overwritten(): number {
    return this.overwriteCount;
  }

  /** Spawn a complete multi-layer effect. */
  spawn(kind: VfxKind, x: number, y: number, opts?: VfxOptions): void {
    const scale = opts && opts.scale !== undefined && opts.scale > 0 ? opts.scale : 1;
    const count = opts && opts.count !== undefined ? Math.max(1, Math.min(80, Math.round(opts.count))) : 0;
    switch (kind) {
      case 'explosion': this.recipeExplosion(x, y, scale, count); break;
      case 'frostBurst': this.recipeFrostBurst(x, y, scale, count); break;
      case 'fireLick': this.recipeFireLick(x, y, scale, count); break;
      case 'lightning': this.recipeLightning(x, y, scale, opts?.color); break;
      case 'holySmite': this.recipeHolySmite(x, y, scale); break;
      case 'poisonCloud': this.recipePoisonCloud(x, y, scale, count); break;
      case 'dust': this.recipeDust(x, y, scale, count); break;
      case 'debris': this.recipeDebris(x, y, scale, count); break;
      case 'shockwave': this.recipeShockwave(x, y, scale, opts?.color); break;
      case 'smokePuff': this.recipeSmokePuff(x, y, scale, opts?.color); break;
      case 'coinPop': this.recipeCoinPop(x, y, scale); break;
      case 'healGlow': this.recipeHealGlow(x, y, scale); break;
      case 'shieldBreak': this.recipeShieldBreak(x, y, scale); break;
      case 'stunStars': this.recipeStunStars(x, y, scale); break;
      case 'arrowImpact': this.recipeArrowImpact(x, y, scale); break;
      case 'magicImpact': this.recipeMagicImpact(x, y, scale, opts?.color); break;
      case 'bloodSpray': this.recipeBloodSpray(x, y, scale, count); break;
      case 'spawnPuff': this.recipeSpawnPuff(x, y, scale); break;
      default: return;
    }
  }

  /** Advance every live particle. `dt` is in seconds, already speed-scaled. */
  update(dt: number): void {
    if (!(dt > 0)) return;
    const sdt = dt > 0.1 ? 0.1 : dt;

    const pool = this.pool;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.active) continue;
      p.t += sdt;
      if (p.t >= p.life) {
        p.active = false;
        continue;
      }
      if (p.shape === 'orbit') {
        const k = p.t / p.life;
        p.orbAng += p.orbSpeed * sdt;
        p.x = p.orbCx + Math.cos(p.orbAng) * p.orbRadius;
        p.y = p.orbCy + Math.sin(p.orbAng) * p.orbRadius * 0.34 - 1 - k * 5;
        continue;
      }
      const dragK = p.drag > 0 ? 1 / (1 + p.drag * sdt) : 1;
      p.vx *= dragK;
      p.vy *= dragK;
      p.vy += p.grav * sdt;
      p.x += p.vx * sdt;
      p.y += p.vy * sdt;
      p.ang += p.spin * sdt;
    }

    if (this.boltCount > 0) {
      for (let i = 0; i < this.bolts.length; i++) {
        const b = this.bolts[i];
        if (!b.active) continue;
        b.t += sdt;
        if (b.t >= b.life) {
          b.active = false;
          this.boltCount--;
        }
      }
    }
  }

  /** Draw every live effect. `ctx` must be in 1280×720 design space. */
  draw(ctx: CanvasRenderingContext2D): void {
    if (this.sprites === null) this.buildSprites();
    const sprites = this.sprites;
    if (sprites === null) return;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    this.prepareBuckets();

    // Pass 1 — smoke, dust, shards, decals.
    ctx.globalCompositeOperation = 'source-over';
    for (let layer = 0; layer < LAYER_COUNT; layer++) {
      if (this.layerCount[layer] === 0 || layer === L_GLOW || layer === L_CORE || layer === L_SPARK) continue;
      this.drawBucket(ctx, layer, sprites);
    }

    // Pass 2 — additive glow, lightning, gold.
    ctx.globalCompositeOperation = 'lighter';
    this.drawBolts(ctx);
    for (let layer = 0; layer < LAYER_COUNT; layer++) {
      if (this.layerCount[layer] === 0) continue;
      if (layer !== L_GLOW && layer !== L_CORE && layer !== L_SPARK && layer !== L_OVER) continue;
      this.drawBucket(ctx, layer, sprites);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** Kill every particle and bolt immediately (level restart). */
  clear(): void {
    for (let i = 0; i < this.pool.length; i++) this.pool[i].active = false;
    for (let i = 0; i < this.bolts.length; i++) this.bolts[i].active = false;
    this.boltCount = 0;
    this.cursor = 0;
  }

  // ─── Pool ──────────────────────────────────────────────────────

  private blankParticle(): Particle {
    return {
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      t: 0,
      life: 1,
      size: 1,
      growth: 0,
      ang: 0,
      spin: 0,
      stretch: 0,
      grav: 0,
      drag: 0,
      bounce: 0,
      fadeIn: 0,
      layer: L_GLOW,
      additive: true,
      shape: 'soft',
      color: '#ffffff',
      color2: '#ffffff',
      alpha: 1,
      ringWidth: 2,
      dx: 0,
      dy: 0,
      orbAng: 0,
      orbRadius: 0,
      orbSpeed: 0,
      orbCx: 0,
      orbCy: 0,
      squash: 1,
      runeArms: 1,
    };
  }

  /**
   * Per-frame state for one effect. Fields left at their defaults cost
   * nothing: the update loop only branches on a handful of them.
   */
  private fire(
    shape: VfxShape,
    layer: number,
    color: string,
    x: number,
    y: number,
    size: number,
    life: number,
    vx: number,
    vy: number,
    grav: number,
    drag: number,
    alpha: number,
  ): Particle {
    const pool = this.pool;
    if (this.cursor >= pool.length) this.cursor = 0;
    const p = pool[this.cursor];
    this.cursor++;
    if (p.active) this.overwriteCount++;

    p.active = true;
    p.t = 0;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.size = size;
    p.life = life > 0.02 ? life : 0.02;
    p.growth = 0;
    p.ang = 0;
    p.spin = 0;
    p.stretch = 0;
    p.grav = grav;
    p.drag = drag;
    p.bounce = 0;
    p.fadeIn = 0;
    p.layer = layer;
    p.additive = isAdditiveLayer(layer);
    p.shape = shape;
    p.color = color;
    p.color2 = color;
    p.alpha = alpha;
    p.fadeIn = shape === 'core' || shape === 'streak' ? FLASH_FADE_IN : 0;
    p.ringWidth = 2;
    p.dx = 0;
    p.dy = 0;
    p.squash = 1;
    p.runeArms = 1;
    return p;
  }

  private soft(
    layer: number,
    color: string,
    x: number, y: number,
    size: number, life: number,
    vx: number, vy: number,
    grav: number, drag: number,
    alpha: number, growth = 0,
  ): Particle {
    const p = this.fire('soft', layer, color, x, y, size, life, vx, vy, grav, drag, alpha);
    p.growth = growth;
    return p;
  }

  private puff(
    color: string,
    x: number, y: number,
    size: number, life: number,
    vx: number, vy: number,
    grav: number, drag: number,
    alpha: number, growth: number,
  ): Particle {
    const p = this.fire('smoke', L_SMOKE, color, x, y, size, life, vx, vy, grav, drag, alpha);
    p.growth = growth;
    $seed(p);
    return p;
  }

  private shard(
    color: string,
    x: number, y: number,
    size: number, life: number,
    vx: number, vy: number,
    grav: number, bounce: number,
  ): Particle {
    const p = this.fire('shard', L_DUST, color, x, y, size, life, vx, vy, grav, 0.12, 1);
    p.spin = ($rand() - 0.5) * 26;
    p.ang = $rand() * 6.283;
    p.bounce = bounce;
    return p;
  }

  private spark(
    color: string,
    x: number, y: number,
    size: number, life: number,
    vx: number, vy: number,
    grav: number, drag: number,
  ): Particle {
    const p = this.fire('streak', L_SPARK, color, x, y, size, life, vx, vy, grav, drag, 1);
    p.stretch = 1.5 + $rand() * 1.8;
    p.ang = Math.atan2(vy, vx);
    p.spin = 0;
    return p;
  }

  private ember(
    x: number, y: number,
    size: number, life: number,
    vx: number, vy: number,
    grav: number, drag: number,
  ): Particle {
    const p = this.fire('core', L_GLOW, '#ffcf7a', x, y, size, life, vx, vy, grav, drag, 0.9);
    p.growth = size * 0.6;
    return p;
  }

  private ring(
    color: string,
    x: number, y: number,
    size: number, life: number,
    width: number, additive: boolean, squash = 1,
  ): Particle {
    const p = this.fire('ring', additive ? L_CORE : L_DUST, color, x, y, size, life, 0, 0, 0, 0, additive ? 0.9 : 0.6);
    p.ringWidth = width;
    p.squash = squash;
    p.additive = additive;
    return p;
  }

  private decal(
    color: string,
    x: number, y: number,
    size: number, life: number,
    shape: 'decal' | 'rune',
  ): Particle {
    const p = this.fire(shape, L_DECAL, color, x, y, size, life, 0, 0, 0, 0, 0.6);
    p.additive = false;
    p.squash = shape === 'decal' ? 0.52 : 0.5;
    p.ang = $rand() * 6.283;
    if (shape === 'rune') {
      p.spin = 0.35;
      p.runeArms = 4 + Math.floor($rand() * 3);
      p.alpha = 0.75;
    } else {
      p.growth = size * 0.22;
    }
    return p;
  }

  private arc(
    color: string,
    x: number, y: number,
    size: number, life: number,
    ang: number, speed: number,
    grav: number, drag: number,
    layer = L_SPARK,
  ): Particle {
    const p = this.fire('soft', layer, color, x, y, size, life, Math.cos(ang) * speed, Math.sin(ang) * speed, grav, drag, 0.92);
    p.growth = -size * 0.35;
    return p;
  }

  private orbitStar(x: number, y: number, radius: number, life: number): void {
    const p = this.fire('orbit', L_OVER, '#ffe066', x, y, 5, life, 0, 0, 0, 0, 1);
    p.orbAng = $rand() * 6.283;
    p.orbRadius = radius;
    p.orbSpeed = 5.6 * ($rand() < 0.5 ? -1 : 1);
    p.orbCx = x;
    p.orbCy = y;
    p.spin = 3.4;
  }

  private bolt(x: number, y: number, scale: number, color: string): void {
    let slot: Bolt | null = null;
    for (let i = 0; i < this.bolts.length; i++) {
      if (!this.bolts[i].active) {
        slot = this.bolts[i];
        break;
      }
    }
    if (slot === null) {
      slot = this.bolts[0];
      for (let i = 1; i < this.bolts.length; i++) {
        if (this.bolts[i].t > slot.t) slot = this.bolts[i];
      }
    } else {
      this.boltCount++;
    }
    slot.active = true;
    slot.t = 0;
    slot.life = 0.2 + $rand() * 0.08;
    slot.x = x;
    slot.y = y;
    slot.scale = scale;
    slot.color = color;
    for (let i = 0; i < BOLT_POINTS; i++) slot.jitter[i] = $rand() * 2 - 1;
  }

  // ─── Recipes ───────────────────────────────────────────────────
  // Layer order per kind is always: decal → smoke/dust → glow → sparks,
  // which is exactly the pass order used by draw().

  private recipeExplosion(x: number, y: number, s: number, count: number): void {
    const n = count > 0 ? count : 9;

    // 1–2 frame white flash.
    this.soft(L_CORE, '#ffffff', x, y, 44 * s, 0.09, 0, 0, 0, 0, 1, 20 * s);
    // Shockwave ring.
    this.ring('#ffd9a0', x, y, 13 * s, 0.42, 5.5 * s, true, 0.75);

    // Fireball lobes.
    for (let i = 0; i < n; i++) {
      const a = $rand() * 6.283;
      const sp = 22 + $rand() * 52;
      this.soft(L_GLOW, '#ff9a3c', x, y - 1, 15 * s, 0.28 + $rand() * 0.22, Math.cos(a) * sp * s, Math.sin(a) * sp * s - 22 * s, -35, 2.4, 0.9, 15 * s);
    }
    for (let i = 0; i < 5; i++) {
      const a = $rand() * 6.283;
      const sp = 12 + $rand() * 30;
      this.soft(L_GLOW, '#ffe9a8', x, y, 9 * s, 0.22, Math.cos(a) * sp * s, Math.sin(a) * sp * s - 16 * s, -20, 2.6, 0.95, 8 * s);
    }

    // Smoke column.
    const puffs = 6 + Math.floor(n * 0.6);
    for (let i = 0; i < puffs; i++) {
      const a = $rand() * 6.283;
      const sp = 12 + $rand() * 40;
      this.puff(
        $rand() < 0.45 ? '#c9c4bc' : '#6f6b66',
        x + ($rand() - 0.5) * 12 * s, y - 2 + ($rand() - 0.5) * 8 * s,
        (9 + $rand() * 8) * s, 0.7 + $rand() * 0.8,
        Math.cos(a) * sp * s, Math.sin(a) * sp * s - 30 * s,
        -14, 1.7, 0.42 + $rand() * 0.26, 20 * s,
      );
    }

    // Debris on ballistic arcs.
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI * (0.15 + $rand() * 0.7);
      const sp = 60 + $rand() * 100;
      this.shard($rand() < 0.5 ? '#4a423a' : '#2a1f38', x, y, (1.8 + $rand() * 2.4) * s, 0.8 + $rand() * 0.5, Math.cos(a) * sp * s, Math.sin(a) * sp * s, 320, 0.35);
    }

    this.decal('#231a14', x, y, 16 * s, 3.4, 'decal');
  }

  private recipeFrostBurst(x: number, y: number, s: number, count: number): void {
    const n = count > 0 ? count : 7;
    this.soft(L_CORE, '#ffffff', x, y, 32 * s, 0.11, 0, 0, 0, 0, 1, 14 * s);
    this.ring('#bfe9ff', x, y, 12 * s, 0.45, 4.5 * s, true, 0.82);
    this.ring('#e6f7ff', x, y, 20 * s, 0.5, 1.5 * s, true, 0.85);

    for (let i = 0; i < n; i++) {
      const a = $rand() * 6.283;
      const sp = 85 + $rand() * 105;
      this.shard('#cdefff', x, y, (1.4 + $rand() * 1.8) * s, 0.45 + $rand() * 0.3, Math.cos(a) * sp * s, Math.sin(a) * sp * s, 200, 0.2);
    }
    for (let i = 0; i < 7; i++) {
      const a = $rand() * 6.283;
      const sp = 18 + $rand() * 40;
      this.soft(L_GLOW, '#9fd8ff', x, y, (6 + $rand() * 7) * s, 0.4 + $rand() * 0.35, Math.cos(a) * sp * s, Math.sin(a) * sp * s - 8, -12, 2.1, 0.7, 10 * s);
    }
    for (let i = 0; i < 5; i++) {
      const a = $rand() * 6.283;
      const sp = 40 + $rand() * 60;
      this.spark('#ffffff', x, y, (1.2 + $rand()) * s, 0.3, Math.cos(a) * sp, Math.sin(a) * sp, 60, 2.6);
    }
    this.decal('#dff2ff', x, y, 14 * s, 2.2, 'decal');
  }

  private recipeFireLick(x: number, y: number, s: number, count: number): void {
    const n = count > 0 ? count : 5;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.25 + $rand() * 0.5);
      const sp = 25 + $rand() * 55;
      this.soft(L_GLOW, $rand() < 0.4 ? '#ffe08a' : '#ff8a2c', x, y, (7 + $rand() * 6) * s, 0.25 + $rand() * 0.2, Math.cos(a) * sp, Math.sin(a) * sp - 12, -60, 2.2, 0.9, 7 * s);
    }
    this.ember(x, y, 3.4 * s, 0.4, ($rand() - 0.5) * 30, -30 - $rand() * 30, -40, 1.5);
    this.ember(x, y, 2.6 * s, 0.32, ($rand() - 0.5) * 40, -20 - $rand() * 40, -30, 1.2);
    this.decal('#2a1c12', x + ($rand() - 0.5) * 8, y + 2, 7 * s, 1.6, 'decal');
  }

  private recipeLightning(x: number, y: number, s: number, color?: string): void {
    this.bolt(x, y - 186 * s, s, color ?? '#cfe4ff');
    this.soft(L_CORE, '#ffffff', x, y, 40 * s, 0.1, 0, 0, 0, 0, 1, 16 * s);
    this.ring(color ?? '#a8d8ff', x, y, 11 * s, 0.38, 4 * s, true, 0.6);
    for (let i = 0; i < 8; i++) {
      const a = $rand() * 6.283;
      const sp = 70 + $rand() * 130;
      this.spark(color ?? '#dff0ff', x, y - 1, (1.3 + $rand() * 1.3) * s, 0.22 + $rand() * 0.15, Math.cos(a) * sp, Math.sin(a) * sp - 20, 120, 2.2);
    }
    for (let i = 0; i < 3; i++) {
      const a = $rand() * 6.283;
      this.puff('#b9c6d6', x, y - 2, (7 + $rand() * 5) * s, 0.6, Math.cos(a) * 24, Math.sin(a) * 20 - 12, -10, 1.6, 0.3, 12 * s);
    }
    this.decal('#241d18', x, y, 11 * s, 2.8, 'decal');
  }

  private recipeHolySmite(x: number, y: number, s: number): void {
    this.soft(L_CORE, '#fffbe8', x, y, 46 * s, 0.16, 0, 0, 0, 0, 1, 22 * s);
    this.ring('#ffe89a', x, y, 13 * s, 0.5, 6 * s, true, 0.85);
    this.ring('#fff3c4', x, y, 22 * s, 0.55, 2 * s, true, 0.9);
    // Golden pillar.
    this.fire('soft', L_GLOW, '#ffe6a0', x, y - 26 * s, 26 * s, 0.34, 0, -70, 0, 0, 0.55);
    for (let i = 0; i < 9; i++) {
      const a = $rand() * 6.283;
      this.arc('#fff0b8', x, y - 4, (2.2 + $rand() * 2.2) * s, 0.36 + $rand() * 0.25, a, 110 + $rand() * 90, -120, 2.4, L_GLOW);
    }
    this.decal('#ffe9a8', x, y, 17 * s, 2.6, 'rune');
  }

  private recipePoisonCloud(x: number, y: number, s: number, count: number): void {
    const n = count > 0 ? count : 9;
    for (let i = 0; i < n; i++) {
      const a = $rand() * 6.283;
      const sp = 8 + $rand() * 26;
      this.puff($rand() < 0.5 ? '#7fbf3f' : '#5f8f2a', x, y - 3, (8 + $rand() * 9) * s, 0.9 + $rand() * 0.9, Math.cos(a) * sp * s, Math.sin(a) * sp * s - 16 * s, -18, 1.5, 0.46, 16 * s);
    }
    for (let i = 0; i < 5; i++) {
      const a = $rand() * 6.283;
      this.soft(L_GLOW, '#b6e35c', x, y, (4 + $rand() * 4) * s, 0.4 + $rand() * 0.3, Math.cos(a) * 22, Math.sin(a) * 22 - 10, -16, 1.9, 0.5, 8 * s);
    }
    this.decal('#3d5220', x, y, 15 * s, 3.6, 'decal');
  }

  private recipeDust(x: number, y: number, s: number, count: number): void {
    const n = count > 0 ? count : 5;
    this.ring('#ded3bd', x, y, 9 * s, 0.42, 2.2 * s, false, 0.5);
    for (let i = 0; i < n; i++) {
      const a = $rand() * 6.283;
      const sp = 24 + $rand() * 46;
      this.puff($rand() < 0.5 ? '#ded3bd' : '#b9ab92', x, y, (6 + $rand() * 6) * s, 0.4 + $rand() * 0.35, Math.cos(a) * sp, Math.sin(a) * sp * 0.5, -14, 2.2, 0.42, 12 * s);
    }
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI * (0.2 + $rand() * 0.6);
      const sp = 40 + $rand() * 60;
      this.shard('#8a7f6a', x, y, (1.4 + $rand() * 1.4) * s, 0.5, Math.cos(a) * sp, Math.sin(a) * sp, 240, 0.3);
    }
  }

  private recipeDebris(x: number, y: number, s: number, count: number): void {
    const n = count > 0 ? count : 7;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.1 + $rand() * 0.8);
      const sp = 70 + $rand() * 120;
      this.shard($rand() < 0.4 ? '#6b6155' : '#3d352c', x, y, (2 + $rand() * 2.6) * s, 0.9 + $rand() * 0.6, Math.cos(a) * sp * s, Math.sin(a) * sp * s, 380, 0.42);
    }
    this.soft(L_DUST, '#cbbc9e', x, y, 12 * s, 0.3, 0, -14, -10, 1.8, 0.35, 12 * s);
    for (let i = 0; i < 4; i++) {
      const a = $rand() * 6.283;
      this.puff('#a89b84', x, y, (5 + $rand() * 5) * s, 0.45, Math.cos(a) * 20, Math.sin(a) * 12 - 10, -12, 2, 0.35, 10 * s);
    }
    this.decal('#1e1712', x, y, 10 * s, 3.2, 'decal');
  }

  private recipeShockwave(x: number, y: number, s: number, color?: string): void {
    const tone = color ?? '#ffffff';
    this.ring(tone, x, y, 14 * s, 0.45, 4.5 * s, true, 0.72);
    this.ring(tone, x, y, 8 * s, 0.55, 2 * s, true, 0.55);
    for (let i = 0; i < 6; i++) {
      const a = $rand() * 6.283;
      const sp = 60 + $rand() * 70;
      this.spark(tone, x, y, (1.2 + $rand()) * s, 0.26, Math.cos(a) * sp, Math.sin(a) * sp * 0.6, 90, 2.4);
    }
  }

  private recipeSmokePuff(x: number, y: number, s: number, color?: string): void {
    const tone = color ?? '#9b9791';
    for (let i = 0; i < 5; i++) {
      const a = $rand() * 6.283;
      const sp = 10 + $rand() * 26;
      this.puff(tone, x, y, (7 + $rand() * 7) * s, 0.6 + $rand() * 0.6, Math.cos(a) * sp * s, Math.sin(a) * sp * s - 14 * s, -12, 1.7, 0.42, 15 * s);
    }
    this.soft(L_GLOW, '#e8e4dc', x, y - 2, 8 * s, 0.22, 0, -24, 0, 2, 0.4, 6 * s);
  }

  private recipeCoinPop(x: number, y: number, s: number): void {
    this.soft(L_CORE, '#fff6c8', x, y, 22 * s, 0.16, 0, 0, 0, 0, 1, 8 * s);
    this.ring('#ffd75e', x, y, 8 * s, 0.35, 2.6 * s, true, 0.9);
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI * (0.25 + $rand() * 0.5);
      const sp = 55 + $rand() * 80;
      const c = this.fire('spin', L_OVER, '#ffd75e', x, y, 3.6 + $rand() * 1.6, 0.75 + $rand() * 0.35, Math.cos(a) * sp, Math.sin(a) * sp, 420, 0.1, 1);
      c.spin = 8 + $rand() * 8;
      c.ang = $rand() * 6.283;
      c.color2 = '#fff3bc';
    }
    for (let i = 0; i < 6; i++) {
      const a = $rand() * 6.283;
      const sp = 40 + $rand() * 60;
      this.spark(i % 2 === 0 ? '#fff3bc' : '#ffffff', x, y, 1.1 + $rand() * 1.2, 0.3, Math.cos(a) * sp, Math.sin(a) * sp - 20, 40, 2.6);
    }
    this.plusGlyph(x + 6 * s, y - 16 * s, s);
  }

  private plusGlyph(x: number, y: number, s: number): void {
    const p = this.fire('plus', L_OVER, '#ffe9a0', x, y, 5 * s, 0.6, 0, -16, 0, 1.4, 1);
    p.growth = 2 * s;
  }

  private recipeHealGlow(x: number, y: number, s: number): void {
    this.ring('#8ef5a8', x, y, 9 * s, 0.7, 2.4 * s, true, 0.5);
    this.soft(L_GLOW, '#b6ffbe', x, y, 16 * s, 0.7, 0, 0, 0, 1.4, 0.6, 14 * s);
    for (let i = 0; i < 7; i++) {
      const a = $rand() * 6.283;
      this.arc('#d9ffdf', x + ($rand() - 0.5) * 6, y + 4, (1.8 + $rand() * 1.8) * s, 0.55 + $rand() * 0.4, a, 16 + $rand() * 22, -19, 1.1, L_GLOW);
    }
    // Rising motes.
    for (let i = 0; i < 4; i++) {
      this.soft(L_GLOW, '#a7ff9c', x + ($rand() - 0.5) * 18 * s, y + 6, (2.6 + $rand() * 2) * s, 0.6 + $rand() * 0.4, ($rand() - 0.5) * 14, -30, -12, 1.2, 0.9, -1.4);
    }
    this.decal('#8ef5a8', x, y, 12 * s, 1.7, 'rune');
  }

  private recipeShieldBreak(x: number, y: number, s: number): void {
    this.soft(L_CORE, '#ffffff', x, y, 26 * s, 0.1, 0, 0, 0, 0, 1, 12 * s);
    this.ring('#9fd8ff', x, y, 11 * s, 0.4, 4 * s, true, 0.68);
    for (let i = 0; i < 8; i++) {
      const a = $rand() * 6.283;
      const sp = 55 + $rand() * 85;
      this.shard(i % 2 === 0 ? '#dff0ff' : '#8ab6d8', x, y, (1.8 + $rand() * 2) * s, 0.5 + $rand() * 0.3, Math.cos(a) * sp * s, Math.sin(a) * sp * s, 300, 0.35);
    }
    for (let i = 0; i < 6; i++) {
      const a = $rand() * 6.283;
      const sp = 80 + $rand() * 90;
      this.spark('#ffffff', x, y, (1.1 + $rand()) * s, 0.24, Math.cos(a) * sp, Math.sin(a) * sp, 120, 2.4);
    }
  }

  private recipeStunStars(x: number, y: number, s: number): void {
    for (let i = 0; i < 3; i++) this.orbitStar(x, y - 12 * s, (9 + i * 2.2) * s, 1.1 + i * 0.15);
    this.soft(L_GLOW, '#ffe9a0', x, y - 12 * s, 8 * s, 0.18, 0, 0, 0, 0, 0.7, 8 * s);
  }

  private recipeArrowImpact(x: number, y: number, s: number): void {
    this.soft(L_CORE, '#fff2cf', x, y, 13 * s, 0.08, 0, 0, 0, 0, 0.95, 7 * s);
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + $rand() * Math.PI * 1.4;
      const sp = 50 + $rand() * 90;
      this.spark(i % 2 === 0 ? '#ffe7b0' : '#ffffff', x, y, (1 + $rand() * 1.2) * s, 0.16 + $rand() * 0.12, Math.cos(a) * sp, Math.sin(a) * sp, 160, 2.6);
    }
    for (let i = 0; i < 3; i++) {
      const a = $rand() * 6.283;
      this.puff('#cbbc9e', x, y, (4 + $rand() * 4) * s, 0.35, Math.cos(a) * 22, Math.sin(a) * 12 - 8, -10, 2, 0.32, 8 * s);
    }
  }

  private recipeMagicImpact(x: number, y: number, s: number, color?: string): void {
    const tone = color ?? '#b98aff';
    this.soft(L_CORE, '#ffffff', x, y, 24 * s, 0.11, 0, 0, 0, 0, 1, 12 * s);
    this.ring(tone, x, y, 9 * s, 0.42, 3 * s, true, 0.85);
    for (let i = 0; i < 7; i++) {
      const a = $rand() * 6.283;
      const sp = 30 + $rand() * 55;
      this.soft(L_GLOW, i % 2 === 0 ? tone : '#e6d6ff', x, y, (4 + $rand() * 4) * s, 0.35 + $rand() * 0.25, Math.cos(a) * sp, Math.sin(a) * sp, -20, 2.2, 0.8, 8 * s);
    }
    for (let i = 0; i < 6; i++) {
      const a = $rand() * 6.283;
      const sp = 60 + $rand() * 90;
      this.spark('#e9d5ff', x, y, (1.2 + $rand()) * s, 0.26, Math.cos(a) * sp, Math.sin(a) * sp - 10, 30, 2.5);
    }
    this.decal(tone, x, y, 11 * s, 1.9, 'rune');
  }

  private recipeBloodSpray(x: number, y: number, s: number, count: number): void {
    const n = count > 0 ? count : 8;
    for (let i = 0; i < n; i++) {
      const a = $rand() * 6.283;
      const sp = 45 + $rand() * 95;
      this.soft(L_DUST, i % 3 === 0 ? '#c1121f' : '#8a1420', x, y - 2, (1.2 + $rand() * 1.9) * s, 0.3 + $rand() * 0.35, Math.cos(a) * sp * s, Math.sin(a) * sp * s - 20, 420, 0.5, 0.95, -0.6);
    }
    for (let i = 0; i < 4; i++) {
      const a = $rand() * 6.283;
      this.puff('#5e0f16', x, y, (3 + $rand() * 3) * s, 0.35, Math.cos(a) * 16, Math.sin(a) * 10 - 8, 60, 1.8, 0.3, 8 * s);
    }
    this.decal('#5a1018', x + ($rand() - 0.5) * 10, y + 3, 9 * s, 3, 'decal');
  }

  private recipeSpawnPuff(x: number, y: number, s: number): void {
    this.soft(L_CORE, '#ffffff', x, y, 22 * s, 0.12, 0, 0, 0, 0, 0.9, 12 * s);
    this.ring('#e8e0cf', x, y, 10 * s, 0.5, 2.6 * s, false, 0.55);
    for (let i = 0; i < 7; i++) {
      const a = $rand() * 6.283;
      const sp = 16 + $rand() * 34;
      this.puff(i % 2 === 0 ? '#ded3bd' : '#a89b84', x, y, (6 + $rand() * 7) * s, 0.5 + $rand() * 0.45, Math.cos(a) * sp * s, Math.sin(a) * sp * s - 12 * s, -14, 1.9, 0.45, 16 * s);
    }
    for (let i = 0; i < 5; i++) {
      const a = $rand() * 6.283;
      const sp = 45 + $rand() * 70;
      this.arc('#fff6d8', x, y - 2, (1.4 + $rand() * 1.6) * s, 0.3 + $rand() * 0.2, a, sp, 180, 2.2, L_SPARK);
    }
    this.decal('#cfe8ff', x, y, 12 * s, 1.5, 'rune');
  }

  // ─── Draw internals ────────────────────────────────────────────

  private buildSprites(): void {
    this.sprites = bakeSpriteSet();
  }

  /** Counting sort of live particles into layer buckets — zero allocation. */
  private prepareBuckets(): void {
    const counts = this.layerCount;
    for (let l = 0; l < LAYER_COUNT; l++) counts[l] = 0;

    const pool = this.pool;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (p.active) counts[p.layer]++;
    }

    let acc = 0;
    for (let l = 0; l < LAYER_COUNT; l++) {
      this.layerHead[l] = acc;
      this.layerCursor[l] = acc;
      acc += counts[l];
    }

    const sorted = this.sortedIndex;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.active) continue;
      sorted[this.layerCursor[p.layer]++] = i;
    }
  }

  private drawBucket(ctx: CanvasRenderingContext2D, layer: number, sprites: SpriteSet): void {
    const end = this.layerHead[layer] + this.layerCount[layer];
    const sorted = this.sortedIndex;
    const pool = this.pool;
    for (let s = this.layerHead[layer]; s < end; s++) {
      const p = pool[sorted[s]];
      if (p.active) this.drawParticle(ctx, p, sprites);
    }
  }

  private drawParticle(ctx: CanvasRenderingContext2D, p: Particle, sprites: SpriteSet): void {
    const k = p.t / p.life;
    let a = p.alpha;
    if (p.fadeIn > 0 && k < p.fadeIn) a *= k / p.fadeIn;
    a *= k < 0.72 ? 1 : 1 - (k - 0.72) / 0.28;
    if (a <= 0.004) return;

    const alphaBase = ctx.globalAlpha;
    ctx.globalAlpha = alphaBase * (a > 1 ? 1 : a);

    switch (p.shape) {
      case 'soft': {
        const size = p.size + p.growth * k;
        if (size <= 0.15) break;
        ctx.drawImage(sprites.soft, p.x - size, p.y - size, size * 2, size * 2);
        break;
      }
      case 'smoke': {
        const size = p.size + p.growth * k;
        if (size <= 0.15) break;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.dx);
        const rx = size * 1.3;
        ctx.drawImage(sprites.smoke, -rx, -size, rx * 2, size * 2);
        ctx.restore();
        break;
      }
      case 'core': {
        const size = p.size * (1 + k * 0.4);
        ctx.drawImage(sprites.ember, p.x - size, p.y - size, size * 2, size * 2);
        break;
      }
      case 'streak': {
        const streak = sprites.streak;
        if (streak === null) {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        const len = p.size * p.stretch * 2.4;
        const wid = p.size * 1.9;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.ang);
        ctx.drawImage(streak, -len, -wid / 2, len * 2, wid);
        ctx.restore();
        break;
      }
      case 'shard': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.ang);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(p.size * 1.5, 0);
        ctx.lineTo(-p.size * 0.8, -p.size * 0.85);
        ctx.lineTo(-p.size * 0.35, 0);
        ctx.lineTo(-p.size * 0.8, p.size * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'spin': {
        const rx = p.size * (0.4 + 0.6 * Math.abs(Math.cos(p.ang)));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, p.size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p.color2;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx * 0.5, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'plus': {
        const size = p.size + p.growth * k;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.fillRect(-size, -size * 0.28, size * 2, size * 0.56);
        ctx.fillRect(-size * 0.28, -size, size * 0.56, size * 2);
        ctx.restore();
        break;
      }
      case 'orbit': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.ang);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? p.size : p.size * 0.42;
          const ang = (Math.PI * i) / 5 - Math.PI / 2;
          const px = Math.cos(ang) * r;
          const py = Math.sin(ang) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'ring': {
        const r = p.size * (0.18 + 0.82 * k);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(1, p.squash);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.ringWidth * (1 - k * 0.65);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'decal': {
        const size = p.size * (1 + k * 0.28);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(1, p.squash);
        ctx.drawImage(sprites.soft, -size, -size, size * 2, size * 2);
        ctx.restore();
        break;
      }
      case 'rune': {
        const r = p.size * (1 + k * 0.22);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(1, p.squash);
        ctx.rotate(p.ang);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i < p.runeArms; i++) {
          const ang = (Math.PI * 2 * i) / p.runeArms;
          ctx.moveTo(Math.cos(ang) * r * 0.42, Math.sin(ang) * r * 0.42);
          ctx.lineTo(Math.cos(ang) * r * 0.94, Math.sin(ang) * r * 0.94);
        }
        ctx.stroke();
        ctx.restore();
        break;
      }
      default:
        break;
    }

    ctx.globalAlpha = alphaBase;
  }

  private drawBolts(ctx: CanvasRenderingContext2D): void {
    if (this.boltCount === 0) return;
    const base = ctx.globalAlpha;
    for (let b = 0; b < this.bolts.length; b++) {
      const bolt = this.bolts[b];
      if (!bolt.active) continue;

      const k = bolt.t / bolt.life;
      const flicker = 1 - k * 0.55;
      const height = 186 * bolt.scale;
      const step = height / (BOLT_POINTS - 1);
      const amp = 15 * bolt.scale;
      const ph = bolt.t * 60;

      // Outer haze.
      ctx.globalAlpha = base * 0.35 * flicker;
      ctx.strokeStyle = bolt.color;
      ctx.lineWidth = 7 * bolt.scale;
      ctx.beginPath();
      for (let i = 0; i < BOLT_POINTS; i++) {
        const jx = bolt.jitter[i] * amp * (1 - i / (BOLT_POINTS - 1) * 0.25);
        const px = bolt.x + jx + Math.sin(ph + i * 1.7) * 2.5;
        const py = bolt.y + i * step;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Hot core.
      ctx.globalAlpha = base * 0.92 * flicker;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.9 * bolt.scale;
      ctx.beginPath();
      for (let i = 0; i < BOLT_POINTS; i++) {
        const jx = bolt.jitter[i] * amp * (1 - i / (BOLT_POINTS - 1) * 0.25);
        const px = bolt.x + jx + Math.sin(ph + i * 1.7) * 1.2;
        const py = bolt.y + i * step;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Forked twigs.
      ctx.globalAlpha = base * 0.5 * flicker;
      ctx.lineWidth = 1.2 * bolt.scale;
      for (let i = 2; i < BOLT_POINTS - 1; i += 3) {
        const jx = bolt.jitter[i] * amp;
        const px = bolt.x + jx;
        const py = bolt.y + i * step;
        const dir = bolt.jitter[i] < 0 ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + dir * 14 * bolt.scale, py + 20 * bolt.scale);
        ctx.lineTo(px + dir * 8 * bolt.scale, py + 34 * bolt.scale);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = base;
  }
}

/** Convenience singleton for gameplay code. */
export const vfx = new VfxSystem();

/** Seeded-ish jitter kept local so every recipe reads the same. */
function $rand(): number {
  return Math.random();
}

/** Small helper so a puff gets a per-particle rotation without a new field. */
function $seed(p: Particle): void {
  p.dx = $rand() * 6.283;
}
