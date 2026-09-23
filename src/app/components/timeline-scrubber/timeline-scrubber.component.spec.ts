import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimelineScrubberComponent } from './timeline-scrubber.component';
import { provideStore, Store } from '@ngrx/store';
import { BATTLE_FEATURE_KEY } from '../../state/battle.selectors';
import { timeTravelMetaReducer } from '../../state/history.meta-reducer';
import { battleReducer } from '../../state/battle.reducer';
import { BattleActions, TimeTravelActions } from '../../state/battle.actions';

describe('TimelineScrubberComponent', () => {
  let component: TimelineScrubberComponent;
  let fixture: ComponentFixture<TimelineScrubberComponent>;
  let store: Store;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimelineScrubberComponent],
      providers: [
        provideStore({
          [BATTLE_FEATURE_KEY]: timeTravelMetaReducer(battleReducer)
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TimelineScrubberComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(Store);
    fixture.detectChanges();
  });

  it('should create the timeline scrubber component', () => {
    expect(component).toBeTruthy();
  });

  it('should display initial node index 0 / 0', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const stepNumber = compiled.querySelector('.step-number')?.textContent?.trim();
    expect(stepNumber).toBe('0 / 0');
  });

  it('should dispatch TimeTravelActions.undo when undo() is called', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    component.undo();
    expect(dispatchSpy).toHaveBeenCalledWith(TimeTravelActions.undo());
  });

  it('should dispatch TimeTravelActions.redo when redo() is called', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    component.redo();
    expect(dispatchSpy).toHaveBeenCalledWith(TimeTravelActions.redo());
  });

  it('should dispatch TimeTravelActions.rewindToRoundStart when rewindRound() is called', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    component.rewindRound();
    expect(dispatchSpy).toHaveBeenCalledWith(TimeTravelActions.rewindToRoundStart());
  });

  it('should dispatch TimeTravelActions.jumpToStep when jumpTo(index) is called', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    component.jumpTo(3);
    expect(dispatchSpy).toHaveBeenCalledWith(TimeTravelActions.jumpToStep({ targetStepIndex: 3 }));
  });

  it('should dispatch BattleActions.toggleAutoPlay when toggleAutoPlay() is called', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    component.toggleAutoPlay();
    expect(dispatchSpy).toHaveBeenCalledWith(BattleActions.toggleAutoPlay());
  });

  it('should dispatch BattleActions.resetBattle when resetBattle() is called', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    component.resetBattle();
    expect(dispatchSpy).toHaveBeenCalledWith(BattleActions.resetBattle());
  });

  it('should display branch warning when rewound into past state', async () => {
    // Dispatch an action to create a step in the past
    store.dispatch(BattleActions.setHeroCommand({
      heroId: 'hero-ness',
      command: { sourceId: 'hero-ness', sourceName: 'Ness', actionType: 'bash', targetId: 'enemy-starman', initiativeRoll: 25 }
    }));

    // Undo to move into the past
    store.dispatch(TimeTravelActions.undo());

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const warning = compiled.querySelector('.branch-warning');
    expect(warning).not.toBeNull();
    expect(warning?.textContent).toContain('drop the previous future branch');
  });
});
