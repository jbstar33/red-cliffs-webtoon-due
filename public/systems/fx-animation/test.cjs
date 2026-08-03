"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function gradient() {
  return { addColorStop() {} };
}

function makeContext() {
  const calls = Object.create(null);
  const samples = {
    alphas: [],
    lineWidths: [],
    strokeStyles: [],
    fillStyles: [],
    nonFiniteArguments: 0
  };
  const ctx = {
    save: count("save"), restore: count("restore"),
    translate: count("translate"), rotate: count("rotate"), scale: count("scale"),
    beginPath: count("beginPath"), closePath: count("closePath"),
    moveTo: count("moveTo"), lineTo: count("lineTo"),
    quadraticCurveTo: count("quadraticCurveTo"),
    arc: count("arc"), ellipse: count("ellipse"),
    fill: count("fill"), stroke: count("stroke"),
    fillRect: count("fillRect"), strokeText: count("strokeText"),
    fillText: count("fillText"),
    createLinearGradient() { calls.createLinearGradient = (calls.createLinearGradient || 0) + 1; return gradient(); },
    createRadialGradient() { calls.createRadialGradient = (calls.createRadialGradient || 0) + 1; return gradient(); },
    measureText(text) { return { width: String(text).length * 9 }; },
    set globalAlpha(value) {
      this._globalAlpha = value;
      samples.alphas.push(value);
      if (!Number.isFinite(value)) samples.nonFiniteArguments += 1;
    },
    get globalAlpha() { return this._globalAlpha; },
    set globalCompositeOperation(value) { this._gco = value; },
    set fillStyle(value) {
      this._fill = value;
      samples.fillStyles.push(String(value));
    },
    set strokeStyle(value) {
      this._stroke = value;
      samples.strokeStyles.push(String(value));
    },
    set lineWidth(value) {
      this._lineWidth = value;
      samples.lineWidths.push(value);
      if (!Number.isFinite(value)) samples.nonFiniteArguments += 1;
    },
    set lineCap(value) { this._lineCap = value; },
    set lineJoin(value) { this._lineJoin = value; },
    set font(value) { this._font = value; },
    set textAlign(value) { this._textAlign = value; },
    set textBaseline(value) { this._textBaseline = value; },
    set shadowColor(value) { this._shadowColor = value; },
    set shadowBlur(value) { this._shadowBlur = value; }
  };
  function count(name) {
    return function (...args) {
      calls[name] = (calls[name] || 0) + 1;
      if (args.some((value) => typeof value === "number" && !Number.isFinite(value))) {
        samples.nonFiniteArguments += 1;
      }
    };
  }
  ctx.calls = calls;
  ctx.samples = samples;
  return ctx;
}

function loadModule(extra) {
  const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
  const sandbox = Object.assign({
    console,
    Math,
    Number,
    Array,
    String,
    Object,
    parseInt
  }, extra || {});
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "fx-animation/index.js" });
  return sandbox.TK.modules.fxAnimation;
}

const moduleApi = loadModule();
assert.equal(typeof moduleApi.createFX, "function", "global module factory is registered");

// Public idle contract: runtimes can stop clearing/updating/rendering the FX
// canvas without reaching into _debug. It must include delayed jobs, particles,
// and shake state, and return to false after every source of visuals expires.
const lifecycle = moduleApi.createFX({
  canvas: { width: 900, height: 600 },
  getAnchor() { return { x: 450, y: 300 }; },
  reducedMotion: false
});
assert.equal(typeof lifecycle.hasActiveVisuals, "function", "public FX activity query is exposed");
assert.equal(lifecycle.hasActiveVisuals(), false, "fresh FX renderer is idle");
lifecycle.shake(4);
assert.equal(lifecycle.hasActiveVisuals(), true, "pending shake is active before its first update");
for (let frame = 0; frame < 12; frame += 1) lifecycle.update(0.05);
assert.equal(lifecycle.hasActiveVisuals(), false, "expired shake returns renderer to idle");
lifecycle.handleEvent("game:end", { winner: "player" });
assert.equal(lifecycle.hasActiveVisuals(), true, "delayed finale is active immediately when queued");
assert.ok(
  lifecycle._debug().timelines.find((job) => job.kind === "finale").age < 0,
  "activity query includes a finale while it is still delayed"
);
for (let frame = 0; frame < 50; frame += 1) lifecycle.update(0.05);
assert.equal(lifecycle.hasActiveVisuals(), false, "finale and its particles return renderer to idle");
lifecycle.handleEvent("minion:death", { name: "하후돈" });
assert.equal(lifecycle.hasActiveVisuals(), true, "death and delayed residue activate the renderer");
for (let frame = 0; frame < 45; frame += 1) lifecycle.update(0.05);
assert.equal(lifecycle.hasActiveVisuals(), false, "death residue and particles fully expire");
lifecycle.handleEvent("card:play", { actor: "player" });
assert.equal(lifecycle.hasActiveVisuals(), true);
lifecycle.destroy();
assert.equal(lifecycle.hasActiveVisuals(), false, "destroy immediately clears the public activity signal");
lifecycle.handleEvent("game:end", { winner: "player" });
assert.equal(lifecycle.hasActiveVisuals(), false, "destroyed renderer stays idle when events arrive");

// Force maximum particle lifetimes so a timeline expires first. The public
// signal must remain true for that particle-only tail without scanning pools.
const maxRandomMath = Object.create(Math);
maxRandomMath.random = () => 0.999;
const deterministicModule = loadModule({ Math: maxRandomMath });
const particleTail = deterministicModule.createFX({
  canvas: { width: 900, height: 600 },
  getAnchor() { return { x: 450, y: 300 }; },
  reducedMotion: false
});
particleTail.handleEvent("card:play", { actor: "player" });
for (let frame = 0; frame < 20; frame += 1) particleTail.update(0.05);
assert.equal(particleTail._debug().jobs, 0, "summon timeline expires before maximum-life smoke");
assert.ok(particleTail._debug().particles > 0, "deterministic particle tail remains");
assert.equal(particleTail.hasActiveVisuals(), true, "particle-only tail keeps public signal active");
for (let frame = 0; frame < 20; frame += 1) particleTail.update(0.05);
assert.equal(particleTail.hasActiveVisuals(), false, "particle-only tail eventually becomes idle");
particleTail.destroy();

const activitySource = fs.readFileSync(path.join(__dirname, "index.js"), "utf8")
  .match(/function hasActiveVisuals\(\) \{[\s\S]*?\n    \}/)[0];
