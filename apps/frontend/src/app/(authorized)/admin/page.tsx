import { redirect } from "next/navigation";

/**
 * 管理画面ルートをスペース管理画面へリダイレクトします。
 */
export default function AdminRootRedirectPage() {
  redirect("/admin/spaces");
}
