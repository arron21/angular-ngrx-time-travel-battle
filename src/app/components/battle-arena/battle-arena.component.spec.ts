import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BattleArenaComponent } from './battle-arena.component';
import { provideStore, Store } from '@ngrx/store';
import { BATTLE_FEATURE_KEY } from '../../state/battle.selectors';
import { timeTravelMetaReducer } from '../../state/history.meta-reducer';
import { battleReducer } from '../../state/battle.reducer';
import { BattleActions } from '../../state/battle.actions';

describe('BattleArenaComponent', () => {
  let component: BattleArenaComponent;
  let fixture: ComponentFixture<BattleArenaComponent>;
  let store: Store;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BattleArenaComponent],
      providers: [
        provideStore({
          [BATTLE_FEATURE_KEY]: timeTravelMetaReducer(battleReducer)
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BattleArenaComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(Store);
    fixture.detectChanges();
  });

  it('should create the battle arena', () => {
    expect(component).toBeTruthy();
  });

  it('should render all 3 enemies initially', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const enemyCards = compiled.querySelectorAll('.enemy-card');
    expect(enemyCards.length).toBe(3);
  });

  it('should display the battle log in the ticker window', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const tickerLine = compiled.querySelector('.ticker-line');
    expect(tickerLine?.textContent).toContain('A hostile party confronted you!');
  });

  it('should set targetedEnemyId when a living enemy is clicked', () => {
    const livingEnemy = component.enemies()[0];
    component.onEnemyClick(livingEnemy);
    expect(component.targetedEnemyId()).toBe(livingEnemy.id);
  });

  it('should show damage popup and trigger shake when damage result is applied', async () => {
    store.dispatch(BattleActions.applyStepResult({
      result: {
        actorId: 'hero-ness',
        actorName: 'Ness',
        targetId: 'enemy-starman',
        targetName: 'Starman Jr.',
        actionType: 'bash',
        abilityName: 'Bash',
        damage: 88,
        isCritical: true,
        narrative: 'SMAAAASH!! Ness struck Starman Jr. for 88 HP critical damage!'
      }
    }));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.shakingEnemyId()).toBe('enemy-starman');
    expect(component.popup()?.text).toBe('88 HP');
    expect(component.popup()?.isCritical).toBe(true);
  });
});
