import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { Notification } from "../types";
import { dbRun, getDb } from "../db";

const router = Router();

export const notifications: Notification[] = [];

export async function loadNotificationsFromDb(): Promise<void> {
  notifications.length = 0;
  try {
    const db = getDb();
    const result = await db.query("SELECT id, userid, title, message, type, read, link, createdat FROM notifications ORDER BY createdat DESC");
    result.rows.forEach((r: any) => {
      notifications.push({
        id: r.id, userId: r.userid, title: r.title, message: r.message,
        type: r.type, read: r.read, link: r.link, createdAt: r.createdat instanceof Date ? r.createdat.toISOString() : String(r.createdat || ""),
      });
    });
  } catch {}
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: Notification["type"] = "info",
  link = ""
): Promise<Notification> {
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
  await dbRun("INSERT INTO notifications (id, userid, title, message, type, read, link, createdat) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [notification.id, notification.userId, notification.title, notification.message, notification.type, false, notification.link, notification.createdAt]);
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

router.put("/read-all", authenticate, async (req: Request, res: Response) => {
  notifications
    .filter((n) => n.userId === req.user!.userId && !n.read)
    .forEach((n) => { n.read = true; });
  await dbRun("UPDATE notifications SET read=true WHERE userid=$1 AND read=false", [req.user!.userId]);
  return res.json({ message: "All notifications marked as read" });
});

router.put("/:id/read", authenticate, async (req: Request, res: Response) => {
  const notif = notifications.find((n) => n.id === req.params.id && n.userId === req.user!.userId);
  if (!notif) return res.status(404).json({ message: "Notification not found" });
  notif.read = true;
  await dbRun("UPDATE notifications SET read=true WHERE id=$1", [notif.id]);
  return res.json(notif);
});

export default router;
