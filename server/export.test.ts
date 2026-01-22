import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("export.kml", () => {
  it("returns KML content with correct structure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This will return empty data since no media exists, but should have valid KML structure
    const result = await caller.export.kml({ projectId: 1 });

    expect(result.filename).toMatch(/\.kml$/);
    expect(result.mimeType).toBe("application/vnd.google-earth.kml+xml");
    expect(result.content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(result.content).toContain("<kml");
    expect(result.content).toContain("<Document>");
    expect(result.content).toContain("</Document>");
    expect(result.content).toContain("</kml>");
  });
});

describe("export.csv", () => {
  it("returns CSV content with headers", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.export.csv({ projectId: 1 });

    expect(result.filename).toMatch(/\.csv$/);
    expect(result.mimeType).toBe("text/csv");
    expect(result.content).toContain("filename,latitude,longitude,altitude,captured_at,media_type,url");
  });
});

describe("export.geojson", () => {
  it("returns valid GeoJSON structure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.export.geojson({ projectId: 1 });

    expect(result.filename).toMatch(/\.geojson$/);
    expect(result.mimeType).toBe("application/geo+json");
    
    const parsed = JSON.parse(result.content);
    expect(parsed.type).toBe("FeatureCollection");
    expect(parsed.features).toBeInstanceOf(Array);
  });
});

describe("export.gpx", () => {
  it("returns GPX content with correct structure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.export.gpx({ projectId: 1 });

    expect(result.filename).toMatch(/\.gpx$/);
    expect(result.mimeType).toBe("application/gpx+xml");
    expect(result.content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(result.content).toContain("<gpx");
    expect(result.content).toContain("</gpx>");
  });
});
