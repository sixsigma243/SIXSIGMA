import React from "react";
import { createClient } from "@/lib/supabase/server";
import { ROLES_CONFIG, hasRoleAccess } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ShieldAlert,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserCheck,
  Clock,
  Database,
  History,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuditLog, PayrollPeriod, Profile } from "@/types/database";

// Server action to toggle payroll period lock
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

  await supabase
    .from("payroll_periods")
    .update({
      is_locked: !currentLockState,
      locked_by: !currentLockState ? user.id : null,
      locked_at: !currentLockState ? new Date().toISOString() : null,
    })
    .eq("id", periodId);

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
      .limit(50),
    supabase
      .from("payroll_periods")
      .select("*, locker:locked_by(*)")
      .order("start_date", { ascending: false }),
    supabase.from("profiles").select("*"),
  ]);

  const activeUsersCount = allProfiles?.filter((p) => p.is_active !== false).length || 0;
  const totalAuditEvents = auditLogs?.length || 0;
  const lockedPeriodsCount = payrollPeriods?.filter((p) => p.is_locked).length || 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1E1B4B] via-[#1E293B] to-[#0F172A] border border-purple-800/40 p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-950/80 text-purple-300 border border-purple-700/60 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                GOUVERNANCE & PISTE D&apos;AUDIT
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-400 italic">« La constance dans la qualité »</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Traçabilité Intégrale & Séparation des Pouvoirs (SoD)
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Registre inaltérable des transactions sensibles, verrous de clôture de paie et surveillance en temps réel des règles de conformité PostgreSQL.
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-900/30 border border-purple-700/50 text-purple-200 text-xs font-semibold">
            <Scale className="w-4 h-4 text-purple-400" />
            <span>Mode Super-Audit Actif</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#14171D] border border-[#252932] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Événements Tracés</span>
            <History className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{totalAuditEvents}</div>
          <div className="text-[11px] text-slate-500 mt-1">Modifications sensibles capturées</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#14171D] border border-[#252932] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Périodes de Paie Clôturées</span>
            <Lock className="w-4 h-4 text-[#8E2424]" />
          </div>
          <div className="text-2xl font-black text-[#E58585] mt-2">{lockedPeriodsCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Verrouillage anti-modification rétroactif</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#14171D] border border-[#252932] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Collaborateurs Actifs</span>
            <UserCheck className="w-4 h-4 text-[#7BA238]" />
          </div>
          <div className="text-2xl font-black text-[#7BA238] mt-2">{activeUsersCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Sur 14 rôles opérationnels</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#14171D] border border-[#252932] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Triggers SoD Actifs</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 mt-2">6 Verrous</div>
          <div className="text-[11px] text-slate-500 mt-1">Inviolabilité base de données</div>
        </div>
      </div>

      {/* Section 1: Périodes de Paie (Payroll Lock) */}
      <div className="bg-[#14171D] border border-[#252932] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#8E2424]" />
            <h2 className="text-lg font-bold text-white">
              Gestion des Périodes de Paie & Verrous Rétroactifs
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Interdiction stricte de modifier le pointage sur les périodes clôturées
          </span>
        </div>

        <div className="overflow-x-auto">
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
                    <td className="py-3.5 px-4 font-bold text-white">{period.period_name}</td>
                    <td className="py-3.5 px-4 font-mono text-xs">{formatDate(period.start_date)}</td>
                    <td className="py-3.5 px-4 font-mono text-xs">{formatDate(period.end_date)}</td>
                    <td className="py-3.5 px-4">
                      {period.is_locked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#8E2424]/20 text-[#E58585] border border-[#8E2424]/50">
                          <Lock className="w-3 h-3" /> Verrouillée
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#7BA238]/20 text-[#A5CE5B] border border-[#7BA238]/50">
                          <Unlock className="w-3 h-3" /> Ouverte
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {period.is_locked ? (
                        <div>
                          <div className="font-semibold text-slate-200">
                            {period.locker?.full_name || "Direction SI / Admin"}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {period.locked_at ? new Date(period.locked_at).toLocaleString("fr-FR") : "-"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <form action={togglePayrollPeriodLock}>
                        <input type="hidden" name="periodId" value={period.id} />
                        <input
                          type="hidden"
                          name="currentLockState"
                          value={period.is_locked ? "true" : "false"}
                        />
                        <button
                          type="submit"
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            period.is_locked
                              ? "bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-700"
                              : "bg-[#8E2424] hover:bg-[#751D1D] text-white border border-[#8E2424]"
                          }`}
                        >
                          {period.is_locked ? (
                            <>
                              <Unlock className="w-3.5 h-3.5" /> Déverrouiller (Admin)
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" /> Clôturer la Période
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
                    Aucune période de paie configurée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Journaux d'Audit Système (Piste Inaltérable) */}
      <div className="bg-[#14171D] border border-[#252932] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">
              Piste d&apos;Audit Système (Dernières Activités Sensibles)
            </h2>
          </div>
          <span className="text-xs text-purple-300 font-mono">
            Table: public.audit_logs (Lecture Restreinte Admin / DG)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-[#0E1116] text-xs uppercase text-slate-400 border-b border-[#252932]">
              <tr>
                <th className="py-3 px-4">Date & Heure</th>
                <th className="py-3 px-4">Table / Module</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Opérateur</th>
                <th className="py-3 px-4">Détails JSONB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252932]">
              {auditLogs && auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#1C1F23]/40 transition">
                    <td className="py-3 px-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.performed_at).toLocaleString("fr-FR")}
                    </td>
                    <td className="py-3 px-4 font-semibold text-purple-300 font-mono text-xs">
                      {log.table_name}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${
                          log.action.includes("INSERT") || log.action.includes("INIT")
                            ? "bg-[#7BA238]/20 text-[#A5CE5B] border border-[#7BA238]/50"
                            : log.action.includes("UPDATE") || log.action.includes("OVERRIDE")
                            ? "bg-amber-950 text-amber-300 border border-amber-800"
                            : "bg-[#8E2424]/20 text-[#E58585] border border-[#8E2424]/50"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {log.performer ? (
                        <div>
                          <span className="font-semibold text-white">{log.performer.full_name}</span>
                          <span className="text-[10px] text-slate-500 block">
                            {log.performer.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Système / SQL Direct</span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-[11px] font-mono text-slate-400">
                      <details className="cursor-pointer">
                        <summary className="text-purple-400 hover:underline">
                          Voir payload ({Object.keys(log.new_data || log.old_data || {}).length} champs)
                        </summary>
                        <pre className="p-3 mt-2 rounded-lg bg-slate-950 text-[10px] text-slate-300 overflow-x-auto border border-slate-800 max-h-40">
                          {JSON.stringify(
                            {
                              record_id: log.record_id,
                              old: log.old_data,
                              new: log.new_data,
                            },
                            null,
                            2
                          )}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-500">
                    Aucun log d&apos;audit enregistré pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Statut des Verrous SoD & Règles de Conformité */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">
            Matrice des Contrôles de Gestion & Inviolabilité PostgreSQL (SoD)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">1. SoD Caisse & Trésorerie</span>
              <span className="px-2 py-0.5 text-[10px] font-black rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                ACTIF
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              L&apos;administrateur système a interdiction formelle de valider des dépenses. Plafond de 5 000 USD réservé à la Direction Générale.
            </p>
            <div className="mt-2 text-[10px] font-mono text-purple-300">
              Trigger : trg_enforce_sod_cashbox
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">2. Clôture Journal Chantier</span>
              <span className="px-2 py-0.5 text-[10px] font-black rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                ACTIF
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Verrouillage strict à 19h00 (Heure RDC / UTC+2). Tout journal du jour soumis après 19h00 est automatiquement rejeté.
            </p>
            <div className="mt-2 text-[10px] font-mono text-purple-300">
              Trigger : trg_enforce_daily_report_cutoff
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">3. Conformité RH & Pointage</span>
              <span className="px-2 py-0.5 text-[10px] font-black rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                ACTIF
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Rejet automatique de tout pointage pour un travailleur dont le contrat de travail ou la pièce d&apos;identité est expiré(e).
            </p>
            <div className="mt-2 text-[10px] font-mono text-purple-300">
              Trigger : trg_validate_worker_compliance_on_time_entry
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">4. Dispatch & Permis Chauffeur</span>
              <span className="px-2 py-0.5 text-[10px] font-black rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                ACTIF
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Blocage immédiat de tout ordre de mission si le véhicule est en atelier ou si le permis de conduire du chauffeur est expiré.
            </p>
            <div className="mt-2 text-[10px] font-mono text-purple-300">
              Trigger : trg_validate_dispatch_vehicle
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">5. Zéro Stock Négatif</span>
              <span className="px-2 py-0.5 text-[10px] font-black rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                ACTIF
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Rejet strict de toute sortie de stock excédant la quantité disponible et obligation de rattachement à un chantier précis.
            </p>
            <div className="mt-2 text-[10px] font-mono text-purple-300">
              Trigger : trg_validate_stock_out
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">6. Verrou Période de Paie</span>
              <span className="px-2 py-0.5 text-[10px] font-black rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                ACTIF
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Interdiction de modification des pointages sur les périodes clôturées. Seul l&apos;administrateur peut déroger avec traçabilité intégrale.
            </p>
            <div className="mt-2 text-[10px] font-mono text-purple-300">
              Trigger : trg_enforce_payroll_period_lock
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
