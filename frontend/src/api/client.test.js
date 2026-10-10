import { AxiosError } from "axios";
import { api, REFRESH_PATH, SESSION_EXPIRED_EVENT } from "./client";
import { tokens } from "./tokens";

// Fake server: handler(config) returns [status, data]
function useFakeServer(handler) {
  const calls = [];
  api.defaults.adapter = async (config) => {
    calls.push({ url: config.url, auth: config.headers.Authorization, data: config.data });
    const [status, data] = await handler(config);
    const response = { status, data, statusText: String(status), headers: {}, config };
    if (status >= 400) {
      throw new AxiosError(`HTTP ${status}`, "ERR_BAD_REQUEST", config, null, response);
    }
    return response;
  };
  return calls;
}

const isRefresh = (config) => config.url.endsWith(REFRESH_PATH);

describe("api client", () => {
  it("sends the stored access token as a Bearer header", async () => {
    tokens.set({ access: "a1", refresh: "r1" });
    const calls = useFakeServer(() => [200, { ok: true }]);

    await api.get("/auth/me/");

    expect(calls[0].auth).toBe("Bearer a1");
  });

  it("refreshes once on 401, stores the rotated tokens, and retries the request", async () => {
    tokens.set({ access: "expired", refresh: "r1" });
    const calls = useFakeServer((config) => {
      if (isRefresh(config)) return [200, { access: "a2", refresh: "r2" }];
      return config.headers.Authorization === "Bearer a2" ? [200, { name: "Rahim" }] : [401, {}];
    });

    const { data } = await api.get("/auth/me/");

    expect(data).toEqual({ name: "Rahim" });
    expect(tokens.getAccess()).toBe("a2");
    expect(tokens.getRefresh()).toBe("r2");
    expect(calls.filter((c) => c.url.endsWith(REFRESH_PATH))).toHaveLength(1);
  });

  it("shares a single refresh between parallel 401s", async () => {
    tokens.set({ access: "expired", refresh: "r1" });
    const calls = useFakeServer((config) => {
      if (isRefresh(config)) return [200, { access: "a2", refresh: "r2" }];
      return config.headers.Authorization === "Bearer a2" ? [200, {}] : [401, {}];
    });

    await Promise.all([api.get("/a/"), api.get("/b/"), api.get("/c/")]);

    expect(calls.filter((c) => c.url.endsWith(REFRESH_PATH))).toHaveLength(1);
  });

  it("clears tokens and announces session expiry when refresh fails", async () => {
    tokens.set({ access: "expired", refresh: "revoked" });
    useFakeServer(() => [401, {}]);
    const onExpired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);

    await expect(api.get("/auth/me/")).rejects.toMatchObject({ response: { status: 401 } });

    expect(tokens.getAccess()).toBeNull();
    expect(tokens.getRefresh()).toBeNull();
    expect(onExpired).toHaveBeenCalledOnce();
    window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  });

  it("does not try to refresh errors other than 401", async () => {
    tokens.set({ access: "a1", refresh: "r1" });
    const calls = useFakeServer(() => [500, {}]);

    await expect(api.get("/tutors/")).rejects.toMatchObject({ response: { status: 500 } });

    expect(calls).toHaveLength(1);
    expect(tokens.getAccess()).toBe("a1");
  });
});
