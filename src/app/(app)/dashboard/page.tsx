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
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="rounded-xl bg-[#14171D] border border-[#252932] p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Tableau de bord opérationnel
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Connecté : <span className="text-slate-200 font-semibold">{profile?.full_name || "Elysée Mudimbi"}</span> • {userRole === "admin" ? "Super-Admin" : roleConfig.label}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasRoleAccess(userRole, ["admin", "site_manager", "supervisor"]) && (
              <Link
                href="/field-reports/new"
                className="px-3 py-1.5 rounded-lg bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-semibold border border-[#8E2424] transition flex items-center gap-2"
              >
                <HardHat className="w-3.5 h-3.5" />
                <span>Nouveau Journal</span>
              </Link>
            )}
            {hasRoleAccess(userRole, ["admin", "site_manager", "supervisor", "warehouse_keeper"]) && (
              <Link
                href="/requisitions"
                className="px-3 py-1.5 rounded-lg bg-[#1C1F23] hover:bg-[#252932] text-slate-300 text-xs font-semibold border border-[#252932] transition flex items-center gap-2"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Demande DRI</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Pending Attendance Reconciliations Alert */}
      {reconciliations && reconciliations.length > 0 && (
        <div className="p-3.5 rounded-xl bg-[#1C1F23] border border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Scale className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div>
              <strong className="font-semibold text-white">Écarts de Pointage RH à Arbitrer : </strong>
              <span>
                {reconciliations.length} écart(s) nécessitent votre arbitrage.
              </span>
            </div>
          </div>
          <Link
            href="/attendance"
            className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold whitespace-nowrap transition"
          >
            Arbitrer
          </Link>
        </div>
      )}

      {/* KPI Grid - Sober Industrial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Projects */}
        <div className="bg-[#14171D] border border-[#252932] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              CHANTIERS EN COURS
            </span>
            <HardHat className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-white tracking-tight">
              {activeProjectsCount}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 pt-2 border-t border-[#252932]">
            {projects?.length || 0} projet(s) • Budget : {formatUSD(totalBudgetUSD)}
          </div>
        </div>

        {/* KPI 2: Workforce Today */}
        <div className="bg-[#14171D] border border-[#252932] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              EFFECTIFS DU JOUR
            </span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-white tracking-tight">
              {presentWorkersToday}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 pt-2 border-t border-[#252932]">
            {presentWorkersToday} présents pointés aujourd&apos;hui
          </div>
        </div>

        {/* KPI 3: Pending DRI Requisitions */}
        <div className="bg-[#14171D] border border-[#252932] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              RÉQUISITIONS EN ATTENTE
            </span>
            <FileCheck2 className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-white tracking-tight">
              {pendingRequisitionsCount}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 pt-2 border-t border-[#252932]">
            {pendingRequisitionsCount} demande(s) en attente de visa
          </div>
        </div>

        {/* KPI 4: Fleet & Materials Alerts */}
        <div className="bg-[#14171D] border border-[#252932] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              MATÉRIEL ACTIF
            </span>
            <Truck className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-white tracking-tight">
              {availableVehiclesCount}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 pt-2 border-t border-[#252932]">
            {availableVehiclesCount} engin(s) disponible(s) sur {fleetVehicles?.length || 0}
          </div>
        </div>
      </div>

      {/* Main Content Grid: Projects & Quick Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Chantiers */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <HardHat className="w-4 h-4 text-slate-400" />
                <span>Chantiers & Projets en Exécution</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Suivi d&apos;avancement, budgets multi-devises et conducteurs de travaux assignés.
              </p>
            </div>
            <Link
              href="/projects"
              className="text-xs font-semibold text-slate-300 hover:text-white transition px-2.5 py-1 rounded-lg bg-[#1C1F23] border border-[#252932]"
            >
              Consulter
            </Link>
          </div>

          {!projects || projects.length === 0 ? (
            <div className="bg-[#14171D] border border-[#252932] border-dashed rounded-xl p-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#1C1F23] border border-[#252932] flex items-center justify-center text-slate-400 mx-auto">
                <HardHat className="w-5 h-5 text-slate-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Aucun chantier actif en cours</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Initialisez votre premier chantier pour planifier les travaux, affecter un conducteur et suivre les budgets.
                </p>
              </div>
              <div className="pt-1">
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-semibold transition border border-[#8E2424]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Créer un Projet</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {projects.map((prj) => (
                <div
                  key={prj.id}
                  className="bg-[#14171D] border border-[#252932] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-[#E58585] tracking-wider">
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

                  <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#252932]">
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
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-slate-400" />
                <span>Journaux de Chantier</span>
              </h2>
              <Link
                href="/field-reports"
                className="text-xs font-semibold text-slate-300 hover:text-white transition px-2.5 py-1 rounded-lg bg-[#1C1F23] border border-[#252932]"
              >
                Consulter
              </Link>
            </div>

            {!siteReports || siteReports.length === 0 ? (
              <div className="bg-[#14171D] border border-[#252932] border-dashed rounded-xl p-6 text-center space-y-2.5">
                <div className="w-10 h-10 rounded-lg bg-[#1C1F23] border border-[#252932] flex items-center justify-center text-slate-500 mx-auto">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-white">Aucun journal rédigé</p>
                  <p className="text-[11px] text-slate-400">
                    Les rapports d&apos;activités quotidiens apparaîtront ici.
                  </p>
                </div>
                <div className="pt-1">
                  <Link
                    href="/field-reports/new"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1F23] hover:bg-[#252932] text-slate-300 text-xs font-semibold border border-[#252932] transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Ouvrir un Journal</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {siteReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="bg-[#14171D] border border-[#252932] rounded-xl p-3.5 space-y-2 border-l-2 border-l-[#8E2424]"
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
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-[#252932]">
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
            <div className="bg-[#14171D] rounded-xl p-5 border border-[#252932] space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Coins className="w-4 h-4 text-slate-400" />
                  <span>Trésorerie & Dépenses Chantiers</span>
                </h3>
                <Link
                  href="/finance"
                  className="text-xs font-semibold text-slate-300 hover:text-white transition px-2.5 py-1 rounded-lg bg-[#1C1F23] border border-[#252932]"
                >
                  Consulter
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-3 rounded-lg bg-[#0E1116] border border-[#252932]">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Dépenses USD</span>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {formatUSD(totalUSDSpent)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#0E1116] border border-[#252932]">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Dépenses CDF</span>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {formatCDF(totalCDFSpent)}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                Alerte de gestion active : toute dépense supérieure à <span className="font-semibold text-white">5 000 USD</span> requiert l&apos;approbation de la Direction Générale.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
