"use client";

import { useEffect, useState } from "react";

const scripts = [
  "/systems/card-data/index.js",
  "/systems/rules-engine/index.js",
  "/systems/opponent-ai/index.js",
  "/systems/audio/index.js",
  "/systems/fx-animation/index.js",
  "/systems/board-ui/index.js",
  "/game/main.js",
];

declare global {
  interface Window {
    __tkGameBooted?: boolean;
  }
}

const commanders = [
  {
    id: "caocao",
    faction: "위",
    name: "조조",
    title: "난세의 간웅",
    cost: "1",
    power: "패업의 숨결",
    rules: "내 지휘관의 체력을 1 회복합니다.",
    glyph: "魏",
  },
  {
    id: "liubei",
    faction: "촉",
    name: "유비",
    title: "인덕의 군주",
    cost: "지속",
    power: "도원의 맹세",
    rules: "전투 시작 시 반사 2. 적이 영웅을 공격하면 공격자에게 피해 1.",
    glyph: "蜀",
  },
  {
    id: "sunquan",
    faction: "오",
    name: "손권",
    title: "강동의 호랑이",
    cost: "3",
    power: "수공",
    rules: "모든 적 캐릭터에게 피해를 1 줍니다.",
    glyph: "吳",
  },
  {
    id: "nomad",
    faction: "이민족",
    name: "맹획",
    title: "남중의 왕",
    cost: "2",
    power: "족쇄 명령",
    rules: "선택한 적 장수의 다음 공격을 1회 봉쇄합니다.",
    glyph: "蠻",
  },
] as const;

