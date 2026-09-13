import { NextResponse, type NextRequest } from "next/server";
import { safeAuthDestination } from "@/lib/redirects";
import { getSiteUrl } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const OTP_TYPES = new Set(["signup", "recovery"] as const);

export async function GET(request: NextRequest) {
  const destination = safeAuthDestination(
    request.nextUrl.searchParams.get("next"),
  );
  const failure = new URL("/login?error=confirmation", getSiteUrl());
  const supabase = await createSupabaseServerClient(true);
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(
      error ? failure : new URL(destination, getSiteUrl()),
    );
  }
  if (tokenHash && type && OTP_TYPES.has(type as "signup" | "recovery")) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "recovery",
    });
    return NextResponse.redirect(
      error ? failure : new URL(destination, getSiteUrl()),
    );
  }
  return NextResponse.redirect(failure);
}
