"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApplicationForm } from "@/components/application-form";
import { ApplicationStatusForm } from "@/components/application-status-form";
import { InterviewNoteForm } from "@/components/interview-note-form";
import {
  FileText,
  Plus,
  Briefcase,
  Building2,
  MessageSquare,
  Calendar,
  User,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getInterviewNotes } from "@/lib/actions/candidate-actions";
import type {
  ApplicationWithRelations,
  InterviewNoteWithRelations,
} from "@jobtv-app/shared/types";

type Application = ApplicationWithRelations;
type InterviewNote = InterviewNoteWithRelations;

interface CandidateApplicationsSectionProps {
  candidateId: string;
  applications: Application[];
}

const ROLE_LABELS: Record<string, string> = {
  admin: "管理者",
  RA: "RA",
  CA: "CA",
  MRK: "MRK",
};

export function CandidateApplicationsSection({
  candidateId,
  applications,
}: CandidateApplicationsSectionProps) {
  const [open, setOpen] = useState(false);
  const [interviewNoteOpen, setInterviewNoteOpen] = useState(false);
  const [expandedApplication, setExpandedApplication] = useState<
    string | undefined
  >();
  const [interviewNotes, setInterviewNotes] = useState<InterviewNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    setOpen(false);
    router.refresh();
  };

  const handleInterviewNoteSuccess = () => {
    setInterviewNoteOpen(false);
    fetchInterviewNotes();
  };

  const fetchInterviewNotes = async () => {
    setLoadingNotes(true);
    try {
      const { data: notesData, error } = await getInterviewNotes(candidateId);

      if (!error && notesData) {
        setInterviewNotes(notesData as InterviewNote[]);
      }
    } catch (error) {
      console.error("Error fetching interview notes:", error);
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    fetchInterviewNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              新規追加
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="applications" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="applications">応募管理</TabsTrigger>
              <TabsTrigger value="interview-notes">面談履歴管理</TabsTrigger>
            </TabsList>
            <TabsContent value="applications" className="mt-4">
              <div className="flex justify-end mb-4">
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      新規応募
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>新規応募</DialogTitle>
                      <DialogDescription>
                        企業の求人に応募します
                      </DialogDescription>
                    </DialogHeader>
                    <ApplicationForm
                      candidateId={candidateId}
                      onSuccess={handleSuccess}
                    />
                  </DialogContent>
                </Dialog>
              </div>
              {applications.length > 0 ? (
                <Accordion
                  type="single"
                  collapsible
                  value={expandedApplication}
                  onValueChange={setExpandedApplication}
                  className="space-y-2"
                >
                  {applications.map((application) => (
                    <AccordionItem
                      key={application.id}
                      value={application.id}
                      className="border rounded-lg border-b last:border-b transition-all hover:shadow-md hover:bg-accent/20"
                    >
                      <AccordionTrigger className="hover:no-underline px-4 transition-colors">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3 flex-1 text-left">
                            <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">
                                {application.job_postings?.title || "不明"}
                              </p>
                              <Badge
                                variant={getStatusBadgeVariant(
                                  application.current_status
                                )}
                              >
                                {getStatusLabel(application.current_status)}
                              </Badge>
                              {application.job_postings?.companies && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Building2 className="h-3 w-3" />
                                  <span>
                                    {application.job_postings.companies.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 pb-6 px-4">
                        <div className="space-y-4">
                          <div className="text-sm text-muted-foreground">
                            応募日:{" "}
                            {new Date(
                              application.applied_at
                            ).toLocaleDateString("ja-JP")}
                          </div>
                          <ApplicationStatusForm
                            applicationId={application.id}
                            currentStatus={application.current_status}
                            availableStatuses={
                              application.job_postings?.available_statuses
                            }
                            showCard={false}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    応募履歴がありません
                  </p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="interview-notes" className="mt-4">
              <div className="flex justify-end mb-4">
                <Dialog
                  open={interviewNoteOpen}
                  onOpenChange={setInterviewNoteOpen}
                >
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      面談記録追加
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>面談記録追加</DialogTitle>
                      <DialogDescription>
                        面談の記録を追加します
                      </DialogDescription>
                    </DialogHeader>
                    <InterviewNoteForm
                      candidateId={candidateId}
                      onSuccess={handleInterviewNoteSuccess}
                    />
                  </DialogContent>
                </Dialog>
              </div>
              {loadingNotes ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">読み込み中...</p>
                </div>
              ) : interviewNotes.length > 0 ? (
                <div className="space-y-4">
                  {interviewNotes.map((note) => (
                    <Card
                      key={note.id}
                      className="shadow-none transition-all duration-200 hover:shadow-md hover:bg-accent/20"
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="bg-primary/10">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              面談記録
                            </Badge>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(note.interview_date).toLocaleDateString(
                                "ja-JP"
                              )}
                            </span>
                            {(note.interviewerProfile || note.profiles) && (
                              <>
                                <span className="text-sm text-muted-foreground">
                                  |
                                </span>
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  実施者:{" "}
                                  {note.interviewerProfile
                                    ? note.interviewerProfile.last_name && note.interviewerProfile.first_name
                                      ? `${note.interviewerProfile.last_name} ${note.interviewerProfile.first_name}`
                                      : note.interviewerProfile.email || "不明"
                                    : note.profiles
                                    ? note.profiles.last_name && note.profiles.first_name
                                      ? `${note.profiles.last_name} ${note.profiles.first_name}`
                                      : note.profiles.email || "不明"
                                    : "不明"}
                                  {(note.interviewerProfile?.role ||
                                    note.profiles?.role) && (
                                    <span className="ml-1">
                                      (
                                      {ROLE_LABELS[
                                        note.interviewerProfile?.role ||
                                          note.profiles?.role ||
                                          ""
                                      ] ||
                                        note.interviewerProfile?.role ||
                                        note.profiles?.role}
                                      )
                                    </span>
                                  )}
                                </span>
                              </>
                            )}
                          </div>
                          {note.notes && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {note.notes}
                            </p>
                          )}
                          <div className="text-xs text-muted-foreground">
                            作成日時:{" "}
                            {new Date(note.created_at).toLocaleString("ja-JP")}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    面談記録がありません
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
