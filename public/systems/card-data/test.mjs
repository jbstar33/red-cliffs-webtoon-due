import assert from "node:assert/strict";

delete globalThis.TK;
await import("./index.js");

var api = globalThis.TK.modules.cardData;
var cards = api.getCards();
var tokens = api.getTokens();
var report = api.validate();
var byId = Object.fromEntries(cards.map(function indexCard(card) {
  return [card.id, card];
}));

[
  "getCards",
  "buildDeck",
  "getDeckRecipes",
  "getToken",
  "getTokens",
  "getKeywordGlossary",
  "getDslSchema",
  "auditBalance",
  "validate"
].forEach(function publicMethod(name) {
  assert.equal(typeof api[name], "function", name);
});

assert.equal(cards.length, 50);
assert.equal(new Set(cards.map(function id(card) { return card.id; })).size, 50);
assert.equal(report.ok, true, report.errors.join("\n"));
assert.deepEqual(report.errors, []);
assert.deepEqual(report.summary.factions, {
  촉: 12,
  위: 12,
  오: 12,
  남만: 10,
  군웅: 4
});

var oneCostCards = cards.filter(function oneCost(card) { return card.cost === 1; });
var twoCostCards = cards.filter(function twoCost(card) { return card.cost === 2; });
var lowCostCards = cards.filter(function lowCost(card) { return card.cost <= 2; });
assert.ok(oneCostCards.length >= 10, "1-cost diversity");
assert.ok(twoCostCards.length >= 10, "2-cost diversity");
assert.ok(lowCostCards.length >= 24, "at least 48% of cards cost 1-2");
assert.ok(lowCostCards.length / cards.length >= 0.48, "low-cost ratio");

assert.deepEqual(Object.keys(tokens).sort(), [
  "token_jiangdong_marine",
  "token_nanman_beast"
]);
assert.equal(api.getToken("missing-token"), null);
assert.deepEqual(api.getToken("token_nanman_beast"), tokens.token_nanman_beast);

var glossary = api.getKeywordGlossary();
assert.deepEqual(Object.keys(glossary).sort(), [
  "군략", "돌진", "돌파", "방패", "수호",
  "약탈", "연화", "의형제", "저격", "천하무쌍"
]);
assert.match(glossary.저격, /전열.*후열/);

var schema = api.getDslSchema();
[
  "duel_target",
  "sow_discord",
  "weaken_enemy_front",
  "empty_fort",
  "patience_counter",
  "apply_burning_all",
  "faction_link"
].forEach(function newOp(op) {
  assert.ok(schema.ops.includes(op), "missing DSL op " + op);
});
assert.deepEqual(schema.linkKinds.sort(), ["brotherhood", "kindle", "raid", "strategy"]);
assert.deepEqual(report.summary.factionLinks, {
  brotherhood: 3,
  strategy: 1,
  kindle: 2,
  raid: 1
});

