// ─── Balance & Feel ──────────────────────────────────────────────
// Single source of truth for every tunable global number that used to be
// a literal buried inside src/core/game.ts (B0).
//
// Per-entity numbers live in their own data files:
//   towers.ts  → damage, fire rate, range, cost, splash, soldier stats
//   enemies.ts → hp, speed, armor, resist, rewards, abilities
//   spells.ts  → damage, radius, delay, cooldown, duration, count
//   levels.ts  → gold, lives, path, build slots, waves
// Global rules that tie those together live here.

export const BALANCE = {
  wave: {
    /** Seconds of calm before the first wave of a level starts. */
    firstWaveDelay: 5,
    /** Seconds between waves when the player does not call early. */
    timeBetweenWaves: 15,
  },

  enemy: {
    /** Random perpendicular offset (design px) applied to a walker's lane. */
    laneOffset: 6,
    /** Horizontal spacing between summoned minions. */
    summonSpread: 18,
    /** Melee exchange between a blocked enemy and the soldier blocking it. */
    melee: {
      minDamage: 5,
      /** damage = max(minDamage, maxHp * maxHpRatio) */
      maxHpRatio: 0.08,
      interval: 0.8,
    },
  },

  soldier: {
    /** Soldiers maintained by a single barracks. */
    count: 2,
    /** Seconds before a fallen soldier respawns at its tower. */
    respawnTime: 10,
    moveSpeed: 55,
    /** Acquire a blockable enemy inside this radius (design px). */
    blockRange: 28,
    /** Release a block when the enemy gets further than this. */
    breakRange: 35,
    /** Offset of the two default soldiers around the rally point. */
    spread: 14,
    /** Used only if a barracks entry is missing its `soldier` block. */
    fallback: { hp: 70, damage: 5, attackInterval: 1.0 },
    /** Temporary units summoned by the Reinforcements spell. */
    reinforcement: {
      hp: 60,
      damage: 8,
      attackInterval: 0.9,
    },
  },

  tower: {
    /** Retry delay when a ready tower has no target in range. */
    retryDelay: 0.1,
    /** Seconds the attack animation flag stays set. */
    attackAnimDuration: 0.15,
    /** Angle interpolation speed for a turret turning to its target (rad/s). */
    aimTurnSpeed: 6,
  },

  projectile: {
    /** Search radius for a new target when the locked one dies. */
    retargetRadius: 120,
    /** Max trail points kept for rendering. */
    trailLength: 6,
  },

  splash: {
    /** Damage multiplier applied at the very edge of a blast (B3). */
    edgeFalloff: 0.4,
    /** Minimum seconds between two blasts from the same source hitting one enemy. */
    sameSourceCooldown: 0.1,
  },

  vfx: {
    particleGravity: 80,
    particleSpeedMin: 30,
    particleSpeedMax: 90,
    particleLifeMin: 0.4,
    particleLifeMax: 0.8,
    particleSizeMin: 2,
    particleSizeMax: 5,
    floatingTextLife: 1.2,
    floatingTextRise: 30,
  },

  pools: {
    projectileInitial: 100,
    projectileMax: 400,
    textInitial: 40,
    textMax: 60,
    particleInitial: 200,
    particleMax: 600,
  },

  /** Map decoration scatter, used by Game.generateDecorations. */
  decorations: {
    count: 35,
    minX: 30,
    minY: 30,
    pathClearance: 55,
    slotClearance: 40,
    maxAttempts: 20,
    /** Weighted prop table — all decoration types are reachable (A5). */
    props: [
      { type: 'tree', weight: 34, sizeMin: 34, sizeMax: 56, variants: 4 },
      { type: 'rock', weight: 14, sizeMin: 14, sizeMax: 26, variants: 3 },
      { type: 'bush', weight: 18, sizeMin: 20, sizeMax: 34, variants: 3 },
      { type: 'mushroom', weight: 10, sizeMin: 12, sizeMax: 20, variants: 1 },
      { type: 'stump', weight: 10, sizeMin: 16, sizeMax: 26, variants: 1 },
      { type: 'bones', weight: 8, sizeMin: 16, sizeMax: 26, variants: 1 },
      { type: 'sign', weight: 2, sizeMin: 22, sizeMax: 30, variants: 1 },
    ],
  },

  ui: {
    /** Click radius (design px) for towers, build slots and radial items. */
    towerHitRadius: 22,
    slotHitRadius: 22,
    radialItemRadius: 24,
    radialItemDistance: 50,
  },

  tutorial: {
    /** Tutorial steps shown on the first level. */
    steps: 3,
  },
} as const;

export type Balance = typeof BALANCE;
