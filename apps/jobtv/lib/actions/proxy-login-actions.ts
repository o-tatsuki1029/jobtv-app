"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { PROXY_ORIGINAL_ADMIN_ID_COOKIE, PROXY_LOGIN_STARTED_AT_COOKIE } from "@/lib/actions/proxy-login-constants";
import { logger } from "@/lib/logger";
import { logAudit } from "@jobtv-app/shared/utils/audit";
const PROXY_ADMIN_ACCESS_TOKEN_COOKIE = "proxy_admin_access_token";
const PROXY_ADMIN_REFRESH_TOKEN_COOKIE = "proxy_admin_refresh_token";
const PROXY_LOGIN_TIMEOUT_MINUTES = 120; // 120分


/**
 * プロキシログイン状態を確認（タイムアウトチェック付き）
 */
export async function checkProxyLoginStatus(): Promise<{
  data: { isProxyLogin: boolean; companyId?: string; companyName?: string; originalAdminId?: string } | null;
  error: string | null;
}> {
  try {
    const cookieStore = await cookies();
    const originalAdminId = cookieStore.get(PROXY_ORIGINAL_ADMIN_ID_COOKIE)?.value;
    const startedAtStr = cookieStore.get(PROXY_LOGIN_STARTED_AT_COOKIE)?.value;

    if (!originalAdminId || !startedAtStr) {
      return { data: { isProxyLogin: false }, error: null };
    }

    // タイムアウトチェック
    const startedAt = parseInt(startedAtStr, 10);
    const now = Date.now();
    const elapsedMinutes = (now - startedAt) / (1000 * 60);

    if (elapsedMinutes > PROXY_LOGIN_TIMEOUT_MINUTES) {
      // タイムアウト: リクルーターセッションをサインアウトしてクッキーを削除
      const supabase = await createClient();
      await supabase.auth.signOut();
      cookieStore.delete(PROXY_ORIGINAL_ADMIN_ID_COOKIE);
      cookieStore.delete(PROXY_LOGIN_STARTED_AT_COOKIE);
      cookieStore.delete(PROXY_ADMIN_ACCESS_TOKEN_COOKIE);
      cookieStore.delete(PROXY_ADMIN_REFRESH_TOKEN_COOKIE);
      return { data: { isProxyLogin: false }, error: null };
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: { isProxyLogin: false }, error: null };
    }

    // 現在のユーザーが管理者IDと異なる場合、プロキシログイン中
    const isProxyLogin = user.id !== originalAdminId;

    if (!isProxyLogin) {
      return { data: { isProxyLogin: false }, error: null };
    }

    // 現在のユーザー（リクルーター）の企業情報を取得
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return { data: { isProxyLogin: false }, error: null };
    }

    // 企業情報を取得
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", profile.company_id)
      .single();

    if (companyError || !company) {
      return { data: { isProxyLogin: false }, error: null };
    }

    return {
      data: {
        isProxyLogin: true,
        companyId: company.id,
        companyName: company.name,
        originalAdminId: originalAdminId
      },
      error: null
    };
  } catch (error) {
    logger.error({ action: "checkProxyLoginStatus", err: error }, "プロキシログイン状態の確認に失敗しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "プロキシログイン状態の確認に失敗しました"
    };
  }
}

/**
 * 企業アカウントとして代理ログイン（リクルーターアカウントでログイン）
 */
