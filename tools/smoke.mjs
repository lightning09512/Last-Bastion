// tools/domStub.ts
function makeGradient() {
  return { addColorStop() {
  } };
}
function makeCtx(canvas) {
  const target = {
    canvas,
    createLinearGradient: () => makeGradient(),
    createRadialGradient: () => makeGradient(),
    createPattern: () => null,
    measureText: () => ({ width: 10 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    putImageData() {
    },
    save() {
    },
    restore() {
    },
    beginPath() {
    },
    closePath() {
    },
    setTransform() {
    },
    transform() {
    },
    resetTransform() {
    },
    translate() {
    },
    scale() {
    },
    rotate() {
    },
    clearRect() {
    },
    fillRect() {
    },
    strokeRect() {
    },
    fill() {
    },
    stroke() {
    },
    clip() {
    },
    arc() {
    },
    arcTo() {
    },
    ellipse() {
    },
    rect() {
    },
    moveTo() {
    },
    lineTo() {
    },
    quadraticCurveTo() {
    },
    bezierCurveTo() {
    },
    fillText() {
    },
    strokeText() {
    },
    setLineDash() {
    },
    getLineDash: () => [],
    drawImage() {
    },
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    fillStyle: "#000",
    strokeStyle: "#000",
    lineWidth: 1,
    font: "10px sans-serif",
    textAlign: "left",
    textBaseline: "alphabetic",
    shadowBlur: 0,
    shadowColor: "#000"
  };
  return new Proxy(target, {
    get(t, p) {
      if (p in t) return t[p];
      return () => {
      };
    },
    set(t, p, v) {
      t[p] = v;
      return true;
    }
  });
}
function makeCanvas() {
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720 }),
    addEventListener() {
    },
    removeEventListener() {
    }
  };
  const ctx = makeCtx(canvas);
  return canvas;
}
function installDomStub() {
  const store = /* @__PURE__ */ new Map();
  const win = {
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    addEventListener() {
    },
    removeEventListener() {
    },
    setInterval: () => 0,
    clearInterval() {
    },
    requestAnimationFrame: () => 0
  };
  const globals = globalThis;
  globals.window = win;
  globals.document = {
    createElement: (tag) => tag === "canvas" ? makeCanvas() : { style: {} },
    getElementById: () => makeCanvas(),
    addEventListener() {
    }
  };
  globals.localStorage = {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => {
      store.set(k, v);
    },
    removeItem: (k) => {
      store.delete(k);
    }
  };
  globals.requestAnimationFrame = () => 0;
  globals.cancelAnimationFrame = () => {
  };
  globals.devicePixelRatio = 1;
}
installDomStub();

// src/data/types.ts
var DESIGN_WIDTH = 1280;
var DESIGN_HEIGHT = 720;
var FIXED_DT = 1 / 60;
var SELL_REFUND_RATE = 0.7;
var STAR_THRESHOLDS = { three: 2, two: 8 };

// src/data/towers.ts
var TOWERS = {
  archer: {
    id: "archer",
    name: "Archer Tower",
    icon: "\u{1F3F9}",
    color: "#4CAF50",
    canHitFlying: true,
    targetPriority: "first",
    levels: [
      {
        name: "Archer Tower I",
        description: "Basic archers with quick reflexes.",
        damage: 8,
        fireRate: 1.2,
        range: 180,
        cost: 70,
        damageType: "physical",
        projectileSpeed: 500
      },
      {
        name: "Archer Tower II",
        description: "Veteran archers with improved bows.",
        damage: 14,
        fireRate: 1.4,
        range: 200,
        cost: 110,
        damageType: "physical",
        projectileSpeed: 550
      },
      {
        name: "Archer Tower III",
        description: "Elite marksmen with deadly accuracy.",
        damage: 22,
        fireRate: 1.6,
        range: 220,
        cost: 160,
        damageType: "physical",
        projectileSpeed: 600
      }
    ],
    specializations: [
      {
        specId: "sharpshooter",
        specName: "Sharpshooter",
        name: "Sharpshooter",
        description: "Deadly accurate shots with critical damage.",
        special: "25% chance for 3x critical damage",
        damage: 45,
        fireRate: 0.8,
        range: 260,
        cost: 230,
        damageType: "physical",
        projectileSpeed: 700
      },
      {
        specId: "rapid_volley",
        specName: "Rapid Volley",
        name: "Rapid Volley",
        description: "Fires a barrage of arrows.",
        special: "Fires 3 arrows per shot",
        damage: 12,
        fireRate: 2.5,
        range: 200,
        cost: 230,
        damageType: "physical",
        projectileSpeed: 480
      }
    ]
  },
  mage: {
    id: "mage",
    name: "Mage Tower",
    icon: "\u{1F52E}",
    color: "#9C27B0",
    canHitFlying: true,
    targetPriority: "strongest",
    levels: [
      {
        name: "Mage Tower I",
        description: "Apprentice mage with basic spells.",
        damage: 18,
        fireRate: 0.6,
        range: 160,
        cost: 100,
        damageType: "magic",
        projectileSpeed: 350
      },
      {
        name: "Mage Tower II",
        description: "Adept mage with stronger magic.",
        damage: 36,
        fireRate: 0.7,
        range: 175,
        cost: 160,
        damageType: "magic",
        projectileSpeed: 380
      },
      {
        name: "Mage Tower III",
        description: "Master wizard of the arcane arts.",
        damage: 56,
        fireRate: 0.8,
        range: 190,
        cost: 240,
        damageType: "magic",
        projectileSpeed: 400
      }
    ],
    specializations: [
      {
        specId: "arcane_blast",
        specName: "Arcane Blast",
        name: "Arcane Blaster",
        description: "Devastating arcane explosions.",
        special: "Splash magic damage in small area",
        damage: 90,
        fireRate: 0.6,
        range: 190,
        cost: 300,
        damageType: "magic",
        projectileSpeed: 420,
        splashRadius: 50
      },
      {
        specId: "slow_hex",
        specName: "Slow Hex",
        name: "Hex Mage",
        description: "Curses enemies, slowing them down.",
        special: "Slows enemies by 40% for 3 seconds",
        damage: 40,
        fireRate: 0.9,
        range: 200,
        cost: 300,
        damageType: "magic",
        projectileSpeed: 380
      }
    ]
  },
  cannon: {
    id: "cannon",
    name: "Cannon Tower",
    icon: "\u{1F4A3}",
    color: "#FF5722",
    canHitFlying: false,
    targetPriority: "closest",
    levels: [
      {
        name: "Cannon Tower I",
        description: "Basic cannon with explosive shells.",
        damage: 20,
        fireRate: 0.5,
        range: 140,
        cost: 125,
        damageType: "physical",
        projectileSpeed: 280,
        splashRadius: 45
      },
      {
        name: "Cannon Tower II",
        description: "Improved cannons with bigger blasts.",
        damage: 40,
        fireRate: 0.55,
        range: 155,
        cost: 190,
        damageType: "physical",
        projectileSpeed: 300,
        splashRadius: 55
      },
      {
        name: "Cannon Tower III",
        description: "Siege-grade artillery.",
        damage: 65,
        fireRate: 0.6,
        range: 170,
        cost: 280,
        damageType: "physical",
        projectileSpeed: 320,
        splashRadius: 65
      }
    ],
    specializations: [
      {
        specId: "heavy_bombard",
        specName: "Heavy Bombard",
        name: "Heavy Bombard",
        description: "Massive explosions devastate large areas.",
        special: "Huge splash radius",
        damage: 100,
        fireRate: 0.4,
        range: 180,
        cost: 350,
        damageType: "physical",
        projectileSpeed: 300,
        splashRadius: 100
      },
      {
        specId: "cluster_bombs",
        specName: "Cluster Bombs",
        name: "Cluster Bomber",
        description: "Launches cluster munitions that scatter.",
        special: "Spawns 4 mini-explosions on impact",
        damage: 50,
        fireRate: 0.55,
        range: 170,
        cost: 350,
        damageType: "physical",
        projectileSpeed: 320,
        splashRadius: 35
      }
    ]
  },
  barracks: {
    id: "barracks",
    name: "Barracks",
    icon: "\u2694",
    color: "#2196F3",
    canHitFlying: false,
    targetPriority: "first",
    levels: [
      {
        name: "Barracks I",
        description: "Militia footmen guard the path.",
        damage: 5,
        fireRate: 1,
        range: 120,
        cost: 70,
        damageType: "physical",
        projectileSpeed: 0,
        // melee
        soldier: { hp: 70, damage: 5, attackInterval: 1 }
      },
      {
        name: "Barracks II",
        description: "Trained soldiers with better gear.",
        damage: 10,
        fireRate: 1.1,
        range: 130,
        cost: 110,
        damageType: "physical",
        projectileSpeed: 0,
        soldier: { hp: 105, damage: 10, attackInterval: 0.909 }
      },
      {
        name: "Barracks III",
        description: "Elite warriors of the kingdom.",
        damage: 18,
        fireRate: 1.2,
        range: 140,
        cost: 160,
        damageType: "physical",
        projectileSpeed: 0,
        soldier: { hp: 140, damage: 18, attackInterval: 0.833 }
      }
    ],
    specializations: [
      {
        specId: "knights",
        specName: "Knights",
        name: "Holy Knights",
        description: "Heavily armored knights that can take a beating.",
        special: "Double HP, slight heal over time",
        damage: 20,
        fireRate: 1,
        range: 150,
        cost: 230,
        damageType: "physical",
        projectileSpeed: 0,
        soldier: { hp: 180, damage: 20, attackInterval: 1 }
      },
      {
        specId: "rangers",
        specName: "Rangers",
        name: "Ranger Lancers",
        description: "Fast and deadly lancers.",
        special: "Higher damage, faster attack speed",
        damage: 35,
        fireRate: 1.5,
        range: 150,
        cost: 230,
        damageType: "physical",
        projectileSpeed: 0,
        soldier: { hp: 140, damage: 35, attackInterval: 0.667 }
      }
    ]
  }
};

// src/data/enemies.ts
var ENEMIES = {
  goblin: {
    id: "goblin",
    name: "Goblin",
    hp: 40,
    speed: 55,
    armor: 0,
    magicResist: 0,
    livesDamage: 1,
    goldReward: 5,
    flying: false,
    color: "#7fbf3f",
    size: 8
  },
  wolf: {
    id: "wolf",
    name: "Wolf Rider",
    hp: 30,
    speed: 90,
    armor: 0,
    magicResist: 0,
    livesDamage: 1,
    goldReward: 7,
    flying: false,
    color: "#8B4513",
    size: 9
  },
  orc_warrior: {
    id: "orc_warrior",
    name: "Orc Warrior",
    hp: 120,
    speed: 35,
    armor: 0.4,
    magicResist: 0,
    livesDamage: 2,
    goldReward: 15,
    flying: false,
    color: "#556B2F",
    size: 11
  },
  dark_shaman: {
    id: "dark_shaman",
    name: "Dark Shaman",
    hp: 70,
    speed: 40,
    armor: 0,
    magicResist: 0.5,
    livesDamage: 1,
    goldReward: 20,
    flying: false,
    color: "#6A0DAD",
    size: 10,
    abilities: {
      heal: { range: 80, amount: 5, interval: 3 }
    }
  },
  bat: {
    id: "bat",
    name: "Giant Bat",
    hp: 35,
    speed: 70,
    armor: 0,
    magicResist: 0.2,
    livesDamage: 1,
    goldReward: 8,
    flying: true,
    color: "#2C2C3A",
    size: 7
  },
  troll: {
    id: "troll",
    name: "Troll",
    hp: 300,
    speed: 25,
    armor: 0.2,
    magicResist: 0.1,
    livesDamage: 4,
    goldReward: 40,
    flying: false,
    color: "#3D5C3A",
    size: 14,
    abilities: {
      regen: { amount: 4, interval: 1 }
    }
  },
  orc_warlord: {
    id: "orc_warlord",
    name: "Orc Warlord",
    hp: 800,
    speed: 20,
    armor: 0.3,
    magicResist: 0.3,
    livesDamage: 10,
    goldReward: 100,
    flying: false,
    color: "#8B0000",
    size: 18,
    abilities: {
      summon: { enemyId: "goblin", count: 3, interval: 10 },
      stun: { range: 120, duration: 2, interval: 8 }
    }
  }
};

// src/data/levels.ts
var LEVELS = [
  {
    id: "level_1",
    name: "The Green Valley",
    startingGold: 200,
    startingLives: 20,
    spawnPosition: { x: 60, y: 200 },
    basePosition: { x: 1220, y: 520 },
    path: [
      { x: 60, y: 200 },
      { x: 250, y: 200 },
      { x: 300, y: 300 },
      { x: 450, y: 320 },
      { x: 550, y: 250 },
      { x: 700, y: 260 },
      { x: 780, y: 360 },
      { x: 900, y: 400 },
      { x: 1e3, y: 350 },
      { x: 1100, y: 420 },
      { x: 1180, y: 500 },
      { x: 1220, y: 520 }
    ],
    buildSlots: [
      { x: 220, y: 130 },
      { x: 340, y: 240 },
      { x: 430, y: 390 },
      { x: 570, y: 180 },
      { x: 700, y: 340 },
      { x: 820, y: 290 },
      { x: 950, y: 460 },
      { x: 1060, y: 340 }
    ],
    waves: [
      {
        groups: [{ enemyId: "goblin", count: 5, spawnInterval: 1.2, delay: 0 }],
        earlyCallBonus: 15
      },
      {
        groups: [{ enemyId: "goblin", count: 8, spawnInterval: 1, delay: 0 }],
        earlyCallBonus: 15
      },
      {
        groups: [
          { enemyId: "goblin", count: 6, spawnInterval: 0.9, delay: 0 },
          { enemyId: "wolf", count: 3, spawnInterval: 1, delay: 2 }
        ],
        earlyCallBonus: 20
      },
      {
        groups: [
          { enemyId: "wolf", count: 5, spawnInterval: 0.8, delay: 0 },
          { enemyId: "goblin", count: 5, spawnInterval: 0.8, delay: 1 }
        ],
        earlyCallBonus: 20
      },
      {
        groups: [
          { enemyId: "goblin", count: 8, spawnInterval: 0.7, delay: 0 },
          { enemyId: "orc_warrior", count: 2, spawnInterval: 2, delay: 3 }
        ],
        earlyCallBonus: 25
      },
      {
        groups: [
          { enemyId: "wolf", count: 6, spawnInterval: 0.7, delay: 0 },
          { enemyId: "orc_warrior", count: 3, spawnInterval: 1.5, delay: 2 }
        ],
        earlyCallBonus: 25
      },
      {
        groups: [
          { enemyId: "goblin", count: 10, spawnInterval: 0.6, delay: 0 },
          { enemyId: "orc_warrior", count: 4, spawnInterval: 1.2, delay: 3 }
        ],
        earlyCallBonus: 30
      },
      {
        groups: [
          { enemyId: "orc_warrior", count: 5, spawnInterval: 1, delay: 0 },
          { enemyId: "wolf", count: 8, spawnInterval: 0.5, delay: 2 },
          { enemyId: "goblin", count: 10, spawnInterval: 0.5, delay: 1 }
        ],
        earlyCallBonus: 35
      }
    ]
  },
  {
    id: "level_2",
    name: "Forest Pass",
    startingGold: 250,
    startingLives: 20,
    spawnPosition: { x: 640, y: 30 },
    basePosition: { x: 640, y: 680 },
    path: [
      { x: 640, y: 30 },
      { x: 640, y: 120 },
      { x: 400, y: 180 },
      { x: 300, y: 280 },
      { x: 400, y: 380 },
      { x: 640, y: 400 },
      { x: 880, y: 380 },
      { x: 950, y: 460 },
      { x: 880, y: 540 },
      { x: 640, y: 580 },
      { x: 640, y: 680 }
    ],
    buildSlots: [
      { x: 540, y: 80 },
      { x: 740, y: 160 },
      { x: 320, y: 180 },
      { x: 220, y: 320 },
      { x: 500, y: 340 },
      { x: 760, y: 400 },
      { x: 1e3, y: 430 },
      { x: 780, y: 560 },
      { x: 540, y: 620 }
    ],
    waves: [
      {
        groups: [{ enemyId: "goblin", count: 8, spawnInterval: 1, delay: 0 }],
        earlyCallBonus: 15
      },
      {
        groups: [
          { enemyId: "goblin", count: 6, spawnInterval: 0.8, delay: 0 },
          { enemyId: "wolf", count: 4, spawnInterval: 0.7, delay: 2 }
        ],
        earlyCallBonus: 20
      },
      {
        groups: [
          { enemyId: "orc_warrior", count: 3, spawnInterval: 1.5, delay: 0 },
          { enemyId: "goblin", count: 8, spawnInterval: 0.6, delay: 1 }
        ],
        earlyCallBonus: 20
      },
      {
        groups: [
          { enemyId: "bat", count: 5, spawnInterval: 1, delay: 0 },
          { enemyId: "wolf", count: 5, spawnInterval: 0.8, delay: 2 }
        ],
        earlyCallBonus: 25
      },
      {
        groups: [
          { enemyId: "orc_warrior", count: 4, spawnInterval: 1.2, delay: 0 },
          { enemyId: "bat", count: 4, spawnInterval: 1, delay: 3 }
        ],
        earlyCallBonus: 25
      },
      {
        groups: [
          { enemyId: "goblin", count: 12, spawnInterval: 0.5, delay: 0 },
          { enemyId: "orc_warrior", count: 4, spawnInterval: 1, delay: 2 },
          { enemyId: "wolf", count: 6, spawnInterval: 0.6, delay: 3 }
        ],
        earlyCallBonus: 30
      },
      {
        groups: [
          { enemyId: "dark_shaman", count: 2, spawnInterval: 3, delay: 0 },
          { enemyId: "orc_warrior", count: 5, spawnInterval: 1, delay: 1 },
          { enemyId: "goblin", count: 8, spawnInterval: 0.5, delay: 2 }
        ],
        earlyCallBonus: 30
      },
      {
        groups: [
          { enemyId: "orc_warrior", count: 6, spawnInterval: 0.8, delay: 0 },
          { enemyId: "bat", count: 8, spawnInterval: 0.6, delay: 2 },
          { enemyId: "dark_shaman", count: 3, spawnInterval: 2, delay: 3 }
        ],
        earlyCallBonus: 35
      },
      {
        groups: [
          { enemyId: "troll", count: 1, spawnInterval: 0, delay: 0 },
          { enemyId: "orc_warrior", count: 8, spawnInterval: 0.7, delay: 3 },
          { enemyId: "wolf", count: 10, spawnInterval: 0.4, delay: 5 }
        ],
        earlyCallBonus: 40
      }
    ]
  },
  {
    id: "level_3",
    name: "Broken Bridge",
    startingGold: 300,
    startingLives: 20,
    spawnPosition: { x: 100, y: 360 },
    basePosition: { x: 1180, y: 360 },
    path: [
      { x: 100, y: 360 },
      { x: 200, y: 300 },
      { x: 320, y: 220 },
      { x: 460, y: 200 },
      { x: 540, y: 300 },
      { x: 540, y: 440 },
      { x: 620, y: 520 },
      { x: 760, y: 520 },
      { x: 860, y: 440 },
      { x: 860, y: 300 },
      { x: 960, y: 240 },
      { x: 1080, y: 280 },
      { x: 1140, y: 360 },
      { x: 1180, y: 360 }
    ],
    buildSlots: [
      { x: 160, y: 420 },
      { x: 280, y: 280 },
      { x: 420, y: 130 },
      { x: 480, y: 370 },
      { x: 610, y: 240 },
      { x: 620, y: 590 },
      { x: 780, y: 440 },
      { x: 920, y: 370 },
      { x: 920, y: 170 },
      { x: 1060, y: 360 }
    ],
    waves: [
      {
        groups: [
          { enemyId: "goblin", count: 10, spawnInterval: 0.8, delay: 0 },
          { enemyId: "wolf", count: 5, spawnInterval: 0.7, delay: 2 }
        ],
        earlyCallBonus: 20
      },
      {
        groups: [
          { enemyId: "orc_warrior", count: 4, spawnInterval: 1.2, delay: 0 },
          { enemyId: "dark_shaman", count: 2, spawnInterval: 2.5, delay: 2 }
        ],
        earlyCallBonus: 25
      },
      {
        groups: [
          { enemyId: "bat", count: 8, spawnInterval: 0.6, delay: 0 },
          { enemyId: "goblin", count: 8, spawnInterval: 0.5, delay: 1 }
        ],
        earlyCallBonus: 25
      },
      {
        groups: [
          { enemyId: "troll", count: 1, spawnInterval: 0, delay: 0 },
          { enemyId: "orc_warrior", count: 6, spawnInterval: 1, delay: 3 }
        ],
        earlyCallBonus: 30
      },
      {
        groups: [
          { enemyId: "dark_shaman", count: 3, spawnInterval: 2, delay: 0 },
          { enemyId: "orc_warrior", count: 8, spawnInterval: 0.7, delay: 1 },
          { enemyId: "wolf", count: 8, spawnInterval: 0.5, delay: 3 }
        ],
        earlyCallBonus: 30
      },
      {
        groups: [
          { enemyId: "bat", count: 10, spawnInterval: 0.5, delay: 0 },
          { enemyId: "troll", count: 2, spawnInterval: 3, delay: 2 }
        ],
        earlyCallBonus: 35
      },
      {
        groups: [
          { enemyId: "orc_warrior", count: 10, spawnInterval: 0.6, delay: 0 },
          { enemyId: "dark_shaman", count: 4, spawnInterval: 2, delay: 2 },
          { enemyId: "troll", count: 2, spawnInterval: 4, delay: 4 }
        ],
        earlyCallBonus: 40
      },
      {
        groups: [
          { enemyId: "goblin", count: 15, spawnInterval: 0.3, delay: 0 },
          { enemyId: "wolf", count: 10, spawnInterval: 0.4, delay: 2 },
          { enemyId: "orc_warrior", count: 8, spawnInterval: 0.6, delay: 3 },
          { enemyId: "troll", count: 3, spawnInterval: 3, delay: 5 }
        ],
        earlyCallBonus: 50
      }
    ]
  },
  {
    id: "level_4",
    name: "Dark Swamp",
    startingGold: 350,
    startingLives: 18,
    spawnPosition: { x: 1220, y: 100 },
    basePosition: { x: 100, y: 600 },
    path: [
      { x: 1220, y: 100 },
      { x: 1050, y: 120 },
      { x: 900, y: 180 },
      { x: 800, y: 280 },
      { x: 680, y: 280 },
      { x: 560, y: 200 },
      { x: 420, y: 220 },
      { x: 340, y: 320 },
      { x: 400, y: 420 },
      { x: 540, y: 460 },
      { x: 500, y: 560 },
      { x: 340, y: 580 },
      { x: 200, y: 560 },
      { x: 100, y: 600 }
    ],
    buildSlots: [
      { x: 1080, y: 50 },
      { x: 960, y: 230 },
      { x: 740, y: 200 },
      { x: 620, y: 130 },
      { x: 480, y: 280 },
      { x: 280, y: 260 },
      { x: 320, y: 420 },
      { x: 500, y: 520 },
      { x: 380, y: 510 },
      { x: 160, y: 500 }
    ],
    waves: [
      {
        groups: [
          { enemyId: "goblin", count: 12, spawnInterval: 0.7, delay: 0 },
          { enemyId: "orc_warrior", count: 4, spawnInterval: 1.5, delay: 2 }
        ],
        earlyCallBonus: 20
      },
      {
        groups: [
          { enemyId: "dark_shaman", count: 3, spawnInterval: 2, delay: 0 },
          { enemyId: "orc_warrior", count: 6, spawnInterval: 1, delay: 1 },
          { enemyId: "wolf", count: 6, spawnInterval: 0.6, delay: 2 }
        ],
        earlyCallBonus: 25
      },
      {
        groups: [
          { enemyId: "troll", count: 2, spawnInterval: 4, delay: 0 },
          { enemyId: "bat", count: 8, spawnInterval: 0.6, delay: 2 }
        ],
        earlyCallBonus: 30
      },
      {
        groups: [
          { enemyId: "wolf", count: 10, spawnInterval: 0.4, delay: 0 },
          { enemyId: "dark_shaman", count: 4, spawnInterval: 2, delay: 3 },
          { enemyId: "orc_warrior", count: 6, spawnInterval: 0.8, delay: 2 }
        ],
        earlyCallBonus: 30
      },
      {
        groups: [
          { enemyId: "bat", count: 12, spawnInterval: 0.4, delay: 0 },
          { enemyId: "troll", count: 2, spawnInterval: 3, delay: 3 },
          { enemyId: "goblin", count: 10, spawnInterval: 0.4, delay: 1 }
        ],
        earlyCallBonus: 35
      },
      {
        groups: [
          { enemyId: "orc_warrior", count: 10, spawnInterval: 0.6, delay: 0 },
          { enemyId: "dark_shaman", count: 5, spawnInterval: 1.5, delay: 2 },
          { enemyId: "troll", count: 3, spawnInterval: 3, delay: 4 }
        ],
        earlyCallBonus: 40
      },
      {
        groups: [
          { enemyId: "goblin", count: 20, spawnInterval: 0.3, delay: 0 },
          { enemyId: "orc_warrior", count: 8, spawnInterval: 0.5, delay: 2 },
          { enemyId: "bat", count: 10, spawnInterval: 0.5, delay: 3 },
          { enemyId: "dark_shaman", count: 4, spawnInterval: 2, delay: 4 }
        ],
        earlyCallBonus: 45
      },
      {
        groups: [
          { enemyId: "troll", count: 4, spawnInterval: 2, delay: 0 },
          { enemyId: "orc_warrior", count: 12, spawnInterval: 0.5, delay: 3 },
          { enemyId: "dark_shaman", count: 5, spawnInterval: 1.5, delay: 4 },
          { enemyId: "wolf", count: 15, spawnInterval: 0.3, delay: 5 }
        ],
        earlyCallBonus: 50
      }
    ]
  },
  {
    id: "level_5",
    name: "Warlord's Gate",
    startingGold: 400,
    startingLives: 15,
    spawnPosition: { x: 640, y: 50 },
    basePosition: { x: 640, y: 680 },
    path: [
      { x: 640, y: 50 },
      { x: 500, y: 100 },
      { x: 350, y: 160 },
      { x: 250, y: 260 },
      { x: 300, y: 370 },
      { x: 450, y: 400 },
      { x: 640, y: 380 },
      { x: 830, y: 400 },
      { x: 950, y: 370 },
      { x: 1020, y: 280 },
      { x: 950, y: 190 },
      { x: 800, y: 180 },
      { x: 700, y: 260 },
      { x: 640, y: 370 },
      { x: 640, y: 500 },
      { x: 580, y: 600 },
      { x: 640, y: 680 }
    ],
    buildSlots: [
      { x: 560, y: 50 },
      { x: 400, y: 100 },
      { x: 200, y: 300 },
      { x: 380, y: 330 },
      { x: 540, y: 460 },
      { x: 750, y: 460 },
      { x: 900, y: 310 },
      { x: 1060, y: 230 },
      { x: 850, y: 120 },
      { x: 720, y: 300 },
      { x: 560, y: 560 },
      { x: 720, y: 640 }
    ],
    waves: [
      {
        groups: [
          { enemyId: "orc_warrior", count: 6, spawnInterval: 1, delay: 0 },
          { enemyId: "wolf", count: 8, spawnInterval: 0.5, delay: 2 }
        ],
        earlyCallBonus: 25
      },
      {
        groups: [
          { enemyId: "dark_shaman", count: 4, spawnInterval: 1.5, delay: 0 },
          { enemyId: "orc_warrior", count: 8, spawnInterval: 0.7, delay: 1 }
        ],
        earlyCallBonus: 25
      },
      {
        groups: [
          { enemyId: "troll", count: 2, spawnInterval: 3, delay: 0 },
          { enemyId: "bat", count: 10, spawnInterval: 0.5, delay: 2 },
          { enemyId: "goblin", count: 15, spawnInterval: 0.3, delay: 1 }
        ],
        earlyCallBonus: 30
      },
      {
        groups: [
          { enemyId: "orc_warrior", count: 10, spawnInterval: 0.6, delay: 0 },
          { enemyId: "dark_shaman", count: 5, spawnInterval: 1.5, delay: 2 },
          { enemyId: "bat", count: 8, spawnInterval: 0.5, delay: 3 }
        ],
        earlyCallBonus: 35
      },
      {
        groups: [
          { enemyId: "troll", count: 3, spawnInterval: 2.5, delay: 0 },
          { enemyId: "wolf", count: 12, spawnInterval: 0.3, delay: 2 },
          { enemyId: "orc_warrior", count: 8, spawnInterval: 0.5, delay: 3 }
        ],
        earlyCallBonus: 35
      },
      {
        groups: [
          { enemyId: "dark_shaman", count: 6, spawnInterval: 1, delay: 0 },
          { enemyId: "troll", count: 3, spawnInterval: 2, delay: 2 },
          { enemyId: "orc_warrior", count: 10, spawnInterval: 0.5, delay: 3 },
          { enemyId: "bat", count: 10, spawnInterval: 0.4, delay: 4 }
        ],
        earlyCallBonus: 40
      },
      {
        groups: [
          { enemyId: "goblin", count: 20, spawnInterval: 0.2, delay: 0 },
          { enemyId: "orc_warrior", count: 12, spawnInterval: 0.4, delay: 3 },
          { enemyId: "troll", count: 4, spawnInterval: 2, delay: 5 },
          { enemyId: "dark_shaman", count: 6, spawnInterval: 1, delay: 4 }
        ],
        earlyCallBonus: 50
      },
      {
        groups: [
          { enemyId: "orc_warlord", count: 1, spawnInterval: 0, delay: 0 },
          { enemyId: "orc_warrior", count: 15, spawnInterval: 0.4, delay: 3 },
          { enemyId: "troll", count: 4, spawnInterval: 2, delay: 5 },
          { enemyId: "dark_shaman", count: 6, spawnInterval: 1, delay: 4 },
          { enemyId: "bat", count: 12, spawnInterval: 0.4, delay: 6 }
        ],
        earlyCallBonus: 60
      }
    ]
  }
];

