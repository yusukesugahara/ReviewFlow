import {
  acceptInvitationSchema,
  addGroupMemberSchema,
  accountPasswordSchema,
  accountProfileSchema,
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
    const invalidAuth = authCredentialsSchema.safeParse({
      email: "invalid",
      password: "short",
    });
    expect(invalidAuth.success).toBe(false);
    expect(invalidAuth.error?.flatten().fieldErrors).toEqual({
      email: ["メールアドレスの形式で入力してください。"],
      password: ["パスワードは8文字以上で入力してください。"],
    });

    const emptyPassword = authCredentialsSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(emptyPassword.success).toBe(false);
    expect(emptyPassword.error?.flatten().fieldErrors.password).toEqual([
      "パスワードを入力してください。",
    ]);

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

  // テスト内容: アカウント設定入力の検証を確認する
  it("validates account settings inputs", () => {
    expect(
      accountProfileSchema.parse({
        name: " User ",
        email: " user@example.com ",
      }),
    ).toEqual({
      name: "User",
      email: "user@example.com",
    });

    expect(
      accountPasswordSchema.safeParse({
        currentPassword: "password123",
        newPassword: "newpassword123",
        newPasswordConfirmation: "newpassword123",
      }).success,
    ).toBe(true);

    const mismatch = accountPasswordSchema.safeParse({
      currentPassword: "password123",
      newPassword: "newpassword123",
      newPasswordConfirmation: "different123",
    });
    expect(mismatch.success).toBe(false);
    expect(mismatch.error?.flatten().fieldErrors.newPasswordConfirmation).toEqual([
      "新しいパスワードが一致しません。",
    ]);
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
    const invalidExport = createExportJobSchema.safeParse({ groupId: "" });
    expect(invalidExport.success).toBe(false);
    expect(invalidExport.error?.flatten().fieldErrors.groupId).toEqual([
      "スペースを選択してください。",
    ]);
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
    expect(
      inviteSpaceMemberSchema.safeParse({
        email: "member@example.com",
        tenantRole: "tenant_user",
        groupRole: "user",
      }).success,
    ).toBe(true);
    expect(
      createInvitationSchema.safeParse({
        email: "admin@example.com",
        role: "tenant_admin",
      }).success,
    ).toBe(true);
    const invalidRole = updateGroupMemberRoleSchema.safeParse({ role: "owner" });
    expect(invalidRole.success).toBe(false);
    expect(invalidRole.error?.flatten().fieldErrors.role).toEqual([
      "ロールを選択してください。",
    ]);
  });
});