cards.forEach(function validateProductionDefinition(card) {
  assert.ok(card.text.length > 0 && card.text.length <= 120, card.id + ": text");
  assert.ok(card.summaryText.length > 0 && card.summaryText.length <= 44, card.id + ": summary");
  assert.ok(card.tactics, card.id + ": tactics");
  ["identity", "plan", "combo", "counter"].forEach(function tactic(field) {
    assert.ok(card.tactics[field].length >= 6, card.id + ": " + field);
  });
  assert.match(card.palette.primary, /^#[0-9A-F]{6}$/i, card.id);
  assert.match(card.palette.secondary, /^#[0-9A-F]{6}$/i, card.id);
  assert.match(card.palette.glow, /^#[0-9A-F]{6}$/i, card.id);
  ["motif", "weapon", "temperament"].forEach(function portrait(field) {
    assert.ok(card.portrait[field].length > 0, card.id + ": portrait." + field);
  });
  card.keywords.forEach(function documentedKeyword(keyword) {
    assert.ok(glossary[keyword], card.id + ": unknown keyword " + keyword);
    assert.ok(card.text.includes(keyword + " — " + glossary[keyword]), card.id);
  });
  card.abilities.forEach(function documentedAbility(ability) {
    var trigger = ability.trigger === "onDeath" ? "유언:" : "출전:";
    assert.ok(card.text.includes(trigger), card.id + ": " + trigger);
  });
});

assert.equal(
  new Set(cards.map(function identity(card) { return card.tactics.identity; })).size,
  50
);

assert.ok(byId.shu_huang_zhong.keywords.includes("저격"));
assert.ok(byId.shu_huang_zhong.text.includes("전열 너머 후열"));
assert.deepEqual(byId.wei_xiahou_yuan.keywords, ["저격"]);
assert.equal(byId.wei_xiahou_yuan.faction, "위");

var featuredIds = [
  "shu_guan_yu",
  "shu_zhang_fei",
  "shu_zhao_yun",
  "shu_zhuge_liang",
  "wei_sima_yi",
  "wu_zhou_yu",
  "wu_gan_ning",
  "qun_lu_bu",
  "qun_diao_chan"
];
featuredIds.forEach(function featuredDetails(id) {
  ["placement", "linkCondition", "statusDuration"].forEach(function field(name) {
    assert.ok(byId[id].tactics[name].length >= 6, id + ": tactics." + name);
  });
});

assert.deepEqual(byId.shu_guan_yu.keywords, ["돌파", "의형제"]);
assert.deepEqual(byId.shu_guan_yu.abilities[0], {
  name: "일기토",
  trigger: "onPlay",
  op: "duel_target",
  target: "enemyMinion"
});
assert.match(byId.shu_guan_yu.text, /일기토.*공격력 피해.*처치 후 생존/);

assert.deepEqual(byId.shu_jiang_wei.abilities[0], {
  name: "반간계",
  trigger: "onPlay",
  op: "sow_discord"
});
assert.equal(byId.shu_jiang_wei.cost, 2);
assert.equal(byId.shu_jiang_wei.attack, 2);
assert.equal(byId.shu_jiang_wei.health, 3);
assert.match(byId.shu_jiang_wei.text, /반간계.*공격력\+현재 체력.*가장 낮은.*가장 높은/);
assert.match(byId.shu_jiang_wei.summaryText, /약한 적이 강한 다른 적을 공격/);

assert.deepEqual(byId.shu_zhang_fei.keywords, ["수호", "의형제"]);
assert.deepEqual(byId.shu_zhang_fei.abilities[0], {
  name: "장판의 호통",
  trigger: "onPlay",
  op: "weaken_enemy_front",
  amount: 1,
  duration: "nextEnemyTurnEnd"
});

assert.deepEqual(byId.shu_zhao_yun.keywords, ["돌진", "돌파", "방패"]);
assert.deepEqual(byId.shu_zhuge_liang.abilities[0], {
  name: "공성계",
  trigger: "onPlay",
  op: "empty_fort",
  requiredRow: "rear",
  requiresSolo: true,
  charges: 1
});
assert.deepEqual(byId.wei_sima_yi.abilities[0], {
  name: "인내의 반계",
  trigger: "onPlay",
  op: "patience_counter",
  maxStored: 2
});
assert.deepEqual(byId.wu_zhou_yu.abilities[0], {
  name: "연환화계",
  trigger: "onPlay",
  op: "apply_burning_all",
  amount: 1,
  duration: "ownerTurnEnd"
});
assert.deepEqual(byId.wu_gan_ning.abilities[0], {
  name: "백기야습",
  trigger: "onPlay",
  op: "buff_self",
  attack: 1,
  health: 0,
  requiredRow: "rear",
  duration: "thisTurn"
});
assert.deepEqual(byId.qun_lu_bu.combat, {
  attacksPerTurn: 2,
  secondAttackSelfDamage: 2
});
assert.deepEqual(byId.qun_lu_bu.keywords, ["돌진", "돌파", "천하무쌍", "약탈"]);

assert.equal(byId.qun_diao_chan.name, "초선");
assert.equal(byId.qun_diao_chan.cost, 5);
assert.equal(byId.qun_diao_chan.target, "enemyMinion");
assert.deepEqual(byId.qun_diao_chan.abilities, [{
  name: "매혹",
  trigger: "onPlay",
  op: "steal_enemy_minion",
  minCost: 3,
  target: "enemyMinion"
}]);
assert.match(byId.qun_diao_chan.text, /매혹.*비용이 3 이상.*가져옵니다.*다음 내 턴부터 공격/);

assert.equal(byId.shu_pang_tong.name, "방통");
assert.equal(byId.shu_pang_tong.faction, "촉");
assert.deepEqual(byId.shu_pang_tong.abilities, [{
  trigger: "onPlay",
  op: "grant_all_allies_armor",
  amount: 1
}]);
assert.match(byId.shu_pang_tong.text, /모든 아군 하수인의 방어력을 \+1/);

assert.equal(byId.qun_dong_zhuo.name, "동탁");
assert.equal(byId.qun_dong_zhuo.target, "enemyMinion");
assert.deepEqual(byId.qun_dong_zhuo.abilities, [{
  trigger: "onPlay",
  op: "steal_enemy_minion_max_cost",
  maxCost: 1,
  target: "enemyMinion"
}]);
assert.match(byId.qun_dong_zhuo.text, /비용이 1 이하.*가져옵니다/);

var originalIds = new Set([
  "shu_liu_bei", "shu_guan_yu", "shu_zhang_fei", "shu_zhao_yun",
  "shu_zhuge_liang", "shu_huang_zhong", "shu_ma_chao",
  "wei_cao_cao", "wei_sima_yi", "wei_xiahou_dun", "wei_dian_wei",
  "wei_zhang_liao", "wei_guo_jia", "wei_xu_zhu",
  "wu_sun_quan", "wu_zhou_yu", "wu_gan_ning", "wu_lu_meng",
  "wu_huang_gai", "wu_sun_shangxiang", "wu_lu_xun",
  "nanman_meng_huo", "nanman_zhu_rong", "nanman_wu_tu_gu",
  "nanman_mu_lu", "nanman_a_hui_nan", "qun_lu_bu"
]);
var expansionCards = cards.filter(function expansion(card) {
  return !originalIds.has(card.id);
});
assert.equal(expansionCards.length, 23);
assert.ok(expansionCards.filter(function cheap(card) { return card.cost <= 2; }).length >= 19);

var recipeCases = [
  { key: "wei", aliases: ["wei", "caocao", "조조", "위"], faction: "위" },
  { key: "shu", aliases: ["shu", "liubei", "유비", "촉"], faction: "촉" },
  { key: "wu", aliases: ["wu", "sunquan", "손권", "오"], faction: "오" },
  { key: "nanman", aliases: ["nanman", "nomad", "이민족", "남만"], faction: "남만" }
];
var recipeCoverage = new Set();

function auditDeck(deck, label) {
  assert.equal(deck.length, 20, label + ": deck size");
  var copies = {};
  var cheap = 0;
  var early = 0;
  deck.forEach(function validCard(id) {
    assert.ok(byId[id], label + ": unknown " + id);
    copies[id] = (copies[id] || 0) + 1;
    if (byId[id].cost <= 2) cheap += 1;
    if (byId[id].cost <= 4) early += 1;
  });
  assert.ok(Object.values(copies).every(function limit(count) { return count <= 2; }));
  assert.equal(cheap, 10, label + ": exactly half the deck should cost 1-2");
  assert.ok(early >= 14, label + ": early curve");
}

var defaultA = api.buildDeck("same-seed");
assert.deepEqual(defaultA, api.buildDeck("same-seed"));
assert.notDeepEqual(defaultA, api.buildDeck("different-seed"));
assert.deepEqual(api.buildDeck("same-seed", "unknown"), defaultA);
auditDeck(defaultA, "default");

recipeCases.forEach(function auditFactionRecipe(entry) {
  var deck = api.buildDeck("recipe-seed", entry.key);
  auditDeck(deck, entry.key);
  assert.ok(deck.filter(function own(id) { return byId[id].faction === entry.faction; }).length >= 10);
  entry.aliases.forEach(function alias(alias) {
    assert.deepEqual(api.buildDeck("recipe-seed", alias), deck, alias);
  });
  deck.forEach(function cover(id) { recipeCoverage.add(id); });
});
expansionCards.forEach(function expansionIsPlayable(card) {
  assert.ok(recipeCoverage.has(card.id), card.id + ": missing from commander decks");
});
cards.forEach(function productionCardIsPlayable(card) {
  assert.ok(recipeCoverage.has(card.id), card.id + ": inaccessible");
});

for (var seed = 0; seed < 1000; seed += 1) {
  auditDeck(api.buildDeck(seed), "default-" + seed);
  recipeCases.forEach(function seeded(entry) {
    auditDeck(api.buildDeck(seed, entry.key), entry.key + "-" + seed);
  });
}

var balance = api.auditBalance(10000);
assert.equal(balance.ok, true);
assert.equal(balance.entries.length, 50);
assert.ok(balance.minimumRatio >= 0.75);
assert.ok(balance.maximumRatio <= 1.45);
assert.equal(report.summary.cards, 50);
assert.equal(report.summary.cheapCards, 10);
assert.equal(report.summary.earlyCards, 14);
assert.ok(report.summary.sample500.firstTurnPlayableRate >= 0.8);

var mutableCards = api.getCards();
mutableCards[0].name = "변조";
assert.notEqual(api.getCards()[0].name, "변조");
var mutableRecipes = api.getDeckRecipes();
mutableRecipes.wei[0] = "변조";
assert.notEqual(api.getDeckRecipes().wei[0], "변조");

console.log(JSON.stringify({
  status: "PASS",
  cards: cards.length,
  expansionCards: expansionCards.length,
  lowCostCards: lowCostCards.length,
  lowCostRatio: lowCostCards.length / cards.length,
  factions: report.summary.factions,
  defaultDeck: {
    averageCost: report.summary.averageDeckCost,
    cheapCards: report.summary.cheapCards,
    earlyCards: report.summary.earlyCards,
    firstTurnPlayableRate: report.summary.sample500.firstTurnPlayableRate
  },
  balance: {
    minimumRatio: balance.minimumRatio,
    maximumRatio: balance.maximumRatio
  }
}, null, 2));
