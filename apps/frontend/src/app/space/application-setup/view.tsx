"use client";

import {
  ApplicationSetupDraftForm,
  type ApprovalAssigneeOption,
} from "@/app/space/_components/application-setup-draft-form";
import { submitApplicationSetupAction } from "./actions";

type AdminApplicationSetupViewProps = {
  assignees: ApprovalAssigneeOption[];
  errorMessage: string | null;
  publishedGroupId: string | null;
  spaceId: string;
  statusMessage: string | null;
};

export function AdminApplicationSetupView({
  assignees,
  errorMessage,
  publishedGroupId,
  spaceId,
  statusMessage,
}: AdminApplicationSetupViewProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          申請作成
        </h2>
        <p className="max-w-2xl text-[15px] leading-6 text-slate-600 md:text-[16px]">
          フォーム設定と承認フロー設定を入力し、最後に下書き保存または申請公開します。
        </p>
      </div>

      <ApplicationSetupDraftForm
        action={submitApplicationSetupAction}
        errorMessage={errorMessage}
        statusMessage={statusMessage}
        publishedGroupId={publishedGroupId}
        assignees={assignees}
        spaceId={spaceId}
      />
    </div>
  );
}
