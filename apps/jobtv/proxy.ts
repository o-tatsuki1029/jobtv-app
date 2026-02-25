import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/** Basic認証のチェック（環境変数が未設定の場合はスキップ）。Edge 対応で atob を使用 */
function checkBasicAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false;
  }
  const base64Credentials = authHeader.split(" ")[1];
  if (!base64Credentials) return false;
  try {
    const credentials = atob(base64Credentials);
    const [username, password] = credentials.split(":");
    const validUsername = process.env.BASIC_AUTH_USER;
    const validPassword = process.env.BASIC_AUTH_PASSWORD;
    if (!validUsername || !validPassword) {
      return true;
    }
    return username === validUsername && password === validPassword;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Basic認証（環境変数が両方設定されている場合のみ）
  const basicAuthUsername = process.env.BASIC_AUTH_USER;
  const basicAuthPassword = process.env.BASIC_AUTH_PASSWORD;

  if (basicAuthUsername && basicAuthPassword) {
    const isStaticFile =
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon.ico") ||
      /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/.test(pathname);
    const basicOk = checkBasicAuth(request);

    if (!isStaticFile && !basicOk) {
      return new NextResponse("Unauthorized", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Secure Area"'
        }
      });
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
