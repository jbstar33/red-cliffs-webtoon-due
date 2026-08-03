import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

const source = fs.readFileSync(new URL("./index.js", import.meta.url), "utf8");
const mockSource = fs.readFileSync(new URL("./mock.html", import.meta.url), "utf8");
const cardDataSource = fs.readFileSync(new URL("../card-data/index.js", import.meta.url), "utf8");
const gameShellSource = fs.readFileSync(new URL("../../../app/GameShell.tsx", import.meta.url), "utf8");

function createFake2dHarness() {
  const contexts = [];
  const ownerDocument = {
    createElement(tagName) {
      assert.equal(tagName, "canvas");
      return makeCanvas();
    },
  };
  function makeCanvas() {
    let context;
    const canvas = {
      width: 0,
      height: 0,
      style: {},
      ownerDocument,
      getContext(type) {
        assert.equal(type, "2d");
        return context;
      },
    };
    const gradient = () => ({ addColorStop() {} });
    const state = { depth: 0, maxDepth: 0, underflows: 0, drawImages: 0 };
    const target = {
      canvas,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      filter: "none",
      lineWidth: 1,
      shadowBlur: 0,
      save() {
        state.depth += 1;
        state.maxDepth = Math.max(state.maxDepth, state.depth);
      },
      restore() {
        if (state.depth === 0) {
          state.underflows += 1;
          return;
        }
        state.depth -= 1;
      },
      createLinearGradient: gradient,
      createRadialGradient: gradient,
      createPattern() {
        return {};
      },
      measureText(value) {
        return {
          width: String(value).length * 8,
          actualBoundingBoxAscent: 8,
          actualBoundingBoxDescent: 2,
        };
      },
      drawImage() {
        state.drawImages += 1;
      },
      setLineDash() {},
      getLineDash() {
        return [];
      },
    };
    const fallbackMethods = new Map();
    context = new Proxy(target, {
      get(object, key) {
        if (key in object) return object[key];
        if (!fallbackMethods.has(key)) fallbackMethods.set(key, () => {});
        return fallbackMethods.get(key);
      },
      set(object, key, value) {
        object[key] = value;
        return true;
      },
    });
    contexts.push({ context, state, canvas });
    return canvas;
  }
  return { canvas: makeCanvas(), contexts };
}

const INSPECTOR_GLOSSARY = Object.freeze({
  돌진: "이 하수인은 출전한 턴에도 공격할 수 있습니다.",
  수호: "적은 수호 하수인이 하나라도 있으면 수호 하수인만 공격할 수 있습니다.",
  방패: "이 하수인이 처음 받는 피해를 한 번 전부 막습니다.",
});

const INSPECTOR_ROSTER = Object.freeze([
  { id: "shu_liu_bei", keywords: [], effect: "출전: 내 영웅의 체력을 2 회복합니다(최대 체력까지).", flavor: "사람을 얻는 것이 천하를 얻는 길이다." },
  { id: "shu_guan_yu", keywords: ["돌진"], effect: "", flavor: "청룡의 칼날이 지나간 자리에는 의기만 남는다." },
  { id: "shu_zhang_fei", keywords: ["수호"], effect: "", flavor: "장판교의 일갈에 군마조차 발을 멈췄다." },
  { id: "shu_zhao_yun", keywords: ["돌진", "방패"], effect: "", flavor: "백마 한 필로 포위를 가르고 주군의 뜻을 지켰다." },
  { id: "shu_zhuge_liang", keywords: [], effect: "출전: 카드를 2장 뽑습니다. 출전: 그 후, 비용이 1 이상인 무작위 손패 1장의 비용을 1 줄입니다(최소 0). 대상이 없으면 발동하지 않습니다.", flavor: "동풍은 우연이 아니라 준비된 계책의 마지막 한 수다." },
  { id: "shu_huang_zhong", keywords: [], effect: "출전: 내가 선택한 적 캐릭터 하나에게 피해를 2 줍니다.", flavor: "노장의 화살은 세월보다 멀리 날아간다." },
  { id: "wei_cao_cao", keywords: [], effect: "출전: 모든 아군 하수인(자신 포함)에게 +1/+1을 부여합니다.", flavor: "난세는 영웅을 기다리지 않는다. 영웅이 난세를 쥔다." },
  { id: "wei_sima_yi", keywords: [], effect: "출전: 무작위 적 하수인 하나에게 피해를 2 줍니다. 적 하수인이 없다면 적 영웅이 대신 받습니다. 출전: 내 영웅이 방어도를 2 얻습니다.", flavor: "기다림도 칼이다. 가장 늦게 뽑을 뿐." },
  { id: "wei_xiahou_dun", keywords: ["수호"], effect: "", flavor: "한쪽 눈을 잃고도 전열의 맨 앞을 양보하지 않았다." },
  { id: "wei_dian_wei", keywords: ["수호"], effect: "유언: 무작위 적 하수인 하나에게 피해를 2 줍니다. 적 하수인이 없다면 적 영웅이 대신 받습니다.", flavor: "문이 무너져도 그가 선 자리는 성벽이었다." },
  { id: "wei_zhang_liao", keywords: ["돌진"], effect: "출전: 내 영웅이 방어도를 2 얻습니다.", flavor: "합비의 밤, 팔백 기병이 십만의 꿈을 깨웠다." },
  { id: "wei_guo_jia", keywords: [], effect: "유언: 카드를 1장 뽑습니다.", flavor: "짧은 생은 먼 내일을 읽는 데 부족하지 않았다." },
  { id: "wu_sun_quan", keywords: [], effect: "출전: 자신이 차지한 칸을 제외한 내 전장의 빈자리만큼 강동 수군을 최대 2명 소환합니다.", flavor: "장강을 지키는 일은 사람과 물길을 함께 다스리는 일이다." },
  { id: "wu_zhou_yu", keywords: [], effect: "출전: 모든 적 하수인에게 피해를 2 줍니다.", flavor: "거문고 한 음이 흐트러지면, 불길의 진형도 바로잡는다." },
  { id: "wu_gan_ning", keywords: ["돌진"], effect: "", flavor: "방울 소리가 들렸을 때는 이미 적진 한가운데였다." },
  { id: "wu_lu_meng", keywords: [], effect: "출전: 이전 턴부터 전장에 있었고 이번 턴 이미 공격을 마친 무작위 다른 아군 하수인 하나를 다시 공격할 수 있게 합니다. 조건에 맞는 다른 아군이 없으면 발동하지 않습니다.", flavor: "무장의 칼끝에 학문의 깊이를 더했다." },
  { id: "wu_huang_gai", keywords: [], effect: "유언: 적 영웅에게 피해를 1 줍니다.", flavor: "상처는 거짓이었으나 적벽을 밝힌 충성은 참이었다." },
  { id: "wu_sun_shangxiang", keywords: [], effect: "출전: 내가 선택한 적 캐릭터 하나에게 피해를 1 줍니다.", flavor: "비단 장막 뒤에도 활시위는 늘 팽팽했다." },
  { id: "qun_lu_bu", keywords: ["돌진"], effect: "", flavor: "사람 중에 여포, 말 중에 적토가 있다." },
]);

function inspectorFixtureCard(entry) {
  const keywordSegments = entry.keywords.map(
    (keyword) => `${keyword} — ${INSPECTOR_GLOSSARY[keyword]}`,
  );
  return {
    id: entry.id,
    text: [...keywordSegments, entry.effect].filter(Boolean).join(" "),
    keywords: entry.keywords.slice(),
    flavor: entry.flavor,
  };
}

