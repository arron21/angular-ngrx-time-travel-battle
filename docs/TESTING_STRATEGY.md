# Testing Strategy & Test Architecture

This document outlines the testing strategy, design patterns, and test matrix for the **EarthBound × Final Fantasy Battle Engine**. The suite is built with **Vitest** and **Angular 22**, providing rapid execution, complete layer isolation, and 100% pass rates across 64 automated tests.

---

## 1. Testing Philosophy & Test Pyramid

Our testing strategy follows a strict **Test Pyramid** approach:
* **High speed & deterministic execution**: Tests run in under 2 seconds without launching heavy browser instances or Karma.
* **Separation of Concerns**: Pure calculations, state mutations, effects, selectors, and UI components are tested in isolation.
* **Paradox & Invariant Verification**: Critical game invariants (e.g. time-travel timeline branching, target auto-redirection, status interruption) have dedicated assertion suites.

```
                  / \
                 /   \
                / UI  \        Component Specs (DOM, Click Events, Computed Signals)
               /───────\       [Cards, Scrubber, Arena, RollingMeter, App]
              / Effects \      Async Turn Orchestration, Audio Triggers
             /───────────\     [BattleEffects]
            /  Selectors  \    Isolated Projector Testing
           /───────────────\   [BattleSelectors]
          /    Reducers     \  State Mutations, KO transitions, History Meta-Reducer
         /───────────────────\ [battleReducer, historyMetaReducer]
        / Pure Business Logic \ Formulas, Dice Rolls, Auto-Retargeting
       /───────────────────────\[BattleCalculator, RetroAudioService]
```

---

## 2. Layer-by-Layer Testing Architecture

### Layer 1: Pure Business Logic & Formulas
* **File**: [`battle-calculator.spec.ts`](../src/app/core/models/battle-calculator.spec.ts) (5 tests)
* **Strategy**: Pure function execution with zero mocking.
* **What is Verified**:
  - **Initiative Calculation**: Confirms initiative roll falls within the speed variance boundary ($Speed \le Initiative \le Speed + \lfloor Speed/4 \rfloor + 4$).
  - **Physical Damage (Bash)**: Verifies attacker offense vs. target defense formula and defending damage reduction ($50\%$).
  - **Modern Auto-Retargeting**: When the intended target is dead (`status: 'unconscious'`), verifies attacks automatically redirect to the first living enemy and flags `wasRetargeted: true`.
  - **Enemy AI Generator**: Verifies enemy commands and targets are assigned only to living heroes.

---

### Layer 2: State-History Meta-Reducer (Time Travel)
* **File**: [`history.meta-reducer.spec.ts`](../src/app/state/history.meta-reducer.spec.ts) (6 tests)
* **Strategy**: Wraps `battleReducer` with `timeTravelMetaReducer` and executes sequential action streams.
* **What is Verified**:
  - **Initial State**: Past and future stacks are empty; timeline begins at Step 0.
  - **Recording Invariant**: Every mutating battle action pushes previous state to `past` and increments `currentIndex`.
  - **Undo**: Restores previous snapshot from `past`, moves current state to `future`, and decrements `currentIndex`.
  - **Redo**: Shifts next state from `future`, pushes current state to `past`, and increments `currentIndex`.
  - **Micro-Scrubber Random Access (`jumpToStep`)**: Jumps directly to any step index forwards or backwards.
  - **The Branching Timeline Paradox Guarantee**:
    ```typescript
    it('DROPS future timeline when user scrubs backward and branches with a new action', () => { ... });
    ```
    Confirms that if the user scrubs into the past (`future.length > 0`) and takes a divergent action, `future` is strictly wiped (`future.length === 0`), preventing timeline corruption.

---

### Layer 3: Feature Reducers & State Transitions
* **File**: [`battle.reducer.spec.ts`](../src/app/state/battle.reducer.spec.ts) (12 tests)
* **Strategy**: Direct reducer invocation: `newState = battleReducer(state, action)`.
* **What is Verified**:
  - **Command Queuing**: Stores move per hero and auto-advances active hero index.
  - **Input Navigation**: Hero selection with `previousHeroInput` and `nextHeroInput`.
  - **Round Locking & Initiative Sorting**: `confirmRound` builds `turnOrder` sorted descending by speed initiative.
  - **Damage & KO**: Decrements HP; transitions status to `'unconscious'` when HP hits 0.
  - **Healing Cap**: Heals party members up to, but never exceeding, `maxHp`.
  - **Resource Consumption**: Deducts PP for PSI abilities and decrements item counts from `sharedGoods`.
  - **Victory & Defeat Phase Transitions**: Evaluates battle end conditions automatically when all enemies or all heroes are knocked out.
  - **Round Reset (`finishRound`)**: Increments round counter, clears queued commands, and resets defending flags.

---

