import { Combatant } from './combatant.model';
import { GoodsItem, PsiSpell, QueuedCommand, StepExecutionResult } from './battle-action.model';

export type BattlePhase = 
  | 'input'         // Player entering commands for 4 party members
  | 'resolving'     // Turn order executing step by step
  | 'round_end'     // End of round status checks / reset
  | 'victory'       // All enemies defeated
  | 'defeat';       // All heroes defeated

export interface BattleState {
  readonly round: number;
  readonly phase: BattlePhase;
  readonly heroes: readonly Combatant[];
  readonly enemies: readonly Combatant[];
  readonly activeHeroIndex: number; // 0..3 for whose turn it is to input commands
  readonly queuedCommands: Record<string, QueuedCommand>; // heroId -> command
  readonly turnOrder: readonly QueuedCommand[]; // resolved initiative order for current round
  readonly currentTurnIndex: number; // index into turnOrder currently resolving
  readonly lastExecutionResult: StepExecutionResult | null;
  readonly battleLog: readonly string[];
  readonly availableSpells: Record<string, readonly PsiSpell[]>; // heroId -> spells
  readonly sharedGoods: readonly GoodsItem[]; // shared party inventory
  readonly battleOutcomeNarrative: string | null;
  readonly isAutoPlaying: boolean; // whether round plays automatically or user steps
}
