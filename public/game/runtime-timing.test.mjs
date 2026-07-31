import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(
  new URL("./main.js", import.meta.url),
  "utf8",
);

function loadCoordinator() {
  const context = {
    console,
    document: { getElementById: () => null },
    globalThis: null,
    performance: { now: () => 0 },
  };
  context.globalThis = context;
  vm.createContext(context);
  assert.throws(
    () => vm.runInContext(source, context),
    /cardData/,
    "the isolated coordinator bootstrap should stop at missing game modules",
  );
  return context.TK.runtime.createPresentationCoordinator;
}

function createElement(context2d, tracking) {
  const metrics = tracking && tracking.metrics;
  const datasetStore = {};
  const dataset = new Proxy(datasetStore, {
    set(target, key, value) {
      if (tracking && tracking.dataset && metrics) metrics.datasetWrites += 1;
      target[key] = value;
      return true;
    },
  });
  let text = "";
  const element = {
    classList: { add() {}, remove() {} },
    dataset,
    querySelector: () => null,
    getContext: () => context2d,
  };
  Object.defineProperty(element, "textContent", {
    get: () => text,
    set(value) {
      if (tracking && tracking.text && metrics) metrics.announcerWrites += 1;
      text = String(value);
    },
  });
  return element;
}

function createRuntimeHarness(
  actionScript = ["playCard", "attack"],
  options = {},
) {
  const harnessOptions = options;
  let clock = 0;
  let timerSequence = 0;
  let rafCallback = null;
  let pagehideHandler = null;
  const timers = [];
  const trace = [];
  const metrics = {
    stateReads: 0,
    datasetWrites: 0,
    announcerWrites: 0,
    fxUpdates: 0,
    fxRenders: 0,
    fxClears: 0,
    rafRequests: 0,
    rafCancels: 0,
    fxDestroys: 0,
    timerCancels: 0,
  };
  const context2d = {
    clearRect() {
      metrics.fxClears += 1;
    },
  };
  const root = createElement(context2d, { dataset: true, metrics });
  const canvas = createElement(context2d);
  const fxCanvas = createElement(context2d);
  const loading = createElement(context2d);
  const announcer = createElement(context2d, { text: true, metrics });
  let gameCount = 0;
  let boardConfig = null;
  const keywordGlossarySource = {
    돌진: "이 하수인은 출전한 턴에도 공격할 수 있습니다.",
    수호: "적의 수호 하수인이 하나라도 있으면 수호 하수인만 공격할 수 있습니다.",
    방패: "이 하수인이 처음 받는 피해를 한 번 전부 막습니다.",
  };
  const fxControl = {
    active: false,
    delayFrames: 0,
    activeFrames: 0,
    plans: options.fxEvents || {},
  };

  function schedule(callback, delay) {
    const timer = {
      id: ++timerSequence,
      due: clock + Math.max(0, Number(delay) || 0),
      callback,
    };
    timers.push(timer);
    timers.sort((left, right) => left.due - right.due || left.id - right.id);
    return timer.id;
  }

  function createGame(gameOptions) {
    const gameId = ++gameCount;
    const actions = actionScript.slice();
    let actionIndex = 0;
    const state = {
      phase: harnessOptions.initialState?.phase || "playing",
      turn: harnessOptions.initialState?.turn || "ai",
      turnNumber: 1,
      revision: 1,
      winner: harnessOptions.initialState?.winner || null,
      heroes: {
        player: { health: 30, armor: 0, mana: 1, maxMana: 1 },
        ai: { health: 30, armor: 0, mana: 1, maxMana: 1 },
      },
      hands: { player: [], ai: [] },
      boards: { player: [], ai: [] },
      decks: { player: [], ai: [] },
      log: [],
    };

    function actionSpec() {
      const entry = actions[actionIndex];
      return typeof entry === "string" ? { type: entry } : entry || {};
    }

    function emit(type, detail) {
      trace.push({ type: "event", eventType: type, at: clock, gameId });
      gameOptions.emit(type, detail);
    }

    function finishFromSpec(spec) {
      if (!["player", "ai", "draw"].includes(spec.outcome)) return;
      state.phase = "ended";
      state.winner = spec.outcome;
      emit("game:end", { winner: spec.outcome });
    }

    const game = {
      getState: () => {
        metrics.stateReads += 1;
        return state;
      },
      getLegalActions: () => {
        const type = actionSpec().type;
        if (type === "playCard") {
          return [{ type, side: "ai", handIndex: 0 }, { type: "endTurn", side: "ai" }];
        }
        if (type === "attack") {
          return [{
            type,
            side: "ai",
            attackerIndex: 0,
            target: { zone: "hero", side: "player" },
          }, { type: "endTurn", side: "ai" }];
        }
        return [{ type: "endTurn", side: "ai" }];
      },
      playCard: () => {
        const spec = actionSpec();
        trace.push({ type: "playCard", at: clock, gameId, spec });
        emit("card:play", {
          actor: "ai",
          card: { name: "제갈량" },
          boardIndex: 0,
        });
        emit("effect:trigger", {
          actor: "ai",
          op: "draw",
          result: { success: true, actualDrawCount: 1 },
        });
        if (spec.death) {
          emit("minion:death", {
            actor: "player",
            side: "player",
            instanceId: `fallen-${gameId}-${actionIndex}`,
          });
        }
        actionIndex += 1;
        state.revision += 1;
        finishFromSpec(spec);
        return { ok: true };
      },
      attack: () => {
        const spec = actionSpec();
        const target = { zone: "hero", side: "player" };
        trace.push({ type: "attack", at: clock, gameId, spec });
        emit("attack:start", {
          actor: "ai",
          attackerIndex: 0,
          attacker: { zone: "board", side: "ai", index: 0 },
          target,
        });
        emit("hero:damage", {
          actor: "ai",
          amount: 3,
          target,
          source: { op: "attack" },
        });
        emit("attack:hit", { actor: "ai", target });
        if (spec.death) {
          emit("minion:death", {
            actor: "player",
            side: "player",
            instanceId: `fallen-${gameId}-${actionIndex}`,
          });
        }
        actionIndex += 1;
        state.revision += 1;
        finishFromSpec(spec);
        return { ok: true };
      },
      endTurn: () => {
        trace.push({ type: "endTurn", at: clock, gameId });
        state.turn = "player";
        state.revision += 1;
        emit("turn:start", { side: "player" });
        emit("card:draw", { actor: "player" });
        return { ok: true };
      },
      concede: () => {
        state.phase = "ended";
        state.winner = "ai";
        return { ok: true };
      },
      cloneForSimulation: () => ({
        playCard() {},
        attack() {},
        endTurn() {},
        concede() {},
        getState: () => state,
      }),
    };
    emit("game:start", { side: "ai" });
    return game;
  }

  const board = {
    render(state) {
      trace.push({ type: "render", at: clock, turn: state.turn, gameId: gameCount });
    },
    handleEvent() {},
    setThinking(value) {
      trace.push({ type: "thinking", value: Boolean(value), at: clock, gameId: gameCount });
    },
    destroy() {},
    getAnchor: () => ({ x: 100, y: 100 }),
  };

  const context = {
    console,
    globalThis: null,
    performance: { now: () => clock },
    setTimeout: schedule,
    clearTimeout(id) {
      const index = timers.findIndex((timer) => timer.id === id);
      if (index >= 0) {
        timers.splice(index, 1);
        metrics.timerCancels += 1;
      }
    },
    requestAnimationFrame(callback) {
      metrics.rafRequests += 1;
      rafCallback = callback;
      return 1;
    },
    cancelAnimationFrame() {
      metrics.rafCancels += 1;
      rafCallback = null;
    },
    addEventListener(type, handler) {
      if (type === "pagehide") pagehideHandler = handler;
    },
    matchMedia: () => ({ matches: false }),
    document: {
      getElementById(id) {
        return {
          "game-stage": root,
          "game-canvas": canvas,
          "fx-canvas": fxCanvas,
          "game-loading": loading,
          "game-announcer": announcer,
        }[id] || null;
      },
    },
    TK: {
      modules: {
        cardData: {
          getCards: () => [],
          getTokens: () => ({}),
          buildDeck: () => [],
          getKeywordGlossary: () => ({ ...keywordGlossarySource }),
        },
        rulesEngine: { createGame },
        opponentAI: {
          createAI: () => ({
            chooseAction: ({ legalActions }) => legalActions[0] || null,
          }),
        },
        audio: {
          createAudio: () => ({
            unlock() {},
            handleEvent() {},
            setMuted() {},
            isMuted: () => false,
            destroy() {},
          }),
        },
        fxAnimation: {
          createFX: () => ({
            handleEvent(type) {
              const plan = fxControl.plans[type];
              if (!plan) return;
              fxControl.active = true;
              fxControl.delayFrames = Math.max(0, Number(plan.delayFrames) || 0);
              fxControl.activeFrames = Math.max(1, Number(plan.activeFrames) || 1);
            },
            hasActiveVisuals() {
              return fxControl.active;
            },
            update() {
              metrics.fxUpdates += 1;
              if (fxControl.delayFrames > 0) {
                fxControl.delayFrames -= 1;
              } else if (fxControl.activeFrames > 0) {
                fxControl.activeFrames -= 1;
              }
              if (fxControl.delayFrames <= 0 && fxControl.activeFrames <= 0) {
                fxControl.active = false;
              }
            },
            render() {
              metrics.fxRenders += 1;
            },
            destroy() {
              metrics.fxDestroys += 1;
              fxControl.active = false;
            },
          }),
        },
        boardUI: {
          createBoardUI(config) {
            boardConfig = config;
            return board;
          },
        },
      },
    },
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);

  async function flushMicrotasks(rounds = 8) {
    for (let index = 0; index < rounds; index += 1) await Promise.resolve();
  }

  async function runNextTimer() {
    const timer = timers.shift();
    assert.ok(timer, "a pending runtime timer was expected");
    clock = Math.max(clock, timer.due);
    timer.callback();
    await flushMicrotasks();
  }

  async function drainUntilIdle(limit = 200) {
    for (let index = 0; index < limit; index += 1) {
      if (!context.__TK_GAME_DEBUG__.getRuntimeState().aiBusy) return;
      await runNextTimer();
    }
    assert.fail("AI runtime did not settle within the timer budget");
  }

  function runAnimationFrames(count, frameMs = 1000 / 60) {
    for (let index = 0; index < count; index += 1) {
      assert.equal(typeof rafCallback, "function", "runtime RAF callback should remain scheduled");
      const callback = rafCallback;
      rafCallback = null;
      clock += frameMs;
      callback(clock);
    }
  }

  function advanceClock(ms) {
    clock += Math.max(0, Number(ms) || 0);
  }

  return {
    context,
    boardConfig: () => boardConfig,
    fxControl,
    keywordGlossarySource,
    metrics,
    trace,
    timers,
    now: () => clock,
    runNextTimer,
    runAnimationFrames,
    advanceClock,
    hasScheduledFrame: () => typeof rafCallback === "function",
    announcerText: () => announcer.textContent,
    firePagehide() {
      assert.equal(typeof pagehideHandler, "function");
      pagehideHandler();
    },
    drainUntilIdle,
  };
}

