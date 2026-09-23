import { createReducer, on } from '@ngrx/store';
import { BattleState } from '../core/models/battle-state.model';
import { INITIAL_BATTLE_STATE } from '../core/models/battle-initial-data';
import { BattleActions } from './battle.actions';
import { Combatant, isAlive, canAct } from '../core/models/combatant.model';
import { BattleCalculator } from '../core/models/battle-calculator';
import { QueuedCommand } from '../core/models/battle-action.model';

export const battleReducer = createReducer<BattleState>(
  INITIAL_BATTLE_STATE,

  on(BattleActions.setHeroCommand, (state, { heroId, command }): BattleState => {
    const updatedCommands = {
      ...state.queuedCommands,
      [heroId]: command
    };

    // Find next living hero who hasn't selected a command yet
    let nextIndex = state.activeHeroIndex;
    for (let i = 0; i < state.heroes.length; i++) {
      const idx = (state.activeHeroIndex + 1 + i) % state.heroes.length;
      const hero = state.heroes[idx];
      if (isAlive(hero) && !updatedCommands[hero.id]) {
        nextIndex = idx;
        break;
      }
    }

    return {
      ...state,
      queuedCommands: updatedCommands,
      activeHeroIndex: nextIndex
    };
  }),

  on(BattleActions.selectHeroForInput, (state, { heroIndex }): BattleState => {
    if (heroIndex >= 0 && heroIndex < state.heroes.length && isAlive(state.heroes[heroIndex])) {
      return { ...state, activeHeroIndex: heroIndex };
    }
    return state;
  }),

  on(BattleActions.nextHeroInput, (state): BattleState => {
    for (let i = 1; i <= state.heroes.length; i++) {
      const idx = (state.activeHeroIndex + i) % state.heroes.length;
      if (isAlive(state.heroes[idx])) {
        return { ...state, activeHeroIndex: idx };
      }
    }
    return state;
  }),

  on(BattleActions.previousHeroInput, (state): BattleState => {
    for (let i = 1; i <= state.heroes.length; i++) {
      const idx = (state.activeHeroIndex - i + state.heroes.length) % state.heroes.length;
      if (isAlive(state.heroes[idx])) {
        return { ...state, activeHeroIndex: idx };
      }
    }
    return state;
  }),

  on(BattleActions.confirmRound, (state): BattleState => {
    if (state.phase !== 'input') return state;

    // Fill in default attack commands for any living hero without a command
    const allHeroCommands: QueuedCommand[] = [];
    const aliveEnemies = state.enemies.filter(isAlive);
    const defaultTargetId = aliveEnemies.length > 0 ? aliveEnemies[0].id : undefined;

    state.heroes.forEach(hero => {
      if (!isAlive(hero)) return;
      if (state.queuedCommands[hero.id]) {
        allHeroCommands.push(state.queuedCommands[hero.id]);
      } else {
        allHeroCommands.push({
          sourceId: hero.id,
          sourceName: hero.name,
          actionType: 'bash',
          targetId: defaultTargetId,
          initiativeRoll: BattleCalculator.calculateInitiative(hero.speed)
        });
      }
    });

    // Enemy AI commands
    const enemyCommands = BattleCalculator.generateEnemyActions(state.enemies, state.heroes);

    // Combine and sort by initiative descending (Speed + roll)
    const combined = [...allHeroCommands, ...enemyCommands].sort(
      (a, b) => b.initiativeRoll - a.initiativeRoll
    );

    return {
      ...state,
      phase: 'resolving',
      turnOrder: combined,
      currentTurnIndex: 0,
      battleLog: [`--- Round ${state.round} Begins! ---`, ...state.battleLog.slice(0, 40)]
    };
  }),

  on(BattleActions.applyStepResult, (state, { result }): BattleState => {
    let heroes = [...state.heroes];
    let enemies = [...state.enemies];
    let sharedGoods = [...state.sharedGoods];

    // Helper to update a combatant in hero/enemy arrays
    const updateInList = (list: Combatant[], id: string, updater: (c: Combatant) => Combatant): Combatant[] => {
      return list.map(c => (c.id === id ? updater(c) : c));
    };

    // 1. Consume PP or items if applicable
    if (result.actionType === 'psi') {
      const hero = heroes.find(h => h.id === result.actorId);
      if (hero) {
        const spell = state.availableSpells[hero.id]?.find(s => s.name === result.abilityName);
        if (spell) {
          heroes = updateInList(heroes, hero.id, h => ({
            ...h,
            pp: Math.max(0, h.pp - spell.ppCost)
          }));
        }
      }
      const enemy = enemies.find(e => e.id === result.actorId);
      if (enemy) {
        enemies = updateInList(enemies, enemy.id, e => ({
          ...e,
          pp: Math.max(0, e.pp - 10)
        }));
      }
    } else if (result.actionType === 'goods') {
      sharedGoods = sharedGoods
        .map(item => {
          if (item.name === result.abilityName) {
            return { ...item, count: Math.max(0, item.count - 1) };
          }
          return item;
        })
        .filter(item => item.count > 0);
    } else if (result.actionType === 'defend') {
      heroes = updateInList(heroes, result.actorId, h => ({ ...h, isDefending: true }));
      enemies = updateInList(enemies, result.actorId, e => ({ ...e, isDefending: true }));
    }

    // 2. Apply damage / healing / status to target
    const applyTargetEffects = (combatant: Combatant): Combatant => {
      let hp = combatant.hp;
      let status = combatant.status;

      if (result.damage) {
        hp = Math.max(0, hp - result.damage);
        if (hp === 0) {
          status = 'unconscious';
        }
      }

      if (result.heal && status !== 'unconscious') {
        hp = Math.min(combatant.maxHp, hp + result.heal);
      }

      if (result.statusInflicted && status !== 'unconscious') {
        status = result.statusInflicted;
      }

      // If healing cured status
      if (result.actionType === 'goods' && result.abilityName === 'Refreshing Herb' && status !== 'unconscious') {
        status = 'ok';
      }
      if (result.actionType === 'psi' && result.abilityName.includes('Healing') && status !== 'unconscious') {
        status = 'ok';
      }

      return {
        ...combatant,
        hp,
        status
      };
    };

    heroes = updateInList(heroes, result.targetId, applyTargetEffects);
    enemies = updateInList(enemies, result.targetId, applyTargetEffects);

    // 3. Determine if victory or defeat has occurred
    const anyLivingEnemies = enemies.some(isAlive);
    const anyLivingHeroes = heroes.some(isAlive);

    let nextPhase = state.phase;
    let narrative = state.battleOutcomeNarrative;

    if (!anyLivingEnemies) {
      nextPhase = 'victory';
      narrative = 'YOU WON! The enemies were defeated!';
    } else if (!anyLivingHeroes) {
      nextPhase = 'defeat';
      narrative = 'All party members collapsed... Darkness overtook you.';
    }

    const nextTurnIndex = state.currentTurnIndex + 1;

    return {
      ...state,
      heroes,
      enemies,
      sharedGoods,
      currentTurnIndex: nextTurnIndex,
      lastExecutionResult: result,
      battleLog: [result.narrative, ...state.battleLog.slice(0, 40)],
      phase: nextPhase,
      battleOutcomeNarrative: narrative
    };
  }),

  on(BattleActions.finishRound, (state): BattleState => {
    if (state.phase === 'victory' || state.phase === 'defeat') return state;

    // Reset defending flags, roll for recovery from sleep/paralysis (25% chance)
    const tickCombatant = (c: Combatant): Combatant => {
      if (!isAlive(c)) return c;
      let status = c.status;
      if (status === 'asleep' || status === 'paralyzed') {
        if (Math.random() < 0.3) {
          status = 'ok';
        }
      }
      return {
        ...c,
        isDefending: false,
        status
      };
    };

    const heroes = state.heroes.map(tickCombatant);
    const enemies = state.enemies.map(tickCombatant);

    // Find first alive hero index
    const firstAliveIndex = heroes.findIndex(isAlive);

    return {
      ...state,
      round: state.round + 1,
      phase: 'input',
      heroes,
      enemies,
      activeHeroIndex: Math.max(0, firstAliveIndex),
      queuedCommands: {},
      turnOrder: [],
      currentTurnIndex: 0,
      lastExecutionResult: null,
      battleLog: [`=== Ready for Round ${state.round + 1} ===`, ...state.battleLog.slice(0, 40)]
    };
  }),

  on(BattleActions.toggleAutoPlay, (state): BattleState => ({
    ...state,
    isAutoPlaying: !state.isAutoPlaying
  })),

  on(BattleActions.setAutoPlay, (state, { isAutoPlaying }): BattleState => ({
    ...state,
    isAutoPlaying
  })),

  on(BattleActions.resetBattle, (): BattleState => ({
    ...INITIAL_BATTLE_STATE
  }))
);
