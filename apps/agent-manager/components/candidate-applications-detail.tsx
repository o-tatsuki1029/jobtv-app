"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getCandidateApplicationsDetail } from "@/lib/actions/candidate-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FileText,
  Briefcase,
  Building2,
  User,
  MessageSquare,
  Calendar,
  Edit,
  Clock,
} from "lucide-react";
import { InterviewNoteForm } from "@/components/interview-note-form";
import { ProgressNotesEditForm } from "@/components/progress-notes-edit-form";
import type {
  Profile,
  ApplicationWithRelations,
  ProgressItemWithRelations,
  InterviewNoteWithRelations,
} from "@jobtv-app/shared/types";

interface CandidateApplicationsDetailProps {
  candidateId: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "管理者",
  RA: "RA",
  CA: "CA",
  MRK: "MRK",
};

type Application = ApplicationWithRelations;

interface ProgressItem extends ProgressItemWithRelations {
  isLatest?: boolean;
}

type InterviewNote = InterviewNoteWithRelations;

type TimelineItem =
  | (ProgressItem & {
      type: "progress";
      sortDate: number;
      sortUpdatedAt: number;
    })
  | (InterviewNote & { sortDate: number; sortUpdatedAt: number });

// ステータス関連のユーティリティ関数
const STATUS_LABELS: Record<string, string> = {
  applied: "応募済み",
  document_screening: "書類選考",
  first_interview: "一次面接",
  second_interview: "二次面接",
  final_interview: "最終面接",
  offer: "内定",
  rejected: "不採用",
  withdrawn: "辞退",
};

const getStatusLabel = (status: string): string => {
  return STATUS_LABELS[status] || status;
};

const getStatusBadgeVariant = (
  status: string,
): "default" | "secondary" | "outline" => {
  switch (status) {
    case "offer":
      return "default";
    case "rejected":
    case "withdrawn":
      return "secondary";
    default:
      return "outline";
  }
};

// タイムラインアイテムの共通ラッパーコンポーネント
function TimelineItemCard({
  id,
  isExpanded,
  onExpandChange,
  triggerContent,
  content,
  cardKey,
}: {
  id: string;
  isExpanded: boolean;
  onExpandChange: (id: string | undefined) => void;
  triggerContent: React.ReactNode;
  content: React.ReactNode;
  cardKey: string;
}) {
  return (
    <Card
      key={cardKey}
      className="shadow-none transition-all duration-200 hover:shadow-md hover:bg-accent/20"
    >
      <CardContent className="p-0">
        <Accordion
          type="single"
          collapsible
          value={isExpanded ? id : ""}
          onValueChange={(value) =>
            onExpandChange(value === id ? id : undefined)
          }
        >
          <AccordionItem value={id} className="border-0">
            <AccordionTrigger className="hover:no-underline px-4 py-4">
              {triggerContent}
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4">{content}</div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

// メタ情報表示コンポーネント（アコーディオンのトリガー内）
function MetaInfoHeader({
  profiles,
  created_at,
}: {
  profiles: Profile | null | undefined;
  created_at?: string;
}) {
  if (!profiles && !created_at) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
      {profiles && (
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          記録者: {profiles.last_name && profiles.first_name
            ? `${profiles.last_name} ${profiles.first_name}`
            : profiles.email || "不明"}
          {profiles.role && (
            <span className="text-muted-foreground">
              ({ROLE_LABELS[profiles.role] || profiles.role})
            </span>
          )}
        </span>
      )}
      {created_at && (
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          作成日時: {new Date(created_at).toLocaleString("ja-JP")}
        </span>
      )}
    </div>
  );
}

// メタ情報表示コンポーネント（最終編集情報）
function MetaInfoFooter({
  profiles,
  created_at,
  updated_at,
  updatedByProfile,
}: {
  profiles: Profile | null | undefined;
  created_at?: string;
  updated_at?: string | null;
  updatedByProfile?: Profile | null;
}) {
  const hasUpdate = updated_at && created_at && updated_at !== created_at;

  // 更新されていない場合は作成日時と同じ値として表示
  const displayUpdatedAt = hasUpdate ? updated_at : created_at;
  const displayUpdatedBy = hasUpdate ? updatedByProfile : profiles;

  if (!displayUpdatedAt && !displayUpdatedBy) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
      {displayUpdatedBy && (
        <span className="flex items-center gap-1">
          <Edit className="h-3 w-3" />
          最終編集者:{" "}
          {displayUpdatedBy.last_name && displayUpdatedBy.first_name
            ? `${displayUpdatedBy.last_name} ${displayUpdatedBy.first_name}`
            : displayUpdatedBy.email || "不明"}
          {displayUpdatedBy.role && (
            <span className="text-muted-foreground">
              ({ROLE_LABELS[displayUpdatedBy.role] || displayUpdatedBy.role})
            </span>
          )}
        </span>
      )}
      {displayUpdatedAt && (
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          最終編集日時: {new Date(displayUpdatedAt).toLocaleString("ja-JP")}
        </span>
      )}
    </div>
  );
}

