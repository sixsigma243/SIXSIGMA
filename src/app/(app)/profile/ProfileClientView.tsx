"use client";

import React, { useState, useTransition } from "react";
import { Profile } from "@/types/database";
import { ROLES_CONFIG } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import { updatePasswordAction, updateContactAction } from "./actions";
import {
  Shield,
  KeyRound,
  User,
  BadgeCheck,
  Calendar,
  CreditCard,
  Briefcase,
  Building2,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  FileText,
  Save,
} from "lucide-react";

interface ProfileClientViewProps {
  currentUser: Profile;
  userEmail: string;
}

export function ProfileClientView({ currentUser, userEmail }: ProfileClientViewProps) {
  const roleConfig = ROLES_CONFIG[currentUser.role] || ROLES_CONFIG.supervisor;

  // Password form states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Contact info state
  const [phone, setPhone] = useState(currentUser.phone || "");
  const [isContactPending, startContactTransition] = useTransition();
  const [contactNotification, setContactNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Real-time password criteria
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid =
    hasMinLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecialChar &&
    passwordsMatch;

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNotification(null);

    if (!isPasswordValid) {
      setNotification({
        type: "error",
        message: "Veuillez respecter tous les critères de robustesse du mot de passe.",
      });
      return;
    }

    const formData = new FormData();
    formData.append("currentPassword", currentPassword);
    formData.append("newPassword", newPassword);
    formData.append("confirmPassword", confirmPassword);

    startTransition(async () => {
      const res = await updatePasswordAction(null, formData);
      if (res.success) {
        setNotification({
          type: "success",
          message: res.message || "Mot de passe modifié avec succès.",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setNotification({
          type: "error",
          message: res.error || "Une erreur est survenue.",
        });
      }
    });
  };

  const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setContactNotification(null);

    const formData = new FormData();
    formData.append("phone", phone);

    startContactTransition(async () => {
      const res = await updateContactAction(null, formData);
      if (res.success) {
        setContactNotification({
          type: "success",
          message: res.message || "Coordonnées mises à jour.",
        });
      } else {
        setContactNotification({
          type: "error",
          message: res.error || "Échec de la mise à jour.",
        });
      }
    });
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "SS";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8E2424] to-[#B33939] text-white font-bold text-xl flex items-center justify-center shadow-lg shadow-[#8E2424]/20 flex-shrink-0">
              {getInitials(currentUser.full_name)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-[#1C1F23]">
                  {currentUser.full_name}
                </h1>
                {currentUser.is_active ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3" /> Compte Actif
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    Inactif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-700">
                  {currentUser.job_title || roleConfig.label}
                </span>
                <span>•</span>
                <span className="font-mono text-[#8E2424] font-bold">
                  {currentUser.employee_id || "SS-RH-XXXX"}
                </span>
                <span>•</span>
                <span>{currentUser.sub_role || roleConfig.department}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-right">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Privilège Système
              </span>
              <span className="text-xs font-bold text-slate-800">
                {currentUser.role === "admin" ? "Super-Administrateur" : roleConfig.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Columns Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Contrat & Données Administratives (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Briefcase className="w-4 h-4 text-[#8E2424]" />
              <h2 className="text-sm font-bold text-[#1C1F23]">
                Affectation & Contrat de Travail
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  Matricule RH
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {currentUser.employee_id || "Non assigné"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Département
                </span>
                <span className="font-semibold text-slate-700">
                  {currentUser.sub_role || roleConfig.department}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Type de Contrat
                </span>
                <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-700">
                  {currentUser.contract_type || "CDI"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Échéance Contrat
                </span>
                <span className="font-medium text-slate-700">
                  {formatDate(currentUser.contract_end_date)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  Validité Pièce d&apos;Identité
                </span>
                <span className="font-medium text-slate-700">
                  {formatDate(currentUser.id_expiry_date)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Email de connexion
                </span>
                <span className="font-mono text-slate-700 text-[11px] truncate max-w-[200px]" title={userEmail}>
                  {userEmail}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Update Form */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Phone className="w-4 h-4 text-[#8E2424]" />
              <h2 className="text-sm font-bold text-[#1C1F23]">
                Coordonnées de Contact
              </h2>
            </div>

            {contactNotification && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  contactNotification.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                {contactNotification.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{contactNotification.message}</span>
              </div>
            )}

            <form onSubmit={handleContactSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Numéro de Téléphone Professionnel
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+243 81 000 0000"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#8E2424]/20 focus:border-[#8E2424] transition font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isContactPending}
                className="w-full py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isContactPending ? "Enregistrement..." : "Enregistrer Contact"}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Sécurité & Changement de Mot de Passe (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#8E2424]/10 text-[#8E2424]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1C1F23]">
                    Changement de Mot de Passe (Self-Service)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Modifiez votre mot de passe d&apos;accès en toute autonomie et sécurité.
                  </p>
                </div>
              </div>
              <Shield className="w-5 h-5 text-slate-300" />
            </div>

            {notification && (
              <div
                className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-3 animate-in fade-in ${
                  notification.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                {notification.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                )}
                <span>{notification.message}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* 1. Mot de passe actuel */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mot de passe actuel <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Saisissez votre mot de passe actuel"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 pr-10 focus:outline-hidden focus:ring-2 focus:ring-[#8E2424]/20 focus:border-[#8E2424] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* 2. Nouveau mot de passe */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nouveau mot de passe <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 caractères, majuscule, chiffre, spécial"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 pr-10 focus:outline-hidden focus:ring-2 focus:ring-[#8E2424]/20 focus:border-[#8E2424] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* 3. Confirmation du nouveau mot de passe */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirmer le nouveau mot de passe <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Retapez à l'identique le nouveau mot de passe"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 pr-10 focus:outline-hidden focus:ring-2 focus:ring-[#8E2424]/20 focus:border-[#8E2424] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Checklist de Sécurité & Robustesse */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider">
                  Critères de Sécurité Obligatoires :
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? "text-emerald-600" : "text-slate-300"}`} />
                    <span>Au moins 8 caractères</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUppercase ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasUppercase ? "text-emerald-600" : "text-slate-300"}`} />
                    <span>Une lettre majuscule (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLowercase ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasLowercase ? "text-emerald-600" : "text-slate-300"}`} />
                    <span>Une lettre minuscule (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasNumber ? "text-emerald-600" : "text-slate-300"}`} />
                    <span>Au moins un chiffre (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasSpecialChar ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasSpecialChar ? "text-emerald-600" : "text-slate-300"}`} />
                    <span>Un caractère spécial (!@#$...)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordsMatch ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${passwordsMatch ? "text-emerald-600" : "text-slate-300"}`} />
                    <span>Mots de passe identiques</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending || !isPasswordValid || !currentPassword}
                  className="w-full py-3 px-4 rounded-xl bg-[#8E2424] hover:bg-[#781E1E] text-white text-xs font-bold shadow-md shadow-[#8E2424]/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {isPending ? "Mise à jour en cours..." : "Mettre à jour mon mot de passe"}
                  </span>
                </button>
              </div>
            </form>

            <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
              <span className="font-bold block mb-0.5">Charte de Confidentialité & Sécurité du SI :</span>
              Tout changement de mot de passe est immédiatement journalisé dans l&apos;audit trail de gouvernance avec horodatage certifié. Ne partagez jamais vos identifiants d&apos;accès.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
