import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, Subject, firstValueFrom } from 'rxjs';
import { Action } from '@ngrx/store';
import { provideStore, Store } from '@ngrx/store';
import { BattleEffects } from './battle.effects';
import { BattleActions, TimeTravelActions } from './battle.actions';
import { BATTLE_FEATURE_KEY } from './battle.selectors';
import { timeTravelMetaReducer } from './history.meta-reducer';
import { battleReducer } from './battle.reducer';
import { RetroAudioService } from '../core/audio/retro-audio.service';

describe('BattleEffects', () => {
  let actions$: Observable<Action>;
  let effects: BattleEffects;
  let store: Store;
  let audio: RetroAudioService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BattleEffects,
        provideMockActions(() => actions$),
        provideStore({
          [BATTLE_FEATURE_KEY]: timeTravelMetaReducer(battleReducer)
        }),
        RetroAudioService
      ]
    });

    effects = TestBed.inject(BattleEffects);
    store = TestBed.inject(Store);
    audio = TestBed.inject(RetroAudioService);
  });

  it('should be created', () => {
    expect(effects).toBeTruthy();
  });

  it('should play time-rewind audio when TimeTravelActions.undo is dispatched', () => {
    const audioSpy = vi.spyOn(audio, 'playTimeRewind');
    const actionsSubject = new Subject<Action>();
    actions$ = actionsSubject.asObservable();

    // Subscribe to timeTravelAudio$
    effects.timeTravelAudio$.subscribe();

    actionsSubject.next(TimeTravelActions.undo());
    expect(audioSpy).toHaveBeenCalled();
  });

  it('should play cursor audio when nextHeroInput is dispatched', () => {
    const audioSpy = vi.spyOn(audio, 'playCursor');
    const actionsSubject = new Subject<Action>();
    actions$ = actionsSubject.asObservable();

    effects.menuAudio$.subscribe();

    actionsSubject.next(BattleActions.nextHeroInput());
    expect(audioSpy).toHaveBeenCalled();
  });

  it('should dispatch executeNextStep after confirmRound is dispatched', async () => {
    actions$ = of(BattleActions.confirmRound());
    const result = await firstValueFrom(effects.startRoundExecution$);
    expect(result).toEqual(BattleActions.executeNextStep());
  });
});
