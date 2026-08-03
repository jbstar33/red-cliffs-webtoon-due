# Rules Engine

브라우저에서 `index.js`를 로드하면 다음 팩토리가 등록됩니다.

```js
const game = globalThis.TK.modules.rulesEngine.createGame(context);
```

이 모듈은 다른 시스템을 직접 import하지 않습니다. 카드 정의, 토큰, 이벤트 콜백,
덱과 지휘관 선택을 모두 `createGame` 컨텍스트로 주입받습니다. `getState()`는 깊은
복사본을 반환하고 `cloneForSimulation()`은 현재 RNG 상태까지 복제한 무음 엔진을
반환합니다.

## 지휘관 설정

권장 입력은 다음과 같습니다.

```js
const game = createGame({
  definitions,
  tokens,
  playerDeck,
  aiDeck,
  commanders: {
    player: "caocao",
    ai: "liubei",
  },
  seed,
  emit(type, detail) {},
});
```

호환성을 위해 `commanderIds`, `playerCommander`, `playerCommanderId`,
`aiCommander`, `aiCommanderId`도 읽습니다. 알 수 없는 값은 지휘관 없음(`null`)으로
정규화됩니다.

| ID | 진영 | 비용 | 규칙 |
| --- | --- | ---: | --- |
| `caocao` | 위 | 1 | 턴당 한 번, 피해를 받은 아군 영웅 체력을 최대 30까지 1 회복 |
| `liubei` | 촉 | 0 | 게임 시작 시 반사 2회. 적이 유비 영웅을 공격하면 공격자에게 피해 1을 주고 1회 소모 |
| `sunquan` | 오 | 3 | 턴당 한 번, 적 영웅과 적 전장의 모든 장수에게 동시에 피해 1 |
| `nomad` | 군웅 | 2 | 턴당 한 번, 적 장수 하나가 그 소유자의 다음 턴에 공격하지 못하게 함 |

`liubei`는 패시브이므로 사용 액션이 생성되지 않습니다. 나머지 지휘관 능력은
마나가 충분하고 아직 사용하지 않았을 때만 법적 액션에 포함됩니다.

## 액션 계약

기존 액션 계약은 그대로 유지됩니다.

```js
{ type: "playCard", side, handIndex, target?, placement?: { row, slot } }
{ type: "attack", side, attackerIndex, target }
{ type: "endTurn", side }
```

양측 전장은 `front` 3칸과 `rear` 3칸, 총 6칸입니다. `placement`를 생략하거나
이미 찬 칸을 요청하면 `front` 0→2, `rear` 0→2 순서의 첫 빈칸에 자동
배치됩니다. `getLegalActions()`는 카드·대상 조합마다 모든 빈 배치를 돌려줍니다.
토큰 소환과 탈취 장수도 같은 자동 배치를 사용하며 장수 상태에는 `row`, `slot`이
항상 기록됩니다.

### 카드 키워드와 신규 효과

적 전열 장수가 한 명이라도 있으면 일반 장수는 적 후열 장수를 공격할 수 없습니다.
`"저격"` 또는 `"돌파"`는 전열 보호를 무시하지만, `"수호"`가 있으면 언제나
수호 장수만 공격할 수 있습니다. 즉 수호는 저격·돌파보다 우선합니다.

### 진영 연계와 고유 행동

다음 데이터 주도 DSL을 지원합니다.

```js
{ trigger: "onPlay", op: "faction_link", linkKind: "brotherhood" }
{ trigger: "onPlay", op: "duel_target", target: "enemyMinion" }
{ trigger: "onPlay", op: "weaken_enemy_front", amount: 1, duration: "nextEnemyTurnEnd" }
{ trigger: "onPlay", op: "empty_fort", requiredRow: "rear", requiresSolo: true, charges: 1 }
{ trigger: "onPlay", op: "patience_counter", maxStored: 2 }
{ trigger: "onPlay", op: "apply_burning_all", amount: 1 }
```

`faction_link`는 같은 진영의 다른 아군이 이미 있을 때만 발동합니다. 촉의
`brotherhood`는 두 장수의 체력을 +1, 위의 `strategy`는 손의 최고 비용 카드
비용을 1 감소(최소 1), 오의 `kindle`은 적에게 화상 1, 이민족의 `raid`는 다음
공격권 1회를 차감합니다. 군웅·남만·이민족은 같은 연계 집단입니다.

화상은 소유자 턴 종료에 중첩만큼 피해를 주고 1 감소합니다. `patience_counter`는
처음 받은 실제 피해 중 최대 지정량을 저장해 다음 아군 턴 시작에 되돌려 줍니다.
`combat: { attacksPerTurn: 2, secondAttackSelfDamage: 2 }`는 매 턴 두 번 공격과
두 번째 공격 후 턴 종료 반동을 선언합니다. `buff_self`의 `requiredRow: "rear"`,
`duration: "thisTurn"`도 지원합니다.

적 장수 선택 효과는 카드 또는 능력의 `target`에 `"enemyMinion"`을 사용합니다.

