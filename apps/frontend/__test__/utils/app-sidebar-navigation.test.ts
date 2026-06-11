import {
  canManageSidebarSpace,
  getPrimarySidebarNavItems,
  tenantAdminSidebarNavItems,
} from "@/components/app-sidebar-navigation";
import type { AppSidebarSpace } from "@/components/app-sidebar.types";

const userSpace: AppSidebarSpace = {
  id: "space-1",
  name: "市民課",
  currentUserRole: "user",
};

const adminSpace: AppSidebarSpace = {
  ...userSpace,
  currentUserRole: "admin",
};

describe("app sidebar navigation", () => {
  // テスト内容: スペース管理者だけがメンバー管理リンクを見られることを確認する
  it("filters workspace navigation by active space role", () => {
    expect(
      getPrimarySidebarNavItems({
        activeSpace: userSpace,
        isTenantAdmin: false,
        variant: "workspace",
      }).map((item) => item.label),
    ).toEqual(["申請フォーム一覧", "申請一覧", "申請フォーム作成"]);

    expect(
      getPrimarySidebarNavItems({
        activeSpace: adminSpace,
        isTenantAdmin: false,
        variant: "workspace",
      }).map((item) => item.label),
    ).toContain("メンバー");
  });

  // テスト内容: テナント管理者はアクティブスペースに依存せず管理リンクを見られることを確認する
  it("allows tenant admins to manage the active space", () => {
    expect(canManageSidebarSpace({ activeSpace: userSpace, isTenantAdmin: true })).toBe(
      true,
    );
    expect(
      getPrimarySidebarNavItems({
        activeSpace: undefined,
        isTenantAdmin: true,
        variant: "workspace",
      }).map((item) => item.label),
    ).toContain("メンバー");
  });

  // テスト内容: 申請者向け表示とテナント管理リンクの定義を確認する
  it("returns applicant and tenant admin navigation groups", () => {
    expect(
      getPrimarySidebarNavItems({
        activeSpace: adminSpace,
        isTenantAdmin: false,
        variant: "applicant",
      }).map((item) => item.label),
    ).toEqual(["申請フォーム一覧", "申請フォーム作成"]);
    expect(tenantAdminSidebarNavItems.map((item) => item.label)).toEqual([
      "スペース",
      "ユーザ",
      "監査ログ",
    ]);
  });
});
