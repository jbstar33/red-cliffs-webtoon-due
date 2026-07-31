(function registerCardData(global) {
  "use strict";

  var KEYWORD_GLOSSARY = Object.freeze({
    돌진: "이 하수인은 출전한 턴에도 공격할 수 있습니다.",
    수호: "적은 수호 하수인이 하나라도 있으면 수호 하수인만 공격할 수 있습니다.",
    방패: "이 하수인이 처음 받는 피해를 한 번 전부 막습니다."
  });
  var KEYWORDS = Object.keys(KEYWORD_GLOSSARY);
  var TARGETS = ["none", "enemy", "friendly", "any"];
  var TRIGGERS = ["onPlay", "onDeath"];
  var OPS = [
    "damage_target",
    "damage_enemy_hero",
    "damage_random_enemy",
    "damage_all_enemies",
    "heal_friendly_hero",
    "draw",
    "gain_armor",
    "buff_target",
    "buff_friendly_board",
    "buff_adjacent",
    "buff_self",
    "summon_token",
    "reduce_random_hand_cost",
    "ready_random_friendly"
  ];

  var TOKEN_SEEDS = [
    {
      id: "token_jiangdong_marine",
      name: "강동 수군",
      courtesy: "",
      faction: "오",
      cost: 0,
      attack: 1,
      health: 1,
      rarity: "토큰",
      role: "병사",
      flavor: "장강의 물길을 손바닥처럼 아는 정예 수군.",
      keywords: [],
      target: "none",
      abilities: [],
      palette: { primary: "#246E78", secondary: "#E6C86E", glow: "#6EE7E1" },
      portrait: {
        motif: "물결 문양의 청동 투구와 겹친 수군 방패",
        weapon: "짧은 수군도",
        temperament: "절도 있는 충성"
      }
    },
    {
      id: "token_nanman_beast",
      name: "남만 맹수",
      courtesy: "",
      faction: "남만",
      cost: 0,
      attack: 1,
      health: 1,
      rarity: "토큰",
      role: "맹수",
      flavor: "북소리와 피리 소리에 맞춰 밀림을 내달리는 전투 짐승.",
      keywords: [],
      target: "none",
      abilities: [],
      palette: { primary: "#59452E", secondary: "#D9A441", glow: "#FF8B32" },
      portrait: {
        motif: "밀림의 안개를 가르는 송곳니와 황동 방울",
        weapon: "발톱과 송곳니",
        temperament: "길들여지지 않은 야성",
        composition: "낮게 웅크린 측면 전신과 전방을 향한 시선",
        armor: "등을 감싼 등나무 안장과 청동 이마 장식",
        lighting: "짙은 녹음 사이로 스미는 호박색 역광"
      }
    }
  ];

  var CARD_SEEDS = [
    {
      id: "shu_liu_bei",
      name: "유비",
      courtesy: "현덕",
      faction: "촉",
      cost: 1,
      attack: 1,
      health: 2,
      rarity: "전설",
      role: "군주",
      flavor: "사람을 얻는 것이 천하를 얻는 길이다.",
      keywords: [],
      target: "none",
      abilities: [{ trigger: "onPlay", op: "heal_friendly_hero", amount: 2 }],
      palette: { primary: "#3E8E58", secondary: "#E3C86B", glow: "#8EF0A5" },
      portrait: {
        motif: "쌍룡 비단과 백성의 등불",
        weapon: "쌍고검",
        temperament: "온화한 인덕"
      }
    },
    {
      id: "shu_guan_yu",
      name: "관우",
      courtesy: "운장",
      faction: "촉",
      cost: 7,
      attack: 6,
      health: 6,
      rarity: "전설",
      role: "맹장",
      flavor: "청룡의 칼날이 지나간 자리에는 의기만 남는다.",
      keywords: ["돌진"],
      target: "none",
      abilities: [],
      palette: { primary: "#A92D2D", secondary: "#D8B85A", glow: "#FF6D45" },
      portrait: {
        motif: "붉은 전포와 휘감기는 청룡",
        weapon: "청룡언월도",
        temperament: "장중한 의기"
      }
    },
    {
      id: "shu_zhang_fei",
      name: "장비",
      courtesy: "익덕",
      faction: "촉",
      cost: 5,
      attack: 4,
      health: 7,
      rarity: "영웅",
      role: "수문장",
      flavor: "장판교의 일갈에 군마조차 발을 멈췄다.",
      keywords: ["수호"],
      target: "none",
      abilities: [],
      palette: { primary: "#382F45", secondary: "#C95440", glow: "#FF9A5A" },
      portrait: {
        motif: "장판교의 먼지와 검은 호랑이",
        weapon: "장팔사모",
        temperament: "호방한 격정"
      }
    },
    {
      id: "shu_zhao_yun",
      name: "조자룡",
      courtesy: "자룡",
      faction: "촉",
      cost: 4,
      attack: 3,
      health: 4,
      rarity: "전설",
      role: "선봉",
      flavor: "백마 한 필로 포위를 가르고 주군의 뜻을 지켰다.",
      keywords: ["돌진", "방패"],
      target: "none",
      abilities: [],
      palette: { primary: "#D8E5E9", secondary: "#4A7F99", glow: "#B7F4FF" },
      portrait: {
        motif: "은빛 갑주와 질주하는 백마",
        weapon: "용담창",
        temperament: "침착한 용맹"
      }
    },
    {
      id: "shu_zhuge_liang",
      name: "제갈량",
      courtesy: "공명",
      faction: "촉",
      cost: 5,
      attack: 3,
      health: 5,
      rarity: "전설",
      role: "책사",
      flavor: "동풍은 우연이 아니라 준비된 계책의 마지막 한 수다.",
      keywords: [],
      target: "none",
      abilities: [
        { trigger: "onPlay", op: "draw", amount: 2 },
        { trigger: "onPlay", op: "reduce_random_hand_cost", amount: 1, count: 1 }
      ],
      palette: { primary: "#E9E1C3", secondary: "#557A69", glow: "#B8FFD8" },
      portrait: {
        motif: "팔괘진과 별빛을 머금은 학우선",
        weapon: "학우선",
        temperament: "고요한 통찰"
      }
    },
    {
      id: "shu_huang_zhong",
      name: "황충",
      courtesy: "한승",
      faction: "촉",
      cost: 3,
      attack: 2,
      health: 3,
      rarity: "영웅",
      role: "명궁",
      flavor: "노장의 화살은 세월보다 멀리 날아간다.",
      keywords: [],
      target: "enemy",
      abilities: [{ trigger: "onPlay", op: "damage_target", amount: 2 }],
      palette: { primary: "#A66D2D", secondary: "#E2D09A", glow: "#FFD36B" },
      portrait: {
        motif: "낙엽을 꿰뚫는 금빛 화살",
        weapon: "강궁",
        temperament: "노련한 결기"
      }
    },
    {
      id: "shu_ma_chao",
      name: "마초",
      courtesy: "맹기",
      faction: "촉",
      cost: 5,
      attack: 5,
      health: 3,
      rarity: "영웅",
      role: "서량 선봉",
      flavor: "서량의 은빛 기병이 모래바람보다 먼저 적진을 꿰뚫는다.",
      keywords: ["돌진"],
      target: "none",
      abilities: [],
      palette: { primary: "#D9E2E8", secondary: "#5B80A2", glow: "#C6F2FF" },
      portrait: {
        motif: "설산을 등진 은빛 사자 투구와 흩날리는 백색 전포",
        weapon: "호두참금창",
        temperament: "곧고 매서운 투지",
        composition: "백마 위에서 창끝을 화면 밖으로 내지르는 사선 구도",
        armor: "서량식 은린갑과 청색 가죽 견갑",
        expression: "적장을 꿰뚫어 보는 차가운 눈빛",
        lighting: "모래바람을 가르는 백금색 측광"
      }
    },
    {
      id: "wei_cao_cao",
      name: "조조",
      courtesy: "맹덕",
      faction: "위",
      cost: 6,
      attack: 4,
      health: 6,
      rarity: "전설",
      role: "군주",
      flavor: "난세는 영웅을 기다리지 않는다. 영웅이 난세를 쥔다.",
      keywords: [],
      target: "none",
      abilities: [
        { trigger: "onPlay", op: "buff_friendly_board", attack: 1, health: 1 }
      ],
      palette: { primary: "#314D73", secondary: "#C6CCD6", glow: "#79B8FF" },
      portrait: {
        motif: "창천 아래 늘어선 검은 기병",
        weapon: "의천검",
        temperament: "냉철한 패기"
      }
    },
    {
      id: "wei_sima_yi",
      name: "사마의",
      courtesy: "중달",
      faction: "위",
      cost: 5,
      attack: 4,
      health: 5,
      rarity: "전설",
      role: "책사",
      flavor: "기다림도 칼이다. 가장 늦게 뽑을 뿐.",
      keywords: [],
      target: "none",
      abilities: [
        { trigger: "onPlay", op: "damage_random_enemy", amount: 2 },
        { trigger: "onPlay", op: "gain_armor", amount: 2 }
      ],
      palette: { primary: "#3C3457", secondary: "#9294A8", glow: "#B49CFF" },
      portrait: {
        motif: "먹구름 속 매의 눈과 숨은 바둑돌",
        weapon: "칠성검",
        temperament: "인내하는 야심"
      }
    },
    {
      id: "wei_xiahou_dun",
      name: "하후돈",
      courtesy: "원양",
      faction: "위",
      cost: 2,
      attack: 2,
      health: 3,
      rarity: "영웅",
      role: "수문장",
      flavor: "한쪽 눈을 잃고도 전열의 맨 앞을 양보하지 않았다.",
      keywords: ["수호"],
      target: "none",
      abilities: [],
      palette: { primary: "#6E2734", secondary: "#A8ADB7", glow: "#FF6B75" },
      portrait: {
        motif: "붉은 안대와 갈라진 철갑",
        weapon: "대도",
        temperament: "불굴의 충성"
      }
    },
    {
      id: "wei_dian_wei",
      name: "전위",
      courtesy: "악래",
      faction: "위",
      cost: 5,
      attack: 4,
      health: 6,
      rarity: "영웅",
      role: "호위",
      flavor: "문이 무너져도 그가 선 자리는 성벽이었다.",
      keywords: ["수호"],
      target: "none",
      abilities: [{ trigger: "onDeath", op: "damage_random_enemy", amount: 2 }],
      palette: { primary: "#493A32", secondary: "#A85B36", glow: "#FF9B54" },
      portrait: {
        motif: "성문을 버티는 거대한 철갑",
        weapon: "쌍철극",
        temperament: "우직한 투혼"
      }
    },
    {
      id: "wei_zhang_liao",
      name: "장료",
      courtesy: "문원",
      faction: "위",
      cost: 4,
      attack: 3,
      health: 3,
      rarity: "영웅",
      role: "선봉",
      flavor: "합비의 밤, 팔백 기병이 십만의 꿈을 깨웠다.",
      keywords: ["돌진"],
      target: "none",
      abilities: [{ trigger: "onPlay", op: "gain_armor", amount: 2 }],
      palette: { primary: "#35596B", secondary: "#D0B76B", glow: "#72D4FF" },
      portrait: {
        motif: "합비의 초승달과 돌진하는 기병",
        weapon: "월아극",
        temperament: "과감한 기습"
      }
    },
    {
      id: "wei_guo_jia",
      name: "곽가",
      courtesy: "봉효",
      faction: "위",
      cost: 1,
      attack: 1,
      health: 1,
      rarity: "희귀",
      role: "책사",
      flavor: "짧은 생은 먼 내일을 읽는 데 부족하지 않았다.",
      keywords: [],
      target: "none",
      abilities: [{ trigger: "onDeath", op: "draw", amount: 1 }],
      palette: { primary: "#46657A", secondary: "#D5DCE1", glow: "#8FDBFF" },
      portrait: {
        motif: "비 내리는 죽간과 꺼지지 않은 등잔",
        weapon: "죽간",
        temperament: "쓸쓸한 혜안"
      }
    },
    {
      id: "wei_xu_zhu",
      name: "허저",
      courtesy: "중강",
      faction: "위",
      cost: 4,
      attack: 3,
      health: 6,
      rarity: "영웅",
      role: "호치",
      flavor: "갑옷을 벗어 던져도 주군 앞을 막아선 산 같은 등은 흔들리지 않았다.",
      keywords: ["수호"],
      target: "none",
      abilities: [{ trigger: "onPlay", op: "gain_armor", amount: 1 }],
      palette: { primary: "#485667", secondary: "#B9864A", glow: "#FFB75E" },
      portrait: {
        motif: "부서진 성문 앞에 버틴 호랑이 가죽과 거대한 어깨",
        weapon: "철추",
        temperament: "순박하고 완강한 충성",
        composition: "낮은 시점에서 방패처럼 화면을 가득 채운 상반신",
        armor: "두꺼운 흑철 흉갑과 호랑이 가죽 망토",
        expression: "이를 악문 채 뒤를 지키는 단단한 표정",
        lighting: "불타는 성문의 주황빛 윤곽광"
      }
    },
    {
      id: "wu_sun_quan",
      name: "손권",
      courtesy: "중모",
      faction: "오",
      cost: 4,
      attack: 2,
      health: 4,
      rarity: "전설",
      role: "군주",
      flavor: "장강을 지키는 일은 사람과 물길을 함께 다스리는 일이다.",
      keywords: [],
      target: "none",
      abilities: [
        {
          trigger: "onPlay",
          op: "summon_token",
          tokenId: "token_jiangdong_marine",
          count: 2
        }
      ],
      palette: { primary: "#286B72", secondary: "#D6BC61", glow: "#64E3DF" },
      portrait: {
        motif: "푸른 파도 위 황금 범선과 자염",
        weapon: "백홍검",
        temperament: "신중한 결단"
      }
    },
    {
      id: "wu_zhou_yu",
      name: "주유",
      courtesy: "공근",
      faction: "오",
      cost: 6,
      attack: 4,
      health: 5,
      rarity: "전설",
      role: "도독",
      flavor: "거문고 한 음이 흐트러지면, 불길의 진형도 바로잡는다.",
      keywords: [],
      target: "none",
      abilities: [{ trigger: "onPlay", op: "damage_all_enemies", amount: 2 }],
      palette: { primary: "#8B3048", secondary: "#E5C67C", glow: "#FF805E" },
      portrait: {
        motif: "적벽을 물들이는 화선과 거문고 현",
        weapon: "도독검",
        temperament: "우아한 결단"
      }
    },
    {
      id: "wu_gan_ning",
      name: "감녕",
      courtesy: "흥패",
      faction: "오",
      cost: 3,
      attack: 4,
      health: 2,
      rarity: "희귀",
      role: "선봉",
      flavor: "방울 소리가 들렸을 때는 이미 적진 한가운데였다.",
      keywords: ["돌진"],
      target: "none",
      abilities: [],
      palette: { primary: "#225866", secondary: "#C94B45", glow: "#64D9FF" },
      portrait: {
        motif: "비단 돛과 울리는 은방울",
        weapon: "환수도",
        temperament: "대담한 쾌속"
      }
    },
    {
      id: "wu_lu_meng",
      name: "여몽",
      courtesy: "자명",
      faction: "오",
      cost: 3,
      attack: 2,
      health: 4,
      rarity: "영웅",
      role: "도독",
      flavor: "무장의 칼끝에 학문의 깊이를 더했다.",
      keywords: [],
      target: "none",
      abilities: [{ trigger: "onPlay", op: "ready_random_friendly" }],
      palette: { primary: "#2F7165", secondary: "#D4C68A", glow: "#78F1C4" },
      portrait: {
        motif: "펼친 병서와 흰옷 아래 감춘 갑주",
        weapon: "장검",
        temperament: "성장하는 지략"
      }
    },
    {
      id: "wu_huang_gai",
      name: "황개",
      courtesy: "공복",
      faction: "오",
      cost: 1,
      attack: 1,
      health: 2,
      rarity: "희귀",
      role: "결사대",
      flavor: "상처는 거짓이었으나 적벽을 밝힌 충성은 참이었다.",
      keywords: [],
      target: "none",
      abilities: [{ trigger: "onDeath", op: "damage_enemy_hero", amount: 1 }],
      palette: { primary: "#7A3E2C", secondary: "#D69B55", glow: "#FF714D" },
      portrait: {
        motif: "불붙은 고깃배와 채찍 자국",
        weapon: "화공도",
        temperament: "노련한 결사"
      }
    },
    {
      id: "wu_sun_shangxiang",
      name: "손상향",
      courtesy: "궁요희",
      faction: "오",
      cost: 1,
      attack: 1,
      health: 1,
      rarity: "영웅",
      role: "궁희",
      flavor: "비단 장막 뒤에도 활시위는 늘 팽팽했다.",
      keywords: [],
      target: "enemy",
      abilities: [{ trigger: "onPlay", op: "damage_target", amount: 1 }],
      palette: { primary: "#8A365B", secondary: "#F0C7A0", glow: "#FF88C8" },
      portrait: {
        motif: "매화 비녀와 날아드는 붉은 화살",
        weapon: "쌍단궁",
        temperament: "당당한 기개"
      }
    },
    {
      id: "wu_lu_xun",
      name: "육손",
      courtesy: "백언",
      faction: "오",
      cost: 5,
      attack: 3,
      health: 5,
      rarity: "전설",
      role: "도독",
      flavor: "젊은 도독의 침착한 불길이 이어진 진영 전체를 삼켰다.",
      keywords: [],
      target: "none",
      abilities: [
        { trigger: "onPlay", op: "damage_all_enemies", amount: 1 },
        { trigger: "onPlay", op: "draw", amount: 1 }
      ],
      palette: { primary: "#274D58", secondary: "#D6864B", glow: "#FFCD73" },
      portrait: {
        motif: "이릉의 산길을 잇는 봉화와 펼쳐진 작전 지도",
        weapon: "도독검",
        temperament: "겸손한 외면 속 냉정한 결단",
        composition: "지도 위 한 점을 짚고 불길을 등진 삼분할 구도",
        armor: "청록 비늘갑 위에 걸친 주홍색 도독포",
        expression: "승기를 계산한 차분한 눈매",
        lighting: "연기 사이로 번지는 금홍색 화광"
      }
    },
    {
      id: "nanman_meng_huo",
      name: "맹획",
      courtesy: "",
      faction: "남만",
      cost: 5,
      attack: 4,
      health: 6,
      rarity: "전설",
      role: "남만왕",
      flavor: "일곱 번 쓰러져도 산과 밀림의 왕은 다시 전장으로 돌아온다.",
      keywords: [],
      target: "none",
      abilities: [{ trigger: "onDeath", op: "gain_armor", amount: 3 }],
      palette: { primary: "#75452E", secondary: "#D7A43B", glow: "#FF7141" },
      portrait: {
        motif: "코끼리 엄니 왕관과 밀림 부족의 붉은 깃발",
        weapon: "수왕대도",
        temperament: "호방하고 꺾이지 않는 왕기",
        composition: "언덕 위에서 부족 전열을 내려다보는 정면 영웅 구도",
        armor: "코뿔소 가죽 흉갑과 황동 원반 장식",
        expression: "재기를 약속하는 크게 웃는 얼굴",
        lighting: "폭우 뒤 구름을 뚫는 붉은 석양"
      }
    },
    {
      id: "nanman_zhu_rong",
      name: "축융",
      courtesy: "",
      faction: "남만",
      cost: 4,
      attack: 3,
      health: 4,
      rarity: "영웅",
      role: "화신 장수",
      flavor: "불의 후예가 던진 칼날은 어둠 속에서도 표적을 놓치지 않는다.",
      keywords: [],
      target: "enemy",
      abilities: [{ trigger: "onPlay", op: "damage_target", amount: 2 }],
      palette: { primary: "#8E2F27", secondary: "#E7A846", glow: "#FFDF6A" },
      portrait: {
        motif: "불새 깃 장식과 소용돌이치는 횃불의 궤적",
        weapon: "비도",
        temperament: "자유롭고 불같은 결기",
        composition: "회전하며 두 자루 비도를 던지는 역동적 전신 구도",
        armor: "적갈색 가죽 전투복과 금빛 팔 보호대",
        expression: "표적을 정확히 겨눈 자신감 있는 미소",
        lighting: "비도 궤적을 따라 번지는 황금 불빛"
      }
    },
    {
      id: "nanman_wu_tu_gu",
      name: "올돌골",
      courtesy: "",
      faction: "남만",
      cost: 6,
      attack: 4,
      health: 8,
      rarity: "영웅",
      role: "등갑왕",
      flavor: "기름 먹인 등갑은 화살과 칼날을 튕기며 거대한 성벽처럼 전진한다.",
      keywords: ["수호", "방패"],
      target: "none",
      abilities: [],
      palette: { primary: "#465B32", secondary: "#B78A42", glow: "#C9FF65" },
      portrait: {
        motif: "겹겹이 엮은 녹갈색 등갑과 거대한 뿔가면",
        weapon: "철아봉",
        temperament: "둔중하고 압도적인 위압",
        composition: "협곡을 막아선 거구를 아래서 올려다보는 대칭 구도",
        armor: "옻칠한 등나무 판갑과 뼈 장식 견갑",
        expression: "가면 틈으로 번뜩이는 무표정한 눈",
        lighting: "밀림의 녹색 산란광과 방패의 청백색 섬광"
      }
    },
    {
      id: "nanman_mu_lu",
      name: "목록대왕",
      courtesy: "",
      faction: "남만",
      cost: 5,
      attack: 3,
      health: 5,
      rarity: "영웅",
      role: "수왕",
      flavor: "피리 한 음에 잠든 밀림이 깨어나 발톱과 포효로 답한다.",
      keywords: [],
      target: "none",
      abilities: [
        {
          trigger: "onPlay",
          op: "summon_token",
          tokenId: "token_nanman_beast",
          count: 2
        }
      ],
      palette: { primary: "#34523B", secondary: "#C08A39", glow: "#8EF06A" },
      portrait: {
        motif: "짐승뼈 가면과 피리 주위로 모이는 야수의 눈",
        weapon: "수왕피리",
        temperament: "기묘하고 장난스러운 위엄",
        composition: "피리를 부는 실루엣 양옆으로 맹수 두 마리가 솟는 삼각 구도",
        armor: "깃털 망토와 표범무늬 가죽 갑옷",
        expression: "가면 아래 드러난 예측 불가능한 웃음",
        lighting: "반딧불 같은 녹금색 점광과 짙은 밀림 그림자"
      }
    },
    {
      id: "nanman_a_hui_nan",
      name: "아회남",
      courtesy: "",
      faction: "남만",
      cost: 3,
      attack: 2,
      health: 4,
      rarity: "희귀",
      role: "부족 전령",
      flavor: "전열 사이를 달린 전령의 함성에 양옆 전사들이 창을 높이 들었다.",
      keywords: [],
      target: "none",
      abilities: [
        { trigger: "onPlay", op: "buff_adjacent", attack: 1, health: 0 }
      ],
      palette: { primary: "#67502C", secondary: "#D65C37", glow: "#FFD45E" },
      portrait: {
        motif: "쌍뿔 전령관과 좌우로 퍼지는 붉은 전투 문양",
        weapon: "전령창",
        temperament: "민첩하고 고무적인 기세",
        composition: "좌우 전열을 향해 창을 치켜든 중앙 집중 구도",
        armor: "가벼운 가죽 조끼와 깃털 허리장식",
        expression: "아군을 북돋는 힘찬 외침",
        lighting: "전열 양옆으로 뻗는 주황색 새벽빛"
      }
    },
    {
      id: "qun_lu_bu",
      name: "여포",
      courtesy: "봉선",
      faction: "군웅",
      cost: 9,
      attack: 8,
      health: 8,
      rarity: "전설",
      role: "비장",
      flavor: "사람 중에 여포, 말 중에 적토가 있다.",
      keywords: ["돌진"],
      target: "none",
      abilities: [],
      palette: { primary: "#8D1E2B", secondary: "#1C2029", glow: "#FF3D35" },
      portrait: {
        motif: "봉황 깃 관과 불길을 가르는 적토마",
        weapon: "방천화극",
        temperament: "압도적인 무용"
      }
    }
  ];

  var TACTICS_BY_ID = Object.freeze({
    shu_liu_bei: {
      identity: "초반 회복 선봉",
      plan: "첫 턴부터 전장을 만들면서 영웅 체력을 보전합니다.",
      combo: "수호 하수인 뒤에서 회복으로 장기전을 준비합니다.",
      counter: "영웅 체력이 가득 찼을 때는 능력 가치가 줄어듭니다."
    },
    shu_guan_yu: {
      identity: "중후반 돌파 장수",
      plan: "7마나에 즉시 6의 공격력으로 핵심 적이나 영웅을 압박합니다.",
      combo: "적 수호 하수인을 먼저 약화시킨 뒤 마무리 공격에 투입합니다.",
      counter: "수호와 방패로 첫 공격을 흡수하면 효율이 크게 낮아집니다."
    },
    shu_zhang_fei: {
      identity: "후반 수호벽",
      plan: "높은 체력으로 공격 경로를 막아 다른 아군을 보호합니다.",
      combo: "조조의 전장 강화와 함께 쓰면 제거하기 매우 어려워집니다.",
      counter: "직접 피해와 여러 하수인의 집중 공격에는 결국 무너집니다."
    },
    shu_zhao_yun: {
      identity: "방패 돌진 교환수",
      plan: "즉시 공격하고 첫 반격 피해를 막아 유리한 교환을 만듭니다.",
      combo: "공격력이 큰 적과 교환해도 방패가 첫 반격 피해를 전부 막습니다.",
      counter: "작은 피해로 방패를 먼저 벗긴 뒤 큰 공격을 가합니다."
    },
    shu_zhuge_liang: {
      identity: "손패 설계 책사",
      plan: "카드 두 장을 먼저 확보한 뒤 비용이 남은 손패 하나를 무작위로 할인합니다.",
      combo: "무작위 할인이 고비용 돌진 장수에 적중하면 다음 턴의 마무리를 앞당깁니다.",
      counter: "손패가 비었거나 비용 1 이상인 카드가 없으면 할인 효과는 발동하지 않습니다."
    },
    shu_huang_zhong: {
      identity: "선택 사격 명궁",
      plan: "출전과 동시에 원하는 적 캐릭터에게 피해 2를 줍니다.",
      combo: "전투 피해가 부족한 적을 정확히 마무리합니다.",
      counter: "체력 3 이상 하수인과 방패는 한 발을 버틸 수 있습니다."
    },
    shu_ma_chao: {
      identity: "서량의 속공 창기병",
      plan: "5마나 5공격 돌진으로 노출된 핵심 적이나 적 영웅을 즉시 압박합니다.",
      combo: "선택 피해로 수호를 치운 뒤 높은 돌진 공격력을 적 영웅에게 연결합니다.",
      counter: "체력이 3이므로 수호 하수인이나 작은 직접 피해로 다음 공격 전에 제거합니다."
    },
    wei_cao_cao: {
      identity: "전군 강화 군주",
      plan: "넓게 전개된 아군 전체를 +1/+1 강화해 전장 우위를 굳힙니다.",
      combo: "손권의 강동 수군처럼 여러 하수인을 먼저 소환합니다.",
      counter: "광역 피해로 아군 수를 줄인 뒤 출전 가치를 낮춥니다."
    },
    wei_sima_yi: {
      identity: "공수 전환 책사",
      plan: "무작위 적을 약화시키면서 방어도 2로 반격을 대비합니다.",
      combo: "광역 피해 뒤에 남은 하수인을 마무리할 확률을 높입니다.",
      counter: "적 하수인을 여럿 유지하면 원하는 대상에 적중하기 어렵습니다."
    },
    wei_xiahou_dun: {
      identity: "초반 수호병",
      plan: "2마나부터 적의 공격 대상을 강제로 자신에게 돌립니다.",
      combo: "곽가나 황개처럼 유언이 있는 아군의 생존 시간을 벌어줍니다.",
      counter: "피해 효과로 먼저 제거하면 공격 대상 제한이 사라집니다."
    },
    wei_dian_wei: {
      identity: "보복하는 호위",
      plan: "수호로 공격을 받고 쓰러질 때 무작위 적에게 피해 2를 줍니다.",
      combo: "적 하수인이 하나뿐이면 유언 대상이 확정되며 방패가 없다면 피해 2를 줍니다.",
      counter: "약한 하수인을 여럿 두어 유언 피해가 핵심 대상에 맞을 확률을 낮춥니다."
    },
    wei_zhang_liao: {
      identity: "방어 전환 기습수",
      plan: "즉시 공격해 적을 압박하면서 방어도 2로 내 영웅을 보호합니다.",
      combo: "영웅 체력이 낮을 때 공격과 생존을 한 번에 해결합니다.",
      counter: "수호 하수인으로 돌진 대상을 제한하면 공격 가치가 낮아집니다."
    },
    wei_guo_jia: {
      identity: "유언 순환 책사",
      plan: "저비용 하수인으로 교환한 뒤 카드를 한 장 보충합니다.",
      combo: "수호 뒤에서 살려 두었다가 필요한 순간 전투에 투입합니다.",
      counter: "공격하지 않고 무시하면 카드 보충 시점을 늦출 수 있습니다."
    },
    wei_xu_zhu: {
      identity: "철벽 방어 호치",
      plan: "6의 체력과 수호로 공격 경로를 막고 출전 즉시 내 영웅에게 방어도 1을 더합니다.",
      combo: "체력이 낮은 아군 공격수 앞에 세워 한 턴의 공격 기회를 더 벌어줍니다.",
      counter: "공격 전에 직접 피해로 체력을 깎거나 여러 하수인의 공격을 집중해 돌파합니다."
    },
    wu_sun_quan: {
      identity: "수군 전개 군주",
      plan: "자신이 출전한 뒤 남은 빈자리에 강동 수군을 최대 둘 소환합니다.",
      combo: "이후 조조의 전체 강화로 수군을 실질적 위협으로 만듭니다.",
      counter: "광역 피해를 아껴 두면 함께 소환된 1/1 수군을 한꺼번에 정리할 수 있습니다."
    },
    wu_zhou_yu: {
      identity: "광역 소각 도독",
      plan: "모든 적 하수인에게 피해 2를 주어 넓은 전장을 정리합니다.",
      combo: "사마의나 황충의 추가 피해로 살아남은 적을 마무리합니다.",
      counter: "체력 3 이상 하수인과 방패를 나눠 배치해 피해를 견딥니다."
    },
    wu_gan_ning: {
      identity: "저비용 유리대포",
      plan: "3마나에 공격력 4를 즉시 투입해 짧은 피해 경주를 엽니다.",
      combo: "수호가 사라진 순간 적 영웅에게 빠르게 피해를 누적합니다.",
      counter: "체력이 2뿐이므로 작은 피해나 수호 하수인으로 교환합니다."
    },
    wu_lu_meng: {
      identity: "재공격 지휘관",
      plan: "이전 턴부터 있던 공격 완료 다른 아군 중 하나를 무작위로 한 번 더 준비시킵니다.",
      combo: "공격력이 높은 장수가 한 턴 이상 살아남았을 때 폭발력이 큽니다.",
      counter: "기존 공격수를 먼저 제거하면 새로 출전한 여몽 자신은 준비할 수 없습니다."
    },
    wu_huang_gai: {
      identity: "영웅 압박 결사대",
      plan: "초반 교환을 강요하고 쓰러질 때 적 영웅에게 피해를 남깁니다.",
      combo: "감녕과 함께 영웅 체력을 빠르게 압박합니다.",
      counter: "공격하지 않고 막아 두면 유언 피해 발동을 늦출 수 있습니다."
    },
    wu_sun_shangxiang: {
      identity: "저비용 정밀 사격",
      plan: "1마나에 원하는 적 캐릭터에게 피해 1을 정확히 줍니다.",
      combo: "체력 1 하수인을 제거해 아군 공격수의 길을 엽니다.",
      counter: "체력이 높은 하수인 위주로 전개하면 사격 효율이 낮습니다."
    },
    wu_lu_xun: {
      identity: "연영 정리 도독",
      plan: "모든 적 하수인에게 피해 1을 준 뒤 카드 한 장을 뽑아 전장과 손패를 함께 정비합니다.",
      combo: "주유의 광역 피해 전후에 사용해 방패를 벗기거나 남은 체력 1 적을 정리합니다.",
      counter: "체력이 높은 하수인을 적게 전개하면 광역 피해와 카드 보충의 동시 이득을 줄일 수 있습니다."
    },
    nanman_meng_huo: {
      identity: "칠종칠금 남만왕",
      plan: "4/6의 몸으로 전투를 이끌고 쓰러질 때 내 영웅에게 방어도 3을 남깁니다.",
      combo: "적의 큰 공격을 몸으로 받아낸 뒤 유언 방어도로 다음 공격까지 버팁니다.",
      counter: "당장 쓰러뜨리지 않고 약한 하수인으로 막아 두면 방어도 획득 시점을 늦출 수 있습니다."
    },
    nanman_zhu_rong: {
      identity: "화신의 선택 비도",
      plan: "출전하며 선택한 적 캐릭터 하나에게 피해 2를 주어 원하는 표적을 정확히 끊습니다.",
      combo: "맹수의 공격으로 체력을 낮춘 적을 비도로 마무리해 공격 손실을 줄입니다.",
      counter: "방패 하수인으로 선택 피해를 한 번 막거나 체력 3 이상의 전열을 유지합니다."
    },
    nanman_wu_tu_gu: {
      identity: "등갑 방패 성벽",
      plan: "수호와 방패, 체력 8로 첫 피해를 막고 이후 공격까지 여러 차례 받아냅니다.",
      combo: "아회남의 양옆 강화 대상에 놓으면 공격력도 갖춘 중앙 수호벽이 됩니다.",
      counter: "작은 피해로 방패를 먼저 벗긴 뒤 직접 피해와 집중 공격으로 높은 체력을 깎습니다."
    },
    nanman_mu_lu: {
      identity: "쌍수 전개 수왕",
      plan: "자신을 낸 뒤 빈 전장 칸에 1/1 남만 맹수를 최대 둘 소환해 하수인 수를 늘립니다.",
      combo: "전장에 세 칸 이상을 비워 맹수 둘을 확보한 뒤 아회남을 사이에 배치해 공격력을 높입니다.",
      counter: "광역 피해를 남겨 두거나 상대 전장이 붐비게 압박하면 맹수 소환 가치를 제한할 수 있습니다."
    },
    nanman_a_hui_nan: {
      identity: "양익 고무 전령",
      plan: "출전 위치 양옆의 아군 하수인에게 공격력 +1을 부여해 즉시 압박을 높입니다.",
      combo: "두 맹수 사이에 배치하면 한 번의 출전으로 양옆 모두를 강화할 수 있습니다.",
      counter: "상대가 하수인을 나란히 둘 수 없도록 수를 줄이면 양옆 강화의 최대 가치를 막습니다."
    },
    qun_lu_bu: {
      identity: "최종 돌진 병기",
      plan: "9마나에 8/8이 즉시 공격해 승부를 끝낼 위협을 만듭니다.",
      combo: "제갈량의 무작위 비용 감소가 적중하면 한 턴 빠르게 출전할 수 있습니다.",
      counter: "수호나 방패 하수인을 남겨 치명적인 첫 공격을 흡수합니다."
    }
  });

  var TOKEN_NAME_BY_ID = Object.create(null);
  TOKEN_SEEDS.forEach(function mapTokenName(token) {
    TOKEN_NAME_BY_ID[token.id] = token.name;
  });

  function describeAbility(card, ability) {
    var prefix = ability.trigger === "onDeath" ? "유언: " : "출전: ";
    switch (ability.op) {
      case "damage_target":
        return (
          prefix +
          (card.target === "enemy"
            ? "내가 선택한 적 캐릭터 하나에게 "
            : "내가 선택한 캐릭터 하나에게 ") +
          "피해를 " +
          ability.amount +
          " 줍니다."
        );
      case "damage_enemy_hero":
        return prefix + "적 영웅에게 피해를 " + ability.amount + " 줍니다.";
      case "damage_random_enemy":
        return (
          prefix +
          "무작위 적 하수인 하나에게 피해를 " +
          ability.amount +
          " 줍니다. 적 하수인이 없다면 적 영웅이 대신 받습니다."
        );
      case "damage_all_enemies":
        return prefix + "모든 적 하수인에게 피해를 " + ability.amount + " 줍니다.";
      case "heal_friendly_hero":
        return (
          prefix +
          "내 영웅의 체력을 " +
          ability.amount +
          " 회복합니다(최대 체력까지)."
        );
      case "draw":
        return prefix + "카드를 " + ability.amount + "장 뽑습니다.";
      case "gain_armor":
        return prefix + "내 영웅이 방어도를 " + ability.amount + " 얻습니다.";
      case "buff_target":
        return (
          prefix +
          "내가 선택한 아군 하수인 하나에게 +" +
          ability.attack +
          "/+" +
          ability.health +
          "을 부여합니다."
        );
      case "buff_friendly_board":
        return (
          prefix +
          "모든 아군 하수인(자신 포함)에게 +" +
          ability.attack +
          "/+" +
          ability.health +
          "을 부여합니다."
        );
      case "buff_adjacent":
        return (
          prefix +
          "이 하수인 양옆의 아군 하수인에게 +" +
          ability.attack +
          "/+" +
          ability.health +
          "을 부여합니다."
        );
      case "buff_self":
        return (
          prefix +
          "이 하수인에게 +" +
          ability.attack +
          "/+" +
          ability.health +
          "을 부여합니다."
        );
      case "summon_token":
        return (
          prefix +
          "자신이 차지한 칸을 제외한 내 전장의 빈자리만큼 " +
          (TOKEN_NAME_BY_ID[ability.tokenId] || ability.tokenId) +
          " 토큰을 최대 " +
          (ability.count || 1) +
          "명 소환합니다."
        );
      case "reduce_random_hand_cost":
        return (
          prefix +
          "그 후, 비용이 1 이상인 무작위 손패 1장의 비용을 " +
          ability.amount +
          " 줄입니다(최소 0). 대상이 없으면 발동하지 않습니다."
        );
      case "ready_random_friendly":
        return (
          prefix +
          "이전 턴부터 전장에 있었고 이번 턴 이미 공격을 마친 무작위 다른 아군 하수인 하나를 다시 공격할 수 있게 합니다. 조건에 맞는 다른 아군이 없으면 발동하지 않습니다."
        );
      default:
        return prefix + "알 수 없는 효과.";
    }
  }

  function describeCard(card) {
    var sentences = card.keywords.map(function keywordText(keyword) {
      return keyword + " — " + KEYWORD_GLOSSARY[keyword];
    });
    card.abilities.forEach(function abilityText(ability) {
      sentences.push(describeAbility(card, ability));
    });
    return sentences.join(" ");
  }

  function describeAbilitySummary(card, ability, includeTrigger) {
    var prefix = includeTrigger === false
      ? ""
      : ability.trigger === "onDeath"
        ? "유언: "
        : "출전: ";
    switch (ability.op) {
      case "damage_target":
        return prefix + "선택한 적 캐릭터에게 피해 " + ability.amount;
      case "damage_enemy_hero":
        return prefix + "적 영웅에게 피해 " + ability.amount;
      case "damage_random_enemy":
        return (
          prefix +
          "무작위 적 하수인에게 피해 " +
          ability.amount +
          "(없으면 적 영웅)"
        );
      case "damage_all_enemies":
        return prefix + "모든 적 하수인에게 피해 " + ability.amount;
      case "heal_friendly_hero":
        return prefix + "내 영웅 체력 " + ability.amount + " 회복";
      case "draw":
        return prefix + ability.amount + "장 뽑기";
      case "gain_armor":
        return prefix + "내 영웅 방어도 +" + ability.amount;
      case "buff_target":
        return (
          prefix +
          "선택한 아군 하수인 1명 +" +
          ability.attack +
          "/+" +
          ability.health
        );
      case "buff_friendly_board":
        return (
          prefix +
          "모든 아군(자신 포함) +" +
          ability.attack +
          "/+" +
          ability.health
        );
      case "buff_adjacent":
        return (
          prefix +
          "이 하수인 양옆 아군 +" +
          ability.attack +
          "/+" +
          ability.health
        );
      case "buff_self":
        return (
          prefix + "이 하수인 +" + ability.attack + "/+" + ability.health
        );
      case "summon_token":
        return (
          prefix +
          "자신 배치 후 빈자리만큼 " +
          (TOKEN_NAME_BY_ID[ability.tokenId] || ability.tokenId) +
          " 소환(최대 " +
          (ability.count || 1) +
          "명)"
        );
      case "reduce_random_hand_cost":
        return (
          prefix +
          "비용 1 이상 손패 중 무작위 1장 비용 -" +
          ability.amount +
          "(최소 0)"
        );
      case "ready_random_friendly":
        return (
          prefix +
          "지난 턴부터 있던 공격 완료 다른 아군 1명 무작위로 다시 공격 가능"
        );
      default:
        return prefix + "알 수 없는 효과";
    }
  }

  function describeSummary(card) {
    var phrases = card.keywords.slice();
    var previousTrigger = null;
    card.abilities.forEach(function summaryAbility(ability) {
      phrases.push(
        describeAbilitySummary(card, ability, ability.trigger !== previousTrigger)
      );
      previousTrigger = ability.trigger;
    });
    return phrases.length ? phrases.join(" · ") : "능력 없음";
  }

  function materialize(seed) {
    var card = {
      id: seed.id,
      name: seed.name,
      courtesy: seed.courtesy,
      faction: seed.faction,
      cost: seed.cost,
      attack: seed.attack,
      health: seed.health,
      rarity: seed.rarity,
      role: seed.role,
      text: "",
      summaryText: "",
      flavor: seed.flavor,
      keywords: seed.keywords.slice(),
      target: seed.target,
      abilities: seed.abilities.map(function copyAbility(ability) {
        return Object.assign({}, ability);
      }),
      tactics: TACTICS_BY_ID[seed.id]
        ? Object.assign({}, TACTICS_BY_ID[seed.id])
        : null,
      palette: Object.assign({}, seed.palette),
      portrait: Object.assign({}, seed.portrait)
    };
    card.text = describeCard(card);
    card.summaryText = describeSummary(card);
    return card;
  }

  var CARDS = CARD_SEEDS.map(materialize);
  var TOKENS = TOKEN_SEEDS.map(materialize);
  var CARD_BY_ID = Object.create(null);
  var TOKEN_BY_ID = Object.create(null);

  CARDS.forEach(function indexCard(card) {
    CARD_BY_ID[card.id] = card;
  });
  TOKENS.forEach(function indexToken(token) {
    TOKEN_BY_ID[token.id] = token;
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function hashSeed(seed) {
    var value = String(seed == null ? "red-cliffs" : seed);
    var hash = 2166136261;
    for (var index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    var state = hashSeed(seed) || 0x6d2b79f5;
    return function random() {
      state += 0x6d2b79f5;
      var value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  var DECK_RECIPES = Object.freeze({
    default: Object.freeze([
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
      "wu_sun_quan",
      "wu_zhou_yu",
      "wu_gan_ning",
      "wu_lu_meng",
      "wu_huang_gai",
      "wu_sun_shangxiang",
      "qun_lu_bu"
    ]),
    wei: Object.freeze([
      "wei_cao_cao", "wei_cao_cao",
      "wei_sima_yi", "wei_sima_yi",
      "wei_xiahou_dun", "wei_xiahou_dun",
      "wei_dian_wei", "wei_dian_wei",
      "wei_zhang_liao", "wei_zhang_liao",
      "wei_guo_jia", "wei_guo_jia",
      "wei_xu_zhu", "wei_xu_zhu",
      "shu_liu_bei",
      "shu_huang_zhong",
      "wu_huang_gai",
      "wu_sun_shangxiang",
      "wu_gan_ning",
      "qun_lu_bu"
    ]),
    shu: Object.freeze([
      "shu_liu_bei", "shu_liu_bei",
      "shu_guan_yu", "shu_guan_yu",
      "shu_zhang_fei", "shu_zhang_fei",
      "shu_zhao_yun", "shu_zhao_yun",
      "shu_zhuge_liang", "shu_zhuge_liang",
      "shu_huang_zhong", "shu_huang_zhong",
      "shu_ma_chao", "shu_ma_chao",
      "wei_guo_jia",
      "wei_xiahou_dun",
      "wu_huang_gai",
      "wu_sun_shangxiang",
      "wu_gan_ning",
      "qun_lu_bu"
    ]),
    wu: Object.freeze([
      "wu_sun_quan", "wu_sun_quan",
      "wu_zhou_yu", "wu_zhou_yu",
      "wu_gan_ning", "wu_gan_ning",
      "wu_lu_meng", "wu_lu_meng",
      "wu_huang_gai", "wu_huang_gai",
      "wu_sun_shangxiang", "wu_sun_shangxiang",
      "wu_lu_xun", "wu_lu_xun",
      "shu_liu_bei",
      "shu_huang_zhong",
      "wei_xiahou_dun",
      "wei_guo_jia",
      "shu_ma_chao",
      "qun_lu_bu"
    ]),
    nanman: Object.freeze([
      "nanman_meng_huo", "nanman_meng_huo",
      "nanman_zhu_rong", "nanman_zhu_rong",
      "nanman_wu_tu_gu", "nanman_wu_tu_gu",
      "nanman_mu_lu", "nanman_mu_lu",
      "nanman_a_hui_nan", "nanman_a_hui_nan",
      "shu_liu_bei",
      "shu_huang_zhong",
      "shu_zhao_yun",
      "wei_xiahou_dun",
      "wei_guo_jia",
      "wu_huang_gai",
      "wu_sun_shangxiang",
      "wu_gan_ning",
      "wu_zhou_yu",
      "qun_lu_bu"
    ])
  });

  function normalizeFaction(faction) {
    var value = String(faction == null ? "" : faction).trim().toLowerCase();
    var aliases = {
      caocao: "wei",
      "조조": "wei",
      "위": "wei",
      wei: "wei",
      liubei: "shu",
      "유비": "shu",
      "촉": "shu",
      shu: "shu",
      sunquan: "wu",
      "손권": "wu",
      "오": "wu",
      wu: "wu",
      nomad: "nanman",
      "이민족": "nanman",
      "남만": "nanman",
      nanman: "nanman"
    };
    return aliases[value] || "default";
  }

  function buildDeck(seed, faction) {
    var recipeKey = normalizeFaction(faction);
    var random = seededRandom(
      String(seed == null ? "red-cliffs" : seed) + ":" + recipeKey
    );
    var deck = DECK_RECIPES[recipeKey].slice();

    for (var index = deck.length - 1; index > 0; index -= 1) {
      var swapIndex = Math.floor(random() * (index + 1));
      var current = deck[index];
      deck[index] = deck[swapIndex];
      deck[swapIndex] = current;
    }
    return deck;
  }

  function isIntegerInRange(value, minimum, maximum) {
    return Number.isInteger(value) && value >= minimum && value <= maximum;
  }

  function hasHexColor(value) {
    return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
  }

  function validateAbility(card, ability, abilityIndex, errors) {
    var path = card.id + ".abilities[" + abilityIndex + "]";
    if (TRIGGERS.indexOf(ability.trigger) < 0) {
      errors.push(path + ": 지원하지 않는 trigger");
    }
    if (OPS.indexOf(ability.op) < 0) {
      errors.push(path + ": 지원하지 않는 op");
      return;
    }

    var needsAmount = [
      "damage_target",
      "damage_enemy_hero",
      "damage_random_enemy",
      "damage_all_enemies",
      "heal_friendly_hero",
      "draw",
      "gain_armor",
      "reduce_random_hand_cost"
    ];
    var needsStats = [
      "buff_target",
      "buff_friendly_board",
      "buff_adjacent",
      "buff_self"
    ];
    if (
      needsAmount.indexOf(ability.op) >= 0 &&
      !isIntegerInRange(ability.amount, 1, 10)
    ) {
      errors.push(path + ": amount는 1~10 정수여야 함");
    }
    if (
      needsStats.indexOf(ability.op) >= 0 &&
      (!isIntegerInRange(ability.attack, 0, 10) ||
        !isIntegerInRange(ability.health, 0, 10) ||
        ability.attack + ability.health < 1)
    ) {
      errors.push(path + ": 강화 수치가 올바르지 않음");
    }
    if (
      ability.op === "summon_token" &&
      (!TOKEN_BY_ID[ability.tokenId] ||
        !isIntegerInRange(ability.count || 1, 1, 5))
    ) {
      errors.push(path + ": 소환 토큰 또는 수량이 올바르지 않음");
    }
    if (
      ability.op === "reduce_random_hand_cost" &&
      (ability.count || 1) !== 1
    ) {
      errors.push(path + ": 현재 룰 엔진은 비용 감소 대상을 정확히 1장만 지원함");
    }
  }

  function validateDefinition(card, seenIds, errors, isToken) {
    var requiredStrings = [
      "id",
      "name",
      "faction",
      "rarity",
      "role",
      "flavor"
    ];
    requiredStrings.forEach(function requiredString(field) {
      if (typeof card[field] !== "string" || card[field].trim() === "") {
        errors.push(card.id + ": " + field + " 문자열이 비어 있음");
      }
    });
    if (seenIds[card.id]) {
      errors.push(card.id + ": 중복 id");
    }
    seenIds[card.id] = true;
    if (["촉", "위", "오", "남만", "군웅"].indexOf(card.faction) < 0) {
      errors.push(card.id + ": 지원하지 않는 진영");
    }
    if (!isIntegerInRange(card.cost, 0, 10) || (!isToken && card.cost < 1)) {
      errors.push(card.id + ": 비용 범위 오류");
    }
    if (!isIntegerInRange(card.attack, 0, 12)) {
      errors.push(card.id + ": 공격력 범위 오류");
    }
    if (!isIntegerInRange(card.health, 1, 12)) {
      errors.push(card.id + ": 생명력 범위 오류");
    }
    if (!Array.isArray(card.keywords)) {
      errors.push(card.id + ": keywords는 배열이어야 함");
    } else {
      card.keywords.forEach(function validateKeyword(keyword) {
        if (KEYWORDS.indexOf(keyword) < 0) {
          errors.push(card.id + ": 지원하지 않는 키워드 " + keyword);
        }
      });
    }
    if (TARGETS.indexOf(card.target) < 0) {
      errors.push(card.id + ": 지원하지 않는 target");
    }
    if (!Array.isArray(card.abilities)) {
      errors.push(card.id + ": abilities는 배열이어야 함");
    } else {
      card.abilities.forEach(function validateOneAbility(ability, index) {
        validateAbility(card, ability, index, errors);
      });
    }
    var usesTarget = card.abilities.some(function targetedAbility(ability) {
      return ability.op === "damage_target" || ability.op === "buff_target";
    });
    if (usesTarget && card.target === "none") {
      errors.push(card.id + ": 대상 효과에 target이 없음");
    }
    if (!usesTarget && card.target !== "none") {
      errors.push(card.id + ": 대상 효과 없이 target이 지정됨");
    }
    if (
      card.abilities.some(function damageTarget(ability) {
        return ability.op === "damage_target";
      }) &&
      card.target !== "enemy" &&
      card.target !== "any"
    ) {
      errors.push(card.id + ": 피해 대상은 enemy 또는 any여야 함");
    }
    if (
      card.abilities.some(function buffTarget(ability) {
        return ability.op === "buff_target";
      }) &&
      card.target !== "friendly" &&
      card.target !== "any"
    ) {
      errors.push(card.id + ": 강화 대상은 friendly 또는 any여야 함");
    }
    if (card.text !== describeCard(card)) {
      errors.push(card.id + ": 카드 텍스트가 효과 DSL과 일치하지 않음");
    }
    if (card.summaryText !== describeSummary(card)) {
      errors.push(card.id + ": 손패 요약 문구가 효과 DSL과 일치하지 않음");
    }
    if (card.text.length > 120) {
      errors.push(card.id + ": 카드 텍스트가 상세 패널의 가독성 한도(120자)를 초과함");
    }
    if (card.summaryText.length > 44) {
      errors.push(card.id + ": 손패 요약 문구가 가독성 한도(44자)를 초과함");
    }
    card.keywords.forEach(function requireKeywordDefinition(keyword) {
      if (card.text.indexOf(keyword + " — " + KEYWORD_GLOSSARY[keyword]) < 0) {
        errors.push(card.id + ": " + keyword + "의 규칙 설명이 카드 텍스트에 없음");
      }
    });
    card.abilities.forEach(function requireTriggerLabel(ability) {
      var label = ability.trigger === "onDeath" ? "유언:" : "출전:";
      if (card.text.indexOf(label) < 0) {
        errors.push(card.id + ": " + ability.trigger + " 효과의 발동 시점이 텍스트에 없음");
      }
    });
    if (!isToken) {
      var tacticFields = ["identity", "plan", "combo", "counter"];
      if (
        !card.tactics ||
        tacticFields.some(function missingTactic(field) {
          return (
            typeof card.tactics[field] !== "string" ||
            card.tactics[field].trim().length < 6
          );
        })
      ) {
        errors.push(card.id + ": 전술 역할·운용·콤보·대응 정보가 불완전함");
      }
    }
    if (
      !card.palette ||
      !hasHexColor(card.palette.primary) ||
      !hasHexColor(card.palette.secondary) ||
      !hasHexColor(card.palette.glow)
    ) {
      errors.push(card.id + ": palette 색상 형식 오류");
    }
    if (
      !card.portrait ||
      ["motif", "weapon", "temperament"].some(function missingPortrait(field) {
        return (
          typeof card.portrait[field] !== "string" ||
          card.portrait[field].trim() === ""
        );
      })
    ) {
      errors.push(card.id + ": portrait 모티프 데이터 누락");
    }
  }

  function factionCounts(cards) {
    return cards.reduce(function countFaction(counts, card) {
      counts[card.faction] = (counts[card.faction] || 0) + 1;
      return counts;
    }, {});
  }

  function curveFor(deck) {
    var curve = {};
    deck.forEach(function countCost(id) {
      var cost = CARD_BY_ID[id].cost;
      curve[cost] = (curve[cost] || 0) + 1;
    });
    return curve;
  }

  function sampleDeckStats(sampleSize) {
    var totalCost = 0;
    var totalCards = 0;
    var firstTurnPlayableSeeds = 0;
    var minimumAverage = Infinity;
    var maximumAverage = -Infinity;

    for (var seed = 0; seed < sampleSize; seed += 1) {
      var sampledDeck = buildDeck(seed);
      var sampledCost = sampledDeck.reduce(function addSampledCost(sum, id) {
        return sum + CARD_BY_ID[id].cost;
      }, 0);
      var sampledAverage = sampledCost / sampledDeck.length;
      totalCost += sampledCost;
      totalCards += sampledDeck.length;
      minimumAverage = Math.min(minimumAverage, sampledAverage);
      maximumAverage = Math.max(maximumAverage, sampledAverage);

      if (
        sampledDeck.slice(0, 4).some(function openingOneDrop(id) {
          return CARD_BY_ID[id].cost <= 1;
        })
      ) {
        firstTurnPlayableSeeds += 1;
      }
    }

    return {
      sampleSize: sampleSize,
      averageDeckCost: Number((totalCost / totalCards).toFixed(3)),
      minimumDeckCost: Number(minimumAverage.toFixed(2)),
      maximumDeckCost: Number(maximumAverage.toFixed(2)),
      firstTurnPlayableSeeds: firstTurnPlayableSeeds,
      firstTurnPlayableRate: Number(
        (firstTurnPlayableSeeds / sampleSize).toFixed(3)
      )
    };
  }

  function estimateCardPower(card) {
    var score = card.attack + card.health;
    card.keywords.forEach(function scoreKeyword(keyword) {
      if (keyword === "돌진") score += card.attack * 0.55;
      if (keyword === "수호") score += Math.min(2, card.health * 0.25);
      if (keyword === "방패") score += 1.6;
    });
    card.abilities.forEach(function scoreAbility(ability) {
      var amount = ability.amount || 1;
      if (ability.op === "damage_target") score += amount * 1.3;
      if (ability.op === "damage_enemy_hero") score += amount;
      if (ability.op === "damage_random_enemy") score += amount * 0.8;
      if (ability.op === "damage_all_enemies") score += amount * 2.1;
      if (ability.op === "heal_friendly_hero") score += amount * 0.55;
      if (ability.op === "draw") score += amount * 1.8;
      if (ability.op === "gain_armor") score += amount * 0.5;
      if (ability.op === "reduce_random_hand_cost") score += amount * 0.8;
      if (ability.op === "ready_random_friendly") score += 2.5;
      if (ability.op === "buff_target") {
        score += (ability.attack + ability.health) * 1.1;
      }
      if (ability.op === "buff_friendly_board") {
        score += (ability.attack + ability.health) * 2.2;
      }
      if (ability.op === "buff_adjacent") {
        score += (ability.attack + ability.health) * 1.6;
      }
      if (ability.op === "buff_self") {
        score += ability.attack + ability.health;
      }
      if (ability.op === "summon_token") {
        var token = TOKEN_BY_ID[ability.tokenId];
        if (token) {
          score += (token.attack + token.health) * (ability.count || 1);
        }
      }
    });
    return Number(score.toFixed(2));
  }

  function balanceAudit(sampleSize) {
    var entries = CARDS.map(function auditCard(card) {
      var estimatedPower = estimateCardPower(card);
      var expectedPower = card.cost * 2 + 1;
      return {
        id: card.id,
        identity: card.tactics.identity,
        cost: card.cost,
        estimatedPower: estimatedPower,
        expectedPower: expectedPower,
        ratio: Number((estimatedPower / expectedPower).toFixed(3))
      };
    });
    var deckStats = sampleDeckStats(sampleSize || 5000);
    return {
      ok: entries.every(function withinContextualBand(entry) {
        return entry.ratio >= 0.75 && entry.ratio <= 1.45;
      }),
      entries: entries,
      deckStats: deckStats,
      minimumRatio: Math.min.apply(
        null,
        entries.map(function ratio(entry) {
          return entry.ratio;
        })
      ),
      maximumRatio: Math.max.apply(
        null,
        entries.map(function ratio(entry) {
          return entry.ratio;
        })
      )
    };
  }

  function validateSummonGraph(errors) {
    var visiting = Object.create(null);
    var visited = Object.create(null);

    function visit(definition) {
      if (visited[definition.id]) return;
      if (visiting[definition.id]) {
        errors.push(definition.id + ": 소환 효과 순환으로 무한 발동 가능");
        return;
      }
      visiting[definition.id] = true;
      definition.abilities.forEach(function followSummon(ability) {
        if (ability.op !== "summon_token") return;
        var token = TOKEN_BY_ID[ability.tokenId];
        if (token) visit(token);
      });
      visiting[definition.id] = false;
      visited[definition.id] = true;
    }

    CARDS.concat(TOKENS).forEach(visit);
  }

  function textMetrics() {
    var detailTotal = 0;
    var summaryTotal = 0;
    var longestDetail = null;
    var longestSummary = null;
    CARDS.forEach(function measure(card) {
      detailTotal += card.text.length;
      summaryTotal += card.summaryText.length;
      if (!longestDetail || card.text.length > longestDetail.length) {
        longestDetail = { id: card.id, length: card.text.length };
      }
      if (!longestSummary || card.summaryText.length > longestSummary.length) {
        longestSummary = { id: card.id, length: card.summaryText.length };
      }
    });
    return {
      averageDetailLength: Number((detailTotal / CARDS.length).toFixed(1)),
      averageSummaryLength: Number((summaryTotal / CARDS.length).toFixed(1)),
      longestDetail: longestDetail,
      longestSummary: longestSummary
    };
  }

  function validate() {
    var errors = [];
    var seenIds = Object.create(null);
    CARDS.forEach(function validateCard(card) {
      validateDefinition(card, seenIds, errors, false);
    });
    TOKENS.forEach(function validateToken(token) {
      validateDefinition(token, seenIds, errors, true);
    });
    validateSummonGraph(errors);

    if (CARDS.length !== 27) {
      errors.push("카드 정의는 정확히 27장이어야 함");
    }
    var factions = factionCounts(CARDS);
    if (
      factions["촉"] !== 7 ||
      factions["위"] !== 7 ||
      factions["오"] !== 7 ||
      factions["남만"] !== 5 ||
      factions["군웅"] !== 1
    ) {
      errors.push("진영 구성은 촉 7, 위 7, 오 7, 남만 5, 군웅 1이어야 함");
    }

    var deck = buildDeck("validation-seed");
    if (deck.length !== 20) {
      errors.push("덱은 정확히 20장이어야 함");
    }
    var deckCopies = Object.create(null);
    deck.forEach(function validateDeckId(id) {
      if (!CARD_BY_ID[id]) {
        errors.push("덱에 알 수 없는 카드 id: " + id);
      }
      deckCopies[id] = (deckCopies[id] || 0) + 1;
    });
    Object.keys(deckCopies).forEach(function ensureCopyLimit(id) {
      if (deckCopies[id] > 2) {
        errors.push("덱의 같은 카드가 2장을 초과함: " + id);
      }
    });

    var recipeFaction = {
      wei: "위",
      shu: "촉",
      wu: "오",
      nanman: "남만"
    };
    var recipeCoverage = Object.create(null);
    Object.keys(recipeFaction).forEach(function validateRecipe(recipeKey) {
      var recipeDeck = buildDeck("recipe-validation", recipeKey);
      var copies = Object.create(null);
      var selectedFactionCards = 0;
      var recipeCheap = 0;
      var recipeEarly = 0;
      if (recipeDeck.length !== 20) {
        errors.push(recipeKey + " 진영 덱이 정확히 20장이 아님");
      }
      recipeDeck.forEach(function validateRecipeCard(id) {
        var definition = CARD_BY_ID[id];
        if (!definition) {
          errors.push(recipeKey + " 진영 덱에 알 수 없는 카드 id: " + id);
          return;
        }
        recipeCoverage[id] = true;
        copies[id] = (copies[id] || 0) + 1;
        if (definition.faction === recipeFaction[recipeKey]) {
          selectedFactionCards += 1;
        }
        if (definition.cost <= 2) recipeCheap += 1;
        if (definition.cost <= 4) recipeEarly += 1;
      });
      Object.keys(copies).forEach(function validateRecipeCopies(id) {
        if (copies[id] > 2) {
          errors.push(recipeKey + " 진영 덱의 " + id + "가 2장을 초과함");
        }
      });
      if (selectedFactionCards < 10) {
        errors.push(recipeKey + " 진영 덱의 선택 진영 카드가 10장 미만임");
      }
      if (recipeCheap < 3 || recipeEarly < 10) {
        errors.push(recipeKey + " 진영 덱의 초·중반 비용 곡선이 부족함");
      }
    });
    CARDS.forEach(function ensureRecipeCoverage(card) {
      if (!recipeCoverage[card.id]) {
        errors.push("어떤 진영 덱에도 포함되지 않은 카드: " + card.id);
      }
    });

    var cheapCards = deck.filter(function cheapCard(id) {
      return CARD_BY_ID[id].cost <= 2;
    }).length;
    var earlyCards = deck.filter(function earlyCard(id) {
      return CARD_BY_ID[id].cost <= 4;
    }).length;
    if (cheapCards < 3) {
      errors.push("초반 카드(비용 2 이하)가 3장 미만임");
    }
    if (earlyCards < 10) {
      errors.push("중반 이전 카드(비용 4 이하)가 10장 미만임");
    }
    if (
      CARDS.filter(function exactOneCost(card) {
        return card.cost === 1;
      }).length < 4
    ) {
      errors.push("첫 턴 선택지를 위한 1비용 카드가 4종 미만임");
    }
    if (
      !CARDS.some(function exactTwoCost(card) {
        return card.cost === 2;
      })
    ) {
      errors.push("2턴 선택지를 위한 2비용 카드가 없음");
    }

    var sampleStats = sampleDeckStats(500);
    if (
      sampleStats.averageDeckCost < 3.7 ||
      sampleStats.averageDeckCost > 4.0
    ) {
      errors.push(
        "500시드 평균 덱 비용이 목표 범위(3.7~4.0)를 벗어남: " +
          sampleStats.averageDeckCost
      );
    }
    if (sampleStats.firstTurnPlayableRate < 0.55) {
      errors.push(
        "500시드 첫 턴 플레이 가능 비율이 55% 미만임: " +
          sampleStats.firstTurnPlayableRate
      );
    }

    CARDS.forEach(function checkBurst(card) {
      var immediate = card.keywords.indexOf("돌진") >= 0 ? card.attack : 0;
      card.abilities.forEach(function addFaceDamage(ability) {
        if (ability.op === "damage_enemy_hero") {
          immediate += ability.amount;
        }
        if (
          ability.op === "damage_target" &&
          (card.target === "enemy" || card.target === "any")
        ) {
          immediate += ability.amount;
        }
      });
      if (immediate > 10) {
        errors.push(card.id + ": 단일 카드 즉발 피해가 10을 초과함");
      }
    });

    var identities = Object.create(null);
    CARDS.forEach(function checkDistinctIdentity(card) {
      var identity = card.tactics && card.tactics.identity;
      if (identities[identity]) {
        errors.push(
          card.id + ": 전술 정체성이 " + identities[identity] + "와 중복됨"
        );
      }
      identities[identity] = card.id;
    });

    var powerAudit = balanceAudit(5000);
    if (!powerAudit.ok) {
      powerAudit.entries.forEach(function reportOutlier(entry) {
        if (entry.ratio < 0.75 || entry.ratio > 1.45) {
          errors.push(
            entry.id +
              ": 추정 비용 효율이 허용 범위를 벗어남(" +
              entry.ratio +
              ")"
          );
        }
      });
    }

    var totalCost = deck.reduce(function addCost(sum, id) {
      return sum + CARD_BY_ID[id].cost;
    }, 0);
    return {
      ok: errors.length === 0,
      errors: errors,
      summary: {
        cards: CARDS.length,
        deckSize: deck.length,
        tokens: TOKENS.length,
        factions: factions,
        averageDeckCost: Number((totalCost / deck.length).toFixed(2)),
        curve: curveFor(deck),
        cheapCards: cheapCards,
        earlyCards: earlyCards,
        sample500: sampleStats,
        balance5000: powerAudit,
        textMetrics: textMetrics(),
        maxCopies: Math.max.apply(
          null,
          Object.keys(deckCopies).map(function copyCount(id) {
            return deckCopies[id];
          })
        )
      }
    };
  }

  global.TK = global.TK || { modules: {} };
  global.TK.modules = global.TK.modules || {};
  global.TK.modules.cardData = {
    getCards: function getCards() {
      return clone(CARDS);
    },
    buildDeck: buildDeck,
    getDeckRecipes: function getDeckRecipes() {
      return clone(DECK_RECIPES);
    },
    getToken: function getToken(id) {
      return TOKEN_BY_ID[id] ? clone(TOKEN_BY_ID[id]) : null;
    },
    getTokens: function getTokens() {
      return TOKENS.reduce(function tokenMap(result, token) {
        result[token.id] = clone(token);
        return result;
      }, {});
    },
    getKeywordGlossary: function getKeywordGlossary() {
      return clone(KEYWORD_GLOSSARY);
    },
    auditBalance: balanceAudit,
    validate: validate
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
