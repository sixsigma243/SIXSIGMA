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
  LogOut,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Profile } from "@/types/database";
import { NAVIGATION_ITEMS, ROLES_CONFIG, hasRoleAccess } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/client";
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
    <aside className="w-72 bg-[#0F172A] border-r border-slate-800 flex flex-col h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 bg-[#0B1120]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-700 to-rose-900 flex items-center justify-center shadow-lg shadow-red-950/50 border border-red-600/30">
            <span className="font-black text-white text-lg tracking-tighter">6Σ</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-white text-base tracking-wider uppercase">
                SIX SIGMA
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-950/80 text-red-400 border border-red-800/50">
                ERP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 italic font-medium">
              « La constance dans la qualité »
            </p>
          </div>
        </div>

        {/* Active Role Card */}
        <div className="mt-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Rôle Actif
            </span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                roleInfo.badgeColor
              )}
            >
              {roleInfo.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-300 truncate">
            {profile?.full_name || "Utilisateur connecté"}
          </p>
          <p className="text-[11px] text-slate-500 truncate">
            {roleInfo.department}
          </p>
        </div>
      </div>

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Modules Principaux
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
                "group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-red-950/70 text-white border border-red-800/60 shadow-md shadow-red-950/30"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "transition-colors",
                    isActive ? "text-red-400" : "text-slate-400 group-hover:text-slate-200"
                  )}
                >
                  {ICONS_MAP[item.iconName]}
                </span>
                <span>{item.name}</span>
              </div>
              <ChevronRight
                className={cn(
                  "w-4 h-4 transition-transform",
                  isActive
                    ? "text-red-400 translate-x-0.5"
                    : "text-slate-600 opacity-0 group-hover:opacity-100"
                )}
              />
            </Link>
          );
        })}
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-slate-800 bg-[#0B1120]/80">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/40 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
