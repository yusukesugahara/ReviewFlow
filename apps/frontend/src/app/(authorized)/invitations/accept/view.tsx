import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { acceptInvitationAction } from "./actions";
import type { InvitationAcceptViewProps } from "./types";

/**
 * 招待承諾フォームを表示します。
 */
export function InvitationAcceptView({
  presetToken,
  formError,
  next,
}: InvitationAcceptViewProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">招待受諾</CardTitle>
          <CardDescription>
            招待トークンと初期パスワードを入力してアカウントを有効化します
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formError ? (
            <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{formError}</p>
            </div>
          ) : null}
          <form action={acceptInvitationAction} className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <div className="space-y-2">
              <Label htmlFor="token">
                招待トークン
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="token"
                name="token"
                defaultValue={presetToken}
                placeholder="招待メールに記載されているトークン"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">表示名（任意）</Label>
              <Input id="name" name="name" placeholder="山田 太郎" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                パスワード
                <span className="text-destructive ml-1">*</span>
              </Label>
              <PasswordInput
                id="password"
                name="password"
                minLength={8}
                placeholder="8文字以上のパスワード"
                required
              />
              <p className="text-xs text-muted-foreground">8文字以上で設定してください</p>
            </div>
            <Button type="submit" className="w-full" size="lg">
              受諾してログインへ進む
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
