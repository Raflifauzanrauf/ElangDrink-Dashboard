"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, Role } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, UserPlus, Search, ChevronLeft, ChevronRight, List, TreePine, ChevronDown, ChevronRight as ChevronRightIcon, Users } from "lucide-react";

interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: string;
  roleId: string;
  division: string;
}

interface ApiRole {
  id: string;
  name: string;
  description: string;
}

const API_URL = "http://localhost:4000/api";

const roleColors: Record<string, string> = {
  admin: "bg-blue-500/20 text-blue-400",
  manager: "bg-green-500/20 text-green-400",
  editor: "bg-yellow-500/20 text-yellow-400",
  viewer: "bg-gray-500/20 text-gray-400",
  spv: "bg-purple-500/20 text-purple-400",
  finance: "bg-cyan-500/20 text-cyan-400",
};

function badgeClass(role: string): string {
  return roleColors[role.toLowerCase()] || "bg-gray-500/20 text-gray-400";
}

const divisions = ["Finance", "Marketing", "Operations", "IT", "HR", "Sales", "Production", "R&D"];

type ViewMode = "list" | "tree";

export default function UsersPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", roleId: "", division: "" });
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());

  const isAdmin = currentUser?.roleId === "r1";
  const limit = 10;

  const fetchRoles = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/roles?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setRoles(data.data || []);
      if (!form.roleId && data.data?.length > 0) {
        setForm((prev) => ({ ...prev, roleId: data.data[0].id }));
      }
    }
  };

  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter && roleFilter !== "all") params.set("role", roleFilter);
    if (divisionFilter && divisionFilter !== "all") params.set("division", divisionFilter);
    params.set("page", String(page));
    params.set("limit", String(limit));
    const res = await fetch(`${API_URL}/users?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.data);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { router.push("/login"); return; }
    if (!isAdmin) { router.push("/dashboard"); return; }
    Promise.all([fetchUsers(), fetchRoles()]).finally(() => setLoading(false));
  }, [currentUser, authLoading, router, page, roleFilter, divisionFilter, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = await res.json();
      setFormError(err.message);
      return;
    }
    setForm({ name: "", email: "", password: "", roleId: roles[0]?.id || "", division: "" });
    setShowForm(false);
    setPage(1);
    fetchUsers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    const token = localStorage.getItem("token");
    await fetch(`${API_URL}/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchUsers();
  };

  const toggleDivision = (div: string) => {
    setExpandedDivisions((prev) => {
      const next = new Set(prev);
      if (next.has(div)) next.delete(div);
      else next.add(div);
      return next;
    });
  };

  const groupedByDivision: Record<string, ApiUser[]> = {};
  for (const u of users) {
    const div = u.division || "Unassigned";
    if (!groupedByDivision[div]) groupedByDivision[div] = [];
    groupedByDivision[div].push(u);
  }

  const sortedDivisions = Object.keys(groupedByDivision).sort();

  if (authLoading || loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground text-sm">{total} users</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition-colors ${viewMode === "list" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="List view"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode("tree")}
              className={`p-2 transition-colors ${viewMode === "tree" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Tree view"
            >
              <TreePine size={16} />
            </button>
          </div>
          {isAdmin && (
            <Button variant="secondary" onClick={() => setShowForm(!showForm)}>
              <UserPlus size={16} className="mr-2" /> New User
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </form>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={divisionFilter} onValueChange={(v) => { setDivisionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All divisions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All divisions</SelectItem>
            {divisions.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
            <SelectItem value="Unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Create New User</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="uname">Name</Label>
                <Input id="uname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="uemail">Email</Label>
                <Input id="uemail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="upass">Password</Label>
                <Input id="upass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="urole">Role</Label>
                <Select value={form.roleId} onValueChange={(v) => setForm({ ...form, roleId: v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="udiv">Division</Label>
                <Select value={form.division} onValueChange={(v) => setForm({ ...form, division: v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select division" /></SelectTrigger>
                  <SelectContent>
                    {divisions.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formError && <p className="text-sm text-destructive sm:col-span-2">{formError}</p>}
              <div className="flex gap-3 sm:col-span-2">
                <Button type="submit">Create</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {viewMode === "list" ? (
        <>
          <div className="space-y-2">
            {users.map((u) => (
              <Card key={u.id} className="transition-all duration-200 hover:border-foreground/30">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-foreground/10 flex items-center justify-center text-sm font-medium">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {u.division && <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-foreground/5">{u.division}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass(u.role)}`}>{u.role}</span>
                    {isAdmin && u.id !== currentUser?.id && (
                      <button onClick={() => handleDelete(u.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={16} /></button>
                    )}
                  </div>
                </CardContent>
              </Card>
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
        </>
      ) : (
        <div className="space-y-3">
          {sortedDivisions.map((div) => {
            const divUsers = groupedByDivision[div];
            const isExpanded = expandedDivisions.has(div);
            const roleGroups: Record<string, ApiUser[]> = {};
            for (const u of divUsers) {
              if (!roleGroups[u.role]) roleGroups[u.role] = [];
              roleGroups[u.role].push(u);
            }
            const sortedRoles = Object.keys(roleGroups).sort();
            return (
              <Card key={div} className="overflow-hidden transition-all duration-200 hover:border-foreground/30">
                <button
                  onClick={() => toggleDivision(div)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users size={16} className="text-muted-foreground" />
                    <span className="font-medium">{div}</span>
                    <span className="text-xs text-muted-foreground">({divUsers.length} user{divUsers.length !== 1 ? "s" : ""})</span>
                  </div>
                  {isExpanded ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRightIcon size={16} className="text-muted-foreground" />}
                </button>
                {isExpanded && (
                  <div className="border-t border-border px-4 py-3 space-y-3">
                    {sortedRoles.map((r) => (
                      <div key={r}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass(r)}`}>{r}</span>
                          <span className="text-xs text-muted-foreground">({roleGroups[r].length})</span>
                        </div>
                        <div className="ml-4 space-y-1.5">
                          {roleGroups[r].map((u) => (
                            <div key={u.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-accent/30 transition-colors">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center text-[10px] font-medium shrink-0">
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm">{u.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{u.email}</p>
                                </div>
                              </div>
                              {isAdmin && u.id !== currentUser?.id && (
                                <button onClick={() => handleDelete(u.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
          {users.length === 0 && <p className="text-center text-muted-foreground py-12">No users found.</p>}
        </div>
      )}
    </div>
  );
}
