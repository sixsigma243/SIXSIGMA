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
  LayoutDashboard: <LayoutDashboard className="w-5 h-5" />,
  HardHat: <HardHat className="w-5 h-5" />,
  ClipboardList: <ClipboardList className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  FileCheck2: <FileCheck2 className="w-5 h-5" />,
  Boxes: <Boxes className="w-5 h-5" />,
  Coins: <Coins className="w-5 h-5" />,
  Truck: <Truck className="w-5 h-5" />,
  ShieldAlert: <ShieldAlert className="w-5 h-5" />,
  UserCog: <UserCog className="w-5 h-5" />,
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

  return (
    <aside className="w-64 bg-[#14171B] border-r border-[#252932] flex flex-col h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#252932] bg-[#0E1116] flex flex-col items-center">
        <Link href="/dashboard" className="block py-0.5 transition hover:opacity-90">
          <SixSigmaLogo size="md" />
        </Link>

        {/* User Profile Block */}
        <div className="mt-3 pt-3 border-t border-[#252932] w-full">
          <p className="text-xs font-semibold text-white truncate">
            {profile?.full_name || "Elysée Mudimbi"}
          </p>
          <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">
            {userRole === "admin" ? "Super-Admin" : roleInfo.label}
          </p>
        </div>
      </div>

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-0.5">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
          Modules Opérationnels
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
                "group flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                isActive
                  ? "bg-[#1C2129] text-white border-l-2 border-[#8E2424]"
                  : "text-[#94A3B8] hover:text-white hover:bg-[#1C2129]/60 border-l-2 border-transparent"
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "transition-colors",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                  )}
                >
                  {ICONS_MAP[item.iconName]}
                </span>
                <span className={isActive ? "font-semibold" : "font-normal"}>
                  {item.name}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-[#252932] bg-[#0E1116]">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-[#1C2129] border border-[#252932] transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
