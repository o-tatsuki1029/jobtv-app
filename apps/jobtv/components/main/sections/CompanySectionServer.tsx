import { getCompaniesByIndustryForTopPage, getIndustriesWithVideos } from "@/lib/actions/company-list-actions";
import { INDUSTRIES } from "@/constants/company-options";
import CompanySectionLazy from "./CompanySectionLazy";

const INITIAL_LIMIT = 10;

/**
 * 業界セクション: Suspense 境界内で async 実行される。
 * 上のセクションが表示された後にストリーミングで描画される。
 * 初回は各業界 10 件だけ取得し、横スクロールで追加読み込み。
 */
export default async function CompanySectionServer() {
  const [companiesResult, industriesWithVideosResult] = await Promise.all([
    getCompaniesByIndustryForTopPage(INITIAL_LIMIT),
    getIndustriesWithVideos(),
  ]);

  const industriesWithVideos = industriesWithVideosResult.data ?? new Set<string>();

  // 業界リスト（動画ありを先頭にソート）
  const industries = INDUSTRIES
    .filter((i) => i.value !== "")
    .map((i) => ({ value: i.value, label: i.label }))
    .sort((a, b) => {
      const aHas = industriesWithVideos.has(a.value) ? 0 : 1;
      const bHas = industriesWithVideos.has(b.value) ? 0 : 1;
      return aHas - bHas;
    });

  // 初期データを構築（データのある業界のみ）
  const initialData: Record<string, {
    companies: Array<{ id: string; name: string; logo_url: string | null; thumbnail_url: string | null }>;
    totalCount: number;
  }> = {};

  for (const industry of industries) {
    const entry = companiesResult.data[industry.value];
    if (entry && entry.companies.length > 0) {
      initialData[industry.value] = entry;
    }
  }

  const orderedIndustries = industries.filter((i) => initialData[i.value]);

  if (orderedIndustries.length === 0) return null;

  return (
    <CompanySectionLazy
      industries={orderedIndustries}
      initialData={initialData}
    />
  );
}
