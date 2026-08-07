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

function card(id, cost, attack, health, abilities, target, extra) {
  return {
    id,
    instanceId: `hand-${id}`,
    cost,
    currentCost: cost,
    attack,
    health,
    abilities: abilities || [],
    keywords: [],
    target: target || "none",
    ...(extra || {}),
  };
}

function baseState() {
  return {
    phase: "playing",
    turn: "ai",
    turnNumber: 6,
    revision: 20,
    winner: null,
    heroes: {
      player: { health: 30, maxHealth: 30, armor: 0, mana: 0, maxMana: 5 },
      ai: { health: 30, maxHealth: 30, armor: 0, mana: 5, maxMana: 5 },
    },
    hands: { player: [], ai: [] },
    decks: { player: [], ai: [] },
    boards: { player: [], ai: [] },
  };
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function resolveDeaths(state) {
  state.boards.player = state.boards.player.filter((unit) => unit.currentHealth > 0);
  state.boards.ai = state.boards.ai.filter((unit) => unit.currentHealth > 0);
}

function simulateFrom(state) {
  return function simulate(action) {
    const next = copy(state);
    next.revision += 1;
    if (action.type === "attack") {
      const attacker = next.boards.ai[action.attackerIndex];
      const target = action.target.zone === "hero"
        ? next.heroes[action.target.side]
        : next.boards[action.target.side][action.target.index];
      attacker.canAttack = false;
      attacker.attacksLeft = 0;
      if (action.target.zone === "hero") {
        target.health -= attacker.currentAttack;
      } else {
        if (target.shield || target.keywords.includes("방패")) {
          target.shield = false;
          target.keywords = target.keywords.filter((keyword) => keyword !== "방패");
        }
        else target.currentHealth -= attacker.currentAttack;
        if (attacker.shield || attacker.keywords.includes("방패")) {
          attacker.shield = false;
          attacker.keywords = attacker.keywords.filter((keyword) => keyword !== "방패");
        }
        else attacker.currentHealth -= target.currentAttack;
      }
      resolveDeaths(next);
    } else if (action.type === "playCard") {
      const played = next.hands.ai.splice(action.handIndex, 1)[0];
      next.heroes.ai.mana -= played.currentCost;
      next.boards.ai.push(
        minion(
          `board-${played.id}`,
          played.attack,
          played.health,
          {
            canAttack: played.keywords.includes("돌진"),
            attacksLeft: played.keywords.includes("돌진") ? 1 : 0,
            abilities: played.abilities,
            keywords: played.keywords.slice(),
            guard: played.keywords.includes("수호"),
            shield: played.keywords.includes("방패"),
          },
        ),
      );
      played.abilities.forEach((ability) => {
        if (ability.op === "damage_target") {
          const target = action.target.zone === "hero"
            ? next.heroes[action.target.side]
            : next.boards[action.target.side][action.target.index];
          if (action.target.zone === "hero") target.health -= ability.amount;
          else target.currentHealth -= ability.amount;
        }
        if (ability.op === "gain_armor") next.heroes.ai.armor += ability.amount;
        if (ability.op === "steal_enemy_minion") {
          const candidate = next.boards.player[action.target.index];
          const candidateCost = Number(candidate && (candidate.currentCost ?? candidate.cost ?? 0));
          const minimumCost = ability.minCost == null ? 0 : Number(ability.minCost);
          if (candidate && candidateCost >= minimumCost) {
            const stolen = next.boards.player.splice(action.target.index, 1)[0];
            stolen.canAttack = false;
            stolen.attacksLeft = 0;
            next.boards.ai.push(stolen);
          }
        }
        if (ability.op === "steal_enemy_minion_max_cost") {
          const candidate = next.boards.player[action.target.index];
          const candidateCost = Number(candidate && (candidate.currentCost ?? candidate.cost ?? 0));
          if (candidate && candidateCost <= Number(ability.maxCost ?? 1)) {
            const stolen = next.boards.player.splice(action.target.index, 1)[0];
            stolen.canAttack = false;
            stolen.attacksLeft = 0;
            next.boards.ai.push(stolen);
          }
        }
        if (ability.op === "grant_all_allies_armor") {
          next.boards.ai.forEach((ally) => {
            if (ally.instanceId !== `board-${played.id}`) {
              ally.armor = Number(ally.armor || 0) + Number(ability.amount || 1);
            }
          });
        }
      });
      resolveDeaths(next);
    } else if (action.type === "endTurn") {
      next.turn = "player";
      next.turnNumber += 1;
      next.boards.player.forEach((unit) => {
        unit.canAttack = true;
        unit.attacksLeft = 1;
      });
    }
    if (next.heroes.player.health <= 0) {
      next.phase = "ended";
      next.winner = "ai";
    }
    if (next.heroes.ai.health <= 0) {
      next.phase = "ended";
      next.winner = "player";
    }
    return next;
  };
}

function choose(state, actions, seed) {
  const ai = createAI({ rng: seed || "mock-seed" });
  return ai.chooseAction({
    state,
    legalActions: actions,
    simulate: simulateFrom(state),
    difficulty: "strategist",
  });
}

{
  const state = baseState();
  state.heroes.player.health = 5;
  state.boards.ai = [minion("lu-bu", 6, 5)];
  const actions = [
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "hero", side: "player" } },
    { type: "endTurn", side: "ai" },
  ];
  assert.strictEqual(choose(state, actions).type, "attack", "AI must take lethal");
}

