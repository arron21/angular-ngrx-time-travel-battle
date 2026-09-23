import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimelineScrubberComponent } from './components/timeline-scrubber/timeline-scrubber.component';
import { BattleArenaComponent } from './components/battle-arena/battle-arena.component';
import { CharacterCardsComponent } from './components/character-cards/character-cards.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    TimelineScrubberComponent,
    BattleArenaComponent,
    CharacterCardsComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class App {
  isCrtEnabled = signal<boolean>(false);
  isArchModalOpen = signal<boolean>(false);

  toggleCrt(): void {
    this.isCrtEnabled.update(v => !v);
  }

  toggleArchModal(): void {
    this.isArchModalOpen.update(v => !v);
  }
}
