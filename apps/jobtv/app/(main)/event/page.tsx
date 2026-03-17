import type { Metadata } from "next";
import EventPageClient from "./EventPageClient";

export const metadata: Metadata = {
  title: "イベント — draft / arena / summit / fes",
  description:
    "JOBTVのイベントで、動画で企業のリアルを知ってからスカウトをもらう新しい就活。draft・arena・summit・fesの4種類から選んで参加。完全無料。",
};

export default function EventPage() {
  return <EventPageClient />;
}
