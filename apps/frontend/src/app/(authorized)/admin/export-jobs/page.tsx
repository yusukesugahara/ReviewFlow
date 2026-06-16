import { redirect } from "next/navigation";

/**
 * 廃止済みのエクスポートジョブルートを監査ログ画面へリダイレクトします。
 */
export default function RemovedExportJobsPage() {
  redirect("/admin/spaces");
}
