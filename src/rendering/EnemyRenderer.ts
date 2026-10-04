// ─── Enemy Renderer ──────────────────────────────────────────────
// Procedural Kingdom Rush-quality rendering for all enemies and units
// Replaces simple circles with rich medieval animated sprites

import * as THREE from 'three';
import { ThreeRenderer } from './ThreeRenderer';
import { ENEMIES } from '../data/enemies';

export interface EnemyRenderData {
  id: number;
  dataId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  armor: number;
  magicResist: number;
  flying: boolean;
  color: string;
  size: number;
  hitFlash: number;
  slowed: number;
  alive: boolean;
  facingLeft?: boolean;
}

export interface SoldierRenderData {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  type: 'militia' | 'footman' | 'knight' | 'reinforcement';
  hitFlash?: number;
  facingLeft?: boolean;
}

// ─── Procedural Sprite Generation & Rendering ───────────────────

export function renderEnemy(
  renderer: ThreeRenderer,
  enemy: EnemyRenderData,
  gameTime = 0,
): void {
  if (!enemy.alive) return;

  const enemyDef = ENEMIES[enemy.dataId];
  const baseSize = enemyDef ? enemyDef.size : enemy.size;
  const spriteW = Math.max(48, Math.round(baseSize * 3.6));
  const spriteH = Math.max(48, Math.round(baseSize * 3.6));
  
  // Animation frame calculation (4 frames of walk animation)
  const animSpeed = enemy.flying ? 8 : (enemy.speed * 0.12);
  const walkCycle = Math.floor((gameTime * animSpeed + enemy.id * 1.7) % 4);
  const isHit = enemy.hitFlash > 0.05;
  const facingLeft = enemy.facingLeft ?? false;

  // Cache key for procedural texture
  const cacheKey = `enemy_${enemy.dataId}_f${walkCycle}_${isHit ? 'hit' : 'norm'}_${facingLeft ? 'L' : 'R'}`;

  const texture = renderer.generateProceduralTexture(
    spriteW,
    spriteH,
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h * 0.65;

      ctx.save();
      // Directional flip
      if (facingLeft) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }

      // Ground shadow
      if (!enemy.flying) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        const shadowW = baseSize * 1.2;
        const shadowH = baseSize * 0.5;
        ctx.ellipse(cx, cy + baseSize * 0.5, shadowW, shadowH, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Flying shadow (smaller, offset downward)
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        const shadowW = baseSize * 1.1;
        const shadowH = baseSize * 0.45;
        const shadowBob = Math.sin(gameTime * 6) * 2;
        ctx.ellipse(cx, cy + 22 + shadowBob, shadowW, shadowH, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw character body
      switch (enemy.dataId) {
        case 'goblin':
          drawGoblin(ctx, cx, cy, walkCycle, isHit);
          break;
        case 'wolf':
          drawWolfRider(ctx, cx, cy, walkCycle, isHit);
          break;
        case 'orc_warrior':
          drawOrcWarrior(ctx, cx, cy, walkCycle, isHit);
          break;
        case 'dark_shaman':
          drawDarkShaman(ctx, cx, cy, walkCycle, gameTime, isHit);
          break;
        case 'bat':
          drawGiantBat(ctx, cx, cy, walkCycle, gameTime, isHit);
          break;
        case 'troll':
          drawTroll(ctx, cx, cy, walkCycle, isHit);
          break;
        case 'orc_warlord':
          drawOrcWarlord(ctx, cx, cy, walkCycle, gameTime, isHit);
          break;
        default:
          drawGenericEnemy(ctx, cx, cy, baseSize, enemy.color, walkCycle, isHit);
      }

      // Frost overlay if slowed
      if (enemy.slowed > 0) {
        drawFrostEffect(ctx, cx, cy, baseSize);
      }

      ctx.restore();
    },
    cacheKey,
  );

  // Flying enemies bob vertically
  const yOffset = enemy.flying ? Math.sin(gameTime * 7 + enemy.id) * 3 - 6 : 0;
  
  // Render main entity sprite
  renderer.createSprite(
    texture,
    enemy.x,
    enemy.y + yOffset,
    spriteW,
    spriteH,
    renderer.entityLayer,
  );

  // Render health bar if damaged or boss
  const isBoss = enemy.dataId === 'orc_warlord';
  if (enemy.hp < enemy.maxHp || isBoss) {
    renderHealthBar(renderer, enemy, baseSize, yOffset);
  }
}

// ─── Health Bar Rendering ────────────────────────────────────────

