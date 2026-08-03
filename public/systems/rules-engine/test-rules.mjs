import assert from "node:assert/strict";
import "./index.js";
import "../card-data/index.js";

const { createGame, commanderDefinitions, constants } = globalThis.TK.modules.rulesEngine;
const actualHuangGai = globalThis.TK.modules.cardData
  .getCards()
  .find((card) => card.id === "wu_huang_gai");

assert.ok(actualHuangGai, "the production Huang Gai definition must be available");
assert.deepEqual(actualHuangGai.abilities, [
  { trigger: "onDeath", op: "damage_enemy_hero", amount: 1 },
]);

const definitions = [
  {
    id: "charger",
    name: "선봉 기병",
    faction: "촉",
    cost: 1,
    attack: 2,
    health: 2,
    keywords: ["돌진"],
    target: "none",
    abilities: [],
  },
  {
    id: "guardian",
    name: "철벽 장수",
    faction: "위",
    cost: 1,
    attack: 1,
    health: 4,
    keywords: ["수호", "방패"],
    target: "none",
    abilities: [],
  },
  {
    id: "shield-charger",
    name: "조자룡 회귀 검증",
    faction: "촉",
    cost: 1,
    attack: 3,
    health: 4,
    keywords: ["돌진", "돌파", "방패"],
    target: "none",
    abilities: [],
  },
  {
    id: "strategist",
    name: "화공 군사",
    faction: "오",
    cost: 1,
    attack: 1,
    health: 2,
    keywords: [],
    target: "enemy",
    abilities: [{ trigger: "onPlay", op: "damage_target", amount: 2 }],
    portrait: { weapon: "화염 깃털부채" },
  },
  {
    id: "marshal",
    name: "대도독",
    faction: "오",
    cost: 2,
    attack: 2,
    health: 3,
    keywords: [],
    target: "none",
    abilities: [
      { trigger: "onPlay", op: "buff_friendly_board", attack: 1, health: 1 },
      { trigger: "onDeath", op: "damage_enemy_hero", amount: 2 },
    ],
  },
  {
    id: "engineer",
    name: "공성 기술자",
    faction: "위",
    cost: 1,
    attack: 1,
    health: 1,
    keywords: [],
    target: "none",
    abilities: [
      { trigger: "onPlay", op: "summon_token", tokenId: "militia", count: 2 },
      { trigger: "onPlay", op: "draw", count: 1 },
    ],
  },
  {
    id: "war-drum",
    name: "진군의 북",
    faction: "군웅",
    cost: 1,
    attack: 1,
    health: 2,
    keywords: [],
    target: "none",
    abilities: [
      { trigger: "onPlay", op: "gain_armor", amount: 3 },
      { trigger: "onPlay", op: "buff_self", attack: 2, health: 2 },
      { trigger: "onPlay", op: "ready_random_friendly" },
    ],
  },
  {
    id: "firestorm",
    name: "연환 화공",
    faction: "오",
    cost: 1,
    attack: 1,
    health: 2,
    keywords: [],
    target: "none",
    abilities: [
      { trigger: "onPlay", op: "damage_all_enemies", amount: 1 },
      { trigger: "onPlay", op: "damage_random_enemy", amount: 1 },
      { trigger: "onPlay", op: "reduce_random_hand_cost", amount: 1 },
    ],
  },
  {
    id: "fresh-rally",
    name: "신병 격려",
    faction: "오",
    cost: 1,
    attack: 1,
    health: 2,
    keywords: [],
    target: "none",
    abilities: [
      { trigger: "onPlay", op: "summon_token", tokenId: "militia", count: 1 },
      { trigger: "onPlay", op: "ready_random_friendly" },
    ],
  },
  {
    id: "expensive",
    name: "중장 철기",
    faction: "위",
    cost: 4,
    attack: 4,
    health: 4,
    keywords: [],
    target: "none",
    abilities: [],
  },
  {
    id: "sniper",
    name: "노련한 명궁",
    faction: "촉",
    cost: 0,
    attack: 2,
    health: 2,
    keywords: ["저격"],
    target: "none",
    abilities: [],
  },
  {
    id: "charmer",
    name: "매혹의 무희",
    faction: "군웅",
    cost: 0,
    attack: 1,
    health: 2,
    keywords: [],
    target: "enemyMinion",
    abilities: [
      { trigger: "onPlay", op: "steal_enemy_minion", target: "enemyMinion" },
    ],
  },
  {
    id: "selective-charmer",
    name: "고위 장수의 매혹",
    faction: "군웅",
    cost: 0,
    attack: 1,
    health: 2,
    keywords: [],
    target: "enemyMinion",
    abilities: [
      {
        trigger: "onPlay",
        op: "steal_enemy_minion",
        minCost: 3,
        target: "enemyMinion",
      },
    ],
  },
  {
    id: "crowded-charmer",
    name: "만석의 매혹",
    faction: "군웅",
    cost: 0,
    attack: 1,
    health: 2,
    keywords: [],
    target: "enemyMinion",
    abilities: [
      { trigger: "onPlay", op: "summon_token", tokenId: "militia", count: 5 },
      { trigger: "onPlay", op: "steal_enemy_minion", target: "enemyMinion" },
    ],
  },
  {
    id: "chain-armor",
    name: "연환술 시험",
    faction: "군웅",
    cost: 0,
    attack: 1,
    health: 2,
    keywords: [],
    target: "none",
    abilities: [{ trigger: "onPlay", op: "grant_all_allies_armor", amount: 1 }],
  },
  {
    id: "greedy",
    name: "탐욕의 군주",
    faction: "군웅",
    cost: 0,
    attack: 1,
    health: 2,
    keywords: [],
    target: "enemyMinion",
    abilities: [
      {
        trigger: "onPlay",
        op: "steal_enemy_minion_max_cost",
        maxCost: 1,
        target: "enemyMinion",
      },
    ],
  },
  {
    id: "test-brotherhood",
    name: "의형제 시험",
    faction: "촉",
    cost: 0,
    attack: 1,
    health: 2,
    keywords: ["의형제"],
    target: "none",
    abilities: [{ trigger: "onPlay", op: "faction_link", linkKind: "brotherhood" }],
  },
  {
    id: "test-strategy-link",
    name: "군략 시험",
    faction: "위",
    cost: 2,
    attack: 1,
    health: 2,
    keywords: ["군략"],
    target: "none",
    abilities: [{ trigger: "onPlay", op: "faction_link", linkKind: "strategy" }],
  },
  {
    id: "test-kindle-link",
    name: "연화 시험",
    faction: "오",
    cost: 0,
    attack: 1,
    health: 2,
    keywords: ["연화"],
    target: "none",
    abilities: [{ trigger: "onPlay", op: "faction_link", linkKind: "kindle" }],
  },
  {
    id: "test-raid-link",
    name: "약탈 시험",
    faction: "남만",
    cost: 0,
    attack: 1,
    health: 2,
    keywords: ["약탈"],
    target: "none",
    abilities: [{ trigger: "onPlay", op: "faction_link", linkKind: "raid" }],
  },
  {
    id: "test-duelist",
    name: "관우 시험",
    faction: "촉",
    cost: 0,
    attack: 4,
    health: 5,
    keywords: ["돌진", "돌파", "의형제"],
    target: "enemyMinion",
    abilities: [{ trigger: "onPlay", op: "duel_target", target: "enemyMinion" }],
  },
  {
    id: "test-intimidator",
    name: "장비 시험",
    faction: "촉",
    cost: 0,
    attack: 2,
    health: 5,
    keywords: ["수호", "의형제"],
    target: "none",
    abilities: [
      {
        trigger: "onPlay",
        op: "weaken_enemy_front",
        amount: 1,
        duration: "nextEnemyTurnEnd",
      },
    ],
  },
  {
    id: "test-empty-fort",
    name: "제갈량 시험",
    faction: "촉",
    cost: 0,
    attack: 1,
    health: 3,
    keywords: ["의형제"],
    target: "none",
    abilities: [
      {
        trigger: "onPlay",
        op: "empty_fort",
        requiredRow: "rear",
        requiresSolo: true,
        charges: 1,
      },
    ],
  },
  {
    id: "test-patience",
    name: "사마의 시험",
    faction: "위",
    cost: 0,
    attack: 1,
    health: 5,
    keywords: ["군략"],
    target: "none",
    abilities: [{ trigger: "onPlay", op: "patience_counter", maxStored: 2 }],
  },
  {
    id: "test-burning-all",
    name: "주유 시험",
    faction: "오",
    cost: 0,
    attack: 1,
    health: 3,
    keywords: ["연화"],
    target: "none",
    abilities: [{ trigger: "onPlay", op: "apply_burning_all", amount: 1 }],
  },
  {
    id: "test-rear-raider",
    name: "감녕 시험",
    faction: "오",
    cost: 0,
    attack: 2,
    health: 3,
    keywords: ["돌진", "돌파", "연화"],
    target: "none",
    abilities: [
      {
        trigger: "onPlay",
        op: "buff_self",
        attack: 1,
        health: 0,
        requiredRow: "rear",
        duration: "thisTurn",
      },
    ],
  },
  {
    id: "test-lubu",
    name: "여포 시험",
    faction: "군웅",
    cost: 0,
    attack: 3,
    health: 7,
    keywords: ["돌진", "돌파", "천하무쌍", "약탈"],
    combat: { attacksPerTurn: 2, secondAttackSelfDamage: 2 },
    target: "none",
    abilities: [],
  },
];

const tokens = [
  {
    id: "militia",
    name: "의용병",
    faction: "군웅",
    cost: 0,
    attack: 1,
    health: 1,
    keywords: [],
    target: "none",
    abilities: [],
  },
];

