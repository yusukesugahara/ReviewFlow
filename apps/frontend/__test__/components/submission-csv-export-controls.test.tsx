import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubmissionCsvExportControls } from "@/app/(authorized)/space/_components/submission-csv-export-controls";

jest.mock("@/app/(authorized)/space/[spaceId]/submissions/actions", () => ({
  createSubmissionCsvExportAction: jest.fn(),
}));

describe("SubmissionCsvExportControls", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  // テスト内容: シーエスブイ出力モーダルがフォーム候補付きで開くことを確認する
  it("opens the CSV export modal with form options", async () => {
    const user = userEvent.setup();
    render(
      <SubmissionCsvExportControls
        exportFormOptions={[{ id: "definition-1", name: "経費申請" }]}
        latestExportJob={null}
        spaceId="space-1"
      />,
    );

    await user.click(screen.getByRole("button", { name: "CSV出力" }));

    expect(screen.getByRole("heading", { name: "CSV出力" })).toBeInTheDocument();
    expect(screen.getByText("申請フォームを選択して、申請内容のCSVを作成します。")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "申請フォーム" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /CSVを作成/ })).toBeEnabled();
  });

  // テスト内容: シーエスブイ出力対象がない場合に作成ボタンが無効化されることを確認する
  it("disables export creation when there are no submitted form options", async () => {
    const user = userEvent.setup();
    render(
      <SubmissionCsvExportControls
        exportFormOptions={[]}
        latestExportJob={null}
        spaceId="space-1"
      />,
    );

    await user.click(screen.getByRole("button", { name: "CSV出力" }));

    expect(
      screen.getByText("CSV出力できる申請フォームへの申請はまだありません。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /CSVを作成/ })).toBeDisabled();
  });

  // テスト内容: 最新ジョブ処理中にCSV作成中状態が表示されることを確認する
  it("shows the active export state while the latest job is processing", async () => {
    const user = userEvent.setup();
    render(
      <SubmissionCsvExportControls
        exportFormOptions={[{ id: "definition-1", name: "経費申請" }]}
        latestExportJob={{
          id: "job-1",
          groupId: "space-1",
          status: "processing",
          createdAt: "2026-06-06T00:00:00.000Z",
        }}
        spaceId="space-1"
      />,
    );

    await user.click(screen.getByRole("button", { name: "CSV出力" }));

    expect(screen.getByRole("button", { name: /CSV作成中/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /CSV作成中/ })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });
});
