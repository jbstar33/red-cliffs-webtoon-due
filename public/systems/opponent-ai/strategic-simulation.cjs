"use strict";

const assert = require("assert");
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
const cardData = modules.cardData;
const rulesEngine = modules.rulesEngine;
const { createAI } = modules.opponentAI;
const definitions = cardData.getCards();
const cardIds = definitions.map((card) => card.id);
const FACTIONS = ["wei", "shu", "wu", "nanman"];
const COMMANDER_BY_FACTION = {
  wei: "caocao",
  shu: "liubei",
  wu: "sunquan",
  nanman: "nomad",
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function attackOf(entity) {
  return Math.max(0, Number(entity.currentAttack ?? entity.attack ?? 0));
}

function healthOf(entity) {
  return Math.max(0, Number(entity.currentHealth ?? entity.health ?? 0));
}

function effectiveHealth(hero) {
  return Number(hero.health || 0) + Number(hero.armor || 0);
}

function actionKey(action) {
  return JSON.stringify(action);
}

function emptyRecord() {
  return { games: 0, ai: 0, player: 0, draw: 0 };
}

function recordResult(table, key, winner) {
  if (!table[key]) table[key] = emptyRecord();
  table[key].games += 1;
  table[key][winner || "draw"] += 1;
}

function withRates(table) {
  return Object.fromEntries(Object.entries(table).map(([key, value]) => [key, {
    ...value,
    aiRate: Number((value.ai / Math.max(1, value.games)).toFixed(3)),
  }]));
}

function simulateAction(game, action) {
  const copy = game.cloneForSimulation();
  const result = copy.applyAction(clone(action));
  return { ok: result && result.ok !== false, state: copy.getState() };
}

function simplePlayerChoice(game, seed) {
  const state = game.getState();
  const actions = game.getLegalActions("player");
  if (!actions.length) return null;
  const enemyHealth = effectiveHealth(state.heroes.ai);
  let best = null;

  actions.forEach((action) => {
    let score = 0;
    if (action.type === "endTurn") {
      score = -20;
    } else if (action.type === "attack") {
      const attacker = state.boards.player[action.attackerIndex];
      const power = attackOf(attacker);
      if (action.target.zone === "hero") {
        score = power * 1.25;
        if (power >= enemyHealth) score += 1000000;
      } else {
        const target = state.boards.ai[action.target.index];
        const shield = Boolean(target && (target.shield || target.keywords.includes("방패")));
        const kills = target && !shield && power >= healthOf(target);
        const survives =
          attacker &&
          (attacker.shield ||
            attacker.keywords.includes("방패") ||
            attackOf(target) < healthOf(attacker));
        score =
          (kills ? attackOf(target) + healthOf(target) + 6 : power * 0.25) +
          (survives ? 3 : -attackOf(attacker) * 0.4);
      }
    } else if (action.type === "playCard") {
      const card = state.hands.player[action.handIndex];
      score =
        Number(card.currentCost || card.cost || 0) * 0.7 +
        attackOf(card) * 0.8 +
        healthOf(card) * 0.55;
      (card.abilities || []).forEach((ability) => {
        if (ability.op === "damage_target" && action.target) {
          if (action.target.zone === "hero") {
            score += Number(ability.amount || 0);
            if (Number(ability.amount || 0) >= enemyHealth) score += 1000000;
          } else {
            const target = state.boards.ai[action.target.index];
            if (
              target &&
              !target.shield &&
              !target.keywords.includes("방패") &&
              Number(ability.amount || 0) >= healthOf(target)
            ) {
              score += attackOf(target) + healthOf(target) + 5;
            }
          }
        } else if (ability.op === "damage_all_enemies") {
          score += state.boards.ai.length * Number(ability.amount || 0);
        } else if (ability.op === "summon_token") {
          score += Math.min(4 - state.boards.player.length, Number(ability.count || 1)) * 2;
        } else if (ability.op === "draw") {
          score += Math.min(10 - state.hands.player.length, Number(ability.amount || 1)) * 1.5;
        } else {
          score += 0.8;
        }
      });
    }
    const tie = ((seed * 1103515245 + actionKey(action).length * 12345) >>> 0) / 4294967296;
    const ranked = { action, score, tie };
    if (!best || ranked.score > best.score || (ranked.score === best.score && ranked.tie < best.tie)) {
      best = ranked;
    }
  });
  return best && clone(best.action);
}

function recordChoice(metrics, state, action) {
  let key = action.type;
  if (action.type === "playCard") {
    const card = state.hands.ai[action.handIndex];
    key += `:${card ? card.id : "missing"}:${action.target ? action.target.zone : "none"}:${
      action.placement ? action.placement.row : "auto"
    }`;
  } else if (action.type === "attack") {
    const attacker = state.boards.ai[action.attackerIndex];
    const target =
      action.target.zone === "board"
        ? state.boards.player[action.target.index]
        : null;
    key += `:${attacker ? attacker.id : "missing"}:${
      action.target.zone === "hero"
        ? "hero"
        : target && (target.guard || target.keywords.includes("수호"))
          ? "guard"
          : "minion"
    }`;
  } else if (action.type === "USE_COMMANDER_POWER") {
    key += `:${action.commanderId}:${
      action.target ? `${action.target.zone}-${action.target.index ?? ""}` : "none"
    }`;
  }
  metrics.aiChoiceCounts.set(key, (metrics.aiChoiceCounts.get(key) || 0) + 1);
}

function runGame(index, metrics, options) {
  const settings = options || {};
  const aiFaction = FACTIONS[index % FACTIONS.length];
  const playerFaction = FACTIONS[Math.floor(index / FACTIONS.length) % FACTIONS.length];
  const game = rulesEngine.createGame({
    definitions,
    tokens: cardData.getTokens(),
    playerDeck: cardData.buildDeck(`strategic-player-${index}`, playerFaction),
    aiDeck: cardData.buildDeck(`strategic-ai-${index}`, aiFaction),
    commanders: {
      player: COMMANDER_BY_FACTION[playerFaction],
      ai: COMMANDER_BY_FACTION[aiFaction],
    },
    seed: `strategic-game-${index}`,
  });
  const strategist = createAI({
    rng: `strategist-${index}`,
    replySearch: settings.replySearch !== false,
  });
  let actionCount = 0;

  while (game.getState().phase === "playing" && actionCount < 240) {
    const state = game.getState();
    const side = state.turn;
    const legalActions = game.getLegalActions(side);
    let action;

    if (side === "ai") {
      const started = process.hrtime.bigint();
      let decisionSimulations = 0;
      action = strategist.chooseAction({
        state,
        legalActions,
        simulate(candidate) {
          decisionSimulations += 1;
          return simulateAction(game, candidate);
        },
        difficulty: "strategist",
      });
      const decisionNanoseconds = process.hrtime.bigint() - started;
      metrics.aiDecisionNanoseconds += decisionNanoseconds;
      metrics.aiDecisionDurations.push(Number(decisionNanoseconds) / 1000000);
      metrics.aiDecisions += 1;
      metrics.aiSimulations += decisionSimulations;
      metrics.maxDecisionSimulations = Math.max(
        metrics.maxDecisionSimulations,
        decisionSimulations,
      );
    } else {
      action = simplePlayerChoice(game, index + actionCount);
    }

    assert(action, `game ${index}: ${side} must choose an action`);
    const legal = legalActions.some((candidate) => actionKey(candidate) === actionKey(action));
    if (!legal) metrics.illegalActions += 1;
    assert(legal, `game ${index}: selected action must be legal`);

    if (side === "ai") recordChoice(metrics, state, action);
    if (side === "ai" && action.type === "USE_COMMANDER_POWER") {
      metrics.aiCommanderPowers[action.commanderId] += 1;
    }
    if (side === "ai" && action.type === "playCard") {
      const card = state.hands.ai[action.handIndex];
      if (card) metrics.aiCardsPlayed.add(card.id);
      const row = action.placement && action.placement.row;
      if (row === "front" || row === "rear") metrics.aiPlacements[row] += 1;
    }

    const result = game.applyAction(action);
    if (!result || result.ok === false) metrics.illegalActions += 1;
    assert(result && result.ok !== false, `game ${index}: legal action must apply`);
    actionCount += 1;
  }

  const finalState = game.getState();
  assert.strictEqual(
    finalState.phase,
    "ended",
    `game ${index}: match must finish without a stall before ${actionCount} actions`,
  );
  metrics.actions += actionCount;
  metrics.turns += finalState.turnNumber;
  metrics.games += 1;
  metrics.results[finalState.winner || "draw"] += 1;
  recordResult(metrics.byAiFaction, aiFaction, finalState.winner);
  recordResult(metrics.byPlayerFaction, playerFaction, finalState.winner);
  recordResult(metrics.byMatchup, `${playerFaction}->${aiFaction}`, finalState.winner);
  recordResult(metrics.byInitiative, "aiSecond", finalState.winner);
}

function createMetrics() {
  return {
    games: 0,
    turns: 0,
    actions: 0,
    aiDecisions: 0,
    aiDecisionNanoseconds: 0n,
    aiDecisionDurations: [],
    aiSimulations: 0,
    maxDecisionSimulations: 0,
    illegalActions: 0,
    aiCardsPlayed: new Set(),
    aiPlacements: { front: 0, rear: 0 },
    byAiFaction: {},
    byPlayerFaction: {},
    byMatchup: {},
    byInitiative: {},
    aiChoiceCounts: new Map(),
    aiCommanderPowers: { caocao: 0, liubei: 0, sunquan: 0, nomad: 0 },
    results: { player: 0, ai: 0, draw: 0 },
  };
}

function summarize(metrics) {
  const decisions = Math.max(1, metrics.aiDecisions);
  const durations = metrics.aiDecisionDurations.slice().sort((left, right) => left - right);
  const percentile = (ratio) => {
    if (!durations.length) return 0;
    return durations[Math.min(durations.length - 1, Math.floor(durations.length * ratio))];
  };
  let entropy = 0;
  metrics.aiChoiceCounts.forEach((count) => {
    const probability = count / decisions;
    entropy -= probability * Math.log2(probability);
  });
  return {
    averageTurns: metrics.turns / metrics.games,
    averageActions: metrics.actions / metrics.games,
    averageDecisionMs:
      Number(metrics.aiDecisionNanoseconds) / decisions / 1000000,
    p50DecisionMs: percentile(0.5),
    p95DecisionMs: percentile(0.95),
    maxDecisionMs: durations.length ? durations[durations.length - 1] : 0,
    averageSimulations: metrics.aiSimulations / decisions,
    maxDecisionSimulations: metrics.maxDecisionSimulations,
    aiWinRate: metrics.results.ai / metrics.games,
    choiceEntropy: entropy,
    distinctChoices: metrics.aiChoiceCounts.size,
  };
}

const metrics = createMetrics();

const GAMES = Math.max(1, Number(process.env.AI_SIM_GAMES || 120));
for (let index = 0; index < GAMES; index += 1) runGame(index, metrics);

const missingCards = cardIds.filter((id) => !metrics.aiCardsPlayed.has(id));
const summary = summarize(metrics);
const {
  averageTurns,
  averageActions,
  averageDecisionMs,
  aiWinRate,
  choiceEntropy,
  distinctChoices,
  averageSimulations,
  maxDecisionSimulations,
  p50DecisionMs,
  p95DecisionMs,
  maxDecisionMs,
} = summary;

assert.strictEqual(metrics.illegalActions, 0, "AI must never select or apply an illegal action");
if (GAMES >= 100) {
  assert.strictEqual(
    missingCards.length,
    0,
    `all cards must be deployed; missing ${missingCards.join(", ")}`,
  );
  assert(
    metrics.aiCommanderPowers.caocao > 0 &&
      metrics.aiCommanderPowers.sunquan > 0 &&
      metrics.aiCommanderPowers.nomad > 0,
    `active commander coverage missing: ${JSON.stringify(metrics.aiCommanderPowers)}`,
  );
  assert.strictEqual(
    metrics.aiCommanderPowers.liubei,
    0,
    "Liu Bei passive must not emit USE_COMMANDER_POWER",
  );
  assert(
    aiWinRate >= 0.25 && aiWinRate <= 0.7,
    `AI calibrated win rate ${(aiWinRate * 100).toFixed(1)}% outside 25-70%`,
  );
  Object.entries(metrics.byAiFaction).forEach(([faction, record]) => {
    const rate = record.ai / Math.max(1, record.games);
    assert(
      rate >= 0.1 && rate <= 0.9,
      `${faction} AI faction win rate ${(rate * 100).toFixed(1)}% outside 10-90%`,
    );
  });
  assert.strictEqual(
    metrics.byInitiative.aiSecond?.games,
    GAMES,
    "single PvE rules always give the human player first action and AI second action",
  );
  assert(
    metrics.aiPlacements.front > 0 && metrics.aiPlacements.rear > 0,
    `AI must use both formation rows: ${JSON.stringify(metrics.aiPlacements)}`,
  );
}
assert(averageTurns >= 8 && averageTurns <= 45, `average turns ${averageTurns} outside 8-45`);
assert(aiWinRate >= 0.25 && aiWinRate <= 0.9, `AI win rate ${aiWinRate} outside 25-90%`);
assert(averageDecisionMs < 20, `average decision time ${averageDecisionMs}ms exceeds 20ms`);
assert(p50DecisionMs < 16, `p50 decision time ${p50DecisionMs}ms exceeds 16ms`);
assert(p95DecisionMs < 28, `p95 decision time ${p95DecisionMs}ms exceeds 28ms`);
assert(
  maxDecisionSimulations <= 8,
  `strategic decision simulated ${maxDecisionSimulations} candidates; cap is 8`,
);

const COMPARE_GAMES = Math.max(
  0,
  Number(process.env.AI_REPLY_COMPARE_GAMES || GAMES),
);
let comparisonText = "";
if (COMPARE_GAMES > 0) {
  const searchedMetrics = COMPARE_GAMES === GAMES ? metrics : createMetrics();
  const baselineMetrics = createMetrics();
  for (let index = 0; index < COMPARE_GAMES; index += 1) {
    if (COMPARE_GAMES !== GAMES) {
      runGame(index, searchedMetrics, { replySearch: true });
    }
    runGame(index, baselineMetrics, { replySearch: false });
  }
  const searched = summarize(searchedMetrics);
  const baseline = summarize(baselineMetrics);
  assert.strictEqual(
    searchedMetrics.illegalActions + baselineMetrics.illegalActions,
    0,
    "reply-search comparison must have zero illegal actions",
  );
  assert(
    searched.averageTurns >= 8 && searched.averageTurns <= 45,
    `reply-search comparison turns ${searched.averageTurns} outside 8-45`,
  );
  assert(
    searched.aiWinRate >= 0.2 && searched.aiWinRate <= 0.9,
    `reply-search comparison win rate ${searched.aiWinRate} outside 20-90%`,
  );
  assert(
    searched.choiceEntropy >= baseline.choiceEntropy - 0.35,
    `reply search collapsed choice diversity: ${searched.choiceEntropy} vs ${baseline.choiceEntropy}`,
  );
  assert(
    searched.averageDecisionMs < 20 &&
      searched.averageDecisionMs <= baseline.averageDecisionMs + 3,
      `reply search latency ${searched.averageDecisionMs}ms exceeds baseline ${baseline.averageDecisionMs}ms budget`,
  );
  assert(
    searched.maxDecisionSimulations <= 8 &&
      baseline.maxDecisionSimulations <= 8,
    `paired simulation cap exceeded: ${searched.maxDecisionSimulations}/${baseline.maxDecisionSimulations}`,
  );
  if (COMPARE_GAMES >= 120) {
    assert(
      Math.abs(searched.aiWinRate - baseline.aiWinRate) <= 0.050001,
      `reply search calibration shifted win rate by ${(
        (searched.aiWinRate - baseline.aiWinRate) *
        100
      ).toFixed(1)}pp`,
    );
  }
  comparisonText = [
    `reply ${COMPARE_GAMES}: searched win ${(searched.aiWinRate * 100).toFixed(1)}%`,
    `turns ${searched.averageTurns.toFixed(2)}`,
    `diversity ${searched.distinctChoices}/${searched.choiceEntropy.toFixed(2)}b`,
    `decision ${searched.averageDecisionMs.toFixed(3)}ms`,
    `p50/p95/max ${searched.p50DecisionMs.toFixed(2)}/${searched.p95DecisionMs.toFixed(2)}/${searched.maxDecisionMs.toFixed(2)}ms`,
    `sims ${searched.averageSimulations.toFixed(2)}/${searched.maxDecisionSimulations}`,
    `baseline win ${(baseline.aiWinRate * 100).toFixed(1)}%`,
    `turns ${baseline.averageTurns.toFixed(2)}`,
    `diversity ${baseline.distinctChoices}/${baseline.choiceEntropy.toFixed(2)}b`,
    `decision ${baseline.averageDecisionMs.toFixed(3)}ms`,
    `p50/p95/max ${baseline.p50DecisionMs.toFixed(2)}/${baseline.p95DecisionMs.toFixed(2)}/${baseline.maxDecisionMs.toFixed(2)}ms`,
    `sims ${baseline.averageSimulations.toFixed(2)}/${baseline.maxDecisionSimulations}`,
  ].join(" | ");
}

console.log(
  [
    `opponent-ai strategic simulation: ${GAMES} seeded games`,
    `illegal ${metrics.illegalActions}`,
    `cards ${metrics.aiCardsPlayed.size}/${cardIds.length}`,
    `avg turns ${averageTurns.toFixed(2)}`,
    `avg actions ${averageActions.toFixed(2)}`,
    `AI ${metrics.results.ai} / player ${metrics.results.player} / draw ${metrics.results.draw}`,
    `AI win ${(aiWinRate * 100).toFixed(1)}%`,
    `powers ${JSON.stringify(metrics.aiCommanderPowers)}`,
    `placements ${JSON.stringify(metrics.aiPlacements)}`,
    `AI factions ${JSON.stringify(withRates(metrics.byAiFaction))}`,
    `player factions ${JSON.stringify(withRates(metrics.byPlayerFaction))}`,
    `matchups ${JSON.stringify(withRates(metrics.byMatchup))}`,
    `initiative ${JSON.stringify(withRates(metrics.byInitiative))}`,
    "Liu Bei power uses 0 (passive by design)",
    `diversity ${distinctChoices}/${choiceEntropy.toFixed(2)}b`,
    `decision ${averageDecisionMs.toFixed(3)}ms`,
    `p50/p95/max ${p50DecisionMs.toFixed(2)}/${p95DecisionMs.toFixed(2)}/${maxDecisionMs.toFixed(2)}ms`,
    `sims ${averageSimulations.toFixed(2)}/${maxDecisionSimulations}`,
    comparisonText,
  ].filter(Boolean).join(" | "),
);
