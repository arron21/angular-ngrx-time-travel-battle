import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import {
  selectBattleLog,
  selectBattleOutcome,
  selectCurrentExecutingCommand,
  selectEnemies,
  selectLastExecutionResult,
  selectPhase
} from '../../state/battle.selectors';
import { Combatant, isAlive } from '../../core/models/combatant.model';

@Component({
  selector: 'app-battle-arena',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="arena-viewport">
      <!-- Animated Psychedelic EarthBound Canvas Background -->
      <canvas #psyCanvas class="psy-canvas"></canvas>

      <!-- Combat Overlay Stage -->
      <div class="stage-overlay">
        <!-- Floating Damage / Critical Popups -->
        @if (popup(); as p) {
          <div
            class="damage-popup"
            [class.smash]="p.isCritical"
            [class.heal]="p.isHeal"
            [class.status]="p.isStatus"
          >
            @if (p.isCritical) {
              <div class="smash-banner">SMAAAASH!!</div>
            }
            <div class="popup-text">{{ p.text }}</div>
          </div>
        }

        <!-- Enemy Row -->
        <div class="enemies-row">
          @for (enemy of enemies(); track enemy.id) {
            <div
              class="enemy-card"
              [class.dead]="!isAlive(enemy)"
              [class.targeted]="targetedEnemyId() === enemy.id"
              [class.shake]="shakingEnemyId() === enemy.id"
              (click)="onEnemyClick(enemy)"
            >
              @if (targetedEnemyId() === enemy.id) {
                <div class="target-pointer">▼</div>
              }

              <!-- Enemy SVG Pixel Sprite -->
              <div class="sprite-box">
                @switch (enemy.sprite) {
                  @case ('starman') {
                    <svg viewBox="0 0 100 120" class="enemy-svg starman-svg">
                      <!-- Starman metallic silhouette -->
                      <defs>
                        <linearGradient id="starman-grad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stop-color="#e0e7ff" />
                          <stop offset="50%" stop-color="#94a3b8" />
                          <stop offset="100%" stop-color="#475569" />
                        </linearGradient>
                      </defs>
                      <!-- Visor / Face -->
                      <ellipse cx="50" cy="25" rx="16" ry="18" fill="url(#starman-grad)" stroke="#1e293b" stroke-width="2"/>
                      <polygon points="50,15 54,23 62,23 56,28 58,36 50,31 42,36 44,28 38,23 46,23" fill="#fbbf24"/>
                      <!-- Body -->
                      <path d="M32 40 L68 40 L75 80 L25 80 Z" fill="url(#starman-grad)" stroke="#1e293b" stroke-width="2"/>
                      <line x1="50" y1="40" x2="50" y2="80" stroke="#334155" stroke-width="2"/>
                      <!-- Arms -->
                      <path d="M30 44 L12 65 L18 72 L32 55 Z" fill="url(#starman-grad)" stroke="#1e293b" stroke-width="2"/>
                      <path d="M70 44 L88 65 L82 72 L68 55 Z" fill="url(#starman-grad)" stroke="#1e293b" stroke-width="2"/>
                      <!-- Legs -->
                      <rect x="32" y="80" width="14" height="32" rx="4" fill="url(#starman-grad)" stroke="#1e293b" stroke-width="2"/>
                      <rect x="54" y="80" width="14" height="32" rx="4" fill="url(#starman-grad)" stroke="#1e293b" stroke-width="2"/>
                    </svg>
                  }
                  @case ('crow') {
                    <svg viewBox="0 0 100 100" class="enemy-svg crow-svg">
                      <!-- Spiteful Crow with sunglasses -->
                      <ellipse cx="50" cy="55" rx="24" ry="20" fill="#18181b" stroke="#3f3f46" stroke-width="2"/>
                      <!-- Head -->
                      <circle cx="65" cy="40" r="16" fill="#18181b"/>
                      <!-- Beak -->
                      <polygon points="76,38 94,44 76,48" fill="#f59e0b"/>
                      <!-- Cool Sunglasses -->
                      <polygon points="62,34 76,34 73,43 62,41" fill="#000" stroke="#fff" stroke-width="1.5"/>
                      <line x1="62" y1="36" x2="55" y2="38" stroke="#fff" stroke-width="1.5"/>
                      <!-- Wing -->
                      <path d="M35 50 Q18 65 30 75 Q45 65 52 55 Z" fill="#27272a"/>
                      <!-- Tail feathers -->
                      <polygon points="26,60 10,65 14,75 28,68" fill="#18181b"/>
                      <!-- Feet -->
                      <line x1="45" y1="75" x2="42" y2="90" stroke="#f59e0b" stroke-width="3"/>
                      <line x1="55" y1="75" x2="58" y2="90" stroke="#f59e0b" stroke-width="3"/>
                    </svg>
                  }
                  @case ('robot') {
                    <svg viewBox="0 0 100 110" class="enemy-svg robot-svg">
                      <!-- Retro Atomic Robot -->
                      <defs>
                        <linearGradient id="robot-metal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stop-color="#93c5fd" />
                          <stop offset="100%" stop-color="#3b82f6" />
                        </linearGradient>
                      </defs>
                      <!-- Antenna -->
                      <line x1="50" y1="5" x2="50" y2="20" stroke="#ef4444" stroke-width="3"/>
                      <circle cx="50" cy="5" r="4" fill="#ef4444"/>
                      <!-- Head -->
                      <rect x="30" y="20" width="40" height="28" rx="4" fill="url(#robot-metal)" stroke="#1e3a8a" stroke-width="2"/>
                      <!-- Eyes -->
                      <circle cx="42" cy="32" r="4" fill="#facc15"/>
                      <circle cx="58" cy="32" r="4" fill="#facc15"/>
                      <line x1="38" y1="42" x2="62" y2="42" stroke="#1e3a8a" stroke-width="2"/>
                      <!-- Body -->
                      <rect x="24" y="52" width="52" height="42" rx="6" fill="url(#robot-metal)" stroke="#1e3a8a" stroke-width="2"/>
                      <circle cx="50" cy="72" r="10" fill="#1e293b" stroke="#60a5fa" stroke-width="2"/>
                      <!-- Arms -->
                      <rect x="10" y="56" width="10" height="28" rx="3" fill="#64748b"/>
                      <rect x="80" y="56" width="10" height="28" rx="3" fill="#64748b"/>
                      <!-- Treads -->
                      <rect x="22" y="96" width="56" height="12" rx="4" fill="#334155" stroke="#0f172a" stroke-width="2"/>
                    </svg>
                  }
                }
              </div>

              <!-- Enemy Info Header -->
              <div class="enemy-info">
                <span class="enemy-name">{{ enemy.name }}</span>
                <div class="hp-gauge">
                  <div
                    class="hp-fill"
                    [style.width.%]="(enemy.hp / enemy.maxHp) * 100"
                    [class.low]="(enemy.hp / enemy.maxHp) <= 0.25"
                  ></div>
                </div>
                <div class="enemy-hp-text">{{ enemy.hp }} / {{ enemy.maxHp }} HP</div>

                @if (enemy.status !== 'ok') {
                  <span class="status-pill {{ enemy.status }}">
                    {{ enemy.status.toUpperCase() }}
                  </span>
                }
              </div>
            </div>
          }
        </div>

        <!-- Outcome Overlay (Victory or Defeat) -->
        @if (battleOutcome().isVictory || battleOutcome().isDefeat) {
          <div class="outcome-modal" [class.victory]="battleOutcome().isVictory">
            <h2 class="outcome-title">
              {{ battleOutcome().isVictory ? '★ YOU WON! ★' : '☠ DEFEATED... ☠' }}
            </h2>
            <p class="outcome-desc">{{ battleOutcome().narrative }}</p>
            <p class="outcome-hint">
              <em>Use the timeline scrubber above to turn back time and try another strategy!</em>
            </p>
          </div>
        }

        <!-- EarthBound Style Dialogue Box / Battle Ticker -->
        <div class="battle-ticker-box">
          <div class="ticker-inner">
            <div class="ticker-icon">★</div>
            <div class="ticker-content">
              <span class="ticker-line">{{ latestLog() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .arena-viewport {
      position: relative;
      width: 100%;
      height: clamp(230px, 38vh, 380px);
      overflow: hidden;
      background: #000;
      border-bottom: 3px solid #f6d365;
      font-family: 'Courier New', Courier, monospace;
    }

    .psy-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: block;
      opacity: 0.9;
    }

    .stage-overlay {
      position: relative;
      z-index: 2;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      padding: clamp(6px, 1.5vh, 14px) clamp(8px, 2vw, 16px) clamp(6px, 1.5vh, 12px);
      box-sizing: border-box;
      pointer-events: none;
    }

    /* Floating Popups */
    .damage-popup {
      position: absolute;
      top: 35px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.85);
      border: 2px solid #fff;
      padding: 4px 12px;
      border-radius: 4px;
      color: #fff;
      font-weight: 900;
      font-size: clamp(14px, 3.8vw, 18px);
      text-align: center;
      z-index: 10;
      animation: pop-float 1.2s ease-out forwards;
      pointer-events: none;
      max-width: 90%;
    }

    @keyframes pop-float {
      0% { transform: translate(-50%, 15px) scale(0.8); opacity: 0; }
      20% { transform: translate(-50%, -5px) scale(1.1); opacity: 1; }
      80% { transform: translate(-50%, -10px) scale(1); opacity: 1; }
      100% { transform: translate(-50%, -25px) scale(0.95); opacity: 0; }
    }

    .damage-popup.smash {
      border-color: #facc15;
      background: rgba(180, 83, 9, 0.95);
      box-shadow: 0 0 15px #facc15;
    }

    .smash-banner {
      font-size: clamp(16px, 4.5vw, 22px);
      color: #fde047;
      letter-spacing: 2px;
      text-shadow: 2px 2px 0 #b45309;
    }

    .damage-popup.heal {
      border-color: #34d399;
      color: #6ee7b7;
      background: rgba(6, 78, 59, 0.95);
    }

    .damage-popup.status {
      border-color: #a78bfa;
      color: #ddd6fe;
    }

    /* Enemies Row */
    .enemies-row {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: clamp(6px, 2.5vw, 28px);
      width: 100%;
      margin-top: 2px;
      pointer-events: auto;
    }

    .enemy-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      position: relative;
      transition: transform 0.15s ease, filter 0.2s ease;
      max-width: 32%;
    }

    .enemy-card:hover, .enemy-card:active {
      transform: translateY(-3px) scale(1.04);
    }

    .enemy-card.dead {
      opacity: 0.25;
      filter: grayscale(1) blur(1px);
      pointer-events: none;
    }

    .enemy-card.shake {
      animation: enemy-shake 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
      filter: drop-shadow(0 0 12px #ef4444);
    }

    @keyframes enemy-shake {
      10%, 90% { transform: translate3d(-3px, 0, 0); }
      20%, 80% { transform: translate3d(4px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-5px, 0, 0); }
      40%, 60% { transform: translate3d(5px, 0, 0); }
    }

    .target-pointer {
      position: absolute;
      top: -20px;
      color: #fde047;
      font-size: 18px;
      animation: bounce 0.6s infinite alternate;
    }

    @keyframes bounce {
      from { transform: translateY(0); }
      to { transform: translateY(-5px); }
    }

    .sprite-box {
      width: clamp(65px, 21vw, 105px);
      height: clamp(65px, 21vw, 105px);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .enemy-svg {
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.8));
    }

    .enemy-info {
      background: rgba(0, 0, 0, 0.8);
      border: 1px solid #475569;
      border-radius: 4px;
      padding: 3px 5px;
      text-align: center;
      margin-top: 4px;
      width: 100%;
      box-sizing: border-box;
    }

    .enemy-name {
      font-size: clamp(9px, 2.3vw, 12px);
      font-weight: bold;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
    }

    .hp-gauge {
      width: 100%;
      height: 4px;
      background: #1e293b;
      border-radius: 2px;
      margin: 2px 0;
      overflow: hidden;
    }

    .hp-fill {
      height: 100%;
      background: #10b981;
      transition: width 0.3s ease;
    }

    .hp-fill.low {
      background: #ef4444;
    }

    .enemy-hp-text {
      font-size: clamp(8px, 1.9vw, 10px);
      color: #94a3b8;
    }

    .status-pill {
      font-size: 8px;
      font-weight: bold;
      padding: 1px 3px;
      border-radius: 2px;
      margin-top: 1px;
      display: inline-block;
    }

    .status-pill.asleep {
      background: #5b21b6;
      color: #ddd6fe;
    }

    .status-pill.paralyzed {
      background: #854d0e;
      color: #fef08a;
    }

    /* Outcome Modal */
    .outcome-modal {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(10, 15, 30, 0.95);
      border: 3px solid #f6d365;
      padding: 20px 30px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 0 25px rgba(0, 0, 0, 0.9);
      pointer-events: auto;
      z-index: 20;
    }

    .outcome-modal.victory {
      border-color: #2ecc71;
    }

    .outcome-title {
      font-size: 24px;
      margin: 0 0 8px;
      color: #f6d365;
      letter-spacing: 2px;
    }

    .outcome-modal.victory .outcome-title {
      color: #2ecc71;
    }

    .outcome-desc {
      font-size: 14px;
      color: #e2e8f0;
      margin-bottom: 8px;
    }

    .outcome-hint {
      font-size: 11px;
      color: #94a3b8;
      margin: 0;
    }

    /* EarthBound Battle Ticker Window */
    .battle-ticker-box {
      width: 100%;
      max-width: 720px;
      background: #000;
      border: 3px solid #fff;
      border-radius: 6px;
      padding: 8px 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.8);
      pointer-events: auto;
    }

    .ticker-inner {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .ticker-icon {
      color: #f6d365;
      font-size: 14px;
    }

    .ticker-content {
      flex: 1;
    }

    .ticker-line {
      color: #fff;
      font-size: 13px;
      line-height: 1.3;
      letter-spacing: 0.5px;
    }
  `]
})
export class BattleArenaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('psyCanvas') psyCanvasRef!: ElementRef<HTMLCanvasElement>;

  private store = inject(Store);

  enemies = this.store.selectSignal(selectEnemies);
  battleOutcome = this.store.selectSignal(selectBattleOutcome);
  battleLog = this.store.selectSignal(selectBattleLog);
  lastExecution = this.store.selectSignal(selectLastExecutionResult);
  currentExecuting = this.store.selectSignal(selectCurrentExecutingCommand);

  targetedEnemyId = signal<string | null>(null);
  shakingEnemyId = signal<string | null>(null);
  popup = signal<{ text: string; isCritical?: boolean; isHeal?: boolean; isStatus?: boolean } | null>(null);

  private animFrameId: number | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private timeOffset = 0;

  constructor() {
    // React to last execution result to display EarthBound damage popups and shake
    effect(() => {
      const result = this.lastExecution();
      if (!result) return;

      if (result.damage) {
        this.shakingEnemyId.set(result.targetId);
        setTimeout(() => this.shakingEnemyId.set(null), 400);

        this.popup.set({
          text: `${result.damage} HP`,
          isCritical: result.isCritical
        });
        setTimeout(() => this.popup.set(null), 1200);
      } else if (result.heal) {
        this.popup.set({
          text: `+${result.heal} HP`,
          isHeal: true
        });
        setTimeout(() => this.popup.set(null), 1200);
      } else if (result.isFizzled) {
        this.popup.set({
          text: `CANNOT MOVE!`,
          isStatus: true
        });
        setTimeout(() => this.popup.set(null), 1200);
      }
    });
  }

  isAlive(combatant: Combatant): boolean {
    return isAlive(combatant);
  }

  latestLog(): string {
    const logs = this.battleLog();
    return logs.length > 0 ? logs[0] : 'The encounter commences!';
  }

  onEnemyClick(enemy: Combatant): void {
    if (!isAlive(enemy)) return;
    this.targetedEnemyId.set(enemy.id);
  }

  ngAfterViewInit(): void {
    const canvas = this.psyCanvasRef.nativeElement;
    this.canvasCtx = canvas.getContext('2d');
    this.resizeCanvas();
    this.startPsychedelicAnimation();

    window.addEventListener('resize', this.resizeHandler);
  }

  private resizeHandler = () => this.resizeCanvas();

  private resizeCanvas(): void {
    if (!this.psyCanvasRef) return;
    const canvas = this.psyCanvasRef.nativeElement;
    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = canvas.parentElement?.clientHeight || 380;
  }

  /**
   * EarthBound-style procedural animated sine-wave hypnotic backdrop
   */
  private startPsychedelicAnimation(): void {
    const render = () => {
      if (!this.canvasCtx || !this.psyCanvasRef) return;
      const ctx = this.canvasCtx;
      const canvas = this.psyCanvasRef.nativeElement;
      const w = canvas.width;
      const h = canvas.height;

      this.timeOffset += 0.03;

      // Draw flowing psychedelic horizontal wave bands
      const bands = 24;
      const bandHeight = h / bands;

      for (let i = 0; i < bands; i++) {
        const y = i * bandHeight;
        // Wavy offset
        const wave = Math.sin(i * 0.35 + this.timeOffset) * 20;
        const hue = (i * 12 + this.timeOffset * 25) % 360;

        ctx.fillStyle = `hsl(${hue}, 65%, ${15 + (i % 2) * 10}%)`;
        ctx.fillRect(0, y, w, bandHeight + 1);

        // Overlay undulating scan pattern
        ctx.fillStyle = `hsla(${(hue + 180) % 360}, 75%, 35%, 0.2)`;
        ctx.beginPath();
        ctx.ellipse(w / 2 + wave, y + bandHeight / 2, w / 2, bandHeight, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      this.animFrameId = requestAnimationFrame(render);
    };

    this.animFrameId = requestAnimationFrame(render);
  }

  ngOnDestroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.resizeHandler);
  }
}
