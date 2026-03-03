"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import StarRating from "@/components/ui/modals/StarRating";

type CandidateRatingFormProps = {
  candidateId: string;
  companyId: string;
  eventId: string;
  candidateName?: string;
  companyName?: string;
  eventName?: string;
  existingRating?: number | null;
  existingLikedPoints?: string[] | null;
  isAdmin?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export default function CandidateRatingForm({
  candidateId,
  companyId,
  eventId,
  candidateName,
  companyName,
  eventName,
  existingRating,
  existingLikedPoints,
  isAdmin = false,
  onSuccess,
  onCancel,
}: CandidateRatingFormProps) {
  const [rating, setRating] = useState<number | null>(existingRating || null);
  const [likedPoints, setLikedPoints] = useState<string[]>(
    existingLikedPoints || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    // CSRFトークンを取得（学生側の場合のみ必要だが、共通化のため取得を試みる）
    const fetchCSRFToken = async () => {
      try {
        const response = await fetch("/api/csrf-token");
        const data = await response.json();
        if (data.csrfToken) {
          setCsrfToken(data.csrfToken);
        }
      } catch (error) {
        console.error("CSRFトークン取得エラー:", error);
      }
    };
    if (!isAdmin) {
      fetchCSRFToken();
    }
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rating) {
      setErrorMessage("評価を選択してください");
      return;
    }

    if (likedPoints.length === 0) {
      setErrorMessage("気に入ったところを1つ以上選択してください");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      if (isAdmin) {
        // 管理者の場合は直接Supabaseを使用
        const supabase = createClient();

        // 既存の評価を確認
        const { data: existingRatingData, error: checkError } = await supabase
          .from("event_ratings_candidate_to_company")
          .select("id")
          .eq("candidate_id", candidateId)
          .eq("company_id", companyId)
          .eq("event_id", eventId)
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          throw new Error(checkError.message || "評価の確認に失敗しました");
        }

        if (existingRatingData) {
          // 更新
          const { error: updateError } = await supabase
            .from("event_ratings_candidate_to_company")
            .update({
              rating,
              comment: JSON.stringify(likedPoints),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingRatingData.id);

          if (updateError) throw updateError;
        } else {
          // 新規作成
          const { error: insertError } = await supabase
            .from("event_ratings_candidate_to_company")
            .insert({
              candidate_id: candidateId,
              company_id: companyId,
              event_id: eventId,
              rating,
              comment: JSON.stringify(likedPoints),
            });

          if (insertError) throw insertError;
        }
      } else {
        // 学生の場合はAPIルート経由
        const response = await fetch("/api/candidate/ratings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
          },
          body: JSON.stringify({
            candidateId, // 管理者代理用
            companyId,
            eventId,
            rating,
            comment: JSON.stringify(likedPoints),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "評価の保存に失敗しました");
        }
      }

      if (onSuccess) onSuccess();
    } catch (error: unknown) {
      console.error("評価保存エラー:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "評価の保存に失敗しました"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const LIKED_POINTS_OPTIONS = [
    "雰囲気が良い",
    "話しやすい",
    "成長できそう",
    "やりがいがありそう",
    "福利厚生が充実",
    "働きやすい環境",
    "技術的に学べそう",
    "チームワークが良さそう",
    "給与・待遇が良い",
    "将来性がある",
  ];

  return (
    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
      <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-3">
        {isAdmin ? "学生評価（代理登録）" : "企業評価"}
      </h2>

      {(companyName || candidateName) && (
        <div className="mb-3 md:mb-4 p-2.5 md:p-3 bg-gray-50 rounded-lg border border-gray-200">
          {candidateName && (
            <div className="mb-2">
              <div className="text-xs text-gray-600 mb-0.5">学生名</div>
              <div className="text-sm md:text-base font-semibold text-gray-800">
                {candidateName}
              </div>
            </div>
          )}
          {companyName && (
            <div>
              <div className="text-xs text-gray-600 mb-0.5">企業名</div>
              <div className="text-sm md:text-base font-semibold text-gray-800">
                {companyName}
              </div>
            </div>
          )}
          {eventName && (
            <div className="mt-1 text-xs text-gray-500">{eventName}</div>
          )}
        </div>
      )}

      <div className="mb-3 md:mb-4 p-2.5 md:p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="mb-1.5 md:mb-2 text-sm font-semibold text-gray-800">
          評価 <span className="text-gray-500 text-xs">(5段階)</span>
        </div>
        <div className="flex justify-center md:justify-start">
          <StarRating
            rating={rating}
            onRatingChange={setRating}
            disabled={isSubmitting}
            size="md"
          />
        </div>
      </div>

      <div className="mb-3 md:mb-4 p-2.5 md:p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="mb-2 text-sm font-semibold text-gray-800">
          気に入ったところ{" "}
          <span className="text-gray-500 text-xs">(複数選択可)</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 md:gap-2">
          {LIKED_POINTS_OPTIONS.map((point) => {
            const isSelected = likedPoints.includes(point);
            return (
              <button
                key={point}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setLikedPoints(likedPoints.filter((p) => p !== point));
                  } else {
                    setLikedPoints([...likedPoints, point]);
                  }
                }}
                disabled={isSubmitting}
                className={`p-1.5 md:p-2 rounded-lg text-xs md:text-sm font-medium transition-all touch-manipulation min-h-[40px] flex items-center justify-center text-center leading-tight ${
                  isSelected
                    ? "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700"
                    : "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 active:bg-gray-100"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {point}
              </button>
            );
          })}
        </div>
      </div>

      {errorMessage && (
        <div className="mb-3 md:mb-4 p-2.5 md:p-3 bg-red-50 rounded-lg">
          <div className="text-xs md:text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 mt-4 md:mt-5 pt-3 md:pt-4 border-t border-gray-200">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
            size="md"
            className="w-full sm:w-auto min-h-[44px]"
          >
            キャンセル
          </Button>
        )}
        <Button
          type="submit"
          variant="danger"
          disabled={isSubmitting || !rating}
          size="md"
          className="w-full sm:w-auto min-h-[44px]"
        >
          {isSubmitting ? "保存中..." : existingRating ? "更新" : "登録"}
        </Button>
      </div>
    </form>
  );
}
