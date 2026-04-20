import { redirect } from "next/navigation";
import { getServerAuthEnv } from "@/lib/env";

async function acceptInvitationAction(formData: FormData): Promise<void> {
  "use server";
  const token = formData.get("token");
  const name = formData.get("name");
  const password = formData.get("password");
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
    redirect("/invitations/accept?error=accept_failed");
  }
  redirect("/login");
}

type PageProps = {
  searchParams?: Promise<{ token?: string; error?: string }>;
};

export default async function InvitationAcceptPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const presetToken = params.token ?? "";
  const error = params.error;
  return (
    <main style={{ maxWidth: 520, margin: "32px auto", display: "grid", gap: 12 }}>
      <h1 style={{ margin: 0 }}>招待受諾</h1>
      <p style={{ margin: 0 }}>
        招待トークンと初期パスワードを入力してアカウントを有効化します。
      </p>
      {error ? (
        <p style={{ color: "#b91c1c", margin: 0 }}>
          招待の受諾に失敗しました。入力内容を確認してください。
        </p>
      ) : null}
      <form action={acceptInvitationAction} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span>招待トークン</span>
          <input name="token" defaultValue={presetToken} required />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>表示名（任意）</span>
          <input name="name" />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>パスワード</span>
          <input name="password" type="password" minLength={8} required />
        </label>
        <button type="submit">受諾してログインへ進む</button>
      </form>
    </main>
  );
}
