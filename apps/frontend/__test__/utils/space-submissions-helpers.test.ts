import {
  buildExportFormOptions,
  buildSubmittedApplications,
  buildSubmissionsPageHref,
  buildSubmissionSummaryCounts,
  filterApplications,
  hasSubmissionFilters,
  isAssignedToCurrentUser,
  isFormSetupApplication,
  isPendingApplication,
  isReturnedApplication,
  isSpaceNeedsActionApplication,
  normalizeSubmissionSearchParams,
  paginateApplications,
} from "@/app/(authorized)/space/[spaceId]/submissions/_utils/space-submissions.helpers";
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

  // テスト内容: URLクエリから申請一覧フィルタとCSV出力ジョブIDを正規化できることを確認する
  it("normalizes submission search params", () => {
    expect(
      normalizeSubmissionSearchParams({
        applicant: " member@example.com ",
        createdFrom: "2026-06-01",
        createdTo: "2026-06-30",
        form: " 経費 ",
        jobId: " job-1 ",
        page: "3",
        status: APPLICATION_STATUSES.submitted,
        summary: "spaceNeedsAction",
      }),
    ).toEqual({
      filters: {
        applicant: "member@example.com",
        createdFrom: "2026-06-01",
        createdTo: "2026-06-30",
        form: "経費",
        page: 3,
        status: APPLICATION_STATUSES.submitted,
        summary: "spaceNeedsAction",
      },
      jobId: "job-1",
    });

    expect(
      normalizeSubmissionSearchParams({ page: "0", summary: "invalid" }),
    ).toEqual({
      filters,
      jobId: "",
    });
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

  // テスト内容: 一覧表示用にセットアップ申請を除外し、サマリー件数を算出できることを確認する
  it("builds submitted applications and summary counts", () => {
    const submitted = row;
    const inReview = {
      ...row,
      id: "application-2",
      status: APPLICATION_STATUSES.inReview,
      currentStepAssigneeUserIds: ["user-2"],
    };
    const returned = {
      ...row,
      id: "application-3",
      status: APPLICATION_STATUSES.returned,
    };
    const approved = {
      ...row,
      id: "application-4",
      status: APPLICATION_STATUSES.approved,
      updatedAt: new Date().toISOString(),
    };
    const draft = {
      ...row,
      id: "application-5",
      status: APPLICATION_STATUSES.draft,
    };

    expect(buildSubmittedApplications([submitted, inReview, returned, approved, draft])).toEqual([
      submitted,
      inReview,
      returned,
      approved,
    ]);
    expect(
      buildSubmissionSummaryCounts([submitted, inReview, returned, approved], "user-1"),
    ).toEqual({
      myNeedsAction: 1,
      recentProcessed: 1,
      returned: 1,
      spaceNeedsAction: 2,
    });
  });

  // テスト内容: フィルタ有無とページングを表示ロジック外で判定できることを確認する
  it("detects active filters and paginates applications", () => {
    expect(hasSubmissionFilters(filters)).toBe(false);
    expect(hasSubmissionFilters({ ...filters, form: "経費" })).toBe(true);

    const applications = Array.from({ length: 12 }, (_, index) => ({
      ...row,
      id: `application-${index + 1}`,
    }));

    expect(paginateApplications(applications, 2, 10)).toMatchObject({
      currentPage: 2,
      totalPages: 2,
      paginatedApplications: applications.slice(10, 12),
    });
    expect(paginateApplications(applications, 99, 10).currentPage).toBe(2);
    expect(paginateApplications(applications, -1, 10).currentPage).toBe(1);
  });
});
