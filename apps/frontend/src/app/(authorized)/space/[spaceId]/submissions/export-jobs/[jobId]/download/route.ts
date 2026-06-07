import { NextResponse } from "next/server";
import { getServerApiBaseUrl, getServerAuthEnv } from "@/lib/server/env";
import { getAccessTokenFromCookie } from "@/lib/server/session";

type DownloadRouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_request: Request, context: DownloadRouteContext) {
  const { jobId } = await context.params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.redirect(new URL("/login", _request.url));
  }

  const response = await fetch(
    `${getServerApiBaseUrl()}/export-jobs/${encodeURIComponent(jobId)}/download`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-API-Key": getServerAuthEnv().INTERNAL_API_KEY,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return new NextResponse("CSV download failed", { status: response.status });
  }

  const content = await response.arrayBuffer();
  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "text/csv; charset=utf-8",
      "Content-Disposition":
        response.headers.get("content-disposition") ??
        `attachment; filename="export-${jobId}.csv"`,
    },
  });
}
