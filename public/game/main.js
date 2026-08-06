(function registerGameRuntime(global) {
  "use strict";

  const TK = (global.TK = global.TK || { modules: {} });
  const PRESENTATION_MS = Object.freeze({
    "card:play": 560,
    "attack:start": 700,
    "attack:hit": 700,
    "minion:damage": 620,
    "hero:damage": 620,
    "minion:death": 700,
    "shield:break": 720,
    "minion:shield": 720,
    "guard:block": 620,
    "minion:guard": 620,
    "card:draw": 500,
    "effect:trigger": 820,
    "commander:power": 760,
    "commander:reflect": 680,
    "formation:place": 420,
    "formation:block": 360,
    "formation:row-strike": 720,
    "formation:reinforce": 680,
    "formation:teamwork": 760,
    "faction:link": 780,
    "hand:betrayal": 780,
    "turn:timeout": 680,
    "duel:start": 720,
    "duel:hit": 700,
    "discord:start": 720,
    "discord:hit": 700,
    "status:burn": 620,
    "status:counter": 720,
    "status:intimidate": 640,
    "status:empty-fort": 760,
    "status:raid": 620,
  });
  const FIZZLE_PRESENTATION_MS = 460;
  const REDUCED_MOTION_PRESENTATION_MS = 350;
  const AI_OPENING_DELAY_MS = 520;
  const AI_CARD_ACTION_DELAY_MS = 520;
  const AI_ATTACK_ACTION_DELAY_MS = 610;
  const AI_END_TURN_DELAY_MS = 380;
  const PLAYER_TURN_LIMIT_MS = 60_000;

  function createTurnTimer(options) {
    const config = options || {};
    const now = typeof config.now === "function" ? config.now : () => performance.now();
    const setTimer = typeof config.setTimer === "function" ? config.setTimer : setTimeout;
    const clearTimer = typeof config.clearTimer === "function" ? config.clearTimer : clearTimeout;
    const durationMs = Math.max(1_000, Number(config.durationMs) || PLAYER_TURN_LIMIT_MS);
    const onTick = typeof config.onTick === "function" ? config.onTick : () => {};
    const onExpire = typeof config.onExpire === "function" ? config.onExpire : () => {};
    let timerId = 0;
    let active = false;
    let deadline = 0;
    let context = null;
    let lastSeconds = -1;

    function cancel() {
      if (timerId) clearTimer(timerId);
      timerId = 0;
      active = false;
      deadline = 0;
      context = null;
      lastSeconds = -1;
    }

    function pulse() {
      timerId = 0;
      if (!active) return;
      const remainingMs = Math.max(0, deadline - now());
      const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
      if (seconds !== lastSeconds) {
        lastSeconds = seconds;
        onTick(Object.freeze({
          context,
          seconds,
          remainingMs,
          durationMs,
          ratio: Math.max(0, Math.min(1, remainingMs / durationMs)),
          urgent: seconds <= 3,
          expired: remainingMs <= 0,
        }));
      }
      if (remainingMs <= 0) {
        const expiredContext = context;
        active = false;
        deadline = 0;
        context = null;
        onExpire(expiredContext);
        return;
      }
      timerId = setTimer(pulse, Math.min(1000, remainingMs));
    }

    function start(nextContext) {
      cancel();
      context = nextContext || null;
      active = true;
      deadline = now() + durationMs;
      pulse();
    }

    return Object.freeze({
      start,
      cancel,
      isActive: () => active,
      deadline: () => deadline,
      remainingMs: () => active ? Math.max(0, deadline - now()) : 0,
    });
  }

  function createPresentationCoordinator(options) {
    const config = options || {};
    const now = typeof config.now === "function"
      ? config.now
      : () => performance.now();
    const reducedMotion = typeof config.reducedMotion === "function"
      ? config.reducedMotion
      : () => Boolean(config.reducedMotion);
    let readyAt = 0;

    function durationFor(type, detail) {
      let duration = PRESENTATION_MS[type] || 0;
      if (
        type === "effect:trigger"
        && detail
        && detail.result
        && (detail.result.fizzled || detail.result.success === false)
      ) {
        duration = FIZZLE_PRESENTATION_MS;
      }
      return reducedMotion()
        ? Math.min(duration, REDUCED_MOTION_PRESENTATION_MS)
        : duration;
    }

    function note(type, detail) {
      const duration = durationFor(type, detail);
      if (duration > 0) readyAt = Math.max(readyAt, now() + duration);
      return readyAt;
    }

    function remaining(at) {
      const current = Number.isFinite(at) ? at : now();
      return Math.max(0, readyAt - current);
    }

    function reset() {
      readyAt = 0;
    }

    return Object.freeze({
      note,
      reset,
      remaining,
      isLocked: (at) => remaining(at) > 0,
      durationFor,
      readyAt: () => readyAt,
      delayFor: (minimumMs, startedAt) => {
        const start = Number.isFinite(startedAt) ? startedAt : now();
        return Math.max(
          0,
          Math.max(start + Math.max(0, Number(minimumMs) || 0), readyAt) - now(),
        );
      },
    });
  }

  TK.runtime = TK.runtime || {};
  TK.runtime.createPresentationCoordinator = createPresentationCoordinator;
  TK.runtime.createTurnTimer = createTurnTimer;
  TK.runtime.presentationDurations = PRESENTATION_MS;
  TK.runtime.playerTurnLimitMs = PLAYER_TURN_LIMIT_MS;

  if (global.__tkGameBooted) return;

  const required = [
    "cardData",
    "rulesEngine",
    "opponentAI",
    "audio",
    "fxAnimation",
    "boardUI",
  ];
  const missing = required.filter((name) => !TK.modules[name]);
  if (missing.length) {
    const message = `게임 모듈 누락: ${missing.join(", ")}`;
    const loading = document.getElementById("game-loading");
    if (loading) {
      const copy = loading.querySelector(".loading-copy");
      if (copy) copy.textContent = message;
    }
    throw new Error(message);
  }

  global.__tkGameBooted = true;

  const root = document.getElementById("game-stage");
  const canvas = document.getElementById("game-canvas");
  const fxCanvas = document.getElementById("fx-canvas");
  const loading = document.getElementById("game-loading");
  const announcer = document.getElementById("game-announcer");
  const factionSelect = document.getElementById("faction-select");
  if (!root || !canvas || !fxCanvas) {
    throw new Error("게임 화면을 초기화할 수 없습니다.");
  }
  const fxContext = fxCanvas.getContext("2d");

  const cardData = TK.modules.cardData;
  const rulesEngine = TK.modules.rulesEngine;
  const aiFactory = TK.modules.opponentAI;
  const audio = TK.modules.audio.createAudio();
  let fx = null;
  let ui = null;
  let game = null;
  let stateSnapshot = null;
  let frame = 0;
  let lastTime = 0;
  let fxCanvasDirty = false;
  let pageHidden = false;
  const ownedTimers = new Set();
  let matchEpoch = 0;
  let pendingEvents = [];
  let aiBusy = false;
  let aiBusyEpoch = 0;
  let initializing = false;
  let selectedCommanderId = null;
  let opponentCommanderId = null;
  let playerTurnTimerKey = "";
  const COMMANDER_IDS = Object.freeze(["caocao", "liubei", "sunquan", "nomad"]);
  const presentation = createPresentationCoordinator({
    reducedMotion: () => Boolean(
      global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
    ),
  });
  const playerTurnTimer = createTurnTimer({
    durationMs: PLAYER_TURN_LIMIT_MS,
    onTick: (detail) => broadcast("turn:timer", { side: "player", ...detail }),
    onExpire: (context) => void expirePlayerTurn(context),
  });

  function seededRandom(seed) {
    let value = seed >>> 0 || 0x6d2b79f5;
    return function random() {
      value += 0x6d2b79f5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function cancelOwnedTimers() {
    Array.from(ownedTimers).forEach((timer) => {
      clearTimeout(timer.id);
      timer.settle(false);
    });
  }

  function cancelPlayerTurnTimer(resetKey) {
    playerTurnTimer.cancel();
    if (resetKey !== false) playerTurnTimerKey = "";
  }

  function wait(ms) {
    if (pageHidden) return Promise.resolve(false);
    return new Promise((resolve) => {
      const timer = {
        id: 0,
        settle(completed) {
          if (!ownedTimers.delete(timer)) return;
          resolve(Boolean(completed));
        },
      };
      timer.id = setTimeout(() => timer.settle(true), ms);
      ownedTimers.add(timer);
    });
  }

  async function waitForPresentationWindow(epoch, minimumMs) {
    const minimumReadyAt = performance.now() + Math.max(0, Number(minimumMs) || 0);
    while (epoch === matchEpoch) {
      const now = performance.now();
      const remaining = Math.max(
        0,
        minimumReadyAt - now,
        presentation.remaining(now),
      );
      if (remaining <= 1) return true;
      if (!await wait(Math.min(remaining, 100))) return false;
    }
    return false;
  }

  function refreshStateSnapshot() {
    stateSnapshot = game ? game.getState() : null;
    return stateSnapshot;
  }

  function getState() {
    return stateSnapshot;
  }

  function writeDataset(key, value) {
    const normalized = String(value);
    if (root.dataset[key] === normalized) return false;
    root.dataset[key] = normalized;
    return true;
  }

  function syncRuntimeDataset(state) {
    if (!state) return;
    const presentationLocked = presentation.isLocked();
    writeDataset("turn", state.turn);
    writeDataset("phase", state.phase);
    writeDataset("revision", state.revision);
    writeDataset("playerCommander", state.commanders?.player?.id || "");
    writeDataset("aiCommander", state.commanders?.ai?.id || "");
    writeDataset("aiBusy", aiBusy && aiBusyEpoch === matchEpoch);
    writeDataset("presentationLocked", presentationLocked);
    writeDataset(
      "inputLocked",
      state.phase === "playing"
      && (
        state.turn !== "player"
        || aiBusy
        || presentationLocked
      ),
    );
  }

  function syncAnnouncer(state) {
    if (!announcer || !state) return;
    const activeHero = state.heroes[state.turn];
    const outcomeLabel = state.winner === "player"
      ? "승리"
      : state.winner === "ai"
        ? "패배"
        : state.winner === "draw"
          ? "무승부"
          : "대전 종료";
    const nextText = state.phase === "ended"
      ? `${outcomeLabel}. 전투가 끝났습니다.`
      : `${state.turn === "player" ? "아군" : "적군"} 턴. 체력 ${activeHero.health}, 마나 ${activeHero.mana}/${activeHero.maxMana}.`;
    if (announcer.textContent !== nextText) announcer.textContent = nextText;
  }

  function broadcast(type, detail) {
    const payload = { ...(detail || {}) };
    if (!payload.side && payload.actor) payload.side = payload.actor;
    if (type === "card:play" && Number.isInteger(payload.boardIndex)) {
      payload.index = payload.boardIndex;
      payload.minion = {
        zone: "board",
        side: payload.side,
        index: payload.boardIndex,
      };
    }
    if (
      type === "attack:start" &&
      !payload.attacker &&
      Number.isInteger(payload.attackerIndex)
    ) {
      payload.attacker = {
        zone: "board",
        side: payload.actor,
        index: payload.attackerIndex,
      };
    }
    if (payload.absorbedByShield) {
      payload.blockedByShield = true;
      payload.shieldBroken = true;
    }
    /*
     * The board owns player-action locking.  This coordinator only paces the
     * asynchronous AI sequence, so opening draws and player actions can never
     * create an invisible second input lock outside the board UI.
     */
    if (
      aiBusy
      && game
      && stateSnapshot
      && stateSnapshot.phase === "playing"
      && stateSnapshot.turn === "ai"
    ) {
      presentation.note(type, payload);
    }
    if (initializing || !ui || !fx) {
      pendingEvents.push([type, payload]);
      return;
    }
    ui.handleEvent?.(type, payload);
    fx.handleEvent?.(type, payload);
    wakeFX();
    audio.handleEvent?.(type, payload);
  }

  function render(state) {
    if (!game || !ui) return null;
    const nextState = state || stateSnapshot || refreshStateSnapshot();
    if (!nextState) return null;
    stateSnapshot = nextState;
    ui.render(nextState);
    syncPlayerTurnTimer(nextState);
    syncRuntimeDataset(nextState);
    syncAnnouncer(nextState);
    return nextState;
  }

  function syncPlayerTurnTimer(state) {
    const shouldRun = Boolean(
      state
      && state.phase === "playing"
      && state.turn === "player"
      && !pageHidden
    );
    if (!shouldRun) {
      cancelPlayerTurnTimer(false);
      return;
    }
    const key = `${matchEpoch}:${Number(state.turnNumber) || 0}`;
    if (playerTurnTimerKey === key) return;
    playerTurnTimerKey = key;
    playerTurnTimer.start(Object.freeze({
      epoch: matchEpoch,
      turnNumber: Number(state.turnNumber) || 0,
      key,
    }));
  }

  async function expirePlayerTurn(timerContext) {
    const epoch = timerContext && timerContext.epoch;
    const turnNumber = Number(timerContext && timerContext.turnNumber) || 0;
    let state = stateSnapshot;
    if (
      epoch !== matchEpoch
      || !game
      || !state
      || state.phase !== "playing"
      || state.turn !== "player"
      || (Number(state.turnNumber) || 0) !== turnNumber
    ) {
      return;
    }

    const legalActions = game
      .getLegalActions("player")
      .filter((action) => action && action.type !== "endTurn");
    const random = seededRandom(
      ((Date.now() >>> 0) ^ ((Number(state.revision) || 0) * 0x9e3779b1)) >>> 0,
    );
    const chosen = legalActions.length
      ? legalActions[Math.floor(random() * legalActions.length)]
      : null;
    broadcast("turn:timeout", {
      side: "player",
      turnNumber,
      actionType: chosen ? chosen.type : "endTurn",
      autoSubmitted: true,
    });

    if (chosen) {
      applyAction(game, chosen);
      state = render(refreshStateSnapshot());
      if (!state || state.phase !== "playing" || state.turn !== "player") return;
      if (!await waitForPresentationWindow(epoch, 420)) return;
    }
    if (
      epoch !== matchEpoch
      || stateSnapshot?.phase !== "playing"
      || stateSnapshot?.turn !== "player"
      || (Number(stateSnapshot.turnNumber) || 0) !== turnNumber
    ) {
      return;
    }
    game.endTurn("player");
    presentation.reset();
    state = render(refreshStateSnapshot());
    if (state?.phase === "playing" && state.turn === "ai") {
      void runAITurn(epoch);
    }
  }

  function normalizeAction(action, side) {
    if (!action) return null;
    const type = String(action.type || "");
    if (type === "PLAY_CARD") {
      return {
        type: "playCard",
        side,
        handIndex: action.handIndex,
        target: action.target,
        placement: action.placement || null,
      };
    }
    if (type === "ATTACK") {
      return {
        type: "attack",
        side,
        attackerIndex: action.attackerIndex,
        target: action.target,
      };
    }
    if (type === "USE_COMMANDER_POWER") {
      return {
        type: "useCommanderPower",
        side,
        commanderId: action.commanderId || null,
        target: action.target || null,
      };
    }
    if (type === "END_TURN") return { type: "endTurn", side };
    return { ...action, side: action.side || side };
  }

  function applyAction(targetGame, action) {
    if (!targetGame || !action) return false;
    if (action.type === "playCard") {
      return targetGame.playCard(
        action.side,
        action.handIndex,
        action.target || null,
        action.placement || null,
      );
    }
    if (action.type === "attack") {
      return targetGame.attack(
        action.side,
        action.attackerIndex,
        action.target,
      );
    }
    if (
      action.type === "useCommanderPower"
      || action.type === "USE_COMMANDER_POWER"
    ) {
      return targetGame.useCommanderPower(
        action.side,
        action.target || null,
        action.commanderId || null,
      );
    }
    if (action.type === "endTurn") return targetGame.endTurn(action.side);
    if (action.type === "concede") return targetGame.concede(action.side);
    return false;
  }

  function simulationFor(action) {
    try {
      const clone = game.cloneForSimulation();
      applyAction(clone, action);
      return clone.getState();
    } catch {
      return stateSnapshot;
    }
  }

  async function runAITurn(epoch) {
    if (aiBusy || !game || epoch !== matchEpoch) return;
    aiBusy = true;
    aiBusyEpoch = epoch;
    ui.setThinking?.(true);
    render();
    const strategist = aiFactory.createAI({
      rng: seededRandom((Date.now() ^ 0x91e10da5) >>> 0),
    });

    try {
      let safety = 0;
      if (!await waitForPresentationWindow(epoch, AI_OPENING_DELAY_MS)) return;
      let state = stateSnapshot;
      while (
        epoch === matchEpoch &&
        state &&
        state.phase === "playing" &&
        state.turn === "ai" &&
        safety++ < 18
      ) {
        const legalActions = game
          .getLegalActions("ai")
          .filter((action) => action.type !== "endTurn");
        const action = strategist.chooseAction({
          state,
          legalActions,
          simulate: simulationFor,
          difficulty: "strategist",
        });

        if (!action) break;
        const actionDelay = action.type === "attack"
          ? AI_ATTACK_ACTION_DELAY_MS
          : AI_CARD_ACTION_DELAY_MS;
        if (!await waitForPresentationWindow(epoch, actionDelay)) return;
        if (epoch !== matchEpoch) return;
        applyAction(game, action);
        state = render(refreshStateSnapshot());
        if (!state || state.phase === "ended") return;
      }

      if (
        epoch === matchEpoch &&
        state &&
        state.phase === "playing" &&
        state.turn === "ai"
      ) {
        if (!await waitForPresentationWindow(epoch, AI_END_TURN_DELAY_MS)) return;
        if (
          epoch !== matchEpoch
          || stateSnapshot?.phase !== "playing"
          || stateSnapshot?.turn !== "ai"
        ) {
          return;
        }
        game.endTurn("ai");
        presentation.reset();
        render(refreshStateSnapshot());
      }
    } finally {
      if (epoch === matchEpoch && aiBusyEpoch === epoch) {
        aiBusy = false;
        aiBusyEpoch = 0;
        if (!pageHidden) {
          ui.setThinking?.(false);
          render();
        }
      }
    }
  }

  function chooseOpponentCommander(seed, playerCommander) {
    const choices = COMMANDER_IDS.filter((id) => id !== playerCommander);
    return choices[Math.abs(Number(seed) || 0) % choices.length] || "caocao";
  }

  function hideFactionSelection() {
    if (!factionSelect) return;
    factionSelect.hidden = true;
    factionSelect.setAttribute("aria-hidden", "true");
    canvas.removeAttribute("aria-hidden");
    canvas.tabIndex = 0;
  }

  function hideLoadingScreen() {
    if (!loading) return;
    loading.classList.add("is-hidden");
    loading.setAttribute?.("aria-hidden", "true");
  }

  function showFactionSelection() {
    cancelPlayerTurnTimer();
    cancelOwnedTimers();
    matchEpoch += 1;
    aiBusy = false;
    aiBusyEpoch = 0;
    presentation.reset();
    hideLoadingScreen();
    if (!factionSelect) {
      selectedCommanderId = selectedCommanderId || "liubei";
      startMatch(selectedCommanderId);
      return;
    }
    factionSelect.hidden = false;
    factionSelect.setAttribute("aria-hidden", "false");
    canvas.setAttribute("aria-hidden", "true");
    canvas.tabIndex = -1;
    const firstChoice = factionSelect.querySelector("[data-commander]");
    if (firstChoice instanceof HTMLElement) firstChoice.focus();
    if (announcer) {
      announcer.textContent =
        "진영을 선택하십시오. 네 지휘관의 능력을 확인한 뒤 선택할 수 있습니다.";
    }
  }

  function startMatch(commanderId) {
    if (commanderId && COMMANDER_IDS.includes(String(commanderId))) {
      selectedCommanderId = String(commanderId);
    }
    if (!selectedCommanderId) {
      showFactionSelection();
      return;
    }
    cancelOwnedTimers();
    cancelPlayerTurnTimer();
    matchEpoch += 1;
    const epoch = matchEpoch;
    pendingEvents = [];
    presentation.reset();
    aiBusy = false;
    aiBusyEpoch = 0;
    stateSnapshot = null;
    const seed = (Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0;
    opponentCommanderId = chooseOpponentCommander(seed, selectedCommanderId);
    const definitions = cardData.getCards();
    const tokens = cardData.getTokens?.() || {};
    initializing = true;
    try {
      game = rulesEngine.createGame({
        definitions,
        tokens,
        playerDeck: cardData.buildDeck(seed, selectedCommanderId),
        aiDeck: cardData.buildDeck(seed ^ 0xa53a9e77, opponentCommanderId),
        commanders: {
          player: selectedCommanderId,
          ai: opponentCommanderId,
        },
        playerCommander: selectedCommanderId,
        aiCommander: opponentCommanderId,
        seed,
        emit: broadcast,
      });
    } finally {
      initializing = false;
    }
    refreshStateSnapshot();

    if (!ui) {
      ui = TK.modules.boardUI.createBoardUI({
        root,
        canvas,
        getState,
        dispatch,
        requestAudioUnlock: () => audio.unlock(),
        keywordDefinitions: cardData.getKeywordGlossary?.() || {},
      });
    }

    if (!fx) {
      fx = TK.modules.fxAnimation.createFX({
        canvas: fxCanvas,
        getAnchor: (kind, detail) =>
          ui.getAnchor?.(kind, detail) || { x: 682, y: 384 },
        reducedMotion: global.matchMedia?.(
          "(prefers-reduced-motion: reduce)",
        ).matches,
      });
    }

    ui.setThinking?.(false);
    pendingEvents.splice(0).forEach(([type, detail]) => {
      ui.handleEvent?.(type, detail);
      fx.handleEvent?.(type, detail);
      audio.handleEvent?.(type, detail);
    });
    wakeFX();
    render(stateSnapshot);
    hideFactionSelection();
    hideLoadingScreen();

    if (stateSnapshot?.turn === "ai") void runAITurn(epoch);
  }

  function dispatch(rawAction) {
    audio.unlock();
    if (rawAction?.type === "SELECT_FACTION") {
      startMatch(rawAction.commanderId);
      return;
    }
    if (!game) return;
    const action = normalizeAction(rawAction, "player");

    if (rawAction?.type === "RESTART") {
      startMatch();
      return;
    }
    if (rawAction?.type === "TOGGLE_MUTE") {
      audio.setMuted(!audio.isMuted());
      render();
      return;
    }
    if (rawAction?.type === "CONCEDE") {
      cancelPlayerTurnTimer();
      game.concede("player");
      render(refreshStateSnapshot());
      return;
    }
    const state = stateSnapshot;
    if (
      !action ||
      !state ||
      state.phase !== "playing" ||
      state.turn !== "player" ||
      aiBusy ||
      presentation.isLocked()
    ) {
      return;
    }

    applyAction(game, action);
    const nextState = render(refreshStateSnapshot());
    if (nextState?.turn === "ai" && nextState.phase === "playing") {
      void runAITurn(matchEpoch);
    }
  }

  function fxHasActiveVisuals() {
    if (!fx) return false;
    if (typeof fx.hasActiveVisuals === "function") {
      return Boolean(fx.hasActiveVisuals());
    }
    /*
     * Compatibility fallback for a stale cached module: preserve visuals
     * instead of sleeping without a public activity contract.
     */
    return true;
  }

  function wakeFX() {
    if (
      pageHidden
      || frame
      || !fx
      || !fxContext
      || !fxHasActiveVisuals()
    ) {
      return false;
    }
    lastTime = performance.now();
    frame = requestAnimationFrame(animate);
    return true;
  }

  function animate(now) {
    frame = 0;
    if (!fx || !fxContext || pageHidden) return;

    if (!fxHasActiveVisuals()) {
      if (fxCanvasDirty) {
        fxContext.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
        fxCanvasDirty = false;
      }
      return;
    }

    const dt = Math.min(50, Math.max(0, now - lastTime));
    lastTime = now;
    fx.update(dt);
    fxContext.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    fx.render(fxContext);

    if (fxHasActiveVisuals()) {
      fxCanvasDirty = true;
      wakeFX();
    } else {
      /*
       * This clear belongs to the final active frame.  Rendering after the
       * update draws an empty FX state, so no second cleanup frame is needed.
       */
      fxCanvasDirty = false;
    }
  }

  global.addEventListener(
    "pagehide",
    () => {
      pageHidden = true;
      cancelPlayerTurnTimer();
      cancelOwnedTimers();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      ui?.destroy?.();
      fx?.destroy?.();
      audio.destroy?.();
    },
    { once: true },
  );

  global.__TK_GAME_DEBUG__ = Object.freeze({
    getState,
    getLegalActions: () => (game ? game.getLegalActions() : []),
    restartMatch: startMatch,
    showFactionSelection,
    selectFaction: (commanderId) => startMatch(commanderId),
    getRuntimeState: () => {
      const state = stateSnapshot;
      return Object.freeze({
        matchEpoch,
        aiBusy: aiBusy && aiBusyEpoch === matchEpoch,
        aiBusyEpoch,
        pendingTimerCount: ownedTimers.size,
        turnTimerActive: playerTurnTimer.isActive(),
        turnTimerRemainingMs: Math.ceil(playerTurnTimer.remainingMs()),
        presentationRemainingMs: Math.ceil(presentation.remaining()),
        presentationLocked: presentation.isLocked(),
        inputLocked: Boolean(
          state
          && state.phase === "playing"
          && (
            state.turn !== "player"
            || aiBusy
            || presentation.isLocked()
          )
        ),
      });
    },
  });
  if (factionSelect) {
    factionSelect.addEventListener("click", (event) => {
      const choice = event.target instanceof Element
        ? event.target.closest("[data-commander]")
        : null;
      if (!choice) return;
      dispatch({
        type: "SELECT_FACTION",
        commanderId: choice.getAttribute("data-commander"),
      });
    });
    showFactionSelection();
  } else {
    selectedCommanderId = "liubei";
    startMatch();
  }
})(globalThis);
