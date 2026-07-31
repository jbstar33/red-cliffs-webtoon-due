"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const sandbox = { globalThis: { TK: { modules: {} } } };
vm.createContext(sandbox);
[
  path.join(__dirname, "..", "card-data", "index.js"),
  path.join(__dirname, "..", "rules-engine", "index.js"),
  path.join(__dirname, "index.js"),
].forEach((file) => {
  vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
});

const modules = sandbox.globalThis.TK.modules;
const definitions = modules.cardData.getCards();
const commanderIds = ["caocao", "liubei", "sunquan", "nomad"];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function attackOf(entity) {
  return Math.max(0, Number(entity && (entity.currentAttack ?? entity.attack) || 0));
}

function healthOf(entity) {
  return Math.max(0, Number(entity && (entity.currentHealth ?? entity.health) || 0));
}

function effectiveHealth(hero) {
  return Number(hero && hero.health || 0) + Number(hero && hero.armor || 0);
}

function actionKey(action) {
  return JSON.stringify(action);
}

function simulateAction(game, action) {
  const copy = game.cloneForSimulation();
  const result = copy.applyAction(clone(action));
  return { ok: result && result.ok !== false, state: copy.getState() };
}

function fairPlayerChoice(game, salt) {
  const state = game.getState();
  const actions = game.getLegalActions("player");
  let best = null;
  actions.forEach((action) => {
    let score = -20;
    if (action.type === "attack") {
      const attacker = state.boards.player[action.attackerIndex];
      const power = attackOf(attacker);
      if (action.target.zone === "hero") {
        score = power * 1.2;
        if (power >= effectiveHealth(state.heroes.ai)) score += 1000000;
      } else {
        const target = state.boards.ai[action.target.index];
        const kills = target && !target.shield && power >= healthOf(target);
        const survives =
          attacker && (attacker.shield || attackOf(target) < healthOf(attacker));
        score =
          (kills ? attackOf(target) + healthOf(target) + 6 : power * 0.2) +
          (survives ? 2.5 : -attackOf(attacker) * 0.35);
      }
    } else if (action.type === "playCard") {
      const card = state.hands.player[action.handIndex];
      score =
        Number(card.currentCost || card.cost || 0) * 0.65 +
        attackOf(card) * 0.75 +
        healthOf(card) * 0.5;
      (card.abilities || []).forEach((ability) => {
        if (ability.op === "damage_target" && action.target) {
          if (action.target.zone === "hero") {
            score += Number(ability.amount || 0);
            if (Number(ability.amount || 0) >= effectiveHealth(state.heroes.ai)) {
              score += 1000000;
            }
          } else {
            const target = state.boards.ai[action.target.index];
            if (
              target &&
              !target.shield &&
              Number(ability.amount || 0) >= healthOf(target)
            ) {
              score += attackOf(target) + healthOf(target) + 5;
            }
          }
        } else if (ability.op === "damage_all_enemies") {
          score += state.boards.ai.length * Number(ability.amount || 0);
        } else {
          score += 0.8;
        }
      });
    } else if (action.type === "USE_COMMANDER_POWER") {
      if (action.commanderId === "caocao") {
        score = state.heroes.player.maxHealth - state.heroes.player.health > 0 ? 5 : -5;
      } else if (action.commanderId === "sunquan") {
        score = 1.2 + state.boards.ai.length * 2.4;
      } else if (action.commanderId === "nomad") {
        const target = state.boards.ai[action.target.index];
        score = target ? attackOf(target) * 1.7 : -10;
      }
    }
    const tie = crypto
      .createHash("sha1")
      .update(`${salt}|${actionKey(action)}`)
      .digest("hex");
    const candidate = { action, score, tie };
    if (
      !best ||
      candidate.score > best.score ||
      (candidate.score === best.score && candidate.tie < best.tie)
    ) {
      best = candidate;
    }
  });
  return best && clone(best.action);
}

function createMetrics() {
  return {
    illegal: 0,
    decisions: 0,
    durations: [],
    maxSimulations: 0,
    powerUses: { caocao: 0, liubei: 0, sunquan: 0, nomad: 0 },
  };
}

