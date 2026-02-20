"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, MapPin, User } from "lucide-react";
import type { ProgressItemWithRelations } from "@jobtv-app/shared/types";

type ProgressHistoryItem = ProgressItemWithRelations;

interface ApplicationProgressSectionProps {
  applicationId: string;
  progressHistory: ProgressHistoryItem[];
}

export function ApplicationProgressSection({
  progressHistory,
}: ApplicationProgressSectionProps) {
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      applied: "応募済み",
      document_screening: "書類選考",
      first_interview: "一次面接",
      second_interview: "二次面接",
      final_interview: "最終面接",
      offer: "内定",
      rejected: "不採用",
      withdrawn: "辞退",
    };
    return statusMap[status] || status;
  };

  const getStatusBadgeVariant = (status: string) => {
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            進捗履歴
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {progressHistory.length > 0 ? (
          <div className="space-y-4">
            {progressHistory.map((progress) => (
              <div
                key={progress.id}
                className="border-l-2 border-border pl-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(progress.status)}>
                    {getStatusLabel(progress.status)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(progress.status_date).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                {progress.interview_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      面接日時:{" "}
                      {new Date(progress.interview_date).toLocaleString(
                        "ja-JP",
                      )}
                    </span>
                  </div>
                )}
                {progress.interview_location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>場所: {progress.interview_location}</span>
                  </div>
                )}
                {progress.notes && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {progress.notes}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    記録日時:{" "}
                    {new Date(progress.created_at).toLocaleString("ja-JP")}
                  </span>
                  {progress.profiles && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      操作者:{" "}
                      {progress.profiles.last_name && progress.profiles.first_name
                        ? `${progress.profiles.last_name} ${progress.profiles.first_name}`
                        : progress.profiles.email || "不明"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              進捗履歴がありません
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
