"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { downloadCSVAsShiftJIS } from "@/utils/data/csv";
import Button from "../Button";

import type { CandidateWithEmail } from "@/types/candidate.types";

type CandidateCSVExportProps = {
  keyword: string;
  sortKey: keyof CandidateWithEmail;
  sortAsc: boolean;
};

export default function CandidateCSVExport({
  keyword,
  sortKey,
  sortAsc,
}: CandidateCSVExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const supabase = createClient();

      // 検索条件に合う全データを取得（メールは profiles から join、ページネーションなし）
      let query = supabase.from("candidates").select(
        "*, profiles!profiles_candidate_id_fkey(email)"
      );

      if (keyword) {
        const { data: profileIds } = await supabase
          .from("profiles")
          .select("candidate_id")
          .ilike("email", `%${keyword}%`);
        const candidateIdsFromEmail = (profileIds ?? []).map((p) => p.candidate_id).filter(Boolean);
        const orParts = [
          `last_name.ilike.%${keyword}%`,
          `first_name.ilike.%${keyword}%`,
          `last_name_kana.ilike.%${keyword}%`,
          `first_name_kana.ilike.%${keyword}%`,
          `school_name.ilike.%${keyword}%`,
        ];
        if (candidateIdsFromEmail.length > 0) {
          orParts.push(`id.in.(${candidateIdsFromEmail.join(",")})`);
        }
        query = query.or(orParts.join(","));
      }

      const { data: rawData, error } = await query.order(String(sortKey), {
        ascending: sortAsc,
      });

      type Row = (NonNullable<typeof rawData>[number]) & { profiles?: { email: string | null } | null };
      const data = (rawData ?? []).map((row: Row) => ({
        ...row,
        email: row.profiles?.email ?? null,
      }));

      if (error) {
        console.error("エクスポートエラー:", error);
        alert("エクスポートに失敗しました: " + error.message);
        return;
      }

      if (!data || data.length === 0) {
        alert("エクスポートするデータがありません");
        return;
      }

      // CSVヘッダー（agent-managerのcandidatesテーブルのスキーマに合わせる）
      const headers = [
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
        "作成日",
        "更新日",
      ];

      // CSVデータ行
      const rows = data.map((js) => [
        js.last_name || "",
        js.first_name || "",
        js.last_name_kana || "",
        js.first_name_kana || "",
        js.email || "",
        js.phone || js.phone_number || "",
        js.graduation_year || "",
        js.gender || "",
        js.school_type || "",
        js.school_name || "",
        js.major_field || "",
        js.date_of_birth || "",
        js.desired_industry || "",
        js.desired_job_type || "",
        js.desired_work_location || "",
        js.entry_channel || "",
        js.utm_source || "",
        js.utm_medium || "",
        js.utm_campaign || "",
        js.utm_content || "",
        js.utm_term || "",
        js.referrer || "",
        js.jobtv_id || "",
        js.notes || "",
        js.created_at || "",
        js.updated_at || "",
      ]);

      // SHIFT-JISでダウンロード
      await downloadCSVAsShiftJIS(
        headers,
        rows,
        `students_${new Date().toISOString().split("T")[0]}.csv`
      );
    } catch (error) {
      console.error("エクスポートエラー:", error);
      alert("エクスポートに失敗しました");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="success"
      size="lg"
      onClick={handleExport}
      disabled={isExporting}
    >
      {isExporting ? "エクスポート中..." : "CSVエクスポート"}
    </Button>
  );
}
