export const APPLICATION_STATUSES = {
  draft: "draft",
  submitted: "submitted",
  inReview: "in_review",
  returned: "returned",
  approved: "approved",
  rejected: "rejected",
  published: "published",
} as const;

export type ApplicationStatus =
  (typeof APPLICATION_STATUSES)[keyof typeof APPLICATION_STATUSES];

export const APPLICATION_STATUS_LABELS: Partial<Record<ApplicationStatus, string>> =
  {
    [APPLICATION_STATUSES.draft]: "下書き",
    [APPLICATION_STATUSES.submitted]: "提出済み",
    [APPLICATION_STATUSES.inReview]: "レビュー中",
    [APPLICATION_STATUSES.returned]: "差し戻し",
    [APPLICATION_STATUSES.approved]: "承認",
    [APPLICATION_STATUSES.rejected]: "却下",
    [APPLICATION_STATUSES.published]: "公開済み",
  };

export const APPLICATION_LIST_VIEWS = {
  mine: "mine",
  review: "review",
  all: "all",
} as const;

export type ApplicationListView =
  (typeof APPLICATION_LIST_VIEWS)[keyof typeof APPLICATION_LIST_VIEWS];

export const APPLICATION_LIST_VIEW_OPTIONS: {
  view: ApplicationListView;
  label: string;
}[] = [
  { view: APPLICATION_LIST_VIEWS.mine, label: "自分の申請" },
  { view: APPLICATION_LIST_VIEWS.review, label: "レビュー対象" },
  { view: APPLICATION_LIST_VIEWS.all, label: "すべて" },
];
