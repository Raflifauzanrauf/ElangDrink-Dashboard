import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { JwtPayload, Role, User, Permission, AppRole } from "../types";
import { getDb, isDbEmpty, dbRun } from "../db";

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

async function loadFromDb(): Promise<void> {
  const db = getDb();
  const permResult = await db.query("SELECT id, code, name, module, description FROM permissions");
  if (permResult.rows.length > 0) {
    permissions.length = 0;
    permissions.push(...permResult.rows.map((r: any) => ({ id: r.id, code: r.code, name: r.name, description: r.description })));
  }
  const roleResult = await db.query("SELECT id, name, description, permissions FROM roles");
  if (roleResult.rows.length > 0) {
    roles.length = 0;
    roles.push(...roleResult.rows.map((r: any) => ({
      id: r.id, name: r.name, description: r.description,
      permissions: JSON.parse(r.permissions || "[]"),
      createdAt: "", updatedAt: "",
    })));
  }
  const userResult = await db.query("SELECT id, email, password, name, role, roleid, division, createdat, updatedat FROM users");
  if (userResult.rows.length > 0) {
    users.length = 0;
    users.push(...userResult.rows.map((r: any) => ({
      id: r.id, email: r.email, password: r.password, name: r.name, role: r.role, roleId: r.roleid,
      division: r.division || "", createdAt: r.createdat instanceof Date ? r.createdat.toISOString() : String(r.createdat || ""), updatedAt: r.updatedat instanceof Date ? r.updatedat.toISOString() : String(r.updatedat || ""),
    })));
  }
}

export const seedPermissions = async () => {
  if (!(await isDbEmpty("permissions"))) { await loadFromDb(); return; }
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
  for (const p of allPermissions) {
    try { await db.query("INSERT INTO permissions (id, code, name, module, description) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO NOTHING", [p.id, p.code, p.name, p.module, p.description]); } catch {}
  }
  permissions.push(...allPermissions);
  console.log(`Seeded ${permissions.length} permissions`);
};

export const seedRoles = async () => {
  if (!(await isDbEmpty("roles"))) { await loadFromDb(); return; }
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
  for (const r of roleData) {
    const permsJson = JSON.stringify(r.perms);
    try { await db.query("INSERT INTO roles (id, name, description, permissions, createdat, updatedat) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING", [r.id, r.name, r.desc, permsJson, now, now]); } catch {}
    roles.push({
      id: r.id, name: r.name, description: r.desc,
      permissions: r.perms, createdAt: now, updatedAt: now,
    });
  }
  console.log(`Seeded ${roles.length} roles`);
};

export const migrateRoles = async () => {
  const db = getDb();
  const now = new Date().toISOString();
  const newRoles = [
    { id: "r5", name: "spv", desc: "SPV who can approve proposals at SPV step", perms: ["currency:read", "proposal:read", "proposal:approve"] },
    { id: "r6", name: "finance", desc: "Finance who can approve proposals at Finance step", perms: ["currency:read", "proposal:read", "proposal:approve"] },
  ];
  for (const r of newRoles) {
    const existing = roles.find((role) => role.id === r.id || role.name === r.name);
    if (!existing) {
      const permsJson = JSON.stringify(r.perms);
      try { await db.query("INSERT INTO roles (id, name, description, permissions, createdat, updatedat) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING", [r.id, r.name, r.desc, permsJson, now, now]); } catch {}
      roles.push({
        id: r.id, name: r.name, description: r.desc,
        permissions: r.perms, createdAt: now, updatedAt: now,
      });
    }
  }
};

export const repairAdminRole = async () => {
  const db = getDb();
  const adminUser = users.find((u) => u.id === "1");
  if (!adminUser) return;
  const adminRoleExists = roles.find((r) => r.id === "r1");
  if (adminRoleExists) return;
  const now = new Date().toISOString();
  const allPerms = permissions.map((p) => p.code);
  const permsJson = JSON.stringify(allPerms);
  try { await db.query("INSERT INTO roles (id, name, description, permissions, createdat, updatedat) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING", ["r1", "admin", "Super administrator with all permissions", permsJson, now, now]); } catch {}
  roles.push({
    id: "r1", name: "admin", description: "Super administrator with all permissions",
    permissions: allPerms, createdAt: now, updatedAt: now,
  });
  console.log("Repaired missing admin role (r1)");
};

export const seedAdmin = async () => {
  if (!(await isDbEmpty("users"))) { await loadFromDb(); return; }
  const db = getDb();
  const exists = users.find((u) => u.email === "admin@admin.com");
  if (!exists) {
    const hashed = await bcrypt.hash("admin123", 10);
    const now = new Date().toISOString();
    try { await db.query("INSERT INTO users (id, email, password, name, role, roleid, division, createdat, updatedat) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING", ["1", "admin@admin.com", hashed, "Super Admin", "admin", "r1", "IT", now, now]); } catch {}
    users.push({
      id: "1",
      email: "admin@admin.com",
      password: hashed,
      name: "Super Admin",
      role: "admin",
      roleId: "r1",
      division: "IT",
      createdAt: now,
      updatedAt: now,
    });
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
    if (!userRole) {
      const user = users.find((u) => u.id === req.user!.userId);
      if (!user) return res.status(403).json({ message: "User not found" });
      const fallbackRole = roles.find((r) => r.name === user.role);
      if (!fallbackRole) return res.status(403).json({ message: "Role not found — the role assigned to your account has been deleted" });
      const hasAll = required.every((p) => fallbackRole.permissions.includes(p));
      if (!hasAll) return res.status(403).json({ message: "Insufficient permissions" });
      return next();
    }
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
  return role ? role.permissions : [];};

export function loadAllFromDb(): void {
  // No-op: data loaded during seed functions
}

export async function persistUser(user: User): Promise<void> {
  try { await dbRun("INSERT INTO users (id, email, password, name, role, roleid, division, createdat, updatedat) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO UPDATE SET email=$2, password=$3, name=$4, role=$5, roleid=$6, division=$7, updatedat=$9", [user.id, user.email, user.password, user.name, user.role, user.roleId, user.division, user.createdAt, user.updatedAt]); } catch {}
}

export async function removeUser(id: string): Promise<void> {
  try { await dbRun("DELETE FROM users WHERE id = $1", [id]); } catch {}
}

export async function persistRole(role: AppRole): Promise<void> {
  try { await dbRun("INSERT INTO roles (id, name, description, permissions, createdat, updatedat) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET name=$2, description=$3, permissions=$4, updatedat=$6", [role.id, role.name, role.description, JSON.stringify(role.permissions), role.createdAt, role.updatedAt]); } catch {}
}

export async function removeRole(id: string): Promise<void> {
  try { await dbRun("DELETE FROM roles WHERE id = $1", [id]); } catch {}
}
