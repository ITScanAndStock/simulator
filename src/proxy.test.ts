import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

afterEach(() => {
  vi.unstubAllEnvs();
});

function robotsTag(environment: string) {
  vi.stubEnv("APP_ENV", environment);
  return proxy().headers.get("x-robots-tag");
}

describe("proxy", () => {
  // Catches: the private sites found by search engines.
  it.each(["technical", "staging"])(
    "keeps every page of %s out of search engines",
    (environment) => {
      expect(robotsTag(environment)).toBe("noindex");
    },
  );

  // Catches: the public site hidden from search engines.
  it("lets search engines index production", () => {
    expect(robotsTag("production")).toBeNull();
  });
});
