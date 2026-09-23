import { TestBed } from '@angular/core/testing';
import { CharacterCardsComponent } from './character-cards.component';
import { provideStore, Store } from '@ngrx/store';
import { BATTLE_FEATURE_KEY } from '../../state/battle.selectors';
import { timeTravelMetaReducer } from '../../state/history.meta-reducer';
import { battleReducer } from '../../state/battle.reducer';
import { BattleActions } from '../../state/battle.actions';

describe('CharacterCardsComponent', () => {
  let fixture: any;
  let component: CharacterCardsComponent;
  let store: Store;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterCardsComponent],
      providers: [
        provideStore({
          [BATTLE_FEATURE_KEY]: timeTravelMetaReducer(battleReducer)
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterCardsComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(Store);
    fixture.detectChanges();
  });

  it('does NOT show the commence button initially before all 4 characters have selected moves', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const commenceBtn = compiled.querySelector('.cmd-btn.commence-btn');
    expect(commenceBtn).toBeNull();
    expect(component.areAllHeroesReady()).toBe(false);
  });

  it('shows the commence button next to the other action buttons once all 4 characters have selected moves', async () => {
    // Select move for Ness
    store.dispatch(BattleActions.setHeroCommand({
      heroId: 'hero-ness',
      command: { sourceId: 'hero-ness', sourceName: 'Ness', actionType: 'bash', targetId: 'enemy-starman', initiativeRoll: 25 }
    }));
    // Select move for Paula
    store.dispatch(BattleActions.setHeroCommand({
      heroId: 'hero-paula',
      command: { sourceId: 'hero-paula', sourceName: 'Paula', actionType: 'bash', targetId: 'enemy-starman', initiativeRoll: 38 }
    }));
    // Select move for Jeff
    store.dispatch(BattleActions.setHeroCommand({
      heroId: 'hero-jeff',
      command: { sourceId: 'hero-jeff', sourceName: 'Jeff', actionType: 'bash', targetId: 'enemy-starman', initiativeRoll: 30 }
    }));
    // Select move for Poo
    store.dispatch(BattleActions.setHeroCommand({
      heroId: 'hero-poo',
      command: { sourceId: 'hero-poo', sourceName: 'Poo', actionType: 'defend', targetId: 'hero-poo', initiativeRoll: 46 }
    }));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.areAllHeroesReady()).toBe(true);

    const compiled = fixture.nativeElement as HTMLElement;
    const commenceBtn = compiled.querySelector('.cmd-btn.commence-btn');
    expect(commenceBtn).not.toBeNull();
    expect(commenceBtn?.textContent).toContain('COMMENCE');

    // Verify it is positioned inside .commands-row alongside the other buttons
    const commandsRow = compiled.querySelector('.commands-row');
    expect(commandsRow?.contains(commenceBtn!)).toBe(true);
  });
});
