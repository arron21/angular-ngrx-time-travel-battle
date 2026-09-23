import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { BATTLE_FEATURE_KEY } from './state/battle.selectors';
import { timeTravelMetaReducer } from './state/history.meta-reducer';
import { battleReducer } from './state/battle.reducer';
import { BattleEffects } from './state/battle.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideStore(
      { [BATTLE_FEATURE_KEY]: timeTravelMetaReducer(battleReducer) },
      {
        runtimeChecks: {
          strictStateImmutability: true,
          strictActionImmutability: true,
          strictStateSerializability: false, // Allows rich objects/callbacks if needed, but actions & state are pure
          strictActionSerializability: false
        }
      }
    ),
    provideEffects(BattleEffects),
    provideStoreDevtools({
      maxAge: 50,
      logOnly: !isDevMode()
    })
  ]
};
