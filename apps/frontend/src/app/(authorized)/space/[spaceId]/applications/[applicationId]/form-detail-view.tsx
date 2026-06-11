import Link from "next/link";
import { ArrowLeft, CalendarClock, ClipboardList, Edit3 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { PublicApplicationUrlCopyButton } from "@/components/applications/public-application-url-card";
import { DynamicFieldsTable } from "@/components/applications/dynamic-fields";
import { ApprovalProgressDiagram } from "@/components/applications/application-detail-view";
import {
  isPublishedApplicationStatus,
  isReturnedApplication,
  isSpaceNeedsActionApplication,
} from "@/components/applications/application-status-rules";
import { formatDateTimeJa } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import { DescriptionEditModal } from "./description-edit-modal";
import type { FormDetailViewProps } from "./types";

export function FormDetailView({
  application,
  definition,
  fields,
  relatedApplications,
  spaceId,
  publicApplicationUrlPath,
  editHref,
  descriptionAction,
}: FormDetailViewProps) {
  const returnCount = relatedApplications.filter(isReturnedApplication).length;
  const waitingCount = relatedApplications.filter(
    isSpaceNeedsActionApplication,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-1">
            <Link href={`/space/${encodeURIComponent(spaceId)}/applications`}>
              <ArrowLeft aria-hidden="true" />
              一覧へ戻る
            </Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">
            フォーム詳細
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            利用者に公開する申請フォームの内容と受付状況を確認できます
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <ApplicationStatusBadge
                  status={application.status}
                  className="px-3 py-1"
                />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                  {fields.length}項目
                </span>
              </div>
              <div>
                <CardTitle className="break-words text-2xl leading-tight text-slate-950">
                  {definition?.name ?? "フォーム"}
                </CardTitle>
                <CardDescription className="mt-2">
                  公開フォームとして利用者に表示される内容です
                </CardDescription>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <DescriptionEditModal
                action={descriptionAction}
                initialDescription={definition?.description ?? ""}
              />
              {isPublishedApplicationStatus(application.status) ? (
                <PublicApplicationUrlCopyButton path={publicApplicationUrlPath} />
              ) : (
                <span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-muted-foreground">
                  未公開
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-500">説明</p>
            <p className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
              {definition?.description?.trim() || "説明は設定されていません。"}
            </p>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <TimestampPanel
              label="作成日"
              value={formatDateTime(definition?.createdAt ?? application.createdAt)}
            />
            <TimestampPanel
              label="更新日"
              value={formatDateTime(definition?.updatedAt ?? application.updatedAt)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <InfoPanel label="申請件数" value={relatedApplications.length} tone="blue" />
        <InfoPanel label="差し戻し件数" value={returnCount} tone="amber" />
        <InfoPanel label="確認待ち件数" value={waitingCount} tone="slate" />
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">フォームの内容</CardTitle>
              <CardDescription>
                利用者が申請時に見る入力フォームです
              </CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={editHref}
                    className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
                    aria-label="フォームの内容を編集"
                  >
                    <Edit3 aria-hidden="true" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>フォームの内容を編集</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-muted-foreground">
              フォーム項目はまだありません
            </p>
          ) : (
            <div className="space-y-4">
              <DynamicFieldsTable
                fields={fields.map((field) => ({
                  ...field,
                  required: field.required ?? false,
                }))}
              />
              <Button type="button" disabled className="w-full">
                申請を送信
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ApprovalProgressDiagram
        application={application}
        corrections={[]}
        fields={fields}
        steps={application.approvalProgress ?? []}
      />
    </div>
  );
}

function InfoPanel({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "blue" | "amber" | "slate";
}) {
  const toneClass = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    slate: "border-slate-200 bg-white text-slate-700",
  }[tone];

  return (
    <div className={`rounded-xl border px-4 py-4 shadow-sm ${toneClass}`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-950">
        {value}
      </p>
    </div>
  );
}

function TimestampPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
        <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        <p className="truncate text-xs font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function formatDateTime(value?: string): string {
  return value ? formatDateTimeJa(value) : "-";
}
