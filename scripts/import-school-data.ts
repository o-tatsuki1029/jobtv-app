/**
 * school/ ディレクトリの CSV データを school_master テーブルに投入するスクリプト
 * Node.js 18+ の fetch を使用（外部依存なし）
 *
 * 実行例（プロジェクトルートで）:
 *   source apps/jobtv/.env.local && \
 *   NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
 *   SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
 *   npx tsx scripts/import-school-data.ts
 */

import { readFileSync } from "fs";
import { join } from "path";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください");
  process.exit(1);
}

const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

const SCHOOL_DIR = join(process.cwd(), "school");
const BATCH_SIZE = 1000;

// ---- CSV パーサー（外部依存なし） ----
function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]);
  const result: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] ?? "").trim();
    });
    result.push(row);
  }
  return result;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function readCsv(filename: string): Record<string, string>[] {
  return parseCsv(readFileSync(join(SCHOOL_DIR, filename), "utf-8"));
}

// ---- Supabase REST ヘルパー ----
async function supabaseDelete(table: string, filter: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: HEADERS,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DELETE ${table} failed: ${res.status} ${body}`);
  }
}

async function supabaseInsert(table: string, rows: unknown[]) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`INSERT ${table} failed: ${res.status} ${body}`);
  }
}

// ---- データ構築 ----
interface SchoolMasterRow {
  school_kcode: string;
  school_type: string;
  school_name: string;
  school_name_hira: string | null;
  prefecture: string | null;
  group_name: string | null;
  faculty_name: string | null;
  faculty_name_hira: string | null;
  department_name: string | null;
  department_name_hira: string | null;
}

async function main() {
  console.log("CSV を読み込んでいます...");
  const schools = readCsv("school.csv");
  const groups = readCsv("school_group.csv");
  const departments = readCsv("school_department.csv");
  const majors = readCsv("school_major.csv");
  console.log(`school: ${schools.length}, group: ${groups.length}, department: ${departments.length}, major: ${majors.length}`);

  const schoolMap = new Map<string, Record<string, string>>();
  for (const s of schools) if (s.kcode) schoolMap.set(s.kcode, s);

  const groupMap = new Map<string, string>();
  for (const g of groups) if (g.kcode && !groupMap.has(g.kcode)) groupMap.set(g.kcode, g.group_name);

  const deptMap = new Map<string, Record<string, string>>();
  for (const d of departments) if (d.department_id) deptMap.set(d.department_id, d);

  const rows: SchoolMasterRow[] = [];
  const coveredDeptIds = new Set<string>();
  const coveredKcodes = new Set<string>();

  for (const major of majors) {
    const school = schoolMap.get(major.school_kcode);
    if (!school) continue;
    const dept = deptMap.get(major.department_id);
    coveredDeptIds.add(major.department_id);
    coveredKcodes.add(major.school_kcode);
    rows.push({
      school_kcode: major.school_kcode,
      school_type: school.school_type,
      school_name: school.name,
      school_name_hira: school.name_hira || null,
      prefecture: school.prefecture || null,
      group_name: groupMap.get(major.school_kcode) ?? null,
      faculty_name: dept ? dept.name || null : major.department_name || null,
      faculty_name_hira: dept ? dept.name_hira || null : null,
      department_name: major.name || null,
      department_name_hira: major.name_hira || null,
    });
  }

  for (const dept of departments) {
    if (coveredDeptIds.has(dept.department_id)) continue;
    const school = schoolMap.get(dept.school_kcode);
    if (!school) continue;
    coveredKcodes.add(dept.school_kcode);
    rows.push({
      school_kcode: dept.school_kcode,
      school_type: school.school_type,
      school_name: school.name,
      school_name_hira: school.name_hira || null,
      prefecture: school.prefecture || null,
      group_name: groupMap.get(dept.school_kcode) ?? null,
      faculty_name: dept.name || null,
      faculty_name_hira: dept.name_hira || null,
      department_name: null,
      department_name_hira: null,
    });
  }

  for (const school of schools) {
    if (!school.kcode || coveredKcodes.has(school.kcode)) continue;
    rows.push({
      school_kcode: school.kcode,
      school_type: school.school_type,
      school_name: school.name,
      school_name_hira: school.name_hira || null,
      prefecture: school.prefecture || null,
      group_name: groupMap.get(school.kcode) ?? null,
      faculty_name: null,
      faculty_name_hira: null,
      department_name: null,
      department_name_hira: null,
    });
  }

  console.log(`投入する行数: ${rows.length}`);

  console.log("既存データを削除しています...");
  await supabaseDelete("school_master", "id=gte.0");

  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await supabaseInsert("school_master", batch);
    inserted += batch.length;
    process.stdout.write(`\r  ${inserted} / ${rows.length} 件投入済み`);
  }
  console.log(`\n完了: ${rows.length} 件を school_master に投入しました`);
}

main().catch((e) => { console.error(e); process.exit(1); });
