"use server";

import { redirect } from "next/navigation";
import { requestFormAccessSchema } from "@/lib/auth-schema";
import { client } from "@/lib/server/backend-fetch";
import type {
  RequestFormAccessBody,
  RequestFormAccessSuccessJson,
} from "@/lib/schema";

export async function requestAccessAction(formData: FormData): Promise<void> {
  const parsed = requestFormAccessSchema.safeParse({
    groupId: formData.get("groupId"),
    formDefinitionId: formData.get("formDefinitionId") || undefined,
    email: formData.get("email"),
  });

  if (!parsed.success) {
    const groupId = String(formData.get("groupId") ?? "");
    redirect(
      `/apply/${encodeURIComponent(groupId)}?formError=メールアドレスを入力してください`,
    );
  }

  const body: RequestFormAccessBody = { email: parsed.data.email };

  try {
    const response = await client.POST(
      "/form-definitions/groups/{groupId}/request-access",
      {
        params: {
          path: { groupId: parsed.data.groupId },
          query: parsed.data.formDefinitionId
            ? { formDefinitionId: parsed.data.formDefinitionId }
            : undefined,
        },
        body,
      },
    );
    const data: RequestFormAccessSuccessJson | undefined = response.data;
    if (!response.response.ok || !data) {
      throw new Error("request access failed");
    }
  } catch {
    redirect(
      `/apply/${encodeURIComponent(parsed.data.groupId)}?toast=error&message=フォーム案内の送信に失敗しました`,
    );
  }

  redirect(`/apply/${encodeURIComponent(parsed.data.groupId)}?sent=1`);
}
