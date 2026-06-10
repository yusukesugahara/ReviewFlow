import {
  buildSubmissionCsvExportDownloadUrl,
  buildSubmissionCsvExportJobUrl,
  fetchSubmissionCsvExportJob,
} from "@/app/(authorized)/space/[spaceId]/submissions/_components/submission-csv-export-polling";

describe("submission CSV export polling helpers", () => {
  let originalFetch: typeof global.fetch | undefined;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      Reflect.deleteProperty(global, "fetch");
    }
  });

  // テスト内容: CSV出力ジョブの状態確認URLとダウンロードURLを安全に組み立てることを確認する
  it("builds encoded CSV export job URLs", () => {
    expect(buildSubmissionCsvExportJobUrl("space 1", "job/1")).toBe(
      "/space/space%201/submissions/export-jobs/job%2F1",
    );
    expect(buildSubmissionCsvExportDownloadUrl("space 1", "job/1")).toBe(
      "/space/space%201/submissions/export-jobs/job%2F1/download",
    );
  });

  // テスト内容: 成功レスポンスのCSV出力ジョブを取得できることを確認する
  it("fetches a valid CSV export job response", async () => {
    fetchMock.mockResolvedValue(
      responseJson({
        id: "job-1",
        groupId: "space-1",
        status: "completed",
        createdAt: "2026-06-06T00:00:00.000Z",
      }),
    );

    await expect(fetchSubmissionCsvExportJob("space-1", "job-1")).resolves.toEqual({
      id: "job-1",
      groupId: "space-1",
      status: "completed",
      createdAt: "2026-06-06T00:00:00.000Z",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/space/space-1/submissions/export-jobs/job-1",
      { cache: "no-store" },
    );
  });

  // テスト内容: API失敗や不正なJSONでは状態更新しないためnullを返すことを確認する
  it("returns null for failed or invalid responses", async () => {
    fetchMock.mockResolvedValueOnce(responseJson({ message: "failed" }, false));
    await expect(fetchSubmissionCsvExportJob("space-1", "job-1")).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(responseJson({ id: "job-1" }));
    await expect(fetchSubmissionCsvExportJob("space-1", "job-1")).resolves.toBeNull();
  });
});

function responseJson(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}