function renderHealthBar(
  renderer: ThreeRenderer,
  enemy: EnemyRenderData,
  baseSize: number,
  yOffset: number,
): void {
  const isBoss = enemy.dataId === 'orc_warlord';
  const barW = isBoss ? 64 : Math.max(28, baseSize * 2.6);
  const barH = isBoss ? 6 : 4;
  const barY = enemy.y - baseSize * 1.1 - 6 + yOffset;
  const hpRatio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));

  const hpTexture = renderer.generateProceduralTexture(
    barW + 8,
    barH + 8,
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const bx = 4;
      const by = 2;

      // Outer metallic shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx - 1, by, barW + 2, barH + 2);

      // Dark inner track
      ctx.fillStyle = '#221111';
      ctx.fillRect(bx, by, barW, barH);

      // Gradient HP fill
      const fillW = Math.max(0, Math.round(barW * hpRatio));
      if (fillW > 0) {
        let gradColor1: string;
        let gradColor2: string;

        if (hpRatio > 0.5) {
          gradColor1 = '#38b000';
          gradColor2 = '#70e000';
        } else if (hpRatio > 0.25) {
          gradColor1 = '#d97706';
          gradColor2 = '#fbbf24';
        } else {
          gradColor1 = '#b91c1c';
          gradColor2 = '#ef4444';
        }

        const grad = ctx.createLinearGradient(bx, by, bx, by + barH);
        grad.addColorStop(0, gradColor2);
        grad.addColorStop(1, gradColor1);
        ctx.fillStyle = grad;
        ctx.fillRect(bx, by, fillW, barH);

        // Highlight sheen
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(bx, by, fillW, 1);
      }

      // Metallic border
      ctx.strokeStyle = isBoss ? '#ffd700' : '#4a4440';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx - 0.5, by - 0.5, barW + 1, barH + 1);

      // Armor badge
      if (enemy.armor > 0.15) {
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(bx - 2, by + barH / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Magic resist spark
      if (enemy.magicResist > 0.15) {
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(bx + barW + 2, by + barH / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    `hp_${enemy.id}_${Math.round(hpRatio * 20)}_${enemy.armor > 0.15 ? 'arm' : ''}`,
  );

  renderer.createSprite(
    hpTexture,
    enemy.x,
    barY,
    barW + 8,
    barH + 8,
    renderer.uiLayer,
  );
}

// ─── Goblin ──────────────────────────────────────────────────────
// Small fast green rascal with jagged dagger and pointed ears

function drawGoblin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  frame: number,
  isHit: boolean,
): void {
  const bob = [0, -1, 0, 1][frame];
  const legOffset = [-2, 0, 2, 0][frame];

  const skin = isHit ? '#ffffff' : '#6da632';
  const skinDark = isHit ? '#ffffff' : '#4e7b22';
  const cloth = isHit ? '#ffffff' : '#5c4033';
  const daggerSteel = isHit ? '#ffffff' : '#d1d5db';

  // Feet/Legs
  ctx.fillStyle = skinDark;
  ctx.fillRect(cx - 5 + legOffset, cy + 5, 3, 5);
  ctx.fillRect(cx + 2 - legOffset, cy + 5, 3, 5);

  // Torso / Ragged tunic
  ctx.fillStyle = cloth;
  ctx.fillRect(cx - 5, cy - 2 + bob, 10, 8);
  ctx.fillStyle = '#3a2820';
  ctx.fillRect(cx - 5, cy + 3 + bob, 10, 2); // Belt

  // Head
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 6 + bob, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pointed Ears
  ctx.fillStyle = skinDark;
  ctx.beginPath();
  // Left ear
  ctx.moveTo(cx - 5, cy - 6 + bob);
  ctx.lineTo(cx - 10, cy - 9 + bob);
  ctx.lineTo(cx - 4, cy - 3 + bob);
  // Right ear
  ctx.moveTo(cx + 5, cy - 6 + bob);
  ctx.lineTo(cx + 10, cy - 9 + bob);
  ctx.lineTo(cx + 4, cy - 3 + bob);
  ctx.fill();

  // Eyes (Beady, glowing yellow-red)
  ctx.fillStyle = isHit ? '#ffffff' : '#ffea00';
  ctx.fillRect(cx - 3, cy - 7 + bob, 2, 2);
  ctx.fillRect(cx + 1, cy - 7 + bob, 2, 2);
  ctx.fillStyle = isHit ? '#ffffff' : '#b91c1c';
  ctx.fillRect(cx - 2, cy - 7 + bob, 1, 1);
  ctx.fillRect(cx + 2, cy - 7 + bob, 1, 1);

  // Toothy mouth / Underbite grin
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(cx - 2, cy - 3 + bob, 4, 1.5);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(cx - 1, cy - 3.5 + bob, 1, 1); // tiny fang

  // Arm & Dagger
  ctx.fillStyle = skin;
  ctx.fillRect(cx + 4, cy - 2 + bob, 4, 3);

  // Rusty jagged blade
  ctx.fillStyle = daggerSteel;
  ctx.beginPath();
  ctx.moveTo(cx + 7, cy - 2 + bob);
  ctx.lineTo(cx + 14, cy - 5 + bob);
  ctx.lineTo(cx + 8, cy + 1 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#92400e';
  ctx.fillRect(cx + 5, cy - 1 + bob, 3, 2); // Hilt
}

// ─── Wolf Rider ──────────────────────────────────────────────────
// Muscular gray dire wolf carrying a scimitar-wielding goblin

function drawWolfRider(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  frame: number,
  isHit: boolean,
): void {
  const gallop = [-1, 1, -1, 2][frame];
  const legSwing = [4, -3, -4, 3][frame];

  const wolfFur = isHit ? '#ffffff' : '#6b7280';
  const wolfDark = isHit ? '#ffffff' : '#4b5563';
  const wolfBelly = isHit ? '#ffffff' : '#9ca3af';
  const goblinSkin = isHit ? '#ffffff' : '#6da632';

  // Wolf Tail
  ctx.fillStyle = wolfDark;
  ctx.beginPath();
  ctx.ellipse(cx - 14, cy - 2 + gallop, 6, 2.5, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Wolf Back Legs
  ctx.fillStyle = wolfDark;
  ctx.fillRect(cx - 11 - legSwing, cy + 4, 3.5, 8);
  ctx.fillRect(cx - 7 + legSwing, cy + 4, 3.5, 8);

  // Wolf Body
  ctx.fillStyle = wolfFur;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 1 + gallop, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wolf Underbelly
  ctx.fillStyle = wolfBelly;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4 + gallop, 9, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wolf Front Legs
  ctx.fillStyle = wolfFur;
  ctx.fillRect(cx + 5 + legSwing, cy + 4, 3.5, 8);
  ctx.fillRect(cx + 9 - legSwing, cy + 4, 3.5, 8);

  // Wolf Head & Snout
  ctx.fillStyle = wolfFur;
  ctx.beginPath();
  ctx.ellipse(cx + 10, cy - 3 + gallop, 6, 5, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Snout
  ctx.fillStyle = wolfBelly;
  ctx.fillRect(cx + 13, cy - 3 + gallop, 5, 4);
  ctx.fillStyle = '#111827';
  ctx.fillRect(cx + 17, cy - 3 + gallop, 2, 2); // Black nose

  // Wolf Ears
  ctx.fillStyle = wolfDark;
  ctx.beginPath();
  ctx.moveTo(cx + 8, cy - 7 + gallop);
  ctx.lineTo(cx + 11, cy - 12 + gallop);
  ctx.lineTo(cx + 13, cy - 6 + gallop);
  ctx.fill();

  // Wolf Eye (Golden predatory)
  ctx.fillStyle = isHit ? '#ffffff' : '#f59e0b';
  ctx.fillRect(cx + 11, cy - 4 + gallop, 2, 2);

  // ── Goblin Rider on Top ──
  // Saddle
  ctx.fillStyle = '#451a03';
  ctx.fillRect(cx - 5, cy - 6 + gallop, 8, 3);

  // Goblin Body
  ctx.fillStyle = '#78350f';
  ctx.fillRect(cx - 3, cy - 11 + gallop, 6, 6);

  // Goblin Head
  ctx.fillStyle = goblinSkin;
  ctx.beginPath();
  ctx.arc(cx, cy - 13 + gallop, 4, 0, Math.PI * 2);
  ctx.fill();

  // Goblin Pointy Ear
  ctx.fillStyle = '#4e7b22';
  ctx.beginPath();
  ctx.moveTo(cx - 3, cy - 13 + gallop);
  ctx.lineTo(cx - 7, cy - 16 + gallop);
  ctx.lineTo(cx - 2, cy - 11 + gallop);
  ctx.fill();

  // Goblin Eye
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(cx + 1, cy - 14 + gallop, 1.5, 1.5);

  // Raised Scimitar
  ctx.strokeStyle = isHit ? '#ffffff' : '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx + 4, cy - 16 + gallop, 6, -Math.PI * 0.4, Math.PI * 0.1);
  ctx.stroke();
}

// ─── Orc Warrior ─────────────────────────────────────────────────
// Heavy brute with horned helm, spiked iron shield, and broad cleaver

function drawOrcWarrior(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  frame: number,
  isHit: boolean,
): void {
  const stomp = [0, -1, 0, 1][frame];
  const legOffset = [-2.5, 0, 2.5, 0][frame];

  const orcSkin = isHit ? '#ffffff' : '#4d7c0f';
  const orcDark = isHit ? '#ffffff' : '#365314';
  const iron = isHit ? '#ffffff' : '#475569';
  const steel = isHit ? '#ffffff' : '#94a3b8';
  const leather = isHit ? '#ffffff' : '#713f12';

  // Heavy Stomping Boots
  ctx.fillStyle = leather;
  ctx.fillRect(cx - 7 + legOffset, cy + 7, 5, 6);
  ctx.fillRect(cx + 2 - legOffset, cy + 7, 5, 6);

  // Muscular Legs
  ctx.fillStyle = orcDark;
  ctx.fillRect(cx - 6 + legOffset, cy + 4, 4, 4);
  ctx.fillRect(cx + 3 - legOffset, cy + 4, 4, 4);

  // Studded Belt / Chainmail kilt
  ctx.fillStyle = iron;
  ctx.fillRect(cx - 8, cy + 2 + stomp, 16, 4);
  ctx.fillStyle = '#ca8a04';
  ctx.fillRect(cx - 2, cy + 3 + stomp, 4, 2); // Brass buckle

  // Massive Torso / Leather chest harness
  ctx.fillStyle = orcSkin;
  ctx.fillRect(cx - 9, cy - 7 + stomp, 18, 10);
  ctx.fillStyle = leather;
  ctx.fillRect(cx - 8, cy - 6 + stomp, 3, 9); // Harness straps
  ctx.fillRect(cx + 5, cy - 6 + stomp, 3, 9);

  // Spiked Iron Pauldrons (Shoulders)
  ctx.fillStyle = iron;
  ctx.fillRect(cx - 12, cy - 9 + stomp, 5, 5);
  ctx.fillRect(cx + 7, cy - 9 + stomp, 5, 5);
  // Pauldron Spikes
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy - 9 + stomp);
  ctx.lineTo(cx - 10, cy - 13 + stomp);
  ctx.lineTo(cx - 8, cy - 9 + stomp);
  ctx.fill();

  // Head & Brow
  ctx.fillStyle = orcSkin;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 10 + stomp, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Horned Iron Helmet
  ctx.fillStyle = iron;
  ctx.fillRect(cx - 6, cy - 15 + stomp, 12, 5);
  ctx.fillStyle = steel;
  // Horns
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 14 + stomp);
  ctx.lineTo(cx - 10, cy - 18 + stomp);
  ctx.lineTo(cx - 3, cy - 12 + stomp);
  ctx.moveTo(cx + 5, cy - 14 + stomp);
  ctx.lineTo(cx + 10, cy - 18 + stomp);
  ctx.lineTo(cx + 3, cy - 12 + stomp);
  ctx.fill();

  // Eyes (Narrow, fierce red-orange)
  ctx.fillStyle = isHit ? '#ffffff' : '#dc2626';
  ctx.fillRect(cx - 4, cy - 11 + stomp, 2, 1.5);
  ctx.fillRect(cx + 2, cy - 11 + stomp, 2, 1.5);

  // Lower Tusks
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(cx - 3, cy - 8 + stomp, 1.5, 2.5);
  ctx.fillRect(cx + 1.5, cy - 8 + stomp, 1.5, 2.5);

  // ── Left Hand: Spiked Shield ──
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.arc(cx - 11, cy - 2 + stomp, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = iron;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Shield Iron Boss Spike
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.arc(cx - 11, cy - 2 + stomp, 3, 0, Math.PI * 2);
  ctx.fill();

  // ── Right Hand: Heavy Battle Cleaver ──
  ctx.fillStyle = iron;
  ctx.fillRect(cx + 9, cy - 3 + stomp, 2.5, 10); // Handle
  ctx.fillStyle = steel;
  // Cleaver blade
  ctx.beginPath();
  ctx.moveTo(cx + 10, cy - 3 + stomp);
  ctx.lineTo(cx + 16, cy - 9 + stomp);
  ctx.lineTo(cx + 16, cy - 1 + stomp);
  ctx.lineTo(cx + 10, cy + 2 + stomp);
  ctx.closePath();
  ctx.fill();
}

// ─── Dark Shaman ─────────────────────────────────────────────────
// Hooded occult sorcerer with skull staff and glowing cyan runes

function drawDarkShaman(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  frame: number,
  gameTime: number,
  isHit: boolean,
): void {
  // Levitating bob
  const floatBob = Math.sin(gameTime * 5) * 2;

  const robe = isHit ? '#ffffff' : '#3b0764';
  const robeDark = isHit ? '#ffffff' : '#1e1b4b';
  const gold = isHit ? '#ffffff' : '#fbbf24';
  const cyanAura = isHit ? '#ffffff' : '#06b6d4';

  // Occult ground ring
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 8, 12, 5, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Flowing Dark Robe
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 12 + floatBob);
  ctx.lineTo(cx + 8, cy + 7 + floatBob);
  ctx.lineTo(cx - 8, cy + 7 + floatBob);
  ctx.closePath();
  ctx.fill();

  // Robe folds & Gold trim
  ctx.fillStyle = robeDark;
  ctx.fillRect(cx - 2, cy - 4 + floatBob, 4, 11);
  ctx.fillStyle = gold;
  ctx.fillRect(cx - 7, cy + 6 + floatBob, 14, 1.5); // Bottom hem

  // Deep Cowl / Hood
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.arc(cx, cy - 11 + floatBob, 6, 0, Math.PI * 2);
  ctx.fill();

  // Shadowed Face under Cowl
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(cx, cy - 10 + floatBob, 4, 0, Math.PI * 2);
  ctx.fill();

  // Glowing Cyan Arcane Eyes
  ctx.fillStyle = cyanAura;
  ctx.fillRect(cx - 3, cy - 11 + floatBob, 2, 2);
  ctx.fillRect(cx + 1, cy - 11 + floatBob, 2, 2);

  // ── Shaman Skull Staff ──
  ctx.fillStyle = '#5c4033';
  ctx.fillRect(cx + 8, cy - 16 + floatBob, 2.5, 24); // Gnarled wood

  // Animal Skull on Staff Top
  ctx.fillStyle = isHit ? '#ffffff' : '#f8fafc';
  ctx.beginPath();
  ctx.arc(cx + 9, cy - 18 + floatBob, 4, 0, Math.PI * 2);
  ctx.fill();

  // Skull Eye Sockets (Glowing Cyan)
  ctx.fillStyle = cyanAura;
  ctx.fillRect(cx + 7.5, cy - 19 + floatBob, 1.5, 1.5);
  ctx.fillRect(cx + 10, cy - 19 + floatBob, 1.5, 1.5);

  // Skull Horns
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx + 7, cy - 20 + floatBob);
  ctx.lineTo(cx + 4, cy - 23 + floatBob);
  ctx.moveTo(cx + 11, cy - 20 + floatBob);
  ctx.lineTo(cx + 14, cy - 23 + floatBob);
  ctx.stroke();
}

// ─── Giant Bat ───────────────────────────────────────────────────
// Menacing flying beast with animated leathery wings and fangs

function drawGiantBat(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  frame: number,
  gameTime: number,
  isHit: boolean,
): void {
  // Wing flap sine cycle
  const flapAngle = Math.sin(gameTime * 14) * 0.45;

  const wingColor = isHit ? '#ffffff' : '#1e1b2e';
  const bodyColor = isHit ? '#ffffff' : '#312e45';
  const furColor = isHit ? '#ffffff' : '#47425e';
  const eyes = isHit ? '#ffffff' : '#ef4444';

  // Furry Bat Torso
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 5, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Furry chest patch
  ctx.fillStyle = furColor;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 1, 3.5, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bat Head & Pointy Ears
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(cx, cy - 7, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Large pointed ears
  ctx.fillStyle = '#635b7a';
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy - 8);
  ctx.lineTo(cx - 7, cy - 15);
  ctx.lineTo(cx - 2, cy - 10);
  ctx.moveTo(cx + 4, cy - 8);
  ctx.lineTo(cx + 7, cy - 15);
  ctx.lineTo(cx + 2, cy - 10);
  ctx.fill();

  // Glowing Red Eyes & Sharp Fangs
  ctx.fillStyle = eyes;
  ctx.fillRect(cx - 3, cy - 8, 1.5, 1.5);
  ctx.fillRect(cx + 1.5, cy - 8, 1.5, 1.5);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 2, cy - 5, 1, 1.5);
  ctx.fillRect(cx + 1, cy - 5, 1, 1.5);

  // ── Scalloped Leathery Wings ──
  // Left Wing
  ctx.save();
  ctx.translate(cx - 4, cy - 2);
  ctx.rotate(flapAngle);
  ctx.fillStyle = wingColor;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-18, -10);
  ctx.quadraticCurveTo(-14, 2, -10, 4);
  ctx.quadraticCurveTo(-6, 6, 0, 2);
  ctx.closePath();
  ctx.fill();
  // Wing finger bones
  ctx.strokeStyle = '#47425e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-18, -10);
  ctx.stroke();
  ctx.restore();

  // Right Wing
  ctx.save();
  ctx.translate(cx + 4, cy - 2);
  ctx.rotate(-flapAngle);
  ctx.fillStyle = wingColor;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(18, -10);
  ctx.quadraticCurveTo(14, 2, 10, 4);
  ctx.quadraticCurveTo(6, 6, 0, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#47425e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(18, -10);
  ctx.stroke();
  ctx.restore();
}

