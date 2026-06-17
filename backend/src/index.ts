import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { initDb } from "./db";
import { seedPermissions, seedRoles, seedAdmin, migrateRoles, repairAdminRole } from "./middleware/auth";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import rolesRoutes from "./routes/roles";
import permissionsRoutes from "./routes/permissions";
import currenciesRoutes, { loadCurrenciesFromDb } from "./routes/currencies";
import auditLogsRoutes from "./routes/auditLogs";
import proposalsRoutes, { loadProposalsFromDb } from "./routes/proposals";
import dashboardRoutes from "./routes/dashboard";
import notificationsRoutes, { loadNotificationsFromDb } from "./routes/notifications";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/permissions", permissionsRoutes);
app.use("/api/currencies", currenciesRoutes);
app.use("/api/audit-logs", auditLogsRoutes);
app.use("/api/proposals", proposalsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationsRoutes);

const start = async () => {
  await initDb();
  await seedPermissions();
  await seedRoles();
  await migrateRoles();
  await repairAdminRole();
  await seedAdmin();
  await loadCurrenciesFromDb();
  await loadProposalsFromDb();
  await loadNotificationsFromDb();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};
start();
