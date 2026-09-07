"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { CashboxTransaction, Project, Profile, CurrencyCode } from "@/types/database";
import { formatUSD, formatCDF, formatDate } from "@/lib/utils";
import { CurrencyBadge } from "@/components/ui/CurrencyBadge";
import {
  Coins,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Building2,
  DollarSign,
  TrendingUp,
  X,
  ShieldAlert,
} from "lucide-react";

export default function FinancePage() {
  const supabase = createClient();

  const [transactions, setTransactions] = useState<CashboxTransaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // New Transaction Modal
  const [showModal, setShowModal] = useState(false);
  const [cashboxType, setCashboxType] = useState<"central" | "site">("site");
  const [transactionType, setTransactionType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [category, setCategory] = useState("Achat matériaux urgent");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.user.id)
        .single();
      if (p) setCurrentUser(p as Profile);
    }

    const { data: txData } = await supabase
      .from("cashbox_transactions")
      .select("*, project:project_id(*), creator:created_by(*), validator:validated_by(*)")
      .order("created_at", { ascending: false });

    if (txData) setTransactions(txData as CashboxTransaction[]);

    const { data: prjData } = await supabase.from("projects").select("*");
    if (prjData) {
      setProjects(prjData as Project[]);
      if (prjData.length > 0 && !selectedProjectId) setSelectedProjectId(prjData[0].id);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);

    const parsedAmount = parseFloat(amount) || 0;

    const { error } = await supabase.from("cashbox_transactions").insert({
      cashbox_type: cashboxType,
      project_id: cashboxType === "site" ? selectedProjectId : null,
      transaction_type: transactionType,
      amount: parsedAmount,
      currency,
      exchange_rate: 2850.0,
      category,
      description: description.trim(),
      created_by: currentUser.id,
    });

    if (!error) {
      setShowModal(false);
      setAmount("");
      setDescription("");
      fetchTransactions();
    } else {
      alert("Erreur lors de l'enregistrement : " + error.message);
    }
    setSaving(false);
  };

  // Balances
  const totalIncomeUSD = transactions
    .filter((t) => t.currency === "USD" && t.transaction_type === "INCOME")
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpenseUSD = transactions
    .filter((t) => t.currency === "USD" && t.transaction_type === "EXPENSE")
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const netUSD = totalIncomeUSD - totalExpenseUSD;

  const totalExpenseCDF = transactions
    .filter((t) => t.currency === "CDF" && t.transaction_type === "EXPENSE")
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const pendingApprovalsCount = transactions.filter(
    (t) => t.requires_management_approval && !t.validated_by
  ).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Coins className="w-7 h-7 text-emerald-500" />
            <span>Gestion de Trésorerie & Caisses de Chantier</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Comptabilité multi-devises (USD / Franc Congolais CDF), décaissements chantiers et contrôle des dépenses &gt; 5 000 USD.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-rose-800 hover:from-red-600 hover:to-rose-700 text-white text-xs font-bold shadow-lg shadow-red-950/50 border border-red-600/30 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Enregistrer une Dépense / Recette</span>
        </button>
      </div>

      {/* Alert Banner for Management Approvals */}
      {pendingApprovalsCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-800/70 flex items-center justify-between gap-4 text-xs text-amber-200">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <strong className="font-bold">Visa Direction Générale Requis : </strong>
              <span>
                {pendingApprovalsCount} opération(s) financière(s) dépassent le seuil de conformité de 5 000 USD et requièrent l&apos;accord de la Direction.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-900 text-amber-300 border border-amber-700 whitespace-nowrap">
            Seuil &gt; 5 000 USD
          </span>
        </div>
      )}

      {/* Treasury Cards (USD & CDF) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Solde Net Caisses (USD)
            </span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400">
            {formatUSD(netUSD)}
          </div>
          <div className="mt-1 text-xs text-slate-400 flex items-center justify-between">
            <span>Recettes : {formatUSD(totalIncomeUSD)}</span>
            <span>Dépenses : {formatUSD(totalExpenseUSD)}</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-amber-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Décaissements Locaux (CDF)
            </span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-400">
            {formatCDF(totalExpenseCDF)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Équivalent : ≈ {formatUSD(totalExpenseCDF / 2850)}
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Taux de Change Réglementaire
            </span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            1 USD = 2 850 CDF
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Taux de référence pour toutes les caisses
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Coins className="w-4 h-4 text-slate-400" />
            <span>Historique des Mouvements de Caisse</span>
          </h3>
          <span className="text-xs text-slate-400">
            {transactions.length} opération(s) enregistrée(s)
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Chargement des opérations financières...
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Aucune transaction enregistrée.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type & Caisse</th>
                  <th className="py-3 px-4">Chantier / Affectation</th>
                  <th className="py-3 px-4">Motif & Catégorie</th>
                  <th className="py-3 px-4">Montant</th>
                  <th className="py-3 px-4 text-right">Contrôle DG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {formatDate(tx.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`p-1 rounded-md ${
                            tx.transaction_type === "INCOME"
                              ? "bg-emerald-950 text-emerald-400"
                              : "bg-rose-950 text-rose-400"
                          }`}
                        >
                          {tx.transaction_type === "INCOME" ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <div>
                          <span className="font-semibold text-white block">
                            {tx.transaction_type === "INCOME" ? "Entrée" : "Dépense"}
                          </span>
                          <span className="text-[10px] text-slate-500 uppercase">
                            {tx.cashbox_type === "central" ? "Caisse Centrale" : "Caisse Chantier"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-200 font-medium">
                        {tx.project ? `${tx.project.code} - ${tx.project.title}` : "Siège / Direction"}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="font-semibold text-white block">
                        {tx.category}
                      </span>
                      <span className="text-slate-400 truncate block text-[11px]">
                        {tx.description}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <span
                        className={
                          tx.transaction_type === "INCOME"
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }
                      >
                        {tx.transaction_type === "INCOME" ? "+" : "-"}
                        {tx.currency === "USD" ? formatUSD(Number(tx.amount)) : formatCDF(Number(tx.amount))}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {tx.requires_management_approval ? (
                        tx.validated_by ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            Validé DG
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
                            Requis &gt; 5K$
                          </span>
                        )
                      ) : (
                        <span className="text-slate-500 text-[11px]">Standard</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] rounded-2xl border border-slate-700 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>Enregistrement Caisse & Trésorerie</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Caisse</label>
                  <select
                    value={cashboxType}
                    onChange={(e) => setCashboxType(e.target.value as any)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="site">Caisse Chantier</option>
                    <option value="central">Caisse Centrale (Siège)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Sens Opération</label>
                  <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value as any)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="EXPENSE">Dépense / Décaissement</option>
                    <option value="INCOME">Recette / Encaissement</option>
                    <option value="TRANSFER">Virement interne</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Montant *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="ex: 1500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Devise *</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-semibold"
                  >
                    <option value="USD">USD ($ - Dollars US)</option>
                    <option value="CDF">CDF (Francs Congolais)</option>
                  </select>
                </div>
              </div>

              {cashboxType === "site" && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Chantier Concerne</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Catégorie Comptable</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="Achat matériaux urgent">Achat matériaux urgent</option>
                  <option value="Main d'œuvre journalière">Main d&apos;œuvre journalière</option>
                  <option value="Ravitaillement carburant">Ravitaillement carburant</option>
                  <option value="Pièces de rechange & outillage">Pièces de rechange & outillage</option>
                  <option value="Avance de caisse">Avance de caisse</option>
                  <option value="Frais de mission & transport">Frais de mission & transport</option>
                  <option value="Acompte client">Acompte client</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Libellé / Justificatif *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Détail de la dépense, n° de reçu ou facture..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              {((currency === "USD" && parseFloat(amount) >= 5000) ||
                (currency === "CDF" && parseFloat(amount) >= 5000 * 2850)) && (
                <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Montant &ge; 5 000 USD : Cette opération sera automatiquement soumise à la Direction Générale.</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold transition disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Valider l'Opération"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
