"use client";

import Link from "next/link";
import { useId, useState } from "react";
import {
  ArrowRight,
  Copy,
  FilePlusCorner,
  RotateCcw,
  Trash2,
} from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import { ApplicationEmptyState } from "@/components/applications/application-empty-state";
import { buildSpaceApplicationNewHref } from "@/components/applications/application-routes";
import {
  archiveFormDefinitionAction,
  restoreFormDefinitionAction,
} from "@/app/(authorized)/space/[spaceId]/applications/actions";
import type { SpaceApplicationsPageContentProps } from "@/components/space/space-applications.types";
import {
  buildApplicationFormListRows,
  type ApplicationFormListRow,
} from "./space-applications.helpers";

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
                      <TooltipProvider>
                        <div className="flex flex-wrap justify-end gap-2">
                          {!showArchived && row.detailHref ? (
                            <Button asChild variant="outline" size="sm">
                              <Link href={row.detailHref} title="フォーム詳細">
                                詳細
                                <ArrowRight aria-hidden="true" />
                              </Link>
                            </Button>
                          ) : null}
                          {!showArchived && row.publicHref ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  aria-label="公開URLをコピー"
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
                                >
                                  <Copy aria-hidden="true" />
                                  <span className="sr-only">
                                    {copiedPublicHref === row.publicHref ? "コピー済み" : ""}
                                  </span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>公開URLをコピー</TooltipContent>
                            </Tooltip>
                          ) : !showArchived ? (
                            <span className="self-center text-sm text-muted-foreground">
                              未公開
                            </span>
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  aria-label="削除"
                                  onClick={() => setArchiveTarget(row)}
                                >
                                  <Trash2 aria-hidden="true" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>削除</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TooltipProvider>
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
