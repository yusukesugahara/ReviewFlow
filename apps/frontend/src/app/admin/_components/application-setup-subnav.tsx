"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ApplicationSetupSubnav() {
  const pathname = usePathname();

  const isTemplateManagement = pathname.startsWith("/admin/template-management");
  const isFormTemplates = pathname.startsWith("/admin/form-templates");
  const isApprovalFlows = pathname.startsWith("/admin/approval-flows");

  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
      <Link
        href="/admin/template-management"
        className={cn(
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isTemplateManagement
            ? "bg-violet-100 text-violet-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )}
      >
        フォーム管理
      </Link>
      <Link
        href="/admin/form-templates"
        className={cn(
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isFormTemplates
            ? "bg-violet-100 text-violet-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )}
      >
        フォーム作成
      </Link>
      <Link
        href="/admin/approval-flows"
        className={cn(
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isApprovalFlows
            ? "bg-violet-100 text-violet-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )}
      >
        承認フロー作成
      </Link>
    </div>
  );
}
