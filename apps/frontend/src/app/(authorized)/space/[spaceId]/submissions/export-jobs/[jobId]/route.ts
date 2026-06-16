import { NextResponse } from "next/server";
import { getServerApiBaseUrl, getServerAuthEnv } from "@/lib/server/env";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import type { ExportJobResponse, GetExportJobSuccessJson } from "@/lib/schema";

type ExportJobRouteContext = {
  params: Promise<{ jobId: string }>;
};

/**
 * CSV 出力ジョブの状態をバックエンドから取得して返します。
 */
export async function GET(_request: Request, context: ExportJobRouteContext) {
  const { jobId } = await context.params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const response = await fetch(
    `${getServerApiBaseUrl()}/export-jobs/${encodeURIComponent(jobId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-API-Key": getServerAuthEnv().INTERNAL_API_KEY,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { message: "CSV export job status fetch failed" },
      { status: response.status },
    );
  }

  const body = (await response.json()) as GetExportJobSuccessJson;
  return NextResponse.json(
    unwrapResponseData<ExportJobResponse>({ response, data: body }),
  );
}