const simultaneousDeathDefinitions = [
  actualHuangGai,
  {
    id: "test_ritual",
    name: "결전 준비",
    faction: "군웅",
    cost: 0,
    attack: 0,
    health: 1,
    keywords: [],
    target: "friendly",
    abilities: [
      { trigger: "onPlay", op: "damage_target", amount: 29 },
      { trigger: "onPlay", op: "damage_enemy_hero", amount: 29 },
      { trigger: "onPlay", op: "buff_self", attack: 0, health: -1 },
    ],
  },
  {
    id: "test_wound",
    name: "결전의 상처",
    faction: "군웅",
    cost: 0,
    attack: 0,
    health: 1,
    keywords: [],
    target: "any",
    abilities: [
      { trigger: "onPlay", op: "damage_target", amount: 1 },
      { trigger: "onPlay", op: "buff_self", attack: 0, health: -1 },
    ],
  },
  {
    id: "test_chain",
    name: "연쇄 화공대",
    faction: "오",
    cost: 0,
    attack: 1,
    health: 1,
    keywords: [],
    target: "none",
    abilities: [
      { trigger: "onDeath", op: "summon_token", tokenId: "test_death_guard", count: 1 },
      { trigger: "onDeath", op: "damage_all_enemies", amount: 1 },
    ],
  },
  {
    id: "test_plain",
    name: "결사 보병",
    faction: "군웅",
    cost: 1,
    attack: 1,
    health: 2,
    keywords: [],
    target: "none",
    abilities: [],
  },
  {
    id: "test_finisher",
    name: "즉결",
    faction: "군웅",
    cost: 0,
    attack: 0,
    health: 1,
    keywords: [],
    target: "none",
    abilities: [
      { trigger: "onPlay", op: "damage_enemy_hero", amount: 1 },
      { trigger: "onPlay", op: "heal_friendly_hero", amount: 30 },
    ],
  },
  {
    id: "commander_bomb",
    name: "동귀어진병",
    faction: "군웅",
    cost: 0,
    attack: 0,
    health: 1,
    keywords: [],
    target: "none",
    abilities: [{ trigger: "onDeath", op: "damage_enemy_hero", amount: 1 }],
  },
];

const simultaneousDeathTokens = [
  {
    id: "test_death_guard",
    name: "화공 방진",
    faction: "오",
    cost: 0,
    attack: 0,
    health: 1,
    keywords: ["방패"],
    target: "none",
    abilities: [],
  },
];

function deckOf(id, count = 20) {
  return Array.from({ length: count }, () => id);
}

function playFirst(game, type, predicate = () => true) {
  const action = game.getLegalActions().find(
    (candidate) => candidate.type === type && predicate(candidate),
  );
  assert.ok(action, `Expected legal ${type} action`);
  const result = game.applyAction(action);
  assert.equal(result.ok, true, result.error);
  return action;
}

function testInitialStateAndSnapshotIsolation() {
  const events = [];
  const game = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("charger"),
    aiDeck: deckOf("guardian"),
    seed: 11,
    emit: (type) => events.push(type),
  });
  const state = game.getState();
  assert.equal(state.phase, "playing");
  assert.equal(state.turn, "player");
  assert.equal(state.heroes.player.mana, 1);
  assert.equal(state.heroes.player.maxMana, 1);
  assert.equal(state.hands.player.length, 4);
  assert.equal(state.hands.ai.length, 4);
  assert.equal(state.decks.player.length, 16);
  assert.ok(events.includes("game:start"));
  assert.ok(events.includes("turn:start"));

  state.heroes.player.health = -999;
  state.hands.player.length = 0;
  const untouched = game.getState();
  assert.equal(untouched.heroes.player.health, 30);
  assert.equal(untouched.hands.player.length, 4);
}

function testOpeningHandCostBalance() {
  const balancedDeck = [
    ...deckOf("charger", 10),
    ...deckOf("expensive", 10),
  ];

  for (let seed = 0; seed < 256; seed += 1) {
    const game = createGame({
      definitions,
      tokens,
      playerDeck: balancedDeck,
      aiDeck: balancedDeck,
      seed: `opening-curve-${seed}`,
    });
    const state = game.getState();
    for (const side of ["player", "ai"]) {
      const lowCostCards = state.hands[side].filter(
        (card) => card.currentCost <= 2,
      ).length;
      assert.ok(
        lowCostCards >= 1 && lowCostCards <= 2,
        `${side} opening hand must contain one or two low-cost cards for seed ${seed}`,
      );
    }
  }
}

function testTurnManaSummoningAndBoardLimit() {
  const game = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("charger"),
    aiDeck: deckOf("charger"),
    seed: 22,
  });
  playFirst(game, "playCard");
  let state = game.getState();
  assert.equal(state.boards.player.length, 1);
  assert.equal(state.boards.player[0].canAttack, true, "charge should bypass summoning sickness");
  assert.equal(state.heroes.player.mana, 0);
  playFirst(game, "attack", (action) => action.target.zone === "hero");
  assert.equal(game.getState().heroes.ai.health, 28);
  playFirst(game, "endTurn");
  assert.equal(game.getState().turn, "ai");
  assert.equal(game.getState().heroes.ai.maxMana, 1);

  // Fill a board through successive turns and ensure the sixth card is not playable.
  for (let loop = 0; loop < 12 && game.getState().phase === "playing"; loop += 1) {
    const side = game.getState().turn;
    const playable = game.getLegalActions().filter((action) => action.type === "playCard");
    if (playable.length && game.getState().boards[side].length < constants.BOARD_LIMIT) {
      game.applyAction(playable[0]);
    }
    game.endTurn(side);
  }
  state = game.getState();
  assert.ok(state.boards.player.length <= constants.BOARD_LIMIT);
  assert.ok(state.boards.ai.length <= constants.BOARD_LIMIT);
}

function testTargetingGuardShieldAndCombat() {
  const events = [];
  const game = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("strategist"),
    aiDeck: deckOf("guardian"),
    seed: 33,
    emit: (type, detail) => events.push({ type, detail }),
  });
  const targetHero = game
    .getLegalActions()
    .find(
      (action) =>
        action.type === "playCard" &&
        action.target &&
        action.target.zone === "hero" &&
        action.target.side === "ai",
    );
  assert.ok(targetHero);
  assert.equal(game.applyAction(targetHero).ok, true);
  assert.equal(game.getState().heroes.ai.health, 28);
  game.endTurn("player");
  playFirst(game, "playCard");
  game.endTurn("ai");

  // The player's first minion is now ready and must attack the enemy guard.
  const attacks = game.getLegalActions().filter((action) => action.type === "attack");
  assert.ok(attacks.length > 0);
  assert.ok(attacks.every((action) => action.target.zone === "board"));
  const heroAttempt = game.attack("player", 0, { zone: "hero", side: "ai" });
  assert.equal(heroAttempt.ok, false);
  const guardBlock = events.find(
    (event) =>
      event.type === "action:invalid" &&
      event.detail.reason === "invalid_attack_target" &&
      event.detail.blockedByGuard,
  );
  assert.ok(guardBlock, "a guard rejection must expose an explicit audiovisual cue");
  assert.equal(guardBlock.detail.side, "player");
  assert.equal(guardBlock.detail.targetSide, "ai");
  assert.deepEqual(guardBlock.detail.target, { zone: "hero", side: "ai" });
  assert.deepEqual(guardBlock.detail.guardTargets, [
    { zone: "board", side: "ai", index: 0 },
  ]);
  const guardAttack = game.getLegalActions().find((action) => action.type === "attack");
  assert.equal(game.applyAction(guardAttack).ok, true);
  const guardian = game.getState().boards.ai[0];
  assert.equal(guardian.shield, false, "first damage instance should remove shield");
  assert.equal(guardian.currentHealth, 4, "shield should absorb the whole hit");
  const shieldEvent = events.find(
    (event) =>
      event.type === "minion:damage" &&
      event.detail.instanceId === guardian.instanceId,
  );
  assert.deepEqual(shieldEvent.detail.target, { zone: "board", side: "ai", index: 0 });
  assert.equal(shieldEvent.detail.absorbedByShield, true);
  assert.equal(shieldEvent.detail.blockedByShield, true);
  assert.equal(shieldEvent.detail.shieldBroken, true);
  const attackStart = events.find((event) => event.type === "attack:start");
  assert.deepEqual(attackStart.detail.attacker, {
    zone: "board",
    side: "player",
    index: 0,
  });
  assert.deepEqual(attackStart.detail.attackerMeta, {
    instanceId: attackStart.detail.attackerId,
    cardId: "strategist",
    id: "strategist",
    name: "화공 군사",
    faction: "오",
    role: "",
    keywords: [],
    weapon: "화염 깃털부채",
    attack: 1,
    health: 2,
  });
  assert.equal(attackStart.detail.cardId, "strategist");
  assert.equal(attackStart.detail.name, "화공 군사");
  assert.equal(attackStart.detail.faction, "오");
  assert.deepEqual(attackStart.detail.keywords, []);
  assert.equal(attackStart.detail.weapon, "화염 깃털부채");
  const heroDamage = events.find((event) => event.type === "hero:damage");
  assert.deepEqual(heroDamage.detail.target, { zone: "hero", side: "ai" });
}

function testGuardTakesPriorityOverSnipe() {
  const game = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("sniper"),
    aiDeck: deckOf("guardian"),
    seed: 331,
  });
  playFirst(game, "playCard");
  game.endTurn("player");
  playFirst(game, "playCard");
  game.endTurn("ai");

  const attacks = game
    .getLegalActions()
    .filter((action) => action.type === "attack" && action.attackerIndex === 0);
  assert.ok(
    attacks.every((action) => action.target.zone === "board"),
    "수호는 저격과 돌파보다 우선해 지휘관과 비수호 장수를 보호해야 한다",
  );
  assert.ok(
    attacks.some((action) => action.target.zone === "board" && action.target.index === 0),
    "저격 장수도 적 수호 장수를 정상 공격할 수 있어야 한다",
  );
  const rejected = game.attack("player", 0, { zone: "hero", side: "ai" });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error, "invalid_attack_target");
  assert.equal(game.getState().heroes.ai.health, 30);
}

