import { LevelData } from './types';

export const LEVELS: LevelData[] = [
  {
    id: 'level_1',
    name: 'The Green Valley',
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
      { x: 1000, y: 350 },
      { x: 1100, y: 420 },
      { x: 1180, y: 500 },
      { x: 1220, y: 520 },
    ],
    buildSlots: [
      { x: 220, y: 130 },
      { x: 340, y: 240 },
      { x: 430, y: 390 },
      { x: 570, y: 180 },
      { x: 700, y: 340 },
      { x: 820, y: 290 },
      { x: 950, y: 460 },
      { x: 1060, y: 340 },
    ],
    waves: [
      {
        groups: [{ enemyId: 'goblin', count: 5, spawnInterval: 1.2, delay: 0 }],
        earlyCallBonus: 15,
      },
      {
        groups: [{ enemyId: 'goblin', count: 8, spawnInterval: 1.0, delay: 0 }],
        earlyCallBonus: 15,
      },
      {
        groups: [
          { enemyId: 'goblin', count: 6, spawnInterval: 0.9, delay: 0 },
          { enemyId: 'wolf', count: 3, spawnInterval: 1.0, delay: 2 },
        ],
        earlyCallBonus: 20,
      },
      {
        groups: [
          { enemyId: 'wolf', count: 5, spawnInterval: 0.8, delay: 0 },
          { enemyId: 'goblin', count: 5, spawnInterval: 0.8, delay: 1 },
        ],
        earlyCallBonus: 20,
      },
      {
        groups: [
          { enemyId: 'goblin', count: 8, spawnInterval: 0.7, delay: 0 },
          { enemyId: 'orc_warrior', count: 2, spawnInterval: 2.0, delay: 3 },
        ],
        earlyCallBonus: 25,
      },
      {
        groups: [
          { enemyId: 'wolf', count: 6, spawnInterval: 0.7, delay: 0 },
          { enemyId: 'orc_warrior', count: 3, spawnInterval: 1.5, delay: 2 },
        ],
        earlyCallBonus: 25,
      },
      {
        groups: [
          { enemyId: 'goblin', count: 10, spawnInterval: 0.6, delay: 0 },
          { enemyId: 'orc_warrior', count: 4, spawnInterval: 1.2, delay: 3 },
        ],
        earlyCallBonus: 30,
      },
      {
        groups: [
          { enemyId: 'orc_warrior', count: 5, spawnInterval: 1.0, delay: 0 },
          { enemyId: 'wolf', count: 8, spawnInterval: 0.5, delay: 2 },
          { enemyId: 'goblin', count: 10, spawnInterval: 0.5, delay: 1 },
        ],
        earlyCallBonus: 35,
      },
    ],
  },
  {
    id: 'level_2',
    name: 'Forest Pass',
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
      { x: 640, y: 680 },
    ],
    buildSlots: [
      { x: 540, y: 80 },
      { x: 740, y: 160 },
      { x: 320, y: 180 },
      { x: 220, y: 320 },
      { x: 500, y: 340 },
      { x: 760, y: 400 },
      { x: 1000, y: 430 },
      { x: 780, y: 560 },
      { x: 540, y: 620 },
    ],
    waves: [
      {
        groups: [{ enemyId: 'goblin', count: 8, spawnInterval: 1.0, delay: 0 }],
        earlyCallBonus: 15,
      },
      {
        groups: [
          { enemyId: 'goblin', count: 6, spawnInterval: 0.8, delay: 0 },
          { enemyId: 'wolf', count: 4, spawnInterval: 0.7, delay: 2 },
        ],
        earlyCallBonus: 20,
      },
      {
        groups: [
          { enemyId: 'orc_warrior', count: 3, spawnInterval: 1.5, delay: 0 },
          { enemyId: 'goblin', count: 8, spawnInterval: 0.6, delay: 1 },
        ],
        earlyCallBonus: 20,
      },
      {
        groups: [
          { enemyId: 'bat', count: 5, spawnInterval: 1.0, delay: 0 },
          { enemyId: 'wolf', count: 5, spawnInterval: 0.8, delay: 2 },
        ],
        earlyCallBonus: 25,
      },
      {
        groups: [
          { enemyId: 'orc_warrior', count: 4, spawnInterval: 1.2, delay: 0 },
          { enemyId: 'bat', count: 4, spawnInterval: 1.0, delay: 3 },
        ],
        earlyCallBonus: 25,
      },
      {
        groups: [
          { enemyId: 'goblin', count: 12, spawnInterval: 0.5, delay: 0 },
          { enemyId: 'orc_warrior', count: 4, spawnInterval: 1.0, delay: 2 },
          { enemyId: 'wolf', count: 6, spawnInterval: 0.6, delay: 3 },
        ],
        earlyCallBonus: 30,
      },
      {
        groups: [
          { enemyId: 'dark_shaman', count: 2, spawnInterval: 3.0, delay: 0 },
          { enemyId: 'orc_warrior', count: 5, spawnInterval: 1.0, delay: 1 },
          { enemyId: 'goblin', count: 8, spawnInterval: 0.5, delay: 2 },
        ],
        earlyCallBonus: 30,
      },
      {
        groups: [
          { enemyId: 'orc_warrior', count: 6, spawnInterval: 0.8, delay: 0 },
          { enemyId: 'bat', count: 8, spawnInterval: 0.6, delay: 2 },
          { enemyId: 'dark_shaman', count: 3, spawnInterval: 2.0, delay: 3 },
        ],
        earlyCallBonus: 35,
      },
      {
        groups: [
          { enemyId: 'troll', count: 1, spawnInterval: 0, delay: 0 },
          { enemyId: 'orc_warrior', count: 8, spawnInterval: 0.7, delay: 3 },
          { enemyId: 'wolf', count: 10, spawnInterval: 0.4, delay: 5 },
        ],
        earlyCallBonus: 40,
      },
    ],
  },
  {
    id: 'level_3',
    name: 'Broken Bridge',
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
      { x: 1180, y: 360 },
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
      { x: 1060, y: 360 },
    ],
    waves: [
      {
        groups: [
          { enemyId: 'goblin', count: 10, spawnInterval: 0.8, delay: 0 },
          { enemyId: 'wolf', count: 5, spawnInterval: 0.7, delay: 2 },
        ],
        earlyCallBonus: 20,
      },
      {
        groups: [
          { enemyId: 'orc_warrior', count: 4, spawnInterval: 1.2, delay: 0 },
          { enemyId: 'dark_shaman', count: 2, spawnInterval: 2.5, delay: 2 },
        ],
        earlyCallBonus: 25,
      },
      {
        groups: [
          { enemyId: 'bat', count: 8, spawnInterval: 0.6, delay: 0 },
          { enemyId: 'goblin', count: 8, spawnInterval: 0.5, delay: 1 },
        ],
        earlyCallBonus: 25,
      },
      {
        groups: [
          { enemyId: 'troll', count: 1, spawnInterval: 0, delay: 0 },
          { enemyId: 'orc_warrior', count: 6, spawnInterval: 1.0, delay: 3 },
        ],
        earlyCallBonus: 30,
      },
      {
        groups: [
          { enemyId: 'dark_shaman', count: 3, spawnInterval: 2.0, delay: 0 },
          { enemyId: 'orc_warrior', count: 8, spawnInterval: 0.7, delay: 1 },
          { enemyId: 'wolf', count: 8, spawnInterval: 0.5, delay: 3 },
        ],
        earlyCallBonus: 30,
      },
      {
        groups: [
          { enemyId: 'bat', count: 10, spawnInterval: 0.5, delay: 0 },
          { enemyId: 'troll', count: 2, spawnInterval: 3.0, delay: 2 },
        ],
        earlyCallBonus: 35,
      },
      {
        groups: [
          { enemyId: 'orc_warrior', count: 10, spawnInterval: 0.6, delay: 0 },
          { enemyId: 'dark_shaman', count: 4, spawnInterval: 2.0, delay: 2 },
          { enemyId: 'troll', count: 2, spawnInterval: 4.0, delay: 4 },
        ],
        earlyCallBonus: 40,
      },
      {
        groups: [
          { enemyId: 'goblin', count: 15, spawnInterval: 0.3, delay: 0 },
          { enemyId: 'wolf', count: 10, spawnInterval: 0.4, delay: 2 },
          { enemyId: 'orc_warrior', count: 8, spawnInterval: 0.6, delay: 3 },
          { enemyId: 'troll', count: 3, spawnInterval: 3.0, delay: 5 },
        ],
        earlyCallBonus: 50,
      },
    ],
  },
  {
    id: 'level_4',
    name: 'Dark Swamp',
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
      { x: 100, y: 600 },
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
      { x: 160, y: 500 },
    ],
    waves: [
      {
        groups: [
          { enemyId: 'goblin', count: 12, spawnInterval: 0.7, delay: 0 },
          { enemyId: 'orc_warrior', count: 4, spawnInterval: 1.5, delay: 2 },
        ],
        earlyCallBonus: 20,
      },
      {
        groups: [
          { enemyId: 'dark_shaman', count: 3, spawnInterval: 2.0, delay: 0 },
          { enemyId: 'orc_warrior', count: 6, spawnInterval: 1.0, delay: 1 },
          { enemyId: 'wolf', count: 6, spawnInterval: 0.6, delay: 2 },
        ],
        earlyCallBonus: 25,
      },
      {
        groups: [
          { enemyId: 'troll', count: 2, spawnInterval: 4.0, delay: 0 },
          { enemyId: 'bat', count: 8, spawnInterval: 0.6, delay: 2 },
        ],
        earlyCallBonus: 30,
      },
      {
        groups: [
          { enemyId: 'wolf', count: 10, spawnInterval: 0.4, delay: 0 },
          { enemyId: 'dark_shaman', count: 4, spawnInterval: 2.0, delay: 3 },
          { enemyId: 'orc_warrior', count: 6, spawnInterval: 0.8, delay: 2 },
        ],
        earlyCallBonus: 30,
      },
      {
        groups: [
          { enemyId: 'bat', count: 12, spawnInterval: 0.4, delay: 0 },
          { enemyId: 'troll', count: 2, spawnInterval: 3.0, delay: 3 },
          { enemyId: 'goblin', count: 10, spawnInterval: 0.4, delay: 1 },
        ],
        earlyCallBonus: 35,
      },
      {
        groups: [
          { enemyId: 'orc_warrior', count: 10, spawnInterval: 0.6, delay: 0 },
          { enemyId: 'dark_shaman', count: 5, spawnInterval: 1.5, delay: 2 },
          { enemyId: 'troll', count: 3, spawnInterval: 3.0, delay: 4 },
        ],
        earlyCallBonus: 40,
      },
      {
        groups: [
          { enemyId: 'goblin', count: 20, spawnInterval: 0.3, delay: 0 },
          { enemyId: 'orc_warrior', count: 8, spawnInterval: 0.5, delay: 2 },
          { enemyId: 'bat', count: 10, spawnInterval: 0.5, delay: 3 },
          { enemyId: 'dark_shaman', count: 4, spawnInterval: 2.0, delay: 4 },
        ],
        earlyCallBonus: 45,
      },
      {
        groups: [
          { enemyId: 'troll', count: 4, spawnInterval: 2.0, delay: 0 },
          { enemyId: 'orc_warrior', count: 12, spawnInterval: 0.5, delay: 3 },
          { enemyId: 'dark_shaman', count: 5, spawnInterval: 1.5, delay: 4 },
          { enemyId: 'wolf', count: 15, spawnInterval: 0.3, delay: 5 },
        ],
        earlyCallBonus: 50,
      },
    ],
  },
  {
    id: 'level_5',
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
      { x: 640, y: 680 },
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
      { x: 720, y: 640 },
    ],
    waves: [
      {
        groups: [
          { enemyId: 'orc_warrior', count: 6, spawnInterval: 1.0, delay: 0 },
          { enemyId: 'wolf', count: 8, spawnInterval: 0.5, delay: 2 },
        ],
        earlyCallBonus: 25,
      },
      {
        groups: [
          { enemyId: 'dark_shaman', count: 4, spawnInterval: 1.5, delay: 0 },
          { enemyId: 'orc_warrior', count: 8, spawnInterval: 0.7, delay: 1 },
        ],
        earlyCallBonus: 25,
      },
      {
        groups: [
          { enemyId: 'troll', count: 2, spawnInterval: 3.0, delay: 0 },
          { enemyId: 'bat', count: 10, spawnInterval: 0.5, delay: 2 },
          { enemyId: 'goblin', count: 15, spawnInterval: 0.3, delay: 1 },
        ],
        earlyCallBonus: 30,
      },
      {
        groups: [
          { enemyId: 'orc_warrior', count: 10, spawnInterval: 0.6, delay: 0 },
          { enemyId: 'dark_shaman', count: 5, spawnInterval: 1.5, delay: 2 },
          { enemyId: 'bat', count: 8, spawnInterval: 0.5, delay: 3 },
        ],
        earlyCallBonus: 35,
      },
      {
        groups: [
          { enemyId: 'troll', count: 3, spawnInterval: 2.5, delay: 0 },
          { enemyId: 'wolf', count: 12, spawnInterval: 0.3, delay: 2 },
          { enemyId: 'orc_warrior', count: 8, spawnInterval: 0.5, delay: 3 },
        ],
        earlyCallBonus: 35,
      },
      {
        groups: [
          { enemyId: 'dark_shaman', count: 6, spawnInterval: 1.0, delay: 0 },
          { enemyId: 'troll', count: 3, spawnInterval: 2.0, delay: 2 },
          { enemyId: 'orc_warrior', count: 10, spawnInterval: 0.5, delay: 3 },
          { enemyId: 'bat', count: 10, spawnInterval: 0.4, delay: 4 },
        ],
        earlyCallBonus: 40,
      },
      {
        groups: [
          { enemyId: 'goblin', count: 20, spawnInterval: 0.2, delay: 0 },
          { enemyId: 'orc_warrior', count: 12, spawnInterval: 0.4, delay: 3 },
          { enemyId: 'troll', count: 4, spawnInterval: 2.0, delay: 5 },
          { enemyId: 'dark_shaman', count: 6, spawnInterval: 1.0, delay: 4 },
        ],
        earlyCallBonus: 50,
      },
      {
        groups: [
          { enemyId: 'orc_warlord', count: 1, spawnInterval: 0, delay: 0 },
          { enemyId: 'orc_warrior', count: 15, spawnInterval: 0.4, delay: 3 },
          { enemyId: 'troll', count: 4, spawnInterval: 2.0, delay: 5 },
          { enemyId: 'dark_shaman', count: 6, spawnInterval: 1.0, delay: 4 },
          { enemyId: 'bat', count: 12, spawnInterval: 0.4, delay: 6 },
        ],
        earlyCallBonus: 60,
      },
    ],
  },
];
