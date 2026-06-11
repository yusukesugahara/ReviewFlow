"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createApplicationSetup,
  updateApplicationSetup,
  type UpdateApplicationSetupInput,
} from "./application-setup-api";
import { readApplicationSetupActionInput } from "./application-setup-action-input";
import {
  buildApplicationSetupDetailPath,
  buildApplicationSetupListPath,
  redirectUrlWithParams,
  resolveCreateApplicationSetupRedirectBase,
  resolveUpdateApplicationSetupRedirectBase,
  setupErrorRedirectUrl,
} from "./application-setup-navigation";

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

  if (!input.currentFormDefinitionId || !input.currentApprovalFlowId) {
    redirect(setupErrorRedirectUrl(redirectBase, null));
  }

  const updateInput: UpdateApplicationSetupInput = {
    ...input,
    currentApprovalFlowId: input.currentApprovalFlowId,
    currentFormDefinitionId: input.currentFormDefinitionId,
  };

  try {
    await updateApplicationSetup(applicationId, updateInput);
  } catch (error) {
    redirect(setupErrorRedirectUrl(redirectBase, error));
  }

  const detailPath = buildApplicationSetupDetailPath({
    applicationId,
    applicationStatus: input.applicationStatus,
    definitionId: input.currentFormDefinitionId,
    spaceId: input.spaceId,
  });
  revalidatePath(redirectBase);
  revalidatePath(buildApplicationSetupListPath(input.spaceId));
  revalidatePath(detailPath);
  redirect(detailPath);
}
