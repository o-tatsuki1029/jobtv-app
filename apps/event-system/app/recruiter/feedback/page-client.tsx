"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Table from "@/components/ui/table/Table";
import { FormField } from "@/components/ui/form/FormField";
import { SelectInput } from "@/components/ui/form/FormField";
import { useSessionStorage } from "@/hooks/useSessionStorage";
import { formatEventDisplay } from "@/utils/data/event";
import { Event } from "@/types/event.types";
import StarRating from "@/components/ui/modals/StarRating";
import type { Database } from "@/types";

type CompanyOption = {
  id: string;
  name: string;
};
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";

type CandidateRating = {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_kana: string;
  seat_number: string | null;
  company_id: string;
  name: string;
  event_id: string;
  event_name: string;
  rating: number | null;
  comment: string | null;
};

type RecruiterFeedbackPageClientProps = {
  isAdmin: boolean;
  loggedInRecruiterId?: string;
  loggedInCompanyId?: string;
};

const SELECTED_EVENT_KEY = "recruiter_selected_event_id";
const SELECTED_COMPANY_KEY = "admin_selected_company_id";

function RecruiterFeedbackPageClient({
  isAdmin,
  loggedInRecruiterId,
  loggedInCompanyId,
}: RecruiterFeedbackPageClientProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [allCompanies, setAllCompanies] = useState<CompanyOption[]>([]);
  const [ratings, setRatings] = useState<CandidateRating[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useSessionStorage<string>(
    SELECTED_COMPANY_KEY,
    loggedInCompanyId || ""
  );
  const [selectedEventId, setSelectedEventId] = useSessionStorage<string>(
    SELECTED_EVENT_KEY,
    ""
  );
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn] = useState(
    !!(loggedInRecruiterId && loggedInCompanyId) || isAdmin
  );

  // 使用する企業IDを決定（管理者の場合は選択された企業、そうでない場合はログイン中の企業）
  const activeCompanyId = isAdmin ? selectedCompanyId : loggedInCompanyId;

  // 管理者の場合、企業一覧を取得
  const fetchCompanies = useCallback(async () => {
    if (!isAdmin) return;

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error("企業一覧取得エラー:", error);
        return;
      }

      setAllCompanies(data || []);
    } catch (error) {
      console.error("予期しないエラー:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  const fetchEvents = useCallback(async () => {
    if (!activeCompanyId) return;

    setIsLoading(true);
    try {
      const supabase = createClient();

      // 企業が参加したイベントを取得
      const { data, error } = await supabase
        .from("event_companies")
        .select(
          `
          event_id,
          events (
            *
          )
        `
        )
        .eq("company_id", activeCompanyId);

      if (error) {
        console.error("イベント取得エラー:", error);
        return;
      }

      // データを整形（eventsテーブルのデータを抽出）
      type EventItem = {
        event_id: string;
        events: Database["public"]["Tables"]["events"]["Row"] | null;
      };
      const formattedEvents = ((data || []) as unknown as EventItem[])
        .map((item) => item.events)
        .filter(
          (event): event is Database["public"]["Tables"]["events"]["Row"] =>
            event !== null
        )
        .sort((a, b) => {
          // イベント日付で降順にソート
          const dateA = new Date(a.event_date).getTime();
          const dateB = new Date(b.event_date).getTime();
          return dateB - dateA;
        });

      setEvents(formattedEvents);
    } catch (error) {
      console.error("予期しないエラー:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeCompanyId]);

  const fetchRatings = useCallback(
    async (eventId: string | null) => {
      if (
        !activeCompanyId ||
        !eventId ||
        typeof eventId !== "string" ||
        eventId.trim() === ""
      ) {
        setRatings([]);
        return;
      }

      setIsLoading(true);
      try {
        const supabase = createClient();

        // 企業に対する評価を取得（candidatesテーブルへのJOINはRLSでブロックされる可能性があるため、別途取得）
        const { data: ratingsData, error: ratingsError } = await supabase
          .from("event_ratings_candidate_to_company")
          .select("*")
          .eq("company_id", activeCompanyId)
          .eq("event_id", eventId);

        if (ratingsError) {
          console.error("評価取得エラー:", ratingsError);
          console.error("エラー詳細:", {
            code: ratingsError.code,
            message: ratingsError.message,
            details: ratingsError.details,
            hint: ratingsError.hint,
          });
          setRatings([]);
          return;
        }

        if (!ratingsData || ratingsData.length === 0) {
          setRatings([]);
          setIsLoading(false);
          return;
        }

        // 学生IDを収集
        type RatingItem = { candidate_id: string };
        const candidateIds = Array.from(
          new Set(ratingsData.map((r: RatingItem) => r.candidate_id))
        );

        // 席番号を取得
        const { data: reservations, error: reservationsError } = await supabase
          .from("event_reservations")
          .select("candidate_id, seat_number")
          .eq("event_id", eventId)
          .in("candidate_id", candidateIds)
          .eq("attended", true);

        if (reservationsError) {
          console.error("席番号取得エラー:", reservationsError);
          // エラーでも続行
        }

        // 席番号マップを作成
        const seatNumberMap = new Map<string, string | null>();
        type ReservationItem = {
          candidate_id: string;
          seat_number: string | null;
        };
        (reservations || []).forEach((r: ReservationItem) => {
          if (!seatNumberMap.has(r.candidate_id)) {
            seatNumberMap.set(r.candidate_id, r.seat_number || null);
          }
        });

        // 学生情報を個別に取得（名前は profiles から）
        const { data: candidatesData, error: candidatesError } = await supabase
          .from("candidates")
          .select("id, profiles!profiles_candidate_id_fkey(last_name, first_name, last_name_kana, first_name_kana)")
          .in("id", candidateIds);

        if (candidatesError) {
          console.error("学生情報取得エラー:", candidatesError);
          console.error("エラー詳細:", {
            code: candidatesError.code,
            message: candidatesError.message,
            details: candidatesError.details,
            hint: candidatesError.hint,
          });
          // エラーでも評価データは表示する（学生名は「-」になる）
        }

        // 学生情報のマップを作成（profiles からフラット化）
        type ProfileItem = {
          last_name: string;
          first_name: string;
          last_name_kana: string;
          first_name_kana: string;
        };
        type CandidateItem = {
          id: string;
          last_name: string;
          first_name: string;
          last_name_kana: string;
          first_name_kana: string;
        };
        const candidatesMap = new Map(
          (candidatesData || []).map((c: { id: string; profiles: ProfileItem | ProfileItem[] | null }) => {
            const p = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
            return [c.id, {
              id: c.id,
              last_name: p?.last_name || "",
              first_name: p?.first_name || "",
              last_name_kana: p?.last_name_kana || "",
              first_name_kana: p?.first_name_kana || "",
            } as CandidateItem];
          })
        );

        // イベント情報を取得
        const event = events.find((e) => e.id === eventId);

        // データを整形
        type RatingDataItem =
          Database["public"]["Tables"]["event_ratings_candidate_to_company"]["Row"];
        const formattedRatings: CandidateRating[] = ratingsData
          .map((item: RatingDataItem) => {
            const candidate = candidatesMap.get(item.candidate_id);
            const seatNumber = seatNumberMap.get(item.candidate_id) || null;
            return {
              id: item.id,
              candidate_id: item.candidate_id,
              candidate_name: candidate
                ? `${candidate.last_name} ${candidate.first_name}`
                : "-",
              candidate_kana: candidate
                ? `${candidate.last_name_kana} ${candidate.first_name_kana}`
                : "-",
              seat_number: seatNumber,
              company_id: item.company_id,
              name: "", // 自社なので表示不要
              event_id: item.event_id,
              event_name: event ? formatEventDisplay(event) : "-",
              rating: item.rating,
              comment: item.comment,
            };
          })
          .sort((a, b) => {
            // 席番号でソート（アルファベット順）
            if (a.seat_number && b.seat_number) {
              return a.seat_number.localeCompare(b.seat_number);
            }
            if (a.seat_number) return -1;
            if (b.seat_number) return 1;
            // 席番号がない場合はフリガナでソート
            return a.candidate_kana.localeCompare(b.candidate_kana);
          });

        setRatings(formattedRatings);
      } catch (error) {
        console.error("予期しないエラー:", error);
        setRatings([]);
      } finally {
        setIsLoading(false);
      }
    },
    [activeCompanyId, events]
  );

  // 管理者の場合、企業一覧を取得
  useEffect(() => {
    if (isAdmin) {
      fetchCompanies();
    }
  }, [isAdmin, fetchCompanies]);

  // 企業IDが変更されたらイベントを取得
  useEffect(() => {
    if (isLoggedIn && activeCompanyId) {
      fetchEvents();
    }
  }, [isLoggedIn, activeCompanyId, fetchEvents]);

  useEffect(() => {
    if (
      selectedEventId &&
      typeof selectedEventId === "string" &&
      selectedEventId.trim() !== ""
    ) {
      fetchRatings(selectedEventId);
      setSelectedRating(null); // イベント変更時にフィルターをリセット
    } else {
      setRatings([]);
      setSelectedRating(null);
    }
  }, [selectedEventId, fetchRatings]);

  // フィルターされた評価データ
  const filteredRatings = useMemo(() => {
    if (selectedRating === null) {
      return ratings;
    }
    return ratings.filter((r) => r.rating === selectedRating);
  }, [ratings, selectedRating]);

  const headers: {
    label: string;
    key: keyof CandidateRating;
    renderCell?: (value: unknown, row: CandidateRating) => React.ReactNode;
  }[] = [
    {
      label: "席番号",
      key: "seat_number",
      renderCell: (value) => (
        <div className="text-sm font-semibold">
          {(value as string | null) || "-"}
        </div>
      ),
    },
    {
      label: "学生名",
      key: "candidate_name",
      renderCell: (value, row) => (
        <div>
          <div className="text-xs text-gray-500 leading-tight mb-0.5">
            {row.candidate_kana || "-"}
          </div>
          <div className="text-sm">{(value as string | null) || "-"}</div>
        </div>
      ),
    },
    {
      label: "評価",
      key: "rating",
      renderCell: (value) => (
        <div>
          {value ? (
            <StarRating
              rating={typeof value === "number" ? value : Number(value)}
              readOnly
            />
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      label: "コメント",
      key: "comment",
      renderCell: (value) => (
        <div className="text-xs text-gray-700 max-w-[300px] whitespace-pre-wrap break-words">
          {(value as string | null) || "-"}
        </div>
      ),
    },
  ];

  const companyOptions = allCompanies.map((company) => ({
    value: company.id,
    label: company.name,
  }));

  // 評価数の集計データを計算
  const ratingStats = useMemo(() => {
    if (ratings.length === 0) {
      return {
        distribution: [
          { rating: "1", count: 0 },
          { rating: "2", count: 0 },
          { rating: "3", count: 0 },
          { rating: "4", count: 0 },
          { rating: "5", count: 0 },
        ],
        average: 0,
        total: 0,
      };
    }

    const validRatings = ratings.filter((r) => r.rating !== null) as Array<
      CandidateRating & { rating: number }
    >;

    // 評価の分布を計算
    const distribution = [1, 2, 3, 4, 5].map((rating) => ({
      rating: String(rating),
      count: validRatings.filter((r) => r.rating === rating).length,
    }));

    // 平均値を計算
    const sum = validRatings.reduce((acc, r) => acc + r.rating, 0);
    const average = validRatings.length > 0 ? sum / validRatings.length : 0;

    return {
      distribution,
      average: Math.round(average * 10) / 10, // 小数点第1位まで
      total: validRatings.length,
    };
  }, [ratings]);

  if (!isLoggedIn) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">学生からの評価</h2>
        <p className="text-gray-600">ログインしてください。</p>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-semibold">学生からの評価</h2>
        {isAdmin && (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
            管理者プレビュー
          </span>
        )}
      </div>

      {selectedEventId && events.find((e) => e.id === selectedEventId) && (
        <div className="mb-4 text-sm text-gray-600">
          {formatEventDisplay(events.find((e) => e.id === selectedEventId)!)}
        </div>
      )}

      {/* 管理者の場合、企業選択 */}
      {isAdmin && (
        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-lg">
          <div className="text-xs font-bold text-red-600 mb-2">
            管理者プレビューモード
          </div>
          <FormField label="企業">
            <SelectInput
              name="company"
              value={selectedCompanyId}
              onChange={(e) => {
                setSelectedCompanyId(e.target.value);
                setSelectedEventId(""); // 企業変更時はイベント選択をリセット
                setRatings([]); // 評価もリセット
              }}
              options={companyOptions}
              placeholder="企業を選択"
              disabled={isLoading}
            />
          </FormField>
        </div>
      )}

      {!activeCompanyId && isAdmin && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-700">
          <p className="font-medium mb-1">企業が選択されていません</p>
          <p className="text-sm">
            企業を選択すると、その企業が参加しているイベントが表示されます。
          </p>
        </div>
      )}

      {!selectedEventId && activeCompanyId && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-700">
          <p className="font-medium mb-1">イベントが選択されていません</p>
          <p className="text-sm">
            サイドバーから「イベント選択」を選択して、イベントを選択してください。
          </p>
        </div>
      )}

      {/* 評価統計情報 */}
      {selectedEventId && ratings.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">評価統計</h3>
              {selectedRating !== null && (
                <button
                  onClick={() => setSelectedRating(null)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  フィルター解除
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white p-3 rounded border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">総評価数</div>
                <div className="text-2xl font-bold text-gray-900">
                  {ratingStats.total}
                  <span className="text-base text-gray-500 font-normal ml-1">
                    件
                  </span>
                </div>
              </div>
              <div className="bg-white p-3 rounded border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">平均評価</div>
                <div className="text-2xl font-bold text-gray-900">
                  {ratingStats.average.toFixed(1)}
                  <span className="text-base text-gray-500">/ 5.0</span>
                </div>
              </div>
            </div>
          </div>

          {/* 評価分布グラフ */}
          <div className="bg-white p-4 rounded border border-gray-200">
            <h4 className="text-base font-semibold mb-4">評価分布</h4>
            <div className="[&_*]:focus:outline-none [&_*]:focus-visible:outline-none overflow-hidden">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={ratingStats.distribution}
                  margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="rating"
                    label={{
                      value: "評価",
                      position: "insideBottom",
                      offset: -5,
                    }}
                  />
                  <YAxis
                    label={{
                      value: "人数",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#3b82f6"
                    name="人数"
                    radius={[8, 8, 0, 0]}
                    label={{
                      position: "top",
                      formatter: (value: unknown) =>
                        `${
                          typeof value === "number" ? value : Number(value)
                        }人`,
                    }}
                    onClick={(data: unknown) => {
                      const ratingData = data as {
                        payload?: { rating: string };
                      };
                      if (ratingData.payload?.rating) {
                        const rating = parseInt(ratingData.payload.rating);
                        setSelectedRating(
                          selectedRating === rating ? null : rating
                        );
                      }
                    }}
                    onMouseEnter={(data: unknown) => {
                      const ratingData = data as {
                        payload?: { rating: string };
                      };
                      if (ratingData.payload?.rating) {
                        const rating = parseInt(ratingData.payload.rating);
                        setHoveredRating(rating);
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredRating(null);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {ratingStats.distribution.map((entry, index) => {
                      const rating = parseInt(entry.rating);
                      const isSelected = selectedRating === rating;
                      const isHovered = hoveredRating === rating;
                      let fillColor = "#3b82f6";
                      if (isSelected) {
                        fillColor = "#2563eb";
                      } else if (isHovered) {
                        fillColor = "#2563eb";
                      }
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={fillColor}
                          style={{
                            transition: "fill 0.2s",
                          }}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <Table
        variant="ipad"
        headers={headers}
        data={filteredRatings}
        isLoading={isLoading}
      />

      {!isLoading && selectedEventId && ratings.length === 0 && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-600 text-center">
          このイベントに対する評価はまだありません。
        </div>
      )}

      {!isLoading &&
        selectedEventId &&
        ratings.length > 0 &&
        filteredRatings.length === 0 && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-600 text-center">
            選択した評価のデータはありません。
          </div>
        )}
    </div>
  );
}

export default RecruiterFeedbackPageClient;
