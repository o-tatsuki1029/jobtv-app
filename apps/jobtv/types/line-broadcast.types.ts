import type { Tables } from "@jobtv-app/shared/types";

export type LineBroadcastLog = Tables<"line_broadcast_logs">;
export type LineBroadcastDelivery = Tables<"line_broadcast_deliveries">;

export type LineBroadcastLogStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled";

export type LineBroadcastDeliveryStatus =
  | "pending"
  | "success"
  | "failed"
  | "blocked";

export interface LineBroadcastLogStats {
  totalSent: number;
  totalFailed: number;
  totalBlocked: number;
  totalBroadcasts: number;
}

export interface LineBroadcastDeliveryWithCandidate
  extends LineBroadcastDelivery {
  candidate_name: string;
  school_name: string | null;
  graduation_year: number | null;
}
