import { checkProxyLoginStatus } from "@/lib/actions/proxy-login-actions";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await checkProxyLoginStatus();
    
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Get proxy login status error:", error);
    return NextResponse.json(
      { error: "プロキシログイン状態の取得に失敗しました" },
      { status: 500 }
    );
  }
}

