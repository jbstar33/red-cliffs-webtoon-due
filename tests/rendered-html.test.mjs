import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the complete card-table shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="ko"/i);
  assert.match(html, /<title>적벽전설 — 삼국지 카드대전<\/title>/i);
  assert.match(html, /id="game-canvas"/);
  assert.match(html, /id="fx-canvas"/);
  assert.match(html, /id="faction-select"/);
  assert.match(html, /천하의 주인을 선택하십시오/);
  assert.match(html, /data-commander="caocao"/);
  assert.match(html, /data-commander="liubei"/);
  assert.match(html, /data-commander="sunquan"/);
  assert.match(html, /data-commander="nomad"/);
  assert.match(html, /패업의 숨결/);
  assert.match(html, /도원의 맹세/);
  assert.match(html, /수공/);
  assert.match(html, /족쇄 명령/);
  assert.match(html, /군기를 세우고 장수들을 소집하는 중/);
  assert.match(html, /카드 클릭: 상세·선택/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("ships without remote images, fonts, audio, or runtime imports", async () => {
  const files = [
    "../app/layout.tsx",
    "../app/page.tsx",
    "../app/GameShell.tsx",
    "../app/globals.css",
    "../public/game/main.js",
  ];
  const source = (
    await Promise.all(
      files.map((file) => readFile(new URL(file, import.meta.url), "utf8")),
    )
  ).join("\n");

  assert.doesNotMatch(source, /https?:\/\//i);
  assert.doesNotMatch(source, /next\/font|new Audio\s*\(|<img\b/i);
  assert.doesNotMatch(source, /\bimport\s*\(\s*["'][^"']*systems\//i);
  assert.match(source, /#game-stage\s*\{[\s\S]*?height:\s*auto;/);
});
