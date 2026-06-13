import { render, screen } from "@testing-library/react";
import {
  PublicApplicationFormErrorView,
  PublicApplicationFormView,
  PublicApplicationSubmittedView,
} from "@/app/(authorized)/apply/form/view";

jest.mock("@/app/(authorized)/apply/form/_components/public-application-form", () => ({
  PublicApplicationForm: ({
    definition,
    initialFormError,
  }: {
    definition: { name: string };
    initialFormError?: string;
  }) => (
    <div data-testid="public-application-form">
      {definition.name}:{initialFormError ?? "no-error"}
    </div>
  ),
}));

describe("PublicApplicationForm views", () => {
  // テスト内容: 送信完了状態が表示されることを確認する
  it("renders the submitted state", () => {
    render(<PublicApplicationSubmittedView />);

    expect(screen.getByRole("heading", { name: "申請を送信しました" })).toBeInTheDocument();
    expect(screen.getByText(/入力内容を受け付けました/)).toBeInTheDocument();
  });

  // テスト内容: 公開フォームに既定説明とフォームエラーが表示されることを確認する
  it("renders the public form with default description and form error", () => {
    render(
      <PublicApplicationFormView
        definition={{
          id: "definition-1",
          groupId: "space-1",
          name: "経費申請",
          description: null,
          status: "published",
          createdByUserId: "user-1",
          fields: [],
          createdAt: "2026-06-06T00:00:00.000Z",
          updatedAt: "2026-06-06T00:00:00.000Z",
        }}
        formError="入力エラー"
      />,
    );

    expect(screen.getByRole("heading", { name: "経費申請" })).toBeInTheDocument();
    expect(screen.getByText("必要事項を入力して申請を送信してください。")).toBeInTheDocument();
    expect(screen.getByTestId("public-application-form")).toHaveTextContent(
      "経費申請:入力エラー",
    );
  });

  // テスト内容: ステータス有無ごとのフォーム取得エラーが表示されることを確認する
  it("renders form fetch errors with and without status", () => {
    const { rerender } = render(<PublicApplicationFormErrorView status={404} />);

    expect(
      screen.getByRole("heading", { name: "申請フォームを表示できません" }),
    ).toBeInTheDocument();
    expect(screen.getByText("申請フォームの取得に失敗しました（status: 404）")).toBeInTheDocument();

    rerender(<PublicApplicationFormErrorView />);

    expect(screen.getByText("申請フォームの取得に失敗しました")).toBeInTheDocument();
  });
});
