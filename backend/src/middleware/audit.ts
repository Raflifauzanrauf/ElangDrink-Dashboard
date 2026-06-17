import { Request, Response, NextFunction } from "express";
import { AuditLog } from "../types";
import { describeAction } from "../utils/format";
import { getDb } from "../db";

export const auditLogs: AuditLog[] = [];

export const createAuditLog = async (userId: string, userEmail: string, action: string, module: string, resourceId: string = "", details: string = "", ip: string = "") => {
  const log: AuditLog = {
    id: String(Date.now()) + String(Math.random()).slice(2, 8),
    userId,
    userEmail,
    action,
    module,
    resourceId,
    details,
    ip,
    timestamp: new Date().toISOString(),
  };
  auditLogs.push(log);
  try {
    const db = getDb();
    await db.query("INSERT INTO audit_logs (id, userid, useremail, action, module, resourceid, details, ip, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [log.id, log.userId, log.userEmail, log.action, log.module, log.resourceId, log.details, log.ip, log.timestamp]);
  } catch { /* silent */ }
  console.log(`[Audit] ${userEmail} → ${describeAction(action, module, details)}${resourceId ? ` (${resourceId})` : ""}`);
  return log;
};

export const auditMiddleware = (action: string, module: string, getResourceId?: (req: Request) => string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      if (res.statusCode < 400 && req.user) {
        const resourceId = getResourceId ? getResourceId(req) : String(req.params.id || "");
        createAuditLog(
          req.user.userId,
          req.user.email,
          action,
          module,
          resourceId,
          describeAction(action, module),
          String(req.ip || "")
        );
      }
      return originalJson(body);
    };
    next();
  };
};
