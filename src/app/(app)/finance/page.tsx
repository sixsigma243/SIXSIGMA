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
  Lock,
  Wallet,
  CreditCard,
  Briefcase,
  PieChart,
  Radio,
  Edit3,
} from "lucide-react";

export default function FinancePage() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"transactions" | "budgets">("transactions");
  const [transactions, setTransactions] = useState<CashboxTransaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [realtimeToast, setRealtimeToast] = useState<string | null>(null);

  // New Transaction Modal
  const [showModal, setShowModal] = useState(false);
  const [cashboxType, setCashboxType] = useState<"central" | "site">("site");
  const [transactionType, setTransactionType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [category, setCategory] = useState("Achat matériaux urgent");
  const [beneficiary, setBeneficiary] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Espèces");
  const [saving, setSaving] = useState(false);

  // Budget Allocation Modal (Admin)
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetProject, setBudgetProject] = useState<Project | null>(null);
  const [budgetUSD, setBudgetUSD] = useState("");
  const [budgetCDF, setBudgetCDF] = useState("");
  const [budgetSaving, setBudgetSaving] = useState(false);

  const EXCHANGE_RATE = 2850.0;

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

    const { data: prjData } = await supabase.from("projects").select("*").order("title");
    if (prjData) {
      setProjects(prjData as Project[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();

    // Supabase Realtime Subscription on cashbox_transactions & projects
    const channel = supabase
      .channel("finance-realtime-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cashbox_transactions" },
        (payload) => {
          console.log("[Realtime] Cashbox event:", payload.eventType);
          setRealtimeToast("Nouvelle écriture de caisse enregistrée (Temps Réel)");
          setTimeout(() => setRealtimeToast(null), 4000);
          fetchTransactions();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update default category on type change
  useEffect(() => {
    if (transactionType === "INCOME") {
      setCategory("Approvisionnement caisse");
    } else {
      setCategory("Achat matériaux urgent");
    }
  }, [transactionType]);

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);

    const parsedAmount = parseFloat(amount) || 0;
    const isAboveThreshold =
      (currency === "USD" && parsedAmount >= 5000) ||
      (currency === "CDF" && parsedAmount >= 5000 * EXCHANGE_RATE);

    const { error } = await supabase.from("cashbox_transactions").insert({
      cashbox_type: cashboxType,
      project_id: selectedProjectId ? selectedProjectId : null,
      transaction_type: transactionType,
      amount: parsedAmount,
      currency,
      exchange_rate: EXCHANGE_RATE,
      category,
      beneficiary: beneficiary.trim() || null,
      description: description.trim(),
      payment_method: paymentMethod,
      requires_management_approval: isAboveThreshold,
      status: "pending",
      created_by: currentUser.id,
    });

    if (!error) {
      setShowModal(false);
      setAmount("");
      setBeneficiary("");
      setDescription("");
      setSelectedProjectId("");
      fetchTransactions();
    } else {
      alert("Erreur lors de l'enregistrement : " + error.message);
    }
    setSaving(false);
  };

  const handleValidateTransaction = async (txId: string) => {
    if (!currentUser) return;
    if (currentUser.role === "admin") {
      alert("Séparation des pouvoirs (SoD) : L'administrateur système ne valide pas de dépenses financières.");
      return;
    }
    const { error } = await supabase
      .from("cashbox_transactions")
      .update({
        status: "approved",
        validated_by: currentUser.id,
        validated_at: new Date().toISOString(),
      })
      .eq("id", txId);

    if (error) {
      alert("Erreur validation : " + error.message);
    } else {
      fetchTransactions();
    }
  };

  // Open budget allocation modal
  const openBudgetAllocation = (prj: Project) => {
    setBudgetProject(prj);
    setBudgetUSD(String(prj.budget_allocated_usd || prj.budget || 0));
    setBudgetCDF(String(prj.budget_allocated_cdf || 0));
    setShowBudgetModal(true);
  };

  // Save budget allocation
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetProject) return;
    setBudgetSaving(true);

    const { error } = await supabase
      .from("projects")
      .update({
        budget_allocated_usd: parseFloat(budgetUSD) || 0,
        budget_allocated_cdf: parseFloat(budgetCDF) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", budgetProject.id);

    if (!error) {
      setShowBudgetModal(false);
      fetchTransactions();
    } else {
      alert("Erreur d'allocation budgétaire : " + error.message);
    }
    setBudgetSaving(false);
  };

  // Real-time Live Balances
  const totalIncomeUSD = transactions
    .filter((t) => t.currency === "USD" && t.transaction_type === "INCOME")
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpenseUSD = transactions
    .filter((t) => t.currency === "USD" && t.transaction_type === "EXPENSE")
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const netUSD = totalIncomeUSD - totalExpenseUSD;

  const totalIncomeCDF = transactions
    .filter((t) => t.currency === "CDF" && t.transaction_type === "INCOME")
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpenseCDF = transactions
    .filter((t) => t.currency === "CDF" && t.transaction_type === "EXPENSE")
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const netCDF = totalIncomeCDF - totalExpenseCDF;

  // Dépenses du Jour
  const todayStr = new Date().toISOString().split("T")[0];
  const todayExpensesUSD = transactions
    .filter(
      (t) =>
        t.currency === "USD" &&
        t.transaction_type === "EXPENSE" &&
        t.created_at &&
        t.created_at.startsWith(todayStr)
    )
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const todayExpensesCDF = transactions
    .filter(
      (t) =>
        t.currency === "CDF" &&
        t.transaction_type === "EXPENSE" &&
        t.created_at &&
        t.created_at.startsWith(todayStr)
    )
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const pendingApprovalsCount = transactions.filter(
    (t) => t.requires_management_approval && !t.validated_by
  ).length;

  const canCreateTransaction =
    currentUser && ["admin", "accountant", "company_management"].includes(currentUser.role);
  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Realtime Discreet Toast */}
      {realtimeToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-200 text-xs font-bold shadow-2xl animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span>{realtimeToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Coins className="w-7 h-7 text-emerald-500" />
            <span>Gestion de Trésorerie & Caisses de Chantier</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Comptabilité multi-devises (USD / Franc Congolais CDF), décaissements chantiers, pilotage des budgets et synchronisation temps réel.
          </p>
        </div>

        {canCreateTransaction && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-bold shadow-lg shadow-[#8E2424]/20 border border-[#8E2424] transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nouvelle Opération de Caisse</span>
          </button>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "transactions"
              ? "bg-[#8E2424]/20 text-[#E58585] border border-[#8E2424]/60"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Mouvements de Caisse & Flux</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
            {transactions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("budgets")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "budgets"
              ? "bg-emerald-950 text-emerald-200 border border-emerald-800"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <PieChart className="w-4 h-4 text-emerald-400" />
          <span>Budgets & Engagements Chantiers</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
            {projects.length}
          </span>
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

      {/* Live Treasury Summary Cards (USD, CDF, Dépenses du jour, Taux) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Solde Net USD */}
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#7BA238] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              SOLDE NET CAISSE (USD)
            </span>
            <DollarSign className="w-4 h-4 text-[#7BA238]" />
          </div>
          <div className="mt-2 text-2xl font-black text-[#A5CE5B]">
            {formatUSD(netUSD)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="text-emerald-400">Entrées : {formatUSD(totalIncomeUSD)}</span>
            <span className="text-rose-400">Sorties : {formatUSD(totalExpenseUSD)}</span>
          </div>
        </div>

        {/* Card 2: Solde Net CDF */}
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-amber-500 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              SOLDE NET CAISSE (CDF)
            </span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-400">
            {formatCDF(netCDF)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="text-emerald-400">Entrées : {formatCDF(totalIncomeCDF)}</span>
            <span className="text-rose-400">Sorties : {formatCDF(totalExpenseCDF)}</span>
          </div>
        </div>

        {/* Card 3: Dépenses du Jour */}
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-rose-600 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              DÉPENSES DU JOUR
            </span>
            <Wallet className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-400">
            {formatUSD(todayExpensesUSD)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
            Équivalent local : {formatCDF(todayExpensesCDF)}
          </div>
        </div>

        {/* Card 4: Taux de Change BCC */}
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-blue-600 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              TAUX OFFICIEL BCC
            </span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            1 USD = {EXCHANGE_RATE.toLocaleString()} CDF
          </div>
          <div className="mt-1 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
            Taux de référence pour toutes les imputations
          </div>
        </div>
      </div>

      {activeTab === "transactions" ? (
        /* TRANSACTIONS TAB */
        <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-slate-400" />
              <span>Historique des Mouvements de Caisse (USD & CDF)</span>
            </h3>
            <span className="text-xs text-slate-400">
              {transactions.length} opération(s) enregistrée(s)
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Chargement des flux de caisse en temps réel...
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Aucune écriture de caisse enregistrée. Cliquez sur &ldquo;+ Nouvelle Opération de Caisse&rdquo; pour initier un mouvement.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date & Caisse</th>
                    <th className="py-3 px-4">Imputation Chantier / Siège</th>
                    <th className="py-3 px-4">Catégorie & Motif</th>
                    <th className="py-3 px-4">Bénéficiaire / Fournisseur</th>
                    <th className="py-3 px-4">Mode Paiement</th>
                    <th className="py-3 px-4">Montant</th>
                    <th className="py-3 px-4 text-right">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">
                          {formatDate(tx.created_at)}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {tx.cashbox_type === "central" ? (
                            <span className="text-blue-400 font-semibold">Caisse Centrale</span>
                          ) : (
                            <span className="text-amber-400 font-semibold">Caisse Chantier</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-200 font-medium">
                          {tx.project ? `${tx.project.code} - ${tx.project.title}` : "Frais Généraux Siège"}
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

                      <td className="py-3 px-4 text-slate-300">
                        {tx.beneficiary ? (
                          <span className="font-medium text-slate-200">{tx.beneficiary}</span>
                        ) : (
                          <span className="text-slate-500 italic">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {tx.payment_method || "Espèces"}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                        <span
                          className={
                            tx.transaction_type === "INCOME"
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }
                        >
                          {tx.transaction_type === "INCOME" ? "+" : "-"}
                          {tx.currency === "USD"
                            ? formatUSD(Number(tx.amount))
                            : formatCDF(Number(tx.amount))}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {tx.validated_by || tx.status === "approved" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-[#7BA238]/20 text-[#A5CE5B] border border-[#7BA238]/50">
                            <CheckCircle2 className="w-3 h-3" /> Approuvé
                          </span>
                        ) : currentUser?.role === "admin" ? (
                          <span
                            title="Séparation des Pouvoirs : L'administrateur système ne valide pas de dépenses financières"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-[#1C1F23] text-slate-400 border border-[#252932] cursor-not-allowed select-none"
                          >
                            <Lock className="w-3 h-3 text-slate-500" />
                            SoD (Admin)
                          </span>
                        ) : currentUser?.role === "company_management" ||
                          (currentUser?.role === "accountant" && !tx.requires_management_approval) ? (
                          <button
                            onClick={() => handleValidateTransaction(tx.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#7BA238] hover:bg-[#6A8D2F] text-white border border-[#7BA238] transition shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approuver la Transaction
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-amber-950/60 text-amber-300 border border-amber-800">
                            {tx.requires_management_approval ? "Requis DG (>5K$)" : "Requis Compta"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* BUDGETS CHANTIERS TAB */
        <div className="glass-card rounded-2xl overflow-hidden border border-slate-800 space-y-4">
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-400" />
                <span>Allocation & Suivi des Budgets Chantiers (USD & CDF)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pilotage des enveloppes allouées par projet et calcul en direct du taux de consommation des fonds de caisse.
              </p>
            </div>
            {isAdmin && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#7BA238]/20 text-[#A5CE5B] border border-[#7BA238]/50">
                Administration Budgétaire Active
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Projet / Chantier</th>
                  <th className="py-3 px-4">Budget Alloué (USD)</th>
                  <th className="py-3 px-4">Budget Alloué (CDF)</th>
                  <th className="py-3 px-4">Dépenses Réalisées (USD)</th>
                  <th className="py-3 px-4">Dépenses Réalisées (CDF)</th>
                  <th className="py-3 px-4">Consommation</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Action Admin</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {projects.map((prj) => {
                  const prjExpensesUSD = transactions
                    .filter(
                      (t) =>
                        t.project_id === prj.id &&
                        t.currency === "USD" &&
                        t.transaction_type === "EXPENSE"
                    )
                    .reduce((acc, t) => acc + Number(t.amount), 0);

                  const prjExpensesCDF = transactions
                    .filter(
                      (t) =>
                        t.project_id === prj.id &&
                        t.currency === "CDF" &&
                        t.transaction_type === "EXPENSE"
                    )
                    .reduce((acc, t) => acc + Number(t.amount), 0);

                  const allocatedUSD = Number(prj.budget_allocated_usd) || Number(prj.budget) || 0;
                  const allocatedCDF = Number(prj.budget_allocated_cdf) || 0;
                  const ratioUSD = allocatedUSD > 0 ? Math.min(100, Math.round((prjExpensesUSD / allocatedUSD) * 100)) : 0;

                  return (
                    <tr key={prj.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{prj.title}</div>
                        <div className="text-[11px] text-slate-400">{prj.code} • {prj.location}</div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-200">
                        {formatUSD(allocatedUSD)}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-amber-300">
                        {allocatedCDF > 0 ? formatCDF(allocatedCDF) : "-"}
                      </td>

                      <td className="py-3 px-4 font-mono text-rose-400 font-bold">
                        {formatUSD(prjExpensesUSD)}
                      </td>

                      <td className="py-3 px-4 font-mono text-rose-400 font-bold">
                        {prjExpensesCDF > 0 ? formatCDF(prjExpensesCDF) : "-"}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                ratioUSD > 90
                                  ? "bg-rose-500"
                                  : ratioUSD > 70
                                  ? "bg-amber-500"
                                  : "bg-[#7BA238]"
                              }`}
                              style={{ width: `${ratioUSD}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-bold text-slate-300">
                            {ratioUSD}%
                          </span>
                        </div>
                      </td>

                      {isAdmin && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openBudgetAllocation(prj)}
                            className="px-3 py-1.5 rounded-lg bg-[#1C1F23] hover:bg-[#252932] text-slate-200 border border-[#252932] text-xs font-semibold inline-flex items-center gap-1.5 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Allouer / Modifier</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] rounded-2xl border border-slate-700 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>Nouvelle Opération de Caisse & Trésorerie</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4 text-xs">
              {/* Type: Income or Expense */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                  Sens de l&apos;Opération *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTransactionType("EXPENSE")}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition ${
                      transactionType === "EXPENSE"
                        ? "bg-rose-950/60 border-rose-600 text-rose-300 shadow-sm"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4 text-rose-400" />
                    <span>Sortie (Décaissement)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTransactionType("INCOME")}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition ${
                      transactionType === "INCOME"
                        ? "bg-emerald-950/60 border-emerald-600 text-emerald-300 shadow-sm"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    <span>Entrée (Encaissement)</span>
                  </button>
                </div>
              </div>

              {/* Amount & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Montant *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="ex: 1500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono font-bold text-sm focus:ring-2 focus:ring-[#8E2424] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Devise *</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold text-xs"
                  >
                    <option value="USD">USD ($ - Dollars Américains)</option>
                    <option value="CDF">CDF (FC - Francs Congolais)</option>
                  </select>
                </div>
              </div>

              {/* Indicative Conversion Note */}
              {amount && parseFloat(amount) > 0 && (
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                  <span>Conversion indicative (Taux 1 USD = 2 850 CDF) :</span>
                  <span className="font-mono font-bold text-amber-300">
                    {currency === "USD"
                      ? formatCDF(parseFloat(amount) * EXCHANGE_RATE)
                      : formatUSD(parseFloat(amount) / EXCHANGE_RATE)}
                  </span>
                </div>
              )}

              {/* Chantier d'imputation & Caisse */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Chantier d&apos;Imputation
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                  >
                    <option value="">Frais Généraux Siège (Sans chantier)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Type de Caisse
                  </label>
                  <select
                    value={cashboxType}
                    onChange={(e) => setCashboxType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                  >
                    <option value="site">Caisse Chantier</option>
                    <option value="central">Caisse Centrale (Siège)</option>
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Catégorie Opérationnelle *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                >
                  {transactionType === "INCOME" ? (
                    <>
                      <option value="Approvisionnement caisse">Approvisionnement caisse</option>
                      <option value="Encaissement client">Encaissement client / Acompte</option>
                      <option value="Remboursement avance">Remboursement avance ou reliquat</option>
                      <option value="Autre recette">Autre recette</option>
                    </>
                  ) : (
                    <>
                      <option value="Achat matériaux urgent">Achat matériaux urgent</option>
                      <option value="Avance sur salaire">Avance sur salaire / Main d&apos;œuvre</option>
                      <option value="Frais d'engins & maintenance">Frais d&apos;engins & maintenance</option>
                      <option value="Carburation & lubrifiants">Carburation & lubrifiants</option>
                      <option value="Frais de mission & déplacement">Frais de mission & déplacement</option>
                      <option value="Autre décaissement">Autre décaissement</option>
                    </>
                  )}
                </select>
              </div>

              {/* Beneficiary & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Bénéficiaire / Fournisseur
                  </label>
                  <input
                    type="text"
                    placeholder="ex: TotalEnergies, Socimex, Salarié..."
                    value={beneficiary}
                    onChange={(e) => setBeneficiary(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Mode de Paiement
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                  >
                    <option value="Espèces">Espèces (Cash)</option>
                    <option value="Chèque">Chèque bancaire</option>
                    <option value="Virement bancaire">Virement bancaire</option>
                    <option value="Airtel Money">Airtel Money</option>
                    <option value="M-Pesa">M-Pesa (Vodacash)</option>
                  </select>
                </div>
              </div>

              {/* Description / Motif */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Motif & Justification de l&apos;Opération *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Détail précis, n° de reçu, bon d'achat ou référence..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-[#8E2424] focus:outline-none"
                />
              </div>

              {/* Threshold Notice */}
              {((currency === "USD" && parseFloat(amount) >= 5000) ||
                (currency === "CDF" && parseFloat(amount) >= 5000 * EXCHANGE_RATE)) && (
                <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Montant &ge; 5 000 USD : Soumis au visa obligatoire de la Direction Générale.</span>
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
                  className="px-5 py-2 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white font-bold transition disabled:opacity-50 border border-[#8E2424]"
                >
                  {saving ? "Enregistrement..." : "Valider l'Opération"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Allocation Modal (Admin) */}
      {showBudgetModal && budgetProject && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] rounded-2xl border border-slate-700 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-amber-400" />
                <span>Allouer le Budget : {budgetProject.code}</span>
              </h3>
              <button
                onClick={() => setShowBudgetModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4 text-xs">
              <div>
                <span className="text-xs text-slate-300 block font-bold mb-1">
                  {budgetProject.title}
                </span>
                <span className="text-[11px] text-slate-400">
                  Lieu : {budgetProject.location} • Client : {budgetProject.client_name}
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Budget Alloué en USD ($) *
                </label>
                <input
                  type="number"
                  step="100"
                  required
                  value={budgetUSD}
                  onChange={(e) => setBudgetUSD(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Budget Alloué en Francs Congolais (CDF)
                </label>
                <input
                  type="number"
                  step="10000"
                  value={budgetCDF}
                  onChange={(e) => setBudgetCDF(e.target.value)}
                  placeholder="ex: 50000000"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={budgetSaving}
                  className="px-5 py-2 rounded-xl bg-[#7BA238] hover:bg-[#6A8D2F] text-white font-bold transition disabled:opacity-50 border border-[#7BA238]"
                >
                  {budgetSaving ? "Mise à jour..." : "Enregistrer le Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
