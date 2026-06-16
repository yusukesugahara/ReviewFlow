export type ApplicationSpaceRouteSource = {
  formDefinitionId?: string | null;
  id: string;
  groupId?: string | null;
};

export type ApplicationRouteQueryParams = Record<
  string,
  boolean | number | string | null | undefined
>;

/**
 * 申請オブジェクトからスペース ID を取得します。
 */
export function getApplicationSpaceId(
  application: ApplicationSpaceRouteSource,
): string | null {
  return application.groupId ?? null;
}

/**
 * パスにクエリパラメータを追加した URL を返します。
 */
export function appendQueryParams(
  href: string,
  params: ApplicationRouteQueryParams,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    query.set(key, String(value));
  }

  const queryString = query.toString();
  if (!queryString) {
    return href;
  }
  return `${href}${href.includes("?") ? "&" : "?"}${queryString}`;
}

/**
 * 公開申請フォームの URL を組み立てます。
 */
export function buildApplyFormHref(
  spaceId: string,
  formDefinitionId?: string | null,
): string {
  return appendQueryParams(`/apply/${encodeURIComponent(spaceId)}`, {
    formDefinitionId,
  });
}

/**
 * スペース申請フォーム一覧の URL を組み立てます。
 */
export function buildSpaceApplicationsHref(
  spaceId: string,
  params: ApplicationRouteQueryParams = {},
): string {
  return appendQueryParams(
    `/space/${encodeURIComponent(spaceId)}/applications`,
    params,
  );
}

/**
 * スペースの新規申請フォーム作成 URL を組み立てます。
 */
export function buildSpaceApplicationNewHref(spaceId: string): string {
  return `${buildSpaceApplicationsHref(spaceId)}/new`;
}

/**
 * ID 群からスペース申請詳細 URL を組み立てます。
 */
export function buildSpaceApplicationDetailHrefByIds(
  spaceId: string,
  applicationId: string,
  formDefinitionId?: string | null,
): string {
  return appendQueryParams(
    `${buildSpaceApplicationsHref(spaceId)}/${encodeURIComponent(applicationId)}`,
    { definitionId: formDefinitionId },
  );
}

/**
 * 申請オブジェクトからスペース申請詳細 URL を組み立てます。
 */
export function buildSpaceApplicationDetailHref(
  application: ApplicationSpaceRouteSource,
): string | null {
  const spaceId = getApplicationSpaceId(application);
  if (!spaceId) {
    return null;
  }

  return buildSpaceApplicationDetailHrefByIds(
    spaceId,
    application.id,
    application.formDefinitionId,
  );
}

/**
 * フォーム定義詳細表示用の申請詳細 URL を組み立てます。
 */
export function buildSpaceApplicationFormDetailHref({
  applicationId,
  definitionId,
  spaceId,
}: {
  applicationId: string;
  definitionId: string;
  spaceId: string;
}): string {
  return appendQueryParams(
    buildSpaceApplicationDetailHrefByIds(spaceId, applicationId),
    { view: "form", definitionId },
  );
}

/**
 * スペース提出一覧の URL を組み立てます。
 */
export function buildSpaceSubmissionsHref(
  spaceId: string,
  params: ApplicationRouteQueryParams = {},
): string {
  return appendQueryParams(
    `/space/${encodeURIComponent(spaceId)}/submissions`,
    params,
  );
}

/**
 * ID 群から提出詳細互換 URL を組み立てます。
 */
export function buildSpaceSubmissionDetailHrefByIds(
  spaceId: string,
  applicationId: string,
  formDefinitionId?: string | null,
): string {
  return appendQueryParams(
    `${buildSpaceSubmissionsHref(spaceId)}/${encodeURIComponent(applicationId)}`,
    { definitionId: formDefinitionId },
  );
}

/**
 * 申請オブジェクトから提出詳細互換 URL を組み立てます。
 */
export function buildSpaceSubmissionDetailHref(
  application: ApplicationSpaceRouteSource,
): string | null {
  const spaceId = getApplicationSpaceId(application);
  if (!spaceId) {
    return null;
  }

  return buildSpaceSubmissionDetailHrefByIds(
    spaceId,
    application.id,
    application.formDefinitionId,
  );
}

/**
 * 申請オブジェクトから申請編集 URL を組み立てます。
 */
export function buildSpaceApplicationEditHref(
  application: ApplicationSpaceRouteSource,
): string | null {
  const spaceId = getApplicationSpaceId(application);
  if (!spaceId) {
    return null;
  }

  return buildSpaceApplicationEditHrefByIds(
    spaceId,
    application.id,
    application.formDefinitionId,
  );
}

/**
 * ID 群から申請編集 URL を組み立てます。
 */
export function buildSpaceApplicationEditHrefByIds(
  spaceId: string,
  applicationId: string,
  formDefinitionId?: string | null,
): string {
  return appendQueryParams(
    `${buildSpaceApplicationsHref(spaceId)}/${encodeURIComponent(applicationId)}/edit`,
    { definitionId: formDefinitionId },
  );
}
