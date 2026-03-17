import { NextRequest } from "next/server";
import { getCandidateInfo } from "@/utils/api/routes/candidate-info";
import {
  unauthorizedResponse,
  notFoundResponse,
  errorResponse,
  successResponse,
} from "@/utils/api/response";
import { checkRateLimit } from "@/utils/validation/rate-limit";

export async function GET(request: NextRequest) {
  try {
    // レート制限（30回/分）
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (!checkRateLimit(`candidate-info:${clientIp}`, 30, 60000)) {
      return errorResponse("リクエストが多すぎます", 429);
    }

    const result = await getCandidateInfo();
    return successResponse(result);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "";
    if (errorMessage === "ログインしていません") {
      return unauthorizedResponse(errorMessage);
    }
    if (errorMessage.includes("取得に失敗")) {
      return notFoundResponse(errorMessage);
    }
    return errorResponse("学生情報の取得に失敗しました", 500);
  }
}

