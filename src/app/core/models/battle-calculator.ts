import { Combatant, isAlive } from './combatant.model';
import { GoodsItem, PsiSpell, QueuedCommand, StepExecutionResult } from './battle-action.model';

export class BattleCalculator {
  /**
   * Calculates turn initiative for a combatant.
   * Faster speed = higher initiative roll.
   */
  public static calculateInitiative(speed: number): number {
    const variance = Math.floor(Math.random() * (Math.floor(speed / 4) + 4));
    return speed + variance;
  }

  /**
   * Finds the best valid target if the intended target is dead or invalid.
   */
  public static resolveTarget(
    intendedTargetId: string | undefined,
    actors: readonly Combatant[],
    enemies: readonly Combatant[],
    isSupportAction: boolean
  ): { target: Combatant | null; wasRetargeted: boolean } {
    const pool = isSupportAction ? actors : enemies;
    const living = pool.filter(isAlive);

    if (living.length === 0) {
      return { target: null, wasRetargeted: false };
    }

    if (intendedTargetId) {
      const match = living.find(c => c.id === intendedTargetId);
      if (match) {
        return { target: match, wasRetargeted: false };
      }
    }

    // Modern FF retargeting: Pick first available living combatant
    return { target: living[0], wasRetargeted: true };
  }

  /**
   * Calculates bash (physical attack) outcome.
   */
  public static executeBash(
    attacker: Combatant,
    target: Combatant,
    wasRetargeted: boolean
  ): StepExecutionResult {
    // 10% chance of EarthBound SMAAAASH! (Critical hit)
    const isCritical = Math.random() < 0.12;

    let damage: number;
    if (isCritical) {
      // Smaaash ignores 60% of defense
      const raw = attacker.offense * 2.2 - (target.defense * 0.4);
      damage = Math.max(25, Math.floor(raw * (0.9 + Math.random() * 0.2)));
    } else {
      const base = (attacker.offense * 2) - target.defense;
      const variance = 0.85 + Math.random() * 0.3; // 85% - 115%
      damage = Math.max(1, Math.floor(base * variance));
    }

    if (target.isDefending) {
      damage = Math.max(1, Math.floor(damage * 0.5));
    }

    let narrative: string;
    if (isCritical) {
      narrative = `SMAAAASH!! ${attacker.name} struck ${target.name} for ${damage} HP of critical damage!`;
    } else {
      narrative = `${attacker.name} attacked! ${target.name} took ${damage} HP of damage.`;
    }

    if (wasRetargeted) {
      narrative = `(Target redirected) ` + narrative;
    }

    return {
      actorId: attacker.id,
      actorName: attacker.name,
      targetId: target.id,
      targetName: target.name,
      actionType: 'bash',
      abilityName: 'Bash',
      damage,
      isCritical,
      narrative,
      isRetargeted: wasRetargeted
    };
  }

  /**
   * Calculates PSI spell outcome (Damage, Heal, or Status).
   */
  public static executePsi(
    caster: Combatant,
    target: Combatant,
    spell: PsiSpell,
    wasRetargeted: boolean
  ): StepExecutionResult {
    if (spell.kind === 'heal') {
      const healBase = spell.power + Math.floor(caster.offense * 0.4);
      const healAmount = Math.floor(healBase * (0.9 + Math.random() * 0.2));
      const narrative = `${caster.name} unleashed ${spell.name}! ${target.name} recovered ${healAmount} HP!`;

      return {
        actorId: caster.id,
        actorName: caster.name,
        targetId: target.id,
        targetName: target.name,
        actionType: 'psi',
        abilityName: spell.name,
        heal: healAmount,
        narrative,
        isRetargeted: wasRetargeted
      };
    }

    if (spell.kind === 'status') {
      const statusInflicted = spell.statusInflicted || 'asleep';
      const narrative = `${caster.name} generated ${spell.name}! ${target.name} fell ${statusInflicted === 'asleep' ? 'fast asleep' : 'paralyzed'}!`;

      return {
        actorId: caster.id,
        actorName: caster.name,
        targetId: target.id,
        targetName: target.name,
        actionType: 'psi',
        abilityName: spell.name,
        statusInflicted,
        narrative,
        isRetargeted: wasRetargeted
      };
    }

    // Damage PSI
    const baseDamage = spell.power + (caster.offense * 0.8) - (target.defense * 0.2);
    const variance = 0.9 + Math.random() * 0.2;
    const damage = Math.max(10, Math.floor(baseDamage * variance));

    // Optional status infliction
    const statusInflicted = spell.statusInflicted && Math.random() < 0.45 ? spell.statusInflicted : undefined;

    let narrative = `${caster.name} channeled ${spell.name}! ${target.name} took ${damage} HP damage!`;
    if (statusInflicted) {
      narrative += ` ${target.name} became ${statusInflicted}!`;
    }
    if (wasRetargeted) {
      narrative = `(Target redirected) ` + narrative;
    }

    return {
      actorId: caster.id,
      actorName: caster.name,
      targetId: target.id,
      targetName: target.name,
      actionType: 'psi',
      abilityName: spell.name,
      damage,
      statusInflicted,
      narrative,
      isRetargeted: wasRetargeted
    };
  }

