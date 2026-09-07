"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  HardHat,
  Truck,
  Building2,
  Users,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "account_disabled") {
        setErrorMsg(
          "Accès révoqué : Votre compte a été désactivé par la Direction SI & Gouvernance. Veuillez contacter le support interne."
        );
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const emailToUse = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: password.trim(),
    });

    if (error) {
      setErrorMsg(
        error.message === "Invalid login credentials"
          ? "Identifiants invalides. Vérifiez votre adresse email et votre mot de passe."
          : error.message
      );
      setLoading(false);
      return;
    }

    if (data?.user) {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0B0F17] text-slate-200 select-none">
      {/* 1. LEFT PANEL: Industrial Branding & Enterprise Pillars (Split-Screen 55%) */}
      <div className="relative lg:w-[55%] flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Real Engineering Site Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/construction-bg.jpg"
            alt="Chantier de génie civil et infrastructure minière SIX SIGMA"
            fill
            priority
            className="object-cover object-center"
          />
          {/* Elegant Dark Industrial Overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/85 to-slate-900/80" />
          {/* Subtle Grid Texture */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        {/* Top: Header Identity */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-900 border border-rose-700/80 flex items-center justify-center font-black text-white text-xl tracking-tight shadow-md">
              6Σ
            </div>
            <div>
              <span className="text-base font-black tracking-wider uppercase text-white font-mono">
                SIX SIGMA
              </span>
              <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">
                Génie Civil • Mines • Équipements
              </span>
            </div>
          </div>
        </div>

        {/* Center: Mission & Official Slogan */}
        <div className="relative z-10 my-10 lg:my-auto max-w-xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900/90 border border-slate-700/80 text-rose-400 text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            <span>ERP Opérationnel • RDC</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
              « La constance dans la qualité »
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed font-normal">
              Système unifié de gestion des chantiers de génie civil, de la logistique d&apos;engins lourds, du négoce technique et de la gouvernance d&apos;entreprise.
            </p>
          </div>

          {/* 4 Pillars Grid (Compact & Human-Made) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/90 flex items-start gap-3">
              <Building2 className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wide">Génie Civil</h4>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">Ouvrages d&apos;art, voiries et plateformes industrielles.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/90 flex items-start gap-3">
              <HardHat className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wide">Mines & Métal</h4>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">Charpentes métalliques et installations minières.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/90 flex items-start gap-3">
              <Truck className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wide">Parc d&apos;Engins</h4>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">Charroi lourd, dispatching et maintenance atelier.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/90 flex items-start gap-3">
              <Users className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wide">Ressources & RH</h4>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">Pointage rigoureux et gestion des compétences.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Legal & System Info */}
        <div className="relative z-10 pt-4 text-slate-400 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-slate-800/60">
          <span>© 2026 SIX SIGMA • Système Intégré de Gestion Opérationnelle</span>
          <span className="font-mono text-[11px] text-slate-500">v4.2.0 • Production</span>
        </div>
      </div>

      {/* 2. RIGHT PANEL: Clean, Solid Login Form (Split-Screen 45%) */}
      <div className="lg:w-[45%] flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 bg-[#0B0F17]">
        <div className="w-full max-w-md space-y-8">
          {/* Header of the Form */}
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 font-semibold">
              Portail Collaborateurs
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
              Connexion à l&apos;Espace de Gestion
            </h2>
            <p className="text-xs text-slate-400 mt-1.5">
              Saisissez votre adresse email professionnelle et votre mot de passe pour accéder à vos modules autorisés.
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Identifiant Professionnel
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
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-800 focus:ring-1 focus:ring-rose-800 transition font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Mot de Passe
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-800 focus:ring-1 focus:ring-rose-800 transition font-mono"
                />
              </div>
            </div>

            {/* Flat Solid Burgundy Button (No Gradient, Solid Industrial Style) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold text-white bg-rose-900 hover:bg-rose-950 active:bg-rose-950 border border-rose-800 transition duration-150 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Se connecter au portail</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Standards & Governance */}
          <div className="pt-6 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>Contrôle d&apos;accès RBAC & Séparation des Pouvoirs (SoD)</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
              Toutes les sessions et transactions sont soumises à la traçabilité intégrale par journal d&apos;audit centralisé.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