function testStealEnemyMinionAndDelayedAttack() {
  const events = [];
  const game = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("charmer"),
    aiDeck: deckOf("charger"),
    seed: 332,
    emit: (type, detail) => events.push({ type, detail }),
  });
  game.endTurn("player");
  playFirst(game, "playCard");
  const stolenInstanceId = game.getState().boards.ai[0].instanceId;
  game.endTurn("ai");

  const handIndex = game.getState().hands.player.findIndex((card) => card.id === "charmer");
  const wrongTarget = game.playCard("player", handIndex, { zone: "hero", side: "ai" });
  assert.equal(wrongTarget.ok, false);
  assert.equal(wrongTarget.error, "invalid_target");

  const stealAction = game
    .getLegalActions()
    .find(
      (action) =>
        action.type === "playCard" &&
        action.handIndex === handIndex &&
        action.target?.zone === "board" &&
        action.target.side === "ai",
    );
  assert.ok(stealAction);
  assert.equal(game.applyAction(stealAction).ok, true);

  let state = game.getState();
  assert.equal(state.boards.ai.length, 0);
  const stolenIndex = state.boards.player.findIndex(
    (minion) => minion.instanceId === stolenInstanceId,
  );
  assert.notEqual(stolenIndex, -1);
  assert.equal(state.boards.player[stolenIndex].controller, "player");
  assert.equal(state.boards.player[stolenIndex].canAttack, false);
  assert.equal(state.boards.player[stolenIndex].attacksLeft, 0);
  assert.equal(
    game.attack("player", stolenIndex, { zone: "hero", side: "ai" }).error,
    "attacker_not_ready",
  );

  const stealEffect = events.find(
    (event) => event.type === "effect:trigger" && event.detail.op === "steal_enemy_minion",
  );
  assert.ok(stealEffect);
  assertCompleteEffectPayload(stealEffect.detail);
  assert.equal(stealEffect.detail.result.stolenTarget.instanceId, stolenInstanceId);
  assert.equal(stealEffect.detail.result.stolenTarget.from.side, "ai");
  assert.equal(stealEffect.detail.result.stolenTarget.to.side, "player");
  assert.equal(stealEffect.detail.result.stolenTarget.canAttack, false);

  game.endTurn("player");
  game.endTurn("ai");
  state = game.getState();
  const readyIndex = state.boards.player.findIndex(
    (minion) => minion.instanceId === stolenInstanceId,
  );
  assert.equal(state.boards.player[readyIndex].canAttack, true);
  assert.ok(
    game
      .getLegalActions()
      .some((action) => action.type === "attack" && action.attackerIndex === readyIndex),
  );
}

function testStealBoardCapacityAndMaxCostValidation() {
  const crowdedEvents = [];
  const crowdedGame = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("crowded-charmer"),
    aiDeck: deckOf("charger"),
    seed: 333,
    emit: (type, detail) => crowdedEvents.push({ type, detail }),
  });
  crowdedGame.endTurn("player");
  playFirst(crowdedGame, "playCard");
  crowdedGame.endTurn("ai");
  playFirst(crowdedGame, "playCard");
  const crowdedState = crowdedGame.getState();
  assert.equal(crowdedState.boards.player.length, constants.BOARD_LIMIT);
  assert.equal(crowdedState.boards.ai.length, 1, "보드가 가득 차면 대상은 적 보드에 남아야 한다");
  const boardFullEffect = crowdedEvents.find(
    (event) => event.type === "effect:trigger" && event.detail.op === "steal_enemy_minion",
  );
  assert.ok(boardFullEffect);
  assertCompleteEffectPayload(boardFullEffect.detail);
  assert.equal(boardFullEffect.detail.result.fizzled, true);
  assert.equal(boardFullEffect.detail.result.reason, "board_full");

  const expensiveGame = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("greedy"),
    aiDeck: deckOf("expensive"),
    seed: 334,
  });
  for (let loop = 0; loop < 12 && expensiveGame.getState().boards.ai.length === 0; loop += 1) {
    const side = expensiveGame.getState().turn;
    const play = expensiveGame.getLegalActions().find((action) => action.type === "playCard");
    if (side === "ai" && play) expensiveGame.applyAction(play);
    expensiveGame.endTurn(side);
  }
  assert.equal(expensiveGame.getState().boards.ai[0].id, "expensive");
  assert.equal(
    expensiveGame.getLegalActions().some((action) => action.type === "playCard"),
    false,
    "탐욕은 비용 제한을 넘는 장수를 법적 대상으로 내놓지 않아야 한다",
  );
  const greedyIndex = expensiveGame
    .getState()
    .hands.player.findIndex((card) => card.id === "greedy");
  const expensiveAttempt = expensiveGame.playCard("player", greedyIndex, {
    zone: "board",
    side: "ai",
    index: 0,
  });
  assert.equal(expensiveAttempt.ok, false);
  assert.equal(expensiveAttempt.error, "invalid_target");

  const lowCostEvents = [];
  const lowCostGame = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("greedy"),
    aiDeck: deckOf("charger"),
    seed: 335,
    emit: (type, detail) => lowCostEvents.push({ type, detail }),
  });
  lowCostGame.endTurn("player");
  playFirst(lowCostGame, "playCard");
  lowCostGame.endTurn("ai");
  playFirst(lowCostGame, "playCard");
  const lowCostState = lowCostGame.getState();
  assert.equal(lowCostState.boards.ai.length, 0);
  assert.ok(lowCostState.boards.player.some((minion) => minion.id === "charger"));
  const greedyEffect = lowCostEvents.find(
    (event) =>
      event.type === "effect:trigger" &&
      event.detail.op === "steal_enemy_minion_max_cost",
  );
  assert.ok(greedyEffect);
  assertCompleteEffectPayload(greedyEffect.detail);
  assert.equal(greedyEffect.detail.result.maxCost, 1);
  assert.equal(greedyEffect.detail.result.targetCost, 1);
}

function testStealMinimumCostValidation() {
  const cheapGame = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("selective-charmer"),
    aiDeck: deckOf("charger"),
    seed: 337,
  });
  cheapGame.endTurn("player");
  playFirst(cheapGame, "playCard");
  cheapGame.endTurn("ai");
  assert.equal(cheapGame.getState().boards.ai[0].cost, 1);
  assert.equal(
    cheapGame.getLegalActions().some((action) => action.type === "playCard"),
    false,
    "비용 3 미만 장수는 매혹의 법적 대상으로 생성되면 안 된다",
  );
  const cheapCharmIndex = cheapGame
    .getState()
    .hands.player.findIndex((card) => card.id === "selective-charmer");
  const cheapAttempt = cheapGame.playCard("player", cheapCharmIndex, {
    zone: "board",
    side: "ai",
    index: 0,
  });
  assert.equal(cheapAttempt.ok, false);
  assert.equal(cheapAttempt.error, "invalid_target");

  const eliteEvents = [];
  const eliteGame = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("selective-charmer"),
    aiDeck: deckOf("expensive"),
    seed: 338,
    emit: (type, detail) => eliteEvents.push({ type, detail }),
  });
  for (let loop = 0; loop < 12 && eliteGame.getState().boards.ai.length === 0; loop += 1) {
    const side = eliteGame.getState().turn;
    const expensivePlay = eliteGame
      .getLegalActions()
      .find((action) => action.type === "playCard" && side === "ai");
    if (expensivePlay) eliteGame.applyAction(expensivePlay);
    eliteGame.endTurn(side);
  }
  assert.equal(eliteGame.getState().boards.ai[0].cost, 4);
  const eliteCharm = eliteGame
    .getLegalActions()
    .find(
      (action) =>
        action.type === "playCard" &&
        action.target?.zone === "board" &&
        action.target.side === "ai",
    );
  assert.ok(eliteCharm, "비용 3 이상 장수는 매혹 대상으로 제공되어야 한다");
  assert.equal(eliteGame.applyAction(eliteCharm).ok, true);
  assert.ok(eliteGame.getState().boards.player.some((minion) => minion.id === "expensive"));
  const charmEffect = eliteEvents.find(
    (event) =>
      event.type === "effect:trigger" &&
      event.detail.op === "steal_enemy_minion",
  );
  assert.ok(charmEffect);
  assert.equal(charmEffect.detail.result.minCost, 3);
  assert.equal(charmEffect.detail.result.targetCost, 4);
}

function testGrantAllAlliesArmorAndDamageAbsorption() {
  const events = [];
  const game = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("chain-armor"),
    aiDeck: deckOf("charger"),
    seed: 336,
    emit: (type, detail) => events.push({ type, detail }),
  });
  playFirst(game, "playCard");
  playFirst(game, "playCard");
  let state = game.getState();
  assert.equal(state.boards.player[0].currentArmor, 2);
  assert.equal(state.boards.player[0].armor, 2);
  assert.equal(state.boards.player[1].currentArmor, 1);
  assert.equal(state.boards.player[1].armor, 1);

  const armorEffects = events.filter(
    (event) =>
      event.type === "effect:trigger" && event.detail.op === "grant_all_allies_armor",
  );
  assert.equal(armorEffects.length, 2);
  armorEffects.forEach((event) => assertCompleteEffectPayload(event.detail));
  assert.equal(armorEffects[1].detail.result.actualArmorGranted, 2);
  assert.equal(armorEffects[1].detail.result.affectedTargets.length, 2);

  game.endTurn("player");
  playFirst(game, "playCard");
  const armoredInstanceId = state.boards.player[0].instanceId;
  const attack = game
    .getLegalActions()
    .find(
      (action) =>
        action.type === "attack" &&
        action.target.zone === "board" &&
        action.target.index === 0,
    );
  assert.ok(attack);
  assert.equal(game.applyAction(attack).ok, true);
  state = game.getState();
  const armored = state.boards.player.find(
    (minion) => minion.instanceId === armoredInstanceId,
  );
  assert.equal(armored.currentHealth, 2);
  assert.equal(armored.currentArmor, 0);
  const absorbed = events.find(
    (event) =>
      event.type === "minion:damage" &&
      event.detail.instanceId === armoredInstanceId &&
      event.detail.armorAbsorbed === 2,
  );
  assert.ok(absorbed);
  assert.equal(absorbed.detail.actualDamage, 0);
}

function testAttackingShieldMinionBlocksRetaliation() {
  const events = [];
  const game = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("shield-charger"),
    aiDeck: deckOf("charger"),
    seed: 34,
    emit: (type, detail) => events.push({ type, detail }),
  });

  // Leave the player's shield + charge minion in hand until the AI establishes
  // a target. This reproduces Zhao Yun attacking into a retaliation hit.
  assert.equal(game.endTurn("player").ok, true);
  playFirst(game, "playCard");
  assert.equal(game.endTurn("ai").ok, true);
  playFirst(game, "playCard");

  const before = game.getState().boards.player[0];
  assert.equal(before.shield, true);
  assert.equal(before.currentHealth, 4);
  const attack = game
    .getLegalActions()
    .find((action) => action.type === "attack" && action.target.zone === "board");
  assert.ok(attack, "the shield + charge minion must be able to attack immediately");
  assert.equal(game.applyAction(attack).ok, true);

  const state = game.getState();
  const attacker = state.boards.player[0];
  assert.equal(attacker.shield, false, "retaliation must consume the active shield");
  assert.equal(attacker.currentHealth, 4, "the shield must absorb all retaliation damage");
  assert.equal(state.boards.ai.length, 0, "the attacked minion should still take lethal damage");

  const retaliation = events.find(
    (event) =>
      event.type === "minion:damage" &&
      event.detail.instanceId === attacker.instanceId &&
      event.detail.source?.op === "retaliation",
  );
  assert.ok(retaliation, "retaliation must emit its own damage result");
  assert.deepEqual(retaliation.detail.target, {
    zone: "board",
    side: "player",
    index: 0,
  });
  assert.equal(retaliation.detail.amount, 0);
  assert.equal(retaliation.detail.absorbedByShield, true);
  assert.equal(retaliation.detail.blockedByShield, true);
  assert.equal(retaliation.detail.shieldBroken, true);
  assert.equal(retaliation.detail.health, 4);

  const retaliationLog = state.log.find(
    (entry) =>
      entry.type === "minion:damage" &&
      entry.data.instanceId === attacker.instanceId &&
      entry.data.source?.op === "retaliation",
  );
  assert.ok(retaliationLog, "the combat log must preserve the shielded retaliation result");
  assert.equal(retaliationLog.data.amount, 0);
  assert.equal(retaliationLog.data.blockedByShield, true);
  assert.equal(retaliationLog.data.shieldBroken, true);
}

