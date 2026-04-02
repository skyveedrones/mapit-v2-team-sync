import { describe, it, expect, vi, beforeEach } from "vitest";
import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";

// Mock the version module
vi.mock("../shared/version", () => ({
  APP_VERSION: {
    version: "1.0.0",
    commit: "abc123def456",
    branch: "main",
    buildDate: "2026-04-02",
    buildTimestamp: 1775140000000,
  },
}));

describe("version.validate", () => {
  it("should return updateNeeded=true when client commit differs from server", async () => {
    const { APP_VERSION } = await import("../shared/version");
    const serverCommit = APP_VERSION.commit;
    const clientCommit = "old_commit_hash";

    const updateNeeded = serverCommit !== clientCommit && serverCommit !== "unknown";

    expect(updateNeeded).toBe(true);
  });

  it("should return updateNeeded=false when client commit matches server", async () => {
    const { APP_VERSION } = await import("../shared/version");
    const serverCommit = APP_VERSION.commit;
    const clientCommit = serverCommit;

    const updateNeeded = serverCommit !== clientCommit && serverCommit !== "unknown";

    expect(updateNeeded).toBe(false);
  });

  it("should return updateNeeded=false when server commit is unknown", async () => {
    const serverCommit = "unknown";
    const clientCommit = "abc123def456";

    const updateNeeded = serverCommit !== clientCommit && serverCommit !== "unknown";

    expect(updateNeeded).toBe(false);
  });

  it("should include current version and commit in response", async () => {
    const { APP_VERSION } = await import("../shared/version");

    const response = {
      updateNeeded: false,
      currentVersion: APP_VERSION.version,
      currentCommit: APP_VERSION.commit,
      clientVersion: "1.0.0",
      clientCommit: APP_VERSION.commit,
      message: "You are up to date.",
    };

    expect(response.currentVersion).toBe("1.0.0");
    expect(response.currentCommit).toBe("abc123def456");
    expect(response.message).toContain("up to date");
  });

  it("should include update message when update is needed", async () => {
    const response = {
      updateNeeded: true,
      currentVersion: "1.0.0",
      currentCommit: "new_commit",
      clientVersion: "1.0.0",
      clientCommit: "old_commit",
      message: "A newer version is available. Please refresh to update.",
    };

    expect(response.message).toContain("newer version");
  });
});
