// ─── Shared Types ────────────────────────────────────────────────
export interface Vec2 {
  x: number;
  y: number;
}

export type DamageType = 'physical' | 'magic';
export type TargetPriority = 'first' | 'strongest' | 'closest';

// ─── Tower Data ──────────────────────────────────────────────────
export interface TowerLevelData {
  damage: number;
  fireRate: number; // shots per second
  range: number; // pixels at design resolution
  cost: number;
  damageType: DamageType;
  splashRadius?: number; // only cannon
  projectileSpeed: number;
  name: string;
  description: string;
}

export interface SpecializationData extends TowerLevelData {
  specId: string;
  specName: string;
  special?: string; // description of special ability
}

export interface TowerData {
  id: string;
  name: string;
  icon: string; // fallback icon character
  color: string;
  levels: [TowerLevelData, TowerLevelData, TowerLevelData]; // levels 1-3
  specializations: [SpecializationData, SpecializationData];
  targetPriority: TargetPriority;
  canHitFlying: boolean;
}

// ─── Enemy Data ──────────────────────────────────────────────────
export interface EnemyData {
  id: string;
  name: string;
  hp: number;
  speed: number; // pixels per second at design resolution
  armor: number; // 0-1, reduces physical damage
  magicResist: number; // 0-1, reduces magic damage
  livesDamage: number;
  goldReward: number;
  flying: boolean;
  color: string;
  size: number; // radius
  abilities?: {
    heal?: { range: number; amount: number; interval: number };
    regen?: { amount: number; interval: number };
    summon?: { enemyId: string; count: number; interval: number };
    stun?: { range: number; duration: number; interval: number };
  };
}

// ─── Wave Data ───────────────────────────────────────────────────
export interface WaveGroup {
  enemyId: string;
  count: number;
  spawnInterval: number; // seconds between spawns
  delay: number; // seconds delay before this group starts
}

export interface WaveData {
  groups: WaveGroup[];
  earlyCallBonus: number; // gold bonus for calling wave early
}

// ─── Level Data ──────────────────────────────────────────────────
export interface BuildSlot {
  x: number;
  y: number;
}

export interface LevelData {
  id: string;
  name: string;
  startingGold: number;
  startingLives: number;
  path: Vec2[]; // waypoints
  buildSlots: BuildSlot[];
  waves: WaveData[];
  basePosition: Vec2; // where the base/castle is
  spawnPosition: Vec2; // where enemies appear
}

// ─── Spell Data ──────────────────────────────────────────────────
export interface SpellData {
  id: string;
  name: string;
  icon: string;
  cooldown: number; // seconds
  damage?: number;
  radius?: number;
  delay?: number; // for rain of fire
  duration?: number;
  description: string;
}

// ─── Upgrade Tree ────────────────────────────────────────────────
export interface UpgradeNode {
  id: string;
  name: string;
  description: string;
  cost: number; // stars needed
  maxLevel: number;
  effect: { type: string; value: number };
}

// ─── Game State ──────────────────────────────────────────────────
export type GameScreen = 'menu' | 'worldmap' | 'level' | 'victory' | 'defeat';
export type GameSpeed = 1 | 2;

export interface SaveData {
  levelStars: Record<string, number>; // levelId -> stars
  upgrades: Record<string, number>; // upgradeId -> level
  totalStars: number;
  endlessBestWave: number;
  settings: {
    muted: boolean;
  };
}

// ─── Constants ───────────────────────────────────────────────────
export const DESIGN_WIDTH = 1280;
export const DESIGN_HEIGHT = 720;
export const FIXED_DT = 1 / 60; // 60 fps fixed timestep
export const SELL_REFUND_RATE = 0.7;
export const STAR_THRESHOLDS = { three: 2, two: 8 }; // max lives lost for star rating
