import { render, screen } from "@testing-library/react";
import {
  ReturnedApplicationCorrectionView,
  SpaceApplicationEditErrorView,
  SpaceApplicationEditUnavailableView,
  SpaceApplicationEditView,
} from "@/app/(authorized)/space/[spaceId]/applications/[applicationId]/edit/view";

jest.mock("@/components/application-setup/form-builder/application-setup-draft-form", () => ({
  ApplicationSetupDraftForm: ({
    errorMessage,
    initialName,
    returnPath,
    spaceId,
  }: {
    errorMessage: string;
    initialName?: string;
    returnPath: string;
    spaceId: string;
  }) => (
    <div data-testid="application-setup-draft-form">
      {spaceId}:{returnPath}:{initialName}:{errorMessage}
    </div>
  ),
}));

jest.mock("@/components/applications/dynamic-fields/dynamic-fields", () => ({
  DynamicFieldInput: ({ field }: { field: { label: string } }) => (
    <input aria-label={field.label} />
  ),
  DynamicFieldsTable: ({
    fields,
    renderValue,
    title,
  }: {
    fields: Array<{ id: string; label: string }>;
    renderValue: (field: { id: string; label: string }, value: unknown) => React.ReactNode;
    title: string;
  }) => (
    <div data-testid="dynamic-fields-table">
      <h3>{title}</h3>
      {fields.map((field) => (
        <div key={field.id}>{renderValue(field, "value")}</div>
      ))}
    </div>
  ),
}));

describe("SpaceApplicationEditView", () => {
  // テスト内容: 編集ヘッダー、戻るリンク、下書きフォームへの委譲を確認する
  it("renders the edit header, back link, and delegates to the draft form", () => {
    render(
      <SpaceApplicationEditView
        action={jest.fn()}
        assignees={[]}
        detailPath="/space/space-1/applications/app-1"
        errorMessage="保存できません"
        initialFields={[]}
        initialName="経費申請"
        initialSteps={[]}
        returnPath="/return"
        spaceId="space-1"
      />,
    );

    expect(screen.getByRole("heading", { name: "申請編集" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "詳細へ戻る" })).toHaveAttribute(
      "href",
      "/space/space-1/applications/app-1",
    );
    expect(screen.getByTestId("application-setup-draft-form")).toHaveTextContent(
      "space-1:/return:経費申請:保存できません",
    );
  });

  // テスト内容: 差し戻し修正項目と空状態が表示されることを確認する
  it("renders correction fields and empty correction states", () => {
    const { rerender } = render(
      <ReturnedApplicationCorrectionView
        action={jest.fn()}
        correctionError="修正を保存できません"
        detailPath="/detail"
        fields={[
          {
            id: "field-1",
            fieldKey: "amount",
            label: "金額",
            fieldType: "number",
            required: true,
            sortOrder: 1,
            createdAt: "2026-06-06T00:00:00.000Z",
          },
        ]}
        overallComment="全体コメント"
        targets={[
          {
            itemId: "item-1",
            formFieldId: "field-1",
            fieldKey: "amount",
            label: "金額",
            fieldType: "number",
            required: true,
            currentValue: 1000,
            comment: "金額を修正してください",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "差し戻し修正" })).toBeInTheDocument();
    expect(screen.getByText("修正を保存できません")).toBeInTheDocument();
    expect(screen.getByText("全体コメント")).toBeInTheDocument();
    expect(screen.getByText("修正対象は 1 件です")).toBeInTheDocument();
    expect(screen.getByLabelText("金額")).toBeInTheDocument();

    rerender(
      <ReturnedApplicationCorrectionView
        action={jest.fn()}
        detailPath="/detail"
        fields={[]}
        targets={[]}
      />,
    );

    expect(screen.getByText("現在修正できる項目はありません。")).toBeInTheDocument();
  });

  // テスト内容: 編集不可表示と取得エラー表示を確認する
  it("renders unavailable and fetch error views", () => {
    const { rerender } = render(<SpaceApplicationEditUnavailableView />);

    expect(screen.getByText("この申請は編集できません")).toBeInTheDocument();

    rerender(<SpaceApplicationEditErrorView status={404} />);

    expect(screen.getByText("申請編集画面の取得に失敗しました（status: 404）")).toBeInTheDocument();
  });
});
