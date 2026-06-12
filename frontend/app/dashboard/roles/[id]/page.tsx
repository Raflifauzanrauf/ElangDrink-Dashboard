"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";

interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
}

interface AppRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

const API_URL = "http://localhost:4000/api";

export default function RoleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const canUpdate = currentUser?.permissions?.includes("role:update");

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { router.push("/login"); return; }
    const token = localStorage.getItem("token");
    Promise.all([
      fetch(`${API_URL}/roles/${params.id}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API_URL}/permissions?limit=50`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ]).then(([roleData, permsData]) => {
      setRole(roleData);
      setAllPermissions(permsData.data || permsData);
      setSelected(roleData.permissions || []);
    }).finally(() => setLoading(false));
  }, [currentUser, authLoading, router, params.id]);

  const togglePermission = (code: string) => {
    setSelected((prev) => prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]);
  };

  const handleSave = async () => {
    if (!canUpdate) return;
    setSaving(true);
    setSuccess(false);
    const token = localStorage.getItem("token");
    await fetch(`${API_URL}/roles/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ permissions: selected }),
    });
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  if (authLoading || loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!role) return null;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/dashboard/roles")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold capitalize">{role.name}</h1>
          <p className="text-muted-foreground text-sm">{role.description}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Permissions ({selected.length}/{allPermissions.length})</CardTitle>
          {canUpdate && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save size={14} className="mr-2" />{saving ? "Saving..." : success ? "Saved!" : "Save"}</Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allPermissions.map((perm) => {
              const isSelected = selected.includes(perm.code);
              return (
                <div
                  key={perm.id}
                  onClick={() => canUpdate && togglePermission(perm.code)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected ? "border-foreground bg-accent" : "border-border hover:border-foreground/50"
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    isSelected ? "bg-foreground border-foreground" : "border-muted-foreground"
                  }`}>
                    {isSelected && <span className="text-background text-[10px] font-bold">&#x2713;</span>}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{perm.name}</p>
                    <p className="text-xs text-muted-foreground">{perm.code}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
