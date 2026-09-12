"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile, UserRole } from "@/types/database";
import { formatDate } from "@/lib/utils";
import {
  Users,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  IdCard,
  Briefcase,
  Edit,
  Plus,
  RefreshCw,
  X,
  Phone,
  Mail,
  Calendar,
  ShieldCheck,
} from "lucide-react";

interface WorkersDirectorySectionProps {
  currentUser: Profile | null;
}

export function WorkersDirectorySection({ currentUser }: WorkersDirectorySectionProps) {
  const supabase = createClient();

  const [workers, setWorkers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [contractFilter, setContractFilter] = useState("all");
  const [cutoffFilter, setCutoffFilter] = useState<"all" | "warning" | "expired" | "valid">("all");

  // Edit Worker Modal
  const [editingWorker, setEditingWorker] = useState<Profile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formJobTitle, setFormJobTitle] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("worker");
  const [formContractType, setFormContractType] = useState("CDI");
  const [formContractEndDate, setFormContractEndDate] = useState("");
  const [formIdCardNumber, setFormIdCardNumber] = useState("");
  const [formIdExpiryDate, setFormIdExpiryDate] = useState("");
  const [formBaseSalary, setFormBaseSalary] = useState<number>(0);
  const [formDailyRate, setFormDailyRate] = useState<number>(0);
  const [formTradeCategory, setFormTradeCategory] = useState<string>("Manœuvre");
  const [formPhone, setFormPhone] = useState("");
  const [tradeCategoryFilter, setTradeCategoryFilter] = useState("all");

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      if (error) throw error;
      if (data) {
        setWorkers(data as Profile[]);
      }
    } catch (err: any) {
      showToast("error", "Erreur lors du chargement de la base salariés : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  // Helper Cutoff Status Calculator
  const getCutoffStatus = (dateStr?: string | null, isCdi?: boolean) => {
    if (isCdi && !dateStr) return { status: "valid" as const, days: 999, label: "CDI - Indéterminé" };
    if (!dateStr) return { status: "valid" as const, days: 999, label: "Non renseigné" };

    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: "expired" as const, days: diffDays, label: `Expiré (${Math.abs(diffDays)} j)` };
    }
    if (diffDays <= 30) {
      return { status: "warning" as const, days: diffDays, label: `Cutoff critique (${diffDays} j)` };
    }
    return { status: "valid" as const, days: diffDays, label: `Valide (${diffDays} j)` };
  };

  // Filtered workers
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = w.full_name?.toLowerCase().includes(term);
        const matchMatricule = w.employee_id?.toLowerCase().includes(term);
        const matchEmail = w.email?.toLowerCase().includes(term);
        const matchPhone = w.phone?.toLowerCase().includes(term);
        const matchJob = w.job_title?.toLowerCase().includes(term);

        if (!matchName && !matchMatricule && !matchEmail && !matchPhone && !matchJob) {
          return false;
        }
      }

      // Role filter
      if (roleFilter !== "all" && w.role !== roleFilter) {
        return false;
      }

      // Trade Category Filter
      if (tradeCategoryFilter !== "all" && (w.trade_category || "Manœuvre") !== tradeCategoryFilter) {
        return false;
      }

      // Contract Type
      if (contractFilter !== "all" && (w.contract_type || "CDI") !== contractFilter) {
        return false;
      }

      // Cutoff Filter
      if (cutoffFilter !== "all") {
        const cutoff = getCutoffStatus(w.contract_end_date, w.contract_type === "CDI");
        if (cutoffFilter === "expired" && cutoff.status !== "expired") return false;
        if (cutoffFilter === "warning" && cutoff.status !== "warning") return false;
        if (cutoffFilter === "valid" && cutoff.status !== "valid") return false;
      }

      return true;
    });
  }, [workers, searchTerm, roleFilter, contractFilter, cutoffFilter]);

  // Metrics
  const totalEmployees = workers.length;
  const activeCount = workers.filter((w) => w.is_active !== false).length;
  const cutoffWarningCount = workers.filter((w) => {
    const c = getCutoffStatus(w.contract_end_date, w.contract_type === "CDI");
    return c.status === "warning";
  }).length;
  const expiredCount = workers.filter((w) => {
    const c = getCutoffStatus(w.contract_end_date, w.contract_type === "CDI");
    return c.status === "expired";
  }).length;
  const totalPayrollGross = workers.reduce((acc, w) => acc + (Number(w.base_salary) || 0), 0);

  const openEditModal = (worker: Profile) => {
    setEditingWorker(worker);
    setFormEmployeeId(worker.employee_id || "");
    setFormJobTitle(worker.job_title || "");
    setFormRole(worker.role || "worker");
    setFormContractType(worker.contract_type || "CDI");
    setFormContractEndDate(worker.contract_end_date ? worker.contract_end_date.split("T")[0] : "");
    setFormIdCardNumber(worker.id_card_number || "");
    setFormIdExpiryDate(worker.id_expiry_date ? worker.id_expiry_date.split("T")[0] : "");
    setFormBaseSalary(Number(worker.base_salary) || 0);
    setFormDailyRate(Number(worker.daily_rate) || 0);
    setFormTradeCategory(worker.trade_category || "Manœuvre");
    setFormPhone(worker.phone || "");
    setShowEditModal(true);
  };

  const handleGenerateMatricule = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    setFormEmployeeId(`SS-RH-${year}-${rand}`);
  };

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorker) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          employee_id: formEmployeeId.trim() || null,
          job_title: formJobTitle.trim() || null,
          role: formRole,
          contract_type: formContractType,
          contract_end_date: formContractEndDate ? formContractEndDate : null,
          id_card_number: formIdCardNumber.trim() || null,
          id_expiry_date: formIdExpiryDate ? formIdExpiryDate : null,
          base_salary: formBaseSalary,
          daily_rate: formDailyRate,
          trade_category: formRole === "worker" ? formTradeCategory : null,
          phone: formPhone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingWorker.id);

      if (error) throw error;

      showToast("success", `Dossier RH de ${editingWorker.full_name} mis à jour avec succès.`);
      setShowEditModal(false);
      setEditingWorker(null);
      fetchWorkers();
    } catch (err: any) {
      showToast("error", "Erreur lors de l'enregistrement : " + err.message);
    } finally {
      setSaving(false);
    }
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1C1F23] flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#7BA238]" />
            <span>Base Globale des Salariés & Dossiers RH</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Accès exclusif RH : matricules officiels, contrats de travail, pièces d&apos;identité et alertes cutoff de fin de contrat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchWorkers}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 shadow-xs transition"
            title="Rafraîchir les dossiers"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Effectif Total</span>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#1C1F23]">{totalEmployees}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">{activeCount} collaborateurs en activité</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Cutoff &lt; 30 jours</span>
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-700">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">{cutoffWarningCount}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Renouvellements à anticiper</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#8E2424] uppercase tracking-wider">Contrats Expirés</span>
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-[#8E2424]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#8E2424]">{expiredCount}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Régularisation RH requise</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#7BA238] uppercase tracking-wider">Masse Brute Mensuelle</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-[#7BA238]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#7BA238]">
            {totalPayrollGross.toLocaleString("fr-FR")} USD
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Salaires contractuels cumulés</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, matricule (SS-RH-...), fonction, téléphone..."
              className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#8E2424]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#8E2424]"
            >
              <option value="all">Rôles (Tous)</option>
              <option value="worker">Ouvriers / Journaliers uniquement</option>
              <option value="site_manager">Conducteurs de Travaux</option>
              <option value="supervisor">Chefs de Chantier</option>
              <option value="team_leader">Chefs d&apos;Équipe</option>
              <option value="warehouse_keeper">Magasiniers</option>
              <option value="hr_officer">Ressources Humaines</option>
              <option value="accountant">Comptables</option>
            </select>

            {/* Trade Category */}
            <select
              value={tradeCategoryFilter}
              onChange={(e) => setTradeCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#8E2424]"
            >
              <option value="all">Corps d&apos;État (Tous)</option>
              <option value="Manœuvre">Manœuvre</option>
              <option value="Coffreur">Coffreur</option>
              <option value="Ferrailleur">Ferrailleur</option>
              <option value="Maçon">Maçon</option>
              <option value="Électricien">Électricien</option>
              <option value="Soudeur">Soudeur</option>
              <option value="Plombier">Plombier</option>
              <option value="Peintre">Peintre</option>
              <option value="Topographe">Topographe</option>
              <option value="Mécanicien Engins">Mécanicien Engins</option>
              <option value="Chauffeur / Opérateur">Chauffeur / Opérateur</option>
              <option value="Polyvalent">Polyvalent</option>
            </select>

            {/* Cutoff Filter */}
            <select
              value={cutoffFilter}
              onChange={(e) => setCutoffFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#8E2424]"
            >
              <option value="all">Échéances Contrats (Tous)</option>
              <option value="warning">Alerte Cutoff (&lt; 30 jours)</option>
              <option value="expired">Contrats Déjà Expirés</option>
              <option value="valid">Contrats en Règle</option>
            </select>

            {/* Contract Type */}
            <select
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#8E2424]"
            >
              <option value="all">Type Contrat (Tous)</option>
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="Journalier">Journalier</option>
              <option value="Sous-traitant">Sous-traitant</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Chargement des dossiers salariés...</div>
        ) : filteredWorkers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Aucun salarié ne correspond aux filtres sélectionnés.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Salarié</th>
                  <th className="py-3 px-4">Matricule Officiel</th>
                  <th className="py-3 px-4">Poste & Rôle</th>
                  <th className="py-3 px-4">Type Contrat</th>
                  <th className="py-3 px-4">Échéance & Cutoff</th>
                  <th className="py-3 px-4">Pièce d&apos;Identité</th>
                  <th className="py-3 px-4">Salaire Base</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredWorkers.map((w) => {
                  const cutoff = getCutoffStatus(w.contract_end_date, w.contract_type === "CDI");
                  const idStat = getCutoffStatus(w.id_expiry_date);

                  return (
                    <tr key={w.id} className="hover:bg-slate-50/60 transition">
                      {/* Name, Email, Phone */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#8E2424]/10 text-[#8E2424] flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {w.full_name ? w.full_name.substring(0, 2).toUpperCase() : "AG"}
                          </div>
                          <div>
                            <span className="font-bold text-[#1C1F23] block">{w.full_name}</span>
                            <span className="text-[10px] text-slate-400 block">{w.email}</span>
                            {w.phone && <span className="text-[10px] text-slate-400 block">{w.phone}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Matricule */}
                      <td className="py-3 px-4">
                        {w.employee_id ? (
                          <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200/80">
                            {w.employee_id}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-700 font-semibold italic bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            À générer
                          </span>
                        )}
                      </td>

                      {/* Job title */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {w.job_title || (w.role === "worker" ? w.trade_category || "Ouvrier" : "Non spécifié")}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-slate-400 capitalize">
                            {w.role === "worker" ? "Ouvrier / Journalier" : w.role.replace("_", " ")}
                          </span>
                          {w.role === "worker" && w.trade_category && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              {w.trade_category}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contract Type */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {w.contract_type || "CDI"}
                        </span>
                      </td>

                      {/* Contract Cutoff */}
                      <td className="py-3 px-4">
                        {w.contract_type === "CDI" && !w.contract_end_date ? (
                          <span className="text-[11px] text-slate-500 font-medium">CDI Indéterminé</span>
                        ) : (
                          <div>
                            <span className="text-slate-800 font-mono text-[11px] block">
                              {w.contract_end_date ? formatDate(w.contract_end_date) : "Non renseignée"}
                            </span>
                            <span
                              className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                                cutoff.status === "expired"
                                  ? "bg-rose-50 text-[#8E2424] border border-rose-200"
                                  : cutoff.status === "warning"
                                  ? "bg-amber-50 text-amber-800 border border-amber-300 animate-pulse"
                                  : "bg-emerald-50 text-[#7BA238] border border-emerald-200"
                              }`}
                            >
                              {cutoff.label}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* ID Card */}
                      <td className="py-3 px-4">
                        <span className="text-slate-800 font-mono text-[11px] block">
                          {w.id_card_number || "Non renseigné"}
                        </span>
                        {w.id_expiry_date && (
                          <span className="text-[10px] text-slate-400 block">
                            Exp : {formatDate(w.id_expiry_date)}
                          </span>
                        )}
                      </td>

                      {/* Salary */}
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {w.role === "worker" && Number(w.daily_rate) > 0 ? (
                          <div>
                            <span className="text-emerald-700 font-bold">{Number(w.daily_rate)} USD / jour</span>
                            {Number(w.base_salary) > 0 && (
                              <span className="block text-[10px] text-slate-400 font-normal">
                                Base: {Number(w.base_salary)} USD
                              </span>
                            )}
                          </div>
                        ) : Number(w.base_salary) > 0 ? (
                          <span>{Number(w.base_salary).toLocaleString("fr-FR")} USD</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditModal(w)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition flex items-center gap-1.5 ml-auto"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Éditer RH</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Worker Modal */}
      {showEditModal && editingWorker && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#1C1F23] flex items-center gap-2">
                <Edit className="w-4 h-4 text-[#8E2424]" />
                <span>Mise à Jour Dossier RH : {editingWorker.full_name}</span>
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWorker} className="space-y-4">
              {/* Matricule with auto-generator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Matricule Salarié (SS-RH-YYYY-XXXX)
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateMatricule}
                    className="text-[11px] text-[#8E2424] hover:underline font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Générer Auto</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  placeholder="Ex: SS-RH-2026-0042"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                />
              </div>

              {/* Role & Job Title / Trade Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Rôle Système
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  >
                    <option value="worker">Ouvrier / Journalier (Sans accès direct)</option>
                    <option value="supervisor">Chef de Chantier</option>
                    <option value="team_leader">Chef d&apos;Équipe</option>
                    <option value="site_manager">Conducteur de Travaux</option>
                    <option value="warehouse_keeper">Magasinier</option>
                    <option value="hr_officer">Ressources Humaines</option>
                    <option value="accountant">Comptable</option>
                    <option value="buyer">Acheteur</option>
                    <option value="mechanic">Mécanicien</option>
                    <option value="dispatch">Dispatch / Chauffeur</option>
                    <option value="safety_officer">Responsable QHSE</option>
                    <option value="stewardship">Intendance</option>
                    <option value="commercial">Commercial</option>
                    <option value="company_management">Direction Générale</option>
                    <option value="admin">Super-Administrateur</option>
                  </select>
                </div>

                {formRole === "worker" ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Corps d&apos;État / Métier
                    </label>
                    <select
                      value={formTradeCategory}
                      onChange={(e) => setFormTradeCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                    >
                      <option value="Manœuvre">Manœuvre</option>
                      <option value="Coffreur">Coffreur</option>
                      <option value="Ferrailleur">Ferrailleur</option>
                      <option value="Maçon">Maçon</option>
                      <option value="Électricien">Électricien</option>
                      <option value="Soudeur">Soudeur</option>
                      <option value="Plombier">Plombier</option>
                      <option value="Peintre">Peintre</option>
                      <option value="Topographe">Topographe</option>
                      <option value="Mécanicien Engins">Mécanicien Engins</option>
                      <option value="Chauffeur / Opérateur">Chauffeur / Opérateur</option>
                      <option value="Polyvalent">Polyvalent</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Poste / Fonction
                    </label>
                    <input
                      type="text"
                      value={formJobTitle}
                      onChange={(e) => setFormJobTitle(e.target.value)}
                      placeholder="Ex: Ingénieur Génie Civil"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                    />
                  </div>
                )}
              </div>

              {/* Phone & Daily Rate if worker */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Téléphone Collaborateur
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+243 81..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>

                {formRole === "worker" ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Taux Journalier (USD / jour)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={formDailyRate}
                      onChange={(e) => setFormDailyRate(parseFloat(e.target.value) || 0)}
                      placeholder="Ex: 15"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Type de Contrat
                    </label>
                    <select
                      value={formContractType}
                      onChange={(e) => setFormContractType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                    >
                      <option value="CDI">CDI (Indéterminé)</option>
                      <option value="CDD">CDD (Déterminé)</option>
                      <option value="Journalier">Journalier / Temporaire</option>
                      <option value="Sous-traitant">Sous-traitant / Prestataire</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Contract Type & End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Type de Contrat
                  </label>
                  <select
                    value={formContractType}
                    onChange={(e) => setFormContractType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  >
                    <option value="CDI">CDI (Indéterminé)</option>
                    <option value="CDD">CDD (Déterminé)</option>
                    <option value="Journalier">Journalier / Temporaire</option>
                    <option value="Sous-traitant">Sous-traitant / Prestataire</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Date Fin de Contrat (Cutoff)
                  </label>
                  <input
                    type="date"
                    value={formContractEndDate}
                    onChange={(e) => setFormContractEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
              </div>

              {/* ID Card & ID Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    N° Pièce d&apos;Identité / Passeport
                  </label>
                  <input
                    type="text"
                    value={formIdCardNumber}
                    onChange={(e) => setFormIdCardNumber(e.target.value)}
                    placeholder="Ex: PP-09485743"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Date Expiration Pièce ID
                  </label>
                  <input
                    type="date"
                    value={formIdExpiryDate}
                    onChange={(e) => setFormIdExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
              </div>

              {/* Base Salary */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Salaire de Base Mensuel (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={formBaseSalary}
                  onChange={(e) => setFormBaseSalary(Number(e.target.value))}
                  placeholder="Ex: 850"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Enregistrer les modifications"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
