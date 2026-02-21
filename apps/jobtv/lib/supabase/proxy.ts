import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request
  });

  // Fluid computeを使用する場合、このクライアントをグローバル環境変数に置かないでください。
  // 常にリクエストごとに新しく作成してください。
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request
          });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        }
      }
    }
  );

  // createServerClient と supabase.auth.getUser() の間でコードを実行しないでください。
  // 単純なミスにより、ユーザーがランダムにログアウトされる問題のデバッグが
  // 非常に困難になる可能性があります。

  const { data } = await supabase.auth.getUser();

  const user = data.user;

  // 公開ルートの定義（未ログインでもアクセス可能）
  const publicRoutes = [
    "/auth",
    "/company",
    "/job",
    "/session",
    "/api/auth",
    "/lp",
    "/admin/login",
    "/studio/login",
  ];
  const isPublicRoute =
    publicRoutes.some((route) => request.nextUrl.pathname.startsWith(route)) || request.nextUrl.pathname === "/";

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();

    if (request.nextUrl.pathname.startsWith("/admin")) {
      url.pathname = "/admin/login";
    } else if (request.nextUrl.pathname.startsWith("/studio")) {
      url.pathname = "/studio/login";
    } else {
      url.pathname = "/auth/login";
    }

    return NextResponse.redirect(url);
  }

  // 重要：supabaseResponseオブジェクトは必ずそのまま返してください。
  // もし NextResponse.next() で新しいレスポンスオブジェクトを作成する場合は、
  // 以下の点に注意してください：
  // 1. 次のようにリクエストを渡す：
  //    const myNewResponse = NextResponse.next({ request })
  // 2. 次のようにクッキーをコピーする：
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. myNewResponseオブジェクトを必要に応じて変更する。ただし、クッキーは変更しないこと！
  // 4. 最後に：
  //    return myNewResponse
  // これらが行われない場合、ブラウザとサーバーの同期が崩れ、
  // ユーザーのセッションが予期せず終了する可能性があります！

  return supabaseResponse;
}
