import { Router, Request, Response } from "express";
import { authenticate, authorizePermission, users } from "../middleware/auth";
import { createAuditLog } from "../middleware/audit";
import { createNotification } from "./notifications";
import { Proposal } from "../types";
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

const stepLabels = ["Created", "Submitted", "SPV", "Manager", "Finance"];
const maxStep = 5;

function generateProposalCode(): string {
  proposalCounter++;
  return `CC-${proposalCounter}`;
}

router.get("/", authenticate, authorizePermission("proposal:read"), (req: Request, res: Response) => {
  const pagParams = parsePagination(req.query);
  const search = (req.query.search as string) || "";
  const stepFilter = req.query.step ? parseInt(req.query.step as string) : -1;
  const statusFilter = (req.query.status as string) || "";

  let filtered = [...proposals].reverse();
  if (req.user!.role !== "admin" && req.user!.role !== "manager") {
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
  if (req.user!.role !== "admin" && req.user!.role !== "manager" && proposal.userId !== req.user!.userId) {
    return res.status(403).json({ message: "You can only view your own proposals" });
  }
  return res.json(proposal);
});

router.post("/", authenticate, authorizePermission("proposal:create"), upload.single("pdfFile"), (req: Request, res: Response) => {
  const { division, currency, totalAmount, description } = req.body;
  if (!division || !currency || !totalAmount) {
    return res.status(400).json({ message: "Division, currency, and total amount are required" });
  }
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
    step: 2,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  proposals.push(proposal);
  createAuditLog(req.user!.userId, req.user!.email, "create", "proposal", proposal.id, `Membuat proposal: ${proposal.proposalCode}`);
  const adminUsers = users.filter((u) => u.role === "admin");
  adminUsers.forEach((admin) => {
    createNotification(admin.id, "Proposal Baru", `${req.user!.email} membuat proposal ${proposal.proposalCode}`, "info", `/dashboard/proposals/${proposal.id}`);
  });
  return res.status(201).json(proposal);
});

router.put("/:id/approve", authenticate, authorizePermission("proposal:approve"), (req: Request, res: Response) => {
  const proposal = proposals.find((p) => p.id === req.params.id);
  if (!proposal) return res.status(404).json({ message: "Proposal not found" });
  if (proposal.status !== "active") return res.status(400).json({ message: "Already processed" });
  proposal.step++;
  if (proposal.step >= maxStep) proposal.status = "approved";
  proposal.updatedAt = new Date().toISOString();
  createAuditLog(req.user!.userId, req.user!.email, "update", "proposal", proposal.id, `Approved ${stepLabels[proposal.step - 1] || ""}: ${proposal.proposalCode}`);
  createNotification(proposal.userId, "Proposal Disetujui", `Proposal ${proposal.proposalCode} telah disetujui oleh ${req.user!.email}`, "success", `/dashboard/proposals/${proposal.id}`);
  return res.json(proposal);
});

router.put("/:id/reject", authenticate, authorizePermission("proposal:approve"), (req: Request, res: Response) => {
  const proposal = proposals.find((p) => p.id === req.params.id);
  if (!proposal) return res.status(404).json({ message: "Proposal not found" });
  if (proposal.status !== "active") return res.status(400).json({ message: "Already processed" });
  proposal.status = "rejected";
  proposal.updatedAt = new Date().toISOString();
  createAuditLog(req.user!.userId, req.user!.email, "update", "proposal", proposal.id, `Rejected: ${proposal.proposalCode}`);
  createNotification(proposal.userId, "Proposal Ditolak", `Proposal ${proposal.proposalCode} telah ditolak oleh ${req.user!.email}`, "error", `/dashboard/proposals/${proposal.id}`);
  return res.json(proposal);
});

router.delete("/:id", authenticate, authorizePermission("proposal:delete"), (req: Request, res: Response) => {
  const idx = proposals.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "Proposal not found" });
  const proposal = proposals[idx];
  if (proposal.userId !== req.user!.userId && req.user!.role !== "admin") {
    return res.status(403).json({ message: "Can only delete your own proposals" });
  }
  if (proposal.pdfFile) {
    const filePath = path.join(uploadDir, proposal.pdfFile);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  proposals.splice(idx, 1);
  createAuditLog(req.user!.userId, req.user!.email, "delete", "proposal", req.params.id as string, `Deleted: ${proposal.proposalCode}`);
  return res.json({ message: "Proposal deleted" });
});

export default router;
