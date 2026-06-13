import Link from "next/link";
import { ArrowRight, ClipboardList, FilePlusCorner } from "lucide-react";
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
import type { SpaceOverviewFormItem } from "../_view-models/space-overview-view-model";

type SpaceOverviewPublishedFormsProps = {
  formNewHref: string;
  forms: SpaceOverviewFormItem[];
  formsHref: string;
};

export function SpaceOverviewPublishedForms({
  formNewHref,
  forms,
  formsHref,
}: SpaceOverviewPublishedFormsProps) {
  return (
    <Card>
      <CardHeader className="gap-3 border-b border-slate-200 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ClipboardList className="size-5 text-slate-500" aria-hidden="true" />
            公開フォーム
          </CardTitle>
          <CardDescription>
            現在公開されているフォームと項目数を確認します
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button asChild variant="outline" size="sm" className="bg-white">
            <Link href={formsHref}>
              フォーム一覧
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon" aria-label="申請フォームを作成">
            <Link href={formNewHref}>
              <FilePlusCorner aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {forms.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            公開中のフォームはありません
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>フォーム</TableHead>
                <TableHead>状態</TableHead>
                <TableHead className="text-right">項目数</TableHead>
                <TableHead>更新日時</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => (
                <TableRow key={form.id}>
                  <TableCell className="font-medium text-slate-950">
                    {form.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">公開済み</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {form.fieldCount}
                  </TableCell>
                  <TableCell>{form.updatedAtText}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={form.href}>
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
