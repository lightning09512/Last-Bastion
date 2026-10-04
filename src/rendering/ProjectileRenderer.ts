// ─── Projectile & Effect Renderer ───────────────────────────────
// Kingdom Rush style rendering for arrows, magic bolts, cannonballs,
// explosions, floating combat text, and particle effects.

import * as THREE from 'three';
import { ThreeRenderer } from './ThreeRenderer';
import { Vec2 } from '../data/types';

export interface ProjectileRenderData {
  x: number;
  y: number;
  damageType: 'physical' | 'magic';
  splashRadius: number;
  active: boolean;
  color: string;
  trail: Vec2[];
}

export interface FloatingTextRenderData {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  active: boolean;
  size: number;
}

export interface ParticleRenderData {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  active: boolean;
}

// ─── Projectile Rendering ────────────────────────────────────────

export function renderProjectile(
  renderer: ThreeRenderer,
  proj: ProjectileRenderData,
): void {
  if (!proj.active) return;

  // Calculate projectile angle from last trail points
  let angle = 0;
  if (proj.trail.length > 0) {
    const last = proj.trail[proj.trail.length - 1];
    angle = Math.atan2(proj.y - last.y, proj.x - last.x);
  }

  const isCannon = proj.splashRadius > 0;
  const isMagic = proj.damageType === 'magic';

  if (isCannon) {
    // ── Cannonball ──
    const size = 18;
    const texture = renderer.generateProceduralTexture(
      size, size,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const cx = w / 2;
        const cy = h / 2;

        // Shadow under ball
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(cx, cy + 2, 6, 0, Math.PI * 2);
        ctx.fill();

        // Heavy Iron Cannonball
        const grad = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, 6);
        grad.addColorStop(0, '#64748b');
        grad.addColorStop(0.5, '#334155');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();

        // Highlight glint
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(cx - 2, cy - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
      },
      'projectile_cannonball',
    );

    renderer.createSprite(
      texture,
      proj.x,
      proj.y,
      size,
      size,
      renderer.projectileLayer,
    );
  } else if (isMagic) {
    // ── Magic Bolt / Arcane Orb ──
    const size = 22;
    const texture = renderer.generateProceduralTexture(
      size, size,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const cx = w / 2;
        const cy = h / 2;

        // Outer glow
        const glowGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 9);
        glowGrad.addColorStop(0, 'rgba(168, 85, 247, 0.9)');
        glowGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.4)');
        glowGrad.addColorStop(1, 'rgba(124, 58, 237, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.fill();

        // Bright Arcane Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
      },
      'projectile_magic',
    );

    renderer.createSprite(
      texture,
      proj.x,
      proj.y,
      size,
      size,
      renderer.projectileLayer,
    );
  } else {
    // ── Arrow ──
    const size = 26;
    // Quantize angle to 16 directions for caching
    const angleIndex = Math.round((angle / (Math.PI * 2)) * 16) % 16;
    const cacheKey = `projectile_arrow_${angleIndex}`;

    const texture = renderer.generateProceduralTexture(
      size, size,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const cx = w / 2;
        const cy = h / 2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        // Wooden Shaft
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-9, 0);
        ctx.lineTo(8, 0);
        ctx.stroke();

        // Steel Arrowhead
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(8, -2.5);
        ctx.lineTo(12, 0);
        ctx.lineTo(8, 2.5);
        ctx.closePath();
        ctx.fill();

        // White/Gray Feather Fletching
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(-9, 0);
        ctx.lineTo(-6, -3);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-6, 3);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      },
      cacheKey,
    );

    renderer.createSprite(
      texture,
      proj.x,
      proj.y,
      size,
      size,
      renderer.projectileLayer,
    );
  }
}

// ─── Floating Text Rendering ─────────────────────────────────────

export function renderFloatingText(
  renderer: ThreeRenderer,
  item: FloatingTextRenderData,
): void {
  if (!item.active || item.life <= 0) return;

  const progress = item.life / item.maxLife; // 1 -> 0
  const alpha = Math.min(1, progress * 1.5);
  const yOffset = (1 - progress) * 26; // floats upward

  const texture = renderer.generateProceduralTexture(
    80, 28,
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2 + 4;

      ctx.font = 'bold 15px MedievalSharp, Cinzel, sans-serif';
      ctx.textAlign = 'center';

      // Thick dark outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(item.text, cx, cy);

      // Inner text color
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, cx, cy);
    },
    `ft_${item.text}_${item.color}`,
  );

  const sprite = renderer.createSprite(
    texture,
    item.x,
    item.y - yOffset,
    80,
    28,
    renderer.uiLayer,
  );
  
  if (sprite.material instanceof THREE.MeshBasicMaterial) {
    sprite.material.opacity = alpha;
  }
}

// ─── Particle Rendering ──────────────────────────────────────────

export function renderParticle(
  renderer: ThreeRenderer,
  p: ParticleRenderData,
): void {
  if (!p.active || p.life <= 0) return;

  const progress = p.life / p.maxLife; // 1 -> 0
  const size = Math.max(1, p.size * progress);

  renderer.createCircle(
    p.x,
    p.y,
    size,
    p.color,
    renderer.effectLayer,
    progress,
  );
}

// ─── Direct Canvas2D Rendering ───────────────────────────────────

export function drawProjectileDirect(
  ctx: CanvasRenderingContext2D,
  proj: ProjectileRenderData,
): void {
  if (!proj.active) return;

  // Trail
  if (proj.trail.length > 1) {
    ctx.save();
    ctx.strokeStyle = proj.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(proj.trail[0].x, proj.trail[0].y);
    for (let i = 1; i < proj.trail.length; i++) {
      ctx.lineTo(proj.trail[i].x, proj.trail[i].y);
    }
    ctx.lineTo(proj.x, proj.y);
    ctx.stroke();
    ctx.restore();
  }

  // Calculate projectile angle from last trail points
  let angle = 0;
  if (proj.trail.length > 0) {
    const last = proj.trail[proj.trail.length - 1];
    angle = Math.atan2(proj.y - last.y, proj.x - last.x);
  }

  const isCannon = proj.splashRadius > 0;
  const isMagic = proj.damageType === 'magic';

  ctx.save();
  ctx.translate(proj.x, proj.y);

  if (isCannon) {
    // Heavy Iron Cannonball
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(0, 2, 6, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 6);
    grad.addColorStop(0, '#64748b');
    grad.addColorStop(0.5, '#334155');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    // Glint
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(-2, -2, 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (isMagic) {
    // Arcane Orb
    const glowGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 9);
    glowGrad.addColorStop(0, 'rgba(168, 85, 247, 0.9)');
    glowGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.4)');
    glowGrad.addColorStop(1, 'rgba(124, 58, 237, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Arrow
    ctx.rotate(angle);

    // Shaft
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(8, 0);
    ctx.stroke();

    // Steel Arrowhead
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(8, -2.5);
    ctx.lineTo(12, 0);
    ctx.lineTo(8, 2.5);
    ctx.closePath();
    ctx.fill();

    // Fletching
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(-6, -3);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-6, 3);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}
