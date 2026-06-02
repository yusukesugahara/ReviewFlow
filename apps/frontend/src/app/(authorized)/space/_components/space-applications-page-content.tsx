"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Archive, ArrowRight, Copy, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/app/_components/enterprise/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import { ApplicationEmptyState } from "@/app/_components/applications/application-empty-state";
import {
  buildSpaceApplicationDetailHref,
  buildSpaceApplicationNewHref,
} from "@/app/_components/applications/application-routes";
import {
  archiveFormDefinitionAction,
  restoreFormDefinitionAction,
} from "@/app/(authorized)/space/[spaceId]/applications/actions";
import type {
  ApplicationRow,
  FormDefinitionRow,
  SpaceApplicationsPageContentProps,
} from "./space-applications.types";

export function SpaceApplicationsPageContent({
  applications,
  formDefinitions,
  fetchErrorStatus,
  showArchived,
  spaceId,
}: SpaceApplicationsPageContentProps) {
  const [archiveTarget, setArchiveTarget] = useState<ApplicationFormListRow | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<ApplicationFormListRow | null>(null);
  const [copiedPublicHref, setCopiedPublicHref] = useState<string | null>(null);
  const archiveTitleId = useId();
  const archiveDescriptionId = useId();
  const restoreTitleId = useId();
  const restoreDescriptionId = useId();

  if (fetchErrorStatus !== undefined) {
    return (
      <Alert variant="destructive">
        <AlertTitle>申請フォーム一覧の取得に失敗しました</AlertTitle>
        <AlertDescription>status: {fetchErrorStatus}</AlertDescription>
      </Alert>
    );
  }

  const setupApplications = applications.filter(isFormSetupApplication);
  const submittedApplications = applications.filter((row) => !isFormSetupApplication(row));
  const displayDefinitions =
    formDefinitions.length > 0
      ? formDefinitions
      : buildFallbackDefinitions(submittedApplications, spaceId);
  const rows = displayDefinitions.map((definition) =>
    buildApplicationFormListRow(definition, applications, setupApplications, spaceId),
  );
  const visibleRows = rows.filter((row) =>
    showArchived
      ? row.status === APPLICATION_STATUSES.archived
      : row.status !== APPLICATION_STATUSES.archived,
  );
  const activeHref = `/space/${encodeURIComponent(spaceId)}/applications`;
  const archivedHref = `${activeHref}?archived=true`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Applications"
        title="申請フォーム一覧"
        description="作成した申請フォームごとに、公開状態、未処理件数、利用者から届いた申請を確認できます。"
        actions={
          <Button asChild>
          <Link href={buildSpaceApplicationNewHref(spaceId)}>新規申請</Link>
          </Button>
        }
      />

      <Tabs>
        <TabsList aria-label="申請フォームの表示切り替え">
          <TabsTrigger href={activeHref} active={!showArchived}>
            申請フォーム
          </TabsTrigger>
          <TabsTrigger href={archivedHref} active={showArchived}>
            <Archive aria-hidden="true" />
            削除済み
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="border-b border-slate-200">
          <CardTitle>{showArchived ? "削除済み申請フォーム" : "申請フォーム"}</CardTitle>
          <CardDescription>
            {showArchived
              ? "削除済みに移動したフォームを確認し、必要に応じて復元します"
              : "公開URLの確認やフォーム詳細を管理します"}
          </CardDescription>
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
                  <Button asChild variant="outline">
                    <Link href={buildSpaceApplicationNewHref(spaceId)}>
                      新規申請
                    </Link>
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>申請タイトル</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead className="text-right">未処理</TableHead>
                  <TableHead className="text-right">処理済み</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((row) => (
                  <TableRow key={row.definitionId}>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell>
                      <FormDefinitionStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.pendingCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.processedCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {!showArchived && row.detailHref ? (
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={row.detailHref}
                              title="フォーム詳細"
                            >
                              詳細
                              <ArrowRight aria-hidden="true" />
                            </Link>
                          </Button>
                        ) : null}
                        {!showArchived && row.publicHref ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const publicUrl = `${window.location.origin}${row.publicHref}`;
                              void navigator.clipboard
                                .writeText(publicUrl)
                                .then(() => {
                                  setCopiedPublicHref(row.publicHref);
                                  toast.success("公開URLをコピーしました");
                                  window.setTimeout(() => setCopiedPublicHref(null), 1200);
                                })
                                .catch(() => {
                                  toast.error("公開URLのコピーに失敗しました");
                                });
                            }}
                            title="公開URLをコピー"
                          >
                            公開URL
                            <Copy aria-hidden="true" />
                            <span className="sr-only">
                              {copiedPublicHref === row.publicHref ? "コピー済み" : ""}
                            </span>
                          </Button>
                        ) : !showArchived ? (
                          <span className="self-center text-sm text-muted-foreground">未公開</span>
                        ) : null}
                        {showArchived ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setRestoreTarget(row)}
                          >
                            <RotateCcw aria-hidden="true" />
                            復元
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setArchiveTarget(row)}
                          >
                            <Trash2 aria-hidden="true" />
                            削除
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {archiveTarget ? (
        <FormDefinitionArchiveDialog
          descriptionId={archiveDescriptionId}
          onCancel={() => setArchiveTarget(null)}
          spaceId={spaceId}
          target={archiveTarget}
          titleId={archiveTitleId}
        />
      ) : null}

      {restoreTarget ? (
        <FormDefinitionRestoreDialog
          descriptionId={restoreDescriptionId}
          onCancel={() => setRestoreTarget(null)}
          spaceId={spaceId}
          target={restoreTarget}
          titleId={restoreTitleId}
        />
      ) : null}
    </div>
  );
}

