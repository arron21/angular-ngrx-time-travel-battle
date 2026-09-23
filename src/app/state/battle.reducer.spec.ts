import { describe, it, expect } from 'vitest';
import { battleReducer } from './battle.reducer';
import { BattleActions } from './battle.actions';
import { INITIAL_BATTLE_STATE, INITIAL_HEROES, INITIAL_ENEMIES } from '../core/models/battle-initial-data';
import { BattleState } from '../core/models/battle-state.model';
import { StepExecutionResult } from '../core/models/battle-action.model';

describe('battleReducer', () => {
  it('should return initial state when an unknown action is passed', () => {
    const state = battleReducer(undefined, { type: 'UNKNOWN' });
    expect(state).toEqual(INITIAL_BATTLE_STATE);
  });

  describe('Hero Command Input', () => {
    it('should set hero command and advance to the next hero who needs a command', () => {
      const state = battleReducer(
        INITIAL_BATTLE_STATE,
        BattleActions.setHeroCommand({
          heroId: 'hero-ness',
          command: {
            sourceId: 'hero-ness',
            sourceName: 'Ness',
            actionType: 'bash',
            targetId: 'enemy-starman',
            initiativeRoll: 30
          }
        })
      );

      expect(state.queuedCommands['hero-ness']).toBeDefined();
      expect(state.queuedCommands['hero-ness'].actionType).toBe('bash');
      // Ness was index 0, should advance to Paula (index 1)
      expect(state.activeHeroIndex).toBe(1);
    });

    it('should allow manually navigating between heroes using previousHeroInput and nextHeroInput', () => {
      let state = battleReducer(INITIAL_BATTLE_STATE, BattleActions.nextHeroInput());
      expect(state.activeHeroIndex).toBe(1);

      state = battleReducer(state, BattleActions.previousHeroInput());
      expect(state.activeHeroIndex).toBe(0);

      // Select specific hero index
      state = battleReducer(state, BattleActions.selectHeroForInput({ heroIndex: 2 }));
      expect(state.activeHeroIndex).toBe(2);
    });
  });

  describe('Confirm Round & Initiative', () => {
    it('should lock in round, generate enemy actions, and sort turnOrder by initiative descending', () => {
      // Set command for Ness
      let state = battleReducer(
        INITIAL_BATTLE_STATE,
        BattleActions.setHeroCommand({
          heroId: 'hero-ness',
          command: {
            sourceId: 'hero-ness',
            sourceName: 'Ness',
            actionType: 'bash',
            targetId: 'enemy-crow',
            initiativeRoll: 10 // Slow roll
          }
        })
      );

      // Confirm round
      state = battleReducer(state, BattleActions.confirmRound());

      expect(state.phase).toBe('resolving');
      expect(state.currentTurnIndex).toBe(0);
      expect(state.turnOrder.length).toBeGreaterThan(0);

      // Verify turn order is sorted descending by initiativeRoll
      for (let i = 0; i < state.turnOrder.length - 1; i++) {
        expect(state.turnOrder[i].initiativeRoll).toBeGreaterThanOrEqual(
          state.turnOrder[i + 1].initiativeRoll
        );
      }
    });
  });

  describe('Apply Step Result', () => {
    it('should decrement target HP and inflict unconscious status when HP hits 0', () => {
      const damageResult: StepExecutionResult = {
        actorId: 'hero-ness',
        actorName: 'Ness',
        targetId: 'enemy-crow',
        targetName: 'Spiteful Crow',
        actionType: 'bash',
        abilityName: 'Bash',
        damage: 999, // Fatal damage
        narrative: 'Ness obliterated Spiteful Crow!'
      };

      const state = battleReducer(INITIAL_BATTLE_STATE, BattleActions.applyStepResult({ result: damageResult }));
      const crow = state.enemies.find(e => e.id === 'enemy-crow');

      expect(crow?.hp).toBe(0);
      expect(crow?.status).toBe('unconscious');
      expect(state.lastExecutionResult).toEqual(damageResult);
      expect(state.battleLog[0]).toContain('obliterated');
    });

    it('should heal target and cap HP at maxHp', () => {
      // Start with Ness at 50 HP
      const damagedState: BattleState = {
        ...INITIAL_BATTLE_STATE,
        heroes: INITIAL_BATTLE_STATE.heroes.map(h =>
          h.id === 'hero-ness' ? { ...h, hp: 50 } : h
        )
      };

      const healResult: StepExecutionResult = {
        actorId: 'hero-poo',
        actorName: 'Poo',
        targetId: 'hero-ness',
        targetName: 'Ness',
        actionType: 'psi',
        abilityName: 'Lifeup',
        heal: 80,
        narrative: 'Poo healed Ness for 80 HP!'
      };

      const state = battleReducer(damagedState, BattleActions.applyStepResult({ result: healResult }));
      const ness = state.heroes.find(h => h.id === 'hero-ness');
      expect(ness?.hp).toBe(130);
    });

    it('should deduct PP when PSI spell is executed', () => {
      const psiResult: StepExecutionResult = {
        actorId: 'hero-paula',
        actorName: 'Paula',
        targetId: 'enemy-starman',
        targetName: 'Starman Jr.',
        actionType: 'psi',
        abilityName: 'PSI Fire β',
        damage: 85,
        narrative: 'Paula cast PSI Fire β!'
      };

      const initialPaula = INITIAL_BATTLE_STATE.heroes.find(h => h.id === 'hero-paula');
      const initialPp = initialPaula?.pp ?? 110;

      const state = battleReducer(INITIAL_BATTLE_STATE, BattleActions.applyStepResult({ result: psiResult }));
      const paula = state.heroes.find(h => h.id === 'hero-paula');

      expect(paula?.pp).toBeLessThan(initialPp);
    });

    it('should decrement shared goods item count when an item is used', () => {
      const initialBurgers = INITIAL_BATTLE_STATE.sharedGoods.find(i => i.name === 'Fresh Burger')?.count ?? 3;

      const itemResult: StepExecutionResult = {
        actorId: 'hero-jeff',
        actorName: 'Jeff',
        targetId: 'hero-ness',
        targetName: 'Ness',
        actionType: 'goods',
        abilityName: 'Fresh Burger',
        heal: 100,
        narrative: 'Jeff used Fresh Burger!'
      };

      const state = battleReducer(INITIAL_BATTLE_STATE, BattleActions.applyStepResult({ result: itemResult }));
      const remainingBurgers = state.sharedGoods.find(i => i.name === 'Fresh Burger')?.count;

      expect(remainingBurgers).toBe(initialBurgers - 1);
    });

    it('should transition to victory phase when all enemies are defeated', () => {
      // Set all enemies to 1 HP
      const nearWinState: BattleState = {
        ...INITIAL_BATTLE_STATE,
        enemies: INITIAL_BATTLE_STATE.enemies.map(e => ({ ...e, hp: 1 }))
      };

      // Kill the first enemy
      let state = battleReducer(nearWinState, BattleActions.applyStepResult({
        result: {
          actorId: 'hero-ness', actorName: 'Ness', targetId: 'enemy-crow', targetName: 'Crow',
          actionType: 'bash', abilityName: 'Bash', damage: 10, narrative: 'Crow defeated!'
        }
      }));
      // Kill the second enemy
      state = battleReducer(state, BattleActions.applyStepResult({
        result: {
          actorId: 'hero-ness', actorName: 'Ness', targetId: 'enemy-starman', targetName: 'Starman',
          actionType: 'bash', abilityName: 'Bash', damage: 10, narrative: 'Starman defeated!'
        }
      }));
      // Kill the third enemy
      state = battleReducer(state, BattleActions.applyStepResult({
        result: {
          actorId: 'hero-ness', actorName: 'Ness', targetId: 'enemy-robot', targetName: 'Robot',
          actionType: 'bash', abilityName: 'Bash', damage: 10, narrative: 'Robot defeated!'
        }
      }));

      expect(state.phase).toBe('victory');
      expect(state.battleOutcomeNarrative).toContain('WON');
    });

    it('should transition to defeat phase when all heroes are knocked out', () => {
      // Set all heroes to 1 HP
      const nearDefeatState: BattleState = {
        ...INITIAL_BATTLE_STATE,
        heroes: INITIAL_BATTLE_STATE.heroes.map(h => ({ ...h, hp: 1 }))
      };

      let state = nearDefeatState;
      ['hero-ness', 'hero-paula', 'hero-jeff', 'hero-poo'].forEach(heroId => {
        state = battleReducer(state, BattleActions.applyStepResult({
          result: {
            actorId: 'enemy-starman', actorName: 'Starman', targetId: heroId, targetName: heroId,
            actionType: 'bash', abilityName: 'Bash', damage: 10, narrative: `${heroId} down!`
          }
        }));
      });

      expect(state.phase).toBe('defeat');
      expect(state.battleOutcomeNarrative).toContain('collapsed');
    });
  });

  describe('Finish Round & Reset', () => {
    it('should advance round number, reset defending flags, and set phase to input', () => {
      const endOfRoundState: BattleState = {
        ...INITIAL_BATTLE_STATE,
        round: 1,
        phase: 'resolving',
        heroes: INITIAL_BATTLE_STATE.heroes.map(h => ({ ...h, isDefending: true }))
      };

      const nextState = battleReducer(endOfRoundState, BattleActions.finishRound());

      expect(nextState.round).toBe(2);
      expect(nextState.phase).toBe('input');
      expect(nextState.heroes.every(h => !h.isDefending)).toBe(true);
      expect(nextState.queuedCommands).toEqual({});
      expect(nextState.turnOrder).toEqual([]);
    });

    it('should reset battle completely back to INITIAL_BATTLE_STATE', () => {
      const modifiedState: BattleState = {
        ...INITIAL_BATTLE_STATE,
        round: 4,
        phase: 'victory'
      };

      const resetState = battleReducer(modifiedState, BattleActions.resetBattle());
      expect(resetState.round).toBe(1);
      expect(resetState.phase).toBe('input');
    });
  });
});
