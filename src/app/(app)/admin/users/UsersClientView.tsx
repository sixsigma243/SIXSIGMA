"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Profile, UserRole } from "@/types/database";
import { ROLES_CONFIG } from "@/lib/rbac";
import {
  createEmployeeAccount,
  updateEmployeeRole,
  toggleEmployeeStatus,
  updateEmployeeCompliance,
  resetEmployeePassword,
  deleteEmployeeAccount,
} from "./actions";
import {
  UserCog,
  UserPlus,
  Users,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Key,
  Calendar,
  Edit3,
  Check,
  X,
  RefreshCw,
  Clock,
  Sparkles,
  Phone,
  Mail,
  Lock,
  Trash2,
} from "lucide-react";

interface UsersClientViewProps {
  initialProfiles: Profile[];
  currentUserId: string;
  currentUserRole?: UserRole;
}

const ROOT_EMAIL = "elyseemudimbi@sixsigma.cd";

export function UsersClientView({
  initialProfiles,
  currentUserId,
  currentUserRole,
}: UsersClientViewProps) {
  const router = useRouter();
  const isAdmin = currentUserRole === "admin";

  // State
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [complianceFilter, setComplianceFilter] = useState<string>("all");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<Profile | null>(null);
  const [selectedUserForCompliance, setSelectedUserForCompliance] = useState<Profile | null>(null);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<Profile | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<Profile | null>(null);

  // Forms state
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "SixSigma2026!",
    role: "supervisor" as UserRole,
    sub_role: "",
    phone: "",
    contract_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    id_expiry_date: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    daily_rate: 0,
    trade_category: "Manœuvre",
  });
  const [legalConsent, setLegalConsent] = useState(false);

  // Edit Role Form
  const [newRole, setNewRole] = useState<UserRole>("supervisor");

  // Edit Compliance & Administrative Form (HR accessible)
  const [complianceForm, setComplianceForm] = useState({
    contract_end_date: "",
    id_expiry_date: "",
    base_salary: 0,
    daily_rate: 0,
    trade_category: "Manœuvre",
    job_title: "",
  });

  // Reset Password Form
  const [newPassword, setNewPassword] = useState("");

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Helper date checker
  const getComplianceStatus = (dateStr?: string | null) => {
    if (!dateStr) return { status: "valid", days: 999 };
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { status: "expired", days: diffDays };
    if (diffDays <= 15) return { status: "warning", days: diffDays };
    return { status: "valid", days: diffDays };
  };

  // Filtered profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchSearch =
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchRole = roleFilter === "all" || p.role === roleFilter;

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && p.is_active !== false) ||
        (statusFilter === "inactive" && p.is_active === false);

      let matchCompliance = true;
      if (complianceFilter !== "all") {
        const contract = getComplianceStatus(p.contract_end_date);
        const idCard = getComplianceStatus(p.id_expiry_date);

        if (complianceFilter === "expired") {
          matchCompliance = contract.status === "expired" || idCard.status === "expired";
        } else if (complianceFilter === "warning") {
          matchCompliance =
            contract.status === "warning" ||
            idCard.status === "warning" ||
            contract.status === "expired" ||
            idCard.status === "expired";
        }
      }

      return matchSearch && matchRole && matchStatus && matchCompliance;
    });
  }, [profiles, searchTerm, roleFilter, statusFilter, complianceFilter]);

  // Pagination (25 agents par page pour fluidité maximale du DOM)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter, complianceFilter]);

  const totalPages = Math.ceil(filteredProfiles.length / ITEMS_PER_PAGE) || 1;
  const paginatedProfiles = useMemo(() => {
    return filteredProfiles.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredProfiles, currentPage]);

  // KPIs
  const totalEmployees = profiles.length;
  const activeCount = profiles.filter((p) => p.is_active !== false).length;
  const inactiveCount = profiles.filter((p) => p.is_active === false).length;
  const distinctRolesCount = new Set(profiles.map((p) => p.role)).size;

  // Handlers
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast("error", "403 Forbidden : Seul un Administrateur Système peut créer un collaborateur.");
      return;
    }
    if (!legalConsent) {
      showToast("error", "Veuillez attester de la conformité de la collecte des données selon le Code du Travail de la RDC.");
      return;
    }

    setLoading(true);

    const emailToUse = createForm.email.includes("@")
      ? createForm.email
      : `${createForm.email.toLowerCase()}@sixsigma.cd`;

    const res = await createEmployeeAccount({
      ...createForm,
      email: emailToUse,
    });

    if (!res.success) {
      showToast("error", res.error || "Erreur lors de la création");
      setLoading(false);
      return;
    }

    showToast("success", `Collaborateur ${createForm.first_name} ${createForm.last_name} créé avec succès.`);
    setShowCreateModal(false);
    setLegalConsent(false);
    setCreateForm({
      first_name: "",
      last_name: "",
      email: "",
      password: "SixSigma2026!",
      role: "supervisor",
      sub_role: "",
      phone: "",
      contract_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      id_expiry_date: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      daily_rate: 0,
      trade_category: "Manœuvre",
    });
    setLoading(false);
    router.refresh();
  };

  const handleToggleStatus = async (userToToggle: Profile) => {
    if (!isAdmin) {
      showToast("error", "403 Forbidden : Action réservée exclusivement à l'Administrateur Système.");
      return;
    }

    if (userToToggle.email === ROOT_EMAIL) {
      showToast("error", "Action interdite : Le compte racine ne peut être désactivé.");
      return;
    }

    const nextState = userToToggle.is_active === false;
    setLoading(true);

    const res = await toggleEmployeeStatus(userToToggle.id, nextState);
    if (!res.success) {
      showToast("error", res.error || "Erreur lors de la mise à jour");
      setLoading(false);
      return;
    }

    setProfiles((prev) =>
      prev.map((p) => (p.id === userToToggle.id ? { ...p, is_active: nextState } : p))
    );

    showToast(
      "success",
      `Statut mis à jour : ${userToToggle.full_name} est désormais ${nextState ? "Actif" : "Désactivé"}.`
    );
    setLoading(false);
    router.refresh();
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast("error", "403 Forbidden : Modification de rôle réservée exclusivement à l'Administrateur Système.");
      return;
    }
    if (!selectedUserForRole) return;
    if (selectedUserForRole.email === ROOT_EMAIL) {
      showToast("error", "Le rôle du compte racine est immuable.");
      return;
    }

    setLoading(true);
    const res = await updateEmployeeRole(selectedUserForRole.id, newRole);

    if (!res.success) {
      showToast("error", res.error || "Erreur lors de la modification de rôle");
      setLoading(false);
      return;
    }

    setProfiles((prev) =>
      prev.map((p) => (p.id === selectedUserForRole.id ? { ...p, role: newRole } : p))
    );

    showToast(
      "success",
      `Rôle mis à jour pour ${selectedUserForRole.full_name} -> ${ROLES_CONFIG[newRole].label}.`
    );
    setSelectedUserForRole(null);
    setLoading(false);
    router.refresh();
  };

  const handleComplianceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForCompliance) return;
    setLoading(true);

    const res = await updateEmployeeCompliance(
      selectedUserForCompliance.id,
      complianceForm.contract_end_date || null,
      complianceForm.id_expiry_date || null,
      {
        base_salary: Number(complianceForm.base_salary) || 0,
        daily_rate: Number(complianceForm.daily_rate) || 0,
        trade_category: complianceForm.trade_category || null,
        job_title: complianceForm.job_title || null,
      }
    );

    if (!res.success) {
      showToast("error", res.error || "Erreur lors de la mise à jour des données administratives");
      setLoading(false);
      return;
    }

    setProfiles((prev) =>
      prev.map((p) =>
        p.id === selectedUserForCompliance.id
          ? {
              ...p,
              contract_end_date: complianceForm.contract_end_date || null,
              id_expiry_date: complianceForm.id_expiry_date || null,
              base_salary: Number(complianceForm.base_salary) || 0,
              daily_rate: Number(complianceForm.daily_rate) || 0,
              trade_category: complianceForm.trade_category || null,
              job_title: complianceForm.job_title || null,
            }
          : p
      )
    );

    showToast(
      "success",
      `Données administratives contractuelles mises à jour pour ${selectedUserForCompliance.full_name}.`
    );
    setSelectedUserForCompliance(null);
    setLoading(false);
    router.refresh();
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast("error", "403 Forbidden : Réinitialisation réservée exclusivement à l'Administrateur Système.");
      return;
    }
    if (!selectedUserForPassword) return;
    setLoading(true);

    const res = await resetEmployeePassword(selectedUserForPassword.id, newPassword);
    if (!res.success) {
      showToast("error", res.error || "Erreur lors de la réinitialisation");
      setLoading(false);
      return;
    }

    showToast("success", `Mot de passe réinitialisé pour ${selectedUserForPassword.full_name}.`);
    setSelectedUserForPassword(null);
    setNewPassword("");
    setLoading(false);
  };

  const handleDeleteSubmit = async () => {
    if (!isAdmin) {
      showToast("error", "403 Forbidden : Suppression définitive réservée à l'Administrateur Système.");
      return;
    }
    if (!selectedUserForDelete) return;

    setLoading(true);
    const res = await deleteEmployeeAccount(selectedUserForDelete.id);

    if (!res.success) {
      showToast("error", res.error || "Erreur lors de la suppression du compte");
      setLoading(false);
      return;
    }

    setProfiles((prev) => prev.filter((p) => p.id !== selectedUserForDelete.id));
    showToast(
      "success",
      `Le compte de ${selectedUserForDelete.full_name} a été supprimé définitivement.`
    );
    setSelectedUserForDelete(null);
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 border transition-all animate-in fade-in slide-in-from-top-4 ${
            notification.type === "success"
              ? "bg-white border-emerald-200 text-emerald-900"
              : "bg-white border-rose-200 text-rose-900"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-[#7BA238] flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-[#8E2424] flex-shrink-0" />
          )}
          <span className="text-xs font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header Banner - Clean Modern SaaS Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#8E2424]/10 text-[#8E2424]">
                Administration Supabase
              </span>
              <span className="text-xs text-slate-400">
                • {isAdmin ? "Mode Super-Admin (Accès Complet & SoD)" : "Mode RH (Consultation & Gestion Administrative)"}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-[#1C1F23] tracking-tight flex items-center gap-2.5">
              <UserCog className="w-6 h-6 text-[#8E2424]" />
              <span>Gestion des Collaborateurs & Rôles Métier</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {isAdmin
                ? "Création des comptes, attribution des 15 rôles opérationnels, coupure de session instantanée et suppression définitive."
                : "Registre du personnel, suivi des échéances de contrats, validité des pièces d'identité et gestion administrative contractuelle."}
            </p>
          </div>

          {/* Create Employee Button - Strictly restricted to Admin */}
          {isAdmin ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white font-semibold text-xs shadow-sm transition active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nouvel Employé</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 text-xs">
              <ShieldCheck className="w-4 h-4 text-[#7BA238]" />
              <span>Création réservée à l&apos;Administrateur Système</span>
            </div>
          )}
        </div>
      </div>

      {/* Metrics KPIs (Slide 02 style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.07)] transition flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Collaborateurs</p>
            <p className="text-2xl lg:text-3xl font-bold text-[#1C1F23] mt-1">{totalEmployees}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Comptes enregistrés</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.07)] transition flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#7BA238] uppercase tracking-wider">Comptes Actifs</p>
            <p className="text-2xl lg:text-3xl font-bold text-[#7BA238] mt-1">{activeCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Sessions autorisées</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#7BA238]/10 text-[#7BA238] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.07)] transition flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#8E2424] uppercase tracking-wider">Comptes Suspendus</p>
            <p className="text-2xl lg:text-3xl font-bold text-[#8E2424] mt-1">{inactiveCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Accès coupé instantanément</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#8E2424]/10 text-[#8E2424] flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.07)] transition flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Rôles Attribués</p>
            <p className="text-2xl lg:text-3xl font-bold text-slate-800 mt-1">
              {distinctRolesCount} <span className="text-xs text-slate-400 font-normal">/ {Object.keys(ROLES_CONFIG).length}</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Matrice SoD BTP</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, email (@sixsigma.cd) ou téléphone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#8E2424] focus:ring-1 focus:ring-[#8E2424] transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 px-3 py-2 focus:bg-white focus:outline-none focus:border-[#8E2424] transition"
          >
            <option value="all">Tous les Rôles ({Object.keys(ROLES_CONFIG).length})</option>
            {(Object.keys(ROLES_CONFIG) as UserRole[]).map((rKey) => (
              <option key={rKey} value={rKey}>
                {ROLES_CONFIG[rKey].label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 px-3 py-2 focus:bg-white focus:outline-none focus:border-[#8E2424] transition"
          >
            <option value="all">Tous Statuts</option>
            <option value="active">Actifs Uniquement</option>
            <option value="inactive">Suspendus / Inactifs</option>
          </select>

          {/* Compliance Filter */}
          <select
            value={complianceFilter}
            onChange={(e) => setComplianceFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 px-3 py-2 focus:bg-white focus:outline-none focus:border-[#8E2424] transition"
          >
            <option value="all">Conformité RH (Tous)</option>
            <option value="warning">Échéance &lt; 15 jours</option>
            <option value="expired">Contrat ou ID Expiré</option>
          </select>
        </div>
      </div>

      {/* Employees Table (Slide 03 Data Table) */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="px-5 py-4">Collaborateur</th>
                <th className="px-4 py-4">Matricule</th>
                <th className="px-4 py-4">Rôle & Département</th>
                <th className="px-4 py-4">Statut Session</th>
                <th className="px-4 py-4">Fin de Contrat</th>
                <th className="px-4 py-4">Validité Pièce ID</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    Aucun collaborateur ne correspond aux critères de recherche.
                  </td>
                </tr>
              ) : (
                paginatedProfiles.map((user) => {
                  const roleCfg = ROLES_CONFIG[user.role] || ROLES_CONFIG.supervisor;
                  const contractStat = getComplianceStatus(user.contract_end_date);
                  const idStat = getComplianceStatus(user.id_expiry_date);
                  const isRoot = user.email === ROOT_EMAIL;
                  const isSelf = user.id === currentUserId;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/60 transition">
                      {/* Name & Email with Circular Avatar */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#8E2424]/10 text-[#8E2424] border border-[#8E2424]/20 flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                            {user.first_name ? user.first_name[0] : ""}
                            {user.last_name ? user.last_name[0] : ""}
                          </div>
                          <div>
                            <div className="font-bold text-[#1C1F23] flex items-center gap-1.5">
                              <span>{user.full_name || `${user.first_name} ${user.last_name}`}</span>
                              {isRoot && (
                                <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-bold uppercase">
                                  Racine
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 text-[11px] font-mono flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="text-slate-400 text-[10px] flex items-center gap-1 mt-0.5">
                                <Phone className="w-2.5 h-2.5" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Matricule Badge */}
                      <td className="px-4 py-4">
                        {user.employee_id ? (
                          <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200/80">
                            {user.employee_id}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Non assigné</span>
                        )}
                      </td>

                      {/* Role & Dept Pastel Pill */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            {roleCfg.label}
                          </span>
                          {user.role === "worker" && user.trade_category && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {user.trade_category}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 font-medium flex items-center gap-2">
                          <span>{roleCfg.department}</span>
                          {user.role === "worker" && Number(user.daily_rate) > 0 && (
                            <span className="font-mono text-emerald-600 font-semibold">
                              ({Number(user.daily_rate)} USD/j)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Session: Interactive toggle for Admin, Static Read-Only badge for HR */}
                      <td className="px-4 py-4">
                        {isAdmin ? (
                          <button
                            onClick={() => handleToggleStatus(user)}
                            disabled={isRoot || loading}
                            title={isRoot ? "Compte racine protégé" : "Cliquer pour basculer le statut"}
                            className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition flex items-center gap-1.5 ${
                              user.is_active !== false
                                ? "bg-emerald-50 text-[#7BA238] border-emerald-200/60 hover:bg-emerald-100"
                                : "bg-rose-50 text-[#8E2424] border-rose-200/60 hover:bg-rose-100"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                user.is_active !== false ? "bg-[#7BA238]" : "bg-[#8E2424]"
                              }`}
                            />
                            <span>{user.is_active !== false ? "Actif" : "Suspendu"}</span>
                          </button>
                        ) : (
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-[11px] font-semibold border items-center gap-1.5 ${
                              user.is_active !== false
                                ? "bg-emerald-50 text-[#7BA238] border-emerald-200/60"
                                : "bg-rose-50 text-[#8E2424] border-rose-200/60"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                user.is_active !== false ? "bg-[#7BA238]" : "bg-[#8E2424]"
                              }`}
                            />
                            <span>{user.is_active !== false ? "Actif" : "Suspendu"}</span>
                          </span>
                        )}
                      </td>

                      {/* Contract End Date */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-700 text-xs">
                            {user.contract_end_date ? new Date(user.contract_end_date).toLocaleDateString("fr-FR") : "—"}
                          </span>
                          {contractStat.status === "expired" && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[#8E2424] text-[9px] font-bold uppercase">
                              Expiré
                            </span>
                          )}
                          {contractStat.status === "warning" && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-bold uppercase">
                              {contractStat.days}j
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ID Expiry Date */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-700 text-xs">
                            {user.id_expiry_date ? new Date(user.id_expiry_date).toLocaleDateString("fr-FR") : "—"}
                          </span>
                          {idStat.status === "expired" && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[#8E2424] text-[9px] font-bold uppercase">
                              Expirée
                            </span>
                          )}
                          {idStat.status === "warning" && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-bold uppercase">
                              {idStat.days}j
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions: Strict SoD separation */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Change Role: STRICTLY ADMIN */}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setSelectedUserForRole(user);
                                setNewRole(user.role);
                              }}
                              disabled={isRoot}
                              title={isRoot ? "Rôle racine protégé" : "Changer de rôle métier"}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200/60 transition disabled:opacity-40"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Compliance & Administrative Details: Accessible to RH & Admin */}
                          <button
                            onClick={() => {
                              setSelectedUserForCompliance(user);
                              setComplianceForm({
                                contract_end_date: user.contract_end_date || "",
                                id_expiry_date: user.id_expiry_date || "",
                                base_salary: user.base_salary || 0,
                                daily_rate: user.daily_rate || 0,
                                trade_category: user.trade_category || "Manœuvre",
                                job_title: user.job_title || "",
                              });
                            }}
                            title="Mettre à jour les données administratives contractuelles"
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200/60 transition"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password: STRICTLY ADMIN */}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setSelectedUserForPassword(user);
                                setNewPassword("");
                              }}
                              title="Réinitialiser le mot de passe"
                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200/60 transition"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Account Permanently: STRICTLY ADMIN */}
                          {isAdmin && !isRoot && !isSelf && (
                            <button
                              onClick={() => setSelectedUserForDelete(user)}
                              title="Supprimer définitivement le compte"
                              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#8E2424] hover:text-rose-900 border border-rose-200/60 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Affichage de <strong className="text-slate-800 font-semibold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> à{" "}
            <strong className="text-slate-800 font-semibold">
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredProfiles.length)}
            </strong>{" "}
            sur <strong className="text-slate-800 font-semibold">{filteredProfiles.length}</strong> collaborateur(s)
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-xs font-semibold transition"
              >
                Précédent
              </button>

              <span className="px-3 py-1.5 font-mono font-bold text-xs text-slate-700 bg-white border border-slate-200 rounded-lg">
                Page {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-xs font-semibold transition"
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: CREATE EMPLOYEE */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 text-[#1C1F23]">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-full bg-[#8E2424]/10 text-[#8E2424] flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1C1F23] tracking-tight">
                  Création d&apos;un Nouveau Collaborateur
                </h3>
                <p className="text-xs text-slate-500">
                  Le compte sera créé dans Supabase Auth et synchronisé dans le répertoire RH.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={createForm.first_name}
                    onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                    placeholder="ex: Patrick"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#8E2424] focus:ring-1 focus:ring-[#8E2424]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={createForm.last_name}
                    onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                    placeholder="ex: Kalala"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#8E2424] focus:ring-1 focus:ring-[#8E2424]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email Professionnel *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="p.kalala@sixsigma.cd"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#8E2424] focus:ring-1 focus:ring-[#8E2424] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Mot de Passe Initial *</label>
                  <input
                    type="text"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#8E2424] focus:ring-1 focus:ring-[#8E2424] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Rôle Métier (Matrice SoD) *</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424] focus:ring-1 focus:ring-[#8E2424]"
                >
                  {(Object.keys(ROLES_CONFIG) as UserRole[]).map((rKey) => (
                    <option key={rKey} value={rKey}>
                      {ROLES_CONFIG[rKey].label} — {ROLES_CONFIG[rKey].department}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1 italic">
                  {ROLES_CONFIG[createForm.role]?.description}
                </p>
              </div>

              {/* Worker Specific Fields */}
              {createForm.role === "worker" && (
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Spécificités Effectif Ouvrier / Journalier (Sans accès applicatif direct)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">Corps d&apos;État / Métier</label>
                      <select
                        value={createForm.trade_category}
                        onChange={(e) => setCreateForm({ ...createForm, trade_category: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#8E2424]"
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
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">Taux Journalier (USD / jour)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={createForm.daily_rate}
                        onChange={(e) => setCreateForm({ ...createForm, daily_rate: parseFloat(e.target.value) || 0 })}
                        placeholder="Ex: 15"
                        className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#8E2424]"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-amber-800 leading-tight">
                    * Ce collaborateur n&apos;aura pas d&apos;accès direct à l&apos;ERP. Ses présences et rémunérations sont suivies via le module de pointage chantier et la réconciliation RH.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Fin de Contrat RH</label>
                  <input
                    type="date"
                    value={createForm.contract_end_date}
                    onChange={(e) => setCreateForm({ ...createForm, contract_end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Expiration Pièce ID</label>
                  <input
                    type="date"
                    value={createForm.id_expiry_date}
                    onChange={(e) => setCreateForm({ ...createForm, id_expiry_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
              </div>

              {/* Informed Consent Checkbox according to DRC Labor Code */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={legalConsent}
                    onChange={(e) => setLegalConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#8E2424] focus:ring-[#8E2424]"
                  />
                  <span className="text-[11px] leading-relaxed text-slate-700">
                    J&apos;atteste que la collecte de ces données est conforme au Code du Travail de la RDC et à la politique interne de protection des données de SIX SIGMA SARL.
                  </span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setLegalConsent(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || !legalConsent}
                  className="px-5 py-2 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Enregistrer le Collaborateur</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHANGE ROLE */}
      {selectedUserForRole && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in fade-in zoom-in-95 text-[#1C1F23]">
            <button
              onClick={() => setSelectedUserForRole(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-[#1C1F23] tracking-tight mb-1 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-[#8E2424]" />
              Modifier le Rôle Métier
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Collaborateur : <span className="font-bold text-slate-800">{selectedUserForRole.full_name}</span>
            </p>

            <form onSubmit={handleRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                  Sélectionnez le nouveau rôle (14 rôles disponibles)
                </label>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {(Object.keys(ROLES_CONFIG) as UserRole[]).map((rKey) => {
                    const item = ROLES_CONFIG[rKey];
                    const isSelected = newRole === rKey;

                    return (
                      <div
                        key={rKey}
                        onClick={() => setNewRole(rKey)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? "bg-[#8E2424]/10 border-[#8E2424] text-[#8E2424] font-semibold"
                            : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold">{item.label}</div>
                          <div className="text-[10px] text-slate-500">{item.department}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#8E2424]" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedUserForRole(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirmer le Changement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: COMPLIANCE & ADMINISTRATIVE DETAILS (HR & ADMIN) */}
      {selectedUserForCompliance && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative animate-in fade-in zoom-in-95 text-[#1C1F23]">
            <button
              onClick={() => setSelectedUserForCompliance(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-[#1C1F23] tracking-tight mb-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              Données Administratives & Conformité RH
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Collaborateur : <span className="font-bold text-slate-800">{selectedUserForCompliance.full_name}</span> (
              <span className="font-mono">{selectedUserForCompliance.email}</span>)
            </p>

            <form onSubmit={handleComplianceSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Fin de Contrat RH
                  </label>
                  <input
                    type="date"
                    value={complianceForm.contract_end_date}
                    onChange={(e) => setComplianceForm({ ...complianceForm, contract_end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Validité Pièce d&apos;Identité
                  </label>
                  <input
                    type="date"
                    value={complianceForm.id_expiry_date}
                    onChange={(e) => setComplianceForm({ ...complianceForm, id_expiry_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Intitulé du Poste / Métier
                  </label>
                  <input
                    type="text"
                    value={complianceForm.job_title}
                    onChange={(e) => setComplianceForm({ ...complianceForm, job_title: e.target.value })}
                    placeholder="Ex: Conducteur d'engins"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Corps d&apos;État / Spécialité
                  </label>
                  <select
                    value={complianceForm.trade_category}
                    onChange={(e) => setComplianceForm({ ...complianceForm, trade_category: e.target.value })}
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
                    <option value="Cadre / Maîtrise">Cadre / Maîtrise</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Salaire de Base Mensuel (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={complianceForm.base_salary}
                    onChange={(e) => setComplianceForm({ ...complianceForm, base_salary: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Taux Journalier (USD / jour)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={complianceForm.daily_rate}
                    onChange={(e) => setComplianceForm({ ...complianceForm, daily_rate: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedUserForCompliance(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Enregistrer les Données RH</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: RESET PASSWORD (STRICTLY ADMIN) */}
      {selectedUserForPassword && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in fade-in zoom-in-95 text-[#1C1F23]">
            <button
              onClick={() => setSelectedUserForPassword(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-[#1C1F23] tracking-tight mb-1 flex items-center gap-2">
              <Key className="w-4 h-4 text-[#8E2424]" />
              Réinitialiser le Mot de Passe
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Pour : <span className="font-bold text-slate-800">{selectedUserForPassword.full_name}</span> ({selectedUserForPassword.email})
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Nouveau Mot de Passe (min. 6 caractères)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nouveau mot de passe fort"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#8E2424] focus:ring-1 focus:ring-[#8E2424] font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedUserForPassword(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || newPassword.length < 6}
                  className="px-4 py-2 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Appliquer le Mot de Passe</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: DELETE EMPLOYEE ACCOUNT (STRICTLY ADMIN) */}
      {selectedUserForDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in fade-in zoom-in-95 text-[#1C1F23]">
            <button
              onClick={() => setSelectedUserForDelete(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-[#8E2424] flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1C1F23] tracking-tight">
                  Supprimer Définitivement le Compte
                </h3>
                <p className="text-xs text-slate-500">Action irréversible réservée à l&apos;Administrateur</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80 mb-4 text-xs text-rose-900 space-y-2">
              <p>
                Êtes-vous certain de vouloir supprimer définitivement le compte de{" "}
                <strong className="font-bold">{selectedUserForDelete.full_name}</strong> (
                <span className="font-mono">{selectedUserForDelete.email}</span>) ?
              </p>
              <p className="text-[11px] text-rose-700">
                Cette action supprimera l&apos;utilisateur de Supabase Auth et nettoiera son profil dans la base de données. L&apos;opération sera consignée dans les journaux d&apos;audit.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedUserForDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleDeleteSubmit}
                className="px-4 py-2 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Confirmer la Suppression</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
