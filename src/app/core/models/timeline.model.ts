export type TimelineStepCategory = 
  | 'round_start'
  | 'command_input'
  | 'turn_execution'
  | 'round_end'
  | 'battle_end';

export interface TimelineStepMetadata {
  readonly id: string;
  readonly stepIndex: number;
  readonly round: number;
  readonly category: TimelineStepCategory;
  readonly label: string;
  readonly detail: string;
  readonly actorName?: string;
  readonly targetName?: string;
  readonly isCritical?: boolean;
  readonly timestamp: number;
}
