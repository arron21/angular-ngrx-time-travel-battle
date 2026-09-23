import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import {
  selectActiveHero,
  selectActiveHeroIndex,
  selectAvailableSpellsForActiveHero,
  selectEnemies,
  selectHeroes,
  selectLivingEnemies,
  selectLivingHeroes,
  selectPhase,
  selectQueuedCommands,
  selectRound,
  selectSharedGoods
} from '../../state/battle.selectors';
import { BattleActions } from '../../state/battle.actions';
import { RollingMeterComponent } from '../rolling-meter/rolling-meter.component';
import { Combatant, isAlive } from '../../core/models/combatant.model';
import { ActionType, GoodsItem, PsiSpell, QueuedCommand } from '../../core/models/battle-action.model';
import { BattleCalculator } from '../../core/models/battle-calculator';
import { RetroAudioService } from '../../core/audio/retro-audio.service';

@Component({
  selector: 'app-character-cards',
  standalone: true,
  imports: [CommonModule, RollingMeterComponent],
  template: `
    <div class="party-container">
      <!-- Active Hero Command Menu Overlay (Input Phase) -->
      @if (phase() === 'input' && activeHero(); as hero) {
        <div class="command-menu-dock">
          <div class="command-header">
            @if (areAllHeroesReady()) {
              <span class="all-ready-pill">★ ALL 4 READY!</span>
            }
            <span class="prompt-text">
              {{ areAllHeroesReady() ? 'Ready! Tap COMMENCE or edit move for' : 'Choose action for' }}
            </span>
            <span class="hero-name-highlight">{{ hero.name }}</span>
            <span class="role-tag">[{{ hero.role?.toUpperCase() }}]</span>
          </div>

          <!-- Main Command Wheel -->
          @if (!subMenuView()) {
            <div class="commands-row">
              <button class="cmd-btn bash-btn" (click)="onSelectBash(hero)">
                <span class="cmd-icon">🔨</span> BASH
              </button>

              <button
                class="cmd-btn psi-btn"
                [disabled]="spells().length === 0 || hero.pp <= 0"
                (click)="openPsiMenu()"
              >
                <span class="cmd-icon">🔮</span> PSI
              </button>

              <button
                class="cmd-btn goods-btn"
                [disabled]="goods().length === 0"
                (click)="openGoodsMenu()"
              >
                <span class="cmd-icon">🎒</span> GOODS
              </button>

              <button class="cmd-btn defend-btn" (click)="onSelectDefend(hero)">
                <span class="cmd-icon">🛡️</span> DEFEND
              </button>

              <button
                class="cmd-btn back-btn"
                (click)="onCancelToPrevious()"
                title="Return to previous hero's command"
              >
                <span class="cmd-icon">⏪</span> BACK
              </button>

              @if (areAllHeroesReady()) {
                <button
                  class="cmd-btn commence-btn"
                  (click)="onConfirmRound()"
                  title="All 4 party members have selected moves! Commence round"
                >
                  <span class="cmd-icon">⚡</span> COMMENCE
                </button>
              }
            </div>
          }

          <!-- PSI Spell Selection Sub-Menu -->
          @if (subMenuView() === 'psi') {
            <div class="submenu-container">
              <div class="submenu-title">SELECT PSI POWER:</div>
              <div class="submenu-items">
                @for (spell of spells(); track spell.id) {
                  <button
                    class="submenu-item-btn"
                    [disabled]="hero.pp < spell.ppCost"
                    (click)="onSelectSpell(hero, spell)"
                  >
                    <span class="item-name">{{ spell.name }}</span>
                    <span class="item-cost">{{ spell.ppCost }} PP</span>
                  </button>
                }
                <button class="submenu-cancel-btn" (click)="closeSubMenu()">Cancel</button>
              </div>
            </div>
          }

          <!-- Goods Inventory Sub-Menu -->
          @if (subMenuView() === 'goods') {
            <div class="submenu-container">
              <div class="submenu-title">SELECT GOODS:</div>
              <div class="submenu-items">
                @for (item of goods(); track item.id) {
                  <button
                    class="submenu-item-btn"
                    (click)="onSelectItem(hero, item)"
                  >
                    <span class="item-name">{{ item.name }}</span>
                    <span class="item-count">×{{ item.count }}</span>
                  </button>
                }
                <button class="submenu-cancel-btn" (click)="closeSubMenu()">Cancel</button>
              </div>
            </div>
          }

          <!-- Target Picker Sub-Menu -->
          @if (subMenuView() === 'target' && pendingAction(); as pending) {
            <div class="submenu-container target-picker">
              <div class="submenu-title">SELECT TARGET:</div>
              <div class="submenu-items">
                @if (isTargetingAlly(pending)) {
                  @for (ally of heroes(); track ally.id) {
                    <button
                      class="submenu-item-btn"
                      [disabled]="!isAlive(ally) && !pending.spell?.name?.includes('Life')"
                      (click)="confirmTarget(hero, ally.id)"
                    >
                      <span>{{ ally.name }} ({{ ally.hp }}/{{ ally.maxHp }} HP)</span>
                    </button>
                  }
                } @else {
                  @for (enemy of livingEnemies(); track enemy.id) {
                    <button
                      class="submenu-item-btn"
                      (click)="confirmTarget(hero, enemy.id)"
                    >
                      <span>{{ enemy.name }} ({{ enemy.hp }}/{{ enemy.maxHp }} HP)</span>
                    </button>
                  }
                }
                <button class="submenu-cancel-btn" (click)="closeSubMenu()">Cancel</button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Bottom Character Status Cards -->
      <div class="cards-grid">
        @for (hero of heroes(); track hero.id; let idx = $index) {
          <div
            class="hero-card"
            [class.active-turn]="phase() === 'input' && activeHeroIndex() === idx"
            [class.dead]="!isAlive(hero)"
            (click)="onCardClick(idx)"
          >
            @if (phase() === 'input' && activeHeroIndex() === idx) {
              <div class="input-pointer">👉</div>
            }

            <div class="card-header">
              <span class="hero-name">{{ hero.name }}</span>
              <span class="hero-role-pill">{{ hero.role }}</span>
            </div>

            <div class="avatar-row">
              <div class="hero-avatar {{ hero.sprite }}">
                @switch (hero.sprite) {
                  @case ('ness') {
                    <svg viewBox="0 0 60 60" class="avatar-svg">
                      <!-- Ness red/blue baseball cap -->
                      <circle cx="30" cy="30" r="24" fill="#fbbf24"/>
                      <!-- Cap -->
                      <path d="M12 26 Q30 10 48 26 Z" fill="#ef4444"/>
                      <path d="M40 24 L56 22 L48 28 Z" fill="#3b82f6"/>
                      <!-- Eyes -->
                      <circle cx="23" cy="34" r="3" fill="#1e293b"/>
                      <circle cx="37" cy="34" r="3" fill="#1e293b"/>
                      <circle cx="30" cy="42" r="2" fill="#ef4444"/>
                    </svg>
                  }
                  @case ('paula') {
                    <svg viewBox="0 0 60 60" class="avatar-svg">
                      <!-- Paula blonde hair + pink ribbon -->
                      <circle cx="30" cy="30" r="24" fill="#fde047"/>
                      <polygon points="30,8 20,4 24,14" fill="#ec4899"/>
                      <polygon points="30,8 40,4 36,14" fill="#ec4899"/>
                      <circle cx="30" cy="9" r="3" fill="#f43f5e"/>
                      <!-- Face -->
                      <circle cx="30" cy="33" r="16" fill="#fef08a"/>
                      <circle cx="23" cy="33" r="3" fill="#3b82f6"/>
                      <circle cx="37" cy="33" r="3" fill="#3b82f6"/>
                      <path d="M26 40 Q30 43 34 40" stroke="#f43f5e" stroke-width="2" fill="none"/>
                    </svg>
                  }
                  @case ('jeff') {
                    <svg viewBox="0 0 60 60" class="avatar-svg">
                      <!-- Jeff glasses + bowtie -->
                      <circle cx="30" cy="30" r="24" fill="#fef08a"/>
                      <!-- Glasses -->
                      <circle cx="22" cy="30" r="8" fill="none" stroke="#1e293b" stroke-width="2"/>
                      <circle cx="38" cy="30" r="8" fill="none" stroke="#1e293b" stroke-width="2"/>
                      <line x1="30" y1="30" x2="30" y2="30" stroke="#1e293b" stroke-width="2"/>
                      <!-- Bowtie -->
                      <polygon points="26,50 34,50 30,46" fill="#3b82f6"/>
                    </svg>
                  }
                  @case ('poo') {
                    <svg viewBox="0 0 60 60" class="avatar-svg">
                      <!-- Prince Poo topknot -->
                      <circle cx="30" cy="30" r="24" fill="#fef08a"/>
                      <!-- Topknot -->
                      <ellipse cx="30" cy="10" rx="6" ry="8" fill="#18181b"/>
                      <rect x="28" y="16" width="4" height="6" fill="#fbbf24"/>
                      <!-- Eyes -->
                      <line x1="20" y1="32" x2="27" y2="31" stroke="#18181b" stroke-width="2"/>
                      <line x1="33" y1="31" x2="40" y2="32" stroke="#18181b" stroke-width="2"/>
                    </svg>
                  }
                }
              </div>

              <!-- Status Badge -->
              <div class="status-box">
                @if (hero.status === 'ok') {
                  <span class="status-ok">OK</span>
                } @else if (hero.status === 'asleep') {
                  <span class="status-asleep">SLEEP 💤</span>
                } @else if (hero.status === 'paralyzed') {
                  <span class="status-paralyzed">NUMB ⚡</span>
                } @else {
                  <span class="status-fainted">DOWN 💀</span>
                }

                @if (hero.isDefending) {
                  <span class="status-defending">DEF 🛡️</span>
                }
              </div>
            </div>

            <!-- Rolling Mechanical Meters for HP & PP -->
            <div class="meters-container">
              <app-rolling-meter
                [label]="'HP'"
                [value]="hero.hp"
                [maxValue]="hero.maxHp"
              ></app-rolling-meter>

              <app-rolling-meter
                [label]="'PP'"
                [value]="hero.pp"
                [maxValue]="hero.maxPp"
              ></app-rolling-meter>
            </div>

            <!-- Queued Action Pill -->
            <div class="queued-action-box">
              @if (queuedCommands()[hero.id]; as cmd) {
                <span class="action-tag">
                  {{ cmd.actionType.toUpperCase() }}
                  @if (cmd.spell) { : {{ cmd.spell.name }} }
                  @if (cmd.item) { : {{ cmd.item.name }} }
                </span>
              } @else {
                <span class="action-empty">READY</span>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .party-container {
      background: #0f1422;
      border-top: 3px solid #334155;
      padding: 10px 16px 14px;
      font-family: 'Courier New', Courier, monospace;
      color: #fff;
      user-select: none;
    }

    /* Command Menu Dock */
    .command-menu-dock {
      background: #000;
      border: 3px solid #fff;
      border-radius: 6px;
      padding: 8px 14px;
      margin-bottom: 10px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.9);
      animation: slide-up 0.2s ease-out;
    }

    @keyframes slide-up {
      from { transform: translateY(6px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .command-header {
      font-size: 13px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .all-ready-pill {
      background: #15803d;
      color: #bbf7d0;
      font-size: 10px;
      font-weight: 900;
      padding: 2px 6px;
      border-radius: 3px;
      letter-spacing: 0.5px;
      animation: pulse-ready 1s infinite alternate;
    }

    @keyframes pulse-ready {
      0% { box-shadow: 0 0 2px #22c55e; }
      100% { box-shadow: 0 0 8px #22c55e; }
    }

    .prompt-text {
      color: #94a3b8;
    }

    .hero-name-highlight {
      color: #f6d365;
      font-weight: bold;
      font-size: 15px;
    }

    .role-tag {
      color: #64ffda;
      font-size: 11px;
    }

    .commands-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }

    .cmd-btn {
      background: #181f33;
      border: 2px solid #4a5d8c;
      color: #fff;
      font-family: inherit;
      font-size: 13px;
      font-weight: bold;
      padding: 6px 14px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
      touch-action: manipulation;
    }

    .cmd-btn:not(:disabled):hover {
      background: #f6d365;
      color: #000;
      border-color: #fff;
      transform: translateY(-2px);
      box-shadow: 0 0 8px rgba(246, 211, 101, 0.6);
    }

    .cmd-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      border-color: #333;
    }

    .cmd-btn.back-btn {
      margin-left: auto;
      background: #2b1f1f;
      border-color: #8c4a4a;
    }

    .cmd-btn.back-btn:not(:disabled):hover {
      background: #ef4444;
      color: #fff;
    }

    .cmd-btn.commence-btn {
      background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
      border-color: #fde68a;
      color: #000;
      font-weight: 900;
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.6);
      animation: pulse-commence 1.5s infinite alternate;
    }

    .cmd-btn.commence-btn:hover, .cmd-btn.commence-btn:active {
      background: #fde68a;
      color: #000;
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 0 18px rgba(253, 230, 138, 0.9);
    }

    @keyframes pulse-commence {
      0% { transform: scale(1); }
      100% { transform: scale(1.04); }
    }

    /* Submenus */
    .submenu-container {
      margin-top: 4px;
    }

    .submenu-title {
      font-size: 12px;
      color: #f6d365;
      font-weight: bold;
      margin-bottom: 6px;
    }

    .submenu-items {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }

    .submenu-item-btn {
      background: #1e293b;
      border: 1px solid #475569;
      color: #e2e8f0;
      font-family: inherit;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .submenu-item-btn:hover {
      background: #3b82f6;
      color: #fff;
      border-color: #93c5fd;
    }

    .item-cost, .item-count {
      color: #facc15;
      font-size: 10px;
    }

    .submenu-cancel-btn {
      background: transparent;
      border: 1px dashed #64748b;
      color: #94a3b8;
      font-family: inherit;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
    }

    .submenu-cancel-btn:hover {
      color: #ef4444;
      border-color: #ef4444;
    }

    /* Cards Grid */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    @media (max-width: 768px) {
      .cards-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }

      .commands-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
      }

      .cmd-btn {
        padding: 8px 6px;
        font-size: 12px;
        justify-content: center;
        min-height: 42px;
      }

      .cmd-btn.back-btn {
        margin-left: 0;
        grid-column: span 1;
      }

      .cmd-btn.commence-btn {
        grid-column: span 3;
        font-size: 14px;
        min-height: 46px;
      }
    }

    @media (max-width: 400px) {
      .commands-row {
        grid-template-columns: repeat(2, 1fr);
      }

      .cmd-btn.back-btn {
        grid-column: span 2;
      }

      .cards-grid {
        gap: 6px;
      }

      .hero-card {
        padding: 6px 6px;
      }
    }

    .hero-card {
      background: #111726;
      border: 2px solid #2a354f;
      border-radius: 6px;
      padding: 8px 10px;
      position: relative;
      cursor: pointer;
      transition: all 0.15s ease;
      touch-action: manipulation;
    }

    .hero-card:hover, .hero-card:active {
      border-color: #4f6394;
      background: #172036;
    }

    .hero-card.active-turn {
      border-color: #f6d365;
      box-shadow: 0 0 10px rgba(246, 211, 101, 0.4);
      background: #1c2642;
    }

    .hero-card.dead {
      opacity: 0.35;
      filter: grayscale(1);
    }

    .input-pointer {
      position: absolute;
      top: -18px;
      left: 12px;
      font-size: 18px;
      animation: pointer-bounce 0.5s infinite alternate;
    }

    @keyframes pointer-bounce {
      from { transform: translateY(0); }
      to { transform: translateY(-4px); }
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .hero-name {
      font-weight: bold;
      font-size: 13px;
      color: #f6d365;
    }

    .hero-role-pill {
      font-size: 9px;
      color: #8892b0;
      text-transform: uppercase;
    }

    .avatar-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .hero-avatar {
      width: clamp(34px, 9vw, 44px);
      height: clamp(34px, 9vw, 44px);
      border-radius: 4px;
      background: #090c14;
      border: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .avatar-svg {
      width: 85%;
      height: 85%;
    }

    .status-box {
      font-size: 10px;
      font-weight: bold;
      display: flex;
      flex-direction: column;
      gap: 2px;
      align-items: flex-end;
    }

    .status-ok { color: #2ecc71; }
    .status-asleep { color: #a78bfa; }
    .status-paralyzed { color: #facc15; }
    .status-fainted { color: #ef4444; }
    .status-defending { color: #60a5fa; font-size: 9px; }

    .meters-container {
      display: flex;
      flex-direction: column;
      gap: 3px;
      margin-bottom: 6px;
    }

    .queued-action-box {
      background: #090c14;
      border: 1px solid #1e293b;
      padding: 3px 4px;
      border-radius: 3px;
      text-align: center;
      font-size: 10px;
      min-height: 18px;
    }

    .action-tag {
      color: #38bdf8;
      font-weight: bold;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: block;
    }

    .action-empty {
      color: #475569;
    }

  `]
})
export class CharacterCardsComponent {
  private store = inject(Store);
  private audio = inject(RetroAudioService);

