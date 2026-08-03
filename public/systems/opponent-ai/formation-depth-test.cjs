"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const sandbox = { globalThis: { TK: { modules: {} } } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "index.js"), "utf8"), sandbox);
const { createAI } = sandbox.globalThis.TK.modules.opponentAI;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function minion(id, attack, health, extra) {
  return {
    id,
    instanceId: `${id}-instance`,
    faction: "위",
    role: "맹장",
    cost: 3,
    currentCost: 3,
    attack,
    health,
    currentAttack: attack,
    currentHealth: health,
    maxHealth: health,
    canAttack: true,
    attacksLeft: 1,
    maxAttacksPerTurn: 1,
    attacksMadeThisTurn: 0,
    keywords: [],
    abilities: [],
    ...(extra || {}),
  };
}

function card(id, cost, attack, health, extra) {
  return {
    id,
    instanceId: `${id}-hand`,
    faction: "위",
    role: "맹장",
    cost,
    currentCost: cost,
    attack,
    health,
    keywords: [],
    abilities: [],
    ...(extra || {}),
  };
}

function baseState() {
  return {
    phase: "playing",
    turn: "ai",
    turnNumber: 10,
    revision: 10,
    heroes: {
      player: { health: 30, maxHealth: 30, armor: 0, mana: 0, maxMana: 6 },
      ai: { health: 30, maxHealth: 30, armor: 0, mana: 10, maxMana: 10 },
    },
    commanders: { player: {}, ai: {} },
    hands: { player: [], ai: [] },
    decks: { player: [], ai: [] },
    boards: { player: [], ai: [] },
  };
}

function playActions(handIndex) {
  const actions = [];
  ["front", "rear"].forEach((row) => {
    for (let slot = 0; slot < 3; slot += 1) {
      actions.push({ type: "playCard", side: "ai", handIndex, placement: { row, slot } });
    }
  });
  return actions;
}

function simulate(state, action) {
  const next = clone(state);
  next.revision += 1;
  if (action.type === "endTurn") {
    next.turn = "player";
    next.turnNumber += 1;
    return next;
  }
  if (action.type === "playCard") {
    const played = next.hands.ai.splice(action.handIndex, 1)[0];
    next.heroes.ai.mana -= played.currentCost;
    const summoned = minion(played.id, played.attack, played.health, {
      ...played,
      instanceId: `${played.instanceId}-board`,
      row: action.placement && action.placement.row,
      slot: action.placement && action.placement.slot,
      canAttack: played.keywords.includes("돌진"),
      attacksLeft: played.keywords.includes("돌진") ? 1 : 0,
      guard: played.keywords.includes("수호"),
      shield: played.keywords.includes("방패"),
    });
    if (played.id === "wu_gan_ning" && summoned.row === "rear") {
      summoned.currentAttack += 1;
    }
    next.boards.ai.push(summoned);
    const duel = played.abilities.find((ability) => ability.op === "duel_target");
    if (duel && action.target && action.target.zone === "board") {
      const target = next.boards.player[action.target.index];
      if (target) {
        target.currentHealth -= summoned.currentAttack;
        summoned.currentHealth -= target.currentAttack;
        if (target.currentHealth <= 0 && summoned.currentHealth > 0) {
          summoned.canAttack = true;
          summoned.attacksLeft = 1;
        }
        next.boards.player = next.boards.player.filter((unit) => unit.currentHealth > 0);
        next.boards.ai = next.boards.ai.filter((unit) => unit.currentHealth > 0);
      }
    }
    return next;
  }
  if (action.type === "attack") {
    const attacker = next.boards.ai[action.attackerIndex];
    attacker.attacksLeft -= 1;
    attacker.canAttack = attacker.attacksLeft > 0;
    attacker.attacksMadeThisTurn += 1;
    if (attacker.attacksMadeThisTurn >= 2 && attacker.combat?.secondAttackSelfDamage) {
      attacker.secondAttackPenalty = true;
    }
    if (action.target.zone === "hero") {
      next.heroes.player.health -= attacker.currentAttack;
      if (next.heroes.player.health <= 0) {
        next.phase = "ended";
        next.winner = "ai";
      }
    } else {
      const target = next.boards.player[action.target.index];
      target.currentHealth -= attacker.currentAttack;
      attacker.currentHealth -= target.currentAttack;
      next.boards.player = next.boards.player.filter((unit) => unit.currentHealth > 0);
      next.boards.ai = next.boards.ai.filter((unit) => unit.currentHealth > 0);
    }
    return next;
  }
  return next;
}

function choose(state, actions, seed, onSimulate) {
  return createAI({ rng: seed, replySearch: false }).chooseAction({
    state,
    legalActions: actions,
    simulate(action) {
      if (onSimulate) onSimulate(action);
      return simulate(state, action);
    },
  });
}

function assertPlacement(cardValue, expectedRow, seed) {
  const state = baseState();
  state.hands.ai = [cardValue];
  const selected = choose(
    state,
    playActions(0).concat({ type: "endTurn", side: "ai" }),
    seed,
  );
  assert.strictEqual(selected.type, "playCard", `${cardValue.id} should be deployed`);
  assert.strictEqual(selected.placement.row, expectedRow, `${cardValue.id} placement row`);
}

