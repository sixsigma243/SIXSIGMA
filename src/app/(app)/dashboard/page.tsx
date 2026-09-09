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
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { Profile, Project, DailySiteReport, MaterialRequisition, CashboxTransaction, AttendanceReconciliation } from "@/types/database";
import { TreasuryRealtimeWidget } from "@/components/dashboard/TreasuryRealtimeWidget";
import { FinancialPerformanceChart } from "@/components/dashboard/FinancialPerformanceChart";

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
  const totalUSDIncome = transactions
    ?.filter((t) => t.currency === "USD" && t.transaction_type === "INCOME")
    .reduce((acc, t) => acc + Number(t.amount), 0) || 0;
  const totalCDFSpent = transactions
    ?.filter((t) => t.currency === "CDF" && t.transaction_type === "EXPENSE")
    .reduce((acc, t) => acc + Number(t.amount), 0) || 0;
  const totalCDFIncome = transactions
    ?.filter((t) => t.currency === "CDF" && t.transaction_type === "INCOME")
    .reduce((acc, t) => acc + Number(t.amount), 0) || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Welcome Banner - Clean Modern SaaS Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#1C1F23] tracking-tight">
              Tableau de bord opérationnel
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Connecté : <span className="text-slate-800 font-semibold">{profile?.full_name || "Elysée Mudimbi"}</span> •{" "}
              <span className="text-slate-600">{userRole === "admin" ? "Super-Admin" : roleConfig.label}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {hasRoleAccess(userRole, ["admin", "site_manager", "supervisor"]) && (
              <Link
                href="/field-reports/new"
                className="px-4 py-2 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-semibold shadow-sm transition flex items-center gap-2 active:scale-95"
              >
                <HardHat className="w-3.5 h-3.5" />
                <span>Nouveau Journal</span>
              </Link>
            )}
            {hasRoleAccess(userRole, ["admin", "site_manager", "supervisor", "warehouse_keeper"]) && (
              <Link
                href="/requisitions"
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200/80 transition flex items-center gap-2 active:scale-95"
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
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Scale className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div>
              <strong className="font-semibold text-amber-950">Écarts de Pointage RH à Arbitrer : </strong>
              <span>
                {reconciliations.length} écart(s) nécessitent votre arbitrage.
              </span>
            </div>
          </div>
          <Link
            href="/attendance"
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold whitespace-nowrap transition shadow-sm"
          >
            Arbitrer
          </Link>
        </div>
      )}

      {/* 4 KPI Grid (Clean Modern SaaS style - Slide 02) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Chantiers en cours */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.07)] transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-[#8E2424]/10 text-[#8E2424] flex items-center justify-center">
              <HardHat className="w-5 h-5" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-[#8E2424]" /> {activeProjectsCount} actifs
            </span>
          </div>
          <div className="mt-4">
            <span className="text-2xl lg:text-3xl font-bold text-[#1C1F23] tracking-tight">
              {activeProjectsCount}
            </span>
            <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">
              Chantiers en cours
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>{projects?.length || 0} projet(s) au total</span>
            <span className="font-semibold text-slate-700">{formatUSD(totalBudgetUSD)}</span>
          </div>
        </div>

        {/* KPI 2: Effectifs du jour */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.07)] transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-[#7BA238]/10 text-[#7BA238] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#7BA238] flex items-center gap-1">
              Aujourd&apos;hui
            </span>
          </div>
          <div className="mt-4">
            <span className="text-2xl lg:text-3xl font-bold text-[#1C1F23] tracking-tight">
              {presentWorkersToday}
            </span>
            <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">
              Effectifs du jour
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Pointages enregistrés</span>
            <span className="font-semibold text-[#7BA238]">{presentWorkersToday} présents</span>
          </div>
        </div>

        {/* KPI 3: Réquisitions en attente */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.07)] transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 flex items-center gap-1">
              À valider
            </span>
          </div>
          <div className="mt-4">
            <span className="text-2xl lg:text-3xl font-bold text-[#1C1F23] tracking-tight">
              {pendingRequisitionsCount}
            </span>
            <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">
              Réquisitions en attente
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Demandes DRI chantiers</span>
            <span className="font-semibold text-amber-700">{pendingRequisitionsCount} en attente</span>
          </div>
        </div>

        {/* KPI 4: Matériel & Engins actifs */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.07)] transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-sky-500/10 text-sky-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 flex items-center gap-1">
              Disponibles
            </span>
          </div>
          <div className="mt-4">
            <span className="text-2xl lg:text-3xl font-bold text-[#1C1F23] tracking-tight">
              {availableVehiclesCount}
            </span>
            <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">
              Engins & Flotte
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Parc matériel</span>
            <span className="font-semibold text-sky-700">{availableVehiclesCount} / {fleetVehicles?.length || 0} disponibles</span>
          </div>
        </div>
      </div>

      {/* Financial Performance Curve Chart (Slide 04) */}
      <FinancialPerformanceChart />

      {/* Main Content Grid: Projects & Quick Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Chantiers */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#1C1F23] tracking-tight flex items-center gap-2">
                <HardHat className="w-4 h-4 text-[#8E2424]" />
                <span>Chantiers & Projets en Exécution</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Suivi d&apos;avancement, budgets multi-devises et conducteurs de travaux assignés.
              </p>
            </div>
            <Link
              href="/projects"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200/60"
            >
              Consulter
            </Link>
          </div>

          {!projects || projects.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                <HardHat className="w-6 h-6 text-slate-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#1C1F23]">Aucun chantier actif en cours</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Initialisez votre premier chantier pour planifier les travaux, affecter un conducteur et suivre les budgets.
                </p>
              </div>
              <div className="pt-1">
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-semibold transition shadow-sm"
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
                  className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-[#8E2424] bg-[#8E2424]/10 px-2.5 py-0.5 rounded-lg tracking-wider">
                        {prj.code}
                      </span>
                      <StatusBadge status={prj.status} type="project" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1C1F23]">
                      {prj.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Client : <span className="text-slate-700 font-medium">{prj.client_name}</span> • Localisation : <span className="text-slate-700 font-medium">{prj.location}</span>
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <span className="text-[11px] text-slate-400 font-medium">Budget engagé</span>
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
              <h2 className="text-base font-bold text-[#1C1F23] tracking-tight flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#8E2424]" />
                <span>Journaux de Chantier</span>
              </h2>
              <Link
                href="/field-reports"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200/60"
              >
                Consulter
              </Link>
            </div>

            {!siteReports || siteReports.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-2.5 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-[#1C1F23]">Aucun journal rédigé</p>
                  <p className="text-[11px] text-slate-500">
                    Les rapports d&apos;activités quotidiens apparaîtront ici.
                  </p>
                </div>
                <div className="pt-1">
                  <Link
                    href="/field-reports/new"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200/80 transition"
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
                    className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2.5 border-l-4 border-l-[#8E2424] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.07)] transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(rep.report_date)}
                      </span>
                      <StatusBadge status={rep.status} type="report" />
                    </div>
                    <p className="text-xs font-medium text-slate-600 line-clamp-2">
                      {rep.activities_summary}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                      <span>Météo : {rep.weather || "Standard"}</span>
                      <span>Effectif : {rep.workforce_count} ouvriers</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cashbox & Treasury Summary (Supabase Realtime Connected) */}
          {hasRoleAccess(userRole, ["admin", "company_management", "accountant", "site_manager"]) && (
            <TreasuryRealtimeWidget
              initialUSDSpent={totalUSDSpent}
              initialCDFSpent={totalCDFSpent}
              initialUSDIncome={totalUSDIncome}
              initialCDFIncome={totalCDFIncome}
            />
          )}
        </div>
      </div>
    </div>
  );
}
