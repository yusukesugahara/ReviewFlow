const redirectMock = jest.fn();
const getCurrentSessionUserMock = jest.fn();

jest.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

jest.mock("@/app/(authorized)/session/actions", () => ({
  getCurrentSessionUser: getCurrentSessionUserMock,
}));

describe("RootRedirectPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    redirectMock.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  // テスト内容: 未ログインユーザーがログインへリダイレクトされることを確認する
  it("redirects anonymous users to login", async () => {
    getCurrentSessionUserMock.mockResolvedValue(null);
    const { default: RootRedirectPage } = await import("@/app/page");

    await expect(RootRedirectPage()).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  // テスト内容: テナント管理者がスペース管理へリダイレクトされることを確認する
  it("redirects tenant admins to space administration", async () => {
    getCurrentSessionUserMock.mockResolvedValue({
      id: "user-1",
      email: "admin@example.com",
      tenantId: "tenant-1",
      roles: ["tenant_admin"],
    });
    const { default: RootRedirectPage } = await import("@/app/page");

    await expect(RootRedirectPage()).rejects.toThrow(
      "NEXT_REDIRECT:/admin/spaces",
    );

    expect(redirectMock).toHaveBeenCalledWith("/admin/spaces");
  });

  // テスト内容: 管理者以外のユーザーがスペースへリダイレクトされることを確認する
  it("redirects non-admin users to spaces", async () => {
    getCurrentSessionUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      tenantId: "tenant-1",
      roles: ["tenant_user"],
    });
    const { default: RootRedirectPage } = await import("@/app/page");

    await expect(RootRedirectPage()).rejects.toThrow("NEXT_REDIRECT:/space");

    expect(redirectMock).toHaveBeenCalledWith("/space");
  });
});
