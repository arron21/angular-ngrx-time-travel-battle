export type CombatantType = 'hero' | 'enemy';
export type HeroRole = 'knight' | 'ninja' | 'black-mage' | 'white-mage';
export type CombatantStatus = 'ok' | 'asleep' | 'paralyzed' | 'unconscious';

export interface Combatant {
  readonly id: string;
  readonly name: string;
  readonly type: CombatantType;
  readonly role?: HeroRole;
  readonly maxHp: number;
  readonly hp: number;
  readonly maxPp: number;
  readonly pp: number;
  readonly offense: number;
  readonly defense: number;
  readonly speed: number;
  readonly status: CombatantStatus;
  readonly isDefending?: boolean;
  readonly sprite: string; // SVG or pixel asset representation
}

export function isAlive(combatant: Combatant): boolean {
  return combatant.hp > 0 && combatant.status !== 'unconscious';
}

export function canAct(combatant: Combatant): boolean {
  return isAlive(combatant) && combatant.status !== 'asleep' && combatant.status !== 'paralyzed';
}
