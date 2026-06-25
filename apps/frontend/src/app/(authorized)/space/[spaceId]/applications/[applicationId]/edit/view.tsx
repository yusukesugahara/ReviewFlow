import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ApplicationSetupDraftForm,
  type ApprovalAssigneeOption,
} from "@/components/application-setup/form-builder/application-setup-draft-form";
import { ReturnedApplicationCorrectionForm } from "./_components/returned-application-correction-form";
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

/**
 * セットアップ申請の編集画面を表示します。
 */
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
  values: Record<string, unknown>;
};

/**
 * 差戻し申請の修正入力画面を表示します。
 */
export function ReturnedApplicationCorrectionView({
  action,
  correctionError,
  detailPath,
  fields,
  overallComment,
  targets,
  values,
}: ReturnedApplicationCorrectionViewProps) {
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
        <CardContent className="pt-6">
          <ReturnedApplicationCorrectionForm
            action={action}
            correctionError={correctionError}
            fields={fields}
            overallComment={overallComment}
            targets={targets}
            values={values}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 申請編集画面で編集不可状態を表示します。
 */
export function SpaceApplicationEditUnavailableView() {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-destructive">この申請は編集できません</p>
      </CardContent>
    </Card>
  );
}

/**
 * 申請編集画面のエラー状態を表示します。
 */
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
