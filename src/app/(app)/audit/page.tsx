import React from "react";
import { createClient } from "@/lib/supabase/server";
import { ROLES_CONFIG, hasRoleAccess } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import {
  ShieldAlert,
  Lock,
  Unlock,
  UserCheck,
  History,
  Scale,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuditLog, PayrollPeriod, Profile } from "@/types/database";
import { AuditLogsClientView } from "./AuditLogsClientView";

// Server action to toggle a specific payroll period lock
async function togglePayrollPeriodLock(formData: FormData) {
  "use server";
  const periodId = formData.get("periodId") as string;
  const currentLockState = formData.get("currentLockState") === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "hr_officer", "company_management"].includes(profile.role)) {
    throw new Error("Action non autorisée. Réservé à la Direction et aux RH.");
  }

  const nextLockState = !currentLockState;

  await supabase
    .from("payroll_periods")
    .update({
      is_locked: nextLockState,
      locked_by: nextLockState ? user.id : null,
      locked_at: nextLockState ? new Date().toISOString() : null,
    })
    .eq("id", periodId);

  // Trace in audit logs
  await supabase.from("audit_logs").insert({
    table_name: "payroll_periods",
    record_id: periodId,
    action: nextLockState ? "LOCK_PAYROLL_PERIOD" : "UNLOCK_PAYROLL_PERIOD",
    old_data: { is_locked: currentLockState },
    new_data: { is_locked: nextLockState },
    performed_by: user.id,
  });

  revalidatePath("/audit");
}

// Server action to toggle current month lock (creates period if not existing)
async function toggleCurrentMonthLock() {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "hr_officer", "company_management"].includes(profile.role)) {
    throw new Error("Action non autorisée. Réservé à la Direction et aux RH.");
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthNamesFr = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  const periodName = `${monthNamesFr[currentMonth]} ${currentYear}`;
  const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
  const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Find if current period exists
  const { data: existingPeriods } = await supabase
    .from("payroll_periods")
    .select("*")
    .order("created_at", { ascending: false });

  const existing = existingPeriods?.find(
    (p) =>
      p.period_name.toLowerCase() === periodName.toLowerCase() ||
      (p.start_date <= startDate && p.end_date >= endDate)
  );

  if (existing) {
    const nextLocked = !existing.is_locked;
    await supabase
      .from("payroll_periods")
      .update({
        is_locked: nextLocked,
        locked_by: nextLocked ? user.id : null,
        locked_at: nextLocked ? new Date().toISOString() : null,
      })
      .eq("id", existing.id);

    await supabase.from("audit_logs").insert({
      table_name: "payroll_periods",
      record_id: existing.id,
      action: nextLocked ? "LOCK_PAYROLL_PERIOD" : "UNLOCK_PAYROLL_PERIOD",
      old_data: { is_locked: existing.is_locked },
      new_data: { is_locked: nextLocked, period_name: existing.period_name },
      performed_by: user.id,
    });
  } else {
    const { data: inserted } = await supabase
      .from("payroll_periods")
      .insert({
        period_name: periodName,
        start_date: startDate,
        end_date: endDate,
        is_locked: true,
        locked_by: user.id,
        locked_at: new Date().toISOString(),
      })
      .select()
      .single();

    await supabase.from("audit_logs").insert({
      table_name: "payroll_periods",
      record_id: inserted?.id || periodName,
      action: "INIT_AND_LOCK_PAYROLL_PERIOD",
      old_data: null,
      new_data: { is_locked: true, period_name: periodName, start_date: startDate, end_date: endDate },
      performed_by: user.id,
    });
  }

  revalidatePath("/audit");
}

