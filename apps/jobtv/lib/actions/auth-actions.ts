"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  signInWithPassword as baseSignInWithPassword,
  signOut as baseSignOut,
  resetPasswordForEmail as baseResetPasswordForEmail,
  updatePassword as baseUpdatePassword
} from "@jobtv-app/shared/actions/auth";
import { translateAuthError } from "@jobtv-app/shared/auth";
import { getFullSiteUrl } from "@jobtv-app/shared/utils/dev-config";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTemplatedEmail } from "@/lib/email/send-templated-email";

/** 会員登録で RPC に渡す payload の型 */
export interface SignUpCandidatePayload {
  email: string;
  last_name: string;
  first_name: string;
  last_name_kana: string;
  first_name_kana: string;
  gender: string;
  desired_work_location: string;
  date_of_birth: string;
  phone: string;
  school_type: string;
  school_name: string;
  faculty_name: string;
  department_name: string;
  major_field: string;
  graduation_year: number;
  desired_industry: string[];
  desired_job_type: string[];
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
}

/**
 * サインアップ処理。認証作成後、同一セッションで candidates 作成と profiles.candidate_id 紐付けを RPC で実行する。
 */
export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${getFullSiteUrl(3000)}/api/auth/callback` }
  });

  if (authError) {
    return { error: translateAuthError(authError) };
  }

  if (!authData.session) {
    return {
      error:
        "メールアドレス確認のリンクを送信しました。メールをご確認のうえ、リンクから本登録を完了してください。"
    };
  }

  const payload = buildCandidatePayloadFromFormData(formData, email);
  const { error: rpcError } = await supabase.rpc("create_candidate_and_link_profile", {
    payload: payload as unknown as Record<string, unknown>
  });

  if (rpcError) {
    console.error("create_candidate_and_link_profile RPC error:", rpcError);
    return { error: "登録情報の保存に失敗しました。しばらく経ってから再度お試しください。" };
  }

  // サンクスメールを送信（失敗してもサインアップは成功とする）
  sendTemplatedEmail({
    templateName:   "candidate_welcome",
    recipientEmail: email,
    variables: {
      first_name: payload.first_name,
      last_name:  payload.last_name,
      site_url:   getFullSiteUrl(3000),
    },
  }).catch((e) => console.error("candidate_welcome メール送信エラー:", e));

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * サインアップ可否のため、プロフィール内でメールアドレスを検索する。
 * - 存在しない → 登録可能
 * - candidate が存在 → すでにアカウントあり
 * - recruiter / admin が存在 → このメールでは登録不可
 */
export type CheckEmailForSignupResult =
  | { status: "available" }
  | { status: "candidate_exists" }
  | { status: "recruiter_or_admin_exists" }
  | { status: "error"; error: string };

export async function checkEmailForSignup(email: string): Promise<CheckEmailForSignupResult> {
  const trimmed = String(email ?? "").trim().toLowerCase();
  if (!trimmed) {
    return { status: "error", error: "メールアドレスを入力してください" };
  }

  try {
    const supabase = createAdminClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("email", trimmed)
      .maybeSingle();

    if (error) {
      console.error("checkEmailForSignup profiles error:", error);
      return { status: "error", error: "確認に失敗しました。しばらく経ってからお試しください。" };
    }

    if (!profile) {
      return { status: "available" };
    }

    const role = profile.role;
    if (role === "candidate") {
      return { status: "candidate_exists" };
    }
    if (role === "recruiter" || role === "admin") {
      return { status: "recruiter_or_admin_exists" };
    }

    return { status: "available" };
  } catch (e) {
    console.error("checkEmailForSignup error:", e);
    return { status: "error", error: "確認に失敗しました。しばらく経ってからお試しください。" };
  }
}

/**
 * FormData から RPC 用の candidate payload を組み立てる
 */
function buildCandidatePayloadFromFormData(
  formData: FormData,
  email: string
): SignUpCandidatePayload {
  const get = (key: string) => String(formData.get(key) ?? "").trim();
  const getNum = (key: string) => {
    const v = formData.get(key);
    if (v === null || v === undefined) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const getArray = (key: string) => {
    const v = formData.get(key);
    if (typeof v === "string") return v ? [v] : [];
    return formData.getAll(key).filter((x): x is string => typeof x === "string");
  };

  return {
    email,
    last_name: get("last_name"),
    first_name: get("first_name"),
    last_name_kana: get("last_name_kana"),
    first_name_kana: get("first_name_kana"),
    gender: get("gender"),
    desired_work_location: get("desired_work_location"),
    date_of_birth: get("date_of_birth"),
    phone: get("phone"),
    school_type: get("school_type"),
    school_name: get("school_name"),
    faculty_name: get("faculty_name"),
    department_name: get("department_name"),
    major_field: get("major_field"),
    graduation_year: getNum("graduation_year"),
    desired_industry: getArray("desired_industry"),
    desired_job_type: getArray("desired_job_type"),
    referrer: formData.get("referrer") ? String(formData.get("referrer")) : null,
    utm_source: formData.get("utm_source") ? String(formData.get("utm_source")) : null,
    utm_medium: formData.get("utm_medium") ? String(formData.get("utm_medium")) : null,
    utm_campaign: formData.get("utm_campaign") ? String(formData.get("utm_campaign")) : null,
    utm_content: formData.get("utm_content") ? String(formData.get("utm_content")) : null,
    utm_term: formData.get("utm_term") ? String(formData.get("utm_term")) : null
  };
}

/**
 * ログイン処理（一般ユーザー用）
 * 管理者はログインできません
 */
export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const result = await baseSignInWithPassword(email, password);

  if (result.error) {
    return { error: result.error };
  }

  // ログイン成功後、ロールをチェック
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証に失敗しました" };
  }

  // プロフィールからロールを取得
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    // ログアウトして終了
    await supabase.auth.signOut();
    return { error: "ユーザー情報の取得に失敗しました" };
  }

  // admin / recruiter の場合は専用ログインページへ誘導
  if (profile.role === "admin") {
    await supabase.auth.signOut();
    return { error: "管理者アカウントはこちらからログインできません。管理者ログインページをご利用ください。" };
  }
  if (profile.role === "recruiter") {
    await supabase.auth.signOut();
    return { error: "企業担当者アカウントはこちらからはログインできません。企業担当者ログインページをご利用ください。" };
  }

  revalidatePath("/", "layout");
  const next = (formData.get("next") as string)?.trim();
  const isValidNext = next && next.startsWith("/") && !next.startsWith("//");
  const redirectTo = isValidNext ? next : "/";
  // #region agent log
  fetch("http://127.0.0.1:7557/ingest/64046041-1a00-4e5c-9b0e-704b7b8897ef", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "561a53" },
    body: JSON.stringify({
      sessionId: "561a53",
      location: "auth-actions.ts:signIn redirect",
      message: "signIn redirect target",
      data: { next, isValidNext, redirectTo },
      timestamp: Date.now(),
      hypothesisId: "C"
    })
  }).catch(() => {});
  // #endregion
  redirect(redirectTo);
}

/**
 * ログアウト処理
 */
export async function signOut() {
  await baseSignOut();
  revalidatePath("/", "layout");
  redirect("/auth/login");
}

/**
 * パスワード再設定メール送信
 */
export async function resetPassword(formData: FormData) {
  const email = formData.get("email") as string;
  const result = await baseResetPasswordForEmail(email, `${getFullSiteUrl(3000)}/auth/update-password`);

  if (result.error) {
    return { error: result.error };
  }

  return { success: true };
}

/**
 * パスワード更新
 */
export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string;
  const result = await baseUpdatePassword(password);

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * ヘッダー表示用：現在ログイン中のユーザーの profiles.role を取得する。
 * サーバー側で参照するため RLS の影響を受けずに取得できる。
 */
export async function getCurrentUserRole(): Promise<{
  data: "recruiter" | "admin" | null;
  error: null;
} | { data: null; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: null };
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role =
      profile?.role === "recruiter" || profile?.role === "admin" ? profile.role : null;
    return { data: role, error: null };
  } catch (e) {
    console.error("getCurrentUserRole error:", e);
    return { data: null, error: "ロールの取得に失敗しました" };
  }
}

/**
 * リクルーター用スライドメニュー表示用：名前・企業・メールを取得する。
 */
export async function getRecruiterMenuInfo(): Promise<{
  data: {
    displayName: string;
    companyName: string | null;
    email: string | null;
  } | null;
  error: null;
} | { data: null; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: null };
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email, company_id")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile) {
      const displayName = user.email?.split("@")[0] ?? "ユーザー";
      return { data: { displayName, companyName: null, email: user.email ?? null }, error: null };
    }
    const displayName =
      [profile.last_name, profile.first_name].filter(Boolean).join(" ") ||
      user.email?.split("@")[0] ||
      "ユーザー";
    let companyName: string | null = null;
    if (profile.company_id) {
      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", profile.company_id)
        .maybeSingle();
      companyName = company?.name ?? null;
    }
    return {
      data: {
        displayName,
        companyName,
        email: profile.email ?? user.email ?? null
      },
      error: null
    };
  } catch (e) {
    console.error("getRecruiterMenuInfo error:", e);
    return { data: null, error: "情報の取得に失敗しました" };
  }
}

/**
 * ヘッダー用：ロールとリクルーター用メニュー情報を1回の往復で取得する。
 * 右側表示の遅延を抑えるため、並列化の代わりに単一の Server Action でまとめて取得する。
 */
export async function getHeaderAuthInfo(): Promise<
  | {
      data: {
        user: { email: string | null } | null;
        role: "recruiter" | "admin" | null;
        recruiterMenuInfo: {
          displayName: string;
          companyName: string | null;
          email: string | null;
        } | null;
      };
      error: null;
    }
  | { data: null; error: string }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        data: { user: null, role: null, recruiterMenuInfo: null },
        error: null
      };
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, first_name, last_name, email, company_id")
      .eq("id", user.id)
      .maybeSingle();
    const role =
      profile?.role === "recruiter" || profile?.role === "admin" ? profile.role : null;
    let recruiterMenuInfo: {
      displayName: string;
      companyName: string | null;
      email: string | null;
    } | null = null;
    if (role === "recruiter" && profile) {
      const displayName =
        [profile.last_name, profile.first_name].filter(Boolean).join(" ") ||
        user.email?.split("@")[0] ||
        "ユーザー";
      let companyName: string | null = null;
      if (profile.company_id) {
        const { data: company } = await supabase
          .from("companies")
          .select("name")
          .eq("id", profile.company_id)
          .maybeSingle();
        companyName = company?.name ?? null;
      }
      recruiterMenuInfo = {
        displayName,
        companyName,
        email: profile.email ?? user.email ?? null
      };
    }
    return {
      data: {
        user: { email: user.email ?? null },
        role,
        recruiterMenuInfo
      },
      error: null
    };
  } catch (e) {
    console.error("getHeaderAuthInfo error:", e);
    return { data: null, error: "ヘッダー情報の取得に失敗しました" };
  }
}
