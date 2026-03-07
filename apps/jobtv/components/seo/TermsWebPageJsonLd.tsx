import { SITE_URL } from "@/constants/site";

const DESCRIPTION =
  "JOBTVの利用規約です。求人企業・求職者向けサービス（JOBTVfor新卒・JOBTVfor転職）の利用条件、登録情報の取扱い、禁止事項などを定めています。";

export default function TermsWebPageJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "利用規約",
    description: DESCRIPTION,
    url: `${SITE_URL}/docs/terms`,
    publisher: { "@type": "Organization", name: "JOBTV" }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