export default async function AuditGovernancePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Security check: Only admin and company_management can view audit logs
  if (!profile || !["admin", "company_management"].includes(profile.role)) {
    redirect("/dashboard");
  }

  // Parallel data fetching
  const [
    { data: auditLogs },
    { data: payrollPeriods },
    { data: allProfiles },
  ] = await Promise.all([
    supabase
      .from("audit_logs")
      .select("*, performer:performed_by(*)")
      .order("performed_at", { ascending: false })
      .limit(200),
    supabase
      .from("payroll_periods")
      .select("*, locker:locked_by(*)")
      .order("start_date", { ascending: false }),
    supabase.from("profiles").select("*"),
  ]);

  const activeUsersCount = allProfiles?.filter((p) => p.is_active !== false).length || 0;
  const totalAuditEvents = auditLogs?.length || 0;
  const lockedPeriodsCount = payrollPeriods?.filter((p) => p.is_locked).length || 0;

  // Compute current month metadata
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthNamesFr = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  const currentMonthName = `${monthNamesFr[currentMonth]} ${currentYear}`;
  const currentMonthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
  const currentMonthEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const currentMonthPeriod = payrollPeriods?.find(
    (p) =>
      p.period_name.toLowerCase() === currentMonthName.toLowerCase() ||
      (p.start_date <= currentMonthStart && p.end_date >= currentMonthEnd)
  );
  const isCurrentMonthLocked = !!currentMonthPeriod?.is_locked;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-xl bg-[#14171D] border border-[#252932] p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Gouvernance & Piste d&apos;Audit
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Registre des transactions sensibles, verrous de clôture de paie et contrôles d&apos;intégrité (SoD).
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-[#14171D] border border-[#252932] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Événements Tracés
            </span>
            <History className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{totalAuditEvents}</div>
          <div className="text-[11px] text-slate-500 mt-1">Transactions consignées</div>
        </div>

        <div className="p-5 rounded-xl bg-[#14171D] border border-[#252932] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Périodes Clôturées
            </span>
            <Lock className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{lockedPeriodsCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Verrouillage rétroactif</div>
        </div>

        <div className="p-5 rounded-xl bg-[#14171D] border border-[#252932] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Collaborateurs Actifs
            </span>
            <UserCheck className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{activeUsersCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Sur 14 rôles opérationnels</div>
        </div>

        <div className="p-5 rounded-xl bg-[#14171D] border border-[#252932] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Contrôles SoD
            </span>
            <ShieldCheck className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">6 Verrous</div>
          <div className="text-[11px] text-slate-500 mt-1">Règles PostgreSQL actives</div>
        </div>
      </div>

      {/* Section 1: Panneau de Gestion des Périodes de Paie (Payroll Lock) */}
      <div className="bg-[#14171D] border border-[#252932] rounded-xl p-5 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#252932] pb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Gestion des Périodes de Paie & Verrous Rétroactifs
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Interdiction de modifier le pointage sur les périodes clôturées
          </span>
        </div>

        {/* Current Month Active Panel */}
        <div className="p-4 rounded-xl bg-[#0E1116] border border-[#252932] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Mois en cours :
              </span>
              <span className="text-sm font-bold text-white">{currentMonthName}</span>
              <span className="text-xs text-slate-500 font-mono">
                ({formatDate(currentMonthStart)} au {formatDate(currentMonthEnd)})
              </span>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-xs text-slate-400">Statut :</span>
              {isCurrentMonthLocked ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#8E2424]/20 text-[#E58585] border border-[#8E2424]/50">
                  <Lock className="w-3 h-3" /> Période Verrouillée (Pointages Faisant Foi)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#7BA238]/20 text-[#A5CE5B] border border-[#7BA238]/50">
                  <Unlock className="w-3 h-3" /> Période Ouverte (Pointages Autorisés)
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl pt-0.5">
              {isCurrentMonthLocked
                ? `La période de ${currentMonthName} est verrouillée. Le trigger PostgreSQL bloque immédiatement toute insertion ou correction de pointage.`
                : `La période de ${currentMonthName} est active. Verrouillez-la en fin de mois pour figer définitivement les calculs de paie.`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <form action={toggleCurrentMonthLock}>
              <button
                type="submit"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  isCurrentMonthLocked
                    ? "bg-[#1C1F23] hover:bg-[#252932] text-slate-200 border border-[#252932]"
                    : "bg-[#8E2424] hover:bg-[#751D1D] text-white border border-[#8E2424]"
                }`}
              >
                {isCurrentMonthLocked ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Déverrouiller le Mois en Cours</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Verrouiller le Mois en Cours</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Historical Payroll Periods Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
            Historique des Périodes & Archives de Paie
          </h3>

          <div className="overflow-x-auto rounded-xl border border-[#252932]">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#0E1116] text-xs uppercase text-slate-400 border-b border-[#252932]">
                <tr>
                  <th className="py-3 px-4">Période</th>
                  <th className="py-3 px-4">Date Début</th>
                  <th className="py-3 px-4">Date Fin</th>
                  <th className="py-3 px-4">État du Verrou</th>
                  <th className="py-3 px-4">Verrouillé Par / Le</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252932]">
                {payrollPeriods && payrollPeriods.length > 0 ? (
                  payrollPeriods.map((period) => (
                    <tr key={period.id} className="hover:bg-[#1C1F23]/50 transition">
                      <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                        {period.period_name}
                        {period.period_name.toLowerCase() === currentMonthName.toLowerCase() && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#1C1F23] text-slate-300 border border-[#252932]">
                            En cours
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">{formatDate(period.start_date)}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">{formatDate(period.end_date)}</td>
                      <td className="py-3 px-4">
                        {period.is_locked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#8E2424]/20 text-[#E58585] border border-[#8E2424]/50">
                            <Lock className="w-3 h-3" /> Verrouillée
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#7BA238]/20 text-[#A5CE5B] border border-[#7BA238]/50">
                            <Unlock className="w-3 h-3" /> Ouverte
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">
                        {period.is_locked ? (
                          <div>
                            <div className="font-medium text-slate-300">
                              {period.locker?.full_name || "Direction SI / Admin"}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {period.locked_at ? new Date(period.locked_at).toLocaleString("fr-FR") : "-"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <form action={togglePayrollPeriodLock}>
                          <input type="hidden" name="periodId" value={period.id} />
                          <input
                            type="hidden"
                            name="currentLockState"
                            value={period.is_locked ? "true" : "false"}
                          />
                          <button
                            type="submit"
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition ${
                              period.is_locked
                                ? "bg-[#1C1F23] hover:bg-[#252932] text-slate-300 border border-[#252932]"
                                : "bg-[#8E2424] hover:bg-[#751D1D] text-white border border-[#8E2424]"
                            }`}
                          >
                            {period.is_locked ? (
                              <>
                                <Unlock className="w-3 h-3" /> Déverrouiller
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3" /> Clôturer
                              </>
                            )}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-500">
                      Aucune période de paie archivée. Utilisez le bouton ci-dessus pour initialiser le mois en cours.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 2: Journaux d'Audit Système (Piste Inaltérable avec Filtres) */}
      <div className="bg-[#14171D] border border-[#252932] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#252932] pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Piste d&apos;Audit Système (Transactions & Modifications Traçables)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Table : public.audit_logs
          </span>
        </div>

        {/* Client Component with Search and Filtering */}
        <AuditLogsClientView logs={auditLogs || []} />
      </div>

      {/* Section 3: Règles d'Intégrité & Contrôles Système (SoD) */}
      <div className="bg-[#14171D] border border-[#252932] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-[#252932] pb-3">
          <Scale className="w-4 h-4 text-slate-400" />
          <h2 className="text-base font-bold text-white tracking-tight">
            Règles d&apos;Intégrité & Contrôles Système (SoD)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#0E1116] border border-[#252932] space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7BA238] inline-block flex-shrink-0"></span>
              <span className="text-xs font-semibold text-white">1. SoD Caisse & Trésorerie</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              L&apos;administrateur système a interdiction formelle de valider des dépenses. Plafond de 5 000 USD réservé à la Direction Générale.
            </p>
            <div className="pt-1 font-mono text-xs text-slate-500 border-t border-[#252932]">
              Trigger : trg_enforce_sod_cashbox
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0E1116] border border-[#252932] space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7BA238] inline-block flex-shrink-0"></span>
              <span className="text-xs font-semibold text-white">2. Clôture Journal Chantier</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verrouillage strict à 19h00 (Heure RDC / UTC+2). Tout journal du jour soumis après 19h00 est automatiquement rejeté.
            </p>
            <div className="pt-1 font-mono text-xs text-slate-500 border-t border-[#252932]">
              Trigger : trg_enforce_daily_report_cutoff
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0E1116] border border-[#252932] space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7BA238] inline-block flex-shrink-0"></span>
              <span className="text-xs font-semibold text-white">3. Conformité RH & Pointage</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Rejet automatique de tout pointage pour un travailleur dont le contrat de travail ou la pièce d&apos;identité est expiré(e).
            </p>
            <div className="pt-1 font-mono text-xs text-slate-500 border-t border-[#252932]">
              Trigger : trg_validate_worker_compliance_on_time_entry
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0E1116] border border-[#252932] space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7BA238] inline-block flex-shrink-0"></span>
              <span className="text-xs font-semibold text-white">4. Dispatch & Permis Chauffeur</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Blocage immédiat de tout ordre de mission si le véhicule est en atelier ou si le permis de conduire du chauffeur est expiré.
            </p>
            <div className="pt-1 font-mono text-xs text-slate-500 border-t border-[#252932]">
              Trigger : trg_validate_dispatch_vehicle
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0E1116] border border-[#252932] space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7BA238] inline-block flex-shrink-0"></span>
              <span className="text-xs font-semibold text-white">5. Zéro Stock Négatif</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Rejet strict de toute sortie de stock excédant la quantité disponible et obligation de rattachement à un chantier précis.
            </p>
            <div className="pt-1 font-mono text-xs text-slate-500 border-t border-[#252932]">
              Trigger : trg_validate_stock_out
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0E1116] border border-[#252932] space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7BA238] inline-block flex-shrink-0"></span>
              <span className="text-xs font-semibold text-white">6. Verrou Période de Paie</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Interdiction de modification des pointages sur les périodes clôturées. Seul l&apos;administrateur peut déroger avec traçabilité intégrale.
            </p>
            <div className="pt-1 font-mono text-xs text-slate-500 border-t border-[#252932]">
              Trigger : trg_enforce_payroll_period_lock
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
