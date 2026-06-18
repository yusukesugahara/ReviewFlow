import { getRelayApplications } from "@/lib/relay/applications";
jest.mock("server-only", () => ({}));

const originalFetch = global.fetch;
const originalEnv = process.env;

describe("graphql application client", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      INTERNAL_API_KEY: "internal-key",
      NEXT_PUBLIC_API_URL: "http://backend.test",
    };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it("posts application queries to the backend GraphQL endpoint with auth headers", async () => {
    jest.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: {
            applicationsConnection: {
              nodes: [
                {
                  id: "app-1",
                  relayId: "QXBwbGljYXRpb246YXBwLTE",
                  groupId: "space-1",
                  status: "draft",
                },
              ],
            },
          },
        }),
    } as Response);

    await expect(
      getRelayApplications({
        authHeaders: { Authorization: "Bearer token" },
        groupId: "space-1",
      }),
    ).resolves.toEqual([
      expect.objectContaining({ id: "app-1", groupId: "space-1" }),
    ]);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://backend.test/graphql",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token",
          "Content-Type": "application/json",
          "X-API-Key": "internal-key",
        }) as HeadersInit,
      }),
    );
  });

  it("throws an API failure for GraphQL errors", async () => {
    jest.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: null,
          errors: [{ message: "Invalid or missing bearer token" }],
        }),
    } as Response);

    await expect(
      getRelayApplications({
        authHeaders: { Authorization: "Bearer bad-token" },
        groupId: "space-1",
      }),
    ).rejects.toMatchObject({ status: 401 });
  });
});
