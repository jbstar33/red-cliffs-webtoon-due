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

assert.equal(typeof api.getCards, "function");
assert.equal(typeof api.buildDeck, "function");
assert.equal(typeof api.getDeckRecipes, "function");
assert.equal(typeof api.getToken, "function");
assert.equal(typeof api.getTokens, "function");
assert.equal(typeof api.getKeywordGlossary, "function");
assert.equal(typeof api.auditBalance, "function");
assert.equal(typeof api.validate, "function");

assert.equal(cards.length, 27);
assert.equal(report.ok, true, report.errors.join("\n"));
assert.deepEqual(report.errors, []);
assert.deepEqual(
  cards.reduce(function countFaction(counts, card) {
    counts[card.faction] = (counts[card.faction] || 0) + 1;
    return counts;
  }, {}),
  { 촉: 7, 위: 7, 오: 7, 남만: 5, 군웅: 1 }
);

assert.deepEqual(Object.keys(tokens).sort(), [
  "token_jiangdong_marine",
  "token_nanman_beast"
]);
assert.deepEqual(
  api.getToken("token_jiangdong_marine"),
  tokens.token_jiangdong_marine
);
assert.deepEqual(
  api.getToken("token_nanman_beast"),
  tokens.token_nanman_beast
);
assert.equal(api.getToken("missing-token"), null);
assert.deepEqual(
  [
    tokens.token_nanman_beast.cost,
    tokens.token_nanman_beast.attack,
    tokens.token_nanman_beast.health,
    tokens.token_nanman_beast.faction
  ],
  [0, 1, 1, "남만"]
);

var keywordGlossary = api.getKeywordGlossary();
assert.deepEqual(keywordGlossary, {
  돌진: "이 하수인은 출전한 턴에도 공격할 수 있습니다.",
  수호: "적은 수호 하수인이 하나라도 있으면 수호 하수인만 공격할 수 있습니다.",
  방패: "이 하수인이 처음 받는 피해를 한 번 전부 막습니다."
});

var requiredByOp = {
  damage_target: ["내가 선택한 적 캐릭터 하나", "피해"],
  damage_enemy_hero: ["적 영웅", "피해"],
  damage_random_enemy: [
    "무작위 적 하수인 하나",
    "피해",
    "적 하수인이 없다면 적 영웅"
  ],
  damage_all_enemies: ["모든 적 하수인", "피해"],
  heal_friendly_hero: ["내 영웅", "체력", "회복", "최대 체력까지"],
  draw: ["카드", "뽑습니다"],
  gain_armor: ["내 영웅", "방어도", "얻습니다"],
  buff_target: ["내가 선택한 아군 하수인 하나", "부여합니다"],
  buff_friendly_board: ["모든 아군 하수인", "자신 포함", "부여합니다"],
  buff_adjacent: ["이 하수인 양옆의 아군 하수인", "부여합니다"],
  buff_self: ["이 하수인", "부여합니다"],
  summon_token: [
    "자신이 차지한 칸을 제외한 내 전장의 빈자리만큼",
    "토큰을 최대",
    "소환합니다"
  ],
  reduce_random_hand_cost: [
    "그 후, 비용이 1 이상인 무작위 손패 1장",
    "최소 0",
    "대상이 없으면 발동하지 않습니다"
  ],
  ready_random_friendly: [
    "이전 턴부터 전장에 있었고",
    "이번 턴 이미 공격을 마친",
    "무작위 다른 아군 하수인 하나",
    "다시 공격할 수 있게",
    "조건에 맞는 다른 아군이 없으면 발동하지 않습니다"
  ]
};