function CommanderPortrait({
  id,
  glyph,
}: {
  id: (typeof commanders)[number]["id"];
  glyph: string;
}) {
  const palette = {
    caocao: ["#172a45", "#6fa7d8", "#e5c57a"],
    liubei: ["#173e2d", "#58a873", "#e8cd76"],
    sunquan: ["#4a1919", "#d05a39", "#f0c46c"],
    nomad: ["#3b2417", "#b46c31", "#d9b665"],
  }[id];
  const isNomad = id === "nomad";
  const isSun = id === "sunquan";
  const isLiu = id === "liubei";

  return (
    <svg viewBox="0 0 220 272" role="img" aria-label={`${glyph} 지휘관 초상`}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={palette[0]} />
          <stop offset=".58" stopColor={palette[1]} />
          <stop offset="1" stopColor="#080b0d" />
        </linearGradient>
        <radialGradient id={`${id}-face`} cx=".38" cy=".28" r=".78">
          <stop offset="0" stopColor="#e4ba86" />
          <stop offset=".55" stopColor="#9d6542" />
          <stop offset="1" stopColor="#3a211d" />
        </radialGradient>
        <filter id={`${id}-glow`}>
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000" floodOpacity=".62" />
        </filter>
      </defs>
      <rect width="220" height="272" rx="20" fill={`url(#${id}-sky)`} />
      <path
        d="M-10 205 Q38 167 67 189 T132 180 T230 194 V282 H-10Z"
        fill="#05080a"
        opacity=".6"
      />
      <g opacity=".42" fill="none" stroke={palette[2]} strokeWidth="2">
        {isSun ? (
          <>
            <path d="M-8 67 Q42 42 91 67 T228 62" />
            <path d="M-8 84 Q44 59 96 84 T228 79" />
          </>
        ) : isNomad ? (
          <>
            <path d="M18 23 L47 63 L13 91" />
            <path d="M202 18 L174 60 L207 90" />
          </>
        ) : (
          <>
            <path d="M22 15 L38 86" />
            <path d="M198 15 L182 86" />
          </>
        )}
      </g>
      {id === "caocao" && (
        <g opacity=".58">
          <path d="M15 15 L31 123 M205 14 L188 120" stroke="#d5b45f" strokeWidth="3" />
          <path d="M31 30 Q53 38 65 51 L31 69Z M188 28 Q165 37 153 51 L188 70Z" fill="#17233b" stroke="#92afd1" />
          <path d="M18 109 Q45 92 72 106 M148 104 Q179 87 207 106" fill="none" stroke="#101820" strokeWidth="6" />
        </g>
      )}
      {isLiu && (
        <g opacity=".62">
          <path d="M7 118 Q34 68 71 51 M214 116 Q183 66 151 53" fill="none" stroke="#3c2d28" strokeWidth="5" />
          {[25, 45, 173, 193].map((cx) => (
            <g key={cx} fill="#f1a5a5">
              <circle cx={cx} cy={cx < 100 ? 71 : 67} r="5" />
              <circle cx={cx + 6} cy={cx < 100 ? 78 : 75} r="3.5" />
            </g>
          ))}
        </g>
      )}
      {isSun && (
        <g opacity=".7" fill="none">
          <path d="M-8 118 Q30 91 67 118 T141 116 T229 110" stroke="#f1b46f" strokeWidth="4" />
          <path d="M-8 133 Q38 105 78 132 T155 129 T229 123" stroke="#7bc4ca" strokeWidth="3" />
          <circle cx="178" cy="37" r="18" fill="#e78751" opacity=".55" />
        </g>
      )}
      {isNomad && (
        <g opacity=".68">
          <path d="M-10 128 L38 72 L68 113 L111 52 L154 109 L188 69 L231 129Z" fill="#201a15" stroke="#d0a058" strokeWidth="2" />
          <path d="M15 30 Q40 4 59 28 M162 25 Q187 1 209 29" fill="none" stroke="#d7b26c" strokeWidth="5" />
        </g>
      )}
      <path
        d="M36 265 Q43 170 110 164 Q179 169 190 265Z"
        fill={palette[0]}
        stroke={palette[2]}
        strokeWidth="3"
        filter={`url(#${id}-shadow)`}
      />
      <path
        d="M48 258 Q70 185 110 184 Q151 187 177 258"
        fill={palette[1]}
        opacity=".58"
      />
      <path
        d="M52 244 Q60 186 80 172 L108 194 L139 172 Q163 189 174 244"
        fill="none"
        stroke={palette[2]}
        strokeWidth="5"
        opacity=".64"
      />
      <path d="M62 121 Q55 106 67 98 Q75 105 72 123Z" fill="#9e6748" stroke="#2a1715" strokeWidth="3" />
      <path d="M149 121 Q158 105 150 97 Q141 103 145 124Z" fill="#7e4d37" stroke="#2a1715" strokeWidth="3" />
      <path
        d="M75 79 Q108 52 145 80 L151 124 Q142 169 109 177 Q75 165 68 125Z"
        fill={`url(#${id}-face)`}
        stroke="#1b1210"
        strokeWidth="4"
      />
      <path
        d="M75 83 Q91 63 110 61 Q137 63 145 82 Q127 72 111 78 Q93 70 75 83Z"
        fill="#1b1718"
        opacity=".9"
      />
      <path
        d="M76 82 Q78 126 87 151 Q72 141 68 124Z"
        fill="#4a291f"
        opacity=".5"
      />
      <path
        d="M82 94 Q93 77 108 77 Q97 100 96 130 Q88 121 82 94Z"
        fill="#f3ce9e"
        opacity=".24"
      />
      <path
        d="M125 79 Q142 91 145 122 Q141 150 121 165 Q136 137 128 112Z"
        fill="#3c211d"
        opacity=".34"
      />
      <path
        d="M76 111 Q92 101 103 109 M116 109 Q132 101 144 112"
        fill="none"
        stroke="#291918"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <g>
        <path d="M80 116 Q91 109 102 116 Q92 124 80 116Z" fill="#e5cfb1" />
        <path d="M116 116 Q128 108 141 116 Q129 124 116 116Z" fill="#e5cfb1" />
        <circle cx="92" cy="116" r="3.4" fill="#15191b" />
        <circle cx="128" cy="116" r="3.4" fill="#15191b" />
        <circle cx="91" cy="115" r="1" fill="#dff8ff" />
        <circle cx="127" cy="115" r="1" fill="#dff8ff" />
      </g>
      <path d="M108 111 L102 137 L116 139" fill="none" stroke="#70442f" strokeWidth="4" />
      <path d="M104 136 Q109 140 117 137" fill="none" stroke="#d69a70" strokeWidth="2" opacity=".65" />
      <path
        d={isLiu ? "M91 150 Q109 158 128 149" : "M91 149 Q109 143 130 151"}
        fill="none"
        stroke="#301b19"
        strokeWidth="4"
      />
      {!isLiu && (
        <path
          d={isNomad ? "M83 148 Q109 164 139 148" : "M89 150 Q109 159 132 150"}
          fill="none"
          stroke="#281719"
          strokeWidth={isNomad ? "7" : "4"}
          opacity=".9"
        />
      )}
      <path
        d={
          isNomad
            ? "M64 91 L50 53 L81 66 L110 37 L143 67 L173 52 L154 95Z"
            : isSun
              ? "M68 88 L78 48 L98 58 L110 29 L124 58 L145 48 L153 89Z"
              : "M66 89 L80 45 L101 54 L110 30 L121 54 L145 45 L154 90Z"
        }
        fill={palette[0]}
        stroke={palette[2]}
        strokeWidth="4"
      />
      <path
        d={
          isNomad
            ? "M72 75 L91 57 L111 69 L131 56 L153 77"
            : "M79 62 L96 55 L110 63 L125 55 L143 63"
        }
        fill="none"
        stroke={palette[2]}
        strokeWidth="3"
        opacity=".8"
      />
      <circle cx="110" cy={isNomad ? "53" : "48"} r="5" fill="#c33d32" stroke="#f0d083" strokeWidth="2" />
      {id === "caocao" && (
        <>
          <path d="M92 151 Q109 181 128 151 Q124 190 109 202 Q94 188 92 151Z" fill="#201717" />
          <path d="M169 244 L194 115" stroke="#d7c8a1" strokeWidth="7" />
          <path d="M188 119 L202 103 L197 126Z" fill="#d8bd73" />
        </>
      )}
      {isLiu && (
        <g fill="none" stroke={palette[2]} strokeWidth="5">
          <path d="M57 249 L26 128" />
          <path d="M163 249 L196 128" />
          <path d="M21 132 L31 113 L37 137 M189 133 L198 112 L205 137" fill={palette[2]} />
        </g>
      )}
      {isSun && (
        <g>
          <path d="M163 249 L192 121" stroke="#e6d28d" strokeWidth="7" />
          <path d="M181 134 L205 129" stroke="#e6d28d" strokeWidth="5" />
        </g>
      )}
      {isNomad && (
        <>
          <path d="M72 185 Q110 219 150 185" fill="none" stroke="#d2aa63" strokeWidth="7" />
          <path d="M41 238 Q18 190 51 157 Q76 133 86 164 Q91 185 65 191 Q43 193 45 172" fill="none" stroke="#d6b77e" strokeWidth="5" />
        </>
      )}
      <text
        x="110"
        y="244"
        textAnchor="middle"
        fill={palette[2]}
        fontFamily="SimSun, serif"
        fontSize="34"
        fontWeight="800"
        filter={`url(#${id}-glow)`}
      >
        {glyph}
      </text>
    </svg>
  );
}

