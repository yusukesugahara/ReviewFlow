jest.mock("server-only", () => ({}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

jest.mock("@/lib/server/action-auth", () => ({
  authHeadersOrRedirect: jest.fn(async () => ({ Authorization: "Bearer token" })),
}));

jest.mock("@/lib/server/backend-fetch", () => ({
  client: {
    POST: jest.fn(),
    PATCH: jest.fn(),
  },
}));

import { updateApplicationSetupAction } from "@/app/(authorized)/space/application-setup/actions";
import { client } from "@/lib/server/backend-fetch";
import { redirect } from "next/navigation";

const mockedPost = client.POST as jest.Mock;
const mockedPatch = client.PATCH as jest.Mock;
const mockedRedirect = jest.mocked(redirect);

function createSetupFormData(intent: "draft" | "publish"): FormData {
  const formData = new FormData();
  formData.set("name", "稟議フォーム");
  formData.set("spaceId", "11111111-1111-1111-1111-111111111111");
  formData.set(
    "fieldsJson",
    JSON.stringify([
      {
        id: "field-1",
        fieldKey: "subject",
        label: "件名",
        fieldType: "text",
        required: true,
        placeholder: "",
        helpText: "",
        optionsText: "",
      },
    ]),
  );
  formData.set(
    "stepsJson",
    JSON.stringify([
      {
        id: "step-1",
        stepName: "一次承認",
        assigneeUserIds: ["22222222-2222-2222-2222-222222222222"],
        canReturn: true,
      },
    ]),
  );
  formData.set("returnPath", "/space/11111111-1111-1111-1111-111111111111/applications/app-1/edit");
  formData.set("intent", intent);
  formData.set("currentFormDefinitionId", "definition-current");
  formData.set("currentApprovalFlowId", "flow-current");
  return formData;
}

function createSetupFormDataWithInvalidSteps(): FormData {
  const formData = createSetupFormData("publish");
  formData.set(
    "returnPath",
    "/space/11111111-1111-1111-1111-111111111111/applications/app-1/edit?definitionId=definition-current",
  );
  formData.set(
    "stepsJson",
    JSON.stringify([
      {
        id: "step-1",
        stepName: "一次承認",
        assigneeUserIds: [],
        canReturn: true,
      },
    ]),
  );
  return formData;
}

describe("updateApplicationSetupAction", () => {
  beforeEach(() => {
    mockedPost.mockReset();
    mockedPatch.mockReset();
    mockedRedirect.mockClear();
  });

  // テスト内容: 詳細編集画面で公開を押した場合、編集後のフォーム定義と承認フローを作り直して申請フォーム管理レコードへ紐付けることを確認する
  it("recreates form definition and approval flow when publishing edited setup", async () => {
    mockedPost
      .mockResolvedValueOnce({
        response: { ok: true, status: 201 },
        data: { data: { id: "definition-new" } },
      })
      .mockResolvedValueOnce({
        response: { ok: true, status: 201 },
      })
      .mockResolvedValueOnce({
        response: { ok: true, status: 200 },
      })
      .mockResolvedValueOnce({
        response: { ok: true, status: 201 },
        data: { data: { id: "flow-new" } },
      });
    mockedPatch.mockResolvedValueOnce({
      response: { ok: true, status: 200 },
      data: { data: { id: "app-1" } },
    });

    await expect(
      updateApplicationSetupAction("app-1", createSetupFormData("publish")),
    ).rejects.toThrow("NEXT_REDIRECT:");

    expect(mockedPost).toHaveBeenNthCalledWith(
      1,
      "/form-definitions",
      expect.objectContaining({
        body: expect.objectContaining({
          groupId: "11111111-1111-1111-1111-111111111111",
          name: "稟議フォーム",
        }),
      }),
    );
    expect(mockedPost).toHaveBeenNthCalledWith(
      2,
      "/form-definitions/{id}/fields",
      expect.objectContaining({
        params: { path: { id: "definition-new" } },
        body: expect.objectContaining({
          label: "件名",
          fieldKey: "subject",
        }),
      }),
    );
    expect(mockedPost).toHaveBeenNthCalledWith(
      3,
      "/form-definitions/{id}/publish",
      expect.objectContaining({
        params: { path: { id: "definition-new" } },
      }),
    );
    expect(mockedPost).toHaveBeenNthCalledWith(
      4,
      "/approval-flows",
      expect.objectContaining({
        body: expect.objectContaining({
          name: "稟議フォーム 承認フロー",
        }),
      }),
    );
    expect(mockedPatch).toHaveBeenCalledWith(
      "/applications/{id}",
      expect.objectContaining({
        params: { path: { id: "app-1" } },
        body: expect.objectContaining({
          approvalFlowId: "flow-new",
          formDefinitionId: "definition-new",
          status: "published",
          values: {},
        }),
      }),
    );
    expect(mockedRedirect.mock.calls.at(-1)?.[0]).toContain(
      "definitionId=definition-new",
    );
    expect(mockedRedirect.mock.calls.at(-1)?.[0]).toContain(
      "message=%E7%94%B3%E8%AB%8B%E3%83%95%E3%82%A9%E3%83%BC%E3%83%A0%E3%82%92%E5%85%AC%E9%96%8B%E3%81%97%E3%81%BE%E3%81%97%E3%81%9F",
    );
  });

  // テスト内容: definitionId 付きの編集画面で承認者が空の場合、既存クエリを壊さず検証エラーを返すことを確認する
  it("preserves edit query params when redirecting invalid approval steps", async () => {
    await expect(
      updateApplicationSetupAction("app-1", createSetupFormDataWithInvalidSteps()),
    ).rejects.toThrow("NEXT_REDIRECT:");

    expect(mockedPost).not.toHaveBeenCalled();
    expect(mockedPatch).not.toHaveBeenCalled();
    expect(mockedRedirect.mock.calls.at(-1)?.[0]).toBe(
      "/space/11111111-1111-1111-1111-111111111111/applications/app-1/edit?definitionId=definition-current&setupError=invalid_steps",
    );
  });
});
