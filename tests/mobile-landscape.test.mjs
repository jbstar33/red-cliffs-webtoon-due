import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const VIEWPORTS = Object.freeze([
  { width: 667, height: 375, name: "iPhone SE/8 landscape" },
  { width: 740, height: 360, name: "small Android landscape" },
  { width: 844, height: 390, name: "iPhone 12-14 landscape" },
  { width: 932, height: 430, name: "large iPhone landscape" },
]);

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const layoutSource = readFileSync(
  new URL("../app/layout.tsx", import.meta.url),
  "utf8",
);
const shellSource = readFileSync(
  new URL("../app/GameShell.tsx", import.meta.url),
  "utf8",
);
const boardSource = readFileSync(
  new URL("../public/systems/board-ui/index.js", import.meta.url),
  "utf8",
);

function cssBlock(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, "m"))?.[1] ?? "";
}

function lowLandscapeCss() {
  const start = css.search(
    /@media\s*\([^)]*max-height\s*:\s*560px[^)]*\)\s*and\s*\(orientation\s*:\s*landscape\)/i,
  );
  if (start < 0) return "";
  const next = css.indexOf("@media", start + 6);
  return css.slice(start, next < 0 ? css.length : next);
}

function loadBoardTestHooks() {
  const previousTK = globalThis.TK;
  try {
    globalThis.TK = { modules: {} };
    vm.runInThisContext(boardSource, {
      filename: "public/systems/board-ui/index.js",
    });
    return globalThis.TK.modules.boardUI.testHooks;
  } finally {
    globalThis.TK = previousTK;
  }
}

function rectanglesOverlap(a, b) {
  return !(
    a.x + a.width <= b.x
    || b.x + b.width <= a.x
    || a.y + a.height <= b.y
    || b.y + b.height <= a.y
  );
}

