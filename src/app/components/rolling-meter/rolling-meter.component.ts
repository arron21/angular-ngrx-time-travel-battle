import { Component, Input, OnChanges, SimpleChanges, signal, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rolling-meter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rolling-meter-box" [class.warning]="isLow()" [class.zero]="displayValue() <= 0">
      <div class="meter-label">{{ label }}</div>
      <div class="odometer-window">
        <div class="digits-wrapper">
          <span class="digit-text">{{ formattedValue() }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .rolling-meter-box {
      display: flex;
      align-items: center;
      background: #111;
      border: 2px solid #555;
      box-shadow: inset 1px 1px 0 #888, inset -1px -1px 0 #000;
      padding: 2px 6px;
      font-family: 'Courier New', Courier, monospace;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      justify-content: space-between;
      user-select: none;
    }

    .meter-label {
      font-size: 11px;
      font-weight: 900;
      color: #aaa;
      letter-spacing: 1px;
      margin-right: 6px;
    }

    .odometer-window {
      background: #000;
      border: 1px solid #333;
      padding: 1px 4px;
      min-width: 48px;
      text-align: right;
      overflow: hidden;
      position: relative;
    }

    .digit-text {
      font-size: 15px;
      font-weight: bold;
      color: #fff;
      text-shadow: 0 0 2px rgba(255, 255, 255, 0.4);
      display: inline-block;
      transition: transform 0.05s ease-out;
    }

    .rolling-meter-box.warning .digit-text {
      color: #ffaa00;
    }

    .rolling-meter-box.zero .digit-text {
      color: #ff3333;
    }
  `]
})
export class RollingMeterComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) value: number = 0;
  @Input() maxValue: number = 100;
  @Input() label: string = 'HP';

  displayValue = signal<number>(0);
  private animTimer: ReturnType<typeof setInterval> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.animateTo(this.value);
    }
  }

  isLow(): boolean {
    return this.maxValue > 0 && this.displayValue() > 0 && (this.displayValue() / this.maxValue) <= 0.25;
  }

  formattedValue(): string {
    const val = Math.max(0, Math.floor(this.displayValue()));
    return val.toString().padStart(3, '0');
  }

  private animateTo(target: number): void {
    if (this.animTimer) {
      clearInterval(this.animTimer);
      this.animTimer = null;
    }

    // EarthBound odometer rolling animation
    const step = () => {
      const current = this.displayValue();
      if (current === target) {
        if (this.animTimer) {
          clearInterval(this.animTimer);
          this.animTimer = null;
        }
        return;
      }

      const diff = target - current;
      // Step speed depends on distance
      const change = Math.abs(diff) > 20 
        ? (diff > 0 ? 5 : -5) 
        : (diff > 0 ? 1 : -1);

      this.displayValue.update(v => {
        const next = v + change;
        if ((diff > 0 && next >= target) || (diff < 0 && next <= target)) {
          return target;
        }
        return next;
      });
    };

    // If starting from 0 on initial load, jump directly
    if (this.displayValue() === 0 && target > 0) {
      this.displayValue.set(target);
      return;
    }

    this.animTimer = setInterval(step, 24);
  }

  ngOnDestroy(): void {
    if (this.animTimer) {
      clearInterval(this.animTimer);
    }
  }
}
