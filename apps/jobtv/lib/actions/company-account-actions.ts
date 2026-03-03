"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { Tables, TablesInsert, TablesUpdate } from "@jobtv-app/shared/types";
import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { sendTemplatedEmail } from "@/lib/email/send-templated-email";

type Company = Tables<"companies">;
type CompanyInsert = TablesInsert<"companies">;

/**
 * 企業一覧を取得
 */
export async function getAllCompanies(): Promise<{
  data: Company[] | null;
  error: string | null;
}> {
  try {
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get all companies error:", error);
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error("Get all companies error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "企業一覧の取得に失敗しました",
    };
  }
}

/**
 * 企業のみを作成（管理者のみ）
 */
export async function createCompany(companyData: {
  name: string;
  industry?: string | null;
  prefecture?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  website?: string | null;
  representative?: string | null;
  established?: string | null;
  employees?: string | null;
  company_info?: string | null;
  status?: "active" | "closed" | null;
}): Promise<{ data: { companyId: string } | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) {
    return { data: null, error: "管理者権限が必要です" };
  }
  try {
    const supabaseAdmin = createAdminClient();
    const { data: newCompany, error } = await supabaseAdmin
      .from("companies")
      .insert({
        name: companyData.name,
        industry: companyData.industry || null,
        prefecture: companyData.prefecture || null,
        address_line1: companyData.address_line1 || null,
        address_line2: companyData.address_line2 || null,
        website: companyData.website || null,
        representative: companyData.representative || null,
        established: companyData.established || null,
        employees: companyData.employees || null,
        company_info: companyData.company_info || null,
        status: companyData.status || "active",
      })
      .select()
      .single();
    if (error || !newCompany) {
      console.error("Create company error:", error);
      return { data: null, error: error?.message ?? "企業の作成に失敗しました" };
    }
    revalidatePath("/admin/company-accounts");
    return { data: { companyId: newCompany.id }, error: null };
  } catch (err) {
    console.error("Create company error:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "企業の作成に失敗しました",
    };
  }
}

/**
 * 企業とリクルーターアカウントを同時に作成
 */
export async function createCompanyWithRecruiter(
  companyData: {
    name: string;
    industry?: string | null;
    prefecture?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    website?: string | null;
    representative?: string | null;
    established?: string | null;
    employees?: string | null;
    company_info?: string | null;
    status?: "active" | "closed" | null;
  },
  recruiterData: {
    email: string;
    last_name: string;
    first_name: string;
    last_name_kana: string;
    first_name_kana: string;
  }
): Promise<{
  data: { companyId: string; recruiterId: string } | null;
  error: string | null;
}> {
  try {
    const supabaseAdmin = createAdminClient();

    // 既存のメールアドレスをチェック
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", recruiterData.email)
      .single();

    if (existingProfile) {
      return { data: null, error: "このメールアドレスは既に使用されています" };
    }

    // 1. 企業を作成
    const { data: newCompany, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: companyData.name,
        industry: companyData.industry || null,
        prefecture: companyData.prefecture || null,
        address_line1: companyData.address_line1 || null,
        address_line2: companyData.address_line2 || null,
        website: companyData.website || null,
        representative: companyData.representative || null,
        established: companyData.established || null,
        employees: companyData.employees || null,
        company_info: companyData.company_info || null,
        status: companyData.status || "active",
      })
      .select()
      .single();

    if (companyError || !newCompany) {
      console.error("Create company error:", companyError);
      return {
        data: null,
        error: companyError?.message || "企業の作成に失敗しました",
      };
    }

    const companyId = newCompany.id;

    // 2. リクルーターアカウントの招待リンクを生成（メールは SendGrid で自前送信）
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: recruiterData.email,
      options: {
        data: {
          first_name: recruiterData.first_name,
          last_name: recruiterData.last_name,
          first_name_kana: recruiterData.first_name_kana,
          last_name_kana: recruiterData.last_name_kana,
          company_id: companyId,
          role: "recruiter",
        },
        redirectTo: `${siteUrl}/auth/update-password`,
      },
    });

    if (linkError || !linkData?.user?.id) {
      console.error("generateLink error:", linkError);

      // 企業作成をロールバック（削除）
      await supabaseAdmin.from("companies").delete().eq("id", companyId);

      const errorMessage =
        linkError instanceof Error
          ? linkError.message
          : typeof linkError === "object" &&
              linkError !== null &&
              "message" in linkError
            ? String((linkError as { message: string }).message)
            : "招待リンクの生成に失敗しました";

      return {
        data: null,
        error: `リクルーターアカウントの招待に失敗しました: ${errorMessage}`,
      };
    }

    const userId    = linkData.user.id;
    const inviteUrl = linkData.properties.action_link;

    // 3. SendGrid で招待メールを送信
    const { error: emailError } = await sendTemplatedEmail({
      templateName:   "invite_recruiter",
      recipientEmail: recruiterData.email,
      variables: {
        first_name:   recruiterData.first_name,
        last_name:    recruiterData.last_name,
        company_name: newCompany.name,
        invite_url:   inviteUrl,
        site_url:     siteUrl,
      },
    });

    if (emailError) {
      // auth user は作成済みのため企業をロールバックしない。警告のみ。
      console.error("招待メールの送信に失敗しました（アカウントは作成済み）:", emailError);
    }

    // 3. profilesレコードを待機（最大3秒、100ms間隔でポーリング）
    let profileExists = false;
    for (let i = 0; i < 30; i++) {
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();

      if (existingProfile) {
        profileExists = true;
        break;
      }

      // 100ms待機
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // 4. profilesテーブルにリクルーター情報を登録
    const now = new Date().toISOString();
    const profileData = {
      id: userId,
      email: recruiterData.email,
      role: "recruiter" as const,
      company_id: companyId,
      last_name: recruiterData.last_name,
      first_name: recruiterData.first_name,
      last_name_kana: recruiterData.last_name_kana,
      first_name_kana: recruiterData.first_name_kana,
      updated_at: now,
    };

    let upsertError;
    if (profileExists) {
      // レコードが存在する場合は更新
      const { error } = await supabaseAdmin
        .from("profiles")
        .update(profileData)
        .eq("id", userId);
      upsertError = error;
    } else {
      // レコードが存在しない場合はupsert
      const { error } = await supabaseAdmin
        .from("profiles")
        .upsert(profileData, {
          onConflict: "id",
        });
      upsertError = error;
    }

    if (upsertError) {
      const errorMessage =
        upsertError.message ||
        (typeof upsertError === "object" &&
        upsertError !== null &&
        "message" in upsertError
          ? String(upsertError.message)
          : JSON.stringify(upsertError));

      // 企業とauth.usersをロールバック
      await supabaseAdmin.from("companies").delete().eq("id", companyId);
      await supabaseAdmin.auth.admin.deleteUser(userId);

      return {
        data: null,
        error: `プロファイル情報の更新に失敗しました: ${errorMessage}`,
      };
    }

    revalidatePath("/admin/company-accounts");
    return {
      data: {
        companyId,
        recruiterId: userId,
      },
      error: null,
    };
  } catch (error) {
    console.error("Create company with recruiter error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "企業とリクルーターアカウントの作成に失敗しました",
    };
  }
}

