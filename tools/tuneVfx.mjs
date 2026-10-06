// One-shot tuning script (temporary): replaces the recipe block in VFX.ts.
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/rendering/VFX.ts';
const START = '  // ─── Recipes ───────────────────────────────────────────────────';
const END = '  // ─── Draw internals ────────────────────────────────────────────';

const src = readFileSync(FILE, 'utf8');
const a = src.indexOf(START);
const b = src.indexOf(END);
if (a < 0 || b < 0 || b <= a) throw new Error('markers not found');

const block = `  // ─── Recipes ───────────────────────────────────────────────────
  // Layer order per kind is always: decal → smoke/dust → glow → sparks,
  // which is exactly the pass order used by draw(). Sizes are authored for
  // scale 1 to read at 1280×720 from a couch, then multiplied by opts.scale.

  private recipeExplosion(x: number, y: number, s: number, count: number): void {
    const n = count > 0 ? count : 10;

    // 1–2 frame white flash.
    this.soft(L_CORE, '#ffffff', x, y, 52 * s, 0.1, 0, 0, 0, 0, 1, 26 * s);
    // Shockwave ring + hot inner ring.
    this.ring('#ffd9a0', x, y, 17 * s, 0.42, 7 * s, true, 0.75);
    this.ring('#fff1d0', x, y, 9 * s, 0.3, 6 * s, true, 0.75);

    // Fireball lobes: big, saturated, expanding.
    for (let i = 0; i < n; i++) {
      const a = $rand() * 6.283;
      const sp = 26 + $rand() * 58;
      this.soft(L_GLOW, i % 3 === 0 ? '#ff7a20' : '#ffa63c', x, y - 1, 20 * s, 0.32 + $rand() * 0.26, Math.cos(a) * sp * s, Math.sin(a) * sp * s - 26 * s, -40, 2.4, 0.95, 22 * s);
    }
    for (let i = 0; i < 6; i++) {
      const a = $rand() * 6.283;
      const sp = 14 + $rand() * 32;
      this.soft(L_GLOW, '#ffe9a8', x, y, 12 * s, 0.26, Math.cos(a) * sp * s, Math.sin(a) * sp * s - 18 * s, -24, 2.6, 0.95, 11 * s);
    }

    // Smoke column.
    const puffs = 7 + Math.floor(n * 0.7);
    for (let i = 0; i < puffs; i++) {
      const a = $rand() * 6.283;
      const sp = 14 + $rand() * 44;
      this.puff(
        $rand() < 0.45 ? '#b8b3aa' : '#67635d',
        x + ($rand() - 0.5) * 14 * s, y - 2 + ($rand() - 0.5) * 10 * s,
        (12 + $rand() * 10) * s, 0.8 + $rand() * 0.9,
        Math.cos(a) * sp * s, Math.sin(a) * sp * s - 34 * s,
        -16, 1.7, 0.6 + $rand() * 0.3, 26 * s,
      );
    }

    // Debris on ballistic arcs.
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * (0.15 + $rand() * 0.7);
      const sp = 70 + $rand() * 120;
      this.shard($rand() < 0.5 ? '#544a40' : '#2a1f38', x, y, (2.6 + $rand() * 3) * s, 0.9 + $rand() * 0.6, Math.cos(a) * sp * s, Math.sin(a) * sp * s, 340, 0.35);
    }

    this.decal('#231a14', x, y, 20 * s, 3.4, 'decal');
  }

  private recipeFrostBurst(x: number, y: number, s: number, count: number): void {
    const n = count > 0 ? count : 8;
    this.soft(L_CORE, '#ffffff', x, y, 38 * s, 0.12, 0, 0, 0, 0, 1, 18 * s);
    this.ring('#bfe9ff', x, y, 16 * s, 0.45, 6 * s, true, 0.82);
    this.ring('#e6f7ff', x, y, 26 * s, 0.5, 2.4 * s, true, 0.85);

    for (let i = 0; i < n; i++) {
      const a = $rand() * 6.283;
      const sp = 95 + $rand() * 115;
      this.shard('#cdefff', x, y, (2 + $rand() * 2.4) * s, 0.5 + $rand() * 0.35, Math.cos(a) * sp * s, Math.sin(a) * sp * s, 200, 0.2);
    }
    for (let i = 0; i < 8; i++) {
      const a = $rand() * 6.283;
      const sp = 20 + $rand() * 44;
      this.soft(L_GLOW, '#9fd8ff', x, y, (9 + $rand() * 9) * s, 0.45 + $rand() * 0.4, Math.cos(a) * sp * s, Math.sin(a) * sp * s - 10, -12, 2.1, 0.85, 14 * s);
    }
    for (let i = 0; i < 6; i++) {
      const a = $rand() * 6.283;
      const sp = 50 + $rand() * 70;
      this.spark('#ffffff', x, y, (1.6 + $rand() * 1.4) * s, 0.32, Math.cos(a) * sp, Math.sin(a) * sp, 60, 2.6);
    }
    this.decal('#dff2ff', x, y, 17 * s, 2.2, 'decal');
  }

  private recipeFireLick(x: number, y: number, s: number, count: number): void {
    const n = count > 0 ? count : 6;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.25 + $rand() * 0.5);
      const sp = 30 + $rand() * 60;
      this.soft(L_GLOW, $rand() < 0.4 ? '#ffe08a' : '#ff7a24', x, y, (10 + $rand() * 9) * s, 0.3 + $rand() * 0.24, Math.cos(a) * sp, Math.sin(a) * sp - 14, -70, 2.2, 0.95, 11 * s);
    }
    this.ember(x, y, 5 * s, 0.45, ($rand() - 0.5) * 34, -34 - $rand() * 34, -44, 1.5);
    this.ember(x, y, 3.8 * s, 0.36, ($rand() - 0.5) * 46, -24 - $rand() * 44, -32, 1.2);
    this.decal('#2a1c12', x + ($rand() - 0.5) * 8, y + 2, 9 * s, 1.6, 'decal');
  }

  private recipeLightning(x: number, y: number, s: number, color?: string): void {
    this.bolt(x, y - 200 * s, s, color ?? '#cfe4ff');
    this.soft(L_CORE, '#ffffff', x, y, 48 * s, 0.11, 0, 0, 0, 0, 1, 20 * s);
    this.ring(color ?? '#a8d8ff', x, y, 15 * s, 0.38, 5.5 * s, true, 0.6);
    for (let i = 0; i < 10; i++) {
      const a = $rand() * 6.283;
      const sp = 80 + $rand() * 150;
      this.spark(color ?? '#dff0ff', x, y - 1, (1.8 + $rand() * 1.6) * s, 0.24 + $rand() * 0.16, Math.cos(a) * sp, Math.sin(a) * sp - 24, 120, 2.2);
    }
    for (let i = 0; i < 4; i++) {
      const a = $rand() * 6.283;
      this.puff('#b9c6d6', x, y - 2, (10 + $rand() * 7) * s, 0.7, Math.cos(a) * 26, Math.sin(a) * 22 - 14, -10, 1.6, 0.42, 18 * s);
    }
    this.decal('#241d18', x, y, 14 * s, 2.8, 'decal');
  }

  private recipeHolySmite(x: number, y: number, s: number): void {
    this.soft(L_CORE, '#fffbe8', x, y, 54 * s, 0.18, 0, 0, 0, 0, 1, 26 * s);
    this.ring('#ffe89a', x, y, 16 * s, 0.5, 8 * s, true, 0.85);
    this.ring('#fff3c4', x, y, 27 * s, 0.55, 3 * s, true, 0.9);
    // Golden pillar of light.
    this.fire('soft', L_GLOW, '#ffe6a0', x, y - 40 * s, 40 * s, 0.4, 0, -80, 0, 0, 0.7);
    for (let i = 0; i < 11; i++) {
      const a = $rand() * 6.283;
      this.arc('#fff0b8', x, y - 4, (3 + $rand() * 3) * s, 0.4 + $rand() * 0.28, a, 120 + $rand() * 100, -130, 2.4, L_GLOW);
    }
    this.decal('#ffe9a8', x, y, 21 * s, 2.6, 'rune');
  }

  private recipePoisonCloud(x: number, y: number, s: number, count: number): void {
    const n = count > 0 ? count : 10;
    for (let i = 0; i < n; i++) {
      const a = $rand() * 6.283;
      const sp = 10 + $rand() * 28;
      this.puff($rand() < 0.5 ? '#8ccc46' : '#5f8f2a', x, y - 3, (11 + $rand() * 11) * s, 1 + $rand() * 1, Math.cos(a) * sp * s, Math.sin(a) * sp * s - 18 * s, -18, 1.5, 0.6, 22 * s);
    }
    for (let i = 0; i < 6; i++) {
      const a = $rand() * 6.283;
      this.soft(L_GLOW, '#b6e35c', x, y, (6 + $rand() * 6) * s, 0.45 + $rand() * 0.3, Math.cos(a) * 24, Math.sin(a) * 24 - 12, -16, 1.9, 0.7, 12 * s);
    }
    this.decal('#3d5220', x, y, 18 * s, 3.6, 'decal');
  }

  private recipeDust(x: number, y: number, s: number, count: number): void {
    const n = count > 0 ? count : 6;
    this.ring('#ded3bd', x, y, 11 * s, 0.45, 3 * s, false, 0.5);
    for (let i = 0; i < n; i++) {
      const a = $rand() * 6.283;
      const sp = 26 + $rand() * 50;
      this.puff($rand() < 0.5 ? '#ded3bd' : '#b9ab92', x, y, (9 + $rand() * 8) * s, 0.45 + $rand() * 0.4, Math.cos(a) * sp, Math.sin(a) * sp * 0.5, -14, 2.2, 0.6, 18 * s);
    }
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI * (0.2 + $rand() * 0.6);
      const sp = 45 + $rand() * 65;
      this.shard('#8a7f6a', x, y, (2 + $rand() * 1.8) * s, 0.5, Math.cos(a) * sp, Math.sin(a) * sp, 240, 0.3);
    }
  }

  private recipeDebris(x: number, y: number, s: number, count: number): void {
    const n = count > 0 ? count : 8;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.1 + $rand() * 0.8);
      const sp = 80 + $rand() * 130;
      this.shard($rand() < 0.4 ? '#8a7e6c' : '#4a4136', x, y, (3 + $rand() * 3.4) * s, 1 + $rand() * 0.6, Math.cos(a) * sp * s, Math.sin(a) * sp * s, 380, 0.42);
    }
    this.soft(L_DUST, '#cbbc9e', x, y, 16 * s, 0.34, 0, -16, -10, 1.8, 0.55, 16 * s);
    for (let i = 0; i < 5; i++) {
      const a = $rand() * 6.283;
      this.puff('#a89b84', x, y, (7 + $rand() * 7) * s, 0.5, Math.cos(a) * 22, Math.sin(a) * 14 - 12, -12, 2, 0.5, 14 * s);
    }
    this.decal('#1e1712', x, y, 13 * s, 3.2, 'decal');
  }

  private recipeShockwave(x: number, y: number, s: number, color?: string): void {
    const tone = color ?? '#ffffff';
    this.ring(tone, x, y, 19 * s, 0.45, 6 * s, true, 0.72);
    this.ring(tone, x, y, 11 * s, 0.55, 2.8 * s, true, 0.6);
    for (let i = 0; i < 7; i++) {
      const a = $rand() * 6.283;
      const sp = 70 + $rand() * 80;
      this.spark(tone, x, y, (1.6 + $rand() * 1.2) * s, 0.28, Math.cos(a) * sp, Math.sin(a) * sp * 0.6, 90, 2.4);
    }
  }

  private recipeSmokePuff(x: number, y: number, s: number, color?: string): void {
    const tone = color ?? '#9b9791';
    for (let i = 0; i < 6; i++) {
      const a = $rand() * 6.283;
      const sp = 12 + $rand() * 28;
      this.puff(tone, x, y, (10 + $rand() * 9) * s, 0.7 + $rand() * 0.7, Math.cos(a) * sp * s, Math.sin(a) * sp * s - 16 * s, -12, 1.7, 0.6, 20 * s);
    }
    this.soft(L_GLOW, '#e8e4dc', x, y - 2, 11 * s, 0.24, 0, -26, 0, 2, 0.55, 8 * s);
  }

  private recipeCoinPop(x: number, y: number, s: number): void {
    this.soft(L_CORE, '#fff6c8', x, y, 30 * s, 0.18, 0, 0, 0, 0, 1, 12 * s);
    this.ring('#ffd75e', x, y, 12 * s, 0.38, 3.6 * s, true, 0.9);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * (0.25 + $rand() * 0.5);
      const sp = 60 + $rand() * 85;
      const c = this.fire('spin', L_OVER, '#ffd75e', x, y, 5 + $rand() * 2.4, 0.8 + $rand() * 0.4, Math.cos(a) * sp, Math.sin(a) * sp, 420, 0.1, 1);
      c.spin = 8 + $rand() * 8;
      c.ang = $rand() * 6.283;
      c.color2 = '#fff8d8';
    }
    for (let i = 0; i < 8; i++) {
      const a = $rand() * 6.283;
      const sp = 50 + $rand() * 70;
      this.spark(i % 2 === 0 ? '#fff3bc' : '#ffffff', x, y, (1.6 + $rand() * 1.4) * s, 0.34, Math.cos(a) * sp, Math.sin(a) * sp - 20, 40, 2.6);
    }
    this.plusGlyph(x + 8 * s, y - 20 * s, s);
  }

  private plusGlyph(x: number, y: number, s: number): void {
    const p = this.fire('plus', L_OVER, '#ffe9a0', x, y, 7 * s, 0.6, 0, -16, 0, 1.4, 1);
    p.growth = 2.4 * s;
  }

  private recipeHealGlow(x: number, y: number, s: number): void {
    this.ring('#8ef5a8', x, y, 12 * s, 0.7, 3.2 * s, true, 0.5);
    this.soft(L_GLOW, '#b6ffbe', x, y, 22 * s, 0.7, 0, 0, 0, 1.4, 0.8, 18 * s);
    for (let i = 0; i < 8; i++) {
      const a = $rand() * 6.283;
      this.arc('#d9ffdf', x + ($rand() - 0.5) * 6, y + 4, (2.4 + $rand() * 2.2) * s, 0.6 + $rand() * 0.4, a, 18 + $rand() * 24, -19, 1.1, L_GLOW);
    }
    // Rising motes.
    for (let i = 0; i < 5; i++) {
      this.soft(L_GLOW, '#a7ff9c', x + ($rand() - 0.5) * 20 * s, y + 6, (3.6 + $rand() * 2.6) * s, 0.65 + $rand() * 0.4, ($rand() - 0.5) * 14, -34, -12, 1.2, 1, -1.4);
    }
    this.decal('#8ef5a8', x, y, 15 * s, 1.7, 'rune');
  }

  private recipeShieldBreak(x: number, y: number, s: number): void {
    this.soft(L_CORE, '#ffffff', x, y, 32 * s, 0.11, 0, 0, 0, 0, 1, 16 * s);
    this.ring('#9fd8ff', x, y, 14 * s, 0.4, 5.5 * s, true, 0.68);
    for (let i = 0; i < 9; i++) {
      const a = $rand() * 6.283;
      const sp = 60 + $rand() * 95;
      this.shard(i % 2 === 0 ? '#dff0ff' : '#8ab6d8', x, y, (2.6 + $rand() * 2.6) * s, 0.55 + $rand() * 0.35, Math.cos(a) * sp * s, Math.sin(a) * sp * s, 300, 0.35);
    }
    for (let i = 0; i < 7; i++) {
      const a = $rand() * 6.283;
      const sp = 90 + $rand() * 100;
      this.spark('#ffffff', x, y, (1.6 + $rand() * 1.3) * s, 0.26, Math.cos(a) * sp, Math.sin(a) * sp, 120, 2.4);
    }
  }

  private recipeStunStars(x: number, y: number, s: number): void {
    for (let i = 0; i < 3; i++) this.orbitStar(x, y - 14 * s, (11 + i * 2.6) * s, 1.2 + i * 0.18);
    this.soft(L_GLOW, '#ffe9a0', x, y - 14 * s, 11 * s, 0.2, 0, 0, 0, 0, 0.85, 10 * s);
  }

  private recipeArrowImpact(x: number, y: number, s: number): void {
    this.soft(L_CORE, '#fff2cf', x, y, 17 * s, 0.09, 0, 0, 0, 0, 1, 9 * s);
    for (let i = 0; i < 6; i++) {
      const a = Math.PI + $rand() * Math.PI * 1.4;
      const sp = 55 + $rand() * 100;
      this.spark(i % 2 === 0 ? '#ffe7b0' : '#ffffff', x, y, (1.4 + $rand() * 1.5) * s, 0.18 + $rand() * 0.14, Math.cos(a) * sp, Math.sin(a) * sp, 160, 2.6);
    }
    for (let i = 0; i < 3; i++) {
      const a = $rand() * 6.283;
      this.puff('#cbbc9e', x, y, (6 + $rand() * 5) * s, 0.38, Math.cos(a) * 24, Math.sin(a) * 12 - 8, -10, 2, 0.45, 12 * s);
    }
  }

  private recipeMagicImpact(x: number, y: number, s: number, color?: string): void {
    const tone = color ?? '#b98aff';
    this.soft(L_CORE, '#ffffff', x, y, 30 * s, 0.12, 0, 0, 0, 0, 1, 16 * s);
    this.ring(tone, x, y, 13 * s, 0.42, 4 * s, true, 0.85);
    for (let i = 0; i < 8; i++) {
      const a = $rand() * 6.283;
      const sp = 34 + $rand() * 60;
      this.soft(L_GLOW, i % 2 === 0 ? tone : '#e6d6ff', x, y, (6 + $rand() * 6) * s, 0.4 + $rand() * 0.3, Math.cos(a) * sp, Math.sin(a) * sp, -20, 2.2, 0.9, 12 * s);
    }
    for (let i = 0; i < 7; i++) {
      const a = $rand() * 6.283;
      const sp = 70 + $rand() * 100;
      this.spark('#e9d5ff', x, y, (1.6 + $rand() * 1.2) * s, 0.28, Math.cos(a) * sp, Math.sin(a) * sp - 10, 30, 2.5);
    }
    this.decal(tone, x, y, 14 * s, 1.9, 'rune');
  }

  private recipeBloodSpray(x: number, y: number, s: number, count: number): void {
    const n = count > 0 ? count : 9;
    for (let i = 0; i < n; i++) {
      const a = $rand() * 6.283;
      const sp = 50 + $rand() * 100;
      this.soft(L_DUST, i % 3 === 0 ? '#c1121f' : '#8a1420', x, y - 2, (2 + $rand() * 2.6) * s, 0.34 + $rand() * 0.35, Math.cos(a) * sp * s, Math.sin(a) * sp * s - 22, 420, 0.5, 0.95, -0.6);
    }
    for (let i = 0; i < 4; i++) {
      const a = $rand() * 6.283;
      this.puff('#5e0f16', x, y, (5 + $rand() * 4) * s, 0.4, Math.cos(a) * 18, Math.sin(a) * 12 - 10, 60, 1.8, 0.42, 12 * s);
    }
    this.decal('#5a1018', x + ($rand() - 0.5) * 10, y + 3, 12 * s, 3, 'decal');
  }

  private recipeSpawnPuff(x: number, y: number, s: number): void {
    this.soft(L_CORE, '#ffffff', x, y, 28 * s, 0.13, 0, 0, 0, 0, 0.95, 16 * s);
    this.ring('#e8e0cf', x, y, 13 * s, 0.5, 3.6 * s, false, 0.55);
    for (let i = 0; i < 8; i++) {
      const a = $rand() * 6.283;
      const sp = 18 + $rand() * 36;
      this.puff(i % 2 === 0 ? '#ded3bd' : '#a89b84', x, y, (9 + $rand() * 9) * s, 0.55 + $rand() * 0.5, Math.cos(a) * sp * s, Math.sin(a) * sp * s - 14 * s, -14, 1.9, 0.6, 22 * s);
    }
    for (let i = 0; i < 6; i++) {
      const a = $rand() * 6.283;
      const sp = 50 + $rand() * 80;
      this.arc('#fff6d8', x, y - 2, (2 + $rand() * 2) * s, 0.32 + $rand() * 0.22, a, sp, 180, 2.2, L_SPARK);
    }
    this.decal('#cfe8ff', x, y, 15 * s, 1.5, 'rune');
  }

`;

writeFileSync(FILE, src.slice(0, a) + block + src.slice(b));
console.log(`replaced ${b - a} chars with ${block.length}`);
