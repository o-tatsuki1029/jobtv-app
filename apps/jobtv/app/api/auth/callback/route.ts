import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // recovery, invite, etc.

  // パスワードリセットや招待の場合は適切なページにリダイレクト
  let next = searchParams.get("next");
  if (!next) {
    if (type === "recovery" || type === "invite") {
      // パスワードリセットまたは招待の場合は、パスワード更新ページへ
      next = `/auth/update-password?type=${type}`;
    } else {
      // その他の場合はトップページへ
      next = "/";
    }
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host"); // built-in header for next.js dev & prod
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        // we can be sure that origin is localhost:3000
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
