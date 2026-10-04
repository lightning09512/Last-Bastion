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
    count: 5,
    description: 'Call down a devastating rain of fire on a target area.',
  },
  {
    id: 'reinforcements',
    name: 'Reinforcements',
    icon: '🛡',
    cooldown: 20,
    duration: 15,
    count: 2,
    damage: 8,
    radius: 40,
    description: 'Summon 2 temporary soldiers at a target point on the path.',
  },
];

/** Typed accessor so callers never rely on array order. */
export function getSpell(id: 'rain_of_fire' | 'reinforcements'): SpellData {
  const spell = SPELLS.find((s) => s.id === id);
  if (!spell) throw new Error(`Unknown spell: ${id}`);
  return spell;
}
