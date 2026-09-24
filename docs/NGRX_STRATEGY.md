# NgRx State Management Strategy & Architecture

This document provides a technical breakdown of the NgRx state management architecture implemented in the **EarthBound × Final Fantasy Battle Engine**. It is designed as an architectural deep dive for technical interviews and enterprise-grade state machine design.

---

## 1. High-Level Architecture & Unidirectional Data Flow

The application follows the strict **Unidirectional Data Flow** pattern of NgRx, augmented by a custom Higher-Order Meta-Reducer that provides first-class, multi-timeline time travel (undo/redo/micro-scrubbing) directly inside the production runtime.

```
       ┌────────────────────────────────────────────────────────┐
       │                   Angular 22 UI                        │
       │  (TimelineScrubber, BattleArena, CharacterCards, etc.) │
       └──────────────┬────────────────────────▲────────────────┘
                      │                        │
             Dispatches Actions       Selects with Signals
                      │             (store.selectSignal)
                      ▼                        │
       ┌──────────────────────────────┐        │
       │    Action Groups (Typed)     │        │
       │   Battle & TimeTravel        │        │
       └──────────────┬───────────────┘        │
                      │                        │
                      ▼                        │
       ┌──────────────────────────────┐        │
       │  timeTravelMetaReducer       │        │
       │  (State-History Wrapper)     │        │
       │  - past / present / future   │        │
       │  - branching timeline prune  │        │
       └──────────────┬───────────────┘        │
                      │                        │
             Delegates to Feature              │
                      │                        │
                      ▼                        │
       ┌──────────────────────────────┐        │
       │      battleReducer           ├────────┼──────────────┐
       │  (Pure State Transitions)    │        │              │
       └──────────────▲───────────────┘        │              │
                      │                        │              │
                 Dispatches              Memoized          Notifies
               Paced Actions             Selectors          Stream
                      │                        │              │
       ┌──────────────┴───────────────┐        │              │
       │        BattleEffects         ├────────┘              │
       │  - Turn Sequencing Pacing    │                       │
       │  - Procedural Audio Triggers │                       │
       │  - Outcome Handling          │                       │
       └──────────────────────────────┘                       │
                      ▲                                       │
                      └───────────────────────────────────────┘
```

---

## 2. The State-History Meta-Reducer (`timeTravelMetaReducer`)

### Core Problem
Most games and enterprise state management systems treat "Undo" as either:
1. Simple UI input-stack pop (canceling the last button press).
2. Development-only tooling (Redux DevTools, which cannot be shipped to end-users as game logic).

In this project, **Time Travel is an official game mechanic**. The player can scrub forward and backward through individual combat turns, spell casts, and round resolutions at any moment.

### The Tuple State Model
Instead of storing state as a flat object, the meta-reducer wraps the state slice in a historical tuple:

```typescript
export interface HistoryState<T> {
  readonly past: readonly T[];                      // Historical immutable snapshots
  readonly present: T;                             // Active live state slice
  readonly future: readonly T[];                    // Fast-forward / redo buffer
  readonly timeline: readonly TimelineStepMetadata[]; // Human-readable metadata per step
  readonly currentIndex: number;                   // Active scrubber pointer index
}
```

### Action Interception Mechanics
The meta-reducer intercepts both time-travel commands and domain actions:

#### 1. Undo (`TimeTravelActions.undo`)
* Extracts the last snapshot from `past`.
* Moves current `present` to the front of `future`.
* Decrements `currentIndex`.
* Does **not** invoke the inner reducer (pure history traversal).

#### 2. Redo (`TimeTravelActions.redo`)
* Shifts the first snapshot from `future`.
* Pushes current `present` to the end of `past`.
* Increments `currentIndex`.

#### 3. Micro-Scrubber Jumping (`TimeTravelActions.jumpToStep`)
* Accepts an arbitrary `targetStepIndex`.
* Reconstructs the unified timeline array: `[...past, present, ...future]`.
* Slices into new `past`, `present`, and `future` segments based on the target index.
* Enables $\mathcal{O}(1)$ random-access scrubbing across the entire encounter.

#### 4. The Branching Timeline Guarantee (Paradox Resolution)
A critical edge case in time-travel systems is the **Grandfather Paradox**: *What happens if the player scrubs back to Turn 2 and selects a completely different action than what originally occurred?*

```
Original Timeline:  [Start] ──> [Turn 1: Attack] ──> [Turn 2: Fire] ──> [Turn 3: Defeat]
                                          ▲
Player rewinds here:                      │
New action chosen (Cure):   [Start] ──> [Turn 1: Attack] ──> [Turn 2: Cure] ──> (Future dropped!)
```

When any standard mutating action is dispatched while in the past (`future.length > 0`):
1. **The future timeline is completely pruned**: `future = []`.
2. Historical timeline metadata beyond `currentIndex` is truncated.
3. The new action is reduced against `present`, establishing a fresh timeline branch.

