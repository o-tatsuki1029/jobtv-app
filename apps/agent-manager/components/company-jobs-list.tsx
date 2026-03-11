"use client";

import {
  getApplicationStatusLabel,
  getApplicationStatusBadgeVariant,
  getJobStatusLabel,
} from "@/utils/status";
import {
  getCandidateDisplayName,
  getCandidateDisplayKana,
} from "@/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Plus, FileText } from "lucide-react";
import { JobForm } from "@/components/job-form";
import { JobDetailModal } from "@/components/job-detail-modal";
import { CompanyForm } from "@/components/company-form";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getJobWithStatuses,
  getJobApplications,
  getMultipleJobApplications,
} from "@/lib/actions/job-actions";
import type { Tables } from "@jobtv-app/shared/types";

type Job = Tables<"job_postings">;
type Company = Tables<"companies">;
type ApplicationRow = Tables<"applications">;

interface CompanyJobsListProps {
  companyId: string;
  company: Company;
  jobs: Job[];
}

interface ApplicationWithCandidate extends ApplicationRow {
  candidates: {
    id: string;
    profiles?: { last_name: string; first_name: string; last_name_kana: string; first_name_kana: string } | null;
  } | null;
}

interface JobWithStatuses {
  id: string;
  title: string;
  available_statuses: string[];
}

interface JobApplicationsProps {
  jobId: string;
}

