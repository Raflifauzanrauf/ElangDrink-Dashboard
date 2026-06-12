import { Router, Request, Response } from "express";
import { authenticate, authorizePermission } from "../middleware/auth";
import { auditLogs } from "../middleware/audit";
import { parsePagination, paginateResult, applySorting, applyPagination, filterBySearch } from "../utils/query";
import { generateCsv, CsvColumn } from "../utils/csv";
import { toWib, describeAction } from "../utils/format";

const router = Router();

const csvColumns: CsvColumn[] = [
  { key: "tanggal", label: "Tanggal" },
  { key: "jam", label: "Jam (WIB)" },
  { key: "aksi", label: "Aksi" },
  { key: "userEmail", label: "Email" },
  { key: "action", label: "Action" },
  { key: "module", label: "Module" },
  { key: "resourceId", label: "Resource ID" },
  { key: "details", label: "Detail" },
  { key: "ip", label: "IP" },
];

router.get("/", authenticate, authorizePermission("audit:read"), (req: Request, res: Response) => {
  const pagParams = parsePagination(req.query);
  const search = (req.query.search as string) || "";
  const actionFilter = (req.query.action as string) || "";
  const moduleFilter = (req.query.module as string) || "";
  const userIdFilter = (req.query.userId as string) || "";

  let filtered = [...auditLogs].reverse();
  filtered = filterBySearch(filtered, search, ["userEmail", "action", "module", "resourceId", "details"]);
  if (actionFilter) filtered = filtered.filter((l) => l.action === actionFilter);
  if (moduleFilter) filtered = filtered.filter((l) => l.module === moduleFilter);
  if (userIdFilter) filtered = filtered.filter((l) => l.userId === userIdFilter);
  filtered = applySorting(filtered, pagParams);
  const total = filtered.length;
  const pageData = applyPagination(filtered, pagParams);
  return res.json(paginateResult(pageData, total, pagParams));
});

router.get("/export/csv", authenticate, authorizePermission("audit:read"), (_req: Request, res: Response) => {
  const rows = auditLogs.map((log) => {
    const wib = toWib(new Date(log.timestamp));
    return {
      tanggal: wib.date,
      jam: wib.time,
      aksi: describeAction(log.action, log.module, log.details),
      userEmail: log.userEmail,
      action: log.action,
      module: log.module,
      resourceId: log.resourceId,
      details: log.details,
      ip: log.ip,
    };
  });
  const csv = generateCsv(rows, csvColumns);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=audit-logs.csv");
  return res.send(csv);
});

export default router;
