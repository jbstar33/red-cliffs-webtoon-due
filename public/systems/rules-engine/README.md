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
{ type: "playCard", side, handIndex, target? }
{ type: "attack", side, attackerIndex, target }
{ type: "endTurn", side }
```

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
