"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { RATING_GRADE_MAP, RATING_NUMBER_MAP } from "@/types/rating.types";
import Button from "@/components/ui/Button";

type RatingModalFormProps = {
  onClose: () => void;
  companyId: string;
  recruiterId: string;
  candidateId: string;
  eventId: string;
  candidateName?: string;
  candidateKana?: string;
  seatNumber?: string | null;
  schoolName?: string | null;
  candidateRating?: number | null; // 学生からの評価（1-5）
  candidateLikedPoints?: string[] | null; // 学生が選択した「気に入ったところ」
  eventName?: string;
  recruiterName?: string;
};

type RatingGrade = "S" | "A" | "B" | "C";

const ratingGrades: RatingGrade[] = ["S", "A", "B", "C"];

export default function RatingModalForm({
  onClose,
  companyId,
  recruiterId: initialRecruiterId,
  candidateId,
  eventId,
  candidateName,
  candidateKana,
  seatNumber,
  schoolName,
  candidateRating,
  candidateLikedPoints,
  recruiterName,
}: RatingModalFormProps) {
  const [ratings, setRatings] = useState<{
    overall_rating: RatingGrade | null;
    logic_rating: RatingGrade | null;
    initiative_rating: RatingGrade | null;
    cooperation_rating: RatingGrade | null;
    creative_rating: RatingGrade | null;
    communication_rating: RatingGrade | null;
  }>({
    overall_rating: null,
    logic_rating: null,
    initiative_rating: null,
    cooperation_rating: null,
    creative_rating: null,
    communication_rating: null,
  });

  const [comment, setComment] = useState("");
  const [memo, setMemo] = useState("");
  const [templates, setTemplates] = useState<
    { id: string; template_text: string }[]
  >([]);
  const [existingRatingId, setExistingRatingId] = useState<string | null>(null);
  const [existingEvaluatorName, setExistingEvaluatorName] = useState<
    string | null
  >(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const errorMessageRef = useRef<HTMLDivElement>(null);

  // 評価の数値を取得（S=4, A=3, B=2, C=1）
  const getRatingValue = (grade: RatingGrade | null): number | null => {
    if (!grade) return null;
    return RATING_GRADE_MAP[grade];
  };

  // 評価から総合評価を計算する関数
  const calculateOverallRatingFromRatings = (
    ratingsData: typeof ratings
  ): RatingGrade | null => {
    const ratingValues = [
      getRatingValue(ratingsData.logic_rating),
      getRatingValue(ratingsData.initiative_rating),
      getRatingValue(ratingsData.cooperation_rating),
      getRatingValue(ratingsData.creative_rating),
      getRatingValue(ratingsData.communication_rating),
    ].filter((v): v is number => v !== null);

    if (ratingValues.length === 0) return null;

    const average =
      ratingValues.reduce((sum, val) => sum + val, 0) / ratingValues.length;
    const rounded = Math.round(average);
    return RATING_NUMBER_MAP[rounded] as RatingGrade;
  };

  // 総合評価を各評価の平均値で計算
  const calculateOverallRating = (): RatingGrade | null => {
    return calculateOverallRatingFromRatings(ratings);
  };

  const fetchTemplates = useCallback(async () => {
    if (!companyId) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("comment_templates")
      .select("id, template_text")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("テンプレート取得エラー:", error);
    } else {
      setTemplates(data || []);
    }
  }, [companyId]);

  const fetchCompanyAndRecruiters = useCallback(async () => {
    if (!companyId) return;
    const supabase = createClient();

    // 企業名を取得
    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();

    if (companyError) {
      console.error("企業取得エラー:", companyError);
    } else {
      setCompanyName(companyData?.name || "");
    }
  }, [companyId]);

  const fetchExistingRating = useCallback(async () => {
    if (!companyId || !eventId || !candidateId) return;
    const supabase = createClient();
    // 同じイベント・企業・学生の評価を取得
    const { data, error } = await supabase
      .from("event_ratings_recruiter_to_candidate")
      .select("*")
      .eq("company_id", companyId)
      .eq("event_id", eventId)
      .eq("candidate_id", candidateId)
      .maybeSingle();

    if (error) {
      console.error("評価取得エラー:", error);
      return;
    }

    if (data) {
      setExistingRatingId(data.id);
      setExistingEvaluatorName(data.evaluator_name || null);
      setRatings({
        overall_rating: data.overall_rating
          ? (RATING_NUMBER_MAP[data.overall_rating] as RatingGrade)
          : null,
        logic_rating: data.logic_rating
          ? (RATING_NUMBER_MAP[data.logic_rating] as RatingGrade)
          : null,
        initiative_rating: data.initiative_rating
          ? (RATING_NUMBER_MAP[data.initiative_rating] as RatingGrade)
          : null,
        cooperation_rating: data.cooperation_rating
          ? (RATING_NUMBER_MAP[data.cooperation_rating] as RatingGrade)
          : null,
        creative_rating: data.creative_rating
          ? (RATING_NUMBER_MAP[data.creative_rating] as RatingGrade)
          : null,
        communication_rating: data.communication_rating
          ? (RATING_NUMBER_MAP[data.communication_rating] as RatingGrade)
          : null,
      });
      setComment(data.comment || "");
      setMemo(data.memo || "");
    } else {
      setExistingRatingId(null);
      setExistingEvaluatorName(null);
    }
  }, [companyId, eventId, candidateId]);

  useEffect(() => {
    if (companyId && eventId && candidateId) {
      fetchCompanyAndRecruiters();
      fetchTemplates();
      fetchExistingRating();
    }
  }, [
    companyId,
    eventId,
    candidateId,
    fetchCompanyAndRecruiters,
    fetchTemplates,
    fetchExistingRating,
  ]);

  const handleRatingClick = (
    type:
      | "overall_rating"
      | "logic_rating"
      | "initiative_rating"
      | "cooperation_rating"
      | "creative_rating"
      | "communication_rating",
    grade: RatingGrade
  ) => {
    setRatings((prev) => {
      const newRatings = {
        ...prev,
        [type]: prev[type] === grade ? null : grade,
      };
      // 詳細評価が変更された場合、総合評価を自動計算
      if (type !== "overall_rating") {
        const calculatedOverall = calculateOverallRatingFromRatings(newRatings);
        newRatings.overall_rating = calculatedOverall;
      }
      return newRatings;
    });
    setErrorMessage("");
  };

  // エラーメッセージが表示されたときにスクロール
  useEffect(() => {
    if (errorMessage && errorMessageRef.current) {
      errorMessageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [errorMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage("");

    if (
      !companyId ||
      !candidateId ||
      !eventId ||
      typeof eventId !== "string" ||
      eventId.trim() === ""
    ) {
      setErrorMessage("企業、学生、イベントを選択してください");
      setIsSubmitting(false);
      return;
    }

    // すべての詳細評価項目が入力されていることを確認
    if (
      !ratings.logic_rating ||
      !ratings.initiative_rating ||
      !ratings.cooperation_rating ||
      !ratings.creative_rating ||
      !ratings.communication_rating
    ) {
      setErrorMessage("すべての評価項目を入力してください");
      setIsSubmitting(false);
      return;
    }

    // 総合評価を自動計算
    const calculatedOverall = calculateOverallRating();
    if (!calculatedOverall) {
      setErrorMessage("評価の計算に失敗しました");
      setIsSubmitting(false);
      return;
    }

    // コメントの文字数チェック
    if (comment && comment.length > 60) {
      setErrorMessage("コメントは60字以内で入力してください");
      setIsSubmitting(false);
      return;
    }

    // メモの文字数チェック
    if (memo && memo.length > 1000) {
      setErrorMessage("メモは1000字以内で入力してください");
      setIsSubmitting(false);
      return;
    }

    // 総合S/A評価にはコメント必須
    if (
      (calculatedOverall === "S" || calculatedOverall === "A") &&
      !comment.trim()
    ) {
      setErrorMessage("総合評価がSまたはAの場合は、コメントが必須です");
      setIsSubmitting(false);
      return;
    }

    try {
      const ratingData: {
        company_id: string;
        recruiter_id: string | null;
        event_id: string;
        candidate_id: string;
        overall_rating: number;
        logic_rating: number;
        initiative_rating: number;
        cooperation_rating: number;
        creative_rating: number;
        communication_rating: number;
        comment: string | null;
        memo: string | null;
        evaluator_name: string | null;
      } = {
        company_id: companyId,
        recruiter_id: initialRecruiterId || null,
        event_id: eventId,
        candidate_id: candidateId,
        overall_rating: RATING_GRADE_MAP[calculatedOverall],
        logic_rating: RATING_GRADE_MAP[ratings.logic_rating],
        initiative_rating: RATING_GRADE_MAP[ratings.initiative_rating],
        cooperation_rating: RATING_GRADE_MAP[ratings.cooperation_rating],
        creative_rating: RATING_GRADE_MAP[ratings.creative_rating],
        communication_rating: RATING_GRADE_MAP[ratings.communication_rating],
        comment: comment.trim() || null,
        memo: memo.trim() || null,
        evaluator_name: recruiterName || null,
      };

      // 同じイベント・企業・学生の評価があれば上書き（UNIQUE制約により1つだけ）
      const supabase = createClient();
      if (existingRatingId) {
        // 既存の評価を更新する場合も担当者チェックを行う
        const { data: currentData } = await supabase
          .from("event_ratings_recruiter_to_candidate")
          .select("evaluator_name")
          .eq("id", existingRatingId)
          .maybeSingle();

        if (
          currentData?.evaluator_name &&
          recruiterName &&
          currentData.evaluator_name !== recruiterName
        ) {
          const confirmMessage = `この評価は「${currentData.evaluator_name}」が最後に更新しています。\n上書きしてもよろしいですか？`;
          if (!window.confirm(confirmMessage)) {
            setIsSubmitting(false);
            return;
          }
        }

        const { error } = await supabase
          .from("event_ratings_recruiter_to_candidate")
          .update(ratingData)
          .eq("id", existingRatingId);

        if (error) {
          const errorMessage =
            error && typeof error === "object" && "message" in error
              ? String((error as { message: string }).message)
              : "更新に失敗しました";
          setErrorMessage(errorMessage);
          setIsSubmitting(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from("event_ratings_recruiter_to_candidate")
          .insert(ratingData);

        if (error) {
          // UNIQUE制約違反の場合は更新を試みる
          const errorCode =
            error && typeof error === "object" && "code" in error
              ? String((error as { code: string }).code)
              : "";
          if (errorCode === "23505") {
            // 既存の評価を取得して更新
            if (!companyId || !eventId || !candidateId) {
              setErrorMessage("必須項目が不足しています");
              setIsSubmitting(false);
              return;
            }
            const { data: existingData } = await supabase
              .from("event_ratings_recruiter_to_candidate")
              .select("id, evaluator_name")
              .eq("company_id", companyId)
              .eq("event_id", eventId)
              .eq("candidate_id", candidateId)
              .maybeSingle();

            if (existingData) {
              // 別の担当者が最後に更新した場合、確認を求める
              if (
                existingData.evaluator_name &&
                recruiterName &&
                existingData.evaluator_name !== recruiterName
              ) {
                const confirmMessage = `この評価は「${existingData.evaluator_name}」が最後に更新しています。\n上書きしてもよろしいですか？`;
                if (!window.confirm(confirmMessage)) {
                  setIsSubmitting(false);
                  return;
                }
              }

              const { error: updateError } = await supabase
                .from("event_ratings_recruiter_to_candidate")
                .update(ratingData)
                .eq("id", existingData.id);

              if (updateError) {
                const errorMessage =
                  updateError &&
                  typeof updateError === "object" &&
                  "message" in updateError
                    ? String((updateError as { message: string }).message)
                    : "更新に失敗しました";
                setErrorMessage(errorMessage);
                return;
              }
            } else {
              const errorMessage =
                error && typeof error === "object" && "message" in error
                  ? String((error as { message: string }).message)
                  : "登録に失敗しました";
              setErrorMessage(errorMessage);
              return;
            }
          } else {
            const errorMessage =
              error && typeof error === "object" && "message" in error
                ? String((error as { message: string }).message)
                : "登録に失敗しました";
            setErrorMessage(errorMessage);
            return;
          }
        }
      }

      onClose();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "エラーが発生しました"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGradeColor = (grade: RatingGrade, isSelected: boolean) => {
    if (!isSelected) {
      return {
        bg: "bg-gray-100",
        hover: "hover:bg-gray-200",
        text: "text-gray-600",
        border: "border-gray-300",
        shadow: "",
      };
    }

    switch (grade) {
      case "S":
        return {
          bg: "bg-red-500",
          hover: "hover:bg-red-600",
          text: "text-white",
          border: "border-red-500",
          shadow: "",
        };
      case "A":
        return {
          bg: "bg-blue-600",
          hover: "hover:bg-blue-700",
          text: "text-white",
          border: "border-blue-600",
          shadow: "",
        };
      case "B":
        return {
          bg: "bg-blue-400",
          hover: "hover:bg-blue-500",
          text: "text-white",
          border: "border-blue-400",
          shadow: "",
        };
      case "C":
        return {
          bg: "bg-gray-400",
          hover: "hover:bg-gray-500",
          text: "text-white",
          border: "border-gray-400",
          shadow: "",
        };
    }
  };

  const RatingButtonGroup = ({
    type,
    label,
    detailRatings,
  }: {
    type:
      | "overall_rating"
      | "logic_rating"
      | "initiative_rating"
      | "cooperation_rating"
      | "creative_rating"
      | "communication_rating";
    label: string;
    detailRatings?: Array<{
      type:
        | "logic_rating"
        | "initiative_rating"
        | "cooperation_rating"
        | "creative_rating"
        | "communication_rating";
      label: string;
      englishLabel?: string;
      description?: string;
      icon?: React.ReactNode;
    }>;
  }) => {
    const selectedGrade = ratings[type];

    // 詳細評価グループの場合
    if (detailRatings) {
      return (
        <div className="mb-5 p-4 bg-white rounded-xl border border-gray-200 shadow-md">
          <div className="space-y-4">
            {detailRatings.map((detail) => {
              const detailSelectedGrade = ratings[detail.type];
              return (
                <div
                  key={detail.type}
                  className="pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    {detail.icon && (
                      <div className="flex-shrink-0">{detail.icon}</div>
                    )}
                    <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                      <div className="flex-shrink-0 min-w-[140px]">
                        <span className="text-sm font-bold text-gray-800">
                          {detail.label}
                          {detail.englishLabel && (
                            <span className="ml-2 text-[10px] font-normal text-gray-500">
                              {detail.englishLabel}
                            </span>
                          )}
                        </span>
                        {detail.description && (
                          <div className="text-[10px] text-gray-500 leading-tight mt-0.5">
                            {detail.description}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex gap-1.5 justify-end w-full sm:w-auto">
                        {ratingGrades.map((grade) => {
                          const isSelected = detailSelectedGrade === grade;
                          const colors = getGradeColor(grade, isSelected);

                          return (
                            <button
                              key={grade}
                              type="button"
                              onClick={() =>
                                handleRatingClick(detail.type, grade)
                              }
                              disabled={isSubmitting}
                              className={`
                                flex-1 sm:flex-none sm:min-w-[64px] py-1.5 px-2 rounded-lg font-bold text-sm
                                border-2 transition-all duration-200 shadow-sm
                                ${colors.bg} ${colors.hover} ${colors.text} ${
                                colors.border
                              }
                                ${
                                  isSubmitting
                                    ? "opacity-50 cursor-not-allowed"
                                    : "cursor-pointer hover:shadow-md hover:scale-105 active:scale-95"
                                }
                              `}
                            >
                              {grade}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 通常の評価グループ（総合評価は読み取り専用）
    const isOverallRating = type === "overall_rating";
    const isReadOnly = isOverallRating;

    return (
      <div className="mb-5 p-4 bg-white rounded-xl border border-gray-200 shadow-md">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-bold text-gray-800">{label}</span>
          {isOverallRating && (
            <span className="text-xs text-gray-500 font-medium">
              (各評価の平均値で自動計算)
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {ratingGrades.map((grade) => {
            const isSelected = selectedGrade === grade;
            const colors = getGradeColor(grade, isSelected);
            const isDisabled = isSubmitting || isReadOnly;

            return (
              <button
                key={grade}
                type="button"
                onClick={() => !isReadOnly && handleRatingClick(type, grade)}
                disabled={isDisabled}
                className={`
                  py-2 px-3 rounded-lg font-bold text-sm
                  border-2 transition-all duration-200 shadow-sm
                  ${
                    isReadOnly && !isSelected
                      ? "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
                      : `${colors.bg} ${colors.hover} ${colors.text} ${colors.border}`
                  }
                  ${
                    isDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:shadow-md hover:scale-105 active:scale-95"
                  }
                `}
                title={
                  isReadOnly
                    ? "総合評価は各評価の平均値で自動計算されます"
                    : undefined
                }
              >
                {grade}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const calculatedOverall = calculateOverallRating();
  const overallColors = calculatedOverall
    ? getGradeColor(calculatedOverall, true)
    : null;

  return (
    <div className="w-full flex flex-col">
      {/* ヘッダー */}
      <div className="flex-shrink-0 mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-baseline">
            学生評価
            {recruiterName && (
              <span className="ml-3 text-sm font-normal text-gray-500 italic">
                評価者：{recruiterName}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="閉じる"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 3カラムレイアウト */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* 左カラム：基本情報 */}
        <div className="w-full xl:w-64 flex-shrink-0 flex flex-col space-y-4">
          {candidateName && (
            <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-xl p-4 border border-green-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="w-4 h-4 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  学生名
                </span>
              </div>
              <div className="space-y-1.5">
                <div>
                  <span className="text-base font-bold text-emerald-900 tracking-tight">
                    {candidateName}
                  </span>
                  {candidateKana && (
                    <span className="ml-2 text-[10px] text-emerald-600 font-medium">
                      ({candidateKana})
                    </span>
                  )}
                </div>
                {seatNumber && (
                  <div className="text-[11px] text-emerald-700 font-medium">
                    席番号: <span className="font-semibold">{seatNumber}</span>
                  </div>
                )}
                {schoolName && (
                  <div className="text-[11px] text-emerald-700 font-medium">
                    学校名: <span className="font-semibold">{schoolName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-[11px] text-emerald-700 pt-1.5 border-t border-emerald-100">
                  <span className="font-semibold">学生からの評価:</span>
                  {candidateRating !== null &&
                  candidateRating !== undefined &&
                  typeof candidateRating === "number" &&
                  candidateRating >= 1 &&
                  candidateRating <= 5 ? (
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => {
                        const starValue = i + 1;
                        return (
                          <span
                            key={i}
                            className={`text-sm ${
                              starValue <= candidateRating
                                ? "text-amber-400"
                                : "text-gray-300"
                            }`}
                          >
                            ★
                          </span>
                        );
                      })}
                      <span className="ml-1 font-bold text-emerald-800">
                        {candidateRating}
                      </span>
                    </div>
                  ) : (
                    <span className="text-emerald-600 font-medium">未評価</span>
                  )}
                </div>
                {candidateLikedPoints && candidateLikedPoints.length > 0 && (
                  <div className="text-[11px] text-emerald-700 pt-1.5 border-t border-emerald-100">
                    <div className="font-semibold mb-1">コメント:</div>
                    <div className="flex flex-wrap gap-1">
                      {candidateLikedPoints.map(
                        (point: string, index: number) => (
                          <span
                            key={index}
                            className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-medium"
                          >
                            {point}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 総合評価のバッジ表示 */}
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
              <span className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">
                総合評価
              </span>
            </div>
            {calculatedOverall && overallColors ? (
              <div
                className={`inline-flex items-center justify-center px-4 py-2 rounded-xl font-bold text-lg border-2 ${overallColors.bg} ${overallColors.text} ${overallColors.border}`}
              >
                {calculatedOverall}
              </div>
            ) : (
              <div className="text-xs text-gray-400 italic">
                評価を入力してください
              </div>
            )}
            <div className="mt-2 text-[10px] text-gray-500 font-medium">
              (各評価の平均値で自動計算)
            </div>
          </div>
        </div>

        {/* 中央カラム：個別評価とコメント */}
        <div className="flex-1 min-w-0 flex flex-col space-y-4">
          <form
            id="rating-form"
            onSubmit={handleSubmit}
            className="flex flex-col h-full"
          >
            {/* 詳細評価を1つのグループに */}
            <RatingButtonGroup
              type="logic_rating"
              label="詳細評価"
              detailRatings={[
                {
                  type: "logic_rating",
                  label: "ロジカル",
                  englishLabel: "Logical",
                  description: "課題を構造的に理解・整理する能力",
                  icon: (
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  ),
                },
                {
                  type: "initiative_rating",
                  label: "アクティブ",
                  englishLabel: "Active",
                  description: "主体的に課題に取り組む能力",
                  icon: (
                    <svg
                      className="w-5 h-5 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  ),
                },
                {
                  type: "creative_rating",
                  label: "クリエイティブ",
                  englishLabel: "Creative",
                  description: "自ら考えて価値を生み出す能力",
                  icon: (
                    <svg
                      className="w-5 h-5 text-orange-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                  ),
                },
                {
                  type: "communication_rating",
                  label: "コミュニケーション",
                  englishLabel: "Communication",
                  description: "他者の立場に立って議論を展開する能力",
                  icon: (
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  ),
                },
                {
                  type: "cooperation_rating",
                  label: "サポート",
                  englishLabel: "Support",
                  description: "全体を俯瞰してチームを支える能力",
                  icon: (
                    <svg
                      className="w-5 h-5 text-pink-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  ),
                },
              ]}
            />

            {/* コメント入力欄 */}
            <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200 shadow-md">
              <div className="mb-3 text-sm font-bold text-gray-800">
                コメント{" "}
                <span className="text-xs font-normal text-gray-500">
                  ※60字以内 ※総合評価がSまたはAの場合はコメントが必須です
                </span>
              </div>

              {/* テンプレート選択 */}
              {templates.length > 0 && (
                <div className="mb-3">
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none shadow-sm hover:border-gray-400 font-medium"
                    onChange={(e) => {
                      const selectedTemplate = templates.find(
                        (t) => t.id === e.target.value
                      );
                      if (selectedTemplate) {
                        setComment(selectedTemplate.template_text);
                      }
                    }}
                    value=""
                    disabled={isSubmitting}
                  >
                    <option value="">テンプレートを選択...</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.template_text}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="relative">
                <textarea
                  value={comment}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 60) {
                      setComment(value);
                      setErrorMessage("");
                    }
                  }}
                  placeholder="コメントを入力（60字以内）"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs resize-none bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none placeholder:text-gray-400 shadow-sm hover:border-gray-400"
                  rows={3}
                  maxLength={60}
                  disabled={isSubmitting}
                />
                <div className="mt-1 text-xs text-gray-500 text-right font-medium">
                  {comment.length}/60
                </div>
              </div>
            </div>

            {errorMessage && (
              <div
                ref={errorMessageRef}
                className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 shadow-sm"
              >
                {errorMessage}
              </div>
            )}

            {/* ボタンエリア (中央カラムの下部に配置) */}
            <div className="flex justify-end gap-3 pt-4 mb-4 mt-auto">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isSubmitting}
                size="md"
                className="shadow-sm hover:shadow-md transition-shadow"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                variant="danger"
                disabled={isSubmitting}
                size="md"
                className="shadow-md hover:shadow-lg transition-shadow"
              >
                {isSubmitting
                  ? "保存中..."
                  : existingRatingId
                  ? "更新"
                  : "登録"}
              </Button>
            </div>
          </form>
        </div>

        {/* 右カラム：メモ */}
        <div className="w-full xl:w-80 flex-shrink-0 flex flex-col space-y-4">
          <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
            <div className="mb-3 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                メモ
              </span>
              <span className="text-[10px] text-gray-500 font-normal ml-auto">
                ※学生には表示されません
              </span>
            </div>
            <textarea
              value={memo}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 1000) {
                  setMemo(value);
                }
              }}
              placeholder="社内用のメモを入力..."
              className="flex-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all outline-none placeholder:text-gray-400 shadow-sm hover:border-gray-300 min-h-[300px]"
              maxLength={1000}
              disabled={isSubmitting}
            />
            <div className="mt-1 text-xs text-gray-500 text-right font-medium">
              {memo.length}/1000
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
