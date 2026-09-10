"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, MapPin, Building, FileText } from "lucide-react";

export function BusinessFooter() {
  return (
    <footer className="w-full bg-white border-t border-slate-200/80 mt-auto py-5 px-6 sm:px-8 text-[#1C1F23]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        {/* Left: Enterprise Entity & Physical Headquarters */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Building className="w-3.5 h-3.5 text-[#8E2424]" />
            <span>SIX SIGMA SARL</span>
            <span className="text-slate-400 font-normal hidden sm:inline">•</span>
            <span className="text-slate-500 font-medium hidden sm:inline">BTP, Génie Civil, Mines & Logistique</span>
          </div>

          <div className="flex items-center gap-1 text-slate-500 text-[11px]">
            <MapPin className="w-3 h-3 text-[#7BA238] flex-shrink-0" />
            <span>Lubumbashi, Province du Haut-Katanga, RDC</span>
          </div>
        </div>

        {/* Center/Right: Legal Identifiers RDC */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
          <span>
            <strong className="text-slate-700 font-sans">RCCM :</strong> CD/LSH/RCCM/21-B-00845
          </span>
          <span className="text-slate-300">•</span>
          <span>
            <strong className="text-slate-700 font-sans">Id. Nat. :</strong> 05-H4900-N84521M
          </span>
          <span className="text-slate-300">•</span>
          <span>
            <strong className="text-slate-700 font-sans">NIF :</strong> A2184512P
          </span>
        </div>
      </div>

      {/* Bottom Bar: Status, Links & Copyright */}
      <div className="max-w-7xl mx-auto mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7BA238] animate-pulse" />
            <span>Système Opérationnel (RDC - UTC+2)</span>
          </span>
          <span>&bull;</span>
          <span>&copy; {new Date().getFullYear()} SIX SIGMA SARL. Tous droits réservés.</span>
        </div>

        <div className="flex items-center gap-4 font-medium">
          <Link
            href="/terms"
            className="hover:text-[#8E2424] transition-colors flex items-center gap-1"
          >
            <ShieldCheck className="w-3 h-3 text-slate-400" />
            <span>Charte d&apos;Accès SI</span>
          </Link>
          <span className="text-slate-300">&bull;</span>
          <Link
            href="/privacy"
            className="hover:text-[#8E2424] transition-colors flex items-center gap-1"
          >
            <FileText className="w-3 h-3 text-slate-400" />
            <span>Protection des Données & Confidentialité</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