export async function proxyLoginAsCompany(companyId: string): Promise<{
  data: { redirectUrl: string } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "ログインが必要です" };
    }

    // 現在のユーザーが管理者かどうかを確認
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { data: null, error: "ユーザー情報の取得に失敗しました" };
    }

    if (profile.role !== "admin") {
      return { data: null, error: "管理者権限が必要です" };
    }

    // 企業に紐づくリクルーターアカウントを取得
    const { data: recruiters, error: recruitersError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("company_id", companyId)
      .eq("role", "recruiter")
      .limit(1);

    if (recruitersError) {
      logger.error({ action: "proxyLoginAsCompany", err: recruitersError, companyId }, "リクルーターアカウントの取得に失敗しました");
      return { data: null, error: "リクルーターアカウントの取得に失敗しました" };
    }

    if (!recruiters || recruiters.length === 0) {
      return { data: null, error: "この企業にリクルーターアカウントが存在しません" };
    }

    const recruiterId = recruiters[0].id;

    // 管理者セッションのトークンを保存（exitProxyLogin時にAAL2付きで復帰するため）
    const { data: { session: adminSession } } = await supabase.auth.getSession();
    if (!adminSession) {
      return { data: null, error: "管理者セッションの取得に失敗しました" };
    }

    // 元の管理者IDと開始時刻をクッキーに保存
    const cookieStore = await cookies();
    const startedAt = Date.now();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: PROXY_LOGIN_TIMEOUT_MINUTES * 60, // 120分
      path: "/"
    };
    cookieStore.set(PROXY_ORIGINAL_ADMIN_ID_COOKIE, user.id, cookieOptions);
    cookieStore.set(PROXY_LOGIN_STARTED_AT_COOKIE, startedAt.toString(), cookieOptions);
    cookieStore.set(PROXY_ADMIN_ACCESS_TOKEN_COOKIE, adminSession.access_token, cookieOptions);
    cookieStore.set(PROXY_ADMIN_REFRESH_TOKEN_COOKIE, adminSession.refresh_token, cookieOptions);

    // Supabase Admin APIを使用してリクルーターアカウントの情報を取得
    const supabaseAdmin = createAdminClient();
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(recruiterId);

    if (userError || !userData) {
      logger.error({ action: "proxyLoginAsCompany", err: userError, recruiterId }, "リクルーターアカウントの取得に失敗しました");
      return { data: null, error: "リクルーターアカウントの取得に失敗しました" };
    }

    // マジックリンクを生成し、hashed_tokenでセッションを取得（パスワード変更なし）
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: userData.user.email || ""
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      logger.error({ action: "proxyLoginAsCompany", err: linkError }, "マジックリンクの生成に失敗しました");
      return { data: null, error: "マジックリンクの生成に失敗しました" };
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink"
    });
    if (verifyError) {
      logger.error({ action: "proxyLoginAsCompany", err: verifyError }, "OTP検証に失敗しました");
      return { data: null, error: "セッションの設定に失敗しました" };
    }

    revalidatePath("/", "layout");

    // 企業名を取得してログに記録
    const { data: targetCompany } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();

    logAudit({
      userId: user.id,
      action: "proxy_login.start_company",
      category: "access",
      resourceType: "companies",
      resourceId: companyId,
      app: "jobtv",
      metadata: { targetCompanyId: companyId, targetCompanyName: targetCompany?.name },
    });

    // クライアント側でリダイレクトするため、URLを返す
    return { data: { redirectUrl: "/studio" }, error: null };
  } catch (error) {
    logger.error({ action: "proxyLoginAsCompany", err: error, companyId }, "企業への代理ログインに失敗しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "代理ログインに失敗しました"
    };
  }
}

/**
 * 特定リクルーターとして代理ログイン
 */
