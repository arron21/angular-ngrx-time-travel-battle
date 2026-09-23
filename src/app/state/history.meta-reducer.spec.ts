import { describe, it, expect } from 'vitest';
import { timeTravelMetaReducer, HistoryState, INITIAL_HISTORY_STATE } from './history.meta-reducer';
import { battleReducer } from './battle.reducer';
import { BattleActions, TimeTravelActions } from './battle.actions';
import { BattleState } from '../core/models/battle-state.model';

describe('timeTravelMetaReducer', () => {
  const wrappedReducer = timeTravelMetaReducer(battleReducer);

  it('initializes with default history state', () => {
    const state = wrappedReducer(undefined, { type: '@@INIT' });
    expect(state.past.length).toBe(0);
    expect(state.future.length).toBe(0);
    expect(state.currentIndex).toBe(0);
    expect(state.timeline.length).toBe(1);
    expect(state.present.round).toBe(1);
  });

  it('records state into past when a battle action modifies state', () => {
    let state = wrappedReducer(undefined, { type: '@@INIT' });
    
    // Set command for Ness
    state = wrappedReducer(state, BattleActions.setHeroCommand({
      heroId: 'hero-ness',
      command: {
        sourceId: 'hero-ness',
        sourceName: 'Ness',
        actionType: 'bash',
        targetId: 'enemy-starman',
        initiativeRoll: 25
      }
    }));

    expect(state.past.length).toBe(1);
    expect(state.currentIndex).toBe(1);
    expect(state.timeline.length).toBe(2);
    expect(state.present.queuedCommands['hero-ness']).toBeDefined();
    expect(state.future.length).toBe(0);
  });

  it('undoes back to previous state and pushes present to future', () => {
    let state = wrappedReducer(undefined, { type: '@@INIT' });
    
    state = wrappedReducer(state, BattleActions.setHeroCommand({
      heroId: 'hero-ness',
      command: {
        sourceId: 'hero-ness',
        sourceName: 'Ness',
        actionType: 'bash',
        targetId: 'enemy-starman',
        initiativeRoll: 25
      }
    }));

    // Trigger UNDO
    state = wrappedReducer(state, TimeTravelActions.undo());

    expect(state.past.length).toBe(0);
    expect(state.future.length).toBe(1);
    expect(state.currentIndex).toBe(0);
    expect(state.present.queuedCommands['hero-ness']).toBeUndefined();
  });

  it('redoes forward from future into present', () => {
    let state = wrappedReducer(undefined, { type: '@@INIT' });
    
    state = wrappedReducer(state, BattleActions.setHeroCommand({
      heroId: 'hero-ness',
      command: {
        sourceId: 'hero-ness',
        sourceName: 'Ness',
        actionType: 'bash',
        targetId: 'enemy-starman',
        initiativeRoll: 25
      }
    }));

    state = wrappedReducer(state, TimeTravelActions.undo());
    state = wrappedReducer(state, TimeTravelActions.redo());

    expect(state.past.length).toBe(1);
    expect(state.future.length).toBe(0);
    expect(state.currentIndex).toBe(1);
    expect(state.present.queuedCommands['hero-ness']).toBeDefined();
  });

  it('jumps directly to step index via micro scrubber', () => {
    let state = wrappedReducer(undefined, { type: '@@INIT' });
    
    // Create 3 actions
    state = wrappedReducer(state, BattleActions.setHeroCommand({
      heroId: 'hero-ness',
      command: { sourceId: 'hero-ness', sourceName: 'Ness', actionType: 'bash', targetId: 'enemy-starman', initiativeRoll: 25 }
    }));
    state = wrappedReducer(state, BattleActions.setHeroCommand({
      heroId: 'hero-paula',
      command: { sourceId: 'hero-paula', sourceName: 'Paula', actionType: 'bash', targetId: 'enemy-starman', initiativeRoll: 40 }
    }));
    state = wrappedReducer(state, BattleActions.confirmRound());

    expect(state.currentIndex).toBe(3);

    // Jump to Step 1 (after Ness command)
    state = wrappedReducer(state, TimeTravelActions.jumpToStep({ targetStepIndex: 1 }));
    expect(state.currentIndex).toBe(1);
    expect(state.present.phase).toBe('input');
    expect(state.future.length).toBe(2);

    // Jump forward to Step 3
    state = wrappedReducer(state, TimeTravelActions.jumpToStep({ targetStepIndex: 3 }));
    expect(state.currentIndex).toBe(3);
    expect(state.present.phase).toBe('resolving');
    expect(state.future.length).toBe(0);
  });

  it('DROPS future timeline when user scrubs backward and branches with a new action', () => {
    let state = wrappedReducer(undefined, { type: '@@INIT' });
    
    // Command 1: Ness
    state = wrappedReducer(state, BattleActions.setHeroCommand({
      heroId: 'hero-ness',
      command: { sourceId: 'hero-ness', sourceName: 'Ness', actionType: 'bash', targetId: 'enemy-starman', initiativeRoll: 25 }
    }));

    // Command 2: Paula
    state = wrappedReducer(state, BattleActions.setHeroCommand({
      heroId: 'hero-paula',
      command: { sourceId: 'hero-paula', sourceName: 'Paula', actionType: 'bash', targetId: 'enemy-starman', initiativeRoll: 40 }
    }));

    expect(state.currentIndex).toBe(2);

    // Scrub back to step 1 (before Paula's command)
    state = wrappedReducer(state, TimeTravelActions.jumpToStep({ targetStepIndex: 1 }));
    expect(state.currentIndex).toBe(1);
    expect(state.future.length).toBe(1);

    // DIVERGENT ACTION: Paula uses PSI instead!
    state = wrappedReducer(state, BattleActions.setHeroCommand({
      heroId: 'hero-paula',
      command: { sourceId: 'hero-paula', sourceName: 'Paula', actionType: 'psi', targetId: 'enemy-crow', initiativeRoll: 40 }
    }));

    // Previous future timeline MUST BE DROPPED!
    expect(state.future.length).toBe(0);
    expect(state.currentIndex).toBe(2);
    // Paula's queued action should now be the new psi command
    expect(state.present.queuedCommands['hero-paula'].actionType).toBe('psi');
  });
});
