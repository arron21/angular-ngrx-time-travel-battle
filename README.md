# ⚡ EarthBound × Final Fantasy: NgRx 22 Time-Travel Battle Engine

An advanced **Angular 22** & **NgRx Store 22** turn-based battle engine built as an interview showcase. It merges the tactical depth of traditional **Final Fantasy** combat with the retro visual aesthetic of **EarthBound** (procedural hypnotic canvas, mechanical rolling HP/PP odometers, SVG pixel sprites, Web Audio synthesizer) and a first-class **Micro-Scrubber Time-Travel System** powered by a pure **NgRx State-History Meta-Reducer**.

---

## 📚 In-Depth Architectural Documentation

Comprehensive technical documentation is provided in the [`docs/`](docs/) directory:

* 📖 **[NgRx State Management Strategy (`docs/NGRX_STRATEGY.md`)](docs/NGRX_STRATEGY.md)**: Deep dive into the State-History Meta-Reducer tuple model (`past`/`present`/`future`), branching timeline paradox resolution, transient action filtering, memory bounding, typed action groups, memoized selectors with Angular 22 Signals integration, and async turn pacing with NgRx Effects.
* 🧪 **[Testing Strategy & Architecture (`docs/TESTING_STRATEGY.md`)](docs/TESTING_STRATEGY.md)**: Breakdown of the test pyramid, Vitest setup, layer-by-layer testing patterns (pure domain math, reducer invariant assertions, isolated selector projector testing, mock action stream effects, and component integration tests).

---

## 🌟 Key Technical Showcase Features

### 1. Pure State-History NgRx Meta-Reducer (`past`, `present`, `future`)
* **Generic Higher-Order Reducer**: [`timeTravelMetaReducer`](src/app/state/history.meta-reducer.ts) wraps the battle reducer.
* **Tuple Architecture**: Maintains immutable state snapshots:
  ```typescript
  export interface HistoryState<T> {
    readonly past: readonly T[];
    readonly present: T;
    readonly future: readonly T[];
    readonly timeline: readonly TimelineStepMetadata[];
    readonly currentIndex: number;
  }
  ```
* **Branching Timeline Resolution**: When the player scrubs backward into past rounds or turns (`future.length > 0`) and takes a new action, the divergent action automatically prunes the obsolete future timeline and initiates a new timeline branch.
* **Bounded History**: Past snapshots are bounded to prevent memory leaks during long-running encounters.

### 2. Micro-Scrubber Rewind (Top of Screen)
* An interactive scrubber slider that indexes every discrete event (command inputs, round orders, damage ticks, status effects).
* Features:
  - **`⏮ ROUND START`**: One-click rewind to the start of the current round.
  - **`◀ BACK` / `FWD ▶`**: Step-by-step micro-scrubbing through individual actions.
  - **Clickable Timeline Ticks**: Direct jumping to any historic decision node.
  - **Live / Rewound Status Indicator**: Real-time indication of whether you are viewing the live present state or a historical branch.

### 3. EarthBound Visuals & Mechanical Rolling Meters
* **Mechanical Rolling Meters**: [`RollingMeterComponent`](src/app/components/rolling-meter/rolling-meter.component.ts) simulates EarthBound's iconic mechanical odometer rolling animation when HP and PP change.
* **Procedural Hypnotic Canvas**: Animated real-time sine-wave plasma backdrop with oscillating color palettes.
* **SVG Pixel Sprites & Damage VFX**: Retro combatants (Ness, Paula, Jeff, Poo vs. Starman Jr., Spiteful Crow, Atomic Robot) with shaking animations, floating damage popups, and **SMAAAASH!!** critical hits.
* **CRT Scanline Mode**: Authentic arcade CRT scanline overlay with a toggle in the footer.

### 4. Traditional Final Fantasy Combat Engine
* **4-Character Party**:
  - **Ness** (Knight): High HP/Offense, PSI Rockin α (multi-target), Lifeup α.
  - **Paula** (Ninja / Mage): High Speed, PSI Fire β, PSI Freeze α (chance to paralyze), PSI Flash.
  - **Jeff** (Black Mage / Gadgeteer): Heavy Bazooka, Super Rocket, Goods items.
  - **Poo** (White Mage / Support): Lifeup Party β, Healing γ (cures sleep/numbness).
* **Initiative Formula**: Speed stat with tactical random variance ($Speed + \text{random}(0, \lfloor Speed / 4 \rfloor + 3)$).
* **Status Interruption**: Asleep or Paralyzed combatants immediately forfeit queued actions.
* **Modern Auto-Retargeting**: When an intended target dies before a queued blow arrives, the attack seamlessly redirects to the next surviving combatant.
* **Fresh Roll**: Time-travel rewinding re-rolls tactical variances and critical strikes.