function testDslSummonsDrawBuffAndDeath() {
  const game = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("engineer"),
    aiDeck: deckOf("charger"),
    seed: 44,
  });
  const handBefore = game.getState().hands.player.length;
  playFirst(game, "playCard");
  let state = game.getState();
  assert.equal(state.boards.player.length, 3, "engineer should summon two tokens");
  assert.equal(state.hands.player.length, handBefore, "play then draw should restore hand count");
  game.endTurn("player");
  game.endTurn("ai");

  // A fresh game with the marshal verifies board-wide buff and its deathrattle contract.
  const buffGame = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("marshal"),
    aiDeck: deckOf("charger"),
    seed: 45,
  });
  buffGame.endTurn("player");
  buffGame.endTurn("ai");
  playFirst(buffGame, "playCard");
  state = buffGame.getState();
  assert.equal(state.boards.player[0].currentAttack, 3);
  assert.equal(state.boards.player[0].currentHealth, 4);
}

function testRemainingDslOperators() {
  const readyGame = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("war-drum"),
    aiDeck: deckOf("charger"),
    seed: 46,
  });
  playFirst(readyGame, "playCard");
  let state = readyGame.getState();
  assert.equal(state.heroes.player.armor, 3);
  assert.equal(state.boards.player[0].currentAttack, 3);
  assert.equal(state.boards.player[0].currentHealth, 4);
  assert.equal(
    state.boards.player[0].canAttack,
    false,
    "ready effect must never select its source",
  );
  readyGame.endTurn("player");
  readyGame.endTurn("ai");
  playFirst(readyGame, "attack", (action) => action.target.zone === "hero");
  state = readyGame.getState();
  assert.equal(state.boards.player[0].attacksLeft, 0);
  playFirst(readyGame, "playCard");
  state = readyGame.getState();
  assert.equal(
    state.boards.player[0].attacksLeft,
    1,
    "an older friendly minion that already attacked should be readied",
  );
  assert.equal(state.boards.player[0].canAttack, true);
  assert.equal(
    state.boards.player[1].canAttack,
    false,
    "the newly played source must remain summoning sick",
  );

  const freshGame = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("fresh-rally"),
    aiDeck: deckOf("charger"),
    seed: 461,
  });
  playFirst(freshGame, "playCard");
  state = freshGame.getState();
  assert.equal(state.boards.player.length, 2);
  assert.ok(
    state.boards.player.every(
      (minion) => minion.summonedTurn === state.turnNumber && !minion.canAttack,
    ),
    "source and same-turn summoned allies must both be excluded from ready candidates",
  );

  const fireGame = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("firestorm"),
    aiDeck: deckOf("charger"),
    seed: 47,
  });
  fireGame.endTurn("player");
  playFirst(fireGame, "playCard");
  fireGame.endTurn("ai");
  playFirst(fireGame, "playCard");
  state = fireGame.getState();
  assert.ok(state.boards.ai.length <= 1, "area and random damage must resolve enemy casualties");

  const reductionGame = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("firestorm"),
    aiDeck: deckOf("charger"),
    seed: 1,
  });
  const fireAction = reductionGame
    .getLegalActions()
    .find((action) => action.type === "playCard");
  assert.ok(fireAction);
  reductionGame.applyAction(fireAction);
  const afterCosts = reductionGame.getState().hands.player.map((card) => card.cost);
  assert.ok(afterCosts.some((cost) => cost === 0), "cost reducer should modify an eligible card");
}

function testDeathEventPreservesBoardAnchor() {
  const events = [];
  const game = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("firestorm"),
    aiDeck: deckOf("charger"),
    seed: 48,
    emit: (type, detail) => events.push({ type, detail }),
  });
  game.endTurn("player");
  playFirst(game, "playCard");
  game.endTurn("ai");
  playFirst(game, "playCard");
  const death = events.find(
    (event) => event.type === "minion:death" && event.detail.side === "ai",
  );
  assert.ok(death, "firestorm should kill the enemy minion");
  assert.equal(death.detail.index, 0);
  assert.deepEqual(death.detail.target, { zone: "board", side: "ai", index: 0 });
}

function assertCompleteEffectPayload(detail) {
  [
    "actor",
    "cardName",
    "source",
    "op",
    "target",
    "amount",
    "result",
  ].forEach((field) => {
    assert.ok(
      Object.prototype.hasOwnProperty.call(detail, field),
      `effect:trigger must always include ${field}`,
    );
  });
  [
    "success",
    "fizzled",
    "reason",
    "blockedByShield",
    "shieldBroken",
    "actualDamage",
    "actualSummonCount",
    "actualDrawCount",
    "discountedTarget",
  ].forEach((field) => {
    assert.ok(
      Object.prototype.hasOwnProperty.call(detail.result, field),
      `effect result must always include ${field}`,
    );
  });
}

function testEffectOutcomePayloadContract() {
  const engineerEvents = [];
  const engineerGame = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("engineer"),
    aiDeck: deckOf("charger"),
    seed: 481,
    emit: (type, detail) => engineerEvents.push({ type, detail }),
  });
  playFirst(engineerGame, "playCard");
  const effects = engineerEvents.filter((event) => event.type === "effect:trigger");
  assert.ok(effects.length >= 4);
  effects.forEach((event) => assertCompleteEffectPayload(event.detail));
  const summon = effects.find(
    (event) =>
      event.detail.op === "summon_token" &&
      event.detail.result.requestedSummonCount === 2,
  );
  assert.ok(summon);
  assert.equal(summon.detail.cardName, "공성 기술자");
  assert.equal(summon.detail.actor, "player");
  assert.equal(summon.detail.result.actualSummonCount, 2);
  const draw = effects.find((event) => event.detail.op === "draw");
  assert.ok(draw);
  assert.equal(draw.detail.result.actualDrawCount, 1);
  assert.equal(draw.detail.result.cardsPulledCount, 1);
  assert.equal(draw.detail.result.cards.length, 1);
  const engineerLog = engineerGame.getState().log
    .filter((entry) => entry.type === "effect:trigger")
    .map((entry) => entry.message);
  assert.ok(engineerLog.some((message) => message.includes("공성 기술자: 의용병 2기 소환")));
  assert.ok(engineerLog.some((message) => message.includes("공성 기술자: 카드 1장 드로우")));

  const fizzleEvents = [];
  const fizzleGame = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("war-drum"),
    aiDeck: deckOf("charger"),
    seed: 482,
    emit: (type, detail) => fizzleEvents.push({ type, detail }),
  });
  playFirst(fizzleGame, "playCard");
  const fizzle = fizzleEvents.find(
    (event) =>
      event.type === "effect:trigger" &&
      event.detail.op === "ready_random_friendly",
  );
  assert.ok(fizzle);
  assertCompleteEffectPayload(fizzle.detail);
  assert.equal(fizzle.detail.target, null);
  assert.equal(fizzle.detail.result.success, false);
  assert.equal(fizzle.detail.result.fizzled, true);
  assert.equal(fizzle.detail.result.reason, "target_missing");
  assert.ok(
    fizzleGame
      .getState()
      .log.some(
        (entry) =>
          entry.type === "effect:trigger" &&
          entry.message === "진군의 북: 효과 불발 · 대상 없음",
      ),
  );

  const shieldEvents = [];
  const shieldGame = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("strategist"),
    aiDeck: deckOf("guardian"),
    seed: 483,
    emit: (type, detail) => shieldEvents.push({ type, detail }),
  });
  shieldGame.endTurn("player");
  playFirst(shieldGame, "playCard");
  shieldGame.endTurn("ai");
  const shieldTarget = shieldGame
    .getLegalActions()
    .find(
      (action) =>
        action.type === "playCard" &&
        action.target?.zone === "board" &&
        action.target.side === "ai",
    );
  assert.ok(shieldTarget);
  shieldGame.applyAction(shieldTarget);
  const blocked = shieldEvents.find(
    (event) =>
      event.type === "effect:trigger" &&
      event.detail.op === "damage_target" &&
      event.detail.target?.zone === "board",
  );
  assert.ok(blocked);
  assertCompleteEffectPayload(blocked.detail);
  assert.equal(blocked.detail.result.blockedByShield, true);
  assert.equal(blocked.detail.result.shieldBroken, true);
  assert.equal(blocked.detail.result.actualDamage, 0);
  assert.ok(
    shieldGame
      .getState()
      .log.some(
        (entry) =>
          entry.type === "effect:trigger" &&
          entry.message.includes("화공 군사: 철벽 장수 대상 효과 · 방패로 막힘"),
      ),
  );

  const discountEvents = [];
  const discountGame = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("firestorm"),
    aiDeck: deckOf("charger"),
    seed: 484,
    emit: (type, detail) => discountEvents.push({ type, detail }),
  });
  playFirst(discountGame, "playCard");
  const discount = discountEvents.find(
    (event) =>
      event.type === "effect:trigger" &&
      event.detail.op === "reduce_random_hand_cost",
  );
  assert.ok(discount);
  assertCompleteEffectPayload(discount.detail);
  assert.equal(discount.detail.result.discountedTarget.costBefore, 1);
  assert.equal(discount.detail.result.discountedTarget.costAfter, 0);
  assert.equal(discount.detail.target.zone, "hand");
  assert.ok(
    discountGame
      .getState()
      .log.some(
        (entry) =>
          entry.type === "effect:trigger" &&
          entry.message.includes("연환 화공: 연환 화공 비용 1→0"),
      ),
  );
}

function repeatedScenarioDeck(ids) {
  return Array.from({ length: 20 }, (_unused, index) => ids[index % ids.length]);
}

function handContainsEvery(state, side, requiredIds) {
  const ids = new Set(state.hands[side].map((card) => card.id));
  return requiredIds.every((id) => ids.has(id));
}

