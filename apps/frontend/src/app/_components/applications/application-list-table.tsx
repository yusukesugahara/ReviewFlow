import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApplicationStatusBadge } from "./application-status-badge";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "Asia/Tokyo",
});

export type ApplicationListRow = {
  applicationName?: string | null;
  formDefinitionId?: string | null;
  formDefinitionName?: string | null;
  id: string;
  groupId?: string | null;
  status: string;
  applicantUserId?: string | null;
  createdAt: string;
  applicantEmail?: string;
};

function getApplicationName(row: ApplicationListRow): string {
  const applicationName = row.applicationName?.trim();
  if (applicationName) {
    return applicationName;
  }
  const formDefinitionName = row.formDefinitionName?.trim();
  if (formDefinitionName) {
    return formDefinitionName;
  }
  return "-";
}

function getApplicationKindLabel(row: ApplicationListRow): string {
  if (
    row.status === APPLICATION_STATUSES.draft ||
    row.status === APPLICATION_STATUSES.published
  ) {
    return `作成中（${row.status === APPLICATION_STATUSES.draft ? "下書き" : "公開済み"}）`;
  }
  if (row.applicantUserId === null) {
    return "利用者申請";
  }
  return "内部申請";
}

function getApplicationKindClassName(row: ApplicationListRow): string {
  if (
    row.status === APPLICATION_STATUSES.draft ||
    row.status === APPLICATION_STATUSES.published
  ) {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }
  if (row.applicantUserId === null) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

type ApplicationListTableProps = {
  rows: ApplicationListRow[];
  getDetailHref: (row: ApplicationListRow) => string;
  actionLabel?: string;
  openDetailInNewTab?: boolean;
  showApplicantEmail?: boolean;
};

export function ApplicationListTable({
  rows,
  getDetailHref,
  actionLabel = "詳細",
  openDetailInNewTab = false,
  showApplicantEmail = false,
}: ApplicationListTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>申請名</TableHead>
          <TableHead>区分</TableHead>
          <TableHead>ステータス</TableHead>
          {showApplicantEmail ? <TableHead>申請者</TableHead> : null}
          <TableHead>作成日時</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">
              {getApplicationName(row)}
            </TableCell>
            <TableCell>
              <span
                className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${getApplicationKindClassName(row)}`}
              >
                {getApplicationKindLabel(row)}
              </span>
            </TableCell>
            <TableCell>
              <ApplicationStatusBadge status={row.status} />
            </TableCell>
            {showApplicantEmail ? (
              <TableCell className="font-mono text-xs">
                {row.applicantEmail ?? "-"}
              </TableCell>
            ) : null}
            <TableCell className="text-muted-foreground">
              {dateTimeFormatter.format(new Date(row.createdAt))}
            </TableCell>
            <TableCell className="text-right">
              <Button asChild variant="outline" size="sm">
                <Link
                  href={getDetailHref(row)}
                  target={openDetailInNewTab ? "_blank" : undefined}
                  rel={openDetailInNewTab ? "noopener noreferrer" : undefined}
                  title={actionLabel}
                >
                  {actionLabel}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
