"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Profile } from "@/types/database";
import { ROLES_CONFIG } from "@/lib/rbac";
import { Edit3, X, Check, RefreshCw, AlertCircle } from "lucide-react";

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

  return (
    <>
      <header className="h-14 bg-[#14171B] border-b border-[#252932] px-6 flex items-center justify-between sticky top-0 z-20 select-none">
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <span className="text-slate-500 font-semibold tracking-wider uppercase text-[11px]">
            SIX SIGMA
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-white font-semibold">{getBreadcrumbTitle()}</span>
        </div>

        {/* Right Toolbar */}
        <div className="flex items-center gap-4">
          {/* Currency Exchange Rate Ticker */}
          {isAdmin ? (
            <button
              onClick={handleOpenModal}
              title="Ajuster le taux officiel BCC (Super-Admin)"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0E1116] hover:bg-[#1C1F23] border border-[#252932] hover:border-[#8E2424]/60 text-xs font-mono text-slate-300 transition cursor-pointer shadow-sm active:scale-95"
            >
              <span className="text-slate-400 font-sans text-[11px]">Taux BCC :</span>
              <span className="font-semibold text-white">
                1 USD = {rate.toLocaleString("fr-FR")} CDF
              </span>
              <Edit3 className="w-3 h-3 text-slate-500 hover:text-white ml-0.5 transition" />
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0E1116] border border-[#252932] text-xs font-mono text-slate-300">
              <span className="text-slate-400 font-sans text-[11px]">Taux BCC :</span>
              <span className="font-semibold text-white">
                1 USD = {rate.toLocaleString("fr-FR")} CDF
              </span>
            </div>
          )}

          {/* User Info Badge */}
          <div className="flex items-center gap-3 pl-3 border-l border-[#252932]">
            <div className="w-8 h-8 rounded-lg bg-[#1C1F23] flex items-center justify-center text-xs font-semibold text-slate-300 border border-[#252932]">
              {profile?.first_name?.[0] || "E"}
              {profile?.last_name?.[0] || "M"}
            </div>
            <div className="hidden sm:block text-right">
              <div className="text-xs font-semibold text-slate-200">
                {profile?.full_name || "Elysée Mudimbi"}
              </div>
              <div className="text-[10px] text-[#94A3B8]">
                {isAdmin ? "Super-Admin" : roleInfo.label}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 border transition-all animate-in fade-in slide-in-from-top-4 ${
            toast.type === "success"
              ? "bg-[#14171D] border-[#7BA238] text-[#A5CE5B]"
              : "bg-[#14171D] border-[#8E2424] text-[#E58585]"
          }`}
        >
          {toast.type === "success" ? (
            <Check className="w-4 h-4 text-[#7BA238]" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#E58585]" />
          )}
          <span className="text-xs font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white p-1 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Admin Exchange Rate Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14171D] border border-[#252932] rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in fade-in zoom-in-95 space-y-4">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#252932] pb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Taux de Référence Officiel (BCC)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Conversion opérationnelle USD / Francs Congolais (CDF)
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveRate} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Taux de change (1 USD en CDF)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                    1 USD =
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    placeholder="2850"
                    className="w-full pl-20 pr-14 py-2.5 bg-[#0E1116] border border-[#252932] rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-[#8E2424]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                    CDF
                  </span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Paliers Rapides
                </span>
                <div className="flex items-center gap-2">
                  {[2800, 2850, 2900, 3000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRateInput(String(val))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition ${
                        rateInput === String(val)
                          ? "bg-[#1C2129] border-[#8E2424] text-white"
                          : "bg-[#0E1116] border-[#252932] text-slate-400 hover:text-white"
                      }`}
                    >
                      {val.toLocaleString("fr-FR")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0E1116] border border-[#252932] text-[11px] text-slate-400 space-y-1">
                <p>
                  • Ce taux sera appliqué aux conversions automatiques (dépenses caisse, seuils de validation, valorisation de stocks).
                </p>
                <p>
                  • Chaque modification est consignée dans le registre d&apos;audit.
                </p>
              </div>

              <div className="pt-3 border-t border-[#252932] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#1C1F23] hover:bg-[#252932] text-slate-300 text-xs font-medium transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-semibold border border-[#8E2424] transition disabled:opacity-50 flex items-center gap-2"
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
    </>
  );
}
