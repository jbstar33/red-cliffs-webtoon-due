(function registerAudioSystem(global) {
  "use strict";

  const TK = (global.TK = global.TK || { modules: {} });
  TK.modules = TK.modules || {};

  const SOUND_ALIASES = Object.freeze({
    "ui:hover": "hover",
    "ui:click": "click",
    "card:select": "select",
    "card:inspect": "select",
    "card:draw": "draw",
    "card:play": "play",
    "attack:swing": "attack",
    "attack:preview": "attack",
    "attack:hit": "impact",
    "attack:metal": "metal",
    "attack:blunt": "blunt",
    "attack:wood": "wood",
    "attack:cloth": "cloth",
    "attack:body": "body",
    "minion:damage": "damage",
    "hero:damage": "hero-damage",
    "shield:break": "shield",
    "guard:block": "guard",
    "minion:death": "death",
    "turn:start": "turn",
    "game:victory": "victory",
    "game:defeat": "defeat",
    "game:draw": "draw-finale",
    "commander:caocao": "commander-caocao",
    "commander:liubei": "commander-liubei",
    "commander:sunquan": "commander-sunquan",
    "commander:nomad": "commander-nomad",
  });

  const SOUND_POLICY = Object.freeze({
    hover: { duration: 0.09, cooldown: 0.035, same: 2, priority: 0 },
    click: { duration: 0.13, cooldown: 0.025, same: 3, priority: 1 },
    select: { duration: 0.28, cooldown: 0.045, same: 2, priority: 1 },
    draw: { duration: 0.48, cooldown: 0.075, same: 2, priority: 1 },
    play: { duration: 0.62, cooldown: 0.065, same: 3, priority: 2 },
    attack: { duration: 0.30, cooldown: 0.035, same: 3, priority: 1 },
    impact: { duration: 0.34, cooldown: 0.022, same: 4, priority: 2 },
    metal: { duration: 0.34, cooldown: 0.028, same: 4, priority: 2 },
    blunt: { duration: 0.31, cooldown: 0.028, same: 4, priority: 2 },
    wood: { duration: 0.3, cooldown: 0.028, same: 4, priority: 2 },
    cloth: { duration: 0.26, cooldown: 0.028, same: 4, priority: 2 },
    body: { duration: 0.32, cooldown: 0.028, same: 4, priority: 2 },
    damage: { duration: 0.29, cooldown: 0.022, same: 4, priority: 2 },
    "hero-damage": { duration: 0.52, cooldown: 0.035, same: 3, priority: 3 },
    shield: { duration: 0.46, cooldown: 0.045, same: 3, priority: 3 },
    guard: { duration: 0.38, cooldown: 0.06, same: 2, priority: 3 },
    death: { duration: 0.72, cooldown: 0.07, same: 3, priority: 3 },
    turn: { duration: 0.66, cooldown: 0.12, same: 2, priority: 2 },
    victory: { duration: 1.18, cooldown: 0.3, same: 1, priority: 4 },
    defeat: { duration: 1.18, cooldown: 0.3, same: 1, priority: 4 },
    "draw-finale": { duration: 1.12, cooldown: 0.3, same: 1, priority: 4 },
    effect: { duration: 0.55, cooldown: 0.035, same: 4, priority: 2 },
    "effect-success": { duration: 0.28, cooldown: 0.085, same: 3, priority: 2 },
    "effect-fizzle": { duration: 0.24, cooldown: 0.085, same: 2, priority: 2 },
    "effect-shield": { duration: 0.3, cooldown: 0.085, same: 3, priority: 3 },
    "effect-heal": { duration: 0.34, cooldown: 0.085, same: 3, priority: 2 },
    "effect-armor": { duration: 0.32, cooldown: 0.085, same: 3, priority: 2 },
    "effect-draw": { duration: 0.32, cooldown: 0.085, same: 3, priority: 2 },
    "effect-summon": { duration: 0.36, cooldown: 0.085, same: 3, priority: 2 },
    "effect-discount": { duration: 0.3, cooldown: 0.085, same: 3, priority: 2 },
    "effect-ready": { duration: 0.32, cooldown: 0.085, same: 3, priority: 2 },
    "commander-caocao": { duration: 0.48, cooldown: 0.08, same: 2, priority: 3 },
    "commander-liubei": { duration: 0.48, cooldown: 0.08, same: 2, priority: 3 },
    "commander-sunquan": { duration: 0.58, cooldown: 0.08, same: 2, priority: 3 },
    "commander-nomad": { duration: 0.48, cooldown: 0.08, same: 2, priority: 3 },
    invalid: { duration: 0.22, cooldown: 0.09, same: 2, priority: 1 },
  });
  const EFFECT_RESULT_DEDUPE_SECONDS = 0.085;

  const WEAPON_FAMILIES = Object.freeze({
    token_jiangdong_marine: "metal",
    shu_liu_bei: "metal",
    shu_guan_yu: "metal",
    shu_zhang_fei: "metal",
    shu_zhao_yun: "metal",
    shu_zhuge_liang: "cloth",
    shu_huang_zhong: "wood",
    wei_cao_cao: "metal",
    wei_sima_yi: "metal",
    wei_xiahou_dun: "metal",
    wei_dian_wei: "metal",
    wei_zhang_liao: "metal",
    wei_guo_jia: "wood",
    wu_sun_quan: "metal",
    wu_zhou_yu: "metal",
    wu_gan_ning: "metal",
    wu_lu_meng: "metal",
    wu_huang_gai: "wood",
    wu_sun_shangxiang: "wood",
    qun_lu_bu: "metal",
  });

  const NAME_WEAPON_FAMILIES = Object.freeze({
    "강동 수군": "metal",
    유비: "metal",
    관우: "metal",
    장비: "metal",
    조자룡: "metal",
    제갈량: "cloth",
    황충: "wood",
    조조: "metal",
    사마의: "metal",
    하후돈: "metal",
    전위: "metal",
    장료: "metal",
    곽가: "wood",
    손권: "metal",
    주유: "metal",
    감녕: "metal",
    여몽: "metal",
    황개: "wood",
    손상향: "wood",
    여포: "metal",
  });

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, Number(value) || 0));
  }

  function setParam(parameter, value, time) {
    if (!parameter) return;
    try {
      if (typeof parameter.setValueAtTime === "function") {
        parameter.setValueAtTime(value, time);
      } else {
        parameter.value = value;
      }
    } catch {
      parameter.value = value;
    }
  }

  function linearRamp(parameter, value, time) {
    if (!parameter) return;
    try {
      if (typeof parameter.linearRampToValueAtTime === "function") {
        parameter.linearRampToValueAtTime(value, time);
      } else {
        parameter.value = value;
      }
    } catch {
      parameter.value = value;
    }
  }

  function exponentialRamp(parameter, value, time) {
    if (!parameter) return;
    const safeValue = Math.max(0.0001, value);
    try {
      if (typeof parameter.exponentialRampToValueAtTime === "function") {
        parameter.exponentialRampToValueAtTime(safeValue, time);
      } else {
        parameter.value = safeValue;
      }
    } catch {
      parameter.value = safeValue;
    }
  }

  function setCurve(parameter, values, start, duration) {
    if (!parameter) return;
    try {
      if (typeof parameter.setValueCurveAtTime === "function") {
        parameter.setValueCurveAtTime(values, start, duration);
        return;
      }
    } catch {
      // Fall back to a simple envelope on older Web Audio implementations.
    }
    setParam(parameter, values[0], start);
    linearRamp(parameter, values[values.length - 1], start + duration);
  }

  function safeConnect(source, destination) {
    try {
      if (source && destination && typeof source.connect === "function") {
        source.connect(destination);
      }
    } catch {
      // A presentation subsystem must never interrupt gameplay.
    }
    return destination;
  }

  function safeDisconnect(node) {
    try {
      if (node && typeof node.disconnect === "function") node.disconnect();
    } catch {
      // Already disconnected.
    }
  }

  function stableHash(value) {
    const text = String(value == null ? "" : value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createAudio(options) {
    const config = options || {};
    const scope = config.global || global;
    const documentRef =
      Object.prototype.hasOwnProperty.call(config, "document")
        ? config.document
        : scope.document;
    const navigatorRef = config.navigator || scope.navigator || {};
    const AudioContextClass =
      config.AudioContext ||
      scope.AudioContext ||
      scope.webkitAudioContext ||
      null;
    const mobile =
      Boolean(config.mobile) ||
      Number(navigatorRef.maxTouchPoints || 0) > 0 ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(String(navigatorRef.userAgent || ""));
    let reducedMotion = Boolean(config.reducedMotion);
    if (config.reducedMotion == null && typeof scope.matchMedia === "function") {
      try {
        reducedMotion = Boolean(scope.matchMedia("(prefers-reduced-motion: reduce)").matches);
      } catch {
        reducedMotion = false;
      }
    }
    const configuredVoiceLimit = clamp(
      config.voiceLimit == null ? (mobile ? 12 : 22) : config.voiceLimit,
      6,
      32,
    );
    const voiceLimit = reducedMotion
      ? Math.min(configuredVoiceLimit, mobile ? 8 : 12)
      : configuredVoiceLimit;

    let context = null;
    let masterGain = null;
    let compressor = null;
    let noiseBuffer = null;
    let muted = Boolean(config.muted);
    let destroyed = false;
    let unlocked = false;
    let unlockPromise = null;
    let sequence = 0;
    const attackRecords = new Map();
    let activeAttack = null;
    let attackSequence = 0;
    let lastContactAt = -1;
    let pendingFinale = null;
    let pendingSemanticEvent = null;
    let lastSemanticAt = -1;
    let firstGestureCue = "";
    const activeVoices = new Set();
    const lastStarted = Object.create(null);
    const playCounts = Object.create(null);
    const scheduledSounds = [];
    const effectCueHistory = new Map();
    const effectDamageMerges = new Map();
    let effectCleanupTimer = null;
    let lastSound = "";
    let lastFinaleAt = -1;
    let duckedVoiceCount = 0;
    let resultDuckedVoiceCount = 0;
    const listenerTypes = ["pointerdown", "touchstart", "keydown"];
    let listenersAttached = false;
    let feedbackListenersAttached = false;
    let lastHoverCell = "";
    let lastHoverTime = -1;
    let lastNomadPowerAt = -1;

    try {
      if (config.muted == null && scope.localStorage) {
        muted = scope.localStorage.getItem("tk-audio-muted") === "1";
      }
    } catch {
      // Storage may be unavailable in private browsing or sandboxed frames.
    }

    function writeMutePreference() {
      try {
        if (scope.localStorage) {
          scope.localStorage.setItem("tk-audio-muted", muted ? "1" : "0");
        }
      } catch {
        // Mute still works for the current session.
      }
    }

    function currentTime() {
      return context && Number.isFinite(context.currentTime) ? context.currentTime : 0;
    }

    function removeUnlockListeners() {
      if (!documentRef || !listenersAttached) return;
      listenerTypes.forEach((type) => {
        try {
          documentRef.removeEventListener(type, onFirstInput, true);
        } catch {
          // Ignore lightweight DOM shims.
        }
      });
      listenersAttached = false;
    }

    function isInsideGame(target) {
      if (!target) return false;
      if (target.id === "game-canvas" || target.id === "game-stage") return true;
      try {
        return Boolean(
          typeof target.closest === "function" &&
            target.closest("#game-stage, [data-tk-audio], button, [role='button']"),
        );
      } catch {
        return false;
      }
    }

    function interfaceCue(event) {
      const target = event && event.target;
      if (!isInsideGame(target)) return "";
      const pointer =
        event && event.touches && event.touches[0]
          ? event.touches[0]
          : event;
      if (
        target &&
        target.id === "game-canvas" &&
        typeof target.getBoundingClientRect === "function" &&
        pointer &&
        Number.isFinite(pointer.clientY)
      ) {
        const bounds = target.getBoundingClientRect();
        const normalizedY = bounds.height
          ? (pointer.clientY - bounds.top) / bounds.height
          : 0;
        if (normalizedY >= 0.67 && normalizedY <= 1.03) {
          return "select";
        }
      }
      return "click";
    }

    function onInterfaceClick(event) {
      const cue = firstGestureCue || interfaceCue(event);
      firstGestureCue = "";
      if (!cue) return;
      if (currentTime() - lastSemanticAt <= 0.08) return;
      play(cue, { volume: cue === "select" ? 0.72 : 0.62 });
    }

    function onInterfaceMove(event) {
      if (
        mobile ||
        !event ||
        !event.target ||
        event.target.id !== "game-canvas" ||
        typeof event.target.getBoundingClientRect !== "function"
      ) {
        return;
      }
      const bounds = event.target.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const normalizedY = (event.clientY - bounds.top) / bounds.height;
      if (normalizedY < 0.68 || normalizedY > 1.02) {
        lastHoverCell = "";
        return;
      }
      const normalizedX = clamp((event.clientX - bounds.left) / bounds.width, 0, 0.999);
      const cell = String(Math.floor(normalizedX * 12));
      const now = currentTime();
      if (cell !== lastHoverCell && now - lastHoverTime > 0.06) {
        lastHoverCell = cell;
        lastHoverTime = now;
        play("hover", { volume: 0.48 });
      }
    }

    function attachFeedbackListeners() {
      if (
        !documentRef ||
        feedbackListenersAttached ||
        destroyed ||
        typeof documentRef.addEventListener !== "function"
      ) {
        return;
      }
      documentRef.addEventListener("click", onInterfaceClick, false);
      if (!mobile) documentRef.addEventListener("pointermove", onInterfaceMove, true);
      feedbackListenersAttached = true;
    }

    function removeFeedbackListeners() {
      if (!documentRef || !feedbackListenersAttached) return;
      try {
        documentRef.removeEventListener("click", onInterfaceClick, false);
        if (!mobile) {
          documentRef.removeEventListener("pointermove", onInterfaceMove, true);
        }
      } catch {
        // Ignore lightweight DOM shims.
      }
      feedbackListenersAttached = false;
    }

    function attachUnlockListeners() {
      if (
        !documentRef ||
        listenersAttached ||
        destroyed ||
        typeof documentRef.addEventListener !== "function"
      ) {
        return;
      }
      listenerTypes.forEach((type) => {
        try {
          documentRef.addEventListener(type, onFirstInput, {
            capture: true,
            passive: true,
          });
        } catch {
          documentRef.addEventListener(type, onFirstInput, true);
        }
      });
      listenersAttached = true;
    }

    function onFirstInput(event) {
      const cue = interfaceCue(event);
      if (cue && event && /pointerdown|touchstart/.test(event.type)) {
        firstGestureCue = cue;
      }
      void unlock().then((didUnlock) => {
        if (didUnlock && pendingSemanticEvent) {
          const pending = pendingSemanticEvent;
          pendingSemanticEvent = null;
          firstGestureCue = "";
          handleEvent(pending.type, pending.detail);
          return;
        }
        if (
          didUnlock &&
          cue &&
          event &&
          event.type === "keydown" &&
          currentTime() - lastSemanticAt > 0.08
        ) {
          firstGestureCue = "";
          play(cue, { volume: cue === "select" ? 0.68 : 0.48 });
        }
      });
    }

    function configureMasterBus() {
      masterGain = context.createGain();
      compressor = context.createDynamicsCompressor();
      setParam(masterGain.gain, muted ? 0 : reducedMotion ? 0.5 : 0.6, currentTime());
      setParam(compressor.threshold, -22, currentTime());
      setParam(compressor.knee, 16, currentTime());
      setParam(compressor.ratio, 6, currentTime());
      setParam(compressor.attack, 0.003, currentTime());
      setParam(compressor.release, 0.19, currentTime());
      safeConnect(masterGain, compressor);
      safeConnect(compressor, context.destination);
    }

    function primeMobileAudio() {
      try {
        if (!context.createBuffer || !context.createBufferSource) return;
        const buffer = context.createBuffer(1, 1, context.sampleRate || 44100);
        const source = context.createBufferSource();
        source.buffer = buffer;
        safeConnect(source, masterGain);
        source.start(0);
      } catch {
        // resume() is sufficient on most browsers.
      }
    }

    function unlock() {
      if (destroyed || !AudioContextClass) return Promise.resolve(false);
      if (unlocked && context && context.state === "running") {
        removeUnlockListeners();
        return Promise.resolve(true);
      }
      if (unlockPromise) return unlockPromise;
      let resumeResult;
      try {
        if (!context) {
          context = new AudioContextClass({
            latencyHint: mobile ? "interactive" : "balanced",
          });
          configureMasterBus();
        }
        primeMobileAudio();
        resumeResult =
          context.state === "suspended" && typeof context.resume === "function"
            ? context.resume()
            : undefined;
      } catch {
        unlocked = false;
        attachUnlockListeners();
        return Promise.resolve(false);
      }
      unlockPromise = Promise.resolve(resumeResult)
        .then(() => {
          unlocked = Boolean(context && context.state !== "suspended");
          if (unlocked) {
            removeUnlockListeners();
            attachFeedbackListeners();
          }
          return unlocked;
        })
        .catch(() => {
          unlocked = false;
          attachUnlockListeners();
          return false;
        })
        .finally(() => {
          unlockPromise = null;
        });
      return unlockPromise;
    }

    function getNoiseBuffer() {
      if (noiseBuffer || !context || !context.createBuffer) return noiseBuffer;
      const sampleRate = Math.min(48000, context.sampleRate || 44100);
      const length = Math.floor(sampleRate * (mobile ? 0.58 : 0.9));
      noiseBuffer = context.createBuffer(1, length, sampleRate);
      const channel = noiseBuffer.getChannelData(0);
      let random = 0x91e10da5;
      let previous = 0;
      for (let index = 0; index < channel.length; index += 1) {
        random ^= random << 13;
        random ^= random >>> 17;
        random ^= random << 5;
        const white = ((random >>> 0) / 2147483648 - 1) * 0.82;
        previous = previous * 0.18 + white * 0.82;
        channel[index] = previous;
      }
      return noiseBuffer;
    }

    function disposeVoice(voice, force) {
      if (!voice || voice.disposed) return;
      voice.disposed = true;
      if (voice.timer != null) {
        scope.clearTimeout(voice.timer);
        voice.timer = null;
      }
      if (force) {
        voice.stoppables.forEach((node) => {
          try {
            node.stop();
          } catch {
            // The node may already have ended.
          }
        });
      }
      voice.nodes.forEach(safeDisconnect);
      activeVoices.delete(voice);
    }

    function pruneVoices(now) {
      activeVoices.forEach((voice) => {
        if (voice.expires <= now || voice.disposed) disposeVoice(voice, false);
      });
    }

    function beginVoice(name, policy, optionsForSound) {
      if (
        destroyed ||
        muted ||
        !unlocked ||
        !context ||
        context.state === "suspended" ||
        !masterGain
      ) {
        return null;
      }
      const now = currentTime();
      const delay = clamp(optionsForSound.delay || 0, 0, 1.2);
      const startAt = now + delay;
      pruneVoices(now);
      if (
        lastStarted[name] != null &&
        now - lastStarted[name] < policy.cooldown
      ) {
        return null;
      }
      let sameCount = 0;
      activeVoices.forEach((voice) => {
        if (voice.name === name) sameCount += 1;
      });
      if (sameCount >= policy.same) return null;
      if (activeVoices.size >= voiceLimit) {
        let candidate = null;
        activeVoices.forEach((voice) => {
          if (
            voice.priority <= policy.priority &&
            (!candidate ||
              voice.priority < candidate.priority ||
              voice.started < candidate.started)
          ) {
            candidate = voice;
          }
        });
        if (!candidate) return null;
        disposeVoice(candidate, true);
      }
      lastStarted[name] = now;
      const duration =
        policy.duration *
        clamp(optionsForSound.durationScale || 1, 0.65, 1.5) *
        (reducedMotion ? 0.78 : 1);
      const voiceOutput = context.createGain();
      const mixHeadroom = clamp(0.92 / Math.sqrt(activeVoices.size + 1), 0.34, 0.92);
      setParam(voiceOutput.gain, mixHeadroom, now);
      let stereoPanner = null;
      if (typeof context.createStereoPanner === "function") {
        try {
          stereoPanner = context.createStereoPanner();
          setParam(
            stereoPanner.pan,
            clamp(optionsForSound.pan == null ? 0 : optionsForSound.pan, -0.72, 0.72),
            now,
          );
          safeConnect(voiceOutput, stereoPanner);
          safeConnect(stereoPanner, masterGain);
        } catch {
          stereoPanner = null;
          safeConnect(voiceOutput, masterGain);
        }
      } else {
        safeConnect(voiceOutput, masterGain);
      }
      const voice = {
        id: ++sequence,
        name,
        priority: policy.priority,
        started: startAt,
        startAt,
        expires: startAt + duration + 0.12,
        nodes: new Set(stereoPanner ? [voiceOutput, stereoPanner] : [voiceOutput]),
        stoppables: new Set(),
        output: voiceOutput,
        baseMix: mixHeadroom,
        disposed: false,
        timer: null,
      };
      activeVoices.add(voice);
      voice.timer = scope.setTimeout(
        () => disposeVoice(voice, false),
        Math.ceil((delay + duration + 0.2) * 1000),
      );
      return voice;
    }

    function track(voice, node, stoppable) {
      if (!node) return node;
      voice.nodes.add(node);
      if (stoppable) voice.stoppables.add(node);
      return node;
    }

    function makeGain(voice, initial) {
      const gain = track(voice, context.createGain(), false);
      setParam(gain.gain, initial == null ? 0.0001 : initial, currentTime());
      return gain;
    }

    function tone(voice, settings) {
      if (!context.createOscillator) return null;
      const start = settings.start;
      const end = start + settings.duration;
      const oscillator = track(voice, context.createOscillator(), true);
      const gain = makeGain(voice, 0.0001);
      oscillator.type = settings.type || "sine";
      setParam(oscillator.frequency, Math.max(20, settings.frequency), start);
      if (settings.endFrequency) {
        exponentialRamp(
          oscillator.frequency,
          Math.max(20, settings.endFrequency),
          end,
        );
      }
      if (settings.detune) setParam(oscillator.detune, settings.detune, start);
      setCurve(
        gain.gain,
        new Float32Array([
          0.0001,
          Math.max(0.0001, settings.gain),
          Math.max(0.0001, settings.sustain || settings.gain * 0.48),
          0.0001,
        ]),
        start,
        settings.duration,
      );
      safeConnect(oscillator, gain);
      safeConnect(gain, voice.output || masterGain);
      try {
        oscillator.start(start);
        oscillator.stop(end + 0.025);
      } catch {
        // Ignore a partially implemented AudioContext.
      }
      return oscillator;
    }

    function noise(voice, settings) {
      if (!context.createBufferSource) return null;
      const buffer = getNoiseBuffer();
      if (!buffer) return null;
      const start = settings.start;
      const source = track(voice, context.createBufferSource(), true);
      const gain = makeGain(voice, 0.0001);
      source.buffer = buffer;
      if (source.playbackRate) {
        setParam(source.playbackRate, settings.rate || 1, start);
      }
      let tail = source;
      if (context.createBiquadFilter) {
        const filter = track(voice, context.createBiquadFilter(), false);
        filter.type = settings.filter || "bandpass";
        setParam(filter.frequency, settings.frequency || 900, start);
        setParam(filter.Q, settings.q == null ? 0.8 : settings.q, start);
        if (settings.endFrequency) {
          exponentialRamp(filter.frequency, settings.endFrequency, start + settings.duration);
        }
        safeConnect(source, filter);
        tail = filter;
      }
      setCurve(
        gain.gain,
        new Float32Array([
          0.0001,
          Math.max(0.0001, settings.gain),
          Math.max(0.0001, settings.gain * 0.36),
          0.0001,
        ]),
        start,
        settings.duration,
      );
      safeConnect(tail, gain);
      safeConnect(gain, voice.output || masterGain);
      try {
        const maximumOffset = Math.max(0, buffer.duration - settings.duration);
        const noiseSeed = stableHash(
          settings.seed ||
          `${voice.name}:${voice.id}:${settings.frequency || 0}:${settings.start}`,
        );
        const offset = maximumOffset
          ? ((noiseSeed % 65536) / 65535) * maximumOffset
          : 0;
        source.start(start, offset, settings.duration);
        source.stop(start + settings.duration + 0.025);
      } catch {
        // Ignore a partially implemented AudioContext.
      }
      return source;
    }

    function soundHover(voice, volume) {
      const now = voice.startAt;
      tone(voice, {
        start: now,
        duration: 0.055,
        frequency: 1120,
        endFrequency: 1480,
        type: "sine",
        gain: 0.032 * volume,
      });
    }

    function soundClick(voice, volume) {
      const now = voice.startAt;
      noise(voice, {
        start: now,
        duration: 0.045,
        filter: "highpass",
        frequency: 1250,
        gain: 0.055 * volume,
      });
      tone(voice, {
        start: now,
        duration: 0.085,
        frequency: 260,
        endFrequency: 150,
        type: "triangle",
        gain: 0.055 * volume,
      });
    }

    function addPluckedString(voice, start, frequency, volume, brightness) {
      const bright = clamp(brightness == null ? 1 : brightness, 0.55, 1.5);
      noise(voice, {
        start,
        duration: 0.024,
        rate: 1.5,
        filter: "highpass",
        frequency: 1800 * bright,
        q: 0.9,
        gain: 0.034 * volume,
      });
      tone(voice, {
        start,
        duration: 0.24,
        frequency,
        endFrequency: frequency * 0.985,
        type: "triangle",
        gain: 0.071 * volume,
        sustain: 0.016 * volume,
      });
      tone(voice, {
        start: start + 0.003,
        duration: 0.17,
        frequency: frequency * 2.01,
        endFrequency: frequency * 1.98,
        type: "sine",
        gain: 0.023 * volume * bright,
        sustain: 0.006 * volume,
      });
    }

    function addGong(voice, start, frequency, volume, duration) {
      [1, 1.42, 1.93, 2.71].forEach((ratio, index) => {
        tone(voice, {
          start: start + index * 0.006,
          duration: duration * (1 - index * 0.1),
          frequency: frequency * ratio,
          endFrequency: frequency * ratio * (index ? 0.985 : 0.94),
          type: index === 0 ? "triangle" : "sine",
          gain: (0.092 / (index + 1)) * volume,
          sustain: (0.036 / (index + 1)) * volume,
        });
      });
    }

    function addXiaoBreath(voice, start, frequency, volume, rising) {
      noise(voice, {
        start,
        duration: 0.29,
        rate: 0.72,
        filter: "bandpass",
        frequency: frequency * 2.2,
        endFrequency: frequency * (rising ? 3.2 : 1.65),
        q: 2.8,
        gain: 0.016 * volume,
      });
      tone(voice, {
        start,
        duration: 0.31,
        frequency,
        endFrequency: frequency * (rising ? 1.035 : 0.975),
        type: "sine",
        gain: 0.043 * volume,
        sustain: 0.027 * volume,
      });
      tone(voice, {
        start: start + 0.012,
        duration: 0.27,
        frequency: frequency * 2.004,
        type: "sine",
        gain: 0.009 * volume,
      });
    }

    function soundSelect(voice, volume, pitch) {
      const now = voice.startAt;
      addPluckedString(voice, now, 330 * pitch, volume, 1.12);
      addPluckedString(voice, now + 0.045, 494 * pitch, volume * 0.72, 1.25);
    }

    function soundDraw(voice, volume, pitch) {
      const now = voice.startAt;
      noise(voice, {
        start: now,
        duration: 0.32,
        rate: 1.28,
        filter: "bandpass",
        frequency: 720,
        endFrequency: 2850,
        q: 0.55,
        gain: 0.082 * volume,
      });
      addPluckedString(voice, now + 0.16, 523 * pitch, volume * 0.76, 1.32);
      addPluckedString(voice, now + 0.235, 659 * pitch, volume * 0.58, 1.15);
    }

    function addWarDrum(voice, start, volume, weight, seed) {
      tone(voice, {
        start,
        duration: 0.38,
        frequency: 118 * weight,
        endFrequency: 48,
        type: "sine",
        gain: 0.25 * volume,
        sustain: 0.075 * volume,
      });
      noise(voice, {
        start,
        duration: 0.15,
        seed: seed ? `${seed}:skin` : "",
        filter: "lowpass",
        frequency: 410,
        gain: 0.105 * volume,
      });
    }

    function soundPlay(voice, volume, pitch) {
      const now = voice.startAt;
      noise(voice, {
        start: now,
        duration: 0.31,
        rate: 1.12,
        filter: "bandpass",
        frequency: 620,
        endFrequency: 2380,
        q: 0.7,
        gain: 0.075 * volume,
      });
      addWarDrum(voice, now + 0.13, volume, pitch);
      addGong(voice, now + 0.2, 196 * pitch, volume * 0.7, 0.38);
    }

    function normalizeMaterial(style) {
      return ["metal", "wood", "cloth", "body", "blunt"].includes(style)
        ? style
        : "metal";
    }

    function soundAttackSwing(voice, volume, style) {
      const now = voice.startAt;
      const material = normalizeMaterial(style);
      noise(voice, {
        start: now,
        duration: material === "cloth" ? 0.22 : 0.19,
        rate:
          material === "metal"
            ? 1.45
            : material === "wood"
              ? 0.92
              : material === "cloth"
                ? 1.18
                : 0.72,
        filter: "bandpass",
        frequency:
          material === "metal"
            ? 1850
            : material === "wood"
              ? 880
              : material === "cloth"
                ? 1180
                : 430,
        endFrequency:
          material === "metal"
            ? 520
            : material === "wood"
              ? 310
              : material === "cloth"
                ? 2780
                : 165,
        q: material === "cloth" ? 0.48 : 0.7,
        gain: (material === "body" ? 0.082 : 0.115) * volume,
      });
      if (material === "metal") {
        tone(voice, {
          start: now + 0.028,
          duration: 0.12,
          frequency: 1220,
          endFrequency: 760,
          type: "sine",
          gain: 0.019 * volume,
        });
      } else if (material === "wood") {
        addPluckedString(voice, now + 0.025, 168, volume * 0.36, 0.65);
      } else if (material === "cloth") {
        noise(voice, {
          start: now + 0.095,
          duration: 0.055,
          filter: "highpass",
          frequency: 2450,
          q: 0.45,
          gain: 0.034 * volume,
        });
      } else {
        tone(voice, {
          start: now + 0.018,
          duration: 0.14,
          frequency: 132,
          endFrequency: 84,
          type: "triangle",
          gain: 0.025 * volume,
        });
      }
    }

    function soundImpact(voice, volume, strength, style) {
      const material = normalizeMaterial(style);
      if (material === "blunt") soundBlunt(voice, volume, strength);
      else if (material === "wood") soundWood(voice, volume, strength);
      else if (material === "cloth") soundCloth(voice, volume, strength);
      else if (material === "body") soundBody(voice, volume, strength);
      else soundMetal(voice, volume, strength);
    }

    function soundMetal(voice, volume, strength) {
      const now = voice.startAt;
      noise(voice, {
        start: now,
        duration: 0.14,
        filter: "highpass",
        frequency: 2100,
        gain: 0.092 * volume,
      });
      [1, 1.47, 2.08].forEach((ratio, index) => {
        tone(voice, {
          start: now + index * 0.004,
          duration: 0.22 + index * 0.045,
          frequency: (430 + strength * 26) * ratio,
          endFrequency: (385 + strength * 20) * ratio,
          type: index === 0 ? "triangle" : "sine",
          gain: (0.105 / (index + 1)) * volume,
        });
      });
    }

    function soundBlunt(voice, volume, strength) {
      const now = voice.startAt;
      noise(voice, {
        start: now,
        duration: 0.18,
        filter: "lowpass",
        frequency: 650 + strength * 22,
        gain: 0.145 * volume,
      });
      tone(voice, {
        start: now,
        duration: 0.25,
        frequency: 142 + strength * 2,
        endFrequency: 46,
        type: "sine",
        gain: 0.22 * volume,
        sustain: 0.058 * volume,
      });
    }

    function soundWood(voice, volume, strength) {
      const now = voice.startAt;
      noise(voice, {
        start: now,
        duration: 0.14,
        rate: 0.84,
        filter: "bandpass",
        frequency: 620 + strength * 18,
        endFrequency: 275,
        q: 1.35,
        gain: 0.112 * volume,
      });
      [238, 357].forEach((frequency, index) => {
        tone(voice, {
          start: now + index * 0.018,
          duration: 0.2 - index * 0.025,
          frequency: frequency + strength * 3,
          endFrequency: frequency * 0.72,
          type: "triangle",
          gain: (0.092 / (index + 1)) * volume,
        });
      });
    }

    function soundCloth(voice, volume, strength) {
      const now = voice.startAt;
      noise(voice, {
        start: now,
        duration: 0.115,
        rate: 1.25,
        filter: "bandpass",
        frequency: 980 + strength * 26,
        endFrequency: 2460,
        q: 0.52,
        gain: 0.085 * volume,
      });
      noise(voice, {
        start: now + 0.018,
        duration: 0.055,
        rate: 1.8,
        filter: "highpass",
        frequency: 3150,
        q: 0.7,
        gain: 0.052 * volume,
      });
      tone(voice, {
        start: now + 0.012,
        duration: 0.12,
        frequency: 312,
        endFrequency: 228,
        type: "sine",
        gain: 0.025 * volume,
      });
    }

    function soundBody(voice, volume, strength) {
      const now = voice.startAt;
      noise(voice, {
        start: now,
        duration: 0.16,
        rate: 0.66,
        filter: "lowpass",
        frequency: 520 + strength * 12,
        endFrequency: 145,
        q: 0.48,
        gain: 0.135 * volume,
      });
      tone(voice, {
        start: now,
        duration: 0.24,
        frequency: 126 + strength * 2,
        endFrequency: 48,
        type: "sine",
        gain: 0.18 * volume,
        sustain: 0.048 * volume,
      });
      tone(voice, {
        start: now + 0.012,
        duration: 0.13,
        frequency: 212,
        endFrequency: 92,
        type: "triangle",
        gain: 0.055 * volume,
      });
    }

    function soundDamage(voice, volume, strength) {
      const now = voice.startAt;
      noise(voice, {
        start: now,
        duration: 0.17,
        filter: "bandpass",
        frequency: 740 + strength * 34,
        q: 0.62,
        gain: 0.115 * volume,
      });
      tone(voice, {
        start: now,
        duration: 0.2,
        frequency: 190 + strength * 4,
        endFrequency: 72,
        type: "triangle",
        gain: 0.105 * volume,
      });
    }

    function soundHeroDamage(voice, volume, strength) {
      const now = voice.startAt;
      addWarDrum(voice, now, volume * (0.72 + strength * 0.018), 0.82);
      noise(voice, {
        start: now + 0.018,
        duration: 0.31,
        filter: "bandpass",
        frequency: 520 + strength * 18,
        endFrequency: 145,
        q: 0.58,
        gain: 0.12 * volume,
      });
      addGong(voice, now + 0.045, 112 + strength * 2, volume * 0.58, 0.42);
    }

    function soundShield(voice, volume) {
      const now = voice.startAt;
      noise(voice, {
        start: now,
        duration: 0.3,
        filter: "highpass",
        frequency: 2600,
        gain: 0.14 * volume,
      });
      [980, 1370, 2010].forEach((frequency, index) => {
        tone(voice, {
          start: now + index * 0.018,
          duration: 0.24 + index * 0.05,
          frequency,
          endFrequency: frequency * 0.56,
          type: "triangle",
          gain: (0.098 / (index + 1)) * volume,
        });
      });
    }

    function soundGuard(voice, volume) {
      const now = voice.startAt;
      noise(voice, {
        start: now,
        duration: 0.08,
        filter: "bandpass",
        frequency: 980,
        q: 4.2,
        gain: 0.105 * volume,
      });
      [196, 147].forEach((frequency, index) => {
        tone(voice, {
          start: now + index * 0.065,
          duration: 0.19,
          frequency,
          endFrequency: frequency * 0.79,
          type: "triangle",
          gain: 0.075 * volume,
        });
      });
    }

    function soundDeath(voice, volume, pitch) {
      const now = voice.startAt;
      noise(voice, {
        start: now,
        duration: 0.48,
        filter: "lowpass",
        frequency: 980,
        endFrequency: 180,
        gain: 0.1 * volume,
      });
      tone(voice, {
        start: now,
        duration: 0.62,
        frequency: 285 * pitch,
        endFrequency: 62,
        type: "sawtooth",
        gain: 0.085 * volume,
        sustain: 0.025 * volume,
      });
      tone(voice, {
        start: now + 0.08,
        duration: 0.5,
        frequency: 178 * pitch,
        endFrequency: 54,
        type: "sine",
        gain: 0.13 * volume,
      });
      addGong(voice, now + 0.075, 126 * pitch, volume * 0.42, 0.52);
    }

    function soundTurn(voice, volume, friendly) {
      const now = voice.startAt;
      addWarDrum(voice, now, volume * 0.62, friendly ? 1 : 0.88);
      const notes = friendly ? [392, 523, 659] : [330, 294, 247];
      notes.forEach((frequency, index) => {
        addXiaoBreath(
          voice,
          now + 0.08 + index * 0.1,
          frequency,
          volume * (friendly ? 1 : 0.82),
          friendly,
        );
      });
    }

    function soundVictory(voice, volume) {
      const now = voice.startAt;
      addWarDrum(voice, now, volume * 0.72, 1);
      [392, 494, 587, 784].forEach((frequency, index) => {
        addXiaoBreath(
          voice,
          now + 0.075 + index * 0.145,
          frequency,
          volume * (index === 3 ? 1.12 : 0.78),
          true,
        );
      });
      [392, 494, 587, 784].forEach((frequency, index) => {
        addPluckedString(
          voice,
          now + 0.055 + index * 0.12,
          frequency * 1.5,
          volume * (0.4 + index * 0.055),
          1.22,
        );
      });
      addGong(voice, now + 0.54, 196, volume * 0.72, 0.52);
      addWarDrum(voice, now + 0.67, volume * 0.57, 0.94);
    }

    function soundDefeat(voice, volume) {
      const now = voice.startAt;
      addWarDrum(voice, now, volume * 0.68, 0.78);
      [330, 277, 220, 165].forEach((frequency, index) => {
        addXiaoBreath(
          voice,
          now + 0.075 + index * 0.155,
          frequency,
          volume * (index === 3 ? 0.82 : 0.64),
          false,
        );
      });
      [330, 277, 220, 165].forEach((frequency, index) => {
        tone(voice, {
          start: now + 0.045 + index * 0.13,
          duration: 0.26,
          frequency: frequency * 0.5,
          endFrequency: frequency * 0.42,
          type: "triangle",
          gain: (0.046 - index * 0.005) * volume,
          sustain: 0.018 * volume,
        });
      });
      addGong(voice, now + 0.53, 110, volume * 0.54, 0.54);
      noise(voice, {
        start: now + 0.69,
        duration: 0.28,
        rate: 0.62,
        filter: "lowpass",
        frequency: 470,
        endFrequency: 130,
        gain: 0.045 * volume,
      });
    }

    function soundDrawFinale(voice, volume) {
      const now = voice.startAt;
      // A palindromic suspended cadence reads as resolved combat without
      // borrowing either the victory rise or defeat fall.
      addWarDrum(voice, now, volume * 0.46, 0.86);
      [294, 392, 440, 392, 294].forEach((frequency, index) => {
        addPluckedString(
          voice,
          now + 0.055 + index * 0.115,
          frequency * 1.5,
          volume * (index === 2 ? 0.58 : 0.44),
          index === 2 ? 1.28 : 1.06,
        );
      });
      [294, 392, 294].forEach((frequency, index) => {
        addXiaoBreath(
          voice,
          now + 0.095 + index * 0.19,
          frequency,
          volume * (index === 1 ? 0.69 : 0.57),
          index === 0,
        );
      });
      addGong(voice, now + 0.57, 147, volume * 0.56, 0.46);
      addWarDrum(voice, now + 0.69, volume * 0.33, 0.86);
    }

    function soundEffect(voice, volume, kind) {
      const now = voice.startAt;
      if (/heal|armor|buff|ready/.test(kind)) {
        [440, 554, 659].forEach((frequency, index) => {
          tone(voice, {
            start: now + index * 0.08,
            duration: 0.3,
            frequency,
            endFrequency: frequency * 1.08,
            type: "sine",
            gain: 0.045 * volume,
          });
        });
        return;
      }
      if (/damage/.test(kind)) {
        noise(voice, {
          start: now,
          duration: 0.24,
          filter: "bandpass",
          frequency: 1850,
          endFrequency: 430,
          gain: 0.088 * volume,
        });
        tone(voice, {
          start: now + 0.02,
          duration: 0.34,
          frequency: 410,
          endFrequency: 115,
          type: "sawtooth",
          gain: 0.055 * volume,
        });
        return;
      }
      noise(voice, {
        start: now,
        duration: 0.34,
        filter: "bandpass",
        frequency: 820,
        endFrequency: 3050,
        gain: 0.07 * volume,
      });
      tone(voice, {
        start: now + 0.07,
        duration: 0.4,
        frequency: 370,
        endFrequency: 740,
        type: "sine",
        gain: 0.052 * volume,
      });
    }

    function soundEffectResult(voice, volume, cue) {
      const now = voice.startAt;
      if (cue === "effect-fizzle") {
        [246, 174].forEach((frequency, index) => {
          tone(voice, {
            start: now + index * 0.075,
            duration: 0.14,
            frequency,
            endFrequency: frequency * 0.82,
            type: "square",
            gain: 0.032 * volume,
          });
        });
        return;
      }
      if (cue === "effect-shield") {
        noise(voice, {
          start: now,
          duration: 0.12,
          filter: "highpass",
          frequency: 2400,
          endFrequency: 4100,
          gain: 0.05 * volume,
        });
        [980, 1470].forEach((frequency, index) => {
          tone(voice, {
            start: now + index * 0.035,
            duration: 0.22,
            frequency,
            endFrequency: frequency * 0.92,
            type: "triangle",
            gain: 0.038 * volume,
          });
        });
        return;
      }
      if (cue === "effect-heal") {
        [523, 659, 784].forEach((frequency, index) => {
          tone(voice, {
            start: now + index * 0.055,
            duration: 0.22,
            frequency,
            endFrequency: frequency * 1.04,
            type: "sine",
            gain: 0.035 * volume,
          });
        });
        return;
      }
      if (cue === "effect-armor") {
        noise(voice, {
          start: now,
          duration: 0.1,
          filter: "bandpass",
          frequency: 1280,
          endFrequency: 760,
          gain: 0.045 * volume,
        });
        [330, 495].forEach((frequency, index) => {
          tone(voice, {
            start: now + index * 0.045,
            duration: 0.25,
            frequency,
            endFrequency: frequency * 0.98,
            type: "triangle",
            gain: 0.042 * volume,
          });
        });
        return;
      }
      if (cue === "effect-draw") {
        noise(voice, {
          start: now,
          duration: 0.18,
          filter: "bandpass",
          frequency: 760,
          endFrequency: 2600,
          gain: 0.044 * volume,
        });
        addPluckedString(voice, now + 0.09, 659, volume * 0.5, 1.2);
        return;
      }
      if (cue === "effect-summon") {
        addWarDrum(voice, now, volume * 0.42, 0.78);
        addPluckedString(voice, now + 0.075, 294, volume * 0.42, 0.92);
        return;
      }
      if (cue === "effect-discount") {
        [880, 660, 990].forEach((frequency, index) => {
          tone(voice, {
            start: now + index * 0.045,
            duration: 0.16,
            frequency,
            endFrequency: frequency * 1.025,
            type: "triangle",
            gain: 0.034 * volume,
          });
        });
        return;
      }
      if (cue === "effect-ready") {
        addWarDrum(voice, now, volume * 0.34, 0.82);
        addWarDrum(voice, now + 0.085, volume * 0.42, 1.02);
        tone(voice, {
          start: now + 0.065,
          duration: 0.2,
          frequency: 392,
          endFrequency: 587,
          type: "sawtooth",
          gain: 0.026 * volume,
        });
        return;
      }
      [494, 659].forEach((frequency, index) => {
        tone(voice, {
          start: now + index * 0.055,
          duration: 0.2,
          frequency,
          endFrequency: frequency * 1.04,
          type: "sine",
          gain: 0.036 * volume,
        });
      });
    }

    function soundInvalid(voice, volume) {
      const now = voice.startAt;
      [138, 116].forEach((frequency, index) => {
        tone(voice, {
          start: now + index * 0.075,
          duration: 0.1,
          frequency,
          type: "square",
          gain: 0.035 * volume,
        });
      });
    }

    function soundCommanderCaoCao(voice, volume) {
      const now = voice.startAt;
      noise(voice, {
        start: now,
        duration: 0.13,
        seed: "commander-caocao:breath",
        rate: 0.68,
        filter: "bandpass",
        frequency: 520,
        endFrequency: 980,
        q: 2.4,
        gain: 0.022 * volume,
      });
      [392, 494, 587].forEach((frequency, index) => {
        tone(voice, {
          start: now + 0.055 + index * 0.046,
          duration: 0.28 - index * 0.018,
          frequency,
          endFrequency: frequency * 1.075,
          type: index === 0 ? "triangle" : "sine",
          gain: (0.04 - index * 0.006) * volume,
          sustain: 0.019 * volume,
        });
      });
    }

    function soundCommanderLiuBei(voice, volume) {
      const now = voice.startAt;
      noise(voice, {
        start: now,
        duration: 0.085,
        seed: "commander-liubei:clash",
        rate: 1.45,
        filter: "highpass",
        frequency: 2350,
        endFrequency: 4100,
        q: 1.9,
        gain: 0.06 * volume,
      });
      [720, 1080].forEach((frequency, index) => {
        tone(voice, {
          start: now + index * 0.006,
          duration: 0.17 - index * 0.025,
          frequency,
          endFrequency: frequency * 0.83,
          type: index === 0 ? "triangle" : "sine",
          gain: (0.045 - index * 0.012) * volume,
        });
      });
      tone(voice, {
        start: now + 0.095,
        duration: 0.3,
        frequency: 760,
        endFrequency: 238,
        type: "sawtooth",
        gain: 0.036 * volume,
        sustain: 0.012 * volume,
      });
    }

    function soundCommanderSunQuan(voice, volume) {
      const now = voice.startAt;
      noise(voice, {
        start: now,
        duration: 0.43,
        seed: "commander-sunquan:wave",
        rate: 0.58,
        filter: "bandpass",
        frequency: 225,
        endFrequency: 1380,
        q: 1.35,
        gain: 0.065 * volume,
      });
      noise(voice, {
        start: now + 0.12,
        duration: 0.26,
        seed: "commander-sunquan:wash",
        rate: 1.12,
        filter: "lowpass",
        frequency: 1850,
        endFrequency: 430,
        q: 0.72,
        gain: 0.034 * volume,
      });
      addWarDrum(
        voice,
        now + 0.04,
        volume * 0.34,
        0.62,
        "commander-sunquan:drum",
      );
    }

    function soundCommanderNomad(voice, volume) {
      const now = voice.startAt;
      noise(voice, {
        start: now,
        duration: 0.22,
        seed: "commander-nomad:whip",
        rate: 1.64,
        filter: "bandpass",
        frequency: 2850,
        endFrequency: 390,
        q: 1.8,
        gain: 0.062 * volume,
      });
      noise(voice, {
        start: now + 0.14,
        duration: 0.13,
        seed: "commander-nomad:seal",
        rate: 0.74,
        filter: "bandpass",
        frequency: 690,
        endFrequency: 265,
        q: 2.25,
        gain: 0.07 * volume,
      });
      [230, 345].forEach((frequency, index) => {
        tone(voice, {
          start: now + 0.145 + index * 0.006,
          duration: 0.18 - index * 0.025,
          frequency,
          endFrequency: index === 0 ? 145 : 210,
          type: "triangle",
          gain: (0.058 - index * 0.018) * volume,
          sustain: 0.011 * volume,
        });
      });
    }

    function normalizeSoundName(name) {
      const requested = String(name || "").toLowerCase();
      return SOUND_ALIASES[requested] || requested.replace(/_/g, "-");
    }

    function play(name, soundOptions) {
      const opts = soundOptions || {};
      const normalized = normalizeSoundName(name);
      const policy = SOUND_POLICY[normalized];
      if (!policy) return false;
      const voice = beginVoice(normalized, policy, opts);
      if (!voice) return false;
      const volumeLimit = /^commander-/.test(normalized) ? 0.9 : 1.35;
      const volume = clamp(opts.volume == null ? 1 : opts.volume, 0, volumeLimit);
      const pitch = clamp(opts.pitch == null ? 1 : opts.pitch, 0.72, 1.35);
      const strength = clamp(opts.strength == null ? opts.amount || 3 : opts.strength, 1, 12);
      try {
        if (normalized === "hover") soundHover(voice, volume);
        else if (normalized === "click") soundClick(voice, volume);
        else if (normalized === "select") soundSelect(voice, volume, pitch);
        else if (normalized === "draw") soundDraw(voice, volume, pitch);
        else if (normalized === "play") soundPlay(voice, volume, pitch);
        else if (normalized === "attack") {
          soundAttackSwing(voice, volume, normalizeMaterial(opts.material));
        } else if (normalized === "impact") {
          soundImpact(
            voice,
            volume,
            strength,
            normalizeMaterial(opts.material),
          );
        } else if (normalized === "metal") soundMetal(voice, volume, strength);
        else if (normalized === "blunt") soundBlunt(voice, volume, strength);
        else if (normalized === "wood") soundWood(voice, volume, strength);
        else if (normalized === "cloth") soundCloth(voice, volume, strength);
        else if (normalized === "body") soundBody(voice, volume, strength);
        else if (normalized === "damage") soundDamage(voice, volume, strength);
        else if (normalized === "hero-damage") {
          soundHeroDamage(voice, volume, strength);
        }
        else if (normalized === "shield") soundShield(voice, volume);
        else if (normalized === "guard") soundGuard(voice, volume);
        else if (normalized === "death") soundDeath(voice, volume, pitch);
        else if (normalized === "turn") soundTurn(voice, volume, opts.friendly !== false);
        else if (normalized === "victory") soundVictory(voice, volume);
        else if (normalized === "defeat") soundDefeat(voice, volume);
        else if (normalized === "draw-finale") soundDrawFinale(voice, volume);
        else if (normalized === "effect") soundEffect(voice, volume, String(opts.kind || ""));
        else if (/^effect-/.test(normalized)) {
          soundEffectResult(voice, volume, normalized);
        }
        else if (normalized === "commander-caocao") {
          soundCommanderCaoCao(voice, volume);
        }
        else if (normalized === "commander-liubei") {
          soundCommanderLiuBei(voice, volume);
        }
        else if (normalized === "commander-sunquan") {
          soundCommanderSunQuan(voice, volume);
        }
        else if (normalized === "commander-nomad") {
          soundCommanderNomad(voice, volume);
        }
        else if (normalized === "invalid") soundInvalid(voice, volume);
      } catch {
        disposeVoice(voice, true);
        return false;
      }
      lastSound = normalized;
      playCounts[normalized] = (playCounts[normalized] || 0) + 1;
      scheduledSounds.push({
        name: normalized,
        requestedAt: currentTime(),
        startAt: voice.startAt,
        priority: voice.priority,
        material: String(opts.material || ""),
        volume,
        pan: clamp(opts.pan == null ? 0 : opts.pan, -0.72, 0.72),
      });
      if (scheduledSounds.length > 192) scheduledSounds.shift();
      return true;
    }

    function inferAttackStyle(detail) {
      const data = detail || {};
      const attackerMeta = data.attackerMeta || {};
      const hint = String(
        data.material ||
          data.attackType ||
          data.weapon ||
          attackerMeta.material ||
          attackerMeta.attackType ||
          attackerMeta.weapon ||
          (data.card && data.card.portrait && data.card.portrait.weapon) ||
          "",
      ).toLowerCase();
      if (/fan|feather|cloth|silk|robe|부채|우선|비단|천/.test(hint)) {
        return "cloth";
      }
      if (/bow|staff|club|wood|bamboo|pole|활|궁|봉|곤|죽|목/.test(hint)) {
        return "wood";
      }
      if (/fist|body|unarmed|bare-hand|맨손|주먹/.test(hint)) {
        return "body";
      }
      if (/mace|hammer|blunt|망치/.test(hint)) {
        return "blunt";
      }
      if (/sword|blade|spear|halberd|metal|검|도|창|극/.test(hint)) {
        return "metal";
      }
      const cardId =
        data.cardId ||
        attackerMeta.cardId ||
        attackerMeta.id ||
        (data.card && data.card.id) ||
        "";
      if (WEAPON_FAMILIES[cardId]) return WEAPON_FAMILIES[cardId];
      const name = String(data.name || attackerMeta.name || (data.card && data.card.name) || "");
      if (NAME_WEAPON_FAMILIES[name]) return NAME_WEAPON_FAMILIES[name];
      const role = String(data.role || attackerMeta.role || "");
      if (/책사|strategist|scholar/i.test(role)) return "cloth";
      const identity = data.attackerId || attackerMeta.instanceId || data.instanceId || "";
      return stableHash(identity) % 5 === 0 ? "blunt" : "metal";
    }

    function pitchForFaction(card) {
      const faction = String((card && card.faction) || "");
      if (/촉|shu/i.test(faction)) return 1.06;
      if (/위|wei/i.test(faction)) return 0.91;
      if (/오|wu/i.test(faction)) return 1.15;
      return 1;
    }

    function contactDelay(identity) {
      return 0.345 + (stableHash(identity) % 36) / 1000;
    }

    function findAttackRecord(data) {
      const source = data && data.source;
      const sourceId = source && source.instanceId;
      if (sourceId && attackRecords.has(sourceId)) {
        return attackRecords.get(sourceId);
      }
      return activeAttack;
    }

    function rememberContact(record, name, data) {
      if (!record || record.scheduled) return false;
      const priority = {
        impact: 1,
        "hero-damage": 2,
        guard: 3,
        shield: 4,
      }[name] || 1;
      if (!record.contact || priority > record.contact.priority) {
        record.contact = {
          name,
          priority,
          amount: Number(data && data.amount) || 0,
          volume: name === "hero-damage" ? 1.05 : name === "shield" ? 1.05 : 0.98,
        };
      } else if (record.contact) {
        record.contact.amount = Math.max(
          record.contact.amount,
          Number(data && data.amount) || 0,
        );
      }
      return true;
    }

    function scheduleContact(record, data) {
      const now = currentTime();
      const combat =
        record || {
          id: `fallback-${++attackSequence}`,
          attackerId: data && data.attackerId,
          style: inferAttackStyle(data),
          contactAt: now + contactDelay(data && data.attackerId),
          contact: null,
          scheduled: false,
        };
      if (combat.scheduled) return false;
      const contact = combat.contact || {
        name: "impact",
        amount: Number(data && data.amount) || 0,
        volume: 0.94,
      };
      combat.scheduled = true;
      const startAt = Math.max(now, combat.contactAt);
      const played = play(contact.name, {
        material: combat.style,
        amount: Math.max(contact.amount, Number(data && data.amount) || 0),
        volume: contact.volume,
        delay: startAt - now,
      });
      lastContactAt = Math.max(lastContactAt, startAt);
      if (combat.attackerId) attackRecords.delete(combat.attackerId);
      if (activeAttack === combat) activeAttack = null;
      if (pendingFinale) {
        const winner = pendingFinale;
        pendingFinale = null;
        scheduleFinale(winner);
      }
      return played;
    }

    function duckLowPriority(finaleAt) {
      const now = currentTime();
      const fadeStart = Math.max(now, finaleAt - 0.12);
      activeVoices.forEach((voice) => {
        if (
          voice.disposed ||
          voice.priority > 2 ||
          !voice.output ||
          !voice.output.gain
        ) {
          return;
        }
        const parameter = voice.output.gain;
        try {
          parameter.cancelScheduledValues(fadeStart);
        } catch {
          // Optional on lightweight Web Audio implementations.
        }
        setParam(parameter, Math.max(0.0001, Number(parameter.value) || 0.4), fadeStart);
        linearRamp(parameter, 0.0001, finaleAt);
        duckedVoiceCount += 1;
      });
    }

    function scheduleFinale(winner) {
      if (activeAttack && !activeAttack.scheduled) {
        pendingFinale = winner || "draw";
        return true;
      }
      const now = currentTime();
      const contactBasis = lastContactAt >= now ? lastContactAt : now;
      const cadence = 0.25 + (stableHash(winner || "draw") % 151) / 1000;
      const finaleAt = contactBasis + cadence;
      lastFinaleAt = finaleAt;
      duckLowPriority(finaleAt);
      const name =
        winner === "player"
          ? "victory"
          : winner === "draw"
            ? "draw-finale"
            : "defeat";
      return play(name, {
        volume: winner === "draw" ? 0.88 : 1,
        delay: finaleAt - now,
      });
    }

    function effectSourceIdentity(data) {
      const source = data && data.source;
      if (typeof source === "string" || typeof source === "number") return String(source);
      if (source && typeof source === "object") {
        return String(
          source.instanceId ||
          source.id ||
          source.cardId ||
          source.commanderId ||
          "anonymous",
        );
      }
      const sourceCard = data && data.sourceCard;
      return String(
        (sourceCard && (sourceCard.instanceId || sourceCard.id)) ||
        (data && (data.instanceId || data.cardId || data.cardName)) ||
        "anonymous",
      );
    }

    function effectMergeKey(data) {
      const source = effectSourceIdentity(data);
      const op = String(
        (data && data.op) ||
        (data && data.source && typeof data.source === "object" && data.source.op) ||
        "",
      );
      return `${source}::${op}`;
    }

    function effectTargetIdentity(data) {
      const target = data && data.target;
      if (!target || typeof target !== "object") return "global";
      return [
        target.zone || "",
        target.side || "",
        Number.isInteger(target.index) ? target.index : "",
        target.instanceId || target.id || "",
      ].join(":");
    }

    function pruneEffectRecords(now) {
      effectCueHistory.forEach((at, key) => {
        if (now - at > EFFECT_RESULT_DEDUPE_SECONDS) effectCueHistory.delete(key);
      });
      effectDamageMerges.forEach((expires, key) => {
        if (now > expires) effectDamageMerges.delete(key);
      });
    }

    function cancelEffectCleanup() {
      if (effectCleanupTimer == null) return;
      scope.clearTimeout(effectCleanupTimer);
      effectCleanupTimer = null;
    }

    function scheduleEffectCleanup() {
      cancelEffectCleanup();
      effectCleanupTimer = scope.setTimeout(() => {
        effectCleanupTimer = null;
        effectCueHistory.clear();
        effectDamageMerges.clear();
      }, Math.ceil(EFFECT_RESULT_DEDUPE_SECONDS * 1000) + 24);
    }

    function effectResultCue(result) {
      if (!result || typeof result !== "object") return "";
      if (result.fizzled || result.success === false) return "effect-fizzle";
      if (result.blockedByShield) return "effect-shield";
      if (Number(result.actualHealing) > 0) return "effect-heal";
      if (Number(result.actualArmorGained) > 0) return "effect-armor";
      if (Number(result.actualDrawCount) > 0) return "effect-draw";
      if (Number(result.actualSummonCount) > 0) return "effect-summon";
      if (result.discountedTarget) return "effect-discount";
      if (result.readiedTarget) return "effect-ready";
      return "effect-success";
    }

    function effectResultAmount(result, fallback) {
      return Math.max(
        0,
        Number(
          result.actualHealing ||
          result.actualArmorGained ||
          result.actualDrawCount ||
          result.actualSummonCount ||
          result.actualDamage ||
          fallback ||
          0,
        ),
      );
    }

    function playEffectResult(data) {
      const result = data && data.result;
      const cue = effectResultCue(result);
      if (!cue) return null;
      const now = currentTime();
      pruneEffectRecords(now);
      const mergeKey = effectMergeKey(data);
      const dedupeKey = `${mergeKey}::${cue}::${effectTargetIdentity(data)}`;
      const previous = effectCueHistory.get(dedupeKey);
      if (previous != null && now - previous <= EFFECT_RESULT_DEDUPE_SECONDS) return true;
      effectCueHistory.set(dedupeKey, now);
      if (
        result.blockedByShield ||
        Number(result.actualDamage) > 0 ||
        /damage/i.test(String(data.op || ""))
      ) {
        effectDamageMerges.set(mergeKey, now + EFFECT_RESULT_DEDUPE_SECONDS);
      }
      scheduleEffectCleanup();
      duckForResultCue(now);
      return play(cue, {
        amount: effectResultAmount(result, data.amount),
        volume: cue === "effect-fizzle" ? 0.58 : cue === "effect-shield" ? 0.9 : 0.74,
      });
    }

    function duckForResultCue(cueAt) {
      activeVoices.forEach((voice) => {
        if (
          voice.disposed ||
          voice.priority > 2 ||
          /^effect-/.test(voice.name) ||
          !voice.output ||
          !voice.output.gain
        ) {
          return;
        }
        const parameter = voice.output.gain;
        const baseMix = Math.max(0.0001, Number(voice.baseMix) || 0.42);
        try {
          parameter.cancelScheduledValues(cueAt);
        } catch {
          // Optional on lightweight Web Audio implementations.
        }
        setParam(parameter, baseMix, cueAt);
        linearRamp(parameter, baseMix * 0.36, cueAt + 0.018);
        linearRamp(parameter, baseMix, cueAt + 0.16);
        resultDuckedVoiceCount += 1;
      });
    }

    function consumeMergedEffectDamage(data) {
      if (!data || !data.source || /attack|retaliation/i.test(String(data.source.op || ""))) {
        return false;
      }
      const now = currentTime();
      pruneEffectRecords(now);
      const expires = effectDamageMerges.get(effectMergeKey(data));
      return expires != null && now <= expires;
    }

    function semanticPriority(type) {
      if (type === "game:end") return 6;
      if (/^commander:/.test(type)) return 5;
      if (type === "card:play") return 5;
      if (type === "attack:start" || type === "attack:hit") return 4;
      if (type === "hero:damage" || type === "minion:damage") return 3;
      if (type === "turn:start" || type === "minion:death") return 2;
      return 1;
    }

    function actorPan(data) {
      const actor = String((data && (data.actor || data.side)) || "");
      if (actor === "player") return -0.28;
      if (actor === "ai") return 0.28;
      return 0;
    }

    function commanderVolume(data) {
      return data && (data.actor || data.side) === "player" ? 0.88 : 0.76;
    }

    function resetMatchAudio() {
      activeVoices.forEach((voice) => disposeVoice(voice, true));
      activeVoices.clear();
      cancelEffectCleanup();
      attackRecords.clear();
      effectCueHistory.clear();
      effectDamageMerges.clear();
      activeAttack = null;
      attackSequence = 0;
      pendingFinale = null;
      pendingSemanticEvent = null;
      lastContactAt = -1;
      lastFinaleAt = -1;
      lastSemanticAt = -1;
      firstGestureCue = "";
      lastHoverCell = "";
      lastHoverTime = -1;
      lastNomadPowerAt = -1;
      lastSound = "";
      scheduledSounds.length = 0;
      Object.keys(lastStarted).forEach((name) => {
        delete lastStarted[name];
      });
      return true;
    }

    function handleEvent(type, detail) {
      if (destroyed) return false;
      const data = detail || {};
      const eventType = String(type || "");
      if (eventType === "game:start") return resetMatchAudio();
      const isSemantic =
        eventType &&
        !/^(ui:|pointer:|button:|card:select|card:inspect)/.test(eventType);
      if (isSemantic) {
        lastSemanticAt = currentTime();
        if (!unlocked && unlockPromise) {
          const priority = semanticPriority(eventType);
          if (
            !pendingSemanticEvent ||
            priority > pendingSemanticEvent.priority
          ) {
            pendingSemanticEvent = {
              type: eventType,
              detail: { ...data },
              priority,
            };
          }
          return true;
        }
      }
      switch (eventType) {
        case "ui:hover":
        case "pointer:hover":
          if (reducedMotion) return false;
          return play("hover", { volume: 0.72 });
        case "ui:click":
        case "button:click":
          return play("click");
        case "card:select":
        case "card:inspect":
          return play("select", {
            pitch: pitchForFaction(data.card),
            volume: 0.82,
          });
        case "card:draw":
          if (data.opening) return false;
          return play("draw", {
            volume: data.actor === "player" ? 1 : 0.7,
            pitch: data.actor === "player" ? 1.03 : 0.9,
          });
        case "card:play":
          return play("play", {
            volume: data.actor === "player" ? 1 : 0.88,
            pitch: pitchForFaction(data.card),
          });
        case "commander:power": {
          const commanderId = String(data.commanderId || "").toLowerCase();
          const options = {
            volume: commanderVolume(data),
            pan: actorPan(data),
          };
          if (commanderId === "caocao") {
            return play("commander-caocao", options);
          }
          if (commanderId === "sunquan") {
            effectDamageMerges.set(
              `${commanderId}::commander_power`,
              currentTime() + EFFECT_RESULT_DEDUPE_SECONDS,
            );
            scheduleEffectCleanup();
            return play("commander-sunquan", options);
          }
          if (commanderId === "nomad") {
            lastNomadPowerAt = currentTime();
            return play("commander-nomad", options);
          }
          return false;
        }
        case "commander:reflect":
          return play("commander-liubei", {
            volume: commanderVolume(data),
            pan: actorPan(data),
          });
        case "commander:lock":
          if (
            lastNomadPowerAt >= 0 &&
            currentTime() - lastNomadPowerAt <= EFFECT_RESULT_DEDUPE_SECONDS
          ) {
            lastNomadPowerAt = -1;
            return true;
          }
          lastNomadPowerAt = -1;
          return play("commander-nomad", {
            volume: commanderVolume(data),
            pan: actorPan(data),
          });
        case "attack:start": {
          const style = inferAttackStyle(data);
          const attackerId =
            data.attackerId ||
            (data.attacker && data.attacker.instanceId) ||
            `attack-${++attackSequence}`;
          const record = {
            id: attackerId,
            attackerId,
            style,
            startedAt: currentTime(),
            contactAt: currentTime() + contactDelay(attackerId),
            contact: null,
            scheduled: false,
          };
          attackRecords.set(attackerId, record);
          activeAttack = record;
          return play("attack", { material: style, volume: 0.9 });
        }
        case "attack:hit": {
          const record =
            (data.attackerId && attackRecords.get(data.attackerId)) ||
            activeAttack;
          if (record && (data.blockedByShield || data.shieldBroken)) {
            rememberContact(record, "shield", data);
          } else if (record && data.blockedByGuard) {
            rememberContact(record, "guard", data);
          }
          return scheduleContact(record, data);
        }
        case "shield:break":
        case "minion:shield": {
          const record = findAttackRecord(data);
          if (record) return rememberContact(record, "shield", data);
          return play("shield", { volume: 1.05 });
        }
        case "guard:block":
        case "attack:guarded": {
          const record = findAttackRecord(data);
          if (record) return rememberContact(record, "guard", data);
          return play("guard", { volume: 0.94 });
        }
        case "minion:damage":
          if (consumeMergedEffectDamage(data)) return true;
          if (data.source && /attack|retaliation/.test(String(data.source.op))) {
            const record = findAttackRecord(data);
            if (record) {
              return rememberContact(
                record,
                data.absorbedByShield || data.blockedByShield || data.shieldBroken
                  ? "shield"
                  : data.blockedByGuard
                    ? "guard"
                  : "impact",
                data,
              );
            }
            return play(
              data.absorbedByShield || data.blockedByShield || data.shieldBroken
                ? "shield"
                : "impact",
              {
                material: inferAttackStyle(data.source),
                amount: data.amount,
                volume: 0.98,
              },
            );
          }
          if (data.absorbedByShield || data.blockedByShield || data.shieldBroken) {
            return play("shield", { volume: 1.05 });
          }
          return play("damage", { amount: data.amount, volume: 0.88 });
        case "hero:damage":
          if (consumeMergedEffectDamage(data)) return true;
          if (data.source && /attack|retaliation/.test(String(data.source.op))) {
            const record = findAttackRecord(data);
            if (record) {
              return rememberContact(
                record,
                data.armorAbsorbed > 0 && Number(data.amount || 0) === 0
                  ? "shield"
                  : "hero-damage",
                data,
              );
            }
          }
          if (data.armorAbsorbed > 0 && Number(data.amount || 0) === 0) {
            return play("shield", { volume: 0.95 });
          }
          return play("hero-damage", {
            amount: data.amount,
            volume: data.source && /attack|retaliation/.test(String(data.source.op))
              ? 1.05
              : 0.92,
          });
        case "minion:death":
          return play("death", {
            pitch: 0.92 + (stableHash(data.cardId || data.instanceId) % 15) / 100,
            delay: lastContactAt >= currentTime()
              ? lastContactAt + 0.045 - currentTime()
              : 0,
          });
        case "effect:trigger":
          {
            const resultPlayed = playEffectResult(data);
            if (resultPlayed != null) return resultPlayed;
          }
          if (data.op === "summon_token") return play("play", { volume: 0.56, pitch: 1.18 });
          if (/draw|뽑기/i.test(String(data.op || ""))) {
            return play("draw", { volume: 0.62, pitch: 1.12 });
          }
          if (/guard|수호/i.test(String(data.op || ""))) {
            return play("guard", { volume: 0.72 });
          }
          return play("effect", { kind: data.op, volume: 0.82 });
        case "turn:start":
          return play("turn", {
            friendly: data.actor === "player",
            volume: data.actor === "player" ? 1 : 0.72,
          });
        case "game:end":
          return scheduleFinale(data.winner);
        case "action:invalid":
          if (
            data.blockedByGuard ||
            /guard|수호/i.test(String(data.reason || ""))
          ) {
            return play("guard", { volume: 0.86 });
          }
          return play("invalid", { volume: 0.82 });
        default:
          return false;
      }
    }

    function setMuted(value) {
      muted = Boolean(value);
      writeMutePreference();
      if (context && masterGain) {
        const now = currentTime();
        try {
          masterGain.gain.cancelScheduledValues(now);
        } catch {
          // Optional AudioParam API.
        }
        setParam(masterGain.gain, masterGain.gain.value, now);
        linearRamp(
          masterGain.gain,
          muted ? 0 : reducedMotion ? 0.5 : 0.6,
          now + 0.035,
        );
      }
      return muted;
    }

    function isMuted() {
      return muted;
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      removeUnlockListeners();
      removeFeedbackListeners();
      activeVoices.forEach((voice) => disposeVoice(voice, true));
      activeVoices.clear();
      cancelEffectCleanup();
      attackRecords.clear();
      effectCueHistory.clear();
      effectDamageMerges.clear();
      activeAttack = null;
      pendingFinale = null;
      pendingSemanticEvent = null;
      lastNomadPowerAt = -1;
      noiseBuffer = null;
      safeDisconnect(masterGain);
      safeDisconnect(compressor);
      if (context && typeof context.close === "function") {
        try {
          void context.close();
        } catch {
          // Closing is best effort during page teardown.
        }
      }
      context = null;
      masterGain = null;
      compressor = null;
      unlocked = false;
    }

    attachUnlockListeners();

    return Object.freeze({
      unlock,
      handleEvent,
      play,
      setMuted,
      isMuted,
      destroy,
      _debug() {
        return {
          supported: Boolean(AudioContextClass),
          unlocked,
          destroyed,
          mobile,
          reducedMotion,
          voiceLimit,
          activeVoices: activeVoices.size,
          timers:
            Array.from(activeVoices).filter((voice) => voice.timer != null).length +
            (effectCleanupTimer == null ? 0 : 1),
          effectCleanupTimers: effectCleanupTimer == null ? 0 : 1,
          lastSound,
          playCounts: { ...playCounts },
          scheduledSounds: scheduledSounds.map((entry) => ({ ...entry })),
          pendingAttacks: attackRecords.size,
          effectCueRecords: effectCueHistory.size,
          effectDamageMerges: effectDamageMerges.size,
          pendingFinale,
          pendingSemanticEvent: pendingSemanticEvent
            ? pendingSemanticEvent.type
            : null,
          lastContactAt,
          lastFinaleAt,
          lastSemanticAt,
          duckedVoiceCount,
          resultDuckedVoiceCount,
          contextState: context ? context.state : "uninitialized",
          hasMasterGain: Boolean(masterGain),
          hasCompressor: Boolean(compressor),
          masterLevel: masterGain && masterGain.gain
            ? Number(masterGain.gain.value)
            : 0,
        };
      },
    });
  }

  TK.modules.audio = Object.freeze({ createAudio });
})(typeof globalThis !== "undefined" ? globalThis : window);
