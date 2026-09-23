import { describe, it, expect } from 'vitest';
import {
  selectActiveHero,
  selectActiveHeroCommand,
  selectBattleOutcome,
  selectCanRedo,
  selectCanUndo,
  selectCurrentExecutingCommand,
  selectCurrentStepIndex,
  selectIsAtPresent,
  selectLivingEnemies,
  selectLivingHeroes,
  selectPhase,
  selectPresent,
  selectRound,
  selectTimeline,
  selectTotalSteps
} from './battle.selectors';
import { HistoryState, INITIAL_TIMELINE_STEP } from './history.meta-reducer';
import { BattleState } from '../core/models/battle-state.model';
import { INITIAL_BATTLE_STATE } from '../core/models/battle-initial-data';
import { QueuedCommand } from '../core/models/battle-action.model';

describe('Battle Selectors', () => {
  const dummyCommand: QueuedCommand = {
    sourceId: 'hero-ness',
    sourceName: 'Ness',
    actionType: 'bash',
    targetId: 'enemy-starman',
    initiativeRoll: 25
  };

  const mockHistoryState: HistoryState<BattleState> = {
    past: [INITIAL_BATTLE_STATE],
    present: {
      ...INITIAL_BATTLE_STATE,
      round: 2,
      phase: 'resolving',
      queuedCommands: { 'hero-ness': dummyCommand },
      turnOrder: [dummyCommand],
      currentTurnIndex: 0,
      heroes: INITIAL_BATTLE_STATE.heroes.map((h, i) =>
        i === 3 ? { ...h, hp: 0, status: 'unconscious' } : h
      ),
      enemies: INITIAL_BATTLE_STATE.enemies.map((e, i) =>
        i === 0 ? { ...e, hp: 0, status: 'unconscious' } : e
      )
    },
    future: [INITIAL_BATTLE_STATE],
    timeline: [INITIAL_TIMELINE_STEP, { ...INITIAL_TIMELINE_STEP, stepIndex: 1, label: 'Ness Bash' }],
    currentIndex: 1
  };

  it('selectPresent should extract the current present battle state', () => {
    const present = selectPresent.projector(mockHistoryState);
    expect(present.round).toBe(2);
    expect(present.phase).toBe('resolving');
  });

  it('selectRound and selectPhase should return round number and current phase', () => {
    const round = selectRound.projector(mockHistoryState.present);
    const phase = selectPhase.projector(mockHistoryState.present);
    expect(round).toBe(2);
    expect(phase).toBe('resolving');
  });

  it('selectLivingHeroes and selectLivingEnemies should filter out unconscious combatants', () => {
    const livingHeroes = selectLivingHeroes.projector(mockHistoryState.present.heroes);
    const livingEnemies = selectLivingEnemies.projector(mockHistoryState.present.enemies);

    expect(livingHeroes.length).toBe(3); // 1 is unconscious
    expect(livingEnemies.length).toBe(2); // 1 is unconscious
  });

  it('selectActiveHero should return the hero at activeHeroIndex', () => {
    const hero = selectActiveHero.projector(mockHistoryState.present.heroes, 0);
    expect(hero?.name).toBe('Ness');
  });

  it('selectActiveHeroCommand should return the command queued for the active hero', () => {
    const cmd = selectActiveHeroCommand.projector(
      mockHistoryState.present.queuedCommands,
      mockHistoryState.present.heroes[0]
    );
    expect(cmd).toEqual(dummyCommand);
  });

  it('selectCurrentExecutingCommand should return the command at currentTurnIndex in turnOrder', () => {
    const cmd = selectCurrentExecutingCommand.projector(
      mockHistoryState.present.turnOrder,
      mockHistoryState.present.currentTurnIndex
    );
    expect(cmd).toEqual(dummyCommand);
  });

  it('selectTimeline, selectCurrentStepIndex, selectTotalSteps should reflect history metadata', () => {
    const timeline = selectTimeline.projector(mockHistoryState);
    const index = selectCurrentStepIndex.projector(mockHistoryState);
    const total = selectTotalSteps.projector(timeline);

    expect(timeline.length).toBe(2);
    expect(index).toBe(1);
    expect(total).toBe(2);
  });

  it('selectCanUndo, selectCanRedo, selectIsAtPresent should reflect past and future presence', () => {
    const canUndo = selectCanUndo.projector(mockHistoryState);
    const canRedo = selectCanRedo.projector(mockHistoryState);
    const isAtPresent = selectIsAtPresent.projector(mockHistoryState);

    expect(canUndo).toBe(true); // past has 1 item
    expect(canRedo).toBe(true); // future has 1 item
    expect(isAtPresent).toBe(false); // not at present because future has items
  });

  it('selectBattleOutcome should correctly project victory or defeat status', () => {
    const victoryOutcome = selectBattleOutcome.projector({
      ...INITIAL_BATTLE_STATE,
      phase: 'victory',
      battleOutcomeNarrative: 'VICTORY!'
    });
    expect(victoryOutcome.isVictory).toBe(true);
    expect(victoryOutcome.isDefeat).toBe(false);
    expect(victoryOutcome.narrative).toBe('VICTORY!');

    const defeatOutcome = selectBattleOutcome.projector({
      ...INITIAL_BATTLE_STATE,
      phase: 'defeat',
      battleOutcomeNarrative: 'DEFEAT'
    });
    expect(defeatOutcome.isVictory).toBe(false);
    expect(defeatOutcome.isDefeat).toBe(true);
  });
});
