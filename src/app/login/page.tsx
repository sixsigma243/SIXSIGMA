"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { SixSigmaLogo } from "@/components/ui/SixSigmaLogo";
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
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setErrorMsg(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "account_disabled") {
        setErrorMsg(
          "Accès révoqué : Votre compte a été désactivé par la Direction SI & Gouvernance. Veuillez contacter le support interne."
        );
      } else if (params.get("error") === "worker_no_access") {
        setErrorMsg(
          "Accès restreint : Le profil Ouvrier / Journalier ne dispose pas d'accès direct à l'interface applicative. Rapprochez-vous de votre chef d'équipe ou du pôle RH."
        );
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    setLoading(true);
    setErrorMsg(null);

    const emailToUse = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: password.trim(),
    });

    if (error) {
      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);

      // Rate limiting: 5 failed attempts -> 60s lockout
      if (nextFailed >= 5) {
        setLockoutSeconds(60);
        setErrorMsg("Sécurité : Trop de tentatives infructueuses. Veuillez patienter 60 secondes.");
      } else {
        // Message d'erreur unique générique pour empêcher l'énumération d'utilisateurs
        setErrorMsg("Identifiants incorrects. Veuillez vérifier votre adresse email et votre mot de passe.");
      }
      setLoading(false);
      return;
    }

    // Reset lockout counter on success
    setFailedAttempts(0);
    setLockoutSeconds(0);

    if (data?.user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", data.user.id)
        .single();

      if (prof?.role === "worker") {
        await supabase.auth.signOut();
        setErrorMsg(
          "Accès restreint : Le profil Ouvrier / Journalier ne dispose pas d'accès direct à l'interface applicative. Rapprochez-vous de votre chef d'équipe ou du pôle RH."
        );
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0E1116] text-slate-200 select-none">
      {/* 1. LEFT PANEL: Industrial Branding & Enterprise Pillars (Split-Screen 55%) */}
      <div className="relative lg:w-[55%] flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden border-b lg:border-b-0 lg:border-r border-[#252932]">
        {/* Real Engineering Site Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/construction-bg.jpg"
            alt="Chantier de génie civil et infrastructure minière SIX SIGMA"
            fill
            priority
            className="object-cover object-center"
          />
          {/* Elegant Dark Industrial Overlay in #0E1116 */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#0E1116] via-[#0E1116]/90 to-[#14171D]/80" />
          {/* Subtle Grid Texture */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        {/* Top: Header Identity with Official Logo */}
        <div className="relative z-10">
          <SixSigmaLogo size="lg" showText={true} showSlogan={false} />
        </div>

        {/* Center: Mission & Official Slogan */}
        <div className="relative z-10 my-10 lg:my-auto max-w-xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#1C1F23] border border-[#252932] text-[#E58585] text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-[#8E2424] inline-block" />
            <span>ERP Opérationnel BTP & Mines • RDC</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
              « La constance dans la qualité »
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed font-normal">
              Système intégré de gestion opérationnelle des chantiers de génie civil, charpentes métalliques, charroi automobile lourd et gouvernance d&apos;entreprise.
            </p>
          </div>

          {/* 4 Pillars Grid (Compact, Solid Industrial Style) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-[#14171D]/90 border border-[#252932] flex items-start gap-3 shadow-md">
              <Building2 className="w-5 h-5 text-[#8E2424] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wide">Génie Civil</h4>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">Ouvrages d&apos;art, terrassements et voiries lourdes.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#14171D]/90 border border-[#252932] flex items-start gap-3 shadow-md">
              <HardHat className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wide">Mines & Métal</h4>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">Charpentes métalliques et sites miniers du Katanga.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#14171D]/90 border border-[#252932] flex items-start gap-3 shadow-md">
              <Truck className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wide">Parc d&apos;Engins</h4>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">Charroi lourd, dispatching et maintenance préventive.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#14171D]/90 border border-[#252932] flex items-start gap-3 shadow-md">
              <Users className="w-5 h-5 text-[#7BA238] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wide">Ressources & RH</h4>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">Pointage rigoureux, conformité légale et compétences.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Legal & System Info */}
        <div className="relative z-10 pt-4 text-slate-400 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-[#252932]">
          <span>© 2026 SIX SIGMA • Système Intégré de Gestion Opérationnelle</span>
          <span className="font-mono text-[11px] text-slate-400">v4.3.0 • Production</span>
        </div>
      </div>

      {/* 2. RIGHT PANEL: Solid Industrial Login Form (#0E1116) */}
      <div className="lg:w-[45%] flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 bg-[#0E1116]">
        <div className="w-full max-w-md space-y-8">
          {/* Header of the Form */}
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7BA238]" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-semibold">
                Portail Collaborateurs & Dirigeants
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Connexion à l&apos;Espace de Gestion
            </h2>
            <p className="text-xs text-slate-400 mt-1.5">
              Saisissez vos identifiants d&apos;entreprise pour accéder à vos modules et tableaux de bord autorisés.
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-[#8E2424]/20 border border-[#8E2424]/60 text-[#E58585] text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#E58585] mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-mono">
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
                  className="w-full pl-10 pr-4 py-2.5 bg-[#14171D] border border-[#252932] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#8E2424] focus:ring-1 focus:ring-[#8E2424] transition font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
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
                  className="w-full pl-10 pr-4 py-2.5 bg-[#14171D] border border-[#252932] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#8E2424] focus:ring-1 focus:ring-[#8E2424] transition font-mono"
                />
              </div>
            </div>

            {/* Official Brick Red Solid Button (#8E2424 / Hover: #751D1D) */}
            <button
              type="submit"
              disabled={loading || lockoutSeconds > 0}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#8E2424] hover:bg-[#751D1D] active:bg-[#5A1616] border border-[#8E2424] shadow-lg shadow-[#8E2424]/25 transition duration-150 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : lockoutSeconds > 0 ? (
                <span>Accès verrouillé ({lockoutSeconds}s)</span>
              ) : (
                <>
                  <span>Authentification Sécurisée</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Standards & Legal Links */}
          <div className="pt-6 border-t border-[#252932] space-y-2.5">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-[#7BA238] flex-shrink-0" />
              <span>Contrôle d&apos;accès RBAC & Séparation des Pouvoirs (SoD)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed pl-6">
              Toutes les sessions et transactions sont soumises à la traçabilité intégrale par journal d&apos;audit centralisé.
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-[#252932]/60">
              <Link href="/terms" className="hover:text-slate-200 transition underline underline-offset-2">
                Charte d&apos;Accès SI
              </Link>
              <span>•</span>
              <Link href="/privacy" className="hover:text-slate-200 transition underline underline-offset-2">
                Protection des Données (RDC)
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
