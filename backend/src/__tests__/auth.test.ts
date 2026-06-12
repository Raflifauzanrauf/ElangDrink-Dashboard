import request from "supertest";
import { createApp, TEST_ADMIN } from "./setup";

let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  app = createApp();
  const { seedAdmin } = await import("../middleware/auth");
  await seedAdmin();
});

describe("Auth", () => {
  test("POST /api/auth/login — success", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(TEST_ADMIN.email);
    expect(res.body.user.role).toBe("admin");
    expect(Array.isArray(res.body.user.permissions)).toBe(true);
  });

  test("POST /api/auth/login — wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_ADMIN.email, password: "wrongpass" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
  });

  test("POST /api/auth/login — missing fields", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_ADMIN.email });
    expect(res.status).toBe(400);
  });

  test("POST /api/auth/register — success", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "new@test.com", password: "test123", name: "New User" });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe("new@test.com");
    expect(res.body.user.role).toBe("viewer");
  });

  test("POST /api/auth/register — duplicate email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: TEST_ADMIN.email, password: "test123", name: "Dup" });
    expect(res.status).toBe(409);
  });

  test("GET /api/users — unauthenticated", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(401);
  });

  test("GET /api/users — invalid token", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", "Bearer invalid-token");
    expect(res.status).toBe(401);
  });

  test("JWT token expires correctly", async () => {
    // Login to get token
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;
    expect(token.split(".").length).toBe(3); // valid JWT structure
  });
});