export function GameShell() {
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loaded: HTMLScriptElement[] = [];

    async function loadGame() {
      if (window.__tkGameBooted) return;

      try {
        for (const src of scripts) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector<HTMLScriptElement>(
              `script[data-tk-module="${src}"]`,
            );
            if (existing?.dataset.loaded === "true") {
              resolve();
              return;
            }

            const script = existing ?? document.createElement("script");
            script.src = src;
            script.async = false;
            script.dataset.tkModule = src;
            script.addEventListener(
              "load",
              () => {
                script.dataset.loaded = "true";
                resolve();
              },
              { once: true },
            );
            script.addEventListener(
              "error",
              () => reject(new Error(`${src} 로드 실패`)),
              { once: true },
            );
            if (!existing) {
              loaded.push(script);
              document.body.appendChild(script);
            }
          });
          if (cancelled) return;
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "게임을 불러오지 못했습니다.",
          );
        }
      }
    }

    void loadGame();
    return () => {
      cancelled = true;
      if (!window.__tkGameBooted) {
        loaded.forEach((script) => script.remove());
      }
    };
  }, []);

  return (
    <main id="game-shell" aria-label="적벽전설 카드 대전">
      <section id="game-stage" aria-live="polite">
        <canvas
          id="game-canvas"
          width="1365"
          height="768"
          aria-label="삼국지 카드 대전판"
          tabIndex={0}
        />
        <canvas id="fx-canvas" width="1365" height="768" aria-hidden="true" />
        <section
          id="faction-select"
          className="faction-select"
          aria-labelledby="faction-select-title"
          hidden
        >
          <header className="faction-select__header">
            <p>CHOOSE YOUR COMMANDER</p>
            <h1 id="faction-select-title">천하의 주인을 선택하십시오</h1>
            <span>선택한 진영의 고유 지휘관 능력으로 한 판을 끝까지 지휘합니다.</span>
          </header>
          <div className="faction-select__grid">
            {commanders.map((commander) => (
              <button
                className={`commander-choice commander-choice--${commander.id}`}
                data-commander={commander.id}
                key={commander.id}
                type="button"
                aria-label={`${commander.faction} ${commander.name}. ${commander.power}. ${commander.rules}`}
              >
                <span className="commander-choice__art" aria-hidden="true">
                  <CommanderPortrait id={commander.id} glyph={commander.glyph} />
                </span>
                <span className="commander-choice__faction">{commander.faction}</span>
                <strong>{commander.name}</strong>
                <span className="commander-choice__title">{commander.title}</span>
                <span className="commander-choice__power">
                  <b>{commander.cost}</b>
                  <span>
                    <strong>{commander.power}</strong>
                    <small>{commander.rules}</small>
                  </span>
                </span>
              </button>
            ))}
          </div>
          <p className="faction-select__hint">진영을 선택하면 다른 세력의 지휘관과 대전이 시작됩니다.</p>
        </section>
        <div id="game-loading" role="status">
          <div className="loading-standard" aria-hidden="true">
            <span className="standard standard-left" />
            <span className="standard standard-right" />
            <div className="seal">
              <span>赤</span>
            </div>
          </div>
          <p className="eyebrow">THREE KINGDOMS CARD DUEL</p>
          <h1>적벽전설</h1>
          <p className="loading-copy">
            {loadError || "군기를 세우고 장수들을 소집하는 중…"}
          </p>
          <div className="loading-track" aria-hidden="true">
            <span />
          </div>
          <div className="loading-marks" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </div>
        <p id="game-announcer" className="sr-only" aria-live="polite" />
      </section>
      <aside id="game-help" aria-label="조작 도움말">
        <span className="help-full">
          카드 클릭: 상세·선택 · 전장으로 끌어 출전 · 아군 선택 후 적을 눌러
          공격 · 지휘관 문양: 고유 능력 · Esc 선택 취소 · M 음소거
        </span>
        <span className="help-compact">
          클릭 상세 · 드래그 출전 · 지휘관 능력 · Esc 취소 · M 음소거
        </span>
        <span className="rotate-hint">
          <b aria-hidden="true">↻</b> 더 넓은 전장을 위해 기기를 가로로 돌려주세요
        </span>
      </aside>
    </main>
  );
}
