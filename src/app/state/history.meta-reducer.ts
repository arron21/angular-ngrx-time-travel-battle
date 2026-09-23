import { Action, ActionReducer } from '@ngrx/store';
import { BattleState } from '../core/models/battle-state.model';
import { TimelineStepMetadata } from '../core/models/timeline.model';
import { BattleActions, TimeTravelActions } from './battle.actions';
import { INITIAL_BATTLE_STATE } from '../core/models/battle-initial-data';

export interface HistoryState<T> {
  readonly past: readonly T[];
  readonly present: T;
  readonly future: readonly T[];
  readonly timeline: readonly TimelineStepMetadata[];
  readonly currentIndex: number;
}

export const INITIAL_TIMELINE_STEP: TimelineStepMetadata = {
  id: 'step-0',
  stepIndex: 0,
  round: 1,
  category: 'round_start',
  label: 'Battle Start',
  detail: 'Combatants ready their stances.',
  timestamp: Date.now()
};

export const INITIAL_HISTORY_STATE: HistoryState<BattleState> = {
  past: [],
  present: INITIAL_BATTLE_STATE,
  future: [],
  timeline: [INITIAL_TIMELINE_STEP],
  currentIndex: 0
};

const MAX_HISTORY_LIMIT = 80;

/**
 * Creates human-readable timeline step metadata for a dispatched battle action.
 */
function createTimelineStep(action: Action, state: BattleState, index: number): TimelineStepMetadata {
  let category: TimelineStepMetadata['category'] = 'turn_execution';
  let label = 'Combat Action';
  let detail = 'State updated';
  let actorName: string | undefined;
  let targetName: string | undefined;
  let isCritical = false;

  if (action.type === BattleActions.setHeroCommand.type) {
    const p = action as unknown as { heroId: string; command: { sourceName: string; actionType: string; spell?: { name: string }; item?: { name: string } } };
    category = 'command_input';
    actorName = p.command.sourceName;
    const actionDesc = p.command.spell?.name || p.command.item?.name || p.command.actionType.toUpperCase();
    label = `${p.command.sourceName}: ${actionDesc}`;
    detail = `${p.command.sourceName} queued action: ${actionDesc}`;
  } else if (action.type === BattleActions.confirmRound.type) {
    category = 'round_start';
    label = `Round ${state.round} Ordered`;
    detail = `Initiative order resolved for Round ${state.round}. Execution begins!`;
  } else if (action.type === BattleActions.applyStepResult.type) {
    const p = action as unknown as { result: { actorName: string; targetName: string; abilityName: string; narrative: string; isCritical?: boolean } };
    category = 'turn_execution';
    actorName = p.result.actorName;
    targetName = p.result.targetName;
    isCritical = !!p.result.isCritical;
    label = `${p.result.actorName} ➔ ${p.result.abilityName}`;
    detail = p.result.narrative;
  } else if (action.type === BattleActions.finishRound.type) {
    category = 'round_end';
    label = `Round End`;
    detail = `Round finished. Status recovery checked.`;
  } else if (action.type === BattleActions.resetBattle.type) {
    category = 'round_start';
    label = 'Battle Reset';
    detail = 'Battlefield reset to initial encounter.';
  }

  return {
    id: `step-${index}-${Date.now()}`,
    stepIndex: index,
    round: state.round,
    category,
    label,
    detail,
    actorName,
    targetName,
    isCritical,
    timestamp: Date.now()
  };
}

/**
 * Higher-Order NgRx Meta-Reducer providing First-Class Time-Travel (Undo, Redo, Micro-Scrubber).
 * 
 * Supports:
 * - Micro-scrubbing backward and forward through any state transition.
 * - Timeline Branching: If the user scrubs backward and performs a new action,
 *   the previous future timeline is cleanly dropped.
 * - Snapshot memory bounding to prevent unbounded growth.
 */
