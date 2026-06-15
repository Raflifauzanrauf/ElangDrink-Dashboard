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

describe("Currencies CRUD + search/pagination + CSV export/import", () => {
  test("GET /api/currencies — empty initially", async () => {
    const res = await request(app)
      .get("/api/currencies")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  test("POST /api/currencies — create currency", async () => {
    const res = await request(app)
      .post("/api/currencies")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ code: "USD", name: "US Dollar", symbol: "$", exchangeRate: 1, isBase: true });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe("USD");
    expect(res.body.isBase).toBe(true);
  });

  test("POST /api/currencies — duplicate code", async () => {
    const res = await request(app)
      .post("/api/currencies")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ code: "USD", name: "US Dollar" });
    expect(res.status).toBe(409);
  });

  test("GET /api/currencies — search by code", async () => {
    await request(app)
      .post("/api/currencies")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ code: "EUR", name: "Euro", symbol: "€" });
    const res = await request(app)
      .get("/api/currencies?search=EUR")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].code).toBe("EUR");
  });

  test("GET /api/currencies — filter by isBase", async () => {
    const res = await request(app)
      .get("/api/currencies?isBase=true")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((c: any) => expect(c.isBase).toBe(true));
  });

  test("PUT /api/currencies/:id — update", async () => {
    const listRes = await request(app)
      .get("/api/currencies")
      .set("Authorization", `Bearer ${adminToken}`);
    const eur = listRes.body.data.find((c: any) => c.code === "EUR");
    const res = await request(app)
      .put(`/api/currencies/${eur.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ symbol: "€€" });
    expect(res.status).toBe(200);
    expect(res.body.symbol).toBe("€€");
  });

  test("DELETE /api/currencies/:id — delete", async () => {
    const listRes = await request(app)
      .get("/api/currencies")
      .set("Authorization", `Bearer ${adminToken}`);
    const eur = listRes.body.data.find((c: any) => c.code === "EUR");
    const res = await request(app)
      .delete(`/api/currencies/${eur.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test("GET /api/currencies/export/csv — exports CSV", async () => {
    const res = await request(app)
      .get("/api/currencies/export/csv")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("Code");
    expect(res.text).toContain("USD");
  });

  test("POST /api/currencies/import/csv — import CSV", async () => {
    const csvContent = "code,name,symbol,exchangeRate,isBase\nJPY,Japanese Yen,¥,0.0067,false\nGBP,British Pound,£,1.27,false";
    const res = await request(app)
      .post("/api/currencies/import/csv")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from(csvContent, "utf-8"), "import.csv");
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(2);
    expect(res.body.errors).toEqual([]);
  });

  test("POST /api/currencies/import/csv — no file", async () => {
    const res = await request(app)
      .post("/api/currencies/import/csv")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  test("POST /api/currencies/import/csv — invalid rows", async () => {
    const csvContent = "code,name\n,TestMissing";
    const res = await request(app)
      .post("/api/currencies/import/csv")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from(csvContent, "utf-8"), "import.csv");
    expect(res.status).toBe(200);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  test("GET /api/currencies — pagination", async () => {
    const res = await request(app)
      .get("/api/currencies?page=1&limit=3&sortBy=code&sortOrder=asc")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(3); // USD + JPY + GBP
    expect(res.body.data[0].code).toBeDefined();
  });
});
