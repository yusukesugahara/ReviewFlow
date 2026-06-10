import {
  buildApplicationFormListRows,
  isFormSetupApplication,
} from "@/app/(authorized)/space/[spaceId]/applications/_components/space-applications.helpers";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";

const definition = {
  id: "definition-1",
  groupId: "space-1",
  name: "稟議フォーム",
  status: APPLICATION_STATUSES.published,
  fields: [],
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

const setupApplication = {
  id: "setup-1",
  groupId: "space-1",
  formDefinitionId: "definition-1",
  formDefinitionName: "稟議フォーム",
  applicationName: "稟議フォーム",
  status: APPLICATION_STATUSES.published,
  applicantEmail: "admin@example.com",
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

describe("space applications helpers", () => {
  // テスト内容: フォーム定義と申請から一覧行を作成できることを確認する
  it("builds active application form list rows", () => {
    expect(
      buildApplicationFormListRows({
        applications: [
          setupApplication,
          {
            ...setupApplication,
            id: "submitted-1",
            status: APPLICATION_STATUSES.submitted,
          },
          {
            ...setupApplication,
            id: "approved-1",
            status: APPLICATION_STATUSES.approved,
          },
        ],
        formDefinitions: [definition],
        showArchived: false,
        spaceId: "space-1",
      }),
    ).toEqual([
      {
        definitionId: "definition-1",
        detailHref:
          "/space/space-1/applications/setup-1?definitionId=definition-1&view=form",
        pendingCount: 1,
        processedCount: 1,
        publicHref: "/apply/space-1?formDefinitionId=definition-1",
        status: APPLICATION_STATUSES.published,
        title: "稟議フォーム",
      },
    ]);
  });

  // テスト内容: 管理用申請が下書きの場合は公開URLを作らず、下書き状態を優先することを確認する
  it("uses setup application status for draft forms", () => {
    expect(
      buildApplicationFormListRows({
        applications: [
          {
            ...setupApplication,
            status: APPLICATION_STATUSES.draft,
          },
        ],
        formDefinitions: [definition],
        showArchived: false,
        spaceId: "space-1",
      })[0],
    ).toMatchObject({
      publicHref: null,
      status: APPLICATION_STATUSES.draft,
    });
  });

  // テスト内容: 削除済み表示では削除済みフォームだけを返すことを確認する
  it("filters archived application forms", () => {
    expect(
      buildApplicationFormListRows({
        applications: [],
        formDefinitions: [
          definition,
          {
            ...definition,
            id: "definition-2",
            status: APPLICATION_STATUSES.archived,
          },
        ],
        showArchived: true,
        spaceId: "space-1",
      }),
    ).toEqual([
      {
        definitionId: "definition-2",
        detailHref: null,
        pendingCount: 0,
        processedCount: 0,
        publicHref: null,
        status: APPLICATION_STATUSES.archived,
        title: "稟議フォーム",
      },
    ]);
  });

  // テスト内容: フォーム定義が取得できない場合に申請からfallback定義を作ることを確認する
  it("builds fallback rows from submitted applications", () => {
    expect(
      buildApplicationFormListRows({
        applications: [
          {
            ...setupApplication,
            id: "submitted-1",
            status: APPLICATION_STATUSES.submitted,
          },
        ],
        formDefinitions: [],
        showArchived: false,
        spaceId: "space-1",
      }),
    ).toMatchObject([
      {
        definitionId: "definition-1",
        title: "稟議フォーム",
        status: APPLICATION_STATUSES.published,
      },
    ]);
  });

  // テスト内容: フォーム管理用申請を判定できることを確認する
  it("detects setup applications", () => {
    expect(isFormSetupApplication(setupApplication)).toBe(true);
    expect(
      isFormSetupApplication({
        ...setupApplication,
        status: APPLICATION_STATUSES.submitted,
      }),
    ).toBe(false);
  });
});
