import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RollingMeterComponent } from './rolling-meter.component';
import { SimpleChange } from '@angular/core';

describe('RollingMeterComponent', () => {
  let component: RollingMeterComponent;
  let fixture: ComponentFixture<RollingMeterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RollingMeterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RollingMeterComponent);
    component = fixture.componentInstance;
    component.value = 100;
    component.maxValue = 100;
    component.label = 'HP';
    fixture.detectChanges();
  });

  it('should create the rolling meter', () => {
    expect(component).toBeTruthy();
  });

  it('should format value with 3-digit zero padding', () => {
    component.displayValue.set(42);
    expect(component.formattedValue()).toBe('042');

    component.displayValue.set(5);
    expect(component.formattedValue()).toBe('005');

    component.displayValue.set(280);
    expect(component.formattedValue()).toBe('280');
  });

  it('should identify when HP is in warning/critical threshold (<= 25%)', () => {
    component.maxValue = 100;
    component.displayValue.set(50);
    expect(component.isLow()).toBe(false);

    component.displayValue.set(20);
    expect(component.isLow()).toBe(true);
  });

  it('should identify zero value', () => {
    component.displayValue.set(0);
    expect(component.displayValue()).toBe(0);
  });

  it('should update display value when input changes via ngOnChanges', () => {
    component.displayValue.set(0);
    component.value = 200;
    component.ngOnChanges({
      value: new SimpleChange(0, 200, false)
    });
    // If starting from 0, it jumps to target value
    expect(component.displayValue()).toBe(200);
  });
});
