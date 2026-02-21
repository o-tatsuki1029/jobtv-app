"use client";

import CSVImport from "@/components/ui/csv/CSVImport";
import { CandidateFormData } from "@/types/candidate.types";

export default function CandidateCSVImport() {
  return (
    <CSVImport<CandidateFormData>
      tableName="candidates"
      inputId="candidate-csv-input"
      transformRow={(row: string[]) => ({
        last_name: row[0]?.trim() || "",
        first_name: row[1]?.trim() || "",
        last_name_kana: row[2]?.trim() || "",
        first_name_kana: row[3]?.trim() || "",
        email: row[4]?.trim() || "",
        phone: row[5]?.trim() || "",
        graduation_year: row[6] ? Number(row[6]) : null,
        gender: row[7]?.trim() || null,
        school_type: row[8]?.trim() || null,
        school_name: row[9]?.trim() || null,
        major_field: row[10]?.trim() || null,
        date_of_birth: row[11]?.trim() || null,
        desired_industry: row[12]?.trim() || null,
        desired_job_type: row[13]?.trim() || null,
        desired_work_location: row[14]?.trim() || null,
        entry_channel: row[15]?.trim() || null,
        utm_source: row[16]?.trim() || null,
        utm_medium: row[17]?.trim() || null,
        utm_campaign: row[18]?.trim() || null,
        utm_content: row[19]?.trim() || null,
        utm_term: row[20]?.trim() || null,
        referrer: row[21]?.trim() || null,
        jobtv_id: row[22]?.trim() || null,
        notes: row[23]?.trim() || null,
      } as unknown as CandidateFormData)}
      validateData={(data: CandidateFormData) =>
        !!(data.last_name && data.first_name)
      }
      formatHeaders={[
        "姓",
        "名",
        "姓（カナ）",
        "名（カナ）",
        "メールアドレス",
        "電話番号",
        "卒業年度",
        "性別",
        "学校種別",
        "学校名",
        "文理",
        "生年月日",
        "希望業界",
        "希望職種",
        "希望勤務地",
        "エントリーチャネル",
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
        "referrer",
        "JOBTV ID",
        "メモ",
      ]}
      formatRows={[
        [
          "山田",
          "太郎",
          "ヤマダ",
          "タロウ",
          "yamada@example.com",
          "090-1234-5678",
          2027,
          "男性",
          "大学",
          "東京大学",
          "文系",
          "2000-01-01",
          "IT",
          "エンジニア",
          "東京都",
          "Web",
          "google",
          "cpc",
          "summer_campaign",
          "banner",
          "candidate",
          "https://example.com",
          "JOBTV12345",
          "備考メモ",
        ],
      ]}
      formatFilename="students_format.csv"
    />
  );
}
