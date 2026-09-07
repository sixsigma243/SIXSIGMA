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
} from "lucide-react";

export default function AttendancePage() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"daily" | "reconciliation">("daily");
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

    const { data } = await supabase
      .from("time_entries")
      .select("*, project:project_id(*)")
      .eq("entry_date", dateFilter)
      .order("created_at", { ascending: false });

    if (data) setEntries(data as TimeEntry[]);

    const { data: recData } = await supabase
      .from("attendance_reconciliations")
      .select("*, project:project_id(*), supervisor:supervisor_id(*)")
      .order("created_at", { ascending: false });

    if (recData) setReconciliations(recData as AttendanceReconciliation[]);

    const { data: prj } = await supabase
      .from("projects")
      .select("*")
      .eq("status", "in_progress");
    if (prj) {
      setProjects(prj as Project[]);
      if (prj.length > 0 && !newProjectId) setNewProjectId(prj[0].id);
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
      worker_function: newFunction.trim(),
      project_id: newProjectId || null,
      entry_date: dateFilter,
      status: newStatus,
      check_in: newCheckIn || null,
      check_out: newCheckOut || null,
      overtime_hours: parseFloat(newOvertime) || 0,
      notes: newNotes.trim() || null,
    });

    if (!error) {
      setShowModal(false);
      setNewWorkerName("");
      setNewFunction("");
      setNewOvertime("0");
      setNewNotes("");
      fetchAttendance();
    } else {
      alert("Erreur d'enregistrement : " + error.message);
    }
    setSaving(false);
  };

  const handleArbitrate = async (recId: string, decision: PresenceStatus) => {
    if (!currentUser) return;
    setArbitratingId(recId);

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
      fetchAttendance();
    } else {
      alert("Erreur lors de l'arbitrage : " + error.message);
    }
    setArbitratingId(null);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-blue-500" />
            <span>Pointage & Ressources Humaines (Terrain)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enregistrement journalier des présences, arbitrage des écarts (Pointeur vs Chef d&apos;Équipe) et suivi des heures sup.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
            />
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-rose-800 hover:from-red-600 hover:to-rose-700 text-white text-xs font-bold shadow-lg shadow-red-950/50 border border-red-600/30 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Pointage</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("daily")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "daily"
              ? "bg-red-950 text-red-200 border border-red-800"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Feuille de Pointage Journalière</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
            {entries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("reconciliation")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "reconciliation"
              ? "bg-amber-950 text-amber-200 border border-amber-800"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Scale className="w-4 h-4 text-amber-400" />
          <span>Arbitrage des Écarts (Pointeur vs Team Leader)</span>
          {pendingReconciliationsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500 text-black font-black animate-pulse">
              {pendingReconciliationsCount} à arbitrer
            </span>
          )}
        </button>
      </div>

      {activeTab === "daily" ? (
        <>
          {/* Stats Summary Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase">Présents Aujourd&apos;hui</span>
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-white">
                {presentCount} <span className="text-xs text-slate-400 font-normal">/ {totalEntries} inscrits</span>
              </div>
              <div className="mt-1 text-xs text-emerald-400 font-semibold">
                Taux de présence : {attendanceRate}%
              </div>
            </div>

            <div className="glass-card p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase">Retards Relevés</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-amber-400">
                {lateCount}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Tolérance 15 min max
              </div>
            </div>

            <div className="glass-card p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase">Absences Injustifiées</span>
                <UserX className="w-4 h-4 text-rose-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-rose-400">
                {absentCount}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Impact sur paie journalière
              </div>
            </div>

            <div className="glass-card p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase">Heures Supplémentaires</span>
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-blue-400">
                {totalOvertime} h
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Cumul journée de travail
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Feuille de Pointage - {formatDate(dateFilter)}</span>
              </h3>
              <span className="text-xs text-slate-400">{entries.length} ouvriers pointés</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Chargement des pointages...
              </div>
            ) : entries.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Aucun pointage enregistré pour cette date. Cliquez sur &ldquo;Nouveau Pointage&rdquo; pour démarrer la saisie.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Ouvrier / Agent</th>
                      <th className="py-3 px-4">Spécialité & Chantier</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4">Arrivée - Départ</th>
                      <th className="py-3 px-4">Heures Sup</th>
                      <th className="py-3 px-4">Remarques</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-semibold text-white">
                          {entry.worker_name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-200">{entry.worker_function || "Polyvalent"}</span>
                          <span className="block text-[11px] text-slate-500">
                            {entry.project?.code || "Chantier Général"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={entry.status} type="presence" />
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono">
                          {entry.check_in || "--:--"} - {entry.check_out || "--:--"}
                        </td>
                        <td className="py-3 px-4">
                          {Number(entry.overtime_hours) > 0 ? (
                            <span className="font-bold text-amber-400">
                              +{entry.overtime_hours} h
                            </span>
                          ) : (
                            <span className="text-slate-500">0 h</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                          {entry.notes || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* RECONCILIATION TAB */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex items-start gap-3 text-xs text-amber-200">
            <Scale className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Contrôle de Cohérence RH & Séparation des Pouvoirs : </strong>
              <span>
                Le Pointeur enregistre les entrées physiques au portail tandis que le Chef d&apos;Équipe (Team Leader) atteste de la présence effective sur le front de taille / coulage. Tout écart doit faire l&apos;objet d&apos;un arbitrage formel par le Superviseur avant clôture de paie.
              </span>
            </div>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Registre des Écarts de Présence Relevés</span>
              </h3>
              <span className="text-xs text-slate-400">
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
                  <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
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
                  <tbody className="divide-y divide-slate-800/60">
                    {reconciliations.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <span className="font-bold text-white block">{rec.worker_name}</span>
                          <span className="text-[11px] text-slate-400">{rec.worker_function || "Ouvrier"}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {rec.project?.code || "Chantier"}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={rec.team_leader_status} type="presence" />
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={rec.pointer_status} type="presence" />
                        </td>
                        <td className="py-3 px-4 max-w-xs text-slate-300 leading-tight">
                          {rec.notes}
                        </td>
                        <td className="py-3 px-4">
                          {rec.status === "resolved" ? (
                            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Tranché : <StatusBadge status={rec.arbitrated_status!} type="presence" /></span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
                              En attente
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {rec.status === "pending" && isSupervisorOrManager ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleArbitrate(rec.id, "present")}
                                disabled={arbitratingId === rec.id}
                                className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-[11px] font-bold transition"
                                title="Reconnaître l'ouvrier comme présent"
                              >
                                Présent
                              </button>
                              <button
                                onClick={() => handleArbitrate(rec.id, "late")}
                                disabled={arbitratingId === rec.id}
                                className="px-2.5 py-1 rounded-lg bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 text-[11px] font-bold transition"
                                title="Appliquer un statut retard"
                              >
                                Retard
                              </button>
                              <button
                                onClick={() => handleArbitrate(rec.id, "absent")}
                                disabled={arbitratingId === rec.id}
                                className="px-2.5 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-[11px] font-bold transition"
                                title="Statuer en absence injustifiée"
                              >
                                Absent
                              </button>
                            </div>
                          ) : rec.status === "resolved" ? (
                            <span className="text-[11px] text-slate-500">
                              Arbitré par {rec.supervisor?.full_name || "Superviseur"}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">Réservé Superviseur</span>
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
      )}

      {/* New Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] rounded-2xl border border-slate-700 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Nouveau Pointage Journalier</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nom Complet de l&apos;Ouvrier *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Jean-Luc Kalala"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Fonction / Corps d&apos;état</label>
                  <input
                    type="text"
                    placeholder="ex: Ferrailleur, Grutier"
                    value={newFunction}
                    onChange={(e) => setNewFunction(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Chantier d&apos;Affectation</label>
                  <select
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
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
                  <label className="block text-slate-300 font-semibold mb-1">Statut Présence</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as PresenceStatus)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="present">Présent</option>
                    <option value="late">En Retard</option>
                    <option value="absent">Absent</option>
                    <option value="leave">En Congé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Heures Supplémentaires</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={newOvertime}
                    onChange={(e) => setNewOvertime(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Heure Arrivée</label>
                  <input
                    type="time"
                    value={newCheckIn}
                    onChange={(e) => setNewCheckIn(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Heure Départ</label>
                  <input
                    type="time"
                    value={newCheckOut}
                    onChange={(e) => setNewCheckOut(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Observations / Motif retard</label>
                <input
                  type="text"
                  placeholder="Notes facultatives..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold transition disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
