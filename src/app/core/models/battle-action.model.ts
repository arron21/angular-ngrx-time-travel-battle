export type ActionType = 'bash' | 'psi' | 'goods' | 'defend';

export type TargetScope = 'single_enemy' | 'all_enemies' | 'single_ally' | 'all_allies' | 'self';

export interface PsiSpell {
  readonly id: string;
  readonly name: string;
  readonly ppCost: number;
  readonly power: number;
  readonly scope: TargetScope;
  readonly kind: 'damage' | 'heal' | 'status';
  readonly statusInflicted?: 'asleep' | 'paralyzed';
  readonly description: string;
}

export interface GoodsItem {
  readonly id: string;
  readonly name: string;
  readonly count: number;
  readonly scope: TargetScope;
  readonly kind: 'heal_hp' | 'heal_pp' | 'damage' | 'cure_status';
  readonly power: number;
  readonly description: string;
}

export interface QueuedCommand {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly actionType: ActionType;
  readonly spell?: PsiSpell;
  readonly item?: GoodsItem;
  readonly targetId?: string;
  readonly initiativeRoll: number; // speed + variance for execution order
}

export interface StepExecutionResult {
  readonly actorId: string;
  readonly actorName: string;
  readonly targetId: string;
  readonly targetName: string;
  readonly actionType: ActionType;
  readonly abilityName: string;
  readonly damage?: number;
  readonly heal?: number;
  readonly isCritical?: boolean;
  readonly isMiss?: boolean;
  readonly isFizzled?: boolean;
  readonly fizzleReason?: 'asleep' | 'paralyzed' | 'unconscious';
  readonly statusInflicted?: 'asleep' | 'paralyzed';
  readonly narrative: string;
  readonly isRetargeted?: boolean;
}
