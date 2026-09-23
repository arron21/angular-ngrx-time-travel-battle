import { TestBed } from '@angular/core/testing';
import { App } from './app.component';
import { provideStore } from '@ngrx/store';
import { BATTLE_FEATURE_KEY } from './state/battle.selectors';
import { timeTravelMetaReducer } from './state/history.meta-reducer';
import { battleReducer } from './state/battle.reducer';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideStore({
          [BATTLE_FEATURE_KEY]: timeTravelMetaReducer(battleReducer)
        })
      ]
    }).compileComponents();
  });

  it('should create the app shell', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the Chrono-Scrubber header', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-title')?.textContent).toContain('CHRONO-SCRUBBER');
  });

  it('should toggle CRT scanlines', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app.isCrtEnabled()).toBe(false);
    app.toggleCrt();
    expect(app.isCrtEnabled()).toBe(true);
  });

  it('should toggle architecture specifications modal', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app.isArchModalOpen()).toBe(false);
    app.toggleArchModal();
    expect(app.isArchModalOpen()).toBe(true);
  });
});
