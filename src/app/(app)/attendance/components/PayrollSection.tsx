"use client";

import React, { useState, useEffect, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { PayrollPeriod, PayrollItem, Profile } from "@/types/database";
import { formatDate } from "@/lib/utils";
import {
  calculateMonthlyPayrollAction,
  updatePayrollItemAction,
  createPayrollPeriodAction,
} from "../actions";
import {
  Coins,
  Calculator,
  Send,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  AlertCircle,
  FileSpreadsheet,
  TrendingUp,
  DollarSign,
  Users,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit2,
  X,
  Save,
  Download,
  Info,
} from "lucide-react";

interface PayrollSectionProps {
  currentUser: Profile | null;
}

type ExtendedPayrollItem = PayrollItem & {
  profile?: {
    employee_id?: string | null;
    role?: string;
    trade_category?: string | null;
    job_title?: string | null;
    sub_role?: string | null;
    daily_rate?: number | string;
    base_salary?: number | string;
  };
};

export function PayrollSection({ currentUser }: PayrollSectionProps) {
  const supabase = createClient();

  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [items, setItems] = useState<ExtendedPayrollItem[]>([]);

  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "staff" | "worker">("all");

  // Create Period Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [isCreatingPeriod, setIsCreatingPeriod] = useState(false);

  // Edit Item Modal
  const [editingItem, setEditingItem] = useState<ExtendedPayrollItem | null>(null);
  const [editDaysWorked, setEditDaysWorked] = useState("0");
  const [editBonuses, setEditBonuses] = useState("0");
  const [editDeductions, setEditDeductions] = useState("0");
  const [editAbsences, setEditAbsences] = useState("0");
  const [editNotes, setEditNotes] = useState("");
  const [isSavingItem, setIsSavingItem] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const canManagePayroll =
    currentUser?.role === "hr_officer" ||
    currentUser?.role === "admin" ||
    currentUser?.role === "company_management";

  const EXCHANGE_RATE = 2850;

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // 1. Fetch periods
  const fetchPeriods = async () => {
    setLoadingPeriods(true);
    const { data, error } = await supabase
      .from("payroll_periods")
      .select("*")
      .order("start_date", { ascending: false });

    if (data) {
      setPeriods(data as PayrollPeriod[]);
      if (!selectedPeriodId && data.length > 0) {
        setSelectedPeriodId(data[0].id);
      }
    }
    setLoadingPeriods(false);
  };

  // 2. Fetch items for selected period
  const fetchItems = async (periodId: string) => {
    setLoadingItems(true);
    const { data, error } = await supabase
      .from("payroll_items")
      .select(`
        *,
        profile:profile_id (
          employee_id,
          role,
          trade_category,
          job_title,
          sub_role,
          daily_rate,
          base_salary
        )
      `)
      .eq("period_id", periodId)
      .order("worker_name");

    if (data) {
      setItems(data as ExtendedPayrollItem[]);
    } else {
      setItems([]);
    }
    setLoadingItems(false);
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      fetchItems(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  // 3. Trigger Calculation
  const handleCalculatePayroll = (period: PayrollPeriod) => {
    setProcessingId(period.id);
    startTransition(async () => {
      const res = await calculateMonthlyPayrollAction(period.id);
      if (res.success) {
        showToast(
          "success",
          `Paie mensuelle calculée pour ${res.count} agents (Masse nette : ${Number(
            res.totalNet
          ).toLocaleString("fr-FR")} USD).`
        );
        fetchPeriods();
        fetchItems(period.id);
      } else {
        showToast("error", res.error || "Erreur de calcul.");
      }
      setProcessingId(null);
    });
  };

  // 4. Transmit to Finance (SoD)
  const handleTransmitToFinance = async (period: PayrollPeriod) => {
    if (!currentUser) return;
    if (!period.total_net || Number(period.total_net) <= 0) {
      alert("Veuillez d'abord calculer l'enveloppe salariale mensuelle.");
      return;
    }

    if (
      !window.confirm(
        `Confirmez-vous la transmission de la masse salariale mensuelle (${Number(
          period.total_net
        ).toLocaleString("fr-FR")} USD) à la Caisse Centrale pour décaissement ?`
      )
    ) {
      return;
    }

    setProcessingId(period.id);
    try {
      const { data: tx, error: txError } = await supabase
        .from("cashbox_transactions")
        .insert({
          cashbox_type: "central",
          transaction_type: "EXPENSE",
          amount: period.total_net,
          currency: period.currency || "USD",
          exchange_rate: EXCHANGE_RATE,
          category: "PAIE / SALAIRES",
          description: `Règlement Masse Salariale Consolidée (Staff & Ouvriers) - ${period.period_name}`,
          beneficiary: "Personnel Général SIX SIGMA SARL",
          status: "pending",
          requires_management_approval: Number(period.total_net) > 5000,
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (txError) throw txError;

      const { error: periodError } = await supabase
        .from("payroll_periods")
        .update({
          status: "transmitted_to_finance",
          transmitted_at: new Date().toISOString(),
          finance_transaction_id: tx.id,
        })
        .eq("id", period.id);

      if (periodError) throw periodError;

      await supabase.from("audit_logs").insert({
        table_name: "payroll_periods",
        record_id: period.id,
        action: "TRANSMIT_PAYROLL_TO_FINANCE",
        new_data: {
          period_name: period.period_name,
          total_net: period.total_net,
          cashbox_transaction_id: tx.id,
          operator: currentUser.full_name,
        },
        performed_by: currentUser.id,
        performed_at: new Date().toISOString(),
      });

      showToast(
        "success",
        `Masse salariale de ${period.period_name} transmise à la Caisse pour ordonnancement.`
      );
      fetchPeriods();
    } catch (err: any) {
      showToast("error", "Erreur lors de la transmission : " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  // 5. Create new period
  const handleCreatePeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingPeriod(true);
    try {
      const formData = new FormData();
      formData.append("period_name", newPeriodName);
      formData.append("start_date", newStartDate);
      formData.append("end_date", newEndDate);

      const res = await createPayrollPeriodAction(formData);
      if (res.success && res.period) {
        showToast("success", `Période ${newPeriodName} créée avec succès.`);
        setShowCreateModal(false);
        setNewPeriodName("");
        setNewStartDate("");
        setNewEndDate("");
        await fetchPeriods();
        setSelectedPeriodId(res.period.id);
      } else {
        showToast("error", res.error || "Erreur de création de la période.");
      }
    } finally {
      setIsCreatingPeriod(false);
    }
  };

  // 6. Save Item Adjustments
  const handleSaveItemAdjustments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSavingItem(true);
    try {
      const res = await updatePayrollItemAction(editingItem.id, {
        days_worked: Number(editDaysWorked) || 0,
        bonuses: Number(editBonuses) || 0,
        deductions: Number(editDeductions) || 0,
        absence_days: Number(editAbsences) || 0,
        notes: editNotes,
      });

      if (res.success) {
        showToast("success", `Ajustements enregistrés pour ${editingItem.worker_name}.`);
        setEditingItem(null);
        if (selectedPeriodId) {
          fetchItems(selectedPeriodId);
          fetchPeriods();
        }
      } else {
        showToast("error", res.error || "Échec de l'enregistrement.");
      }
    } finally {
      setIsSavingItem(false);
    }
  };

  const openEditItemModal = (item: ExtendedPayrollItem) => {
    setEditingItem(item);
    setEditDaysWorked(String(item.days_worked || 0));
    setEditBonuses(String(item.bonuses || 0));
    setEditDeductions(String(item.deductions || 0));
    setEditAbsences(String(item.absence_days || 0));
    setEditNotes(item.notes || "");
  };

  // 7. Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.worker_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.profile?.employee_id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.profile?.trade_category || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.profile?.job_title || "").toLowerCase().includes(searchTerm.toLowerCase());

    const isWorker = item.profile?.role === "worker";
    if (roleFilter === "staff" && isWorker) return false;
    if (roleFilter === "worker" && !isWorker) return false;

    return matchesSearch;
  });

  // Export CSV
  const handleExportCSV = () => {
    if (items.length === 0) {
      alert("Aucune donnée à exporter.");
      return;
    }

    const currentPeriod = periods.find((p) => p.id === selectedPeriodId);
    const headers = [
      "Matricule",
      "Nom Complet",
      "Role",
      "Metier",
      "Mode Calcul",
      "Jours Travailles",
      "Salaire Base Mensuel USD",
      "Primes USD",
      "Deductions USD",
      "Net USD",
      "Net CDF (Taux 2850)",
    ];

    const rows = filteredItems.map((it) => [
      it.profile?.employee_id || "N/A",
      `"${it.worker_name}"`,
      it.profile?.role || "worker",
      `"${it.profile?.trade_category || it.profile?.job_title || "Manœuvre"}"`,
      it.calculation_mode === "daily_rate_worked"
        ? "Taux Journalier × Jours Travaillés"
        : it.calculation_mode === "monthly_allowance_26d"
        ? "Forfait Ouvrier 26j"
        : "Salaire Fixe Mensuel",
      it.days_worked || (it.profile?.role === "worker" ? 0 : 26),
      it.base_salary,
      it.bonuses || 0,
      it.deductions || 0,
      it.net_salary,
      Math.round(Number(it.net_salary) * EXCHANGE_RATE),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `paie_mensuelle_${currentPeriod?.period_name?.replace(/\s+/g, "_") || "export"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3 transition animate-in fade-in ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-[#7BA238] flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-[#8E2424] flex-shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Presentation Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                Paie Mensuelle Unifiée • BTP & Mines RDC
              </span>
              <span className="text-xs text-slate-400">• Base légale de référence : 26 jours / mois</span>
            </div>
            <h2 className="text-lg font-bold text-[#1C1F23]">
              Module de Calcul de Paie Mensuelle & Transmission Caisse
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Tous les effectifs (cadres, staff et 126 ouvriers) sont consolidés sur une base mensuelle standardisée avec calcul automatique des cotisations CNSS et IPR, puis transmission pour décaissement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Taux Officiel BCC</span>
              <span className="text-xs font-mono font-bold text-slate-800">1 USD = 2 850 CDF</span>
            </div>

            {canManagePayroll && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvelle Période</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Periods Selector Carousel / Cards */}
      {loadingPeriods ? (
        <div className="text-center py-8 text-slate-400 text-xs">
          Chargement des périodes de paie...
        </div>
      ) : periods.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-xs">
          Aucune période de paie enregistrée. Cliquez sur &quot;Nouvelle Période&quot; pour commencer.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {periods.map((period) => {
            const isSelected = period.id === selectedPeriodId;
            const isCalculated = period.status === "calculated" || Number(period.total_net) > 0;
            const isTransmitted = period.status === "transmitted_to_finance";
            const isPaid = period.status === "paid";

            return (
              <div
                key={period.id}
                onClick={() => setSelectedPeriodId(period.id)}
                className={`p-5 rounded-2xl border transition cursor-pointer relative ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10"
                    : "bg-white text-[#1C1F23] border-slate-100 hover:border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Coins className={`w-4 h-4 ${isSelected ? "text-emerald-400" : "text-emerald-600"}`} />
                    <h3 className="text-sm font-bold truncate">{period.period_name}</h3>
                  </div>

                  {isTransmitted ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                      <Send className="w-3 h-3" /> Transmis
                    </span>
                  ) : isPaid ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Payé
                    </span>
                  ) : isCalculated ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Calculator className="w-3 h-3" /> Prêt
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">
                      Brouillon
                    </span>
                  )}
                </div>

                <p className={`text-[11px] mb-3 ${isSelected ? "text-slate-400" : "text-slate-500"}`}>
                  Du {formatDate(period.start_date)} au {formatDate(period.end_date)}
                </p>

                <div className="pt-2 border-t border-slate-100/10 flex items-end justify-between">
                  <div>
                    <span className={`text-[10px] uppercase font-bold block ${isSelected ? "text-slate-400" : "text-slate-400"}`}>
                      Net Global
                    </span>
                    <span className={`text-base font-mono font-black ${isSelected ? "text-emerald-400" : "text-emerald-800"}`}>
                      {Number(period.total_net || 0).toLocaleString("fr-FR")} USD
                    </span>
                  </div>

                  <span className={`text-[10px] font-semibold ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                    {Math.round(Number(period.total_net || 0) * EXCHANGE_RATE).toLocaleString("fr-FR")} CDF
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Period Operations & Breakdown */}
      {selectedPeriod && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6">
          {/* Header of Active Period */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#1C1F23]">
                  Feuille de Paie Mensuelle : {selectedPeriod.period_name}
                </h3>
                {selectedPeriod.is_locked ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Période Clôturée
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 flex items-center gap-1">
                    <Unlock className="w-3 h-3" /> Période Ouverte
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Consolidation de l&apos;ensemble du personnel : Staff Cadres (Salaire de base fixe) et Ouvriers de chantier (Forfait légal mensuel 26j).
              </p>
            </div>

            {/* Actions for this period */}
            {canManagePayroll && (
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Recalculate Button */}
                {selectedPeriod.status !== "transmitted_to_finance" && selectedPeriod.status !== "paid" && (
                  <button
                    onClick={() => handleCalculatePayroll(selectedPeriod)}
                    disabled={processingId === selectedPeriod.id || isPending}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5 text-slate-600" />
                    <span>
                      {processingId === selectedPeriod.id ? "Calcul en cours..." : "Calculer Masse Salariale Mensuelle"}
                    </span>
                  </button>
                )}

                {/* 2. Transmit to Finance Button */}
                {selectedPeriod.status !== "transmitted_to_finance" &&
                  selectedPeriod.status !== "paid" &&
                  Number(selectedPeriod.total_net) > 0 && (
                    <button
                      onClick={() => handleTransmitToFinance(selectedPeriod)}
                      disabled={processingId === selectedPeriod.id}
                      className="px-4 py-2 rounded-xl bg-[#7BA238] hover:bg-[#6A8D2F] text-white text-xs font-bold shadow-md shadow-[#7BA238]/20 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Transmettre à la Caisse Centrale</span>
                    </button>
                  )}

                {selectedPeriod.status === "transmitted_to_finance" && (
                  <div className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Masse salariale transmise en Caisse • En attente de décaissement</span>
                  </div>
                )}

                {/* Export Button */}
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  title="Exporter la feuille de paie en CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Exporter CSV</span>
                </button>
              </div>
            )}
          </div>

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total Brut Consolidé
              </span>
              <span className="text-lg font-mono font-bold text-slate-900 mt-1 block">
                {Number(selectedPeriod.total_gross || 0).toLocaleString("fr-FR")} USD
              </span>
              <span className="text-[10px] text-slate-500">Salaires fixes + Forfaits ouvriers 26j</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Cotisations CNSS & IPR RDC
              </span>
              <span className="text-lg font-mono font-bold text-rose-700 mt-1 block">
                - {Number(selectedPeriod.total_deductions || 0).toLocaleString("fr-FR")} USD
              </span>
              <span className="text-[10px] text-slate-500">~13% retenues légales obligatoires</span>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                Net Global à Décaisser (USD)
              </span>
              <span className="text-lg font-mono font-black text-emerald-900 mt-1 block">
                {Number(selectedPeriod.total_net || 0).toLocaleString("fr-FR")} USD
              </span>
              <span className="text-[10px] text-emerald-700">À ordonnancer par la Caisse</span>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                Équivalent Francs Congolais (CDF)
              </span>
              <span className="text-lg font-mono font-black text-emerald-900 mt-1 block">
                {Math.round(Number(selectedPeriod.total_net || 0) * EXCHANGE_RATE).toLocaleString("fr-FR")} CDF
              </span>
              <span className="text-[10px] text-emerald-700">Taux officiel BCC : 2 850 CDF</span>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher par nom, matricule (SS-RH-...), fonction..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#8E2424]/20 focus:border-[#8E2424]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setRoleFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    roleFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Tous ({items.length})
                </button>
                <button
                  onClick={() => setRoleFilter("staff")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    roleFilter === "staff" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Staff & Cadres ({items.filter((i) => i.profile?.role !== "worker").length})
                </button>
                <button
                  onClick={() => setRoleFilter("worker")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    roleFilter === "worker" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Ouvriers ({items.filter((i) => i.profile?.role === "worker").length})
                </button>
              </div>
            </div>
          </div>

          {/* Unified Payroll Items Table */}
          {loadingItems ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Chargement des bulletins de paie individuels...
            </div>
          ) : items.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-10 text-center text-slate-400 text-xs space-y-2">
              <p>Aucun bulletin de paie généré pour cette période.</p>
              {canManagePayroll && (
                <button
                  onClick={() => handleCalculatePayroll(selectedPeriod)}
                  disabled={processingId === selectedPeriod.id}
                  className="px-4 py-2 rounded-xl bg-[#8E2424] hover:bg-[#781E1E] text-white text-xs font-bold shadow-md shadow-[#8E2424]/20 transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Générer la paie mensuelle unifiée (Staff + 126 ouvriers)</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              {(() => {
                const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
                const paginatedItems = filteredItems.slice(
                  (currentPage - 1) * ITEMS_PER_PAGE,
                  currentPage * ITEMS_PER_PAGE
                );

                return (
                  <>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Matricule & Agent</th>
                          <th className="py-3 px-4">Fonction / Rôle</th>
                          <th className="py-3 px-4">Mode de Calcul</th>
                          <th className="py-3 px-4 text-right">Salaire Base Mensuel</th>
                          <th className="py-3 px-4 text-right">Primes</th>
                          <th className="py-3 px-4 text-right">Déductions (CNSS/IPR)</th>
                          <th className="py-3 px-4 text-right">Net à Payer (USD)</th>
                          <th className="py-3 px-4 text-right">Net CDF (2 850)</th>
                          {canManagePayroll && <th className="py-3 px-4 text-center">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[#1C1F23]">
                        {paginatedItems.map((item) => {
                          const isWorker = item.profile?.role === "worker" || item.calculation_mode === "daily_rate_worked";
                          const netCdf = Math.round(Number(item.net_salary || 0) * EXCHANGE_RATE);

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{item.worker_name}</div>
                                <div className="font-mono text-[10px] text-[#8E2424] font-semibold">
                                  {item.profile?.employee_id || "SS-RH-XXXX"}
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-700">
                                  {item.profile?.trade_category || item.profile?.job_title || (isWorker ? "Ouvrier" : "Cadre")}
                                </div>
                                <div className="text-[10px] text-slate-400 capitalize">
                                  {isWorker ? "Ouvrier de chantier" : item.profile?.role}
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                {isWorker ? (
                                  <div>
                                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-sky-50 text-sky-800 border border-sky-200 inline-flex items-center gap-1">
                                      Taux Journalier × Jours Travaillés
                                    </span>
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                      {item.profile?.daily_rate || 15} USD/j × {item.days_worked || 0} j. pointés
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-purple-50 text-purple-800 border border-purple-200 inline-flex items-center gap-1">
                                      Salaire Fixe Mensuel
                                    </span>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                      Cadre / Staff (Base 26j)
                                    </div>
                                  </div>
                                )}
                                {item.absence_days && item.absence_days > 0 ? (
                                  <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                                    {item.absence_days} j. absence déduits
                                  </div>
                                ) : null}
                              </td>

                              <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">
                                {Number(item.base_salary).toLocaleString("fr-FR")} USD
                              </td>

                              <td className="py-3 px-4 text-right font-mono text-emerald-700 font-medium">
                                +{Number(item.bonuses || 0).toLocaleString("fr-FR")} USD
                              </td>

                              <td className="py-3 px-4 text-right font-mono text-rose-700 font-medium">
                                -{Number(item.deductions || 0).toLocaleString("fr-FR")} USD
                              </td>

                              <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 text-sm">
                                {Number(item.net_salary).toLocaleString("fr-FR")} USD
                              </td>

                              <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-500 font-medium">
                                {netCdf.toLocaleString("fr-FR")} CDF
                              </td>

                              {canManagePayroll && (
                                <td className="py-3 px-4 text-center">
                                  {selectedPeriod.status !== "transmitted_to_finance" && selectedPeriod.status !== "paid" ? (
                                    <button
                                      onClick={() => openEditItemModal(item)}
                                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                                      title="Ajuster primes, jours ou déductions"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">Verrouillé</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Pagination Bar */}
                    {totalPages > 1 && (
                      <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                        <div className="text-[11px] text-slate-500">
                          Affichage de <span className="font-bold text-slate-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> à{" "}
                          <span className="font-bold text-slate-800">
                            {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)}
                          </span>{" "}
                          sur <span className="font-bold text-slate-800">{filteredItems.length}</span> bulletins
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-xs font-semibold transition"
                          >
                            Précédent
                          </button>

                          <span className="px-3 py-1.5 font-mono font-bold text-xs text-slate-700 bg-white border border-slate-200 rounded-lg">
                            Page {currentPage} / {totalPages}
                          </span>

                          <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-xs font-semibold transition"
                          >
                            Suivant
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Create Period */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#8E2424]" />
                <span>Nouvelle Période de Paie</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePeriodSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intitulé de la Période (ex: Octobre 2026) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPeriodName}
                  onChange={(e) => setNewPeriodName(e.target.value)}
                  placeholder="ex: Octobre 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#8E2424]/20 focus:border-[#8E2424]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date Début <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#8E2424]/20 focus:border-[#8E2424]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date Fin <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#8E2424]/20 focus:border-[#8E2424]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPeriod}
                  className="px-4 py-2 rounded-xl bg-[#8E2424] hover:bg-[#781E1E] text-white text-xs font-bold transition shadow-md shadow-[#8E2424]/20 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingPeriod ? "Création..." : "Créer la Période"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Item Adjustments (Bonuses, Deductions, Absences) */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Ajustement Paie : {editingItem.worker_name}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Matricule : {editingItem.profile?.employee_id || "SS-RH-XXXX"}
                </p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItemAdjustments} className="space-y-4 text-xs">
              {/* Ajustement spécifique Ouvriers : Jours réels pointés / travaillés */}
              {(editingItem.profile?.role === "worker" || editingItem.calculation_mode === "daily_rate_worked") ? (
                <div className="bg-sky-50/80 p-3.5 rounded-xl border border-sky-100 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-sky-950">Taux journalier contractuel :</span>
                    <span className="font-mono font-bold text-sky-800">
                      {editingItem.profile?.daily_rate || 15} USD / jour
                    </span>
                  </div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Nombre de Jours Réels Travaillés / Pointés
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    step="1"
                    value={editDaysWorked}
                    onChange={(e) => setEditDaysWorked(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-[#8E2424]/20 focus:border-[#8E2424] bg-white"
                    placeholder="Ex: 18"
                  />
                  <div className="text-[11px] text-sky-700 flex justify-between font-mono pt-1">
                    <span>Nouveau salaire brut calculé :</span>
                    <span className="font-bold">
                      {Math.round(Number(editingItem.profile?.daily_rate || 15) * Math.max(0, Number(editDaysWorked) || 0))} USD
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Salaire Brut Fixe Contractuel (Staff) :</span>
                  <span className="font-mono font-bold text-slate-800">
                    {Number(editingItem.base_salary).toLocaleString("fr-FR")} USD
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primes & Gratifications Exceptionnelles (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editBonuses}
                  onChange={(e) => setEditBonuses(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-[#8E2424]/20 focus:border-[#8E2424]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Déductions Globales (CNSS, IPR, Retenues) (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editDeductions}
                  onChange={(e) => setEditDeductions(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-[#8E2424]/20 focus:border-[#8E2424]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de Jours d&apos;Absence Injustifiée
                </label>
                <input
                  type="number"
                  min="0"
                  max="26"
                  value={editAbsences}
                  onChange={(e) => setEditAbsences(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-[#8E2424]/20 focus:border-[#8E2424]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motif / Commentaire RH
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Justification de la prime ou retenue..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#8E2424]/20 focus:border-[#8E2424]"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
                <span className="text-emerald-800 font-bold text-xs">Nouveau Net Estimé :</span>
                <span className="font-mono font-black text-emerald-900 text-sm">
                  {Math.max(
                    0,
                    Number(editingItem.base_salary) + (Number(editBonuses) || 0) - (Number(editDeductions) || 0)
                  ).toLocaleString("fr-FR")}{" "}
                  USD
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingItem}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingItem ? "Enregistrement..." : "Valider l'ajustement"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
