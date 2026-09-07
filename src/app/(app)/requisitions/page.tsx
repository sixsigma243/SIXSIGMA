"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MaterialRequisition,
  Project,
  Profile,
  RequisitionItem,
  SupplierQuote,
} from "@/types/database";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatUSD } from "@/lib/utils";
import {
  FileCheck2,
  Plus,
  CheckCircle,
  XCircle,
  PackageCheck,
  AlertCircle,
  Clock,
  Trash2,
  X,
  HardHat,
  ShoppingCart,
  BadgePercent,
  FileSpreadsheet,
} from "lucide-react";

export default function RequisitionsPage() {
  const supabase = createClient();

  const [requisitions, setRequisitions] = useState<MaterialRequisition[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // New DRI Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [supervisorComment, setSupervisorComment] = useState("");
  const [items, setItems] = useState<RequisitionItem[]>([
    { item_name: "", quantity: 1, unit: "sac", justification: "" },
  ]);
  const [saving, setSaving] = useState(false);

  // Buyer PO & Comparison Modal State
  const [poModalReq, setPoModalReq] = useState<MaterialRequisition | null>(null);
  const [supplier1Name, setSupplier1Name] = useState("Congo BTP Distribution");
  const [supplier1Amount, setSupplier1Amount] = useState("");
  const [supplier2Name, setSupplier2Name] = useState("Katanga Mining Supplies SARL");
  const [supplier2Amount, setSupplier2Amount] = useState("");
  const [selectedSupplierIndex, setSelectedSupplierIndex] = useState<number>(1);
  const [poSaving, setPoSaving] = useState(false);

  const fetchData = async () => {
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

    const { data: driData } = await supabase
      .from("material_requisitions")
      .select("*, project:project_id(*), requester:requested_by(*), site_manager:site_manager_id(*)")
      .order("created_at", { ascending: false });

    if (driData) setRequisitions(driData as MaterialRequisition[]);

    const { data: prjData } = await supabase
      .from("projects")
      .select("*")
      .eq("status", "in_progress");

    if (prjData) {
      setProjects(prjData as Project[]);
      if (prjData.length > 0 && !selectedProjectId) {
        setSelectedProjectId(prjData[0].id);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItemRow = () => {
    setItems([...items, { item_name: "", quantity: 1, unit: "sac", justification: "" }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof RequisitionItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);

    const reqNumber = `DRI-2026-${String(requisitions.length + 1).padStart(3, "0")}`;

    const { error } = await supabase.from("material_requisitions").insert({
      requisition_number: reqNumber,
      project_id: selectedProjectId,
      requested_by: currentUser.id,
      status: "submitted",
      items,
      urgent: isUrgent,
      supervisor_comment: supervisorComment || null,
    });

    if (!error) {
      setShowModal(false);
      setSupervisorComment("");
      setIsUrgent(false);
      setItems([{ item_name: "", quantity: 1, unit: "sac", justification: "" }]);
      fetchData();
    } else {
      alert("Erreur lors de la création de la DRI : " + error.message);
    }
    setSaving(false);
  };

  const handleApprove = async (id: string) => {
    if (!currentUser) return;
    setActionLoading(id);
    const { error } = await supabase
      .from("material_requisitions")
      .update({
        status: "site_manager_approved",
        site_manager_id: currentUser.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (!error) fetchData();
    setActionLoading(null);
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase
      .from("material_requisitions")
      .update({
        status: "rejected",
      })
      .eq("id", id);

    if (!error) fetchData();
    setActionLoading(null);
  };

  const handleFulfill = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase
      .from("material_requisitions")
      .update({
        status: "fulfilled",
        fulfilled_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (!error) fetchData();
    setActionLoading(null);
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poModalReq) return;
    setPoSaving(true);

    const generatedPoNumber = `PO-2026-${poModalReq.requisition_number.replace("DRI-", "")}`;
    const quotes: SupplierQuote[] = [
      {
        supplier_name: supplier1Name,
        amount: parseFloat(supplier1Amount) || 0,
        currency: "USD",
        selected: selectedSupplierIndex === 1,
      },
      {
        supplier_name: supplier2Name,
        amount: parseFloat(supplier2Amount) || 0,
        currency: "USD",
        selected: selectedSupplierIndex === 2,
      },
    ];

    const { error } = await supabase
      .from("material_requisitions")
      .update({
        po_number: generatedPoNumber,
        supplier_quotes: quotes,
      })
      .eq("id", poModalReq.id);

    if (!error) {
      setPoModalReq(null);
      setSupplier1Amount("");
      setSupplier2Amount("");
      fetchData();
    } else {
      alert("Erreur d'émission du Bon de Commande (PO) : " + error.message);
    }
    setPoSaving(false);
  };

  const userRole = currentUser?.role || "supervisor";
  const canApprove = ["admin", "company_management", "site_manager"].includes(userRole);
  const canFulfill = ["admin", "company_management", "warehouse_keeper"].includes(userRole);
  const canBuy = ["admin", "company_management", "buyer"].includes(userRole);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <FileCheck2 className="w-7 h-7 text-amber-500" />
            <span>Demandes de Réquisition (DRI) & Achats Fournisseurs</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Circuit d&apos;approvisionnement : Émission Superviseur &rarr; Visa Conducteur de travaux &rarr; Bons de Commande (Buyer - Min. 2 devis) &rarr; Délivrance Magasinier.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-rose-800 hover:from-red-600 hover:to-rose-700 text-white text-xs font-bold shadow-lg shadow-red-950/50 border border-red-600/30 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Réquisition (DRI)</span>
        </button>
      </div>

      {/* DRI List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs">
          Chargement des réquisitions de matériel...
        </div>
      ) : requisitions.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-slate-400 text-xs">
          Aucune demande de réquisition enregistrée.
        </div>
      ) : (
        <div className="space-y-4">
          {requisitions.map((req) => (
            <div
              key={req.id}
              className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-amber-900/50 transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-900 text-amber-400 border border-slate-800">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white">
                        {req.requisition_number}
                      </span>
                      {req.urgent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
                          URGENT
                        </span>
                      )}
                      <StatusBadge status={req.status} type="requisition" />
                      {req.po_number && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {req.po_number}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Chantier : <strong className="text-slate-200">{req.project?.title}</strong> ({req.project?.code}) • Émis le {formatDate(req.created_at)}
                    </p>
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="flex items-center gap-2">
                  {/* Site Manager Validation */}
                  {canApprove && req.status === "submitted" && (
                    <>
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={actionLoading === req.id}
                        className="px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Rejeter</span>
                      </button>
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={actionLoading === req.id}
                        className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950 transition"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approuver (Site Mgr)</span>
                      </button>
                    </>
                  )}

                  {/* Buyer Action : Attach PO & 2 Supplier Quotes */}
                  {canBuy && req.status === "site_manager_approved" && !req.po_number && (
                    <button
                      onClick={() => setPoModalReq(req)}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-950 transition"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Émettre Bon de Commande (PO)</span>
                    </button>
                  )}

                  {/* Warehouse Fulfillment */}
                  {canFulfill && req.status === "site_manager_approved" && (
                    <button
                      onClick={() => handleFulfill(req.id)}
                      disabled={actionLoading === req.id}
                      className="px-4 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-950 transition"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>Délivrer Matériel (Magasinier)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Matériaux Réquisitionnés :
                </span>
                <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/50">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-4">Désignation</th>
                        <th className="py-2.5 px-4">Quantité</th>
                        <th className="py-2.5 px-4">Unité</th>
                        <th className="py-2.5 px-4">Justification Travaux</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {req.items?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-4 font-semibold text-slate-200">
                            {item.item_name}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold text-amber-300">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-4 text-slate-400">
                            {item.unit}
                          </td>
                          <td className="py-2.5 px-4 text-slate-300">
                            {item.justification || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Attached Supplier Quotes & PO if available */}
              {req.po_number && req.supplier_quotes && (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-200 font-bold">
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <BadgePercent className="w-4 h-4" />
                      <span>Comparatif Fournisseurs & Bon de Commande Associé ({req.po_number})</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">
                      Règle des 2 devis respectée
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {req.supplier_quotes.map((q, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg border ${
                          q.selected
                            ? "bg-emerald-950/40 border-emerald-700/80 text-emerald-200"
                            : "bg-slate-950 border-slate-800 text-slate-400"
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span>{q.supplier_name}</span>
                          {q.selected && (
                            <span className="text-[10px] bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                              RETENU
                            </span>
                          )}
                        </div>
                        <div className="mt-1 font-mono font-bold">
                          {formatUSD(q.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments & Approvals */}
              {req.supervisor_comment && (
                <div className="text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="font-semibold text-slate-300">Commentaire superviseur : </span>
                  {req.supervisor_comment}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Buyer Modal : PO Creation & Quote Comparison */}
      {poModalReq && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] rounded-2xl border border-slate-700 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-amber-400" />
                <span>Émission Bon de Commande (PO) & Comparatif Devis</span>
              </h3>
              <button
                onClick={() => setPoModalReq(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/40 text-amber-200">
                <strong className="block mb-1 font-bold">Règle d&apos;Achat SIX SIGMA :</strong>
                <span>Tout bon de commande (PO) adossé à une DRI approuvée requiert au minimum deux (2) devis comparatifs enregistrés.</span>
              </div>

              {/* Devis 1 */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Devis Fournisseur 1</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="selectedSupplier"
                      checked={selectedSupplierIndex === 1}
                      onChange={() => setSelectedSupplierIndex(1)}
                    />
                    <span className="text-[11px] font-semibold text-emerald-400">Sélectionner comme offre retenue</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nom fournisseur"
                    value={supplier1Name}
                    onChange={(e) => setSupplier1Name(e.target.value)}
                    className="p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Montant total USD"
                    value={supplier1Amount}
                    onChange={(e) => setSupplier1Amount(e.target.value)}
                    className="p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Devis 2 */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Devis Fournisseur 2 (Comparatif)</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="selectedSupplier"
                      checked={selectedSupplierIndex === 2}
                      onChange={() => setSelectedSupplierIndex(2)}
                    />
                    <span className="text-[11px] font-semibold text-emerald-400">Sélectionner comme offre retenue</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nom fournisseur"
                    value={supplier2Name}
                    onChange={(e) => setSupplier2Name(e.target.value)}
                    className="p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Montant total USD"
                    value={supplier2Amount}
                    onChange={(e) => setSupplier2Amount(e.target.value)}
                    className="p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPoModalReq(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={poSaving}
                  className="px-5 py-2 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-bold transition disabled:opacity-50"
                >
                  {poSaving ? "Émission..." : "Émettre le Bon de Commande (PO)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New DRI Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] rounded-2xl border border-slate-700 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-amber-400" />
                <span>Nouvelle Demande de Réquisition Interne (DRI)</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRequisition} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Chantier Demandeur *</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 text-slate-300 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isUrgent}
                      onChange={(e) => setIsUrgent(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 bg-slate-900 border-slate-700"
                    />
                    <span className="text-rose-400 font-bold">Marquer comme URGENT (Priorité Chantier)</span>
                  </label>
                </div>
              </div>

              {/* Dynamic Items Rows */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    Articles & Matériaux Réquisitionnés
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter un article</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 p-3 bg-slate-900/80 rounded-xl border border-slate-800 items-center"
                    >
                      <div className="col-span-12 sm:col-span-4">
                        <input
                          type="text"
                          required
                          placeholder="Désignation (ex: Ciment 42.5)"
                          value={it.item_name}
                          onChange={(e) => handleItemChange(idx, "item_name", e.target.value)}
                          className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-2">
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="Qté"
                          value={it.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", parseFloat(e.target.value) || 1)}
                          className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-2">
                        <input
                          type="text"
                          required
                          placeholder="Unité (sac, t, m3)"
                          value={it.unit}
                          onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                          className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                        />
                      </div>
                      <div className="col-span-10 sm:col-span-3">
                        <input
                          type="text"
                          placeholder="Justification travaux"
                          value={it.justification || ""}
                          onChange={(e) => handleItemChange(idx, "justification", e.target.value)}
                          className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Commentaire ou Note Spécifique</label>
                <textarea
                  rows={2}
                  placeholder="Date de livraison souhaitée, contraintes d'accès chantier..."
                  value={supervisorComment}
                  onChange={(e) => setSupervisorComment(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                />
              </div>

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
                  {saving ? "Transmission..." : "Soumettre la DRI"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
