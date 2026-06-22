import { resolveCreateApplicationSetupRedirectBase } from "@/app/(authorized)/space/_application-setup/_utils/application-setup-navigation";

function setupFormData({
  returnPath,
  spaceId,
}: {
  returnPath?: string;
  spaceId?: string;
} = {}): FormData {
  const formData = new FormData();
  if (returnPath) {
    formData.set("returnPath", returnPath);
  }
  if (spaceId) {
    formData.set("spaceId", spaceId);
  }
  return formData;
}

describe("application setup navigation", () => {
  // テスト内容: 新規申請フォーム作成の正規 returnPath はそのまま使うことを確認する
  it("uses the canonical new application return path", () => {
    expect(
      resolveCreateApplicationSetupRedirectBase(
        setupFormData({
          returnPath: "/space/space-1/applications/new",
          spaceId: "space-1",
        }),
      ),
    ).toBe("/space/space-1/applications/new");
  });

  // テスト内容: 旧セットアップ URL が渡っても spaceId から正規 URL に戻すことを確認する
  it("normalizes legacy setup return paths to the canonical route", () => {
    expect(
      resolveCreateApplicationSetupRedirectBase(
        setupFormData({
          returnPath: "/space/application-setup",
          spaceId: "space-1",
        }),
      ),
    ).toBe("/space/space-1/applications/new");
  });

  // テスト内容: spaceId がない場合は旧URLではなくスペーストップへ戻すことを確認する
  it("falls back to the space root when no space id is available", () => {
    expect(resolveCreateApplicationSetupRedirectBase(setupFormData())).toBe(
      "/space",
    );
  });
});
