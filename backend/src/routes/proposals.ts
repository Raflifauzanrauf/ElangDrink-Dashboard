import { Router, Request, Response } from "express";
import { authenticate, authorizePermission, users, roles } from "../middleware/auth";
import { createAuditLog } from "../middleware/audit";
import { createNotification } from "./notifications";
import { Proposal } from "../types";
import { dbRun, getDb } from "../db";
import { parsePagination, paginateResult, applySorting, applyPagination, filterBySearch } from "../utils/query";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(__dirname, "..", "..", "uploads", "proposals");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".pdf";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") return cb(null, true);
    cb(new Error("Only PDF files are allowed"));
  },
});

const router = Router();

export const proposals: Proposal[] = [];
let proposalCounter = 0;

const financialSteps = ["Created", "Submitted", "SPV"];
const heavySteps = ["Created", "Submitted", "SPV", "Manager", "Finance", "Super Admin"];

function getLiveRole(userId: string): string {
  const u = users.find((u) => u.id === userId);
  return u ? u.role : "";
}

export async function loadProposalsFromDb(): Promise<void> {
  proposals.length = 0;
  try {
    const db = getDb();
    const result = await db.query("SELECT id, userid, useremail, proposalcode, date, division, currency, totalamount, description, pdffile, type, step, status, createdat, updatedat FROM proposals");
    result.rows.forEach((r: any) => {
      proposals.push({
        id: r.id, userId: r.userid, userEmail: r.useremail, proposalCode: r.proposalcode, date: r.date,
        division: r.division, currency: r.currency, totalAmount: r.totalamount, description: r.description,
        pdfFile: r.pdffile, type: r.type, step: r.step, status: r.status,
        createdAt: r.createdat instanceof Date ? r.createdat.toISOString() : String(r.createdat || ""), updatedAt: r.updatedat instanceof Date ? r.updatedat.toISOString() : String(r.updatedat || ""),
      });
      const num = parseInt(r.proposalcode.replace("CC-", ""), 10);
      if (!isNaN(num) && num > proposalCounter) proposalCounter = num;
    });
  } catch {}
}

function generateProposalCode(): string {
  proposalCounter++;
  return `CC-${proposalCounter}`;
}

router.get("/", authenticate, authorizePermission("proposal:read"), (req: Request, res: Response) => {
  const pagParams = parsePagination(req.query);
  const search = (req.query.search as string) || "";
  const stepFilter = req.query.step ? parseInt(req.query.step as string) : -1;
  const statusFilter = (req.query.status as string) || "";

  const liveRole = getLiveRole(req.user!.userId);
  const userPerms = roles.find((r) => r.id === req.user!.roleId)?.permissions || [];
  const canSeeAll = liveRole === "admin" || liveRole === "manager" || userPerms.includes("proposal:approve");
  let filtered = [...proposals].reverse();
  if (!canSeeAll) {
    filtered = filtered.filter((p) => p.userId === req.user!.userId);
  }
  filtered = filterBySearch(filtered, search, ["proposalCode", "division", "userEmail"]);
  if (stepFilter >= 0) filtered = filtered.filter((p) => p.step === stepFilter);
  if (statusFilter) filtered = filtered.filter((p) => p.status === statusFilter);
  filtered = applySorting(filtered, pagParams);
  const total = filtered.length;
  const pageData = applyPagination(filtered, pagParams);
  return res.json(paginateResult(pageData, total, pagParams));
});

router.get("/:id", authenticate, authorizePermission("proposal:read"), (req: Request, res: Response) => {
  const proposal = proposals.find((p) => p.id === req.params.id);
  if (!proposal) return res.status(404).json({ message: "Proposal not found" });
  const liveRole = getLiveRole(req.user!.userId);
  const userPerms = roles.find((r) => r.id === req.user!.roleId)?.permissions || [];
  const canSeeAll = liveRole === "admin" || liveRole === "manager" || userPerms.includes("proposal:approve");
  if (!canSeeAll && proposal.userId !== req.user!.userId) {
    return res.status(403).json({ message: "You can only view your own proposals" });
  }
  return res.json(proposal);
});

