import { renderToString } from "react-dom/server";
import { SpaceSubmissionsRelayPageContent } from "@/app/(authorized)/space/[spaceId]/submissions/_components/space-submissions-relay-page-content";

jest.mock(
  "@/app/(authorized)/space/[spaceId]/submissions/_components/submission-csv-export-controls",
  () => ({
    SubmissionCsvExportControls: () => <div data-testid="csv-export-controls" />,
  }),
);

const filters = {
  applicant: "",
  createdFrom: "",
  createdTo: "",
  form: "",
  page: 1,
  status: "",
  summary: "" as const,
};

describe("SpaceSubmissionsRelayPageContent", () => {
  // テスト内容: SSR では Relay 取得を開始せず、hydration が安定する loading HTML を返すことを確認する
  it("renders a stable loading state on the server before mounting", () => {
    const html = renderToString(
      <SpaceSubmissionsRelayPageContent
        currentUserId="user-1"
        filters={filters}
        latestExportJob={null}
        spaceId="space-1"
      />,
    );

    expect(html).toContain("読み込み中");
    expect(html).not.toContain("申請一覧の取得に失敗しました");
  });
});
