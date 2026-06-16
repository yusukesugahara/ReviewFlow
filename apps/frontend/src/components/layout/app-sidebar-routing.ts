export type AppSidebarRouteSpace = {
  id: string;
  name: string;
};

export type BreadcrumbItem = {
  href: string;
  label: string;
};

export type SidebarSpacePath =
  | "applications"
  | "applicationsNew"
  | "submissions";

type SidebarSearchParams = {
  get(name: string): string | null;
  toString(): string;
};

type ActiveSpaceIdInput = {
  pathname: string;
  searchParams: SidebarSearchParams;
  fallbackSpaceId?: string | null;
};

type SidebarLinkRouteInput = ActiveSpaceIdInput & {
  href: string;
  spacePath?: SidebarSpacePath;
};

/**
 * パス名からスペース ID を取得します。
 */
export function getPathSpaceId(pathname: string): string | null {
  const segments = getPathSegments(pathname);
  if (segments[0] !== "space" || segments.length < 2) {
    return null;
  }
  const [spaceId, section] = segments.slice(1);
  if (!spaceId || isUnscopedSpaceSection(spaceId)) {
    return null;
  }

  if (!section) {
    return decodeURIComponent(spaceId);
  }

  if (section !== "applications" && section !== "submissions") {
    return null;
  }
  return decodeURIComponent(spaceId);
}

/**
 * 現在のパスとスペース一覧からアクティブなスペース ID を解決します。
 */
export function getActiveSpaceId({
  pathname,
  searchParams,
  fallbackSpaceId,
}: ActiveSpaceIdInput): string | null {
  return getPathSpaceId(pathname) ?? searchParams.get("spaceId") ?? fallbackSpaceId ?? null;
}

/**
 * スペース切り替え後の遷移先 URL を組み立てます。
 */
export function buildSpaceSwitcherHref({
  pathname,
  searchParams,
  spaceId,
}: {
  pathname: string;
  searchParams: SidebarSearchParams;
  spaceId: string;
}): string {
  const params = new URLSearchParams(searchParams.toString());
  const pathSpaceId = getPathSpaceId(pathname);
  if (pathSpaceId) {
    const currentBase = `/space/${encodeURIComponent(pathSpaceId)}`;
    const nextBase = `/space/${encodeURIComponent(spaceId)}`;
    const nextPathname =
      pathname === currentBase
        ? `${nextBase}/applications`
        : pathname.replace(`${currentBase}/`, `${nextBase}/`);
    return appendQueryString(nextPathname, params);
  }

  if (pathname === "/space" || pathname.startsWith("/admin")) {
    return `/space/${encodeURIComponent(spaceId)}/applications`;
  }

  params.set("spaceId", spaceId);
  return `${pathname}?${params.toString()}`;
}

/**
 * サイドバーリンクの遷移先とアクティブ状態を組み立てます。
 */
export function buildSidebarLinkRoute({
  pathname,
  searchParams,
  fallbackSpaceId,
  href,
  spacePath,
}: SidebarLinkRouteInput): { scopedHref: string; isActive: boolean } {
  const activeSpaceId = getActiveSpaceId({
    pathname,
    searchParams,
    fallbackSpaceId,
  });
  const scopedHref = buildSidebarLinkHref({ href, spacePath, activeSpaceId });

  return {
    scopedHref,
    isActive: isSidebarLinkActive({ pathname, href, scopedHref, spacePath }),
  };
}

/**
 * 現在のパスからパンくず項目を組み立てます。
 */
export function buildBreadcrumbItems(
  pathname: string,
  spaces: AppSidebarRouteSpace[],
  searchParams: SidebarSearchParams,
): BreadcrumbItem[] {
  const segments = getPathSegments(pathname);

  if (segments[0] === "admin") {
    return buildAdminBreadcrumbItems(segments);
  }

  if (segments[0] === "account") {
    return [
      { href: "/space", label: "ホーム" },
      { href: "/account", label: "アカウント" },
    ];
  }

  if (segments[0] === "space") {
    return buildSpaceBreadcrumbItems(segments, spaces, searchParams);
  }

  return [{ href: "/", label: "ホーム" }];
}

/**
 * サイドバーリンクの href をスペース状態に応じて組み立てます。
 */
function buildSidebarLinkHref({
  href,
  spacePath,
  activeSpaceId,
}: {
  href: string;
  spacePath?: SidebarSpacePath;
  activeSpaceId: string | null;
}): string {
  if (spacePath === "applicationsNew" && activeSpaceId) {
    return `/space/${encodeURIComponent(activeSpaceId)}/applications/new`;
  }
  if (spacePath === "submissions" && activeSpaceId) {
    return `/space/${encodeURIComponent(activeSpaceId)}/submissions`;
  }
  if (spacePath === "applications" && activeSpaceId) {
    return `/space/${encodeURIComponent(activeSpaceId)}/applications`;
  }
  if (href.startsWith("/space") && activeSpaceId) {
    return `${href}?spaceId=${encodeURIComponent(activeSpaceId)}`;
  }
  return href;
}

