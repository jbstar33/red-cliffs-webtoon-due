"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
const sandbox = { globalThis: { TK: { modules: {} } } };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "opponent-ai/index.js" });
const { createAI } = sandbox.globalThis.TK.modules.opponentAI;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function minion(id, attack, health, extra) {
  return {
    id,
    instanceId: id,
    currentAttack: attack,
    currentHealth: health,
    maxHealth: health,
    canAttack: true,
    attacksLeft: 1,
    keywords: [],
    abilities: [],
    ...(extra || {}),
  };
}

function stateFor(commanderId) {
  return {
    phase: "playing",
    turn: "ai",
    turnNumber: 10,
    revision: 40,
    winner: null,
    heroes: {
      player: {
        health: 30,
        maxHealth: 30,
        armor: 0,
        mana: 0,
        maxMana: 6,
      },
      ai: {
        health: 30,
        maxHealth: 30,
        armor: 0,
        mana: 6,
        maxMana: 6,
      },
    },
    commanders: {
      player: { id: null, powerUsedThisTurn: false, reflectCharges: 0 },
      ai: { id: commanderId, powerUsedThisTurn: false, reflectCharges: 0 },
    },
    hands: { player: [], ai: [] },
    decks: { player: [], ai: [] },
    boards: { player: [], ai: [] },
  };
}

function endTurn(state) {
  const next = clone(state);
  next.revision += 1;
  next.turn = "player";
  next.turnNumber += 1;
  return next;
}

function choose(state, actions, simulate, seed) {
  return createAI({ rng: seed || "commander-power" }).chooseAction({
    state,
    legalActions: actions,
    simulate,
    difficulty: "strategist",
  });
}

function actionKey(action) {
  return JSON.stringify(action);
}

{
  const state = stateFor("caocao");
  state.heroes.ai.health = 8;
  state.boards.player = [minion("lethal-column", 8, 6)];
  const power = {
    type: "USE_COMMANDER_POWER",
    side: "ai",
    commanderId: "caocao",
  };
  const actions = [power, { type: "endTurn", side: "ai" }];
  const selected = choose(
    state,
    actions,
    (action) => {
      if (action.type === "endTurn") return endTurn(state);
      const next = clone(state);
      next.revision += 1;
      next.heroes.ai.health = 12;
      next.heroes.ai.mana -= 1;
      next.commanders.ai.powerUsedThisTurn = true;
      return next;
    },
    "cao-cao-survive",
  );
  assert.strictEqual(
    selected.type,
    "USE_COMMANDER_POWER",
    "Cao Cao should heal when actual health loss and public threat make it necessary",
  );
}

{
  const state = stateFor("caocao");
  const power = {
    type: "USE_COMMANDER_POWER",
    side: "ai",
    commanderId: "caocao",
  };
  const actions = [power, { type: "endTurn", side: "ai" }];
  const selected = choose(
    state,
    actions,
    (action) => {
      if (action.type === "endTurn") return endTurn(state);
      const next = clone(state);
      next.revision += 1;
      next.heroes.ai.mana -= 1;
      next.commanders.ai.powerUsedThisTurn = true;
      return next;
    },
    "cao-cao-no-overheal",
  );
  assert.strictEqual(
    selected.type,
    "endTurn",
    "Cao Cao should not spend recovery at full health",
  );
}

{
  const state = stateFor("sunquan");
  state.boards.player = [
    minion("flood-kill-a", 4, 1),
    minion("flood-kill-b", 3, 1),
    minion("flood-survivor", 6, 5),
  ];
  const power = {
    type: "USE_COMMANDER_POWER",
    side: "ai",
    commanderId: "sunquan",
  };
  const actions = [power, { type: "endTurn", side: "ai" }];
  const selected = choose(
    state,
    actions,
    (action) => {
      if (action.type === "endTurn") return endTurn(state);
      const next = clone(state);
      next.revision += 1;
      next.heroes.ai.mana -= 3;
      next.commanders.ai.powerUsedThisTurn = true;
      next.boards.player.forEach((target) => {
        target.currentHealth -= 1;
      });
      next.boards.player = next.boards.player.filter(
        (target) => target.currentHealth > 0,
      );
      return next;
    },
    "sun-quan-flood-kills",
  );
  assert.strictEqual(
    selected.type,
    "USE_COMMANDER_POWER",
    "Sun Quan should use flood for multiple kills and removed attack",
  );
}

