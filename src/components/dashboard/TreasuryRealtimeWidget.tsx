"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatUSD, formatCDF } from "@/lib/utils";
import { Coins, ArrowUpRight, ArrowDownLeft, Radio } from "lucide-react";

interface TreasuryRealtimeWidgetProps {
  initialUSDSpent: number;
  initialCDFSpent: number;
  initialUSDIncome?: number;
  initialCDFIncome?: number;
}

export function TreasuryRealtimeWidget({
  initialUSDSpent,
  initialCDFSpent,
  initialUSDIncome = 0,
  initialCDFIncome = 0,
}: TreasuryRealtimeWidgetProps) {
  const supabase = createClient();

  const [usdSpent, setUsdSpent] = useState(initialUSDSpent);
  const [cdfSpent, setCdfSpent] = useState(initialCDFSpent);
  const [usdIncome, setUsdIncome] = useState(initialUSDIncome);
  const [cdfIncome, setCdfIncome] = useState(initialCDFIncome);
  const [hasRealtimeUpdate, setHasRealtimeUpdate] = useState(false);

  const fetchLiveTotals = async () => {
    const { data } = await supabase
      .from("cashbox_transactions")
      .select("amount, currency, transaction_type");

    if (data) {
      const expUSD = data
        .filter((t) => t.currency === "USD" && t.transaction_type === "EXPENSE")
        .reduce((acc, t) => acc + Number(t.amount), 0);
      const incUSD = data
        .filter((t) => t.currency === "USD" && t.transaction_type === "INCOME")
        .reduce((acc, t) => acc + Number(t.amount), 0);

      const expCDF = data
        .filter((t) => t.currency === "CDF" && t.transaction_type === "EXPENSE")
        .reduce((acc, t) => acc + Number(t.amount), 0);
      const incCDF = data
        .filter((t) => t.currency === "CDF" && t.transaction_type === "INCOME")
        .reduce((acc, t) => acc + Number(t.amount), 0);

      setUsdSpent(expUSD);
      setUsdIncome(incUSD);
      setCdfSpent(expCDF);
      setCdfIncome(incCDF);

      setHasRealtimeUpdate(true);
      setTimeout(() => setHasRealtimeUpdate(false), 3000);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-treasury-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cashbox_transactions" },
        (payload) => {
          console.log("[Dashboard Realtime] cashbox update:", payload.eventType);
          fetchLiveTotals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const netUSD = usdIncome - usdSpent;
  const netCDF = cdfIncome - cdfSpent;

  return (
    <div
      className={`bg-[#14171D] rounded-xl p-5 border transition duration-500 space-y-3 shadow-sm ${
        hasRealtimeUpdate ? "border-emerald-500 ring-1 ring-emerald-500/50" : "border-[#252932]"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2 font-mono">
          <Coins className="w-4 h-4 text-slate-400" />
          <span>Trésorerie & Dépenses Chantiers</span>
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Direct</span>
          </span>
        </h3>
        <Link
          href="/finance"
          className="text-xs font-semibold text-slate-300 hover:text-white transition px-2.5 py-1 rounded-lg bg-[#1C1F23] border border-[#252932]"
        >
          Consulter
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="p-3 rounded-lg bg-[#0E1116] border border-[#252932]">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Dépenses USD</span>
          <div className="text-sm font-bold text-rose-400 mt-0.5 font-mono">
            {formatUSD(usdSpent)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Solde net : <strong className={netUSD >= 0 ? "text-emerald-400" : "text-rose-400"}>{formatUSD(netUSD)}</strong>
          </span>
        </div>

        <div className="p-3 rounded-lg bg-[#0E1116] border border-[#252932]">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Dépenses CDF</span>
          <div className="text-sm font-bold text-rose-400 mt-0.5 font-mono">
            {formatCDF(cdfSpent)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Solde net : <strong className={netCDF >= 0 ? "text-emerald-400" : "text-rose-400"}>{formatCDF(netCDF)}</strong>
          </span>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 pt-1 flex items-center justify-between">
        <span>Alerte SoD active : dépenses &gt; 5 000 USD soumises au visa DG.</span>
      </p>
    </div>
  );
}
