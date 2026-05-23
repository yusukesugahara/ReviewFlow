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
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { confirmPasswordResetAction } from "./actions";
import type { PasswordResetViewProps } from "./types";

export function PasswordResetView({ token, formError }: PasswordResetViewProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <Card className="mx-auto w-full max-w-md border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">新しいパスワードを設定</CardTitle>
          <CardDescription>
            メールに記載されたリンクからパスワードを再設定します
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              再設定トークンが見つかりません
            </div>
          ) : (
            <form action={confirmPasswordResetAction} className="space-y-4">
              <input type="hidden" name="token" value={token} />
              {formError ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {formError}
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="password">新しいパスワード</Label>
                <PasswordInput
                  id="password"
                  name="password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                  placeholder="8文字以上のパスワード"
                />
              </div>
              <Button type="submit" className="w-full">
                パスワードを再設定
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