{
  const state = stateFor("sunquan");
  state.heroes.player.health = 1;
  const power = {
    type: "USE_COMMANDER_POWER",
    side: "ai",
    commanderId: "sunquan",
  };
  const actions = [power, { type: "endTurn", side: "ai" }];
  const selected = choose(
    state,
    actions,
    (action) => {
      if (action.type === "endTurn") return endTurn(state);
      const next = clone(state);
      next.revision += 1;
      next.heroes.ai.mana -= 3;
      next.commanders.ai.powerUsedThisTurn = true;
      next.heroes.player.health = 0;
      next.phase = "ended";
      next.winner = "ai";
      return next;
    },
    "sun-quan-hero-lethal",
  );
  assert.strictEqual(
    selected.type,
    "USE_COMMANDER_POWER",
    "Sun Quan flood must be retained as an immediate lethal candidate",
  );
}

{
  const state = stateFor("sunquan");
  const power = {
    type: "USE_COMMANDER_POWER",
    side: "ai",
    commanderId: "sunquan",
  };
  const actions = [power, { type: "endTurn", side: "ai" }];
  const selected = choose(
    state,
    actions,
    (action) => {
      if (action.type === "endTurn") return endTurn(state);
      const next = clone(state);
      next.revision += 1;
      next.heroes.ai.mana -= 3;
      next.commanders.ai.powerUsedThisTurn = true;
      return next;
    },
    "sun-quan-empty-board",
  );
  assert.strictEqual(
    selected.type,
    "endTurn",
    "Sun Quan should preserve flood on an empty board",
  );
}

{
  const state = stateFor("nomad");
  state.heroes.ai.health = 12;
  state.boards.player = [
    minion("minor-scout", 2, 5),
    minion("major-threat", 8, 6),
  ];
  const actions = [
    {
      type: "USE_COMMANDER_POWER",
      side: "ai",
      commanderId: "nomad",
      target: { zone: "board", side: "player", index: 0 },
    },
    {
      type: "USE_COMMANDER_POWER",
      side: "ai",
      commanderId: "nomad",
      target: { zone: "board", side: "player", index: 1 },
    },
    { type: "endTurn", side: "ai" },
  ];
  const selected = choose(
    state,
    actions,
    (action) => {
      if (action.type === "endTurn") return endTurn(state);
      const next = clone(state);
      next.revision += 1;
      next.heroes.ai.mana -= 2;
      next.commanders.ai.powerUsedThisTurn = true;
      const target = next.boards.player[action.target.index];
      target.attackLockPending = true;
      return next;
    },
    "blockade-high-threat",
  );
  assert.strictEqual(
    selected.target.index,
    1,
    "blockade should suppress the highest-attack public threat",
  );
}

{
  const state = stateFor("liubei");
  const actions = [{ type: "endTurn", side: "ai" }];
  const selected = choose(
    state,
    actions,
    () => endTurn(state),
    "liu-bei-passive",
  );
  assert.strictEqual(
    selected.type,
    "endTurn",
    "Liu Bei is passive and must not invent an active commander action",
  );
}

