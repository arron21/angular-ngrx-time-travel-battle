import { describe, it, expect } from 'vitest';
import { BattleCalculator } from './battle-calculator';
import { Combatant } from './combatant.model';

describe('BattleCalculator', () => {
  const dummyHero: Combatant = {
    id: 'hero-1',
    name: 'Ness',
    type: 'hero',
    maxHp: 280,
    hp: 280,
    maxPp: 60,
    pp: 60,
    offense: 50,
    defense: 30,
    speed: 25,
    status: 'ok',
    sprite: 'ness'
  };

  const dummyEnemy: Combatant = {
    id: 'enemy-1',
    name: 'Starman',
    type: 'enemy',
    maxHp: 300,
    hp: 300,
    maxPp: 50,
    pp: 50,
    offense: 40,
    defense: 20,
    speed: 20,
    status: 'ok',
    sprite: 'starman'
  };

  it('calculates initiative based on speed with variance', () => {
    const init = BattleCalculator.calculateInitiative(30);
    expect(init).toBeGreaterThanOrEqual(30);
    expect(init).toBeLessThanOrEqual(50);
  });

  it('calculates bash damage and deals positive damage', () => {
    const result = BattleCalculator.executeBash(dummyHero, dummyEnemy, false);
    expect(result.damage).toBeDefined();
    expect(result.damage!).toBeGreaterThan(10);
    expect(result.actorName).toBe('Ness');
    expect(result.targetName).toBe('Starman');
    expect(result.isRetargeted).toBe(false);
  });

  it('reduces bash damage when target is defending', () => {
    const defendingEnemy = { ...dummyEnemy, isDefending: true };
    const normalResult = BattleCalculator.executeBash(dummyHero, dummyEnemy, false);
    const defendingResult = BattleCalculator.executeBash(dummyHero, defendingEnemy, false);
    // On average, defending takes approximately half damage
    expect(defendingResult.damage!).toBeLessThan(normalResult.damage! * 1.2);
  });

  it('retargets to next living target when original target is dead (Modern FF rule)', () => {
    const deadEnemy: Combatant = { ...dummyEnemy, id: 'dead-1', hp: 0, status: 'unconscious' };
    const liveEnemy: Combatant = { ...dummyEnemy, id: 'live-1', hp: 100, status: 'ok' };

    const resolution = BattleCalculator.resolveTarget(
      'dead-1',
      [dummyHero],
      [deadEnemy, liveEnemy],
      false
    );

    expect(resolution.target).not.toBeNull();
    expect(resolution.target!.id).toBe('live-1');
    expect(resolution.wasRetargeted).toBe(true);
  });

  it('generates enemy actions for living enemies', () => {
    const actions = BattleCalculator.generateEnemyActions([dummyEnemy], [dummyHero]);
    expect(actions.length).toBe(1);
    expect(actions[0].sourceId).toBe('enemy-1');
    expect(actions[0].targetId).toBe('hero-1');
    expect(actions[0].initiativeRoll).toBeGreaterThan(0);
  });
});
