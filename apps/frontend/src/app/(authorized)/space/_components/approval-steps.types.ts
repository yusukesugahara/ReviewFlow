export type ApprovalStepItem = {
  id: string;
  stepName: string;
  assigneeUserIds: string[];
  canReturn: boolean;
};

export type ApprovalAssigneeOption = {
  id: string;
  label: string;
};
