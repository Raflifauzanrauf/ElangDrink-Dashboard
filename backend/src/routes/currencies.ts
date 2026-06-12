import { Router, Request, Response } from "express";
import { authenticate, authorizePermission } from "../middleware/auth";
import { createAuditLog, auditMiddleware } from "../middleware/audit";
import { Currency } from "../types";
import { parsePagination, paginateResult, applySorting, applyPagination, filterBySearch } from "../utils/query";
import { generateCsv, parseCsv, CsvColumn } from "../utils/csv";
import { toWib } from "../utils/format";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

export const currencies: Currency[] = [];

const csvColumns: CsvColumn[] = [
  { key: "id", label: "ID" },
  { key: "code", label: "Code" },
  { key: "name", label: "Name" },
  { key: "symbol", label: "Symbol" },
  { key: "exchangeRate", label: "Exchange Rate" },
  { key: "isBase", label: "Is Base" },
  { key: "createdAt", label: "Created At" },
  { key: "updatedAt", label: "Updated At" },
];

router.get("/", authenticate, authorizePermission("currency:read"), (req: Request, res: Response) => {
  const pagParams = parsePagination(req.query);
  const search = (req.query.search as string) || "";
  const isBaseFilter = req.query.isBase;

  let filtered = filterBySearch(currencies, search, ["code", "name", "symbol"]);
  if (isBaseFilter === "true") filtered = filtered.filter((c) => c.isBase);
  else if (isBaseFilter === "false") filtered = filtered.filter((c) => !c.isBase);
  filtered = applySorting(filtered, pagParams);
  const total = filtered.length;
  const pageData = applyPagination(filtered, pagParams);
  return res.json(paginateResult(pageData, total, pagParams));
});

router.get("/export/csv", authenticate, authorizePermission("currency:read"), (_req: Request, res: Response) => {
  const rows = currencies.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    symbol: c.symbol,
    exchangeRate: String(c.exchangeRate),
    isBase: c.isBase ? "Yes" : "No",
    createdAt: toWib(new Date(c.createdAt)).date + " " + toWib(new Date(c.createdAt)).time,
    updatedAt: toWib(new Date(c.updatedAt)).date + " " + toWib(new Date(c.updatedAt)).time,
  }));
  const csv = generateCsv(rows, csvColumns);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=currencies.csv");
  return res.send(csv);
});

router.post("/import/csv", authenticate, authorizePermission("currency:create"), upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: "CSV file is required" });
  const content = req.file.buffer.toString("utf-8");
  const rows = parseCsv(content);
  if (rows.length === 0) return res.status(400).json({ message: "CSV is empty or invalid" });

  let imported = 0;
  let updated = 0;
  const errors: { row: number; message: string }[] = [];

  rows.forEach((row, idx) => {
    const code = row.code?.toUpperCase();
    const name = row.name;
    if (!code || !name) {
      errors.push({ row: idx + 2, message: "Missing code or name" });
      return;
    }
    const existing = currencies.find((c) => c.code === code);
    if (existing) {
      existing.name = name;
      if (row.symbol) existing.symbol = row.symbol;
      if (row.exchangerate) existing.exchangeRate = parseFloat(row.exchangerate) || existing.exchangeRate;
      if (row.isbase !== undefined) existing.isBase = row.isbase === "true" || row.isbase === "1";
      existing.updatedAt = new Date().toISOString();
      updated++;
    } else {
      currencies.push({
        id: String(Date.now()) + String(idx),
        code,
        name,
        symbol: row.symbol || "",
        exchangeRate: parseFloat(row.exchangerate as string) || 1,
        isBase: (row.isbase === "true" || row.isbase === "1"),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      imported++;
    }
  });

  createAuditLog(req.user!.userId, req.user!.email, "import", "currency", "", `Import ${imported} data, update ${updated}, ${errors.length} error`);
  return res.json({ imported, updated, errors });
});

router.get("/:id", authenticate, authorizePermission("currency:read"), (req: Request, res: Response) => {
  const currency = currencies.find((c) => c.id === req.params.id);
  if (!currency) return res.status(404).json({ message: "Currency not found" });
  return res.json(currency);
});

router.post("/", authenticate, authorizePermission("currency:create"), auditMiddleware("create", "currency", (req) => req.body.code), (req: Request, res: Response) => {
  const { code, name, symbol, exchangeRate, isBase } = req.body;
  if (!code || !name) return res.status(400).json({ message: "Code and name are required" });
  if (currencies.find((c) => c.code === code.toUpperCase())) return res.status(409).json({ message: "Currency already exists" });
  const currency: Currency = {
    id: String(Date.now()), code: code.toUpperCase(), name,
    symbol: symbol || "", exchangeRate: exchangeRate || 1, isBase: isBase || false,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  currencies.push(currency);
  return res.status(201).json(currency);
});

router.put("/:id", authenticate, authorizePermission("currency:update"), auditMiddleware("update", "currency"), (req: Request, res: Response) => {
  const currency = currencies.find((c) => c.id === req.params.id);
  if (!currency) return res.status(404).json({ message: "Currency not found" });
  const { code, name, symbol, exchangeRate, isBase } = req.body;
  if (code) currency.code = code.toUpperCase();
  if (name) currency.name = name;
  if (symbol !== undefined) currency.symbol = symbol;
  if (exchangeRate !== undefined) currency.exchangeRate = exchangeRate;
  if (isBase !== undefined) currency.isBase = isBase;
  currency.updatedAt = new Date().toISOString();
  return res.json(currency);
});

router.delete("/:id", authenticate, authorizePermission("currency:delete"), auditMiddleware("delete", "currency"), (req: Request, res: Response) => {
  const idx = currencies.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "Currency not found" });
  currencies.splice(idx, 1);
  return res.json({ message: "Currency deleted" });
});

export default router;
