"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DailySiteReport, Profile } from "@/types/database";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import {
  ClipboardList,
  Plus,
  CheckCircle,
  XCircle,
  Calendar,
  CloudSun,
  Users,
  AlertTriangle,
  ShieldAlert,
  HardHat,
} from "lucide-react";

export default function FieldReportsPage() {
  const supabase = createClient();

  const [reports, setReports] = useState<DailySiteReport[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [validationNote, setValidationNote] = useState<Record<string, string>>({});

  const fetchReports = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single();
      if (p) setCurrentUser(p as Profile);
    }

    const { data } = await supabase
      .from("daily_site_reports")
      .select("*, project:project_id(*), supervisor:supervisor_id(*), validator:validated_by(*)")
      .order("report_date", { ascending: false });

    if (data) setReports(data as DailySiteReport[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleValidation = async (reportId: string, status: "validated" | "rejected") => {
    if (!currentUser) return;
    setActionLoading(reportId);

    const note = validationNote[reportId] || (status === "validated" ? "Rapport examiné et approuvé." : "Rapport rejeté pour complément d'information.");

    const { error } = await supabase
      .from("daily_site_reports")
      .update({
        status,
        validated_by: currentUser.id,
        validation_notes: note,
        validated_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (!error) {
      fetchReports();
    } else {
      alert("Erreur de validation : " + error.message);
    }
    setActionLoading(null);
  };

  const isValidator = currentUser && ["admin", "company_management", "site_manager"].includes(currentUser.role);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ClipboardList className="w-7 h-7 text-amber-500" />
            <span>Journaux Quotidiens de Chantier</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Rapports journaliers de terrain, relevé des effectifs, avancement physique et validation par le Conducteur de travaux.
          </p>
        </div>

        <Link
          href="/field-reports/new"
          className="px-4 py-2.5 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-bold shadow-lg shadow-[#8E2424]/20 border border-[#8E2424] transition flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Rédiger un Journal</span>
        </Link>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          Chargement des journaux de chantier...
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-slate-400">
          Aucun rapport de chantier enregistré pour le moment.
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((rep) => (
            <div
              key={rep.id}
              className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-amber-900/40 transition space-y-4"
            >
              {/* Top Meta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-800/40">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">
                        {rep.project?.title || "Chantier non spécifié"}
                      </h3>
                      <span className="text-xs text-red-400 font-semibold">
                        ({rep.project?.code})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span>Date : <strong className="text-slate-200">{formatDate(rep.report_date)}</strong></span>
                      <span>•</span>
                      <span>Rédigé par : <strong className="text-slate-200">{rep.supervisor?.full_name || "Superviseur"}</strong></span>
                    </div>
                  </div>
                </div>

                <StatusBadge status={rep.status} type="report" />
              </div>

              {/* Badges / Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5 text-slate-300">
                  <CloudSun className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Météo : <strong className="text-white">{rep.weather || "Non renseigné"}</strong></span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5 text-slate-300">
                  <Users className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>Effectif sur site : <strong className="text-white">{rep.workforce_count} ouvriers</strong></span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5 text-slate-300 col-span-2 sm:col-span-1">
                  <HardHat className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Statut validation : <strong className="text-white">{rep.status === "validated" ? "Validé" : "En attente"}</strong></span>
                </div>
              </div>

              {/* Core Content */}
              <div className="space-y-2 text-xs">
                <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                  Activités Réalisées :
                </div>
                <p className="text-slate-200 bg-slate-900/50 p-3 rounded-xl border border-slate-800/60 leading-relaxed">
                  {rep.activities_summary}
                </p>

                {rep.issues_and_delays && (
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/40 text-amber-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Aléas & Retards Rencontrés :</span>
                    </div>
                    <p className="text-amber-100/90">{rep.issues_and_delays}</p>
                  </div>
                )}

                {rep.safety_observations && (
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/40 text-emerald-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Observations Sécurité / QHSE :</span>
                    </div>
                    <p className="text-emerald-100/90">{rep.safety_observations}</p>
                  </div>
                )}
              </div>

              {/* Validation Notes if already reviewed */}
              {rep.validated_by && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                  <div className="text-slate-400">
                    Visa apposé par <strong className="text-slate-200">{rep.validator?.full_name}</strong> le {formatDate(rep.validated_at)}
                  </div>
                  {rep.validation_notes && (
                    <p className="text-slate-300 italic">&ldquo;{rep.validation_notes}&rdquo;</p>
                  )}
                </div>
              )}

              {/* Validator Action Panel (Site Manager / Admin) */}
              {isValidator && rep.status === "submitted" && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-3">
                  <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span>Visa du Conducteur de Travaux</span>
                    <span className="text-[10px] text-amber-400">En attente de votre revue</span>
                  </div>

                  <input
                    type="text"
                    placeholder="Observations ou consignes pour le superviseur..."
                    value={validationNote[rep.id] || ""}
                    onChange={(e) =>
                      setValidationNote({
                        ...validationNote,
                        [rep.id]: e.target.value,
                      })
                    }
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500"
                  />

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleValidation(rep.id, "rejected")}
                      disabled={actionLoading === rep.id}
                      className="px-3 py-1.5 rounded-lg bg-[#8E2424]/20 hover:bg-[#8E2424]/40 text-[#E58585] border border-[#8E2424]/60 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Demander Révision</span>
                    </button>
                    <button
                      onClick={() => handleValidation(rep.id, "validated")}
                      disabled={actionLoading === rep.id}
                      className="px-4 py-1.5 rounded-lg bg-[#7BA238] hover:bg-[#6A8D2F] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#7BA238]/25 border border-[#7BA238] transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Valider & Approuver</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
