import { redirect } from "next/navigation";
import { getServerAuthEnv } from "@/lib/env";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function acceptInvitationAction(formData: FormData): Promise<void> {
  "use server";
  const token = formData.get("token");
  const name = formData.get("name");
  const password = formData.get("password");
  const next = formData.get("next");
  if (typeof token !== "string" || typeof password !== "string") {
    redirect("/invitations/accept?error=invalid_input");
  }

  const env = getServerAuthEnv();
  const res = await fetch(`${env.apiBaseUrl}/invitations/accept`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": env.INTERNAL_API_KEY,
    },
    body: JSON.stringify({
      token,
      name: typeof name === "string" && name.trim().length > 0 ? name : undefined,
      password,
    }),
  });

  if (!res.ok) {
    redirect(
      `/invitations/accept?error=accept_failed${
        typeof next === "string" && next.length > 0
          ? `&next=${encodeURIComponent(next)}`
          : ""
      }`,
    );
  }
  redirect(
    `/login${
      typeof next === "string" && next.length > 0
        ? `?next=${encodeURIComponent(next)}`
        : ""
    }`,
  );
}

type PageProps = {
  searchParams?: Promise<{ token?: string; error?: string; next?: string }>;
};

export default async function InvitationAcceptPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const presetToken = params.token ?? "";
  const error = params.error;
  const next = params.next ?? "";
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
          {error ? (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">
                招待の受諾に失敗しました。入力内容を確認してください。
              </p>
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
              <Input
                id="name"
                name="name"
                placeholder="山田 太郎"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                パスワード
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                placeholder="8文字以上のパスワード"
                required
              />
              <p className="text-xs text-muted-foreground">
                8文字以上で設定してください
              </p>
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
