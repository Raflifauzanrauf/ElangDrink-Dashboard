"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CheckCheck } from "lucide-react";

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  link: string;
  createdAt: string;
}

const API_URL = "http://localhost:4000/api";

const typeColors: Record<string, string> = {
  info: "border-l-blue-500",
  success: "border-l-green-500",
  warning: "border-l-yellow-500",
  error: "border-l-red-500",
};

const typeIcons: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400",
  success: "bg-green-500/20 text-green-400",
  warning: "bg-yellow-500/20 text-yellow-400",
  error: "bg-red-500/20 text-red-400",
};

export default function NotificationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  const fetchNotifs = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      const sorted = data.data || [];
      setNotifs(sorted.slice((page - 1) * limit, page * limit));
      setUnreadCount(data.unreadCount);
      setTotalPages(Math.ceil(sorted.length / limit));
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    fetchNotifs().finally(() => setLoading(false));
  }, [user, authLoading, router, page]);

  const markRead = async (id: string) => {
    const token = localStorage.getItem("token");
    await fetch(`${API_URL}/notifications/${id}/read`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchNotifs();
  };

  const markAllRead = async () => {
    const token = localStorage.getItem("token");
    await fetch(`${API_URL}/notifications/read-all`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchNotifs();
  };

  if (authLoading || loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground text-sm">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <CheckCheck size={14} className="mr-1" /> Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {notifs.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No notifications yet.</p>
        )}
        {notifs.map((n) => (
          <div
            key={n.id}
            onClick={() => { if (!n.read) markRead(n.id); if (n.link) router.push(n.link); }}
            className={`border-l-4 ${typeColors[n.type] || "border-l-blue-500"} ${n.read ? "opacity-60" : ""} bg-card rounded-lg p-4 cursor-pointer transition-all hover:border-foreground/40`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.read ? "bg-transparent" : "bg-blue-400"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(n.createdAt).toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronLeft size={18} /></button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronRight size={18} /></button>
        </div>
      )}
    </div>
  );
}
