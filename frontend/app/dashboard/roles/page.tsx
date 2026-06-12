"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface AppRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

const API_URL = "http://localhost:4000/api";

export default function RolesPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
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

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { router.push("/login"); return; }
    fetchRoles().finally(() => setLoading(false));
  }, [currentUser, authLoading, router, page, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const token = localStorage.getItem("token");
    const method = editId ? "PUT" : "POST";
    const url = editId ? `${API_URL}/roles/${editId}` : `${API_URL}/roles`;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = await res.json();
      setFormError(err.message);
      return;
    }
    setForm({ name: "", description: "" });
    setEditId(null);
    setShowForm(false);
    setPage(1);
    fetchRoles();
  };

  const handleEdit = (role: AppRole) => {
    setForm({ name: role.name, description: role.description });
    setEditId(role.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this role?")) return;
    const token = localStorage.getItem("token");
    await fetch(`${API_URL}/roles/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchRoles();
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
          <Button variant="secondary" onClick={() => { setEditId(null); setForm({ name: "", description: "" }); setShowForm(!showForm); }}>
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

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">{editId ? "Edit Role" : "Create Role"}</CardTitle></CardHeader>
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
                <Button type="submit">{editId ? "Update" : "Create"}</Button>
                <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {roles.map((role) => (
          <Card key={role.id} className="transition-all duration-200 hover:border-foreground/30">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium">{role.name}</p>
                <p className="text-xs text-muted-foreground">{role.description}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{role.permissions.length} permissions</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/roles/${role.id}`)}>
                  <Pencil size={14} className="mr-1" /> Permissions
                </Button>
                {canUpdate && (
                  <button onClick={() => handleEdit(role)} className="text-muted-foreground hover:text-foreground">
                    <Pencil size={14} />
                  </button>
                )}
                {canDelete && !["r1", "r2", "r3", "r4"].includes(role.id) && (
                  <button onClick={() => handleDelete(role.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 size={14} />
                  </button>
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
    </div>
  );
}
