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

describe("Roles CRUD + search/pagination", () => {
  test("GET /api/roles — return paginated roles", async () => {
    const res = await request(app)
      .get("/api/roles")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.pagination).toBeDefined();
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);
  });

  test("GET /api/roles — search by name", async () => {
    const res = await request(app)
      .get("/api/roles?search=admin&sortBy=name&sortOrder=asc")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.some((r: any) => r.name === "admin")).toBe(true);
  });

  test("GET /api/roles — pagination", async () => {
    const res = await request(app)
      .get("/api/roles?page=1&limit=2")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
  });

  test("GET /api/roles/:id — single role", async () => {
    const res = await request(app)
      .get("/api/roles/r1")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("admin");
  });

  test("GET /api/roles/:id — not found", async () => {
    const res = await request(app)
      .get("/api/roles/nonexistent")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  test("POST /api/roles — create role with default viewer permissions", async () => {
    const res = await request(app)
      .post("/api/roles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "custom-role", description: "Custom role" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("custom-role");
    expect(res.body.permissions).toEqual(["currency:read", "proposal:read", "proposal:create"]);
  });

  test("POST /api/roles — duplicate name", async () => {
    const res = await request(app)
      .post("/api/roles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "custom-role" });
    expect(res.status).toBe(409);
  });

  test("PUT /api/roles/:id — update permissions", async () => {
    const res = await request(app)
      .put("/api/roles/r2")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ permissions: ["currency:read", "currency:update"] });
    expect(res.status).toBe(200);
    expect(res.body.permissions).toEqual(["currency:read", "currency:update"]);
  });

  test("DELETE /api/roles/:id — delete custom role", async () => {
    const createRes = await request(app)
      .post("/api/roles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "temp-role" });
    const deleteRes = await request(app)
      .delete(`/api/roles/${createRes.body.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(200);
  });

  test("GET /api/roles — viewer cannot access", async () => {
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "viewer@test.com", password: "test123", name: "Viewer" });
    const viewerToken = regRes.body.token;
    const res = await request(app)
      .get("/api/roles")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });
});
