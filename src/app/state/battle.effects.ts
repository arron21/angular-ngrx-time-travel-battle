import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { delay, filter, map, tap, withLatestFrom } from 'rxjs';
import { BattleActions, TimeTravelActions } from './battle.actions';
import {
  selectBattleOutcome,
  selectCurrentExecutingCommand,
  selectCurrentTurnIndex,
  selectEnemies,
  selectHeroes,
  selectIsAutoPlaying,
  selectPhase,
  selectPresent,
  selectTurnOrder
} from './battle.selectors';
import { RetroAudioService } from '../core/audio/retro-audio.service';
import { BattleCalculator } from '../core/models/battle-calculator';
import { canAct, isAlive } from '../core/models/combatant.model';
import { StepExecutionResult } from '../core/models/battle-action.model';

@Injectable()
export class BattleEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private audio = inject(RetroAudioService);

  // When ConfirmRound is dispatched, kick off the first turn step after a dramatic pause
  startRoundExecution$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BattleActions.confirmRound),
      delay(700),
      map(() => BattleActions.executeNextStep())
    )
  );

  // Core execution engine for each turn in the round
  executeTurnStep$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BattleActions.executeNextStep),
      withLatestFrom(
        this.store.select(selectPhase),
        this.store.select(selectCurrentTurnIndex),
        this.store.select(selectTurnOrder),
        this.store.select(selectHeroes),
        this.store.select(selectEnemies),
        this.store.select(selectBattleOutcome)
      ),
      filter(([_, phase, __, ___, ____, _____, outcome]) => phase === 'resolving' && !outcome.isVictory && !outcome.isDefeat),
      map(([_, phase, turnIndex, turnOrder, heroes, enemies]) => {
        // If all turns have executed, finish the round
        if (turnIndex >= turnOrder.length) {
          return BattleActions.finishRound();
        }

        const command = turnOrder[turnIndex];
        const allCombatants = [...heroes, ...enemies];
        const actor = allCombatants.find(c => c.id === command.sourceId);

        // 1. If actor died mid-round before their turn, or doesn't exist: fizzle!
        if (!actor || !isAlive(actor)) {
          const result: StepExecutionResult = {
            actorId: command.sourceId,
            actorName: command.sourceName,
            targetId: '',
            targetName: '',
            actionType: command.actionType,
            abilityName: 'None',
            isFizzled: true,
            fizzleReason: 'unconscious',
            narrative: `${command.sourceName} is knocked out and could not take action!`
          };
          return BattleActions.applyStepResult({ result });
        }

        // 2. Status interruption: If actor is Asleep or Paralyzed, action fizzles!
        if (!canAct(actor)) {
          const reason = actor.status as 'asleep' | 'paralyzed';
          const result: StepExecutionResult = {
            actorId: actor.id,
            actorName: actor.name,
            targetId: '',
            targetName: '',
            actionType: command.actionType,
            abilityName: 'None',
            isFizzled: true,
            fizzleReason: reason,
            narrative: `${actor.name} is ${reason === 'asleep' ? 'fast asleep' : 'paralyzed'} and could not move!`
          };
          this.audio.playCancel();
          return BattleActions.applyStepResult({ result });
        }

        // 3. Resolve target with modern auto-retargeting
        const isSupport = command.actionType === 'goods' && (command.item?.kind.includes('heal') || command.item?.kind.includes('cure')) ||
          (command.actionType === 'psi' && command.spell?.kind === 'heal');

        const { target, wasRetargeted } = BattleCalculator.resolveTarget(
          command.targetId,
          heroes,
          enemies,
          !!isSupport
        );

        if (!target) {
          const result: StepExecutionResult = {
            actorId: actor.id,
            actorName: actor.name,
            targetId: '',
            targetName: '',
            actionType: command.actionType,
            abilityName: 'None',
            isFizzled: true,
            narrative: `${actor.name} found no viable targets!`
          };
          return BattleActions.applyStepResult({ result });
        }

        // 4. Calculate execution outcome
        let result: StepExecutionResult;
        if (command.actionType === 'defend') {
          result = {
            actorId: actor.id,
            actorName: actor.name,
            targetId: actor.id,
            targetName: actor.name,
            actionType: 'defend',
            abilityName: 'Defend',
            narrative: `${actor.name} assumed a solid defensive stance!`
          };
          this.audio.playSelect();
        } else if (command.actionType === 'psi' && command.spell) {
          result = BattleCalculator.executePsi(actor, target, command.spell, wasRetargeted);
          if (command.spell.kind === 'heal') {
            this.audio.playHeal();
          } else {
            this.audio.playPsi();
          }
        } else if (command.actionType === 'goods' && command.item) {
          result = BattleCalculator.executeGoods(actor, target, command.item, wasRetargeted);
          if (command.item.kind.includes('heal')) {
            this.audio.playHeal();
          } else {
            this.audio.playBash();
          }
        } else {
          // Default Bash attack
          result = BattleCalculator.executeBash(actor, target, wasRetargeted);
          if (result.isCritical) {
            this.audio.playSmash();
          } else {
            this.audio.playBash();
          }
        }

        return BattleActions.applyStepResult({ result });
      })
    )
  );

  // If autoplay is enabled and round is still resolving, queue the next step after a pacing delay
  advanceAfterStep$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BattleActions.applyStepResult),
      withLatestFrom(
        this.store.select(selectIsAutoPlaying),
        this.store.select(selectPhase),
        this.store.select(selectBattleOutcome)
      ),
      filter(([_, isAutoPlaying, phase, outcome]) => isAutoPlaying && phase === 'resolving' && !outcome.isVictory && !outcome.isDefeat),
      delay(1350), // Gives user time to appreciate EarthBound animations & rolling odometer
      map(() => BattleActions.executeNextStep())
    )
  );

  // Audio response to victory or defeat
  outcomeAudio$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BattleActions.applyStepResult),
        withLatestFrom(this.store.select(selectBattleOutcome)),
        tap(([_, outcome]) => {
          if (outcome.isVictory) {
            this.audio.playVictory();
          } else if (outcome.isDefeat) {
            this.audio.playCancel();
          }
        })
      ),
    { dispatch: false }
  );

  // Time-travel SFX when rewinding
  timeTravelAudio$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(TimeTravelActions.undo, TimeTravelActions.jumpToStep, TimeTravelActions.rewindToRoundStart),
        tap(() => {
          this.audio.playTimeRewind();
        })
      ),
    { dispatch: false }
  );

  // Menu cursor SFX
  menuAudio$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BattleActions.nextHeroInput, BattleActions.previousHeroInput, BattleActions.selectHeroForInput),
        tap(() => {
          this.audio.playCursor();
        })
      ),
    { dispatch: false }
  );
}
