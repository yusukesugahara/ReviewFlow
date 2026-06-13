import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { getApplicationStatusBadgeVariant } from "@/components/applications/status/application-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SpaceOverviewApplicationItem } from "../_view-models/space-overview-view-model";

type SpaceOverviewRecentApplicationsProps = {
  applications: SpaceOverviewApplicationItem[];
  submissionsHref: string;
};

export function SpaceOverviewRecentApplications({
  applications,
  submissionsHref,
}: SpaceOverviewRecentApplicationsProps) {
  return (
    <Card>
      <CardHeader className="gap-3 border-b border-slate-200 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Inbox className="size-5 text-slate-500" aria-hidden="true" />
            直近の申請
          </CardTitle>
          <CardDescription>
            このスペースで最近更新された申請を確認します
          </CardDescription>
        </div>
        <Button asChild variant="outline" size="sm" className="bg-white sm:shrink-0">
          <Link href={submissionsHref}>
            申請一覧
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        {applications.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            申請はまだありません
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>申請</TableHead>
                <TableHead>申請者</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>更新日時</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((application) => (
                <TableRow key={application.id}>
                  <TableCell className="font-medium text-slate-950">
                    {application.name}
                  </TableCell>
                  <TableCell>{application.applicantEmail}</TableCell>
                  <TableCell>
                    <Badge
                      variant={getApplicationStatusBadgeVariant(
                        application.status,
                      )}
                    >
                      {application.statusLabel}
                    </Badge>
                  </TableCell>
                  <TableCell>{application.updatedAtText}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={application.href}>
                        詳細
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
