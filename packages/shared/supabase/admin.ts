import { createClient } from "@supabase/supabase-js";
import pino from "pino";

const logger = pino({ name: "shared/admin" });

/**
 * Supabase Admin API用のクライアント（RLSをバイパス）
 * サーバーサイドで管理者権限が必要な操作を行う際に使用
 * 
 * 注意: このクライアントはRLSをバイパスするため、サーバーサイドでのみ使用してください
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }

  if (!supabaseServiceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Please add it to your .env.local file."
    );
  }

  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch (error) {
    logger.error({ action: "createAdminClient", err: error }, "Admin Clientの作成に失敗しました");
    throw new Error(
      `Admin Clientの作成に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// 後方互換性のためのエイリアス
export const getAdminClient = createAdminClient;





