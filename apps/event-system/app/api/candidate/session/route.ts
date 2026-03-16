import { NextRequest } from "next/server";
import { getCandidateSession } from "@/utils/api/routes/candidate-session";
import { errorResponse, successResponse } from "@/utils/api/response";
import { checkRateLimit } from "@/utils/validation/rate-limit";

export async function GET(request: NextRequest) {
  try {
    // レート制限（30回/分）
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (!checkRateLimit(`candidate-session:${clientIp}`, 30, 60000)) {
      return errorResponse("リクエストが多すぎます", 429);
    }

    const result = await getCandidateSession();
    return successResponse(result);
  } catch (error) {
    return errorResponse("セッション情報の取得に失敗しました", 500);
  }
}