function JobApplications({ jobId }: JobApplicationsProps) {
  const [applications, setApplications] = useState<ApplicationWithCandidate[]>(
    [],
  );
  const [job, setJob] = useState<JobWithStatuses | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchApplications() {
      // 求人情報を取得
      const { data: jobData, error: jobError } = await getJobWithStatuses(
        jobId,
      );

      if (!jobError && jobData) {
        setJob(jobData);
      }

      // 応募を取得
      const { data, error } = await getJobApplications(jobId);

      if (!error && data) {
        setApplications(data as ApplicationWithCandidate[]);
      }
      setLoading(false);
    }
    fetchApplications();
  }, [jobId]);

  const getStatusLabel = getApplicationStatusLabel;
  const getStatusBadgeVariant = getApplicationStatusBadgeVariant;

  // 求人のavailable_statusesに基づいてステータスをフィルタリング
  const availableStatuses = job?.available_statuses || [];
  const statusOrder = [
    "applied",
    "document_screening",
    "first_interview",
    "second_interview",
    "final_interview",
    "offer",
    "rejected",
    "withdrawn",
  ].filter((status) => availableStatuses.includes(status));

  const groupedApplications =
    applications?.reduce(
      (
        acc: Record<string, ApplicationWithCandidate[]>,
        application: ApplicationWithCandidate,
      ) => {
        const status = application.current_status;
        if (!acc[status]) {
          acc[status] = [];
        }
        acc[status].push(application);
        return acc;
      },
      {},
    ) || {};

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">
          この求人への応募はまだありません
        </p>
      </div>
    );
  }

  const totalApplications = applications.length;

  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="inline-flex justify-start w-full overflow-x-auto">
        <TabsTrigger
          value="all"
          className="flex items-center gap-1 whitespace-nowrap"
        >
          すべて
          <span className="text-xs">({totalApplications})</span>
        </TabsTrigger>
        {statusOrder.map((status) => {
          const statusApplications = groupedApplications[status] || [];
          return (
            <TabsTrigger
              key={status}
              value={status}
              className="flex items-center gap-1 whitespace-nowrap"
            >
              <Badge
                variant={getStatusBadgeVariant(status)}
                className="text-xs"
              >
                {getStatusLabel(status)}
              </Badge>
              <span className="text-xs">({statusApplications.length})</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
      <TabsContent value="all" className="mt-4">
        {totalApplications > 0 ? (
          <div className="space-y-4">
            {applications.map((application) => (
              <div
                key={application.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">
                      {application.candidates
                        ? getCandidateDisplayName(application.candidates)
                        : "不明"}
                    </p>
                    <Badge
                      variant={getStatusBadgeVariant(
                        application.current_status,
                      )}
                      className="text-xs"
                    >
                      {getStatusLabel(application.current_status)}
                    </Badge>
                  </div>
                  {application.candidates && (
                    <p className="text-sm text-muted-foreground">
                      {getCandidateDisplayKana(application.candidates)}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    応募日:{" "}
                    {new Date(application.applied_at).toLocaleDateString(
                      "ja-JP",
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              応募はまだありません
            </p>
          </div>
        )}
      </TabsContent>
      {statusOrder.map((status) => {
        const statusApplications = groupedApplications[status] || [];
        return (
          <TabsContent key={status} value={status} className="mt-4">
            {statusApplications.length > 0 ? (
              <div className="space-y-4">
                {statusApplications.map((application) => (
                  <div
                    key={application.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">
                          {application.candidates
                            ? getCandidateDisplayName(application.candidates)
                            : "不明"}
                        </p>
                      </div>
                      {application.candidates && (
                        <p className="text-sm text-muted-foreground">
                          {getCandidateDisplayKana(application.candidates)}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        応募日:{" "}
                        {new Date(application.applied_at).toLocaleDateString(
                          "ja-JP",
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  {getStatusLabel(status)}の応募はありません
                </p>
              </div>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

type JobPosting = Tables<"job_postings">;

interface ApplicationWithCandidateAndJob extends ApplicationRow {
  candidates: {
    id: string;
    profiles?: { last_name: string; first_name: string; last_name_kana: string; first_name_kana: string } | null;
  } | null;
  job_postings: Pick<JobPosting, "id" | "title" | "available_statuses"> | null;
}

interface AllApplicationsProps {
  companyId: string;
  jobs: Job[];
}

function AllApplications({ companyId, jobs }: AllApplicationsProps) {
  const [allApplications, setAllApplications] = useState<
    ApplicationWithCandidateAndJob[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllApplications() {
      const jobIds = jobs.map((job) => job.id);

      if (jobIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data, error } = await getMultipleJobApplications(jobIds);

      if (!error && data) {
        setAllApplications(data as ApplicationWithCandidateAndJob[]);
      }
      setLoading(false);
    }
    fetchAllApplications();
  }, [companyId, jobs]);

  const getStatusLabel = getApplicationStatusLabel;
  const getStatusBadgeVariant = getApplicationStatusBadgeVariant;

  // すべての求人のavailable_statusesを集約
  const allAvailableStatuses = new Set<string>();
  allApplications.forEach((app) => {
    if (app.job_postings?.available_statuses) {
      app.job_postings.available_statuses.forEach((status: string) => {
        allAvailableStatuses.add(status);
      });
    }
  });

  const statusOrder = [
    "applied",
    "document_screening",
    "first_interview",
    "second_interview",
    "final_interview",
    "offer",
    "rejected",
    "withdrawn",
  ].filter((status) => allAvailableStatuses.has(status));

  const groupedApplications =
    allApplications?.reduce(
      (
        acc: Record<string, ApplicationWithCandidateAndJob[]>,
        application: ApplicationWithCandidateAndJob,
      ) => {
        const status = application.current_status;
        if (!acc[status]) {
          acc[status] = [];
        }
        acc[status].push(application);
        return acc;
      },
      {},
    ) || {};

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (allApplications.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">応募はまだありません</p>
      </div>
    );
  }

  const totalApplications = allApplications.length;

  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="inline-flex justify-start w-full overflow-x-auto">
        <TabsTrigger
          value="all"
          className="flex items-center gap-1 whitespace-nowrap"
        >
          すべて
          <span className="text-xs">({totalApplications})</span>
        </TabsTrigger>
        {statusOrder.map((status) => {
          const statusApplications = groupedApplications[status] || [];
          return (
            <TabsTrigger
              key={status}
              value={status}
              className="flex items-center gap-1 whitespace-nowrap"
            >
              <Badge
                variant={getStatusBadgeVariant(status)}
                className="text-xs"
              >
                {getStatusLabel(status)}
              </Badge>
              <span className="text-xs">({statusApplications.length})</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
      <TabsContent value="all" className="mt-4">
        {totalApplications > 0 ? (
          <div className="space-y-4">
            {allApplications.map((application) => (
              <div
                key={application.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">
                      {application.candidates
                        ? getCandidateDisplayName(application.candidates)
                        : "不明"}
                    </p>
                    <Badge
                      variant={getStatusBadgeVariant(
                        application.current_status,
                      )}
                      className="text-xs"
                    >
                      {getStatusLabel(application.current_status)}
                    </Badge>
                  </div>
                  {application.candidates && (
                    <p className="text-sm text-muted-foreground">
                      {getCandidateDisplayKana(application.candidates)}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {application.job_postings?.title && (
                      <span className="mr-2">
                        {application.job_postings.title}
                      </span>
                    )}
                    応募日:{" "}
                    {new Date(application.applied_at).toLocaleDateString(
                      "ja-JP",
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              応募はまだありません
            </p>
          </div>
        )}
      </TabsContent>
      {statusOrder
        .filter((status) => {
          const statusApplications = groupedApplications[status] || [];
          return statusApplications.length > 0;
        })
        .map((status) => {
          const statusApplications = groupedApplications[status] || [];
          return (
            <TabsContent key={status} value={status} className="mt-4">
              <div className="space-y-4">
                {statusApplications.map((application) => (
                  <div
                    key={application.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">
                          {application.candidates
                            ? getCandidateDisplayName(application.candidates)
                            : "不明"}
                        </p>
                      </div>
                      {application.candidates && (
                        <p className="text-sm text-muted-foreground">
                          {getCandidateDisplayKana(application.candidates)}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {application.job_postings?.title && (
                          <span className="mr-2">
                            {application.job_postings.title}
                          </span>
                        )}
                        応募日:{" "}
                        {new Date(application.applied_at).toLocaleDateString(
                          "ja-JP",
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          );
        })}
    </Tabs>
  );
}

export function CompanyJobsList({
  companyId,
  company,
  jobs,
}: CompanyJobsListProps) {
  const [open, setOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(
    jobs[0]?.id || null,
  );
  const [selectedJobIdForApplications, setSelectedJobIdForApplications] =
    useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    setOpen(false);
    router.refresh();
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

  const getStatusLabel = getJobStatusLabel;

  return (
    <>
      <Tabs defaultValue="jobs" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="jobs">求人管理</TabsTrigger>
          <TabsTrigger value="applications">応募管理</TabsTrigger>
          <TabsTrigger value="company">企業情報</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>求人一覧</CardTitle>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      新規求人登録
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>新規求人登録</DialogTitle>
                      <DialogDescription>
                        この企業の新しい求人を登録します
                      </DialogDescription>
                    </DialogHeader>
                    <JobForm
                      initialData={{ company_id: companyId }}
                      onSuccess={handleSuccess}
                    />
                  </DialogContent>
                </Dialog>
              </div>
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
                        {job.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {job.description}
                          </p>
                        )}
                        {job.graduation_year && (
                          <p className="text-sm text-muted-foreground">
                            卒年度: {job.graduation_year}年
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedJobId(job.id);
                          setDetailOpen(true);
                        }}
                      >
                        編集
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    この企業の求人がありません
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-start">
                <Select
                  value={selectedJobIdForApplications || "all"}
                  onValueChange={(value) =>
                    setSelectedJobIdForApplications(
                      value === "all" ? null : value,
                    )
                  }
                >
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="すべての応募" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての応募</SelectItem>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          <span>{job.title}</span>
                          <Badge
                            variant={getStatusBadgeVariant(job.status)}
                            className="text-xs ml-2"
                          >
                            {getStatusLabel(job.status)}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {selectedJobIdForApplications ? (
                <JobApplications jobId={selectedJobIdForApplications} />
              ) : (
                <AllApplications companyId={companyId} jobs={jobs} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company">
          <CompanyForm
            initialData={{
              id: company.id,
              name: company.name,
              notes: company.notes || "",
            }}
            onSuccess={() => {
              router.refresh();
            }}
          />
        </TabsContent>
      </Tabs>

      <JobDetailModal
        jobId={selectedJobId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        companyId={companyId}
      />
    </>
  );
}
