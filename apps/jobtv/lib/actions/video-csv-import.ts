"use server";

import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { logAudit } from "@jobtv-app/shared/utils/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { TablesInsert } from "@jobtv-app/shared/types";

const CSV_MAX_ROWS = 3000;
const BULK_CHUNK_SIZE = 100;
const VALID_CATEGORIES = new Set(["main", "short", "documentary"]);

/**
 * RFC 4180 準拠の CSV パーサー。
 * フィールド内の改行（ダブルクォート囲み）に対応。
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
          current += '"';
          i++;
        } else {
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

  if (current || row.length > 0) {
    row.push(current.trim());
    records.push(row);
  }

  return records;
}

function getHeaderIndexMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((h, i) => map.set(h.trim(), i));
  return map;
}

function getCell(row: string[], map: Map<string, number>, key: string): string {
  const i = map.get(key);
  return i !== undefined ? (row[i] ?? "").trim() : "";
}

function validateRow(row: string[], headerMap: Map<string, number>, rowIndex: number): string | null {
  const companyId = getCell(row, headerMap, "企業ID");
  if (!companyId) return `${rowIndex}行目: 企業IDは必須です`;

  const category = getCell(row, headerMap, "動画種別");
  if (!category) return `${rowIndex}行目: 動画種別は必須です`;
  if (!VALID_CATEGORIES.has(category)) return `${rowIndex}行目: 動画種別は main / short / documentary のいずれかです`;

  const videoUrl = getCell(row, headerMap, "動画URL");
  if (!videoUrl) return `${rowIndex}行目: 動画URLは必須です`;

  return null;
}

export async function createVideosFromCsv(formData: FormData): Promise<{
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

  const records = parseCSVRecords(text).filter((row) => row.some((cell) => cell !== ""));
  if (records.length < 2) return { data: null, error: "CSVにヘッダーとデータ行が含まれている必要があります" };

  const headerMap = getHeaderIndexMap(records[0]);
  if (!headerMap.has("企業ID")) return { data: null, error: "CSVのヘッダーに「企業ID」が含まれている必要があります" };

  const dataRows = records.slice(1);
  if (dataRows.length > CSV_MAX_ROWS) return { data: null, error: `データ行は${CSV_MAX_ROWS}行までです` };

  // バリデーション
  const errors: { row: number; message: string }[] = [];
  const validRows: { rowIndex: number; insert: TablesInsert<"videos"> }[] = [];

  // 企業IDの存在チェック用に一括取得（UUID or legacy_service_id）
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const rawIds = dataRows.map((row) => getCell(row, headerMap, "企業ID")).filter(Boolean);
  const uuidSet = new Set(rawIds.filter((id) => UUID_RE.test(id)));
  const legacySet = new Set(rawIds.filter((id) => !UUID_RE.test(id)));

  const supabaseAdmin = createAdminClient();
  // UUID → id のマップ
  const existingCompanyIds = new Set<string>();
  // legacy_service_id → id のマップ
  const legacyToUuid = new Map<string, string>();

  // UUID で検索
  const uuidArray = [...uuidSet];
  for (let i = 0; i < uuidArray.length; i += BULK_CHUNK_SIZE) {
    const chunk = uuidArray.slice(i, i + BULK_CHUNK_SIZE);
    const { data: found } = await supabaseAdmin
      .from("companies")
      .select("id")
      .in("id", chunk);
    if (found) {
      for (const c of found) existingCompanyIds.add(c.id);
    }
  }

  // legacy_service_id で検索
  const legacyArray = [...legacySet];
  for (let i = 0; i < legacyArray.length; i += BULK_CHUNK_SIZE) {
    const chunk = legacyArray.slice(i, i + BULK_CHUNK_SIZE);
    const { data: found } = await supabaseAdmin
      .from("companies")
      .select("id, legacy_service_id")
      .in("legacy_service_id", chunk);
    if (found) {
      for (const c of found) {
        if (c.legacy_service_id) {
          legacyToUuid.set(c.legacy_service_id, c.id);
        }
      }
    }
  }

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowIndex = i + 2;
    const validationError = validateRow(row, headerMap, rowIndex);
    if (validationError) {
      errors.push({ row: rowIndex, message: validationError });
      continue;
    }

    const rawId = getCell(row, headerMap, "企業ID");
    let companyId: string;
    if (UUID_RE.test(rawId)) {
      if (!existingCompanyIds.has(rawId)) {
        errors.push({ row: rowIndex, message: `${rowIndex}行目: 企業ID「${rawId}」が見つかりません` });
        continue;
      }
      companyId = rawId;
    } else {
      const resolved = legacyToUuid.get(rawId);
      if (!resolved) {
        errors.push({ row: rowIndex, message: `${rowIndex}行目: 旧サービスID「${rawId}」に該当する企業が見つかりません` });
        continue;
      }
      companyId = resolved;
    }

    validRows.push({
      rowIndex,
      insert: {
        company_id: companyId,
        title: getCell(row, headerMap, "動画タイトル"),
        category: getCell(row, headerMap, "動画種別") as "main" | "short" | "documentary",
        video_url: getCell(row, headerMap, "動画URL"),
        thumbnail_url: getCell(row, headerMap, "サムネイルURL") || null,
        status: "active",
      },
    });
  }

  // バルクINSERT
  let created = 0;

  for (let chunkStart = 0; chunkStart < validRows.length; chunkStart += BULK_CHUNK_SIZE) {
    const chunk = validRows.slice(chunkStart, chunkStart + BULK_CHUNK_SIZE);
    const inserts = chunk.map((r) => r.insert);

    const { data: insertedVideos, error: insertError } = await supabaseAdmin
      .from("videos")
      .insert(inserts)
      .select("id, company_id, title, category, video_url, thumbnail_url, status, display_order");

    if (insertError || !insertedVideos) {
      for (const r of chunk) {
        errors.push({ row: r.rowIndex, message: insertError?.message ?? "動画の一括作成に失敗しました" });
      }
      continue;
    }

    created += insertedVideos.length;

    // videos_draft もバルクINSERT
    const now = new Date().toISOString();
    const draftInserts: TablesInsert<"videos_draft">[] = insertedVideos.map((v) => ({
      company_id: v.company_id,
      production_video_id: v.id,
      title: v.title,
      category: v.category,
      video_url: v.video_url,
      thumbnail_url: v.thumbnail_url,
      display_order: v.display_order,
      draft_status: "approved" as const,
      approved_at: now,
    }));
    await supabaseAdmin.from("videos_draft").insert(draftInserts);
  }

  if (user) {
    logAudit({
      userId: user.id,
      action: "video.csv_import",
      category: "content_edit",
      resourceType: "videos",
      app: "jobtv",
      metadata: { count: dataRows.length, successCount: created, errorCount: errors.length },
    });
  }

  revalidatePath("/admin/company-accounts");
  return { data: { created, errors }, error: null };
}
