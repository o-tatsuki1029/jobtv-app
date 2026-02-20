"use client";

import { CandidateForm } from "@/components/candidate-form";
import { useRouter } from "next/navigation";

interface CandidateFormWrapperProps {
  initialData?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    notes?: string;
  };
}

export function CandidateFormWrapper({
  initialData,
}: CandidateFormWrapperProps) {
  const router = useRouter();

  return (
    <CandidateForm
      initialData={initialData}
      onSuccess={() => {
        router.refresh();
      }}
    />
  );
}
