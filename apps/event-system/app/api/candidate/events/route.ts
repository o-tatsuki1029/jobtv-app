import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getCandidateEvents } from "@/utils/api/routes/candidate-events";
import { errorResponse, successResponse } from "@/utils/api/response";
import { checkRateLimit } from "@/utils/validation/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    // レート制限（30回/分）
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (!checkRateLimit(`candidate-events:${clientIp}`, 30, 60000)) {
      return errorResponse("リクエストが多すぎます", 429);
    }

    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get("candidateId");

    // クッキーの candidateId と一致するか検証（IDOR 防止）
    if (candidateId) {
      const cookieStore = await cookies();
      const cookieCandidateId = cookieStore.get("candidate_id")?.value;
      if (cookieCandidateId && candidateId !== cookieCandidateId) {
        return errorResponse("権限がありません", 403);
      }
    }

    const result = await getCandidateEvents(candidateId);
    return successResponse(result);
  } catch (error: unknown) {
    logger.error({ action: "getCandidateEvents", err: error }, "候補者イベントの取得に失敗しました");
    const errorMessage =
      error instanceof Error ? error.message : "イベントの取得に失敗しました";
    return errorResponse(errorMessage, 500);
  }
}

