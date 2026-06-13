import Link from "next/link";
import { ClipboardList, Inbox, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SpaceOverviewViewProps } from "./types";
import { SpaceOverviewPublishedForms } from "./_components/space-overview-published-forms";
import { SpaceOverviewRecentApplications } from "./_components/space-overview-recent-applications";
import { SpaceOverviewSummaryCards } from "./_components/space-overview-summary-cards";
import { buildSpaceOverviewViewModel } from "./_view-models/space-overview-view-model";

export function SpaceOverviewView({
  applications,
  canManageSpace,
  currentUserId,
  fetchErrorStatus,
  formDefinitions,
  isTenantAdmin,
  members,
  space,
}: SpaceOverviewViewProps) {
  if (fetchErrorStatus !== undefined || !space) {
    return (
      <Alert variant="destructive">
        <AlertTitle>スペース概要の取得に失敗しました</AlertTitle>
        <AlertDescription>
          status: {fetchErrorStatus ?? 404}。通信状況とスペース権限を確認してください。
        </AlertDescription>
      </Alert>
    );
  }

  const viewModel = buildSpaceOverviewViewModel({
    applications,
    canManageSpace,
    currentUserId,
    formDefinitions,
    isTenantAdmin,
    members,
    space,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="break-words text-2xl font-semibold tracking-tight text-slate-950">
              {space.name}
            </h1>
            <Badge variant="outline">{viewModel.roleLabel}</Badge>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            {viewModel.descriptionText}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button asChild variant="outline" className="bg-white">
            <Link href={viewModel.submissionsHref}>
              <Inbox aria-hidden="true" />
              申請一覧
            </Link>
          </Button>
          <Button asChild variant="outline" className="bg-white">
            <Link href={viewModel.formsHref}>
              <ClipboardList aria-hidden="true" />
              フォーム一覧
            </Link>
          </Button>
          {viewModel.canShowMembers ? (
            <Button asChild variant="outline" className="bg-white">
              <Link href={viewModel.membersHref}>
                <Users aria-hidden="true" />
                メンバー
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <SpaceOverviewSummaryCards stats={viewModel.stats} />

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)]">
        <SpaceOverviewRecentApplications
          applications={viewModel.recentApplications}
          submissionsHref={viewModel.submissionsHref}
        />
        <SpaceOverviewPublishedForms
          formNewHref={viewModel.formNewHref}
          forms={viewModel.publishedForms}
          formsHref={viewModel.formsHref}
        />
      </div>
    </div>
  );
}