test("presentation coordinator keeps primary cues readable without over-waiting", () => {
  const createPresentationCoordinator = loadCoordinator();
  let now = 0;
  const timing = createPresentationCoordinator({ now: () => now });

  timing.note("card:play", {});
  assert.equal(timing.remaining(), 560);
  assert.equal(timing.delayFor(520), 560);

  now = 560;
  timing.note("attack:start", {});
  assert.equal(timing.delayFor(610), 700);

  now = 1260;
  timing.note("effect:trigger", { result: { success: true } });
  assert.equal(timing.remaining(), 820);

  timing.reset();
  timing.note("effect:trigger", {
    result: { success: false, fizzled: true },
  });
  assert.equal(timing.remaining(), 460);

  const reduced = createPresentationCoordinator({
    now: () => now,
    reducedMotion: true,
  });
  reduced.note("effect:trigger", { result: { success: true } });
  assert.equal(reduced.remaining(), 350);
});

test("AI actions and turn handoff never outrun their presentation deadline", async () => {
  const harness = createRuntimeHarness();
  await harness.drainUntilIdle();

  const play = harness.trace.find((entry) => entry.type === "playCard");
  const attack = harness.trace.find((entry) => entry.type === "attack");
  const endTurn = harness.trace.find((entry) => entry.type === "endTurn");
  assert.ok(play && attack && endTurn);
  assert.equal(play.at, 1040, "opening thought and first card cadence stay unchanged");
  assert.equal(
    attack.at - play.at,
    820,
    "a result label finishes its readable phase before the next AI action",
  );
  assert.equal(
    endTurn.at - attack.at,
    700,
    "the player turn cannot open before attack presentation settles",
  );
  assert.equal(
    harness.metrics.stateReads,
    4,
    "startup and three committed revisions each take exactly one rules snapshot",
  );
  assert.equal(
    harness.context.__TK_GAME_DEBUG__.getState().turn,
    "player",
  );
  assert.deepEqual(
    { ...harness.context.__TK_GAME_DEBUG__.getRuntimeState() },
    {
      matchEpoch: 1,
      aiBusy: false,
      aiBusyEpoch: 0,
      pendingTimerCount: 0,
      presentationRemainingMs: 0,
      presentationLocked: false,
      inputLocked: false,
    },
  );
});