{
  const state = baseState();
  state.boards.ai = [minion("guan-yu", 5, 5)];
  state.boards.player = [minion("guard", 4, 4, { guard: true })];
  const actions = [
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 0 } },
    { type: "endTurn", side: "ai" },
  ];
  const selected = choose(state, actions);
  assert.strictEqual(selected.type, "attack", "AI must remove a guard with a favorable trade");
  assert.strictEqual(selected.target.index, 0);
}

{
  const state = baseState();
  state.boards.ai = [minion("veteran", 5, 7)];
  state.boards.player = [minion("threat", 6, 4)];
  const actions = [
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "hero", side: "player" } },
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 0 } },
    { type: "endTurn", side: "ai" },
  ];
  const selected = choose(state, actions);
  assert.strictEqual(selected.target.zone, "board", "AI should value a favorable removal");
}

{
  const state = baseState();
  state.hands.ai = [card("xiahou-dun", 5, 5, 6)];
  const actions = [
    { type: "playCard", side: "ai", handIndex: 0 },
    { type: "endTurn", side: "ai" },
  ];
  assert.strictEqual(choose(state, actions).type, "playCard", "AI should develop on curve");
}

{
  const state = baseState();
  state.hands.ai = [
    card(
      "fire-plan",
      3,
      2,
      2,
      [{ trigger: "onPlay", op: "damage_target", amount: 4 }],
      "enemy",
    ),
  ];
  state.boards.player = [minion("large", 7, 7), minion("small", 4, 4)];
  const actions = [
    { type: "playCard", side: "ai", handIndex: 0, target: { zone: "board", side: "player", index: 0 } },
    { type: "playCard", side: "ai", handIndex: 0, target: { zone: "board", side: "player", index: 1 } },
    { type: "endTurn", side: "ai" },
  ];
  const selected = choose(state, actions);
  assert.strictEqual(selected.target.index, 1, "AI should choose the killable target");
}

{
  const state = baseState();
  state.boards.ai = [minion("a", 3, 3)];
  state.boards.player = [minion("b", 1, 1), minion("c", 1, 1)];
  const actions = [
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "hero", side: "player" } },
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 0 } },
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 1 } },
    { type: "endTurn", side: "ai" },
  ];
  const first = choose(state, actions, "determinism");
  const second = choose(state, actions, "determinism");
  assert.deepStrictEqual(first, second, "same seed and state must choose deterministically");
}

{
  const state = baseState();
  state.heroes.ai.maxMana = 4;
  state.heroes.ai.mana = 4;
  state.boards.ai = [minion("opening-veteran", 5, 7)];
  state.boards.player = [
    minion("opening-threat", 6, 4),
    minion("opening-scout", 2, 2),
  ];
  const actions = [
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "hero", side: "player" } },
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 0 } },
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 1 } },
    { type: "endTurn", side: "ai" },
  ];
  for (let seed = 0; seed < 24; seed += 1) {
    const selected = choose(state, actions, `opening-variety-${seed}`);
    assert.strictEqual(
      selected.target.index,
      0,
      "opening AI should consistently take the high-threat favorable trade",
    );
  }
}

{
  const state = baseState();
  state.heroes.ai.maxMana = 3;
  state.heroes.ai.mana = 3;
  state.heroes.player.health = 4;
  state.boards.ai = [minion("opening-lethal", 5, 4)];
  state.boards.player = [minion("tempting-trade", 8, 2)];
  const actions = [
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "hero", side: "player" } },
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 0 } },
    { type: "endTurn", side: "ai" },
  ];
  for (let seed = 0; seed < 16; seed += 1) {
    const selected = choose(state, actions, `opening-lethal-${seed}`);
    assert.strictEqual(selected.target.zone, "hero", "opening relaxation must never miss lethal");
  }
}

{
  const state = baseState();
  state.heroes.ai.maxMana = 5;
  state.heroes.ai.mana = 5;
  state.boards.ai = [minion("late-veteran", 5, 7)];
  state.boards.player = [minion("late-threat", 6, 4)];
  const actions = [
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "hero", side: "player" } },
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 0 } },
    { type: "endTurn", side: "ai" },
  ];
  for (let seed = 0; seed < 16; seed += 1) {
    const selected = choose(state, actions, `late-strategist-${seed}`);
    assert.strictEqual(
      selected.target.zone,
      "board",
      "from five mana onward strategist should take the favorable trade",
    );
  }
}

