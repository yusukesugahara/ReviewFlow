import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BackendHttpError, backendAuthFetchJson } from "@/lib/server/backend-auth-fetch";
import {
  ApplicationSetupDraftForm,
  type DraftField,
} from "../_components/application-setup-draft-form";

type CreateTemplateResponse = {
  id: string;
};

type SetupIntent = "draft" | "publish";

type ApprovalStepPayload = {
  stepOrder: number;
  stepName: string;
  approverRole: "approver" | "tenant_admin";
  canReturn: boolean;
};

type FieldPayload = {
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options: { label: string; value: string }[];
  sortOrder: number;
};

type PageProps = {
  searchParams?: Promise<{
    setupError?: string;
  }>;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

function parseSteps(stepLines: string): ApprovalStepPayload[] {
  const lines = stepLines
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((line, index) => {
    const [stepNameRaw, roleRaw, canReturnRaw] = line
      .split(",")
      .map((value) => value?.trim() ?? "");
    return {
      stepOrder: index + 1,
      stepName: stepNameRaw || `Step ${index + 1}`,
      approverRole: roleRaw === "tenant_admin" ? "tenant_admin" : "approver",
      canReturn: canReturnRaw === "true",
    };
  });
}

function parseOptions(optionsText: string): { label: string; value: string }[] {
  return optionsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, all) => line.length > 0 && all.indexOf(line) === index)
    .map((line) => ({ label: line, value: line }));
}

function needsOptions(fieldType: string): boolean {
  return fieldType === "select" || fieldType === "radio" || fieldType === "checkbox";
}

function normalizeFieldKey(label: string, index: number, usedKeys: Set<string>): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "") || `field_${index + 1}`;
  let key = base;
  let suffix = 2;
  while (usedKeys.has(key)) {
    key = `${base}_${suffix}`;
    suffix += 1;
  }
  usedKeys.add(key);
  return key;
}

function readDraftFields(fieldsJson: FormDataEntryValue | null): DraftField[] {
  if (typeof fieldsJson !== "string") {
    return [];
  }
  const parsed: unknown = JSON.parse(fieldsJson);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.flatMap((item): DraftField[] => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const raw = item as Record<string, unknown>;
    if (
      typeof raw.id !== "string" ||
      typeof raw.label !== "string" ||
      typeof raw.fieldType !== "string" ||
      typeof raw.required !== "boolean"
    ) {
      return [];
    }
    return [
      {
        id: raw.id,
        label: raw.label,
        fieldType:
          raw.fieldType === "textarea" ||
          raw.fieldType === "number" ||
          raw.fieldType === "date" ||
          raw.fieldType === "select" ||
          raw.fieldType === "radio" ||
          raw.fieldType === "checkbox"
            ? raw.fieldType
            : "text",
        required: raw.required,
        placeholder: typeof raw.placeholder === "string" ? raw.placeholder : "",
        helpText: typeof raw.helpText === "string" ? raw.helpText : "",
        optionsText: typeof raw.optionsText === "string" ? raw.optionsText : "",
      },
    ];
  });
}

function toFieldPayloads(fields: DraftField[]): FieldPayload[] {
  const usedKeys = new Set<string>();
  return fields.map((field, index) => {
    const label = field.label.trim() || `フォーム${index + 1}`;
    return {
      fieldKey: normalizeFieldKey(label, index, usedKeys),
      label,
      fieldType: field.fieldType,
      required: field.required,
      placeholder: field.placeholder.trim(),
      helpText: field.helpText.trim(),
      options: needsOptions(field.fieldType) ? parseOptions(field.optionsText) : [],
      sortOrder: index,
    };
  });
}

function setupErrorMessage(error?: string): string | null {
  switch (error) {
    case "invalid_name":
      return "申請名を入力してください。";
    case "invalid_fields":
      return "フォーム項目を1件以上設定してください。";
    case "invalid_steps":
      return "承認ステップを1件以上設定してください。";
    case "approval_flow_requires_publish":
      return "下書き保存は完了しました。承認フローは公開済みフォームにしか保存できないバックエンドが起動中です。backend を再起動するか、申請公開で保存してください。";
    case "save_failed":
      return "保存に失敗しました。入力内容を確認して再度実行してください。";
    default:
      return null;
  }
}

async function submitApplicationSetupAction(formData: FormData): Promise<void> {
  "use server";

  const name = formData.get("name");
  const fieldsJson = formData.get("fieldsJson");
  const stepLines = formData.get("stepLines");
  const intent = formData.get("intent");

  if (typeof name !== "string" || name.trim().length === 0) {
    redirect("/admin/application-setup?setupError=invalid_name");
  }
  if (typeof stepLines !== "string") {
    redirect("/admin/application-setup?setupError=invalid_steps");
  }

  let fields: DraftField[];
  try {
    fields = readDraftFields(fieldsJson);
  } catch {
    redirect("/admin/application-setup?setupError=invalid_fields");
  }
  if (fields.length === 0) {
    redirect("/admin/application-setup?setupError=invalid_fields");
  }

  const steps = parseSteps(stepLines);
  if (steps.length === 0) {
    redirect("/admin/application-setup?setupError=invalid_steps");
  }

  const resolvedIntent: SetupIntent = intent === "publish" ? "publish" : "draft";
  const fieldPayloads = toFieldPayloads(fields);
  let createdId = "";

  try {
    const createdRaw = await backendAuthFetchJson("/form-templates", {
      method: "POST",
      body: {
        name: name.trim(),
        description: `${name.trim()} の申請フォーム`,
      },
    });
    const created = unwrapData<CreateTemplateResponse>(createdRaw);
    createdId = created.id;

    for (const field of fieldPayloads) {
      await backendAuthFetchJson(`/form-templates/${createdId}/fields`, {
        method: "POST",
        body: field,
      });
    }

    if (resolvedIntent === "publish") {
      await backendAuthFetchJson(`/form-templates/${createdId}/publish`, {
        method: "POST",
        body: {},
      });
    }

    await backendAuthFetchJson("/approval-flows", {
      method: "POST",
      body: {
        formTemplateId: createdId,
        name: `${name.trim()} 承認フロー`,
        steps,
      },
    });
  } catch (error) {
    if (
      error instanceof BackendHttpError &&
      resolvedIntent === "draft" &&
      createdId.length > 0 &&
      error.status === 409
    ) {
      revalidatePath("/admin/application-setup");
      revalidatePath("/admin/template-management");
      redirect(
        `/admin/template-management?status=draft&createdId=${encodeURIComponent(
          createdId,
        )}&setupError=approval_flow_requires_publish`,
      );
    }
    redirect("/admin/application-setup?setupError=save_failed");
  }

  revalidatePath("/admin/application-setup");
  revalidatePath("/admin/template-management");
  revalidatePath("/admin/approval-flows");
  redirect(
    `/admin/template-management?status=${resolvedIntent === "publish" ? "published" : "draft"}&createdId=${encodeURIComponent(
      createdId,
    )}`,
  );
}

export default async function AdminApplicationSetupPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const errorMessage = setupErrorMessage(params.setupError);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">申請作成</h2>
        <p className="max-w-2xl text-[15px] leading-6 text-slate-600 md:text-[16px]">
          フォーム設定と承認フロー設定を入力し、最後に下書き保存または申請公開します。
        </p>
      </div>

      <ApplicationSetupDraftForm
        action={submitApplicationSetupAction}
        errorMessage={errorMessage}
      />
    </div>
  );
}