assert.doesNotMatch(activitySource, /\b(?:for|while)\s*\(|\.(?:map|filter|some|every)\s*\(/,
  "public activity query is O(1) and performs no pool scan");
assert.doesNotMatch(activitySource, /\bnew\s+|return\s+(?:\[|\{)/,
  "public activity query allocates no arrays or objects");

const mockSource = fs.readFileSync(path.join(__dirname, "mock.html"), "utf8");
assert.match(
  mockSource,
  /op:\s*"heal_friendly_hero",\s*amount:\s*3,\s*actor:\s*"player"/,
  "mock heal button publishes an explicit player-owned semantic effect"
);
assert.match(
  mockSource,
  /op:\s*"draw",\s*amount:\s*2,\s*actor:\s*"player"/,
  "mock draw button exercises the owner-label effect route"
);
assert.match(
  mockSource,
  /op:\s*"buff_all_allies",\s*amount:\s*2,\s*actor:\s*"player"/,
  "mock buff button publishes an explicit player-owned semantic effect"
);
assert.match(
  mockSource,
  /fx\.handleEvent\("card:draw",\s*\{\s*actor:\s*"player"\s*\}\)/,
  "mock retains a separate physical card-draw animation control"
);
assert.match(
  mockSource,
  /\["패배",\s*\(\)\s*=>\s*fx\.handleEvent\("game:end",\s*\{\s*winner:\s*"ai"\s*\}\)\]/,
  "mock exposes the distinct defeat choreography"
);
[
  "actualHealing",
  "actualArmorGained",
  "actualDrawCount",
  "actualSummonCount",
  "discountedTarget",
  "readiedTarget",
  "affectedTargets",
  "fizzled",
  "blockedByShield"
].forEach((field) => {
  assert.match(mockSource, new RegExp(field), `mock exposes ${field} result feedback`);
});

// Combat feedback is deliberately staged: the attacker telegraphs first,
// collision follows, and numbers settle last.
const rhythm = moduleApi.createFX({
  canvas: { width: 1200, height: 700 },
  getAnchor(role) {
    if (role && typeof role === "object") {
      return role.side === "player" ? { x: 270, y: 500 } : { x: 900, y: 210 };
    }
    if (role === "attacker") return { x: 270, y: 500 };
    if (role === "target") return { x: 900, y: 210 };
    return { x: 600, y: 350 };
  },
  reducedMotion: false
});
rhythm.handleEvent("attack:start", {
  actor: "player",
  attacker: { zone: "board", side: "player", index: 0 },
  target: { zone: "board", side: "ai", index: 0 }
});
rhythm.handleEvent("attack:hit", {
  actor: "player",
  target: { zone: "board", side: "ai", index: 0 }
});
rhythm.handleEvent("minion:damage", {
  amount: 5,
  target: { zone: "board", side: "ai", index: 0 },
  source: { side: "player", op: "attack" }
});
let rhythmDebug = rhythm._debug();
const attackTimeline = rhythmDebug.timelines.find((job) => job.kind === "attack");
assert.ok(
  Math.abs(attackTimeline.age) === 0,
  "attack anticipation starts immediately"
);
assert.equal(attackTimeline.contactOvershoot, 22, "attack contact uses a restrained 22px overshoot");
assert.ok(attackTimeline.contactOvershoot <= 24, "attack overlay never exceeds the 24px impulse contract");
assert.ok(attackTimeline.pathLength > 600, "motion trail retains the resolved source-to-target span");
assert.equal(
  rhythmDebug.timelines.filter((job) => job.kind === "board-light" && job.reaction === "attack").length,
  1,
  "attack creates one localized source-to-target board-light reaction"
);
assert.ok(
  rhythmDebug.timelines.find((job) => job.kind === "impact").age < 0,
  "impact waits for attack anticipation and travel"
);
const impactTimeline = rhythmDebug.timelines.find((job) => job.kind === "impact");
assert.equal(impactTimeline.impulseTravel, 20, "contact deformation uses a restrained 20px impulse");
assert.ok(impactTimeline.impulseTravel <= 24, "contact deformation respects the 24px travel ceiling");
assert.equal(
  rhythmDebug.timelines.filter((job) => job.kind === "board-light" && job.reaction === "impact").length,
  1,
  "impact creates one target-localized board-light reaction"
);
assert.ok(
  rhythmDebug.timelines.find((job) => job.kind === "number").age < 0,
  "damage number waits for collision"
);
for (let frame = 0; frame < 8; frame += 1) rhythm.update(0.05);
rhythmDebug = rhythm._debug();
assert.equal(
  rhythmDebug.timelines.find((job) => job.kind === "impact").cueFired,
  true,
  "collision cue fires after the travel beat"
);
assert.ok(
  Math.abs(rhythmDebug.shake.x) + Math.abs(rhythmDebug.shake.y) > 0,
  "impact supplies a brief restrained shake"
);
rhythm.destroy();

// Freeze the representative contact frames that players actually perceive.
// They must contain a non-trivial procedural silhouette (slash/ring/recoil/
// fragments/afterimage), not merely a soft glow. The sampler also catches
// invalid canvas values that a permissive browser would otherwise ignore.
function advanceFX(instance, seconds) {
  let remaining = seconds;
  while (remaining > 0.00001) {
    const step = Math.min(0.05, remaining);
    instance.update(step);
    remaining -= step;
  }
}

function contactMetrics(events, seconds) {
  const context = makeContext();
  const instance = moduleApi.createFX({
    canvas: { width: 1200, height: 700 },
    getAnchor(role) {
      if (role && typeof role === "object") {
        if (role.zone === "hero") return { x: 600, y: role.side === "ai" ? 82 : 618 };
        return {
          x: 760 + (Number.isInteger(role.index) ? role.index * 96 : 0),
          y: role.side === "player" ? 500 : 210
        };
      }
      if (role === "attacker") return { x: 270, y: 500 };
      if (role === "target") return { x: 870, y: 210 };
      if (role === "minion") return { x: 760, y: 210 };
      return { x: 600, y: 350 };
    },
    reducedMotion: false
  });
  events.forEach(([type, detail]) => instance.handleEvent(type, detail));
  advanceFX(instance, seconds);
  instance.render(context);
  const visibleAlphas = context.samples.alphas
    .filter((value) => Number.isFinite(value) && value > 0.001);
  const distinctWidths = new Set(context.samples.lineWidths
    .filter(Number.isFinite)
    .map((value) => Number(value).toFixed(2)));
  const distinctColors = new Set(
    context.samples.strokeStyles.concat(context.samples.fillStyles)
      .filter((value) => value && value !== "[object Object]")
  );
  const metrics = {
    strokes: context.calls.stroke || 0,
    fills: context.calls.fill || 0,
    paths: context.calls.beginPath || 0,
    curves: context.calls.quadraticCurveTo || 0,
    alphaMin: visibleAlphas.length ? Math.min(...visibleAlphas) : 0,
    alphaMax: visibleAlphas.length ? Math.max(...visibleAlphas) : 0,
    widthDiversity: distinctWidths.size,
    colorDiversity: distinctColors.size,
    nonFinite: context.samples.nonFiniteArguments,
    save: context.calls.save || 0,
    restore: context.calls.restore || 0,
    particles: instance._debug().particles
  };
  instance.destroy();
  return metrics;
}

const attackContact = contactMetrics([
  ["attack:start", {
    actor: "player",
    attacker: { zone: "board", side: "player", index: 0 },
    target: { zone: "board", side: "ai", index: 0 }
  }],
  ["attack:hit", {
    actor: "player",
    attacker: { zone: "board", side: "player", index: 0 },
    target: { zone: "board", side: "ai", index: 0 }
  }]
], 0.45);
assert.ok(attackContact.strokes >= 45, "attack contact frame has layered directional strokes");
assert.ok(attackContact.fills >= 30, "attack contact frame has controlled shards and spark bodies");
assert.ok(attackContact.curves >= 5, "attack contact frame retains slash and trail curvature");
assert.ok(attackContact.widthDiversity >= 8, "attack contact uses tapered core/rim/trail widths");
assert.ok(attackContact.colorDiversity >= 6, "attack contact separates hot core, faction rim, and debris");
assert.ok(attackContact.alphaMax >= 0.9 && attackContact.alphaMin < 0.2,
  "attack contact spans a bright core and restrained afterimages");

const shieldContact = contactMetrics([
  ["shield:break", {
    actor: "player",
    attacker: { zone: "board", side: "player", index: 0 },
    target: { zone: "board", side: "ai", index: 0 },
    source: { side: "player", op: "damage_target" }
  }]
], 0.19);
assert.ok(shieldContact.strokes >= 18,
  `shield break shows plate arcs, cracks, and a directional slash: ${JSON.stringify(shieldContact)}`);
assert.ok(shieldContact.fills >= 20, "shield break carries visible controlled shard bodies");
assert.ok(shieldContact.widthDiversity >= 6, "shield fracture separates plate, crack, and slash weights");
assert.ok(shieldContact.colorDiversity >= 4, "shield fracture has white core and blue material separation");

const deathContact = contactMetrics([
  ["minion:death", {
    side: "ai",
    index: 0,
    target: { zone: "board", side: "ai", index: 0 },
    name: "하후돈"
  }]
], 0.68);
assert.ok(deathContact.strokes >= 20, "death contact has tears, soul streaks, and collapse rings");
assert.ok(deathContact.fills >= 35, "death contact has a controlled ash/shard breakup silhouette");
assert.ok(deathContact.curves >= 4, "death contact contains ascending non-linear soul streaks");
assert.ok(deathContact.colorDiversity >= 5, "death separates void, ash, fracture, and residue materials");

const summonContact = contactMetrics([
  ["card:play", {
    actor: "player",
    side: "player",
    boardIndex: 0,
    card: { name: "조운" }
  }]
], 0.36);
assert.ok(summonContact.strokes >= 18, "summon landing shows the seal and two-speed contact rings");
assert.ok(summonContact.fills >= 25, "summon landing includes grounded fragments, sparks, and smoke");
assert.ok(summonContact.widthDiversity >= 6, "summon landing has distinct seal/panel/ring weights");

const aoeContact = contactMetrics([
  ["effect:trigger", {
    actor: "player",
    source: "zhou-yu",
    op: "damage_all_enemies",
    amount: 2,
    result: {
      success: true,
      fizzled: false,
      affectedTargets: [
        { zone: "board", side: "ai", index: 0 },
        { zone: "board", side: "ai", index: 1 },
        { zone: "board", side: "ai", index: 2 }
      ]
    }
  }]
], 0.22);
assert.ok(aoeContact.strokes >= 20,
  `AOE contact gives every affected target a readable slash/ring beat: ${JSON.stringify(aoeContact)}`);
assert.ok(aoeContact.fills >= 50, "AOE contact uses bounded local debris across affected targets");
assert.ok(aoeContact.curves >= 8, "AOE accents retain directional curved slash silhouettes");
assert.ok(aoeContact.colorDiversity >= 5, "AOE contact separates core, damage, and debris values");

[attackContact, shieldContact, deathContact, summonContact, aoeContact]
  .forEach((metrics, index) => {
    assert.equal(metrics.nonFinite, 0, `contact frame ${index} sends only finite canvas values`);
    assert.equal(metrics.save, metrics.restore, `contact frame ${index} balances canvas state`);
    assert.ok(metrics.particles <= 420, `contact frame ${index} respects the fixed particle cap`);
  });

// Commander rules publish three semantic event types. Each commander keeps a
// distinct code-native signature and resolves against the exact hero/minion
// anchors without replacing the ordinary attack timeline.
function commanderAnchor(role, detail) {
  if (role && typeof role === "object") {
    if (role.zone === "hero") {
      return { x: 600, y: role.side === "ai" ? 90 : 610 };
    }
    if (role.zone === "board") {
      return {
        x: 320 + (Number.isInteger(role.index) ? role.index * 150 : 0),
        y: role.side === "ai" ? 220 : 480
      };
    }
  }
  if (role === "hero") {
    return { x: 600, y: detail.side === "ai" ? 90 : 610 };
  }
  if (role === "minion") {
    return {
      x: 320 + (Number.isInteger(detail.index) ? detail.index * 150 : 0),
      y: detail.side === "ai" ? 220 : 480
    };
  }
  if (role === "attacker") return { x: 280, y: 500 };
  if (role === "target") return { x: 820, y: 220 };
  return { x: 600, y: 350 };
}

const commanderFx = moduleApi.createFX({
  canvas: { width: 1200, height: 700 },
  getAnchor: commanderAnchor,
  reducedMotion: false
});
commanderFx.handleEvent("attack:start", {
  actor: "ai",
  attacker: { zone: "board", side: "ai", index: 2 },
  target: { zone: "hero", side: "player" }
});
commanderFx.handleEvent("commander:power", {
  actor: "player",
  side: "player",
  commanderId: "caocao",
  powerId: "caocao_recovery",
  cost: 1,
  target: { zone: "hero", side: "player" },
  result: { actualHealing: 1, healthBefore: 28, healthAfter: 29 }
});
commanderFx.handleEvent("commander:reflect", {
  actor: "player",
  side: "player",
  commanderId: "liubei",
  powerId: "liubei_reflection",
  attacker: { zone: "board", side: "ai", index: 2 },
  target: { zone: "board", side: "ai", index: 2 },
  chargesBefore: 2,
  chargesAfter: 1,
  result: { actualDamage: 1, healthBefore: 2, healthAfter: 1 }
});
commanderFx.handleEvent("commander:power", {
  actor: "player",
  side: "player",
  commanderId: "sunquan",
  powerId: "sunquan_flood",
  cost: 3,
  target: { zone: "characters", side: "ai", all: true },
  result: {
    actualDamage: 3,
    affectedTargets: [
      { target: { zone: "hero", side: "ai" }, actualDamage: 1 },
      { target: { zone: "board", side: "ai", index: 0 }, actualDamage: 1 },
      { target: { zone: "board", side: "ai", index: 1 }, actualDamage: 1 }
    ]
  }
});
const beforeNomadPower = commanderFx._debug().jobs;
commanderFx.handleEvent("commander:power", {
  actor: "player",
  side: "player",
  commanderId: "nomad",
  powerId: "nomad_lock",
  target: { zone: "board", side: "ai", index: 1 }
});
assert.equal(
  commanderFx._debug().jobs,
  beforeNomadPower + 1,
  "nomad power immediately adds its commander cut-in"
);
assert.equal(
  commanderFx._debug().timelines.filter((job) => job.kind === "commander-lock").length,
  0,
  "the lasso itself still waits for the immediately following semantic lock event"
);
commanderFx.handleEvent("commander:lock", {
  actor: "player",
  side: "player",
  commanderId: "nomad",
  powerId: "nomad_lock",
  target: { zone: "board", side: "ai", index: 1 },
  status: "pending"
});
commanderFx.handleEvent("commander:lock", {
  actor: "player",
  side: "player",
  commanderId: "nomad",
  powerId: "nomad_lock",
  target: { zone: "board", side: "ai", index: 1 },
  status: "active"
});

let commanderDebug = commanderFx._debug();
const commanderTimelines = commanderDebug.timelines;
const healTimeline = commanderTimelines.find((job) => job.kind === "commander-heal");
const reflectTimeline = commanderTimelines.find((job) => job.kind === "commander-reflect");
const floodTimeline = commanderTimelines.find((job) => job.kind === "commander-flood");
const floodHits = commanderTimelines.filter((job) => job.kind === "commander-flood-hit");
const lockTimelines = commanderTimelines.filter((job) => job.kind === "commander-lock");
const emphasisTimelines = commanderTimelines.filter((job) => job.kind === "commander-emphasis");
assert.equal(emphasisTimelines.length, 4, "every commander activation gets one readable power cut-in");
assert.equal(
  JSON.stringify(emphasisTimelines.map((job) => [job.commanderId, job.label])),
  JSON.stringify([
    ["caocao", "패왕의 휴식"],
    ["liubei", "인덕의 반사"],
    ["sunquan", "수공"],
    ["nomad", "족쇄 명령"]
  ])
);
assert.ok(emphasisTimelines.every((job) => job.layer === 3));
assert.ok(emphasisTimelines.every((job) => job.x === 600 && job.y === 610));
assert.ok(emphasisTimelines.every((job) => job.signature.endsWith(":anime-power-cut")));
assert.equal(healTimeline.signature, "caocao:healing-rune");
assert.equal(healTimeline.color, "#8eeaff");
assert.equal(healTimeline.secondaryColor, "#effdff");
assert.equal(healTimeline.x, 600);
assert.equal(healTimeline.y, 610);
assert.equal(healTimeline.amount, 1);
assert.equal(reflectTimeline.signature, "liubei:golden-reflection");
assert.equal(reflectTimeline.color, "#ffd76a");
assert.equal(reflectTimeline.x1, 600, "reflection begins at Liu Bei's hero anchor");
assert.equal(reflectTimeline.y1, 610);
assert.equal(reflectTimeline.x2, 620, "reflection returns to the exact attacking minion");
assert.equal(reflectTimeline.y2, 220);
assert.ok(reflectTimeline.pathLength > 300);
assert.ok(
  commanderTimelines.some((job) => job.kind === "attack"),
  "ordinary attack motion survives alongside the narrow reflection line"
);
assert.equal(floodTimeline.signature, "sunquan:cross-board-flood");
assert.equal(floodTimeline.color, "#36d6ce");
assert.equal(floodTimeline.secondaryColor, "#4d91ff");
assert.equal(floodTimeline.layer, 0, "the broad water sweep stays beneath combat cards");
assert.equal(floodTimeline.targetCount, 3);
assert.equal(floodHits.length, 3, "hero and both minion anchors receive one splash contact");
assert.equal(
  JSON.stringify(floodHits.map((job) => [job.anchorRole, job.anchorSide, job.targetIndex])),
  JSON.stringify([
    ["hero", "ai", null],
    ["minion", "ai", 0],
    ["minion", "ai", 1]
  ])
);
assert.equal(lockTimelines.length, 2);
assert.equal(
  JSON.stringify(lockTimelines.map((job) => job.status)),
  JSON.stringify(["pending", "active"])
);
assert.ok(lockTimelines.every((job) => job.signature === "nomad:lasso-seal"));
assert.ok(lockTimelines.every((job) => job.color === "#d5a55d"));
assert.ok(lockTimelines.every((job) => job.x === 470 && job.y === 220));
assert.ok(
  [...emphasisTimelines, healTimeline, reflectTimeline, floodTimeline, ...floodHits, ...lockTimelines]
    .every((timeline) => timeline.duration > 0 && timeline.duration <= 0.9),
  "commander cues use concise bounded lifetimes"
);
assert.equal(commanderFx.hasActiveVisuals(), true);
const commanderContext = makeContext();
advanceFX(commanderFx, 0.24);
commanderFx.render(commanderContext);
assert.ok((commanderContext.calls.stroke || 0) >= 30,
  "commander contact frame contains readable runes, water, reflection, and knot strokes");
assert.ok((commanderContext.calls.quadraticCurveTo || 0) >= 8,
  "commander contact frame uses procedural currents and reflected trajectories");
assert.equal(commanderContext.samples.nonFiniteArguments, 0);
assert.equal(commanderContext.calls.save, commanderContext.calls.restore);
assert.ok(commanderFx._debug().particles <= 420);
advanceFX(commanderFx, 2);
assert.equal(commanderFx._debug().jobs, 0);
assert.equal(commanderFx._debug().particles, 0);
assert.equal(commanderFx.hasActiveVisuals(), false,
  "all commander timelines and particle tails return the renderer to idle");
commanderFx.destroy();

[
  {
    name: "caocao",
    seconds: 0.22,
    event: ["commander:power", {
      actor: "player",
      commanderId: "caocao",
      result: { actualHealing: 1 }
    }]
  },
  {
    name: "liubei",
    seconds: 0.3,
    event: ["commander:reflect", {
      actor: "player",
      commanderId: "liubei",
      attacker: { zone: "board", side: "ai", index: 0 }
    }]
  },
  {
    name: "sunquan",
    seconds: 0.3,
    event: ["commander:power", {
      actor: "player",
      commanderId: "sunquan",
      target: { zone: "characters", side: "ai", all: true },
      result: {
        affectedTargets: [
          { target: { zone: "hero", side: "ai" } },
          { target: { zone: "board", side: "ai", index: 0 } }
        ]
      }
    }]
  },
  {
    name: "nomad",
    seconds: 0.24,
    event: ["commander:lock", {
      actor: "player",
      commanderId: "nomad",
      target: { zone: "board", side: "ai", index: 0 },
      status: "pending"
    }]
  }
].forEach(({ name, seconds, event }) => {
  const metrics = contactMetrics([event], seconds);
  assert.ok(metrics.paths >= 4, `${name} commander contact renders procedural geometry`);
  assert.ok(metrics.strokes >= 3, `${name} commander contact has a visible line signature`);
  assert.equal(metrics.nonFinite, 0, `${name} commander contact emits finite canvas values`);
  assert.equal(metrics.save, metrics.restore, `${name} commander contact balances canvas state`);
  assert.ok(metrics.particles <= 420, `${name} commander contact respects the particle cap`);
});

const malformedCommanderContext = makeContext();
const malformedCommander = moduleApi.createFX({
  canvas: { width: 0, height: Number.NaN },
  getAnchor() { return null; },
  reducedMotion: false
});
malformedCommander.handleEvent("commander:power", {
  commanderId: "caocao",
  result: { actualHealing: Number.NaN }
});
malformedCommander.handleEvent("commander:reflect", { commanderId: "liubei" });
malformedCommander.handleEvent("commander:power", {
  commanderId: "sunquan",
  result: { affectedTargets: [{ target: { zone: "board", side: "ai", index: 99 } }] }
});
malformedCommander.handleEvent("commander:lock", { commanderId: "nomad" });
advanceFX(malformedCommander, 0.2);
malformedCommander.render(malformedCommanderContext);
assert.equal(malformedCommanderContext.samples.nonFiniteArguments, 0,
  "fallback commander anchors never send NaN or Infinity to Canvas2D");
assert.equal(malformedCommanderContext.calls.save, malformedCommanderContext.calls.restore);
malformedCommander.destroy();

const reducedCommanderContext = makeContext();
const reducedCommander = moduleApi.createFX({
  canvas: { width: 1200, height: 700 },
  getAnchor: commanderAnchor,
  reducedMotion: true
});
[
  ["commander:power", {
    actor: "player",
    commanderId: "caocao",
    result: { actualHealing: 1 }
  }],
  ["commander:reflect", {
    actor: "player",
    commanderId: "liubei",
    attacker: { zone: "board", side: "ai", index: 0 }
  }],
  ["commander:power", {
    actor: "player",
    commanderId: "sunquan",
    result: {
      affectedTargets: [
        { target: { zone: "hero", side: "ai" } },
        { target: { zone: "board", side: "ai", index: 0 } }
      ]
    }
  }],
  ["commander:lock", {
    actor: "player",
    commanderId: "nomad",
    target: { zone: "board", side: "ai", index: 0 },
    status: "active"
  }]
].forEach(([type, detail]) => reducedCommander.handleEvent(type, detail));
assert.ok(
  reducedCommander._debug().timelines.every((job) => job.duration <= 0.35),
  "reduced motion abbreviates every commander timeline"
);
advanceFX(reducedCommander, 0.08);
reducedCommander.render(reducedCommanderContext);
commanderDebug = reducedCommander._debug();
assert.equal(commanderDebug.shake.x, 0);
assert.equal(commanderDebug.shake.y, 0);
assert.ok(commanderDebug.particles <= commanderDebug.capacity);
assert.equal(reducedCommanderContext.samples.nonFiniteArguments, 0);
assert.equal(reducedCommanderContext.calls.save, reducedCommanderContext.calls.restore);
advanceFX(reducedCommander, 1.2);
assert.equal(reducedCommander.hasActiveVisuals(), false,
  "reduced commander cues and particles expire promptly");
reducedCommander.destroy();

const commanderStress = moduleApi.createFX({
  canvas: { width: 1200, height: 700 },
  getAnchor: commanderAnchor,
  reducedMotion: false
});
for (let iteration = 0; iteration < 180; iteration += 1) {
  commanderStress.handleEvent("commander:power", {
    actor: "player",
    commanderId: "caocao",
    result: { actualHealing: 1 }
  });
  commanderStress.handleEvent("commander:reflect", {
    actor: "player",
    commanderId: "liubei",
    attacker: { zone: "board", side: "ai", index: iteration % 5 }
  });
  commanderStress.handleEvent("commander:power", {
    actor: "player",
    commanderId: "sunquan",
    result: {
      affectedTargets: [
        { target: { zone: "hero", side: "ai" } },
        ...Array.from({ length: 5 }, (_unused, index) => ({
          target: { zone: "board", side: "ai", index }
        }))
      ]
    }
  });
  commanderStress.handleEvent("commander:lock", {
    actor: "player",
    commanderId: "nomad",
    target: { zone: "board", side: "ai", index: iteration % 5 },
    status: iteration % 2 ? "active" : "pending"
  });
  commanderStress.update(1 / 60);
}
commanderDebug = commanderStress._debug();
assert.ok(commanderDebug.jobs <= 72, "commander timeline stress keeps the global job cap");
assert.ok(commanderDebug.peakJobs <= 72);
assert.ok(commanderDebug.particles <= 420, "commander burst stress keeps the fixed particle pool");
assert.ok(commanderDebug.peakParticles <= 420);
advanceFX(commanderStress, 3);
assert.equal(commanderStress.hasActiveVisuals(), false);
commanderStress.destroy();

// Match events arrive synchronously in this exact rules-engine order. Each
// semantic beat must create only one presentation job, and finale waits behind
// lethal contact/death instead of obscuring them.
const lethal = moduleApi.createFX({
  canvas: { width: 1200, height: 700 },
  getAnchor(role) {
    if (role && typeof role === "object") {
      return role.side === "player" ? { x: 280, y: 500 } : { x: 900, y: 210 };
    }
    return { x: 600, y: 350 };
  },
  reducedMotion: false
});
[
  ["turn:start", { actor: "player" }],
  ["attack:start", {
    actor: "player",
    attacker: { zone: "board", side: "player", index: 0 },
    target: { zone: "board", side: "ai", index: 0 }
  }],
  ["minion:damage", {
    amount: 7,
    target: { zone: "board", side: "ai", index: 0 },
    source: { side: "player", op: "attack" }
  }],
  ["attack:hit", {
    actor: "player",
    target: { zone: "board", side: "ai", index: 0 }
  }],
  ["minion:death", {
    side: "ai",
    index: 0,
    target: { zone: "board", side: "ai", index: 0 }
  }],
  ["game:end", { winner: "player", reason: "combat" }]
].forEach(([type, detail]) => lethal.handleEvent(type, detail));
const lethalDebug = lethal._debug();
["banner", "impact", "number", "finale"].forEach((kind) => {
  assert.equal(
    lethalDebug.jobKinds.filter((candidate) => candidate === kind).length,
    1,
    `actual lethal sequence creates exactly one ${kind} job`
  );
});
const finaleTimeline = lethalDebug.timelines.find((job) => job.kind === "finale");
assert.ok(finaleTimeline.age <= -0.85, "finale atmosphere is delayed at least 850ms");
assert.equal(finaleTimeline.layer, 0, "finale atmosphere stays in the underlay layer");
assert.ok(
  finaleTimeline.duration >= 0.8 && finaleTimeline.duration <= 1.2,
  "victory/defeat choreography completes in the requested 0.8–1.2s window"
);
assert.equal(finaleTimeline.finaleWon, true, "victory choreography retains winner semantics");
const lethalResidue = lethalDebug.timelines.find((job) => job.kind === "death-residue");
assert.ok(lethalResidue, "lethal death leaves a dedicated residue timeline");
assert.equal(lethalResidue.duration, 1.34, "death residue persists after the primary collapse beat");
assert.equal(lethalResidue.layer, 0, "death residue stays beneath labels and contact feedback");
const finaleOnlyContext = makeContext();
const finaleOnly = moduleApi.createFX({
  canvas: { width: 1200, height: 700 },
  getAnchor() { return { x: 600, y: 350 }; },
  reducedMotion: false
});
finaleOnly.handleEvent("game:end", { winner: "player" });
for (let frame = 0; frame < 18; frame += 1) {
  finaleOnly.update(0.05);
  finaleOnly.render(finaleOnlyContext);
}
assert.equal(finaleOnlyContext.calls.fillText || 0, 0, "FX finale owns no result text");
assert.equal(finaleOnlyContext.calls.strokeText || 0, 0, "FX finale owns no result title outline");
for (let frame = 0; frame < 26; frame += 1) finaleOnly.update(0.05);
assert.equal(finaleOnly._debug().jobs, 0, "victory choreography job ends within delay + 1.2s");
assert.equal(finaleOnly._debug().particles, 0, "victory confetti does not outlive the 1.2s choreography");
lethal.destroy();
finaleOnly.destroy();

// Defeat uses the same concise choreography budget but a materially distinct
// descending curtain/crack treatment, still without result copy ownership.
const defeatContext = makeContext();
const defeatOnly = moduleApi.createFX({
  canvas: { width: 1200, height: 700 },
  getAnchor() { return { x: 600, y: 350 }; },
  reducedMotion: false
});
defeatOnly.handleEvent("game:end", { winner: "ai" });
let defeatTimeline = defeatOnly._debug().timelines.find((job) => job.kind === "finale");
assert.equal(defeatTimeline.duration, 1.12);
assert.equal(defeatTimeline.finaleWon, false);
for (let frame = 0; frame < 23; frame += 1) defeatOnly.update(0.05);
defeatOnly.render(defeatContext);
assert.ok(
  (defeatContext.calls.createLinearGradient || 0) >= 1,
  "defeat choreography renders a descending procedural curtain"
);
assert.equal(defeatContext.calls.fillText || 0, 0, "defeat FX does not duplicate result text");
for (let frame = 0; frame < 22; frame += 1) defeatOnly.update(0.05);
assert.equal(defeatOnly._debug().jobs, 0, "defeat choreography job ends within delay + 1.2s");
assert.equal(defeatOnly._debug().particles, 0, "defeat residue does not outlive the choreography");
defeatOnly.destroy();

// Residue geometry is deterministic for a resolved board anchor and renders
// both the flattened stain and ascending wisps without an external texture.
const residueContext = makeContext();
const residueFx = moduleApi.createFX({
  canvas: { width: 1200, height: 700 },
  getAnchor() { return { x: 411, y: 287 }; },
  reducedMotion: false
});
residueFx.handleEvent("minion:death", { name: "하후돈" });
let residueTimeline = residueFx._debug().timelines.find((job) => job.kind === "death-residue");
assert.equal(residueTimeline.x, 411);
assert.equal(residueTimeline.y, 287);
for (let frame = 0; frame < 14; frame += 1) residueFx.update(0.05);
residueFx.render(residueContext);
assert.ok((residueContext.calls.ellipse || 0) >= 1, "death renders flattened residue/contact geometry");
assert.ok((residueContext.calls.quadraticCurveTo || 0) >= 3, "death renders multiple procedural wisps");
residueFx.destroy();

// Guard-blocked invalid actions use the legal guard anchor and never show the
// generic invalid-action toast animation.
let guardedAnchor = null;
const guardFeedback = moduleApi.createFX({
  canvas: { width: 1200, height: 700 },
  getAnchor(role) {
    if (role && typeof role === "object") guardedAnchor = role;
    return { x: 910, y: 220 };
  },
  reducedMotion: false
});
guardFeedback.handleEvent("action:invalid", {
  blockedByGuard: true,
  target: { zone: "hero", side: "ai" },
  guardTargets: [{ zone: "board", side: "ai", index: 2 }]
});
assert.equal(guardFeedback._debug().jobKinds.filter((kind) => kind === "guard").length, 1);
assert.equal(guardFeedback._debug().jobKinds.filter((kind) => kind === "invalid").length, 0);
assert.equal(guardedAnchor.index, 2, "first legal guard target supplies the feedback anchor");
guardFeedback.destroy();

// Parent/child effect publications are coalesced for 100ms by source+op.
// Explicitly different board target indices remain distinct.
const coalesced = moduleApi.createFX({
  canvas: { width: 1200, height: 700 },
  getAnchor() { return { x: 600, y: 350 }; },
  reducedMotion: false
});
for (let index = 0; index < 3; index += 1) {
  coalesced.handleEvent("effect:trigger", {
    source: "strategist-1",
    op: "summon_token",
    summoned: { instanceId: "token-" + index }
  });
}
assert.equal(coalesced._debug().jobKinds.filter((kind) => kind === "effect").length, 1);
coalesced.handleEvent("effect:trigger", {
  source: "strategist-1",
  op: "summon_token",
  target: { zone: "board", side: "player", index: 0 }
});
coalesced.handleEvent("effect:trigger", {
  source: "strategist-1",
  op: "summon_token",
  target: { zone: "board", side: "player", index: 1 }
});
assert.equal(
  coalesced._debug().jobKinds.filter((kind) => kind === "effect").length,
  3,
  "different concrete target indices retain separate effects"
);
coalesced.handleEvent("effect:trigger", {
  source: "strategist-1",
  op: "summon_token",
  target: { zone: "board", side: "player", index: 1 }
});
assert.equal(coalesced._debug().jobKinds.filter((kind) => kind === "effect").length, 3);
for (let frame = 0; frame < 3; frame += 1) coalesced.update(0.05);
coalesced.handleEvent("effect:trigger", { source: "strategist-1", op: "summon_token" });
assert.equal(
  coalesced._debug().jobKinds.filter((kind) => kind === "effect").length,
  4,
  "same effect may present again after the 100ms coalescing window"
);
coalesced.destroy();

// Friendly semantic effects stay with their owner even if an enemy target is
// present in the publication payload. Labels only drift a short distance.
const ownerAnchors = moduleApi.createFX({
  canvas: { width: 1200, height: 700 },
  getAnchor(role, detail) {
    if (role === "hero") {
      return detail.side === "ai" ? { x: 1080, y: 90 } : { x: 120, y: 610 };
    }
    if (role === "card") {
      return detail.side === "ai" ? { x: 760, y: 110 } : { x: 440, y: 650 };
    }
    if (role === "buffer-1") return { x: 360, y: 500 };
    if (role && typeof role === "object" && role.side === "ai") {
      return { x: 960, y: 180 };
    }
    return null;
  },
  reducedMotion: false
});
[
  {
    detail: {
      actor: "player",
      op: "heal_friendly_hero",
      amount: 2,
      target: { zone: "board", side: "ai", index: 0 }
    },
    role: "hero",
    side: "player",
    x: 120,
    y: 610
  },
  {
    detail: {
      actor: "player",
      op: "draw",
      amount: 2,
      target: { zone: "board", side: "ai", index: 0 }
    },
    role: "card",
    side: "player",
    x: 440,
    y: 650
  },
  {
    detail: {
      actor: "ai",
      op: "draw",
      amount: 1,
      target: { zone: "board", side: "player", index: 0 }
    },
    role: "hero",
    side: "ai",
    x: 1080,
    y: 90
  },
  {
    detail: {
      actor: "ai",
      op: "gain_armor",
      amount: 2,
      target: { zone: "hero", side: "player" }
    },
    role: "hero",
    side: "ai",
    x: 1080,
    y: 90
  },
  {
    detail: {
      actor: "player",
      source: "buffer-1",
      op: "buff_friendly_board",
      amount: 1,
      target: { zone: "board", side: "ai", index: 1 }
    },
    role: "minion",
    side: "player",
    x: 360,
    y: 500
  }
].forEach((scenario, index) => {
  ownerAnchors.handleEvent("effect:trigger", scenario.detail);
  const timeline = ownerAnchors._debug().timelines.at(-1);
  assert.equal(timeline.anchorRole, scenario.role, `owner scenario ${index} uses ${scenario.role}`);
  assert.equal(timeline.anchorSide, scenario.side, `owner scenario ${index} keeps actor side`);
  assert.equal(timeline.x, scenario.x, `owner scenario ${index} ignores enemy field x`);
  assert.equal(timeline.y, scenario.y, `owner scenario ${index} ignores enemy field y`);
  assert.ok(timeline.labelTravel <= 36, `owner scenario ${index} label travel stays restrained`);
});
assert.equal(
  ownerAnchors._debug().timelines[3].label,
  "방어도",
  "gain_armor receives an explicit armor label"
);
ownerAnchors.destroy();

// Result-aware effects expose the exact outcome at its semantic target while
// legacy payloads continue through the existing vocabulary path.
const resultFX = moduleApi.createFX({
  canvas: { width: 1200, height: 700 },
  getAnchor(role, detail) {
    if (role && typeof role === "object") {
      if (role.instanceId === "discount-1") return { x: 430, y: 640 };
      if (role.zone === "hero") {
        return role.side === "ai" ? { x: 600, y: 90 } : { x: 600, y: 610 };
      }
      if (role.zone === "board") {
        return { x: role.index === 1 ? 820 : role.index === 2 ? 940 : 300, y: 260 };
      }
    }
    if (role === "source-fizzle") return { x: 330, y: 480 };
    if (role === "hero") {
      return detail.side === "ai" ? { x: 600, y: 90 } : { x: 600, y: 610 };
    }
    if (role === "card") return { x: 430, y: 640 };
    if (role === "minion") return { x: 330, y: detail.side === "ai" ? 260 : 480 };
    return null;
  },
  reducedMotion: false
});
resultFX.handleEvent("effect:trigger", {
  actor: "player",
  source: "source-fizzle",
  op: "ready_random_friendly",
  result: { success: false, fizzled: true, reason: "target_missing" }
});
let resultTimeline = resultFX._debug().timelines.at(-1);
assert.equal(resultTimeline.label, "불발");
assert.equal(resultTimeline.x, 330, "fizzle collapses at the source instance anchor");
assert.equal(resultTimeline.y, 480);
assert.equal(resultTimeline.fizzled, true);
assert.equal(resultTimeline.duration, 0.46, "fizzle uses a short collapse timeline");
assert.equal(resultTimeline.labelTravel, 24, "result labels retain the 24px travel contract");
assert.equal(resultTimeline.labelColor, "#d8d0c2", "fizzle label uses high-contrast warm white");
for (let frame = 0; frame < 11; frame += 1) resultFX.update(0.01);
resultTimeline = resultFX._debug().timelines.at(-1);
assert.ok(resultTimeline.labelAlpha >= 0.85, "fizzle label is readable at 110ms");
for (let frame = 0; frame < 11; frame += 1) resultFX.update(0.01);
resultTimeline = resultFX._debug().timelines.at(-1);
assert.ok(resultTimeline.labelAlpha >= 0.85, "fizzle label holds at 220ms");
for (let frame = 0; frame < 10; frame += 1) resultFX.update(0.01);
resultTimeline = resultFX._debug().timelines.at(-1);
assert.ok(resultTimeline.labelAlpha >= 0.85, "fizzle label holds through 320ms");
for (let frame = 0; frame < 14; frame += 1) resultFX.update(0.01);
assert.equal(resultFX._debug().jobs, 0, "fizzle label and collapse are removed at 460ms");

// The real rules payload identifies an on-play source by instanceId, while the
// board UI resolves board anchors by side/index only. The card:play event must
// bridge those shapes, even though the new hit-map appears one render later.
let integratedBoardReady = false;
const integratedFizzle = moduleApi.createFX({
  canvas: { width: 1200, height: 700 },
  getAnchor(role, detail) {
    if (role && typeof role === "object") {
      if (role.zone === "board" && role.side === "player" && role.index === 4) {
        return integratedBoardReady ? { x: 1040, y: 505 } : { x: 600, y: 350 };
      }
      if (role.zone === "board" && role.side === "ai") return { x: 600, y: 215 };
      return { x: 600, y: 350 };
    }
    if (role === "minion") {
      return integratedBoardReady && detail.side === "player" && detail.index === 4 ?
        { x: 1040, y: 505 } : { x: 600, y: 350 };
    }
    if (role === "hero") {
      return detail.side === "ai" ? { x: 600, y: 80 } : { x: 600, y: 625 };
    }
    return { x: 600, y: 350 };
  },
  reducedMotion: false
});
integratedFizzle.handleEvent("card:play", {
  actor: "player",
  side: "player",
  boardIndex: 4,
  index: 4,
  instanceId: "lv-meng-instance",
  minion: { zone: "board", side: "player", index: 4 },
  card: { id: "lv-meng", instanceId: "lv-meng-instance", name: "여몽" }
});
integratedFizzle.handleEvent("effect:trigger", {
  actor: "player",
  side: "player",
  source: "lv-meng-instance",
  sourceCard: { id: "lv-meng", instanceId: "lv-meng-instance", name: "여몽" },
  target: { zone: "board", side: "ai", index: 1 },
  op: "ready_random_friendly",
  result: {
    success: false,
    fizzled: true,
    reason: "target_missing",
    affectedTargets: []
  }
});
let integratedTimeline = integratedFizzle._debug().timelines.at(-1);
assert.ok(integratedTimeline.y > 350, "stale hit-map falls back to the player owner side");
assert.notDeepEqual(
  { x: integratedTimeline.x, y: integratedTimeline.y },
  { x: 600, y: 215 },
  "fizzle never reuses the enemy target anchor"
);
assert.equal(integratedTimeline.sourceBoardIndex, 4, "card:play bridges source instance to board index");
assert.equal(integratedTimeline.sourceAnchorResolved, false, "stale center is not accepted as source");
integratedBoardReady = true;
integratedFizzle.render(makeContext());
integratedTimeline = integratedFizzle._debug().timelines.at(-1);
assert.equal(integratedTimeline.x, 1040, "fizzle refreshes onto the newly rendered source card");
assert.equal(integratedTimeline.y, 505);
assert.equal(integratedTimeline.sourceAnchorResolved, true);
integratedFizzle.destroy();

const actualCases = [
  ["heal_friendly_hero", 5, { actualHealing: 2 }, "회복", 2],
  ["gain_armor", 5, { actualArmorGained: 3 }, "방어도", 3],
  ["draw", 2, { actualDrawCount: 1 }, "패 보충", 1],
  ["summon_token", 2, { actualSummonCount: 1 }, "원군", 1]
];
actualCases.forEach(([op, requested, actual, label, amount], index) => {
  resultFX.handleEvent("effect:trigger", {
    actor: "player",
    source: `actual-${index}`,
    op,
    amount: requested,
    result: { success: true, fizzled: false, ...actual }
  });
  const timeline = resultFX._debug().timelines.at(-1);
  assert.equal(timeline.label, label, `${op} keeps its semantic label`);
  assert.equal(timeline.amount, amount, `${op} displays the actual result amount`);
  assert.equal(timeline.showAmount, true, `${op} shows zero-safe actual quantity`);
});

resultFX.handleEvent("effect:trigger", {
  actor: "player",
  source: "discount-source",
  op: "reduce_random_hand_cost",
  amount: 3,
  target: { zone: "hand", side: "player", instanceId: "discount-1" },
  result: {
    success: true,
    fizzled: false,
    discountedTarget: {
      id: "qun_lu_bu",
      instanceId: "discount-1",
      costBefore: 9,
      costAfter: 6
    }
  }
});
resultTimeline = resultFX._debug().timelines.at(-1);
assert.equal(resultTimeline.label, "비용 -3");
assert.equal(resultTimeline.anchorRole, "hand-target");
assert.equal(resultTimeline.x, 430, "discount label follows the affected hand instance");
assert.equal(resultTimeline.y, 640);

resultFX.handleEvent("effect:trigger", {
  actor: "player",
  source: "ready-source",
  op: "ready_random_friendly",
  target: { zone: "board", side: "player", index: 2 },
  result: {
    success: true,
    fizzled: false,
    readiedTarget: { instanceId: "ready-1" }
  }
});
resultTimeline = resultFX._debug().timelines.at(-1);
assert.equal(resultTimeline.label, "재공격");
assert.equal(resultTimeline.anchorRole, "board-target");
assert.equal(resultTimeline.x, 940, "ready label follows the affected board index");

const beforeAffected = resultFX._debug().timelines.length;
resultFX.handleEvent("effect:trigger", {
  actor: "ai",
  source: "wide-buff",
  op: "buff_friendly_board",
  amount: 1,
  result: {
    success: true,
    fizzled: false,
    affectedTargets: [
      { zone: "board", side: "ai", index: 0 },
      { zone: "board", side: "ai", index: 1 },
      { zone: "board", side: "ai", index: 1 }
    ]
  }
});
const affectedJobs = resultFX._debug().timelines.slice(beforeAffected);
assert.equal(
  affectedJobs.filter((timeline) => timeline.accent).length,
  2,
  "affected targets receive one small simultaneous accent each"
);
assert.ok(
  affectedJobs.filter((timeline) => timeline.accent)
    .every((timeline) => !(timeline.x === 600 && timeline.y === 350)),
  "affected target accents never duplicate at global center"
);

const beforeBlocked = resultFX._debug().timelines.length;
resultFX.handleEvent("effect:trigger", {
  actor: "player",
  source: "shield-spell",
  op: "damage_target",
  amount: 2,
  target: { zone: "board", side: "ai", index: 0 },
  result: {
    success: true,
    fizzled: false,
    blockedByShield: true,
    actualDamage: 0
  }
});
let blockedJobs = resultFX._debug().timelines.slice(beforeBlocked);
assert.equal(blockedJobs.length, 1);
assert.equal(blockedJobs[0].kind, "shield");
assert.equal(blockedJobs[0].resultCue, true);
assert.equal(blockedJobs[0].x, 300, "blocked result is anchored to the shield target");
resultFX.handleEvent("minion:damage", {
  actor: "player",
  source: { instanceId: "shield-spell", op: "damage_target" },
  target: { zone: "board", side: "ai", index: 0 },
  amount: 0,
  blockedByShield: true,
  shieldBroken: true
});
blockedJobs = resultFX._debug().timelines.slice(beforeBlocked);
assert.equal(blockedJobs.length, 1, "follow-up shield damage does not duplicate result feedback");
resultFX.destroy();

// Damage numbers retain anticipation/contact/settle but fully disappear
// 550-650ms after their contact point.
const numberLifetime = moduleApi.createFX({
  canvas: { width: 1200, height: 700 },
  getAnchor() { return { x: 600, y: 350 }; },
  reducedMotion: false
});
numberLifetime.handleEvent("minion:damage", {
  amount: 5,
  target: { zone: "board", side: "ai", index: 0 },
  source: { side: "player", op: "attack" }
});
let numberTimeline = numberLifetime._debug().timelines.find((job) => job.kind === "number");
assert.ok(numberTimeline.age < 0, "combat number still waits for contact");
assert.ok(
  numberTimeline.duration >= 0.55 && numberTimeline.duration <= 0.65,
  "contact-relative number lifetime is 550-650ms"
);
for (let frame = 0; frame < 8; frame += 1) numberLifetime.update(0.05);
numberTimeline = numberLifetime._debug().timelines.find((job) => job.kind === "number");
assert.ok(numberTimeline && numberTimeline.age >= 0, "damage number appears at contact");
for (let frame = 0; frame < 11; frame += 1) numberLifetime.update(0.05);
assert.ok(
  numberLifetime._debug().jobKinds.includes("number"),
  "damage number remains visible through its settle beat"
);
numberLifetime.update(0.04);
assert.ok(
  !numberLifetime._debug().jobKinds.includes("number"),
  "damage number is fully removed by 650ms after contact"
);
numberLifetime.destroy();

// Ability families keep a stable visual vocabulary and readable Korean labels.
const vocabulary = moduleApi.createFX({
  canvas: { width: 1200, height: 700 },
  getAnchor() { return { x: 600, y: 350 }; },
  reducedMotion: false
});
[
  ["heal_friendly_hero", "heal", "회복"],
  ["draw", "draw", "패 보충"],
  ["buff_all_allies", "buff", "강화"],
  ["damage_all_enemies", "damage", "피해"],
  ["poison_target", "poison", "독"],
  ["summon_token", "summon", "원군"],
  ["copy_enemy", "strategy", "계략"]
].forEach(([op, family, label]) => {
  vocabulary.handleEvent("effect:trigger", { op, amount: 2 });
  const timeline = vocabulary._debug().timelines.at(-1);
  assert.equal(timeline.family, family, `${op} receives ${family} visual family`);
  assert.equal(timeline.label, label, `${op} receives a concise localized label`);
});
vocabulary.handleEvent("target:selected", { side: "ai", target: { zone: "hero", side: "ai" } });
vocabulary.handleEvent("guard:block", { side: "ai", target: { zone: "board", side: "ai", index: 0 } });
assert.ok(vocabulary._debug().jobKinds.includes("target"), "target telegraph contract is supported");
assert.ok(vocabulary._debug().jobKinds.includes("guard"), "guard feedback contract is supported");
vocabulary.destroy();

const anchors = {
  attacker: { x: 280, y: 540, width: 100, height: 120 },
  target: { x: 920, y: 180, width: 100, height: 120 },
  minion: { cx: 640, cy: 390 },
  hero: [680, 680],
  card: { x: 510, y: 630 }
};
const ctx = makeContext();
const fx = moduleApi.createFX({
  canvas: { width: 1365, height: 768 },
  getAnchor(role) {
    if (typeof role === "string") return anchors[role] || null;
    return null;
  },
  reducedMotion: false
});

const events = [
  ["game:start", {}],
  ["turn:start", { side: "player" }],
  ["card:draw", { side: "player" }],
  ["card:play", { instanceId: "c1" }],
  ["attack:start", { attacker: { zone: "board", side: "player", index: 0 }, target: { zone: "board", side: "ai", index: 0 } }],
  ["attack:hit", { target: { zone: "board", side: "ai", index: 0 } }],
  ["minion:damage", { amount: 4, shieldBroken: true }],
  ["hero:damage", { amount: 7 }],
  ["shield:break", {}],
  ["effect:trigger", { op: "draw" }],
  ["effect:trigger", { op: "heal_friendly_hero", amount: 3 }],
  ["minion:death", {}],
  ["action:invalid", { reason: "마나가 부족합니다" }],
  ["game:end", { winner: "player" }]
];
for (const event of events) fx.handleEvent(event[0], event[1]);

for (let frame = 0; frame < 900; frame += 1) {
  fx.update(frame % 23 === 0 ? 16.666 : 1 / 60);
  fx.render(ctx);
}
assert.ok((ctx.calls.fill || 0) > 0, "procedural shapes rendered");
assert.ok((ctx.calls.fillText || 0) > 0, "feedback text rendered");
assert.equal(ctx.calls.save, ctx.calls.restore, "render preserves Canvas2D state");
assert.equal(fx._debug().particles, 0, "particles expire");
assert.equal(fx._debug().jobs, 0, "timeline jobs expire");

// Formation, faction links, signature generals, and persistent statuses own
// short semantic cues. They resolve through the supplied runtime anchors and
// remain visually distinct without replaying the generic effect animation.
function tacticalAnchor(reference, detail) {
  if (reference && typeof reference === "object" && reference.zone === "hero") {
    return { x: 600, y: reference.side === "ai" ? 90 : 610 };
  }
  if (reference && typeof reference === "object" && reference.zone === "board") {
    return {
      x: 250 + (Number.isInteger(reference.index) ? reference.index : 0) * 95,
      y: reference.side === "ai" ? 220 : 480
    };
  }
  if (typeof reference === "string" && /guan|source/.test(reference)) {
    return { x: 330, y: 480 };
  }
  const side = detail && (detail.side || detail.actor);
  return { x: 600, y: side === "ai" ? 220 : 480 };
}

const tacticalFx = moduleApi.createFX({
  canvas: { width: 1200, height: 700 },
  getAnchor: tacticalAnchor,
  reducedMotion: false
});
const tacticalEvents = [
  ["formation:place", {
    actor: "player", side: "player",
    target: { zone: "board", side: "player", index: 1 },
    placement: { row: "rear", slot: 2 }
  }],
  ["formation:block", {
    actor: "player",
    target: { zone: "board", side: "ai", index: 2 },
    frontTargets: [{ zone: "board", side: "ai", index: 0 }]
  }],
  ["faction:link", {
    actor: "player", side: "player", source: "source-brotherhood",
    linkKind: "brotherhood", linkName: "의형제"
  }],
  ["faction:link", {
    actor: "player", side: "player", source: "source-strategy",
    linkKind: "strategy", linkName: "군략"
  }],
  ["faction:link", {
    actor: "player", side: "player", source: "source-kindle",
    linkKind: "kindle", linkName: "연화"
  }],
  ["faction:link", {
    actor: "player", side: "player", source: "source-raid",
    linkKind: "raid", linkName: "약탈"
  }],
  ["duel:start", {
    actor: "player",
    source: { zone: "board", side: "player", index: 0 },
    target: { zone: "board", side: "ai", index: 1 }
  }],
  ["duel:hit", {
    actor: "player", targetDied: true,
    source: { zone: "board", side: "player", index: 0 },
    target: { zone: "board", side: "ai", index: 1 }
  }],
  ["discord:start", {
    actor: "player", weakestName: "약한 선동병", strongestName: "강한 친위대",
    source: { zone: "board", side: "ai", index: 0 },
    target: { zone: "board", side: "ai", index: 1 }
  }],
  ["discord:hit", {
    actor: "player", weakestDied: true, strongestDied: false,
    source: { zone: "board", side: "ai", index: 0 },
    target: { zone: "board", side: "ai", index: 1 }
  }],
  ["status:burn", {
    actor: "player", phase: "applied", amount: 1,
    target: { zone: "board", side: "ai", index: 0 }
  }],
  ["status:counter", {
    actor: "player", phase: "released", amount: 2,
    target: { zone: "board", side: "ai", index: 1 }
  }],
  ["status:intimidate", {
    actor: "player", amount: 1,
    target: { zone: "board", side: "ai", index: 0 }
  }],
  ["status:empty-fort", {
    actor: "player", side: "player", phase: "armed",
    target: { zone: "hero", side: "player" }
  }],
  ["status:raid", {
    actor: "player", phase: "pending",
    target: { zone: "board", side: "ai", index: 2 }
  }]
];
tacticalEvents.forEach(([type, detail]) => tacticalFx.handleEvent(type, detail));
let tacticalDebug = tacticalFx._debug();
const expectedTacticalKinds = [
  "formation-place", "formation-block", "faction-link", "duel-start", "duel-hit",
  "status-burn", "status-counter", "status-intimidate", "status-empty-fort", "status-raid"
];
expectedTacticalKinds.forEach((kind) => {
  assert.ok(tacticalDebug.jobKinds.includes(kind), `${kind} owns a semantic timeline`);
});
assert.ok(
  tacticalDebug.timelines.every((timeline) => timeline.duration > 0 && timeline.duration <= 0.8),
  "every new tactical cue stays within the 0.8 second contract"
);
const placementCue = tacticalDebug.timelines.find((timeline) => timeline.kind === "formation-place");
assert.equal(placementCue.x, 345);
assert.equal(placementCue.y, 480);
assert.equal(placementCue.row, "rear");
assert.equal(placementCue.slot, 2);
assert.equal(placementCue.signature, "formation:rear:place");
assert.equal(
  JSON.stringify(tacticalDebug.timelines
    .filter((timeline) => timeline.kind === "faction-link")
    .map((timeline) => timeline.linkKind)),
  JSON.stringify(["brotherhood", "strategy", "kindle", "raid"]),
  "four faction links keep distinct semantic signatures"
);
assert.ok(
  tacticalDebug.timelines.some((timeline) => timeline.signature === "discord:crossed-orders"),
  "반간계 begins with its own crossed-orders signature"
);
assert.ok(
  tacticalDebug.timelines.some((timeline) => timeline.signature === "discord:betrayal-hit"),
  "반간계 collision keeps a distinct verdict signature"
);

const beforeSemanticEffect = tacticalFx._debug().jobs;
tacticalFx.handleEvent("effect:trigger", {
  actor: "player", source: "semantic-duel", op: "duel_target",
  result: { success: true, fizzled: false }
});
assert.equal(tacticalFx._debug().jobs, beforeSemanticEffect,
  "successful signature ops defer to their semantic event instead of doubling visuals");
tacticalFx.handleEvent("effect:trigger", {
  actor: "player", source: "semantic-discord", op: "sow_discord",
  result: { success: true, fizzled: false }
});
assert.equal(tacticalFx._debug().jobs, beforeSemanticEffect,
  "successful 반간계 defers to discord events instead of doubling visuals");
tacticalFx.handleEvent("effect:trigger", {
  actor: "player", source: "failed-duel", op: "duel_target",
  result: { success: false, fizzled: true }
});
assert.equal(tacticalFx._debug().timelines.at(-1).kind, "effect",
  "failed signature ops retain the readable generic fizzle cue");

const tacticalContext = makeContext();
advanceFX(tacticalFx, 0.18);
tacticalFx.render(tacticalContext);
assert.ok((tacticalContext.calls.stroke || 0) >= 45,
  "tactical contact frame has distinct formation, link, duel, and status line work");
assert.ok((tacticalContext.calls.fill || 0) >= 12,
  "tactical contact frame includes readable fire, seals, and labels");
assert.equal(tacticalContext.samples.nonFiniteArguments, 0);
assert.equal(tacticalContext.calls.save, tacticalContext.calls.restore);
assert.ok(tacticalFx._debug().particles <= 420);
advanceFX(tacticalFx, 1.1);
assert.equal(tacticalFx.hasActiveVisuals(), false,
  "all tactical timelines and their short particle tails fully expire");
tacticalFx.destroy();

const reducedTacticalContext = makeContext();
const reducedTactical = moduleApi.createFX({
  canvas: { width: 1200, height: 700 },
  getAnchor: tacticalAnchor,
  reducedMotion: true
});
tacticalEvents.forEach(([type, detail]) => reducedTactical.handleEvent(type, detail));
assert.ok(
  reducedTactical._debug().timelines.every((timeline) => timeline.duration <= 0.35),
  "reduced motion abbreviates every tactical timeline"
);
advanceFX(reducedTactical, 0.08);
reducedTactical.render(reducedTacticalContext);
assert.equal(reducedTactical._debug().shake.x, 0);
assert.equal(reducedTactical._debug().shake.y, 0);
assert.ok(reducedTactical._debug().particles <= 24);
assert.equal(reducedTacticalContext.samples.nonFiniteArguments, 0);
assert.equal(reducedTacticalContext.calls.save, reducedTacticalContext.calls.restore);
advanceFX(reducedTactical, 0.9);
assert.equal(reducedTactical.hasActiveVisuals(), false);
reducedTactical.destroy();

// Stress many full matches: fixed pool and capped timelines may never grow.
for (let turn = 0; turn < 1200; turn += 1) {
  fx.handleEvent("card:play", { instanceId: "stress-" + turn });
  fx.handleEvent("attack:hit", { amount: turn % 9 });
  fx.handleEvent("minion:damage", { amount: 3 });
  if (turn % 8 === 0) fx.handleEvent("minion:death", {});
  fx.update(1 / 60);
}
let debug = fx._debug();
assert.ok(debug.particles <= debug.capacity, "particle pool remains bounded");
assert.ok(debug.jobs <= 72, "timeline remains bounded");
for (let frame = 0; frame < 300; frame += 1) fx.update(1 / 30);
assert.equal(fx._debug().particles, 0, "stress particles are reclaimed");
assert.equal(fx._debug().jobs, 0, "stress jobs are reclaimed");

// Reduced motion uses abbreviated timelines and never shakes.
const reduced = moduleApi.createFX({
  canvas: { width: 900, height: 600 },
  getAnchor() { return { x: 450, y: 300 }; },
  reducedMotion: true
});
reduced.handleEvent("card:play", {});
reduced.handleEvent("game:end", { winner: "player" });
reduced.shake(12);
reduced.update(1 / 60);
debug = reduced._debug();
assert.equal(debug.reducedMotion, true);
assert.equal(debug.shake.x, 0);
assert.equal(debug.shake.y, 0);
assert.ok(debug.particles < 80, "reduced motion substantially limits particles");
for (let frame = 0; frame < 45; frame += 1) reduced.update(1 / 30);
assert.equal(reduced._debug().jobs, 0, "reduced timelines finish quickly");
const reducedContactContext = makeContext();
reduced.handleEvent("attack:hit", {
  actor: "player",
  attacker: { zone: "board", side: "player", index: 0 },
  target: { zone: "board", side: "ai", index: 0 }
});
advanceFX(reduced, 0.12);
reduced.render(reducedContactContext);
assert.ok((reducedContactContext.calls.stroke || 0) >= 5,
  "reduced-motion contact keeps a short ring and directional slash");
assert.ok(reduced._debug().particles <= 24,
  "reduced-motion contact remains inside its stricter particle budget");
assert.equal(reduced._debug().shake.x, 0);
assert.equal(reduced._debug().shake.y, 0);
assert.equal(reducedContactContext.samples.nonFiniteArguments, 0,
  "reduced-motion contact sends only finite canvas values");
assert.equal(reducedContactContext.calls.save, reducedContactContext.calls.restore,
  "reduced-motion contact balances canvas state");
advanceFX(reduced, 1.1);
assert.equal(reduced.hasActiveVisuals(), false,
  "reduced-motion contact and its shortened particle tail return to idle");

fx.destroy();
fx.handleEvent("card:play", {});
fx.update(1);
fx.render(ctx);
assert.equal(fx._debug().destroyed, true);
assert.equal(fx._debug().particles, 0);
assert.equal(fx._debug().jobs, 0);
reduced.destroy();

// Media-query listeners are observed and released.
let addedListener = null;
let removedListener = null;
const media = {
  matches: false,
  addEventListener(type, listener) {
    assert.equal(type, "change");
    addedListener = listener;
  },
  removeEventListener(type, listener) {
    assert.equal(type, "change");
    removedListener = listener;
  }
};
const mediaModule = loadModule({ matchMedia() { return media; } });
const dynamic = mediaModule.createFX({
  canvas: { width: 800, height: 500 },
  getAnchor() { return { x: 400, y: 250 }; }
});
assert.equal(typeof addedListener, "function");
dynamic.handleEvent("attack:hit", {});
dynamic.handleEvent("card:play", {});
for (let frame = 0; frame < 9; frame += 1) dynamic.update(0.05);
assert.ok(dynamic._debug().particles > 24, "full motion may use a richer impact burst");
media.matches = true;
addedListener();
dynamic.update(1 / 60);
assert.equal(dynamic._debug().reducedMotion, true);
assert.ok(dynamic._debug().particles <= 24, "enabling reduced motion collapses an in-flight particle burst");
assert.ok(
  dynamic._debug().timelines.every((job) => job.duration <= 0.35 && job.age >= 0),
  "enabling reduced motion collapses active timeline travel immediately"
);
assert.equal(dynamic._debug().shake.x, 0);
assert.equal(dynamic._debug().shake.y, 0);
dynamic.destroy();
assert.equal(removedListener, addedListener, "media listener is removed on destroy");

console.log("fx-animation: all syntax, event, render, reduced-motion, and lifetime checks passed");
