import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, KeyRound, Clock, ShieldCheck, AlertTriangle, Scale } from "lucide-react";
import { SixSigmaLogo } from "@/components/ui/SixSigmaLogo";
import { BusinessFooter } from "@/components/layout/BusinessFooter";

export const metadata = {
  title: "Charte d'Accès & Conditions d'Utilisation SI | SIX SIGMA ERP",
  description: "Règlement intérieur et charte de sécurité informatique régissant l'utilisation du Progiciel de Gestion Intégré SIX SIGMA SARL en République Démocratique du Congo.",
};

export default function TermsPage() {
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
              href="/privacy"
              className="text-xs font-semibold text-slate-600 hover:text-[#8E2424] transition hidden sm:inline"
            >
              Protection des Données
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
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Règlement Intérieur Informatique • Gouvernance SI</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1C1F23] tracking-tight">
              Charte d&apos;Utilisation du Système d&apos;Information & Conditions d&apos;Accès
            </h1>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Applicable sans réserve à tout utilisateur, collaborateur, encadrant ou sous-traitant habilité accédant à l&apos;environnement applicatif de <strong>SIX SIGMA SARL</strong> en République Démocratique du Congo.
            </p>
          </div>

          {/* Section 1: Usage strictement professionnel */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-base font-bold text-slate-900">
              <div className="w-7 h-7 rounded-lg bg-[#8E2424]/10 text-[#8E2424] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2>1. Usage Strictement Professionnel</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-9">
              Le Progiciel de Gestion Intégré (ERP) SIX SIGMA constitue un outil de travail stratégique de l&apos;entreprise. Son accès est strictement subordonné à l&apos;exercice des fonctions contractuelles des agents habilités :
            </p>
            <ul className="list-disc list-inside text-xs sm:text-sm text-slate-600 space-y-1.5 pl-9">
              <li>L&apos;utilisation à des fins privées, commerciales personnelles ou politiques est strictement interdite.</li>
              <li>Aucune extraction de données (fichiers clients, barèmes de prix, coûts de revient, effectifs) ne peut être effectuée en dehors du périmètre des missions attribuées.</li>
            </ul>
          </section>

          {/* Section 2: Responsabilité des identifiants */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-base font-bold text-slate-900">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <h2>2. Responsabilité Personnelle des Identifiants</h2>
            </div>
            <div className="pl-9 space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                Chaque compte utilisateur est strictement nominatif et incessible :
              </p>
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs leading-relaxed space-y-1">
                <span className="font-bold block">Interdiction Formelle du Partage d&apos;Identifiants :</span>
                <span>
                  Il est strictement interdit de divulguer, prêter ou déléguer son mot de passe ou son identifiant professionnel à un tiers, y compris à un subordonné ou un collègue. Toute transaction, saisie d&apos;heures ou validation opérée avec les identifiants d&apos;un collaborateur engage irrévocablement sa responsabilité personnelle.
                </span>
              </div>
            </div>
          </section>

          {/* Section 3: Séparation des Fonctions & Règle des 19h00 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-base font-bold text-slate-900">
              <div className="w-7 h-7 rounded-lg bg-[#7BA238]/10 text-[#7BA238] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h2>3. Séparation des Fonctions (SoD) & Cutoff des 19h00</h2>
            </div>
            <div className="pl-9 space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                L&apos;intégrité financière et opérationnelle de SIX SIGMA repose sur des verrous automatisés non contournables :
              </p>
              <ul className="list-disc list-inside space-y-1.5">
                <li>
                  <strong>Matrice de Séparation des Fonctions (SoD) :</strong> L&apos;émetteur d&apos;un besoin ne peut approuver son propre décaissement. Les dépenses supérieures à 5 000 USD requièrent impérativement le visa de la Direction Générale.
                </li>
                <li>
                  <strong>Règle de Clôture Quotidienne (19h00 UTC+2) :</strong> Les journaux de chantier doivent être clôturés au plus tard à 19h00. Passé cette heure, toute modification rétroactive requiert un arbitrage motivé et tracé.
                </li>
                <li>
                  <strong>Sorties de Magasin :</strong> Tout mouvement de stock physique doit être adossé à un numéro de DRI validé au préalable.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4: Traçabilité intégrale */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-base font-bold text-slate-900">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Scale className="w-4 h-4 text-[#8E2424]" />
              </div>
              <h2>4. Traçabilité Intégrale Opposable en Justice</h2>
            </div>
            <div className="pl-9 space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                Le système enregistre en continu l&apos;ensemble des événements dans une table de journalisation cryptographique inaltérable (<em>audit_logs</em>) :
              </p>
              <p>
                Sont consignés l&apos;adresse IP, l&apos;horodatage exact, l&apos;identité du compte, les anciennes valeurs et les nouvelles valeurs modifiées. Ces enregistrements informatiques ont force probante au sens des articles pertinents du Code civil congolais relatifs à la preuve électronique et sont opposables devant les juridictions compétentes de la RDC.
              </p>
            </div>
          </section>

          {/* Section 5: Sanctions disciplinaires et pénales */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-base font-bold text-slate-900">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-[#8E2424] flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h2>5. Sanctions Disciplinaires & Poursuites Légales</h2>
            </div>
            <div className="pl-9 space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                Tout manquement avéré aux dispositions de la présente charte — notamment :
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>La tentative de falsification d&apos;heures de pointage ou d&apos;états de paie,</li>
                <li>La tentative de contournement des contrôles de sécurité ou des règles RLS,</li>
                <li>L&apos;émission de bons de commande ou de sorties de caisse fictifs,</li>
                <li>La fuite délibérée de données industrielles ou tarifaires,</li>
              </ul>
              <div className="mt-2 p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 text-[#8E2424] text-xs font-medium">
                Expose immédiatement son auteur aux sanctions disciplinaires prévues par le Règlement d&apos;Entreprise de SIX SIGMA SARL (pouvant aller jusqu&apos;au licenciement pour faute lourde sans préavis ni indemnités) ainsi qu&apos;à des poursuites pénales pour faux en écriture, escroquerie ou atteinte aux systèmes de traitement automatisé de données conformément aux lois de la République Démocratique du Congo.
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
