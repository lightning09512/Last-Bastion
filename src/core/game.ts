// ─── Game Engine ─────────────────────────────────────────────────
// Core game loop, state management, and orchestration.

import {
  Vec2, DESIGN_WIDTH, DESIGN_HEIGHT, FIXED_DT, SELL_REFUND_RATE,
  STAR_THRESHOLDS, GameScreen, GameSpeed, LevelData, WaveData,
} from '../data/types';
import { TOWERS } from '../data/towers';
import { ENEMIES } from '../data/enemies';
import { LEVELS } from '../data/levels';
import { BALANCE } from '../data/balance';
import { Renderer } from './renderer';
import { InputManager } from './input';
import { ObjectPool } from './pool';
import { dist, lerp, lerpVec, pointInCircle, angle, lerpAngle } from './utils';
import { loadSave, writeSave } from './save';
import type { SaveData } from '../data/types';
import { drawTowerDirect } from '../rendering/TowerRenderer';
import { drawEnemyDirect, drawSoldierDirect } from '../rendering/EnemyRenderer';
import { drawProjectileDirect } from '../rendering/ProjectileRenderer';
import { getSpell } from '../data/spells';
import { playSound, playMusic, stopMusic, toggleMute, isMuted, setMuted, initAudio } from './audio';
import { DebugOverlay } from './debug';
import { lighten } from './color';
import { Camera } from './camera';
import { postFx } from './postfx';
import { drawIcon, type IconName } from '../rendering/Icons';
import { vfx } from '../rendering/VFX';
import { AmbientSystem } from './ambient';

// ─── Runtime Entity Types ────────────────────────────────────────

interface Enemy {
  id: number;
  dataId: string;
  x: number; y: number;
  /** Position at the previous fixed step, used for render interpolation (A1). */
  prevX: number; prevY: number;
  hp: number; maxHp: number;
  speed: number;
  armor: number;
  magicResist: number;
  livesDamage: number;
  goldReward: number;
  flying: boolean;
  color: string;
  size: number;
  pathIndex: number; // current waypoint target
  pathProgress: number; // 0-1 between current and next waypoint
  laneOffset: number; // small random offset
  alive: boolean;
  hitFlash: number; // timer for flash effect
  slowed: number; // slow timer
  slowFactor: number; // multiplier when slowed
  totalPathDist: number; // for "first" targeting
  facingLeft?: boolean;
  blockedBySoldierId?: number | null;
  /** Independent timers for the abilities declared in ENEMIES[].abilities. */
  meleeTimer?: number;
  healTimer?: number;
  regenTimer?: number;
  summonTimer?: number;
  stunTimer?: number;
}

interface Soldier {
  id: number;
  towerId: number | null;
  x: number; y: number;
  /** Position at the previous fixed step, used for render interpolation (A1). */
  prevX: number; prevY: number;
  targetX: number; targetY: number;
  hp: number; maxHp: number;
  damage: number;
  attackTimer: number;
  attackInterval: number;
  blockingEnemyId: number | null;
  level: number;
  type: 'militia' | 'footman' | 'knight' | 'reinforcement';
  alive: boolean;
  respawnTimer: number;
  lifespan?: number;
  hitFlash: number;
  facingLeft?: boolean;
}

interface Meteor {
  id: number;
  x: number; y: number;
  prevX: number; prevY: number;
  startX: number; startY: number;
  targetX: number; targetY: number;
  progress: number;
  speed: number;
  damage: number;
  radius: number;
  active: boolean;
}

interface Projectile {
  id: number;
  x: number; y: number;
  prevX: number; prevY: number;
  /** Last known position of the locked target; used when it dies mid-flight. */
  destX: number; destY: number;
  targetId: number;
  speed: number;
  damage: number;
  damageType: 'physical' | 'magic';
  splashRadius: number;
  active: boolean;
  color: string;
  trail: Vec2[];
}

interface Tower {
  id: number;
  slotIndex: number;
  x: number; y: number;
  dataId: string; // key in TOWERS
  level: number; // 0=level1, 1=level2, 2=level3
  specId: string | null;
  fireTimer: number;
  totalInvested: number;
  stunTimer: number;
  animTimer: number; // for attack animation
  /** A8: current turret facing in radians, eased towards the target. */
  aimAngle: number;
}

interface FloatingText {
  x: number; y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  active: boolean;
  size: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  active: boolean;
}

// ─── Radial Menu ─────────────────────────────────────────────────
interface RadialMenuItem {
  label: string;
  icon: IconName;
  cost?: number;
  color: string;
  action: string;
  enabled: boolean;
  description?: string;
}

interface RadialMenu {
  x: number; y: number;
  items: RadialMenuItem[];
  hoveredIndex: number;
  type: 'build' | 'tower';
  towerRef?: Tower;
}

// ─── Map Decorations ─────────────────────────────────────────────
export type DecorationType = 'tree' | 'rock' | 'bush' | 'mushroom' | 'stump' | 'bones' | 'sign';

interface Decoration {
  x: number; y: number;
  type: DecorationType;
  size: number;
  variant: number;
}

// ─── World render order (A3) ─────────────────────────────────────
// Everything that stands on the ground is painted back-to-front by its own
// Y coordinate so a unit behind a tower is correctly occluded by it.

const WorldKind = {
  Decoration: 0,
  Tower: 1,
  Soldier: 2,
  Enemy: 3,
  Gate: 4,
  Castle: 5,
} as const;
type WorldKind = (typeof WorldKind)[keyof typeof WorldKind];

interface WorldItem {
  y: number;
  kind: WorldKind;
  ref: unknown;
}

export class Game {
  private renderer: Renderer;
  private input: InputManager;
  private save: SaveData;

  // Game state
  private screen: GameScreen = 'menu';
  private currentLevel: LevelData | null = null;
  private gold = 0;
  private lives = 0;
  private maxLives = 0;
  private livesLost = 0;
  private gameSpeed: GameSpeed = 1;
  private paused = false;

  // Wave management
  private waves: WaveData[] = [];
  private currentWaveIndex = 0;
  private waveActive = false;
  private waveSpawnTimers: { groupIndex: number; spawnCount: number; timer: number; delayTimer: number }[] = [];
  private allWavesComplete = false;
  private timeBetweenWaves = BALANCE.wave.timeBetweenWaves;
  private waveTimer = 0; // countdown to next wave
  private waitingForWave = false;

  // Entities
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private nextEnemyId = 1;
  private nextTowerId = 1;
  private nextProjectileId = 1;
  private nextMeteorId = 1;
  /** Simulation clock in seconds, used for splash source throttling. */
  private simTime = 0;
  /** sourceKey → (enemyId → simTime of last hit) for splash throttling. */
  private splashHits = new Map<string, Map<number, number>>();

  // Object pools
  private projectilePool: ObjectPool<Projectile>;
  private textPool: ObjectPool<FloatingText>;
  private particlePool: ObjectPool<Particle>;

  // UI
  private radialMenu: RadialMenu | null = null;
  private selectedSlot: number = -1;
  private selectedTower: Tower | null = null;

  // Map decorations
  private decorations: Decoration[] = [];

  // Depth-sorted world pass (A3), reused every frame to avoid allocations.
  private worldItems: WorldItem[] = [];
  private worldOrder: number[] = [];

  // World map
  private worldMapHovered = -1;

  // Menu animation
  private menuTime = 0;

  /** A1: fraction of the pending fixed step, used to interpolate rendering. */
  private renderAlpha = 0;

  /** A18: frame-time and budget overlay, toggled with F1. */
  private debug = new DebugOverlay();

  /** A12: camera juice (shake / zoom punch) and heavy-hit freeze frames. */
  private camera = new Camera();
  private hitStop = 0;
  /** 1 → 0 red screen flash when the bastion takes damage. */
  private damageFlash = 0;

  /** A13: the gold counter eases towards the real value instead of jumping. */
  private displayGold = 0;
  /** Screen-space shake for HUD feedback (losing a life). */
  private hudShake = 0;
  /** Coins that fly from a kill towards the gold counter. */
  private goldCoins: { sx: number; sy: number; t: number; delay: number }[] = [];

  /** Short-lived death poses so killed units do not vanish instantly. */
  private corpses: { enemy: Enemy; age: number; maxAge: number }[] = [];

  /** A6: drifting atmosphere per level (pollen, leaves, fireflies, embers). */
  private ambient = new AmbientSystem();

  // Victory/Defeat
  private resultStars = 0;

  // Tutorial
  private tutorialStep = 0; // 0=none, 1=build, 2=upgrade, 3=call wave
  private tutorialDismissed = false;
  private isFirstLevel = false;

  // HUD button rects for hit testing (Kingdom Rush top bar & early wave medallion)
  private pauseBtn = { x: DESIGN_WIDTH - 120, y: 8, w: 44, h: 34 };
  private speedBtn = { x: DESIGN_WIDTH - 65, y: 8, w: 44, h: 34 };
  private callWaveBtn = { x: DESIGN_WIDTH / 2 - 40, y: DESIGN_HEIGHT - 75, w: 80, h: 60 };

  // World map & Menu modal states
  private selectedMapLevel: number | null = null;
  private activeLoreModal = false;

  // Soldiers & Spells (Kingdom Rush mechanics)
  private soldiers: Soldier[] = [];
  private meteors: Meteor[] = [];
  private nextSoldierId = 1;
  private spellCooldowns: Record<string, number> = { rain_of_fire: 0, reinforcements: 0 };
  private activeSpell: 'rain_of_fire' | 'reinforcements' | null = null;
  private spellBtnRain = { x: 30, y: DESIGN_HEIGHT - 65, w: 52, h: 52 };
  private spellBtnReinforce = { x: 92, y: DESIGN_HEIGHT - 65, w: 52, h: 52 };

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.input = new InputManager(canvas);
    this.save = loadSave();
    this.tutorialDismissed = this.save.tutorialDismissed;
    if (this.save.settings.muted) setMuted(true);

