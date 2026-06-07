import {
  buildExportFormOptions,
  buildSubmissionsPageHref,
  filterApplications,
  isAssignedToCurrentUser,
  isFormSetupApplication,
  isPendingApplication,
  isReturnedApplication,
  isSpaceNeedsActionApplication,
} from "@/app/(authorized)/space/[spaceId]/submissions/_components/space-submissions.helpers";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";

const row = {
  id: "application-1",
  groupId: "space-1",
  formDefinitionId: "definition-1",
  formDefinitionName: "経費申請",
  applicationName: "経費申請",
  status: APPLICATION_STATUSES.submitted,
  applicantEmail: "member@example.com",
  currentStepAssigneeUserIds: ["user-1"],
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

const filters = {
  applicant: "",
  createdFrom: "",
  createdTo: "",
  form: "",
  page: 1,
  status: "",
  summary: "" as const,
};

describe("space submissions helpers", () => {
  // テスト内容: 申請一覧からシーエスブイ出力用フォーム候補が重複なく作られることを確認する
  it("builds unique export form options", () => {
    expect(buildExportFormOptions([row, { ...row, id: "application-2" }])).toEqual([
      { id: "definition-1", name: "経費申請" },
    ]);
  });

  // テスト内容: 申請者・フォーム名・状態で申請一覧を絞り込めることを確認する
  it("filters applications by applicant, form, and status", () => {
    expect(
      filterApplications([row], {
        ...filters,
        applicant: "member",
        form: "経費",
        status: APPLICATION_STATUSES.submitted,
      }),
    ).toEqual([row]);
    expect(filterApplications([row], { ...filters, applicant: "missing" })).toEqual([]);
  });

  // テスト内容: ページリンクがフィルタ条件をクエリ文字列へ反映することを確認する
  it("builds submissions page hrefs with filters", () => {
    expect(
      buildSubmissionsPageHref(
        "space 1",
        { ...filters, applicant: "member@example.com", summary: "spaceNeedsAction" },
        2,
      ),
    ).toBe(
      "/space/space%201/submissions?applicant=member%40example.com&summary=spaceNeedsAction&page=2",
    );
  });

  // テスト内容: セットアップ用申請と対応が必要な申請を判定できることを確認する
  it("detects setup, action-needed, returned, and assigned application rows", () => {
    expect(isFormSetupApplication({ ...row, status: APPLICATION_STATUSES.published })).toBe(true);
    expect(isPendingApplication(row)).toBe(true);
    expect(isSpaceNeedsActionApplication(row)).toBe(true);
    expect(isReturnedApplication({ ...row, status: APPLICATION_STATUSES.returned })).toBe(true);
    expect(isAssignedToCurrentUser(row, "user-1")).toBe(true);
    expect(isAssignedToCurrentUser(row, "user-2")).toBe(false);
  });
});
