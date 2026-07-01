import { describe, it, expect, afterAll } from "vitest";
import { server } from "../src/index.js";
import { dbTestsEnabled } from "./helpers/db.js";

describe("Fastify Server", () => {
  afterAll(async () => {
    await server.close();
  });

  it("GET /health returns 200 with status", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBeDefined();
    expect(["connected", "disconnected"]).toContain(body.db);
    expect(["connected", "disconnected"]).toContain(body.redis);
  });

  // Strict connectivity assertions need live Postgres + Redis (RUN_DB_TESTS=1).
  it.runIf(dbTestsEnabled)("GET /health reports live DB and Redis", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe("ok");
    expect(body.db).toBe("connected");
    expect(body.redis).toBe("connected");
  });
});