function FormDefinitionArchiveDialog({
  descriptionId,
  onCancel,
  spaceId,
  target,
  titleId,
}: {
  descriptionId: string;
  onCancel: () => void;
  spaceId: string;
  target: ApplicationFormListRow;
  titleId: string;
}) {
  return (
    <DialogContent
      descriptionId={descriptionId}
      titleId={titleId}
      onClose={onCancel}
    >
      <form
        action={archiveFormDefinitionAction.bind(null, target.definitionId, spaceId)}
        className="space-y-5"
      >
        <DialogHeader>
          <DialogTitle id={titleId}>申請フォームを削除しますか</DialogTitle>
          <DialogDescription id={descriptionId}>
            {target.title} を削除済みに移動します。削除済み一覧から復元できます。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
          <Button type="submit" variant="destructive">
            削除
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function FormDefinitionRestoreDialog({
  descriptionId,
  onCancel,
  spaceId,
  target,
  titleId,
}: {
  descriptionId: string;
  onCancel: () => void;
  spaceId: string;
  target: ApplicationFormListRow;
  titleId: string;
}) {
  return (
    <DialogContent
      descriptionId={descriptionId}
      titleId={titleId}
      onClose={onCancel}
    >
      <form
        action={restoreFormDefinitionAction.bind(null, target.definitionId, spaceId)}
        className="space-y-5"
      >
        <DialogHeader>
          <DialogTitle id={titleId}>申請フォームを復元しますか</DialogTitle>
          <DialogDescription id={descriptionId}>
            {target.title} を申請フォーム一覧へ戻します。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
          <Button type="submit">復元</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function isFormSetupApplication(row: ApplicationRow): boolean {
  return (
    row.status === APPLICATION_STATUSES.draft ||
    row.status === APPLICATION_STATUSES.published
  );
}

type ApplicationFormListRow = {
  definitionId: string;
  detailHref: string | null;
  pendingCount: number;
  processedCount: number;
  publicHref: string | null;
  status: string;
  title: string;
};

function buildApplicationFormListRow(
  definition: FormDefinitionRow,
  applications: ApplicationRow[],
  setupApplications: ApplicationRow[],
  spaceId: string,
): ApplicationFormListRow {
  const relatedApplications = applications.filter(
    (row) => row.formDefinitionId === definition.id && !isFormSetupApplication(row),
  );
  const setupApplication = setupApplications.find(
    (row) => row.formDefinitionId === definition.id,
  );
  const detailHref = setupApplication
    ? buildSpaceApplicationDetailHref(setupApplication) ??
      `/space/${encodeURIComponent(spaceId)}/applications/${encodeURIComponent(setupApplication.id)}`
    : null;
  const formDetailHref = detailHref ? appendQueryParam(detailHref, "view", "form") : null;
  const isPublished = definition.status === APPLICATION_STATUSES.published;

  return {
    definitionId: definition.id,
    detailHref: formDetailHref,
    pendingCount: relatedApplications.filter(isPendingApplicationStatus).length,
    processedCount: relatedApplications.filter(isProcessedApplicationStatus).length,
    publicHref: isPublished
      ? `/apply/${encodeURIComponent(definition.groupId || spaceId)}?formDefinitionId=${encodeURIComponent(definition.id)}`
      : null,
    status: definition.status,
    title: definition.name,
  };
}

function appendQueryParam(href: string, key: string, value: string): string {
  const [pathname, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set(key, value);
  return `${pathname}?${params.toString()}`;
}

function isPendingApplicationStatus(row: ApplicationRow): boolean {
  return (
    row.status === APPLICATION_STATUSES.submitted ||
    row.status === APPLICATION_STATUSES.inReview ||
    row.status === APPLICATION_STATUSES.returned
  );
}

function isProcessedApplicationStatus(row: ApplicationRow): boolean {
  return (
    row.status === APPLICATION_STATUSES.approved ||
    row.status === APPLICATION_STATUSES.rejected
  );
}

function buildFallbackDefinitions(
  rows: ApplicationRow[],
  spaceId: string,
): FormDefinitionRow[] {
  const definitions = new Map<string, FormDefinitionRow>();
  for (const row of rows) {
    const id = row.formDefinitionId;
    if (!id || definitions.has(id)) {
      continue;
    }
    definitions.set(id, {
      id,
      groupId: row.groupId || spaceId,
      name: row.formDefinitionName?.trim() || row.applicationName?.trim() || "-",
      status: APPLICATION_STATUSES.published,
      fields: [],
      createdAt: row.createdAt,
      updatedAt: row.createdAt,
    });
  }
  return Array.from(definitions.values());
}

function FormDefinitionStatusBadge({ status }: { status: string }) {
  const isPublished = status === APPLICATION_STATUSES.published;
  const isArchived = status === APPLICATION_STATUSES.archived;
  const label = isPublished
    ? "公開済み"
    : isArchived
      ? "削除済み"
      : status === APPLICATION_STATUSES.draft
        ? "下書き"
        : status;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${
        isArchived
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : isPublished
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      {label}
    </span>
  );
}
