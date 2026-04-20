import type { ReactNode } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>管理者コンソール</h1>
      <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/admin">ダッシュボード</Link>
        <Link href="/admin/form-templates">フォーム作成</Link>
        <Link href="/admin/approval-flows">承認フロー作成</Link>
        <Link href="/admin/applications">申請一覧</Link>
        <Link href="/admin/export-jobs">CSVジョブ</Link>
        <Link href="/admin/audit-logs">監査ログ</Link>
      </nav>
      {children}
    </main>
  );
}
