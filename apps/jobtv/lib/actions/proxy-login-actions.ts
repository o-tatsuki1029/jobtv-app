"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const PROXY_ORIGINAL_ADMIN_ID_COOKIE = "proxy_original_admin_id";
const PROXY_LOGIN_STARTED_AT_COOKIE = "proxy_login_started_at";
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
      // タイムアウト: クッキーを削除して自動的にログアウト
      cookieStore.delete(PROXY_ORIGINAL_ADMIN_ID_COOKIE);
      cookieStore.delete(PROXY_LOGIN_STARTED_AT_COOKIE);
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
    console.error("Check proxy login status error:", error);
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
      console.error("Get recruiters error:", recruitersError);
      return { data: null, error: "リクルーターアカウントの取得に失敗しました" };
    }

    if (!recruiters || recruiters.length === 0) {
      return { data: null, error: "この企業にリクルーターアカウントが存在しません" };
    }

    const recruiterId = recruiters[0].id;

    // 元の管理者IDと開始時刻をクッキーに保存
    const cookieStore = await cookies();
    const startedAt = Date.now();
    cookieStore.set(PROXY_ORIGINAL_ADMIN_ID_COOKIE, user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: PROXY_LOGIN_TIMEOUT_MINUTES * 60, // 120分
      path: "/"
    });
    cookieStore.set(PROXY_LOGIN_STARTED_AT_COOKIE, startedAt.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: PROXY_LOGIN_TIMEOUT_MINUTES * 60, // 120分
      path: "/"
    });

    // Supabase Admin APIを使用してリクルーターアカウントの情報を取得
    const supabaseAdmin = createAdminClient();
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(recruiterId);

    if (userError || !userData) {
      console.error("Get user by id error:", userError);
      return { data: null, error: "リクルーターアカウントの取得に失敗しました" };
    }

    // マジックリンクを生成（パスワードを変更せずにログイン）
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: userData.user.email || ""
    });

    if (linkError || !linkData) {
      console.error("Generate magic link error:", linkError);
      return { data: null, error: "マジックリンクの生成に失敗しました" };
    }

    // マジックリンクのURLからトークンを抽出
    const actionLink = linkData.properties?.action_link;
    if (!actionLink) {
      return { data: null, error: "マジックリンクの取得に失敗しました" };
    }

    // URLからトークンを抽出（#access_token=...の形式）
    const url = new URL(actionLink);
    const hashParams = new URLSearchParams(url.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (!accessToken || !refreshToken) {
      // URLパラメータからも試す
      const accessTokenParam = url.searchParams.get("access_token");
      const refreshTokenParam = url.searchParams.get("refresh_token");

      if (accessTokenParam && refreshTokenParam) {
        // セッションを設定
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessTokenParam,
          refresh_token: refreshTokenParam
        });

        if (setSessionError) {
          console.error("Set session error:", setSessionError);
          return { data: null, error: "セッションの設定に失敗しました" };
        }
      } else {
        return { data: null, error: "トークンの取得に失敗しました" };
      }
    } else {
      // セッションを設定
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (setSessionError) {
        console.error("Set session error:", setSessionError);
        return { data: null, error: "セッションの設定に失敗しました" };
      }
    }

    revalidatePath("/", "layout");

    // クライアント側でリダイレクトするため、URLを返す
    return { data: { redirectUrl: "/studio" }, error: null };
  } catch (error) {
    console.error("Proxy login as company error:", error);
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

    // 元の管理者IDでマジックリンクを生成してログイン
    const supabaseAdmin = createAdminClient();
    const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.getUserById(originalAdminId);

    if (adminError || !adminData) {
      console.error("Get admin user error:", adminError);
      return { data: null, error: "管理者アカウントの取得に失敗しました" };
    }

    // マジックリンクを生成（パスワードを変更せずにログイン）
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: adminData.user.email || ""
    });

    if (linkError || !linkData) {
      console.error("Generate magic link error:", linkError);
      return { data: null, error: "マジックリンクの生成に失敗しました" };
    }

    // マジックリンクのURLからトークンを抽出
    const actionLink = linkData.properties?.action_link;
    if (!actionLink) {
      return { data: null, error: "マジックリンクの取得に失敗しました" };
    }

    // URLからトークンを抽出（#access_token=...の形式）
    const url = new URL(actionLink);
    const hashParams = new URLSearchParams(url.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (!accessToken || !refreshToken) {
      // URLパラメータからも試す
      const accessTokenParam = url.searchParams.get("access_token");
      const refreshTokenParam = url.searchParams.get("refresh_token");

      if (accessTokenParam && refreshTokenParam) {
        // セッションを設定
        const supabase = await createClient();
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessTokenParam,
          refresh_token: refreshTokenParam
        });

        if (setSessionError) {
          console.error("Set session error:", setSessionError);
          return { data: null, error: "セッションの設定に失敗しました" };
        }
      } else {
        return { data: null, error: "トークンの取得に失敗しました" };
      }
    } else {
      // セッションを設定
      const supabase = await createClient();
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (setSessionError) {
        console.error("Set session error:", setSessionError);
        return { data: null, error: "セッションの設定に失敗しました" };
      }
    }

    // プロキシログイン用のクッキーを削除
    cookieStore.delete(PROXY_ORIGINAL_ADMIN_ID_COOKIE);
    cookieStore.delete(PROXY_LOGIN_STARTED_AT_COOKIE);

    revalidatePath("/", "layout");

    // クライアント側でリダイレクトするため、URLを返す
    return { data: { redirectUrl: "/admin" }, error: null };
  } catch (error) {
    console.error("Exit proxy login error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "プロキシログインの解除に失敗しました"
    };
  }
}
