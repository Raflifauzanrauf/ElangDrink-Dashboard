import request from "supertest";
import express from "express";
import { createApp, TEST_ADMIN } from "./setup";

let app: express.Express;
let adminToken: string;

beforeAll(async () => {
  app = await createApp();
  const { seedAdmin } = await import("../middleware/auth");
  await seedAdmin();
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password });
  adminToken = loginRes.body.token;
});

describe("Permissions list + search/filter", () => {
  test("GET /api/permissions — return paginated permissions", async () => {
    const res = await request(app)
      .get("/api/permissions?limit=50")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.pagination).toBeDefined();
    expect(res.body.data.length).toBeGreaterThanOrEqual(14);
  });

  test("GET /api/permissions — search by code", async () => {
    const res = await request(app)
      .get("/api/permissions?search=user:read")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].code).toBe("user:read");
  });

  test("GET /api/permissions — filter by module", async () => {
    const res = await request(app)
      .get("/api/permissions?module=currency")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((p: any) => expect(p.code).toMatch(/^currency:/));
  });

  test("GET /api/permissions — pagination", async () => {
    const res = await request(app)
      .get("/api/permissions?page=1&limit=5")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    expect(res.body.pagination.page).toBe(1);
  });

  test("GET /api/permissions — viewer cannot access", async () => {
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "viewer2@test.com", password: "test123", name: "Viewer" });
    const viewerToken = regRes.body.token;
    const res = await request(app)
      .get("/api/permissions")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });
});