#### 5. Transient vs. Persistent Action Filtering
Actions that are purely navigational (e.g., selecting a hero in the UI, toggling auto-play) should not pollute the combat history stack:
```typescript
if (
  action.type === BattleActions.selectHeroForInput.type ||
  action.type === BattleActions.nextHeroInput.type ||
  action.type === BattleActions.previousHeroInput.type ||
  action.type === BattleActions.toggleAutoPlay.type ||
  action.type === BattleActions.setAutoPlay.type
) {
  // Directly reduce without creating a historical snapshot
  return { ...state, present: reducer(state.present, action) };
}
```

#### 6. Memory Bounding (`MAX_HISTORY_LIMIT`)
To prevent unbounded memory growth in long-running battles, `past` is constrained using a rolling buffer:
```typescript
const updatedPast = [...state.past, state.present].slice(-MAX_HISTORY_LIMIT);
```

---

## 3. Pure Feature Reducer (`battleReducer`)

The feature reducer is completely decoupled from time-travel logic. It operates as a pure, deterministic state machine handling:

* **Command Queuing**: Records moves per combatant and advances the active hero index to the next living party member.
* **Initiative Queue Construction**: On `confirmRound`, rolls speed variance ($Speed + \text{random}(0, \lfloor Speed / 4 \rfloor + 3)$) for both heroes and enemy AI, sorting the round's `turnOrder` in descending order.
* **Atomic Step Application (`applyStepResult`)**:
  - Decrements target HP and marks `status: 'unconscious'` if HP hits 0.
  - Caps healing at `maxHp`.
  - Decrements caster PP for PSI spells or reduces item counts from `sharedGoods`.
  - Sets `isDefending = true` when defend is used.
* **Phase Transitions**:
  - Evaluates living enemies $\rightarrow$ transitions to `'victory'` if all enemies are defeated.
  - Evaluates living heroes $\rightarrow$ transitions to `'defeat'` if all heroes are knocked out.
  - Transitions to `'round_end'` when all initiative turns resolve.
* **Round Reset (`finishRound`)**: Resets defending flags, rolls a 25% recovery check for sleep/paralysis, and increments the round counter.

---

## 4. Modern NgRx Action Groups (`createActionGroup`)

Actions are declared using modern typed action groups to eliminate magic strings and redundant type declarations:

```typescript
export const BattleActions = createActionGroup({
  source: 'Battle',
  events: {
    'Set Hero Command': props<{ heroId: string; command: QueuedCommand }>(),
    'Next Hero Input': emptyProps(),
    'Previous Hero Input': emptyProps(),
    'Select Hero For Input': props<{ heroIndex: number }>(),
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
```

---

## 5. Selectors & Angular 22 Signals Integration

NgRx selectors provide memoized projections. To integrate with modern Angular 22 reactivity:
* Components consume state using `store.selectSignal(selector)`.
* This yields reactive Angular Signals (`Signal<T>`) that trigger fine-grained DOM updates without triggering global change detection cycles.

```typescript
// Component consumption:
export class TimelineScrubberComponent {
  private store = inject(Store);

  timeline = this.store.selectSignal(selectTimeline);
  currentIndex = this.store.selectSignal(selectCurrentStepIndex);
  canUndo = this.store.selectSignal(selectCanUndo);
  canRedo = this.store.selectSignal(selectCanRedo);
  isAtPresent = this.store.selectSignal(selectIsAtPresent);
}
```

---

## 6. NgRx Effects as a Battle Orchestrator (`BattleEffects`)

NgRx state transitions are synchronous, but RPG combat requires dramatic timing (step forward $\rightarrow$ attack animation $\rightarrow$ damage popup $\rightarrow$ rolling meter decrement $\rightarrow$ step back).

`BattleEffects` acts as the **Battle Orchestrator**:
1. **Turn Sequencing (`startRoundExecution$`)**: When `confirmRound` is dispatched, waits 700ms before dispatching `executeNextStep`.
2. **Action Resolution Engine (`executeTurnStep$`)**:
   - Inspects the current turn command from the store.
   - Enforces **Status Interruption**: If the actor is Asleep or Paralyzed, fizzles the action immediately.
   - Enforces **Modern Auto-Retargeting**: If the original target died earlier in the round, automatically redirects the blow to the next surviving combatant.
   - Dispatches `applyStepResult({ result })`.
3. **Pacing Delay (`advanceAfterStep$`)**: If `isAutoPlaying` is active, waits 1350ms to allow EarthBound rolling meters and animations to complete before dispatching the next `executeNextStep`.
4. **Side Effect Audio Synthesis (`outcomeAudio$`, `timeTravelAudio$`, `menuAudio$`)**: Non-dispatching effects (`{ dispatch: false }`) that trigger synthesized 8-bit sounds via `RetroAudioService`.

---

## 7. Strict Immutability & Enterprise Runtime Checks

Configured in `app.config.ts`:
```typescript
provideStore(
  { [BATTLE_FEATURE_KEY]: timeTravelMetaReducer(battleReducer) },
  {
    runtimeChecks: {
      strictStateImmutability: true,
      strictActionImmutability: true,
      strictActionWithinNgZone: true
    }
  }
)
```
Enforcing `strictStateImmutability` guarantees that neither reducers, effects, nor components can accidentally mutate state objects, ensuring the integrity of historical snapshots across all time-travel scrubbing.
