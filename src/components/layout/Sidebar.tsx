"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  HardHat,
  ClipboardList,
  Users,
  FileCheck2,
  Boxes,
  Coins,
  Truck,
  ShieldAlert,
  UserCog,
  LogOut,
} from "lucide-react";
import { Profile } from "@/types/database";
import { NAVIGATION_ITEMS, ROLES_CONFIG, hasRoleAccess } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/client";
import { SixSigmaLogo } from "@/components/ui/SixSigmaLogo";
import { cn } from "@/lib/utils";

interface SidebarProps {
  profile: Profile | null;
}

const ICONS_MAP: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="w-[18px] h-[18px]" />,
  HardHat: <HardHat className="w-[18px] h-[18px]" />,
  ClipboardList: <ClipboardList className="w-[18px] h-[18px]" />,
  Users: <Users className="w-[18px] h-[18px]" />,
  FileCheck2: <FileCheck2 className="w-[18px] h-[18px]" />,
  Boxes: <Boxes className="w-[18px] h-[18px]" />,
  Coins: <Coins className="w-[18px] h-[18px]" />,
  Truck: <Truck className="w-[18px] h-[18px]" />,
  ShieldAlert: <ShieldAlert className="w-[18px] h-[18px]" />,
  UserCog: <UserCog className="w-[18px] h-[18px]" />,
};

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const userRole = profile?.role || "supervisor";
  const roleInfo = ROLES_CONFIG[userRole] || ROLES_CONFIG.supervisor;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const allowedNavItems = NAVIGATION_ITEMS.filter((item) =>
    hasRoleAccess(userRole, item.allowedRoles)
  );

  const getInitials = (name?: string | null) => {
    if (!name) return "EM";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0 select-none z-30 shadow-[1px_0_10px_0_rgba(0,0,0,0.02)]">
      {/* Brand Header (Inspired by Slide 01 AdminPro) */}
      <div className="p-5 border-b border-slate-100/80">
        <Link href="/dashboard" className="block group">
          <SixSigmaLogo variant="horizontal" size="md" theme="light" />
        </Link>
      </div>

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
          Menu Principal
        </div>

        {allowedNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs transition-colors",
                isActive
                  ? "bg-[#8E2424]/10 text-[#8E2424] font-semibold"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium"
              )}
            >
              <span
                className={cn(
                  "transition-colors",
                  isActive ? "text-[#8E2424]" : "text-slate-400 group-hover:text-slate-700"
                )}
              >
                {ICONS_MAP[item.iconName]}
              </span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* User Profile Block at Bottom (Inspired by Slide 01 AdminPro) */}
      <div className="mt-auto p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-white">
        <Link
          href="/profile"
          className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition group"
          title="Mon Profil & Sécurité (Changer mon mot de passe)"
        >
          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs group-hover:border-[#8E2424]/40">
            {getInitials(profile?.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-[#8E2424] transition-colors">
              {profile?.full_name || "Elysée Mudimbi"}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {userRole === "admin" ? "Super-Admin" : roleInfo.label}
            </p>
          </div>
        </Link>

        <button
          onClick={handleSignOut}
          title="Se déconnecter"
          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
