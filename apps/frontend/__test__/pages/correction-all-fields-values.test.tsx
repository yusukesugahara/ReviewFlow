import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublicCorrectionForm } from "@/app/(authorized)/apply/correction/_components/public-correction-form";
import { ReturnedApplicationCorrectionForm } from "@/app/(authorized)/space/[spaceId]/applications/[applicationId]/edit/_components/returned-application-correction-form";

jest.mock("@/app/(authorized)/apply/correction/actions", () => ({
  submitPublicCorrectionAction: jest.fn(async () => ({})),
}));

const formFields = [
  {
    id: "field-amount",
    fieldKey: "amount",
    label: "金額",
    fieldType: "number",
    required: true,
  },
  {
    id: "field-memo",
    fieldKey: "memo",
    label: "メモ",
    fieldType: "textarea",
    required: false,
  },
];

const targets = [
  {
    itemId: "item-amount",
    formFieldId: "field-amount",
    fieldKey: "amount",
    label: "金額",
    fieldType: "number",
    required: true,
    comment: "金額を確認してください",
    currentValue: 1000,
  },
];

const values = {
  amount: 1000,
  memo: "提出時メモ",
};

describe("correction all fields value display", () => {
  // テスト内容: 公開差し戻し画面で全項目表示にしたとき、非対象項目の値を読み取り専用で表示し、編集可能に切り替えられることを確認する
  it("shows non-target public correction values before enabling edit", async () => {
    const user = userEvent.setup();

    render(
      <PublicCorrectionForm
        applicationId="application-1"
        fields={targets}
        formFields={formFields}
        openCorrection={{
          id: "correction-1",
          overallComment: null,
          createdAt: "2026-06-06T00:00:00.000Z",
          items: targets,
        }}
        values={values}
      />,
    );

    await user.click(screen.getByRole("button", { name: "すべて表示" }));

    const memo = screen.getByDisplayValue("提出時メモ");
    expect(memo).toHaveAttribute("readonly");
    expect(memo).not.toBeDisabled();

    await user.click(screen.getByRole("button", { name: "編集" }));

    expect(screen.getByDisplayValue("提出時メモ")).not.toHaveAttribute("readonly");
  });

  // テスト内容: ログイン済み申請者の差し戻し修正画面でも、全項目表示時に非対象項目の値を表示することを確認する
  it("shows non-target returned application values before enabling edit", async () => {
    const user = userEvent.setup();

    render(
      <ReturnedApplicationCorrectionForm
        action={jest.fn(async () => undefined)}
        fields={formFields.map((field, index) => ({
          ...field,
          sortOrder: index,
          createdAt: "2026-06-06T00:00:00.000Z",
        }))}
        overallComment={null}
        targets={targets}
        values={values}
      />,
    );

    await user.click(screen.getByRole("button", { name: "すべて表示" }));

    const memo = screen.getByDisplayValue("提出時メモ");
    expect(memo).toHaveAttribute("readonly");
    expect(memo).not.toBeDisabled();

    await user.click(screen.getByRole("button", { name: "編集" }));

    expect(screen.getByDisplayValue("提出時メモ")).not.toHaveAttribute("readonly");
  });
});