### Layer 4: Memoized Selectors (Isolated Projector Testing)
* **File**: [`battle.selectors.spec.ts`](../src/app/state/battle.selectors.spec.ts) (9 tests)
* **Strategy**: Uses `selector.projector(...)` to test projection logic in pure isolation without needing `TestBed` or store configuration.
* **What is Verified**:
  - `selectPresent`: Extracts the active state slice from the history tuple.
  - `selectLivingHeroes` / `selectLivingEnemies`: Correctly filters out unconscious combatants.
  - `selectActiveHero` & `selectActiveHeroCommand`: Maps active index to hero and queued command.
  - `selectCurrentExecutingCommand`: Indexes into `turnOrder` using `currentTurnIndex`.
  - `selectTimeline`, `selectCanUndo`, `selectCanRedo`, `selectIsAtPresent`: Correctly projects time-travel availability.
  - `selectBattleOutcome`: Evaluates victory and defeat flags.

---

### Layer 5: NgRx Effects (Asynchronous Orchestration)
* **File**: [`battle.effects.spec.ts`](../src/app/state/battle.effects.spec.ts) (4 tests)
* **Strategy**: Uses `@ngrx/effects/testing` (`provideMockActions`) with RxJS `firstValueFrom` and `Subject` action streams.
* **What is Verified**:
  - **Turn Delay Pacing (`startRoundExecution$`)**: Confirms `BattleActions.confirmRound` triggers `BattleActions.executeNextStep`.
  - **Audio Triggers (`timeTravelAudio$`, `menuAudio$`)**: Verifies that time-travel and navigation actions trigger the corresponding synthesizer sound effects on `RetroAudioService`.

---

### Layer 6: Web Audio Synthesizer
* **File**: [`retro-audio.service.spec.ts`](../src/app/core/audio/retro-audio.service.spec.ts) (3 tests)
* **Strategy**: Tests service instantiation, mute toggling, and headless invocation safety.
* **What is Verified**:
  - Mute state toggles cleanly.
  - Sound methods (`playBash`, `playSmash`, `playTimeRewind`, etc.) execute safely without throwing exceptions in environments where Web Audio API is uninitialized or mocked.

---

### Layer 7: Component Integration & UI Behaviors
* **Files**:
  - [`character-cards.component.spec.ts`](../src/app/components/character-cards/character-cards.component.spec.ts) (2 tests)
  - [`timeline-scrubber.component.spec.ts`](../src/app/components/timeline-scrubber/timeline-scrubber.component.spec.ts) (9 tests)
  - [`rolling-meter.component.spec.ts`](../src/app/components/rolling-meter/rolling-meter.component.spec.ts) (5 tests)
  - [`battle-arena.component.spec.ts`](../src/app/components/battle-arena/battle-arena.component.spec.ts) (5 tests)
  - [`app.component.spec.ts`](../src/app/app.component.spec.ts) (4 tests)
* **Strategy**: Angular `TestBed.createComponent` testing template bindings, computed signals, and user interaction dispatches.
* **What is Verified**:
  - **Conditional Commence Button**: Verifies that `⚡ COMMENCE` is completely hidden while moves 1, 2, and 3 are being entered, and dynamically appears inside `.commands-row` as soon as all 4 heroes have queued moves.
  - **Chrono-Scrubber**: Verifies step counter display, slider drag dispatches, navigation button dispatches (`undo`, `redo`, `rewindRound`), and past-state branching warnings.
  - **Mechanical Rolling Meters**: Verifies 3-digit zero-padding (`005`, `042`, `280`), low HP warning thresholds ($\le 25\%$), and input change handling.
  - **Battle Arena**: Verifies enemy rendering, targeting clicks, ticker messages, and damage popup triggers.
  - **App Shell**: Verifies header rendering, CRT scanline toggling, and architecture modal opening.

---

## 3. Test Execution Matrix

| Test Suite File | Layer | Tests | Key Invariants Covered |
| :--- | :--- | :---: | :--- |
| `battle-calculator.spec.ts` | Domain Math | 5 | Initiative formulas, defense mitigation, auto-retargeting |
| `history.meta-reducer.spec.ts` | Meta-Reducer | 6 | Undo/Redo, jump-to-step, branching timeline purge |
| `battle.reducer.spec.ts` | Feature Reducer | 12 | Commands, initiative queue, damage/heal, victory/defeat |
| `battle.selectors.spec.ts` | Selectors | 9 | Living combatants, active commands, timeline status |
| `battle.effects.spec.ts` | Effects | 4 | Action pacing, audio side effects, round start |
| `rolling-meter.component.spec.ts` | Component | 5 | Odometer zero-padding, warning threshold, animations |
| `character-cards.component.spec.ts`| Component | 2 | 4/4 ready requirement for commence button |
| `battle-arena.component.spec.ts` | Component | 5 | Enemy cards, live ticker, targeting, damage popups |
| `timeline-scrubber.component.spec.ts`| Component | 9 | Step counter, undo/redo dispatches, branch warnings |
| `retro-audio.service.spec.ts` | Service | 3 | Mute toggling, headless audio safe invocation |
| `app.component.spec.ts` | App Shell | 4 | Shell initialization, CRT scanlines, architecture modal |
| **Total** | **Full System** | **64** | **100% Pass Rate** |

---

## 4. Running the Tests

### Non-Interactive CI Mode
```bash
npm test -- --watch=false
```

### Interactive Watch Mode
```bash
npm test
```

### Running a Specific Test Suite
```bash
npx ng test --filter="history.meta-reducer"
```
