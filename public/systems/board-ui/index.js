(function registerBoardUI(global) {
  "use strict";

  const LOGICAL_WIDTH = 1365;
  const LOGICAL_HEIGHT = 768;
  const GAME_END_REVEAL_DELAY = 900;
  const ATTACK_CONTACT_MS = 365;
  const DIRECT_EFFECT_CONTACT_MS = 125;
  const MINION_DEATH_CUE_MS = 620;
  const COMBAT_PRESENTATION_MS = 700;
  const CARD_PLAY_PRESENTATION_MS = 560;
  const MOTION_MAX_DT_MS = 34;
  const HAND_POSE_SETTLE_MS = 145;
  const INSPECTOR_OPEN_MS = 145;
  const INSPECTOR_CLOSE_MS = 120;
  const PRESS_FEEDBACK_MS = 96;
  const MAX_POINTER_TILT_RAD = 2.5 * Math.PI / 180;
  const TABLETOP_PARALLAX_MAX_X = 3.2;
  const TABLETOP_PARALLAX_MAX_Y = 1.8;
  const BOARD_RENDER_SCALE_MIN = 0.5;
  const BOARD_RENDER_SCALE_MAX = 2;
  const BOARD_AMBIENT_FRAME_MS = 100;
  const TAU = Math.PI * 2;
  const SYSTEM_FONT = '"Noto Serif KR", "Nanum Myeongjo", "Malgun Gothic", serif';
  const UI_FONT = '"Noto Sans KR", "Malgun Gothic", system-ui, sans-serif';

  const COLORS = {
    ink: "#16110d",
    cream: "#f7e7bd",
    parchment: "#d8bd7b",
    gold: "#dfb558",
    brightGold: "#ffe09a",
    bronze: "#765024",
    jade: "#183f3a",
    jadeLight: "#2b675a",
    red: "#8f2826",
    blue: "#4274a9",
    health: "#c63a32",
    attack: "#e0ad49",
    armor: "#7bb0c7",
  };

  const FACTIONS = {
    "촉": { primary: "#2f7655", secondary: "#d6b85e", glow: "#77dca0", mark: "蜀" },
    "위": { primary: "#3e527d", secondary: "#bcc7d8", glow: "#91b9ff", mark: "魏" },
    "오": { primary: "#8d3532", secondary: "#d5a849", glow: "#ff8e70", mark: "吳" },
    "남만": { primary: "#4d6535", secondary: "#d39a3f", glow: "#b9ec63", mark: "南" },
    "군웅": { primary: "#6a3946", secondary: "#c6a06d", glow: "#ed7793", mark: "雄" },
  };

  const COMMANDER_PRESENTATION = Object.freeze({
    caocao: Object.freeze({
      id: "caocao",
      name: "조조",
      faction: "위",
      factionLabel: "위",
      mark: "魏",
      powerName: "패왕의 휴식",
      powerCost: 1,
      powerText: "내 지휘관의 체력을 1 회복",
      active: true,
      palette: Object.freeze({
        dark: "#09111d", low: "#1d304e", mid: "#42618c", high: "#9db7d4",
        metal: "#c9b16f", gleam: "#fff0b0", lacquer: "#6c2631",
        skin: "#bd805d", skinLight: "#e2aa7e",
      }),
      banner: "#253e68",
      openFace: false,
    }),
    liubei: Object.freeze({
      id: "liubei",
      name: "유비",
      faction: "촉",
      factionLabel: "촉",
      mark: "蜀",
      powerName: "인덕의 반사",
      powerCost: 0,
      powerText: "적의 공격을 최대 2회 피해 1로 반사",
      active: false,
      palette: Object.freeze({
        dark: "#071b19", low: "#153a34", mid: "#377363", high: "#91c4a5",
        metal: "#d2aa55", gleam: "#ffe4a0", lacquer: "#7e2822",
        skin: "#c98f63", skinLight: "#e7b382",
      }),
      banner: "#245c4e",
      openFace: true,
    }),
    sunquan: Object.freeze({
      id: "sunquan",
      name: "손권",
      faction: "오",
      factionLabel: "오",
      mark: "吳",
      powerName: "수공",
      powerCost: 3,
      powerText: "모든 적 캐릭터에게 피해 1",
      active: true,
      palette: Object.freeze({
        dark: "#171016", low: "#3b2027", mid: "#80403d", high: "#d18a69",
        metal: "#d2ad56", gleam: "#ffe8a0", lacquer: "#97362e",
        skin: "#c48a65", skinLight: "#e7b084",
      }),
      banner: "#1f6570",
      openFace: true,
    }),
    nomad: Object.freeze({
      id: "nomad",
      name: "맹획",
      faction: "남만",
      factionLabel: "남만 연맹",
      mark: "南",
      powerName: "족쇄 명령",
      powerCost: 2,
      powerText: "선택한 적 장수의 다음 공격을 봉쇄",
      active: true,
      palette: Object.freeze({
        dark: "#14160d", low: "#303a20", mid: "#65733b", high: "#b2ba67",
        metal: "#b47a30", gleam: "#ffce68", lacquer: "#8b3c27",
        skin: "#ad6847", skinLight: "#dc9868",
      }),
      banner: "#66512a",
      openFace: false,
    }),
  });

  const KEYWORD_DEFINITIONS = Object.freeze({
    돌진: "출전한 턴에도 즉시 공격할 수 있습니다.",
    수호: "적은 수호가 있는 동안 다른 대상을 공격할 수 없습니다.",
    방패: "이 장수가 받는 다음 한 번의 피해를 막습니다.",
    출전: "이 카드를 손에서 낼 때 한 번 발동합니다.",
    유언: "이 장수가 쓰러질 때 한 번 발동합니다.",
  });

  const UX_CODE_MESSAGES = Object.freeze({
    insufficient_mana: "마나가 부족합니다.",
    not_enough_mana: "마나가 부족합니다.",
    board_full: "전장이 가득 찼습니다.",
    board_limit: "전장이 가득 찼습니다.",
    not_your_turn: "아군의 턴에만 명령할 수 있습니다.",
    game_ended: "이미 승부가 결정되었습니다.",
    invalid_side: "지금 지휘할 수 없는 진영입니다.",
    invalid_hand_index: "그 카드는 더 이상 손에 없습니다.",
    invalid_target: "이 능력의 대상이 될 수 없습니다.",
    invalid_attacker: "그 장수는 더 이상 전장에 없습니다.",
    attacker_not_ready: "이 장수는 아직 공격할 수 없습니다.",
    invalid_attack_target: "수호 장수를 먼저 공격해야 합니다.",
    guard_blocked: "수호 장수를 먼저 공격해야 합니다.",
    target_missing: "대상을 다시 선택해 주세요.",
    target_required: "능력을 적용할 적 장수를 선택해 주세요.",
    target_already_locked: "이미 다음 공격이 봉쇄된 장수입니다.",
    commander_missing: "지휘관 능력을 찾을 수 없습니다.",
    commander_mismatch: "현재 지휘관의 능력이 아닙니다.",
    passive_commander: "유비의 반사는 적의 공격 때 자동으로 발동합니다.",
    power_already_used: "이번 턴에는 지휘관 능력을 이미 사용했습니다.",
    hero_full_health: "지휘관의 체력이 가득 찼습니다.",
    invalid_action: "지금은 그 명령을 수행할 수 없습니다.",
    unknown_action: "알 수 없는 명령입니다.",
    hero_defeated: "지휘관의 체력이 모두 소진되었습니다.",
    mutual_destruction: "양측 지휘관이 함께 쓰러졌습니다.",
    combat: "전투 피해로 승부가 결정되었습니다.",
    effect: "계략의 효과로 승부가 결정되었습니다.",
    fatigue: "탈진 피해로 승부가 결정되었습니다.",
    deck_exhausted: "탈진 피해로 승부가 결정되었습니다.",
    health: "지휘관의 체력이 모두 소진되었습니다.",
    concede: "항복으로 대전이 끝났습니다.",
    victory: "아군이 승리했습니다.",
    win: "아군이 승리했습니다.",
    won: "아군이 승리했습니다.",
    defeat: "아군이 패배했습니다.",
    loss: "아군이 패배했습니다.",
    lose: "아군이 패배했습니다.",
    lost: "아군이 패배했습니다.",
    draw: "승부를 가리지 못했습니다.",
    tie: "승부를 가리지 못했습니다.",
    stalemate: "승부를 가리지 못했습니다.",
    player_victory: "아군이 승리했습니다.",
    player_win: "아군이 승리했습니다.",
    player_won: "아군이 승리했습니다.",
    ai_victory: "적군이 승리했습니다.",
    ai_win: "적군이 승리했습니다.",
    ai_won: "적군이 승리했습니다.",
  });

  function isInternalUXKey(value) {
    return /^[a-z][a-z0-9\s_:./-]*$/i.test(String(value || "").trim());
  }

  function uxCodeMessage(value, fallback) {
    const raw = String(value || "").trim();
    const fallbackText = String(fallback || "");
    const safeFallback = isInternalUXKey(fallbackText) ? "전황이 갱신되었습니다." : fallbackText;
    if (!raw) return safeFallback;
    if (UX_CODE_MESSAGES[raw]) return UX_CODE_MESSAGES[raw];
    if (isInternalUXKey(raw)) return safeFallback || "지금은 그 명령을 수행할 수 없습니다.";
    return raw;
  }

  function gameOutcomeMessage(reason, winner) {
    const fallback = winner === "player"
      ? "적장의 기세를 꺾었습니다."
      : winner === "draw"
        ? "승부를 가리지 못했습니다."
        : "전열을 가다듬을 때입니다.";
    return uxCodeMessage(reason, fallback);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function boardRenderMetrics(availableWidth, availableHeight, devicePixelRatio) {
    const safeWidth = Math.max(1, Number(availableWidth) || LOGICAL_WIDTH);
    const safeHeight = Math.max(1, Number(availableHeight) || LOGICAL_HEIGHT);
    const stageScale = Math.min(safeWidth / LOGICAL_WIDTH, safeHeight / LOGICAL_HEIGHT);
    const cssWidth = Math.max(1, Math.floor(LOGICAL_WIDTH * stageScale));
    const cssHeight = Math.max(1, Math.floor(LOGICAL_HEIGHT * stageScale));
    const physicalRatio = clamp(Number(devicePixelRatio) || 1, 1, 2.5);
    const renderScaleX = clamp(
      cssWidth * physicalRatio / LOGICAL_WIDTH,
      BOARD_RENDER_SCALE_MIN,
      BOARD_RENDER_SCALE_MAX,
    );
    const renderScaleY = clamp(
      cssHeight * physicalRatio / LOGICAL_HEIGHT,
      BOARD_RENDER_SCALE_MIN,
      BOARD_RENDER_SCALE_MAX,
    );
    return {
      cssWidth,
      cssHeight,
      renderScaleX,
      renderScaleY,
      backingWidth: Math.max(1, Math.round(LOGICAL_WIDTH * renderScaleX)),
      backingHeight: Math.max(1, Math.round(LOGICAL_HEIGHT * renderScaleY)),
    };
  }

  function boardFrameDelay(activeAnimation, reducedMotion) {
    if (activeAnimation) return 0;
    return reducedMotion ? null : BOARD_AMBIENT_FRAME_MS;
  }

  function lerp(a, b, amount) {
    return a + (b - a) * amount;
  }

  function easeOutCubic(value) {
    return 1 - Math.pow(1 - clamp(value, 0, 1), 3);
  }

  function clampedMotionDelta(deltaMs) {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 0;
    return Math.min(deltaMs, MOTION_MAX_DT_MS);
  }

  function criticallyDampedScalar(value, velocity, target, deltaMs, settleMs) {
    const dt = clampedMotionDelta(deltaMs) / 1000;
    if (dt <= 0) return { value, velocity };
    const response = Math.max(1, Number(settleMs) || HAND_POSE_SETTLE_MS) / 1000;
    const omega = 4.6 / response;
    const displacement = value - target;
    const decay = Math.exp(-omega * dt);
    const integration = (velocity + omega * displacement) * dt;
    return {
      value: target + (displacement + integration) * decay,
      velocity: (velocity - omega * integration) * decay,
    };
  }

  function stepHandPose(pose, target, deltaMs, reducedMotion) {
    const current = pose || {};
    const desired = target || {};
    const fields = ["lift", "scale", "fanAngle", "tilt", "hoverMix", "sweep"];
    const next = {};
    fields.forEach((field) => {
      const fallback = field === "scale" ? 1 : field === "sweep" ? 0.5 : 0;
      const value = Number.isFinite(current[field]) ? current[field] : fallback;
      const goal = Number.isFinite(desired[field]) ? desired[field] : fallback;
      const velocityKey = `${field}Velocity`;
      if (reducedMotion) {
        next[field] = goal;
        next[velocityKey] = 0;
        return;
      }
      const stepped = criticallyDampedScalar(
        value,
        Number(current[velocityKey]) || 0,
        goal,
        deltaMs,
        HAND_POSE_SETTLE_MS,
      );
      next[field] = stepped.value;
      next[velocityKey] = stepped.velocity;
    });
    return next;
  }

  function inspectorMotionState(elapsedMs, closing, reducedMotion) {
    if (reducedMotion) {
      return {
        progress: closing ? 0 : 1,
        alpha: closing ? 0 : 1,
        scale: 1,
        offset: 0,
        done: true,
      };
    }
    const duration = closing ? INSPECTOR_CLOSE_MS : INSPECTOR_OPEN_MS;
    const linear = clamp(Number(elapsedMs || 0) / duration, 0, 1);
    const eased = easeOutCubic(linear);
    const progress = closing ? 1 - eased : eased;
    return {
      progress,
      alpha: closing ? Math.pow(progress, 0.82) : Math.min(1, progress * 1.18),
      scale: 0.965 + progress * 0.035,
      offset: (1 - progress) * 28,
      done: linear >= 1,
    };
  }

  function pressFeedbackScale(elapsedMs, reducedMotion) {
    if (reducedMotion) return 1;
    const elapsed = clamp(Number(elapsedMs || 0), 0, PRESS_FEEDBACK_MS);
    if (elapsed >= PRESS_FEEDBACK_MS) return 1;
    if (elapsed < 36) return lerp(1, 0.965, easeOutCubic(elapsed / 36));
    if (elapsed < 76) return lerp(0.965, 1.012, easeOutCubic((elapsed - 36) / 40));
    return lerp(1.012, 1, easeOutCubic((elapsed - 76) / 20));
  }

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededNoise(seed) {
    let value = seed >>> 0;
    return function noise() {
      value += 0x6d2b79f5;
      let mixed = value;
      mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(Math.abs(radius), Math.abs(width) / 2, Math.abs(height) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function ellipsePath(ctx, x, y, radiusX, radiusY) {
    ctx.beginPath();
    ctx.ellipse(x, y, radiusX, radiusY, 0, 0, TAU);
  }

  function colorWithAlpha(hex, alpha) {
    const clean = String(hex || "#000000").replace("#", "");
    const normalized = clean.length === 3
      ? clean.split("").map((char) => char + char).join("")
      : clean.padEnd(6, "0").slice(0, 6);
    const red = parseInt(normalized.slice(0, 2), 16);
    const green = parseInt(normalized.slice(2, 4), 16);
    const blue = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  function getCardDefinition(card) {
    if (!card) return {};
    return card.definition || card.card || card.data || card;
  }

  function getCardValue(card, key, fallback) {
    if (!card) return fallback;
    if (card[key] !== undefined) return card[key];
    const definition = getCardDefinition(card);
    return definition[key] !== undefined ? definition[key] : fallback;
  }

  function eventEntityName(detail) {
    const eventDetail = detail && typeof detail === "object" ? detail : {};
    const payload = eventDetail.data && typeof eventDetail.data === "object"
      ? eventDetail.data
      : eventDetail;
    const directCandidates = [
      payload.cardName,
      payload.minionName,
      payload.sourceCardName,
      payload.name,
      eventDetail.cardName,
      eventDetail.minionName,
      eventDetail.sourceCardName,
      eventDetail.name,
    ];
    const objectCandidates = [
      payload.card,
      payload.minion,
      payload.sourceCard,
      eventDetail.card,
      eventDetail.minion,
      eventDetail.sourceCard,
    ];
    const direct = directCandidates.find((value) => typeof value === "string" && value.trim());
    if (direct) return direct.trim();
    for (const candidate of objectCandidates) {
      if (!candidate || typeof candidate !== "object") continue;
      const name = String(getCardValue(candidate, "name", "") || "").trim();
      if (name) return name;
    }
    return "";
  }

  function namedLifecycleMessage(type, detail, fallback) {
    if (type !== "card:play" && type !== "minion:death") return fallback;
    const name = eventEntityName(detail);
    if (!name) return fallback;
    const message = String(fallback || "");
    if (message.includes(name)) return message;
    return type === "card:play"
      ? `${name} · 전장에 나섰습니다.`
      : `${name} · 쓰러졌습니다.`;
  }

  function displayCardText(card, summary) {
    const raw = summary
      ? getCardValue(card, "summaryText", getCardValue(card, "text", ""))
      : getCardValue(card, "text", "");
    return String(raw || "").replace(/죽음\s*:/g, "유언:");
  }

  function cardTacticalLabel(card) {
    const tactics = getCardValue(card, "tactics", {}) || {};
    const identity = String(
      tactics.identity || getCardValue(card, "tacticalIdentity", ""),
    ).trim();
    if (identity) return identity.split(/\s+/).slice(0, 3).join(" ");

    const text = displayCardText(card, false);
    const keywords = (getCardValue(card, "keywords", []) || [])
      .map((keyword) => (
        typeof keyword === "string"
          ? keyword
          : String(keyword && (keyword.name || keyword.label || keyword.keyword) || "")
      ));
    if (/돌진/.test(text) || keywords.includes("돌진")) return "즉시 공격";
    if (/모든 적|전체 적|전역/.test(text)) return "광역 피해";
    if (/카드.*뽑|뽑습니다/.test(text)) return "전술 보급";
    if (/소환/.test(text)) return "병력 소환";
    if (/회복/.test(text)) return "회복 지원";
    if (/보호|도발|방패/.test(text) || keywords.some((keyword) => /보호|도발|방패/.test(keyword))) {
      return "전열 수호";
    }
    if (/피해/.test(text)) return "직접 피해";
    if (/공격력|강화/.test(text)) return "전열 강화";
    return keywords[0] ? `${keywords[0]} 장수` : "전장 장수";
  }

  function shieldVisualState(card) {
    if (!card) return "none";
    const keywords = getCardValue(card, "keywords", []) || [];
    const keywordShield = keywords.includes("방패");
    const definition = getCardDefinition(card);
    const runtimeOwner = Object.prototype.hasOwnProperty.call(card, "shield")
      ? card
      : definition && Object.prototype.hasOwnProperty.call(definition, "shield")
        ? definition
        : null;
    if (runtimeOwner) {
      if (runtimeOwner.shield) return "active";
      return keywordShield ? "spent" : "none";
    }
    return keywordShield ? "active" : "none";
  }

  function hasRandomRule(card) {
    return /무작위/.test(displayCardText(card, false));
  }

  function exactKeywordGlossarySegment(displayText, keywordName, rawKeywordNames) {
    const text = String(displayText || "");
    const marker = `${keywordName} — `;
    const start = text.indexOf(marker);
    if (start < 0) return "";
    const followingBoundaries = [
      ...(rawKeywordNames || [])
        .filter((name) => name && name !== keywordName)
        .map((name) => text.indexOf(`${name} — `, start + marker.length)),
      text.indexOf("출전:", start + marker.length),
      text.indexOf("유언:", start + marker.length),
    ].filter((index) => index > start);
    const end = followingBoundaries.length
      ? Math.min(...followingBoundaries)
      : text.length;
    const segment = text.slice(start, end).trim();
    const definition = segment.slice(marker.length).trim();
    if (!definition.endsWith(".") || definition.slice(0, -1).includes(".")) return "";
    return segment;
  }

  function resolveCardKeywordDetails(card, runtimeDefinitions) {
    const inlineDefinitions = getCardValue(
      card,
      "keywordDefinitions",
      getCardValue(card, "glossary", {}),
    ) || {};
    const rawKeywords = getCardValue(card, "keywords", []) || [];
    const abilities = getCardValue(card, "abilities", []) || [];
    const displayText = displayCardText(card, false);
    const rawKeywordNames = rawKeywords.map((keyword) => (
      typeof keyword === "string"
        ? keyword
        : String(keyword && (keyword.name || keyword.label || keyword.keyword) || "")
    ));
    const entries = rawKeywords.map((keyword) => ({ keyword, kind: "keyword" }));
    if (abilities.some((ability) => ability && ability.trigger === "onPlay") || /출전:/.test(displayText)) {
      entries.push({ keyword: "출전", kind: "trigger" });
    }
    if (abilities.some((ability) => ability && ability.trigger === "onDeath") || /유언:/.test(displayText)) {
      entries.push({ keyword: "유언", kind: "trigger" });
    }
    const seen = new Set();
    return entries.map((entry) => {
      const keyword = entry.keyword;
      const name = typeof keyword === "string"
        ? keyword
        : String(keyword && (keyword.name || keyword.label || keyword.keyword) || "");
      const inline = typeof keyword === "object" && keyword
        ? keyword.definition || keyword.description || keyword.text
        : null;
      const contextual = inlineDefinitions[name]
        || runtimeDefinitions && runtimeDefinitions[name];
      const contextualText = typeof contextual === "string"
        ? contextual
        : contextual && (contextual.definition || contextual.description || contextual.text);
      let glossaryDefinition = String(
        inline
        || contextualText
        || KEYWORD_DEFINITIONS[name]
        || "카드에 특별히 적용되는 전투 규칙입니다.",
      );
      let exactGlossarySegment = `${name} — ${glossaryDefinition}`;
      if (
        entry.kind === "keyword"
        && !inline
        && !contextualText
        && !displayText.includes(exactGlossarySegment)
      ) {
        const cardSegment = exactKeywordGlossarySegment(displayText, name, rawKeywordNames);
        if (cardSegment) {
          exactGlossarySegment = cardSegment;
          glossaryDefinition = cardSegment.slice(`${name} — `.length).trim();
        }
      }
      const spentShield = name === "방패" && shieldVisualState(card) === "spent";
      return {
        name,
        kind: entry.kind,
        label: spentShield ? "방패 소모" : name,
        glossaryDefinition,
        exactGlossarySegment,
        definition: spentShield
          ? "이번 전투에서 방패가 이미 소모되었습니다."
          : glossaryDefinition,
      };
    }).filter((entry) => {
      if (!entry.name || seen.has(entry.name)) return false;
      seen.add(entry.name);
      return true;
    });
  }

  function normalizeInspectorAbilityText(card, keywordDetails) {
    let normalized = displayCardText(card, false).trim();
    (keywordDetails || []).forEach((entry) => {
      if (!entry || entry.kind !== "keyword") return;
      const exactSegment = entry.exactGlossarySegment
        || `${entry.name} — ${entry.glossaryDefinition}`;
      if (!entry.name || !entry.glossaryDefinition || !normalized.includes(exactSegment)) return;
      normalized = normalized.split(exactSegment).join(" ");
    });
    return normalized
      .replace(/[ \t\r\n]+/g, " ")
      .replace(/^(?:[·•|,;]\s*)+/, "")
      .replace(/(?:\s*[·•|,;])+$/, "")
      .trim();
  }

  function inspectorContentModel(card, keywordDetails) {
    const abilityText = normalizeInspectorAbilityText(card, keywordDetails);
    return {
      abilityText,
      abilityBlock: abilityText
        ? { heading: "능력", text: abilityText }
        : null,
      keywordRows: (keywordDetails || []).map((entry) => ({
        name: entry.name,
        kind: entry.kind,
        label: entry.label,
        definition: entry.definition,
      })),
    };
  }

  function inspectorAnnouncementText(card, keywordDetails) {
    const abilityText = normalizeInspectorAbilityText(card, keywordDetails);
    const keywordSpeech = (keywordDetails || []).map((entry) => (
      `${entry.label || entry.name}: ${entry.definition}`
    ));
    const tactics = getCardValue(card, "tactics", {}) || {};
    return [
      getCardValue(card, "name", "이름 없는 장수"),
      `비용 ${getCardValue(card, "currentCost", getCardValue(card, "cost", 0))}`,
      `공격 ${getCardValue(card, "currentAttack", getCardValue(card, "attack", 0))}`,
      `체력 ${getCardValue(card, "currentHealth", getCardValue(card, "health", 0))}`,
      tactics.identity ? `전술 역할 ${tactics.identity}` : "",
      abilityText,
      keywordSpeech.length
        ? `발동 및 키워드 ${keywordSpeech.join(" ")}`
        : "키워드 없음",
    ].filter(Boolean).join(", ");
  }

  function calculateInspectorTextLayout(ctx, card, width, maxHeight, keywordDetails) {
    const content = inspectorContentModel(card, keywordDetails);
    const flavor = String(getCardValue(card, "flavor", "서사에 이름을 남긴 장수."));
    const sizes = [19, 18, 17, 16, 15, 14];
    let chosen = null;
    sizes.some((fontSize) => {
      const lineHeight = Math.round(fontSize * 1.45);
      ctx.font = `700 ${fontSize}px ${UI_FONT}`;
      const abilityLines = content.abilityText
        ? semanticTextLines(ctx, content.abilityText, width, 99)
        : [];
      const keywordRows = content.keywordRows.map((entry) => {
        ctx.font = `900 15px ${UI_FONT}`;
        const chipWidth = clamp(ctx.measureText(entry.label || entry.name).width + 24, 62, 105);
        ctx.font = `650 16px ${UI_FONT}`;
        const definitionLines = semanticTextLines(
          ctx,
          entry.definition,
          Math.max(90, width - chipWidth - 13),
          99,
        );
        return {
          ...entry,
          chipWidth,
          definitionLines,
          height: Math.max(31, definitionLines.length * 21 + 5),
        };
      });
      ctx.font = `italic 600 16px ${SYSTEM_FONT}`;
      const flavorLines = semanticTextLines(ctx, flavor, width, 99);
      const abilityHeight = abilityLines.length * lineHeight;
      const abilityBlockHeight = abilityLines.length ? 25 + abilityHeight + 10 : 0;
      const keywordHeight = keywordRows.length
        ? 29 + keywordRows.reduce((sum, row) => sum + row.height + 4, 0)
        : 0;
      const flavorHeight = 40 + Math.max(1, flavorLines.length) * 22;
      const totalHeight = abilityBlockHeight + keywordHeight + flavorHeight;
      chosen = {
        fontSize,
        lineHeight,
        abilityText: content.abilityText,
        hasAbility: abilityLines.length > 0,
        abilityLines,
        keywordRows,
        flavorLines,
        abilityBlockHeight,
        keywordHeight,
        flavorHeight,
        totalHeight,
      };
      return totalHeight <= maxHeight;
    });
    return chosen;
  }

  function getFactionStyle(card) {
    const faction = getCardValue(card, "faction", "군웅");
    const base = FACTIONS[faction] || FACTIONS["군웅"];
    const palette = getCardValue(card, "palette", {}) || {};
    return {
      faction,
      mark: base.mark,
      primary: palette.primary || base.primary,
      secondary: palette.secondary || base.secondary,
      glow: palette.glow || base.glow,
    };
  }

  function textLines(ctx, text, maxWidth, maxLines) {
    const content = String(text || "").trim();
    if (!content) return [];
    const lines = [];
    let current = "";
    for (const character of content) {
      const candidate = current + character;
      if (current && ctx.measureText(candidate).width > maxWidth) {
        lines.push(current.trim());
        current = character === " " ? "" : character;
        if (lines.length >= maxLines) break;
      } else {
        current = candidate;
      }
    }
    if (lines.length < maxLines && current.trim()) lines.push(current.trim());
    if (lines.length === maxLines) {
      const consumed = lines.join("").replace(/\s/g, "").length;
      const original = content.replace(/\s/g, "");
      if (consumed < original.length && !lines[maxLines - 1].endsWith("…")) {
        let finalLine = lines[maxLines - 1];
        while (ctx.measureText(`${finalLine}…`).width > maxWidth && finalLine.length > 1) {
          finalLine = finalLine.slice(0, -1);
        }
        lines[maxLines - 1] = `${finalLine.trim()}…`;
      }
    }
    return lines;
  }

  function semanticTextLines(ctx, text, maxWidth, maxLines) {
    const content = String(text || "").replace(/\s+/g, " ").trim();
    if (!content) return [];
    const words = content.match(/[^\s,.!?·:;()]+|[,.!?·:;()]/g) || [content];
    const lines = [];
    let current = "";
    let truncated = false;
    const punctuation = /^[,.!?·:;)]$/;
    words.forEach((word, wordIndex) => {
      if (lines.length >= maxLines) {
        truncated = true;
        return;
      }
      const joiner = !current || punctuation.test(word) || current.endsWith("(") ? "" : " ";
      const candidate = `${current}${joiner}${word}`;
      if (current && ctx.measureText(candidate).width > maxWidth) {
        let wrappedPunctuation = false;
        if (punctuation.test(word)) {
          const lastSpace = current.lastIndexOf(" ");
          const head = lastSpace > 0 ? current.slice(0, lastSpace) : "";
          const tail = lastSpace > 0 ? `${current.slice(lastSpace + 1)}${word}` : "";
          if (
            head
            && ctx.measureText(head).width <= maxWidth
            && ctx.measureText(tail).width <= maxWidth
          ) {
            lines.push(head);
            current = tail;
            wrappedPunctuation = true;
          } else {
            const characters = Array.from(current);
            const lastCharacter = characters.pop();
            const carried = `${lastCharacter || ""}${word}`;
            const remainder = characters.join("").trimEnd();
            if (
              remainder
              && ctx.measureText(remainder).width <= maxWidth
              && ctx.measureText(carried).width <= maxWidth
            ) {
              lines.push(remainder);
              current = carried;
              wrappedPunctuation = true;
            }
          }
        }
        if (!wrappedPunctuation) {
          lines.push(current);
          current = word;
        }
      } else {
        current = candidate;
      }
      if (ctx.measureText(current).width > maxWidth) {
        let fragment = "";
        for (const character of current) {
          const next = fragment + character;
          if (fragment && ctx.measureText(next).width > maxWidth) {
            if (lines.length < maxLines) lines.push(fragment);
            else truncated = true;
            fragment = character;
          } else {
            fragment = next;
          }
        }
        current = fragment;
      }
      if (wordIndex < words.length - 1 && lines.length >= maxLines) truncated = true;
    });
    if (current && lines.length < maxLines) lines.push(current);
    else if (current) truncated = true;
    if (truncated && lines.length === maxLines) {
      let finalLine = lines[maxLines - 1];
      while (finalLine.length > 1 && ctx.measureText(`${finalLine}…`).width > maxWidth) finalLine = finalLine.slice(0, -1);
      lines[maxLines - 1] = `${finalLine.trim()}…`;
    }
    return lines;
  }

  function drawCenteredText(ctx, text, x, y, options) {
    const config = options || {};
    ctx.save();
    ctx.font = config.font || `700 16px ${UI_FONT}`;
    ctx.fillStyle = config.color || COLORS.cream;
    ctx.textAlign = "center";
    ctx.textBaseline = config.baseline || "middle";
    if (config.shadow) {
      ctx.shadowColor = config.shadow;
      ctx.shadowBlur = config.shadowBlur || 5;
      ctx.shadowOffsetY = config.shadowY || 1;
    }
    if (config.stroke) {
      ctx.lineWidth = config.strokeWidth || 3;
      ctx.strokeStyle = config.stroke;
      ctx.strokeText(String(text), x, y);
    }
    ctx.fillText(String(text), x, y);
    ctx.restore();
  }

  function drawGem(ctx, x, y, radius, value, color, pulse) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 9 + pulse * 5;
    const rim = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.4, 1, x, y, radius);
    rim.addColorStop(0, "#fff5c3");
    rim.addColorStop(0.18, color);
    rim.addColorStop(0.72, colorWithAlpha(color, 0.95));
    rim.addColorStop(1, "#29160f");
    ellipsePath(ctx, x, y, radius, radius);
    ctx.fillStyle = rim;
    ctx.fill();
    ctx.lineWidth = Math.max(2, radius * 0.15);
    ctx.strokeStyle = COLORS.brightGold;
    ctx.stroke();
    ctx.shadowBlur = 0;
    drawCenteredText(ctx, value, x, y + 1, {
      font: `900 ${Math.round(radius * 1.12)}px ${UI_FONT}`,
      color: "#fff9df",
      stroke: "#2a1710",
      strokeWidth: Math.max(2, radius * 0.18),
    });
    ctx.restore();
  }

  function drawSeal(ctx, x, y, size, mark, style) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.045);
    ctx.fillStyle = style.primary;
    ctx.strokeStyle = style.secondary;
    ctx.lineWidth = Math.max(1.5, size * 0.07);
    roundedRect(ctx, -size / 2, -size / 2, size, size, size * 0.13);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "#fff8d7";
    ctx.lineWidth = 1;
    roundedRect(ctx, -size * 0.35, -size * 0.35, size * 0.7, size * 0.7, size * 0.07);
    ctx.stroke();
    ctx.globalAlpha = 1;
    drawCenteredText(ctx, mark, 0, size * 0.02, {
      font: `900 ${Math.round(size * 0.6)}px ${SYSTEM_FONT}`,
      color: "#f9e6b5",
      shadow: "#190b07",
      shadowBlur: 2,
    });
    ctx.restore();
  }

  function drawPortraitLegacy(ctx, x, y, width, height, card, compact) {
    const style = getFactionStyle(card);
    const portrait = getCardValue(card, "portrait", {}) || {};
    const seed = hashString(`${getCardValue(card, "id", "")}|${getCardValue(card, "name", "")}`);
    const variation = seededNoise(seed);

    ctx.save();
    roundedRect(ctx, x, y, width, height, Math.max(4, width * 0.05));
    ctx.clip();
    const sky = ctx.createLinearGradient(x, y, x, y + height);
    sky.addColorStop(0, colorWithAlpha(style.primary, 0.92));
    sky.addColorStop(0.55, "#172b2d");
    sky.addColorStop(1, "#0b1416");
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, width, height);

    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = style.secondary;
    ctx.lineWidth = 1;
    for (let index = 0; index < 9; index += 1) {
      const ridgeY = y + height * (0.42 + index * 0.055);
      ctx.beginPath();
      ctx.moveTo(x - 4, ridgeY);
      ctx.bezierCurveTo(
        x + width * 0.25,
        ridgeY - height * (variation() * 0.1),
        x + width * 0.7,
        ridgeY + height * (variation() * 0.08),
        x + width + 4,
        ridgeY - height * 0.03,
      );
      ctx.stroke();
    }

    const halo = ctx.createRadialGradient(
      x + width * 0.5,
      y + height * 0.28,
      1,
      x + width * 0.5,
      y + height * 0.32,
      width * 0.48,
    );
    halo.addColorStop(0, colorWithAlpha(style.glow, 0.45));
    halo.addColorStop(1, colorWithAlpha(style.glow, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(x, y, width, height);

    const centerX = x + width * (0.49 + (variation() - 0.5) * 0.05);
    const headY = y + height * 0.36;
    const headRadius = width * (compact ? 0.15 : 0.145);
    const skin = variation() > 0.5 ? "#c8986c" : "#b7815d";
    ctx.globalAlpha = 1;

    // Shoulders and layered armor.
    ctx.fillStyle = "#10191b";
    ctx.beginPath();
    ctx.moveTo(centerX - width * 0.4, y + height);
    ctx.quadraticCurveTo(centerX - width * 0.28, y + height * 0.57, centerX, y + height * 0.55);
    ctx.quadraticCurveTo(centerX + width * 0.28, y + height * 0.57, centerX + width * 0.42, y + height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = style.primary;
    for (let side = -1; side <= 1; side += 2) {
      ctx.beginPath();
      ctx.ellipse(
        centerX + side * width * 0.23,
        y + height * 0.68,
        width * 0.16,
        height * 0.11,
        side * 0.18,
        0,
        TAU,
      );
      ctx.fill();
      ctx.strokeStyle = colorWithAlpha(style.secondary, 0.8);
      ctx.lineWidth = Math.max(1, width * 0.018);
      ctx.stroke();
    }

    // Face.
    ctx.fillStyle = skin;
    ellipsePath(ctx, centerX, headY, headRadius, headRadius * 1.16);
    ctx.fill();
    ctx.strokeStyle = "#3b231b";
    ctx.lineWidth = Math.max(1, width * 0.015);
    ctx.stroke();

    // Helmet, brows and beard establish a readable face silhouette.
    ctx.fillStyle = "#171a1c";
    ctx.beginPath();
    ctx.arc(centerX, headY - headRadius * 0.2, headRadius * 1.04, Math.PI, TAU);
    ctx.lineTo(centerX + headRadius * 0.8, headY - headRadius * 0.05);
    ctx.quadraticCurveTo(centerX, headY - headRadius * 0.45, centerX - headRadius * 0.8, headY - headRadius * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = style.secondary;
    ctx.stroke();
    ctx.fillStyle = style.secondary;
    ctx.fillRect(centerX - width * 0.018, headY - headRadius * 1.5, width * 0.036, headRadius * 0.72);
    ctx.beginPath();
    ctx.moveTo(centerX, headY - headRadius * 1.72);
    ctx.lineTo(centerX - width * 0.08, headY - headRadius * 1.25);
    ctx.lineTo(centerX + width * 0.08, headY - headRadius * 1.25);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#24150f";
    ctx.lineWidth = Math.max(1.2, width * 0.018);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(centerX - headRadius * 0.65, headY - headRadius * 0.12);
    ctx.lineTo(centerX - headRadius * 0.15, headY - headRadius * 0.02);
    ctx.moveTo(centerX + headRadius * 0.15, headY - headRadius * 0.02);
    ctx.lineTo(centerX + headRadius * 0.65, headY - headRadius * 0.12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX - headRadius * 0.45, headY + headRadius * 0.45);
    ctx.quadraticCurveTo(centerX, headY + headRadius * 1.42, centerX + headRadius * 0.45, headY + headRadius * 0.45);
    ctx.stroke();

    // Weapon/motif is deliberately symbolic and generated entirely with paths.
    ctx.strokeStyle = "#e1c77e";
    ctx.lineWidth = Math.max(2, width * 0.025);
    const weapon = String(portrait.weapon || "");
    if (/활|궁/.test(weapon)) {
      ctx.beginPath();
      ctx.arc(x + width * 0.77, y + height * 0.54, width * 0.23, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + width * 0.77, y + height * 0.31);
      ctx.lineTo(x + width * 0.77, y + height * 0.77);
      ctx.stroke();
    } else if (/부채|선/.test(weapon)) {
      ctx.beginPath();
      ctx.moveTo(x + width * 0.74, y + height * 0.8);
      ctx.arc(x + width * 0.74, y + height * 0.8, width * 0.25, Math.PI * 1.12, Math.PI * 1.88);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x + width * 0.77, y + height * 0.85);
      ctx.lineTo(x + width * 0.84, y + height * 0.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + width * 0.78, y + height * 0.25);
      ctx.lineTo(x + width * 0.91, y + height * 0.12);
      ctx.lineTo(x + width * 0.85, y + height * 0.31);
      ctx.stroke();
    }

    if (!compact) {
      const motif = String(portrait.motif || getCardValue(card, "role", "장수")).slice(0, 2);
      ctx.globalAlpha = 0.38;
      drawCenteredText(ctx, motif, x + width * 0.18, y + height * 0.82, {
        font: `800 ${Math.round(width * 0.17)}px ${SYSTEM_FONT}`,
        color: style.secondary,
      });
    }
    ctx.restore();

  }

  const PORTRAIT_ARCHETYPES = Object.freeze({
    shu_liu_bei: { archetype: "twin-swords-monarch", scene: "taoyuan-oath", background: "peach-oath", headgear: "monarch-crown", weapon: "twin-swords", robe: "#d6bd62", beard: "trim", facing: 1, tilt: -0.05 },
    shu_guan_yu: { archetype: "crescent-blade-long-beard", scene: "five-passes", background: "green-dragon", headgear: "war-scarf", weapon: "crescent-blade", robe: "#a92f28", beard: "long", facing: -1, tilt: 0.06 },
    shu_zhang_fei: { archetype: "serpent-spear-wild-beard", scene: "changban-bridge", background: "thunder-bridge", headgear: "wild-band", weapon: "serpent-spear", robe: "#302a28", beard: "wild", facing: 1, tilt: -0.09 },
    shu_zhao_yun: { archetype: "white-helmet-spear", scene: "changban-rescue", background: "white-horse", headgear: "white-helmet", weapon: "spear", robe: "#e4e7dc", beard: "none", facing: -1, tilt: 0.08 },
    shu_zhuge_liang: { archetype: "scholar-fan-constellation", scene: "wuzhang-stars", background: "constellation", headgear: "scholar-cap", weapon: "feather-fan", robe: "#d8d2bd", beard: "goatee", facing: 1, tilt: -0.02 },
    shu_huang_zhong: { archetype: "elder-archer", scene: "dingjun-ridge", background: "arrow-rain", headgear: "elder-knot", weapon: "bow", robe: "#70513a", beard: "white-long", facing: -1, tilt: 0.1 },
    shu_ma_chao: { archetype: "silver-lion-cavalier", scene: "liangzhou-dust", background: "snow-ridge-cavalry", headgear: "lion-crest-helm", weapon: "tiger-gold-spear", robe: "#dce5e8", beard: "none", facing: 1, tilt: -0.14 },
    wei_cao_cao: { archetype: "crowned-sword-ruler", scene: "guandu-command", background: "war-banners", headgear: "king-crown", weapon: "royal-sword", robe: "#263d67", beard: "trim", facing: 1, tilt: -0.04 },
    wei_sima_yi: { archetype: "black-strategist-raven", scene: "wuzhang-watch", background: "ravens", headgear: "black-scholar-cap", weapon: "dark-fan", robe: "#191924", beard: "goatee", facing: -1, tilt: 0.04 },
    wei_xiahou_dun: { archetype: "eyepatch-shield", scene: "puyang-arrows", background: "iron-wall", headgear: "iron-helmet", weapon: "shield", robe: "#344d65", beard: "stubble", eyepatch: true, facing: 1, tilt: -0.1 },
    wei_dian_wei: { archetype: "twin-halberds-giant", scene: "wan-gate", background: "broken-gate", headgear: "horned-helmet", weapon: "twin-halberds", robe: "#3a3230", beard: "square", facing: -1, tilt: 0.09 },
    wei_zhang_liao: { archetype: "cavalry-lance", scene: "hefei-charge", background: "cavalry", headgear: "horsehair-helmet", weapon: "horse-lance", robe: "#315279", beard: "trim", facing: 1, tilt: -0.12 },
    wei_guo_jia: { archetype: "bamboo-scroll-adviser", scene: "guandu-rain", background: "bamboo-slips", headgear: "soft-cap", weapon: "bamboo-scroll", robe: "#69788f", beard: "none", facing: -1, tilt: 0.03 },
    wei_xu_zhu: { archetype: "tiger-maul-guardian", scene: "tong-pass-guard", background: "burning-gate", headgear: "tiger-hide-helm", weapon: "iron-maul", robe: "#4b5663", beard: "square", facing: -1, tilt: 0.13 },
    wu_sun_quan: { archetype: "river-crown-sword", scene: "yangtze-fleet", background: "river-tide", headgear: "river-crown", weapon: "jiangdong-sword", robe: "#9a3b34", beard: "trim", facing: 1, tilt: -0.04 },
    wu_zhou_yu: { archetype: "fire-gold-crown-sword", scene: "red-cliffs", background: "red-cliffs-fire", headgear: "gold-crown", weapon: "flame-sword", robe: "#9f2725", beard: "none", facing: -1, tilt: 0.08 },
    wu_gan_ning: { archetype: "bells-headscarf-raider", scene: "night-raid", background: "wave-raid", headgear: "raider-scarf", weapon: "bells-blade", robe: "#33466a", beard: "stubble", facing: 1, tilt: -0.13 },
    wu_lu_meng: { archetype: "book-and-sword", scene: "white-robes", background: "ink-grid", headgear: "commander-cap", weapon: "book-sword", robe: "#5c3136", beard: "trim", facing: -1, tilt: 0.04 },
    wu_huang_gai: { archetype: "elder-fire-ship", scene: "fire-attack", background: "fire-ships", headgear: "veteran-helm", weapon: "fire-club", robe: "#7a332b", beard: "white-square", facing: 1, tilt: -0.08 },
    wu_sun_shangxiang: { archetype: "female-archer", scene: "river-garden", background: "plum-arrows", headgear: "warrior-hairpin", weapon: "bow", robe: "#a6455d", beard: "none", feminine: true, facing: -1, tilt: 0.1 },
    wu_lu_xun: { archetype: "young-fire-tactician", scene: "yiling-fire-lines", background: "mountain-beacons", headgear: "young-commander-crown", weapon: "map-sword", robe: "#31545c", beard: "none", facing: 1, tilt: -0.06 },
    nanman_meng_huo: { archetype: "elephant-crown-king", scene: "seven-captures", background: "jungle-standards", headgear: "ivory-king-crown", weapon: "beast-king-blade", robe: "#70442e", beard: "wild", facing: -1, tilt: 0.11 },
    nanman_zhu_rong: { archetype: "fire-dagger-huntress", scene: "fire-god-dance", background: "torch-vortex", headgear: "firebird-feathers", weapon: "twin-throwing-blades", robe: "#8c3029", beard: "none", feminine: true, facing: 1, tilt: -0.16 },
    nanman_wu_tu_gu: { archetype: "rattan-horn-bulwark", scene: "rattan-gorge", background: "jungle-gorge", headgear: "great-horn-mask", weapon: "iron-fang-club", robe: "#425532", beard: "none", facing: -1, tilt: 0.05 },
    nanman_mu_lu: { archetype: "bone-mask-beastmaster", scene: "beast-call", background: "glowing-jungle-eyes", headgear: "bone-beast-mask", weapon: "beast-flute", robe: "#36533b", beard: "none", facing: 1, tilt: -0.08 },
    nanman_a_hui_nan: { archetype: "horn-bugle-vanguard", scene: "tribal-rally", background: "split-war-banners", headgear: "twin-horn-cap", weapon: "herald-spear", robe: "#69512e", beard: "trim", facing: -1, tilt: 0.15 },
    qun_lu_bu: { archetype: "phoenix-crown-halberd", scene: "hulao-gate", background: "red-sun", headgear: "phoenix-crown", weapon: "fangtian-halberd", robe: "#8b2022", beard: "none", facing: 1, tilt: -0.12 },
    token_nanman_beast: { archetype: "jungle-beast-horned", scene: "beast-rush", background: "jungle-gorge", headgear: "bronze-brow-bells", weapon: "fang-claws", robe: "#59452e", beard: "mane", beast: true, facing: 1, tilt: -0.18 },
  });

  const PORTRAIT_ID_BY_NAME = Object.freeze({
    유비: "shu_liu_bei", 관우: "shu_guan_yu", 장비: "shu_zhang_fei", 조자룡: "shu_zhao_yun",
    제갈량: "shu_zhuge_liang", 황충: "shu_huang_zhong", 마초: "shu_ma_chao", 조조: "wei_cao_cao", 사마의: "wei_sima_yi",
    하후돈: "wei_xiahou_dun", 전위: "wei_dian_wei", 장료: "wei_zhang_liao", 곽가: "wei_guo_jia", 허저: "wei_xu_zhu",
    손권: "wu_sun_quan", 주유: "wu_zhou_yu", 감녕: "wu_gan_ning", 여몽: "wu_lu_meng",
    황개: "wu_huang_gai", 손상향: "wu_sun_shangxiang", 육손: "wu_lu_xun",
    맹획: "nanman_meng_huo", 축융: "nanman_zhu_rong", 올돌골: "nanman_wu_tu_gu",
    목록대왕: "nanman_mu_lu", 아회남: "nanman_a_hui_nan", "남만 맹수": "token_nanman_beast",
    여포: "qun_lu_bu",
  });

  function portraitArchetype(card) {
    const id = String(getCardValue(card, "id", ""));
    return PORTRAIT_ARCHETYPES[id]
      || PORTRAIT_ARCHETYPES[PORTRAIT_ID_BY_NAME[String(getCardValue(card, "name", ""))]]
      || { archetype: "wandering-general", background: "war-banners", headgear: "iron-helmet", weapon: "spear", robe: "#4c4a45", beard: "trim" };
  }

  function drawHistoricalScene(ctx, x, y, width, height, art, style, compact) {
    const scene = art.scene || "";
    const ink = colorWithAlpha("#070d0e", 0.72);
    const light = colorWithAlpha(style.secondary, 0.58);
    const fire = "#ef6336";
    const banner = (bx, by, scale, direction) => {
      ctx.save();
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(1, width * 0.014 * scale);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx, by + height * 0.38 * scale);
      ctx.stroke();
      ctx.fillStyle = colorWithAlpha(style.primary, 0.78);
      ctx.beginPath();
      ctx.moveTo(bx, by + height * 0.03 * scale);
      ctx.quadraticCurveTo(
        bx + width * 0.12 * direction * scale,
        by + height * 0.06 * scale,
        bx + width * 0.17 * direction * scale,
        by + height * 0.17 * scale,
      );
      ctx.lineTo(bx, by + height * 0.2 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    const gate = (gx, gy, scale, broken) => {
      ctx.save();
      ctx.fillStyle = ink;
      ctx.fillRect(gx, gy, width * 0.08 * scale, height * 0.34 * scale);
      ctx.fillRect(gx + width * 0.26 * scale, gy, width * 0.08 * scale, height * 0.34 * scale);
      ctx.fillRect(gx - width * 0.03 * scale, gy, width * 0.4 * scale, height * 0.07 * scale);
      ctx.beginPath();
      ctx.moveTo(gx - width * 0.07 * scale, gy);
      ctx.lineTo(gx + width * 0.17 * scale, gy - height * 0.1 * scale);
      ctx.lineTo(gx + width * 0.41 * scale, gy);
      ctx.closePath();
      ctx.fill();
      if (broken) {
        ctx.strokeStyle = colorWithAlpha(style.secondary, 0.6);
        ctx.lineWidth = Math.max(1, width * 0.016);
        for (let split = 0; split < 3; split += 1) {
          ctx.beginPath();
          ctx.moveTo(gx + width * (0.09 + split * 0.07) * scale, gy + height * 0.08 * scale);
          ctx.lineTo(gx + width * (0.03 + split * 0.1) * scale, gy + height * 0.29 * scale);
          ctx.stroke();
        }
      }
      ctx.restore();
    };
    const horse = (hx, hy, scale, direction) => {
      ctx.save();
      ctx.translate(hx, hy);
      ctx.scale(direction * scale, scale);
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(0, 0, width * 0.12, height * 0.065, -0.12, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(width * 0.07, -height * 0.03);
      ctx.lineTo(width * 0.12, -height * 0.18);
      ctx.lineTo(width * 0.18, -height * 0.13);
      ctx.lineTo(width * 0.15, -height * 0.01);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(1, width * 0.018);
      [-0.07, 0.02, 0.08].forEach((offset, index) => {
        ctx.beginPath();
        ctx.moveTo(width * offset, height * 0.035);
        ctx.lineTo(width * (offset + (index % 2 ? 0.05 : -0.04)), height * 0.2);
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.moveTo(-width * 0.1, -height * 0.02);
      ctx.quadraticCurveTo(-width * 0.22, -height * 0.09, -width * 0.18, height * 0.04);
      ctx.stroke();
      ctx.restore();
    };
    const boat = (bx, by, scale, burning) => {
      ctx.save();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.moveTo(bx - width * 0.17 * scale, by);
      ctx.lineTo(bx + width * 0.18 * scale, by);
      ctx.lineTo(bx + width * 0.11 * scale, by + height * 0.08 * scale);
      ctx.lineTo(bx - width * 0.12 * scale, by + height * 0.08 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = light;
      ctx.lineWidth = Math.max(1, width * 0.011);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx, by - height * 0.26 * scale);
      ctx.stroke();
      ctx.fillStyle = colorWithAlpha(style.primary, 0.82);
      ctx.beginPath();
      ctx.moveTo(bx, by - height * 0.24 * scale);
      ctx.lineTo(bx + width * 0.14 * scale, by - height * 0.11 * scale);
      ctx.lineTo(bx, by - height * 0.08 * scale);
      ctx.closePath();
      ctx.fill();
      if (burning) {
        ctx.fillStyle = colorWithAlpha(fire, 0.82);
        for (let flame = -1; flame <= 1; flame += 1) {
          const fx = bx + flame * width * 0.075 * scale;
          ctx.beginPath();
          ctx.moveTo(fx - width * 0.04 * scale, by);
          ctx.quadraticCurveTo(fx - width * 0.08 * scale, by - height * 0.15 * scale, fx, by - height * 0.23 * scale);
          ctx.quadraticCurveTo(fx + width * 0.09 * scale, by - height * 0.11 * scale, fx + width * 0.04 * scale, by);
          ctx.fill();
        }
      }
      ctx.restore();
    };
    const mountain = (baseY, alpha, offset) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#091415";
      ctx.beginPath();
      ctx.moveTo(x, y + baseY);
      for (let step = 0; step <= 6; step += 1) {
        const px = x + step * width / 6;
        const py = y + baseY - height * (0.08 + ((step * 17 + offset) % 5) * 0.035);
        ctx.lineTo(px, py);
      }
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    const flames = (fx, fy, count, scale) => {
      ctx.save();
      ctx.fillStyle = colorWithAlpha(fire, 0.74);
      for (let index = 0; index < count; index += 1) {
        const px = fx + index * width * 0.07 * scale;
        ctx.beginPath();
        ctx.moveTo(px, fy);
        ctx.quadraticCurveTo(px - width * 0.04 * scale, fy - height * (0.09 + (index % 2) * 0.04) * scale, px + width * 0.015 * scale, fy - height * 0.15 * scale);
        ctx.quadraticCurveTo(px + width * 0.08 * scale, fy - height * 0.07 * scale, px + width * 0.05 * scale, fy);
        ctx.fill();
      }
      ctx.restore();
    };

    if (compact) {
      ctx.save();
      ctx.globalAlpha = 0.88;
      if (["red-cliffs", "fire-attack", "hulao-gate", "guandu-command"].includes(scene)) {
        flames(x + width * 0.04, y + height * 0.79, 7, 1.25);
        if (scene === "red-cliffs" || scene === "fire-attack") boat(x + width * 0.66, y + height * 0.65, 0.92, true);
        else gate(x + width * 0.04, y + height * 0.3, 0.95, scene !== "hulao-gate");
      } else if (["changban-rescue", "hefei-charge"].includes(scene)) {
        horse(x + width * 0.7, y + height * 0.64, 0.92, scene === "hefei-charge" ? 1 : -1);
        banner(x + width * 0.08, y + height * 0.13, 0.72, 1);
      } else if (["five-passes", "changban-bridge", "wan-gate", "puyang-arrows", "white-robes"].includes(scene)) {
        gate(x + width * 0.06, y + height * 0.3, 0.98, ["five-passes", "wan-gate"].includes(scene));
        banner(x + width * 0.78, y + height * 0.16, 0.68, -1);
      } else if (["yangtze-fleet", "night-raid"].includes(scene)) {
        boat(x + width * 0.55, y + height * 0.65, 1.05, false);
        mountain(height * 0.7, 0.5, scene.length);
      } else if (["wuzhang-stars", "wuzhang-watch", "guandu-rain"].includes(scene)) {
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.moveTo(x + width * 0.06, y + height * 0.68);
        ctx.lineTo(x + width * 0.34, y + height * 0.28);
        ctx.lineTo(x + width * 0.62, y + height * 0.68);
        ctx.closePath();
        ctx.fill();
        ellipsePath(ctx, x + width * 0.22, y + height * 0.52, width * 0.055, width * 0.055);
        ctx.fillStyle = "#f2d378";
        ctx.fill();
      } else {
        mountain(height * 0.67, 0.5, scene.length);
        banner(x + width * 0.1, y + height * 0.14, 0.78, 1);
      }
      ctx.restore();
      return;
    }

    mountain(height * 0.6, 0.25, scene.length);
    mountain(height * 0.73, 0.44, scene.length * 3);
    ctx.save();
    switch (scene) {
      case "taoyuan-oath":
        gate(x + width * 0.08, y + height * 0.28, 0.58, false);
        [-1, 0, 1].forEach((offset) => banner(x + width * (0.5 + offset * 0.17), y + height * 0.16, 0.55, offset < 0 ? -1 : 1));
        break;
      case "five-passes":
        gate(x + width * 0.04, y + height * 0.29, 0.8, true);
        banner(x + width * 0.83, y + height * 0.1, 0.7, -1);
        break;
      case "changban-bridge":
        ctx.strokeStyle = light;
        ctx.lineWidth = Math.max(2, height * 0.04);
        ctx.beginPath();
        ctx.moveTo(x - width * 0.1, y + height * 0.7);
        ctx.lineTo(x + width * 1.1, y + height * 0.64);
        ctx.stroke();
        [0.12, 0.4, 0.78].forEach((ratio, index) => horse(x + width * ratio, y + height * (0.53 + index * 0.02), 0.42, index % 2 ? -1 : 1));
        break;
      case "changban-rescue":
        horse(x + width * 0.7, y + height * 0.64, 0.72, -1);
        for (let spear = 0; spear < 5; spear += 1) {
          ctx.strokeStyle = light;
          ctx.beginPath();
          ctx.moveTo(x + width * (0.05 + spear * 0.2), y + height * 0.72);
          ctx.lineTo(x + width * (0.19 + spear * 0.18), y + height * 0.26);
          ctx.stroke();
        }
        break;
      case "wuzhang-stars":
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.moveTo(x + width * 0.04, y + height * 0.62);
        ctx.lineTo(x + width * 0.26, y + height * 0.34);
        ctx.lineTo(x + width * 0.48, y + height * 0.62);
        ctx.closePath();
        ctx.fill();
        for (let lamp = 0; lamp < 5; lamp += 1) {
          ellipsePath(ctx, x + width * (0.09 + lamp * 0.085), y + height * 0.58, width * 0.018, width * 0.018);
          ctx.fillStyle = "#f5d579";
          ctx.fill();
        }
        break;
      case "dingjun-ridge":
        banner(x + width * 0.1, y + height * 0.21, 0.58, 1);
        banner(x + width * 0.76, y + height * 0.27, 0.52, -1);
        for (let target = 0; target < 3; target += 1) {
          ellipsePath(ctx, x + width * (0.17 + target * 0.27), y + height * (0.55 + (target % 2) * 0.07), width * 0.055, width * 0.055);
          ctx.strokeStyle = light;
          ctx.stroke();
        }
        break;
      case "guandu-command":
        [0.08, 0.36, 0.72].forEach((ratio, index) => banner(x + width * ratio, y + height * (0.12 + index * 0.05), 0.7, index % 2 ? -1 : 1));
        flames(x + width * 0.05, y + height * 0.7, 5, 0.9);
        break;
      case "wuzhang-watch":
        gate(x + width * 0.66, y + height * 0.32, 0.64, false);
        ctx.strokeStyle = colorWithAlpha("#b8c5d4", 0.34);
        for (let rain = 0; rain < 10; rain += 1) {
          ctx.beginPath();
          ctx.moveTo(x + width * rain / 9, y);
          ctx.lineTo(x + width * (rain / 9 - 0.11), y + height * 0.55);
          ctx.stroke();
        }
        break;
      case "puyang-arrows":
        gate(x + width * 0.03, y + height * 0.28, 0.66, false);
        for (let arrow = 0; arrow < 8; arrow += 1) {
          ctx.strokeStyle = light;
          ctx.beginPath();
          ctx.moveTo(x + width * (0.15 + arrow * 0.11), y + height * 0.1);
          ctx.lineTo(x + width * (0.02 + arrow * 0.1), y + height * 0.5);
          ctx.stroke();
        }
        break;
      case "wan-gate":
        gate(x + width * 0.05, y + height * 0.23, 0.95, true);
        for (let shard = 0; shard < 7; shard += 1) {
          ctx.fillStyle = light;
          ctx.fillRect(x + width * (0.05 + shard * 0.14), y + height * (0.63 + (shard % 2) * 0.08), width * 0.08, height * 0.02);
        }
        break;
      case "hefei-charge":
        gate(x + width * 0.6, y + height * 0.25, 0.72, false);
        [0.08, 0.34, 0.56].forEach((ratio, index) => horse(x + width * ratio, y + height * (0.56 + index * 0.04), 0.47, 1));
        break;
      case "guandu-rain":
        gate(x + width * 0.68, y + height * 0.34, 0.52, false);
        ctx.strokeStyle = colorWithAlpha("#d9e7ea", 0.36);
        for (let rain = 0; rain < 9; rain += 1) {
          ctx.beginPath();
          ctx.moveTo(x + width * rain / 8, y);
          ctx.lineTo(x + width * (rain / 8 - 0.08), y + height * 0.52);
          ctx.stroke();
        }
        ellipsePath(ctx, x + width * 0.13, y + height * 0.46, width * 0.04, width * 0.04);
        ctx.fillStyle = "#f2d378";
        ctx.fill();
        break;
      case "yangtze-fleet":
        boat(x + width * 0.22, y + height * 0.58, 0.65, false);
        boat(x + width * 0.72, y + height * 0.52, 0.52, false);
        break;
      case "red-cliffs":
        boat(x + width * 0.2, y + height * 0.62, 0.7, true);
        boat(x + width * 0.72, y + height * 0.55, 0.58, true);
        break;
      case "night-raid":
        ctx.strokeStyle = "#d7e6e9";
        ctx.lineWidth = Math.max(1.5, width * 0.02);
        ctx.beginPath();
        ctx.arc(x + width * 0.18, y + height * 0.2, width * 0.1, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        boat(x + width * 0.62, y + height * 0.6, 0.68, false);
        break;
      case "white-robes":
        gate(x + width * 0.58, y + height * 0.29, 0.74, false);
        boat(x + width * 0.19, y + height * 0.64, 0.52, false);
        break;
      case "fire-attack":
        boat(x + width * 0.28, y + height * 0.61, 0.75, true);
        boat(x + width * 0.75, y + height * 0.58, 0.54, true);
        ctx.strokeStyle = light;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x + width * 0.08, y + height * 0.67);
        ctx.lineTo(x + width * 0.95, y + height * 0.64);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      case "river-garden":
        gate(x + width * 0.06, y + height * 0.29, 0.58, false);
        ctx.strokeStyle = light;
        for (let arrow = 0; arrow < 4; arrow += 1) {
          ctx.beginPath();
          ctx.moveTo(x + width * (0.55 + arrow * 0.09), y + height * 0.58);
          ctx.lineTo(x + width * (0.7 + arrow * 0.08), y + height * 0.22);
          ctx.stroke();
        }
        break;
      case "hulao-gate":
        gate(x + width * 0.03, y + height * 0.25, 0.9, false);
        horse(x + width * 0.72, y + height * 0.62, 0.75, -1);
        flames(x + width * 0.03, y + height * 0.72, 8, 0.9);
        break;
      default:
        banner(x + width * 0.12, y + height * 0.2, 0.7, 1);
        banner(x + width * 0.78, y + height * 0.24, 0.6, -1);
    }
    ctx.restore();
  }

  function paintNarrativeDepthV8(ctx, x, y, width, height, art, style, action, seed, compact) {
    const scene = art.scene || "";
    const noise = seededNoise(seed ^ 0x8a71c4);
    const naval = ["yangtze-fleet", "red-cliffs", "night-raid", "white-robes", "fire-attack", "river-garden"].includes(scene);
    const cavalry = ["changban-rescue", "dingjun-ridge", "hefei-charge", "hulao-gate"].includes(scene);
    const contemplative = ["wuzhang-stars", "wuzhang-watch", "guandu-rain"].includes(scene);
    const burning = ["red-cliffs", "fire-attack", "hulao-gate", "guandu-command"].includes(scene);
    const horizonY = y + height * (0.54 + action.shoulderSlope * 0.08);
    ctx.save();
    roundedRect(ctx, x, y, width, height, Math.max(4, width * 0.05));
    ctx.clip();

    const depthBand = ctx.createLinearGradient(x, horizonY - height * 0.16, x, horizonY + height * 0.26);
    depthBand.addColorStop(0, colorWithAlpha(style.glow, compact ? 0.025 : 0.045));
    depthBand.addColorStop(0.48, colorWithAlpha(style.secondary, compact ? 0.08 : 0.12));
    depthBand.addColorStop(1, "rgba(3,8,9,0)");
    ctx.fillStyle = depthBand;
    ctx.fillRect(x, horizonY - height * 0.18, width, height * 0.46);

    if (naval) {
      ctx.lineCap = "round";
      for (let wake = 0; wake < (compact ? 2 : 4); wake += 1) {
        const wakeY = horizonY + height * (0.06 + wake * 0.065);
        ctx.strokeStyle = colorWithAlpha(
          wake % 2 ? style.glow : "#d5e8df",
          compact ? 0.18 : 0.16 + wake * 0.018,
        );
        ctx.lineWidth = Math.max(0.55, width * (0.004 + wake * 0.0018));
        ctx.beginPath();
        ctx.moveTo(x - width * 0.06, wakeY);
        ctx.bezierCurveTo(
          x + width * (0.2 + noise() * 0.12),
          wakeY - height * 0.045,
          x + width * (0.62 + noise() * 0.1),
          wakeY + height * 0.035,
          x + width * 1.08,
          wakeY - height * 0.012,
        );
        ctx.stroke();
      }
      if (!compact) {
        ctx.strokeStyle = "rgba(5,10,11,.48)";
        ctx.lineWidth = Math.max(1, width * 0.012);
        ctx.beginPath();
        ctx.moveTo(x + width * 0.91, y + height * 0.12);
        ctx.lineTo(x + width * 0.86, y + height * 0.72);
        ctx.moveTo(x + width * 0.91, y + height * 0.18);
        ctx.lineTo(x + width * 0.69, y + height * 0.48);
        ctx.stroke();
      }
    } else if (cavalry) {
      const dust = ctx.createRadialGradient(
        x + width * 0.68,
        horizonY,
        0,
        x + width * 0.62,
        horizonY,
        width * 0.48,
      );
      dust.addColorStop(0, colorWithAlpha(style.secondary, compact ? 0.16 : 0.2));
      dust.addColorStop(0.56, "rgba(145,112,75,.08)");
      dust.addColorStop(1, "rgba(38,31,24,0)");
      ctx.fillStyle = dust;
      ctx.fillRect(x + width * 0.16, horizonY - height * 0.2, width, height * 0.48);
      ctx.strokeStyle = "rgba(7,11,11,.48)";
      ctx.lineWidth = Math.max(0.65, width * 0.006);
      for (let lance = 0; lance < (compact ? 3 : 6); lance += 1) {
        const baseX = x + width * (0.1 + lance * 0.16 + noise() * 0.04);
        ctx.beginPath();
        ctx.moveTo(baseX, horizonY + height * 0.12);
        ctx.lineTo(
          baseX + width * (action.weaponAngle > 0 ? 0.14 : -0.14),
          horizonY - height * (0.18 + noise() * 0.12),
        );
        ctx.stroke();
      }
    } else if (contemplative) {
      ctx.strokeStyle = colorWithAlpha(style.glow, compact ? 0.17 : 0.2);
      ctx.lineWidth = Math.max(0.5, width * 0.0045);
      const points = Array.from({ length: compact ? 4 : 7 }, (_, index) => ({
        x: x + width * (0.08 + index * (compact ? 0.25 : 0.145)),
        y: y + height * (0.18 + noise() * 0.28),
      }));
      ctx.beginPath();
      points.forEach((point, index) => {
        if (index) ctx.lineTo(point.x, point.y);
        else ctx.moveTo(point.x, point.y);
      });
      ctx.stroke();
      points.forEach((point, index) => {
        ellipsePath(
          ctx,
          point.x,
          point.y,
          width * (index % 3 === 0 ? 0.012 : 0.007),
          width * (index % 3 === 0 ? 0.012 : 0.007),
        );
        ctx.fillStyle = colorWithAlpha(index % 3 === 0 ? "#f3d77d" : style.glow, 0.55);
        ctx.fill();
      });
    } else {
      ctx.strokeStyle = colorWithAlpha(burning ? "#ef6b3b" : style.secondary, compact ? 0.16 : 0.22);
      ctx.lineCap = "round";
      for (let plume = 0; plume < (compact ? 2 : 4); plume += 1) {
        const plumeX = x + width * (0.08 + plume * 0.26 + noise() * 0.07);
        ctx.lineWidth = Math.max(0.8, width * (0.01 + noise() * 0.018));
        ctx.beginPath();
        ctx.moveTo(plumeX, horizonY + height * 0.16);
        ctx.bezierCurveTo(
          plumeX - width * 0.08,
          horizonY - height * 0.02,
          plumeX + width * 0.09,
          y + height * 0.28,
          plumeX + width * (noise() - 0.5) * 0.2,
          y - height * 0.04,
        );
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawPortraitTexture(ctx, x, y, width, height, seed, style) {
    const noise = seededNoise(seed ^ 0xa43f19);
    ctx.save();
    roundedRect(ctx, x, y, width, height, Math.max(4, width * 0.05));
    ctx.clip();
    ctx.lineCap = "round";
    for (let stroke = 0; stroke < 32; stroke += 1) {
      const sx = x + noise() * width;
      const sy = y + noise() * height;
      const length = width * (0.03 + noise() * 0.18);
      ctx.globalAlpha = 0.035 + noise() * 0.055;
      ctx.strokeStyle = noise() > 0.5 ? "#fff1c4" : "#030708";
      ctx.lineWidth = Math.max(0.6, width * (0.004 + noise() * 0.009));
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + length * 0.45, sy + (noise() - 0.5) * height * 0.04, sx + length, sy + (noise() - 0.5) * height * 0.025);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = style.secondary;
    for (let fiber = 0; fiber < 10; fiber += 1) {
      const fy = y + height * (0.08 + fiber * 0.095);
      ctx.beginPath();
      ctx.moveTo(x, fy);
      ctx.bezierCurveTo(x + width * 0.3, fy - 2, x + width * 0.7, fy + 2, x + width, fy);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPortraitForeground(ctx, x, y, width, height, seed, art, style) {
    const noise = seededNoise(seed ^ 0x71c4e2);
    const fiery = ["red-cliffs", "fire-attack", "hulao-gate", "guandu-command"].includes(art.scene);
    const floral = ["taoyuan-oath", "river-garden"].includes(art.scene);
    const rainy = ["wuzhang-watch", "guandu-rain"].includes(art.scene);
    ctx.save();
    roundedRect(ctx, x, y, width, height, Math.max(4, width * 0.05));
    ctx.clip();
    if (fiery) {
      for (let spark = 0; spark < 18; spark += 1) {
        const px = x + noise() * width;
        const py = y + height * (0.28 + noise() * 0.75);
        const radius = width * (0.006 + noise() * 0.018);
        ctx.shadowColor = "#ff642d";
        ctx.shadowBlur = radius * 4;
        ellipsePath(ctx, px, py, radius, radius * (1.5 + noise()));
        ctx.fillStyle = noise() > 0.55 ? "#ffd66b" : "#f25a2d";
        ctx.fill();
      }
    } else if (floral) {
      ctx.fillStyle = colorWithAlpha(art.feminine ? "#ffd2df" : "#f3b5a6", 0.74);
      for (let petal = 0; petal < 14; petal += 1) {
        const px = x + noise() * width;
        const py = y + noise() * height;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(noise() * TAU);
        ellipsePath(ctx, 0, 0, width * (0.012 + noise() * 0.014), width * 0.009);
        ctx.fill();
        ctx.restore();
      }
    } else if (rainy) {
      ctx.strokeStyle = "rgba(205,226,234,.42)";
      ctx.lineWidth = Math.max(0.7, width * 0.007);
      for (let drop = 0; drop < 18; drop += 1) {
        const px = x + noise() * width;
        const py = y + noise() * height;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - width * 0.035, py + height * 0.1);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = colorWithAlpha(style.secondary, 0.3);
      ctx.lineWidth = Math.max(0.7, width * 0.008);
      for (let stroke = 0; stroke < 10; stroke += 1) {
        const px = x + noise() * width;
        const py = y + height * (0.5 + noise() * 0.5);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + width * 0.08, py - height * 0.035, px + width * 0.17, py);
        ctx.stroke();
      }
    }
    const mist = ctx.createLinearGradient(x, y + height * 0.72, x, y + height);
    mist.addColorStop(0, "rgba(220,224,207,0)");
    mist.addColorStop(1, "rgba(220,224,207,.1)");
    ctx.fillStyle = mist;
    ctx.fillRect(x, y + height * 0.7, width, height * 0.3);
    ctx.restore();
  }

  function paintForegroundAtmosphericBrush(ctx, x, y, width, height, seed, art, style, pose, compact) {
    const noise = seededNoise(seed ^ 0x9b7c41);
    const fiery = ["red-cliffs", "fire-attack", "hulao-gate", "guandu-command"].includes(art.scene);
    const rainy = ["wuzhang-watch", "guandu-rain", "night-raid"].includes(art.scene);
    const facing = art.facing || 1;
    const brushColor = fiery ? "#ff7a3e" : rainy ? "#a8c7d8" : pose.rimColor || style.glow;
    ctx.save();
    roundedRect(ctx, x, y, width, height, Math.max(4, width * 0.05));
    ctx.clip();
    ctx.lineCap = "round";
    ctx.globalCompositeOperation = fiery ? "screen" : "source-over";
    ctx.filter = `blur(${Math.max(0.6, width * (compact ? 0.006 : 0.012))}px)`;
    const brushCount = compact ? 4 : 9;
    for (let brush = 0; brush < brushCount; brush += 1) {
      const fromRight = brush % 2 === 0;
      const startX = x + width * (fromRight ? 0.72 + noise() * 0.34 : -0.08 + noise() * 0.26);
      const startY = y + height * (0.55 + noise() * 0.52);
      const sweep = width * (0.2 + noise() * 0.38);
      const rise = height * (0.04 + noise() * 0.18);
      ctx.globalAlpha = compact ? 0.07 + noise() * 0.06 : 0.055 + noise() * 0.085;
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = width * (0.025 + noise() * (compact ? 0.035 : 0.07));
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(
        startX - facing * sweep * 0.35,
        startY - rise * 0.2,
        startX - facing * sweep * 0.72,
        startY - rise,
        startX - facing * sweep,
        startY - rise * (0.72 + noise() * 0.4),
      );
      ctx.stroke();
    }
    ctx.filter = "none";
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = compact ? 0.2 : 0.16;
    ctx.strokeStyle = colorWithAlpha(style.secondary, 0.78);
    ctx.lineWidth = Math.max(0.45, width * 0.005);
    for (let bristle = 0; bristle < (compact ? 3 : 7); bristle += 1) {
      const bx = x + width * (0.02 + noise() * 0.96);
      const by = y + height * (0.64 + noise() * 0.34);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - facing * width * (0.08 + noise() * 0.16), by - height * (0.025 + noise() * 0.07));
      ctx.stroke();
    }

    // A few crisp near-camera fragments give the soft background and painted
    // subject a third depth plane. Compact mode keeps only two large shapes.
    const fragmentCount = compact ? 2 : 5;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    for (let fragment = 0; fragment < fragmentCount; fragment += 1) {
      const side = fragment % 2 ? 1 : -1;
      const fx = x + width * (side > 0 ? 0.82 + noise() * 0.2 : -0.02 + noise() * 0.18);
      const fy = y + height * (0.66 + noise() * 0.34);
      const shardWidth = width * (compact ? 0.035 + noise() * 0.035 : 0.025 + noise() * 0.06);
      const shardHeight = height * (compact ? 0.09 + noise() * 0.12 : 0.08 + noise() * 0.19);
      ctx.beginPath();
      ctx.moveTo(fx, fy + shardHeight);
      ctx.lineTo(fx + side * shardWidth * 0.2, fy + shardHeight * 0.18);
      ctx.lineTo(fx + side * shardWidth, fy);
      ctx.lineTo(fx + side * shardWidth * 0.66, fy + shardHeight);
      ctx.closePath();
      ctx.fillStyle = fiery ? "rgba(57,18,13,.78)" : "rgba(5,10,12,.78)";
      ctx.fill();
      ctx.strokeStyle = colorWithAlpha(brushColor, compact ? 0.34 : 0.28);
      ctx.lineWidth = Math.max(0.42, width * 0.004);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPortraitPattern(ctx, x, y, width, height, art, style) {
    const cx = x + width / 2;
    ctx.save();
    ctx.strokeStyle = colorWithAlpha(style.secondary, 0.58);
    ctx.fillStyle = colorWithAlpha(style.glow, 0.22);
    ctx.lineWidth = Math.max(1.2, width * 0.018);
    if (["peach-oath", "plum-arrows"].includes(art.background)) {
      for (let index = 0; index < 7; index += 1) {
        const px = x + width * (0.12 + (index % 4) * 0.25);
        const py = y + height * (0.12 + Math.floor(index / 4) * 0.28);
        for (let petal = 0; petal < 5; petal += 1) {
          const angle = petal * TAU / 5;
          ellipsePath(ctx, px + Math.cos(angle) * width * 0.045, py + Math.sin(angle) * width * 0.045, width * 0.035, width * 0.018);
          ctx.fill();
        }
      }
    } else if (art.background === "green-dragon") {
      ctx.lineWidth = width * 0.055;
      ctx.beginPath();
      ctx.moveTo(x - 5, y + height * 0.75);
      ctx.bezierCurveTo(x + width * 0.18, y + height * 0.12, x + width * 0.62, y + height * 0.82, x + width * 1.06, y + height * 0.18);
      ctx.stroke();
      ellipsePath(ctx, x + width * 0.83, y + height * 0.2, width * 0.11, width * 0.09);
      ctx.stroke();
    } else if (art.background === "thunder-bridge") {
      ctx.beginPath();
      ctx.moveTo(x, y + height * 0.72);
      ctx.lineTo(x + width, y + height * 0.72);
      ctx.moveTo(x + width * 0.26, y);
      ctx.lineTo(x + width * 0.48, y + height * 0.2);
      ctx.lineTo(x + width * 0.35, y + height * 0.31);
      ctx.lineTo(x + width * 0.63, y + height * 0.56);
      ctx.stroke();
    } else if (["white-horse", "cavalry"].includes(art.background)) {
      ctx.beginPath();
      ctx.arc(x + width * 0.77, y + height * 0.56, width * 0.22, Math.PI, TAU);
      ctx.lineTo(x + width * 0.92, y + height * 0.32);
      ctx.lineTo(x + width * 0.99, y + height * 0.5);
      ctx.moveTo(x + width * 0.67, y + height * 0.62);
      ctx.lineTo(x + width * 0.6, y + height);
      ctx.moveTo(x + width * 0.84, y + height * 0.62);
      ctx.lineTo(x + width * 0.91, y + height);
      ctx.stroke();
    } else if (art.background === "constellation") {
      ctx.beginPath();
      for (let index = 0; index < 9; index += 1) {
        const px = x + width * (0.1 + ((index * 37) % 83) / 100);
        const py = y + height * (0.08 + ((index * 29) % 54) / 100);
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
        ctx.moveTo(px + width * 0.016, py);
        ctx.arc(px, py, width * 0.016, 0, TAU);
      }
      ctx.stroke();
    } else if (art.background === "arrow-rain") {
      for (let index = 0; index < 7; index += 1) {
        const px = x + width * (0.04 + index * 0.15);
        ctx.beginPath();
        ctx.moveTo(px, y);
        ctx.lineTo(px + width * 0.14, y + height * 0.38);
        ctx.lineTo(px + width * 0.09, y + height * 0.33);
        ctx.moveTo(px + width * 0.14, y + height * 0.38);
        ctx.lineTo(px + width * 0.15, y + height * 0.31);
        ctx.stroke();
      }
    } else if (art.background === "ravens") {
      for (let index = 0; index < 6; index += 1) {
        const px = x + width * (0.13 + index * 0.15);
        const py = y + height * (0.15 + (index % 3) * 0.12);
        ctx.beginPath();
        ctx.moveTo(px - width * 0.055, py);
        ctx.quadraticCurveTo(px - width * 0.02, py - width * 0.05, px, py);
        ctx.quadraticCurveTo(px + width * 0.025, py - width * 0.05, px + width * 0.06, py);
        ctx.stroke();
      }
    } else if (["iron-wall", "broken-gate"].includes(art.background)) {
      for (let row = 0; row < 5; row += 1) {
        for (let column = 0; column < 4; column += 1) {
          ctx.strokeRect(x + (column + (row % 2) * 0.5) * width * 0.27 - width * 0.1, y + row * height * 0.16, width * 0.25, height * 0.14);
        }
      }
    } else if (["bamboo-slips", "ink-grid"].includes(art.background)) {
      for (let index = 0; index < 7; index += 1) {
        ctx.strokeRect(x + width * (0.06 + index * 0.14), y + height * 0.08, width * 0.1, height * 0.62);
      }
    } else if (["river-tide", "wave-raid"].includes(art.background)) {
      for (let row = 0; row < 6; row += 1) {
        ctx.beginPath();
        ctx.moveTo(x - width * 0.1, y + height * (0.18 + row * 0.14));
        ctx.bezierCurveTo(cx - width * 0.24, y + height * (0.08 + row * 0.14), cx + width * 0.2, y + height * (0.3 + row * 0.12), x + width * 1.1, y + height * (0.16 + row * 0.14));
        ctx.stroke();
      }
    } else if (["red-cliffs-fire", "fire-ships"].includes(art.background)) {
      ctx.fillStyle = "rgba(255,113,42,.32)";
      for (let index = 0; index < 7; index += 1) {
        const fx = x + width * (0.05 + index * 0.15);
        const fy = y + height * (0.78 - (index % 3) * 0.08);
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.quadraticCurveTo(fx - width * 0.06, fy - height * 0.22, fx + width * 0.02, fy - height * 0.3);
        ctx.quadraticCurveTo(fx + width * 0.12, fy - height * 0.14, fx + width * 0.07, fy);
        ctx.fill();
      }
    } else if (art.background === "red-sun") {
      ellipsePath(ctx, cx, y + height * 0.28, width * 0.35, width * 0.35);
      ctx.fillStyle = "rgba(245,74,42,.32)";
      ctx.fill();
    } else {
      for (let index = 0; index < 4; index += 1) {
        const bx = x + width * (0.08 + index * 0.27);
        ctx.beginPath();
        ctx.moveTo(bx, y);
        ctx.lineTo(bx, y + height * 0.66);
        ctx.moveTo(bx, y + height * 0.08);
        ctx.lineTo(bx + width * 0.17, y + height * 0.16);
        ctx.lineTo(bx, y + height * 0.34);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawPortraitHeadgear(ctx, cx, headY, radius, width, art, style) {
    const type = art.headgear;
    const isScholar = /scholar|soft-cap|commander-cap/.test(type);
    const isCrown = /crown/.test(type) && type !== "phoenix-crown";
    ctx.save();
    ctx.strokeStyle = style.secondary;
    ctx.lineWidth = Math.max(1.2, width * 0.016);
    ctx.fillStyle = type === "white-helmet" ? "#eeeadd" : isCrown ? "#b88831" : "#171b20";
    if (isScholar) {
      roundedRect(ctx, cx - radius * 0.92, headY - radius * 1.3, radius * 1.84, radius * 0.74, radius * 0.18);
      ctx.fill();
      ctx.stroke();
      if (/scholar/.test(type)) ctx.fillRect(cx - radius * 1.7, headY - radius * 1.08, radius * 3.4, radius * 0.22);
    } else if (isCrown) {
      ctx.beginPath();
      ctx.moveTo(cx - radius, headY - radius * 0.62);
      ctx.lineTo(cx - radius * 0.82, headY - radius * 1.5);
      ctx.lineTo(cx - radius * 0.28, headY - radius * 1.08);
      ctx.lineTo(cx, headY - radius * 1.72);
      ctx.lineTo(cx + radius * 0.28, headY - radius * 1.08);
      ctx.lineTo(cx + radius * 0.82, headY - radius * 1.5);
      ctx.lineTo(cx + radius, headY - radius * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (type === "river-crown") {
        ctx.beginPath();
        ctx.moveTo(cx - radius * 1.28, headY - radius * 0.72);
        ctx.lineTo(cx + radius * 1.28, headY - radius * 0.72);
        ctx.stroke();
        for (let index = -2; index <= 2; index += 1) {
          ellipsePath(ctx, cx + index * radius * 0.38, headY - radius * 0.72, radius * 0.08, radius * 0.08);
          ctx.fillStyle = index % 2 ? "#e34e3c" : "#e8ca78";
          ctx.fill();
        }
      } else if (type === "gold-crown") {
        ctx.fillStyle = "#efc95e";
        ctx.beginPath();
        ctx.moveTo(cx, headY - radius * 1.72);
        ctx.quadraticCurveTo(cx + radius * 0.62, headY - radius * 2.08, cx + radius * 0.38, headY - radius * 1.2);
        ctx.quadraticCurveTo(cx, headY - radius * 1.58, cx, headY - radius * 1.72);
        ctx.fill();
      } else if (type === "monarch-crown") {
        ctx.strokeStyle = "#f0db88";
        for (let index = -2; index <= 2; index += 1) {
          ctx.beginPath();
          ctx.moveTo(cx + index * radius * 0.28, headY - radius * 1.45);
          ctx.lineTo(cx + index * radius * 0.28, headY - radius * 0.72);
          ctx.stroke();
        }
      }
    } else if (type === "warrior-hairpin") {
      ctx.beginPath();
      ctx.arc(cx, headY - radius * 0.24, radius * 1.02, Math.PI, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - radius * 1.35, headY - radius * 1.05);
      ctx.lineTo(cx + radius * 1.28, headY - radius * 0.9);
      ctx.stroke();
    } else if (type === "phoenix-crown") {
      ctx.fillStyle = "#15181b";
      ctx.beginPath();
      ctx.arc(cx, headY - radius * 0.2, radius * 1.07, Math.PI, TAU);
      ctx.lineTo(cx + radius * 0.83, headY - radius * 0.21);
      ctx.lineTo(cx - radius * 0.83, headY - radius * 0.21);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#d33330";
      for (let side = -1; side <= 1; side += 2) {
        ctx.beginPath();
        ctx.moveTo(cx, headY - radius);
        ctx.quadraticCurveTo(cx + side * radius * 2.15, headY - radius * 2.2, cx + side * radius * 1.45, headY - radius * 0.4);
        ctx.quadraticCurveTo(cx + side * radius * 0.68, headY - radius * 1.24, cx, headY - radius);
        ctx.fill();
        ctx.stroke();
      }
      ellipsePath(ctx, cx, headY - radius * 1.18, radius * 0.18, radius * 0.18);
      ctx.fillStyle = "#f3ca55";
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(cx, headY - radius * 0.2, radius * 1.07, Math.PI, TAU);
      ctx.lineTo(cx + radius * 0.83, headY - radius * 0.21);
      ctx.lineTo(cx - radius * 0.83, headY - radius * 0.21);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (type === "horned-helmet") {
        for (let side = -1; side <= 1; side += 2) {
          ctx.beginPath();
          ctx.moveTo(cx + side * radius * 0.7, headY - radius * 0.72);
          ctx.quadraticCurveTo(cx + side * radius * 1.65, headY - radius * 1.7, cx + side * radius * 1.2, headY - radius * 0.2);
          ctx.fill();
        }
      } else if (["horsehair-helmet", "white-helmet"].includes(type)) {
        ctx.fillStyle = type === "white-helmet" ? "#f3efe0" : "#a52e2b";
        ctx.beginPath();
        ctx.moveTo(cx, headY - radius);
        ctx.bezierCurveTo(cx + radius * 0.8, headY - radius * 2.35, cx + radius * 1.05, headY - radius * 1.12, cx + radius * 0.5, headY - radius * 0.5);
        ctx.bezierCurveTo(cx + radius * 0.2, headY - radius * 1.35, cx - radius * 0.2, headY - radius * 1.4, cx, headY - radius);
        ctx.fill();
      } else if (["raider-scarf", "wild-band"].includes(type)) {
        ctx.fillStyle = type === "raider-scarf" ? "#bd3e36" : "#352723";
        ctx.fillRect(cx - radius * 1.12, headY - radius * 0.72, radius * 2.24, radius * 0.35);
        ctx.beginPath();
        ctx.moveTo(cx + radius, headY - radius * 0.56);
        ctx.lineTo(cx + radius * 2.05, headY - radius * 0.15);
        ctx.lineTo(cx + radius * 1.08, headY);
        ctx.closePath();
        ctx.fill();
      } else if (type === "war-scarf") {
        ctx.fillStyle = "#a52724";
        ctx.fillRect(cx - radius * 1.12, headY - radius * 0.7, radius * 2.24, radius * 0.3);
        ctx.beginPath();
        ctx.moveTo(cx + radius * 0.92, headY - radius * 0.54);
        ctx.bezierCurveTo(cx + radius * 2.05, headY - radius * 0.2, cx + radius * 1.72, headY + radius * 0.7, cx + radius * 0.96, headY + radius * 0.2);
        ctx.closePath();
        ctx.fill();
      } else if (type === "elder-knot") {
        ellipsePath(ctx, cx, headY - radius * 1.16, radius * 0.35, radius * 0.35);
        ctx.fillStyle = "#d5d0c2";
        ctx.fill();
        ctx.stroke();
      } else if (type === "veteran-helm") {
        ctx.fillStyle = "#b9b3a5";
        ctx.fillRect(cx - radius * 0.78, headY - radius * 0.22, radius * 0.2, radius * 1.05);
        ctx.fillRect(cx + radius * 0.58, headY - radius * 0.22, radius * 0.2, radius * 1.05);
      }
    }
    ctx.restore();
  }

  function drawPortraitWeapon(ctx, x, y, width, height, art, style) {
    const weapon = art.weapon;
    const pole = (fromX, fromY, toX, toY) => {
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
    };
    ctx.save();
    ctx.strokeStyle = style.secondary;
    ctx.fillStyle = style.secondary;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2, width * 0.026);
    if (weapon === "twin-swords") {
      pole(x + width * 0.17, y + height * 0.94, x + width * 0.37, y + height * 0.09);
      pole(x + width * 0.83, y + height * 0.94, x + width * 0.63, y + height * 0.09);
      ctx.lineWidth *= 1.7;
      pole(x + width * 0.28, y + height * 0.49, x + width * 0.42, y + height * 0.53);
      pole(x + width * 0.72, y + height * 0.49, x + width * 0.58, y + height * 0.53);
    } else if (weapon === "crescent-blade") {
      pole(x + width * 0.84, y + height, x + width * 0.74, y + height * 0.08);
      ctx.beginPath();
      ctx.moveTo(x + width * 0.74, y + height * 0.08);
      ctx.quadraticCurveTo(x + width * 0.98, y + height * 0.08, x + width * 0.8, y + height * 0.3);
      ctx.quadraticCurveTo(x + width * 0.82, y + height * 0.15, x + width * 0.74, y + height * 0.08);
      ctx.fill();
    } else if (weapon === "serpent-spear") {
      pole(x + width * 0.8, y + height, x + width * 0.72, y + height * 0.16);
      ctx.beginPath();
      ctx.moveTo(x + width * 0.72, y + height * 0.16);
      ctx.bezierCurveTo(x + width * 0.62, y + height * 0.1, x + width * 0.84, y + height * 0.07, x + width * 0.72, y);
      ctx.bezierCurveTo(x + width * 0.89, y + height * 0.08, x + width * 0.7, y + height * 0.12, x + width * 0.72, y + height * 0.16);
      ctx.stroke();
    } else if (["spear", "horse-lance"].includes(weapon)) {
      pole(x + width * 0.81, y + height, x + width * 0.73, y + height * 0.05);
      ctx.beginPath();
      ctx.moveTo(x + width * 0.73, y);
      ctx.lineTo(x + width * 0.65, y + height * 0.14);
      ctx.lineTo(x + width * 0.77, y + height * 0.1);
      ctx.closePath();
      ctx.fill();
    } else if (["feather-fan", "dark-fan"].includes(weapon)) {
      for (let index = -3; index <= 3; index += 1) {
        ctx.save();
        ctx.translate(x + width * 0.77, y + height * 0.8);
        ctx.rotate(index * 0.18);
        ellipsePath(ctx, 0, -height * 0.17, width * 0.048, height * 0.2);
        ctx.fillStyle = weapon === "dark-fan" ? "#16171c" : "#eee8d5";
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    } else if (weapon === "bow") {
      ctx.beginPath();
      ctx.arc(x + width * 0.78, y + height * 0.55, width * 0.25, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.lineWidth = Math.max(1, width * 0.012);
      pole(x + width * 0.78, y + height * 0.3, x + width * 0.78, y + height * 0.8);
      pole(x + width * 0.59, y + height * 0.55, x + width * 0.97, y + height * 0.55);
    } else if (["royal-sword", "jiangdong-sword", "flame-sword"].includes(weapon)) {
      pole(x + width * 0.8, y + height * 0.94, x + width * 0.73, y + height * 0.13);
      ctx.lineWidth *= 1.8;
      pole(x + width * 0.65, y + height * 0.48, x + width * 0.83, y + height * 0.46);
      if (weapon === "flame-sword") {
        ctx.strokeStyle = "#ff6c32";
        ctx.beginPath();
        ctx.moveTo(x + width * 0.73, y + height * 0.13);
        ctx.quadraticCurveTo(x + width * 0.89, y + height * 0.22, x + width * 0.74, y + height * 0.34);
        ctx.stroke();
      }
    } else if (weapon === "shield") {
      ctx.beginPath();
      ctx.moveTo(x + width * 0.64, y + height * 0.48);
      ctx.lineTo(x + width * 0.97, y + height * 0.43);
      ctx.lineTo(x + width * 0.91, y + height * 0.82);
      ctx.lineTo(x + width * 0.79, y + height * 0.95);
      ctx.lineTo(x + width * 0.65, y + height * 0.82);
      ctx.closePath();
      ctx.fillStyle = "#334b5e";
      ctx.fill();
      ctx.stroke();
      drawCenteredText(ctx, "魏", x + width * 0.8, y + height * 0.67, {
        font: `900 ${Math.round(width * 0.14)}px ${SYSTEM_FONT}`,
        color: style.secondary,
      });
    } else if (["twin-halberds", "fangtian-halberd"].includes(weapon)) {
      const columns = weapon === "twin-halberds" ? [0.18, 0.82] : [0.8];
      columns.forEach((ratio) => {
        pole(x + width * ratio, y + height, x + width * ratio, y + height * 0.08);
        ctx.beginPath();
        ctx.moveTo(x + width * ratio, y + height * 0.11);
        ctx.lineTo(x + width * (ratio - 0.11), y + height * 0.2);
        ctx.lineTo(x + width * ratio, y + height * 0.27);
        ctx.lineTo(x + width * (ratio + 0.11), y + height * 0.2);
        ctx.closePath();
        ctx.stroke();
      });
    } else if (["bamboo-scroll", "book-sword"].includes(weapon)) {
      roundedRect(ctx, x + width * 0.61, y + height * 0.59, width * 0.32, height * 0.23, width * 0.025);
      ctx.fillStyle = "#cab779";
      ctx.fill();
      ctx.stroke();
      for (let index = 1; index < 5; index += 1) {
        pole(x + width * (0.61 + index * 0.064), y + height * 0.6, x + width * (0.61 + index * 0.064), y + height * 0.81);
      }
      if (weapon === "book-sword") pole(x + width * 0.92, y + height * 0.95, x + width * 0.82, y + height * 0.13);
    } else if (weapon === "bells-blade") {
      pole(x + width * 0.84, y + height * 0.94, x + width * 0.76, y + height * 0.13);
      [0.64, 0.82].forEach((ratio) => {
        ellipsePath(ctx, x + width * ratio, y + height * 0.55, width * 0.055, width * 0.055);
        ctx.fillStyle = "#e9bd54";
        ctx.fill();
        ctx.stroke();
      });
    } else if (weapon === "fire-club") {
      ctx.strokeStyle = "#754927";
      ctx.lineWidth = width * 0.065;
      pole(x + width * 0.8, y + height * 0.94, x + width * 0.72, y + height * 0.2);
      ctx.fillStyle = "#ff6e35";
      ctx.beginPath();
      ctx.moveTo(x + width * 0.72, y + height * 0.22);
      ctx.quadraticCurveTo(x + width * 0.61, y + height * 0.06, x + width * 0.74, y);
      ctx.quadraticCurveTo(x + width * 0.89, y + height * 0.11, x + width * 0.72, y + height * 0.22);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPortraitArms(ctx, x, y, width, height, art, style, cx) {
    const facing = art.facing || 1;
    const nearShoulderX = cx + facing * width * 0.2;
    const farShoulderX = cx - facing * width * 0.18;
    let nearHand = { x: x + width * 0.73, y: y + height * 0.65 };
    let farHand = { x: cx - facing * width * 0.11, y: y + height * 0.72 };
    if (art.weapon === "twin-swords") {
      nearHand = { x: x + width * 0.69, y: y + height * 0.55 };
      farHand = { x: x + width * 0.31, y: y + height * 0.55 };
    } else if (["feather-fan", "dark-fan"].includes(art.weapon)) {
      nearHand = { x: x + width * 0.72, y: y + height * 0.78 };
      farHand = { x: cx - facing * width * 0.09, y: y + height * 0.68 };
    } else if (art.weapon === "bow") {
      nearHand = { x: x + width * 0.77, y: y + height * 0.54 };
      farHand = { x: x + width * 0.58, y: y + height * 0.55 };
    } else if (["bamboo-scroll", "book-sword"].includes(art.weapon)) {
      nearHand = { x: x + width * 0.71, y: y + height * 0.69 };
      farHand = { x: x + width * 0.82, y: y + height * 0.72 };
    } else if (art.weapon === "shield") {
      nearHand = { x: x + width * 0.73, y: y + height * 0.63 };
      farHand = { x: cx - facing * width * 0.14, y: y + height * 0.75 };
    } else if (art.weapon === "twin-halberds") {
      nearHand = { x: x + width * 0.78, y: y + height * 0.55 };
      farHand = { x: x + width * 0.22, y: y + height * 0.55 };
    }
    const drawArm = (shoulderX, shoulderY, hand, near) => {
      ctx.save();
      ctx.strokeStyle = near ? art.robe : colorWithAlpha(art.robe, 0.74);
      ctx.lineWidth = width * (near ? 0.13 : 0.105);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.quadraticCurveTo(
        lerp(shoulderX, hand.x, 0.56) + facing * width * (near ? 0.05 : -0.035),
        lerp(shoulderY, hand.y, 0.56) - height * (near ? 0.025 : 0),
        hand.x,
        hand.y,
      );
      ctx.stroke();
      ctx.strokeStyle = near ? colorWithAlpha(style.secondary, 0.76) : "rgba(0,0,0,.26)";
      ctx.lineWidth = Math.max(1, width * 0.014);
      ctx.stroke();
      const cuffAngle = Math.atan2(hand.y - shoulderY, hand.x - shoulderX);
      ctx.save();
      ctx.translate(hand.x, hand.y);
      ctx.rotate(cuffAngle);
      roundedRect(ctx, -width * 0.065, -width * 0.055, width * 0.12, width * 0.11, width * 0.025);
      ctx.fillStyle = near ? style.primary : colorWithAlpha(style.primary, 0.85);
      ctx.fill();
      ctx.strokeStyle = style.secondary;
      ctx.stroke();
      ellipsePath(ctx, width * 0.045, 0, width * 0.045, width * 0.052);
      ctx.fillStyle = art.feminine ? "#dfb38e" : "#c79268";
      ctx.fill();
      ctx.strokeStyle = colorWithAlpha("#6b3928", 0.58);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
    };
    drawArm(farShoulderX, y + height * 0.64, farHand, false);
    drawArm(nearShoulderX, y + height * 0.62, nearHand, true);
  }

  const FACE_PROFILES = Object.freeze({
    "twin-swords-monarch": { jaw: 0.66, chin: 1.08, nose: 0.1, cheek: 0.58, eye: "soft", tone: "#c9956d", age: 1 },
    "crescent-blade-long-beard": { jaw: 0.72, chin: 1.24, nose: 0.2, cheek: 0.68, eye: "noble", tone: "#984a3d", age: 2 },
    "serpent-spear-wild-beard": { jaw: 0.96, chin: 1.06, nose: 0.24, cheek: 0.82, eye: "fierce", tone: "#895641", age: 2 },
    "white-helmet-spear": { jaw: 0.58, chin: 1.13, nose: 0.08, cheek: 0.5, eye: "clear", tone: "#d1a078", age: 0 },
    "scholar-fan-constellation": { jaw: 0.58, chin: 1.25, nose: 0.14, cheek: 0.5, eye: "calm", tone: "#d0a17b", age: 1 },
    "elder-archer": { jaw: 0.73, chin: 1.2, nose: 0.25, cheek: 0.7, eye: "keen", tone: "#ba875f", age: 4 },
    "silver-lion-cavalier": { jaw: 0.63, chin: 1.16, nose: 0.12, cheek: 0.59, eye: "keen", tone: "#cf956d", age: 1 },
    "crowned-sword-ruler": { jaw: 0.78, chin: 1.12, nose: 0.17, cheek: 0.72, eye: "hawk", tone: "#c48c63", age: 2 },
    "black-strategist-raven": { jaw: 0.56, chin: 1.25, nose: 0.24, cheek: 0.5, eye: "hawk", tone: "#c89a79", age: 2 },
    "eyepatch-shield": { jaw: 0.88, chin: 1.08, nose: 0.2, cheek: 0.8, eye: "fierce", tone: "#b97858", age: 3 },
    "twin-halberds-giant": { jaw: 1.02, chin: 0.98, nose: 0.3, cheek: 0.88, eye: "fierce", tone: "#986348", age: 2 },
    "cavalry-lance": { jaw: 0.66, chin: 1.18, nose: 0.12, cheek: 0.63, eye: "keen", tone: "#c28b66", age: 1 },
    "bamboo-scroll-adviser": { jaw: 0.52, chin: 1.2, nose: 0.16, cheek: 0.45, eye: "tired", tone: "#d9b99c", age: 1 },
    "tiger-maul-guardian": { jaw: 1.06, chin: 0.96, nose: 0.32, cheek: 0.91, eye: "fierce", tone: "#a96b4b", age: 2 },
    "river-crown-sword": { jaw: 0.7, chin: 1.1, nose: 0.12, cheek: 0.64, eye: "calm", tone: "#bd8866", age: 1 },
    "fire-gold-crown-sword": { jaw: 0.54, chin: 1.18, nose: 0.1, cheek: 0.52, eye: "clear", tone: "#d09b75", age: 0 },
    "bells-headscarf-raider": { jaw: 0.74, chin: 1.08, nose: 0.16, cheek: 0.72, eye: "fierce", tone: "#b97957", age: 1 },
    "book-and-sword": { jaw: 0.67, chin: 1.12, nose: 0.12, cheek: 0.6, eye: "calm", tone: "#c58f6c", age: 1 },
    "elder-fire-ship": { jaw: 0.84, chin: 1.08, nose: 0.28, cheek: 0.78, eye: "keen", tone: "#a86f50", age: 4 },
    "female-archer": { jaw: 0.48, chin: 1.18, nose: 0.06, cheek: 0.46, eye: "clear", tone: "#dbad8a", age: 0 },
    "young-fire-tactician": { jaw: 0.55, chin: 1.2, nose: 0.09, cheek: 0.49, eye: "calm", tone: "#d4a17c", age: 0 },
    "elephant-crown-king": { jaw: 0.93, chin: 1.01, nose: 0.3, cheek: 0.86, eye: "fierce", tone: "#9f6246", age: 2 },
    "fire-dagger-huntress": { jaw: 0.5, chin: 1.16, nose: 0.07, cheek: 0.52, eye: "keen", tone: "#cf8e67", age: 0 },
    "rattan-horn-bulwark": { jaw: 1.08, chin: 0.94, nose: 0.34, cheek: 0.94, eye: "fierce", tone: "#89593f", age: 3 },
    "bone-mask-beastmaster": { jaw: 0.7, chin: 1.11, nose: 0.2, cheek: 0.68, eye: "hawk", tone: "#af7654", age: 2 },
    "horn-bugle-vanguard": { jaw: 0.73, chin: 1.08, nose: 0.15, cheek: 0.7, eye: "clear", tone: "#b97955", age: 1 },
    "phoenix-crown-halberd": { jaw: 0.78, chin: 1.1, nose: 0.16, cheek: 0.73, eye: "fierce", tone: "#c2835f", age: 0 },
    "jungle-beast-horned": { jaw: 1.14, chin: 0.82, nose: 0.38, cheek: 1.02, eye: "fierce", tone: "#7c563d", age: 1 },
  });

  function faceProfile(art) {
    return FACE_PROFILES[art.archetype] || FACE_PROFILES["cavalry-lance"];
  }

  const SKULL_BASES = Object.freeze({
    "oval-ruler": { templeWidth: 0.84, faceLength: 1.04, jawAngle: 0.54, chinPoint: 0.08, browY: -0.13, eyeSpacing: 0.29, mouthWidth: 0.5, earY: 0.16 },
    "long-scholar": { templeWidth: 0.74, faceLength: 1.18, jawAngle: 0.43, chinPoint: 0.18, browY: -0.1, eyeSpacing: 0.27, mouthWidth: 0.43, earY: 0.18 },
    "square-warrior": { templeWidth: 0.93, faceLength: 0.98, jawAngle: 0.78, chinPoint: 0.03, browY: -0.17, eyeSpacing: 0.32, mouthWidth: 0.58, earY: 0.12 },
    "lean-youth": { templeWidth: 0.71, faceLength: 1.08, jawAngle: 0.4, chinPoint: 0.13, browY: -0.11, eyeSpacing: 0.3, mouthWidth: 0.44, earY: 0.14 },
    "angular-veteran": { templeWidth: 0.86, faceLength: 1.08, jawAngle: 0.68, chinPoint: 0.07, browY: -0.19, eyeSpacing: 0.3, mouthWidth: 0.54, earY: 0.2 },
    "heart-archer": { templeWidth: 0.77, faceLength: 1.1, jawAngle: 0.34, chinPoint: 0.22, browY: -0.09, eyeSpacing: 0.31, mouthWidth: 0.42, earY: 0.12 },
  });

  const FACE_LANDMARKS = Object.freeze({
    "twin-swords-monarch": { base: "oval-ruler", templeWidth: 0.87, faceLength: 1.05, jawAngle: 0.52, chinPoint: 0.08, browY: -0.12, eyeSpacing: 0.31, mouthWidth: 0.5, earY: 0.17, asymmetry: -0.035 },
    "crescent-blade-long-beard": { base: "angular-veteran", templeWidth: 0.82, faceLength: 1.17, jawAngle: 0.62, chinPoint: 0.1, browY: -0.2, eyeSpacing: 0.29, mouthWidth: 0.52, earY: 0.18, asymmetry: 0.045 },
    "serpent-spear-wild-beard": { base: "square-warrior", templeWidth: 1.02, faceLength: 0.96, jawAngle: 0.91, chinPoint: -0.02, browY: -0.22, eyeSpacing: 0.35, mouthWidth: 0.64, earY: 0.09, asymmetry: -0.07 },
    "white-helmet-spear": { base: "lean-youth", templeWidth: 0.73, faceLength: 1.1, jawAngle: 0.38, chinPoint: 0.14, browY: -0.1, eyeSpacing: 0.31, mouthWidth: 0.42, earY: 0.12, asymmetry: 0.028 },
    "scholar-fan-constellation": { base: "long-scholar", templeWidth: 0.72, faceLength: 1.2, jawAngle: 0.39, chinPoint: 0.2, browY: -0.08, eyeSpacing: 0.28, mouthWidth: 0.4, earY: 0.19, asymmetry: -0.018 },
    "elder-archer": { base: "angular-veteran", templeWidth: 0.84, faceLength: 1.12, jawAngle: 0.66, chinPoint: 0.08, browY: -0.2, eyeSpacing: 0.28, mouthWidth: 0.5, earY: 0.22, asymmetry: 0.06 },
    "silver-lion-cavalier": { base: "lean-youth", templeWidth: 0.79, faceLength: 1.13, jawAngle: 0.49, chinPoint: 0.12, browY: -0.16, eyeSpacing: 0.31, mouthWidth: 0.46, earY: 0.13, asymmetry: -0.055 },
    "crowned-sword-ruler": { base: "square-warrior", templeWidth: 0.9, faceLength: 1.02, jawAngle: 0.72, chinPoint: 0.04, browY: -0.18, eyeSpacing: 0.3, mouthWidth: 0.55, earY: 0.14, asymmetry: 0.052 },
    "black-strategist-raven": { base: "long-scholar", templeWidth: 0.69, faceLength: 1.24, jawAngle: 0.38, chinPoint: 0.24, browY: -0.16, eyeSpacing: 0.26, mouthWidth: 0.38, earY: 0.2, asymmetry: -0.075 },
    "eyepatch-shield": { base: "angular-veteran", templeWidth: 0.93, faceLength: 1.03, jawAngle: 0.81, chinPoint: 0.02, browY: -0.23, eyeSpacing: 0.34, mouthWidth: 0.58, earY: 0.11, asymmetry: 0.09 },
    "twin-halberds-giant": { base: "square-warrior", templeWidth: 1.07, faceLength: 0.92, jawAngle: 0.98, chinPoint: -0.05, browY: -0.24, eyeSpacing: 0.37, mouthWidth: 0.67, earY: 0.07, asymmetry: -0.08 },
    "cavalry-lance": { base: "lean-youth", templeWidth: 0.77, faceLength: 1.12, jawAngle: 0.47, chinPoint: 0.12, browY: -0.15, eyeSpacing: 0.3, mouthWidth: 0.45, earY: 0.14, asymmetry: 0.048 },
    "bamboo-scroll-adviser": { base: "long-scholar", templeWidth: 0.68, faceLength: 1.19, jawAngle: 0.35, chinPoint: 0.22, browY: -0.06, eyeSpacing: 0.27, mouthWidth: 0.39, earY: 0.21, asymmetry: 0.065 },
    "tiger-maul-guardian": { base: "square-warrior", templeWidth: 1.09, faceLength: 0.91, jawAngle: 1.01, chinPoint: -0.06, browY: -0.25, eyeSpacing: 0.38, mouthWidth: 0.68, earY: 0.06, asymmetry: 0.075 },
    "river-crown-sword": { base: "oval-ruler", templeWidth: 0.82, faceLength: 1.01, jawAngle: 0.58, chinPoint: 0.06, browY: -0.14, eyeSpacing: 0.31, mouthWidth: 0.49, earY: 0.13, asymmetry: -0.052 },
    "fire-gold-crown-sword": { base: "lean-youth", templeWidth: 0.7, faceLength: 1.1, jawAngle: 0.37, chinPoint: 0.15, browY: -0.1, eyeSpacing: 0.3, mouthWidth: 0.43, earY: 0.12, asymmetry: 0.035 },
    "bells-headscarf-raider": { base: "angular-veteran", templeWidth: 0.88, faceLength: 1.02, jawAngle: 0.7, chinPoint: 0.04, browY: -0.2, eyeSpacing: 0.33, mouthWidth: 0.57, earY: 0.1, asymmetry: -0.095 },
    "book-and-sword": { base: "oval-ruler", templeWidth: 0.79, faceLength: 1.09, jawAngle: 0.51, chinPoint: 0.1, browY: -0.12, eyeSpacing: 0.29, mouthWidth: 0.46, earY: 0.15, asymmetry: 0.024 },
    "elder-fire-ship": { base: "angular-veteran", templeWidth: 0.94, faceLength: 1.01, jawAngle: 0.84, chinPoint: 0.02, browY: -0.21, eyeSpacing: 0.32, mouthWidth: 0.6, earY: 0.15, asymmetry: 0.072 },
    "female-archer": { base: "heart-archer", templeWidth: 0.78, faceLength: 1.12, jawAngle: 0.32, chinPoint: 0.24, browY: -0.08, eyeSpacing: 0.33, mouthWidth: 0.4, earY: 0.11, asymmetry: -0.032 },
    "young-fire-tactician": { base: "lean-youth", templeWidth: 0.72, faceLength: 1.14, jawAngle: 0.4, chinPoint: 0.17, browY: -0.11, eyeSpacing: 0.29, mouthWidth: 0.41, earY: 0.14, asymmetry: 0.042 },
    "elephant-crown-king": { base: "square-warrior", templeWidth: 0.98, faceLength: 0.99, jawAngle: 0.88, chinPoint: -0.01, browY: -0.22, eyeSpacing: 0.35, mouthWidth: 0.63, earY: 0.09, asymmetry: -0.082 },
    "fire-dagger-huntress": { base: "heart-archer", templeWidth: 0.8, faceLength: 1.09, jawAngle: 0.36, chinPoint: 0.21, browY: -0.12, eyeSpacing: 0.34, mouthWidth: 0.43, earY: 0.1, asymmetry: 0.064 },
    "rattan-horn-bulwark": { base: "square-warrior", templeWidth: 1.11, faceLength: 0.9, jawAngle: 1.04, chinPoint: -0.08, browY: -0.27, eyeSpacing: 0.39, mouthWidth: 0.69, earY: 0.05, asymmetry: -0.045 },
    "bone-mask-beastmaster": { base: "angular-veteran", templeWidth: 0.87, faceLength: 1.1, jawAngle: 0.65, chinPoint: 0.08, browY: -0.2, eyeSpacing: 0.28, mouthWidth: 0.51, earY: 0.17, asymmetry: 0.095 },
    "horn-bugle-vanguard": { base: "oval-ruler", templeWidth: 0.84, faceLength: 1.06, jawAngle: 0.59, chinPoint: 0.07, browY: -0.15, eyeSpacing: 0.32, mouthWidth: 0.53, earY: 0.12, asymmetry: -0.068 },
    "phoenix-crown-halberd": { base: "square-warrior", templeWidth: 0.91, faceLength: 1.03, jawAngle: 0.7, chinPoint: 0.05, browY: -0.19, eyeSpacing: 0.33, mouthWidth: 0.55, earY: 0.1, asymmetry: 0.058 },
    "jungle-beast-horned": { base: "square-warrior", templeWidth: 1.15, faceLength: 0.84, jawAngle: 1.08, chinPoint: -0.12, browY: -0.3, eyeSpacing: 0.42, mouthWidth: 0.72, earY: 0.03, asymmetry: 0.035 },
  });

  function faceLandmarks(art) {
    const specific = FACE_LANDMARKS[art.archetype] || FACE_LANDMARKS["cavalry-lance"];
    return { ...SKULL_BASES[specific.base], ...specific };
  }

  /*
   * Feature construction deliberately differs from the skull silhouette.
   * Six families keep the nose bridge, alar plane, philtrum and mouth from
   * collapsing into the same rounded-triangle puppet face.
   */
  const FACE_FEATURE_FAMILIES = Object.freeze({
    "regal-aquiline": {
      bridgeLean: 0.15, bridgeBow: 0.08, bridgeLength: 0.42, tipProjection: 0.47,
      alarWidth: 0.24, alarDrop: 0.035, philtrumLength: 0.12,
      upperBow: 0.055, lowerFullness: 0.025, cornerTension: -0.025, moustacheSpread: 0.82,
    },
    "scholar-hooked": {
      bridgeLean: 0.08, bridgeBow: -0.045, bridgeLength: 0.46, tipProjection: 0.34,
      alarWidth: 0.14, alarDrop: 0.065, philtrumLength: 0.17,
      upperBow: 0.025, lowerFullness: -0.018, cornerTension: 0.035, moustacheSpread: 0.58,
    },
    "warrior-broad": {
      bridgeLean: 0.2, bridgeBow: 0.115, bridgeLength: 0.36, tipProjection: 0.41,
      alarWidth: 0.34, alarDrop: -0.02, philtrumLength: 0.075,
      upperBow: 0.035, lowerFullness: 0.065, cornerTension: 0.06, moustacheSpread: 1.04,
    },
    "youthful-straight": {
      bridgeLean: 0.06, bridgeBow: 0.018, bridgeLength: 0.39, tipProjection: 0.31,
      alarWidth: 0.13, alarDrop: 0.005, philtrumLength: 0.1,
      upperBow: 0.07, lowerFullness: 0.055, cornerTension: -0.035, moustacheSpread: 0.52,
    },
    "veteran-ridged": {
      bridgeLean: 0.22, bridgeBow: -0.09, bridgeLength: 0.48, tipProjection: 0.44,
      alarWidth: 0.25, alarDrop: 0.08, philtrumLength: 0.14,
      upperBow: 0.02, lowerFullness: 0.01, cornerTension: 0.075, moustacheSpread: 0.9,
    },
    "raider-upturned": {
      bridgeLean: 0.12, bridgeBow: 0.14, bridgeLength: 0.34, tipProjection: 0.39,
      alarWidth: 0.27, alarDrop: -0.07, philtrumLength: 0.065,
      upperBow: 0.045, lowerFullness: 0.045, cornerTension: 0.1, moustacheSpread: 0.72,
    },
  });

  const FACE_FEATURE_FAMILY_BY_ARCHETYPE = Object.freeze({
    "twin-swords-monarch": "regal-aquiline",
    "crescent-blade-long-beard": "veteran-ridged",
    "serpent-spear-wild-beard": "warrior-broad",
    "white-helmet-spear": "youthful-straight",
    "scholar-fan-constellation": "scholar-hooked",
    "elder-archer": "veteran-ridged",
    "silver-lion-cavalier": "youthful-straight",
    "crowned-sword-ruler": "regal-aquiline",
    "black-strategist-raven": "scholar-hooked",
    "eyepatch-shield": "warrior-broad",
    "twin-halberds-giant": "warrior-broad",
    "cavalry-lance": "veteran-ridged",
    "bamboo-scroll-adviser": "scholar-hooked",
    "tiger-maul-guardian": "warrior-broad",
    "river-crown-sword": "regal-aquiline",
    "fire-gold-crown-sword": "youthful-straight",
    "bells-headscarf-raider": "raider-upturned",
    "book-and-sword": "scholar-hooked",
    "elder-fire-ship": "veteran-ridged",
    "female-archer": "youthful-straight",
    "young-fire-tactician": "scholar-hooked",
    "elephant-crown-king": "warrior-broad",
    "fire-dagger-huntress": "raider-upturned",
    "rattan-horn-bulwark": "warrior-broad",
    "bone-mask-beastmaster": "veteran-ridged",
    "horn-bugle-vanguard": "raider-upturned",
    "phoenix-crown-halberd": "raider-upturned",
    "jungle-beast-horned": "warrior-broad",
  });

  const FACE_FEATURE_OVERRIDES = Object.freeze({
    "crowned-sword-ruler": {
      bridgeLean: 0.18, bridgeBow: 0.025, tipProjection: 0.5,
      alarWidth: 0.21, philtrumLength: 0.14, cornerTension: -0.045,
    },
    "black-strategist-raven": {
      bridgeLean: 0.045, bridgeBow: -0.11, tipProjection: 0.3,
      alarWidth: 0.12, philtrumLength: 0.2, upperBow: 0.018,
    },
    "twin-halberds-giant": {
      bridgeLean: 0.24, bridgeBow: 0.16, tipProjection: 0.43,
      alarWidth: 0.39, philtrumLength: 0.055, lowerFullness: 0.085,
      mouthStrokeScale: 0.8, mouthWidthScale: 0.88, mouthYShift: -0.018,
      outlineScale: 0.82,
    },
    "cavalry-lance": {
      bridgeLean: 0.16, bridgeBow: -0.135, tipProjection: 0.47,
      alarDrop: 0.1, philtrumLength: 0.155, cornerTension: 0.045,
      mouthStrokeScale: 0.83, mouthWidthScale: 0.9, mouthYShift: -0.016,
      outlineScale: 0.84,
    },
    "river-crown-sword": {
      bridgeLean: 0.105, bridgeBow: 0.115, tipProjection: 0.39,
      alarWidth: 0.29, philtrumLength: 0.085, upperBow: 0.082,
    },
    "fire-gold-crown-sword": {
      bridgeLean: 0.025, bridgeBow: -0.015, tipProjection: 0.27,
      alarWidth: 0.11, philtrumLength: 0.11, lowerFullness: 0.07,
    },
    "elder-fire-ship": {
      bridgeLean: 0.25, bridgeBow: -0.12, tipProjection: 0.48,
      alarWidth: 0.31, philtrumLength: 0.12, moustacheSpread: 1.02,
    },
  });

  function facialStructureProfile(art) {
    const family = FACE_FEATURE_FAMILY_BY_ARCHETYPE[art.archetype] || "veteran-ridged";
    return {
      family,
      ...FACE_FEATURE_FAMILIES[family],
      ...(FACE_FEATURE_OVERRIDES[art.archetype] || {}),
    };
  }

  /*
   * art7 individual likeness profiles
   * ---------------------------------
   * Skull families define broad construction; this profile is the final
   * painter's sitting. Every general receives a different brow break, gaze,
   * nose rhythm, mouth tension, weathering and warm/cool skin mixture so two
   * portraits no longer read as the same actor in different helmets.
   */
  const FACE_ART7_PROFILES = Object.freeze({
    "twin-swords-monarch": { browArch: 0.02, browBreak: -0.42, eyeSet: 0.01, eyeWidth: 1.02, gazeX: 0.16, gazeY: -0.03, noseLength: 0.98, noseRidge: 0.03, mouthWidth: 1.04, mouthTilt: -0.025, jawShade: 0.46, roughness: 0.28, scar: "none", wrinkle: "smile", warm: "#e2a078", cool: "#765f62", hairSoftness: 0.56, brushSeed: 11 },
    "crescent-blade-long-beard": { browArch: -0.08, browBreak: 0.34, eyeSet: -0.025, eyeWidth: 0.88, gazeX: 0.29, gazeY: -0.08, noseLength: 1.08, noseRidge: -0.09, mouthWidth: 0.97, mouthTilt: 0.035, jawShade: 0.64, roughness: 0.68, scar: "temple-notch", wrinkle: "honor-lines", warm: "#b65442", cool: "#4b4e54", hairSoftness: 0.3, brushSeed: 23 },
    "serpent-spear-wild-beard": { browArch: -0.2, browBreak: -0.08, eyeSet: 0.055, eyeWidth: 1.18, gazeX: 0.08, gazeY: 0.04, noseLength: 0.93, noseRidge: 0.14, mouthWidth: 1.12, mouthTilt: 0.085, jawShade: 0.82, roughness: 0.92, scar: "cheek-rake", wrinkle: "snarl-fold", warm: "#c57052", cool: "#414a4e", hairSoftness: 0.18, brushSeed: 37 },
    "white-helmet-spear": { browArch: 0.09, browBreak: 0.48, eyeSet: 0.02, eyeWidth: 1.08, gazeX: 0.34, gazeY: -0.02, noseLength: 0.96, noseRidge: -0.03, mouthWidth: 0.92, mouthTilt: -0.015, jawShade: 0.36, roughness: 0.22, scar: "chin-fine", wrinkle: "none", warm: "#e0aa82", cool: "#69808b", hairSoftness: 0.48, brushSeed: 43 },
    "scholar-fan-constellation": { browArch: 0.16, browBreak: -0.21, eyeSet: -0.04, eyeWidth: 0.9, gazeX: 0.23, gazeY: -0.11, noseLength: 1.12, noseRidge: -0.13, mouthWidth: 0.88, mouthTilt: 0.008, jawShade: 0.31, roughness: 0.18, scar: "none", wrinkle: "thought-lines", warm: "#dbab87", cool: "#69738f", hairSoftness: 0.65, brushSeed: 59 },
    "elder-archer": { browArch: -0.05, browBreak: 0.11, eyeSet: -0.015, eyeWidth: 0.76, gazeX: 0.42, gazeY: -0.045, noseLength: 1.16, noseRidge: 0.11, mouthWidth: 0.95, mouthTilt: 0.052, jawShade: 0.61, roughness: 0.82, scar: "nose-nick", wrinkle: "sun-fan", warm: "#cf9469", cool: "#69685e", hairSoftness: 0.72, brushSeed: 67 },
    "crowned-sword-ruler": { browArch: -0.13, browBreak: 0.41, eyeSet: 0.025, eyeWidth: 0.98, gazeX: 0.12, gazeY: -0.07, noseLength: 1.03, noseRidge: 0.08, mouthWidth: 1.08, mouthTilt: -0.052, jawShade: 0.7, roughness: 0.54, scar: "brow-cut", wrinkle: "command-fold", warm: "#d18a5f", cool: "#4c607b", hairSoftness: 0.26, brushSeed: 71 },
    "black-strategist-raven": { browArch: 0.2, browBreak: -0.33, eyeSet: -0.055, eyeWidth: 0.78, gazeX: 0.46, gazeY: 0.015, noseLength: 1.18, noseRidge: -0.17, mouthWidth: 0.81, mouthTilt: 0.068, jawShade: 0.43, roughness: 0.34, scar: "none", wrinkle: "under-eye", warm: "#c49178", cool: "#4d5873", hairSoftness: 0.74, brushSeed: 83 },
    "eyepatch-shield": { browArch: -0.24, browBreak: 0.18, eyeSet: 0.075, eyeWidth: 1.06, gazeX: 0.31, gazeY: 0.06, noseLength: 1.06, noseRidge: 0.16, mouthWidth: 1.13, mouthTilt: 0.12, jawShade: 0.84, roughness: 0.86, scar: "eye-cross", wrinkle: "pain-knot", warm: "#c77b5c", cool: "#485d6a", hairSoftness: 0.22, brushSeed: 97 },
    "twin-halberds-giant": { browArch: -0.31, browBreak: -0.15, eyeSet: 0.09, eyeWidth: 1.24, gazeX: 0.02, gazeY: 0.085, noseLength: 0.9, noseRidge: 0.2, mouthWidth: 1.18, mouthTilt: -0.11, jawShade: 0.94, roughness: 1, scar: "jaw-gouge", wrinkle: "bull-fold", warm: "#b76849", cool: "#454648", hairSoftness: 0.12, brushSeed: 101 },
    "cavalry-lance": { browArch: -0.02, browBreak: 0.27, eyeSet: 0.015, eyeWidth: 1.04, gazeX: 0.38, gazeY: -0.055, noseLength: 1.1, noseRidge: -0.06, mouthWidth: 0.9, mouthTilt: -0.042, jawShade: 0.5, roughness: 0.46, scar: "lip-split", wrinkle: "wind-line", warm: "#cc8f68", cool: "#52718a", hairSoftness: 0.35, brushSeed: 109 },
    "bamboo-scroll-adviser": { browArch: 0.24, browBreak: -0.5, eyeSet: -0.07, eyeWidth: 0.72, gazeX: 0.19, gazeY: 0.075, noseLength: 1.14, noseRidge: -0.2, mouthWidth: 0.84, mouthTilt: 0.09, jawShade: 0.28, roughness: 0.14, scar: "none", wrinkle: "ink-eye", warm: "#dfb698", cool: "#737f91", hairSoftness: 0.8, brushSeed: 127 },
    "river-crown-sword": { browArch: 0.055, browBreak: 0.06, eyeSet: 0.035, eyeWidth: 1, gazeX: 0.26, gazeY: -0.015, noseLength: 0.97, noseRidge: 0.06, mouthWidth: 1.01, mouthTilt: 0.018, jawShade: 0.56, roughness: 0.4, scar: "neck-fine", wrinkle: "river-calm", warm: "#cc8c68", cool: "#6e5360", hairSoftness: 0.42, brushSeed: 131 },
    "fire-gold-crown-sword": { browArch: 0.12, browBreak: -0.12, eyeSet: -0.005, eyeWidth: 0.96, gazeX: 0.4, gazeY: -0.09, noseLength: 0.94, noseRidge: -0.01, mouthWidth: 0.89, mouthTilt: -0.095, jawShade: 0.34, roughness: 0.2, scar: "none", wrinkle: "pride-fold", warm: "#e09d73", cool: "#814b55", hairSoftness: 0.52, brushSeed: 149 },
    "bells-headscarf-raider": { browArch: -0.17, browBreak: 0.52, eyeSet: 0.065, eyeWidth: 1.14, gazeX: 0.21, gazeY: 0.045, noseLength: 0.91, noseRidge: 0.18, mouthWidth: 1.15, mouthTilt: 0.14, jawShade: 0.76, roughness: 0.78, scar: "nose-slash", wrinkle: "laugh-cut", warm: "#c17655", cool: "#465a72", hairSoftness: 0.16, brushSeed: 157 },
    "book-and-sword": { browArch: 0.135, browBreak: -0.29, eyeSet: -0.03, eyeWidth: 0.86, gazeX: 0.33, gazeY: -0.025, noseLength: 1.04, noseRidge: -0.11, mouthWidth: 0.93, mouthTilt: 0.028, jawShade: 0.4, roughness: 0.3, scar: "none", wrinkle: "measured-line", warm: "#d09b78", cool: "#745e72", hairSoftness: 0.68, brushSeed: 163 },
    "elder-fire-ship": { browArch: -0.1, browBreak: 0.23, eyeSet: 0.045, eyeWidth: 0.82, gazeX: 0.14, gazeY: -0.035, noseLength: 1.2, noseRidge: 0.13, mouthWidth: 1.16, mouthTilt: 0.062, jawShade: 0.88, roughness: 0.96, scar: "forehead-burn", wrinkle: "fire-map", warm: "#c8744e", cool: "#654d4d", hairSoftness: 0.7, brushSeed: 179 },
    "female-archer": { browArch: 0.28, browBreak: -0.04, eyeSet: -0.02, eyeWidth: 1.12, gazeX: 0.48, gazeY: -0.04, noseLength: 0.92, noseRidge: -0.05, mouthWidth: 0.86, mouthTilt: -0.032, jawShade: 0.24, roughness: 0.1, scar: "wrist-line", wrinkle: "none", warm: "#e2ad8d", cool: "#846879", hairSoftness: 0.9, brushSeed: 191 },
    "phoenix-crown-halberd": { browArch: -0.27, browBreak: 0.46, eyeSet: 0.08, eyeWidth: 1.1, gazeX: 0.07, gazeY: 0.02, noseLength: 1.01, noseRidge: 0.1, mouthWidth: 1.1, mouthTilt: -0.18, jawShade: 0.8, roughness: 0.62, scar: "temple-hook", wrinkle: "arrogance-cut", warm: "#d17e58", cool: "#673f4a", hairSoftness: 0.2, brushSeed: 211 },
    "silver-lion-cavalier": { browArch: -0.04, browBreak: 0.31, eyeSet: 0.02, eyeWidth: 1.08, gazeX: 0.43, gazeY: -0.07, noseLength: 1.05, noseRidge: -0.08, mouthWidth: 0.91, mouthTilt: -0.08, jawShade: 0.48, roughness: 0.38, scar: "cheek-wind", wrinkle: "dust-line", warm: "#d29a70", cool: "#708496", hairSoftness: 0.34, brushSeed: 223 },
    "tiger-maul-guardian": { browArch: -0.34, browBreak: 0.12, eyeSet: 0.1, eyeWidth: 1.27, gazeX: 0.04, gazeY: 0.07, noseLength: 0.88, noseRidge: 0.22, mouthWidth: 1.2, mouthTilt: -0.13, jawShade: 0.96, roughness: 0.94, scar: "brow-gouge", wrinkle: "tiger-fold", warm: "#b76f4c", cool: "#525962", hairSoftness: 0.12, brushSeed: 227 },
    "young-fire-tactician": { browArch: 0.18, browBreak: -0.24, eyeSet: -0.04, eyeWidth: 0.91, gazeX: 0.36, gazeY: -0.08, noseLength: 1.08, noseRidge: -0.14, mouthWidth: 0.86, mouthTilt: -0.03, jawShade: 0.3, roughness: 0.16, scar: "none", wrinkle: "calculation-line", warm: "#dda47e", cool: "#526b78", hairSoftness: 0.72, brushSeed: 229 },
    "elephant-crown-king": { browArch: -0.25, browBreak: 0.38, eyeSet: 0.08, eyeWidth: 1.18, gazeX: 0.11, gazeY: 0.04, noseLength: 0.94, noseRidge: 0.19, mouthWidth: 1.22, mouthTilt: 0.16, jawShade: 0.88, roughness: 0.86, scar: "jaw-notch", wrinkle: "laugh-fold", warm: "#a96343", cool: "#53603a", hairSoftness: 0.2, brushSeed: 233 },
    "fire-dagger-huntress": { browArch: 0.25, browBreak: 0.11, eyeSet: -0.01, eyeWidth: 1.16, gazeX: 0.51, gazeY: -0.06, noseLength: 0.9, noseRidge: 0.04, mouthWidth: 0.88, mouthTilt: 0.12, jawShade: 0.27, roughness: 0.2, scar: "temple-spark", wrinkle: "none", warm: "#dc976c", cool: "#8e4f4a", hairSoftness: 0.84, brushSeed: 239 },
    "rattan-horn-bulwark": { browArch: -0.39, browBreak: -0.08, eyeSet: 0.12, eyeWidth: 1.3, gazeX: 0.02, gazeY: 0.11, noseLength: 0.86, noseRidge: 0.25, mouthWidth: 1.19, mouthTilt: -0.16, jawShade: 1, roughness: 1, scar: "mask-rub", wrinkle: "stone-fold", warm: "#986141", cool: "#445534", hairSoftness: 0.08, brushSeed: 241 },
    "bone-mask-beastmaster": { browArch: 0.09, browBreak: -0.51, eyeSet: -0.06, eyeWidth: 0.76, gazeX: 0.48, gazeY: 0.03, noseLength: 1.16, noseRidge: -0.2, mouthWidth: 0.83, mouthTilt: 0.18, jawShade: 0.56, roughness: 0.67, scar: "mask-shadow", wrinkle: "jungle-line", warm: "#bc7c56", cool: "#4d694d", hairSoftness: 0.5, brushSeed: 251 },
    "horn-bugle-vanguard": { browArch: -0.12, browBreak: 0.55, eyeSet: 0.06, eyeWidth: 1.12, gazeX: 0.3, gazeY: -0.01, noseLength: 0.92, noseRidge: 0.14, mouthWidth: 1.17, mouthTilt: 0.21, jawShade: 0.7, roughness: 0.7, scar: "lip-scar", wrinkle: "shout-line", warm: "#c27c55", cool: "#685c3d", hairSoftness: 0.22, brushSeed: 257 },
    "jungle-beast-horned": { browArch: -0.46, browBreak: 0.22, eyeSet: 0.16, eyeWidth: 1.34, gazeX: 0.05, gazeY: 0.13, noseLength: 0.76, noseRidge: 0.31, mouthWidth: 1.28, mouthTilt: -0.22, jawShade: 1, roughness: 1, scar: "muzzle-slash", wrinkle: "beast-ridge", warm: "#8d6042", cool: "#3f5736", hairSoftness: 0.18, brushSeed: 263 },
  });

  function faceArt7Profile(artOrArchetype) {
    const requested = typeof artOrArchetype === "string"
      ? artOrArchetype
      : artOrArchetype && artOrArchetype.archetype;
    const archetype = FACE_ART7_PROFILES[requested]
      ? requested
      : PORTRAIT_ARCHETYPES[requested] && PORTRAIT_ARCHETYPES[requested].archetype;
    return FACE_ART7_PROFILES[archetype] || FACE_ART7_PROFILES["cavalry-lance"];
  }

  function art7BrushBudget(artOrArchetype, compact) {
    const profile = faceArt7Profile(artOrArchetype);
    return compact ? 7 : Math.round(18 + profile.roughness * 12);
  }

  const WEI_PORTRAIT_ARCHETYPES = new Set([
    "crowned-sword-ruler",
    "black-strategist-raven",
    "eyepatch-shield",
    "twin-halberds-giant",
    "cavalry-lance",
    "bamboo-scroll-adviser",
    "tiger-maul-guardian",
  ]);

  /*
   * Portrait painting pass
   * ----------------------
   * These values deliberately vary the camera and gesture instead of merely
   * recolouring one frontal bust.  `yaw` compresses the far half of the face,
   * `headX` moves the silhouette away from the weapon, and `lean` changes the
   * shoulder/head axis.  The data is kept local to board-ui so the gallery and
   * live board use the exact same procedural art.
   */
  const PORTRAIT_PAINT_PROFILES = Object.freeze({
    "twin-swords-monarch": { yaw: 0.42, headX: 0.48, headY: 0.37, lean: -0.025, scale: 0.98, expression: "gentle", accent: "#f0cf69", keyAngle: -0.72, keyTemp: "#ffd99c", keyStrength: 0.82, rimColor: "#8ee3ae", bounceColor: "#285f48" },
    "crescent-blade-long-beard": { yaw: 0.7, headX: 0.43, headY: 0.34, lean: 0.04, scale: 1.08, expression: "noble", accent: "#78a85c", keyAngle: -2.42, keyTemp: "#ffcf95", keyStrength: 0.92, rimColor: "#8fca75", bounceColor: "#234a34" },
    "serpent-spear-wild-beard": { yaw: 0.34, headX: 0.56, headY: 0.36, lean: -0.075, scale: 1.12, expression: "fury", accent: "#a94d32", keyAngle: -0.48, keyTemp: "#ffc078", keyStrength: 0.96, rimColor: "#b77a58", bounceColor: "#313538" },
    "white-helmet-spear": { yaw: 0.76, headX: 0.4, headY: 0.36, lean: 0.055, scale: 0.95, expression: "focus", accent: "#e8e8d8", keyAngle: -2.18, keyTemp: "#fff0c7", keyStrength: 0.88, rimColor: "#b7e7df", bounceColor: "#466675" },
    "scholar-fan-constellation": { yaw: 0.56, headX: 0.43, headY: 0.37, lean: -0.015, scale: 0.92, expression: "calm", accent: "#ddd8c5", keyAngle: -1.58, keyTemp: "#d8e6ff", keyStrength: 0.72, rimColor: "#9dc9bd", bounceColor: "#4b536a" },
    "elder-archer": { yaw: 0.72, headX: 0.4, headY: 0.35, lean: 0.07, scale: 1.01, expression: "squint", accent: "#d7d0ba", keyAngle: -2.62, keyTemp: "#ffe2aa", keyStrength: 0.86, rimColor: "#b9c59f", bounceColor: "#5c4932" },
    "crowned-sword-ruler": { yaw: 0.62, headX: 0.45, headY: 0.35, lean: -0.035, scale: 1.02, expression: "command", accent: "#d6b553", keyAngle: -0.56, keyTemp: "#ffc36f", keyStrength: 0.98, rimColor: "#96b9ef", bounceColor: "#273b5c" },
    "black-strategist-raven": { yaw: 0.8, headX: 0.39, headY: 0.37, lean: 0.035, scale: 0.94, expression: "cold", accent: "#8693a9", keyAngle: -2.7, keyTemp: "#c9d9ef", keyStrength: 0.68, rimColor: "#819bc2", bounceColor: "#20253a" },
    "eyepatch-shield": { yaw: 0.52, headX: 0.42, headY: 0.37, lean: -0.08, scale: 1.12, expression: "scarred", accent: "#9eb0c1", keyAngle: -0.84, keyTemp: "#e3e8e6", keyStrength: 0.9, rimColor: "#8fb5d0", bounceColor: "#2c465a" },
    "twin-halberds-giant": { yaw: 0.3, headX: 0.55, headY: 0.37, lean: 0.08, scale: 1.18, expression: "glare", accent: "#81766d", keyAngle: -0.36, keyTemp: "#ffcc8a", keyStrength: 1, rimColor: "#9dabb4", bounceColor: "#292725" },
    "cavalry-lance": { yaw: 0.74, headX: 0.41, headY: 0.35, lean: -0.09, scale: 0.97, expression: "charge", accent: "#75b7e2", keyAngle: -2.3, keyTemp: "#e5f0ff", keyStrength: 0.94, rimColor: "#9ccff5", bounceColor: "#294e70" },
    "bamboo-scroll-adviser": { yaw: 0.66, headX: 0.4, headY: 0.39, lean: 0.025, scale: 0.9, expression: "tired", accent: "#e4c26f", keyAngle: -1.94, keyTemp: "#f8dfaa", keyStrength: 0.7, rimColor: "#aebdd4", bounceColor: "#536275" },
    "river-crown-sword": { yaw: 0.46, headX: 0.47, headY: 0.36, lean: -0.02, scale: 0.99, expression: "steady", accent: "#d1a94d", keyAngle: -0.64, keyTemp: "#ffd590", keyStrength: 0.9, rimColor: "#e89275", bounceColor: "#5e3031" },
    "fire-gold-crown-sword": { yaw: 0.77, headX: 0.39, headY: 0.35, lean: 0.06, scale: 0.94, expression: "proud", accent: "#efbd4e", keyAngle: -2.5, keyTemp: "#ffad65", keyStrength: 1, rimColor: "#ff7d51", bounceColor: "#6f2926" },
    "bells-headscarf-raider": { yaw: 0.58, headX: 0.47, headY: 0.37, lean: -0.1, scale: 1.03, expression: "raider", accent: "#d9a839", keyAngle: -0.34, keyTemp: "#d5e6ff", keyStrength: 0.84, rimColor: "#7da9d5", bounceColor: "#263d63" },
    "book-and-sword": { yaw: 0.69, headX: 0.4, headY: 0.37, lean: 0.03, scale: 0.95, expression: "measured", accent: "#d6c7ad", keyAngle: -2.12, keyTemp: "#f4dcb1", keyStrength: 0.76, rimColor: "#cf8a86", bounceColor: "#62343b" },
    "elder-fire-ship": { yaw: 0.43, headX: 0.49, headY: 0.36, lean: -0.06, scale: 1.1, expression: "resolve", accent: "#db7342", keyAngle: -0.48, keyTemp: "#ff9f59", keyStrength: 1, rimColor: "#ff7441", bounceColor: "#672d28" },
    "female-archer": { yaw: 0.82, headX: 0.37, headY: 0.37, lean: 0.075, scale: 0.91, expression: "aim", accent: "#e6a5ba", keyAngle: -2.38, keyTemp: "#ffd9d9", keyStrength: 0.86, rimColor: "#f2b4c5", bounceColor: "#6a3a4d" },
    "phoenix-crown-halberd": { yaw: 0.71, headX: 0.42, headY: 0.34, lean: -0.095, scale: 1.06, expression: "arrogant", accent: "#e14835", keyAngle: -0.28, keyTemp: "#ffb35f", keyStrength: 1, rimColor: "#ff6045", bounceColor: "#5d2223" },
    "silver-lion-cavalier": { yaw: 0.79, headX: 0.39, headY: 0.34, lean: -0.12, scale: 1, expression: "piercing", accent: "#dcecf3", keyAngle: -2.35, keyTemp: "#fff1ce", keyStrength: 0.96, rimColor: "#bcecff", bounceColor: "#506e87" },
    "tiger-maul-guardian": { yaw: 0.28, headX: 0.56, headY: 0.37, lean: 0.12, scale: 1.2, expression: "unyielding", accent: "#d49548", keyAngle: -0.31, keyTemp: "#ffc66f", keyStrength: 1, rimColor: "#9eb3c5", bounceColor: "#343d48" },
    "young-fire-tactician": { yaw: 0.73, headX: 0.4, headY: 0.36, lean: -0.045, scale: 0.93, expression: "calculating", accent: "#ed9b4c", keyAngle: -2.12, keyTemp: "#ffc476", keyStrength: 0.92, rimColor: "#ff9a5f", bounceColor: "#315b63" },
    "elephant-crown-king": { yaw: 0.38, headX: 0.53, headY: 0.35, lean: 0.09, scale: 1.14, expression: "laughing-king", accent: "#d7a43b", keyAngle: -0.42, keyTemp: "#ffad63", keyStrength: 1, rimColor: "#d6d06d", bounceColor: "#35482e" },
    "fire-dagger-huntress": { yaw: 0.84, headX: 0.36, headY: 0.36, lean: -0.13, scale: 0.92, expression: "confident", accent: "#ffcf55", keyAngle: -2.44, keyTemp: "#ff9d55", keyStrength: 1, rimColor: "#ffd66b", bounceColor: "#79392f" },
    "rattan-horn-bulwark": { yaw: 0.22, headX: 0.55, headY: 0.38, lean: 0.04, scale: 1.22, expression: "masked", accent: "#b78a42", keyAngle: -0.25, keyTemp: "#d4dc8b", keyStrength: 0.85, rimColor: "#c9ff65", bounceColor: "#314529" },
    "bone-mask-beastmaster": { yaw: 0.68, headX: 0.4, headY: 0.38, lean: -0.065, scale: 0.98, expression: "mischief", accent: "#8ef06a", keyAngle: -2.66, keyTemp: "#d4c47a", keyStrength: 0.72, rimColor: "#83e377", bounceColor: "#294b35" },
    "horn-bugle-vanguard": { yaw: 0.55, headX: 0.48, headY: 0.37, lean: 0.13, scale: 1.03, expression: "rallying", accent: "#ffd45e", keyAngle: -0.52, keyTemp: "#ffc061", keyStrength: 0.94, rimColor: "#e69b52", bounceColor: "#574326" },
    "jungle-beast-horned": { yaw: 0.31, headX: 0.54, headY: 0.42, lean: -0.16, scale: 1.24, expression: "snarl", accent: "#e1a447", keyAngle: -0.38, keyTemp: "#f4b85d", keyStrength: 0.91, rimColor: "#a6e36a", bounceColor: "#2b452e" },
  });

  function portraitPaintProfile(art) {
    return PORTRAIT_PAINT_PROFILES[art.archetype] || PORTRAIT_PAINT_PROFILES["cavalry-lance"];
  }

  /*
   * A second, deliberately more theatrical composition profile separates the
   * nineteen busts at silhouette distance.  It controls camera crop, diagonal
   * torso axis and the foreground weapon independently from facial yaw.
   */
  const PORTRAIT_ACTION_PROFILES = Object.freeze({
    "twin-swords-monarch": { camera: 1.1, headDX: -0.015, headDY: -0.018, torsoAngle: -0.085, shoulderSlope: -0.12, weaponAngle: -0.22, weaponScale: 1.13, weaponShiftX: -0.018, weaponShiftY: 0.02, signature: "crossed-blades", grip: [{ x: 0.245, y: 0.64, side: -1 }, { x: 0.755, y: 0.64, side: 1 }] },
    "crescent-blade-long-beard": { camera: 1.14, headDX: 0.012, headDY: -0.025, torsoAngle: 0.115, shoulderSlope: 0.16, weaponAngle: -0.34, weaponScale: 1.19, weaponShiftX: 0.035, weaponShiftY: 0.01, signature: "moon-blade", grip: [{ x: 0.8, y: 0.62, side: 1 }, { x: 0.82, y: 0.79, side: -1 }] },
    "serpent-spear-wild-beard": { camera: 1.17, headDX: -0.018, headDY: 0.008, torsoAngle: -0.145, shoulderSlope: -0.2, weaponAngle: 0.27, weaponScale: 1.2, weaponShiftX: 0.018, weaponShiftY: 0.02, signature: "serpent-spear", grip: [{ x: 0.79, y: 0.58, side: 1 }, { x: 0.81, y: 0.76, side: -1 }] },
    "white-helmet-spear": { camera: 1.08, headDX: -0.01, headDY: -0.03, torsoAngle: 0.13, shoulderSlope: 0.17, weaponAngle: -0.29, weaponScale: 1.16, weaponShiftX: 0.025, weaponShiftY: -0.015, signature: "silver-spear", grip: [{ x: 0.78, y: 0.57, side: 1 }, { x: 0.8, y: 0.74, side: -1 }] },
    "scholar-fan-constellation": { camera: 1.09, headDX: 0.014, headDY: -0.022, torsoAngle: -0.06, shoulderSlope: -0.08, weaponAngle: 0.18, weaponScale: 1.14, weaponShiftX: -0.012, weaponShiftY: -0.025, signature: "star-fan", grip: [{ x: 0.76, y: 0.78, side: 1, kind: "delicate" }] },
    "elder-archer": { camera: 1.12, headDX: 0.006, headDY: -0.02, torsoAngle: 0.15, shoulderSlope: 0.18, weaponAngle: -0.19, weaponScale: 1.17, weaponShiftX: 0.015, weaponShiftY: 0.012, signature: "full-draw-bow", grip: [{ x: 0.77, y: 0.54, side: 1 }, { x: 0.58, y: 0.54, side: -1, kind: "pinch" }] },
    "crowned-sword-ruler": { camera: 1.15, headDX: -0.008, headDY: -0.028, torsoAngle: -0.105, shoulderSlope: -0.15, weaponAngle: 0.24, weaponScale: 1.18, weaponShiftX: 0.028, weaponShiftY: -0.02, signature: "command-sword", grip: [{ x: 0.8, y: 0.61, side: 1 }, { x: 0.81, y: 0.77, side: -1 }] },
    "black-strategist-raven": { camera: 1.11, headDX: 0.018, headDY: -0.012, torsoAngle: 0.09, shoulderSlope: 0.12, weaponAngle: -0.17, weaponScale: 1.13, weaponShiftX: -0.025, weaponShiftY: -0.02, signature: "raven-fan", grip: [{ x: 0.76, y: 0.78, side: 1, kind: "delicate" }] },
    "eyepatch-shield": { camera: 1.18, headDX: 0.014, headDY: -0.005, torsoAngle: -0.16, shoulderSlope: -0.22, weaponAngle: 0.11, weaponScale: 1.2, weaponShiftX: 0.018, weaponShiftY: 0.015, signature: "iron-shield", grip: [{ x: 0.65, y: 0.64, side: -1, kind: "rim" }] },
    "twin-halberds-giant": { camera: 1.11, headDX: -0.012, headDY: 0.012, torsoAngle: 0.17, shoulderSlope: 0.24, weaponAngle: -0.14, weaponScale: 1.22, weaponShiftX: 0, weaponShiftY: 0.025, signature: "twin-halberds", grip: [{ x: 0.18, y: 0.62, side: -1 }, { x: 0.82, y: 0.62, side: 1 }] },
    "cavalry-lance": { camera: 1.1, headDX: 0.01, headDY: -0.03, torsoAngle: -0.155, shoulderSlope: -0.19, weaponAngle: 0.31, weaponScale: 1.2, weaponShiftX: 0.035, weaponShiftY: -0.02, signature: "charge-lance", grip: [{ x: 0.78, y: 0.58, side: 1 }, { x: 0.8, y: 0.76, side: -1 }] },
    "bamboo-scroll-adviser": { camera: 1.08, headDX: 0.015, headDY: -0.008, torsoAngle: 0.055, shoulderSlope: 0.07, weaponAngle: -0.09, weaponScale: 1.11, weaponShiftX: -0.018, weaponShiftY: -0.02, signature: "open-scroll", grip: [{ x: 0.62, y: 0.7, side: -1, kind: "pinch" }, { x: 0.92, y: 0.7, side: 1, kind: "pinch" }] },
    "river-crown-sword": { camera: 1.12, headDX: -0.012, headDY: -0.022, torsoAngle: -0.075, shoulderSlope: -0.1, weaponAngle: 0.2, weaponScale: 1.16, weaponShiftX: 0.02, weaponShiftY: -0.01, signature: "river-sword", grip: [{ x: 0.8, y: 0.61, side: 1 }, { x: 0.81, y: 0.77, side: -1 }] },
    "fire-gold-crown-sword": { camera: 1.13, headDX: 0.018, headDY: -0.028, torsoAngle: 0.14, shoulderSlope: 0.19, weaponAngle: -0.26, weaponScale: 1.18, weaponShiftX: 0.025, weaponShiftY: -0.025, signature: "flame-sword", grip: [{ x: 0.8, y: 0.59, side: 1 }, { x: 0.81, y: 0.76, side: -1 }] },
    "bells-headscarf-raider": { camera: 1.16, headDX: -0.016, headDY: 0.002, torsoAngle: -0.175, shoulderSlope: -0.23, weaponAngle: 0.16, weaponScale: 1.21, weaponShiftX: 0.03, weaponShiftY: 0.008, signature: "bells-blade", grip: [{ x: 0.8, y: 0.61, side: 1 }, { x: 0.81, y: 0.77, side: -1 }] },
    "book-and-sword": { camera: 1.09, headDX: 0.012, headDY: -0.015, torsoAngle: 0.075, shoulderSlope: 0.1, weaponAngle: -0.12, weaponScale: 1.14, weaponShiftX: -0.015, weaponShiftY: -0.018, signature: "book-sword", grip: [{ x: 0.8, y: 0.61, side: 1 }, { x: 0.66, y: 0.72, side: -1, kind: "pinch" }] },
    "elder-fire-ship": { camera: 1.11, headDX: -0.01, headDY: 0.004, torsoAngle: -0.125, shoulderSlope: -0.17, weaponAngle: 0.28, weaponScale: 1.2, weaponShiftX: 0.02, weaponShiftY: 0.015, signature: "fire-club", grip: [{ x: 0.8, y: 0.61, side: 1 }, { x: 0.81, y: 0.77, side: -1 }] },
    "female-archer": { camera: 1.09, headDX: 0.022, headDY: -0.025, torsoAngle: 0.16, shoulderSlope: 0.21, weaponAngle: -0.31, weaponScale: 1.18, weaponShiftX: 0.025, weaponShiftY: -0.015, signature: "plum-bow", grip: [{ x: 0.77, y: 0.54, side: 1, kind: "delicate" }, { x: 0.58, y: 0.54, side: -1, kind: "pinch" }] },
    "phoenix-crown-halberd": { camera: 1.18, headDX: -0.018, headDY: -0.035, torsoAngle: -0.19, shoulderSlope: -0.25, weaponAngle: 0.35, weaponScale: 1.23, weaponShiftX: 0.04, weaponShiftY: -0.02, signature: "fangtian-halberd", grip: [{ x: 0.81, y: 0.57, side: 1 }, { x: 0.81, y: 0.76, side: -1 }] },
    "silver-lion-cavalier": { camera: 1.17, headDX: -0.021, headDY: -0.032, torsoAngle: -0.18, shoulderSlope: -0.22, weaponAngle: 0.38, weaponScale: 1.24, weaponShiftX: 0.042, weaponShiftY: -0.025, signature: "tiger-gold-spear", grip: [{ x: 0.8, y: 0.55, side: 1 }, { x: 0.81, y: 0.73, side: -1 }] },
    "tiger-maul-guardian": { camera: 1.2, headDX: -0.014, headDY: 0.014, torsoAngle: 0.19, shoulderSlope: 0.26, weaponAngle: -0.18, weaponScale: 1.26, weaponShiftX: -0.018, weaponShiftY: 0.035, signature: "iron-maul", grip: [{ x: 0.2, y: 0.59, side: -1 }, { x: 0.78, y: 0.72, side: 1 }] },
    "young-fire-tactician": { camera: 1.1, headDX: 0.018, headDY: -0.025, torsoAngle: -0.08, shoulderSlope: -0.11, weaponAngle: 0.16, weaponScale: 1.14, weaponShiftX: 0.012, weaponShiftY: -0.03, signature: "map-sword", grip: [{ x: 0.79, y: 0.62, side: 1 }, { x: 0.58, y: 0.72, side: -1, kind: "pinch" }] },
    "elephant-crown-king": { camera: 1.18, headDX: -0.016, headDY: -0.01, torsoAngle: 0.14, shoulderSlope: 0.2, weaponAngle: -0.25, weaponScale: 1.22, weaponShiftX: -0.025, weaponShiftY: 0.02, signature: "beast-king-blade", grip: [{ x: 0.22, y: 0.58, side: -1 }, { x: 0.76, y: 0.76, side: 1 }] },
    "fire-dagger-huntress": { camera: 1.14, headDX: 0.024, headDY: -0.026, torsoAngle: -0.2, shoulderSlope: -0.24, weaponAngle: 0.28, weaponScale: 1.19, weaponShiftX: 0.035, weaponShiftY: -0.018, signature: "twin-fire-daggers", grip: [{ x: 0.2, y: 0.56, side: -1, kind: "delicate" }, { x: 0.8, y: 0.55, side: 1, kind: "delicate" }] },
    "rattan-horn-bulwark": { camera: 1.22, headDX: -0.01, headDY: 0.018, torsoAngle: 0.055, shoulderSlope: 0.08, weaponAngle: -0.08, weaponScale: 1.27, weaponShiftX: 0.01, weaponShiftY: 0.04, signature: "rattan-bulwark-club", grip: [{ x: 0.19, y: 0.64, side: -1, kind: "rim" }, { x: 0.79, y: 0.7, side: 1 }] },
    "bone-mask-beastmaster": { camera: 1.12, headDX: 0.02, headDY: -0.01, torsoAngle: -0.1, shoulderSlope: -0.13, weaponAngle: 0.12, weaponScale: 1.16, weaponShiftX: -0.02, weaponShiftY: -0.02, signature: "beast-flute", grip: [{ x: 0.61, y: 0.55, side: -1, kind: "delicate" }, { x: 0.83, y: 0.55, side: 1, kind: "delicate" }] },
    "horn-bugle-vanguard": { camera: 1.15, headDX: -0.018, headDY: 0.002, torsoAngle: 0.18, shoulderSlope: 0.22, weaponAngle: -0.32, weaponScale: 1.2, weaponShiftX: -0.03, weaponShiftY: 0.01, signature: "herald-spear", grip: [{ x: 0.21, y: 0.57, side: -1 }, { x: 0.78, y: 0.74, side: 1 }] },
    "jungle-beast-horned": { camera: 1.24, headDX: -0.025, headDY: 0.025, torsoAngle: -0.23, shoulderSlope: -0.27, weaponAngle: 0.06, weaponScale: 1.28, weaponShiftX: 0.03, weaponShiftY: 0.04, signature: "fang-claw-pounce", grip: [{ x: 0.2, y: 0.61, side: -1 }, { x: 0.8, y: 0.59, side: 1 }] },
  });

  function portraitActionProfile(art) {
    return PORTRAIT_ACTION_PROFILES[art.archetype] || PORTRAIT_ACTION_PROFILES["cavalry-lance"];
  }

  const ART8_FIGURE_PROFILE_OVERRIDES = Object.freeze({
    "silver-lion-cavalier": Object.freeze({ shoulderBreadth: 0.98, ribcageDepth: 1.04, waistTaper: 0.73, nearElbowT: 0.38, farElbowT: 0.61, nearElbowBend: 0.16, farElbowBend: 0.08, nearPalmDepth: 0.94, farPalmDepth: 0.68, gripPitch: 0.11, fingerCurl: 0.86, faceOrbitDepth: 0.79, cheekProjection: 0.74 }),
    "tiger-maul-guardian": Object.freeze({ shoulderBreadth: 1.22, ribcageDepth: 1.24, waistTaper: 0.88, nearElbowT: 0.59, farElbowT: 0.39, nearElbowBend: 0.19, farElbowBend: 0.14, nearPalmDepth: 0.96, farPalmDepth: 0.81, gripPitch: -0.08, fingerCurl: 0.94, faceOrbitDepth: 0.9, cheekProjection: 0.94 }),
    "young-fire-tactician": Object.freeze({ shoulderBreadth: 0.86, ribcageDepth: 0.83, waistTaper: 0.68, nearElbowT: 0.44, farElbowT: 0.57, nearElbowBend: 0.08, farElbowBend: 0.12, nearPalmDepth: 0.71, farPalmDepth: 0.61, gripPitch: 0.04, fingerCurl: 0.61, faceOrbitDepth: 0.63, cheekProjection: 0.66 }),
    "elephant-crown-king": Object.freeze({ shoulderBreadth: 1.16, ribcageDepth: 1.18, waistTaper: 0.86, nearElbowT: 0.56, farElbowT: 0.43, nearElbowBend: 0.15, farElbowBend: 0.1, nearPalmDepth: 0.9, farPalmDepth: 0.76, gripPitch: -0.06, fingerCurl: 0.9, faceOrbitDepth: 0.84, cheekProjection: 0.91 }),
    "fire-dagger-huntress": Object.freeze({ shoulderBreadth: 0.9, ribcageDepth: 0.88, waistTaper: 0.67, nearElbowT: 0.36, farElbowT: 0.64, nearElbowBend: 0.2, farElbowBend: 0.15, nearPalmDepth: 0.95, farPalmDepth: 0.72, gripPitch: 0.14, fingerCurl: 0.58, faceOrbitDepth: 0.71, cheekProjection: 0.68 }),
    "rattan-horn-bulwark": Object.freeze({ shoulderBreadth: 1.22, ribcageDepth: 1.24, waistTaper: 0.91, nearElbowT: 0.51, farElbowT: 0.48, nearElbowBend: 0.07, farElbowBend: 0.06, nearPalmDepth: 0.82, farPalmDepth: 0.75, gripPitch: -0.02, fingerCurl: 0.92, faceOrbitDepth: 0.86, cheekProjection: 0.94 }),
    "bone-mask-beastmaster": Object.freeze({ shoulderBreadth: 0.91, ribcageDepth: 0.87, waistTaper: 0.71, nearElbowT: 0.41, farElbowT: 0.59, nearElbowBend: 0.11, farElbowBend: 0.13, nearPalmDepth: 0.74, farPalmDepth: 0.65, gripPitch: 0.03, fingerCurl: 0.54, faceOrbitDepth: 0.76, cheekProjection: 0.72 }),
    "horn-bugle-vanguard": Object.freeze({ shoulderBreadth: 1.02, ribcageDepth: 1.02, waistTaper: 0.76, nearElbowT: 0.6, farElbowT: 0.37, nearElbowBend: 0.18, farElbowBend: 0.09, nearPalmDepth: 0.89, farPalmDepth: 0.7, gripPitch: -0.1, fingerCurl: 0.82, faceOrbitDepth: 0.73, cheekProjection: 0.78 }),
    "jungle-beast-horned": Object.freeze({ shoulderBreadth: 1.2, ribcageDepth: 1.21, waistTaper: 0.9, nearElbowT: 0.34, farElbowT: 0.66, nearElbowBend: 0.2, farElbowBend: 0.16, nearPalmDepth: 0.96, farPalmDepth: 0.84, gripPitch: 0.15, fingerCurl: 0.94, faceOrbitDepth: 0.88, cheekProjection: 0.93 }),
  });

  const ART8_FIGURE_PROFILE_CACHE = new Map();

  function art8FigureProfile(art) {
    const cacheKey = art && art.archetype || "wandering-general";
    const cached = ART8_FIGURE_PROFILE_CACHE.get(cacheKey);
    if (cached) return cached;
    const action = portraitActionProfile(art);
    const hash = hashString(`${art.archetype}|art8-figure`);
    const variation = ((hash >>> 8) & 0xff) / 255 - 0.5;
    const scholar = ["star-fan", "raven-fan", "open-scroll", "book-sword"].includes(action.signature);
    const archer = ["full-draw-bow", "plum-bow"].includes(action.signature);
    const heavy = ["iron-shield", "twin-halberds", "serpent-spear", "fangtian-halberd"].includes(action.signature);
    const profile = Object.freeze({
      shoulderBreadth: clamp(
        (scholar ? 0.88 : archer ? 0.94 : heavy ? 1.12 : 1)
          + (action.camera - 1.1) * 0.7
          + variation * 0.09,
        0.82,
        1.22,
      ),
      ribcageDepth: clamp(
        (heavy ? 1.16 : scholar ? 0.86 : 1)
          + Math.abs(action.torsoAngle) * 0.42
          - variation * 0.06,
        0.8,
        1.24,
      ),
      waistTaper: clamp(
        (scholar ? 0.72 : heavy ? 0.86 : 0.79)
          + variation * 0.08,
        0.66,
        0.92,
      ),
      nearElbowT: clamp(0.47 + action.shoulderSlope * 0.34 + variation * 0.08, 0.34, 0.64),
      farElbowT: clamp(0.53 - action.shoulderSlope * 0.28 - variation * 0.06, 0.36, 0.67),
      nearElbowBend: clamp(
        0.045 + Math.abs(action.weaponAngle) * 0.24 + (archer ? 0.09 : 0) + variation * 0.035,
        0.035,
        0.2,
      ),
      farElbowBend: clamp(
        0.035 + Math.abs(action.torsoAngle) * 0.32 + (action.grip.length > 1 ? 0.045 : 0) - variation * 0.025,
        0.025,
        0.16,
      ),
      nearPalmDepth: clamp(0.72 + Math.abs(action.weaponAngle) * 0.42 + variation * 0.12, 0.62, 0.96),
      farPalmDepth: clamp(0.58 + Math.abs(action.torsoAngle) * 0.5 - variation * 0.1, 0.5, 0.84),
      gripPitch: clamp(action.weaponAngle * 0.24 + action.torsoAngle * 0.18 + variation * 0.12, -0.16, 0.16),
      fingerCurl: clamp(
        0.68 + Math.abs(action.weaponAngle) * 0.46 + (archer ? -0.16 : 0) + variation * 0.1,
        0.5,
        0.94,
      ),
      faceOrbitDepth: clamp(0.58 + Math.abs(action.torsoAngle) * 1.1 + variation * 0.16, 0.48, 0.9),
      cheekProjection: clamp(0.72 + (action.camera - 1.08) * 1.4 - variation * 0.13, 0.62, 0.94),
      ...(ART8_FIGURE_PROFILE_OVERRIDES[art.archetype] || {}),
    });
    ART8_FIGURE_PROFILE_CACHE.set(cacheKey, profile);
    return profile;
  }

  function art8GripTarget(x, y, width, height, cx, pose, action, grip) {
    const weaponPivotX = x + width * 0.7;
    const weaponPivotY = y + height * 0.63;
    const sourceX = x + width * grip.x;
    const sourceY = y + height * grip.y;
    const scaledX = weaponPivotX + (sourceX - weaponPivotX) * action.weaponScale;
    const scaledY = weaponPivotY + (sourceY - weaponPivotY) * action.weaponScale;
    const cosine = Math.cos(action.weaponAngle);
    const sine = Math.sin(action.weaponAngle);
    const weaponX = weaponPivotX
      + (scaledX - weaponPivotX) * cosine
      - (scaledY - weaponPivotY) * sine
      + action.weaponShiftX * width;
    const weaponY = weaponPivotY
      + (scaledX - weaponPivotX) * sine
      + (scaledY - weaponPivotY) * cosine
      + action.weaponShiftY * height;
    const torsoPivotY = y + height * 0.58;
    const torsoRotation = pose.lean + action.torsoAngle;
    const inverseCosine = Math.cos(-torsoRotation);
    const inverseSine = Math.sin(-torsoRotation);
    return {
      x: cx
        + (weaponX - cx) * inverseCosine
        - (weaponY - torsoPivotY) * inverseSine,
      y: torsoPivotY
        + (weaponX - cx) * inverseSine
        + (weaponY - torsoPivotY) * inverseCosine,
    };
  }

  const MATERIAL_PROFILES = Object.freeze({
    silk: { specularWidth: 0.24, roughness: 0.18, grain: 5, stitch: 0.62, edgeWear: 0.08 },
    "lacquered-lamellar": { specularWidth: 0.1, roughness: 0.12, grain: 3, stitch: 0.86, edgeWear: 0.42 },
    "raw-iron": { specularWidth: 0.055, roughness: 0.74, grain: 18, stitch: 0.08, edgeWear: 0.9 },
    leather: { specularWidth: 0.16, roughness: 0.58, grain: 12, stitch: 0.94, edgeWear: 0.46 },
    wood: { specularWidth: 0.13, roughness: 0.52, grain: 15, stitch: 0, edgeWear: 0.34 },
    feather: { specularWidth: 0.31, roughness: 0.34, grain: 11, stitch: 0, edgeWear: 0.18 },
  });

  const MATERIAL_EDGE_RESPONSES = Object.freeze({
    silk: { softness: 0.86, specularGain: 0.42, occlusion: 0.14, breakup: 0.28 },
    "lacquered-lamellar": { softness: 0.18, specularGain: 0.94, occlusion: 0.46, breakup: 0.36 },
    "raw-iron": { softness: 0.04, specularGain: 0.72, occlusion: 0.68, breakup: 0.92 },
    leather: { softness: 0.48, specularGain: 0.34, occlusion: 0.58, breakup: 0.74 },
    wood: { softness: 0.31, specularGain: 0.28, occlusion: 0.5, breakup: 0.63 },
    feather: { softness: 0.96, specularGain: 0.55, occlusion: 0.19, breakup: 0.47 },
  });

  function materialEdgeResponse(materialName) {
    return MATERIAL_EDGE_RESPONSES[materialName] || MATERIAL_EDGE_RESPONSES.silk;
  }

  const EXPRESSION_GEOMETRY = Object.freeze({
    gentle: { browSlope: -0.02, eyeOpen: 0.9, mouthTilt: -0.01, mouthCurve: 0.015, nostrilLift: 0 },
    noble: { browSlope: 0.035, eyeOpen: 0.78, mouthTilt: 0.02, mouthCurve: 0.03, nostrilLift: -0.01 },
    fury: { browSlope: 0.23, eyeOpen: 1.28, mouthTilt: 0.06, mouthCurve: 0.14, nostrilLift: -0.055 },
    focus: { browSlope: 0.065, eyeOpen: 0.76, mouthTilt: -0.015, mouthCurve: 0.025, nostrilLift: 0 },
    calm: { browSlope: -0.055, eyeOpen: 0.56, mouthTilt: 0, mouthCurve: -0.005, nostrilLift: 0.02 },
    squint: { browSlope: 0.065, eyeOpen: 0.35, mouthTilt: 0.035, mouthCurve: 0.055, nostrilLift: -0.018 },
    command: { browSlope: 0.14, eyeOpen: 0.86, mouthTilt: -0.045, mouthCurve: 0.075, nostrilLift: -0.028 },
    cold: { browSlope: -0.12, eyeOpen: 0.46, mouthTilt: 0.06, mouthCurve: -0.055, nostrilLift: 0.03 },
    scarred: { browSlope: 0.18, eyeOpen: 0.9, mouthTilt: 0.11, mouthCurve: 0.07, nostrilLift: -0.04 },
    glare: { browSlope: 0.26, eyeOpen: 1.18, mouthTilt: -0.085, mouthCurve: 0.12, nostrilLift: -0.06 },
    charge: { browSlope: 0.1, eyeOpen: 0.9, mouthTilt: -0.04, mouthCurve: 0.035, nostrilLift: -0.02 },
    tired: { browSlope: -0.15, eyeOpen: 0.32, mouthTilt: 0.07, mouthCurve: -0.075, nostrilLift: 0.035 },
    steady: { browSlope: 0.015, eyeOpen: 0.76, mouthTilt: 0, mouthCurve: 0.015, nostrilLift: 0 },
    proud: { browSlope: -0.04, eyeOpen: 0.7, mouthTilt: -0.08, mouthCurve: -0.02, nostrilLift: 0.025 },
    raider: { browSlope: 0.19, eyeOpen: 1.04, mouthTilt: 0.1, mouthCurve: 0.1, nostrilLift: -0.045 },
    measured: { browSlope: -0.015, eyeOpen: 0.66, mouthTilt: 0.015, mouthCurve: 0, nostrilLift: 0.015 },
    resolve: { browSlope: 0.08, eyeOpen: 0.84, mouthTilt: 0.02, mouthCurve: 0.06, nostrilLift: -0.015 },
    aim: { browSlope: 0.055, eyeOpen: 0.62, mouthTilt: -0.025, mouthCurve: 0.015, nostrilLift: 0 },
    arrogant: { browSlope: -0.11, eyeOpen: 0.68, mouthTilt: -0.16, mouthCurve: -0.07, nostrilLift: 0.045 },
  });

  function expressionGeometry(pose) {
    return EXPRESSION_GEOMETRY[pose.expression] || EXPRESSION_GEOMETRY.steady;
  }

  function portraitMaterials(art) {
    const scholar = /scholar|soft-cap/.test(art.headgear) || ["feather-fan", "dark-fan", "bamboo-scroll", "book-sword"].includes(art.weapon);
    const royal = /crown/.test(art.headgear) && art.headgear !== "phoenix-crown";
    const rawIron = ["twin-halberds-giant", "eyepatch-shield", "serpent-spear-wild-beard"].includes(art.archetype);
    const leather = ["bells-headscarf-raider", "elder-archer"].includes(art.archetype);
    const woodenWeapon = ["bow", "bamboo-scroll", "fire-club"].includes(art.weapon);
    const featherWeapon = ["feather-fan", "dark-fan"].includes(art.weapon);
    return {
      garment: scholar || royal || art.feminine ? "silk" : leather ? "leather" : rawIron ? "raw-iron" : "lacquered-lamellar",
      armor: rawIron ? "raw-iron" : leather ? "leather" : "lacquered-lamellar",
      headgear: /scarf|band|soft-cap|scholar/.test(art.headgear) ? "silk" : /helmet|helm/.test(art.headgear) ? "raw-iron" : royal ? "lacquered-lamellar" : "leather",
      weapon: featherWeapon ? "feather" : woodenWeapon ? "wood" : "raw-iron",
    };
  }

  function paintMaterialEdgeResponseV7(ctx, x, y, width, height, materialName, seed, pose, compact) {
    const response = materialEdgeResponse(materialName);
    const noise = seededNoise(seed ^ hashString(`${materialName}|edge-v7`));
    const unit = Math.min(width, height);
    const strokeCount = compact ? 2 : Math.round(3 + response.breakup * 6);
    ctx.save();
    ctx.lineCap = response.softness > 0.55 ? "round" : "butt";
    ctx.shadowColor = colorWithAlpha(pose.rimColor, 0.34 * response.specularGain);
    ctx.shadowBlur = unit * response.softness * (compact ? 0.018 : 0.035);
    for (let stroke = 0; stroke < strokeCount; stroke += 1) {
      const side = stroke % 2;
      const along = (stroke + 0.25 + noise() * 0.5) / strokeCount;
      const sx = side ? x + width * along : x + width * (0.04 + noise() * 0.92);
      const sy = side ? y + height * (0.05 + noise() * 0.9) : y + height * along;
      const length = (side ? height : width) * (
        0.055 + noise() * (response.softness > 0.6 ? 0.18 : 0.09)
      );
      ctx.strokeStyle = stroke % 3
        ? colorWithAlpha(pose.rimColor, 0.1 + response.specularGain * 0.18)
        : `rgba(4,7,8,${0.08 + response.occlusion * 0.2})`;
      ctx.lineWidth = Math.max(
        0.4,
        unit * (0.005 + response.softness * 0.008 + noise() * 0.004),
      );
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(
        sx + (side ? unit * response.softness * 0.025 : length * 0.52),
        sy + (side ? length * 0.52 : unit * response.softness * 0.018),
        sx + (side ? 0 : length),
        sy + (side ? length : 0),
      );
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    const contactShade = ctx.createLinearGradient(x, y + height * 0.58, x, y + height);
    contactShade.addColorStop(0, "rgba(2,4,5,0)");
    contactShade.addColorStop(1, `rgba(2,4,5,${0.05 + response.occlusion * 0.18})`);
    ctx.fillStyle = contactShade;
    ctx.fillRect(x, y + height * 0.5, width, height * 0.5);
    ctx.restore();
  }

  function paintMaterialSurface(ctx, x, y, width, height, materialName, seed, pose, compact) {
    const material = MATERIAL_PROFILES[materialName] || MATERIAL_PROFILES.silk;
    const keyX = Math.cos(pose.keyAngle);
    const keyY = Math.sin(pose.keyAngle);
    const centerX = x + width * 0.5;
    const centerY = y + height * 0.5;
    const span = Math.max(width, height);
    const specular = ctx.createLinearGradient(
      centerX - keyX * span * 0.7,
      centerY - keyY * span * 0.7,
      centerX + keyX * span * 0.7,
      centerY + keyY * span * 0.7,
    );
    const half = material.specularWidth * 0.5;
    specular.addColorStop(0, "rgba(255,255,255,0)");
    specular.addColorStop(clamp(0.5 - half * 1.7, 0.05, 0.48), "rgba(255,255,255,0)");
    specular.addColorStop(0.5, colorWithAlpha(pose.keyTemp, (0.17 + (1 - material.roughness) * 0.2) * pose.keyStrength));
    specular.addColorStop(clamp(0.5 + half * 1.7, 0.52, 0.95), "rgba(255,255,255,0)");
    specular.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = specular;
    ctx.fillRect(x, y, width, height);

    const noise = seededNoise(seed ^ hashString(materialName));
    const grainCount = Math.max(1, Math.round(material.grain * (compact ? 0.34 : 1)));
    ctx.lineCap = "round";
    for (let grain = 0; grain < grainCount; grain += 1) {
      const grainX = x + noise() * width;
      const grainY = y + noise() * height;
      const horizontal = materialName === "wood" || materialName === "silk" || materialName === "feather";
      const grainLength = (horizontal ? width : height) * (0.08 + noise() * 0.2);
      ctx.strokeStyle = noise() > 0.5
        ? colorWithAlpha(pose.rimColor, 0.05 + (1 - material.roughness) * 0.08)
        : `rgba(3,5,6,${0.035 + material.roughness * 0.09})`;
      ctx.lineWidth = Math.max(0.38, Math.min(width, height) * (0.004 + noise() * 0.008));
      ctx.beginPath();
      ctx.moveTo(grainX, grainY);
      if (horizontal) {
        ctx.bezierCurveTo(
          grainX + grainLength * 0.35,
          grainY + (noise() - 0.5) * height * 0.06,
          grainX + grainLength * 0.7,
          grainY + (noise() - 0.5) * height * 0.04,
          grainX + grainLength,
          grainY,
        );
      } else {
        ctx.lineTo(grainX + (noise() - 0.5) * width * 0.05, grainY + grainLength);
      }
      ctx.stroke();
    }

    if (!compact && material.stitch > 0.2) {
      ctx.strokeStyle = colorWithAlpha(pose.rimColor, 0.12 + material.stitch * 0.14);
      ctx.lineWidth = Math.max(0.5, Math.min(width, height) * 0.006);
      ctx.setLineDash([Math.max(2, width * 0.025), Math.max(2, width * 0.018)]);
      ctx.beginPath();
      ctx.moveTo(x + width * 0.08, y + height * 0.14);
      ctx.quadraticCurveTo(x + width * 0.5, y + height * 0.08, x + width * 0.92, y + height * 0.14);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (material.edgeWear > 0.25) {
      const wearCount = compact ? 2 : Math.round(3 + material.edgeWear * 7);
      ctx.strokeStyle = colorWithAlpha(pose.keyTemp, 0.1 + material.edgeWear * 0.16);
      ctx.lineWidth = Math.max(0.5, Math.min(width, height) * 0.008);
      for (let wear = 0; wear < wearCount; wear += 1) {
        const wearX = x + width * (0.05 + noise() * 0.9);
        const wearY = y + height * (0.12 + noise() * 0.78);
        ctx.beginPath();
        ctx.moveTo(wearX, wearY);
        ctx.lineTo(wearX + (noise() - 0.5) * width * 0.08, wearY + (noise() - 0.5) * height * 0.05);
        ctx.stroke();
      }
    }

    /*
     * Broken edge light keeps materials from reading as flat vector fills.
     * Metal chips sharply, silk blooms into long soft strokes, and leather
     * breaks into short warm abrasion marks.
     */
    const breakupCount = compact ? 3 : materialName === "raw-iron" ? 12 : 8;
    ctx.save();
    ctx.lineCap = materialName === "raw-iron" ? "butt" : "round";
    for (let breakup = 0; breakup < breakupCount; breakup += 1) {
      const along = (breakup + 0.35 + noise() * 0.3) / breakupCount;
      const startX = x + width * along;
      const startY = y + height * (0.05 + noise() * 0.9);
      const longFiber = materialName === "silk" || materialName === "feather";
      const abrasion = materialName === "leather";
      const length = (longFiber ? width : Math.min(width, height)) * (
        longFiber ? 0.12 + noise() * 0.15 : abrasion ? 0.035 + noise() * 0.07 : 0.025 + noise() * 0.055
      );
      ctx.strokeStyle = colorWithAlpha(
        materialName === "raw-iron" ? pose.keyTemp : materialName === "leather" ? "#d69b66" : pose.rimColor,
        compact ? 0.18 : materialName === "raw-iron" ? 0.3 : 0.2,
      );
      ctx.lineWidth = Math.max(
        0.45,
        Math.min(width, height) * (materialName === "raw-iron" ? 0.012 : 0.008),
      );
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(
        startX + length * 0.45,
        startY - keyY * height * 0.025,
        startX + length,
        startY + keyX * height * (abrasion ? 0.012 : 0.022),
      );
      ctx.stroke();
    }
    ctx.restore();

    // Material-specific directional marks are deliberately sparse and grouped
    // by value. They survive inspector scale without becoming glitter in the
    // 96×62 hand crop.
    ctx.save();
    if (materialName === "silk") {
      const fiberCount = compact ? 2 : 7;
      ctx.lineCap = "round";
      for (let fiber = 0; fiber < fiberCount; fiber += 1) {
        const fy = y + height * (0.16 + (fiber + noise() * 0.35) / fiberCount * 0.72);
        ctx.strokeStyle = fiber % 2
          ? colorWithAlpha(pose.keyTemp, compact ? 0.13 : 0.17)
          : "rgba(26,18,17,.1)";
        ctx.lineWidth = Math.max(0.35, Math.min(width, height) * 0.0045);
        ctx.beginPath();
        ctx.moveTo(x + width * 0.06, fy);
        ctx.bezierCurveTo(
          x + width * 0.34,
          fy - keyY * height * 0.045,
          x + width * 0.68,
          fy + keyY * height * 0.025,
          x + width * 0.94,
          fy - keyY * height * 0.02,
        );
        ctx.stroke();
      }
    } else if (materialName === "leather") {
      const poreCount = compact ? 3 : 13;
      for (let pore = 0; pore < poreCount; pore += 1) {
        const px = x + width * (0.08 + noise() * 0.84);
        const py = y + height * (0.1 + noise() * 0.8);
        ctx.fillStyle = noise() > 0.58 ? "rgba(231,168,106,.13)" : "rgba(20,12,10,.19)";
        ellipsePath(
          ctx,
          px,
          py,
          Math.max(0.3, width * (0.004 + noise() * 0.004)),
          Math.max(0.25, height * (0.003 + noise() * 0.004)),
        );
        ctx.fill();
      }
      if (!compact) {
        ctx.strokeStyle = "rgba(228,168,105,.17)";
        ctx.lineWidth = Math.max(0.4, Math.min(width, height) * 0.004);
        for (let crease = 0; crease < 3; crease += 1) {
          const creaseY = y + height * (0.28 + crease * 0.2);
          ctx.beginPath();
          ctx.moveTo(x + width * (0.12 + crease * 0.04), creaseY);
          ctx.quadraticCurveTo(
            x + width * 0.5,
            creaseY + height * 0.035,
            x + width * 0.86,
            creaseY - height * 0.015,
          );
          ctx.stroke();
        }
      }
    } else if (materialName === "raw-iron" || materialName === "lacquered-lamellar") {
      const scratchCount = compact ? 3 : materialName === "raw-iron" ? 14 : 8;
      ctx.lineCap = "butt";
      for (let scratch = 0; scratch < scratchCount; scratch += 1) {
        const sx = x + width * (0.08 + noise() * 0.84);
        const sy = y + height * (0.1 + noise() * 0.78);
        const length = Math.min(width, height) * (0.025 + noise() * 0.07);
        ctx.strokeStyle = scratch % 3
          ? "rgba(9,13,15,.28)"
          : colorWithAlpha(pose.keyTemp, materialName === "raw-iron" ? 0.28 : 0.2);
        ctx.lineWidth = Math.max(
          0.35,
          Math.min(width, height) * (materialName === "raw-iron" ? 0.0045 : 0.003),
        );
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + keyY * length, sy - keyX * length);
        ctx.stroke();
      }
      if (!compact && materialName === "lacquered-lamellar") {
        const lacquerGlow = ctx.createLinearGradient(x, y, x + width, y + height);
        lacquerGlow.addColorStop(0, "rgba(255,255,255,0)");
        lacquerGlow.addColorStop(0.48, colorWithAlpha(pose.rimColor, 0.1));
        lacquerGlow.addColorStop(0.56, "rgba(255,255,255,0)");
        ctx.fillStyle = lacquerGlow;
        ctx.fillRect(x, y, width, height);
      }
    } else if (materialName === "wood") {
      const ringCount = compact ? 2 : 6;
      ctx.strokeStyle = "rgba(38,22,15,.24)";
      ctx.lineWidth = Math.max(0.35, Math.min(width, height) * 0.004);
      for (let ring = 0; ring < ringCount; ring += 1) {
        const ringY = y + height * (0.12 + ring / Math.max(1, ringCount - 1) * 0.76);
        ctx.beginPath();
        ctx.moveTo(x + width * 0.04, ringY);
        ctx.bezierCurveTo(
          x + width * 0.32,
          ringY + height * 0.035,
          x + width * 0.64,
          ringY - height * 0.03,
          x + width * 0.96,
          ringY + height * 0.015,
        );
        ctx.stroke();
      }
    }
    ctx.restore();
    paintMaterialEdgeResponseV7(ctx, x, y, width, height, materialName, seed, pose, compact);
  }

  function paintCompactFactionGrammar(ctx, x, y, width, height, card, style) {
    const faction = String(getCardValue(card, "id", "")).split("_")[0];
    ctx.save();
    roundedRect(ctx, x, y, width, height, Math.max(4, width * 0.05));
    ctx.clip();
    ctx.strokeStyle = colorWithAlpha(style.secondary, 0.42);
    ctx.fillStyle = colorWithAlpha(style.primary, 0.24);
    ctx.lineWidth = Math.max(1, width * 0.018);
    ctx.lineCap = "round";
    if (faction === "shu") {
      ctx.beginPath();
      ctx.arc(x + width * 0.18, y + height * 0.72, width * 0.27, -1.15, 0.65);
      ctx.stroke();
    } else if (faction === "wei") {
      ctx.beginPath();
      ctx.moveTo(x + width * 0.02, y + height * 0.21);
      ctx.lineTo(x + width * 0.2, y + height * 0.08);
      ctx.lineTo(x + width * 0.38, y + height * 0.21);
      ctx.lineTo(x + width * 0.2, y + height * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (faction === "wu") {
      ctx.beginPath();
      ctx.moveTo(x - width * 0.04, y + height * 0.78);
      ctx.bezierCurveTo(
        x + width * 0.14,
        y + height * 0.58,
        x + width * 0.29,
        y + height * 0.94,
        x + width * 0.49,
        y + height * 0.72,
      );
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x + width * 0.06, y + height * 0.82);
      ctx.lineTo(x + width * 0.36, y + height * 0.18);
      ctx.lineTo(x + width * 0.28, y + height * 0.72);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function paintCompactSignatureSilhouette(ctx, x, y, width, height, art, style, action, faceGuard) {
    const signature = action.signature;
    const facing = art.facing || 1;
    const outline = (drawPath, lineWidth) => {
      ctx.strokeStyle = "rgba(4,7,8,.82)";
      ctx.lineWidth = lineWidth * 2.4;
      drawPath();
      ctx.stroke();
      ctx.strokeStyle = colorWithAlpha(style.secondary, 0.92);
      ctx.lineWidth = lineWidth;
      drawPath();
      ctx.stroke();
    };
    ctx.save();
    roundedRect(ctx, x, y, width, height, Math.max(4, width * 0.05));
    ctx.clip();
    if (faceGuard) {
      // Even-odd clipping lets the accent pass behind the head instead of
      // slicing across the eyes, nose or moustache on compact cards.
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.ellipse(
        faceGuard.cx,
        faceGuard.cy,
        faceGuard.radius * 1.28,
        faceGuard.radius * 1.46,
        faceGuard.rotation || 0,
        0,
        TAU,
      );
      ctx.clip("evenodd");
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // A translucent accent reinforces the thumbnail read without painting a
    // second opaque weapon over the full portrait pose.
    ctx.globalAlpha = 0.56;
    const weaponLine = Math.max(1, width * 0.013);

    if (["silver-spear", "serpent-spear", "charge-lance"].includes(signature)) {
      outline(() => {
        ctx.beginPath();
        ctx.moveTo(x + width * 0.18, y + height * 0.96);
        ctx.lineTo(x + width * 0.86, y + height * 0.03);
        if (signature === "serpent-spear") {
          ctx.moveTo(x + width * 0.82, y + height * 0.09);
          ctx.bezierCurveTo(
            x + width * 0.68,
            y + height * 0.02,
            x + width * 0.94,
            y + height * 0.16,
            x + width * 0.79,
            y + height * 0.2,
          );
        }
      }, weaponLine);
    } else if (["full-draw-bow", "plum-bow"].includes(signature)) {
      outline(() => {
        ctx.beginPath();
        ctx.arc(
          x + width * (facing > 0 ? 0.66 : 0.34),
          y + height * 0.52,
          width * 0.25,
          -Math.PI * 0.5,
          Math.PI * 0.5,
          facing < 0,
        );
        ctx.moveTo(x + width * 0.16, y + height * 0.52);
        ctx.lineTo(x + width * 0.95, y + height * 0.52);
      }, weaponLine);
    } else if (["star-fan", "raven-fan"].includes(signature)) {
      outline(() => {
        ctx.beginPath();
        for (let feather = -2; feather <= 2; feather += 1) {
          ctx.moveTo(x + width * 0.69, y + height * 0.8);
          ctx.lineTo(x + width * (0.69 + feather * 0.075), y + height * 0.28);
        }
      }, weaponLine);
    } else if (signature === "iron-shield") {
      ctx.beginPath();
      ctx.moveTo(x + width * 0.6, y + height * 0.3);
      ctx.lineTo(x + width * 0.96, y + height * 0.39);
      ctx.lineTo(x + width * 0.84, y + height * 0.93);
      ctx.lineTo(x + width * 0.64, y + height * 0.79);
      ctx.closePath();
      ctx.fillStyle = "rgba(8,13,16,.78)";
      ctx.fill();
      ctx.strokeStyle = colorWithAlpha(style.secondary, 0.95);
      ctx.lineWidth = weaponLine * 1.4;
      ctx.stroke();
    } else if (signature === "twin-halberds") {
      outline(() => {
        ctx.beginPath();
        ctx.moveTo(x + width * 0.16, y + height);
        ctx.lineTo(x + width * 0.26, y);
        ctx.moveTo(x + width * 0.84, y + height);
        ctx.lineTo(x + width * 0.74, y);
      }, weaponLine * 1.25);
    } else if (["open-scroll", "book-sword"].includes(signature)) {
      ctx.fillStyle = "rgba(225,205,152,.78)";
      roundedRect(ctx, x + width * 0.62, y + height * 0.58, width * 0.31, height * 0.21, width * 0.02);
      ctx.fill();
      ctx.strokeStyle = "#3c2d21";
      ctx.lineWidth = weaponLine;
      ctx.stroke();
      if (signature === "book-sword") {
        outline(() => {
          ctx.beginPath();
          ctx.moveTo(x + width * 0.23, y + height * 0.96);
          ctx.lineTo(x + width * 0.82, y + height * 0.08);
        }, weaponLine);
      }
    } else if (signature === "fire-club") {
      outline(() => {
        ctx.beginPath();
        ctx.moveTo(x + width * 0.2, y + height);
        ctx.lineTo(x + width * 0.78, y + height * 0.09);
      }, weaponLine * 2);
      ctx.fillStyle = "#ff7b3e";
      ellipsePath(ctx, x + width * 0.78, y + height * 0.1, width * 0.08, height * 0.14);
      ctx.fill();
    } else if (signature === "fangtian-halberd") {
      outline(() => {
        ctx.beginPath();
        ctx.moveTo(x + width * 0.16, y + height);
        ctx.lineTo(x + width * 0.86, y);
        ctx.moveTo(x + width * 0.8, y + height * 0.1);
        ctx.lineTo(x + width * 0.68, y + height * 0.23);
        ctx.moveTo(x + width * 0.81, y + height * 0.1);
        ctx.lineTo(x + width * 0.94, y + height * 0.22);
      }, weaponLine * 1.25);
    } else {
      // Sword families retain different pose angles from their action profile.
      outline(() => {
        ctx.beginPath();
        if (signature === "crossed-blades") {
          ctx.moveTo(x + width * 0.14, y + height);
          ctx.lineTo(x + width * 0.68, y);
          ctx.moveTo(x + width * 0.86, y + height);
          ctx.lineTo(x + width * 0.36, y);
        } else {
          ctx.moveTo(x + width * 0.17, y + height * 0.95);
          ctx.lineTo(x + width * 0.84, y + height * 0.05);
        }
      }, weaponLine);
      if (signature === "bells-blade") {
        ctx.fillStyle = "#f1c34f";
        ellipsePath(ctx, x + width * 0.68, y + height * 0.56, width * 0.035, width * 0.035);
        ctx.fill();
        ellipsePath(ctx, x + width * 0.76, y + height * 0.62, width * 0.03, width * 0.03);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function portraitShiftColor(hex, amount) {
    const clean = String(hex || "#000000").replace("#", "").padEnd(6, "0").slice(0, 6);
    const channels = [0, 2, 4].map((start) => parseInt(clean.slice(start, start + 2), 16));
    const target = amount < 0 ? 0 : 255;
    const ratio = Math.abs(amount);
    return `rgb(${channels.map((channel) => Math.round(lerp(channel, target, ratio))).join(",")})`;
  }

  function portraitSaturationColor(hex, saturation, valueScale) {
    const clean = String(hex || "#000000").replace("#", "").padEnd(6, "0").slice(0, 6);
    const channels = [0, 2, 4].map((start) => parseInt(clean.slice(start, start + 2), 16));
    const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    const scale = Number.isFinite(valueScale) ? valueScale : 1;
    const adjusted = channels.map((channel) => clamp(
      Math.round(lerp(luminance, channel, saturation) * scale),
      0,
      255,
    ));
    return `#${adjusted.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
  }

  function painterlyFacePath(ctx, cx, cy, radius, art, pose) {
    const facing = art.facing || 1;
    const landmarks = faceLandmarks(art);
    const yaw = pose.yaw;
    const far = (0.78 - yaw * 0.3) * landmarks.templeWidth;
    const near = (0.52 + landmarks.jawAngle * 0.22 + yaw * 0.12);
    const nose = 0.78 + yaw * 0.35 + faceProfile(art).nose * 0.28;
    const farJaw = 0.42 + landmarks.jawAngle * 0.34;
    const chinX = landmarks.chinPoint + landmarks.asymmetry * 0.7;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(facing, 1);
    ctx.beginPath();
    ctx.moveTo(-radius * landmarks.templeWidth * 0.48, -radius * 1.02);
    ctx.bezierCurveTo(
      -radius * far,
      -radius * 0.84,
      -radius * farJaw,
      radius * 0.22,
      -radius * farJaw,
      radius * 0.48,
    );
    ctx.quadraticCurveTo(
      -radius * (0.34 + landmarks.jawAngle * 0.18),
      radius * landmarks.faceLength * 0.94,
      radius * chinX,
      radius * landmarks.faceLength,
    );
    ctx.quadraticCurveTo(
      radius * (0.34 + landmarks.jawAngle * 0.22),
      radius * landmarks.faceLength * 0.95,
      radius * near,
      radius * 0.52,
    );
    ctx.quadraticCurveTo(radius * (near + 0.06), radius * 0.31, radius * 0.68, radius * 0.16);
    ctx.lineTo(radius * nose, radius * 0.03);
    ctx.quadraticCurveTo(radius * (0.8 + yaw * 0.08), -radius * 0.1, radius * 0.66, -radius * 0.18);
    ctx.quadraticCurveTo(
      radius * landmarks.templeWidth * 0.78,
      -radius * 0.72,
      radius * landmarks.templeWidth * 0.42,
      -radius * 1.02,
    );
    ctx.closePath();
    ctx.restore();
  }

  function paintAtmosphericDepth(ctx, x, y, width, height, art, style, seed, compact) {
    const noise = seededNoise(seed ^ 0x83c7a1);
    ctx.save();
    roundedRect(ctx, x, y, width, height, Math.max(4, width * 0.05));
    ctx.clip();
    const lightX = x + width * ((art.facing || 1) > 0 ? 0.76 : 0.24);
    const bloom = ctx.createRadialGradient(lightX, y + height * 0.25, 0, lightX, y + height * 0.25, width * 0.7);
    bloom.addColorStop(0, colorWithAlpha(style.glow, compact ? 0.34 : 0.48));
    bloom.addColorStop(0.42, colorWithAlpha(style.primary, 0.13));
    bloom.addColorStop(1, "rgba(2,7,9,0)");
    ctx.fillStyle = bloom;
    ctx.fillRect(x, y, width, height);

    ctx.save();
    ctx.filter = `blur(${Math.max(2, width * 0.018)}px)`;
    ctx.globalAlpha = compact ? 0.18 : 0.27;
    for (let cloud = 0; cloud < (compact ? 4 : 8); cloud += 1) {
      const cloudX = x + noise() * width;
      const cloudY = y + height * (0.08 + noise() * 0.66);
      const radiusX = width * (0.09 + noise() * 0.2);
      const radiusY = height * (0.05 + noise() * 0.13);
      ellipsePath(ctx, cloudX, cloudY, radiusX, radiusY);
      ctx.fillStyle = noise() > 0.42 ? colorWithAlpha(style.secondary, 0.32) : "rgba(4,11,14,.54)";
      ctx.fill();
    }
    ctx.restore();

    const haze = ctx.createLinearGradient(x, y + height * 0.36, x, y + height);
    haze.addColorStop(0, "rgba(214,219,198,0)");
    haze.addColorStop(0.7, "rgba(176,190,177,.08)");
    haze.addColorStop(1, "rgba(6,10,10,.48)");
    ctx.fillStyle = haze;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }

  function paintBackgroundDepthOfFieldV7(ctx, x, y, width, height, art, style, seed, compact) {
    const noise = seededNoise(seed ^ 0x7d0f17);
    const facing = art.facing || 1;
    const bokehCount = compact ? 3 : 7;
    ctx.save();
    roundedRect(ctx, x, y, width, height, Math.max(4, width * 0.05));
    ctx.clip();

    // Far battle lights lose chroma and edge acuity before the cached subject
    // is laid over them. This creates atmospheric perspective without a
    // per-frame blur or a random sparkle layer.
    ctx.save();
    ctx.filter = `blur(${Math.max(1.4, width * (compact ? 0.012 : 0.022))}px)`;
    ctx.globalCompositeOperation = "screen";
    for (let light = 0; light < bokehCount; light += 1) {
      const depth = 0.25 + noise() * 0.72;
      const bx = x + width * (0.08 + noise() * 0.84);
      const by = y + height * (0.12 + noise() * 0.57);
      const br = width * (0.012 + (1 - depth) * 0.034);
      ctx.fillStyle = light % 3
        ? colorWithAlpha(style.glow, compact ? 0.12 : 0.17)
        : "rgba(236,184,112,.13)";
      ellipsePath(ctx, bx, by, br * 1.7, br);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    const aerial = ctx.createLinearGradient(
      x - facing * width * 0.1,
      y + height * 0.1,
      x + facing * width * 0.86,
      y + height * 0.74,
    );
    aerial.addColorStop(0, "rgba(168,187,186,.08)");
    aerial.addColorStop(0.46, colorWithAlpha(style.secondary, compact ? 0.035 : 0.055));
    aerial.addColorStop(1, "rgba(8,13,15,0)");
    ctx.fillStyle = aerial;
    ctx.fillRect(x, y, width, height * 0.78);
    ctx.restore();
    ctx.restore();
  }

  function paintSubjectDepthBacklight(ctx, x, y, width, height, art, pose, cx, headY, radius, compact) {
    const facing = art.facing || 1;
    ctx.save();
    roundedRect(ctx, x, y, width, height, Math.max(4, width * 0.05));
    ctx.clip();

    // A shallow fog shelf sits behind the shoulders, while a broken back rim
    // peeks around headgear and cape. The subject pass later covers the inner
    // half of these marks and turns them into real silhouette separation.
    const fog = ctx.createLinearGradient(x, y + height * 0.3, x, y + height * 0.78);
    fog.addColorStop(0, "rgba(208,218,207,0)");
    fog.addColorStop(0.52, "rgba(208,218,207,.07)");
    fog.addColorStop(0.72, colorWithAlpha(pose.rimColor, compact ? 0.08 : 0.12));
    fog.addColorStop(1, "rgba(9,13,14,0)");
    ctx.fillStyle = fog;
    ctx.fillRect(x, y + height * 0.22, width, height * 0.64);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = colorWithAlpha(pose.rimColor, compact ? 0.42 : 0.34);
    ctx.shadowColor = pose.rimColor;
    ctx.shadowBlur = width * (compact ? 0.025 : 0.055);
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(1.1, width * (compact ? 0.026 : 0.018));
    ctx.beginPath();
    ctx.arc(
      cx - facing * radius * 0.05,
      headY,
      radius * 1.08,
      facing > 0 ? Math.PI * 0.52 : -Math.PI * 0.48,
      facing > 0 ? Math.PI * 1.42 : Math.PI * 0.42,
      facing < 0,
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - facing * width * 0.03, y + height * 0.5);
    ctx.quadraticCurveTo(
      cx - facing * width * 0.34,
      y + height * 0.55,
      cx - facing * width * 0.58,
      y + height * 0.82,
    );
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  function paintNearDepthOfFieldV7(ctx, x, y, width, height, seed, art, pose, compact) {
    const noise = seededNoise(seed ^ 0x17d0f7);
    const facing = art.facing || 1;
    const fragmentCount = compact ? 2 : 4;
    ctx.save();
    roundedRect(ctx, x, y, width, height, Math.max(4, width * 0.05));
    ctx.clip();
    ctx.filter = `blur(${Math.max(1.2, width * (compact ? 0.014 : 0.025))}px)`;
    ctx.lineCap = "round";
    ctx.globalCompositeOperation = "screen";
    for (let fragment = 0; fragment < fragmentCount; fragment += 1) {
      const leftSide = (fragment + (facing > 0 ? 0 : 1)) % 2 === 0;
      const fx = x + width * (leftSide ? -0.03 + noise() * 0.12 : 0.89 + noise() * 0.14);
      const fy = y + height * (0.55 + noise() * 0.38);
      const reach = width * (0.12 + noise() * 0.16);
      ctx.strokeStyle = fragment % 2
        ? colorWithAlpha(pose.rimColor, compact ? 0.13 : 0.18)
        : colorWithAlpha(pose.keyTemp, compact ? 0.1 : 0.15);
      ctx.lineWidth = width * (0.025 + noise() * 0.026);
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(
        fx + (leftSide ? reach : -reach) * 0.45,
        fy - height * (0.05 + noise() * 0.09),
        fx + (leftSide ? reach : -reach),
        fy - height * (0.02 + noise() * 0.08),
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintHeroicBackSilhouette(ctx, x, y, width, height, art, style, pose, action, cx, compact) {
    const facing = art.facing || 1;
    const shoulderY = y + height * (0.5 + action.shoulderSlope * 0.08);
    const capeEndX = cx - facing * width * (compact ? 0.58 : 0.7);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.72)";
    ctx.shadowBlur = width * (compact ? 0.03 : 0.08);
    ctx.beginPath();
    ctx.moveTo(cx - facing * width * 0.05, shoulderY - height * 0.04);
    ctx.quadraticCurveTo(
      cx - facing * width * 0.35,
      shoulderY + height * action.shoulderSlope * 0.2,
      capeEndX,
      y + height * 0.78,
    );
    ctx.lineTo(capeEndX + facing * width * 0.12, y + height * 1.05);
    ctx.lineTo(cx + facing * width * 0.14, y + height * 1.02);
    ctx.closePath();
    const cape = ctx.createLinearGradient(capeEndX, shoulderY, cx + facing * width * 0.18, y + height);
    cape.addColorStop(0, portraitShiftColor(art.robe, -0.68));
    cape.addColorStop(0.55, portraitShiftColor(style.primary, -0.36));
    cape.addColorStop(1, "#080b0c");
    ctx.fillStyle = cape;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = colorWithAlpha(pose.rimColor, compact ? 0.72 : 0.52);
    ctx.lineWidth = Math.max(0.9, width * (compact ? 0.018 : 0.011));
    ctx.beginPath();
    ctx.moveTo(cx - facing * width * 0.03, shoulderY - height * 0.025);
    ctx.quadraticCurveTo(
      cx - facing * width * 0.34,
      shoulderY + height * action.shoulderSlope * 0.2,
      capeEndX,
      y + height * 0.78,
    );
    ctx.stroke();

    const scholar = ["star-fan", "raven-fan", "open-scroll", "book-sword"].includes(action.signature);
    if (scholar || /scarf|band/.test(art.headgear)) {
      ctx.strokeStyle = colorWithAlpha(action.signature === "raven-fan" ? "#91a1c1" : pose.accent, compact ? 0.66 : 0.48);
      ctx.lineWidth = Math.max(1.2, width * (compact ? 0.026 : 0.018));
      ctx.beginPath();
      ctx.moveTo(cx - facing * width * 0.08, shoulderY + height * 0.015);
      ctx.bezierCurveTo(
        cx - facing * width * 0.38,
        shoulderY - height * 0.09,
        cx - facing * width * 0.62,
        y + height * 0.66,
        x - facing * width * 0.08,
        y + height * 0.58,
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintRobeAndArmor(ctx, x, y, width, height, art, style, pose, action, cx, compact, seed) {
    const facing = art.facing || 1;
    const figure = art8FigureProfile(art);
    const broad = ["twin-halberds-giant", "serpent-spear-wild-beard", "eyepatch-shield"].includes(art.archetype);
    const scholar = /scholar|soft-cap/.test(art.headgear) || ["bamboo-scroll", "book-sword"].includes(art.weapon);
    const shoulder = (art.feminine ? 0.31 : broad ? 0.5 : scholar ? 0.37 : 0.43)
      * figure.shoulderBreadth;
    const farShoulder = shoulder * (0.72 - pose.yaw * 0.14);
    const nearShoulder = shoulder * (1.02 + pose.yaw * 0.16);
    const shoulderY = y + height * (scholar ? 0.58 : 0.55);
    const farShoulderY = shoulderY - height * action.shoulderSlope * 0.065;
    const nearShoulderY = shoulderY + height * action.shoulderSlope * 0.065;
    ctx.save();
    ctx.translate(cx, shoulderY);
    ctx.rotate(pose.lean);
    ctx.translate(-cx, -shoulderY);
    ctx.shadowColor = "rgba(0,0,0,.58)";
    ctx.shadowBlur = width * 0.07;
    ctx.shadowOffsetY = height * 0.045;
    ctx.beginPath();
    ctx.moveTo(cx - facing * width * farShoulder, y + height * 1.04);
    ctx.quadraticCurveTo(
      cx - facing * width * farShoulder * 0.88,
      farShoulderY,
      cx - facing * width * 0.1,
      shoulderY - height * 0.025 * figure.ribcageDepth,
    );
    ctx.quadraticCurveTo(
      cx + facing * width * nearShoulder * 0.66,
      nearShoulderY - height * 0.04,
      cx + facing * width * nearShoulder,
      y + height * 1.04,
    );
    ctx.closePath();
    const keyX = Math.cos(pose.keyAngle);
    const keyY = Math.sin(pose.keyAngle);
    const robe = ctx.createLinearGradient(
      cx - keyX * width * 0.48,
      shoulderY - keyY * height * 0.35,
      cx + keyX * width * 0.48,
      shoulderY + keyY * height * 0.35,
    );
    robe.addColorStop(0, portraitShiftColor(art.robe, -0.62));
    robe.addColorStop(0.34, portraitShiftColor(art.robe, -0.18));
    robe.addColorStop(0.67, art.robe);
    robe.addColorStop(1, portraitShiftColor(art.robe, 0.2));
    ctx.fillStyle = robe;
    ctx.fill();
    ctx.save();
    ctx.clip();
    paintMaterialSurface(
      ctx,
      cx - width * shoulder,
      shoulderY - height * 0.08,
      width * shoulder * 2,
      height * 0.55,
      portraitMaterials(art).garment,
      seed ^ 0x719d,
      pose,
      compact,
    );
    ctx.restore();
    ctx.shadowBlur = 0;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.18 + pose.keyStrength * 0.15;
    ctx.beginPath();
    ctx.moveTo(cx + facing * width * 0.06, shoulderY);
    ctx.quadraticCurveTo(cx + facing * width * 0.27, y + height * 0.71, cx + facing * width * 0.36, y + height);
    ctx.lineTo(cx + facing * width * 0.13, y + height);
    ctx.quadraticCurveTo(cx + facing * width * 0.12, y + height * 0.7, cx + facing * width * 0.06, shoulderY);
    ctx.fillStyle = pose.rimColor;
    ctx.fill();
    ctx.restore();

    if (!scholar) {
      const armorY = y + height * 0.63;
      const metal = ctx.createLinearGradient(cx, armorY, cx, y + height);
      if (art.archetype === "twin-halberds-giant") {
        metal.addColorStop(0, "rgba(6,8,9,.96)");
        metal.addColorStop(0.52, "rgba(31,29,28,.96)");
        metal.addColorStop(1, "rgba(3,4,5,.98)");
      } else if (art.archetype === "cavalry-lance") {
        metal.addColorStop(0, "rgba(30,64,94,.9)");
        metal.addColorStop(0.5, "rgba(71,111,145,.94)");
        metal.addColorStop(1, "rgba(9,23,38,.97)");
      } else {
        metal.addColorStop(0, "rgba(10,16,18,.86)");
        metal.addColorStop(0.52, "rgba(38,48,49,.92)");
        metal.addColorStop(1, "rgba(7,10,11,.94)");
      }
      ctx.fillStyle = metal;
      ctx.beginPath();
      ctx.moveTo(cx - width * 0.18, armorY);
      ctx.lineTo(cx + width * 0.2, armorY);
      ctx.lineTo(cx + width * 0.15, y + height);
      ctx.lineTo(cx - width * 0.15, y + height);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.clip();
      paintMaterialSurface(
        ctx,
        cx - width * 0.2,
        armorY,
        width * 0.4,
        height * 0.4,
        portraitMaterials(art).armor,
        seed ^ 0x913a,
        pose,
        compact,
      );
      ctx.restore();
      ctx.strokeStyle = colorWithAlpha(pose.accent, 0.45);
      ctx.lineWidth = Math.max(0.7, width * 0.007);
      const heavyPlate = [
        "serpent-spear-wild-beard",
        "eyepatch-shield",
        "twin-halberds-giant",
        "elder-fire-ship",
        "phoenix-crown-halberd",
      ].includes(art.archetype);
      const royalSilk = [
        "twin-swords-monarch",
        "crowned-sword-ruler",
        "river-crown-sword",
        "fire-gold-crown-sword",
      ].includes(art.archetype);
      const cavalryPlate = ["white-helmet-spear", "cavalry-lance", "elder-archer"].includes(art.archetype);
      if (heavyPlate) {
        for (let row = 0; row < 3; row += 1) {
          for (let plate = -1; plate <= 1; plate += 1) {
            const plateX = cx + plate * width * 0.1 + (row % 2) * width * 0.018;
            const plateY = armorY + height * (0.035 + row * 0.1);
            ctx.beginPath();
            ctx.moveTo(plateX - width * 0.052, plateY);
            ctx.quadraticCurveTo(plateX, plateY + height * 0.055, plateX + width * 0.052, plateY);
            ctx.lineTo(plateX + width * 0.043, plateY + height * 0.07);
            ctx.quadraticCurveTo(plateX, plateY + height * 0.095, plateX - width * 0.043, plateY + height * 0.07);
            ctx.closePath();
            ctx.stroke();
          }
        }
      } else if (royalSilk) {
        ctx.beginPath();
        ctx.moveTo(cx - width * 0.16, armorY + height * 0.03);
        ctx.lineTo(cx, armorY + height * 0.13);
        ctx.lineTo(cx + width * 0.17, armorY + height * 0.025);
        ctx.moveTo(cx, armorY + height * 0.13);
        ctx.lineTo(cx, y + height);
        ctx.stroke();
        if (art.archetype === "twin-swords-monarch") {
          ctx.strokeStyle = colorWithAlpha("#f3d774", 0.56);
          ctx.beginPath();
          ctx.arc(cx, armorY + height * 0.19, width * 0.055, 0.25, Math.PI * 1.75);
          ctx.stroke();
        }
      } else if (cavalryPlate) {
        for (let chevron = 0; chevron < 3; chevron += 1) {
          const chevronY = armorY + height * (0.07 + chevron * 0.1);
          ctx.beginPath();
          ctx.moveTo(cx - width * 0.16, chevronY);
          ctx.lineTo(cx, chevronY + height * 0.055);
          ctx.lineTo(cx + width * 0.17, chevronY);
          ctx.stroke();
        }
        ctx.fillStyle = colorWithAlpha(pose.accent, 0.58);
        for (let rivet = -1; rivet <= 1; rivet += 2) {
          for (let row = 0; row < 3; row += 1) {
            ellipsePath(ctx, cx + rivet * width * 0.13, armorY + height * (0.07 + row * 0.1), width * 0.008, width * 0.008);
            ctx.fill();
          }
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(cx - width * 0.18, armorY + height * 0.03);
        ctx.lineTo(cx + width * 0.17, y + height * 0.96);
        ctx.moveTo(cx + width * 0.18, armorY + height * 0.03);
        ctx.lineTo(cx - width * 0.14, y + height * 0.96);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = colorWithAlpha(pose.accent, 0.34);
      ctx.lineWidth = Math.max(0.7, width * 0.007);
      for (let fold = -2; fold <= 2; fold += 1) {
        ctx.beginPath();
        ctx.moveTo(cx + fold * width * 0.05, shoulderY);
        ctx.bezierCurveTo(
          cx + fold * width * 0.065,
          y + height * 0.72,
          cx + fold * width * 0.04,
          y + height * 0.88,
          cx + fold * width * 0.06,
          y + height,
        );
        ctx.stroke();
      }
      ctx.strokeStyle = colorWithAlpha(pose.accent, 0.48);
      ctx.beginPath();
      ctx.moveTo(cx - width * 0.16, shoulderY + height * 0.015);
      ctx.lineTo(cx, shoulderY + height * 0.14);
      ctx.lineTo(cx + width * 0.16, shoulderY + height * 0.015);
      ctx.stroke();
      if (art.archetype === "bamboo-scroll-adviser") {
        ctx.strokeStyle = "rgba(229,197,111,.45)";
        ctx.beginPath();
        ctx.moveTo(cx - width * 0.2, shoulderY + height * 0.09);
        ctx.quadraticCurveTo(cx, shoulderY + height * 0.2, cx + width * 0.2, shoulderY + height * 0.09);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function paintThoracicStructureV8(ctx, x, y, width, height, art, pose, action, cx, compact) {
    const figure = art8FigureProfile(art);
    const facing = art.facing || 1;
    const shoulderY = y + height * (/scholar|soft-cap/.test(art.headgear) ? 0.59 : 0.56);
    const chestHalf = width * 0.22 * figure.shoulderBreadth;
    const sternumX = cx + facing * width * (0.018 + action.torsoAngle * 0.08);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const chestLight = ctx.createRadialGradient(
      sternumX + facing * chestHalf * 0.38,
      shoulderY + height * 0.09,
      0,
      sternumX,
      shoulderY + height * 0.12,
      chestHalf * 1.5,
    );
    chestLight.addColorStop(0, colorWithAlpha(pose.keyTemp, compact ? 0.17 : 0.13));
    chestLight.addColorStop(0.58, colorWithAlpha(pose.accent, compact ? 0.08 : 0.065));
    chestLight.addColorStop(1, colorWithAlpha(pose.accent, 0));
    ctx.fillStyle = chestLight;
    ellipsePath(
      ctx,
      sternumX,
      shoulderY + height * 0.11,
      chestHalf * figure.ribcageDepth,
      height * 0.17 * figure.ribcageDepth,
    );
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = colorWithAlpha(pose.rimColor, compact ? 0.26 : 0.18);
    ctx.lineWidth = Math.max(0.55, width * (compact ? 0.012 : 0.0065));
    ctx.beginPath();
    ctx.moveTo(cx - facing * chestHalf, shoulderY + height * action.shoulderSlope * 0.035);
    ctx.quadraticCurveTo(
      sternumX - facing * chestHalf * 0.34,
      shoulderY + height * 0.025,
      sternumX,
      shoulderY + height * 0.085,
    );
    ctx.quadraticCurveTo(
      sternumX + facing * chestHalf * 0.38,
      shoulderY + height * 0.02,
      cx + facing * chestHalf * 1.08,
      shoulderY - height * action.shoulderSlope * 0.045,
    );
    ctx.stroke();
    ctx.strokeStyle = "rgba(4,7,8,.3)";
    ctx.beginPath();
    ctx.moveTo(sternumX, shoulderY + height * 0.075);
    ctx.bezierCurveTo(
      sternumX - facing * width * 0.025,
      shoulderY + height * 0.17,
      sternumX + facing * width * 0.018,
      shoulderY + height * 0.31,
      sternumX - facing * width * 0.012,
      y + height * (0.92 + (1 - figure.waistTaper) * 0.12),
    );
    ctx.stroke();
    if (!compact) {
      ctx.strokeStyle = colorWithAlpha(pose.bounceColor, 0.22);
      ctx.beginPath();
      ctx.moveTo(sternumX - facing * chestHalf * 0.74, shoulderY + height * 0.18);
      ctx.quadraticCurveTo(
        sternumX,
        shoulderY + height * (0.24 + figure.ribcageDepth * 0.035),
        sternumX + facing * chestHalf * 0.68,
        shoulderY + height * 0.17,
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintPortraitArms(ctx, x, y, width, height, art, style, pose, action, cx, compact) {
    const facing = art.facing || 1;
    const figure = art8FigureProfile(art);
    const nearX = cx + facing * width * 0.19 * figure.shoulderBreadth;
    const farX = cx - facing * width * 0.14 * figure.shoulderBreadth;
    const targets = {
      "twin-swords": [{ x: x + width * 0.68, y: y + height * 0.55 }, { x: x + width * 0.31, y: y + height * 0.55 }],
      "feather-fan": [{ x: x + width * 0.7, y: y + height * 0.76 }, { x: cx - facing * width * 0.08, y: y + height * 0.7 }],
      "dark-fan": [{ x: x + width * 0.72, y: y + height * 0.75 }, { x: cx - facing * width * 0.08, y: y + height * 0.7 }],
      bow: [{ x: x + width * 0.76, y: y + height * 0.52 }, { x: x + width * 0.57, y: y + height * 0.55 }],
      shield: [{ x: x + width * 0.71, y: y + height * 0.61 }, { x: cx - facing * width * 0.12, y: y + height * 0.76 }],
      "twin-halberds": [{ x: x + width * 0.79, y: y + height * 0.56 }, { x: x + width * 0.2, y: y + height * 0.57 }],
      "bamboo-scroll": [{ x: x + width * 0.75, y: y + height * 0.7 }, { x: x + width * 0.83, y: y + height * 0.74 }],
      "book-sword": [{ x: x + width * 0.75, y: y + height * 0.7 }, { x: x + width * 0.84, y: y + height * 0.73 }],
    };
    const fallbackPair = targets[art.weapon] || [
      { x: x + width * 0.74, y: y + height * 0.65 },
      { x: cx - facing * width * 0.1, y: y + height * 0.74 },
    ];
    const actionGripTargets = (action.grip || []).map((grip) => (
      art8GripTarget(x, y, width, height, cx, pose, action, grip)
    ));
    const pair = [
      actionGripTargets[0] || fallbackPair[0],
      actionGripTargets[1] || fallbackPair[1],
    ];
    const scholarGrip = ["feather-fan", "dark-fan", "bamboo-scroll", "book-sword"].includes(art.weapon);
    const archerGrip = art.weapon === "bow";
    const drawArm = (shoulderX, shoulderY, hand, near) => {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.52)";
      ctx.shadowBlur = width * 0.025;
      const armDX = hand.x - shoulderX;
      const armDY = hand.y - shoulderY;
      const armLength = Math.max(1, Math.hypot(armDX, armDY));
      const normalX = -armDY / armLength;
      const normalY = armDX / armLength;
      const shoulderHalf = width * (near ? 0.064 : 0.048) * figure.ribcageDepth;
      const wristHalf = width * (near ? 0.031 : 0.025)
        * (near ? figure.nearPalmDepth : figure.farPalmDepth);
      const elbowT = near ? figure.nearElbowT : figure.farElbowT;
      const elbowBend = width * (near ? figure.nearElbowBend : -figure.farElbowBend);
      const elbowX = lerp(shoulderX, hand.x, elbowT)
        + normalX * elbowBend
        + facing * width * action.shoulderSlope * (near ? 0.045 : -0.028);
      const elbowY = lerp(shoulderY, hand.y, elbowT)
        + normalY * elbowBend
        - height * (near ? 0.015 : 0.028);
      ctx.beginPath();
      ctx.moveTo(shoulderX + normalX * shoulderHalf, shoulderY + normalY * shoulderHalf);
      ctx.bezierCurveTo(
        elbowX + normalX * shoulderHalf * 0.82,
        elbowY + normalY * shoulderHalf * 0.82,
        lerp(elbowX, hand.x, 0.55) + normalX * wristHalf,
        lerp(elbowY, hand.y, 0.55) + normalY * wristHalf,
        hand.x + normalX * wristHalf,
        hand.y + normalY * wristHalf,
      );
      ctx.lineTo(hand.x - normalX * wristHalf, hand.y - normalY * wristHalf);
      ctx.bezierCurveTo(
        lerp(elbowX, hand.x, 0.55) - normalX * wristHalf,
        lerp(elbowY, hand.y, 0.55) - normalY * wristHalf,
        elbowX - normalX * shoulderHalf * 0.68,
        elbowY - normalY * shoulderHalf * 0.68,
        shoulderX - normalX * shoulderHalf,
        shoulderY - normalY * shoulderHalf,
      );
      ctx.closePath();
      const sleeve = ctx.createLinearGradient(
        shoulderX - normalX * shoulderHalf,
        shoulderY - normalY * shoulderHalf,
        hand.x + normalX * wristHalf,
        hand.y + normalY * wristHalf,
      );
      sleeve.addColorStop(0, portraitShiftColor(art.robe, near ? -0.12 : -0.4));
      sleeve.addColorStop(0.52, near ? portraitShiftColor(art.robe, 0.08) : portraitShiftColor(art.robe, -0.24));
      sleeve.addColorStop(1, portraitShiftColor(art.robe, -0.2));
      ctx.fillStyle = sleeve;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = near ? colorWithAlpha(pose.accent, 0.38) : "rgba(6,8,8,.36)";
      ctx.lineWidth = Math.max(0.8, width * 0.012);
      ctx.beginPath();
      ctx.moveTo(shoulderX + normalX * shoulderHalf * 0.56, shoulderY + normalY * shoulderHalf * 0.56);
      ctx.quadraticCurveTo(
        elbowX + normalX * wristHalf * 0.7,
        elbowY + normalY * wristHalf * 0.7,
        hand.x + normalX * wristHalf * 0.38,
        hand.y + normalY * wristHalf * 0.38,
      );
      ctx.stroke();
      const skin = faceProfile(art).tone;
      const cuffAngle = Math.atan2(hand.y - shoulderY, hand.x - shoulderX);
      ctx.save();
      ctx.translate(hand.x, hand.y);
      ctx.rotate(cuffAngle);
      const cuffLength = width * (scholarGrip ? 0.12 : archerGrip ? 0.075 : 0.09);
      const cuffHalf = width * (scholarGrip ? 0.07 : 0.052);
      ctx.beginPath();
      ctx.moveTo(-cuffLength, -cuffHalf);
      ctx.lineTo(width * 0.008, -cuffHalf * (scholarGrip ? 0.7 : 0.88));
      ctx.lineTo(width * 0.024, cuffHalf * 0.82);
      ctx.lineTo(-cuffLength, cuffHalf);
      ctx.closePath();
      const cuff = ctx.createLinearGradient(-cuffLength, -cuffHalf, width * 0.02, cuffHalf);
      cuff.addColorStop(0, portraitShiftColor(art.robe, -0.34));
      cuff.addColorStop(0.62, portraitShiftColor(art.robe, 0.12));
      cuff.addColorStop(1, portraitShiftColor(art.robe, -0.16));
      ctx.fillStyle = cuff;
      ctx.fill();
      ctx.strokeStyle = colorWithAlpha(pose.accent, 0.42);
      ctx.lineWidth = Math.max(0.5, width * 0.006);
      ctx.stroke();

      if (!scholarGrip) {
        ctx.fillStyle = archerGrip ? "#4f3427" : "#3a4143";
        roundedRect(
          ctx,
          -width * 0.018,
          -width * 0.055,
          width * 0.045,
          width * 0.11,
          width * 0.012,
        );
        ctx.fill();
      }

      const palmDepth = near ? figure.nearPalmDepth : figure.farPalmDepth;
      ctx.save();
      ctx.scale(1, palmDepth);
      const handGradient = ctx.createLinearGradient(0, -width * 0.05, width * 0.07, width * 0.05);
      handGradient.addColorStop(0, portraitShiftColor(skin, -0.2));
      handGradient.addColorStop(0.48, skin);
      handGradient.addColorStop(1, portraitShiftColor(skin, 0.24));
      // Tapered palm, thumb pad and curved knuckles replace the old rectangular
      // mitt while retaining a bold read at hand-card resolution.
      ctx.beginPath();
      ctx.moveTo(width * 0.002, -width * 0.034);
      ctx.bezierCurveTo(
        width * 0.026,
        -width * 0.05,
        width * 0.064,
        -width * 0.039,
        width * 0.074,
        -width * 0.014,
      );
      ctx.bezierCurveTo(
        width * 0.081,
        width * 0.01,
        width * 0.058,
        width * 0.046,
        width * 0.026,
        width * 0.052,
      );
      ctx.quadraticCurveTo(width * 0.006, width * 0.048, width * 0.001, width * 0.024);
      ctx.closePath();
      ctx.fillStyle = handGradient;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(width * 0.024, -width * 0.025);
      ctx.bezierCurveTo(
        width * 0.054,
        -width * 0.028,
        width * 0.09,
        -width * 0.006,
        width * 0.063,
        width * 0.02,
      );
      ctx.quadraticCurveTo(width * 0.036, width * 0.012, width * 0.024, -width * 0.025);
      ctx.fillStyle = portraitShiftColor(skin, 0.08);
      ctx.fill();
      if (!compact) {
        ctx.strokeStyle = "rgba(82,45,34,.45)";
        ctx.lineWidth = Math.max(0.4, width * 0.003);
        for (let finger = 0; finger < 3; finger += 1) {
          ctx.beginPath();
          const knuckleX = width * (0.034 + finger * 0.014);
          ctx.moveTo(knuckleX, -width * (0.026 - finger * 0.004));
          ctx.bezierCurveTo(
            knuckleX + width * 0.012,
            -width * 0.008,
            knuckleX + width * 0.008,
            width * 0.018,
            knuckleX - width * 0.004,
            width * (0.034 + finger * 0.003),
          );
          ctx.stroke();
        }
        ctx.strokeStyle = "rgba(255,218,181,.26)";
        ctx.beginPath();
        ctx.moveTo(width * 0.013, -width * 0.029);
        ctx.quadraticCurveTo(width * 0.03, -width * 0.044, width * 0.051, -width * 0.032);
        ctx.stroke();
        for (let joint = 0; joint < 3; joint += 1) {
          ellipsePath(
            ctx,
            width * (0.041 + joint * 0.013),
            width * (-0.019 + joint * 0.01),
            width * 0.006,
            width * 0.004,
          );
          ctx.fillStyle = joint % 2 ? "rgba(92,49,38,.34)" : "rgba(255,225,193,.3)";
          ctx.fill();
        }
      }
      ctx.restore();
      ctx.restore();
      ctx.restore();
    };
    drawArm(
      farX,
      y + height * (0.63 - action.shoulderSlope * 0.045),
      pair[1],
      false,
    );
    drawArm(
      nearX,
      y + height * (0.6 + action.shoulderSlope * 0.055),
      pair[0],
      true,
    );
  }

  function paintFaceValues(ctx, cx, cy, radius, art, pose, compact) {
    const profile = faceProfile(art);
    const structure = facialStructureProfile(art);
    const facing = art.facing || 1;
    painterlyFacePath(ctx, cx, cy, radius, art, pose);
    ctx.shadowColor = "rgba(0,0,0,.58)";
    ctx.shadowBlur = radius * 0.45;
    ctx.shadowOffsetY = radius * 0.18;
    ctx.fillStyle = portraitShiftColor(profile.tone, -0.44);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.save();
    painterlyFacePath(ctx, cx, cy, radius, art, pose);
    ctx.clip();
    const keyX = Math.cos(pose.keyAngle);
    const keyY = Math.sin(pose.keyAngle);
    const skin = ctx.createLinearGradient(
      cx - keyX * radius,
      cy - keyY * radius,
      cx + keyX * radius,
      cy + keyY * radius,
    );
    skin.addColorStop(0, portraitShiftColor(profile.tone, -0.5));
    skin.addColorStop(0.28, portraitShiftColor(profile.tone, -0.22));
    skin.addColorStop(0.56, profile.tone);
    skin.addColorStop(0.82, portraitShiftColor(profile.tone, 0.18));
    skin.addColorStop(1, portraitShiftColor(profile.tone, -0.08));
    ctx.fillStyle = skin;
    ctx.fillRect(cx - radius * 1.2, cy - radius * 1.2, radius * 2.5, radius * 2.5);

    const farShadow = ctx.createRadialGradient(
      cx - facing * radius * 0.54,
      cy + radius * 0.08,
      radius * 0.05,
      cx - facing * radius * 0.5,
      cy + radius * 0.12,
      radius * 0.9,
    );
    farShadow.addColorStop(0, "rgba(45,13,13,.48)");
    farShadow.addColorStop(0.62, "rgba(56,17,14,.22)");
    farShadow.addColorStop(1, "rgba(56,17,14,0)");
    ctx.fillStyle = farShadow;
    ctx.fillRect(cx - radius * 1.2, cy - radius, radius * 2.4, radius * 2.2);

    const cheek = ctx.createRadialGradient(
      cx + facing * radius * 0.38,
      cy + radius * 0.24,
      0,
      cx + facing * radius * 0.38,
      cy + radius * 0.24,
      radius * 0.58,
    );
    cheek.addColorStop(0, art.archetype === "crescent-blade-long-beard" ? "rgba(160,52,37,.48)" : "rgba(255,201,160,.35)");
    cheek.addColorStop(0.5, "rgba(226,129,95,.13)");
    cheek.addColorStop(1, "rgba(226,129,95,0)");
    ctx.fillStyle = cheek;
    ctx.fillRect(cx - radius, cy - radius, radius * 2.2, radius * 2.1);

    const highlight = ctx.createRadialGradient(
      cx + facing * radius * 0.28,
      cy - radius * 0.38,
      0,
      cx + facing * radius * 0.28,
      cy - radius * 0.38,
      radius * 0.64,
    );
    highlight.addColorStop(0, "rgba(255,239,205,.5)");
    highlight.addColorStop(0.42, "rgba(255,224,190,.19)");
    highlight.addColorStop(1, "rgba(255,224,190,0)");
    ctx.fillStyle = highlight;
    ctx.fillRect(cx - radius, cy - radius, radius * 2.1, radius * 1.65);

    const keyWash = ctx.createLinearGradient(
      cx - keyX * radius * 1.2,
      cy - keyY * radius * 1.2,
      cx + keyX * radius * 1.2,
      cy + keyY * radius * 1.2,
    );
    keyWash.addColorStop(0, colorWithAlpha(pose.keyTemp, 0));
    keyWash.addColorStop(0.58, colorWithAlpha(pose.keyTemp, 0.06 * pose.keyStrength));
    keyWash.addColorStop(1, colorWithAlpha(pose.keyTemp, 0.34 * pose.keyStrength));
    ctx.fillStyle = keyWash;
    ctx.fillRect(cx - radius * 1.3, cy - radius * 1.3, radius * 2.6, radius * 2.7);
    const bounce = ctx.createRadialGradient(
      cx - keyX * radius * 0.52,
      cy - keyY * radius * 0.18 + radius * 0.44,
      0,
      cx - keyX * radius * 0.52,
      cy - keyY * radius * 0.18 + radius * 0.44,
      radius * 0.8,
    );
    bounce.addColorStop(0, colorWithAlpha(pose.bounceColor, 0.2));
    bounce.addColorStop(1, colorWithAlpha(pose.bounceColor, 0));
    ctx.fillStyle = bounce;
    ctx.fillRect(cx - radius * 1.2, cy - radius, radius * 2.4, radius * 2.2);

    if (!compact) {
      const noise = seededNoise(hashString(art.archetype) ^ 0xd1337);
      ctx.lineCap = "round";
      for (let stroke = 0; stroke < 22; stroke += 1) {
        const strokeX = cx + (noise() - 0.5) * radius * 1.45;
        const strokeY = cy + (noise() - 0.36) * radius * 1.55;
        ctx.strokeStyle = noise() > 0.48 ? "rgba(255,235,198,.07)" : "rgba(83,32,25,.07)";
        ctx.lineWidth = radius * (0.035 + noise() * 0.075);
        ctx.beginPath();
        ctx.moveTo(strokeX, strokeY);
        ctx.lineTo(strokeX + facing * radius * (0.08 + noise() * 0.18), strokeY + (noise() - 0.5) * radius * 0.12);
        ctx.stroke();
      }
    }
    ctx.restore();
    painterlyFacePath(ctx, cx, cy, radius, art, pose);
    ctx.strokeStyle = colorWithAlpha(pose.rimColor, compact ? 0.42 : 0.24);
    ctx.lineWidth = Math.max(
      0.55,
      radius * (compact ? 0.065 : 0.035) * (structure.outlineScale || 1),
    );
    ctx.stroke();
  }

  function paintFacePlanes(ctx, cx, cy, radius, art, pose, compact) {
    const facing = art.facing || 1;
    const landmarks = faceLandmarks(art);
    const structure = facialStructureProfile(art);
    const expression = expressionGeometry(pose);
    const planeAlpha = compact ? 0.34 : 0.24;
    ctx.save();
    painterlyFacePath(ctx, cx, cy, radius, art, pose);
    ctx.clip();

    // 1. Far temple plane — establishes skull turn instead of a circular mask.
    ctx.fillStyle = `rgba(48,18,17,${planeAlpha + pose.yaw * 0.13})`;
    ctx.beginPath();
    ctx.moveTo(cx - facing * radius * 0.82, cy - radius * 0.72);
    ctx.lineTo(cx - facing * radius * 0.22, cy - radius * 0.48);
    ctx.lineTo(cx - facing * radius * 0.12, cy + radius * 0.18);
    ctx.lineTo(cx - facing * radius * 0.72, cy + radius * 0.5);
    ctx.closePath();
    ctx.fill();

    // 2. Brow-to-nose wedge — a hard key plane with a narrow bridge.
    ctx.fillStyle = colorWithAlpha(pose.keyTemp, compact ? 0.23 : 0.18);
    ctx.beginPath();
    ctx.moveTo(cx + facing * radius * (0.015 + structure.bridgeLean * 0.12), cy - radius * 0.5);
    ctx.lineTo(cx + facing * radius * (0.2 + structure.bridgeLean * 0.62), cy - radius * 0.23);
    ctx.lineTo(
      cx + facing * radius * (structure.tipProjection + pose.yaw * 0.07),
      cy + radius * (structure.bridgeLength - 0.06),
    );
    ctx.lineTo(cx + facing * radius * (0.11 + structure.alarWidth * 0.26), cy + radius * 0.27);
    ctx.closePath();
    ctx.fill();

    // 3. Near cheek plane — widened on square warriors, narrow on scholars.
    ctx.fillStyle = colorWithAlpha(
      pose.keyTemp,
      planeAlpha * (0.52 + landmarks.jawAngle * 0.34),
    );
    ctx.beginPath();
    ctx.moveTo(cx + facing * radius * 0.24, cy + radius * 0.1);
    ctx.lineTo(cx + facing * radius * 0.72, cy + radius * 0.23);
    ctx.lineTo(cx + facing * radius * 0.53, cy + radius * 0.61);
    ctx.lineTo(cx + facing * radius * 0.08, cy + radius * 0.48);
    ctx.closePath();
    ctx.fill();

    // 4. Jaw plane — the opposite value keeps the lower face from ballooning.
    ctx.fillStyle = `rgba(55,21,18,${compact ? 0.36 : 0.28})`;
    ctx.beginPath();
    ctx.moveTo(cx - facing * radius * 0.62, cy + radius * 0.42);
    ctx.lineTo(cx + facing * radius * 0.04, cy + radius * 0.55);
    ctx.lineTo(cx + facing * radius * (0.18 + landmarks.chinPoint * 0.2), cy + radius * landmarks.faceLength);
    ctx.lineTo(cx - facing * radius * 0.4, cy + radius * 0.88);
    ctx.closePath();
    ctx.fill();

    // 5. Chin/bounce plane changes with expression and catches armor colour.
    ctx.fillStyle = colorWithAlpha(pose.bounceColor, compact ? 0.34 : 0.24);
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.25, cy + radius * 0.74);
    ctx.quadraticCurveTo(
      cx + facing * radius * expression.mouthTilt * 1.8,
      cy + radius * (0.94 + landmarks.chinPoint * 0.18),
      cx + radius * 0.3,
      cy + radius * 0.73,
    );
    ctx.lineTo(cx + facing * radius * 0.1, cy + radius * landmarks.faceLength);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = colorWithAlpha(pose.keyTemp, compact ? 0.34 : 0.2);
    ctx.lineWidth = Math.max(0.45, radius * (compact ? 0.045 : 0.026));
    ctx.beginPath();
    ctx.moveTo(cx + facing * radius * 0.16, cy - radius * 0.42);
    ctx.lineTo(cx + facing * radius * 0.32, cy + radius * 0.34);
    ctx.moveTo(cx + facing * radius * 0.2, cy + radius * 0.12);
    ctx.lineTo(cx + facing * radius * 0.58, cy + radius * 0.3);
    ctx.stroke();
    ctx.restore();
  }

  function paintFacialDepthV8(ctx, cx, cy, radius, art, pose, compact) {
    const figure = art8FigureProfile(art);
    const structure = facialStructureProfile(art);
    const facing = art.facing || 1;
    const orbitX = cx + facing * radius * (0.12 + pose.yaw * 0.08);
    const orbitY = cy - radius * 0.2;
    ctx.save();
    painterlyFacePath(ctx, cx, cy, radius, art, pose);
    ctx.clip();

    const orbit = ctx.createRadialGradient(
      orbitX - facing * radius * 0.12,
      orbitY,
      radius * 0.035,
      orbitX,
      orbitY,
      radius * (0.52 + figure.faceOrbitDepth * 0.12),
    );
    orbit.addColorStop(0, `rgba(46,18,19,${compact ? 0.34 : 0.3 * figure.faceOrbitDepth})`);
    orbit.addColorStop(0.56, "rgba(72,29,25,.13)");
    orbit.addColorStop(1, "rgba(72,29,25,0)");
    ctx.fillStyle = orbit;
    ellipsePath(
      ctx,
      orbitX,
      orbitY,
      radius * (0.64 + pose.yaw * 0.08),
      radius * (0.28 + figure.faceOrbitDepth * 0.055),
    );
    ctx.fill();

    // The nose casts a narrow wedge across the far cheek.  Its direction
    // follows the same yaw that shapes the skull, preventing a pasted-on nose.
    ctx.fillStyle = `rgba(55,21,18,${compact ? 0.28 : 0.2 + figure.faceOrbitDepth * 0.08})`;
    ctx.beginPath();
    ctx.moveTo(
      cx + facing * radius * (0.13 + structure.bridgeLean * 0.18),
      cy - radius * 0.35,
    );
    ctx.lineTo(
      cx + facing * radius * (structure.tipProjection + pose.yaw * 0.09),
      cy + radius * structure.bridgeLength,
    );
    ctx.lineTo(
      cx - facing * radius * (0.02 + pose.yaw * 0.07),
      cy + radius * (structure.bridgeLength + 0.18),
    );
    ctx.closePath();
    ctx.fill();

    const cheekX = cx + facing * radius * (0.39 + figure.cheekProjection * 0.08);
    const cheekY = cy + radius * 0.2;
    const cheek = ctx.createRadialGradient(
      cheekX,
      cheekY,
      0,
      cheekX,
      cheekY,
      radius * 0.46,
    );
    cheek.addColorStop(0, colorWithAlpha(pose.keyTemp, compact ? 0.24 : 0.19));
    cheek.addColorStop(0.5, colorWithAlpha(pose.keyTemp, 0.07));
    cheek.addColorStop(1, colorWithAlpha(pose.keyTemp, 0));
    ctx.fillStyle = cheek;
    ellipsePath(
      ctx,
      cheekX,
      cheekY,
      radius * 0.5 * figure.cheekProjection,
      radius * 0.34,
    );
    ctx.fill();

    if (!compact) {
      ctx.strokeStyle = "rgba(59,24,21,.32)";
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(0.5, radius * 0.035);
      ctx.beginPath();
      ctx.moveTo(cx - facing * radius * 0.18, cy + radius * 0.46);
      ctx.quadraticCurveTo(
        cx + facing * radius * 0.05,
        cy + radius * 0.59,
        cx + facing * radius * 0.28,
        cy + radius * 0.47,
      );
      ctx.stroke();
      ctx.strokeStyle = colorWithAlpha(pose.bounceColor, 0.3);
      ctx.lineWidth = Math.max(0.45, radius * 0.027);
      ctx.beginPath();
      ctx.moveTo(cx - facing * radius * 0.31, cy + radius * 0.76);
      ctx.quadraticCurveTo(
        cx,
        cy + radius * (0.88 + figure.cheekProjection * 0.05),
        cx + facing * radius * 0.29,
        cy + radius * 0.72,
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintAnatomicalBrushworkV7(ctx, cx, cy, radius, art, pose, compact) {
    const profile = faceArt7Profile(art);
    const structure = facialStructureProfile(art);
    const facing = art.facing || 1;
    const noise = seededNoise(hashString(`${art.archetype}|anatomy-v7|${profile.brushSeed}`));
    const broadPlanes = [
      // temple turn
      { x1: -0.67, y1: -0.5, cx: -0.42, cy: -0.61, x2: -0.18, y2: -0.42, tone: "cool", width: 0.15 },
      // deep eye socket
      { x1: -0.29, y1: -0.18, cx: -0.03, cy: -0.31, x2: 0.29, y2: -0.17, tone: "cool", width: 0.13 },
      // brow into nose ridge
      { x1: 0.04, y1: -0.46, cx: 0.19, cy: -0.04, x2: structure.tipProjection, y2: structure.bridgeLength, tone: "warm", width: 0.095 },
      // high cheek plane
      { x1: 0.18, y1: 0.13, cx: 0.5, cy: 0.08, x2: 0.59, y2: 0.39, tone: "warm", width: 0.17 },
      // nasolabial turn
      { x1: 0.27, y1: 0.38, cx: 0.17, cy: 0.51, x2: 0.32, y2: 0.69, tone: "cool", width: 0.085 },
      // jaw occlusion
      { x1: -0.46, y1: 0.54, cx: -0.08, cy: 0.9, x2: 0.43, y2: 0.76, tone: "cool", width: 0.16 },
      // chin bounce
      { x1: -0.2, y1: 0.79, cx: 0.03, cy: 0.92, x2: 0.29, y2: 0.79, tone: "warm", width: 0.09 },
    ];
    ctx.save();
    painterlyFacePath(ctx, cx, cy, radius, art, pose);
    ctx.clip();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    broadPlanes.forEach((plane, index) => {
      const isWarm = plane.tone === "warm";
      const alpha = compact
        ? isWarm ? 0.2 : 0.22 + profile.jawShade * 0.06
        : isWarm ? 0.14 + profile.roughness * 0.04 : 0.15 + profile.jawShade * 0.08;
      ctx.strokeStyle = colorWithAlpha(isWarm ? profile.warm : profile.cool, alpha);
      ctx.lineWidth = Math.max(
        0.55,
        radius * plane.width * (compact ? 1.05 : 0.82) * (index === 5 ? 0.8 + profile.jawShade * 0.35 : 1),
      );
      ctx.beginPath();
      ctx.moveTo(cx + facing * radius * plane.x1, cy + radius * plane.y1);
      ctx.quadraticCurveTo(
        cx + facing * radius * plane.cx,
        cy + radius * plane.cy,
        cx + facing * radius * plane.x2,
        cy + radius * plane.y2,
      );
      ctx.stroke();
    });

    const microStrokeCount = art7BrushBudget(art, compact) - broadPlanes.length;
    for (let stroke = 0; stroke < microStrokeCount; stroke += 1) {
      const theta = -0.78 + noise() * 1.56;
      const radial = radius * (0.26 + noise() * 0.45);
      const sx = cx + facing * (radius * 0.08 + Math.cos(theta) * radial);
      const sy = cy + radius * (0.08 + Math.sin(theta) * radial * 0.86);
      const length = radius * (0.055 + noise() * (0.08 + profile.roughness * 0.08));
      const warm = noise() > 0.43 + profile.roughness * 0.12;
      ctx.strokeStyle = colorWithAlpha(
        warm ? profile.warm : profile.cool,
        0.045 + noise() * (0.035 + profile.roughness * 0.035),
      );
      ctx.lineWidth = Math.max(0.34, radius * (0.014 + noise() * 0.025));
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(
        sx + facing * length,
        sy + (noise() - 0.5) * radius * 0.045,
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintSkinMicrostructure(ctx, cx, cy, radius, art, pose, compact) {
    const facing = art.facing || 1;
    const structure = facialStructureProfile(art);
    const art7 = faceArt7Profile(art);
    const noise = seededNoise(hashString(`${art.archetype}|skin-v7|${art7.brushSeed}`));
    ctx.save();
    ctx.lineCap = "round";

    // Warm key on the bony ridge, cool armor bounce under the jaw.  The two
    // temperatures stay broad in HAND size and divide into fine strokes only
    // in the inspector.
    ctx.strokeStyle = colorWithAlpha(art7.warm, compact ? 0.34 : 0.24 + art7.roughness * 0.05);
    ctx.lineWidth = Math.max(0.52, radius * (compact ? 0.052 : 0.027));
    ctx.beginPath();
    ctx.moveTo(
      cx + facing * radius * (0.1 + structure.bridgeLean * 0.22),
      cy - radius * 0.46,
    );
    ctx.quadraticCurveTo(
      cx + facing * radius * (0.22 + structure.tipProjection * 0.36),
      cy - radius * 0.02,
      cx + facing * radius * (structure.tipProjection + 0.07),
      cy + radius * (structure.bridgeLength - 0.02),
    );
    ctx.moveTo(cx + facing * radius * 0.3, cy + radius * 0.16);
    ctx.quadraticCurveTo(
      cx + facing * radius * 0.58,
      cy + radius * 0.19,
      cx + facing * radius * 0.48,
      cy + radius * 0.5,
    );
    ctx.stroke();

    ctx.strokeStyle = colorWithAlpha(art7.cool, compact ? 0.5 : 0.36 + art7.jawShade * 0.12);
    ctx.lineWidth = Math.max(0.5, radius * (compact ? 0.046 : 0.031));
    ctx.beginPath();
    ctx.moveTo(cx - facing * radius * 0.54, cy + radius * 0.52);
    ctx.quadraticCurveTo(
      cx,
      cy + radius * 0.92,
      cx + facing * radius * 0.34,
      cy + radius * 0.72,
    );
    ctx.stroke();

    if (!compact) {
      // Sparse value-grouped pores follow the cheek cylinder. They are capped
      // at fourteen marks so texture never turns into full-frame noise.
      const poreCount = Math.round(7 + art7.roughness * 11);
      for (let pore = 0; pore < poreCount; pore += 1) {
        const theta = -0.42 + noise() * 0.86;
        const radial = radius * (0.28 + noise() * 0.34);
        const px = cx + facing * (radius * 0.2 + Math.cos(theta) * radial);
        const py = cy + radius * 0.16 + Math.sin(theta) * radial * 0.66;
        ctx.fillStyle = noise() > 0.52
          ? colorWithAlpha(art7.warm, 0.08 + art7.roughness * 0.04)
          : colorWithAlpha(art7.cool, 0.09 + art7.roughness * 0.05);
        ellipsePath(ctx, px, py, radius * 0.018, radius * 0.012);
        ctx.fill();
      }

      // Beard roots taper out of the skin instead of beginning at a hard mask.
      if (art.beard !== "none") {
        const whiteBeard = String(art.beard).startsWith("white");
        const rootCount = ["long", "white-long", "wild"].includes(art.beard) ? 18 : 11;
        ctx.strokeStyle = whiteBeard ? "rgba(118,108,94,.46)" : "rgba(47,28,24,.58)";
        ctx.lineWidth = Math.max(0.36, radius * 0.018);
        for (let root = 0; root < rootCount; root += 1) {
          const along = rootCount <= 1 ? 0 : root / (rootCount - 1) - 0.5;
          const rootX = cx + along * radius * (art.beard === "wild" ? 1.42 : 0.82);
          const rootY = cy + radius * (0.41 + Math.abs(along) * 0.22 + noise() * 0.07);
          ctx.beginPath();
          ctx.moveTo(rootX, rootY);
          ctx.quadraticCurveTo(
            rootX + facing * radius * (noise() - 0.4) * 0.08,
            rootY + radius * 0.08,
            rootX + facing * radius * (noise() - 0.5) * 0.13,
            rootY + radius * (0.16 + noise() * 0.08),
          );
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function paintFacialFeatures(ctx, cx, cy, radius, art, pose, compact) {
    const facing = art.facing || 1;
    const landmarks = faceLandmarks(art);
    const structure = facialStructureProfile(art);
    const expression = expressionGeometry(pose);
    const art7 = faceArt7Profile(art);
    const farEyeX = cx - facing * radius * (landmarks.eyeSpacing + art7.eyeSet) * (0.72 + pose.yaw * 0.18);
    const nearEyeX = cx + facing * radius * (landmarks.eyeSpacing + art7.eyeSet);
    const farEyeY = cy + radius * landmarks.asymmetry * 0.24 + radius * art7.gazeY * 0.08;
    const nearEyeY = cy - radius * landmarks.asymmetry * 0.2 + radius * art7.gazeY * 0.08;
    const farBrowY = cy + radius * (landmarks.browY + landmarks.asymmetry * 0.1 + expression.browSlope * 0.34 - art7.browArch * 0.11);
    const nearBrowY = cy + radius * (landmarks.browY - landmarks.asymmetry * 0.12 - expression.browSlope * 0.38 - art7.browArch * 0.14);
    const farEyeWidth = radius * (0.2 - pose.yaw * 0.06) * art7.eyeWidth;
    const nearEyeWidth = radius * 0.27 * art7.eyeWidth;
    const fierce = ["fury", "glare", "scarred", "charge", "raider", "arrogant"].includes(pose.expression);
    const calm = ["gentle", "calm", "measured", "steady"].includes(pose.expression);
    const weiFeatureCatchlight = WEI_PORTRAIT_ARCHETYPES.has(art.archetype);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const socket = ctx.createRadialGradient(
      nearEyeX - facing * radius * 0.04,
      nearEyeY - radius * 0.01,
      0,
      nearEyeX,
      nearEyeY,
      radius * 0.43,
    );
    socket.addColorStop(0, "rgba(78,34,29,.28)");
    socket.addColorStop(0.62, "rgba(84,37,31,.12)");
    socket.addColorStop(1, "rgba(84,37,31,0)");
    ctx.fillStyle = socket;
    ellipsePath(ctx, nearEyeX, nearEyeY - radius * 0.01, radius * 0.43, radius * 0.27);
    ctx.fill();
    ctx.fillStyle = "rgba(71,31,27,.12)";
    ellipsePath(ctx, farEyeX, farEyeY, radius * 0.29, radius * 0.21);
    ctx.fill();

    const earX = cx - facing * radius * (0.5 + landmarks.templeWidth * 0.24);
    const earY = cy + radius * landmarks.earY;
    const ear = ctx.createRadialGradient(earX - facing * radius * 0.05, earY - radius * 0.05, 0, earX, earY, radius * 0.23);
    ear.addColorStop(0, portraitShiftColor(faceProfile(art).tone, 0.18));
    ear.addColorStop(1, portraitShiftColor(faceProfile(art).tone, -0.24));
    ellipsePath(ctx, earX, earY, radius * (0.14 + landmarks.asymmetry * 0.08), radius * 0.22);
    ctx.fillStyle = ear;
    ctx.fill();

    ctx.strokeStyle = "rgba(39,20,17,.78)";
    ctx.lineWidth = Math.max(0.8, radius * (compact ? 0.1 : 0.075));
    const browLift = fierce ? -0.13 : calm ? -0.04 : -0.08;
    ctx.beginPath();
    ctx.moveTo(farEyeX - facing * farEyeWidth, farBrowY + radius * 0.02);
    ctx.quadraticCurveTo(farEyeX, farBrowY + radius * browLift * 0.46, farEyeX + facing * farEyeWidth, farBrowY + radius * (fierce ? 0.08 : 0.04));
    ctx.moveTo(nearEyeX - facing * nearEyeWidth, nearBrowY + radius * (fierce ? 0.08 : 0.03));
    ctx.quadraticCurveTo(nearEyeX, nearBrowY + radius * browLift * 0.54, nearEyeX + facing * nearEyeWidth, nearBrowY);
    ctx.stroke();

    ctx.strokeStyle = "rgba(58,28,23,.76)";
    ctx.lineWidth = Math.max(0.7, radius * 0.055);
    ctx.beginPath();
    ctx.moveTo(farEyeX - facing * farEyeWidth * 0.78, farEyeY + radius * 0.015);
    ctx.quadraticCurveTo(
      farEyeX,
      farEyeY + radius * (fierce ? 0.07 : 0.09) * expression.eyeOpen,
      farEyeX + facing * farEyeWidth * 0.72,
      farEyeY + radius * 0.01,
    );
    ctx.moveTo(nearEyeX - facing * nearEyeWidth * 0.86, nearEyeY + radius * 0.02);
    ctx.quadraticCurveTo(
      nearEyeX,
      nearEyeY + radius * (fierce ? 0.075 : 0.1) * expression.eyeOpen,
      nearEyeX + facing * nearEyeWidth * 0.88,
      nearEyeY + radius * 0.01,
    );
    ctx.stroke();
    ctx.fillStyle = "#171314";
    ellipsePath(
      ctx,
      nearEyeX + facing * radius * (0.035 + art7.gazeX * 0.055),
      nearEyeY + radius * (0.035 + art7.gazeY * 0.08),
      radius * 0.055,
      radius * 0.065,
    );
    ctx.fill();
    if (!compact && pose.yaw < 0.76) {
      ellipsePath(
        ctx,
        farEyeX + facing * radius * (0.015 + art7.gazeX * 0.04),
        farEyeY + radius * (0.035 + art7.gazeY * 0.06),
        radius * 0.042,
        radius * 0.052,
      );
      ctx.fill();
    }
    ctx.fillStyle = weiFeatureCatchlight ? "rgba(255,206,146,.86)" : "rgba(245,226,190,.78)";
    const catchlightRadius = Math.max(0.62, radius * (weiFeatureCatchlight ? 0.022 : 0.015));
    ellipsePath(
      ctx,
      nearEyeX + facing * radius * (0.052 + art7.gazeX * 0.055),
      nearEyeY + radius * (0.012 + art7.gazeY * 0.08),
      catchlightRadius,
      catchlightRadius,
    );
    ctx.fill();
    if (
      compact
      || ["serpent-spear-wild-beard", "twin-halberds-giant", "bells-headscarf-raider", "phoenix-crown-halberd"].includes(art.archetype)
    ) {
      ctx.strokeStyle = "rgba(255,218,174,.48)";
      ctx.lineWidth = Math.max(0.65, radius * 0.042);
      ctx.beginPath();
      ctx.moveTo(nearEyeX - facing * nearEyeWidth * 0.72, nearEyeY - radius * 0.015);
      ctx.quadraticCurveTo(nearEyeX, nearEyeY - radius * 0.075, nearEyeX + facing * nearEyeWidth * 0.65, nearEyeY - radius * 0.025);
      ctx.moveTo(cx + facing * radius * 0.17, cy + radius * 0.01);
      ctx.lineTo(cx + facing * radius * 0.27, cy + radius * 0.28);
      ctx.stroke();
    }

    const bridgeStartX = cx + facing * radius * (
      0.055 + structure.bridgeLean * 0.32 + landmarks.asymmetry * 0.16
    );
    const bridgeStartY = cy - radius * (0.08 + structure.bridgeLength * 0.1);
    const noseTipX = cx + facing * radius * (
      structure.tipProjection + pose.yaw * 0.08
    );
    const noseTipY = cy + radius * (
      structure.bridgeLength * art7.noseLength + expression.nostrilLift
    );
    const bridgeBendX = cx + facing * radius * (
      structure.bridgeLean + structure.bridgeBow * 0.6 + art7.noseRidge * 0.16
    );
    ctx.strokeStyle = "rgba(92,49,37,.78)";
    ctx.lineWidth = Math.max(0.7, radius * (compact ? 0.057 : 0.048));
    ctx.beginPath();
    ctx.moveTo(bridgeStartX, bridgeStartY);
    ctx.bezierCurveTo(
      bridgeBendX,
      cy + radius * 0.12,
      cx + facing * radius * (structure.bridgeLean - structure.bridgeBow),
      cy + radius * (structure.bridgeLength * 0.78),
      noseTipX,
      noseTipY,
    );
    ctx.stroke();
    if (weiFeatureCatchlight) {
      ctx.strokeStyle = "rgba(255,188,120,.24)";
      ctx.lineWidth = Math.max(0.58, radius * 0.025);
      ctx.beginPath();
      ctx.moveTo(
        bridgeStartX + facing * radius * 0.025,
        bridgeStartY + radius * 0.015,
      );
      ctx.quadraticCurveTo(
        bridgeBendX + facing * radius * 0.03,
        cy + radius * 0.16,
        noseTipX - facing * radius * 0.045,
        noseTipY - radius * 0.075,
      );
      ctx.stroke();
    }

    // The alar plane is asymmetric and family-specific rather than a shared
    // round triangle. Broad warriors flare; scholars retain a pinched wing.
    const alarY = noseTipY + radius * structure.alarDrop;
    const alarInnerX = noseTipX - facing * radius * structure.alarWidth;
    ctx.fillStyle = "rgba(88,43,34,.38)";
    ctx.beginPath();
    ctx.moveTo(noseTipX, noseTipY - radius * 0.025);
    ctx.quadraticCurveTo(
      noseTipX + facing * radius * structure.alarWidth * 0.34,
      alarY + radius * 0.04,
      alarInnerX,
      alarY,
    );
    ctx.quadraticCurveTo(
      cx + facing * radius * (structure.bridgeLean + 0.035),
      noseTipY + radius * 0.09,
      noseTipX,
      noseTipY - radius * 0.025,
    );
    ctx.fill();
    ctx.strokeStyle = "rgba(63,29,25,.72)";
    ctx.lineWidth = Math.max(0.55, radius * 0.035);
    ctx.beginPath();
    ctx.moveTo(alarInnerX, alarY);
    ctx.quadraticCurveTo(
      alarInnerX + facing * radius * structure.alarWidth * 0.46,
      alarY + radius * 0.055,
      noseTipX + facing * radius * structure.alarWidth * 0.12,
      noseTipY + radius * 0.015,
    );
    ctx.stroke();
    if (!compact) {
      ctx.strokeStyle = "rgba(255,220,181,.28)";
      ctx.lineWidth = radius * 0.032;
      ctx.beginPath();
      ctx.moveTo(
        bridgeStartX + facing * radius * 0.035,
        bridgeStartY + radius * 0.02,
      );
      ctx.quadraticCurveTo(
        bridgeBendX + facing * radius * 0.04,
        cy + radius * 0.18,
        noseTipX - facing * radius * 0.055,
        noseTipY - radius * 0.055,
      );
      ctx.stroke();
    }

    const mouthY = cy + radius * (
      0.59
      + (landmarks.faceLength - 1) * 0.18
      + structure.philtrumLength * 0.13
      + (structure.mouthYShift || 0)
    );
    const philtrumX = cx + facing * radius * (
      0.045 + structure.bridgeLean * 0.08
    );
    const philtrumTop = noseTipY + radius * (0.055 + structure.philtrumLength * 0.08);
    ctx.strokeStyle = "rgba(85,43,35,.44)";
    ctx.lineWidth = Math.max(0.45, radius * (compact ? 0.033 : 0.026));
    ctx.beginPath();
    ctx.moveTo(philtrumX - radius * 0.04, philtrumTop);
    ctx.quadraticCurveTo(
      philtrumX - radius * 0.025,
      lerp(philtrumTop, mouthY, 0.62),
      cx - radius * structure.upperBow,
      mouthY - radius * 0.018,
    );
    ctx.moveTo(philtrumX + radius * 0.035, philtrumTop);
    ctx.quadraticCurveTo(
      philtrumX + radius * 0.02,
      lerp(philtrumTop, mouthY, 0.64),
      cx + radius * structure.upperBow,
      mouthY - radius * 0.018,
    );
    ctx.stroke();

    const mouthHalf = radius * landmarks.mouthWidth * 0.5 * (structure.mouthWidthScale || 1) * art7.mouthWidth;
    const mouthTilt = expression.mouthTilt + art7.mouthTilt * 0.38;
    ctx.strokeStyle = "rgba(84,35,31,.92)";
    ctx.lineWidth = Math.max(0.72, radius * 0.065 * (structure.mouthStrokeScale || 1));
    ctx.beginPath();
    ctx.moveTo(cx - mouthHalf, mouthY - facing * radius * (mouthTilt + landmarks.asymmetry * 0.08));
    ctx.bezierCurveTo(
      cx - radius * structure.upperBow,
      mouthY - radius * (structure.upperBow + expression.mouthCurve * 0.28),
      cx + radius * structure.upperBow,
      mouthY + radius * (structure.lowerFullness + expression.mouthCurve),
      cx + mouthHalf,
      mouthY + facing * radius * (
        mouthTilt - landmarks.asymmetry * 0.08 + structure.cornerTension
      ),
    );
    ctx.stroke();
    if (!compact && structure.lowerFullness > 0.015) {
      ctx.strokeStyle = "rgba(190,104,86,.3)";
      ctx.lineWidth = Math.max(0.45, radius * 0.028);
      ctx.beginPath();
      ctx.moveTo(cx - mouthHalf * 0.68, mouthY + radius * 0.055);
      ctx.quadraticCurveTo(
        cx + facing * radius * 0.025,
        mouthY + radius * (0.07 + structure.lowerFullness),
        cx + mouthHalf * 0.58,
        mouthY + radius * 0.045,
      );
      ctx.stroke();
    }

    if (!compact && (faceProfile(art).age >= 2 || pose.expression === "tired")) {
      ctx.strokeStyle = "rgba(77,40,33,.28)";
      ctx.lineWidth = Math.max(0.5, radius * 0.032);
      for (let wrinkle = 0; wrinkle < Math.min(3, faceProfile(art).age + 1); wrinkle += 1) {
        ctx.beginPath();
        ctx.moveTo(cx - facing * radius * 0.46, cy - radius * (0.4 - wrinkle * 0.09));
        ctx.quadraticCurveTo(cx, cy - radius * (0.48 - wrinkle * 0.07), cx + facing * radius * 0.39, cy - radius * (0.41 - wrinkle * 0.08));
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function paintIndividualFaceMarksV7(ctx, cx, cy, radius, art, pose, compact) {
    const profile = faceArt7Profile(art);
    const landmarks = faceLandmarks(art);
    const facing = art.facing || 1;
    const nearEyeX = cx + facing * radius * (landmarks.eyeSpacing + profile.eyeSet);
    const nearBrowY = cy + radius * (
      landmarks.browY
      - landmarks.asymmetry * 0.12
      - expressionGeometry(pose).browSlope * 0.38
      - profile.browArch * 0.14
    );
    const browBreakX = nearEyeX + facing * radius * profile.browBreak * 0.22;
    ctx.save();
    ctx.lineCap = "round";

    // A tiny skin-coloured interruption is enough to give every eyebrow a
    // different rhythm, and remains legible in the 96px HAND portrait.
    ctx.strokeStyle = colorWithAlpha(profile.warm, compact ? 0.82 : 0.68);
    ctx.lineWidth = Math.max(0.7, radius * (compact ? 0.09 : 0.062));
    ctx.beginPath();
    ctx.moveTo(browBreakX - facing * radius * 0.025, nearBrowY);
    ctx.lineTo(browBreakX + facing * radius * 0.025, nearBrowY - radius * profile.browArch * 0.03);
    ctx.stroke();

    ctx.strokeStyle = colorWithAlpha(profile.warm, compact ? 0.48 : 0.34);
    ctx.lineWidth = Math.max(0.55, radius * (compact ? 0.045 : 0.03));
    ctx.beginPath();
    ctx.moveTo(cx + facing * radius * (0.13 + profile.noseRidge * 0.08), cy - radius * 0.36);
    ctx.quadraticCurveTo(
      cx + facing * radius * (0.22 + profile.noseRidge * 0.2),
      cy + radius * 0.02,
      cx + facing * radius * (0.31 + profile.noseRidge * 0.1),
      cy + radius * (0.3 + (profile.noseLength - 1) * 0.18),
    );
    ctx.stroke();

    const iconicScars = new Set([
      "brow-cut",
      "cheek-rake",
      "eye-cross",
      "jaw-gouge",
      "nose-slash",
      "forehead-burn",
      "temple-hook",
    ]);
    if (profile.scar !== "none" && (!compact || iconicScars.has(profile.scar))) {
      const scarNoise = seededNoise(hashString(`${art.archetype}|${profile.scar}|scar-v7`));
      const scarSide = scarNoise() > 0.5 ? 1 : -1;
      const scarX = cx + facing * radius * (
        profile.scar.includes("nose") ? 0.16 : profile.scar.includes("jaw") ? -0.24 : 0.34 * scarSide
      );
      const scarY = cy + radius * (
        profile.scar.includes("forehead") || profile.scar.includes("brow") || profile.scar.includes("temple")
          ? -0.48
          : profile.scar.includes("jaw") || profile.scar.includes("chin")
            ? 0.62
            : 0.12
      );
      const cutCount = profile.scar === "cheek-rake" ? 3 : profile.scar === "eye-cross" ? 2 : 1;
      ctx.strokeStyle = "rgba(111,39,34,.72)";
      ctx.lineWidth = Math.max(0.6, radius * (compact ? 0.045 : 0.032));
      for (let cut = 0; cut < cutCount; cut += 1) {
        const offset = (cut - (cutCount - 1) * 0.5) * radius * 0.1;
        ctx.beginPath();
        ctx.moveTo(scarX + offset, scarY - radius * 0.16);
        ctx.quadraticCurveTo(
          scarX - facing * radius * (0.02 + scarNoise() * 0.06) + offset,
          scarY,
          scarX + facing * radius * (0.08 + scarNoise() * 0.07) + offset,
          scarY + radius * 0.18,
        );
        ctx.stroke();
        if (!compact) {
          ctx.strokeStyle = "rgba(244,155,126,.28)";
          ctx.lineWidth = Math.max(0.35, radius * 0.014);
          ctx.stroke();
          ctx.strokeStyle = "rgba(111,39,34,.72)";
          ctx.lineWidth = Math.max(0.6, radius * 0.032);
        }
      }
    }

    if (!compact && profile.wrinkle !== "none") {
      const wrinkleNoise = seededNoise(hashString(`${art.archetype}|${profile.wrinkle}|wrinkle-v7`));
      const wrinkleCount = Math.round(2 + faceProfile(art).age * 0.75 + profile.roughness * 2);
      ctx.strokeStyle = colorWithAlpha(profile.cool, 0.22 + profile.roughness * 0.08);
      ctx.lineWidth = Math.max(0.38, radius * 0.018);
      for (let wrinkle = 0; wrinkle < wrinkleCount; wrinkle += 1) {
        const wy = cy - radius * (0.37 - wrinkle * 0.075);
        const drift = (wrinkleNoise() - 0.5) * radius * 0.06;
        ctx.beginPath();
        ctx.moveTo(cx - facing * radius * (0.38 + wrinkleNoise() * 0.1), wy + drift);
        ctx.quadraticCurveTo(
          cx + facing * radius * profile.browArch * 0.16,
          wy - radius * (0.04 + wrinkleNoise() * 0.035),
          cx + facing * radius * (0.34 + wrinkleNoise() * 0.08),
          wy + drift * 0.35,
        );
        ctx.stroke();
      }
    }

    // Mouth-corner occlusion makes the expression survive after beard and
    // moustache paint is added.
    const mouthY = cy + radius * (0.6 + (landmarks.faceLength - 1) * 0.18);
    ctx.strokeStyle = colorWithAlpha(profile.cool, compact ? 0.52 : 0.38);
    ctx.lineWidth = Math.max(0.55, radius * (compact ? 0.052 : 0.034));
    ctx.beginPath();
    ctx.moveTo(cx + facing * radius * 0.17, mouthY);
    ctx.lineTo(
      cx + facing * radius * (0.3 + profile.mouthWidth * 0.04),
      mouthY + radius * profile.mouthTilt * 0.24,
    );
    ctx.stroke();
    ctx.restore();
  }

  function paintHairEdgeResponseV7(ctx, cx, cy, radius, art, pose, compact) {
    const profile = faceArt7Profile(art);
    const facing = art.facing || 1;
    const noise = seededNoise(hashString(`${art.archetype}|hair-edge-v7|${profile.brushSeed}`));
    const strandCount = compact ? 4 : Math.round(8 + (1 - profile.hairSoftness) * 8);
    ctx.save();
    ctx.lineCap = profile.hairSoftness > 0.58 ? "round" : "butt";
    ctx.shadowColor = colorWithAlpha(pose.rimColor, 0.22);
    ctx.shadowBlur = radius * profile.hairSoftness * 0.08;
    for (let strand = 0; strand < strandCount; strand += 1) {
      const t = (strand + 0.15 + noise() * 0.7) / strandCount;
      const angle = Math.PI * (1.04 + t * 0.92);
      const sx = cx + Math.cos(angle) * radius * 1.01;
      const sy = cy + Math.sin(angle) * radius * 0.94 - radius * 0.08;
      const length = radius * (0.12 + noise() * (compact ? 0.12 : 0.25));
      ctx.strokeStyle = strand % 3
        ? colorWithAlpha(pose.rimColor, compact ? 0.34 : 0.25)
        : "rgba(2,4,5,.7)";
      ctx.lineWidth = Math.max(
        0.45,
        radius * (0.018 + profile.hairSoftness * 0.025 + noise() * 0.018),
      );
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(
        sx + facing * length * (noise() - 0.46),
        sy - length * 0.48,
        sx + facing * length * (noise() - 0.42),
        sy - length,
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintBeardEdgeResponseV7(ctx, cx, cy, radius, art, pose, compact) {
    if (art.beard === "none") return;
    const profile = faceArt7Profile(art);
    const facing = art.facing || 1;
    const white = String(art.beard).startsWith("white");
    const long = /long|wild|square/.test(art.beard);
    const noise = seededNoise(hashString(`${art.archetype}|beard-edge-v7|${profile.brushSeed}`));
    const strandCount = compact ? 4 : long ? 15 : 9;
    ctx.save();
    ctx.lineCap = profile.hairSoftness > 0.58 ? "round" : "butt";
    ctx.strokeStyle = white
      ? colorWithAlpha(pose.keyTemp, compact ? 0.5 : 0.38)
      : colorWithAlpha(pose.rimColor, compact ? 0.38 : 0.27);
    ctx.shadowColor = "rgba(0,0,0,.46)";
    ctx.shadowBlur = radius * profile.hairSoftness * 0.045;
    for (let strand = 0; strand < strandCount; strand += 1) {
      const along = strandCount <= 1 ? 0 : strand / (strandCount - 1) - 0.5;
      const sx = cx + along * radius * (art.beard === "wild" ? 1.36 : 0.82);
      const sy = cy + radius * (0.56 + Math.abs(along) * 0.18);
      const length = radius * (
        long ? 0.3 + noise() * (compact ? 0.2 : 0.55) : 0.16 + noise() * 0.18
      );
      ctx.lineWidth = Math.max(0.4, radius * (0.015 + noise() * 0.018));
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(
        sx + facing * radius * (noise() - 0.42) * 0.17,
        sy + length * 0.5,
        sx + facing * radius * (noise() - 0.5) * 0.26,
        sy + length,
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintBeard(ctx, cx, cy, radius, art, pose, compact) {
    if (art.beard === "none") return;
    const facing = art.facing || 1;
    const landmarks = faceLandmarks(art);
    const structure = facialStructureProfile(art);
    const white = art.beard.startsWith("white");
    const wild = art.beard === "wild";
    const long = ["long", "white-long"].includes(art.beard);
    const square = ["square", "white-square"].includes(art.beard);
    const baseDark = white ? "#aea99c" : art.archetype === "crescent-blade-long-beard" ? "#211916" : "#171413";
    const baseLight = white ? "#eee9dc" : "#4c3025";
    const mouthY = cy + radius * (
      0.59
      + (landmarks.faceLength - 1) * 0.18
      + structure.philtrumLength * 0.13
    );
    const moustacheY = mouthY - radius * 0.025;
    const beardTop = mouthY + radius * (0.12 + structure.lowerFullness * 0.4);
    const paintAttachedMoustache = (lineScale) => {
      const spread = radius * (0.24 + structure.moustacheSpread * 0.22);
      const centerGap = radius * (0.035 + (1 - structure.moustacheSpread) * 0.025);
      ctx.strokeStyle = baseDark;
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(0.8, radius * lineScale);
      ctx.beginPath();
      ctx.moveTo(cx - centerGap, moustacheY);
      ctx.bezierCurveTo(
        cx - spread * 0.34,
        moustacheY - radius * structure.upperBow * 0.4,
        cx - spread * 0.72,
        moustacheY + radius * 0.01,
        cx - spread,
        moustacheY + radius * (0.045 + structure.cornerTension * 0.22),
      );
      ctx.moveTo(cx + centerGap, moustacheY);
      ctx.bezierCurveTo(
        cx + spread * 0.32,
        moustacheY - radius * structure.upperBow * 0.36,
        cx + spread * 0.7,
        moustacheY + radius * 0.008,
        cx + spread,
        moustacheY + radius * (0.04 - structure.cornerTension * 0.18),
      );
      ctx.stroke();
    };

    if (art.beard === "stubble") {
      const noise = seededNoise(hashString(`${art.archetype}|stubble`));
      ctx.save();
      ctx.strokeStyle = "rgba(40,27,23,.58)";
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(0.45, radius * 0.032);
      const marks = compact ? 8 : 26;
      for (let mark = 0; mark < marks; mark += 1) {
        const side = noise() * 2 - 1;
        const markX = cx + side * radius * (0.22 + noise() * 0.42);
        const markY = cy + radius * (0.51 + noise() * 0.55 - Math.abs(side) * 0.08);
        ctx.beginPath();
        ctx.moveTo(markX, markY);
        ctx.lineTo(markX + facing * radius * 0.025, markY + radius * (0.025 + noise() * 0.04));
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (art.beard === "goatee") {
      ctx.save();
      paintAttachedMoustache(0.085);
      const goatee = ctx.createLinearGradient(cx, beardTop, cx + facing * radius * 0.08, cy + radius * 1.58);
      goatee.addColorStop(0, "#181516");
      goatee.addColorStop(0.62, "#3b2925");
      goatee.addColorStop(1, "#121214");
      ctx.fillStyle = goatee;
      ctx.beginPath();
      ctx.moveTo(cx - radius * 0.21, beardTop + radius * 0.16);
      ctx.quadraticCurveTo(cx - radius * 0.16, cy + radius * 1.15, cx + facing * radius * 0.05, cy + radius * 1.6);
      ctx.quadraticCurveTo(cx + radius * 0.2, cy + radius * 1.12, cx + radius * 0.2, beardTop + radius * 0.16);
      ctx.closePath();
      ctx.fill();
      if (!compact) {
        ctx.strokeStyle = "rgba(205,156,109,.24)";
        ctx.lineWidth = Math.max(0.45, radius * 0.035);
        for (let strand = -1; strand <= 1; strand += 1) {
          ctx.beginPath();
          ctx.moveTo(cx + strand * radius * 0.09, beardTop + radius * 0.22);
          ctx.quadraticCurveTo(cx - facing * radius * 0.05, cy + radius, cx + strand * radius * 0.035, cy + radius * 1.48);
          ctx.stroke();
        }
      }
      ctx.restore();
      return;
    }

    if (art.beard === "trim") {
      const variant = art.archetype;
      const forked = variant === "twin-swords-monarch";
      const royalPoint = variant === "river-crown-sword";
      const windSwept = variant === "cavalry-lance";
      const scholarTrim = variant === "book-and-sword";
      const beardWidth = scholarTrim ? 0.24 : royalPoint ? 0.32 : windSwept ? 0.36 : forked ? 0.38 : 0.43;
      const beardLength = scholarTrim ? 0.84 : royalPoint ? 1.32 : windSwept ? 0.87 : forked ? 1.2 : 0.92;
      ctx.save();
      paintAttachedMoustache(scholarTrim ? 0.06 : 0.09);
      if (scholarTrim) {
        ctx.beginPath();
        ctx.moveTo(cx - radius * 0.08, beardTop + radius * 0.2);
        ctx.quadraticCurveTo(cx + facing * radius * 0.04, cy + radius * 0.74, cx + facing * radius * 0.1, cy + radius * beardLength);
        ctx.stroke();
      } else {
        const pointX = cx + facing * radius * (windSwept ? 0.22 : royalPoint ? 0.08 : 0);
        const beardGradient = ctx.createLinearGradient(cx - radius * beardWidth, beardTop, pointX, cy + radius * beardLength);
        beardGradient.addColorStop(0, "#171414");
        beardGradient.addColorStop(0.58, "#443027");
        beardGradient.addColorStop(1, "#151313");
        ctx.fillStyle = beardGradient;
        ctx.beginPath();
        ctx.moveTo(cx - radius * beardWidth, beardTop + radius * 0.13);
        ctx.quadraticCurveTo(
          cx - radius * beardWidth * 0.72,
          cy + radius * (0.74 + beardLength * 0.18),
          pointX - (forked ? radius * 0.1 : 0),
          cy + radius * beardLength,
        );
        if (forked) {
          ctx.lineTo(pointX, cy + radius * (beardLength - 0.18));
          ctx.lineTo(pointX + radius * 0.13, cy + radius * (beardLength + 0.04));
        }
        ctx.quadraticCurveTo(
          cx + radius * beardWidth * 0.78,
          cy + radius * (0.72 + beardLength * 0.16),
          cx + radius * beardWidth,
          beardTop + radius * 0.12,
        );
        ctx.quadraticCurveTo(cx, beardTop + radius * 0.45, cx - radius * beardWidth, beardTop + radius * 0.13);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    const squareBeardLength = art.archetype === "twin-halberds-giant" ? 1.38 : 1.58;
    const beardBottom = cy + radius * (
      long ? 2.65 : wild ? 1.85 : square ? squareBeardLength : art.beard === "goatee" ? 1.55 : 1.12
    );
    const spread = radius * (wild ? 1.04 : square ? 0.75 : long ? 0.55 : 0.48);
    ctx.save();
    paintAttachedMoustache(wild ? 0.13 : square ? 0.11 : 0.095);
    ctx.shadowColor = "rgba(0,0,0,.48)";
    ctx.shadowBlur = radius * 0.18;
    ctx.beginPath();
    ctx.moveTo(cx - spread, beardTop);
    ctx.bezierCurveTo(
      cx - spread * (long ? 0.72 : 0.95),
      lerp(beardTop, beardBottom, 0.42),
      cx - radius * (wild ? 0.62 : 0.22),
      lerp(beardTop, beardBottom, 0.8),
      cx + facing * radius * (long ? 0.06 : 0),
      beardBottom,
    );
    ctx.bezierCurveTo(
      cx + radius * (wild ? 0.68 : 0.26),
      lerp(beardTop, beardBottom, 0.76),
      cx + spread * (long ? 0.7 : 0.95),
      lerp(beardTop, beardBottom, 0.38),
      cx + spread,
      beardTop,
    );
    ctx.quadraticCurveTo(cx, cy + radius * 0.77, cx - spread, beardTop);
    const gradient = ctx.createLinearGradient(cx - spread, beardTop, cx + spread, beardBottom);
    gradient.addColorStop(0, portraitShiftColor(baseDark, -0.22));
    gradient.addColorStop(0.42, baseDark);
    gradient.addColorStop(0.72, baseLight);
    gradient.addColorStop(1, portraitShiftColor(baseDark, -0.3));
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = white ? "rgba(89,81,72,.52)" : "rgba(204,151,100,.24)";
    ctx.lineCap = "round";
    const strands = compact ? 5 : long || wild ? 18 : 10;
    ctx.lineWidth = Math.max(0.45, radius * (compact ? 0.06 : 0.035));
    for (let strand = 0; strand < strands; strand += 1) {
      const ratio = strands <= 1 ? 0 : strand / (strands - 1);
      const offset = (ratio - 0.5) * spread * 1.65;
      const startX = cx + offset;
      const startY = beardTop + Math.abs(ratio - 0.5) * radius * 0.16;
      const endX = cx + offset * (long ? 0.2 : 0.48) + facing * radius * Math.sin(strand * 1.7) * 0.035;
      const endY = lerp(beardTop + radius * 0.52, beardBottom, 1 - Math.abs(ratio - 0.5) * (wild ? 0.35 : 0.62));
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(
        startX - facing * radius * 0.09,
        lerp(startY, endY, 0.34),
        endX + facing * radius * 0.11,
        lerp(startY, endY, 0.72),
        endX,
        endY,
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintHeadgearLandmark(ctx, cx, cy, radius, width, art, pose, compact) {
    const type = art.headgear;
    const facing = art.facing || 1;
    const dark = type === "white-helmet" ? "#dcdacb" : /crown/.test(type) && type !== "phoenix-crown" ? "#7d5520" : "#11171b";
    const light = type === "white-helmet" ? "#fffbed" : /crown/.test(type) && type !== "phoenix-crown" ? "#e5b950" : "#53606a";
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.58)";
    ctx.shadowBlur = radius * 0.24;
    const keyX = Math.cos(pose.keyAngle);
    const keyY = Math.sin(pose.keyAngle);
    const crownGradient = ctx.createLinearGradient(
      cx - keyX * radius,
      cy - radius - keyY * radius,
      cx + keyX * radius,
      cy - radius + keyY * radius,
    );
    crownGradient.addColorStop(0, dark);
    crownGradient.addColorStop(clamp(0.7 - pose.keyStrength * 0.15, 0.48, 0.62), light);
    crownGradient.addColorStop(1, portraitShiftColor(dark, -0.32));
    ctx.fillStyle = crownGradient;
    ctx.strokeStyle = colorWithAlpha(pose.rimColor, compact ? 0.58 : 0.74);
    ctx.lineWidth = Math.max(0.7, width * (compact ? 0.007 : 0.005));

    if (/scholar|soft-cap|commander-cap/.test(type)) {
      roundedRect(ctx, cx - radius * 0.9, cy - radius * 1.36, radius * 1.8, radius * 0.72, radius * 0.14);
      ctx.fill();
      ctx.stroke();
      if (/scholar/.test(type)) {
        ctx.fillStyle = portraitShiftColor(dark, -0.2);
        ctx.fillRect(cx - radius * 1.8, cy - radius * 1.12, radius * 3.6, radius * 0.18);
      } else {
        ctx.beginPath();
        ctx.moveTo(cx + facing * radius * 0.65, cy - radius * 0.86);
        ctx.quadraticCurveTo(cx + facing * radius * 1.72, cy - radius * 1.13, cx + facing * radius * 1.54, cy - radius * 0.58);
        ctx.lineTo(cx + facing * radius * 0.7, cy - radius * 0.61);
        ctx.closePath();
        ctx.fill();
      }
    } else if (/crown/.test(type) && type !== "phoenix-crown") {
      ctx.beginPath();
      ctx.moveTo(cx - radius * 0.9, cy - radius * 0.55);
      ctx.lineTo(cx - radius * 0.78, cy - radius * 1.36);
      ctx.lineTo(cx - radius * 0.26, cy - radius * 1.08);
      ctx.lineTo(cx, cy - radius * 1.68);
      ctx.lineTo(cx + radius * 0.3, cy - radius * 1.06);
      ctx.lineTo(cx + radius * 0.82, cy - radius * 1.38);
      ctx.lineTo(cx + radius * 0.92, cy - radius * 0.54);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (type === "monarch-crown" && !compact) {
        ctx.strokeStyle = "rgba(245,220,132,.72)";
        for (let bead = -2; bead <= 2; bead += 1) {
          const beadX = cx + bead * radius * 0.27;
          ctx.beginPath();
          ctx.moveTo(beadX, cy - radius * 1.22);
          ctx.lineTo(beadX, cy - radius * 0.48);
          ctx.stroke();
          ellipsePath(ctx, beadX, cy - radius * 0.45, radius * 0.055, radius * 0.055);
          ctx.fillStyle = bead % 2 ? "#c84534" : "#ead27b";
          ctx.fill();
        }
      }
      if (type === "gold-crown") {
        ctx.fillStyle = "#f2c84b";
        ctx.beginPath();
        ctx.moveTo(cx, cy - radius * 1.6);
        ctx.quadraticCurveTo(cx + facing * radius * 0.9, cy - radius * 2.08, cx + facing * radius * 0.55, cy - radius * 1.03);
        ctx.quadraticCurveTo(cx + facing * radius * 0.16, cy - radius * 1.34, cx, cy - radius * 1.6);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy - radius * 0.17, radius * 1.03, Math.PI, TAU);
      ctx.lineTo(cx + radius * 0.86, cy - radius * 0.13);
      ctx.lineTo(cx - radius * 0.86, cy - radius * 0.13);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (type === "white-helmet" || type === "horsehair-helmet") {
        ctx.fillStyle = type === "white-helmet" ? "#f6f3df" : "#a92f2b";
        ctx.beginPath();
        ctx.moveTo(cx, cy - radius * 0.92);
        ctx.bezierCurveTo(
          cx + facing * radius * 0.25,
          cy - radius * 2.18,
          cx + facing * radius * 1.24,
          cy - radius * 1.72,
          cx + facing * radius * 0.72,
          cy - radius * 0.58,
        );
        ctx.bezierCurveTo(cx + facing * radius * 0.3, cy - radius * 1.04, cx - facing * radius * 0.08, cy - radius * 1.32, cx, cy - radius * 0.92);
        ctx.fill();
      } else if (type === "phoenix-crown") {
        ctx.fillStyle = "#ce342d";
        for (let plume = -1; plume <= 1; plume += 2) {
          ctx.beginPath();
          ctx.moveTo(cx, cy - radius * 0.93);
          ctx.bezierCurveTo(
            cx + plume * radius * 0.48,
            cy - radius * 2.55,
            cx + plume * radius * 2.24,
            cy - radius * 2.12,
            cx + plume * radius * 1.5,
            cy - radius * 0.38,
          );
          ctx.bezierCurveTo(cx + plume * radius * 0.82, cy - radius * 1.15, cx + plume * radius * 0.36, cy - radius * 1.26, cx, cy - radius * 0.93);
          ctx.fill();
        }
        ellipsePath(ctx, cx, cy - radius * 1.08, radius * 0.17, radius * 0.17);
        ctx.fillStyle = "#f0c953";
        ctx.fill();
      } else if (type === "horned-helmet") {
        ctx.fillStyle = "#786c5f";
        for (let horn = -1; horn <= 1; horn += 2) {
          ctx.beginPath();
          ctx.moveTo(cx + horn * radius * 0.68, cy - radius * 0.55);
          ctx.quadraticCurveTo(cx + horn * radius * 1.7, cy - radius * 1.72, cx + horn * radius * 1.18, cy - radius * 0.12);
          ctx.closePath();
          ctx.fill();
        }
      } else if (["raider-scarf", "wild-band", "war-scarf"].includes(type)) {
        ctx.fillStyle = type === "wild-band" ? "#271c19" : "#a72a27";
        ctx.fillRect(cx - radius * 1.12, cy - radius * 0.68, radius * 2.24, radius * 0.27);
        ctx.beginPath();
        ctx.moveTo(cx + facing * radius * 0.86, cy - radius * 0.56);
        ctx.bezierCurveTo(
          cx + facing * radius * 2.25,
          cy - radius * 0.38,
          cx + facing * radius * 1.92,
          cy + radius * 0.54,
          cx + facing * radius * 0.92,
          cy - radius * 0.02,
        );
        ctx.closePath();
        ctx.fill();
      } else if (type === "elder-knot") {
        ellipsePath(ctx, cx - facing * radius * 0.06, cy - radius * 1.12, radius * 0.33, radius * 0.34);
        ctx.fillStyle = "#d7d2c4";
        ctx.fill();
      }
    }
    ctx.save();
    if (/scholar|soft-cap|commander-cap/.test(type)) {
      roundedRect(ctx, cx - radius * 0.9, cy - radius * 1.36, radius * 1.8, radius * 0.72, radius * 0.14);
    } else if (/crown/.test(type) && type !== "phoenix-crown") {
      ctx.beginPath();
      ctx.moveTo(cx - radius * 0.9, cy - radius * 0.55);
      ctx.lineTo(cx - radius * 0.78, cy - radius * 1.36);
      ctx.lineTo(cx - radius * 0.26, cy - radius * 1.08);
      ctx.lineTo(cx, cy - radius * 1.68);
      ctx.lineTo(cx + radius * 0.3, cy - radius * 1.06);
      ctx.lineTo(cx + radius * 0.82, cy - radius * 1.38);
      ctx.lineTo(cx + radius * 0.92, cy - radius * 0.54);
      ctx.closePath();
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy - radius * 0.17, radius * 1.03, Math.PI, TAU);
      ctx.lineTo(cx + radius * 0.86, cy - radius * 0.13);
      ctx.lineTo(cx - radius * 0.86, cy - radius * 0.13);
      ctx.closePath();
    }
    ctx.clip();
    paintMaterialSurface(
      ctx,
      cx - radius * 1.25,
      cy - radius * 1.7,
      radius * 2.5,
      radius * 1.65,
      portraitMaterials(art).headgear,
      hashString(`${art.archetype}|headgear`),
      pose,
      compact,
    );
    ctx.restore();
    ctx.shadowBlur = 0;

    if (art.feminine) {
      ctx.strokeStyle = "#171419";
      ctx.lineWidth = radius * 0.28;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - facing * radius * 0.54, cy - radius * 0.35);
      ctx.bezierCurveTo(
        cx - facing * radius * 0.8,
        cy + radius * 0.38,
        cx - facing * radius * 0.38,
        cy + radius * 1.34,
        cx - facing * radius * 0.68,
        cy + radius * 1.72,
      );
      ctx.stroke();
      ctx.strokeStyle = "#e5adbe";
      ctx.lineWidth = Math.max(1, radius * 0.08);
      ctx.beginPath();
      ctx.moveTo(cx - radius * 1.35, cy - radius * 1.03);
      ctx.lineTo(cx + radius * 1.18, cy - radius * 0.9);
      ctx.stroke();
      ellipsePath(ctx, cx + facing * radius * 0.85, cy - radius * 0.96, radius * 0.14, radius * 0.14);
      ctx.fillStyle = "#f1c5d1";
      ctx.fill();
    }
    ctx.restore();
  }

  function paintWeaponLandmark(ctx, x, y, width, height, art, style, pose, action, compact) {
    const weapon = art.weapon;
    const keyX = Math.cos(pose.keyAngle);
    const keyY = Math.sin(pose.keyAngle);
    const metal = ctx.createLinearGradient(
      x + width * (0.5 - keyX * 0.6),
      y + height * (0.5 - keyY * 0.6),
      x + width * (0.5 + keyX * 0.6),
      y + height * (0.5 + keyY * 0.6),
    );
    metal.addColorStop(0, portraitShiftColor(pose.bounceColor, 0.1));
    metal.addColorStop(0.3, pose.accent);
    metal.addColorStop(0.64, "#776039");
    metal.addColorStop(1, portraitShiftColor(pose.keyTemp, 0.08));
    const wood = ctx.createLinearGradient(
      x + width * (0.5 - keyX * 0.5),
      y + height * (0.5 - keyY * 0.5),
      x + width * (0.5 + keyX * 0.5),
      y + height * (0.5 + keyY * 0.5),
    );
    wood.addColorStop(0, "#3e2518");
    wood.addColorStop(0.46, "#8e5b32");
    wood.addColorStop(0.54, portraitShiftColor(pose.keyTemp, -0.24));
    wood.addColorStop(1, "#422719");
    const pole = (fromX, fromY, toX, toY, thickness, materialName) => {
      const material = MATERIAL_PROFILES[materialName || "wood"];
      ctx.strokeStyle = "rgba(12,12,12,.72)";
      ctx.lineWidth = thickness * 1.8;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
      ctx.strokeStyle = materialName === "raw-iron" ? metal : wood;
      ctx.lineWidth = thickness;
      ctx.stroke();
      if (!compact && material) {
        ctx.strokeStyle = colorWithAlpha(
          materialName === "raw-iron" ? pose.keyTemp : pose.rimColor,
          0.12 + (1 - material.roughness) * 0.18,
        );
        ctx.lineWidth = Math.max(0.45, thickness * material.specularWidth * 2.1);
        ctx.beginPath();
        ctx.moveTo(fromX + keyX * thickness * 0.45, fromY + keyY * thickness * 0.45);
        ctx.lineTo(toX + keyX * thickness * 0.45, toY + keyY * thickness * 0.45);
        ctx.stroke();
      }
    };
    ctx.save();
    roundedRect(ctx, x, y, width, height, Math.max(4, width * 0.05));
    ctx.clip();
    const weaponPivotX = x + width * 0.7;
    const weaponPivotY = y + height * 0.63;
    ctx.translate(action.weaponShiftX * width, action.weaponShiftY * height);
    ctx.translate(weaponPivotX, weaponPivotY);
    ctx.rotate(action.weaponAngle);
    ctx.scale(action.weaponScale, action.weaponScale);
    ctx.translate(-weaponPivotX, -weaponPivotY);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = colorWithAlpha(pose.rimColor || style.glow, 0.58);
    ctx.shadowBlur = compact ? 0 : width * 0.018;
    const thickness = Math.max(1.2, width * (compact ? 0.02 : 0.015));
    if (weapon === "crescent-blade") {
      pole(x + width * 0.83, y + height * 1.08, x + width * 0.73, y + height * 0.03, thickness);
      ctx.beginPath();
      ctx.moveTo(x + width * 0.73, y + height * 0.04);
      ctx.bezierCurveTo(x + width * 0.98, y - height * 0.01, x + width * 0.98, y + height * 0.2, x + width * 0.78, y + height * 0.28);
      ctx.quadraticCurveTo(x + width * 0.87, y + height * 0.13, x + width * 0.73, y + height * 0.04);
      ctx.fillStyle = metal;
      ctx.fill();
    } else if (weapon === "serpent-spear") {
      pole(x + width * 0.83, y + height * 1.05, x + width * 0.74, y + height * 0.12, thickness);
      ctx.strokeStyle = metal;
      ctx.lineWidth = thickness * 1.2;
      ctx.beginPath();
      ctx.moveTo(x + width * 0.74, y + height * 0.14);
      ctx.bezierCurveTo(x + width * 0.61, y + height * 0.09, x + width * 0.86, y + height * 0.05, x + width * 0.74, y - height * 0.05);
      ctx.bezierCurveTo(x + width * 0.91, y + height * 0.06, x + width * 0.68, y + height * 0.1, x + width * 0.74, y + height * 0.14);
      ctx.stroke();
    } else if (["spear", "horse-lance"].includes(weapon)) {
      pole(x + width * 0.82, y + height * 1.04, x + width * 0.72, y + height * 0.02, thickness);
      ctx.beginPath();
      ctx.moveTo(x + width * 0.72, y - height * 0.02);
      ctx.lineTo(x + width * 0.65, y + height * 0.14);
      ctx.lineTo(x + width * 0.77, y + height * 0.1);
      ctx.closePath();
      ctx.fillStyle = metal;
      ctx.fill();
    } else if (weapon === "bow") {
      ctx.strokeStyle = "rgba(25,15,11,.8)";
      ctx.lineWidth = thickness * 2;
      ctx.beginPath();
      ctx.arc(x + width * 0.77, y + height * 0.54, width * 0.27, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.strokeStyle = "#c6944c";
      ctx.lineWidth = thickness;
      ctx.stroke();
      ctx.strokeStyle = "rgba(238,226,188,.72)";
      ctx.lineWidth = Math.max(0.55, thickness * 0.38);
      ctx.beginPath();
      ctx.moveTo(x + width * 0.77, y + height * 0.27);
      ctx.lineTo(x + width * 0.58, y + height * 0.54);
      ctx.lineTo(x + width * 0.77, y + height * 0.81);
      ctx.stroke();
      pole(x + width * 0.54, y + height * 0.54, x + width * 0.98, y + height * 0.54, thickness * 0.58);
    } else if (["feather-fan", "dark-fan"].includes(weapon)) {
      const fanX = x + width * 0.76;
      const fanY = y + height * 0.79;
      for (let feather = -3; feather <= 3; feather += 1) {
        ctx.save();
        ctx.translate(fanX, fanY);
        ctx.rotate(feather * 0.17);
        ellipsePath(ctx, 0, -height * 0.18, width * 0.047, height * 0.21);
        const featherGradient = ctx.createLinearGradient(0, -height * 0.38, 0, 0);
        featherGradient.addColorStop(0, weapon === "dark-fan" ? "#586171" : "#fffdf1");
        featherGradient.addColorStop(1, weapon === "dark-fan" ? "#12141a" : "#bcb7a7");
        ctx.fillStyle = featherGradient;
        ctx.fill();
        ctx.strokeStyle = weapon === "dark-fan" ? "rgba(174,185,201,.34)" : "rgba(89,79,64,.32)";
        ctx.lineWidth = Math.max(0.42, width * (compact ? 0.004 : 0.003));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -height * 0.35);
        ctx.stroke();
        if (!compact) {
          const featherMaterial = MATERIAL_PROFILES.feather;
          ctx.lineWidth = Math.max(0.35, width * featherMaterial.specularWidth * 0.012);
          for (let vane = 1; vane <= 4; vane += 1) {
            const vaneY = -height * (0.06 + vane * 0.055);
            ctx.beginPath();
            ctx.moveTo(0, vaneY);
            ctx.lineTo(-width * (0.024 + vane * 0.003), vaneY - height * 0.035);
            ctx.moveTo(0, vaneY);
            ctx.lineTo(width * (0.024 + vane * 0.003), vaneY - height * 0.035);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    } else if (weapon === "shield") {
      const shieldGradient = ctx.createLinearGradient(x + width * 0.61, y + height * 0.42, x + width * 0.98, y + height * 0.93);
      shieldGradient.addColorStop(0, "#9aaebd");
      shieldGradient.addColorStop(0.38, "#334958");
      shieldGradient.addColorStop(1, "#121c22");
      ctx.beginPath();
      ctx.moveTo(x + width * 0.62, y + height * 0.44);
      ctx.lineTo(x + width * 0.98, y + height * 0.4);
      ctx.lineTo(x + width * 0.92, y + height * 0.83);
      ctx.lineTo(x + width * 0.79, y + height * 0.96);
      ctx.lineTo(x + width * 0.64, y + height * 0.82);
      ctx.closePath();
      ctx.fillStyle = shieldGradient;
      ctx.fill();
      ctx.strokeStyle = metal;
      ctx.lineWidth = thickness;
      ctx.stroke();
      ellipsePath(ctx, x + width * 0.8, y + height * 0.66, width * 0.065, width * 0.065);
      ctx.fillStyle = "#9b342e";
      ctx.fill();
    } else if (["twin-halberds", "fangtian-halberd"].includes(weapon)) {
      const poles = weapon === "twin-halberds" ? [0.18, 0.82] : [0.81];
      poles.forEach((ratio) => {
        pole(x + width * ratio, y + height * 1.04, x + width * ratio, y + height * 0.04, thickness);
        ctx.beginPath();
        ctx.moveTo(x + width * ratio, y + height * 0.08);
        ctx.lineTo(x + width * (ratio - 0.11), y + height * 0.19);
        ctx.lineTo(x + width * ratio, y + height * 0.25);
        ctx.lineTo(x + width * (ratio + 0.11), y + height * 0.19);
        ctx.closePath();
        ctx.strokeStyle = metal;
        ctx.lineWidth = thickness;
        ctx.stroke();
      });
    } else if (weapon === "twin-swords") {
      pole(x + width * 0.16, y + height * 1.03, x + width * 0.37, y + height * 0.05, thickness, "raw-iron");
      pole(x + width * 0.84, y + height * 1.03, x + width * 0.63, y + height * 0.05, thickness, "raw-iron");
    } else if (["royal-sword", "jiangdong-sword", "flame-sword", "bells-blade", "book-sword"].includes(weapon)) {
      pole(x + width * 0.82, y + height * 1.03, x + width * 0.73, y + height * 0.08, thickness, "raw-iron");
      pole(x + width * 0.65, y + height * 0.47, x + width * 0.84, y + height * 0.45, thickness * 1.35, "raw-iron");
      if (weapon === "bells-blade") {
        [0.66, 0.82].forEach((ratio) => {
          ellipsePath(ctx, x + width * ratio, y + height * 0.56, width * 0.047, width * 0.047);
          ctx.fillStyle = "#e7b443";
          ctx.fill();
        });
      }
      if (weapon === "flame-sword") {
        ctx.strokeStyle = "rgba(255,90,36,.9)";
        ctx.lineWidth = thickness * 1.8;
        ctx.beginPath();
        ctx.moveTo(x + width * 0.73, y + height * 0.08);
        ctx.quadraticCurveTo(x + width * 0.9, y + height * 0.2, x + width * 0.74, y + height * 0.34);
        ctx.stroke();
      }
    } else if (weapon === "bamboo-scroll") {
      const scroll = ctx.createLinearGradient(x + width * 0.59, y + height * 0.59, x + width * 0.94, y + height * 0.82);
      scroll.addColorStop(0, "#e1cf94");
      scroll.addColorStop(0.55, "#9e8757");
      scroll.addColorStop(1, "#d5bd7d");
      roundedRect(ctx, x + width * 0.6, y + height * 0.59, width * 0.34, height * 0.22, width * 0.02);
      ctx.fillStyle = scroll;
      ctx.fill();
      ctx.strokeStyle = "rgba(52,39,24,.56)";
      ctx.lineWidth = Math.max(0.6, thickness * 0.4);
      for (let slip = 1; slip < 5; slip += 1) {
        ctx.beginPath();
        ctx.moveTo(x + width * (0.6 + slip * 0.068), y + height * 0.6);
        ctx.lineTo(x + width * (0.6 + slip * 0.068), y + height * 0.8);
        ctx.stroke();
      }
    } else if (weapon === "fire-club") {
      pole(x + width * 0.82, y + height * 1.03, x + width * 0.72, y + height * 0.2, thickness * 2.4);
      ctx.fillStyle = "#ff6933";
      ctx.beginPath();
      ctx.moveTo(x + width * 0.72, y + height * 0.23);
      ctx.bezierCurveTo(x + width * 0.58, y + height * 0.08, x + width * 0.73, y - height * 0.04, x + width * 0.78, y + height * 0.07);
      ctx.quadraticCurveTo(x + width * 0.91, y + height * 0.15, x + width * 0.72, y + height * 0.23);
      ctx.fill();
    }
    ctx.restore();
  }

  /*
   * The weapon is painted between the arm and the foreground fingers.  That
   * painter order matters: the shaft remains visible in the gaps while the
   * phalanges and thumb visibly cross it, so the hand reads as wrapping a real
   * axis instead of ending beside a floating prop.
   */
  function paintWeaponGripOverlay(ctx, x, y, width, height, art, pose, action, compact) {
    const grips = Array.isArray(action.grip) ? action.grip : [];
    if (!grips.length) return;
    const figure = art8FigureProfile(art);
    const skin = faceProfile(art).tone;
    const weaponPivotX = x + width * 0.7;
    const weaponPivotY = y + height * 0.63;
    ctx.save();
    roundedRect(ctx, x, y, width, height, Math.max(4, width * 0.05));
    ctx.clip();
    ctx.translate(action.weaponShiftX * width, action.weaponShiftY * height);
    ctx.translate(weaponPivotX, weaponPivotY);
    ctx.rotate(action.weaponAngle);
    ctx.scale(action.weaponScale, action.weaponScale);
    ctx.translate(-weaponPivotX, -weaponPivotY);
    grips.forEach((grip, index) => {
      const side = grip.side || (index ? -1 : 1);
      const delicate = grip.kind === "delicate";
      const pinch = grip.kind === "pinch";
      const rim = grip.kind === "rim";
      const palmDepth = index ? figure.farPalmDepth : figure.nearPalmDepth;
      const palmWidth = width * (delicate ? 0.058 : pinch ? 0.052 : 0.067)
        * (1.08 - palmDepth * 0.12);
      const palmHeight = width * (delicate ? 0.042 : 0.047) * palmDepth;
      ctx.save();
      ctx.translate(x + width * grip.x, y + height * grip.y);
      ctx.rotate(figure.gripPitch * (index ? -0.82 : 1));
      if (pinch && (art.weapon === "bamboo-scroll" || art.weapon === "book-sword")) {
        ctx.rotate(Math.PI * 0.5);
      }
      if (rim) ctx.rotate(-0.18 * side);

      // Cool reflected fingertips first; the shaft remains visible between
      // these far-side pads and the warmer palm that follows.
      ctx.fillStyle = colorWithAlpha(pose.bounceColor, compact ? 0.52 : 0.64);
      for (let finger = 0; finger < (compact ? 3 : 4); finger += 1) {
        const fingerY = (finger - 1.5) * palmHeight * 0.39;
        ellipsePath(
          ctx,
          -side * palmWidth * (0.1 + finger * 0.012),
          fingerY,
          palmWidth * 0.33,
          palmHeight * 0.17,
        );
        ctx.fill();
      }

      const palm = ctx.createRadialGradient(
        side * palmWidth * 0.48,
        -palmHeight * 0.38,
        0,
        side * palmWidth * 0.2,
        0,
        palmWidth,
      );
      palm.addColorStop(0, portraitShiftColor(skin, 0.3));
      palm.addColorStop(0.48, skin);
      palm.addColorStop(0.78, portraitShiftColor(skin, -0.14));
      palm.addColorStop(1, colorWithAlpha(pose.bounceColor, 0.86));
      ctx.beginPath();
      ctx.moveTo(side * palmWidth * 0.04, -palmHeight * 0.58);
      ctx.bezierCurveTo(
        side * palmWidth * 0.82,
        -palmHeight * 0.7,
        side * palmWidth * 1.02,
        -palmHeight * 0.1,
        side * palmWidth * 0.74,
        palmHeight * 0.54,
      );
      ctx.quadraticCurveTo(
        side * palmWidth * 0.22,
        palmHeight * 0.76,
        -side * palmWidth * 0.08,
        palmHeight * 0.32,
      );
      ctx.lineTo(-side * palmWidth * 0.04, -palmHeight * 0.34);
      ctx.closePath();
      ctx.fillStyle = palm;
      ctx.shadowColor = "rgba(13,7,6,.58)";
      ctx.shadowBlur = compact ? 0 : palmWidth * 0.32;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Four hooked fingers cross the weapon axis. Separate strokes leave dark
      // interphalangeal gaps rather than a mitten-shaped blob.
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(0.72, palmHeight * (compact ? 0.28 : 0.23));
      for (let finger = 0; finger < (compact ? 3 : 4); finger += 1) {
        const fingerY = (finger - 1.5) * palmHeight * 0.39;
        const curl = figure.fingerCurl * (1 - finger * 0.035);
        ctx.strokeStyle = finger % 2
          ? portraitShiftColor(skin, -0.06)
          : portraitShiftColor(skin, 0.1);
        ctx.beginPath();
        ctx.moveTo(side * palmWidth * (0.5 - finger * 0.025), fingerY - palmHeight * 0.08);
        ctx.bezierCurveTo(
          side * palmWidth * (0.38 - curl * 0.19),
          fingerY - palmHeight * 0.18,
          -side * palmWidth * (0.07 + curl * 0.13),
          fingerY - palmHeight * 0.07,
          -side * palmWidth * (0.11 + curl * 0.12 + finger * 0.018),
          fingerY + palmHeight * 0.16,
        );
        ctx.stroke();
        if (!compact) {
          ctx.fillStyle = finger % 2 ? "rgba(105,58,43,.5)" : "rgba(255,225,192,.36)";
          ellipsePath(
            ctx,
            side * palmWidth * (0.08 - curl * 0.11),
            fingerY + palmHeight * 0.015,
            palmWidth * 0.055,
            palmHeight * 0.075,
          );
          ctx.fill();
        }
      }

      // Opposing thumb pad hooks around the shaft at a different angle.
      ctx.strokeStyle = portraitShiftColor(skin, 0.18);
      ctx.lineWidth = Math.max(0.9, palmHeight * (compact ? 0.34 : 0.3));
      ctx.beginPath();
      ctx.moveTo(side * palmWidth * 0.58, -palmHeight * 0.42);
      ctx.quadraticCurveTo(
        side * palmWidth * 0.08,
        -palmHeight * 0.42,
        -side * palmWidth * 0.13,
        palmHeight * 0.07,
      );
      ctx.stroke();

      if (!compact) {
        ctx.strokeStyle = "rgba(92,49,38,.46)";
        ctx.lineWidth = Math.max(0.38, width * 0.0022);
        ctx.beginPath();
        ctx.moveTo(side * palmWidth * 0.13, -palmHeight * 0.26);
        ctx.quadraticCurveTo(
          side * palmWidth * 0.46,
          0,
          side * palmWidth * 0.17,
          palmHeight * 0.32,
        );
        ctx.stroke();
        ctx.fillStyle = "rgba(255,224,190,.38)";
        ellipsePath(
          ctx,
          -side * palmWidth * 0.11,
          palmHeight * 0.04,
          palmWidth * 0.08,
          palmHeight * 0.07,
        );
        ctx.fill();
      }
      ctx.restore();
    });
    ctx.restore();
  }

  const ANIME_CEL_STYLE_VERSION = "anime-cel-v11";

  function paintAnimeCelFaceFinish(ctx, cx, cy, radius, art, pose, compact) {
    const facing = art.facing || 1;
    const landmarks = faceLandmarks(art);
    const faceArt = faceArt7Profile(art);
    const expression = expressionGeometry(pose);
    const nearEyeX = cx + facing * radius * (landmarks.eyeSpacing + faceArt.eyeSet);
    const farEyeX = cx - facing * radius * (landmarks.eyeSpacing + faceArt.eyeSet)
      * (0.72 + pose.yaw * 0.18);
    const nearEyeY = cy - radius * landmarks.asymmetry * 0.2
      + radius * faceArt.gazeY * 0.08;
    const farEyeY = cy + radius * landmarks.asymmetry * 0.24
      + radius * faceArt.gazeY * 0.08;
    const fierce = [
      "fury",
      "glare",
      "scarred",
      "charge",
      "raider",
      "arrogant",
    ].includes(pose.expression);
    const gentle = ["gentle", "calm", "measured", "steady"].includes(pose.expression);
    const feminineLift = art.feminine ? 1.12 : 1;
    const eyeHeight = radius * (fierce ? 0.075 : gentle ? 0.13 : 0.105) * feminineLift;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Bright fantasy-anime cel shading: two broad shadow groups and one clean
    // highlight keep every face readable at hand-card size.
    ctx.save();
    painterlyFacePath(ctx, cx, cy, radius, art, pose);
    ctx.clip();
    ctx.fillStyle = compact ? "rgba(255,239,211,.1)" : "rgba(255,243,220,.12)";
    ctx.beginPath();
    ctx.moveTo(cx - facing * radius * 0.02, cy - radius * 1.02);
    ctx.lineTo(cx + facing * radius * 1.08, cy - radius * 0.7);
    ctx.lineTo(cx + facing * radius * 0.8, cy + radius * 0.72);
    ctx.lineTo(cx + facing * radius * 0.12, cy + radius * 0.98);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = compact ? "rgba(44,27,45,.24)" : "rgba(38,24,42,.22)";
    ctx.beginPath();
    ctx.moveTo(cx - facing * radius * 1.08, cy - radius * 0.9);
    ctx.lineTo(cx - facing * radius * 0.02, cy - radius * 0.48);
    ctx.lineTo(cx - facing * radius * 0.12, cy + radius * 0.18);
    ctx.lineTo(cx - facing * radius * 0.78, cy + radius * 0.76);
    ctx.lineTo(cx - facing * radius * 1.12, cy + radius * 0.38);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = compact ? "rgba(55,27,40,.28)" : "rgba(52,27,41,.24)";
    ctx.beginPath();
    ctx.moveTo(cx - facing * radius * 0.72, cy + radius * 0.48);
    ctx.quadraticCurveTo(cx, cy + radius * 0.82, cx + facing * radius * 0.7, cy + radius * 0.5);
    ctx.lineTo(cx + facing * radius * 0.4, cy + radius * 0.9);
    ctx.lineTo(cx - facing * radius * 0.3, cy + radius * 1.05);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Clean animation contours replace the rough ink response from v9.
    ctx.strokeStyle = "rgba(20,25,38,.94)";
    ctx.lineWidth = Math.max(0.95, radius * (compact ? 0.09 : 0.058));
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.72, cy - radius * 0.6);
    ctx.bezierCurveTo(
      cx - radius * 0.93,
      cy - radius * 0.04,
      cx - radius * 0.72,
      cy + radius * 0.46,
      cx - radius * 0.38,
      cy + radius * (art.beard === "none" ? 0.82 : 0.46),
    );
    ctx.moveTo(cx + radius * 0.72, cy - radius * 0.58);
    ctx.bezierCurveTo(
      cx + radius * 0.92,
      cy - radius * 0.02,
      cx + radius * 0.7,
      cy + radius * 0.44,
      cx + radius * 0.36,
      cy + radius * (art.beard === "none" ? 0.82 : 0.46),
    );
    ctx.stroke();

    const drawAnimeEye = (eyeX, eyeY, eyeWidth, isNear) => {
      const open = eyeHeight * (isNear ? 1 : 0.76) * expression.eyeOpen;
      ctx.beginPath();
      ctx.moveTo(eyeX - facing * eyeWidth, eyeY);
      ctx.quadraticCurveTo(eyeX, eyeY - open, eyeX + facing * eyeWidth, eyeY);
      ctx.quadraticCurveTo(eyeX, eyeY + open * 0.58, eyeX - facing * eyeWidth, eyeY);
      ctx.closePath();
      ctx.fillStyle = "#fff8ea";
      ctx.fill();
      ctx.strokeStyle = "rgba(18,25,42,.98)";
      ctx.lineWidth = Math.max(0.85, radius * (compact ? 0.078 : 0.052));
      ctx.stroke();

      const gazeX = facing * radius * faceArt.gazeX * 0.045;
      const gazeY = radius * faceArt.gazeY * 0.05;
      const irisRadius = radius * (isNear ? 0.076 : 0.057);
      ctx.fillStyle = fierce ? "#b34a38" : art.feminine ? "#5567c9" : "#3179b7";
      ellipsePath(ctx, eyeX + gazeX, eyeY + gazeY, irisRadius, irisRadius * 1.08);
      ctx.fill();
      ctx.fillStyle = "#0b0c10";
      ellipsePath(ctx, eyeX + gazeX, eyeY + gazeY, irisRadius * 0.56, irisRadius * 0.66);
      ctx.fill();
      ctx.fillStyle = "#fffdf7";
      ellipsePath(
        ctx,
        eyeX + gazeX + facing * irisRadius * 0.28,
        eyeY + gazeY - irisRadius * 0.32,
        Math.max(0.7, irisRadius * 0.24),
        Math.max(0.7, irisRadius * 0.24),
      );
      ctx.fill();
      if (!compact && isNear) {
        ctx.fillStyle = "rgba(255,255,255,.8)";
        ellipsePath(
          ctx,
          eyeX + gazeX - facing * irisRadius * 0.18,
          eyeY + gazeY + irisRadius * 0.3,
          Math.max(0.45, irisRadius * 0.11),
          Math.max(0.45, irisRadius * 0.11),
        );
        ctx.fill();
      }
    };

    const nearWidth = radius * 0.27 * faceArt.eyeWidth;
    const farWidth = radius * (0.2 - pose.yaw * 0.06) * faceArt.eyeWidth;
    drawAnimeEye(farEyeX, farEyeY, farWidth, false);
    drawAnimeEye(nearEyeX, nearEyeY, nearWidth, true);

    // Tapered brows and a single nose bridge follow animation-production
    // shorthand instead of the previous textured historical rendering.
    const browSlant = fierce ? radius * 0.13 : gentle ? radius * 0.035 : radius * 0.075;
    ctx.strokeStyle = "rgba(27,20,27,.95)";
    ctx.lineWidth = Math.max(1, radius * (compact ? 0.1 : 0.073));
    ctx.beginPath();
    ctx.moveTo(farEyeX - facing * farWidth, farEyeY - eyeHeight * 1.25);
    ctx.lineTo(farEyeX + facing * farWidth, farEyeY - eyeHeight * 1.25 + browSlant);
    ctx.moveTo(nearEyeX - facing * nearWidth, nearEyeY - eyeHeight * 1.34 + browSlant);
    ctx.lineTo(nearEyeX + facing * nearWidth, nearEyeY - eyeHeight * 1.34);
    ctx.stroke();

    ctx.strokeStyle = "rgba(91,48,48,.72)";
    ctx.lineWidth = Math.max(0.7, radius * (compact ? 0.058 : 0.041));
    ctx.beginPath();
    ctx.moveTo(cx + facing * radius * 0.08, cy - radius * 0.1);
    ctx.quadraticCurveTo(
      cx + facing * radius * 0.2,
      cy + radius * 0.18,
      cx + facing * radius * 0.29,
      cy + radius * 0.39,
    );
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,240,218,.52)";
    ctx.lineWidth = Math.max(0.7, radius * (compact ? 0.052 : 0.034));
    ctx.beginPath();
    ctx.moveTo(cx + facing * radius * 0.21, cy - radius * 0.62);
    ctx.quadraticCurveTo(
      cx + facing * radius * 0.48,
      cy - radius * 0.3,
      cx + facing * radius * 0.5,
      cy + radius * 0.02,
    );
    ctx.stroke();
    ctx.restore();
  }

  function paintAnimeActionPanelFinish(ctx, x, y, width, height, seed, art, style, compact) {
    const noise = seededNoise(seed ^ 0x77a9d);
    const facing = art.facing || 1;
    const accent = poseColor(art, style);
    ctx.save();
    roundedRect(ctx, x, y, width, height, Math.max(4, width * 0.05));
    ctx.clip();
    ctx.lineCap = "round";

    // Option 3 supplies the action grammar: hard diagonal cuts converge around
    // the clean Option 2 character design without covering the face.
    const speedLineCount = compact ? 7 : 15;
    for (let line = 0; line < speedLineCount; line += 1) {
      const side = line % 2 ? -facing : facing;
      const edgeX = x + width * (side > 0 ? 1.04 : -0.04);
      const edgeY = y + height * (0.08 + noise() * 0.84);
      const innerX = x + width * (side > 0 ? 0.73 : 0.27);
      const innerY = edgeY + (noise() - 0.5) * height * 0.16;
      ctx.strokeStyle = line % 3 === 0
        ? colorWithAlpha(accent, compact ? 0.28 : 0.22)
        : "rgba(246,235,213,.16)";
      ctx.lineWidth = Math.max(0.55, width * (line % 3 === 0 ? 0.009 : 0.0045));
      ctx.beginPath();
      ctx.moveTo(edgeX, edgeY);
      ctx.lineTo(innerX, innerY);
      ctx.stroke();
    }

    // Flat cyan magic rings add the bright academy-fantasy tone of Option 2.
    const magicX = x + width * (facing > 0 ? 0.18 : 0.82);
    const magicY = y + height * 0.33;
    ctx.strokeStyle = colorWithAlpha("#72dcff", compact ? 0.28 : 0.34);
    for (let ring = 0; ring < (compact ? 2 : 3); ring += 1) {
      ctx.lineWidth = Math.max(0.55, width * (0.004 + ring * 0.0015));
      ctx.beginPath();
      ctx.arc(
        magicX,
        magicY,
        width * (0.13 + ring * 0.075),
        -Math.PI * 0.78,
        Math.PI * 0.58,
      );
      ctx.stroke();
    }

    ctx.strokeStyle = colorWithAlpha(style.secondary, compact ? 0.5 : 0.42);
    ctx.lineWidth = Math.max(0.7, width * 0.006);
    ctx.beginPath();
    ctx.moveTo(x + width * 0.05, y + height * 0.06);
    ctx.lineTo(x + width * 0.36, y + height * 0.06);
    ctx.stroke();
    ctx.restore();
  }

  function paintSurfaceGlaze(ctx, x, y, width, height, seed, art, style, compact) {
    const noise = seededNoise(seed ^ 0x4b7a31);
    ctx.save();
    roundedRect(ctx, x, y, width, height, Math.max(4, width * 0.05));
    ctx.clip();
    ctx.lineCap = "round";
    const strokes = compact ? 2 : 6;
    for (let index = 0; index < strokes; index += 1) {
      const sx = x + noise() * width;
      const sy = y + noise() * height;
      const length = width * (0.025 + noise() * (compact ? 0.12 : 0.2));
      const warm = noise() > 0.5;
      ctx.globalAlpha = compact ? 0.022 + noise() * 0.025 : 0.014 + noise() * 0.026;
      ctx.strokeStyle = warm ? portraitShiftColor(poseColor(art, style), 0.28) : "#030708";
      ctx.lineWidth = Math.max(0.5, width * (0.003 + noise() * 0.012));
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(
        sx + length * 0.34,
        sy + (noise() - 0.5) * height * 0.06,
        sx + length * 0.72,
        sy + (noise() - 0.5) * height * 0.04,
        sx + length,
        sy + (noise() - 0.5) * height * 0.025,
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const vignette = ctx.createRadialGradient(
      x + width * 0.52,
      y + height * 0.4,
      width * 0.16,
      x + width * 0.52,
      y + height * 0.42,
      width * 0.68,
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(0.74, "rgba(0,0,0,.04)");
    vignette.addColorStop(1, "rgba(0,0,0,.52)");
    ctx.fillStyle = vignette;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }

  function poseColor(art, style) {
    const pose = portraitPaintProfile(art);
    return pose.accent || style.secondary;
  }

  const PORTRAIT_SURFACE_CACHE = new Map();
  const PORTRAIT_SURFACE_CACHE_LIMIT = 144;
  const portraitCacheMetrics = { hits: 0, misses: 0, paints: 0, evictions: 0 };
  const ORIGINAL_CARD_ART_VERSION = "original-webtoon-v1-20260731";
  const ORIGINAL_CARD_ART_IDS = new Set([
    "shu_liu_bei",
    "shu_guan_yu",
    "shu_zhang_fei",
    "shu_zhao_yun",
    "shu_zhuge_liang",
    "shu_huang_zhong",
    "shu_ma_chao",
    "wei_cao_cao",
    "wei_sima_yi",
    "wei_xiahou_dun",
    "wei_dian_wei",
    "wei_zhang_liao",
    "wei_guo_jia",
    "wei_xu_zhu",
    "wu_sun_quan",
    "wu_zhou_yu",
    "wu_gan_ning",
    "wu_lu_meng",
    "wu_huang_gai",
    "wu_sun_shangxiang",
    "wu_lu_xun",
    "nanman_meng_huo",
    "nanman_zhu_rong",
    "nanman_wu_tu_gu",
    "nanman_mu_lu",
    "nanman_a_hui_nan",
    "qun_lu_bu",
  ]);
  const ORIGINAL_CARD_ART_CACHE = new Map();
  const ORIGINAL_CARD_ART_REFRESHERS = new Set();
  const originalCardArtMetrics = {
    requested: 0,
    loaded: 0,
    failed: 0,
    draws: 0,
  };
  const PORTRAIT_SURFACE_PROFILES = Object.freeze({
    HAND: Object.freeze({ width: 96, height: 66.4, rasterScale: 1.75 }),
    BOARD: Object.freeze({ width: 103, height: 86, rasterScale: 1.75 }),
    DETAIL: Object.freeze({ width: 131, height: 117, rasterScale: 2 }),
    GALLERY: Object.freeze({ width: 250, height: 126, rasterScale: 2 }),
  });

  function originalCardArtSource(card) {
    const id = String(getCardValue(card, "id", ""));
    if (!ORIGINAL_CARD_ART_IDS.has(id)) return "";
    return `/art/cards/${id}.jpg?v=${ORIGINAL_CARD_ART_VERSION}`;
  }

  function originalCardArtSnapshot() {
    return {
      ...originalCardArtMetrics,
      size: ORIGINAL_CARD_ART_CACHE.size,
      expected: ORIGINAL_CARD_ART_IDS.size,
      version: ORIGINAL_CARD_ART_VERSION,
    };
  }

  function notifyOriginalCardArtReady() {
    ORIGINAL_CARD_ART_REFRESHERS.forEach((refresh) => {
      try {
        refresh();
      } catch {
        // A destroyed board can disappear between image decode and this callback.
      }
    });
  }

  function requestOriginalCardArt(card) {
    const source = originalCardArtSource(card);
    if (!source || typeof global.Image !== "function") return null;
    const cached = ORIGINAL_CARD_ART_CACHE.get(source);
    if (cached) return cached;
    const image = new global.Image();
    const entry = { source, image, status: "loading" };
    ORIGINAL_CARD_ART_CACHE.set(source, entry);
    originalCardArtMetrics.requested += 1;
    image.decoding = "async";
    image.onload = () => {
      entry.status = "ready";
      originalCardArtMetrics.loaded += 1;
      notifyOriginalCardArtReady();
    };
    image.onerror = () => {
      entry.status = "failed";
      originalCardArtMetrics.failed += 1;
      notifyOriginalCardArtReady();
    };
    image.src = source;
    return entry;
  }

  function originalCardArtFocalPoint(card) {
    const id = String(getCardValue(card, "id", ""));
    if (["wei_dian_wei", "wei_xu_zhu", "nanman_wu_tu_gu"].includes(id)) {
      return { x: 0.5, y: 0.34 };
    }
    if (["shu_huang_zhong", "wei_guo_jia", "wu_lu_xun"].includes(id)) {
      return { x: 0.5, y: 0.31 };
    }
    return { x: 0.5, y: 0.28 };
  }

  function drawOriginalCardArt(ctx, x, y, width, height, card, compact) {
    const entry = requestOriginalCardArt(card);
    const image = entry && entry.image;
    const imageWidth = Number(image && (image.naturalWidth || image.width)) || 0;
    const imageHeight = Number(image && (image.naturalHeight || image.height)) || 0;
    if (!entry || entry.status !== "ready" || !imageWidth || !imageHeight) return false;

    const destinationAspect = width / Math.max(1, height);
    const sourceAspect = imageWidth / imageHeight;
    const focal = originalCardArtFocalPoint(card);
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = imageWidth;
    let sourceHeight = imageHeight;
    if (destinationAspect > sourceAspect) {
      sourceHeight = imageWidth / destinationAspect;
      sourceY = clamp(
        imageHeight * focal.y - sourceHeight * 0.5,
        0,
        imageHeight - sourceHeight,
      );
    } else {
      sourceWidth = imageHeight * destinationAspect;
      sourceX = clamp(
        imageWidth * focal.x - sourceWidth * 0.5,
        0,
        imageWidth - sourceWidth,
      );
    }

    const style = getFactionStyle(card);
    ctx.save();
    roundedRect(ctx, x, y, width, height, Math.max(4, width * 0.05));
    ctx.clip();
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      x,
      y,
      width,
      height,
    );

    const topSheen = ctx.createLinearGradient(x, y, x, y + height * 0.58);
    topSheen.addColorStop(0, compact ? "rgba(255,255,255,.11)" : "rgba(255,255,255,.07)");
    topSheen.addColorStop(0.52, "rgba(255,255,255,0)");
    ctx.fillStyle = topSheen;
    ctx.fillRect(x, y, width, height * 0.62);

    const lowerReadability = ctx.createLinearGradient(x, y + height * 0.48, x, y + height);
    lowerReadability.addColorStop(0, "rgba(4,7,12,0)");
    lowerReadability.addColorStop(1, compact ? "rgba(4,7,12,.32)" : "rgba(4,7,12,.22)");
    ctx.fillStyle = lowerReadability;
    ctx.fillRect(x, y + height * 0.44, width, height * 0.56);

    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = colorWithAlpha(style.glow, compact ? 0.34 : 0.24);
    ctx.lineWidth = Math.max(0.8, width * 0.008);
    roundedRect(
      ctx,
      x + ctx.lineWidth * 0.5,
      y + ctx.lineWidth * 0.5,
      width - ctx.lineWidth,
      height - ctx.lineWidth,
      Math.max(4, width * 0.05),
    );
    ctx.stroke();
    ctx.restore();
    originalCardArtMetrics.draws += 1;
    return true;
  }

  function portraitCacheSnapshot() {
    return {
      ...portraitCacheMetrics,
      size: PORTRAIT_SURFACE_CACHE.size,
      limit: PORTRAIT_SURFACE_CACHE_LIMIT,
    };
  }

  function portraitSurfaceProfile(width, height, compact, requestedBucket) {
    const explicit = String(requestedBucket || "").toUpperCase();
    const bucket = PORTRAIT_SURFACE_PROFILES[explicit]
      ? explicit
      : compact
        ? "BOARD"
        : Number(width) >= 180 && Number(height) <= 150
          ? "GALLERY"
          : Number(width) >= 112
            ? "DETAIL"
            : "HAND";
    return {
      bucket,
      ...PORTRAIT_SURFACE_PROFILES[bucket],
    };
  }

  function portraitSurfaceKey(card, width, height, compact, requestedBucket) {
    const art = portraitArchetype(card);
    const style = getFactionStyle(card);
    const profile = portraitSurfaceProfile(width, height, compact, requestedBucket);
    return [
      getCardValue(card, "id", getCardValue(card, "name", "unknown")),
      art.archetype,
      ANIME_CEL_STYLE_VERSION,
      profile.bucket,
      compact ? "COMPACT" : "FULL",
      style.primary,
      style.secondary,
      style.glow,
    ].join("|");
  }

  function createPortraitCacheSurface(ctx, width, height, rasterScale) {
    const ownerDocument = ctx.canvas && ctx.canvas.ownerDocument || global.document;
    let surface = null;
    if (ownerDocument && typeof ownerDocument.createElement === "function") {
      surface = ownerDocument.createElement("canvas");
      surface.width = Math.max(1, Math.ceil(width * rasterScale));
      surface.height = Math.max(1, Math.ceil(height * rasterScale));
    } else if (typeof global.OffscreenCanvas === "function") {
      surface = new global.OffscreenCanvas(
        Math.max(1, Math.ceil(width * rasterScale)),
        Math.max(1, Math.ceil(height * rasterScale)),
      );
    }
    return surface;
  }

  function drawPortrait(ctx, x, y, width, height, card, compact, requestedBucket) {
    if (drawOriginalCardArt(ctx, x, y, width, height, card, compact)) return;
    const profile = portraitSurfaceProfile(width, height, compact, requestedBucket);
    const key = portraitSurfaceKey(card, width, height, compact, profile.bucket);
    const cached = PORTRAIT_SURFACE_CACHE.get(key);
    if (cached) {
      portraitCacheMetrics.hits += 1;
      PORTRAIT_SURFACE_CACHE.delete(key);
      PORTRAIT_SURFACE_CACHE.set(key, cached);
      ctx.drawImage(cached, x, y, width, height);
      return;
    }
    portraitCacheMetrics.misses += 1;
    const rasterScale = profile.rasterScale;
    const surface = createPortraitCacheSurface(
      ctx,
      profile.width,
      profile.height,
      rasterScale,
    );
    const portraitCtx = surface && surface.getContext("2d");
    if (!portraitCtx) {
      paintPortraitUncached(ctx, x, y, width, height, card, compact);
      return;
    }
    portraitCtx.setTransform(rasterScale, 0, 0, rasterScale, 0, 0);
    portraitCtx.clearRect(0, 0, profile.width, profile.height);
    paintPortraitUncached(
      portraitCtx,
      0,
      0,
      profile.width,
      profile.height,
      card,
      compact,
    );
    portraitCacheMetrics.paints += 1;
    PORTRAIT_SURFACE_CACHE.set(key, surface);
    while (PORTRAIT_SURFACE_CACHE.size > PORTRAIT_SURFACE_CACHE_LIMIT) {
      const oldestKey = PORTRAIT_SURFACE_CACHE.keys().next().value;
      PORTRAIT_SURFACE_CACHE.delete(oldestKey);
      portraitCacheMetrics.evictions += 1;
    }
    ctx.drawImage(surface, x, y, width, height);
  }

  function portraitFacePath(ctx, cx, headY, radius, art) {
    const profile = faceProfile(art);
    const facing = art.facing || 1;
    ctx.save();
    ctx.translate(cx, headY);
    ctx.scale(facing, 1);
    ctx.beginPath();
    ctx.moveTo(-radius * 0.5, -radius * 1.02);
    ctx.bezierCurveTo(
      -radius * 0.92,
      -radius * 0.72,
      -radius * profile.jaw,
      radius * 0.35,
      -radius * profile.jaw,
      radius * 0.61,
    );
    ctx.quadraticCurveTo(-radius * 0.48, radius * profile.chin, 0, radius * profile.chin);
    ctx.quadraticCurveTo(radius * 0.52, radius * profile.chin, radius * profile.jaw * 0.9, radius * 0.55);
    ctx.quadraticCurveTo(radius * profile.cheek, radius * 0.32, radius * 0.73, radius * 0.18);
    ctx.lineTo(radius * (0.93 + profile.nose), radius * 0.03);
    ctx.lineTo(radius * 0.72, -radius * 0.12);
    ctx.quadraticCurveTo(radius * 0.78, -radius * 0.72, radius * 0.42, -radius * 1.02);
    ctx.closePath();
    ctx.restore();
  }

  function drawPortraitFaceDetails(ctx, cx, headY, radius, art) {
    const profile = faceProfile(art);
    const facing = art.facing || 1;
    const farEyeX = cx - facing * radius * 0.25;
    const nearEyeX = cx + facing * radius * 0.3;
    const fierce = ["fierce", "hawk", "keen"].includes(profile.eye);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#2b1813";
    ctx.lineWidth = Math.max(1, radius * 0.075);
    ctx.beginPath();
    ctx.moveTo(farEyeX - radius * 0.18, headY - radius * (fierce ? 0.14 : 0.1));
    ctx.quadraticCurveTo(farEyeX, headY - radius * (fierce ? 0.22 : 0.15), farEyeX + radius * 0.14, headY - radius * 0.06);
    ctx.moveTo(nearEyeX - radius * 0.23, headY - radius * 0.05);
    ctx.quadraticCurveTo(nearEyeX, headY - radius * (fierce ? 0.24 : 0.17), nearEyeX + radius * 0.24, headY - radius * (fierce ? 0.1 : 0.05));
    ctx.stroke();
    ctx.strokeStyle = "#5e3427";
    ctx.lineWidth = Math.max(0.7, radius * 0.045);
    ctx.beginPath();
    ctx.moveTo(farEyeX - radius * 0.13, headY + radius * 0.01);
    ctx.quadraticCurveTo(farEyeX, headY + radius * 0.07, farEyeX + radius * 0.12, headY + radius * 0.01);
    ctx.moveTo(nearEyeX - radius * 0.18, headY + radius * 0.02);
    ctx.quadraticCurveTo(nearEyeX, headY + radius * 0.09, nearEyeX + radius * 0.18, headY + radius * 0.01);
    ctx.stroke();
    ctx.strokeStyle = "#211514";
    ctx.lineWidth = Math.max(0.8, radius * 0.055);
    ctx.beginPath();
    ctx.arc(farEyeX + facing * radius * 0.015, headY, radius * 0.055, 0.12, Math.PI - 0.12);
    ctx.moveTo(nearEyeX + facing * radius * 0.02 + radius * 0.075, headY);
    ctx.arc(nearEyeX + facing * radius * 0.02, headY, radius * 0.075, 0.1, Math.PI - 0.1);
    ctx.stroke();

    ctx.strokeStyle = colorWithAlpha("#714532", 0.86);
    ctx.lineWidth = Math.max(0.9, radius * 0.055);
    ctx.beginPath();
    ctx.moveTo(cx + facing * radius * 0.09, headY + radius * 0.03);
    ctx.bezierCurveTo(
      cx + facing * radius * 0.18,
      headY + radius * 0.16,
      cx + facing * radius * 0.1,
      headY + radius * 0.34,
      cx + facing * radius * (0.28 + profile.nose * 0.28),
      headY + radius * 0.4,
    );
    ctx.quadraticCurveTo(
      cx + facing * radius * 0.36,
      headY + radius * 0.44,
      cx + facing * radius * 0.24,
      headY + radius * 0.47,
    );
    ctx.stroke();
    ctx.strokeStyle = colorWithAlpha("#8b5940", 0.62);
    ctx.beginPath();
    ctx.moveTo(cx - facing * radius * 0.46, headY + radius * 0.22);
    ctx.quadraticCurveTo(cx - facing * radius * 0.18, headY + radius * 0.34, cx - facing * radius * 0.04, headY + radius * 0.29);
    ctx.stroke();

    ctx.strokeStyle = "#6a3429";
    ctx.lineWidth = Math.max(1, radius * 0.06);
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.22, headY + radius * 0.62);
    ctx.quadraticCurveTo(cx + facing * radius * 0.04, headY + radius * (art.feminine ? 0.68 : 0.73), cx + radius * 0.26, headY + radius * 0.58);
    ctx.stroke();
    ctx.strokeStyle = colorWithAlpha("#f0b994", 0.34);
    ctx.lineWidth = Math.max(0.7, radius * 0.04);
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.14, headY + radius * 0.59);
    ctx.quadraticCurveTo(cx + facing * radius * 0.05, headY + radius * 0.64, cx + radius * 0.16, headY + radius * 0.58);
    ctx.stroke();

    if (profile.age >= 2 || profile.eye === "tired") {
      ctx.strokeStyle = colorWithAlpha("#6d4030", 0.44);
      ctx.lineWidth = Math.max(0.6, radius * 0.035);
      for (let wrinkle = 0; wrinkle < Math.min(3, profile.age); wrinkle += 1) {
        ctx.beginPath();
        ctx.moveTo(cx - facing * radius * 0.52, headY - radius * (0.42 - wrinkle * 0.1));
        ctx.quadraticCurveTo(cx, headY - radius * (0.48 - wrinkle * 0.08), cx + facing * radius * 0.42, headY - radius * (0.4 - wrinkle * 0.08));
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(nearEyeX + facing * radius * 0.17, headY + radius * 0.12);
      ctx.lineTo(nearEyeX + facing * radius * 0.35, headY + radius * 0.22);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPortraitLegacyLayered(ctx, x, y, width, height, card, compact) {
    const style = getFactionStyle(card);
    const art = portraitArchetype(card);
    const focalPose = portraitPaintProfile(art);
    const seed = hashString(`${getCardValue(card, "id", "")}|${getCardValue(card, "name", "")}`);
    const facing = art.facing || 1;
    const cx = x + width * (0.5 + facing * 0.035 + (art.weapon === "twin-swords" ? 0 : -0.015));
    const headY = y + height * (art.feminine ? 0.37 : 0.35);
    const radius = width * (art.archetype === "twin-halberds-giant" ? 0.17 : compact ? 0.145 : 0.14);
    const skin = faceProfile(art).tone;
    ctx.save();
    roundedRect(ctx, x, y, width, height, Math.max(4, width * 0.05));
    ctx.clip();
    const sky = ctx.createLinearGradient(x, y, x, y + height);
    sky.addColorStop(0, colorWithAlpha(style.primary, 0.98));
    sky.addColorStop(0.58, "#17282a");
    sky.addColorStop(1, "#090f11");
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, width, height);
    drawHistoricalScene(ctx, x, y, width, height, art, style, compact);
    if (!compact) {
      ctx.save();
      ctx.globalAlpha = 0.66;
      drawPortraitPattern(ctx, x, y, width, height, art, style);
      ctx.restore();
    }
    const halo = ctx.createRadialGradient(cx, headY, 1, cx, headY, width * 0.48);
    halo.addColorStop(0, colorWithAlpha(style.glow, 0.54));
    halo.addColorStop(1, colorWithAlpha(style.glow, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(x, y, width, height);
    paintSubjectDepthBacklight(
      ctx,
      x,
      y,
      width,
      height,
      art,
      focalPose,
      cx,
      headY,
      radius,
      compact,
    );

    ctx.save();
    ctx.translate(cx, headY + height * 0.14);
    ctx.rotate(Number(art.tilt || 0));
    ctx.translate(-cx, -(headY + height * 0.14));
    ctx.fillStyle = art.robe;
    ctx.beginPath();
    const broad = ["twin-halberds-giant", "serpent-spear-wild-beard"].includes(art.archetype);
    const shoulder = art.feminine ? 0.3 : broad ? 0.48 : 0.4;
    const leftShoulder = shoulder * (facing > 0 ? 0.82 : 1.12);
    const rightShoulder = shoulder * (facing > 0 ? 1.12 : 0.82);
    ctx.moveTo(cx - width * leftShoulder, y + height);
    ctx.quadraticCurveTo(cx - width * leftShoulder * 0.72, y + height * (broad ? 0.52 : 0.56), cx, y + height * 0.55);
    ctx.quadraticCurveTo(cx + width * rightShoulder * 0.72, y + height * (broad ? 0.52 : 0.56), cx + width * rightShoulder, y + height);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = colorWithAlpha(style.secondary, 0.9);
    ctx.lineWidth = Math.max(1.2, width * 0.018);
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = facing > 0 ? "#030607" : "#fff0c3";
    ctx.beginPath();
    ctx.moveTo(cx, y + height * 0.55);
    ctx.lineTo(cx + facing * width * 0.43, y + height);
    ctx.lineTo(cx, y + height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = colorWithAlpha(style.glow, 0.72);
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = width * 0.045;
    ctx.lineWidth = Math.max(0.8, width * 0.009);
    ctx.beginPath();
    ctx.moveTo(cx + facing * width * rightShoulder * 0.88, y + height * 0.91);
    ctx.quadraticCurveTo(
      cx + facing * width * rightShoulder * 0.72,
      y + height * 0.58,
      cx + facing * radius * 0.78,
      headY - radius * 0.66,
    );
    ctx.stroke();
    ctx.restore();
    if (!/scholar|soft-cap/.test(art.headgear)) {
      ctx.save();
      ctx.fillStyle = colorWithAlpha("#11181b", 0.68);
      ctx.strokeStyle = colorWithAlpha(style.secondary, 0.88);
      ctx.lineWidth = Math.max(1, width * 0.013);
      ctx.beginPath();
      ctx.moveTo(cx - width * 0.2, y + height * 0.59);
      ctx.lineTo(cx - width * 0.14, y + height * 0.93);
      ctx.lineTo(cx, y + height * 0.98);
      ctx.lineTo(cx + width * 0.14, y + height * 0.93);
      ctx.lineTo(cx + width * 0.2, y + height * 0.59);
      ctx.quadraticCurveTo(cx, y + height * 0.52, cx - width * 0.2, y + height * 0.59);
      ctx.fill();
      ctx.stroke();
      for (let row = 0; row < 3; row += 1) {
        ctx.beginPath();
        ctx.moveTo(cx - width * (0.16 - row * 0.025), y + height * (0.67 + row * 0.09));
        ctx.lineTo(cx + width * (0.16 - row * 0.025), y + height * (0.67 + row * 0.09));
        ctx.stroke();
      }
      for (let side = -1; side <= 1; side += 2) {
        for (let row = 0; row < 3; row += 1) {
          ellipsePath(ctx, cx + side * width * 0.13, y + height * (0.65 + row * 0.1), width * 0.012, width * 0.012);
          ctx.fillStyle = style.secondary;
          ctx.fill();
        }
      }
      ctx.restore();
    } else {
      ctx.save();
      ctx.strokeStyle = colorWithAlpha(style.secondary, 0.6);
      ctx.lineWidth = Math.max(1, width * 0.011);
      for (let line = -2; line <= 2; line += 1) {
        ctx.beginPath();
        ctx.moveTo(cx + line * width * 0.055, y + height * 0.6);
        ctx.lineTo(cx + line * width * 0.045, y + height * 0.96);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (!/scholar|soft-cap/.test(art.headgear)) {
      for (let side = -1; side <= 1; side += 2) {
        ellipsePath(ctx, cx + side * width * 0.24, y + height * 0.69, width * (broad ? 0.19 : 0.145), height * 0.1);
        ctx.fillStyle = side < 0 ? style.primary : art.robe;
        ctx.fill();
        ctx.stroke();
      }
    }

    drawPortraitArms(ctx, x, y, width, height, art, style, cx);
    portraitFacePath(ctx, cx, headY, radius, art);
    ctx.fillStyle = skin;
    ctx.fill();
    ctx.strokeStyle = "#3b231b";
    ctx.lineWidth = Math.max(1, width * 0.014);
    ctx.stroke();
    ctx.save();
    portraitFacePath(ctx, cx, headY, radius, art);
    ctx.clip();
    const faceShade = ctx.createLinearGradient(
      cx - facing * radius,
      headY,
      cx + facing * radius,
      headY,
    );
    faceShade.addColorStop(0, "rgba(24,9,8,.38)");
    faceShade.addColorStop(0.5, "rgba(76,31,20,.09)");
    faceShade.addColorStop(1, "rgba(255,226,180,.32)");
    ctx.fillStyle = faceShade;
    ctx.fillRect(cx - radius, headY - radius * 1.2, radius * 2, radius * 2.5);
    const foreheadLight = ctx.createRadialGradient(
      cx + facing * radius * 0.28,
      headY - radius * 0.36,
      0,
      cx + facing * radius * 0.28,
      headY - radius * 0.36,
      radius * 0.72,
    );
    foreheadLight.addColorStop(0, "rgba(255,238,197,.25)");
    foreheadLight.addColorStop(1, "rgba(255,238,197,0)");
    ctx.fillStyle = foreheadLight;
    ctx.fillRect(cx - radius, headY - radius, radius * 2, radius * 2);
    ctx.restore();
    ctx.fillStyle = "#17191b";
    ctx.beginPath();
    ctx.arc(cx, headY - radius * 0.12, radius * 1.03, Math.PI, TAU);
    ctx.lineTo(cx + radius * 0.86, headY - radius * 0.2);
    ctx.quadraticCurveTo(cx, headY - radius * 0.34, cx - radius * 0.86, headY - radius * 0.2);
    ctx.closePath();
    ctx.fill();
    if (art.feminine) {
      ctx.fillRect(cx - radius * 1.02, headY - radius * 0.2, radius * 0.34, radius * 2.1);
      ctx.fillRect(cx + radius * 0.68, headY - radius * 0.2, radius * 0.34, radius * 2.1);
    }
    drawPortraitHeadgear(ctx, cx, headY, radius, width, art, style);

    drawPortraitFaceDetails(ctx, cx, headY, radius, art);
    const cheek = ctx.createRadialGradient(cx - facing * radius * 0.42, headY + radius * 0.3, 0, cx - facing * radius * 0.42, headY + radius * 0.3, radius * 0.48);
    cheek.addColorStop(0, "rgba(255,214,174,.22)");
    cheek.addColorStop(1, "rgba(100,42,30,0)");
    ctx.fillStyle = cheek;
    ellipsePath(ctx, cx - facing * radius * 0.34, headY + radius * 0.31, radius * 0.48, radius * 0.4);
    ctx.fill();
    if (art.eyepatch) {
      ctx.lineWidth = radius * 0.2;
      ctx.beginPath();
      ctx.moveTo(cx - radius * 0.84, headY - radius * 0.48);
      ctx.lineTo(cx + radius * 0.58, headY + radius * 0.12);
      ctx.stroke();
      ellipsePath(ctx, cx - radius * 0.32, headY - radius * 0.08, radius * 0.34, radius * 0.25);
      ctx.fillStyle = "#101214";
      ctx.fill();
    }

    if (art.beard !== "none") {
      ctx.strokeStyle = art.beard.startsWith("white") ? "#d8d4c5" : art.beard === "wild" ? "#171413" : "#342119";
      ctx.fillStyle = ctx.strokeStyle;
      if (["long", "white-long"].includes(art.beard)) {
        ctx.beginPath();
        ctx.moveTo(cx - radius * 0.48, headY + radius * 0.35);
        ctx.quadraticCurveTo(cx - radius * 0.35, headY + radius * 1.8, cx, headY + radius * 2.45);
        ctx.quadraticCurveTo(cx + radius * 0.34, headY + radius * 1.8, cx + radius * 0.48, headY + radius * 0.35);
        ctx.fill();
      } else if (["wild", "square", "white-square"].includes(art.beard)) {
        const spread = art.beard === "wild" ? 1.08 : 0.72;
        ctx.beginPath();
        ctx.moveTo(cx - radius * spread, headY + radius * 0.22);
        ctx.lineTo(cx - radius * 0.72, headY + radius * 1.58);
        ctx.lineTo(cx, headY + radius * (art.beard === "wild" ? 1.88 : 1.52));
        ctx.lineTo(cx + radius * 0.72, headY + radius * 1.58);
        ctx.lineTo(cx + radius * spread, headY + radius * 0.22);
        ctx.quadraticCurveTo(cx, headY + radius * 0.72, cx - radius * spread, headY + radius * 0.22);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(cx - radius * 0.5, headY + radius * 0.44);
        ctx.quadraticCurveTo(cx, headY + radius * (art.beard === "goatee" ? 1.52 : 1.05), cx + radius * 0.5, headY + radius * 0.44);
        ctx.stroke();
      }
    }
    if (art.beard !== "none") {
      const whiteBeard = art.beard.startsWith("white");
      ctx.save();
      ctx.strokeStyle = whiteBeard ? "rgba(91,79,67,.55)" : "rgba(218,166,107,.24)";
      ctx.lineWidth = Math.max(0.55, width * 0.007);
      ctx.lineCap = "round";
      const strandCount = ["long", "white-long", "wild"].includes(art.beard) ? 11 : 7;
      for (let strand = 0; strand < strandCount; strand += 1) {
        const normalized = strandCount <= 1 ? 0 : strand / (strandCount - 1) - 0.5;
        const startX = cx + normalized * radius * (art.beard === "wild" ? 1.55 : 0.82);
        const startY = headY + radius * (0.42 + Math.abs(normalized) * 0.12);
        const endY = headY + radius * (
          ["long", "white-long"].includes(art.beard)
            ? 2.18 - Math.abs(normalized) * 0.56
            : art.beard === "wild"
              ? 1.62 - Math.abs(normalized) * 0.3
              : 1.28 - Math.abs(normalized) * 0.18
        );
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(
          startX - facing * radius * 0.08,
          lerp(startY, endY, 0.35),
          startX + facing * radius * (0.08 + normalized * 0.09),
          lerp(startY, endY, 0.72),
          cx + normalized * radius * 0.42,
          endY,
        );
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
    drawPortraitWeapon(ctx, x, y, width, height, art, style);
    drawPortraitTexture(ctx, x, y, width, height, seed, style);
    drawPortraitForeground(ctx, x, y, width, height, seed, art, style);
    if (!compact) {
      ctx.globalAlpha = 0.58;
      drawCenteredText(ctx, String(getCardValue(card, "name", "")).slice(0, 2), x + width * 0.17, y + height * 0.84, {
        font: `900 ${Math.round(width * 0.15)}px ${SYSTEM_FONT}`,
        color: style.secondary,
        stroke: "#1a1110",
        strokeWidth: 2,
      });
    }
    ctx.restore();
  }

  function animeV11FacePath(ctx, cx, cy, radius, art, landmarks) {
    const feminine = Boolean(art.feminine);
    const temple = feminine ? 0.7 : clamp(landmarks.templeWidth, 0.72, 0.94);
    const jaw = feminine ? 0.42 : clamp(landmarks.jawAngle, 0.42, 0.78);
    const chin = feminine ? 0.82 : 0.76 + landmarks.chinPoint * 0.35;
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius * 0.94);
    ctx.bezierCurveTo(
      cx + radius * temple,
      cy - radius * 0.86,
      cx + radius * 0.82,
      cy - radius * 0.18,
      cx + radius * jaw,
      cy + radius * 0.44,
    );
    ctx.quadraticCurveTo(
      cx + radius * 0.24,
      cy + radius * chin,
      cx,
      cy + radius * 0.94,
    );
    ctx.quadraticCurveTo(
      cx - radius * 0.24,
      cy + radius * chin,
      cx - radius * jaw,
      cy + radius * 0.44,
    );
    ctx.bezierCurveTo(
      cx - radius * 0.82,
      cy - radius * 0.18,
      cx - radius * temple,
      cy - radius * 0.86,
      cx,
      cy - radius * 0.94,
    );
    ctx.closePath();
  }

  function animeV11IdentityProfile(card, art) {
    const id = String(getCardValue(card, "id", art.archetype || ""));
    const hash = hashString(`${id}|anime-v11-identity`);
    return {
      hairVariant: hash % 5,
      fringeBias: ((hash >>> 3) % 9 - 4) / 18,
      irisRing: ((hash >>> 7) % 5) / 5,
      magicPhase: ((hash >>> 11) % 24) / 24 * TAU,
      emblemSides: 3 + ((hash >>> 16) % 5),
      flareCount: 7 + ((hash >>> 20) % 6),
    };
  }

  function paintAnimeV11Backdrop(ctx, x, y, width, height, card, art, style, pose, seed, compact) {
    const noise = seededNoise(seed ^ 0x11ace);
    const fiery = /fire|red-cliffs|hulao|guandu/.test(String(art.scene));
    const watery = /river|fleet|tide|wave|yangtze/.test(`${art.scene}|${art.background}`);
    const arcane = /stars|constellation|raven|bamboo|ink|map/.test(`${art.scene}|${art.background}`);
    const jungle = /jungle|beast|rattan|tribal|capture/.test(`${art.scene}|${art.background}`);
    const topColor = fiery
      ? "#ff8a58"
      : watery
        ? "#51bfe0"
        : arcane
          ? "#8d86e8"
          : jungle
            ? "#8ccf67"
            : portraitSaturationColor(style.glow, 1.18, 1.05);
    const bottomColor = portraitSaturationColor(style.primary, 1.08, 0.48);

    const sky = ctx.createLinearGradient(x, y, x + width, y + height);
    sky.addColorStop(0, portraitShiftColor(topColor, 0.12));
    sky.addColorStop(0.42, portraitSaturationColor(style.primary, 1.2, 0.82));
    sky.addColorStop(1, portraitShiftColor(bottomColor, -0.3));
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, width, height);

    // A broad white-to-colour diagonal replaces the old dark painted scenery
    // and makes the new anime direction obvious even at 96px hand-card size.
    ctx.fillStyle = "rgba(255,250,238,.17)";
    ctx.beginPath();
    ctx.moveTo(x - width * 0.08, y + height * 0.08);
    ctx.lineTo(x + width * 0.56, y - height * 0.04);
    ctx.lineTo(x + width * 0.22, y + height * 1.08);
    ctx.lineTo(x - width * 0.2, y + height * 0.86);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(10,17,35,.24)";
    ctx.beginPath();
    ctx.moveTo(x + width * 0.72, y - height * 0.08);
    ctx.lineTo(x + width * 1.08, y + height * 0.06);
    ctx.lineTo(x + width * 0.76, y + height * 1.08);
    ctx.lineTo(x + width * 0.52, y + height * 0.94);
    ctx.closePath();
    ctx.fill();

    const sigilX = x + width * (art.facing > 0 ? 0.25 : 0.75);
    const sigilY = y + height * 0.42;
    const sigilRadius = width * (compact ? 0.29 : 0.27);
    ctx.save();
    ctx.translate(sigilX, sigilY);
    ctx.rotate((noise() - 0.5) * 0.8);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = colorWithAlpha(pose.accent, compact ? 0.64 : 0.56);
    ctx.lineWidth = Math.max(0.8, width * 0.009);
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, sigilRadius * (0.48 + ring * 0.25), -Math.PI * 0.92, Math.PI * 0.86);
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(0.6, width * 0.005);
    ctx.beginPath();
    for (let point = 0; point < 6; point += 1) {
      const angle = point * TAU / 6;
      const px = Math.cos(angle) * sigilRadius * 0.68;
      const py = Math.sin(angle) * sigilRadius * 0.68;
      if (point === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    const motifCount = compact ? 5 : 9;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let motif = 0; motif < motifCount; motif += 1) {
      const mx = x + width * (0.06 + noise() * 0.88);
      const my = y + height * (0.08 + noise() * 0.76);
      const size = width * (0.008 + noise() * 0.017);
      ctx.fillStyle = colorWithAlpha(
        motif % 3 === 0 ? "#ffffff" : pose.accent,
        compact ? 0.5 : 0.42,
      );
      if (fiery) {
        ctx.beginPath();
        ctx.moveTo(mx, my - size * 2.4);
        ctx.quadraticCurveTo(mx + size * 1.7, my, mx, my + size * 1.4);
        ctx.quadraticCurveTo(mx - size * 1.5, my, mx, my - size * 2.4);
        ctx.fill();
      } else if (watery) {
        ctx.beginPath();
        ctx.arc(mx, my, size * 1.8, Math.PI * 0.1, Math.PI * 0.9);
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = Math.max(0.5, size * 0.45);
        ctx.stroke();
      } else {
        ctx.fillRect(mx - size * 0.5, my - size * 2.2, size, size * 4.4);
        ctx.fillRect(mx - size * 2.2, my - size * 0.5, size * 4.4, size);
      }
    }
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,.24)";
    ctx.lineCap = "round";
    for (let line = 0; line < (compact ? 8 : 13); line += 1) {
      const fromRight = line % 2 === 0;
      const sy = y + height * (0.05 + noise() * 0.9);
      ctx.lineWidth = Math.max(0.55, width * (line % 3 === 0 ? 0.009 : 0.004));
      ctx.beginPath();
      ctx.moveTo(x + width * (fromRight ? 1.04 : -0.04), sy);
      ctx.lineTo(
        x + width * (fromRight ? 0.72 : 0.28),
        sy + (noise() - 0.5) * height * 0.18,
      );
      ctx.stroke();
    }
  }

  function paintAnimeV11Body(ctx, x, y, width, height, art, style, pose, action, cx, compact) {
    const shoulderY = y + height * 0.62;
    const bottomY = y + height * 1.08;
    const broad = /giant|guardian|bulwark|king|wild|beast/.test(art.archetype);
    const shoulderWidth = width * (broad ? 0.43 : art.feminine ? 0.34 : 0.38);
    const torsoLean = pose.lean + action.torsoAngle * 0.72;

    ctx.save();
    ctx.translate(cx, shoulderY);
    ctx.rotate(torsoLean);
    ctx.translate(-cx, -shoulderY);

    ctx.fillStyle = "rgba(8,14,28,.52)";
    ctx.strokeStyle = "rgba(12,18,31,.98)";
    ctx.lineWidth = Math.max(1.4, width * 0.018);
    ctx.beginPath();
    ctx.moveTo(cx - shoulderWidth * 1.05, shoulderY + height * 0.02);
    ctx.quadraticCurveTo(cx, shoulderY - height * 0.12, cx + shoulderWidth * 1.05, shoulderY + height * 0.02);
    ctx.lineTo(cx + shoulderWidth * 0.82, bottomY);
    ctx.lineTo(cx - shoulderWidth * 0.82, bottomY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const robe = ctx.createLinearGradient(cx - shoulderWidth, shoulderY, cx + shoulderWidth, bottomY);
    robe.addColorStop(0, portraitSaturationColor(art.robe || style.primary, 1.18, 1.02));
    robe.addColorStop(0.52, art.robe || style.primary);
    robe.addColorStop(1, portraitShiftColor(style.primary, -0.34));
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.moveTo(cx - shoulderWidth, shoulderY);
    ctx.quadraticCurveTo(cx, shoulderY - height * 0.08, cx + shoulderWidth, shoulderY);
    ctx.lineTo(cx + shoulderWidth * 0.72, bottomY);
    ctx.lineTo(cx - shoulderWidth * 0.72, bottomY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Large cel-shadow wedge gives the garment a deliberate animation fill.
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = "#10162a";
    ctx.beginPath();
    ctx.moveTo(cx - shoulderWidth, shoulderY);
    ctx.lineTo(cx - shoulderWidth * 0.06, shoulderY - height * 0.04);
    ctx.lineTo(cx - shoulderWidth * 0.2, bottomY);
    ctx.lineTo(cx - shoulderWidth * 0.72, bottomY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = colorWithAlpha(style.secondary, 0.94);
    ctx.lineWidth = Math.max(1.2, width * 0.015);
    ctx.beginPath();
    ctx.moveTo(cx - shoulderWidth * 0.56, shoulderY + height * 0.02);
    ctx.lineTo(cx, shoulderY + height * 0.24);
    ctx.lineTo(cx + shoulderWidth * 0.56, shoulderY + height * 0.02);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, shoulderY + height * 0.24);
    ctx.lineTo(cx, bottomY);
    ctx.stroke();

    const armored = /helmet|halberd|shield|lance|spear|maul|bulwark|cavalier/.test(
      `${art.headgear}|${art.weapon}|${art.archetype}`,
    );
    if (armored) {
      ctx.fillStyle = colorWithAlpha(style.secondary, 0.56);
      ctx.strokeStyle = colorWithAlpha("#fff5cc", 0.48);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + side * shoulderWidth * 0.54, shoulderY - height * 0.015);
        ctx.lineTo(cx + side * shoulderWidth * 1.02, shoulderY + height * 0.02);
        ctx.lineTo(cx + side * shoulderWidth * 0.88, shoulderY + height * 0.2);
        ctx.lineTo(cx + side * shoulderWidth * 0.44, shoulderY + height * 0.13);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    if (!compact) {
      ctx.fillStyle = colorWithAlpha(pose.accent, 0.78);
      ctx.beginPath();
      ctx.arc(cx, shoulderY + height * 0.3, width * 0.037, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#fff5d8";
      ctx.lineWidth = Math.max(0.8, width * 0.006);
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintAnimeV11HairBack(ctx, cx, cy, radius, art, identity) {
    if (/helmet|mask/.test(art.headgear) && !art.feminine) return;
    const longHair = art.feminine || /young|cavalier|monarch|strategist|tactician/.test(art.archetype);
    const hairTone = /white/.test(art.beard) ? "#d9e0e8" : "#11172a";
    ctx.fillStyle = hairTone;
    ctx.strokeStyle = "#0a1020";
    ctx.lineWidth = Math.max(1.2, radius * 0.075);
    if (longHair) {
      ctx.beginPath();
      ctx.moveTo(cx - radius * 0.75, cy - radius * 0.48);
      ctx.quadraticCurveTo(cx - radius * 1.08, cy + radius * 0.5, cx - radius * (0.74 + identity.fringeBias), cy + radius * 1.82);
      ctx.lineTo(cx - radius * 0.2, cy + radius * 1.45);
      ctx.quadraticCurveTo(cx, cy + radius * 0.72, cx + radius * 0.2, cy + radius * 1.45);
      ctx.lineTo(cx + radius * (0.74 - identity.fringeBias), cy + radius * 1.82);
      ctx.quadraticCurveTo(cx + radius * 1.08, cy + radius * 0.5, cx + radius * 0.75, cy - radius * 0.48);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy - radius * 0.18, radius * 0.92, Math.PI, TAU);
    ctx.lineTo(cx + radius * 0.7, cy + radius * 0.22);
    ctx.quadraticCurveTo(cx, cy - radius * 0.24, cx - radius * 0.7, cy + radius * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function paintAnimeV11Eye(ctx, eyeX, eyeY, width, height, facing, irisColor, fierce, identity, compact) {
    ctx.beginPath();
    ctx.moveTo(eyeX - width, eyeY);
    ctx.quadraticCurveTo(eyeX, eyeY - height, eyeX + width, eyeY);
    ctx.quadraticCurveTo(eyeX, eyeY + height * 0.66, eyeX - width, eyeY);
    ctx.closePath();
    ctx.fillStyle = "#fffdf8";
    ctx.fill();
    ctx.strokeStyle = "#10162b";
    ctx.lineWidth = Math.max(0.9, width * 0.22);
    ctx.stroke();

    const irisX = eyeX + facing * width * 0.14;
    const irisY = eyeY + height * 0.05;
    const irisRadius = height * (fierce ? 0.68 : 0.82);
    ctx.fillStyle = irisColor;
    ellipsePath(ctx, irisX, irisY, irisRadius * 0.72, irisRadius);
    ctx.fill();
    ctx.strokeStyle = colorWithAlpha("#091023", 0.75);
    ctx.lineWidth = Math.max(0.55, width * 0.08);
    ctx.stroke();
    ctx.fillStyle = "#090d1b";
    ellipsePath(ctx, irisX, irisY, irisRadius * 0.33, irisRadius * 0.54);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ellipsePath(
      ctx,
      irisX + facing * irisRadius * 0.24,
      irisY - irisRadius * 0.28,
      Math.max(0.62, irisRadius * 0.18),
      Math.max(0.62, irisRadius * 0.18),
    );
    ctx.fill();
    if (!compact) {
      ctx.fillStyle = colorWithAlpha("#ffffff", 0.78 + identity.irisRing * 0.18);
      ellipsePath(
        ctx,
        irisX - facing * irisRadius * 0.14,
        irisY + irisRadius * 0.34,
        Math.max(0.45, irisRadius * 0.09),
        Math.max(0.45, irisRadius * 0.09),
      );
      ctx.fill();
    }
  }

  function paintAnimeV11Face(ctx, cx, cy, radius, card, art, style, pose, identity, compact) {
    const landmarks = faceLandmarks(art);
    const profile = faceArt7Profile(art);
    const expression = expressionGeometry(pose);
    const fierce = /fury|glare|charge|scarred|raider|arrogant|snarl|unyielding|piercing/.test(pose.expression);
    const facing = art.facing || 1;
    const skin = profile.warm || (art.feminine ? "#efb49a" : "#d99b75");
    const skinLight = portraitSaturationColor(skin, 0.78, 1.16);

    animeV11FacePath(ctx, cx, cy, radius, art, landmarks);
    ctx.fillStyle = skinLight;
    ctx.fill();
    ctx.strokeStyle = "#15192b";
    ctx.lineWidth = Math.max(1.2, radius * (compact ? 0.075 : 0.052));
    ctx.stroke();

    ctx.save();
    animeV11FacePath(ctx, cx, cy, radius, art, landmarks);
    ctx.clip();
    ctx.fillStyle = colorWithAlpha(profile.cool || "#6b6680", 0.22);
    ctx.beginPath();
    ctx.moveTo(cx - facing * radius * 1.06, cy - radius * 0.92);
    ctx.lineTo(cx - facing * radius * 0.06, cy - radius * 0.45);
    ctx.lineTo(cx - facing * radius * 0.18, cy + radius * 0.22);
    ctx.lineTo(cx - facing * radius * 0.74, cy + radius * 0.72);
    ctx.lineTo(cx - facing * radius * 1.08, cy + radius * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,247,225,.28)";
    ctx.beginPath();
    ctx.moveTo(cx + facing * radius * 0.02, cy - radius * 0.78);
    ctx.lineTo(cx + facing * radius * 0.72, cy - radius * 0.52);
    ctx.lineTo(cx + facing * radius * 0.52, cy + radius * 0.06);
    ctx.lineTo(cx + facing * radius * 0.14, cy + radius * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(86,40,55,.18)";
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.62, cy + radius * 0.48);
    ctx.quadraticCurveTo(cx, cy + radius * 0.76, cx + radius * 0.62, cy + radius * 0.48);
    ctx.lineTo(cx + radius * 0.34, cy + radius * 0.88);
    ctx.lineTo(cx - radius * 0.34, cy + radius * 0.88);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const eyeY = cy - radius * (art.feminine ? 0.13 : 0.1);
    const eyeSpacing = radius * (0.25 + profile.eyeSet * 0.12);
    const eyeWidth = radius * (art.feminine ? 0.25 : 0.22) * clamp(profile.eyeWidth, 0.78, 1.2);
    const eyeHeight = radius * (art.feminine ? 0.15 : fierce ? 0.09 : 0.125) * expression.eyeOpen;
    const irisColor = /fire|fury|arrogant|confident/.test(`${art.scene}|${pose.expression}`)
      ? "#e85c52"
      : /river|wave|fleet|white|silver/.test(`${art.scene}|${art.archetype}`)
        ? "#4fc7ec"
        : /jungle|beast|rattan/.test(`${art.scene}|${art.archetype}`)
          ? "#8fd65a"
          : portraitSaturationColor(style.glow, 1.3, 0.9);
    paintAnimeV11Eye(
      ctx,
      cx - facing * eyeSpacing,
      eyeY + radius * landmarks.asymmetry * 0.12,
      eyeWidth * 0.82,
      eyeHeight * 0.85,
      facing,
      irisColor,
      fierce,
      identity,
      compact,
    );
    paintAnimeV11Eye(
      ctx,
      cx + facing * eyeSpacing,
      eyeY - radius * landmarks.asymmetry * 0.1,
      eyeWidth,
      eyeHeight,
      facing,
      irisColor,
      fierce,
      identity,
      compact,
    );

    const browLift = fierce ? radius * 0.1 : radius * 0.035;
    ctx.strokeStyle = "#17162a";
    ctx.lineWidth = Math.max(1, radius * (compact ? 0.09 : 0.065));
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - facing * (eyeSpacing + eyeWidth), eyeY - eyeHeight * 1.55);
    ctx.lineTo(cx - facing * (eyeSpacing - eyeWidth), eyeY - eyeHeight * 1.45 + browLift);
    ctx.moveTo(cx + facing * (eyeSpacing - eyeWidth), eyeY - eyeHeight * 1.45 + browLift);
    ctx.lineTo(cx + facing * (eyeSpacing + eyeWidth), eyeY - eyeHeight * 1.58);
    ctx.stroke();

    ctx.strokeStyle = "rgba(117,58,65,.72)";
    ctx.lineWidth = Math.max(0.7, radius * 0.035);
    ctx.beginPath();
    ctx.moveTo(cx + facing * radius * 0.08, cy - radius * 0.02);
    ctx.quadraticCurveTo(
      cx + facing * radius * 0.18,
      cy + radius * 0.18,
      cx + facing * radius * 0.24,
      cy + radius * 0.36,
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.18, cy + radius * 0.54);
    ctx.quadraticCurveTo(
      cx,
      cy + radius * (0.58 + profile.mouthTilt * 0.12),
      cx + radius * 0.2,
      cy + radius * (0.52 - profile.mouthTilt * 0.12),
    );
    ctx.stroke();

    if (art.eyepatch) {
      const patchX = cx - facing * eyeSpacing;
      ctx.strokeStyle = "#0a0e18";
      ctx.lineWidth = Math.max(1.2, radius * 0.1);
      ctx.beginPath();
      ctx.moveTo(cx - facing * radius * 0.92, cy - radius * 0.42);
      ctx.lineTo(cx + facing * radius * 0.66, cy + radius * 0.08);
      ctx.stroke();
      ctx.fillStyle = "#111522";
      ellipsePath(ctx, patchX, eyeY, eyeWidth * 1.08, eyeHeight * 1.5);
      ctx.fill();
      ctx.strokeStyle = "#54627b";
      ctx.lineWidth = Math.max(0.6, radius * 0.025);
      ctx.stroke();
    }

    if (!compact && profile.scar !== "none" && !art.eyepatch) {
      ctx.strokeStyle = "rgba(154,58,61,.6)";
      ctx.lineWidth = Math.max(0.7, radius * 0.025);
      ctx.beginPath();
      ctx.moveTo(cx + facing * radius * 0.42, cy + radius * 0.02);
      ctx.lineTo(cx + facing * radius * 0.58, cy + radius * 0.34);
      ctx.stroke();
    }
  }

  function paintAnimeV11HairFront(ctx, cx, cy, radius, art, identity) {
    if (/helmet|mask/.test(art.headgear) && !art.feminine) return;
    const hairTone = /white/.test(art.beard) ? "#dce5ed" : "#11172a";
    const highlight = /white/.test(art.beard) ? "#ffffff" : "#34435e";
    ctx.fillStyle = hairTone;
    ctx.strokeStyle = "#090f1f";
    ctx.lineWidth = Math.max(1, radius * 0.065);
    const spikes = 5 + identity.hairVariant;
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.82, cy - radius * 0.45);
    for (let spike = 0; spike <= spikes; spike += 1) {
      const ratio = spike / spikes;
      const px = cx - radius * 0.82 + radius * 1.64 * ratio;
      const length = radius * (0.24 + ((spike + identity.hairVariant) % 3) * 0.12);
      const py = cy - radius * (0.78 - Math.abs(ratio - 0.5) * 0.28);
      ctx.lineTo(px, py);
      ctx.lineTo(
        px + identity.fringeBias * radius * 0.4,
        py + length,
      );
    }
    ctx.lineTo(cx + radius * 0.82, cy - radius * 0.45);
    ctx.quadraticCurveTo(cx, cy - radius * 1.18, cx - radius * 0.82, cy - radius * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = colorWithAlpha(highlight, 0.7);
    ctx.lineWidth = Math.max(0.65, radius * 0.025);
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.5, cy - radius * 0.78);
    ctx.quadraticCurveTo(cx, cy - radius * 1.02, cx + radius * 0.46, cy - radius * 0.72);
    ctx.stroke();
  }

  function paintAnimeV11Beard(ctx, cx, cy, radius, art) {
    if (!art.beard || art.beard === "none") return;
    const white = /white/.test(art.beard);
    const wild = /wild|square|mane/.test(art.beard);
    const long = /long/.test(art.beard);
    const beardColor = white ? "#e7edf1" : "#171927";
    const beardShade = white ? "#9eabb9" : "#343444";
    ctx.fillStyle = beardColor;
    ctx.strokeStyle = "#101522";
    ctx.lineWidth = Math.max(0.9, radius * 0.055);
    if (long || wild) {
      const beardLength = radius * (long ? 1.55 : wild ? 0.95 : 0.62);
      ctx.beginPath();
      ctx.moveTo(cx - radius * 0.54, cy + radius * 0.38);
      ctx.lineTo(cx - radius * 0.42, cy + radius * 0.82);
      ctx.lineTo(cx - radius * 0.18, cy + beardLength * 0.88);
      ctx.lineTo(cx, cy + beardLength);
      ctx.lineTo(cx + radius * 0.2, cy + beardLength * 0.84);
      ctx.lineTo(cx + radius * 0.46, cy + radius * 0.76);
      ctx.lineTo(cx + radius * 0.54, cy + radius * 0.38);
      ctx.quadraticCurveTo(cx, cy + radius * 0.62, cx - radius * 0.54, cy + radius * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = beardShade;
      ctx.lineWidth = Math.max(0.6, radius * 0.026);
      for (const ratio of [-0.45, -0.16, 0.18, 0.46]) {
        ctx.beginPath();
        ctx.moveTo(cx + ratio * radius, cy + radius * 0.58);
        ctx.lineTo(cx + ratio * radius * 0.58, cy + beardLength * (0.82 + Math.abs(ratio) * 0.16));
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = beardColor;
      ctx.lineWidth = Math.max(1.1, radius * 0.11);
      ctx.beginPath();
      ctx.moveTo(cx - radius * 0.32, cy + radius * 0.45);
      ctx.quadraticCurveTo(cx, cy + radius * 0.66, cx + radius * 0.32, cy + radius * 0.45);
      ctx.stroke();
      if (/goatee/.test(art.beard)) {
        ctx.beginPath();
        ctx.moveTo(cx, cy + radius * 0.55);
        ctx.lineTo(cx, cy + radius * 1.12);
        ctx.stroke();
      }
    }
  }

  function paintAnimeV11Headgear(ctx, cx, cy, radius, art, style, pose, compact) {
    const gear = String(art.headgear || "");
    const outline = "#10162a";
    const metal = portraitSaturationColor(style.secondary, 1.05, 1.02);
    ctx.save();
    ctx.strokeStyle = outline;
    ctx.lineWidth = Math.max(1.1, radius * 0.07);
    ctx.lineJoin = "round";

    if (/mask/.test(gear)) {
      ctx.fillStyle = "#ddd3ae";
      ctx.beginPath();
      ctx.moveTo(cx - radius * 0.72, cy - radius * 0.68);
      ctx.lineTo(cx, cy - radius * 1.02);
      ctx.lineTo(cx + radius * 0.72, cy - radius * 0.68);
      ctx.lineTo(cx + radius * 0.58, cy + radius * 0.2);
      ctx.lineTo(cx, cy + radius * 0.46);
      ctx.lineTo(cx - radius * 0.58, cy + radius * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#1b2030";
      ellipsePath(ctx, cx - radius * 0.28, cy - radius * 0.12, radius * 0.15, radius * 0.1);
      ctx.fill();
      ellipsePath(ctx, cx + radius * 0.28, cy - radius * 0.12, radius * 0.15, radius * 0.1);
      ctx.fill();
    } else if (/helmet|helm/.test(gear)) {
      const helmet = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy);
      helmet.addColorStop(0, "#eef4f3");
      helmet.addColorStop(0.38, metal);
      helmet.addColorStop(1, portraitShiftColor(style.primary, -0.24));
      ctx.fillStyle = helmet;
      ctx.beginPath();
      ctx.arc(cx, cy - radius * 0.28, radius * 0.82, Math.PI, TAU);
      ctx.lineTo(cx + radius * 0.78, cy - radius * 0.12);
      ctx.lineTo(cx - radius * 0.78, cy - radius * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = pose.accent;
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius * 1.58);
      ctx.quadraticCurveTo(cx + radius * 0.34, cy - radius * 1.12, cx + radius * 0.12, cy - radius * 0.72);
      ctx.lineTo(cx - radius * 0.12, cy - radius * 0.72);
      ctx.quadraticCurveTo(cx - radius * 0.28, cy - radius * 1.18, cx, cy - radius * 1.58);
      ctx.fill();
      ctx.stroke();
      if (/horn|tiger|lion/.test(gear)) {
        ctx.fillStyle = "#f3d18b";
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx + side * radius * 0.52, cy - radius * 0.72);
          ctx.quadraticCurveTo(
            cx + side * radius * 1.08,
            cy - radius * 1.18,
            cx + side * radius * 0.78,
            cy - radius * 0.36,
          );
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    } else if (/crown/.test(gear)) {
      ctx.fillStyle = metal;
      ctx.beginPath();
      ctx.moveTo(cx - radius * 0.68, cy - radius * 0.72);
      ctx.lineTo(cx - radius * 0.48, cy - radius * 1.22);
      ctx.lineTo(cx - radius * 0.18, cy - radius * 0.84);
      ctx.lineTo(cx, cy - radius * 1.48);
      ctx.lineTo(cx + radius * 0.18, cy - radius * 0.84);
      ctx.lineTo(cx + radius * 0.48, cy - radius * 1.22);
      ctx.lineTo(cx + radius * 0.68, cy - radius * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = pose.accent;
      ctx.beginPath();
      ctx.arc(cx, cy - radius * 0.92, radius * 0.13, 0, TAU);
      ctx.fill();
    } else if (/cap/.test(gear)) {
      ctx.fillStyle = /black/.test(gear) ? "#111424" : portraitShiftColor(style.primary, -0.16);
      ctx.beginPath();
      ctx.arc(cx, cy - radius * 0.28, radius * 0.72, Math.PI, TAU);
      ctx.lineTo(cx + radius * 0.64, cy - radius * 0.1);
      ctx.lineTo(cx - radius * 0.64, cy - radius * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (/scholar|soft/.test(gear)) {
        ctx.beginPath();
        ctx.moveTo(cx - radius * 0.54, cy - radius * 0.18);
        ctx.lineTo(cx - radius * 1.18, cy - radius * 0.36);
        ctx.lineTo(cx - radius * 0.72, cy - radius * 0.02);
        ctx.moveTo(cx + radius * 0.54, cy - radius * 0.18);
        ctx.lineTo(cx + radius * 1.18, cy - radius * 0.36);
        ctx.lineTo(cx + radius * 0.72, cy - radius * 0.02);
        ctx.stroke();
      }
    } else if (/scarf|band/.test(gear)) {
      ctx.fillStyle = pose.accent;
      ctx.fillRect(cx - radius * 0.86, cy - radius * 0.72, radius * 1.72, radius * 0.24);
      ctx.strokeRect(cx - radius * 0.86, cy - radius * 0.72, radius * 1.72, radius * 0.24);
      if (!compact) {
        ctx.beginPath();
        ctx.moveTo(cx + radius * 0.66, cy - radius * 0.56);
        ctx.quadraticCurveTo(cx + radius * 1.28, cy - radius * 0.2, cx + radius * 1.08, cy + radius * 0.52);
        ctx.strokeStyle = pose.accent;
        ctx.lineWidth = Math.max(2, radius * 0.18);
        ctx.stroke();
      }
    } else if (/feather|hairpin/.test(gear)) {
      ctx.strokeStyle = metal;
      ctx.lineWidth = Math.max(1.3, radius * 0.08);
      ctx.beginPath();
      ctx.moveTo(cx - radius * 0.64, cy - radius * 0.68);
      ctx.lineTo(cx + radius * 0.7, cy - radius * 0.98);
      ctx.stroke();
      ctx.fillStyle = pose.accent;
      ctx.beginPath();
      ctx.moveTo(cx + radius * 0.34, cy - radius * 0.9);
      ctx.quadraticCurveTo(cx + radius * 0.92, cy - radius * 1.48, cx + radius * 0.72, cy - radius * 0.66);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = metal;
      ctx.beginPath();
      ctx.arc(cx, cy - radius * 0.84, radius * 0.18, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintAnimeV11Weapon(ctx, x, y, width, height, art, style, pose, action, compact) {
    const weapon = String(art.weapon || "spear");
    const facing = art.facing || 1;
    const side = facing > 0 ? 1 : -1;
    const wx = x + width * (side > 0 ? 0.82 : 0.18);
    const wy = y + height * 0.6;
    const unit = width * (compact ? 0.015 : 0.012);
    const blade = "#f6fbff";
    const metal = portraitSaturationColor(style.secondary, 0.72, 1.16);
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(side * (0.12 + action.weaponAngle * 0.72));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = colorWithAlpha(pose.accent, 0.8);
    ctx.shadowBlur = width * (compact ? 0.08 : 0.06);

    if (/fan/.test(weapon)) {
      ctx.fillStyle = /dark/.test(weapon) ? "#24263c" : "#f5eee1";
      ctx.strokeStyle = pose.accent;
      ctx.lineWidth = Math.max(1, unit * 0.8);
      ctx.beginPath();
      ctx.moveTo(0, height * 0.22);
      ctx.arc(0, height * 0.22, width * 0.28, Math.PI * 1.12, Math.PI * 1.88);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      for (let rib = -2; rib <= 2; rib += 1) {
        const angle = -Math.PI / 2 + rib * 0.19;
        ctx.beginPath();
        ctx.moveTo(0, height * 0.22);
        ctx.lineTo(Math.cos(angle) * width * 0.25, height * 0.22 + Math.sin(angle) * width * 0.25);
        ctx.stroke();
      }
    } else if (/bow/.test(weapon)) {
      ctx.strokeStyle = "#f1c56d";
      ctx.lineWidth = Math.max(1.4, unit * 1.5);
      ctx.beginPath();
      ctx.arc(0, 0, width * 0.27, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.strokeStyle = "#f7f3dd";
      ctx.lineWidth = Math.max(0.7, unit * 0.55);
      ctx.beginPath();
      ctx.moveTo(0, -width * 0.27);
      ctx.lineTo(0, width * 0.27);
      ctx.stroke();
      ctx.strokeStyle = pose.accent;
      ctx.beginPath();
      ctx.moveTo(-width * 0.34, 0);
      ctx.lineTo(width * 0.22, 0);
      ctx.stroke();
    } else if (/shield/.test(weapon)) {
      ctx.fillStyle = portraitShiftColor(style.primary, -0.16);
      ctx.strokeStyle = metal;
      ctx.lineWidth = Math.max(1.6, unit * 1.7);
      ctx.beginPath();
      ctx.arc(0, 0, width * 0.24, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = pose.accent;
      ctx.beginPath();
      ctx.arc(0, 0, width * 0.075, 0, TAU);
      ctx.fill();
      ctx.stroke();
    } else if (/scroll|book|flute/.test(weapon)) {
      ctx.strokeStyle = /flute/.test(weapon) ? "#9be78a" : "#f5dfa4";
      ctx.lineWidth = Math.max(3, unit * 3.4);
      ctx.beginPath();
      ctx.moveTo(-width * 0.22, 0);
      ctx.lineTo(width * 0.2, 0);
      ctx.stroke();
      ctx.fillStyle = pose.accent;
      for (let notch = -2; notch <= 2; notch += 1) {
        ctx.beginPath();
        ctx.arc(notch * width * 0.065, 0, Math.max(0.8, unit * 0.7), 0, TAU);
        ctx.fill();
      }
    } else if (/maul|club/.test(weapon)) {
      ctx.strokeStyle = "#4a342c";
      ctx.lineWidth = Math.max(2.3, unit * 2.4);
      ctx.beginPath();
      ctx.moveTo(0, height * 0.42);
      ctx.lineTo(0, -height * 0.28);
      ctx.stroke();
      ctx.fillStyle = "#59606d";
      ctx.strokeStyle = metal;
      ctx.lineWidth = Math.max(1.1, unit);
      roundedRect(ctx, -width * 0.105, -height * 0.4, width * 0.21, height * 0.19, width * 0.025);
      ctx.fill();
      ctx.stroke();
    } else {
      const spear = /spear|lance|halberd/.test(weapon);
      const twin = /twin/.test(weapon);
      const drawBlade = (offset, mirror) => {
        ctx.save();
        ctx.translate(offset, 0);
        ctx.scale(mirror, 1);
        ctx.strokeStyle = "#49372f";
        ctx.lineWidth = Math.max(1.6, unit * 1.65);
        ctx.beginPath();
        ctx.moveTo(0, height * 0.5);
        ctx.lineTo(0, spear ? -height * 0.5 : -height * 0.34);
        ctx.stroke();
        ctx.fillStyle = blade;
        ctx.strokeStyle = pose.accent;
        ctx.lineWidth = Math.max(0.9, unit * 0.8);
        ctx.beginPath();
        ctx.moveTo(0, spear ? -height * 0.66 : -height * 0.48);
        ctx.lineTo(width * (spear ? 0.07 : 0.11), -height * 0.43);
        ctx.lineTo(0, -height * 0.36);
        ctx.lineTo(-width * (spear ? 0.045 : 0.08), -height * 0.43);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (/crescent|halberd|fangtian/.test(weapon)) {
          ctx.beginPath();
          ctx.moveTo(0, -height * 0.48);
          ctx.quadraticCurveTo(width * 0.22, -height * 0.43, width * 0.16, -height * 0.25);
          ctx.quadraticCurveTo(width * 0.02, -height * 0.3, 0, -height * 0.38);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      };
      drawBlade(twin ? -width * 0.13 : 0, 1);
      if (twin) drawBlade(width * 0.13, -1);
    }
    ctx.restore();
  }

  function paintAnimePortraitV11(ctx, x, y, width, height, card, compact) {
    const art = portraitArchetype(card);
    const style = getFactionStyle(card);
    const pose = portraitPaintProfile(art);
    const action = portraitActionProfile(art);
    const identity = animeV11IdentityProfile(card, art);
    const seed = hashString(
      `${getCardValue(card, "id", "")}|${art.archetype}|${ANIME_CEL_STYLE_VERSION}`,
    );
    const facing = art.facing || 1;
    const cx = x + width * clamp(pose.headX + action.headDX, 0.34, 0.58);
    const cy = y + height * clamp(pose.headY + action.headDY, 0.28, 0.42);
    const radius = width
      * (compact ? 0.205 : 0.185)
      * clamp(pose.scale * action.camera, 0.94, 1.2);

    ctx.save();
    roundedRect(ctx, x, y, width, height, Math.max(4, width * 0.05));
    ctx.clip();
    paintAnimeV11Backdrop(ctx, x, y, width, height, card, art, style, pose, seed, compact);

    const aura = ctx.createRadialGradient(
      cx + facing * radius * 0.2,
      cy - radius * 0.16,
      radius * 0.08,
      cx,
      cy,
      radius * 2.5,
    );
    aura.addColorStop(0, colorWithAlpha("#ffffff", compact ? 0.26 : 0.32));
    aura.addColorStop(0.3, colorWithAlpha(pose.accent, compact ? 0.42 : 0.36));
    aura.addColorStop(1, colorWithAlpha(pose.accent, 0));
    ctx.fillStyle = aura;
    ctx.fillRect(x, y, width, height);

    paintAnimeV11Body(ctx, x, y, width, height, art, style, pose, action, cx, compact);
    paintAnimeV11HairBack(ctx, cx, cy, radius, art, identity);
    paintAnimeV11Face(ctx, cx, cy, radius, card, art, style, pose, identity, compact);
    paintAnimeV11HairFront(ctx, cx, cy, radius, art, identity);
    paintAnimeV11Beard(ctx, cx, cy, radius, art);
    paintAnimeV11Headgear(ctx, cx, cy, radius, art, style, pose, compact);
    paintAnimeV11Weapon(ctx, x, y, width, height, art, style, pose, action, compact);

    // Foreground colour slash makes each portrait read like a captured action
    // frame rather than a static historical bust.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = colorWithAlpha(pose.accent, compact ? 0.72 : 0.62);
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(1.2, width * 0.018);
    ctx.beginPath();
    if (facing > 0) {
      ctx.moveTo(x - width * 0.04, y + height * 0.92);
      ctx.lineTo(x + width * 0.42, y + height * 0.72);
    } else {
      ctx.moveTo(x + width * 1.04, y + height * 0.92);
      ctx.lineTo(x + width * 0.58, y + height * 0.72);
    }
    ctx.stroke();
    ctx.restore();

    const vignette = ctx.createLinearGradient(x, y, x, y + height);
    vignette.addColorStop(0, "rgba(5,9,20,0)");
    vignette.addColorStop(0.72, "rgba(5,9,20,.05)");
    vignette.addColorStop(1, "rgba(5,9,20,.46)");
    ctx.fillStyle = vignette;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }

  function paintPortraitUncached(ctx, x, y, width, height, card, compact) {
    const style = getFactionStyle(card);
    const art = portraitArchetype(card);
    if (art.archetype === "wandering-general") {
      if (compact) drawPortraitLegacy(ctx, x, y, width, height, card, true);
      else drawPortraitLegacyLayered(ctx, x, y, width, height, card, false);
      return;
    }
    const animeV11Enabled = ANIME_CEL_STYLE_VERSION === "anime-cel-v11";
    if (animeV11Enabled) {
      paintAnimePortraitV11(ctx, x, y, width, height, card, compact);
      return;
    }
    const pose = portraitPaintProfile(art);
    const action = portraitActionProfile(art);
    const weiFocalSeparation = WEI_PORTRAIT_ARCHETYPES.has(art.archetype);
    const backgroundStyle = weiFocalSeparation
      ? {
        ...style,
        primary: portraitSaturationColor(style.primary, 0.34, 0.66),
        secondary: portraitSaturationColor(style.secondary, 0.26, 0.72),
        glow: portraitSaturationColor(style.glow, 0.32, 0.7),
      }
      : style;
    const focalPose = weiFocalSeparation
      ? {
        ...pose,
        accent: portraitSaturationColor(pose.accent, 1.46, 1.08),
        keyTemp: portraitSaturationColor(pose.keyTemp, 1.18, 1.08),
        rimColor: portraitSaturationColor(pose.rimColor, 1.42, 1.06),
        bounceColor: portraitSaturationColor(pose.bounceColor, 0.8, 0.72),
      }
      : pose;
    const weaponStyle = weiFocalSeparation
      ? {
        ...style,
        secondary: portraitSaturationColor(style.secondary, 1.32, 1.06),
        glow: portraitSaturationColor(style.glow, 1.42, 1.04),
      }
      : style;
    const seed = hashString(`${getCardValue(card, "id", "")}|${getCardValue(card, "name", "")}|${ANIME_CEL_STYLE_VERSION}`);
    const facing = art.facing || 1;
    const cx = x + width * (pose.headX + action.headDX);
    const headY = y + height * (pose.headY + action.headDY);
    const radius = width * (compact ? 0.16 : 0.155) * pose.scale * action.camera;
    const fiery = ["red-cliffs", "fire-attack", "hulao-gate", "guandu-command"].includes(art.scene);
    ctx.save();
    roundedRect(ctx, x, y, width, height, Math.max(4, width * 0.05));
    ctx.clip();

    const sky = ctx.createLinearGradient(x, y, x + width * 0.42, y + height);
    sky.addColorStop(0, portraitShiftColor(backgroundStyle.primary, -0.34));
    sky.addColorStop(0.34, fiery ? "#67332a" : portraitShiftColor(backgroundStyle.primary, -0.56));
    sky.addColorStop(0.68, fiery ? "#27191a" : "#172325");
    sky.addColorStop(1, "#070b0c");
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, width, height);

    ctx.save();
    ctx.globalAlpha = compact ? 0.56 : 0.84;
    drawHistoricalScene(ctx, x, y, width, height, art, backgroundStyle, compact);
    ctx.restore();
    if (compact) paintCompactFactionGrammar(ctx, x, y, width, height, card, backgroundStyle);
    paintAtmosphericDepth(ctx, x, y, width, height, art, backgroundStyle, seed, compact);
    paintBackgroundDepthOfFieldV7(ctx, x, y, width, height, art, backgroundStyle, seed, compact);
    paintNarrativeDepthV8(ctx, x, y, width, height, art, backgroundStyle, action, seed, compact);
    if (weiFocalSeparation) {
      const rainValueWash = ctx.createLinearGradient(x, y, x + width, y + height);
      rainValueWash.addColorStop(0, "rgba(5,10,16,.08)");
      rainValueWash.addColorStop(0.58, "rgba(7,13,20,.28)");
      rainValueWash.addColorStop(1, "rgba(2,6,10,.44)");
      ctx.fillStyle = rainValueWash;
      ctx.fillRect(x, y, width, height);
    }
    if (!compact) {
      ctx.save();
      ctx.globalAlpha = 0.19;
      drawPortraitPattern(ctx, x, y, width, height, art, backgroundStyle);
      ctx.restore();
    }

    const haloX = cx + facing * width * 0.08;
    const halo = ctx.createRadialGradient(haloX, headY - radius * 0.2, radius * 0.05, haloX, headY, width * 0.46);
    const compactContrastBoost = compact && ["twin-halberds-giant", "phoenix-crown-halberd"].includes(art.archetype);
    halo.addColorStop(0, colorWithAlpha(focalPose.accent, compactContrastBoost ? 0.68 : compact ? 0.47 : 0.42));
    halo.addColorStop(0.4, colorWithAlpha(weaponStyle.glow, compact ? 0.2 : 0.13));
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(x, y, width, height);
    paintSubjectDepthBacklight(
      ctx,
      x,
      y,
      width,
      height,
      art,
      focalPose,
      cx,
      headY,
      radius,
      compact,
    );

    ctx.save();
    const pivotY = y + height * 0.58;
    ctx.translate(cx, pivotY);
    ctx.rotate(pose.lean + action.torsoAngle);
    ctx.translate(-cx, -pivotY);
    paintHeroicBackSilhouette(ctx, x, y, width, height, art, style, pose, action, cx, compact);
    paintRobeAndArmor(ctx, x, y, width, height, art, style, pose, action, cx, compact, seed);
    paintThoracicStructureV8(ctx, x, y, width, height, art, pose, action, cx, compact);
    paintPortraitArms(ctx, x, y, width, height, art, style, pose, action, cx, compact);

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.62)";
    ctx.shadowBlur = radius * 0.24;
    const hair = ctx.createLinearGradient(cx - radius, headY - radius, cx + radius, headY + radius);
    hair.addColorStop(0, "#07090a");
    hair.addColorStop(0.62, "#202326");
    hair.addColorStop(1, "#090b0c");
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(cx, headY - radius * 0.06, radius * 1.04, Math.PI, TAU);
    ctx.lineTo(cx + radius * 0.86, headY + radius * 0.35);
    ctx.quadraticCurveTo(cx, headY - radius * 0.12, cx - radius * 0.86, headY + radius * 0.35);
    ctx.closePath();
    ctx.fill();
    if (art.feminine) {
      ctx.strokeStyle = "#111317";
      ctx.lineWidth = radius * 0.42;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - facing * radius * 0.64, headY - radius * 0.35);
      ctx.bezierCurveTo(
        cx - facing * radius * 0.98,
        headY + radius * 0.35,
        cx - facing * radius * 0.62,
        headY + radius * 1.2,
        cx - facing * radius * 0.82,
        headY + radius * 1.78,
      );
      ctx.stroke();
    }
    ctx.restore();

    paintFaceValues(ctx, cx, headY, radius, art, focalPose, compact);
    paintFacePlanes(ctx, cx, headY, radius, art, focalPose, compact);
    paintFacialFeatures(ctx, cx, headY, radius, art, focalPose, compact);
    paintIndividualFaceMarksV7(ctx, cx, headY, radius, art, focalPose, compact);
    paintHairEdgeResponseV7(ctx, cx, headY, radius, art, focalPose, compact);
    paintAnimeCelFaceFinish(ctx, cx, headY, radius, art, focalPose, compact);
    if (art.eyepatch) {
      ctx.save();
      ctx.strokeStyle = "#0c1012";
      ctx.lineWidth = Math.max(1.4, radius * 0.15);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - facing * radius * 0.92, headY - radius * 0.42);
      ctx.lineTo(cx + facing * radius * 0.63, headY + radius * 0.13);
      ctx.stroke();
      ellipsePath(ctx, cx - facing * radius * 0.26, headY - radius * 0.04, radius * 0.33, radius * 0.24);
      const patch = ctx.createRadialGradient(
        cx - facing * radius * 0.34,
        headY - radius * 0.12,
        0,
        cx - facing * radius * 0.26,
        headY - radius * 0.04,
        radius * 0.35,
      );
      patch.addColorStop(0, "#343a3c");
      patch.addColorStop(1, "#080a0b");
      ctx.fillStyle = patch;
      ctx.fill();
      if (!compact) {
        ctx.strokeStyle = "rgba(115,38,30,.72)";
        ctx.lineWidth = Math.max(0.7, radius * 0.045);
        ctx.beginPath();
        ctx.moveTo(cx - facing * radius * 0.51, headY - radius * 0.33);
        ctx.lineTo(cx + facing * radius * 0.2, headY + radius * 0.37);
        ctx.stroke();
      }
      ctx.restore();
    }
    paintBeard(ctx, cx, headY, radius, art, focalPose, compact);
    paintBeardEdgeResponseV7(ctx, cx, headY, radius, art, focalPose, compact);
    paintHeadgearLandmark(ctx, cx, headY, radius, width, art, focalPose, compact);
    ctx.restore();

    paintWeaponLandmark(ctx, x, y, width, height, art, weaponStyle, focalPose, action, compact);
    paintWeaponGripOverlay(ctx, x, y, width, height, art, focalPose, action, compact);
    drawPortraitForeground(ctx, x, y, width, height, seed, art, backgroundStyle);
    paintNearDepthOfFieldV7(ctx, x, y, width, height, seed, art, focalPose, compact);
    paintForegroundAtmosphericBrush(ctx, x, y, width, height, seed, art, backgroundStyle, pose, compact);
    if (compact) {
      const portraitRotation = pose.lean + action.torsoAngle;
      const headDistanceFromPivot = headY - pivotY;
      paintCompactSignatureSilhouette(ctx, x, y, width, height, art, weaponStyle, action, {
        cx: cx - Math.sin(portraitRotation) * headDistanceFromPivot,
        cy: pivotY + Math.cos(portraitRotation) * headDistanceFromPivot,
        radius,
        rotation: portraitRotation,
      });
    }
    paintSurfaceGlaze(ctx, x, y, width, height, seed, art, backgroundStyle, compact);
    paintAnimeActionPanelFinish(
      ctx,
      x,
      y,
      width,
      height,
      seed,
      art,
      backgroundStyle,
      compact,
    );
    ctx.restore();
  }

  function heroShieldPath(ctx, cx, cy, width, height) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - height * 0.5);
    ctx.bezierCurveTo(
      cx + width * 0.42,
      cy - height * 0.49,
      cx + width * 0.48,
      cy - height * 0.2,
      cx + width * 0.39,
      cy + height * 0.14,
    );
    ctx.bezierCurveTo(
      cx + width * 0.31,
      cy + height * 0.39,
      cx + width * 0.12,
      cy + height * 0.48,
      cx,
      cy + height * 0.54,
    );
    ctx.bezierCurveTo(
      cx - width * 0.12,
      cy + height * 0.48,
      cx - width * 0.31,
      cy + height * 0.39,
      cx - width * 0.39,
      cy + height * 0.14,
    );
    ctx.bezierCurveTo(
      cx - width * 0.48,
      cy - height * 0.2,
      cx - width * 0.42,
      cy - height * 0.49,
      cx,
      cy - height * 0.5,
    );
    ctx.closePath();
  }

  /*
   * Each commander portrait is rasterized once at initialization. The same
   * code-native carving language is shared, while faction silk, face opening,
   * banner and command seal preserve four immediately readable silhouettes.
   */
  function createHeroMedallionSurface(documentRef, commanderId) {
    const surface = documentRef.createElement("canvas");
    surface.width = 180;
    surface.height = 196;
    const heroCtx = surface.getContext("2d");
    const profile = COMMANDER_PRESENTATION[commanderId]
      || COMMANDER_PRESENTATION.liubei;
    const isPlayer = profile.openFace;
    const cx = 90;
    const cy = 92;
    const palette = profile.palette;

    heroCtx.save();
    heroCtx.translate(cx, cy);

    // Crossed command standards establish the faction before the face is read.
    heroCtx.lineCap = "round";
    heroCtx.strokeStyle = palette.metal;
    heroCtx.lineWidth = 5;
    heroCtx.beginPath();
    heroCtx.moveTo(-50, 62);
    heroCtx.lineTo(42, -69);
    heroCtx.moveTo(50, 62);
    heroCtx.lineTo(-42, -69);
    heroCtx.stroke();
    heroCtx.fillStyle = profile.banner;
    heroCtx.strokeStyle = palette.gleam;
    heroCtx.lineWidth = 1.5;
    heroCtx.beginPath();
    if (isPlayer) {
      heroCtx.moveTo(-45, -68);
      heroCtx.quadraticCurveTo(-68, -56, -73, -28);
      heroCtx.lineTo(-49, -38);
      heroCtx.lineTo(-28, -23);
      heroCtx.closePath();
    } else {
      heroCtx.moveTo(42, -69);
      heroCtx.lineTo(73, -58);
      heroCtx.lineTo(67, -25);
      heroCtx.lineTo(44, -38);
      heroCtx.closePath();
    }
    heroCtx.fill();
    heroCtx.stroke();

    // Four material values: carved dark, low, mid, and specular metal.
    heroShieldPath(heroCtx, 0, 0, 113, 142);
    const ground = heroCtx.createLinearGradient(-45, -64, 48, 66);
    ground.addColorStop(0, palette.high);
    ground.addColorStop(0.24, palette.mid);
    ground.addColorStop(0.66, palette.low);
    ground.addColorStop(1, palette.dark);
    heroCtx.fillStyle = ground;
    heroCtx.fill();
    heroCtx.strokeStyle = palette.dark;
    heroCtx.lineWidth = 9;
    heroCtx.stroke();
    heroCtx.clip();

    // Woven silk / hammered steel field.
    heroCtx.globalAlpha = isPlayer ? 0.16 : 0.2;
    heroCtx.strokeStyle = isPlayer ? "#e8db9a" : "#dce6e7";
    heroCtx.lineWidth = 1;
    for (let stripe = -84; stripe <= 84; stripe += 9) {
      heroCtx.beginPath();
      if (isPlayer) {
        heroCtx.moveTo(-68, stripe);
        heroCtx.quadraticCurveTo(0, stripe + 7, 68, stripe - 2);
      } else {
        heroCtx.moveTo(stripe, -75);
        heroCtx.lineTo(stripe + 22, 78);
      }
      heroCtx.stroke();
    }
    heroCtx.globalAlpha = 1;

    // Lamellar shoulders make the portrait read at small scale.
    heroCtx.fillStyle = palette.dark;
    heroCtx.beginPath();
    heroCtx.moveTo(-55, 67);
    heroCtx.quadraticCurveTo(-43, 24, -19, 18);
    heroCtx.lineTo(19, 18);
    heroCtx.quadraticCurveTo(43, 24, 55, 67);
    heroCtx.closePath();
    heroCtx.fill();
    heroCtx.fillStyle = isPlayer ? palette.mid : palette.lacquer;
    for (let row = 0; row < 3; row += 1) {
      for (let column = -3; column <= 3; column += 1) {
        const plateX = column * 13 + (row % 2 ? 6 : 0);
        const plateY = 32 + row * 14 + Math.abs(column) * 1.5;
        heroCtx.beginPath();
        heroCtx.moveTo(plateX - 7, plateY - 6);
        heroCtx.lineTo(plateX + 7, plateY - 6);
        heroCtx.lineTo(plateX + 5, plateY + 7);
        heroCtx.lineTo(plateX, plateY + 10);
        heroCtx.lineTo(plateX - 5, plateY + 7);
        heroCtx.closePath();
        heroCtx.fill();
        heroCtx.strokeStyle = palette.metal;
        heroCtx.lineWidth = 1;
        heroCtx.stroke();
      }
    }

    // Neck and anonymous commander's face.
    heroCtx.fillStyle = palette.skin;
    heroCtx.fillRect(-10, 5, 20, 25);
    heroCtx.beginPath();
    heroCtx.moveTo(-23, -25);
    heroCtx.quadraticCurveTo(-24, 7, 0, 18);
    heroCtx.quadraticCurveTo(24, 7, 23, -25);
    heroCtx.quadraticCurveTo(0, -42, -23, -25);
    heroCtx.fill();
    heroCtx.fillStyle = palette.skinLight;
    heroCtx.globalAlpha = 0.72;
    heroCtx.beginPath();
    heroCtx.moveTo(-16, -22);
    heroCtx.quadraticCurveTo(-13, 4, -1, 11);
    heroCtx.lineTo(-4, -29);
    heroCtx.closePath();
    heroCtx.fill();
    heroCtx.globalAlpha = 1;

    if (isPlayer) {
      // Open-faced benevolent/river crowns distinguish Liu Bei and Sun Quan.
      heroCtx.fillStyle = palette.low;
      heroCtx.beginPath();
      heroCtx.moveTo(-31, -24);
      heroCtx.quadraticCurveTo(-26, -51, 0, -57);
      heroCtx.quadraticCurveTo(27, -51, 31, -24);
      heroCtx.lineTo(20, -13);
      heroCtx.quadraticCurveTo(0, -26, -20, -13);
      heroCtx.closePath();
      heroCtx.fill();
      heroCtx.strokeStyle = palette.gleam;
      heroCtx.lineWidth = 3;
      heroCtx.stroke();
      heroCtx.fillStyle = palette.gleam;
      ellipsePath(heroCtx, 0, -37, 8, 5);
      heroCtx.fill();
      heroCtx.strokeStyle = palette.lacquer;
      heroCtx.lineWidth = 5;
      heroCtx.beginPath();
      heroCtx.moveTo(0, -55);
      heroCtx.bezierCurveTo(-8, -74, -22, -76, -17, -92);
      heroCtx.moveTo(0, -55);
      heroCtx.bezierCurveTo(9, -73, 24, -72, 23, -88);
      heroCtx.stroke();
      heroCtx.strokeStyle = "#241812";
      heroCtx.lineWidth = 3;
      heroCtx.beginPath();
      heroCtx.moveTo(-15, -8);
      heroCtx.lineTo(-4, -6);
      heroCtx.moveTo(5, -6);
      heroCtx.lineTo(16, -8);
      heroCtx.stroke();
    } else {
      // Cao Cao and Meng Huo use closed command masks with different materials.
      heroCtx.fillStyle = palette.low;
      heroCtx.beginPath();
      heroCtx.moveTo(-34, -22);
      heroCtx.lineTo(-24, -52);
      heroCtx.lineTo(0, -62);
      heroCtx.lineTo(24, -52);
      heroCtx.lineTo(34, -22);
      heroCtx.lineTo(24, 4);
      heroCtx.lineTo(13, -10);
      heroCtx.lineTo(0, -3);
      heroCtx.lineTo(-13, -10);
      heroCtx.lineTo(-24, 4);
      heroCtx.closePath();
      heroCtx.fill();
      heroCtx.strokeStyle = palette.gleam;
      heroCtx.lineWidth = 3;
      heroCtx.stroke();
      heroCtx.fillStyle = palette.lacquer;
      heroCtx.fillRect(-5, -61, 10, 42);
      heroCtx.fillStyle = palette.dark;
      heroCtx.beginPath();
      heroCtx.moveTo(-22, -8);
      heroCtx.lineTo(-5, -5);
      heroCtx.lineTo(-12, 8);
      heroCtx.lineTo(-24, 3);
      heroCtx.closePath();
      heroCtx.moveTo(22, -8);
      heroCtx.lineTo(5, -5);
      heroCtx.lineTo(12, 8);
      heroCtx.lineTo(24, 3);
      heroCtx.closePath();
      heroCtx.fill();
      heroCtx.strokeStyle = "#171516";
      heroCtx.lineWidth = 7;
      heroCtx.beginPath();
      heroCtx.moveTo(0, -60);
      heroCtx.bezierCurveTo(18, -78, 29, -77, 38, -91);
      heroCtx.stroke();
      heroCtx.strokeStyle = "#978a76";
      heroCtx.lineWidth = 3;
      heroCtx.stroke();
    }

    heroCtx.strokeStyle = palette.gleam;
    heroCtx.fillStyle = palette.metal;
    heroCtx.lineWidth = 4;
    if (profile.id === "caocao") {
      heroCtx.fillRect(-28, -55, 56, 7);
      heroCtx.fillRect(-18, -66, 8, 15);
      heroCtx.fillRect(10, -66, 8, 15);
    } else if (profile.id === "sunquan") {
      heroCtx.beginPath();
      heroCtx.moveTo(-31, -48);
      heroCtx.quadraticCurveTo(-44, -60, -48, -39);
      heroCtx.moveTo(31, -48);
      heroCtx.quadraticCurveTo(44, -60, 48, -39);
      heroCtx.stroke();
    } else if (profile.id === "nomad") {
      heroCtx.beginPath();
      heroCtx.moveTo(-23, -49);
      heroCtx.quadraticCurveTo(-48, -75, -55, -47);
      heroCtx.moveTo(23, -49);
      heroCtx.quadraticCurveTo(48, -75, 55, -47);
      heroCtx.stroke();
    } else {
      ellipsePath(heroCtx, -24, -45, 4, 10);
      heroCtx.fill();
      ellipsePath(heroCtx, 24, -45, 4, 10);
      heroCtx.fill();
    }

    // Nose and mouth are subdued so this remains a commander symbol.
    heroCtx.strokeStyle = "#57382b";
    heroCtx.lineWidth = 1.6;
    heroCtx.beginPath();
    heroCtx.moveTo(1, -4);
    heroCtx.lineTo(-2, 5);
    heroCtx.lineTo(3, 6);
    heroCtx.moveTo(-8, 12);
    heroCtx.quadraticCurveTo(0, 15, 8, 12);
    heroCtx.stroke();
    heroCtx.restore();

    heroCtx.save();
    heroShieldPath(heroCtx, cx, cy, 113, 142);
    heroCtx.strokeStyle = palette.metal;
    heroCtx.lineWidth = 6;
    heroCtx.stroke();
    heroCtx.strokeStyle = palette.gleam;
    heroCtx.globalAlpha = 0.8;
    heroCtx.lineWidth = 1.5;
    heroCtx.stroke();
    heroCtx.restore();

    heroCtx.save();
    ellipsePath(heroCtx, cx, cy + 53, 16, 16);
    heroCtx.fillStyle = palette.dark;
    heroCtx.fill();
    heroCtx.strokeStyle = palette.gleam;
    heroCtx.lineWidth = 2;
    heroCtx.stroke();
    drawCenteredText(heroCtx, profile.mark, cx, cy + 53, {
      font: `900 15px ${SYSTEM_FONT}`,
      color: palette.gleam,
      stroke: palette.dark,
      strokeWidth: 2,
    });
    heroCtx.restore();
    return surface;
  }

  function createEnvironmentActors() {
    const ripples = [];
    const smoke = [];
    const lanterns = [];
    for (let index = 0; index < 9; index += 1) {
      ripples.push({
        x: 246 + index * 112,
        y: 344 + (index % 3) * 17,
        width: 54 + (index % 4) * 18,
        phase: index * 0.73,
      });
    }
    for (let index = 0; index < 7; index += 1) {
      smoke.push({
        x: index < 4 ? 130 + index * 18 : 1190 + (index - 4) * 17,
        y: index < 4 ? 319 - index * 17 : 331 - (index - 4) * 18,
        phase: index * 0.91,
        radius: 7 + (index % 3) * 3,
      });
    }
    lanterns.push(
      { x: 83, y: 215, phase: 0.2 },
      { x: 1276, y: 231, phase: 1.7 },
      { x: 112, y: 505, phase: 2.8 },
      { x: 1248, y: 493, phase: 4.2 },
    );
    return { ripples, smoke, lanterns };
  }

  function clonePresentationCard(card) {
    if (!card || typeof card !== "object") return card;
    return {
      ...card,
      keywords: Array.isArray(card.keywords) ? card.keywords.slice() : [],
    };
  }

  function capturePresentationState(state) {
    if (!state) return null;
    return {
      phase: state.phase,
      turn: state.turn,
      turnNumber: state.turnNumber,
      heroes: {
        player: { ...(state.heroes && state.heroes.player || {}) },
        ai: { ...(state.heroes && state.heroes.ai || {}) },
      },
      boards: {
        player: (state.boards && state.boards.player || []).map(clonePresentationCard),
        ai: (state.boards && state.boards.ai || []).map(clonePresentationCard),
      },
    };
  }

  function commanderPresentationFor(state, side) {
    const raw = state && state.commanders && state.commanders[side];
    const rawId = raw && typeof raw === "object" ? raw.id : raw;
    const fallbackId = side === "ai" ? "caocao" : "liubei";
    const presentation = COMMANDER_PRESENTATION[String(rawId || fallbackId)]
      || COMMANDER_PRESENTATION[fallbackId];
    return {
      ...presentation,
      ...(raw && typeof raw === "object" ? raw : {}),
      id: presentation.id,
      faction: presentation.faction,
      factionLabel: presentation.factionLabel,
    };
  }

  function commanderPowerVisualState(state, side) {
    const commander = commanderPresentationFor(state, side);
    const hero = state && state.heroes && state.heroes[side] || {};
    if (!commander.active) {
      return Number(commander.reflectCharges || 0) > 0 ? "ready" : "spent";
    }
    if (commander.powerUsedThisTurn) return "spent";
    if (
      !state
      || state.phase !== "playing"
      || state.turn !== side
    ) {
      return "spent";
    }
    if (
      commander.id === "caocao"
      && Number(hero.health || 0) >= Math.max(1, Number(hero.maxHealth || 30))
    ) {
      return "unavailable";
    }
    if (Number(hero.mana || 0) < Number(commander.powerCost || 0)) return "mana";
    return "ready";
  }

  function boardSlotGeometry(side, count, index) {
    const width = 124;
    const height = 148;
    const gap = 14;
    const totalWidth = count * width + Math.max(0, count - 1) * gap;
    return {
      x: LOGICAL_WIDTH / 2 - totalWidth / 2 + index * (width + gap),
      y: side === "ai" ? 178 : 397,
      width,
      height,
    };
  }

  function playerHandLayoutGeometry(count, index) {
    const safeCount = Math.max(0, Number(count) || 0);
    const maxSpread = Math.min(780, 76 * Math.max(1, safeCount - 1));
    const spacing = safeCount <= 1 ? 0 : maxSpread / (safeCount - 1);
    const centered = index - (safeCount - 1) / 2;
    // A sparse hand sits left of the player hero and mana rail. This keeps the
    // top, cost gem, portrait, and name discoverable even before hover lift.
    const handCenterX = safeCount <= 2 ? 490 : 683;
    const x = handCenterX + centered * spacing;
    const normalized = safeCount <= 1 ? 0 : centered / Math.max(1, (safeCount - 1) / 2);
    // Lower the resting fan so the commander reads as the foreground anchor.
    // Hover/selection still lifts cards for inspection without hiding the hero.
    const y = 677 + Math.abs(normalized) * 6;
    const angle = normalized * 0.115;
    return { x, y, angle };
  }

  function commanderIdentityRibbonGeometry(side) {
    return {
      x: LOGICAL_WIDTH / 2 - 66,
      y: side === "ai" ? 156 : 680,
      width: 132,
      height: 24,
    };
  }

  function inspectionPanelGeometry(panelSide) {
    const width = 318;
    const height = 682;
    const edgeGap = 12;
    return {
      x: panelSide === "right" ? LOGICAL_WIDTH - width - edgeGap : edgeGap,
      y: 43,
      width,
      height,
    };
  }

  function turnButtonGeometry(panelSide) {
    if (panelSide === "right") {
      // A right-side inspector occupies the normal turn rail. Dock the action
      // into the 71px lane between minion rows while preserving a 60px target.
      return { x: 842, y: 332, width: 160, height: 60, docked: true };
    }
    return { x: 1137, y: 323, width: 175, height: 72, docked: false };
  }

  function locateCardInstance(state, instanceId) {
    const stableId = String(instanceId || "");
    if (!state || !stableId) return null;
    for (const side of ["player", "ai"]) {
      const hand = state.hands && state.hands[side] || [];
      const handIndex = hand.findIndex(
        (card) => String(getCardValue(card, "instanceId", "") || "") === stableId,
      );
      if (handIndex >= 0) {
        return {
          card: hand[handIndex],
          source: { type: "hand-card", side, index: handIndex },
        };
      }
      const board = state.boards && state.boards[side] || [];
      const boardIndex = board.findIndex(
        (card) => String(getCardValue(card, "instanceId", "") || "") === stableId,
      );
      if (boardIndex >= 0) {
        return {
          card: board[boardIndex],
          source: { type: "board-card", side, index: boardIndex },
        };
      }
    }
    return null;
  }

  function playerHandIdentitySignature(state) {
    const hand = state && state.hands && state.hands.player || [];
    return hand.map((card, index) => {
      const instanceId = String(getCardValue(card, "instanceId", "") || "");
      if (instanceId) return `instance:${instanceId}`;
      return `fallback:${getCardValue(card, "id", "card")}:${index}`;
    }).join("|");
  }

  function pointerActuallyMoved(previous, next, threshold) {
    if (!previous || !next) return false;
    const minimum = Number.isFinite(threshold) ? threshold : 0.75;
    return Math.hypot(next.x - previous.x, next.y - previous.y) >= minimum;
  }

  function tabletopParallaxOffset(point, reducedMotion) {
    if (reducedMotion) {
      return { x: 0, y: 0, sheen: 0.5 };
    }
    const safePoint = point || {};
    const pointX = Number.isFinite(safePoint.x) ? safePoint.x : LOGICAL_WIDTH / 2;
    const pointY = Number.isFinite(safePoint.y) ? safePoint.y : LOGICAL_HEIGHT / 2;
    const normalizedX = clamp(pointX / LOGICAL_WIDTH * 2 - 1, -1, 1);
    const normalizedY = clamp(pointY / LOGICAL_HEIGHT * 2 - 1, -1, 1);
    return {
      x: normalizedX * TABLETOP_PARALLAX_MAX_X,
      y: normalizedY * TABLETOP_PARALLAX_MAX_Y,
      sheen: 0.5 + normalizedX * 0.08 - normalizedY * 0.035,
    };
  }

  function presentationHealth(actualHealth, latch, now) {
    if (latch && now < latch.revealAt) return latch.before;
    return actualHealth;
  }

  function presentationLocked(until, now) {
    return Number(until || 0) > Number(now || 0);
  }

  function createBackground(documentRef) {
    const surface = documentRef.createElement("canvas");
    surface.width = LOGICAL_WIDTH;
    surface.height = LOGICAL_HEIGHT;
    const ctx = surface.getContext("2d");
    const random = seededNoise(0x6f3a1b);

    const field = ctx.createRadialGradient(682, 360, 45, 682, 380, 760);
    field.addColorStop(0, "#315b4e");
    field.addColorStop(0.55, "#183b36");
    field.addColorStop(1, "#071b1c");
    ctx.fillStyle = field;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Silk weave.
    ctx.globalAlpha = 0.08;
    for (let y = 24; y < LOGICAL_HEIGHT; y += 7) {
      ctx.strokeStyle = y % 14 === 0 ? "#cde1ba" : "#061313";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + Math.sin(y * 0.04) * 2);
      ctx.bezierCurveTo(390, y - 4, 920, y + 5, LOGICAL_WIDTH, y - 1);
      ctx.stroke();
    }
    for (let x = 12; x < LOGICAL_WIDTH; x += 11) {
      ctx.strokeStyle = "#d4c489";
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + Math.sin(x) * 3, LOGICAL_HEIGHT);
      ctx.stroke();
    }

    // Procedural topographic ink map.
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#e7dca8";
    ctx.lineWidth = 1.2;
    for (let line = 0; line < 18; line += 1) {
      const originX = 170 + random() * 1020;
      const originY = 130 + random() * 500;
      ctx.beginPath();
      for (let step = 0; step <= 36; step += 1) {
        const angle = (step / 36) * TAU;
        const radiusX = 25 + line * 4 + Math.sin(angle * 3 + line) * 9;
        const radiusY = 10 + line * 2.2 + Math.cos(angle * 4 + line) * 5;
        const px = originX + Math.cos(angle) * radiusX;
        const py = originY + Math.sin(angle) * radiusY;
        if (step === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Distant Red Cliffs silhouettes: three depth planes, kept off card lanes.
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = "#071816";
    ctx.beginPath();
    ctx.moveTo(31, 292);
    ctx.lineTo(31, 126);
    ctx.lineTo(90, 104);
    ctx.lineTo(137, 137);
    ctx.lineTo(185, 118);
    ctx.lineTo(236, 170);
    ctx.lineTo(283, 147);
    ctx.lineTo(330, 208);
    ctx.lineTo(330, 292);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(LOGICAL_WIDTH - 31, 286);
    ctx.lineTo(LOGICAL_WIDTH - 31, 115);
    ctx.lineTo(1286, 96);
    ctx.lineTo(1238, 142);
    ctx.lineTo(1196, 124);
    ctx.lineTo(1148, 175);
    ctx.lineTo(1095, 153);
    ctx.lineTo(1043, 216);
    ctx.lineTo(1043, 286);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#8aa38b";
    for (let ridge = 0; ridge < 8; ridge += 1) {
      const ridgeX = ridge < 4 ? 55 + ridge * 72 : 1078 + (ridge - 4) * 67;
      const ridgeY = 147 + (ridge % 3) * 29;
      ctx.beginPath();
      ctx.moveTo(ridgeX, ridgeY + 55);
      ctx.lineTo(ridgeX + 18, ridgeY);
      ctx.lineTo(ridgeX + 34, ridgeY + 55);
      ctx.closePath();
      ctx.fill();
    }

    // River crossing the playfield.
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = "#78b5aa";
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(220, 372);
    ctx.bezierCurveTo(430, 324, 550, 408, 710, 361);
    ctx.bezierCurveTo(880, 310, 1030, 405, 1190, 345);
    ctx.stroke();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = "#b5ddd1";
    ctx.lineWidth = 2;
    for (let offset = -7; offset <= 7; offset += 7) {
      ctx.beginPath();
      ctx.moveTo(220, 372 + offset);
      ctx.bezierCurveTo(430, 324 + offset, 550, 408 + offset, 710, 361 + offset);
      ctx.bezierCurveTo(880, 310 + offset, 1030, 405 + offset, 1190, 345 + offset);
      ctx.stroke();
    }

    // Fleet silhouettes make the empty center read as a battle about to begin.
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#100e0c";
    for (let ship = 0; ship < 7; ship += 1) {
      const shipX = 286 + ship * 132;
      const shipY = 349 + (ship % 3) * 12;
      ctx.beginPath();
      ctx.moveTo(shipX - 27, shipY);
      ctx.quadraticCurveTo(shipX, shipY + 13, shipX + 31, shipY);
      ctx.lineTo(shipX + 22, shipY + 11);
      ctx.lineTo(shipX - 19, shipY + 11);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#b99a5c";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(shipX, shipY);
      ctx.lineTo(shipX, shipY - 31);
      ctx.lineTo(shipX + (ship % 2 ? -18 : 18), shipY - 20);
      ctx.stroke();
      ctx.fillStyle = ship % 2 ? "#6e2622" : "#245648";
      ctx.globalAlpha = 0.13;
      ctx.beginPath();
      ctx.moveTo(shipX, shipY - 30);
      ctx.lineTo(shipX + (ship % 2 ? -20 : 20), shipY - 20);
      ctx.lineTo(shipX, shipY - 10);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#100e0c";
    }

    // Near-plane command tables and brazier bowls anchor both camps.
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#1c100b";
    for (const campX of [128, 1197]) {
      ctx.fillRect(campX - 45, 526, 90, 8);
      ctx.fillRect(campX - 34, 534, 8, 47);
      ctx.fillRect(campX + 26, 534, 8, 47);
      ctx.beginPath();
      ctx.moveTo(campX - 20, 512);
      ctx.quadraticCurveTo(campX, 523, campX + 20, 512);
      ctx.lineTo(campX + 14, 526);
      ctx.lineTo(campX - 14, 526);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#cf6d2f";
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.moveTo(campX - 9, 513);
      ctx.quadraticCurveTo(campX - 3, 492, campX, 507);
      ctx.quadraticCurveTo(campX + 6, 487, campX + 10, 513);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#1c100b";
      ctx.globalAlpha = 0.22;
    }

    // Heavy carved wood outer frame.
    ctx.globalAlpha = 1;
    const wood = ctx.createLinearGradient(0, 0, 32, 0);
    wood.addColorStop(0, "#29150d");
    wood.addColorStop(0.35, "#6e3d20");
    wood.addColorStop(0.65, "#9a6131");
    wood.addColorStop(1, "#351a0e");
    ctx.fillStyle = wood;
    ctx.fillRect(0, 0, 31, LOGICAL_HEIGHT);
    ctx.fillRect(LOGICAL_WIDTH - 31, 0, 31, LOGICAL_HEIGHT);
    const horizontalWood = ctx.createLinearGradient(0, 0, 0, 30);
    horizontalWood.addColorStop(0, "#231209");
    horizontalWood.addColorStop(0.48, "#895229");
    horizontalWood.addColorStop(1, "#341a0d");
    ctx.fillStyle = horizontalWood;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, 30);
    ctx.fillRect(0, LOGICAL_HEIGHT - 29, LOGICAL_WIDTH, 29);
    ctx.strokeStyle = "#d19b50";
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 29, LOGICAL_WIDTH - 60, LOGICAL_HEIGHT - 58);

    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "#150905";
    for (let index = 0; index < 75; index += 1) {
      const y = random() * LOGICAL_HEIGHT;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(8, y - 5, 21, y + 4, 31, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(LOGICAL_WIDTH - 31, y);
      ctx.bezierCurveTo(LOGICAL_WIDTH - 19, y + 5, LOGICAL_WIDTH - 8, y - 4, LOGICAL_WIDTH, y);
      ctx.stroke();
    }

    // Bronze corner fittings and studs.
    ctx.globalAlpha = 1;
    for (const [x, y] of [[24, 23], [LOGICAL_WIDTH - 24, 23], [24, LOGICAL_HEIGHT - 23], [LOGICAL_WIDTH - 24, LOGICAL_HEIGHT - 23]]) {
      const bronze = ctx.createRadialGradient(x - 4, y - 5, 2, x, y, 18);
      bronze.addColorStop(0, "#ffe09a");
      bronze.addColorStop(0.3, "#a87331");
      bronze.addColorStop(1, "#2a180d");
      ctx.fillStyle = bronze;
      ellipsePath(ctx, x, y, 17, 17);
      ctx.fill();
      ctx.strokeStyle = "#d7a95a";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    return surface;
  }

  /*
   * The tabletop depth pass is rasterized once and composited below every card.
   * Splitting it from the base painting lets a two-to-three pixel relief drift
   * sell physical depth without moving hit regions or creating gradients in the
   * animation path.
   */
  function createTabletopDepthSurfaces(documentRef, backgroundSurface) {
    function makeSurface() {
      const surface = documentRef.createElement("canvas");
      surface.width = LOGICAL_WIDTH;
      surface.height = LOGICAL_HEIGHT;
      return surface;
    }

    const staticRelief = makeSurface();
    const reliefCtx = staticRelief.getContext("2d");
    const mapRelief = makeSurface();
    const mapCtx = mapRelief.getContext("2d");
    const warmGlow = makeSurface();
    const glowCtx = warmGlow.getContext("2d");
    const directionalSheen = makeSurface();
    const sheenCtx = directionalSheen.getContext("2d");
    const random = seededNoise(0x2a7f19c3);

    // A recessed inner lip gives the playmat an actual thickness.
    reliefCtx.save();
    roundedRect(reliefCtx, 34, 33, LOGICAL_WIDTH - 68, LOGICAL_HEIGHT - 66, 16);
    reliefCtx.strokeStyle = "rgba(12,5,3,.72)";
    reliefCtx.lineWidth = 9;
    reliefCtx.stroke();
    roundedRect(reliefCtx, 38, 37, LOGICAL_WIDTH - 76, LOGICAL_HEIGHT - 74, 13);
    reliefCtx.strokeStyle = "rgba(238,186,99,.24)";
    reliefCtx.lineWidth = 2;
    reliefCtx.stroke();
    roundedRect(reliefCtx, 41, 40, LOGICAL_WIDTH - 82, LOGICAL_HEIGHT - 80, 11);
    reliefCtx.strokeStyle = "rgba(3,14,14,.6)";
    reliefCtx.lineWidth = 3;
    reliefCtx.stroke();
    reliefCtx.restore();

    // Edge wear is deterministic and remains inside the wooden rail.
    reliefCtx.save();
    reliefCtx.lineCap = "round";
    for (let mark = 0; mark < 54; mark += 1) {
      const horizontal = mark < 34;
      const upperOrLeft = mark % 2 === 0;
      const length = 5 + random() * 15;
      reliefCtx.globalAlpha = 0.09 + random() * 0.12;
      reliefCtx.strokeStyle = mark % 3 === 0 ? "#edbd71" : "#1b0905";
      reliefCtx.lineWidth = 0.7 + random() * 1.1;
      reliefCtx.beginPath();
      if (horizontal) {
        const x = 72 + random() * (LOGICAL_WIDTH - 144);
        const y = upperOrLeft ? 12 + random() * 11 : LOGICAL_HEIGHT - 23 + random() * 11;
        reliefCtx.moveTo(x, y);
        reliefCtx.quadraticCurveTo(x + length * 0.48, y + (random() - 0.5) * 3, x + length, y + (random() - 0.5) * 2);
      } else {
        const x = upperOrLeft ? 11 + random() * 10 : LOGICAL_WIDTH - 21 + random() * 10;
        const y = 68 + random() * (LOGICAL_HEIGHT - 136);
        reliefCtx.moveTo(x, y);
        reliefCtx.quadraticCurveTo(x + (random() - 0.5) * 3, y + length * 0.48, x + (random() - 0.5) * 2, y + length);
      }
      reliefCtx.stroke();
    }
    reliefCtx.restore();

    function drawBronzeCorner(x, y, flipX, flipY) {
      reliefCtx.save();
      reliefCtx.translate(x, y);
      reliefCtx.scale(flipX, flipY);
      reliefCtx.shadowColor = "rgba(0,0,0,.68)";
      reliefCtx.shadowBlur = 9;
      reliefCtx.shadowOffsetX = 3;
      reliefCtx.shadowOffsetY = 4;
      const bronze = reliefCtx.createLinearGradient(0, 0, 74, 74);
      bronze.addColorStop(0, "#f4c97c");
      bronze.addColorStop(0.18, "#a96e31");
      bronze.addColorStop(0.5, "#5d351b");
      bronze.addColorStop(0.78, "#b47a37");
      bronze.addColorStop(1, "#2b160c");
      reliefCtx.fillStyle = bronze;
      reliefCtx.beginPath();
      reliefCtx.moveTo(0, 0);
      reliefCtx.lineTo(76, 0);
      reliefCtx.lineTo(64, 16);
      reliefCtx.lineTo(31, 18);
      reliefCtx.lineTo(19, 31);
      reliefCtx.lineTo(16, 64);
      reliefCtx.lineTo(0, 76);
      reliefCtx.closePath();
      reliefCtx.fill();
      reliefCtx.shadowColor = "transparent";
      reliefCtx.strokeStyle = "rgba(255,224,154,.54)";
      reliefCtx.lineWidth = 1.4;
      reliefCtx.stroke();
      reliefCtx.strokeStyle = "rgba(53,25,11,.7)";
      reliefCtx.lineWidth = 2;
      reliefCtx.beginPath();
      reliefCtx.moveTo(23, 11);
      reliefCtx.quadraticCurveTo(39, 9, 56, 12);
      reliefCtx.quadraticCurveTo(35, 18, 18, 40);
      reliefCtx.stroke();
      for (const [rivetX, rivetY] of [[12, 12], [51, 10], [10, 51]]) {
        const rivet = reliefCtx.createRadialGradient(rivetX - 2, rivetY - 2, 0, rivetX, rivetY, 5);
        rivet.addColorStop(0, "#ffe0a0");
        rivet.addColorStop(0.34, "#a76a2d");
        rivet.addColorStop(1, "#2c170d");
        reliefCtx.fillStyle = rivet;
        reliefCtx.beginPath();
        reliefCtx.arc(rivetX, rivetY, 4.5, 0, TAU);
        reliefCtx.fill();
      }
      reliefCtx.restore();
    }

    drawBronzeCorner(5, 4, 1, 1);
    drawBronzeCorner(LOGICAL_WIDTH - 5, 4, -1, 1);
    drawBronzeCorner(5, LOGICAL_HEIGHT - 4, 1, -1);
    drawBronzeCorner(LOGICAL_WIDTH - 5, LOGICAL_HEIGHT - 4, -1, -1);

    // Neutral cloud-and-wave carvings occupy the unused side margins only.
    reliefCtx.save();
    reliefCtx.globalAlpha = 0.3;
    reliefCtx.strokeStyle = "#bd8c4d";
    reliefCtx.lineWidth = 2.2;
    reliefCtx.lineCap = "round";
    for (const side of [-1, 1]) {
      const centerX = side < 0 ? 59 : LOGICAL_WIDTH - 59;
      reliefCtx.save();
      reliefCtx.translate(centerX, LOGICAL_HEIGHT / 2);
      reliefCtx.scale(side, 1);
      for (let curl = 0; curl < 3; curl += 1) {
        const curlY = (curl - 1) * 66;
        reliefCtx.beginPath();
        reliefCtx.moveTo(-9, curlY + 14);
        reliefCtx.bezierCurveTo(23, curlY - 19, 48, curlY + 6, 23, curlY + 23);
        reliefCtx.bezierCurveTo(6, curlY + 35, 2, curlY + 7, 20, curlY + 7);
        reliefCtx.stroke();
      }
      reliefCtx.restore();
    }
    reliefCtx.restore();

    // The strategic map receives paired shadow/highlight contours so it reads
    // as pressed relief when this transparent layer drifts over the silk.
    mapCtx.save();
    mapCtx.lineJoin = "round";
    const contourCenters = [
      { x: 248, y: 265, sx: 1.12, sy: 0.58, phase: 0.4 },
      { x: 592, y: 470, sx: 1.45, sy: 0.64, phase: 1.7 },
      { x: 961, y: 238, sx: 1.22, sy: 0.62, phase: 2.8 },
      { x: 1110, y: 522, sx: 0.86, sy: 0.52, phase: 4.1 },
    ];
    for (const center of contourCenters) {
      for (let ring = 0; ring < 5; ring += 1) {
        const points = [];
        for (let step = 0; step <= 42; step += 1) {
          const angle = step / 42 * TAU;
          const irregular = 1
            + Math.sin(angle * 3 + center.phase) * 0.09
            + Math.cos(angle * 5 - center.phase) * 0.045;
          const radius = 27 + ring * 17;
          points.push({
            x: center.x + Math.cos(angle) * radius * center.sx * irregular,
            y: center.y + Math.sin(angle) * radius * center.sy * irregular,
          });
        }
        for (const pass of [
          { dx: 1.35, dy: 1.55, color: "rgba(0,12,12,.34)", width: 2.2 },
          { dx: -0.7, dy: -0.85, color: "rgba(233,220,168,.17)", width: 1 },
        ]) {
          mapCtx.strokeStyle = pass.color;
          mapCtx.lineWidth = pass.width;
          mapCtx.beginPath();
          points.forEach((point, pointIndex) => {
            if (pointIndex === 0) mapCtx.moveTo(point.x + pass.dx, point.y + pass.dy);
            else mapCtx.lineTo(point.x + pass.dx, point.y + pass.dy);
          });
          mapCtx.stroke();
        }
      }
    }
    mapCtx.restore();

    // Warm light is pre-baked; only its opacity changes during lantern flicker.
    for (const lamp of [
      { x: 83, y: 215, radius: 86 },
      { x: 1276, y: 231, radius: 86 },
      { x: 112, y: 505, radius: 106 },
      { x: 1248, y: 493, radius: 106 },
      { x: 128, y: 512, radius: 132 },
      { x: 1197, y: 512, radius: 132 },
    ]) {
      const glow = glowCtx.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, lamp.radius);
      glow.addColorStop(0, "rgba(255,189,91,.27)");
      glow.addColorStop(0.26, "rgba(228,107,46,.11)");
      glow.addColorStop(1, "rgba(122,43,19,0)");
      glowCtx.fillStyle = glow;
      glowCtx.fillRect(
        lamp.x - lamp.radius,
        lamp.y - lamp.radius,
        lamp.radius * 2,
        lamp.radius * 2,
      );
    }

    // A cached oblique sheen responds to pointer direction without allocating.
    const sheen = sheenCtx.createLinearGradient(-140, 40, LOGICAL_WIDTH + 120, LOGICAL_HEIGHT - 30);
    sheen.addColorStop(0, "rgba(255,232,174,0)");
    sheen.addColorStop(0.37, "rgba(255,224,159,.018)");
    sheen.addColorStop(0.49, "rgba(255,235,185,.075)");
    sheen.addColorStop(0.58, "rgba(181,219,199,.025)");
    sheen.addColorStop(0.74, "rgba(255,232,174,0)");
    sheenCtx.fillStyle = sheen;
    sheenCtx.fillRect(56, 50, LOGICAL_WIDTH - 112, LOGICAL_HEIGHT - 100);

    const backgroundContext = backgroundSurface && backgroundSurface.getContext
      ? backgroundSurface.getContext("2d")
      : null;
    if (backgroundContext) backgroundContext.drawImage(staticRelief, 0, 0);

    return Object.freeze({
      mapRelief,
      warmGlow,
      directionalSheen,
    });
  }

  function createBoardUI(options) {
    const config = options || {};
    const root = config.root;
    const canvas = config.canvas;
    const getState = typeof config.getState === "function" ? config.getState : () => null;
    const dispatch = typeof config.dispatch === "function" ? config.dispatch : () => {};
    const requestAudioUnlock = typeof config.requestAudioUnlock === "function"
      ? config.requestAudioUnlock
      : () => {};
    const runtimeKeywordDefinitions = config.keywordDefinitions && typeof config.keywordDefinitions === "object"
      ? config.keywordDefinitions
      : {};

    if (!root || !canvas || typeof canvas.getContext !== "function") {
      throw new Error("boardUI: root와 canvas가 필요합니다.");
    }

    const documentRef = canvas.ownerDocument || global.document;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("boardUI: 2D Canvas를 사용할 수 없습니다.");
    const sharedFXFeedback = Boolean(
      documentRef.getElementById && documentRef.getElementById("fx-canvas"),
    );

    const background = createBackground(documentRef);
    const tabletopDepth = createTabletopDepthSurfaces(documentRef, background);
    const heroArt = {
      caocao: createHeroMedallionSurface(documentRef, "caocao"),
      liubei: createHeroMedallionSurface(documentRef, "liubei"),
      sunquan: createHeroMedallionSurface(documentRef, "sunquan"),
      nomad: createHeroMedallionSurface(documentRef, "nomad"),
    };
    const environmentActors = createEnvironmentActors();
    const reducedMotionQuery = global.matchMedia
      ? global.matchMedia("(prefers-reduced-motion: reduce)")
      : { matches: false, addEventListener() {}, removeEventListener() {} };

    let currentState = null;
    let previousRevision = -1;
    let destroyed = false;
    let frameHandle = 0;
    let idleFrameTimer = 0;
    let renderScaleX = 1;
    let renderScaleY = 1;
    let thinking = false;
    let mutedHint = false;
    let hoverHit = null;
    let hoverInputSource = "none";
    let passiveHandHoverBlocked = false;
    let previousPlayerHandSignature = "";
    let keyboardIndex = 0;
    let hits = [];
    let selection = null;
    let inspection = null;
    let closingInspection = null;
    let hoverPreviewMotion = null;
    let pointer = { x: LOGICAL_WIDTH / 2, y: LOGICAL_HEIGHT / 2 };
    let pointerDown = null;
    let drag = null;
    let toast = null;
    let announcedRevision = -1;
    let gameEndRevealAt = 0;
    let previousPhase = "";
    let presentationBusyUntil = 0;
    let heroDamageEventSequence = 0;
    let previousFrameTime = 0;
    let frameDeltaMs = 1000 / 60;
    const positions = new Map();
    const handPoseStates = new Map();
    const visualPresses = new Map();
    const combatTimelines = [];
    const dyingGhosts = [];
    const heroHealthLatches = { player: null, ai: null };
    const seenHeroDamageTokens = new Set();
    const inspectorLayoutCache = new Map();
    const INSPECTOR_LAYOUT_CACHE_LIMIT = 64;

    function requestBoardAnimationFrame() {
      if (destroyed || frameHandle) return;
      frameHandle = global.requestAnimationFrame(drawFrame);
    }

    function invalidateBoardFrame() {
      if (destroyed) return;
      if (idleFrameTimer) {
        global.clearTimeout(idleFrameTimer);
        idleFrameTimer = 0;
      }
      requestBoardAnimationFrame();
    }

    function handPoseAnimationActive() {
      for (const pose of handPoseStates.values()) {
        for (const field of ["lift", "scale", "fanAngle", "tilt", "hoverMix", "sweep"]) {
          if (Math.abs(Number(pose[`${field}Velocity`]) || 0) > 0.004) return true;
        }
      }
      return false;
    }

    function boardNeedsActiveAnimation(now) {
      visualPresses.forEach((pulse, key) => {
        if (
          reducedMotionQuery.matches
          || now - Number(pulse.startedAt || 0) >= PRESS_FEEDBACK_MS
        ) {
          visualPresses.delete(key);
        }
      });
      const inspectorMoving = !reducedMotionQuery.matches && Boolean(
        inspection && now - inspection.openedAt < INSPECTOR_OPEN_MS
        || closingInspection && now - closingInspection.closedAt < INSPECTOR_CLOSE_MS
        || hoverPreviewMotion && now - hoverPreviewMotion.openedAt < INSPECTOR_OPEN_MS
      );
      const heroFeedbackActive = ["player", "ai"].some((side) => {
        const latch = heroHealthLatches[side];
        return Boolean(latch && now < latch.impactUntil);
      });
      return Boolean(
        presentationBusyUntil > now
        || combatTimelines.length
        || dyingGhosts.length
        || visualPresses.size
        || toast
        || thinking
        || selection
        || drag && drag.active
        || pointerDown
        || inspectorMoving
        || heroFeedbackActive
        || gameEndRevealAt && now < gameEndRevealAt
        || handPoseAnimationActive()
      );
    }

    function scheduleNextBoardFrame(now) {
      if (destroyed) return;
      const delay = boardFrameDelay(
        boardNeedsActiveAnimation(now),
        reducedMotionQuery.matches,
      );
      if (delay === 0) {
        requestBoardAnimationFrame();
        return;
      }
      if (delay === null || idleFrameTimer) return;
      idleFrameTimer = global.setTimeout(() => {
        idleFrameTimer = 0;
        requestBoardAnimationFrame();
      }, delay);
    }

    root.classList.add("tk-board-root");
    canvas.classList.add("tk-board-canvas");
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "application");
    canvas.setAttribute(
      "aria-label",
      "적벽전설 카드 대전판. 방향키로 선택하고 Enter 또는 Space로 실행합니다. M키로 음소거, Escape로 선택 취소.",
    );
    canvas.style.touchAction = "none";

    const styleId = "tk-board-ui-runtime-style";
    if (!documentRef.getElementById(styleId)) {
      const style = documentRef.createElement("style");
      style.id = styleId;
      style.textContent = `
        .tk-board-root {
          position: relative;
          overflow: hidden;
          width: 100%;
          height: 100%;
          min-height: 320px;
          background: #071313;
          isolation: isolate;
          user-select: none;
          -webkit-user-select: none;
        }
        .tk-board-canvas {
          position: absolute;
          left: 50%;
          top: 50%;
          display: block;
          max-width: 100%;
          max-height: 100%;
          transform: translate(-50%, -50%);
          outline: none;
          cursor: default;
          box-shadow: 0 18px 70px rgba(0,0,0,.62);
        }
        .tk-board-canvas:focus-visible {
          box-shadow: 0 0 0 3px #f2cd76, 0 18px 70px rgba(0,0,0,.62);
        }
        .tk-board-live {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0,0,0,0) !important;
          white-space: nowrap !important;
          border: 0 !important;
        }
      `;
      documentRef.head.appendChild(style);
    }

    const liveRegion = documentRef.createElement("div");
    liveRegion.className = "tk-board-live";
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    root.appendChild(liveRegion);

    function resizeCanvas() {
      if (destroyed) return;
      const rootRect = root.getBoundingClientRect();
      const availableWidth = Math.max(1, rootRect.width || LOGICAL_WIDTH);
      const availableHeight = Math.max(1, rootRect.height || LOGICAL_HEIGHT);
      const metrics = boardRenderMetrics(
        availableWidth,
        availableHeight,
        global.devicePixelRatio || 1,
      );
      canvas.style.width = `${metrics.cssWidth}px`;
      canvas.style.height = `${metrics.cssHeight}px`;
      renderScaleX = metrics.renderScaleX;
      renderScaleY = metrics.renderScaleY;
      if (
        canvas.width !== metrics.backingWidth
        || canvas.height !== metrics.backingHeight
      ) {
        canvas.width = metrics.backingWidth;
        canvas.height = metrics.backingHeight;
      }
      invalidateBoardFrame();
    }

    const resizeObserver = typeof global.ResizeObserver === "function"
      ? new global.ResizeObserver(resizeCanvas)
      : null;
    if (resizeObserver) resizeObserver.observe(root);
    if (global.addEventListener) global.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    function refreshStateSnapshot() {
      try {
        const nextState = getState();
        if (nextState) currentState = nextState;
      } catch {
        // Preserve the last render snapshot if the runtime is between games.
      }
      return currentState;
    }

    function stateNow() {
      if (currentState) return currentState;
      return refreshStateSnapshot();
    }

    function activeCombatTimeline(now) {
      while (combatTimelines.length && now >= combatTimelines[0].endAt) {
        combatTimelines.shift();
      }
      return combatTimelines[0] || null;
    }

    function visualStateForFrame(actualState, now) {
      const timeline = activeCombatTimeline(now);
      if (!timeline) return actualState;
      if (now < timeline.contactAt) return timeline.before || actualState;
      return timeline.after || actualState;
    }

    function isPresentationLocked(now) {
      return presentationLocked(presentationBusyUntil, now);
    }

    function pointFromEvent(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: clamp(((event.clientX - rect.left) / Math.max(1, rect.width)) * LOGICAL_WIDTH, 0, LOGICAL_WIDTH),
        y: clamp(((event.clientY - rect.top) / Math.max(1, rect.height)) * LOGICAL_HEIGHT, 0, LOGICAL_HEIGHT),
      };
    }

    function addHit(type, x, y, width, height, data, angle) {
      const hit = {
        type,
        x,
        y,
        width,
        height,
        angle: angle || 0,
        data: data || {},
      };
      hits.push(hit);
      return hit;
    }

    function hitContains(hit, point) {
      if (!hit) return false;
      const centerX = hit.x + hit.width / 2;
      const centerY = hit.y + hit.height / 2;
      const cosine = Math.cos(-hit.angle);
      const sine = Math.sin(-hit.angle);
      const offsetX = point.x - centerX;
      const offsetY = point.y - centerY;
      const localX = offsetX * cosine - offsetY * sine + centerX;
      const localY = offsetX * sine + offsetY * cosine + centerY;
      return localX >= hit.x
        && localX <= hit.x + hit.width
        && localY >= hit.y
        && localY <= hit.y + hit.height;
    }

    function hitAt(point) {
      for (let index = hits.length - 1; index >= 0; index -= 1) {
        if (hitContains(hits[index], point)) return hits[index];
      }
      return null;
    }

    function invalidatePassiveHandHover() {
      passiveHandHoverBlocked = true;
      hoverPreviewMotion = null;
      if (hoverHit && hoverHit.type === "hand-card") {
        hoverHit = null;
        hoverInputSource = "none";
      }
    }

    function handPoseKey(card, index) {
      const instanceId = String(getCardValue(card, "instanceId", "") || "");
      return instanceId || `${getCardValue(card, "id", "hand-card")}:${index}`;
    }

    function visualPressKey(hit, state) {
      if (!hit) return "";
      if (hit.type === "end-turn") return "end-turn";
      if (hit.type === "hand-card") {
        const card = state && state.hands && state.hands.player
          ? state.hands.player[hit.data.index]
          : null;
        return card ? `card:${handPoseKey(card, hit.data.index)}` : "";
      }
      if (hit.type === "board-card") {
        const card = state && state.boards && state.boards[hit.data.side]
          ? state.boards[hit.data.side][hit.data.index]
          : null;
        const instanceId = String(getCardValue(card, "instanceId", "") || hit.data.key || "");
        return instanceId ? `card:${instanceId}` : "";
      }
      return "";
    }

    function startVisualPress(hit, state, now) {
      const key = visualPressKey(hit, state);
      if (!key || reducedMotionQuery.matches) return;
      visualPresses.set(key, { startedAt: now });
      invalidateBoardFrame();
    }

    function currentVisualPressScale(key, now) {
      const pulse = visualPresses.get(key);
      if (!pulse) return 1;
      const elapsed = now - pulse.startedAt;
      if (elapsed >= PRESS_FEEDBACK_MS || reducedMotionQuery.matches) {
        visualPresses.delete(key);
        return 1;
      }
      return pressFeedbackScale(elapsed, false);
    }

    function targetFromHit(hit) {
      if (!hit) return null;
      if (hit.type === "hero") {
        return { zone: "hero", side: hit.data.side };
      }
      if (hit.type === "board-card") {
        return { zone: "board", side: hit.data.side, index: hit.data.index };
      }
      return null;
    }

    function cardFromHit(hit, state) {
      if (!hit || !state) return null;
      if (hit.type === "hand-card") {
        return (state.hands && state.hands.player || [])[hit.data.index] || null;
      }
      if (hit.type === "board-card") {
        return (state.boards && state.boards[hit.data.side] || [])[hit.data.index] || null;
      }
      return null;
    }

    function inspectionAnnouncement(card) {
      const keywordDetails = cardKeywordDetails(card);
      return inspectorAnnouncementText(card, keywordDetails);
    }

    function inspectionInstanceId(card) {
      return String(getCardValue(card, "instanceId", "") || "");
    }

    function applyInspectionCard(card, source) {
      if (!inspection || !card) return;
      inspection.card = card;
      inspection.source = source || inspection.source;
      const cardId = inspectionInstanceId(card) || String(getCardValue(card, "id", ""));
      root.setAttribute("data-inspection-card-id", cardId);
      canvas.setAttribute("aria-description", inspectionAnnouncement(card));
    }

    function locateInspectionCard(state) {
      if (!inspection || !state) return null;
      const instanceId = inspectionInstanceId(inspection.card);
      if (instanceId) return locateCardInstance(state, instanceId);
      if (!instanceId && inspection.source) {
        const source = inspection.source;
        const cards = source.type === "hand-card"
          ? state.hands && state.hands[source.side] || []
          : state.boards && state.boards[source.side] || [];
        const candidate = cards[source.index];
        if (
          candidate
          && getCardValue(candidate, "id", "") === getCardValue(inspection.card, "id", "")
        ) {
          return { card: candidate, source: { ...source } };
        }
      }
      return null;
    }

    function reconcileInspection(state) {
      if (!inspection) return;
      const located = locateInspectionCard(state);
      if (!located) {
        closeInspection(false);
        return;
      }
      applyInspectionCard(located.card, located.source);
    }

    function inspectionMatchesAction(type, detail) {
      if (!inspection) return false;
      const eventDetail = detail || {};
      const instanceId = inspectionInstanceId(inspection.card);
      if (type === "card:play") {
        const source = inspection.source;
        const matchesInstance = Boolean(
          instanceId && instanceId === String(eventDetail.instanceId || ""),
        );
        const matchesHandSource = Boolean(
          source
          && source.type === "hand-card"
          && source.side === (eventDetail.actor || eventDetail.side)
          && source.index === eventDetail.handIndex,
        );
        return matchesInstance || matchesHandSource;
      }
      if (type === "attack:start") {
        const attacker = eventDetail.attacker || {};
        const target = eventDetail.target || {};
        const source = inspection.source;
        const matchesAttackerId = Boolean(
          instanceId && instanceId === String(eventDetail.attackerId || ""),
        );
        const matchesBoardSource = Boolean(
          source
          && source.type === "board-card"
          && (
            source.side === attacker.side && source.index === attacker.index
            || source.side === target.side && source.index === target.index
          ),
        );
        return matchesAttackerId || matchesBoardSource;
      }
      if (type === "minion:death") {
        return Boolean(instanceId && instanceId === String(eventDetail.instanceId || ""));
      }
      return false;
    }

    function openInspection(hit, state) {
      const card = cardFromHit(hit, state);
      if (!card) return;
      const openedAt = inspection && isInspectionCard(card)
        ? inspection.openedAt
        : performance.now();
      closingInspection = null;
      inspection = {
        card,
        source: {
          type: hit.type,
          side: hit.data.side || "player",
          index: hit.data.index,
        },
        panelSide: pointer.x < LOGICAL_WIDTH / 2 ? "right" : "left",
        openedAt,
      };
      applyInspectionCard(card, inspection.source);
      liveRegion.textContent = inspectionAnnouncement(card);
      invalidateBoardFrame();
    }

    function closeInspection(announce) {
      if (inspection && !reducedMotionQuery.matches) {
        closingInspection = {
          card: inspection.card,
          panelSide: inspection.panelSide,
          closedAt: performance.now(),
        };
      } else {
        closingInspection = null;
      }
      // Clear interactive inspection state before the visual settle begins.
      inspection = null;
      cancelSelection();
      root.removeAttribute("data-inspection-card-id");
      canvas.removeAttribute("aria-description");
      if (announce) liveRegion.textContent = "카드 상세를 닫았습니다.";
      invalidateBoardFrame();
    }

    function isInspectionCard(card) {
      if (!inspection || !card) return false;
      if (inspection.card === card) return true;
      const inspectedInstance = getCardValue(inspection.card, "instanceId", "");
      return Boolean(inspectedInstance && inspectedInstance === getCardValue(card, "instanceId", ""));
    }

    function cardTargetKind(card) {
      return getCardValue(card, "target", "none") || "none";
    }

    function isTargetAllowed(target, selectedItem, state) {
      if (!target || !selectedItem || !state) return false;
      if (selectedItem.kind === "commander-power") {
        if (selectedItem.commanderId !== "nomad") return false;
        if (target.zone !== "board" || target.side !== "ai") return false;
        const minion = state.boards && state.boards.ai
          ? state.boards.ai[target.index]
          : null;
        return Boolean(
          minion
          && !minion.attackLockPending
          && !minion.attackLockedThisTurn,
        );
      }
      if (selectedItem.kind === "attacker") {
        if (target.side !== "ai") return false;
        const guards = (state.boards && state.boards.ai || []).filter((minion) => minion.guard);
        if (guards.length > 0) {
          if (target.zone !== "board") return false;
          return Boolean((state.boards.ai[target.index] || {}).guard);
        }
        return true;
      }
      if (selectedItem.kind !== "hand") return false;
      const card = (state.hands && state.hands.player || [])[selectedItem.index];
      const targetKind = cardTargetKind(card);
      if (targetKind === "none") return false;
      if (targetKind === "enemy" && target.side !== "ai") return false;
      if (targetKind === "friendly" && target.side !== "player") return false;
      const abilities = getCardValue(card, "abilities", []) || [];
      if (abilities.some((ability) => /buff_target/.test(ability.op || "")) && target.zone !== "board") {
        return false;
      }
      return true;
    }

    function isGuardBlockedAttackTarget(target, selectedItem, state) {
      if (!target || !selectedItem || selectedItem.kind !== "attacker" || !state) return false;
      if (target.side !== "ai") return false;
      const guards = (state.boards && state.boards.ai || []).filter((minion) => minion.guard);
      if (guards.length === 0) return false;
      if (target.zone === "hero") return true;
      if (target.zone !== "board") return false;
      return !Boolean((state.boards.ai[target.index] || {}).guard);
    }

    function canSelectHand(card, state) {
      if (!canArmHandSelection(state)) return false;
      const mana = Number(state.heroes && state.heroes.player && state.heroes.player.mana || 0);
      const cost = Number(getCardValue(card, "currentCost", getCardValue(card, "cost", 0)));
      const board = state.boards && state.boards.player || [];
      return mana >= cost && board.length < 5;
    }

    function canArmHandSelection(state) {
      return Boolean(
        state
        && state.phase === "playing"
        && state.turn === "player"
        && !isPresentationLocked(performance.now()),
      );
    }

    function canSelectAttacker(minion, state) {
      return Boolean(
        state
        && state.phase === "playing"
        && state.turn === "player"
        && !isPresentationLocked(performance.now())
        && minion
        && minion.canAttack
        && (minion.attacksLeft === undefined || minion.attacksLeft > 0),
      );
    }

    function fireAction(action) {
      requestAudioUnlock();
      if (
        action
        && ["PLAY_CARD", "ATTACK", "END_TURN", "USE_COMMANDER_POWER"].includes(action.type)
        && isPresentationLocked(performance.now())
      ) {
        showToast("전투 연출이 끝난 뒤 다음 명령을 내릴 수 있습니다.", "normal");
        return false;
      }
      try {
        dispatch(action);
        return true;
      } catch (error) {
        showToast(
          uxCodeMessage(error && error.message, "행동을 처리할 수 없습니다."),
          "invalid",
        );
        return false;
      }
    }

    function showToast(message, tone, purpose) {
      toast = {
        message: String(message || ""),
        tone: tone || "normal",
        purpose: purpose || "feedback",
        startedAt: performance.now(),
        duration: tone === "invalid" ? 2100 : 1600,
      };
      liveRegion.textContent = toast.message;
      invalidateBoardFrame();
    }

    function clearSelectionPrompt() {
      if (toast && toast.purpose === "selection-prompt") toast = null;
    }

    function cancelSelection() {
      selection = null;
      drag = null;
      pointerDown = null;
      clearSelectionPrompt();
      invalidateBoardFrame();
    }

    function activateTarget(hit, state) {
      if (!selection) return false;
      const target = targetFromHit(hit);
      if (!isTargetAllowed(target, selection, state)) {
        /*
         * Send guard-blocked enemy targets through the rules engine.  The legal
         * highlight stays red, but the user now receives the authoritative
         * blockedByGuard/action:invalid cue instead of a dead click.
         */
        if (isGuardBlockedAttackTarget(target, selection, state)) {
          fireAction({ type: "ATTACK", attackerIndex: selection.index, target });
          cancelSelection();
          return true;
        }
        return false;
      }
      if (selection.kind === "commander-power") {
        fireAction({
          type: "USE_COMMANDER_POWER",
          commanderId: selection.commanderId,
          target,
        });
      } else if (selection.kind === "hand") {
        if (!canArmHandSelection(state)) {
          showToast(state.turn !== "player" ? "상대의 턴입니다." : "지금은 카드를 사용할 수 없습니다.", "invalid");
          cancelSelection();
          return true;
        }
        fireAction({ type: "PLAY_CARD", handIndex: selection.index, target });
      } else if (selection.kind === "attacker") {
        fireAction({ type: "ATTACK", attackerIndex: selection.index, target });
      }
      cancelSelection();
      return true;
    }

    function activateHit(hit, state) {
      if (!hit || !state) return;
      if (hit.type === "inspection-panel") return;
      if (hit.type === "inspection-close") {
        closeInspection(true);
        return;
      }
      const handCardBeforeInspection = hit.type === "hand-card"
        ? (state.hands && state.hands.player || [])[hit.data.index]
        : null;
      const wasAlreadyInspected = Boolean(
        handCardBeforeInspection && isInspectionCard(handCardBeforeInspection),
      );
      if (isPresentationLocked(performance.now())) {
        if (hit.type === "hand-card" || hit.type === "board-card") {
          openInspection(hit, state);
          return;
        }
        if (!["mute", "concede", "restart"].includes(hit.type)) {
          showToast("전투 연출 중입니다.", "normal");
          cancelSelection();
          return;
        }
      }
      if (hit.type === "hand-card" || hit.type === "board-card") openInspection(hit, state);
      if (selection && activateTarget(hit, state)) return;

      if (hit.type === "end-turn") {
        if (state.phase === "playing" && state.turn === "player") {
          fireAction({ type: "END_TURN" });
          cancelSelection();
        }
        return;
      }
      if (hit.type === "mute") {
        mutedHint = !mutedHint;
        fireAction({ type: "TOGGLE_MUTE" });
        showToast(mutedHint ? "효과음 끔" : "효과음 켬", "normal");
        return;
      }
      if (hit.type === "concede") {
        fireAction({ type: "CONCEDE" });
        cancelSelection();
        return;
      }
      if (hit.type === "restart") {
        fireAction({ type: "RESTART" });
        cancelSelection();
        return;
      }
      if (hit.type === "commander-power") {
        const commander = commanderPresentationFor(state, "player");
        const status = commanderPowerVisualState(state, "player");
        if (commander.id === "nomad" && status === "ready") {
          selection = {
            kind: "commander-power",
            commanderId: commander.id,
          };
          showToast(
            "공격을 봉쇄할 적 장수를 선택하세요.",
            "normal",
            "selection-prompt",
          );
        } else {
          fireAction({
            type: "USE_COMMANDER_POWER",
            commanderId: commander.id,
          });
          cancelSelection();
        }
        return;
      }
      if (hit.type === "hand-card") {
        const card = handCardBeforeInspection;
        const playable = canSelectHand(card, state);
        const repeatedHandClick = Boolean(
          selection
          && selection.kind === "hand"
          && selection.index === hit.data.index,
        );
        if (wasAlreadyInspected && !playable) {
          /*
           * A second click is an explicit play attempt.  Let the rules engine
           * report the authoritative reason (mana, board space, turn, etc.).
           * Targeted cards intentionally omit a target here because those
           * resource checks run before target validation.
           */
          fireAction({ type: "PLAY_CARD", handIndex: hit.data.index });
          cancelSelection();
        } else if (repeatedHandClick) {
          if (!canArmHandSelection(state)) {
            showToast(state.turn !== "player" ? "상대의 턴입니다." : "지금은 카드를 사용할 수 없습니다.", "invalid");
            cancelSelection();
            return;
          }
          if (cardTargetKind(card) === "none") {
            fireAction({ type: "PLAY_CARD", handIndex: hit.data.index });
            cancelSelection();
          } else {
            showToast("빛나는 대상에 카드를 사용하세요.", "normal", "selection-prompt");
          }
        } else if (playable) {
          selection = { kind: "hand", index: hit.data.index };
          showToast(
            cardTargetKind(card) !== "none"
              ? "사용할 대상을 선택"
              : "전장에 놓거나 다시 눌러 사용",
            "normal",
            "selection-prompt",
          );
        } else {
          cancelSelection();
          showToast("카드 상세", "normal");
        }
        return;
      }
      if (hit.type === "board-card" && hit.data.side === "player") {
        const minion = (state.boards && state.boards.player || [])[hit.data.index];
        if (canSelectAttacker(minion, state)) {
          selection = selection
            && selection.kind === "attacker"
            && selection.index === hit.data.index
            ? null
            : { kind: "attacker", index: hit.data.index };
          if (selection) showToast("공격할 적을 선택하세요.", "normal", "selection-prompt");
          else clearSelectionPrompt();
        }
        return;
      }
      if (hit.type === "play-zone" && selection && selection.kind === "hand") {
        const card = (state.hands && state.hands.player || [])[selection.index];
        if (cardTargetKind(card) === "none") {
          fireAction({ type: "PLAY_CARD", handIndex: selection.index });
          cancelSelection();
        }
      }
    }

    function onPointerDown(event) {
      if (destroyed || event.button > 0) return;
      invalidateBoardFrame();
      requestAudioUnlock();
      canvas.focus({ preventScroll: true });
      pointer = pointFromEvent(event);
      const hit = hitAt(pointer);
      const state = stateNow();
      pointerDown = { point: pointer, hit, id: event.pointerId };
      startVisualPress(hit, state, performance.now());
      if (
        !isPresentationLocked(performance.now())
        && hit
        && (hit.type === "hand-card" || (hit.type === "board-card" && hit.data.side === "player"))
      ) {
        drag = {
          active: false,
          source: hit.type === "hand-card"
            ? { kind: "hand", index: hit.data.index }
            : { kind: "attacker", index: hit.data.index },
          x: pointer.x,
          y: pointer.y,
        };
      }
      if (canvas.setPointerCapture && event.pointerId !== undefined) {
        try { canvas.setPointerCapture(event.pointerId); } catch {}
      }
      event.preventDefault();
    }

    function onPointerMove(event) {
      if (destroyed) return;
      invalidateBoardFrame();
      const nextPointer = pointFromEvent(event);
      const moved = pointerActuallyMoved(pointer, nextPointer);
      pointer = nextPointer;
      if (moved) passiveHandHoverBlocked = false;
      if (pointerDown && drag) {
        const distance = Math.hypot(pointer.x - pointerDown.point.x, pointer.y - pointerDown.point.y);
        if (distance > 7) {
          const state = stateNow();
          if (state && (
            (drag.source.kind === "hand" && canArmHandSelection(state))
            || (drag.source.kind === "attacker" && canSelectAttacker((state.boards.player || [])[drag.source.index], state))
          )) {
            drag.active = true;
            selection = drag.source;
          }
        }
        drag.x = pointer.x;
        drag.y = pointer.y;
      }
      const pointerHover = hitAt(pointer);
      hoverHit = passiveHandHoverBlocked
        && !moved
        && pointerHover
        && pointerHover.type === "hand-card"
        ? null
        : pointerHover;
      hoverInputSource = hoverHit ? "pointer" : "none";
      canvas.style.cursor = hoverHit && ["hand-card", "board-card", "hero", "commander-power", "end-turn", "mute", "concede", "restart", "inspection-close"].includes(hoverHit.type)
        ? "pointer"
        : "default";
      event.preventDefault();
    }

    function onPointerUp(event) {
      if (destroyed) return;
      invalidateBoardFrame();
      pointer = pointFromEvent(event);
      const state = stateNow();
      const releaseHit = hitAt(pointer);
      if (drag && drag.active) {
        if (activateTarget(releaseHit, state)) {
          // handled
        } else if (drag.source.kind === "hand") {
          const card = (state.hands && state.hands.player || [])[drag.source.index];
          if (cardTargetKind(card) === "none" && pointer.y > 332 && pointer.y < 548 && pointer.x > 240 && pointer.x < 1120) {
            fireAction({ type: "PLAY_CARD", handIndex: drag.source.index });
            cancelSelection();
          } else {
            showToast(cardTargetKind(card) === "none" ? "카드를 전장 위에 놓으세요." : "유효한 대상을 선택하세요.", "invalid");
          }
        } else {
          showToast("공격 가능한 대상을 선택하세요.", "invalid");
        }
      } else if (pointerDown && pointerDown.hit && hitContains(pointerDown.hit, pointer)) {
        activateHit(pointerDown.hit, state);
      }
      pointerDown = null;
      drag = null;
      if (canvas.releasePointerCapture && event.pointerId !== undefined) {
        try { canvas.releasePointerCapture(event.pointerId); } catch {}
      }
      event.preventDefault();
    }

    function interactiveHits() {
      const state = stateNow();
      if (state && state.phase === "ended") {
        return hits.filter((hit) => hit.type === "restart");
      }
      return hits.filter((hit) => {
        if (["end-turn", "mute", "concede", "restart", "hand-card", "commander-power", "inspection-close"].includes(hit.type)) return true;
        if (hit.type === "board-card") return true;
        if (selection && targetFromHit(hit)) return isTargetAllowed(targetFromHit(hit), selection, stateNow());
        return false;
      });
    }

    function describeHit(hit, state) {
      if (!hit) return "";
      if (hit.type === "end-turn") return "턴 종료";
      if (hit.type === "mute") return "효과음 전환";
      if (hit.type === "concede") return "항복";
      if (hit.type === "restart") return "다시 대전";
      if (hit.type === "commander-power") {
        const commander = commanderPresentationFor(state, "player");
        const status = commanderPowerVisualState(state, "player");
        const statusText = status === "ready"
          ? "사용 가능"
          : status === "mana"
            ? "마나 부족"
            : status === "unavailable"
              ? "체력이 가득 참"
              : "이번 턴 사용 완료";
        return `${commander.name} 지휘관 능력 ${commander.powerName}, 비용 ${commander.powerCost}, ${commander.powerText}, ${statusText}`;
      }
      if (hit.type === "hero") return `${hit.data.side === "player" ? "아군" : "적"} 영웅`;
      if (hit.type === "hand-card") {
        const card = (state.hands && state.hands.player || [])[hit.data.index];
        return `손패 ${getCardValue(card, "name", "카드")}, 비용 ${getCardValue(card, "cost", 0)}`;
      }
      if (hit.type === "board-card") {
        const minion = (state.boards && state.boards[hit.data.side] || [])[hit.data.index];
        return `${hit.data.side === "player" ? "아군" : "적"} ${getCardValue(minion, "name", "장수")}`;
      }
      return "";
    }

    function onKeyDown(event) {
      if (destroyed) return;
      invalidateBoardFrame();
      const state = stateNow();
      if (!state) return;
      if (event.key === "m" || event.key === "M") {
        mutedHint = !mutedHint;
        fireAction({ type: "TOGGLE_MUTE" });
        showToast(mutedHint ? "효과음 끔" : "효과음 켬", "normal");
        event.preventDefault();
        return;
      }
      if (event.key === "Escape") {
        if (inspection) closeInspection(true);
        else {
          cancelSelection();
          showToast("선택을 취소했습니다.", "normal");
        }
        event.preventDefault();
        return;
      }
      const controls = interactiveHits();
      if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
        keyboardIndex = (keyboardIndex - 1 + Math.max(1, controls.length)) % Math.max(1, controls.length);
        hoverHit = controls[keyboardIndex] || null;
        hoverInputSource = hoverHit ? "keyboard" : "none";
        liveRegion.textContent = describeHit(hoverHit, state);
        event.preventDefault();
      } else if (["ArrowRight", "ArrowDown", "Tab"].includes(event.key)) {
        keyboardIndex = (keyboardIndex + 1) % Math.max(1, controls.length);
        hoverHit = controls[keyboardIndex] || null;
        hoverInputSource = hoverHit ? "keyboard" : "none";
        liveRegion.textContent = describeHit(hoverHit, state);
        event.preventDefault();
      } else if (event.key === "Enter" || event.key === " ") {
        activateHit(hoverHit || controls[keyboardIndex] || controls[0], state);
        event.preventDefault();
      }
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());

    function drawPanel(x, y, width, height, options) {
      const panel = options || {};
      ctx.save();
      ctx.shadowColor = panel.shadow || "rgba(0,0,0,.55)";
      ctx.shadowBlur = panel.shadowBlur === undefined ? 14 : panel.shadowBlur;
      ctx.shadowOffsetY = 4;
      roundedRect(ctx, x, y, width, height, panel.radius || 12);
      const fill = ctx.createLinearGradient(x, y, x, y + height);
      fill.addColorStop(0, panel.top || "rgba(50,34,20,.94)");
      fill.addColorStop(1, panel.bottom || "rgba(16,13,10,.96)");
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = panel.lineWidth || 2;
      ctx.strokeStyle = panel.border || "#9b7139";
      ctx.stroke();
      ctx.globalAlpha = 0.3;
      roundedRect(ctx, x + 4, y + 4, width - 8, height - 8, Math.max(3, (panel.radius || 12) - 4));
      ctx.strokeStyle = panel.inner || "#f0d08a";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    function drawTitle() {
      ctx.save();
      const x = 54;
      const y = 48;
      drawCenteredText(ctx, "赤壁傳說", x + 88, y + 18, {
        font: `900 24px ${SYSTEM_FONT}`,
        color: COLORS.brightGold,
        shadow: "#050000",
        shadowBlur: 6,
      });
      drawCenteredText(ctx, "적 벽 전 설", x + 88, y + 43, {
        font: `800 13px ${SYSTEM_FONT}`,
        color: "#efe0b8",
      });
      ctx.strokeStyle = "#d7aa5e";
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.moveTo(x, y + 31);
      ctx.lineTo(x + 30, y + 31);
      ctx.moveTo(x + 146, y + 31);
      ctx.lineTo(x + 176, y + 31);
      ctx.stroke();
      ctx.restore();
    }

    function drawCardBack(cx, cy, width, height, angle, alpha) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle || 0);
      ctx.globalAlpha = alpha === undefined ? 1 : alpha;
      ctx.shadowColor = "rgba(0,0,0,.55)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
      roundedRect(ctx, -width / 2, -height / 2, width, height, width * 0.08);
      const outer = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
      outer.addColorStop(0, "#362015");
      outer.addColorStop(0.5, "#b17b3d");
      outer.addColorStop(1, "#2b1710");
      ctx.fillStyle = outer;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(2, width * 0.035);
      ctx.strokeStyle = "#e1bd6e";
      ctx.stroke();
      roundedRect(ctx, -width * 0.4, -height * 0.42, width * 0.8, height * 0.84, width * 0.05);
      ctx.fillStyle = "#203d38";
      ctx.fill();
      ctx.strokeStyle = "#805d31";
      ctx.lineWidth = Math.max(1, width * 0.02);
      ctx.stroke();
      ctx.globalAlpha *= 0.28;
      ctx.strokeStyle = "#f6dc98";
      for (let index = -3; index <= 3; index += 1) {
        ctx.beginPath();
        ctx.moveTo(-width * 0.34, index * height * 0.1);
        ctx.lineTo(width * 0.34, -index * height * 0.1);
        ctx.stroke();
      }
      ctx.globalAlpha = alpha === undefined ? 1 : alpha;
      drawSeal(ctx, 0, 0, width * 0.48, "戰", {
        primary: "#8c302a",
        secondary: "#ddb761",
      });
      ctx.restore();
    }

    function drawRandomRuleMarker(markerX, markerY, radius) {
      ctx.save();
      ctx.translate(markerX, markerY);
      ctx.rotate(-0.12);
      ctx.shadowColor = "#d995ff";
      ctx.shadowBlur = 7;
      roundedRect(ctx, -radius, -radius, radius * 2, radius * 2, radius * 0.34);
      const dieFill = ctx.createLinearGradient(-radius, -radius, radius, radius);
      dieFill.addColorStop(0, "#874fa2");
      dieFill.addColorStop(1, "#3d265d");
      ctx.fillStyle = dieFill;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#f3d783";
      ctx.lineWidth = Math.max(1.2, radius * 0.14);
      ctx.stroke();
      ctx.fillStyle = "#fff1be";
      const pip = Math.max(1.35, radius * 0.16);
      [[-0.43, -0.43], [0, 0], [0.43, 0.43]].forEach((point) => {
        ellipsePath(ctx, point[0] * radius, point[1] * radius, pip, pip);
        ctx.fill();
      });
      ctx.restore();
    }

    function drawGuardStatus(markerX, markerY, radius) {
      ctx.save();
      ctx.translate(markerX, markerY);
      ctx.shadowColor = "rgba(14,9,5,.76)";
      ctx.shadowBlur = Math.max(2, radius * 0.28);

      // Warm stone battlements and a black gate use a horizontal, architectural
      // silhouette. The shield marker below stays a cool vertical diamond, so
      // the two defensive rules remain distinguishable without text.
      const stone = ctx.createLinearGradient(-radius, -radius, radius, radius);
      stone.addColorStop(0, "#d8b778");
      stone.addColorStop(0.48, "#8b633c");
      stone.addColorStop(1, "#4a3224");
      ctx.beginPath();
      ctx.moveTo(-radius, radius * 0.72);
      ctx.lineTo(-radius, -radius * 0.42);
      ctx.lineTo(-radius * 0.68, -radius * 0.42);
      ctx.lineTo(-radius * 0.68, -radius * 0.78);
      ctx.lineTo(-radius * 0.24, -radius * 0.78);
      ctx.lineTo(-radius * 0.24, -radius * 0.42);
      ctx.lineTo(radius * 0.24, -radius * 0.42);
      ctx.lineTo(radius * 0.24, -radius * 0.78);
      ctx.lineTo(radius * 0.68, -radius * 0.78);
      ctx.lineTo(radius * 0.68, -radius * 0.42);
      ctx.lineTo(radius, -radius * 0.42);
      ctx.lineTo(radius, radius * 0.72);
      ctx.closePath();
      ctx.fillStyle = stone;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#f3dfae";
      ctx.lineWidth = Math.max(1, radius * 0.12);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-radius * 0.42, radius * 0.72);
      ctx.lineTo(-radius * 0.42, radius * 0.22);
      ctx.quadraticCurveTo(0, -radius * 0.42, radius * 0.42, radius * 0.22);
      ctx.lineTo(radius * 0.42, radius * 0.72);
      ctx.closePath();
      ctx.fillStyle = "#17130f";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,224,169,.44)";
      ctx.lineWidth = Math.max(0.7, radius * 0.07);
      ctx.beginPath();
      ctx.moveTo(-radius * 0.72, -radius * 0.16);
      ctx.lineTo(radius * 0.72, -radius * 0.16);
      ctx.moveTo(-radius * 0.72, radius * 0.28);
      ctx.lineTo(-radius * 0.42, radius * 0.28);
      ctx.moveTo(radius * 0.42, radius * 0.28);
      ctx.lineTo(radius * 0.72, radius * 0.28);
      ctx.stroke();
      ctx.restore();
    }

    function drawShieldStatus(markerX, markerY, radius, state) {
      if (state === "none") return;
      const active = state === "active";
      ctx.save();
      ctx.translate(markerX, markerY);
      ctx.shadowColor = active ? "#84dfff" : "rgba(24,27,29,.7)";
      ctx.shadowBlur = active ? 9 : 2;
      ctx.beginPath();
      ctx.moveTo(0, -radius);
      ctx.lineTo(radius * 0.76, -radius * 0.55);
      ctx.lineTo(radius * 0.62, radius * 0.45);
      ctx.lineTo(0, radius);
      ctx.lineTo(-radius * 0.62, radius * 0.45);
      ctx.lineTo(-radius * 0.76, -radius * 0.55);
      ctx.closePath();
      ctx.fillStyle = active ? "#4b9dc4" : "#52565a";
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = active ? "#e9fbff" : "#a2a6a7";
      ctx.lineWidth = Math.max(1.3, radius * 0.14);
      ctx.stroke();
      if (active) {
        ctx.strokeStyle = "rgba(255,255,255,.72)";
        ctx.lineWidth = Math.max(1, radius * 0.08);
        ctx.beginPath();
        ctx.moveTo(-radius * 0.34, -radius * 0.5);
        ctx.quadraticCurveTo(-radius * 0.08, -radius * 0.72, radius * 0.28, -radius * 0.42);
        ctx.stroke();
      } else {
        ctx.strokeStyle = "#d5d7d7";
        ctx.lineWidth = Math.max(1.4, radius * 0.16);
        ctx.beginPath();
        ctx.moveTo(-radius * 0.52, -radius * 0.6);
        ctx.lineTo(radius * 0.52, radius * 0.62);
        ctx.stroke();
        ctx.strokeStyle = "#2c3033";
        ctx.lineWidth = Math.max(1, radius * 0.1);
        ctx.beginPath();
        ctx.moveTo(radius * 0.12, -radius * 0.52);
        ctx.lineTo(-radius * 0.08, -radius * 0.05);
        ctx.lineTo(radius * 0.18, radius * 0.12);
        ctx.lineTo(-radius * 0.08, radius * 0.54);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawSmallAbilityLine(line, centerX, lineY, fontSize) {
      const segments = String(line).split(/(무작위)/g).filter(Boolean);
      const widths = segments.map((segment) => {
        ctx.font = `${segment === "무작위" ? 900 : 700} ${fontSize}px ${UI_FONT}`;
        return ctx.measureText(segment).width;
      });
      let segmentX = centerX - widths.reduce((sum, value) => sum + value, 0) / 2;
      ctx.textAlign = "left";
      segments.forEach((segment, index) => {
        const random = segment === "무작위";
        ctx.font = `${random ? 900 : 700} ${fontSize}px ${UI_FONT}`;
        ctx.fillStyle = random ? "#7b2f78" : "#2a2018";
        ctx.fillText(segment, segmentX, lineY);
        segmentX += widths[index];
      });
      ctx.textAlign = "center";
    }

    function drawCardFrame(card, x, y, width, height, options) {
      const configCard = options || {};
      const style = getFactionStyle(card);
      const scale = width / 116;
      const selectedCard = Boolean(configCard.selected);
      const disabled = Boolean(configCard.disabled);
      const glow = configCard.glow || style.glow;
      const shieldState = shieldVisualState(card);
      const randomRule = hasRandomRule(card);

      ctx.save();
      ctx.globalAlpha = disabled ? 0.62 : 1;
      ctx.shadowColor = selectedCard ? glow : "rgba(0,0,0,.62)";
      ctx.shadowBlur = selectedCard ? 19 : 9;
      ctx.shadowOffsetY = selectedCard ? 0 : 5;
      roundedRect(ctx, x, y, width, height, width * 0.075);
      const frame = ctx.createLinearGradient(x, y, x + width, y + height);
      frame.addColorStop(0, style.secondary);
      frame.addColorStop(0.16, "#6b4928");
      frame.addColorStop(0.52, "#d4af63");
      frame.addColorStop(0.72, "#5a3a22");
      frame.addColorStop(1, style.primary);
      ctx.fillStyle = frame;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(1.5, 2.2 * scale);
      ctx.strokeStyle = selectedCard ? "#fff2b3" : "#2c190e";
      ctx.stroke();

      roundedRect(ctx, x + 6 * scale, y + 7 * scale, width - 12 * scale, height - 14 * scale, width * 0.05);
      ctx.fillStyle = "#c9ae72";
      ctx.fill();
      ctx.strokeStyle = "#4a2b16";
      ctx.lineWidth = Math.max(1, 1.4 * scale);
      ctx.stroke();

      const artY = y + 26 * scale;
      const artHeight = height * (configCard.compact ? 0.58 : configCard.preview ? 0.52 : 0.4);
      const portraitBucket = configCard.compact
        ? "BOARD"
        : configCard.preview
          ? "DETAIL"
          : "HAND";
      drawPortrait(
        ctx,
        x + 10 * scale,
        artY,
        width - 20 * scale,
        artHeight,
        card,
        Boolean(configCard.compact),
        portraitBucket,
      );
      ctx.strokeStyle = style.secondary;
      ctx.lineWidth = Math.max(1.2, 2 * scale);
      roundedRect(ctx, x + 10 * scale, artY, width - 20 * scale, artHeight, 4 * scale);
      ctx.stroke();
      const highlightMix = clamp(Number(configCard.highlightMix) || 0, 0, 1);
      if (highlightMix > 0.001) {
        const sweep = clamp(Number(configCard.highlightSweep) || 0.5, 0, 1);
        const sweepX = x + width * sweep;
        ctx.save();
        roundedRect(ctx, x + 10 * scale, artY, width - 20 * scale, artHeight, 4 * scale);
        ctx.clip();
        ctx.globalCompositeOperation = "screen";
        const artSweep = ctx.createLinearGradient(
          sweepX - width * 0.22,
          artY,
          sweepX + width * 0.22,
          artY + artHeight,
        );
        artSweep.addColorStop(0, "rgba(255,241,190,0)");
        artSweep.addColorStop(0.48, colorWithAlpha(style.glow, highlightMix * 0.18));
        artSweep.addColorStop(0.52, `rgba(255,248,218,${highlightMix * 0.36})`);
        artSweep.addColorStop(1, "rgba(255,241,190,0)");
        ctx.fillStyle = artSweep;
        ctx.fillRect(x + 10 * scale, artY, width - 20 * scale, artHeight);
        ctx.restore();

        ctx.save();
        const frameSweep = ctx.createLinearGradient(x, y, x + width, y + height);
        const bandStart = clamp(sweep - 0.24, 0, 0.998);
        const bandPeak = clamp(sweep, bandStart + 0.001, 0.999);
        const bandEnd = clamp(sweep + 0.24, bandPeak + 0.001, 1);
        frameSweep.addColorStop(0, "rgba(255,238,177,0)");
        frameSweep.addColorStop(bandStart, "rgba(255,238,177,0)");
        frameSweep.addColorStop(bandPeak, `rgba(255,246,210,${highlightMix * 0.82})`);
        frameSweep.addColorStop(bandEnd, "rgba(255,238,177,0)");
        frameSweep.addColorStop(1, "rgba(255,238,177,0)");
        ctx.strokeStyle = frameSweep;
        ctx.lineWidth = Math.max(1.2, 2.6 * scale);
        roundedRect(ctx, x + 1.5 * scale, y + 1.5 * scale, width - 3 * scale, height - 3 * scale, width * 0.07);
        ctx.stroke();
        ctx.restore();
      }

      const nameY = artY + artHeight + 12 * scale;
      const namePlate = ctx.createLinearGradient(x, nameY - 12 * scale, x + width, nameY + 10 * scale);
      namePlate.addColorStop(0, "#3a2416");
      namePlate.addColorStop(0.5, style.primary);
      namePlate.addColorStop(1, "#2b1a12");
      ctx.fillStyle = namePlate;
      roundedRect(ctx, x + 9 * scale, nameY - 11 * scale, width - 18 * scale, 23 * scale, 6 * scale);
      ctx.fill();
      ctx.strokeStyle = style.secondary;
      ctx.lineWidth = Math.max(1, 1.2 * scale);
      ctx.stroke();
      drawCenteredText(ctx, getCardValue(card, "name", "이름 없는 장수"), x + width / 2, nameY + 0.5 * scale, {
        font: `900 ${Math.max(10, Math.round(13 * scale))}px ${SYSTEM_FONT}`,
        color: "#fff4ce",
        stroke: "#21120b",
        strokeWidth: Math.max(1.5, 2 * scale),
      });

      if (!configCard.compact) {
        const textTop = nameY + 17 * scale;
        const statsClearance = configCard.preview ? 25 * scale : 28 * scale;
        const textHeight = Math.max(12 * scale, y + height - statsClearance - textTop);
        roundedRect(ctx, x + 10 * scale, textTop, width - 20 * scale, textHeight, 5 * scale);
        ctx.fillStyle = "#ead9ae";
        ctx.fill();
        ctx.strokeStyle = colorWithAlpha("#5b371c", 0.7);
        ctx.stroke();
        ctx.save();
        roundedRect(ctx, x + 12 * scale, textTop + 2 * scale, width - 24 * scale, Math.max(1, textHeight - 4 * scale), 3 * scale);
        ctx.clip();
        const copyFontSize = Math.max(8, Math.round((configCard.preview ? 9.2 : 10.4) * scale));
        ctx.fillStyle = "#2a2018";
        ctx.font = `${configCard.preview ? 700 : 900} ${copyFontSize}px ${UI_FONT}`;
        ctx.textAlign = "center";
        if (configCard.preview) {
          ctx.textBaseline = "top";
          const cardCopy = displayCardText(card, false);
          const lines = semanticTextLines(ctx, cardCopy, width - 30 * scale, 6);
          const lineHeight = Math.max(9, 11.5 * scale);
          lines.forEach((line, index) => {
            drawSmallAbilityLine(line, x + width / 2, textTop + 4 * scale + index * lineHeight, copyFontSize);
          });
        } else {
          ctx.textBaseline = "middle";
          drawCenteredText(ctx, cardTacticalLabel(card), x + width / 2, textTop + textHeight / 2, {
            font: `900 ${copyFontSize}px ${UI_FONT}`,
            color: "#3d2718",
            stroke: "rgba(255,247,220,.72)",
            strokeWidth: Math.max(0.8, 1.1 * scale),
          });
        }
        ctx.restore();
      }

      drawGem(
        ctx,
        x + 9 * scale,
        y + 9 * scale,
        Math.max(10, 13 * scale),
        getCardValue(card, "currentCost", getCardValue(card, "cost", 0)),
        "#3974c3",
        selectedCard ? 0.8 : 0,
      );

      const attack = getCardValue(card, "currentAttack", getCardValue(card, "attack", 0));
      const health = getCardValue(card, "currentHealth", getCardValue(card, "health", 0));
      drawGem(ctx, x + 10 * scale, y + height - 9 * scale, Math.max(10, 12.5 * scale), attack, COLORS.attack, 0);
      drawGem(ctx, x + width - 10 * scale, y + height - 9 * scale, Math.max(10, 12.5 * scale), health, COLORS.health, 0);
      drawSeal(ctx, x + width - 12 * scale, y + 12 * scale, Math.max(15, 19 * scale), style.mark, style);

      if (getCardValue(card, "guard", false) || (getCardValue(card, "keywords", []) || []).includes("수호")) {
        drawGuardStatus(
          x + width / 2,
          y + height - 11 * scale,
          Math.max(8, 10 * scale),
        );
      }
      if (shieldState === "active") {
        ctx.save();
        ctx.strokeStyle = "#eaf8ff";
        ctx.shadowColor = "#86d8ff";
        ctx.shadowBlur = 11;
        ctx.lineWidth = Math.max(2, 2.5 * scale);
        roundedRect(ctx, x - 3 * scale, y - 3 * scale, width + 6 * scale, height + 6 * scale, width * 0.1);
        ctx.stroke();
        ctx.restore();
      }
      if (randomRule) {
        drawRandomRuleMarker(x + 7 * scale, y + height * 0.55, Math.max(8, 9.5 * scale));
      }
      drawShieldStatus(
        x + width - 7 * scale,
        y + height * 0.55,
        Math.max(8, 9.5 * scale),
        shieldState,
      );
      ctx.restore();
    }

    function drawBoardSlots(side, board, now, interactionBoard) {
      const count = board.length;
      const width = 124;
      const height = 148;
      const targetY = side === "ai" ? 178 : 397;
      const state = stateNow();
      const actualBoard = Array.isArray(interactionBoard) ? interactionBoard : board;

      if (count === 0) {
        ctx.save();
        ctx.globalAlpha = 0.13;
        ctx.strokeStyle = "#ddcd91";
        ctx.setLineDash([5, 8]);
        ctx.lineWidth = 1.5;
        roundedRect(ctx, LOGICAL_WIDTH / 2 - 62, targetY, 124, height, 12);
        ctx.stroke();
        ctx.restore();
      }

      board.forEach((minion, index) => {
        const key = `${side}:${minion.instanceId || getCardValue(minion, "id", index)}`;
        const slot = boardSlotGeometry(side, count, index);
        const targetX = slot.x;
        const current = positions.get(key) || {
          x: targetX,
          y: side === "ai" ? 105 : 580,
          createdAt: now,
        };
        const motion = reducedMotionQuery.matches ? 1 : 0.17;
        current.x = lerp(current.x, targetX, motion);
        current.y = lerp(current.y, targetY, motion);
        positions.set(key, current);

        const actualIndex = actualBoard.findIndex((candidate, candidateIndex) => (
          candidate
          && minion
          && (
            (candidate.instanceId && candidate.instanceId === minion.instanceId)
            || (!candidate.instanceId && !minion.instanceId && candidateIndex === index)
          )
        ));
        const actualMinion = actualIndex >= 0 ? actualBoard[actualIndex] : null;
        const inspectedCard = isInspectionCard(minion);
        const isSelected = Boolean(selection && selection.kind === "attacker" && selection.index === actualIndex && side === "player") || inspectedCard;
        const target = actualIndex >= 0 ? { zone: "board", side, index: actualIndex } : null;
        const isTarget = Boolean(target && selection && isTargetAllowed(target, selection, state));
        const canAttack = Boolean(actualMinion && canSelectAttacker(actualMinion, state) && side === "player");
        const hover = hoverHit
          && hoverHit.type === "board-card"
          && hoverHit.data.side === side
          && hoverHit.data.index === actualIndex;
        const bob = canAttack && !reducedMotionQuery.matches ? Math.sin(now * 0.004 + index) * 1.8 : 0;
        const x = current.x;
        const y = current.y + bob - (hover ? 4 : 0);
        const instancePressId = String(getCardValue(minion, "instanceId", "") || key);
        const cardPressScale = currentVisualPressScale(`card:${instancePressId}`, now);

        ctx.save();
        ctx.translate(x + width / 2, y + height / 2);
        ctx.scale(cardPressScale, cardPressScale);
        ctx.translate(-(x + width / 2), -(y + height / 2));
        if (canAttack || isTarget || isSelected) {
          ctx.save();
          ctx.shadowColor = isTarget ? "#ff594c" : "#f8d46d";
          ctx.shadowBlur = isTarget ? 24 : 18;
          ctx.strokeStyle = isTarget ? "#ff8c6f" : "#ffe59a";
          ctx.lineWidth = isTarget ? 4 : 3;
          roundedRect(ctx, x - 4, y - 4, width + 8, height + 8, 13);
          ctx.stroke();
          ctx.restore();
        }
        drawCardFrame(minion, x, y, width, height, {
          compact: true,
          selected: isSelected,
          disabled: side === "player" && !canAttack && state.turn === "player",
          glow: isTarget ? "#ff6a52" : undefined,
        });
        ctx.restore();
        if (actualIndex >= 0) addHit("board-card", x, y, width, height, { side, index: actualIndex, key });
      });
    }

    function drawBattlefieldEnvironment(now) {
      const motionTime = reducedMotionQuery.matches ? 0 : now;
      const parallax = tabletopParallaxOffset(pointer, reducedMotionQuery.matches);
      ctx.save();

      // Cached depth planes remain below cards and never register hit regions.
      ctx.globalAlpha = 0.84;
      ctx.drawImage(tabletopDepth.mapRelief, parallax.x, parallax.y);
      ctx.globalAlpha = reducedMotionQuery.matches
        ? 0.5
        : 0.46 + Math.sin(motionTime * 0.0031) * 0.035;
      ctx.drawImage(tabletopDepth.warmGlow, 0, 0);
      ctx.globalAlpha = parallax.sheen;
      ctx.drawImage(
        tabletopDepth.directionalSheen,
        -parallax.x * 1.7,
        -parallax.y * 1.4,
      );
      ctx.globalAlpha = 1;

      // The Red Cliffs river stays below gameplay contrast but never feels dead.
      ctx.lineCap = "round";
      for (let index = 0; index < environmentActors.ripples.length; index += 1) {
        const ripple = environmentActors.ripples[index];
        const wave = Math.sin(motionTime * 0.0012 + ripple.phase);
        ctx.globalAlpha = 0.055 + (wave + 1) * 0.018;
        ctx.strokeStyle = index % 2 ? "#b7e0d5" : "#5ba498";
        ctx.lineWidth = index % 3 === 0 ? 1.7 : 1;
        ctx.beginPath();
        ctx.moveTo(ripple.x - ripple.width * 0.5, ripple.y + wave * 2.2);
        ctx.bezierCurveTo(
          ripple.x - ripple.width * 0.15,
          ripple.y - 3.5,
          ripple.x + ripple.width * 0.14,
          ripple.y + 3.5,
          ripple.x + ripple.width * 0.5,
          ripple.y - wave * 1.8,
        );
        ctx.stroke();
      }

      // Edge braziers: smoke is intentionally outside card text lanes.
      for (let index = 0; index < environmentActors.smoke.length; index += 1) {
        const plume = environmentActors.smoke[index];
        const drift = Math.sin(motionTime * 0.00072 + plume.phase) * 5;
        const rise = reducedMotionQuery.matches ? 0 : (motionTime * 0.008 + index * 7) % 18;
        ctx.globalAlpha = 0.04 + index % 2 * 0.016;
        ctx.fillStyle = "#c8d0c7";
        ctx.beginPath();
        ctx.arc(plume.x + drift, plume.y - rise, plume.radius + rise * 0.18, 0, TAU);
        ctx.fill();
      }

      // Lanterns mark the near plane and give each side a living camp.
      for (let index = 0; index < environmentActors.lanterns.length; index += 1) {
        const lantern = environmentActors.lanterns[index];
        const flicker = reducedMotionQuery.matches
          ? 0.62
          : 0.56 + Math.sin(motionTime * 0.0045 + lantern.phase) * 0.08;
        ctx.globalAlpha = flicker * 0.28;
        ctx.fillStyle = "#ff9c45";
        ctx.beginPath();
        ctx.arc(lantern.x, lantern.y, 13, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = "#6f251d";
        roundedRect(ctx, lantern.x - 5, lantern.y - 8, 10, 16, 2);
        ctx.fill();
        ctx.fillStyle = "#ffd070";
        roundedRect(ctx, lantern.x - 3, lantern.y - 5, 6, 10, 1);
        ctx.fill();
      }

      // Command flags remain at the extreme sides; only their free edge sways.
      const flagSway = reducedMotionQuery.matches ? 0 : Math.sin(motionTime * 0.00105) * 4;
      ctx.globalAlpha = 0.42;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ab8150";
      ctx.beginPath();
      ctx.moveTo(92, 184);
      ctx.lineTo(92, 318);
      ctx.moveTo(1272, 198);
      ctx.lineTo(1272, 332);
      ctx.stroke();
      ctx.fillStyle = "#28584b";
      ctx.beginPath();
      ctx.moveTo(94, 193);
      ctx.quadraticCurveTo(130, 202 + flagSway, 158, 192 + flagSway);
      ctx.lineTo(151, 236 + flagSway * 0.35);
      ctx.quadraticCurveTo(122, 226, 94, 238);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#7f2825";
      ctx.beginPath();
      ctx.moveTo(1270, 207);
      ctx.quadraticCurveTo(1236, 217 - flagSway, 1206, 207 - flagSway);
      ctx.lineTo(1214, 250 - flagSway * 0.35);
      ctx.quadraticCurveTo(1242, 239, 1270, 252);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawDyingGhosts(now) {
      for (let index = dyingGhosts.length - 1; index >= 0; index -= 1) {
        const ghost = dyingGhosts[index];
        if (now >= ghost.deathAt) {
          dyingGhosts.splice(index, 1);
          continue;
        }
        if (now < ghost.visibleFrom) continue;
        const duration = Math.max(1, ghost.deathAt - ghost.visibleFrom);
        const progress = clamp((now - ghost.visibleFrom) / duration, 0, 1);
        const alpha = 1 - progress * progress;
        ctx.save();
        ctx.globalAlpha = alpha * 0.82;
        ctx.translate(0, progress * 5);
        drawCardFrame(ghost.card, ghost.x, ghost.y, 124, 148, {
          compact: true,
          disabled: true,
        });
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = `rgba(20,18,17,${0.12 + progress * 0.58})`;
        roundedRect(ctx, ghost.x, ghost.y, 124, 148, 10);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = `rgba(220,181,114,${alpha * 0.48})`;
        ctx.lineWidth = 1.5;
        for (let ash = 0; ash < 5; ash += 1) {
          const ashX = ghost.x + 18 + ash * 22 + Math.sin(now * 0.008 + ash) * 3;
          const ashY = ghost.y + 132 - progress * (22 + ash * 4);
          ctx.beginPath();
          ctx.moveTo(ashX - 3, ashY + 2);
          ctx.lineTo(ashX + 2, ashY - 3);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    function heroCenter(side) {
      return side === "ai" ? { x: 683, y: 102 } : { x: 683, y: 626 };
    }

    function drawHero(side, hero, state, now, registerHit) {
      const commander = commanderPresentationFor(state, side);
      if (heroArt[commander.id]) {
        drawHeroMedallion(side, hero, state, now, registerHit);
        return;
      }
      const center = heroCenter(side);
      const isPlayer = side === "player";
      const target = { zone: "hero", side };
      const isTarget = Boolean(selection && isTargetAllowed(target, selection, state));
      const pulse = 0.5 + Math.sin(now * 0.006) * 0.5;

      ctx.save();
      if (isTarget) {
        ctx.shadowColor = "#ff594c";
        ctx.shadowBlur = 28 + pulse * 8;
      } else {
        ctx.shadowColor = "rgba(0,0,0,.7)";
        ctx.shadowBlur = 17;
      }
      ctx.translate(center.x, center.y);
      ctx.fillStyle = "#2d1b11";
      ctx.strokeStyle = isTarget ? "#ffad83" : "#c79a50";
      ctx.lineWidth = isTarget ? 5 : 3;
      ctx.beginPath();
      ctx.moveTo(0, -53);
      ctx.bezierCurveTo(40, -52, 49, -25, 43, 10);
      ctx.bezierCurveTo(38, 42, 14, 56, 0, 63);
      ctx.bezierCurveTo(-14, 56, -38, 42, -43, 10);
      ctx.bezierCurveTo(-49, -25, -40, -52, 0, -53);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.clip();
      const heroGradient = ctx.createLinearGradient(0, -48, 0, 58);
      heroGradient.addColorStop(0, isPlayer ? "#42755d" : "#7b3230");
      heroGradient.addColorStop(1, "#101a1a");
      ctx.fillStyle = heroGradient;
      ctx.fillRect(-48, -58, 96, 122);
      ctx.globalAlpha = 0.26;
      ctx.strokeStyle = "#ffe1a0";
      ctx.lineWidth = 2;
      for (let ray = 0; ray < 12; ray += 1) {
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.lineTo(Math.cos(ray * TAU / 12) * 65, Math.sin(ray * TAU / 12) * 65);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#131817";
      ctx.beginPath();
      ctx.arc(0, -8, 18, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-36, 46);
      ctx.quadraticCurveTo(-28, 10, 0, 8);
      ctx.quadraticCurveTo(28, 10, 36, 46);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#d3a165";
      ctx.beginPath();
      ctx.arc(0, -11, 13, 0, TAU);
      ctx.fill();
      ctx.restore();

      drawCenteredText(ctx, isPlayer ? "연합군" : "북방군", center.x, center.y + 72, {
        font: `800 13px ${SYSTEM_FONT}`,
        color: "#f6e6bd",
        stroke: "#20110c",
        strokeWidth: 3,
      });
      const health = Math.max(0, Number(hero && hero.health || 0));
      const maxHealth = Math.max(1, Number(hero && hero.maxHealth || 30));
      const healthRatio = clamp(health / maxHealth, 0, 1);
      drawGem(ctx, center.x + 49, center.y + 38, 21, health, COLORS.health, healthRatio < 0.34 ? pulse : 0);

      if (hero && hero.armor > 0) {
        drawGem(ctx, center.x - 49, center.y + 37, 18, hero.armor, COLORS.armor, 0);
      }

      const barWidth = 118;
      const barX = center.x - barWidth / 2;
      const barY = isPlayer ? center.y + 83 : center.y - 70;
      roundedRect(ctx, barX, barY, barWidth, 8, 4);
      ctx.fillStyle = "#261710";
      ctx.fill();
      if (healthRatio > 0) {
        roundedRect(ctx, barX + 1, barY + 1, (barWidth - 2) * healthRatio, 6, 3);
        const hp = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
        hp.addColorStop(0, "#7d1d1d");
        hp.addColorStop(1, "#e34b3d");
        ctx.fillStyle = hp;
        ctx.fill();
      }
      if (registerHit !== false) addHit("hero", center.x - 50, center.y - 55, 100, 125, { side });
    }

    function drawCommanderIdentityRibbon(side, state) {
      const commander = commanderPresentationFor(state, side);
      const geometry = commanderIdentityRibbonGeometry(side);
      const { x, y, width, height } = geometry;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.82)";
      ctx.shadowBlur = 8;
      roundedRect(ctx, x, y, width, height, 10);
      ctx.fillStyle = "rgba(24,17,13,.95)";
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = commander.palette.metal;
      ctx.stroke();
      ctx.globalAlpha = 0.8;
      roundedRect(ctx, x + 5, y + 3, 4, height - 6, 2);
      ctx.fillStyle = commander.banner;
      ctx.fill();
      roundedRect(ctx, x + width - 9, y + 3, 4, height - 6, 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      drawCenteredText(
        ctx,
        `${commander.name} · ${commander.factionLabel}`,
        x + width / 2,
        y + height / 2 + 1,
        {
          font: `900 12px ${SYSTEM_FONT}`,
          color: "#fff0c9",
          stroke: "#1a0f0b",
          strokeWidth: 2,
        },
      );
      ctx.restore();
    }

    function drawHeroMedallion(side, hero, state, now, registerHit) {
      const center = heroCenter(side);
      const isPlayer = side === "player";
      const commander = commanderPresentationFor(state, side);
      const target = { zone: "hero", side };
      const isTarget = Boolean(selection && isTargetAllowed(target, selection, state));
      const latch = heroHealthLatches[side];
      const motionPulse = reducedMotionQuery.matches ? 0.5 : 0.5 + Math.sin(now * 0.006) * 0.5;
      const damagePulse = Boolean(latch && now >= latch.revealAt && now < latch.impactUntil);
      const armorImpact = Boolean(damagePulse && latch && latch.armorOnly);
      const isActive = state && state.phase === "playing" && state.turn === side;
      const isHovered = Boolean(
        hoverHit
        && hoverHit.type === "hero"
        && hoverHit.data
        && hoverHit.data.side === side,
      );

      ctx.save();
      if (isTarget) {
        ctx.shadowColor = "#ff594c";
        ctx.shadowBlur = 28 + motionPulse * 8;
      } else if (damagePulse) {
        ctx.shadowColor = armorImpact ? "#7edcff" : "#ff3d2e";
        ctx.shadowBlur = 32;
      } else if (isActive || isHovered) {
        ctx.shadowColor = isPlayer ? "#79d6af" : "#f07558";
        ctx.shadowBlur = 20 + motionPulse * 4;
      } else {
        ctx.shadowColor = "rgba(0,0,0,.7)";
        ctx.shadowBlur = 17;
      }
      ctx.drawImage(heroArt[commander.id], center.x - 68, center.y - 76, 136, 148);
      ctx.shadowBlur = 0;

      heroShieldPath(ctx, center.x, center.y - 1, 91, 116);
      ctx.strokeStyle = isTarget
        ? "#ffb099"
        : damagePulse
          ? (armorImpact ? "#b6edff" : "#ff493b")
          : isPlayer
            ? (isActive ? "#a5e4bd" : "#d8b866")
            : (isActive ? "#ff8066" : "#be9458");
      ctx.lineWidth = isTarget || damagePulse ? 5 : isActive ? 3.8 : 2.4;
      ctx.stroke();
      const actualArmor = Math.max(0, Number(hero && hero.armor || 0));
      const displayArmor = latch && now < latch.revealAt ? latch.beforeArmor : actualArmor;
      if (displayArmor > 0) {
        ctx.strokeStyle = "#b9edff";
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(center.x, center.y - 1, 55, -2.75, -1.85);
        ctx.arc(center.x, center.y - 1, 55, 0.38, 1.28);
        ctx.stroke();
      }
      ctx.restore();

      drawCommanderIdentityRibbon(side, state);
      const actualHealth = Math.max(0, Number(hero && hero.health || 0));
      const health = Math.max(0, Number(presentationHealth(actualHealth, latch, now)));
      const maxHealth = Math.max(1, Number(hero && hero.maxHealth || 30));
      const healthRatio = clamp(health / maxHealth, 0, 1);
      drawGem(
        ctx,
        center.x + 49,
        center.y + 38,
        21,
        health,
        COLORS.health,
        damagePulse && !armorImpact ? 1 : healthRatio < 0.34 ? motionPulse : 0,
      );
      if (displayArmor > 0) {
        drawGem(ctx, center.x - 49, center.y + 37, 18, displayArmor, COLORS.armor, armorImpact ? 1 : 0);
      }

      const barWidth = 118;
      const barX = center.x - barWidth / 2;
      const barY = isPlayer ? center.y + 83 : center.y - 70;
      roundedRect(ctx, barX, barY, barWidth, 8, 4);
      ctx.fillStyle = "#261710";
      ctx.fill();
      if (healthRatio > 0) {
        roundedRect(ctx, barX + 1, barY + 1, (barWidth - 2) * healthRatio, 6, 3);
        ctx.fillStyle = damagePulse && !armorImpact ? "#ff5946" : "#c83430";
        ctx.fill();
        ctx.globalAlpha = 0.42;
        roundedRect(ctx, barX + 2, barY + 2, Math.max(0, (barWidth - 4) * healthRatio), 2, 1);
        ctx.fillStyle = "#ffb06f";
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (registerHit !== false) addHit("hero", center.x - 50, center.y - 55, 100, 125, { side });
    }

    function drawCommanderPower(state, now) {
      const commander = commanderPresentationFor(state, "player");
      const status = commanderPowerVisualState(state, "player");
      const selected = Boolean(
        selection
        && selection.kind === "commander-power"
        && selection.commanderId === commander.id,
      );
      const x = 756;
      const y = 548;
      const width = 158;
      const height = 76;
      const pulse = reducedMotionQuery.matches ? 0.5 : 0.5 + Math.sin(now * 0.007) * 0.5;
      const tone = status === "ready"
        ? {
            top: "rgba(112,80,26,.98)",
            bottom: "rgba(44,30,14,.99)",
            border: selected ? "#ff8c56" : "#f5d47a",
            title: "#fff1b7",
            body: "#f4dfaf",
          }
        : status === "mana"
          ? {
              top: "rgba(52,70,86,.97)",
              bottom: "rgba(25,34,43,.99)",
              border: "#7894a8",
              title: "#c9d7e0",
              body: "#aebcc6",
            }
          : {
              top: "rgba(58,57,55,.97)",
              bottom: "rgba(28,28,27,.99)",
              border: "#777570",
              title: "#bbb8b0",
              body: "#99968f",
            };
      ctx.save();
      if (status === "ready") {
        ctx.shadowColor = selected ? "#ff7447" : "#f3cf68";
        ctx.shadowBlur = 12 + pulse * 7;
      }
      drawPanel(x, y, width, height, {
        top: tone.top,
        bottom: tone.bottom,
        border: tone.border,
        radius: 14,
        shadowBlur: status === "ready" ? 13 : 6,
        lineWidth: selected ? 3 : 2,
      });
      ctx.shadowBlur = 0;
      drawCenteredText(ctx, commander.powerName, x + width / 2 + 8, y + 17, {
        font: `900 12px ${SYSTEM_FONT}`,
        color: tone.title,
        stroke: "#18110d",
        strokeWidth: 2,
      });

      ellipsePath(ctx, x + 20, y + 20, 15, 15);
      ctx.fillStyle = status === "ready" ? "#3d8fc5" : status === "mana" ? "#33495a" : "#444442";
      ctx.fill();
      ctx.strokeStyle = status === "ready" ? "#cdeeff" : "#78858d";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      drawCenteredText(
        ctx,
        commander.active ? commander.powerCost : "∞",
        x + 20,
        y + 20,
        {
          font: `900 13px ${UI_FONT}`,
          color: status === "ready" ? "#fff" : "#c2c7c9",
          stroke: "#17222b",
          strokeWidth: 2,
        },
      );

      const effectLines = semanticTextLines(ctx, commander.powerText, width - 20, 2);
      effectLines.forEach((line, index) => {
        drawCenteredText(ctx, line, x + width / 2, y + 43 + index * 13, {
          font: `800 9.5px ${UI_FONT}`,
          color: tone.body,
        });
      });
      if (commander.id === "liubei") {
        const charges = Math.max(0, Number(commander.reflectCharges || 0));
        drawCenteredText(ctx, `반사 ${charges}회`, x + width - 34, y + 19, {
          font: `900 10px ${UI_FONT}`,
          color: charges > 0 ? "#ffe47e" : "#9b9992",
          stroke: "#2d1b10",
          strokeWidth: 2,
        });
      } else if (status === "unavailable") {
        drawCenteredText(ctx, "체력 가득", x + width - 34, y + 18, {
          font: `900 8.5px ${SYSTEM_FONT}`,
          color: "#d8c994",
        });
      } else if (status === "spent") {
        drawCenteredText(ctx, "봉인", x + width - 26, y + 18, {
          font: `900 9px ${SYSTEM_FONT}`,
          color: "#aaa69e",
        });
      }
      ctx.restore();

      if (commander.active && state.phase !== "ended") {
        addHit("commander-power", x, y, width, height, {
          commanderId: commander.id,
          status,
        });
      }
    }

    function drawPlayerVitalGemOverlay(hero, state, now) {
      const center = heroCenter("player");
      const latch = heroHealthLatches.player;
      const damagePulse = Boolean(latch && now >= latch.revealAt && now < latch.impactUntil);
      const armorImpact = Boolean(damagePulse && latch && latch.armorOnly);
      const actualHealth = Math.max(0, Number(hero && hero.health || 0));
      const health = Math.max(0, Number(presentationHealth(actualHealth, latch, now)));
      const maxHealth = Math.max(1, Number(hero && hero.maxHealth || 30));
      const healthRatio = clamp(health / maxHealth, 0, 1);
      const actualArmor = Math.max(0, Number(hero && hero.armor || 0));
      const displayArmor = latch && now < latch.revealAt ? latch.beforeArmor : actualArmor;
      const motionPulse = reducedMotionQuery.matches ? 0.5 : 0.5 + Math.sin(now * 0.006) * 0.5;

      const protectGem = (gemX, gemY, radius) => {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,.92)";
        ctx.shadowBlur = 12;
        ellipsePath(ctx, gemX, gemY, radius + 3.5, radius + 3.5);
        ctx.fillStyle = "rgba(18,11,9,.94)";
        ctx.fill();
        ctx.restore();
      };

      const healthX = center.x + 49;
      const healthY = center.y + 38;
      // The selected/hovered hand overlay can cross the medallion. Repaint the
      // identity ribbon at this final layer, then keep the vital gems above it.
      drawCommanderIdentityRibbon("player", state);
      protectGem(healthX, healthY, 21);
      drawGem(
        ctx,
        healthX,
        healthY,
        21,
        health,
        COLORS.health,
        damagePulse && !armorImpact ? 1 : healthRatio < 0.34 ? motionPulse : 0,
      );
      if (displayArmor > 0) {
        const armorX = center.x - 49;
        const armorY = center.y + 37;
        protectGem(armorX, armorY, 18);
        drawGem(ctx, armorX, armorY, 18, displayArmor, COLORS.armor, armorImpact ? 1 : 0);
      }
    }

    function drawMana(hero, now) {
      const mana = Math.max(0, Number(hero && hero.mana || 0));
      const maxMana = Math.max(0, Number(hero && hero.maxMana || 0));
      const x = 824;
      const y = 637;
      drawPanel(x, y, 252, 56, {
        top: "rgba(22,35,42,.94)",
        bottom: "rgba(10,18,25,.97)",
        border: "#5981a0",
        radius: 13,
        shadowBlur: 9,
      });
      drawCenteredText(ctx, "기력", x + 30, y + 18, {
        font: `800 12px ${SYSTEM_FONT}`,
        color: "#b9d6e6",
      });
      drawCenteredText(ctx, `${mana} / ${maxMana}`, x + 30, y + 38, {
        font: `900 17px ${UI_FONT}`,
        color: "#e7f7ff",
      });
      for (let index = 0; index < 10; index += 1) {
        const cx = x + 66 + index * 17.4;
        const active = index < mana;
        const unlocked = index < maxMana;
        const pulse = active && !reducedMotionQuery.matches ? Math.sin(now * 0.004 + index * 0.7) * 0.08 : 0;
        ctx.save();
        ctx.shadowColor = active ? "#78ccff" : "transparent";
        ctx.shadowBlur = active ? 7 : 0;
        ellipsePath(ctx, cx, y + 28, 6.2 + pulse, 13 + pulse);
        ctx.fillStyle = active ? "#3e99d6" : unlocked ? "#1d4a69" : "#181b20";
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = unlocked ? "#a9d8f2" : "#43484c";
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawDeck(side, count) {
      const isPlayer = side === "player";
      const x = 1244;
      const y = isPlayer ? 602 : 96;
      drawCardBack(x, y, 70, 98, isPlayer ? 0.04 : -0.04, 1);
      drawCenteredText(ctx, count, x + 34, y + 30, {
        font: `900 17px ${UI_FONT}`,
        color: "#fff2cb",
        stroke: "#23130a",
        strokeWidth: 3,
      });
      drawCenteredText(ctx, "덱", x + 34, y + 48, {
        font: `800 10px ${SYSTEM_FONT}`,
        color: "#ead5a4",
      });
    }

    function drawOpponentHand(count) {
      const visibleCount = Math.min(10, count);
      for (let index = 0; index < visibleCount; index += 1) {
        const centered = index - (visibleCount - 1) / 2;
        const angle = centered * 0.045;
        const cx = 683 + centered * 31;
        const cy = 24 + Math.abs(centered) * 2.8;
        drawCardBack(cx, cy, 61, 86, angle, 0.94);
      }
      if (count > 10) {
        drawCenteredText(ctx, `+${count - 10}`, 855, 48, {
          font: `800 13px ${UI_FONT}`,
          color: "#f7dfab",
        });
      }
    }

    function handLayout(cards, index) {
      return playerHandLayoutGeometry(cards.length, index);
    }

    function drawPlayerHand(cards, state, now, overlayOnly) {
      const width = 116;
      const height = 166;
      const livePoseKeys = new Set();
      cards.forEach((card, index) => {
        const layout = handLayout(cards, index);
        const poseKey = handPoseKey(card, index);
        livePoseKeys.add(poseKey);
        const hover = hoverHit
          && hoverHit.type === "hand-card"
          && hoverHit.data.index === index
          && !(passiveHandHoverBlocked && hoverInputSource === "pointer");
        const inspectedCard = isInspectionCard(card);
        const selectedCard = Boolean(selection && selection.kind === "hand" && selection.index === index);
        const dragCard = drag && drag.active && drag.source.kind === "hand" && drag.source.index === index;
        if (overlayOnly && !selectedCard && !inspectedCard && !dragCard && !hover) return;
        const playable = canSelectHand(card, state);
        const activePose = selectedCard || inspectedCard || hover;
        const pointerAcrossCard = clamp(
          (pointer.x - (layout.x - width / 2)) / width,
          0,
          1,
        );
        const targetPose = {
          lift: dragCard ? 0 : selectedCard || inspectedCard ? 72 : hover ? 58 : 0,
          scale: dragCard ? 1.08 : activePose ? 1.04 : 1,
          fanAngle: dragCard || activePose ? 0 : layout.angle,
          tilt: hover ? (pointerAcrossCard * 2 - 1) * MAX_POINTER_TILT_RAD : 0,
          hoverMix: hover ? 1 : 0,
          sweep: hover ? pointerAcrossCard : 0.5,
        };
        let handPose = handPoseStates.get(poseKey);
        if (!handPose) {
          handPose = {
            lift: 0,
            scale: 1,
            fanAngle: layout.angle,
            tilt: 0,
            hoverMix: 0,
            sweep: 0.5,
          };
        }
        if (handPose.updatedAt !== now) {
          handPose = {
            ...stepHandPose(handPose, targetPose, frameDeltaMs, reducedMotionQuery.matches),
            updatedAt: now,
          };
          handPoseStates.set(poseKey, handPose);
        }
        const lift = dragCard ? 0 : handPose.lift;
        const bob = playable && !reducedMotionQuery.matches ? Math.sin(now * 0.0035 + index) * 1.2 : 0;
        const centerX = dragCard ? drag.x : layout.x;
        const centerY = dragCard ? drag.y : layout.y - lift + bob;
        const angle = dragCard ? 0 : handPose.fanAngle + handPose.tilt;
        const pressScale = currentVisualPressScale(`card:${poseKey}`, now);
        const scale = (dragCard ? 1.08 : handPose.scale) * pressScale;
        const drawWidth = width * scale;
        const drawHeight = height * scale;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);
        drawCardFrame(card, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight, {
          selected: selectedCard || inspectedCard || dragCard,
          disabled: !playable,
          highlightMix: handPose.hoverMix,
          highlightSweep: handPose.sweep,
        });
        ctx.restore();
        if (!overlayOnly) {
          // Interaction remains on the original fan geometry; spring visuals
          // cannot move the target away from the pointer or duplicate actions.
          addHit(
            "hand-card",
            layout.x - width / 2,
            layout.y - height / 2,
            width,
            height,
            { index },
            layout.angle,
          );
        }
      });
      if (!overlayOnly) {
        handPoseStates.forEach((value, key) => {
          if (!livePoseKeys.has(key)) handPoseStates.delete(key);
        });
      }
    }

    function drawTurnButton(state, now) {
      const hoverPanelSide = !inspection
        && !closingInspection
        && hoveredCard(state)
        ? pointer.x < LOGICAL_WIDTH / 2 ? "right" : "left"
        : null;
      const panelSide = inspection && inspection.panelSide
        || closingInspection && closingInspection.panelSide
        || hoverPanelSide;
      const geometry = turnButtonGeometry(panelSide);
      const { x, y, width, height } = geometry;
      const presentationWait = state.phase === "playing"
        && state.turn === "player"
        && isPresentationLocked(now);
      const enabled = state.phase === "playing"
        && state.turn === "player"
        && !thinking
        && !isPresentationLocked(now);
      const pulse = enabled && !reducedMotionQuery.matches ? (Math.sin(now * 0.005) + 1) / 2 : 0;
      const pressScale = currentVisualPressScale("end-turn", now);
      ctx.save();
      ctx.translate(x + width / 2, y + height / 2);
      ctx.scale(pressScale, pressScale);
      ctx.translate(-(x + width / 2), -(y + height / 2));
      ctx.shadowColor = enabled ? "#ffd46a" : "rgba(0,0,0,.5)";
      ctx.shadowBlur = enabled ? 10 + pulse * 10 : 8;
      roundedRect(ctx, x, y, width, height, 20);
      const fill = ctx.createLinearGradient(x, y, x, y + height);
      fill.addColorStop(0, enabled ? "#d9a845" : "#45413a");
      fill.addColorStop(0.45, enabled ? "#8e5320" : "#292925");
      fill.addColorStop(1, enabled ? "#4b2814" : "#1b1b19");
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = enabled ? "#ffe09a" : "#68645b";
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(x - 12, y + height / 2);
      ctx.lineTo(x + 10, y + 20);
      ctx.lineTo(x + 10, y + height - 20);
      ctx.closePath();
      ctx.fillStyle = enabled ? "#aa6a28" : "#34332f";
      ctx.fill();
      ctx.stroke();
      const buttonLabel = enabled
        ? "턴 종료"
        : presentationWait
          ? "전투 처리 중"
          : state.turn === "ai"
            ? "상대 턴"
            : "대전 종료";
      drawCenteredText(ctx, buttonLabel, x + width / 2, y + (geometry.docked ? 24 : 30), {
        font: `900 ${geometry.docked ? 19 : 21}px ${SYSTEM_FONT}`,
        color: enabled ? "#fff0bc" : "#aaa79d",
        stroke: "#3a1e10",
        strokeWidth: 3,
      });
      drawCenteredText(ctx, enabled ? "END TURN" : presentationWait ? "RESOLVING" : "WAIT", x + width / 2, y + height - 20, {
        font: `800 9px ${UI_FONT}`,
        color: enabled ? "#f0cb78" : "#77746e",
      });
      ctx.restore();
      addHit("end-turn", x, y, width, height, {});
    }

    function drawUtilityButtons() {
      const buttons = [
        { type: "mute", x: 1188, label: mutedHint ? "음소거" : "소리", glyph: mutedHint ? "×" : "♪" },
        { type: "concede", x: 1261, label: "항복", glyph: "旗" },
      ];
      buttons.forEach((button) => {
        const y = 43;
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,.45)";
        ctx.shadowBlur = 7;
        ellipsePath(ctx, button.x, y, 25, 25);
        ctx.fillStyle = "rgba(31,22,15,.9)";
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#a17b43";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        drawCenteredText(ctx, button.glyph, button.x, y - 3, {
          font: `800 19px ${SYSTEM_FONT}`,
          color: "#ead39a",
        });
        drawCenteredText(ctx, button.label, button.x, y + 17, {
          font: `700 8px ${UI_FONT}`,
          color: "#bba776",
        });
        ctx.restore();
        addHit(button.type, button.x - 27, y - 27, 54, 54, {});
      });
    }

    function drawLog(state) {
      const logs = Array.isArray(state.log) ? state.log.slice(-5) : [];
      const x = 49;
      const y = 258;
      const width = 196;
      const height = 184;
      drawPanel(x, y, width, height, {
        top: "rgba(45,35,25,.88)",
        bottom: "rgba(19,16,13,.9)",
        border: "#806037",
        radius: 11,
        shadowBlur: 9,
      });
      drawCenteredText(ctx, "전 장 기 록", x + width / 2, y + 20, {
        font: `900 12px ${SYSTEM_FONT}`,
        color: "#dcbf7d",
      });
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + 17, y + 34);
      ctx.lineTo(x + width - 17, y + 34);
      ctx.strokeStyle = "rgba(225,190,113,.35)";
      ctx.stroke();
      ctx.font = `600 10.5px ${UI_FONT}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      logs.forEach((entry, index) => {
        const message = eventDisplayMessage(entry && entry.type, entry);
        const actorColor = entry && entry.actor === "ai" ? "#e19a88" : "#cfe6b8";
        ctx.fillStyle = actorColor;
        ctx.fillText(entry && entry.actor === "ai" ? "적" : entry && entry.actor === "player" ? "아" : "•", x + 14, y + 44 + index * 27);
        ctx.fillStyle = "#e5d6b5";
        const lines = textLines(ctx, message, width - 43, 2);
        lines.forEach((line, lineIndex) => {
          ctx.fillText(line, x + 33, y + 44 + index * 27 + lineIndex * 12);
        });
      });
      if (!logs.length) {
        ctx.fillStyle = "#9f957f";
        ctx.textAlign = "center";
        ctx.fillText("북소리를 기다리는 중…", x + width / 2, y + 88);
      }
      ctx.restore();
    }

    function drawBoardLabels() {
      ctx.save();
      ctx.globalAlpha = 0.24;
      drawCenteredText(ctx, "敵  陣", 313, 338, {
        font: `900 15px ${SYSTEM_FONT}`,
        color: "#e8b5a2",
      });
      drawCenteredText(ctx, "我  軍", 1048, 381, {
        font: `900 15px ${SYSTEM_FONT}`,
        color: "#c2e2bc",
      });
      ctx.restore();
    }

    function drawThinking(now) {
      if (!thinking) return;
      const x = 918;
      const y = 75;
      const dots = ".".repeat(1 + Math.floor(now / 420) % 3);
      drawPanel(x, y, 193, 48, {
        top: "rgba(79,28,28,.94)",
        bottom: "rgba(32,14,15,.96)",
        border: "#c77b5c",
        radius: 16,
        shadowBlur: 12,
      });
      ctx.save();
      ctx.fillStyle = "#e6b85c";
      for (let index = 0; index < 3; index += 1) {
        const barHeight = 7 + Math.sin(now * 0.007 + index * 1.7) * 4;
        ctx.fillRect(x + 17 + index * 6, y + 24 - barHeight / 2, 3, barHeight);
      }
      ctx.restore();
      drawCenteredText(ctx, `군사가 숙고 중${dots}`, x + 113, y + 24, {
        font: `800 13px ${SYSTEM_FONT}`,
        color: "#f2d9aa",
      });
    }

    function drawSelectionArrow(now) {
      if (!selection) return;
      let start = null;
      const state = stateNow();
      if (selection.kind === "attacker") {
        const candidates = hits.filter((hit) => hit.type === "board-card" && hit.data.side === "player");
        const source = candidates.find((hit) => hit.data.index === selection.index);
        if (source) start = { x: source.x + source.width / 2, y: source.y };
      } else if (selection.kind === "hand") {
        const source = hits.find((hit) => hit.type === "hand-card" && hit.data.index === selection.index);
        if (source) start = { x: source.x + source.width / 2, y: source.y };
      } else if (selection.kind === "commander-power") {
        const source = hits.find((hit) => hit.type === "commander-power");
        if (source) start = { x: source.x + source.width / 2, y: source.y };
      }
      if (!start || !state) return;
      const end = drag && drag.active ? { x: drag.x, y: drag.y } : pointer;
      const hoveredTarget = targetFromHit(hitAt(end));
      const allowed = isTargetAllowed(hoveredTarget, selection, state);
      const color = allowed ? "#ffdd73" : "#ee644f";
      const bend = clamp(Math.abs(end.y - start.y) * 0.32, 40, 125);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12 + Math.sin(now * 0.008) * 3;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.setLineDash([10, 7]);
      ctx.lineDashOffset = -now * 0.03;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.bezierCurveTo(start.x, start.y - bend, end.x, end.y + bend, end.x, end.y);
      ctx.stroke();
      ctx.setLineDash([]);
      const angle = Math.atan2(end.y - (end.y + bend * 0.34), end.x - end.x + 0.01);
      ctx.translate(end.x, end.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-11, -18);
      ctx.lineTo(11, -18);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }

    function drawToast(now) {
      if (!toast) return;
      const elapsed = now - toast.startedAt;
      if (elapsed > toast.duration) {
        toast = null;
        return;
      }
      const enter = easeOutCubic(Math.min(1, elapsed / 180));
      const exit = clamp((toast.duration - elapsed) / 260, 0, 1);
      const alpha = Math.min(enter, exit);
      const width = clamp(190 + toast.message.length * 7, 250, 520);
      const x = LOGICAL_WIDTH / 2 - width / 2;
      const y = 339 - (1 - enter) * 18;
      ctx.save();
      ctx.globalAlpha = alpha;
      drawPanel(x, y, width, 44, {
        top: toast.tone === "invalid" ? "rgba(116,35,31,.96)" : "rgba(59,47,25,.96)",
        bottom: "rgba(24,18,13,.97)",
        border: toast.tone === "invalid" ? "#ef7961" : "#d8b75e",
        radius: 20,
        shadowBlur: 16,
      });
      drawCenteredText(ctx, toast.message, LOGICAL_WIDTH / 2, y + 22, {
        font: `800 14px ${UI_FONT}`,
        color: "#fff0c8",
      });
      ctx.restore();
    }

    function hoveredCard(state) {
      if (!hoverHit || !state) return null;
      if (hoverHit.type === "hand-card") {
        if (passiveHandHoverBlocked && hoverInputSource === "pointer") return null;
        return (state.hands && state.hands.player || [])[hoverHit.data.index] || null;
      }
      if (hoverHit.type === "board-card") {
        return (state.boards && state.boards[hoverHit.data.side] || [])[hoverHit.data.index] || null;
      }
      return null;
    }

    function cardKeywordDetails(card) {
      return resolveCardKeywordDetails(card, runtimeKeywordDefinitions);
    }

    function inspectorTextLayout(card, width, maxHeight) {
      const keywordDetails = cardKeywordDetails(card);
      const content = inspectorContentModel(card, keywordDetails);
      const text = content.abilityText;
      const flavor = String(getCardValue(card, "flavor", "난세에 이름을 새긴 장수."));
      const cacheKey = [
        getCardValue(card, "id", getCardValue(card, "name", "card")),
        Math.round(width),
        Math.round(maxHeight),
        text,
        flavor,
        keywordDetails
          .map((entry) => `${entry.label || entry.name}:${entry.definition}`)
          .join("|"),
      ].join("¦");
      const cachedLayout = inspectorLayoutCache.get(cacheKey);
      if (cachedLayout) {
        inspectorLayoutCache.delete(cacheKey);
        inspectorLayoutCache.set(cacheKey, cachedLayout);
        return cachedLayout;
      }
      const chosen = calculateInspectorTextLayout(
        ctx,
        card,
        width,
        maxHeight,
        keywordDetails,
      );
      inspectorLayoutCache.set(cacheKey, chosen);
      while (inspectorLayoutCache.size > INSPECTOR_LAYOUT_CACHE_LIMIT) {
        inspectorLayoutCache.delete(inspectorLayoutCache.keys().next().value);
      }
      return chosen;
    }

    function drawCardPreview(card, state, pinned, now, transitionOptions) {
      if (!card || drag && drag.active) return;
      const transition = transitionOptions || {};
      const style = getFactionStyle(card);
      const panelSide = transition.panelSide || (
        pinned && inspection
          ? inspection.panelSide
          : pointer.x < LOGICAL_WIDTH / 2
            ? "right"
            : "left"
      );
      const previewKey = `${inspectionInstanceId(card) || getCardValue(card, "id", "preview")}:${panelSide}`;
      if (!pinned && !transition.closing) {
        if (!hoverPreviewMotion || hoverPreviewMotion.key !== previewKey) {
          hoverPreviewMotion = { key: previewKey, openedAt: now };
        }
      }
      const openedAt = transition.closing
        ? transition.startedAt
        : pinned && inspection
          ? inspection.openedAt
          : hoverPreviewMotion && hoverPreviewMotion.openedAt || now;
      const panelMotion = inspectorMotionState(
        now - openedAt,
        Boolean(transition.closing),
        reducedMotionQuery.matches,
      );
      if (transition.closing && panelMotion.done) {
        closingInspection = null;
        return;
      }
      const interactivePanel = Boolean(pinned && inspection && !transition.closing);
      const panel = inspectionPanelGeometry(panelSide);
      const panelWidth = panel.width;
      const panelHeight = panel.height;
      const panelX = panel.x;
      const panelY = panel.y;
      ctx.save();
      ctx.globalAlpha = panelMotion.alpha;
      ctx.translate(panelX + panelWidth / 2, panelY + panelHeight / 2);
      ctx.scale(panelMotion.scale, panelMotion.scale);
      ctx.translate(-(panelX + panelWidth / 2), -(panelY + panelHeight / 2));
      ctx.translate((panelSide === "right" ? 1 : -1) * panelMotion.offset, 0);
      drawPanel(panelX, panelY, panelWidth, panelHeight, {
        top: colorWithAlpha(style.primary, 0.985),
        bottom: "rgba(15,13,12,.985)",
        border: style.secondary,
        radius: 17,
        shadowBlur: pinned ? 24 : 15,
        lineWidth: pinned ? 3 : 2,
      });
      if (interactivePanel) addHit("inspection-panel", panelX, panelY, panelWidth, panelHeight, {});

      drawCenteredText(ctx, pinned ? "상 세 · 고 정" : "카 드 상 세", panelX + 78, panelY + 25, {
        font: `900 14px ${SYSTEM_FONT}`,
        color: "#ffe9b1",
      });
      if (pinned) {
        const closeX = panelX + panelWidth - 27;
        const closeY = panelY + 26;
        ctx.save();
        ellipsePath(ctx, closeX, closeY, 17, 17);
        ctx.fillStyle = "rgba(20,13,11,.88)";
        ctx.fill();
        ctx.strokeStyle = style.secondary;
        ctx.lineWidth = 2;
        ctx.stroke();
        drawCenteredText(ctx, "×", closeX, closeY - 1, {
          font: `900 22px ${UI_FONT}`,
          color: "#fff1c7",
        });
        ctx.restore();
        if (interactivePanel) addHit("inspection-close", closeX - 21, closeY - 21, 42, 42, {});
      }

      const largeCardX = panelX + 14;
      const largeCardY = panelY + 49;
      const largeCardWidth = 158;
      const largeCardHeight = 224;
      drawCardFrame(card, largeCardX, largeCardY, largeCardWidth, largeCardHeight, {
        preview: true,
        selected: pinned,
      });

      const metaX = panelX + 178;
      const metaCenterX = metaX + 63;
      const name = getCardValue(card, "name", "이름 없는 장수");
      const courtesy = getCardValue(card, "courtesy", "");
      const role = getCardValue(card, "role", "장수");
      const faction = getCardValue(card, "faction", style.faction);
      const tactics = getCardValue(card, "tactics", {}) || {};
      const tacticalIdentity = String(tactics.identity || getCardValue(card, "tacticalIdentity", "") || "");
      drawCenteredText(ctx, name, metaCenterX, panelY + 69, {
        font: `900 23px ${SYSTEM_FONT}`,
        color: "#fff0bd",
        stroke: "#28130c",
        strokeWidth: 3,
        shadow: "rgba(20,10,7,.78)",
        shadowBlur: 4,
      });
      drawCenteredText(ctx, courtesy ? `자 · ${courtesy}` : "이름난 장수", metaCenterX, panelY + 98, {
        font: `700 15px ${SYSTEM_FONT}`,
        color: "#f1d58c",
        stroke: "#28130c",
        strokeWidth: 2,
      });
      drawCenteredText(ctx, `${faction} · ${role}`, metaCenterX, panelY + 123, {
        font: `800 15px ${UI_FONT}`,
        color: style.glow,
        stroke: "#14201d",
        strokeWidth: 2,
      });
      if (tacticalIdentity) {
        const pillX = metaX - 2;
        const pillY = panelY + 139;
        const pillWidth = 126;
        roundedRect(ctx, pillX, pillY, pillWidth, 25, 12);
        const pillFill = ctx.createLinearGradient(pillX, pillY, pillX, pillY + 25);
        pillFill.addColorStop(0, "rgba(206,166,72,.98)");
        pillFill.addColorStop(1, "rgba(102,68,27,.98)");
        ctx.fillStyle = pillFill;
        ctx.fill();
        ctx.strokeStyle = "#ffe3a1";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        drawCenteredText(ctx, `전술 · ${tacticalIdentity}`, pillX + pillWidth / 2, pillY + 13, {
          font: `900 10.5px ${UI_FONT}`,
          color: "#fff1c5",
          stroke: "#4b2811",
          strokeWidth: 2,
        });
      }
      const stats = [
        ["비용", getCardValue(card, "currentCost", getCardValue(card, "cost", 0)), "#5eb4ef"],
        ["공격", getCardValue(card, "currentAttack", getCardValue(card, "attack", 0)), COLORS.attack],
        ["체력", getCardValue(card, "currentHealth", getCardValue(card, "health", 0)), COLORS.health],
      ];
      stats.forEach((stat, index) => {
        const sy = panelY + 178 + index * 35;
        ellipsePath(ctx, metaX + 18, sy, 15, 15);
        ctx.fillStyle = stat[2];
        ctx.fill();
        ctx.strokeStyle = "#ffe9ad";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        drawCenteredText(ctx, stat[1], metaX + 18, sy + 1, {
          font: `900 15px ${UI_FONT}`,
          color: "#fff",
          stroke: "#28130c",
          strokeWidth: 2,
        });
        ctx.fillStyle = "#eee0bb";
        ctx.font = `800 15px ${UI_FONT}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(stat[0], metaX + 41, sy);
      });

      const bodyX = panelX + 17;
      const bodyY = panelY + 282;
      const bodyWidth = panelWidth - 34;
      const bodyHeight = panelHeight - 299;
      roundedRect(ctx, bodyX, bodyY, bodyWidth, bodyHeight, 11);
      ctx.fillStyle = "rgba(241,225,188,.97)";
      ctx.fill();
      ctx.strokeStyle = colorWithAlpha(style.secondary, 0.9);
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.save();
      roundedRect(ctx, bodyX + 9, bodyY + 9, bodyWidth - 18, bodyHeight - 18, 7);
      ctx.clip();
      const innerX = bodyX + 16;
      const innerWidth = bodyWidth - 32;
      const layout = inspectorTextLayout(card, innerWidth, bodyHeight - 28);
      const keywordTones = {
        돌진: ["#8b3b24", "#ffe0ae"],
        수호: ["#315b72", "#dbf1ff"],
        방패: ["#5a4f83", "#eee7ff"],
        출전: ["#6e5522", "#fff0b8"],
        유언: ["#5d355f", "#f4d9ff"],
      };
      const drawRichAbilityLine = (line, lineX, lineY) => {
        const segments = String(line).split(/(출전:|유언:|돌진|수호|방패|무작위)/g).filter(Boolean);
        let segmentX = lineX;
        segments.forEach((segment) => {
          const emphasized = /^(출전:|유언:|돌진|수호|방패)$/.test(segment);
          const random = segment === "무작위";
          ctx.font = `${emphasized || random ? 900 : 700} ${layout.fontSize}px ${UI_FONT}`;
          ctx.fillStyle = random ? "#7b2f78" : emphasized ? "#7a2f20" : "#32261c";
          ctx.fillText(segment, segmentX, lineY);
          segmentX += ctx.measureText(segment).width;
        });
      };
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      let cursorY = bodyY + 14;
      if (layout.hasAbility) {
        ctx.fillStyle = "#64451f";
        ctx.font = `900 14px ${SYSTEM_FONT}`;
        ctx.fillText("능력", innerX, cursorY);
        cursorY += 25;
        layout.abilityLines.forEach((line) => {
          drawRichAbilityLine(line, innerX, cursorY);
          cursorY += layout.lineHeight;
        });
        cursorY += 10;
      }

      if (layout.keywordRows.length) {
        ctx.fillStyle = "#64451f";
        ctx.font = `900 14px ${SYSTEM_FONT}`;
        ctx.fillText("발동 · 키워드", innerX, cursorY);
        cursorY += 29;
        layout.keywordRows.forEach((row) => {
          const tone = keywordTones[row.name] || ["#3c6759", "#e2f3e8"];
          const rowTop = cursorY;
          roundedRect(ctx, innerX, rowTop + 1, row.chipWidth, 26, 13);
          ctx.fillStyle = tone[0];
          ctx.fill();
          ctx.strokeStyle = colorWithAlpha(style.secondary, 0.85);
          ctx.lineWidth = 1.2;
          ctx.stroke();
          drawCenteredText(ctx, row.label || row.name, innerX + row.chipWidth / 2, rowTop + 14, {
            font: `900 15px ${UI_FONT}`,
            color: tone[1],
          });
          ctx.fillStyle = "#3a3025";
          ctx.font = `650 16px ${UI_FONT}`;
          row.definitionLines.forEach((line, lineIndex) => {
            ctx.fillText(line, innerX + row.chipWidth + 11, rowTop + 2 + lineIndex * 21);
          });
          cursorY += row.height + 4;
        });
      }

      ctx.strokeStyle = "rgba(90,60,30,.28)";
      ctx.beginPath();
      ctx.moveTo(innerX, cursorY + 4);
      ctx.lineTo(innerX + innerWidth, cursorY + 4);
      ctx.stroke();
      cursorY += 17;
      ctx.fillStyle = "#80613b";
      ctx.font = `900 13px ${SYSTEM_FONT}`;
      ctx.fillText("풍미", innerX, cursorY);
      cursorY += 23;
      ctx.fillStyle = "#735632";
      ctx.font = `italic 600 16px ${SYSTEM_FONT}`;
      layout.flavorLines.forEach((line, index) => {
        ctx.fillText(`${index === 0 ? "“" : ""}${line}${index === layout.flavorLines.length - 1 ? "”" : ""}`, innerX, cursorY + index * 22);
      });
      ctx.restore();
      ctx.restore();
    }

    function drawVictory(state, now) {
      if (!state || state.phase !== "ended") return;
      if (!gameEndRevealAt) gameEndRevealAt = now + GAME_END_REVEAL_DELAY;
      if (now < gameEndRevealAt) return;
      ctx.save();
      ctx.fillStyle = "rgba(4,8,8,.72)";
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      const modalX = 402;
      const modalY = 174;
      const modalWidth = 561;
      const modalHeight = 394;
      addHit("modal-block", 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT, {});
      drawPanel(modalX, modalY, modalWidth, modalHeight, {
        top: state.winner === "player" ? "#284f40" : "#652c2a",
        bottom: "#17110d",
        border: "#e0b862",
        radius: 24,
        shadowBlur: 35,
        lineWidth: 3,
      });

      const pulse = reducedMotionQuery.matches ? 0 : (Math.sin(now * 0.004) + 1) * 0.5;
      ctx.save();
      ctx.translate(LOGICAL_WIDTH / 2, modalY + 92);
      ctx.rotate(-0.04);
      ctx.shadowColor = "#f3c75f";
      ctx.shadowBlur = 20 + pulse * 8;
      drawSeal(ctx, 0, 0, 86, state.winner === "player" ? "勝" : state.winner === "draw" ? "和" : "敗", {
        primary: state.winner === "player" ? "#29704e" : state.winner === "draw" ? "#625238" : "#8b2e2b",
        secondary: "#f0ce76",
      });
      ctx.restore();

      const headline = state.winner === "player"
        ? "천하에 이름을 떨치다"
        : state.winner === "draw"
          ? "승부를 가리지 못하다"
          : "훗날을 도모하라";
      drawCenteredText(ctx, headline, LOGICAL_WIDTH / 2, modalY + 174, {
        font: `900 30px ${SYSTEM_FONT}`,
        color: "#fff0be",
        stroke: "#2b140b",
        strokeWidth: 4,
      });
      drawCenteredText(ctx, gameOutcomeMessage(state.reason || state.outcome, state.winner), LOGICAL_WIDTH / 2, modalY + 216, {
        font: `600 14px ${UI_FONT}`,
        color: "#d8c7a0",
      });

      const buttonX = LOGICAL_WIDTH / 2 - 112;
      const buttonY = modalY + 272;
      const buttonWidth = 224;
      const buttonHeight = 64;
      ctx.save();
      ctx.shadowColor = "#d8a74b";
      ctx.shadowBlur = 12;
      roundedRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 17);
      const buttonFill = ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
      buttonFill.addColorStop(0, "#d1a349");
      buttonFill.addColorStop(1, "#70401d");
      ctx.fillStyle = buttonFill;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffe3a0";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      drawCenteredText(ctx, "다시 대전", LOGICAL_WIDTH / 2, buttonY + 31, {
        font: `900 20px ${SYSTEM_FONT}`,
        color: "#fff4d0",
        stroke: "#3a1b0d",
        strokeWidth: 3,
      });
      ctx.restore();
      addHit("restart", buttonX, buttonY, buttonWidth, buttonHeight, {});
      ctx.restore();
    }

    function syncState(nextState, now) {
      if (!nextState) return;
      const nextPlayerHandSignature = playerHandIdentitySignature(nextState);
      if (
        previousPlayerHandSignature
        && nextPlayerHandSignature !== previousPlayerHandSignature
      ) {
        invalidatePassiveHandHover();
      }
      previousPlayerHandSignature = nextPlayerHandSignature;
      if (nextState.phase === "ended" && previousPhase !== "ended") {
        gameEndRevealAt = now + GAME_END_REVEAL_DELAY;
      } else if (nextState.phase !== "ended") {
        gameEndRevealAt = 0;
      }
      previousPhase = nextState.phase || "";
      if (nextState.revision !== previousRevision) {
        previousRevision = nextState.revision;
        reconcileInspection(nextState);
        if (selection) {
          if (
            (selection.kind === "hand" && !(nextState.hands && nextState.hands.player || [])[selection.index])
            || (selection.kind === "attacker" && !(nextState.boards && nextState.boards.player || [])[selection.index])
            || nextState.turn !== "player"
          ) {
            cancelSelection();
          }
        }
      }
      if (announcedRevision !== nextState.revision) {
        announcedRevision = nextState.revision;
        const hero = nextState.heroes && nextState.heroes.player;
        liveRegion.textContent = `${nextState.turn === "player" ? "아군" : "적군"}의 ${nextState.turnNumber || 1}번째 턴. 체력 ${hero && hero.health || 0}, 마나 ${hero && hero.mana || 0}.`;
      }
      currentState = nextState;
    }

    function drawFrame(time) {
      if (destroyed) return;
      frameHandle = 0;
      const now = Number.isFinite(time) ? time : performance.now();
      const rawFrameDelta = previousFrameTime ? now - previousFrameTime : 1000 / 60;
      frameDeltaMs = reducedMotionQuery.matches ? 0 : clampedMotionDelta(rawFrameDelta);
      previousFrameTime = now;
      const state = stateNow();
      if (state) syncState(state, now);
      ctx.setTransform(renderScaleX, 0, 0, renderScaleY, 0, 0);
      ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      ctx.drawImage(background, 0, 0);
      drawBattlefieldEnvironment(now);
      hits = [];

      if (state) {
        const visualState = visualStateForFrame(state, now) || state;
        drawTitle();
        drawOpponentHand((state.hands && state.hands.ai || []).length);
        drawBoardLabels();
        addHit("play-zone", 245, 352, 880, 211, {});
        drawBoardSlots(
          "ai",
          visualState.boards && visualState.boards.ai || [],
          now,
          state.boards && state.boards.ai || [],
        );
        drawBoardSlots(
          "player",
          visualState.boards && visualState.boards.player || [],
          now,
          state.boards && state.boards.player || [],
        );
        drawDyingGhosts(now);
        drawHero("ai", visualState.heroes && visualState.heroes.ai || {}, state, now);
        drawHero("player", visualState.heroes && visualState.heroes.player || {}, state, now);
        drawDeck("ai", (state.decks && state.decks.ai || []).length);
        drawDeck("player", (state.decks && state.decks.player || []).length);
        drawMana(state.heroes && state.heroes.player || {}, now);
        drawTurnButton(state, now);
        drawUtilityButtons();
        drawLog(state);
        drawPlayerHand(state.hands && state.hands.player || [], state, now);
        drawMana(state.heroes && state.heroes.player || {}, now);
        drawPlayerHand(state.hands && state.hands.player || [], state, now, true);
        drawHero("player", visualState.heroes && visualState.heroes.player || {}, state, now, false);
        drawPlayerVitalGemOverlay(
          visualState.heroes && visualState.heroes.player || {},
          state,
          now,
        );
        drawCommanderPower(state, now);
        drawThinking(now);
        drawSelectionArrow(now);
        const hoverCard = hoveredCard(state);
        const previewCard = inspection
          ? inspection.card
          : closingInspection
            ? closingInspection.card
            : hoverCard;
        if (previewCard) {
          drawCardPreview(
            previewCard,
            state,
            Boolean(inspection || closingInspection),
            now,
            closingInspection && !inspection
              ? {
                closing: true,
                panelSide: closingInspection.panelSide,
                startedAt: closingInspection.closedAt,
              }
              : null,
          );
        } else {
          hoverPreviewMotion = null;
        }
        drawToast(now);
        drawVictory(state, now);
      } else {
        drawTitle();
        drawCenteredText(ctx, "전장을 준비하는 중…", LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, {
          font: `900 23px ${SYSTEM_FONT}`,
          color: COLORS.cream,
          shadow: "#000",
          shadowBlur: 8,
        });
      }

      scheduleNextBoardFrame(now);
    }

    function eventLabel(type, detail) {
      const names = {
        "game:start": "대전이 시작되었습니다.",
        "turn:start": detail && detail.side === "ai" ? "적군의 턴입니다." : "아군의 턴입니다.",
        "turn:end": "턴을 마쳤습니다.",
        "card:draw": "카드를 뽑았습니다.",
        "card:play": "장수가 전장에 나섰습니다.",
        "attack:start": "공격을 시작합니다.",
        "attack:hit": "공격이 적중했습니다.",
        "minion:death": "장수가 쓰러졌습니다.",
        "effect:trigger": "계략이 발동했습니다.",
        "commander:power": "지휘관 능력이 발동했습니다.",
        "commander:reflect": "인덕의 반사가 발동했습니다.",
        "commander:lock": "다음 공격이 봉쇄되었습니다.",
        "game:end": "대전이 끝났습니다.",
        "action:invalid": "그 행동은 할 수 없습니다.",
      };
      return names[type] || String(type || "");
    }

    function eventDisplayMessage(type, detail) {
      const eventDetail = detail || {};
      const payload = eventDetail.data && typeof eventDetail.data === "object"
        ? eventDetail.data
        : eventDetail;
      const reason = payload.reason || payload.outcome || payload.error || eventDetail.reason || eventDetail.outcome;
      const provided = eventDetail.message || eventDetail.text || payload.message || payload.text;
      if (type === "action:invalid") {
        return uxCodeMessage(reason || provided, "그 행동은 할 수 없습니다.");
      }
      if (type === "game:end") {
        return gameOutcomeMessage(reason || provided, payload.winner || eventDetail.winner);
      }
      const localized = uxCodeMessage(provided, eventLabel(type, payload));
      return namedLifecycleMessage(type, eventDetail, localized);
    }

    function anchorForTarget(target) {
      if (!target) return null;
      if (target.zone === "hero") return heroCenter(target.side);
      if (target.zone === "board") {
        const hit = hits.find(
          (candidate) => candidate.type === "board-card"
            && candidate.data.side === target.side
            && candidate.data.index === target.index,
        );
        return hit ? { x: hit.x + hit.width / 2, y: hit.y + hit.height / 2 } : null;
      }
      if (target.zone === "hand") {
        const hit = hits.find(
          (candidate) => candidate.type === "hand-card" && candidate.data.index === target.index,
        );
        return hit ? { x: hit.x + hit.width / 2, y: hit.y + hit.height / 2 } : null;
      }
      return null;
    }

    function getAnchor(kind, detail) {
      if (kind && typeof kind === "object") return anchorForTarget(kind);
      const data = detail && typeof detail === "object" ? detail : {};
      const normalized = String(kind || "").toLowerCase();
      if (normalized === "hero" || normalized.endsWith("hero")) {
        const inferredSide = normalized.startsWith("ai") || normalized.startsWith("enemy")
          ? "ai"
          : normalized.startsWith("player") || normalized.startsWith("friendly")
            ? "player"
            : data.side;
        return anchorForTarget({ zone: "hero", side: inferredSide || "player" });
      }
      if (["board", "minion", "board-card"].includes(normalized)) {
        return anchorForTarget({
          zone: "board",
          side: data.side || "player",
          index: Number.isInteger(data.index) ? data.index : 0,
        });
      }
      if (["hand", "hand-card", "card"].includes(normalized)) {
        return anchorForTarget({
          zone: "hand",
          side: data.side || "player",
          index: Number.isInteger(data.index) ? data.index : 0,
        });
      }
      if (data.target) return anchorForTarget(data.target);
      return null;
    }

    function latestCombatTimeline() {
      return combatTimelines.length ? combatTimelines[combatTimelines.length - 1] : null;
    }

    function rememberHeroDamage(detail, now) {
      const eventDetail = detail || {};
      const side = eventDetail.side || (eventDetail.target && eventDetail.target.side);
      if (!["player", "ai"].includes(side)) return;
      const externalToken = eventDetail.eventToken || eventDetail.token || eventDetail.id;
      const token = externalToken
        ? `${side}:${externalToken}`
        : `${side}:hero-damage-${++heroDamageEventSequence}`;
      if (seenHeroDamageTokens.has(token)) return;
      seenHeroDamageTokens.add(token);
      if (seenHeroDamageTokens.size > 128) seenHeroDamageTokens.clear();

      const sourceOp = eventDetail.source && eventDetail.source.op;
      const combatSource = sourceOp === "attack" || sourceOp === "retaliation";
      const timeline = combatSource ? latestCombatTimeline() : null;
      const revealAt = timeline ? timeline.contactAt : now + DIRECT_EFFECT_CONTACT_MS;
      const actualHealth = Number(eventDetail.health);
      const amount = Math.max(0, Number(eventDetail.amount || 0));
      const state = stateNow();
      const currentHero = state && state.heroes && state.heroes[side] || {};
      const resolvedHealth = Number.isFinite(actualHealth)
        ? actualHealth
        : Math.max(0, Number(currentHero.health || 0));
      const resolvedArmor = Math.max(0, Number(currentHero.armor || 0));
      heroHealthLatches[side] = {
        token,
        before: resolvedHealth + amount,
        beforeArmor: resolvedArmor + Math.max(0, Number(eventDetail.armorAbsorbed || 0)),
        armorOnly: amount === 0 && Number(eventDetail.armorAbsorbed || 0) > 0,
        revealAt,
        impactUntil: revealAt + 280,
      };
    }

    function rememberDyingGhost(detail, now) {
      const eventDetail = detail || {};
      const side = eventDetail.side || eventDetail.actor || (eventDetail.target && eventDetail.target.side);
      if (!["player", "ai"].includes(side)) return;
      const instanceId = eventDetail.instanceId;
      if (!instanceId) return;
      if (dyingGhosts.some((ghost) => ghost.instanceId === instanceId && now < ghost.deathAt)) return;

      const timeline = latestCombatTimeline();
      const candidateStates = [timeline && timeline.before, currentState];
      let card = null;
      let board = null;
      let index = -1;
      for (let stateIndex = 0; stateIndex < candidateStates.length; stateIndex += 1) {
        const candidateState = candidateStates[stateIndex];
        const candidateBoard = candidateState && candidateState.boards && candidateState.boards[side] || [];
        const candidateIndex = candidateBoard.findIndex((minion) => minion && minion.instanceId === instanceId);
        if (candidateIndex >= 0) {
          card = clonePresentationCard(candidateBoard[candidateIndex]);
          board = candidateBoard;
          index = candidateIndex;
          break;
        }
      }
      if (!card) return;
      const key = `${side}:${instanceId}`;
      const existingPosition = positions.get(key);
      const slot = boardSlotGeometry(side, board.length, index);
      const contactAt = timeline ? timeline.contactAt : now + DIRECT_EFFECT_CONTACT_MS;
      const deathAt = timeline
        ? timeline.startAt + MINION_DEATH_CUE_MS
        : now + MINION_DEATH_CUE_MS;
      dyingGhosts.push({
        instanceId,
        side,
        card,
        x: existingPosition ? existingPosition.x : slot.x,
        y: existingPosition ? existingPosition.y : slot.y,
        visibleFrom: timeline ? contactAt : now,
        contactAt,
        deathAt,
      });
    }

    function handleEvent(type, detail) {
      if (destroyed) return;
      refreshStateSnapshot();
      invalidateBoardFrame();
      const now = performance.now();
      const eventDetail = detail || {};
      const localizedEventMessage = eventDisplayMessage(type, eventDetail);
      if (type === "action:invalid" || type === "game:end") {
        /*
         * The runtime forwards this same payload to FX after board UI.  Writing
         * the localized copy back prevents its floating badge from exposing
         * reason/outcome identifiers while keeping both feedback layers in sync.
         */
        eventDetail.message = localizedEventMessage;
      }
      if (inspectionMatchesAction(type, eventDetail)) closeInspection(false);
      if (type === "game:start") {
        combatTimelines.length = 0;
        dyingGhosts.length = 0;
        heroHealthLatches.player = null;
        heroHealthLatches.ai = null;
        presentationBusyUntil = 0;
        seenHeroDamageTokens.clear();
      } else if (type === "attack:start") {
        clearSelectionPrompt();
        const priorTimeline = latestCombatTimeline();
        if (priorTimeline && !priorTimeline.after) {
          priorTimeline.after = capturePresentationState(currentState || stateNow());
        }
        const startAt = Math.max(now, presentationBusyUntil);
        combatTimelines.push({
          token: `combat-${startAt}-${eventDetail.attackerId || combatTimelines.length}`,
          startAt,
          contactAt: startAt + ATTACK_CONTACT_MS,
          endAt: startAt + COMBAT_PRESENTATION_MS,
          before: capturePresentationState(stateNow()),
          after: null,
          attacker: eventDetail.attacker || null,
          target: eventDetail.target || null,
          attackerAnchor: anchorForTarget(eventDetail.attacker),
          targetAnchor: anchorForTarget(eventDetail.target),
        });
        presentationBusyUntil = startAt + COMBAT_PRESENTATION_MS;
        liveRegion.textContent = "공격이 충돌할 때까지 다음 명령을 기다립니다.";
      } else if (type === "commander:power") {
        const commander = COMMANDER_PRESENTATION[eventDetail.commanderId]
          || COMMANDER_PRESENTATION.liubei;
        presentationBusyUntil = Math.max(
          presentationBusyUntil,
          now + DIRECT_EFFECT_CONTACT_MS,
        );
        showToast(`${commander.name} · ${commander.powerName} 발동`, "normal");
      } else if (type === "commander:reflect") {
        const charges = Math.max(0, Number(eventDetail.chargesAfter || 0));
        showToast(`유비의 반사 · 공격자에게 피해 1 · ${charges}회 남음`, "normal");
      } else if (type === "commander:lock") {
        liveRegion.textContent = "맹획의 족쇄 명령으로 적 장수의 다음 공격을 봉쇄했습니다.";
      } else if (type === "card:play") {
        presentationBusyUntil = Math.max(presentationBusyUntil, now + CARD_PLAY_PRESENTATION_MS);
        showToast(localizedEventMessage, "normal");
      } else if (type === "hero:damage") {
        rememberHeroDamage(eventDetail, now);
      } else if (type === "minion:death") {
        rememberDyingGhost(eventDetail, now);
        showToast(localizedEventMessage, "normal");
      } else if (type === "action:invalid") {
        if (sharedFXFeedback) {
          /*
           * The FX layer owns the card-anchored invalid badge in the integrated
           * game.  Avoid echoing a second central toast; standalone board mocks
           * still retain their only visible feedback.
           */
          toast = null;
          liveRegion.textContent = localizedEventMessage;
        } else {
          showToast(localizedEventMessage, "invalid");
        }
      } else if (type === "game:end") {
        gameEndRevealAt = Math.max(gameEndRevealAt, now + GAME_END_REVEAL_DELAY);
        cancelSelection();
        liveRegion.textContent = eventDetail.winner === "player" ? "승리했습니다." : eventDetail.winner === "draw" ? "무승부입니다." : "패배했습니다.";
      } else if (type === "card:draw") {
        showToast(localizedEventMessage, "normal");
      }
    }

    function render(nextState) {
      if (destroyed) return;
      const latestTimeline = latestCombatTimeline();
      if (latestTimeline && !latestTimeline.after && nextState) {
        latestTimeline.after = capturePresentationState(nextState);
      }
      if (nextState) currentState = nextState;
      else refreshStateSnapshot();
      invalidateBoardFrame();
    }

    function setThinking(value) {
      thinking = Boolean(value);
      if (thinking) liveRegion.textContent = "상대 군사가 다음 수를 생각하고 있습니다.";
      invalidateBoardFrame();
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      ORIGINAL_CARD_ART_REFRESHERS.delete(invalidateBoardFrame);
      if (frameHandle) global.cancelAnimationFrame(frameHandle);
      if (idleFrameTimer) global.clearTimeout(idleFrameTimer);
      if (resizeObserver) resizeObserver.disconnect();
      if (global.removeEventListener) global.removeEventListener("resize", resizeCanvas);
      if (reducedMotionQuery.removeEventListener) {
        reducedMotionQuery.removeEventListener("change", invalidateBoardFrame);
      }
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("keydown", onKeyDown);
      canvas.classList.remove("tk-board-canvas");
      root.classList.remove("tk-board-root");
      if (liveRegion.parentNode) liveRegion.parentNode.removeChild(liveRegion);
      positions.clear();
      handPoseStates.clear();
      visualPresses.clear();
      inspectorLayoutCache.clear();
      hits = [];
    }

    if (reducedMotionQuery.addEventListener) {
      reducedMotionQuery.addEventListener("change", invalidateBoardFrame);
    }
    ORIGINAL_CARD_ART_REFRESHERS.add(invalidateBoardFrame);
    invalidateBoardFrame();

    return {
      render,
      handleEvent,
      setThinking,
      destroy,
      getAnchor,
      logicalSize: { width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT },
    };
  }

  function renderPortraitGallery(canvas, cards) {
    if (!canvas || typeof canvas.getContext !== "function") {
      throw new Error("boardUI gallery: canvas가 필요합니다.");
    }
    const roster = Array.isArray(cards) ? cards.slice(0, 27) : [];
    const rowHeight = 158;
    const galleryWidth = 1320;
    const galleryColumns = 3;
    const galleryRows = Math.ceil(roster.length / galleryColumns);
    const galleryHeight = 54 + galleryRows * rowHeight;
    const galleryCellWidth = (galleryWidth - 20) / galleryColumns;
    canvas.width = galleryWidth;
    canvas.height = galleryHeight;
    canvas.style.width = `${galleryWidth}px`;
    canvas.style.height = `${galleryHeight}px`;
    const galleryCtx = canvas.getContext("2d");
    const backdrop = galleryCtx.createLinearGradient(0, 0, galleryWidth, galleryHeight);
    backdrop.addColorStop(0, "#081819");
    backdrop.addColorStop(0.5, "#18332e");
    backdrop.addColorStop(1, "#100e0c");
    galleryCtx.fillStyle = backdrop;
    galleryCtx.fillRect(0, 0, galleryWidth, galleryHeight);
    drawCenteredText(galleryCtx, `${roster.length}인 오리지널 웹툰 원화 · 장수별 독립 제작`, galleryWidth / 2, 27, {
      font: `900 23px ${SYSTEM_FONT}`,
      color: "#ffe5a2",
      stroke: "#1b0e08",
      strokeWidth: 3,
    });
    roster.forEach((card, index) => {
      const column = index % galleryColumns;
      const row = Math.floor(index / galleryColumns);
      const cellX = 10 + column * galleryCellWidth;
      const rowY = 50 + row * rowHeight;
      const style = getFactionStyle(card);
      galleryCtx.fillStyle = index % 2 ? "rgba(255,255,255,.025)" : "rgba(0,0,0,.12)";
      galleryCtx.fillRect(cellX, rowY, galleryCellWidth - 10, rowHeight - 6);
      galleryCtx.strokeStyle = colorWithAlpha(style.secondary, 0.32);
      galleryCtx.beginPath();
      galleryCtx.moveTo(cellX + 7, rowY + rowHeight - 7);
      galleryCtx.lineTo(cellX + galleryCellWidth - 17, rowY + rowHeight - 7);
      galleryCtx.stroke();
      drawCenteredText(galleryCtx, String(index + 1).padStart(2, "0"), cellX + 27, rowY + 25, {
        font: `900 13px ${UI_FONT}`,
        color: style.glow,
      });
      galleryCtx.textAlign = "left";
      galleryCtx.textBaseline = "top";
      galleryCtx.fillStyle = "#fff0c2";
      galleryCtx.font = `900 17px ${SYSTEM_FONT}`;
      galleryCtx.fillText(getCardValue(card, "name", "장수"), cellX + 47, rowY + 14);
      galleryCtx.fillStyle = "#baa77c";
      galleryCtx.font = `700 10px ${UI_FONT}`;
      galleryCtx.fillText(`${getCardValue(card, "faction", "")} · ${getCardValue(card, "role", "장수")}`, cellX + 47, rowY + 38);
      galleryCtx.fillStyle = "#86b9a6";
      galleryCtx.font = `800 9px ${UI_FONT}`;
      galleryCtx.fillText("HAND", cellX + 20, rowY + 66);
      const smallX = cellX + 20;
      const smallY = rowY + 80;
      roundedRect(galleryCtx, smallX - 6, smallY - 6, 108, 78, 8);
      galleryCtx.fillStyle = "#1d1711";
      galleryCtx.fill();
      galleryCtx.strokeStyle = style.secondary;
      galleryCtx.stroke();
      drawPortrait(galleryCtx, smallX, smallY, 96, 66.4, card, true, "HAND");
      galleryCtx.fillStyle = "#d9bd70";
      galleryCtx.font = `800 9px ${UI_FONT}`;
      galleryCtx.fillText("DETAIL", cellX + 171, rowY + 9);
      const detailX = cellX + 171;
      const detailY = rowY + 22;
      roundedRect(galleryCtx, detailX - 9, detailY - 9, 268, 144, 10);
      galleryCtx.fillStyle = "#1d1711";
      galleryCtx.fill();
      galleryCtx.strokeStyle = style.secondary;
      galleryCtx.lineWidth = 2;
      galleryCtx.stroke();
      drawPortrait(galleryCtx, detailX, detailY, 250, 126, card, false, "GALLERY");
      galleryCtx.fillStyle = "#af9c72";
      galleryCtx.font = `650 9px ${UI_FONT}`;
      galleryCtx.fillText(portraitArchetype(card).scene, cellX + 20, rowY + 55);
    });
    return {
      width: galleryWidth,
      height: galleryHeight,
      count: roster.length,
      columns: galleryColumns,
      rows: galleryRows,
    };
  }

  global.TK = global.TK || { modules: {} };
  global.TK.modules = global.TK.modules || {};
  global.TK.modules.boardUI = {
    createBoardUI,
    renderPortraitGallery,
    LOGICAL_WIDTH,
    LOGICAL_HEIGHT,
    portraitArchetypeIds: Object.keys(PORTRAIT_ARCHETYPES),
    faceProfileCount: Object.keys(FACE_PROFILES).length,
    art7FaceProfileCount: Object.keys(FACE_ART7_PROFILES).length,
    actionProfileCount: Object.keys(PORTRAIT_ACTION_PROFILES).length,
    commanderPresentationCount: Object.keys(COMMANDER_PRESENTATION).length,
    art8FigureOverrideCount: Object.keys(ART8_FIGURE_PROFILE_OVERRIDES).length,
    materialEdgeResponseCount: Object.keys(MATERIAL_EDGE_RESPONSES).length,
    animeArtVersion: ANIME_CEL_STYLE_VERSION,
    originalCardArtVersion: ORIGINAL_CARD_ART_VERSION,
    testHooks: {
      semanticTextLines,
      cardTacticalLabel,
      resolveCardKeywordDetails,
      normalizeInspectorAbilityText,
      inspectorContentModel,
      inspectorAnnouncementText,
      calculateInspectorTextLayout,
      capturePresentationState,
      commanderPresentationFor,
      commanderPowerVisualState,
      createHeroMedallionSurface,
      presentationHealth,
      presentationLocked,
      uxCodeMessage,
      gameOutcomeMessage,
      isInternalUXKey,
      eventEntityName,
      namedLifecycleMessage,
      boardRenderMetrics,
      boardFrameDelay,
      shieldVisualState,
      boardSlotGeometry,
      playerHandLayoutGeometry,
      commanderIdentityRibbonGeometry,
      inspectionPanelGeometry,
      turnButtonGeometry,
      locateCardInstance,
      playerHandIdentitySignature,
      pointerActuallyMoved,
      tabletopParallaxOffset,
      portraitSurfaceProfile,
      portraitSurfaceKey,
      portraitCacheSnapshot,
      originalCardArtSource,
      originalCardArtFocalPoint,
      originalCardArtSnapshot,
      drawOriginalCardArt,
      portraitArchetype,
      paintPortraitUncached,
      animeV11IdentityProfile,
      paintAnimePortraitV11,
      legacyPortraitPainters: {
        paintFacialDepthV8,
        paintAnatomicalBrushworkV7,
        paintSkinMicrostructure,
      },
      faceArt7Profile,
      art7BrushBudget,
      art8FigureProfile,
      art8GripTarget,
      portraitActionProfile,
      materialEdgeResponse,
      clampedMotionDelta,
      criticallyDampedScalar,
      stepHandPose,
      inspectorMotionState,
      pressFeedbackScale,
      timing: Object.freeze({
        attackContactMs: ATTACK_CONTACT_MS,
        directEffectContactMs: DIRECT_EFFECT_CONTACT_MS,
        minionDeathCueMs: MINION_DEATH_CUE_MS,
        combatPresentationMs: COMBAT_PRESENTATION_MS,
        cardPlayPresentationMs: CARD_PLAY_PRESENTATION_MS,
        handPoseSettleMs: HAND_POSE_SETTLE_MS,
        inspectorOpenMs: INSPECTOR_OPEN_MS,
        inspectorCloseMs: INSPECTOR_CLOSE_MS,
        pressFeedbackMs: PRESS_FEEDBACK_MS,
        motionMaxDtMs: MOTION_MAX_DT_MS,
        tabletopParallaxMaxX: TABLETOP_PARALLAX_MAX_X,
        tabletopParallaxMaxY: TABLETOP_PARALLAX_MAX_Y,
        boardRenderScaleMin: BOARD_RENDER_SCALE_MIN,
        boardRenderScaleMax: BOARD_RENDER_SCALE_MAX,
        boardAmbientFrameMs: BOARD_AMBIENT_FRAME_MS,
      }),
    },
  };
})(globalThis);
