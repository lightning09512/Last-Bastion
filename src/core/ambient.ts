// ─── Ambient Atmosphere ──────────────────────────────────────────
// A6: a thin layer of drifting particles per level so no patch of ground
// ever looks dead — pollen over the valley, leaves in the forest, motes on
// the bridge, fireflies in the swamp, embers at the Warlord's Gate.
//
// Cheap by construction: every particle is one blit of a baked soft sprite,
// the pool is fixed, and nothing allocates per frame.

import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../data/types';
import { sprites } from '../rendering/SpriteBank';

export type AmbientKind = 'pollen' | 'leaf' | 'mote' | 'firefly' | 'ember';

interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  sway: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface AmbientProfile {
  kind: AmbientKind;
  colors: string[];
  count: number;
  speed: number;
  additive: boolean;
}

const PROFILES: Record<string, AmbientProfile> = {
  level_1: { kind: 'pollen', colors: ['#fff6c0', '#e8f5a0'], count: 46, speed: 12, additive: true },
  level_2: { kind: 'leaf', colors: ['#8fd45a', '#5fae3c', '#c8e07a'], count: 34, speed: 26, additive: false },
  level_3: { kind: 'mote', colors: ['#dfe9f2', '#c3d2e0'], count: 40, speed: 9, additive: false },
  level_4: { kind: 'firefly', colors: ['#b6ff5a', '#7ef07a'], count: 30, speed: 15, additive: true },
  level_5: { kind: 'ember', colors: ['#ffb15a', '#ff7a3c', '#ffe0a0'], count: 44, speed: 22, additive: true },
};

const DEFAULT_PROFILE = PROFILES.level_1;

export class AmbientSystem {
  private particles: AmbientParticle[] = [];
  private profile: AmbientProfile = DEFAULT_PROFILE;

  constructor(private capacity = 60) {}

  /** Choose the atmosphere for a level. */
  setTheme(levelId: string): void {
    this.profile = PROFILES[levelId] ?? DEFAULT_PROFILE;
    this.particles.length = 0;
    const count = Math.min(this.capacity, this.profile.count);
    for (let i = 0; i < count; i++) {
      this.particles.push(this.spawnParticle(Math.random()));
    }
  }

  clear(): void {
    this.particles.length = 0;
  }

  private spawnParticle(startProgress = 0): AmbientParticle {
    const p = this.profile;
    const maxLife = 6 + Math.random() * 8;
    return {
      x: Math.random() * DESIGN_WIDTH,
      y: p.kind === 'ember' ? DESIGN_HEIGHT + Math.random() * 60 : Math.random() * DESIGN_HEIGHT,
      vx: (Math.random() - 0.35) * p.speed,
      vy: p.kind === 'ember'
        ? -p.speed * (0.6 + Math.random() * 0.6)
        : (p.kind === 'leaf' ? p.speed * 0.35 : (Math.random() - 0.5) * p.speed * 0.4),
      size: p.kind === 'leaf' ? 5 + Math.random() * 4 : 2 + Math.random() * 3,
      phase: Math.random() * Math.PI * 2,
      sway: 6 + Math.random() * 14,
      alpha: 0.35 + Math.random() * 0.5,
      life: maxLife * startProgress,
      maxLife,
    };
  }

  update(dt: number): void {
    const p = this.profile;
    for (const particle of this.particles) {
      particle.life += dt;
      particle.phase += dt * (p.kind === 'firefly' ? 2.4 : 1.1);
      particle.x += (particle.vx + Math.sin(particle.phase) * particle.sway) * dt;
      particle.y += particle.vy * dt;

      // Wrap horizontally, respawn when the lifetime ends or it leaves the map.
      if (particle.x < -20) particle.x = DESIGN_WIDTH + 20;
      if (particle.x > DESIGN_WIDTH + 20) particle.x = -20;
      if (particle.y < -40 || particle.y > DESIGN_HEIGHT + 60 || particle.life >= particle.maxLife) {
        Object.assign(particle, this.spawnParticle(0));
      }
    }
  }

  /** Draw behind the world pass so units always read on top of the haze. */
  draw(ctx: CanvasRenderingContext2D): void {
    const p = this.profile;
    if (this.particles.length === 0) return;

    ctx.save();
    if (p.additive) ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      const color = p.colors[i % p.colors.length];
      const fade = Math.sin((particle.life / particle.maxLife) * Math.PI);
      const alpha = particle.alpha * Math.max(0, fade);
      if (alpha <= 0.01) continue;

      // Fireflies blink; the rest just fade in and out.
      const blink = p.kind === 'firefly'
        ? 0.45 + 0.55 * Math.max(0, Math.sin(particle.phase * 1.7))
        : 1;
      const size = particle.size * 3.2;

      const sprite = sprites.get(`ambient:${color}:${particle.size.toFixed(1)}`, size, size, (c, w) => {
        const grad = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        grad.addColorStop(0, color);
        grad.addColorStop(0.45, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = grad;
        c.beginPath();
        c.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2);
        c.fill();
      });

      ctx.globalAlpha = alpha * blink;
      sprites.blit(ctx, sprite, particle.x, particle.y, size, size);
    }

    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
