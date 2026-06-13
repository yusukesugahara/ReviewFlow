import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { InlineFormBuilder } from "@/components/application-setup/form-builder/application-setup-inline-form-builder";
import type { DraftField } from "@/components/application-setup/fields/application-setup-fields";

const field: DraftField = {
  id: "field-1",
  fieldKey: "amount",
  label: "金額",
  fieldType: "text",
  required: true,
  placeholder: "",
  helpText: "",
  optionsText: "",
};

function renderBuilder({
  fieldsWithKeys = [{ field, fieldKey: "amount" }],
  insertFieldAt = jest.fn(),
  moveFieldTo = jest.fn(),
  removeField = jest.fn(),
  setSelectedFieldId = jest.fn(),
  updateField = jest.fn(),
}: Partial<ComponentProps<typeof InlineFormBuilder>> = {}) {
  render(
    <InlineFormBuilder
      fieldsWithKeys={fieldsWithKeys}
      initialValues={{ amount: "1000" }}
      insertFieldAt={insertFieldAt}
      moveFieldTo={moveFieldTo}
      removeField={removeField}
      setSelectedFieldId={setSelectedFieldId}
      updateField={updateField}
    />,
  );

  return {
    insertFieldAt,
    moveFieldTo,
    removeField,
    setSelectedFieldId,
    updateField,
  };
}

describe("InlineFormBuilder", () => {
  // テスト内容: 行表示と削除操作ができることを確認する
  it("renders a field row and calls remove when deleting", async () => {
    const user = userEvent.setup();
    const { removeField } = renderBuilder();

    expect(screen.getByText("申請書")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1000")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "金額を削除" }));

    expect(removeField).toHaveBeenCalledWith("field-1");
  });

  // テスト内容: 編集モーダルで項目名変更が updateField に渡ることを確認する
  it("opens the edit modal and forwards field updates", async () => {
    const user = userEvent.setup();
    const { updateField } = renderBuilder();

    await user.click(screen.getByRole("button", { name: "金額を編集" }));
    fireEvent.change(screen.getByLabelText("項目名"), {
      target: { value: "申請金額" },
    });

    expect(updateField).toHaveBeenCalledWith("field-1", { label: "申請金額" });
  });

  // テスト内容: 項目がない場合も追加操作を呼び出せることを確認する
  it("calls insert from the empty state", async () => {
    const user = userEvent.setup();
    const insertFieldAt = jest.fn();
    renderBuilder({ fieldsWithKeys: [], insertFieldAt });

    const addButtons = screen.getAllByRole("button", { name: "フォームを追加" });
    await user.click(addButtons[1]!);

    expect(insertFieldAt).toHaveBeenCalledWith(0);
  });
});
