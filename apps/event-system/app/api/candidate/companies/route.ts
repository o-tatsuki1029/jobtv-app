import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getCandidateCompanies } from "@/utils/api/routes/candidate-companies";
import {
  validationErrorResponse,
  errorResponse,
  successResponse,
} from "@/utils/api/response";
import { checkRateLimit } from "@/utils/validation/rate-limit";

export async function GET(request: NextRequest) {
  try {
    // レート制限（30回/分）
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (!checkRateLimit(`candidate-companies:${clientIp}`, 30, 60000)) {
      return errorResponse("リクエストが多すぎます", 429);
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const candidateId = searchParams.get("candidateId");

    // クッキーの candidateId と一致するか検証（IDOR 防止）
    if (candidateId) {
      const cookieStore = await cookies();
      const cookieCandidateId = cookieStore.get("candidate_id")?.value;
      if (cookieCandidateId && candidateId !== cookieCandidateId) {
        return errorResponse("権限がありません", 403);
      }
    }

    const result = await getCandidateCompanies(eventId!, candidateId!);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "";
    if (errorMessage.includes("が必要です")) {
      return validationErrorResponse(errorMessage);
    }
    if (errorMessage.includes("出席登録されていません")) {
      return errorResponse(errorMessage, 403);
    }
    return errorResponse("企業の取得に失敗しました", 500);
  }
}

