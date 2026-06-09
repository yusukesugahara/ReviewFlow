import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DynamicFieldInput,
  DynamicFieldsTable,
} from "@/components/applications/dynamic-fields";
import {
  ApplicationSetupDraftForm,
  type ApprovalAssigneeOption,
} from "@/components/application-setup/application-setup-draft-form";
import type {
  CorrectionTargetItem,
  EditableApplicationInitialState,
  EditableFormField,
} from "./types";

type SpaceApplicationEditViewProps = EditableApplicationInitialState & {
  action: (formData: FormData) => Promise<void>;
  assignees: ApprovalAssigneeOption[];
  detailPath: string;
  errorMessage: string;
  currentApprovalFlowId?: string | null;
  currentFormDefinitionId?: string | null;
  initialName?: string;
  publishedFormDefinitionId?: string;
  returnPath: string;
  spaceId: string;
};

export function SpaceApplicationEditView({
  action,
  assignees,
  detailPath,
  errorMessage,
  currentApprovalFlowId,
  currentFormDefinitionId,
  initialFields,
  initialName,
  initialSteps,
  publishedFormDefinitionId,
  returnPath,
  spaceId,
}: SpaceApplicationEditViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">申請編集</h2>
          <p className="text-muted-foreground">申請内容を編集します</p>
        </div>
        <Button asChild variant="outline">
          <Link href={detailPath}>詳細へ戻る</Link>
        </Button>
      </div>
      <ApplicationSetupDraftForm
        action={action}
        assignees={assignees}
        errorMessage={errorMessage}
        currentApprovalFlowId={currentApprovalFlowId}
        currentFormDefinitionId={currentFormDefinitionId}
        initialFields={initialFields}
        initialName={initialName}
        initialSteps={initialSteps}
        publishedFormDefinitionId={publishedFormDefinitionId}
        returnPath={returnPath}
        spaceId={spaceId}
      />
    </div>
  );
}

type ReturnedApplicationCorrectionViewProps = {
  action: (formData: FormData) => Promise<void>;
  correctionError?: string;
  detailPath: string;
  fields: EditableFormField[];
  overallComment?: string | null;
  targets: CorrectionTargetItem[];
};

export function ReturnedApplicationCorrectionView({
  action,
  correctionError,
  detailPath,
  fields,
  overallComment,
  targets,
}: ReturnedApplicationCorrectionViewProps) {
  const targetByFieldId = new Map(targets.map((target) => [target.formFieldId, target]));
  const targetFields = fields.filter((field) => targetByFieldId.has(field.id));
  const values = Object.fromEntries(
    targets.map((target) => [target.fieldKey, target.currentValue]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">差し戻し修正</h2>
          <p className="text-muted-foreground">
            指定された項目を修正して、申請詳細から再提出してください
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={detailPath}>詳細へ戻る</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          {correctionError ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {correctionError}
            </p>
          ) : null}
          {overallComment ? (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-900">
                差し戻しコメント
              </p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-amber-900">
                {overallComment}
              </p>
            </div>
          ) : null}
          {targets.length > 0 ? (
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-900">
                修正対象は {targets.length} 件です
              </p>
              <div className="flex flex-wrap gap-2">
                {targets.map((target) => (
                  <Badge key={target.itemId} variant="outline" className="bg-white">
                    {target.label}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {targetFields.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-muted-foreground">
              現在修正できる項目はありません。
            </p>
          ) : (
          <form action={action} className="space-y-5">
            <input type="hidden" name="fieldsJson" value={JSON.stringify(targetFields)} />
            <DynamicFieldsTable
              fields={targetFields.map((field) => ({
                ...field,
                required: field.required ?? false,
              }))}
              values={values}
              title="修正内容"
              renderValue={(field, value) => {
                const target = targetByFieldId.get(field.id);
                return (
                  <div className="space-y-3">
                    {target?.comment ? (
                      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                        {target.comment}
                      </p>
                    ) : null}
                    <DynamicFieldInput field={field} value={value} variant="table" />
                  </div>
                );
              }}
            />
            <div className="flex justify-end border-t border-slate-200 pt-4">
              <Button type="submit">修正内容を保存</Button>
            </div>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function SpaceApplicationEditUnavailableView() {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-destructive">この申請は編集できません</p>
      </CardContent>
    </Card>
  );
}

export function SpaceApplicationEditErrorView({ status }: { status?: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-destructive">
          {status
            ? `申請編集画面の取得に失敗しました（status: ${status}）`
            : "申請編集画面の取得に失敗しました"}
        </p>
      </CardContent>
    </Card>
  );
}
