import { SITE_URL } from "@/constants/site";

interface JobPostingJsonLdProps {
  job: {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
    prefecture: string | null;
    location_detail: string | null;
    employment_type: string | null;
    graduation_year: number;
    application_deadline?: string | null;
  };
  company: { name: string; logo_url?: string | null; website?: string | null };
}

/**
 * 求人詳細ページ用の JobPosting 構造化データ（Schema.org）
 */
export default function JobPostingJsonLd({ job, company }: JobPostingJsonLdProps) {
  const url = `${SITE_URL}/job/${job.id}`;
  const jobLocation = [job.prefecture, job.location_detail].filter(Boolean).join(" ");

  const schema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description ?? undefined,
    datePosted: job.created_at,
    hiringOrganization: {
      "@type": "Organization",
      name: company.name,
      ...(company.website && { url: company.website }),
      ...(company.logo_url && { logo: company.logo_url })
    },
    jobLocation: jobLocation
      ? {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressRegion: job.prefecture ?? undefined,
            addressLocality: job.location_detail ?? undefined
          }
        }
      : undefined,
    employmentType: job.employment_type ?? undefined,
    validThrough: job.application_deadline ?? undefined,
    educationRequirements: {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "bachelor degree"
    },
    jobImmediateStart: false,
    identifier: {
      "@type": "PropertyValue",
      name: "JOBTV",
      value: job.id
    },
    url
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
