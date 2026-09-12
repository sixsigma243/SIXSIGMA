"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { HrRequest, HrRequestType, HrRequestStatus, Profile } from "@/types/database";
import { formatDate } from "@/lib/utils";
import {
  Inbox,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  UserPlus,
  TrendingUp,
  ShieldAlert,
  Search,
  Filter,
  User,
  X,
  Scale,
  Eye,
  MessageSquare,
} from "lucide-react";

interface HrRequestsSectionProps {
  currentUser: Profile | null;
}

const TYPE_CONFIG: Record<
  HrRequestType,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  sanction: {
    label: "Sanction Disciplinaire",
    badgeClass: "bg-rose-50 text-[#8E2424] border-rose-200",
    icon: ShieldAlert,
  },
  recruitment: {
    label: "Demande de Recrutement",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    icon: UserPlus,
  },
  promotion: {
    label: "Proposition de Promotion",
    badgeClass: "bg-emerald-50 text-[#7BA238] border-emerald-200",
    icon: TrendingUp,
  },
  contract_termination: {
    label: "Résiliation de Contrat",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    icon: AlertTriangle,
  },
  inquiry: {
    label: "Signalement / Enquête",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    icon: MessageSquare,
  },
};

const STATUS_CONFIG: Record<
  HrRequestStatus,
  { label: string; badgeClass: string }
