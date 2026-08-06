(function registerThreeKingdomsFX(global) {
  "use strict";

  var TK = global.TK = global.TK || { modules: {} };
  TK.modules = TK.modules || {};

  var GOLD = "#f6cf68";
  var PALE_GOLD = "#fff2ad";
  var INK = "#121419";
  var RED = "#ff5a45";
  var BLUE = "#75d8ff";
  var ASH = "#a8a39b";
  var JADE = "#72efb2";
  var VIOLET = "#c394ff";
  var ORANGE = "#ffad4a";
  var STEEL = "#b9dcff";
  var HEAL_CYAN = "#8eeaff";
  var HEAL_WHITE = "#effdff";
  var REFLECT_GOLD = "#ffd76a";
  var WATER_TEAL = "#36d6ce";
  var WATER_BLUE = "#4d91ff";
  var ROPE_TAN = "#d5a55d";
  var SEAL_IVORY = "#ffe1a0";
  var FORMATION_FRONT = "#ffb35d";
  var FORMATION_REAR = "#9cc7ff";
  var BROTHER_GREEN = "#72ef9b";
  var STRATEGY_BLUE = "#83baff";
  var KINDLE_ORANGE = "#ff7b3d";
  var COUNTER_VIOLET = "#b596ff";
  var MAX_PARTICLES = 420;
  var MAX_JOBS = 72;
  var LAYER_UNDER = 0;
  var LAYER_ACTION = 1;
  var LAYER_FEEDBACK = 2;
  var LAYER_OVERLAY = 3;
  var SEMANTIC_EFFECT_OPS = Object.freeze({
    duel_target: true,
    sow_discord: true,
    weaken_enemy_front: true,
    empty_fort: true,
    patience_counter: true,
    apply_burning_all: true,
    faction_link: true,
    damage_enemy_row: true,
    reinforce_friendly_row: true,
    column_teamwork: true
  });

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutCubic(t) {
    var u = 1 - clamp(t, 0, 1);
    return 1 - u * u * u;
  }

  function easeOutBack(t) {
    var c1 = 1.70158;
    var c3 = c1 + 1;
    var u = clamp(t, 0, 1) - 1;
    return 1 + c3 * u * u * u + c1 * u * u;
  }

  function easeInCubic(t) {
    t = clamp(t, 0, 1);
    return t * t * t;
  }

  function easeInOutCubic(t) {
    t = clamp(t, 0, 1);
    return t < 0.5 ? 4 * t * t * t :
      1 - Math.pow(-2 * t + 2, 3) * 0.5;
  }

  function easeOutQuart(t) {
    var u = 1 - clamp(t, 0, 1);
    return 1 - u * u * u * u;
  }

  function phase(age, start, end) {
    return clamp((age - start) / Math.max(0.0001, end - start), 0, 1);
  }

  function sideColor(detail) {
    var side = detail && (detail.actor || detail.side ||
      (detail.source && detail.source.side));
    return side === "ai" ? "#f06a55" : "#5fd6bd";
  }

  function rgba(hex, alpha) {
    if (typeof hex !== "string" || hex.charAt(0) !== "#") {
      return hex || "rgba(255,255,255," + alpha + ")";
    }
    var raw = hex.slice(1);
    if (raw.length === 3) {
      raw = raw.charAt(0) + raw.charAt(0) +
        raw.charAt(1) + raw.charAt(1) +
        raw.charAt(2) + raw.charAt(2);
    }
    var num = parseInt(raw.slice(0, 6), 16);
    return "rgba(" + ((num >> 16) & 255) + "," + ((num >> 8) & 255) + "," +
      (num & 255) + "," + clamp(alpha, 0, 1) + ")";
  }

  function validPoint(value) {
    return value && Number.isFinite(value.x) && Number.isFinite(value.y);
  }

  function pointFromAnchor(anchor) {
    if (!anchor) return null;
    if (validPoint(anchor.center)) {
      return { x: anchor.center.x, y: anchor.center.y };
    }
    if (Number.isFinite(anchor.cx) && Number.isFinite(anchor.cy)) {
      return { x: anchor.cx, y: anchor.cy };
    }
    if (validPoint(anchor) && Number.isFinite(anchor.width) && Number.isFinite(anchor.height)) {
      return { x: anchor.x + anchor.width * 0.5, y: anchor.y + anchor.height * 0.5 };
    }
    if (validPoint(anchor)) return { x: anchor.x, y: anchor.y };
    if (Array.isArray(anchor) && anchor.length >= 2 &&
        Number.isFinite(anchor[0]) && Number.isFinite(anchor[1])) {
      return { x: anchor[0], y: anchor[1] };
    }
    return null;
  }

  function createParticle() {
    return {
      active: false,
      x: 0, y: 0, px: 0, py: 0,
      vx: 0, vy: 0,
      life: 0, maxLife: 1,
      size: 1, alpha: 1,
      color: GOLD, kind: "spark",
      gravity: 0, drag: 0,
      rotation: 0, spin: 0,
      stretch: 1
    };
  }

  function createFX(options) {
    options = options || {};
    var canvas = options.canvas || { width: 1365, height: 768 };
    var getAnchor = typeof options.getAnchor === "function" ? options.getAnchor : function () {
      return null;
    };
    var particles = new Array(MAX_PARTICLES);
    var jobs = [];
    var cursor = 0;
    var destroyed = false;
    var elapsed = 0;
    var shakePower = 0;
    var shakeTime = 0;
    var shakeX = 0;
    var shakeY = 0;
    var mediaQuery = null;
    var motionListener = null;
    var explicitReduced = options.reducedMotion;
    var reduceMotion = false;
    var poolReuses = 0;
    var peakParticles = 0;
    var peakJobs = 0;
    var activeParticles = 0;
    var effectHistory = [];
    var shieldResultHistory = [];
    var sourceBoardHistory = [];
    var EFFECT_COALESCE_SECONDS = 0.1;

    for (var p = 0; p < particles.length; p += 1) particles[p] = createParticle();

    function readReducedMotion() {
      if (typeof explicitReduced === "function") return !!explicitReduced();
      if (typeof explicitReduced === "boolean") return explicitReduced;
      if (explicitReduced && typeof explicitReduced.matches === "boolean") {
        return explicitReduced.matches;
      }
      return !!(mediaQuery && mediaQuery.matches);
    }

    function collapseForReducedMotion() {
      shakeTime = 0;
      shakePower = 0;
      shakeX = 0;
      shakeY = 0;
      for (var i = 0; i < jobs.length; i += 1) {
        if (!jobs[i].preserveDelay) jobs[i].age = Math.max(0, jobs[i].age);
        else jobs[i].age = Math.max(-0.85, jobs[i].age);
        jobs[i].duration = Math.min(jobs[i].duration, 0.35);
        if (Number.isFinite(jobs[i].cueAt)) jobs[i].cueAt = Math.min(jobs[i].cueAt, 0.04);
      }
      var retained = 0;
      for (var p = 0; p < particles.length; p += 1) {
        if (!particles[p].active) continue;
        retained += 1;
        if (retained > 24) {
          particles[p].active = false;
          activeParticles = Math.max(0, activeParticles - 1);
        }
      }
    }

    function syncReducedMotion() {
      var next = readReducedMotion();
      if (!reduceMotion && next) collapseForReducedMotion();
      reduceMotion = next;
    }

    if (typeof explicitReduced !== "boolean" && typeof explicitReduced !== "function" &&
        !(explicitReduced && typeof explicitReduced.matches === "boolean") &&
        typeof global.matchMedia === "function") {
      mediaQuery = global.matchMedia("(prefers-reduced-motion: reduce)");
    } else if (explicitReduced && typeof explicitReduced.matches === "boolean") {
      mediaQuery = explicitReduced;
    }
    reduceMotion = readReducedMotion();
    if (mediaQuery) {
      motionListener = syncReducedMotion;
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", motionListener);
      } else if (typeof mediaQuery.addListener === "function") {
        mediaQuery.addListener(motionListener);
      }
    }

    function dimensions() {
      return {
        width: Math.max(1, Number(canvas.width) || 1365),
        height: Math.max(1, Number(canvas.height) || 768)
      };
    }

    function centerFallback(role, detail) {
      var d = dimensions();
      var side = detail && (detail.side || detail.actor ||
        (detail.target && detail.target.side));
      if (role === "attacker") {
        return { x: d.width * 0.5, y: side === "ai" ? d.height * 0.31 : d.height * 0.69 };
      }
      if (role === "target") {
        return { x: d.width * 0.5, y: side === "player" ? d.height * 0.69 : d.height * 0.31 };
      }
      if (role === "hero") {
        return { x: d.width * 0.5, y: side === "ai" ? d.height * 0.14 : d.height * 0.86 };
      }
      if (role === "card") {
        return { x: d.width * 0.5, y: side === "ai" ? d.height * 0.22 : d.height * 0.78 };
      }
      return { x: d.width * 0.5, y: d.height * 0.5 };
    }

    function resolveAnchor(role, detail) {
      var result = null;
      var descriptor = detail && detail[role];
      var anchorDetail = detail && typeof detail === "object" ?
        Object.assign({}, detail) : {};
      if (!anchorDetail.side && anchorDetail.actor) anchorDetail.side = anchorDetail.actor;
      if (!Number.isInteger(anchorDetail.index)) {
        if (role === "minion" && Number.isInteger(anchorDetail.boardIndex)) {
          anchorDetail.index = anchorDetail.boardIndex;
        } else if (role === "card" && Number.isInteger(anchorDetail.handIndex)) {
          anchorDetail.index = anchorDetail.handIndex;
        }
      }
      var calls = [];
      if (descriptor) {
        calls.push(function () { return getAnchor(descriptor, anchorDetail); });
      }
      if (detail && detail.target && role === "target") {
        calls.push(function () { return getAnchor(detail.target, anchorDetail); });
      }
      if (detail && detail.attacker && role === "attacker") {
        calls.push(function () { return getAnchor(detail.attacker, anchorDetail); });
      }
      if (detail && detail.instanceId) {
        calls.push(function () { return getAnchor(detail.instanceId, anchorDetail); });
      }
      calls.push(
        function () { return getAnchor(role, anchorDetail); },
        function () { return getAnchor({ role: role, detail: anchorDetail }); }
      );
      for (var i = 0; i < calls.length; i += 1) {
        try {
          result = pointFromAnchor(calls[i]());
          if (result) return result;
        } catch {
          // A UI may only implement one of the supported getAnchor signatures.
        }
      }
      return centerFallback(role, detail);
    }

    function acquireParticle() {
      for (var i = 0; i < MAX_PARTICLES; i += 1) {
        var index = (cursor + i) % MAX_PARTICLES;
        if (!particles[index].active) {
          cursor = (index + 1) % MAX_PARTICLES;
          return particles[index];
        }
      }
      var reused = particles[cursor];
      cursor = (cursor + 1) % MAX_PARTICLES;
      poolReuses += 1;
      return reused;
    }

    function spawnParticle(config) {
      var particle = acquireParticle();
      if (!particle.active) activeParticles += 1;
      particle.active = true;
      particle.x = config.x;
      particle.y = config.y;
      particle.px = config.x;
      particle.py = config.y;
      particle.vx = config.vx || 0;
      particle.vy = config.vy || 0;
      particle.life = config.life || 0.6;
      particle.maxLife = particle.life;
      particle.size = config.size || 3;
      particle.alpha = config.alpha == null ? 1 : config.alpha;
      particle.color = config.color || GOLD;
      particle.kind = config.kind || "spark";
      particle.gravity = config.gravity || 0;
      particle.drag = config.drag || 0;
      particle.rotation = config.rotation || 0;
      particle.spin = config.spin || 0;
      particle.stretch = config.stretch || 1;
      peakParticles = Math.max(peakParticles, activeParticles);
      return particle;
    }

    function randomBetween(min, max) {
      return min + Math.random() * (max - min);
    }

    function burst(point, count, config) {
      config = config || {};
      count = reduceMotion ? Math.max(2, Math.ceil(count * 0.28)) : count;
      for (var i = 0; i < count; i += 1) {
        var angle = randomBetween(0, Math.PI * 2);
        var speed = randomBetween(config.minSpeed || 35, config.maxSpeed || 160);
        spawnParticle({
          x: point.x + randomBetween(-4, 4),
          y: point.y + randomBetween(-4, 4),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: randomBetween(config.minLife || 0.25, config.maxLife || 0.7),
          size: randomBetween(config.minSize || 2, config.maxSize || 5),
          alpha: config.alpha == null ? 1 : config.alpha,
          color: config.color || GOLD,
          kind: config.kind || "spark",
          gravity: config.gravity || 0,
          drag: config.drag == null ? 2.2 : config.drag,
          rotation: angle,
          spin: randomBetween(-8, 8)
        });
      }
    }

    function directedBurst(point, directionX, directionY, count, config) {
      config = config || {};
      count = reduceMotion ? Math.max(2, Math.ceil(count * 0.3)) : count;
      var length = Math.max(0.0001, Math.sqrt(
        directionX * directionX + directionY * directionY
      ));
      var nx = directionX / length;
      var ny = directionY / length;
      var normalX = -ny;
      var normalY = nx;
      for (var i = 0; i < count; i += 1) {
        var spread = randomBetween(-1, 1);
        var speed = randomBetween(config.minSpeed || 72, config.maxSpeed || 230);
        var forward = randomBetween(config.minForward == null ? 0.28 : config.minForward, 1);
        var lateral = spread * (config.spread == null ? 0.72 : config.spread);
        spawnParticle({
          x: point.x + randomBetween(-3, 3),
          y: point.y + randomBetween(-3, 3),
          vx: (nx * forward + normalX * lateral) * speed,
          vy: (ny * forward + normalY * lateral) * speed,
          life: randomBetween(config.minLife || 0.18, config.maxLife || 0.52),
          size: randomBetween(config.minSize || 2, config.maxSize || 7),
          alpha: config.alpha == null ? 1 : config.alpha,
          color: config.color || PALE_GOLD,
          kind: config.kind || "spark",
          gravity: config.gravity || 0,
          drag: config.drag == null ? 1.3 : config.drag,
          rotation: Math.atan2(ny * forward + normalY * lateral,
            nx * forward + normalX * lateral),
          spin: randomBetween(-7, 7),
          stretch: config.stretch || 1
        });
      }
    }

    function cappedPush(job) {
      if (jobs.length >= MAX_JOBS) jobs.shift();
      jobs.push(job);
      peakJobs = Math.max(peakJobs, jobs.length);
    }

    function addJob(kind, duration, data) {
      var job = data || {};
      job.kind = kind;
      var requestedDelay = Math.max(0, Number(job.delay) || 0);
      var appliedDelay = reduceMotion && !job.preserveDelay ? 0 :
        reduceMotion ? Math.min(requestedDelay, 0.85) : requestedDelay;
      job.age = -appliedDelay;
      job.duration = reduceMotion ? Math.min(duration, 0.35) : duration;
      job.layer = Number.isFinite(job.layer) ? job.layer : LAYER_ACTION;
      if (reduceMotion && Number.isFinite(job.cueAt)) job.cueAt = Math.min(job.cueAt, 0.04);
      job.cueFired = false;
      cappedPush(job);
      return job;
    }

    function identityPart(value) {
      if (value == null) return "";
      if (typeof value === "string" || typeof value === "number") return String(value);
      return String(value.instanceId || value.sourceId || value.cardId ||
        value.id || value.side || "");
    }

    function effectTargetKey(detail) {
      var target = detail && detail.target;
      if (!target || typeof target !== "object") return "global";
      var hasIndex = Number.isInteger(target.index) || Number.isInteger(target.boardIndex);
      var hasIdentity = target.instanceId || target.targetId;
      if (!hasIndex && !hasIdentity) return "global";
      return [
        target.zone || "board",
        target.side || "",
        hasIndex ? Number.isInteger(target.index) ? target.index : target.boardIndex : "",
        hasIdentity ? identityPart(target) : ""
      ].join(":");
    }

    function shouldCoalesceEffect(detail) {
      var op = String(detail && (detail.op || detail.effect || detail.name) || "effect");
      var source = identityPart(detail && (
        detail.source || detail.sourceId || detail.instanceId || detail.cardId
      )) || "anonymous";
      var targetKey = effectTargetKey(detail);
      var key = source + "::" + op + "::" + targetKey;
      for (var i = effectHistory.length - 1; i >= 0; i -= 1) {
        var record = effectHistory[i];
        if (elapsed - record.at > EFFECT_COALESCE_SECONDS) {
          effectHistory.splice(i, 1);
        } else if (record.key === key) {
          return true;
        }
      }
      effectHistory.push({ key: key, at: elapsed });
      if (effectHistory.length > 32) effectHistory.shift();
      return false;
    }

    function styleForEffect(detail) {
      var op = String(detail && (detail.op || detail.effect || detail.name) || "");
      if (/heal|치유/i.test(op)) {
        return { family: "heal", color: JADE, label: "회복", particle: "leaf" };
      }
      if (/armor|gain_armor|방어도/i.test(op)) {
        return { family: "shield", color: BLUE, label: "방어도", particle: "shard" };
      }
      if (/shield|방패/i.test(op)) {
        return { family: "shield", color: BLUE, label: "방패", particle: "shard" };
      }
      if (/guard|수호/i.test(op)) {
        return { family: "guard", color: STEEL, label: "수호", particle: "shard" };
      }
      if (/draw|card|패/i.test(op)) {
        return { family: "draw", color: PALE_GOLD, label: "패 보충", particle: "paper" };
      }
      if (/buff|attack|health|강화|증가/i.test(op)) {
        return { family: "buff", color: ORANGE, label: "강화", particle: "chevron" };
      }
      if (/poison|독/i.test(op)) {
        return { family: "poison", color: "#98e55f", label: "독", particle: "droplet" };
      }
      if (/damage|fire|피해|화공/i.test(op)) {
        return { family: "damage", color: RED, label: "피해", particle: "ember" };
      }
      if (/summon|소환/i.test(op)) {
        return { family: "summon", color: sideColor(detail), label: "원군", particle: "spark" };
      }
      return { family: "strategy", color: VIOLET, label: "계략", particle: "glyph" };
    }

    function ownerSide(detail) {
      if (!detail || typeof detail !== "object") return "player";
      return detail.actor || detail.side ||
        (detail.source && detail.source.side) ||
        (detail.target && detail.target.side) || "player";
    }

    function ownerEffectAnchor(detail, style) {
      var side = ownerSide(detail);
      var op = String(detail && (detail.op || detail.effect || detail.name) || "");
      var role = "card";
      var anchorDetail = Object.assign({}, detail, {
        actor: side,
        side: side,
        target: null
      });
      if (style.family === "heal" || /armor|gain_armor|방어도/i.test(op)) {
        role = "hero";
      } else if (style.family === "draw" || /reduce_random_hand_cost/i.test(op)) {
        role = side === "ai" ? "hero" : "card";
        delete anchorDetail.instanceId;
      } else if (style.family === "buff") {
        role = "minion";
        anchorDetail.index = Number.isInteger(detail.sourceIndex) ? detail.sourceIndex :
          Number.isInteger(detail.boardIndex) ? detail.boardIndex : 0;
        if (detail.source) anchorDetail.instanceId = identityPart(detail.source);
      } else if (detail.source) {
        anchorDetail.instanceId = identityPart(detail.source);
      }
      return {
        point: resolveAnchor(role, anchorDetail),
        role: role,
        side: side
      };
    }

    function resultReferencePoint(reference, fallbackRole, detail) {
      var side = reference && reference.side || ownerSide(detail);
      var anchorDetail = Object.assign({}, detail, {
        actor: side,
        side: side,
        target: null
      });
      var candidates = [];
      if (reference) {
        candidates.push(reference);
        if (reference.instanceId) candidates.push(reference.instanceId);
      }
      for (var index = 0; index < candidates.length; index += 1) {
        try {
          var point = pointFromAnchor(getAnchor(candidates[index], anchorDetail));
          if (point) return point;
        } catch {
          // Fall through to a semantic owner anchor.
        }
      }
      if (reference && Number.isInteger(reference.index)) {
        anchorDetail.index = reference.index;
      }
      return resolveAnchor(fallbackRole, anchorDetail);
    }

    function rememberPlayedSource(detail) {
      var index = Number.isInteger(detail && detail.boardIndex) ? detail.boardIndex :
        Number.isInteger(detail && detail.index) ? detail.index : null;
      var instanceId = identityPart(detail && (
        detail.instanceId || detail.card && detail.card.instanceId
      ));
      if (!instanceId || !Number.isInteger(index)) return;
      sourceBoardHistory.push({
        instanceId: instanceId,
        side: ownerSide(detail),
        index: index,
        at: elapsed
      });
      if (sourceBoardHistory.length > 24) sourceBoardHistory.shift();
    }

    function sourceBoardReference(detail) {
      var side = ownerSide(detail);
      var sourceCard = detail && detail.sourceCard;
      var source = detail && detail.source;
      var structured = sourceCard && typeof sourceCard === "object" ? sourceCard :
        source && typeof source === "object" ? source : null;
      if (structured && structured.zone === "board" &&
          Number.isInteger(structured.index)) {
        return {
          zone: "board",
          side: structured.side || side,
          index: structured.index,
          instanceId: identityPart(structured)
        };
      }
      var sourceId = identityPart(sourceCard) || identityPart(source);
      for (var index = sourceBoardHistory.length - 1; index >= 0; index -= 1) {
        var record = sourceBoardHistory[index];
        if (record.instanceId === sourceId && record.side === side) {
          return {
            zone: "board",
            side: record.side,
            index: record.index,
            instanceId: record.instanceId
          };
        }
      }
      var sourceIndex = Number.isInteger(detail && detail.sourceIndex) ?
        detail.sourceIndex : Number.isInteger(detail && detail.boardIndex) ?
          detail.boardIndex : null;
      if (Number.isInteger(sourceIndex)) {
        return {
          zone: "board",
          side: side,
          index: sourceIndex,
          instanceId: sourceId
        };
      }
      return sourceId ? { side: side, instanceId: sourceId } : null;
    }

    function isOwnerSidePoint(point, side) {
      if (!point) return false;
      var middle = dimensions().height * 0.5;
      return side === "ai" ? point.y < middle : point.y > middle;
    }

    function exactSourcePoint(reference, detail) {
      if (!reference) return null;
      var side = reference.side || ownerSide(detail);
      var anchorDetail = Object.assign({}, detail, {
        actor: side,
        side: side,
        index: reference.index,
        target: null
      });
      var candidates = [reference];
      if (reference.instanceId) candidates.push(reference.instanceId);
      for (var index = 0; index < candidates.length; index += 1) {
        try {
          var point = pointFromAnchor(getAnchor(candidates[index], anchorDetail));
          if (isOwnerSidePoint(point, side)) return point;
        } catch {
          // Try the next supported source signature.
        }
      }
      return null;
    }

    function safeOwnerSourceFallback(detail, reference) {
      var side = reference && reference.side || ownerSide(detail);
      var anchorDetail = Object.assign({}, detail, {
        actor: side,
        side: side,
        index: reference && Number.isInteger(reference.index) ? reference.index : 0,
        target: null
      });
      var roles = ["minion", "hero"];
      for (var index = 0; index < roles.length; index += 1) {
        try {
          var point = pointFromAnchor(getAnchor(roles[index], anchorDetail));
          if (isOwnerSidePoint(point, side)) return point;
        } catch {
          // Use the geometric owner-board fallback below.
        }
      }
      var d = dimensions();
      return { x: d.width * 0.5, y: d.height * (side === "ai" ? 0.32 : 0.68) };
    }

    function resultSourceAnchor(detail) {
      var reference = sourceBoardReference(detail);
      var point = exactSourcePoint(reference, detail) ||
        safeOwnerSourceFallback(detail, reference);
      return {
        x: point.x,
        y: point.y,
        reference: reference,
        side: reference && reference.side || ownerSide(detail),
        anchorDetail: Object.assign({}, detail, { target: null })
      };
    }

    function refreshFizzleSource(job) {
      if (!job.fizzled || !job.sourceReference) return;
      var point = exactSourcePoint(job.sourceReference, job.sourceAnchorDetail);
      if (!point) return;
      job.x = point.x;
      job.y = point.y;
      job.sourceAnchorResolved = true;
    }

    function effectFollowupKey(detail, targetOverride) {
      var source = detail && detail.source;
      var sourceId = identityPart(source) || identityPart(detail && detail.sourceCard) || "anonymous";
      var op = String(detail && detail.op ||
        source && typeof source === "object" && source.op || "");
      var target = targetOverride || detail && detail.target || {};
      return [
        sourceId,
        op,
        target.zone || "",
        target.side || "",
        Number.isInteger(target.index) ? target.index : "",
        target.instanceId || ""
      ].join("::");
    }

    function rememberShieldResult(detail, target) {
      shieldResultHistory.push({
        key: effectFollowupKey(detail, target),
        at: elapsed
      });
      if (shieldResultHistory.length > 16) shieldResultHistory.shift();
    }

    function consumeShieldResult(detail) {
      var key = effectFollowupKey(detail);
      for (var index = shieldResultHistory.length - 1; index >= 0; index -= 1) {
        var record = shieldResultHistory[index];
        if (elapsed - record.at > EFFECT_COALESCE_SECONDS) {
          shieldResultHistory.splice(index, 1);
        } else if (record.key === key) {
          shieldResultHistory.splice(index, 1);
          return true;
        }
      }
      return false;
    }

    function affectedTargetReference(entry) {
      if (!entry || typeof entry !== "object") return null;
      return entry.target && typeof entry.target === "object" ? entry.target : entry;
    }

    function addEffectAccent(detail, style, reference) {
      if (!reference || (!reference.zone && !reference.instanceId)) return;
      var fallbackRole = reference.zone === "hand" ? "card" :
        reference.zone === "hero" ? "hero" : "minion";
      var at = resultReferencePoint(reference, fallbackRole, detail);
      addJob("effect", 0.48, {
        x: at.x,
        y: at.y,
        color: style.color,
        family: style.family,
        label: "",
        particle: style.particle,
        amount: 0,
        accent: true,
        anchorRole: "target",
        anchorSide: reference.side || null,
        labelTravel: 24,
        layer: LAYER_FEEDBACK,
        cueAt: 0.1
      });
    }

    function addAffectedAccents(detail, style, result) {
      var affected = result && Array.isArray(result.affectedTargets) ?
        result.affectedTargets : [];
      var seen = Object.create(null);
      affected.forEach(function addOneAccent(entry) {
        var reference = affectedTargetReference(entry);
        if (!reference) return;
        var key = [
          reference.zone || "",
          reference.side || "",
          Number.isInteger(reference.index) ? reference.index : "",
          reference.instanceId || ""
        ].join(":");
        if (seen[key]) return;
        seen[key] = true;
        addEffectAccent(detail, style, reference);
      });
    }

    function shieldResultTargets(detail, result) {
      var affected = result && Array.isArray(result.affectedTargets) ?
        result.affectedTargets : [];
      var blocked = affected.filter(function blockedTarget(entry) {
        return Boolean(entry && entry.blockedByShield);
      }).map(affectedTargetReference);
      if (!blocked.length && detail && detail.target) blocked.push(detail.target);
      return blocked.filter(Boolean);
    }

    function triggerSummon(detail) {
      var at = resolveAnchor("minion", detail);
      addJob("summon", 0.94, {
        x: at.x, y: at.y,
        color: sideColor(detail),
        label: detail && detail.card && detail.card.name || "",
        layer: LAYER_ACTION,
        cueAt: 0.34
      });
    }

    function triggerAttack(detail) {
      var from = resolveAnchor("attacker", detail);
      var to = resolveAnchor("target", detail);
      var dx = to.x - from.x;
      var dy = to.y - from.y;
      var length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      var normalX = -dy / length;
      var normalY = dx / length;
      addJob("board-light", 0.58, {
        x1: from.x, y1: from.y, x2: to.x, y2: to.y,
        color: sideColor(detail),
        reaction: "attack",
        layer: LAYER_UNDER
      });
      addJob("attack", 0.58, {
        x1: from.x, y1: from.y, x2: to.x, y2: to.y,
        cx: (from.x + to.x) * 0.5 + normalX * Math.min(70, length * 0.18),
        cy: (from.y + to.y) * 0.5 + normalY * Math.min(70, length * 0.18),
        emitted: 0,
        contactOvershoot: 22,
        pathLength: length,
        color: sideColor(detail),
        layer: LAYER_ACTION,
        cueAt: 0.38
      });
    }

    function triggerImpact(detail) {
      var at = resolveAnchor("target", detail);
      var from = resolveAnchor("attacker", detail);
      var dx = at.x - from.x;
      var dy = at.y - from.y;
      var length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      var nx = dx / length;
      var ny = dy / length;
      addJob("board-light", 0.5, {
        x: at.x, y: at.y,
        nx: nx, ny: ny,
        color: sideColor(detail),
        reaction: "impact",
        delay: 0.31,
        layer: LAYER_UNDER
      });
      addJob("impact", 0.56, {
        x: at.x, y: at.y,
        nx: nx, ny: ny,
        angle: Math.atan2(ny, nx),
        impulseTravel: 20,
        recoilWidth: 74,
        recoilHeight: 94,
        color: sideColor(detail),
        delay: 0.31,
        layer: LAYER_FEEDBACK,
        cueAt: 0.055
      });
    }

    function triggerDamage(type, detail) {
      var role = type === "hero:damage" ? "hero" : "target";
      var at = resolveAnchor(role, detail);
      var amount = Math.abs(Number(detail && (detail.amount != null ? detail.amount :
        detail.damage != null ? detail.damage : detail.value)) || 0);
      if (detail && (detail.shieldBroken || detail.blockedByShield ||
          detail.absorbedByShield) && consumeShieldResult(detail)) {
        return;
      }
      if (amount > 0) {
        var isCombat = detail && detail.source &&
          /attack|retaliation/i.test(String(detail.source.op || ""));
        addJob("number", 0.62, {
          x: at.x, y: at.y - 8,
          text: "-" + amount,
          color: RED,
          size: type === "hero:damage" ? 52 : 42,
          delay: isCombat ? 0.36 : 0.09,
          layer: LAYER_FEEDBACK,
          cueAt: 0.035,
          hero: type === "hero:damage"
        });
      } else if (detail && (detail.shieldBroken || detail.blockedByShield ||
          detail.shield === "broken")) {
        addJob("number", 0.72, {
          x: at.x, y: at.y - 8,
          text: "막음",
          color: BLUE,
          size: 30,
          delay: 0.34,
          layer: LAYER_FEEDBACK,
          cueAt: 0.025
        });
      }
      if (detail && (detail.shieldBroken || detail.blockedByShield || detail.shield === "broken")) {
        triggerShieldBreak(detail);
      }
    }

    function triggerShieldBreak(detail) {
      var at = resolveAnchor("target", detail);
      var from = resolveAnchor("attacker", detail);
      var dx = at.x - from.x;
      var dy = at.y - from.y;
      var length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      var isCombat = detail && detail.source &&
        /attack|retaliation/i.test(String(detail.source.op || ""));
      addJob("shield", 0.72, {
        x: at.x, y: at.y,
        nx: dx / length,
        ny: dy / length,
        angle: Math.atan2(dy, dx),
        delay: isCombat ? 0.29 : 0.05,
        layer: LAYER_FEEDBACK,
        cueAt: 0.11
      });
    }

    function triggerDeath(detail) {
      var at = resolveAnchor("minion", detail);
      addJob("death-residue", 1.34, {
        x: at.x, y: at.y,
        delay: 0.44,
        seed: Math.abs(Math.round(at.x * 13 + at.y * 7)) % 97,
        layer: LAYER_UNDER
      });
      addJob("death", 1.18, {
        x: at.x, y: at.y,
        name: detail && detail.name || "",
        delay: 0.44,
        layer: LAYER_ACTION,
        cueAt: 0.18
      });
    }

    function triggerTurn(detail) {
      var side = detail && (detail.side || detail.actor || detail.turn);
      addJob("banner", 1.55, {
        title: side === "ai" ? "적군의 턴" : "나의 턴",
        subtitle: side === "ai" ? "상대가 계책을 고릅니다" : "천하를 호령할 차례입니다",
        enemy: side === "ai",
        layer: LAYER_OVERLAY
      });
    }

    function triggerEnd(detail) {
      var winner = detail && detail.winner;
      var won = winner === "player";
      var draw = winner === "draw";
      addJob("finale", 1.12, {
        won: won,
        draw: draw,
        nextConfetti: 0,
        delay: 0.9,
        preserveDelay: true,
        layer: LAYER_UNDER,
        cueAt: 0.08
      });
    }

    function triggerEffect(detail) {
      if (shouldCoalesceEffect(detail)) return;
      var style = styleForEffect(detail);
      var result = detail && detail.result;
      var semanticOp = String(detail && detail.op || "");
      if (SEMANTIC_EFFECT_OPS[semanticOp] &&
          !(result && (result.fizzled || result.success === false))) {
        return;
      }
      if (result && typeof result === "object") {
        if (result.fizzled || result.success === false) {
          var fizzledAt = resultSourceAnchor(detail);
          addJob("effect", 0.46, {
            x: fizzledAt.x,
            y: fizzledAt.y,
            color: ASH,
            labelColor: "#d8d0c2",
            family: "strategy",
            label: "불발",
            particle: "ash",
            amount: 0,
            fizzled: true,
            sourceReference: fizzledAt.reference,
            sourceAnchorDetail: fizzledAt.anchorDetail,
            sourceAnchorResolved: Boolean(fizzledAt.reference &&
              exactSourcePoint(fizzledAt.reference, fizzledAt.anchorDetail)),
            anchorRole: "source",
            anchorSide: fizzledAt.side,
            labelTravel: 24,
            layer: LAYER_FEEDBACK,
            cueAt: 0.08
          });
          return;
        }
        if (result.blockedByShield) {
          var affected = Array.isArray(result.affectedTargets) ? result.affectedTargets : [];
          var handledTarget = false;
          affected.forEach(function addBlockedOrAffected(entry) {
            var reference = affectedTargetReference(entry);
            if (!reference) return;
            if (entry && entry.blockedByShield) {
              var shieldAt = resultReferencePoint(reference, "minion", detail);
              addJob("shield", 0.72, {
                x: shieldAt.x,
                y: shieldAt.y,
                layer: LAYER_FEEDBACK,
                cueAt: 0.11,
                resultCue: true
              });
              rememberShieldResult(detail, reference);
              handledTarget = true;
            } else {
              addEffectAccent(detail, style, reference);
            }
          });
          if (!handledTarget && !affected.length) {
            shieldResultTargets(detail, result).forEach(function addResultShield(reference) {
              var at = resultReferencePoint(reference, "minion", detail);
              addJob("shield", 0.72, {
                x: at.x,
                y: at.y,
                layer: LAYER_FEEDBACK,
                cueAt: 0.11,
                resultCue: true
              });
              rememberShieldResult(detail, reference);
            });
          }
          return;
        }
      }
      var anchor = ownerEffectAnchor(detail, style);
      var at = anchor.point;
      var label = style.label;
      var amount = Math.abs(Number(detail && detail.amount) || 0);
      var showAmount = false;
      var anchorRole = anchor.role;
      var anchorSide = anchor.side;
      if (result && typeof result === "object") {
        if (Object.prototype.hasOwnProperty.call(result, "actualHealing")) {
          amount = Math.max(0, Number(result.actualHealing) || 0);
          showAmount = true;
        } else if (Object.prototype.hasOwnProperty.call(result, "actualArmorGained")) {
          amount = Math.max(0, Number(result.actualArmorGained) || 0);
          showAmount = true;
        } else if (Object.prototype.hasOwnProperty.call(result, "actualDrawCount")) {
          amount = Math.max(0, Number(result.actualDrawCount) || 0);
          showAmount = true;
        } else if (Object.prototype.hasOwnProperty.call(result, "actualSummonCount")) {
          amount = Math.max(0, Number(result.actualSummonCount) || 0);
          showAmount = true;
        }
        if (result.discountedTarget) {
          var discounted = result.discountedTarget;
          var reduction = Math.max(
            0,
            Number(discounted.costBefore) - Number(discounted.costAfter)
          );
          var handReference = Object.assign({
            zone: "hand",
            side: ownerSide(detail)
          }, detail.target || {}, discounted);
          at = resultReferencePoint(handReference, "card", detail);
          style = {
            family: "draw",
            color: PALE_GOLD,
            particle: "paper"
          };
          label = "비용 -" + reduction;
          amount = 0;
          showAmount = false;
          anchorRole = "hand-target";
          anchorSide = handReference.side;
        } else if (result.readiedTarget) {
          var readyReference = Object.assign({
            zone: "board",
            side: ownerSide(detail)
          }, result.readiedTarget, detail.target || {});
          at = resultReferencePoint(readyReference, "minion", detail);
          style = {
            family: "buff",
            color: ORANGE,
            particle: "chevron"
          };
          label = "재공격";
          amount = 0;
          showAmount = false;
          anchorRole = "board-target";
          anchorSide = readyReference.side;
        }
      }
      addJob("effect", 0.82, {
        x: at.x, y: at.y,
        color: style.color,
        family: style.family,
        label: label,
        particle: style.particle,
        amount: amount,
        showAmount: showAmount,
        anchorRole: anchorRole,
        anchorSide: anchorSide,
        labelTravel: 24,
        layer: LAYER_FEEDBACK,
        cueAt: 0.19
      });
      if (result && typeof result === "object") addAffectedAccents(detail, style, result);
    }

    function triggerTarget(detail) {
      var at = resolveAnchor("target", detail);
      addJob("target", 0.72, {
        x: at.x,
        y: at.y,
        color: sideColor(detail),
        layer: LAYER_FEEDBACK
      });
    }

    function triggerGuard(detail) {
      var at = resolveAnchor("target", detail);
      addJob("guard", 0.76, {
        x: at.x,
        y: at.y,
        color: STEEL,
        label: "수호",
        layer: LAYER_FEEDBACK,
        cueAt: 0.12
      });
    }

    function commanderIdFor(detail) {
      var id = String(detail && detail.commanderId || "").toLowerCase();
      var powerId = String(detail && detail.powerId || "").toLowerCase();
      if (id) return id;
      if (/caocao/.test(powerId)) return "caocao";
      if (/liubei/.test(powerId)) return "liubei";
      if (/sunquan/.test(powerId)) return "sunquan";
      if (/nomad/.test(powerId)) return "nomad";
      return "";
    }

    function commanderHeroAnchor(detail, side) {
      var reference = { zone: "hero", side: side || ownerSide(detail) };
      return resultReferencePoint(reference, "hero", detail);
    }

    function triggerCommanderEmphasis(detail, commanderId) {
      var presentations = {
        caocao: {
          label: "패왕의 휴식",
          color: HEAL_CYAN,
          secondaryColor: HEAL_WHITE
        },
        liubei: {
          label: "인덕의 반사",
          color: REFLECT_GOLD,
          secondaryColor: PALE_GOLD
        },
        sunquan: {
          label: "수공",
          color: WATER_TEAL,
          secondaryColor: WATER_BLUE
        },
        nomad: {
          label: "족쇄 명령",
          color: ROPE_TAN,
          secondaryColor: SEAL_IVORY
        }
      };
      var presentation = presentations[commanderId];
      if (!presentation) return;
      var side = detail.actor || detail.side || "player";
      var at = commanderHeroAnchor(detail, side);
      addJob("commander-emphasis", commanderId === "liubei" ? 0.72 : 0.9, {
        x: at.x,
        y: at.y,
        color: presentation.color,
        secondaryColor: presentation.secondaryColor,
        label: presentation.label,
        commanderId: commanderId,
        signature: commanderId + ":anime-power-cut",
        anchorRole: "hero",
        anchorSide: side,
        layer: LAYER_OVERLAY,
        cueAt: 0.08
      });
      shake(commanderId === "sunquan" ? 2.8 : 2.35);
    }

    function triggerCaoCaoPower(detail) {
      var side = detail.actor || detail.side || "player";
      var at = commanderHeroAnchor(detail, side);
      var result = detail.result || {};
      addJob("commander-heal", 0.78, {
        x: at.x,
        y: at.y,
        color: HEAL_CYAN,
        secondaryColor: HEAL_WHITE,
        label: "회복",
        amount: Math.max(0, Number(result.actualHealing) || 0),
        commanderId: "caocao",
        signature: "caocao:healing-rune",
        anchorRole: "hero",
        anchorSide: side,
        layer: LAYER_FEEDBACK,
        cueAt: 0.16
      });
    }

    function triggerLiuBeiReflect(detail) {
      var defendingSide = detail.actor || detail.side || "player";
      var attacker = detail.attacker || detail.target || {};
      var from = commanderHeroAnchor(detail, defendingSide);
      triggerCommanderEmphasis(detail, "liubei");
      var fallbackRole = attacker.zone === "hero" ? "hero" : "minion";
      var to = resultReferencePoint(attacker, fallbackRole, detail);
      var dx = to.x - from.x;
      var dy = to.y - from.y;
      var length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      var normalX = -dy / length;
      var normalY = dx / length;
      addJob("commander-reflect", 0.64, {
        x: to.x,
        y: to.y,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        cx: (from.x + to.x) * 0.5 + normalX * Math.min(58, length * 0.14),
        cy: (from.y + to.y) * 0.5 + normalY * Math.min(58, length * 0.14),
        nx: dx / length,
        ny: dy / length,
        pathLength: length,
        color: REFLECT_GOLD,
        secondaryColor: PALE_GOLD,
        label: "반사",
        commanderId: "liubei",
        signature: "liubei:golden-reflection",
        anchorRole: "attacker",
        anchorSide: attacker.side || null,
        layer: LAYER_FEEDBACK,
        cueAt: 0.26
      });
    }

    function sunQuanTargets(detail) {
      var result = detail && detail.result || {};
      var affected = Array.isArray(result.affectedTargets) ? result.affectedTargets : [];
      var references = affected.map(affectedTargetReference).filter(Boolean);
      if (!references.length) {
        var side = detail && detail.target && detail.target.side ||
          (ownerSide(detail) === "player" ? "ai" : "player");
        references.push({ zone: "hero", side: side });
      }
      return references;
    }

    function triggerSunQuanPower(detail) {
      var d = dimensions();
      var references = sunQuanTargets(detail);
      var points = references.map(function resolveFloodTarget(reference) {
        return {
          reference: reference,
          point: resultReferencePoint(
            reference,
            reference.zone === "hero" ? "hero" : "minion",
            detail
          )
        };
      });
      var boardPoints = points.filter(function boardOnly(entry) {
        return entry.reference.zone !== "hero";
      });
      var boardY = boardPoints.length ? boardPoints.reduce(function sumY(total, entry) {
        return total + entry.point.y;
      }, 0) / boardPoints.length : points[0].point.y;
      var startX = d.width * 0.06;
      var endX = d.width * 0.94;
      addJob("commander-flood", 0.86, {
        x: (startX + endX) * 0.5,
        y: boardY,
        x1: startX,
        y1: boardY,
        x2: endX,
        y2: boardY,
        color: WATER_TEAL,
        secondaryColor: WATER_BLUE,
        label: "수공",
        commanderId: "sunquan",
        signature: "sunquan:cross-board-flood",
        targetCount: points.length,
        anchorRole: "enemy-board",
        anchorSide: references[0] && references[0].side || null,
        layer: LAYER_UNDER,
        cueAt: 0.12
      });
      points.forEach(function addFloodContact(entry, index) {
        var normalizedX = clamp(entry.point.x / Math.max(1, d.width), 0, 1);
        addJob("commander-flood-hit", 0.58, {
          x: entry.point.x,
          y: entry.point.y,
          color: WATER_TEAL,
          secondaryColor: WATER_BLUE,
          label: "",
          commanderId: "sunquan",
          signature: "sunquan:flood-hit",
          targetKind: entry.reference.zone || "board",
          targetIndex: Number.isInteger(entry.reference.index) ?
            entry.reference.index : null,
          anchorRole: entry.reference.zone === "hero" ? "hero" : "minion",
          anchorSide: entry.reference.side || null,
          delay: 0.08 + normalizedX * 0.18 + index * 0.008,
          layer: LAYER_FEEDBACK,
          cueAt: 0.08
        });
      });
    }

    function triggerNomadLock(detail) {
      var target = detail.target || {};
      var at = resultReferencePoint(target, "minion", detail);
      var status = detail.status === "active" ? "active" : "pending";
      addJob("commander-lock", status === "active" ? 0.72 : 0.82, {
        x: at.x,
        y: at.y,
        color: ROPE_TAN,
        secondaryColor: SEAL_IVORY,
        label: status === "active" ? "봉쇄" : "올가미",
        status: status,
        commanderId: "nomad",
        signature: "nomad:lasso-seal",
        targetIndex: Number.isInteger(target.index) ? target.index : null,
        anchorRole: "minion",
        anchorSide: target.side || null,
        layer: LAYER_FEEDBACK,
        cueAt: status === "active" ? 0.09 : 0.16
      });
    }

    function triggerCommanderPower(detail) {
      var commanderId = commanderIdFor(detail);
      triggerCommanderEmphasis(detail, commanderId);
      if (commanderId === "caocao") {
        triggerCaoCaoPower(detail);
      } else if (commanderId === "sunquan") {
        triggerSunQuanPower(detail);
      }
      // Nomad publishes commander:lock immediately after commander:power.
      // The semantic lock event owns that visual so the lasso is never doubled.
    }

    function tacticalAnchor(reference, detail, fallbackRole) {
      return resultReferencePoint(
        reference || detail && detail.target || null,
        fallbackRole || "minion",
        detail || {}
      );
    }

    function addTacticalCue(kind, duration, detail, presentation) {
      presentation = presentation || {};
      var target = presentation.target || detail.target || null;
      var at = tacticalAnchor(target, detail, presentation.fallbackRole || "minion");
      return addJob(kind, Math.min(0.8, duration), {
        x: at.x,
        y: at.y,
        x1: presentation.x1,
        y1: presentation.y1,
        x2: presentation.x2,
        y2: presentation.y2,
        color: presentation.color || GOLD,
        secondaryColor: presentation.secondaryColor || PALE_GOLD,
        label: presentation.label || "",
        signature: presentation.signature || kind,
        status: presentation.status || detail.phase || detail.status || null,
        row: presentation.row || detail.row || detail.placement && detail.placement.row || null,
        slot: Number.isInteger(presentation.slot) ? presentation.slot :
          Number.isInteger(detail.slot) ? detail.slot :
            detail.placement && Number.isInteger(detail.placement.slot) ?
              detail.placement.slot : null,
        linkKind: presentation.linkKind || detail.linkKind || null,
        targetIndex: target && Number.isInteger(target.index) ? target.index : null,
        anchorRole: presentation.fallbackRole || "minion",
        anchorSide: target && target.side || detail.side || null,
        layer: Number.isFinite(presentation.layer) ? presentation.layer : LAYER_FEEDBACK,
        cueAt: Math.min(0.2, Number(presentation.cueAt) || 0.1)
      });
    }

    function triggerFormationPlace(detail) {
      var placement = detail.placement || {};
      var row = detail.row || placement.row || "front";
      addTacticalCue("formation-place", 0.58, detail, {
        target: detail.target,
        color: row === "rear" ? FORMATION_REAR : FORMATION_FRONT,
        secondaryColor: row === "rear" ? STRATEGY_BLUE : PALE_GOLD,
        label: row === "rear" ? "후열 배치" : "전열 배치",
        signature: "formation:" + row + ":place",
        row: row,
        slot: Number.isInteger(detail.slot) ? detail.slot : placement.slot,
        layer: LAYER_UNDER,
        cueAt: 0.08
      });
    }

    function triggerFormationBlock(detail) {
      var target = detail.target ||
        Array.isArray(detail.frontTargets) && detail.frontTargets[0] || null;
      addTacticalCue("formation-block", 0.66, detail, {
        target: target,
        color: STEEL,
        secondaryColor: FORMATION_FRONT,
        label: "전열 보호",
        signature: "formation:front-wall",
        layer: LAYER_FEEDBACK,
        cueAt: 0.12
      });
    }

    function firstAffectedTarget(detail) {
      var affected = detail && detail.affectedTargets;
      if (!Array.isArray(affected) || !affected.length) return detail && detail.target || null;
      return affected[0] && (affected[0].target || affected[0]) || null;
    }

    function triggerRowStrike(detail) {
      var row = detail.row === "rear" ? "rear" : "front";
      addTacticalCue("row-strike", 0.72, detail, {
        target: firstAffectedTarget(detail),
        color: row === "rear" ? FORMATION_REAR : FORMATION_FRONT,
        secondaryColor: RED,
        label: row === "rear" ? "후열 일제 공격" : "전열 일제 공격",
        signature: "formation:row-strike:" + row,
        row: row,
        layer: LAYER_ACTION,
        cueAt: 0.16
      });
    }

    function triggerRowReinforce(detail) {
      var row = detail.row === "rear" ? "rear" : "front";
      addTacticalCue("row-reinforce", 0.72, detail, {
        target: firstAffectedTarget(detail),
        color: row === "rear" ? FORMATION_REAR : STEEL,
        secondaryColor: JADE,
        label: row === "rear" ? "후열 보강" : "전열 보강",
        signature: "formation:row-reinforce:" + row,
        row: row,
        cueAt: 0.12
      });
    }

    function triggerFormationTeamwork(detail) {
      var source = sourceBoardReference(detail) || {
        zone: "board",
        side: detail.side || detail.actor,
        instanceId: identityPart(detail.source)
      };
      addTacticalCue("formation-teamwork", 0.78, detail, {
        target: source,
        color: FORMATION_FRONT,
        secondaryColor: FORMATION_REAR,
        label: "전후열 협공",
        signature: "formation:column-teamwork",
        slot: detail.slot,
        layer: LAYER_OVERLAY,
        cueAt: 0.15
      });
    }

    function triggerFactionLink(detail) {
      var linkKind = detail.linkKind || detail.result && detail.result.linkKind || "";
      var presentation = {
        brotherhood: { color: BROTHER_GREEN, secondary: PALE_GOLD, label: "의형제" },
        strategy: { color: STRATEGY_BLUE, secondary: PALE_GOLD, label: "군략" },
        kindle: { color: KINDLE_ORANGE, secondary: GOLD, label: "연화" },
        raid: { color: ROPE_TAN, secondary: SEAL_IVORY, label: "약탈" }
      }[linkKind] || { color: VIOLET, secondary: PALE_GOLD, label: detail.linkName || "연계" };
      var source = sourceBoardReference(detail) ||
        (detail.source && typeof detail.source === "object" ? detail.source : {
          zone: "board",
          side: detail.side || detail.actor,
          instanceId: identityPart(detail.source)
        });
      addTacticalCue("faction-link", 0.74, detail, {
        target: source,
        color: presentation.color,
        secondaryColor: presentation.secondary,
        label: detail.linkName || presentation.label,
        signature: "faction-link:" + (linkKind || "unknown"),
        linkKind: linkKind,
        cueAt: 0.14
      });
    }

    function triggerDuel(type, detail) {
      var source = detail.source || detail.attacker || null;
      var target = detail.target || null;
      var from = tacticalAnchor(source, detail, "minion");
      var to = tacticalAnchor(target, detail, "minion");
      var discord = type.indexOf("discord:") === 0;
      if (type === "duel:start" || type === "discord:start") {
        addTacticalCue("duel-start", 0.72, detail, {
          target: target,
          x1: from.x,
          y1: from.y,
          x2: to.x,
          y2: to.y,
          color: discord ? COUNTER_VIOLET : RED,
          secondaryColor: discord ? JADE : PALE_GOLD,
          label: discord ? "반간계" : "일기토",
          signature: discord ? "discord:crossed-orders" : "duel:crossing-blades",
          layer: LAYER_ACTION,
          cueAt: 0.2
        });
      } else {
        addTacticalCue("duel-hit", 0.56, detail, {
          target: target,
          color: discord ? COUNTER_VIOLET : RED,
          secondaryColor: discord ? JADE : PALE_GOLD,
          label: discord
            ? detail.weakestDied || detail.strongestDied ? "이간 성공" : "동료 격돌"
            : detail.targetDied ? "승부" : "격돌",
          signature: discord ? "discord:betrayal-hit" : "duel:verdict",
          cueAt: 0.07
        });
      }
    }

    function triggerStatus(type, detail) {
      var target = detail.target || null;
      if (type === "status:burn") {
        addTacticalCue("status-burn", 0.6, detail, {
          target: target,
          color: KINDLE_ORANGE,
          secondaryColor: "#ffd36a",
          label: detail.phase === "tick" ? "화상 " + (Number(detail.amount) || 1) : "화상",
          signature: "status:burn:" + (detail.phase || "applied"),
          status: detail.phase || "applied",
          cueAt: 0.08
        });
      } else if (type === "status:counter") {
        addTacticalCue("status-counter", 0.7, detail, {
          target: target,
          color: COUNTER_VIOLET,
          secondaryColor: STRATEGY_BLUE,
          label: detail.phase === "released" ? "반계" : "인내",
          signature: "status:counter:" + (detail.phase || "stored"),
          status: detail.phase || "stored",
          cueAt: detail.phase === "released" ? 0.14 : 0.08
        });
      } else if (type === "status:intimidate") {
        addTacticalCue("status-intimidate", 0.62, detail, {
          target: target,
          color: RED,
          secondaryColor: INK,
          label: "호통 -" + (Number(detail.amount) || 1),
          signature: "status:intimidate",
          cueAt: 0.1
        });
      } else if (type === "status:empty-fort") {
        addTacticalCue("status-empty-fort", 0.76, detail, {
          target: target,
          fallbackRole: "hero",
          color: HEAL_WHITE,
          secondaryColor: STRATEGY_BLUE,
          label: detail.phase === "armed" ? "공성계" : "허실",
          signature: "status:empty-fort:" + (detail.phase || "blocked"),
          status: detail.phase || "blocked",
          layer: LAYER_OVERLAY,
          cueAt: 0.12
        });
      } else if (type === "status:raid") {
        addTacticalCue("status-raid", 0.68, detail, {
          target: target,
          color: ROPE_TAN,
          secondaryColor: SEAL_IVORY,
          label: detail.phase === "active" ? "공격 봉쇄" : "약탈",
          signature: "status:raid:" + (detail.phase || "pending"),
          status: detail.phase || "pending",
          cueAt: 0.11
        });
      }
    }

    function handleEvent(type, detail) {
      if (destroyed) return;
      detail = detail || {};
      switch (type) {
        case "game:start":
          effectHistory.length = 0;
          shieldResultHistory.length = 0;
          sourceBoardHistory.length = 0;
          addJob("banner", 1.8, {
            title: "천하의 판이 열립니다",
            subtitle: "영웅을 지휘해 적장을 쓰러뜨리십시오",
            enemy: false,
            layer: LAYER_OVERLAY
          });
          break;
        case "turn:start":
          triggerTurn(detail);
          break;
        case "card:draw": {
          var drawAt = resolveAnchor("card", detail);
          addJob("draw", 0.68, {
            x: drawAt.x,
            y: drawAt.y,
            enemy: (detail.actor || detail.side) === "ai",
            burned: Boolean(detail.burned),
            layer: LAYER_ACTION,
            cueAt: 0.31
          });
          break;
        }
        case "card:play":
          rememberPlayedSource(detail);
          triggerSummon(detail);
          break;
        case "attack:start":
          triggerAttack(detail);
          break;
        case "attack:hit":
          triggerImpact(detail);
          break;
        case "minion:damage":
        case "hero:damage":
          triggerDamage(type, detail);
          break;
        case "minion:death":
          triggerDeath(detail);
          break;
        case "shield:break":
        case "minion:shield":
          triggerShieldBreak(detail);
          break;
        case "guard:block":
        case "minion:guard":
          triggerGuard(detail);
          break;
        case "target:select":
        case "target:selected":
        case "combat:target":
          triggerTarget(detail);
          break;
        case "effect:trigger":
          triggerEffect(detail);
          break;
        case "commander:power":
          triggerCommanderPower(detail);
          break;
        case "commander:reflect":
          triggerLiuBeiReflect(detail);
          break;
        case "commander:lock":
          triggerNomadLock(detail);
          break;
        case "formation:place":
          triggerFormationPlace(detail);
          break;
        case "formation:block":
          triggerFormationBlock(detail);
          break;
        case "formation:row-strike":
          triggerRowStrike(detail);
          break;
        case "formation:reinforce":
          triggerRowReinforce(detail);
          break;
        case "formation:teamwork":
          triggerFormationTeamwork(detail);
          break;
        case "faction:link":
          triggerFactionLink(detail);
          break;
        case "duel:start":
        case "duel:hit":
        case "discord:start":
        case "discord:hit":
          triggerDuel(type, detail);
          break;
        case "status:burn":
        case "status:counter":
        case "status:intimidate":
        case "status:empty-fort":
        case "status:raid":
          triggerStatus(type, detail);
          break;
        case "game:end":
          triggerEnd(detail);
          break;
        case "action:invalid": {
          if (detail.blockedByGuard) {
            var guardTarget = Array.isArray(detail.guardTargets) && detail.guardTargets.length ?
              detail.guardTargets[0] : detail.target;
            triggerGuard(Object.assign({}, detail, {
              target: guardTarget || detail.target || null
            }));
            break;
          }
          if (detail.blockedByFormation) break;
          var invalidAt = resolveAnchor("card", detail);
          addJob("invalid", 0.55, {
            x: invalidAt.x, y: invalidAt.y,
            text: detail.message || detail.reason || "지금은 할 수 없습니다",
            layer: LAYER_OVERLAY
          });
          shake(1.4);
          break;
        }
        default:
          break;
      }
    }

    function shake(intensity) {
      if (destroyed || reduceMotion) return;
      shakePower = Math.max(shakePower, clamp(Number(intensity) || 0, 0, 12));
      shakeTime = Math.max(shakeTime, 0.18 + shakePower * 0.012);
    }

    function updateParticles(dt) {
      for (var i = 0; i < particles.length; i += 1) {
        var p = particles[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          activeParticles = Math.max(0, activeParticles - 1);
          continue;
        }
        p.px = p.x;
        p.py = p.y;
        var resistance = Math.max(0, 1 - p.drag * dt);
        p.vx *= resistance;
        p.vy *= resistance;
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.spin * dt;
      }
    }

    function fireJobCue(job) {
      var at = { x: job.x, y: job.y };
      if (job.kind === "commander-emphasis") {
        burst(at, 18, {
          color: job.color || GOLD,
          minSpeed: 48, maxSpeed: 178,
          minLife: 0.24, maxLife: 0.58,
          minSize: 2, maxSize: 6,
          kind: "spark", drag: 1.6,
          stretch: 1.8
        });
        burst(at, 9, {
          color: job.secondaryColor || PALE_GOLD,
          minSpeed: 22, maxSpeed: 96,
          minLife: 0.2, maxLife: 0.48,
          minSize: 2, maxSize: 5,
          kind: "glyph", drag: 2.1
        });
      } else if (job.kind === "commander-heal") {
        directedBurst(at, 0, -1, 16, {
          color: HEAL_CYAN,
          minSpeed: 42, maxSpeed: 132,
          minLife: 0.3, maxLife: 0.64,
          minSize: 2, maxSize: 6,
          kind: "spark", drag: 1.8,
          spread: 0.46, minForward: 0.55,
          stretch: 1.5
        });
        burst(at, 6, {
          color: HEAL_WHITE,
          minSpeed: 18, maxSpeed: 68,
          minLife: 0.22, maxLife: 0.5,
          minSize: 2, maxSize: 4,
          kind: "glyph", gravity: -28
        });
      } else if (job.kind === "commander-reflect") {
        directedBurst(at, job.nx || 1, job.ny || 0, 18, {
          color: REFLECT_GOLD,
          minSpeed: 82, maxSpeed: 235,
          minLife: 0.18, maxLife: 0.52,
          minSize: 2, maxSize: 6,
          kind: "spark", drag: 1.5,
          spread: 0.72, minForward: -0.1,
          stretch: 2
        });
        burst(at, 7, {
          color: PALE_GOLD,
          minSpeed: 28, maxSpeed: 96,
          minLife: 0.2, maxLife: 0.46,
          minSize: 2, maxSize: 5,
          kind: "glyph", drag: 2.1
        });
        shake(1.6);
      } else if (job.kind === "commander-flood") {
        directedBurst({ x: job.x1, y: job.y1 }, 1, -0.12, 14, {
          color: WATER_BLUE,
          minSpeed: 92, maxSpeed: 220,
          minLife: 0.3, maxLife: 0.64,
          minSize: 3, maxSize: 8,
          kind: "droplet", gravity: 88,
          drag: 0.9, spread: 0.48,
          minForward: 0.58
        });
        shake(1.1);
      } else if (job.kind === "commander-flood-hit") {
        directedBurst(at, 0, -1, 11, {
          color: job.targetKind === "hero" ? WATER_BLUE : WATER_TEAL,
          minSpeed: 54, maxSpeed: 168,
          minLife: 0.24, maxLife: 0.58,
          minSize: 3, maxSize: 7,
          kind: "droplet", gravity: 125,
          drag: 0.8, spread: 0.92,
          minForward: 0.15
        });
        burst(at, 5, {
          color: HEAL_WHITE,
          minSpeed: 24, maxSpeed: 92,
          minLife: 0.2, maxLife: 0.46,
          minSize: 2, maxSize: 5,
          kind: "spark", drag: 2.4
        });
      } else if (job.kind === "commander-lock") {
        burst(at, 13, {
          color: ROPE_TAN,
          minSpeed: 28, maxSpeed: 108,
          minLife: 0.26, maxLife: 0.58,
          minSize: 2, maxSize: 6,
          kind: "glyph", gravity: 42,
          drag: 1.7
        });
        directedBurst(at, 0, 1, 6, {
          color: SEAL_IVORY,
          minSpeed: 30, maxSpeed: 92,
          minLife: 0.22, maxLife: 0.46,
          minSize: 2, maxSize: 4,
          kind: "spark", drag: 2.3,
          spread: 0.62, minForward: -0.3
        });
      } else if (job.kind === "summon") {
        burst(at, 22, {
          color: job.color || GOLD,
          minSpeed: 50, maxSpeed: 190,
          minLife: 0.3, maxLife: 0.78,
          minSize: 2, maxSize: 6,
          kind: "spark", gravity: 55
        });
        burst({ x: at.x, y: at.y + 26 }, 8, {
          color: INK,
          minSpeed: 15, maxSpeed: 62,
          minLife: 0.48, maxLife: 0.92,
          minSize: 8, maxSize: 20,
          kind: "smoke", drag: 1.7
        });
        shake(1.5);
      } else if (job.kind === "impact") {
        directedBurst(at, job.nx || 1, job.ny || 0, 22, {
          color: job.color || RED,
          minSpeed: 105, maxSpeed: 300,
          minLife: 0.16, maxLife: 0.5,
          minSize: 2, maxSize: 7,
          kind: "spark", gravity: 110,
          stretch: 1.8, spread: 0.88
        });
        directedBurst(at, -(job.nx || 1), -(job.ny || 0), 8, {
          color: PALE_GOLD,
          minSpeed: 62, maxSpeed: 175,
          minLife: 0.15, maxLife: 0.38,
          minSize: 2, maxSize: 5,
          kind: "spark", gravity: 65,
          stretch: 2.1, spread: 0.62
        });
        directedBurst(at, job.nx || 1, job.ny || 0, 9, {
          color: "#e4cba8",
          minSpeed: 70, maxSpeed: 190,
          minLife: 0.26, maxLife: 0.58,
          minSize: 3, maxSize: 8,
          kind: "shard", gravity: 150,
          spread: 1.15
        });
        burst(at, 6, {
          color: "#f2e6cf",
          minSpeed: 20, maxSpeed: 82,
          minLife: 0.28, maxLife: 0.62,
          minSize: 7, maxSize: 16,
          kind: "smoke", drag: 2
        });
        shake(4.8);
      } else if (job.kind === "number") {
        burst(at, job.hero ? 12 : 7, {
          color: job.healing ? JADE : ORANGE,
          minSpeed: 42, maxSpeed: 145,
          minLife: 0.2, maxLife: 0.48,
          minSize: 2, maxSize: 5,
          kind: job.healing ? "leaf" : "ember",
          gravity: job.healing ? -32 : 95
        });
        if (!job.healing) shake(job.hero ? 3.9 : 1.8);
      } else if (job.kind === "shield") {
        directedBurst(at, job.nx || 1, job.ny || 0, 20, {
          color: BLUE,
          minSpeed: 88, maxSpeed: 235,
          minLife: 0.27, maxLife: 0.66,
          minSize: 4, maxSize: 9,
          kind: "shard", gravity: 155, drag: 0.8,
          spread: 1.2, minForward: -0.2
        });
        directedBurst(at, -(job.nx || 1), -(job.ny || 0), 7, {
          color: "#f1fbff",
          minSpeed: 55, maxSpeed: 150,
          minLife: 0.17, maxLife: 0.38,
          minSize: 2, maxSize: 4,
          kind: "spark", drag: 2.2,
          stretch: 1.8
        });
        shake(2.5);
      } else if (job.kind === "guard") {
        burst(at, 12, {
          color: STEEL,
          minSpeed: 48, maxSpeed: 145,
          minLife: 0.25, maxLife: 0.56,
          minSize: 3, maxSize: 7,
          kind: "shard", gravity: 90
        });
        shake(1.3);
      } else if (job.kind === "death") {
        burst(at, 22, {
          color: ASH,
          minSpeed: 24, maxSpeed: 132,
          minLife: 0.52, maxLife: 1.28,
          minSize: 6, maxSize: 18,
          kind: "ash", gravity: -22, drag: 1.6
        });
        burst(at, 9, {
          color: "#302f31",
          minSpeed: 10, maxSpeed: 62,
          minLife: 0.62, maxLife: 1.38,
          minSize: 11, maxSize: 26,
          kind: "smoke", gravity: -28, drag: 1.9
        });
        burst({ x: at.x, y: at.y + 18 }, 13, {
          color: "#5d5650",
          minSpeed: 34, maxSpeed: 156,
          minLife: 0.44, maxLife: 1.08,
          minSize: 3, maxSize: 8,
          kind: "shard", gravity: 138, drag: 1.05
        });
        shake(1.9);
      } else if (
        job.kind === "formation-place" ||
        job.kind === "formation-block" ||
        job.kind === "faction-link" ||
        job.kind === "duel-start" ||
        job.kind === "duel-hit" ||
        job.kind.indexOf("status-") === 0
      ) {
        if (reduceMotion) return;
        var tacticalParticle = job.kind === "status-burn" ? "ember" :
          job.kind === "formation-block" ? "shard" :
            job.kind === "status-raid" ? "glyph" : "spark";
        burst(at, job.kind === "duel-hit" ? 15 : 10, {
          color: job.color,
          minSpeed: 28,
          maxSpeed: job.kind === "duel-hit" ? 168 : 108,
          minLife: 0.18,
          maxLife: 0.44,
          minSize: 2,
          maxSize: 6,
          kind: tacticalParticle,
          gravity: job.kind === "status-burn" ? -42 : 0,
          drag: 2
        });
        if (job.kind === "duel-hit" || job.kind === "formation-block") shake(1.7);
      } else if (job.kind === "effect") {
        burst(at, job.family === "damage" ? 16 : 12, {
          color: job.color,
          minSpeed: 30, maxSpeed: job.family === "damage" ? 175 : 105,
          minLife: 0.28, maxLife: 0.68,
          minSize: 2, maxSize: 6,
          kind: job.particle,
          gravity: job.family === "heal" ? -38 : job.family === "damage" ? 85 : 0
        });
        if (job.family === "damage") shake(2.2);
      } else if (job.kind === "draw") {
        burst(at, job.burned ? 12 : 8, {
          color: job.burned ? RED : PALE_GOLD,
          minSpeed: 22, maxSpeed: 82,
          minLife: 0.24, maxLife: 0.52,
          minSize: 3, maxSize: 7,
          kind: job.burned ? "ember" : "paper",
          gravity: 28
        });
      } else if (job.kind === "finale") {
        var d = dimensions();
        if (job.won) {
          for (var i = 0; i < (reduceMotion ? 6 : 30); i += 1) {
            spawnParticle({
              x: randomBetween(d.width * 0.12, d.width * 0.88),
              y: randomBetween(-24, d.height * 0.12),
              vx: randomBetween(-30, 30),
              vy: randomBetween(65, 155),
              life: randomBetween(0.62, 0.98),
              size: randomBetween(4, 8),
              color: [GOLD, "#df4b3f", "#71b9d9", "#f2eee3"][i % 4],
              kind: "confetti",
              gravity: 32,
              drag: 0.28,
              rotation: randomBetween(0, Math.PI * 2),
              spin: randomBetween(-4, 4)
            });
          }
          job.nextConfetti = 0.2;
        } else {
          burst({ x: d.width * 0.5, y: d.height * 0.34 }, 14, {
            color: job.draw ? "#aeb9bd" : "#665c59",
            minSpeed: 12, maxSpeed: 58,
            minLife: 0.58, maxLife: 1.02,
            minSize: 7, maxSize: 18,
            kind: "ash", gravity: -18, drag: 1.5
          });
          burst({ x: d.width * 0.5, y: d.height * 0.4 }, 9, {
            color: job.draw ? "#778085" : "#56352f",
            minSpeed: 24, maxSpeed: 96,
            minLife: 0.48, maxLife: 0.94,
            minSize: 3, maxSize: 9,
            kind: "shard", gravity: 135, drag: 0.9
          });
        }
      }
    }

    function updateJobs(dt) {
      for (var i = jobs.length - 1; i >= 0; i -= 1) {
        var job = jobs[i];
        job.age += dt;
        if (!job.cueFired && job.age >= (job.cueAt || 0)) {
          job.cueFired = true;
          fireJobCue(job);
        }
        if (job.kind === "attack" && !reduceMotion && job.age >= 0) {
          var travel = phase(job.age, 0.12, 0.4);
          var targetEmits = Math.floor(travel * 14);
          while (job.emitted < targetEmits) {
            var t = job.emitted / 14;
            var inv = 1 - t;
            var x = inv * inv * job.x1 + 2 * inv * t * job.cx + t * t * job.x2;
            var y = inv * inv * job.y1 + 2 * inv * t * job.cy + t * t * job.y2;
            spawnParticle({
              x: x, y: y,
              vx: randomBetween(-22, 22), vy: randomBetween(-22, 22),
              life: randomBetween(0.18, 0.36), size: randomBetween(2, 5),
              color: job.color || PALE_GOLD, kind: "spark", drag: 4,
              stretch: 1.8
            });
            job.emitted += 1;
          }
        }
        if (job.kind === "finale" && job.won && job.cueFired && !reduceMotion) {
          job.nextConfetti -= dt;
          if (job.nextConfetti <= 0 && job.age < 0.72) {
            var d = dimensions();
            burst({ x: randomBetween(d.width * 0.2, d.width * 0.8), y: d.height * 0.12 },
              3, {
                color: Math.random() > 0.5 ? GOLD : "#df4b3f",
                minSpeed: 36, maxSpeed: 110, minLife: 0.24, maxLife: 0.44,
                minSize: 4, maxSize: 8, kind: "confetti", gravity: 78, drag: 0.32
              });
            job.nextConfetti = 0.2;
          }
        }
        if (job.age >= job.duration) jobs.splice(i, 1);
      }
    }

    function update(dt) {
      if (destroyed) return;
      dt = Number(dt);
      if (!Number.isFinite(dt) || dt <= 0) return;
      if (dt > 3) dt /= 1000;
      dt = Math.min(dt, 0.05);
      syncReducedMotion();
      elapsed += dt;
      updateParticles(dt);
      updateJobs(dt);
      if (shakeTime > 0 && !reduceMotion) {
        shakeTime -= dt;
        shakePower *= Math.pow(0.001, dt);
        var amplitude = shakePower * clamp(shakeTime / 0.1, 0, 1);
        shakeX = (Math.random() * 2 - 1) * amplitude;
        shakeY = (Math.random() * 2 - 1) * amplitude * 0.7;
      } else {
        shakeTime = 0;
        shakePower = 0;
        shakeX = 0;
        shakeY = 0;
      }
    }

    function strokeRune(ctx, x, y, radius, alpha, rotation) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation || 0);
      ctx.strokeStyle = rgba(GOLD, alpha);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      for (var i = 0; i < 8; i += 1) {
        var angle = i * Math.PI / 4;
        var inner = radius * 0.68;
        var outer = radius * 0.9;
        ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        ctx.lineTo(Math.cos(angle + Math.PI / 8) * outer, Math.sin(angle + Math.PI / 8) * outer);
        ctx.lineTo(Math.cos(angle + Math.PI / 4) * inner, Math.sin(angle + Math.PI / 4) * inner);
      }
      ctx.stroke();
      ctx.restore();
    }

    function drawBrushPanel(ctx, centerX, centerY, width, height, alpha, enemy) {
      var left = centerX - width * 0.5;
      var right = centerX + width * 0.5;
      var top = centerY - height * 0.5;
      var bottom = centerY + height * 0.5;
      ctx.save();
      ctx.globalAlpha = alpha;
      var gradient = ctx.createLinearGradient(left, 0, right, 0);
      gradient.addColorStop(0, "rgba(9,12,16,0)");
      gradient.addColorStop(0.1, "rgba(15,18,21,.94)");
      gradient.addColorStop(0.5, enemy ? "rgba(69,21,21,.96)" : "rgba(32,43,40,.97)");
      gradient.addColorStop(0.9, "rgba(15,18,21,.94)");
      gradient.addColorStop(1, "rgba(9,12,16,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(left, centerY);
      ctx.lineTo(left + width * 0.11, top + 7);
      ctx.lineTo(centerX - width * 0.18, top);
      ctx.lineTo(centerX, top + 4);
      ctx.lineTo(centerX + width * 0.2, top);
      ctx.lineTo(right - width * 0.1, top + 8);
      ctx.lineTo(right, centerY);
      ctx.lineTo(right - width * 0.12, bottom - 7);
      ctx.lineTo(centerX + width * 0.14, bottom);
      ctx.lineTo(centerX, bottom - 4);
      ctx.lineTo(centerX - width * 0.19, bottom);
      ctx.lineTo(left + width * 0.1, bottom - 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(GOLD, 0.8);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(left + width * 0.12, top + 8);
      ctx.lineTo(right - width * 0.12, top + 8);
      ctx.moveTo(left + width * 0.12, bottom - 8);
      ctx.lineTo(right - width * 0.12, bottom - 8);
      ctx.stroke();
      ctx.restore();
    }

    function drawBanner(ctx, job) {
      var d = dimensions();
      var t = clamp(job.age / job.duration, 0, 1);
      var appear = easeOutBack(clamp(t / 0.23, 0, 1));
      var fade = clamp((1 - t) / 0.2, 0, 1);
      var alpha = Math.min(1, appear) * fade;
      var width = lerp(170, Math.min(610, d.width * 0.52), appear);
      var y = d.height * 0.49;
      drawBrushPanel(ctx, d.width * 0.5, y, width, 112, alpha, job.enemy);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = rgba(GOLD, 0.35);
      ctx.shadowBlur = 16;
      ctx.fillStyle = PALE_GOLD;
      ctx.font = "700 36px 'Noto Serif KR','Malgun Gothic',serif";
      ctx.fillText(job.title, d.width * 0.5, y - 12);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(245,240,220,.78)";
      ctx.font = "500 14px 'Malgun Gothic',sans-serif";
      ctx.fillText(job.subtitle, d.width * 0.5, y + 26);
      ctx.restore();
    }

    function drawSummon(ctx, job) {
      var anticipation = phase(job.age, 0, 0.22);
      var impact = phase(job.age, 0.22, 0.42);
      var settle = phase(job.age, 0.42, job.duration);
      var color = job.color || GOLD;
      var sealRadius = lerp(74, 48, easeInOutCubic(anticipation));
      if (job.age >= 0.22) sealRadius = lerp(48, 96, easeOutCubic(impact));
      var alpha = job.age < 0.42 ? 1 : 1 - settle;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      var glow = ctx.createRadialGradient(job.x, job.y, 0, job.x, job.y, sealRadius);
      glow.addColorStop(0, rgba(PALE_GOLD, alpha * 0.45));
      glow.addColorStop(0.42, rgba(color, alpha * 0.18));
      glow.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(job.x, job.y, sealRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      strokeRune(ctx, job.x, job.y + 24, sealRadius * 0.72, alpha * 0.8,
        anticipation * -0.35 + settle * 0.7);

      var drop = easeInOutCubic(impact);
      var panelY = lerp(job.y - 118, job.y - 8, drop);
      var panelScale = job.age < 0.22 ? lerp(0.82, 0.94, anticipation) :
        lerp(1.18, 0.92, easeOutBack(impact));
      ctx.save();
      ctx.translate(job.x, panelY);
      ctx.scale(panelScale, panelScale);
      ctx.globalAlpha = clamp(job.age < 0.22 ? anticipation : 1 - settle, 0, 1) * 0.85;
      ctx.fillStyle = rgba("#121419", 0.86);
      roundedRect(ctx, -31, -41, 62, 82, 12);
      ctx.fill();
      ctx.strokeStyle = rgba(color, 0.95);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = rgba(color, 0.28);
      ctx.beginPath();
      ctx.arc(0, -8, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALE_GOLD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-13, 25);
      ctx.lineTo(0, 13);
      ctx.lineTo(13, 25);
      ctx.stroke();
      ctx.restore();

      if (job.age >= 0.18 && job.age <= 0.52) {
        var landing = phase(job.age, 0.18, 0.42);
        var landingAlpha = (1 - phase(job.age, 0.34, 0.52)) *
          Math.sin(landing * Math.PI);
        ctx.save();
        ctx.translate(job.x, job.y + 26);
        ctx.scale(1, 0.32);
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = rgba(PALE_GOLD, landingAlpha * 0.92);
        ctx.lineWidth = lerp(8, 1.5, landing);
        ctx.beginPath();
        ctx.arc(0, 0, lerp(20, 104, easeOutQuart(landing)), 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = rgba(color, landingAlpha * 0.68);
        ctx.lineWidth = lerp(5, 1, landing);
        ctx.beginPath();
        ctx.arc(0, 0, lerp(12, 76, easeOutCubic(landing)), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.translate(job.x, job.y + 21);
        drawContactFragments(ctx, 72, landing,
          landingAlpha * 0.68, color, 5);
        ctx.restore();
      }
    }

    function bezierPoint(job, t) {
      var inv = 1 - t;
      return {
        x: inv * inv * job.x1 + 2 * inv * t * job.cx + t * t * job.x2,
        y: inv * inv * job.y1 + 2 * inv * t * job.cy + t * t * job.y2
      };
    }

    function drawBoardLight(ctx, job) {
      var t = clamp(job.age / job.duration, 0, 1);
      var enter = easeOutCubic(phase(t, 0, job.reaction === "impact" ? 0.16 : 0.24));
      var fade = 1 - easeInCubic(phase(t, job.reaction === "impact" ? 0.38 : 0.52, 1));
      var alpha = enter * fade;
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      if (job.reaction === "attack") {
        var dx = job.x2 - job.x1;
        var dy = job.y2 - job.y1;
        var length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        var path = easeInOutCubic(phase(job.age, 0.1, 0.4));
        var litX = lerp(job.x1, job.x2, path);
        var litY = lerp(job.y1, job.y2, path);
        var sourceGlow = ctx.createRadialGradient(
          job.x1, job.y1, 4, job.x1, job.y1, Math.min(118, 54 + length * 0.08)
        );
        sourceGlow.addColorStop(0, rgba(PALE_GOLD, alpha * 0.16));
        sourceGlow.addColorStop(0.42, rgba(job.color || GOLD, alpha * 0.08));
        sourceGlow.addColorStop(1, rgba(job.color || GOLD, 0));
        ctx.fillStyle = sourceGlow;
        ctx.beginPath();
        ctx.arc(job.x1, job.y1, Math.min(118, 54 + length * 0.08), 0, Math.PI * 2);
        ctx.fill();
        var movingGlow = ctx.createRadialGradient(
          litX, litY, 2, litX, litY, 76
        );
        movingGlow.addColorStop(0, rgba(PALE_GOLD, alpha * 0.18));
        movingGlow.addColorStop(0.5, rgba(job.color || GOLD, alpha * 0.08));
        movingGlow.addColorStop(1, rgba(job.color || GOLD, 0));
        ctx.fillStyle = movingGlow;
        ctx.beginPath();
        ctx.arc(litX, litY, 76, 0, Math.PI * 2);
        ctx.fill();
      } else {
        var impulse = Math.sin(phase(job.age, 0, 0.22) * Math.PI);
        var offset = impulse * 12;
        var x = job.x + (job.nx || 0) * offset;
        var y = job.y + (job.ny || 0) * offset;
        var radius = lerp(38, 124, easeOutQuart(phase(job.age, 0, 0.34)));
        var glow = ctx.createRadialGradient(x, y, 1, x, y, radius);
        glow.addColorStop(0, rgba("#ffffff", alpha * 0.26));
        glow.addColorStop(0.2, rgba(PALE_GOLD, alpha * 0.17));
        glow.addColorStop(0.62, rgba(job.color || RED, alpha * 0.075));
        glow.addColorStop(1, rgba(job.color || RED, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawDeathResidue(ctx, job) {
      var t = clamp(job.age / job.duration, 0, 1);
      var reveal = easeOutCubic(phase(t, 0, 0.2));
      var fade = 1 - easeInCubic(phase(t, 0.66, 1));
      var alpha = reveal * fade;
      var radius = lerp(28, 82, easeOutCubic(phase(t, 0, 0.5)));
      ctx.save();
      ctx.translate(job.x, job.y + 22);
      ctx.scale(1, 0.34);
      var stain = ctx.createRadialGradient(0, 0, 1, 0, 0, radius);
      stain.addColorStop(0, "rgba(7,8,9," + alpha * 0.62 + ")");
      stain.addColorStop(0.44, "rgba(31,29,28," + alpha * 0.38 + ")");
      stain.addColorStop(0.76, "rgba(56,50,45," + alpha * 0.14 + ")");
      stain.addColorStop(1, "rgba(24,22,22,0)");
      ctx.fillStyle = stain;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(126,116,103," + alpha * 0.28 + ")";
      ctx.lineWidth = lerp(4, 1, t);
      for (var crack = 0; crack < 7; crack += 1) {
        var angle = (crack * 0.93 + job.seed * 0.031) % (Math.PI * 2);
        var inner = 10 + (crack % 2) * 4;
        var outer = radius * (0.54 + (crack % 3) * 0.08);
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        ctx.lineTo(
          Math.cos(angle + (crack % 2 ? 0.08 : -0.07)) * outer * 0.62,
          Math.sin(angle + (crack % 2 ? 0.08 : -0.07)) * outer * 0.62
        );
        ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      ctx.translate(job.x, job.y);
      ctx.globalAlpha = alpha * 0.28;
      ctx.strokeStyle = ASH;
      ctx.lineWidth = 1.2;
      for (var wisp = 0; wisp < 3; wisp += 1) {
        var offsetX = (wisp - 1) * 18;
        ctx.beginPath();
        ctx.moveTo(offsetX, 26);
        ctx.quadraticCurveTo(
          offsetX + (wisp % 2 ? -12 : 13),
          lerp(18, -22, t),
          offsetX + (wisp - 1) * 8,
          lerp(8, -48, t)
        );
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawLungeBadge(ctx, x, y, angle, scaleX, scaleY, color, alpha) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.scale(scaleX, scaleY);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = rgba(color, 0.8);
      ctx.shadowBlur = 15;
      ctx.fillStyle = "rgba(16,18,20,.94)";
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = PALE_GOLD;
      ctx.beginPath();
      ctx.moveTo(17, 0);
      ctx.lineTo(-5, -11);
      ctx.lineTo(1, -3);
      ctx.lineTo(-17, 0);
      ctx.lineTo(1, 3);
      ctx.lineTo(-5, 11);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawDirectionalSlash(ctx, x, y, angle, progress, alpha, color, scale) {
      progress = clamp(progress, 0, 1);
      alpha = clamp(alpha, 0, 1);
      scale = Math.max(0.2, Number(scale) || 1);
      if (progress <= 0 || alpha <= 0) return;
      var reach = lerp(24, 88, easeOutQuart(progress)) * scale;
      var width = lerp(18, 52, easeOutCubic(progress)) * scale;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle - 0.44);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.globalAlpha = alpha * (1 - progress * 0.34);
      ctx.strokeStyle = rgba(color || RED, 0.42);
      ctx.lineWidth = lerp(18, 4, progress) * scale;
      ctx.beginPath();
      ctx.moveTo(-reach * 0.62, width * 0.54);
      ctx.quadraticCurveTo(0, -width * 0.18, reach * 0.6, -width * 0.5);
      ctx.stroke();
      ctx.strokeStyle = rgba(PALE_GOLD, 0.92);
      ctx.lineWidth = lerp(7, 1.4, progress) * scale;
      ctx.beginPath();
      ctx.moveTo(-reach * 0.7, width * 0.44);
      ctx.quadraticCurveTo(0, -width * 0.2, reach * 0.72, -width * 0.62);
      ctx.stroke();
      ctx.strokeStyle = rgba("#ffffff", 0.94);
      ctx.lineWidth = lerp(2.8, 0.8, progress) * scale;
      ctx.beginPath();
      ctx.moveTo(-reach * 0.58, width * 0.35);
      ctx.quadraticCurveTo(0, -width * 0.24, reach * 0.54, -width * 0.52);
      ctx.stroke();
      ctx.restore();
    }

    function drawContactFragments(ctx, radius, progress, alpha, color, seed) {
      progress = clamp(progress, 0, 1);
      alpha = clamp(alpha, 0, 1);
      var travel = easeOutQuart(progress);
      ctx.save();
      ctx.globalAlpha = alpha;
      for (var shard = 0; shard < 7; shard += 1) {
        var angle = shard * 0.897 + (seed || 0) * 0.071;
        var distance = radius * (0.22 + travel * (0.48 + (shard % 3) * 0.1));
        var size = lerp(9, 3, progress) * (0.72 + (shard % 2) * 0.24);
        ctx.save();
        ctx.translate(Math.cos(angle) * distance, Math.sin(angle) * distance);
        ctx.rotate(angle + progress * (shard % 2 ? -0.8 : 0.65));
        ctx.fillStyle = shard % 3 === 0 ? rgba(PALE_GOLD, 0.86) :
          rgba(color || RED, 0.74);
        ctx.beginPath();
        ctx.moveTo(-size * 0.35, -size);
        ctx.lineTo(size * 0.66, -size * 0.12);
        ctx.lineTo(-size * 0.18, size * 1.24);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    function drawAttack(ctx, job) {
      var anticipation = phase(job.age, 0, 0.12);
      var travel = easeInOutCubic(phase(job.age, 0.12, 0.4));
      var settle = phase(job.age, 0.4, job.duration);
      var dx = job.x2 - job.x1;
      var dy = job.y2 - job.y1;
      var length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      var normalX = -dy / length;
      var normalY = dx / length;
      var angle = Math.atan2(dy, dx);
      var recoil = (1 - easeOutCubic(anticipation)) * 0 +
        Math.sin(anticipation * Math.PI) * -16;
      var point = job.age < 0.12 ?
        { x: job.x1 + dx / length * recoil, y: job.y1 + dy / length * recoil } :
        bezierPoint(job, travel);
      var overshootPhase = phase(job.age, 0.32, 0.58);
      var overshoot = Math.sin(overshootPhase * Math.PI) *
        Math.min(24, Math.max(0, Number(job.contactOvershoot) || 0));
      if (job.age >= 0.32) {
        point.x += dx / length * overshoot;
        point.y += dy / length * overshoot;
      }
      var alpha = job.age < 0.4 ? 1 : 1 - settle;

      ctx.save();
      ctx.translate(job.x2, job.y2);
      ctx.globalAlpha = clamp(anticipation * (1 - phase(job.age, 0.12, 0.3)), 0, 1) * 0.65;
      ctx.strokeStyle = rgba(RED, 0.9);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, lerp(52, 34, easeInCubic(anticipation)), 0, Math.PI * 2);
      ctx.stroke();
      for (var mark = 0; mark < 4; mark += 1) {
        var ma = mark * Math.PI * 0.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ma) * 44, Math.sin(ma) * 44);
        ctx.lineTo(Math.cos(ma) * 31, Math.sin(ma) * 31);
        ctx.stroke();
      }
      ctx.restore();

      if (job.age >= 0.1) {
        var trailStart = Math.max(0, travel - 0.34);
        var startPoint = bezierPoint(job, trailStart);
        var endPoint = bezierPoint(job, travel);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        ctx.strokeStyle = rgba(job.color || GOLD, 0.26);
        ctx.lineWidth = lerp(18, 5, travel);
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.quadraticCurveTo(job.cx, job.cy, endPoint.x, endPoint.y);
        ctx.stroke();
        ctx.strokeStyle = rgba(PALE_GOLD, 0.9);
        ctx.lineWidth = 2.3;
        ctx.stroke();
        ctx.strokeStyle = rgba(job.color || GOLD, 0.34);
        ctx.lineWidth = 1.4;
        for (var ribbon = -1; ribbon <= 1; ribbon += 2) {
          ctx.beginPath();
          ctx.moveTo(startPoint.x + normalX * ribbon * 8, startPoint.y + normalY * ribbon * 8);
          ctx.quadraticCurveTo(
            job.cx + normalX * ribbon * 13,
            job.cy + normalY * ribbon * 13,
            endPoint.x + normalX * ribbon * 3,
            endPoint.y + normalY * ribbon * 3
          );
          ctx.stroke();
        }
        ctx.restore();
      }

      var stretch = job.age < 0.12 ? anticipation :
        phase(job.age, 0.12, 0.32);
      var compression = Math.sin(phase(job.age, 0.32, 0.52) * Math.PI);
      var scaleX = job.age < 0.12 ?
        lerp(1, 0.78, anticipation) :
        lerp(1.04, 1.24, stretch) - compression * 0.34;
      var scaleY = job.age < 0.12 ?
        lerp(1, 1.18, anticipation) :
        lerp(0.98, 0.78, stretch) + compression * 0.42;
      if (job.age >= 0.18 && alpha > 0.15) {
        for (var ghost = 1; ghost <= 3; ghost += 1) {
          ctx.save();
          ctx.translate(
            point.x - dx / length * ghost * 11,
            point.y - dy / length * ghost * 11
          );
          ctx.rotate(angle);
          ctx.scale(scaleX * (1 - ghost * 0.08), scaleY);
          ctx.globalAlpha = alpha * (0.19 / ghost);
          ctx.strokeStyle = job.color || GOLD;
          ctx.lineWidth = ghost === 1 ? 3.4 : 2.2;
          ctx.beginPath();
          ctx.arc(0, 0, 24, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
      drawLungeBadge(ctx, point.x, point.y, angle,
        scaleX, scaleY, job.color || GOLD, alpha);
    }

    function drawImpact(ctx, job) {
      var anticipation = phase(job.age, 0, 0.055);
      var impact = phase(job.age, 0.055, 0.19);
      var settle = phase(job.age, 0.19, job.duration);
      var alpha = job.age < 0.19 ? 1 : 1 - settle;
      var radius = job.age < 0.055 ?
        lerp(48, 22, easeInCubic(anticipation)) :
        lerp(12, 88, easeOutQuart(impact));
      var nx = Number(job.nx) || 0;
      var ny = Number(job.ny) || 0;
      var impulse = Math.sin(phase(job.age, 0.055, 0.28) * Math.PI) *
        Math.min(24, Math.max(0, Number(job.impulseTravel) || 0));
      var impulseX = nx * impulse;
      var impulseY = ny * impulse;
      var direction = Number.isFinite(job.angle) ? job.angle : Math.atan2(ny, nx);
      var contactPulse = Math.sin(phase(job.age, 0.04, 0.255) * Math.PI);
      var slashProgress = phase(job.age, 0.045, 0.235);

      // A compact card-shaped afterimage makes target recoil readable without
      // painting over the card's rules text.
      if (contactPulse > 0) {
        ctx.save();
        ctx.translate(job.x + impulseX * 0.62, job.y + impulseY * 0.62);
        ctx.rotate(direction);
        ctx.scale(lerp(1, 0.8, contactPulse), lerp(1, 1.13, contactPulse));
        ctx.globalAlpha = contactPulse * 0.38;
        ctx.strokeStyle = rgba(job.color || RED, 0.9);
        ctx.lineWidth = 3.2;
        roundedRect(ctx,
          -(job.recoilWidth || 74) * 0.5,
          -(job.recoilHeight || 94) * 0.5,
          job.recoilWidth || 74,
          job.recoilHeight || 94,
          12
        );
        ctx.stroke();
        ctx.restore();
      }
      drawDirectionalSlash(ctx, job.x, job.y, direction,
        slashProgress, alpha * contactPulse, job.color || RED, 1);

      ctx.save();
      ctx.translate(job.x + impulseX, job.y + impulseY);
      ctx.globalCompositeOperation = "lighter";
      var glow = ctx.createRadialGradient(0, 0, 1, 0, 0, radius * 1.15);
      glow.addColorStop(0, rgba("#ffffff", alpha * (1 - settle) * 0.9));
      glow.addColorStop(0.18, rgba(PALE_GOLD, alpha * 0.72));
      glow.addColorStop(0.55, rgba(job.color || RED, alpha * 0.28));
      glow.addColorStop(1, rgba(job.color || RED, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(-0.42 + settle * 0.08);
      ctx.strokeStyle = rgba("#fff4d1", alpha);
      ctx.lineWidth = lerp(13, 1, impact);
      ctx.lineCap = "round";
      for (var ray = 0; ray < 6; ray += 1) {
        var ra = ray * Math.PI / 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ra) * radius * 0.18, Math.sin(ra) * radius * 0.18);
        ctx.lineTo(Math.cos(ra) * radius, Math.sin(ra) * radius);
        ctx.stroke();
      }
      ctx.strokeStyle = rgba(job.color || RED, alpha * 0.88);
      ctx.lineWidth = lerp(5, 1, settle);
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.74, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      var compression = Math.sin(phase(job.age, 0.04, 0.24) * Math.PI);
      ctx.save();
      ctx.translate(job.x + impulseX * 0.42, job.y + impulseY * 0.42);
      ctx.rotate(direction);
      ctx.scale(lerp(1, 0.42, compression), lerp(1, 1.28, compression));
      ctx.globalAlpha = alpha * compression * 0.72;
      ctx.strokeStyle = rgba("#fff6dc", 0.9);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 34, 48, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = rgba(job.color || RED, 0.16);
      ctx.beginPath();
      ctx.ellipse(-12, 0, 20, 36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(job.x + impulseX * 0.35, job.y + impulseY * 0.35);
      drawContactFragments(ctx, Math.max(44, radius), impact,
        alpha * clamp(compression * 1.25, 0, 1), job.color || RED, 3);
      ctx.restore();

      ctx.save();
      ctx.translate(job.x, job.y);
      ctx.rotate(direction + Math.PI * 0.5);
      ctx.globalAlpha = alpha * compression * 0.54;
      ctx.strokeStyle = job.color || RED;
      ctx.lineWidth = 2;
      for (var wave = 0; wave < 3; wave += 1) {
        ctx.beginPath();
        ctx.arc(
          0, 0, 30 + wave * 16 + easeOutCubic(impact) * 18,
          -0.72, 0.72
        );
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawNumber(ctx, job) {
      var anticipation = phase(job.age, 0, 0.035);
      var impact = phase(job.age, 0.035, 0.2);
      var settle = phase(job.age, 0.38, job.duration);
      var rise = easeOutCubic(phase(job.age, 0.12, job.duration)) * 62;
      var scale = job.age < 0.035 ? anticipation * 0.5 :
        lerp(0.62, 1, easeOutBack(impact));
      var alpha = 1 - settle;
      ctx.save();
      ctx.translate(job.x, job.y - rise);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.font = "900 " + job.size + "px 'Arial Black','Malgun Gothic',sans-serif";
      ctx.lineWidth = 7;
      ctx.strokeStyle = "rgba(20,13,10,.9)";
      ctx.strokeText(job.text, 0, 0);
      ctx.fillStyle = job.color;
      ctx.shadowColor = rgba(job.color, 0.8);
      ctx.shadowBlur = 9;
      ctx.fillText(job.text, 0, 0);
      ctx.restore();
    }

    function drawDeath(ctx, job) {
      var anticipation = phase(job.age, 0, 0.18);
      var impact = phase(job.age, 0.18, 0.4);
      var settle = phase(job.age, 0.4, job.duration);
      var alpha = job.age < 0.4 ? 1 : 1 - settle;
      var radius = job.age < 0.18 ?
        lerp(60, 32, easeInCubic(anticipation)) :
        lerp(20, 96, easeOutCubic(impact));
      ctx.save();
      ctx.translate(job.x, job.y);
      ctx.globalAlpha = alpha * 0.72;
      ctx.globalCompositeOperation = "multiply";
      var voidGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, radius);
      voidGlow.addColorStop(0, "rgba(5,6,7,.88)");
      voidGlow.addColorStop(0.5, "rgba(25,24,25,.58)");
      voidGlow.addColorStop(1, "rgba(25,24,25,0)");
      ctx.fillStyle = voidGlow;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#3e3a39";
      ctx.lineWidth = lerp(10, 1, settle);
      for (var i = 0; i < 6; i += 1) {
        var angle = i * Math.PI / 3 + 0.3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 8, Math.sin(angle) * 8);
        ctx.lineTo(Math.cos(angle + 0.08) * radius, Math.sin(angle + 0.08) * radius);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = rgba(ASH, alpha * 0.46);
      ctx.lineWidth = lerp(4, 1, settle);
      ctx.beginPath();
      ctx.ellipse(0, 18, radius * 0.82, radius * 0.27, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = alpha * 0.42;
      ctx.fillStyle = "#111315";
      for (var shard = 0; shard < 11; shard += 1) {
        var shardAngle = shard * Math.PI * 0.25 + 0.16;
        var shardRadius = radius * (0.28 + (shard % 3) * 0.11);
        ctx.save();
        ctx.translate(
          Math.cos(shardAngle) * shardRadius,
          Math.sin(shardAngle) * shardRadius
        );
        ctx.rotate(shardAngle + settle * 0.8);
        ctx.beginPath();
        ctx.moveTo(-3, -10);
        ctx.lineTo(5, 0);
        ctx.lineTo(-2, 13);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      var split = Math.sin(phase(job.age, 0.12, 0.43) * Math.PI);
      ctx.globalAlpha = alpha * split * 0.72;
      ctx.strokeStyle = rgba("#e1d6c8", 0.72);
      ctx.lineWidth = 2.2;
      for (var tear = -1; tear <= 1; tear += 1) {
        ctx.beginPath();
        ctx.moveTo(tear * 13 - 5, -54);
        ctx.lineTo(tear * 9 + 4, -18);
        ctx.lineTo(tear * 17 - 3, 14);
        ctx.lineTo(tear * 24 + 5, 52);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = rgba(ASH, 0.68);
      ctx.lineCap = "round";
      for (var soul = 0; soul < 4; soul += 1) {
        var soulOffset = (soul - 1.5) * 14;
        ctx.globalAlpha = alpha * split * (0.48 - soul * 0.06);
        ctx.lineWidth = 5 - soul * 0.7;
        ctx.beginPath();
        ctx.moveTo(soulOffset, 18);
        ctx.quadraticCurveTo(
          soulOffset + (soul % 2 ? -18 : 16),
          lerp(8, -28, impact),
          soulOffset + (soul - 1.5) * 7,
          lerp(-12, -84, impact)
        );
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawShield(ctx, job) {
      var anticipation = phase(job.age, 0, 0.11);
      var impact = phase(job.age, 0.11, 0.31);
      var settle = phase(job.age, 0.31, job.duration);
      var alpha = job.age < 0.31 ? 1 : 1 - settle;
      var radius = job.age < 0.11 ?
        lerp(54, 38, easeInCubic(anticipation)) :
        lerp(36, 86, easeOutQuart(impact));
      ctx.save();
      ctx.translate(job.x, job.y);
      ctx.strokeStyle = rgba(BLUE, alpha);
      ctx.shadowColor = BLUE;
      ctx.shadowBlur = 14;
      ctx.lineWidth = lerp(9, 1, settle);
      for (var i = 0; i < 3; i += 1) {
        var start = -Math.PI * 0.9 + i * 1.95;
        ctx.beginPath();
        ctx.arc(0, 0, radius, start, start + 1.35);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.strokeStyle = rgba("#e8f7ff", alpha * 0.9);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, -radius * 0.7);
      ctx.lineTo(4, -12);
      ctx.lineTo(-5, 3);
      ctx.lineTo(13, radius * 0.54);
      ctx.stroke();
      var fracture = Math.sin(phase(job.age, 0.08, 0.34) * Math.PI);
      ctx.globalAlpha = alpha * fracture;
      ctx.rotate(Number.isFinite(job.angle) ? job.angle : 0);
      ctx.strokeStyle = rgba("#ffffff", 0.86);
      ctx.lineCap = "round";
      for (var crack = -2; crack <= 2; crack += 1) {
        var crackY = crack * 11;
        ctx.lineWidth = crack === 0 ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.56, crackY * 0.28);
        ctx.lineTo(-radius * 0.14, crackY - 3);
        ctx.lineTo(radius * 0.48, crackY * 1.28);
        ctx.stroke();
      }
      drawDirectionalSlash(ctx, 0, 0, 0,
        phase(job.age, 0.07, 0.28), alpha * fracture, BLUE, 0.72);
      drawContactFragments(ctx, radius, impact,
        alpha * fracture * 0.88, BLUE, 8);
      ctx.restore();
    }

    function drawRune(ctx, job) {
      var t = clamp(job.age / job.duration, 0, 1);
      var alpha = clamp((1 - t) * 1.7, 0, 1);
      strokeRune(ctx, job.x, job.y, lerp(20, 66, easeOutCubic(t)), alpha, -t * 1.6);
    }

    function drawEffectGlyph(ctx, family, color, radius, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (family === "heal") {
        ctx.beginPath();
        ctx.moveTo(-radius * 0.34, 0);
        ctx.lineTo(radius * 0.34, 0);
        ctx.moveTo(0, -radius * 0.34);
        ctx.lineTo(0, radius * 0.34);
        ctx.stroke();
      } else if (family === "damage") {
        ctx.rotate(-0.45);
        ctx.beginPath();
        ctx.moveTo(-radius * 0.48, 0);
        ctx.lineTo(radius * 0.48, 0);
        ctx.moveTo(-radius * 0.2, -radius * 0.27);
        ctx.lineTo(radius * 0.2, radius * 0.27);
        ctx.stroke();
      } else if (family === "draw") {
        roundedRect(ctx, -radius * 0.34, -radius * 0.43, radius * 0.68, radius * 0.86, 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-radius * 0.18, -radius * 0.17);
        ctx.lineTo(radius * 0.18, -radius * 0.17);
        ctx.moveTo(-radius * 0.18, 0);
        ctx.lineTo(radius * 0.1, 0);
        ctx.stroke();
      } else if (family === "buff") {
        for (var i = -1; i <= 1; i += 1) {
          var yy = i * radius * 0.24;
          ctx.beginPath();
          ctx.moveTo(-radius * 0.34, yy + radius * 0.1);
          ctx.lineTo(0, yy - radius * 0.16);
          ctx.lineTo(radius * 0.34, yy + radius * 0.1);
          ctx.stroke();
        }
      } else if (family === "guard" || family === "shield") {
        ctx.beginPath();
        ctx.moveTo(0, -radius * 0.46);
        ctx.lineTo(radius * 0.38, -radius * 0.25);
        ctx.lineTo(radius * 0.3, radius * 0.25);
        ctx.lineTo(0, radius * 0.48);
        ctx.lineTo(-radius * 0.3, radius * 0.25);
        ctx.lineTo(-radius * 0.38, -radius * 0.25);
        ctx.closePath();
        ctx.stroke();
      } else if (family === "poison") {
        ctx.beginPath();
        ctx.moveTo(0, -radius * 0.45);
        ctx.quadraticCurveTo(radius * 0.42, 0, 0, radius * 0.46);
        ctx.quadraticCurveTo(-radius * 0.42, 0, 0, -radius * 0.45);
        ctx.fill();
      } else {
        ctx.rotate(Math.PI * 0.25);
        if (typeof ctx.strokeRect === "function") {
          ctx.strokeRect(-radius * 0.28, -radius * 0.28,
            radius * 0.56, radius * 0.56);
        }
        ctx.rotate(-Math.PI * 0.25);
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    function effectLabelAlpha(job) {
      if (job.fizzled) {
        if (job.age < 0.06) return 0;
        if (job.age < 0.11) return easeOutCubic(phase(job.age, 0.06, 0.11));
        if (job.age <= 0.32) return 1;
        return clamp(1 - phase(job.age, 0.32, 0.46), 0, 1);
      }
      var settle = phase(job.age, job.accent ? 0.2 : 0.38, job.duration);
      return clamp(phase(job.age, 0.17, 0.27) * (1 - settle), 0, 1);
    }

    function drawEffect(ctx, job) {
      refreshFizzleSource(job);
      var anticipationEnd = job.accent ? 0.08 : job.fizzled ? 0.1 : 0.19;
      var impactEnd = job.accent ? 0.2 : job.fizzled ? 0.22 : 0.38;
      var anticipation = phase(job.age, 0, anticipationEnd);
      var impact = phase(job.age, anticipationEnd, impactEnd);
      var settle = phase(job.age, impactEnd, job.duration);
      var radius;
      if (job.accent) {
        radius = job.age < anticipationEnd ?
          lerp(30, 18, easeInCubic(anticipation)) :
          lerp(16, 34, easeOutBack(impact));
      } else if (job.fizzled) {
        radius = job.age < anticipationEnd ?
          lerp(50, 36, easeInCubic(anticipation)) :
          lerp(36, 12, easeInCubic(impact));
      } else {
        radius = job.age < anticipationEnd ?
          lerp(74, 42, easeInCubic(anticipation)) :
          lerp(36, 72, easeOutBack(impact));
      }
      var alpha = job.age < impactEnd ? 1 : 1 - settle;
      ctx.save();
      ctx.translate(job.x, job.y);
      ctx.globalCompositeOperation = "lighter";
      var glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.2);
      glow.addColorStop(0, rgba(job.color, alpha * 0.28));
      glow.addColorStop(0.6, rgba(job.color, alpha * 0.1));
      glow.addColorStop(1, rgba(job.color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba(job.color, alpha * 0.9);
      ctx.lineWidth = lerp(4, 1.2, settle);
      ctx.beginPath();
      ctx.arc(0, 0, radius, -Math.PI * 0.88, Math.PI * 0.88);
      ctx.stroke();
      drawEffectGlyph(ctx, job.family, job.color, radius * 0.75, alpha);
      if (job.family === "damage") {
        var damagePulse = Math.sin(phase(job.age,
          anticipationEnd * 0.72, impactEnd * 0.92) * Math.PI);
        drawDirectionalSlash(ctx, 0, 0,
          job.accent ? -0.62 : -0.38,
          impact, alpha * damagePulse,
          job.color || RED, job.accent ? 0.52 : 0.7);
        drawContactFragments(ctx, radius * 0.78, impact,
          alpha * damagePulse * 0.68, job.color || RED,
          job.accent ? 11 : 9);
      } else if (job.family === "summon") {
        ctx.save();
        ctx.scale(1, 0.34);
        ctx.strokeStyle = rgba(PALE_GOLD, alpha * 0.72);
        ctx.lineWidth = lerp(6, 1, impact);
        ctx.beginPath();
        ctx.arc(0, 0, lerp(12, radius * 1.22, easeOutQuart(impact)),
          0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      if (job.accent) return;
      var labelAlpha = effectLabelAlpha(job);
      var labelTravel = Math.min(36, Math.max(0, Number(job.labelTravel) || 24));
      var labelRise = easeOutCubic(phase(job.age, 0.17, job.duration)) * labelTravel;
      ctx.save();
      ctx.translate(job.x, job.y - 58 - labelRise);
      ctx.globalAlpha = labelAlpha;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "800 18px 'Malgun Gothic',sans-serif";
      var text = job.label + (job.showAmount || job.amount ? " " + job.amount : "");
      var width = ctx.measureText(text).width + 24;
      ctx.fillStyle = job.fizzled ? "rgba(8,10,12,.96)" : "rgba(13,16,18,.9)";
      roundedRect(ctx, -width * 0.5, -16, width, 32, 10);
      ctx.fill();
      var labelColor = job.labelColor || job.color;
      ctx.strokeStyle = rgba(labelColor, 0.82);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = labelColor;
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }

    function drawTacticalLabel(ctx, job, alpha, rise) {
      if (!job.label) return;
      ctx.save();
      ctx.translate(job.x, job.y - 62 - (rise || 0));
      ctx.globalAlpha = alpha;
      ctx.font = "800 16px 'Malgun Gothic',sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var width = Math.min(190, ctx.measureText(job.label).width + 28);
      ctx.fillStyle = "rgba(10,13,17,.91)";
      roundedRect(ctx, -width * 0.5, -16, width, 32, 10);
      ctx.fill();
      ctx.strokeStyle = rgba(job.color, 0.86);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = job.secondaryColor || job.color;
      ctx.fillText(job.label, 0, 0, width - 16);
      ctx.restore();
    }

    function drawTacticalCue(ctx, job) {
      var t = clamp(job.age / job.duration, 0, 1);
      var enter = easeOutBack(phase(t, 0, 0.34));
      var fade = 1 - easeInCubic(phase(t, 0.62, 1));
      var alpha = clamp(enter * fade, 0, 1);
      var pulse = Math.sin(clamp(t / 0.72, 0, 1) * Math.PI);
      var radius = lerp(24, 58, easeOutQuart(t));
      ctx.save();
      ctx.translate(job.x, job.y);
      ctx.globalAlpha = alpha;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (job.kind === "formation-place") {
        ctx.globalCompositeOperation = "lighter";
        ctx.save();
        ctx.scale(1, 0.34);
        ctx.strokeStyle = rgba(job.color, 0.94);
        ctx.lineWidth = lerp(7, 1.5, t);
        ctx.beginPath();
        ctx.arc(0, 0, radius * 1.18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = rgba(job.secondaryColor, 0.72);
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.68, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = rgba(job.color, 0.82 * alpha);
        ctx.lineWidth = 3;
        for (var notch = -1; notch <= 1; notch += 1) {
          ctx.beginPath();
          ctx.moveTo(notch * 18, 18);
          ctx.lineTo(notch * 18, -18 - pulse * 14);
          ctx.stroke();
        }
      } else if (job.kind === "formation-block") {
        ctx.fillStyle = rgba(job.color, 0.1 * alpha);
        roundedRect(ctx, -54, -49, 108, 98, 18);
        ctx.fill();
        ctx.strokeStyle = rgba(job.color, 0.92);
        ctx.lineWidth = lerp(7, 2, t);
        ctx.stroke();
        for (var bar = -1; bar <= 1; bar += 1) {
          ctx.beginPath();
          ctx.moveTo(bar * 27, -38);
          ctx.lineTo(bar * 27, 38);
          ctx.stroke();
        }
        ctx.strokeStyle = rgba(job.secondaryColor, 0.9 * pulse);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, -4, 14, Math.PI, 0);
        ctx.lineTo(14, 22);
        ctx.lineTo(-14, 22);
        ctx.closePath();
        ctx.stroke();
      } else if (job.kind === "row-strike") {
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        for (var strike = -1; strike <= 1; strike += 1) {
          var offset = strike * 22;
          ctx.strokeStyle = rgba(strike === 0 ? job.secondaryColor : job.color, 0.9);
          ctx.lineWidth = lerp(8, 2, t);
          ctx.beginPath();
          ctx.moveTo(-68 - pulse * 18, offset + 16);
          ctx.lineTo(68 + pulse * 18, offset - 16);
          ctx.stroke();
        }
      } else if (job.kind === "row-reinforce") {
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = rgba(job.color, 0.92);
        ctx.lineWidth = lerp(6, 2, t);
        ctx.beginPath();
        ctx.moveTo(-60, 32);
        ctx.lineTo(-60, -30);
        ctx.lineTo(60, -30);
        ctx.lineTo(60, 32);
        ctx.stroke();
        ctx.strokeStyle = rgba(job.secondaryColor, 0.9);
        for (var arrow = -1; arrow <= 1; arrow += 1) {
          var arrowX = arrow * 34;
          ctx.beginPath();
          ctx.moveTo(arrowX, 30);
          ctx.lineTo(arrowX, -12 - pulse * 12);
          ctx.moveTo(arrowX - 8, -4 - pulse * 12);
          ctx.lineTo(arrowX, -12 - pulse * 12);
          ctx.lineTo(arrowX + 8, -4 - pulse * 12);
          ctx.stroke();
        }
      } else if (job.kind === "formation-teamwork") {
        ctx.globalCompositeOperation = "lighter";
        ctx.lineWidth = lerp(7, 2, t);
        ctx.strokeStyle = rgba(job.color, 0.94);
        ctx.beginPath();
        ctx.arc(0, -34, 15 + pulse * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = rgba(job.secondaryColor, 0.94);
        ctx.beginPath();
        ctx.arc(0, 34, 15 + pulse * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = rgba(PALE_GOLD, 0.92);
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(0, 18);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(0, 11);
        ctx.lineTo(10, 0);
        ctx.stroke();
      } else if (job.kind === "faction-link") {
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = rgba(job.color, 0.94);
        ctx.lineWidth = lerp(6, 2, t);
        ctx.beginPath();
        ctx.arc(-18, 0, radius * 0.42, -Math.PI * 0.78, Math.PI * 0.78);
        ctx.stroke();
        ctx.strokeStyle = rgba(job.secondaryColor, 0.9);
        ctx.beginPath();
        ctx.arc(18, 0, radius * 0.42, Math.PI * 0.22, Math.PI * 1.78);
        ctx.stroke();
        for (var ray = 0; ray < 6; ray += 1) {
          var rayAngle = ray * Math.PI / 3 + t * 0.35;
          ctx.beginPath();
          ctx.moveTo(Math.cos(rayAngle) * 42, Math.sin(rayAngle) * 42);
          ctx.lineTo(Math.cos(rayAngle) * (54 + pulse * 8),
            Math.sin(rayAngle) * (54 + pulse * 8));
          ctx.stroke();
        }
      } else if (job.kind === "duel-start") {
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = rgba(job.color, 0.92);
        ctx.lineWidth = lerp(8, 2, t);
        ctx.beginPath();
        ctx.moveTo(job.x1, job.y1);
        ctx.quadraticCurveTo(
          (job.x1 + job.x2) * 0.5,
          (job.y1 + job.y2) * 0.5 - 38,
          job.x2,
          job.y2
        );
        ctx.stroke();
        ctx.strokeStyle = rgba(job.secondaryColor, 0.9);
        ctx.beginPath();
        ctx.moveTo(job.x2, job.y2);
        ctx.quadraticCurveTo(
          (job.x1 + job.x2) * 0.5,
          (job.y1 + job.y2) * 0.5 + 38,
          job.x1,
          job.y1
        );
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.translate(job.x, job.y);
        ctx.globalAlpha = alpha;
        drawDirectionalSlash(ctx, 0, 0, -0.65, t, alpha, job.color, 0.72);
        drawDirectionalSlash(ctx, 0, 0, 0.65, t, alpha, job.secondaryColor, 0.72);
      } else if (job.kind === "duel-hit") {
        drawDirectionalSlash(ctx, 0, 0, -0.72, t, alpha, job.color, 0.82);
        drawDirectionalSlash(ctx, 0, 0, 0.72, t, alpha, job.secondaryColor, 0.82);
        ctx.strokeStyle = rgba(job.color, 0.86 * pulse);
        ctx.lineWidth = lerp(8, 1, t);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (job.kind === "status-burn") {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = rgba(job.color, 0.74 * alpha);
        for (var flame = -1; flame <= 1; flame += 1) {
          ctx.save();
          ctx.translate(flame * 17, 10);
          ctx.beginPath();
          ctx.moveTo(0, 22);
          ctx.quadraticCurveTo(-14, 0, flame * 3, -36 - pulse * 12);
          ctx.quadraticCurveTo(17, -2, 0, 22);
          ctx.fill();
          ctx.restore();
        }
      } else if (job.kind === "status-counter") {
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = rgba(job.color, 0.9);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.75, -Math.PI * 0.85 + t * 2,
          Math.PI * 0.65 + t * 2);
        ctx.stroke();
        ctx.strokeStyle = rgba(job.secondaryColor, 0.88);
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.48, Math.PI * 0.15 - t * 2.4,
          Math.PI * 1.55 - t * 2.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(22, -17);
        ctx.lineTo(34, -7);
        ctx.lineTo(19, -3);
        ctx.stroke();
      } else if (job.kind === "status-intimidate") {
        ctx.strokeStyle = rgba(job.color, 0.9);
        for (var wave = 0; wave < 3; wave += 1) {
          ctx.lineWidth = 5 - wave;
          ctx.beginPath();
          ctx.arc(-26, 0, 24 + wave * 16 + t * 10,
            -Math.PI * 0.42, Math.PI * 0.42);
          ctx.stroke();
        }
        ctx.fillStyle = rgba(job.secondaryColor, 0.62 * alpha);
        ctx.beginPath();
        ctx.moveTo(-48, -18);
        ctx.lineTo(-18, 0);
        ctx.lineTo(-48, 18);
        ctx.closePath();
        ctx.fill();
      } else if (job.kind === "status-empty-fort") {
        ctx.strokeStyle = rgba(job.color, 0.9);
        ctx.lineWidth = 4;
        roundedRect(ctx, -42, -37, 84, 74, 7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-28, 36);
        ctx.lineTo(-28, -18);
        ctx.lineTo(0, -34);
        ctx.lineTo(28, -18);
        ctx.lineTo(28, 36);
        ctx.stroke();
        ctx.strokeStyle = rgba(job.secondaryColor, 0.74 * pulse);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.moveTo(-radius, 0);
        ctx.lineTo(radius, 0);
        ctx.stroke();
      } else if (job.kind === "status-raid") {
        ctx.strokeStyle = rgba(job.color, 0.94);
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.72, -Math.PI * 0.75, Math.PI * 0.85);
        ctx.stroke();
        ctx.strokeStyle = rgba(job.secondaryColor, 0.9);
        for (var claw = -1; claw <= 1; claw += 1) {
          ctx.beginPath();
          ctx.moveTo(-28 + claw * 12, -32);
          ctx.quadraticCurveTo(claw * 9, 0, 28 + claw * 12, 32);
          ctx.stroke();
        }
        ctx.fillStyle = rgba(job.color, 0.48 * pulse);
        ctx.beginPath();
        ctx.arc(0, 0, 9 + pulse * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      drawTacticalLabel(ctx, job, alpha, easeOutCubic(t) * 14);
    }

    function drawTarget(ctx, job) {
      var anticipation = phase(job.age, 0, 0.16);
      var settle = phase(job.age, 0.16, job.duration);
      var radius = lerp(68, 42, easeOutBack(anticipation));
      var alpha = (1 - settle) * clamp(anticipation * 2, 0, 1);
      ctx.save();
      ctx.translate(job.x, job.y);
      ctx.rotate(settle * 0.3);
      ctx.strokeStyle = rgba(job.color || RED, alpha);
      ctx.lineWidth = 3;
      if (typeof ctx.setLineDash === "function") ctx.setLineDash([9, 7]);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      if (typeof ctx.setLineDash === "function") ctx.setLineDash([]);
      for (var i = 0; i < 4; i += 1) {
        var angle = i * Math.PI * 0.5;
        ctx.save();
        ctx.rotate(angle);
        ctx.fillStyle = rgba(job.color || RED, alpha);
        ctx.beginPath();
        ctx.moveTo(radius - 2, 0);
        ctx.lineTo(radius + 16, -8);
        ctx.lineTo(radius + 16, 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    function drawGuard(ctx, job) {
      var anticipation = phase(job.age, 0, 0.12);
      var impact = phase(job.age, 0.12, 0.3);
      var settle = phase(job.age, 0.3, job.duration);
      var radius = job.age < 0.12 ? lerp(72, 43, easeInCubic(anticipation)) :
        lerp(42, 68, easeOutBack(impact));
      var alpha = job.age < 0.3 ? 1 : 1 - settle;
      ctx.save();
      ctx.translate(job.x, job.y);
      ctx.shadowColor = STEEL;
      ctx.shadowBlur = 18;
      ctx.fillStyle = rgba("#163247", alpha * 0.62);
      ctx.strokeStyle = rgba(STEEL, alpha);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, -radius);
      ctx.lineTo(radius * 0.72, -radius * 0.52);
      ctx.lineTo(radius * 0.58, radius * 0.42);
      ctx.lineTo(0, radius);
      ctx.lineTo(-radius * 0.58, radius * 0.42);
      ctx.lineTo(-radius * 0.72, -radius * 0.52);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#edf9ff";
      ctx.font = "900 18px 'Malgun Gothic',sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(job.label || "수호", 0, 2);
      ctx.restore();
    }

    function drawCommanderEmphasis(ctx, job) {
      var d = dimensions();
      var t = clamp(job.age / job.duration, 0, 1);
      var reveal = easeOutBack(phase(t, 0, 0.2));
      var settle = easeOutCubic(phase(t, 0.14, 0.58));
      var fade = 1 - easeInCubic(phase(t, 0.62, 1));
      var alpha = clamp(reveal, 0, 1) * fade;
      var flash = 1 - easeOutCubic(phase(t, 0, 0.14));
      var radius = lerp(28, 94, settle);

      ctx.save();
      ctx.fillStyle = rgba(INK, alpha * 0.24);
      ctx.fillRect(0, 0, d.width, d.height);
      if (flash > 0) {
        ctx.fillStyle = rgba(job.secondaryColor || PALE_GOLD, flash * 0.16);
        ctx.fillRect(0, 0, d.width, d.height);
      }

      ctx.translate(job.x, job.y);
      ctx.globalCompositeOperation = "lighter";
      var aura = ctx.createRadialGradient(0, 0, 2, 0, 0, radius * 1.75);
      aura.addColorStop(0, rgba(job.secondaryColor || PALE_GOLD, alpha * 0.3));
      aura.addColorStop(0.42, rgba(job.color || GOLD, alpha * 0.2));
      aura.addColorStop(1, rgba(job.color || GOLD, 0));
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.75, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate((job.commanderId === "sunquan" ? -1 : 1) * (0.08 + t * 0.12));
      ctx.strokeStyle = rgba(job.color || GOLD, alpha * 0.9);
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(0, 0, radius, -Math.PI * 0.9, Math.PI * 0.72);
      ctx.stroke();
      ctx.strokeStyle = rgba(job.secondaryColor || PALE_GOLD, alpha * 0.76);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.72, -Math.PI * 0.66, Math.PI * 0.94);
      ctx.stroke();

      // Option 3 action grammar: diagonal cel-animation cuts radiate from the
      // commander's portrait and retract before they can obscure the board.
      ctx.lineCap = "round";
      for (var ray = 0; ray < 16; ray += 1) {
        var angle = ray * Math.PI / 8 + (ray % 2 ? -0.08 : 0.06);
        var inner = radius * (0.86 + (ray % 3) * 0.08);
        var outer = inner + lerp(76, 158, settle) * (ray % 2 ? 0.68 : 1);
        ctx.strokeStyle = ray % 3 === 0
          ? rgba(job.secondaryColor || PALE_GOLD, alpha * 0.72)
          : rgba(job.color || GOLD, alpha * 0.42);
        ctx.lineWidth = ray % 3 === 0 ? 3.4 : 1.7;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "900 21px 'Malgun Gothic',sans-serif";
      var labelWidth = Math.max(154, ctx.measureText(job.label || "").width + 48);
      var labelY = Math.max(48, job.y - 118 - settle * 18);
      ctx.fillStyle = "rgba(8,13,22,.92)";
      roundedRect(ctx, job.x - labelWidth * 0.5, labelY - 20, labelWidth, 40, 12);
      ctx.fill();
      ctx.strokeStyle = rgba(job.color || GOLD, 0.92);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = job.secondaryColor || PALE_GOLD;
      ctx.fillText(job.label || "", job.x, labelY + 1);
      ctx.restore();
    }

    function drawCommanderHeal(ctx, job) {
      var t = clamp(job.age / job.duration, 0, 1);
      var appear = easeOutBack(phase(t, 0, 0.22));
      var rise = easeOutCubic(phase(t, 0.12, 0.72));
      var fade = 1 - easeInCubic(phase(t, 0.66, 1));
      var alpha = clamp(appear, 0, 1) * fade;
      var radius = lerp(28, 58, easeOutCubic(phase(t, 0.08, 0.54)));
      ctx.save();
      ctx.translate(job.x, job.y);
      ctx.globalCompositeOperation = "lighter";
      var glow = ctx.createRadialGradient(0, 0, 2, 0, 0, radius * 1.45);
      glow.addColorStop(0, rgba(HEAL_WHITE, alpha * 0.38));
      glow.addColorStop(0.42, rgba(HEAL_CYAN, alpha * 0.2));
      glow.addColorStop(1, rgba(HEAL_CYAN, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate(t * 0.5);
      ctx.strokeStyle = rgba(HEAL_CYAN, alpha * 0.92);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.rotate(-t * 1.08);
      ctx.strokeStyle = rgba(HEAL_WHITE, alpha * 0.82);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.68, 0, Math.PI * 2);
      for (var rune = 0; rune < 6; rune += 1) {
        var angle = rune * Math.PI / 3;
        ctx.moveTo(Math.cos(angle) * radius * 0.74, Math.sin(angle) * radius * 0.74);
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(job.x, job.y);
      ctx.lineCap = "round";
      for (var current = -1; current <= 1; current += 1) {
        var currentX = current * 20;
        ctx.strokeStyle = rgba(current === 0 ? HEAL_WHITE : HEAL_CYAN,
          alpha * (current === 0 ? 0.72 : 0.46));
        ctx.lineWidth = current === 0 ? 3 : 1.8;
        ctx.beginPath();
        ctx.moveTo(currentX, 24);
        ctx.quadraticCurveTo(
          currentX + (current % 2 ? -12 : 12),
          lerp(12, -42, rise),
          currentX + current * 5,
          lerp(0, -84, rise)
        );
        ctx.stroke();
        var arrowY = lerp(12, -62, rise);
        ctx.beginPath();
        ctx.moveTo(currentX - 6, arrowY + 8);
        ctx.lineTo(currentX, arrowY);
        ctx.lineTo(currentX + 6, arrowY + 8);
        ctx.stroke();
      }
      ctx.restore();

      var labelAlpha = alpha * clamp(phase(t, 0.08, 0.25), 0, 1);
      ctx.save();
      ctx.translate(job.x, job.y - 82 - rise * 16);
      ctx.globalAlpha = labelAlpha;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "800 16px 'Malgun Gothic',sans-serif";
      var text = job.label + (job.amount > 0 ? " +" + job.amount : "");
      var width = ctx.measureText(text).width + 24;
      ctx.fillStyle = "rgba(10,26,30,.9)";
      roundedRect(ctx, -width * 0.5, -15, width, 30, 10);
      ctx.fill();
      ctx.strokeStyle = rgba(HEAL_CYAN, 0.86);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = HEAL_WHITE;
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }

    function drawCommanderReflect(ctx, job) {
      var travel = easeInOutCubic(phase(job.age, 0.04, 0.34));
      var settle = phase(job.age, 0.34, job.duration);
      var alpha = 1 - easeInCubic(settle);
      var inv = 1 - travel;
      var currentX = inv * inv * job.x1 + 2 * inv * travel * job.cx +
        travel * travel * job.x2;
      var currentY = inv * inv * job.y1 + 2 * inv * travel * job.cy +
        travel * travel * job.y2;
      var controlX = lerp(job.x1, job.cx, travel);
      var controlY = lerp(job.y1, job.cy, travel);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.strokeStyle = rgba(REFLECT_GOLD, alpha * 0.28);
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(job.x1, job.y1);
      ctx.quadraticCurveTo(controlX, controlY, currentX, currentY);
      ctx.stroke();
      ctx.strokeStyle = rgba(PALE_GOLD, alpha * 0.94);
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(job.x1, job.y1);
      var sourcePulse = Math.sin(phase(job.age, 0, 0.18) * Math.PI);
      ctx.strokeStyle = rgba(REFLECT_GOLD, sourcePulse * 0.88);
      ctx.lineWidth = lerp(5, 1.4, phase(job.age, 0, 0.18));
      ctx.beginPath();
      ctx.arc(0, 0, lerp(20, 62, easeOutQuart(phase(job.age, 0, 0.18))),
        0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (travel > 0.16) {
        ctx.save();
        ctx.translate(currentX, currentY);
        ctx.rotate(Math.atan2(job.ny || 0, job.nx || 1));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = PALE_GOLD;
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-4, -9);
        ctx.lineTo(1, -3);
        ctx.lineTo(-14, 0);
        ctx.lineTo(1, 3);
        ctx.lineTo(-4, 9);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      if (travel > 0.72) {
        var contact = easeOutCubic(phase(travel, 0.72, 1));
        ctx.save();
        ctx.translate(job.x2, job.y2);
        ctx.strokeStyle = rgba(REFLECT_GOLD, alpha * (1 - contact * 0.3));
        ctx.lineWidth = lerp(5, 1.2, contact);
        ctx.beginPath();
        ctx.arc(0, 0, lerp(12, 54, contact), 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = "900 15px 'Malgun Gothic',sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = PALE_GOLD;
        ctx.fillText(job.label, 0, -48);
        ctx.restore();
      }
    }

    function drawCommanderFlood(ctx, job) {
      var t = clamp(job.age / job.duration, 0, 1);
      var sweep = easeInOutCubic(phase(t, 0.02, 0.66));
      var fade = 1 - easeInCubic(phase(t, 0.68, 1));
      var frontX = lerp(job.x1, job.x2, sweep);
      var depth = lerp(18, 44, Math.sin(Math.min(1, sweep) * Math.PI));
      var waveAlpha = fade * clamp(phase(t, 0, 0.14), 0, 1);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      var wash = ctx.createLinearGradient(job.x1, job.y, frontX + 1, job.y);
      wash.addColorStop(0, rgba(WATER_BLUE, 0));
      wash.addColorStop(0.58, rgba(WATER_TEAL, waveAlpha * 0.1));
      wash.addColorStop(1, rgba(HEAL_WHITE, waveAlpha * 0.25));
      ctx.fillStyle = wash;
      ctx.beginPath();
      ctx.moveTo(job.x1, job.y + depth * 0.8);
      ctx.quadraticCurveTo(
        lerp(job.x1, frontX, 0.52),
        job.y + depth * (0.3 + Math.sin(t * Math.PI * 5) * 0.14),
        frontX,
        job.y + depth * 0.15
      );
      ctx.lineTo(frontX, job.y - depth);
      ctx.quadraticCurveTo(
        lerp(job.x1, frontX, 0.48),
        job.y - depth * (0.56 + Math.sin(t * Math.PI * 4) * 0.12),
        job.x1,
        job.y - depth * 0.25
      );
      ctx.closePath();
      ctx.fill();
      for (var ribbon = 0; ribbon < 3; ribbon += 1) {
        var offset = (ribbon - 1) * 13;
        ctx.strokeStyle = rgba(ribbon === 1 ? HEAL_WHITE :
          ribbon === 0 ? WATER_BLUE : WATER_TEAL,
        waveAlpha * (0.68 - ribbon * 0.08));
        ctx.lineWidth = ribbon === 1 ? 2.2 : 3.4;
        ctx.beginPath();
        ctx.moveTo(job.x1, job.y + offset);
        ctx.quadraticCurveTo(
          lerp(job.x1, frontX, 0.5),
          job.y + offset - 18 - Math.sin(t * Math.PI * 5 + ribbon) * 9,
          frontX,
          job.y + offset
        );
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawCommanderFloodHit(ctx, job) {
      var t = clamp(job.age / job.duration, 0, 1);
      var impact = easeOutBack(phase(t, 0, 0.3));
      var settle = phase(t, 0.3, 1);
      var alpha = 1 - easeInCubic(settle);
      ctx.save();
      ctx.translate(job.x, job.y);
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = rgba(job.targetKind === "hero" ? WATER_BLUE : WATER_TEAL,
        alpha * 0.88);
      ctx.lineWidth = lerp(6, 1.2, settle);
      ctx.beginPath();
      ctx.ellipse(0, 12, lerp(12, 54, impact), lerp(5, 18, impact),
        0, 0, Math.PI * 2);
      ctx.stroke();
      for (var splash = -2; splash <= 2; splash += 1) {
        var x = splash * 12;
        var height = (30 + (2 - Math.abs(splash)) * 13) * impact;
        ctx.strokeStyle = rgba(splash % 2 ? HEAL_WHITE : WATER_TEAL,
          alpha * (0.52 + (splash === 0 ? 0.25 : 0)));
        ctx.lineWidth = splash === 0 ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(x, 10);
        ctx.quadraticCurveTo(x + splash * 3, -height * 0.55,
          x + splash * 7, -height);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + splash * 7, -height - 3, 2.5 + (splash === 0 ? 1 : 0),
          0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawCommanderLock(ctx, job) {
      var t = clamp(job.age / job.duration, 0, 1);
      var cinch = easeOutBack(phase(t, 0, 0.34));
      var settle = phase(t, 0.34, 1);
      var alpha = 1 - easeInCubic(settle);
      var radiusX = lerp(74, 42, cinch);
      var radiusY = lerp(56, 32, cinch);
      ctx.save();
      ctx.translate(job.x, job.y);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = rgba(ROPE_TAN, 0.52);
      ctx.shadowBlur = 10;
      for (var loop = -1; loop <= 1; loop += 2) {
        ctx.save();
        ctx.rotate(loop * lerp(0.64, 0.38, cinch));
        ctx.strokeStyle = rgba(loop === -1 ? ROPE_TAN : SEAL_IVORY,
          alpha * (loop === -1 ? 0.9 : 0.72));
        ctx.lineWidth = loop === -1 ? 5 : 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.shadowBlur = 0;
      ctx.rotate(t * 0.18);
      ctx.strokeStyle = rgba(SEAL_IVORY, alpha * 0.78);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, lerp(52, 38, cinch), 0, Math.PI * 2);
      for (var seal = 0; seal < 8; seal += 1) {
        var angle = seal * Math.PI / 4;
        ctx.moveTo(Math.cos(angle) * 29, Math.sin(angle) * 29);
        ctx.lineTo(Math.cos(angle) * 43, Math.sin(angle) * 43);
      }
      ctx.stroke();
      ctx.fillStyle = rgba("#5b3c1f", alpha * 0.95);
      ctx.strokeStyle = rgba(SEAL_IVORY, alpha);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(13, 0);
      ctx.lineTo(0, 13);
      ctx.lineTo(-13, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(job.x, job.y - 60);
      ctx.globalAlpha = alpha * clamp(phase(t, 0.08, 0.25), 0, 1);
      ctx.font = "900 15px 'Malgun Gothic',sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var width = ctx.measureText(job.label).width + 22;
      ctx.fillStyle = "rgba(35,24,14,.92)";
      roundedRect(ctx, -width * 0.5, -15, width, 30, 9);
      ctx.fill();
      ctx.strokeStyle = rgba(ROPE_TAN, 0.88);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = SEAL_IVORY;
      ctx.fillText(job.label, 0, 0);
      ctx.restore();
    }

    function drawDraw(ctx, job) {
      var anticipation = phase(job.age, 0, 0.12);
      var travel = easeInOutCubic(phase(job.age, 0.12, 0.36));
      var settle = phase(job.age, 0.36, job.duration);
      var direction = job.enemy ? -1 : 1;
      var x = lerp(job.x + direction * 132, job.x, travel);
      var y = lerp(job.y - 118, job.y, travel);
      var angle = lerp(direction * -0.32, direction * 0.04, travel);
      var alpha = job.age < 0.12 ? anticipation : 1 - settle;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = rgba(job.burned ? RED : GOLD, 0.8);
      ctx.shadowBlur = 18;
      ctx.fillStyle = "rgba(21,22,22,.95)";
      roundedRect(ctx, -25, -36, 50, 72, 9);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = job.burned ? RED : PALE_GOLD;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = rgba(job.burned ? RED : GOLD, 0.24);
      ctx.beginPath();
      ctx.arc(0, -5, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = rgba(job.burned ? RED : PALE_GOLD, alpha * (1 - settle));
      ctx.lineWidth = lerp(8, 1, settle);
      ctx.beginPath();
      ctx.arc(job.x, job.y, lerp(12, 54, easeOutCubic(settle)), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    function roundedRect(ctx, x, y, width, height, radius) {
      var r = Math.min(radius, width * 0.5, height * 0.5);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + width - r, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + r);
      ctx.lineTo(x + width, y + height - r);
      ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      ctx.lineTo(x + r, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function drawInvalid(ctx, job) {
      var t = clamp(job.age / job.duration, 0, 1);
      var alpha = clamp((1 - t) / 0.25, 0, 1);
      var jitter = reduceMotion ? 0 : Math.sin(t * Math.PI * 8) * (1 - t) * 7;
      ctx.save();
      ctx.translate(job.x + jitter, job.y - 72 - easeOutCubic(t) * 12);
      ctx.globalAlpha = alpha;
      ctx.font = "700 15px 'Malgun Gothic',sans-serif";
      var width = Math.min(280, ctx.measureText(job.text).width + 30);
      ctx.fillStyle = "rgba(42,15,15,.94)";
      roundedRect(ctx, -width * 0.5, -19, width, 38, 12);
      ctx.fill();
      ctx.strokeStyle = rgba(RED, 0.8);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffd8cf";
      ctx.fillText(job.text, 0, 0, width - 18);
      ctx.restore();
    }

    function drawFinale(ctx, job) {
      var d = dimensions();
      var t = clamp(job.age / job.duration, 0, 1);
      var enter = easeOutCubic(clamp(t / 0.16, 0, 1));
      var exit = easeInCubic(clamp((1 - t) / 0.15, 0, 1));
      var alpha = enter * exit;
      ctx.save();
      var centerX = d.width * 0.5;
      var centerY = d.height * 0.47;
      var atmosphere = ctx.createRadialGradient(
        centerX, centerY, d.height * 0.05,
        centerX, centerY, d.width * 0.58
      );
      if (job.won) {
        atmosphere.addColorStop(0, rgba(PALE_GOLD, alpha * 0.23));
        atmosphere.addColorStop(0.22, rgba(GOLD, alpha * 0.13));
        atmosphere.addColorStop(0.58, rgba("#c45e32", alpha * 0.045));
      } else {
        atmosphere.addColorStop(0, job.draw ?
          "rgba(174,185,189," + alpha * 0.12 + ")" :
          "rgba(125,73,65," + alpha * 0.16 + ")");
        atmosphere.addColorStop(0.42, "rgba(32,26,25," + alpha * 0.09 + ")");
      }
      atmosphere.addColorStop(1, "rgba(3,5,7,0)");
      ctx.fillStyle = atmosphere;
      ctx.fillRect(0, 0, d.width, d.height);
      ctx.translate(centerX, centerY);
      var crest = easeOutBack(phase(t, 0.05, 0.48));
      if (job.won) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = GOLD;
        for (var ring = 0; ring < 3; ring += 1) {
          ctx.lineWidth = 3.2 - ring * 0.7;
          ctx.beginPath();
          ctx.arc(0, 0, (82 + ring * 44) * crest,
            -Math.PI * (0.92 - ring * 0.06), Math.PI * (0.1 + ring * 0.07));
          ctx.stroke();
        }
        ctx.globalAlpha = alpha * 0.34;
        for (var ray = 0; ray < 14; ray += 1) {
          var angle = ray * Math.PI / 7 - Math.PI * 0.5 + t * 0.08;
          var rayInner = 112 + (ray % 2) * 16;
          var rayOuter = rayInner + 76 * easeOutCubic(phase(t, 0.14, 0.64));
          ctx.lineWidth = ray % 2 ? 1.2 : 2.4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * rayInner, Math.sin(angle) * rayInner);
          ctx.lineTo(Math.cos(angle) * rayOuter, Math.sin(angle) * rayOuter);
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = alpha * 0.72;
        ctx.strokeStyle = PALE_GOLD;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, 62 * crest, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.rotate(-0.12);
        for (var wing = -1; wing <= 1; wing += 2) {
          ctx.beginPath();
          ctx.moveTo(wing * 56, 24);
          ctx.quadraticCurveTo(wing * 118, 6, wing * 158, -52);
          ctx.stroke();
          for (var leaf = 0; leaf < 5; leaf += 1) {
            var lx = wing * (76 + leaf * 15);
            var ly = 14 - leaf * 11;
            ctx.save();
            ctx.translate(lx, ly);
            ctx.rotate(wing * (-0.5 + leaf * 0.05));
            ctx.scale(crest, crest);
            ctx.beginPath();
            ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }
      } else {
        ctx.globalAlpha = alpha * (job.draw ? 0.34 : 0.58);
        ctx.strokeStyle = job.draw ? "#aeb9bd" : "#7e4b43";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 4, 88 * crest, -Math.PI * 0.96, Math.PI * 0.08);
        ctx.stroke();
        ctx.lineWidth = 1.5;
        for (var crack = 0; crack < 9; crack += 1) {
          var crackAngle = crack * 0.7 + 0.18;
          var crackStart = 28 + (crack % 2) * 12;
          var crackEnd = 105 + (crack % 3) * 18;
          ctx.beginPath();
          ctx.moveTo(
            Math.cos(crackAngle) * crackStart,
            Math.sin(crackAngle) * crackStart
          );
          ctx.lineTo(
            Math.cos(crackAngle + (crack % 2 ? 0.08 : -0.06)) * crackEnd * 0.65,
            Math.sin(crackAngle + (crack % 2 ? 0.08 : -0.06)) * crackEnd * 0.65
          );
          ctx.lineTo(
            Math.cos(crackAngle) * crackEnd,
            Math.sin(crackAngle) * crackEnd
          );
          ctx.stroke();
        }
        var curtain = ctx.createLinearGradient(0, -d.height * 0.46, 0, d.height * 0.38);
        curtain.addColorStop(0, "rgba(22,20,20,0)");
        curtain.addColorStop(0.44, job.draw ?
          "rgba(69,75,78," + alpha * 0.08 + ")" :
          "rgba(84,45,41," + alpha * 0.13 + ")");
        curtain.addColorStop(1, "rgba(5,7,9," + alpha * 0.36 + ")");
        ctx.fillStyle = curtain;
        ctx.fillRect(-d.width * 0.5, -d.height * 0.5, d.width, d.height);
      }
      ctx.restore();
    }

    function drawParticle(ctx, p) {
      var lifeRatio = clamp(p.life / p.maxLife, 0, 1);
      var alpha = p.alpha * (lifeRatio < 0.3 ? lifeRatio / 0.3 : 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      if (p.kind === "smoke" || p.kind === "ash") {
        ctx.fillStyle = rgba(p.color, p.kind === "smoke" ? 0.34 : 0.58);
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (1.35 - lifeRatio * 0.35), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "shard") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.55, 0);
        ctx.lineTo(0, p.size * 1.55);
        ctx.lineTo(-p.size * 0.5, 0);
        ctx.closePath();
        ctx.fill();
      } else if (p.kind === "confetti") {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size * 0.55, -p.size * 0.28, p.size * 1.1, p.size * 0.56);
      } else if (p.kind === "leaf") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.6, p.size, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "paper") {
        ctx.fillStyle = rgba(p.color, 0.82);
        ctx.fillRect(-p.size * 0.68, -p.size * 0.88, p.size * 1.36, p.size * 1.76);
        ctx.strokeStyle = rgba("#332a1b", 0.48);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-p.size * 0.38, -p.size * 0.22);
        ctx.lineTo(p.size * 0.38, -p.size * 0.22);
        ctx.moveTo(-p.size * 0.38, p.size * 0.18);
        ctx.lineTo(p.size * 0.2, p.size * 0.18);
        ctx.stroke();
      } else if (p.kind === "chevron") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.5, p.size * 0.42);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-p.size, p.size * 0.4);
        ctx.lineTo(0, -p.size * 0.55);
        ctx.lineTo(p.size, p.size * 0.4);
        ctx.stroke();
      } else if (p.kind === "droplet") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -p.size * 1.2);
        ctx.quadraticCurveTo(p.size, 0, 0, p.size);
        ctx.quadraticCurveTo(-p.size, 0, 0, -p.size * 1.2);
        ctx.fill();
      } else if (p.kind === "glyph") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, p.size * 0.3);
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.moveTo(-p.size, 0);
        ctx.lineTo(p.size, 0);
        ctx.moveTo(0, -p.size);
        ctx.lineTo(0, p.size);
        ctx.stroke();
      } else if (p.kind === "ember") {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -p.size * 1.4);
        ctx.quadraticCurveTo(p.size, 0, 0, p.size);
        ctx.quadraticCurveTo(-p.size, 0, 0, -p.size * 1.4);
        ctx.fill();
      } else {
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, p.size * lifeRatio * p.stretch);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.px - p.x, p.py - p.y);
        ctx.lineTo(0, 0);
        ctx.stroke();
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawReducedJob(ctx, job) {
      if (job.kind === "banner") return drawBanner(ctx, job);
      if (job.kind === "finale") return drawFinale(ctx, job);
      if (job.kind === "board-light") return drawBoardLight(ctx, job);
      if (job.kind === "death-residue") return drawDeathResidue(ctx, job);
      if (job.kind === "invalid") return drawInvalid(ctx, job);
      if (job.kind === "number") {
        var originalAge = job.age;
        job.age = Math.min(job.age, 0.16);
        drawNumber(ctx, job);
        job.age = originalAge;
        return;
      }
      var t = clamp(job.age / job.duration, 0, 1);
      var alpha = clamp((1 - t) / 0.3, 0, 1);
      var x = Number.isFinite(job.x) ? job.x :
        job.kind === "attack" ? job.x2 : dimensions().width * 0.5;
      var y = Number.isFinite(job.y) ? job.y :
        job.kind === "attack" ? job.y2 : dimensions().height * 0.5;
      var label = job.label || {
        summon: "출전",
        attack: "공격",
        impact: "적중",
        shield: "방패",
        guard: "수호",
        target: "대상",
        death: "퇴각",
        draw: job.burned ? "패 소각" : "패 보충"
      }[job.kind] || "";
      var color = job.color || (
        job.kind === "shield" ? BLUE :
          job.kind === "death" ? ASH :
            job.kind === "impact" ? RED : GOLD
      );
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.stroke();
      if (job.kind === "impact" || job.kind === "shield") {
        var reducedAngle = Number.isFinite(job.angle) ? job.angle : 0;
        drawDirectionalSlash(ctx, 0, 0, reducedAngle,
          phase(job.age, 0.02, 0.16), alpha,
          job.kind === "shield" ? BLUE : color,
          job.kind === "shield" ? 0.55 : 0.68);
      }
      if (job.kind === "effect") {
        drawEffectGlyph(ctx, job.family, color, 35, alpha);
      }
      if (label) {
        ctx.font = "800 17px 'Malgun Gothic',sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        var width = ctx.measureText(label).width + 22;
        ctx.fillStyle = "rgba(12,15,18,.92)";
        roundedRect(ctx, -width * 0.5, -62, width, 30, 9);
        ctx.fill();
        ctx.strokeStyle = rgba(color, 0.84);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillText(label, 0, -47);
      }
      ctx.restore();
    }

    function renderJob(ctx, job) {
      if (job.age < 0) return;
      if (reduceMotion) return drawReducedJob(ctx, job);
      switch (job.kind) {
        case "banner": drawBanner(ctx, job); break;
        case "board-light": drawBoardLight(ctx, job); break;
        case "summon": drawSummon(ctx, job); break;
        case "attack": drawAttack(ctx, job); break;
        case "impact": drawImpact(ctx, job); break;
        case "number": drawNumber(ctx, job); break;
        case "death": drawDeath(ctx, job); break;
        case "death-residue": drawDeathResidue(ctx, job); break;
        case "shield": drawShield(ctx, job); break;
        case "guard": drawGuard(ctx, job); break;
        case "target": drawTarget(ctx, job); break;
        case "rune": drawRune(ctx, job); break;
        case "effect": drawEffect(ctx, job); break;
        case "commander-emphasis": drawCommanderEmphasis(ctx, job); break;
        case "commander-heal": drawCommanderHeal(ctx, job); break;
        case "commander-reflect": drawCommanderReflect(ctx, job); break;
        case "commander-flood": drawCommanderFlood(ctx, job); break;
        case "commander-flood-hit": drawCommanderFloodHit(ctx, job); break;
        case "commander-lock": drawCommanderLock(ctx, job); break;
        case "formation-place":
        case "formation-block":
        case "row-strike":
        case "row-reinforce":
        case "formation-teamwork":
        case "faction-link":
        case "duel-start":
        case "duel-hit":
        case "status-burn":
        case "status-counter":
        case "status-intimidate":
        case "status-empty-fort":
        case "status-raid":
          drawTacticalCue(ctx, job); break;
        case "draw": drawDraw(ctx, job); break;
        case "invalid": drawInvalid(ctx, job); break;
        case "finale": drawFinale(ctx, job); break;
        default: break;
      }
    }

    function renderLayer(ctx, layer) {
      for (var i = 0; i < jobs.length; i += 1) {
        if (jobs[i].layer === layer) renderJob(ctx, jobs[i]);
      }
    }

    function render(ctx) {
      if (destroyed || !ctx) return;
      ctx.save();
      ctx.translate(shakeX, shakeY);
      renderLayer(ctx, LAYER_UNDER);
      renderLayer(ctx, LAYER_ACTION);
      for (var p = 0; p < particles.length; p += 1) {
        if (particles[p].active) drawParticle(ctx, particles[p]);
      }
      renderLayer(ctx, LAYER_FEEDBACK);
      renderLayer(ctx, LAYER_OVERLAY);
      ctx.restore();
    }

    function hasActiveVisuals() {
      if (destroyed) return false;
      return jobs.length > 0 ||
        activeParticles > 0 ||
        shakeTime > 0 ||
        shakePower > 0 ||
        shakeX !== 0 ||
        shakeY !== 0;
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      jobs.length = 0;
      effectHistory.length = 0;
      shieldResultHistory.length = 0;
      sourceBoardHistory.length = 0;
      for (var i = 0; i < particles.length; i += 1) particles[i].active = false;
      activeParticles = 0;
      if (mediaQuery && motionListener) {
        if (typeof mediaQuery.removeEventListener === "function") {
          mediaQuery.removeEventListener("change", motionListener);
        } else if (typeof mediaQuery.removeListener === "function") {
          mediaQuery.removeListener(motionListener);
        }
      }
      mediaQuery = null;
      motionListener = null;
      canvas = null;
      getAnchor = function () { return null; };
    }

    return {
      handleEvent: handleEvent,
      update: update,
      render: render,
      shake: shake,
      hasActiveVisuals: hasActiveVisuals,
      destroy: destroy,
      _debug: function () {
        var active = 0;
        for (var i = 0; i < particles.length; i += 1) {
          if (particles[i].active) active += 1;
        }
        return {
          particles: active,
          capacity: particles.length,
          jobs: jobs.length,
          jobKinds: jobs.map(function (job) { return job.kind; }),
          timelines: jobs.map(function (job) {
            return {
              kind: job.kind,
              age: job.age,
              duration: job.duration,
              cueAt: job.cueAt || 0,
              cueFired: job.cueFired,
              layer: job.layer,
              family: job.family || null,
              label: job.label || null,
              commanderId: job.commanderId || null,
              signature: job.signature || null,
              status: job.status || null,
              row: job.row || null,
              slot: Number.isInteger(job.slot) ? job.slot : null,
              linkKind: job.linkKind || null,
              secondaryColor: job.secondaryColor || null,
              targetCount: Number(job.targetCount) || 0,
              targetKind: job.targetKind || null,
              targetIndex: Number.isInteger(job.targetIndex) ? job.targetIndex : null,
              amount: Number.isFinite(job.amount) ? job.amount : null,
              showAmount: Boolean(job.showAmount),
              color: job.color || null,
              labelColor: job.labelColor || job.color || null,
              labelAlpha: job.kind === "effect" && !job.accent ?
                effectLabelAlpha(job) : null,
              x: Number.isFinite(job.x) ? job.x : null,
              y: Number.isFinite(job.y) ? job.y : null,
              x1: Number.isFinite(job.x1) ? job.x1 : null,
              y1: Number.isFinite(job.y1) ? job.y1 : null,
              x2: Number.isFinite(job.x2) ? job.x2 : null,
              y2: Number.isFinite(job.y2) ? job.y2 : null,
              delay: job.age < 0 ? -job.age : 0,
              anchorRole: job.anchorRole || null,
              anchorSide: job.anchorSide || null,
              labelTravel: Number(job.labelTravel) || 0,
              accent: Boolean(job.accent),
              fizzled: Boolean(job.fizzled),
              sourceAnchorResolved: Boolean(job.sourceAnchorResolved),
              sourceBoardIndex: job.sourceReference &&
                Number.isInteger(job.sourceReference.index) ?
                job.sourceReference.index : null,
              resultCue: Boolean(job.resultCue),
              reaction: job.reaction || null,
              contactOvershoot: Number(job.contactOvershoot) || 0,
              impulseTravel: Number(job.impulseTravel) || 0,
              pathLength: Number(job.pathLength) || 0,
              finaleWon: job.kind === "finale" ? Boolean(job.won) : null,
              finaleDraw: job.kind === "finale" ? Boolean(job.draw) : null
            };
          }),
          peakParticles: peakParticles,
          peakJobs: peakJobs,
          poolReuses: poolReuses,
          reducedMotion: reduceMotion,
          destroyed: destroyed,
          shake: { x: shakeX, y: shakeY }
        };
      }
    };
  }

  TK.modules.fxAnimation = { createFX: createFX };
})(typeof globalThis !== "undefined" ? globalThis : this);
