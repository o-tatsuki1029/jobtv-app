"use server";

import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { logAudit } from "@jobtv-app/shared/utils/audit";
import { PREFECTURES } from "@/constants/prefectures";
import { REPRESENTATIVE_NAME_MAX_LENGTH, LONG_DESCRIPTION_MAX_LENGTH } from "@/constants/validation";
import { validateUrlWithProtocol } from "@jobtv-app/shared/utils/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { TablesInsert } from "@jobtv-app/shared/types";

const CSV_MAX_ROWS = 1000;
const BULK_CHUNK_SIZE = 100;
const PREFECTURE_SET = new Set(PREFECTURES);

// ─── ヘッダーエイリアス（旧システムの英語ヘッダー → 日本語ヘッダーに正規化） ───
const HEADER_ALIASES: Record<string, string> = {
  url: "公式サイト",
  website: "公式サイト",
  representative: "代表者名",
  establishment_date: "設立年月",
};

/**
 * RFC 4180 準拠の CSV パーサー。
 * フィールド内の改行（ダブルクォート囲み）に対応。
 * テキスト全体を受け取り、行（レコード）の配列を返す。
 */
function parseCSVRecords(text: string): string[][] {
  const records: string[][] = [];
  let current = "";
  let inQuotes = false;
  const row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          // エスケープされたダブルクォート
          current += '"';
          i++;
        } else {
          // クォート終了
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(current.trim());
        current = "";
      } else if (char === "\r") {
        // \r\n or \r → レコード区切り
        row.push(current.trim());
        current = "";
        records.push([...row]);
        row.length = 0;
        if (text[i + 1] === "\n") i++;
      } else if (char === "\n") {
        row.push(current.trim());
        current = "";
        records.push([...row]);
        row.length = 0;
      } else {
        current += char;
      }
    }
  }

  // 末尾の残り
  if (current || row.length > 0) {
    row.push(current.trim());
    records.push(row);
  }

  return records;
}

function parseEstablishedDate(dateString: string): { year: string; month: string } | null {
  if (!dateString || !dateString.trim()) return null;
  const s = dateString.trim();
  // 2020年4月 / 2020年04月
  const p1 = s.match(/^(\d{4})年(\d{1,2})月?$/);
  if (p1) return { year: p1[1], month: p1[2].padStart(2, "0") };
  // 2020-04 / 2020/04 / 2020.04
  const p2 = s.match(/^(\d{4})[-/.](\d{1,2})$/);
  if (p2) return { year: p2[1], month: p2[2].padStart(2, "0") };
  // 2020/04/15 / 2020-04-15（日付部分は無視して年月のみ使用）
  const p3 = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (p3) return { year: p3[1], month: p3[2].padStart(2, "0") };
  return null;
}

function getHeaderIndexMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((h, i) => {
    const trimmed = h.trim();
    const normalized = HEADER_ALIASES[trimmed] ?? trimmed;
    map.set(normalized, i);
  });
  return map;
}

function getCell(row: string[], map: Map<string, number>, key: string): string {
  const i = map.get(key);
  return i !== undefined ? (row[i] ?? "").trim() : "";
}