// src/data/balance.ts
var BALANCE = {
  wave: {
    /** Seconds of calm before the first wave of a level starts. */
    firstWaveDelay: 5,
    /** Seconds between waves when the player does not call early. */
    timeBetweenWaves: 15
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
      interval: 0.8
    }
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
    fallback: { hp: 70, damage: 5, attackInterval: 1 },
    /** Temporary units summoned by the Reinforcements spell. */
    reinforcement: {
      hp: 60,
      damage: 8,
      attackInterval: 0.9
    }
  },
  tower: {
    /** Retry delay when a ready tower has no target in range. */
    retryDelay: 0.1,
    /** Seconds the attack animation flag stays set. */
    attackAnimDuration: 0.15,
    /** Angle interpolation speed for a turret turning to its target (rad/s). */
    aimTurnSpeed: 6
  },
  projectile: {
    /** Search radius for a new target when the locked one dies. */
    retargetRadius: 120,
    /** Max trail points kept for rendering. */
    trailLength: 6
  },
  splash: {
    /** Damage multiplier applied at the very edge of a blast (B3). */
    edgeFalloff: 0.4,
    /** Minimum seconds between two blasts from the same source hitting one enemy. */
    sameSourceCooldown: 0.1
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
    floatingTextRise: 30
  },
  pools: {
    projectileInitial: 100,
    projectileMax: 400,
    textInitial: 40,
    textMax: 60,
    particleInitial: 200,
    particleMax: 600
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
      { type: "tree", weight: 34, sizeMin: 34, sizeMax: 56, variants: 4 },
      { type: "rock", weight: 14, sizeMin: 14, sizeMax: 26, variants: 3 },
      { type: "bush", weight: 18, sizeMin: 20, sizeMax: 34, variants: 3 },
      { type: "mushroom", weight: 10, sizeMin: 12, sizeMax: 20, variants: 1 },
      { type: "stump", weight: 10, sizeMin: 16, sizeMax: 26, variants: 1 },
      { type: "bones", weight: 8, sizeMin: 16, sizeMax: 26, variants: 1 },
      { type: "sign", weight: 2, sizeMin: 22, sizeMax: 30, variants: 1 }
    ]
  },
  ui: {
    /** Click radius (design px) for towers, build slots and radial items. */
    towerHitRadius: 22,
    slotHitRadius: 22,
    radialItemRadius: 24,
    radialItemDistance: 50
  },
  tutorial: {
    /** Tutorial steps shown on the first level. */
    steps: 3
  }
};

// src/core/viewport.ts
var SAFE_AREA = 24;
var state = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
  dpr: 1
};
function updateViewport(width, height, dprCap = 2) {
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, dprCap));
  const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
  state.scale = scale;
  state.offsetX = (width - DESIGN_WIDTH * scale) / 2;
  state.offsetY = (height - DESIGN_HEIGHT * scale) / 2;
  state.width = width;
  state.height = height;
  state.dpr = dpr;
  return state;
}
function getViewport() {
  return state;
}
function screenToWorld(clientX, clientY, canvasRect) {
  const { scale, offsetX, offsetY } = state;
  return {
    x: (clientX - canvasRect.left - offsetX) / scale,
    y: (clientY - canvasRect.top - offsetY) / scale
  };
}