function createPreparedScenario(playerIds, aiIds, requiredPlayer, requiredAi) {
  for (let seed = 700; seed < 5000; seed += 1) {
    const events = [];
    const game = createGame({
      definitions: simultaneousDeathDefinitions,
      tokens: simultaneousDeathTokens,
      playerDeck: repeatedScenarioDeck(playerIds),
      aiDeck: repeatedScenarioDeck(aiIds),
      seed,
      emit: (type, detail) => events.push({ type, detail }),
    });
    const state = game.getState();
    if (
      handContainsEvery(state, "player", requiredPlayer) &&
      handContainsEvery(state, "ai", requiredAi)
    ) {
      return { game, events, seed };
    }
  }
  assert.fail("could not find a deterministic opening hand for the death-batch scenario");
}

function boardIndexOf(game, side, cardId) {
  return game.getState().boards[side].findIndex((minion) => minion.id === cardId);
}

function playScenarioCard(game, side, cardId, target = null) {
  const state = game.getState();
  const handIndex = state.hands[side].findIndex((card) => card.id === cardId);
  assert.notEqual(handIndex, -1, `${side} must hold ${cardId}`);
  const result = game.playCard(side, handIndex, target);
  assert.equal(result.ok, true, `${side} could not play ${cardId}: ${result.error}`);
}

function prepareOneHealthDuel(playerCardId, aiCardId) {
  const playerIds = [playerCardId, "test_ritual", "test_wound"];
  const aiIds = [aiCardId, "test_wound"];
  const scenario = createPreparedScenario(
    playerIds,
    aiIds,
    playerIds,
    aiIds,
  );
  const { game } = scenario;

  playScenarioCard(game, "player", playerCardId);
  playScenarioCard(game, "player", "test_ritual", { zone: "hero", side: "player" });
  assert.equal(game.getState().heroes.player.health, 1);
  assert.equal(game.getState().heroes.ai.health, 1);
  assert.equal(game.endTurn("player").ok, true);

  playScenarioCard(game, "ai", aiCardId);
  playScenarioCard(game, "ai", "test_wound", {
    zone: "board",
    side: "player",
    index: boardIndexOf(game, "player", playerCardId),
  });
  assert.equal(game.endTurn("ai").ok, true);

  playScenarioCard(game, "player", "test_wound", {
    zone: "board",
    side: "ai",
    index: boardIndexOf(game, "ai", aiCardId),
  });
  assert.equal(game.getState().boards.player[0].currentHealth, 1);
  assert.equal(game.getState().boards.ai[0].currentHealth, 1);
  return scenario;
}

function assertHuangDeathResultTruth(events) {
  const deathEffects = events.filter(
    (event) =>
      event.type === "effect:trigger" &&
      event.detail.sourceCard?.id === "wu_huang_gai" &&
      event.detail.op === "damage_enemy_hero",
  );
  assert.equal(deathEffects.length, 2, "both production Huang Gai deathrattles must execute");
  assert.deepEqual(
    new Set(deathEffects.map((event) => event.detail.actor)),
    new Set(["player", "ai"]),
  );
  deathEffects.forEach((event) => {
    assert.equal(event.detail.amount, 1);
    assert.deepEqual(event.detail.target, {
      zone: "hero",
      side: event.detail.actor === "player" ? "ai" : "player",
    });
    assert.equal(event.detail.result.actualDamage, 1);
    assert.equal(event.detail.result.healthBefore, 1);
    assert.equal(event.detail.result.healthAfter, 0);
    assert.equal(event.detail.result.fizzled, false);
  });

  const deathSources = new Set(
    deathEffects.map((event) => event.detail.sourceCard.instanceId),
  );
  const heroDamage = events.filter(
    (event) =>
      event.type === "hero:damage" &&
      event.detail.source?.op === "damage_enemy_hero" &&
      deathSources.has(event.detail.source.instanceId),
  );
  assert.equal(heroDamage.length, 2, "both predicted deathrattle hits must really land");
  heroDamage.forEach((event) => {
    assert.equal(event.detail.amount, 1);
    assert.equal(event.detail.actualDamage, 1);
    assert.equal(event.detail.healthBefore, 1);
    assert.equal(event.detail.healthAfter, 0);
    assert.equal(event.detail.health, 0);
    assert.deepEqual(event.detail.target, { zone: "hero", side: event.detail.side });
  });

  const lastDamageIndex = Math.max(
    ...heroDamage.map((event) => events.indexOf(event)),
  );
  const gameEnds = events.filter((event) => event.type === "game:end");
  assert.equal(gameEnds.length, 1, "effect and combat end checks must publish one terminal event");
  assert.deepEqual(gameEnds[0].detail, {
    winner: "draw",
    reason: "mutual_destruction",
  });
  const gameEndIndex = events.indexOf(gameEnds[0]);
  assert.ok(gameEndIndex > lastDamageIndex, "winner selection must follow the complete death batch");
}

function testSimultaneousHuangGaiDeathBatchIsOrderInvariant() {
  ["player", "ai"].forEach((attackerSide) => {
    const { game, events } = prepareOneHealthDuel("wu_huang_gai", "wu_huang_gai");
    if (attackerSide === "ai") {
      assert.equal(game.endTurn("player").ok, true);
    }
    const defenderSide = attackerSide === "player" ? "ai" : "player";
    const result = game.attack(
      attackerSide,
      boardIndexOf(game, attackerSide, "wu_huang_gai"),
      {
        zone: "board",
        side: defenderSide,
        index: boardIndexOf(game, defenderSide, "wu_huang_gai"),
      },
    );
    assert.equal(result.ok, true);
    const state = game.getState();
    assert.equal(state.phase, "ended");
    assert.equal(state.winner, "draw", `${attackerSide} attack ordering must not choose a winner`);
    assert.equal(state.reason, "mutual_destruction");
    assert.equal(state.heroes.player.health, 0);
    assert.equal(state.heroes.ai.health, 0);
    assertHuangDeathResultTruth(events);
  });
}

function testSingleDeathrattleLethalStillChoosesOneWinner() {
  [
    {
      playerCard: "test_plain",
      aiCard: "wu_huang_gai",
      expectedWinner: "ai",
      expectedActor: "ai",
    },
    {
      playerCard: "wu_huang_gai",
      aiCard: "test_plain",
      expectedWinner: "player",
      expectedActor: "player",
    },
  ].forEach(({ playerCard, aiCard, expectedWinner, expectedActor }) => {
    const { game, events } = prepareOneHealthDuel(playerCard, aiCard);
    const result = game.attack("player", boardIndexOf(game, "player", playerCard), {
      zone: "board",
      side: "ai",
      index: boardIndexOf(game, "ai", aiCard),
    });
    assert.equal(result.ok, true);
    const state = game.getState();
    assert.equal(state.phase, "ended");
    assert.equal(state.winner, expectedWinner);
    assert.equal(state.heroes[expectedWinner].health, 1);
    assert.equal(state.heroes[expectedWinner === "player" ? "ai" : "player"].health, 0);
    const effects = events.filter(
      (event) =>
        event.type === "effect:trigger" &&
        event.detail.sourceCard?.id === "wu_huang_gai" &&
        event.detail.op === "damage_enemy_hero",
    );
    assert.equal(effects.length, 1);
    assert.equal(effects[0].detail.actor, expectedActor);
    assert.equal(effects[0].detail.result.actualDamage, 1);
    assert.equal(effects[0].detail.result.healthAfter, 0);
  });
}

function testNonDeathEffectLethalStillEndsImmediately() {
  const { game, events } = createPreparedScenario(
    ["test_ritual", "test_finisher"],
    ["test_plain"],
    ["test_ritual", "test_finisher"],
    ["test_plain"],
  );
  playScenarioCard(game, "player", "test_ritual", { zone: "hero", side: "player" });
  assert.equal(game.getState().heroes.player.health, 1);
  assert.equal(game.getState().heroes.ai.health, 1);
  playScenarioCard(game, "player", "test_finisher");

  const state = game.getState();
  assert.equal(state.phase, "ended");
  assert.equal(state.winner, "player");
  assert.equal(state.reason, "hero_defeated");
  assert.equal(state.heroes.player.health, 1);
  assert.equal(state.heroes.ai.health, 0);
  const finisherEffects = events.filter(
    (event) =>
      event.type === "effect:trigger" &&
      event.detail.sourceCard?.id === "test_finisher",
  );
  assert.equal(finisherEffects.length, 1, "later on-play effects must not run after direct lethal");
  assert.equal(finisherEffects[0].detail.op, "damage_enemy_hero");
  assert.equal(finisherEffects[0].detail.result.actualDamage, 1);
  assert.equal(finisherEffects[0].detail.result.healthAfter, 0);
}