{
  const state = baseState();
  state.boards.ai = [minion("loop-check", 2, 2)];
  const actions = [
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "hero", side: "player" } },
    { type: "endTurn", side: "ai" },
  ];
  const ai = createAI({ rng: "loop-seed" });
  const context = {
    state,
    legalActions: actions,
    simulate: simulateFrom(state),
    difficulty: "strategist",
  };
  assert.strictEqual(ai.chooseAction(context).type, "attack");
  assert.strictEqual(
    ai.chooseAction(context).type,
    "endTurn",
    "repeated identical state must converge to end turn",
  );
  assert.strictEqual(
    ai.chooseAction(context).type,
    "endTurn",
    "once converged, repeated identical state must remain at end turn",
  );
}

{
  const state = baseState();
  state.boards.ai = [minion("invalid-check", 2, 2)];
  const actions = [
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "hero", side: "player" } },
    { type: "endTurn", side: "ai" },
  ];
  const ai = createAI({ rng: "invalid-simulation" });
  const selected = ai.chooseAction({
    state,
    legalActions: actions,
    simulate(action) {
      const next = simulateFrom(state)(action);
      return action.type === "attack"
        ? { ok: false, state: next }
        : { ok: true, state: next };
    },
  });
  assert.strictEqual(selected.type, "endTurn", "failed simulations must not be selected");
}

{
  let wins = 0;
  for (let game = 0; game < 40; game += 1) {
    const state = baseState();
    state.heroes.player.health = 4 + (game % 12);
    state.boards.ai = [
      minion(`attacker-${game}`, 2 + (game % 5), 3 + (game % 4)),
    ];
    state.boards.player = game % 3 === 0
      ? [minion(`guard-${game}`, 1 + (game % 4), 2 + (game % 3), { guard: true })]
      : [];
    const actions = state.boards.player.length
      ? [
          { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 0 } },
          { type: "endTurn", side: "ai" },
        ]
      : [
          { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "hero", side: "player" } },
          { type: "endTurn", side: "ai" },
        ];
    const selected = choose(state, actions, `game-${game}`);
    assert(selected, `mock game ${game} must produce an action`);
    assert(actions.some((action) => JSON.stringify(action) === JSON.stringify(selected)));
    if (selected.type === "attack") wins += 1;
  }
  assert(wins >= 36, "AI should take productive combat actions in mock games");
}

{
  const state = baseState();
  state.heroes.player.health = 4;
  state.boards.ai = [minion("shu_huang_zhong", 4, 3, { keywords: ["저격"] })];
  state.boards.player = [minion("guard", 1, 2, { guard: true })];
  const actions = [
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 0 } },
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "hero", side: "player" } },
    { type: "endTurn", side: "ai" },
  ];
  const selected = choose(state, actions, "snipe-guard-priority");
  assert.strictEqual(selected.target.zone, "board", "sniper must obey guard before lethal");
}

{
  const state = baseState();
  state.heroes.player.health = 8;
  state.boards.ai = [minion("wei_xiahou_yuan", 4, 4, { keywords: ["저격"] })];
  state.boards.player = [minion("small-guard", 1, 5, { guard: true })];
  const actions = [
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 0 } },
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "hero", side: "player" } },
    { type: "endTurn", side: "ai" },
  ];
  assert.strictEqual(
    choose(state, actions, "snipe-pressure").target.zone,
    "board",
    "sniper must attack guard before applying direct pressure",
  );
}

{
  const state = baseState();
  state.heroes.ai.mana = 5;
  state.heroes.ai.maxMana = 6;
  state.hands.ai = [card(
    "qun_diao_chan",
    5,
    2,
    3,
    [{ trigger: "onPlay", op: "steal_enemy_minion", minCost: 3, target: "enemyMinion" }],
    "enemyMinion",
  )];
  state.boards.player = [
    minion("cheap-scout", 1, 2, { cost: 1, currentCost: 1 }),
    minion("elite-general", 6, 7, { cost: 6, currentCost: 6, guard: true }),
  ];
  const actions = [0, 1].map((index) => ({
    type: "playCard",
    side: "ai",
    handIndex: 0,
    target: { zone: "board", side: "player", index },
  }));
  actions.push({ type: "endTurn", side: "ai" });
  const selected = choose(state, actions, "charm-value");
  assert.strictEqual(selected.target.index, 1, "charm must steal the highest-value legal minion");

  const hiddenVariant = copy(state);
  state.hands.player = [card("hidden-a", 1, 9, 9)];
  hiddenVariant.hands.player = [card("hidden-b", 9, 0, 1)];
  assert.deepStrictEqual(
    choose(state, actions, "no-hidden-cheating"),
    choose(hiddenVariant, actions, "no-hidden-cheating"),
    "AI choice must not depend on hidden enemy card identities",
  );
}

