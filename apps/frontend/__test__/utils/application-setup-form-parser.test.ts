import {
  parseSteps,
  readDraftFields,
} from "@/app/(authorized)/space/application-setup/application-setup-form-parser";

describe("application setup form parser", () => {
  // テスト内容: draft field JSON を読み取り、不正項目を除外し、未知 fieldType を text に戻すことを確認する
  it("reads draft fields and normalizes invalid field types", () => {
    expect(
      readDraftFields(
        JSON.stringify([
          {
            id: "field-1",
            label: "金額",
            fieldType: "number",
            required: true,
            placeholder: "1000",
            helpText: "税込",
            optionsText: "",
          },
          {
            id: "field-2",
            label: "未知",
            fieldType: "unknown",
            required: false,
          },
          { id: "invalid", label: "missing required" },
        ]),
      ),
    ).toEqual([
      {
        id: "field-1",
        label: "金額",
        fieldType: "number",
        required: true,
        placeholder: "1000",
        helpText: "税込",
        optionsText: "",
      },
      {
        id: "field-2",
        label: "未知",
        fieldType: "text",
        required: false,
        placeholder: "",
        helpText: "",
        optionsText: "",
      },
    ]);
  });

  // テスト内容: approval step JSON を正規化し、担当者がない step を除外することを確認する
  it("parses approval steps and skips steps without assignees", () => {
    expect(
      parseSteps(
        JSON.stringify([
          {
            stepName: " 一次承認 ",
            assigneeUserIds: ["user-1", "user-1", "user-2"],
            canReturn: true,
          },
          {
            stepName: "",
            assigneeUserId: "user-3",
            canReturn: false,
          },
          { stepName: "no assignee" },
        ]),
      ),
    ).toEqual([
      {
        stepOrder: 1,
        stepName: "一次承認",
        assigneeUserId: "user-1",
        assigneeUserIds: ["user-1", "user-2"],
        canReturn: true,
      },
      {
        stepOrder: 2,
        stepName: "Step 2",
        assigneeUserId: "user-3",
        assigneeUserIds: ["user-3"],
        canReturn: false,
      },
    ]);
  });

  // テスト内容: JSON が配列でない場合は空配列を返すことを確認する
  it("returns empty arrays for non-array JSON", () => {
    expect(readDraftFields(JSON.stringify({ id: "field" }))).toEqual([]);
    expect(parseSteps(JSON.stringify({ stepName: "step" }))).toEqual([]);
  });
});
