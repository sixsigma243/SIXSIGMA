import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ROLES_CONFIG, hasRoleAccess } from "@/lib/rbac";
import { formatUSD, formatCDF, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CurrencyBadge } from "@/components/ui/CurrencyBadge";
import {
  HardHat,
  Users,
  FileCheck2,
  Boxes,
  Truck,
  Coins,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ClipboardList,
  Scale,
  Plus,
} from "lucide-react";
import { Profile, Project, DailySiteReport, MaterialRequisition, CashboxTransaction, AttendanceReconciliation } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch current user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .single();

  // Fetch KPI data in parallel
  const [
    { data: projects },
    { data: siteReports },
    { data: requisitions },
    { data: inventoryItems },
    { data: fleetVehicles },
    { data: timeEntries },
    { data: transactions },
    { data: reconciliations },
  ] = await Promise.all([
    supabase.from("projects").select("*, site_manager:site_manager_id(*)").order("created_at", { ascending: false }),
    supabase.from("daily_site_reports").select("*, project:project_id(*), supervisor:supervisor_id(*)").order("report_date", { ascending: false }).limit(5),
    supabase.from("material_requisitions").select("*, project:project_id(*), requester:requested_by(*)").order("created_at", { ascending: false }).limit(5),
    supabase.from("inventory_items").select("*"),
    supabase.from("fleet_vehicles").select("*"),
    supabase.from("time_entries").select("*").eq("entry_date", new Date().toISOString().split("T")[0]),
    supabase.from("cashbox_transactions").select("*, project:project_id(*)").order("created_at", { ascending: false }).limit(5),
    supabase.from("attendance_reconciliations").select("*").eq("status", "pending"),
  ]);

  const userRole = (profile?.role || "supervisor") as keyof typeof ROLES_CONFIG;
  const roleConfig = ROLES_CONFIG[userRole];

  // Aggregations
  const activeProjectsCount = projects?.filter((p) => p.status === "in_progress").length || 0;
  const totalBudgetUSD = projects?.reduce((acc, p) => acc + (p.currency === "USD" ? Number(p.budget) : 0), 0) || 0;
  const presentWorkersToday = timeEntries?.filter((t) => t.status === "present" || t.status === "late").length || 0;
  const pendingRequisitionsCount = requisitions?.filter((r) => r.status === "submitted").length || 0;
  const lowStockItems = inventoryItems?.filter((i) => Number(i.current_stock) <= Number(i.min_threshold)) || [];
  const availableVehiclesCount = fleetVehicles?.filter((v) => v.status === "available").length || 0;

  // Cashbox totals
  const totalUSDSpent = transactions
    ?.filter((t) => t.currency === "USD" && t.transaction_type === "EXPENSE")
    .reduce((acc, t) => acc + Number(t.amount), 0) || 0;
  const totalCDFSpent = transactions
    ?.filter((t) => t.currency === "CDF" && t.transaction_type === "EXPENSE")
    .reduce((acc, t) => acc + Number(t.amount), 0) || 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#14171D] border border-[#252932] p-6 md:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#8E2424]/20 text-[#E58585] border border-[#8E2424]/50">
                SIX SIGMA ERP
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-400 italic">« La constance dans la qualité »</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Bonjour, {profile?.full_name || "Utilisateur"}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Poste actif : <span className="font-semibold text-white">{roleConfig.label}</span> • {roleConfig.department}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {hasRoleAccess(userRole, ["admin", "site_manager", "supervisor"]) && (
              <Link
                href="/field-reports/new"
                className="px-4 py-2.5 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-bold shadow-lg shadow-[#8E2424]/25 border border-[#8E2424] transition flex items-center gap-2"
              >
                <HardHat className="w-4 h-4" />
                <span>Rédiger Journal Chantier</span>
              </Link>
            )}
            {hasRoleAccess(userRole, ["admin", "site_manager", "supervisor", "warehouse_keeper"]) && (
              <Link
                href="/requisitions"
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold border border-slate-700 transition flex items-center gap-2"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Demande DRI</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Pending Attendance Reconciliations Alert */}
      {reconciliations && reconciliations.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-amber-200">
            <Scale className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <strong className="font-bold">Écarts de Pointage RH à Arbitrer : </strong>
              <span>
                {reconciliations.length} écart(s) entre le pointage du Pointeur et la déclaration du Chef d&apos;Équipe requièrent votre visa d&apos;arbitrage.
              </span>
            </div>
          </div>
          <Link
            href="/attendance"
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap transition"
          >
            Arbitrer Maintenant &rarr;
          </Link>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Projects */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Chantiers Actifs
            </span>
            <div className="p-2.5 rounded-xl bg-[#8E2424]/15 text-[#E58585] border border-[#8E2424]/30">
              <HardHat className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-white tracking-tight">
              {activeProjectsCount}
            </span>
            <span className="text-xs text-slate-400 ml-2">
              sur {projects?.length || 0} projets
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800/60">
            <span>Budget consolidé :</span>
            <span className="font-bold text-[#7BA238]">{formatUSD(totalBudgetUSD)}</span>
          </div>
        </div>

        {/* KPI 2: Workforce Today */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Effectifs Pointés
            </span>
            <div className="p-2.5 rounded-xl bg-blue-950/60 text-blue-400 border border-blue-800/40">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-white tracking-tight">
              {presentWorkersToday}
            </span>
            <span className="text-xs text-[#7BA238] ml-2 font-medium">
              Présents aujourd&apos;hui
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800/60">
            <span>Supervision RH :</span>
            <span className="font-semibold text-slate-300">Pointages en cours</span>
          </div>
        </div>

        {/* KPI 3: Pending DRI Requisitions */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Réquisitions DRI
            </span>
            <div className="p-2.5 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-800/40">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-amber-400 tracking-tight">
              {pendingRequisitionsCount}
            </span>
            <span className="text-xs text-slate-400 ml-2">
              en attente de visa
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800/60">
            <span>Validation :</span>
            <span className="font-semibold text-slate-300">Conducteur de Travaux</span>
          </div>
        </div>

        {/* KPI 4: Fleet & Materials Alerts */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Flotte & Matériel
            </span>
            <div className="p-2.5 rounded-xl bg-[#7BA238]/15 text-[#7BA238] border border-[#7BA238]/30">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-white tracking-tight">
              {availableVehiclesCount}
            </span>
            <span className="text-xs text-slate-400 ml-2">
              engins disponibles sur {fleetVehicles?.length || 0}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800/60">
            <span>Alertes stock :</span>
            <span className={lowStockItems.length > 0 ? "text-amber-400 font-bold" : "text-[#7BA238] font-bold"}>
              {lowStockItems.length} articles critiques
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Projects & Quick Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Active Chantiers */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <HardHat className="w-5 h-5 text-[#8E2424]" />
                <span>Chantiers & Projets en Exécution</span>
              </h2>
              <p className="text-xs text-slate-400">
                Suivi d&apos;avancement, budgets multi-devises et conducteurs de travaux assignés.
              </p>
            </div>
            <Link
              href="/projects"
              className="text-xs font-semibold text-[#E58585] hover:text-white flex items-center gap-1"
            >
              <span>Voir tout</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {!projects || projects.length === 0 ? (
            <div className="bg-[#14171D] border border-[#252932] border-dashed rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#1C1F23] border border-[#252932] flex items-center justify-center text-slate-400 mx-auto">
                <HardHat className="w-6 h-6 text-[#8E2424]" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Aucun chantier actif en cours</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Initialisez votre premier chantier pour planifier les travaux, affecter un conducteur et suivre les budgets.
                </p>
              </div>
              <div className="pt-1">
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-bold transition shadow-md shadow-[#8E2424]/20 border border-[#8E2424]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Créer un Projet</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((prj) => (
                <div
                  key={prj.id}
                  className="glass-card rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-[#E58585] tracking-wider">
                        {prj.code}
                      </span>
                      <StatusBadge status={prj.status} type="project" />
                    </div>
                    <h3 className="text-sm font-bold text-white">
                      {prj.title}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Client : <span className="text-slate-300">{prj.client_name}</span> • Localisation : <span className="text-slate-300">{prj.location}</span>
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <span className="text-[11px] text-slate-400">Budget engagé</span>
                    <CurrencyBadge amount={Number(prj.budget)} currency={prj.currency} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Recent Daily Reports & Actions */}
        <div className="space-y-6">
          {/* Daily Site Reports Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-500" />
                <span>Journaux de Chantier</span>
              </h2>
              <Link
                href="/field-reports"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <span>Détails</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            {!siteReports || siteReports.length === 0 ? (
              <div className="bg-[#14171D] border border-[#252932] border-dashed rounded-xl p-6 text-center space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#1C1F23] border border-[#252932] flex items-center justify-center text-amber-500 mx-auto">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-white">Aucun journal rédigé</p>
                  <p className="text-[11px] text-slate-400">
                    Les rapports d&apos;activités quotidiens apparaîtront ici.
                  </p>
                </div>
                <div className="pt-1">
                  <Link
                    href="/field-reports/new"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1C1F23] hover:bg-[#252932] text-amber-400 text-xs font-semibold border border-amber-800/40 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Ouvrir un Journal</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {siteReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="glass-card rounded-xl p-4 space-y-2.5 border-l-4 border-l-amber-600"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(rep.report_date)}
                      </span>
                      <StatusBadge status={rep.status} type="report" />
                    </div>
                    <p className="text-xs font-medium text-slate-200 line-clamp-2">
                      {rep.activities_summary}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                      <span>Météo : {rep.weather || "Standard"}</span>
                      <span>Effectif : {rep.workforce_count} ouvriers</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cashbox & Treasury Summary */}
          {hasRoleAccess(userRole, ["admin", "company_management", "accountant", "site_manager"]) && (
            <div className="bg-[#14171D] rounded-2xl p-5 border border-[#252932] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#7BA238]" />
                  <span>Trésorerie & Dépenses Chantiers</span>
                </h3>
                <Link href="/finance" className="text-[11px] text-[#7BA238] hover:underline">
                  Gérer
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-3 rounded-xl bg-[#0E1116] border border-[#252932]">
                  <span className="text-[10px] text-slate-400 uppercase">Dépenses USD</span>
                  <div className="text-sm font-bold text-[#7BA238] mt-0.5">
                    {formatUSD(totalUSDSpent)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#0E1116] border border-[#252932]">
                  <span className="text-[10px] text-slate-400 uppercase">Dépenses CDF</span>
                  <div className="text-sm font-bold text-amber-400 mt-0.5">
                    {formatCDF(totalCDFSpent)}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                Alerte automatique active : toute dépense supérieure à <span className="font-bold text-white">5 000 USD</span> requiert le visa de la Direction Générale.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