test("an obsolete AI coroutine cannot clear a restarted match thinking lock", async () => {
  const harness = createRuntimeHarness(["playCard"]);
  const firstEpoch = harness.context.__TK_GAME_DEBUG__.getRuntimeState().matchEpoch;
  const obsoleteTimerId = harness.timers[0].id;
  assert.equal(firstEpoch, 1);
  assert.equal(harness.context.__TK_GAME_DEBUG__.getRuntimeState().aiBusy, true);

  harness.context.__TK_GAME_DEBUG__.restartMatch();
  const restarted = harness.context.__TK_GAME_DEBUG__.getRuntimeState();
  assert.equal(restarted.matchEpoch, 2);
  assert.equal(restarted.aiBusy, true);
  assert.equal(restarted.aiBusyEpoch, 2);
  assert.equal(
    harness.timers.some((timer) => timer.id === obsoleteTimerId),
    false,
    "restart cancels the obsolete epoch timer instead of waiting for it to fire",
  );

  await harness.runNextTimer();
  const afterObsoleteTimer = harness.context.__TK_GAME_DEBUG__.getRuntimeState();
  assert.equal(afterObsoleteTimer.matchEpoch, 2);
  assert.equal(
    afterObsoleteTimer.aiBusy,
    true,
    "the first match finally block must not unlock the restarted AI turn",
  );
  assert.equal(afterObsoleteTimer.aiBusyEpoch, 2);

  await harness.drainUntilIdle();
  assert.equal(harness.context.__TK_GAME_DEBUG__.getState().turn, "player");
});

