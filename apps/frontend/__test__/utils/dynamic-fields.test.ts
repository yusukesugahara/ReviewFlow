import { readDynamicValuesFromFormData } from "@/components/applications/dynamic-fields";
import type { DynamicFormField } from "@/components/applications/dynamic-fields";

describe("readDynamicValuesFromFormData", () => {
  const fields: DynamicFormField[] = [
    { id: "text", fieldKey: "text", fieldType: "text", label: "text", required: false },
    { id: "number", fieldKey: "number", fieldType: "number", label: "number", required: false },
    { id: "empty", fieldKey: "empty", fieldType: "number", label: "empty", required: false },
    { id: "bad", fieldKey: "bad", fieldType: "number", label: "bad", required: false },
    {
      id: "checkbox",
      fieldKey: "checkbox",
      fieldType: "checkbox",
      label: "checkbox",
      required: false,
    },
    {
      id: "consent",
      fieldKey: "consent",
      fieldType: "consent",
      label: "consent",
      required: false,
    },
    {
      id: "section",
      fieldKey: "section",
      fieldType: "section",
      label: "section",
      required: false,
    },
  ];

  // テスト内容: 型付き値を読み取り、値を持たない項目を除外することを確認する
  it("reads typed values and skips non-value fields", () => {
    const formData = new FormData();
    formData.set("field:text", "hello");
    formData.set("field:number", "12.5");
    formData.set("field:empty", "");
    formData.set("field:bad", "not-number");
    formData.append("field:checkbox", "a");
    formData.append("field:checkbox", "b");
    formData.set("field:consent", "true");
    formData.set("field:section", "ignored");

    expect(readDynamicValuesFromFormData(fields, formData)).toEqual({
      text: "hello",
      number: 12.5,
      checkbox: ["a", "b"],
      consent: true,
    });
  });

  // テスト内容: 編集可能項目セット指定時に対象項目だけ読み取ることを確認する
  it("only reads editable fields when a set is provided", () => {
    const formData = new FormData();
    formData.set("field:text", "hello");
    formData.set("field:number", "12");

    expect(
      readDynamicValuesFromFormData(fields, formData, new Set(["number"])),
    ).toEqual({ number: 12 });
  });
});
