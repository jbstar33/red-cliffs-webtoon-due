# 적벽전설 1차 범위 최종 인수 기록

## 판정

- 1차 범위 기능: PASS
- 독립 harsh critic 상업 감각: PASS
- 종합: 9.1/10
- 실제 시각·손맛: 8.7/10
- 6점 미만 시스템: 없음
- 현재 차단 버그: 없음

이 판정의 “하스스톤 수준”은 로고·아트·브랜드 복제가 아니라,
아마추어 프로토타입처럼 보이지 않는 일관된 정보 위계·상호작용·피드백의
상업적 완성도를 뜻한다.

## 요구사항별 증거

| 요구사항 | 결과 | 직접 증거 |
|---|---|---|
| 카드 15~20장 | PASS | 본 카드 19장, 토큰 1장 |
| 위·촉·오 균형 | PASS | 위 6, 촉 6, 오 6, 군웅 여포 1 |
| 20장 덱 | PASS | 결정적 덱 생성·인스턴스 보존 검사 |
| 단일 PvE 1:1 | PASS | 플레이어 1명·전략 AI 1명만 제공 |
| 처음부터 승패까지 | PASS | 실제 승리·패배 완주와 60/60 통합 경기 종료 |
| 능력 명확성 | PASS | 19장 대상·순서·무작위·최소/최대·불발 조건 명시 |
| 텍스트 가독성 | PASS | 최장 전위 352/355px, 중복 정의 0, 고아 문장부호 0 |
| 카드 일러스트 | PASS | art8 HAND/DETAIL 19인 실렌더, 19/19 figure fingerprint |
| 카드 조작 | PASS | 클릭·재클릭·드래그·대상 선택·Esc·키보드·입력 잠금 |
| 전투·효과 연출 | PASS | 공격 80/160/240ms, 방패·사망·소환·AOE 별도 문법 |
| 절차적 오디오 | PASS(구조) | Web Audio 사건 서명 32개, 재질별 접촉음, voice cap 12 |
| 오프라인 | PASS | 원격 이미지·폰트·오디오·런타임 import 0 |
| 시스템 격리 | PASS | 6개 시스템이 런타임 context registry로만 협력 |
| 제외 범위 보존 | PASS | 덱빌더·랭킹·멀티플레이 없음 |

## 최종 자동 검증

```text
npm test
npm run lint
```

- production build: PASS
- 통합 60경기: 60/60 종료
- 승패: 플레이어 24 / AI 36
- 평균: 21.9턴
- 사용 카드: 19/19
- board-ui: 65/65
- rules-engine: PASS
- AI 전술: 123개 시나리오 그룹
- AI 전략: 120경기, 불법 행동 0, AI 승률 40%
- FX: 사건·대표 프레임·reduced-motion·상한·tail PASS
- audio: 8,703 procedural nodes, 사건 서명 32개, mobile cap 12
- ESLint: 경고·오류 0

## 추가 내구성 증거

- rules: 1,000경기 85,884행동, 불법 행동 0
- 양측 황개 동시 유언: 공격 순서 양쪽 모두 무승부
- UI 퍼즈: 22,800상태, 패널·턴 버튼·전장 겹침 0
- AI 숨은 손패 비의존: 10,000변형, 선택 불일치 0
- AI 결정: 11,340회, 배치 p95 최악 18.93ms
- 토큰 fallback: 22엔티티×5상태, 총 110렌더 경로
- 런타임: 5,000시드·10,038회 재시작, teardown 누수 0
- FX: particle 420/job 72 상한, nonfinite 0
- audio: 1,000회 재시작·destroy와 10,000효과 burst 뒤 누수 0

최종 소스 재봉인에서는 위 검증보다 더 큰 범위로 다시 확인했다.

- rules: 2,000/2,000경기 종료, 171,875행동, 불법 행동 0
- rules 상태·전이: 173,875회와 매 경기 20장 보존 PASS
- 카드·효과: 19/19 카드, 11/11 효과 연산, 돌진 15,271/15,271
- 수호·방패·피로도: 20,749 / 2,628 / 2,190회
- 유언: 전위 2,663 / 곽가 3,164 / 황개 3,236회
- 결정성: 동일 시드 20종×2 전체 행동·효과·무작위 대상·최종 digest 일치
- AI: 500시드×2, 총 1,000경기, 불법 행동·결정성 불일치 0
- AI 균형: AI 198 / 플레이어 302, AI 승률 39.6%, 평균 22.93턴
- AI 지연: 18,660결정, p50 8.57ms, p95 26.61ms
- AI 숨은 손패 비의존: 500공개 상태×10변형, 총 5,000회 선택 불일치 0

## 최종 시각 증거

- `visual-evidence/art8-19-card-gallery-final.png`
- `visual-evidence/fx-final-contact-080ms.png`
- `visual-evidence/fx-final-contact-160ms.png`
- `visual-evidence/fx-final-contact-240ms.png`
- `visual-evidence/fx-shield-break-120ms.png`
- `visual-evidence/fx-death-285ms.png`
- `visual-evidence/fx-summon-210ms.png`
- `visual-evidence/art8-fx-final-full-match-defeat.png`
- `visual-evidence/art8-fx-final-full-match-defeat-2.png`
- `visual-evidence/art8-fx-final-full-match-defeat-3.png`
- `visual-evidence/post-fix-full-match-victory.png`

모든 최종 브라우저 실검수에서 console error는 0이었다.

## 최종 소스 해시

```text
rules-engine/index.js
D5A65A5FDC3ECDA708B7A28179FB707BFDDEA7AB2428E0DCA4C5576D38205BC8

card-data/index.js
B35D2AD70A0083B333F845C486512C607617A2986E3AA9B793BED15A3337EB70

opponent-ai/index.js
5377BC2E2A67142864AA7B9C1ADEA5BEE61010ADBADF4CACABE0F55C1ECCCC4A

board-ui/index.js
582DEB5131F154025BA27AF78C7E84900C53A53F751A722BCCE6B4385D646664

fx-animation/index.js
EE3B5F06468347C596F1DF5025D4856D5DBC102368BFA2E81DAB95959C36CDFF

audio/index.js
230922E44E6845F44F4A577AFF55766880DD2EDBA5B923C0992C96FED62B43E5
```

## 최종 실전 재확인

최신 고정 소스에서 브라우저로 서로 다른 흐름의 두 판을 다시 플레이해 카드 20장 소진,
피로도, 수호 강제 공격, 돌진, 방어막, 방어도, 대상 지정 피해, 무작위 피해,
다중 드로우, 토큰 소환, 전군 강화, 광역 피해, 사망과 최종 패배 판정까지
확인했다. 상세 패널은 전 구간에서 비용·공격·체력·발동 시점·대상·수치를
겹침 없이 표시했고, 승패 모달까지 입력 정지와 재대전 동선이 유지됐다.

## 증거 한계

오디오 구현은 사건 분리·주파수·envelope·ducking·동시음·수명 테스트로
검증했지만, 최종 독립 크리틱은 실제 스피커 청취를 수행하지 못했다.
따라서 오디오 8.5점은 구조 점수이며 청각 취향에 대한 절대 판정은 아니다.
