"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, Role } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Shield,
  ChevronRight,
  UserCog,
  Key,
  DollarSign,
  History,
  Database,
  FileText,
  Bell,
} from "lucide-react";
import { useEffect, useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: Role[];
  permissions?: string[];
  badge?: number;
}

const masterDataItems: NavItem[] = [
  { label: "Roles", href: "/dashboard/roles", icon: <UserCog size={18} />, roles: ["admin", "manager"], permissions: ["role:read"] },
  { label: "Permissions", href: "/dashboard/permissions", icon: <Key size={18} />, roles: ["admin", "manager"], permissions: ["permission:read"] },
  { label: "Currencies", href: "/dashboard/currencies", icon: <DollarSign size={18} />, roles: ["admin", "manager", "editor", "viewer"], permissions: ["currency:read"] },
  { label: "Audit Logs", href: "/dashboard/audit-logs", icon: <History size={18} />, roles: ["admin", "manager"], permissions: ["audit:read"] },
];

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} />, roles: ["admin", "manager", "editor", "viewer"] },
  { label: "Proposals", href: "/dashboard/proposals", icon: <FileText size={18} />, roles: ["admin", "manager", "editor", "viewer"], permissions: ["proposal:read"] },
  { label: "Users", href: "/dashboard/users", icon: <Users size={18} />, roles: ["admin"], permissions: ["user:read"] },
  { label: "Notifications", href: "/dashboard/notifications", icon: <Bell size={18} />, roles: ["admin", "manager", "editor", "viewer"] },
  { label: "Settings", href: "/dashboard/settings", icon: <Settings size={18} />, roles: ["admin"] },
];

const roleBadge: Record<Role, string> = {
  admin: "bg-blue-500/20 text-blue-400",
  manager: "bg-green-500/20 text-green-400",
  editor: "bg-yellow-500/20 text-yellow-400",
  viewer: "bg-gray-500/20 text-gray-400",
};

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href));
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      }`}
    >
      <div className="relative">
        {item.icon}
        {item.badge ? (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {item.badge > 9 ? "9+" : item.badge}
          </span>
        ) : null}
      </div>
      <span>{item.label}</span>
      {isActive && <ChevronRight size={14} className="ml-auto" />}
    </Link>
  );
}

function canSeeItem(item: NavItem, userRole: string, userPerms: string[]): boolean {
  const predefined: Role[] = ["admin", "manager", "editor", "viewer"];
  if (predefined.includes(userRole as Role)) {
    return item.roles.includes(userRole as Role);
  }
  if (item.permissions) {
    return item.permissions.length === 0 || item.permissions.some((p) => userPerms.includes(p));
  }
  const allRoles: Role[] = ["admin", "manager", "editor", "viewer"];
  return allRoles.every((r) => item.roles.includes(r));
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [userPerms, setUserPerms] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    setUserPerms(user.permissions || []);
    const fetchPermissions = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("http://localhost:4000/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUserPerms(data.permissions || []);
        }
      } catch {}
    };
    fetchPermissions();
    const permInterval = setInterval(fetchPermissions, 30000);
    const fetchCount = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("http://localhost:4000/api/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount);
        }
      } catch {}
    };
    fetchCount();
    const notifInterval = setInterval(fetchCount, 30000);
    return () => { clearInterval(permInterval); clearInterval(notifInterval); };
  }, [user]);

  const itemsWithBadge = navItems.map((item) => {
    if (item.href === "/dashboard/notifications" && unreadCount > 0) {
      return { ...item, badge: unreadCount };
    }
    return item;
  });

  const visibleItems = itemsWithBadge.filter((item) => user && canSeeItem(item, user.role, userPerms));
  const visibleMasterData = masterDataItems.filter((item) => user && canSeeItem(item, user.role, userPerms));

  return (
    <aside className="w-60 h-screen flex flex-col bg-card border-r border-border shrink-0">
      <div className="p-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Shield className="text-foreground" size={22} />
          <span className="font-semibold text-lg">Admin Panel</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {visibleItems.map((item) => (
          <SidebarLink key={item.href} item={item} pathname={pathname} />
        ))}
        {visibleMasterData.length > 0 && (
          <>
            <div className="flex items-center gap-2 px-3 pt-4 pb-1">
              <Database size={13} className="text-muted-foreground" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Master Data</span>
            </div>
            {visibleMasterData.map((item) => (
              <SidebarLink key={item.href} item={item} pathname={pathname} />
            ))}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-sm font-medium">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${roleBadge[user.role as Role] || "bg-gray-500/20 text-gray-400"}`}>
                {user.role}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
