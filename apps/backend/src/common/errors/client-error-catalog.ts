import { HttpStatus } from '@nestjs/common';
import { BaseError } from '../../utils/errors/base.error';

/**
 * クライアント向けエラー定義。
 * キーが API の errorCode になり、同じブロックに HTTP status とメッセージをまとめる。
 */
export const ClientErrorCatalog = {
  AUTH_EMAIL_TAKEN: {
    status: HttpStatus.CONFLICT,
    message: 'Email is already registered',
  },
  AUTH_EMAIL_UNCHANGED: {
    status: HttpStatus.BAD_REQUEST,
    message: 'New email must be different from the current email',
  },
  AUTH_EMAIL_CHANGE_TOKEN_INVALID: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Email change token is invalid or expired',
  },
  AUTH_TENANT_REQUIRED: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Multiple accounts use this email; specify tenantId to log in',
  },
  AUTH_INVALID_CREDENTIALS: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Invalid email or password',
  },
  AUTH_API_KEY_MISSING: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Missing X-API-Key header',
  },
  AUTH_API_KEY_INVALID: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Invalid X-API-Key',
  },
  AUTH_JWT_UNAUTHORIZED: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Invalid or missing bearer token',
  },
  AUTH_FORBIDDEN_ROLE: {
    status: HttpStatus.FORBIDDEN,
    message: 'Insufficient role for this resource',
  },
  INVITATION_MEMBER_EXISTS: {
    status: HttpStatus.CONFLICT,
    message: 'A user with this email already exists in the workspace',
  },
  INVITATION_PENDING_EXISTS: {
    status: HttpStatus.CONFLICT,
    message: 'A pending invitation already exists for this email',
  },
  INVITATION_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    message: 'Invitation not found',
  },
  INVITATION_NOT_ACCEPTABLE: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invitation cannot be accepted',
  },
  TENANT_USER_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    message: 'User not found in this workspace',
  },
  USER_ROLE_UPDATE_SELF_FORBIDDEN: {
    status: HttpStatus.FORBIDDEN,
    message: 'Cannot change your own role from this endpoint',
  },
  USER_DELETE_SELF_FORBIDDEN: {
    status: HttpStatus.FORBIDDEN,
    message: 'Cannot delete your own account from this endpoint',
  },
  USER_ROLE_NOT_ASSIGNABLE: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Role cannot be assigned via this API',
  },
  LAST_TENANT_ADMIN_PROTECTED: {
    status: HttpStatus.CONFLICT,
    message: 'At least one tenant_admin must remain in the workspace',
  },
  GROUP_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    message: 'Space not found in this workspace',
  },
  GROUP_NAME_EXISTS: {
    status: HttpStatus.CONFLICT,
    message: 'A space with this name already exists in the workspace',
  },
  GROUP_MEMBER_EXISTS: {
    status: HttpStatus.CONFLICT,
    message: 'User is already a member of this space',
  },
  GROUP_MEMBER_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    message: 'User is not a member of this space',
  },
  GROUP_ADMIN_REQUIRED: {
    status: HttpStatus.FORBIDDEN,
    message: 'Space admin permission is required',
  },
  LAST_GROUP_ADMIN_PROTECTED: {
    status: HttpStatus.CONFLICT,
    message: 'At least one space admin must remain in the space',
  },
  FORM_DEFINITION_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    message: 'Form definition not found in this workspace',
  },
  FORM_DEFINITION_ALREADY_EXISTS: {
    status: HttpStatus.CONFLICT,
    message: 'This space already has a form definition',
  },
  FORM_DEFINITION_AMBIGUOUS: {
    status: HttpStatus.BAD_REQUEST,
    message:
      'Multiple published form definitions exist in this space; specify formDefinitionId',
  },
  FORM_DEFINITION_IMMUTABLE: {
    status: HttpStatus.CONFLICT,
    message: 'Form definition can only be edited while in draft status',
  },
  FORM_DEFINITION_NOT_PUBLISHABLE: {
    status: HttpStatus.CONFLICT,
    message: 'Only draft form definitions can be published',
  },
  FORM_FIELD_KEY_EXISTS: {
    status: HttpStatus.CONFLICT,
    message: 'A field with this key already exists on the form definition',
  },
  FORM_FIELD_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    message: 'Form field not found on this form definition',
  },
  APPROVAL_FORM_DEFINITION_NOT_PUBLISHED: {
    status: HttpStatus.CONFLICT,
    message:
      'Approval flows can only be attached to published form definitions',
  },
  APPROVAL_FLOW_STEPS_INVALID: {
    status: HttpStatus.BAD_REQUEST,
    message:
      'Approval steps must have unique stepOrder values starting at 1 and contiguous',
  },
  APPROVAL_FLOW_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    message: 'Approval flow not found in this workspace',
  },
  APPLICATION_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    message: 'Application not found in this workspace',
  },
  APPLICATION_ACCESS_DENIED: {
    status: HttpStatus.FORBIDDEN,
    message: 'You cannot access this application',
  },
  APPLICATION_NOT_DRAFT: {
    status: HttpStatus.CONFLICT,
    message: 'Application is not in draft or published status',
  },
  APPLICATION_NOT_EDITABLE: {
    status: HttpStatus.CONFLICT,
    message:
      'Only draft, published, or returned applications can be edited via this endpoint',
  },
  APPLICATION_FORM_NOT_PUBLISHED: {
    status: HttpStatus.CONFLICT,
    message: 'Applications can only be created from published form definitions',
  },
  APPLICATION_NO_APPROVAL_FLOW: {
    status: HttpStatus.CONFLICT,
    message: 'No active approval flow exists for this space',
  },
  APPLICATION_APPROVAL_FLOW_AMBIGUOUS: {
    status: HttpStatus.CONFLICT,
    message: 'Multiple active approval flows exist; specify approvalFlowId',
  },
  APPLICATION_FIELD_UNKNOWN: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Unknown field key in values payload',
  },
  APPLICATION_FIELD_VALUE_INVALID: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Field value does not match the field type',
  },
  APPLICATION_REQUIRED_FIELDS_MISSING: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Required fields must be filled before submit',
  },
  APPLICATION_NOT_IN_REVIEW: {
    status: HttpStatus.CONFLICT,
    message: 'Application is not awaiting approval',
  },
  APPLICATION_APPROVAL_FORBIDDEN: {
    status: HttpStatus.FORBIDDEN,
    message: 'You cannot approve or reject this application at this step',
  },
  APPLICATION_RETURN_NOT_ALLOWED: {
    status: HttpStatus.CONFLICT,
    message: 'Return is not allowed at this approval step',
  },
  APPLICATION_RETURN_FIELDS_INVALID: {
    status: HttpStatus.BAD_REQUEST,
    message:
      'Return payload must reference valid form fields on this form definition',
  },
  APPLICATION_CORRECTION_ALREADY_OPEN: {
    status: HttpStatus.CONFLICT,
    message: 'An open correction request already exists for this application',
  },
  APPLICATION_NOT_RETURNED: {
    status: HttpStatus.CONFLICT,
    message: 'Application is not in returned status',
  },
  APPLICATION_NO_OPEN_CORRECTION: {
    status: HttpStatus.CONFLICT,
    message: 'No open correction request to resolve',
  },
  APPLICATION_PATCH_FIELD_NOT_IN_CORRECTION: {
    status: HttpStatus.BAD_REQUEST,
    message: 'This field is not part of the open correction request',
  },
  APPLICATION_APPROVAL_STATE_INVALID: {
    status: HttpStatus.CONFLICT,
    message: 'Application is in an unexpected state for this operation',
  },
  APPLICATION_REVIEW_STATE_CONFLICT: {
    status: HttpStatus.CONFLICT,
    message:
      'Application review state has changed. Refresh the page and try again',
  },
  EXPORT_JOB_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    message: 'Export job not found in this workspace',
  },
  EXPORT_JOB_NOT_READY: {
    status: HttpStatus.CONFLICT,
    message: 'Export job is not completed yet',
  },
  EXPORT_JOB_FILE_MISSING: {
    status: HttpStatus.NOT_FOUND,
    message: 'Exported CSV file is missing',
  },
} as const satisfies Record<string, { status: HttpStatus; message: string }>;

export type ClientErrorCode = keyof typeof ClientErrorCatalog;

/** `ClientErrorCodes.AUTH_*` はカタログのキーと同じ文字列（型安全なエイリアス） */
export const ClientErrorCodes = Object.fromEntries(
  (Object.keys(ClientErrorCatalog) as ClientErrorCode[]).map((code) => [
    code,
    code,
  ]),
) as { readonly [K in ClientErrorCode]: K };

export const ClientErrorMessages = Object.fromEntries(
  (Object.keys(ClientErrorCatalog) as ClientErrorCode[]).map((code) => [
    code,
    ClientErrorCatalog[code].message,
  ]),
) as Record<ClientErrorCode, string>;

/**
 * 業務・入力・認可エラーを `BaseError` に変換する。
 *
 * HTTP 例外へ直接依存しないため、service / policy / repository からも同じ error code
 * で投げられる。
 */
export function clientError(
  code: ClientErrorCode,
  message?: string,
): BaseError {
  const def = ClientErrorCatalog[code];
  return new BaseError(def.status, code, message ?? def.message);
}