{
  const publicState = stateFor("nomad");
  publicState.heroes.ai.health = 10;
  publicState.boards.player = [
    minion("public-threat", 7, 6),
    minion("public-decoy", 2, 4),
  ];
  const actions = [
    {
      type: "USE_COMMANDER_POWER",
      side: "ai",
      commanderId: "nomad",
      target: { zone: "board", side: "player", index: 0 },
    },
    {
      type: "USE_COMMANDER_POWER",
      side: "ai",
      commanderId: "nomad",
      target: { zone: "board", side: "player", index: 1 },
    },
    { type: "endTurn", side: "ai" },
  ];
  const hiddenVariants = Array.from({ length: 20 }, (_, variant) => {
    const hand = [
      {
        id: `hidden-${variant}-a`,
        instanceId: `hidden-${variant}-instance-a`,
        cost: variant % 10,
        currentCost: (variant * 3) % 10,
        attack: variant % 2 ? 9 : 0,
        health: 1 + (variant % 9),
        keywords: variant % 3 ? [] : ["unknown"],
        abilities: variant % 2
          ? [{ trigger: "onPlay", op: "damage_target", amount: 20 }]
          : [],
      },
      {
        id: `hidden-${variant}-b`,
        instanceId: `hidden-${variant}-instance-b`,
        cost: (variant * 7) % 10,
        currentCost: (variant * 5) % 10,
        attack: (variant * 2) % 9,
        health: 1 + ((variant * 4) % 9),
        keywords: [],
        abilities: [
          {
            trigger: "onDeath",
            op: variant % 2 ? "draw" : "damage_all_enemies",
            amount: 1 + (variant % 5),
          },
        ],
      },
    ];
    return variant % 2 ? hand.reverse() : hand;
  });
  const choices = hiddenVariants.map((hand) => {
    const state = clone(publicState);
    state.hands.player = hand;
    return choose(
      state,
      actions,
      (action) => {
        if (action.type === "endTurn") return endTurn(state);
        const next = clone(state);
        next.revision += 1;
        next.heroes.ai.mana -= 2;
        next.commanders.ai.powerUsedThisTurn = true;
        next.boards.player[action.target.index].attackLockPending = true;
        return next;
      },
      "commander-hidden-invariance",
    );
  });
  assert.strictEqual(
    new Set(choices.map(actionKey)).size,
    1,
    "20 commander power decisions must not inspect hidden hand identity, order, cost, or ability",
  );
}

{
  const state = stateFor("nomad");
  state.heroes.ai.health = 9;
  state.boards.ai = [
    minion("stress-a", 2, 5),
    minion("stress-b", 3, 5),
    minion("stress-c", 4, 5),
    minion("stress-d", 5, 5),
  ];
  state.boards.player = [
    minion("stress-target-a", 1, 2),
    minion("stress-target-b", 2, 3),
    minion("stress-target-c", 3, 4),
    minion("stress-target-d", 4, 5),
    minion("stress-target-e", 7, 6),
  ];
  const actions = [];
  state.boards.ai.forEach((attacker, attackerIndex) => {
    actions.push({
      type: "attack",
      side: "ai",
      attackerIndex,
      target: { zone: "hero", side: "player" },
    });
    state.boards.player.forEach((target, targetIndex) => {
      actions.push({
        type: "attack",
        side: "ai",
        attackerIndex,
        target: { zone: "board", side: "player", index: targetIndex },
      });
    });
  });
  state.boards.player.forEach((target, index) => {
    actions.push({
      type: "USE_COMMANDER_POWER",
      side: "ai",
      commanderId: "nomad",
      target: { zone: "board", side: "player", index },
    });
  });
  actions.push({ type: "endTurn", side: "ai" });
  let simulations = 0;
  const selected = choose(
    state,
    actions,
    (action) => {
      simulations += 1;
      if (action.type === "endTurn") return endTurn(state);
      const next = clone(state);
      next.revision += 1;
      if (action.type === "USE_COMMANDER_POWER") {
        next.heroes.ai.mana -= 2;
        next.commanders.ai.powerUsedThisTurn = true;
        next.boards.player[action.target.index].attackLockPending = true;
      } else if (action.type === "attack") {
        const attacker = next.boards.ai[action.attackerIndex];
        attacker.canAttack = false;
        attacker.attacksLeft = 0;
        if (action.target.zone === "hero") {
          next.heroes.player.health -= attacker.currentAttack;
        } else {
          const target = next.boards.player[action.target.index];
          target.currentHealth -= attacker.currentAttack;
          attacker.currentHealth -= target.currentAttack;
          next.boards.player = next.boards.player.filter(
            (candidate) => candidate.currentHealth > 0,
          );
          next.boards.ai = next.boards.ai.filter(
            (candidate) => candidate.currentHealth > 0,
          );
        }
      }
      return next;
    },
    "commander-stress",
  );
  assert(
    actions.some((action) => actionKey(action) === actionKey(selected)),
    "commander stress choice must remain legal",
  );
  assert(
    simulations <= 8,
    `commander stress must simulate at most 8 candidates, saw ${simulations}`,
  );
}

console.log(
  "opponent-ai commander powers: 9 scenario groups passed | hidden-hand fair | simulations <= 8",
);
require("./commander-integration-test.cjs");