  /**
   * Calculates Goods item outcome.
   */
  public static executeGoods(
    user: Combatant,
    target: Combatant,
    item: GoodsItem,
    wasRetargeted: boolean
  ): StepExecutionResult {
    if (item.kind === 'heal_hp') {
      const heal = item.power;
      return {
        actorId: user.id,
        actorName: user.name,
        targetId: target.id,
        targetName: target.name,
        actionType: 'goods',
        abilityName: item.name,
        heal,
        narrative: `${user.name} used ${item.name}! ${target.name} recovered ${heal} HP!`
      };
    }

    if (item.kind === 'heal_pp') {
      return {
        actorId: user.id,
        actorName: user.name,
        targetId: target.id,
        targetName: target.name,
        actionType: 'goods',
        abilityName: item.name,
        narrative: `${user.name} consumed ${item.name}! ${target.name} restored ${item.power} PP!`
      };
    }

    if (item.kind === 'cure_status') {
      return {
        actorId: user.id,
        actorName: user.name,
        targetId: target.id,
        targetName: target.name,
        actionType: 'goods',
        abilityName: item.name,
        narrative: `${user.name} used ${item.name}! ${target.name}'s ailments were purified!`
      };
    }

    // Damage item (Rocket)
    const damage = item.power;
    return {
      actorId: user.id,
      actorName: user.name,
      targetId: target.id,
      targetName: target.name,
      actionType: 'goods',
      abilityName: item.name,
      damage,
      narrative: `BOOM!! ${user.name} fired the ${item.name}! ${target.name} took ${damage} HP damage!`,
      isRetargeted: wasRetargeted
    };
  }

  /**
   * Generates AI actions for enemies at the start of a round.
   */
  public static generateEnemyActions(
    enemies: readonly Combatant[],
    heroes: readonly Combatant[]
  ): QueuedCommand[] {
    const aliveEnemies = enemies.filter(isAlive);
    const aliveHeroes = heroes.filter(isAlive);

    if (aliveHeroes.length === 0) return [];

    return aliveEnemies.map(enemy => {
      // Pick random living hero target
      const target = aliveHeroes[Math.floor(Math.random() * aliveHeroes.length)];
      const initiativeRoll = BattleCalculator.calculateInitiative(enemy.speed);

      // Boss (Starman) has chance to cast PSI Beam or attack
      if (enemy.id === 'enemy-starman' && enemy.pp >= 10 && Math.random() < 0.4) {
        return {
          sourceId: enemy.id,
          sourceName: enemy.name,
          actionType: 'psi',
          spell: {
            id: 'enemy-pk-beam',
            name: 'PK Beam',
            ppCost: 10,
            power: 65,
            scope: 'single_enemy',
            kind: 'damage',
            description: 'Destructive cosmic particle beam.'
          },
          targetId: target.id,
          initiativeRoll
        };
      }

      // Robot has chance to use exhaust fumes (sleep)
      if (enemy.id === 'enemy-robot' && Math.random() < 0.3) {
        return {
          sourceId: enemy.id,
          sourceName: enemy.name,
          actionType: 'psi',
          spell: {
            id: 'enemy-fumes',
            name: 'Exhaust Fumes',
            ppCost: 0,
            power: 0,
            scope: 'single_enemy',
            kind: 'status',
            statusInflicted: 'asleep',
            description: 'Noxious exhaust makes a hero drowsy.'
          },
          targetId: target.id,
          initiativeRoll
        };
      }

      // Default: physical bash attack
      return {
        sourceId: enemy.id,
        sourceName: enemy.name,
        actionType: 'bash',
        targetId: target.id,
        initiativeRoll
      };
    });
  }
}
