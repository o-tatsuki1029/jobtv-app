import { NextResponse, type NextRequest } from "next/server";
import { getUnauthenticatedRedirectUrl } from "@/utils/auth/redirect";

// Basic認証のチェック関数
function checkBasicAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false;
  }

  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString(
    "ascii",
  );
  const [username, password] = credentials.split(":");

  const validUsername = process.env.BASIC_AUTH_USER;
  const validPassword = process.env.BASIC_AUTH_PASSWORD;

  if (!validUsername || !validPassword) {
    return true; // 環境変数が設定されていない場合はスキップ
  }

  return username === validUsername && password === validPassword;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;

  // Basic認証のチェック（環境変数が設定されている場合のみ）
  if (process.env.BASIC_AUTH_USER && process.env.BASIC_AUTH_PASSWORD) {
    const scope = process.env.BASIC_AUTH_SCOPE || "all";

    if (scope === "all") {
      // 静的ファイルやNext.jsの内部ファイルは除外
      const isStaticFile =
        pathname.startsWith("/_next/") ||
        pathname.startsWith("/favicon.ico") ||
        /\.(svg|png|jpg|jpeg|gif|webp)$/.test(pathname);

      if (!isStaticFile && !checkBasicAuth(request)) {
        return new NextResponse("Unauthorized", {
          status: 401,
          headers: {
            "WWW-Authenticate": 'Basic realm="Secure Area"',
          },
        });
      }
    }
    // scope === "admin" の場合: agent-manager に admin ルートはないためスキップ
  }

  // 静的ファイルやNext.jsの内部ファイルは認証チェックをスキップ
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)
  ) {
    return response;
  }

  // 公開ルート（認証不要）
  const publicRoutes = [
    "/auth/login",
    "/auth/sign-up",
    "/auth/forgot-password",
    "/auth/update-password",
    "/auth/sign-up-success",
    "/auth/error",
  ];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // パスワードリセットページは認証不要（ハッシュパラメータを処理するため）
  if (
    pathname.startsWith("/auth/update-password") ||
    pathname.startsWith("/auth/reset-password")
  ) {
    return response;
  }

  // Supabaseセッションクッキーの存在をチェック（詳細な認証チェックはサーバーコンポーネントで）
  // Edge Runtimeの制約により、ここではセッションクッキーの存在のみを確認
  const cookies = request.cookies.getAll();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let hasSessionCookie = false;

  if (supabaseUrl) {
    // Supabaseのプロジェクト参照IDを抽出
    const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
    if (urlMatch) {
      const projectRef = urlMatch[1];
      // Supabaseの認証関連クッキーをチェック
      hasSessionCookie = cookies.some(
        (c) =>
          c.name.startsWith(`sb-${projectRef}-auth-token`) ||
          c.name.startsWith(`sb-${projectRef}-auth-token-code-verifier`),
      );
    }
  }

  // セッションクッキーがない場合
  if (!hasSessionCookie) {
    if (!isPublicRoute && pathname !== "/") {
      return NextResponse.redirect(
        getUnauthenticatedRedirectUrl(pathname, request.url),
      );
    }
    return response;
  }

  // ログインページやサインアップページにアクセスしている場合
  // ロールに応じたリダイレクトはサーバーコンポーネント側で処理
  if (pathname === "/auth/login" || pathname === "/auth/sign-up") {
    return response;
  }

  // セッションクッキーが存在する場合、アクセスを許可
  // 詳細な認証チェックとロールベースのアクセス制御は各ページのサーバーコンポーネントで行う

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
