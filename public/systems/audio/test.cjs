"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");

class MockAudioParam {
  constructor(value) {
    this.value = value == null ? 0 : value;
    this.events = [];
  }

  setValueAtTime(value, time) {
    this.value = value;
    this.events.push(["set", value, time]);
  }

  linearRampToValueAtTime(value, time) {
    this.value = value;
    this.events.push(["linear", value, time]);
  }

  exponentialRampToValueAtTime(value, time) {
    this.value = value;
    this.events.push(["exponential", value, time]);
  }

  setValueCurveAtTime(values, time, duration) {
    this.value = values[values.length - 1];
    this.events.push(["curve", values.length, time, duration]);
  }

  cancelScheduledValues(time) {
    this.events.push(["cancel", time]);
  }
}

class MockNode {
  constructor(context, kind) {
    this.context = context;
    this.kind = kind;
    this.connections = [];
    this.disconnected = false;
    context.nodes.push(this);
  }

  connect(destination) {
    this.connections.push(destination);
    return destination;
  }

  disconnect() {
    this.disconnected = true;
  }
}

class MockScheduledNode extends MockNode {
  constructor(context, kind) {
    super(context, kind);
    this.starts = [];
    this.stops = [];
  }

  start(...args) {
    this.starts.push(args);
  }

  stop(...args) {
    this.stops.push(args);
  }
}

class MockAudioContext {
  constructor(options) {
    this.options = options;
    this.state = "suspended";
    this.currentTime = 1;
    this.sampleRate = 24000;
    this.nodes = [];
    this.destination = new MockNode(this, "destination");
    this.closed = false;
    MockAudioContext.instances.push(this);
  }

  createGain() {
    const node = new MockNode(this, "gain");
    node.gain = new MockAudioParam(1);
    return node;
  }

  createDynamicsCompressor() {
    const node = new MockNode(this, "compressor");
    node.threshold = new MockAudioParam();
    node.knee = new MockAudioParam();
    node.ratio = new MockAudioParam();
    node.attack = new MockAudioParam();
    node.release = new MockAudioParam();
    return node;
  }

  createOscillator() {
    const node = new MockScheduledNode(this, "oscillator");
    node.frequency = new MockAudioParam(440);
    node.detune = new MockAudioParam();
    node.type = "sine";
    return node;
  }

  createBufferSource() {
    const node = new MockScheduledNode(this, "buffer-source");
    node.playbackRate = new MockAudioParam(1);
    node.buffer = null;
    return node;
  }

  createBiquadFilter() {
    const node = new MockNode(this, "filter");
    node.frequency = new MockAudioParam(350);
    node.Q = new MockAudioParam(1);
    node.type = "lowpass";
    return node;
  }

  createStereoPanner() {
    const node = new MockNode(this, "panner");
    node.pan = new MockAudioParam(0);
    return node;
  }

  createBuffer(channels, length, sampleRate) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return {
      duration: length / sampleRate,
      getChannelData(index) {
        return data[index];
      },
    };
  }

  resume() {
    this.state = "running";
    return Promise.resolve();
  }

  close() {
    this.state = "closed";
    this.closed = true;
    return Promise.resolve();
  }
}

MockAudioContext.instances = [];

function createMockDocument() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    fire(type, target) {
      const listener = listeners.get(type);
      if (listener) listener({ type, target });
    },
  };
}