  heroes = this.store.selectSignal(selectHeroes);
  enemies = this.store.selectSignal(selectEnemies);
  livingHeroes = this.store.selectSignal(selectLivingHeroes);
  livingEnemies = this.store.selectSignal(selectLivingEnemies);
  activeHeroIndex = this.store.selectSignal(selectActiveHeroIndex);
  activeHero = this.store.selectSignal(selectActiveHero);
  phase = this.store.selectSignal(selectPhase);
  round = this.store.selectSignal(selectRound);
  queuedCommands = this.store.selectSignal(selectQueuedCommands);
  spells = this.store.selectSignal(selectAvailableSpellsForActiveHero);
  goods = this.store.selectSignal(selectSharedGoods);

  areAllHeroesReady = computed(() => {
    const living = this.livingHeroes();
    const cmds = this.queuedCommands();
    return living.length > 0 && living.every(h => !!cmds[h.id]);
  });

  subMenuView = signal<'psi' | 'goods' | 'target' | null>(null);
  pendingAction = signal<Partial<QueuedCommand> | null>(null);

  isAlive(combatant: Combatant): boolean {
    return isAlive(combatant);
  }

  isTargetingAlly(action: Partial<QueuedCommand>): boolean {
    if (action.spell?.scope.includes('ally')) return true;
    if (action.item && (action.item.kind.includes('heal') || action.item.kind.includes('cure'))) return true;
    return false;
  }