test("registers the board UI factory without module imports", () => {
  assert.doesNotMatch(source, /\b(?:import|require)\s*\(/);
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const boardModule = sandbox.globalThis.TK.modules.boardUI;
  assert.equal(typeof boardModule.createBoardUI, "function");
  assert.equal(typeof boardModule.renderPortraitGallery, "function");
  assert.equal(boardModule.LOGICAL_WIDTH, 1365);
  assert.equal(boardModule.LOGICAL_HEIGHT, 768);
});

test("implements the integration contract and required controls", () => {
  for (const action of ["PLAY_CARD", "ATTACK", "END_TURN", "USE_COMMANDER_POWER", "RESTART", "CONCEDE", "TOGGLE_MUTE"]) {
    assert.match(source, new RegExp(`type:\\s*[\"']${action}[\"']`));
  }
  for (const method of ["render", "handleEvent", "setThinking", "destroy"]) {
    assert.match(source, new RegExp(`\\b${method}\\b`));
  }
  assert.match(source, /function getAnchor\(kind, detail\)/);
  assert.match(source, /pointerdown/);
  assert.match(source, /pointermove/);
  assert.match(source, /pointerup/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /aria-live/);
});

test("ships a distinct procedural portrait archetype for every playable general", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const ids = Array.from(sandbox.globalThis.TK.modules.boardUI.portraitArchetypeIds);
  assert.equal(sandbox.globalThis.TK.modules.boardUI.faceProfileCount, 28);
  const expected = [
    "shu_liu_bei", "shu_guan_yu", "shu_zhang_fei", "shu_zhao_yun", "shu_zhuge_liang", "shu_huang_zhong",
    "shu_ma_chao",
    "wei_cao_cao", "wei_sima_yi", "wei_xiahou_dun", "wei_dian_wei", "wei_zhang_liao", "wei_guo_jia",
    "wei_xu_zhu",
    "wu_sun_quan", "wu_zhou_yu", "wu_gan_ning", "wu_lu_meng", "wu_huang_gai", "wu_sun_shangxiang",
    "wu_lu_xun", "nanman_meng_huo", "nanman_zhu_rong", "nanman_wu_tu_gu", "nanman_mu_lu",
    "nanman_a_hui_nan", "qun_lu_bu", "token_nanman_beast",
  ];
  assert.equal(ids.length, 28);
  assert.deepEqual(ids.sort(), expected.sort());
  for (const token of [
    "twin-swords-monarch", "crescent-blade-long-beard", "serpent-spear-wild-beard",
    "white-helmet-spear", "scholar-fan-constellation", "elder-archer",
    "crowned-sword-ruler", "black-strategist-raven", "eyepatch-shield",
    "twin-halberds-giant", "cavalry-lance", "bamboo-scroll-adviser",
    "river-crown-sword", "fire-gold-crown-sword", "bells-headscarf-raider",
    "book-and-sword", "elder-fire-ship", "female-archer", "phoenix-crown-halberd",
    "silver-lion-cavalier", "tiger-maul-guardian", "young-fire-tactician",
    "elephant-crown-king", "fire-dagger-huntress", "rattan-horn-bulwark",
    "bone-mask-beastmaster", "horn-bugle-vanguard", "jungle-beast-horned",
  ]) {
    assert.match(source, new RegExp(`archetype:\\s*[\"']${token}[\"']`));
  }
  for (const scene of [
    "taoyuan-oath", "five-passes", "changban-bridge", "changban-rescue", "wuzhang-stars",
    "dingjun-ridge", "guandu-command", "wuzhang-watch", "puyang-arrows", "wan-gate",
    "hefei-charge", "guandu-rain", "yangtze-fleet", "red-cliffs", "night-raid",
    "white-robes", "fire-attack", "river-garden", "hulao-gate",
    "liangzhou-dust", "tong-pass-guard", "yiling-fire-lines", "seven-captures",
    "fire-god-dance", "rattan-gorge", "beast-call", "tribal-rally", "beast-rush",
  ]) {
    assert.match(source, new RegExp(`scene:\\s*[\"']${scene}[\"']`));
  }
  assert.match(source, /function drawHistoricalScene\(/);
  assert.match(source, /function drawPortraitArms\(/);
  assert.match(source, /function drawPortraitTexture\(/);
  assert.match(source, /function portraitFacePath\(/);
  assert.match(source, /function drawPortraitFaceDetails\(/);
  assert.match(source, /if \(compact\)[\s\S]{0,1800}return;/);
  assert.match(source, /const galleryColumns = 3/);
  assert.match(source, /const galleryRows = Math\.ceil\(roster\.length \/ galleryColumns\)/);
  assert.match(source, /const galleryHeight = 54 \+ galleryRows \* rowHeight/);
  assert.doesNotMatch(source, /ctx\.lineTo\(cx \+ radius \* 0\.86, headY \+ radius \* 0\.18\)/);
});

test("derives stable role-aware portraits for newly added generals", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const pangTong = hooks.fallbackPortraitArchetype({
    id: "shu_pang_tong",
    name: "방통",
    faction: "촉",
    role: "책사",
    portrait: { weapon: "연환 부채", motif: "봉추의 연환진" },
  });
  const xiahouYuan = hooks.fallbackPortraitArchetype({
    id: "wei_xiahou_yuan",
    name: "하후연",
    faction: "위",
    role: "명궁",
    portrait: { weapon: "강궁" },
  });
  const diaoChan = hooks.fallbackPortraitArchetype({
    id: "qun_diao_chan",
    name: "초선",
    faction: "군웅",
    role: "무희",
    portrait: { weapon: "비단 부채" },
  });
  assert.match(pangTong.archetype, /strategist|tactician/);
  assert.match(xiahouYuan.weapon, /bow|crossbow/);
  assert.equal(diaoChan.feminine, true);
  assert.deepEqual(
    { ...hooks.fallbackPortraitArchetype({ id: "shu_pang_tong", name: "방통", faction: "촉", role: "책사" }) },
    { ...hooks.fallbackPortraitArchetype({ id: "shu_pang_tong", name: "방통", faction: "촉", role: "책사" }) },
  );
});

test("keeps clicked inspection state until close or Escape and exposes it accessibly", () => {
  assert.match(source, /let inspection = null/);
  assert.match(source, /function openInspection\(hit, state\)/);
  assert.match(source, /function closeInspection\(announce\)/);
  assert.match(source, /data-inspection-card-id/);
  assert.match(source, /aria-description/);
  assert.match(source, /inspectionAnnouncement\(card\)/);
  assert.match(source, /hit\.type === "inspection-close"/);
  assert.match(source, /event\.key === "Escape"[\s\S]{0,160}closeInspection\(true\)/);
  assert.match(source, /const previewCard = inspection[\s\S]{0,140}hoverCard/);
});

test("shows one concise tactical label on cards while previews keep full semantic copy", () => {
  assert.match(source, /function semanticTextLines\(ctx, text, maxWidth, maxLines\)/);
  assert.match(source, /function cardTacticalLabel\(card\)/);
  assert.match(source, /const statsClearance = configCard\.preview \? 25 \* scale : 28 \* scale/);
  assert.match(source, /roundedRect\(ctx, x \+ 12 \* scale,[\s\S]{0,220}ctx\.clip\(\)/);
  assert.match(source, /if \(configCard\.preview\) \{[\s\S]{0,260}semanticTextLines\(ctx, cardCopy, width - 30 \* scale, 6\)/);
  assert.match(source, /const tacticalLines = semanticTextLines\([\s\S]{0,120}cardTacticalLabel\(card\)[\s\S]{0,80}2/);
  assert.match(source, /tacticalLines\.forEach/);
  assert.match(source, /getCardValue\(card, "summaryText", getCardValue\(card, "text", ""\)\)/);
  assert.match(source, /function inspectorTextLayout\(card, width, maxHeight\)/);
  assert.match(source, /const sizes = \[17, 16, 15, 14, 13, 12, 11\]/);
  assert.match(source, /semanticTextLines\([\s\S]{0,80}content\.abilityText,[\s\S]{0,40}width,[\s\S]{0,20}99/);
  assert.match(source, /keywordDefinitions/);
  assert.match(source, /발동 · 키워드/);
});

test("places circular player mana above the deck and outside the hand wings", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const mana = hooks.playerManaGeometry();
  assert.deepEqual({ ...mana }, { cx: 1279, cy: 554, radius: 36, deckTop: 602 });
  assert.ok(mana.cy + mana.radius < mana.deckTop);
  const rightmostHand = hooks.playerHandLayoutGeometry(10, 9);
  assert.ok(rightmostHand.x + 58 < mana.cx - mana.radius);
  assert.match(source, /const angle = -Math\.PI \/ 2 \+ index \* TAU \/ 10/);
  assert.match(source, /drawCenteredText\(ctx, `\$\{mana\}\/\$\{maxMana\}`/);
});

test("semantic wrapping preserves every Korean word in Sima Yi's two effects", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const wrap = sandbox.globalThis.TK.modules.boardUI.testHooks.semanticTextLines;
  const context = { measureText: (value) => ({ width: String(value).length * 9 }) };
  const full = "출전: 무작위 적 하나에게 피해를 2 줍니다. 출전: 방어도를 2 얻습니다.";
  const lines = Array.from(wrap(context, full, 126, 99));
  const rendered = lines.join(" ").replace(/\s+([,.!?·:;)])/g, "$1").replace(/([(])\s+/g, "$1");
  assert.match(rendered, /무작위 적 하나에게 피해를 2 줍니다/);
  assert.match(rendered, /방어도를 2 얻습니다/);
  assert.equal(rendered.replace(/\s/g, ""), full.replace(/\s/g, ""));
});

test("semantic wrapping never leaves Zhao Yun's shield period on an orphan line", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  vm.runInNewContext(cardDataSource, sandbox, { filename: "card-data/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const cardData = sandbox.globalThis.TK.modules.cardData;
  const zhaoYun = Array.from(cardData.getCards()).find(
    (card) => card.id === "shu_zhao_yun",
  );
  const glossary = cardData.getKeywordGlossary();
  const shieldKeyword = zhaoYun.keywords.find((keyword) => glossary[keyword]);
  const definition = glossary[shieldKeyword];
  const context = {
    measureText(value) {
      return { width: Array.from(String(value)).length * 10 };
    },
  };
  const maxWidth = context.measureText(definition.slice(0, -1)).width;
  const lines = hooks.semanticTextLines(context, definition, maxWidth, 99);
  assert.equal(lines.join(" "), definition);
  assert.ok(lines.every((line) => !/^[,.!?·:;()]+$/.test(line)));
  assert.ok(lines.every((line) => context.measureText(line).width <= maxWidth));
});

test("normalizes exact keyword glossary segments once across all nineteen inspector models", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  assert.equal(INSPECTOR_ROSTER.length, 19);
  INSPECTOR_ROSTER.forEach((fixture) => {
    const card = inspectorFixtureCard(fixture);
    const details = hooks.resolveCardKeywordDetails(card, {});
    const model = hooks.inspectorContentModel(card, details);
    assert.equal(model.abilityText, fixture.effect, `${fixture.id}: effect text changed`);
    assert.equal(Boolean(model.abilityBlock), Boolean(fixture.effect), `${fixture.id}: phantom ability block`);
    assert.doesNotMatch(model.abilityText, /능력 없음/);
    const visibleModel = [
      model.abilityText,
      ...Array.from(model.keywordRows, (row) => `${row.label}: ${row.definition}`),
    ].join(" ");
    fixture.keywords.forEach((keyword) => {
      const definition = INSPECTOR_GLOSSARY[keyword];
      assert.equal(
        visibleModel.split(definition).length - 1,
        1,
        `${fixture.id}: ${keyword} definition should appear once`,
      );
      assert.ok(
        Array.from(model.keywordRows).some(
          (row) => row.name === keyword && row.definition === definition,
        ),
        `${fixture.id}: missing ${keyword} row`,
      );
    });
  });

  const nearMiss = {
    id: "exact-only",
    text: `돌진 — ${INSPECTOR_GLOSSARY.돌진.slice(0, -1)}!`,
    keywords: ["돌진"],
  };
  const nearMissDetails = hooks.resolveCardKeywordDetails(nearMiss, {});
  assert.equal(hooks.normalizeInspectorAbilityText(nearMiss, nearMissDetails), nearMiss.text);
});

test("integrates exact normalization with all fifty production card-data texts and glossary", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  vm.runInNewContext(cardDataSource, sandbox, { filename: "card-data/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const cardData = sandbox.globalThis.TK.modules.cardData;
  const cards = Array.from(cardData.getCards());
  const glossary = cardData.getKeywordGlossary();
  assert.equal(cards.length, 50);
  cards.forEach((card) => {
    const details = hooks.resolveCardKeywordDetails(card, glossary);
    const model = hooks.inspectorContentModel(card, details);
    let expectedAbility = card.text;
    card.keywords.forEach((keyword) => {
      expectedAbility = expectedAbility
        .split(`${keyword} — ${glossary[keyword]}`)
        .join(" ");
    });
    expectedAbility = expectedAbility.replace(/[ \t\r\n]+/g, " ").trim();
    assert.equal(model.abilityText, expectedAbility, `${card.id}: production effect changed`);
    card.keywords.forEach((keyword) => {
      assert.equal(
        model.keywordRows.filter(
          (row) => row.name === keyword && row.definition === glossary[keyword],
        ).length,
        1,
        `${card.id}: production ${keyword} row`,
      );
    });

    // main may omit the glossary option; the safe fallback derives only a
    // complete `keyword — one sentence.` segment from the production text.
    const fallbackDetails = hooks.resolveCardKeywordDetails(card, {});
    const fallbackModel = hooks.inspectorContentModel(card, fallbackDetails);
    assert.equal(fallbackModel.abilityText, expectedAbility, `${card.id}: fallback mismatch`);
  });
});

test("fits production formation, linkage, status, keyword, and ability copy in the inspector", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  vm.runInNewContext(cardDataSource, sandbox, { filename: "card-data/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const cardData = sandbox.globalThis.TK.modules.cardData;
  const glossary = cardData.getKeywordGlossary();
  const harness = createFake2dHarness();
  const context = harness.contexts[0].context;
  cardData.getCards().forEach((card) => {
    const details = hooks.resolveCardKeywordDetails(card, glossary);
    const layout = hooks.calculateInspectorTextLayout(context, card, 252, 403, details);
    assert.ok(layout.totalHeight <= 403, `${card.id}: inspector overflow ${layout.totalHeight}`);
    const tactics = card.tactics || {};
    if (tactics.placement) assert.ok(layout.strategyRows.some((row) => row.label === "배치 추천"));
    if (tactics.linkCondition) assert.ok(layout.strategyRows.some((row) => row.label === "연계 조건"));
    if (tactics.statusDuration) assert.ok(layout.strategyRows.some((row) => row.label === "상태 지속"));
  });
  const luBu = cardData.getCards().find((card) => card.id === "qun_lu_bu");
  const stressedLuBu = {
    ...luBu,
    burning: 2,
    attackPenalty: 1,
    storedCounter: 2,
    attackLockPending: true,
    emptyFort: true,
    secondAttackPenalty: true,
    formationProtected: true,
  };
  const stressedDetails = hooks.resolveCardKeywordDetails(stressedLuBu, glossary);
  const stressedLayout = hooks.calculateInspectorTextLayout(context, stressedLuBu, 252, 403, stressedDetails);
  assert.ok(stressedLayout.totalHeight <= 403, `stressed Lu Bu overflow ${stressedLayout.totalHeight}`);
  assert.equal(stressedLayout.strategyRows.filter((row) => row.section === "status").length, 1);
  assert.match(stressedLayout.strategyRows.find((row) => row.section === "status").text, /후열 보호.*화상.*호통.*반계.*봉쇄.*공성계.*반동/);
});

test("production multi-term inspector ARIA uses one sentence boundary and preserves each meaning once", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  vm.runInNewContext(cardDataSource, sandbox, { filename: "card-data/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const cardData = sandbox.globalThis.TK.modules.cardData;
  const cards = Object.fromEntries(
    Array.from(cardData.getCards()).map((card) => [card.id, card]),
  );
  const glossary = cardData.getKeywordGlossary();

  for (const id of ["shu_zhao_yun", "wei_dian_wei", "wei_zhang_liao"]) {
    const card = cards[id];
    const details = hooks.resolveCardKeywordDetails(card, glossary);
    const model = hooks.inspectorContentModel(card, details);
    const announcement = hooks.inspectorAnnouncementText(card, details);
    assert.doesNotMatch(announcement, /\.\./, `${id}: duplicate sentence boundary`);
    if (model.abilityText) {
      assert.equal(
        announcement.split(model.abilityText).length - 1,
        1,
        `${id}: normalized ability spoken once`,
      );
    }
    details.forEach((entry) => {
      assert.equal(
        announcement.split(entry.definition).length - 1,
        1,
        `${id}: ${entry.label || entry.name} definition spoken once`,
      );
    });
  }
});

test("mixed, pure-keyword, and ability-only inspectors preserve semantics and accessible definitions", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const byId = Object.fromEntries(INSPECTOR_ROSTER.map((fixture) => [fixture.id, fixture]));
  const inspect = (id, overrides) => {
    const card = { ...inspectorFixtureCard(byId[id]), name: id, ...(overrides || {}) };
    const details = hooks.resolveCardKeywordDetails(card, {});
    return {
      card,
      details,
      model: hooks.inspectorContentModel(card, details),
      announcement: hooks.inspectorAnnouncementText(card, details),
    };
  };

  const zhangLiao = inspect("wei_zhang_liao");
  assert.equal(zhangLiao.model.abilityText, "출전: 내 영웅이 방어도를 2 얻습니다.");
  assert.equal(zhangLiao.model.keywordRows.filter((row) => row.name === "돌진").length, 1);
  assert.equal(zhangLiao.announcement.split(zhangLiao.model.abilityText).length - 1, 1);
  assert.equal(zhangLiao.announcement.split(INSPECTOR_GLOSSARY.돌진).length - 1, 1);

  const zhaoYun = inspect("shu_zhao_yun");
  assert.equal(zhaoYun.model.abilityBlock, null);
  assert.equal(zhaoYun.model.abilityText, "");
  assert.equal(zhaoYun.model.keywordRows.length, 2);
  for (const keyword of ["돌진", "방패"]) {
    assert.equal(zhaoYun.announcement.split(INSPECTOR_GLOSSARY[keyword]).length - 1, 1);
  }

  const simaYi = inspect("wei_sima_yi");
  assert.equal(simaYi.model.abilityText, byId.wei_sima_yi.effect);
  assert.equal(simaYi.model.keywordRows.filter((row) => row.name === "출전").length, 1);

  const spentShield = inspect("shu_zhao_yun", { shield: false });
  const spentRow = spentShield.details.find((row) => row.name === "방패");
  assert.equal(spentRow.label, "방패 소모");
  assert.equal(spentShield.announcement.split(spentRow.definition).length - 1, 1);
  assert.match(spentShield.announcement, /방패 소모:/);

  const previewStart = source.indexOf("function drawCardPreview");
  const previewEnd = source.indexOf("function drawVictory", previewStart);
  const previewBody = source.slice(previewStart, previewEnd);
  assert.match(previewBody, /if \(layout\.hasAbility\) \{/);
  assert.match(previewBody, /if \(layout\.hasAbility\)[\s\S]{0,220}fillText\("능력"/);
  assert.doesNotMatch(
    source.slice(source.indexOf("function inspectorTextLayout"), previewStart),
    /\|\| "능력 없음"/,
  );
});

test("all nineteen normalized inspector layouts fit without phantom ability spacing", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const cjkEmVariants = [0.95, 1];
  let tallest = null;
  cjkEmVariants.forEach((cjkEm) => {
    const context = {
      font: "",
      measureText(value) {
        const match = /(\d+(?:\.\d+)?)px/.exec(this.font);
        const fontSize = match ? Number(match[1]) : 16;
        const width = Array.from(String(value)).reduce(
          (sum, character) => {
            if (character === " ") return sum + fontSize * 0.33;
            if (/[!-~]/.test(character)) return sum + fontSize * 0.56;
            return sum + fontSize * cjkEm;
          },
          0,
        );
        return { width };
      },
    };
    INSPECTOR_ROSTER.forEach((fixture) => {
      const card = inspectorFixtureCard(fixture);
      const details = hooks.resolveCardKeywordDetails(card, {});
      const layout = hooks.calculateInspectorTextLayout(context, card, 252, 355, details);
      assert.ok(layout.totalHeight <= 355, `${fixture.id}@${cjkEm}em: ${layout.totalHeight}`);
      if (!fixture.effect) {
        assert.equal(layout.hasAbility, false);
        assert.equal(layout.abilityLines.length, 0);
        assert.equal(layout.abilityBlockHeight, 0);
      }
      if (!tallest || layout.totalHeight > tallest.totalHeight) {
        tallest = { id: fixture.id, cjkEm, totalHeight: layout.totalHeight };
      }
    });
  });
  assert.ok(tallest.totalHeight <= 355);
});

test("mock exercises all portraits and representative long-form card text", () => {
  const ids = mockSource.match(/\["(?:shu|wei|wu|nanman|qun)_[a-z_]+"/g) || [];
  assert.equal(ids.length, 50);
  assert.match(mockSource, /aria-label="50인 초상 검수 갤러리"/);
  for (const id of [
    "shu_ma_chao", "wei_xu_zhu", "wu_lu_xun", "nanman_meng_huo",
    "nanman_zhu_rong", "nanman_wu_tu_gu", "nanman_mu_lu", "nanman_a_hui_nan",
  ]) {
    assert.match(mockSource, new RegExp(`${id}:`));
  }
  assert.match(mockSource, /무작위 적 하나에게 피해를 2 줍니다\. 출전: 방어도를 2 얻습니다/);
  assert.match(mockSource, /손의 무작위 카드 하나의 비용을 1 감소시킵니다/);
  assert.match(mockSource, /player: \[card\(5\), card\(6\), card\(7\), card\(8\), card\(9\)\]/);
  assert.match(mockSource, /ai:\s*\[\s*Object\.assign\(card\(0\)/);
  assert.match(mockSource, /player: \[card\(10\), card\(11\), card\(12\), card\(13\), card\(14\), card\(15\), card\(16\), card\(17\), card\(18\)\]/);
  assert.match(mockSource, /card\(18\)/);
  assert.match(mockSource, /renderPortraitGallery/);
  assert.match(mockSource, /get\("gallery"\) === "1"/);
  assert.match(mockSource, /const mockHandCount = Number\(mockParams\.get\("hand"\)\)/);
  assert.match(mockSource, /mockHandCount === 1 \|\| mockHandCount === 2/);
  assert.match(mockSource, /state\.hands\.player = state\.hands\.player\.slice\(0, mockHandCount\)/);
});

test("derives trigger definitions and consistently presents on-death as 유언", () => {
  assert.match(source, /유언: "이 장수가 쓰러질 때 한 번 발동합니다\."/);
  assert.match(source, /ability\.trigger === "onPlay"/);
  assert.match(source, /ability\.trigger === "onDeath"/);
  assert.match(source, /entries\.push\(\{ keyword: "출전", kind: "trigger" \}\)/);
  assert.match(source, /entries\.push\(\{ keyword: "유언", kind: "trigger" \}\)/);
  assert.match(source, /replace\(\/죽음\\s\*:\/g, "유언:"\)/);
  assert.match(source, /\(출전:\|유언:\|돌진\|돌파\|수호\|방패\|의형제\|군략\|연화\|약탈\|천하무쌍/);
});

test("pinned inspector blocks click-through and closing clears armed selection", () => {
  const previewStart = source.indexOf("function drawCardPreview");
  const panelHit = source.indexOf('addHit("inspection-panel"', previewStart);
  const closeHit = source.indexOf('addHit("inspection-close"', previewStart);
  assert.ok(panelHit > previewStart);
  assert.ok(closeHit > panelHit);
  assert.match(source, /if \(hit\.type === "inspection-panel"\) return;/);
  assert.match(source, /function closeInspection\(announce\) \{[\s\S]{0,560}inspection = null;[\s\S]{0,100}cancelSelection\(\)/);
});

test("the player commander redraws above every hand card while vital gems stay last", () => {
  assert.match(
    source,
    /drawLog\(state\)[\s\S]{0,160}drawPlayerHand\(state\.hands[\s\S]{0,160}drawMana\([\s\S]{0,180}drawPlayerHand\(state\.hands[\s\S]{0,120}true\)[\s\S]{0,160}drawHero\("player"[\s\S]{0,120}false\)[\s\S]{0,120}drawPlayerVitalGemOverlay\(/,
  );
  assert.match(source, /function drawPlayerHand\(cards, state, now, overlayOnly\)/);
  assert.match(source, /if \(!overlayOnly\) \{[\s\S]{0,260}addHit\([\s\S]{0,80}"hand-card"/);
  const vitalStart = source.indexOf("function drawPlayerVitalGemOverlay");
  const vitalEnd = source.indexOf("function drawMana", vitalStart);
  const vitalBody = source.slice(vitalStart, vitalEnd);
  assert.match(vitalBody, /center\.x \+ 49/);
  assert.match(vitalBody, /center\.x - 49/);
  assert.match(vitalBody, /protectGem\(healthX, healthY, 21\)/);
  assert.match(vitalBody, /drawCommanderIdentityRibbon\("player", state\)/);
  assert.doesNotMatch(vitalBody, /addHit\(|drawImage\(heroArt|drawPlayerHand/);
});

test("shows only the concise tactical identity pill in inspection metadata", () => {
  assert.match(source, /const tactics = getCardValue\(card, "tactics", \{\}\)/);
  assert.match(source, /const tacticalIdentity = String\(tactics\.identity/);
  assert.match(source, /`전술 · \$\{tacticalIdentity\}`/);
  assert.doesNotMatch(source, /tactics\.(?:plan|combo|counter)/);
  assert.match(mockSource, /qun_lu_bu: "최종 돌진 병기"/);
  assert.match(
    mockSource,
    /tactics: \{ identity: tacticalIdentities\[general\[0\]\] \|\| `\$\{general\[4\]\} 전술` \}/,
  );
});

test("uses anime-cel portrait finishes and protects the art from name overlays", () => {
  const painterProfiles = source.match(/"[^"]+": \{ yaw: [\d.]+, headX:/g) || [];
  assert.equal(painterProfiles.length, 28);
  assert.match(source, /function paintAtmosphericDepth\(/);
  assert.match(source, /function paintFaceValues\(/);
  assert.match(source, /function paintSurfaceGlaze\(/);
  assert.match(source, /const strokes = compact \? 2 : 6/);
  assert.match(source, /function paintAnimeCelFaceFinish\(/);
  assert.match(source, /function paintAnimeActionPanelFinish\(/);
  assert.match(source, /compact \? 0\.16 : 0\.155/);
  const wrapperStart = source.indexOf("function drawPortrait(ctx");
  const wrapperEnd = source.indexOf("function portraitFacePath", wrapperStart);
  const paintedStart = source.indexOf("function paintPortraitUncached");
  const paintedEnd = source.indexOf("function heroShieldPath", paintedStart);
  assert.doesNotMatch(source.slice(wrapperStart, wrapperEnd), /drawCenteredText/);
  assert.doesNotMatch(source.slice(paintedStart, paintedEnd), /drawCenteredText/);
});

test("art7 gives the complete roster unique facial sittings with bounded brush budgets", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const boardModule = sandbox.globalThis.TK.modules.boardUI;
  const hooks = boardModule.testHooks;
  const ids = Array.from(boardModule.portraitArchetypeIds);
  const profiles = ids.map((id) => hooks.faceArt7Profile(id));
  const fingerprints = profiles.map((profile) => JSON.stringify(profile));
  assert.equal(boardModule.art7FaceProfileCount, 28);
  assert.equal(profiles.length, 28);
  assert.equal(new Set(fingerprints).size, 28);
  for (const field of [
    "browArch", "browBreak", "eyeSet", "eyeWidth", "gazeX", "gazeY",
    "noseLength", "noseRidge", "mouthWidth", "mouthTilt", "jawShade",
    "roughness", "scar", "wrinkle", "warm", "cool", "hairSoftness",
  ]) {
    assert.ok(profiles.every((profile) => Object.hasOwn(profile, field)), `missing ${field}`);
  }
  assert.ok(new Set(profiles.map((profile) => profile.scar)).size >= 12);
  assert.ok(new Set(profiles.map((profile) => profile.wrinkle)).size >= 16);
  assert.deepEqual(
    Array.from(new Set(ids.map((id) => hooks.art7BrushBudget(id, true)))),
    [7],
  );
  const detailBudgets = ids.map((id) => hooks.art7BrushBudget(id, false));
  assert.ok(Math.min(...detailBudgets) >= 19);
  assert.ok(Math.max(...detailBudgets) <= 30);
  assert.ok(detailBudgets.every((budget) => budget > 7));
});

test("keeps material, hair, beard, and depth layers while the anime path skips painterly skin texture", () => {
  for (const painter of [
    "paintAnatomicalBrushworkV7",
    "paintIndividualFaceMarksV7",
    "paintHairEdgeResponseV7",
    "paintBeardEdgeResponseV7",
    "paintMaterialEdgeResponseV7",
    "paintBackgroundDepthOfFieldV7",
    "paintNearDepthOfFieldV7",
  ]) {
    assert.match(source, new RegExp(`function ${painter}\\(`));
  }
  const portraitStart = source.indexOf("function paintPortraitUncached");
  const portraitEnd = source.indexOf("function heroShieldPath", portraitStart);
  const portraitBody = source.slice(portraitStart, portraitEnd);
  const planes = portraitBody.indexOf("paintFacePlanes(");
  const features = portraitBody.indexOf("paintFacialFeatures(");
  const marks = portraitBody.indexOf("paintIndividualFaceMarksV7(");
  const hair = portraitBody.indexOf("paintHairEdgeResponseV7(");
  const beard = portraitBody.indexOf("paintBeardEdgeResponseV7(");
  assert.ok(planes < features && features < marks && marks < hair && hair < beard);
  assert.doesNotMatch(portraitBody, /paintFacialDepthV8\(/);
  assert.doesNotMatch(portraitBody, /paintAnatomicalBrushworkV7\(/);
  assert.doesNotMatch(portraitBody, /paintSkinMicrostructure\(/);
  assert.match(portraitBody, /ANIME_CEL_STYLE_VERSION/);
  assert.doesNotMatch(portraitBody, /Math\.random/);

  const backgroundDof = portraitBody.indexOf("paintBackgroundDepthOfFieldV7(");
  const subjectBacklight = portraitBody.indexOf("paintSubjectDepthBacklight(");
  const weapon = portraitBody.indexOf("paintWeaponLandmark(");
  const nearDof = portraitBody.indexOf("paintNearDepthOfFieldV7(");
  const compactSignature = portraitBody.indexOf("paintCompactSignatureSilhouette(");
  const glaze = portraitBody.indexOf("paintSurfaceGlaze(");
  assert.ok(backgroundDof >= 0 && backgroundDof < subjectBacklight);
  assert.ok(weapon < nearDof && nearDof < compactSignature && compactSignature < glaze);
  assert.match(source, /ANIME_CEL_STYLE_VERSION,[\s\S]{0,120}profile\.bucket/);
});

test("art7 material edges have six measurably different softness, shine, and occlusion responses", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const boardModule = sandbox.globalThis.TK.modules.boardUI;
  const hooks = boardModule.testHooks;
  const names = ["silk", "lacquered-lamellar", "raw-iron", "leather", "wood", "feather"];
  const responses = names.map((name) => hooks.materialEdgeResponse(name));
  assert.equal(boardModule.materialEdgeResponseCount, 6);
  assert.equal(new Set(responses.map((response) => JSON.stringify(response))).size, 6);
  assert.ok(hooks.materialEdgeResponse("feather").softness > hooks.materialEdgeResponse("silk").softness);
  assert.ok(hooks.materialEdgeResponse("silk").softness > hooks.materialEdgeResponse("raw-iron").softness);
  assert.ok(hooks.materialEdgeResponse("lacquered-lamellar").specularGain > hooks.materialEdgeResponse("leather").specularGain);
  assert.ok(hooks.materialEdgeResponse("raw-iron").occlusion > hooks.materialEdgeResponse("feather").occlusion);
});

test("art7 paints the full twenty-seven-card HAND and DETAIL gallery through a balanced fake 2D context", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const boardModule = sandbox.globalThis.TK.modules.boardUI;
  const harness = createFake2dHarness();
  const factionByPrefix = { shu: "촉", wei: "위", wu: "오", qun: "군웅" };
  const productionIds = Array.from(boardModule.portraitArchetypeIds)
    .filter((id) => id !== "token_nanman_beast");
  const cards = productionIds.map((id, index) => ({
    id,
    name: `장수${index + 1}`,
    faction: factionByPrefix[String(id).split("_")[0]],
    role: "장수",
  }));
  const result = boardModule.renderPortraitGallery(harness.canvas, cards);
  assert.deepEqual(
    { ...result },
    { width: 1320, height: 1476, count: 27, columns: 3, rows: 9 },
  );
  assert.ok(harness.contexts.length >= 55);
  assert.ok(harness.contexts.every(({ state }) => state.depth === 0));
  assert.ok(harness.contexts.every(({ state }) => state.underflows === 0));
  const cache = boardModule.testHooks.portraitCacheSnapshot();
  assert.equal(cache.paints, 54);
  assert.equal(cache.misses, 54);
  assert.equal(cache.size, 54);
  assert.ok(cache.size <= cache.limit);
});

test("all production portraits and the Jiangdong token survive uncached preview, damage, and death rendering", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  vm.runInNewContext(cardDataSource, sandbox, { filename: "card-data/index.js" });
  const boardModule = sandbox.globalThis.TK.modules.boardUI;
  const cardData = sandbox.globalThis.TK.modules.cardData;
  const hooks = boardModule.testHooks;
  const harness = createFake2dHarness();
  const context = harness.canvas.getContext("2d");
  const cards = Array.from(cardData.getCards());
  const jiangdongMarine = cardData.getToken("token_jiangdong_marine");
  const nanmanBeast = cardData.getToken("token_nanman_beast");
  const partialMarineInstance = {
    instanceId: "card-partial-marine",
    definition: jiangdongMarine,
    currentAttack: 1,
    currentHealth: 0,
  };
  const unregisteredPreview = {
    id: "test_unregistered_general",
    instanceId: "card-unregistered",
    name: "이름 없는 장수",
    faction: "오",
    attack: 1,
    health: 1,
    cost: 0,
  };
  assert.equal(cards.length, 50);
  assert.ok(hooks.portraitArchetype(jiangdongMarine).archetype);
  assert.equal(hooks.portraitArchetype(nanmanBeast).archetype, "jungle-beast-horned");
  assert.deepEqual(
    hooks.portraitArchetype(partialMarineInstance),
    hooks.portraitArchetype(jiangdongMarine),
  );
  assert.ok(hooks.portraitArchetype(unregisteredPreview).archetype);
  cards.forEach((card) => {
    assert.notEqual(
      hooks.portraitArchetype(card).archetype,
      "wandering-general",
      `${card.id}: production portrait mapping`,
    );
  });

  const renderStates = [
    { label: "HAND", width: 96, height: 66, compact: false, patch: {} },
    { label: "DETAIL", width: 250, height: 126, compact: false, patch: {} },
    { label: "ACTIVE_PREVIEW", width: 250, height: 126, compact: false, patch: { canAttack: true } },
    { label: "DAMAGED_PREVIEW", width: 250, height: 126, compact: false, patch: { currentHealth: 1 } },
    { label: "DEATH_PREVIEW", width: 250, height: 126, compact: false, patch: { currentHealth: 0, dying: true } },
  ];
  for (const card of cards.concat(
    jiangdongMarine,
    nanmanBeast,
    partialMarineInstance,
    unregisteredPreview,
  )) {
    for (const state of renderStates) {
      const runtimeCard = {
        ...card,
        ...state.patch,
        instanceId: `${card.id}-${state.label}`,
      };
      assert.doesNotThrow(
        () => hooks.paintPortraitUncached(
          context,
          0,
          0,
          state.width,
          state.height,
          runtimeCard,
          state.compact,
        ),
        `${card.id}: ${state.label}`,
      );
    }
  }
  assert.ok(harness.contexts.every(({ state }) => state.depth === 0));
  assert.ok(harness.contexts.every(({ state }) => state.underflows === 0));
});

test("leaves spectacle drawing to fx while synchronizing board presentation snapshots", () => {
  const handleStart = source.indexOf("function handleEvent(type, detail)");
  const handleEnd = source.indexOf("function render(nextState)", handleStart);
  const handleBody = source.slice(handleStart, handleEnd);
  assert.doesNotMatch(handleBody, /transientBursts/);
  assert.doesNotMatch(source, /function drawTurnBanner|function drawTransientBursts/);
  assert.match(handleBody, /type === "attack:start"/);
  assert.match(handleBody, /type === "hero:damage"[\s\S]{0,100}rememberHeroDamage/);
  assert.match(handleBody, /type === "minion:death"[\s\S]{0,100}rememberDyingGhost/);
  assert.doesNotMatch(handleBody, /drawExplosion|drawImpact|spawnParticles/);
  assert.match(source, /const GAME_END_REVEAL_DELAY = 900/);
  assert.match(source, /if \(now < gameEndRevealAt\) return/);
  assert.match(source, /gameEndRevealAt = now \+ GAME_END_REVEAL_DELAY/);
});

test("dispatches guard and formation-blocked attacks for authoritative feedback", () => {
  assert.match(source, /function isGuardBlockedAttackTarget\(target, selectedItem, state\)/);
  assert.match(source, /if \(guards\.length === 0\) return false/);
  assert.match(source, /function isFormationBlockedAttackTarget\(target, selectedItem, state\)/);
  assert.match(source, /cardHasKeyword\(attacker, "저격"\) && !cardHasKeyword\(attacker, "돌파"\)/);
  assert.match(
    source,
    /isGuardBlockedAttackTarget\(target, selection, state\)[\s\S]{0,120}isFormationBlockedAttackTarget\(target, selection, state\)[\s\S]{0,180}type: "ATTACK"[\s\S]{0,100}cancelSelection\(\)/,
  );
  assert.match(source, /const color = allowed \? "#ffdd73" : "#ee644f"/);
});

test("lays out two three-slot rows and preserves deterministic legacy auto placement", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const board = [
    { instanceId: "fixed", row: "rear", slot: 1 },
    { instanceId: "legacy-a" },
    { instanceId: "legacy-b" },
    { instanceId: "duplicate", row: "rear", slot: 1 },
  ];
  assert.deepEqual(
    Array.from(hooks.formationBoardLayout(board), (placement) => ({ ...placement })),
    [
      { row: "rear", slot: 1 },
      { row: "front", slot: 0 },
      { row: "front", slot: 1 },
      { row: "front", slot: 2 },
    ],
  );
  assert.deepEqual(
    Array.from(hooks.availableFormationPlacements(board), (placement) => ({ ...placement })),
    [{ row: "rear", slot: 0 }, { row: "rear", slot: 2 }],
  );
  const aiRear = hooks.formationSlotGeometry("ai", "rear", 0);
  const aiFront = hooks.formationSlotGeometry("ai", "front", 0);
  const playerFront = hooks.formationSlotGeometry("player", "front", 0);
  const playerRear = hooks.formationSlotGeometry("player", "rear", 0);
  assert.ok(aiRear.y < aiFront.y && aiFront.y < playerFront.y && playerFront.y < playerRear.y);
  assert.equal(aiRear.width, 112);
  assert.equal(aiRear.height, 92);
  assert.match(source, /addHit\("formation-slot"/);
  assert.match(source, /前  전열/);
  assert.match(source, /後  후열/);
});

test("uses a placement-first two-step play flow for click, drag, keyboard, and touch", () => {
  assert.match(source, /function activatePlacement\(hit, state\)/);
  assert.match(
    source,
    /type: "PLAY_CARD"[\s\S]{0,120}placement: \{ \.\.\.placement \}/,
  );
  assert.match(
    source,
    /type: "PLAY_CARD"[\s\S]{0,160}target,[\s\S]{0,100}placement: \{ \.\.\.selection\.placement \}/,
  );
  assert.match(source, /if \(!selectedItem\.placement\) return false/);
  assert.match(source, /if \(selection && activatePlacement\(hit, state\)\) return/);
  assert.match(source, /if \(activatePlacement\(releaseHit, state\)\)/);
  assert.match(source, /selection\.index === hit\.data\.index[\s\S]{0,100}placement: \{ \.\.\.selection\.placement \}/);
  assert.match(source, /hit\.type === "formation-slot"/);
  assert.match(source, /canvas\.style\.touchAction = "none"/);
});

test("shows formation protection and readable strategy and runtime status details", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const card = {
    tactics: {
      placement: "후열 추천 — 생존 시간을 확보합니다.",
      linkCondition: "다른 위 아군이 있을 때 군략 발동.",
      statusDuration: "다음 내 턴 시작까지 유지.",
    },
    burning: 2,
    storedCounter: 1,
    formationProtected: true,
  };
  assert.deepEqual(
    Array.from(hooks.inspectorStrategyRows(card), (row) => row.label),
    ["배치 추천", "연계 조건", "상태 지속"],
  );
  assert.deepEqual(
    Array.from(hooks.inspectorRuntimeStatusRows(card), (row) => row.label),
    ["후열 보호", "화상", "반계"],
  );
  assert.match(source, /🔒 전열 보호/);
  assert.match(source, /전열이 보호 중 — 저격·돌파 외에는 공격 불가/);
  assert.match(source, /배치 · 연계 · 상태/);
  assert.doesNotMatch(source, /markers\.slice\(0, 2\)/);
});

test("restricts targeted steals to legal enemy board cards and both charm cost limits", () => {
  assert.match(source, /targetKind === "enemyMinion"/);
  assert.match(source, /target\.side !== "ai" \|\| target\.zone !== "board"/);
  assert.match(source, /ability\.op === "steal_enemy_minion_max_cost"/);
  assert.match(source, /if \(targetCost > maxCost\) return false/);
  assert.match(source, /ability\.op === "steal_enemy_minion"/);
  assert.match(source, /ability\.minCost != null/);
  assert.match(source, /if \(targetCost < minCost\) return false/);
});

test("shows Pang Tong armor on board cards and in the inspector", () => {
  assert.match(source, /getCardValue\(card, "currentArmor", getCardValue\(card, "armor", 0\)\)/);
  assert.match(source, /if \(armor > 0\) \{[\s\S]{0,220}COLORS\.armor/);
  assert.match(source, /if \(cardArmor > 0\) stats\.push\(\["방어", cardArmor, COLORS\.armor\]\)/);
});

test("renders four cached commander medallions with identity-specific portrait grammar", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const boardModule = sandbox.globalThis.TK.modules.boardUI;
  const hooks = boardModule.testHooks;
  const harness = createFake2dHarness();
  assert.equal(boardModule.commanderPresentationCount, 4);
  assert.match(source, /function createHeroMedallionSurface\(documentRef, commanderId\)/);
  for (const commanderId of ["caocao", "liubei", "sunquan", "nomad"]) {
    assert.match(source, new RegExp(`createHeroMedallionSurface\\(documentRef, "${commanderId}"\\)`));
    assert.doesNotThrow(() => hooks.createHeroMedallionSurface({
      createElement() {
        return harness.canvas;
      },
    }, commanderId));
  }
  assert.match(source, /const COMMANDER_PRESENTATION = Object\.freeze/);
  assert.match(source, /ctx\.drawImage\(heroArt\[commander\.id\]/);
  assert.match(source, /`\$\{commander\.name\} · \$\{commander\.factionLabel\}`/);
  assert.match(source, /function drawCommanderIdentityRibbon\(side, state\)/);
  assert.match(source, /damagePulse[\s\S]{0,700}isActive[\s\S]{0,900}displayArmor/);
  const medallionStart = source.indexOf("function drawHeroMedallion");
  const medallionEnd = source.indexOf("function drawMana", medallionStart);
  assert.doesNotMatch(source.slice(medallionStart, medallionEnd), /create(?:Linear|Radial)Gradient/);
});

test("presents all commander powers with clear costs, readiness, targeting, and feedback", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const commanderCases = [
    ["caocao", "조조", "위", "위", "패왕의 휴식", 1, true],
    ["liubei", "유비", "촉", "촉", "인덕의 반사", 0, false],
    ["sunquan", "손권", "오", "오", "수공", 3, true],
    ["nomad", "맹획", "남만", "남만 연맹", "족쇄 명령", 2, true],
  ];
  commanderCases.forEach(([id, name, faction, factionLabel, powerName, powerCost, active]) => {
    const commander = hooks.commanderPresentationFor({
      commanders: { player: { id, faction: `${id}-runtime-id` } },
    }, "player");
    assert.equal(commander.id, id);
    assert.equal(commander.name, name);
    assert.equal(commander.faction, faction);
    assert.equal(commander.factionLabel, factionLabel);
    assert.equal(commander.powerName, powerName);
    assert.equal(commander.powerCost, powerCost);
    assert.equal(commander.active, active);
    assert.ok(commander.powerText.length >= 12);
  });

  const stateFor = (id, mana, patch = {}) => ({
    phase: "playing",
    turn: "player",
    heroes: { player: { mana } },
    commanders: { player: { id, ...patch } },
  });
  assert.equal(hooks.commanderPowerVisualState(stateFor("caocao", 1), "player"), "ready");
  assert.equal(hooks.commanderPowerVisualState(stateFor("caocao", 0), "player"), "mana");
  assert.equal(
    hooks.commanderPowerVisualState(stateFor("caocao", 10, { powerUsedThisTurn: true }), "player"),
    "spent",
  );
  assert.equal(hooks.commanderPowerVisualState(stateFor("sunquan", 2), "player"), "mana");
  assert.equal(hooks.commanderPowerVisualState(stateFor("sunquan", 3), "player"), "ready");
  assert.equal(hooks.commanderPowerVisualState(stateFor("nomad", 2), "player"), "ready");
  assert.equal(
    hooks.commanderPowerVisualState({
      ...stateFor("caocao", 10),
      heroes: { player: { health: 30, maxHealth: 30, mana: 10 } },
    }, "player"),
    "unavailable",
  );
  assert.equal(
    hooks.commanderPowerVisualState(stateFor("liubei", 0, { reflectCharges: 2 }), "player"),
    "ready",
  );
  assert.equal(
    hooks.commanderPowerVisualState(stateFor("liubei", 0, { reflectCharges: 0 }), "player"),
    "spent",
  );

  assert.match(source, /function drawCommanderPower\(state, now\)/);
  assert.match(source, /const tone = status === "ready"[\s\S]{0,500}status === "mana"/);
  assert.match(source, /addHit\("commander-power", x, y, width, height/);
  assert.match(
    source,
    /hit\.type === "commander-power"[\s\S]{0,500}commander\.id === "nomad"[\s\S]{0,220}kind: "commander-power"/,
  );
  assert.match(
    source,
    /selection\.kind === "commander-power"[\s\S]{0,220}type: "USE_COMMANDER_POWER"[\s\S]{0,100}target/,
  );
  assert.match(
    source,
    /selectedItem\.kind === "commander-power"[\s\S]{0,180}target\.zone !== "board"[\s\S]{0,100}target\.side !== "ai"/,
  );
  assert.match(source, /!minion\.attackLockPending[\s\S]{0,80}!minion\.attackLockedThisTurn/);
  assert.match(source, /type === "commander:power"[\s\S]{0,400}powerName/);
  assert.match(source, /type === "commander:reflect"[\s\S]{0,300}chargesAfter/);
  assert.match(source, /type === "commander:lock"[\s\S]{0,220}다음 공격을 봉쇄/);
  assert.match(source, /hero_full_health: "지휘관의 체력이 가득 찼습니다."/);
  assert.match(source, /status === "unavailable"[\s\S]{0,120}"체력이 가득 참"/);
});

test("adds a cached Red Cliffs environment with reduced-motion-safe ambient movement", () => {
  assert.match(source, /Distant Red Cliffs silhouettes/);
  assert.match(source, /Fleet silhouettes make the empty center/);
  assert.match(source, /function createEnvironmentActors\(\)/);
  assert.match(source, /const environmentActors = createEnvironmentActors\(\)/);
  assert.match(source, /function drawBattlefieldEnvironment\(now\)/);
  assert.match(source, /const motionTime = reducedMotionQuery\.matches \? 0 : now/);
  assert.match(source, /drawBattlefieldEnvironment\(now\)/);
  const ambientStart = source.indexOf("function drawBattlefieldEnvironment");
  const ambientEnd = source.indexOf("function drawDyingGhosts", ambientStart);
  const ambientBody = source.slice(ambientStart, ambientEnd);
  assert.doesNotMatch(ambientBody, /create(?:Linear|Radial)Gradient|\.map\(|\.filter\(|Array\.from/);
});

test("latches combat health until contact without delaying authoritative state", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const latch = { before: 30, revealAt: 365 };
  assert.equal(hooks.timing.attackContactMs, 365);
  assert.equal(hooks.presentationHealth(24, latch, 0), 30);
  assert.equal(hooks.presentationHealth(24, latch, 364.999), 30);
  assert.equal(hooks.presentationHealth(24, latch, 365), 24);
  assert.equal(hooks.presentationHealth(24, null, 0), 24);
  assert.match(source, /const sourceOp = eventDetail\.source && eventDetail\.source\.op/);
  assert.match(source, /timeline \? timeline\.contactAt : now \+ DIRECT_EFFECT_CONTACT_MS/);
  assert.match(source, /seenHeroDamageTokens/);
});

test("serializes combat presentation, keeps death ghosts non-interactive, and locks double actions", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const authoritative = {
    phase: "playing",
    turn: "player",
    turnNumber: 3,
    heroes: { player: { health: 30 }, ai: { health: 24 } },
    boards: {
      player: [{ instanceId: "p1", currentHealth: 5, shield: true, keywords: ["방패"] }],
      ai: [{ instanceId: "a1", currentHealth: 3, keywords: [] }],
    },
  };
  const preHit = hooks.capturePresentationState(authoritative);
  authoritative.heroes.ai.health = 18;
  authoritative.boards.ai[0].currentHealth = 0;
  authoritative.boards.player[0].shield = false;
  assert.equal(preHit.heroes.ai.health, 24);
  assert.equal(preHit.boards.ai[0].currentHealth, 3);
  assert.equal(preHit.boards.player[0].shield, true);
  assert.equal(hooks.timing.combatPresentationMs, 700);
  assert.equal(hooks.timing.minionDeathCueMs, 620);
  assert.equal(hooks.timing.cardPlayPresentationMs, 560);
  assert.equal(hooks.presentationLocked(700, 0), true);
  assert.equal(hooks.presentationLocked(700, 699.9), true);
  assert.equal(hooks.presentationLocked(700, 700), false);
  assert.match(source, /const startAt = Math\.max\(now, presentationBusyUntil\)/);
  assert.match(source, /before: capturePresentationState\(stateNow\(\)\)/);
  assert.match(source, /attackerAnchor: anchorForTarget\(eventDetail\.attacker\)/);
  assert.match(source, /targetAnchor: anchorForTarget\(eventDetail\.target\)/);
  assert.match(source, /latestTimeline\.after = capturePresentationState\(nextState\)/);
  assert.match(source, /drawDyingGhosts\(now\)/);
  assert.match(source, /if \(actualIndex >= 0\) addHit\("board-card"/);
  assert.match(source, /\["PLAY_CARD", "ATTACK", "END_TURN", "USE_COMMANDER_POWER"\]\.includes\(action\.type\)/);
  assert.match(source, /isPresentationLocked\(performance\.now\(\)\)/);
  assert.match(source, /function canSelectHand[\s\S]{0,160}canArmHandSelection/);
  assert.match(source, /function canArmHandSelection[\s\S]{0,230}!isPresentationLocked/);
  assert.match(source, /const enabled = state\.phase[\s\S]{0,180}!isPresentationLocked\(now\)/);
  assert.match(source, /presentationWait[\s\S]{0,900}"전투 처리 중"/);
  assert.match(source, /presentationWait \? "RESOLVING" : "WAIT"/);
});

test("drives the complete portrait roster from six skull bases and explicit landmarks", () => {
  const landmarkProfiles = source.match(/base: "(?:oval-ruler|long-scholar|square-warrior|lean-youth|angular-veteran|heart-archer)"/g) || [];
  assert.equal(landmarkProfiles.length, 28);
  for (const base of ["oval-ruler", "long-scholar", "square-warrior", "lean-youth", "angular-veteran", "heart-archer"]) {
    assert.match(source, new RegExp(`"${base}": \\{ templeWidth:`));
  }
  for (const landmark of ["templeWidth", "faceLength", "jawAngle", "chinPoint", "browY", "eyeSpacing", "mouthWidth", "earY", "asymmetry"]) {
    assert.match(source, new RegExp(`landmarks\\.${landmark}`));
  }
  assert.match(source, /function faceLandmarks\(art\)/);
  assert.match(source, /const farEyeY = cy \+ radius \* landmarks\.asymmetry/);
  assert.match(source, /const mouthHalf = radius \* landmarks\.mouthWidth/);
});

test("shares per-scene light vectors across face, garment, headgear, and weapon", () => {
  const lightProfileStart = source.indexOf("const PORTRAIT_PAINT_PROFILES");
  const lightProfileEnd = source.indexOf("function portraitPaintProfile", lightProfileStart);
  const lightProfiles = source.slice(lightProfileStart, lightProfileEnd);
  assert.equal((lightProfiles.match(/keyAngle:/g) || []).length, 28);
  assert.equal((lightProfiles.match(/keyTemp:/g) || []).length, 28);
  assert.equal((lightProfiles.match(/keyStrength:/g) || []).length, 28);
  assert.equal((lightProfiles.match(/rimColor:/g) || []).length, 28);
  assert.equal((lightProfiles.match(/bounceColor:/g) || []).length, 28);
  assert.match(source, /function paintFaceValues[\s\S]{0,900}Math\.cos\(pose\.keyAngle\)/);
  assert.match(source, /function paintRobeAndArmor[\s\S]{0,1800}Math\.cos\(pose\.keyAngle\)/);
  assert.match(source, /function paintHeadgearLandmark[\s\S]{0,700}Math\.cos\(pose\.keyAngle\)/);
  assert.match(source, /function paintWeaponLandmark[\s\S]{0,500}Math\.cos\(pose\.keyAngle\)/);
});

test("separates procedural material response and keeps a compact faction grammar", () => {
  for (const material of ["silk", "lacquered-lamellar", "raw-iron", "leather", "wood", "feather"]) {
    assert.match(source, new RegExp(`["']?${material}["']?: \\{ specularWidth:`));
  }
  assert.match(source, /function paintMaterialSurface\(/);
  assert.match(source, /material\.roughness/);
  assert.match(source, /material\.grain/);
  assert.match(source, /material\.stitch/);
  assert.match(source, /material\.edgeWear/);
  assert.match(source, /paintMaterialSurface\([\s\S]{0,260}portraitMaterials\(art\)\.garment/);
  assert.match(source, /portraitMaterials\(art\)\.headgear/);
  assert.match(source, /MATERIAL_PROFILES\.feather/);
  assert.match(source, /function paintCompactFactionGrammar\(/);
  assert.match(source, /if \(compact\) paintCompactFactionGrammar/);
});

test("keeps first hand-card inspection quiet and defers invalid play to an explicit attempt", () => {
  assert.doesNotMatch(source, /마나가 부족하거나 전장이 가득 찼습니다/);
  const handBranchStart = source.indexOf('if (hit.type === "hand-card") {', source.indexOf("function activateHit"));
  const handBranchEnd = source.indexOf('if (hit.type === "board-card"', handBranchStart);
  const handBranch = source.slice(handBranchStart, handBranchEnd);
  assert.ok(handBranchStart > 0 && handBranchEnd > handBranchStart);
  assert.match(handBranch, /const repeatedHandClick = Boolean/);
  assert.match(handBranch, /if \(wasAlreadyInspected && !playable\)[\s\S]*fireAction\(\{ type: "PLAY_CARD"/);
  assert.match(handBranch, /else if \(repeatedHandClick\)/);
  assert.match(handBranch, /else if \(playable\)[\s\S]*selection = \{ kind: "hand"/);
  assert.ok(handBranch.indexOf("const playable = canSelectHand") < handBranch.indexOf("selection = { kind: \"hand\""));
  assert.match(handBranch, /showToast\("카드 상세", "normal"\)/);
  assert.match(source, /drag\.source\.kind === "hand" && canArmHandSelection\(state\)/);
  assert.match(source, /function canArmHandSelection[\s\S]{0,230}state\.turn === "player"[\s\S]{0,120}!isPresentationLocked/);
});

test("does not arm or glow an unaffordable targeted card until an explicit second-click attempt", () => {
  const activateStart = source.indexOf("function activateHit");
  const handBranchStart = source.indexOf('if (hit.type === "hand-card") {', activateStart);
  const handBranchEnd = source.indexOf('if (hit.type === "board-card"', handBranchStart);
  const activatePrefix = source.slice(activateStart, handBranchStart);
  const handBranch = source.slice(handBranchStart, handBranchEnd);
  const invalidAttempt = handBranch.indexOf("if (wasAlreadyInspected && !playable)");
  const playableArm = handBranch.indexOf("else if (playable)");
  const neutralInspection = handBranch.indexOf('showToast("\uCE74\uB4DC \uC0C1\uC138", "normal")');
  const neutralBranch = handBranch.lastIndexOf("} else {", neutralInspection);

  assert.match(activatePrefix, /const wasAlreadyInspected = Boolean\([\s\S]{0,120}isInspectionCard/);
  assert.ok(
    activatePrefix.indexOf("const wasAlreadyInspected") < activatePrefix.indexOf("openInspection(hit, state)"),
    "second-click status must be captured before opening the inspector",
  );
  assert.ok(invalidAttempt >= 0 && invalidAttempt < playableArm);
  assert.match(
    handBranch.slice(invalidAttempt, playableArm),
    /fireAction\(\{ type: "PLAY_CARD", handIndex: hit\.data\.index \}\)[\s\S]{0,80}cancelSelection/,
  );
  assert.ok(playableArm >= 0 && playableArm < neutralBranch && neutralBranch < neutralInspection);
  assert.match(
    handBranch.slice(playableArm, neutralInspection),
    /selection = \{ kind: "hand"[\s\S]{0,180}빛나는 전열·후열 빈칸을 선택/,
  );
  assert.match(
    handBranch.slice(neutralBranch),
    /cancelSelection\(\)[\s\S]{0,80}\uCE74\uB4DC \uC0C1\uC138/,
  );
});

test("maps every runtime reason and outcome to Korean without exposing internal identifiers", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const reasons = [
    "insufficient_mana", "board_full", "not_your_turn", "game_ended",
    "invalid_side", "invalid_hand_index", "invalid_target", "invalid_attacker",
    "attacker_not_ready", "invalid_attack_target", "target_missing",
    "hero_full_health",
    "invalid_action", "unknown_action", "hero_defeated", "mutual_destruction",
    "combat", "effect", "fatigue", "health", "concede",
  ];
  reasons.forEach((reason) => {
    const message = hooks.uxCodeMessage(reason, "명령을 수행할 수 없습니다.");
    assert.notEqual(message, reason);
    assert.match(message, /[가-힣]/);
    assert.equal(hooks.isInternalUXKey(message), false);
  });
  assert.equal(hooks.uxCodeMessage("future_reason_code", "명령을 다시 확인해 주세요."), "명령을 다시 확인해 주세요.");
  assert.equal(hooks.uxCodeMessage("Not enough mana", "명령을 다시 확인해 주세요."), "명령을 다시 확인해 주세요.");
  assert.equal(hooks.gameOutcomeMessage("hero_defeated", "ai"), "지휘관의 체력이 모두 소진되었습니다.");
  assert.equal(hooks.gameOutcomeMessage("future_outcome", "player"), "적장의 기세를 꺾었습니다.");
  assert.doesNotMatch(source, /drawCenteredText\(ctx, state\.reason/);
  assert.match(source, /eventDetail\.message = localizedEventMessage/);
  assert.match(source, /const sharedFXFeedback = Boolean/);
  const invalidStart = source.indexOf('} else if (type === "action:invalid")');
  const invalidEnd = source.indexOf('type === "game:end"', invalidStart);
  const invalidBranch = source.slice(invalidStart, invalidEnd);
  assert.ok(invalidStart >= 0 && invalidEnd > invalidStart);
  assert.match(invalidBranch, /if \(sharedFXFeedback\)/);
  assert.match(invalidBranch, /toast = null/);
});

test("names played and fallen generals when lifecycle payloads identify them", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  assert.equal(hooks.eventEntityName({ data: { cardName: "관우" } }), "관우");
  assert.equal(hooks.eventEntityName({ name: "여포" }), "여포");
  assert.equal(hooks.eventEntityName({ minion: { definition: { name: "장비" } } }), "장비");
  assert.equal(
    hooks.namedLifecycleMessage("card:play", { data: { cardName: "관우" } }, "장수가 전장에 나섰습니다."),
    "관우 · 전장에 나섰습니다.",
  );
  assert.equal(
    hooks.namedLifecycleMessage("minion:death", { minionName: "장비" }, "장수가 쓰러졌습니다."),
    "장비 · 쓰러졌습니다.",
  );
  assert.equal(
    hooks.namedLifecycleMessage("minion:death", { name: "여포" }, "장수가 쓰러졌습니다."),
    "여포 · 쓰러졌습니다.",
  );
  assert.equal(
    hooks.namedLifecycleMessage("card:play", {}, "장수가 전장에 나섰습니다."),
    "장수가 전장에 나섰습니다.",
  );
  assert.equal(
    hooks.namedLifecycleMessage("attack:hit", { cardName: "관우" }, "공격이 적중했습니다."),
    "공격이 적중했습니다.",
  );
  assert.match(source, /return namedLifecycleMessage\(type, eventDetail, localized\)/);
});

test("reconciles a pinned inspector by instance id and closes confirmed or vanished entities", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const locate = sandbox.globalThis.TK.modules.boardUI.testHooks.locateCardInstance;
  const tracked = { instanceId: "tracked-1", name: "장료" };
  const state = {
    hands: { player: [{ instanceId: "other" }, tracked], ai: [] },
    boards: { player: [], ai: [] },
  };
  let located = locate(state, "tracked-1");
  assert.equal(located.card.name, "장료");
  assert.equal(located.source.type, "hand-card");
  assert.equal(located.source.index, 1);
  state.hands.player.splice(1, 1);
  state.boards.player.push(tracked);
  located = locate(state, "tracked-1");
  assert.equal(located.source.type, "board-card");
  assert.equal(located.source.index, 0);
  state.boards.player.length = 0;
  assert.equal(locate(state, "tracked-1"), null);
  assert.match(source, /function locateInspectionCard\(state\)/);
  assert.match(source, /if \(instanceId\) return locateCardInstance\(state, instanceId\)/);
  assert.match(source, /function reconcileInspection\(state\)[\s\S]{0,180}closeInspection\(false\)[\s\S]{0,100}applyInspectionCard/);
  assert.match(source, /function inspectionMatchesAction\(type, detail\)/);
  assert.match(source, /type === "card:play"[\s\S]{0,220}eventDetail\.instanceId/);
  assert.match(source, /type === "attack:start"[\s\S]{0,500}eventDetail\.attackerId/);
  assert.match(source, /type === "minion:death"[\s\S]{0,150}eventDetail\.instanceId/);
  assert.match(source, /if \(inspectionMatchesAction\(type, eventDetail\)\) closeInspection\(false\)/);
  assert.match(source, /previousRevision = nextState\.revision;[\s\S]{0,80}reconcileInspection\(nextState\)/);
});

test("keeps the 318px inspector outside five-card board slots at target viewports", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const boardModule = sandbox.globalThis.TK.modules.boardUI;
  const hooks = boardModule.testHooks;
  const leftPanel = hooks.inspectionPanelGeometry("left");
  const rightPanel = hooks.inspectionPanelGeometry("right");
  const firstSlot = hooks.boardSlotGeometry("player", 5, 0);
  const lastSlot = hooks.boardSlotGeometry("player", 5, 4);
  assert.equal(leftPanel.width, 318);
  assert.ok(leftPanel.x + leftPanel.width < firstSlot.x);
  assert.ok(rightPanel.x > lastSlot.x + lastSlot.width);
  for (const [viewportWidth, viewportHeight] of [[980, 856], [768, 720]]) {
    const scale = Math.min(viewportWidth / boardModule.LOGICAL_WIDTH, viewportHeight / boardModule.LOGICAL_HEIGHT);
    assert.ok((leftPanel.x + leftPanel.width) * scale < firstSlot.x * scale);
    assert.ok(rightPanel.x * scale > (lastSlot.x + lastSlot.width) * scale);
  }
  assert.match(source, /const panel = inspectionPanelGeometry\(panelSide\)/);
});

test("docks the turn button clear of a right inspector without shrinking its touch target", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const normal = hooks.turnButtonGeometry("left");
  const docked = hooks.turnButtonGeometry("right");
  const rightPanel = hooks.inspectionPanelGeometry("right");
  const intersects = (a, b) => (
    Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
    * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
  );

  assert.deepEqual({ ...normal }, {
    x: 1137, y: 323, width: 175, height: 72, docked: false,
  });
  assert.ok(docked.width >= 48);
  assert.ok(docked.height >= 48);
  assert.equal(intersects(docked, rightPanel), 0);
  for (const side of ["ai", "player"]) {
    for (let index = 0; index < 5; index += 1) {
      assert.equal(
        intersects(docked, hooks.boardSlotGeometry(side, 5, index)),
        0,
      );
    }
  }
  assert.match(source, /const geometry = turnButtonGeometry\(panelSide\)/);
  assert.match(source, /addHit\("end-turn", x, y, width, height/);
});

test("distinguishes active and spent shields and marks random rules for fast scanning", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  assert.equal(hooks.shieldVisualState({ keywords: ["방패"] }), "active");
  assert.equal(hooks.shieldVisualState({ shield: true, keywords: ["방패"] }), "active");
  assert.equal(hooks.shieldVisualState({ shield: false, keywords: ["방패"] }), "spent");
  assert.equal(hooks.shieldVisualState({ shield: false, keywords: [] }), "none");
  assert.match(source, /function drawGuardStatus\(/);
  assert.match(source, /Warm stone battlements and a black gate/);
  assert.match(source, /drawGuardStatus\([\s\S]{0,120}Math\.max\(8, 10 \* scale\)/);
  assert.match(source, /stone\.addColorStop\(0, "#d8b778"\)/);
  assert.match(source, /function drawShieldStatus\(/);
  assert.match(source, /const active = state === "active"/);
  assert.match(source, /ctx\.shadowColor = active \? "#84dfff"/);
  assert.match(source, /ctx\.lineTo\(radius \* 0\.52, radius \* 0\.62\)/);
  assert.match(source, /function drawRandomRuleMarker\(/);
  assert.match(source, /function drawSmallAbilityLine[\s\S]{0,500}segment === "무작위"/);
  assert.match(source, /const randomRule = hasRandomRule\(card\)/);
  assert.match(source, /spentShield \? "방패 소모" : name/);
  assert.match(source, /이번 전투에서 방패가 이미 소모되었습니다/);
  assert.match(source, /split\(\/\(출전:\|유언:\|돌진\|돌파\|수호\|방패\|의형제\|군략\|연화\|약탈\|천하무쌍\|무작위\)\//);
  assert.match(mockSource, /Object\.assign\(card\(3\), \{ shield: false \}\)/);
  assert.match(mockSource, /scenario"\) === "invalid"/);
  assert.match(mockSource, /scenario"\) === "defeat"/);
});

test("composes twenty-eight heroic action crops with distinct signatures", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const boardModule = sandbox.globalThis.TK.modules.boardUI;
  assert.equal(boardModule.actionProfileCount, 28);
  const weaponAngles = Array.from(
    source.matchAll(/weaponAngle: (-?[\d.]+)/g),
    (match) => Number(match[1]),
  );
  const torsoAngles = Array.from(
    source.matchAll(/torsoAngle: (-?[\d.]+)/g),
    (match) => Number(match[1]),
  );
  const signatures = Array.from(
    source.matchAll(/signature: "([^"]+)"/g),
    (match) => match[1],
  );
  assert.equal(weaponAngles.length, 28);
  assert.ok(new Set(weaponAngles).size >= 23);
  assert.equal(torsoAngles.length, 28);
  assert.ok(torsoAngles.some((angle) => angle < -0.15));
  assert.ok(torsoAngles.some((angle) => angle > 0.15));
  assert.equal(signatures.length, 28);
  assert.equal(new Set(signatures).size, 28);
  assert.match(source, /const action = portraitActionProfile\(art\)/);
  assert.match(source, /ctx\.rotate\(pose\.lean \+ action\.torsoAngle\)/);
  assert.match(source, /ctx\.rotate\(action\.weaponAngle\)/);
  assert.match(source, /ctx\.scale\(action\.weaponScale, action\.weaponScale\)/);
  assert.match(source, /paintHeroicBackSilhouette\(/);
});

test("art8 gives all twenty-eight action profiles distinct articulated figures and face depth", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const boardModule = sandbox.globalThis.TK.modules.boardUI;
  const hooks = boardModule.testHooks;
  const arts = Array.from(
    boardModule.portraitArchetypeIds,
    (id) => hooks.portraitArchetype({ id }),
  );
  const figures = arts.map((art) => hooks.art8FigureProfile(art));
  assert.equal(figures.length, 28);
  assert.equal(new Set(figures.map((figure) => JSON.stringify(figure))).size, 28);
  for (const field of [
    "shoulderBreadth", "ribcageDepth", "waistTaper",
    "nearElbowT", "farElbowT", "nearElbowBend", "farElbowBend",
    "nearPalmDepth", "farPalmDepth", "gripPitch", "fingerCurl",
    "faceOrbitDepth", "cheekProjection",
  ]) {
    assert.ok(figures.every((figure) => Number.isFinite(figure[field])), `finite ${field}`);
  }
  assert.ok(Math.min(...figures.map((figure) => figure.shoulderBreadth)) <= 0.9);
  assert.ok(Math.max(...figures.map((figure) => figure.shoulderBreadth)) >= 1.15);
  assert.ok(Math.max(...figures.map((figure) => figure.nearElbowBend)) >= 0.14);
  assert.ok(Math.min(...figures.map((figure) => figure.nearPalmDepth)) < 0.75);
  assert.ok(Math.max(...figures.map((figure) => figure.faceOrbitDepth)) >= 0.75);

  arts.forEach((art) => {
    const action = hooks.portraitActionProfile(art);
    (action.grip || []).forEach((grip) => {
      const target = hooks.art8GripTarget(
        0,
        0,
        250,
        126,
        125,
        { lean: 0 },
        action,
        grip,
      );
      assert.ok(Number.isFinite(target.x) && Number.isFinite(target.y));
      assert.ok(target.x > -80 && target.x < 330);
      assert.ok(target.y > -80 && target.y < 220);
    });
  });
  assert.match(source, /function paintThoracicStructureV8\(/);
  assert.match(source, /function paintFacialDepthV8\(/);
  assert.match(source, /function paintNarrativeDepthV8\(/);
  assert.match(source, /paintPortraitArms\([\s\S]{0,120}action/);
  assert.match(source, /const actionGripTargets = \(action\.grip \|\| \[\]\)\.map/);
  assert.match(source, /const palmDepth = index \? figure\.farPalmDepth : figure\.nearPalmDepth/);
});

test("anime-cel v11 replaces the complete portrait construction and busts stale caches", () => {
  assert.match(source, /const ANIME_CEL_STYLE_VERSION = "anime-cel-v11"/);
  for (const painter of [
    "paintAnimeV11Backdrop",
    "paintAnimeV11Body",
    "paintAnimeV11Face",
    "paintAnimeV11HairFront",
    "paintAnimeV11Headgear",
    "paintAnimeV11Weapon",
    "paintAnimePortraitV11",
  ]) {
    assert.match(source, new RegExp(`function ${painter}\\(`));
  }
  assert.match(source, /broad white-to-colour diagonal replaces the old dark painted scenery/);
  assert.match(source, /Large cel-shadow wedge gives the garment/);
  const animeStart = source.indexOf("function paintAnimePortraitV11");
  const animeEnd = source.indexOf("function paintPortraitUncached", animeStart);
  const animeBody = source.slice(animeStart, animeEnd);
  const animeOrder = [
    "paintAnimeV11Backdrop(",
    "paintAnimeV11Body(",
    "paintAnimeV11HairBack(",
    "paintAnimeV11Face(",
    "paintAnimeV11HairFront(",
    "paintAnimeV11Beard(",
    "paintAnimeV11Headgear(",
    "paintAnimeV11Weapon(",
  ].map((call) => animeBody.indexOf(call));
  assert.ok(animeOrder.every((position) => position >= 0));
  assert.deepEqual([...animeOrder].sort((a, b) => a - b), animeOrder);
  assert.match(source, /animeV11Enabled[\s\S]{0,120}paintAnimePortraitV11/);
  assert.match(gameShellSource, /const gameAssetVersion = "commander-wings-v2-20260731"/);
  assert.match(gameShellSource, /\.map\(\(src\) => `\$\{src\}\?v=\$\{gameAssetVersion\}`\)/);
  assert.match(gameShellSource, /data-art-version=\{gameAssetVersion\}/);

  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  vm.runInNewContext(cardDataSource, sandbox, { filename: "card-data/index.js" });
  const boardModule = sandbox.globalThis.TK.modules.boardUI;
  const cards = Array.from(sandbox.globalThis.TK.modules.cardData.getCards());
  const identities = cards.map((card) => boardModule.testHooks.animeV11IdentityProfile(
    card,
    boardModule.testHooks.portraitArchetype(card),
  ));
  assert.equal(boardModule.animeArtVersion, "anime-cel-v11");
  assert.equal(new Set(identities.map((profile) => JSON.stringify(profile))).size, cards.length);
});

test("bundles premium independent art for all fifty playable cards", () => {
  assert.match(source, /const ORIGINAL_CARD_ART_VERSION = "original-webtoon-v2-20260802"/);
  assert.match(source, /function drawOriginalCardArt\(/);
  assert.match(source, /if \(drawOriginalCardArt\(ctx, x, y, width, height, card, compact\)\) return/);
  assert.match(source, /ORIGINAL_CARD_ART_REFRESHERS\.add\(invalidateBoardFrame\)/);
  assert.match(source, /ORIGINAL_CARD_ART_REFRESHERS\.delete\(invalidateBoardFrame\)/);
  assert.match(source, /오리지널 웹툰 원화 · 장수별 독립 제작/);

  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  vm.runInNewContext(cardDataSource, sandbox, { filename: "card-data/index.js" });
  const boardModule = sandbox.globalThis.TK.modules.boardUI;
  const cards = Array.from(sandbox.globalThis.TK.modules.cardData.getCards());
  const assetSources = cards.map((card) => boardModule.testHooks.originalCardArtSource(card));

  assert.equal(cards.length, 50);
  assert.equal(boardModule.originalCardArtVersion, "original-webtoon-v2-20260802");
  const authoredCards = cards.filter((_, index) => assetSources[index]);
  const generatedCards = cards.filter((_, index) => !assetSources[index]);
  assert.equal(authoredCards.length, 50);
  assert.equal(generatedCards.length, 0);
  assert.equal(new Set(assetSources.filter(Boolean)).size, authoredCards.length);
  assert.ok(assetSources.filter(Boolean).every(
    (asset) => asset.endsWith(`.jpg?v=${boardModule.originalCardArtVersion}`),
  ));
  assert.equal(
    new Set(generatedCards.map((card) => JSON.stringify(boardModule.testHooks.portraitArchetype(card)))).size,
    generatedCards.length,
  );

  authoredCards.forEach((card) => {
    const artUrl = new URL(`../../art/cards/${card.id}.jpg`, import.meta.url);
    const artBytes = fs.readFileSync(artUrl);
    assert.ok(artBytes.length > 200_000, `${card.id} must retain premium illustration detail`);
    assert.deepEqual(Array.from(artBytes.subarray(0, 3)), [0xff, 0xd8, 0xff]);
  });
});

test("builds five explicit facial value planes and stronger expression extremes", () => {
  assert.match(source, /function paintFacePlanes\(/);
  for (const label of [
    "Far temple plane",
    "Brow-to-nose wedge",
    "Near cheek plane",
    "Jaw plane",
    "Chin\/bounce plane",
  ]) {
    assert.match(source, new RegExp(label));
  }
  const portraitPaintStart = source.indexOf("function paintPortraitUncached");
  const valuesCall = source.indexOf("paintFaceValues(", portraitPaintStart);
  const planesCall = source.indexOf("paintFacePlanes(", valuesCall);
  const featuresCall = source.indexOf("paintFacialFeatures(", planesCall);
  assert.ok(
    portraitPaintStart >= 0
      && valuesCall > portraitPaintStart
      && planesCall > valuesCall
      && featuresCall > planesCall,
    "face rendering must progress from values through broad planes into clean features",
  );
  assert.match(source, /fury: \{ browSlope: 0\.23, eyeOpen: 1\.28/);
  assert.match(source, /tired: \{ browSlope: -0\.15, eyeOpen: 0\.32/);
  assert.match(source, /arrogant: \{[\s\S]{0,100}mouthTilt: -0\.16/);
});

test("breaks material edges, adds atmospheric foreground brushwork, and protects compact signatures", () => {
  assert.match(source, /Broken edge light keeps materials from reading as flat vector fills/);
  assert.match(source, /materialName === "raw-iron" \? 12 : 8/);
  assert.match(source, /materialName === "silk" \|\| materialName === "feather"/);
  assert.match(source, /materialName === "leather"/);
  assert.match(source, /Material-specific directional marks are deliberately sparse/);
  assert.match(source, /const fiberCount = compact \? 2 : 7/);
  assert.match(source, /const scratchCount = compact \? 3/);
  assert.match(source, /function paintForegroundAtmosphericBrush\(/);
  assert.match(source, /const brushCount = compact \? 4 : 9/);
  assert.match(source, /const fragmentCount = compact \? 2 : 5/);
  assert.match(source, /function paintSubjectDepthBacklight\(/);
  assert.match(source, /function paintCompactSignatureSilhouette\(/);
  assert.match(source, /if \(compact\) \{[\s\S]{0,500}paintCompactSignatureSilhouette/);
  assert.match(source, /"silver-spear", "serpent-spear", "charge-lance"/);
  assert.match(source, /"full-draw-bow", "plum-bow"/);
  assert.match(source, /signature === "fangtian-halberd"/);
});

test("caches only static portrait art while leaving card state feedback outside the cache", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const activeShield = { id: "shu_zhao_yun", faction: "촉", keywords: ["방패"], shield: true };
  const spentShield = { ...activeShield, shield: false };
  const handKey = hooks.portraitSurfaceKey(activeShield, 96, 66.4, false, "HAND");
  assert.equal(
    handKey,
    hooks.portraitSurfaceKey(spentShield, 99.84, 69.056, false, "HAND"),
  );
  assert.notEqual(
    handKey,
    hooks.portraitSurfaceKey(activeShield, 103, 86, true, "BOARD"),
  );
  assert.notEqual(
    handKey,
    hooks.portraitSurfaceKey(activeShield, 131, 117, false, "DETAIL"),
  );
  const steadyFrameKeys = Array.from({ length: 10 }, (_, index) => (
    hooks.portraitSurfaceKey(
      { id: `general-${index}`, faction: "촉" },
      103,
      86,
      true,
      "BOARD",
    )
  ));
  assert.equal(new Set(steadyFrameKeys).size, 10);
  assert.deepEqual(steadyFrameKeys, steadyFrameKeys.map((key) => key));
  const tenCardHoverKeys = Array.from({ length: 10 }, (_, cardIndex) => (
    Array.from({ length: 41 }, (_, step) => {
      const scale = 1 + step / 1000;
      return hooks.portraitSurfaceKey(
        { id: `hover-general-${cardIndex}`, faction: "촉" },
        96 * scale,
        66.4 * scale,
        false,
        "HAND",
      );
    })
  )).flat();
  assert.equal(new Set(tenCardHoverKeys).size, 10);
  assert.ok(new Set(tenCardHoverKeys).size < 144);

  const expectedRatios = {
    HAND: 96 / 66.4,
    BOARD: (124 - 20 * (124 / 116)) / (148 * 0.58),
    DETAIL: (158 - 20 * (158 / 116)) / (224 * 0.52),
    GALLERY: 250 / 126,
  };
  Object.entries(expectedRatios).forEach(([bucket, expectedRatio]) => {
    const profile = hooks.portraitSurfaceProfile(0, 0, bucket === "BOARD", bucket);
    assert.ok(Math.abs(profile.width / profile.height - expectedRatio) < 0.008);
  });
  const fullRosterWarmKeys = Array.from({ length: 27 }, (_, cardIndex) => {
    const card = { id: `roster-general-${cardIndex}`, faction: "촉" };
    return [
      hooks.portraitSurfaceKey(card, 96, 66.4, false, "HAND"),
      hooks.portraitSurfaceKey(card, 103, 86, true, "BOARD"),
      hooks.portraitSurfaceKey(card, 131, 117, false, "DETAIL"),
      hooks.portraitSurfaceKey(card, 96, 66.4, true, "HAND"),
      hooks.portraitSurfaceKey(card, 250, 126, false, "GALLERY"),
    ];
  }).flat();
  assert.equal(new Set(fullRosterWarmKeys).size, 135);
  assert.ok(new Set(fullRosterWarmKeys).size <= 144);
  const cache = hooks.portraitCacheSnapshot();
  assert.equal(cache.limit, 144);
  assert.equal(cache.size, 0);
  assert.match(source, /const PORTRAIT_SURFACE_CACHE = new Map\(\)/);
  assert.match(source, /drawPortrait\(galleryCtx, smallX, smallY, 96, 66\.4, card, true, "HAND"\)/);
  assert.match(source, /drawPortrait\(galleryCtx, detailX, detailY, 250, 126, card, false, "GALLERY"\)/);
  assert.match(source, /if \(cached\) \{[\s\S]{0,240}portraitCacheMetrics\.hits \+= 1[\s\S]{0,220}ctx\.drawImage\(cached[\s\S]{0,80}return/);
  assert.match(source, /paintPortraitUncached\([\s\S]{0,160}profile\.width,[\s\S]{0,80}profile\.height,[\s\S]{0,80}card,[\s\S]{0,40}compact/);
  const uncachedStart = source.indexOf("function paintPortraitUncached");
  const uncachedEnd = source.indexOf("function heroShieldPath", uncachedStart);
  assert.doesNotMatch(source.slice(uncachedStart, uncachedEnd), /shieldVisualState|selectedCard|currentHealth|currentAttack/);
});

test("makes inspector art dominant without changing the nonblocking panel footprint", () => {
  assert.match(source, /configCard\.preview \? 0\.52 : 0\.4/);
  assert.match(source, /const largeCardWidth = 158/);
  assert.match(source, /const largeCardHeight = 224/);
  assert.match(source, /const width = 318;[\s\S]{0,80}const height = 730/);
});

test("splits noses, philtrums, mouths, and moustache attachments into six construction families", () => {
  const familyStart = source.indexOf("const FACE_FEATURE_FAMILIES");
  const familyEnd = source.indexOf("const FACE_FEATURE_FAMILY_BY_ARCHETYPE", familyStart);
  const familyBlock = source.slice(familyStart, familyEnd);
  for (const family of [
    "regal-aquiline",
    "scholar-hooked",
    "warrior-broad",
    "youthful-straight",
    "veteran-ridged",
    "raider-upturned",
  ]) {
    assert.match(familyBlock, new RegExp(`"${family}":`));
  }
  const mappingStart = source.indexOf("const FACE_FEATURE_FAMILY_BY_ARCHETYPE");
  const mappingEnd = source.indexOf("const FACE_FEATURE_OVERRIDES", mappingStart);
  const mappings = Array.from(
    source.slice(mappingStart, mappingEnd).matchAll(/"[^"]+": "(regal-aquiline|scholar-hooked|warrior-broad|youthful-straight|veteran-ridged|raider-upturned)"/g),
    (match) => match[1],
  );
  assert.equal(mappings.length, 28);
  assert.equal(new Set(mappings).size, 6);
  for (const archetype of [
    "crowned-sword-ruler",
    "black-strategist-raven",
    "twin-halberds-giant",
    "cavalry-lance",
    "river-crown-sword",
    "fire-gold-crown-sword",
  ]) {
    assert.match(source, new RegExp(`"${archetype}": \\{[\\s\\S]{0,180}tipProjection:`));
  }
  assert.match(source, /const alarInnerX = noseTipX - facing \* radius \* structure\.alarWidth/);
  assert.match(source, /const philtrumTop = noseTipY/);
  assert.match(source, /const paintAttachedMoustache = \(lineScale\) =>/);
});

test("tapers forearms and articulates palm, thumb, knuckles, and weapon grip", () => {
  assert.match(source, /const armLength = Math\.max\(1, Math\.hypot\(armDX, armDY\)\)/);
  assert.match(source, /const shoulderHalf = width \* \(near \? 0\.064 : 0\.048\)/);
  assert.match(source, /const wristHalf = width \* \(near \? 0\.031 : 0\.025\)/);
  assert.match(source, /Tapered palm, thumb pad and curved knuckles/);
  assert.match(source, /const knuckleX = width \* \(0\.034 \+ finger \* 0\.014\)/);
  assert.match(source, /roundedRect\([\s\S]{0,140}-width \* 0\.055,[\s\S]{0,100}width \* 0\.11/);
  assert.equal(Array.from(source.matchAll(/signature: "[^"]+", grip: \[/g)).length, 28);
  assert.match(source, /function paintWeaponGripOverlay\(/);
  assert.match(source, /Four hooked fingers cross the weapon axis/);
  const portraitUncachedStart = source.indexOf("function paintPortraitUncached");
  const weaponPaintCall = source.indexOf("paintWeaponLandmark(", portraitUncachedStart);
  const gripOverlayCall = source.indexOf("paintWeaponGripOverlay(", weaponPaintCall);
  assert.ok(weaponPaintCall > portraitUncachedStart && gripOverlayCall > weaponPaintCall);
});

test("separates Wei focal colour from rainy mid-values and protects compact faces", () => {
  assert.match(source, /const WEI_PORTRAIT_ARCHETYPES = new Set/);
  assert.match(source, /primary: portraitSaturationColor\(style\.primary, 0\.34, 0\.66\)/);
  assert.match(source, /accent: portraitSaturationColor\(pose\.accent, 1\.46, 1\.08\)/);
  assert.match(source, /const rainValueWash = ctx\.createLinearGradient/);
  assert.match(source, /ctx\.clip\("evenodd"\)/);
  assert.match(source, /faceGuard\.radius \* 1\.28/);
  assert.match(source, /faceGuard\.radius \* 1\.46/);
});

test("backs off the two extreme beard crops while retaining portrait cache contracts", () => {
  assert.match(source, /"twin-halberds-giant": \{ camera: 1\.11/);
  assert.match(source, /"elder-fire-ship": \{ camera: 1\.11/);
  assert.match(source, /portraitCacheMetrics\.hits \+= 1/);
  assert.match(source, /portraitCacheMetrics\.misses \+= 1/);
  assert.match(source, /portraitCacheMetrics\.paints \+= 1/);
  assert.match(source, /portraitCacheSnapshot/);
});

test("softens Dian Wei and Zhang Liao lower-face ink and adds subtle Wei catchlights", () => {
  assert.match(source, /"twin-halberds-giant": \{[\s\S]{0,260}mouthStrokeScale: 0\.8/);
  assert.match(source, /"cavalry-lance": \{[\s\S]{0,260}mouthStrokeScale: 0\.83/);
  assert.match(source, /const squareBeardLength = art\.archetype === "twin-halberds-giant" \? 1\.38 : 1\.58/);
  assert.match(source, /windSwept \? 0\.87/);
  assert.match(source, /const weiFeatureCatchlight = WEI_PORTRAIT_ARCHETYPES\.has\(art\.archetype\)/);
  assert.match(source, /const catchlightRadius = Math\.max\(0\.62, radius \* \(weiFeatureCatchlight \? 0\.022 : 0\.015\)\)/);
  assert.match(source, /rgba\(255,188,120,.24\)/);
});

test("critically damped hand poses converge with a background-tab-safe dt clamp", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  assert.equal(hooks.clampedMotionDelta(1000), 34);
  assert.equal(hooks.clampedMotionDelta(-20), 0);
  assert.equal(hooks.clampedMotionDelta(Number.NaN), 0);
  assert.equal(hooks.timing.motionMaxDtMs, 34);
  let pose = {
    lift: 0,
    scale: 1,
    fanAngle: 0.1,
    tilt: 0,
    hoverMix: 0,
    sweep: 0.5,
  };
  const target = {
    lift: 58,
    scale: 1.04,
    fanAngle: 0,
    tilt: 0.02,
    hoverMix: 1,
    sweep: 0.8,
  };
  for (let frame = 0; frame < 24; frame += 1) {
    pose = hooks.stepHandPose(pose, target, 1000 / 60, false);
  }
  assert.ok(Math.abs(pose.lift - target.lift) < 0.12);
  assert.ok(Math.abs(pose.scale - target.scale) < 0.001);
  assert.ok(Math.abs(pose.tilt - target.tilt) < 0.001);
  assert.match(source, /const handPoseStates = new Map\(\)/);
  assert.match(source, /function handPoseKey\(card, index\)[\s\S]{0,120}instanceId/);
});

test("reduced motion snaps hand, inspector, and press feedback to immediate states", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const target = {
    lift: 72,
    scale: 1.04,
    fanAngle: 0,
    tilt: 0.03,
    hoverMix: 1,
    sweep: 0.9,
  };
  const snapped = hooks.stepHandPose({}, target, 16, true);
  for (const key of ["lift", "scale", "fanAngle", "tilt", "hoverMix", "sweep"]) {
    assert.equal(snapped[key], target[key]);
    assert.equal(snapped[`${key}Velocity`], 0);
  }
  assert.equal(hooks.inspectorMotionState(0, false, true).progress, 1);
  assert.equal(hooks.inspectorMotionState(0, true, true).alpha, 0);
  assert.equal(hooks.pressFeedbackScale(36, true), 1);
});

test("inspector eases for 145ms and releases its hitboxes before close settle", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const open0 = hooks.inspectorMotionState(0, false, false);
  const open60 = hooks.inspectorMotionState(60, false, false);
  const open150 = hooks.inspectorMotionState(150, false, false);
  assert.equal(open0.progress, 0);
  assert.ok(open60.progress > 0 && open60.progress < 1);
  assert.equal(open150.progress, 1);
  assert.equal(open150.done, true);
  const close60 = hooks.inspectorMotionState(60, true, false);
  assert.ok(close60.alpha > 0 && close60.alpha < 1);
  assert.equal(hooks.inspectorMotionState(120, true, false).done, true);
  const closeStart = source.indexOf("function closeInspection");
  const closeEnd = source.indexOf("function isInspectionCard", closeStart);
  const closeBody = source.slice(closeStart, closeEnd);
  assert.ok(closeBody.indexOf("inspection = null") < closeBody.indexOf("cancelSelection()"));
  assert.match(source, /const interactivePanel = Boolean\(pinned && inspection && !transition\.closing\)/);
  assert.match(source, /if \(interactivePanel\) addHit\("inspection-panel"/);
  assert.match(source, /if \(interactivePanel\) addHit\("inspection-close"/);
});

test("pointer tilt, highlight sweep, and 96ms press rebound stay visual-only", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  assert.equal(hooks.pressFeedbackScale(0, false), 1);
  assert.ok(hooks.pressFeedbackScale(36, false) < 0.97);
  assert.ok(hooks.pressFeedbackScale(80, false) > 1);
  assert.equal(hooks.pressFeedbackScale(96, false), 1);
  assert.match(source, /const MAX_POINTER_TILT_RAD = 2\.5 \* Math\.PI \/ 180/);
  assert.match(source, /tilt: hover \? \(pointerAcrossCard \* 2 - 1\) \* MAX_POINTER_TILT_RAD : 0/);
  assert.match(source, /const artSweep = ctx\.createLinearGradient/);
  assert.match(source, /const frameSweep = ctx\.createLinearGradient/);
  const pressStart = source.indexOf("function startVisualPress");
  const pressEnd = source.indexOf("function currentVisualPressScale", pressStart);
  const pressBody = source.slice(pressStart, pressEnd);
  assert.doesNotMatch(pressBody, /dispatch|fireAction|activateHit/);
  const pointerDownStart = source.indexOf("function onPointerDown");
  const pointerDownEnd = source.indexOf("function onPointerMove", pointerDownStart);
  assert.doesNotMatch(source.slice(pointerDownStart, pointerDownEnd), /dispatch|fireAction|activateHit/);
  assert.match(source, /currentVisualPressScale\("end-turn", now\)/);
  assert.match(source, /currentVisualPressScale\(`card:\$\{poseKey\}`, now\)/);
});

test("motion keeps static hand targets and portrait cache outside dynamic overlays", () => {
  const handStart = source.indexOf("function drawPlayerHand");
  const handEnd = source.indexOf("function drawTurnButton", handStart);
  const handBody = source.slice(handStart, handEnd);
  assert.match(handBody, /layout\.x - width \/ 2,[\s\S]{0,80}layout\.y - height \/ 2,[\s\S]{0,80}width,[\s\S]{0,40}height/);
  assert.match(handBody, /layout\.angle/);
  const uncachedStart = source.indexOf("function paintPortraitUncached");
  const uncachedEnd = source.indexOf("function heroShieldPath", uncachedStart);
  assert.doesNotMatch(source.slice(uncachedStart, uncachedEnd), /highlightMix|highlightSweep|pointerAcrossCard|visualPress/);
  const frameStart = source.indexOf("function drawCardFrame");
  const portraitCall = source.indexOf("drawPortrait(", frameStart);
  const dynamicSweep = source.indexOf("const highlightMix", frameStart);
  assert.ok(portraitCall > frameStart && dynamicSweep > portraitCall);
});

test("sparse hands split into clear wings beside the player commander", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const one = hooks.playerHandLayoutGeometry(1, 0);
  const two = [
    hooks.playerHandLayoutGeometry(2, 0),
    hooks.playerHandLayoutGeometry(2, 1),
  ];
  assert.deepEqual({ ...one }, { x: 510, y: 679, angle: 0 });
  assert.deepEqual(two.map(({ x }) => x), [510, 856]);
  assert.deepEqual(two.map(({ y }) => y), [679, 679]);
  assert.equal(two[0].angle, 0);
  assert.equal(two[1].angle, 0);
  assert.ok(Math.max(one.y, ...two.map(({ y }) => y)) + 74 < 768,
    "lowered cards keep their attack and health gems inside the canvas");

  const cardWidth = 116;
  const cardHeight = 166;
  const halfRotatedWidth = (angle) => (
    Math.abs(Math.cos(angle)) * cardWidth / 2
    + Math.abs(Math.sin(angle)) * cardHeight / 2
  );
  const leftCardEdge = two[0].x - halfRotatedWidth(two[0].angle);
  const leftCardRight = two[0].x + halfRotatedWidth(two[0].angle);
  const rightCardLeft = two[1].x - halfRotatedWidth(two[1].angle);
  const activeLeftRight = two[0].x + cardWidth * 1.04 / 2;
  const activeRightLeft = two[1].x - cardWidth * 1.04 / 2;
  const oppositeInspectorRight = 330;
  const playerHeroArtLeft = 615;
  const playerHeroArtRight = 751;

  assert.ok(leftCardEdge > oppositeInspectorRight);
  assert.ok(leftCardRight < playerHeroArtLeft);
  assert.ok(activeLeftRight < playerHeroArtLeft);
  assert.ok(rightCardLeft > playerHeroArtRight);
  assert.ok(activeRightLeft > playerHeroArtRight);
  for (const [viewportWidth, viewportHeight] of [[979, 856], [768, 720]]) {
    const scale = Math.min(viewportWidth / 1365, viewportHeight / 768);
    assert.ok((leftCardEdge - oppositeInspectorRight) * scale >= 8);
    assert.ok((playerHeroArtLeft - leftCardRight) * scale >= 8);
    assert.ok((rightCardLeft - playerHeroArtRight) * scale >= 8);
  }
  assert.match(source, /panelSide: pointer\.x < LOGICAL_WIDTH \/ 2 \? "right" : "left"/);
});

test("three-to-five-card hands preserve a clear commander bay", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const layout = sandbox.globalThis.TK.modules.boardUI.testHooks.playerHandLayoutGeometry;
  for (const count of [3, 4, 5]) {
    const fan = Array.from({ length: count }, (_, index) => layout(count, index));
    const leftWing = fan.filter(({ x }) => x <= 510);
    const rightWing = fan.filter(({ x }) => x >= 856);
    assert.equal(leftWing.length, Math.ceil(count / 2));
    assert.equal(rightWing.length, Math.floor(count / 2));
    assert.ok(leftWing.every(({ x }) => x + 58 < 615));
    assert.ok(rightWing.every(({ x }) => x - 58 > 751));
    assert.ok(fan.every(({ y }) => y >= 679 && y <= 684));
    assert.ok(fan.every(({ angle }) => Math.abs(angle) <= 0.085));
  }
});

test("1280x720 hands of three-to-five cards stay clear of both inspector docks", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const boardModule = sandbox.globalThis.TK.modules.boardUI;
  const hooks = boardModule.testHooks;
  const viewportScale = Math.min(
    1280 / boardModule.LOGICAL_WIDTH,
    720 / boardModule.LOGICAL_HEIGHT,
  );
  const scaled = (rect) => ({
    x: rect.x * viewportScale,
    y: rect.y * viewportScale,
    width: rect.width * viewportScale,
    height: rect.height * viewportScale,
  });
  const overlaps = (a, b) => (
    Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) > 0
    && Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)) > 0
  );
  const inspectors = [
    scaled(hooks.inspectionPanelGeometry("left")),
    scaled(hooks.inspectionPanelGeometry("right")),
  ];
  for (const count of [3, 4, 5]) {
    for (let index = 0; index < count; index += 1) {
      const layout = hooks.playerHandLayoutGeometry(count, index);
      const halfWidth = Math.max(
        116 * 1.04 / 2,
        Math.abs(Math.cos(layout.angle)) * 116 / 2
          + Math.abs(Math.sin(layout.angle)) * 166 / 2,
      );
      const halfHeight = Math.max(
        166 * 1.04 / 2,
        Math.abs(Math.sin(layout.angle)) * 116 / 2
          + Math.abs(Math.cos(layout.angle)) * 166 / 2,
      );
      const cardBounds = scaled({
        x: layout.x - halfWidth,
        y: layout.y - halfHeight - 72,
        width: halfWidth * 2,
        height: halfHeight * 2 + 72,
      });
      const oppositeInspector = layout.x < boardModule.LOGICAL_WIDTH / 2
        ? inspectors[1]
        : inspectors[0];
      assert.equal(overlaps(cardBounds, oppositeInspector), false);
    }
  }

  const ribbon = hooks.commanderIdentityRibbonGeometry("player");
  assert.ok(ribbon.x >= 615);
  assert.ok(ribbon.x + ribbon.width <= 751);
  assert.ok(ribbon.y + ribbon.height < 709);
  const vitalStart = source.indexOf("function drawPlayerVitalGemOverlay");
  const vitalEnd = source.indexOf("function drawMana", vitalStart);
  const vitalBody = source.slice(vitalStart, vitalEnd);
  assert.ok(
    vitalBody.indexOf('drawCommanderIdentityRibbon("player", state)')
      < vitalBody.indexOf("protectGem(healthX, healthY, 21)"),
  );
});

test("invalidates a stationary pointer hover when hand identities reflow", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const before = {
    hands: {
      player: [
        { instanceId: "played-card", id: "wei_xiahou_dun" },
        { instanceId: "next-card", id: "shu_zhao_yun" },
      ],
    },
  };
  const after = {
    hands: {
      player: [{ instanceId: "next-card", id: "shu_zhao_yun" }],
    },
  };
  assert.notEqual(
    hooks.playerHandIdentitySignature(before),
    hooks.playerHandIdentitySignature(after),
  );
  assert.equal(
    hooks.playerHandIdentitySignature(after),
    hooks.playerHandIdentitySignature({ hands: { player: after.hands.player.slice() } }),
  );
  const syncStart = source.indexOf("function syncState");
  const syncEnd = source.indexOf("function drawFrame", syncStart);
  const syncBody = source.slice(syncStart, syncEnd);
  assert.match(syncBody, /nextPlayerHandSignature !== previousPlayerHandSignature[\s\S]{0,80}invalidatePassiveHandHover\(\)/);
  assert.match(syncBody, /previousPlayerHandSignature = nextPlayerHandSignature/);
  const invalidationStart = source.indexOf("function invalidatePassiveHandHover");
  const invalidationEnd = source.indexOf("function handPoseKey", invalidationStart);
  const invalidationBody = source.slice(invalidationStart, invalidationEnd);
  assert.match(invalidationBody, /passiveHandHoverBlocked = true/);
  assert.match(invalidationBody, /hoverPreviewMotion = null/);
  assert.match(invalidationBody, /hoverHit && hoverHit\.type === "hand-card"[\s\S]{0,80}hoverHit = null/);
  assert.doesNotMatch(invalidationBody, /reducedMotion|closeInspection|fireAction|dispatch/);
});

test("only real pointer travel rearms passive hand hover while click and keyboard stay explicit", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  assert.equal(hooks.pointerActuallyMoved({ x: 400, y: 700 }, { x: 400, y: 700 }), false);
  assert.equal(hooks.pointerActuallyMoved({ x: 400, y: 700 }, { x: 400.4, y: 700.3 }), false);
  assert.equal(hooks.pointerActuallyMoved({ x: 400, y: 700 }, { x: 401, y: 700 }), true);
  const moveStart = source.indexOf("function onPointerMove");
  const moveEnd = source.indexOf("function onPointerUp", moveStart);
  const moveBody = source.slice(moveStart, moveEnd);
  assert.match(moveBody, /const moved = pointerActuallyMoved\(pointer, nextPointer\)/);
  assert.match(moveBody, /if \(moved\) passiveHandHoverBlocked = false/);
  assert.match(moveBody, /passiveHandHoverBlocked[\s\S]{0,100}!moved[\s\S]{0,100}pointerHover\.type === "hand-card"[\s\S]{0,60}\? null/);
  const keyStart = source.indexOf("function onKeyDown");
  const keyEnd = source.indexOf('canvas.addEventListener("pointerdown"', keyStart);
  const keyBody = source.slice(keyStart, keyEnd);
  assert.match(keyBody, /hoverInputSource = hoverHit \? "keyboard" : "none"/);
  assert.match(source, /passiveHandHoverBlocked && hoverInputSource === "pointer"/);
  const downStart = source.indexOf("function onPointerDown");
  const downEnd = source.indexOf("function onPointerMove", downStart);
  const upStart = source.indexOf("function onPointerUp");
  const upEnd = source.indexOf("function interactiveHits", upStart);
  assert.doesNotMatch(source.slice(downStart, downEnd), /activateHit|fireAction/);
  assert.match(source.slice(upStart, upEnd), /activateHit\(pointerDown\.hit, state\)/);
});

test("resolved attacks clear only stale selection prompts before combat feedback", () => {
  assert.match(source, /function showToast\(message, tone, purpose\)/);
  assert.match(source, /purpose: purpose \|\| "feedback"/);
  const clearStart = source.indexOf("function clearSelectionPrompt");
  const clearEnd = source.indexOf("function cancelSelection", clearStart);
  const clearBody = source.slice(clearStart, clearEnd);
  assert.match(clearBody, /toast && toast\.purpose === "selection-prompt"/);
  assert.doesNotMatch(clearBody, /duration|tone === "invalid"|dispatch|fireAction/);
  const cancelStart = source.indexOf("function cancelSelection");
  const cancelEnd = source.indexOf("function activateTarget", cancelStart);
  assert.match(source.slice(cancelStart, cancelEnd), /clearSelectionPrompt\(\)/);
  assert.match(source, /showToast\("공격할 적을 선택하세요\.", "normal", "selection-prompt"\)/);
  assert.match(source, /"빛나는 대상에 카드를 사용하세요\."/);
  assert.match(source, /"빛나는 전열·후열 빈칸을 선택하세요\."[\s\S]{0,50}"normal",[\s\S]{0,50}"selection-prompt"/);
  const eventStart = source.indexOf("function handleEvent");
  const attackStart = source.indexOf('type === "attack:start"', eventStart);
  const cardPlayStart = source.indexOf('type === "card:play"', attackStart);
  const attackBody = source.slice(attackStart, cardPlayStart);
  assert.match(attackBody, /clearSelectionPrompt\(\)/);
  assert.match(attackBody, /liveRegion\.textContent = "공격이 충돌할 때까지 다음 명령을 기다립니다\."/);
});

test("cached tabletop depth planes add bounded parallax without gameplay hit regions", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const center = hooks.tabletopParallaxOffset({ x: 1365 / 2, y: 768 / 2 }, false);
  assert.deepEqual({ ...center }, { x: 0, y: 0, sheen: 0.5 });
  const upperLeft = hooks.tabletopParallaxOffset({ x: -100, y: -100 }, false);
  const lowerRight = hooks.tabletopParallaxOffset({ x: 2000, y: 1200 }, false);
  assert.equal(upperLeft.x, -3.2);
  assert.equal(upperLeft.y, -1.8);
  assert.equal(lowerRight.x, 3.2);
  assert.equal(lowerRight.y, 1.8);
  assert.deepEqual(
    { ...hooks.tabletopParallaxOffset({ x: 0, y: 0 }, true) },
    { x: 0, y: 0, sheen: 0.5 },
  );
  assert.equal(hooks.timing.tabletopParallaxMaxX, 3.2);
  assert.equal(hooks.timing.tabletopParallaxMaxY, 1.8);

  assert.match(source, /function createTabletopDepthSurfaces\(documentRef, backgroundSurface\)/);
  assert.match(source, /backgroundContext\.drawImage\(staticRelief, 0, 0\)/);
  assert.match(source, /const tabletopDepth = createTabletopDepthSurfaces\(documentRef, background\)/);
  const environmentStart = source.indexOf("function drawBattlefieldEnvironment");
  const environmentEnd = source.indexOf("function drawDyingGhosts", environmentStart);
  const environmentBody = source.slice(environmentStart, environmentEnd);
  for (const layer of ["mapRelief", "warmGlow", "directionalSheen"]) {
    assert.match(environmentBody, new RegExp(`tabletopDepth\\.${layer}`));
  }
  assert.doesNotMatch(environmentBody, /staticRelief/);
  assert.doesNotMatch(environmentBody, /create(?:Linear|Radial)Gradient/);
  assert.doesNotMatch(environmentBody, /addHit\(/);

  const drawFrameStart = source.indexOf("function drawFrame");
  const hitsReset = source.indexOf("hits = []", drawFrameStart);
  const environmentCall = source.indexOf("drawBattlefieldEnvironment(now)", drawFrameStart);
  assert.ok(environmentCall > drawFrameStart && environmentCall < hitsReset);
});

test("sizes the backing store from visible stage pixels instead of a fixed DPR2 canvas", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  const desktop = hooks.boardRenderMetrics(979, 856, 2);
  assert.deepEqual(
    {
      cssWidth: desktop.cssWidth,
      cssHeight: desktop.cssHeight,
      backingWidth: desktop.backingWidth,
      backingHeight: desktop.backingHeight,
    },
    { cssWidth: 979, cssHeight: 550, backingWidth: 1958, backingHeight: 1100 },
  );
  const compact = hooks.boardRenderMetrics(768, 720, 2);
  assert.deepEqual(
    {
      cssWidth: compact.cssWidth,
      cssHeight: compact.cssHeight,
      backingWidth: compact.backingWidth,
      backingHeight: compact.backingHeight,
    },
    { cssWidth: 768, cssHeight: 432, backingWidth: 1536, backingHeight: 864 },
  );
  const formerFixedPixels = 2730 * 1536;
  assert.ok(formerFixedPixels / (desktop.backingWidth * desktop.backingHeight) > 1.94);
  assert.ok(formerFixedPixels / (compact.backingWidth * compact.backingHeight) > 3.15);
  const capped = hooks.boardRenderMetrics(1365, 768, 2.5);
  assert.equal(capped.renderScaleX, 2);
  assert.equal(capped.renderScaleY, 2);
  assert.deepEqual(
    [capped.backingWidth, capped.backingHeight],
    [2730, 1536],
  );
  assert.equal(hooks.timing.boardRenderScaleMin, 0.5);
  assert.equal(hooks.timing.boardRenderScaleMax, 2);
  assert.match(source, /ctx\.setTransform\(renderScaleX, 0, 0, renderScaleY, 0, 0\)/);
  assert.doesNotMatch(source, /Math\.round\(LOGICAL_WIDTH \* dpr\)/);
});

test("sleeps reduced-motion idle boards and throttles ambient-only redraws", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: "board-ui/index.js" });
  const hooks = sandbox.globalThis.TK.modules.boardUI.testHooks;
  assert.equal(hooks.boardFrameDelay(true, false), 0);
  assert.equal(hooks.boardFrameDelay(true, true), 0);
  assert.equal(hooks.boardFrameDelay(false, false), 100);
  assert.equal(hooks.boardFrameDelay(false, true), null);
  assert.equal(hooks.timing.boardAmbientFrameMs, 100);

  const drawStart = source.indexOf("function drawFrame");
  const eventStart = source.indexOf("function eventLabel", drawStart);
  const drawBody = source.slice(drawStart, eventStart);
  assert.match(drawBody, /frameHandle = 0/);
  assert.match(drawBody, /scheduleNextBoardFrame\(now\)/);
  assert.doesNotMatch(drawBody, /requestAnimationFrame/);
  assert.match(source, /function invalidateBoardFrame\(\)[\s\S]{0,220}clearTimeout\(idleFrameTimer\)[\s\S]{0,180}requestBoardAnimationFrame\(\)/);
  assert.match(source, /function scheduleNextBoardFrame\(now\)[\s\S]{0,500}boardFrameDelay\([\s\S]{0,350}setTimeout/);
  assert.match(source, /function boardNeedsActiveAnimation\(now\)[\s\S]{0,1000}presentationBusyUntil > now/);
  assert.match(source, /visualPresses\.forEach\(\(pulse, key\)[\s\S]{0,260}visualPresses\.delete\(key\)/);
  assert.match(source, /function render\(nextState\)[\s\S]{0,350}invalidateBoardFrame\(\)/);
  assert.match(source, /function handleEvent\(type, detail\)[\s\S]{0,130}invalidateBoardFrame\(\)/);
  assert.match(source, /function onPointerMove\(event\)[\s\S]{0,90}invalidateBoardFrame\(\)/);
  assert.match(source, /if \(idleFrameTimer\) global\.clearTimeout\(idleFrameTimer\)/);
});

test("uses the rendered snapshot on frames and refreshes once at event boundaries", () => {
  const stateStart = source.indexOf("function stateNow");
  const stateEnd = source.indexOf("function activeCombatTimeline", stateStart);
  const stateBody = source.slice(stateStart, stateEnd);
  assert.match(stateBody, /if \(currentState\) return currentState/);
  assert.doesNotMatch(stateBody, /getState\(/);
  const refreshStart = source.indexOf("function refreshStateSnapshot");
  const refreshEnd = source.indexOf("function stateNow", refreshStart);
  assert.match(source.slice(refreshStart, refreshEnd), /const nextState = getState\(\)/);
  const handleStart = source.indexOf("function handleEvent");
  const handleEnd = source.indexOf("function render", handleStart);
  const handleBody = source.slice(handleStart, handleEnd);
  assert.ok(handleBody.indexOf("refreshStateSnapshot()") < handleBody.indexOf("eventDisplayMessage"));
  const drawStart = source.indexOf("function drawFrame");
  const drawEnd = source.indexOf("function eventLabel", drawStart);
  assert.doesNotMatch(source.slice(drawStart, drawEnd), /getState\(/);
});
