"use client";

import React, { useState, useMemo } from "react";
import { AuditLog } from "@/types/database";
import {
  Search,
  Filter,
  Calendar,
  RotateCcw,
  User,
  Activity,
  Database,
  Eye,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldCheck,
} from "lucide-react";

interface AuditLogsClientViewProps {
  logs: AuditLog[];
}

export function AuditLogsClientView({ logs }: AuditLogsClientViewProps) {
  const [searchOperator, setSearchOperator] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [selectedTable, setSelectedTable] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Extract unique action types from logs
  const availableActions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((log) => {
      if (log.action) set.add(log.action);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Extract unique tables from logs
  const availableTables = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((log) => {
      if (log.table_name) set.add(log.table_name);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Operator filter (name, email or system)
      if (searchOperator.trim()) {
        const query = searchOperator.toLowerCase();
        const performerName = log.performer?.full_name?.toLowerCase() || "";
        const performerEmail = log.performer?.email?.toLowerCase() || "";
        const isSystem = !log.performer && "système sql direct root admin".includes(query);
        const matchesOperator =
          performerName.includes(query) ||
          performerEmail.includes(query) ||
          isSystem;

        if (!matchesOperator) return false;
      }

      // Action filter
      if (selectedAction !== "ALL" && log.action !== selectedAction) {
        return false;
      }

      // Table filter
      if (selectedTable !== "ALL" && log.table_name !== selectedTable) {
        return false;
      }

      // Date filter (matches YYYY-MM-DD)
      if (selectedDate) {
        const logDate = new Date(log.performed_at).toISOString().split("T")[0];
        if (logDate !== selectedDate) {
          return false;
        }
      }

      return true;
    });
  }, [logs, searchOperator, selectedAction, selectedTable, selectedDate]);

  const handleResetFilters = () => {
    setSearchOperator("");
    setSelectedAction("ALL");
    setSelectedTable("ALL");
    setSelectedDate("");
  };

  const hasActiveFilters =
    searchOperator.trim() !== "" ||
    selectedAction !== "ALL" ||
    selectedTable !== "ALL" ||
    selectedDate !== "";

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Operator Search */}
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchOperator}
              onChange={(e) => setSearchOperator(e.target.value)}
              placeholder="Filtrer par opérateur (nom, email)..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8E2424] transition shadow-sm"
            />
          </div>

          {/* Action Filter */}
          <div className="relative">
            <Activity className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#8E2424] transition appearance-none cursor-pointer shadow-sm"
            >
              <option value="ALL">Toutes les actions ({logs.length})</option>
              {availableActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Table / Module Filter */}
          <div className="relative">
            <Database className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#8E2424] transition appearance-none cursor-pointer shadow-sm"
            >
              <option value="ALL">Toutes les tables ({availableTables.length})</option>
              {availableTables.map((tbl) => (
                <option key={tbl} value={tbl}>
                  {tbl}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#8E2424] transition cursor-pointer shadow-sm"
            />
          </div>
        </div>

        {/* Filter Summary & Reset Button */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Résultats : <strong className="text-[#1C1F23] font-bold">{filteredLogs.length}</strong> événement(s)
              sur {logs.length}
            </span>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#8E2424]/10 text-[#8E2424] border border-[#8E2424]/20">
                Filtres actifs
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-[#8E2424] transition px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-sm"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Réinitialiser les filtres</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/80">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Date & Heure</th>
              <th className="py-3 px-4">Table / Module</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Opérateur</th>
              <th className="py-3 px-4 text-right">Détails JSONB</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredLogs && filteredLogs.length > 0 ? (
              filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const fieldCount = Object.keys(log.new_data || log.old_data || {}).length;

                return (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(log.performed_at).toLocaleString("fr-FR")}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-bold text-slate-700 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                          {log.table_name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            log.action.includes("INSERT") || log.action.includes("INIT")
                              ? "bg-[#7BA238]/15 text-[#5A7C22] border border-[#7BA238]/40"
                              : log.action.includes("UPDATE") || log.action.includes("OVERRIDE")
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : log.action.includes("LOCK")
                              ? "bg-slate-100 text-slate-700 border border-slate-200"
                              : "bg-[#8E2424]/10 text-[#8E2424] border border-[#8E2424]/30"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {log.performer ? (
                          <div>
                            <span className="font-bold text-[#1C1F23] block">
                              {log.performer.full_name}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {log.performer.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-slate-400" />
                            Système / SQL Direct
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 hover:text-[#1C1F23] bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>Payload ({fieldCount})</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Collapsible JSONB Payload Row */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 border-t border-b border-slate-200">
                        <td colSpan={5} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span className="font-mono text-[11px]">
                                Record ID :{" "}
                                <strong className="text-slate-800 font-mono">
                                  {log.record_id || "N/A"}
                                </strong>
                              </span>
                              <span className="text-[11px]">
                                Horodatage ISO :{" "}
                                <span className="font-mono text-slate-700">
                                  {log.performed_at}
                                </span>
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {log.old_data && (
                                <div className="space-y-1">
                                  <span className="text-[11px] font-bold text-[#8E2424] uppercase tracking-wider block font-mono">
                                    Données Antérieures (Old Data)
                                  </span>
                                  <pre className="p-3 rounded-xl bg-slate-900 text-[10px] text-slate-200 overflow-x-auto border border-slate-800 max-h-56 leading-tight font-mono">
                                    {JSON.stringify(log.old_data, null, 2)}
                                  </pre>
                                </div>
                              )}

                              <div className="space-y-1 flex-1">
                                <span className="text-[11px] font-bold text-[#5A7C22] uppercase tracking-wider block font-mono">
                                  Données Nouvelles (New Data)
                                </span>
                                <pre className="p-3 rounded-xl bg-slate-900 text-[10px] text-slate-200 overflow-x-auto border border-slate-800 max-h-56 leading-tight font-mono">
                                  {JSON.stringify(log.new_data || {}, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400">
                  <div className="space-y-2">
                    <Filter className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-500">
                      Aucun événement d&apos;audit ne correspond aux filtres sélectionnés.
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleResetFilters}
                        className="text-xs font-bold text-[#8E2424] hover:underline inline-block pt-1"
                      >
                        Réinitialiser tous les filtres
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
