import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuditLogDateFilterPicker } from "./audit-log-date-filter-picker";
import type { AdminAuditLogsViewProps } from "../types";

type AuditLogFiltersFormProps = Pick<
  AdminAuditLogsViewProps,
  "createdFrom" | "createdTo" | "outcome" | "query" | "risk"
>;

export function AuditLogFiltersForm({
  createdFrom,
  createdTo,
  outcome,
  query,
  risk,
}: AuditLogFiltersFormProps) {
  return (
    <form className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-2 xl:col-span-3">
          <Label htmlFor="audit-query">検索キーワード</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="audit-query"
              name="q"
              defaultValue={query}
              placeholder="操作者メール、対象ID、操作内容で検索"
              className="bg-white pl-9"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-risk">リスク</Label>
          <Select name="risk" defaultValue={risk}>
            <SelectTrigger id="audit-risk" className="h-10 rounded-lg bg-white text-[15px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">リスクすべて</SelectItem>
              <SelectItem value="high">高リスク</SelectItem>
              <SelectItem value="medium">要確認</SelectItem>
              <SelectItem value="low">通常</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-outcome">結果</Label>
          <Select name="outcome" defaultValue={outcome}>
            <SelectTrigger id="audit-outcome" className="h-10 rounded-lg bg-white text-[15px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">結果すべて</SelectItem>
              <SelectItem value="failed">失敗のみ</SelectItem>
              <SelectItem value="success">成功のみ</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:max-w-md">
          <div className="space-y-2">
            <Label htmlFor="createdFrom">期間 From</Label>
            <AuditLogDateFilterPicker
              id="createdFrom"
              name="createdFrom"
              defaultValue={createdFrom}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="createdTo">期間 To</Label>
            <AuditLogDateFilterPicker
              id="createdTo"
              name="createdTo"
              defaultValue={createdTo}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="outline" className="bg-white">
            検索
          </Button>
          <Button asChild type="button" variant="outline" className="bg-white">
            <Link href="/admin/audit-logs">クリア</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
