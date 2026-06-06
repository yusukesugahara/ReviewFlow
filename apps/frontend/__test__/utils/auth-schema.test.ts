import {
  acceptInvitationSchema,
  addGroupMemberSchema,
  authCredentialsSchema,
  confirmPasswordResetSchema,
  createExportJobSchema,
  createInvitationSchema,
  createSpaceSchema,
  inviteSpaceMemberSchema,
  requestFormAccessSchema,
  requestPasswordResetSchema,
  updateGroupMemberRoleSchema,
} from "@/lib/auth-schema";

describe("auth schemas", () => {
  // テスト内容: 認証入力とパスワード再設定入力の検証を確認する
  it("validates authentication and password reset inputs", () => {
    expect(
      authCredentialsSchema.safeParse({
        email: "user@example.com",
        password: "password123",
      }).success,
    ).toBe(true);
    expect(
      authCredentialsSchema.safeParse({
        email: "invalid",
        password: "short",
      }).success,
    ).toBe(false);

    expect(
      requestPasswordResetSchema.parse({ email: " user@example.com " }),
    ).toEqual({ email: "user@example.com" });
    expect(
      confirmPasswordResetSchema.safeParse({
        token: "token",
        password: "password123",
      }).success,
    ).toBe(true);
  });

  // テスト内容: 招待、フォームアクセス、出力入力の検証を確認する
  it("validates invitation, form access, and export inputs", () => {
    expect(
      acceptInvitationSchema.parse({
        token: "token",
        name: " User ",
        password: "password123",
        next: "/space",
      }),
    ).toEqual({
      token: "token",
      name: "User",
      password: "password123",
      next: "/space",
    });
    expect(
      requestFormAccessSchema.parse({
        groupId: "space-1",
        formDefinitionId: "definition-1",
        email: " member@example.com ",
      }),
    ).toEqual({
      groupId: "space-1",
      formDefinitionId: "definition-1",
      email: "member@example.com",
    });
    expect(createExportJobSchema.safeParse({ groupId: "space-1" }).success).toBe(true);
    expect(createExportJobSchema.safeParse({ groupId: "" }).success).toBe(false);
  });

  // テスト内容: テナント管理とスペース管理入力の検証を確認する
  it("validates tenant and space management inputs", () => {
    expect(
      createSpaceSchema.parse({
        name: " 営業部 ",
        description: " 説明 ",
        adminUserIds: ["user-1"],
      }),
    ).toEqual({
      name: "営業部",
      description: "説明",
      adminUserIds: ["user-1"],
    });
    expect(addGroupMemberSchema.safeParse({ userId: "user-1", role: "admin" }).success).toBe(true);
    expect(inviteSpaceMemberSchema.safeParse({
      email: "member@example.com",
      tenantRole: "tenant_user",
      groupRole: "user",
    }).success).toBe(true);
    expect(createInvitationSchema.safeParse({
      email: "admin@example.com",
      role: "tenant_admin",
    }).success).toBe(true);
    expect(updateGroupMemberRoleSchema.safeParse({ role: "owner" }).success).toBe(false);
  });
});
