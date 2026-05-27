import { z } from "zod";

export const authCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type AuthCredentials = z.infer<typeof authCredentialsSchema>;

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().email(),
});

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

export const confirmPasswordResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export type ConfirmPasswordResetInput = z.infer<typeof confirmPasswordResetSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  name: z.string().trim().optional(),
  password: z.string().min(8),
  next: z.string().optional(),
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export const requestFormAccessSchema = z.object({
  groupId: z.string().min(1),
  formDefinitionId: z.string().optional(),
  email: z.string().trim().email(),
});

export type RequestFormAccessInput = z.infer<typeof requestFormAccessSchema>;

export const createExportJobSchema = z.object({
  groupId: z.string().min(1),
});

export type CreateExportJobInput = z.infer<typeof createExportJobSchema>;

export const createSpaceSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  adminUserIds: z.array(z.string().min(1)).min(1),
});

export const addGroupMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["admin", "user"]),
});

export const inviteSpaceMemberSchema = z.object({
  email: z.string().trim().email(),
  tenantRole: z.enum(["tenant_admin", "tenant_user"]),
  groupRole: z.enum(["admin", "user"]),
});

export const createInvitationSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["tenant_admin", "tenant_user"]),
});

export const updateGroupMemberRoleSchema = z.object({
  role: z.enum(["admin", "user"]),
});
