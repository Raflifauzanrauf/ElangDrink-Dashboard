import { Router, Request, Response } from "express";
import { authenticate, authorizePermission, roles, persistRole, removeRole, users, persistUser } from "../middleware/auth";
import { auditMiddleware } from "../middleware/audit";
import { AppRole } from "../types";
import { parsePagination, paginateResult, applySorting, applyPagination, filterBySearch } from "../utils/query";

const router = Router();

const viewerPermissions = (): string[] => {
  const viewer = roles.find((r) => r.id === "r4");
  return viewer ? [...viewer.permissions] : [];
};

router.get("/", authenticate, authorizePermission("role:read"), (req: Request, res: Response) => {
  const pagParams = parsePagination(req.query);
  const search = (req.query.search as string) || "";
  let filtered = filterBySearch(roles, search, ["name", "description"]);
  filtered = applySorting(filtered, pagParams);
  const total = filtered.length;
  const pageData = applyPagination(filtered, pagParams);
  return res.json(paginateResult(pageData, total, pagParams));
});

router.get("/:id", authenticate, authorizePermission("role:read"), (req: Request, res: Response) => {
  const role = roles.find((r) => r.id === req.params.id);
  if (!role) return res.status(404).json({ message: "Role not found" });
  return res.json(role);
});

router.post("/", authenticate, authorizePermission("role:create"), auditMiddleware("create", "role", (req) => req.body.name), async (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: "Name is required" });
  if (roles.find((r) => r.name === name)) return res.status(409).json({ message: "Role already exists" });
  const role: AppRole = {
    id: String(Date.now()), name, description: description || "",
    permissions: viewerPermissions(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  roles.push(role);
  await persistRole(role);
  return res.status(201).json(role);
});

router.put("/:id", authenticate, authorizePermission("role:update"), auditMiddleware("update", "role"), async (req: Request, res: Response) => {
  const role = roles.find((r) => r.id === req.params.id);
  if (!role) return res.status(404).json({ message: "Role not found" });
  const { name, description, permissions } = req.body;
  const oldName = role.name;
  if (name) role.name = name;
  if (description !== undefined) role.description = description;
  if (permissions) role.permissions = permissions;
  role.updatedAt = new Date().toISOString();
  await persistRole(role);
  if (name && name !== oldName) {
    for (const u of users) {
      if (u.roleId === role.id) {
        u.role = name as any;
        await persistUser(u);
      }
    }
  }
  return res.json(role);
});

router.delete("/:id", authenticate, authorizePermission("role:delete"), auditMiddleware("delete", "role"), async (req: Request, res: Response) => {
  const idx = roles.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "Role not found" });
  if (users.some((u) => u.roleId === req.params.id)) return res.status(400).json({ message: "Cannot delete role that has users assigned" });

  await removeRole(roles[idx].id);
  roles.splice(idx, 1);
  return res.json({ message: "Role deleted" });
});

export default router;
