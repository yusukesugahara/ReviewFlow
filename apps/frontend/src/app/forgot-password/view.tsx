import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetAction } from "./actions";
import type { ForgotPasswordViewProps } from "./types";

export function ForgotPasswordView({ sent, formError }: ForgotPasswordViewProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <Card className="mx-auto w-full max-w-md border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">パスワード再設定</CardTitle>
          <CardDescription>
            登録済みのメールアドレスに再設定用リンクを送信します
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="rounded-md border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">
              メールを送信しました。届いたリンクから新しいパスワードを設定してください。
            </div>
          ) : (
            <form action={requestPasswordResetAction} className="space-y-4">
              {formError ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {formError}
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              <Button type="submit" className="w-full">
                再設定メールを送信
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