// ─── Troll ───────────────────────────────────────────────────────
// Colossal mossy brute with spiked tree-trunk club and tusked underbite

function drawTroll(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  frame: number,
  isHit: boolean,
): void {
  const sway = [0, -1, 0, 1][frame];
  const legOffset = [-3, 0, 3, 0][frame];

  const skin = isHit ? '#ffffff' : '#3f6212';
  const moss = isHit ? '#ffffff' : '#65a30d';
  const hide = isHit ? '#ffffff' : '#451a03';
  const wood = isHit ? '#ffffff' : '#573318';
  const iron = isHit ? '#ffffff' : '#64748b';

  // Tree-trunk Feet
  ctx.fillStyle = '#273b0e';
  ctx.fillRect(cx - 9 + legOffset, cy + 9, 6, 6);
  ctx.fillRect(cx + 3 - legOffset, cy + 9, 6, 6);

  // Bulky Legs
  ctx.fillStyle = skin;
  ctx.fillRect(cx - 8 + legOffset, cy + 5, 5, 5);
  ctx.fillRect(cx + 3 - legOffset, cy + 5, 5, 5);

  // Hide Loincloth
  ctx.fillStyle = hide;
  ctx.fillRect(cx - 10, cy + 3 + sway, 20, 5);

  // Massive Troll Belly & Torso
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 4 + sway, 12, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Moss & Lichen Patches on Back & Shoulders
  ctx.fillStyle = moss;
  ctx.beginPath();
  ctx.ellipse(cx - 5, cy - 10 + sway, 5, 3, -0.2, 0, Math.PI * 2);
  ctx.ellipse(cx + 4, cy - 11 + sway, 6, 3.5, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Heavy Brow & Jaw
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 13 + sway, 7, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Deep-set Eyes
  ctx.fillStyle = isHit ? '#ffffff' : '#facc15';
  ctx.fillRect(cx - 4, cy - 14 + sway, 2, 2);
  ctx.fillRect(cx + 2, cy - 14 + sway, 2, 2);

  // Large Protruding Tusks (Underbite)
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy - 9 + sway);
  ctx.lineTo(cx - 4, cy - 14 + sway);
  ctx.lineTo(cx - 2, cy - 10 + sway);
  ctx.moveTo(cx + 4, cy - 9 + sway);
  ctx.lineTo(cx + 4, cy - 14 + sway);
  ctx.lineTo(cx + 2, cy - 10 + sway);
  ctx.fill();

  // ── Heavy Spiked Log Club ──
  ctx.fillStyle = wood;
  ctx.fillRect(cx + 11, cy - 18 + sway, 5, 24);
  // Log rings & bark texture
  ctx.fillStyle = '#3f2512';
  ctx.fillRect(cx + 11, cy - 14 + sway, 5, 2);
  ctx.fillRect(cx + 11, cy - 6 + sway, 5, 2);

  // Iron Spikes through club
  ctx.fillStyle = iron;
  ctx.fillRect(cx + 9, cy - 16 + sway, 2, 2);
  ctx.fillRect(cx + 16, cy - 12 + sway, 2, 2);
  ctx.fillRect(cx + 9, cy - 8 + sway, 2, 2);
}

