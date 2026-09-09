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
    setSaving(true);

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      alert("Veuillez saisir un montant valide.");
      setSaving(false);
      return;
    }

    // Convert to USD equivalent to check the threshold of 5,000 USD
    let amountInUSD = numericAmount;
    if (currency === "CDF") {
      amountInUSD = numericAmount / EXCHANGE_RATE;
    }
    const requiresManagement = amountInUSD >= 5000.0;

    const { error } = await supabase.from("cashbox_transactions").insert({
      project_id: selectedProjectId || null,
      cashbox_type: cashboxType,
      transaction_type: transactionType,
      amount: numericAmount,
      currency: currency,
      category: category,
      beneficiary: beneficiary.trim() || null,
      description: description.trim(),
      payment_method: paymentMethod,
      requires_management_approval: requiresManagement,
      created_by: currentUser?.id,
      status: "pending",
    });

    if (!error) {
      setShowModal(false);
      // Reset form
      setAmount("");
      setDescription("");
      setBeneficiary("");
      fetchTransactions();
    } else {
      alert("Erreur lors de l'enregistrement de l'opération : " + error.message);
    }
    setSaving(false);
  };

  const handleValidateTransaction = async (txId: string) => {
    if (!currentUser) return;

    const { error } = await supabase
      .from("cashbox_transactions")
      .update({
        validated_by: currentUser.id,
        validated_at: new Date().toISOString(),
        status: "approved",
      })
      .eq("id", txId);

    if (!error) {
      fetchTransactions();
    } else {
      alert("Erreur de validation : " + error.message);
    }
  };

  const openBudgetAllocation = (project: Project) => {
    setBudgetProject(project);
    setBudgetUSD(project.budget_allocated_usd?.toString() || project.budget?.toString() || "");
    setBudgetCDF(project.budget_allocated_cdf?.toString() || "");
    setShowBudgetModal(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetProject) return;
    setBudgetSaving(true);

    const valUSD = parseFloat(budgetUSD) || 0;
    const valCDF = parseFloat(budgetCDF) || 0;

    const { error } = await supabase
      .from("projects")
      .update({
        budget_allocated_usd: valUSD,
        budget_allocated_cdf: valCDF,
        budget: valUSD,
      })
      .eq("id", budgetProject.id);

    if (!error) {
      setShowBudgetModal(false);
      fetchProjects();
      fetchTransactions();
    } else {
      alert("Erreur de mise à jour du budget : " + error.message);
    }
    setBudgetSaving(false);
  };

  const fetchProjects = async () => {
    const { data: prjData } = await supabase.from("projects").select("*").order("title");
    if (prjData) {
      setProjects(prjData as Project[]);
    }
  };

  // Calculations: Solde Net USD & Solde Net CDF
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

  // Dépenses du jour (USD & CDF)
  const todayStr = new Date().toISOString().split("T")[0];
  const todayExpensesUSD = transactions
    .filter(
      (t) =>
        t.currency === "USD" &&
        t.transaction_type === "EXPENSE" &&
        t.created_at?.startsWith(todayStr)
    )
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const todayExpensesCDF = transactions
    .filter(
      (t) =>
        t.currency === "CDF" &&
        t.transaction_type === "EXPENSE" &&
        t.created_at?.startsWith(todayStr)
    )
    .reduce((acc, t) => acc + Number(t.amount), 0);

  // Operations needing validation
  const pendingApprovalsCount = transactions.filter(
    (t) => t.status === "pending" && t.requires_management_approval
  ).length;

  const canCreateTransaction = [
    "admin",
    "accountant",
    "site_manager",
    "company_management",
  ].includes(currentUser?.role || "");

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Realtime Floating Notification */}
      {realtimeToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-white border border-emerald-300 text-emerald-900 text-xs font-semibold shadow-2xl animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-[#7BA238] animate-ping" />
          <span>{realtimeToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#1C1F23] tracking-tight flex items-center gap-2.5">
            <Coins className="w-6 h-6 text-[#7BA238]" />
            <span>Gestion de Trésorerie & Caisses de Chantier</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Comptabilité multi-devises (USD / Franc Congolais CDF), décaissements chantiers, pilotage des budgets et synchronisation temps réel.
          </p>
        </div>

        {canCreateTransaction && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-semibold shadow-sm transition flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nouvelle Opération de Caisse</span>
          </button>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === "transactions"
              ? "bg-[#8E2424]/10 text-[#8E2424] border border-[#8E2424]/30"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Mouvements de Caisse & Flux</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
            {transactions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("budgets")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === "budgets"
              ? "bg-[#7BA238]/10 text-[#7BA238] border border-[#7BA238]/30"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <PieChart className="w-4 h-4 text-[#7BA238]" />
          <span>Budgets & Engagements Chantiers</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
            {projects.length}
          </span>
        </button>
      </div>

      {/* Alert Banner for Management Approvals */}
      {pendingApprovalsCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4 text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <strong className="font-semibold text-amber-950">Visa Direction Générale Requis : </strong>
              <span>
                {pendingApprovalsCount} opération(s) financière(s) dépassent le seuil de conformité de 5 000 USD et requièrent l&apos;accord de la Direction.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
            Seuil &gt; 5 000 USD
          </span>
        </div>
      )}

      {/* Live Treasury Summary Cards (USD, CDF, Dépenses du jour, Taux) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Solde Net USD */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.07)] transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              SOLDE NET CAISSE (USD)
            </span>
            <div className="w-8 h-8 rounded-full bg-[#7BA238]/10 flex items-center justify-center text-[#7BA238]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl lg:text-3xl font-bold text-[#7BA238] tracking-tight">
            {formatUSD(netUSD)}
          </div>
          <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between pt-2.5 border-t border-slate-100">
            <span className="text-emerald-700 font-medium">Entrées : {formatUSD(totalIncomeUSD)}</span>
            <span className="text-[#8E2424] font-medium">Sorties : {formatUSD(totalExpenseUSD)}</span>
          </div>
        </div>

        {/* Card 2: Solde Net CDF */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.07)] transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              SOLDE NET CAISSE (CDF)
            </span>
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl lg:text-3xl font-bold text-amber-600 tracking-tight">
            {formatCDF(netCDF)}
          </div>
          <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between pt-2.5 border-t border-slate-100">
            <span className="text-emerald-700 font-medium">Entrées : {formatCDF(totalIncomeCDF)}</span>
            <span className="text-[#8E2424] font-medium">Sorties : {formatCDF(totalExpenseCDF)}</span>
          </div>
        </div>

        {/* Card 3: Dépenses du Jour */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.07)] transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              DÉPENSES DU JOUR
            </span>
            <div className="w-8 h-8 rounded-full bg-[#8E2424]/10 flex items-center justify-center text-[#8E2424]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl lg:text-3xl font-bold text-[#8E2424] tracking-tight">
            {formatUSD(todayExpensesUSD)}
          </div>
          <div className="mt-3 text-[11px] text-slate-500 pt-2.5 border-t border-slate-100">
            Équivalent local : <span className="font-semibold text-slate-700">{formatCDF(todayExpensesCDF)}</span>
          </div>
        </div>

        {/* Card 4: Taux de Change BCC */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.07)] transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              TAUX OFFICIEL BCC
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl lg:text-3xl font-bold text-[#1C1F23] tracking-tight">
            1 USD = {EXCHANGE_RATE.toLocaleString()} CDF
          </div>
          <div className="mt-3 text-[11px] text-slate-500 pt-2.5 border-t border-slate-100">
            Taux de référence pour toutes les imputations
          </div>
        </div>
      </div>

      {activeTab === "transactions" ? (
        /* TRANSACTIONS TAB */
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1C1F23] flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#7BA238]" />
              <span>Historique des Mouvements de Caisse (USD & CDF)</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {transactions.length} opération(s) enregistrée(s)
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Chargement des flux de caisse en temps réel...
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Aucune écriture de caisse enregistrée. Cliquez sur &ldquo;+ Nouvelle Opération de Caisse&rdquo; pour initier un mouvement.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
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
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#1C1F23]">
                          {formatDate(tx.created_at)}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {tx.cashbox_type === "central" ? (
                            <span className="text-sky-700 font-semibold">Caisse Centrale</span>
                          ) : (
                            <span className="text-amber-700 font-semibold">Caisse Chantier</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-700 font-medium">
                          {tx.project ? `${tx.project.code} - ${tx.project.title}` : "Frais Généraux Siège"}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <span className="font-semibold text-[#1C1F23] block">
                          {tx.category}
                        </span>
                        <span className="text-slate-500 truncate block text-[11px]">
                          {tx.description}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        {tx.beneficiary ? (
                          <span className="font-medium text-slate-800">{tx.beneficiary}</span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                          {tx.payment_method || "Espèces"}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                        <span
                          className={
                            tx.transaction_type === "INCOME"
                              ? "text-emerald-700"
                              : "text-[#8E2424]"
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-[#7BA238] border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Approuvé
                          </span>
                        ) : currentUser?.role === "admin" ? (
                          <span
                            title="Séparation des Pouvoirs : L'administrateur système ne valide pas de dépenses financières"
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed select-none"
                          >
                            <Lock className="w-3 h-3 text-slate-400" />
                            SoD (Admin)
                          </span>
                        ) : currentUser?.role === "company_management" ||
                          (currentUser?.role === "accountant" && !tx.requires_management_approval) ? (
                          <button
                            onClick={() => handleValidateTransaction(tx.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#7BA238] hover:bg-[#6A8D2F] text-white transition shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approuver la Transaction
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
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
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-4">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#1C1F23] flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#7BA238]" />
                <span>Allocation & Suivi des Budgets Chantiers (USD & CDF)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilotage des enveloppes allouées par projet et calcul en direct du taux de consommation des fonds de caisse.
              </p>
            </div>
            {isAdmin && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#7BA238]/10 text-[#7BA238] border border-[#7BA238]/30">
                Administration Budgétaire Active
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
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
              <tbody className="divide-y divide-slate-100 text-slate-700">
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
                    <tr key={prj.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#1C1F23]">{prj.title}</div>
                        <div className="text-[11px] text-slate-500">{prj.code} • {prj.location}</div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {formatUSD(allocatedUSD)}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-amber-700">
                        {allocatedCDF > 0 ? formatCDF(allocatedCDF) : "-"}
                      </td>

                      <td className="py-3 px-4 font-mono text-[#8E2424] font-bold">
                        {formatUSD(prjExpensesUSD)}
                      </td>

                      <td className="py-3 px-4 font-mono text-[#8E2424] font-bold">
                        {prjExpensesCDF > 0 ? formatCDF(prjExpensesCDF) : "-"}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
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
                          <span className="font-mono text-[11px] font-bold text-slate-700">
                            {ratioUSD}%
                          </span>
                        </div>
                      </td>

                      {isAdmin && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openBudgetAllocation(prj)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 text-xs font-semibold inline-flex items-center gap-1.5 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto text-[#1C1F23] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#1C1F23] flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#7BA238]" />
                <span>Nouvelle Opération de Caisse & Trésorerie</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4 text-xs">
              {/* Type: Income or Expense */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                  Sens de l&apos;Opération *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTransactionType("EXPENSE")}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition ${
                      transactionType === "EXPENSE"
                        ? "bg-rose-50 border-rose-300 text-[#8E2424] shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4 text-[#8E2424]" />
                    <span>Sortie (Décaissement)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTransactionType("INCOME")}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition ${
                      transactionType === "INCOME"
                        ? "bg-emerald-50 border-emerald-300 text-[#7BA238] shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-[#7BA238]" />
                    <span>Entrée (Encaissement)</span>
                  </button>
                </div>
              </div>

              {/* Amount & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Montant *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="ex: 1500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold text-sm focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Devise *</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold text-xs focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  >
                    <option value="USD">USD ($ - Dollars Américains)</option>
                    <option value="CDF">CDF (FC - Francs Congolais)</option>
                  </select>
                </div>
              </div>

              {/* Indicative Conversion Note */}
              {amount && parseFloat(amount) > 0 && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Conversion indicative (Taux 1 USD = 2 850 CDF) :</span>
                  <span className="font-mono font-bold text-slate-900">
                    {currency === "USD"
                      ? formatCDF(parseFloat(amount) * EXCHANGE_RATE)
                      : formatUSD(parseFloat(amount) / EXCHANGE_RATE)}
                  </span>
                </div>
              )}

              {/* Chantier d'imputation & Caisse */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Chantier d&apos;Imputation
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-[#8E2424]"
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
                  <label className="block text-slate-700 font-semibold mb-1">
                    Type de Caisse
                  </label>
                  <select
                    value={cashboxType}
                    onChange={(e) => setCashboxType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  >
                    <option value="site">Caisse Chantier</option>
                    <option value="central">Caisse Centrale (Siège)</option>
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Catégorie Opérationnelle *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-[#8E2424]"
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
                  <label className="block text-slate-700 font-semibold mb-1">
                    Bénéficiaire / Fournisseur
                  </label>
                  <input
                    type="text"
                    placeholder="ex: TotalEnergies, Socimex, Salarié..."
                    value={beneficiary}
                    onChange={(e) => setBeneficiary(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-[#8E2424]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Mode de Paiement
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-[#8E2424]"
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
                <label className="block text-slate-700 font-semibold mb-1">
                  Motif & Justification de l&apos;Opération *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Détail précis, n° de reçu, bon d'achat ou référence..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-[#8E2424]"
                />
              </div>

              {/* Threshold Notice */}
              {((currency === "USD" && parseFloat(amount) >= 5000) ||
                (currency === "CDF" && parseFloat(amount) >= 5000 * EXCHANGE_RATE)) && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                  <span>Montant &ge; 5 000 USD : Soumis au visa obligatoire de la Direction Générale.</span>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
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
                  className="px-5 py-2 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-semibold transition disabled:opacity-50 shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full p-6 shadow-2xl space-y-4 text-[#1C1F23] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#1C1F23] flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#7BA238]" />
                <span>Allouer le Budget : {budgetProject.code}</span>
              </h3>
              <button
                onClick={() => setShowBudgetModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4 text-xs">
              <div>
                <span className="text-xs text-slate-800 block font-bold mb-1">
                  {budgetProject.title}
                </span>
                <span className="text-[11px] text-slate-500">
                  Lieu : {budgetProject.location} • Client : {budgetProject.client_name}
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Budget Alloué en USD ($) *
                </label>
                <input
                  type="number"
                  step="100"
                  required
                  value={budgetUSD}
                  onChange={(e) => setBudgetUSD(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold focus:bg-white focus:outline-none focus:border-[#8E2424]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Budget Alloué en Francs Congolais (CDF)
                </label>
                <input
                  type="number"
                  step="10000"
                  value={budgetCDF}
                  onChange={(e) => setBudgetCDF(e.target.value)}
                  placeholder="ex: 50000000"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold focus:bg-white focus:outline-none focus:border-[#8E2424]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={budgetSaving}
                  className="px-5 py-2 rounded-xl bg-[#7BA238] hover:bg-[#6A8D2F] text-white text-xs font-semibold transition disabled:opacity-50 shadow-sm"
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