// 求人情報表示コンポーネント
function JobInfo({
  jobPostings,
}: {
  jobPostings: Application["job_postings"];
}) {
  if (!jobPostings) return null;

  return (
    <>
      <span className="text-sm text-muted-foreground">|</span>
      <div className="flex items-center gap-1">
        <Briefcase className="h-3 w-3 text-muted-foreground" />
        <span className="text-sm font-medium">{jobPostings.title}</span>
      </div>
      {jobPostings.companies && (
        <>
          <span className="text-sm text-muted-foreground">-</span>
          <div className="flex items-center gap-1">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {jobPostings.companies.name}
            </span>
          </div>
        </>
      )}
    </>
  );
}

// 面談記録アイテムコンポーネント
function InterviewNoteItem({
  item,
  candidateId,
  isExpanded,
  onExpandChange,
  onUpdate,
}: {
  item: InterviewNote;
  candidateId: string;
  isExpanded: boolean;
  onExpandChange: (id: string | undefined) => void;
  onUpdate: () => void;
}) {
  const triggerContent = (
    <div className="flex-1 space-y-3 text-left">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="bg-primary/10">
          <MessageSquare className="h-3 w-3 mr-1" />
          面談記録
        </Badge>
        <span className="text-sm text-muted-foreground">
          {new Date(item.interview_date).toLocaleDateString("ja-JP")}
        </span>
        {(item.interviewerProfile || item.profiles) && (
          <>
            <span className="text-sm text-muted-foreground">|</span>
            <span className="text-sm text-muted-foreground">
              実施者:{" "}
              {item.interviewerProfile
                ? item.interviewerProfile.last_name && item.interviewerProfile.first_name
                  ? `${item.interviewerProfile.last_name} ${item.interviewerProfile.first_name}`
                  : item.interviewerProfile.email || "不明"
                : item.profiles
                ? item.profiles.last_name && item.profiles.first_name
                  ? `${item.profiles.last_name} ${item.profiles.first_name}`
                  : item.profiles.email || "不明"
                : "不明"}
              {item.interviewerProfile?.role && (
                <span className="ml-1">
                  (
                  {ROLE_LABELS[item.interviewerProfile.role] ||
                    item.interviewerProfile.role}
                  )
                </span>
              )}
              {!item.interviewerProfile?.role && item.profiles?.role && (
                <span className="ml-1">
                  ({ROLE_LABELS[item.profiles.role] || item.profiles.role})
                </span>
              )}
            </span>
          </>
        )}
      </div>
      {item.notes && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {item.notes}
        </p>
      )}
      <MetaInfoFooter
        profiles={item.profiles}
        created_at={item.created_at}
        updated_at={item.updated_at}
        updatedByProfile={item.updatedByProfile}
      />
    </div>
  );

  const content = (
    <>
      <MetaInfoHeader profiles={item.profiles} created_at={item.created_at} />
      <InterviewNoteForm
        candidateId={candidateId}
        noteId={item.id}
        initialData={{
          interview_date: item.interview_date,
          notes: item.notes,
          interviewer_id: item.interviewer_id || null,
        }}
        onSuccess={() => {
          onExpandChange(undefined);
          onUpdate();
        }}
      />
    </>
  );

  return (
    <TimelineItemCard
      id={item.id}
      isExpanded={isExpanded}
      onExpandChange={onExpandChange}
      triggerContent={triggerContent}
      content={content}
      cardKey={`note-${item.id}`}
    />
  );
}

