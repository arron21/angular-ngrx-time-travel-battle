import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { QueuedCommand, StepExecutionResult } from '../core/models/battle-action.model';

export const BattleActions = createActionGroup({
  source: 'Battle',
  events: {
    // Input phase navigation
    'Set Hero Command': props<{ heroId: string; command: QueuedCommand }>(),
    'Next Hero Input': emptyProps(),
    'Previous Hero Input': emptyProps(),
    'Select Hero For Input': props<{ heroIndex: number }>(),

    // Turn & Round Execution
    'Confirm Round': emptyProps(),
    'Execute Next Step': emptyProps(),
    'Apply Step Result': props<{ result: StepExecutionResult }>(),
    'Finish Round': emptyProps(),
    'Toggle Auto Play': emptyProps(),
    'Set Auto Play': props<{ isAutoPlaying: boolean }>(),
    'Reset Battle': emptyProps()
  }
});

export const TimeTravelActions = createActionGroup({
  source: 'Time Travel',
  events: {
    'Undo': emptyProps(),
    'Redo': emptyProps(),
    'Jump To Step': props<{ targetStepIndex: number }>(),
    'Rewind To Round Start': emptyProps()
  }
});
