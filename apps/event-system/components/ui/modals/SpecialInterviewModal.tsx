"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/modals/Modal";
import Button from "@/components/ui/Button";
import { saveEventSpecialInterviews } from "@/lib/actions/matching-actions";
import {
  SpecialInterviewInput,
  MatchingCompany,
  MatchingCandidate,
} from "@/types/matching.types";

type SpecialInterviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  sessionCount: number;
  specialInterviews: SpecialInterviewInput[];
  onUpdate: (interviews: SpecialInterviewInput[]) => void;
};

export default function SpecialInterviewModal({
  isOpen,
  onClose,
  eventId,
  sessionCount,
  specialInterviews,
  onUpdate,
}: SpecialInterviewModalProps) {
  const [companies, setCompanies] = useState<MatchingCompany[]>([]);
  const [candidates, setCandidates] = useState<
    (MatchingCandidate & { email?: string })[]
  >([]);

  // マトリクスの状態管理: [sessionNumber][companyId] = candidateId
  const [matrix, setMatrix] = useState<Map<number, Map<string, string>>>(
    new Map()
  );

  const fetchCompanies = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("event_companies")
      .select(
        `
        company_id,
        companies (
          id,
          name
        )
      `
      )
      .eq("event_id", eventId);

    if (error) {
      console.error("企業取得エラー:", error);
      return;
    }

    type EventCompanyItem = {
      company_id: string;
      companies: { id: string; name: string } | null;
    };
    const formattedCompanies = ((data || []) as unknown as EventCompanyItem[])
      .filter((item) => item.companies !== null)
      .map((item) => item.companies)
      .filter(
        (company): company is { id: string; name: string } => company !== null
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    setCompanies(formattedCompanies);
  }, [eventId]);

  const fetchCandidates = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("event_reservations")
        .select(
          `
          candidate_id,
          seat_number,
          candidates (
            id,
            profiles!profiles_candidate_id_fkey(last_name, first_name, last_name_kana, first_name_kana, email)
          )
        `
        )
        .eq("event_id", eventId)
        .eq("attended", true);

      if (error) {
        console.error("学生取得エラー:", error);
        return;
      }

      // 学生IDごとにグループ化（同じ学生が複数の予約を持っている場合があるため）
      type CandidateItem = {
        id: string;
        last_name: string;
        first_name: string;
        last_name_kana: string;
        first_name_kana: string;
        email: string;
        seat_number: string | null;
      };
      const candidateMap = new Map<string, CandidateItem>();

      type ProfileItem = {
        last_name: string;
        first_name: string;
        last_name_kana: string;
        first_name_kana: string;
        email: string;
      };
      type ReservationItem = {
        candidate_id: string;
        seat_number: string | null;
        candidates: {
          id: string;
          profiles: ProfileItem | ProfileItem[] | null;
        } | null;
      };
      ((data || []) as unknown as ReservationItem[]).forEach((item) => {
        if (item.candidates && !candidateMap.has(item.candidate_id)) {
          const p = Array.isArray(item.candidates.profiles) ? item.candidates.profiles[0] : item.candidates.profiles;
          candidateMap.set(item.candidate_id, {
            id: item.candidates.id,
            last_name: p?.last_name || "",
            first_name: p?.first_name || "",
            last_name_kana: p?.last_name_kana || "",
            first_name_kana: p?.first_name_kana || "",
            email: p?.email || "",
            seat_number: item.seat_number,
          });
        }
      });

      const formattedCandidates = Array.from(candidateMap.values()).sort(
        (a: CandidateItem, b: CandidateItem) => {
          // 席番号でソート（A1, A2, B1...）
          const seatA = a.seat_number || "";
          const seatB = b.seat_number || "";
          if (seatA && seatB) {
            return seatA.localeCompare(seatB);
          }
          // 席番号がない場合はフリガナでソート
          return a.last_name_kana.localeCompare(b.last_name_kana);
        }
      );

      setCandidates(formattedCandidates);
    } catch (error) {
      console.error("予期しないエラー:", error);
    } finally {
    }
  }, [eventId]);

  // 既存の特別面談データをマトリクスに反映
  useEffect(() => {
    if (isOpen) {
      // まずマトリクスを初期化
      const newMatrix = new Map<number, Map<string, string>>();
      for (let i = 1; i <= sessionCount; i++) {
        newMatrix.set(i, new Map());
      }

      // 既存の特別面談データを反映
      if (specialInterviews.length > 0) {
        specialInterviews.forEach((si) => {
          if (!newMatrix.has(si.sessionNumber)) {
            newMatrix.set(si.sessionNumber, new Map());
          }
          newMatrix.get(si.sessionNumber)!.set(si.companyId, si.candidateId);
        });
      }

      setMatrix(newMatrix);
    }
  }, [isOpen, specialInterviews, sessionCount]);

  useEffect(() => {
    if (isOpen) {
      fetchCompanies();
      fetchCandidates();
    }
  }, [isOpen, fetchCompanies, fetchCandidates]);

  // 同じ回または同じ企業のセルで選択されている学生IDを取得（重複チェック用）
  const getSelectedCandidateIds = useCallback(
    (
      sessionNumber: number,
      companyId: string,
      excludeCurrentCell: boolean = false
    ) => {
      const selectedIds = new Set<string>();

      // 同じ回のセルで選択されている学生IDを収集
      const sessionMap = matrix.get(sessionNumber);
      if (sessionMap) {
        sessionMap.forEach((candidateId, cId) => {
          if (candidateId) {
            if (excludeCurrentCell && cId === companyId) {
              // 現在のセルは除外（現在の選択を維持できるように）
            } else {
              // 同じ回のすべてのセルで選択されている学生IDを収集
              selectedIds.add(candidateId);
            }
          }
        });
      }

      // 同じ企業のセルで選択されている学生IDを収集
      matrix.forEach((sessionMap, sessionNum) => {
        if (sessionNum !== sessionNumber) {
          // 異なる回のセルをチェック
          const candidateId = sessionMap.get(companyId);
          if (candidateId) {
            selectedIds.add(candidateId);
          }
        }
      });

      return selectedIds;
    },
    [matrix]
  );

  // マトリクスのセルを更新
  const handleCellChange = (
    sessionNumber: number,
    companyId: string,
    candidateId: string
  ) => {
    const newMatrix = new Map(matrix);
    if (!newMatrix.has(sessionNumber)) {
      newMatrix.set(sessionNumber, new Map());
    }
    const sessionMap = newMatrix.get(sessionNumber)!;

    if (candidateId === "") {
      // 空文字の場合は削除
      sessionMap.delete(companyId);
    } else {
      sessionMap.set(companyId, candidateId);
    }

    setMatrix(newMatrix);
  };

  // マトリクスから特別面談リストを生成
  const [isSaving, setIsSaving] = useState(false);
  const handleSave = async () => {
    const interviews: SpecialInterviewInput[] = [];

    matrix.forEach((sessionMap, sessionNumber) => {
      sessionMap.forEach((candidateId, companyId) => {
        if (candidateId) {
          interviews.push({
            companyId,
            candidateId,
            sessionNumber,
          });
        }
      });
    });

    setIsSaving(true);
    try {
      const result = await saveEventSpecialInterviews(eventId, interviews);
      if (result.success) {
        onUpdate(interviews);
        onClose();
      } else {
        alert("保存に失敗しました: " + result.error);
      }
    } catch (error) {
      console.error("保存エラー:", error);
      alert("予期しないエラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  // 学生オプションを取得（同じ回または同じ企業で選択済みの学生を除外）
  const getCandidateOptions = (sessionNumber: number, companyId: string) => {
    // 現在のセルで選択されている学生IDを取得
    const currentSelected = matrix.get(sessionNumber)?.get(companyId) || "";

    // 同じ回または同じ企業のセルで選択されている学生IDを取得（現在のセルを除外）
    const selectedIds = getSelectedCandidateIds(sessionNumber, companyId, true);

    // 同じ回または同じ企業で選択されている学生を除外（現在のセルで選択されている学生は除外しない）
    const availableCandidates = candidates.filter(
      (c) => !selectedIds.has(c.id) || c.id === currentSelected
    );

    return [
      { value: "", label: "選択なし" },
      ...availableCandidates.map((c) => {
        const seatNumber = c.seat_number ? `[${c.seat_number}] ` : "";
        return {
          value: c.id,
          label: `${seatNumber}${c.last_name} ${c.first_name}`,
        };
      }),
    ];
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} hideFooter maxWidth="6xl">
      <div className="w-full">
        <h2 className="text-xl font-bold mb-4">特別面談登録</h2>

        {/* マトリクステーブル */}
        <div className="mb-6 overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold sticky left-0 bg-gray-50 z-10">
                  座談会回数
                </th>
                {companies.map((company) => (
                  <th
                    key={company.id}
                    className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold min-w-[200px]"
                  >
                    {company.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: sessionCount }, (_, i) => i + 1).map(
                (sessionNumber) => (
                  <tr key={sessionNumber} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2 text-sm font-semibold sticky left-0 bg-white z-10">
                      {sessionNumber}回目
                    </td>
                    {companies.map((company) => {
                      const selectedCandidateId =
                        matrix.get(sessionNumber)?.get(company.id) || "";
                      return (
                        <td
                          key={company.id}
                          className="border border-gray-300 px-2 py-2"
                        >
                          <select
                            value={selectedCandidateId}
                            onChange={(e) =>
                              handleCellChange(
                                sessionNumber,
                                company.id,
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          >
                            {getCandidateOptions(sessionNumber, company.id).map(
                              (option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              )
                            )}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {/* 登録済み件数の表示 */}
        <div className="mb-4 text-sm text-gray-600">
          登録済み:{" "}
          {Array.from(matrix.values()).reduce(
            (sum, sessionMap) =>
              sum +
              Array.from(sessionMap.values()).filter((id) => id !== "").length,
            0
          )}
          件
        </div>

        {/* ボタン */}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
