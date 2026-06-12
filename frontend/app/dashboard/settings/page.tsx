"use client";

import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  if (user?.role !== "admin") return null;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">System configuration — admin only</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield size={18} />
            Admin Panel Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>This section is reserved for system-wide configuration.</p>
          <p>Only users with the <span className="text-blue-400 font-medium">admin</span> role can access this page.</p>
        </CardContent>
      </Card>
    </div>
  );
}