  onCardClick(index: number): void {
    if (this.phase() === 'input') {
      this.store.dispatch(BattleActions.selectHeroForInput({ heroIndex: index }));
      this.subMenuView.set(null);
      this.pendingAction.set(null);
    }
  }

  onSelectBash(hero: Combatant): void {
    this.audio.playSelect();
    const enemies = this.livingEnemies();
    if (enemies.length === 1) {
      // Auto-target single enemy
      this.commitHeroAction(hero, {
        sourceId: hero.id,
        sourceName: hero.name,
        actionType: 'bash',
        targetId: enemies[0].id,
        initiativeRoll: BattleCalculator.calculateInitiative(hero.speed)
      });
    } else {
      this.pendingAction.set({
        sourceId: hero.id,
        sourceName: hero.name,
        actionType: 'bash',
        initiativeRoll: BattleCalculator.calculateInitiative(hero.speed)
      });
      this.subMenuView.set('target');
    }
  }

  onSelectDefend(hero: Combatant): void {
    this.audio.playSelect();
    this.commitHeroAction(hero, {
      sourceId: hero.id,
      sourceName: hero.name,
      actionType: 'defend',
      targetId: hero.id,
      initiativeRoll: BattleCalculator.calculateInitiative(hero.speed) + 20
    });
  }

