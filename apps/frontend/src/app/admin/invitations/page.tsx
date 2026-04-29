import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  backendAuthFetchJson,
  BackendHttpError,
} from "@/lib/server/backend-auth-fetch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { userRoleLabel } from "@/lib/role-labels";
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

function invitationErrorMessage(error: unknown) {
  if (!(error instanceof BackendHttpError)) {
    return "招待の作成に失敗しました";
  }

  const body = error.body;
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  if (error.status === 403) {
    return "招待を作成する権限がありません";
  }
  if (error.status === 409) {
    return "既存ユーザーまたは保留中の招待と重複しています";
  }
  return `招待の作成に失敗しました（status: ${error.status}）`;
}

async function createInvitationAction(formData: FormData): Promise<void> {
  "use server";
  const email = formData.get("email");
  const role = formData.get("role");

  if (typeof email !== "string" || typeof role !== "string") {
    return;
  }

  let createdRaw: unknown;
  try {
    createdRaw = await backendAuthFetchJson("/invitations", {
      method: "POST",
      body: { email: email.trim(), role },
    });
  } catch (error) {
    const nextParams = new URLSearchParams({
      error: invitationErrorMessage(error),
    });
    redirect(`/admin/invitations?${nextParams.toString()}`);
  }

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
    error?: string;
  }>;
};

export default async function AdminInvitationsPage({
  searchParams,
}: PageProps) {
  const params = (await searchParams) ?? {};
  const invitationUrl = params.token
    ? `/invitations/accept?token=${encodeURIComponent(params.token)}`
    : "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">ユーザー招待</h2>
        <p className="text-muted-foreground">
          招待URLを発行して、ユーザー・システム管理者を追加できます
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新しい招待を発行</CardTitle>
          <CardDescription>
            メールアドレスとロールを指定して招待を作成します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createInvitationAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="member@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">ロール</Label>
              <select
                id="role"
                name="role"
                defaultValue="tenant_user"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="tenant_user">テナントユーザー</option>
                <option value="tenant_admin">テナント管理者</option>
              </select>
            </div>
            <Button type="submit">招待URLを発行</Button>
          </form>
        </CardContent>
      </Card>

      {params.error ? (
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-red-700">{params.error}</p>
          </CardContent>
        </Card>
      ) : null}

      {invitationUrl ? (
        <Card className="border-violet-200 bg-violet-50/40">
          <CardHeader>
            <CardTitle>招待を発行しました</CardTitle>
            <CardDescription>
              以下のURLを対象ユーザーへ共有してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {params.role ? <Badge>{userRoleLabel(params.role)}</Badge> : null}
              {params.email ? (
                <Badge variant="outline">{params.email}</Badge>
              ) : null}
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
