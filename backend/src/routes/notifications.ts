import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { Notification } from "../types";

const router = Router();

export const notifications: Notification[] = [];

export function createNotification(
  userId: string,
  title: string,
  message: string,
  type: Notification["type"] = "info",
  link = ""
): Notification {
  const notification: Notification = {
    id: String(Date.now()) + String(Math.random().toString(36).slice(2, 6)),
    userId,
    title,
    message,
    type,
    read: false,
    link,
    createdAt: new Date().toISOString(),
  };
  notifications.push(notification);
  return notification;
}

router.get("/", authenticate, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const userNotifs = notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const unreadCount = userNotifs.filter((n) => !n.read).length;
  return res.json({ data: userNotifs, unreadCount, total: userNotifs.length });
});

router.put("/read-all", authenticate, (req: Request, res: Response) => {
  notifications
    .filter((n) => n.userId === req.user!.userId && !n.read)
    .forEach((n) => { n.read = true; });
  return res.json({ message: "All notifications marked as read" });
});

router.put("/:id/read", authenticate, (req: Request, res: Response) => {
  const notif = notifications.find((n) => n.id === req.params.id && n.userId === req.user!.userId);
  if (!notif) return res.status(404).json({ message: "Notification not found" });
  notif.read = true;
  return res.json(notif);
});

export default router;
