import { z } from "zod";

const EMAIL_REQUIRED_MESSAGE = "メールアドレスを入力してください。";
const EMAIL_FORMAT_MESSAGE = "メールアドレスの形式で入力してください。";
const PASSWORD_REQUIRED_MESSAGE = "パスワードを入力してください。";
const PASSWORD_MIN_LENGTH_MESSAGE = "パスワードは8文字以上で入力してください。";
const TOKEN_REQUIRED_MESSAGE = "トークンが見つかりません。";
const GROUP_REQUIRED_MESSAGE = "スペースを選択してください。";
const FORM_DEFINITION_REQUIRED_MESSAGE = "申請フォームを選択してください。";
const SPACE_NAME_REQUIRED_MESSAGE = "スペース名を入力してください。";
const SPACE_ADMIN_REQUIRED_MESSAGE = "管理者を1人以上選択してください。";
const USER_REQUIRED_MESSAGE = "ユーザを選択してください。";
const ROLE_REQUIRED_MESSAGE = "ロールを選択してください。";

function nonEmptyString(message: string) {
  return z.string({ error: message }).trim().min(1, message);
}

function emailSchema() {
  return z.string({ error: EMAIL_REQUIRED_MESSAGE }).trim().superRefine((value, ctx) => {
    if (value.length === 0) {
      ctx.addIssue({ code: "custom", message: EMAIL_REQUIRED_MESSAGE });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      ctx.addIssue({ code: "custom", message: EMAIL_FORMAT_MESSAGE });
    }
  });
}

function passwordSchema() {
  return z.string({ error: PASSWORD_REQUIRED_MESSAGE }).superRefine((value, ctx) => {
    if (value.length === 0) {
      ctx.addIssue({ code: "custom", message: PASSWORD_REQUIRED_MESSAGE });
      return;
    }
    if (value.length < 8) {
      ctx.addIssue({ code: "custom", message: PASSWORD_MIN_LENGTH_MESSAGE });
    }
  });
}

export const authCredentialsSchema = z.object({
  email: emailSchema(),
  password: passwordSchema(),
});

export type AuthCredentials = z.infer<typeof authCredentialsSchema>;

export const requestPasswordResetSchema = z.object({
  email: emailSchema(),
});

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

export const confirmPasswordResetSchema = z.object({
  token: nonEmptyString(TOKEN_REQUIRED_MESSAGE),
  password: passwordSchema(),
});

export type ConfirmPasswordResetInput = z.infer<typeof confirmPasswordResetSchema>;

export const confirmEmailChangeSchema = z.object({
  token: nonEmptyString(TOKEN_REQUIRED_MESSAGE),
});

export const acceptInvitationSchema = z.object({
  token: nonEmptyString(TOKEN_REQUIRED_MESSAGE),
  name: z.string().trim().optional(),
  password: passwordSchema(),
  next: z.string().optional(),
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export const requestFormAccessSchema = z.object({
  groupId: nonEmptyString(GROUP_REQUIRED_MESSAGE),
  formDefinitionId: z.string().optional(),
  email: emailSchema(),
});

export type RequestFormAccessInput = z.infer<typeof requestFormAccessSchema>;

export const createExportJobSchema = z.object({
  groupId: nonEmptyString(GROUP_REQUIRED_MESSAGE),
  formDefinitionId: nonEmptyString(FORM_DEFINITION_REQUIRED_MESSAGE).optional(),
});

export type CreateExportJobInput = z.infer<typeof createExportJobSchema>;

const spaceDetailsSchema = z.object({
  name: nonEmptyString(SPACE_NAME_REQUIRED_MESSAGE),
  description: z.string().trim().optional(),
});

export const createSpaceSchema = spaceDetailsSchema.extend({
  adminUserIds: z
    .array(nonEmptyString(USER_REQUIRED_MESSAGE), {
      error: SPACE_ADMIN_REQUIRED_MESSAGE,
    })
    .min(1, SPACE_ADMIN_REQUIRED_MESSAGE),
});

export const updateSpaceSchema = spaceDetailsSchema;

export const addGroupMemberSchema = z.object({
  userId: nonEmptyString(USER_REQUIRED_MESSAGE),
  role: z.enum(["admin", "user"], { error: ROLE_REQUIRED_MESSAGE }),
});

export const inviteSpaceMemberSchema = z.object({
  email: emailSchema(),
  tenantRole: z.enum(["tenant_admin", "tenant_user"], {
    error: ROLE_REQUIRED_MESSAGE,
  }),
  groupRole: z.enum(["admin", "user"], { error: ROLE_REQUIRED_MESSAGE }),
});

export const createInvitationSchema = z.object({
  email: emailSchema(),
  role: z.enum(["tenant_admin", "tenant_user"], {
    error: ROLE_REQUIRED_MESSAGE,
  }),
});

export const updateGroupMemberRoleSchema = z.object({
  role: z.enum(["admin", "user"], { error: ROLE_REQUIRED_MESSAGE }),
});

export const accountProfileSchema = z.object({
  name: z.string().trim().optional(),
});

export const accountEmailSchema = z.object({
  email: emailSchema(),
});

export const accountPasswordSchema = z
  .object({
    currentPassword: passwordSchema(),
    newPassword: passwordSchema(),
    newPasswordConfirmation: passwordSchema(),
  })
  .refine((value) => value.newPassword === value.newPasswordConfirmation, {
    message: "新しいパスワードが一致しません。",
    path: ["newPasswordConfirmation"],
  });
