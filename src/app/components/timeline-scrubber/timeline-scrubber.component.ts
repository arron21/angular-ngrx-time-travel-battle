import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import {
  selectCanRedo,
  selectCanUndo,
  selectCurrentStepIndex,
  selectCurrentStepMetadata,
  selectIsAtPresent,
  selectIsAutoPlaying,
  selectPhase,
  selectRound,
  selectTimeline,
  selectTotalSteps
} from '../../state/battle.selectors';
import { BattleActions, TimeTravelActions } from '../../state/battle.actions';
import { RetroAudioService } from '../../core/audio/retro-audio.service';

@Component({
  selector: 'app-timeline-scrubber',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="timeline-container">
      <div class="header-top">
        <div class="brand-zone">
          <div class="brand-badge">NgRx 22</div>
          <h1 class="brand-title">CHRONO-SCRUBBER</h1>
          <span class="timeline-status" [class.live]="isAtPresent()" [class.rewound]="!isAtPresent()">
            @if (isAtPresent()) {
              <span class="pulse-dot"></span> LIVE TIMELINE
            } @else {
              <span class="rewind-icon">⏳</span> REWOUND TO PAST (Branching active)
            }
          </span>
        </div>

        <div class="step-counter">
          <span class="step-label">NODE:</span>
          <span class="step-number">{{ currentIndex() }} / {{ totalSteps() - 1 }}</span>
          <span class="round-badge">R{{ round() }}</span>
        </div>

        <div class="controls-right">
          <button
            class="control-btn"
            [class.active]="isAutoPlaying()"
            (click)="toggleAutoPlay()"
            title="Toggle automatic turn pacing"
          >
            {{ isAutoPlaying() ? '⏸ PAUSE' : '▶ AUTO-RUN' }}
          </button>

          <button
            class="control-btn mute-btn"
            (click)="toggleAudio()"
            title="Toggle 8-bit Synthesizer Audio"
          >
            {{ isMuted() ? '🔇 MUTED' : '🔊 SFX' }}
          </button>

          <button
            class="control-btn reset-btn"
            (click)="resetBattle()"
            title="Reset encounter to initial state"
          >
            ↺ RESET
          </button>
        </div>
      </div>

      <!-- Micro Scrubber Track -->
      <div class="scrubber-bar-wrapper">
        <div class="playback-buttons">
          <button
            class="nav-btn"
            [disabled]="!canUndo()"
            (click)="undo()"
            title="Step Back 1 Action (Undo)"
          >
            ◀ BACK
          </button>

          <button
            class="nav-btn round-nav"
            [disabled]="!canUndo()"
            (click)="rewindRound()"
            title="Rewind to start of Round"
          >
            ⏮ ROUND START
          </button>

          <button
            class="nav-btn"
            [disabled]="!canRedo()"
            (click)="redo()"
            title="Step Forward 1 Action (Redo)"
          >
            FWD ▶
          </button>

          <button
            class="nav-btn head-btn"
            [disabled]="isAtPresent()"
            (click)="jumpToHead()"
            title="Jump to latest present state"
          >
            LATEST ⏭
          </button>
        </div>

        <div class="slider-container">
          <input
            type="range"
            class="timeline-slider"
            [min]="0"
            [max]="maxStep()"
            [value]="currentIndex()"
            (input)="onSliderChange($event)"
          />
          <div class="timeline-ticks">
            @for (step of timeline(); track step.id; let idx = $index) {
              <div
                class="timeline-tick"
                [class.active]="idx === currentIndex()"
                [class.round-start]="step.category === 'round_start'"
                [class.command]="step.category === 'command_input'"
                [class.execution]="step.category === 'turn_execution'"
                [style.left.%]="(idx / maxStep()) * 100"
                (click)="jumpTo(idx)"
                [title]="'Step ' + idx + ': ' + step.label"
              ></div>
            }
          </div>
        </div>
      </div>

      <!-- Current Step Metadata Breadcrumb -->
      <div class="metadata-tray">
        @if (currentStep(); as step) {
          <div class="step-meta">
            <span class="category-tag {{ step.category }}">
              {{ step.category.replace('_', ' ').toUpperCase() }}
            </span>
            <span class="step-label-text">{{ step.label }}</span>
            <span class="step-detail-text">{{ step.detail }}</span>
          </div>
        }
        @if (!isAtPresent()) {
          <div class="branch-warning">
            ⚠️ <em>Choosing a new action now will drop the previous future branch!</em>
          </div>
        }
      </div>
    </header>
  `,
  styles: [`
    .timeline-container {
      background: linear-gradient(180deg, #181c2b 0%, #0d101a 100%);
      border-bottom: 3px solid #f6d365;
      padding: 8px 16px;
      color: #fff;
      font-family: 'Courier New', Courier, monospace;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
      user-select: none;
    }

    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .brand-zone {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-badge {
      background: #e91e63;
      color: #fff;
      font-size: 11px;
      font-weight: 900;
      padding: 2px 6px;
      border-radius: 3px;
      letter-spacing: 0.5px;
    }

    .brand-title {
      font-size: 16px;
      margin: 0;
      font-weight: 900;
      letter-spacing: 1.5px;
      color: #f6d365;
      text-shadow: 0 0 8px rgba(246, 211, 101, 0.4);
    }

    .timeline-status {
      font-size: 11px;
      font-weight: bold;
      padding: 2px 8px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .timeline-status.live {
      background: rgba(46, 204, 113, 0.2);
      color: #2ecc71;
      border: 1px solid #2ecc71;
    }

    .timeline-status.rewound {
      background: rgba(241, 196, 15, 0.25);
      color: #f1c40f;
      border: 1px solid #f1c40f;
      animation: pulse-border 1.5s infinite alternate;
    }

    @keyframes pulse-border {
      0% { box-shadow: 0 0 2px #f1c40f; }
      100% { box-shadow: 0 0 8px #f1c40f; }
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      background: #2ecc71;
      border-radius: 50%;
      display: inline-block;
      box-shadow: 0 0 6px #2ecc71;
    }

    .step-counter {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #090c13;
      padding: 3px 10px;
      border: 1px solid #2a344d;
      border-radius: 4px;
      font-size: 13px;
    }

    .step-label {
      color: #8892b0;
    }

    .step-number {
      color: #64ffda;
      font-weight: bold;
    }

    .round-badge {
      background: #3b82f6;
      color: #fff;
      font-size: 11px;
      font-weight: bold;
      padding: 1px 5px;
      border-radius: 3px;
    }

    .controls-right {
      display: flex;
      gap: 8px;
    }

    .control-btn {
      background: #20283e;
      border: 1px solid #3a476b;
      color: #ccd6f6;
      font-family: inherit;
      font-size: 11px;
      font-weight: bold;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .control-btn:hover {
      background: #2e3a59;
      color: #fff;
      border-color: #64ffda;
    }

    .control-btn.active {
      background: #1b4d3e;
      border-color: #2ecc71;
      color: #a7f3d0;
    }

    .control-btn.reset-btn:hover {
      border-color: #ff5252;
      color: #ff5252;
    }

    /* Scrubber Track */
    .scrubber-bar-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 8px;
    }

    @media (max-width: 680px) {
      .timeline-container {
        padding: 6px 10px;
      }

      .header-top {
        gap: 6px;
      }

      .brand-title {
        font-size: 14px;
      }

      .timeline-status {
        font-size: 9px;
        padding: 1px 6px;
      }

      .step-counter {
        font-size: 11px;
        padding: 2px 6px;
      }

      .controls-right {
        gap: 4px;
      }

      .control-btn {
        padding: 4px 6px;
        font-size: 10px;
      }

      .scrubber-bar-wrapper {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }

      .playback-buttons {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        width: 100%;
        gap: 4px;
      }

      .nav-btn {
        padding: 8px 2px;
        font-size: 10px;
        text-align: center;
        min-height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .timeline-slider::-webkit-slider-thumb {
        width: 24px;
        height: 24px;
        border-radius: 50%;
      }

      .metadata-tray {
        flex-direction: column;
        align-items: flex-start;
        gap: 3px;
        font-size: 10px;
      }

      .step-meta {
        flex-wrap: wrap;
        white-space: normal;
      }
    }

    .playback-buttons {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }

    .nav-btn {
      background: #1e2638;
      border: 1px solid #415078;
      color: #f6d365;
      font-family: inherit;
      font-size: 11px;
      font-weight: bold;
      padding: 4px 8px;
      border-radius: 3px;
      cursor: pointer;
      transition: all 0.15s ease;
      touch-action: manipulation;
    }

    .nav-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      border-color: #2c3345;
      color: #666;
    }

    .nav-btn:not(:disabled):hover, .nav-btn:not(:disabled):active {
      background: #f6d365;
      color: #111;
      box-shadow: 0 0 6px rgba(246, 211, 101, 0.5);
    }

    .slider-container {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
    }

    .timeline-slider {
      width: 100%;
      height: 12px;
      appearance: none;
      background: #090c14;
      border: 1px solid #334155;
      border-radius: 6px;
      outline: none;
      cursor: pointer;
      position: relative;
      z-index: 2;
      touch-action: pan-x;
    }

    .timeline-slider::-webkit-slider-thumb {
      appearance: none;
      width: 20px;
      height: 24px;
      background: #f6d365;
      border: 2px solid #fff;
      border-radius: 4px;
      cursor: ew-resize;
      box-shadow: 0 0 8px rgba(246, 211, 101, 0.8);
      transition: transform 0.1s ease;
    }

    .timeline-slider::-webkit-slider-thumb:hover {
      transform: scale(1.15);
    }

    .timeline-ticks {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      transform: translateY(-50%);
      pointer-events: none;
      z-index: 1;
    }

    .timeline-tick {
      position: absolute;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      background: #475569;
      pointer-events: auto;
      cursor: pointer;
    }

    .timeline-tick.round-start {
      background: #3b82f6;
      width: 8px;
      height: 8px;
    }

    .timeline-tick.command {
      background: #f59e0b;
    }

    .timeline-tick.execution {
      background: #ef4444;
    }

    .timeline-tick.active {
      box-shadow: 0 0 6px #fff;
      background: #fff;
    }

    /* Metadata Tray */
    .metadata-tray {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 6px;
      font-size: 11px;
      gap: 12px;
    }

    .step-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .category-tag {
      padding: 1px 6px;
      border-radius: 2px;
      font-weight: bold;
      font-size: 10px;
    }

    .category-tag.round_start {
      background: #1e3a8a;
      color: #93c5fd;
    }

    .category-tag.command_input {
      background: #78350f;
      color: #fde68a;
    }

    .category-tag.turn_execution {
      background: #7f1d1d;
      color: #fca5a5;
    }

    .category-tag.round_end {
      background: #312e81;
      color: #c7d2fe;
    }

    .step-label-text {
      color: #f6d365;
      font-weight: bold;
    }

    .step-detail-text {
      color: #94a3b8;
    }

    .branch-warning {
      color: #fde047;
      font-size: 11px;
      white-space: nowrap;
    }
  `]
})
export class TimelineScrubberComponent {
  private store = inject(Store);
  private audio = inject(RetroAudioService);

  timeline = this.store.selectSignal(selectTimeline);
  currentIndex = this.store.selectSignal(selectCurrentStepIndex);
  totalSteps = this.store.selectSignal(selectTotalSteps);
  canUndo = this.store.selectSignal(selectCanUndo);
  canRedo = this.store.selectSignal(selectCanRedo);
  isAtPresent = this.store.selectSignal(selectIsAtPresent);
  currentStep = this.store.selectSignal(selectCurrentStepMetadata);
  isAutoPlaying = this.store.selectSignal(selectIsAutoPlaying);
  round = this.store.selectSignal(selectRound);
  phase = this.store.selectSignal(selectPhase);

  isMuted = () => this.audio.muted;

  maxStep(): number {
    return Math.max(1, this.timeline().length - 1);
  }

  undo(): void {
    this.store.dispatch(TimeTravelActions.undo());
  }

  redo(): void {
    this.store.dispatch(TimeTravelActions.redo());
  }

  rewindRound(): void {
    this.store.dispatch(TimeTravelActions.rewindToRoundStart());
  }

  jumpTo(index: number): void {
    this.store.dispatch(TimeTravelActions.jumpToStep({ targetStepIndex: index }));
  }

  jumpToHead(): void {
    this.store.dispatch(TimeTravelActions.jumpToStep({ targetStepIndex: this.timeline().length - 1 }));
  }

  onSliderChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const targetIndex = parseInt(input.value, 10);
    this.store.dispatch(TimeTravelActions.jumpToStep({ targetStepIndex: targetIndex }));
  }

  toggleAutoPlay(): void {
    this.store.dispatch(BattleActions.toggleAutoPlay());
  }

  toggleAudio(): void {
    this.audio.toggleMute();
  }

  resetBattle(): void {
    this.store.dispatch(BattleActions.resetBattle());
  }
}