    // Initialize pools (D4: hard caps so effects are recycled, never dropped)
    this.projectilePool = new ObjectPool<Projectile>(
      () => ({
        id: 0, x: 0, y: 0, prevX: 0, prevY: 0, destX: 0, destY: 0,
        targetId: -1, speed: 0, damage: 0, damageType: 'physical',
        splashRadius: 0, active: false, color: '#fff', trail: [],
      }),
      (p) => { p.active = false; p.trail.length = 0; },
      BALANCE.pools.projectileInitial,
      BALANCE.pools.projectileMax,
    );
    this.textPool = new ObjectPool<FloatingText>(
      () => ({ x: 0, y: 0, text: '', color: '#fff', life: 0, maxLife: 1, active: false, size: 14 }),
      (t) => { t.active = false; },
      BALANCE.pools.textInitial,
      BALANCE.pools.textMax,
    );
    this.particlePool = new ObjectPool<Particle>(
      () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: '#fff', size: 3, active: false }),
      (p) => { p.active = false; },
      BALANCE.pools.particleInitial,
      BALANCE.pools.particleMax,
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // GAME LOOP
  // ═══════════════════════════════════════════════════════════════

  private accumulator = 0;
  private lastTime = 0;

  start(): void {
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private loop(time: number): void {
    this.debug.beginFrame(time);

    const frameTime = Math.min((time - this.lastTime) / 1000, 0.1); // cap at 100ms
    this.lastTime = time;
    this.accumulator += frameTime;

    // Fixed timestep update. One-shot input flags are consumed after the
    // first step so a multi-step frame can never act on one click twice.
    let stepped = false;
    while (this.accumulator >= FIXED_DT) {
      this.update(FIXED_DT);
      this.accumulator -= FIXED_DT;
      if (!stepped) {
        this.input.consumeClick();
        stepped = true;
      }
    }

    // A1: how far we are between the last two simulated states.
    this.renderAlpha = Math.min(1, this.accumulator / FIXED_DT);

    this.render();

    this.debug.report({
      entities: this.enemies.length + this.soldiers.length + this.towers.length,
      enemies: this.enemies.length,
      particles: this.particlePool.activeCount,
      projectiles: this.projectilePool.activeCount,
    });
    this.debug.draw(this.renderer.ctx);
    this.debug.endFrame();

    requestAnimationFrame((t) => this.loop(t));
  }

  // ═══════════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════════

  private update(dt: number): void {
    // A18: F1 toggles the debug overlay from any screen.
    if (this.input.getState().keysJustPressed.has('f1')) {
      this.debug.toggle();
    }

    this.menuTime += dt;

    switch (this.screen) {
      case 'menu':
        this.updateMenu();
        break;
      case 'worldmap':
        this.updateWorldMap();
        break;
      case 'level':
        this.updateLevel(dt);
        break;
      case 'victory':
      case 'defeat':
        this.updateEndScreen();
        break;
    }
  }

  // ─── Menu ──────────────────────────────────────────────────────

  private updateMenu(): void {
    const inp = this.input.getState();

    // If Lore / Bestiary modal is open
    if (this.activeLoreModal) {
      if (inp.justClicked) {
        const btnX = DESIGN_WIDTH / 2 - 60;
        const btnY = (DESIGN_HEIGHT - 480) / 2 + 480 - 55;
        if (inp.clickPos.x >= btnX && inp.clickPos.x <= btnX + 120 &&
            inp.clickPos.y >= btnY && inp.clickPos.y <= btnY + 40) {
          this.activeLoreModal = false;
          playSound('button_click');
        }
      }
      return;
    }

    if (inp.justClicked) {
      initAudio();

      // "TO BATTLE" button
      const playX = DESIGN_WIDTH / 2 - 130;
      const playY = DESIGN_HEIGHT / 2 + 80;
      if (inp.clickPos.x >= playX && inp.clickPos.x <= playX + 260 &&
          inp.clickPos.y >= playY && inp.clickPos.y <= playY + 56) {
        playSound('button_click');
        this.screen = 'worldmap';
        return;
      }

      // "BESTIARY & LORE" button
      const loreX = DESIGN_WIDTH / 2 - 130;
      const loreY = playY + 68;
      if (inp.clickPos.x >= loreX && inp.clickPos.x <= loreX + 260 &&
          inp.clickPos.y >= loreY && inp.clickPos.y <= loreY + 46) {
        playSound('button_click');
        this.activeLoreModal = true;
        return;
      }

      // Sound button (Top-Right)
      if (inp.clickPos.x >= DESIGN_WIDTH - 80 && inp.clickPos.x <= DESIGN_WIDTH - 24 &&
          inp.clickPos.y >= 20 && inp.clickPos.y <= 60) {
        this.toggleMutePersisted();
        playSound('button_click');
        return;
      }
    }
  }

  /** Mute toggle that survives a reload (5). */
  private toggleMutePersisted(): void {
    const muted = toggleMute();
    this.save.settings.muted = muted;
    writeSave(this.save);
  }

  // ─── Dev hooks (QA only) ───────────────────────────────────────

  /** A18: turn the debug overlay on from the URL (`?debug=1`). */
  enableDebug(): void {
    this.debug.enabled = true;
  }

  /** Jump straight into a level from the URL (`?level=level_3`). */
  startLevelById(levelId: string): boolean {
    const level = LEVELS.find((l) => l.id === levelId);
    if (!level) return false;
    this.startLevel(level);
    return true;
  }

  /** Number of active enemies, used by QA harnesses. */
  get enemyCount(): number {
    return this.enemies.length;
  }

  /** QA: live frame statistics measured by the debug overlay (A18). */
  getQaSnapshot(): {
    fps: number; frameP50: number; frameP95: number;
    enemies: number; entities: number; particles: number; projectiles: number;
    peakEntities: number; peakParticles: number;
    screen: string;
  } {
    return {
      fps: this.debug.fps,
      frameP50: this.debug.frameP50,
      frameP95: this.debug.frameP95,
      enemies: this.enemies.length,
      entities: this.enemies.length + this.soldiers.length + this.towers.length,
      particles: this.particlePool.activeCount,
      projectiles: this.projectilePool.activeCount,
      peakEntities: this.debug.peakEntities,
      peakParticles: this.debug.peakParticles,
      screen: this.screen,
    };
  }

  // ─── World Map ─────────────────────────────────────────────────

  private updateWorldMap(): void {
    const inp = this.input.getState();
    this.worldMapHovered = -1;

    const nodes = this.renderer.getLevelPositions(LEVELS.length);

    // If Stage Briefing Scroll Modal is open
    if (this.selectedMapLevel !== null) {
      if (inp.justClicked) {
        const modalW = 540;
        const modalH = 430;
        const mx = (DESIGN_WIDTH - modalW) / 2;
        const my = (DESIGN_HEIGHT - modalH) / 2;

        // "TO BATTLE!" button
        const btnW = 220;
        const btnH = 55;
        const btnX = DESIGN_WIDTH / 2 - btnW / 2;
        const btnY = my + 320;
        if (inp.clickPos.x >= btnX && inp.clickPos.x <= btnX + btnW &&
            inp.clickPos.y >= btnY && inp.clickPos.y <= btnY + btnH) {
          const selIdx = this.selectedMapLevel;
          this.selectedMapLevel = null;
          this.startLevel(LEVELS[selIdx]);
          return;
        }

        // Close "✕" button
        const closeX = mx + modalW - 32;
        const closeY = my + 22;
        if (Math.hypot(inp.clickPos.x - closeX, inp.clickPos.y - closeY) < 18) {
          this.selectedMapLevel = null;
          playSound('button_click');
          return;
        }

        // Click outside modal closes it
        if (inp.clickPos.x < mx || inp.clickPos.x > mx + modalW ||
            inp.clickPos.y < my || inp.clickPos.y > my + modalH) {
          this.selectedMapLevel = null;
          playSound('button_click');
          return;
        }
      }
      return;
    }

    // Hover stage markers
    for (let i = 0; i < LEVELS.length; i++) {
      const pos = nodes[i];
      if (pointInCircle(inp.pointer, pos, 36)) {
        this.worldMapHovered = i;
      }
    }

    if (inp.justClicked) {
      // Top bar Back button
      if (inp.clickPos.x >= 20 && inp.clickPos.x <= 130 &&
          inp.clickPos.y >= 10 && inp.clickPos.y <= 46) {
        this.screen = 'menu';
        playSound('button_click');
        return;
      }

      // Top bar Sound button
      if (inp.clickPos.x >= DESIGN_WIDTH - 70 && inp.clickPos.x <= DESIGN_WIDTH - 20 &&
          inp.clickPos.y >= 10 && inp.clickPos.y <= 46) {
        this.toggleMutePersisted();
        playSound('button_click');
        return;
      }

      // Stage marker click
      if (this.worldMapHovered >= 0) {
        const lvlIdx = this.worldMapHovered;
        const unlocked = lvlIdx === 0 || !!this.save.levelStars[LEVELS[lvlIdx - 1].id];
        if (unlocked) {
          this.selectedMapLevel = lvlIdx;
          playSound('button_click');
        }
      }
    }
  }

  // ─── Level ─────────────────────────────────────────────────────

  private startLevel(level: LevelData): void {
    initAudio();
    playMusic('battle');
    playSound('wave_horn');
    this.currentLevel = level;

    this.gold = level.startingGold;
    this.lives = level.startingLives;
    this.maxLives = level.startingLives;
    this.livesLost = 0;
    this.waves = level.waves;
    this.currentWaveIndex = 0;
    this.waveActive = false;
    this.allWavesComplete = false;
    this.waitingForWave = true;
    this.enemies = [];
    this.towers = [];
    this.soldiers = [];
    this.meteors = [];
    this.spellCooldowns = { rain_of_fire: 0, reinforcements: 0 };
    this.activeSpell = null;
    this.projectilePool.releaseAll();
    this.textPool.releaseAll();
    this.particlePool.releaseAll();
    this.radialMenu = null;
    this.selectedSlot = -1;
    this.selectedTower = null;
    this.nextEnemyId = 1;
    this.nextTowerId = 1;
    this.nextProjectileId = 1;
    this.nextMeteorId = 1;
    this.simTime = 0;
    this.splashHits.clear();
    this.corpses.length = 0;
    vfx.clear();
    this.ambient.setTheme(level.id);
    this.goldCoins.length = 0;
    this.hudShake = 0;
    this.displayGold = this.gold;
    this.camera.clear();
    this.hitStop = 0;
    this.damageFlash = 0;
    this.gameSpeed = 1;
    this.paused = false;
    this.isFirstLevel = level.id === 'level_1';
    this.tutorialStep = this.isFirstLevel && !this.tutorialDismissed ? 1 : 0;
    this.screen = 'level';
    this.generateDecorations();

    // Auto-start the first wave after a short grace period (g: single source).
    this.waveTimer = BALANCE.wave.firstWaveDelay;
  }

  private generateDecorations(): void {
    this.decorations = [];
    if (!this.currentLevel) return;

    // Generate decorations away from path and build slots
    const path = this.currentLevel.path;
    const slots = this.currentLevel.buildSlots;

    const dec = BALANCE.decorations;
    const props = dec.props;
    const totalWeight = props.reduce((sum, p) => sum + p.weight, 0);

    for (let i = 0; i < dec.count; i++) {
      let x: number, y: number;
      let valid = false;
      let attempts = 0;

      do {
        x = dec.minX + Math.random() * (DESIGN_WIDTH - dec.minX * 2);
        y = dec.minY + Math.random() * (DESIGN_HEIGHT - dec.minY - 70);
        valid = true;

        // Check distance from path
        for (const wp of path) {
          if (dist({ x, y }, wp) < dec.pathClearance) { valid = false; break; }
        }
        // Check distance from build slots
        if (valid) {
          for (const s of slots) {
            if (dist({ x, y }, s) < dec.slotClearance) { valid = false; break; }
          }
        }
        attempts++;
      } while (!valid && attempts < dec.maxAttempts);

      if (!valid) continue;

      // Weighted pick so every prop type appears, with a random variant (A5).
      let roll = Math.random() * totalWeight;
      let chosen: (typeof props)[number] = props[0];
      for (const p of props) {
        roll -= p.weight;
        if (roll <= 0) { chosen = p; break; }
      }

      this.decorations.push({
        x, y,
        type: chosen.type,
        size: chosen.sizeMin + Math.random() * (chosen.sizeMax - chosen.sizeMin),
        variant: chosen.variants > 1 ? Math.floor(Math.random() * chosen.variants) : 0,
      });
    }
    // Depth sorting
    this.decorations.sort((a, b) => a.y - b.y);
  }

  private updateLevel(dt: number): void {
    // Camera always eases, even while the match is frozen.
    this.camera.update(dt);
    if (this.damageFlash > 0) this.damageFlash = Math.max(0, this.damageFlash - dt * 1.6);
    this.updateHudFeedback(dt);

    if (this.paused) {
      // Pause freezes the match: only pause/Esc input is accepted.
      this.handleLevelInput();
      return;
    }

    // A12: hit-stop — heavy impacts freeze the simulation for a few frames
    // while the renderer keeps drawing, which is what sells the weight.
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      this.handleLevelInput();
      return;
    }

    const effectiveDt = dt * this.gameSpeed;
    this.simTime += effectiveDt;
    this.capturePositions();

    // Corpse timers run on scaled time so game speed still affects them.
    this.updateCorpses(effectiveDt);
    vfx.update(effectiveDt);
    this.ambient.update(effectiveDt);

    // Wave management
    this.updateWaves(effectiveDt);

    // Soldiers
    this.updateSoldiers(effectiveDt);

    // Spells
    this.updateSpells(effectiveDt);

    // Enemies
    this.updateEnemies(effectiveDt);

    // Towers
    this.updateTowers(effectiveDt);

    // Projectiles
    this.updateProjectiles(effectiveDt);

    // Floating text
    this.updateFloatingTexts(effectiveDt);

    // Particles
    this.updateParticles(effectiveDt);

    // Check victory/defeat
    this.checkEndConditions();

    // Input
    this.handleLevelInput();
  }

  /** Advance and retire death poses. */
  /** A13: HUD feedback — gold easing, coin pops and the lives shake. */
  private updateHudFeedback(dt: number): void {
    const diff = this.gold - this.displayGold;
    if (Math.abs(diff) < 0.4) {
      this.displayGold = this.gold;
    } else {
      this.displayGold += diff * Math.min(1, dt * 9);
    }

    if (this.hudShake > 0) this.hudShake = Math.max(0, this.hudShake - dt * 6);

    for (let i = this.goldCoins.length - 1; i >= 0; i--) {
      const coin = this.goldCoins[i];
      if (coin.delay > 0) {
        coin.delay -= dt;
        continue;
      }
      coin.t += dt * 1.9;
      if (coin.t >= 1) this.goldCoins.splice(i, 1);
    }
  }

  /** Award gold and launch a coin towards the HUD counter. */
  private addGold(amount: number, fromX?: number, fromY?: number): void {
    if (amount === 0) return;
    this.gold += amount;
    if (fromX !== undefined && fromY !== undefined && this.goldCoins.length < 24) {
      this.goldCoins.push({ sx: fromX, sy: fromY, t: 0, delay: Math.random() * 0.12 });
    }
  }

  private drawGoldCoins(ctx: CanvasRenderingContext2D): void {
    if (this.goldCoins.length === 0) return;
    const targetX = 62;
    const targetY = 25;

    ctx.save();
    for (const coin of this.goldCoins) {
      if (coin.delay > 0) continue;
      const t = coin.t;
      // Ease-out arc: quick launch, gentle arrival at the counter.
      const ease = 1 - (1 - t) * (1 - t);
      const x = coin.sx + (targetX - coin.sx) * ease;
      const arc = Math.sin(ease * Math.PI) * 46;
      const y = coin.sy + (targetY - coin.sy) * ease - arc;
      const scale = 1 - ease * 0.45;
      const alpha = t < 0.85 ? 1 : (1 - t) / 0.15;

      ctx.globalAlpha = Math.max(0, alpha);
      const r = 5 * scale;
      const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.15, x, y, r);
      grad.addColorStop(0, '#fff6c8');
      grad.addColorStop(0.55, '#ffd54a');
      grad.addColorStop(1, '#c98f14');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,58,10,0.65)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  private updateCorpses(dt: number): void {
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const corpse = this.corpses[i];
      corpse.age += dt;
      if (corpse.age >= corpse.maxAge) this.corpses.splice(i, 1);
    }
  }

  /** Remember a fallen unit so it can fade out instead of popping away. */
  private addCorpse(enemy: Enemy): void {
    if (enemy.flying) return;
    if (this.corpses.length >= 40) this.corpses.shift();
    this.corpses.push({ enemy: { ...enemy, alive: true }, age: 0, maxAge: 0.55 });
  }

  /**
   * A1: remember every moving entity's position before the step so the
   * renderer can interpolate between the last two simulated states.
   */
  private capturePositions(): void {
    for (const e of this.enemies) { e.prevX = e.x; e.prevY = e.y; }
    for (const s of this.soldiers) { s.prevX = s.x; s.prevY = s.y; }
    for (const p of this.projectilePool.getActive()) { p.prevX = p.x; p.prevY = p.y; }
    for (const m of this.meteors) { m.prevX = m.x; m.prevY = m.y; }
  }

  /**
   * A1: draw a moving entity at its interpolated position without
   * allocating a copy every frame.
   */
  private drawInterpolated<T extends { x: number; y: number; prevX: number; prevY: number }>(
    entity: T,
    draw: (view: T) => void,
  ): void {
    const a = this.renderAlpha;
    if (a <= 0.0001) {
      draw(entity);
      return;
    }
    const x = entity.x;
    const y = entity.y;
    entity.x = lerp(entity.prevX, x, a);
    entity.y = lerp(entity.prevY, y, a);
    draw(entity);
    entity.x = x;
    entity.y = y;
  }

  // ─── Wave System ───────────────────────────────────────────────

  private updateWaves(dt: number): void {
    if (this.allWavesComplete) return;

    if (this.waitingForWave) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.beginWave();
      }
      return;
    }

    if (this.waveActive) {
      let allGroupsDone = true;

      for (const gs of this.waveSpawnTimers) {
        const group = this.waves[this.currentWaveIndex].groups[gs.groupIndex];
        if (gs.spawnCount >= group.count) continue;

        allGroupsDone = false;

        // Handle initial delay
        if (gs.delayTimer > 0) {
          gs.delayTimer -= dt;
          continue;
        }

        gs.timer -= dt;
        if (gs.timer <= 0) {
          this.spawnEnemy(group.enemyId);
          gs.spawnCount++;
          gs.timer = group.spawnInterval;
        }
      }

      // Check if all spawned and all dead
      if (allGroupsDone) {
        const allEnemiesDead = this.enemies.every(e => !e.alive);
        if (allEnemiesDead) {
          this.waveActive = false;
          this.currentWaveIndex++;

          if (this.currentWaveIndex >= this.waves.length) {
            this.allWavesComplete = true;
          } else {
            this.waitingForWave = true;
            this.waveTimer = this.timeBetweenWaves;
          }
        }
      }
    }
  }

  private beginWave(): void {
    if (this.currentWaveIndex >= this.waves.length) return;
    const wave = this.waves[this.currentWaveIndex];
    this.waveActive = true;
    this.waitingForWave = false;
    this.waveSpawnTimers = wave.groups.map((g, i) => ({
      groupIndex: i,
      spawnCount: 0,
      timer: g.spawnInterval,
      delayTimer: g.delay,
    }));

    // Tutorial: call wave
    if (this.tutorialStep === 3) {
      this.tutorialStep = 0;
    }
  }

  private callWaveEarly(): void {
    if (!this.waitingForWave || this.allWavesComplete) return;
    const bonus = this.waves[this.currentWaveIndex]?.earlyCallBonus || 0;
    this.addGold(bonus, DESIGN_WIDTH / 2, DESIGN_HEIGHT - 80);
    playSound('wave_horn');
    playSound('gold_gain');
    this.spawnFloatingText(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 80, `+${bonus} gold!`, '#ffd700', 20);
    this.beginWave();
  }

  // ─── Enemy System ──────────────────────────────────────────────

  private spawnEnemy(dataId: string): void {
    const data = ENEMIES[dataId];
    if (!data || !this.currentLevel) return;

    const spawn = this.currentLevel.spawnPosition;
    const laneOffset = (Math.random() - 0.5) * BALANCE.enemy.laneOffset * 2;

    const enemy: Enemy = {
      id: this.nextEnemyId++,
      dataId,
      x: spawn.x,
      y: spawn.y,
      prevX: spawn.x,
      prevY: spawn.y,
      hp: data.hp,
      maxHp: data.hp,
      speed: data.speed,
      armor: data.armor,
      magicResist: data.magicResist,
      livesDamage: data.livesDamage,
      goldReward: data.goldReward,
      flying: data.flying,
      color: data.color,
      size: data.size,
      pathIndex: 1,
      pathProgress: 0,
      laneOffset,
      alive: true,
      hitFlash: 0,
      slowed: 0,
      slowFactor: 1,
      totalPathDist: 0,
      // Always a boolean so renderers never see an undefined facing (fix b).
      facingLeft: spawn.x > (this.currentLevel.basePosition.x),
    };

    this.enemies.push(enemy);

    // Spawn feedback: dust where the unit steps onto the path.
    vfx.spawn('spawnPuff', spawn.x, spawn.y, { color: data.color, scale: 0.8 });
  }

  private updateEnemies(dt: number): void {
    if (!this.currentLevel) return;
    const path = this.currentLevel.path;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      // Hit flash decay
      if (enemy.hitFlash > 0) enemy.hitFlash -= dt * 4;

      // Slow decay
      if (enemy.slowed > 0) {
        enemy.slowed -= dt;
        if (enemy.slowed <= 0) enemy.slowFactor = 1;
      }

      // Melee combat with blocking soldier
      if (enemy.blockedBySoldierId) {
        const soldier = this.soldiers.find(s => s.id === enemy.blockedBySoldierId && s.alive);
        if (!soldier) {
          enemy.blockedBySoldierId = null;
        } else {
          // Stopped by soldier! Melee clash!
          enemy.meleeTimer = (enemy.meleeTimer ?? 0) + dt;
          if (enemy.meleeTimer >= BALANCE.enemy.melee.interval) {
            enemy.meleeTimer = 0;
            const enemyDamage = Math.max(
              BALANCE.enemy.melee.minDamage,
              Math.round(enemy.maxHp * BALANCE.enemy.melee.maxHpRatio),
            );
            soldier.hp -= enemyDamage;
            soldier.hitFlash = 0.2;
            this.spawnFloatingText(soldier.x, soldier.y - 12, `-${enemyDamage}`, '#ef4444', 12);
            this.spawnParticles(soldier.x, soldier.y, '#ef4444', 3);
            if (soldier.hp <= 0) {
              soldier.alive = false;
              soldier.respawnTimer = BALANCE.soldier.respawnTime;
              enemy.blockedBySoldierId = null;
              this.spawnParticles(soldier.x, soldier.y, '#475569', 8);
            }
          }
          continue; // Blocked! Do not advance along path!
        }
      }

      // Enemy abilities — every number comes from ENEMIES[].abilities (B0),
      // with an independent timer per ability so a unit may have several.
      const abilities = ENEMIES[enemy.dataId]?.abilities;
      if (abilities?.heal) {
        const heal = abilities.heal;
        enemy.healTimer = (enemy.healTimer ?? 0) + dt;
        if (enemy.healTimer >= heal.interval) {
          enemy.healTimer = 0;
          playSound('shaman_heal');
          for (const ally of this.enemies) {
            if (ally.alive && !ally.flying && dist(enemy, ally) <= heal.range && ally.hp < ally.maxHp) {
              ally.hp = Math.min(ally.maxHp, ally.hp + heal.amount);
              this.spawnFloatingText(ally.x, ally.y - 10, `+${heal.amount}`, '#22c55e', 13);
              vfx.spawn('healGlow', ally.x, ally.y);
              this.spawnParticles(ally.x, ally.y, '#22c55e', 2);
            }
          }
        }
      }
      if (abilities?.regen && enemy.hp < enemy.maxHp) {
        const regen = abilities.regen;
        enemy.regenTimer = (enemy.regenTimer ?? 0) + dt;
        if (enemy.regenTimer >= regen.interval) {
          enemy.regenTimer = 0;
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + regen.amount);
          this.spawnParticles(enemy.x, enemy.y, '#84cc16', 2);
        }
      }
      if (abilities?.summon) {
        const summon = abilities.summon;
        enemy.summonTimer = (enemy.summonTimer ?? 0) + dt;
        if (enemy.summonTimer >= summon.interval) {
          enemy.summonTimer = 0;
          this.summonMinions(enemy, summon.enemyId, summon.count);
        }
      }
      if (abilities?.stun) {
        const stun = abilities.stun;
        enemy.stunTimer = (enemy.stunTimer ?? 0) + dt;
        if (enemy.stunTimer >= stun.interval) {
          enemy.stunTimer = 0;
          playSound('warlord_roar');
          this.camera.shake(6, 0.35);
          this.spawnFloatingText(enemy.x, enemy.y - 25, 'WAR CRY!', '#ef4444', 16);
          for (const tower of this.towers) {
            if (dist(enemy, tower) <= stun.range) {
              tower.stunTimer = stun.duration;
            }
          }
        }
      }

      // Flying enemies go straight to base
      if (enemy.flying) {
        const base = this.currentLevel.basePosition;
        const dx = base.x - enemy.x;
        const dy = base.y - enemy.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        // Fix (b): flyers must face their direction of travel too.
        if (dx < -1) enemy.facingLeft = true;
        else if (dx > 1) enemy.facingLeft = false;
        const spd = enemy.speed * enemy.slowFactor * dt;
        if (d <= spd) {
          this.enemyReachesBase(enemy);
        } else {
          enemy.x += (dx / d) * spd;
          enemy.y += (dy / d) * spd;
          enemy.totalPathDist += spd;
        }
        continue;
      }

      // Walk along path
      if (enemy.pathIndex >= path.length) {
        this.enemyReachesBase(enemy);
        continue;
      }

      const target = path[enemy.pathIndex];
      const prev = path[enemy.pathIndex - 1] || path[0];
      const segLen = dist(prev, target);
      const spd = (enemy.speed * enemy.slowFactor * dt) / (segLen || 1);
      enemy.pathProgress += spd;

      if (enemy.pathProgress >= 1) {
        enemy.pathProgress = 0;
        enemy.pathIndex++;
        if (enemy.pathIndex >= path.length) {
          this.enemyReachesBase(enemy);
          continue;
        }
      }

      const current = path[Math.max(0, enemy.pathIndex - 1)];
      const next = path[Math.min(path.length - 1, enemy.pathIndex)];
      const pos = lerpVec(current, next, enemy.pathProgress);

      // Apply lane offset perpendicular to path direction
      const dir = { x: next.x - current.x, y: next.y - current.y };
      if (dir.x < -1) enemy.facingLeft = true;
      else if (dir.x > 1) enemy.facingLeft = false;
      const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y) || 1;
      const perp = { x: -dir.y / len, y: dir.x / len };
      enemy.x = pos.x + perp.x * enemy.laneOffset;
      enemy.y = pos.y + perp.y * enemy.laneOffset;
      enemy.totalPathDist = enemy.pathIndex * 1000 + enemy.pathProgress * 1000;
    }

    // Remove dead enemies
    this.enemies = this.enemies.filter(e => e.alive);
  }

  /**
   * Summon minions beside `summoner`, standing on the path at the summoner's
   * own progress so they can never be teleported past the base (fix 9).
   */
  private summonMinions(summoner: Enemy, enemyId: string, count: number): void {
    if (!this.currentLevel) return;
    const path = this.currentLevel.path;
    if (path.length < 2) return;

    const progress = Math.min(summoner.pathProgress, 0.5);
    const idx = Math.min(Math.max(1, summoner.pathIndex), path.length - 1);
    const from = path[idx - 1] ?? path[0];
    const to = path[idx] ?? path[path.length - 1];
    const anchor = lerpVec(from, to, progress);

    for (let i = 0; i < count; i++) {
      this.spawnEnemy(enemyId);
      const minion = this.enemies[this.enemies.length - 1];
      if (!minion) continue;

      const spread = (i - (count - 1) / 2) * BALANCE.enemy.summonSpread;
      minion.x = anchor.x + spread;
      minion.y = anchor.y + (Math.random() - 0.5) * BALANCE.enemy.laneOffset * 2;
      minion.prevX = minion.x;
      minion.prevY = minion.y;
      minion.pathIndex = idx;
      minion.pathProgress = progress;
      this.spawnParticles(minion.x, minion.y, '#dc2626', 8);
    }
  }

  private enemyReachesBase(enemy: Enemy): void {
    enemy.alive = false;
    this.lives -= enemy.livesDamage;
    this.livesLost += enemy.livesDamage;
    if (this.lives < 0) this.lives = 0;
    this.camera.shake(6, 0.3);
    this.damageFlash = Math.min(1, this.damageFlash + 0.7);
    this.hudShake = 1;
    vfx.spawn('explosion', enemy.x, enemy.y, { scale: 1.1, color: '#ff5a3c' });

    // Flash effect at base
    if (this.currentLevel) {
      const base = this.currentLevel.basePosition;
      this.spawnParticles(base.x, base.y, '#ff3333', 6);
      this.spawnFloatingText(base.x, base.y - 20, `-${enemy.livesDamage} ❤`, '#ff4444', 18);
    }
  }

  private damageEnemy(enemy: Enemy, damage: number, damageType: 'physical' | 'magic'): void {
    if (!enemy.alive) return;

    let actualDamage = damage;
    if (damageType === 'physical') {
      actualDamage *= (1 - enemy.armor);
    } else {
      actualDamage *= (1 - enemy.magicResist);
    }

    enemy.hp -= actualDamage;
    enemy.hitFlash = 1;

    if (enemy.hp <= 0) {
      enemy.alive = false;
      this.addGold(enemy.goldReward, enemy.x, enemy.y - 10);
      playSound('enemy_death');
      playSound('gold_gain');
      this.addCorpse(enemy);
      this.camera.shake(Math.min(4, 1 + enemy.size * 0.12), 0.2);
      vfx.spawn('dust', enemy.x, enemy.y, { scale: Math.max(0.6, enemy.size / 9) });
      if (enemy.size >= 12) vfx.spawn('debris', enemy.x, enemy.y, { color: enemy.color });
      this.spawnFloatingText(enemy.x, enemy.y - 15, `+${enemy.goldReward}`, '#ffd700', 14);
      this.spawnParticles(enemy.x, enemy.y, enemy.color, 8);

      if (enemy.blockedBySoldierId) {
        const soldier = this.soldiers.find(s => s.id === enemy.blockedBySoldierId);
        if (soldier && soldier.blockingEnemyId === enemy.id) {
          soldier.blockingEnemyId = null;
        }
      }

      // Tutorial: after first kill, suggest upgrade
      if (this.tutorialStep === 1 && this.towers.length > 0) {
        this.tutorialStep = 2;
      }
    }
  }

  // ─── Tower System ──────────────────────────────────────────────

  private buildTower(slotIndex: number, towerId: string): void {
    if (!this.currentLevel) return;
    const slot = this.currentLevel.buildSlots[slotIndex];
    const towerData = TOWERS[towerId];
    if (!towerData) return;

    const cost = towerData.levels[0].cost;
    if (this.gold < cost) return;

    this.gold -= cost;

    const tower: Tower = {
      id: this.nextTowerId++,
      slotIndex,
      x: slot.x,
      y: slot.y,
      dataId: towerId,
      level: 0,
      specId: null,
      fireTimer: 0,
      totalInvested: cost,
      stunTimer: 0,
      animTimer: 0,
      aimAngle: -Math.PI / 2,
    };

    this.towers.push(tower);
    this.radialMenu = null;
    this.selectedSlot = -1;
    vfx.spawn('dust', slot.x, slot.y, { scale: 1.2 });
    vfx.spawn('spawnPuff', slot.x, slot.y - 12, { color: towerData.color });
    this.spawnParticles(slot.x, slot.y, towerData.color, 6);
    playSound('upgrade');

    // Tutorial: built first tower
    if (this.tutorialStep === 1) {
      this.tutorialStep = 3; // next: call wave
    }
  }

  private upgradeTower(tower: Tower): void {
    const towerData = TOWERS[tower.dataId];
    if (!towerData) return;

    if (tower.level >= 2) return; // Already max before spec
    const nextLevel = towerData.levels[tower.level + 1];
    if (this.gold < nextLevel.cost) return;

    this.gold -= nextLevel.cost;
    tower.totalInvested += nextLevel.cost;
    tower.level++;
    vfx.spawn('shockwave', tower.x, tower.y - 10, { color: towerData.color });
    vfx.spawn('dust', tower.x, tower.y, { scale: 1.1 });
    this.spawnParticles(tower.x, tower.y, towerData.color, 6);
    playSound('upgrade');
    this.radialMenu = null;
    this.selectedTower = null;

    // Tutorial: upgraded
    if (this.tutorialStep === 2) {
      this.tutorialStep = 3;
    }
  }

  private specializeTower(tower: Tower, specIndex: number): void {
    const towerData = TOWERS[tower.dataId];
    if (!towerData) return;
    if (tower.level !== 2) return; // Must be level 3

    const spec = towerData.specializations[specIndex];
    if (this.gold < spec.cost) return;

    this.gold -= spec.cost;
    tower.totalInvested += spec.cost;
    tower.specId = spec.specId;
    vfx.spawn('holySmite', tower.x, tower.y - 16, { color: towerData.color });
    vfx.spawn('shockwave', tower.x, tower.y - 8, { color: towerData.color });
    this.spawnParticles(tower.x, tower.y, towerData.color, 12);
    playSound('upgrade');
    this.radialMenu = null;
    this.selectedTower = null;
  }

  private sellTower(tower: Tower): void {
    const refund = Math.floor(tower.totalInvested * SELL_REFUND_RATE);
    this.addGold(refund, tower.x, tower.y - 20);
    vfx.spawn('smokePuff', tower.x, tower.y - 12, { scale: 1.3 });
    vfx.spawn('debris', tower.x, tower.y, { color: TOWERS[tower.dataId].color });
    playSound('gold_gain');
    this.spawnFloatingText(tower.x, tower.y - 20, `+${refund}`, '#ffd700', 16);

    const idx = this.towers.indexOf(tower);
    if (idx !== -1) this.towers.splice(idx, 1);

    this.radialMenu = null;
    this.selectedTower = null;
  }

  private getTowerStats(tower: Tower) {
    const towerData = TOWERS[tower.dataId];
    if (tower.specId) {
      const spec = towerData.specializations.find(s => s.specId === tower.specId)!;
      return spec;
    }
    return towerData.levels[tower.level];
  }

  private updateTowers(dt: number): void {
    for (const tower of this.towers) {
      // Stun timer — applies to every tower, barracks included (fix c).
      if (tower.stunTimer > 0) {
        tower.stunTimer -= dt;
      }

      // Animation timer
      if (tower.animTimer > 0) tower.animTimer -= dt;

      // Barracks soldiers fight in melee, no projectile
      if (tower.dataId === 'barracks') continue;
      if (tower.stunTimer > 0) continue;

      const stats = this.getTowerStats(tower);
      const towerData = TOWERS[tower.dataId];
      tower.fireTimer -= dt;

      if (tower.fireTimer <= 0) {
        // Find target
        const target = this.findTarget(tower, stats.range, towerData.targetPriority, towerData.canHitFlying);
        if (target) {
          // A8: ease the turret towards what it is shooting at.
          const desired = angle({ x: tower.x, y: tower.y - 10 }, { x: target.x, y: target.y });
          tower.aimAngle = lerpAngle(tower.aimAngle, desired, Math.min(1, dt * BALANCE.tower.aimTurnSpeed));
          this.fireTower(tower, target, stats);
          tower.fireTimer = 1 / stats.fireRate;
          tower.animTimer = BALANCE.tower.attackAnimDuration;
        } else {
          tower.fireTimer = BALANCE.tower.retryDelay; // Retry quickly
        }
      }
    }
  }

  private findTarget(
    tower: Tower, range: number, priority: string, canHitFlying: boolean,
  ): Enemy | null {
    let best: Enemy | null = null;
    let bestScore = -Infinity;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (enemy.flying && !canHitFlying) continue;

      const d = dist({ x: tower.x, y: tower.y }, { x: enemy.x, y: enemy.y });
      if (d > range) continue;

      let score = 0;
      switch (priority) {
        case 'first':
          score = enemy.totalPathDist; // Higher = further along path
          break;
        case 'strongest':
          score = enemy.maxHp;
          break;
        case 'closest':
          score = -d;
          break;
      }

      if (score > bestScore) {
        bestScore = score;
        best = enemy;
      }
    }

    return best;
  }

  private fireTower(tower: Tower, target: Enemy, stats: ReturnType<typeof this.getTowerStats>): void {
    const towerData = TOWERS[tower.dataId];

    if (tower.dataId === 'cannon') {
      playSound('cannon_shoot');
    } else if (tower.dataId === 'mage') {
      playSound('magic_shoot');
    } else {
      playSound('arrow_shoot');
    }

    // Special: Rapid Volley fires 3 arrows
    const shotCount = tower.specId === 'rapid_volley' ? 3 : 1;

    for (let i = 0; i < shotCount; i++) {
      const proj = this.projectilePool.acquire();
      proj.id = this.nextProjectileId++;
      proj.x = tower.x;
      proj.y = tower.y - 10; // Slight upward offset for tower height
      proj.prevX = proj.x;
      proj.prevY = proj.y;
      proj.targetId = target.id;
      proj.destX = target.x;
      proj.destY = target.y;
      proj.speed = stats.projectileSpeed;
      proj.damage = stats.damage;
      proj.damageType = stats.damageType;
      proj.splashRadius = stats.splashRadius || 0;
      proj.active = true;
      proj.color = towerData.color;
      proj.trail = [];

      // For rapid volley, spread slightly
      if (i > 0) {
        proj.x += (Math.random() - 0.5) * 10;
        proj.y += (Math.random() - 0.5) * 10;
      }
    }
  }

  // ─── Projectile System ─────────────────────────────────────────

  private updateProjectiles(dt: number): void {
    const toRelease: Projectile[] = [];

    for (const proj of this.projectilePool.getActive()) {
      if (!proj.active) { toRelease.push(proj); continue; }

      // Locked target, or the nearest replacement if it died (fix d).
      let target = this.enemies.find(e => e.id === proj.targetId && e.alive);
      if (!target) {
        target = this.findRetarget(proj) ?? undefined;
        if (target) {
          proj.targetId = target.id;
        }
      }
      if (target) {
        proj.destX = target.x;
        proj.destY = target.y;
      }

      // Move toward the remembered destination.
      const dx = proj.destX - proj.x;
      const dy = proj.destY - proj.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const moveSpeed = proj.speed * dt;

      // Store trail
      proj.trail.push({ x: proj.x, y: proj.y });
      if (proj.trail.length > BALANCE.projectile.trailLength) proj.trail.shift();

      const hitRadius = moveSpeed + (target ? target.size : 6);
      if (d <= hitRadius) {
        const impactX = proj.destX;
        const impactY = proj.destY;

        if (proj.splashRadius > 0) {
          playSound('cannon_hit');
          this.camera.shake(3, 0.18);
          vfx.spawn('explosion', impactX, impactY, { scale: proj.splashRadius / 45 });
          this.applySplashDamage(`proj:${proj.id}`, impactX, impactY, proj.splashRadius, proj.damage, proj.damageType);
          this.spawnParticles(impactX, impactY, '#ff6600', 3);
        } else if (target) {
          if (proj.damageType === 'magic') {
            playSound('magic_hit');
            vfx.spawn('magicImpact', impactX, impactY, { color: proj.color });
          } else {
            playSound('arrow_hit');
            vfx.spawn('arrowImpact', impactX, impactY, { color: proj.color });
          }
          this.damageEnemy(target, proj.damage, proj.damageType);
        } else {
          // Target died and nothing else was in reach: fizzle instead of teleporting.
          this.spawnParticles(impactX, impactY, proj.color, 2);
        }

        proj.active = false;
        toRelease.push(proj);
      } else {
        proj.x += (dx / d) * moveSpeed;
        proj.y += (dy / d) * moveSpeed;
      }
    }

    for (const p of toRelease) {
      this.projectilePool.release(p);
    }
  }

  /** Nearest live enemy to a stray projectile, within the retarget radius. */
  private findRetarget(proj: Projectile): Enemy | null {
    let best: Enemy | null = null;
    let bestDist: number = BALANCE.projectile.retargetRadius;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const d = dist({ x: proj.x, y: proj.y }, enemy);
      if (d <= bestDist) {
        bestDist = d;
        best = enemy;
      }
    }
    return best;
  }

  /**
   * B3: splash damage falls off linearly from the centre and a single source
   * cannot hit the same enemy twice inside the same window.
   */
  private applySplashDamage(
    sourceKey: string,
    x: number, y: number,
    radius: number,
    damage: number,
    damageType: 'physical' | 'magic',
  ): void {
    if (radius <= 0) return;

    let hits = this.splashHits.get(sourceKey);
    if (!hits) {
      hits = new Map<number, number>();
      this.splashHits.set(sourceKey, hits);
    }

    const edge = BALANCE.splash.edgeFalloff;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      const d = dist({ x, y }, enemy);
      if (d > radius) continue;

      const last = hits.get(enemy.id);
      if (last !== undefined && this.simTime - last < BALANCE.splash.sameSourceCooldown) continue;
      hits.set(enemy.id, this.simTime);

      const multiplier = 1 - (1 - edge) * (d / radius);
      this.damageEnemy(enemy, damage * multiplier, damageType);
    }
  }

  // ─── Effects ───────────────────────────────────────────────────

  private spawnFloatingText(x: number, y: number, text: string, color: string, size: number): void {
    const ft = this.textPool.acquire();
    ft.x = x;
    ft.y = y;
    ft.text = text;
    ft.color = color;
    ft.life = BALANCE.vfx.floatingTextLife;
    ft.maxLife = BALANCE.vfx.floatingTextLife;
    ft.active = true;
    ft.size = size;
  }

  private spawnParticles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.particlePool.acquire();
      p.x = x;
      p.y = y;
      const ang = Math.random() * Math.PI * 2;
      const spd = BALANCE.vfx.particleSpeedMin
        + Math.random() * (BALANCE.vfx.particleSpeedMax - BALANCE.vfx.particleSpeedMin);
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd;
      p.life = BALANCE.vfx.particleLifeMin
        + Math.random() * (BALANCE.vfx.particleLifeMax - BALANCE.vfx.particleLifeMin);
      p.maxLife = p.life;
      p.color = color;
      p.size = BALANCE.vfx.particleSizeMin
        + Math.random() * (BALANCE.vfx.particleSizeMax - BALANCE.vfx.particleSizeMin);
      p.active = true;
    }
  }

  private updateFloatingTexts(dt: number): void {
    const toRelease: FloatingText[] = [];
    for (const ft of this.textPool.getActive()) {
      if (!ft.active) { toRelease.push(ft); continue; }
      ft.life -= dt;
      ft.y -= BALANCE.vfx.floatingTextRise * dt;
      if (ft.life <= 0) {
        ft.active = false;
        toRelease.push(ft);
      }
    }
    for (const ft of toRelease) this.textPool.release(ft);
  }

  private updateParticles(dt: number): void {
    const toRelease: Particle[] = [];
    for (const p of this.particlePool.getActive()) {
      if (!p.active) { toRelease.push(p); continue; }
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += BALANCE.vfx.particleGravity * dt; // gravity
      if (p.life <= 0) {
        p.active = false;
        toRelease.push(p);
      }
    }
    for (const p of toRelease) this.particlePool.release(p);
  }

  // ─── Soldier & Barracks System ──────────────────────────────────

  private updateSoldiers(dt: number): void {
    if (!this.currentLevel) return;
    const path = this.currentLevel.path;

    // 1. Maintain soldiers for each barracks tower
    for (const tower of this.towers) {
      if (tower.dataId !== 'barracks') continue;

      // Find rally point (closest point on path)
      let bestPt = path[0];
      let bestDist = Infinity;
      for (let i = 0; i < path.length; i++) {
        const d = dist(tower, path[i]);
        if (d < bestDist) {
          bestDist = d;
          bestPt = path[i];
        }
      }

      // Check current soldiers for this tower
      const mySoldiers = this.soldiers.filter(s => s.towerId === tower.id);

      // Stats come from the tower's own data entry (B0).
      const stats = this.getTowerStats(tower);
      const squad = stats.soldier ?? BALANCE.soldier.fallback;
      const maxHp = squad.hp;
      const dmg = squad.damage;
      const attackInterval = squad.attackInterval;

      // Type based on level / spec
      const soldierType: 'militia' | 'footman' | 'knight' =
        tower.specId === 'knights' ? 'knight' : (tower.level > 0 ? 'footman' : 'militia');

      // Respawn timer check for dead soldiers
      for (const s of mySoldiers) {
        if (!s.alive) {
          // Fix (a): temporary units never come back.
          if (s.lifespan !== undefined) continue;
          s.respawnTimer -= dt;
          if (s.respawnTimer <= 0) {
            s.alive = true;
            s.hp = maxHp;
            s.maxHp = maxHp;
            s.damage = dmg;
            s.attackInterval = attackInterval;
            s.type = soldierType;
            s.x = tower.x;
            s.y = tower.y;
            s.prevX = s.x;
            s.prevY = s.y;
            this.spawnParticles(tower.x, tower.y, '#93c5fd', 6);
          }
        } else {
          // Upgrade stats if tower upgraded
          s.maxHp = maxHp;
          s.damage = dmg;
          s.attackInterval = attackInterval;
          s.type = soldierType;
        }
      }

      // Maintain the squad size declared by balance.
      if (mySoldiers.length < BALANCE.soldier.count) {
        for (let i = mySoldiers.length; i < BALANCE.soldier.count; i++) {
          const offsetX = (i === 0 ? -BALANCE.soldier.spread : BALANCE.soldier.spread);
          const offsetY = (i === 0 ? -6 : 6);
          this.soldiers.push({
            id: this.nextSoldierId++,
            towerId: tower.id,
            x: tower.x,
            y: tower.y,
            prevX: tower.x,
            prevY: tower.y,
            targetX: bestPt.x + offsetX,
            targetY: bestPt.y + offsetY,
            hp: maxHp,
            maxHp,
            damage: dmg,
            attackTimer: attackInterval * 0.5,
            attackInterval,
            blockingEnemyId: null,
            level: tower.level,
            type: soldierType,
            alive: true,
            respawnTimer: 0,
            hitFlash: 0,
          });
        }
      }
    }

    // 2. Remove soldiers of demolished towers, and expired reinforcements (fix a)
    this.soldiers = this.soldiers.filter(s => {
      if (s.lifespan !== undefined && !s.alive) return false;
      if (s.towerId === null) return true; // reinforcements
      return this.towers.some(t => t.id === s.towerId);
    });

    // 3. Update each soldier
    for (const soldier of this.soldiers) {
      if (!soldier.alive) continue;

      // Fix (c): a stunned barracks cannot act, its squad stands down.
      if (soldier.towerId !== null) {
        const tower = this.towers.find(t => t.id === soldier.towerId);
        if (tower && tower.stunTimer > 0) continue;
      }

      if (soldier.hitFlash > 0) soldier.hitFlash -= dt * 4;

      // Reinforcement lifespan
      if (soldier.lifespan !== undefined) {
        soldier.lifespan -= dt;
        if (soldier.lifespan <= 0) {
          soldier.alive = false;
          this.spawnParticles(soldier.x, soldier.y, '#94a3b8', 8);
          // Unblock enemy
          if (soldier.blockingEnemyId) {
            const enemy = this.enemies.find(e => e.id === soldier.blockingEnemyId);
            if (enemy && enemy.blockedBySoldierId === soldier.id) {
              enemy.blockedBySoldierId = null;
            }
          }
          continue;
        }
      }

      // Melee combat
      if (soldier.blockingEnemyId) {
        const enemy = this.enemies.find(e => e.id === soldier.blockingEnemyId && e.alive);
        if (!enemy || dist(soldier, enemy) > BALANCE.soldier.breakRange) {
          soldier.blockingEnemyId = null;
        } else {
          // Face enemy
          soldier.facingLeft = enemy.x < soldier.x;

          // Attack timer
          soldier.attackTimer -= dt;
          if (soldier.attackTimer <= 0) {
            soldier.attackTimer = soldier.attackInterval;
            playSound('sword_clash');
            this.damageEnemy(enemy, soldier.damage, 'physical');
            this.spawnParticles(enemy.x, enemy.y, '#cbd5e1', 3);
          }
          continue;
        }
      }

      // Walk toward rally target if not blocking
      const dx = soldier.targetX - soldier.x;
      const dy = soldier.targetY - soldier.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 3) {
        const move = Math.min(d, BALANCE.soldier.moveSpeed * dt);
        soldier.x += (dx / d) * move;
        soldier.y += (dy / d) * move;
        soldier.facingLeft = dx < 0;
      } else {
        // Look for enemy to block
        for (const enemy of this.enemies) {
          if (!enemy.alive || enemy.flying) continue;
          if (enemy.blockedBySoldierId) continue;
          if (dist(soldier, enemy) < BALANCE.soldier.blockRange) {
            soldier.blockingEnemyId = enemy.id;
            enemy.blockedBySoldierId = soldier.id;
            break;
          }
        }
      }
    }
  }

  // ─── Spell System ───────────────────────────────────────────────

  private updateSpells(dt: number): void {
    // Cooldown timers
    for (const key of Object.keys(this.spellCooldowns)) {
      if (this.spellCooldowns[key] > 0) {
        this.spellCooldowns[key] = Math.max(0, this.spellCooldowns[key] - dt);
      }
    }

    // Update meteors
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      if (!m.active) {
        this.meteors.splice(i, 1);
        continue;
      }
      m.progress += m.speed * dt;
      m.x = m.startX + (m.targetX - m.startX) * m.progress;
      m.y = m.startY + (m.targetY - m.startY) * m.progress;

      // Trail particle
      this.spawnParticles(m.x, m.y, '#f97316', 1);

      if (m.progress >= 1) {
        m.active = false;
        // Impact!
        playSound('meteor_impact');
        this.camera.shake(9, 0.45);
        this.hitStop = 0.07;
        vfx.spawn('explosion', m.targetX, m.targetY, { scale: Math.max(1.4, m.radius / 45) });
        vfx.spawn('shockwave', m.targetX, m.targetY, { scale: m.radius / 48 });
        this.spawnParticles(m.targetX, m.targetY, '#ea580c', 8);
        this.spawnParticles(m.targetX, m.targetY, '#facc15', 5);
        this.applySplashDamage(`meteor:${m.id}`, m.targetX, m.targetY, m.radius, m.damage, 'physical');
        this.meteors.splice(i, 1);
      }
    }
  }

  private castSpell(spellId: 'rain_of_fire' | 'reinforcements', x: number, y: number): void {
    if (spellId === 'rain_of_fire') {
      // Every number comes from data/spells.ts (B0).
      const spell = getSpell('rain_of_fire');
      const count = spell.count ?? 5;
      const radius = spell.radius ?? 80;
      const damage = spell.damage ?? 80;
      const fallTime = spell.delay ?? 0.8;
      const spread = radius * 0.75;

      this.spellCooldowns.rain_of_fire = spell.cooldown;
      playSound('meteor_fall');

      for (let i = 0; i < count; i++) {
        const targetX = x + (Math.random() - 0.5) * spread;
        const targetY = y + (Math.random() - 0.5) * spread;
        const startX = targetX + (Math.random() - 0.5) * spread;
        const startY = -60 - i * 40;
        this.meteors.push({
          id: this.nextMeteorId++,
          x: startX,
          y: startY,
          prevX: startX,
          prevY: startY,
          startX,
          startY,
          targetX,
          targetY,
          progress: 0,
          speed: 1 / Math.max(0.1, fallTime),
          damage,
          radius,
          active: true,
        });
      }
      this.spawnFloatingText(x, y - 30, 'RAIN OF FIRE!', '#ff4400', 16);
    } else if (spellId === 'reinforcements') {
      const spell = getSpell('reinforcements');
      const count = spell.count ?? 2;
      const squad = BALANCE.soldier.reinforcement;
      const lifespan = spell.duration ?? 15;

      this.spellCooldowns.reinforcements = spell.cooldown;
      playSound('reinforce');

      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * BALANCE.soldier.spread;
        const sx = x + offset;
        const sy = y + (Math.random() - 0.5) * 10;
        this.soldiers.push({
          id: this.nextSoldierId++,
          towerId: null,
          x: sx,
          y: sy,
          prevX: sx,
          prevY: sy,
          targetX: sx,
          targetY: sy,
          hp: squad.hp,
          maxHp: squad.hp,
          damage: squad.damage,
          attackTimer: squad.attackInterval * 0.5,
          attackInterval: squad.attackInterval,
          blockingEnemyId: null,
          level: 1,
          type: 'reinforcement',
          alive: true,
          respawnTimer: 0,
          lifespan,
          hitFlash: 0,
        });
        this.spawnParticles(sx, sy, '#60a5fa', 8);
        vfx.spawn('spawnPuff', sx, sy, { color: '#60a5fa' });
      }
      this.spawnFloatingText(x, y - 25, 'REINFORCEMENTS!', '#38bdf8', 14);
    }
  }

  // ─── End Conditions ────────────────────────────────────────────

  private checkEndConditions(): void {
    if (this.lives <= 0) {
      this.screen = 'defeat';
      this.resultStars = 0;
      playSound('defeat');
      stopMusic();
      return;
    }

    if (this.allWavesComplete && this.enemies.every(e => !e.alive)) {
      // Calculate stars
      if (this.livesLost <= STAR_THRESHOLDS.three) {
        this.resultStars = 3;
      } else if (this.livesLost <= STAR_THRESHOLDS.two) {
        this.resultStars = 2;
      } else {
        this.resultStars = 1;
      }

      // Save
      if (this.currentLevel) {
        const prev = this.save.levelStars[this.currentLevel.id] || 0;
        if (this.resultStars > prev) {
          this.save.levelStars[this.currentLevel.id] = this.resultStars;
          this.save.totalStars += this.resultStars - prev;
        } else if (!prev) {
          this.save.levelStars[this.currentLevel.id] = this.resultStars;
          this.save.totalStars += this.resultStars;
        }
        writeSave(this.save);
      }

      this.screen = 'victory';
      this.camera.punch(1.05, 2.2);
      playSound('victory');
      stopMusic();
    }
  }

  // ─── Input Handling ────────────────────────────────────────────

  private handleLevelInput(): void {
    const inp = this.input.getState();
    if (!this.currentLevel) return;

    // ─── Paused: only pause/Esc are accepted (4) ──────
    if (this.paused) {
      if (inp.keysJustPressed.has('escape') ||
          (inp.justClicked && this.hitRect(inp.clickPos, this.pauseBtn))) {
        this.paused = false;
        playSound('button_click');
      }
      return;
    }

    // Keyboard hotkeys [1] [2] [Escape]
    if (inp.keysJustPressed.has('1')) {
      if (this.spellCooldowns.rain_of_fire <= 0) {
        this.activeSpell = this.activeSpell === 'rain_of_fire' ? null : 'rain_of_fire';
        this.radialMenu = null;
      }
    } else if (inp.keysJustPressed.has('2')) {
      if (this.spellCooldowns.reinforcements <= 0) {
        this.activeSpell = this.activeSpell === 'reinforcements' ? null : 'reinforcements';
        this.radialMenu = null;
      }
    } else if (inp.keysJustPressed.has('escape')) {
      this.activeSpell = null;
      this.radialMenu = null;
    }

    if (!inp.justClicked) return;

    const click = inp.clickPos;

    // ─── Tutorial skip (f) ────────────────────────────
    if (this.tutorialStep > 0 && !this.tutorialDismissed) {
      const skip = this.getTutorialSkipRect();
      if (skip && this.hitRect(click, skip)) {
        this.dismissTutorial();
        playSound('button_click');
        return;
      }
    }

    // ─── HUD Buttons ──────────────────────────────────
    // Pause
    if (this.hitRect(click, this.pauseBtn)) {
      this.paused = !this.paused;
      return;
    }
    // Speed
    if (this.hitRect(click, this.speedBtn)) {
      this.gameSpeed = this.gameSpeed === 1 ? 2 : 1;
      return;
    }
    // Call wave early
    if (this.waitingForWave && !this.allWavesComplete) {
      if (this.hitRect(click, this.callWaveBtn)) {
        this.callWaveEarly();
        return;
      }
    }

    // ─── Spell Buttons ────────────────────────────────
    if (this.hitRect(click, this.spellBtnRain)) {
      if (this.spellCooldowns.rain_of_fire <= 0) {
        this.activeSpell = this.activeSpell === 'rain_of_fire' ? null : 'rain_of_fire';
        this.radialMenu = null;
      }
      return;
    }
    if (this.hitRect(click, this.spellBtnReinforce)) {
      if (this.spellCooldowns.reinforcements <= 0) {
        this.activeSpell = this.activeSpell === 'reinforcements' ? null : 'reinforcements';
        this.radialMenu = null;
      }
      return;
    }

    // ─── Cast Active Spell ────────────────────────────
    if (this.activeSpell) {
      this.castSpell(this.activeSpell, click.x, click.y);
      this.activeSpell = null;
      return;
    }

    // ─── Radial Menu ──────────────────────────────────
    if (this.radialMenu) {
      const menu = this.radialMenu;
      const itemCount = menu.items.length;
      let hit = false;

      for (let i = 0; i < itemCount; i++) {
        const itemAngle = (i / itemCount) * Math.PI * 2 - Math.PI / 2;
        const ix = menu.x + Math.cos(itemAngle) * BALANCE.ui.radialItemDistance;
        const iy = menu.y + Math.sin(itemAngle) * BALANCE.ui.radialItemDistance;

        if (pointInCircle(click, { x: ix, y: iy }, BALANCE.ui.radialItemRadius)) {
          hit = true;
          const item = menu.items[i];
          if (!item.enabled) break;

          if (menu.type === 'build') {
            this.buildTower(this.selectedSlot, item.action);
          } else if (menu.type === 'tower' && menu.towerRef) {
            if (item.action === 'sell') {
              this.sellTower(menu.towerRef);
            } else if (item.action === 'upgrade') {
              this.upgradeTower(menu.towerRef);
            } else if (item.action.startsWith('spec_')) {
              const specIdx = parseInt(item.action.split('_')[1]);
              this.specializeTower(menu.towerRef, specIdx);
            }
          }
          break;
        }
      }

      if (!hit) {
        // Clicked outside menu - close it
        this.radialMenu = null;
        this.selectedSlot = -1;
        this.selectedTower = null;
      }
      return;
    }

    // ─── Click on Tower ───────────────────────────────
    for (const tower of this.towers) {
      if (pointInCircle(click, { x: tower.x, y: tower.y }, BALANCE.ui.towerHitRadius)) {
        this.selectedTower = tower;
        this.selectedSlot = -1;
        this.openTowerMenu(tower);
        return;
      }
    }

    // ─── Click on Build Slot ──────────────────────────
    for (let i = 0; i < this.currentLevel.buildSlots.length; i++) {
      const slot = this.currentLevel.buildSlots[i];
      if (pointInCircle(click, slot, BALANCE.ui.slotHitRadius)) {
        // Check if occupied
        if (this.towers.some(t => t.slotIndex === i)) continue;
        this.selectedSlot = i;
        this.selectedTower = null;
        this.openBuildMenu(i);
        return;
      }
    }

    // Click on empty space - deselect
    this.selectedSlot = -1;
    this.selectedTower = null;
  }

  private openBuildMenu(slotIndex: number): void {
    if (!this.currentLevel) return;
    const slot = this.currentLevel.buildSlots[slotIndex];

    const items: RadialMenuItem[] = [
      {
        label: 'Archer',
        icon: TOWERS.archer.icon as IconName,
        cost: TOWERS.archer.levels[0].cost,
        color: TOWERS.archer.color,
        action: 'archer',
        enabled: this.gold >= TOWERS.archer.levels[0].cost,
        description: TOWERS.archer.levels[0].description,
      },
      {
        label: 'Mage',
        icon: TOWERS.mage.icon as IconName,
        cost: TOWERS.mage.levels[0].cost,
        color: TOWERS.mage.color,
        action: 'mage',
        enabled: this.gold >= TOWERS.mage.levels[0].cost,
        description: TOWERS.mage.levels[0].description,
      },
      {
        label: 'Cannon',
        icon: TOWERS.cannon.icon as IconName,
        cost: TOWERS.cannon.levels[0].cost,
        color: TOWERS.cannon.color,
        action: 'cannon',
        enabled: this.gold >= TOWERS.cannon.levels[0].cost,
        description: TOWERS.cannon.levels[0].description,
      },
      {
        label: 'Barracks',
        icon: TOWERS.barracks.icon as IconName,
        cost: TOWERS.barracks.levels[0].cost,
        color: TOWERS.barracks.color,
        action: 'barracks',
        enabled: this.gold >= TOWERS.barracks.levels[0].cost,
        description: TOWERS.barracks.levels[0].description,
      },
    ];

    this.radialMenu = {
      x: slot.x,
      y: slot.y,
      items,
      hoveredIndex: -1,
      type: 'build',
    };
  }

  private openTowerMenu(tower: Tower): void {
    const towerData = TOWERS[tower.dataId];
    const items: RadialMenuItem[] = [];

    if (tower.specId) {
      // Already specialized - can only sell
      const refund = Math.floor(tower.totalInvested * SELL_REFUND_RATE);
      items.push({
        label: `Sell (${refund})`,
        icon: 'sell',
        color: '#e74c3c',
        action: 'sell',
        enabled: true,
      });
    } else if (tower.level < 2) {
      // Can upgrade
      const nextCost = towerData.levels[tower.level + 1].cost;
      items.push({
        label: `Upgrade (${nextCost})`,
        icon: 'upgrade',
        cost: nextCost,
        color: '#27ae60',
        action: 'upgrade',
        enabled: this.gold >= nextCost,
        description: towerData.levels[tower.level + 1].description,
      });
      // Sell
      const refund = Math.floor(tower.totalInvested * SELL_REFUND_RATE);
      items.push({
        label: `Sell (${refund})`,
        icon: 'sell',
        color: '#e74c3c',
        action: 'sell',
        enabled: true,
      });
    } else {
      // Level 3 - offer specializations, each with its own icon
      for (let i = 0; i < 2; i++) {
        const spec = towerData.specializations[i];
        items.push({
          label: spec.specName,
          icon: `spec_${spec.specId}` as IconName,
          cost: spec.cost,
          color: towerData.color,
          action: `spec_${i}`,
          enabled: this.gold >= spec.cost,
          description: spec.special,
        });
      }
      // Sell
      const refund = Math.floor(tower.totalInvested * SELL_REFUND_RATE);
      items.push({
        label: `Sell (${refund})`,
        icon: 'sell',
        color: '#e74c3c',
        action: 'sell',
        enabled: true,
      });
    }

    this.radialMenu = {
      x: tower.x,
      y: tower.y,
      items,
      hoveredIndex: -1,
      type: 'tower',
      towerRef: tower,
    };
  }

  private hitRect(p: Vec2, rect: { x: number; y: number; w: number; h: number }): boolean {
    return p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h;
  }

  // ─── End Screen ────────────────────────────────────────────────

  private updateEndScreen(): void {
    const inp = this.input.getState();
    if (inp.justClicked) {
      // "Continue" button
      const bx = DESIGN_WIDTH / 2 - 80, by = DESIGN_HEIGHT / 2 + 100;
      if (inp.clickPos.x >= bx && inp.clickPos.x <= bx + 160 &&
          inp.clickPos.y >= by && inp.clickPos.y <= by + 45) {
        this.screen = 'worldmap';
      }
      // "Retry" button
      const rx = DESIGN_WIDTH / 2 - 80, ry = DESIGN_HEIGHT / 2 + 155;
      if (inp.clickPos.x >= rx && inp.clickPos.x <= rx + 160 &&
          inp.clickPos.y >= ry && inp.clickPos.y <= ry + 45) {
        if (this.currentLevel) this.startLevel(this.currentLevel);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  private render(): void {
    this.renderer.clear();

    switch (this.screen) {
      case 'menu':
        this.renderMenu();
        break;
      case 'worldmap':
        this.renderWorldMap();
        break;
      case 'level':
        this.renderLevel();
        break;
      case 'victory':
        this.renderLevel(); // Draw game state behind
        this.renderVictory();
        break;
      case 'defeat':
        this.renderLevel();
        this.renderDefeat();
        break;
    }
  }

  // ─── Menu Render ───────────────────────────────────────────────

  private renderMenu(): void {
    this.renderer.drawTitleScreen(this.menuTime, this.input.getState().pointer, isMuted(), this.activeLoreModal);
  }

  // ─── World Map Render ──────────────────────────────────────────

  private renderWorldMap(): void {
    this.renderer.drawWorldMap(
      this.menuTime,
      this.input.getState().pointer,
      LEVELS,
      this.save,
      this.worldMapHovered,
      this.selectedMapLevel,
      isMuted()
    );
  }

  // ─── Level Render ──────────────────────────────────────────────

  private renderLevel(): void {
    if (!this.currentLevel) return;
    const ctx = this.renderer.ctx;
    const r = this.renderer;
    const level = this.currentLevel;
    const pointer = this.input.getState().pointer;

    // A12: camera juice wraps only the world; the HUD stays pinned.
    this.camera.apply(ctx, DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);

    // Background
    r.drawBackground(level.id, level.path);

    // Path (flat ground layer)
    r.drawPath(level.path, level.id);

    // A6: atmosphere drifts behind everything that stands on the ground.
    this.ambient.draw(ctx);

    // Build slots are ground decals: they always sit under the sorted pass.
    for (let i = 0; i < level.buildSlots.length; i++) {
      const slot = level.buildSlots[i];
      const occupied = this.towers.some(t => t.slotIndex === i);
      const hovered = !occupied && pointInCircle(pointer, slot, BALANCE.ui.slotHitRadius);
      const selected = this.selectedSlot === i;
      r.drawBuildSlot(slot.x, slot.y, occupied, hovered, selected);
    }

    // Range circle for selected tower (ground decal).
    if (this.selectedTower) {
      const stats = this.getTowerStats(this.selectedTower);
      r.drawRangeCircle(this.selectedTower.x, this.selectedTower.y, stats.range);
    }

    // A3: everything standing on the ground is painted back-to-front by its
    // own Y, so units behind a tower are correctly hidden by it.
    let n = 0;
    n = this.addWorldItem(n, level.spawnPosition.y, WorldKind.Gate, null);
    n = this.addWorldItem(n, level.basePosition.y, WorldKind.Castle, null);
    for (const dec of this.decorations) n = this.addWorldItem(n, dec.y, WorldKind.Decoration, dec);
    for (const tower of this.towers) n = this.addWorldItem(n, tower.y, WorldKind.Tower, tower);
    for (const soldier of this.soldiers) {
      if (soldier.alive) n = this.addWorldItem(n, soldier.y, WorldKind.Soldier, soldier);
    }
    for (const enemy of this.enemies) {
      if (enemy.alive) n = this.addWorldItem(n, enemy.y, WorldKind.Enemy, enemy);
    }
    this.sortWorldItems(n);

    // Death poses lie flat on the ground, under everything still standing.
    for (const corpse of this.corpses) {
      const t = corpse.age / corpse.maxAge;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t * t);
      corpse.enemy.y += t * 5;
      this.renderEnemy(corpse.enemy);
      ctx.restore();
    }

    for (let i = 0; i < n; i++) {
      const item = this.worldItems[this.worldOrder[i]];
      switch (item.kind) {
        case WorldKind.Decoration:
          this.drawDecoration(item.ref as Decoration, level.id);
          break;
        case WorldKind.Tower:
          this.renderTower(item.ref as Tower);
          break;
        case WorldKind.Soldier:
          this.drawInterpolated(item.ref as Soldier, (view) => drawSoldierDirect(ctx, view, this.menuTime));
          break;
        case WorldKind.Enemy:
          this.drawInterpolated(item.ref as Enemy, (view) => this.renderEnemy(view));
          break;
        case WorldKind.Gate:
          r.drawSpawnGate(level.spawnPosition);
          break;
        case WorldKind.Castle:
          r.drawBase(level.basePosition);
          break;
      }
    }

    // Meteors (Rain of Fire)
    this.renderMeteors();

    // Projectiles
    for (const proj of this.projectilePool.getActive()) {
      if (!proj.active) continue;
      this.drawInterpolated(proj, (view) => this.renderProjectile(view));
    }

    // Particles
    for (const p of this.particlePool.getActive()) {
      if (!p.active) continue;
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Floating text
    for (const ft of this.textPool.getActive()) {
      if (!ft.active) continue;
      const alpha = ft.life / ft.maxLife;
      ctx.globalAlpha = alpha;
      r.drawTextWithShadow(ft.text, ft.x, ft.y, ft.color, ft.size, 'center', 'Inter', true);
    }
    ctx.globalAlpha = 1;

    // A11: the VFX library paints impacts, explosions, smoke and decals.
    vfx.draw(ctx);

    // World drawing is done: drop the camera before any UI element.
    this.camera.reset(ctx);

    // Radial menu
    if (this.radialMenu) {
      this.renderRadialMenu();
    }

    postFx.apply(ctx, this.renderer.canvas, level.id, this.menuTime);

    // Red flash when the bastion is hit.
    if (this.damageFlash > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(190,26,32,${(this.damageFlash * 0.30).toFixed(3)})`;
      ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
      ctx.restore();
    }

    // HUD
    this.renderHUD();

    // Spells HUD & Targeting
    this.renderSpellsHUD();
    this.renderSpellTargeting();

    // A13: hover information, drawn above the HUD.
    this.renderTooltips();

    // Tutorial
    if (this.tutorialStep > 0 && !this.tutorialDismissed) {
      this.renderTutorial();
    }

    // Pause overlay
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
      r.drawTextWithShadow('PAUSED', DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 - 10, '#ffd866', 48, 'center', 'MedievalSharp');
      // The match is genuinely frozen now: only the pause button or Esc resumes.
      r.drawText('Press Esc or click the pause button to resume', DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 + 40, 'rgba(255,255,255,0.7)', 16);
    }
  }

  // ─── Hover tooltips (A13) ──────────────────────────────────────

  /** Enemy under a point, using a radius that scales with the unit. */
  private enemyAt(p: Vec2): Enemy | null {
    let best: Enemy | null = null;
    let bestDist = Infinity;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const r = Math.max(16, enemy.size * 1.8);
      const d = dist(p, enemy);
      if (d <= r && d < bestDist) {
        bestDist = d;
        best = enemy;
      }
    }
    return best;
  }

  /** Effective damage per second of a tower, straight from its data. */
  private towerDps(tower: Tower): number {
    const stats = this.getTowerStats(tower);
    if (tower.dataId === 'barracks') {
      const squad = stats.soldier ?? BALANCE.soldier.fallback;
      return (squad.damage / Math.max(0.01, squad.attackInterval)) * BALANCE.soldier.count;
    }
    const shots = tower.specId === 'rapid_volley' ? 3 : 1;
    return stats.damage * stats.fireRate * shots;
  }

  private renderTooltips(): void {
    const pointer = this.input.getState().pointer;

    const hoveredEnemy = this.enemyAt(pointer);
    if (hoveredEnemy) {
      const r = Math.max(18, hoveredEnemy.size * 1.8);
      const ctx = this.renderer.ctx;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,236,170,0.85)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(hoveredEnemy.x, hoveredEnemy.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      this.drawTooltip(pointer, ENEMIES[hoveredEnemy.dataId]?.name ?? hoveredEnemy.dataId, [
        `HP ${Math.ceil(hoveredEnemy.hp)} / ${hoveredEnemy.maxHp}`,
        `Armor ${Math.round(hoveredEnemy.armor * 100)}%  ·  Resist ${Math.round(hoveredEnemy.magicResist * 100)}%`,
        `Speed ${hoveredEnemy.speed}  ·  ${hoveredEnemy.flying ? 'Flying' : 'Ground'}`,
        `Lives -${hoveredEnemy.livesDamage}  ·  Bounty ${hoveredEnemy.goldReward}g`,
      ]);
      return;
    }

    const hoveredTower = this.towers.find(
      (t) => pointInCircle(pointer, { x: t.x, y: t.y }, BALANCE.ui.towerHitRadius),
    );
    if (hoveredTower) {
      const data = TOWERS[hoveredTower.dataId];
      const stats = this.getTowerStats(hoveredTower);
      const spec = hoveredTower.specId
        ? data.specializations.find((s) => s.specId === hoveredTower.specId)
        : null;
      this.drawTooltip(pointer, spec ? spec.specName : stats.name, [
        `DPS ${this.towerDps(hoveredTower).toFixed(1)}  ·  Range ${Math.round(stats.range)}`,
        `${stats.damageType === 'magic' ? 'Magic' : 'Physical'} damage` +
          (stats.splashRadius ? `  ·  Splash ${Math.round(stats.splashRadius)}` : ''),
        `Invested ${hoveredTower.totalInvested}g  ·  Sell ${Math.floor(hoveredTower.totalInvested * SELL_REFUND_RATE)}g`,
        hoveredTower.stunTimer > 0 ? 'STUNNED' : `Priority: ${data.targetPriority}`,
      ]);
    }
  }

  private drawTooltip(pointer: Vec2, title: string, lines: string[]): void {
    const r = this.renderer;
    const ctx = this.renderer.ctx;
    const width = 232;
    const height = 26 + lines.length * 15 + 8;

    // Flip the panel so it never leaves the play area.
    let x = pointer.x + 18;
    let y = pointer.y + 18;
    if (x + width > DESIGN_WIDTH - 8) x = pointer.x - width - 18;
    if (y + height > DESIGN_HEIGHT - 8) y = pointer.y - height - 18;
    x = Math.max(8, Math.min(x, DESIGN_WIDTH - width - 8));
    y = Math.max(8, Math.min(y, DESIGN_HEIGHT - height - 8));

    ctx.save();
    r.drawPanel(x, y, width, height, 0.94);
    ctx.strokeStyle = 'rgba(240,200,110,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1.5, y + 1.5, width - 3, height - 3);

    r.drawText(title, x + 10, y + 15, '#ffd866', 13, 'left', 'MedievalSharp', true);
    lines.forEach((line, i) => {
      r.drawText(line, x + 10, y + 32 + i * 15, 'rgba(240,232,214,0.92)', 12, 'left', 'Inter');
    });
    ctx.restore();
  }

  // ─── Depth-sorted world pass (A3) ──────────────────────────────

  private addWorldItem(index: number, y: number, kind: WorldKind, ref: unknown): number {
    let item = this.worldItems[index];
    if (!item) {
      item = { y: 0, kind: WorldKind.Decoration, ref: null };
      this.worldItems[index] = item;
    }
    item.y = y;
    item.kind = kind;
    item.ref = ref;
    return index + 1;
  }

  private sortWorldItems(count: number): void {
    const order = this.worldOrder;
    order.length = 0;
    for (let i = 0; i < count; i++) order.push(i);
    const items = this.worldItems;
    order.sort((a, b) => items[a].y - items[b].y);
  }

  private drawDecoration(dec: Decoration, levelId: string): void {
    const r = this.renderer;
    switch (dec.type) {
      case 'tree': r.drawTree(dec.x, dec.y, dec.size, levelId, dec.variant); break;
      case 'rock': r.drawRock(dec.x, dec.y, dec.size, levelId, dec.variant); break;
      case 'bush': r.drawBush(dec.x, dec.y, dec.size, levelId, dec.variant); break;
      case 'mushroom': r.drawMushroom(dec.x, dec.y, dec.size, levelId); break;
      case 'stump': r.drawStump(dec.x, dec.y, dec.size, levelId); break;
      case 'bones': r.drawBones(dec.x, dec.y, dec.size); break;
      case 'sign': r.drawSign(dec.x, dec.y, dec.size, levelId); break;
    }
  }

  private renderMeteors(): void {
    const ctx = this.renderer.ctx;
    for (const m of this.meteors) {
      if (!m.active) continue;

      this.drawInterpolated(m, (view) => {
        ctx.save();
        const grad = ctx.createRadialGradient(view.x, view.y, 2, view.x, view.y, 14);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, '#ffcc00');
        grad.addColorStop(0.7, '#ea580c');
        grad.addColorStop(1, 'rgba(220, 38, 38, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(view.x, view.y, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.arc(view.x, view.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }
  }

  private renderSpellsHUD(): void {
    const ctx = this.renderer.ctx;
    const r = this.renderer;
    const pointer = this.input.getState().pointer;

    const spellsConfig = [
      {
        id: 'rain_of_fire' as const,
        btn: this.spellBtnRain,
        icon: getSpell('rain_of_fire').icon,
        name: getSpell('rain_of_fire').name,
        hotkey: '1',
        totalCd: getSpell('rain_of_fire').cooldown,
      },
      {
        id: 'reinforcements' as const,
        btn: this.spellBtnReinforce,
        icon: getSpell('reinforcements').icon,
        name: getSpell('reinforcements').name,
        hotkey: '2',
        totalCd: getSpell('reinforcements').cooldown,
      },
    ];

    for (const s of spellsConfig) {
      const cd = this.spellCooldowns[s.id] || 0;
      const isReady = cd <= 0;
      const isActive = this.activeSpell === s.id;
      const isHovered = this.hitRect(pointer, s.btn);

      const cx = s.btn.x + s.btn.w / 2;
      const cy = s.btn.y + s.btn.h / 2;
      const radius = s.btn.w / 2;

      ctx.save();

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.arc(cx, cy + 3, radius, 0, Math.PI * 2);
      ctx.fill();

      // Button background
      const grad = ctx.createLinearGradient(cx, s.btn.y, cx, s.btn.y + s.btn.h);
      if (isActive) {
        grad.addColorStop(0, '#f59e0b');
        grad.addColorStop(1, '#b45309');
      } else if (isReady) {
        grad.addColorStop(0, isHovered ? '#475569' : '#334155');
        grad.addColorStop(1, isHovered ? '#1e293b' : '#0f172a');
      } else {
        grad.addColorStop(0, '#1c1917');
        grad.addColorStop(1, '#0c0a09');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Ornate metallic border
      ctx.strokeStyle = isActive ? '#ffd700' : (isReady ? '#ca8a04' : '#57534e');
      ctx.lineWidth = isActive ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
      ctx.stroke();

      // Active pulse ring
      if (isActive) {
        const pulse = Math.sin(this.menuTime * 8) * 3 + 2;
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + pulse, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Spell icon (vector, A15)
      drawIcon(ctx, s.icon as IconName, cx, cy + 1, 26, isReady ? 1 : 0.55);

      // Cooldown sweep overlay
      if (!isReady) {
        const progress = cd / s.totalCd;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress, false);
        ctx.closePath();
        ctx.fill();

        r.drawTextWithShadow(`${Math.ceil(cd)}s`, cx, cy + 1, '#ffffff', 13, 'center', 'Inter', true);
      }

      // Hotkey badge
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(s.btn.x + 8, s.btn.y + 8, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 9px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.hotkey, s.btn.x + 8, s.btn.y + 8);

      ctx.restore();
    }
  }

  private renderSpellTargeting(): void {
    if (!this.activeSpell) return;
    const r = this.renderer;
    const pointer = this.input.getState().pointer;

    const radius = this.activeSpell === 'rain_of_fire'
      ? (getSpell('rain_of_fire').radius ?? 80)
      : (getSpell('reinforcements').radius ?? 40);
    const pulse = Math.sin(this.menuTime * 6) * 3;

    // Outer targeting circle
    r.drawRangeCircle(pointer.x, pointer.y, radius + pulse);

    // Crosshair lines
    const ctx = this.renderer.ctx;
    ctx.save();
    ctx.strokeStyle = this.activeSpell === 'rain_of_fire' ? 'rgba(239, 68, 68, 0.7)' : 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pointer.x - radius, pointer.y);
    ctx.lineTo(pointer.x + radius, pointer.y);
    ctx.moveTo(pointer.x, pointer.y - radius);
    ctx.lineTo(pointer.x, pointer.y + radius);
    ctx.stroke();

    // Vector icon instead of an emoji prefix (A15).
    const icon: IconName = this.activeSpell === 'rain_of_fire' ? 'spell_rain_of_fire' : 'spell_reinforcements';
    drawIcon(ctx, icon, pointer.x, pointer.y - radius - 22, 24);

    r.drawTextWithShadow(
      this.activeSpell === 'rain_of_fire' ? 'Click to Rain Fire!' : 'Click to Deploy Soldiers!',
      pointer.x,
      pointer.y - radius - 15,
      '#ffd700',
      13,
      'center',
      'MedievalSharp',
      true,
    );
    ctx.restore();
  }

  private renderTower(tower: Tower): void {
    drawTowerDirect(this.renderer.ctx, tower);
  }

  private renderEnemy(enemy: Enemy): void {
    drawEnemyDirect(this.renderer.ctx, enemy, this.menuTime);
  }

  private renderProjectile(proj: Projectile): void {
    drawProjectileDirect(this.renderer.ctx, proj);
  }

  private renderRadialMenu(): void {
    if (!this.radialMenu) return;
    const ctx = this.renderer.ctx;
    const r = this.renderer;
    const menu = this.radialMenu;
    const pointer = this.input.getState().pointer;

    // Dim background slightly around menu
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(menu.x, menu.y, 90, 0, Math.PI * 2);
    ctx.fill();

    const itemCount = menu.items.length;
    menu.hoveredIndex = -1;

    for (let i = 0; i < itemCount; i++) {
      const itemAngle = (i / itemCount) * Math.PI * 2 - Math.PI / 2;
      const ix = menu.x + Math.cos(itemAngle) * 50;
      const iy = menu.y + Math.sin(itemAngle) * 50;
      const item = menu.items[i];
      const hovered = pointInCircle(pointer, { x: ix, y: iy }, 24);
      if (hovered) menu.hoveredIndex = i;

      // Button circle
      ctx.fillStyle = !item.enabled ? 'rgba(80,80,80,0.8)' : (hovered ? lighten(item.color, 0.3) : item.color);
      ctx.beginPath();
      ctx.arc(ix, iy, 22, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = !item.enabled ? 'rgba(100,100,100,0.5)' : (hovered ? '#ffd700' : 'rgba(255,255,255,0.3)');
      ctx.lineWidth = hovered ? 3 : 2;
      ctx.beginPath();
      ctx.arc(ix, iy, 22, 0, Math.PI * 2);
      ctx.stroke();

      // Icon (vector, A15)
      drawIcon(ctx, item.icon, ix, iy - 3, 22, item.enabled ? 1 : 0.55);

      // Cost label
      if (item.cost !== undefined) {
        ctx.fillStyle = item.enabled ? '#ffd700' : '#888';
        ctx.font = 'bold 10px Inter';
        ctx.fillText(`${item.cost}`, ix, iy + 12);
      }

      // Label below
      ctx.fillStyle = !item.enabled ? '#666' : '#fff';
      ctx.font = '10px Inter';
      ctx.fillText(item.label, ix, iy + 30);

      // Grey out line
      if (!item.enabled) {
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#f44336';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ix - 16, iy - 16);
        ctx.lineTo(ix + 16, iy + 16);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // Tooltip for hovered item
    if (menu.hoveredIndex >= 0) {
      const item = menu.items[menu.hoveredIndex];
      if (item.description) {
        const tx = menu.x;
        const ty = menu.y - 80;
        r.drawPanel(tx - 80, ty - 14, 160, 28);
        r.drawText(item.description, tx, ty, '#f0e6d2', 11);
      }
    }
  }

  // ─── HUD ───────────────────────────────────────────────────────

  private renderHUD(): void {
    const pointer = this.input.getState().pointer;
    const currentEarlyBonus = this.currentWaveIndex < this.waves.length
      ? (this.waves[this.currentWaveIndex].earlyCallBonus || 15)
      : 0;

    const ctx = this.renderer.ctx;

    // A13: the counter eases towards the real value, and a lost life makes
    // the whole HUD jolt.
    ctx.save();
    if (this.hudShake > 0.01) {
      const amp = this.hudShake * 5;
      ctx.translate((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp);
    }

    this.renderer.drawTopHUD(
      Math.round(this.displayGold),
      this.lives,
      this.maxLives,
      this.currentWaveIndex,
      this.waves.length,
      this.paused,
      this.gameSpeed,
      this.waitingForWave,
      this.waveTimer,
      currentEarlyBonus,
      pointer,
      this.menuTime
    );

    ctx.restore();

    // Coins fly in screen space, on top of the bar.
    this.drawGoldCoins(ctx);
  }

  // ─── Tutorial ──────────────────────────────────────────────────

  /** Where the current tutorial hint points, shared by render and input. */
  private getTutorialTarget(): { text: string; x: number; y: number } | null {
    let text = '';
    let targetX = DESIGN_WIDTH / 2;
    let targetY = DESIGN_HEIGHT / 2;

    switch (this.tutorialStep) {
      case 1:
        text = 'Click a build slot (+) to place a tower!';
        if (this.currentLevel && this.currentLevel.buildSlots.length > 0) {
          targetX = this.currentLevel.buildSlots[0].x;
          targetY = this.currentLevel.buildSlots[0].y - 50;
        }
        break;
      case 2:
        text = 'Click your tower to upgrade it!';
        if (this.towers.length > 0) {
          targetX = this.towers[0].x;
          targetY = this.towers[0].y - 50;
        }
        break;
      case 3:
        text = 'Click "Call Wave" for bonus gold!';
        targetX = DESIGN_WIDTH / 2;
        targetY = DESIGN_HEIGHT - 100;
        break;
      default:
        return null;
    }

    return { text, x: targetX, y: targetY };
  }

  /** Hit rect of the tutorial's skip control (f). */
  private getTutorialSkipRect(): { x: number; y: number; w: number; h: number } | null {
    const target = this.getTutorialTarget();
    if (!target) return null;
    return { x: target.x - 58, y: target.y + 20, w: 116, h: 22 };
  }

  /** Permanently stop showing the tutorial and remember it. */
  private dismissTutorial(): void {
    this.tutorialDismissed = true;
    this.tutorialStep = 0;
    this.save.tutorialDismissed = true;
    writeSave(this.save);
  }

  private renderTutorial(): void {
    const r = this.renderer;
    const target = this.getTutorialTarget();
    if (!target) return;

    const { text, x: targetX, y: targetY } = target;

    // Pulsing highlight
    const pulse = Math.sin(this.menuTime * 4) * 0.15 + 0.85;
    r.drawPanel(targetX - 170, targetY - 18, 340, 36, 0.9 * pulse);
    r.drawText(text, targetX, targetY, '#ffd866', 14, 'center', 'Inter', true);

    // Skip control — a real button now instead of a dead hint (f).
    const skip = this.getTutorialSkipRect();
    if (skip) {
      const pointer = this.input.getState().pointer;
      const hovered = this.hitRect(pointer, skip);
      r.drawButton(skip.x, skip.y, skip.w, skip.h, 'Skip tutorial', hovered);
    }
  }

  // ─── Victory/Defeat ────────────────────────────────────────────

  private renderVictory(): void {
    const ctx = this.renderer.ctx;
    const r = this.renderer;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    r.drawPanel(DESIGN_WIDTH / 2 - 200, DESIGN_HEIGHT / 2 - 120, 400, 300);

    r.drawTextWithShadow('VICTORY!', DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 - 80, '#ffd866', 40, 'center', 'MedievalSharp');

    // Stars
    for (let i = 0; i < 3; i++) {
      r.drawStar(DESIGN_WIDTH / 2 - 40 + i * 40, DESIGN_HEIGHT / 2 - 20, 18, i < this.resultStars);
    }

    r.drawText(`Lives remaining: ${this.lives}/${this.maxLives}`, DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 + 20, '#f0e6d2', 16);
    r.drawText(`Lives lost: ${this.livesLost}`, DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 + 45, '#ccc', 13);

    // Buttons
    const pointer = this.input.getState().pointer;
    const continueHover = this.hitRect(pointer, { x: DESIGN_WIDTH / 2 - 80, y: DESIGN_HEIGHT / 2 + 100, w: 160, h: 45 });
    r.drawButton(DESIGN_WIDTH / 2 - 80, DESIGN_HEIGHT / 2 + 100, 160, 45, 'Continue', continueHover);

    const retryHover = this.hitRect(pointer, { x: DESIGN_WIDTH / 2 - 80, y: DESIGN_HEIGHT / 2 + 155, w: 160, h: 45 });
    r.drawButton(DESIGN_WIDTH / 2 - 80, DESIGN_HEIGHT / 2 + 155, 160, 45, 'Retry', retryHover);
  }

  private renderDefeat(): void {
    const ctx = this.renderer.ctx;
    const r = this.renderer;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    r.drawPanel(DESIGN_WIDTH / 2 - 200, DESIGN_HEIGHT / 2 - 100, 400, 260);

    r.drawTextWithShadow('DEFEAT', DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 - 60, '#e74c3c', 40, 'center', 'MedievalSharp');
    r.drawText('The kingdom has fallen...', DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 - 10, '#ccc', 16);
    r.drawText(`Reached wave ${this.currentWaveIndex + 1}/${this.waves.length}`, DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 + 20, '#aaa', 14);

    const pointer = this.input.getState().pointer;
    const continueHover = this.hitRect(pointer, { x: DESIGN_WIDTH / 2 - 80, y: DESIGN_HEIGHT / 2 + 100, w: 160, h: 45 });
    r.drawButton(DESIGN_WIDTH / 2 - 80, DESIGN_HEIGHT / 2 + 100, 160, 45, 'World Map', continueHover);

    const retryHover = this.hitRect(pointer, { x: DESIGN_WIDTH / 2 - 80, y: DESIGN_HEIGHT / 2 + 155, w: 160, h: 45 });
    r.drawButton(DESIGN_WIDTH / 2 - 80, DESIGN_HEIGHT / 2 + 155, 160, 45, 'Retry', retryHover);
  }

  // ─── Color Helpers ─────────────────────────────────────────────
  // adjustColor/darken/lighten now live in core/color.ts (single source).
}