// src/core/color.ts
function adjustColor(hex, amount) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, Math.min(255, r + Math.round(amount * 255)));
  g = Math.max(0, Math.min(255, g + Math.round(amount * 255)));
  b = Math.max(0, Math.min(255, b + Math.round(amount * 255)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
function darken(hex, amount) {
  return adjustColor(hex, -amount);
}
function lighten(hex, amount) {
  return adjustColor(hex, amount);
}

// src/rendering/MapRenderer.ts
function hash(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ h >> 13) * 1274126177;
  h = h ^ h >> 16;
  return (h & 2147483647) / 2147483647;
}
function smoothNoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash(ix, iy);
  const n10 = hash(ix + 1, iy);
  const n01 = hash(ix, iy + 1);
  const n11 = hash(ix + 1, iy + 1);
  return (n00 * (1 - sx) + n10 * sx) * (1 - sy) + (n01 * (1 - sx) + n11 * sx) * sy;
}
function fbm(x, y, octaves = 4) {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxValue;
}
var LEVEL_THEMES = {
  level_1: {
    grassBase: "#4a8e3a",
    grassHighlight: "#5eab4a",
    grassDark: "#3a7a2e",
    pathBase: "#c4a06a",
    pathLight: "#ddc08a",
    pathDark: "#8a7040",
    waterColor: "#4a90c4",
    skyGradient: ["#87CEEB", "#b8e0f0"],
    ambientLight: "#fffbe6",
    fogColor: "#e8f4e8",
    fogDensity: 0,
    treeTrunk: "#5c4033",
    treeCanopy: ["#2d8a2e", "#3ca63d", "#4ab84b", "#228B22"],
    rockColor: ["#8a8a7a", "#9a9a8a", "#7a7a6a"],
    flowerColors: ["#ff6b9d", "#ffeb3b", "#e040fb", "#7c4dff"]
  },
  level_2: {
    grassBase: "#3a7a2e",
    grassHighlight: "#4a9a3a",
    grassDark: "#2a6020",
    pathBase: "#9a8060",
    pathLight: "#baa080",
    pathDark: "#705838",
    waterColor: "#3a7a9a",
    skyGradient: ["#5a8a5a", "#8ab880"],
    ambientLight: "#e0ffe0",
    fogColor: "#a8d8a8",
    fogDensity: 0.15,
    treeTrunk: "#4a3025",
    treeCanopy: ["#1a6a1a", "#2a7a2a", "#206020", "#1a5a1a"],
    rockColor: ["#6a7a6a", "#7a8a7a", "#5a6a5a"],
    flowerColors: ["#8aaa3a", "#6a8a2a", "#aaca4a"]
  },
  level_3: {
    grassBase: "#5a7a4a",
    grassHighlight: "#6a8a5a",
    grassDark: "#4a6a3a",
    pathBase: "#8a7a6a",
    pathLight: "#aaa08a",
    pathDark: "#5a5040",
    waterColor: "#3a6a8a",
    skyGradient: ["#8a9aaa", "#a0aab4"],
    ambientLight: "#d0d8e0",
    fogColor: "#b0b8c0",
    fogDensity: 0.25,
    treeTrunk: "#4a3a2a",
    treeCanopy: ["#3a6a3a", "#4a7a4a", "#2a5a2a", "#3a5a3a"],
    rockColor: ["#7a7a7a", "#8a8a8a", "#6a6a6a", "#5a5a5a"],
    flowerColors: ["#8a8a9a", "#7a7a8a"]
  },
  level_4: {
    grassBase: "#3a5a30",
    grassHighlight: "#4a6a3a",
    grassDark: "#2a4020",
    pathBase: "#6a5a4a",
    pathLight: "#8a7a6a",
    pathDark: "#4a3a2a",
    waterColor: "#2a4a3a",
    skyGradient: ["#3a4a3a", "#4a5a4a"],
    ambientLight: "#a0c0a0",
    fogColor: "#5a7a5a",
    fogDensity: 0.35,
    treeTrunk: "#3a2a1a",
    treeCanopy: ["#2a4a2a", "#1a3a1a", "#3a5a2a", "#1a4a1a"],
    rockColor: ["#5a5a4a", "#6a6a5a", "#4a4a3a"],
    flowerColors: ["#7aff4a", "#4aff8a", "#aafa3a"]
  },
  level_5: {
    grassBase: "#4a4a3a",
    grassHighlight: "#5a5a4a",
    grassDark: "#3a3a2a",
    pathBase: "#6a5040",
    pathLight: "#8a6a50",
    pathDark: "#4a3020",
    waterColor: "#ff4a2a",
    skyGradient: ["#4a2020", "#6a3030"],
    ambientLight: "#ffa060",
    fogColor: "#4a2020",
    fogDensity: 0.2,
    treeTrunk: "#2a1a0a",
    treeCanopy: ["#3a3020", "#4a4030", "#2a2a1a"],
    rockColor: ["#4a4040", "#5a4a40", "#3a3030"],
    flowerColors: ["#ff6a3a", "#ff4a2a", "#ffaa3a"]
  }
};
function getTheme(levelId) {
  return LEVEL_THEMES[levelId] || LEVEL_THEMES.level_1;
}
function drawTree(ctx, cx, cy, s, variant, theme, _time) {
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.4, s * 0.6, s * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  const trunkW = s * 0.15;
  const trunkH = s * 0.5;
  ctx.fillStyle = theme.treeTrunk;
  ctx.fillRect(cx - trunkW, cy - trunkH, trunkW * 2, trunkH + s * 0.1);
  ctx.fillStyle = lighten(theme.treeTrunk, 0.1);
  ctx.fillRect(cx - trunkW * 0.5, cy - trunkH + 2, trunkW * 0.6, trunkH - 4);
  ctx.strokeStyle = darken(theme.treeTrunk, 0.15);
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 4; i++) {
    const by = cy - trunkH + i * (trunkH / 4) + 3;
    ctx.beginPath();
    ctx.moveTo(cx - trunkW + 1, by);
    ctx.lineTo(cx + trunkW - 1, by + 2);
    ctx.stroke();
  }
  const canopyColors = theme.treeCanopy;
  const layers = variant === 0 ? [
    // Round tree
    { ox: 0, oy: -0.7, r: 0.55 },
    { ox: -0.2, oy: -0.8, r: 0.4 },
    { ox: 0.15, oy: -0.9, r: 0.35 },
    { ox: 0, oy: -1, r: 0.25 }
  ] : variant === 1 ? [
    // Pine tree (triangular)
    { ox: 0, oy: -0.5, r: 0.5 },
    { ox: 0, oy: -0.7, r: 0.4 },
    { ox: 0, oy: -0.9, r: 0.28 },
    { ox: 0, oy: -1.05, r: 0.15 }
  ] : variant === 2 ? [
    // Wide tree
    { ox: -0.2, oy: -0.6, r: 0.45 },
    { ox: 0.2, oy: -0.6, r: 0.45 },
    { ox: 0, oy: -0.8, r: 0.4 },
    { ox: 0, oy: -0.95, r: 0.25 }
  ] : [
    // Tall slim tree
    { ox: 0, oy: -0.6, r: 0.35 },
    { ox: 0, oy: -0.8, r: 0.3 },
    { ox: 0, oy: -1, r: 0.22 },
    { ox: 0, oy: -1.15, r: 0.15 }
  ];
  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    const color = canopyColors[i % canopyColors.length];
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx + l.ox * s, cy + l.oy * s, l.r * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = lighten(color, 0.12);
    ctx.beginPath();
    ctx.arc(cx + l.ox * s - l.r * s * 0.2, cy + l.oy * s - l.r * s * 0.2, l.r * s * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawRock(ctx, cx, cy, s, variant, theme) {
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.2, s * 0.55, s * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  const colors = theme.rockColor;
  ctx.fillStyle = colors[0];
  ctx.beginPath();
  if (variant === 0) {
    ctx.ellipse(cx, cy, s * 0.45, s * 0.35, 0, 0, Math.PI * 2);
  } else if (variant === 1) {
    ctx.moveTo(cx - s * 0.4, cy + s * 0.1);
    ctx.lineTo(cx - s * 0.3, cy - s * 0.3);
    ctx.lineTo(cx + s * 0.1, cy - s * 0.35);
    ctx.lineTo(cx + s * 0.4, cy - s * 0.1);
    ctx.lineTo(cx + s * 0.35, cy + s * 0.15);
    ctx.closePath();
  } else {
    ctx.ellipse(cx - s * 0.1, cy, s * 0.3, s * 0.25, -0.2, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = colors[1] || colors[0];
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.1, cy - s * 0.1, s * 0.25, s * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  if (variant !== 0) {
    ctx.fillStyle = colors[2] || colors[0];
    ctx.beginPath();
    ctx.ellipse(cx + s * 0.3, cy + s * 0.05, s * 0.15, s * 0.12, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(80,140,60,0.2)";
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.05, cy - s * 0.15, s * 0.12, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
}
function drawBush(ctx, cx, cy, s, variant, theme) {
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.15, s * 0.4, s * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  const canopyColors = theme.treeCanopy;
  const circles = [
    { ox: -0.15, oy: -0.05, r: 0.28 },
    { ox: 0.1, oy: -0.08, r: 0.25 },
    { ox: 0, oy: -0.15, r: 0.2 }
  ];
  for (let i = 0; i < circles.length; i++) {
    const c = circles[i];
    ctx.fillStyle = canopyColors[i % canopyColors.length];
    ctx.beginPath();
    ctx.arc(cx + c.ox * s, cy + c.oy * s, c.r * s, 0, Math.PI * 2);
    ctx.fill();
  }
  if (variant > 1) {
    const berryColor = theme.flowerColors[0] || "#ff4444";
    ctx.fillStyle = berryColor;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(cx + (Math.random() - 0.5) * s * 0.3, cy - Math.random() * s * 0.2, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
function drawMushroom(ctx, cx, cy, s, theme) {
  const scale = s * 0.06;
  ctx.fillStyle = "#e8d8c0";
  ctx.fillRect(cx - 2 * scale, cy - 2 * scale, 4 * scale, 5 * scale);
  ctx.fillStyle = theme.flowerColors[0] || "#cc3333";
  ctx.beginPath();
  ctx.ellipse(cx, cy - 2 * scale, 5 * scale, 3 * scale, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.arc(cx - 1.5 * scale, cy - 3.5 * scale, 1.2 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 2 * scale, cy - 2.5 * scale, 0.8 * scale, 0, Math.PI * 2);
  ctx.fill();
}
function drawStump(ctx, cx, cy, s, theme) {
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.1, s * 0.25, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.treeTrunk;
  ctx.fillRect(cx - s * 0.15, cy - s * 0.15, s * 0.3, s * 0.25);
  ctx.fillStyle = lighten(theme.treeTrunk, 0.15);
  ctx.beginPath();
  ctx.ellipse(cx, cy - s * 0.15, s * 0.15, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = darken(theme.treeTrunk, 0.1);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy - s * 0.15, s * 0.08, s * 0.04, 0, 0, Math.PI * 2);
  ctx.stroke();
}
function drawBones(ctx, cx, cy, s) {
  ctx.strokeStyle = "#d4c8b0";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.2, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.2, cy + s * 0.1);
  ctx.stroke();
  ctx.fillStyle = "#d4c8b0";
  ctx.beginPath();
  ctx.arc(cx - s * 0.2, cy - s * 0.1, 2, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.2, cy + s * 0.1, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8dcc8";
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.05, s * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a2020";
  ctx.beginPath();
  ctx.arc(cx - 1.5, cy - s * 0.06, 1, 0, Math.PI * 2);
  ctx.arc(cx + 1.5, cy - s * 0.06, 1, 0, Math.PI * 2);
  ctx.fill();
}
function drawSign(ctx, cx, cy, s, theme) {
  ctx.fillStyle = theme.treeTrunk;
  ctx.fillRect(cx - 1.5, cy - s * 0.4, 3, s * 0.5);
  ctx.fillStyle = lighten(theme.treeTrunk, 0.2);
  ctx.fillRect(cx - s * 0.25, cy - s * 0.4, s * 0.5, s * 0.2);
  ctx.strokeStyle = darken(theme.treeTrunk, 0.15);
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - s * 0.25, cy - s * 0.4, s * 0.5, s * 0.2);
  ctx.fillStyle = "#cc3333";
  ctx.font = `${s * 0.12}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("\u26A0", cx, cy - s * 0.3);
}
var cachedBgCanvas = null;
var cachedBgLevelId = "";
function drawBackgroundDirect(ctx, levelId, path) {
  if (!cachedBgCanvas || cachedBgLevelId !== levelId) {
    cachedBgCanvas = document.createElement("canvas");
    cachedBgCanvas.width = DESIGN_WIDTH;
    cachedBgCanvas.height = DESIGN_HEIGHT;
    const bCtx = cachedBgCanvas.getContext("2d");
    const theme = getTheme(levelId);
    const baseGrad = bCtx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
    baseGrad.addColorStop(0, theme.grassHighlight);
    baseGrad.addColorStop(0.4, theme.grassBase);
    baseGrad.addColorStop(0.7, theme.grassDark);
    baseGrad.addColorStop(1, theme.grassBase);
    bCtx.fillStyle = baseGrad;
    bCtx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    const imgData = bCtx.getImageData(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    const data = imgData.data;
    for (let py = 0; py < DESIGN_HEIGHT; py += 2) {
      for (let px = 0; px < DESIGN_WIDTH; px += 2) {
        const noise = fbm(px * 0.02, py * 0.02, 3);
        const variation = (noise - 0.5) * 26;
        for (let dy = 0; dy < 2 && py + dy < DESIGN_HEIGHT; dy++) {
          for (let dx = 0; dx < 2 && px + dx < DESIGN_WIDTH; dx++) {
            const i = ((py + dy) * DESIGN_WIDTH + (px + dx)) * 4;
            data[i] = Math.max(0, Math.min(255, data[i] + variation));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + variation * 1.2));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + variation * 0.3));
          }
        }
      }
    }
    bCtx.putImageData(imgData, 0, 0);
    bCtx.lineWidth = 1;
    for (let i = 0; i < 350; i++) {
      const gx = i * 137.5 % DESIGN_WIDTH;
      const gy = i * 89.3 % DESIGN_HEIGHT;
      const grassColor = i % 2 === 0 ? theme.grassHighlight : theme.grassDark;
      bCtx.strokeStyle = grassColor;
      bCtx.globalAlpha = 0.4;
      bCtx.beginPath();
      bCtx.moveTo(gx, gy);
      bCtx.lineTo(gx - 2, gy - 6);
      bCtx.moveTo(gx, gy);
      bCtx.lineTo(gx + 2, gy - 7);
      bCtx.stroke();
    }
    bCtx.globalAlpha = 1;
    for (let i = 0; i < 60; i++) {
      const fx = i * 211.3 % DESIGN_WIDTH;
      const fy = i * 173.7 % DESIGN_HEIGHT;
      bCtx.fillStyle = i % 3 === 0 ? "#fef08a" : i % 3 === 1 ? "#fda4af" : "#93c5fd";
      bCtx.beginPath();
      bCtx.arc(fx, fy, 2, 0, Math.PI * 2);
      bCtx.fill();
    }
    cachedBgLevelId = levelId;
  }
  ctx.drawImage(cachedBgCanvas, 0, 0);
}
function drawPathDirect(ctx, levelId, waypoints) {
  if (waypoints.length < 2) return;
  const theme = getTheme(levelId);
  const traceCurvedPath = () => {
    ctx.beginPath();
    ctx.moveTo(waypoints[0].x, waypoints[0].y);
    for (let i = 1; i < waypoints.length; i++) {
      const prev = waypoints[i - 1];
      const curr = waypoints[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      if (i === 1) {
        ctx.lineTo(midX, midY);
      } else {
        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      }
    }
    const last = waypoints[waypoints.length - 1];
    ctx.lineTo(last.x, last.y);
  };
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 46;
  traceCurvedPath();
  ctx.stroke();
  ctx.strokeStyle = theme.pathDark;
  ctx.lineWidth = 40;
  traceCurvedPath();
  ctx.stroke();
  ctx.strokeStyle = theme.pathBase;
  ctx.lineWidth = 34;
  traceCurvedPath();
  ctx.stroke();
  ctx.strokeStyle = theme.pathLight;
  ctx.lineWidth = 20;
  traceCurvedPath();
  ctx.stroke();
  ctx.strokeStyle = theme.pathDark;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.35;
  ctx.setLineDash([12, 10]);
  traceCurvedPath();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
function drawTreeDirect(ctx, x, y, size, levelId = "level_1", variant = 0) {
  const theme = getTheme(levelId);
  drawTree(ctx, x, y, size, variant, theme, 0);
}
function drawRockDirect(ctx, x, y, size, levelId = "level_1", variant = 0) {
  const theme = getTheme(levelId);
  drawRock(ctx, x, y, size, variant, theme);
}
function drawBushDirect(ctx, x, y, size, levelId = "level_1", variant = 0) {
  drawBush(ctx, x, y, size, variant, getTheme(levelId));
}
function drawMushroomDirect(ctx, x, y, size, levelId = "level_1") {
  drawMushroom(ctx, x, y, size, getTheme(levelId));
}
function drawStumpDirect(ctx, x, y, size, levelId = "level_1") {
  drawStump(ctx, x, y, size, getTheme(levelId));
}
function drawBonesDirect(ctx, x, y, size) {
  drawBones(ctx, x, y, size);
}
function drawSignDirect(ctx, x, y, size, levelId = "level_1") {
  drawSign(ctx, x, y, size, getTheme(levelId));
}
function drawSpawnGateDirect(ctx, pos) {
  const cx = pos.x;
  const cy = pos.y;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(cx - 24, cy - 14, 48, 42);
  ctx.fillStyle = "#4b5563";
  ctx.fillRect(cx - 24, cy - 24, 11, 48);
  ctx.fillRect(cx + 13, cy - 24, 11, 48);
  ctx.fillStyle = "#6b7280";
  ctx.fillRect(cx - 22, cy - 22, 5, 44);
  ctx.fillRect(cx + 15, cy - 22, 5, 44);
  ctx.fillStyle = "#4b5563";
  ctx.fillRect(cx - 26, cy - 28, 52, 9);
  ctx.fillStyle = "#6b7280";
  ctx.fillRect(cx - 24, cy - 26, 48, 4);
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(cx, cy + 2, 13, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(cx - 13, cy + 2, 26, 18);
  ctx.fillStyle = "rgba(220, 38, 38, 0.35)";
  ctx.beginPath();
  ctx.arc(cx, cy + 8, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.arc(cx, cy - 18, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(cx - 2.5, cy - 19, 1.5, 1.5);
  ctx.fillRect(cx + 1, cy - 19, 1.5, 1.5);
  for (const side of [-1, 1]) {
    const tx = cx + side * 19;
    const ty = cy - 10;
    ctx.fillStyle = "#451a03";
    ctx.fillRect(tx - 1.5, ty, 3, 7);
    ctx.fillStyle = "#ea580c";
    ctx.beginPath();
    ctx.arc(tx, ty, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(tx, ty - 1, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawBaseDirect(ctx, pos) {
  const cx = pos.x;
  const cy = pos.y + 4;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 26, 38, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#64748b";
  ctx.fillRect(cx - 28, cy - 20, 56, 42);
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(cx - 25, cy - 17, 50, 36);
  ctx.fillStyle = "#64748b";
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(cx - 27 + i * 11, cy - 28, 8, 10);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(cx - 26 + i * 11, cy - 27, 6, 8);
    ctx.fillStyle = "#64748b";
  }
  for (const side of [-1, 1]) {
    const tx = cx + side * 27;
    ctx.fillStyle = "#475569";
    ctx.fillRect(tx - 6, cy - 28, 12, 28);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(tx - 4, cy - 26, 8, 24);
    ctx.fillStyle = "#1e3a8a";
    ctx.beginPath();
    ctx.moveTo(tx - 7, cy - 28);
    ctx.lineTo(tx, cy - 38);
    ctx.lineTo(tx + 7, cy - 28);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.arc(cx, cy + 6, 10, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(cx - 10, cy + 6, 20, 16);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.5;
  for (let gx = -6; gx <= 6; gx += 4) {
    ctx.beginPath();
    ctx.moveTo(cx + gx, cy - 2);
    ctx.lineTo(cx + gx, cy + 22);
    ctx.stroke();
  }
  ctx.fillStyle = "#1e3a8a";
  ctx.fillRect(cx - 5, cy - 42, 10, 15);
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(cx - 3, cy - 38, 6, 6);
  ctx.strokeStyle = "#451a03";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 44);
  ctx.lineTo(cx, cy - 20);
  ctx.stroke();
}

// src/rendering/TowerRenderer.ts
function drawArcherTower(ctx, cx, cy, level, specId, color) {
  const h = 22 + level * 6 + (specId ? 8 : 0);
  ctx.fillStyle = "#8B7355";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#a89070";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  if (level === 0) {
    ctx.fillStyle = "#6a5040";
    ctx.fillRect(cx - 4, cy - h, 8, h);
    ctx.fillStyle = "#7a6050";
    ctx.fillRect(cx - 2, cy - h + 2, 4, h - 4);
    ctx.fillStyle = "#8a7060";
    ctx.fillRect(cx - 10, cy - h - 2, 20, 6);
    ctx.fillStyle = "#9a8070";
    ctx.fillRect(cx - 8, cy - h, 16, 4);
    ctx.fillStyle = "#6a5040";
    ctx.fillRect(cx - 9, cy - h - 6, 2, 6);
    ctx.fillRect(cx + 7, cy - h - 6, 2, 6);
    drawArcherFigure(ctx, cx, cy - h - 4, color, 1);
  } else if (level === 1) {
    ctx.fillStyle = "#6a5040";
    ctx.fillRect(cx - 8, cy - h, 16, h);
    ctx.fillStyle = "#7a6050";
    ctx.fillRect(cx - 6, cy - h + 2, 12, h - 4);
    ctx.fillStyle = "#2a1a0a";
    ctx.fillRect(cx - 2, cy - h + 6, 4, 6);
    ctx.fillRect(cx - 2, cy - h + 16, 4, 6);
    ctx.fillStyle = "#8a7060";
    ctx.fillRect(cx - 12, cy - h - 3, 24, 6);
    ctx.fillStyle = "#6a5040";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(cx - 11 + i * 10, cy - h - 7, 6, 6);
    }
    drawArcherFigure(ctx, cx - 4, cy - h - 5, color, 0.8);
    drawArcherFigure(ctx, cx + 4, cy - h - 5, color, 0.8);
  } else {
    ctx.fillStyle = "#7a7068";
    ctx.fillRect(cx - 10, cy - h, 20, h);
    ctx.fillStyle = "#8a8078";
    ctx.fillRect(cx - 8, cy - h + 2, 16, h - 4);
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
      const ry = cy - h + 5 + i * 6;
      ctx.beginPath();
      ctx.moveTo(cx - 8, ry);
      ctx.lineTo(cx + 8, ry);
      ctx.stroke();
    }
    ctx.fillStyle = "#1a1010";
    for (let i = 0; i < 2; i++) {
      const sy = cy - h + 8 + i * 10;
      ctx.fillRect(cx - 1.5, sy, 3, 5);
    }
    ctx.fillStyle = "#7a7068";
    ctx.fillRect(cx - 14, cy - h - 4, 28, 8);
    ctx.fillStyle = "#8a8078";
    ctx.fillRect(cx - 12, cy - h - 2, 24, 5);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = "#7a7068";
      ctx.fillRect(cx - 13 + i * 8, cy - h - 9, 5, 7);
    }
    if (specId === "sharpshooter") {
      ctx.fillStyle = "#6a6058";
      ctx.fillRect(cx - 3, cy - h - 18, 6, 12);
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(cx, cy - h - 18, 3, 0, Math.PI * 2);
      ctx.fill();
      drawArcherFigure(ctx, cx, cy - h - 8, "#daa520", 1);
    } else if (specId === "rapid_volley") {
      ctx.strokeStyle = "#8a5020";
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(cx - 8 + i * 8, cy - h - 6, 3, Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke();
      }
      drawArcherFigure(ctx, cx - 6, cy - h - 6, color, 0.7);
      drawArcherFigure(ctx, cx, cy - h - 7, color, 0.7);
      drawArcherFigure(ctx, cx + 6, cy - h - 6, color, 0.7);
    } else {
      drawArcherFigure(ctx, cx - 5, cy - h - 6, color, 0.8);
      drawArcherFigure(ctx, cx + 5, cy - h - 6, color, 0.8);
      drawArcherFigure(ctx, cx, cy - h - 8, color, 0.8);
    }
    ctx.fillStyle = "#c41e3a";
    ctx.fillRect(cx + 10, cy - h, 2, 12);
    ctx.fillStyle = "#c41e3a";
    ctx.fillRect(cx + 12, cy - h, 6, 8);
  }
  drawLevelDots(ctx, cx, cy + 8, level, specId);
}
function drawArcherFigure(ctx, x, y, color, scale) {
  const s = scale;
  ctx.fillStyle = color;
  ctx.fillRect(x - 2 * s, y - 3 * s, 4 * s, 5 * s);
  ctx.fillStyle = "#e8c090";
  ctx.beginPath();
  ctx.arc(x, y - 4 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8a5020";
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.arc(x + 4 * s, y - 1 * s, 3 * s, -Math.PI * 0.6, Math.PI * 0.6);
  ctx.stroke();
}
function drawMageTower(ctx, cx, cy, level, specId, color) {
  const h = 24 + level * 7 + (specId ? 10 : 0);
  ctx.fillStyle = "#7a6888";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  if (level === 0) {
    ctx.fillStyle = "#6a5040";
    ctx.fillRect(cx - 8, cy - h + 6, 3, h - 6);
    ctx.fillRect(cx + 5, cy - h + 6, 3, h - 6);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - h + 8);
    ctx.lineTo(cx, cy - h - 2);
    ctx.lineTo(cx + 12, cy - h + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = lighten(color, 0.15);
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - h + 7);
    ctx.lineTo(cx, cy - h);
    ctx.lineTo(cx + 8, cy - h + 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#5a3020";
    ctx.fillRect(cx - 5, cy - 4, 10, 5);
    ctx.fillStyle = "#8a3030";
    ctx.fillRect(cx - 4, cy - 6, 3, 3);
    ctx.fillStyle = "#3030aa";
    ctx.fillRect(cx + 1, cy - 6, 3, 3);
    drawMageFigure(ctx, cx, cy - h + 2, color, 1);
  } else if (level === 1) {
    ctx.fillStyle = "#6a5878";
    ctx.fillRect(cx - 8, cy - h, 16, h);
    ctx.fillStyle = "#7a6888";
    ctx.fillRect(cx - 6, cy - h + 2, 12, h - 4);
    ctx.strokeStyle = "rgba(200,150,255,0.3)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy - h / 2, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ccaaff";
    ctx.globalAlpha = 0.7;
    ctx.fillRect(cx - 2, cy - h + 8, 4, 5);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#6a5878";
    ctx.fillRect(cx - 10, cy - h - 2, 20, 5);
    drawCrystal(ctx, cx, cy - h - 6, 5, color);
    drawMageFigure(ctx, cx, cy - h - 2, color, 0.8);
  } else {
    ctx.fillStyle = "#5a4868";
    ctx.fillRect(cx - 10, cy - h, 20, h);
    ctx.fillStyle = "#6a5878";
    ctx.fillRect(cx - 8, cy - h + 2, 16, h - 4);
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - h + 6 + i * 6);
      ctx.lineTo(cx + 8, cy - h + 6 + i * 6);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(180,120,255,0.5)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const ry = cy - h + 8 + i * 8;
      ctx.beginPath();
      ctx.moveTo(cx - 3, ry);
      ctx.lineTo(cx, ry - 2);
      ctx.lineTo(cx + 3, ry);
      ctx.lineTo(cx, ry + 2);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.fillStyle = "#5a4868";
    ctx.fillRect(cx - 13, cy - h - 3, 26, 7);
    if (specId === "arcane_blast") {
      drawCrystal(ctx, cx, cy - h - 10, 8, "#ff44ff");
      ctx.strokeStyle = "rgba(255,100,255,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy - h - 10, 12, 0, Math.PI * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy - h - 10, 12, Math.PI, Math.PI * 1.5);
      ctx.stroke();
    } else if (specId === "slow_hex") {
      drawCrystal(ctx, cx, cy - h - 8, 6, "#44aaff");
      ctx.strokeStyle = "rgba(68,170,255,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy - h - 8, 10, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        const hx = cx + Math.cos(a) * 10;
        const hy = cy - h - 8 + Math.sin(a) * 10;
        ctx.fillStyle = "rgba(68,170,255,0.6)";
        ctx.beginPath();
        ctx.arc(hx, hy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      drawCrystal(ctx, cx, cy - h - 8, 7, color);
    }
    drawMageFigure(ctx, cx, cy - h - 2, color, 0.9);
  }
  drawLevelDots(ctx, cx, cy + 8, level, specId);
}
function drawMageFigure(ctx, x, y, color, scale) {
  const s = scale;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 3 * s, y + 4 * s);
  ctx.lineTo(x - 2 * s, y - 2 * s);
  ctx.lineTo(x + 2 * s, y - 2 * s);
  ctx.lineTo(x + 3 * s, y + 4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#e8c090";
  ctx.beginPath();
  ctx.arc(x, y - 3.5 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = darken(color, 0.2);
  ctx.beginPath();
  ctx.moveTo(x - 3 * s, y - 3 * s);
  ctx.lineTo(x, y - 8 * s);
  ctx.lineTo(x + 3 * s, y - 3 * s);
  ctx.closePath();
  ctx.fill();
}
function drawCrystal(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.6, y);
  ctx.lineTo(x, y + size * 0.5);
  ctx.lineTo(x - size * 0.6, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = lighten(color, 0.4);
  ctx.beginPath();
  ctx.moveTo(x - size * 0.2, y - size * 0.6);
  ctx.lineTo(x, y - size);
  ctx.lineTo(x + size * 0.2, y - size * 0.4);
  ctx.lineTo(x, y - size * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(x - size * 0.1, y - size * 0.5, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}
function drawCannonTower(ctx, cx, cy, level, specId, color) {
  const h = 18 + level * 5 + (specId ? 6 : 0);
  ctx.fillStyle = "#8a7060";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, 18, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  if (level === 0) {
    ctx.fillStyle = "#7a6050";
    ctx.fillRect(cx - 12, cy - 4, 24, 8);
    ctx.fillStyle = "#8a7060";
    ctx.fillRect(cx - 10, cy - 2, 20, 5);
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 10 + i * 6, cy - 2);
      ctx.lineTo(cx - 10 + i * 6, cy + 3);
      ctx.stroke();
    }
    drawCannon(ctx, cx, cy - 6, 0.8, color);
  } else if (level === 1) {
    ctx.fillStyle = "#6a6058";
    ctx.fillRect(cx - 13, cy - h + 6, 26, h - 6);
    ctx.fillStyle = "#7a7068";
    ctx.fillRect(cx - 11, cy - h + 8, 22, h - 10);
    ctx.fillStyle = "#5a4030";
    ctx.fillRect(cx + 6, cy - 2, 6, 5);
    ctx.fillStyle = "#6a5040";
    ctx.fillRect(cx + 7, cy - 1, 4, 3);
    drawCannon(ctx, cx - 2, cy - h + 4, 1, color);
  } else {
    ctx.fillStyle = "#5a5048";
    ctx.fillRect(cx - 14, cy - h, 28, h);
    ctx.fillStyle = "#6a6058";
    ctx.fillRect(cx - 12, cy - h + 2, 24, h - 4);
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy - h + 6 + i * 6);
      ctx.lineTo(cx + 12, cy - h + 6 + i * 6);
      ctx.stroke();
    }
    ctx.fillStyle = "#5a5048";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(cx - 13 + i * 10, cy - h - 5, 7, 7);
    }
    ctx.fillStyle = "#3a3030";
    ctx.fillRect(cx + 8, cy - h + 4, 4, 3);
    if (specId === "heavy_bombard") {
      drawCannon(ctx, cx, cy - h - 2, 1.5, "#4a3030");
    } else if (specId === "cluster_bombs") {
      for (let i = 0; i < 3; i++) {
        drawCannon(ctx, cx - 4 + i * 4, cy - h - 1, 0.7, color);
      }
    } else {
      drawCannon(ctx, cx, cy - h, 1.2, color);
    }
  }
  drawLevelDots(ctx, cx, cy + 8, level, specId);
}
function drawCannon(ctx, x, y, scale, color) {
  const s = scale;
  ctx.fillStyle = "#3a3030";
  ctx.fillRect(x - 2 * s, y - 3 * s, 12 * s, 5 * s);
  ctx.fillStyle = "#5a5050";
  ctx.fillRect(x - 1 * s, y - 2 * s, 10 * s, 2 * s);
  ctx.fillStyle = "#2a2020";
  ctx.beginPath();
  ctx.arc(x + 10 * s, y - 0.5 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5a4030";
  ctx.beginPath();
  ctx.arc(x + 1 * s, y + 3 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4a3020";
  ctx.beginPath();
  ctx.arc(x + 1 * s, y + 3 * s, 1.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.moveTo(x - 2 * s, y - 1 * s);
  ctx.quadraticCurveTo(x - 5 * s, y - 4 * s, x - 3 * s, y - 6 * s);
  ctx.stroke();
}
function drawBarracksTower(ctx, cx, cy, level, specId, color) {
  const h = 16 + level * 4 + (specId ? 6 : 0);
  ctx.fillStyle = "#8a7a60";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, 18, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  if (level === 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy + 2);
    ctx.lineTo(cx, cy - h);
    ctx.lineTo(cx + 14, cy + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = lighten(color, 0.15);
    ctx.beginPath();
    ctx.moveTo(cx, cy - h);
    ctx.lineTo(cx + 10, cy + 1);
    ctx.lineTo(cx + 2, cy + 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = darken(color, 0.3);
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy + 2);
    ctx.lineTo(cx, cy - 4);
    ctx.lineTo(cx + 4, cy + 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + 10, cy - 4);
    ctx.lineTo(cx + 10, cy + 2);
    ctx.stroke();
    ctx.moveTo(cx + 8, cy - 3);
    ctx.lineTo(cx + 12, cy - 3);
    ctx.stroke();
    drawSoldierFigure(ctx, cx - 8, cy - 2, color, 0.7);
    drawSoldierFigure(ctx, cx + 6, cy - 1, color, 0.7);
  } else if (level === 1) {
    ctx.fillStyle = "#6a5040";
    ctx.fillRect(cx - 12, cy - h, 24, h + 2);
    ctx.fillStyle = "#7a6050";
    ctx.fillRect(cx - 10, cy - h + 2, 20, h - 3);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy - h + 2);
    ctx.lineTo(cx, cy - h - 6);
    ctx.lineTo(cx + 15, cy - h + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#4a3020";
    ctx.fillRect(cx - 4, cy - 4, 8, 7);
    ctx.fillStyle = "#aaa";
    ctx.fillRect(cx + 8, cy - h + 6, 1, 10);
    ctx.fillRect(cx + 6, cy - h + 7, 5, 1);
    drawSoldierFigure(ctx, cx - 10, cy - 1, color, 0.7);
    drawSoldierFigure(ctx, cx - 4, cy - 2, color, 0.7);
    drawSoldierFigure(ctx, cx + 10, cy - 1, color, 0.7);
  } else {
    ctx.fillStyle = "#5a5048";
    ctx.fillRect(cx - 14, cy - h, 28, h);
    ctx.fillStyle = "#6a6058";
    ctx.fillRect(cx - 12, cy - h + 2, 24, h - 4);
    ctx.fillStyle = "#5a5048";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(cx - 13 + i * 8, cy - h - 4, 5, 6);
    }
    ctx.fillStyle = "#4a3020";
    ctx.beginPath();
    ctx.arc(cx, cy + 1, 6, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - 6, cy + 1, 12, 3);
    if (specId === "knights") {
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.moveTo(cx, cy - h - 8);
      ctx.lineTo(cx + 4, cy - h - 4);
      ctx.lineTo(cx, cy - h);
      ctx.lineTo(cx - 4, cy - h - 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,215,0,0.15)";
      ctx.beginPath();
      ctx.arc(cx, cy - h - 4, 10, 0, Math.PI * 2);
      ctx.fill();
      drawKnightFigure(ctx, cx - 10, cy - 1, 0.7);
      drawKnightFigure(ctx, cx, cy - 2, 0.7);
      drawKnightFigure(ctx, cx + 10, cy - 1, 0.7);
    } else if (specId === "rangers") {
      ctx.fillStyle = "#2d6b22";
      ctx.fillRect(cx + 10, cy - h, 2, 10);
      ctx.fillStyle = "#2d6b22";
      ctx.fillRect(cx + 12, cy - h, 5, 6);
      drawRangerFigure(ctx, cx - 10, cy - 1, 0.7);
      drawRangerFigure(ctx, cx, cy - 2, 0.7);
      drawRangerFigure(ctx, cx + 10, cy - 1, 0.7);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(cx, cy - h - 2, 2, 10);
      ctx.fillRect(cx + 2, cy - h - 2, 6, 6);
      drawSoldierFigure(ctx, cx - 10, cy - 1, color, 0.7);
      drawSoldierFigure(ctx, cx, cy - 2, color, 0.7);
      drawSoldierFigure(ctx, cx + 10, cy - 1, color, 0.7);
    }
  }
  drawLevelDots(ctx, cx, cy + 8, level, specId);
}
function drawSoldierFigure(ctx, x, y, color, scale) {
  const s = scale;
  ctx.fillStyle = color;
  ctx.fillRect(x - 2 * s, y - 2 * s, 4 * s, 5 * s);
  ctx.fillStyle = "#e8c090";
  ctx.beginPath();
  ctx.arc(x, y - 3.5 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#aaa";
  ctx.beginPath();
  ctx.arc(x, y - 4 * s, 2.2 * s, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.moveTo(x + 3 * s, y - 1 * s);
  ctx.lineTo(x + 3 * s, y + 4 * s);
  ctx.stroke();
  ctx.fillStyle = darken(color, 0.2);
  ctx.fillRect(x - 4 * s, y - 1 * s, 2 * s, 4 * s);
}
function drawKnightFigure(ctx, x, y, scale) {
  const s = scale;
  ctx.fillStyle = "#c0c0d0";
  ctx.fillRect(x - 2.5 * s, y - 2 * s, 5 * s, 5 * s);
  ctx.fillStyle = "#c0c0d0";
  ctx.beginPath();
  ctx.arc(x, y - 3.5 * s, 2.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a2a30";
  ctx.fillRect(x - 1.5 * s, y - 4 * s, 3 * s, 1.5 * s);
  ctx.fillStyle = "rgba(255,215,0,0.2)";
  ctx.beginPath();
  ctx.arc(x, y, 5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.moveTo(x + 3 * s, y - 2 * s);
  ctx.lineTo(x + 3 * s, y + 4 * s);
  ctx.stroke();
}
function drawRangerFigure(ctx, x, y, scale) {
  const s = scale;
  ctx.fillStyle = "#3a6a30";
  ctx.fillRect(x - 2 * s, y - 2 * s, 4 * s, 5 * s);
  ctx.fillStyle = "#e8c090";
  ctx.beginPath();
  ctx.arc(x, y - 3.5 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a5020";
  ctx.beginPath();
  ctx.arc(x, y - 4 * s, 2.2 * s, Math.PI * 1.1, Math.PI * 1.9);
  ctx.fill();
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 0.8 * s;
  ctx.beginPath();
  ctx.moveTo(x + 3 * s, y - 1 * s);
  ctx.lineTo(x + 4 * s, y + 3 * s);
  ctx.moveTo(x - 3 * s, y - 1 * s);
  ctx.lineTo(x - 4 * s, y + 3 * s);
  ctx.stroke();
}
function drawGenericTower(ctx, cx, cy, level, color) {
  const h = 20 + level * 6;
  ctx.fillStyle = color;
  ctx.fillRect(cx - 10, cy - h, 20, h);
  ctx.fillStyle = lighten(color, 0.15);
  ctx.fillRect(cx - 8, cy - h + 2, 8, h - 4);
  drawLevelDots(ctx, cx, cy + 6, level, null);
}
function drawLevelDots(ctx, cx, cy, level, specId) {
  if (specId) {
    ctx.fillStyle = "#ffd700";
    drawStarShape(ctx, cx, cy - 2, 4);
    return;
  }
  ctx.fillStyle = "#ffd700";
  for (let i = 0; i <= level; i++) {
    ctx.beginPath();
    ctx.arc(cx - 4 + i * 4, cy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawStarShape(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = Math.PI * i / 5 - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}
function drawTowerDirect(ctx, tower) {
  const towerData = TOWERS[tower.dataId];
  if (!towerData) return;
  const cx = tower.x;
  const cy = tower.y;
  const baseColor = towerData.color;
  const animScale = tower.animTimer > 0 ? 1 + tower.animTimer * 0.4 : 1;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(animScale, animScale);
  ctx.translate(-cx, -cy);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 20, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  switch (tower.dataId) {
    case "archer":
      drawArcherTower(ctx, cx, cy, tower.level, tower.specId, baseColor);
      break;
    case "mage":
      drawMageTower(ctx, cx, cy, tower.level, tower.specId, baseColor);
      break;
    case "cannon":
      drawCannonTower(ctx, cx, cy, tower.level, tower.specId, baseColor);
      break;
    case "barracks":
      drawBarracksTower(ctx, cx, cy, tower.level, tower.specId, baseColor);
      break;
    default:
      drawGenericTower(ctx, cx, cy, tower.level, baseColor);
  }
  if (tower.stunTimer > 0) {
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("\u26A1", cx, cy - 35);
  }
  ctx.restore();
}
function drawBuildSlotDirect(ctx, x, y, occupied, hovered, selected) {
  if (occupied) return;
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 22, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hovered ? "#e8d5a0" : "#c9a96e";
  ctx.beginPath();
  ctx.ellipse(x, y, 20, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hovered ? "#f0e0b0" : "#d4b880";
  ctx.beginPath();
  ctx.ellipse(x, y - 1, 15, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = selected ? "#ffd700" : hovered ? "#ffffff" : "rgba(90,60,30,0.6)";
  ctx.lineWidth = selected ? 3 : 2;
  ctx.beginPath();
  ctx.ellipse(x, y, 20, 12, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(120,100,60,0.4)";
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    const rx = x + Math.cos(a) * 17;
    const ry = y + Math.sin(a) * 10;
    ctx.beginPath();
    ctx.arc(rx, ry, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = hovered ? "#5c4033" : "rgba(90,60,30,0.6)";
  ctx.font = "bold 16px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("+", x, y - 1);
}

// src/rendering/UIRenderer.ts
var cachedMapCanvas = null;
function drawParchmentWorldMap(ctx, time, mousePos, levels, save, hoveredIndex, selectedLevelIndex, audioMuted) {
  if (!cachedMapCanvas) {
    cachedMapCanvas = document.createElement("canvas");
    cachedMapCanvas.width = DESIGN_WIDTH;
    cachedMapCanvas.height = DESIGN_HEIGHT;
    const cCtx = cachedMapCanvas.getContext("2d");
    renderStaticParchmentBase(cCtx, levels);
  }
  ctx.drawImage(cachedMapCanvas, 0, 0);
  drawAnimatedOceanDetails(ctx, time);
  drawCampaignPath(ctx, levels, save, time);
  const nodePositions = getLevelNodePositions(levels.length);
  for (let i = 0; i < levels.length; i++) {
    const pos = nodePositions[i];
    const level = levels[i];
    const unlocked = i === 0 || !!save.levelStars[levels[i - 1].id];
    const stars = save.levelStars[level.id] || 0;
    const isHovered = hoveredIndex === i;
    const isSelected = selectedLevelIndex === i;
    const isNextBattle = unlocked && stars === 0 && (i === 0 || (save.levelStars[levels[i - 1].id] || 0) > 0);
    drawLevelStageMarker(ctx, pos.x, pos.y, i + 1, level.name, unlocked, stars, isHovered, isSelected, isNextBattle, time);
  }
  drawWorldMapTopBar(ctx, mousePos, save.totalStars, audioMuted);
  if (selectedLevelIndex !== null && selectedLevelIndex >= 0 && selectedLevelIndex < levels.length) {
    const selLevel = levels[selectedLevelIndex];
    const selStars = save.levelStars[selLevel.id] || 0;
    drawStageBriefingModal(ctx, selLevel, selectedLevelIndex + 1, selStars, mousePos, time);
  }
}
function getLevelNodePositions(_count) {
  return [
    { x: 180, y: 440 },
    // Level 1: The Green Valley (South-West Plains)
    { x: 410, y: 360 },
    // Level 2: Forest Pass (Dense Pine Woodlands)
    { x: 650, y: 460 },
    // Level 3: Broken Bridge (Rushing River Chasm)
    { x: 880, y: 320 },
    // Level 4: Dark Swamp (Misty Mire)
    { x: 1110, y: 220 }
    // Level 5: Warlord's Gate (Volcanic Fortress Peaks)
  ];
}
function renderStaticParchmentBase(ctx, levels) {
  const bgGrad = ctx.createRadialGradient(
    DESIGN_WIDTH * 0.5,
    DESIGN_HEIGHT * 0.45,
    100,
    DESIGN_WIDTH * 0.5,
    DESIGN_HEIGHT * 0.5,
    DESIGN_WIDTH * 0.75
  );
  bgGrad.addColorStop(0, "#f5e6c8");
  bgGrad.addColorStop(0.5, "#edd5ad");
  bgGrad.addColorStop(0.85, "#d9b982");
  bgGrad.addColorStop(1, "#b88d52");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  ctx.fillStyle = "rgba(120, 80, 30, 0.03)";
  for (let i = 0; i < 6e3; i++) {
    const rx = Math.random() * DESIGN_WIDTH;
    const ry = Math.random() * DESIGN_HEIGHT;
    ctx.fillRect(rx, ry, Math.random() * 2 + 1, Math.random() * 2 + 1);
  }
  ctx.strokeStyle = "rgba(100, 60, 20, 0.08)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(DESIGN_WIDTH * 0.33, 0);
  ctx.bezierCurveTo(DESIGN_WIDTH * 0.33 + 5, 250, DESIGN_WIDTH * 0.33 - 5, 450, DESIGN_WIDTH * 0.33, DESIGN_HEIGHT);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(DESIGN_WIDTH * 0.67, 0);
  ctx.bezierCurveTo(DESIGN_WIDTH * 0.67 - 6, 200, DESIGN_WIDTH * 0.67 + 8, 500, DESIGN_WIDTH * 0.67, DESIGN_HEIGHT);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, DESIGN_HEIGHT * 0.5);
  ctx.bezierCurveTo(350, DESIGN_HEIGHT * 0.5 + 4, 850, DESIGN_HEIGHT * 0.5 - 6, DESIGN_WIDTH, DESIGN_HEIGHT * 0.5);
  ctx.stroke();
  drawParchmentStain(ctx, 220, 180, 65);
  drawParchmentStain(ctx, 960, 580, 80);
  drawOceanCoastline(ctx);
  drawMountainRanges(ctx);
  drawRiverChasm(ctx);
  drawForestPatches(ctx);
  drawCompassRose(ctx, 110, 140, 60);
  drawSeaMonster(ctx, 480, 620);
  drawCartographerNote(ctx);
  drawBurnedMapFrame(ctx);
}
function drawParchmentStain(ctx, cx, cy, r) {
  ctx.save();
  ctx.strokeStyle = "rgba(140, 90, 30, 0.08)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(150, 100, 40, 0.03)";
  ctx.fill();
  ctx.restore();
}
function drawBurnedMapFrame(ctx) {
  ctx.save();
  const grad = ctx.createRadialGradient(
    DESIGN_WIDTH / 2,
    DESIGN_HEIGHT / 2,
    DESIGN_HEIGHT * 0.35,
    DESIGN_WIDTH / 2,
    DESIGN_HEIGHT / 2,
    DESIGN_WIDTH * 0.72
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.75, "rgba(60,30,10,0.15)");
  grad.addColorStop(1, "rgba(30,15,5,0.65)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  ctx.strokeStyle = "#5a3818";
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, DESIGN_WIDTH - 32, DESIGN_HEIGHT - 32);
  ctx.lineWidth = 1;
  ctx.strokeRect(22, 22, DESIGN_WIDTH - 44, DESIGN_HEIGHT - 44);
  const corners = [
    { x: 22, y: 22 },
    { x: DESIGN_WIDTH - 22, y: 22 },
    { x: 22, y: DESIGN_HEIGHT - 22 },
    { x: DESIGN_WIDTH - 22, y: DESIGN_HEIGHT - 22 }
  ];
  corners.forEach((c) => {
    ctx.fillStyle = "#6b431e";
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}
function drawOceanCoastline(ctx) {
  ctx.save();
  ctx.fillStyle = "#c7b282";
  ctx.beginPath();
  ctx.moveTo(0, DESIGN_HEIGHT);
  ctx.lineTo(0, 560);
  ctx.bezierCurveTo(150, 580, 260, 530, 380, 570);
  ctx.bezierCurveTo(520, 620, 680, 580, 780, 640);
  ctx.bezierCurveTo(880, 700, 1050, 610, DESIGN_WIDTH, 630);
  ctx.lineTo(DESIGN_WIDTH, DESIGN_HEIGHT);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(70, 110, 130, 0.25)";
  ctx.lineWidth = 1.5;
  for (let y = 590; y < DESIGN_HEIGHT - 30; y += 18) {
    for (let x = 40; x < DESIGN_WIDTH - 60; x += 110) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 15, y - 4, x + 30, y);
      ctx.stroke();
    }
  }
  ctx.font = 'italic 16px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = "rgba(60, 80, 95, 0.45)";
  ctx.textAlign = "center";
  ctx.fillText("~  THE SOUTHERN SEA OF SERPENTS  ~", 580, 685);
  ctx.restore();
}
function drawMountainRanges(ctx) {
  ctx.save();
  drawMountainCluster(ctx, 280, 160, 12, 45);
  drawMountainCluster(ctx, 480, 130, 10, 55);
  drawMountainCluster(ctx, 1020, 120, 8, 70, true);
  drawMountainCluster(ctx, 1180, 140, 9, 60, true);
  ctx.font = 'italic 14px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = "rgba(90, 50, 20, 0.4)";
  ctx.textAlign = "center";
  ctx.fillText("CRAGGY HORN PEAKS", 380, 95);
  ctx.fillText("THE DOOM SPIRES", 1100, 75);
  ctx.restore();
}
function drawMountainCluster(ctx, cx, cy, count, avgHeight, isVolcanic = false) {
  for (let i = 0; i < count; i++) {
    const mx = cx + (i - count / 2) * (avgHeight * 0.7) + Math.sin(i * 3) * 15;
    const my = cy + Math.cos(i * 2) * 10;
    const h = avgHeight * (0.8 + Math.sin(i * 5) * 0.3);
    const w = h * 0.9;
    ctx.beginPath();
    ctx.moveTo(mx, my - h);
    ctx.lineTo(mx + w, my);
    ctx.lineTo(mx - w, my);
    ctx.closePath();
    ctx.fillStyle = isVolcanic ? "#a88975" : "#cbb596";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(mx, my - h);
    ctx.lineTo(mx + w, my);
    ctx.lineTo(mx, my);
    ctx.closePath();
    ctx.fillStyle = isVolcanic ? "rgba(60, 30, 20, 0.28)" : "rgba(90, 60, 30, 0.22)";
    ctx.fill();
    ctx.strokeStyle = "#5a3818";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(mx - w, my);
    ctx.lineTo(mx, my - h);
    ctx.lineTo(mx + w, my);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx, my - h);
    ctx.lineTo(mx + (i % 2 === 0 ? 3 : -3), my);
    ctx.stroke();
  }
}
function drawRiverChasm(ctx) {
  ctx.save();
  ctx.strokeStyle = "#8ca8b0";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(680, 0);
  ctx.bezierCurveTo(630, 180, 710, 320, 640, 480);
  ctx.bezierCurveTo(590, 560, 670, 630, 650, 720);
  ctx.stroke();
  ctx.strokeStyle = "rgba(50, 70, 90, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}
function drawForestPatches(ctx) {
  ctx.save();
  drawTreeCluster(ctx, 360, 240, 16, "#566e41");
  drawTreeCluster(ctx, 470, 290, 14, "#4c6437");
  drawTreeCluster(ctx, 830, 240, 12, "#485542");
  drawTreeCluster(ctx, 940, 370, 15, "#3e4c39");
  ctx.restore();
}
function drawTreeCluster(ctx, cx, cy, count, color) {
  for (let i = 0; i < count; i++) {
    const tx = cx + Math.sin(i * 2.3) * 45;
    const ty = cy + Math.cos(i * 1.7) * 35;
    const r = 8 + i % 4 * 2;
    ctx.strokeStyle = "#4a2f16";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx, ty + 6);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(tx, ty - 2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2d3b20";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}
function drawCompassRose(ctx, cx, cy, r) {
  ctx.save();
  ctx.strokeStyle = "#7a4e22";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
  ctx.stroke();
  const points = 8;
  for (let i = 0; i < points; i++) {
    const ang = Math.PI * 2 * i / points - Math.PI / 2;
    const isCardinal = i % 2 === 0;
    const pLen = isCardinal ? r : r * 0.65;
    const baseW = isCardinal ? 8 : 5;
    const tipX = cx + Math.cos(ang) * pLen;
    const tipY = cy + Math.sin(ang) * pLen;
    const perpAng = ang + Math.PI / 2;
    const b1x = cx + Math.cos(perpAng) * baseW;
    const b1y = cy + Math.sin(perpAng) * baseW;
    const b2x = cx - Math.cos(perpAng) * baseW;
    const b2y = cy - Math.sin(perpAng) * baseW;
    ctx.fillStyle = isCardinal ? "#6d261b" : "#5a3818";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(b1x, b1y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = isCardinal ? "#d4af37" : "#cbb596";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(b2x, b2y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.font = 'bold 13px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = "#5a2d12";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("N", cx, cy - r - 12);
  ctx.fillText("S", cx, cy + r + 12);
  ctx.fillText("E", cx + r + 12, cy);
  ctx.fillText("W", cx - r - 12, cy);
  ctx.restore();
}
function drawSeaMonster(ctx, cx, cy) {
  ctx.save();
  ctx.strokeStyle = "#4a6070";
  ctx.lineWidth = 1.8;
  ctx.fillStyle = "rgba(74, 96, 112, 0.15)";
  ctx.beginPath();
  ctx.arc(cx - 30, cy, 20, Math.PI, 0);
  ctx.arc(cx + 25, cy - 5, 26, Math.PI, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 60, cy - 2);
  ctx.quadraticCurveTo(cx + 70, cy - 35, cx + 85, cy - 30);
  ctx.lineTo(cx + 95, cy - 32);
  ctx.lineTo(cx + 88, cy - 22);
  ctx.quadraticCurveTo(cx + 78, cy - 10, cx + 75, cy);
  ctx.stroke();
  ctx.fill();
  ctx.fillStyle = "#6d261b";
  ctx.beginPath();
  ctx.arc(cx + 82, cy - 28, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(80, 120, 140, 0.4)";
  ctx.lineWidth = 1;
  [-30, 25, 68].forEach((ox) => {
    ctx.beginPath();
    ctx.arc(cx + ox, cy + 2, 14, 0, Math.PI);
    ctx.stroke();
  });
  ctx.restore();
}
function drawCartographerNote(ctx) {
  ctx.save();
  ctx.textAlign = "right";
  ctx.font = 'italic 12px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = "rgba(80, 50, 20, 0.55)";
  ctx.fillText("Realm of Valoria \u2022 Royal Cartographer Sir Ethan", DESIGN_WIDTH - 40, DESIGN_HEIGHT - 35);
  ctx.restore();
}
function drawAnimatedOceanDetails(ctx, time) {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const x = 200 + i * 140 + Math.sin(time * 0.8 + i) * 15;
    const y = 620 + i % 3 * 25;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 20, y);
    ctx.stroke();
  }
  ctx.restore();
}
function drawCampaignPath(ctx, levels, save, time) {
  const nodes = getLevelNodePositions(levels.length);
  ctx.save();
  for (let i = 0; i < nodes.length - 1; i++) {
    const p1 = nodes[i];
    const p2 = nodes[i + 1];
    const isUnlocked = i === 0 || !!save.levelStars[levels[i].id];
    const cpx = (p1.x + p2.x) / 2;
    const cpy = (p1.y + p2.y) / 2 - 40;
    ctx.strokeStyle = "rgba(60, 30, 10, 0.18)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y + 2);
    ctx.quadraticCurveTo(cpx, cpy + 2, p2.x, p2.y + 2);
    ctx.stroke();
    ctx.setLineDash([8, 7]);
    ctx.lineDashOffset = isUnlocked ? -time * 15 : 0;
    ctx.strokeStyle = isUnlocked ? "#8b4513" : "#6b584a";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(cpx, cpy, p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}
function drawLevelStageMarker(ctx, x, y, stageNum, stageName, unlocked, stars, hovered, selected, isNextBattle, time) {
  ctx.save();
  if (isNextBattle) {
    const pulse = (Math.sin(time * 3) + 1) * 0.5;
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.4 + pulse * 0.5})`;
    ctx.lineWidth = 3 + pulse * 4;
    ctx.beginPath();
    ctx.arc(x, y, 40 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();
    drawNextBattleRibbon(ctx, x, y - 56, time);
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.ellipse(x, y + 26, 28, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  if (unlocked) {
    drawStageFlag(ctx, x + 16, y - 18, stars > 0, time + stageNum);
  }
  const shieldScale = hovered || selected ? 1.12 : 1;
  ctx.translate(x, y);
  ctx.scale(shieldScale, shieldScale);
  ctx.fillStyle = unlocked ? hovered ? "#f1c40f" : "#b8860b" : "#4a4a4a";
  drawShieldShape(ctx, 0, 0, 26, 32);
  ctx.fill();
  ctx.fillStyle = unlocked ? stars > 0 ? "#8b0000" : "#2c3e50" : "#2f3542";
  drawShieldShape(ctx, 0, 0, 22, 28);
  ctx.fill();
  ctx.strokeStyle = unlocked ? "#ffd700" : "#1e272e";
  ctx.lineWidth = 2;
  drawShieldShape(ctx, 0, 0, 22, 28);
  ctx.stroke();
  ctx.fillStyle = unlocked ? "#fff2a8" : "#747d8c";
  [-14, 14].forEach((sx) => {
    ctx.beginPath();
    ctx.arc(sx, -10, 2, 0, Math.PI * 2);
    ctx.arc(sx * 0.7, 14, 2, 0, Math.PI * 2);
    ctx.fill();
  });
  if (unlocked) {
    ctx.font = 'bold 22px "MedievalSharp", Georgia, serif';
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 4;
    ctx.fillText(`${stageNum}`, 0, 2);
    ctx.shadowBlur = 0;
  } else {
    drawIronPadlock(ctx, 0, 0);
  }
  ctx.restore();
  ctx.save();
  ctx.font = 'bold 14px "MedievalSharp", Georgia, serif';
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillText(stageName, x + 1, y + 46);
  ctx.fillStyle = unlocked ? hovered ? "#ffeb3b" : "#3d2314" : "#7f8c8d";
  ctx.fillText(stageName, x, y + 45);
  if (unlocked && stars > 0) {
    for (let s = 0; s < 3; s++) {
      const starX = x - 20 + s * 20;
      const starY = y + 62;
      drawMiniStar(ctx, starX, starY, 7, s < stars);
    }
  }
  ctx.restore();
}
function drawShieldShape(ctx, cx, cy, w, h) {
  ctx.beginPath();
  ctx.moveTo(cx - w, cy - h * 0.7);
  ctx.lineTo(cx + w, cy - h * 0.7);
  ctx.lineTo(cx + w, cy + h * 0.1);
  ctx.quadraticCurveTo(cx + w, cy + h * 0.7, cx, cy + h);
  ctx.quadraticCurveTo(cx - w, cy + h * 0.7, cx - w, cy + h * 0.1);
  ctx.closePath();
}
function drawStageFlag(ctx, px, py, victory, t) {
  ctx.save();
  ctx.strokeStyle = "#5a3818";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(px, py + 20);
  ctx.lineTo(px, py - 26);
  ctx.stroke();
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(px, py - 26, 3, 0, Math.PI * 2);
  ctx.fill();
  const flap = Math.sin(t * 4) * 4;
  ctx.fillStyle = victory ? "#27ae60" : "#e74c3c";
  ctx.beginPath();
  ctx.moveTo(px, py - 24);
  ctx.quadraticCurveTo(px + 12 + flap, py - 22, px + 24 + flap, py - 20);
  ctx.lineTo(px + 18 + flap, py - 12);
  ctx.lineTo(px + 24 + flap, py - 4);
  ctx.quadraticCurveTo(px + 12, py - 6, px, py - 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}
function drawNextBattleRibbon(ctx, x, y, time) {
  ctx.save();
  const bounce = Math.sin(time * 4) * 3;
  ctx.translate(x, y + bounce);
  ctx.fillStyle = "#b71515";
  ctx.beginPath();
  ctx.moveTo(-45, -10);
  ctx.lineTo(45, -10);
  ctx.lineTo(40, 10);
  ctx.lineTo(-40, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.font = 'bold 10px "Inter", sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("\u2694 NEXT BATTLE", 0, 0);
  ctx.restore();
}
function drawIronPadlock(ctx, cx, cy) {
  ctx.save();
  ctx.strokeStyle = "#95a5a6";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy - 6, 7, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = "#7f8c8d";
  ctx.fillRect(cx - 9, cy - 3, 18, 14);
  ctx.strokeStyle = "#2c3e50";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - 9, cy - 3, 18, 14);
  ctx.fillStyle = "#1e272e";
  ctx.beginPath();
  ctx.arc(cx, cy + 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 1, cy + 2, 2, 4);
  ctx.restore();
}
function drawMiniStar(ctx, cx, cy, r, filled) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const ang = Math.PI * i / 5 - Math.PI / 2;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  if (filled) {
    const grad = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    grad.addColorStop(0, "#ffeaa7");
    grad.addColorStop(1, "#f39c12");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "#d35400";
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.fillStyle = "rgba(80, 80, 80, 0.4)";
    ctx.fill();
    ctx.strokeStyle = "rgba(40, 40, 40, 0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}
function drawStageBriefingModal(ctx, level, stageIndex, stars, mousePos, time) {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  const modalW = 540;
  const modalH = 430;
  const mx = (DESIGN_WIDTH - modalW) / 2;
  const my = (DESIGN_HEIGHT - modalH) / 2;
  drawScrollDowel(ctx, mx - 20, my - 12, modalW + 40, 24);
  drawScrollDowel(ctx, mx - 20, my + modalH - 12, modalW + 40, 24);
  const paperGrad = ctx.createLinearGradient(mx, my, mx + modalW, my + modalH);
  paperGrad.addColorStop(0, "#fef5e7");
  paperGrad.addColorStop(0.5, "#faebd7");
  paperGrad.addColorStop(1, "#f0d9b5");
  ctx.fillStyle = paperGrad;
  ctx.fillRect(mx, my, modalW, modalH);
  ctx.strokeStyle = "#8b5a2b";
  ctx.lineWidth = 2;
  ctx.strokeRect(mx + 6, my + 6, modalW - 12, modalH - 12);
  ctx.strokeStyle = "rgba(139, 90, 43, 0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + 10, my + 10, modalW - 20, modalH - 20);
  drawRoyalWaxSeal(ctx, DESIGN_WIDTH / 2, my + 24);
  ctx.font = 'bold 26px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = "#4a2505";
  ctx.textAlign = "center";
  ctx.fillText(`Stage ${stageIndex}: ${level.name}`, DESIGN_WIDTH / 2, my + 72);
  for (let s = 0; s < 3; s++) {
    drawMiniStar(ctx, DESIGN_WIDTH / 2 - 28 + s * 28, my + 102, 11, s < stars);
  }
  ctx.strokeStyle = "#a67c52";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(mx + 50, my + 124);
  ctx.lineTo(mx + modalW - 50, my + 124);
  ctx.stroke();
  ctx.font = 'italic 15px "Inter", serif';
  ctx.fillStyle = "#3e2714";
  ctx.textAlign = "center";
  const briefings = {
    level_1: {
      lore: "Goblin scouts have broken through our border outposts! Form a defensive perimeter.",
      enemyHint: "Enemies: Goblins & Dire Wolves"
    },
    level_2: {
      lore: "The enemy is pushing through the dense pine mountain pass. Beware armored Orc Warriors!",
      enemyHint: "Enemies: Orc Warriors, Wolves & Goblins"
    },
    level_3: {
      lore: "Hold the chasm crossing at all costs! Airborne Giant Bats are bypassing ground barricades.",
      enemyHint: "Enemies: Giant Bats (Flying), Orc Warriors, Wolves"
    },
    level_4: {
      lore: "The swamp waters conceal Dark Shamans who heal nearby wounded allies and colossal Trolls.",
      enemyHint: "Enemies: Dark Shaman (AoE Heals), Trolls (Regen)"
    },
    level_5: {
      lore: "THE FINAL STAND. The ferocious Orc Warlord leads the horde to tear down the Bastion gates!",
      enemyHint: "BOSS BATTLE: The Orc Warlord & Vanguard Elite"
    }
  };
  const info = briefings[level.id] || {
    lore: "Defend the fortress and drive back the invading hordes!",
    enemyHint: "Multiple enemy types approaching"
  };
  ctx.fillText(`"${info.lore}"`, DESIGN_WIDTH / 2, my + 155);
  const pillsY = my + 200;
  drawIntelPill(ctx, mx + 50, pillsY, 130, 40, `\u{1F4B0} ${level.startingGold} Gold`);
  drawIntelPill(ctx, mx + 205, pillsY, 130, 40, `\u{1F6E1} ${level.startingLives} Lives`);
  drawIntelPill(ctx, mx + 360, pillsY, 130, 40, `\u2694 ${level.waves.length} Waves`);
  ctx.font = 'bold 14px "Inter", sans-serif';
  ctx.fillStyle = "#8b0000";
  ctx.fillText(info.enemyHint, DESIGN_WIDTH / 2, my + 275);
  const btnW = 220;
  const btnH = 55;
  const btnX = DESIGN_WIDTH / 2 - btnW / 2;
  const btnY = my + 320;
  const btnHover = mousePos.x >= btnX && mousePos.x <= btnX + btnW && mousePos.y >= btnY && mousePos.y <= btnY + btnH;
  drawToBattleButton(ctx, btnX, btnY, btnW, btnH, btnHover, time);
  const closeX = mx + modalW - 32;
  const closeY = my + 22;
  const closeHover = Math.hypot(mousePos.x - closeX, mousePos.y - closeY) < 16;
  ctx.fillStyle = closeHover ? "#e74c3c" : "#7f8c8d";
  ctx.beginPath();
  ctx.arc(closeX, closeY, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = 'bold 16px "Inter", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("\u2715", closeX, closeY);
  ctx.restore();
}
function drawScrollDowel(ctx, x, y, w, h) {
  ctx.save();
  const dowelGrad = ctx.createLinearGradient(x, y, x, y + h);
  dowelGrad.addColorStop(0, "#5a3818");
  dowelGrad.addColorStop(0.3, "#8b5a2b");
  dowelGrad.addColorStop(0.7, "#6b431e");
  dowelGrad.addColorStop(1, "#3e240f");
  ctx.fillStyle = dowelGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.fillStyle = "#d4af37";
  ctx.fillRect(x, y, 14, h);
  ctx.fillRect(x + w - 14, y, 14, h);
  ctx.restore();
}
function drawRoyalWaxSeal(ctx, cx, cy) {
  ctx.save();
  ctx.fillStyle = "#a81c1c";
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#801010";
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy + 4);
  ctx.lineTo(cx + 7, cy + 4);
  ctx.lineTo(cx + 8, cy - 2);
  ctx.lineTo(cx + 4, cy);
  ctx.lineTo(cx, cy - 5);
  ctx.lineTo(cx - 4, cy);
  ctx.lineTo(cx - 8, cy - 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawIntelPill(ctx, x, y, w, h, text) {
  ctx.save();
  ctx.fillStyle = "rgba(235, 215, 180, 0.8)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = "#b89467";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.font = 'bold 15px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = "#4a2505";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.restore();
}
function drawToBattleButton(ctx, x, y, w, h, hovered, time) {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 4, w, h, 8);
  ctx.fill();
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  if (hovered) {
    grad.addColorStop(0, "#e74c3c");
    grad.addColorStop(0.5, "#c0392b");
    grad.addColorStop(1, "#962d22");
  } else {
    grad.addColorStop(0, "#c0392b");
    grad.addColorStop(0.5, "#a93226");
    grad.addColorStop(1, "#78281f");
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = hovered ? "#ffeaa7" : "#f1c40f";
  ctx.lineWidth = hovered ? 3 : 2;
  ctx.stroke();
  if (hovered) {
    const sheenX = x + time * 250 % (w * 1.5);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.clip();
    const sGrad = ctx.createLinearGradient(sheenX - 30, y, sheenX + 30, y);
    sGrad.addColorStop(0, "rgba(255,255,255,0)");
    sGrad.addColorStop(0.5, "rgba(255,255,255,0.4)");
    sGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sGrad;
    ctx.fillRect(sheenX - 30, y, 60, h);
    ctx.restore();
  }
  ctx.font = 'bold 20px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 4;
  ctx.fillText("\u2694  TO BATTLE!  \u2694", x + w / 2, y + h / 2);
  ctx.restore();
}
function drawWorldMapTopBar(ctx, mousePos, totalStars, audioMuted) {
  ctx.save();
  const h = 56;
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, "#3e240f");
  bgGrad.addColorStop(0.5, "#5a3818");
  bgGrad.addColorStop(1, "#2c1809");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, DESIGN_WIDTH, h);
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(DESIGN_WIDTH, h);
  ctx.stroke();
  ctx.fillStyle = "#ffd700";
  for (let x = 30; x < DESIGN_WIDTH; x += 120) {
    ctx.beginPath();
    ctx.arc(x, h - 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const backHover = mousePos.x >= 20 && mousePos.x <= 130 && mousePos.y >= 10 && mousePos.y <= 46;
  drawSmallWoodButton(ctx, 20, 10, 110, 36, "\u2190 MENU", backHover);
  ctx.font = 'bold 26px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = "#ffd866";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 6;
  ctx.fillText("\u2694  KINGDOM CAMPAIGN  \u2694", DESIGN_WIDTH / 2, h / 2);
  ctx.shadowBlur = 0;
  const starMedalX = DESIGN_WIDTH - 190;
  drawMiniStar(ctx, starMedalX, h / 2, 13, true);
  ctx.font = 'bold 20px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = "#ffd700";
  ctx.textAlign = "left";
  ctx.fillText(`${totalStars} / 15`, starMedalX + 20, h / 2);
  const soundHover = mousePos.x >= DESIGN_WIDTH - 70 && mousePos.x <= DESIGN_WIDTH - 20 && mousePos.y >= 10 && mousePos.y <= 46;
  drawSmallWoodButton(ctx, DESIGN_WIDTH - 70, 10, 50, 36, audioMuted ? "\u{1F507}" : "\u{1F50A}", soundHover);
  ctx.restore();
}
function drawSmallWoodButton(ctx, x, y, w, h, text, hovered) {
  ctx.save();
  ctx.fillStyle = hovered ? "#8b5a2b" : "#5a3818";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = hovered ? "#ffd700" : "#8b6914";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.font = 'bold 15px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = hovered ? "#ffffff" : "#f0e6d2";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.restore();
}
function drawEpicTitleScreen(ctx, time, mousePos, audioMuted, activeLoreModal) {
  ctx.save();
  const skyGrad = ctx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
  skyGrad.addColorStop(0, "#0a0d1a");
  skyGrad.addColorStop(0.4, "#131b2e");
  skyGrad.addColorStop(0.8, "#1e293b");
  skyGrad.addColorStop(1, "#0f172a");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  const moonX = DESIGN_WIDTH * 0.78;
  const moonY = 120;
  const moonGrad = ctx.createRadialGradient(moonX, moonY, 15, moonX, moonY, 140);
  moonGrad.addColorStop(0, "rgba(255, 255, 240, 0.95)");
  moonGrad.addColorStop(0.2, "rgba(255, 250, 220, 0.6)");
  moonGrad.addColorStop(0.6, "rgba(180, 200, 240, 0.15)");
  moonGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 140, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fffef0";
  ctx.beginPath();
  ctx.arc(moonX, moonY, 40, 0, Math.PI * 2);
  ctx.fill();
  drawNightClouds(ctx, time);
  drawFortressRamparts(ctx, time);
  drawBrazier(ctx, 160, DESIGN_HEIGHT - 170, time);
  drawBrazier(ctx, DESIGN_WIDTH - 160, DESIGN_HEIGHT - 170, time + 2);
  drawFloatingEmbers(ctx, time);
  drawTitleHeraldicCrest(ctx, time);
  const playX = DESIGN_WIDTH / 2 - 130;
  const playY = DESIGN_HEIGHT / 2 + 80;
  const playHover = mousePos.x >= playX && mousePos.x <= playX + 260 && mousePos.y >= playY && mousePos.y <= playY + 56;
  drawMenuWoodButton(ctx, playX, playY, 260, 56, "\u2694  TO BATTLE  \u2694", playHover, true);
  const loreX = DESIGN_WIDTH / 2 - 130;
  const loreY = playY + 68;
  const loreHover = mousePos.x >= loreX && mousePos.x <= loreX + 260 && mousePos.y >= loreY && mousePos.y <= loreY + 46;
  drawMenuWoodButton(ctx, loreX, loreY, 260, 46, "\u{1F4DC}  BESTIARY & LORE", loreHover, false);
  const soundHover = mousePos.x >= DESIGN_WIDTH - 80 && mousePos.x <= DESIGN_WIDTH - 24 && mousePos.y >= 20 && mousePos.y <= 60;
  drawMenuWoodButton(ctx, DESIGN_WIDTH - 80, 20, 56, 40, audioMuted ? "\u{1F507}" : "\u{1F50A}", soundHover, false);
  ctx.font = '13px "Inter", sans-serif';
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.textAlign = "center";
  ctx.fillText("v1.0 Kingdom Edition \u2022 Built with Procedural Canvas & Web Audio", DESIGN_WIDTH / 2, DESIGN_HEIGHT - 22);
  if (activeLoreModal) {
    drawLoreBestiaryModal(ctx, mousePos);
  }
  ctx.restore();
}
function drawNightClouds(ctx, time) {
  ctx.save();
  ctx.fillStyle = "rgba(25, 35, 55, 0.45)";
  for (let i = 0; i < 4; i++) {
    const cx = (i * 380 + time * 12) % (DESIGN_WIDTH + 300) - 150;
    const cy = 90 + i % 2 * 50;
    ctx.beginPath();
    ctx.arc(cx, cy, 70, 0, Math.PI * 2);
    ctx.arc(cx + 60, cy - 20, 90, 0, Math.PI * 2);
    ctx.arc(cx + 140, cy, 65, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function drawFortressRamparts(ctx, _time) {
  ctx.save();
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.moveTo(0, DESIGN_HEIGHT);
  ctx.lineTo(0, 360);
  ctx.lineTo(250, 290);
  ctx.lineTo(550, 340);
  ctx.lineTo(820, 270);
  ctx.lineTo(1100, 330);
  ctx.lineTo(DESIGN_WIDTH, 280);
  ctx.lineTo(DESIGN_WIDTH, DESIGN_HEIGHT);
  ctx.closePath();
  ctx.fill();
  const wallTop = DESIGN_HEIGHT - 200;
  const wallGrad = ctx.createLinearGradient(0, wallTop, 0, DESIGN_HEIGHT);
  wallGrad.addColorStop(0, "#334155");
  wallGrad.addColorStop(0.3, "#1e293b");
  wallGrad.addColorStop(1, "#0f172a");
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, wallTop, DESIGN_WIDTH, DESIGN_HEIGHT - wallTop);
  const crenW = 48;
  const crenH = 32;
  const gapW = 32;
  for (let x = 0; x < DESIGN_WIDTH; x += crenW + gapW) {
    ctx.fillRect(x, wallTop - crenH, crenW, crenH);
  }
  const gateW = 280;
  const gateH = 220;
  const gx = DESIGN_WIDTH / 2 - gateW / 2;
  const gy = wallTop - 10;
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.roundRect(gx - 20, gy - 20, gateW + 40, gateH + 20, [30, 30, 0, 0]);
  ctx.fill();
  ctx.fillStyle = "#090d16";
  ctx.beginPath();
  ctx.roundRect(gx, gy, gateW, gateH, [20, 20, 0, 0]);
  ctx.fill();
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 5;
  for (let bx = gx + 25; bx < gx + gateW - 10; bx += 28) {
    ctx.beginPath();
    ctx.moveTo(bx, gy);
    ctx.lineTo(bx, gy + gateH);
    ctx.stroke();
  }
  ctx.restore();
}
function drawBrazier(ctx, cx, cy, time) {
  ctx.save();
  ctx.fillStyle = "#475569";
  ctx.fillRect(cx - 18, cy, 36, 120);
  ctx.fillStyle = "#64748b";
  ctx.fillRect(cx - 24, cy, 48, 14);
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.moveTo(cx - 35, cy);
  ctx.lineTo(cx + 35, cy);
  ctx.lineTo(cx + 24, cy + 24);
  ctx.lineTo(cx - 24, cy + 24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 3;
  ctx.stroke();
  const glowGrad = ctx.createRadialGradient(cx, cy - 20, 5, cx, cy - 20, 90);
  glowGrad.addColorStop(0, "rgba(255, 160, 0, 0.8)");
  glowGrad.addColorStop(0.4, "rgba(230, 80, 0, 0.4)");
  glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(cx, cy - 20, 90, 0, Math.PI * 2);
  ctx.fill();
  for (let f = 0; f < 5; f++) {
    const flameH = 45 + Math.sin(time * 8 + f * 1.5) * 12;
    const flameW = 12 + Math.cos(time * 6 + f) * 4;
    const fx = cx + (f - 2) * 8 + Math.sin(time * 5 + f) * 3;
    ctx.fillStyle = f % 2 === 0 ? "#ff4500" : "#ffa500";
    ctx.beginPath();
    ctx.moveTo(fx - flameW, cy);
    ctx.quadraticCurveTo(fx, cy - flameH * 0.7, fx, cy - flameH);
    ctx.quadraticCurveTo(fx, cy - flameH * 0.7, fx + flameW, cy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#ffff66";
  ctx.beginPath();
  ctx.arc(cx, cy - 10, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function drawFloatingEmbers(ctx, time) {
  ctx.save();
  for (let i = 0; i < 40; i++) {
    const seed = i * 137.5;
    const x = (seed * 11 + time * 20) % DESIGN_WIDTH;
    const y = DESIGN_HEIGHT - (seed * 7 + time * (40 + i % 5 * 15)) % (DESIGN_HEIGHT * 0.7);
    const size = 1.5 + i % 3;
    ctx.fillStyle = i % 2 === 0 ? "rgba(255, 170, 0, 0.75)" : "rgba(255, 70, 0, 0.6)";
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function drawTitleHeraldicCrest(ctx, time) {
  ctx.save();
  const cx = DESIGN_WIDTH / 2;
  const cy = 190;
  const floatOffset = Math.sin(time * 1.5) * 5;
  ctx.translate(cx, cy + floatOffset);
  drawCrossedSwords(ctx);
  ctx.fillStyle = "#d4af37";
  drawShieldShape(ctx, 0, 0, 68, 85);
  ctx.fill();
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 3;
  drawShieldShape(ctx, 0, 0, 64, 80);
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  drawShieldShape(ctx, 0, 0, 62, 78);
  ctx.clip();
  ctx.fillStyle = "#8b0000";
  ctx.fillRect(-70, -90, 70, 90);
  ctx.fillRect(0, 0, 70, 90);
  ctx.fillStyle = "#104e8b";
  ctx.fillRect(0, -90, 70, 90);
  ctx.fillRect(-70, 0, 70, 90);
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(0, -10, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawCrestCrown(ctx, 0, -82);
  drawTitleRibbon(ctx, 0, 42);
  ctx.restore();
}
function drawCrossedSwords(ctx) {
  [-1, 1].forEach((dir) => {
    ctx.save();
    ctx.rotate(dir * Math.PI / 4);
    const bladeGrad = ctx.createLinearGradient(-5, -160, 5, -160);
    bladeGrad.addColorStop(0, "#cbd5e1");
    bladeGrad.addColorStop(0.5, "#ffffff");
    bladeGrad.addColorStop(1, "#94a3b8");
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(0, -170);
    ctx.lineTo(8, -150);
    ctx.lineTo(6, 40);
    ctx.lineTo(-6, 40);
    ctx.lineTo(-8, -150);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#d4af37";
    ctx.fillRect(-24, 40, 48, 8);
    ctx.fillStyle = "#5c2c16";
    ctx.fillRect(-4, 48, 8, 28);
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(0, 80, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}
function drawCrestCrown(ctx, cx, cy) {
  ctx.save();
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.moveTo(cx - 28, cy + 6);
  ctx.lineTo(cx + 28, cy + 6);
  ctx.lineTo(cx + 32, cy - 14);
  ctx.lineTo(cx + 16, cy - 6);
  ctx.lineTo(cx, cy - 20);
  ctx.lineTo(cx - 16, cy - 6);
  ctx.lineTo(cx - 32, cy - 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#e74c3c";
  [-28, 0, 28].forEach((ox) => {
    ctx.beginPath();
    ctx.arc(cx + ox * 0.9, cy - 14 + Math.abs(ox) * 0.15, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}
function drawTitleRibbon(ctx, cx, cy) {
  ctx.save();
  const rw = 260;
  const rh = 46;
  ctx.fillStyle = "#8b5a2b";
  [-1, 1].forEach((dir) => {
    ctx.beginPath();
    ctx.moveTo(cx + dir * rw, cy - 5);
    ctx.lineTo(cx + dir * (rw + 40), cy + 12);
    ctx.lineTo(cx + dir * rw, cy + rh + 8);
    ctx.closePath();
    ctx.fill();
  });
  const rGrad = ctx.createLinearGradient(cx - rw, cy, cx + rw, cy);
  rGrad.addColorStop(0, "#5a3818");
  rGrad.addColorStop(0.2, "#8b5a2b");
  rGrad.addColorStop(0.5, "#ad7539");
  rGrad.addColorStop(0.8, "#8b5a2b");
  rGrad.addColorStop(1, "#5a3818");
  ctx.fillStyle = rGrad;
  ctx.beginPath();
  ctx.roundRect(cx - rw, cy, rw * 2, rh, 8);
  ctx.fill();
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.font = 'bold 36px "MedievalSharp", Georgia, serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#1e1106";
  ctx.fillText("\u2694  LAST BASTION  \u2694", cx + 2, cy + rh / 2 + 2);
  ctx.fillStyle = "#ffd866";
  ctx.fillText("\u2694  LAST BASTION  \u2694", cx, cy + rh / 2);
  ctx.font = 'italic 15px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = "#e0c080";
  ctx.fillText("\u2014  FRONTIERS OF THE REALM  \u2014", cx, cy + rh + 22);
  ctx.restore();
}
function drawMenuWoodButton(ctx, x, y, w, h, text, hovered, isPrimary = false) {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 4, w, h, 8);
  ctx.fill();
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  if (isPrimary) {
    if (hovered) {
      grad.addColorStop(0, "#d35400");
      grad.addColorStop(0.5, "#e67e22");
      grad.addColorStop(1, "#b94600");
    } else {
      grad.addColorStop(0, "#c0392b");
      grad.addColorStop(0.5, "#d35400");
      grad.addColorStop(1, "#962d22");
    }
  } else {
    if (hovered) {
      grad.addColorStop(0, "#784d28");
      grad.addColorStop(0.5, "#996335");
      grad.addColorStop(1, "#613c1c");
    } else {
      grad.addColorStop(0, "#4e3118");
      grad.addColorStop(0.5, "#6b4320");
      grad.addColorStop(1, "#3b230e");
    }
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.fillStyle = hovered ? "#ffeaa7" : "#ffd700";
  [
    { rx: x + 8, ry: y + 8 },
    { rx: x + w - 8, ry: y + 8 },
    { rx: x + 8, ry: y + h - 8 },
    { rx: x + w - 8, ry: y + h - 8 }
  ].forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.rx, p.ry, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.strokeStyle = hovered ? "#ffd700" : "#8b6914";
  ctx.lineWidth = hovered ? 2.5 : 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.stroke();
  ctx.font = `bold ${isPrimary ? 20 : 16}px "MedievalSharp", Georgia, serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 4;
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.restore();
}
function drawLoreBestiaryModal(ctx, mousePos) {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  const w = 680;
  const h = 480;
  const x = (DESIGN_WIDTH - w) / 2;
  const y = (DESIGN_HEIGHT - h) / 2;
  ctx.fillStyle = "#faebd7";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = "#8b5a2b";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.font = 'bold 24px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = "#4a2505";
  ctx.textAlign = "center";
  ctx.fillText("\u{1F4D6}  KINGDOM BESTIARY & WAR ROOM  \u{1F4D6}", DESIGN_WIDTH / 2, y + 42);
  ctx.font = '14px "Inter", sans-serif';
  ctx.fillStyle = "#3e240f";
  ctx.textAlign = "left";
  const loreItems = [
    { title: "\u{1F3F9} ARCHER TOWERS", desc: "Rapid fire bows with long range. Upgrades into Sharpshooters or Rapid Volley." },
    { title: "\u{1F6E1} BARRACKS SOLDIERS", desc: "Spawns 2 armored infantry onto the road to halt advancing creeps in melee combat." },
    { title: "\u26A1 MAGE TOWERS", desc: "Pierces heavy iron armor with arcane bolts. Upgrades into Arcane Blast or Slow Hex." },
    { title: "\u{1F4A3} CANNON TOWERS", desc: "Lobs heavy explosive shells dealing area splash damage against swarms of goblins." },
    { title: "\u{1F525} GOD SPELLS", desc: "Press [1] for Rain of Fire meteors; press [2] to summon emergency militia reinforcements." },
    { title: "\u{1F479} ENEMY THREATS", desc: "Dark Shamans heal allies, Trolls self-regenerate, and the Orc Warlord stuns towers!" }
  ];
  loreItems.forEach((item, idx) => {
    const iy = y + 80 + idx * 56;
    ctx.font = 'bold 15px "MedievalSharp", Georgia, serif';
    ctx.fillStyle = "#8b0000";
    ctx.fillText(item.title, x + 40, iy);
    ctx.font = '13px "Inter", sans-serif';
    ctx.fillStyle = "#2c1809";
    ctx.fillText(item.desc, x + 40, iy + 20);
  });
  const btnX = DESIGN_WIDTH / 2 - 60;
  const btnY = y + h - 55;
  const btnHover = mousePos.x >= btnX && mousePos.x <= btnX + 120 && mousePos.y >= btnY && mousePos.y <= btnY + 40;
  drawSmallWoodButton(ctx, btnX, btnY, 120, 40, "CLOSE", btnHover);
  ctx.restore();
}
function drawMedievalTopHUD(ctx, gold, lives, maxLives, waveIndex, totalWaves, paused, gameSpeed, waitingForWave, waveCountdown, earlyBonusGold, mousePos, time) {
  ctx.save();
  const barH = 50;
  const bgGrad = ctx.createLinearGradient(0, 0, 0, barH);
  bgGrad.addColorStop(0, "#2c1809");
  bgGrad.addColorStop(0.5, "#4a2c14");
  bgGrad.addColorStop(1, "#1e0f05");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, DESIGN_WIDTH, barH);
  ctx.strokeStyle = "#b8860b";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, barH);
  ctx.lineTo(DESIGN_WIDTH, barH);
  ctx.stroke();
  drawGoldHUD(ctx, 40, barH / 2, gold);
  drawLivesHUD(ctx, 160, barH / 2, lives, maxLives);
  drawWaveBannerHUD(ctx, DESIGN_WIDTH / 2, barH / 2, waveIndex + 1, totalWaves);
  const pauseX = DESIGN_WIDTH - 120;
  const speedX = DESIGN_WIDTH - 65;
  const pauseHover = mousePos.x >= pauseX && mousePos.x <= pauseX + 44 && mousePos.y >= 8 && mousePos.y <= 42;
  const speedHover = mousePos.x >= speedX && mousePos.x <= speedX + 44 && mousePos.y >= 8 && mousePos.y <= 42;
  drawSmallWoodButton(ctx, pauseX, 8, 44, 34, paused ? "\u25B6" : "\u275A\u275A", pauseHover);
  drawSmallWoodButton(ctx, speedX, 8, 44, 34, gameSpeed === 2 ? "2x" : "1x", speedHover);
  if (waitingForWave && waveCountdown > 0) {
    drawEarlyWaveMedallion(ctx, waveCountdown, earlyBonusGold, mousePos, time);
  }
  ctx.restore();
}
function drawGoldHUD(ctx, x, y, gold) {
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(x, y - 2, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#b8860b";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.font = 'bold 11px "Inter", sans-serif';
  ctx.fillStyle = "#7a5200";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("$", x, y - 2);
  ctx.font = 'bold 20px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = "#ffdf78";
  ctx.textAlign = "left";
  ctx.fillText(`${gold}`, x + 16, y);
}
function drawLivesHUD(ctx, x, y, lives, _maxLives) {
  ctx.fillStyle = "#e74c3c";
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.bezierCurveTo(x - 8, y - 14, x - 14, y - 4, x, y + 8);
  ctx.bezierCurveTo(x + 14, y - 4, x + 8, y - 14, x, y - 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#c0392b";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.font = 'bold 20px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = lives <= 5 ? "#ff6b6b" : "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`${lives}`, x + 16, y);
}
function drawWaveBannerHUD(ctx, cx, cy, current, total) {
  ctx.save();
  ctx.fillStyle = "#3a200e";
  ctx.beginPath();
  ctx.roundRect(cx - 90, cy - 16, 180, 32, 6);
  ctx.fill();
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(cx - 65, cy, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = 'bold 16px "MedievalSharp", Georgia, serif';
  ctx.fillStyle = "#f5e6c8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`Wave ${current} / ${total}`, cx + 6, cy);
  ctx.restore();
}
function drawEarlyWaveMedallion(ctx, countdown, bonusGold, mousePos, time) {
  ctx.save();
  const cx = DESIGN_WIDTH / 2;
  const cy = DESIGN_HEIGHT - 45;
  const isHovered = Math.hypot(mousePos.x - cx, mousePos.y - cy) < 40;
  const pulse = (Math.sin(time * 6) + 1) * 0.5;
  ctx.strokeStyle = `rgba(231, 76, 60, ${0.4 + pulse * 0.5})`;
  ctx.lineWidth = 3 + pulse * 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 32 + pulse * 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = isHovered ? "#c0392b" : "#962d22";
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.font = 'bold 18px "Inter", sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("\u2694", cx, cy - 8);
  ctx.font = 'bold 12px "Inter", sans-serif';
  ctx.fillStyle = "#ffd700";
  ctx.fillText(`${Math.ceil(countdown)}s (+${bonusGold}g)`, cx, cy + 12);
  ctx.restore();
}

// src/core/renderer.ts
var Renderer = class {
  canvas;
  ctx;
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  resize() {
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    const vp = updateViewport(cssW, cssH);
    this.canvas.width = Math.round(cssW * vp.dpr);
    this.canvas.height = Math.round(cssH * vp.dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.applyWorldTransform();
  }
  /**
   * A0: uniform scale + centring, so the 1280×720 design space keeps its
   * aspect ratio on any window instead of being stretched per axis.
   */
  applyWorldTransform() {
    const ctx = this.ctx;
    const vp = getViewport();
    ctx.setTransform(
      vp.dpr * vp.scale,
      0,
      0,
      vp.dpr * vp.scale,
      vp.dpr * vp.offsetX,
      vp.dpr * vp.offsetY
    );
  }
  /** Design-space margin UI should keep clear of device edges. */
  get safeArea() {
    return SAFE_AREA;
  }
  /** Letterbox scale factor, exposed for diagnostics. */
  get viewportScale() {
    return getViewport().scale;
  }
  clear() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#07070c";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.applyWorldTransform();
    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  }
  // ─── Map Drawing (Kingdom Rush Visuals) ──────────────────────
  drawBackground(levelId = "level_1", path = []) {
    drawBackgroundDirect(this.ctx, levelId, path);
  }
  drawPath(waypoints, levelId = "level_1") {
    drawPathDirect(this.ctx, levelId, waypoints);
  }
  drawSpawnGate(pos) {
    drawSpawnGateDirect(this.ctx, pos);
  }
  drawBase(pos) {
    drawBaseDirect(this.ctx, pos);
  }
  drawBuildSlot(x, y, occupied, hovered, selected) {
    drawBuildSlotDirect(this.ctx, x, y, occupied, hovered, selected);
  }
  drawRangeCircle(x, y, range) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(x, y, range, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  // ─── Props / Decorations ────────────────────────────────────
  drawTree(x, y, size, levelId = "level_1", variant = 0) {
    drawTreeDirect(this.ctx, x, y, size, levelId, variant);
  }
  drawRock(x, y, size, levelId = "level_1", variant = 0) {
    drawRockDirect(this.ctx, x, y, size, levelId, variant);
  }
  drawBush(x, y, size, levelId = "level_1", variant = 0) {
    drawBushDirect(this.ctx, x, y, size, levelId, variant);
  }
  drawMushroom(x, y, size, levelId = "level_1") {
    drawMushroomDirect(this.ctx, x, y, size, levelId);
  }
  drawStump(x, y, size, levelId = "level_1") {
    drawStumpDirect(this.ctx, x, y, size, levelId);
  }
  drawBones(x, y, size) {
    drawBonesDirect(this.ctx, x, y, size);
  }
  drawSign(x, y, size, levelId = "level_1") {
    drawSignDirect(this.ctx, x, y, size, levelId);
  }
  // ─── Vignette ───────────────────────────────────────────────
  drawVignette() {
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(
      DESIGN_WIDTH / 2,
      DESIGN_HEIGHT / 2,
      DESIGN_HEIGHT * 0.3,
      DESIGN_WIDTH / 2,
      DESIGN_HEIGHT / 2,
      DESIGN_WIDTH * 0.8
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  }
  // ─── UI Elements ────────────────────────────────────────────
  drawText(text, x, y, color, size, align = "center", font = "Inter", bold = false) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.font = `${bold ? "bold " : ""}${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  }
  drawTextWithShadow(text, x, y, color, size, align = "center", font = "MedievalSharp", bold = false) {
    this.drawText(text, x + 2, y + 2, "rgba(0,0,0,0.5)", size, align, font, bold);
    this.drawText(text, x, y, color, size, align, font, bold);
  }
  drawButton(x, y, w, h, text, hovered, enabled = true) {
    const ctx = this.ctx;
    const cornerRadius = 8;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    this.roundRect(x + 2, y + 3, w, h, cornerRadius);
    ctx.fill();
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    if (!enabled) {
      grad.addColorStop(0, "#555");
      grad.addColorStop(1, "#444");
    } else if (hovered) {
      grad.addColorStop(0, "#f0c040");
      grad.addColorStop(1, "#d4a020");
    } else {
      grad.addColorStop(0, "#c9a030");
      grad.addColorStop(1, "#a08020");
    }
    ctx.fillStyle = grad;
    this.roundRect(x, y, w, h, cornerRadius);
    ctx.fill();
    ctx.strokeStyle = enabled ? "rgba(255,220,100,0.5)" : "rgba(100,100,100,0.3)";
    ctx.lineWidth = 2;
    this.roundRect(x, y, w, h, cornerRadius);
    ctx.stroke();
    ctx.fillStyle = enabled ? "#2a1a0a" : "#888";
    ctx.font = `bold ${Math.min(h * 0.45, 18)}px Inter`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + w / 2, y + h / 2);
  }
  roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  drawPanel(x, y, w, h, alpha = 0.85) {
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(0,0,0,${alpha * 0.3})`;
    this.roundRect(x + 3, y + 3, w, h, 12);
    ctx.fill();
    ctx.fillStyle = `rgba(30,25,20,${alpha})`;
    this.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = `rgba(200,170,100,${alpha * 0.4})`;
    ctx.lineWidth = 2;
    this.roundRect(x, y, w, h, 12);
    ctx.stroke();
  }
  drawStar(cx, cy, size, filled) {
    const ctx = this.ctx;
    const spikes = 5;
    const outerRadius = size;
    const innerRadius = size * 0.45;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const ang = Math.PI * i / spikes - Math.PI / 2;
      const x = cx + Math.cos(ang) * radius;
      const y = cy + Math.sin(ang) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    if (filled) {
      const grad = ctx.createLinearGradient(cx, cy - size, cx, cy + size);
      grad.addColorStop(0, "#ffd700");
      grad.addColorStop(1, "#e6a800");
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = "rgba(100,100,100,0.4)";
    }
    ctx.fill();
    ctx.strokeStyle = filled ? "#b38600" : "rgba(80,80,80,0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  drawTitleScreen(time, pointer, audioMuted, activeLoreModal) {
    drawEpicTitleScreen(this.ctx, time, pointer, audioMuted, activeLoreModal);
  }
  drawWorldMap(time, pointer, levels, save, hoveredIndex, selectedLevelIndex, audioMuted) {
    drawParchmentWorldMap(this.ctx, time, pointer, levels, save, hoveredIndex, selectedLevelIndex, audioMuted);
  }
  drawTopHUD(gold, lives, maxLives, waveIndex, totalWaves, paused, gameSpeed, waitingForWave, waveCountdown, earlyBonusGold, pointer, time) {
    drawMedievalTopHUD(
      this.ctx,
      gold,
      lives,
      maxLives,
      waveIndex,
      totalWaves,
      paused,
      gameSpeed,
      waitingForWave,
      waveCountdown,
      earlyBonusGold,
      pointer,
      time
    );
  }
  getLevelPositions(count) {
    return getLevelNodePositions(count);
  }
};

// src/core/input.ts
var InputManager = class {
  canvas;
  state = {
    pointer: { x: 0, y: 0 },
    isDown: false,
    justClicked: false,
    clickPos: { x: 0, y: 0 },
    keysJustPressed: /* @__PURE__ */ new Set()
  };
  constructor(canvas) {
    this.canvas = canvas;
    this.setupListeners();
  }
  screenToGame(screenX, screenY) {
    return screenToWorld(screenX, screenY, this.canvas.getBoundingClientRect());
  }
  setupListeners() {
    this.canvas.addEventListener("mousemove", (e) => {
      this.state.pointer = this.screenToGame(e.clientX, e.clientY);
    });
    this.canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        this.state.isDown = true;
        const pos = this.screenToGame(e.clientX, e.clientY);
        this.state.pointer = pos;
        this.state.justClicked = true;
        this.state.clickPos = { ...pos };
      }
    });
    this.canvas.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        this.state.isDown = false;
      }
    });
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const pos = this.screenToGame(touch.clientX, touch.clientY);
      this.state.pointer = pos;
      this.state.isDown = true;
      this.state.justClicked = true;
      this.state.clickPos = { ...pos };
    }, { passive: false });
    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.state.pointer = this.screenToGame(touch.clientX, touch.clientY);
    }, { passive: false });
    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.state.isDown = false;
    }, { passive: false });
    window.addEventListener("keydown", (e) => {
      if (e.key === "F1") e.preventDefault();
      this.state.keysJustPressed.add(e.key.toLowerCase());
    });
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }
  getState() {
    return this.state;
  }
  /** Call at end of frame to consume one-shot flags */
  consumeClick() {
    this.state.justClicked = false;
    this.state.keysJustPressed.clear();
  }
};

// src/core/pool.ts
var ObjectPool = class {
  pool = [];
  active = [];
  activeIndex = /* @__PURE__ */ new Map();
  factory;
  reset;
  /** Hard cap on simultaneously active objects. */
  maxSize;
  constructor(factory, reset, initialSize = 50, maxSize = Number.POSITIVE_INFINITY) {
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
  acquire() {
    if (this.pool.length === 0 && this.active.length >= this.maxSize) {
      this.release(this.active[0]);
    }
    const obj = this.pool.length > 0 ? this.pool.pop() : this.factory();
    this.activeIndex.set(obj, this.active.length);
    this.active.push(obj);
    return obj;
  }
  /** Same as acquire() but returns null instead of recycling an older object. */
  tryAcquire() {
    if (this.pool.length === 0 && this.active.length >= this.maxSize) return null;
    return this.acquire();
  }
  release(obj) {
    const idx = this.activeIndex.get(obj);
    if (idx === void 0) return;
    const last = this.active[this.active.length - 1];
    this.active[idx] = last;
    this.activeIndex.set(last, idx);
    this.active.pop();
    this.activeIndex.delete(obj);
    this.reset(obj);
    this.pool.push(obj);
  }
  releaseAll() {
    for (const obj of this.active) {
      this.reset(obj);
      this.pool.push(obj);
    }
    this.active.length = 0;
    this.activeIndex.clear();
  }
  getActive() {
    return this.active;
  }
  get activeCount() {
    return this.active.length;
  }
  get pooledCount() {
    return this.pool.length;
  }
};

// src/core/utils.ts
function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
function distSq(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function lerpVec(a, b, t) {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}
function pointInCircle(p, center, radius) {
  return distSq(p, center) <= radius * radius;
}

// src/core/save.ts
var SAVE_KEY = "last_bastion_save";
var DEFAULT_SAVE = {
  levelStars: {},
  upgrades: {},
  totalStars: 0,
  endlessBestWave: 0,
  tutorialDismissed: false,
  settings: {
    muted: false
  }
};
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SAVE, ...parsed };
    }
  } catch (e) {
    console.warn("Failed to load save data:", e);
  }
  return { ...DEFAULT_SAVE };
}
function writeSave(data) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save data:", e);
  }
}

// src/rendering/EnemyRenderer.ts
function drawGoblin(ctx, cx, cy, frame, isHit) {
  const bob = [0, -1, 0, 1][frame];
  const legOffset = [-2, 0, 2, 0][frame];
  const skin = isHit ? "#ffffff" : "#6da632";
  const skinDark = isHit ? "#ffffff" : "#4e7b22";
  const cloth = isHit ? "#ffffff" : "#5c4033";
  const daggerSteel = isHit ? "#ffffff" : "#d1d5db";
  ctx.fillStyle = skinDark;
  ctx.fillRect(cx - 5 + legOffset, cy + 5, 3, 5);
  ctx.fillRect(cx + 2 - legOffset, cy + 5, 3, 5);
  ctx.fillStyle = cloth;
  ctx.fillRect(cx - 5, cy - 2 + bob, 10, 8);
  ctx.fillStyle = "#3a2820";
  ctx.fillRect(cx - 5, cy + 3 + bob, 10, 2);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 6 + bob, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skinDark;
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 6 + bob);
  ctx.lineTo(cx - 10, cy - 9 + bob);
  ctx.lineTo(cx - 4, cy - 3 + bob);
  ctx.moveTo(cx + 5, cy - 6 + bob);
  ctx.lineTo(cx + 10, cy - 9 + bob);
  ctx.lineTo(cx + 4, cy - 3 + bob);
  ctx.fill();
  ctx.fillStyle = isHit ? "#ffffff" : "#ffea00";
  ctx.fillRect(cx - 3, cy - 7 + bob, 2, 2);
  ctx.fillRect(cx + 1, cy - 7 + bob, 2, 2);
  ctx.fillStyle = isHit ? "#ffffff" : "#b91c1c";
  ctx.fillRect(cx - 2, cy - 7 + bob, 1, 1);
  ctx.fillRect(cx + 2, cy - 7 + bob, 1, 1);
  ctx.fillStyle = "#1c1917";
  ctx.fillRect(cx - 2, cy - 3 + bob, 4, 1.5);
  ctx.fillStyle = "#fef08a";
  ctx.fillRect(cx - 1, cy - 3.5 + bob, 1, 1);
  ctx.fillStyle = skin;
  ctx.fillRect(cx + 4, cy - 2 + bob, 4, 3);
  ctx.fillStyle = daggerSteel;
  ctx.beginPath();
  ctx.moveTo(cx + 7, cy - 2 + bob);
  ctx.lineTo(cx + 14, cy - 5 + bob);
  ctx.lineTo(cx + 8, cy + 1 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#92400e";
  ctx.fillRect(cx + 5, cy - 1 + bob, 3, 2);
}
function drawWolfRider(ctx, cx, cy, frame, isHit) {
  const gallop = [-1, 1, -1, 2][frame];
  const legSwing = [4, -3, -4, 3][frame];
  const wolfFur = isHit ? "#ffffff" : "#6b7280";
  const wolfDark = isHit ? "#ffffff" : "#4b5563";
  const wolfBelly = isHit ? "#ffffff" : "#9ca3af";
  const goblinSkin = isHit ? "#ffffff" : "#6da632";
  ctx.fillStyle = wolfDark;
  ctx.beginPath();
  ctx.ellipse(cx - 14, cy - 2 + gallop, 6, 2.5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = wolfDark;
  ctx.fillRect(cx - 11 - legSwing, cy + 4, 3.5, 8);
  ctx.fillRect(cx - 7 + legSwing, cy + 4, 3.5, 8);
  ctx.fillStyle = wolfFur;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 1 + gallop, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = wolfBelly;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4 + gallop, 9, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = wolfFur;
  ctx.fillRect(cx + 5 + legSwing, cy + 4, 3.5, 8);
  ctx.fillRect(cx + 9 - legSwing, cy + 4, 3.5, 8);
  ctx.fillStyle = wolfFur;
  ctx.beginPath();
  ctx.ellipse(cx + 10, cy - 3 + gallop, 6, 5, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = wolfBelly;
  ctx.fillRect(cx + 13, cy - 3 + gallop, 5, 4);
  ctx.fillStyle = "#111827";
  ctx.fillRect(cx + 17, cy - 3 + gallop, 2, 2);
  ctx.fillStyle = wolfDark;
  ctx.beginPath();
  ctx.moveTo(cx + 8, cy - 7 + gallop);
  ctx.lineTo(cx + 11, cy - 12 + gallop);
  ctx.lineTo(cx + 13, cy - 6 + gallop);
  ctx.fill();
  ctx.fillStyle = isHit ? "#ffffff" : "#f59e0b";
  ctx.fillRect(cx + 11, cy - 4 + gallop, 2, 2);
  ctx.fillStyle = "#451a03";
  ctx.fillRect(cx - 5, cy - 6 + gallop, 8, 3);
  ctx.fillStyle = "#78350f";
  ctx.fillRect(cx - 3, cy - 11 + gallop, 6, 6);
  ctx.fillStyle = goblinSkin;
  ctx.beginPath();
  ctx.arc(cx, cy - 13 + gallop, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4e7b22";
  ctx.beginPath();
  ctx.moveTo(cx - 3, cy - 13 + gallop);
  ctx.lineTo(cx - 7, cy - 16 + gallop);
  ctx.lineTo(cx - 2, cy - 11 + gallop);
  ctx.fill();
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(cx + 1, cy - 14 + gallop, 1.5, 1.5);
  ctx.strokeStyle = isHit ? "#ffffff" : "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx + 4, cy - 16 + gallop, 6, -Math.PI * 0.4, Math.PI * 0.1);
  ctx.stroke();
}
function drawOrcWarrior(ctx, cx, cy, frame, isHit) {
  const stomp = [0, -1, 0, 1][frame];
  const legOffset = [-2.5, 0, 2.5, 0][frame];
  const orcSkin = isHit ? "#ffffff" : "#4d7c0f";
  const orcDark = isHit ? "#ffffff" : "#365314";
  const iron = isHit ? "#ffffff" : "#475569";
  const steel = isHit ? "#ffffff" : "#94a3b8";
  const leather = isHit ? "#ffffff" : "#713f12";
  ctx.fillStyle = leather;
  ctx.fillRect(cx - 7 + legOffset, cy + 7, 5, 6);
  ctx.fillRect(cx + 2 - legOffset, cy + 7, 5, 6);
  ctx.fillStyle = orcDark;
  ctx.fillRect(cx - 6 + legOffset, cy + 4, 4, 4);
  ctx.fillRect(cx + 3 - legOffset, cy + 4, 4, 4);
  ctx.fillStyle = iron;
  ctx.fillRect(cx - 8, cy + 2 + stomp, 16, 4);
  ctx.fillStyle = "#ca8a04";
  ctx.fillRect(cx - 2, cy + 3 + stomp, 4, 2);
  ctx.fillStyle = orcSkin;
  ctx.fillRect(cx - 9, cy - 7 + stomp, 18, 10);
  ctx.fillStyle = leather;
  ctx.fillRect(cx - 8, cy - 6 + stomp, 3, 9);
  ctx.fillRect(cx + 5, cy - 6 + stomp, 3, 9);
  ctx.fillStyle = iron;
  ctx.fillRect(cx - 12, cy - 9 + stomp, 5, 5);
  ctx.fillRect(cx + 7, cy - 9 + stomp, 5, 5);
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy - 9 + stomp);
  ctx.lineTo(cx - 10, cy - 13 + stomp);
  ctx.lineTo(cx - 8, cy - 9 + stomp);
  ctx.fill();
  ctx.fillStyle = orcSkin;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 10 + stomp, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = iron;
  ctx.fillRect(cx - 6, cy - 15 + stomp, 12, 5);
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 14 + stomp);
  ctx.lineTo(cx - 10, cy - 18 + stomp);
  ctx.lineTo(cx - 3, cy - 12 + stomp);
  ctx.moveTo(cx + 5, cy - 14 + stomp);
  ctx.lineTo(cx + 10, cy - 18 + stomp);
  ctx.lineTo(cx + 3, cy - 12 + stomp);
  ctx.fill();
  ctx.fillStyle = isHit ? "#ffffff" : "#dc2626";
  ctx.fillRect(cx - 4, cy - 11 + stomp, 2, 1.5);
  ctx.fillRect(cx + 2, cy - 11 + stomp, 2, 1.5);
  ctx.fillStyle = "#fef08a";
  ctx.fillRect(cx - 3, cy - 8 + stomp, 1.5, 2.5);
  ctx.fillRect(cx + 1.5, cy - 8 + stomp, 1.5, 2.5);
  ctx.fillStyle = "#78350f";
  ctx.beginPath();
  ctx.arc(cx - 11, cy - 2 + stomp, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = iron;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.arc(cx - 11, cy - 2 + stomp, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = iron;
  ctx.fillRect(cx + 9, cy - 3 + stomp, 2.5, 10);
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.moveTo(cx + 10, cy - 3 + stomp);
  ctx.lineTo(cx + 16, cy - 9 + stomp);
  ctx.lineTo(cx + 16, cy - 1 + stomp);
  ctx.lineTo(cx + 10, cy + 2 + stomp);
  ctx.closePath();
  ctx.fill();
}
function drawDarkShaman(ctx, cx, cy, frame, gameTime, isHit) {
  const floatBob = Math.sin(gameTime * 5) * 2;
  const robe = isHit ? "#ffffff" : "#3b0764";
  const robeDark = isHit ? "#ffffff" : "#1e1b4b";
  const gold = isHit ? "#ffffff" : "#fbbf24";
  const cyanAura = isHit ? "#ffffff" : "#06b6d4";
  ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 8, 12, 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 12 + floatBob);
  ctx.lineTo(cx + 8, cy + 7 + floatBob);
  ctx.lineTo(cx - 8, cy + 7 + floatBob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = robeDark;
  ctx.fillRect(cx - 2, cy - 4 + floatBob, 4, 11);
  ctx.fillStyle = gold;
  ctx.fillRect(cx - 7, cy + 6 + floatBob, 14, 1.5);
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.arc(cx, cy - 11 + floatBob, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(cx, cy - 10 + floatBob, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = cyanAura;
  ctx.fillRect(cx - 3, cy - 11 + floatBob, 2, 2);
  ctx.fillRect(cx + 1, cy - 11 + floatBob, 2, 2);
  ctx.fillStyle = "#5c4033";
  ctx.fillRect(cx + 8, cy - 16 + floatBob, 2.5, 24);
  ctx.fillStyle = isHit ? "#ffffff" : "#f8fafc";
  ctx.beginPath();
  ctx.arc(cx + 9, cy - 18 + floatBob, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = cyanAura;
  ctx.fillRect(cx + 7.5, cy - 19 + floatBob, 1.5, 1.5);
  ctx.fillRect(cx + 10, cy - 19 + floatBob, 1.5, 1.5);
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx + 7, cy - 20 + floatBob);
  ctx.lineTo(cx + 4, cy - 23 + floatBob);
  ctx.moveTo(cx + 11, cy - 20 + floatBob);
  ctx.lineTo(cx + 14, cy - 23 + floatBob);
  ctx.stroke();
}
function drawGiantBat(ctx, cx, cy, frame, gameTime, isHit) {
  const flapAngle = Math.sin(gameTime * 14) * 0.45;
  const wingColor = isHit ? "#ffffff" : "#1e1b2e";
  const bodyColor = isHit ? "#ffffff" : "#312e45";
  const furColor = isHit ? "#ffffff" : "#47425e";
  const eyes = isHit ? "#ffffff" : "#ef4444";
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 5, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = furColor;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 1, 3.5, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(cx, cy - 7, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#635b7a";
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy - 8);
  ctx.lineTo(cx - 7, cy - 15);
  ctx.lineTo(cx - 2, cy - 10);
  ctx.moveTo(cx + 4, cy - 8);
  ctx.lineTo(cx + 7, cy - 15);
  ctx.lineTo(cx + 2, cy - 10);
  ctx.fill();
  ctx.fillStyle = eyes;
  ctx.fillRect(cx - 3, cy - 8, 1.5, 1.5);
  ctx.fillRect(cx + 1.5, cy - 8, 1.5, 1.5);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cx - 2, cy - 5, 1, 1.5);
  ctx.fillRect(cx + 1, cy - 5, 1, 1.5);
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
  ctx.strokeStyle = "#47425e";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-18, -10);
  ctx.stroke();
  ctx.restore();
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
  ctx.strokeStyle = "#47425e";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(18, -10);
  ctx.stroke();
  ctx.restore();
}
function drawTroll(ctx, cx, cy, frame, isHit) {
  const sway = [0, -1, 0, 1][frame];
  const legOffset = [-3, 0, 3, 0][frame];
  const skin = isHit ? "#ffffff" : "#3f6212";
  const moss = isHit ? "#ffffff" : "#65a30d";
  const hide = isHit ? "#ffffff" : "#451a03";
  const wood = isHit ? "#ffffff" : "#573318";
  const iron = isHit ? "#ffffff" : "#64748b";
  ctx.fillStyle = "#273b0e";
  ctx.fillRect(cx - 9 + legOffset, cy + 9, 6, 6);
  ctx.fillRect(cx + 3 - legOffset, cy + 9, 6, 6);
  ctx.fillStyle = skin;
  ctx.fillRect(cx - 8 + legOffset, cy + 5, 5, 5);
  ctx.fillRect(cx + 3 - legOffset, cy + 5, 5, 5);
  ctx.fillStyle = hide;
  ctx.fillRect(cx - 10, cy + 3 + sway, 20, 5);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 4 + sway, 12, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = moss;
  ctx.beginPath();
  ctx.ellipse(cx - 5, cy - 10 + sway, 5, 3, -0.2, 0, Math.PI * 2);
  ctx.ellipse(cx + 4, cy - 11 + sway, 6, 3.5, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 13 + sway, 7, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = isHit ? "#ffffff" : "#facc15";
  ctx.fillRect(cx - 4, cy - 14 + sway, 2, 2);
  ctx.fillRect(cx + 2, cy - 14 + sway, 2, 2);
  ctx.fillStyle = "#fef3c7";
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy - 9 + sway);
  ctx.lineTo(cx - 4, cy - 14 + sway);
  ctx.lineTo(cx - 2, cy - 10 + sway);
  ctx.moveTo(cx + 4, cy - 9 + sway);
  ctx.lineTo(cx + 4, cy - 14 + sway);
  ctx.lineTo(cx + 2, cy - 10 + sway);
  ctx.fill();
  ctx.fillStyle = wood;
  ctx.fillRect(cx + 11, cy - 18 + sway, 5, 24);
  ctx.fillStyle = "#3f2512";
  ctx.fillRect(cx + 11, cy - 14 + sway, 5, 2);
  ctx.fillRect(cx + 11, cy - 6 + sway, 5, 2);
  ctx.fillStyle = iron;
  ctx.fillRect(cx + 9, cy - 16 + sway, 2, 2);
  ctx.fillRect(cx + 16, cy - 12 + sway, 2, 2);
  ctx.fillRect(cx + 9, cy - 8 + sway, 2, 2);
}
function drawOrcWarlord(ctx, cx, cy, frame, gameTime, isHit) {
  const stomp = [0, -1.5, 0, 1.5][frame];
  const legOffset = [-4, 0, 4, 0][frame];
  const plate = isHit ? "#ffffff" : "#18181b";
  const trim = isHit ? "#ffffff" : "#dc2626";
  const gold = isHit ? "#ffffff" : "#eab308";
  const steel = isHit ? "#ffffff" : "#cbd5e1";
  const auraPulse = Math.sin(gameTime * 6) * 3;
  ctx.strokeStyle = "rgba(220, 38, 38, 0.5)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 12, 18 + auraPulse, 7 + auraPulse * 0.4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = plate;
  ctx.fillRect(cx - 10 + legOffset, cy + 9, 7, 7);
  ctx.fillRect(cx + 3 - legOffset, cy + 9, 7, 7);
  ctx.fillStyle = trim;
  ctx.fillRect(cx - 10 + legOffset, cy + 14, 7, 2);
  ctx.fillRect(cx + 3 - legOffset, cy + 14, 7, 2);
  ctx.fillStyle = plate;
  ctx.fillRect(cx - 9 + legOffset, cy + 5, 5, 5);
  ctx.fillRect(cx + 4 - legOffset, cy + 5, 5, 5);
  ctx.fillStyle = "#991b1b";
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy - 14 + stomp);
  ctx.lineTo(cx - 16, cy + 10 + stomp);
  ctx.lineTo(cx + 16, cy + 10 + stomp);
  ctx.lineTo(cx + 14, cy - 14 + stomp);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = plate;
  ctx.fillRect(cx - 12, cy + 2 + stomp, 24, 5);
  ctx.fillStyle = gold;
  ctx.fillRect(cx - 3, cy + 2 + stomp, 6, 4);
  ctx.fillStyle = plate;
  ctx.fillRect(cx - 13, cy - 12 + stomp, 26, 15);
  ctx.fillStyle = trim;
  ctx.fillRect(cx - 11, cy - 10 + stomp, 3, 11);
  ctx.fillRect(cx + 8, cy - 10 + stomp, 3, 11);
  ctx.fillStyle = plate;
  ctx.fillRect(cx - 18, cy - 16 + stomp, 8, 8);
  ctx.fillRect(cx + 10, cy - 16 + stomp, 8, 8);
  ctx.fillStyle = gold;
  ctx.strokeRect(cx - 18, cy - 16 + stomp, 8, 8);
  ctx.strokeRect(cx + 10, cy - 16 + stomp, 8, 8);
  ctx.fillStyle = steel;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(cx - 17 + i * 2.5, cy - 20 + stomp, 2, 4);
    ctx.fillRect(cx + 11 + i * 2.5, cy - 20 + stomp, 2, 4);
  }
  ctx.fillStyle = plate;
  ctx.fillRect(cx - 8, cy - 22 + stomp, 16, 9);
  ctx.fillStyle = trim;
  ctx.fillRect(cx - 8, cy - 22 + stomp, 16, 2);
  ctx.fillStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy - 20 + stomp);
  ctx.quadraticCurveTo(cx - 16, cy - 24 + stomp, cx - 18, cy - 30 + stomp);
  ctx.lineTo(cx - 5, cy - 18 + stomp);
  ctx.moveTo(cx + 7, cy - 20 + stomp);
  ctx.quadraticCurveTo(cx + 16, cy - 24 + stomp, cx + 18, cy - 30 + stomp);
  ctx.lineTo(cx + 5, cy - 18 + stomp);
  ctx.fill();
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(cx - 5, cy - 17 + stomp, 3, 2);
  ctx.fillRect(cx + 2, cy - 17 + stomp, 3, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cx - 4, cy - 17 + stomp, 1, 1);
  ctx.fillRect(cx + 3, cy - 17 + stomp, 1, 1);
  ctx.fillStyle = "#451a03";
  ctx.fillRect(cx + 15, cy - 26 + stomp, 3.5, 36);
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.moveTo(cx + 16, cy - 24 + stomp);
  ctx.lineTo(cx + 8, cy - 28 + stomp);
  ctx.lineTo(cx + 8, cy - 14 + stomp);
  ctx.lineTo(cx + 16, cy - 18 + stomp);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 17, cy - 24 + stomp);
  ctx.lineTo(cx + 26, cy - 28 + stomp);
  ctx.lineTo(cx + 26, cy - 14 + stomp);
  ctx.lineTo(cx + 17, cy - 18 + stomp);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = trim;
  ctx.fillRect(cx + 10, cy - 22 + stomp, 3, 2);
  ctx.fillRect(cx + 21, cy - 22 + stomp, 3, 2);
}
function drawGenericEnemy(ctx, cx, cy, size, color, frame, isHit) {
  const bob = [0, -1, 0, 1][frame];
  ctx.fillStyle = isHit ? "#ffffff" : color;
  ctx.beginPath();
  ctx.arc(cx, cy + bob, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#18181b";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = isHit ? "#ffffff" : "#fbbf24";
  ctx.fillRect(cx - 3, cy - 2 + bob, 2, 2);
  ctx.fillRect(cx + 1, cy - 2 + bob, 2, 2);
}
function drawFrostEffect(ctx, cx, cy, size) {
  ctx.fillStyle = "rgba(147, 197, 253, 0.6)";
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.8, cy + size * 0.4);
  ctx.lineTo(cx - size * 1.1, cy);
  ctx.lineTo(cx - size * 0.5, cy + size * 0.2);
  ctx.moveTo(cx + size * 0.8, cy + size * 0.4);
  ctx.lineTo(cx + size * 1.1, cy);
  ctx.lineTo(cx + size * 0.5, cy + size * 0.2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 1;
  ctx.stroke();
}
function drawEnemyDirect(ctx, enemy, gameTime = 0) {
  if (!enemy.alive) return;
  const enemyDef = ENEMIES[enemy.dataId];
  const baseSize = enemyDef ? enemyDef.size : enemy.size;
  const animSpeed = enemy.flying ? 8 : enemy.speed * 0.12;
  const walkCycle = Math.floor((gameTime * animSpeed + enemy.id * 1.7) % 4);
  const isHit = enemy.hitFlash > 0.05;
  const facingLeft = enemy.facingLeft ?? false;
  const cx = enemy.x;
  const yOffset = enemy.flying ? Math.sin(gameTime * 7 + enemy.id) * 3 - 6 : 0;
  const cy = enemy.y + yOffset;
  ctx.save();
  if (!enemy.flying) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + baseSize * 0.5, baseSize * 1.2, baseSize * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    const shadowBob = Math.sin(gameTime * 6) * 2;
    ctx.ellipse(cx, cy + 22 + shadowBob, baseSize * 1.1, baseSize * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (facingLeft) {
    ctx.translate(cx, cy);
    ctx.scale(-1, 1);
    ctx.translate(-cx, -cy);
  }
  switch (enemy.dataId) {
    case "goblin":
      drawGoblin(ctx, cx, cy, walkCycle, isHit);
      break;
    case "wolf":
      drawWolfRider(ctx, cx, cy, walkCycle, isHit);
      break;
    case "orc_warrior":
      drawOrcWarrior(ctx, cx, cy, walkCycle, isHit);
      break;
    case "dark_shaman":
      drawDarkShaman(ctx, cx, cy, walkCycle, gameTime, isHit);
      break;
    case "bat":
      drawGiantBat(ctx, cx, cy, walkCycle, gameTime, isHit);
      break;
    case "troll":
      drawTroll(ctx, cx, cy, walkCycle, isHit);
      break;
    case "orc_warlord":
      drawOrcWarlord(ctx, cx, cy, walkCycle, gameTime, isHit);
      break;
    default:
      drawGenericEnemy(ctx, cx, cy, baseSize, enemy.color, walkCycle, isHit);
  }
  if (enemy.slowed > 0) {
    drawFrostEffect(ctx, cx, cy, baseSize);
  }
  ctx.restore();
  const isBoss = enemy.dataId === "orc_warlord";
  if (enemy.hp < enemy.maxHp || isBoss) {
    drawHealthBarDirect(ctx, enemy, baseSize, yOffset);
  }
}
function drawHealthBarDirect(ctx, enemy, baseSize, yOffset) {
  const isBoss = enemy.dataId === "orc_warlord";
  const barW = isBoss ? 64 : Math.max(26, baseSize * 2.5);
  const barH = isBoss ? 6 : 4;
  const bx = enemy.x - barW / 2;
  const by = enemy.y - baseSize * 1.1 - 7 + yOffset;
  const hpRatio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(bx - 1, by, barW + 2, barH + 2);
  ctx.fillStyle = "#221111";
  ctx.fillRect(bx, by, barW, barH);
  const fillW = Math.max(0, Math.round(barW * hpRatio));
  if (fillW > 0) {
    let gradColor1;
    let gradColor2;
    if (hpRatio > 0.5) {
      gradColor1 = "#38b000";
      gradColor2 = "#70e000";
    } else if (hpRatio > 0.25) {
      gradColor1 = "#d97706";
      gradColor2 = "#fbbf24";
    } else {
      gradColor1 = "#b91c1c";
      gradColor2 = "#ef4444";
    }
    const grad = ctx.createLinearGradient(bx, by, bx, by + barH);
    grad.addColorStop(0, gradColor2);
    grad.addColorStop(1, gradColor1);
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, fillW, barH);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(bx, by, fillW, 1);
  }
  ctx.strokeStyle = isBoss ? "#ffd700" : "#4a4440";
  ctx.lineWidth = 1;
  ctx.strokeRect(bx - 0.5, by - 0.5, barW + 1, barH + 1);
  if (enemy.armor > 0.15) {
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.arc(bx - 3, by + barH / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  if (enemy.magicResist > 0.15) {
    ctx.fillStyle = "#a855f7";
    ctx.beginPath();
    ctx.arc(bx + barW + 3, by + barH / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawSoldierDirect(ctx, soldier, gameTime = 0) {
  const cx = soldier.x;
  const cy = soldier.y;
  const facingLeft = soldier.facingLeft ?? false;
  const isHit = (soldier.hitFlash ?? 0) > 0.05;
  const frame = Math.floor((gameTime * 7 + soldier.id * 2) % 4);
  const bob = [0, -1, 0, 1][frame];
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  if (facingLeft) {
    ctx.translate(cx, cy);
    ctx.scale(-1, 1);
    ctx.translate(-cx, -cy);
  }
  if (soldier.type === "knight") {
    const plate = isHit ? "#ffffff" : "#cbd5e1";
    const gold = isHit ? "#ffffff" : "#ffd700";
    const cape = isHit ? "#ffffff" : "#1e3a8a";
    ctx.fillStyle = cape;
    ctx.fillRect(cx - 7, cy - 8 + bob, 4, 12);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(cx - 4, cy + 4, 3, 5);
    ctx.fillRect(cx + 1, cy + 4, 3, 5);
    ctx.fillStyle = plate;
    ctx.fillRect(cx - 5, cy - 6 + bob, 10, 10);
    ctx.fillStyle = gold;
    ctx.fillRect(cx - 1, cy - 5 + bob, 2, 8);
    ctx.fillStyle = plate;
    ctx.fillRect(cx - 4, cy - 13 + bob, 8, 7);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(cx - 2, cy - 17 + bob, 4, 4);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(cx - 3, cy - 10 + bob, 6, 1.5);
    ctx.fillStyle = "#1e3a8a";
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
    ctx.strokeStyle = isHit ? "#ffffff" : "#f8fafc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy + 2 + bob);
    ctx.lineTo(cx + 9, cy - 10 + bob);
    ctx.stroke();
  } else if (soldier.type === "reinforcement") {
    const cloth = isHit ? "#ffffff" : "#78350f";
    const skin = isHit ? "#ffffff" : "#fed7aa";
    ctx.fillStyle = "#451a03";
    ctx.fillRect(cx - 4, cy + 4, 3, 4);
    ctx.fillRect(cx + 1, cy + 4, 3, 4);
    ctx.fillStyle = cloth;
    ctx.fillRect(cx - 4, cy - 5 + bob, 8, 9);
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(cx, cy - 8 + bob, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a16207";
    ctx.fillRect(cx - 4, cy - 12 + bob, 8, 3);
    ctx.fillStyle = "#713f12";
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 1 + bob, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy + 4 + bob);
    ctx.lineTo(cx + 7, cy - 12 + bob);
    ctx.stroke();
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(cx + 7, cy - 12 + bob);
    ctx.lineTo(cx + 6, cy - 15 + bob);
    ctx.lineTo(cx + 8, cy - 15 + bob);
    ctx.closePath();
    ctx.fill();
  } else {
    const armor = isHit ? "#ffffff" : "#94a3b8";
    const tabard = isHit ? "#ffffff" : "#2563eb";
    const skin = isHit ? "#ffffff" : "#fed7aa";
    ctx.fillStyle = "#475569";
    ctx.fillRect(cx - 4, cy + 4, 3, 4);
    ctx.fillRect(cx + 1, cy + 4, 3, 4);
    ctx.fillStyle = tabard;
    ctx.fillRect(cx - 4, cy - 5 + bob, 8, 9);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx - 1, cy - 5 + bob, 2, 9);
    ctx.fillStyle = armor;
    ctx.beginPath();
    ctx.arc(cx, cy - 9 + bob, 4, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - 6, cy - 9 + bob, 12, 1.5);
    ctx.fillStyle = skin;
    ctx.fillRect(cx - 3, cy - 8 + bob, 6, 3);
    ctx.fillStyle = tabard;
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 1 + bob, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = armor;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = armor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + 4, cy + 1 + bob);
    ctx.lineTo(cx + 8, cy - 7 + bob);
    ctx.stroke();
  }
  ctx.restore();
  if (soldier.hp < soldier.maxHp) {
    const barW = 16;
    const barH = 3;
    const bx = cx - barW / 2;
    const by = cy - 16;
    const ratio = Math.max(0, Math.min(1, soldier.hp / soldier.maxHp));
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = ratio > 0.4 ? "#22c55e" : "#ef4444";
    ctx.fillRect(bx, by, barW * ratio, barH);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx, by, barW, barH);
  }
}

// src/rendering/ProjectileRenderer.ts
function drawProjectileDirect(ctx, proj) {
  if (!proj.active) return;
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
  let angle = 0;
  if (proj.trail.length > 0) {
    const last = proj.trail[proj.trail.length - 1];
    angle = Math.atan2(proj.y - last.y, proj.x - last.x);
  }
  const isCannon = proj.splashRadius > 0;
  const isMagic = proj.damageType === "magic";
  ctx.save();
  ctx.translate(proj.x, proj.y);
  if (isCannon) {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.arc(0, 2, 6, 0, Math.PI * 2);
    ctx.fill();
    const grad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 6);
    grad.addColorStop(0, "#64748b");
    grad.addColorStop(0.5, "#334155");
    grad.addColorStop(1, "#0f172a");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(-2, -2, 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (isMagic) {
    const glowGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 9);
    glowGrad.addColorStop(0, "rgba(168, 85, 247, 0.9)");
    glowGrad.addColorStop(0.5, "rgba(139, 92, 246, 0.4)");
    glowGrad.addColorStop(1, "rgba(124, 58, 237, 0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.rotate(angle);
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(8, 0);
    ctx.stroke();
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(8, -2.5);
    ctx.lineTo(12, 0);
    ctx.lineTo(8, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e2e8f0";
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

// src/data/spells.ts
var SPELLS = [
  {
    id: "rain_of_fire",
    name: "Rain of Fire",
    icon: "\u{1F525}",
    cooldown: 30,
    damage: 80,
    radius: 80,
    delay: 0.8,
    count: 5,
    description: "Call down a devastating rain of fire on a target area."
  },
  {
    id: "reinforcements",
    name: "Reinforcements",
    icon: "\u{1F6E1}",
    cooldown: 20,
    duration: 15,
    count: 2,
    damage: 8,
    radius: 40,
    description: "Summon 2 temporary soldiers at a target point on the path."
  }
];
function getSpell(id) {
  const spell = SPELLS.find((s) => s.id === id);
  if (!spell) throw new Error(`Unknown spell: ${id}`);
  return spell;
}

// src/core/audio.ts
var audioCtx = null;
var muted = false;
var musicGain = null;
var masterGain = null;
var musicInterval = null;
function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = muted ? 0 : 0.7;
      masterGain.connect(audioCtx.destination);
    }
  } else if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}
function setMuted(val) {
  muted = val;
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(muted ? 0 : 0.7, audioCtx.currentTime);
  }
  if (muted) {
    stopMusic();
  }
}
function isMuted() {
  return muted;
}
function toggleMute() {
  setMuted(!muted);
  return muted;
}
var noiseBuffer = null;
function getNoiseBuffer(ctx) {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    const bufferSize = ctx.sampleRate * 2;
    noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }
  return noiseBuffer;
}
function playSound(name) {
  if (muted) return;
  initAudio();
  if (!audioCtx || !masterGain) return;
  const now = audioCtx.currentTime;
  try {
    switch (name) {
      case "arrow_shoot": {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.09);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.09);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.09);
        break;
      }
      case "arrow_hit": {
        const noise = audioCtx.createBufferSource();
        noise.buffer = getNoiseBuffer(audioCtx);
        const filter = audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(450, now);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.06);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        noise.start(now);
        noise.stop(now + 0.06);
        break;
      }
      case "magic_shoot": {
        const carrier = audioCtx.createOscillator();
        const mod = audioCtx.createOscillator();
        const modGain = audioCtx.createGain();
        const mainGain = audioCtx.createGain();
        carrier.type = "sine";
        carrier.frequency.setValueAtTime(540, now);
        carrier.frequency.exponentialRampToValueAtTime(220, now + 0.16);
        mod.type = "sawtooth";
        mod.frequency.setValueAtTime(320, now);
        modGain.gain.setValueAtTime(400, now);
        modGain.gain.exponentialRampToValueAtTime(20, now + 0.16);
        mod.connect(carrier.frequency);
        carrier.connect(mainGain);
        mainGain.connect(masterGain);
        mainGain.gain.setValueAtTime(0.3, now);
        mainGain.gain.exponentialRampToValueAtTime(1e-3, now + 0.16);
        carrier.start(now);
        mod.start(now);
        carrier.stop(now + 0.16);
        mod.stop(now + 0.16);
        break;
      }
      case "magic_hit": {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.15);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.15);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }
      case "cannon_shoot": {
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.28);
        oscGain.gain.setValueAtTime(0.65, now);
        oscGain.gain.exponentialRampToValueAtTime(1e-3, now + 0.28);
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.28);
        const noise = audioCtx.createBufferSource();
        noise.buffer = getNoiseBuffer(audioCtx);
        const filter = audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.linearRampToValueAtTime(100, now + 0.25);
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(1e-3, now + 0.25);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain);
        noise.start(now);
        noise.stop(now + 0.25);
        break;
      }
      case "cannon_hit": {
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(70, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.35);
        oscGain.gain.setValueAtTime(0.7, now);
        oscGain.gain.exponentialRampToValueAtTime(1e-3, now + 0.35);
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.35);
        break;
      }
      case "sword_clash": {
        [1850, 2680].forEach((freq) => {
          if (!audioCtx || !masterGain) return;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.12);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.12);
        });
        break;
      }
      case "soldier_rally":
      case "reinforce": {
        const notes = [392, 523, 659, 784];
        notes.forEach((freq, idx) => {
          if (!audioCtx || !masterGain) return;
          const t = now + idx * 0.08;
          const osc = audioCtx.createOscillator();
          const filter = audioCtx.createBiquadFilter();
          const gain = audioCtx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, t);
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(1400, t);
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(1e-3, t + 0.14);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          osc.start(t);
          osc.stop(t + 0.14);
        });
        break;
      }
      case "meteor_fall": {
        const noise = audioCtx.createBufferSource();
        noise.buffer = getNoiseBuffer(audioCtx);
        const filter = audioCtx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);
        filter.Q.value = 3;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 0.35);
        gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.45);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        noise.start(now);
        noise.stop(now + 0.45);
        break;
      }
      case "meteor_impact": {
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.exponentialRampToValueAtTime(18, now + 0.6);
        oscGain.gain.setValueAtTime(0.9, now);
        oscGain.gain.exponentialRampToValueAtTime(1e-3, now + 0.6);
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.6);
        const noise = audioCtx.createBufferSource();
        noise.buffer = getNoiseBuffer(audioCtx);
        const filter = audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.linearRampToValueAtTime(80, now + 0.5);
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(1e-3, now + 0.5);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain);
        noise.start(now);
        noise.stop(now + 0.5);
        break;
      }
      case "shaman_heal": {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          if (!audioCtx || !masterGain) return;
          const t = now + idx * 0.06;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(1e-3, t + 0.22);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(t);
          osc.stop(t + 0.22);
        });
        break;
      }
      case "warlord_roar": {
        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.linearRampToValueAtTime(75, now + 0.5);
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(380, now);
        gain.gain.setValueAtTime(0.65, now);
        gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.6);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.6);
        break;
      }
      case "wave_horn": {
        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.linearRampToValueAtTime(165, now + 0.18);
        osc.frequency.linearRampToValueAtTime(130, now + 0.65);
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(750, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.45, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.7);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.7);
        break;
      }
      case "button_click": {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(720, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.04);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }
      case "gold_gain": {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc1.type = "sine";
        osc2.type = "sine";
        osc1.frequency.setValueAtTime(1975, now);
        osc2.frequency.setValueAtTime(2637, now);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.12);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(masterGain);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.12);
        osc2.stop(now + 0.12);
        break;
      }
      case "upgrade": {
        [523, 659, 784, 1046].forEach((f, i) => {
          if (!audioCtx || !masterGain) return;
          const t = now + i * 0.05;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(f, t);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(1e-3, t + 0.15);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(t);
          osc.stop(t + 0.15);
        });
        break;
      }
      case "enemy_death": {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.1);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }
      case "victory": {
        const melody = [
          { f: 523.25, d: 0.15 },
          // C5
          { f: 659.25, d: 0.15 },
          // E5
          { f: 783.99, d: 0.2 },
          // G5
          { f: 1046.5, d: 0.5 }
          // C6
        ];
        let offset = 0;
        melody.forEach((n) => {
          if (!audioCtx || !masterGain) return;
          const t = now + offset;
          const osc = audioCtx.createOscillator();
          const filter = audioCtx.createBiquadFilter();
          const gain = audioCtx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(n.f, t);
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(1600, t);
          gain.gain.setValueAtTime(0.35, t);
          gain.gain.exponentialRampToValueAtTime(1e-3, t + n.d);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          osc.start(t);
          osc.stop(t + n.d);
          offset += n.d * 0.8;
        });
        break;
      }
      case "defeat": {
        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(92.5, now);
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(320, now);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(1e-3, now + 1.2);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 1.2);
        break;
      }
    }
  } catch (e) {
    console.warn("Audio playback error:", e);
  }
}
var isMusicPlaying = false;
var stepCounter = 0;
function playMusic(_track = "battle") {
  if (muted || isMusicPlaying) return;
  initAudio();
  if (!audioCtx) return;
  isMusicPlaying = true;
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 0.35;
  musicGain.connect(masterGain);
  const bpm = 110;
  const stepInterval = 60 / bpm / 2;
  stepCounter = 0;
  musicInterval = window.setInterval(() => {
    if (!audioCtx || !musicGain || muted) return;
    const now = audioCtx.currentTime;
    const beat = stepCounter % 8;
    if (beat === 0 || beat === 4) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(75, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.18);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.18);
      osc.connect(gain);
      gain.connect(musicGain);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (beat === 2 || beat === 6) {
      const noise = audioCtx.createBufferSource();
      noise.buffer = getNoiseBuffer(audioCtx);
      const filter = audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1100, now);
      filter.Q.value = 2;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.06);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(musicGain);
      noise.start(now);
      noise.stop(now + 0.06);
    }
    stepCounter++;
  }, stepInterval * 1e3);
}
function stopMusic() {
  if (musicInterval !== null) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
  isMusicPlaying = false;
}

// src/core/debug.ts
var SAMPLE_COUNT = 120;
var DebugOverlay = class {
  enabled = false;
  samples = [];
  lastFrameAt = 0;
  frameStart = 0;
  latest = {
    entities: 0,
    particles: 0,
    projectiles: 0,
    spriteBakes: 0,
    spriteCacheHits: 0,
    enemies: 0
  };
  peaks = { entities: 0, particles: 0 };
  toggle() {
    this.enabled = !this.enabled;
    this.samples.length = 0;
    return this.enabled;
  }
  /** Call at the very top of the frame. */
  beginFrame(now) {
    if (!this.enabled) return;
    if (this.lastFrameAt > 0) {
      this.samples.push(now - this.lastFrameAt);
      if (this.samples.length > SAMPLE_COUNT) this.samples.shift();
    }
    this.lastFrameAt = now;
    this.frameStart = performance.now();
  }
  /** Call after the frame has been drawn; returns the measured cost in ms. */
  endFrame() {
    if (!this.enabled) return 0;
    return performance.now() - this.frameStart;
  }
  report(snapshot) {
    if (!this.enabled) return;
    Object.assign(this.latest, snapshot);
    this.peaks.entities = Math.max(this.peaks.entities, this.latest.entities);
    this.peaks.particles = Math.max(this.peaks.particles, this.latest.particles);
  }
  percentile(p) {
    if (this.samples.length === 0) return 0;
    const sorted = [...this.samples].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
    return sorted[idx];
  }
  get fps() {
    const avg = this.percentile(0.5);
    return avg > 0 ? 1e3 / avg : 0;
  }
  get frameP50() {
    return this.percentile(0.5);
  }
  get frameP95() {
    return this.percentile(0.95);
  }
  /** Draw the overlay in design space (top-left corner, below the HUD). */
  draw(ctx) {
    if (!this.enabled) return;
    const lines = [
      `fps ${this.fps.toFixed(0)}  frame p50 ${this.frameP50.toFixed(2)}ms  p95 ${this.frameP95.toFixed(2)}ms`,
      `enemies ${this.latest.enemies}  entities ${this.latest.entities} (peak ${this.peaks.entities})`,
      `particles ${this.latest.particles} (peak ${this.peaks.particles})  projectiles ${this.latest.projectiles}`,
      `sprite bakes ${this.latest.spriteBakes}  cache hits ${this.latest.spriteCacheHits}`,
      "F1 toggle debug"
    ];
    const pad = 8;
    const lineH = 14;
    const width = 380;
    const height = lines.length * lineH + pad * 2;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(pad, DESIGN_HEIGHT - height - pad, width, height);
    ctx.strokeStyle = "rgba(120,255,140,0.55)";
    ctx.lineWidth = 1;
    ctx.strokeRect(pad + 0.5, DESIGN_HEIGHT - height - pad + 0.5, width, height);
    ctx.font = "11px ui-monospace, Consolas, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#8ef58e";
    lines.forEach((line, i) => {
      ctx.fillText(line, pad + 8, DESIGN_HEIGHT - height - pad + pad + lineH * i + lineH / 2);
    });
    ctx.restore();
  }
};

// src/core/game.ts
var Game = class {
  renderer;
  input;
  save;
  // Game state
  screen = "menu";
  currentLevel = null;
  gold = 0;
  lives = 0;
  maxLives = 0;
  livesLost = 0;
  gameSpeed = 1;
  paused = false;
  // Wave management
  waves = [];
  currentWaveIndex = 0;
  waveActive = false;
  waveSpawnTimers = [];
  allWavesComplete = false;
  timeBetweenWaves = BALANCE.wave.timeBetweenWaves;
  waveTimer = 0;
  // countdown to next wave
  waitingForWave = false;
  // Entities
  enemies = [];
  towers = [];
  nextEnemyId = 1;
  nextTowerId = 1;
  nextProjectileId = 1;
  nextMeteorId = 1;
  /** Simulation clock in seconds, used for splash source throttling. */
  simTime = 0;
  /** sourceKey → (enemyId → simTime of last hit) for splash throttling. */
  splashHits = /* @__PURE__ */ new Map();
  // Object pools
  projectilePool;
  textPool;
  particlePool;
  // UI
  radialMenu = null;
  selectedSlot = -1;
  selectedTower = null;
  // Map decorations
  decorations = [];
  // World map
  worldMapHovered = -1;
  // Menu animation
  menuTime = 0;
  /** A1: fraction of the pending fixed step, used to interpolate rendering. */
  renderAlpha = 0;
  /** A18: frame-time and budget overlay, toggled with F1. */
  debug = new DebugOverlay();
  // Victory/Defeat
  resultStars = 0;
  // Tutorial
  tutorialStep = 0;
  // 0=none, 1=build, 2=upgrade, 3=call wave
  tutorialDismissed = false;
  isFirstLevel = false;
  // HUD button rects for hit testing (Kingdom Rush top bar & early wave medallion)
  pauseBtn = { x: DESIGN_WIDTH - 120, y: 8, w: 44, h: 34 };
  speedBtn = { x: DESIGN_WIDTH - 65, y: 8, w: 44, h: 34 };
  callWaveBtn = { x: DESIGN_WIDTH / 2 - 40, y: DESIGN_HEIGHT - 75, w: 80, h: 60 };
  // World map & Menu modal states
  selectedMapLevel = null;
  activeLoreModal = false;
  // Soldiers & Spells (Kingdom Rush mechanics)
  soldiers = [];
  meteors = [];
  nextSoldierId = 1;
  spellCooldowns = { rain_of_fire: 0, reinforcements: 0 };
  activeSpell = null;
  spellBtnRain = { x: 30, y: DESIGN_HEIGHT - 65, w: 52, h: 52 };
  spellBtnReinforce = { x: 92, y: DESIGN_HEIGHT - 65, w: 52, h: 52 };
  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    this.input = new InputManager(canvas);
    this.save = loadSave();
    this.tutorialDismissed = this.save.tutorialDismissed;
    if (this.save.settings.muted) setMuted(true);
    this.projectilePool = new ObjectPool(
      () => ({
        id: 0,
        x: 0,
        y: 0,
        prevX: 0,
        prevY: 0,
        destX: 0,
        destY: 0,
        targetId: -1,
        speed: 0,
        damage: 0,
        damageType: "physical",
        splashRadius: 0,
        active: false,
        color: "#fff",
        trail: []
      }),
      (p) => {
        p.active = false;
        p.trail.length = 0;
      },
      BALANCE.pools.projectileInitial,
      BALANCE.pools.projectileMax
    );
    this.textPool = new ObjectPool(
      () => ({ x: 0, y: 0, text: "", color: "#fff", life: 0, maxLife: 1, active: false, size: 14 }),
      (t) => {
        t.active = false;
      },
      BALANCE.pools.textInitial,
      BALANCE.pools.textMax
    );
    this.particlePool = new ObjectPool(
      () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: "#fff", size: 3, active: false }),
      (p) => {
        p.active = false;
      },
      BALANCE.pools.particleInitial,
      BALANCE.pools.particleMax
    );
  }
  // ═══════════════════════════════════════════════════════════════
  // GAME LOOP
  // ═══════════════════════════════════════════════════════════════
  accumulator = 0;
  lastTime = 0;
  start() {
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }
  loop(time) {
    this.debug.beginFrame(time);
    const frameTime = Math.min((time - this.lastTime) / 1e3, 0.1);
    this.lastTime = time;
    this.accumulator += frameTime;
    let stepped = false;
    while (this.accumulator >= FIXED_DT) {
      this.update(FIXED_DT);
      this.accumulator -= FIXED_DT;
      if (!stepped) {
        this.input.consumeClick();
        stepped = true;
      }
    }
    this.renderAlpha = Math.min(1, this.accumulator / FIXED_DT);
    this.render();
    this.debug.report({
      entities: this.enemies.length + this.soldiers.length + this.towers.length,
      enemies: this.enemies.length,
      particles: this.particlePool.activeCount,
      projectiles: this.projectilePool.activeCount
    });
    this.debug.draw(this.renderer.ctx);
    this.debug.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  }
  // ═══════════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════════
  update(dt) {
    if (this.input.getState().keysJustPressed.has("f1")) {
      this.debug.toggle();
    }
    this.menuTime += dt;
    switch (this.screen) {
      case "menu":
        this.updateMenu();
        break;
      case "worldmap":
        this.updateWorldMap();
        break;
      case "level":
        this.updateLevel(dt);
        break;
      case "victory":
      case "defeat":
        this.updateEndScreen();
        break;
    }
  }
  // ─── Menu ──────────────────────────────────────────────────────
  updateMenu() {
    const inp = this.input.getState();
    if (this.activeLoreModal) {
      if (inp.justClicked) {
        const btnX = DESIGN_WIDTH / 2 - 60;
        const btnY = (DESIGN_HEIGHT - 480) / 2 + 480 - 55;
        if (inp.clickPos.x >= btnX && inp.clickPos.x <= btnX + 120 && inp.clickPos.y >= btnY && inp.clickPos.y <= btnY + 40) {
          this.activeLoreModal = false;
          playSound("button_click");
        }
      }
      return;
    }
    if (inp.justClicked) {
      initAudio();
      const playX = DESIGN_WIDTH / 2 - 130;
      const playY = DESIGN_HEIGHT / 2 + 80;
      if (inp.clickPos.x >= playX && inp.clickPos.x <= playX + 260 && inp.clickPos.y >= playY && inp.clickPos.y <= playY + 56) {
        playSound("button_click");
        this.screen = "worldmap";
        return;
      }
      const loreX = DESIGN_WIDTH / 2 - 130;
      const loreY = playY + 68;
      if (inp.clickPos.x >= loreX && inp.clickPos.x <= loreX + 260 && inp.clickPos.y >= loreY && inp.clickPos.y <= loreY + 46) {
        playSound("button_click");
        this.activeLoreModal = true;
        return;
      }
      if (inp.clickPos.x >= DESIGN_WIDTH - 80 && inp.clickPos.x <= DESIGN_WIDTH - 24 && inp.clickPos.y >= 20 && inp.clickPos.y <= 60) {
        this.toggleMutePersisted();
        playSound("button_click");
        return;
      }
    }
  }
  /** Mute toggle that survives a reload (5). */
  toggleMutePersisted() {
    const muted2 = toggleMute();
    this.save.settings.muted = muted2;
    writeSave(this.save);
  }
  // ─── World Map ─────────────────────────────────────────────────
  updateWorldMap() {
    const inp = this.input.getState();
    this.worldMapHovered = -1;
    const nodes = this.renderer.getLevelPositions(LEVELS.length);
    if (this.selectedMapLevel !== null) {
      if (inp.justClicked) {
        const modalW = 540;
        const modalH = 430;
        const mx = (DESIGN_WIDTH - modalW) / 2;
        const my = (DESIGN_HEIGHT - modalH) / 2;
        const btnW = 220;
        const btnH = 55;
        const btnX = DESIGN_WIDTH / 2 - btnW / 2;
        const btnY = my + 320;
        if (inp.clickPos.x >= btnX && inp.clickPos.x <= btnX + btnW && inp.clickPos.y >= btnY && inp.clickPos.y <= btnY + btnH) {
          const selIdx = this.selectedMapLevel;
          this.selectedMapLevel = null;
          this.startLevel(LEVELS[selIdx]);
          return;
        }
        const closeX = mx + modalW - 32;
        const closeY = my + 22;
        if (Math.hypot(inp.clickPos.x - closeX, inp.clickPos.y - closeY) < 18) {
          this.selectedMapLevel = null;
          playSound("button_click");
          return;
        }
        if (inp.clickPos.x < mx || inp.clickPos.x > mx + modalW || inp.clickPos.y < my || inp.clickPos.y > my + modalH) {
          this.selectedMapLevel = null;
          playSound("button_click");
          return;
        }
      }
      return;
    }
    for (let i = 0; i < LEVELS.length; i++) {
      const pos = nodes[i];
      if (pointInCircle(inp.pointer, pos, 36)) {
        this.worldMapHovered = i;
      }
    }
    if (inp.justClicked) {
      if (inp.clickPos.x >= 20 && inp.clickPos.x <= 130 && inp.clickPos.y >= 10 && inp.clickPos.y <= 46) {
        this.screen = "menu";
        playSound("button_click");
        return;
      }
      if (inp.clickPos.x >= DESIGN_WIDTH - 70 && inp.clickPos.x <= DESIGN_WIDTH - 20 && inp.clickPos.y >= 10 && inp.clickPos.y <= 46) {
        this.toggleMutePersisted();
        playSound("button_click");
        return;
      }
      if (this.worldMapHovered >= 0) {
        const lvlIdx = this.worldMapHovered;
        const unlocked = lvlIdx === 0 || !!this.save.levelStars[LEVELS[lvlIdx - 1].id];
        if (unlocked) {
          this.selectedMapLevel = lvlIdx;
          playSound("button_click");
        }
      }
    }
  }
  // ─── Level ─────────────────────────────────────────────────────
  startLevel(level) {
    initAudio();
    playMusic("battle");
    playSound("wave_horn");
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
    this.gameSpeed = 1;
    this.paused = false;
    this.isFirstLevel = level.id === "level_1";
    this.tutorialStep = this.isFirstLevel && !this.tutorialDismissed ? 1 : 0;
    this.screen = "level";
    this.generateDecorations();
    this.waveTimer = BALANCE.wave.firstWaveDelay;
  }
  generateDecorations() {
    this.decorations = [];
    if (!this.currentLevel) return;
    const path = this.currentLevel.path;
    const slots = this.currentLevel.buildSlots;
    const dec = BALANCE.decorations;
    const props = dec.props;
    const totalWeight = props.reduce((sum, p) => sum + p.weight, 0);
    for (let i = 0; i < dec.count; i++) {
      let x, y;
      let valid = false;
      let attempts = 0;
      do {
        x = dec.minX + Math.random() * (DESIGN_WIDTH - dec.minX * 2);
        y = dec.minY + Math.random() * (DESIGN_HEIGHT - dec.minY - 70);
        valid = true;
        for (const wp of path) {
          if (dist({ x, y }, wp) < dec.pathClearance) {
            valid = false;
            break;
          }
        }
        if (valid) {
          for (const s of slots) {
            if (dist({ x, y }, s) < dec.slotClearance) {
              valid = false;
              break;
            }
          }
        }
        attempts++;
      } while (!valid && attempts < dec.maxAttempts);
      if (!valid) continue;
      let roll = Math.random() * totalWeight;
      let chosen = props[0];
      for (const p of props) {
        roll -= p.weight;
        if (roll <= 0) {
          chosen = p;
          break;
        }
      }
      this.decorations.push({
        x,
        y,
        type: chosen.type,
        size: chosen.sizeMin + Math.random() * (chosen.sizeMax - chosen.sizeMin),
        variant: chosen.variants > 1 ? Math.floor(Math.random() * chosen.variants) : 0
      });
    }
    this.decorations.sort((a, b) => a.y - b.y);
  }
  updateLevel(dt) {
    if (this.paused) {
      this.handleLevelInput();
      return;
    }
    const effectiveDt = dt * this.gameSpeed;
    this.simTime += effectiveDt;
    this.capturePositions();
    this.updateWaves(effectiveDt);
    this.updateSoldiers(effectiveDt);
    this.updateSpells(effectiveDt);
    this.updateEnemies(effectiveDt);
    this.updateTowers(effectiveDt);
    this.updateProjectiles(effectiveDt);
    this.updateFloatingTexts(effectiveDt);
    this.updateParticles(effectiveDt);
    this.checkEndConditions();
    this.handleLevelInput();
  }
  /**
   * A1: remember every moving entity's position before the step so the
   * renderer can interpolate between the last two simulated states.
   */
  capturePositions() {
    for (const e of this.enemies) {
      e.prevX = e.x;
      e.prevY = e.y;
    }
    for (const s of this.soldiers) {
      s.prevX = s.x;
      s.prevY = s.y;
    }
    for (const p of this.projectilePool.getActive()) {
      p.prevX = p.x;
      p.prevY = p.y;
    }
    for (const m of this.meteors) {
      m.prevX = m.x;
      m.prevY = m.y;
    }
  }
  /**
   * A1: draw a moving entity at its interpolated position without
   * allocating a copy every frame.
   */
  drawInterpolated(entity, draw) {
    const a = this.renderAlpha;
    if (a <= 1e-4) {
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
  updateWaves(dt) {
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
      if (allGroupsDone) {
        const allEnemiesDead = this.enemies.every((e) => !e.alive);
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
  beginWave() {
    if (this.currentWaveIndex >= this.waves.length) return;
    const wave = this.waves[this.currentWaveIndex];
    this.waveActive = true;
    this.waitingForWave = false;
    this.waveSpawnTimers = wave.groups.map((g, i) => ({
      groupIndex: i,
      spawnCount: 0,
      timer: g.spawnInterval,
      delayTimer: g.delay
    }));
    if (this.tutorialStep === 3) {
      this.tutorialStep = 0;
    }
  }
  callWaveEarly() {
    if (!this.waitingForWave || this.allWavesComplete) return;
    const bonus = this.waves[this.currentWaveIndex]?.earlyCallBonus || 0;
    this.gold += bonus;
    playSound("wave_horn");
    playSound("gold_gain");
    this.spawnFloatingText(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 80, `+${bonus} gold!`, "#ffd700", 20);
    this.beginWave();
  }
  // ─── Enemy System ──────────────────────────────────────────────
  spawnEnemy(dataId) {
    const data = ENEMIES[dataId];
    if (!data || !this.currentLevel) return;
    const spawn = this.currentLevel.spawnPosition;
    const laneOffset = (Math.random() - 0.5) * BALANCE.enemy.laneOffset * 2;
    const enemy = {
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
      facingLeft: spawn.x > this.currentLevel.basePosition.x
    };
    this.enemies.push(enemy);
  }
  updateEnemies(dt) {
    if (!this.currentLevel) return;
    const path = this.currentLevel.path;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (enemy.hitFlash > 0) enemy.hitFlash -= dt * 4;
      if (enemy.slowed > 0) {
        enemy.slowed -= dt;
        if (enemy.slowed <= 0) enemy.slowFactor = 1;
      }
      if (enemy.blockedBySoldierId) {
        const soldier = this.soldiers.find((s) => s.id === enemy.blockedBySoldierId && s.alive);
        if (!soldier) {
          enemy.blockedBySoldierId = null;
        } else {
          enemy.meleeTimer = (enemy.meleeTimer ?? 0) + dt;
          if (enemy.meleeTimer >= BALANCE.enemy.melee.interval) {
            enemy.meleeTimer = 0;
            const enemyDamage = Math.max(
              BALANCE.enemy.melee.minDamage,
              Math.round(enemy.maxHp * BALANCE.enemy.melee.maxHpRatio)
            );
            soldier.hp -= enemyDamage;
            soldier.hitFlash = 0.2;
            this.spawnFloatingText(soldier.x, soldier.y - 12, `-${enemyDamage}`, "#ef4444", 12);
            this.spawnParticles(soldier.x, soldier.y, "#ef4444", 3);
            if (soldier.hp <= 0) {
              soldier.alive = false;
              soldier.respawnTimer = BALANCE.soldier.respawnTime;
              enemy.blockedBySoldierId = null;
              this.spawnParticles(soldier.x, soldier.y, "#475569", 8);
            }
          }
          continue;
        }
      }
      const abilities = ENEMIES[enemy.dataId]?.abilities;
      if (abilities?.heal) {
        const heal = abilities.heal;
        enemy.healTimer = (enemy.healTimer ?? 0) + dt;
        if (enemy.healTimer >= heal.interval) {
          enemy.healTimer = 0;
          playSound("shaman_heal");
          for (const ally of this.enemies) {
            if (ally.alive && !ally.flying && dist(enemy, ally) <= heal.range && ally.hp < ally.maxHp) {
              ally.hp = Math.min(ally.maxHp, ally.hp + heal.amount);
              this.spawnFloatingText(ally.x, ally.y - 10, `+${heal.amount}`, "#22c55e", 13);
              this.spawnParticles(ally.x, ally.y, "#22c55e", 4);
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
          this.spawnParticles(enemy.x, enemy.y, "#84cc16", 2);
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
          playSound("warlord_roar");
          this.spawnFloatingText(enemy.x, enemy.y - 25, "WAR CRY!", "#ef4444", 16);
          for (const tower of this.towers) {
            if (dist(enemy, tower) <= stun.range) {
              tower.stunTimer = stun.duration;
            }
          }
        }
      }
      if (enemy.flying) {
        const base = this.currentLevel.basePosition;
        const dx = base.x - enemy.x;
        const dy = base.y - enemy.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (dx < -1) enemy.facingLeft = true;
        else if (dx > 1) enemy.facingLeft = false;
        const spd2 = enemy.speed * enemy.slowFactor * dt;
        if (d <= spd2) {
          this.enemyReachesBase(enemy);
        } else {
          enemy.x += dx / d * spd2;
          enemy.y += dy / d * spd2;
          enemy.totalPathDist += spd2;
        }
        continue;
      }
      if (enemy.pathIndex >= path.length) {
        this.enemyReachesBase(enemy);
        continue;
      }
      const target = path[enemy.pathIndex];
      const prev = path[enemy.pathIndex - 1] || path[0];
      const segLen = dist(prev, target);
      const spd = enemy.speed * enemy.slowFactor * dt / (segLen || 1);
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
      const dir = { x: next.x - current.x, y: next.y - current.y };
      if (dir.x < -1) enemy.facingLeft = true;
      else if (dir.x > 1) enemy.facingLeft = false;
      const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y) || 1;
      const perp = { x: -dir.y / len, y: dir.x / len };
      enemy.x = pos.x + perp.x * enemy.laneOffset;
      enemy.y = pos.y + perp.y * enemy.laneOffset;
      enemy.totalPathDist = enemy.pathIndex * 1e3 + enemy.pathProgress * 1e3;
    }
    this.enemies = this.enemies.filter((e) => e.alive);
  }
  /**
   * Summon minions beside `summoner`, standing on the path at the summoner's
   * own progress so they can never be teleported past the base (fix 9).
   */
  summonMinions(summoner, enemyId, count) {
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
      this.spawnParticles(minion.x, minion.y, "#dc2626", 8);
    }
  }
  enemyReachesBase(enemy) {
    enemy.alive = false;
    this.lives -= enemy.livesDamage;
    this.livesLost += enemy.livesDamage;
    if (this.lives < 0) this.lives = 0;
    if (this.currentLevel) {
      const base = this.currentLevel.basePosition;
      this.spawnParticles(base.x, base.y, "#ff3333", 6);
      this.spawnFloatingText(base.x, base.y - 20, `-${enemy.livesDamage} \u2764`, "#ff4444", 18);
    }
  }
  damageEnemy(enemy, damage, damageType) {
    if (!enemy.alive) return;
    let actualDamage = damage;
    if (damageType === "physical") {
      actualDamage *= 1 - enemy.armor;
    } else {
      actualDamage *= 1 - enemy.magicResist;
    }
    enemy.hp -= actualDamage;
    enemy.hitFlash = 1;
    if (enemy.hp <= 0) {
      enemy.alive = false;
      this.gold += enemy.goldReward;
      playSound("enemy_death");
      playSound("gold_gain");
      this.spawnFloatingText(enemy.x, enemy.y - 15, `+${enemy.goldReward}`, "#ffd700", 14);
      this.spawnParticles(enemy.x, enemy.y, enemy.color, 8);
      if (enemy.blockedBySoldierId) {
        const soldier = this.soldiers.find((s) => s.id === enemy.blockedBySoldierId);
        if (soldier && soldier.blockingEnemyId === enemy.id) {
          soldier.blockingEnemyId = null;
        }
      }
      if (this.tutorialStep === 1 && this.towers.length > 0) {
        this.tutorialStep = 2;
      }
    }
  }
  // ─── Tower System ──────────────────────────────────────────────
  buildTower(slotIndex, towerId) {
    if (!this.currentLevel) return;
    const slot = this.currentLevel.buildSlots[slotIndex];
    const towerData = TOWERS[towerId];
    if (!towerData) return;
    const cost = towerData.levels[0].cost;
    if (this.gold < cost) return;
    this.gold -= cost;
    const tower = {
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
      animTimer: 0
    };
    this.towers.push(tower);
    this.radialMenu = null;
    this.selectedSlot = -1;
    this.spawnParticles(slot.x, slot.y, towerData.color, 10);
    playSound("upgrade");
    if (this.tutorialStep === 1) {
      this.tutorialStep = 3;
    }
  }
  upgradeTower(tower) {
    const towerData = TOWERS[tower.dataId];
    if (!towerData) return;
    if (tower.level >= 2) return;
    const nextLevel = towerData.levels[tower.level + 1];
    if (this.gold < nextLevel.cost) return;
    this.gold -= nextLevel.cost;
    tower.totalInvested += nextLevel.cost;
    tower.level++;
    this.spawnParticles(tower.x, tower.y, towerData.color, 8);
    playSound("upgrade");
    this.radialMenu = null;
    this.selectedTower = null;
    if (this.tutorialStep === 2) {
      this.tutorialStep = 3;
    }
  }
  specializeTower(tower, specIndex) {
    const towerData = TOWERS[tower.dataId];
    if (!towerData) return;
    if (tower.level !== 2) return;
    const spec = towerData.specializations[specIndex];
    if (this.gold < spec.cost) return;
    this.gold -= spec.cost;
    tower.totalInvested += spec.cost;
    tower.specId = spec.specId;
    this.spawnParticles(tower.x, tower.y, towerData.color, 12);
    playSound("upgrade");
    this.radialMenu = null;
    this.selectedTower = null;
  }
  sellTower(tower) {
    const refund = Math.floor(tower.totalInvested * SELL_REFUND_RATE);
    this.gold += refund;
    playSound("gold_gain");
    this.spawnFloatingText(tower.x, tower.y - 20, `+${refund}`, "#ffd700", 16);
    const idx = this.towers.indexOf(tower);
    if (idx !== -1) this.towers.splice(idx, 1);
    this.radialMenu = null;
    this.selectedTower = null;
  }
  getTowerStats(tower) {
    const towerData = TOWERS[tower.dataId];
    if (tower.specId) {
      const spec = towerData.specializations.find((s) => s.specId === tower.specId);
      return spec;
    }
    return towerData.levels[tower.level];
  }
  updateTowers(dt) {
    for (const tower of this.towers) {
      if (tower.stunTimer > 0) {
        tower.stunTimer -= dt;
      }
      if (tower.animTimer > 0) tower.animTimer -= dt;
      if (tower.dataId === "barracks") continue;
      if (tower.stunTimer > 0) continue;
      const stats = this.getTowerStats(tower);
      const towerData = TOWERS[tower.dataId];
      tower.fireTimer -= dt;
      if (tower.fireTimer <= 0) {
        const target = this.findTarget(tower, stats.range, towerData.targetPriority, towerData.canHitFlying);
        if (target) {
          this.fireTower(tower, target, stats);
          tower.fireTimer = 1 / stats.fireRate;
          tower.animTimer = BALANCE.tower.attackAnimDuration;
        } else {
          tower.fireTimer = BALANCE.tower.retryDelay;
        }
      }
    }
  }
  findTarget(tower, range, priority, canHitFlying) {
    let best = null;
    let bestScore = -Infinity;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (enemy.flying && !canHitFlying) continue;
      const d = dist({ x: tower.x, y: tower.y }, { x: enemy.x, y: enemy.y });
      if (d > range) continue;
      let score = 0;
      switch (priority) {
        case "first":
          score = enemy.totalPathDist;
          break;
        case "strongest":
          score = enemy.maxHp;
          break;
        case "closest":
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
  fireTower(tower, target, stats) {
    const towerData = TOWERS[tower.dataId];
    if (tower.dataId === "cannon") {
      playSound("cannon_shoot");
    } else if (tower.dataId === "mage") {
      playSound("magic_shoot");
    } else {
      playSound("arrow_shoot");
    }
    const shotCount = tower.specId === "rapid_volley" ? 3 : 1;
    for (let i = 0; i < shotCount; i++) {
      const proj = this.projectilePool.acquire();
      proj.id = this.nextProjectileId++;
      proj.x = tower.x;
      proj.y = tower.y - 10;
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
      if (i > 0) {
        proj.x += (Math.random() - 0.5) * 10;
        proj.y += (Math.random() - 0.5) * 10;
      }
    }
  }
  // ─── Projectile System ─────────────────────────────────────────
  updateProjectiles(dt) {
    const toRelease = [];
    for (const proj of this.projectilePool.getActive()) {
      if (!proj.active) {
        toRelease.push(proj);
        continue;
      }
      let target = this.enemies.find((e) => e.id === proj.targetId && e.alive);
      if (!target) {
        target = this.findRetarget(proj) ?? void 0;
        if (target) {
          proj.targetId = target.id;
        }
      }
      if (target) {
        proj.destX = target.x;
        proj.destY = target.y;
      }
      const dx = proj.destX - proj.x;
      const dy = proj.destY - proj.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const moveSpeed = proj.speed * dt;
      proj.trail.push({ x: proj.x, y: proj.y });
      if (proj.trail.length > BALANCE.projectile.trailLength) proj.trail.shift();
      const hitRadius = moveSpeed + (target ? target.size : 6);
      if (d <= hitRadius) {
        const impactX = proj.destX;
        const impactY = proj.destY;
        if (proj.splashRadius > 0) {
          playSound("cannon_hit");
          this.applySplashDamage(`proj:${proj.id}`, impactX, impactY, proj.splashRadius, proj.damage, proj.damageType);
          this.spawnParticles(impactX, impactY, "#ff6600", 6);
        } else if (target) {
          if (proj.damageType === "magic") {
            playSound("magic_hit");
          } else {
            playSound("arrow_hit");
          }
          this.damageEnemy(target, proj.damage, proj.damageType);
        } else {
          this.spawnParticles(impactX, impactY, proj.color, 2);
        }
        proj.active = false;
        toRelease.push(proj);
      } else {
        proj.x += dx / d * moveSpeed;
        proj.y += dy / d * moveSpeed;
      }
    }
    for (const p of toRelease) {
      this.projectilePool.release(p);
    }
  }
  /** Nearest live enemy to a stray projectile, within the retarget radius. */
  findRetarget(proj) {
    let best = null;
    let bestDist = BALANCE.projectile.retargetRadius;
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
  applySplashDamage(sourceKey, x, y, radius, damage, damageType) {
    if (radius <= 0) return;
    let hits = this.splashHits.get(sourceKey);
    if (!hits) {
      hits = /* @__PURE__ */ new Map();
      this.splashHits.set(sourceKey, hits);
    }
    const edge = BALANCE.splash.edgeFalloff;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const d = dist({ x, y }, enemy);
      if (d > radius) continue;
      const last = hits.get(enemy.id);
      if (last !== void 0 && this.simTime - last < BALANCE.splash.sameSourceCooldown) continue;
      hits.set(enemy.id, this.simTime);
      const multiplier = 1 - (1 - edge) * (d / radius);
      this.damageEnemy(enemy, damage * multiplier, damageType);
    }
  }
  // ─── Effects ───────────────────────────────────────────────────
  spawnFloatingText(x, y, text, color, size) {
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
  spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const p = this.particlePool.acquire();
      p.x = x;
      p.y = y;
      const ang = Math.random() * Math.PI * 2;
      const spd = BALANCE.vfx.particleSpeedMin + Math.random() * (BALANCE.vfx.particleSpeedMax - BALANCE.vfx.particleSpeedMin);
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd;
      p.life = BALANCE.vfx.particleLifeMin + Math.random() * (BALANCE.vfx.particleLifeMax - BALANCE.vfx.particleLifeMin);
      p.maxLife = p.life;
      p.color = color;
      p.size = BALANCE.vfx.particleSizeMin + Math.random() * (BALANCE.vfx.particleSizeMax - BALANCE.vfx.particleSizeMin);
      p.active = true;
    }
  }
  updateFloatingTexts(dt) {
    const toRelease = [];
    for (const ft of this.textPool.getActive()) {
      if (!ft.active) {
        toRelease.push(ft);
        continue;
      }
      ft.life -= dt;
      ft.y -= BALANCE.vfx.floatingTextRise * dt;
      if (ft.life <= 0) {
        ft.active = false;
        toRelease.push(ft);
      }
    }
    for (const ft of toRelease) this.textPool.release(ft);
  }
  updateParticles(dt) {
    const toRelease = [];
    for (const p of this.particlePool.getActive()) {
      if (!p.active) {
        toRelease.push(p);
        continue;
      }
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += BALANCE.vfx.particleGravity * dt;
      if (p.life <= 0) {
        p.active = false;
        toRelease.push(p);
      }
    }
    for (const p of toRelease) this.particlePool.release(p);
  }
  // ─── Soldier & Barracks System ──────────────────────────────────
  updateSoldiers(dt) {
    if (!this.currentLevel) return;
    const path = this.currentLevel.path;
    for (const tower of this.towers) {
      if (tower.dataId !== "barracks") continue;
      let bestPt = path[0];
      let bestDist = Infinity;
      for (let i = 0; i < path.length; i++) {
        const d = dist(tower, path[i]);
        if (d < bestDist) {
          bestDist = d;
          bestPt = path[i];
        }
      }
      const mySoldiers = this.soldiers.filter((s) => s.towerId === tower.id);
      const stats = this.getTowerStats(tower);
      const squad2 = stats.soldier ?? BALANCE.soldier.fallback;
      const maxHp = squad2.hp;
      const dmg = squad2.damage;
      const attackInterval = squad2.attackInterval;
      const soldierType = tower.specId === "knights" ? "knight" : tower.level > 0 ? "footman" : "militia";
      for (const s of mySoldiers) {
        if (!s.alive) {
          if (s.lifespan !== void 0) continue;
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
            this.spawnParticles(tower.x, tower.y, "#93c5fd", 6);
          }
        } else {
          s.maxHp = maxHp;
          s.damage = dmg;
          s.attackInterval = attackInterval;
          s.type = soldierType;
        }
      }
      if (mySoldiers.length < BALANCE.soldier.count) {
        for (let i = mySoldiers.length; i < BALANCE.soldier.count; i++) {
          const offsetX = i === 0 ? -BALANCE.soldier.spread : BALANCE.soldier.spread;
          const offsetY = i === 0 ? -6 : 6;
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
            hitFlash: 0
          });
        }
      }
    }
    this.soldiers = this.soldiers.filter((s) => {
      if (s.lifespan !== void 0 && !s.alive) return false;
      if (s.towerId === null) return true;
      return this.towers.some((t) => t.id === s.towerId);
    });
    for (const soldier of this.soldiers) {
      if (!soldier.alive) continue;
      if (soldier.towerId !== null) {
        const tower = this.towers.find((t) => t.id === soldier.towerId);
        if (tower && tower.stunTimer > 0) continue;
      }
      if (soldier.hitFlash > 0) soldier.hitFlash -= dt * 4;
      if (soldier.lifespan !== void 0) {
        soldier.lifespan -= dt;
        if (soldier.lifespan <= 0) {
          soldier.alive = false;
          this.spawnParticles(soldier.x, soldier.y, "#94a3b8", 8);
          if (soldier.blockingEnemyId) {
            const enemy = this.enemies.find((e) => e.id === soldier.blockingEnemyId);
            if (enemy && enemy.blockedBySoldierId === soldier.id) {
              enemy.blockedBySoldierId = null;
            }
          }
          continue;
        }
      }
      if (soldier.blockingEnemyId) {
        const enemy = this.enemies.find((e) => e.id === soldier.blockingEnemyId && e.alive);
        if (!enemy || dist(soldier, enemy) > BALANCE.soldier.breakRange) {
          soldier.blockingEnemyId = null;
        } else {
          soldier.facingLeft = enemy.x < soldier.x;
          soldier.attackTimer -= dt;
          if (soldier.attackTimer <= 0) {
            soldier.attackTimer = soldier.attackInterval;
            playSound("sword_clash");
            this.damageEnemy(enemy, soldier.damage, "physical");
            this.spawnParticles(enemy.x, enemy.y, "#cbd5e1", 3);
          }
          continue;
        }
      }
      const dx = soldier.targetX - soldier.x;
      const dy = soldier.targetY - soldier.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 3) {
        const move = Math.min(d, BALANCE.soldier.moveSpeed * dt);
        soldier.x += dx / d * move;
        soldier.y += dy / d * move;
        soldier.facingLeft = dx < 0;
      } else {
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
  updateSpells(dt) {
    for (const key of Object.keys(this.spellCooldowns)) {
      if (this.spellCooldowns[key] > 0) {
        this.spellCooldowns[key] = Math.max(0, this.spellCooldowns[key] - dt);
      }
    }
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      if (!m.active) {
        this.meteors.splice(i, 1);
        continue;
      }
      m.progress += m.speed * dt;
      m.x = m.startX + (m.targetX - m.startX) * m.progress;
      m.y = m.startY + (m.targetY - m.startY) * m.progress;
      this.spawnParticles(m.x, m.y, "#f97316", 1);
      if (m.progress >= 1) {
        m.active = false;
        playSound("meteor_impact");
        this.spawnParticles(m.targetX, m.targetY, "#ea580c", 16);
        this.spawnParticles(m.targetX, m.targetY, "#facc15", 10);
        this.applySplashDamage(`meteor:${m.id}`, m.targetX, m.targetY, m.radius, m.damage, "physical");
        this.meteors.splice(i, 1);
      }
    }
  }
  castSpell(spellId, x, y) {
    if (spellId === "rain_of_fire") {
      const spell = getSpell("rain_of_fire");
      const count = spell.count ?? 5;
      const radius = spell.radius ?? 80;
      const damage = spell.damage ?? 80;
      const fallTime = spell.delay ?? 0.8;
      const spread = radius * 0.75;
      this.spellCooldowns.rain_of_fire = spell.cooldown;
      playSound("meteor_fall");
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
          active: true
        });
      }
      this.spawnFloatingText(x, y - 30, "RAIN OF FIRE!", "#ff4400", 16);
    } else if (spellId === "reinforcements") {
      const spell = getSpell("reinforcements");
      const count = spell.count ?? 2;
      const squad2 = BALANCE.soldier.reinforcement;
      const lifespan = spell.duration ?? 15;
      this.spellCooldowns.reinforcements = spell.cooldown;
      playSound("reinforce");
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
          hp: squad2.hp,
          maxHp: squad2.hp,
          damage: squad2.damage,
          attackTimer: squad2.attackInterval * 0.5,
          attackInterval: squad2.attackInterval,
          blockingEnemyId: null,
          level: 1,
          type: "reinforcement",
          alive: true,
          respawnTimer: 0,
          lifespan,
          hitFlash: 0
        });
        this.spawnParticles(sx, sy, "#60a5fa", 8);
      }
      this.spawnFloatingText(x, y - 25, "REINFORCEMENTS!", "#38bdf8", 14);
    }
  }
  // ─── End Conditions ────────────────────────────────────────────
  checkEndConditions() {
    if (this.lives <= 0) {
      this.screen = "defeat";
      this.resultStars = 0;
      playSound("defeat");
      stopMusic();
      return;
    }
    if (this.allWavesComplete && this.enemies.every((e) => !e.alive)) {
      if (this.livesLost <= STAR_THRESHOLDS.three) {
        this.resultStars = 3;
      } else if (this.livesLost <= STAR_THRESHOLDS.two) {
        this.resultStars = 2;
      } else {
        this.resultStars = 1;
      }
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
      this.screen = "victory";
      playSound("victory");
      stopMusic();
    }
  }
  // ─── Input Handling ────────────────────────────────────────────
  handleLevelInput() {
    const inp = this.input.getState();
    if (!this.currentLevel) return;
    if (this.paused) {
      if (inp.keysJustPressed.has("escape") || inp.justClicked && this.hitRect(inp.clickPos, this.pauseBtn)) {
        this.paused = false;
        playSound("button_click");
      }
      return;
    }
    if (inp.keysJustPressed.has("1")) {
      if (this.spellCooldowns.rain_of_fire <= 0) {
        this.activeSpell = this.activeSpell === "rain_of_fire" ? null : "rain_of_fire";
        this.radialMenu = null;
      }
    } else if (inp.keysJustPressed.has("2")) {
      if (this.spellCooldowns.reinforcements <= 0) {
        this.activeSpell = this.activeSpell === "reinforcements" ? null : "reinforcements";
        this.radialMenu = null;
      }
    } else if (inp.keysJustPressed.has("escape")) {
      this.activeSpell = null;
      this.radialMenu = null;
    }
    if (!inp.justClicked) return;
    const click = inp.clickPos;
    if (this.tutorialStep > 0 && !this.tutorialDismissed) {
      const skip = this.getTutorialSkipRect();
      if (skip && this.hitRect(click, skip)) {
        this.dismissTutorial();
        playSound("button_click");
        return;
      }
    }
    if (this.hitRect(click, this.pauseBtn)) {
      this.paused = !this.paused;
      return;
    }
    if (this.hitRect(click, this.speedBtn)) {
      this.gameSpeed = this.gameSpeed === 1 ? 2 : 1;
      return;
    }
    if (this.waitingForWave && !this.allWavesComplete) {
      if (this.hitRect(click, this.callWaveBtn)) {
        this.callWaveEarly();
        return;
      }
    }
    if (this.hitRect(click, this.spellBtnRain)) {
      if (this.spellCooldowns.rain_of_fire <= 0) {
        this.activeSpell = this.activeSpell === "rain_of_fire" ? null : "rain_of_fire";
        this.radialMenu = null;
      }
      return;
    }
    if (this.hitRect(click, this.spellBtnReinforce)) {
      if (this.spellCooldowns.reinforcements <= 0) {
        this.activeSpell = this.activeSpell === "reinforcements" ? null : "reinforcements";
        this.radialMenu = null;
      }
      return;
    }
    if (this.activeSpell) {
      this.castSpell(this.activeSpell, click.x, click.y);
      this.activeSpell = null;
      return;
    }
    if (this.radialMenu) {
      const menu = this.radialMenu;
      const itemCount = menu.items.length;
      let hit = false;
      for (let i = 0; i < itemCount; i++) {
        const itemAngle = i / itemCount * Math.PI * 2 - Math.PI / 2;
        const ix = menu.x + Math.cos(itemAngle) * BALANCE.ui.radialItemDistance;
        const iy = menu.y + Math.sin(itemAngle) * BALANCE.ui.radialItemDistance;
        if (pointInCircle(click, { x: ix, y: iy }, BALANCE.ui.radialItemRadius)) {
          hit = true;
          const item = menu.items[i];
          if (!item.enabled) break;
          if (menu.type === "build") {
            this.buildTower(this.selectedSlot, item.action);
          } else if (menu.type === "tower" && menu.towerRef) {
            if (item.action === "sell") {
              this.sellTower(menu.towerRef);
            } else if (item.action === "upgrade") {
              this.upgradeTower(menu.towerRef);
            } else if (item.action.startsWith("spec_")) {
              const specIdx = parseInt(item.action.split("_")[1]);
              this.specializeTower(menu.towerRef, specIdx);
            }
          }
          break;
        }
      }
      if (!hit) {
        this.radialMenu = null;
        this.selectedSlot = -1;
        this.selectedTower = null;
      }
      return;
    }
    for (const tower of this.towers) {
      if (pointInCircle(click, { x: tower.x, y: tower.y }, BALANCE.ui.towerHitRadius)) {
        this.selectedTower = tower;
        this.selectedSlot = -1;
        this.openTowerMenu(tower);
        return;
      }
    }
    for (let i = 0; i < this.currentLevel.buildSlots.length; i++) {
      const slot = this.currentLevel.buildSlots[i];
      if (pointInCircle(click, slot, BALANCE.ui.slotHitRadius)) {
        if (this.towers.some((t) => t.slotIndex === i)) continue;
        this.selectedSlot = i;
        this.selectedTower = null;
        this.openBuildMenu(i);
        return;
      }
    }
    this.selectedSlot = -1;
    this.selectedTower = null;
  }
  openBuildMenu(slotIndex) {
    if (!this.currentLevel) return;
    const slot = this.currentLevel.buildSlots[slotIndex];
    const items = [
      {
        label: "Archer",
        icon: TOWERS.archer.icon,
        cost: TOWERS.archer.levels[0].cost,
        color: TOWERS.archer.color,
        action: "archer",
        enabled: this.gold >= TOWERS.archer.levels[0].cost,
        description: TOWERS.archer.levels[0].description
      },
      {
        label: "Mage",
        icon: TOWERS.mage.icon,
        cost: TOWERS.mage.levels[0].cost,
        color: TOWERS.mage.color,
        action: "mage",
        enabled: this.gold >= TOWERS.mage.levels[0].cost,
        description: TOWERS.mage.levels[0].description
      },
      {
        label: "Cannon",
        icon: TOWERS.cannon.icon,
        cost: TOWERS.cannon.levels[0].cost,
        color: TOWERS.cannon.color,
        action: "cannon",
        enabled: this.gold >= TOWERS.cannon.levels[0].cost,
        description: TOWERS.cannon.levels[0].description
      },
      {
        label: "Barracks",
        icon: TOWERS.barracks.icon,
        cost: TOWERS.barracks.levels[0].cost,
        color: TOWERS.barracks.color,
        action: "barracks",
        enabled: this.gold >= TOWERS.barracks.levels[0].cost,
        description: TOWERS.barracks.levels[0].description
      }
    ];
    this.radialMenu = {
      x: slot.x,
      y: slot.y,
      items,
      hoveredIndex: -1,
      type: "build"
    };
  }
  openTowerMenu(tower) {
    const towerData = TOWERS[tower.dataId];
    const items = [];
    if (tower.specId) {
      const refund = Math.floor(tower.totalInvested * SELL_REFUND_RATE);
      items.push({
        label: `Sell (${refund})`,
        icon: "\u{1F4B0}",
        color: "#e74c3c",
        action: "sell",
        enabled: true
      });
    } else if (tower.level < 2) {
      const nextCost = towerData.levels[tower.level + 1].cost;
      items.push({
        label: `Upgrade (${nextCost})`,
        icon: "\u2B06",
        cost: nextCost,
        color: "#27ae60",
        action: "upgrade",
        enabled: this.gold >= nextCost,
        description: towerData.levels[tower.level + 1].description
      });
      const refund = Math.floor(tower.totalInvested * SELL_REFUND_RATE);
      items.push({
        label: `Sell (${refund})`,
        icon: "\u{1F4B0}",
        color: "#e74c3c",
        action: "sell",
        enabled: true
      });
    } else {
      for (let i = 0; i < 2; i++) {
        const spec = towerData.specializations[i];
        items.push({
          label: spec.specName,
          icon: i === 0 ? "\u2B50" : "\u{1F31F}",
          cost: spec.cost,
          color: towerData.color,
          action: `spec_${i}`,
          enabled: this.gold >= spec.cost,
          description: spec.special
        });
      }
      const refund = Math.floor(tower.totalInvested * SELL_REFUND_RATE);
      items.push({
        label: `Sell (${refund})`,
        icon: "\u{1F4B0}",
        color: "#e74c3c",
        action: "sell",
        enabled: true
      });
    }
    this.radialMenu = {
      x: tower.x,
      y: tower.y,
      items,
      hoveredIndex: -1,
      type: "tower",
      towerRef: tower
    };
  }
  hitRect(p, rect) {
    return p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h;
  }
  // ─── End Screen ────────────────────────────────────────────────
  updateEndScreen() {
    const inp = this.input.getState();
    if (inp.justClicked) {
      const bx = DESIGN_WIDTH / 2 - 80, by = DESIGN_HEIGHT / 2 + 100;
      if (inp.clickPos.x >= bx && inp.clickPos.x <= bx + 160 && inp.clickPos.y >= by && inp.clickPos.y <= by + 45) {
        this.screen = "worldmap";
      }
      const rx = DESIGN_WIDTH / 2 - 80, ry = DESIGN_HEIGHT / 2 + 155;
      if (inp.clickPos.x >= rx && inp.clickPos.x <= rx + 160 && inp.clickPos.y >= ry && inp.clickPos.y <= ry + 45) {
        if (this.currentLevel) this.startLevel(this.currentLevel);
      }
    }
  }
  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  render() {
    this.renderer.clear();
    switch (this.screen) {
      case "menu":
        this.renderMenu();
        break;
      case "worldmap":
        this.renderWorldMap();
        break;
      case "level":
        this.renderLevel();
        break;
      case "victory":
        this.renderLevel();
        this.renderVictory();
        break;
      case "defeat":
        this.renderLevel();
        this.renderDefeat();
        break;
    }
  }
  // ─── Menu Render ───────────────────────────────────────────────
  renderMenu() {
    this.renderer.drawTitleScreen(this.menuTime, this.input.getState().pointer, isMuted(), this.activeLoreModal);
  }
  // ─── World Map Render ──────────────────────────────────────────
  renderWorldMap() {
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
  renderLevel() {
    if (!this.currentLevel) return;
    const ctx = this.renderer.ctx;
    const r = this.renderer;
    const level = this.currentLevel;
    const pointer = this.input.getState().pointer;
    r.drawBackground(level.id, level.path);
    for (const dec of this.decorations) {
      switch (dec.type) {
        case "tree":
          r.drawTree(dec.x, dec.y, dec.size, level.id, dec.variant);
          break;
        case "rock":
          r.drawRock(dec.x, dec.y, dec.size, level.id, dec.variant);
          break;
        case "bush":
          r.drawBush(dec.x, dec.y, dec.size, level.id, dec.variant);
          break;
        case "mushroom":
          r.drawMushroom(dec.x, dec.y, dec.size, level.id);
          break;
        case "stump":
          r.drawStump(dec.x, dec.y, dec.size, level.id);
          break;
        case "bones":
          r.drawBones(dec.x, dec.y, dec.size);
          break;
        case "sign":
          r.drawSign(dec.x, dec.y, dec.size, level.id);
          break;
      }
    }
    r.drawPath(level.path, level.id);
    r.drawSpawnGate(level.spawnPosition);
    r.drawBase(level.basePosition);
    for (let i = 0; i < level.buildSlots.length; i++) {
      const slot = level.buildSlots[i];
      const occupied = this.towers.some((t) => t.slotIndex === i);
      const hovered = !occupied && pointInCircle(pointer, slot, BALANCE.ui.slotHitRadius);
      const selected = this.selectedSlot === i;
      r.drawBuildSlot(slot.x, slot.y, occupied, hovered, selected);
    }
    if (this.selectedTower) {
      const stats = this.getTowerStats(this.selectedTower);
      r.drawRangeCircle(this.selectedTower.x, this.selectedTower.y, stats.range);
    }
    for (const tower of this.towers) {
      this.renderTower(tower);
    }
    for (const soldier of this.soldiers) {
      if (!soldier.alive) continue;
      this.drawInterpolated(soldier, (view) => drawSoldierDirect(ctx, view, this.menuTime));
    }
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      this.drawInterpolated(enemy, (view) => this.renderEnemy(view));
    }
    this.renderMeteors();
    for (const proj of this.projectilePool.getActive()) {
      if (!proj.active) continue;
      this.drawInterpolated(proj, (view) => this.renderProjectile(view));
    }
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
    for (const ft of this.textPool.getActive()) {
      if (!ft.active) continue;
      const alpha = ft.life / ft.maxLife;
      ctx.globalAlpha = alpha;
      r.drawTextWithShadow(ft.text, ft.x, ft.y, ft.color, ft.size, "center", "Inter", true);
    }
    ctx.globalAlpha = 1;
    if (this.radialMenu) {
      this.renderRadialMenu();
    }
    r.drawVignette();
    this.renderHUD();
    this.renderSpellsHUD();
    this.renderSpellTargeting();
    if (this.tutorialStep > 0 && !this.tutorialDismissed) {
      this.renderTutorial();
    }
    if (this.paused) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
      r.drawTextWithShadow("PAUSED", DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 - 10, "#ffd866", 48, "center", "MedievalSharp");
      r.drawText("Press Esc or click the pause button to resume", DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 + 40, "rgba(255,255,255,0.7)", 16);
    }
  }
  renderMeteors() {
    const ctx = this.renderer.ctx;
    for (const m of this.meteors) {
      if (!m.active) continue;
      this.drawInterpolated(m, (view) => {
        ctx.save();
        const grad = ctx.createRadialGradient(view.x, view.y, 2, view.x, view.y, 14);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.3, "#ffcc00");
        grad.addColorStop(0.7, "#ea580c");
        grad.addColorStop(1, "rgba(220, 38, 38, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(view.x, view.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#451a03";
        ctx.beginPath();
        ctx.arc(view.x, view.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }
  }
  renderSpellsHUD() {
    const ctx = this.renderer.ctx;
    const r = this.renderer;
    const pointer = this.input.getState().pointer;
    const spellsConfig = [
      {
        id: "rain_of_fire",
        btn: this.spellBtnRain,
        icon: getSpell("rain_of_fire").icon,
        name: getSpell("rain_of_fire").name,
        hotkey: "1",
        totalCd: getSpell("rain_of_fire").cooldown
      },
      {
        id: "reinforcements",
        btn: this.spellBtnReinforce,
        icon: getSpell("reinforcements").icon,
        name: getSpell("reinforcements").name,
        hotkey: "2",
        totalCd: getSpell("reinforcements").cooldown
      }
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
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.arc(cx, cy + 3, radius, 0, Math.PI * 2);
      ctx.fill();
      const grad = ctx.createLinearGradient(cx, s.btn.y, cx, s.btn.y + s.btn.h);
      if (isActive) {
        grad.addColorStop(0, "#f59e0b");
        grad.addColorStop(1, "#b45309");
      } else if (isReady) {
        grad.addColorStop(0, isHovered ? "#475569" : "#334155");
        grad.addColorStop(1, isHovered ? "#1e293b" : "#0f172a");
      } else {
        grad.addColorStop(0, "#1c1917");
        grad.addColorStop(1, "#0c0a09");
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isActive ? "#ffd700" : isReady ? "#ca8a04" : "#57534e";
      ctx.lineWidth = isActive ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
      ctx.stroke();
      if (isActive) {
        const pulse = Math.sin(this.menuTime * 8) * 3 + 2;
        ctx.strokeStyle = "rgba(255, 215, 0, 0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.font = "24px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(s.icon, cx, cy + 1);
      if (!isReady) {
        const progress = cd / s.totalCd;
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress, false);
        ctx.closePath();
        ctx.fill();
        r.drawTextWithShadow(`${Math.ceil(cd)}s`, cx, cy + 1, "#ffffff", 13, "center", "Inter", true);
      }
      ctx.fillStyle = "#451a03";
      ctx.beginPath();
      ctx.arc(s.btn.x + 8, s.btn.y + 8, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 9px Inter";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(s.hotkey, s.btn.x + 8, s.btn.y + 8);
      ctx.restore();
    }
  }
  renderSpellTargeting() {
    if (!this.activeSpell) return;
    const r = this.renderer;
    const pointer = this.input.getState().pointer;
    const radius = this.activeSpell === "rain_of_fire" ? getSpell("rain_of_fire").radius ?? 80 : getSpell("reinforcements").radius ?? 40;
    const pulse = Math.sin(this.menuTime * 6) * 3;
    r.drawRangeCircle(pointer.x, pointer.y, radius + pulse);
    const ctx = this.renderer.ctx;
    ctx.save();
    ctx.strokeStyle = this.activeSpell === "rain_of_fire" ? "rgba(239, 68, 68, 0.7)" : "rgba(56, 189, 248, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pointer.x - radius, pointer.y);
    ctx.lineTo(pointer.x + radius, pointer.y);
    ctx.moveTo(pointer.x, pointer.y - radius);
    ctx.lineTo(pointer.x, pointer.y + radius);
    ctx.stroke();
    r.drawTextWithShadow(
      this.activeSpell === "rain_of_fire" ? "\u{1F525} Click to Rain Fire!" : "\u{1F6E1} Click to Deploy Soldiers!",
      pointer.x,
      pointer.y - radius - 15,
      "#ffd700",
      13,
      "center",
      "MedievalSharp",
      true
    );
    ctx.restore();
  }
  renderTower(tower) {
    drawTowerDirect(this.renderer.ctx, tower);
  }
  renderEnemy(enemy) {
    drawEnemyDirect(this.renderer.ctx, enemy, this.menuTime);
  }
  renderProjectile(proj) {
    drawProjectileDirect(this.renderer.ctx, proj);
  }
  renderRadialMenu() {
    if (!this.radialMenu) return;
    const ctx = this.renderer.ctx;
    const r = this.renderer;
    const menu = this.radialMenu;
    const pointer = this.input.getState().pointer;
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.arc(menu.x, menu.y, 90, 0, Math.PI * 2);
    ctx.fill();
    const itemCount = menu.items.length;
    menu.hoveredIndex = -1;
    for (let i = 0; i < itemCount; i++) {
      const itemAngle = i / itemCount * Math.PI * 2 - Math.PI / 2;
      const ix = menu.x + Math.cos(itemAngle) * 50;
      const iy = menu.y + Math.sin(itemAngle) * 50;
      const item = menu.items[i];
      const hovered = pointInCircle(pointer, { x: ix, y: iy }, 24);
      if (hovered) menu.hoveredIndex = i;
      ctx.fillStyle = !item.enabled ? "rgba(80,80,80,0.8)" : hovered ? lighten(item.color, 0.3) : item.color;
      ctx.beginPath();
      ctx.arc(ix, iy, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = !item.enabled ? "rgba(100,100,100,0.5)" : hovered ? "#ffd700" : "rgba(255,255,255,0.3)";
      ctx.lineWidth = hovered ? 3 : 2;
      ctx.beginPath();
      ctx.arc(ix, iy, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = "16px Inter";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.fillText(item.icon, ix, iy - 2);
      if (item.cost !== void 0) {
        ctx.fillStyle = item.enabled ? "#ffd700" : "#888";
        ctx.font = "bold 10px Inter";
        ctx.fillText(`${item.cost}`, ix, iy + 12);
      }
      ctx.fillStyle = !item.enabled ? "#666" : "#fff";
      ctx.font = "10px Inter";
      ctx.fillText(item.label, ix, iy + 30);
      if (!item.enabled) {
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = "#f44336";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ix - 16, iy - 16);
        ctx.lineTo(ix + 16, iy + 16);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    if (menu.hoveredIndex >= 0) {
      const item = menu.items[menu.hoveredIndex];
      if (item.description) {
        const tx = menu.x;
        const ty = menu.y - 80;
        r.drawPanel(tx - 80, ty - 14, 160, 28);
        r.drawText(item.description, tx, ty, "#f0e6d2", 11);
      }
    }
  }
  // ─── HUD ───────────────────────────────────────────────────────
  renderHUD() {
    const pointer = this.input.getState().pointer;
    const currentEarlyBonus = this.currentWaveIndex < this.waves.length ? this.waves[this.currentWaveIndex].earlyCallBonus || 15 : 0;
    this.renderer.drawTopHUD(
      this.gold,
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
  }
  // ─── Tutorial ──────────────────────────────────────────────────
  /** Where the current tutorial hint points, shared by render and input. */
  getTutorialTarget() {
    let text = "";
    let targetX = DESIGN_WIDTH / 2;
    let targetY = DESIGN_HEIGHT / 2;
    switch (this.tutorialStep) {
      case 1:
        text = "Click a build slot (+) to place a tower!";
        if (this.currentLevel && this.currentLevel.buildSlots.length > 0) {
          targetX = this.currentLevel.buildSlots[0].x;
          targetY = this.currentLevel.buildSlots[0].y - 50;
        }
        break;
      case 2:
        text = "Click your tower to upgrade it!";
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
  getTutorialSkipRect() {
    const target = this.getTutorialTarget();
    if (!target) return null;
    return { x: target.x - 58, y: target.y + 20, w: 116, h: 22 };
  }
  /** Permanently stop showing the tutorial and remember it. */
  dismissTutorial() {
    this.tutorialDismissed = true;
    this.tutorialStep = 0;
    this.save.tutorialDismissed = true;
    writeSave(this.save);
  }
  renderTutorial() {
    const r = this.renderer;
    const target = this.getTutorialTarget();
    if (!target) return;
    const { text, x: targetX, y: targetY } = target;
    const pulse = Math.sin(this.menuTime * 4) * 0.15 + 0.85;
    r.drawPanel(targetX - 170, targetY - 18, 340, 36, 0.9 * pulse);
    r.drawText(text, targetX, targetY, "#ffd866", 14, "center", "Inter", true);
    const skip = this.getTutorialSkipRect();
    if (skip) {
      const pointer = this.input.getState().pointer;
      const hovered = this.hitRect(pointer, skip);
      r.drawButton(skip.x, skip.y, skip.w, skip.h, "Skip tutorial", hovered);
    }
  }
  // ─── Victory/Defeat ────────────────────────────────────────────
  renderVictory() {
    const ctx = this.renderer.ctx;
    const r = this.renderer;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    r.drawPanel(DESIGN_WIDTH / 2 - 200, DESIGN_HEIGHT / 2 - 120, 400, 300);
    r.drawTextWithShadow("VICTORY!", DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 - 80, "#ffd866", 40, "center", "MedievalSharp");
    for (let i = 0; i < 3; i++) {
      r.drawStar(DESIGN_WIDTH / 2 - 40 + i * 40, DESIGN_HEIGHT / 2 - 20, 18, i < this.resultStars);
    }
    r.drawText(`Lives remaining: ${this.lives}/${this.maxLives}`, DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 + 20, "#f0e6d2", 16);
    r.drawText(`Lives lost: ${this.livesLost}`, DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 + 45, "#ccc", 13);
    const pointer = this.input.getState().pointer;
    const continueHover = this.hitRect(pointer, { x: DESIGN_WIDTH / 2 - 80, y: DESIGN_HEIGHT / 2 + 100, w: 160, h: 45 });
    r.drawButton(DESIGN_WIDTH / 2 - 80, DESIGN_HEIGHT / 2 + 100, 160, 45, "Continue", continueHover);
    const retryHover = this.hitRect(pointer, { x: DESIGN_WIDTH / 2 - 80, y: DESIGN_HEIGHT / 2 + 155, w: 160, h: 45 });
    r.drawButton(DESIGN_WIDTH / 2 - 80, DESIGN_HEIGHT / 2 + 155, 160, 45, "Retry", retryHover);
  }
  renderDefeat() {
    const ctx = this.renderer.ctx;
    const r = this.renderer;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    r.drawPanel(DESIGN_WIDTH / 2 - 200, DESIGN_HEIGHT / 2 - 100, 400, 260);
    r.drawTextWithShadow("DEFEAT", DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 - 60, "#e74c3c", 40, "center", "MedievalSharp");
    r.drawText("The kingdom has fallen...", DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 - 10, "#ccc", 16);
    r.drawText(`Reached wave ${this.currentWaveIndex + 1}/${this.waves.length}`, DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 + 20, "#aaa", 14);
    const pointer = this.input.getState().pointer;
    const continueHover = this.hitRect(pointer, { x: DESIGN_WIDTH / 2 - 80, y: DESIGN_HEIGHT / 2 + 100, w: 160, h: 45 });
    r.drawButton(DESIGN_WIDTH / 2 - 80, DESIGN_HEIGHT / 2 + 100, 160, 45, "World Map", continueHover);
    const retryHover = this.hitRect(pointer, { x: DESIGN_WIDTH / 2 - 80, y: DESIGN_HEIGHT / 2 + 155, w: 160, h: 45 });
    r.drawButton(DESIGN_WIDTH / 2 - 80, DESIGN_HEIGHT / 2 + 155, 160, 45, "Retry", retryHover);
  }
  // ─── Color Helpers ─────────────────────────────────────────────
  // adjustColor/darken/lighten now live in core/color.ts (single source).
};

// tools/smoke.ts
var DT = 1 / 60;
var failures = [];
function check(label, condition, detail = "") {
  if (!condition) failures.push(`${label}${detail ? ` \u2014 ${detail}` : ""}`);
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
}
function makeGame() {
  const canvas = makeCanvas();
  const game2 = new Game(canvas);
  return game2;
}
function step(game2, seconds, renderEvery = 6) {
  const steps = Math.round(seconds / DT);
  let rendered = 0;
  const t02 = performance.now();
  for (let i = 0; i < steps; i++) {
    game2.renderAlpha = (i % 3 + 1) / 3;
    game2.update(DT);
    if (i % renderEvery === 0) {
      game2.render();
      rendered++;
    }
  }
  return performance.now() - t02;
}
var game = makeGame();
for (const screen of ["menu", "worldmap"]) {
  game.screen = screen;
  step(game, 0.5);
  game.render();
}
check("menu + worldmap render without throwing", true);
var towerIds = Object.keys(TOWERS);
var totalSteps = 0;
var t0 = performance.now();
for (const level of LEVELS) {
  game.startLevel(level);
  check(`level ${level.id} starts`, game.screen === "level");
  for (let i = 0; i < Math.min(towerIds.length, level.buildSlots.length); i++) {
    const id = towerIds[i];
    game.gold = 99999;
    game.buildTower(i, id);
    const tower = game.towers[game.towers.length - 1];
    if (!tower) continue;
    game.upgradeTower(tower);
    game.upgradeTower(tower);
    const specs = TOWERS[id].specializations;
    game.specializeTower(tower, 0);
    game.specializeTower(tower, 0);
    if (tower.specId !== specs[0].specId && tower.specId !== specs[1].specId) {
      failures.push(`level ${level.id}: tower ${id} never specialized`);
    }
  }
  game.castSpell("rain_of_fire", 640, 360);
  game.castSpell("reinforcements", 640, 360);
  game.lives = 9999;
  game.gameSpeed = 2;
  step(game, 240, 6);
  totalSteps += Math.round(240 / DT);
  const snapshot = {
    wave: game.currentWaveIndex,
    totalWaves: level.waves.length,
    enemiesSeen: game.nextEnemyId - 1,
    particles: game.particlePool.activeCount,
    projectiles: game.projectilePool.activeCount
  };
  console.log(
    `  ${level.id}: wave ${snapshot.wave}/${snapshot.totalWaves}, spawned ${snapshot.enemiesSeen} enemies, particles ${snapshot.particles}, projectiles ${snapshot.projectiles}`
  );
  for (const tower of [...game.towers]) game.sellTower(tower);
  check(`level ${level.id} reached at least wave 2`, game.currentWaveIndex >= 1);
}
var simMs = performance.now() - t0;
console.log(`
simulated ${totalSteps} fixed steps across 5 levels in ${simMs.toFixed(0)}ms (${(simMs / totalSteps).toFixed(3)}ms per step incl. render every 6th)`);
game.startLevel(LEVELS[1]);
game.gold = 99999;
game.spawnEnemy("bat");
step(game, 3, 60);
var bat = game.enemies.find((e) => e.dataId === "bat");
check("(b) flying enemy gets a facing direction", !!bat && typeof bat.facingLeft === "boolean");
game.startLevel(LEVELS[0]);
game.castSpell("reinforcements", 300, 300);
var beforeReinforcements = game.soldiers.filter((s) => s.towerId === null).length;
step(game, 40, 30);
var afterReinforcements = game.soldiers.filter((s) => s.towerId === null).length;
check(
  "(a) reinforcements expire permanently",
  beforeReinforcements === 2 && afterReinforcements === 0,
  `before ${beforeReinforcements}, after ${afterReinforcements}`
);
game.startLevel(LEVELS[0]);
game.gold = 99999;
game.buildTower(0, "barracks");
var barracks = game.towers[0];
barracks.stunTimer = 5;
step(game, 0.2, 60);
var squad = game.soldiers.filter((s) => s.towerId === barracks.id && s.alive);
var squadBefore = squad.map((s) => ({ id: s.id, x: s.x, y: s.y }));
step(game, 1, 60);
var squadMoved = squad.some((s) => {
  const before = squadBefore.find((b) => b.id === s.id);
  return !before || Math.hypot(s.x - before.x, s.y - before.y) > 0.5;
});
check(
  "(c) stunned barracks squad stands down",
  squad.length === 2 && !squadMoved,
  `squad ${squad.length}, moved ${squadMoved}`
);
game.startLevel(LEVELS[0]);
game.gold = 99999;
game.buildTower(0, "archer");
step(game, 6, 30);
check("(d) projectiles stay within the map", game.projectilePool.getActive().every((p) => p.x >= -50 && p.x <= 1330 && p.y >= -200 && p.y <= 800));
var g2 = makeGame();
g2.startLevel(LEVELS[0]);
g2.spawnEnemy("goblin");
var centre = g2.enemies[0];
g2.spawnEnemy("goblin");
var rim = g2.enemies[1];
centre.x = 500;
centre.y = 300;
rim.x = 500 + 44;
rim.y = 300;
centre.armor = 0;
rim.armor = 0;
g2.applySplashDamage("test", 500, 300, 45, 100, "physical");
var centreLoss = centre.maxHp - centre.hp;
var rimLoss = rim.maxHp - rim.hp;
check(
  "(e) splash damage falls off with distance",
  centreLoss === 100 && rimLoss < centreLoss && rimLoss > 0,
  `centre ${centreLoss}, rim ${rimLoss.toFixed(1)}`
);
game.startLevel(LEVELS[0]);
check("(g) first wave delay comes from balance", Math.abs(game.waveTimer - 5) < 1e-4, `waveTimer ${game.waveTimer}`);
game.startLevel(LEVELS[0]);
game.tutorialStep = 1;
var g3 = makeGame();
g3.startLevel(LEVELS[0]);
check("(f) tutorial is active on level 1", g3.tutorialStep === 1);
g3.dismissTutorial();
check("(f) tutorial dismiss is saved", g3.tutorialDismissed === true && JSON.parse(globalThis.localStorage.getItem("last_bastion_save")).tutorialDismissed === true);
game.startLevel(LEVELS[0]);
game.gold = 99999;
game.paused = true;
var enemiesBeforePause = game.nextEnemyId;
var towersBeforePause = game.towers.length;
step(game, 5, 30);
check("pause freezes spawning", game.nextEnemyId === enemiesBeforePause);
check("pause blocks building", game.towers.length === towersBeforePause);
var g4 = makeGame();
g4.toggleMutePersisted();
var savedMute = JSON.parse(globalThis.localStorage.getItem("last_bastion_save")).settings.muted;
check("mute is persisted to the save file", savedMute === true, `saved ${savedMute}`);
check(
  "warlord summon interval comes from data",
  ENEMIES.orc_warlord.abilities?.summon?.interval === 10 && ENEMIES.orc_warlord.abilities?.stun?.range === 120
);
check("shaman heal comes from data", ENEMIES.dark_shaman.abilities?.heal?.amount === 5);
console.log(`
${failures.length === 0 ? "ALL CHECKS PASSED" : `${failures.length} FAILURE(S)`}`);
for (const f of failures) console.log(` - ${f}`);
process.exit(failures.length === 0 ? 0 : 1);