{
  const state = baseState();
  state.heroes.ai.mana = 4;
  state.heroes.ai.maxMana = 6;
  state.hands.ai = [card(
    "qun_dong_zhuo",
    4,
    4,
    5,
    [{ trigger: "onPlay", op: "steal_enemy_minion_max_cost", maxCost: 1, target: "enemyMinion" }],
    "enemyMinion",
  )];
  state.boards.player = [
    minion("one-cost-small", 1, 1, { cost: 1, currentCost: 1 }),
    minion("one-cost-engine", 3, 4, {
      cost: 1,
      currentCost: 1,
      abilities: [{ trigger: "onDeath", op: "draw", amount: 1 }],
    }),
    minion("illegal-two-cost", 8, 8, { cost: 2, currentCost: 2 }),
  ];
  const actions = [0, 1].map((index) => ({
    type: "playCard",
    side: "ai",
    handIndex: 0,
    target: { zone: "board", side: "player", index },
  }));
  actions.push({ type: "endTurn", side: "ai" });
  const selected = choose(state, actions, "greed-value");
  assert.strictEqual(selected.target.index, 1, "greed must take the best legal one-cost minion");
  assert(actions.some((action) => JSON.stringify(action) === JSON.stringify(selected)));
}

{
  const state = baseState();
  state.heroes.ai.mana = 3;
  state.heroes.ai.maxMana = 6;
  state.boards.ai = [minion("armored-line", 5, 4)];
  state.hands.ai = [
    card(
      "qun_pang_tong",
      3,
      2,
      3,
      [{ trigger: "onPlay", op: "grant_all_allies_armor", amount: 1 }],
    ),
    card("plain-body", 3, 2, 3),
  ];
  const actions = [
    { type: "playCard", side: "ai", handIndex: 0 },
    { type: "playCard", side: "ai", handIndex: 1 },
    { type: "endTurn", side: "ai" },
  ];
  assert.strictEqual(
    choose(state, actions, "linked-armor").handIndex,
    0,
    "linked armor should gain value when allies are already deployed",
  );

  const empty = copy(state);
  empty.boards.ai = [];
  assert.strictEqual(
    choose(empty, actions, "linked-armor-empty").handIndex,
    1,
    "linked armor should not be wasted on an empty allied board",
  );
}

{
  const state = baseState();
  state.boards.ai = [
    minion("shield-ping", 1, 4),
    minion("qun_lu_bu", 8, 8),
  ];
  state.boards.player = [
    minion("keyword-shield", 6, 6, { shield: false, keywords: ["방패"] }),
  ];
  const actions = [
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 0 } },
    { type: "attack", side: "ai", attackerIndex: 1, target: { zone: "board", side: "player", index: 0 } },
    { type: "endTurn", side: "ai" },
  ];
  assert.strictEqual(
    choose(state, actions, "shield-efficiency").attackerIndex,
    0,
    "AI should strip a keyword-only shield with its smallest attacker",
  );
}

{
  const state = baseState();
  state.heroes.ai.mana = 10;
  state.heroes.ai.maxMana = 10;
  state.hands.ai = [
    card(
      "wei_cao_cao",
      6,
      4,
      6,
      [{ trigger: "onPlay", op: "buff_friendly_board", attack: 1, health: 1 }],
    ),
    card(
      "wu_sun_quan",
      4,
      2,
      4,
      [{ trigger: "onPlay", op: "summon_token", tokenId: "marine", count: 2 }],
    ),
  ];
  const actions = [
    { type: "playCard", side: "ai", handIndex: 0 },
    { type: "playCard", side: "ai", handIndex: 1 },
    { type: "endTurn", side: "ai" },
  ];
  assert.strictEqual(
    choose(state, actions, "sun-quan-before-cao-cao").handIndex,
    1,
    "AI should develop Sun Quan before Cao Cao when both fit in the turn",
  );
}

{
  const state = baseState();
  state.heroes.ai.mana = 6;
  state.heroes.ai.maxMana = 6;
  state.hands.ai = [
    card(
      "wu_zhou_yu",
      6,
      4,
      5,
      [{ trigger: "onPlay", op: "damage_all_enemies", amount: 2 }],
    ),
    card("plain-general", 6, 4, 5),
  ];
  state.boards.player = [
    minion("victim-a", 3, 2),
    minion("victim-b", 4, 2),
    minion("victim-c", 2, 1),
  ];
  const actions = [
    { type: "playCard", side: "ai", handIndex: 0 },
    { type: "playCard", side: "ai", handIndex: 1 },
    { type: "endTurn", side: "ai" },
  ];
  assert.strictEqual(
    choose(state, actions, "zhou-yu-sweep").handIndex,
    0,
    "AI should cash in Zhou Yu against a wide killable board",
  );
}

