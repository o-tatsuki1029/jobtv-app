"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, User, Briefcase, Building2 } from "lucide-react";
import {
  getApplicationStatusLabel,
  getApplicationStatusBadgeVariant,
} from "@/utils/status";
import type { Tables } from "@jobtv-app/shared/types";

type ApplicationRow = Tables<"applications">;

interface Application extends ApplicationRow {
  candidates?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;
  job_postings?: {
    id: string;
    title: string;
    companies?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

interface ApplicationsListProps {
  applications: Application[];
}

export function ApplicationsList({ applications }: ApplicationsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>応募一覧</CardTitle>
      </CardHeader>
      <CardContent>
        {applications.length > 0 ? (
          <div className="space-y-4">
            {applications.map((application) => (
              <div
                key={application.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">
                      {application.candidates
                        ? `${application.candidates.last_name} ${application.candidates.first_name}`
                        : "不明"}
                    </p>
                    <Badge
                      variant={getApplicationStatusBadgeVariant(
                        application.current_status,
                      )}
                    >
                      {getApplicationStatusLabel(application.current_status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {application.job_postings && (
                      <>
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          <span>{application.job_postings.title}</span>
                        </div>
                        {application.job_postings.companies && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span>
                              {application.job_postings.companies.name}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    <span>
                      応募日:{" "}
                      {new Date(application.applied_at).toLocaleDateString(
                        "ja-JP",
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {application.candidates && (
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/admin/candidates/${application.candidates.id}`}
                      >
                        求職者詳細
                      </Link>
                    </Button>
                  )}
                  {application.job_postings && (
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/admin/jobs/${application.job_postings.id}/applications`}
                      >
                        求人詳細
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              応募履歴がありません
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
