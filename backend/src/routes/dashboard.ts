import { Router, Request, Response } from "express";
import { authenticate, users, roles } from "../middleware/auth";
import { proposals } from "./proposals";
import { currencies } from "./currencies";
import { auditLogs } from "../middleware/audit";

const router = Router();

router.get("/", authenticate, (req: Request, res: Response) => {
  const pendingProposals = proposals.filter((p) => p.status === "active");
  const today = new Date().toISOString().split("T")[0];
  const todayProposals = proposals.filter((p) => p.date === today);
  const todayLogins = auditLogs.filter(
    (l) => l.action === "login" && l.timestamp?.startsWith(today)
  );

  const proposalsByDay: Record<string, number> = {};
  proposals.forEach((p) => {
    proposalsByDay[p.date] = (proposalsByDay[p.date] || 0) + 1;
  });

  const auditByDay: Record<string, number> = {};
  auditLogs.forEach((l) => {
    const day = l.timestamp?.split("T")[0] || "";
    auditByDay[day] = (auditByDay[day] || 0) + 1;
  });

  const recentActivity = [...auditLogs].reverse().slice(0, 10).map((l) => ({
    id: l.id,
    action: l.action,
    module: l.module,
    details: l.details,
    userEmail: l.userEmail,
    timestamp: l.timestamp,
  }));

  return res.json({
    totalUsers: users.length,
    totalCurrencies: currencies.length,
    totalProposals: proposals.length,
    pendingProposals: pendingProposals.length,
    todayProposals: todayProposals.length,
    todayLogins: todayLogins.length,
    proposalsByDay,
    auditByDay,
    recentActivity,
  });
});

export default router;
