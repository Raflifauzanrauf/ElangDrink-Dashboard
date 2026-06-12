"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Coins, Clock, AlertCircle, ArrowUpRight, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardData {
  totalUsers: number;
  totalCurrencies: number;
  totalProposals: number;
  pendingProposals: number;
  todayProposals: number;
  todayLogins: number;
  proposalsByDay: Record<string, number>;
  auditByDay: Record<string, number>;
  recentActivity: { id: string; action: string; module: string; details: string; userEmail: string; timestamp: string }[];
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [usdToIdr, setUsdToIdr] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    const token = localStorage.getItem("token");

    fetch("http://localhost:4000/api/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});

    fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json")
      .then((r) => r.json())
      .then((d) => setUsdToIdr(d.usd?.idr))
      .catch(() => {});
  }, [user, authLoading, router]);

  if (authLoading || !data) return null;

  const chartData = Object.entries(data.proposalsByDay)
    .map(([day, count]) => ({ day: day.slice(5), count }))
    .slice(-14);

  const notifications = [
    ...(data.pendingProposals > 0
      ? [{ icon: <AlertCircle size={16} className="text-yellow-400" />, message: `${data.pendingProposals} proposal${data.pendingProposals > 1 ? "s" : ""} pending approval`, link: "/dashboard/proposals" }]
      : []),
    { icon: <ArrowUpRight size={16} className="text-green-400" />, message: `${data.todayProposals} proposal${data.todayProposals !== 1 ? "s" : ""} created today` },
    { icon: <Clock size={16} className="text-blue-400" />, message: `${data.todayLogins} login${data.todayLogins !== 1 ? "s" : ""} today` },
  ];

  const summaryCards = [
    { label: "Total Users", value: data.totalUsers, icon: <Users size={22} />, color: "text-blue-400" },
    { label: "Proposals", value: data.totalProposals, icon: <FileText size={22} />, color: "text-green-400" },
    { label: "Pending", value: data.pendingProposals, icon: <AlertCircle size={22} />, color: "text-yellow-400" },
    { label: "Currencies", value: data.totalCurrencies, icon: <Coins size={22} />, color: "text-purple-400" },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Welcome back, {user?.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((s) => (
          <Card key={s.label} className="transition-all duration-200 hover:border-foreground/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <span className={s.color}>{s.icon}</span>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign size={16} className="text-green-400" /> USD to IDR Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {usdToIdr ? `Rp ${usdToIdr.toLocaleString("id-ID")}` : "..."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">1 USD</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Proposals Usage (last 14 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="day" tick={{ fill: "#999", fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#999", fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1C1C1C", border: "1px solid #333", borderRadius: 8, color: "#fff" }} />
                  <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm">No proposal data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {user?.role === "admin" && (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AlertCircle size={16} /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications.map((n, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                {n.icon}
                {n.link ? (
                  <a href={n.link} className="hover:underline text-foreground/90">{n.message}</a>
                ) : (
                  <span>{n.message}</span>
                )}
              </div>
            ))}
            {data.recentActivity.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center gap-3 text-sm text-muted-foreground">
                <Clock size={14} />
                <span>
                  <span className="text-foreground/80">{a.userEmail}</span> — {a.details}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
