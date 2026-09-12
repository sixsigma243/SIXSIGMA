"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PayrollPeriod, Profile } from "@/types/database";
import { formatDate } from "@/lib/utils";
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
} from "lucide-react";

interface PayrollSectionProps {
  currentUser: Profile | null;
}

export function PayrollSection({ currentUser }: PayrollSectionProps) {
  const supabase = createClient();

  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const canManagePayroll = currentUser?.role === "hr_officer" || currentUser?.role === "admin" || currentUser?.role === "company_management";

  const fetchPeriods = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payroll_periods")
      .select("*")
      .order("start_date", { ascending: false });

    if (data) {
      setPeriods(data as PayrollPeriod[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  // 1. Calcul Automatique de l'Enveloppe Salariale
  const handleCalculatePayroll = async (period: PayrollPeriod) => {
    setProcessingId(period.id);
    try {
      // Récupération des employés et des pointages du mois
      const { data: activeProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, base_salary, role")
        .eq("is_active", true);

      const workerCount = activeProfiles?.length || 0;
      // Calcul estimé de l'enveloppe à partir des salaires de base
      let totalGross = 0;
      activeProfiles?.forEach((p) => {
        totalGross += Number(p.base_salary) || 650; // salaire moyen indicatif si non renseigné
      });

      const totalDeductions = Math.round(totalGross * 0.13); // CNSS + IPR RDC ~13%
      const totalNet = totalGross - totalDeductions;

      const { error } = await supabase
        .from("payroll_periods")
        .update({
          total_gross: totalGross,
          total_deductions: totalDeductions,
          total_net: totalNet,
          currency: "USD",
          status: "calculated",
        })
        .eq("id", period.id);

      if (error) throw error;

      showToast("success", `Enveloppe salariale calculée : Net à payer = ${totalNet.toLocaleString("fr-FR")} USD (${workerCount} agents).`);
      fetchPeriods();
    } catch (err: any) {
      showToast("error", "Erreur de calcul de paie : " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  // 2. Transmission au Module Caisse / Finance pour Paiement (SoD)
  const handleTransmitToFinance = async (period: PayrollPeriod) => {
    if (!currentUser) return;
    if (!period.total_net || period.total_net <= 0) {
      alert("Veuillez d'abord calculer l'enveloppe salariale de cette période.");
      return;
    }

    if (!window.confirm(`Confirmez-vous la transmission de la masse salariale (${Number(period.total_net).toLocaleString("fr-FR")} USD) au module Caisse & Trésorerie pour exécution comptable ?`)) {
      return;
    }

    setProcessingId(period.id);
    try {
      // Création de l'opération de décaissement dans cashbox_transactions
      const { data: tx, error: txError } = await supabase
        .from("cashbox_transactions")
        .insert({
          cashbox_type: "central",
          transaction_type: "EXPENSE",
          amount: period.total_net,
          currency: period.currency || "USD",
          exchange_rate: 2850,
          category: "PAIE / SALAIRES",
          description: `Règlement Masse Salariale Consolidée - Période ${period.period_name}`,
          beneficiary: "Masse Salariale du Personnel SIX SIGMA SARL",
          status: "pending",
          requires_management_approval: Number(period.total_net) > 5000,
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (txError) throw txError;

      // Mise à jour de la période de paie
      const { error: periodError } = await supabase
        .from("payroll_periods")
        .update({
          status: "transmitted_to_finance",
          transmitted_at: new Date().toISOString(),
          finance_transaction_id: tx.id,
        })
        .eq("id", period.id);

      if (periodError) throw periodError;

      // Log d'audit
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

      showToast("success", `Masse salariale de ${period.period_name} transmise avec succès à la Caisse pour décaissement.`);
      fetchPeriods();
    } catch (err: any) {
      showToast("error", "Erreur lors de la transmission à la Caisse : " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3 transition ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-[#7BA238]" />
          ) : (
            <AlertCircle className="w-5 h-5 text-[#8E2424]" />
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
                Séparation des Tâches (SoD) Active
              </span>
              <span className="text-xs text-slate-400">• RH &rarr; Caisse Centrale</span>
            </div>
            <h2 className="text-lg font-bold text-[#1C1F23]">Module de Calcul de Paie & Transmission Caisse</h2>
            <p className="text-xs text-slate-500 mt-1">
              Les Ressources Humaines calculent l&apos;enveloppe salariale globale consolidée, puis la transmettent au module Finance pour ordonnancement et décaissement comptable.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Taux Officiel BCC</span>
              <span className="text-xs font-mono font-bold text-slate-800">1 USD = 2 850 CDF</span>
            </div>
          </div>
        </div>
      </div>

      {/* Periods List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">
          Chargement des périodes de paie...
        </div>
      ) : periods.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs">
          Aucune période de paie enregistrée.
        </div>
      ) : (
        <div className="space-y-4">
          {periods.map((period) => {
            const isCalculated = period.status === "calculated" || Number(period.total_net) > 0;
            const isTransmitted = period.status === "transmitted_to_finance";
            const isPaid = period.status === "paid";

            return (
              <div
                key={period.id}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-slate-200 transition space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[#1C1F23]">{period.period_name}</h3>
                        {period.is_locked ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Période Clôturée
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <Unlock className="w-3 h-3" /> Période Ouverte
                          </span>
                        )}

                        {isTransmitted ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                            <Send className="w-3 h-3" /> Transmis en Caisse
                          </span>
                        ) : isPaid ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7BA238]/10 text-[#7BA238] border border-[#7BA238]/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Payé
                          </span>
                        ) : isCalculated ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Calculator className="w-3 h-3" /> Calculé (Prêt à transmettre)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Brouillon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Période d&apos;activité du {formatDate(period.start_date)} au {formatDate(period.end_date)}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {canManagePayroll && (
                    <div className="flex items-center gap-2">
                      {/* 1. Recalculate Button */}
                      {!isTransmitted && !isPaid && (
                        <button
                          onClick={() => handleCalculatePayroll(period)}
                          disabled={processingId === period.id}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <Calculator className="w-3.5 h-3.5 text-slate-500" />
                          <span>Calculer Masse Salariale</span>
                        </button>
                      )}

                      {/* 2. Transmit to Finance Button */}
                      {!isTransmitted && !isPaid && isCalculated && (
                        <button
                          onClick={() => handleTransmitToFinance(period)}
                          disabled={processingId === period.id}
                          className="px-4 py-1.5 rounded-xl bg-[#7BA238] hover:bg-[#6A8D2F] text-white text-xs font-bold shadow-md shadow-[#7BA238]/20 transition flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Transmettre à la Caisse</span>
                        </button>
                      )}

                      {isTransmitted && (
                        <div className="text-right text-[11px] text-indigo-700 font-semibold bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>En attente de décaissement par la Comptabilité</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Financial Envelope Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Brut (Salaires de base)</span>
                    <span className="text-base font-mono font-bold text-slate-900 mt-1 block">
                      {Number(period.total_gross || 0).toLocaleString("fr-FR")} USD
                    </span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Cotisations & IPR (Déductions)</span>
                    <span className="text-base font-mono font-bold text-rose-700 mt-1 block">
                      - {Number(period.total_deductions || 0).toLocaleString("fr-FR")} USD
                    </span>
                  </div>

                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Net Global à Décaisser</span>
                    <span className="text-base font-mono font-black text-emerald-800 mt-1 block">
                      {Number(period.total_net || 0).toLocaleString("fr-FR")} USD
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
