"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Plus, Check, X } from "lucide-react";
import Link from "next/link";
import { JobForm } from "@/components/job-form";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveJob, rejectJob } from "@/lib/actions/job-actions";
import type { Tables } from "@jobtv-app/shared/types";

type JobPosting = Tables<"job_postings">;

interface Job extends JobPosting {
  companies?: {
    name: string;
  };
}

interface JobsListProps {
  jobs: Job[];
}

export function JobsList({ jobs }: JobsListProps) {
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const router = useRouter();

  const handleSuccess = () => {
    setOpen(false);
    router.refresh();
  };

  const handleApprove = async (jobId: string) => {
    setProcessing(jobId);
    const { error } = await approveJob(jobId);
    if (error) {
      alert(`承認に失敗しました: ${error}`);
    } else {
      router.refresh();
    }
    setProcessing(null);
  };

  const handleReject = async (jobId: string) => {
    if (!confirm("この求人を却下しますか？")) {
      return;
    }
    setProcessing(jobId);
    const { error } = await rejectJob(jobId);
    if (error) {
      alert(`却下に失敗しました: ${error}`);
    } else {
      router.refresh();
    }
    setProcessing(null);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "closed":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "募集中";
      case "closed":
        return "募集終了";
      case "pending":
        return "審査中";
      default:
        return status;
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新規登録
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新規求人登録</DialogTitle>
              <DialogDescription>新しい求人を登録します</DialogDescription>
            </DialogHeader>
            <JobForm onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>求人一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{job.title}</p>
                      <Badge variant={getStatusBadgeVariant(job.status)}>
                        {getStatusLabel(job.status)}
                      </Badge>
                    </div>
                    {job.companies && (
                      <p className="text-sm text-muted-foreground">
                        企業: {job.companies.name}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      卒業年: {job.graduation_year}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.status === "pending" && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApprove(job.id)}
                          disabled={processing === job.id}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          承認
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleReject(job.id)}
                          disabled={processing === job.id}
                        >
                          <X className="mr-1 h-3 w-3" />
                          却下
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/jobs/${job.id}`}>詳細</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                登録されている求人がありません
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    最初の求人を登録
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>新規求人登録</DialogTitle>
                    <DialogDescription>
                      新しい求人を登録します
                    </DialogDescription>
                  </DialogHeader>
                  <JobForm onSuccess={handleSuccess} />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
