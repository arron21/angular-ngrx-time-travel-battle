import { createFeatureSelector, createSelector } from '@ngrx/store';
import { HistoryState } from './history.meta-reducer';
import { BattleState } from '../core/models/battle-state.model';
import { isAlive, canAct } from '../core/models/combatant.model';

export const BATTLE_FEATURE_KEY = 'battle';

export const selectBattleFeature = createFeatureSelector<HistoryState<BattleState>>(BATTLE_FEATURE_KEY);

// 1. Core State Selectors (Operate on `present`)
export const selectPresent = createSelector(
  selectBattleFeature,
  (historyState) => historyState.present
);

export const selectRound = createSelector(
  selectPresent,
  (battle) => battle.round
);

export const selectPhase = createSelector(
  selectPresent,
  (battle) => battle.phase
);

export const selectHeroes = createSelector(
  selectPresent,
  (battle) => battle.heroes
);

export const selectEnemies = createSelector(
  selectPresent,
  (battle) => battle.enemies
);

export const selectLivingHeroes = createSelector(
  selectHeroes,
  (heroes) => heroes.filter(isAlive)
);

export const selectLivingEnemies = createSelector(
  selectEnemies,
  (enemies) => enemies.filter(isAlive)
);

export const selectActiveHeroIndex = createSelector(
  selectPresent,
  (battle) => battle.activeHeroIndex
);

export const selectActiveHero = createSelector(
  selectHeroes,
  selectActiveHeroIndex,
  (heroes, index) => heroes[index] ?? null
);

export const selectQueuedCommands = createSelector(
  selectPresent,
  (battle) => battle.queuedCommands
);

export const selectActiveHeroCommand = createSelector(
  selectQueuedCommands,
  selectActiveHero,
  (commands, hero) => (hero ? commands[hero.id] ?? null : null)
);

export const selectTurnOrder = createSelector(
  selectPresent,
  (battle) => battle.turnOrder
);

export const selectCurrentTurnIndex = createSelector(
  selectPresent,
  (battle) => battle.currentTurnIndex
);

export const selectCurrentExecutingCommand = createSelector(
  selectTurnOrder,
  selectCurrentTurnIndex,
  (order, index) => order[index] ?? null
);

export const selectLastExecutionResult = createSelector(
  selectPresent,
  (battle) => battle.lastExecutionResult
);

export const selectBattleLog = createSelector(
  selectPresent,
  (battle) => battle.battleLog
);

export const selectAvailableSpellsForActiveHero = createSelector(
  selectPresent,
  selectActiveHero,
  (battle, hero) => (hero ? battle.availableSpells[hero.id] ?? [] : [])
);

export const selectSharedGoods = createSelector(
  selectPresent,
  (battle) => battle.sharedGoods
);

export const selectBattleOutcome = createSelector(
  selectPresent,
  (battle) => ({
    isVictory: battle.phase === 'victory',
    isDefeat: battle.phase === 'defeat',
    narrative: battle.battleOutcomeNarrative
  })
);

export const selectIsAutoPlaying = createSelector(
  selectPresent,
  (battle) => battle.isAutoPlaying
);

// 2. Time-Travel Micro-Scrubber Selectors
export const selectTimeline = createSelector(
  selectBattleFeature,
  (historyState) => historyState.timeline
);

export const selectCurrentStepIndex = createSelector(
  selectBattleFeature,
  (historyState) => historyState.currentIndex
);

export const selectTotalSteps = createSelector(
  selectTimeline,
  (timeline) => timeline.length
);

export const selectCanUndo = createSelector(
  selectBattleFeature,
  (historyState) => historyState.past.length > 0
);

export const selectCanRedo = createSelector(
  selectBattleFeature,
  (historyState) => historyState.future.length > 0
);

export const selectIsAtPresent = createSelector(
  selectBattleFeature,
  (historyState) => historyState.future.length === 0
);

export const selectCurrentStepMetadata = createSelector(
  selectTimeline,
  selectCurrentStepIndex,
  (timeline, index) => timeline[index] ?? null
);
