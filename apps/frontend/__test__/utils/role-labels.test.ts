import { spaceRoleLabel, userRoleLabel } from "@/lib/constants/role-labels";
import { SPACE_ROLES, TENANT_ROLES } from "@/lib/constants/roles";

describe("role-labels", () => {
  // テスト内容: テナントロールのラベルを返し、未知値は保持されることを確認する
  it("returns tenant role labels and preserves unknown values", () => {
    expect(userRoleLabel(TENANT_ROLES.admin)).toBe("テナント管理者");
    expect(userRoleLabel(TENANT_ROLES.user)).toBe("テナントユーザー");
    expect(userRoleLabel("custom_role")).toBe("custom_role");
  });

  // テスト内容: スペースロールのラベルを返し、未知値は保持されることを確認する
  it("returns space role labels and preserves unknown values", () => {
    expect(spaceRoleLabel(SPACE_ROLES.admin)).toBe("スペース管理者");
    expect(spaceRoleLabel(SPACE_ROLES.user)).toBe("スペースユーザー");
    expect(spaceRoleLabel("custom_role")).toBe("custom_role");
  });
});
