import { getCompanyProfile } from "@/lib/actions/company-profile-actions";
import { getNotifications } from "@/lib/actions/notification-actions";
import StudioDashboardClient from "@/app/studio/StudioDashboardClient";

/**
 * スタジオダッシュボード：企業情報・お知らせをサーバーで取得し、最初から表示する
 */
export default async function StudioDashboardPage() {
  const [companyResult, notificationsResult] = await Promise.all([
    getCompanyProfile(),
    getNotifications()
  ]);

  const initialCompany =
    !companyResult.error && companyResult.data
      ? {
          id: companyResult.data.id,
          name: companyResult.data.name,
          logo_url: companyResult.data.logo_url
        }
      : null;
  const initialNotifications = notificationsResult.data ?? [];

  return (
    <StudioDashboardClient
      initialCompany={initialCompany}
      initialNotifications={initialNotifications}
    />
  );
}
