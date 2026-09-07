"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Project, Profile } from "@/types/database";
import {
  ClipboardList,
  ArrowLeft,
  Calendar,
  CloudSun,
  Users,
  AlertTriangle,
  ShieldCheck,
  Save,
  Clock,
} from "lucide-react";

export default function NewFieldReportPage() {
  const router = useRouter();
  const supabase = createClient();

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [projectId, setProjectId] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [weather, setWeather] = useState("Ensoleillé (30°C)");
  const [workforceCount, setWorkforceCount] = useState("25");
  const [activitiesSummary, setActivitiesSummary] = useState("");
  const [issuesAndDelays, setIssuesAndDelays] = useState("");
  const [safetyObservations, setSafetyObservations] = useState("");

  useEffect(() => {
    async function loadData() {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", u.user.id)
          .single();
        if (p) setCurrentUser(p as Profile);
      }

      const { data: prj } = await supabase
        .from("projects")
        .select("*")
        .eq("status", "in_progress")
        .order("title");

      if (prj) {
        setProjects(prj as Project[]);
        if (prj.length > 0) setProjectId(prj[0].id);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmitting(true);

    const { error } = await supabase.from("daily_site_reports").insert({
      project_id: projectId,
      supervisor_id: currentUser.id,
      report_date: reportDate,
      weather,
      workforce_count: parseInt(workforceCount) || 0,
      activities_summary: activitiesSummary,
      issues_and_delays: issuesAndDelays || null,
      safety_observations: safetyObservations || null,
      status: "submitted",
    });

    if (!error) {
      router.push("/field-reports");
      router.refresh();
    } else {
      alert("Erreur lors de l'enregistrement : " + error.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/field-reports"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-amber-500" />
            <span>Saisie du Journal Quotidien de Chantier</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Enregistrement des effectifs, avancement journalier et transmission pour visa au Conducteur de travaux.
          </p>
        </div>
      </div>

      {/* 19h00 Cutoff Banner */}
      <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <div className="text-xs font-bold text-amber-200">
              Règle de Clôture Quotidienne Stricte : Clôture avant 19h00 (Heure RDC UTC+2)
            </div>
            <div className="text-[11px] text-amber-300/70 mt-0.5">
              Passé 19h00, le trigger PostgreSQL <code className="text-amber-200">trg_enforce_daily_report_cutoff</code> bloque automatiquement toute soumission du jour.
            </div>
          </div>
        </div>
        <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-900/80 text-amber-200 border border-amber-700">
          Coupe-Circuit 19h00
        </span>
      </div>

      {/* Form Container */}
      <div className="glass-card rounded-2xl p-6 md:p-8 border border-slate-800">
        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* Project & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
                Chantier Concerne *
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
                Date du Journal *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  required
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Weather & Workforce */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <CloudSun className="w-4 h-4 text-amber-400" />
                <span>Conditions Météo</span>
              </label>
              <input
                type="text"
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                placeholder="ex: Ensoleillé (32°C), Averses dans l'après-midi"
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Effectif Total Présent sur Site</span>
              </label>
              <input
                type="number"
                min="0"
                value={workforceCount}
                onChange={(e) => setWorkforceCount(e.target.value)}
                placeholder="ex: 35"
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Activities Summary */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
              Activités & Tâches Réalisées Aujourd&apos;hui *
            </label>
            <textarea
              rows={4}
              required
              value={activitiesSummary}
              onChange={(e) => setActivitiesSummary(e.target.value)}
              placeholder="Détaillez les ouvrages réalisés : ferraillage, coulage, coffrage, terrassement, métrés..."
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Issues and Delays */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Incidents, Arrêts ou Retards (Optionnel)</span>
            </label>
            <textarea
              rows={2}
              value={issuesAndDelays}
              onChange={(e) => setIssuesAndDelays(e.target.value)}
              placeholder="Pannes mécaniques, coupures d'électricité, retards de livraison béton ou ciment..."
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Safety & QHSE */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Observations QHSE & Sécurité</span>
            </label>
            <textarea
              rows={2}
              value={safetyObservations}
              onChange={(e) => setSafetyObservations(e.target.value)}
              placeholder="Quart d'heure sécurité, port des EPI, sécurisation des tranchées ou échafaudages..."
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Link
              href="/field-reports"
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700 transition"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white font-bold shadow-lg shadow-[#8E2424]/20 border border-[#8E2424] flex items-center gap-2 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? "Envoi en cours..." : "Soumettre pour Visa"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