router.post("/", authenticate, authorizePermission("proposal:create"), upload.single("pdfFile"), async (req: Request, res: Response) => {
  const { division, currency, totalAmount, description, type } = req.body;
  if (!division || !currency || !totalAmount) {
    return res.status(400).json({ message: "Division, currency, and total amount are required" });
  }
  const proposalType = type === "heavy" ? "heavy" : "financial";
  const proposal: Proposal = {
    id: String(Date.now()),
    userId: req.user!.userId,
    userEmail: req.user!.email,
    proposalCode: generateProposalCode(),
    date: new Date().toISOString().split("T")[0],
    division,
    currency,
    totalAmount: parseFloat(totalAmount) || 0,
    description: description || "",
    pdfFile: req.file ? req.file.filename : "",
    type: proposalType,
    step: 2,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  proposals.push(proposal);
  await dbRun("INSERT INTO proposals (id, userid, useremail, proposalcode, date, division, currency, totalamount, description, pdffile, type, step, status, createdat, updatedat) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)",
    [proposal.id, proposal.userId, proposal.userEmail, proposal.proposalCode, proposal.date, proposal.division, proposal.currency, proposal.totalAmount, proposal.description, proposal.pdfFile, proposal.type, proposal.step, proposal.status, proposal.createdAt, proposal.updatedAt]);
  createAuditLog(req.user!.userId, req.user!.email, "create", "proposal", proposal.id, `Membuat proposal: ${proposal.proposalCode}`);
  const adminUsers = users.filter((u) => u.role === "admin");
  for (const admin of adminUsers) {
    createNotification(admin.id, "Proposal Baru", `${req.user!.email} membuat proposal ${proposal.proposalCode} (${proposalType === "heavy" ? "Pengajuan Berat" : "Pengajuan Keuangan"})`, "info", `/dashboard/proposals/${proposal.id}`);
  }
  return res.status(201).json(proposal);
});

router.put("/:id/approve", authenticate, authorizePermission("proposal:approve"), async (req: Request, res: Response) => {
  const proposal = proposals.find((p) => p.id === req.params.id);
  if (!proposal) return res.status(404).json({ message: "Proposal not found" });
  if (proposal.status !== "active") return res.status(400).json({ message: "Already processed" });
  const liveRole = getLiveRole(req.user!.userId);
  const steps = proposal.type === "heavy" ? heavySteps : financialSteps;
  const stepLabel = steps[proposal.step];
  const requiredRole = stepLabel === "Super Admin" ? "admin" : stepLabel.toLowerCase();
  if (liveRole.toLowerCase() !== requiredRole) {
    return res.status(403).json({ message: `Only ${stepLabel} role can approve at this step` });
  }
  const maxStep = proposal.type === "heavy" ? 6 : 3;
  proposal.step++;
  if (proposal.step >= maxStep) proposal.status = "approved";
  proposal.updatedAt = new Date().toISOString();
  await dbRun("UPDATE proposals SET step=$1, status=$2, updatedat=$3 WHERE id=$4", [proposal.step, proposal.status, proposal.updatedAt, proposal.id]);
  createAuditLog(req.user!.userId, req.user!.email, "update", "proposal", proposal.id, `Approved ${steps[proposal.step - 1] || ""}: ${proposal.proposalCode}`);
  createNotification(proposal.userId, "Proposal Disetujui", `Proposal ${proposal.proposalCode} telah disetujui oleh ${req.user!.email}`, "success", `/dashboard/proposals/${proposal.id}`);
  return res.json(proposal);
});

router.put("/:id/reject", authenticate, authorizePermission("proposal:approve"), async (req: Request, res: Response) => {
  const proposal = proposals.find((p) => p.id === req.params.id);
  if (!proposal) return res.status(404).json({ message: "Proposal not found" });
  if (proposal.status !== "active") return res.status(400).json({ message: "Already processed" });
  proposal.status = "rejected";
  proposal.updatedAt = new Date().toISOString();
  await dbRun("UPDATE proposals SET status=$1, updatedat=$2 WHERE id=$3", [proposal.status, proposal.updatedAt, proposal.id]);
  createAuditLog(req.user!.userId, req.user!.email, "update", "proposal", proposal.id, `Rejected: ${proposal.proposalCode}`);
  createNotification(proposal.userId, "Proposal Ditolak", `Proposal ${proposal.proposalCode} telah ditolak oleh ${req.user!.email}`, "error", `/dashboard/proposals/${proposal.id}`);
  return res.json(proposal);
});

router.delete("/:id", authenticate, authorizePermission("proposal:delete"), async (req: Request, res: Response) => {
  const idx = proposals.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "Proposal not found" });
  const proposal = proposals[idx];
  const liveRole = getLiveRole(req.user!.userId);
  if (proposal.userId !== req.user!.userId && liveRole !== "admin") {
    return res.status(403).json({ message: "Can only delete your own proposals" });
  }
  if (proposal.pdfFile) {
    const filePath = path.join(uploadDir, proposal.pdfFile);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  proposals.splice(idx, 1);
  await dbRun("DELETE FROM proposals WHERE id = $1", [req.params.id]);
  createAuditLog(req.user!.userId, req.user!.email, "delete", "proposal", req.params.id as string, `Deleted: ${proposal.proposalCode}`);
  return res.json({ message: "Proposal deleted" });
});

export default router;
