import { NextResponse, type NextRequest } from "next/server";

// Basic認証のチェック関数
function checkBasicAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false;
  }

  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
  const [username, password] = credentials.split(":");

  const validUsername = process.env.BASIC_AUTH_USER;
  const validPassword = process.env.BASIC_AUTH_PASSWORD;

  if (!validUsername || !validPassword) {
    return true; // 環境変数が設定されていない場合はスキップ
  }

  return username === validUsername && password === validPassword;
}

// Supabaseセッションクッキーの存在をチェック
function hasSupabaseSessionCookie(request: NextRequest): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return false;
  }

  const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
  if (!urlMatch) {
    return false;
  }

  const projectRef = urlMatch[1];
  const cookies = request.cookies.getAll();
  
  return cookies.some(
    (c) =>
      c.name.startsWith(`sb-${projectRef}-auth-token`) ||
      c.name.startsWith(`sb-${projectRef}-auth-token-code-verifier`)
  );
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Basic認証のチェック（環境変数が設定されている場合のみ）
  const basicAuthUsername = process.env.BASIC_AUTH_USER;
  const basicAuthPassword = process.env.BASIC_AUTH_PASSWORD;

  if (basicAuthUsername && basicAuthPassword) {
    // 静的ファイルやNext.jsの内部ファイルは除外
    const isStaticFile =
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon.ico") ||
      pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/);

    if (!isStaticFile && !checkBasicAuth(request)) {
      return new NextResponse("Unauthorized", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Secure Area"',
        },
      });
    }
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
  const publicRoutes = ["/login", "/signup", "/api"];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // パスワードリセットページは認証不要（ハッシュパラメータを処理するため）
  if (pathname.startsWith("/login/update-password") || pathname.startsWith("/login/reset-password")) {
    return response;
  }

  // 学生専用ログインページは公開
  if (pathname === "/candidate/login") {
    return response;
  }

  // 学生ページへのアクセスの場合、クッキーからcandidate_idを確認
  if (pathname.startsWith("/candidate") && pathname !== "/candidate/login") {
    const candidateId = request.cookies.get("candidate_id")?.value;
    
    // クッキーにcandidate_idがある場合、学生として認証済みとみなす
    if (candidateId) {
      return response;
    }
    
    // セッションクッキーをチェック（管理者が学生としてアクセスする場合）
    if (hasSupabaseSessionCookie(request)) {
      return response;
    }
    
    // 認証されていない場合、学生専用ログインページにリダイレクト
    return NextResponse.redirect(new URL("/candidate/login", request.url));
  }

  // Supabaseセッションクッキーの存在をチェック
  if (!hasSupabaseSessionCookie(request)) {
    if (!isPublicRoute && pathname !== "/") {
      const loginUrl = new URL("/login/", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // ログインページやサインアップページにアクセスしている場合
  // ロールに応じたリダイレクトはサーバーコンポーネント側で処理
  if (pathname === "/login" || pathname === "/signup") {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

