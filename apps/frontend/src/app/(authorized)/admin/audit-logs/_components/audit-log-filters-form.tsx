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
  "createdFrom" | "createdTo" | "query" | "targetType"
>;

/**
 * 監査ログの検索・絞り込みフォームを表示します。
 */
export function AuditLogFiltersForm({
  createdFrom,
  createdTo,
  query,
  targetType,
}: AuditLogFiltersFormProps) {
  return (
    <form className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              placeholder="操作者、対象メール、申請ID、操作内容で検索"
              className="bg-white pl-9"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-target-type">対象</Label>
          <Select name="targetType" defaultValue={targetType}>
            <SelectTrigger id="audit-target-type" className="h-10 rounded-lg bg-white text-[15px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">対象すべて</SelectItem>
              <SelectItem value="application">申請</SelectItem>
              <SelectItem value="user">ユーザ</SelectItem>
              <SelectItem value="invitation">招待</SelectItem>
              <SelectItem value="space">スペース</SelectItem>
              <SelectItem value="group_member">スペースメンバー</SelectItem>
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
