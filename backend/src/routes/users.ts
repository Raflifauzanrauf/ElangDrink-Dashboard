import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { authenticate, authorize, authorizePermission, users, roles, persistUser, removeUser } from "../middleware/auth";
import { auditMiddleware } from "../middleware/audit";
import { User } from "../types";
import { parsePagination, paginateResult, applySorting, applyPagination, filterBySearch } from "../utils/query";

const router = Router();

interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: string;
  roleId: string;
  division: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

function toSafeUser(u: User): SafeUser {
  const role = roles.find((r) => r.id === u.roleId);
  return { id: u.id, email: u.email, name: u.name, role: u.role, roleId: u.roleId, division: u.division || "", permissions: role ? role.permissions : [], createdAt: u.createdAt, updatedAt: u.updatedAt };
}

router.get("/", authenticate, authorizePermission("user:read"), (req: Request, res: Response) => {
  const pagParams = parsePagination(req.query);
  const search = (req.query.search as string) || "";
  const roleFilter = (req.query.role as string) || "";
  const divisionFilter = (req.query.division as string) || "";

  let filtered = users.map(toSafeUser);
  filtered = filterBySearch(filtered, search, ["name", "email"]);
  if (roleFilter) filtered = filtered.filter((u) => u.role === roleFilter);
  if (divisionFilter) filtered = filtered.filter((u) => u.division === divisionFilter);
  filtered = applySorting(filtered, pagParams);
  const total = filtered.length;
  const pageData = applyPagination(filtered, pagParams);
  return res.json(paginateResult(pageData, total, pagParams));
});

router.post("/", authenticate, authorizePermission("user:create"), auditMiddleware("create", "user", (req) => req.body.email), async (req: Request, res: Response) => {
  const { email, password, name, roleId, division } = req.body;
  if (!email || !password || !name || !roleId) return res.status(400).json({ message: "All fields are required" });
  if (users.find((u) => u.email === email)) return res.status(409).json({ message: "User already exists" });
  const roleEntry = roles.find((r) => r.id === roleId);
  if (!roleEntry) return res.status(400).json({ message: "Invalid role" });
  const hashed = await bcrypt.hash(password, 10);
  const user: User = {
    id: String(Date.now()), email, password: hashed, name, role: roleEntry.name as any,
    roleId, division: division || "",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  users.push(user);
  persistUser(user);
  return res.status(201).json(toSafeUser(user));
});

router.put("/:id", authenticate, authorizePermission("user:update"), auditMiddleware("update", "user"), async (req: Request, res: Response) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  const { email, name, roleId, password, division } = req.body;
  if (email) user.email = email;
  if (name) user.name = name;
  if (roleId) {
    const roleEntry = roles.find((r) => r.id === roleId);
    if (!roleEntry) return res.status(400).json({ message: "Invalid role" });
    user.role = roleEntry.name as any;
    user.roleId = roleId;
  }
  if (division !== undefined) user.division = division;
  if (password) user.password = await bcrypt.hash(password, 10);
  user.updatedAt = new Date().toISOString();
  persistUser(user);
  return res.json(toSafeUser(user));
});

router.delete("/:id", authenticate, authorizePermission("user:delete"), auditMiddleware("delete", "user"), async (req: Request, res: Response) => {
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "User not found" });
  if (users[idx].id === req.user?.userId) return res.status(400).json({ message: "Cannot delete yourself" });
  await removeUser(users[idx].id);
  users.splice(idx, 1);
  return res.json({ message: "User deleted" });
});

export default router;