{
  const state = baseState();
  state.heroes.ai.mana = 3;
  state.heroes.ai.maxMana = 3;
  state.hands.ai = [
    card(
      "wu_lu_meng",
      3,
      2,
      4,
      [{ trigger: "onPlay", op: "ready_random_friendly" }],
    ),
    card("plain-officer", 3, 2, 4),
  ];
  const actions = [
    { type: "playCard", side: "ai", handIndex: 0 },
    { type: "playCard", side: "ai", handIndex: 1 },
    { type: "endTurn", side: "ai" },
  ];
  assert.strictEqual(
    choose(state, actions, "lu-meng-no-fizzle").handIndex,
    1,
    "AI should not play Lu Meng when there is no old exhausted ally",
  );
  state.boards.ai = [
    minion("spent-veteran", 6, 5, {
      canAttack: false,
      attacksLeft: 0,
      summonedTurn: 2,
    }),
  ];
  assert.strictEqual(
    choose(state, actions, "lu-meng-ready-six").handIndex,
    0,
    "AI should use Lu Meng to ready a valuable exhausted attacker",
  );
}

{
  const state = baseState();
  state.heroes.ai.mana = 3;
  state.heroes.ai.maxMana = 3;
  state.hands.ai = [
    card(
      "wu_lu_meng",
      3,
      2,
      4,
      [{ trigger: "onPlay", op: "ready_random_friendly" }],
    ),
  ];
  const ai = createAI({ rng: "lu-meng-stop" });
  const actions = [{ type: "playCard", side: "ai", handIndex: 0 }];
  assert.strictEqual(
    ai.chooseAction({
      state,
      legalActions: actions,
      simulate: simulateFrom(state),
    }),
    null,
    "when the runtime owns end-turn, AI should stop instead of firing a useless Lu Meng",
  );
}

{
  const state = baseState();
  state.heroes.player.health = 7;
  state.boards.ai = [minion("ready-three", 3, 4)];
  state.hands.ai = [
    card(
      "shu_huang_zhong",
      3,
      2,
      3,
      [{ trigger: "onPlay", op: "damage_target", amount: 4 }],
      "enemy",
    ),
  ];
  state.boards.player = [minion("tempting-target", 8, 4)];
  const actions = [
    { type: "playCard", side: "ai", handIndex: 0, target: { zone: "hero", side: "player" } },
    { type: "playCard", side: "ai", handIndex: 0, target: { zone: "board", side: "player", index: 0 } },
    { type: "endTurn", side: "ai" },
  ];
  assert.strictEqual(
    choose(state, actions, "combined-lethal").target.zone,
    "hero",
    "AI should see targeted damage plus ready board damage as lethal",
  );
}

{
  const state = baseState();
  state.boards.ai = [
    minion("wei_dian_wei", 4, 2, {
      abilities: [{ trigger: "onDeath", op: "damage_random_enemy", amount: 2 }],
    }),
    minion("plain-body", 4, 2),
  ];
  state.boards.player = [
    minion("trade-target", 5, 4, { guard: false, keywords: ["수호"] }),
  ];
  const actions = [
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 0 } },
    { type: "attack", side: "ai", attackerIndex: 1, target: { zone: "board", side: "player", index: 0 } },
    { type: "endTurn", side: "ai" },
  ];
  assert.strictEqual(
    choose(state, actions, "deathrattle-conversion").attackerIndex,
    0,
    "AI should convert a favorable deathrattle when equivalent trades exist",
  );
}

{
  const state = baseState();
  state.heroes.ai.mana = 9;
  state.heroes.ai.maxMana = 9;
  state.heroes.player.health = 8;
  state.boards.ai = [minion("guard-breaker", 2, 4)];
  state.boards.player = [minion("last-guard", 1, 2, { guard: true })];
  state.hands.ai = [
    card("qun_lu_bu", 9, 8, 8, [], "none", { keywords: ["돌진"] }),
  ];
  const actions = [
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 0 } },
    { type: "playCard", side: "ai", handIndex: 0 },
    { type: "endTurn", side: "ai" },
  ];
  assert.strictEqual(
    choose(state, actions, "guard-then-lu-bu").type,
    "attack",
    "1-ply planning should clear the final guard before deploying lethal Lu Bu",
  );
}

{
  const state = baseState();
  state.heroes.ai.mana = 5;
  state.heroes.ai.maxMana = 5;
  state.hands.ai = [
    card("single-five", 5, 3, 3),
    card("curve-two", 2, 2, 3),
    card("curve-three", 3, 4, 4),
  ];
  const actions = [
    { type: "playCard", side: "ai", handIndex: 0 },
    { type: "playCard", side: "ai", handIndex: 1 },
    { type: "playCard", side: "ai", handIndex: 2 },
    { type: "endTurn", side: "ai" },
  ];
  const selected = choose(state, actions, "two-card-curve");
  assert(
    selected.handIndex === 1 || selected.handIndex === 2,
    "1-ply planning should prefer the complete 2+3 curve over a weaker single five-drop",
  );
}

