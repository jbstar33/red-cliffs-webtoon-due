import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

async function loadBrowserModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  vm.runInThisContext(source, { filename: relativePath });
}

function deterministicRng(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function chooseHumanHeuristic(state, side, legalActions) {
  const attacks = legalActions.filter((action) => action.type === "attack");
  const lethal = attacks.find(
    (action) =>
      action.target.zone === "hero" &&
      state.boards[side][action.attackerIndex].currentAttack >=
        state.heroes[action.target.side].health +
          state.heroes[action.target.side].armor,
  );
  if (lethal) return lethal;

  const favorableTrade = attacks.find((action) => {
    if (action.target.zone !== "board") return false;
    const attacker = state.boards[side][action.attackerIndex];
    const defender = state.boards[action.target.side][action.target.index];
    return (
      attacker.currentAttack >= defender.currentHealth &&
      attacker.currentHealth > defender.currentAttack
    );
  });
  if (favorableTrade) return favorableTrade;

  const powers = legalActions.filter(
    (action) => action.type === "USE_COMMANDER_POWER",
  );
  const commander = state.commanders?.[side];
  if (
    commander?.id === "caocao" &&
    state.heroes[side].health < state.heroes[side].maxHealth
  ) {
    return powers[0];
  }
  if (commander?.id === "sunquan" && powers.length) return powers[0];
  if (commander?.id === "nomad" && powers.length) {
    return powers
      .slice()
      .sort((left, right) => {
        const leftMinion = state.boards[left.target.side][left.target.index];
        const rightMinion = state.boards[right.target.side][right.target.index];
        return rightMinion.currentAttack - leftMinion.currentAttack;
      })[0];
  }

  const highestCostPlay = legalActions
    .filter((action) => action.type === "playCard")
    .slice()
    .sort((left, right) => {
      const leftCard = state.hands[side][left.handIndex];
      const rightCard = state.hands[side][right.handIndex];
      return rightCard.currentCost - leftCard.currentCost;
    })[0];
  return (
    highestCostPlay ||
    attacks.find((action) => action.target.zone === "board") ||
    attacks.find((action) => action.target.zone === "hero") ||
    null
  );
}

test("80 four-faction strategist PvE matches finish and exercise all 27 cards", async () => {
  globalThis.TK = { modules: {} };
  await loadBrowserModule("../public/systems/card-data/index.js");
  await loadBrowserModule("../public/systems/rules-engine/index.js");
  await loadBrowserModule("../public/systems/opponent-ai/index.js");

  const cards = TK.modules.cardData;
  const rules = TK.modules.rulesEngine;
  const ai = TK.modules.opponentAI;
  const playCounts = Object.fromEntries(
    cards.getCards().map((card) => [card.id, 0]),
  );
  const winners = { player: 0, ai: 0, draw: 0 };
  let totalActions = 0;
  let totalTurns = 0;
  const commanders = ["caocao", "liubei", "sunquan", "nomad"];
  const matches = 80;

  for (let seed = 0; seed < matches; seed += 1) {
    const playerCommander = commanders[seed % commanders.length];
    const aiCommander = commanders[(seed + 1 + Math.floor(seed / 4)) % commanders.length];
    const game = rules.createGame({
      definitions: cards.getCards(),
      tokens: cards.getTokens(),
      playerDeck: cards.buildDeck(`balance-player-${seed}`, playerCommander),
      aiDeck: cards.buildDeck(`balance-ai-${seed}`, aiCommander),
      commanders: { player: playerCommander, ai: aiCommander },
      seed: `balance-match-${seed}`,
      emit() {},
    });
    const brain = ai.createAI({ rng: deterministicRng(seed * 2 + 2) });
    let actions = 0;
    let turns = 1;

    while (game.getState().phase === "playing" && actions < 700) {
      const state = game.getState();
      const side = state.turn;
      const legalActions = game
        .getLegalActions(side)
        .filter((action) => action.type !== "endTurn");
      const choice = side === "ai"
        ? brain.chooseAction({
            state,
            legalActions,
            simulate(action) {
              const clone = game.cloneForSimulation();
              clone.applyAction(action);
              return clone.getState();
            },
            difficulty: "strategist",
          })
        : chooseHumanHeuristic(state, side, legalActions);
      const action = choice || { type: "endTurn", side };

      if (action.type === "playCard") {
        const card = state.hands[side][action.handIndex];
        if (card && playCounts[card.id] !== undefined) {
          playCounts[card.id] += 1;
        }
      } else if (action.type === "endTurn") {
        turns += 1;
      }

      const result = game.applyAction(action);
      assert.notEqual(
        result?.ok,
        false,
        `seed ${seed}: ${result?.error || "AI chose an illegal action"}`,
      );
      actions += 1;
    }

    const finalState = game.getState();
    assert.equal(finalState.phase, "ended", `seed ${seed} did not finish`);
    assert.ok(actions < 700, `seed ${seed} exceeded the action budget`);
    winners[finalState.winner] += 1;
    totalActions += actions;
    totalTurns += turns;
  }

  const unplayedCards = Object.entries(playCounts)
    .filter(([, count]) => count === 0)
    .map(([id]) => id);

  const metrics = {
    matches,
    winners,
    averageActions: Number((totalActions / matches).toFixed(1)),
    averageTurns: Number((totalTurns / matches).toFixed(1)),
    unplayedCards,
    leastPlayed: Object.entries(playCounts)
      .sort((left, right) => left[1] - right[1])
      .slice(0, 5),
    mostPlayed: Object.entries(playCounts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5),
  };

  assert.ok(metrics.averageTurns >= 8, "matches end before strategic play develops");
  assert.ok(metrics.averageTurns <= 40, "matches drag on too long");
  console.log(JSON.stringify(metrics));
  assert.deepEqual(unplayedCards, [], "every card should appear in live play");
});