cards.forEach(function validateReadableDefinition(card) {
  assert.ok(card.text.length > 0 && card.text.length <= 120, card.id);
  assert.ok(card.summaryText.length > 0 && card.summaryText.length <= 44, card.id);
  assert.ok(card.tactics);
  ["identity", "plan", "combo", "counter"].forEach(function completeTactic(field) {
    assert.ok(card.tactics[field].length >= 6, card.id + ": " + field);
  });
  assert.match(card.palette.primary, /^#[0-9A-F]{6}$/i);
  assert.match(card.palette.secondary, /^#[0-9A-F]{6}$/i);
  assert.match(card.palette.glow, /^#[0-9A-F]{6}$/i);
  ["motif", "weapon", "temperament"].forEach(function portraitCore(field) {
    assert.ok(card.portrait[field].length > 0, card.id + ": " + field);
  });

  card.keywords.forEach(function keywordIsExplained(keyword) {
    assert.ok(
      card.text.includes(keyword + " — " + keywordGlossary[keyword]),
      card.id + ": " + keyword
    );
  });
  card.abilities.forEach(function abilityIsExplicit(ability) {
    var trigger = ability.trigger === "onDeath" ? "유언:" : "출전:";
    assert.ok(card.text.includes(trigger), card.id + ": trigger");
    requiredByOp[ability.op].forEach(function requiredFragment(fragment) {
      assert.ok(card.text.includes(fragment), card.id + ": " + fragment);
    });
    if (Number.isInteger(ability.amount)) {
      assert.ok(card.text.includes(String(ability.amount)), card.id + ": amount");
    }
    if (Number.isInteger(ability.attack) || Number.isInteger(ability.health)) {
      assert.ok(
        card.text.includes("+" + ability.attack + "/+" + ability.health),
        card.id + ": stats"
      );
    }
    if (ability.op === "summon_token") {
      assert.ok(
        card.text.includes(tokens[ability.tokenId].name),
        card.id + ": token name"
      );
      assert.ok(
        card.text.includes("최대 " + ability.count + "명"),
        card.id + ": token count"
      );
    }
  });
  ["onPlay", "onDeath"].forEach(function exactTriggerCount(trigger) {
    var expected = card.abilities.filter(function matchingAbility(ability) {
      return ability.trigger === trigger;
    }).length;
    var label = trigger === "onDeath" ? "유언:" : "출전:";
    assert.equal(
      card.text.split(label).length - 1,
      expected,
      card.id + ": " + label
    );
  });
});

assert.equal(
  new Set(cards.map(function identity(card) {
    return card.tactics.identity;
  })).size,
  27
);

var expectedNewCards = {
  shu_ma_chao: {
    stat: [5, 5, 3],
    keywords: ["돌진"],
    target: "none",
    abilities: []
  },
  wei_xu_zhu: {
    stat: [4, 3, 6],
    keywords: ["수호"],
    target: "none",
    abilities: [{ trigger: "onPlay", op: "gain_armor", amount: 1 }]
  },
  wu_lu_xun: {
    stat: [5, 3, 5],
    keywords: [],
    target: "none",
    abilities: [
      { trigger: "onPlay", op: "damage_all_enemies", amount: 1 },
      { trigger: "onPlay", op: "draw", amount: 1 }
    ]
  },
  nanman_meng_huo: {
    stat: [5, 4, 6],
    keywords: [],
    target: "none",
    abilities: [{ trigger: "onDeath", op: "gain_armor", amount: 3 }]
  },
  nanman_zhu_rong: {
    stat: [4, 3, 4],
    keywords: [],
    target: "enemy",
    abilities: [{ trigger: "onPlay", op: "damage_target", amount: 2 }]
  },
  nanman_wu_tu_gu: {
    stat: [6, 4, 8],
    keywords: ["수호", "방패"],
    target: "none",
    abilities: []
  },
  nanman_mu_lu: {
    stat: [5, 3, 5],
    keywords: [],
    target: "none",
    abilities: [{
      trigger: "onPlay",
      op: "summon_token",
      tokenId: "token_nanman_beast",
      count: 2
    }]
  },
  nanman_a_hui_nan: {
    stat: [3, 2, 4],
    keywords: [],
    target: "none",
    abilities: [{
      trigger: "onPlay",
      op: "buff_adjacent",
      attack: 1,
      health: 0
    }]
  }
};

Object.keys(expectedNewCards).forEach(function exactNewCard(id) {
  var expected = expectedNewCards[id];
  var card = byId[id];
  assert.ok(card, id);
  assert.deepEqual([card.cost, card.attack, card.health], expected.stat, id);
  assert.deepEqual(card.keywords, expected.keywords, id);
  assert.equal(card.target, expected.target, id);
  assert.deepEqual(card.abilities, expected.abilities, id);
  ["composition", "armor", "expression", "lighting"].forEach(
    function enhancedPortrait(field) {
      assert.ok(card.portrait[field].length >= 8, id + ": " + field);
    }
  );
});

assert.equal(
  byId.shu_ma_chao.text,
  "돌진 — 이 하수인은 출전한 턴에도 공격할 수 있습니다."
);
assert.equal(
  byId.wei_xu_zhu.text,
  "수호 — 적은 수호 하수인이 하나라도 있으면 수호 하수인만 공격할 수 있습니다. 출전: 내 영웅이 방어도를 1 얻습니다."
);
assert.equal(
  byId.wu_lu_xun.text,
  "출전: 모든 적 하수인에게 피해를 1 줍니다. 출전: 카드를 1장 뽑습니다."
);
assert.equal(
  byId.nanman_meng_huo.text,
  "유언: 내 영웅이 방어도를 3 얻습니다."
);
assert.equal(
  byId.nanman_zhu_rong.text,
  "출전: 내가 선택한 적 캐릭터 하나에게 피해를 2 줍니다."
);
assert.equal(
  byId.nanman_wu_tu_gu.summaryText,
  "수호 · 방패"
);
assert.equal(
  byId.nanman_mu_lu.text,
  "출전: 자신이 차지한 칸을 제외한 내 전장의 빈자리만큼 남만 맹수 토큰을 최대 2명 소환합니다."
);
assert.equal(
  byId.nanman_a_hui_nan.text,
  "출전: 이 하수인 양옆의 아군 하수인에게 +1/+0을 부여합니다."
);

var recipeCases = [
  { key: "wei", aliases: ["wei", "caocao", "조조", "위"], faction: "위", minimum: 14 },
  { key: "shu", aliases: ["shu", "liubei", "유비", "촉"], faction: "촉", minimum: 14 },
  { key: "wu", aliases: ["wu", "sunquan", "손권", "오"], faction: "오", minimum: 14 },
  {
    key: "nanman",
    aliases: ["nanman", "nomad", "이민족", "남만"],
    faction: "남만",
    minimum: 10
  }
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
  assert.ok(
    Object.values(copies).every(function copyLimit(count) {
      return count <= 2;
    }),
    label + ": copy limit"
  );
  assert.ok(cheap >= 3, label + ": cheap curve");
  assert.ok(early >= 10, label + ": early curve");
}

var defaultA = api.buildDeck("same-seed");
var defaultB = api.buildDeck("same-seed");
var defaultC = api.buildDeck("different-seed");
assert.deepEqual(defaultA, defaultB);
assert.notDeepEqual(defaultA, defaultC);
assert.equal(new Set(defaultA).size, 20);
auditDeck(defaultA, "default");
assert.deepEqual(api.buildDeck("same-seed", "unknown"), defaultA);

recipeCases.forEach(function auditFactionRecipe(entry) {
  var canonical = api.buildDeck("recipe-seed", entry.key);
  auditDeck(canonical, entry.key);
  entry.aliases.forEach(function aliasMatches(alias) {
    assert.deepEqual(api.buildDeck("recipe-seed", alias), canonical, alias);
  });
  var focus = canonical.filter(function selectedFaction(id) {
    return byId[id].faction === entry.faction;
  }).length;
  assert.ok(focus >= entry.minimum, entry.key + ": faction focus");
  canonical.forEach(function coverCard(id) {
    recipeCoverage.add(id);
  });
});
cards.forEach(function cardAppearsInRecipe(card) {
  assert.ok(recipeCoverage.has(card.id), card.id + ": recipe coverage");
});

for (var seed = 0; seed < 1000; seed += 1) {
  auditDeck(api.buildDeck(seed), "default-" + seed);
  recipeCases.forEach(function seededFactionDeck(entry) {
    auditDeck(api.buildDeck(seed, entry.key), entry.key + "-" + seed);
  });
}

var recipes = api.getDeckRecipes();
assert.deepEqual(Object.keys(recipes).sort(), [
  "default",
  "nanman",
  "shu",
  "wei",
  "wu"
]);
Object.values(recipes).forEach(function recipeIsTwenty(recipe) {
  assert.equal(recipe.length, 20);
});
recipes.wei[0] = "mutated";
assert.notEqual(api.getDeckRecipes().wei[0], "mutated");

var cardsMutation = api.getCards();
cardsMutation[0].name = "변조";
cardsMutation[0].abilities.push({ trigger: "onPlay", op: "draw", amount: 10 });
assert.notEqual(api.getCards()[0].name, "변조");
assert.notEqual(api.getCards()[0].abilities.length, cardsMutation[0].abilities.length);
tokens.token_nanman_beast.name = "변조";
assert.notEqual(api.getToken("token_nanman_beast").name, "변조");

var balance10000 = api.auditBalance(10000);
assert.equal(balance10000.ok, true);
assert.equal(balance10000.entries.length, 27);
assert.ok(balance10000.minimumRatio >= 0.75);
assert.ok(balance10000.maximumRatio <= 1.45);
assert.equal(report.summary.cards, 27);
assert.equal(report.summary.tokens, 2);
assert.equal(report.summary.deckSize, 20);
assert.equal(report.summary.sample500.firstTurnPlayableRate >= 0.55, true);
assert.deepEqual(report.summary.textMetrics, {
  averageDetailLength: 46.9,
  averageSummaryLength: 18.5,
  longestDetail: { id: "wei_dian_wei", length: 100 },
  longestSummary: { id: "wei_sima_yi", length: 44 }
});

console.log(
  JSON.stringify(
    {
      status: "PASS",
      cards: cards.length,
      tokens: Object.keys(api.getTokens()).length,
      factions: report.summary.factions,
      defaultDeck: defaultA,
      recipes: Object.fromEntries(
        recipeCases.map(function recipeSummary(entry) {
          var deck = api.buildDeck("report-seed", entry.key);
          return [
            entry.key,
            {
              cards: deck.length,
              selectedFactionCards: deck.filter(function sameFaction(id) {
                return byId[id].faction === entry.faction;
              }).length,
              averageCost: Number(
                (deck.reduce(function totalCost(sum, id) {
                  return sum + byId[id].cost;
                }, 0) / deck.length).toFixed(2)
              )
            }
          ];
        })
      ),
      balance: {
        minimumRatio: balance10000.minimumRatio,
        maximumRatio: balance10000.maximumRatio
      },
      textMetrics: report.summary.textMetrics
    },
    null,
    2
  )
);
