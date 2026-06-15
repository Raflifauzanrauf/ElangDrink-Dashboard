import express from "express";
import cors from "cors";
import { initDb } from "../db";
import { seedPermissions, seedRoles, seedAdmin, users, roles, permissions } from "../middleware/auth";
import { auditLogs } from "../middleware/audit";
import { currencies, loadCurrenciesFromDb } from "../routes/currencies";
import authRoutes from "../routes/auth";
import usersRoutes from "../routes/users";
import rolesRoutes from "../routes/roles";
import permissionsRoutes from "../routes/permissions";
import currenciesRoutes from "../routes/currencies";
import auditLogsRoutes from "../routes/auditLogs";

export async function createApp() {
  // Reset in-memory arrays
  users.length = 0;
  roles.length = 0;
  permissions.length = 0;
  auditLogs.length = 0;
  currencies.length = 0;

  // Use fresh in-memory SQLite database for each test run
  await initDb(":memory:");
  seedPermissions();
  seedRoles();
  loadCurrenciesFromDb();

  const app = express();
  app.use(cors({ origin: "http://localhost:3000" }));
  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/roles", rolesRoutes);
  app.use("/api/permissions", permissionsRoutes);
  app.use("/api/currencies", currenciesRoutes);
  app.use("/api/audit-logs", auditLogsRoutes);

  return app;
}

const supertest = require("supertest");

export async function getAdminToken(app: express.Express): Promise<string> {
  await seedAdmin();
  const response = await supertest(app)
    .post("/api/auth/login")
    .send({ email: "admin@admin.com", password: "admin123" });
  return response.body.token;
}

export const TEST_ADMIN = { email: "admin@admin.com", password: "admin123" };
