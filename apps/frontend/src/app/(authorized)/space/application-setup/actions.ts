"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createApplicationSetup,
  updateApplicationSetup,
} from "./_api/application-setup-api";
import { readApplicationSetupActionInput } from "./_utils/application-setup-action-input";
import {
  buildApplicationSetupDetailPath,
  buildApplicationSetupListPath,
  redirectUrlWithParams,
  resolveCreateApplicationSetupRedirectBase,
  resolveUpdateApplicationSetupRedirectBase,
  setupErrorRedirectUrl,
} from "./_utils/application-setup-navigation";

/**
 * 新規申請フォームのセットアップ入力を保存し、作成した詳細画面へ遷移します。
 */
export async function submitApplicationSetupAction(
  formData: FormData,
): Promise<void> {
  const redirectBase = resolveCreateApplicationSetupRedirectBase(formData);
  const parsedInput = readApplicationSetupActionInput(formData);

  if (!parsedInput.success) {
    redirect(
      redirectUrlWithParams(redirectBase, {
        setupError: parsedInput.error,
      }),
    );
  }

  const input = parsedInput.data;
  let created: Awaited<ReturnType<typeof createApplicationSetup>>;

  try {
    created = await createApplicationSetup(input);
  } catch (error) {
    redirect(setupErrorRedirectUrl(redirectBase, error));
  }

  const listPath = buildApplicationSetupListPath(input.spaceId);
  const detailPath = buildApplicationSetupDetailPath({
    applicationId: created.applicationId,
    applicationStatus: input.applicationStatus,
    definitionId: created.definitionId,
    spaceId: input.spaceId,
  });
  revalidatePath(redirectBase);
  revalidatePath(listPath);
  redirect(detailPath);
}

/**
 * 既存申請フォームのセットアップ入力を保存し、更新後の詳細画面へ遷移します。
 */
export async function updateApplicationSetupAction(
  applicationId: string,
  formData: FormData,
): Promise<void> {
  const redirectBase = resolveUpdateApplicationSetupRedirectBase(
    applicationId,
    formData,
  );
  const parsedInput = readApplicationSetupActionInput(formData);

  if (!parsedInput.success) {
    redirect(
      redirectUrlWithParams(redirectBase, {
        setupError: parsedInput.error,
      }),
    );
  }

  const input = parsedInput.data;
  let updated: Awaited<ReturnType<typeof updateApplicationSetup>>;

  try {
    updated = await updateApplicationSetup(applicationId, input);
  } catch (error) {
    redirect(setupErrorRedirectUrl(redirectBase, error));
  }

  const detailPath = buildApplicationSetupDetailPath({
    applicationId,
    applicationStatus: input.applicationStatus,
    definitionId: updated.definitionId,
    spaceId: input.spaceId,
  });
  revalidatePath(redirectBase);
  revalidatePath(buildApplicationSetupListPath(input.spaceId));
  revalidatePath(detailPath);
  redirect(detailPath);
}
