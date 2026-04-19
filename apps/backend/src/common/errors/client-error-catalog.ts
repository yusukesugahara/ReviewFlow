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
  USER_ROLE_NOT_ASSIGNABLE: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Role cannot be assigned via this API',
  },
  LAST_TENANT_ADMIN_PROTECTED: {
    status: HttpStatus.CONFLICT,
    message: 'At least one tenant_admin must remain in the workspace',
  },
  FORM_TEMPLATE_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    message: 'Form template not found in this workspace',
  },
  FORM_TEMPLATE_IMMUTABLE: {
    status: HttpStatus.CONFLICT,
    message: 'Form template can only be edited while in draft status',
  },
  FORM_TEMPLATE_NOT_PUBLISHABLE: {
    status: HttpStatus.CONFLICT,
    message: 'Only draft form templates can be published',
  },
  FORM_FIELD_KEY_EXISTS: {
    status: HttpStatus.CONFLICT,
    message: 'A field with this key already exists on the template',
  },
  APPROVAL_FORM_TEMPLATE_NOT_PUBLISHED: {
    status: HttpStatus.CONFLICT,
    message: 'Approval flows can only be attached to published form templates',
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
    message: 'Application is not in draft status',
  },
  APPLICATION_NOT_EDITABLE: {
    status: HttpStatus.CONFLICT,
    message: 'Only draft applications can be edited via this endpoint',
  },
  APPLICATION_FORM_NOT_PUBLISHED: {
    status: HttpStatus.CONFLICT,
    message: 'Applications can only be created from published form templates',
  },
  APPLICATION_NO_APPROVAL_FLOW: {
    status: HttpStatus.CONFLICT,
    message: 'No active approval flow exists for this form template',
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

export function clientError(
  code: ClientErrorCode,
  message?: string,
): BaseError {
  const def = ClientErrorCatalog[code];
  return new BaseError(def.status, code, message ?? def.message);
}
