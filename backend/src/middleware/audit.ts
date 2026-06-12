import { Request, Response, NextFunction } from "express";
import { AuditLog } from "../types";
import { describeAction } from "../utils/format";

export const auditLogs: AuditLog[] = [];

export const createAuditLog = (userId: string, userEmail: string, action: string, module: string, resourceId: string = "", details: string = "", ip: string = "") => {
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
