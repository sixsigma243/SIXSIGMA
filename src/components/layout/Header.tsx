"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Profile } from "@/types/database";
import { ROLES_CONFIG } from "@/lib/rbac";
import { Edit3, X, Check, RefreshCw, Search, Bell } from "lucide-react";
import { NotificationDrawer } from "./NotificationDrawer";
import { GlobalSearchModal } from "./GlobalSearchModal";

interface HeaderProps {
  profile: Profile | null;
}

export function Header({ profile }: HeaderProps) {
  const pathname = usePathname();
  const userRole = profile?.role || "supervisor";
  const roleInfo = ROLES_CONFIG[userRole] || ROLES_CONFIG.supervisor;
  const isAdmin = userRole === "admin";

  const [rate, setRate] = useState<number>(2850);
  const [showModal, setShowModal] = useState(false);
  const [rateInput, setRateInput] = useState<string>("2850");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Notifications and Search states
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Global shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearch((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch current exchange rate from API / database
  useEffect(() => {
    async function loadRate() {
      try {
        const res = await fetch("/api/settings/exchange-rate");
        if (res.ok) {
          const data = await res.json();
          if (data?.rate) {
            setRate(Number(data.rate));
            setRateInput(String(data.rate));
          }
        }
      } catch (err) {
        console.error("Failed to load exchange rate:", err);
      }
    }
    loadRate();
  }, []);

  const getBreadcrumbTitle = () => {
    if (!pathname || pathname === "/dashboard") return "Tableau de Bord";
    if (pathname.startsWith("/projects")) return "Chantiers & Projets";
    if (pathname.startsWith("/field-reports")) return "Journaux de Chantier";
    if (pathname.startsWith("/attendance")) return "Pointage & RH";
    if (pathname.startsWith("/requisitions")) return "Réquisitions DRI";
    if (pathname.startsWith("/inventory")) return "Stocks & Magasin";
    if (pathname.startsWith("/finance")) return "Trésorerie & Caisse";
    if (pathname.startsWith("/fleet")) return "Flotte & Engins";
    if (pathname.startsWith("/audit")) return "Gouvernance & Audit";
    if (pathname.startsWith("/admin/users")) return "Administration Employés";
    if (pathname.startsWith("/profile")) return "Mon Profil & Sécurité";
    return "Système";
  };

  const handleOpenModal = () => {
    if (!isAdmin) return;
    setRateInput(String(rate));
    setShowModal(true);
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(rateInput);
    if (isNaN(parsed) || parsed <= 0) {
      setToast({ type: "error", message: "Veuillez saisir un taux valide supérieur à 0." });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/exchange-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate: parsed }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRate(parsed);
        setShowModal(false);
        setToast({
          type: "success",
          message: `Nouveau taux de référence appliqué : 1 USD = ${parsed.toLocaleString("fr-FR")} CDF`,
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("exchange-rate-updated", { detail: parsed }));
        }
      } else {
        setToast({ type: "error", message: data.error || "Échec de l'enregistrement." });
      }
    } catch (err: any) {
      setToast({ type: "error", message: "Erreur réseau : " + err.message });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "EM";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-20 select-none shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-2.5 text-xs font-medium text-slate-400">
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
            SIX SIGMA
          </span>
          <span className="text-slate-300">/</span>
          <span className="text-[#1C1F23] font-bold text-sm">{getBreadcrumbTitle()}</span>
        </div>

        {/* Center/Right Toolbar */}
        <div className="flex items-center gap-4">
          {/* Quick Search Trigger (Cmd+K) */}
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="hidden md:flex items-center relative w-48 lg:w-64 pl-9 pr-8 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200/70 text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer text-left"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <span>Rechercher...</span>
            <span className="text-[10px] font-mono text-slate-400 absolute right-2.5 bg-white px-1.5 py-0.5 rounded border border-slate-200/80 shadow-xs">
              ⌘K
            </span>
          </button>

          {/* Currency Exchange Rate Ticker */}
          {isAdmin ? (
            <button
              onClick={handleOpenModal}
              title="Ajuster le taux officiel BCC (Super-Admin)"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 hover:border-[#8E2424]/40 text-xs font-mono text-slate-700 transition cursor-pointer shadow-xs active:scale-95"
            >
              <span className="text-slate-400 font-sans text-[11px] font-medium">BCC :</span>
              <span className="font-bold text-slate-900">
                1 USD = {rate.toLocaleString("fr-FR")} CDF
              </span>
              <Edit3 className="w-3 h-3 text-slate-400 hover:text-[#8E2424] ml-0.5 transition-colors" />
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-mono text-slate-700">
              <span className="text-slate-400 font-sans text-[11px] font-medium">BCC :</span>
              <span className="font-bold text-slate-900">
                1 USD = {rate.toLocaleString("fr-FR")} CDF
              </span>
            </div>
          )}

          {/* Notifications Icon Button */}
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            title="Activités & Mouvements"
            className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-[#8E2424] border border-slate-200/70 flex items-center justify-center transition-colors relative cursor-pointer active:scale-95"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 ? (
              <span className="min-w-[16px] h-4 px-1 rounded-full bg-[#8E2424] text-white text-[9px] font-bold flex items-center justify-center absolute -top-1 -right-1 ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-300 absolute top-2 right-2 ring-2 ring-white" />
            )}
          </button>

          {/* User Avatar Badge Linked to /profile */}
          <Link
            href="/profile"
            className="flex items-center gap-2.5 pl-2 border-l border-slate-100 hover:opacity-80 transition group"
            title="Mon Profil & Sécurité (Changer mon mot de passe)"
          >
            <div className="w-8 h-8 rounded-full bg-[#8E2424]/10 text-[#8E2424] font-bold text-xs flex items-center justify-center border border-[#8E2424]/20 shadow-xs group-hover:border-[#8E2424]/50">
              {getInitials(profile?.full_name)}
            </div>
            <div className="hidden lg:block text-left leading-tight">
              <div className="text-xs font-semibold text-slate-900 group-hover:text-[#8E2424] transition-colors">
                {profile?.full_name || "Elysée Mudimbi"}
              </div>
              <div className="text-[10px] text-slate-400">
                {isAdmin ? "Super-Admin" : roleInfo.label}
              </div>
            </div>
          </Link>
        </div>
      </header>

      {/* Floating Notification Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom-3 ${
            toast.type === "success"
              ? "bg-white border-[#7BA238]/40 text-slate-800"
              : "bg-white border-rose-200 text-rose-800"
          }`}
        >
          {toast.type === "success" ? (
            <Check className="w-4 h-4 text-[#7BA238] flex-shrink-0" />
          ) : (
            <X className="w-4 h-4 text-rose-500 flex-shrink-0" />
          )}
          <span className="font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 p-1 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Admin Exchange Rate Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in fade-in zoom-in-95 space-y-4">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">
                Taux de Référence Officiel (BCC)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Conversion opérationnelle USD / Francs Congolais (CDF)
              </p>
            </div>

            <form onSubmit={handleSaveRate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Taux de change (1 USD en CDF)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                    1 USD =
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    placeholder="2850"
                    className="w-full pl-20 pr-14 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#8E2424] focus:ring-1 focus:ring-[#8E2424]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-medium text-slate-500">
                    CDF
                  </span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-1.5">
                  Paliers Rapides
                </span>
                <div className="flex items-center gap-2">
                  {[2800, 2850, 2900, 3000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRateInput(String(val))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium border transition ${
                        rateInput === String(val)
                          ? "bg-[#8E2424]/10 border-[#8E2424] text-[#8E2424] font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {val.toLocaleString("fr-FR")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 space-y-1">
                <p>
                  • Ce taux sera appliqué aux conversions automatiques (dépenses caisse, seuils de validation, valorisation de stocks).
                </p>
                <p>
                  • Chaque modification est consignée dans le registre d&apos;audit.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
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
                  className="px-5 py-2 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {saving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Appliquer le Taux</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Search Command Palette Modal */}
      <GlobalSearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
      />

      {/* Notification Drawer Panel */}
      <NotificationDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onUnreadCountChange={setUnreadCount}
      />
    </>
  );
}
