import type { Metadata } from "next";
import AgentPageClient from "./AgentPageClient";

export const metadata: Metadata = {
  title: "エージェント — 新卒就活支援",
  description:
    "JOBTVエージェントは、専任アドバイザーが内定まで完全無料で伴走する就活エージェント。自己分析から選考対策・内定後フォローまで一気通貫でサポート。",
};

export default function AgentPage() {
  return <AgentPageClient />;
}