{
  const state = baseState();
  state.heroes.ai.mana = 5;
  state.heroes.ai.maxMana = 5;
  state.hands.ai = [
    card(
      "shu_zhuge_liang",
      5,
      3,
      5,
      [
        { trigger: "onPlay", op: "draw", amount: 2 },
        { trigger: "onPlay", op: "reduce_random_hand_cost", amount: 1, count: 1 },
      ],
    ),
    card("plain-strategist", 5, 3, 5),
    card("qun_lu_bu", 9, 8, 8, [], "none", { keywords: ["돌진"] }),
  ];
  const actions = [
    { type: "playCard", side: "ai", handIndex: 0 },
    { type: "playCard", side: "ai", handIndex: 1 },
    { type: "endTurn", side: "ai" },
  ];
  assert.strictEqual(
    choose(state, actions, "zhuge-finisher-setup").handIndex,
    0,
    "AI should prefer Zhuge Liang when it can refill and discount a held finisher",
  );
}

{
  const state = baseState();
  state.heroes.ai.mana = 1;
  state.heroes.ai.maxMana = 1;
  state.hands.ai = [
    card(
      "wu_sun_shangxiang",
      1,
      1,
      1,
      [{ trigger: "onPlay", op: "damage_target", amount: 1 }],
      "enemy",
    ),
    card("plain-one", 1, 1, 1),
  ];
  const actions = [
    { type: "playCard", side: "ai", handIndex: 0, target: { zone: "hero", side: "player" } },
    { type: "playCard", side: "ai", handIndex: 1 },
    { type: "endTurn", side: "ai" },
  ];
  assert.strictEqual(
    choose(state, actions, "preserve-precision-shot").handIndex,
    1,
    "AI should preserve targeted damage instead of wasting it on a healthy hero when equal development exists",
  );
}

{
  const state = baseState();
  state.heroes.ai.mana = 3;
  state.heroes.ai.maxMana = 3;
  state.boards.ai = [minion("early-attacker", 3, 4)];
  state.boards.player = [minion("equal-a", 2, 2), minion("equal-b", 2, 2)];
  const actions = [
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 0 } },
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 1 } },
    { type: "endTurn", side: "ai" },
  ];
  const targets = new Set();
  for (let seed = 0; seed < 24; seed += 1) {
    targets.add(choose(state, actions, `equal-choice-${seed}`).target.index);
  }
  assert.strictEqual(
    targets.size,
    2,
    "equally sound early trades should vary across seeds instead of looking mechanically perfect",
  );
}

{
  const state = baseState();
  state.heroes.ai.health = 8;
  state.heroes.ai.mana = 4;
  state.heroes.ai.maxMana = 4;
  state.boards.player = [
    minion("reply-raider-a", 4, 4),
    minion("reply-raider-b", 4, 4),
  ];
  state.hands.ai = [
    card("reply-guard", 4, 1, 6, [], "none", { keywords: ["수호"] }),
    card("reply-bruiser", 4, 5, 6),
  ];
  const actions = [
    { type: "playCard", side: "ai", handIndex: 0 },
    { type: "playCard", side: "ai", handIndex: 1 },
    { type: "endTurn", side: "ai" },
  ];
  const selected = choose(state, actions, "reply-lethal-block");
  assert.strictEqual(
    selected.handIndex,
    0,
    "bounded reply search should deploy a guard that blocks an obvious opponent lethal",
  );
}

{
  const state = baseState();
  state.heroes.ai.mana = 2;
  state.heroes.ai.maxMana = 6;
  state.heroes.player.health = 8;
  state.boards.ai = [
    minion("protected-finisher", 8, 3, {
      canAttack: false,
      attacksLeft: 0,
      summonedTurn: 2,
    }),
  ];
  state.boards.player = [minion("finisher-hunter", 3, 3)];
  state.hands.ai = [
    card("screening-guard", 2, 0, 4, [], "none", { keywords: ["수호"] }),
    card("greedy-body", 2, 4, 4),
  ];
  const actions = [
    { type: "playCard", side: "ai", handIndex: 0 },
    { type: "playCard", side: "ai", handIndex: 1 },
    { type: "endTurn", side: "ai" },
  ];
  const searched = createAI({ rng: "protect-own-lethal" }).chooseAction({
    state,
    legalActions: actions,
    simulate: simulateFrom(state),
  });
  const baseline = createAI({ rng: "protect-own-lethal", replySearch: false }).chooseAction({
    state,
    legalActions: actions,
    simulate: simulateFrom(state),
  });
  assert.strictEqual(
    searched.handIndex,
    0,
    "reply search should screen a fragile next-turn lethal threat with a guard",
  );
  assert.strictEqual(
    baseline.handIndex,
    1,
    "the one-ply baseline should expose the tactical difference in this pivot",
  );
}

