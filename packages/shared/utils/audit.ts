import { createAdminClient } from "../supabase/admin";
import type { AppName } from "./logger";

type AuditCategory =
  | "content_review"
  | "account"
  | "content_edit"
  | "access"
  | "matching"
  | "hero"
  | "auth"
  | "storage"
  | "line"
  | "notification"
  | "email_template";

export async function logAudit(opts: {
  userId: string;
  action: string;
  category: AuditCategory;
  resourceType: string;
  resourceId?: string;
  app: AppName;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("audit_logs").insert({
    user_id: opts.userId,
    action: opts.action,
    category: opts.category,
    resource_type: opts.resourceType,
    resource_id: opts.resourceId,
    app: opts.app,
    metadata: opts.metadata ?? {},
    ip_address: opts.ipAddress,
  });
  if (error) {
    // 監査ログの失敗で本体処理を止めない
    console.error("Audit log insert failed:", error);
  }
}
