import { Combatant } from './combatant.model';
import { GoodsItem, PsiSpell } from './battle-action.model';
import { BattleState } from './battle-state.model';

export const INITIAL_HEROES: readonly Combatant[] = [
  {
    id: 'hero-ness',
    name: 'Ness',
    type: 'hero',
    role: 'knight',
    maxHp: 280,
    hp: 280,
    maxPp: 60,
    pp: 60,
    offense: 48,
    defense: 35,
    speed: 22,
    status: 'ok',
    sprite: 'ness'
  },
  {
    id: 'hero-paula',
    name: 'Paula',
    type: 'hero',
    role: 'ninja',
    maxHp: 175,
    hp: 175,
    maxPp: 110,
    pp: 110,
    offense: 26,
    defense: 20,
    speed: 38,
    status: 'ok',
    sprite: 'paula'
  },
  {
    id: 'hero-jeff',
    name: 'Jeff',
    type: 'hero',
    role: 'black-mage',
    maxHp: 200,
    hp: 200,
    maxPp: 30,
    pp: 30,
    offense: 36,
    defense: 28,
    speed: 30,
    status: 'ok',
    sprite: 'jeff'
  },
  {
    id: 'hero-poo',
    name: 'Poo',
    type: 'hero',
    role: 'white-mage',
    maxHp: 230,
    hp: 230,
    maxPp: 85,
    pp: 85,
    offense: 38,
    defense: 30,
    speed: 26,
    status: 'ok',
    sprite: 'poo'
  }
];

export const INITIAL_ENEMIES: readonly Combatant[] = [
  {
    id: 'enemy-crow',
    name: 'Spiteful Crow',
    type: 'enemy',
    maxHp: 130,
    hp: 130,
    maxPp: 0,
    pp: 0,
    offense: 28,
    defense: 16,
    speed: 40,
    status: 'ok',
    sprite: 'crow'
  },
  {
    id: 'enemy-starman',
    name: 'Starman Jr.',
    type: 'enemy',
    maxHp: 440,
    hp: 440,
    maxPp: 80,
    pp: 80,
    offense: 44,
    defense: 30,
    speed: 27,
    status: 'ok',
    sprite: 'starman'
  },
  {
    id: 'enemy-robot',
    name: 'Atomic Robot',
    type: 'enemy',
    maxHp: 240,
    hp: 240,
    maxPp: 30,
    pp: 30,
    offense: 34,
    defense: 32,
    speed: 16,
    status: 'ok',
    sprite: 'robot'
  }
];

export const HERO_SPELLS: Record<string, readonly PsiSpell[]> = {
  'hero-ness': [
    {
      id: 'psi-rockin',
      name: 'PSI Rockin α',
      ppCost: 12,
      power: 60,
      scope: 'all_enemies',
      kind: 'damage',
      description: 'Unleashes psychokinetic soundwaves against all enemies!'
    },
    {
      id: 'psi-lifeup-alpha',
      name: 'Lifeup α',
      ppCost: 8,
      power: 80,
      scope: 'single_ally',
      kind: 'heal',
      description: 'Restores about 80 HP to one companion.'
    }
  ],
  'hero-paula': [
    {
      id: 'psi-fire',
      name: 'PSI Fire β',
      ppCost: 14,
      power: 85,
      scope: 'single_enemy',
      kind: 'damage',
      description: 'Engulfs a foe in searing psychokinetic flames.'
    },
    {
      id: 'psi-freeze',
      name: 'PSI Freeze α',
      ppCost: 12,
      power: 70,
      scope: 'single_enemy',
      kind: 'damage',
      statusInflicted: 'paralyzed',
      description: 'Blasts cold energy that can leave the target paralyzed!'
    },
    {
      id: 'psi-flash',
      name: 'PSI Flash α',
      ppCost: 10,
      power: 0,
      scope: 'single_enemy',
      kind: 'status',
      statusInflicted: 'asleep',
      description: 'Creates a blinding light that lulls an enemy into slumber.'
    }
  ],
  'hero-jeff': [
    {
      id: 'gadget-bazooka',
      name: 'Heavy Bazooka',
      ppCost: 5,
      power: 75,
      scope: 'single_enemy',
      kind: 'damage',
      description: 'Fires a high-explosive round engineered by Jeff.'
    }
  ],
  'hero-poo': [
    {
      id: 'psi-lifeup-beta',
      name: 'Lifeup Party β',
      ppCost: 20,
      power: 110,
      scope: 'all_allies',
      kind: 'heal',
      description: 'Bathes the entire party in restorative light.'
    },
    {
      id: 'psi-healing-gamma',
      name: 'Healing γ',
      ppCost: 10,
      power: 0,
      scope: 'single_ally',
      kind: 'heal',
      description: 'Cleanses sleep, paralysis, or ailments from an ally.'
    }
  ]
};

export const INITIAL_GOODS: readonly GoodsItem[] = [
  {
    id: 'item-burger',
    name: 'Fresh Burger',
    count: 3,
    scope: 'single_ally',
    kind: 'heal_hp',
    power: 100,
    description: 'A juicy hamburger. Restores 100 HP.'
  },
  {
    id: 'item-tart',
    name: 'Magic Tart',
    count: 2,
    scope: 'single_ally',
    kind: 'heal_pp',
    power: 30,
    description: 'A sweet pastry that restores 30 PP.'
  },
  {
    id: 'item-herb',
    name: 'Refreshing Herb',
    count: 3,
    scope: 'single_ally',
    kind: 'cure_status',
    power: 0,
    description: 'A fragrant herb that cures Sleep or Paralysis.'
  },
  {
    id: 'item-rocket',
    name: 'Super Rocket',
    count: 1,
    scope: 'single_enemy',
    kind: 'damage',
    power: 150,
    description: 'High-yield bottle rocket! Deals catastrophic single-target damage.'
  }
];

export const INITIAL_BATTLE_STATE: BattleState = {
  round: 1,
  phase: 'input',
  heroes: INITIAL_HEROES,
  enemies: INITIAL_ENEMIES,
  activeHeroIndex: 0,
  queuedCommands: {},
  turnOrder: [],
  currentTurnIndex: 0,
  lastExecutionResult: null,
  battleLog: ['A hostile party confronted you!'],
  availableSpells: HERO_SPELLS,
  sharedGoods: INITIAL_GOODS,
  battleOutcomeNarrative: null,
  isAutoPlaying: true
};
