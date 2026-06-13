import {
  buildBreadcrumbItems,
  buildSidebarLinkRoute,
  buildSpaceSwitcherHref,
  getActiveSpaceId,
  getPathSpaceId,
} from "@/components/layout/app-sidebar-routing";

const spaces = [
  { id: "citizen-space", name: "市民課" },
  { id: "road space", name: "道路公園課" },
];

describe("app sidebar routing", () => {
  it("detects the current space id from space-scoped routes", () => {
    expect(getPathSpaceId("/space/citizen-space")).toBe("citizen-space");
    expect(getPathSpaceId("/space/citizen-space/applications")).toBe(
      "citizen-space",
    );
    expect(getPathSpaceId("/space/road%20space/submissions/submission-1")).toBe(
      "road space",
    );
    expect(getPathSpaceId("/space/users")).toBeNull();
    expect(getPathSpaceId("/admin/spaces")).toBeNull();
  });

  it("resolves the active space from path, query, or fallback in that order", () => {
    expect(
      getActiveSpaceId({
        pathname: "/space/citizen-space/submissions",
        searchParams: new URLSearchParams({ spaceId: "road-space" }),
        fallbackSpaceId: "fallback-space",
      }),
    ).toBe("citizen-space");
    expect(
      getActiveSpaceId({
        pathname: "/space/users",
        searchParams: new URLSearchParams({ spaceId: "road-space" }),
        fallbackSpaceId: "fallback-space",
      }),
    ).toBe("road-space");
    expect(
      getActiveSpaceId({
        pathname: "/space/users",
        searchParams: new URLSearchParams(),
        fallbackSpaceId: "fallback-space",
      }),
    ).toBe("fallback-space");
  });

  it("builds space switcher links for admin, scoped, and unscoped pages", () => {
    expect(
      buildSpaceSwitcherHref({
        pathname: "/admin/spaces",
        searchParams: new URLSearchParams({ tab: "members" }),
        spaceId: "road space",
      }),
    ).toBe("/space/road%20space");
    expect(
      buildSpaceSwitcherHref({
        pathname: "/space/citizen-space",
        searchParams: new URLSearchParams(),
        spaceId: "road space",
      }),
    ).toBe("/space/road%20space");
    expect(
      buildSpaceSwitcherHref({
        pathname: "/space/citizen-space/applications/app-1",
        searchParams: new URLSearchParams({ view: "form" }),
        spaceId: "road space",
      }),
    ).toBe("/space/road%20space/applications/app-1?view=form");
    expect(
      buildSpaceSwitcherHref({
        pathname: "/space/users",
        searchParams: new URLSearchParams({ tab: "members" }),
        spaceId: "road space",
      }),
    ).toBe("/space/users?tab=members&spaceId=road+space");
  });

  it("builds scoped sidebar link hrefs and active states", () => {
    expect(
      buildSidebarLinkRoute({
        pathname: "/space/citizen-space",
        searchParams: new URLSearchParams(),
        fallbackSpaceId: "citizen-space",
        href: "/space",
        spacePath: "overview",
      }),
    ).toEqual({
      scopedHref: "/space/citizen-space",
      isActive: true,
    });
    expect(
      buildSidebarLinkRoute({
        pathname: "/space/citizen-space/applications/app-1",
        searchParams: new URLSearchParams(),
        fallbackSpaceId: "citizen-space",
        href: "/space/applications",
        spacePath: "applications",
      }),
    ).toEqual({
      scopedHref: "/space/citizen-space/applications",
      isActive: true,
    });
    expect(
      buildSidebarLinkRoute({
        pathname: "/space/citizen-space/applications/new",
        searchParams: new URLSearchParams(),
        fallbackSpaceId: "citizen-space",
        href: "/space/applications",
        spacePath: "applications",
      }),
    ).toEqual({
      scopedHref: "/space/citizen-space/applications",
      isActive: false,
    });
    expect(
      buildSidebarLinkRoute({
        pathname: "/space/citizen-space/applications/new",
        searchParams: new URLSearchParams(),
        fallbackSpaceId: "citizen-space",
        href: "/space/applications/new",
        spacePath: "applicationsNew",
      }),
    ).toEqual({
      scopedHref: "/space/citizen-space/applications/new",
      isActive: true,
    });
  });

  it("builds breadcrumb items for admin and space-scoped pages", () => {
    expect(
      buildBreadcrumbItems("/admin/audit-logs", spaces, new URLSearchParams()),
    ).toEqual([
      { href: "/admin", label: "管理" },
      { href: "/admin/audit-logs", label: "監査ログ" },
    ]);
    expect(
      buildBreadcrumbItems(
        "/space/road%20space",
        spaces,
        new URLSearchParams(),
      ),
    ).toEqual([
      { href: "/space", label: "スペース" },
      { href: "/space/road%20space", label: "道路公園課" },
    ]);
    expect(
      buildBreadcrumbItems(
        "/space/road%20space/applications/app-1/edit",
        spaces,
        new URLSearchParams({ view: "form" }),
      ),
    ).toEqual([
      { href: "/space", label: "スペース" },
      { href: "/space/road%20space", label: "道路公園課" },
      { href: "/space/road%20space/applications", label: "申請フォーム一覧" },
      {
        href: "/space/road%20space/applications/app-1?view=form",
        label: "フォーム詳細画面",
      },
      { href: "/space/road%20space/applications/app-1/edit", label: "編集" },
    ]);
    expect(
      buildBreadcrumbItems(
        "/space/citizen-space/submissions/app-1",
        spaces,
        new URLSearchParams(),
      ),
    ).toEqual([
      { href: "/space", label: "スペース" },
      { href: "/space/citizen-space", label: "市民課" },
      { href: "/space/citizen-space/submissions", label: "申請一覧" },
      { href: "/space/citizen-space/submissions/app-1", label: "申請詳細" },
    ]);
  });
});