{
  const state = baseState();
  state.heroes.ai.mana = 2;
  state.heroes.ai.maxMana = 6;
  state.boards.ai = [
    minion("sweep-victim-a", 2, 2, { canAttack: false, attacksLeft: 0 }),
    minion("sweep-victim-b", 2, 2, { canAttack: false, attacksLeft: 0 }),
    minion("sweep-victim-c", 2, 2, { canAttack: false, attacksLeft: 0 }),
  ];
  state.hands.ai = [card("last-overcommit", 2, 2, 2)];
  state.hands.player = [
    card(
      "wu_zhou_yu",
      6,
      4,
      5,
      [{ trigger: "onPlay", op: "damage_all_enemies", amount: 2 }],
    ),
  ];
  const actions = [
    { type: "playCard", side: "ai", handIndex: 0 },
    { type: "endTurn", side: "ai" },
  ];
  const searched = createAI({ rng: "reserve-last-card" }).chooseAction({
    state,
    legalActions: actions,
    simulate: simulateFrom(state),
  });
  const baseline = createAI({ rng: "reserve-last-card", replySearch: false }).chooseAction({
    state,
    legalActions: actions,
    simulate: simulateFrom(state),
  });
  assert.strictEqual(
    searched.type,
    "endTurn",
    "reply search should reserve the last card instead of feeding an obvious full sweep",
  );
  assert.strictEqual(
    baseline.type,
    "playCard",
    "the one-ply baseline should expose the overcommit difference in this pivot",
  );
}

{
  const state = baseState();
  state.heroes.ai.health = 9;
  state.boards.ai = [minion("latency-guard", 3, 6, { guard: true })];
  state.boards.player = [
    minion("latency-raider-a", 5, 5),
    minion("latency-raider-b", 4, 4),
  ];
  state.hands.player = [
    card(
      "latency-shot",
      3,
      2,
      2,
      [{ trigger: "onPlay", op: "damage_target", amount: 3 }],
      "enemy",
    ),
  ];
  const actions = [
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 0 } },
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 1 } },
    { type: "endTurn", side: "ai" },
  ];
  const started = process.hrtime.bigint();
  for (let iteration = 0; iteration < 240; iteration += 1) {
    const selected = choose(state, actions, `reply-latency-${iteration}`);
    assert(selected, "bounded reply search must always return a legal pivot action");
  }
  const averageMs = Number(process.hrtime.bigint() - started) / 240 / 1000000;
  assert(
    averageMs < 12,
    `bounded tactical reply search average ${averageMs.toFixed(3)}ms exceeds 12ms`,
  );
  console.log(
    `opponent-ai bounded reply pivot latency: ${averageMs.toFixed(3)}ms average over 240 decisions`,
  );
}

{
  const publicState = baseState();
  publicState.heroes.ai.health = 9;
  publicState.heroes.ai.mana = 5;
  publicState.heroes.ai.maxMana = 5;
  publicState.boards.ai = [minion("public-defender", 5, 6, { guard: true })];
  publicState.boards.player = [
    minion("public-raider-a", 4, 4),
    minion("public-raider-b", 4, 4),
  ];
  const directHand = copy(publicState);
  directHand.hands.player = [
    card(
      "hidden-direct",
      1,
      1,
      1,
      [{ trigger: "onPlay", op: "damage_target", amount: 9 }],
      "enemy",
    ),
  ];
  const passiveHand = copy(publicState);
  passiveHand.hands.player = [card("hidden-passive", 9, 8, 8)];
  const actions = [
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 0 } },
    { type: "attack", side: "ai", attackerIndex: 0, target: { zone: "board", side: "player", index: 1 } },
    { type: "endTurn", side: "ai" },
  ];
  const againstDirect = choose(directHand, actions, "hidden-hand-invariance");
  const againstPassive = choose(passiveHand, actions, "hidden-hand-invariance");
  assert.deepStrictEqual(
    againstDirect,
    againstPassive,
    "same public state and hand count must choose identically regardless of hidden card contents",
  );
}

