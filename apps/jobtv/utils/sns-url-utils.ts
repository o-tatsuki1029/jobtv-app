import type { CompanyData } from "@/components/company";

/**
 * SNS URLからアカウント名を抽出（@マーク付きで返す）
 */
export const extractAccountName = (
  url: string | undefined,
  platform: "x" | "instagram" | "tiktok" | "youtube"
): string => {
  if (!url) return "";
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    let accountName = "";

    switch (platform) {
      case "x":
        // https://x.com/account または https://twitter.com/account
        accountName = pathname.replace(/^\//, "").split("/")[0] || "";
        break;
      case "instagram":
        // https://instagram.com/account または https://www.instagram.com/account/
        accountName = pathname.replace(/^\//, "").split("/")[0] || "";
        break;
      case "tiktok":
        // https://tiktok.com/@account
        const match = pathname.match(/@([^/]+)/);
        accountName = match ? match[1] : pathname.replace(/^\//, "").replace(/^@/, "") || "";
        break;
      case "youtube":
        // https://youtube.com/@account または https://youtube.com/c/account
        if (pathname.startsWith("/@")) {
          accountName = pathname.replace(/^\/@/, "").split("/")[0] || "";
        } else if (pathname.startsWith("/c/")) {
          accountName = pathname.replace(/^\/c\//, "").split("/")[0] || "";
        }
        break;
      default:
        return "";
    }

    // @マークが既に含まれている場合はそのまま、含まれていない場合は@マークを付ける
    return accountName && !accountName.startsWith("@") ? `@${accountName}` : accountName;
  } catch {
    // URLとして解析できない場合は、そのまま返す（既にアカウント名の可能性）
    // @マークが含まれていない場合は@マークを付ける
    if (url && !url.startsWith("@") && !url.startsWith("http")) {
      return `@${url}`;
    }
    return url;
  }
};

/**
 * アカウント名からSNS URLを生成（@マーク付きのアカウント名を受け取る）
 */
export const generateSnsUrl = (accountName: string, platform: "x" | "instagram" | "tiktok" | "youtube"): string => {
  if (!accountName.trim()) return "";
  
  // @マークとURLプレフィックスを除去してクリーンなアカウント名を取得
  let cleanName = accountName
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\//, "");

  // さらにURLパスからアカウント名を抽出
  if (cleanName.includes("/")) {
    const parts = cleanName.split("/");
    cleanName = parts[parts.length - 1].replace(/^@/, "");
  }

  switch (platform) {
    case "x":
      return `https://x.com/${cleanName}`;
    case "instagram":
      return `https://instagram.com/${cleanName}`;
    case "tiktok":
      return `https://tiktok.com/@${cleanName}`;
    case "youtube":
      return `https://youtube.com/@${cleanName}`;
    default:
      return "";
  }
};

/**
 * CompanyDataのSNS URLsからアカウント名オブジェクトを抽出
 */
export const extractSnsAccountNames = (snsUrls?: CompanyData["snsUrls"]) => ({
  x: extractAccountName(snsUrls?.x, "x"),
  instagram: extractAccountName(snsUrls?.instagram, "instagram"),
  tiktok: extractAccountName(snsUrls?.tiktok, "tiktok"),
  youtube: extractAccountName(snsUrls?.youtube, "youtube")
});

/**
 * アカウント名オブジェクトからCompanyDataのSNS URLsを生成
 */
export const generateSnsUrls = (accountNames: {
  x?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
}): CompanyData["snsUrls"] => ({
  x: generateSnsUrl(accountNames.x || "", "x") || undefined,
  instagram: generateSnsUrl(accountNames.instagram || "", "instagram") || undefined,
  tiktok: generateSnsUrl(accountNames.tiktok || "", "tiktok") || undefined,
  youtube: generateSnsUrl(accountNames.youtube || "", "youtube") || undefined
});