function testNestedDeathBatchTokenShieldAndOutcomeTruth() {
  const playerIds = ["wu_huang_gai", "test_chain", "test_ritual", "test_wound"];
  const aiIds = ["wu_huang_gai", "test_chain", "test_wound"];
  const { game, events } = createPreparedScenario(
    playerIds,
    aiIds,
    playerIds,
    aiIds,
  );

  playScenarioCard(game, "player", "wu_huang_gai");
  playScenarioCard(game, "player", "test_chain");
  playScenarioCard(game, "player", "test_ritual", { zone: "hero", side: "player" });
  assert.equal(game.endTurn("player").ok, true);

  playScenarioCard(game, "ai", "wu_huang_gai");
  playScenarioCard(game, "ai", "test_chain");
  playScenarioCard(game, "ai", "test_wound", {
    zone: "board",
    side: "player",
    index: boardIndexOf(game, "player", "wu_huang_gai"),
  });
  assert.equal(game.endTurn("ai").ok, true);

  playScenarioCard(game, "player", "test_wound", {
    zone: "board",
    side: "ai",
    index: boardIndexOf(game, "ai", "wu_huang_gai"),
  });
  const result = game.attack("player", boardIndexOf(game, "player", "test_chain"), {
    zone: "board",
    side: "ai",
    index: boardIndexOf(game, "ai", "test_chain"),
  });
  assert.equal(result.ok, true);

  const state = game.getState();
  assert.equal(state.phase, "ended");
  assert.equal(state.winner, "draw");
  assert.equal(state.reason, "mutual_destruction");
  assert.equal(state.heroes.player.health, 0);
  assert.equal(state.heroes.ai.health, 0);
  assertHuangDeathResultTruth(events);

  const chainDeaths = events
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.type === "minion:death" && event.detail.cardId === "test_chain");
  const huangDeaths = events
    .map((event, index) => ({ event, index }))
    .filter(
      ({ event }) => event.type === "minion:death" && event.detail.cardId === "wu_huang_gai",
    );
  assert.equal(chainDeaths.length, 2);
  assert.equal(huangDeaths.length, 2);
  assert.ok(
    Math.max(...chainDeaths.map(({ index }) => index)) <
      Math.min(...huangDeaths.map(({ index }) => index)),
    "lethal AOE casualties must enter a nested death batch",
  );

  const aggregateSummons = events.filter(
    (event) =>
      event.type === "effect:trigger" &&
      event.detail.op === "summon_token" &&
      event.detail.result.requestedSummonCount === 1,
  );
  assert.equal(aggregateSummons.length, 2);
  aggregateSummons.forEach((event) => {
    assert.equal(event.detail.result.actualSummonCount, 1);
    assert.equal(event.detail.result.fizzled, false);
  });

  const shieldHit = events.find(
    (event) =>
      event.type === "minion:damage" &&
      event.detail.cardId === undefined &&
      event.detail.blockedByShield === true &&
      event.detail.source?.op === "damage_all_enemies",
  );
  assert.ok(shieldHit, "the nested AOE must consume the newly summoned shield");
  assert.equal(shieldHit.detail.amount, 0);
  assert.equal(shieldHit.detail.actualDamage, 0);
  assert.equal(shieldHit.detail.healthBefore, 1);
  assert.equal(shieldHit.detail.healthAfter, 1);
  assert.equal(shieldHit.detail.shieldBroken, true);
  assert.ok(
    state.boards.ai.some(
      (minion) =>
        minion.id === "test_death_guard" &&
        minion.currentHealth === 1 &&
        minion.shield === false,
    ),
  );

  const playerChainAoe = events.find(
    (event) =>
      event.type === "effect:trigger" &&
      event.detail.actor === "player" &&
      event.detail.sourceCard?.id === "test_chain" &&
      event.detail.op === "damage_all_enemies",
  );
  assert.ok(playerChainAoe);
  assert.equal(playerChainAoe.detail.result.actualDamage, 1);
  assert.equal(playerChainAoe.detail.result.blockedByShield, true);
  assert.equal(playerChainAoe.detail.result.affectedTargets.length, 2);
}

function testCommanderSelectionCaoCaoAndActionContract() {
  const events = [];
  const game = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("charger"),
    aiDeck: deckOf("charger"),
    commanders: { player: "caocao", ai: "liubei" },
    seed: 551,
    emit: (type, detail) => events.push({ type, detail }),
  });
  let state = game.getState();
  assert.deepEqual(state.commanders.player, {
    id: "caocao",
    faction: "wei",
    powerId: "caocao_recovery",
    powerCost: 1,
    powerUsedThisTurn: false,
    reflectCharges: 0,
  });
  assert.equal(state.commanders.ai.id, "liubei");
  assert.equal(state.commanders.ai.reflectCharges, 2);
  assert.equal(constants.COMMANDER_POWER_ACTION, "USE_COMMANDER_POWER");
  assert.deepEqual(commanderDefinitions.caocao, {
    id: "caocao",
    faction: "wei",
    powerId: "caocao_recovery",
    powerCost: 1,
    active: true,
  });
  assert.deepEqual(
    events.find((event) => event.type === "game:start").detail.commanders,
    { player: "caocao", ai: "liubei" },
  );
  assert.equal(
    game.useCommanderPower("player", null, "sunquan").error,
    "commander_mismatch",
  );

  const firstPower = game
    .getLegalActions("player")
    .find((action) => action.type === "USE_COMMANDER_POWER");
  assert.equal(firstPower, undefined, "full health must hide Cao Cao's healing action");
  const beforeFullHealthAttempt = game.getState();
  const fullHealthAttempt = game.useCommanderPower("player", null, "caocao");
  assert.equal(fullHealthAttempt.ok, false);
  assert.equal(fullHealthAttempt.error, "hero_full_health");
  state = game.getState();
  assert.equal(state.heroes.player.health, 30);
  assert.equal(state.heroes.player.mana, beforeFullHealthAttempt.heroes.player.mana);
  assert.equal(state.commanders.player.powerUsedThisTurn, false);
  assert.equal(events.some((event) => event.type === "commander:power"), false);

  assert.equal(game.endTurn("player").ok, true);
  assert.equal(
    game.getLegalActions("ai").some((action) => action.type === "USE_COMMANDER_POWER"),
    false,
    "Liu Bei's passive must not be exposed as an active action",
  );
  assert.equal(game.useCommanderPower("ai", null, "liubei").error, "passive_commander");
  playFirst(game, "playCard");
  playFirst(
    game,
    "attack",
    (action) => action.target.zone === "hero" && action.target.side === "player",
  );
  assert.equal(game.getState().heroes.player.health, 28);
  assert.equal(game.endTurn("ai").ok, true);

  const beforeHealing = game.getState();
  const healingAction = game
    .getLegalActions("player")
    .find((action) => action.type === "USE_COMMANDER_POWER");
  assert.deepEqual(healingAction, {
    type: "USE_COMMANDER_POWER",
    side: "player",
    commanderId: "caocao",
  });
  const healingResult = game.applyAction(healingAction);
  assert.equal(healingResult.ok, true);
  assert.equal(healingResult.result.actualHealing, 1);
  state = game.getState();
  assert.equal(state.heroes.player.health, 29);
  assert.equal(state.heroes.player.mana, 1);
  assert.equal(state.commanders.player.powerUsedThisTurn, true);
  assert.equal(
    game.useCommanderPower("player", null, "caocao").error,
    "power_already_used",
  );
  assert.equal(
    beforeHealing.hands.player.length + beforeHealing.decks.player.length,
    state.hands.player.length + state.decks.player.length,
    "commander powers must not create or destroy deck cards",
  );
  const powerEvent = events.filter((event) => event.type === "commander:power").at(-1);
  assert.equal(powerEvent.detail.commanderId, "caocao");
  assert.equal(powerEvent.detail.powerId, "caocao_recovery");
  assert.equal(powerEvent.detail.cost, 1);
  assert.deepEqual(powerEvent.detail.target, { zone: "hero", side: "player" });
  assert.equal(powerEvent.detail.result.actualHealing, 1);
  assert.equal(powerEvent.detail.manaRemaining, 1);

  const aliasGame = createGame({
    definitions,
    playerDeck: deckOf("charger"),
    aiDeck: deckOf("charger"),
    playerCommanderId: "sunquan",
    aiCommander: "nomad",
    seed: 552,
  });
  assert.equal(aliasGame.getState().commanders.player.id, "sunquan");
  assert.equal(aliasGame.getState().commanders.ai.id, "nomad");
}

function testLiuBeiReflectionChargesAndShieldSafety() {
  const events = [];
  const game = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("charger"),
    aiDeck: deckOf("charger"),
    commanders: { player: "liubei", ai: "caocao" },
    seed: 561,
    emit: (type, detail) => events.push({ type, detail }),
  });
  assert.equal(game.endTurn("player").ok, true);
  playFirst(game, "playCard");
  playFirst(
    game,
    "attack",
    (action) => action.target.zone === "hero" && action.target.side === "player",
  );
  let state = game.getState();
  assert.equal(state.heroes.player.health, 28);
  assert.equal(state.boards.ai[0].currentHealth, 1);
  assert.equal(state.commanders.player.reflectCharges, 1);

  assert.equal(game.endTurn("ai").ok, true);
  assert.equal(game.endTurn("player").ok, true);
  playFirst(game, "playCard");
  assert.equal(game.attack("ai", 0, { zone: "hero", side: "player" }).ok, true);
  state = game.getState();
  assert.equal(state.boards.ai.length, 1, "the second reflected attacker must die");
  assert.equal(state.commanders.player.reflectCharges, 0);
  assert.equal(game.attack("ai", 0, { zone: "hero", side: "player" }).ok, true);
  state = game.getState();
  assert.equal(state.boards.ai[0].currentHealth, 2, "zero charges must stop reflection");
  assert.equal(state.heroes.player.health, 24);

  const reflections = events.filter((event) => event.type === "commander:reflect");
  assert.equal(reflections.length, 2);
  assert.deepEqual(
    reflections.map((event) => [
      event.detail.chargesBefore,
      event.detail.chargesAfter,
      event.detail.result.actualDamage,
    ]),
    [
      [2, 1, 1],
      [1, 0, 1],
    ],
  );

  const shieldEvents = [];
  const shieldGame = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("charger"),
    aiDeck: deckOf("shield-charger"),
    commanders: { player: "liubei", ai: null },
    seed: 562,
    emit: (type, detail) => shieldEvents.push({ type, detail }),
  });
  assert.equal(shieldGame.endTurn("player").ok, true);
  playFirst(shieldGame, "playCard");
  playFirst(
    shieldGame,
    "attack",
    (action) => action.target.zone === "hero" && action.target.side === "player",
  );
  const shieldState = shieldGame.getState();
  assert.equal(shieldState.commanders.player.reflectCharges, 1);
  assert.equal(shieldState.boards.ai[0].shield, false);
  assert.equal(shieldState.boards.ai[0].currentHealth, 4);
  const shieldReflection = shieldEvents.find(
    (event) => event.type === "commander:reflect",
  );
  assert.equal(shieldReflection.detail.result.blockedByShield, true);
  assert.equal(shieldReflection.detail.result.actualDamage, 0);
}

