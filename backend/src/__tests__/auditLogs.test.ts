import request from "supertest";
import { createApp, TEST_ADMIN } from "./setup";

let app: ReturnType<typeof createApp>;
let adminToken: string;

beforeAll(async () => {
  app = createApp();
  const { seedAdmin } = await import("../middleware/auth");
  await seedAdmin();
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password });
  adminToken = loginRes.body.token;
});

describe("Audit Logs list + search/filter + CSV export", () => {
  test("GET /api/audit-logs — return paginated logs", async () => {
    // Login should have created an audit log
    const res = await request(app)
      .get("/api/audit-logs")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.pagination).toBeDefined();
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test("GET /api/audit-logs — search by userEmail", async () => {
    const res = await request(app)
      .get("/api/audit-logs?search=admin@admin.com")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].userEmail).toContain("admin@admin.com");
  });

  test("GET /api/audit-logs — filter by action", async () => {
    const res = await request(app)
      .get("/api/audit-logs?action=login")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((l: any) => expect(l.action).toBe("login"));
  });

  test("GET /api/audit-logs — filter by module", async () => {
    const res = await request(app)
      .get("/api/audit-logs?module=auth")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((l: any) => expect(l.module).toBe("auth"));
  });

  test("GET /api/audit-logs — pagination", async () => {
    const res = await request(app)
      .get("/api/audit-logs?page=1&limit=5")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(5);
  });

  test("GET /api/audit-logs/export/csv — exports CSV", async () => {
    const res = await request(app)
      .get("/api/audit-logs/export/csv")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("Email");
    expect(res.text).toContain("admin@admin.com");
  });

  test("GET /api/audit-logs — viewer cannot access", async () => {
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "viewer3@test.com", password: "test123", name: "Viewer" });
    const viewerToken = regRes.body.token;
    const res = await request(app)
      .get("/api/audit-logs")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });
});
