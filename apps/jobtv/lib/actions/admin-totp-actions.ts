"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * 管理者向けTOTP登録
 * QRコード（SVG dataURI）・secret・factorId を返す
 */
export async function enrollAdminTOTP(): Promise<{
  qrCode?: string;
  secret?: string;
  factorId?: string;
  error: string | null;
}> {
  const supabase = await createClient();

  // ログイン中か確認
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "ログインが必要です" };
  }

  // 既存の未検証ファクターがあれば先に削除する
  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const unverifiedFactors =
    factorsData?.totp?.filter((f) => (f.status as string) === "unverified") ?? [];
  for (const factor of unverifiedFactors) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Google Authenticator",
  });

  if (error || !data) {
    return { error: "TOTP登録に失敗しました: " + (error?.message ?? "") };
  }

  return {
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    factorId: data.id,
    error: null,
  };
}

/**
 * TOTP初期設定の検証・有効化
 * 成功時は /admin にリダイレクト
 */
export async function verifyAndActivateTOTP(
  factorId: string,
  code: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });

  if (error) {
    return { error: "コードが正しくありません。もう一度お試しください。" };
  }

  redirect("/admin");
}

/**
 * ログイン時のTOTP検証
 * 登録済みのTOTPファクターでコードを検証し、セッションをAAL2に昇格させる
 * 成功時は /admin にリダイレクト
 */
export async function verifyAdminTOTP(
  code: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data: factorsData, error: listError } =
    await supabase.auth.mfa.listFactors();
  if (listError || !factorsData) {
    return { error: "ファクター情報の取得に失敗しました" };
  }

  const verifiedFactor = factorsData.totp?.find(
    (f) => f.status === "verified"
  );
  if (!verifiedFactor) {
    return { error: "TOTPが設定されていません" };
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: verifiedFactor.id,
    code,
  });

  if (error) {
    return { error: "コードが正しくありません。もう一度お試しください。" };
  }

  redirect("/admin");
}
