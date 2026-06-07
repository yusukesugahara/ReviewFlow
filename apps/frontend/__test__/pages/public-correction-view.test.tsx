import { render, screen } from "@testing-library/react";
import {
  PublicCorrectionErrorView,
  PublicCorrectionResubmittedView,
  PublicCorrectionView,
} from "@/app/(authorized)/apply/correction/view";

jest.mock("@/app/(authorized)/apply/correction/public-correction-form", () => ({
  PublicCorrectionForm: ({
    applicationId,
    fields,
    formFields,
    initialFormError,
  }: {
    applicationId: string;
    fields: unknown[];
    formFields: unknown[];
    initialFormError?: string;
  }) => (
    <div data-testid="public-correction-form">
      {applicationId}:{fields.length}:{formFields.length}:{initialFormError ?? "no-error"}
    </div>
  ),
}));

const correction = {
  applicationId: "application-1",
  applicationStatus: "returned",
  openCorrection: {
    id: "correction-1",
    overallComment: null,
    createdAt: "2026-06-06T00:00:00.000Z",
    items: [
      {
        itemId: "item-1",
        formFieldId: "field-1",
        fieldKey: "amount",
        label: "金額",
        fieldType: "number",
        required: true,
        comment: "金額を確認してください",
        currentValue: 1000,
      },
    ],
  },
};

const definition = {
  id: "definition-1",
  groupId: "space-1",
  name: "経費申請",
  status: "published" as const,
  createdByUserId: "user-1",
  fields: [
    {
      id: "field-1",
      fieldKey: "amount",
      label: "金額",
      fieldType: "number",
      required: true,
    },
  ],
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

describe("PublicCorrection views", () => {
  // テスト内容: 再提出完了状態が表示されることを確認する
  it("renders the resubmitted state", () => {
    render(<PublicCorrectionResubmittedView />);

    expect(screen.getByRole("heading", { name: "再提出しました" })).toBeInTheDocument();
    expect(screen.getByText(/修正内容を受け付けました/)).toBeInTheDocument();
  });

  // テスト内容: 修正対象に一致する項目の修正フォームが表示されることを確認する
  it("renders the correction form for matching correction items", () => {
    render(
      <PublicCorrectionView
        correction={correction}
        definition={definition}
        formError="再提出エラー"
      />,
    );

    expect(screen.getByRole("heading", { name: "経費申請" })).toBeInTheDocument();
    expect(screen.getByTestId("public-correction-form")).toHaveTextContent(
      "application-1:1:1:再提出エラー",
    );
  });

  // テスト内容: 編集可能な修正項目がない場合の空メッセージを確認する
  it("renders an empty correction message when no editable items match", () => {
    render(
      <PublicCorrectionView
        correction={correction}
        definition={{ ...definition, fields: [] }}
      />,
    );

    expect(screen.getByText("現在修正できる差し戻し項目はありません。")).toBeInTheDocument();
  });

  // テスト内容: 修正画面取得エラーが表示されることを確認する
  it("renders correction fetch errors", () => {
    render(<PublicCorrectionErrorView status={500} />);

    expect(screen.getByRole("heading", { name: "修正画面を表示できません" })).toBeInTheDocument();
    expect(
      screen.getByText("差し戻し修正画面の取得に失敗しました（status: 500）"),
    ).toBeInTheDocument();
  });
});