function testSunQuanFloodAndMutualDestruction() {
  const events = [];
  const game = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("charger"),
    aiDeck: deckOf("guardian"),
    commanders: { player: "sunquan", ai: "nomad" },
    seed: 571,
    emit: (type, detail) => events.push({ type, detail }),
  });
  assert.equal(game.endTurn("player").ok, true);
  playFirst(game, "playCard");
  assert.equal(game.endTurn("ai").ok, true);
  assert.equal(game.endTurn("player").ok, true);
  assert.equal(game.endTurn("ai").ok, true);
  const beforePower = game.getState();
  const action = game
    .getLegalActions("player")
    .find((candidate) => candidate.type === "USE_COMMANDER_POWER");
  assert.deepEqual(action, {
    type: "USE_COMMANDER_POWER",
    side: "player",
    commanderId: "sunquan",
  });
  const result = game.applyAction(action);
  assert.equal(result.ok, true);
  const state = game.getState();
  assert.equal(state.heroes.ai.health, 29);
  assert.equal(state.boards.ai[0].currentHealth, 4);
  assert.equal(state.boards.ai[0].shield, false);
  assert.equal(state.heroes.player.mana, 0);
  assert.equal(result.result.actualDamage, 1);
  assert.equal(result.result.blockedByShield, true);
  assert.equal(result.result.affectedTargets.length, 2);
  assert.equal(
    game.useCommanderPower("player", null, "sunquan").error,
    "power_already_used",
  );
  assert.equal(
    beforePower.hands.player.length + beforePower.decks.player.length,
    state.hands.player.length + state.decks.player.length,
  );
  const floodEvent = events.find((event) => event.type === "commander:power");
  assert.deepEqual(floodEvent.detail.target, {
    zone: "characters",
    side: "ai",
    all: true,
  });
  assert.equal(floodEvent.detail.result.actualDamage, 1);
  assert.equal(floodEvent.detail.result.affectedTargets.length, 2);

  const mutualEvents = [];
  const mutualGame = createGame({
    definitions: simultaneousDeathDefinitions,
    tokens: simultaneousDeathTokens,
    playerDeck: deckOf("test_ritual"),
    aiDeck: deckOf("commander_bomb"),
    commanders: { player: "sunquan", ai: null },
    seed: 572,
    emit: (type, detail) => mutualEvents.push({ type, detail }),
  });
  playScenarioCard(mutualGame, "player", "test_ritual", {
    zone: "hero",
    side: "player",
  });
  assert.equal(mutualGame.getState().heroes.player.health, 1);
  assert.equal(mutualGame.getState().heroes.ai.health, 1);
  assert.equal(mutualGame.endTurn("player").ok, true);
  playScenarioCard(mutualGame, "ai", "commander_bomb");
  assert.equal(mutualGame.endTurn("ai").ok, true);
  assert.equal(mutualGame.endTurn("player").ok, true);
  assert.equal(mutualGame.endTurn("ai").ok, true);
  const mutualResult = mutualGame.useCommanderPower("player");
  assert.equal(mutualResult.ok, true);
  const mutualState = mutualGame.getState();
  assert.equal(mutualState.phase, "ended");
  assert.equal(mutualState.winner, "draw");
  assert.equal(mutualState.reason, "mutual_destruction");
  assert.equal(mutualState.heroes.player.health, 0);
  assert.equal(mutualState.heroes.ai.health, 0);
  assert.equal(mutualResult.result.actualDamage, 2);
  assert.deepEqual(
    mutualEvents.filter((event) => event.type === "game:end").map((event) => event.detail),
    [{ winner: "draw", reason: "mutual_destruction" }],
  );
}

function testNomadAttackLockCloneAndExpiry() {
  const events = [];
  const game = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("charger"),
    aiDeck: deckOf("charger"),
    commanders: { player: "nomad", ai: "caocao" },
    seed: 581,
    emit: (type, detail) => events.push({ type, detail }),
  });
  assert.equal(
    game.getLegalActions("player").some((action) => action.type === "USE_COMMANDER_POWER"),
    false,
    "the two-mana power must not be legal on turn one",
  );
  assert.equal(game.endTurn("player").ok, true);
  playFirst(game, "playCard");
  assert.equal(game.endTurn("ai").ok, true);

  const action = game
    .getLegalActions("player")
    .find((candidate) => candidate.type === "USE_COMMANDER_POWER");
  assert.deepEqual(action, {
    type: "USE_COMMANDER_POWER",
    side: "player",
    commanderId: "nomad",
    target: { zone: "board", side: "ai", index: 0 },
  });
  assert.equal(
    game.useCommanderPower("player").error,
    "target_required",
  );
  assert.equal(
    game.useCommanderPower("player", { zone: "hero", side: "ai" }).error,
    "invalid_target",
  );
  assert.equal(
    game.useCommanderPower("player", { zone: "board", side: "ai", index: 99 }).error,
    "target_missing",
  );
  assert.equal(
    game.useCommanderPower(
      "player",
      { zone: "board", side: "ai", index: 0 },
      "caocao",
    ).error,
    "commander_mismatch",
  );
  const cloneA = game.cloneForSimulation();
  const cloneB = game.cloneForSimulation();
  assert.equal(cloneA.applyAction(action).ok, true);
  assert.equal(cloneB.applyAction(action).ok, true);
  assert.deepEqual(cloneA.getState(), cloneB.getState());
  assert.equal(cloneA.getState().boards.ai[0].attackLockPending, true);
  assert.equal(
    game.getState().boards.ai[0].attackLockPending,
    false,
    "simulation must not mutate the live lock state",
  );
  assert.equal(events.some((event) => event.type === "commander:power"), false);

  const result = game.applyAction(action);
  assert.equal(result.ok, true);
  let state = game.getState();
  assert.equal(state.heroes.player.mana, 0);
  assert.equal(state.commanders.player.powerUsedThisTurn, true);
  assert.equal(state.boards.ai[0].attackLockPending, true);
  assert.equal(state.boards.ai[0].attackLockedThisTurn, false);
  assert.equal(game.endTurn("player").ok, true);

  state = game.getState();
  assert.equal(state.boards.ai[0].attackLockPending, false);
  assert.equal(state.boards.ai[0].attackLockedThisTurn, true);
  assert.equal(state.boards.ai[0].canAttack, false);
  assert.equal(
    game
      .getLegalActions("ai")
      .some((candidate) => candidate.type === "attack" && candidate.attackerIndex === 0),
    false,
  );
  assert.equal(
    game.attack("ai", 0, { zone: "hero", side: "player" }).error,
    "attacker_locked",
  );
  assert.equal(game.endTurn("ai").ok, true);
  assert.equal(game.getState().commanders.player.powerUsedThisTurn, false);
  assert.equal(game.endTurn("player").ok, true);
  state = game.getState();
  assert.equal(state.boards.ai[0].attackLockedThisTurn, false);
  assert.equal(state.boards.ai[0].canAttack, true);
  assert.ok(
    game
      .getLegalActions("ai")
      .some((candidate) => candidate.type === "attack" && candidate.attackerIndex === 0),
  );
  assert.deepEqual(
    events
      .filter((event) => event.type === "commander:lock")
      .map((event) => event.detail.status),
    ["pending", "active"],
  );
}

function testCloneDeterminismAndIsolation() {
  const emitted = [];
  const game = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("charger"),
    aiDeck: deckOf("charger"),
    seed: 55,
    emit: (type) => emitted.push(type),
  });
  const emittedBeforeClone = emitted.length;
  const clone = game.cloneForSimulation();
  const action = game.getLegalActions().find((candidate) => candidate.type === "playCard");
  assert.deepEqual(action, clone.getLegalActions().find((candidate) => candidate.type === "playCard"));
  assert.equal(clone.applyAction(action).ok, true);
  assert.equal(clone.getState().boards.player.length, 1);
  assert.equal(game.getState().boards.player.length, 0, "simulation must not mutate live game");
  assert.equal(
    emitted.length,
    emittedBeforeClone,
    "simulation must not leak presentation events into the live game",
  );

  const secondClone = game.cloneForSimulation();
  secondClone.applyAction(action);
  assert.deepEqual(
    clone.getState(),
    secondClone.getState(),
    "same snapshot and RNG state should simulate identically",
  );
}

function testFatigueEndsGame() {
  const game = createGame({
    definitions,
    tokens,
    playerDeck: [],
    aiDeck: [],
    seed: 66,
  });
  let safety = 0;
  while (game.getState().phase === "playing" && safety < 40) {
    game.endTurn(game.getState().turn);
    safety += 1;
  }
  const state = game.getState();
  assert.equal(state.phase, "ended");
  assert.ok(["player", "ai", "draw"].includes(state.winner));
  assert.ok(state.heroes.player.fatigue > 0);
  assert.ok(state.heroes.ai.fatigue > 0);
}

function testFormationPlacementProtectionAndCapacity() {
  const events = [];
  const game = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("strategist"),
    aiDeck: deckOf("charger"),
    seed: 701,
    emit: (type, detail) => events.push({ type, detail }),
  });
  playFirst(
    game,
    "playCard",
    (action) => action.placement?.row === "rear" && action.placement.slot === 0,
  );
  assert.deepEqual(game.getState().boards.player[0].row, "rear");
  game.endTurn("player");
  playFirst(
    game,
    "playCard",
    (action) => action.placement?.row === "front" && action.placement.slot === 0,
  );
  game.endTurn("ai");
  game.endTurn("player");
  playFirst(
    game,
    "playCard",
    (action) => action.placement?.row === "rear" && action.placement.slot === 0,
  );
  game.endTurn("ai");

  const ordinaryTargets = game
    .getLegalActions()
    .filter((action) => action.type === "attack" && action.attackerIndex === 0)
    .map((action) => action.target);
  assert.ok(ordinaryTargets.some((target) => target.zone === "board" && target.index === 0));
  assert.ok(!ordinaryTargets.some((target) => target.zone === "board" && target.index === 1));
  const blocked = game.attack("player", 0, { zone: "board", side: "ai", index: 1 });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.state.log.at(-2).type, "formation:block");
  assert.equal(blocked.state.log.at(-2).data.reason, "front_protects_rear");

  const breach = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("shield-charger"),
    aiDeck: deckOf("charger"),
    seed: 702,
  });
  playFirst(breach, "playCard");
  breach.endTurn("player");
  playFirst(breach, "playCard", (action) => action.placement?.row === "front");
  breach.endTurn("ai");
  breach.endTurn("player");
  playFirst(breach, "playCard", (action) => action.placement?.row === "rear");
  breach.endTurn("ai");
  assert.ok(
    breach
      .getLegalActions()
      .some(
        (action) =>
          action.type === "attack" &&
          action.attackerIndex === 0 &&
          action.target.zone === "board" &&
          action.target.index === 1,
      ),
    "돌파는 전열 뒤의 후열을 직접 공격할 수 있어야 한다",
  );

  const capacity = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("engineer"),
    aiDeck: deckOf("charger"),
    seed: 703,
  });
  const firstEngineer = capacity.getLegalActions().find(
    (action) =>
      action.type === "playCard" &&
      action.placement?.row === "rear" &&
      action.placement.slot === 2,
  );
  assert.ok(firstEngineer);
  capacity.applyAction(firstEngineer);
  capacity.endTurn("player");
  capacity.endTurn("ai");
  playFirst(capacity, "playCard");
  const fullBoard = capacity.getState().boards.player;
  assert.equal(fullBoard.length, 6);
  assert.equal(
    new Set(fullBoard.map((minion) => `${minion.row}:${minion.slot}`)).size,
    6,
    "자동 배치는 6개 진형 칸을 중복 없이 채워야 한다",
  );
  assert.ok(!capacity.getLegalActions().some((action) => action.type === "playCard"));
  assert.ok(events.some((event) => event.type === "formation:place"));
}