// 進捗履歴アイテムコンポーネント
function ProgressItem({
  item,
  isExpanded,
  onExpandChange,
  onUpdate,
  getStatusLabel,
  getStatusBadgeVariant,
}: {
  item: ProgressItem;
  isExpanded: boolean;
  onExpandChange: (id: string | undefined) => void;
  onUpdate: () => void;
  getStatusLabel: (status: string) => string;
  getStatusBadgeVariant: (
    status: string,
  ) => "default" | "secondary" | "outline";
}) {
  const triggerContent = (
    <div className="flex-1 space-y-3 text-left">
      <div className="flex items-center gap-2 flex-wrap">
        {item.previous_status ? (
          <>
            <Badge variant="outline" className="bg-muted">
              {getStatusLabel(item.previous_status)}
            </Badge>
            <span className="text-sm text-muted-foreground">→</span>
            <Badge variant={getStatusBadgeVariant(item.status)}>
              {getStatusLabel(item.status)}
            </Badge>
          </>
        ) : (
          <Badge variant={getStatusBadgeVariant(item.status)}>
            {getStatusLabel(item.status)}
          </Badge>
        )}
        <span className="text-sm text-muted-foreground">
          {new Date(item.status_date).toLocaleDateString("ja-JP")}
        </span>
        <JobInfo jobPostings={item.application.job_postings} />
      </div>
      {item.notes ? (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {item.notes}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground italic">メモなし</p>
      )}
      <MetaInfoFooter
        profiles={item.profiles}
        created_at={item.created_at}
        updated_at={item.updated_at}
        updatedByProfile={item.updatedByProfile}
      />
    </div>
  );

  const content = (
    <>
      <MetaInfoHeader profiles={item.profiles} created_at={item.created_at} />
      <ProgressNotesEditForm
        progressId={item.id}
        initialNotes={item.notes}
        initialStatusDate={item.status_date}
        onSuccess={() => {
          onExpandChange(undefined);
          onUpdate();
        }}
      />
    </>
  );

  return (
    <TimelineItemCard
      id={item.id}
      isExpanded={isExpanded}
      onExpandChange={onExpandChange}
      triggerContent={triggerContent}
      content={content}
      cardKey={`progress-${item.id}`}
    />
  );
}

