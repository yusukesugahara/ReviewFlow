export type ApiSuccessJson<TData> = {
  status: number;
  data: TData;
};

export type TenantRole = "tenant_admin" | "tenant_user";
export type GroupRole = "admin" | "user";
export type FormStatus = "draft" | "published" | "archived";
export type ApplicationDraftStatus = "draft" | "published";

export type AuthUserSummary = {
  id: string;
  email: string;
  name?: string | null;
  role: TenantRole;
  tenantId: string;
};

export type AuthIssueTokensResponse = {
  access_token: string;
  user: AuthUserSummary;
};

export type LoginRequestBody = {
  email: string;
  password: string;
  tenantId?: string;
};
export type AuthLoginSuccessJson = ApiSuccessJson<AuthIssueTokensResponse>;

export type RegisterRequestBody = {
  email: string;
  password: string;
  organizationName?: string;
};
export type AuthRegisterSuccessJson = ApiSuccessJson<AuthIssueTokensResponse>;

export type AuthMeResponse = {
  id: string;
  email: string;
  name?: string | null;
  roles: string[];
  tenantId: string;
};
export type AuthMeSuccessJson = ApiSuccessJson<AuthMeResponse>;

export type UpdateMeProfileBody = {
  name?: string | null;
};
export type UpdateMeProfileSuccessJson =
  ApiSuccessJson<AuthIssueTokensResponse>;

export type RequestMeEmailChangeBody = {
  email: string;
};
export type RequestMeEmailChangeSuccessJson = ApiSuccessJson<{ ok: boolean }>;

export type ConfirmEmailChangeBody = {
  token: string;
};
export type ConfirmEmailChangeSuccessJson = ApiSuccessJson<{ ok: boolean }>;

export type UpdateMePasswordBody = {
  currentPassword: string;
  newPassword: string;
};
export type UpdateMePasswordSuccessJson =
  ApiSuccessJson<AuthIssueTokensResponse>;

export type RequestPasswordResetBody = {
  email: string;
};
export type RequestPasswordResetSuccessJson = ApiSuccessJson<{ ok: boolean }>;

export type ConfirmPasswordResetBody = {
  token: string;
  password: string;
};
export type ConfirmPasswordResetSuccessJson = ApiSuccessJson<{ ok: boolean }>;

export type AcceptInvitationBody = {
  token: string;
  name?: string;
  password: string;
};
export type AcceptInvitationSuccessJson =
  ApiSuccessJson<AuthIssueTokensResponse>;

export type RequestFormAccessBody = {
  email: string;
};
export type RequestFormAccessSuccessJson = ApiSuccessJson<{
  accepted: boolean;
}>;

export type FieldOption = {
  value: string;
  label: string;
};

export type FormFieldResponse = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  options?: unknown[] | null;
  sortOrder: number;
  createdAt: string;
};

export type FormDefinitionResponse = {
  id: string;
  groupId: string;
  name: string;
  description?: string | null;
  status: FormStatus;
  createdByUserId: string;
  fields: FormFieldResponse[];
  createdAt: string;
  updatedAt: string;
};

export type PublicCurrentFormDefinitionSuccessJson =
  ApiSuccessJson<FormDefinitionResponse>;

export type CreatePublicApplicationBody = {
  groupId: string;
  formDefinitionId?: string;
  values?: Record<string, unknown>;
};
export type CreatePublicApplicationSuccessJson =
  ApiSuccessJson<ApplicationDetail>;

export type FormDefinitionsListSuccessJson = ApiSuccessJson<{
  definitions: FormDefinitionResponse[];
}>;

export type GroupSummary = {
  id: string;
  name: string;
  description: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  currentUserRole?: GroupRole | null;
};

export type GroupsListSuccessJson = ApiSuccessJson<{
  groups: GroupSummary[];
}>;

export type SpaceDashboardSummary = {
  id: string;
  name: string;
  description: string | null;
  currentUserRole?: GroupRole | null;
  memberCount: number;
  formCount: number;
  publishedFormCount: number;
  totalApplications: number;
  needsActionCount: number;
  returnedCount: number;
  approvedCount: number;
  rejectedCount: number;
  correctionCount: number;
  resubmitCount: number;
  avgReturns: string;
  latestApplicationAt: string | null;
};

export type SpaceDashboardSuccessJson = ApiSuccessJson<{
  spaces: SpaceDashboardSummary[];
}>;

export type CreateGroupBody = {
  name: string;
  description?: string;
  adminUserIds: string[];
};
export type CreateGroupSuccessJson = ApiSuccessJson<GroupSummary>;

export type UpdateGroupBody = {
  name: string;
  description?: string;
};
export type UpdateGroupSuccessJson = ApiSuccessJson<GroupSummary>;

export type GroupMemberSummary = {
  id: string;
  groupId: string;
  userId: string;
  email: string;
  name?: unknown;
  role: GroupRole;
  createdAt: string;
  updatedAt: string;
};

export type GroupMembersListSuccessJson = ApiSuccessJson<{
  members: GroupMemberSummary[];
}>;

export type AddGroupMemberBody = {
  userId: string;
  role: GroupRole;
};
export type AddGroupMemberSuccessJson = ApiSuccessJson<GroupMemberSummary>;

export type UpdateGroupMemberRoleBody = {
  role: GroupRole;
};
export type UpdateGroupMemberRoleSuccessJson =
  ApiSuccessJson<GroupMemberSummary>;

export type GroupAvailableUserSummary = {
  id: string;
  email: string;
  name?: unknown;
};