/** 画像 MIME タイプ（サムネ用） */
const ALLOWED_THUMBNAIL_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * 管理者が企業のサムネ画像をアップロードし、companies.thumbnail_url を更新する
 */
export async function uploadCompanyThumbnail(
  companyId: string,
  formData: FormData
): Promise<{ data: { thumbnailUrl: string } | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) {
    return { data: null, error: "管理者権限が必要です" };
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { data: null, error: "画像ファイルを選択してください" };
  }

  if (file.size > MAX_THUMBNAIL_SIZE) {
    return { data: null, error: "ファイルサイズは5MB以下にしてください" };
  }
  if (!ALLOWED_THUMBNAIL_MIME.includes(file.type)) {
    return {
      data: null,
      error: "サポートされていない形式です。JPEG, PNG, WebP, GIF をアップロードしてください。",
    };
  }

  try {
    const supabaseAdmin = createAdminClient();
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `admin/companies/${companyId}/thumbnail/${timestamp}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("company-assets")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      console.error("Upload company thumbnail error:", uploadError);
      return { data: null, error: uploadError.message };
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("company-assets").getPublicUrl(fileName);

    const { error: updateError } = await supabaseAdmin
      .from("companies")
      .update({ thumbnail_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", companyId);

    if (updateError) {
      console.error("Update company thumbnail_url error:", updateError);
      return { data: null, error: updateError.message };
    }

    revalidatePath("/admin/company-accounts");
    return { data: { thumbnailUrl: publicUrl }, error: null };
  } catch (err) {
    console.error("Upload company thumbnail error:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "サムネのアップロードに失敗しました",
    };
  }
}

/** 企業ページ本番用ダミーデータ */
const DUMMY_COMPANY_PAGE = {
  tagline: "テスト用キャッチコピー",
  description:
    "テスト用の企業ページです。本番公開用のダミーデータです。スタジオから正式な内容に差し替えてください。",
  cover_image_url: null as string | null,
  main_video_url: null as string | null,
  sns_x_url: null as string | null,
  sns_instagram_url: null as string | null,
  sns_tiktok_url: null as string | null,
  sns_youtube_url: null as string | null,
  short_videos: null as Tables<"company_pages">["short_videos"],
  documentary_videos: null as Tables<"company_pages">["documentary_videos"],
  company_videos: null as Tables<"company_pages">["company_videos"],
  benefits: null as string[] | null,
  status: "active" as const,
};

/**
 * 管理者が企業ページをダミーデータで作成し、本番で公開する（テスト用）
 */
export async function createCompanyPageWithDummyData(
  companyId: string
): Promise<{ data: { pageId: string } | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) {
    return { data: null, error: "管理者権限が必要です" };
  }

  try {
    const supabaseAdmin = createAdminClient();

    const { data: existingPage, error: findError } = await supabaseAdmin
      .from("company_pages")
      .select("id")
      .eq("company_id", companyId)
      .maybeSingle();

    if (findError) {
      console.error("Find existing company page error:", findError);
      return { data: null, error: findError.message };
    }

    const now = new Date().toISOString();
    const payload: TablesUpdate<"company_pages"> = {
      ...DUMMY_COMPANY_PAGE,
      updated_at: now,
    };

    if (existingPage) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("company_pages")
        .update(payload)
        .eq("id", existingPage.id)
        .select("id")
        .single();

      if (updateError) {
        console.error("Update company page with dummy error:", updateError);
        return { data: null, error: updateError.message };
      }
      revalidatePath("/admin/company-accounts");
      revalidatePath(`/company/${companyId}`);
      return { data: { pageId: updated.id }, error: null };
    }

    const insertData: TablesInsert<"company_pages"> = {
      company_id: companyId,
      ...DUMMY_COMPANY_PAGE,
    };

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("company_pages")
      .insert(insertData)
      .select("id")
      .single();

    if (insertError) {
      console.error("Create company page with dummy error:", insertError);
      return { data: null, error: insertError.message };
    }

    revalidatePath("/admin/company-accounts");
    revalidatePath(`/company/${companyId}`);
    return { data: { pageId: inserted.id }, error: null };
  } catch (err) {
    console.error("Create company page with dummy error:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "企業ページの作成に失敗しました",
    };
  }
}

