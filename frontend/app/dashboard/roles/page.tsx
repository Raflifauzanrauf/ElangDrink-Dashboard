"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Search, ChevronLeft, ChevronRight, Save } from "lucide-react";

interface AppRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
}

const API_URL = "http://localhost:4000/api";

export default function RolesPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const canCreate = currentUser?.permissions?.includes("role:create");
  const canUpdate = currentUser?.permissions?.includes("role:update");
  const canDelete = currentUser?.permissions?.includes("role:delete");
  const limit = 10;

  const fetchRoles = async () => {
    const token = localStorage.getItem("token");
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", String(limit));
    const res = await fetch(`${API_URL}/roles?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setRoles(data.data);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    }
  };

  const fetchPermissions = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/permissions?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setAllPermissions(data.data || data);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) return;
    Promise.all([fetchRoles(), fetchPermissions()]).finally(() => setLoading(false));
  }, [currentUser, authLoading, page, search]);

  const startEdit = (role: AppRole) => {
    setEditId(role.id);
    setForm({ name: role.name, description: role.description });
    setSelectedPerms(role.permissions || []);
    setFormError("");
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm({ name: "", description: "" });
    setSelectedPerms([]);
    setFormError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const token = localStorage.getItem("token");
    const isEditing = editId && editId !== "new";
    const method = isEditing ? "PUT" : "POST";
    const url = isEditing ? `${API_URL}/roles/${editId}` : `${API_URL}/roles`;
    const body: any = { ...form };
    if (isEditing) body.permissions = selectedPerms;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json();
      setFormError(err.message);
      return;
    }
    cancelEdit();
    setPage(1);
    fetchRoles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this role?")) return;
    const token = localStorage.getItem("token");
    await fetch(`${API_URL}/roles/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchRoles();
  };

  const togglePermission = (code: string) => {
    setSelectedPerms((prev) => prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]);
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
          <h1 className="text-2xl font-bold">Roles</h1>
          <p className="text-muted-foreground text-sm">{total} roles</p>
        </div>
        {canCreate && (
          <Button variant="secondary" onClick={() => { cancelEdit(); setEditId("new"); }}>
            <Plus size={16} className="mr-2" /> New Role
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search roles..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-8"
        />
      </div>

      {editId === "new" && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Create Role</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="rname">Name</Label>
                <Input id="rname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="rdesc">Description</Label>
                <Input id="rdesc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              {formError && <p className="text-sm text-destructive sm:col-span-2">{formError}</p>}
              <div className="flex gap-3 sm:col-span-2">
                <Button type="submit">Create</Button>
                <Button type="button" variant="ghost" onClick={cancelEdit}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {roles.map((role) => (
          <Card key={role.id} className="transition-all duration-200 hover:border-foreground/30">
            {editId === role.id ? (
              <CardContent className="py-4 space-y-4">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`name-${role.id}`}>Name</Label>
                    <Input id={`name-${role.id}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`desc-${role.id}`}>Description</Label>
                    <Input id={`desc-${role.id}`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  {formError && <p className="text-sm text-destructive sm:col-span-2">{formError}</p>}
                </form>
                <div>
                  <p className="text-sm font-medium mb-2">Permissions ({selectedPerms.length}/{allPermissions.length})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                    {allPermissions.map((perm) => {
                      const isSelected = selectedPerms.includes(perm.code);
                      return (
                        <div
                          key={perm.id}
                          onClick={() => canUpdate && togglePermission(perm.code)}
                          className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-xs transition-all ${
                            isSelected ? "border-foreground bg-accent" : "border-border hover:border-foreground/50"
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-foreground border-foreground" : "border-muted-foreground"
                          }`}>
                            {isSelected && <span className="text-background text-[8px] font-bold">&#x2713;</span>}
                          </div>
                          <span className="truncate">{perm.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button size="sm" type="submit" onClick={handleSubmit}><Save size={14} className="mr-1.5" /> Save</Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                </div>
              </CardContent>
            ) : (
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium">{role.name}</p>
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{role.permissions.length} permissions</p>
                </div>
                <div className="flex items-center gap-2">
                  {canUpdate && (
                    <button onClick={() => startEdit(role)} className="text-muted-foreground hover:text-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => handleDelete(role.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </CardContent>
            )}
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
    </div>
  );
}