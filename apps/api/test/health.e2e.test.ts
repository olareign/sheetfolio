import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";
import { ENV, parseEnv } from "../src/config/env.js";

describe("GET /health", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ENV)
      .useValue(parseEnv({ NODE_ENV: "test" }))
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  it("reports liveness and the active mail transport", async () => {
    const res = await request(app.getHttpServer()).get("/health").expect(200);
    expect(res.body).toEqual({ status: "ok", email: "console" });
  });

  it("returns 404 for unknown routes", async () => {
    await request(app.getHttpServer()).get("/nope").expect(404);
  });
});
