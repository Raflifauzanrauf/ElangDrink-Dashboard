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

describe("Users CRUD + search/pagination/filter", () => {
  test("GET /api/users — return paginated users", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  test("GET /api/users — pagination params", async () => {
    const res = await request(app)
      .get("/api/users?page=1&limit=5")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(5);
  });

  test("GET /api/users — search by name", async () => {
    const res = await request(app)
      .get("/api/users?search=admin")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].name.toLowerCase()).toContain("admin");
  });

  test("GET /api/users — filter by role", async () => {
    const res = await request(app)
      .get("/api/users?role=admin")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((u: any) => expect(u.role).toBe("admin"));
  });

  test("POST /api/users — create user", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ email: "test@test.com", password: "test123", name: "Test User", roleId: "r3" });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe("test@test.com");
    expect(res.body.role).toBe("editor");
  });

  test("POST /api/users — duplicate email", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ email: "test@test.com", password: "test123", name: "Dup", roleId: "r4" });
    expect(res.status).toBe(409);
  });

  test("POST /api/users — missing fields", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ email: "bad@test.com" });
    expect(res.status).toBe(400);
  });

  test("PUT /api/users/:id — update user name", async () => {
    const listRes = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${adminToken}`);
    const userId = listRes.body.data[0].id;
    const res = await request(app)
      .put(`/api/users/${userId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Updated Name" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Name");
  });

  test("DELETE /api/users/:id — cannot delete self", async () => {
    const listRes = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${adminToken}`);
    const adminUser = listRes.body.data.find((u: any) => u.email === TEST_ADMIN.email);
    const res = await request(app)
      .delete(`/api/users/${adminUser.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  test("DELETE /api/users/:id — not found", async () => {
    const res = await request(app)
      .delete("/api/users/nonexistent")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  test("GET /api/users — manager can access", async () => {
    const createRes = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ email: "manager@test.com", password: "test123", name: "Manager", roleId: "r2" });
    expect(createRes.status).toBe(201);
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "manager@test.com", password: "test123" });
    const managerToken = loginRes.body.token;
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
  });
});
