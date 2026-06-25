import { render, screen } from "@testing-library/react";
import RootPage from "@/app/page";

const mockRedirect = jest.fn();
const mockGetCurrentSessionUser = jest.fn();

jest.mock("next/navigation", () => ({
  redirect: (path: string) => mockRedirect(path),
}));

jest.mock("next/image", () => {
  const React = require("react") as typeof import("react");
  return {
    __esModule: true,
    default: ({
      alt,
      className,
      src,
    }: {
      alt: string;
      className?: string;
      src: string;
    }) => React.createElement("img", { alt, className, src }),
  };
});

jest.mock("next/link", () => {
  const React = require("react") as typeof import("react");
  return {
    __esModule: true,
    default: ({
      children,
      className,
      href,
    }: {
      children: React.ReactNode;
      className?: string;
      href: string;
    }) => React.createElement("a", { className, href }, children),
  };
});

jest.mock("@/app/(authorized)/session/actions", () => ({
  getCurrentSessionUser: () => mockGetCurrentSessionUser(),
}));

describe("RootPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  // テスト内容: 未ログインユーザにはマーケティングトップを表示することを確認する
  it("renders the marketing home for anonymous users", async () => {
    mockGetCurrentSessionUser.mockResolvedValue(null);

    render(await RootPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "ReviewFlow" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("差し戻しが前提の確認業務を、最後まで進める"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "申請後の確認と手戻りに時間がかかる業務へ",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /外部の申請者や取引先は、アカウント登録なしでメールリンクから提出・修正できます/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "補助金・助成金の確認業務",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "取引先登録・契約前確認",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "差し戻してから完了するまでを、同じ申請で追う",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByAltText("ReviewFlow の差し戻しと再提出を確認する管理画面"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/後から誰がいつ何を判断したか確認できます/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "監査対応" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /アカウントを作成/ }),
    ).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "© 2026 ReviewFlow. All rights reserved.",
    );
    expect(
      screen.getByRole("navigation", { name: "フッター内アカウントリンク" }),
    ).toHaveTextContent("ログイン");
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  // テスト内容: テナント管理者がスペース管理へリダイレクトされることを確認する
  it("redirects tenant admins to space administration", async () => {
    mockGetCurrentSessionUser.mockResolvedValue({
      id: "user-1",
      email: "admin@example.com",
      tenantId: "tenant-1",
      roles: ["tenant_admin"],
    });

    await expect(RootPage()).rejects.toThrow(
      "NEXT_REDIRECT:/admin/spaces",
    );

    expect(mockRedirect).toHaveBeenCalledWith("/admin/spaces");
  });

  // テスト内容: 管理者以外のユーザがスペースへリダイレクトされることを確認する
  it("redirects non-admin users to spaces", async () => {
    mockGetCurrentSessionUser.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      tenantId: "tenant-1",
      roles: ["tenant_user"],
    });

    await expect(RootPage()).rejects.toThrow("NEXT_REDIRECT:/space");

    expect(mockRedirect).toHaveBeenCalledWith("/space");
  });
});