function runGame(index, metrics, measure) {
  const game = modules.rulesEngine.createGame({
    definitions,
    tokens: modules.cardData.getTokens(),
    playerDeck: modules.cardData.buildDeck(`commander-player-${index}`),
    aiDeck: modules.cardData.buildDeck(`commander-ai-${index}`),
    commanders: {
      player: commanderIds[(index + 1) % commanderIds.length],
      ai: commanderIds[index % commanderIds.length],
    },
    seed: `commander-game-${index}`,
  });
  const brain = modules.opponentAI.createAI({ rng: `commander-brain-${index}` });
  const stream = [];
  let actionCount = 0;

  while (game.getState().phase === "playing" && actionCount < 260) {
    const state = game.getState();
    const legalActions = game.getLegalActions(state.turn);
    let action;
    if (state.turn === "ai") {
      let simulations = 0;
      const started = process.hrtime.bigint();
      action = brain.chooseAction({
        state,
        legalActions,
        simulate(candidate) {
          simulations += 1;
          return simulateAction(game, candidate);
        },
        difficulty: "strategist",
      });
      if (measure) {
        metrics.decisions += 1;
        metrics.durations.push(
          Number(process.hrtime.bigint() - started) / 1000000,
        );
        metrics.maxSimulations = Math.max(metrics.maxSimulations, simulations);
      }
    } else {
      action = fairPlayerChoice(game, index + actionCount);
    }
    assert(action, `commander game ${index}: ${state.turn} must act`);
    const legal = legalActions.some(
      (candidate) => actionKey(candidate) === actionKey(action),
    );
    if (!legal && measure) metrics.illegal += 1;
    assert(legal, `commander game ${index}: selected action must be legal`);
    if (measure && state.turn === "ai" && action.type === "USE_COMMANDER_POWER") {
      metrics.powerUses[action.commanderId] += 1;
    }
    stream.push(actionKey(action));
    const result = game.applyAction(action);
    if ((!result || result.ok === false) && measure) metrics.illegal += 1;
    assert(result && result.ok !== false, `commander game ${index}: action rejected`);
    actionCount += 1;
  }
  const finalState = game.getState();
  assert.strictEqual(finalState.phase, "ended", `commander game ${index} must finish`);
  return crypto
    .createHash("sha256")
    .update(stream.join("\n"))
    .update(`|${finalState.winner}|${finalState.turnNumber}`)
    .digest("hex");
}

const metrics = createMetrics();
const GAMES = 32;
for (let index = 0; index < GAMES; index += 1) {
  const first = runGame(index, metrics, true);
  const second = runGame(index, createMetrics(), false);
  assert.strictEqual(
    second,
    first,
    `commander game ${index}: deterministic action digest mismatch`,
  );
}

metrics.durations.sort((left, right) => left - right);
const p95 =
  metrics.durations[
    Math.min(
      metrics.durations.length - 1,
      Math.floor(metrics.durations.length * 0.95),
    )
  ] || 0;
assert.strictEqual(metrics.illegal, 0, "commander strategy must have zero illegal actions");
assert(metrics.maxSimulations <= 8, "commander strategy must preserve simulation cap");
assert(p95 < 28, `commander strategy p95 ${p95.toFixed(2)}ms exceeds 28ms`);
assert(metrics.powerUses.caocao > 0, "Cao Cao recovery must be used in actual games");
assert(metrics.powerUses.sunquan > 0, "Sun Quan flood must be used in actual games");
assert(metrics.powerUses.nomad > 0, "nomad blockade must be used in actual games");
assert.strictEqual(metrics.powerUses.liubei, 0, "Liu Bei passive must never emit an active action");

console.log(
  [
    `opponent-ai commander integration: ${GAMES} seeds x2 deterministic`,
    `illegal ${metrics.illegal}`,
    `powers caocao ${metrics.powerUses.caocao} / sunquan ${metrics.powerUses.sunquan} / nomad ${metrics.powerUses.nomad} / liubei ${metrics.powerUses.liubei}`,
    `decision p95 ${p95.toFixed(2)}ms`,
    `max simulations ${metrics.maxSimulations}`,
  ].join(" | "),
);
