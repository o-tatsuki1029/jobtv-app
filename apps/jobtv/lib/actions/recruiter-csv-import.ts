"use server";

import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { logAudit } from "@jobtv-app/shared/utils/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTemplatedEmail } from "@/lib/email/send-templated-email";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

const CSV_MAX_ROWS = 500;
const BULK_CHUNK_SIZE = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export async function createRecruitersFromCsv(formData: FormData): Promise<{
  data: { created: number; warnings: number; errors: { row: number; message: string }[] } | null;
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
  if (!headerMap.has("メールアドレス")) return { data: null, error: "CSVのヘッダーに「メールアドレス」が含まれている必要があります" };

  const dataRows = records.slice(1);
  if (dataRows.length > CSV_MAX_ROWS) return { data: null, error: `データ行は${CSV_MAX_ROWS}行までです` };

  const errors: { row: number; message: string }[] = [];

  // --- 企業ID解決 ---
  const rawIds = dataRows.map((row) => getCell(row, headerMap, "企業ID")).filter(Boolean);
  const uuidSet = new Set(rawIds.filter((id) => UUID_RE.test(id)));
  const legacySet = new Set(rawIds.filter((id) => !UUID_RE.test(id)));

  const supabaseAdmin = createAdminClient();

  // UUID → 企業情報
  const companyMap = new Map<string, { id: string; name: string }>();
  const uuidArray = [...uuidSet];
  for (let i = 0; i < uuidArray.length; i += BULK_CHUNK_SIZE) {
    const chunk = uuidArray.slice(i, i + BULK_CHUNK_SIZE);
    const { data: found } = await supabaseAdmin.from("companies").select("id, name").in("id", chunk);
    if (found) {
      for (const c of found) companyMap.set(c.id, { id: c.id, name: c.name });
    }
  }

  // legacy_service_id → 企業情報
  const legacyToCompany = new Map<string, { id: string; name: string }>();
  const legacyArray = [...legacySet];
  for (let i = 0; i < legacyArray.length; i += BULK_CHUNK_SIZE) {
    const chunk = legacyArray.slice(i, i + BULK_CHUNK_SIZE);
    const { data: found } = await supabaseAdmin
      .from("companies")
      .select("id, name, legacy_service_id")
      .in("legacy_service_id", chunk);
    if (found) {
      for (const c of found) {
        if (c.legacy_service_id) {
          legacyToCompany.set(c.legacy_service_id, { id: c.id, name: c.name });
        }
      }
    }
  }

  // --- メールアドレス重複チェック（DB既存） ---
  const allEmails = dataRows
    .map((row) => getCell(row, headerMap, "メールアドレス").toLowerCase())
    .filter(Boolean);
  const existingEmails = new Set<string>();
  for (let i = 0; i < allEmails.length; i += BULK_CHUNK_SIZE) {
    const chunk = allEmails.slice(i, i + BULK_CHUNK_SIZE);
    const { data: found } = await supabaseAdmin.from("profiles").select("email").in("email", chunk);
    if (found) {
      for (const p of found) {
        if (p.email) existingEmails.add(p.email.toLowerCase());
      }
    }
  }

  // --- CSV内メール重複チェック ---
  const csvEmailCount = new Map<string, number>();
  for (const row of dataRows) {
    const email = getCell(row, headerMap, "メールアドレス").toLowerCase();
    if (email) csvEmailCount.set(email, (csvEmailCount.get(email) || 0) + 1);
  }

  // --- バリデーション + 処理対象の収集 ---
  type ValidRow = {
    rowIndex: number;
    companyId: string;
    companyName: string;
    email: string;
    last_name: string;
    first_name: string;
    last_name_kana: string;
    first_name_kana: string;
  };
  const validRows: ValidRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowIndex = i + 2;

    // 企業ID
    const rawId = getCell(row, headerMap, "企業ID");
    if (!rawId) {
      errors.push({ row: rowIndex, message: "企業IDは必須です" });
      continue;
    }

    let companyId: string;
    let companyName: string;
    if (UUID_RE.test(rawId)) {
      const company = companyMap.get(rawId);
      if (!company) {
        errors.push({ row: rowIndex, message: `企業ID「${rawId}」が見つかりません` });
        continue;
      }
      companyId = company.id;
      companyName = company.name;
    } else {
      const company = legacyToCompany.get(rawId);
      if (!company) {
        errors.push({ row: rowIndex, message: `旧サービスID「${rawId}」に該当する企業が見つかりません` });
        continue;
      }
      companyId = company.id;
      companyName = company.name;
    }

    // メールアドレス
    const email = getCell(row, headerMap, "メールアドレス").toLowerCase();
    if (!email) {
      errors.push({ row: rowIndex, message: "メールアドレスは必須です" });
      continue;
    }
    if (!EMAIL_RE.test(email)) {
      errors.push({ row: rowIndex, message: `メールアドレス「${email}」の形式が不正です` });
      continue;
    }
    if (existingEmails.has(email)) {
      errors.push({ row: rowIndex, message: `メールアドレス「${email}」は既に使用されています` });
      continue;
    }
    if ((csvEmailCount.get(email) || 0) > 1) {
      errors.push({ row: rowIndex, message: `メールアドレス「${email}」がCSV内で重複しています` });
      continue;
    }

    validRows.push({
      rowIndex,
      companyId,
      companyName,
      email,
      last_name: getCell(row, headerMap, "姓"),
      first_name: getCell(row, headerMap, "名"),
      last_name_kana: getCell(row, headerMap, "姓（カナ）"),
      first_name_kana: getCell(row, headerMap, "名（カナ）"),
    });
  }

  // --- 1行ずつ処理（generateLink は1件ずつ必要） ---
  let created = 0;
  let warnings = 0;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  for (const row of validRows) {
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email: row.email,
        options: {
          data: {
            first_name: row.first_name,
            last_name: row.last_name,
            first_name_kana: row.first_name_kana,
            last_name_kana: row.last_name_kana,
            company_id: row.companyId,
            role: "recruiter",
          },
          redirectTo: `${siteUrl}/studio/update-password`,
        },
      });

      if (linkError || !linkData?.user?.id) {
        const msg = linkError instanceof Error ? linkError.message : "招待リンクの生成に失敗しました";
        errors.push({ row: row.rowIndex, message: msg });
        continue;
      }

      const userId = linkData.user.id;
      const inviteUrl = linkData.properties.action_link;

      // メール送信（失敗は警告扱い）
      const { error: emailError } = await sendTemplatedEmail({
        templateName: "invite_recruiter",
        recipientEmail: row.email,
        variables: {
          first_name: row.first_name,
          last_name: row.last_name,
          company_name: row.companyName,
          invite_url: inviteUrl,
          site_url: siteUrl,
        },
      });

      if (emailError) {
        logger.error({ action: "recruiterCsvImport", err: emailError, email: row.email }, "招待メールの送信に失敗しました（アカウントは作成済み）");
        warnings++;
      }

      // profilesレコードを待機（最大3秒）
      let profileExists = false;
      for (let j = 0; j < 30; j++) {
        const { data: existingProfile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .single();
        if (existingProfile) {
          profileExists = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const now = new Date().toISOString();
      const profileData = {
        id: userId,
        email: row.email,
        role: "recruiter" as const,
        company_id: row.companyId,
        last_name: row.last_name,
        first_name: row.first_name,
        last_name_kana: row.last_name_kana,
        first_name_kana: row.first_name_kana,
        updated_at: now,
      };

      if (profileExists) {
        const { error: updateError } = await supabaseAdmin.from("profiles").update(profileData).eq("id", userId);
        if (updateError) {
          errors.push({ row: row.rowIndex, message: `プロファイル更新に失敗: ${updateError.message}` });
          continue;
        }
      } else {
        const { error: upsertError } = await supabaseAdmin
          .from("profiles")
          .upsert(profileData, { onConflict: "id" });
        if (upsertError) {
          errors.push({ row: row.rowIndex, message: `プロファイル作成に失敗: ${upsertError.message}` });
          continue;
        }
      }

      created++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "予期しないエラーが発生しました";
      errors.push({ row: row.rowIndex, message: msg });
    }
  }

  // --- 監査ログ ---
  if (user) {
    logAudit({
      userId: user.id,
      action: "recruiter.csv_import",
      category: "account",
      resourceType: "profiles",
      app: "jobtv",
      metadata: { count: dataRows.length, successCount: created, errorCount: errors.length, warningCount: warnings },
    });
  }

  revalidatePath("/admin/company-accounts");
  return { data: { created, warnings, errors }, error: null };
}
