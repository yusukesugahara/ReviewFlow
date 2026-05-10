import Link from "next/link";
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

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "Asia/Tokyo",
});

export type ApplicationListRow = {
  formDefinitionId?: string | null;
  id: string;
  groupId?: string | null;
  status: string;
  createdAt: string;
  applicantEmail?: string;
};

type ApplicationListTableProps = {
  rows: ApplicationListRow[];
  getDetailHref: (row: ApplicationListRow) => string;
  actionLabel?: string;
  showApplicantEmail?: boolean;
};

export function ApplicationListTable({
  rows,
  getDetailHref,
  actionLabel = "詳細",
  showApplicantEmail = false,
}: ApplicationListTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ステータス</TableHead>
          {showApplicantEmail ? <TableHead>申請者</TableHead> : null}
          <TableHead>作成日時</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
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
              <Button asChild variant="ghost" size="sm">
                <Link href={getDetailHref(row)}>{actionLabel}</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
