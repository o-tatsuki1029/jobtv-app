import { NextRequest, NextResponse } from "next/server";
import { recruiterSignIn } from "@/lib/actions/recruiter-auth-actions";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const result = await recruiterSignIn(formData);

  if (result.error) {
    const url = new URL("/studio/login", request.url);
    url.searchParams.set("error", result.error);
    const email = formData.get("email") as string;
    if (email) url.searchParams.set("email", email);
    return NextResponse.redirect(url, 303);
  }

  return NextResponse.redirect(new URL(result.redirectUrl!, request.url), 303);
}
