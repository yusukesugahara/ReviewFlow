"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApprovalStepsBuilder,
  type ApprovalStepItem,
  type ApprovalAssigneeOption,
} from "../approval-flow/approval-steps-builder";
import { PublishedApplicationUrlModal } from "../dialogs/published-application-url-modal";
import {
  createDefaultField,
  normalizeFieldKey,
  type DraftField,
} from "../fields/application-setup-fields";
import { InlineFormBuilder } from "./application-setup-inline-form-builder";

export type { ApprovalAssigneeOption };
export type { DraftField };

type ApplicationSetupDraftFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  errorMessage?: string | null;
  statusMessage?: string | null;
  publishedGroupId?: string | null;
  publishedFormDefinitionId?: string | null;
  currentFormDefinitionId?: string | null;
  currentApprovalFlowId?: string | null;
  assignees: ApprovalAssigneeOption[];
  initialFields?: DraftField[];
  initialName?: string;
  initialSteps?: ApprovalStepItem[];
  initialValues?: Record<string, unknown>;
  spaceId: string;
  returnPath?: string;
};

export function ApplicationSetupDraftForm({
  action,
  errorMessage,
  statusMessage,
  publishedGroupId,
  publishedFormDefinitionId,
  currentFormDefinitionId,
  currentApprovalFlowId,
  assignees,
  initialFields,
  initialName,
  initialSteps,
  initialValues,
  spaceId,
  returnPath,
}: ApplicationSetupDraftFormProps) {
  const [fields, setFields] = useState<DraftField[]>(
    initialFields && initialFields.length > 0
      ? initialFields
      : [createDefaultField(0)],
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string>(
    (initialFields && initialFields[0]?.id) || "field-1",
  );

  const fieldsJson = useMemo(() => JSON.stringify(fields), [fields]);
  const fieldsWithKeys = useMemo(() => {
    const usedKeys = new Set<string>();
    return fields.map((field, index) => ({
      field,
      fieldKey: normalizeFieldKey(field, index, usedKeys),
    }));
  }, [fields]);
  const updateField = (id: string, patch: Partial<DraftField>) => {
    setFields((prev) => prev.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  };

  const insertFieldAt = (index: number) => {
    setFields((prev) => {
      const next = [...prev];
      const nextField = createDefaultField(prev.length);
      setSelectedFieldId(nextField.id);
      next.splice(index, 0, nextField);
      return next;
    });
  };

  const removeField = (id: string) => {
    setFields((prev) => {
      const removedIndex = prev.findIndex((field) => field.id === id);
      const next = prev.filter((field) => field.id !== id);
      if (selectedFieldId === id) {
        setSelectedFieldId(next[Math.max(removedIndex - 1, 0)]?.id ?? next[0]?.id ?? "");
      }
      return next;
    });
  };

  const moveFieldTo = (id: string, targetIndex: number) => {
    setFields((prev) => {
      const currentIndex = prev.findIndex((field) => field.id === id);
      if (
        currentIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= prev.length ||
        currentIndex === targetIndex
      ) {
        return prev;
      }
      const next = [...prev];
      const [target] = next.splice(currentIndex, 1);
      if (!target) {
        return prev;
      }
      next.splice(targetIndex, 0, target);
      return next;
    });
  };

  return (
    <form action={action} className="space-y-6">
      <PublishedApplicationUrlModal
        open={Boolean(publishedGroupId)}
        groupId={publishedGroupId ?? undefined}
        formDefinitionId={publishedFormDefinitionId ?? undefined}
      />
      <input type="hidden" name="fieldsJson" value={fieldsJson} />
      <input type="hidden" name="spaceId" value={spaceId} />
      {currentFormDefinitionId ? (
        <input type="hidden" name="currentFormDefinitionId" value={currentFormDefinitionId} />
      ) : null}
      {currentApprovalFlowId ? (
        <input type="hidden" name="currentApprovalFlowId" value={currentApprovalFlowId} />
      ) : null}
      {returnPath ? (
        <input type="hidden" name="returnPath" value={returnPath} />
      ) : null}

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {statusMessage ? (
        <Alert variant="success">
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full max-w-2xl space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">申請フォーム</CardTitle>
                <Badge variant={publishedFormDefinitionId ? "default" : "outline"}>
                  {publishedFormDefinitionId ? "公開済み" : initialName ? "下書き" : "未保存"}
                </Badge>
              </div>
              <CardDescription>
                フォーム名と、利用者が入力する申請項目を設定します。
              </CardDescription>
              <Label htmlFor="templateName">申請フォーム名</Label>
              <Input
                id="templateName"
                name="name"
                placeholder="例: 経費申請"
                required
                defaultValue={initialName ?? ""}
                className="bg-white"
              />
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2">
              <ApplicationSetupSubmitButton intent="draft">
                下書き保存
              </ApplicationSetupSubmitButton>
              <ApplicationSetupSubmitButton intent="publish">
                公開
              </ApplicationSetupSubmitButton>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div>
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="text-base font-semibold text-slate-950">フォーム入力画面</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                公開されるフォームと同じ表示です。鉛筆で編集、×で削除、行間の＋で追加できます。
              </p>
            </div>
          </div>
          <InlineFormBuilder
            fieldsWithKeys={fieldsWithKeys}
            setSelectedFieldId={setSelectedFieldId}
            updateField={updateField}
            insertFieldAt={insertFieldAt}
            removeField={removeField}
            moveFieldTo={moveFieldTo}
            initialValues={initialValues}
          />
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-200">
          <CardTitle className="text-xl">承認フロー設定</CardTitle>
          <CardDescription>申請が提出された後の承認ステップを設定します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <ApprovalStepsBuilder assignees={assignees} defaultSteps={initialSteps} />
        </CardContent>
      </Card>

    </form>
  );
}

function ApplicationSetupSubmitButton({
  children,
  intent,
}: {
  children: string;
  intent: "draft" | "publish";
}) {
  const { pending, data } = useFormStatus();
  const isPublishing = pending && data?.get("intent") === "publish";

  return (
    <Button
      type="submit"
      name="intent"
      value={intent}
      variant={intent === "draft" ? "secondary" : "default"}
      disabled={pending}
      aria-busy={intent === "publish" && isPublishing}
    >
      {intent === "publish" && isPublishing ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          公開中
        </>
      ) : (
        children
      )}
    </Button>
  );
}