{
  const state = baseState();
  state.heroes.ai.mana = 3;
  state.heroes.ai.maxMana = 8;
  state.boards.ai = [
    minion("stress-attacker-a", 2, 5),
    minion("stress-attacker-b", 3, 5),
    minion("stress-attacker-c", 4, 5),
    minion("stress-attacker-d", 5, 5),
  ];
  state.boards.player = [
    minion("stress-target-a", 1, 1),
    minion("stress-target-b", 1, 2),
    minion("stress-target-c", 1, 3),
    minion("stress-target-d", 1, 4),
    minion("stress-target-e", 1, 5),
  ];
  state.hands.ai = [
    card(
      "stress-precision",
      3,
      2,
      3,
      [{ trigger: "onPlay", op: "damage_target", amount: 2 }],
      "enemy",
    ),
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
  [
    { zone: "hero", side: "player" },
    { zone: "board", side: "player", index: 0 },
    { zone: "board", side: "player", index: 1 },
    { zone: "board", side: "player", index: 2 },
  ].forEach((target) => {
    actions.push({ type: "playCard", side: "ai", handIndex: 0, target });
  });
  actions.push({ type: "endTurn", side: "ai" });
  assert.strictEqual(actions.length, 29, "stress fixture must expose 29 legal choices");
  let simulations = 0;
  const simulation = simulateFrom(state);
  const selected = createAI({ rng: "late-board-cap" }).chooseAction({
    state,
    legalActions: actions,
    simulate(action) {
      simulations += 1;
      return simulation(action);
    },
  });
  assert(
    actions.some((action) => JSON.stringify(action) === JSON.stringify(selected)),
    "bounded pre-rank must still return a legal action",
  );
  assert(
    simulations <= 8,
    `29-action late board must fully simulate at most 8 candidates, saw ${simulations}`,
  );
  console.log(
    `opponent-ai simulation cap: ${simulations}/29 candidates fully simulated`,
  );
}

{
  const state = baseState();
  state.boards.ai = [minion("rear-guard-attacker", 4, 10)];
  state.boards.player = [
    minion("front-open-target", 9, 1, { row: "front", slot: 0 }),
    minion("rear-limited-guard", 1, 5, { guard: true, row: "rear", slot: 0 }),
  ];
  const frontAttack = {
    type: "attack",
    side: "ai",
    attackerIndex: 0,
    target: { zone: "board", side: "player", index: 0 },
  };
  const selected = choose(state, [frontAttack, { type: "endTurn", side: "ai" }], "rear-guard-front-open");
  assert.strictEqual(selected.type, "attack", "rear guard must leave front-row targets attackable");
  assert.strictEqual(selected.target.index, 0);
}

{
  const state = baseState();
  state.heroes.ai.mana = 3;
  state.hands.ai = [
    card("shu_wei_yan", 3, 3, 3, [{ trigger: "onPlay", op: "swap_random_hands" }]),
    card("own-expensive", 7, 7, 7),
  ];
  state.hands.player = [card("hidden-weak", 1, 0, 1)];
  const hiddenVariant = copy(state);
  hiddenVariant.hands.player = [card("hidden-finisher", 9, 12, 12, [{ trigger: "onPlay", op: "damage_enemy_hero", amount: 20 }])];
  const actions = [
    { type: "playCard", side: "ai", handIndex: 0, placement: { row: "rear", slot: 0 } },
    { type: "endTurn", side: "ai" },
  ];
  assert.deepStrictEqual(
    choose(state, actions, "betrayal-hidden-fairness"),
    choose(hiddenVariant, actions, "betrayal-hidden-fairness"),
    "Wei Yan must value only enemy hand count, never hidden card contents",
  );
}

{
  const state = baseState();
  state.heroes.player.health = 18;
  state.heroes.ai.health = 24;
  state.boards.ai = [minion("pressure-raider", 4, 6)];
  state.boards.player = [minion("low-threat-wall", 1, 6)];
  const face = {
    type: "attack",
    side: "ai",
    attackerIndex: 0,
    target: { zone: "hero", side: "player" },
  };
  const trade = {
    type: "attack",
    side: "ai",
    attackerIndex: 0,
    target: { zone: "board", side: "player", index: 0 },
  };
  const selected = choose(
    state,
    [face, trade, { type: "endTurn", side: "ai" }],
    "commander-pressure-low-threat",
  );
  assert.strictEqual(selected.type, "attack");
  assert.strictEqual(
    selected.target.zone,
    "hero",
    "AI should pressure the commander instead of feeding damage into a low-threat body",
  );
}

{
  const state = baseState();
  state.heroes.player.health = 18;
  state.heroes.ai.health = 8;
  state.boards.ai = [minion("defensive-trader", 4, 6)];
  state.boards.player = [minion("lethal-threat", 7, 3)];
  const face = {
    type: "attack",
    side: "ai",
    attackerIndex: 0,
    target: { zone: "hero", side: "player" },
  };
  const trade = {
    type: "attack",
    side: "ai",
    attackerIndex: 0,
    target: { zone: "board", side: "player", index: 0 },
  };
  const selected = choose(
    state,
    [face, trade, { type: "endTurn", side: "ai" }],
    "commander-pressure-defend-lethal",
  );
  assert.strictEqual(selected.type, "attack");
  assert.strictEqual(
    selected.target.zone,
    "board",
    "AI must still remove an imminent lethal threat instead of blindly attacking face",
  );
}

{
  const state = baseState();
  state.heroes.player.health = 7;
  state.boards.ai = [
    minion("lethal-chain-a", 3, 4),
    minion("lethal-chain-b", 4, 4),
  ];
  const actions = state.boards.ai.map((_attacker, attackerIndex) => ({
    type: "attack",
    side: "ai",
    attackerIndex,
    target: { zone: "hero", side: "player" },
  }));
  actions.push({ type: "endTurn", side: "ai" });
  const selected = choose(state, actions, "commander-pressure-lethal-chain");
  assert.strictEqual(selected.type, "attack");
  assert.strictEqual(
    selected.target.zone,
    "hero",
    "combined ready damage should start the commander lethal sequence immediately",
  );
}

console.log("opponent-ai tactical mocks: 128 deterministic scenario groups passed");
require("./formation-depth-test.cjs");
require("./commander-power-test.cjs");
