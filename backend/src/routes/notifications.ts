import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { Notification } from "../types";
import { dbRun, getDb } from "../db";

const router = Router();

export const notifications: Notification[] = [];

export function loadNotificationsFromDb(): void {
  notifications.length = 0;
  try {
    const db = getDb();
    const rows = db.exec("SELECT id, userId, title, message, type, read, link, createdAt FROM notifications ORDER BY createdAt DESC");
    if (rows.length > 0) {
      rows[0].values.forEach((r: any) => {
        notifications.push({
          id: r[0], userId: r[1], title: r[2], message: r[3],
          type: r[4], read: r[5] === 1, link: r[6], createdAt: r[7],
        });
      });
    }
  } catch {}
}

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
  dbRun("INSERT INTO notifications (id, userId, title, message, type, read, link, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [notification.id, notification.userId, notification.title, notification.message, notification.type, 0, notification.link, notification.createdAt]);
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
  dbRun("UPDATE notifications SET read=1 WHERE userId=? AND read=0", [req.user!.userId]);
  return res.json({ message: "All notifications marked as read" });
});

router.put("/:id/read", authenticate, (req: Request, res: Response) => {
  const notif = notifications.find((n) => n.id === req.params.id && n.userId === req.user!.userId);
  if (!notif) return res.status(404).json({ message: "Notification not found" });
  notif.read = true;
  dbRun("UPDATE notifications SET read=1 WHERE id=?", [notif.id]);
  return res.json(notif);
});

export default router;
