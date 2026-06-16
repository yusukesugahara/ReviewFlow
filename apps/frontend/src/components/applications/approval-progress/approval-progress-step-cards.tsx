"use client";

import { Badge } from "@/components/ui/badge";
import {
  actionLabel,
  displayUser,
  formatDateTime,
  progressStatusMeta,
} from "./approval-progress.helpers";
import type {
  ApplicationDetailViewModel,
  ApplicationProgressAction,
  ApplicationProgressStep,
  ApplicationProgressUser,
} from "../detail/application-detail.types";

/**
 * 承認進捗の開始カードを表示します。
 */
export function ApprovalProgressStartCard({
  application,
}: {
  application: ApplicationDetailViewModel;
}) {
  const submittedAt = application.submittedAt ?? application.createdAt ?? null;

  return (
    <div className="relative min-w-0 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">START</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-950">申請</h3>
        </div>
        <Badge variant="secondary">受付</Badge>
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <div>
          <p className="text-xs font-medium text-slate-500">申請者</p>
          <p className="mt-2 break-all font-medium text-slate-800">
            {application.applicantEmail ?? "-"}
          </p>
        </div>
        <div className="border-t border-slate-200 pt-3">
          <p className="text-xs font-medium text-slate-500">申請日時</p>
          <p className="mt-2 font-medium text-slate-800">
            {formatDateTime(submittedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * 承認進捗の 1 ステップカードを表示します。
 */
export function ApprovalProgressStepCard({
  isSelected,
  onSelect,
  step,
}: {
  isSelected: boolean;
  onSelect?: () => void;
  step: ApplicationProgressStep;
}) {
  const statusMeta = progressStatusMeta(step.status);
  const latestAction = step.actions.at(-1);
  const isSelectable = !!onSelect;
  const selectedClassName = isSelected
    ? "ring-2 ring-slate-500 ring-offset-2"
    : isSelectable
      ? "hover:border-slate-400"
      : "cursor-not-allowed opacity-70";

  return (
    <button
      type="button"
      className={`relative min-w-0 rounded-lg border p-3 text-left transition ${statusMeta.className} ${selectedClassName}`}
      onClick={onSelect}
      aria-pressed={isSelected}
      disabled={!isSelectable}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">
            STEP {step.stepOrder}
          </p>
          <h3 className="mt-1 break-words text-sm font-semibold text-slate-950">
            {step.stepName}
          </h3>
        </div>
        <Badge variant={statusMeta.badgeVariant}>{statusMeta.label}</Badge>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div>
          <p className="text-xs font-medium text-slate-500">承認・確認できる人</p>
          <UserList users={step.assignees} />
        </div>
        <div className="border-t border-slate-200 pt-3">
          <p className="text-xs font-medium text-slate-500">実施履歴</p>
          {step.actions.length > 0 ? (
            <div className="mt-2 space-y-2">
              {step.actions.map((action) => (
                <ActionHistory key={action.id} action={action} />
              ))}
            </div>
          ) : step.status === "current" ? (
            <p className="mt-2 text-sm font-medium text-blue-700">
              現在このステップで確認中
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">未実施</p>
          )}
        </div>
        {latestAction?.comment ? (
          <p className="rounded-md bg-white/70 px-3 py-2 text-xs leading-5 text-slate-700">
            {latestAction.comment}
          </p>
        ) : null}
      </div>
    </button>
  );
}

/**
 * 承認ステップに紐づくユーザー一覧を表示します。
 */
function UserList({ users }: { users: ApplicationProgressUser[] }) {
  if (users.length === 0) {
    return <p className="mt-2 text-sm text-slate-500">未設定</p>;
  }
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {users.map((user) => (
        <span
          key={user.id}
          className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
          title={user.email}
        >
          <span className="truncate">{displayUser(user)}</span>
        </span>
      ))}
    </div>
  );
}

/**
 * 承認ステップの操作履歴を表示します。
 */
function ActionHistory({ action }: { action: ApplicationProgressAction }) {
  return (
    <div className="rounded-md bg-white/70 px-3 py-2">
      <p className="text-sm font-medium text-slate-800">
        {displayUser(action.actedBy)} が {actionLabel(action.action)}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {formatDateTime(action.actedAt)}
      </p>
    </div>
  );
}
