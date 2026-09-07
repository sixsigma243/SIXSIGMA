"use client";

import React from "react";
import { Profile } from "@/types/database";
import { ROLES_CONFIG } from "@/lib/rbac";
import { DollarSign, RefreshCw, Shield, Bell } from "lucide-react";

interface HeaderProps {
  profile: Profile | null;
}

export function Header({ profile }: HeaderProps) {
  const userRole = profile?.role || "supervisor";
  const roleInfo = ROLES_CONFIG[userRole] || ROLES_CONFIG.supervisor;

  return (
    <header className="h-16 bg-[#1C1F23]/95 backdrop-blur-md border-b border-[#252932] px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left Title & Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#7BA238] animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-300">
            Portail Entreprise
          </span>
        </div>
        <span className="text-slate-600">|</span>
        <span className="text-xs text-slate-400 hidden md:inline">
          BTP • Génie Civil • Flotte • Logistique
        </span>
      </div>

      {/* Right Toolbar */}
      <div className="flex items-center gap-4">
        {/* Currency Exchange Rate Ticker */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#14171D] border border-[#252932] text-xs font-medium text-slate-300">
          <DollarSign className="w-3.5 h-3.5 text-[#7BA238]" />
          <span>Taux Fixe : </span>
          <span className="font-bold text-amber-300">1 USD = 2 850 CDF</span>
        </div>

        {/* User Info Badge */}
        <div className="flex items-center gap-3 pl-2 border-l border-[#252932]">
          <div className="w-8 h-8 rounded-full bg-[#14171D] flex items-center justify-center text-xs font-bold text-[#E58585] border border-[#8E2424]/40">
            {profile?.first_name?.[0] || "U"}
            {profile?.last_name?.[0] || ""}
          </div>
          <div className="hidden sm:block text-right">
            <div className="text-xs font-semibold text-slate-200">
              {profile?.full_name || "Utilisateur"}
            </div>
            <div className="text-[10px] text-slate-400">
              {roleInfo.label}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
