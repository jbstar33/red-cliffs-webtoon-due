import type { Metadata } from "next";
import { GameShell } from "./GameShell";

export const metadata: Metadata = {
  title: "적벽전설 — 삼국지 카드대전",
  description:
    "위·촉·오의 영웅을 지휘해 책사 AI와 겨루는 오프라인 1:1 카드 대전",
};

export default function Home() {
  return <GameShell />;
}
