"use client";

import { useState } from "react";
import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils";
import type { Tables } from "@jobtv-app/shared/types";

interface InterviewNoteFormProps {
  candidateId: string;
  noteId?: string;
  initialData?: {
    interview_date: string;
    notes?: string | null;
    interviewer_id?: string | null;
  };
  onSuccess?: () => void;
  onFormChange?: (data: {
    interview_date: string;
    notes: string;
    interviewer_id: string;
  }) => void;
  className?: string;
}

type AdminUser = Pick<Tables<"profiles">, "id" | "email" | "first_name" | "last_name">;

export function InterviewNoteForm({
  candidateId,
  noteId,
  initialData,
  onSuccess,
  onFormChange,
  className,
}: InterviewNoteFormProps) {
  const [interviewDate, setInterviewDate] = useState(
    initialData?.interview_date
      ? new Date(initialData.interview_date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [interviewerId, setInterviewerId] = useState<string>(
    initialData?.interviewer_id || "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = !!noteId;

  // 管理者アカウントのリストと現在のユーザーIDを取得
  React.useEffect(() => {
    async function fetchAdminUsers() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setCurrentUserId(user.id);
        // デフォルトで現在のユーザーを選択
        if (!initialData?.interviewer_id) {
          setInterviewerId(user.id);
        }
      }

      // 管理者とリクルーターのリストを取得
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .in("role", ["admin", "RA", "CA", "MRK"])
        .order("last_name")
        .order("first_name")
        .order("email");

      if (profiles) {
        setAdminUsers(profiles);
      }
    }
    fetchAdminUsers();
  }, [initialData?.interviewer_id]);

  // initialDataが変更されたときに状態を更新（編集モードでない場合のみ）
  React.useEffect(() => {
    if (initialData && !isEditMode) {
      const newDate = initialData.interview_date
        ? new Date(initialData.interview_date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      const newNotes = initialData.notes || "";
      const newInterviewerId =
        initialData.interviewer_id || currentUserId || "";

      // 現在の値と異なる場合のみ更新（無限ループを防ぐ）
      setInterviewDate((prev) => (prev !== newDate ? newDate : prev));
      setNotes((prev) => (prev !== newNotes ? newNotes : prev));
      setInterviewerId((prev) =>
        prev !== newInterviewerId ? newInterviewerId : prev,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialData?.interview_date,
    initialData?.notes,
    initialData?.interviewer_id,
    isEditMode,
    currentUserId,
  ]);

  // フォームの値変更ハンドラー
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setInterviewDate(newDate);
    if (onFormChange && !isEditMode) {
      onFormChange({
        interview_date: newDate,
        notes: notes,
        interviewer_id: interviewerId,
      });
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    if (onFormChange && !isEditMode) {
      onFormChange({
        interview_date: interviewDate,
        notes: newNotes,
        interviewer_id: interviewerId,
      });
    }
  };

  const handleInterviewerChange = (value: string) => {
    setInterviewerId(value);
    if (onFormChange && !isEditMode) {
      onFormChange({
        interview_date: interviewDate,
        notes: notes,
        interviewer_id: value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // 現在のユーザーIDを取得
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("ログインが必要です");
      }

      // バリデーション
      if (!interviewDate) {
        throw new Error("面談実施日は必須です");
      }
      if (!interviewerId) {
        throw new Error("面談実施者は必須です");
      }

      if (isEditMode && noteId) {
        // 更新
        const { error: updateError } = await supabase
          .from("interview_notes")
          .update({
            interview_date: interviewDate,
            notes: notes || null,
            interviewer_id: interviewerId || null,
            updated_by: user.id,
          })
          .eq("id", noteId);

        if (updateError) {
          console.error("Update error:", updateError);
          throw new Error(
            `更新エラー: ${updateError.message} (${
              updateError.code || "unknown"
            })`,
          );
        }
      } else {
        // 新規作成
        const { error: insertError } = await supabase
          .from("interview_notes")
          .insert([
            {
              candidate_id: candidateId,
              interview_date: interviewDate,
              notes: notes || null,
              interviewer_id: interviewerId || null,
              created_by: user.id,
            },
          ]);

        if (insertError) {
          console.error("Insert error:", insertError);
          throw new Error(
            `登録エラー: ${insertError.message} (${
              insertError.code || "unknown"
            })`,
          );
        }

        // フォームをリセット（新規作成時のみ）
        setInterviewDate(new Date().toISOString().split("T")[0]);
        setNotes("");
        setInterviewerId(currentUserId || "");
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: unknown) {
      console.error("Form error:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("エラーが発生しました: " + String(error));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-4", className)}
    >
      <div className="grid gap-2">
        <Label htmlFor="interview_date">
          面談実施日 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="interview_date"
          type="date"
          required
          value={interviewDate}
          onChange={handleDateChange}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="interviewer_id">
          面談実施者 <span className="text-red-500">*</span>
        </Label>
        <Select
          value={interviewerId}
          onValueChange={handleInterviewerChange}
          required
        >
          <SelectTrigger id="interviewer_id">
            <SelectValue placeholder="面談実施者を選択" />
          </SelectTrigger>
          <SelectContent>
            {adminUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.last_name && user.first_name
                  ? `${user.last_name} ${user.first_name}`
                  : user.email || "不明"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">メモ</Label>
        <Textarea
          id="notes"
          placeholder="面談の内容や所感を記録してください"
          value={notes}
          onChange={handleNotesChange}
          rows={5}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading
            ? isEditMode
              ? "更新中..."
              : "登録中..."
            : isEditMode
            ? "更新"
            : "登録"}
        </Button>
      </div>
    </form>
  );
}
