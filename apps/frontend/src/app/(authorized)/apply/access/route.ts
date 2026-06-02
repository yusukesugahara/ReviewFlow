import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { APPLICANT_ACCESS_TOKEN_COOKIE_NAME } from "@/lib/constants/auth.constants";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/apply/form";
  }
  return value;
}

function buildRedirectUrl(request: NextRequest, path: string) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  const proto =
    forwardedProto ?? (process.env.NODE_ENV === "production" ? "https" : "http");

  if (host) {
    return new URL(path, `${proto}://${host}`);
  }

  return new URL(path, request.url);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const redirectUrl = buildRedirectUrl(request, safeNextPath(url.searchParams.get("next")));

  if (!token) {
    redirectUrl.searchParams.set("error", "missing_token");
    return NextResponse.redirect(redirectUrl);
  }

  const store = await cookies();
  store.set(APPLICANT_ACCESS_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return NextResponse.redirect(redirectUrl);
}
