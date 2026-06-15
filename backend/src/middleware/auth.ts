import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { JwtPayload, Role, User, Permission, AppRole } from "../types";
import { getDb, isDbEmpty, saveDb, dbRun } from "../db";

const JWT_SECRET = process.env.JWT_SECRET || "myapp-secret-key-change-in-production";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const users: User[] = [];
export const roles: AppRole[] = [];
export const permissions: Permission[] = [];

function loadFromDb(): void {
  const db = getDb();
  const permRows = db.exec("SELECT id, code, name, module, description FROM permissions");
  if (permRows.length > 0) {
    permissions.length = 0;
    permissions.push(...permRows[0].values.map((r: any) => ({ id: r[0], code: r[1], name: r[2], description: r[4] })));
  }
  const roleRows = db.exec("SELECT id, name, description, permissions FROM roles");
  if (roleRows.length > 0) {
    roles.length = 0;
    roles.push(...roleRows[0].values.map((r: any) => ({
      id: r[0], name: r[1], description: r[2],
      permissions: JSON.parse(r[3] || "[]"),
      createdAt: "", updatedAt: "",
    })));
  }
  const userRows = db.exec("SELECT id, email, password, name, role, roleId, createdAt, updatedAt FROM users");
  if (userRows.length > 0) {
    users.length = 0;
    users.push(...userRows[0].values.map((r: any) => ({
      id: r[0], email: r[1], password: r[2], name: r[3], role: r[4], roleId: r[5],
      createdAt: r[6], updatedAt: r[7],
    })));
  }
}

export const seedPermissions = () => {
  if (!isDbEmpty("permissions")) { loadFromDb(); return; }
  const db = getDb();
  const allPermissions = [
    { id: "p1", code: "user:read", name: "View Users", description: "View user list", module: "user" },
    { id: "p2", code: "user:create", name: "Create Users", description: "Create new users", module: "user" },
    { id: "p3", code: "user:update", name: "Update Users", description: "Edit existing users", module: "user" },
    { id: "p4", code: "user:delete", name: "Delete Users", description: "Remove users", module: "user" },
    { id: "p5", code: "role:read", name: "View Roles", description: "View role list", module: "role" },
    { id: "p6", code: "role:create", name: "Create Roles", description: "Create new roles", module: "role" },
    { id: "p7", code: "role:update", name: "Update Roles", description: "Edit existing roles", module: "role" },
    { id: "p8", code: "role:delete", name: "Delete Roles", description: "Remove roles", module: "role" },
    { id: "p9", code: "permission:read", name: "View Permissions", description: "View permission list", module: "permission" },
    { id: "p10", code: "currency:read", name: "View Currencies", description: "View currency list", module: "currency" },
    { id: "p11", code: "currency:create", name: "Create Currencies", description: "Create new currencies", module: "currency" },
    { id: "p12", code: "currency:update", name: "Update Currencies", description: "Edit existing currencies", module: "currency" },
    { id: "p13", code: "currency:delete", name: "Delete Currencies", description: "Remove currencies", module: "currency" },
    { id: "p14", code: "audit:read", name: "View Audit Logs", description: "View audit log history", module: "audit" },
    { id: "p15", code: "proposal:read", name: "View Proposals", description: "View proposal list", module: "proposal" },
    { id: "p16", code: "proposal:create", name: "Create Proposals", description: "Submit new proposals", module: "proposal" },
    { id: "p17", code: "proposal:approve", name: "Approve Proposals", description: "Approve or reject proposals", module: "proposal" },
    { id: "p18", code: "proposal:delete", name: "Delete Proposals", description: "Remove proposals", module: "proposal" },
  ];
  const insert = db.prepare("INSERT OR IGNORE INTO permissions (id, code, name, module, description) VALUES (?, ?, ?, ?, ?)");
  allPermissions.forEach((p) => { insert.run([p.id, p.code, p.name, p.module, p.description]); });
  insert.free();
  permissions.push(...allPermissions);
  saveDb();
  console.log(`Seeded ${permissions.length} permissions`);
};

