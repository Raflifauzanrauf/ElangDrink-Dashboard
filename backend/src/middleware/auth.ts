import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { JwtPayload, Role, User, Permission, AppRole } from "../types";

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

export const seedPermissions = () => {
  const allPermissions = [
    { id: "p1", code: "user:read", name: "View Users", description: "View user list" },
    { id: "p2", code: "user:create", name: "Create Users", description: "Create new users" },
    { id: "p3", code: "user:update", name: "Update Users", description: "Edit existing users" },
    { id: "p4", code: "user:delete", name: "Delete Users", description: "Remove users" },
    { id: "p5", code: "role:read", name: "View Roles", description: "View role list" },
    { id: "p6", code: "role:create", name: "Create Roles", description: "Create new roles" },
    { id: "p7", code: "role:update", name: "Update Roles", description: "Edit existing roles" },
    { id: "p8", code: "role:delete", name: "Delete Roles", description: "Remove roles" },
    { id: "p9", code: "permission:read", name: "View Permissions", description: "View permission list" },
    { id: "p10", code: "currency:read", name: "View Currencies", description: "View currency list" },
    { id: "p11", code: "currency:create", name: "Create Currencies", description: "Create new currencies" },
    { id: "p12", code: "currency:update", name: "Update Currencies", description: "Edit existing currencies" },
    { id: "p13", code: "currency:delete", name: "Delete Currencies", description: "Remove currencies" },
    { id: "p14", code: "audit:read", name: "View Audit Logs", description: "View audit log history" },
    { id: "p15", code: "proposal:read", name: "View Proposals", description: "View proposal list" },
    { id: "p16", code: "proposal:create", name: "Create Proposals", description: "Submit new proposals" },
    { id: "p17", code: "proposal:approve", name: "Approve Proposals", description: "Approve or reject proposals" },
    { id: "p18", code: "proposal:delete", name: "Delete Proposals", description: "Remove proposals" },
  ];
  permissions.push(...allPermissions);
  console.log(`Seeded ${permissions.length} permissions`);
};

export const seedRoles = () => {
  const adminRole: AppRole = {
    id: "r1",
    name: "admin",
    description: "Super administrator with all permissions",
    permissions: permissions.map((p) => p.code),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const managerRole: AppRole = {
    id: "r2",
    name: "manager",
    description: "Manager with limited administrative access",
    permissions: ["user:read", "role:read", "permission:read", "currency:read", "currency:create", "currency:update", "audit:read", "proposal:read", "proposal:create", "proposal:approve"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const editorRole: AppRole = {
    id: "r3",
    name: "editor",
    description: "Editor who can view and update currencies and create proposals",
    permissions: ["currency:read", "currency:update", "proposal:read", "proposal:create"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const viewerRole: AppRole = {
    id: "r4",
    name: "viewer",
    description: "Read-only access, can create proposals",
    permissions: ["currency:read", "proposal:read", "proposal:create"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  roles.push(adminRole, managerRole, editorRole, viewerRole);
  console.log(`Seeded ${roles.length} roles`);
};

export const seedAdmin = async () => {
  const exists = users.find((u) => u.email === "admin@admin.com");
  if (!exists) {
    const hashed = await bcrypt.hash("admin123", 10);
    users.push({
      id: "1",
      email: "admin@admin.com",
      password: hashed,
      name: "Super Admin",
      role: "admin",
      roleId: "r1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