```js
{ trigger: "onPlay", op: "steal_enemy_minion", target: "enemyMinion" }
{
  trigger: "onPlay",
  op: "steal_enemy_minion_max_cost",
  maxCost: 1,
  target: "enemyMinion"
}
{ trigger: "onPlay", op: "grant_all_allies_armor", amount: 1 }
```

탈취한 장수는 상대 전장에서 아군 전장으로 이동하고 `controller`가 변경됩니다.
이전의 공격권과 공격 봉쇄 상태는 제거되며, 즉시 공격할 수 없고 다음 아군 턴
시작부터 정상적으로 공격할 수 있습니다. 아군 전장이 가득 찼거나 대상이 없으면
효과만 불발되고, 비용 제한 효과는 `currentCost`를 우선해 검사합니다.

`grant_all_allies_armor`는 효과 해결 시점의 아군 전장 전체에 장수 방어력을
부여합니다. 장수 상태에는 같은 현재값을 나타내는 `armor`와 `currentArmor`가
함께 기록되며, 방패가 없을 때 피해보다 먼저 소모됩니다.

지휘관 능력은 정확히 다음 타입을 사용합니다.

```js
// 조조, 손권
{ type: "USE_COMMANDER_POWER", side, commanderId }

// 유목 군주
{
  type: "USE_COMMANDER_POWER",
  side,
  commanderId: "nomad",
  target: { zone: "board", side: enemySide, index }
}
```

모든 액션은 `applyAction(action)`으로 실행할 수 있습니다. 직접 호출이 필요한
통합부를 위해 `useCommanderPower(side, target?, commanderId?)`도 제공합니다.
지휘관 ID가 실제 선택과 다르면 `commander_mismatch`, 마나 부족은
`insufficient_mana`, 중복 사용은 `power_already_used`, 잘못된 유목 군주 대상은
`target_required`, `invalid_target`, `target_missing`, `target_already_locked` 중
하나를 반환합니다. 조조는 영웅 체력이 가득 찼을 때 법적 액션에서 제외되며 직접
호출도 마나나 사용권을 소모하지 않고 `hero_full_health`를 반환합니다.

## 상태 계약

기존 `heroes` 구조는 변경하지 않았습니다. 지휘관 상태는 최상위
`state.commanders.player`와 `state.commanders.ai`에 저장됩니다.

```js
{
  id,
  faction,
  powerId,
  powerCost,
  powerUsedThisTurn,
  reflectCharges
}
```

유목 군주의 대상 장수에는 다음 두 상태가 붙습니다.

```js
{
  attackLockPending,    // 대상 지정 후, 소유자의 다음 턴을 기다리는 상태
  attackLockedThisTurn  // 소유자의 현재 턴에 실제로 공격이 봉쇄된 상태
}
```

대상 소유자의 다음 턴 시작 시 `attackLockPending`이 꺼지고
`attackLockedThisTurn`이 켜집니다. 그 턴에는 법적 공격 액션이 생성되지 않으며
직접 공격 호출도 `attacker_locked`로 거부됩니다. 해당 턴이 끝나면 봉쇄가 소모되고,
그 다음 소유자 턴부터 정상적으로 공격할 수 있습니다.

## 이벤트와 동시 해결

프레젠테이션 계층은 기존 이벤트에 더해 다음 이벤트를 받을 수 있습니다.

- `commander:power`: 능력 ID, 비용, 대상, 실제 결과, 남은 마나
- `commander:reflect`: 반사 전후 횟수, 공격자, 방패 포함 실제 피해 결과
- `commander:lock`: `pending` 또는 `active` 상태와 봉쇄 대상
- `formation:place`, `formation:block`: 배치와 전열 보호
- `faction:link`: 실제 발동한 연계 종류와 결과
- `duel:start`, `duel:hit`: 일기토 시작과 동시 피해 결과
- `status:burn`, `status:counter`, `status:intimidate`, `status:empty-fort`,
  `status:raid`: 턴 경계 상태 변화

손권의 피해는 적 영웅과 전장 전체를 하나의 동시 피해 묶음으로 처리합니다. 유비의
반사도 영웅 공격 피해와 같은 해결 묶음에 들어갑니다. 이 과정에서 생긴 모든 죽음의
메아리와 중첩 죽음 묶음을 끝까지 해결한 뒤 승패를 한 번 판정합니다. 양쪽 영웅
체력이 함께 0 이하가 되면 `winner: "draw"`,
`reason: "mutual_destruction"`입니다.

피해 결과와 이벤트에는 표시용 예상치가 아니라 `actualDamage`,
`healthBefore`, `healthAfter`, `blockedByShield` 등 실제 해결 결과가 들어갑니다.
지휘관 능력은 카드 더미, 손패 또는 20장 덱 보존 규칙을 변경하지 않습니다.

## 검증

이 디렉터리에서 다음 명령으로 회귀 테스트를 실행합니다.

```sh
node test-rules.mjs
```

테스트는 기존 카드·전투 규칙, 20장 완주, 네 지휘관의 비용·횟수·대상·턴 수명,
방패와 죽음의 메아리, 상호 파괴, 복제 결정성과 라이브 상태 격리를 검증합니다.
