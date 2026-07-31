"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
const sandbox = { globalThis: { TK: { modules: {} } } };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const { createAI } = sandbox.globalThis.TK.modules.opponentAI;

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function hash(value) {
  const text = String(value);
  let result = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    result ^= text.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function unit(side, sequence, turnNumber) {
  const first = hash(`${side}|${sequence}|${turnNumber}|attack`);
  const second = hash(`${side}|${sequence}|${turnNumber}|health`);
  const attack = 2 + (first % 5);
  const health = 3 + (second % 5);
  return {
    id: `${side}-unit`,
    instanceId: `${side}-${sequence}`,
    currentAttack: attack,
    currentHealth: health,
    maxHealth: health,
    canAttack: true,
    attacksLeft: 1,
    guard: false,
    shield: false,
    keywords: [],
    abilities: [],
  };
}

function createState(gameIndex) {
  // This card-curve-independent benchmark isolates combat choices. The PvE side
  // receives a fixed initiative and three armor so the result is not dominated
  // by the first-player face-race advantage of the intentionally tiny mock rules.
  return {
    phase: "playing",
    turn: "player",
    turnNumber: 1,
    revision: 1,
    winner: null,
    reason: "",
    mockSequence: gameIndex * 17,
    heroes: {
      player: { health: 24, maxHealth: 24, armor: 0, mana: 1, maxMana: 1 },
      ai: { health: 24, maxHealth: 24, armor: 3, mana: 0, maxMana: 0 },
    },
    hands: { player: [], ai: [] },
    decks: { player: [], ai: [] },
    boards: { player: [], ai: [] },
  };
}

function finishIfNeeded(state) {
  if (state.heroes.player.health <= 0 && state.heroes.ai.health <= 0) {
    state.phase = "ended";
    state.winner = "draw";
  } else if (state.heroes.player.health <= 0) {
    state.phase = "ended";
    state.winner = "ai";
  } else if (state.heroes.ai.health <= 0) {
    state.phase = "ended";
    state.winner = "player";
  }
}

function startTurn(state, side) {
  state.turn = side;
  state.turnNumber += 1;
  const hero = state.heroes[side];
  hero.maxMana = Math.min(10, hero.maxMana + 1);
  hero.mana = hero.maxMana;
  if (!state.boards[side].length) {
    state.mockSequence += 1;
    state.boards[side].push(unit(side, state.mockSequence, state.turnNumber));
  }
  state.boards[side].forEach((minion) => {
    minion.canAttack = minion.currentAttack > 0;
    minion.attacksLeft = minion.currentAttack > 0 ? 1 : 0;
  });
}

function legalActions(state, side) {
  if (state.phase !== "playing" || state.turn !== side) return [];
  const actions = [];
  const enemy = side === "ai" ? "player" : "ai";
  const guards = state.boards[enemy]
    .map((minion, index) => ({ minion, index }))
    .filter(({ minion }) => minion.guard);
  state.boards[side].forEach((attacker, attackerIndex) => {
    if (!attacker.canAttack || attacker.attacksLeft <= 0) return;
    if (guards.length) {
      guards.forEach(({ index }) => {
        actions.push({
          type: "attack",
          side,
          attackerIndex,
          target: { zone: "board", side: enemy, index },
        });
      });
      return;
    }
    actions.push({
      type: "attack",
      side,
      attackerIndex,
      target: { zone: "hero", side: enemy },
    });
    state.boards[enemy].forEach((_target, index) => {
      actions.push({
        type: "attack",
        side,
        attackerIndex,
        target: { zone: "board", side: enemy, index },
      });
    });
  });
  actions.push({ type: "endTurn", side });
  return actions;
}

function damageHero(hero, amount) {
  let damage = amount;
  const absorbed = Math.min(hero.armor, damage);
  hero.armor -= absorbed;
  damage -= absorbed;
  hero.health -= damage;
}

function apply(state, action) {
  const next = copy(state);
  next.revision += 1;
  if (action.type === "attack") {
    const attacker = next.boards[action.side][action.attackerIndex];
    const targetSide = action.target.side;
    attacker.canAttack = false;
    attacker.attacksLeft = 0;
    if (action.target.zone === "hero") {
      damageHero(next.heroes[targetSide], attacker.currentAttack);
    } else {
      const target = next.boards[targetSide][action.target.index];
      if (target.shield) target.shield = false;
      else target.currentHealth -= attacker.currentAttack;
      if (attacker.shield) attacker.shield = false;
      else attacker.currentHealth -= target.currentAttack;
      next.boards[action.side] = next.boards[action.side].filter(
        (minion) => minion.currentHealth > 0,
      );
      next.boards[targetSide] = next.boards[targetSide].filter(
        (minion) => minion.currentHealth > 0,
      );
    }
    finishIfNeeded(next);
  } else if (action.type === "endTurn") {
    startTurn(next, action.side === "ai" ? "player" : "ai");
  }
  return next;
}

function simplePlayerAction(state) {
  const actions = legalActions(state, "player");
  const attacks = actions.filter((action) => action.type === "attack");
  const attacker = state.boards.player[0];
  const lethal = attacks.find(
    (action) =>
      action.target.zone === "hero" &&
      attacker.currentAttack >= state.heroes.ai.health + state.heroes.ai.armor,
  );
  if (lethal) return lethal;
  return attacks.find((action) => action.target.zone === "hero") || actions[0];
}

function finalWinner(state) {
  if (state.phase === "ended") return state.winner;
  const playerValue =
    state.heroes.player.health +
    state.heroes.player.armor +
    state.boards.player.reduce(
      (sum, minion) => sum + minion.currentAttack + minion.currentHealth,
      0,
    );
  const aiValue =
    state.heroes.ai.health +
    state.heroes.ai.armor +
    state.boards.ai.reduce(
      (sum, minion) => sum + minion.currentAttack + minion.currentHealth,
      0,
    );
  return playerValue > aiValue ? "player" : playerValue < aiValue ? "ai" : "draw";
}

function playMockBattle(gameIndex) {
  let state = createState(gameIndex);
  const ai = createAI({ rng: `balance-${gameIndex}` });
  startTurn(state, "ai");

  for (let step = 0; step < 80 && state.phase === "playing"; step += 1) {
    if (state.turn === "player") {
      const action = simplePlayerAction(state);
      state = apply(state, action);
      if (state.phase === "playing" && action.type !== "endTurn") {
        state = apply(state, { type: "endTurn", side: "player" });
      }
    } else {
      let safety = 0;
      while (state.phase === "playing" && state.turn === "ai" && safety < 5) {
        const actions = legalActions(state, "ai");
        const action = ai.chooseAction({
          state,
          legalActions: actions,
          simulate(candidate) {
            return apply(state, candidate);
          },
          difficulty: "strategist",
        });
        assert(action, `AI must act in mock battle ${gameIndex}`);
        assert(
          actions.some((candidate) => JSON.stringify(candidate) === JSON.stringify(action)),
          `AI action must be legal in mock battle ${gameIndex}`,
        );
        state = apply(state, action);
        safety += 1;
      }
      assert(safety < 5, `AI must not loop in mock battle ${gameIndex}`);
    }
  }
  return finalWinner(state);
}

const results = { player: 0, ai: 0, draw: 0 };
const GAMES = 200;
for (let gameIndex = 0; gameIndex < GAMES; gameIndex += 1) {
  results[playMockBattle(gameIndex)] += 1;
}

const playerRate = results.player / GAMES;
assert(
  playerRate >= 0.3 && playerRate <= 0.45,
  `simple-player win rate ${(playerRate * 100).toFixed(1)}% is outside 30-45% target`,
);

console.log(
  `opponent-ai balance mock: player ${results.player}, ai ${results.ai}, draw ${results.draw} ` +
    `(${(playerRate * 100).toFixed(1)}% player wins)`,
);
