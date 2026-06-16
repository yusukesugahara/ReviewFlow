import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { confirmAccountEmailChangeAction } from "./actions";
import type { AccountEmailChangeConfirmViewProps } from "./types";

/**
 * メールアドレス変更確認フォームを表示します。
 */
export function AccountEmailChangeConfirmView({
  formError,
  token,
}: AccountEmailChangeConfirmViewProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <Card className="mx-auto w-full max-w-md border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">
            メールアドレス変更を確認
          </CardTitle>
          <CardDescription>
            メールに記載されたリンクから変更を確定します
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!token ? (
            <Alert variant="destructive">
              確認トークンが見つかりません
            </Alert>
          ) : (
            <form action={confirmAccountEmailChangeAction} className="space-y-4">
              <input type="hidden" name="token" value={token} />
              {formError ? (
                <Alert variant="destructive">{formError}</Alert>
              ) : null}
              <Button type="submit" className="w-full">
                メールアドレス変更を確定
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/login">ログインへ戻る</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
