import type { components, operations, paths } from "@/lib/api-schema";

export type ApiPaths = paths;

export type LoginRequestBody =
  operations["AuthController_login"]["requestBody"]["content"]["application/json"];
export type AuthLoginSuccessJson =
  operations["AuthController_login"]["responses"][200]["content"]["application/json"];

export type RegisterRequestBody =
  operations["AuthController_register"]["requestBody"]["content"]["application/json"];
export type AuthRegisterSuccessJson =
  operations["AuthController_register"]["responses"][201]["content"]["application/json"];

export type AuthMeSuccessJson =
  operations["AuthController_me"]["responses"][200]["content"]["application/json"];
export type UpdateMeProfileBody =
  operations["AuthController_updateMeProfile"]["requestBody"]["content"]["application/json"];
export type UpdateMeProfileSuccessJson =
  operations["AuthController_updateMeProfile"]["responses"][200]["content"]["application/json"];
export type RequestMeEmailChangeBody =
  operations["AuthController_requestMeEmailChange"]["requestBody"]["content"]["application/json"];
export type RequestMeEmailChangeSuccessJson =
  operations["AuthController_requestMeEmailChange"]["responses"][200]["content"]["application/json"];
export type ConfirmEmailChangeBody =
  operations["AuthController_confirmEmailChange"]["requestBody"]["content"]["application/json"];
export type ConfirmEmailChangeSuccessJson =
  operations["AuthController_confirmEmailChange"]["responses"][200]["content"]["application/json"];
export type UpdateMePasswordBody =
  operations["AuthController_updateMePassword"]["requestBody"]["content"]["application/json"];
export type UpdateMePasswordSuccessJson =
  operations["AuthController_updateMePassword"]["responses"][200]["content"]["application/json"];

export type RequestPasswordResetBody =
  operations["AuthController_requestPasswordReset"]["requestBody"]["content"]["application/json"];
export type RequestPasswordResetSuccessJson =
  operations["AuthController_requestPasswordReset"]["responses"][200]["content"]["application/json"];

export type ConfirmPasswordResetBody =
  operations["AuthController_confirmPasswordReset"]["requestBody"]["content"]["application/json"];
export type ConfirmPasswordResetSuccessJson =
  operations["AuthController_confirmPasswordReset"]["responses"][200]["content"]["application/json"];

export type AcceptInvitationBody =
  operations["InvitationsController_accept"]["requestBody"]["content"]["application/json"];
export type AcceptInvitationSuccessJson =
  operations["InvitationsController_accept"]["responses"][200]["content"]["application/json"];

export type RequestFormAccessBody =
  operations["FormDefinitionsController_requestAccess"]["requestBody"]["content"]["application/json"];
export type RequestFormAccessSuccessJson =
  operations["FormDefinitionsController_requestAccess"]["responses"][200]["content"]["application/json"];

export type PublicCurrentFormDefinitionSuccessJson =
  operations["FormDefinitionsController_getCurrentForApplicant"]["responses"][200]["content"]["application/json"];
export type CreatePublicApplicationBody =
  operations["PublicApplicationsController_create"]["requestBody"]["content"]["application/json"];
export type CreatePublicApplicationSuccessJson =
  operations["PublicApplicationsController_create"]["responses"][201]["content"]["application/json"];

export type FormDefinitionResponse = components["schemas"]["FormDefinitionResponseDto"];
export type FormFieldResponse = components["schemas"]["FormFieldResponseDto"];
export type FormDefinitionsListSuccessJson =
  operations["FormDefinitionsController_list"]["responses"][200]["content"]["application/json"];

export type GroupsListSuccessJson =
  operations["GroupsController_list"]["responses"][200]["content"]["application/json"];
export type GroupSummary = components["schemas"]["GroupSummaryDto"];
export type SpaceDashboardSuccessJson =
  operations["GroupsController_dashboard"]["responses"][200]["content"]["application/json"];
export type SpaceDashboardSummary =
  components["schemas"]["SpaceDashboardSummaryDto"];
export type CreateGroupBody =
  operations["GroupsController_create"]["requestBody"]["content"]["application/json"];
export type CreateGroupSuccessJson =
  operations["GroupsController_create"]["responses"][201]["content"]["application/json"];
export type UpdateGroupBody =
  operations["GroupsController_update"]["requestBody"]["content"]["application/json"];
export type UpdateGroupSuccessJson =
  operations["GroupsController_update"]["responses"][200]["content"]["application/json"];
export type GroupMembersListSuccessJson =
  operations["GroupsController_listMembers"]["responses"][200]["content"]["application/json"];
export type GroupMemberSummary = components["schemas"]["GroupMemberSummaryDto"];
export type AddGroupMemberBody =
  operations["GroupsController_addMember"]["requestBody"]["content"]["application/json"];
export type AddGroupMemberSuccessJson =
  operations["GroupsController_addMember"]["responses"][201]["content"]["application/json"];
export type UpdateGroupMemberRoleBody =
  operations["GroupsController_updateMemberRole"]["requestBody"]["content"]["application/json"];
export type UpdateGroupMemberRoleSuccessJson =
  operations["GroupsController_updateMemberRole"]["responses"][200]["content"]["application/json"];
export type GroupAvailableUsersSuccessJson =
  operations["GroupsController_listAvailableUsers"]["responses"][200]["content"]["application/json"];
export type GroupAvailableUserSummary =
  components["schemas"]["GroupAvailableUserSummaryDto"];

export type CreateInvitationBody =
  operations["InvitationsController_create"]["requestBody"]["content"]["application/json"];
export type CreateInvitationSuccessJson =
  operations["InvitationsController_create"]["responses"][201]["content"]["application/json"];

export type CreateExportJobBody =
  operations["ExportJobsController_create"]["requestBody"]["content"]["application/json"];
export type CreateExportJobSuccessJson =
  operations["ExportJobsController_create"]["responses"][201]["content"]["application/json"];
export type GetExportJobSuccessJson =
  operations["ExportJobsController_getOne"]["responses"][200]["content"]["application/json"];
export type ExportJobResponse = components["schemas"]["ExportJobResponseDto"];

export type AuditLogsListSuccessJson =
  operations["AuditLogsController_list"]["responses"][200]["content"]["application/json"];
export type AuditLogItem = components["schemas"]["AuditLogItemDto"];

export type ApplicationsListSuccessJson =
  operations["ApplicationsController_list"]["responses"][200]["content"]["application/json"];
export type ApplicationSummary = components["schemas"]["ApplicationSummaryDto"];
export type GetApplicationSuccessJson =
  operations["ApplicationsController_getOne"]["responses"][200]["content"]["application/json"];
export type ApplicationDetail = components["schemas"]["ApplicationDetailDto"];
export type CorrectionsListSuccessJson =
  operations["ApplicationsController_listCorrections"]["responses"][200]["content"]["application/json"];
export type CorrectionRequest = components["schemas"]["CorrectionRequestResponseDto"];
export type ApprovalFlowsListSuccessJson =
  operations["ApprovalFlowsController_list"]["responses"][200]["content"]["application/json"];
export type ApprovalFlowResponse = components["schemas"]["ApprovalFlowResponseDto"];

export type TenantUserSummary = components["schemas"]["TenantUserSummaryDto"];
export type TenantUsersListResponse =
  components["schemas"]["TenantUsersListResponseDto"];
export type UpdateUserRoleInput = components["schemas"]["UpdateUserRoleDto"];
