import {
  buildSpaceApplicationDetailHref,
  buildSpaceApplicationEditHref,
  buildSpaceApplicationEditHrefByIds,
  buildSpaceApplicationNewHref,
  buildSpaceApplicationsHref,
  buildSpaceSubmissionDetailHref,
  getApplicationSpaceId,
} from "@/components/applications/application-routes";

describe("application-routes", () => {
  // テスト内容: 識別子をエンコードして申請ルートを組み立てることを確認する
  it("builds application routes with encoded ids", () => {
    expect(buildSpaceApplicationsHref("space/a")).toBe("/space/space%2Fa/applications");
    expect(buildSpaceApplicationNewHref("space/a")).toBe(
      "/space/space%2Fa/applications/new",
    );
    expect(
      buildSpaceApplicationEditHrefByIds("space/a", "app/b"),
    ).toBe("/space/space%2Fa/applications/app%2Fb/edit");
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
      "/space/space%2F1/applications/app%2F1?definitionId=definition%2F1/edit",
    );
    expect(buildSpaceSubmissionDetailHref(application)).toBe(
      "/space/space%2F1/submissions/app%2F1?definitionId=definition%2F1",
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
