"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Profile, UserRole } from "@/types/database";
import { ROLES_CONFIG } from "@/lib/rbac";
import {
  createEmployeeAccount,
  updateEmployeeRole,
  toggleEmployeeStatus,
  updateEmployeeCompliance,
  resetEmployeePassword,
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
} from "lucide-react";

interface UsersClientViewProps {
  initialProfiles: Profile[];
  currentUserId: string;
}

const ROOT_EMAIL = "elyseemudimbi@sixsigma.cd";

export function UsersClientView({ initialProfiles, currentUserId }: UsersClientViewProps) {
  const router = useRouter();

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
  });

  // Edit Role Form
  const [newRole, setNewRole] = useState<UserRole>("supervisor");

  // Edit Compliance Form
  const [complianceForm, setComplianceForm] = useState({
    contract_end_date: "",
    id_expiry_date: "",
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

  // KPIs
  const totalEmployees = profiles.length;
  const activeCount = profiles.filter((p) => p.is_active !== false).length;
  const inactiveCount = profiles.filter((p) => p.is_active === false).length;
  const distinctRolesCount = new Set(profiles.map((p) => p.role)).size;

  // Handlers
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    });
    setLoading(false);
    router.refresh();
  };

  const handleToggleStatus = async (user: Profile) => {
    if (user.email === ROOT_EMAIL) {
      showToast("error", "Le compte Super-Administrateur racine ne peut pas être désactivé.");
      return;
    }

    const newStatus = user.is_active === false;
    const confirmMsg = newStatus
      ? `Réactiver l'accès pour ${user.full_name} ?`
      : `Désactiver le compte de ${user.full_name} ? Sa session active sera immédiatement détruite.`;

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    const res = await toggleEmployeeStatus(user.id, newStatus);

    if (!res.success) {
      showToast("error", res.error || "Erreur de modification du statut");
      setLoading(false);
      return;
    }

    setProfiles((prev) =>
      prev.map((p) => (p.id === user.id ? { ...p, is_active: newStatus } : p))
    );

    showToast(
      "success",
      newStatus
        ? `Compte de ${user.full_name} réactivé avec succès.`
        : `Compte de ${user.full_name} désactivé. Session immédiatement verrouillée.`
    );
    setLoading(false);
    router.refresh();
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForRole) return;
    setLoading(true);

    const res = await updateEmployeeRole(selectedUserForRole.id, newRole);
    if (!res.success) {
      showToast("error", res.error || "Erreur de changement de rôle");
      setLoading(false);
      return;
    }

    setProfiles((prev) =>
      prev.map((p) => (p.id === selectedUserForRole.id ? { ...p, role: newRole } : p))
    );

    showToast("success", `Rôle de ${selectedUserForRole.full_name} mis à jour : ${ROLES_CONFIG[newRole].label}.`);
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
      complianceForm.id_expiry_date || null
    );

    if (!res.success) {
      showToast("error", res.error || "Erreur lors de la mise à jour des dates");
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
            }
          : p
      )
    );

    showToast("success", `Dates de conformité RH mises à jour pour ${selectedUserForCompliance.full_name}.`);
    setSelectedUserForCompliance(null);
    setLoading(false);
    router.refresh();
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 border transition-all animate-in fade-in slide-in-from-top-4 ${
            notification.type === "success"
              ? "bg-emerald-950/90 border-emerald-700 text-emerald-200"
              : "bg-rose-950/90 border-rose-700 text-rose-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-900/50 text-purple-300 border border-purple-700">
                Direction SI & Gouvernance
              </span>
              <span className="text-xs text-slate-500">• Administration Supabase</span>
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <UserCog className="w-7 h-7 text-rose-500" />
              Gestion des Collaborateurs & Rôles Métier
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Création des comptes d&apos;accès, affectation des 14 rôles opérationnels, coupure de session instantanée et conformité RH.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-rose-800 hover:from-red-600 hover:to-rose-700 text-white font-semibold text-sm shadow-lg shadow-red-950/40 border border-red-600/30 transition transform active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nouvel Employé</span>
          </button>
        </div>
      </div>

      {/* Metrics KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Collaborateurs</p>
            <p className="text-2xl font-black text-white mt-1">{totalEmployees}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Comptes enregistrés</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Comptes Actifs</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{activeCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Sessions autorisées</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-950/50 border border-emerald-800 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Comptes Désactivés</p>
            <p className="text-2xl font-black text-rose-400 mt-1">{inactiveCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Accès coupé par middleware</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-950/50 border border-rose-800 flex items-center justify-center text-rose-400">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Rôles Attribués</p>
            <p className="text-2xl font-black text-purple-400 mt-1">{distinctRolesCount} <span className="text-xs text-slate-500 font-normal">/ 14</span></p>
            <p className="text-[11px] text-slate-500 mt-0.5">Matrice SoD BTP</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-950/50 border border-purple-800 flex items-center justify-center text-purple-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, email (@sixsigma.cd) ou téléphone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
          >
            <option value="all">Tous les Rôles (14)</option>
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
            className="bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
          >
            <option value="all">Tous Statuts</option>
            <option value="active">Actifs Uniquement</option>
            <option value="inactive">Désactivés</option>
          </select>

          {/* Compliance Filter */}
          <select
            value={complianceFilter}
            onChange={(e) => setComplianceFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
          >
            <option value="all">Conformité RH (Tous)</option>
            <option value="warning">Échéance &lt; 15 jours</option>
            <option value="expired">Contrat ou ID Expiré</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-4">Collaborateur</th>
                <th className="px-4 py-4">Rôle & Département</th>
                <th className="px-4 py-4">Statut Session</th>
                <th className="px-4 py-4">Fin de Contrat</th>
                <th className="px-4 py-4">Validité Pièce ID</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    Aucun collaborateur ne correspond aux critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((user) => {
                  const roleCfg = ROLES_CONFIG[user.role] || ROLES_CONFIG.supervisor;
                  const contractStat = getComplianceStatus(user.contract_end_date);
                  const idStat = getComplianceStatus(user.id_expiry_date);
                  const isRoot = user.email === ROOT_EMAIL;

                  return (
                    <tr key={user.id} className="hover:bg-slate-800/40 transition">
                      {/* Name & Email */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center font-bold text-white shadow">
                            {user.first_name ? user.first_name[0] : ""}
                            {user.last_name ? user.last_name[0] : ""}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{user.full_name || `${user.first_name} ${user.last_name}`}</span>
                              {isRoot && (
                                <span className="px-1.5 py-0.2 rounded bg-purple-950 border border-purple-700 text-purple-300 text-[9px] font-black uppercase">
                                  Racine
                                </span>
                              )}
                            </div>
                            <div className="text-slate-400 text-[11px] font-mono flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span>{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="text-slate-500 text-[10px] flex items-center gap-1 mt-0.5">
                                <Phone className="w-2.5 h-2.5" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role & Dept */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${roleCfg.badgeColor}`}
                        >
                          {roleCfg.label}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1 font-medium">
                          {roleCfg.department}
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={isRoot || loading}
                          title={isRoot ? "Compte racine protégé" : "Cliquer pour basculer le statut"}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold border transition flex items-center gap-1.5 ${
                            user.is_active !== false
                              ? "bg-emerald-950/60 text-emerald-300 border-emerald-700 hover:bg-emerald-900/60"
                              : "bg-rose-950/60 text-rose-300 border-rose-700 hover:bg-rose-900/60"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              user.is_active !== false ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
                            }`}
                          />
                          <span>{user.is_active !== false ? "Actif" : "Désactivé"}</span>
                        </button>
                      </td>

                      {/* Contract End Date */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-200">
                            {user.contract_end_date ? new Date(user.contract_end_date).toLocaleDateString("fr-FR") : "—"}
                          </span>
                          {contractStat.status === "expired" && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-950 border border-rose-700 text-rose-400 text-[9px] font-black uppercase">
                              Expiré
                            </span>
                          )}
                          {contractStat.status === "warning" && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-400 text-[9px] font-black uppercase">
                              {contractStat.days}j
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ID Expiry Date */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-200">
                            {user.id_expiry_date ? new Date(user.id_expiry_date).toLocaleDateString("fr-FR") : "—"}
                          </span>
                          {idStat.status === "expired" && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-950 border border-rose-700 text-rose-400 text-[9px] font-black uppercase">
                              Expirée
                            </span>
                          )}
                          {idStat.status === "warning" && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-400 text-[9px] font-black uppercase">
                              {idStat.days}j
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Change Role */}
                          <button
                            onClick={() => {
                              setSelectedUserForRole(user);
                              setNewRole(user.role);
                            }}
                            disabled={isRoot}
                            title={isRoot ? "Rôle racine protégé" : "Changer de rôle métier"}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition disabled:opacity-40"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Compliance Dates */}
                          <button
                            onClick={() => {
                              setSelectedUserForCompliance(user);
                              setComplianceForm({
                                contract_end_date: user.contract_end_date || "",
                                id_expiry_date: user.id_expiry_date || "",
                              });
                            }}
                            title="Modifier les échéances RH"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => {
                              setSelectedUserForPassword(user);
                              setNewPassword("");
                            }}
                            title="Réinitialiser le mot de passe"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CREATE EMPLOYEE */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800 text-red-400 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Création d&apos;un Nouveau Collaborateur
                </h3>
                <p className="text-xs text-slate-400">
                  Le compte sera créé dans Supabase Auth et synchronisé dans le répertoire RH.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={createForm.first_name}
                    onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                    placeholder="ex: Patrick"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={createForm.last_name}
                    onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                    placeholder="ex: Kalala"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Email Professionnel *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="p.kalala@sixsigma.cd"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Mot de Passe Initial *</label>
                  <input
                    type="text"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Rôle Métier (Matrice SoD) *</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  {(Object.keys(ROLES_CONFIG) as UserRole[]).map((rKey) => (
                    <option key={rKey} value={rKey}>
                      {ROLES_CONFIG[rKey].label} — {ROLES_CONFIG[rKey].department}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1 italic">
                  {ROLES_CONFIG[createForm.role]?.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Fin de Contrat RH</label>
                  <input
                    type="date"
                    value={createForm.contract_end_date}
                    onChange={(e) => setCreateForm({ ...createForm, contract_end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Expiration Pièce ID</label>
                  <input
                    type="date"
                    value={createForm.id_expiry_date}
                    onChange={(e) => setCreateForm({ ...createForm, id_expiry_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-700 to-rose-800 hover:from-red-600 hover:to-rose-700 text-white text-xs font-bold shadow-lg shadow-red-950/40 border border-red-600/30 transition disabled:opacity-50 flex items-center gap-2"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedUserForRole(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-white uppercase tracking-tight mb-1 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-purple-400" />
              Modifier le Rôle Métier
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Collaborateur : <span className="font-bold text-white">{selectedUserForRole.full_name}</span>
            </p>

            <form onSubmit={handleRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
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
                            ? "bg-purple-950/60 border-purple-600 text-white shadow"
                            : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs">{item.label}</div>
                          <div className="text-[10px] text-slate-500">{item.department}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForRole(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirmer le Changement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: COMPLIANCE DATES */}
      {selectedUserForCompliance && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedUserForCompliance(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-white uppercase tracking-tight mb-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              Dates de Conformité RH
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Pour : <span className="font-bold text-white">{selectedUserForCompliance.full_name}</span>
            </p>

            <form onSubmit={handleComplianceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Date de Fin de Contrat de Travail
                </label>
                <input
                  type="date"
                  value={complianceForm.contract_end_date}
                  onChange={(e) => setComplianceForm({ ...complianceForm, contract_end_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Date d&apos;Expiration de la Pièce d&apos;Identité
                </label>
                <input
                  type="date"
                  value={complianceForm.id_expiry_date}
                  onChange={(e) => setComplianceForm({ ...complianceForm, id_expiry_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForCompliance(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Mettre à Jour</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: RESET PASSWORD */}
      {selectedUserForPassword && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedUserForPassword(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-white uppercase tracking-tight mb-1 flex items-center gap-2">
              <Key className="w-4 h-4 text-red-500" />
              Réinitialiser le Mot de Passe
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Pour : <span className="font-bold text-white">{selectedUserForPassword.full_name}</span> ({selectedUserForPassword.email})
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Nouveau Mot de Passe (min. 6 caractères)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nouveau mot de passe fort"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-600 font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForPassword(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || newPassword.length < 6}
                  className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Appliquer le Nouveau Mot de Passe</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