function validateCsvRow(row: string[], headerMap: Map<string, number>, rowIndex: number): string | null {
  const name = getCell(row, headerMap, "企業名");
  if (!name) return `${rowIndex}行目: 企業名は必須です`;
  const industry = getCell(row, headerMap, "業界");
  void industry; // 自由入力
  const prefecture = getCell(row, headerMap, "都道府県");
  if (prefecture && !PREFECTURE_SET.has(prefecture)) return `${rowIndex}行目: 都道府県の値が不正です`;
  const employees = getCell(row, headerMap, "従業員数");
  void employees; // 自由入力
  const establishedStr = getCell(row, headerMap, "設立年月");
  if (establishedStr && !parseEstablishedDate(establishedStr)) return `${rowIndex}行目: 設立年月の形式が不正です`;
  const website = getCell(row, headerMap, "公式サイト");
  void website; // CSV経由では自由入力
  const representative = getCell(row, headerMap, "代表者名");
  if (representative && representative.length > REPRESENTATIVE_NAME_MAX_LENGTH)
    return `${rowIndex}行目: 代表者名は${REPRESENTATIVE_NAME_MAX_LENGTH}文字以内です`;
  const companyInfo = getCell(row, headerMap, "企業情報");
  void companyInfo; // CSV経由では文字数制限なし
  const status = getCell(row, headerMap, "ステータス");
  if (status && status !== "active" && status !== "closed") return `${rowIndex}行目: ステータスは active または closed です`;
  const postalCode = getCell(row, headerMap, "郵便番号");
  void postalCode; // CSV経由では自由入力
  const averageAgeStr = getCell(row, headerMap, "平均年齢");
  if (averageAgeStr) {
    const num = Number(averageAgeStr);
    if (isNaN(num) || num < 0 || num > 100) return `${rowIndex}行目: 平均年齢は0〜100の数値で入力してください`;
  }
  const snsFacebookUrl = getCell(row, headerMap, "SNS_Facebook");
  if (snsFacebookUrl) {
    const err = validateUrlWithProtocol(snsFacebookUrl, "SNS_Facebook");
    if (err) return `${rowIndex}行目: ${err}`;
  }
  const logoUrl = getCell(row, headerMap, "ロゴURL");
  if (logoUrl) {
    const err = validateUrlWithProtocol(logoUrl, "ロゴURL");
    if (err) return `${rowIndex}行目: ${err}`;
  }
  const thumbnailUrl = getCell(row, headerMap, "サムネイルURL");
  if (thumbnailUrl) {
    const err = validateUrlWithProtocol(thumbnailUrl, "サムネイルURL");
    if (err) return `${rowIndex}行目: ${err}`;
  }
  // タグラインの改行チェックは不要（buildCompanyPageData で半角スペースに置換）
  const pageDescription = getCell(row, headerMap, "企業ページ説明文");
  if (pageDescription && pageDescription.length > LONG_DESCRIPTION_MAX_LENGTH) return `${rowIndex}行目: 企業ページ説明文は${LONG_DESCRIPTION_MAX_LENGTH}文字以内です`;
  const snsXUrl = getCell(row, headerMap, "SNS_X");
  if (snsXUrl) {
    const err = validateUrlWithProtocol(snsXUrl, "SNS_X");
    if (err) return `${rowIndex}行目: ${err}`;
  }
  const snsInstagramUrl = getCell(row, headerMap, "SNS_Instagram");
  if (snsInstagramUrl) {
    const err = validateUrlWithProtocol(snsInstagramUrl, "SNS_Instagram");
    if (err) return `${rowIndex}行目: ${err}`;
  }
  const snsTiktokUrl = getCell(row, headerMap, "SNS_TikTok");
  if (snsTiktokUrl) {
    const err = validateUrlWithProtocol(snsTiktokUrl, "SNS_TikTok");
    if (err) return `${rowIndex}行目: ${err}`;
  }
  const snsYoutubeUrl = getCell(row, headerMap, "SNS_YouTube");
  if (snsYoutubeUrl) {
    const err = validateUrlWithProtocol(snsYoutubeUrl, "SNS_YouTube");
    if (err) return `${rowIndex}行目: ${err}`;
  }
  const pageStatus = getCell(row, headerMap, "企業ページステータス");
  if (pageStatus && pageStatus !== "active" && pageStatus !== "closed") return `${rowIndex}行目: 企業ページステータスは active または closed です`;
  return null;
}