### 5. Native Web Audio API Synthesizer
* Zero MP3/WAV file downloads! [`RetroAudioService`](src/app/core/audio/retro-audio.service.ts) synthesizes 8-bit / 16-bit square, triangle, and sawtooth waves on the fly:
  - Menu navigation cursor blips
  - Command selection chimes
  - Physical punch & bash crunches
  - EarthBound **SMAAAASH!!** arpeggios
  - PSI psychic whooshes & healing harps
  - **Reverse Tape Time-Rewind Whoosh** whenever time is turned back!

---

## 🚀 Quick Start

### Prerequisites
* Node.js 18+ (tested on Node.js 24)
* npm 9+

### Installation & Run
```bash
# Install dependencies
npm install

# Start development server
npm start
```
Navigate to `http://localhost:4200` in your browser.

### Running Unit Tests
```bash
# Run tests non-interactively via Vitest
npm test -- --watch=false
```

### Production Build
```bash
npm run build
```

---

## 📁 Project Architecture Tour

```
src/app/
├── core/
│   ├── models/
│   │   ├── combatant.model.ts          # Stats, HP, PP, status conditions & alive predicates
│   │   ├── battle-action.model.ts      # Spells, items, queued commands, execution outcomes
│   │   ├── battle-state.model.ts       # Immutable battle state slice definition
│   │   ├── timeline.model.ts           # Timeline step metadata & categories
│   │   ├── battle-calculator.ts        # Pure formulas: damage, initiative, retargeting, AI
│   │   └── battle-initial-data.ts      # Party archetypes, enemy encounters, items
│   └── audio/
│       └── retro-audio.service.ts      # Native Web Audio API 8-bit sound synthesizer
├── state/
│   ├── battle.actions.ts               # Strongly typed action groups (Battle & TimeTravel)
│   ├── battle.reducer.ts               # Pure state transitions & outcome reducers
│   ├── history.meta-reducer.ts         # Generic Higher-Order Time-Travel Meta-Reducer
│   ├── battle.selectors.ts             # Memoized selectors & Signal adapters
│   └── battle.effects.ts               # Async turn pacing, delays & audio orchestration
└── components/
    ├── timeline-scrubber/              # Top-screen micro-scrubber slider & controls
    ├── battle-arena/                   # Procedural canvas, enemy sprites & damage popups
    ├── character-cards/                # Bottom EarthBound cards & command menus
    └── rolling-meter/                  # Mechanical rolling HP/PP odometer component
```

---

## 🧪 Test Coverage
The project includes **64 unit tests across 11 test suites** covering models, state management, meta-reducers, effects, selectors, audio synthesis, and components:

* [`history.meta-reducer.spec.ts`](src/app/state/history.meta-reducer.spec.ts) (6 tests): History initialization, past/future stack manipulation, undo, redo, micro-scrubber jumping, and future timeline pruning upon branching actions.
* [`battle.reducer.spec.ts`](src/app/state/battle.reducer.spec.ts) (12 tests): Command queuing, initiative calculation, damage/healing application, PP consumption, shared inventory decrement, victory/defeat phase transitions, and round reset.
* [`battle.selectors.spec.ts`](src/app/state/battle.selectors.spec.ts) (9 tests): Memoized present projections, living combatant filtering, active hero selection, timeline metadata, and outcome detection.
* [`battle.effects.spec.ts`](src/app/state/battle.effects.spec.ts) (4 tests): Asynchronous turn sequencing, delay pacing, audio triggers, and action dispatching.
* [`battle-calculator.spec.ts`](src/app/core/models/battle-calculator.spec.ts) (5 tests): Initiative, bash formulas, defense mitigation, modern retargeting, and enemy AI.
* [`timeline-scrubber.component.spec.ts`](src/app/components/timeline-scrubber/timeline-scrubber.component.spec.ts) (9 tests): Scrubber slider, undo/redo dispatches, step jumping, and branching past warnings.
* [`character-cards.component.spec.ts`](src/app/components/character-cards/character-cards.component.spec.ts) (2 tests): Conditional commence button visibility (only when all 4 moves selected) and menu positioning.
* [`battle-arena.component.spec.ts`](src/app/components/battle-arena/battle-arena.component.spec.ts) (5 tests): Enemy rendering, live battle ticker, targeting clicks, and damage popups.
* [`rolling-meter.component.spec.ts`](src/app/components/rolling-meter/rolling-meter.component.spec.ts) (5 tests): Mechanical odometer digit formatting, warning thresholds, and input animation triggers.
* [`retro-audio.service.spec.ts`](src/app/core/audio/retro-audio.service.spec.ts) (3 tests): Web Audio synthesizer mute state and safe sound invocation.
* [`app.component.spec.ts`](src/app/app.component.spec.ts) (4 tests): App shell initialization, header title rendering, CRT scanline toggles, and architecture modal.