function testFourFactionLinks() {
  const brotherEvents = [];
  const brotherhood = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("test-brotherhood"),
    aiDeck: deckOf("charger"),
    seed: 710,
    emit: (type, detail) => brotherEvents.push({ type, detail }),
  });
  playFirst(brotherhood, "playCard");
  playFirst(brotherhood, "playCard");
  assert.deepEqual(
    brotherhood.getState().boards.player.map((minion) => minion.currentHealth),
    [3, 3],
  );
  assert.equal(
    brotherEvents.find((event) => event.type === "faction:link")?.detail.linkKind,
    "brotherhood",
  );

  const strategyEvents = [];
  const strategy = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("test-strategy-link"),
    aiDeck: deckOf("charger"),
    seed: 711,
    emit: (type, detail) => strategyEvents.push({ type, detail }),
  });
  strategy.endTurn("player");
  strategy.endTurn("ai");
  playFirst(strategy, "playCard");
  strategy.endTurn("player");
  strategy.endTurn("ai");
  playFirst(strategy, "playCard");
  assert.equal(
    strategyEvents.find((event) => event.type === "faction:link")?.detail.linkKind,
    "strategy",
  );
  assert.ok(strategy.getState().hands.player.some((card) => card.currentCost === 1));

  const kindleEvents = [];
  const kindle = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("test-kindle-link"),
    aiDeck: deckOf("charger"),
    seed: 712,
    emit: (type, detail) => kindleEvents.push({ type, detail }),
  });
  playFirst(kindle, "playCard");
  kindle.endTurn("player");
  playFirst(kindle, "playCard");
  kindle.endTurn("ai");
  playFirst(kindle, "playCard");
  assert.equal(kindle.getState().boards.ai[0].burning, 1);
  assert.equal(
    kindleEvents.find((event) => event.type === "faction:link")?.detail.linkKind,
    "kindle",
  );

  const raidEvents = [];
  const raid = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("test-raid-link"),
    aiDeck: deckOf("charger"),
    seed: 713,
    emit: (type, detail) => raidEvents.push({ type, detail }),
  });
  playFirst(raid, "playCard");
  raid.endTurn("player");
  playFirst(raid, "playCard");
  raid.endTurn("ai");
  playFirst(raid, "playCard");
  assert.equal(raid.getState().boards.ai[0].attackLockPending, true);
  assert.equal(raid.getState().boards.ai[0].attackLockKind, "raid");
  assert.equal(
    raidEvents.find((event) => event.type === "faction:link")?.detail.linkKind,
    "raid",
  );
}

function testSignatureGeneralAbilitiesAndStatuses() {
  const duelEvents = [];
  const duel = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("test-duelist"),
    aiDeck: deckOf("charger"),
    seed: 720,
    emit: (type, detail) => duelEvents.push({ type, detail }),
  });
  duel.endTurn("player");
  playFirst(duel, "playCard");
  duel.endTurn("ai");
  playFirst(duel, "playCard");
  assert.equal(duel.getState().boards.ai.length, 0);
  assert.equal(duel.getState().boards.player[0].currentHealth, 3);
  assert.equal(duel.getState().boards.player[0].canAttack, true);
  assert.ok(duelEvents.some((event) => event.type === "duel:start"));
  assert.ok(duelEvents.some((event) => event.type === "duel:hit"));

  const intimidate = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("test-intimidator"),
    aiDeck: deckOf("charger"),
    seed: 721,
  });
  intimidate.endTurn("player");
  playFirst(intimidate, "playCard", (action) => action.placement?.row === "front");
  intimidate.endTurn("ai");
  playFirst(intimidate, "playCard");
  assert.equal(intimidate.getState().boards.ai[0].currentAttack, 1);
  intimidate.endTurn("player");
  intimidate.endTurn("ai");
  assert.equal(intimidate.getState().boards.ai[0].currentAttack, 2);

  const emptyFortEvents = [];
  const emptyFort = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("test-empty-fort"),
    aiDeck: deckOf("charger"),
    seed: 722,
    emit: (type, detail) => emptyFortEvents.push({ type, detail }),
  });
  playFirst(emptyFort, "playCard", (action) => action.placement?.row === "rear");
  assert.equal(emptyFort.getState().heroes.player.emptyFortCharges, 1);
  emptyFort.endTurn("player");
  playFirst(emptyFort, "playCard");
  const faceAttack = emptyFort
    .getLegalActions()
    .find((action) => action.type === "attack" && action.target.zone === "hero");
  assert.ok(faceAttack);
  emptyFort.applyAction(faceAttack);
  assert.equal(emptyFort.getState().heroes.player.health, 30);
  assert.equal(emptyFort.getState().heroes.player.emptyFortCharges, 0);
  assert.ok(
    emptyFortEvents.some(
      (event) => event.type === "status:empty-fort" && event.detail.preventedDamage === 2,
    ),
  );

  const counterEvents = [];
  const patience = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("test-patience"),
    aiDeck: deckOf("charger"),
    seed: 723,
    emit: (type, detail) => counterEvents.push({ type, detail }),
  });
  playFirst(patience, "playCard", (action) => action.placement?.row === "front");
  patience.endTurn("player");
  playFirst(patience, "playCard");
  const counterTarget = patience
    .getLegalActions()
    .find(
      (action) =>
        action.type === "attack" &&
        action.target.zone === "board" &&
        action.target.side === "player",
    );
  assert.ok(counterTarget);
  patience.applyAction(counterTarget);
  assert.equal(patience.getState().boards.player[0].storedCounter, 2);
  patience.endTurn("ai");
  assert.equal(patience.getState().boards.ai.length, 0);
  assert.ok(counterEvents.some((event) => event.type === "status:counter" && event.detail.phase === "released"));

  const burning = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("test-burning-all"),
    aiDeck: deckOf("charger"),
    seed: 724,
  });
  burning.endTurn("player");
  playFirst(burning, "playCard");
  burning.endTurn("ai");
  playFirst(burning, "playCard");
  assert.equal(burning.getState().boards.ai[0].burning, 1);
  burning.endTurn("player");
  burning.endTurn("ai");
  assert.equal(burning.getState().boards.ai[0].currentHealth, 1);
  assert.equal(burning.getState().boards.ai[0].burning, 0);

  const raider = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("test-rear-raider"),
    aiDeck: deckOf("charger"),
    seed: 725,
  });
  playFirst(raider, "playCard", (action) => action.placement?.row === "rear");
  assert.equal(raider.getState().boards.player[0].currentAttack, 3);
  raider.endTurn("player");
  assert.equal(raider.getState().boards.player[0].currentAttack, 2);

  const lubu = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("test-lubu"),
    aiDeck: deckOf("charger"),
    seed: 726,
  });
  playFirst(lubu, "playCard");
  playFirst(lubu, "attack", (action) => action.target.zone === "hero");
  assert.equal(lubu.getState().boards.player[0].attacksLeft, 1);
  playFirst(lubu, "attack", (action) => action.target.zone === "hero");
  assert.equal(lubu.getState().boards.player[0].secondAttackPenalty, true);
  lubu.endTurn("player");
  assert.equal(lubu.getState().boards.player[0].currentHealth, 5);
}

function selectBattleAction(game) {
  const legal = game.getLegalActions();
  const lethal = legal.find((action) => {
    if (action.type !== "attack" || action.target.zone !== "hero") return false;
    const state = game.getState();
    const attacker = state.boards[action.side][action.attackerIndex];
    const enemyHero = state.heroes[action.target.side];
    return attacker.currentAttack >= enemyHero.health + enemyHero.armor;
  });
  if (lethal) return lethal;
  const play = legal.find((action) => action.type === "playCard");
  if (play) return play;
  const faceAttack = legal.find(
    (action) => action.type === "attack" && action.target.zone === "hero",
  );
  if (faceAttack) return faceAttack;
  const trade = legal.find((action) => action.type === "attack");
  if (trade) return trade;
  return legal.find((action) => action.type === "endTurn");
}

function testCompleteTwentyCardBattle() {
  const events = [];
  const game = createGame({
    definitions,
    tokens,
    playerDeck: deckOf("charger", 20),
    aiDeck: deckOf("charger", 20),
    seed: 77,
    emit: (type, detail) => events.push({ type, detail }),
  });
  let actions = 0;
  while (game.getState().phase === "playing" && actions < 400) {
    const action = selectBattleAction(game);
    assert.ok(action, "a playing game must always have at least endTurn");
    const result = game.applyAction(action);
    assert.equal(result.ok, true, `${action.type}: ${result.error || "unknown failure"}`);
    actions += 1;
  }
  const state = game.getState();
  assert.equal(state.phase, "ended", "20-card battle must reach a result");
  assert.ok(["player", "ai", "draw"].includes(state.winner));
  assert.ok(events.some((event) => event.type === "game:end"));
  assert.ok(actions < 400);
  return { winner: state.winner, actions, turns: state.turnNumber };
}

testInitialStateAndSnapshotIsolation();
testOpeningHandCostBalance();
testTurnManaSummoningAndBoardLimit();
testTargetingGuardShieldAndCombat();
testGuardTakesPriorityOverSnipe();
testStealEnemyMinionAndDelayedAttack();
testStealBoardCapacityAndMaxCostValidation();
testStealMinimumCostValidation();
testGrantAllAlliesArmorAndDamageAbsorption();
testAttackingShieldMinionBlocksRetaliation();
testDslSummonsDrawBuffAndDeath();
testRemainingDslOperators();
testDeathEventPreservesBoardAnchor();
testEffectOutcomePayloadContract();
testSimultaneousHuangGaiDeathBatchIsOrderInvariant();
testSingleDeathrattleLethalStillChoosesOneWinner();
testNonDeathEffectLethalStillEndsImmediately();
testNestedDeathBatchTokenShieldAndOutcomeTruth();
testCommanderSelectionCaoCaoAndActionContract();
testLiuBeiReflectionChargesAndShieldSafety();
testSunQuanFloodAndMutualDestruction();
testNomadAttackLockCloneAndExpiry();
testCloneDeterminismAndIsolation();
testFatigueEndsGame();
testFormationPlacementProtectionAndCapacity();
testFourFactionLinks();
testSignatureGeneralAbilitiesAndStatuses();
const battle = testCompleteTwentyCardBattle();

console.log(
  `rules-engine: all tests passed; full battle winner=${battle.winner}, turns=${battle.turns}, actions=${battle.actions}`,
);
