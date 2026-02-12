import JobDetailView from "@/components/JobDetailView";
import { getJob } from "@/lib/actions/job-actions";
import { getCompanyProfileById } from "@/lib/actions/company-profile-actions";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface JobDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * 求人詳細ページのメタデータを生成
 */
export async function generateMetadata({ params }: JobDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  // 求人情報を取得
  const { data: job, error: jobError } = await getJob(id);

  if (jobError || !job) {
    return {
      title: "求人が見つかりません",
      description: "お探しの求人は見つかりませんでした。"
    };
  }

  // 企業情報を取得
  const { data: company } = await getCompanyProfileById(job.company_id || "");

  // 都道府県と詳細を組み合わせてlocationを作成
  const locationText = [job.prefecture, job.location_detail]
    .filter(Boolean)
    .join(job.prefecture && job.location_detail ? " " : "");

  // タイトルを生成（ルートレイアウトでJOBTVが追加されるため、ここでは追加しない）
  const title = `${company?.name || "企業"}の求人 | ${job.title}`;

  // 説明文を生成（求人の説明文から最初の120文字を取得）
  const description = job.description
    ? job.description.replace(/\n/g, " ").substring(0, 120) + (job.description.length > 120 ? "..." : "")
    : `${company?.name || "企業"}の${job.title}の求人情報。${job.graduation_year}年卒対象。${
        locationText ? `勤務地: ${locationText}` : ""
      }`;

  // OGP画像を決定（カバー画像 > 企業ロゴ > デフォルト）
  const ogImage = job.cover_image_url || company?.logo_url || undefined;

  // キーワードを生成
  const keywords = [
    job.title,
    company?.name,
    `${job.graduation_year}年卒`,
    job.employment_type,
    job.prefecture,
    "新卒採用",
    "就活",
    "JobTV"
  ].filter(Boolean);

  return {
    title,
    description,
    keywords: keywords.join(", "),
    openGraph: {
      title,
      description,
      type: "website",
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: job.title
            }
          ]
        : undefined,
      siteName: "JOBTV"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined
    },
    alternates: {
      canonical: `/job/${id}`
    }
  };
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;

  // 求人情報を取得
  const { data: job, error: jobError } = await getJob(id);

  if (jobError || !job) {
    console.error("Failed to fetch job:", jobError);
    notFound();
  }

  // 企業情報を取得
  if (!job.company_id) {
    notFound();
  }

  const { data: company, error: companyError } = await getCompanyProfileById(job.company_id);

  if (companyError || !company) {
    console.error("Failed to fetch company:", companyError);
    notFound();
  }

  // JobDetailView用のデータ形式に変換
  // 都道府県と詳細を組み合わせてlocationを作成
  const locationText = [job.prefecture, job.location_detail]
    .filter(Boolean)
    .join(job.prefecture && job.location_detail ? " " : "");

  if (!job.id) {
    notFound();
  }

  const jobData = {
    id: job.id,
    title: job.title || "",
    graduationYear: `${job.graduation_year}年卒`,
    location: locationText || "",
    status: job.status === "active" ? ("published" as const) : ("private" as const),
    description: job.description || "",
    requirements: job.requirements || "",
    benefits: job.benefits || "",
    selectionProcess: job.selection_process || "",
    companyName: company.name,
    companyLogo: company.logo_url || "",
    coverImage: job.cover_image_url || company.cover_image_url || undefined,
    workLocation: locationText || undefined,
    workConditions: job.employment_type || undefined
  };

  return <JobDetailView job={jobData} />;
}
