import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, Database, UserCheck, FileText, Scale } from "lucide-react";
import { SixSigmaLogo } from "@/components/ui/SixSigmaLogo";
import { BusinessFooter } from "@/components/layout/BusinessFooter";

export const metadata = {
  title: "Politique de Confidentialité & Protection des Données | SIX SIGMA ERP",
  description: "Réglementation et politique interne de protection des données RH et chantiers selon la législation de la République Démocratique du Congo (RDC).",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#1C1F23]">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-slate-200/80 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <SixSigmaLogo size="sm" showText={true} showSlogan={false} />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/terms"
              className="text-xs font-semibold text-slate-600 hover:text-[#8E2424] transition hidden sm:inline"
            >
              Charte d&apos;Accès SI
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour à l&apos;Accès ERP</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-10 my-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-6 sm:p-10 space-y-8">
          {/* Header Banner */}
          <div className="border-b border-slate-100 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-[#8E2424] text-xs font-mono font-medium mb-3">
              <Scale className="w-3.5 h-3.5" />
              <span>Cadre Juridique RDC • Conformité Entreprise</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1C1F23] tracking-tight">
              Politique de Confidentialité & Protection des Données RH & Chantiers
            </h1>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              En vigueur au sein de <strong>SIX SIGMA SARL</strong> — Conforme à la <strong>Loi n° 20/017 du 25 novembre 2020</strong> relative aux télécommunications et aux technologies de l&apos;information et de la communication en République Démocratique du Congo, et aux dispositions du <strong>Code du Travail congolais</strong> (Loi n° 015/2002).
            </p>
          </div>

          {/* Section 1: Finalité */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-base font-bold text-slate-900">
              <div className="w-7 h-7 rounded-lg bg-[#8E2424]/10 text-[#8E2424] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <h2>1. Finalité Exclusive du Traitement</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-9">
              Le système d&apos;information et Progiciel de Gestion Intégré (ERP) de SIX SIGMA SARL collecte et traite des données exclusivement pour la conduite, l&apos;organisation et la sécurisation de ses activités industrielles de Génie Civil, BTP, Mines et Logistique :
            </p>
            <ul className="list-disc list-inside text-xs sm:text-sm text-slate-600 space-y-1.5 pl-9">
              <li>Planification opérationnelle et suivi journalier d&apos;avancement des chantiers (rapports 19h00).</li>
              <li>Pointage biométrique et horodaté des effectifs pour l&apos;établissement conforme des états de paie.</li>
              <li>Gestion de la trésorerie de caisse, des approvisionnements et des réquisitions de matériels (DRI).</li>
              <li>Contrôle de conformité HSE (Hygiène, Sécurité, Environnement) et maintenance du parc d&apos;engins lourds.</li>
            </ul>
          </section>

          {/* Section 2: Nature des Données */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-base font-bold text-slate-900">
              <div className="w-7 h-7 rounded-lg bg-[#7BA238]/10 text-[#7BA238] flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <h2>2. Nature des Données Collectées</h2>
            </div>
            <div className="pl-9 space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>Les données enregistrées dans l&apos;ERP sont strictement limitées aux nécessités de service :</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className="font-bold text-slate-800 block text-xs mb-1">Données Collaborateurs & RH</span>
                  <p className="text-[11px] text-slate-500">
                    Nom, prénom, matricule d&apos;entreprise, fonction, département, contact téléphonique professionnel, statut d&apos;affectation et pointages de présence journaliers.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className="font-bold text-slate-800 block text-xs mb-1">Données Opérationnelles & Caisse</span>
                  <p className="text-[11px] text-slate-500">
                    Visas de validation des chefs de chantier, signatures d&apos;ordres de mission, montants de décaissement imputés et pièces justificatives associées.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Inviolabilité et Conservation */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-base font-bold text-slate-900">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Lock className="w-4 h-4 text-[#8E2424]" />
              </div>
              <h2>3. Inviolabilité, Sécurité et Durée de Conservation</h2>
            </div>
            <div className="pl-9 space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                Conformément aux normes les plus strictes de sécurité informatique et au respect des secrets d&apos;affaires :
              </p>
              <ul className="list-disc list-inside space-y-1.5">
                <li>
                  <strong>Chiffrement & Cloisonnement RLS :</strong> Toutes les données sont protégées par le mécanisme de sécurité au niveau des lignes (<em>Row Level Security</em>) de la base de données relationnelle PostgreSQL.
                </li>
                <li>
                  <strong>Piste d&apos;Audit Inaltérable :</strong> Les journaux de transactions (<em>audit_logs</em>) enregistrent chaque action avec identifiant unique, horodatage UTC+2 et empreinte immuable opposable en cas de litige.
                </li>
                <li>
                  <strong>Absence de Cession Tiers :</strong> Aucune donnée personnelle ou opérationnelle n&apos;est commercialisée, cédée ou transmise à des tiers sans réquisition judiciaire conforme aux lois de la RDC.
                </li>
                <li>
                  <strong>Durée de rétention :</strong> Les journaux de chantier et historiques de paie sont conservés conformément aux délais légaux de prescription du Code du Travail congolais.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4: Droits d'Accès et Rectification */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-base font-bold text-slate-900">
              <div className="w-7 h-7 rounded-lg bg-[#7BA238]/10 text-[#7BA238] flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <h2>4. Exercice des Droits d&apos;Accès et de Rectification</h2>
            </div>
            <div className="pl-9 space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                Tout collaborateur titulaire d&apos;un compte sur l&apos;ERP dispose d&apos;un droit individuel d&apos;accès, de rectification et d&apos;actualisation de ses données personnelles d&apos;état civil.
              </p>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                <span className="font-bold text-slate-900 block">
                  Direction du Système d&apos;Information & Ressources Humaines
                </span>
                <span>SIX SIGMA SARL — Siège Social</span>
                <span className="block">Lubumbashi, Province du Haut-Katanga, République Démocratique du Congo</span>
                <span className="block font-mono text-[11px] text-slate-500">Contact interne : support.si@sixsigma.cd</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <BusinessFooter />
    </div>
  );
}
