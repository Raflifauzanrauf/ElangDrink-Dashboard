"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Search, Download, ChevronLeft, ChevronRight } from "lucide-react";

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  module: string;
  resourceId: string;
  details: string;
  ip: string;
  timestamp: string;
}

const API_URL = "http://localhost:4000/api";

const actionColors: Record<string, string> = {
  login: "text-blue-400",
  register: "text-green-400",
  logout: "text-orange-400",
  create: "text-green-400",
  update: "text-yellow-400",
  delete: "text-red-400",
  import: "text-purple-400",
};

const actions = ["login", "register", "logout", "create", "update", "delete", "import"];
const modules = ["auth", "user", "role", "currency"];

function toWib(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${wib.getUTCFullYear()}-${pad(wib.getUTCMonth() + 1)}-${pad(wib.getUTCDate())}`,
    time: `${pad(wib.getUTCHours())}:${pad(wib.getUTCMinutes())}:${pad(wib.getUTCSeconds())}`,
  };
}

function describeAction(action: string, module: string, details?: string): string {
  if (details?.includes("Google")) return "Login via Google";
  const map: Record<string, Record<string, string>> = {
    login: { auth: "Login ke sistem" },
    register: { auth: "Registrasi akun baru" },
    logout: { auth: "Logout dari sistem" },
    create: { user: "Membuat user", role: "Membuat role", currency: "Menambah mata uang" },
    update: { user: "Memperbarui user", role: "Mengubah role", currency: "Memperbarui mata uang" },
    delete: { user: "Menghapus user", role: "Menghapus role", currency: "Menghapus mata uang" },
    import: { currency: "Import CSV mata uang" },
  };
  return map[action]?.[module] || `${action} ${module}`;
}

export default function AuditLogsPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const fetchLogs = async () => {
    const token = localStorage.getItem("token");
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (actionFilter && actionFilter !== "all") params.set("action", actionFilter);
    if (moduleFilter && moduleFilter !== "all") params.set("module", moduleFilter);
    params.set("page", String(page));
    params.set("limit", String(limit));
    try {
      const res = await fetch(`${API_URL}/audit-logs?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch { /* server unreachable */ }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { router.push("/login"); return; }
    fetchLogs().finally(() => setLoading(false));
  }, [currentUser, authLoading, router, page, search, actionFilter, moduleFilter]);

  const handleExport = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/audit-logs/export/csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "audit-logs.csv";
      a.click();
      URL.revokeObjectURL(url);
    }
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
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground text-sm">{total} total entries</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleExport}>
          <Download size={14} className="mr-1" /> Export CSV
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by email, action, module..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-8" />
        </div>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All modules" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modules</SelectItem>
            {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><History size={14} /> Activity History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {logs.length === 0 && <p className="text-sm text-muted-foreground p-4">No audit logs found.</p>}
            {logs.map((log) => {
              const wib = toWib(log.timestamp);
              return (
              <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                <div className="w-2 h-2 rounded-full mt-1.5 bg-foreground/30 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium capitalize ${actionColors[log.action] || "text-foreground"}`}>
                      {describeAction(log.action, log.module, log.details)}
                    </span>
                    {log.resourceId && <span className="text-[10px] text-muted-foreground">({log.resourceId})</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    oleh <span className="font-medium">{log.userEmail}</span>
                    {" · "}<span className="tabular-nums">{wib.date} {wib.time} WIB</span>
                  </p>
                </div>
              </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
