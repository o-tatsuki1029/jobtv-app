import { SITE_URL } from "@/constants/site";

interface CompanyOrganizationJsonLdProps {
  company: {
    id: string;
    name: string;
    description?: string | null;
    logo?: string | null;
    coverImage?: string | null;
    industry?: string | null;
    prefecture?: string | null;
    established?: string | null;
    employees?: string | null;
    website?: string | null;
  };
}

/**
 * 企業詳細ページ用の Organization 構造化データ（Schema.org）
 */
export default function CompanyOrganizationJsonLd({ company }: CompanyOrganizationJsonLdProps) {
  const url = `${SITE_URL}/company/${company.id}`;

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    url,
    description: company.description ?? undefined,
    logo: company.logo ?? undefined,
    image: company.coverImage ?? undefined,
    industry: company.industry ?? undefined,
    numberOfEmployees: company.employees
      ? { "@type": "QuantitativeValue", description: company.employees }
      : undefined,
    foundingDate: company.established ?? undefined,
    address: company.prefecture
      ? {
          "@type": "PostalAddress",
          addressRegion: company.prefecture,
          addressCountry: "JP"
        }
      : undefined,
    sameAs: company.website ? [company.website] : undefined
  };

  // undefined値を除去
  Object.keys(schema).forEach((key) => {
    if (schema[key] === undefined) delete schema[key];
  });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
