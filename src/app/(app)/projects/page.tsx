"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Project, Profile, CurrencyCode, ProjectStatus } from "@/types/database";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CurrencyBadge } from "@/components/ui/CurrencyBadge";
import { formatDate, formatCDF } from "@/lib/utils";
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
  Edit3,
  Trash2,
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
  const [newBudgetCdf, setNewBudgetCdf] = useState("");
  const [newCurrency, setNewCurrency] = useState<CurrencyCode>("USD");
  const [newSiteManagerId, setNewSiteManagerId] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit Project State
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [editSaving, setEditSaving] = useState(false);

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

    const allocatedUSD = parseFloat(newBudget) || 0;
    const allocatedCDF = parseFloat(newBudgetCdf) || 0;

    const { data, error } = await supabase.from("projects").insert({
      code: newCode.trim() || `PRJ-2026-00${projects.length + 1}`,
      title: newTitle.trim(),
      client_name: newClient.trim(),
      location: newLocation.trim(),
      budget: allocatedUSD,
      budget_allocated_usd: allocatedUSD,
      budget_allocated_cdf: allocatedCDF,
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
      setNewBudgetCdf("");
      setNewDescription("");
      fetchProjects();
    } else {
      alert("Erreur de création : " + (error?.message || "Inconnue"));
    }
    setSaving(false);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToEdit) return;
    setEditSaving(true);

    const { error } = await supabase
      .from("projects")
      .update({
        title: projectToEdit.title,
        client_name: projectToEdit.client_name,
        location: projectToEdit.location,
        budget: projectToEdit.budget,
        budget_allocated_usd: projectToEdit.budget_allocated_usd,
        budget_allocated_cdf: projectToEdit.budget_allocated_cdf,
        status: projectToEdit.status,
        site_manager_id: projectToEdit.site_manager_id || null,
        description: projectToEdit.description,
      })
      .eq("id", projectToEdit.id);

    if (!error) {
      setProjectToEdit(null);
      fetchProjects();
    } else {
      alert("Erreur de mise à jour : " + error.message);
    }
    setEditSaving(false);
  };

  const handleDeleteProject = async (prjId: string, title: string) => {
    if (!confirm(`Confirmer la suppression définitive du chantier "${title}" ?`)) return;
    const { error } = await supabase.from("projects").delete().eq("id", prjId);
    if (!error) {
      fetchProjects();
    } else {
      alert("Erreur lors de la suppression : " + error.message);
    }
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
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#1C1F23] tracking-tight flex items-center gap-2.5">
            <HardHat className="w-6 h-6 text-[#8E2424]" />
            <span>Gestion des Chantiers & Projets BTP</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Supervision technique, affectation des conducteurs de travaux et suivi financier multi-devises.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Chantier</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par code, nom de projet, client, ville..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#8E2424] focus:ring-1 focus:ring-[#8E2424] transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          {["all", "in_progress", "completed", "on_hold"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? "bg-[#8E2424]/10 text-[#8E2424] border border-[#8E2424]/30"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/60"
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
        <div className="text-center py-12 text-slate-400 text-sm">
          Chargement des chantiers...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
          Aucun projet correspondant trouvé.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((prj) => (
            <div
              key={prj.id}
              className="bg-white rounded-2xl p-6 flex flex-col justify-between space-y-4 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#8E2424] bg-[#8E2424]/10 px-2.5 py-0.5 rounded-lg tracking-wider">
                    {prj.code}
                  </span>
                  <StatusBadge status={prj.status} type="project" />
                </div>

                <h3 className="text-base font-bold text-[#1C1F23] group-hover:text-[#8E2424] transition">
                  {prj.title}
                </h3>

                <p className="text-xs text-slate-500 line-clamp-2">
                  {prj.description || "Aucune description détaillée."}
                </p>

                <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Client : <strong className="text-slate-700 font-semibold">{prj.client_name}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lieu : <strong className="text-slate-700 font-semibold">{prj.location}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Démarrage : {formatDate(prj.start_date)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">
                    Budget Alloué
                  </span>
                  <CurrencyBadge amount={Number(prj.budget_allocated_usd || prj.budget)} currency="USD" size="sm" />
                  {Number(prj.budget_allocated_cdf) > 0 && (
                    <span className="text-[10px] font-mono text-emerald-600 font-semibold block mt-0.5">
                      + {formatCDF(Number(prj.budget_allocated_cdf))}
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">
                    Conducteur Travaux
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    {prj.site_manager?.full_name || "Non assigné"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setProjectToEdit(prj)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-[11px] font-semibold border border-slate-200/60 transition flex items-center gap-1.5"
                >
                  <Edit3 className="w-3 h-3 text-amber-600" />
                  <span>Modifier</span>
                </button>
                <button
                  onClick={() => handleDeleteProject(prj.id, prj.title)}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#8E2424] text-[11px] font-semibold border border-rose-200 transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3 h-3 text-[#8E2424]" />
                  <span>Supprimer</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Project Modal */}
      {projectToEdit && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-lg w-full p-6 shadow-2xl space-y-4 text-[#1C1F23] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#1C1F23] flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                <span>Modifier le Chantier : {projectToEdit.code}</span>
              </h3>
              <button
                onClick={() => setProjectToEdit(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProject} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Titre de l&apos;Ouvrage</label>
                <input
                  type="text"
                  required
                  value={projectToEdit.title}
                  onChange={(e) => setProjectToEdit({ ...projectToEdit, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Maître d&apos;Ouvrage / Client</label>
                  <input
                    type="text"
                    required
                    value={projectToEdit.client_name}
                    onChange={(e) => setProjectToEdit({ ...projectToEdit, client_name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Localisation / Ville</label>
                  <input
                    type="text"
                    required
                    value={projectToEdit.location}
                    onChange={(e) => setProjectToEdit({ ...projectToEdit, location: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Budget Alloué USD ($)</label>
                  <input
                    type="number"
                    step="100"
                    required
                    value={projectToEdit.budget_allocated_usd ?? projectToEdit.budget}
                    onChange={(e) =>
                      setProjectToEdit({
                        ...projectToEdit,
                        budget_allocated_usd: parseFloat(e.target.value) || 0,
                        budget: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Budget Alloué CDF (FC)</label>
                  <input
                    type="number"
                    step="10000"
                    placeholder="ex: 50000000"
                    value={projectToEdit.budget_allocated_cdf ?? 0}
                    onChange={(e) =>
                      setProjectToEdit({
                        ...projectToEdit,
                        budget_allocated_cdf: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Statut</label>
                  <select
                    value={projectToEdit.status}
                    onChange={(e) => setProjectToEdit({ ...projectToEdit, status: e.target.value as ProjectStatus })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  >
                    <option value="in_progress">En Cours</option>
                    <option value="on_hold">En Attente</option>
                    <option value="completed">Terminé</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Conducteur de Travaux Assigné</label>
                <select
                  value={projectToEdit.site_manager_id || ""}
                  onChange={(e) => setProjectToEdit({ ...projectToEdit, site_manager_id: e.target.value || null })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                >
                  <option value="">Non assigné</option>
                  {siteManagers.map((sm) => (
                    <option key={sm.id} value={sm.id}>
                      {sm.full_name} ({sm.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={projectToEdit.description || ""}
                  onChange={(e) => setProjectToEdit({ ...projectToEdit, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProjectToEdit(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white font-semibold text-xs transition disabled:opacity-50 shadow-sm"
                >
                  {editSaving ? "Enregistrement..." : "Mettre à Jour"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-lg w-full p-6 shadow-2xl space-y-4 text-[#1C1F23] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#1C1F23] flex items-center gap-2">
                <HardHat className="w-5 h-5 text-[#8E2424]" />
                <span>Nouveau Chantier BTP</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Code Chantier</label>
                  <input
                    type="text"
                    required
                    placeholder="PRJ-2026-00X"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Devise de Référence</label>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value as CurrencyCode)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CDF">Franc Congolais (CDF)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Titre / Désignation de l&apos;Ouvrage</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Construction Hangar Métallique Portuaire"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Maître d&apos;Ouvrage / Client</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Ministère des ITPR"
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Localisation / Ville</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Kinshasa - Maluku"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Budget USD ($) *</label>
                  <input
                    type="number"
                    step="100"
                    required
                    placeholder="ex: 750000"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Budget CDF (Optionnel)</label>
                  <input
                    type="number"
                    step="10000"
                    placeholder="ex: 50000000"
                    value={newBudgetCdf}
                    onChange={(e) => setNewBudgetCdf(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Conducteur de Travaux</label>
                  <select
                    value={newSiteManagerId}
                    onChange={(e) => setNewSiteManagerId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
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
                <label className="block text-slate-700 font-semibold mb-1">Description Sommaire des Travaux</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Spécifications techniques, portée, caractéristiques..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
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
                  className="px-5 py-2 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white font-semibold text-xs transition disabled:opacity-50 shadow-sm"
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