> = {
  submitted: {
    label: "Soumis / En attente",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  under_review: {
    label: "En cours d'examen",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  approved: {
    label: "Approuvé / Validé",
    badgeClass: "bg-emerald-50 text-[#7BA238] border-emerald-200",
  },
  rejected: {
    label: "Rejeté / Sans suite",
    badgeClass: "bg-rose-50 text-[#8E2424] border-rose-200",
  },
};

export function HrRequestsSection({ currentUser }: HrRequestsSectionProps) {
  const supabase = createClient();

  const [requests, setRequests] = useState<HrRequest[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filters
  const [scopeTab, setScopeTab] = useState<"all" | "my">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // New Request Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formType, setFormType] = useState<HrRequestType>("sanction");
  const [formTargetUserId, setFormTargetUserId] = useState<string>("");
  const [formSubject, setFormSubject] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // Decision Modal (for HR / Admin)
  const [selectedRequest, setSelectedRequest] = useState<HrRequest | null>(null);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionReport, setDecisionReport] = useState("");
  const [hrOpinion, setHrOpinion] = useState("");
  const [decisionAction, setDecisionAction] = useState<HrRequestStatus>("approved");
  const [savingDecision, setSavingDecision] = useState(false);

  // View Details Modal (for standard users)
  const [viewRequest, setViewRequest] = useState<HrRequest | null>(null);

  const isHrOrAdmin =
    currentUser?.role === "hr_officer" ||
    currentUser?.role === "admin" ||
    currentUser?.role === "company_management";

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch profiles for resolution
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, phone, employee_id, job_title")
        .order("full_name");

      if (profs) setProfiles(profs as Profile[]);

      // 2. Fetch requests
      let query = supabase
        .from("hr_requests")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: reqs, error } = await query;
      if (error) throw error;

      if (reqs) {
        setRequests(reqs as HrRequest[]);
      }
    } catch (err: any) {
      showToast("error", "Erreur de chargement des requêtes RH : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const profilesMap = useMemo(() => {
    const map = new Map<string, Profile>();
    profiles.forEach((p) => map.set(p.id, p));
    return map;
  }, [profiles]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Scope filter
      if (scopeTab === "my" && r.sender_id !== currentUser?.id) {
        return false;
      }
      if (!isHrOrAdmin && r.sender_id !== currentUser?.id) {
        return false;
      }

      // Type filter
      if (typeFilter !== "all" && r.type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && r.status !== statusFilter) {
        return false;
      }

      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const sender = profilesMap.get(r.sender_id);
        const target = r.target_user_id ? profilesMap.get(r.target_user_id) : null;

        const matchSubject = r.subject.toLowerCase().includes(term);
        const matchDesc = r.description.toLowerCase().includes(term);
        const matchSender = sender?.full_name.toLowerCase().includes(term);
        const matchTarget = target?.full_name.toLowerCase().includes(term) || target?.employee_id?.toLowerCase().includes(term);

        if (!matchSubject && !matchDesc && !matchSender && !matchTarget) {
          return false;
        }
      }

      return true;
    });
  }, [requests, scopeTab, typeFilter, statusFilter, searchTerm, currentUser, isHrOrAdmin, profilesMap]);

  // KPI stats
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === "submitted" || r.status === "under_review").length;
  const sanctionsCount = requests.filter((r) => r.type === "sanction" || r.type === "contract_termination").length;
  const promotionsCount = requests.filter((r) => r.type === "promotion" || r.type === "recruitment").length;

  // Submit New Request
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!formSubject.trim() || !formDescription.trim()) {
      showToast("error", "Veuillez renseigner le titre et la description détaillée.");
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from("hr_requests").insert({
        sender_id: currentUser.id,
        target_user_id: formTargetUserId ? formTargetUserId : null,
        type: formType,
        subject: formSubject.trim(),
        description: formDescription.trim(),
        status: "submitted",
      });

      if (error) throw error;

      showToast("success", "Votre requête a été soumise avec succès au pôle Ressources Humaines.");
      setShowCreateModal(false);
      setFormSubject("");
      setFormDescription("");
      setFormTargetUserId("");
      setFormType("sanction");
      fetchData();
    } catch (err: any) {
      showToast("error", "Erreur lors de la soumission : " + err.message);
    } finally {
      setCreating(false);
    }
  };

  // Submit Decision (HR / Admin)
  const handleSaveDecision = async () => {
    if (!selectedRequest || !currentUser) return;

    if (decisionAction === "approved" || decisionAction === "rejected") {
      if (!decisionReport.trim()) {
        showToast("error", "Le rapport de décision motivé est obligatoire pour acter la décision.");
        return;
      }
    }

    setSavingDecision(true);
    try {
      const { error } = await supabase
        .from("hr_requests")
        .update({
          status: decisionAction,
          hr_opinion: hrOpinion.trim() || null,
          decision_report: decisionReport.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      showToast("success", `Décision RH consignée avec succès (Statut : ${STATUS_CONFIG[decisionAction].label}).`);
      setShowDecisionModal(false);
      setSelectedRequest(null);
      setDecisionReport("");
      setHrOpinion("");
      fetchData();
    } catch (err: any) {
      showToast("error", "Erreur de consignation : " + err.message);
    } finally {
      setSavingDecision(false);
    }
  };

  const openDecisionModal = (req: HrRequest) => {
    setSelectedRequest(req);
    setHrOpinion(req.hr_opinion || "");
    setDecisionReport(req.decision_report || "");
    setDecisionAction(req.status === "submitted" ? "under_review" : req.status);
    setShowDecisionModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-lg border transition animate-in fade-in ${
            notification.type === "success"
              ? "bg-emerald-50 text-[#7BA238] border-emerald-200"
              : "bg-rose-50 text-[#8E2424] border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1C1F23] flex items-center gap-2">
            <Inbox className="w-5 h-5 text-[#8E2424]" />
            <span>Boîte de Réception RH & Signalements Internes</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralisation des demandes de recrutement, sanctions disciplinaires, promotions et résiliations avec consignation du rapport de décision motivé.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-semibold shadow-sm transition flex items-center gap-2 active:scale-95"
        >
          <Send className="w-4 h-4" />
          <span>Émettre une Requête RH</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Requêtes</span>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#1C1F23]">{totalCount}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Flux global RH</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">En attente / Examen</span>
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">{pendingCount}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Nécessite arbitrage RH</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#8E2424] uppercase tracking-wider">Sanctions & Résiliations</span>
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-[#8E2424]">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#8E2424]">{sanctionsCount}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Signalements disciplinaires</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#7BA238] uppercase tracking-wider">Promotions & Recrutements</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-[#7BA238]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#7BA238]">{promotionsCount}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Évolution des compétences</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Scope Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            {isHrOrAdmin && (
              <button
                onClick={() => setScopeTab("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  scopeTab === "all"
                    ? "bg-[#8E2424] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Toutes les requêtes ({requests.length})
              </button>
            )}
            <button
              onClick={() => setScopeTab("my")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                scopeTab === "my" || !isHrOrAdmin
                  ? "bg-[#8E2424] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Mes requêtes émises (
              {requests.filter((r) => r.sender_id === currentUser?.id).length}
              )
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par objet, agent, collaborateur..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#8E2424]"
            />
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtres :</span>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#8E2424]"
          >
            <option value="all">Tous les types de requêtes</option>
            <option value="sanction">Sanction Disciplinaire</option>
            <option value="promotion">Proposition de Promotion</option>
            <option value="recruitment">Demande de Recrutement</option>
            <option value="contract_termination">Résiliation de Contrat</option>
            <option value="inquiry">Signalement / Enquête</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#8E2424]"
          >
            <option value="all">Tous les statuts</option>
            <option value="submitted">Soumis / En attente</option>
            <option value="under_review">En cours d&apos;examen</option>
            <option value="approved">Approuvé</option>
            <option value="rejected">Rejeté</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Chargement de la boîte de réception RH...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Aucune requête RH trouvée selon les critères sélectionnés.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Type & Date</th>
                  <th className="py-3 px-4">Émetteur (Demandeur)</th>
                  <th className="py-3 px-4">Collaborateur Concerné</th>
                  <th className="py-3 px-4">Objet de la Demande</th>
                  <th className="py-3 px-4">Statut RH</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRequests.map((req) => {
                  const typeCfg = TYPE_CONFIG[req.type] || TYPE_CONFIG.inquiry;
                  const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.submitted;
                  const sender = profilesMap.get(req.sender_id);
                  const targetUser = req.target_user_id ? profilesMap.get(req.target_user_id) : null;
                  const Icon = typeCfg.icon;

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/60 transition">
                      {/* Type & Date */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${typeCfg.badgeClass}`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{typeCfg.label}</span>
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          Émis le {formatDate(req.created_at)}
                        </span>
                      </td>

                      {/* Sender */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#1C1F23] block">
                          {sender?.full_name || "Agent Inconnu"}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {sender?.role ? sender.role.replace("_", " ") : "Personnel"}
                        </span>
                      </td>

                      {/* Target User */}
                      <td className="py-3 px-4">
                        {targetUser ? (
                          <div>
                            <span className="font-semibold text-slate-800 block">{targetUser.full_name}</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              {targetUser.employee_id && (
                                <span className="text-[9px] font-mono font-bold bg-slate-100 px-1 py-0.5 rounded text-slate-600">
                                  {targetUser.employee_id}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400">{targetUser.job_title || targetUser.role}</span>
                            </div>
                          </div>
                        ) : req.type === "recruitment" ? (
                          <span className="text-[11px] text-sky-700 italic font-medium">Poste à pourvoir / Recrutement</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Subject & snippet */}
                      <td className="py-3 px-4 max-w-xs">
                        <span className="font-bold text-[#1C1F23] block truncate">{req.subject}</span>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{req.description}</p>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.badgeClass}`}>
                          {statusCfg.label}
                        </span>
                        {req.decision_report && (
                          <span className="block text-[9px] text-[#7BA238] font-semibold mt-1">
                            Rapport motivé consigné
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isHrOrAdmin ? (
                          <button
                            onClick={() => openDecisionModal(req)}
                            className="px-3 py-1.5 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 ml-auto active:scale-95"
                          >
                            <Scale className="w-3.5 h-3.5" />
                            <span>Examiner & Statuer</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setViewRequest(req)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Voir le Suivi</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Create Request (All staff) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#1C1F23] flex items-center gap-2">
                <Send className="w-5 h-5 text-[#8E2424]" />
                <span>Soumettre une Requête RH / Signalement</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Type de Requête *
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as HrRequestType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-[#8E2424]"
                >
                  <option value="sanction">Sanction Disciplinaire (faute, avertissement, mise à pied)</option>
                  <option value="promotion">Proposition de Promotion / Montée en grade</option>
                  <option value="recruitment">Demande de Recrutement (renfort équipe/chantier)</option>
                  <option value="contract_termination">Demande de Résiliation de Contrat</option>
                  <option value="inquiry">Signalement interne / Demande d&apos;enquête</option>
                </select>
              </div>

              {formType !== "recruitment" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Collaborateur / Salarié Concerné
                  </label>
                  <select
                    value={formTargetUserId}
                    onChange={(e) => setFormTargetUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  >
                    <option value="">Sélectionnez un employé (optionnel)...</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.employee_id || "Sans matricule"} - {p.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Objet / Motif *
                </label>
                <input
                  type="text"
                  required
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="Ex: Faute lourde : abandon de poste répété sur le chantier KCC"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description Circonstanciée des Faits *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Détaillez précisément les faits, dates, témoins ou justification managériale..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {creating ? "Transmission en cours..." : "Transmettre aux RH"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: HR / Admin Decision & Report */}
      {showDecisionModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#1C1F23] flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#8E2424]" />
                <span>Examen & Arbitrage Décisionnel RH</span>
              </h3>
              <button
                onClick={() => setShowDecisionModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Request Summary Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#8E2424]">
                  {TYPE_CONFIG[selectedRequest.type]?.label}
                </span>
                <span className="text-slate-400">{formatDate(selectedRequest.created_at)}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Demandeur : </span>
                <strong className="text-slate-800">
                  {profilesMap.get(selectedRequest.sender_id)?.full_name || "Inconnu"}
                </strong>
              </div>
              {selectedRequest.target_user_id && (
                <div>
                  <span className="text-slate-500 font-semibold">Employé ciblé : </span>
                  <strong className="text-slate-800">
                    {profilesMap.get(selectedRequest.target_user_id)?.full_name} (
                    {profilesMap.get(selectedRequest.target_user_id)?.employee_id})
                  </strong>
                </div>
              )}
              <div className="pt-1">
                <span className="text-slate-500 font-semibold block mb-0.5">Objet : </span>
                <div className="font-bold text-[#1C1F23]">{selectedRequest.subject}</div>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block mb-0.5">Faits exposés : </span>
                <div className="text-slate-700 whitespace-pre-wrap bg-white p-2.5 rounded-lg border border-slate-200/80">
                  {selectedRequest.description}
                </div>
              </div>
            </div>

            {/* Decision Form */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Décision RH à Notifier *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecisionAction("under_review")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      decisionAction === "under_review"
                        ? "bg-blue-50 border-blue-400 text-blue-700"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>En Examen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecisionAction("approved")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      decisionAction === "approved"
                        ? "bg-emerald-50 border-emerald-400 text-[#7BA238]"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approuver</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecisionAction("rejected")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      decisionAction === "rejected"
                        ? "bg-rose-50 border-rose-400 text-[#8E2424]"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Rejeter</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Avis Technique RH
                </label>
                <textarea
                  rows={2}
                  value={hrOpinion}
                  onChange={(e) => setHrOpinion(e.target.value)}
                  placeholder="Appréciation du pôle RH (vérification antécédents, conformité convention collective)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rapport de Décision Motivé (Obligatoire pour validation / rejet) *
                </label>
                <textarea
                  rows={4}
                  value={decisionReport}
                  onChange={(e) => setDecisionReport(e.target.value)}
                  placeholder="Consignation formelle de la motivation légale et administrative (ex: application art. 72 du Code du Travail RDC, mise en demeure préalable, sanction notifiée)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDecisionModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={handleSaveDecision}
                disabled={savingDecision}
                className="px-4 py-2 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {savingDecision ? "Consignation..." : "Enregistrer la Décision RH"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: View Request Details for regular users */}
      {viewRequest && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#1C1F23]">Suivi de la Requête RH</h3>
              <button onClick={() => setViewRequest(null)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#8E2424]">{TYPE_CONFIG[viewRequest.type]?.label}</span>
                <span className={`px-2 py-0.5 rounded-full font-bold border ${STATUS_CONFIG[viewRequest.status]?.badgeClass}`}>
                  {STATUS_CONFIG[viewRequest.status]?.label}
                </span>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-0.5">Objet :</span>
                <div className="font-bold text-slate-800">{viewRequest.subject}</div>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-0.5">Faits signalés :</span>
                <div className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 whitespace-pre-wrap">
                  {viewRequest.description}
                </div>
              </div>

              {viewRequest.hr_opinion && (
                <div>
                  <span className="text-slate-500 font-semibold block mb-0.5">Avis du Pôle RH :</span>
                  <div className="text-slate-700 bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
                    {viewRequest.hr_opinion}
                  </div>
                </div>
              )}

              {viewRequest.decision_report && (
                <div>
                  <span className="text-slate-500 font-semibold block mb-0.5">Rapport de Décision Motivé :</span>
                  <div className="text-slate-800 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200 font-medium">
                    {viewRequest.decision_report}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 text-right">
              <button
                onClick={() => setViewRequest(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
