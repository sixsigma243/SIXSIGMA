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
  ChevronRight,
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
  ShieldAlert: <ShieldAlert className="w-5 h-5 text-purple-400" />,
  UserCog: <UserCog className="w-5 h-5 text-[#E07A7A]" />,
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
    <aside className="w-72 bg-[#14171B] border-r border-[#252932] flex flex-col h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#252932] bg-[#0E1116]">
        <SixSigmaLogo size="md" showText={true} showSlogan={true} />

        {/* Active Role Card */}
        <div className="mt-4 p-3 rounded-xl bg-[#1C1F23] border border-[#252932]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
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
          <p className="mt-1 text-xs text-slate-200 font-medium truncate">
            {profile?.full_name || "Utilisateur connecté"}
          </p>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">
            {roleInfo.department}
          </p>
        </div>
      </div>

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
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
                "group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-[#8E2424] text-white shadow-md shadow-[#8E2424]/30 border border-[#8E2424]"
                  : "text-[#94A3B8] hover:text-white hover:bg-[#1C1F23]"
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "transition-colors",
                    isActive ? "text-white" : "text-[#94A3B8] group-hover:text-slate-200"
                  )}
                >
                  {ICONS_MAP[item.iconName]}
                </span>
                <span className={isActive ? "font-semibold" : "font-normal"}>
                  {item.name}
                </span>
              </div>
              <ChevronRight
                className={cn(
                  "w-4 h-4 transition-transform",
                  isActive
                    ? "text-white/80 translate-x-0.5"
                    : "text-slate-600 opacity-0 group-hover:opacity-100"
                )}
              />
            </Link>
          );
        })}
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-[#252932] bg-[#0E1116]">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#E07A7A] hover:text-white bg-[#8E2424]/10 hover:bg-[#8E2424] border border-[#8E2424]/30 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Déconnexion Sécurisée</span>
        </button>
      </div>
    </aside>
  );
}
