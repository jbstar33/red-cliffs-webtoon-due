# 적벽전설 런타임 통합 계약

모든 시스템은 자기 디렉터리 안의 파일만 수정한다. 시스템 간 `import`,
`require`, 파일 경로 참조는 금지한다. 각 시스템은 브라우저에서 로드될 때
아래 전역 레지스트리에 팩토리를 등록하고, 실제 협업 객체는 메인 런타임이
전달하는 컨텍스트로만 받는다.

```js
globalThis.TK = globalThis.TK || { modules: {} };
globalThis.TK.modules.cardData = { ... };
```

## 공통 상태

```js
{
  phase: "playing" | "ended",
  turn: "player" | "ai",
  turnNumber: 1,
  winner: null | "player" | "ai" | "draw",
  reason: "",
  heroes: {
    player: { health: 30, maxHealth: 30, armor: 0, mana: 1, maxMana: 1, fatigue: 0 },
    ai:     { health: 30, maxHealth: 30, armor: 0, mana: 1, maxMana: 1, fatigue: 0 }
  },
  hands: { player: [cardInstance], ai: [cardInstance] },
  decks: { player: [cardInstance], ai: [cardInstance] },
  boards: { player: [minion], ai: [minion] },
  log: [{ id, type, actor, message, data }],
  revision: 0
}
```

`minion`은 카드 필드 외에 `instanceId`, `currentAttack`, `currentHealth`,
`maxHealth`, `canAttack`, `attacksLeft`, `shield`, `guard`를 가진다.

## 이벤트

룰 엔진은 생성 시 받은 `emit(type, detail)`을 호출한다. 주요 타입:

- `game:start`, `turn:start`, `turn:end`, `card:draw`, `card:play`
- `attack:start`, `attack:hit`, `minion:damage`, `hero:damage`
- `minion:death`, `effect:trigger`, `game:end`, `action:invalid`

메인 런타임은 이를 UI, FX, 오디오에 동시에 전달한다.

## 카드 데이터

등록명: `TK.modules.cardData`

```js
getCards()        // 카드 정의 19장
buildDeck(seed)   // 정확히 20개의 card id 배열
getToken(id)      // 소환 토큰 정의 또는 null
validate()        // { ok, errors, summary }
```

카드 정의:

```js
{
  id, name, courtesy, faction: "촉"|"위"|"오"|"군웅",
  cost, attack, health, rarity, role, text, flavor,
  keywords: ["돌진"|"수호"|"방패"],
  target: "none"|"enemy"|"friendly"|"any",
  abilities: [{ trigger: "onPlay"|"onDeath", op, amount?, attack?, health?, count?, tokenId? }],
  palette: { primary, secondary, glow },
  portrait: { motif, weapon, temperament }
}
```

지원 효과 `op`:

- `damage_target`, `damage_enemy_hero`, `damage_random_enemy`,
  `damage_all_enemies`
- `heal_friendly_hero`, `draw`, `gain_armor`
- `buff_target`, `buff_friendly_board`, `buff_adjacent`, `buff_self`
- `summon_token`, `reduce_random_hand_cost`, `ready_random_friendly`

## 룰 엔진

등록명: `TK.modules.rulesEngine`

```js
const game = createGame({
  definitions, tokens, playerDeck, aiDeck, seed, emit
});
game.getState()                    // 외부에서 변형하지 않는 스냅샷
game.getLegalActions(side?)        // 액션 배열
game.playCard(side, handIndex, target?)
game.attack(side, attackerIndex, target)
game.endTurn(side)
game.concede(side)
game.cloneForSimulation()          // AI 평가용 동일 API
```

타깃은 `{ zone:"hero", side }` 또는 `{ zone:"board", side, index }`.
보드는 한쪽 최대 5장, 시작 체력 30, 최대 마나 10, 턴 시작 드로우,
소환 멀미, 수호 우선 타격, 피로 피해, 승패 판정을 포함한다.

## 보드 UI

등록명: `TK.modules.boardUI`

```js
const ui = createBoardUI({
  root, canvas, getState, dispatch, requestAudioUnlock
});
ui.render(state)
ui.handleEvent(type, detail)
ui.setThinking(boolean)
ui.destroy()
```

`dispatch(action)` 액션:

- `{type:"PLAY_CARD", handIndex, target?}`
- `{type:"ATTACK", attackerIndex, target}`
- `{type:"END_TURN"}`, `{type:"RESTART"}`, `{type:"CONCEDE"}`
- `{type:"TOGGLE_MUTE"}`

Canvas 기반, 1365x768 논리 좌표, CSS로 반응형 letterbox 처리한다.
마우스와 터치 포인터 이벤트를 모두 지원한다.

## 상대 AI

등록명: `TK.modules.opponentAI`

```js
const ai = createAI({ rng });
ai.chooseAction({
  state,
  legalActions,
  simulate(action), // 실행 뒤 상태를 반환하는 순수 콜백
  difficulty: "strategist"
}) // action | null
```

## FX

등록명: `TK.modules.fxAnimation`

```js
const fx = createFX({ canvas, getAnchor, reducedMotion });
fx.handleEvent(type, detail)
fx.update(dt)
fx.render(ctx)
fx.shake(intensity)
fx.destroy()
```

FX 캔버스는 보드 Canvas 위에 겹치며 `pointer-events:none`이다.

## 오디오

등록명: `TK.modules.audio`

```js
const audio = createAudio();
audio.unlock()
audio.handleEvent(type, detail)
audio.play(name, options?)
audio.setMuted(boolean)
audio.isMuted()
audio.destroy()
```

외부 파일 없이 Web Audio API oscillator/noise/envelope로만 합성한다.

