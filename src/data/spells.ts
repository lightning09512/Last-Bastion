import { SpellData } from './types';

export const SPELLS: SpellData[] = [
  {
    id: 'rain_of_fire',
    name: 'Rain of Fire',
    icon: '🔥',
    cooldown: 30,
    damage: 80,
    radius: 80,
    delay: 0.8,
    description: 'Call down a devastating rain of fire on a target area.',
  },
  {
    id: 'reinforcements',
    name: 'Reinforcements',
    icon: '🛡',
    cooldown: 20,
    duration: 15,
    description: 'Summon 2 temporary soldiers at a target point on the path.',
  },
];