test("long idle sleeps without state reads, DOM writes, FX work, or RAF churn", () => {
  const harness = createRuntimeHarness([]);
  const before = { ...harness.metrics };

  assert.equal(harness.hasScheduledFrame(), false);
  harness.advanceClock(10_000);

  assert.equal(
    harness.metrics.stateReads,
    before.stateReads,
    "idle time must not clone rules state",
  );
  assert.equal(
    harness.metrics.datasetWrites,
    before.datasetWrites,
    "stable runtime flags must not be written back to dataset every frame",
  );
  assert.equal(
    harness.metrics.announcerWrites,
    before.announcerWrites,
    "the live announcer only changes when its derived copy changes",
  );
  assert.equal(harness.metrics.fxUpdates, before.fxUpdates);
  assert.equal(harness.metrics.fxClears, before.fxClears);
  assert.equal(harness.metrics.fxRenders, before.fxRenders);
  assert.equal(harness.metrics.rafRequests, before.rafRequests);
});

test("draw announcement is exact Korean and remains write-on-change during idle restart", () => {
  const harness = createRuntimeHarness([], {
    initialState: {
      phase: "ended",
      turn: "player",
      winner: "draw",
    },
  });

  assert.equal(harness.announcerText(), "무승부. 전투가 끝났습니다.");
  assert.equal(harness.metrics.announcerWrites, 1);
  assert.equal(harness.hasScheduledFrame(), false);

  const beforeRestart = { ...harness.metrics };
  harness.context.__TK_GAME_DEBUG__.restartMatch();
  harness.advanceClock(10_000);

  assert.equal(harness.announcerText(), "무승부. 전투가 끝났습니다.");
  assert.equal(
    harness.metrics.announcerWrites,
    beforeRestart.announcerWrites,
    "an identical draw state must not rewrite the live region",
  );
  assert.equal(harness.metrics.rafRequests, beforeRestart.rafRequests);
  assert.equal(harness.metrics.fxUpdates, beforeRestart.fxUpdates);
  assert.equal(harness.metrics.fxClears, beforeRestart.fxClears);
  assert.equal(harness.metrics.fxRenders, beforeRestart.fxRenders);
});

test("board receives the production keyword glossary through runtime context without mutation", () => {
  const harness = createRuntimeHarness([]);
  const provided = harness.boardConfig().keywordDefinitions;
  const sourceBefore = JSON.stringify(harness.keywordGlossarySource);
  const providedBefore = JSON.stringify(provided);

  assert.deepEqual({ ...provided }, {
    돌진: "이 하수인은 출전한 턴에도 공격할 수 있습니다.",
    수호: "적의 수호 하수인이 하나라도 있으면 수호 하수인만 공격할 수 있습니다.",
    방패: "이 하수인이 처음 받는 피해를 한 번 전부 막습니다.",
  });
  assert.equal(
    provided.돌진,
    "이 하수인은 출전한 턴에도 공격할 수 있습니다.",
    "production wording must override the shorter board fallback",
  );

  harness.context.__TK_GAME_DEBUG__.restartMatch();
  assert.equal(JSON.stringify(provided), providedBefore);
  assert.equal(JSON.stringify(harness.keywordGlossarySource), sourceBefore);
});

