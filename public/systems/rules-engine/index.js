(function registerRulesEngine(root) {
  "use strict";

  const SIDES = ["player", "ai"];
  const OTHER_SIDE = { player: "ai", ai: "player" };
  const BOARD_LIMIT = 6;
  const FORMATION_ROWS = Object.freeze(["front", "rear"]);
  const FORMATION_SLOTS = 3;
  const HAND_LIMIT = 10;
  const MAX_MANA = 10;
  const STARTING_HEALTH = 30;
  const COMMANDER_POWER_ACTION = "USE_COMMANDER_POWER";
  const COMMANDER_DEFINITIONS = Object.freeze({
    caocao: Object.freeze({
      id: "caocao",
      faction: "wei",
      powerId: "caocao_recovery",
      powerCost: 1,
      powerAmount: 2,
      active: true,
    }),
    liubei: Object.freeze({
      id: "liubei",
      faction: "shu",
      powerId: "liubei_reflection",
      powerCost: 0,
      active: false,
    }),
    sunquan: Object.freeze({
      id: "sunquan",
      faction: "wu",
      powerId: "sunquan_flood",
      powerCost: 3,
      active: true,
    }),
    nomad: Object.freeze({
      id: "nomad",
      faction: "nomad",
      powerId: "nomad_lock",
      powerCost: 2,
      active: true,
    }),
  });

  function deepClone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function numberOr(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function normalizeCommanderId(value) {
    const candidate =
      value && typeof value === "object" && value.id != null ? value.id : value;
    const id = candidate == null ? "" : String(candidate).trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(COMMANDER_DEFINITIONS, id) ? id : null;
  }

  function hashSeed(seed) {
    if (typeof seed === "number" && Number.isFinite(seed)) {
      return (seed >>> 0) || 0x6d2b79f5;
    }
    const text = String(seed == null ? "red-cliffs" : seed);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) || 0x6d2b79f5;
  }

  function createRng(seed, restoredState) {
    let state = restoredState == null ? hashSeed(seed) : restoredState >>> 0;
    if (!state) state = 0x6d2b79f5;
    return {
      next() {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        state >>>= 0;
        return state / 4294967296;
      },
      integer(maximum) {
        if (maximum <= 0) return 0;
        return Math.floor(this.next() * maximum);
      },
      getState() {
        return state >>> 0;
      },
    };
  }

  function normalizeDefinitions(definitions) {
    const list = Array.isArray(definitions)
      ? definitions
      : definitions && typeof definitions === "object"
        ? Object.values(definitions)
        : [];
    const map = new Map();
    list.forEach((definition) => {
      if (definition && definition.id != null) {
        map.set(String(definition.id), deepClone(definition));
      }
    });
    return map;
  }

  function normalizeTokens(tokens) {
    if (typeof tokens === "function") {
      return {
        get(id) {
          const token = tokens(id);
          return token ? deepClone(token) : null;
        },
      };
    }
    if (tokens && typeof tokens.getToken === "function") {
      return {
        get(id) {
          const token = tokens.getToken(id);
          return token ? deepClone(token) : null;
        },
      };
    }
    const tokenMap = normalizeDefinitions(tokens);
    return {
      get(id) {
        return deepClone(tokenMap.get(String(id)) || null);
      },
    };
  }

  function normalizeDeck(deck, definitions, makeCard) {
    if (!Array.isArray(deck)) return [];
    const cards = [];
    deck.forEach((entry) => {
      const id =
        typeof entry === "string" || typeof entry === "number"
          ? String(entry)
          : entry && entry.id != null
            ? String(entry.id)
            : "";
      const definition = definitions.get(id) || (entry && typeof entry === "object" ? entry : null);
      if (definition) cards.push(makeCard(definition));
    });
    return cards;
  }

  function createGame(configuration) {
    const config = configuration || {};
    const definitionMap = normalizeDefinitions(config.definitions);
    const tokenSource = normalizeTokens(config.tokens);
    const seed = config.seed == null ? "red-cliffs" : config.seed;
    const outwardEmit = typeof config.emit === "function" ? config.emit : function noop() {};
    const commanderSelections = Object.freeze({
      player: normalizeCommanderId(
        config.commanders?.player ??
          config.commanderIds?.player ??
          config.playerCommander ??
          config.playerCommanderId,
      ),
      ai: normalizeCommanderId(
        config.commanders?.ai ??
          config.commanderIds?.ai ??
          config.aiCommander ??
          config.aiCommanderId,
      ),
    });

    function buildRuntime(restored) {
      const runtimeEmit = restored && restored.silent ? function noop() {} : outwardEmit;
      const rng = createRng(seed, restored && restored.rngState);
      let instanceSequence = restored ? restored.instanceSequence : 0;
      let logSequence = restored ? restored.logSequence : 0;
      let resolvingDeaths = false;
      let state;

      function nextInstanceId(prefix) {
        instanceSequence += 1;
        return `${prefix || "card"}-${instanceSequence}`;
      }

      function makeCard(definition) {
        const card = deepClone(definition);
        const baseCost = Math.max(0, numberOr(card.cost, 0));
        card.instanceId = nextInstanceId("card");
        card.baseCost = baseCost;
        card.currentCost = baseCost;
        card.cost = baseCost;
        card.keywords = Array.isArray(card.keywords) ? card.keywords.slice() : [];
        card.abilities = Array.isArray(card.abilities) ? deepClone(card.abilities) : [];
        return card;
      }

      function makeHero() {
        return {
          health: STARTING_HEALTH,
          maxHealth: STARTING_HEALTH,
          armor: 0,
          mana: 0,
          maxMana: 0,
          fatigue: 0,
          emptyFortCharges: 0,
        };
      }

      function makeCommander(id) {
        const definition = id ? COMMANDER_DEFINITIONS[id] : null;
        return {
          id: definition?.id || null,
          faction: definition?.faction || null,
          powerId: definition?.powerId || null,
          powerCost: definition?.powerCost ?? null,
          powerAmount: definition?.powerAmount ?? null,
          powerUsedThisTurn: false,
          reflectCharges: definition?.id === "liubei" ? 2 : 0,
        };
      }

      function shuffle(cards) {
        for (let index = cards.length - 1; index > 0; index -= 1) {
          const swapIndex = rng.integer(index + 1);
          const value = cards[index];
          cards[index] = cards[swapIndex];
          cards[swapIndex] = value;
        }
      }

      function balanceOpeningCards(cards, openingSize) {
        const size = Math.min(Math.max(0, openingSize), cards.length);
        if (size < 2) return;
        const isLowCost = (card) => numberOr(card?.currentCost, card?.cost) <= 2;
        let lowCostCount = cards.slice(0, size).filter(isLowCost).length;

        while (lowCostCount > Math.floor(size / 2)) {
          const openingIndex = cards
            .slice(0, size)
            .map((card, index) => ({ card, index }))
            .reverse()
            .find((entry) => isLowCost(entry.card))?.index;
          const reserveIndex = cards.findIndex(
            (card, index) => index >= size && !isLowCost(card),
          );
          if (openingIndex == null || reserveIndex < 0) break;
          [cards[openingIndex], cards[reserveIndex]] = [
            cards[reserveIndex],
            cards[openingIndex],
          ];
          lowCostCount -= 1;
        }

        if (lowCostCount === 0) {
          const reserveIndex = cards.findIndex(
            (card, index) => index >= size && isLowCost(card),
          );
          if (reserveIndex >= 0) {
            [cards[size - 1], cards[reserveIndex]] = [
              cards[reserveIndex],
              cards[size - 1],
            ];
          }
        }
      }

      function effectLogMessage(detail) {
        const cardName = detail.cardName || detail.sourceName || "카드";
        const result = detail.result || {};
        const target = detail.target || {};
        const targetName =
          result.targetName ||
          result.discountedTarget?.name ||
          result.readiedTarget?.name ||
          (target.zone === "hero"
            ? target.side === detail.actor
              ? "아군 지휘관"
              : "적 지휘관"
            : target.all
              ? "적 전장"
              : "대상 장수");
        if (result.fizzled) {
          const reasons = {
            target_missing: "대상 없음",
            token_missing: "소환 대상 없음",
            board_full: "전장 가득 참",
            target_cost_exceeded: "대상 비용 초과",
            target_cost_below_minimum: "대상 비용 부족",
            required_row_missing: "배치 조건 불충족",
            requires_solo: "다른 아군이 있음",
            faction_link_missing: "같은 진영 아군 없음",
            no_draw_requested: "뽑을 카드 없음",
            hand_empty: "교환할 손패 없음",
            not_enough_enemy_minions: "적 장수 2명 미만",
            row_empty: "해당 진형에 장수 없음",
            column_pair_missing: "같은 세로줄의 전·후열 연계 없음",
            unsupported_op: "지원하지 않는 효과",
          };
          return `${cardName}: 효과 불발 · ${reasons[result.reason] || "조건 불충족"}`;
        }
        if (result.blockedByShield) {
          return `${cardName}: ${targetName} 대상 효과 · 방패로 막힘`;
        }
        if (detail.op === "summon_token") {
          return `${cardName}: ${result.tokenName || "병력"} ${result.actualSummonCount || 0}기 소환`;
        }
        if (detail.op === "draw") {
          const extras = [];
          if (result.burnedCount) extras.push(`${result.burnedCount}장 소실`);
          if (result.fatigueCount) extras.push(`피로 ${result.fatigueCount}회`);
          return `${cardName}: 카드 ${result.actualDrawCount || 0}장 드로우${
            extras.length ? ` · ${extras.join(" · ")}` : ""
          }`;
        }
        if (
          detail.op === "damage_target" ||
          detail.op === "damage_enemy_hero" ||
          detail.op === "damage_random_enemy"
        ) {
          return `${cardName}: ${targetName}에게 피해 ${result.actualDamage || 0}`;
        }
        if (detail.op === "damage_all_enemies") {
          return `${cardName}: 적 전장에 총 피해 ${result.actualDamage || 0}`;
        }
        if (detail.op === "swap_random_hands") {
          return `${cardName}: 반골의 배신 · ${result.givenCard?.name || "내 카드"} ↔ ${result.takenCard?.name || "적 카드"}`;
        }
        if (detail.op === "damage_enemy_row") {
          return `${cardName}: 적 ${detail.row === "rear" ? "후열" : "전열"}에 총 피해 ${result.actualDamage || 0}`;
        }
        if (detail.op === "heal_friendly_hero") {
          return `${cardName}: 아군 지휘관 체력 ${result.actualHealing || 0} 회복`;
        }
        if (detail.op === "gain_armor") {
          return `${cardName}: 방어도 +${result.actualArmorGained || 0}`;
        }
        if (detail.op === "grant_all_allies_armor") {
          return `${cardName}: 아군 전장 방어력 +${result.armorGainedPerTarget || 0}`;
        }
        if (detail.op === "reinforce_friendly_row") {
          return `${cardName}: 아군 ${detail.row === "rear" ? "후열" : "전열"} ${result.affectedTargets?.length || 0}명 강화`;
        }
        if (detail.op === "column_teamwork") {
          return `${cardName}: 세로열 협공 · 전열 방어 +${result.frontArmor || 0} · 후열 공격 +${result.rearAttack || 0}`;
        }
        if (
          detail.op === "steal_enemy_minion" ||
          detail.op === "steal_enemy_minion_max_cost"
        ) {
          return `${cardName}: ${result.stolenTarget?.name || "적 장수"}의 지휘권 획득`;
        }
        if (detail.op === "reduce_random_hand_cost") {
          const discounted = result.discountedTarget;
          return `${cardName}: ${discounted?.name || "손의 카드"} 비용 ${
            discounted?.costBefore ?? "?"
          }→${discounted?.costAfter ?? "?"}`;
        }
        if (detail.op === "ready_random_friendly") {
          return `${cardName}: ${result.readiedTarget?.name || "아군 장수"} 재공격 준비`;
        }
        if (
          detail.op === "buff_target" ||
          detail.op === "buff_friendly_board" ||
          detail.op === "buff_adjacent" ||
          detail.op === "buff_self"
        ) {
          const buff = result.buff || {};
          return `${cardName}: 장수 강화 · 공격 +${buff.attack || 0} · 체력 +${
            buff.health || 0
          }`;
        }
        if (detail.op === "duel_target") return `${cardName}: 일기토 발동`;
        if (detail.op === "sow_discord") {
          return `${cardName}: 반간계 · ${result.weakestName || "약한 적"}이 ${
            result.strongestName || "강한 적"
          }을 공격`;
        }
        if (detail.op === "weaken_enemy_front") return `${cardName}: 적 전열 공격력 약화`;
        if (detail.op === "empty_fort") return `${cardName}: 공성계 준비`;
        if (detail.op === "patience_counter") return `${cardName}: 반계 준비`;
        if (detail.op === "apply_burning_all") return `${cardName}: 적 전장에 화상 부여`;
        if (detail.op === "faction_link") {
          return `${cardName}: ${result.linkName || "진영"} 연계 발동`;
        }
        return `${cardName}: 효과 해결`;
      }

      function eventMessage(type, detail) {
        if (type === "effect:trigger") return effectLogMessage(detail || {});
        const actor = detail && detail.actor ? detail.actor : "";
        const messages = {
          "game:start": "적벽의 결전이 시작되었습니다.",
          "turn:start": `${actor === "player" ? "아군" : "적군"}의 턴이 시작되었습니다.`,
          "turn:end": `${actor === "player" ? "아군" : "적군"}이 턴을 마쳤습니다.`,
          "card:draw": `${actor === "player" ? "아군" : "적군"}이 카드를 뽑았습니다.`,
          "card:play": `${actor === "player" ? "아군" : "적군"}이 카드를 냈습니다.`,
          "hand:betrayal": "위연이 양측의 계책을 뒤바꿨습니다.",
          "attack:start": "공격을 시작합니다.",
          "attack:hit": "공격이 적중했습니다.",
          "discord:start": "반간계로 적진이 흔들립니다.",
          "discord:hit": "적 장수끼리 충돌했습니다.",
          "minion:damage": "장수가 피해를 입었습니다.",
          "hero:damage": "지휘관이 피해를 입었습니다.",
          "minion:death": "장수가 전장을 떠났습니다.",
          "commander:power": "지휘관 능력을 사용했습니다.",
          "commander:reflect": "유비의 반사가 공격자에게 되돌아갔습니다.",
          "commander:lock": "유목 군주의 봉쇄가 적용되었습니다.",
          "formation:place": "장수가 진형에 배치되었습니다.",
          "formation:block": detail?.reason === "commander_paths_blocked"
            ? "후열 세 경로가 지휘관을 보호했습니다."
            : "같은 경로의 전열이 후열을 보호했습니다.",
          "formation:row-strike": "선택한 적 진형을 일제 공격했습니다.",
          "formation:reinforce": "아군 진형이 보강되었습니다.",
          "formation:teamwork": "전열과 후열의 협공이 발동했습니다.",
          "faction:link": "진영 연계가 발동했습니다.",
          "duel:start": "일기토가 시작되었습니다.",
          "duel:hit": "일기토의 승부가 갈렸습니다.",
          "status:burn": "화상이 타올랐습니다.",
          "status:counter": "인내의 반계가 발동했습니다.",
          "status:intimidate": "장판의 호통이 적 전열을 위축시켰습니다.",
          "status:empty-fort": "공성계가 공격을 무효화했습니다.",
          "status:raid": "약탈이 다음 공격을 봉쇄했습니다.",
          "game:end": "전투가 끝났습니다.",
          "action:invalid": "지금은 그 행동을 할 수 없습니다.",
        };
        return messages[type] || type;
      }

      function publish(type, detail) {
        const payload = detail ? deepClone(detail) : {};
        logSequence += 1;
        const entry = {
          id: logSequence,
          type,
          actor: payload.actor || null,
          message: eventMessage(type, payload),
          data: payload,
        };
        state.log.push(entry);
        if (state.log.length > 240) state.log.splice(0, state.log.length - 240);
        try {
          runtimeEmit(type, deepClone(payload));
        } catch {
          // Presentation feedback must never be able to interrupt rules resolution.
        }
      }

      function touch() {
        state.revision += 1;
      }

      function fail(actor, reason, data) {
        publish("action:invalid", {
          actor: actor || null,
          reason,
          ...(data || {}),
        });
        touch();
        return { ok: false, error: reason, state: deepClone(state) };
      }

      function succeed(extra) {
        touch();
        return { ok: true, ...(extra || {}), state: deepClone(state) };
      }

      function createMinion(card, side) {
        const attack = Math.max(0, numberOr(card.attack, 0));
        const health = Math.max(1, numberOr(card.health, 1));
        const armor = Math.max(0, numberOr(card.currentArmor, numberOr(card.armor, 0)));
        const keywords = Array.isArray(card.keywords) ? card.keywords : [];
        const hasCharge = keywords.includes("돌진");
        const attacksPerTurn = Math.max(
          1,
          numberOr(card.combat?.attacksPerTurn, keywords.includes("천하무쌍") ? 2 : 1),
        );
        return {
          ...deepClone(card),
          controller: side,
          currentAttack: attack,
          currentHealth: health,
          maxHealth: health,
          armor,
          currentArmor: armor,
          canAttack: hasCharge && attack > 0,
          attacksLeft: hasCharge && attack > 0 ? attacksPerTurn : 0,
          maxAttacksPerTurn: attacksPerTurn,
          attacksMadeThisTurn: 0,
          shield: keywords.includes("방패"),
          guard: keywords.includes("수호"),
          attackLockPending: false,
          attackLockedThisTurn: false,
          attackLockKind: null,
          row: null,
          slot: null,
          burning: 0,
          attackPenalty: 0,
          attackPenaltyUntil: null,
          storedCounter: 0,
          counterStored: false,
          emptyFort: false,
          secondAttackPenalty: false,
          temporaryAttackBonus: 0,
          formationAttackBonus: 0,
          formationArmorRemaining: 0,
          formationBonusRow: null,
          summonedTurn: state.turnNumber,
        };
      }

      function normalizePlacement(placement) {
        if (!placement || !FORMATION_ROWS.includes(placement.row)) return null;
        const slot = Number(placement.slot);
        if (!Number.isInteger(slot) || slot < 0 || slot >= FORMATION_SLOTS) return null;
        return { row: placement.row, slot };
      }

      function occupiedFormationSlots(side, ignoredInstanceId) {
        const occupied = new Set();
        state.boards[side].forEach((minion) => {
          if (ignoredInstanceId && minion.instanceId === ignoredInstanceId) return;
          const placement = normalizePlacement(minion);
          if (placement) occupied.add(`${placement.row}:${placement.slot}`);
        });
        return occupied;
      }

      function legalPlacements(side, ignoredInstanceId) {
        const occupied = occupiedFormationSlots(side, ignoredInstanceId);
        const placements = [];
        FORMATION_ROWS.forEach((row) => {
          for (let slot = 0; slot < FORMATION_SLOTS; slot += 1) {
            if (!occupied.has(`${row}:${slot}`)) placements.push({ row, slot });
          }
        });
        return placements;
      }

      function choosePlacement(side, requested, ignoredInstanceId) {
        const legal = legalPlacements(side, ignoredInstanceId);
        const normalized = normalizePlacement(requested);
        if (
          normalized &&
          legal.some((placement) =>
            placement.row === normalized.row && placement.slot === normalized.slot)
        ) {
          return normalized;
        }
        return legal[0] || null;
      }

      function placeMinion(side, minion, requested, reason) {
        const placement = choosePlacement(side, requested, minion.instanceId);
        if (!placement) return null;
        if (minion.formationAttackBonus) {
          minion.currentAttack = Math.max(
            0,
            minion.currentAttack - minion.formationAttackBonus,
          );
        }
        if (minion.formationArmorRemaining) {
          minion.currentArmor = Math.max(
            0,
            numberOr(minion.currentArmor, numberOr(minion.armor, 0)) -
              minion.formationArmorRemaining,
          );
          minion.armor = minion.currentArmor;
        }
        minion.formationAttackBonus = 0;
        minion.formationArmorRemaining = 0;
        minion.row = placement.row;
        minion.slot = placement.slot;
        minion.formationBonusRow = placement.row;
        if (placement.row === "front") {
          minion.formationAttackBonus = 1;
          minion.currentAttack += 1;
        } else {
          minion.formationArmorRemaining = 1;
          minion.currentArmor =
            Math.max(0, numberOr(minion.currentArmor, numberOr(minion.armor, 0))) + 1;
          minion.armor = minion.currentArmor;
        }
        if (!state.boards[side].some((candidate) => candidate.instanceId === minion.instanceId)) {
          state.boards[side].push(minion);
        }
        const index = state.boards[side].findIndex(
          (candidate) => candidate.instanceId === minion.instanceId,
        );
        publish("formation:place", {
          actor: side,
          side,
          target: { zone: "board", side, index },
          instanceId: minion.instanceId,
          cardId: minion.id,
          name: minion.name || "",
          placement: deepClone(placement),
          row: placement.row,
          slot: placement.slot,
          bonus: {
            attack: placement.row === "front" ? 1 : 0,
            armor: placement.row === "rear" ? 1 : 0,
          },
          reason: reason || "play",
        });
        return placement;
      }

      function ensureFormation(side) {
        const occupied = new Set();
        state.boards[side].forEach((minion) => {
          const normalized = normalizePlacement(minion);
          const key = normalized ? `${normalized.row}:${normalized.slot}` : "";
          if (normalized && !occupied.has(key)) {
            minion.row = normalized.row;
            minion.slot = normalized.slot;
            occupied.add(key);
            return;
          }
          const fallback = FORMATION_ROWS.flatMap((row) =>
            Array.from({ length: FORMATION_SLOTS }, (_value, slot) => ({ row, slot })),
          ).find((placement) => !occupied.has(`${placement.row}:${placement.slot}`));
          if (fallback) {
            minion.row = fallback.row;
            minion.slot = fallback.slot;
            occupied.add(`${fallback.row}:${fallback.slot}`);
          }
        });
      }

      function hasAbilityOp(source, op) {
        return Array.isArray(source?.abilities) &&
          source.abilities.some((ability) => ability && ability.op === op);
      }

      function normalizeFactionGroup(faction) {
        const value = String(faction || "").trim().toLowerCase();
        if (["촉", "shu"].includes(value)) return "shu";
        if (["위", "wei"].includes(value)) return "wei";
        if (["오", "wu"].includes(value)) return "wu";
        if (["군웅", "남만", "이민족", "qun", "nanman", "nomad"].includes(value)) {
          return "nomad";
        }
        return value;
      }

      function factionLinkName(linkKind) {
        return {
          brotherhood: "의형제",
          strategy: "군략",
          kindle: "연화",
          raid: "약탈",
        }[linkKind] || "연계";
      }

      function endGame(winner, reason) {
        if (state.phase === "ended") return;
        state.phase = "ended";
        state.winner = winner;
        state.reason = reason || "health";
        SIDES.forEach((side) => {
          state.heroes[side].mana = Math.max(0, state.heroes[side].mana);
          state.boards[side].forEach((minion) => {
            minion.canAttack = false;
            minion.attacksLeft = 0;
          });
        });
        publish("game:end", { winner, reason: state.reason });
      }

      function checkGameEnd(reason) {
        if (state.phase === "ended") return true;
        // Combat removes every minion that was dealt lethal damage as one
        // simultaneous batch.  Deathrattles from that batch (and any nested
        // death batches they create) must all resolve before hero health is
        // allowed to choose a winner.  Otherwise the first deathrattle in
        // board-order can end the game and suppress the opposing deathrattle.
        if (resolvingDeaths) return false;
        const playerDead = state.heroes.player.health <= 0;
        const aiDead = state.heroes.ai.health <= 0;
        // A mutual knockout is a terminal fact, not an effect presentation
        // category.  Never let the caller's generic "effect" or "combat"
        // reason hide it from the result modal.
        if (playerDead && aiDead) endGame("draw", "mutual_destruction");
        else if (playerDead) endGame("ai", reason || "hero_defeated");
        else if (aiDead) endGame("player", reason || "hero_defeated");
        return state.phase === "ended";
      }

      function damageHero(side, rawAmount, source) {
        if (state.phase === "ended") return 0;
        const hero = state.heroes[side];
        const healthBefore = hero.health;
        let amount = Math.max(0, numberOr(rawAmount, 0));
        if (amount > 0 && source?.op === "attack" && numberOr(hero.emptyFortCharges, 0) > 0) {
          const chargesBefore = hero.emptyFortCharges;
          hero.emptyFortCharges = Math.max(0, chargesBefore - 1);
          if (hero.emptyFortCharges === 0) {
            state.boards[side].forEach((minion) => {
              minion.emptyFort = false;
            });
          }
          publish("status:empty-fort", {
            actor: side,
            side,
            target: { zone: "hero", side },
            chargesBefore,
            chargesAfter: hero.emptyFortCharges,
            preventedDamage: amount,
            source: source || null,
          });
          publish("hero:damage", {
            actor: source && source.side ? source.side : null,
            side,
            target: { zone: "hero", side },
            amount: 0,
            actualDamage: 0,
            armorAbsorbed: 0,
            blockedByEmptyFort: true,
            healthBefore,
            healthAfter: hero.health,
            health: hero.health,
            source: source || null,
          });
          return 0;
        }
        const absorbed = Math.min(hero.armor, amount);
        hero.armor -= absorbed;
        amount -= absorbed;
        hero.health -= amount;
        publish("hero:damage", {
          actor: source && source.side ? source.side : null,
          side,
          target: { zone: "hero", side },
          amount,
          actualDamage: amount,
          armorAbsorbed: absorbed,
          healthBefore,
          healthAfter: hero.health,
          health: hero.health,
          source: source || null,
        });
        checkGameEnd("hero_defeated");
        return amount;
      }

      function damageMinion(side, minion, rawAmount, source) {
        let amount = Math.max(0, numberOr(rawAmount, 0));
        if (amount <= 0 || !minion) return 0;
        const healthBefore = minion.currentHealth;
        const boardIndex = state.boards[side].findIndex(
          (candidate) => candidate.instanceId === minion.instanceId,
        );
        const target = { zone: "board", side, index: boardIndex };
        if (minion.shield) {
          minion.shield = false;
          publish("minion:damage", {
            actor: source && source.side ? source.side : null,
            side,
            target,
            instanceId: minion.instanceId,
            amount: 0,
            actualDamage: 0,
            armorAbsorbed: 0,
            absorbedByShield: true,
            blockedByShield: true,
            shieldBroken: true,
            healthBefore,
            healthAfter: minion.currentHealth,
            health: minion.currentHealth,
            source: source || null,
          });
          return 0;
        }
        const armorBefore = Math.max(
          0,
          numberOr(minion.currentArmor, numberOr(minion.armor, 0)),
        );
        const armorAbsorbed = Math.min(armorBefore, amount);
        minion.currentArmor = armorBefore - armorAbsorbed;
        minion.armor = minion.currentArmor;
        minion.formationArmorRemaining = Math.max(
          0,
          numberOr(minion.formationArmorRemaining, 0) - armorAbsorbed,
        );
        amount -= armorAbsorbed;
        minion.currentHealth -= amount;
        if (
          amount > 0 &&
          !minion.counterStored &&
          hasAbilityOp(minion, "patience_counter")
        ) {
          const counterAbility = minion.abilities.find(
            (ability) => ability && ability.op === "patience_counter",
          );
          minion.storedCounter = Math.min(
            Math.max(0, numberOr(counterAbility?.maxStored, 2)),
            amount,
          );
          minion.counterStored = minion.storedCounter > 0;
          publish("status:counter", {
            actor: side,
            side,
            phase: "stored",
            target,
            instanceId: minion.instanceId,
            storedCounter: minion.storedCounter,
            source: source || null,
          });
        }
        publish("minion:damage", {
          actor: source && source.side ? source.side : null,
          side,
          target,
          instanceId: minion.instanceId,
          amount,
          actualDamage: amount,
          armorAbsorbed,
          absorbedByShield: false,
          blockedByShield: false,
          shieldBroken: false,
          healthBefore,
          healthAfter: minion.currentHealth,
          health: minion.currentHealth,
          source: source || null,
        });
        return amount;
      }

      function findTarget(reference) {
        if (!reference || !SIDES.includes(reference.side)) return null;
        if (reference.zone === "hero") {
          return {
            zone: "hero",
            side: reference.side,
            entity: state.heroes[reference.side],
          };
        }
        if (reference.zone === "board") {
          const index = Number(reference.index);
          const minion = state.boards[reference.side][index];
          if (!Number.isInteger(index) || !minion) return null;
          return { zone: "board", side: reference.side, index, entity: minion };
        }
        return null;
      }

      function summonToken(side, tokenId, count, source) {
        const amount = Math.max(0, numberOr(count, 1));
        let summonedCount = 0;
        for (let index = 0; index < amount; index += 1) {
          if (state.boards[side].length >= BOARD_LIMIT) break;
          const definition = tokenSource.get(tokenId) || definitionMap.get(String(tokenId));
          if (!definition) break;
          const card = makeCard(definition);
          card.isToken = true;
          const minion = createMinion(card, side);
          const placement = placeMinion(side, minion, null, "summon");
          if (!placement) break;
          summonedCount += 1;
          publish("effect:trigger", {
            actor: side,
            cardName: source ? source.name || "" : "",
            sourceName: source ? source.name || "" : "",
            op: "summon_token",
            amount: 1,
            tokenId,
            source: source ? source.instanceId : null,
            sourceCard: source
              ? { id: source.id, instanceId: source.instanceId, name: source.name || "" }
              : null,
            target: { zone: "board", side, index: state.boards[side].length - 1 },
            placement: deepClone(placement),
            result: {
              success: true,
              fizzled: false,
              reason: null,
              blockedByShield: false,
              shieldBroken: false,
              actualDamage: 0,
              actualSummonCount: 1,
              actualDrawCount: 0,
              discountedTarget: null,
              summoned: [
                {
                  id: minion.id,
                  instanceId: minion.instanceId,
                  name: minion.name || "",
                  boardIndex: state.boards[side].length - 1,
                  placement: deepClone(placement),
                },
              ],
            },
            summoned: deepClone(minion),
          });
        }
        return summonedCount;
      }

      function buffMinion(minion, ability) {
        if (!minion) return;
        const attack = numberOr(ability.attack, numberOr(ability.amount, 0));
        const health = numberOr(ability.health, numberOr(ability.amount, 0));
        minion.currentAttack = Math.max(0, minion.currentAttack + attack);
        if (ability.duration === "thisTurn" && attack > 0) {
          minion.temporaryAttackBonus = numberOr(minion.temporaryAttackBonus, 0) + attack;
        }
        minion.maxHealth = Math.max(1, minion.maxHealth + health);
        minion.currentHealth += health;
        if (minion.currentHealth > minion.maxHealth) minion.currentHealth = minion.maxHealth;
        if (minion.currentHealth <= 0) minion.currentHealth = 0;
        if (minion.currentAttack <= 0) {
          minion.canAttack = false;
          minion.attacksLeft = 0;
        }
      }

      function randomItem(items) {
        return items.length ? items[rng.integer(items.length)] : null;
      }

      function emptyEffectResult() {
        return {
          success: true,
          fizzled: false,
          reason: null,
          blockedByShield: false,
          shieldBroken: false,
          actualDamage: 0,
          actualSummonCount: 0,
          actualDrawCount: 0,
          discountedTarget: null,
        };
      }

      function previewDamage(reference, rawAmount) {
        const result = emptyEffectResult();
        const amount = Math.max(0, numberOr(rawAmount, 0));
        const target = findTarget(reference);
        if (!target) {
          result.success = false;
          result.fizzled = true;
          result.reason = "target_missing";
          return result;
        }
        if (target.zone === "hero") {
          result.armorAbsorbed = Math.min(target.entity.armor, amount);
          result.actualDamage = Math.max(0, amount - target.entity.armor);
          result.healthBefore = target.entity.health;
          result.healthAfter = target.entity.health - result.actualDamage;
          return result;
        }
        result.targetName = target.entity.name || "대상 장수";
        result.targetId = target.entity.id || null;
        result.blockedByShield = Boolean(target.entity.shield && amount > 0);
        result.shieldBroken = result.blockedByShield;
        const armor = Math.max(
          0,
          numberOr(target.entity.currentArmor, numberOr(target.entity.armor, 0)),
        );
        result.armorAbsorbed = result.blockedByShield ? 0 : Math.min(armor, amount);
        result.actualDamage = result.blockedByShield
          ? 0
          : Math.max(0, amount - result.armorAbsorbed);
        result.healthBefore = target.entity.currentHealth;
        result.healthAfter = target.entity.currentHealth - result.actualDamage;
        return result;
      }

      function commanderFor(side) {
        return state.commanders && state.commanders[side]
          ? state.commanders[side]
          : makeCommander(null);
      }

      function canReflectHeroAttack(side) {
        const commander = commanderFor(side);
        return commander.id === "liubei" && commander.reflectCharges > 0;
      }

      function reflectHeroAttack(defendingSide, attackerReference) {
        if (!canReflectHeroAttack(defendingSide)) return null;
        const target = findTarget(attackerReference);
        if (!target) return null;
        const commander = commanderFor(defendingSide);
        const chargesBefore = commander.reflectCharges;
        const result = previewDamage(attackerReference, 1);
        commander.reflectCharges = Math.max(0, chargesBefore - 1);
        publish("commander:reflect", {
          actor: defendingSide,
          side: defendingSide,
          commanderId: commander.id,
          faction: commander.faction,
          powerId: commander.powerId,
          trigger: "hero_attacked",
          attacker: deepClone(attackerReference),
          target: deepClone(attackerReference),
          chargesBefore,
          chargesAfter: commander.reflectCharges,
          result,
        });
        if (target.zone === "hero") {
          damageHero(target.side, 1, {
            side: defendingSide,
            op: "commander_reflect",
            commanderId: commander.id,
          });
        } else {
          damageMinion(target.side, target.entity, 1, {
            side: defendingSide,
            op: "commander_reflect",
            commanderId: commander.id,
          });
        }
        return result;
      }

      function previewDraw(side, requestedCount) {
        const result = emptyEffectResult();
        const hero = state.heroes[side];
        let deckCount = state.decks[side].length;
        let deckIndex = 0;
        let handCount = state.hands[side].length;
        let fatigue = hero.fatigue;
        let simulatedHealth = hero.health;
        let simulatedArmor = hero.armor;
        const cards = [];
        result.requestedDrawCount = requestedCount;
        result.cardsPulledCount = 0;
        result.burnedCount = 0;
        result.fatigueCount = 0;
        for (
          let index = 0;
          index < requestedCount && (resolvingDeaths || simulatedHealth > 0);
          index += 1
        ) {
          if (deckCount > 0) {
            const card = state.decks[side][deckIndex];
            deckIndex += 1;
            deckCount -= 1;
            result.cardsPulledCount += 1;
            if (handCount < HAND_LIMIT) {
              handCount += 1;
              result.actualDrawCount += 1;
              cards.push({
                id: card.id,
                instanceId: card.instanceId,
                name: card.name || "",
              });
            } else {
              result.burnedCount += 1;
            }
          } else {
            fatigue += 1;
            result.fatigueCount += 1;
            const armorAbsorbed = Math.min(simulatedArmor, fatigue);
            simulatedArmor -= armorAbsorbed;
            simulatedHealth -= fatigue - armorAbsorbed;
          }
        }
        result.cards = cards;
        if (
          result.actualDrawCount === 0 &&
          result.burnedCount === 0 &&
          result.fatigueCount === 0
        ) {
          result.success = false;
          result.fizzled = true;
          result.reason = "no_draw_requested";
        } else if (result.fatigueCount > 0) {
          result.reason = "fatigue";
        } else if (result.burnedCount > 0) {
          result.reason = "hand_full";
        }
        return result;
      }

      function discordStrength(minion) {
        return (
          Math.max(0, numberOr(minion?.currentAttack, minion?.attack)) +
          Math.max(0, numberOr(minion?.currentHealth, minion?.health))
        );
      }

      function discordPair(side) {
        const entries = state.boards[side].map((minion, index) => ({
          minion,
          index,
          strength: discordStrength(minion),
          attack: Math.max(0, numberOr(minion.currentAttack, minion.attack)),
          health: Math.max(0, numberOr(minion.currentHealth, minion.health)),
          cost: Math.max(0, numberOr(minion.currentCost, minion.cost)),
        }));
        if (entries.length < 2) return null;
        const weakest = entries.slice().sort((left, right) =>
          left.strength - right.strength ||
          left.attack - right.attack ||
          left.health - right.health ||
          left.cost - right.cost ||
          left.index - right.index,
        )[0];
        const strongest = entries
          .filter((entry) => entry.minion.instanceId !== weakest.minion.instanceId)
          .sort((left, right) =>
            right.strength - left.strength ||
            right.attack - left.attack ||
            right.health - left.health ||
            right.cost - left.cost ||
            left.index - right.index,
          )[0];
        return { weakest, strongest };
      }

      function previewAbility(side, source, ability, context, amount, op) {
        const enemy = OTHER_SIDE[side];
        const preview = {
          target: context.target || null,
          result: emptyEffectResult(),
          selected: null,
          targets: [],
          indexes: [],
        };
        const sourceIndex = state.boards[side].findIndex(
          (minion) => minion.instanceId === source?.instanceId,
        );
        const otherAllies = state.boards[side].filter(
          (minion) => minion.instanceId !== source?.instanceId,
        );
        if (ability.requiredRow && source?.row !== ability.requiredRow) {
          preview.result.success = false;
          preview.result.fizzled = true;
          preview.result.reason = "required_row_missing";
        } else if (ability.requiresSolo && otherAllies.length > 0) {
          preview.result.success = false;
          preview.result.fizzled = true;
          preview.result.reason = "requires_solo";
        } else if (op === "damage_target") {
          preview.result = previewDamage(preview.target, amount);
        } else if (op === "duel_target") {
          preview.selected = findTarget(preview.target);
          if (!preview.selected) {
            preview.result.success = false;
            preview.result.fizzled = true;
            preview.result.reason = "target_missing";
          } else if (preview.selected.zone !== "board" || preview.selected.side !== enemy) {
            preview.result.success = false;
            preview.result.fizzled = true;
            preview.result.reason = "invalid_target";
          } else {
            preview.result.sourceAttack = Math.max(0, numberOr(source.currentAttack, 0));
            preview.result.targetAttack = Math.max(
              0,
              numberOr(preview.selected.entity.currentAttack, 0),
            );
            preview.result.targetName = preview.selected.entity.name || "대상 장수";
            preview.result.sourceIndex = sourceIndex;
          }
        } else if (op === "sow_discord") {
          const pair = discordPair(enemy);
          if (!pair) {
            preview.result.success = false;
            preview.result.fizzled = true;
            preview.result.reason = "not_enough_enemy_minions";
          } else {
            const weakestTarget = {
              zone: "board",
              side: enemy,
              index: pair.weakest.index,
              instanceId: pair.weakest.minion.instanceId,
            };
            const strongestTarget = {
              zone: "board",
              side: enemy,
              index: pair.strongest.index,
              instanceId: pair.strongest.minion.instanceId,
            };
            preview.selected = pair;
            preview.target = strongestTarget;
            preview.result.weakestName = pair.weakest.minion.name || "약한 적 장수";
            preview.result.strongestName = pair.strongest.minion.name || "강한 적 장수";
            preview.result.weakest = weakestTarget;
            preview.result.strongest = strongestTarget;
            preview.result.weakestStrength = pair.weakest.strength;
            preview.result.strongestStrength = pair.strongest.strength;
            preview.result.damageToStrongest = pair.weakest.attack;
            preview.result.damageToWeakest = pair.strongest.attack;
          }
        } else if (op === "damage_enemy_hero") {
          preview.target = { zone: "hero", side: enemy };
          preview.result = previewDamage(preview.target, amount);
        } else if (op === "damage_random_enemy") {
          const candidates = state.boards[enemy].map((minion, index) => ({
            minion,
            target: { zone: "board", side: enemy, index },
          }));
          preview.selected = randomItem(candidates);
          preview.target = preview.selected
            ? preview.selected.target
            : { zone: "hero", side: enemy };
          preview.result = previewDamage(preview.target, amount);
        } else if (op === "damage_all_enemies") {
          preview.target = { zone: "board", side: enemy, all: true };
          preview.targets = state.boards[enemy].map((minion, index) => ({
            minion,
            target: { zone: "board", side: enemy, index },
          }));
          preview.result.affectedTargets = preview.targets.map(({ target }) => ({
            target,
            ...previewDamage(target, amount),
          }));
          preview.result.actualDamage = preview.result.affectedTargets.reduce(
            (total, outcome) => total + outcome.actualDamage,
            0,
          );
          preview.result.blockedByShield = preview.result.affectedTargets.some(
            (outcome) => outcome.blockedByShield,
          );
          preview.result.shieldBroken = preview.result.blockedByShield;
          if (!preview.targets.length) {
            preview.result.success = false;
            preview.result.fizzled = true;
            preview.result.reason = "target_missing";
          }
        } else if (op === "damage_enemy_row") {
          const row = ability.row === "rear" ? "rear" : "front";
          preview.target = { zone: "board", side: enemy, row, all: true };
          preview.targets = state.boards[enemy]
            .map((minion, index) =>
              minion.row === row
                ? { minion, target: { zone: "board", side: enemy, index } }
                : null,
            )
            .filter(Boolean);
          preview.result.row = row;
          preview.result.affectedTargets = preview.targets.map(({ target }) => ({
            target,
            ...previewDamage(target, amount),
          }));
          preview.result.actualDamage = preview.result.affectedTargets.reduce(
            (total, outcome) => total + outcome.actualDamage,
            0,
          );
          preview.result.blockedByShield = preview.result.affectedTargets.some(
            (outcome) => outcome.blockedByShield,
          );
          preview.result.shieldBroken = preview.result.blockedByShield;
          if (!preview.targets.length) {
            preview.result.success = false;
            preview.result.fizzled = true;
            preview.result.reason = "row_empty";
          }
        } else if (op === "heal_friendly_hero") {
          const hero = state.heroes[side];
          preview.target = { zone: "hero", side };
          preview.result.actualHealing = Math.max(
            0,
            Math.min(Math.max(0, amount), hero.maxHealth - hero.health),
          );
          preview.result.healthBefore = hero.health;
          preview.result.healthAfter = hero.health + preview.result.actualHealing;
        } else if (op === "draw") {
          preview.result = previewDraw(side, Math.max(0, numberOr(ability.count, amount)));
        } else if (op === "swap_random_hands") {
          const friendlyHand = state.hands[side];
          const enemyHand = state.hands[enemy];
          if (!friendlyHand.length || !enemyHand.length) {
            preview.result.success = false;
            preview.result.fizzled = true;
            preview.result.reason = "hand_empty";
          } else {
            const friendlyIndex = rng.integer(friendlyHand.length);
            const enemyIndex = rng.integer(enemyHand.length);
            preview.selected = { friendlyIndex, enemyIndex };
            preview.target = { zone: "hand", side: enemy, index: enemyIndex };
            preview.result.givenCard = {
              id: friendlyHand[friendlyIndex].id,
              instanceId: friendlyHand[friendlyIndex].instanceId,
              name: friendlyHand[friendlyIndex].name || "카드",
              cost: numberOr(friendlyHand[friendlyIndex].currentCost, friendlyHand[friendlyIndex].cost),
            };
            preview.result.takenCard = {
              id: enemyHand[enemyIndex].id,
              instanceId: enemyHand[enemyIndex].instanceId,
              name: enemyHand[enemyIndex].name || "카드",
              cost: numberOr(enemyHand[enemyIndex].currentCost, enemyHand[enemyIndex].cost),
            };
          }
        } else if (op === "gain_armor") {
          preview.target = { zone: "hero", side };
          preview.result.actualArmorGained = Math.max(0, amount);
        } else if (op === "grant_all_allies_armor") {
          const armorAmount = Math.max(0, amount);
          preview.target = { zone: "board", side, all: true };
          preview.targets = state.boards[side].map((minion, index) => ({
            minion,
            target: { zone: "board", side, index },
          }));
          preview.result.armorGainedPerTarget = armorAmount;
          preview.result.actualArmorGranted = armorAmount * preview.targets.length;
          preview.result.affectedTargets = preview.targets.map(({ minion, target }) => {
            const armorBefore = Math.max(
              0,
              numberOr(minion.currentArmor, numberOr(minion.armor, 0)),
            );
            return {
              target,
              id: minion.id,
              instanceId: minion.instanceId,
              armorBefore,
              armorAfter: armorBefore + armorAmount,
            };
          });
        } else if (op === "reinforce_friendly_row") {
          const row = ability.row === "rear" ? "rear" : "front";
          const attack = Math.max(0, numberOr(ability.attack, 0));
          const health = Math.max(0, numberOr(ability.health, 0));
          const armor = Math.max(0, numberOr(ability.armor, 0));
          preview.target = { zone: "board", side, row, all: true };
          preview.targets = state.boards[side]
            .map((minion, index) =>
              minion.row === row
                ? { minion, target: { zone: "board", side, index } }
                : null,
            )
            .filter(Boolean);
          preview.result.row = row;
          preview.result.buff = { attack, health, armor };
          preview.result.affectedTargets = preview.targets.map(({ minion, target }) => ({
            target,
            id: minion.id,
            instanceId: minion.instanceId,
            attackBefore: minion.currentAttack,
            attackAfter: minion.currentAttack + attack,
            healthBefore: minion.currentHealth,
            healthAfter: minion.currentHealth + health,
            armorBefore: Math.max(0, numberOr(minion.currentArmor, numberOr(minion.armor, 0))),
            armorAfter:
              Math.max(0, numberOr(minion.currentArmor, numberOr(minion.armor, 0))) + armor,
          }));
          if (!preview.targets.length) {
            preview.result.success = false;
            preview.result.fizzled = true;
            preview.result.reason = "row_empty";
          }
        } else if (op === "column_teamwork") {
          const slot = Number.isInteger(source?.slot) ? source.slot : -1;
          const front = state.boards[side].find(
            (minion) => minion.row === "front" && minion.slot === slot,
          );
          const rear = state.boards[side].find(
            (minion) => minion.row === "rear" && minion.slot === slot,
          );
          preview.target = { zone: "board", side, slot, column: true };
          preview.result.frontArmor = Math.max(0, numberOr(ability.frontArmor, 0));
          preview.result.rearAttack = Math.max(0, numberOr(ability.rearAttack, 0));
          if (slot < 0 || !front || !rear) {
            preview.result.success = false;
            preview.result.fizzled = true;
            preview.result.reason = "column_pair_missing";
          } else {
            const frontIndex = state.boards[side].findIndex(
              (minion) => minion.instanceId === front.instanceId,
            );
            const rearIndex = state.boards[side].findIndex(
              (minion) => minion.instanceId === rear.instanceId,
            );
            preview.targets = [
              { minion: front, target: { zone: "board", side, index: frontIndex, row: "front", slot } },
              { minion: rear, target: { zone: "board", side, index: rearIndex, row: "rear", slot } },
            ];
            preview.result.affectedTargets = preview.targets.map(({ minion, target }) => ({
              target,
              id: minion.id,
              instanceId: minion.instanceId,
            }));
          }
        } else if (
          op === "steal_enemy_minion" ||
          op === "steal_enemy_minion_max_cost"
        ) {
          preview.selected = findTarget(preview.target);
          const maxCost =
            op === "steal_enemy_minion_max_cost"
              ? Math.max(0, numberOr(ability.maxCost, 0))
              : null;
          const minCost =
            op === "steal_enemy_minion" && ability.minCost != null
              ? Math.max(0, numberOr(ability.minCost, 0))
              : null;
          const selectedCost = preview.selected
            ? Math.max(
                0,
                numberOr(
                  preview.selected.entity.currentCost,
                  numberOr(preview.selected.entity.cost, 0),
                ),
              )
            : null;
          if (!preview.selected) {
            preview.result.success = false;
            preview.result.fizzled = true;
            preview.result.reason = "target_missing";
          } else if (preview.selected.zone !== "board" || preview.selected.side !== enemy) {
            preview.result.success = false;
            preview.result.fizzled = true;
            preview.result.reason = "invalid_target";
          } else if (maxCost != null && selectedCost > maxCost) {
            preview.result.success = false;
            preview.result.fizzled = true;
            preview.result.reason = "target_cost_exceeded";
            preview.result.maxCost = maxCost;
            preview.result.targetCost = selectedCost;
          } else if (minCost != null && selectedCost < minCost) {
            preview.result.success = false;
            preview.result.fizzled = true;
            preview.result.reason = "target_cost_below_minimum";
            preview.result.minCost = minCost;
            preview.result.targetCost = selectedCost;
          } else if (state.boards[side].length >= BOARD_LIMIT) {
            preview.result.success = false;
            preview.result.fizzled = true;
            preview.result.reason = "board_full";
          } else {
            preview.result.maxCost = maxCost;
            preview.result.minCost = minCost;
            preview.result.targetCost = selectedCost;
            preview.result.stolenTarget = {
              id: preview.selected.entity.id,
              instanceId: preview.selected.entity.instanceId,
              name: preview.selected.entity.name || "",
              from: { zone: "board", side: enemy, index: preview.selected.index },
              to: { zone: "board", side, index: state.boards[side].length },
              placement: choosePlacement(side),
              canAttack: false,
              availableFromTurn: state.turnNumber + 2,
            };
          }
        } else if (op === "buff_target") {
          preview.selected = findTarget(preview.target);
          if (!preview.selected || preview.selected.zone !== "board") {
            preview.result.success = false;
            preview.result.fizzled = true;
            preview.result.reason = "target_missing";
          } else {
            preview.result.buff = {
              attack: numberOr(ability.attack, numberOr(ability.amount, 0)),
              health: numberOr(ability.health, numberOr(ability.amount, 0)),
            };
            preview.result.affectedTargets = [deepClone(preview.target)];
          }
        } else if (op === "buff_friendly_board") {
          preview.targets = state.boards[side].map((minion, index) => ({
            minion,
            target: { zone: "board", side, index },
          }));
          preview.target = { zone: "board", side, all: true };
          preview.result.affectedTargets = preview.targets.map(({ target }) => target);
          preview.result.buff = {
            attack: numberOr(ability.attack, numberOr(ability.amount, 0)),
            health: numberOr(ability.health, numberOr(ability.amount, 0)),
          };
        } else if (op === "buff_adjacent") {
          let sourceIndex = state.boards[side].findIndex(
            (minion) => minion.instanceId === source.instanceId,
          );
          const sourcePresent = sourceIndex >= 0;
          if (!sourcePresent) sourceIndex = numberOr(context.sourceIndex, 0);
          preview.indexes = sourcePresent
            ? [sourceIndex - 1, sourceIndex + 1]
            : [sourceIndex - 1, sourceIndex];
          preview.targets = preview.indexes
            .map((index) => {
              const minion = state.boards[side][index];
              return minion
                ? { minion, target: { zone: "board", side, index } }
                : null;
            })
            .filter(Boolean);
          preview.target = { zone: "board", side, adjacentTo: sourceIndex };
          preview.result.affectedTargets = preview.targets.map(({ target }) => target);
          if (!preview.targets.length) {
            preview.result.success = false;
            preview.result.fizzled = true;
            preview.result.reason = "target_missing";
          }
        } else if (op === "buff_self") {
          const index = sourceIndex;
          preview.selected = index >= 0 ? state.boards[side][index] : null;
          preview.target = index >= 0 ? { zone: "board", side, index } : null;
          if (!preview.selected) {
            preview.result.success = false;
            preview.result.fizzled = true;
            preview.result.reason = "target_missing";
          }
        } else if (op === "weaken_enemy_front") {
          preview.targets = state.boards[enemy]
            .map((minion, index) =>
              minion.row === "front"
                ? { minion, target: { zone: "board", side: enemy, index } }
                : null,
            )
            .filter(Boolean);
          preview.target = { zone: "board", side: enemy, row: "front", all: true };
          preview.result.affectedTargets = preview.targets.map(({ target }) => deepClone(target));
          preview.result.attackPenalty = Math.max(0, amount);
          preview.result.duration = ability.duration || "nextEnemyTurnEnd";
        } else if (op === "empty_fort") {
          preview.target = { zone: "hero", side };
          preview.result.chargesGranted = Math.max(1, numberOr(ability.charges, 1));
          preview.result.chargesBefore = numberOr(state.heroes[side].emptyFortCharges, 0);
        } else if (op === "patience_counter") {
          preview.target = sourceIndex >= 0 ? { zone: "board", side, index: sourceIndex } : null;
          preview.result.maxStored = Math.max(0, numberOr(ability.maxStored, 2));
        } else if (op === "apply_burning_all") {
          preview.target = { zone: "board", side: enemy, all: true };
          preview.targets = state.boards[enemy].map((minion, index) => ({
            minion,
            target: { zone: "board", side: enemy, index },
          }));
          preview.result.affectedTargets = preview.targets.map(({ minion, target }) => ({
            target: deepClone(target),
            burningBefore: Math.max(0, numberOr(minion.burning, 0)),
            burningAfter: Math.max(0, numberOr(minion.burning, 0)) + Math.max(0, amount),
          }));
        } else if (op === "faction_link") {
          const sourceFaction = normalizeFactionGroup(source?.faction);
          const linkedAllies = otherAllies.filter(
            (minion) => normalizeFactionGroup(minion.faction) === sourceFaction,
          );
          preview.targets = linkedAllies.map((minion) => ({ minion }));
          preview.result.linkKind = ability.linkKind || null;
          preview.result.linkName = factionLinkName(ability.linkKind);
          preview.result.linkedAllyCount = linkedAllies.length;
          if (sourceIndex < 0 || !sourceFaction || !linkedAllies.length) {
            preview.result.success = false;
            preview.result.fizzled = true;
            preview.result.reason = "faction_link_missing";
          }
        } else if (op === "summon_token") {
          const requested = Math.max(0, numberOr(ability.count, 1));
          const token = tokenSource.get(ability.tokenId) ||
            definitionMap.get(String(ability.tokenId));
          preview.result.requestedSummonCount = requested;
          preview.result.actualSummonCount = token
            ? Math.min(requested, BOARD_LIMIT - state.boards[side].length)
            : 0;
          preview.result.tokenId = ability.tokenId || null;
          preview.result.tokenName = token ? token.name || "병력" : "";
          preview.target = { zone: "board", side };
          if (!token || preview.result.actualSummonCount <= 0) {
            preview.result.success = false;
            preview.result.fizzled = true;
            preview.result.reason = token ? "board_full" : "token_missing";
          }
        } else if (op === "reduce_random_hand_cost") {
          const eligible = state.hands[side].filter((card) => card.currentCost > 0);
          preview.selected = randomItem(eligible);
          if (preview.selected) {
            preview.target = {
              zone: "hand",
              side,
              instanceId: preview.selected.instanceId,
            };
            preview.result.discountedTarget = {
              id: preview.selected.id,
              instanceId: preview.selected.instanceId,
              name: preview.selected.name || "",
              costBefore: preview.selected.currentCost,
              costAfter: Math.max(0, preview.selected.currentCost - Math.max(0, amount)),
            };
          } else {
            preview.result.success = false;
            preview.result.fizzled = true;
            preview.result.reason = "target_missing";
          }
        } else if (op === "ready_random_friendly") {
          const eligible = state.boards[side].filter(
            (minion) =>
              minion.instanceId !== source.instanceId &&
              minion.currentAttack > 0 &&
              minion.summonedTurn < state.turnNumber &&
              minion.attacksLeft <= 0 &&
              !minion.attackLockedThisTurn,
          );
          preview.selected = randomItem(eligible);
          if (preview.selected) {
            const index = state.boards[side].findIndex(
              (minion) => minion.instanceId === preview.selected.instanceId,
            );
            preview.target = { zone: "board", side, index };
            preview.result.readiedTarget = {
              id: preview.selected.id,
              instanceId: preview.selected.instanceId,
              name: preview.selected.name || "",
            };
          } else {
            preview.result.success = false;
            preview.result.fizzled = true;
            preview.result.reason = "target_missing";
          }
        } else {
          preview.result.success = false;
          preview.result.fizzled = true;
          preview.result.reason = "unsupported_op";
        }
        return preview;
      }

      function executeAbility(side, source, ability, context) {
        const enemy = OTHER_SIDE[side];
        const amount = numberOr(ability.amount, 1);
        const op = ability.op;
        const preview = previewAbility(side, source, ability, context, amount, op);
        publish("effect:trigger", {
          actor: side,
          cardName: source ? source.name || "" : "",
          sourceName: source ? source.name || "" : "",
          op,
          amount,
          row: ability.row || null,
          frontArmor: numberOr(ability.frontArmor, 0),
          rearAttack: numberOr(ability.rearAttack, 0),
          source: source ? source.instanceId : null,
          sourceCard: source
            ? { id: source.id, instanceId: source.instanceId, name: source.name || "" }
            : null,
          target: preview.target,
          result: preview.result,
        });

        if (!preview.result.success) return;

        if (op === "damage_target") {
          const target = findTarget(preview.target);
          if (target && target.zone === "hero") {
            damageHero(target.side, amount, { side, instanceId: source.instanceId, op });
          } else if (target) {
            damageMinion(target.side, target.entity, amount, {
              side,
              instanceId: source.instanceId,
              op,
            });
          }
        } else if (op === "duel_target") {
          const targetMinion = preview.selected?.entity;
          if (targetMinion) {
            const sourceReference = {
              zone: "board",
              side,
              index: state.boards[side].findIndex(
                (minion) => minion.instanceId === source.instanceId,
              ),
            };
            const targetReference = {
              zone: "board",
              side: enemy,
              index: state.boards[enemy].findIndex(
                (minion) => minion.instanceId === targetMinion.instanceId,
              ),
            };
            const sourceAttack = Math.max(0, numberOr(source.currentAttack, 0));
            const targetAttack = Math.max(0, numberOr(targetMinion.currentAttack, 0));
            publish("duel:start", {
              actor: side,
              source: deepClone(sourceReference),
              target: deepClone(targetReference),
              sourceAttack,
              targetAttack,
            });
            const ownsDeathBatch = !resolvingDeaths;
            if (ownsDeathBatch) resolvingDeaths = true;
            let damageToTarget = 0;
            let damageToSource = 0;
            try {
              damageToTarget = damageMinion(enemy, targetMinion, sourceAttack, {
                side,
                instanceId: source.instanceId,
                op: "duel",
              });
              damageToSource = damageMinion(side, source, targetAttack, {
                side: enemy,
                instanceId: targetMinion.instanceId,
                op: "duel_retaliation",
              });
            } finally {
              if (ownsDeathBatch) resolvingDeaths = false;
            }
            if (ownsDeathBatch) resolveDeaths();
            const sourceSurvived = state.boards[side].some(
              (minion) => minion.instanceId === source.instanceId,
            );
            const targetDied = !state.boards[enemy].some(
              (minion) => minion.instanceId === targetMinion.instanceId,
            );
            if (sourceSurvived && targetDied) {
              source.canAttack = source.currentAttack > 0;
              source.attacksLeft = Math.max(1, source.attacksLeft);
            }
            publish("duel:hit", {
              actor: side,
              source: deepClone(sourceReference),
              target: deepClone(targetReference),
              damageToTarget,
              damageToSource,
              sourceSurvived,
              targetDied,
              readied: sourceSurvived && targetDied,
            });
          }
        } else if (op === "sow_discord") {
          const weakestMinion = preview.selected?.weakest?.minion;
          const strongestMinion = preview.selected?.strongest?.minion;
          if (weakestMinion && strongestMinion) {
            const weakestReference = deepClone(preview.result.weakest);
            const strongestReference = deepClone(preview.result.strongest);
            const weakestAttack = Math.max(
              0,
              numberOr(weakestMinion.currentAttack, weakestMinion.attack),
            );
            const strongestAttack = Math.max(
              0,
              numberOr(strongestMinion.currentAttack, strongestMinion.attack),
            );
            publish("discord:start", {
              actor: side,
              cardSource: source
                ? { id: source.id, instanceId: source.instanceId, name: source.name || "" }
                : null,
              source: weakestReference,
              target: strongestReference,
              weakestName: weakestMinion.name || "약한 적 장수",
              strongestName: strongestMinion.name || "강한 적 장수",
              sourceAttack: weakestAttack,
              targetAttack: strongestAttack,
            });
            const ownsDeathBatch = !resolvingDeaths;
            if (ownsDeathBatch) resolvingDeaths = true;
            let damageToStrongest = 0;
            let damageToWeakest = 0;
            try {
              damageToStrongest = damageMinion(enemy, strongestMinion, weakestAttack, {
                side: enemy,
                instanceId: weakestMinion.instanceId,
                op: "discord",
              });
              damageToWeakest = damageMinion(enemy, weakestMinion, strongestAttack, {
                side: enemy,
                instanceId: strongestMinion.instanceId,
                op: "discord_retaliation",
              });
            } finally {
              if (ownsDeathBatch) resolvingDeaths = false;
            }
            if (ownsDeathBatch) resolveDeaths();
            const weakestDied = !state.boards[enemy].some(
              (minion) => minion.instanceId === weakestMinion.instanceId,
            );
            const strongestDied = !state.boards[enemy].some(
              (minion) => minion.instanceId === strongestMinion.instanceId,
            );
            publish("discord:hit", {
              actor: side,
              source: weakestReference,
              target: strongestReference,
              weakestName: weakestMinion.name || "약한 적 장수",
              strongestName: strongestMinion.name || "강한 적 장수",
              damageToStrongest,
              damageToWeakest,
              weakestDied,
              strongestDied,
            });
          }
        } else if (op === "damage_enemy_hero") {
          damageHero(enemy, amount, { side, instanceId: source.instanceId, op });
        } else if (op === "damage_random_enemy") {
          if (preview.selected) {
            damageMinion(enemy, preview.selected.minion, amount, {
              side,
              instanceId: source.instanceId,
              op,
            });
          } else {
            damageHero(enemy, amount, { side, instanceId: source.instanceId, op });
          }
        } else if (op === "damage_all_enemies") {
          preview.targets.forEach(({ minion }) => {
            damageMinion(enemy, minion, amount, {
              side,
              instanceId: source.instanceId,
              op,
            });
          });
        } else if (op === "damage_enemy_row") {
          const ownsDeathBatch = !resolvingDeaths;
          if (ownsDeathBatch) resolvingDeaths = true;
          try {
            preview.targets.forEach(({ minion }) => {
              damageMinion(enemy, minion, amount, {
                side,
                instanceId: source.instanceId,
                op,
              });
            });
          } finally {
            if (ownsDeathBatch) resolvingDeaths = false;
          }
          if (ownsDeathBatch) resolveDeaths();
          publish("formation:row-strike", {
            actor: side,
            side: enemy,
            row: preview.result.row,
            amount,
            source: source.instanceId,
            target: deepClone(preview.target),
            affectedTargets: deepClone(preview.result.affectedTargets),
          });
        } else if (op === "heal_friendly_hero") {
          const hero = state.heroes[side];
          hero.health = clamp(hero.health + amount, 0, hero.maxHealth);
        } else if (op === "draw") {
          const drawCount = Math.max(0, numberOr(ability.count, amount));
          for (let index = 0; index < drawCount && state.phase === "playing"; index += 1) {
            drawCard(side, false, source);
          }
        } else if (op === "swap_random_hands") {
          const friendlyIndex = preview.selected.friendlyIndex;
          const enemyIndex = preview.selected.enemyIndex;
          const givenCard = state.hands[side][friendlyIndex];
          const takenCard = state.hands[enemy][enemyIndex];
          state.hands[side][friendlyIndex] = takenCard;
          state.hands[enemy][enemyIndex] = givenCard;
          publish("hand:betrayal", {
            actor: side,
            side,
            enemy,
            source: source.instanceId,
            friendlyIndex,
            enemyIndex,
            givenCard: deepClone(preview.result.givenCard),
            takenCard: deepClone(preview.result.takenCard),
          });
        } else if (op === "gain_armor") {
          state.heroes[side].armor += Math.max(0, amount);
        } else if (op === "grant_all_allies_armor") {
          const armorAmount = Math.max(0, amount);
          preview.targets.forEach(({ minion }) => {
            const currentArmor = Math.max(
              0,
              numberOr(minion.currentArmor, numberOr(minion.armor, 0)),
            );
            minion.currentArmor = currentArmor + armorAmount;
            minion.armor = minion.currentArmor;
          });
        } else if (op === "reinforce_friendly_row") {
          const armorAmount = Math.max(0, numberOr(ability.armor, 0));
          preview.targets.forEach(({ minion }) => {
            buffMinion(minion, ability);
            const currentArmor = Math.max(
              0,
              numberOr(minion.currentArmor, numberOr(minion.armor, 0)),
            );
            minion.currentArmor = currentArmor + armorAmount;
            minion.armor = minion.currentArmor;
          });
          publish("formation:reinforce", {
            actor: side,
            side,
            row: preview.result.row,
            source: source.instanceId,
            buff: deepClone(preview.result.buff),
            affectedTargets: deepClone(preview.result.affectedTargets),
          });
        } else if (op === "column_teamwork") {
          const front = preview.targets.find(({ minion }) => minion.row === "front")?.minion;
          const rear = preview.targets.find(({ minion }) => minion.row === "rear")?.minion;
          if (front && rear) {
            const armorAmount = preview.result.frontArmor;
            front.currentArmor =
              Math.max(0, numberOr(front.currentArmor, numberOr(front.armor, 0))) +
              armorAmount;
            front.armor = front.currentArmor;
            buffMinion(rear, { attack: preview.result.rearAttack, health: 0 });
            publish("formation:teamwork", {
              actor: side,
              side,
              slot: source.slot,
              source: source.instanceId,
              front: front.instanceId,
              rear: rear.instanceId,
              frontArmor: armorAmount,
              rearAttack: preview.result.rearAttack,
              affectedTargets: deepClone(preview.result.affectedTargets),
            });
          }
        } else if (
          op === "steal_enemy_minion" ||
          op === "steal_enemy_minion_max_cost"
        ) {
          if (preview.result.success && preview.selected) {
            const sourceBoard = state.boards[enemy];
            const targetIndex = sourceBoard.findIndex(
              (minion) => minion.instanceId === preview.selected.entity.instanceId,
            );
            if (targetIndex >= 0 && state.boards[side].length < BOARD_LIMIT) {
              const stolen = sourceBoard.splice(targetIndex, 1)[0];
              stolen.controller = side;
              stolen.canAttack = false;
              stolen.attacksLeft = 0;
              stolen.attackLockPending = false;
              stolen.attackLockedThisTurn = false;
              stolen.attackLockKind = null;
              stolen.summonedTurn = state.turnNumber;
              stolen.row = null;
              stolen.slot = null;
              placeMinion(side, stolen, null, "steal");
            }
          }
        } else if (op === "buff_target") {
          if (preview.selected && preview.selected.zone === "board") {
            buffMinion(preview.selected.entity, ability);
          }
        } else if (op === "buff_friendly_board") {
          preview.targets.forEach(({ minion }) => buffMinion(minion, ability));
        } else if (op === "buff_adjacent") {
          preview.targets.forEach(({ minion }) => buffMinion(minion, ability));
        } else if (op === "buff_self") {
          if (preview.selected) buffMinion(preview.selected, ability);
        } else if (op === "weaken_enemy_front") {
          const penalty = Math.max(0, amount);
          preview.targets.forEach(({ minion, target }) => {
            minion.currentAttack = Math.max(0, minion.currentAttack - penalty);
            minion.attackPenalty = numberOr(minion.attackPenalty, 0) + penalty;
            minion.attackPenaltyUntil = "ownerTurnEnd";
            if (minion.currentAttack <= 0) {
              minion.canAttack = false;
              minion.attacksLeft = 0;
            }
            publish("status:intimidate", {
              actor: side,
              side: enemy,
              target: deepClone(target),
              amount: penalty,
              attackPenalty: minion.attackPenalty,
              duration: ability.duration || "nextEnemyTurnEnd",
            });
          });
        } else if (op === "empty_fort") {
          const charges = Math.max(1, numberOr(ability.charges, 1));
          state.heroes[side].emptyFortCharges =
            numberOr(state.heroes[side].emptyFortCharges, 0) + charges;
          source.emptyFort = true;
          publish("status:empty-fort", {
            actor: side,
            side,
            phase: "armed",
            target: { zone: "hero", side },
            source: source.instanceId,
            charges,
            chargesAfter: state.heroes[side].emptyFortCharges,
          });
        } else if (op === "patience_counter") {
          source.storedCounter = Math.max(0, numberOr(source.storedCounter, 0));
        } else if (op === "apply_burning_all") {
          const burning = Math.max(0, amount);
          preview.targets.forEach(({ minion, target }) => {
            minion.burning = Math.max(0, numberOr(minion.burning, 0)) + burning;
            publish("status:burn", {
              actor: side,
              side: enemy,
              phase: "applied",
              target: deepClone(target),
              amount: burning,
              burning: minion.burning,
            });
          });
        } else if (op === "faction_link") {
          const linkKind = ability.linkKind;
          const linkedAllies = preview.targets.map(({ minion }) => minion);
          const result = {
            linkKind,
            linkName: factionLinkName(linkKind),
            source: source.instanceId,
            linkedAllyCount: linkedAllies.length,
            affectedTargets: [],
          };
          if (linkKind === "brotherhood") {
            const lowest = linkedAllies.reduce(
              (selected, minion) =>
                !selected || minion.currentHealth < selected.currentHealth ? minion : selected,
              null,
            );
            [source, lowest].filter(Boolean).forEach((minion) => {
              minion.maxHealth += 1;
              minion.currentHealth += 1;
              result.affectedTargets.push(minion.instanceId);
            });
          } else if (linkKind === "strategy") {
            const selected = state.hands[side]
              .filter((card) => numberOr(card.currentCost, card.cost) > 1)
              .reduce((best, card) => {
              if (!best || card.currentCost > best.currentCost) return card;
              return best;
            }, null);
            if (selected) {
              const costBefore = selected.currentCost;
              selected.currentCost = Math.max(1, selected.currentCost - 1);
              selected.cost = selected.currentCost;
              result.discountedTarget = {
                id: selected.id,
                instanceId: selected.instanceId,
                name: selected.name || "",
                costBefore,
                costAfter: selected.currentCost,
              };
            }
          } else if (linkKind === "kindle") {
            const candidates = state.boards[enemy].map((minion, index) => ({ minion, index }));
            const selected = randomItem(candidates);
            if (selected) {
              selected.minion.burning = Math.max(0, numberOr(selected.minion.burning, 0)) + 1;
              result.burningTarget = selected.minion.instanceId;
              result.affectedTargets.push(selected.minion.instanceId);
              publish("status:burn", {
                actor: side,
                side: enemy,
                phase: "applied",
                target: { zone: "board", side: enemy, index: selected.index },
                amount: 1,
                burning: selected.minion.burning,
              });
            } else {
              result.actualDamage = damageHero(enemy, 1, {
                side,
                instanceId: source.instanceId,
                op: "faction_link_kindle",
              });
            }
          } else if (linkKind === "raid") {
            const candidates = state.boards[enemy]
              .map((minion, index) => ({ minion, index }))
              .filter(({ minion }) => !minion.attackLockPending && !minion.attackLockedThisTurn);
            const selected = randomItem(candidates);
            if (selected) {
              selected.minion.attackLockPending = true;
              selected.minion.attackLockKind = "raid";
              result.lockedTarget = selected.minion.instanceId;
              result.affectedTargets.push(selected.minion.instanceId);
              publish("status:raid", {
                actor: side,
                side: enemy,
                phase: "pending",
                target: { zone: "board", side: enemy, index: selected.index },
                instanceId: selected.minion.instanceId,
              });
            } else {
              state.heroes[side].armor += 1;
              result.actualArmorGained = 1;
            }
          }
          publish("faction:link", {
            actor: side,
            side,
            faction: normalizeFactionGroup(source.faction),
            linkKind,
            linkName: result.linkName,
            source: source.instanceId,
            result,
          });
        } else if (op === "summon_token") {
          summonToken(side, ability.tokenId, numberOr(ability.count, 1), source);
        } else if (op === "reduce_random_hand_cost") {
          if (preview.selected) {
            preview.selected.currentCost = Math.max(
              0,
              preview.selected.currentCost - Math.max(0, amount),
            );
            preview.selected.cost = preview.selected.currentCost;
          }
        } else if (op === "ready_random_friendly") {
          if (preview.selected && !preview.selected.attackLockedThisTurn) {
            preview.selected.canAttack = true;
            preview.selected.attacksLeft = Math.max(1, preview.selected.attacksLeft);
          }
        }
      }

      function executeAbilities(side, source, trigger, context) {
        const abilities = Array.isArray(source.abilities) ? source.abilities : [];
        for (let index = 0; index < abilities.length; index += 1) {
          const ability = abilities[index];
          if (!ability || ability.trigger !== trigger || !ability.op) continue;
          executeAbility(side, source, ability, context || {});
          if (!resolvingDeaths) resolveDeaths();
          if (checkGameEnd("effect")) break;
        }
      }

      function resolveDeaths() {
        if (resolvingDeaths) return;
        resolvingDeaths = true;
        try {
          let found = true;
          while (found && state.phase === "playing") {
            found = false;
            const dead = [];
            SIDES.forEach((side) => {
              for (let index = state.boards[side].length - 1; index >= 0; index -= 1) {
                const minion = state.boards[side][index];
                if (minion.currentHealth <= 0) {
                  found = true;
                  state.boards[side].splice(index, 1);
                  dead.push({ side, minion, index });
                }
              }
            });
            dead.reverse().forEach(({ side, minion, index }) => {
              publish("minion:death", {
                actor: side,
                side,
                index,
                target: { zone: "board", side, index },
                instanceId: minion.instanceId,
                cardId: minion.id,
                name: minion.name,
              });
              executeAbilities(side, minion, "onDeath", { sourceIndex: index });
            });
          }
        } finally {
          resolvingDeaths = false;
        }
        checkGameEnd("effect");
      }

      function drawCard(side, opening, source) {
        if (state.phase === "ended") return null;
        const deck = state.decks[side];
        if (!deck.length) {
          const hero = state.heroes[side];
          hero.fatigue += 1;
          publish("card:draw", {
            actor: side,
            fatigue: hero.fatigue,
            emptyDeck: true,
            opening: Boolean(opening),
          });
          damageHero(side, hero.fatigue, {
            side: OTHER_SIDE[side],
            op: "fatigue",
            source: source ? source.instanceId : null,
          });
          return null;
        }
        const card = deck.shift();
        const burned = state.hands[side].length >= HAND_LIMIT;
        if (!burned) state.hands[side].push(card);
        publish("card:draw", {
          actor: side,
          card: deepClone(card),
          cardId: card.id,
          instanceId: card.instanceId,
          burned,
          opening: Boolean(opening),
        });
        return burned ? null : card;
      }

      function resolvePatienceCounters(side) {
        const counters = state.boards[side]
          .filter((minion) => numberOr(minion.storedCounter, 0) > 0)
          .map((minion) => ({ minion, amount: Math.max(0, numberOr(minion.storedCounter, 0)) }));
        counters.forEach(({ minion, amount }) => {
          if (state.phase !== "playing") return;
          minion.storedCounter = 0;
          const enemy = OTHER_SIDE[side];
          const candidates = state.boards[enemy].map((target, index) => ({ target, index }));
          const selected = randomItem(candidates);
          const targetReference = selected
            ? { zone: "board", side: enemy, index: selected.index }
            : { zone: "hero", side: enemy };
          publish("status:counter", {
            actor: side,
            side,
            phase: "released",
            source: minion.instanceId,
            target: deepClone(targetReference),
            amount,
          });
          if (selected) {
            damageMinion(enemy, selected.target, amount, {
              side,
              instanceId: minion.instanceId,
              op: "patience_counter",
            });
            resolveDeaths();
          } else {
            damageHero(enemy, amount, {
              side,
              instanceId: minion.instanceId,
              op: "patience_counter",
            });
          }
        });
      }

      function resolveTurnEndStatuses(side) {
        const burningTargets = state.boards[side]
          .filter((minion) => numberOr(minion.burning, 0) > 0)
          .map((minion) => ({ minion, burning: Math.max(0, numberOr(minion.burning, 0)) }));
        const ownsDeathBatch = burningTargets.length > 0 && !resolvingDeaths;
        if (ownsDeathBatch) resolvingDeaths = true;
        try {
          burningTargets.forEach(({ minion, burning }) => {
            const index = state.boards[side].findIndex(
              (candidate) => candidate.instanceId === minion.instanceId,
            );
            if (index < 0) return;
            minion.burning = Math.max(0, burning - 1);
            publish("status:burn", {
              actor: OTHER_SIDE[side],
              side,
              phase: "tick",
              target: { zone: "board", side, index },
              amount: burning,
              burningBefore: burning,
              burningAfter: minion.burning,
            });
            damageMinion(side, minion, burning, {
              side: OTHER_SIDE[side],
              op: "burning",
            });
          });
        } finally {
          if (ownsDeathBatch) resolvingDeaths = false;
        }
        if (ownsDeathBatch) resolveDeaths();
        if (state.phase !== "playing") return;

        const recoilTargets = state.boards[side].filter(
          (minion) => minion.secondAttackPenalty,
        );
        const ownsRecoilBatch = recoilTargets.length > 0 && !resolvingDeaths;
        if (ownsRecoilBatch) resolvingDeaths = true;
        try {
          recoilTargets.forEach((minion) => {
            minion.secondAttackPenalty = false;
            const amount = Math.max(
              0,
              numberOr(
                minion.combat?.secondAttackSelfDamage,
                Array.isArray(minion.keywords) && minion.keywords.includes("천하무쌍") ? 2 : 0,
              ),
            );
            if (amount > 0) {
              damageMinion(side, minion, amount, {
                side,
                instanceId: minion.instanceId,
                op: "second_attack_penalty",
              });
            }
          });
        } finally {
          if (ownsRecoilBatch) resolvingDeaths = false;
        }
        if (ownsRecoilBatch) resolveDeaths();
        if (state.phase !== "playing") return;

        state.boards[side].forEach((minion) => {
          const temporaryBonus = Math.max(0, numberOr(minion.temporaryAttackBonus, 0));
          if (temporaryBonus > 0) {
            minion.currentAttack = Math.max(0, minion.currentAttack - temporaryBonus);
            minion.temporaryAttackBonus = 0;
          }
          if (minion.attackPenaltyUntil === "ownerTurnEnd") {
            const penalty = Math.max(0, numberOr(minion.attackPenalty, 0));
            minion.currentAttack += penalty;
            minion.attackPenalty = 0;
            minion.attackPenaltyUntil = null;
          }
          if (minion.attackLockedThisTurn) {
            minion.attackLockedThisTurn = false;
            minion.attackLockKind = null;
          }
        });
      }

      function startTurn(side, initial) {
        if (state.phase === "ended") return;
        state.turn = side;
        const hero = state.heroes[side];
        const commander = commanderFor(side);
        commander.powerUsedThisTurn = false;
        hero.maxMana = Math.min(MAX_MANA, hero.maxMana + 1);
        hero.mana = hero.maxMana;
        resolvePatienceCounters(side);
        if (state.phase !== "playing") return;
        state.boards[side].forEach((minion) => {
          if (minion.attackLockPending) {
            minion.attackLockPending = false;
            const target = {
              zone: "board",
              side,
              index: state.boards[side].findIndex(
                (candidate) => candidate.instanceId === minion.instanceId,
              ),
            };
            if (minion.attackLockKind === "raid") {
              const normalAttacks = minion.currentAttack > 0
                ? Math.max(1, numberOr(minion.maxAttacksPerTurn, 1))
                : 0;
              minion.attackLockedThisTurn = false;
              minion.attacksLeft = Math.max(0, normalAttacks - 1);
              minion.canAttack = minion.attacksLeft > 0;
              publish("status:raid", {
                actor: OTHER_SIDE[side],
                side,
                phase: "active",
                target,
                instanceId: minion.instanceId,
                blockedAttacks: normalAttacks > 0 ? 1 : 0,
                attacksRemaining: minion.attacksLeft,
              });
              minion.attackLockKind = null;
            } else {
              minion.attackLockedThisTurn = true;
              minion.attacksLeft = 0;
              minion.canAttack = false;
              publish("commander:lock", {
                actor: OTHER_SIDE[side],
                side: OTHER_SIDE[side],
                commanderId: commanderFor(OTHER_SIDE[side]).id,
                powerId: COMMANDER_DEFINITIONS.nomad.powerId,
                target,
                status: "active",
                lockedTarget: {
                  id: minion.id,
                  instanceId: minion.instanceId,
                  name: minion.name || "",
                },
              });
            }
          } else {
            minion.attackLockedThisTurn = false;
            minion.attacksLeft = minion.currentAttack > 0
              ? Math.max(1, numberOr(minion.maxAttacksPerTurn, 1))
              : 0;
            minion.canAttack = minion.currentAttack > 0;
          }
          minion.attacksMadeThisTurn = 0;
          minion.secondAttackPenalty = false;
        });
        drawCard(side, false, null);
        if (state.phase === "playing") {
          publish("turn:start", {
            actor: side,
            turnNumber: state.turnNumber,
            mana: hero.mana,
            commanderId: commander.id,
            powerUsedThisTurn: commander.powerUsedThisTurn,
            reflectCharges: commander.reflectCharges,
            initial: Boolean(initial),
          });
        }
      }

      function cardTargetKind(card) {
        if (!card) return "none";
        if (["enemy", "friendly", "any", "enemyMinion"].includes(card.target)) {
          return card.target;
        }
        const abilities = Array.isArray(card.abilities) ? card.abilities : [];
        return abilities.some(
          (ability) =>
            ability &&
            (ability.target === "enemyMinion" ||
              ability.op === "duel_target" ||
              ability.op === "steal_enemy_minion" ||
              ability.op === "steal_enemy_minion_max_cost"),
        )
          ? "enemyMinion"
          : "none";
      }

      function targetedAbilityKind(card) {
        const abilities = Array.isArray(card.abilities) ? card.abilities : [];
        if (
          cardTargetKind(card) === "enemyMinion" ||
          abilities.some(
            (ability) =>
              ability.op === "buff_target" ||
              ability.op === "duel_target" ||
              ability.op === "steal_enemy_minion" ||
              ability.op === "steal_enemy_minion_max_cost",
          )
        ) {
          return "minion";
        }
        return "any";
      }

      function targetMaxCost(card) {
        const abilities = Array.isArray(card.abilities) ? card.abilities : [];
        const ability = abilities.find(
          (candidate) => candidate && candidate.op === "steal_enemy_minion_max_cost",
        );
        return ability ? Math.max(0, numberOr(ability.maxCost, 0)) : null;
      }

      function targetMinCost(card) {
        const abilities = Array.isArray(card.abilities) ? card.abilities : [];
        const ability = abilities.find(
          (candidate) =>
            candidate &&
            candidate.op === "steal_enemy_minion" &&
            candidate.minCost != null,
        );
        return ability ? Math.max(0, numberOr(ability.minCost, 0)) : null;
      }

      function legalCardTargets(card, side) {
        const kind = cardTargetKind(card);
        if (kind === "none") return [null];
        const targetKind = targetedAbilityKind(card);
        const sides =
          kind === "enemy" || kind === "enemyMinion"
            ? [OTHER_SIDE[side]]
            : kind === "friendly"
              ? [side]
              : SIDES;
        const maxCost = targetMaxCost(card);
        const minCost = targetMinCost(card);
        const targets = [];
        sides.forEach((targetSide) => {
          if (targetKind === "any") targets.push({ zone: "hero", side: targetSide });
          state.boards[targetSide].forEach((minion, index) => {
            if (
              maxCost != null &&
              Math.max(0, numberOr(minion.currentCost, numberOr(minion.cost, 0))) > maxCost
            ) {
              return;
            }
            if (
              minCost != null &&
              Math.max(0, numberOr(minion.currentCost, numberOr(minion.cost, 0))) < minCost
            ) {
              return;
            }
            targets.push({ zone: "board", side: targetSide, index });
          });
        });
        return targets;
      }

      function validateCardTarget(card, side, target) {
        const legal = legalCardTargets(card, side);
        if (cardTargetKind(card) === "none") return target == null;
        return legal.some(
          (candidate) =>
            candidate &&
            target &&
            candidate.zone === target.zone &&
            candidate.side === target.side &&
            (candidate.zone === "hero" || candidate.index === Number(target.index)),
        );
      }

      function canPlayCard(side, handIndex, target, placement) {
        if (state.phase !== "playing") return { ok: false, reason: "game_ended" };
        if (state.turn !== side) return { ok: false, reason: "not_your_turn" };
        if (!SIDES.includes(side)) return { ok: false, reason: "invalid_side" };
        if (!Number.isInteger(handIndex) || !state.hands[side][handIndex]) {
          return { ok: false, reason: "invalid_hand_index" };
        }
        const card = state.hands[side][handIndex];
        const resolvedPlacement = choosePlacement(side, placement);
        if (state.boards[side].length >= BOARD_LIMIT || !resolvedPlacement) {
          return { ok: false, reason: "board_full" };
        }
        if (state.heroes[side].mana < card.currentCost) {
          return { ok: false, reason: "insufficient_mana" };
        }
        if (!validateCardTarget(card, side, target)) {
          return { ok: false, reason: "invalid_target" };
        }
        return { ok: true, card, placement: resolvedPlacement };
      }

      function playCard(side, handIndex, target, placement) {
        const validation = canPlayCard(side, handIndex, target, placement);
        if (!validation.ok) return fail(side, validation.reason, { handIndex, target, placement });
        const card = state.hands[side].splice(handIndex, 1)[0];
        state.heroes[side].mana -= card.currentCost;
        const minion = createMinion(card, side);
        const resolvedPlacement = placeMinion(side, minion, validation.placement, "play");
        publish("card:play", {
          actor: side,
          handIndex,
          card: deepClone(card),
          cardId: card.id,
          instanceId: minion.instanceId,
          target: target || null,
          boardIndex: state.boards[side].length - 1,
          placement: deepClone(resolvedPlacement),
          manaRemaining: state.heroes[side].mana,
        });
        executeAbilities(side, minion, "onPlay", {
          target: target || null,
          sourceIndex: state.boards[side].length - 1,
          placement: deepClone(resolvedPlacement),
        });
        resolveDeaths();
        checkGameEnd("effect");
        return succeed({ instanceId: minion.instanceId, placement: deepClone(resolvedPlacement) });
      }

      function legalCommanderPowerTargets(side) {
        const commander = commanderFor(side);
        if (commander.id !== "nomad") return [null];
        const enemy = OTHER_SIDE[side];
        return state.boards[enemy]
          .map((minion, index) =>
            minion.attackLockPending || minion.attackLockedThisTurn
              ? null
              : { zone: "board", side: enemy, index },
          )
          .filter(Boolean);
      }

      function canUseCommanderPower(side, target, requestedCommanderId) {
        if (state.phase !== "playing") return { ok: false, reason: "game_ended" };
        if (!SIDES.includes(side)) return { ok: false, reason: "invalid_side" };
        if (state.turn !== side) return { ok: false, reason: "not_your_turn" };
        const commander = commanderFor(side);
        const definition = commander.id ? COMMANDER_DEFINITIONS[commander.id] : null;
        if (!definition) return { ok: false, reason: "commander_missing" };
        if (
          requestedCommanderId != null &&
          normalizeCommanderId(requestedCommanderId) !== commander.id
        ) {
          return { ok: false, reason: "commander_mismatch" };
        }
        if (!definition.active) return { ok: false, reason: "passive_commander" };
        if (commander.powerUsedThisTurn) {
          return { ok: false, reason: "power_already_used" };
        }
        if (
          commander.id === "caocao" &&
          state.heroes[side].health >= state.heroes[side].maxHealth
        ) {
          return { ok: false, reason: "hero_full_health" };
        }
        if (state.heroes[side].mana < definition.powerCost) {
          return { ok: false, reason: "insufficient_mana" };
        }
        if (commander.id === "nomad") {
          if (!target) return { ok: false, reason: "target_required" };
          if (
            target.zone !== "board" ||
            target.side !== OTHER_SIDE[side] ||
            !Number.isInteger(Number(target.index))
          ) {
            return { ok: false, reason: "invalid_target" };
          }
          const minion = state.boards[target.side][Number(target.index)];
          if (!minion) return { ok: false, reason: "target_missing" };
          if (minion.attackLockPending || minion.attackLockedThisTurn) {
            return { ok: false, reason: "target_already_locked" };
          }
          return { ok: true, commander, definition, target: { entity: minion } };
        }
        if (target != null) return { ok: false, reason: "invalid_target" };
        return { ok: true, commander, definition, target: null };
      }

      function applySimultaneousCharacterDamage(references, amount, source) {
        const ownsDeathBatch = !resolvingDeaths;
        if (ownsDeathBatch) resolvingDeaths = true;
        try {
          references.forEach((reference) => {
            const target = findTarget(reference);
            if (!target) return;
            if (target.zone === "hero") {
              damageHero(target.side, amount, source);
            } else {
              damageMinion(target.side, target.entity, amount, source);
            }
          });
        } finally {
          if (ownsDeathBatch) resolvingDeaths = false;
        }
        if (ownsDeathBatch) resolveDeaths();
      }

      function activateCommanderPower(side, target, requestedCommanderId) {
        const validation = canUseCommanderPower(side, target, requestedCommanderId);
        if (!validation.ok) {
          return fail(side, validation.reason, {
            commanderId: requestedCommanderId || commanderFor(side).id,
            target: target || null,
          });
        }
        const { commander, definition } = validation;
        const enemy = OTHER_SIDE[side];
        const hero = state.heroes[side];
        hero.mana -= definition.powerCost;
        commander.powerUsedThisTurn = true;
        let resolvedTarget = null;
        const result = emptyEffectResult();

        if (commander.id === "caocao") {
          const healthBefore = hero.health;
          const healingAmount = Math.max(0, numberOr(definition.powerAmount, 0));
          const actualHealing = Math.max(
            0,
            Math.min(healingAmount, hero.maxHealth - hero.health),
          );
          hero.health = clamp(hero.health + healingAmount, 0, hero.maxHealth);
          resolvedTarget = { zone: "hero", side };
          result.actualHealing = actualHealing;
          result.healthBefore = healthBefore;
          result.healthAfter = hero.health;
        } else if (commander.id === "sunquan") {
          const references = [
            { zone: "hero", side: enemy },
            ...state.boards[enemy].map((_minion, index) => ({
              zone: "board",
              side: enemy,
              index,
            })),
          ];
          resolvedTarget = { zone: "characters", side: enemy, all: true };
          result.affectedTargets = references.map((reference) => ({
            target: deepClone(reference),
            ...previewDamage(reference, 1),
          }));
          result.actualDamage = result.affectedTargets.reduce(
            (total, outcome) => total + outcome.actualDamage,
            0,
          );
          result.blockedByShield = result.affectedTargets.some(
            (outcome) => outcome.blockedByShield,
          );
          result.shieldBroken = result.blockedByShield;
          publish("commander:power", {
            actor: side,
            side,
            commanderId: commander.id,
            faction: commander.faction,
            powerId: commander.powerId,
            cost: definition.powerCost,
            target: resolvedTarget,
            result,
            manaRemaining: hero.mana,
          });
          applySimultaneousCharacterDamage(references, 1, {
            side,
            op: "commander_power",
            commanderId: commander.id,
            powerId: commander.powerId,
          });
          checkGameEnd("commander_power");
          return succeed({
            commanderId: commander.id,
            powerId: commander.powerId,
            result: deepClone(result),
          });
        } else if (commander.id === "nomad") {
          const index = Number(target.index);
          const minion = state.boards[target.side][index];
          resolvedTarget = { zone: "board", side: target.side, index };
          minion.attackLockPending = true;
          minion.attackLockedThisTurn = false;
          minion.attackLockKind = "commander";
          result.lockedTarget = {
            id: minion.id,
            instanceId: minion.instanceId,
            name: minion.name || "",
            owner: target.side,
            pending: true,
          };
        }

        publish("commander:power", {
          actor: side,
          side,
          commanderId: commander.id,
          faction: commander.faction,
          powerId: commander.powerId,
          cost: definition.powerCost,
          target: resolvedTarget,
          result,
          manaRemaining: hero.mana,
        });
        if (commander.id === "nomad") {
          publish("commander:lock", {
            actor: side,
            side,
            commanderId: commander.id,
            powerId: commander.powerId,
            target: resolvedTarget,
            status: "pending",
            result: deepClone(result),
          });
        }
        return succeed({
          commanderId: commander.id,
          powerId: commander.powerId,
          result: deepClone(result),
        });
      }

      function legalAttackTargets(side, attacker) {
        const enemy = OTHER_SIDE[side];
        const frontGuards = [];
        const rearGuards = [];
        state.boards[enemy].forEach((minion, index) => {
          if (!minion.guard) return;
          const target = { zone: "board", side: enemy, index };
          if (minion.row === "rear") rearGuards.push(target);
          else frontGuards.push(target);
        });
        if (frontGuards.length) return frontGuards;
        if (rearGuards.length) {
          const frontTargets = state.boards[enemy]
            .map((minion, index) =>
              minion.row === "front" ? { zone: "board", side: enemy, index } : null,
            )
            .filter(Boolean);
          return frontTargets.concat(rearGuards);
        }
        const keywords = Array.isArray(attacker?.keywords) ? attacker.keywords : [];
        const bypassesLane = keywords.includes("저격") || keywords.includes("돌파");
        const bypassesCommanderScreen = keywords.includes("저격");
        const rearSlots = new Set(
          state.boards[enemy]
            .filter((minion) => minion.row === "rear")
            .map((minion) => minion.slot),
        );
        const targets = [];
        if (bypassesCommanderScreen || rearSlots.size < FORMATION_SLOTS) {
          targets.push({ zone: "hero", side: enemy });
        }
        state.boards[enemy].forEach((minion, index) => {
          const laneBlocked =
            minion.row === "rear" &&
            !bypassesLane &&
            state.boards[enemy].some(
              (candidate) => candidate.row === "front" && candidate.slot === minion.slot,
            );
          if (laneBlocked) return;
          targets.push({ zone: "board", side: enemy, index });
        });
        return targets;
      }

      function canAttack(side, attackerIndex, targetReference) {
        if (state.phase !== "playing") return { ok: false, reason: "game_ended" };
        if (!SIDES.includes(side)) return { ok: false, reason: "invalid_side" };
        if (state.turn !== side) return { ok: false, reason: "not_your_turn" };
        const attacker = state.boards[side][attackerIndex];
        if (!Number.isInteger(attackerIndex) || !attacker) {
          return { ok: false, reason: "invalid_attacker" };
        }
        if (attacker.attackLockedThisTurn) {
          return { ok: false, reason: "attacker_locked" };
        }
        if (!attacker.canAttack || attacker.attacksLeft <= 0 || attacker.currentAttack <= 0) {
          return { ok: false, reason: "attacker_not_ready" };
        }
        const legal = legalAttackTargets(side, attacker);
        const requestedTarget = findTarget(targetReference);
        const enemy = OTHER_SIDE[side];
        const frontGuardTargets = state.boards[enemy]
          .map((minion, index) =>
            minion.guard && minion.row !== "rear"
              ? { zone: "board", side: enemy, index }
              : null,
          )
          .filter(Boolean);
        const rearGuardTargets = state.boards[enemy]
          .map((minion, index) =>
            minion.guard && minion.row === "rear"
              ? { zone: "board", side: enemy, index }
              : null,
          )
          .filter(Boolean);
        const requestedNeedsRearProtection =
          requestedTarget?.zone === "hero" ||
          (requestedTarget?.zone === "board" && requestedTarget.entity.row === "rear");
        const guardTargets = frontGuardTargets.length
          ? frontGuardTargets
          : requestedNeedsRearProtection
            ? rearGuardTargets
            : [];
        const requestedIsRelevantGuard = guardTargets.some(
          (candidate) =>
            targetReference?.zone === "board" &&
            candidate.index === Number(targetReference.index),
        );
        const blockedByGuard =
          guardTargets.length > 0 &&
          requestedTarget &&
          requestedTarget.side === enemy &&
          !requestedIsRelevantGuard;
        if (blockedByGuard) {
          return {
            ok: false,
            reason: "invalid_attack_target",
            blockedByGuard: true,
            side,
            targetSide: enemy,
            target: deepClone(targetReference),
            guardTargets: deepClone(guardTargets),
          };
        }
        const attackerKeywords = Array.isArray(attacker.keywords) ? attacker.keywords : [];
        const bypassesLane =
          attackerKeywords.includes("저격") || attackerKeywords.includes("돌파");
        const bypassesCommanderScreen = attackerKeywords.includes("저격");
        const pathBlockers = [];
        if (
          requestedTarget?.zone === "board" &&
          requestedTarget.side === enemy &&
          requestedTarget.entity.row === "rear" &&
          !requestedTarget.entity.guard &&
          !bypassesLane
        ) {
          state.boards[enemy].forEach((minion, index) => {
            if (minion.row === "front" && minion.slot === requestedTarget.entity.slot) {
              pathBlockers.push({ zone: "board", side: enemy, index });
            }
          });
        } else if (
          requestedTarget?.zone === "hero" &&
          requestedTarget.side === enemy &&
          !bypassesCommanderScreen
        ) {
          const rearBySlot = new Map();
          state.boards[enemy].forEach((minion, index) => {
            if (minion.row === "rear") {
              rearBySlot.set(minion.slot, { zone: "board", side: enemy, index });
            }
          });
          if (rearBySlot.size === FORMATION_SLOTS) {
            pathBlockers.push(...Array.from(rearBySlot.values()));
          }
        }
        const formationReason = requestedTarget?.zone === "hero"
          ? "commander_paths_blocked"
          : "column_path_blocked";
        const blockedByFormation =
          !frontGuardTargets.length &&
          pathBlockers.length > 0;
        if (blockedByFormation) {
          return {
            ok: false,
            reason: "invalid_attack_target",
            blockedByFormation: true,
            side,
            targetSide: enemy,
            target: deepClone(targetReference),
            frontTargets: deepClone(pathBlockers),
            pathBlockers: deepClone(pathBlockers),
            formationReason,
          };
        }
        const targetIsLegal = legal.some(
          (candidate) =>
            targetReference &&
            candidate.zone === targetReference.zone &&
            candidate.side === targetReference.side &&
            (candidate.zone === "hero" || candidate.index === Number(targetReference.index)),
        );
        if (!targetIsLegal) return { ok: false, reason: "invalid_attack_target" };
        const target = findTarget(targetReference);
        if (!target) return { ok: false, reason: "target_missing" };
        return { ok: true, attacker, target };
      }

      function attack(side, attackerIndex, targetReference) {
        const validation = canAttack(side, attackerIndex, targetReference);
        if (!validation.ok) {
          if (validation.blockedByFormation) {
            publish("formation:block", {
              actor: side,
              side,
              attackerIndex,
              target: deepClone(targetReference),
              targetSide: validation.targetSide,
              frontTargets: validation.frontTargets || [],
              pathBlockers: validation.pathBlockers || validation.frontTargets || [],
              reason: validation.formationReason || "column_path_blocked",
            });
          }
          return fail(side, validation.formationReason || validation.reason, {
            attackerIndex,
            target: targetReference,
            side,
            blockedByGuard: Boolean(validation.blockedByGuard),
            blockedByFormation: Boolean(validation.blockedByFormation),
            targetSide:
              validation.targetSide ||
              (targetReference && SIDES.includes(targetReference.side)
                ? targetReference.side
                : null),
            guardTargets: validation.guardTargets || [],
            frontTargets: validation.frontTargets || [],
            pathBlockers: validation.pathBlockers || validation.frontTargets || [],
            formationReason: validation.formationReason || null,
          });
        }
        const { attacker, target } = validation;
        attacker.attacksLeft -= 1;
        attacker.attacksMadeThisTurn = numberOr(attacker.attacksMadeThisTurn, 0) + 1;
        if (
          attacker.attacksMadeThisTurn >= 2 &&
          Math.max(
            0,
            numberOr(
              attacker.combat?.secondAttackSelfDamage,
              Array.isArray(attacker.keywords) && attacker.keywords.includes("천하무쌍")
                ? 2
                : 0,
            ),
          ) > 0
        ) {
          attacker.secondAttackPenalty = true;
        }
        attacker.canAttack = attacker.attacksLeft > 0;
        publish("attack:start", {
          actor: side,
          attackerIndex,
          attacker: { zone: "board", side, index: attackerIndex },
          attackerId: attacker.instanceId,
          cardId: attacker.id,
          name: attacker.name || "",
          faction: attacker.faction || "",
          role: attacker.role || "",
          keywords: Array.isArray(attacker.keywords) ? attacker.keywords.slice() : [],
          weapon: attacker.portrait?.weapon || attacker.weapon || "",
          attackerMeta: {
            instanceId: attacker.instanceId,
            cardId: attacker.id,
            id: attacker.id,
            name: attacker.name || "",
            faction: attacker.faction || "",
            role: attacker.role || "",
            keywords: Array.isArray(attacker.keywords) ? attacker.keywords.slice() : [],
            weapon: attacker.portrait?.weapon || attacker.weapon || "",
            attack: attacker.currentAttack,
            health: attacker.currentHealth,
          },
          target: deepClone(targetReference),
        });
        const attackPower = Math.max(0, attacker.currentAttack);
        if (target.zone === "hero") {
          const reflects = canReflectHeroAttack(target.side);
          const ownsReflectionBatch = reflects && !resolvingDeaths;
          if (ownsReflectionBatch) resolvingDeaths = true;
          try {
            damageHero(target.side, attackPower, {
              side,
              instanceId: attacker.instanceId,
              op: "attack",
            });
            if (reflects) {
              reflectHeroAttack(target.side, {
                zone: "board",
                side,
                index: attackerIndex,
              });
            }
          } finally {
            if (ownsReflectionBatch) resolvingDeaths = false;
          }
        } else {
          const retaliation = Math.max(0, target.entity.currentAttack);
          damageMinion(target.side, target.entity, attackPower, {
            side,
            instanceId: attacker.instanceId,
            op: "attack",
          });
          damageMinion(side, attacker, retaliation, {
            side: target.side,
            instanceId: target.entity.instanceId,
            op: "retaliation",
          });
        }
        publish("attack:hit", {
          actor: side,
          attackerId: attacker.instanceId,
          target: deepClone(targetReference),
          amount: attackPower,
        });
        resolveDeaths();
        checkGameEnd("combat");
        return succeed();
      }

      function endTurn(side) {
        if (state.phase !== "playing") return fail(side, "game_ended");
        if (!SIDES.includes(side)) return fail(side, "invalid_side");
        if (state.turn !== side) return fail(side, "not_your_turn");
        publish("turn:end", { actor: side, turnNumber: state.turnNumber });
        resolveTurnEndStatuses(side);
        if (state.phase === "ended") return succeed();
        state.turnNumber += 1;
        startTurn(OTHER_SIDE[side], false);
        return succeed();
      }

      function concede(side) {
        if (state.phase !== "playing") return fail(side, "game_ended");
        if (!SIDES.includes(side)) return fail(side, "invalid_side");
        endGame(OTHER_SIDE[side], "concede");
        return succeed();
      }

      function getLegalActions(side) {
        const actor = side == null ? state.turn : side;
        if (state.phase !== "playing" || actor !== state.turn || !SIDES.includes(actor)) return [];
        const actions = [];
        state.hands[actor].forEach((card, handIndex) => {
          if (state.heroes[actor].mana < card.currentCost) return;
          if (state.boards[actor].length >= BOARD_LIMIT) return;
          const placements = legalPlacements(actor);
          legalCardTargets(card, actor).forEach((target) => {
            placements.forEach((placement) => {
              const action = {
                type: "playCard",
                side: actor,
                handIndex,
                placement: deepClone(placement),
              };
              if (target) action.target = deepClone(target);
              actions.push(action);
            });
          });
        });
        state.boards[actor].forEach((minion, attackerIndex) => {
          if (!minion.canAttack || minion.attacksLeft <= 0 || minion.currentAttack <= 0) return;
          legalAttackTargets(actor, minion).forEach((target) => {
            actions.push({
              type: "attack",
              side: actor,
              attackerIndex,
              target: deepClone(target),
            });
          });
        });
        const commander = commanderFor(actor);
        if (commander.id && COMMANDER_DEFINITIONS[commander.id]?.active) {
          legalCommanderPowerTargets(actor).forEach((target) => {
            if (!canUseCommanderPower(actor, target, commander.id).ok) return;
            const action = {
              type: COMMANDER_POWER_ACTION,
              side: actor,
              commanderId: commander.id,
            };
            if (target) action.target = deepClone(target);
            actions.push(action);
          });
        }
        actions.push({ type: "endTurn", side: actor });
        return actions;
      }

      function applyAction(action) {
        if (!action || typeof action !== "object") return fail(null, "invalid_action");
        if (action.type === "playCard") {
          return playCard(
            action.side,
            Number(action.handIndex),
            action.target,
            action.placement,
          );
        }
        if (action.type === "attack") {
          return attack(action.side, Number(action.attackerIndex), action.target);
        }
        if (action.type === COMMANDER_POWER_ACTION) {
          return activateCommanderPower(action.side, action.target, action.commanderId);
        }
        if (action.type === "endTurn") return endTurn(action.side);
        if (action.type === "concede") return concede(action.side);
        return fail(action.side || null, "unknown_action", { type: action.type });
      }

      function cloneForSimulation() {
        return buildRuntime({
          state: deepClone(state),
          rngState: rng.getState(),
          instanceSequence,
          logSequence,
          silent: true,
        });
      }

      if (restored) {
        state = deepClone(restored.state);
        state.commanders = state.commanders || {
          player: makeCommander(commanderSelections.player),
          ai: makeCommander(commanderSelections.ai),
        };
        SIDES.forEach((side) => {
          state.heroes[side].emptyFortCharges = Math.max(
            0,
            numberOr(state.heroes[side].emptyFortCharges, 0),
          );
          state.boards[side].forEach((minion) => {
            minion.maxAttacksPerTurn = Math.max(
              1,
              numberOr(
                minion.maxAttacksPerTurn,
                minion.combat?.attacksPerTurn ||
                  (Array.isArray(minion.keywords) && minion.keywords.includes("천하무쌍")
                    ? 2
                    : 1),
              ),
            );
            minion.attacksMadeThisTurn = Math.max(0, numberOr(minion.attacksMadeThisTurn, 0));
            minion.burning = Math.max(0, numberOr(minion.burning, 0));
            minion.attackPenalty = Math.max(0, numberOr(minion.attackPenalty, 0));
            minion.storedCounter = Math.max(0, numberOr(minion.storedCounter, 0));
            minion.temporaryAttackBonus = Math.max(
              0,
              numberOr(minion.temporaryAttackBonus, 0),
            );
          });
          ensureFormation(side);
        });
      } else {
        state = {
          phase: "playing",
          turn: "player",
          turnNumber: 1,
          winner: null,
          reason: "",
          heroes: { player: makeHero(), ai: makeHero() },
          commanders: {
            player: makeCommander(commanderSelections.player),
            ai: makeCommander(commanderSelections.ai),
          },
          hands: { player: [], ai: [] },
          decks: { player: [], ai: [] },
          boards: { player: [], ai: [] },
          log: [],
          revision: 0,
        };
        state.decks.player = normalizeDeck(config.playerDeck, definitionMap, makeCard);
        state.decks.ai = normalizeDeck(config.aiDeck, definitionMap, makeCard);
        shuffle(state.decks.player);
        shuffle(state.decks.ai);
        balanceOpeningCards(state.decks.player, 5);
        balanceOpeningCards(state.decks.ai, 5);
        publish("game:start", {
          seed: String(seed),
          playerDeckSize: state.decks.player.length,
          aiDeckSize: state.decks.ai.length,
          commanders: {
            player: state.commanders.player.id,
            ai: state.commanders.ai.id,
          },
        });
        for (let index = 0; index < 5; index += 1) drawCard("player", true, null);
        for (let index = 0; index < 5; index += 1) drawCard("ai", true, null);
        startTurn("player", true);
        touch();
      }

      return {
        getState() {
          return deepClone(state);
        },
        getLegalActions,
        playCard,
        attack,
        useCommanderPower: activateCommanderPower,
        endTurn,
        concede,
        applyAction,
        cloneForSimulation,
      };
    }

    return buildRuntime(null);
  }

  root.TK = root.TK || {};
  root.TK.modules = root.TK.modules || {};
  root.TK.modules.rulesEngine = {
    createGame,
    commanderDefinitions: deepClone(COMMANDER_DEFINITIONS),
    constants: {
      BOARD_LIMIT,
      FORMATION_ROWS: FORMATION_ROWS.slice(),
      FORMATION_SLOTS,
      HAND_LIMIT,
      MAX_MANA,
      STARTING_HEALTH,
      COMMANDER_POWER_ACTION,
    },
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
