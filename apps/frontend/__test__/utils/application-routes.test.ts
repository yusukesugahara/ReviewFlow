import {
  appendQueryParams,
  buildApplyFormHref,
  buildSpaceApplicationDetailHref,
  buildSpaceApplicationDetailHrefByIds,
  buildSpaceApplicationEditHref,
  buildSpaceApplicationEditHrefByIds,
  buildSpaceApplicationFormDetailHref,
  buildSpaceApplicationNewHref,
  buildSpaceApplicationsHref,
  buildSpaceSubmissionDetailHref,
  buildSpaceSubmissionDetailHrefByIds,
  buildSpaceSubmissionsHref,
  getApplicationSpaceId,
} from "@/components/applications/routing/application-routes";

describe("application-routes", () => {
  // テスト内容: 識別子をエンコードして申請ルートを組み立てることを確認する
  it("builds application routes with encoded ids", () => {
    expect(buildSpaceApplicationsHref("space/a")).toBe("/space/space%2Fa/applications");
    expect(buildSpaceApplicationsHref("space/a", { status: "published" })).toBe(
      "/space/space%2Fa/applications?status=published",
    );
    expect(buildSpaceApplicationNewHref("space/a")).toBe(
      "/space/space%2Fa/applications/new",
    );
    expect(
      buildSpaceApplicationEditHrefByIds("space/a", "app/b"),
    ).toBe("/space/space%2Fa/applications/app%2Fb/edit");
    expect(
      buildSpaceApplicationEditHrefByIds("space/a", "app/b", "definition/c"),
    ).toBe(
      "/space/space%2Fa/applications/app%2Fb/edit?definitionId=definition%2Fc",
    );
    expect(
      buildSpaceApplicationDetailHrefByIds("space/a", "app/b", "definition/c"),
    ).toBe(
      "/space/space%2Fa/applications/app%2Fb?definitionId=definition%2Fc",
    );
  });

  // テスト内容: 任意のdefinitionId付きで詳細ルートを組み立てることを確認する
  it("builds detail routes with optional definition ids", () => {
    const application = {
      id: "app/1",
      groupId: "space/1",
      formDefinitionId: "definition/1",
    };

    expect(getApplicationSpaceId(application)).toBe("space/1");
    expect(buildSpaceApplicationDetailHref(application)).toBe(
      "/space/space%2F1/applications/app%2F1?definitionId=definition%2F1",
    );
    expect(buildSpaceApplicationEditHref(application)).toBe(
      "/space/space%2F1/applications/app%2F1/edit?definitionId=definition%2F1",
    );
    expect(buildSpaceSubmissionDetailHref(application)).toBe(
      "/space/space%2F1/submissions/app%2F1?definitionId=definition%2F1",
    );
  });

  // テスト内容: フォーム公開URLとフォーム詳細URLを組み立てることを確認する
  it("builds public form and form detail routes", () => {
    expect(buildApplyFormHref("space/1")).toBe("/apply/space%2F1");
    expect(buildApplyFormHref("space/1", "definition/1")).toBe(
      "/apply/space%2F1?formDefinitionId=definition%2F1",
    );
    expect(
      buildSpaceApplicationFormDetailHref({
        applicationId: "app/1",
        definitionId: "definition/1",
        spaceId: "space/1",
      }),
    ).toBe(
      "/space/space%2F1/applications/app%2F1?view=form&definitionId=definition%2F1",
    );
  });

  // テスト内容: 提出一覧と提出詳細URLを組み立てることを確認する
  it("builds submission routes with optional query params", () => {
    expect(
      buildSpaceSubmissionsHref("space/1", {
        applicant: "member@example.com",
        page: 2,
        status: "",
      }),
    ).toBe(
      "/space/space%2F1/submissions?applicant=member%40example.com&page=2",
    );
    expect(
      buildSpaceSubmissionDetailHrefByIds("space/1", "app/1", "definition/1"),
    ).toBe(
      "/space/space%2F1/submissions/app%2F1?definitionId=definition%2F1",
    );
  });

  // テスト内容: 既存query付きURLへ追加queryを付与できることを確認する
  it("appends non-empty query params to existing hrefs", () => {
    expect(
      appendQueryParams("/space/space-1/applications/app-1?definitionId=definition-1", {
        empty: "",
        toast: "success",
      }),
    ).toBe(
      "/space/space-1/applications/app-1?definitionId=definition-1&toast=success",
    );
  });

  // テスト内容: スペースIDがない場合にnullを返すことを確認する
  it("returns null when the space id is missing", () => {
    const application = { id: "app-1", groupId: null };

    expect(getApplicationSpaceId(application)).toBeNull();
    expect(buildSpaceApplicationDetailHref(application)).toBeNull();
    expect(buildSpaceApplicationEditHref(application)).toBeNull();
    expect(buildSpaceSubmissionDetailHref(application)).toBeNull();
  });
});
