import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-auth-fetch";

type ApplicationDetail = {
  id: string;
  status: string;
  formTemplateId: string;
  createdAt: string;
  updatedAt: string;
  values: Record<string, unknown>;
};

type CorrectionItem = {
  fieldKey: string;
  comment: string | null;
};
type Correction = {
  id: string;
  status: string;
  overallComment: string | null;
  createdAt: string;
  items: CorrectionItem[];
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

async function submitAction(applicationId: string): Promise<void> {
  "use server";
  await backendAuthFetchJson(`/applications/${applicationId}/submit`, {
    method: "POST",
    body: {},
  });
  revalidatePath(`/app/applications/${applicationId}`);
  redirect(`/app/applications/${applicationId}`);
}

async function resubmitAction(applicationId: string): Promise<void> {
  "use server";
  await backendAuthFetchJson(`/applications/${applicationId}/resubmit`, {
    method: "POST",
    body: {},
  });
  revalidatePath(`/app/applications/${applicationId}`);
  redirect(`/app/applications/${applicationId}`);
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const detailRaw = await backendAuthFetchJson(`/applications/${id}`);
    const app = unwrapData<ApplicationDetail>(detailRaw);
    const correctionsRaw = await backendAuthFetchJson(`/applications/${id}/corrections`);
    const corrections =
      unwrapData<{ corrections?: Correction[] }>(correctionsRaw).corrections ?? [];

    return (
      <section style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>申請詳細</h2>
        <div>ID: {app.id}</div>
        <div>Status: {app.status}</div>
        <div>Template: {app.formTemplateId}</div>
        <div>Created: {new Date(app.createdAt).toLocaleString()}</div>
        <div>Updated: {new Date(app.updatedAt).toLocaleString()}</div>

        <h3 style={{ marginBottom: 0 }}>入力値</h3>
        <pre
          style={{
            margin: 0,
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 6,
            overflowX: "auto",
          }}
        >
          {JSON.stringify(app.values, null, 2)}
        </pre>

        {(app.status === "draft" || app.status === "returned") && (
          <Link href={`/app/applications/${app.id}/edit`}>編集する</Link>
        )}

        {app.status === "draft" && (
          <form action={submitAction.bind(null, app.id)}>
            <button type="submit">提出する</button>
          </form>
        )}
        {app.status === "returned" && (
          <form action={resubmitAction.bind(null, app.id)}>
            <button type="submit">再提出する</button>
          </form>
        )}

        <h3 style={{ marginBottom: 0 }}>差し戻し履歴</h3>
        {corrections.length === 0 ? <p>差し戻し履歴はありません。</p> : null}
        {corrections.map((c) => (
          <article
            key={c.id}
            style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12 }}
          >
            <div>Status: {c.status}</div>
            <div>Created: {new Date(c.createdAt).toLocaleString()}</div>
            {c.overallComment ? <div>Overall: {c.overallComment}</div> : null}
            <ul style={{ marginBottom: 0 }}>
              {c.items.map((item) => (
                <li key={`${c.id}-${item.fieldKey}`}>
                  {item.fieldKey}
                  {item.comment ? `: ${item.comment}` : ""}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    );
  } catch (error) {
    if (error instanceof BackendHttpError) {
      return <p>申請詳細の取得に失敗しました（status: {error.status}）</p>;
    }
    return <p>申請詳細の取得に失敗しました</p>;
  }
}
