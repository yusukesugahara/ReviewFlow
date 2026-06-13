"use client";

import Link from "next/link";
import { useState } from "react";
import { FilePlusCorner } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ApplicationEmptyState } from "@/components/applications/list/application-empty-state";
import { buildSpaceApplicationNewHref } from "@/components/applications/routing/application-routes";
import type { SpaceApplicationsPageContentProps } from "@/components/space/space-applications.types";
import {
  buildApplicationFormListRows,
  type ApplicationFormListRow,
} from "./space-applications.helpers";
import { SpaceApplicationFormsTable } from "./space-application-forms-table";
import {
  FormDefinitionArchiveDialog,
  FormDefinitionRestoreDialog,
} from "./form-definition-action-dialogs";

export function SpaceApplicationsPageContent({
  applications,
  formDefinitions,
  fetchErrorStatus,
  showArchived,
  spaceId,
}: SpaceApplicationsPageContentProps) {
  const [archiveTarget, setArchiveTarget] = useState<ApplicationFormListRow | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<ApplicationFormListRow | null>(null);

  if (fetchErrorStatus !== undefined) {
    return (
      <Alert variant="destructive">
        <AlertTitle>申請フォーム一覧の取得に失敗しました</AlertTitle>
        <AlertDescription>status: {fetchErrorStatus}</AlertDescription>
      </Alert>
    );
  }

  const visibleRows = buildApplicationFormListRows({
    applications,
    formDefinitions,
    showArchived,
    spaceId,
  });
  const activeHref = `/space/${encodeURIComponent(spaceId)}/applications`;
  const archivedHref = `${activeHref}?archived=true`;

  return (
    <div className="space-y-6">
      <Tabs>
        <TabsList aria-label="申請フォームの表示切り替え">
          <TabsTrigger href={activeHref} active={!showArchived}>
            申請フォーム
          </TabsTrigger>
          <TabsTrigger href={archivedHref} active={showArchived}>
            削除済み
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="border-b border-slate-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <CardTitle>{showArchived ? "削除済み申請フォーム" : "申請フォーム"}</CardTitle>
              <CardDescription>
                {showArchived
                  ? "削除済みに移動したフォームを確認し、必要に応じて復元します"
                  : "公開URLの確認やフォーム詳細を管理します"}
              </CardDescription>
            </div>
            {!showArchived ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild variant="outline" size="icon" className="sm:shrink-0">
                      <Link
                        href={buildSpaceApplicationNewHref(spaceId)}
                        aria-label="申請フォームを新規作成"
                      >
                        <FilePlusCorner aria-hidden="true" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>申請フォームを新規作成</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {visibleRows.length === 0 ? (
            <ApplicationEmptyState
              message={
                showArchived
                  ? "削除済みの申請フォームはありません"
                  : "作成した申請フォームはまだありません"
              }
              action={
                showArchived ? (
                  <Button asChild variant="outline">
                    <Link href={activeHref}>申請フォームへ戻る</Link>
                  </Button>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button asChild variant="outline" size="icon">
                          <Link
                            href={buildSpaceApplicationNewHref(spaceId)}
                            aria-label="申請フォームを新規作成"
                          >
                            <FilePlusCorner aria-hidden="true" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>申請フォームを新規作成</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              }
            />
          ) : (
            <SpaceApplicationFormsTable
              onArchive={setArchiveTarget}
              onRestore={setRestoreTarget}
              rows={visibleRows}
              showArchived={showArchived}
            />
          )}
        </CardContent>
      </Card>

      {archiveTarget ? (
        <FormDefinitionArchiveDialog
          onCancel={() => setArchiveTarget(null)}
          spaceId={spaceId}
          target={archiveTarget}
        />
      ) : null}

      {restoreTarget ? (
        <FormDefinitionRestoreDialog
          onCancel={() => setRestoreTarget(null)}
          spaceId={spaceId}
          target={restoreTarget}
        />
      ) : null}
    </div>
  );
}
