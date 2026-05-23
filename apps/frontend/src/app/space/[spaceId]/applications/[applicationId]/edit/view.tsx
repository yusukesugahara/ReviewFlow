import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ApplicationSetupDraftForm,
  type ApprovalAssigneeOption,
} from "@/app/space/_components/application-setup-draft-form";
import type { EditableApplicationInitialState } from "./types";

type SpaceApplicationEditViewProps = EditableApplicationInitialState & {
  action: (formData: FormData) => Promise<void>;
  assignees: ApprovalAssigneeOption[];
  detailPath: string;
  errorMessage: string;
  initialName?: string;
  returnPath: string;
  spaceId: string;
};

export function SpaceApplicationEditView({
  action,
  assignees,
  detailPath,
  errorMessage,
  initialFields,
  initialName,
  initialSteps,
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
        initialFields={initialFields}
        initialName={initialName}
        initialSteps={initialSteps}
        returnPath={returnPath}
        spaceId={spaceId}
      />
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
