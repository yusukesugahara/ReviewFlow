import { getApplicationCapabilities } from "@/components/applications/actions/application-capabilities";

describe("getApplicationCapabilities", () => {
  // テスト内容: backend が返した操作可否をそのまま利用することを確認する
  it("uses capabilities returned by the backend", () => {
    expect(
      getApplicationCapabilities({
        id: "app-1",
        status: "in_review",
        values: {},
        capabilities: {
          canEditApplication: false,
          canSubmitApplication: false,
          canResubmitApplication: false,
          canApproveApplication: true,
          canRejectApplication: true,
          canReturnApplication: true,
        },
      }),
    ).toEqual({
      canEditApplication: false,
      canSubmitApplication: false,
      canResubmitApplication: false,
      canApproveApplication: true,
      canRejectApplication: true,
      canReturnApplication: true,
    });
  });

  // テスト内容: 古いレスポンスや未取得時は安全側に倒すことを確認する
  it("falls back to disabled capabilities when the backend field is missing", () => {
    expect(
      getApplicationCapabilities({
        id: "app-1",
        status: "in_review",
        values: {},
      }),
    ).toEqual({
      canEditApplication: false,
      canSubmitApplication: false,
      canResubmitApplication: false,
      canApproveApplication: false,
      canRejectApplication: false,
      canReturnApplication: false,
    });
  });
});