test("mobile landscape viewport fills dynamic height and respects all safe-area edges", () => {
  assert.match(
    layoutSource,
    /export\s+const\s+viewport\b[\s\S]*?viewportFit\s*:\s*["']cover["']/,
    "notched landscape devices require viewport-fit=cover",
  );

  for (const edge of ["top", "right", "bottom", "left"]) {
    assert.match(
      css,
      new RegExp(`env\\(safe-area-inset-${edge}`),
      `safe-area-inset-${edge} must participate in layout`,
    );
  }

  const shell = cssBlock("#game-shell");
  const stage = cssBlock("#game-stage");
  assert.match(shell, /position\s*:\s*fixed/i);
  assert.match(shell, /overflow\s*:\s*hidden/i);
  assert.match(shell, /height\s*:\s*100dvh/i);
  assert.match(
    shell,
    /padding\s*:[\s\S]*?var\(--shell-pad-top\)[\s\S]*?var\(--shell-pad-right\)[\s\S]*?var\(--shell-pad-bottom\)[\s\S]*?var\(--shell-pad-left\)/i,
    "the safe-area values must be wired into the shell padding",
  );
  assert.match(stage, /100dvh/i);
  assert.match(stage, /var\(--shell-pad-top\)/i);
  assert.match(stage, /var\(--shell-pad-bottom\)/i);
  assert.match(cssBlock("html,\nbody"), /overflow\s*:\s*hidden/i);
});

test("canvas display and backing stores fit every supported landscape viewport", () => {
  const hooks = loadBoardTestHooks();
  assert.equal(typeof hooks.boardRenderMetrics, "function");

  for (const viewport of VIEWPORTS) {
    // Reserve a conservative landscape notch/home-indicator envelope. The
    // renderer receives the remaining stage box and must never spill out of it.
    const availableWidth = viewport.width - 44 - 44 - 8;
    const availableHeight = viewport.height - 21 - 24 - 8;

    for (const dpr of [1, 2, 3]) {
      const metrics = hooks.boardRenderMetrics(
        availableWidth,
        availableHeight,
        dpr,
      );
      assert.ok(metrics.cssWidth <= availableWidth, `${viewport.name} width overflow`);
      assert.ok(metrics.cssHeight <= availableHeight, `${viewport.name} height overflow`);
      assert.ok(metrics.cssWidth > 0 && metrics.cssHeight > 0);
      assert.ok(metrics.backingWidth >= metrics.cssWidth);
      assert.ok(metrics.backingHeight >= metrics.cssHeight);
      assert.ok(metrics.backingWidth <= 1365 * 2);
      assert.ok(metrics.backingHeight <= 768 * 2);
      assert.ok(
        Math.abs(metrics.cssWidth / metrics.cssHeight - 1365 / 768) < 0.01,
        `${viewport.name} must preserve the logical board ratio`,
      );
    }
  }

  assert.match(boardSource, /new\s+global\.ResizeObserver\(resizeCanvas\)/);
  assert.match(boardSource, /getBoundingClientRect\(\)/);
  assert.match(boardSource, /canvas\.style\.width\s*=/);
  assert.match(boardSource, /canvas\.style\.height\s*=/);
});

test("touch input keeps visual overlays passive and pointer coordinates scale to canvas", () => {
  assert.match(cssBlock("#game-stage"), /touch-action\s*:\s*none/i);
  assert.match(
    css,
    /#fx-canvas\s*\{[\s\S]*?pointer-events\s*:\s*none/i,
  );
  assert.match(cssBlock("#game-help"), /pointer-events\s*:\s*none/i);
  assert.match(boardSource, /setPointerCapture/);
  assert.match(boardSource, /releasePointerCapture/);
  assert.match(boardSource, /addEventListener\(["']pointercancel["']/);
  assert.match(
    boardSource,
    /event\.clientX\s*-\s*rect\.left[\s\S]*?rect\.width[\s\S]*?LOGICAL_WIDTH/,
  );
  assert.match(
    boardSource,
    /event\.clientY\s*-\s*rect\.top[\s\S]*?rect\.height[\s\S]*?LOGICAL_HEIGHT/,
  );
});

test("mobile touch controls stay large and clear of an open card inspector", () => {
  const hooks = loadBoardTestHooks();
  assert.equal(typeof hooks.mobileLandscapeProfile, "function");
  assert.equal(typeof hooks.minimumTouchTargetGeometry, "function");

  for (const viewport of VIEWPORTS) {
    const profile = hooks.mobileLandscapeProfile(viewport.width, viewport.height);
    assert.equal(profile.active, true, `${viewport.name} must use the mobile profile`);

    const expanded = hooks.minimumTouchTargetGeometry(100, 100, 18, 22, profile);
    assert.ok(
      expanded.width * profile.stageScale >= 43.5,
      `${viewport.name} touch width must remain approximately 44 CSS pixels`,
    );
    assert.ok(
      expanded.height * profile.stageScale >= 43.5,
      `${viewport.name} touch height must remain approximately 44 CSS pixels`,
    );

    for (const panelSide of ["left", "right"]) {
      const panel = hooks.inspectionPanelGeometry(panelSide, profile);
      const turnButton = hooks.turnButtonGeometry(panelSide, profile);
      assert.equal(
        rectanglesOverlap(panel, turnButton),
        false,
        `${viewport.name} ${panelSide} inspector must not cover the end-turn action`,
      );
    }
  }

  const desktop = hooks.mobileLandscapeProfile(1365, 768);
  assert.equal(desktop.active, false, "desktop geometry must remain on its existing path");
  assert.match(boardSource, /global\.visualViewport\.addEventListener\(["']resize["']/);
  assert.match(boardSource, /global\.visualViewport\.removeEventListener\(["']resize["']/);
  assert.match(boardSource, /aria-label["'],\s*["']카드 상세 닫기["']/);
  assert.match(
    boardSource,
    /\.tk-board-mobile-inspector__body\s*\{[\s\S]*?overflow\s*:\s*auto/,
    "long mobile card text must scroll instead of covering controls",
  );
});

test("all commander choices remain accessible in short landscape viewports", () => {
  assert.match(shellSource, /aria-labelledby=["']faction-select-title["']/);
  assert.equal((shellSource.match(/data-commander=\{commander\.id\}/g) ?? []).length, 1);
  assert.match(shellSource, /<button[\s\S]*?type=["']button["'][\s\S]*?aria-label=/);
  for (const id of ["caocao", "liubei", "sunquan", "nomad"]) {
    assert.match(shellSource, new RegExp(`id:\\s*["']${id}["']`));
  }

  const compact = lowLandscapeCss();
  assert.ok(compact, "a short-landscape layout contract is required");
  assert.match(
    compact,
    /\.faction-select(?:\s|\{)[\s\S]*?(?:overflow(?:-y)?\s*:\s*(?:auto|scroll)|padding\s*:)/,
    "the selection overlay must fit or scroll on short screens",
  );
  assert.match(
    compact,
    /\.faction-select__grid\s*\{/,
    "short landscape needs an explicit commander-grid layout",
  );
  assert.match(
    compact,
    /\.commander-choice\s*\{/,
    "short landscape needs explicit touch-card sizing",
  );
});
