"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Key, Search } from "lucide-react";

interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
}

const API_URL = "http://localhost:4000/api";

const modules = ["user", "role", "permission", "currency", "audit"];

export default function PermissionsPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { router.push("/login"); return; }
    const token = localStorage.getItem("token");
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (moduleFilter && moduleFilter !== "all") params.set("module", moduleFilter);
    params.set("limit", "50");
    fetch(`${API_URL}/permissions?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setPermissions(data.data || data))
      .finally(() => setLoading(false));
  }, [currentUser, authLoading, router, search, moduleFilter]);

  if (authLoading || loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const grouped: Record<string, Permission[]> = {};
  permissions.forEach((p) => {
    const mod = p.code.split(":")[0];
    if (!grouped[mod]) grouped[mod] = [];
    grouped[mod].push(p);
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Permissions</h1>
        <p className="text-muted-foreground text-sm">{permissions.length} permissions</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search permissions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={moduleFilter} onValueChange={(v) => setModuleFilter(v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All modules" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modules</SelectItem>
            {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(grouped).map(([mod, perms]) => (
          <Card key={mod}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm capitalize flex items-center gap-2">
                <Key size={14} /> {mod}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {perms.map((perm) => (
                <div key={perm.id} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm">{perm.name}</p>
                    <p className="text-[10px] text-muted-foreground">{perm.code}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