  openPsiMenu(): void {
    this.audio.playSelect();
    this.subMenuView.set('psi');
  }

  openGoodsMenu(): void {
    this.audio.playSelect();
    this.subMenuView.set('goods');
  }

  closeSubMenu(): void {
    this.audio.playCancel();
    this.subMenuView.set(null);
    this.pendingAction.set(null);
  }

  onSelectSpell(hero: Combatant, spell: PsiSpell): void {
    this.audio.playSelect();
    // If spell targets all enemies or all allies, commit immediately
    if (spell.scope === 'all_enemies' || spell.scope === 'all_allies') {
      const defaultTarget = spell.scope === 'all_enemies'
        ? this.livingEnemies()[0]?.id
        : hero.id;

      this.commitHeroAction(hero, {
        sourceId: hero.id,
        sourceName: hero.name,
        actionType: 'psi',
        spell,
        targetId: defaultTarget,
        initiativeRoll: BattleCalculator.calculateInitiative(hero.speed)
      });
      this.subMenuView.set(null);
      return;
    }

    // Single target spell
    this.pendingAction.set({
      sourceId: hero.id,
      sourceName: hero.name,
      actionType: 'psi',
      spell,
      initiativeRoll: BattleCalculator.calculateInitiative(hero.speed)
    });
    this.subMenuView.set('target');
  }