export function CandidateApplicationsDetail({
  candidateId,
}: CandidateApplicationsDetailProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [allProgressItems, setAllProgressItems] = useState<ProgressItem[]>([]);
  const [interviewNotes, setInterviewNotes] = useState<InterviewNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNoteId, setExpandedNoteId] = useState<string | undefined>(
    undefined,
  );
  const [expandedProgressId, setExpandedProgressId] = useState<
    string | undefined
  >(undefined);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await getCandidateApplicationsDetail(candidateId);

      if (error || !data) {
        console.error("Error fetching candidate applications detail:", error);
        setLoading(false);
        return;
      }

      setApplications(data.applications as Application[]);
      setAllProgressItems(data.progressItems as ProgressItem[]);
      setInterviewNotes(data.interviewNotes as InterviewNote[]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleUpdate = () => fetchData();
    window.addEventListener("applicationProgressUpdated", handleUpdate);
    return () => {
      window.removeEventListener("applicationProgressUpdated", handleUpdate);
    };
  }, [fetchData]);

  // 最新進捗履歴IDを計算
  const latestProgressIds = useMemo(() => {
    const progressByApplication = new Map<string, ProgressItem[]>();
    allProgressItems.forEach((item) => {
      if (!progressByApplication.has(item.application_id)) {
        progressByApplication.set(item.application_id, []);
      }
      progressByApplication.get(item.application_id)!.push(item);
    });

    const latestIds = new Set<string>();
    progressByApplication.forEach((items) => {
      const sorted = [...items].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      if (sorted.length > 0) {
        latestIds.add(sorted[0].id);
      }
    });
    return latestIds;
  }, [allProgressItems]);

  // タイムラインアイテムを統合・ソート
  const allTimelineItems = useMemo<TimelineItem[]>(() => {
    const items = [
      ...allProgressItems.map((item) => ({
        ...item,
        type: "progress" as const,
        sortDate: new Date(item.status_date).getTime(),
        sortUpdatedAt: item.updated_at
          ? new Date(item.updated_at).getTime()
          : new Date(item.created_at).getTime(),
        isLatest: latestProgressIds.has(item.id),
      })),
      ...interviewNotes.map((note) => ({
        ...note,
        sortDate: new Date(note.interview_date).getTime(),
        sortUpdatedAt: note.updated_at
          ? new Date(note.updated_at).getTime()
          : new Date(note.created_at).getTime(),
      })),
    ];
    // 日付降順、同じ日付の場合は最終更新日時降順でソート
    return items.sort((a, b) => {
      if (a.sortDate !== b.sortDate) {
        return b.sortDate - a.sortDate;
      }
      return b.sortUpdatedAt - a.sortUpdatedAt;
    });
  }, [allProgressItems, interviewNotes, latestProgressIds]);

  // フィルタリング
  const filteredTimelineItems = useMemo(() => {
    return allTimelineItems.filter((item) => {
      if (filterType === "all") return true;
      if (filterType === "notes") return item.type === "interview_note";
      return item.type === "progress" && item.application_id === filterType;
    });
  }, [allTimelineItems, filterType]);

  const handleNoteExpandChange = useCallback((id: string | undefined) => {
    setExpandedNoteId(id);
  }, []);

  const handleProgressExpandChange = useCallback((id: string | undefined) => {
    setExpandedProgressId(id);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getEmptyMessage = () => {
    if (filterType === "all") return "進捗履歴と面談記録がありません";
    if (filterType === "notes") return "面談記録がありません";
    return "この求人の進捗履歴がありません";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-4 w-4" />
            進捗履歴タイムライン
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="mb-4">
            <Label htmlFor="filter-type">絞り込み</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger id="filter-type" className="mt-2">
                <SelectValue placeholder="すべて" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="notes">面談記録</SelectItem>
                {applications.map((application) => (
                  <SelectItem key={application.id} value={application.id}>
                    {application.job_postings?.title || "不明"} -{" "}
                    {application.job_postings?.companies?.name || ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {filteredTimelineItems.length > 0 ? (
            <div className="space-y-4">
              {filteredTimelineItems.map((item) => {
                if (item.type === "interview_note") {
                  return (
                    <InterviewNoteItem
                      key={`note-${item.id}`}
                      item={item}
                      candidateId={candidateId}
                      isExpanded={expandedNoteId === item.id}
                      onExpandChange={handleNoteExpandChange}
                      onUpdate={fetchData}
                    />
                  );
                } else {
                  return (
                    <ProgressItem
                      key={`progress-${item.id}`}
                      item={item}
                      isExpanded={expandedProgressId === item.id}
                      onExpandChange={handleProgressExpandChange}
                      onUpdate={fetchData}
                      getStatusLabel={getStatusLabel}
                      getStatusBadgeVariant={getStatusBadgeVariant}
                    />
                  );
                }
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                {getEmptyMessage()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
