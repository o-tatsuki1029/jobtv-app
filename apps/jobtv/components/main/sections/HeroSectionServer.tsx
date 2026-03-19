import { Suspense } from "react";
import { getTopPageHeroItems } from "@/lib/actions/top-page-hero-actions";
import HeroSectionShell from "./HeroSectionShell";
import HeroCarousel from "./HeroCarousel";

/** カルーセルのデータを取得して描画する async Server Component */
async function HeroCarouselLoader() {
  const result = await getTopPageHeroItems();
  const items = (result.data ?? []).map((h) => ({
    thumbnail: h.thumbnail_url || h.auto_thumbnail_url || "",
    videoUrl: h.video_url ?? undefined,
    isPR: h.is_pr,
    moreLink: h.link_url ?? undefined,
    title: h.title,
  }));

  if (items.length === 0) return null;
  return <HeroCarousel items={items} />;
}

/** HeroCarousel の Indicators と同じ DOM 構造・高さでスケルトンを表示し、
 *  読み込み前後のレイアウトシフトを防ぐ */
function CarouselSkeleton() {
  return (
    <div>
      <div className="overflow-hidden rounded-xl shadow-2xl">
        <div className="aspect-video bg-white/10 animate-pulse" />
      </div>
      {/* Indicators 相当: 1行目(タイトル+もっと見るボタン) + 2行目(ドット) */}
      <div className="mt-3 flex flex-col gap-2">
        {/* 1行目: 実際の Indicators は flex items-center justify-between で
            PR badge + title(text-sm) + もっと見るボタン(px-3 py-1.5 text-xs border rounded-full)。
            ボタンの高さに合わせる */}
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 rounded bg-white/10" />
          <div className="h-[30px] w-[76px] rounded-full border border-white/20" />
        </div>
        {/* 2行目: 矢印 + ドット */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-6 h-6 rounded-full bg-white/10" />
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`rounded-full ${i === 0 ? "w-4 h-1 bg-white/20" : "w-1 h-1 bg-white/15"}`} />
            ))}
          </div>
          <div className="w-6 h-6 rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}

/**
 * ヒーローセクション:
 * - 左側（テキスト・ボタン）は即座に表示
 * - 右側（カルーセル）はデータ到着後にストリーミング表示
 */
export default function HeroSectionServer() {
  return (
    <HeroSectionShell>
      <Suspense fallback={<CarouselSkeleton />}>
        <HeroCarouselLoader />
      </Suspense>
    </HeroSectionShell>
  );
}