export const seedRoles = () => {
  if (!isDbEmpty("roles")) { loadFromDb(); return; }
  const db = getDb();
  const now = new Date().toISOString();
  const adminPerms = permissions.map((p) => p.code);
  const roleData = [
    { id: "r1", name: "admin", desc: "Super administrator with all permissions", perms: adminPerms },
    { id: "r2", name: "manager", desc: "Manager with limited administrative access", perms: ["user:read", "role:read", "permission:read", "currency:read", "currency:create", "currency:update", "audit:read", "proposal:read", "proposal:create", "proposal:approve"] },
    { id: "r3", name: "editor", desc: "Editor who can view and update currencies and create proposals", perms: ["currency:read", "currency:update", "proposal:read", "proposal:create"] },
    { id: "r4", name: "viewer", desc: "Read-only access, can create proposals", perms: ["currency:read", "proposal:read", "proposal:create"] },
    { id: "r5", name: "spv", desc: "SPV who can approve proposals at SPV step", perms: ["currency:read", "proposal:read", "proposal:approve"] },
    { id: "r6", name: "finance", desc: "Finance who can approve proposals at Finance step", perms: ["currency:read", "proposal:read", "proposal:approve"] },
  ];
  const insert = db.prepare("INSERT OR IGNORE INTO roles (id, name, description, permissions, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)");
  roleData.forEach((r) => {
    const permsJson = JSON.stringify(r.perms);
    insert.run([r.id, r.name, r.desc, permsJson, now, now]);
    roles.push({
      id: r.id, name: r.name, description: r.desc,
      permissions: r.perms, createdAt: now, updatedAt: now,
    });
  });
  insert.free();
  saveDb();
  console.log(`Seeded ${roles.length} roles`);
};

export function migrateRoles(): void {
  const db = getDb();
  const now = new Date().toISOString();
  const newRoles = [
    { id: "r5", name: "spv", desc: "SPV who can approve proposals at SPV step", perms: ["currency:read", "proposal:read", "proposal:approve"] },
    { id: "r6", name: "finance", desc: "Finance who can approve proposals at Finance step", perms: ["currency:read", "proposal:read", "proposal:approve"] },
  ];
  newRoles.forEach((r) => {
    const existing = roles.find((role) => role.id === r.id || role.name === r.name);
    if (!existing) {
      const permsJson = JSON.stringify(r.perms);
      db.run("INSERT OR IGNORE INTO roles (id, name, description, permissions, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)", [r.id, r.name, r.desc, permsJson, now, now]);
      roles.push({
        id: r.id, name: r.name, description: r.desc,
        permissions: r.perms, createdAt: now, updatedAt: now,
      });
    }
  });
  saveDb();
}

export const seedAdmin = async () => {
  if (!isDbEmpty("users")) { loadFromDb(); return; }
  const db = getDb();
  const exists = users.find((u) => u.email === "admin@admin.com");
  if (!exists) {
    const hashed = await bcrypt.hash("admin123", 10);
    const now = new Date().toISOString();
    const insert = db.prepare("INSERT OR IGNORE INTO users (id, email, password, name, role, roleId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    insert.run(["1", "admin@admin.com", hashed, "Super Admin", "admin", "r1", now, now]);
    insert.free();
    users.push({
      id: "1",
      email: "admin@admin.com",
      password: hashed,
      name: "Super Admin",
      role: "admin",
      roleId: "r1",
      createdAt: now,
      updatedAt: now,
    });
    saveDb();
    console.log("Admin seeded: admin@admin.com / admin123");
  }
};

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Authentication required" });
    if (!allowedRoles.includes(req.user.role as Role)) return res.status(403).json({ message: "Insufficient permissions" });
    next();
  };
};

export const authorizePermission = (...required: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Authentication required" });
    const userRole = roles.find((r) => r.id === req.user!.roleId) || roles.find((r) => r.name === req.user!.role);
    if (!userRole) return res.status(403).json({ message: "Role not found" });
    const hasAll = required.every((p) => userRole.permissions.includes(p));
    if (!hasAll) return res.status(403).json({ message: "Insufficient permissions" });
    next();
  };
};

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
};

export const getPermissionsForRole = (roleId: string): string[] => {
  const role = roles.find((r) => r.id === roleId);
  return role ? role.permissions : [];
};

function loadRows(table: string): any[] {
  try {
    const db = getDb();
    const r = db.exec(`SELECT * FROM ${table}`);
    if (r.length === 0) return [];
    const cols = r[0].columns;
    return r[0].values.map((row: any) => {
      const obj: any = {};
      cols.forEach((col: string, i: number) => {
        let val = row[i];
        if (col === "permissions" && typeof val === "string") val = JSON.parse(val);
        if ((col === "isBase" || col === "read") && typeof val === "number") val = val === 1;
        obj[col] = val;
      });
      return obj;
    });
  } catch { return []; }
}

export function loadAllFromDb(): void {
  loadFromDb();
}

export function persistUser(user: User): void {
  try { dbRun("INSERT OR REPLACE INTO users (id, email, password, name, role, roleId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [user.id, user.email, user.password, user.name, user.role, user.roleId, user.createdAt, user.updatedAt]); } catch {}
}

export function removeUser(id: string): void {
  try { dbRun("DELETE FROM users WHERE id = ?", [id]); } catch {}
}

export function persistRole(role: AppRole): void {
  try { dbRun("INSERT OR REPLACE INTO roles (id, name, description, permissions, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
    [role.id, role.name, role.description, JSON.stringify(role.permissions), role.createdAt, role.updatedAt]); } catch {}
}

export function removeRole(id: string): void {
  try { dbRun("DELETE FROM roles WHERE id = ?", [id]); } catch {}
}
