"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveSession, rejectSession } from "@/lib/actions/session-actions";
import type { Tables } from "@jobtv-app/shared/types";

type SessionTable = Tables<"sessions">;

interface Session extends SessionTable {
  companies?: {
    id: string;
    name: string;
  };
}

interface SessionsListProps {
  sessions: Session[];
}

export function SessionsList({ sessions }: SessionsListProps) {
  const [processing, setProcessing] = useState<string | null>(null);
  const router = useRouter();

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "closed":
        return "secondary";
      case "pending":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "公開中";
      case "closed":
        return "終了";
      case "pending":
        return "審査中";
      default:
        return status;
    }
  };

  const handleApprove = async (sessionId: string) => {
    setProcessing(sessionId);
    const { error } = await approveSession(sessionId);
    if (error) {
      alert(`承認に失敗しました: ${error}`);
    } else {
      router.refresh();
    }
    setProcessing(null);
  };

  const handleReject = async (sessionId: string) => {
    if (!confirm("この説明会を却下しますか？")) {
      return;
    }
    setProcessing(sessionId);
    const { error } = await rejectSession(sessionId);
    if (error) {
      alert(`却下に失敗しました: ${error}`);
    } else {
      router.refresh();
    }
    setProcessing(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>説明会一覧</CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length > 0 ? (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{session.title}</p>
                    <Badge variant={getStatusBadgeVariant(session.status)}>
                      {getStatusLabel(session.status)}
                    </Badge>
                  </div>
                  {session.companies && (
                    <p className="text-sm text-muted-foreground">
                      企業: {session.companies.name}
                    </p>
                  )}
                  {session.type && (
                    <p className="text-sm text-muted-foreground">
                      種類: {session.type}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {(session.status as unknown as string) === "pending" && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(session.id)}
                        disabled={processing === session.id}
                      >
                        <Check className="mr-1 h-3 w-3" />
                        承認
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(session.id)}
                        disabled={processing === session.id}
                      >
                        <X className="mr-1 h-3 w-3" />
                        却下
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              登録されている説明会がありません
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

