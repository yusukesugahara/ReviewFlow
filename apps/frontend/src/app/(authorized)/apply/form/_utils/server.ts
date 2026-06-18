import { cookies } from "next/headers";
import { APPLICANT_ACCESS_TOKEN_COOKIE_NAME } from "@/lib/constants/auth.constants";

/**
 * 公開申請者用トークン Cookie から backend API client 用ヘッダーを作成します。
 */
export async function applicantHeaders(): Promise<
  { "X-Applicant-Access-Token": string } | undefined
> {
  const cookieStore = await cookies();
  const token = cookieStore.get(APPLICANT_ACCESS_TOKEN_COOKIE_NAME)?.value;
  return token ? { "X-Applicant-Access-Token": token } : undefined;
}