assertPlacement(
  card("front-guard", 4, 3, 8, { keywords: ["수호"] }),
  "front",
  "guard-front",
);
assertPlacement(
  card("fragile-strategist", 4, 3, 2, { role: "책사" }),
  "rear",
  "strategist-rear",
);
assertPlacement(
  card("wu_gan_ning", 3, 4, 2, {
    faction: "오",
    role: "선봉",
    keywords: ["돌진", "돌파", "연화"],
    abilities: [{ op: "buff_self", requiredRow: "rear", attack: 1 }],
  }),
  "rear",
  "gan-ning-rear",
);
assertPlacement(
  card("qun_lu_bu", 9, 8, 8, {
    faction: "군웅",
    keywords: ["돌진", "돌파", "천하무쌍", "약탈"],
  }),
  "front",
  "lu-bu-front",
);
assertPlacement(
  card("shu_zhuge_liang", 5, 3, 5, {
    faction: "촉",
    role: "책사",
    abilities: [{ op: "empty_fort", requiredRow: "rear", requiresSolo: true }],
  }),
  "rear",
  "empty-fort-rear",
);

{
  const state = baseState();
  state.boards.ai = [minion("ordinary", 4, 5)];
  state.boards.player = [
    minion("front-screen", 0, 1, { row: "front", slot: 0 }),
    minion("rear-threat", 8, 1, { row: "rear", slot: 0 }),
  ];
  const actions = [
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 0 } },
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 1 } },
    { type: "endTurn", side: "ai" },
  ];
  assert.strictEqual(choose(state, actions, "front-protection").target.index, 0);
  state.boards.ai[0].keywords = ["돌파"];
  assert.strictEqual(choose(state, actions, "breakthrough-rear").target.index, 1);
  state.boards.player[0].guard = true;
  state.boards.player[0].keywords = ["수호"];
  assert.strictEqual(choose(state, actions, "guard-overrides-breakthrough").target.index, 0);
}

{
  const state = baseState();
  state.boards.ai = [minion("duplicate-check", 5, 5)];
  state.boards.player = [minion("target", 0, 1)];
  const attack = {
    type: "attack",
    side: "ai",
    attackerIndex: 0,
    target: { zone: "board", side: "player", index: 0 },
  };
  let simulations = 0;
  choose(
    state,
    [attack, clone(attack), { type: "endTurn", side: "ai" }],
    "dedupe-identical-actions",
    () => { simulations += 1; },
  );
  assert.strictEqual(simulations, 2, "identical legal results should only be simulated once");
}

["brotherhood", "strategy", "kindle", "raid"].forEach((linkKind) => {
  const factions = { brotherhood: "촉", strategy: "위", kindle: "오", raid: "군웅" };
  const state = baseState();
  const faction = factions[linkKind];
  state.boards.ai = [minion(`${linkKind}-ally`, 2, 4, { faction, row: "front", slot: 0 })];
  state.boards.player = [minion(`${linkKind}-enemy`, 5, 3, { faction: "촉" })];
  state.hands.ai = [
    card(`${linkKind}-linked`, 4, 3, 4, {
      faction,
      abilities: [{ trigger: "onPlay", op: "faction_link", linkKind }],
    }),
    card(`${linkKind}-plain`, 4, 3, 4, { faction }),
  ];
  const actions = [0, 1].map((handIndex) => ({
    type: "playCard",
    side: "ai",
    handIndex,
    placement: { row: "front", slot: handIndex + 1 },
  }));
  actions.push({ type: "endTurn", side: "ai" });
  assert.strictEqual(
    choose(state, actions, `link-${linkKind}`).handIndex,
    0,
    `${linkKind} synergy should beat an identical unlinked body`,
  );
});

{
  const state = baseState();
  state.hands.ai = [card("shu_guan_yu", 7, 6, 6, {
    faction: "촉",
    abilities: [{ trigger: "onPlay", op: "duel_target" }],
  })];
  state.boards.player = [minion("safe-duel", 2, 5), minion("fatal-duel", 8, 6)];
  const actions = [0, 1].map((index) => ({
    type: "playCard",
    side: "ai",
    handIndex: 0,
    placement: { row: "front", slot: 0 },
    target: { zone: "board", side: "player", index },
  }));
  actions.push({ type: "endTurn", side: "ai" });
  assert.strictEqual(choose(state, actions, "duel-survival").target.index, 0);
}

{
  const state = baseState();
  state.boards.ai = [minion("qun_lu_bu", 8, 2, {
    faction: "군웅",
    keywords: ["천하무쌍"],
    maxAttacksPerTurn: 2,
    attacksMadeThisTurn: 1,
    combat: { secondAttackSelfDamage: 2 },
  })];
  const face = { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "hero", side: "player" } };
  const end = { type: "endTurn", side: "ai" };
  assert.strictEqual(choose(state, [face, end], "lu-bu-recoil").type, "endTurn");
  state.heroes.player.health = 8;
  assert.strictEqual(choose(state, [face, end], "lu-bu-lethal").type, "attack");
}

console.log(
  "opponent-ai formation depth: placements 5 | legality 3 | links 4 | duel/recoil 3 | duplicate simulations 0",
);
