(function registerOpponentAI(root) {
  "use strict";

  const AI_SIDE = "ai";
  const PLAYER_SIDE = "player";
  const WIN_SCORE = 1000000000;
  const SCORE_EPSILON = 0.0001;
  const REPLY_PLAN_LIMIT = 12;
  const REPLY_COMBAT_NODE_LIMIT = 96;
  const REPLY_DISRUPTION_NODE_LIMIT = 128;
  const FULL_SIMULATION_TARGET = 6;
  const FULL_SIMULATION_HARD_LIMIT = 8;
  const COMMANDER_POWER_ACTION = "USE_COMMANDER_POWER";

  function finite(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function hashText(value) {
    const text = String(value == null ? "" : value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function resolveSalt(source) {
    if (typeof source === "function") {
      return Math.floor(Math.max(0, Math.min(0.999999999, finite(source(), 0.5))) * 4294967296) >>> 0;
    }
    if (source && typeof source.next === "function") {
      return Math.floor(
        Math.max(0, Math.min(0.999999999, finite(source.next(), 0.5))) * 4294967296,
      ) >>> 0;
    }
    if (source && typeof source.random === "function") {
      return Math.floor(
        Math.max(0, Math.min(0.999999999, finite(source.random(), 0.5))) * 4294967296,
      ) >>> 0;
    }
    return hashText(source == null ? "empty-fort-stratagem" : source);
  }

  function actionKey(action) {
    if (!action || typeof action !== "object") return "invalid";
    const target = action.target || {};
    return [
      action.type || "",
      action.side || "",
      action.powerId || action.commanderPowerId || action.commanderId || "",
      Number.isInteger(Number(action.handIndex)) ? Number(action.handIndex) : "",
      Number.isInteger(Number(action.attackerIndex)) ? Number(action.attackerIndex) : "",
      target.zone || "",
      target.side || "",
      Number.isInteger(Number(target.index)) ? Number(target.index) : "",
    ].join("|");
  }

  function commanderPublicState(state, side) {
    const hero = (state && state.heroes && state.heroes[side]) || {};
    const commander = (state && state.commanders && state.commanders[side]) || {};
    const power = (state && state.commanderPowers && state.commanderPowers[side]) || {};
    return [
      hero.commanderId,
      hero.commander,
      hero.powerId,
      hero.commanderPowerId,
      hero.powerUsed,
      hero.commanderPowerUsed,
      hero.powerAvailable,
      hero.powerCooldown,
      commander.id,
      commander.faction,
      commander.commanderId,
      commander.powerId,
      commander.powerCost,
      commander.powerUsed,
      commander.powerUsedThisTurn,
      commander.used,
      commander.available,
      commander.cooldown,
      commander.reflectCharges,
      power.id,
      power.powerId,
      power.used,
      power.available,
      power.cooldown,
      state && state.commanderPowerUses && state.commanderPowerUses[side],
    ].map((value) => {
      if (value && typeof value === "object") {
        return value.id || value.key || value.name || "";
      }
      return value == null ? "" : value;
    });
  }

  function stateSignature(state, ignoreRevision) {
    if (!state || typeof state !== "object") return "missing-state";
    const parts = [
      state.phase,
      state.turn,
      finite(state.turnNumber, 0),
      ignoreRevision ? "*" : finite(state.revision, 0),
    ];
    [PLAYER_SIDE, AI_SIDE].forEach((side) => {
      const hero = (state.heroes && state.heroes[side]) || {};
      parts.push(
        side,
        finite(hero.health, 0),
        finite(hero.armor, 0),
        finite(hero.mana, 0),
        finite(hero.maxMana, 0),
      );
      parts.push("commander", ...commanderPublicState(state, side));
      const hand = (state.hands && state.hands[side]) || [];
      if (side === PLAYER_SIDE) {
        parts.push("hidden-hand", hand.length);
      } else {
        hand.forEach((card) => {
          parts.push(
            card.instanceId || card.id || "?",
            finite(card.currentCost, finite(card.cost, 0)),
          );
        });
      }
      parts.push("/");
      const board = (state.boards && state.boards[side]) || [];
      board.forEach((minion) => {
        parts.push(
          minion.instanceId || minion.id || "?",
          finite(minion.currentAttack, finite(minion.attack, 0)),
          finite(minion.currentHealth, finite(minion.health, 0)),
          minion.shield ? 1 : 0,
          minion.guard ? 1 : 0,
          minion.attackLockPending ? 1 : 0,
          minion.attackLockedThisTurn ? 1 : 0,
          minion.canAttack ? finite(minion.attacksLeft, 1) : 0,
        );
      });
      parts.push("//");
    });
    return parts.join(":");
  }

  function keywordList(entity) {
    return entity && Array.isArray(entity.keywords) ? entity.keywords : [];
  }

  function hasGuard(entity) {
    return Boolean(entity && (entity.guard || keywordList(entity).includes("수호")));
  }

  function hasShield(entity) {
    return Boolean(entity && (entity.shield || keywordList(entity).includes("방패")));
  }

  function abilitiesOf(entity) {
    return entity && Array.isArray(entity.abilities) ? entity.abilities : [];
  }

  const FINISHER_IDS = new Set([
    "shu_guan_yu",
    "wu_zhou_yu",
    "qun_lu_bu",
  ]);
  const DEATH_VALUE_IDS = new Set([
    "wei_dian_wei",
    "wei_guo_jia",
    "wu_huang_gai",
  ]);

  function entityId(entity) {
    return String((entity && entity.id) || "");
  }

  function abilityByOp(entity, op) {
    return abilitiesOf(entity).find((ability) => ability && ability.op === op) || null;
  }

  function attackOf(entity) {
    return Math.max(0, finite(entity && entity.currentAttack, finite(entity && entity.attack, 0)));
  }

  function healthOf(entity) {
    return Math.max(0, finite(entity && entity.currentHealth, finite(entity && entity.health, 0)));
  }

  function isReady(entity) {
    return Boolean(
      entity &&
        !entity.attackLockPending &&
        !entity.attackLockedThisTurn &&
        entity.canAttack &&
        finite(entity.attacksLeft, entity.canAttack ? 1 : 0) > 0 &&
        attackOf(entity) > 0,
    );
  }

  function boardOf(state, side) {
    return (state && state.boards && state.boards[side]) || [];
  }

  function handOf(state, side) {
    return (state && state.hands && state.hands[side]) || [];
  }

  function hasCardInHand(state, side, id, maximumCost) {
    return handOf(state, side).some((card) => {
      if (entityId(card) !== id) return false;
      if (maximumCost == null) return true;
      return finite(card.currentCost, finite(card.cost, 0)) <= maximumCost;
    });
  }

  function deathrattleValue(entity, state) {
    let value = 0;
    abilitiesOf(entity).forEach((ability) => {
      if (!ability || ability.trigger !== "onDeath") return;
      if (ability.op === "damage_enemy_hero") {
        const amount = Math.max(0, finite(ability.amount, 0));
        const enemyHero = state && state.heroes && state.heroes.player;
        value += amount >= effectiveHealth(enemyHero) ? 42 : amount * 2.4;
      } else if (ability.op === "damage_random_enemy") {
        const enemyBoard = boardOf(state, PLAYER_SIDE);
        const amount = Math.max(0, finite(ability.amount, 0));
        value += enemyBoard.length ? amount * 1.7 : amount * 1.3;
        value += enemyBoard.filter(
          (minion) => !hasShield(minion) && healthOf(minion) <= amount,
        ).length * 1.8;
      } else if (ability.op === "draw") {
        const room = Math.max(0, 10 - handOf(state, AI_SIDE).length);
        const deck = (state && state.decks && state.decks.ai) || [];
        value += room && deck.length ? Math.max(1, finite(ability.amount, 1)) * 2.6 : 0;
      } else {
        value += abilityValue(ability) * 0.55;
      }
    });
    return value;
  }

  function enemyGuards(state, defender) {
    return boardOf(state, defender).filter(hasGuard);
  }

  function readyDamage(state, side) {
    return boardOf(state, side).reduce(
      (sum, minion) => sum + (isReady(minion) ? attackOf(minion) : 0),
      0,
    );
  }

  function playableCardActions(legalActions, handIndex) {
    return legalActions.filter(
      (action) =>
        action.type === "playCard" &&
        (handIndex == null || Number(action.handIndex) === Number(handIndex)),
    );
  }

  function oldExhaustedAllies(state, side) {
    return boardOf(state, side).filter(
      (minion) =>
        attackOf(minion) > 0 &&
        finite(minion.summonedTurn, -1) < finite(state && state.turnNumber, 0) &&
        finite(minion.attacksLeft, minion.canAttack ? 1 : 0) <= 0,
    );
  }

  function immediateCardBurst(card, state, side) {
    if (!card) return 0;
    const enemy = side === AI_SIDE ? PLAYER_SIDE : AI_SIDE;
    const guards = enemyGuards(state, enemy);
    const enemyBoard = boardOf(state, enemy);
    let burst = keywordList(card).includes("돌진") && !guards.length ? attackOf(card) : 0;
    abilitiesOf(card).forEach((ability) => {
      if (!ability || ability.trigger !== "onPlay") return;
      const amount = Math.max(0, finite(ability.amount, 0));
      if (ability.op === "damage_target" || ability.op === "damage_enemy_hero") {
        burst += amount;
      } else if (ability.op === "damage_random_enemy" && !enemyBoard.length) {
        burst += amount;
      } else if (ability.op === "ready_random_friendly" && !guards.length) {
        const exhausted = oldExhaustedAllies(state, side);
        if (exhausted.length) burst += Math.max.apply(null, exhausted.map(attackOf));
      }
    });
    return burst;
  }

  function handBurstPotential(state, side) {
    const hero = (state.heroes && state.heroes[side]) || {};
    const mana = Math.max(0, Math.floor(finite(hero.mana, 0)));
    const boardSlots = Math.max(0, 5 - boardOf(state, side).length);
    if (!mana || !boardSlots) return 0;
    const cards = handOf(state, side);
    const table = Array.from({ length: mana + 1 }, () =>
      Array.from({ length: boardSlots + 1 }, () => -Infinity),
    );
    table[0][0] = 0;
    cards.forEach((card) => {
      const cost = Math.max(0, Math.floor(finite(card.currentCost, finite(card.cost, 0))));
      if (cost > mana) return;
      const burst = immediateCardBurst(card, state, side);
      if (!burst) return;
      for (let spent = mana - cost; spent >= 0; spent -= 1) {
        for (let slots = boardSlots - 1; slots >= 0; slots -= 1) {
          if (!Number.isFinite(table[spent][slots])) continue;
          table[spent + cost][slots + 1] = Math.max(
            table[spent + cost][slots + 1],
            table[spent][slots] + burst,
          );
        }
      }
    });
    let best = 0;
    table.forEach((row) => row.forEach((value) => {
      if (Number.isFinite(value)) best = Math.max(best, value);
    }));
    return best;
  }

  function guaranteedTurnBurst(state, side) {
    const enemy = side === AI_SIDE ? PLAYER_SIDE : AI_SIDE;
    const boardBurst = enemyGuards(state, enemy).length ? 0 : readyDamage(state, side);
    return boardBurst + handBurstPotential(state, side);
  }

  function futureBoardDamage(state, side) {
    return boardOf(state, side).reduce(
      (sum, minion) =>
        sum +
        (
          minion.attackLockPending || minion.attackLockedThisTurn
            ? 0
            : attackOf(minion)
        ),
      0,
    );
  }

  function combineReplyVariants(left, right) {
    return {
      cost: left.cost + right.cost,
      cards: left.cards + right.cards,
      direct: left.direct + right.direct,
      removals: left.removals.concat(right.removals),
      sweep: left.sweep + right.sweep,
      charge: left.charge + right.charge,
      guard: left.guard + right.guard,
      raw: left.raw + right.raw,
    };
  }

  function replyPlans(state) {
    const hero = (state.heroes && state.heroes.player) || {};
    const nextMana = Math.min(
      10,
      Math.max(0, Math.floor(Math.max(
        finite(hero.mana, 0),
        finite(hero.maxMana, 0) + (state.turn === AI_SIDE ? 1 : 0),
      ))),
    );
    const slots = Math.max(0, 5 - boardOf(state, PLAYER_SIDE).length);
    const hiddenHandCount = handOf(state, PLAYER_SIDE).length;
    const plans = [{
      cost: 0,
      cards: 0,
      direct: 0,
      removals: [],
      sweep: 0,
      charge: 0,
      guard: 0,
      raw: 0,
    }];
    if (!slots || !nextMana || !hiddenHandCount) return plans;

    // The AI may observe hand size, but not hidden card identities. These small,
    // catalog-independent archetypes are a fair risk envelope rather than a
    // prediction of the player's exact reply.
    const archetypes = [];
    archetypes.push({
      cost: 1,
      cards: 1,
      direct: 1,
      removals: [],
      sweep: 0,
      charge: 0,
      guard: 0,
      raw: 1,
    });
    archetypes.push({
      cost: Math.min(3, nextMana),
      cards: 1,
      direct: 0,
      removals: [Math.min(3, Math.max(1, Math.ceil(nextMana / 3)))],
      sweep: 0,
      charge: 0,
      guard: 0,
      raw: 2.2,
    });
    if (nextMana >= 3) {
      archetypes.push({
        cost: 3,
        cards: 1,
        direct: 0,
        removals: [],
        sweep: 0,
        charge: 0,
        guard: 1,
        raw: 2,
      });
    }
    if (nextMana >= 4) {
      archetypes.push({
        cost: Math.min(nextMana, nextMana >= 6 ? 6 : 4),
        cards: 1,
        direct: 0,
        removals: [],
        sweep: 0,
        charge: nextMana >= 6 ? 5 : 3,
        guard: 0,
        raw: nextMana >= 6 ? 4.2 : 2.6,
      });
    }
    if (nextMana >= 6) {
      archetypes.push({
        cost: 6,
        cards: 1,
        direct: 0,
        removals: [],
        sweep: 2,
        charge: 0,
        guard: 0,
        raw: 3.8,
      });
    }

    archetypes.forEach((variant) => {
      if (variant.cost <= nextMana) plans.push(variant);
    });
    if (slots >= 2 && hiddenHandCount >= 2) {
      for (let left = 0; left < archetypes.length; left += 1) {
        for (let right = left + 1; right < archetypes.length; right += 1) {
          const combined = combineReplyVariants(archetypes[left], archetypes[right]);
          if (combined.cost <= nextMana) plans.push(combined);
        }
      }
    }
    return plans
      .sort((left, right) => right.raw - left.raw || left.cost - right.cost)
      .slice(0, REPLY_PLAN_LIMIT);
  }

  function projectedDefenders(state, sweep) {
    return boardOf(state, AI_SIDE)
      .map((minion) => {
        let health = healthOf(minion);
        let shield = hasShield(minion);
        if (sweep > 0) {
          if (shield) shield = false;
          else health -= sweep;
        }
        return {
          attack: attackOf(minion),
          health,
          shield,
          guard: hasGuard(minion),
        };
      })
      .filter((minion) => minion.health > 0);
  }

  function defenderSignature(defenders) {
    return defenders
      .map((minion) => [
        minion.attack,
        minion.health,
        minion.shield ? 1 : 0,
        minion.guard ? 1 : 0,
      ].join(","))
      .sort()
      .join(";");
  }

  function damageDefender(defenders, index, amount) {
    const next = defenders.map((minion) => ({ ...minion }));
    const target = next[index];
    if (!target) return next;
    if (target.shield) target.shield = false;
    else target.health -= Math.max(0, amount);
    return next.filter((minion) => minion.health > 0);
  }

  function maxFaceDamageThroughGuards(defenders, attackers, nodeLimit) {
    const sortedAttackers = attackers
      .map((amount) => Math.max(0, finite(amount, 0)))
      .filter((amount) => amount > 0)
      .sort((left, right) => left - right);
    const memo = new Map();
    let nodes = 0;

    function search(remaining, index) {
      if (index >= sortedAttackers.length) return 0;
      const guards = remaining
        .map((minion, defenderIndex) => ({ minion, defenderIndex }))
        .filter((entry) => entry.minion.guard);
      if (!guards.length) {
        let face = 0;
        for (let cursor = index; cursor < sortedAttackers.length; cursor += 1) {
          face += sortedAttackers[cursor];
        }
        return face;
      }
      const key = `${index}|${defenderSignature(remaining)}`;
      if (memo.has(key)) return memo.get(key);
      if (nodes >= nodeLimit) return 0;
      nodes += 1;
      let best = search(remaining, index + 1);
      guards
        .sort((left, right) => {
          const leftDurability = left.minion.health + (left.minion.shield ? 20 : 0);
          const rightDurability = right.minion.health + (right.minion.shield ? 20 : 0);
          return leftDurability - rightDurability;
        })
        .forEach(({ defenderIndex }) => {
          best = Math.max(
            best,
            search(
              damageDefender(remaining, defenderIndex, sortedAttackers[index]),
              index + 1,
            ),
          );
        });
      memo.set(key, best);
      return best;
    }
    return search(defenders, 0);
  }

  function maxReplyFaceDamage(state, plan) {
    const defenders = projectedDefenders(state, plan.sweep);
    const removalPings = plan.removals
      .map((amount) => Math.max(0, finite(amount, 0)))
      .filter((amount) => amount > 0)
      .sort((left, right) => left - right);
    const attackers = boardOf(state, PLAYER_SIDE)
      .map(attackOf)
      .filter((amount) => amount > 0);
    if (plan.charge > 0) attackers.push(plan.charge);
    const memo = new Map();
    let nodes = 0;

    function assignRemoval(remaining, index) {
      if (index >= removalPings.length) {
        return maxFaceDamageThroughGuards(
          remaining,
          attackers,
          REPLY_COMBAT_NODE_LIMIT,
        );
      }
      const guards = remaining
        .map((minion, defenderIndex) => ({ minion, defenderIndex }))
        .filter((entry) => entry.minion.guard);
      if (!guards.length) {
        return maxFaceDamageThroughGuards(
          remaining,
          attackers,
          REPLY_COMBAT_NODE_LIMIT,
        );
      }
      const key = `${index}|${defenderSignature(remaining)}`;
      if (memo.has(key)) return memo.get(key);
      if (nodes >= REPLY_COMBAT_NODE_LIMIT) return 0;
      nodes += 1;
      let best = 0;
      guards.forEach(({ defenderIndex }) => {
        best = Math.max(
          best,
          assignRemoval(
            damageDefender(remaining, defenderIndex, removalPings[index]),
            index + 1,
          ),
        );
      });
      memo.set(key, best);
      return best;
    }

    return plan.direct + assignRemoval(defenders, 0);
  }

  function maxFutureThreatRemoved(state, plan) {
    const defenders = projectedDefenders(state, plan.sweep);
    const originalThreat = futureBoardDamage(state, AI_SIDE);
    const sweptThreat = defenders.reduce((sum, minion) => sum + minion.attack, 0);
    const sources = plan.removals
      .map((amount) => ({ amount: Math.max(0, finite(amount, 0)), spell: true }))
      .concat(
        boardOf(state, PLAYER_SIDE)
          .map(attackOf)
          .filter((amount) => amount > 0)
          .map((amount) => ({ amount, spell: false })),
      );
    if (plan.charge > 0) sources.push({ amount: plan.charge, spell: false });
    sources.sort((left, right) => left.amount - right.amount);
    const memo = new Map();
    let nodes = 0;

    function search(remaining, index) {
      if (index >= sources.length || !remaining.length) {
        return remaining.reduce((sum, minion) => sum + minion.attack, 0);
      }
      const key = `${index}|${defenderSignature(remaining)}`;
      if (memo.has(key)) return memo.get(key);
      if (nodes >= REPLY_DISRUPTION_NODE_LIMIT) {
        return remaining.reduce((sum, minion) => sum + minion.attack, 0);
      }
      nodes += 1;
      const source = sources[index];
      const guards = remaining
        .map((minion, defenderIndex) => ({ minion, defenderIndex }))
        .filter((entry) => entry.minion.guard);
      const targets = source.spell || !guards.length
        ? remaining.map((minion, defenderIndex) => ({ minion, defenderIndex }))
        : guards;
      let leastRemaining = search(remaining, index + 1);
      targets
        .sort((left, right) => right.minion.attack - left.minion.attack)
        .forEach(({ defenderIndex }) => {
          leastRemaining = Math.min(
            leastRemaining,
            search(
              damageDefender(remaining, defenderIndex, source.amount),
              index + 1,
            ),
          );
        });
      memo.set(key, leastRemaining);
      return leastRemaining;
    }

    const remainingThreat = search(defenders, 0);
    return Math.max(0, originalThreat - Math.min(sweptThreat, remainingThreat));
  }

  function replyOutcome(state) {
    const aiHero = (state.heroes && state.heroes.ai) || {};
    const playerHero = (state.heroes && state.heroes.player) || {};
    const aiHealth = effectiveHealth(aiHero);
    const playerHealth = effectiveHealth(playerHero);
    const futureThreat = futureBoardDamage(state, AI_SIDE);
    let best = {
      score: 0,
      faceDamage: 0,
      lethal: false,
      deniedLethal: false,
      removedThreat: 0,
      clearCount: 0,
    };

    replyPlans(state).forEach((plan) => {
      const faceDamage = maxReplyFaceDamage(state, plan);
      const removedThreat = maxFutureThreatRemoved(state, plan);
      const remainingThreat = Math.max(0, futureThreat - removedThreat);
      const deniedByGuard = plan.guard > 0 && futureThreat >= playerHealth;
      const deniedLethal =
        futureThreat >= playerHealth &&
        (remainingThreat < playerHealth || deniedByGuard);
      const defenders = projectedDefenders(state, plan.sweep);
      const clearCount = Math.max(0, boardOf(state, AI_SIDE).length - defenders.length);
      let score = faceDamage * 1.18 + removedThreat * 0.62 + clearCount * 0.7;
      if (faceDamage >= aiHealth) score += 155;
      else if (faceDamage >= Math.max(1, aiHealth - 3)) score += 24;
      if (deniedLethal) score += 30;
      if (plan.guard > 0 && futureThreat >= Math.max(1, playerHealth - 3)) score += 8;
      if (score > best.score) {
        best = {
          score,
          faceDamage,
          lethal: faceDamage >= aiHealth,
          deniedLethal,
          removedThreat,
          clearCount,
        };
      }
    });
    return best;
  }

  function shouldSearchReplies(state, legalActions) {
    const aiHero = state.heroes && state.heroes.ai;
    const playerHero = state.heroes && state.heroes.player;
    if (effectiveHealth(aiHero) <= 16 || effectiveHealth(playerHero) <= 16) return true;
    if (enemyGuards(state, AI_SIDE).length || enemyGuards(state, PLAYER_SIDE).length) return true;
    if (futureBoardDamage(state, PLAYER_SIDE) >= effectiveHealth(aiHero) - 5) return true;
    if (futureBoardDamage(state, AI_SIDE) >= effectiveHealth(playerHero) - 5) return true;
    const hero = (state.heroes && state.heroes.ai) || {};
    const aiHand = handOf(state, AI_SIDE);
    const crowdedPivot =
      boardOf(state, AI_SIDE).length >= 3 || boardOf(state, PLAYER_SIDE).length >= 3;
    return legalActions.some((action) => {
      if (!action || action.type !== "playCard") return false;
      const card = aiHand[Number(action.handIndex)];
      const cost = finite(card && card.currentCost, finite(card && card.cost, 0));
      return (
        aiHand.length <= 1 ||
        (crowdedPivot && finite(hero.mana, 0) - cost <= 0)
      );
    });
  }

  function replySearchAdjustment(before, after, action, baseline) {
    if (!baseline || !after || after.phase === "ended" || after.turn !== AI_SIDE) return 0;
    const outcome = replyOutcome(after);
    let value = Math.max(-18, Math.min(18, (baseline.score - outcome.score) * 0.18));
    if (baseline.lethal && !outcome.lethal) value += 38;
    if (!baseline.lethal && outcome.lethal) value -= 88;
    if (outcome.deniedLethal && !baseline.deniedLethal) value -= 13;

    const beforeGuards = enemyGuards(before, PLAYER_SIDE).length;
    const afterGuards = enemyGuards(after, PLAYER_SIDE).length;
    const enemyHero = after.heroes && after.heroes.player;
    if (
      beforeGuards > afterGuards &&
      guaranteedTurnBurst(after, AI_SIDE) >= effectiveHealth(enemyHero)
    ) {
      value += 62;
    }

    if (action.type === "playCard") {
      const afterHero = (after.heroes && after.heroes.ai) || {};
      const spentLastMana = finite(afterHero.mana, 0) <= 0;
      const spentLastCard = handOf(after, AI_SIDE).length === 0;
      const addedGuard =
        enemyGuards(after, AI_SIDE).length > enemyGuards(before, AI_SIDE).length;
      if (
        (spentLastMana || spentLastCard) &&
        !addedGuard &&
        outcome.clearCount >= 3 &&
        outcome.clearCount > baseline.clearCount
      ) {
        value -= 11 + Math.min(8, outcome.clearCount * 1.5);
      }
      if ((spentLastMana || spentLastCard) && outcome.lethal && !addedGuard) value -= 8;
    }
    return Math.max(-118, Math.min(72, value));
  }

  function planningCardValue(card, state, side) {
    const cost = Math.max(0, finite(card && card.currentCost, finite(card && card.cost, 0)));
    let value = cost * 0.7 + attackOf(card) * 0.42 + healthOf(card) * 0.3;
    abilitiesOf(card).forEach((ability) => {
      value += abilityValue(ability) * 0.18;
    });
    const id = entityId(card);
    if (FINISHER_IDS.has(id)) value += 2.3;
    if (id === "wei_cao_cao") value += boardOf(state, side).length * 0.85;
    if (id === "wu_sun_quan" && hasCardInHand(state, side, "wei_cao_cao")) value += 2.2;
    if (id === "shu_zhuge_liang" && handOf(state, side).some((held) => FINISHER_IDS.has(entityId(held)))) {
      value += 1.8;
    }
    if (id === "wu_zhou_yu") {
      const enemy = side === AI_SIDE ? PLAYER_SIDE : AI_SIDE;
      const board = boardOf(state, enemy);
      const amount = finite(abilityByOp(card, "damage_all_enemies")?.amount, 0);
      value += board.filter((minion) => !hasShield(minion) && healthOf(minion) <= amount).length * 1.5;
    }
    if (id === "wu_lu_meng" && !oldExhaustedAllies(state, side).length) value -= 5;
    return Math.max(0, value);
  }

  function bestCurvePlan(state, side, manaBudget) {
    const mana = Math.max(0, Math.min(10, Math.floor(finite(manaBudget, 0))));
    const boardSlots = Math.max(0, 5 - boardOf(state, side).length);
    if (!mana || !boardSlots) return 0;
    const table = Array.from({ length: mana + 1 }, () =>
      Array.from({ length: boardSlots + 1 }, () => -Infinity),
    );
    table[0][0] = 0;
    handOf(state, side).forEach((card) => {
      const cost = Math.max(0, Math.floor(finite(card.currentCost, finite(card.cost, 0))));
      if (cost > mana) return;
      const value = planningCardValue(card, state, side);
      for (let spent = mana - cost; spent >= 0; spent -= 1) {
        for (let slots = boardSlots - 1; slots >= 0; slots -= 1) {
          if (!Number.isFinite(table[spent][slots])) continue;
          table[spent + cost][slots + 1] = Math.max(
            table[spent + cost][slots + 1],
            table[spent][slots] + value,
          );
        }
      }
    });
    let best = 0;
    table.forEach((row, spent) => row.forEach((value) => {
      if (!Number.isFinite(value)) return;
      const curveFit = spent === mana ? 1.8 : spent === mana - 1 ? 0.7 : 0;
      best = Math.max(best, value + curveFit);
    }));
    return best;
  }

  function planningDelta(before, after, action) {
    if (!after || after.phase === "ended" || after.turn !== AI_SIDE) return 0;
    const beforeHero = (before.heroes && before.heroes.ai) || {};
    const afterHero = (after.heroes && after.heroes.ai) || {};
    const nextMana = Math.min(10, Math.max(
      finite(beforeHero.maxMana, 0),
      finite(afterHero.maxMana, 0),
    ) + 1);
    const beforeNext = bestCurvePlan(before, AI_SIDE, nextMana);
    const afterNext = bestCurvePlan(after, AI_SIDE, nextMana);
    const remainingTurn = bestCurvePlan(after, AI_SIDE, finite(afterHero.mana, 0));
    let value = (afterNext - beforeNext) * 0.34 + remainingTurn * 0.72;

    const beforeEnemy = before.heroes && before.heroes.player;
    const afterEnemy = after.heroes && after.heroes.player;
    const beforeLethal =
      guaranteedTurnBurst(before, AI_SIDE) >= effectiveHealth(beforeEnemy);
    const afterLethal =
      guaranteedTurnBurst(after, AI_SIDE) >= effectiveHealth(afterEnemy);
    if (afterLethal) value += 115;
    if (beforeLethal && !afterLethal) value -= 140;

    if (action.type === "playCard") {
      const played = handOf(before, AI_SIDE)[Number(action.handIndex)];
      if (
        played &&
        FINISHER_IDS.has(entityId(played)) &&
        !afterLethal &&
        effectiveHealth(afterEnemy) > 16 &&
        boardOf(before, PLAYER_SIDE).length === 0 &&
        bestCurvePlan(before, AI_SIDE, Math.max(0, finite(beforeHero.mana, 0) - finite(played.currentCost, played.cost))) > 0
      ) {
        value -= 3.5;
      }
    }
    return value;
  }

  function abilityValue(ability) {
    if (!ability || !ability.op) return 0;
    const amount = Math.max(0, finite(ability.amount, finite(ability.count, 1)));
    const values = {
      damage_target: 2.25,
      damage_enemy_hero: 1.8,
      damage_random_enemy: 1.7,
      damage_all_enemies: 4.2,
      heal_friendly_hero: 1.05,
      draw: 3.2,
      gain_armor: 0.9,
      buff_target: 1.65,
      buff_friendly_board: 3.2,
      buff_adjacent: 2.2,
      buff_self: 1.25,
      summon_token: 3.1,
      reduce_random_hand_cost: 1.7,
      ready_random_friendly: 2.0,
    };
    let value = (values[ability.op] || 0.8) * amount;
    if (ability.attack || ability.health) {
      value += finite(ability.attack, 0) * 1.05 + finite(ability.health, 0) * 0.8;
    }
    if (ability.trigger === "onDeath") value *= 0.72;
    return value;
  }

  function minionValue(minion) {
    if (!minion) return 0;
    const attack = Math.max(0, finite(minion.currentAttack, finite(minion.attack, 0)));
    const health = Math.max(0, finite(minion.currentHealth, finite(minion.health, 0)));
    let value = attack * 1.72 + health * 1.18;
    if (hasShield(minion)) value += 2.6 + attack * 0.18;
    if (hasGuard(minion)) value += 1.7 + health * 0.16;
    if (minion.canAttack && finite(minion.attacksLeft, 0) > 0) value += attack * 0.38;
    abilitiesOf(minion).forEach((ability) => {
      if (ability.trigger === "onDeath") value += abilityValue(ability) * 0.38;
    });
    return value;
  }

  function handCardValue(card) {
    if (!card) return 0;
    const stats =
      Math.max(0, finite(card.attack, 0)) * 0.56 + Math.max(0, finite(card.health, 0)) * 0.4;
    let effects = 0;
    abilitiesOf(card).forEach((ability) => {
      effects += abilityValue(ability) * 0.32;
    });
    return Math.min(7.5, 0.7 + stats + effects);
  }

  function effectiveHealth(hero) {
    return finite(hero && hero.health, 0) + Math.max(0, finite(hero && hero.armor, 0));
  }

  function sideMaterial(state, side) {
    const hero = (state.heroes && state.heroes[side]) || {};
    const board = (state.boards && state.boards[side]) || [];
    const hand = (state.hands && state.hands[side]) || [];
    const deck = (state.decks && state.decks[side]) || [];
    let value = effectiveHealth(hero) * 2.3;
    value += Math.min(10, finite(hero.maxMana, 0)) * 0.12;
    value += Math.max(0, finite(hero.mana, 0)) * 0.05;
    value += Math.min(9, hand.length) * (side === PLAYER_SIDE ? 1.05 : 0.46);
    value += Math.min(12, deck.length) * 0.025;
    board.forEach((minion) => {
      value += minionValue(minion);
    });
    if (side === AI_SIDE) {
      hand.forEach((card) => {
        value += handCardValue(card) * 0.22;
      });
    }
    return value;
  }

  function incomingThreat(state, defender) {
    const attacker = defender === AI_SIDE ? PLAYER_SIDE : AI_SIDE;
    const board = (state.boards && state.boards[attacker]) || [];
    let total = 0;
    board.forEach((minion) => {
      if (minion.attackLockPending || minion.attackLockedThisTurn) return;
      total += Math.max(0, finite(minion.currentAttack, finite(minion.attack, 0)));
    });
    return total;
  }

  function stateScore(state) {
    if (!state || typeof state !== "object") return -WIN_SCORE;
    if (state.phase === "ended") {
      if (state.winner === AI_SIDE) return WIN_SCORE;
      if (state.winner === PLAYER_SIDE) return -WIN_SCORE;
      return 0;
    }

    let score = sideMaterial(state, AI_SIDE) - sideMaterial(state, PLAYER_SIDE);
    const aiHero = state.heroes && state.heroes.ai;
    const playerHero = state.heroes && state.heroes.player;
    const enemyThreat = incomingThreat(state, AI_SIDE);
    const friendlyThreat = incomingThreat(state, PLAYER_SIDE);

    if (enemyThreat >= effectiveHealth(aiHero)) score -= 90;
    if (friendlyThreat >= effectiveHealth(playerHero)) score += 72;
    if (effectiveHealth(aiHero) <= 8) score -= (9 - effectiveHealth(aiHero)) * 2.4;
    if (effectiveHealth(playerHero) <= 8) score += (9 - effectiveHealth(playerHero)) * 2.15;
    return score;
  }

  function targetEntity(state, target) {
    if (!state || !target || !target.side) return null;
    if (target.zone === "hero") {
      return state.heroes && state.heroes[target.side];
    }
    if (target.zone === "board") {
      const board = state.boards && state.boards[target.side];
      return board && board[Number(target.index)];
    }
    return null;
  }

  function commanderPowerText(state, action) {
    const hero = (state.heroes && state.heroes.ai) || {};
    const commander = (state.commanders && state.commanders.ai) || {};
    const registeredPower =
      (state.commanderPowers && state.commanderPowers.ai) || {};
    const values = [
      action.powerId,
      action.commanderPowerId,
      action.commanderId,
      action.id,
      action.op,
      action.name,
      action.power,
      action.effect,
      hero.commanderId,
      hero.commander,
      hero.powerId,
      hero.commanderPowerId,
      commander,
      registeredPower,
    ];
    const words = [];
    function collect(value, depth) {
      if (value == null || depth > 2) return;
      if (typeof value === "string" || typeof value === "number") {
        words.push(String(value).toLowerCase());
        return;
      }
      if (Array.isArray(value)) {
        value.slice(0, 8).forEach((item) => collect(item, depth + 1));
        return;
      }
      if (typeof value === "object") {
        [
          "id",
          "key",
          "name",
          "commanderId",
          "powerId",
          "commanderPowerId",
          "op",
          "kind",
          "effect",
          "text",
        ].forEach((key) => collect(value[key], depth + 1));
      }
    }
    values.forEach((value) => collect(value, 0));
    return words.join("|");
  }

  function commanderPowerKind(state, action) {
    const text = commanderPowerText(state, action);
    if (
      /cao[_ -]?cao|조조|heal|recover|restore|recovery|회복|재정비/.test(text)
    ) {
      return "heal";
    }
    if (
      /sun[_ -]?quan|손권|flood|water|수공|범람|damage[_ -]?all|sweep/.test(text)
    ) {
      return "flood";
    }
    if (
      /block|seal|suppress|disable|nomad|tribal|봉쇄|이민족|압박/.test(text)
    ) {
      return "blockade";
    }
    if (/liu[_ -]?bei|유비|passive|덕망/.test(text)) return "passive";
    if (action.target && action.target.zone === "board") return "blockade";
    return "unknown";
  }

  function commanderPowerAmount(action, fallback) {
    const candidates = [
      action.amount,
      action.damage,
      action.heal,
      action.value,
      action.power && action.power.amount,
      action.effect && action.effect.amount,
    ];
    for (let index = 0; index < candidates.length; index += 1) {
      const value = Number(candidates[index]);
      if (Number.isFinite(value) && value >= 0) return value;
    }
    return fallback;
  }

  function commanderPowerTactics(state, action) {
    const kind = commanderPowerKind(state, action);
    const aiHero = (state.heroes && state.heroes.ai) || {};
    const enemyBoard = boardOf(state, PLAYER_SIDE);
    if (kind === "heal") {
      const missing = Math.max(
        0,
        finite(aiHero.maxHealth, 30) - finite(aiHero.health, 0),
      );
      const amount = commanderPowerAmount(action, 1);
      const actual = Math.min(missing, amount);
      const threat = futureBoardDamage(state, PLAYER_SIDE);
      let value = actual * 1.8;
      if (!actual) value -= 13;
      if (threat >= effectiveHealth(aiHero) && actual > 0) value += 34;
      else if (effectiveHealth(aiHero) <= 10 && actual > 0) value += 7;
      return value;
    }
    if (kind === "flood") {
      const amount = commanderPowerAmount(action, 1);
      const enemyHero = (state.heroes && state.heroes.player) || {};
      if (amount >= effectiveHealth(enemyHero)) return WIN_SCORE * 0.32;
      const killable = enemyBoard.filter(
        (minion) => !hasShield(minion) && healthOf(minion) <= amount,
      );
      const removedAttack = killable.reduce(
        (sum, minion) => sum + attackOf(minion),
        0,
      );
      const shieldStrips = enemyBoard.filter(hasShield).length;
      if (!enemyBoard.length) return -16;
      return (
        enemyBoard.length * amount * 0.48 +
        killable.length * 5.6 +
        removedAttack * 0.75 +
        shieldStrips * 1.6
      );
    }
    if (kind === "blockade") {
      const target = targetEntity(state, action.target);
      if (
        !target ||
        !action.target ||
        action.target.zone !== "board" ||
        action.target.side !== PLAYER_SIDE
      ) {
        return -70;
      }
      const attack = attackOf(target);
      const threat = futureBoardDamage(state, PLAYER_SIDE);
      let value = attack * 1.65 + minionValue(target) * 0.38;
      if (attack <= 2) value -= 5.5;
      if (attack >= 5) value += 5;
      if (threat >= effectiveHealth(aiHero)) value += attack * 1.6 + 8;
      if (hasGuard(target)) value += 1.2;
      return value;
    }
    if (kind === "passive") return -100;
    return -4;
  }

  function boardEntityByIdentity(state, side, entity) {
    if (!entity) return null;
    const identity = entity.instanceId || entity.id;
    return boardOf(state, side).find(
      (candidate) => (candidate.instanceId || candidate.id) === identity,
    ) || null;
  }

  function commanderPowerResultTactics(before, after, action) {
    const kind = commanderPowerKind(before, action);
    if (kind === "heal") {
      const beforeHero = (before.heroes && before.heroes.ai) || {};
      const afterHero = (after.heroes && after.heroes.ai) || {};
      const actualHealing = Math.max(
        0,
        finite(afterHero.health, 0) - finite(beforeHero.health, 0),
      );
      const actualArmor = Math.max(
        0,
        finite(afterHero.armor, 0) - finite(beforeHero.armor, 0),
      );
      if (!actualHealing && !actualArmor) return -10;
      let value = actualHealing * 1.25 + actualArmor * 0.75;
      const threat = futureBoardDamage(before, PLAYER_SIDE);
      if (
        threat >= effectiveHealth(beforeHero) &&
        threat < effectiveHealth(afterHero)
      ) {
        value += 42;
      }
      return value;
    }
    if (kind === "flood") {
      const beforeBoard = boardOf(before, PLAYER_SIDE);
      let kills = 0;
      let removedAttack = 0;
      let damage = 0;
      let shields = 0;
      beforeBoard.forEach((minion) => {
        const survivor = boardEntityByIdentity(after, PLAYER_SIDE, minion);
        if (!survivor) {
          kills += 1;
          removedAttack += attackOf(minion);
          return;
        }
        damage += Math.max(0, healthOf(minion) - healthOf(survivor));
        if (hasShield(minion) && !hasShield(survivor)) shields += 1;
      });
      if (!kills && !damage && !shields) return -12;
      return kills * 6.5 + removedAttack * 0.85 + damage * 0.45 + shields * 1.8;
    }
    if (kind === "blockade") {
      const target = targetEntity(before, action.target);
      const survivor = boardEntityByIdentity(after, PLAYER_SIDE, target);
      if (!target) return -20;
      if (!survivor) return 8 + minionValue(target) * 0.65;
      const attackReduced = Math.max(0, attackOf(target) - attackOf(survivor));
      const disabled =
        (
          target.canAttack !== false &&
          (
            survivor.canAttack === false ||
            survivor.blocked ||
            survivor.suppressed ||
            survivor.cannotAttack ||
            survivor.commanderBlocked ||
            survivor.attackLockPending ||
            survivor.attackLockedThisTurn
          )
        ) ||
        finite(survivor.blockedTurns, 0) > finite(target.blockedTurns, 0);
      if (!disabled && !attackReduced) return -8;
      return attackOf(target) * (disabled ? 1.25 : 0.45) + attackReduced * 1.2;
    }
    return 0;
  }

  function attackTactics(state, action) {
    const board = boardOf(state, AI_SIDE);
    const attacker = board[Number(action.attackerIndex)];
    const target = targetEntity(state, action.target);
    if (!attacker || !target) return -120;
    const attack = attackOf(attacker);
    const attackerId = entityId(attacker);
    const attackerDeathValue = deathrattleValue(attacker, state);

    if (action.target.zone === "hero") {
      const health = effectiveHealth(target);
      if (attack >= health) return WIN_SCORE * 0.72;
      const enemyBoard = boardOf(state, PLAYER_SIDE);
      const totalReadyDamage = readyDamage(state, AI_SIDE);
      let value = attack * 1.05;
      if (!enemyBoard.length) value += 2.2;
      if (totalReadyDamage >= health) value += 80 + attack * 0.5;
      if (health <= 10) value += (11 - health) * 0.6;
      if (FINISHER_IDS.has(attackerId)) value += health <= 16 ? 4.2 : 1.2;
      if (enemyBoard.some((minion) => attackOf(minion) >= 5) && health > 12) {
        value -= 1.8;
      }
      return value;
    }

    const targetAttack = attackOf(target);
    const targetHealth = healthOf(target);
    const attackerHealth = healthOf(attacker);
    const removesShield = hasShield(target);
    const killsTarget = !removesShield && attack >= targetHealth;
    const attackerSurvives = hasShield(attacker) || targetAttack < attackerHealth;
    let value = hasGuard(target) ? 6.2 : 0;
    if (removesShield) {
      const otherReadyAttackers = board
        .filter((minion, index) => index !== Number(action.attackerIndex) && isReady(minion))
        .map(attackOf);
      const smallestAvailable = Math.min.apply(null, [attack].concat(otherReadyAttackers));
      value += 5.2 + targetAttack * 0.36;
      value -= Math.max(0, attack - smallestAvailable) * 1.45;
      if (FINISHER_IDS.has(attackerId) && otherReadyAttackers.length) value -= 8;
    }
    if (killsTarget && attackerSurvives) value += 10 + minionValue(target) * 0.62;
    else if (killsTarget) value += minionValue(target) - minionValue(attacker) * 0.62;
    else if (!attackerSurvives) value -= 9 + minionValue(attacker) * 0.42;
    else value += Math.min(attack, targetHealth) * 0.45;
    if (!attackerSurvives && attackerDeathValue > 0) {
      value += attackerDeathValue * (killsTarget ? 1.35 : 0.82);
      if (DEATH_VALUE_IDS.has(attackerId) && killsTarget) value += 2.2;
    }
    if (killsTarget && hasGuard(target)) {
      const remainingDamage = board.reduce((sum, minion, index) => {
        if (index === Number(action.attackerIndex) || !isReady(minion)) return sum;
        return sum + attackOf(minion);
      }, 0);
      const enemyHero = state.heroes && state.heroes.player;
      if (remainingDamage >= effectiveHealth(enemyHero)) value += 70;
      else if (remainingDamage && effectiveHealth(enemyHero) <= 12) value += remainingDamage * 0.8;
    }
    if (FINISHER_IDS.has(attackerId) && !killsTarget && !removesShield) value -= 6.5;
    if (attackerId === "shu_zhao_yun" && hasShield(attacker) && attackerSurvives) value += 1.8;
    if (targetAttack >= 5 && killsTarget) value += targetAttack * 0.42;
    return value;
  }

  function targetedPlayTactics(state, card, target) {
    if (!card || !target) return 0;
    const entity = targetEntity(state, target);
    if (!entity) return -80;
    const cardId = entityId(card);
    let value = 0;
    abilitiesOf(card).forEach((ability) => {
      const amount = Math.max(0, finite(ability.amount, 0));
      if (ability.op === "damage_target") {
        if (target.zone === "hero") {
          if (target.side === PLAYER_SIDE && amount >= effectiveHealth(entity)) {
            value += WIN_SCORE * 0.7;
          } else {
            value += target.side === PLAYER_SIDE ? amount * 1.1 : -amount * 2;
            if (
              target.side === PLAYER_SIDE &&
              !enemyGuards(state, PLAYER_SIDE).length &&
              readyDamage(state, AI_SIDE) + amount >= effectiveHealth(entity)
            ) {
              value += 68;
            }
          }
        } else {
          const targetHealth = healthOf(entity);
          const targetValue = minionValue(entity);
          const shielded = hasShield(entity);
          if (target.side === PLAYER_SIDE) {
            if (!shielded && amount >= targetHealth) {
              const exactBonus = amount === targetHealth ? 2.2 : 0;
              value += 10 + targetValue * 0.68 + exactBonus + attackOf(entity) * 0.45;
            } else if (shielded) {
              value += 2.2 + attackOf(entity) * 0.18;
              if (amount > 1) value -= (amount - 1) * 1.15;
            } else {
              value += amount * 0.3;
              if (targetHealth - amount >= 3) value -= 3.2;
            }
          } else if (!shielded && amount >= targetHealth) {
            value -= 24 + targetValue;
          } else {
            value -= amount * 1.6;
          }
        }
      } else if (ability.op === "buff_target") {
        const buff =
          finite(ability.attack, finite(ability.amount, 0)) * 1.1 +
          finite(ability.health, finite(ability.amount, 0)) * 0.85;
        value += target.side === AI_SIDE && target.zone === "board" ? buff : -20;
        if (target.side === AI_SIDE && entity.canAttack) value += finite(ability.attack, 0) * 0.65;
      }
    });
    if (
      (cardId === "shu_huang_zhong" || cardId === "wu_sun_shangxiang") &&
      target.side === PLAYER_SIDE &&
      target.zone === "board" &&
      !hasShield(entity) &&
      healthOf(entity) <= Math.max(
        0,
        finite(abilityByOp(card, "damage_target") && abilityByOp(card, "damage_target").amount, 0),
      )
    ) {
      value += cardId === "shu_huang_zhong" ? 3 : 2;
    }
    return value;
  }

  function playTactics(state, action, legalActions) {
    const hand = handOf(state, AI_SIDE);
    const card = hand[Number(action.handIndex)];
    if (!card) return -120;
    const hero = (state.heroes && state.heroes.ai) || {};
    const mana = Math.max(0, finite(hero.mana, 0));
    const cost = Math.max(0, finite(card.currentCost, finite(card.cost, 0)));
    const remaining = Math.max(0, mana - cost);
    const friendlyBoard = boardOf(state, AI_SIDE);
    const enemyBoard = boardOf(state, PLAYER_SIDE);
    const id = entityId(card);
    const enemyHero = (state.heroes && state.heroes.player) || {};
    const playableActions = playableCardActions(legalActions || []);
    const playableIds = new Set(
      playableActions.map((candidate) => entityId(hand[Number(candidate.handIndex)])),
    );

    let value = cost * 0.42;
    if (remaining === 0) value += 2.3;
    else if (remaining === 1) value += 0.8;
    if (friendlyBoard.length === 0) value += 1.3;
    if (friendlyBoard.length >= 4) value -= 1.1;

    abilitiesOf(card).forEach((ability) => {
      const amount = Math.max(0, finite(ability.amount, finite(ability.count, 1)));
      if (ability.op === "damage_all_enemies") {
        const killable = enemyBoard.filter(
          (minion) => !hasShield(minion) && healthOf(minion) <= amount,
        ).length;
        const shieldStrips = enemyBoard.filter(hasShield).length;
        const survivingThreat = enemyBoard.reduce((sum, minion) => {
          if (hasShield(minion) || healthOf(minion) <= amount) return sum;
          return sum + attackOf(minion);
        }, 0);
        value += enemyBoard.length * amount * 0.42 + killable * 5.2 + shieldStrips * 1.5;
        if (enemyBoard.length === 0) value -= 13;
        else if (killable === 0 && shieldStrips === 0 && survivingThreat < 5) value -= 4.2;
      } else if (ability.op === "heal_friendly_hero") {
        const missing = Math.max(
          0,
          finite(hero.maxHealth, 30) - finite(hero.health, 0),
        );
        value += Math.min(missing, amount) * 0.7;
        if (missing === 0) value -= amount * 0.45;
      } else if (ability.op === "gain_armor") {
        if (effectiveHealth(hero) <= 12) value += amount * 0.72;
      } else if (ability.op === "draw") {
        const handSpace = Math.max(0, 10 - hand.length);
        const deckSize = ((state.decks && state.decks.ai) || []).length;
        value += Math.min(handSpace, Math.max(1, finite(ability.count, amount))) * 1.45;
        if (!handSpace) value -= 5;
        if (!deckSize) value -= 4;
      } else if (ability.op === "buff_friendly_board") {
        value += friendlyBoard.length * 1.85;
        if (!friendlyBoard.length) value -= 2.8;
      } else if (ability.op === "buff_adjacent") {
        value += Math.min(2, friendlyBoard.length) * 1.25;
      } else if (ability.op === "summon_token") {
        const tokenSlots = Math.max(0, 4 - friendlyBoard.length);
        const summoned = Math.min(tokenSlots, Math.max(1, finite(ability.count, 1)));
        value += summoned * 2;
        if (!summoned) value -= 12;
        else if (summoned < Math.max(1, finite(ability.count, 1))) value -= 3.5;
      } else if (ability.op === "ready_random_friendly") {
        const eligible = friendlyBoard.filter(
          (minion) =>
            attackOf(minion) > 0 &&
            finite(minion.summonedTurn, -1) < finite(state.turnNumber, 0) &&
            finite(minion.attacksLeft, minion.canAttack ? 1 : 0) <= 0,
        );
        if (eligible.length) {
          const bestExtraAttack = Math.max.apply(null, eligible.map(attackOf));
          value += 4.2 + bestExtraAttack * 1.65;
        } else {
          value -= 18;
        }
      } else if (ability.op === "reduce_random_hand_cost") {
        const discountTargets = hand.filter(
          (candidate, index) =>
            index !== Number(action.handIndex) &&
            finite(candidate.currentCost, finite(candidate.cost, 0)) > 0,
        );
        value += discountTargets.length ? 2.2 : -5;
        if (discountTargets.some((candidate) => FINISHER_IDS.has(entityId(candidate)))) value += 2.7;
      }
    });

    if (id === "wu_sun_quan") {
      if (playableIds.has("wei_cao_cao") || hasCardInHand(state, AI_SIDE, "wei_cao_cao")) {
        value += Math.max(0, 4 - friendlyBoard.length) * 1.25 + 3.5;
      }
    } else if (id === "wei_cao_cao") {
      const sunQuanPlayable = playableIds.has("wu_sun_quan");
      if (sunQuanPlayable && friendlyBoard.length <= 2 && mana >= 10) value -= 15;
      if (friendlyBoard.length >= 3) value += friendlyBoard.length * 1.4;
    } else if (id === "wu_lu_meng") {
      const eligible = friendlyBoard.filter(
        (minion) =>
          attackOf(minion) > 0 &&
          finite(minion.summonedTurn, -1) < finite(state.turnNumber, 0) &&
          finite(minion.attacksLeft, minion.canAttack ? 1 : 0) <= 0,
      );
      if (!eligible.length) value -= 6;
    } else if (id === "wu_zhou_yu") {
      if (enemyBoard.length >= 3) value += 4.5;
      if (!enemyBoard.length) value -= 4;
    } else if (id === "shu_zhuge_liang") {
      const highCostTargets = hand.filter(
        (candidate, index) =>
          index !== Number(action.handIndex) &&
          finite(candidate.currentCost, finite(candidate.cost, 0)) >= 6,
      ).length;
      value += Math.min(2, highCostTargets) * 1.35;
    } else if (id === "wei_sima_yi") {
      if (!enemyBoard.length) value += effectiveHealth(enemyHero) <= 8 ? 3.2 : 0.7;
      if (effectiveHealth(hero) <= 12) value += 3.5;
    } else if (id === "shu_liu_bei") {
      const missing = Math.max(0, finite(hero.maxHealth, 30) - finite(hero.health, 0));
      if (!missing && mana > 2) value -= 1.2;
    }

    if (FINISHER_IDS.has(id)) {
      const guards = enemyGuards(state, PLAYER_SIDE);
      const chargeDamage = keywordList(card).includes("돌진") ? Math.max(0, finite(card.attack, 0)) : 0;
      if (!guards.length && chargeDamage >= effectiveHealth(enemyHero)) value += WIN_SCORE * 0.3;
      else if (!guards.length && effectiveHealth(enemyHero) <= 14) value += chargeDamage * 0.72;
      if (id === "wu_zhou_yu" && !enemyBoard.length && effectiveHealth(enemyHero) > 10) {
        value -= 3;
      }
    }

    const targetedDamage = abilityByOp(card, "damage_target");
    if (
      targetedDamage &&
      action.target &&
      action.target.zone === "hero" &&
      action.target.side === PLAYER_SIDE &&
      effectiveHealth(enemyHero) > 12 &&
      finite(targetedDamage.amount, 0) < effectiveHealth(enemyHero) &&
      playableActions.some(
        (candidate) => Number(candidate.handIndex) !== Number(action.handIndex),
      )
    ) {
      value -= 2.5 + finite(targetedDamage.amount, 0) * 1.1;
    }

    value += targetedPlayTactics(state, card, action.target);
    return value;
  }

  function tacticalScore(state, action, legalActions) {
    if (action.type === "attack") return attackTactics(state, action);
    if (action.type === "playCard") return playTactics(state, action, legalActions);
    if (action.type === COMMANDER_POWER_ACTION) {
      return commanderPowerTactics(state, action);
    }
    if (action.type === "endTurn") {
      const alternatives = legalActions.filter((candidate) => candidate.type !== "endTurn");
      if (!alternatives.length) return 3;
      const playable = alternatives.some((candidate) => candidate.type === "playCard");
      const attackable = alternatives.some((candidate) => candidate.type === "attack");
      return -7 - (playable ? 2 : 0) - (attackable ? 3 : 0);
    }
    return -200;
  }

  function immediateLethalCandidate(state, action) {
    const enemyHero = state.heroes && state.heroes.player;
    const enemyHealth = effectiveHealth(enemyHero);
    if (action.type === "attack" && action.target && action.target.zone === "hero") {
      const attacker = boardOf(state, AI_SIDE)[Number(action.attackerIndex)];
      return attackOf(attacker) >= enemyHealth;
    }
    if (action.type === COMMANDER_POWER_ACTION) {
      return (
        commanderPowerKind(state, action) === "flood" &&
        commanderPowerAmount(action, 1) >= enemyHealth
      );
    }
    if (action.type !== "playCard") return false;
    const card = handOf(state, AI_SIDE)[Number(action.handIndex)];
    if (!card) return false;
    let direct = 0;
    abilitiesOf(card).forEach((ability) => {
      if (!ability || ability.trigger !== "onPlay") return;
      if (
        ability.op === "damage_enemy_hero" ||
        (
          ability.op === "damage_target" &&
          action.target &&
          action.target.zone === "hero" &&
          action.target.side === PLAYER_SIDE
        ) ||
        (
          ability.op === "damage_random_enemy" &&
          boardOf(state, PLAYER_SIDE).length === 0
        )
      ) {
        direct += Math.max(0, finite(ability.amount, 0));
      }
    });
    if (
      keywordList(card).includes("돌진") &&
      enemyGuards(state, PLAYER_SIDE).length === 0
    ) {
      direct += attackOf(card);
    }
    if (
      action.target &&
      action.target.zone === "hero" &&
      action.target.side === PLAYER_SIDE
    ) {
      direct += readyDamage(state, AI_SIDE);
    }
    return direct >= enemyHealth;
  }

  function requiredDefenseCandidate(state, action) {
    const aiHero = state.heroes && state.heroes.ai;
    const incoming = futureBoardDamage(state, PLAYER_SIDE);
    if (incoming < Math.max(1, effectiveHealth(aiHero) - 5)) return false;
    if (action.type === COMMANDER_POWER_ACTION) {
      const kind = commanderPowerKind(state, action);
      if (kind === "heal" || kind === "flood") return true;
      if (kind === "blockade") {
        const target = targetEntity(state, action.target);
        return target && attackOf(target) >= 3;
      }
      return false;
    }
    if (action.type === "attack" && action.target && action.target.zone === "board") {
      const target = targetEntity(state, action.target);
      const attacker = boardOf(state, AI_SIDE)[Number(action.attackerIndex)];
      return (
        target &&
        (
          attackOf(target) >= 3 ||
          hasGuard(target) ||
          (!hasShield(target) && attackOf(attacker) >= healthOf(target))
        )
      );
    }
    if (action.type !== "playCard") return false;
    const card = handOf(state, AI_SIDE)[Number(action.handIndex)];
    if (!card) return false;
    if (hasGuard(card)) return true;
    return abilitiesOf(card).some((ability) => {
      if (!ability || ability.trigger !== "onPlay") return false;
      if (
        ability.op === "heal_friendly_hero" ||
        ability.op === "gain_armor" ||
        ability.op === "damage_all_enemies"
      ) {
        return true;
      }
      if (
        ability.op === "damage_target" &&
        action.target &&
        action.target.zone === "board" &&
        action.target.side === PLAYER_SIDE
      ) {
        const target = targetEntity(state, action.target);
        return target && finite(ability.amount, 0) >= healthOf(target);
      }
      return false;
    });
  }

  function boundedSimulationCandidates(state, legalActions, salt) {
    if (legalActions.length <= FULL_SIMULATION_TARGET) return legalActions.slice();
    const ranked = legalActions
      .map((action) => {
        const key = actionKey(action);
        return {
          action,
          key,
          score: tacticalScore(state, action, legalActions),
          tie: hashText(`${salt}|cheap|${key}`),
        };
      })
      .sort((left, right) => {
        if (Math.abs(left.score - right.score) > SCORE_EPSILON) {
          return right.score - left.score;
        }
        if (left.tie !== right.tie) return left.tie - right.tie;
        return left.key < right.key ? -1 : left.key > right.key ? 1 : 0;
      });
    const selected = new Map();
    const add = (candidate) => {
      if (candidate) selected.set(candidate.key, candidate.action);
    };
    let capacity = FULL_SIMULATION_TARGET;
    const addBest = (filter, limit) => {
      let added = 0;
      for (
        let index = 0;
        index < ranked.length && added < limit && selected.size < capacity;
        index += 1
      ) {
        const candidate = ranked[index];
        if (!filter(candidate.action) || selected.has(candidate.key)) continue;
        add(candidate);
        added += 1;
      }
    };

    ranked.forEach((candidate) => {
      const action = candidate.action;
      if (action.type === "endTurn" || immediateLethalCandidate(state, action)) add(candidate);
      else if (
        action.type === "attack" &&
        action.target &&
        action.target.zone === "hero"
      ) {
        add(candidate);
      }
    });
    capacity = Math.max(
      FULL_SIMULATION_TARGET,
      Math.min(FULL_SIMULATION_HARD_LIMIT, selected.size),
    );
    addBest((action) => {
      if (!action.target || action.target.zone !== "board") return false;
      const target = targetEntity(state, action.target);
      return target && hasGuard(target);
    }, 4);
    addBest((action) => requiredDefenseCandidate(state, action), 3);
    addBest((action) => action.type === COMMANDER_POWER_ACTION, 3);

    const bestTargetedByCard = new Map();
    ranked.forEach((candidate) => {
      const action = candidate.action;
      if (action.type !== "playCard" || !action.target) return;
      const handIndex = Number(action.handIndex);
      if (!bestTargetedByCard.has(handIndex)) bestTargetedByCard.set(handIndex, candidate);
    });
    bestTargetedByCard.forEach((candidate) => {
      if (selected.size < FULL_SIMULATION_TARGET) add(candidate);
    });
    ranked.forEach((candidate) => {
      if (selected.size < FULL_SIMULATION_TARGET) add(candidate);
    });

    return Array.from(selected.values());
  }

  function simulatedState(simulate, action) {
    if (typeof simulate !== "function") return null;
    try {
      const result = simulate(clone(action));
      if (!result) return null;
      if (typeof result.getState === "function") {
        return { state: result.getState(), valid: true };
      }
      if (result.state && result.state.heroes) {
        return { state: result.state, valid: result.ok !== false };
      }
      if (result.heroes && result.boards) return { state: result, valid: true };
    } catch {
      return null;
    }
    return null;
  }

  function evaluateCandidate(context, state, action, legalActions, salt, replyBaseline) {
    const before = stateScore(state);
    const simulation = simulatedState(context.simulate, action);
    if (!simulation || !simulation.state) {
      return {
        action,
        key: actionKey(action),
        score: -WIN_SCORE * 0.8,
        valid: false,
        lethal: false,
        tie: 0,
      };
    }
    const after = simulation.state;

    const unchanged =
      stateSignature(after, true) === stateSignature(state, true) && action.type !== "endTurn";
    let score = stateScore(after) - before;
    score += tacticalScore(state, action, legalActions);
    score += planningDelta(state, after, action);
    if (action.type === COMMANDER_POWER_ACTION) {
      score += commanderPowerResultTactics(state, after, action);
    }
    score += replySearchAdjustment(state, after, action, replyBaseline);
    if (unchanged) score -= 50000;
    if (after.phase === "ended" && after.winner === AI_SIDE) score += WIN_SCORE;
    if (after.phase === "ended" && after.winner === PLAYER_SIDE) score -= WIN_SCORE;
    if (action.type === "endTurn" && after.turn === PLAYER_SIDE) {
      const threat = incomingThreat(after, AI_SIDE);
      const aiHealth = effectiveHealth(after.heroes && after.heroes.ai);
      if (threat >= aiHealth) score -= 220;
    }
    const key = actionKey(action);
    return {
      action,
      key,
      score,
      valid: simulation.valid && !unchanged,
      lethal: after.phase === "ended" && after.winner === AI_SIDE,
      tie: hashText(`${salt}|${key}`),
    };
  }

  function compareCandidates(left, right) {
    if (Math.abs(left.score - right.score) > SCORE_EPSILON) return right.score - left.score;
    if (left.tie !== right.tie) return left.tie - right.tie;
    return left.key < right.key ? -1 : left.key > right.key ? 1 : 0;
  }

  function createAI(configuration) {
    const config = configuration || {};
    const salt = resolveSalt(config.rng);
    const replySearchEnabled = config.replySearch !== false;
    const repeatedChoices = new Map();

    function earlyTurn(state) {
      const hero = state && state.heroes && state.heroes.ai;
      if (hero && Number.isFinite(Number(hero.maxMana))) {
        return Number(hero.maxMana) <= 4;
      }
      return finite(state && state.turnNumber, 99) <= 8;
    }

    function selectEarlyCandidate(ranked, signature, history) {
      const lethal = ranked.find(
        (candidate) => candidate.valid && candidate.lethal && !history.has(candidate.key),
      );
      if (lethal) return lethal;

      const fresh = ranked.filter(
        (candidate) =>
          candidate.valid &&
          candidate.action.type !== "endTurn" &&
          !history.has(candidate.key),
      );
      if (!fresh.length) return null;
      const bestScore = fresh[0].score;
      const pool = fresh
        .filter((candidate) => candidate.score >= bestScore - 3.5)
        .slice(0, 3);
      if (pool.length <= 1) return pool[0] || null;

      const roll = hashText(`${salt}|opening|${signature}`) / 4294967296;
      if (pool.length === 2) return roll < 0.64 ? pool[0] : pool[1];
      if (roll < 0.52) return pool[0];
      if (roll < 0.82) return pool[1];
      return pool[2];
    }

    function chooseAction(context) {
      const request = context || {};
      const state = request.state;
      if (!state || state.phase === "ended" || state.turn !== AI_SIDE) return null;

      const legalActions = Array.isArray(request.legalActions)
        ? request.legalActions.filter(
            (action) => action && typeof action === "object" && action.side === AI_SIDE,
          )
        : [];
      if (!legalActions.length) return null;

      const signature = stateSignature(state);
      let history = repeatedChoices.get(signature);
      if (!history) {
        history = new Set();
        repeatedChoices.set(signature, history);
        if (repeatedChoices.size > 48) {
          const oldest = repeatedChoices.keys().next().value;
          repeatedChoices.delete(oldest);
        }
      }

      const replyBaseline =
        replySearchEnabled && shouldSearchReplies(state, legalActions)
          ? replyOutcome(state)
          : null;
      const simulationActions = boundedSimulationCandidates(state, legalActions, salt);
      const ranked = simulationActions
        .map((action) =>
          evaluateCandidate(request, state, action, legalActions, salt, replyBaseline),
        )
        .sort(compareCandidates);
      const endTurn = ranked.find((candidate) => candidate.action.type === "endTurn");
      const openingChoice = earlyTurn(state)
        ? selectEarlyCandidate(ranked, signature, history)
        : null;
      const fresh =
        openingChoice ||
        ranked.find((candidate) => candidate.valid && !history.has(candidate.key));
      const selected =
        (endTurn && history.has(endTurn.key) ? endTurn : null) ||
        fresh ||
        endTurn ||
        ranked.find((candidate) => candidate.valid) ||
        ranked[0];
      if (!selected) return null;
      if (
        !endTurn &&
        selected.valid &&
        !selected.lethal &&
        selected.action.type !== "endTurn" &&
        selected.score < -6
      ) {
        return null;
      }

      history.add(selected.key);
      return clone(selected.action);
    }

    return {
      chooseAction,
    };
  }

  root.TK = root.TK || {};
  root.TK.modules = root.TK.modules || {};
  root.TK.modules.opponentAI = {
    createAI,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
