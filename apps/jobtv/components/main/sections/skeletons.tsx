/**
 * Suspense fallback skeletons for top page sections.
 * 各セクションの実際の DOM 構造・クラス・サイズに合わせて作成し、
 * 読み込み前後のレイアウトシフトを防ぐ。
 */

function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className ?? ""}`} />;
}

/** SectionHeader のスケルトン（アイコン + タイトル） */
function SectionHeaderSkeleton() {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <Pulse className="w-8 h-8 rounded" />
        <Pulse className="h-7 w-40 rounded" />
      </div>
    </div>
  );
}

/**
 * BannerList: md:mx-4 > flex gap-5 py-6 pl-4
 * カード: w-[250px] sm:w-[300px] md:w-[350px], aspect-[16/9], rounded-xl
 */
export function BannerSkeleton() {
  return (
    <div className="md:mx-4">
      <div className="flex gap-5 py-6 pl-4 md:pl-0 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <Pulse
            key={i}
            className="flex-shrink-0 w-[250px] sm:w-[300px] md:w-[350px] aspect-[16/9] rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * ShortVideoSection: py-8 内に SectionHeader + 横スクロールカードリスト
 * カード: w-[140px] sm:w-[180px] md:w-[200px], aspect-[5/7]
 */
export function ShortVideoSkeleton() {
  return (
    <div className="scroll-mt-20 py-8">
      <div className="mb-0 py-2">
        <div className="container mx-auto px-4">
          <SectionHeaderSkeleton />
          <Pulse className="w-80 h-4 mb-4 -mt-4" />
          <div className="-mx-4 md:mx-0">
            <div className="flex gap-5 min-w-max pl-4 md:pl-0 overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex-shrink-0 w-[140px] sm:w-[180px] md:w-[200px]">
                  <Pulse className="aspect-[5/7] rounded-lg" />
                  <Pulse className="h-4 w-full mt-2 rounded" />
                  <Pulse className="h-3 w-2/3 mt-1 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * AccountList: py-6 mb-12 内に横スクロール
 * アバター: w-24 h-24 sm:w-28 sm:h-28 rounded-full
 * アイテム幅: w-[120px] sm:w-[136px]
 */
export function AccountSkeleton() {
  return (
    <div className="mb-12 py-6">
      <div className="container mx-auto px-4">
        <div className="-mx-4 md:mx-0">
          <div className="flex gap-6 min-w-max py-2 pl-4 md:pl-0 overflow-hidden">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex flex-col items-center flex-shrink-0 w-[120px] sm:w-[136px]">
                <Pulse className="w-24 h-24 sm:w-28 sm:h-28 rounded-full mb-3" />
                <Pulse className="w-20 h-3 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ProgramSection (Documentary / ShukatsuVideo): py-8 内に SectionHeader + グリッド
 * largeCards: grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4, gap-5
 * カード: aspect-video + タイトル + チャンネル名
 */
export function SectionSkeleton() {
  return (
    <div className="py-8 scroll-mt-20">
      <div className="mb-12">
        <div className="container mx-auto px-4">
          <SectionHeaderSkeleton />
          <Pulse className="w-80 h-4 mb-4 -mt-4" />
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Pulse className="aspect-video rounded-lg" />
                <Pulse className="h-4 w-full mt-2 rounded" />
                <Pulse className="h-3 w-1/2 mt-1 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ShundiarySection: py-8 内に SectionHeader + 横スクロール
 * カード: w-[250px] sm:w-[300px] md:w-[350px], aspect-video
 */
export function ShundiarySkeleton() {
  return (
    <div className="py-8 scroll-mt-20">
      <div className="mb-12">
        <div className="container mx-auto px-4">
          <SectionHeaderSkeleton />
          <Pulse className="w-64 h-4 mb-4 -mt-4" />
          <div className="-mx-4 md:mx-0">
            <div className="flex gap-5 min-w-max pl-4 md:pl-0 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-shrink-0 w-[250px] sm:w-[300px] md:w-[350px]">
                  <Pulse className="aspect-video rounded-lg" />
                  <Pulse className="h-4 w-full mt-2 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * CompanySection: my-2 py-0 内に SectionHeader + 横スクロール
 * カード: w-[140px] sm:w-[180px] md:w-[200px], aspect-[5/7]
 * 2業界分を表示
 */
export function CompanySkeleton() {
  return (
    <div className="scroll-mt-20">
      {[1, 2].map((s) => (
        <div key={s} className="scroll-mt-20 py-4">
          <div className="my-2 py-0">
            <div className="container mx-auto px-4">
              <SectionHeaderSkeleton />
              <div className="-mx-4 md:mx-0">
                <div className="flex gap-4 min-w-max pl-4 md:px-4 pb-6 overflow-hidden">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex-shrink-0 w-[140px] sm:w-[180px] md:w-[200px]">
                      <Pulse className="aspect-[5/7] rounded-lg" />
                      <div className="px-1 mt-2">
                        <Pulse className="h-4 w-full rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}