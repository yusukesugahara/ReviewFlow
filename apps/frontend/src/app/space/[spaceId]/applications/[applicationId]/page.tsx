import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-auth-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { getCurrentSessionUser } from "@/lib/server/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getApplicationCapabilities } from "@/features/applications/model/application-capabilities";
import { ApplicantApplicationActions } from "@/features/applications/components/applicant-application-actions";
import {
  ApplicationDetailView,
  type ApplicationCorrection,
  type ApplicationCorrectionTargetItem,
  type ApplicationDetailViewModel,
  type ApplicationFormField,
} from "@/features/applications/components/application-detail-view";
import {
  buildSpaceApplicationDetailHref,
  buildSpaceApplicationEditHrefByIds,
} from "@/features/applications/model/application-routes";
import { ReviewerApplicationActions } from "@/features/applications/components/reviewer-application-actions";

type PageProps = {
  params: Promise<{ spaceId: string; applicationId: string }>;
};

async function submitAction(applicationId: string): Promise<void> {
  "use server";
  const updatedRaw = await backendAuthFetchJson(`/applications/${applicationId}/submit`, {
    method: "POST",
    body: {},
  });
  const updated = unwrapData<ApplicationDetailViewModel>(updatedRaw);
  redirectToApplicationDetail(updated);
}

async function resubmitAction(applicationId: string): Promise<void> {
  "use server";
  const updatedRaw = await backendAuthFetchJson(`/applications/${applicationId}/resubmit`, {
    method: "POST",
    body: {},
  });
  const updated = unwrapData<ApplicationDetailViewModel>(updatedRaw);
  redirectToApplicationDetail(updated);
}

async function approveAction(applicationId: string, formData: FormData): Promise<void> {
  "use server";
  const comment = formData.get("comment");
  const updatedRaw = await backendAuthFetchJson(`/applications/${applicationId}/approve`, {
    method: "POST",
    body: { comment: typeof comment === "string" ? comment : undefined },
  });
  const updated = unwrapData<ApplicationDetailViewModel>(updatedRaw);
  redirectToApplicationDetail(updated);
}

async function rejectAction(applicationId: string, formData: FormData): Promise<void> {
  "use server";
  const comment = formData.get("comment");
  const updatedRaw = await backendAuthFetchJson(`/applications/${applicationId}/reject`, {
    method: "POST",
    body: { comment: typeof comment === "string" ? comment : undefined },
  });
  const updated = unwrapData<ApplicationDetailViewModel>(updatedRaw);
  redirectToApplicationDetail(updated);
}

async function returnAction(
  applicationId: string,
  fieldMap: Array<{ id: string; key: string }>,
  formData: FormData,
): Promise<void> {
  "use server";
  const overallComment = formData.get("overallComment");
  const fields: Array<{ fieldId: string; comment?: string }> = [];
  for (const field of fieldMap) {
    const selected = formData.get(`return:${field.id}`) === "on";
    if (!selected) {
      continue;
    }
    const comment = formData.get(`comment:${field.id}`);
    fields.push({
      fieldId: field.id,
      comment: typeof comment === "string" && comment.trim().length > 0 ? comment : undefined,
    });
  }

  if (fields.length === 0) {
    return;
  }

  const updatedRaw = await backendAuthFetchJson(`/applications/${applicationId}/return`, {
    method: "POST",
    body: {
      overallComment:
        typeof overallComment === "string" && overallComment.trim().length > 0
          ? overallComment
          : undefined,
      fields,
    },
  });
  const updated = unwrapData<ApplicationDetailViewModel>(updatedRaw);
  redirectToApplicationDetail(updated);
}

function redirectToApplicationDetail(application: ApplicationDetailViewModel): never {
  const detailHref = buildSpaceApplicationDetailHref(application);
  if (detailHref) {
    revalidatePath(detailHref);
    revalidatePath(`/space/${encodeURIComponent(application.groupId ?? "")}/applications`);
    redirect(detailHref);
  }

  redirect("/space");
}

export default async function SpaceApplicationDetailPage({ params }: PageProps) {
  const { spaceId, applicationId } = await params;

  try {
    const appRaw = await backendAuthFetchJson(`/applications/${applicationId}`);
    const app = unwrapData<ApplicationDetailViewModel>(appRaw);
    const [templateRaw, correctionsRaw, correctionTargetsRaw] = await Promise.all([
      backendAuthFetchJson(
        `/form-definitions?groupId=${encodeURIComponent(spaceId)}`,
      ),
      backendAuthFetchJson(`/applications/${applicationId}/corrections`),
      backendAuthFetchJson(`/applications/${applicationId}/correction-targets`),
    ]);
    const definition =
      unwrapData<{ definitions?: { fields?: ApplicationFormField[] }[] }>(
        templateRaw,
      ).definitions?.[0] ?? null;
    const fields = definition?.fields ?? [];
    const corrections =
      unwrapData<{ corrections?: ApplicationCorrection[] }>(correctionsRaw)
        .corrections ?? [];
    const openItems =
      unwrapData<{
        openCorrection?: { items?: ApplicationCorrectionTargetItem[] } | null;
      }>(correctionTargetsRaw).openCorrection?.items ?? [];
    const actor = await getCurrentSessionUser();
    const capabilities = getApplicationCapabilities(app, actor);
    const fieldMap = fields.map((field) => ({ id: field.id, key: field.fieldKey }));

    return (
      <ApplicationDetailView
        title="申請詳細"
        application={app}
        fields={fields}
        openCorrectionItems={openItems}
        corrections={corrections}
        showApplicantEmail
        showCurrentStep
        showTimestamps
        showCorrectionHistory
        showOpenCorrectionSummary
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/space/${encodeURIComponent(spaceId)}/applications`}>
                一覧へ戻る
              </Link>
            </Button>
            <ApplicantApplicationActions
              capabilities={capabilities}
              editHref={buildSpaceApplicationEditHrefByIds(spaceId, app.id)}
              submitAction={submitAction.bind(null, app.id)}
              resubmitAction={resubmitAction.bind(null, app.id)}
            />
          </div>
        }
        reviewerActions={
          <ReviewerApplicationActions
            fields={fields}
            capabilities={capabilities}
            approveAction={approveAction.bind(null, app.id)}
            rejectAction={rejectAction.bind(null, app.id)}
            returnAction={returnAction.bind(null, app.id, fieldMap)}
          />
        }
      />
    );
  } catch (error) {
    if (error instanceof BackendHttpError) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              申請詳細の取得に失敗しました（status: {error.status}）
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">申請詳細の取得に失敗しました</p>
        </CardContent>
      </Card>
    );
  }
}