async function main() {
  globalThis.TK = { modules: {} };
  require(path.join(__dirname, "index.js"));
  assert.equal(typeof globalThis.TK.modules.audio.createAudio, "function");

  const unsupported = globalThis.TK.modules.audio.createAudio({
    AudioContext: null,
    document: null,
  });
  assert.equal(await unsupported.unlock(), false);
  assert.equal(unsupported.play("click"), false);
  unsupported.handleEvent("game:end", { winner: "player" });
  unsupported.setMuted(true);
  assert.equal(unsupported.isMuted(), true);
  unsupported.destroy();

  const mockDocument = createMockDocument();
  const audio = globalThis.TK.modules.audio.createAudio({
    AudioContext: MockAudioContext,
    document: mockDocument,
    navigator: { maxTouchPoints: 5, userAgent: "Mobile Test" },
    muted: false,
  });

  assert.equal(audio._debug().contextState, "uninitialized");
  assert.equal(mockDocument.listeners.size, 3);
  mockDocument.fire("pointerdown");
  await audio.unlock();

  const context = MockAudioContext.instances.at(-1);
  assert.equal(context.state, "running");
  assert.equal(audio._debug().unlocked, true);
  assert.equal(audio._debug().hasMasterGain, true);
  assert.equal(audio._debug().hasCompressor, true);
  assert.equal(audio._debug().voiceLimit, 12);
  assert.equal(mockDocument.listeners.size, 1);
  assert.equal(mockDocument.listeners.has("click"), true);
  assert.ok(context.nodes.some((node) => node.kind === "compressor"));

  const normalizedParameterEvents = (parameter) =>
    parameter && Array.isArray(parameter.events)
      ? parameter.events.map((event) => [
          event[0],
          Number.isFinite(event[1]) ? Number(event[1].toFixed(4)) : event[1],
        ])
      : [];
  const synthesisFingerprint = (nodes) =>
    JSON.stringify(
      nodes
        .filter((node) =>
          ["oscillator", "buffer-source", "filter"].includes(node.kind),
        )
        .map((node) => ({
          kind: node.kind,
          type: node.type || "",
          frequency: normalizedParameterEvents(node.frequency),
          q: normalizedParameterEvents(node.Q),
          rate: normalizedParameterEvents(node.playbackRate),
          offset: Array.isArray(node.starts)
            ? node.starts.map((argumentsList) => [
                Number.isFinite(argumentsList[1])
                  ? Number(argumentsList[1].toFixed(4))
                  : null,
                Number.isFinite(argumentsList[2])
                  ? Number(argumentsList[2].toFixed(4))
                  : null,
              ])
            : [],
        })),
    );

  const names = [
    "hover",
    "click",
    "select",
    "draw",
    "play",
    "attack",
    "impact",
    "metal",
    "blunt",
    "wood",
    "cloth",
    "body",
    "damage",
    "hero-damage",
    "shield",
    "guard",
    "death",
    "turn",
    "victory",
    "defeat",
    "draw-finale",
    "effect",
    "effect-success",
    "effect-fizzle",
    "effect-shield",
    "effect-heal",
    "effect-armor",
    "effect-draw",
    "effect-summon",
    "effect-discount",
    "effect-ready",
    "commander-caocao",
    "commander-liubei",
    "commander-sunquan",
    "commander-nomad",
    "invalid",
  ];
  const soundFingerprints = new Map();
  names.forEach((name, index) => {
    context.currentTime += 0.4;
    const nodeOffset = context.nodes.length;
    assert.equal(
      audio.play(name, {
        material: index % 2 ? "metal" : "blunt",
        amount: index + 1,
        kind: index % 2 ? "heal_friendly_hero" : "damage_target",
      }),
      true,
      `${name} should synthesize`,
    );
    soundFingerprints.set(
      name,
      synthesisFingerprint(context.nodes.slice(nodeOffset)),
    );
  });
  assert.ok(context.nodes.some((node) => node.kind === "oscillator"));
  assert.ok(context.nodes.some((node) => node.kind === "buffer-source"));
  assert.ok(context.nodes.some((node) => node.kind === "filter"));
  assert.equal(audio._debug().masterLevel, 0.6);

  const materialFingerprints = new Map();
  for (const material of ["metal", "wood", "cloth", "body"]) {
    context.currentTime += 0.5;
    const nodeOffset = context.nodes.length;
    assert.equal(
      audio.play("impact", { material, amount: 5 }),
      true,
      `${material} impact should synthesize`,
    );
    const nodes = context.nodes.slice(nodeOffset);
    materialFingerprints.set(
      material,
      JSON.stringify(
        nodes
          .filter((node) => node.kind === "oscillator" || node.kind === "filter")
          .map((node) => ({
            kind: node.kind,
            type: node.type,
            frequency: node.frequency && node.frequency.events[0]
              ? node.frequency.events[0][1]
              : null,
          })),
      ),
    );
  }
  assert.equal(
    new Set(materialFingerprints.values()).size,
    4,
    "metal, wood, cloth, and body contacts have distinct synthesis fingerprints",
  );

  const signatureEvents = [
    ["ui:hover", {}, "hover"],
    ["ui:click", {}, "click"],
    ["card:select", { card: { faction: "촉" } }, "select"],
    ["card:draw", { actor: "player", opening: false }, "draw"],
    ["card:play", { actor: "player", card: { faction: "촉" } }, "play"],
    ["attack:start", { attackerId: "blade-1", weapon: "sword" }, "attack"],
    [
      "minion:damage",
      { amount: 5, source: { instanceId: "blade-1", op: "attack" } },
      null,
    ],
    [
      "attack:hit",
      { attackerId: "blade-1", amount: 5 },
      "impact",
    ],
    ["minion:damage", { amount: 2, source: { op: "spell" } }, "damage"],
    ["minion:damage", { absorbedByShield: true, amount: 0 }, "shield"],
    ["guard:block", { target: { zone: "board", side: "ai", index: 0 } }, "guard"],
    [
      "hero:damage",
      { amount: 3, armorAbsorbed: 0, source: { op: "spell" } },
      "hero-damage",
    ],
    ["minion:death", { cardId: "guan-yu" }, "death"],
    ["effect:trigger", { op: "heal_friendly_hero" }, "effect"],
    ["turn:start", { actor: "player" }, "turn"],
    ["action:invalid", { reason: "not_your_turn" }, "invalid"],
    ["game:end", { winner: "player" }, "victory"],
    ["game:end", { winner: "ai" }, "defeat"],
    ["game:end", { winner: "draw" }, "draw-finale"],
  ];
  signatureEvents.forEach(([type, detail, expected]) => {
    context.currentTime += 0.42;
    assert.equal(audio.handleEvent(type, detail), true, `${type} should play`);
    if (expected) {
      assert.equal(audio._debug().lastSound, expected, `${type} signature`);
    }
  });
  const signatureCounts = audio._debug().playCounts;
  ["select", "draw", "play", "attack", "impact", "damage", "hero-damage",
    "shield", "guard", "death", "turn", "victory", "defeat", "draw-finale"].forEach((name) => {
    assert.ok(signatureCounts[name] >= 1, `${name} must have a dedicated signature`);
  });

  const commanderScenarios = [
    {
      type: "commander:power",
      detail: {
        actor: "player",
        side: "player",
        commanderId: "caocao",
        powerId: "jianxiong",
        result: { actualHealing: 1 },
      },
      expected: "commander-caocao",
      pan: -0.28,
      nodes: 11,
    },
    {
      type: "commander:reflect",
      detail: {
        actor: "player",
        side: "player",
        commanderId: "liubei",
        amount: 1,
      },
      expected: "commander-liubei",
      pan: -0.28,
      nodes: 11,
    },
    {
      type: "commander:power",
      detail: {
        actor: "ai",
        side: "ai",
        commanderId: "sunquan",
        powerId: "jiangdong_flood",
      },
      expected: "commander-sunquan",
      pan: 0.28,
      nodes: 13,
    },
    {
      type: "commander:lock",
      detail: {
        actor: "ai",
        side: "ai",
        commanderId: "nomad",
        target: { side: "player", zone: "board", index: 0 },
      },
      expected: "commander-nomad",
      pan: 0.28,
      nodes: 12,
    },
  ];
  const commanderFingerprints = new Map();
  const commanderNodeCounts = {};
  const nonCommanderFingerprints = new Set(
    Array.from(soundFingerprints.entries())
      .filter(([name]) => !name.startsWith("commander-"))
      .map(([, fingerprint]) => fingerprint),
  );
  for (const scenario of commanderScenarios) {
    context.currentTime += 0.65;
    const nodeOffset = context.nodes.length;
    assert.equal(
      audio.handleEvent(scenario.type, scenario.detail),
      true,
      `${scenario.expected} event should synthesize`,
    );
    assert.equal(audio._debug().lastSound, scenario.expected);
    const nodes = context.nodes.slice(nodeOffset);
    commanderNodeCounts[scenario.expected] = nodes.length;
    assert.equal(
      nodes.length,
      scenario.nodes,
      `${scenario.expected} maintains its reviewed node budget`,
    );
    const panners = nodes.filter((node) => node.kind === "panner");
    assert.equal(panners.length, 1, `${scenario.expected} owns one stereo panner`);
    assert.equal(
      panners[0].pan.events[0][1],
      scenario.pan,
      `${scenario.expected} uses actor-side spatial placement`,
    );
    const fingerprint = synthesisFingerprint(nodes);
    commanderFingerprints.set(scenario.expected, fingerprint);
    assert.equal(
      fingerprint,
      soundFingerprints.get(scenario.expected),
      `${scenario.expected} event and direct cue share one deterministic graph`,
    );
    assert.equal(
      nonCommanderFingerprints.has(fingerprint),
      false,
      `${scenario.expected} does not collide with an existing signature`,
    );

    if (scenario.expected === "commander-sunquan") {
      const heroDamageBefore = audio._debug().playCounts["hero-damage"] || 0;
      const minionDamageBefore = audio._debug().playCounts.damage || 0;
      assert.equal(
        audio.handleEvent("hero:damage", {
          amount: 1,
          source: { commanderId: "sunquan", op: "commander_power" },
        }),
        true,
      );
      assert.equal(
        audio.handleEvent("minion:damage", {
          amount: 1,
          source: { commanderId: "sunquan", op: "commander_power" },
        }),
        true,
      );
      assert.equal(audio._debug().playCounts["hero-damage"] || 0, heroDamageBefore);
      assert.equal(audio._debug().playCounts.damage || 0, minionDamageBefore);
    }
  }
  assert.equal(
    new Set(commanderFingerprints.values()).size,
    commanderScenarios.length,
    "all four commander cues have distinct synthesis fingerprints",
  );

  for (const scenario of commanderScenarios) {
    context.currentTime += 0.65;
    const nodeOffset = context.nodes.length;
    assert.equal(audio.handleEvent(scenario.type, scenario.detail), true);
    assert.equal(
      synthesisFingerprint(context.nodes.slice(nodeOffset)),
      commanderFingerprints.get(scenario.expected),
      `${scenario.expected} synthesis stays deterministic across replays`,
    );
  }

  context.currentTime += 0.65;
  const nomadBeforePair = audio._debug().playCounts["commander-nomad"];
  assert.equal(
    audio.handleEvent("commander:power", {
      actor: "ai",
      side: "ai",
      commanderId: "nomad",
      powerId: "seal_order",
    }),
    true,
  );
  assert.equal(
    audio._debug().playCounts["commander-nomad"],
    nomadBeforePair + 1,
    "standalone nomad commander:power owns the signature",
  );
  assert.equal(
    audio.handleEvent("commander:lock", {
      actor: "ai",
      side: "ai",
      commanderId: "nomad",
      target: { side: "player", zone: "board", index: 1 },
    }),
    true,
  );
  assert.equal(
    audio._debug().playCounts["commander-nomad"],
    nomadBeforePair + 1,
    "paired commander:lock does not double-play the nomad signature",
  );

  const resultNodeOffset = context.nodes.length;
  const resultScenarios = [
    [{ success: true, fizzled: false }, "effect-success"],
    [{ success: false, fizzled: true, reason: "no_target" }, "effect-fizzle"],
    [{ success: true, fizzled: false, blockedByShield: true }, "effect-shield"],
    [{ success: true, actualHealing: 3 }, "effect-heal"],
    [{ success: true, actualArmorGained: 2 }, "effect-armor"],
    [{ success: true, actualDrawCount: 2 }, "effect-draw"],
    [{ success: true, actualSummonCount: 2 }, "effect-summon"],
    [{ success: true, discountedTarget: { id: "qun_lu_bu" } }, "effect-discount"],
    [{ success: true, readiedTarget: { instanceId: "ally-1" } }, "effect-ready"],
  ];
  resultScenarios.forEach(([result, expected], index) => {
    context.currentTime += 0.12;
    assert.equal(
      audio.handleEvent("effect:trigger", {
        actor: "ai",
        source: `result-source-${index}`,
        op: "test_result",
        amount: 2,
        result,
      }),
      true,
      `${expected} result should play`,
    );
    assert.equal(audio._debug().lastSound, expected, `${expected} has a distinct signature`);
  });
  const successBeforeDedupe = audio._debug().playCounts["effect-success"];
  const duplicateResult = {
    actor: "ai",
    source: "dedupe-effect",
    op: "buff_friendly_board",
    amount: 1,
    result: { success: true, fizzled: false },
  };
  context.currentTime += 0.12;
  assert.equal(audio.handleEvent("effect:trigger", duplicateResult), true);
  assert.equal(audio.handleEvent("effect:trigger", duplicateResult), true);
  assert.equal(
    audio._debug().playCounts["effect-success"],
    successBeforeDedupe + 1,
    "identical effect results coalesce within 85ms",
  );

  const damageBeforeEffectMerge = audio._debug().playCounts.damage || 0;
  context.currentTime += 0.12;
  audio.handleEvent("effect:trigger", {
    actor: "ai",
    source: "spell-damage-1",
    op: "damage_target",
    amount: 4,
    target: { zone: "board", side: "player", index: 0 },
    result: { success: true, fizzled: false, actualDamage: 4 },
  });
  assert.equal(
    audio.handleEvent("minion:damage", {
      amount: 4,
      target: { zone: "board", side: "player", index: 0 },
      source: { instanceId: "spell-damage-1", op: "damage_target" },
    }),
    true,
    "follow-up spell damage is handled by the result cue merge",
  );
  assert.equal(
    audio._debug().playCounts.damage || 0,
    damageBeforeEffectMerge,
    "effect result plus synchronous damage emits one cue",
  );
  context.currentTime += 0.086;
  audio.handleEvent("minion:damage", {
    amount: 2,
    source: { instanceId: "spell-damage-1", op: "damage_target" },
  });
  assert.equal(
    audio._debug().playCounts.damage,
    damageBeforeEffectMerge + 1,
    "damage cue is available after the 85ms merge window",
  );

  const shieldBeforeEffectMerge = audio._debug().playCounts.shield || 0;
  context.currentTime += 0.12;
  audio.handleEvent("effect:trigger", {
    actor: "ai",
    source: "spell-shield-1",
    op: "damage_target",
    amount: 2,
    result: { success: true, fizzled: false, blockedByShield: true, actualDamage: 0 },
  });
  audio.handleEvent("minion:damage", {
    amount: 0,
    blockedByShield: true,
    source: { instanceId: "spell-shield-1", op: "damage_target" },
  });
  assert.equal(
    audio._debug().playCounts.shield || 0,
    shieldBeforeEffectMerge,
    "blocked result owns the cue and suppresses the duplicate shield damage event",
  );
  assert.ok(context.nodes.length > resultNodeOffset, "result signatures synthesize Web Audio nodes");

  context.currentTime += 1;
  const duckNodeOffset = context.nodes.length;
  audio.play("draw", { volume: 0.8 });
  const drawOutput = context.nodes
    .slice(duckNodeOffset)
    .find((node) => node.kind === "gain");
  const resultDucksBefore = audio._debug().resultDuckedVoiceCount;
  audio.handleEvent("effect:trigger", {
    source: "duck-result-source",
    op: "heal_friendly_hero",
    result: { success: true, actualHealing: 2 },
  });
  assert.ok(
    audio._debug().resultDuckedVoiceCount > resultDucksBefore,
    "ability result cue briefly ducks lower-priority presentation tails",
  );
  const duckRamps = drawOutput.gain.events.filter((entry) => entry[0] === "linear");
  assert.ok(
    duckRamps.length >= 2 &&
      duckRamps.at(-2)[1] < duckRamps.at(-1)[1],
    "result duck has a quiet dip followed by deterministic restoration",
  );

  context.currentTime += 2;
  const combatTime = context.currentTime;
  const scheduleOffset = audio._debug().scheduledSounds.length;
  const combatNodeOffset = context.nodes.length;
  const impactsBeforeCombat = audio._debug().playCounts.impact || 0;
  audio.handleEvent("attack:start", {
    attackerId: "dedupe-1",
    cardId: "wei_sima_yi",
    attackerMeta: {
      instanceId: "dedupe-1",
      cardId: "wei_sima_yi",
      name: "사마의",
      role: "책사",
    },
  });
  audio.handleEvent("minion:damage", {
    amount: 4,
    source: { instanceId: "dedupe-1", op: "attack" },
  });
  audio.handleEvent("minion:damage", {
    amount: 2,
    source: { instanceId: "retaliator-1", op: "retaliation" },
  });
  assert.equal(
    audio.handleEvent("attack:hit", { attackerId: "dedupe-1", amount: 4 }),
    true,
    "attack:hit should flush the one coalesced contact",
  );
  audio.handleEvent("minion:death", {
    instanceId: "fallen-1",
    cardId: "shu_guan_yu",
  });
  assert.equal(context.currentTime, combatTime, "rules events stay in one audio frame");
  assert.equal(
    audio._debug().playCounts.impact,
    impactsBeforeCombat + 1,
    "two damage events plus attack:hit must produce one contact",
  );
  const combatSchedule = audio._debug().scheduledSounds.slice(scheduleOffset);
  const swing = combatSchedule.find((entry) => entry.name === "attack");
  const contact = combatSchedule.find((entry) => entry.name === "impact");
  assert.equal(swing.startAt, combatTime, "swing begins at T0");
  assert.equal(
    swing.material,
    "metal",
    "rules attackerMeta/cardId selects the known procedural weapon family",
  );
  assert.ok(
    contact.startAt >= combatTime + 0.345 &&
      contact.startAt <= combatTime + 0.38,
    "contact is scheduled near the FX collision cue at 365ms",
  );
  const death = combatSchedule.find((entry) => entry.name === "death");
  assert.ok(
    death.startAt >= contact.startAt + 0.045,
    "death stays behind its aligned combat contact",
  );
  const combatNodeStarts = context.nodes
    .slice(combatNodeOffset)
    .flatMap((node) =>
      Array.isArray(node.starts) ? node.starts.map((args) => args[0]) : [],
    )
    .filter(Number.isFinite);
  assert.ok(combatNodeStarts.some((time) => Math.abs(time - combatTime) < 0.0001));
  assert.ok(
    combatNodeStarts.some((time) => Math.abs(time - contact.startAt) < 0.0001),
    "procedural source nodes use the delayed contact start, not only debug metadata",
  );

  context.currentTime += 0.5;
  const lethalTime = context.currentTime;
  const lethalScheduleOffset = audio._debug().scheduledSounds.length;
  const lethalNodeOffset = context.nodes.length;
  const heroContactsBefore = audio._debug().playCounts["hero-damage"] || 0;
  audio.handleEvent("attack:start", {
    attackerId: "lethal-1",
    weapon: "halberd",
  });
  audio.handleEvent("hero:damage", {
    amount: 9,
    armorAbsorbed: 0,
    source: { instanceId: "lethal-1", op: "attack" },
  });
  audio.handleEvent("game:end", { winner: "player" });
  assert.equal(
    audio._debug().pendingFinale,
    "player",
    "lethal game:end waits for the still-pending combat contact",
  );
  audio.handleEvent("attack:hit", { attackerId: "lethal-1", amount: 9 });
  assert.equal(audio._debug().pendingFinale, null);
  assert.equal(context.currentTime, lethalTime, "lethal rules sequence is one JS frame");
  assert.equal(
    audio._debug().playCounts["hero-damage"],
    heroContactsBefore + 1,
    "lethal hero damage has one contact",
  );
  const lethalSchedule = audio._debug().scheduledSounds.slice(lethalScheduleOffset);
  const lethalSwing = lethalSchedule.find((entry) => entry.name === "attack");
  const lethalContact = lethalSchedule.find((entry) => entry.name === "hero-damage");
  const lethalFinale = lethalSchedule.find((entry) => entry.name === "victory");
  assert.equal(lethalSwing.startAt, lethalTime);
  assert.ok(
    lethalContact.startAt >= lethalTime + 0.345 &&
      lethalContact.startAt <= lethalTime + 0.38,
    "lethal contact stays aligned with the FX collision cue",
  );
  assert.ok(
    lethalFinale.startAt >= lethalContact.startAt + 0.25 &&
      lethalFinale.startAt <= lethalContact.startAt + 0.4,
    "victory starts 250–400ms after lethal contact",
  );
  const lethalNodeStarts = context.nodes
    .slice(lethalNodeOffset)
    .flatMap((node) =>
      Array.isArray(node.starts) ? node.starts.map((args) => args[0]) : [],
    )
    .filter(Number.isFinite);
  assert.ok(
    lethalNodeStarts.some((time) => Math.abs(time - lethalContact.startAt) < 0.0001),
    "lethal contact source nodes use the coalesced timestamp",
  );
  assert.ok(
    lethalNodeStarts.some((time) => Math.abs(time - lethalFinale.startAt) < 0.0001),
    "finale source nodes begin at the post-contact timestamp",
  );
  assert.ok(audio._debug().duckedVoiceCount > 0, "finale ducks low-priority tails");
  const victorySources = context.nodes
    .slice(lethalNodeOffset)
    .filter(
      (node) =>
        Array.isArray(node.starts) &&
        node.starts.some(
          (args) =>
            Number.isFinite(args[0]) &&
            args[0] >= lethalFinale.startAt - 0.0001,
        ),
    );
  const victoryStops = victorySources
    .flatMap((node) => node.stops.map((args) => args[0]))
    .filter(Number.isFinite);
  assert.ok(victorySources.length >= 24, "victory stinger uses a rich short layered cadence");
  assert.ok(
    Math.max(...victoryStops) <= lethalFinale.startAt + 1.2,
    "victory stinger source tails finish inside 1.2 seconds",
  );

  context.currentTime += 2;
  const drawCombatTime = context.currentTime;
  const drawScheduleOffset = audio._debug().scheduledSounds.length;
  const drawNodeOffset = context.nodes.length;
  audio.handleEvent("attack:start", {
    attackerId: "mutual-lethal-1",
    material: "metal",
  });
  audio.handleEvent("minion:damage", {
    instanceId: "player-final-minion",
    amount: 6,
    source: { instanceId: "mutual-lethal-1", op: "retaliation" },
  });
  audio.handleEvent("minion:damage", {
    instanceId: "ai-final-minion",
    amount: 6,
    source: { instanceId: "mutual-lethal-1", op: "attack" },
  });
  audio.handleEvent("attack:hit", {
    attackerId: "mutual-lethal-1",
    amount: 6,
  });
  audio.handleEvent("minion:death", {
    instanceId: "player-final-minion",
    cardId: "shu_guan_yu",
  });
  audio.handleEvent("minion:death", {
    instanceId: "ai-final-minion",
    cardId: "wei_xiahou_dun",
  });
  audio.handleEvent("game:end", { winner: "draw" });
  const drawSchedule = audio._debug().scheduledSounds.slice(drawScheduleOffset);
  const drawContact = drawSchedule.find((entry) => entry.name === "impact");
  const drawDeath = drawSchedule.find((entry) => entry.name === "death");
  const drawFinale = drawSchedule.find((entry) => entry.name === "draw-finale");
  assert.ok(drawContact, "mutual lethal still preserves its contact cue");
  assert.ok(drawDeath, "simultaneous death remains audible before the draw finale");
  assert.ok(drawFinale, "draw routes to its own neutral finale");
  assert.equal(audio._debug().lastSound, "draw-finale");
  assert.ok(
    drawFinale.startAt >= drawContact.startAt + 0.25 &&
      drawFinale.startAt <= drawContact.startAt + 0.4,
    "draw finale follows simultaneous death contact by the finale cadence",
  );
  assert.ok(drawFinale.startAt > drawCombatTime);
  const drawSources = context.nodes
    .slice(drawNodeOffset)
    .filter(
      (node) =>
        Array.isArray(node.starts) &&
        node.starts.some(
          (args) =>
            Number.isFinite(args[0]) &&
            args[0] >= drawFinale.startAt - 0.0001,
        ),
    );
  const drawStops = drawSources
    .flatMap((node) => node.stops.map((args) => args[0]))
    .filter(Number.isFinite);
  assert.ok(drawSources.length >= 26, "draw finale has a layered neutral cadence");
  assert.ok(
    Math.max(...drawStops) <= drawFinale.startAt + 1.2,
    "draw finale source tails finish inside 1.2 seconds",
  );
  assert.ok(
    audio._debug().activeVoices <= 12,
    "draw finale respects the mobile 12-voice cap",
  );

  const drawCadence = drawFinale.startAt - drawContact.startAt;
  context.currentTime += 3;
  const repeatDrawOffset = audio._debug().scheduledSounds.length;
  const repeatDrawTime = context.currentTime;
  audio.handleEvent("game:end", { winner: "draw" });
  const repeatDraw = audio
    ._debug()
    .scheduledSounds.slice(repeatDrawOffset)
    .find((entry) => entry.name === "draw-finale");
  assert.ok(repeatDraw);
  assert.ok(
    Math.abs(repeatDraw.startAt - repeatDrawTime - drawCadence) < 0.000001,
    "draw finale cadence is deterministic",
  );

  for (const material of ["metal", "wood", "cloth", "body"]) {
    context.currentTime += 1;
    const startAt = context.currentTime;
    const materialScheduleOffset = audio._debug().scheduledSounds.length;
    const attackerId = `material-${material}`;
    audio.handleEvent("attack:start", {
      attackerId,
      material,
    });
    audio.handleEvent("attack:hit", {
      attackerId,
      amount: 4,
    });
    const schedule = audio._debug().scheduledSounds.slice(materialScheduleOffset);
    const sourceCue = schedule.find((entry) => entry.name === "attack");
    const contactCue = schedule.find((entry) => entry.name === "impact");
    assert.equal(sourceCue.material, material, `${material} source transient is preserved`);
    assert.equal(contactCue.material, material, `${material} contact layer is preserved`);
    assert.ok(
      contactCue.startAt >= startAt + 0.345 &&
        contactCue.startAt <= startAt + 0.38,
      `${material} source-to-contact cadence follows the FX collision`,
    );
  }

  const weaponTruth = [
    ["shu_liu_bei", "유비", "metal"],
    ["shu_guan_yu", "관우", "metal"],
    ["shu_zhang_fei", "장비", "metal"],
    ["shu_zhao_yun", "조자룡", "metal"],
    ["shu_zhuge_liang", "제갈량", "cloth"],
    ["shu_huang_zhong", "황충", "wood"],
    ["wei_cao_cao", "조조", "metal"],
    ["wei_sima_yi", "사마의", "metal"],
    ["wei_xiahou_dun", "하후돈", "metal"],
    ["wei_dian_wei", "전위", "metal"],
    ["wei_zhang_liao", "장료", "metal"],
    ["wei_guo_jia", "곽가", "wood"],
    ["wu_sun_quan", "손권", "metal"],
    ["wu_zhou_yu", "주유", "metal"],
    ["wu_gan_ning", "감녕", "metal"],
    ["wu_lu_meng", "여몽", "metal"],
    ["wu_huang_gai", "황개", "wood"],
    ["wu_sun_shangxiang", "손상향", "wood"],
    ["qun_lu_bu", "여포", "metal"],
  ];
  for (const [cardId, name, expectedMaterial] of weaponTruth) {
    context.currentTime += 1.1;
    const idAttacker = `truth-id-${cardId}`;
    audio.handleEvent("attack:start", {
      attackerId: idAttacker,
      cardId,
      attackerMeta: { instanceId: idAttacker, cardId },
    });
    assert.equal(
      audio._debug().scheduledSounds.at(-1).material,
      expectedMaterial,
      `${cardId} cardId weapon family`,
    );
    audio.handleEvent("attack:hit", { attackerId: idAttacker, amount: 3 });

    context.currentTime += 1.1;
    const nameAttacker = `truth-name-${cardId}`;
    audio.handleEvent("attack:start", {
      attackerId: nameAttacker,
      name,
      attackerMeta: { instanceId: nameAttacker, name },
    });
    assert.equal(
      audio._debug().scheduledSounds.at(-1).material,
      expectedMaterial,
      `${name} name fallback weapon family`,
    );
    audio.handleEvent("attack:hit", { attackerId: nameAttacker, amount: 3 });
  }

  context.currentTime += 2;
  const defeatNodeOffset = context.nodes.length;
  assert.equal(audio.play("defeat"), true);
  const defeatStart = audio._debug().scheduledSounds.at(-1).startAt;
  const defeatSources = context.nodes
    .slice(defeatNodeOffset)
    .filter((node) => Array.isArray(node.starts) && node.starts.length > 0);
  const defeatStops = defeatSources
    .flatMap((node) => node.stops.map((args) => args[0]))
    .filter(Number.isFinite);
  assert.ok(defeatSources.length >= 22, "defeat stinger uses a rich short layered cadence");
  assert.ok(
    Math.max(...defeatStops) <= defeatStart + 1.2,
    "defeat stinger source tails finish inside 1.2 seconds",
  );

  context.currentTime += 1;
  for (let index = 0; index < 80; index += 1) {
    context.currentTime += 0.04;
    audio.play(index % 2 ? "metal" : "blunt", { amount: index % 12 });
  }
  assert.ok(
    audio._debug().activeVoices <= audio._debug().voiceLimit,
    "overlap limiter must cap active voices",
  );

  context.currentTime += 1;
  for (let index = 0; index < 80; index += 1) {
    context.currentTime += 0.021;
    audio.play(
      [
        "commander-caocao",
        "commander-liubei",
        "commander-sunquan",
        "commander-nomad",
      ][index % 4],
      {
        volume: 99,
        pan: index % 2 === 0 ? -99 : 99,
      },
    );
  }
  assert.ok(
    audio._debug().activeVoices <= 12,
    "commander burst obeys the mobile 12-voice cap",
  );
  const scheduledCommanderSounds = audio._debug().scheduledSounds
    .filter((entry) => entry.name.startsWith("commander-"));
  assert.ok(scheduledCommanderSounds.length >= 4);
  assert.ok(
    scheduledCommanderSounds.every((entry) =>
      entry.volume <= 0.9 && Math.abs(entry.pan) <= 0.72,
    ),
    "commander volume and stereo pan stay inside their safety caps",
  );

  context.currentTime += 2;
  for (let index = 0; index < 1000; index += 1) {
    audio.handleEvent("attack:start", {
      attackerId: `restart-pending-${index}`,
      material: index % 4 === 0 ? "wood" : "metal",
    });
  }
  assert.equal(
    audio._debug().pendingAttacks,
    1000,
    "extended auditor setup creates one pending record per interrupted attack",
  );
  context.currentTime += 1;
  const commanderRestartNodeOffset = context.nodes.length;
  commanderScenarios.forEach((scenario) => {
    assert.equal(audio.handleEvent(scenario.type, scenario.detail), true);
  });
  const commanderRestartNodes = context.nodes.slice(commanderRestartNodeOffset);
  assert.ok(commanderRestartNodes.length >= 47);
  audio.handleEvent("game:start", { seed: "restart-regression" });
  assert.equal(audio._debug().pendingAttacks, 0);
  assert.equal(audio._debug().pendingFinale, null);
  assert.equal(audio._debug().pendingSemanticEvent, null);
  assert.equal(audio._debug().effectCueRecords, 0);
  assert.equal(audio._debug().effectDamageMerges, 0);
  assert.equal(audio._debug().activeVoices, 0);
  assert.equal(audio._debug().timers, 0);
  assert.ok(
    commanderRestartNodes.every((node) => node.disconnected),
    "restart disconnects every commander source, gain, filter, and panner",
  );

  for (let index = 0; index < 1000; index += 1) {
    audio.handleEvent("attack:start", {
      attackerId: `restart-cycle-${index}`,
      material: index % 2 === 0 ? "metal" : "body",
    });
    audio.handleEvent("game:start", { seed: `restart-cycle-${index}` });
  }
  assert.equal(audio._debug().pendingAttacks, 0);
  assert.equal(audio._debug().effectCueRecords, 0);
  assert.equal(audio._debug().effectDamageMerges, 0);
  assert.equal(audio._debug().activeVoices, 0);
  assert.equal(audio._debug().timers, 0);

  context.currentTime += 1;
  const interruptedFinaleNodeOffset = context.nodes.length;
  audio.handleEvent("game:end", { winner: "draw" });
  const interruptedFinaleNodes = context.nodes
    .slice(interruptedFinaleNodeOffset)
    .filter((node) => Array.isArray(node.starts) && node.starts.length > 0);
  assert.ok(interruptedFinaleNodes.length >= 26);
  assert.ok(audio._debug().activeVoices > 0);
  audio.handleEvent("game:start", { seed: "restart-before-finale" });
  assert.equal(audio._debug().activeVoices, 0);
  assert.equal(audio._debug().timers, 0);
  assert.equal(audio._debug().scheduledSounds.length, 0);
  assert.ok(
    interruptedFinaleNodes.every((node) =>
      node.stops.some((argumentsList) => argumentsList.length === 0),
    ),
    "restart force-stops every source scheduled by the old match",
  );

  context.currentTime += 1;
  for (let index = 0; index < 10000; index += 1) {
    audio.handleEvent("effect:trigger", {
      op: "damage_target",
      source: { instanceId: "tail-source", op: "damage_target" },
      target: {
        zone: "board",
        side: "ai",
        index: index % 5,
      },
      result: {
        success: true,
        actualDamage: 1,
      },
    });
  }
  assert.equal(audio._debug().effectCueRecords, 5);
  assert.equal(audio._debug().effectDamageMerges, 1);
  assert.equal(
    audio._debug().effectCleanupTimers,
    1,
    "a 10k-event burst owns one bounded cache cleanup timer",
  );
  await new Promise((resolve) => setTimeout(resolve, 140));
  assert.equal(
    audio._debug().effectCueRecords,
    0,
    "effect cue dedupe records self-prune after a quiet tail",
  );
  assert.equal(
    audio._debug().effectDamageMerges,
    0,
    "damage merge records self-prune after a quiet tail",
  );
  assert.equal(audio._debug().effectCleanupTimers, 0);
  audio.handleEvent("game:start", { seed: "post-tail-reset" });
  assert.equal(audio._debug().timers, 0);
  assert.equal(audio._debug().activeVoices, 0);

  audio.setMuted(true);
  assert.equal(audio.isMuted(), true);
  assert.equal(audio.play("victory"), false);
  audio.setMuted(false);
  assert.equal(audio.isMuted(), false);
  context.currentTime += 1;
  assert.equal(audio.play("victory"), true);

  audio.destroy();
  assert.equal(audio._debug().destroyed, true);
  assert.equal(audio._debug().activeVoices, 0);
  assert.equal(audio._debug().timers, 0);
  assert.equal(audio._debug().effectCueRecords, 0);
  assert.equal(audio._debug().effectDamageMerges, 0);
  assert.ok(
    context.nodes.slice(resultNodeOffset).every((node) => node.disconnected),
    "all result-cue nodes disconnect on destroy",
  );
  assert.equal(context.closed, true);
  assert.equal(mockDocument.listeners.size, 0);
  assert.doesNotThrow(() => audio.destroy());
  assert.equal(audio.play("click"), false);

  const desktopDocument = createMockDocument();
  const desktopAudio = globalThis.TK.modules.audio.createAudio({
    AudioContext: MockAudioContext,
    document: desktopDocument,
    navigator: { maxTouchPoints: 0, userAgent: "Desktop Test" },
    muted: false,
  });
  await desktopAudio.unlock();
  const desktopContext = MockAudioContext.instances.at(-1);
  assert.equal(desktopAudio._debug().voiceLimit, 22);
  assert.equal(desktopDocument.listeners.has("pointermove"), true);
  const canvasTarget = {
    id: "game-canvas",
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 1200, height: 800 };
    },
  };
  desktopContext.currentTime += 1;
  const voicesBeforeHover = desktopAudio._debug().activeVoices;
  const pointerMove = desktopDocument.listeners.get("pointermove");
  pointerMove({
    target: canvasTarget,
    clientX: 440,
    clientY: 700,
  });
  assert.ok(desktopAudio._debug().activeVoices > voicesBeforeHover);
  const interfaceClick = desktopDocument.listeners.get("click");
  desktopContext.currentTime += 0.2;
  interfaceClick({
    type: "click",
    target: canvasTarget,
    clientX: 520,
    clientY: 700,
  });
  assert.equal(
    desktopAudio._debug().lastSound,
    "select",
    "hand-zone canvas clicks should use the card-select signature",
  );
  const selectsBeforeSemantic = desktopAudio._debug().playCounts.select || 0;
  desktopContext.currentTime += 0.2;
  desktopAudio.handleEvent("card:draw", { actor: "player", opening: false });
  interfaceClick({
    type: "click",
    target: canvasTarget,
    clientX: 520,
    clientY: 700,
  });
  assert.equal(
    desktopAudio._debug().playCounts.select || 0,
    selectsBeforeSemantic,
    "canvas click/select is suppressed inside the 80ms semantic window",
  );
  desktopContext.currentTime += 0.081;
  interfaceClick({
    type: "click",
    target: canvasTarget,
    clientX: 520,
    clientY: 700,
  });
  assert.equal(
    desktopAudio._debug().playCounts.select,
    selectsBeforeSemantic + 1,
    "canvas selection returns after the semantic suppression window",
  );
  desktopContext.currentTime += 0.2;
  interfaceClick({
    type: "click",
    target: canvasTarget,
    clientX: 1060,
    clientY: 300,
  });
  assert.equal(
    desktopAudio._debug().lastSound,
    "click",
    "non-card canvas controls retain the compact click signature",
  );
  desktopAudio.destroy();
  assert.equal(desktopDocument.listeners.size, 0);

  const firstInputDocument = createMockDocument();
  const instancesBeforeFirstInput = MockAudioContext.instances.length;
  const firstInputAudio = globalThis.TK.modules.audio.createAudio({
    AudioContext: MockAudioContext,
    document: firstInputDocument,
    navigator: { maxTouchPoints: 5, userAgent: "Mobile First Input" },
  });
  const firstPointer = firstInputDocument.listeners.get("pointerdown");
  firstPointer({
    type: "pointerdown",
    target: canvasTarget,
    clientX: 520,
    clientY: 700,
  });
  assert.equal(
    MockAudioContext.instances.length,
    instancesBeforeFirstInput + 1,
    "AudioContext is constructed synchronously inside the gesture",
  );
  await firstInputAudio.unlock();
  assert.equal(
    firstInputAudio._debug().playCounts.select || 0,
    0,
    "pointerdown unlocks synchronously but defers feedback until the bubble click",
  );
  const firstClick = firstInputDocument.listeners.get("click");
  firstClick({
    type: "click",
    target: canvasTarget,
    clientX: 520,
    clientY: 700,
  });
  assert.equal(
    firstInputAudio._debug().playCounts.select,
    1,
    "first pointer plus compatibility click produces exactly one fitting cue",
  );
  firstInputAudio.destroy();

  const firstSemanticDocument = createMockDocument();
  const firstSemanticAudio = globalThis.TK.modules.audio.createAudio({
    AudioContext: MockAudioContext,
    document: firstSemanticDocument,
    navigator: { maxTouchPoints: 5, userAgent: "Mobile Semantic First Input" },
  });
  firstSemanticDocument.listeners.get("pointerdown")({
    type: "pointerdown",
    target: canvasTarget,
    clientX: 520,
    clientY: 700,
  });
  assert.equal(
    firstSemanticAudio.handleEvent("card:play", {
      actor: "player",
      card: { id: "shu_guan_yu", faction: "촉" },
    }),
    true,
    "semantic event is accepted while the first gesture unlock is pending",
  );
  firstSemanticAudio.handleEvent("effect:trigger", { op: "draw" });
  assert.equal(firstSemanticAudio._debug().pendingSemanticEvent, "card:play");
  assert.equal(firstSemanticAudio._debug().playCounts.play || 0, 0);
  await firstSemanticAudio.unlock();
  assert.equal(firstSemanticAudio._debug().pendingSemanticEvent, null);
  assert.equal(
    firstSemanticAudio._debug().playCounts.play,
    1,
    "the pending semantic signature is replayed exactly once after unlock",
  );
  firstSemanticDocument.listeners.get("click")({
    type: "click",
    target: canvasTarget,
    clientX: 520,
    clientY: 700,
  });
  assert.equal(firstSemanticAudio._debug().playCounts.play, 1);
  assert.equal(
    firstSemanticAudio._debug().playCounts.select || 0,
    0,
    "bubble click does not add a generic cue after pending semantic playback",
  );
  firstSemanticAudio.destroy();

  const reducedDocument = createMockDocument();
  const reducedAudio = globalThis.TK.modules.audio.createAudio({
    AudioContext: MockAudioContext,
    document: reducedDocument,
    navigator: { maxTouchPoints: 0, userAgent: "Desktop Reduced Motion" },
    reducedMotion: true,
  });
  await reducedAudio.unlock();
  const reducedContext = MockAudioContext.instances.at(-1);
  assert.equal(reducedAudio._debug().reducedMotion, true);
  assert.equal(reducedAudio._debug().voiceLimit, 12);
  assert.equal(reducedAudio._debug().masterLevel, 0.5);
  assert.equal(reducedAudio.handleEvent("ui:hover", {}), false);
  reducedContext.currentTime += 0.2;
  assert.equal(reducedAudio.handleEvent("card:select", {}), true);
  assert.equal(reducedAudio._debug().lastSound, "select");
  for (let index = 0; index < 50; index += 1) {
    reducedContext.currentTime += 0.03;
    reducedAudio.play(index % 2 ? "damage" : "effect", { amount: index % 10 });
  }
  assert.ok(reducedAudio._debug().activeVoices <= 12);
  reducedAudio.destroy();

  console.log(
    `audio self-test passed: ${context.nodes.length} procedural nodes, ` +
      `${Object.keys(signatureCounts).length} signatures, mobile cap 12; ` +
      `commander nodes ${JSON.stringify(commanderNodeCounts)}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