  onSelectItem(hero: Combatant, item: GoodsItem): void {
    this.audio.playSelect();
    this.pendingAction.set({
      sourceId: hero.id,
      sourceName: hero.name,
      actionType: 'goods',
      item,
      initiativeRoll: BattleCalculator.calculateInitiative(hero.speed)
    });
    this.subMenuView.set('target');
  }

  confirmTarget(hero: Combatant, targetId: string): void {
    const pending = this.pendingAction();
    if (!pending) return;

    this.audio.playSelect();
    this.commitHeroAction(hero, {
      ...pending,
      sourceId: hero.id,
      sourceName: hero.name,
      targetId,
      actionType: pending.actionType || 'bash',
      initiativeRoll: pending.initiativeRoll || BattleCalculator.calculateInitiative(hero.speed)
    } as QueuedCommand);

    this.subMenuView.set(null);
    this.pendingAction.set(null);
  }

  onCancelToPrevious(): void {
    this.audio.playCancel();
    this.store.dispatch(BattleActions.previousHeroInput());
    this.subMenuView.set(null);
    this.pendingAction.set(null);
  }

  onConfirmRound(): void {
    this.audio.playSelect();
    this.store.dispatch(BattleActions.confirmRound());
  }

  private commitHeroAction(hero: Combatant, command: QueuedCommand): void {
    this.store.dispatch(BattleActions.setHeroCommand({ heroId: hero.id, command }));
  }
}
