import type { components, operations } from "@/lib/api-schema";

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

export type TenantUserSummary = components["schemas"]["TenantUserSummaryDto"];
export type TenantUsersListResponse =
  components["schemas"]["TenantUsersListResponseDto"];
export type UpdateUserRoleInput = components["schemas"]["UpdateUserRoleDto"];