/** CSV の行から companies INSERT 用データを構築 */
function buildCompanyInsert(row: string[], headerMap: Map<string, number>): TablesInsert<"companies"> {
  return {
    name: getCell(row, headerMap, "企業名"),
    industry: getCell(row, headerMap, "業界") || null,
    prefecture: getCell(row, headerMap, "都道府県") || null,
    address_line1: getCell(row, headerMap, "市区町村・番地") || null,
    address_line2: getCell(row, headerMap, "ビル名・部屋番号") || null,
    website: getCell(row, headerMap, "公式サイト") || null,
    representative: getCell(row, headerMap, "代表者名") || null,
    established: (() => {
      const s = getCell(row, headerMap, "設立年月");
      if (!s) return null;
      const p = parseEstablishedDate(s);
      return p ? `${p.year}年${parseInt(p.month)}月` : null;
    })(),
    employees: getCell(row, headerMap, "従業員数") || null,
    company_info: getCell(row, headerMap, "企業情報") || null,
    status: (getCell(row, headerMap, "ステータス") === "closed" ? "closed" : "active") as "active" | "closed",
    logo_url: getCell(row, headerMap, "ロゴURL") || null,
    thumbnail_url: getCell(row, headerMap, "サムネイルURL") || null,
    phone_number: getCell(row, headerMap, "電話番号") || null,
    revenue: getCell(row, headerMap, "売上高") || null,
    average_age: (() => {
      const s = getCell(row, headerMap, "平均年齢");
      return s ? Number(s) : null;
    })(),
    listing_status: getCell(row, headerMap, "上場区分") || null,
    legacy_service_id: getCell(row, headerMap, "過去サービスID") || null,
    sns_facebook_url: getCell(row, headerMap, "SNS_Facebook") || null,
    postal_code: getCell(row, headerMap, "郵便番号") || null,
    capital: getCell(row, headerMap, "資本金") || null,
    business_details: getCell(row, headerMap, "事業詳細") || null,
    headquarters: getCell(row, headerMap, "本社所在地") || null,
    group_companies: getCell(row, headerMap, "グループ会社") || null,
    training_program: getCell(row, headerMap, "研修制度") || null,
  };
}

/** CSV の行から company_pages 用データを構築（該当フィールドが1つでもある場合のみ） */
function buildCompanyPageData(row: string[], headerMap: Map<string, number>) {
  const taglineRaw = getCell(row, headerMap, "タグライン");
  const tagline = taglineRaw ? taglineRaw.replace(/[\r\n]+/g, " ").trim() || null : null;
  const description = getCell(row, headerMap, "企業ページ説明文") || null;
  const snsX = getCell(row, headerMap, "SNS_X") || null;
  const snsInstagram = getCell(row, headerMap, "SNS_Instagram") || null;
  const snsTiktok = getCell(row, headerMap, "SNS_TikTok") || null;
  const snsYoutube = getCell(row, headerMap, "SNS_YouTube") || null;
  const benefitsRaw = getCell(row, headerMap, "福利厚生");
  const benefits: string[] | null = benefitsRaw
    ? benefitsRaw.split(";").map((b) => b.trim()).filter(Boolean)
    : null;
  const status = getCell(row, headerMap, "企業ページステータス") || null;

  const hasData = tagline || description || snsX || snsInstagram || snsTiktok || snsYoutube || benefits || status;
  if (!hasData) return null;

  return {
    tagline,
    description,
    sns_x_url: snsX,
    sns_instagram_url: snsInstagram,
    sns_tiktok_url: snsTiktok,
    sns_youtube_url: snsYoutube,
    benefits,
    status: (status === "closed" ? "closed" : "active") as "active" | "closed",
  };
}

