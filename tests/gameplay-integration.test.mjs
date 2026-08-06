import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

async function loadBrowserModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  vm.runInThisContext(source, { filename: relativePath });
}

test("60 cards produce a complete, deterministic 20-card faction PvE battle", async () => {
  globalThis.TK = { modules: {} };
  await loadBrowserModule("../public/systems/card-data/index.js");
  await loadBrowserModule("../public/systems/rules-engine/index.js");

  const cards = TK.modules.cardData;
  const rules = TK.modules.rulesEngine;
  const validation = cards.validate();
  assert.equal(validation.ok, true, validation.errors.join("\n"));
  assert.equal(cards.getCards().length, 60);
  assert.equal(cards.buildDeck("integration-player", "liubei").length, 20);

  const game = rules.createGame({
    definitions: cards.getCards(),
    tokens: cards.getTokens(),
    playerDeck: cards.buildDeck("integration-player", "liubei"),
    aiDeck: cards.buildDeck("integration-ai", "sunquan"),
    commanders: { player: "liubei", ai: "sunquan" },
    seed: "integration-game",
    emit() {},
  });

  let actions = 0;
  while (game.getState().phase === "playing" && actions < 600) {
    const state = game.getState();
    const legal = game.getLegalActions(state.turn);
    const attacks = legal.filter((action) => action.type === "attack");
    const lethal = attacks.find(
      (action) =>
        action.target.zone === "hero" &&
        state.boards[state.turn][action.attackerIndex].currentAttack >=
          state.heroes[action.target.side].health +
            state.heroes[action.target.side].armor,
    );
    const plays = legal.filter((action) => action.type === "playCard");
    const commanderPower = legal.find(
      (action) => action.type === "USE_COMMANDER_POWER",
    );
    const action =
      lethal ||
      attacks.find((candidate) => candidate.target.zone === "board") ||
      commanderPower ||
      attacks.find((candidate) => candidate.target.zone === "hero") ||
      plays[0] ||
      legal.find((candidate) => candidate.type === "endTurn");

    assert.ok(action, "a playing state must always have an end-turn action");
    const result = game.applyAction(action);
    assert.notEqual(result?.ok, false, result?.error || "legal action failed");
    actions += 1;
  }

  const finalState = game.getState();
  assert.equal(finalState.phase, "ended");
  assert.ok(["player", "ai", "draw"].includes(finalState.winner));
  assert.ok(actions < 600, "battle should terminate without an action loop");
});

test("strategist AI completes a full rules-engine match without illegal actions", async () => {
  globalThis.TK = { modules: {} };
  await loadBrowserModule("../public/systems/card-data/index.js");
  await loadBrowserModule("../public/systems/rules-engine/index.js");
  await loadBrowserModule("../public/systems/opponent-ai/index.js");

  const cards = TK.modules.cardData;
  const game = TK.modules.rulesEngine.createGame({
    definitions: cards.getCards(),
    tokens: cards.getTokens(),
    playerDeck: cards.buildDeck("ai-vs-ai-player", "caocao"),
    aiDeck: cards.buildDeck("ai-vs-ai-opponent", "nomad"),
    commanders: { player: "caocao", ai: "nomad" },
    seed: "ai-vs-ai-rules",
    emit() {},
  });
  const brain = TK.modules.opponentAI.createAI({ rng: () => 0.314159 });
  let actions = 0;

  while (game.getState().phase === "playing" && actions < 600) {
    const state = game.getState();
    const playable = game
      .getLegalActions(state.turn)
      .filter((action) => action.type !== "endTurn");
    const choice = brain.chooseAction({
      state,
      legalActions: playable,
      simulate(action) {
        const clone = game.cloneForSimulation();
        clone.applyAction(action);
        return clone.getState();
      },
      difficulty: "strategist",
    });
    const action = choice || { type: "endTurn", side: state.turn };
    const result = game.applyAction(action);
    assert.notEqual(result?.ok, false, result?.error || "AI chose an illegal action");
    actions += 1;
  }

  assert.equal(game.getState().phase, "ended");
  assert.ok(actions < 600);
});

test("systems stay isolated behind the global context registry", async () => {
  const systemPaths = [
    "../public/systems/card-data/index.js",
    "../public/systems/rules-engine/index.js",
    "../public/systems/opponent-ai/index.js",
    "../public/systems/audio/index.js",
    "../public/systems/fx-animation/index.js",
    "../public/systems/board-ui/index.js",
  ];

  for (const path of systemPaths) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\b(?:import|require)\s*(?:\(|["'])/);
    assert.match(source, /TK\.modules|modules\[/);
  }
});