export type GroupAvailableUsersSuccessJson = ApiSuccessJson<{
  users: GroupAvailableUserSummary[];
}>;

export type CreateInvitationBody = {
  email: string;
  role: TenantRole;
  groupId?: string;
  groupRole?: GroupRole;
};

export type CreateInvitationResponse = {
  id: string;
  email: string;
  role: string;
  groupId?: string | null;
  groupRole?: string | null;
  expiresAt: string;
};
export type CreateInvitationSuccessJson =
  ApiSuccessJson<CreateInvitationResponse>;

export type CreateExportJobBody = {
  groupId: string;
  formDefinitionId?: string;
  status?:
    | "draft"
    | "published"
    | "submitted"
    | "in_review"
    | "returned"
    | "approved"
    | "rejected";
};

export type ExportJobResponse = {
  id: string;
  groupId: string;
  status: string;
  filterJson?: unknown;
  filePath?: unknown;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
};

export type CreateExportJobSuccessJson = ApiSuccessJson<ExportJobResponse>;
export type GetExportJobSuccessJson = ApiSuccessJson<ExportJobResponse>;

export type AuditEventActor = {
  id?: string | null;
  type?: string | null;
  email?: string | null;
  label?: string | null;
};

export type AuditEventResource = {
  id?: string | null;
  type?: string | null;
  label?: string | null;
};

export type AuditEventChange = {
  field: string;
  from?: unknown;
  to?: unknown;
};

export type AuditLogItem = {
  id: string;
  groupId?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorType: string;
  actorEmailSnapshot?: string | null;
  actionType: string;
  targetType: string;
  targetId?: string | null;
  scopeType?: string | null;
  scopeId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  resourceLabel?: string | null;
  operation?: string | null;
  outcome?: string | null;
  actor?: AuditEventActor | null;
  resource?: AuditEventResource | null;
  changes?: AuditEventChange[] | null;
  targetUserId?: string | null;
  targetEmailSnapshot?: string | null;
  applicationId?: string | null;
  statusFrom?: string | null;
  statusTo?: string | null;
  stepOrderFrom?: number | null;
  stepOrderTo?: number | null;
  roleFrom?: string | null;
  roleTo?: string | null;
  groupRoleFrom?: string | null;
  groupRoleTo?: string | null;
  summary?: string | null;
  metadataJson?: Record<string, unknown> | null;
  createdAt: string;
};

export type AuditLogsListSuccessJson = ApiSuccessJson<{
  logs: AuditLogItem[];
  total: number;
  limit: number;
  offset: number;
}>;

export type ApplicationSummary = {
  id: string;
  groupId: string;
  status: string;
  approvalFlowId: string;
  formDefinitionId: string;
  formDefinitionName: string;
  applicationName: string;
  applicantEmail: string;
  applicantUserId?: string | null;
  currentStepOrder?: number | null;
  currentStepAssigneeUserIds: string[];
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationsListSuccessJson = ApiSuccessJson<{
  applications: ApplicationSummary[];
}>;

export type ApplicationCapabilities = {
  canEditApplication: boolean;
  canSubmitApplication: boolean;
  canResubmitApplication: boolean;
  canApproveApplication: boolean;
  canRejectApplication: boolean;
  canReturnApplication: boolean;
};

export type ApplicationProgressUser = {
  id: string;
  email: string;
  name?: string | null;
};

export type ApplicationProgressAction = {
  id: string;
  action: string;
  comment?: string | null;
  actedAt: string;
  actedBy: ApplicationProgressUser;
};

export type ApplicationProgressStep = {
  id: string;
  stepOrder: number;
  stepName: string;
  canReturn: boolean;
  status: "pending" | "current" | "approved" | "returned" | "rejected";
  assignees: ApplicationProgressUser[];
  actions: ApplicationProgressAction[];
};

export type ApplicationDetail = ApplicationSummary & {
  capabilities: ApplicationCapabilities;
  currentStepCanReturn?: boolean | null;
  approvalProgress: ApplicationProgressStep[];
  values: Record<string, unknown>;
};

export type GetApplicationSuccessJson = ApiSuccessJson<ApplicationDetail>;

export type CorrectionTargetItem = {
  itemId: string;
  formFieldId: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
  comment?: string | null;
  currentValue?: unknown;
};

export type CorrectionRequestItem = {
  id: string;
  formFieldId: string;
  fieldKey: string;
  comment?: string | null;
  isResolved: boolean;
  createdAt: string;
};

export type CorrectionRequest = {
  id: string;
  status: string;
  overallComment?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  items: CorrectionRequestItem[];
};

export type CorrectionsListSuccessJson = ApiSuccessJson<{
  corrections: CorrectionRequest[];
}>;

export type ApprovalStepResponse = {
  id: string;
  stepOrder: number;
  stepName: string;
  assigneeUserId: string;
  assigneeUserIds: string[];
  canReturn: boolean;
  createdAt: string;
};

export type ApprovalFlowResponse = {
  id: string;
  groupId: string;
  name: string;
  isActive: boolean;
  steps: ApprovalStepResponse[];
  createdAt: string;
  updatedAt: string;
};

export type ApprovalFlowsListSuccessJson = ApiSuccessJson<{
  flows: ApprovalFlowResponse[];
}>;

export type TenantUserSummary = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export type TenantUsersListResponse = {
  users: TenantUserSummary[];
};

export type UpdateUserRoleInput = {
  role: TenantRole;
};