export async function createCompaniesFromCsv(formData: FormData): Promise<{
  data: { created: number; errors: { row: number; message: string }[] } | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const file = formData.get("file");
  if (!file || !(file instanceof File)) return { data: null, error: "CSVファイルを選択してください" };
  let text: string;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    text = buf.toString("utf-8").replace(/^\uFEFF/, "");
  } catch {
    return { data: null, error: "ファイルの読み込みに失敗しました（UTF-8で保存してください）" };
  }

  // RFC 4180 準拠パーサーでレコード分割（フィールド内改行に対応）
  const records = parseCSVRecords(text).filter((row) => row.some((cell) => cell !== ""));
  if (records.length < 2) return { data: null, error: "CSVにヘッダーとデータ行が含まれている必要があります" };

  const headerMap = getHeaderIndexMap(records[0]);
  if (!headerMap.has("企業名")) return { data: null, error: "CSVのヘッダーに「企業名」が含まれている必要があります" };

  const dataRows = records.slice(1);
  if (dataRows.length > CSV_MAX_ROWS) return { data: null, error: `データ行は${CSV_MAX_ROWS}行までです` };

  // バリデーション（全行先にチェック → バルクINSERT用データを構築）
  const errors: { row: number; message: string }[] = [];
  const validRows: { rowIndex: number; companyInsert: TablesInsert<"companies">; pageData: ReturnType<typeof buildCompanyPageData> }[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowIndex = i + 2;
    const validationError = validateCsvRow(row, headerMap, rowIndex);
    if (validationError) {
      errors.push({ row: rowIndex, message: validationError });
      continue;
    }
    validRows.push({
      rowIndex,
      companyInsert: buildCompanyInsert(row, headerMap),
      pageData: buildCompanyPageData(row, headerMap),
    });
  }

  // バルクINSERT（チャンク単位）
  const supabaseAdmin = createAdminClient();
  let created = 0;

  for (let chunkStart = 0; chunkStart < validRows.length; chunkStart += BULK_CHUNK_SIZE) {
    const chunk = validRows.slice(chunkStart, chunkStart + BULK_CHUNK_SIZE);
    const inserts = chunk.map((r) => r.companyInsert);

    const { data: insertedCompanies, error: insertError } = await supabaseAdmin
      .from("companies")
      .insert(inserts)
      .select("id, name, industry, prefecture, address_line1, address_line2, website, representative, established, employees, company_info, status, logo_url, thumbnail_url, phone_number, revenue, average_age, listing_status, legacy_service_id, sns_facebook_url, postal_code, capital, business_details, headquarters, group_companies, training_program");

    if (insertError || !insertedCompanies) {
      for (const r of chunk) {
        errors.push({ row: r.rowIndex, message: insertError?.message ?? "企業の一括作成に失敗しました" });
      }
      continue;
    }

    created += insertedCompanies.length;

    // companies_draft をバルクINSERT
    const now = new Date().toISOString();
    const draftInserts: TablesInsert<"companies_draft">[] = insertedCompanies.map((c) => ({
      company_id: c.id,
      production_company_id: c.id,
      name: c.name,
      industry: c.industry,
      prefecture: c.prefecture,
      address_line1: c.address_line1,
      address_line2: c.address_line2,
      website: c.website,
      representative: c.representative,
      established: c.established,
      employees: c.employees,
      company_info: c.company_info,
      logo_url: c.logo_url,
      thumbnail_url: c.thumbnail_url,
      phone_number: c.phone_number,
      revenue: c.revenue,
      average_age: c.average_age,
      listing_status: c.listing_status,
      legacy_service_id: c.legacy_service_id,
      sns_facebook_url: c.sns_facebook_url,
      postal_code: c.postal_code,
      capital: c.capital,
      business_details: c.business_details,
      headquarters: c.headquarters,
      group_companies: c.group_companies,
      training_program: c.training_program,
      draft_status: "approved" as const,
      approved_at: now,
    }));
    await supabaseAdmin.from("companies_draft").insert(draftInserts);

    // company_pages / company_pages_draft をバルクINSERT
    const pageInserts: { companyId: string; pageData: NonNullable<ReturnType<typeof buildCompanyPageData>> }[] = [];
    for (let j = 0; j < chunk.length; j++) {
      const pd = chunk[j].pageData;
      if (pd && insertedCompanies[j]) {
        pageInserts.push({ companyId: insertedCompanies[j].id, pageData: pd });
      }
    }
    if (pageInserts.length > 0) {
      const cpInserts: TablesInsert<"company_pages">[] = pageInserts.map((p) => ({
        company_id: p.companyId,
        ...p.pageData,
      }));
      const { data: insertedPages } = await supabaseAdmin
        .from("company_pages")
        .insert(cpInserts)
        .select("id, company_id");

      if (insertedPages && insertedPages.length > 0) {
        const cpDraftInserts: TablesInsert<"company_pages_draft">[] = insertedPages.map((page) => {
          const pd = pageInserts.find((p) => p.companyId === page.company_id)!.pageData;
          return {
            company_id: page.company_id,
            production_page_id: page.id,
            tagline: pd.tagline,
            description: pd.description,
            sns_x_url: pd.sns_x_url,
            sns_instagram_url: pd.sns_instagram_url,
            sns_tiktok_url: pd.sns_tiktok_url,
            sns_youtube_url: pd.sns_youtube_url,
            benefits: pd.benefits,
            draft_status: "approved" as const,
            approved_at: now,
          };
        });
        await supabaseAdmin.from("company_pages_draft").insert(cpDraftInserts);
      }
    }
  }

  if (user) {
    logAudit({
      userId: user.id,
      action: "company.csv_import",
      category: "account",
      resourceType: "companies",
      app: "jobtv",
      metadata: { count: dataRows.length, successCount: created, errorCount: errors.length },
    });
  }

  revalidatePath("/admin/company-accounts");
  return { data: { created, errors }, error: null };
}
