"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  TimeEntry,
  Project,
  PresenceStatus,
  AttendanceReconciliation,
  Profile,
} from "@/types/database";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import {
  Users,
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  UserCheck,
  UserX,
  X,
  Scale,
  ShieldCheck,
  Check,
  AlertTriangle,
  Trash2,
  ClipboardCheck,
  Coins,
  Inbox,
  Briefcase,
} from "lucide-react";
import { PayrollSection } from "./components/PayrollSection";
import { HrRequestsSection } from "./components/HrRequestsSection";
import { WorkersDirectorySection } from "./components/WorkersDirectorySection";

export default function AttendancePage() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<
    "daily" | "reconciliation" | "payroll" | "hr_requests" | "workers"
  >("daily");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [reconciliations, setReconciliations] = useState<AttendanceReconciliation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [arbitratingId, setArbitratingId] = useState<string | null>(null);

  // New Entry Modal
  const [showModal, setShowModal] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newFunction, setNewFunction] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [newStatus, setNewStatus] = useState<PresenceStatus>("present");
  const [newCheckIn, setNewCheckIn] = useState("07:30");
  const [newCheckOut, setNewCheckOut] = useState("16:00");
  const [newOvertime, setNewOvertime] = useState("0");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Quick Attendance Sheet Modal (Timekeeper / Supervisor)
  const [showQuickSheet, setShowQuickSheet] = useState(false);
  const [quickProjectId, setQuickProjectId] = useState("");
  const [quickDate, setQuickDate] = useState(dateFilter);
  const [quickWorkers, setQuickWorkers] = useState<
    Array<{
      worker_name: string;
      worker_function: string;
      status: PresenceStatus;
      check_in: string;
      check_out: string;
      overtime_hours: number;
    }>
  >([
    { worker_name: "", worker_function: "Coffreur", status: "present", check_in: "07:30", check_out: "16:00", overtime_hours: 0 },
    { worker_name: "", worker_function: "Ferrailleur", status: "present", check_in: "07:30", check_out: "16:00", overtime_hours: 0 },
    { worker_name: "", worker_function: "Maçon", status: "present", check_in: "07:30", check_out: "16:00", overtime_hours: 0 },
    { worker_name: "", worker_function: "Manœuvre", status: "present", check_in: "07:30", check_out: "16:00", overtime_hours: 0 },
    { worker_name: "", worker_function: "Électricien", status: "present", check_in: "07:30", check_out: "16:00", overtime_hours: 0 },
  ]);
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  const fetchAttendance = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.user.id)
        .single();
      if (p) setCurrentUser(p as Profile);
    }

    const { data: entData } = await supabase
      .from("time_entries")
      .select("*, project:project_id(*), profile:profile_id(*)")
      .eq("entry_date", dateFilter)
      .order("worker_name");

    if (entData) setEntries(entData as TimeEntry[]);

    const { data: recData } = await supabase
      .from("attendance_reconciliations")
      .select("*, project:project_id(*), supervisor:supervisor_id(*)")
      .order("created_at", { ascending: false });

    if (recData) setReconciliations(recData as AttendanceReconciliation[]);

    const { data: prjData } = await supabase.from("projects").select("*").order("title");
    if (prjData) {
      setProjects(prjData as Project[]);
      if (prjData.length > 0 && !newProjectId) setNewProjectId(prjData[0].id);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAttendance();
  }, [dateFilter]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("time_entries").insert({
      worker_name: newWorkerName.trim(),
      worker_function: newFunction.trim() || "Ouvrier",
      project_id: newProjectId || null,
      entry_date: dateFilter,
      status: newStatus,
      check_in: newStatus !== "absent" ? newCheckIn : null,
      check_out: newStatus !== "absent" ? newCheckOut : null,
      overtime_hours: parseFloat(newOvertime) || 0,
      notes: newNotes.trim() || null,
      supervisor_id: currentUser?.id,
    });

    if (!error) {
      setShowModal(false);
      setNewWorkerName("");
      setNewFunction("");
      setNewNotes("");
      setNewOvertime("0");
      fetchAttendance();
    } else {
      alert("Erreur d'enregistrement : " + error.message);
    }
    setSaving(false);
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = quickWorkers.filter((w) => w.worker_name.trim().length > 0);
    if (validRows.length === 0) {
      alert("Veuillez renseigner au moins un ouvrier.");
      return;
    }
    setQuickSubmitting(true);

    const pId = quickProjectId || newProjectId || (projects.length > 0 ? projects[0].id : null);
    const recordsToInsert = validRows.map((w) => ({
      worker_name: w.worker_name.trim(),
      worker_function: w.worker_function.trim() || "Ouvrier",
      project_id: pId,
      entry_date: quickDate,
      status: w.status,
      check_in: w.status !== "absent" ? w.check_in || "07:30" : null,
      check_out: w.status !== "absent" ? w.check_out || "16:00" : null,
      overtime_hours: Number(w.overtime_hours) || 0,
    }));

    const { error } = await supabase.from("time_entries").insert(recordsToInsert);

    if (!error) {
      setShowQuickSheet(false);
      setDateFilter(quickDate);
      fetchAttendance();
    } else {
      alert("Erreur lors de la soumission de la feuille : " + error.message);
    }
    setQuickSubmitting(false);
  };

  const handleArbitrate = async (recId: string, decision: PresenceStatus) => {
    if (!currentUser) return;
    setArbitratingId(recId);

    const rec = reconciliations.find((r) => r.id === recId);

    const { error } = await supabase
      .from("attendance_reconciliations")
      .update({
        arbitrated_status: decision,
        supervisor_id: currentUser.id,
        arbitrated_at: new Date().toISOString(),
        status: "resolved",
      })
      .eq("id", recId);

    if (!error) {
      if (rec) {
        const targetDate = rec.reconciliation_date || dateFilter;
        const { data: existing } = await supabase
          .from("time_entries")
          .select("id")
          .eq("worker_name", rec.worker_name)
          .eq("entry_date", targetDate)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("time_entries")
            .update({ status: decision })
            .eq("id", existing.id);
        }
      }
      fetchAttendance();
    } else {
      alert("Erreur d'arbitrage : " + error.message);
    }
    setArbitratingId(null);
  };

  const handleDeleteEntry = async (entryId: string, workerName: string) => {
    if (!window.confirm(`Confirmez-vous la suppression du pointage de "${workerName}" ?`)) {
      return;
    }
    const { error } = await supabase.from("time_entries").delete().eq("id", entryId);
    if (!error) {
      fetchAttendance();
    } else {
      alert("Erreur lors de la suppression : " + error.message);
    }
  };

  // Metrics
  const totalEntries = entries.length;
  const presentCount = entries.filter((e) => e.status === "present" || e.status === "late").length;
  const lateCount = entries.filter((e) => e.status === "late").length;
  const absentCount = entries.filter((e) => e.status === "absent").length;
  const totalOvertime = entries.reduce((acc, e) => acc + Number(e.overtime_hours || 0), 0);
  const attendanceRate = totalEntries > 0 ? Math.round((presentCount / totalEntries) * 100) : 100;
  const pendingReconciliationsCount = reconciliations.filter((r) => r.status === "pending").length;

  const isSupervisorOrManager =
    currentUser && ["admin", "site_manager", "supervisor"].includes(currentUser.role);
  const canQuickSubmit =
    currentUser &&
    ["admin", "hr_officer", "supervisor", "team_leader", "site_manager"].includes(
      currentUser.role
    );
  const canArbitrate =
    currentUser &&
    ["admin", "site_manager", "supervisor", "company_management"].includes(
      currentUser.role
    );

  const canAccessPayroll =
    currentUser &&
    ["admin", "company_management", "hr_officer", "accountant"].includes(
      currentUser.role
    );

  const canAccessWorkersDirectory =
    currentUser &&
    ["admin", "company_management", "hr_officer"].includes(currentUser.role);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#1C1F23] tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#7BA238]" />
            <span>Pointage & Ressources Humaines</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pointage terrain, arbitrage des écarts, boîte de réception RH, registre des effectifs et calcul de paie (SoD).
          </p>
        </div>

        {(activeTab === "daily" || activeTab === "reconciliation") && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold shadow-xs focus:outline-none focus:border-[#8E2424]"
              />
            </div>

            {canQuickSubmit && (
              <button
                onClick={() => {
                  setQuickDate(dateFilter);
                  if (projects.length > 0 && !quickProjectId) setQuickProjectId(projects[0].id);
                  setShowQuickSheet(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#7BA238] hover:bg-[#6A8D2F] text-white text-xs font-semibold shadow-sm transition flex items-center gap-2 active:scale-95"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Soumission Rapide Feuille de Présence</span>
              </button>
            )}

            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-semibold shadow-sm transition flex items-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Pointage</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("daily")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "daily"
              ? "bg-[#8E2424]/10 text-[#8E2424] border border-[#8E2424]/30"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Pointage Journalier</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
            {entries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("reconciliation")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "reconciliation"
              ? "bg-amber-50 text-amber-800 border border-amber-300"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Scale className="w-4 h-4 text-amber-600" />
          <span>Arbitrage des Écarts</span>
          {pendingReconciliationsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold animate-pulse">
              {pendingReconciliationsCount} à arbitrer
            </span>
          )}
        </button>

        {/* Tab 3: Boîte de Réception RH & Signalements */}
        <button
          onClick={() => setActiveTab("hr_requests")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "hr_requests"
              ? "bg-[#8E2424] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Requêtes RH & Signalements</span>
        </button>

        {/* Tab 4: Base Salariés & Registre RH */}
        {canAccessWorkersDirectory && (
          <button
            onClick={() => setActiveTab("workers")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "workers"
                ? "bg-[#7BA238] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Base Salariés (Dossiers RH)</span>
          </button>
        )}

        {/* Tab 5: Calcul Paie & Transmission Caisse (SoD) */}
        {canAccessPayroll && (
          <button
            onClick={() => setActiveTab("payroll")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "payroll"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Paie & Caisse (SoD)</span>
          </button>
        )}
      </div>

      {activeTab === "daily" ? (
        <>
          {/* Stats Summary Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.07)] transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Présents Aujourd&apos;hui</span>
                <div className="w-8 h-8 rounded-full bg-[#7BA238]/10 flex items-center justify-center text-[#7BA238]">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl lg:text-3xl font-bold text-[#1C1F23] tracking-tight">
                {presentCount} <span className="text-xs text-slate-400 font-normal">/ {totalEntries} inscrits</span>
              </div>
              <div className="mt-2 text-xs text-[#7BA238] font-semibold pt-2 border-t border-slate-100">
                Taux de présence : {attendanceRate}%
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.07)] transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Retards Relevés</span>
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl lg:text-3xl font-bold text-amber-600 tracking-tight">
                {lateCount}
              </div>
              <div className="mt-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                Tolérance 15 min max
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.07)] transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Absences Injustifiées</span>
                <div className="w-8 h-8 rounded-full bg-[#8E2424]/10 flex items-center justify-center text-[#8E2424]">
                  <UserX className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl lg:text-3xl font-bold text-[#8E2424] tracking-tight">
                {absentCount}
              </div>
              <div className="mt-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                Impact sur paie journalière
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.07)] transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Heures Supplémentaires</span>
                <div className="w-8 h-8 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl lg:text-3xl font-bold text-sky-700 tracking-tight">
                {totalOvertime} h
              </div>
              <div className="mt-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                Cumul journée de travail
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1C1F23] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Feuille de Pointage - {formatDate(dateFilter)}</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">{entries.length} ouvriers pointés</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Chargement des pointages...
              </div>
            ) : entries.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Aucun pointage enregistré pour cette date. Cliquez sur &ldquo;Nouveau Pointage&rdquo; pour démarrer la saisie.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Ouvrier / Agent</th>
                      <th className="py-3 px-4">Spécialité & Chantier</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4">Arrivée - Départ</th>
                      <th className="py-3 px-4">Heures Sup</th>
                      <th className="py-3 px-4">Remarques</th>
                      {isSupervisorOrManager && <th className="py-3 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-1.5 font-bold text-[#1C1F23]">
                            <span>{entry.worker_name}</span>
                            {entry.profile?.contract_end_date &&
                              new Date(entry.profile.contract_end_date).getTime() - Date.now() <=
                                15 * 86400000 && (
                                <span
                                  title={`Fin de contrat le ${entry.profile.contract_end_date}`}
                                  className="inline-flex items-center gap-1 text-[9px] font-bold text-[#8E2424] bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full"
                                >
                                  <AlertCircle className="w-2.5 h-2.5 text-[#8E2424]" /> Contrat
                                </span>
                              )}
                            {entry.profile?.id_expiry_date &&
                              new Date(entry.profile.id_expiry_date).getTime() - Date.now() <=
                                15 * 86400000 && (
                                <span
                                  title={`Pièce d'identité expire le ${entry.profile.id_expiry_date}`}
                                  className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full"
                                >
                                  <AlertCircle className="w-2.5 h-2.5 text-amber-600" /> ID
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-800 font-medium">{entry.worker_function || "Polyvalent"}</span>
                          <span className="block text-[11px] text-slate-500">
                            {entry.project?.code || "Chantier Général"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={entry.status} type="presence" />
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-mono">
                          {entry.check_in || "--:--"} - {entry.check_out || "--:--"}
                        </td>
                        <td className="py-3 px-4">
                          {Number(entry.overtime_hours) > 0 ? (
                            <span className="font-bold text-amber-600 font-mono">
                              +{entry.overtime_hours} h
                            </span>
                          ) : (
                            <span className="text-slate-400">0 h</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                          {entry.notes || "-"}
                        </td>
                        {isSupervisorOrManager && (
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteEntry(entry.id, entry.worker_name)}
                              title="Supprimer ce pointage"
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-[#8E2424] transition border border-rose-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : activeTab === "reconciliation" ? (
        /* RECONCILIATION TAB */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900 shadow-sm">
            <Scale className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-amber-950">Contrôle de Cohérence RH & Séparation des Pouvoirs : </strong>
              <span>
                Le Pointeur enregistre les entrées physiques au portail tandis que le Chef d&apos;Équipe (Team Leader) atteste de la présence effective sur le front de taille / coulage. Tout écart doit faire l&apos;objet d&apos;un arbitrage formel par le Superviseur avant clôture de paie.
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1C1F23] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Registre des Écarts de Présence Relevés</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {reconciliations.length} cas répertorié(s)
              </span>
            </div>

            {reconciliations.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Aucun écart de présence relevé. Le pointage physique et le pré-pointage d&apos;équipe sont 100% conformes !
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Ouvrier & Spécialité</th>
                      <th className="py-3 px-4">Chantier</th>
                      <th className="py-3 px-4">Déclaration Chef d&apos;Équipe</th>
                      <th className="py-3 px-4">Enregistrement Pointeur</th>
                      <th className="py-3 px-4">Motif Constaté</th>
                      <th className="py-3 px-4">Statut Décision</th>
                      <th className="py-3 px-4 text-right">Arbitrage Superviseur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {reconciliations.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#1C1F23] block">{rec.worker_name}</span>
                          <span className="text-[11px] text-slate-500">{rec.worker_function || "Ouvrier"}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {rec.project?.code || "Chantier"}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={rec.team_leader_status} type="presence" />
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={rec.pointer_status} type="presence" />
                        </td>
                        <td className="py-3 px-4 max-w-xs text-slate-600 leading-tight">
                          {rec.notes}
                        </td>
                        <td className="py-3 px-4">
                          {rec.status === "resolved" ? (
                            <div className="flex items-center gap-1.5 text-[#7BA238] font-semibold">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Tranché : <StatusBadge status={rec.arbitrated_status!} type="presence" /></span>
                            </div>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              En attente
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {rec.status === "pending" && canArbitrate ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleArbitrate(rec.id, "present")}
                                disabled={arbitratingId === rec.id}
                                className="px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#7BA238] border border-emerald-200 text-xs font-semibold transition"
                                title="Reconnaître l'ouvrier comme présent"
                              >
                                Présent
                              </button>
                              <button
                                onClick={() => handleArbitrate(rec.id, "late")}
                                disabled={arbitratingId === rec.id}
                                className="px-3 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-semibold transition"
                                title="Appliquer un statut retard"
                              >
                                Retard
                              </button>
                              <button
                                onClick={() => handleArbitrate(rec.id, "absent")}
                                disabled={arbitratingId === rec.id}
                                className="px-3 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#8E2424] border border-rose-200 text-xs font-semibold transition"
                                title="Statuer en absence injustifiée"
                              >
                                Absent
                              </button>
                            </div>
                          ) : rec.status === "resolved" ? (
                            <span className="text-[11px] text-slate-500 font-medium">
                              Arbitré par {rec.supervisor?.full_name || "Conducteur / Admin"}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Réservé Conducteur / Admin</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "payroll" ? (
        <PayrollSection currentUser={currentUser} />
      ) : activeTab === "hr_requests" ? (
        <HrRequestsSection currentUser={currentUser} />
      ) : (
        <WorkersDirectorySection currentUser={currentUser} />
      )}

      {/* New Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full p-6 shadow-2xl space-y-4 text-[#1C1F23] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#1C1F23] flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-600" />
                <span>Nouveau Pointage Journalier</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nom Complet de l&apos;Ouvrier *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Jean-Luc Kalala"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Fonction / Corps d&apos;état</label>
                  <input
                    type="text"
                    placeholder="ex: Ferrailleur, Grutier"
                    value={newFunction}
                    onChange={(e) => setNewFunction(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Chantier d&apos;Affectation</label>
                  <select
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Statut Présence</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as PresenceStatus)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  >
                    <option value="present">Présent</option>
                    <option value="late">En Retard</option>
                    <option value="absent">Absent</option>
                    <option value="leave">En Congé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Heures Supplémentaires</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={newOvertime}
                    onChange={(e) => setNewOvertime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Heure Arrivée</label>
                  <input
                    type="time"
                    value={newCheckIn}
                    onChange={(e) => setNewCheckIn(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Heure Départ</label>
                  <input
                    type="time"
                    value={newCheckOut}
                    onChange={(e) => setNewCheckOut(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Observations / Motif retard</label>
                <input
                  type="text"
                  placeholder="Notes facultatives..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-semibold transition disabled:opacity-50 shadow-sm"
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Attendance Sheet Modal */}
      {showQuickSheet && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto text-[#1C1F23] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#7BA238]/10 text-[#7BA238] flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1C1F23]">
                    Soumission Rapide de la Feuille de Présence Journalière
                  </h3>
                  <p className="text-xs text-slate-500">
                    Saisie directe de l&apos;équipe de chantier pour validation du pointage quotidien
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickSheet(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickSubmit} className="space-y-4 text-xs">
              {/* Project & Date Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Chantier Actif *
                  </label>
                  <select
                    value={quickProjectId}
                    onChange={(e) => setQuickProjectId(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-[#8E2424]"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Date de la Feuille *
                  </label>
                  <input
                    type="date"
                    value={quickDate}
                    onChange={(e) => setQuickDate(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
              </div>

              {/* Workers Rows */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Liste des Ouvriers & Agents ({quickWorkers.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setQuickWorkers([
                          ...quickWorkers,
                          {
                            worker_name: "",
                            worker_function: "Manœuvre",
                            status: "present",
                            check_in: "07:30",
                            check_out: "16:00",
                            overtime_hours: 0,
                          },
                        ])
                      }
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 border border-slate-200/60"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter une ligne</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Nom Ouvrier</th>
                        <th className="py-2.5 px-3">Fonction</th>
                        <th className="py-2.5 px-3">Statut Présence</th>
                        <th className="py-2.5 px-3">Heures (Arrivée / Départ)</th>
                        <th className="py-2.5 px-3">Heures Sup</th>
                        <th className="py-2.5 px-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quickWorkers.map((w, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              required
                              placeholder="ex: Jean-Luc Kalala"
                              value={w.worker_name}
                              onChange={(e) => {
                                const copy = [...quickWorkers];
                                copy[idx].worker_name = e.target.value;
                                setQuickWorkers(copy);
                              }}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#8E2424]"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              placeholder="ex: Coffreur"
                              value={w.worker_function}
                              onChange={(e) => {
                                const copy = [...quickWorkers];
                                copy[idx].worker_function = e.target.value;
                                setQuickWorkers(copy);
                              }}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-[#8E2424]"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={w.status}
                              onChange={(e) => {
                                const copy = [...quickWorkers];
                                copy[idx].status = e.target.value as PresenceStatus;
                                setQuickWorkers(copy);
                              }}
                              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#8E2424]"
                            >
                              <option value="present">Présent</option>
                              <option value="late">Retard</option>
                              <option value="absent">Absent</option>
                              <option value="leave">En Congé</option>
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="time"
                                value={w.check_in}
                                disabled={w.status === "absent"}
                                onChange={(e) => {
                                  const copy = [...quickWorkers];
                                  copy[idx].check_in = e.target.value;
                                  setQuickWorkers(copy);
                                }}
                                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs disabled:opacity-30"
                              />
                              <span className="text-slate-400">-</span>
                              <input
                                type="time"
                                value={w.check_out}
                                disabled={w.status === "absent"}
                                onChange={(e) => {
                                  const copy = [...quickWorkers];
                                  copy[idx].check_out = e.target.value;
                                  setQuickWorkers(copy);
                                }}
                                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs disabled:opacity-30"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={w.overtime_hours}
                              onChange={(e) => {
                                const copy = [...quickWorkers];
                                copy[idx].overtime_hours = parseFloat(e.target.value) || 0;
                                setQuickWorkers(copy);
                              }}
                              className="w-16 p-2 bg-slate-50 border border-slate-200 rounded-lg text-amber-700 font-mono text-xs font-bold text-center"
                            />
                          </td>
                          <td className="py-2 px-2 text-right">
                            {quickWorkers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const copy = quickWorkers.filter((_, i) => i !== idx);
                                  setQuickWorkers(copy);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  <strong className="text-slate-700">{quickWorkers.filter((w) => w.status === "present").length}</strong> présents •{" "}
                  <strong className="text-amber-700">{quickWorkers.filter((w) => w.status === "late").length}</strong> retards •{" "}
                  <strong className="text-rose-700">{quickWorkers.filter((w) => w.status === "absent").length}</strong> absents
                </span>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowQuickSheet(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={quickSubmitting}
                    className="px-5 py-2 rounded-xl bg-[#7BA238] hover:bg-[#6A8D2F] text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{quickSubmitting ? "Transmission..." : "Soumettre la Feuille de Présence"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
