import { render, screen } from "@testing-library/react";
import { DynamicFieldsTable } from "@/components/applications/dynamic-fields";
import type { DynamicFormField } from "@/components/applications/dynamic-fields";

describe("DynamicFieldsTable", () => {
  const fields: DynamicFormField[] = [
    {
      id: "section-1",
      fieldKey: "section",
      fieldType: "section",
      label: "基本情報",
      required: false,
    },
    {
      id: "name-1",
      fieldKey: "name",
      fieldType: "text",
      label: "氏名",
      required: true,
    },
  ];

  // テスト内容: タイトル、値を持たない項目、必須表示、項目エラーが表示されることを確認する
  it("renders title, non-value fields, required marks, and field errors", () => {
    render(
      <DynamicFieldsTable
        fields={fields}
        title="申請内容"
        values={{ name: "山田 太郎" }}
        getFieldError={(field) =>
          field.fieldKey === "name" ? "氏名を確認してください" : undefined
        }
      />,
    );

    expect(screen.getByText("申請内容")).toBeInTheDocument();
    expect(screen.getByText("基本情報")).toBeInTheDocument();
    expect(screen.getAllByText("氏名")).toHaveLength(2);
    expect(screen.getAllByText("*")).toHaveLength(2);
    expect(screen.getByDisplayValue("山田 太郎")).toBeInTheDocument();
    expect(screen.getByText("氏名を確認してください")).toBeInTheDocument();
  });

  // テスト内容: 値表示のカスタム関数を指定した場合にカスタム表示が使われることを確認する
  it("uses renderValue when provided", () => {
    render(
      <DynamicFieldsTable
        fields={fields}
        values={{ name: "山田 太郎" }}
        renderValue={(field, value) => `${field.label}:${String(value ?? "-")}`}
      />,
    );

    expect(screen.getByText("氏名:山田 太郎")).toBeInTheDocument();
    expect(screen.getByText("基本情報:-")).toBeInTheDocument();
  });
});
