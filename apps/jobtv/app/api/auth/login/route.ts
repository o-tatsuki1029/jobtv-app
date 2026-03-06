import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/actions/auth-actions";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const result = await signIn(formData);

  if (result.error) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("error", result.error);
    const email = formData.get("email") as string;
    if (email) url.searchParams.set("email", email);
    const next = formData.get("next") as string;
    if (next) url.searchParams.set("next", next);
    return NextResponse.redirect(url, 303);
  }

  return NextResponse.redirect(new URL(result.redirectUrl!, request.url), 303);
}
