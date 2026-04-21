import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backendAuthFetchJson } from "@/lib/server/backend-auth-fetch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "../_components/copy-button";

type InvitationResponse = {
  id: string;
  token: string;
  email: string;
  role: string;
  expiresAt: string;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

async function createInvitationAction(formData: FormData): Promise<void> {
  "use server";
  const email = formData.get("email");
  const role = formData.get("role");

  if (typeof email !== "string" || typeof role !== "string") {
    return;
  }

  const createdRaw = await backendAuthFetchJson("/invitations", {
    method: "POST",
    body: { email: email.trim(), role },
  });
  const created = unwrapData<InvitationResponse>(createdRaw);
  revalidatePath("/admin/invitations");

  const nextParams = new URLSearchParams({
    token: created.token,
    email: created.email,
    role: created.role,
    expiresAt: created.expiresAt,
  });
  redirect(`/admin/invitations?${nextParams.toString()}`);
}

type PageProps = {
  searchParams?: Promise<{
    token?: string;
    email?: string;
    role?: string;
    expiresAt?: string;
  }>;
};

export default async function AdminInvitationsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const invitationUrl = params.token
    ? `/invitations/accept?token=${encodeURIComponent(params.token)}`
    : "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">ユーザー招待</h2>
        <p className="text-muted-foreground">
          招待URLを発行して、申請者・承認者・管理者を追加できます
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新しい招待を発行</CardTitle>
          <CardDescription>メールアドレスとロールを指定して招待を作成します</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createInvitationAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input id="email" name="email" type="email" required placeholder="member@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">ロール</Label>
              <select
                id="role"
                name="role"
                defaultValue="approver"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="applicant">applicant（申請者）</option>
                <option value="approver">approver（承認者）</option>
                <option value="tenant_admin">tenant_admin（管理者）</option>
              </select>
            </div>
            <Button type="submit">招待URLを発行</Button>
          </form>
        </CardContent>
      </Card>

      {invitationUrl ? (
        <Card className="border-violet-200 bg-violet-50/40">
          <CardHeader>
            <CardTitle>招待を発行しました</CardTitle>
            <CardDescription>以下のURLを対象ユーザーへ共有してください</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {params.role ? <Badge>{params.role}</Badge> : null}
              {params.email ? <Badge variant="outline">{params.email}</Badge> : null}
            </div>
            <p className="rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700">
              {invitationUrl}
            </p>
            <div className="flex items-center gap-2">
              <CopyButton value={invitationUrl} />
              {params.expiresAt ? (
                <p className="text-xs text-muted-foreground">
                  有効期限: {new Date(params.expiresAt).toLocaleString("ja-JP")}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