export async function proxyLoginAsRecruiter(recruiterId: string): Promise<{
  data: { redirectUrl: string } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "ログインが必要です" };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { data: null, error: "ユーザー情報の取得に失敗しました" };
    }

    if (profile.role !== "admin") {
      return { data: null, error: "管理者権限が必要です" };
    }

    const { data: { session: adminSession } } = await supabase.auth.getSession();
    if (!adminSession) {
      return { data: null, error: "管理者セッションの取得に失敗しました" };
    }

    const cookieStore = await cookies();
    const startedAt = Date.now();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: PROXY_LOGIN_TIMEOUT_MINUTES * 60,
      path: "/"
    };
    cookieStore.set(PROXY_ORIGINAL_ADMIN_ID_COOKIE, user.id, cookieOptions);
    cookieStore.set(PROXY_LOGIN_STARTED_AT_COOKIE, startedAt.toString(), cookieOptions);
    cookieStore.set(PROXY_ADMIN_ACCESS_TOKEN_COOKIE, adminSession.access_token, cookieOptions);
    cookieStore.set(PROXY_ADMIN_REFRESH_TOKEN_COOKIE, adminSession.refresh_token, cookieOptions);

    const supabaseAdmin = createAdminClient();
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(recruiterId);

    if (userError || !userData) {
      logger.error({ action: "proxyLoginAsRecruiter", err: userError, recruiterId }, "リクルーターアカウントの取得に失敗しました");
      return { data: null, error: "リクルーターアカウントの取得に失敗しました" };
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: userData.user.email || ""
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      logger.error({ action: "proxyLoginAsRecruiter", err: linkError }, "マジックリンクの生成に失敗しました");
      return { data: null, error: "マジックリンクの生成に失敗しました" };
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink"
    });
    if (verifyError) {
      logger.error({ action: "proxyLoginAsRecruiter", err: verifyError }, "OTP検証に失敗しました");
      return { data: null, error: "セッションの設定に失敗しました" };
    }

    revalidatePath("/", "layout");

    logAudit({
      userId: user.id,
      action: "proxy_login.start_recruiter",
      category: "access",
      resourceType: "profiles",
      resourceId: recruiterId,
      app: "jobtv",
      metadata: { targetRecruiterId: recruiterId, targetEmail: userData.user.email },
    });

    return { data: { redirectUrl: "/studio" }, error: null };
  } catch (error) {
    logger.error({ action: "proxyLoginAsRecruiter", err: error, recruiterId }, "リクルーターへの代理ログインに失敗しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "代理ログインに失敗しました"
    };
  }
}

/**
 * プロキシログインから元の管理者セッションに戻る
 */
export async function exitProxyLogin(): Promise<{
  data: { redirectUrl: string } | null;
  error: string | null;
}> {
  try {
    const cookieStore = await cookies();
    const originalAdminId = cookieStore.get(PROXY_ORIGINAL_ADMIN_ID_COOKIE)?.value;

    if (!originalAdminId) {
      return { data: null, error: "プロキシログインセッションが見つかりません" };
    }

    const startedAtStr = cookieStore.get(PROXY_LOGIN_STARTED_AT_COOKIE)?.value;
    const savedAccessToken = cookieStore.get(PROXY_ADMIN_ACCESS_TOKEN_COOKIE)?.value;
    const savedRefreshToken = cookieStore.get(PROXY_ADMIN_REFRESH_TOKEN_COOKIE)?.value;

    if (!savedAccessToken || !savedRefreshToken) {
      return { data: null, error: "管理者セッション情報が見つかりません。再度ログインしてください" };
    }

    const supabase = await createClient();
    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: savedAccessToken,
      refresh_token: savedRefreshToken
    });
    if (setSessionError) {
      return { data: null, error: "管理者セッションの復帰に失敗しました" };
    }

    // プロキシログイン用のクッキーを削除
    cookieStore.delete(PROXY_ORIGINAL_ADMIN_ID_COOKIE);
    cookieStore.delete(PROXY_LOGIN_STARTED_AT_COOKIE);
    cookieStore.delete(PROXY_ADMIN_ACCESS_TOKEN_COOKIE);
    cookieStore.delete(PROXY_ADMIN_REFRESH_TOKEN_COOKIE);

    revalidatePath("/", "layout");

    const duration = startedAtStr
      ? Math.round((Date.now() - parseInt(startedAtStr, 10)) / 1000)
      : undefined;

    logAudit({
      userId: originalAdminId,
      action: "proxy_login.exit",
      category: "access",
      resourceType: "profiles",
      app: "jobtv",
      metadata: { ...(duration !== undefined ? { duration } : {}) },
    });

    // クライアント側でリダイレクトするため、URLを返す
    return { data: { redirectUrl: "/admin" }, error: null };
  } catch (error) {
    logger.error({ action: "exitProxyLogin", err: error }, "プロキシログインの解除に失敗しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "プロキシログインの解除に失敗しました"
    };
  }
}
