"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Project, Profile, CurrencyCode, ProjectStatus, CommercialActivity } from "@/types/database";
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
  CheckCircle2,
  Clock,
  Briefcase,
  PhoneCall,
  UserCheck,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react";

export default function ProjectsPage() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"projects" | "prospection">("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [commercialActivities, setCommercialActivities] = useState<CommercialActivity[]>([]);
  const [siteManagers, setSiteManagers] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
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

  // Admin Approval State
  const [projectToApprove, setProjectToApprove] = useState<Project | null>(null);
  const [assignedSmId, setAssignedSmId] = useState("");
  const [approving, setApproving] = useState(false);

  // Commercial Activity Modal State
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [actClientName, setActClientName] = useState("");
  const [actContactPerson, setActContactPerson] = useState("");
  const [actPhone, setActPhone] = useState("");
  const [actEmail, setActEmail] = useState("");
  const [actType, setActType] = useState<CommercialActivity["activity_type"]>("meeting");
  const [actSubject, setActSubject] = useState("");
  const [actNotes, setActNotes] = useState("");
  const [actEstimatedValue, setActEstimatedValue] = useState("");
  const [actNextDate, setActNextDate] = useState("");
  const [actSaving, setActSaving] = useState(false);

  const isCommercial = currentUser?.role === "commercial";
  const isSiteManager = currentUser?.role === "site_manager";
  const isAdminOrManagement = currentUser?.role === "admin" || currentUser?.role === "company_management";

  const fetchProjects = async () => {
    setLoading(true);

    const { data: u } = await supabase.auth.getUser();
    if (u?.user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.user.id)
        .single();
      if (prof) setCurrentUser(prof as Profile);
    }

    const { data: prjData } = await supabase
      .from("projects")
      .select("*, site_manager:site_manager_id(*)")
      .order("created_at", { ascending: false });

    if (prjData) setProjects(prjData as Project[]);

    // Fetch site managers for assignment
    const { data: smData } = await supabase
      .from("profiles")
      .select("*")
      .in("role", ["site_manager", "admin"]);

    if (smData) setSiteManagers(smData as Profile[]);

    // Fetch commercial activities
    const { data: actData } = await supabase
      .from("commercial_activities")
      .select("*, commercial:commercial_id(*), project:project_id(*)")
      .order("created_at", { ascending: false });

    if (actData) setCommercialActivities(actData as CommercialActivity[]);

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

    // Workflow Commercial vs Admin
    const initialApprovalStatus = isCommercial ? "pending_approval" : "approved";
    const initialSiteManagerId = isCommercial ? null : (newSiteManagerId || null);
    const initialStatus: ProjectStatus = isCommercial ? "draft" : "in_progress";

    const { data, error } = await supabase.from("projects").insert({
      code: newCode.trim() || `PRJ-2026-00${projects.length + 1}`,
      title: newTitle.trim(),
      client_name: newClient.trim(),
      location: newLocation.trim(),
      budget: allocatedUSD,
      budget_allocated_usd: allocatedUSD,
      budget_allocated_cdf: allocatedCDF,
      currency: newCurrency,
      site_manager_id: initialSiteManagerId,
      description: newDescription.trim(),
      status: initialStatus,
      approval_status: initialApprovalStatus,
      created_by: currentUser?.id || null,
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
      setNewSiteManagerId("");
      fetchProjects();
    } else {
      alert("Erreur de création du projet : " + (error?.message || "Inconnue"));
    }
    setSaving(false);
  };

  const handleApproveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToApprove) return;
    setApproving(true);

    const { error } = await supabase
      .from("projects")
      .update({
        approval_status: "approved",
        status: "in_progress",
        site_manager_id: assignedSmId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectToApprove.id);

    if (!error) {
      setProjectToApprove(null);
      setAssignedSmId("");
      fetchProjects();
    } else {
      alert("Erreur lors de la validation du projet : " + error.message);
    }
    setApproving(false);
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
    if (!window.confirm(`Confirmez-vous la suppression du projet "${title}" ? Cette action est irréversible.`)) {
      return;
    }

    const { error } = await supabase.from("projects").delete().eq("id", prjId);
    if (!error) {
      fetchProjects();
    } else {
      alert("Erreur de suppression : " + error.message);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setActSaving(true);

    const estVal = parseFloat(actEstimatedValue) || 0;

    const { error } = await supabase.from("commercial_activities").insert({
      commercial_id: currentUser.id,
      client_name: actClientName.trim(),
      contact_person: actContactPerson.trim() || null,
      contact_phone: actPhone.trim() || null,
      contact_email: actEmail.trim() || null,
      activity_type: actType,
      subject: actSubject.trim(),
      notes: actNotes.trim(),
      estimated_deal_value: estVal,
      currency: "USD",
      next_follow_up_date: actNextDate || null,
      status: "in_progress",
    });

    if (!error) {
      setShowActivityModal(false);
      setActClientName("");
      setActContactPerson("");
      setActPhone("");
      setActEmail("");
      setActSubject("");
      setActNotes("");
      setActEstimatedValue("");
      setActNextDate("");
      fetchProjects();
    } else {
      alert("Erreur d'enregistrement du rapport commercial : " + error.message);
    }
    setActSaving(false);
  };

  // Filter projects by site manager role and search term
  const filteredProjects = projects.filter((prj) => {
    // Cloisonnement Conducteur de Travaux : voit uniquement ses chantiers
    if (isSiteManager && prj.site_manager_id !== currentUser?.id) {
      return false;
    }

    const matchesSearch =
      prj.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prj.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prj.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prj.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || prj.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1C1F23] tracking-tight flex items-center gap-2.5">
            <HardHat className="w-7 h-7 text-[#8E2424]" />
            <span>Gestion des Projets & Portefeuille Chantiers</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Suivi opérationnel, validation des dossiers commerciaux, budgets et affectations des conducteurs de travaux.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "prospection" ? (
            <button
              onClick={() => setShowActivityModal(true)}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Rapport Prospection</span>
            </button>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-bold shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isCommercial ? "Initier un Projet (Commercial)" : "Nouveau Chantier"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("projects")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === "projects"
              ? "border-[#8E2424] text-[#8E2424]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <HardHat className="w-4 h-4" />
          <span>Chantiers & Projets ({filteredProjects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("prospection")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === "prospection"
              ? "border-violet-600 text-violet-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Journal de Prospection Commerciale ({commercialActivities.length})</span>
        </button>
      </div>

      {/* Site Manager Notice */}
      {isSiteManager && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-900">
          <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <strong>Cloisonnement Opérationnel :</strong> En tant que Conducteur de Travaux, vous visualisez exclusivement les chantiers sous votre responsabilité directe.
          </div>
        </div>
      )}

      {/* Commercial Notice */}
      {isCommercial && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-violet-900">
          <Briefcase className="w-5 h-5 text-violet-600 flex-shrink-0" />
          <div>
            <strong>Pôle Commercial :</strong> Vos projets sont enregistrés en attente de validation. L&apos;attribution du conducteur de travaux et le passage en phase opérationnelle sont effectués par l&apos;Administration.
          </div>
        </div>
      )}

      {/* CONTENT TAB 1: PROJECTS */}
      {activeTab === "projects" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par code, client, nom ou lieu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#8E2424] transition"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <Filter className="w-4 h-4 text-slate-400 mr-1" />
              {["all", "in_progress", "completed", "on_hold", "draft"].map((st) => (
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
                    : st === "on_hold"
                    ? "En Attente"
                    : "Brouillon (Commercial)"}
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
              {filteredProjects.map((prj) => {
                const isPendingApproval = prj.approval_status === "pending_approval";

                return (
                  <div
                    key={prj.id}
                    className={`bg-white rounded-2xl p-6 flex flex-col justify-between space-y-4 border transition group ${
                      isPendingApproval
                        ? "border-amber-200 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.1)] bg-amber-50/20"
                        : "border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-[#8E2424] bg-[#8E2424]/10 px-2.5 py-0.5 rounded-lg tracking-wider">
                          {prj.code}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isPendingApproval ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Validation Admin Requise
                            </span>
                          ) : (
                            <StatusBadge status={prj.status} type="project" />
                          )}
                        </div>
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
                          {prj.site_manager?.full_name || (
                            <span className="text-amber-600 font-bold">À désigner</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      {/* Admin Validation Button for Commercial Projects */}
                      {isAdminOrManagement && isPendingApproval && (
                        <button
                          onClick={() => {
                            setProjectToApprove(prj);
                            setAssignedSmId(prj.site_manager_id || "");
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#7BA238] hover:bg-[#6A8D2F] text-white text-[11px] font-bold shadow-sm transition flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Valider & Assigner Conducteur</span>
                        </button>
                      )}

                      <button
                        onClick={() => setProjectToEdit(prj)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-[11px] font-semibold border border-slate-200/60 transition flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3 h-3 text-amber-600" />
                        <span>Modifier</span>
                      </button>

                      {isAdminOrManagement && (
                        <button
                          onClick={() => handleDeleteProject(prj.id, prj.title)}
                          className="px-2 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#8E2424] text-[11px] font-semibold border border-rose-200 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONTENT TAB 2: PROSPECTION COMMERCIALE */}
      {activeTab === "prospection" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-[#1C1F23]">Journal d&apos;Activités & Opportunités Commerciales</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consignation des échanges, rendez-vous clients, visites de chantiers et devis transmis.
                </p>
              </div>
            </div>

            {commercialActivities.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Aucun rapport commercial ou opportunité consigné pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Client / Entreprise</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Objet & Notes</th>
                      <th className="py-3 px-4">Valeur Estimée</th>
                      <th className="py-3 px-4">Prochaine Relance</th>
                      <th className="py-3 px-4">Commercial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {commercialActivities.map((act) => (
                      <tr key={act.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800 uppercase">
                            {act.activity_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {act.client_name}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div>{act.contact_person || "-"}</div>
                          {act.contact_phone && <div className="text-[10px] text-slate-400">{act.contact_phone}</div>}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-semibold text-slate-800">{act.subject}</div>
                          <div className="text-[11px] text-slate-500 truncate">{act.notes}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {Number(act.estimated_deal_value || 0).toLocaleString("fr-FR")} USD
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {act.next_follow_up_date ? formatDate(act.next_follow_up_date) : "-"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {act.commercial?.full_name || "Commercial"}
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

      {/* MODAL 1: NEW PROJECT */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-[#1C1F23] flex items-center gap-2">
                <HardHat className="w-5 h-5 text-[#8E2424]" />
                <span>{isCommercial ? "Initier un Projet (Dossier Commercial)" : "Créer un Nouveau Chantier"}</span>
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isCommercial && (
              <div className="mb-4 p-3 bg-violet-50 border border-violet-200 rounded-xl text-xs text-violet-900">
                <strong>Règle Commerciale :</strong> Votre projet sera enregistré avec le statut <em>En attente d&apos;approbation</em>. L&apos;Admin désignera le Conducteur de travaux lors de la validation officielle.
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Code Chantier (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="ex: PRJ-2026-004"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Devise Principale</label>
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
                <label className="block text-slate-700 font-semibold mb-1">Titre / Désignation de l&apos;Ouvrage *</label>
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
                  <label className="block text-slate-700 font-semibold mb-1">Maître d&apos;Ouvrage / Client *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Société Minière du Katanga"
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Localisation / Ville *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Kolwezi - Site Ruashi"
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
                  {isCommercial ? (
                    <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 italic text-[11px]">
                      Attribution Admin
                    </div>
                  ) : (
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
                  )}
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
                  {saving ? "Enregistrement..." : isCommercial ? "Soumettre pour Validation" : "Créer le Projet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADMIN VALIDATION & SITE MANAGER DESIGNATION */}
      {projectToApprove && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-[#1C1F23] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#7BA238]" />
                <span>Validation du Projet Commercial</span>
              </h2>
              <button onClick={() => setProjectToApprove(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Vous vous apprêtez à valider le projet <strong>{projectToApprove.title}</strong> ({projectToApprove.code}) soumis par le pôle commercial. Veuillez désigner le Conducteur de Travaux responsable du chantier :
            </p>

            <form onSubmit={handleApproveProject} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Désigner le Conducteur de Travaux *</label>
                <select
                  required
                  value={assignedSmId}
                  onChange={(e) => setAssignedSmId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                >
                  <option value="">Sélectionner un conducteur...</option>
                  {siteManagers.map((sm) => (
                    <option key={sm.id} value={sm.id}>
                      {sm.full_name} ({sm.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProjectToApprove(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={approving || !assignedSmId}
                  className="px-5 py-2 rounded-xl bg-[#7BA238] hover:bg-[#6A8D2F] text-white font-bold text-xs transition disabled:opacity-50 shadow-sm"
                >
                  {approving ? "Validation en cours..." : "Valider & Activer le Chantier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT PROJECT */}
      {projectToEdit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-[#1C1F23]">Modifier le Projet ({projectToEdit.code})</h2>
              <button onClick={() => setProjectToEdit(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProject} className="space-y-4 text-xs">
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
                  <label className="block text-slate-700 font-semibold mb-1">Client</label>
                  <input
                    type="text"
                    required
                    value={projectToEdit.client_name}
                    onChange={(e) => setProjectToEdit({ ...projectToEdit, client_name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Localisation</label>
                  <input
                    type="text"
                    required
                    value={projectToEdit.location}
                    onChange={(e) => setProjectToEdit({ ...projectToEdit, location: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Statut du Chantier</label>
                  <select
                    value={projectToEdit.status}
                    onChange={(e) => setProjectToEdit({ ...projectToEdit, status: e.target.value as ProjectStatus })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  >
                    <option value="in_progress">En Cours</option>
                    <option value="on_hold">En Attente</option>
                    <option value="completed">Achevé</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Conducteur de Travaux</label>
                  <select
                    value={projectToEdit.site_manager_id || ""}
                    onChange={(e) => setProjectToEdit({ ...projectToEdit, site_manager_id: e.target.value || null })}
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
                  {editSaving ? "Enregistrement..." : "Enregistrer les Modifications"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: NEW COMMERCIAL ACTIVITY */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-[#1C1F23] flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-violet-600" />
                <span>Nouveau Rapport d&apos;Activité Commerciale</span>
              </h2>
              <button onClick={() => setShowActivityModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Type d&apos;Action *</label>
                  <select
                    value={actType}
                    onChange={(e) => setActType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-violet-600"
                  >
                    <option value="meeting">Réunion Client</option>
                    <option value="site_visit">Visite de Chantier / Site</option>
                    <option value="proposal_sent">Devis / Offre Transmise</option>
                    <option value="call">Appel / Prospection Téléphonique</option>
                    <option value="negotiation">Négociation Tarifaire</option>
                    <option value="follow_up">Relance Commerciale</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Client / Prospect *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Kamoa Copper SA"
                    value={actClientName}
                    onChange={(e) => setActClientName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-violet-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Interlocuteur</label>
                  <input
                    type="text"
                    placeholder="ex: Ing. Directeur Achats"
                    value={actContactPerson}
                    onChange={(e) => setActContactPerson(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-violet-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Téléphone</label>
                  <input
                    type="text"
                    placeholder="+243 99..."
                    value={actPhone}
                    onChange={(e) => setActPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-violet-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="contact@client.cd"
                    value={actEmail}
                    onChange={(e) => setActEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-violet-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Objet de l&apos;Échange *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Discussion devis terrassement zone Nord"
                  value={actSubject}
                  onChange={(e) => setActSubject(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-violet-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Valeur Estimée USD ($)</label>
                  <input
                    type="number"
                    placeholder="ex: 120000"
                    value={actEstimatedValue}
                    onChange={(e) => setActEstimatedValue(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:bg-white focus:outline-none focus:border-violet-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Prochaine Échéance / Relance</label>
                  <input
                    type="date"
                    value={actNextDate}
                    onChange={(e) => setActNextDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-violet-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Compte-rendu / Remarques *</label>
                <textarea
                  rows={3}
                  required
                  value={actNotes}
                  onChange={(e) => setActNotes(e.target.value)}
                  placeholder="Détail des besoins exprimés par le client, prix cibles, attentes techniques..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-violet-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actSaving}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs transition disabled:opacity-50 shadow-sm"
                >
                  {actSaving ? "Enregistrement..." : "Enregistrer le Rapport"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
