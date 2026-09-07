"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ROLES_CONFIG } from "@/lib/rbac";
import { UserRole } from "@/types/database";
import {
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight,
  HardHat,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("SixSigma2026!");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "account_disabled") {
        setErrorMsg("Accès refusé : Ce compte utilisateur a été désactivé par la Direction SI & Gouvernance (Sécurité SoD).");
      }
    }
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message || "Échec de connexion. Vérifiez vos identifiants.");
      setLoading(false);
      return;
    }

    if (data?.user) {
      router.push("/dashboard");
      router.refresh();
    }
  };

  const handleQuickRoleSelect = async (roleKey: UserRole) => {
    const roleObj = ROLES_CONFIG[roleKey];
    setEmail(roleObj.testEmail);
    setPassword("SixSigma2026!");
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: roleObj.testEmail,
      password: "SixSigma2026!",
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    if (data?.user) {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-slate-800/30 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-700 to-rose-900 shadow-xl shadow-red-950/60 border border-red-500/30 mb-4">
          <span className="font-black text-white text-3xl tracking-tighter">6Σ</span>
        </div>
        <h2 className="text-3xl font-black tracking-tight text-white uppercase">
          SIX SIGMA ERP
        </h2>
        <p className="mt-2 text-sm text-slate-400 font-medium italic">
          « La constance dans la qualité »
        </p>
        <p className="text-xs text-slate-500 mt-1">
          BTP • Génie Civil • Construction Métallique • Logistique & Engins
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl z-10 px-4 sm:px-0">
        <div className="bg-[#0F172A] py-8 px-6 shadow-2xl shadow-black/80 rounded-2xl border border-slate-800 sm:px-10">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Adresse Email Professionnelle
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="nom@sixsigma.cd"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Mot de Passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-red-700 to-rose-800 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-950/50 border border-red-600/30 transition duration-150 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Accéder à l&apos;Espace de Gestion</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Accès Rapide par Rôle Métier (1 Clic)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Cliquez sur un profil pour vous connecter instantanément et tester les restrictions RBAC correspondantes :
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(ROLES_CONFIG) as UserRole[]).map((rKey) => {
                const item = ROLES_CONFIG[rKey];
                return (
                  <button
                    key={rKey}
                    type="button"
                    onClick={() => handleQuickRoleSelect(rKey)}
                    disabled={loading}
                    className="flex flex-col text-left p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-red-900/50 transition group"
                  >
                    <span className="text-[11px] font-bold text-slate-200 group-hover:text-red-300 truncate">
                      {item.label}
                    </span>
                    <span className="text-[9px] text-slate-500 truncate mt-0.5">
                      {item.department}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