export function timeTravelMetaReducer(
  reducer: ActionReducer<BattleState>
): ActionReducer<HistoryState<BattleState>> {
  return (state: HistoryState<BattleState> = INITIAL_HISTORY_STATE, action: Action): HistoryState<BattleState> => {
    // 1. Time Travel: UNDO
    if (action.type === TimeTravelActions.undo.type) {
      if (state.past.length === 0) return state;

      const previousPresent = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      const newFuture = [state.present, ...state.future];
      const newIndex = Math.max(0, state.currentIndex - 1);

      return {
        ...state,
        past: newPast,
        present: previousPresent,
        future: newFuture,
        currentIndex: newIndex
      };
    }

    // 2. Time Travel: REDO
    if (action.type === TimeTravelActions.redo.type) {
      if (state.future.length === 0) return state;

      const nextPresent = state.future[0];
      const newFuture = state.future.slice(1);
      const newPast = [...state.past, state.present];
      const newIndex = Math.min(state.timeline.length - 1, state.currentIndex + 1);

      return {
        ...state,
        past: newPast,
        present: nextPresent,
        future: newFuture,
        currentIndex: newIndex
      };
    }

    // 3. Time Travel: JUMP TO STEP (Micro-Scrubber)
    if (action.type === TimeTravelActions.jumpToStep.type) {
      const { targetStepIndex } = action as unknown as { targetStepIndex: number };
      if (targetStepIndex === state.currentIndex) return state;

      // Reconstruct combined state array: [...past, present, ...future]
      const allStates = [...state.past, state.present, ...state.future];
      const clampedIndex = Math.max(0, Math.min(targetStepIndex, allStates.length - 1));

      const newPast = allStates.slice(0, clampedIndex);
      const newPresent = allStates[clampedIndex];
      const newFuture = allStates.slice(clampedIndex + 1);

      return {
        ...state,
        past: newPast,
        present: newPresent,
        future: newFuture,
        currentIndex: clampedIndex
      };
    }

    // 4. Time Travel: REWIND TO ROUND START
    if (action.type === TimeTravelActions.rewindToRoundStart.type) {
      // Find the last round_start step in past
      let targetIndex = 0;
      for (let i = state.currentIndex - 1; i >= 0; i--) {
        if (state.timeline[i]?.category === 'round_start') {
          targetIndex = i;
          break;
        }
      }
      const allStates = [...state.past, state.present, ...state.future];
      return {
        ...state,
        past: allStates.slice(0, targetIndex),
        present: allStates[targetIndex],
        future: allStates.slice(targetIndex + 1),
        currentIndex: targetIndex
      };
    }

    // 5. Actions that do not create history snapshots (transient UI navigation)
    if (
      action.type === BattleActions.selectHeroForInput.type ||
      action.type === BattleActions.nextHeroInput.type ||
      action.type === BattleActions.previousHeroInput.type ||
      action.type === BattleActions.toggleAutoPlay.type ||
      action.type === BattleActions.setAutoPlay.type
    ) {
      const newPresent = reducer(state.present, action);
      return {
        ...state,
        present: newPresent
      };
    }

    // 6. Regular Battle Actions (creating history snapshots)
    const newPresent = reducer(state.present, action);

    // If state didn't change (e.g. invalid action), return state as-is
    if (newPresent === state.present) {
      return state;
    }

    // If reset battle was dispatched, wipe history back to clean state
    if (action.type === BattleActions.resetBattle.type) {
      return INITIAL_HISTORY_STATE;
    }

    // CRITICAL: Branching Timeline Resolution!
    // If the user scrubbed backwards (future.length > 0) and issues a new command,
    // the previous future timeline is dropped and replaced with the new path!
    const truncatedTimeline = state.timeline.slice(0, state.currentIndex + 1);
    const newStepIndex = truncatedTimeline.length;
    const newStep = createTimelineStep(action, newPresent, newStepIndex);

    const updatedPast = [...state.past, state.present].slice(-MAX_HISTORY_LIMIT);

    return {
      past: updatedPast,
      present: newPresent,
      future: [], // Future timeline dropped upon divergent action!
      timeline: [...truncatedTimeline, newStep],
      currentIndex: newStepIndex
    };
  };
}
