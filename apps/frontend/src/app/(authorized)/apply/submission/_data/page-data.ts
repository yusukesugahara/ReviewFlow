import "server-only";

import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/relay/client";
import type { ApplicationDetail, FormDefinitionResponse } from "@/lib/schema";
import { applicantHeaders } from "../../form/_utils/server";
import type { PublicSubmissionPageData } from "../types";

/**
 * 申請者向け申請詳細画面に必要な申請情報とフォーム定義を読み込みます。
 */
export async function getPublicSubmissionPageData(): Promise<PublicSubmissionPageData> {
  const headers = await applicantHeaders();
  const [applicationRaw, definitionRaw] = await Promise.all([
    client.currentApplicationForApplicant({ headers }),
    client.currentFormDefinitionForApplicant({ headers }),
  ]);

  return {
    application: unwrapResponseData<ApplicationDetail>(applicationRaw),
    definition: unwrapResponseData<FormDefinitionResponse>(definitionRaw),
  };
}