/**
 * サイドバーリンクが現在のパスでアクティブかを判定します。
 */
function isSidebarLinkActive({
  pathname,
  href,
  scopedHref,
  spacePath,
}: {
  pathname: string;
  href: string;
  scopedHref: string;
  spacePath?: SidebarSpacePath;
}): boolean {
  const isSectionRoot = href === "/admin" || href === "/space";
  const isApplicationNewActive =
    spacePath === "applicationsNew" &&
    (pathname === scopedHref || pathname === href);
  const isApplicationsActive =
    spacePath === "applications" &&
    (pathname === scopedHref ||
      (pathname.startsWith(`${scopedHref}/`) &&
        pathname !== `${scopedHref}/new`) ||
      pathname === href);
  const isSubmissionsActive =
    spacePath === "submissions" &&
    (pathname === scopedHref ||
      pathname.startsWith(`${scopedHref}/`) ||
      pathname === href);

  if (
    spacePath === "applications" ||
    spacePath === "applicationsNew" ||
    spacePath === "submissions"
  ) {
    return (
      isApplicationsActive ||
      isApplicationNewActive ||
      isSubmissionsActive
    );
  }

  return isSectionRoot
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * 管理画面パスのパンくず項目を組み立てます。
 */
function buildAdminBreadcrumbItems(segments: string[]): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ href: "/admin", label: "管理" }];
  const section = segments[1];

  if (section === "spaces") {
    items.push({ href: "/admin/spaces", label: "スペース" });
  } else if (section === "invitations") {
    items.push({ href: "/admin/invitations", label: "ユーザ" });
  } else if (section === "audit-logs") {
    items.push({ href: "/admin/audit-logs", label: "監査ログ" });
  }

  return items;
}

/**
 * スペース配下パスのパンくず項目を組み立てます。
 */
function buildSpaceBreadcrumbItems(
  segments: string[],
  spaces: AppSidebarRouteSpace[],
  searchParams: SidebarSearchParams,
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ href: "/space", label: "スペース" }];
  const [second, third, fourth, fifth] = segments.slice(1);

  if (!second) {
    return items;
  }

  if (second === "applications") {
    items.push({ href: "/space/applications", label: "申請フォーム一覧" });
    return items;
  }

  if (second === "application-setup") {
    items.push({ href: "/space/application-setup", label: "申請フォーム設定" });
    return items;
  }

  if (second === "users") {
    items.push({ href: "/space/users", label: "メンバー" });
    return items;
  }

  const spaceId = decodeURIComponent(second);
  const spaceName =
    spaces.find((space) => space.id === spaceId)?.name ?? "スペース";
  const encodedSpaceId = encodeURIComponent(spaceId);

  items.push({
    href: `/space/${encodedSpaceId}/applications`,
    label: spaceName,
  });

  if (!third) {
    return items;
  }

  if (third === "applications") {
    items.push({
      href: `/space/${encodedSpaceId}/applications`,
      label: "申請フォーム一覧",
    });

    if (fourth === "new") {
      items.push({
        href: `/space/${encodedSpaceId}/applications/new`,
        label: "申請フォーム作成",
      });
    } else if (fourth) {
      const isFormDetail = searchParams.get("view") === "form";
      items.push({
        href: buildApplicationBreadcrumbHref(encodedSpaceId, fourth, isFormDetail),
        label: isFormDetail ? "フォーム詳細画面" : "申請詳細",
      });
      if (fifth === "edit") {
        items.push({
          href: `/space/${encodedSpaceId}/applications/${encodeURIComponent(
            fourth,
          )}/edit`,
          label: "編集",
        });
      }
    }
  }

  if (third === "submissions") {
    items.push({ href: `/space/${encodedSpaceId}/submissions`, label: "申請一覧" });

    if (fourth) {
      items.push({
        href: `/space/${encodedSpaceId}/submissions/${encodeURIComponent(fourth)}`,
        label: "申請詳細",
      });
    }
  }

  return items;
}

/**
 * スペース ID を持たないスペース配下セクションかを判定します。
 */
function isUnscopedSpaceSection(value: string): boolean {
  return (
    value === "applications" ||
    value === "application-setup" ||
    value === "users"
  );
}

/**
 * 申請関連パンくずの href を組み立てます。
 */
function buildApplicationBreadcrumbHref(
  encodedSpaceId: string,
  applicationId: string,
  isFormDetail: boolean,
): string {
  const href = `/space/${encodedSpaceId}/applications/${encodeURIComponent(
    applicationId,
  )}`;
  return isFormDetail ? `${href}?view=form` : href;
}

/**
 * パス名を空要素なしのセグメント配列に分割します。
 */
function getPathSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

/**
 * パス名にクエリ文字列を付与します。
 */
function appendQueryString(pathname: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
