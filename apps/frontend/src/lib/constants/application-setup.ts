export const APPLICATION_SETUP_ERRORS = {
  invalidName: "invalid_name",
  invalidFields: "invalid_fields",
  invalidSteps: "invalid_steps",
  approvalFlowRequiresPublish: "approval_flow_requires_publish",
  saveFailed: "save_failed",
} as const;

export type ApplicationSetupError =
  (typeof APPLICATION_SETUP_ERRORS)[keyof typeof APPLICATION_SETUP_ERRORS];

export const APPLICATION_SETUP_ERROR_MESSAGES: Record<
  ApplicationSetupError,
  string
> = {
  [APPLICATION_SETUP_ERRORS.invalidName]: "申請名を入力してください。",
  [APPLICATION_SETUP_ERRORS.invalidFields]:
    "フォーム項目を1件以上設定してください。",
  [APPLICATION_SETUP_ERRORS.invalidSteps]:
    "承認ステップを1件以上設定してください。",
  [APPLICATION_SETUP_ERRORS.approvalFlowRequiresPublish]:
    "下書き保存は完了しました。承認フローは公開済みフォームにしか保存できないバックエンドが起動中です。backend を再起動するか、申請公開で保存してください。",
  [APPLICATION_SETUP_ERRORS.saveFailed]:
    "保存に失敗しました。入力内容を確認して再度実行してください。",
};

export const APPLICATION_SETUP_STATUSES = {
  draftSaved: "draft_saved",
  published: "published",
} as const;

export type ApplicationSetupStatus =
  (typeof APPLICATION_SETUP_STATUSES)[keyof typeof APPLICATION_SETUP_STATUSES];

export const APPLICATION_SETUP_STATUS_MESSAGES: Record<
  ApplicationSetupStatus,
  string
> = {
  [APPLICATION_SETUP_STATUSES.draftSaved]: "下書きを保存しました。",
  [APPLICATION_SETUP_STATUSES.published]: "申請を公開しました。",
};