// ─── Orc Warlord (BOSS) ──────────────────────────────────────────
// Giant armored warlord with hellfire aura, horned war helm & executioner axe

function drawOrcWarlord(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  frame: number,
  gameTime: number,
  isHit: boolean,
): void {
  const stomp = [0, -1.5, 0, 1.5][frame];
  const legOffset = [-4, 0, 4, 0][frame];

  const plate = isHit ? '#ffffff' : '#18181b';
  const trim = isHit ? '#ffffff' : '#dc2626';
  const gold = isHit ? '#ffffff' : '#eab308';
  const skin = isHit ? '#ffffff' : '#3f6212';
  const steel = isHit ? '#ffffff' : '#cbd5e1';

  // Ground Hellfire Boss Aura
  const auraPulse = Math.sin(gameTime * 6) * 3;
  ctx.strokeStyle = 'rgba(220, 38, 38, 0.5)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 12, 18 + auraPulse, 7 + auraPulse * 0.4, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Heavy Spiked Sabatons (Boots)
  ctx.fillStyle = plate;
  ctx.fillRect(cx - 10 + legOffset, cy + 9, 7, 7);
  ctx.fillRect(cx + 3 - legOffset, cy + 9, 7, 7);
  ctx.fillStyle = trim;
  ctx.fillRect(cx - 10 + legOffset, cy + 14, 7, 2);
  ctx.fillRect(cx + 3 - legOffset, cy + 14, 7, 2);

  // Heavy Plate Greaves
  ctx.fillStyle = plate;
  ctx.fillRect(cx - 9 + legOffset, cy + 5, 5, 5);
  ctx.fillRect(cx + 4 - legOffset, cy + 5, 5, 5);

  // Tattered Blood-Red Cape (Behind body)
  ctx.fillStyle = '#991b1b';
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy - 14 + stomp);
  ctx.lineTo(cx - 16, cy + 10 + stomp);
  ctx.lineTo(cx + 16, cy + 10 + stomp);
  ctx.lineTo(cx + 14, cy - 14 + stomp);
  ctx.closePath();
  ctx.fill();

  // Spiked Belt & Skull Buckle
  ctx.fillStyle = plate;
  ctx.fillRect(cx - 12, cy + 2 + stomp, 24, 5);
  ctx.fillStyle = gold;
  ctx.fillRect(cx - 3, cy + 2 + stomp, 6, 4);

  // Massive Black Plate Cuirass (Chest)
  ctx.fillStyle = plate;
  ctx.fillRect(cx - 13, cy - 12 + stomp, 26, 15);
  ctx.fillStyle = trim;
  ctx.fillRect(cx - 11, cy - 10 + stomp, 3, 11);
  ctx.fillRect(cx + 8, cy - 10 + stomp, 3, 11);

  // Colossal Spiked Shoulder Pauldrons
  ctx.fillStyle = plate;
  ctx.fillRect(cx - 18, cy - 16 + stomp, 8, 8);
  ctx.fillRect(cx + 10, cy - 16 + stomp, 8, 8);
  ctx.fillStyle = gold;
  ctx.strokeRect(cx - 18, cy - 16 + stomp, 8, 8);
  ctx.strokeRect(cx + 10, cy - 16 + stomp, 8, 8);

  // Triple Spikes on each Pauldron
  ctx.fillStyle = steel;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(cx - 17 + i * 2.5, cy - 20 + stomp, 2, 4);
    ctx.fillRect(cx + 11 + i * 2.5, cy - 20 + stomp, 2, 4);
  }

  // Brutal Skull War Helm
  ctx.fillStyle = plate;
  ctx.fillRect(cx - 8, cy - 22 + stomp, 16, 9);
  ctx.fillStyle = trim;
  ctx.fillRect(cx - 8, cy - 22 + stomp, 16, 2);

  // Giant Curved Horns
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  // Left horn
  ctx.moveTo(cx - 7, cy - 20 + stomp);
  ctx.quadraticCurveTo(cx - 16, cy - 24 + stomp, cx - 18, cy - 30 + stomp);
  ctx.lineTo(cx - 5, cy - 18 + stomp);
  // Right horn
  ctx.moveTo(cx + 7, cy - 20 + stomp);
  ctx.quadraticCurveTo(cx + 16, cy - 24 + stomp, cx + 18, cy - 30 + stomp);
  ctx.lineTo(cx + 5, cy - 18 + stomp);
  ctx.fill();

  // Burning Demonic Red Eyes
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(cx - 5, cy - 17 + stomp, 3, 2);
  ctx.fillRect(cx + 2, cy - 17 + stomp, 3, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 4, cy - 17 + stomp, 1, 1);
  ctx.fillRect(cx + 3, cy - 17 + stomp, 1, 1);

  // ── Enormous Double-Headed Executioner's Axe ──
  ctx.fillStyle = '#451a03';
  ctx.fillRect(cx + 15, cy - 26 + stomp, 3.5, 36); // Haft
  ctx.fillStyle = steel;
  // Left Blade
  ctx.beginPath();
  ctx.moveTo(cx + 16, cy - 24 + stomp);
  ctx.lineTo(cx + 8, cy - 28 + stomp);
  ctx.lineTo(cx + 8, cy - 14 + stomp);
  ctx.lineTo(cx + 16, cy - 18 + stomp);
  ctx.closePath();
  ctx.fill();
  // Right Blade
  ctx.beginPath();
  ctx.moveTo(cx + 17, cy - 24 + stomp);
  ctx.lineTo(cx + 26, cy - 28 + stomp);
  ctx.lineTo(cx + 26, cy - 14 + stomp);
  ctx.lineTo(cx + 17, cy - 18 + stomp);
  ctx.closePath();
  ctx.fill();
  // Glowing Blood Runes on Blades
  ctx.fillStyle = trim;
  ctx.fillRect(cx + 10, cy - 22 + stomp, 3, 2);
  ctx.fillRect(cx + 21, cy - 22 + stomp, 3, 2);
}

