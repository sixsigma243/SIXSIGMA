"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Project, Profile, CurrencyCode, ProjectStatus } from "@/types/database";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CurrencyBadge } from "@/components/ui/CurrencyBadge";
import { formatDate } from "@/lib/utils";
import {
  HardHat,
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  Building2,
  DollarSign,
  Check,
  X,
} from "lucide-react";

export default function ProjectsPage() {
  const supabase = createClient();

  const [projects, setProjects] = useState<Project[]>([]);
  const [siteManagers, setSiteManagers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // New Project Modal State
  const [showModal, setShowModal] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [newCurrency, setNewCurrency] = useState<CurrencyCode>("USD");
  const [newSiteManagerId, setNewSiteManagerId] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    const { data: prjData } = await supabase
      .from("projects")
      .select("*, site_manager:site_manager_id(*)")
      .order("created_at", { ascending: false });

    if (prjData) setProjects(prjData as Project[]);

    // Fetch site managers
    const { data: smData } = await supabase
      .from("profiles")
      .select("*")
      .in("role", ["site_manager", "admin"]);

    if (smData) setSiteManagers(smData as Profile[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data, error } = await supabase.from("projects").insert({
      code: newCode.trim() || `PRJ-2026-00${projects.length + 1}`,
      title: newTitle.trim(),
      client_name: newClient.trim(),
      location: newLocation.trim(),
      budget: parseFloat(newBudget) || 0,
      currency: newCurrency,
      site_manager_id: newSiteManagerId || null,
      description: newDescription.trim(),
      status: "in_progress",
    }).select();

    if (!error && data) {
      setShowModal(false);
      // Reset form
      setNewCode("");
      setNewTitle("");
      setNewClient("");
      setNewLocation("");
      setNewBudget("");
      setNewDescription("");
      fetchProjects();
    } else {
      alert("Erreur lors de la création : " + error?.message);
    }
    setSaving(false);
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <HardHat className="w-7 h-7 text-red-500" />
            <span>Gestion des Chantiers & Projets BTP</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Supervision technique, affectation des conducteurs de travaux et suivi financier multi-devises.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-rose-800 hover:from-red-600 hover:to-rose-700 text-white text-xs font-bold shadow-lg shadow-red-950/50 border border-red-600/30 transition flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Chantier</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par code, nom de projet, client, ville..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
          {["all", "in_progress", "completed", "on_hold"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                statusFilter === st
                  ? "bg-red-950 text-red-300 border border-red-800"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {st === "all"
                ? "Tous"
                : st === "in_progress"
                ? "En Cours"
                : st === "completed"
                ? "Achevés"
                : "En Attente"}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          Chargement des chantiers...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-slate-400">
          Aucun projet correspondant trouvé.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((prj) => (
            <div
              key={prj.id}
              className="glass-card rounded-2xl p-6 flex flex-col justify-between space-y-4 border border-slate-800 hover:border-red-900/60 transition group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-red-400 tracking-wider">
                    {prj.code}
                  </span>
                  <StatusBadge status={prj.status} type="project" />
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-red-200 transition">
                  {prj.title}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-2">
                  {prj.description || "Aucune description détaillée."}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Client : <strong className="text-slate-200">{prj.client_name}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>Lieu : <strong className="text-slate-200">{prj.location}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Démarrage : {formatDate(prj.start_date)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-semibold block">
                    Budget Alloué
                  </span>
                  <CurrencyBadge amount={Number(prj.budget)} currency={prj.currency} size="sm" />
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase text-slate-500 font-semibold block">
                    Directeur Travaux
                  </span>
                  <span className="text-xs font-medium text-slate-300">
                    {prj.site_manager?.full_name || "Non assigné"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] rounded-2xl border border-slate-700 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <HardHat className="w-5 h-5 text-red-500" />
                <span>Nouveau Chantier BTP</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Code Chantier</label>
                  <input
                    type="text"
                    required
                    placeholder="PRJ-2026-00X"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Devise de Référence</label>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value as CurrencyCode)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CDF">Franc Congolais (CDF)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Titre / Désignation de l&apos;Ouvrage</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Construction Hangar Métallique Portuaire"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Maître d&apos;Ouvrage / Client</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Ministère des ITPR"
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Localisation / Ville</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Kinshasa - Maluku"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Budget Total</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="ex: 750000"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Conducteur de Travaux</label>
                  <select
                    value={newSiteManagerId}
                    onChange={(e) => setNewSiteManagerId(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="">Sélectionner...</option>
                    {siteManagers.map((sm) => (
                      <option key={sm.id} value={sm.id}>
                        {sm.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description Sommaire des Travaux</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Spécifications techniques, portée, caractéristiques..."
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold transition disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Créer le Projet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
