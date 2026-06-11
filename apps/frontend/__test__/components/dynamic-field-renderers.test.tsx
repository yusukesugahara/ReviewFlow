import { render, screen } from "@testing-library/react";
import { DynamicFieldInput } from "@/components/applications/dynamic-fields";
import type { DynamicFormField } from "@/components/applications/dynamic-fields";

function field(overrides: Partial<DynamicFormField>): DynamicFormField {
  return {
    id: "field-1",
    fieldKey: "decision",
    fieldType: "text",
    label: "判定",
    required: true,
    ...overrides,
  };
}

describe("dynamic field renderers", () => {
  // テスト内容: radio / checkbox の選択値が読み取り表示に反映されることを確認する
  it("renders readonly choice fields with selected options", () => {
    const radioOptions = [
      { value: "approve", label: "承認" },
      { value: "return", label: "差し戻し" },
    ];
    const checkboxOptions = [
      { value: "checked", label: "確認済み" },
      { value: "needs_check", label: "再確認" },
    ];

    render(
      <div>
        <DynamicFieldInput
          field={field({ fieldType: "radio", options: radioOptions })}
          readOnly
          value="approve"
        />
        <DynamicFieldInput
          field={field({ fieldKey: "checks", fieldType: "checkbox", options: checkboxOptions })}
          readOnly
          value={["needs_check"]}
        />
      </div>,
    );

    expect(screen.getByLabelText("承認")).toBeChecked();
    expect(screen.getByLabelText("再確認")).toBeChecked();
  });

  // テスト内容: consent と description の特殊項目が表示されることを確認する
  it("renders special display field types", () => {
    render(
      <div>
        <DynamicFieldInput
          field={field({ fieldType: "consent", label: "規約に同意" })}
          readOnly
          value
        />
        <DynamicFieldInput
          field={field({
            fieldType: "description",
            helpText: "申請前に内容を確認してください",
          })}
          value={null}
        />
      </div>,
    );

    expect(screen.getByLabelText(/規約に同意/)).toBeChecked();
    expect(screen.getByText("申請前に内容を確認してください")).toBeInTheDocument();
  });
});