test("broadcast wakes delayed FX, runs active frames, clears the final frame once, then sleeps", async () => {
  const harness = createRuntimeHarness(["playCard"], {
    fxEvents: {
      "card:play": { delayFrames: 2, activeFrames: 2 },
    },
  });

  while (!harness.trace.some((entry) => entry.type === "playCard")) {
    await harness.runNextTimer();
  }

  assert.equal(harness.hasScheduledFrame(), true, "card broadcast wakes FX immediately");
  assert.deepEqual(
    {
      updates: harness.metrics.fxUpdates,
      clears: harness.metrics.fxClears,
      renders: harness.metrics.fxRenders,
    },
    { updates: 0, clears: 0, renders: 0 },
    "the wake schedules work without doing it outside RAF",
  );

  harness.runAnimationFrames(3);
  assert.equal(harness.hasScheduledFrame(), true);
  assert.equal(harness.fxControl.active, true);
  const beforeFinal = { ...harness.metrics };

  harness.runAnimationFrames(1);
  assert.equal(harness.fxControl.active, false);
  assert.equal(harness.hasScheduledFrame(), false, "inactive FX stops requesting frames");
  assert.equal(harness.metrics.fxUpdates - beforeFinal.fxUpdates, 1);
  assert.equal(harness.metrics.fxClears - beforeFinal.fxClears, 1);
  assert.equal(harness.metrics.fxRenders - beforeFinal.fxRenders, 1);

  const asleep = { ...harness.metrics };
  harness.advanceClock(10_000);
  assert.deepEqual(harness.metrics, asleep, "settled FX performs no idle work");
});

test("restart wakes fresh FX and pagehide cancels the owned frame", () => {
  const harness = createRuntimeHarness([], {
    fxEvents: {
      "game:start": { activeFrames: 1 },
    },
  });

  assert.equal(harness.hasScheduledFrame(), true);
  harness.runAnimationFrames(1);
  assert.equal(harness.hasScheduledFrame(), false);

  harness.context.__TK_GAME_DEBUG__.restartMatch();
  assert.equal(harness.hasScheduledFrame(), true, "restart flush wakes its game-start FX");
  const beforeHide = { ...harness.metrics };
  harness.firePagehide();

  assert.equal(harness.hasScheduledFrame(), false);
  assert.equal(harness.fxControl.active, false);
  assert.equal(harness.timers.length, 0);
  assert.equal(
    harness.context.__TK_GAME_DEBUG__.getRuntimeState().pendingTimerCount,
    0,
  );
  assert.equal(harness.metrics.rafCancels - beforeHide.rafCancels, 1);
  assert.equal(harness.metrics.fxDestroys - beforeHide.fxDestroys, 1);
});

test("runtime performance path avoids private FX probes and duplicate rules reads", () => {
  assert.equal(
    (source.match(/\bgame\.getState\(\)/g) || []).length,
    1,
    "only refreshStateSnapshot may read the rules engine directly",
  );
  const animateStart = source.indexOf("function animate(now)");
  const animateEnd = source.indexOf("global.addEventListener(", animateStart);
  const animateBody = source.slice(animateStart, animateEnd);
  assert.doesNotMatch(animateBody, /game\.getState\(\)/);
  assert.doesNotMatch(source, /fx(?:\?\.|\.)_(?:debug)/);
  assert.match(source, /fx\.hasActiveVisuals\(\)/);
  assert.match(animateBody, /fx\.update\(dt\)/);
  assert.match(animateBody, /fx\.render\(fxContext\)/);
  assert.doesNotMatch(animateBody, /requestAnimationFrame\(animate\)[\s\S]*requestAnimationFrame\(animate\)/);
});

test("runtime gates production boot on faction selection and forwards commander actions", () => {
  assert.match(source, /document\.getElementById\("faction-select"\)/);
  assert.match(source, /data-commander/);
  assert.match(source, /type:\s*"SELECT_FACTION"/);
  assert.match(source, /type:\s*"useCommanderPower"/);
  assert.match(source, /action\.type === "USE_COMMANDER_POWER"/);
  assert.match(source, /commanders:\s*\{\s*player:\s*selectedCommanderId,\s*ai:\s*opponentCommanderId/);
  assert.match(source, /buildDeck\(seed,\s*selectedCommanderId\)/);
  assert.match(source, /buildDeck\(seed \^ 0xa53a9e77,\s*opponentCommanderId\)/);
});
