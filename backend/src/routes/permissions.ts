import { Router, Request, Response } from "express";
import { authenticate, authorizePermission, permissions } from "../middleware/auth";
import { parsePagination, paginateResult, applySorting, applyPagination, filterBySearch } from "../utils/query";

const router = Router();

router.get("/", authenticate, authorizePermission("permission:read"), (req: Request, res: Response) => {
  const pagParams = parsePagination(req.query);
  const search = (req.query.search as string) || "";
  const moduleFilter = (req.query.module as string) || "";

  let filtered = filterBySearch(permissions, search, ["name", "code", "description"]);
  if (moduleFilter) filtered = filtered.filter((p) => p.code.startsWith(moduleFilter + ":"));
  filtered = applySorting(filtered, pagParams);
  const total = filtered.length;
  const pageData = applyPagination(filtered, pagParams);
  return res.json(paginateResult(pageData, total, pagParams));
});

export default router;