// ─── Generic Fallback Enemy ──────────────────────────────────────

function drawGenericEnemy(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
  frame: number,
  isHit: boolean,
): void {
  const bob = [0, -1, 0, 1][frame];
  ctx.fillStyle = isHit ? '#ffffff' : color;
  ctx.beginPath();
  ctx.arc(cx, cy + bob, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Simple eyes
  ctx.fillStyle = isHit ? '#ffffff' : '#fbbf24';
  ctx.fillRect(cx - 3, cy - 2 + bob, 2, 2);
  ctx.fillRect(cx + 1, cy - 2 + bob, 2, 2);
}

// ─── Status Overlays ─────────────────────────────────────────────

function drawFrostEffect(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
): void {
  // Translucent ice crystals around base and body
  ctx.fillStyle = 'rgba(147, 197, 253, 0.6)';
  ctx.beginPath();
  // Crystal 1
  ctx.moveTo(cx - size * 0.8, cy + size * 0.4);
  ctx.lineTo(cx - size * 1.1, cy);
  ctx.lineTo(cx - size * 0.5, cy + size * 0.2);
  // Crystal 2
  ctx.moveTo(cx + size * 0.8, cy + size * 0.4);
  ctx.lineTo(cx + size * 1.1, cy);
  ctx.lineTo(cx + size * 0.5, cy + size * 0.2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ─── Direct Canvas2D Rendering ───────────────────────────────────

export function drawEnemyDirect(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyRenderData,
  gameTime = 0,
): void {
  if (!enemy.alive) return;

  const enemyDef = ENEMIES[enemy.dataId];
  const baseSize = enemyDef ? enemyDef.size : enemy.size;

  const animSpeed = enemy.flying ? 8 : (enemy.speed * 0.12);
  const walkCycle = Math.floor((gameTime * animSpeed + enemy.id * 1.7) % 4);
  const isHit = enemy.hitFlash > 0.05;
  const facingLeft = enemy.facingLeft ?? false;

  const cx = enemy.x;
  const yOffset = enemy.flying ? Math.sin(gameTime * 7 + enemy.id) * 3 - 6 : 0;
  const cy = enemy.y + yOffset;

  ctx.save();

  // Ground shadow
  if (!enemy.flying) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + baseSize * 0.5, baseSize * 1.2, baseSize * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    const shadowBob = Math.sin(gameTime * 6) * 2;
    ctx.ellipse(cx, cy + 22 + shadowBob, baseSize * 1.1, baseSize * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Directional flip
  if (facingLeft) {
    ctx.translate(cx, cy);
    ctx.scale(-1, 1);
    ctx.translate(-cx, -cy);
  }

  // Draw character body
  switch (enemy.dataId) {
    case 'goblin':
      drawGoblin(ctx, cx, cy, walkCycle, isHit);
      break;
    case 'wolf':
      drawWolfRider(ctx, cx, cy, walkCycle, isHit);
      break;
    case 'orc_warrior':
      drawOrcWarrior(ctx, cx, cy, walkCycle, isHit);
      break;
    case 'dark_shaman':
      drawDarkShaman(ctx, cx, cy, walkCycle, gameTime, isHit);
      break;
    case 'bat':
      drawGiantBat(ctx, cx, cy, walkCycle, gameTime, isHit);
      break;
    case 'troll':
      drawTroll(ctx, cx, cy, walkCycle, isHit);
      break;
    case 'orc_warlord':
      drawOrcWarlord(ctx, cx, cy, walkCycle, gameTime, isHit);
      break;
    default:
      drawGenericEnemy(ctx, cx, cy, baseSize, enemy.color, walkCycle, isHit);
  }

  // Frost overlay if slowed
  if (enemy.slowed > 0) {
    drawFrostEffect(ctx, cx, cy, baseSize);
  }

  ctx.restore();

  // Health bar
  const isBoss = enemy.dataId === 'orc_warlord';
  if (enemy.hp < enemy.maxHp || isBoss) {
    drawHealthBarDirect(ctx, enemy, baseSize, yOffset);
  }
}

export function drawHealthBarDirect(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyRenderData,
  baseSize: number,
  yOffset: number,
): void {
  const isBoss = enemy.dataId === 'orc_warlord';
  const barW = isBoss ? 64 : Math.max(26, baseSize * 2.5);
  const barH = isBoss ? 6 : 4;
  const bx = enemy.x - barW / 2;
  const by = enemy.y - baseSize * 1.1 - 7 + yOffset;
  const hpRatio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));

  // Outer shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(bx - 1, by, barW + 2, barH + 2);

  // Dark inner track
  ctx.fillStyle = '#221111';
  ctx.fillRect(bx, by, barW, barH);

  // Gradient HP fill
  const fillW = Math.max(0, Math.round(barW * hpRatio));
  if (fillW > 0) {
    let gradColor1: string;
    let gradColor2: string;

    if (hpRatio > 0.5) {
      gradColor1 = '#38b000';
      gradColor2 = '#70e000';
    } else if (hpRatio > 0.25) {
      gradColor1 = '#d97706';
      gradColor2 = '#fbbf24';
    } else {
      gradColor1 = '#b91c1c';
      gradColor2 = '#ef4444';
    }

    const grad = ctx.createLinearGradient(bx, by, bx, by + barH);
    grad.addColorStop(0, gradColor2);
    grad.addColorStop(1, gradColor1);
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, fillW, barH);

    // Sheen
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(bx, by, fillW, 1);
  }

  // Metallic border
  ctx.strokeStyle = isBoss ? '#ffd700' : '#4a4440';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx - 0.5, by - 0.5, barW + 1, barH + 1);

  // Armor badge
  if (enemy.armor > 0.15) {
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(bx - 3, by + barH / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Magic resist spark
  if (enemy.magicResist > 0.15) {
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.arc(bx + barW + 3, by + barH / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Soldier Direct Rendering ────────────────────────────────────

export function drawSoldierDirect(
  ctx: CanvasRenderingContext2D,
  soldier: SoldierRenderData,
  gameTime = 0,
): void {
  const cx = soldier.x;
  const cy = soldier.y;
  const facingLeft = soldier.facingLeft ?? false;
  const isHit = (soldier.hitFlash ?? 0) > 0.05;
  const frame = Math.floor((gameTime * 7 + soldier.id * 2) % 4);
  const bob = [0, -1, 0, 1][frame];

  ctx.save();

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (facingLeft) {
    ctx.translate(cx, cy);
    ctx.scale(-1, 1);
    ctx.translate(-cx, -cy);
  }

  if (soldier.type === 'knight') {
    // Holy Knight
    const plate = isHit ? '#ffffff' : '#cbd5e1';
    const gold = isHit ? '#ffffff' : '#ffd700';
    const cape = isHit ? '#ffffff' : '#1e3a8a';

    // Cape
    ctx.fillStyle = cape;
    ctx.fillRect(cx - 7, cy - 8 + bob, 4, 12);

    // Legs
    ctx.fillStyle = '#64748b';
    ctx.fillRect(cx - 4, cy + 4, 3, 5);
    ctx.fillRect(cx + 1, cy + 4, 3, 5);

    // Plate Cuirass
    ctx.fillStyle = plate;
    ctx.fillRect(cx - 5, cy - 6 + bob, 10, 10);
    ctx.fillStyle = gold;
    ctx.fillRect(cx - 1, cy - 5 + bob, 2, 8); // Golden cross on chest

    // Great Helm & Red Plume
    ctx.fillStyle = plate;
    ctx.fillRect(cx - 4, cy - 13 + bob, 8, 7);
    ctx.fillStyle = '#ef4444'; // Red plume feather
    ctx.fillRect(cx - 2, cy - 17 + bob, 4, 4);

    // Slit visor
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 3, cy - 10 + bob, 6, 1.5);

    // Heater Shield (Left)
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 6 + bob);
    ctx.lineTo(cx - 3, cy - 6 + bob);
    ctx.lineTo(cx - 3, cy + 2 + bob);
    ctx.lineTo(cx - 5.5, cy + 6 + bob);
    ctx.lineTo(cx - 8, cy + 2 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = gold;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Gleaming Broadsword (Right)
    ctx.strokeStyle = isHit ? '#ffffff' : '#f8fafc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy + 2 + bob);
    ctx.lineTo(cx + 9, cy - 10 + bob);
    ctx.stroke();
  } else if (soldier.type === 'reinforcement') {
    // Peasant Volunteer / Militia
    const cloth = isHit ? '#ffffff' : '#78350f';
    const skin = isHit ? '#ffffff' : '#fed7aa';

    // Legs
    ctx.fillStyle = '#451a03';
    ctx.fillRect(cx - 4, cy + 4, 3, 4);
    ctx.fillRect(cx + 1, cy + 4, 3, 4);

    // Torso / Leather vest
    ctx.fillStyle = cloth;
    ctx.fillRect(cx - 4, cy - 5 + bob, 8, 9);

    // Head & Straw/Leather Cap
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(cx, cy - 8 + bob, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a16207';
    ctx.fillRect(cx - 4, cy - 12 + bob, 8, 3);

    // Small Buckler (Left)
    ctx.fillStyle = '#713f12';
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 1 + bob, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Spear / Pitchfork (Right)
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy + 4 + bob);
    ctx.lineTo(cx + 7, cy - 12 + bob);
    ctx.stroke();
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(cx + 7, cy - 12 + bob);
    ctx.lineTo(cx + 6, cy - 15 + bob);
    ctx.lineTo(cx + 8, cy - 15 + bob);
    ctx.closePath();
    ctx.fill();
  } else {
    // Footman (Standard Barracks Soldier)
    const armor = isHit ? '#ffffff' : '#94a3b8';
    const tabard = isHit ? '#ffffff' : '#2563eb';
    const skin = isHit ? '#ffffff' : '#fed7aa';

    // Boots
    ctx.fillStyle = '#475569';
    ctx.fillRect(cx - 4, cy + 4, 3, 4);
    ctx.fillRect(cx + 1, cy + 4, 3, 4);

    // Royal Blue Tabard
    ctx.fillStyle = tabard;
    ctx.fillRect(cx - 4, cy - 5 + bob, 8, 9);
    ctx.fillStyle = '#ffffff'; // White stripe
    ctx.fillRect(cx - 1, cy - 5 + bob, 2, 9);

    // Kettle Hat (Iron helmet)
    ctx.fillStyle = armor;
    ctx.beginPath();
    ctx.arc(cx, cy - 9 + bob, 4, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - 6, cy - 9 + bob, 12, 1.5); // Brim

    // Face
    ctx.fillStyle = skin;
    ctx.fillRect(cx - 3, cy - 8 + bob, 6, 3);

    // Shield (Left)
    ctx.fillStyle = tabard;
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 1 + bob, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = armor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Short sword (Right)
    ctx.strokeStyle = armor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + 4, cy + 1 + bob);
    ctx.lineTo(cx + 8, cy - 7 + bob);
    ctx.stroke();
  }

  ctx.restore();

  // HP Bar if damaged
  if (soldier.hp < soldier.maxHp) {
    const barW = 16;
    const barH = 3;
    const bx = cx - barW / 2;
    const by = cy - 16;
    const ratio = Math.max(0, Math.min(1, soldier.hp / soldier.maxHp));

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = ratio > 0.4 ? '#22c55e' : '#ef4444';
    ctx.fillRect(bx, by, barW * ratio, barH);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx, by, barW, barH);
  }
}
