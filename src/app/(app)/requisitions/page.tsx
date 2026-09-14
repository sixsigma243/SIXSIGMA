"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  Clock,
  Trash2,
  X,
  ShoppingCart,
  BadgePercent,
  Edit3,
  ShieldCheck,
  Banknote,
  Send,
  ClipboardCheck,
  TruckIcon,
  ChevronsRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

// ─── Stepper visuel 4 étapes ────────────────────────────────────────────────
const WORKFLOW_STEPS = [
  { key: "terrain",  label: "Demande Terrain",      icon: Send },
  { key: "admin",    label: "Validation Direction",  icon: ShieldCheck },
  { key: "caisse",   label: "Décaissement Caisse",   icon: Banknote },
  { key: "achat",    label: "Achat & Réception",     icon: ClipboardCheck },
];

function getStepIndex(status: string): number {
  if (["draft", "submitted", "pending_admin"].includes(status)) return 0;
  if (["admin_approved"].includes(status)) return 1;
  if (["disbursed"].includes(status)) return 2;
  if (["purchased", "received", "delivered", "fulfilled"].includes(status)) return 3;
  if (["approved", "site_manager_approved"].includes(status)) return 1;
  return 0;
}

function RequisitionStepper({ status }: { status: string }) {
  const activeStep = getStepIndex(status);
  const isRejected = status === "rejected" || status === "cancelled";
  const isCompleted = status === "received" || status === "fulfilled" || status === "delivered";

  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto">
      {WORKFLOW_STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isDone = isCompleted ? true : idx < activeStep;
        const isCurrent = !isCompleted && idx === activeStep;
        const isFuture = !isCompleted && idx > activeStep;

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center min-w-[72px]">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  isRejected && isCurrent
                    ? "bg-rose-50 border-rose-400 text-rose-600"
                    : isDone
                    ? "bg-[#7BA238] border-[#7BA238] text-white"
                    : isCurrent
                    ? "bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-300/50"
                    : "bg-slate-50 border-slate-200 text-slate-300"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>
              <span
                className={`text-[9px] font-semibold mt-1 text-center leading-tight ${
                  isDone ? "text-[#7BA238]" : isCurrent ? "text-amber-700" : "text-slate-300"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < WORKFLOW_STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mb-4 mx-1 rounded ${
                  isDone ? "bg-[#7BA238]" : "bg-slate-100"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Composant principal ────────────────────────────────────────────────────
export default function RequisitionsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [requisitions, setRequisitions] = useState<MaterialRequisition[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filtre par statut
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Modal Nouvelle DRI
  const [showModal, setShowModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [supervisorComment, setSupervisorComment] = useState("");
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [items, setItems] = useState<RequisitionItem[]>([
    { item_name: "", quantity: 1, unit: "sac", justification: "" },
  ]);
  const [saving, setSaving] = useState(false);

  // Modal Arbitrage Admin
  const [adminArbitrateReq, setAdminArbitrateReq] = useState<MaterialRequisition | null>(null);
  const [adminNewStatus, setAdminNewStatus] = useState<string>("admin_approved");
  const [adminComment, setAdminComment] = useState("");
  const [adminSaving, setAdminSaving] = useState(false);

  // Modal Décaissement Caisse (treasury)
  const [disbursementReq, setDisbursementReq] = useState<MaterialRequisition | null>(null);
  const [disbursementAmount, setDisbursementAmount] = useState("");
  const [disbursementRef, setDisbursementRef] = useState("");
  const [disbursementCurrency, setDisbursementCurrency] = useState("USD");
  const [disburseSaving, setDisburseSaving] = useState(false);

  // Modal Achat Fournisseur (buyer)
  const [poModalReq, setPoModalReq] = useState<MaterialRequisition | null>(null);
  const [supplier1Name, setSupplier1Name] = useState("Congo BTP Distribution");
  const [supplier1Amount, setSupplier1Amount] = useState("");
  const [supplier2Name, setSupplier2Name] = useState("Katanga Mining Supplies SARL");
  const [supplier2Amount, setSupplier2Amount] = useState("");
  const [selectedSupplierIndex, setSelectedSupplierIndex] = useState<number>(1);
  const [poSaving, setPoSaving] = useState(false);

  // Modal Réception Terrain
  const [receptionReq, setReceptionReq] = useState<MaterialRequisition | null>(null);
  const [receptionNotes, setReceptionNotes] = useState("");
  const [receptionSaving, setReceptionSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (u?.user) {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.user.id)
        .single();
      if (p) {
        if (p.role === "commercial") {
          router.push("/dashboard");
          return;
        }
        setCurrentUser(p as Profile);
      }
    }

    const [{ data: driData }, { data: prjData }] = await Promise.all([
      supabase
        .from("material_requisitions")
        .select(`
          *,
          project:project_id(*),
          requester:requested_by(*),
          site_manager:site_manager_id(*)
        `)
        .order("created_at", { ascending: false }),
      supabase.from("projects").select("*").eq("status", "in_progress"),
    ]);

    if (driData) setRequisitions(driData as MaterialRequisition[]);
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

  // ─── Rôles & Permissions ───────────────────────────────────────────────────
  const userRole = currentUser?.role || "supervisor";

  /** Peut créer une DRI (Étape 1) */
  const canCreateDRI = ["admin", "company_management", "site_manager", "supervisor", "team_leader", "safety_officer", "mechanic"].includes(userRole);

  /** Peut valider/rejeter (Étape 2 - Direction) */
  const canAdminApprove = ["admin", "company_management"].includes(userRole);

  /** Peut décaisser (Étape 3 - Caisse) */
  const canDisburse = ["treasury_officer", "accountant", "admin", "company_management"].includes(userRole);

  /** Peut saisir les devis & émettre le PO (Étape 4 - Buyer) */
  const canBuy = ["buyer", "admin", "company_management", "accountant", "site_manager"].includes(userRole);

  /** Peut confirmer la réception terrain */
  const canReceive = ["warehouse_keeper", "site_manager", "supervisor", "admin", "company_management"].includes(userRole);

  // ─── Filtres ───────────────────────────────────────────────────────────────
  const filteredRequisitions = useMemo(() => {
    if (filterStatus === "all") return requisitions;
    return requisitions.filter((r) => r.status === filterStatus);
  }, [requisitions, filterStatus]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of requisitions) {
      counts[r.status] = (counts[r.status] || 0) + 1;
    }
    return counts;
  }, [requisitions]);

  // ─── Handlers Items ────────────────────────────────────────────────────────
  const handleAddItemRow = () =>
    setItems([...items, { item_name: "", quantity: 1, unit: "sac", justification: "" }]);

  const handleRemoveItemRow = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof RequisitionItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // ─── Handler Création DRI (Étape 1) ───────────────────────────────────────
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
      estimated_amount: parseFloat(estimatedAmount) || null,
    });

    if (!error) {
      setShowModal(false);
      setSupervisorComment("");
      setIsUrgent(false);
      setEstimatedAmount("");
      setItems([{ item_name: "", quantity: 1, unit: "sac", justification: "" }]);
      fetchData();
    } else {
      alert("Erreur lors de la création de la DRI : " + error.message);
    }
    setSaving(false);
  };

  // ─── Handler Soumettre à la Direction (submitted → pending_admin) ──────────
  const handleSubmitToAdmin = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase
      .from("material_requisitions")
      .update({ status: "pending_admin", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) fetchData();
    else alert("Erreur : " + error.message);
    setActionLoading(null);
  };

  // ─── Handler Validation Admin (Étape 2) ───────────────────────────────────
  const handleAdminArbitrate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminArbitrateReq || !currentUser) return;
    setAdminSaving(true);

    const { error } = await supabase
      .from("material_requisitions")
      .update({
        status: adminNewStatus,
        admin_comment: adminComment || null,
        admin_validated_by: currentUser.id,
        admin_validated_at: new Date().toISOString(),
        validation_comment: adminComment
          ? `[Direction ${new Date().toLocaleDateString("fr-FR")}]: ${adminComment}`
          : adminArbitrateReq.validation_comment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", adminArbitrateReq.id);

    if (!error) {
      setAdminArbitrateReq(null);
      setAdminComment("");
      fetchData();
    } else {
      alert("Erreur lors de la validation Admin : " + error.message);
    }
    setAdminSaving(false);
  };

  // ─── Handler Décaissement Caisse (Étape 3) ────────────────────────────────
  const handleDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disbursementReq || !currentUser) return;
    setDisburseSaving(true);

    const amount = parseFloat(disbursementAmount);
    if (!amount || amount <= 0) {
      alert("Veuillez saisir un montant valide.");
      setDisburseSaving(false);
      return;
    }

    const { error } = await supabase
      .from("material_requisitions")
      .update({
        status: "disbursed",
        disbursed_by: currentUser.id,
        disbursed_at: new Date().toISOString(),
        disbursement_amount: amount,
        disbursement_ref: disbursementRef.trim() || null,
        disbursement_currency: disbursementCurrency,
        updated_at: new Date().toISOString(),
      })
      .eq("id", disbursementReq.id);

    if (!error) {
      setDisbursementReq(null);
      setDisbursementAmount("");
      setDisbursementRef("");
      fetchData();
    } else {
      alert("Erreur lors du décaissement : " + error.message);
    }
    setDisburseSaving(false);
  };

  // ─── Handler Achat Fournisseur / PO (Étape 4a) ────────────────────────────
  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poModalReq || !currentUser) return;
    setPoSaving(true);

    const generatedPoNumber = `PO-2026-${poModalReq.requisition_number.replace("DRI-", "")}`;
    const selectedSupplierName = selectedSupplierIndex === 1 ? supplier1Name : supplier2Name;
    const selectedPoAmount = parseFloat(selectedSupplierIndex === 1 ? supplier1Amount : supplier2Amount) || 0;

    const quotes: SupplierQuote[] = [
      { supplier_name: supplier1Name, amount: parseFloat(supplier1Amount) || 0, currency: "USD", selected: selectedSupplierIndex === 1 },
      { supplier_name: supplier2Name, amount: parseFloat(supplier2Amount) || 0, currency: "USD", selected: selectedSupplierIndex === 2 },
    ];

    const { error } = await supabase
      .from("material_requisitions")
      .update({
        status: "purchased",
        po_number: generatedPoNumber,
        supplier_name: selectedSupplierName,
        po_amount: selectedPoAmount,
        final_amount: selectedPoAmount,
        supplier_quotes: quotes,
        purchased_by: currentUser.id,
        purchased_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", poModalReq.id);

    if (!error) {
      setPoModalReq(null);
      setSupplier1Amount("");
      setSupplier2Amount("");
      fetchData();
    } else {
      alert("Erreur d'enregistrement du Bon de Commande : " + error.message);
    }
    setPoSaving(false);
  };

  // ─── Handler Réception Matériel (Étape 4b) ────────────────────────────────
  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receptionReq || !currentUser) return;
    setReceptionSaving(true);

    const { error } = await supabase
      .from("material_requisitions")
      .update({
        status: "received",
        received_by: currentUser.id,
        received_at: new Date().toISOString(),
        reception_notes: receptionNotes.trim() || null,
        fulfilled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", receptionReq.id);

    // Décrémenter le stock
    if (!error && Array.isArray(receptionReq.items)) {
      for (const item of receptionReq.items) {
        const qty = Number(item.quantity) || 1;
        const { data: invItem } = await supabase
          .from("inventory_items")
          .select("id, current_stock")
          .ilike("name", `%${item.item_name}%`)
          .limit(1)
          .maybeSingle();

        if (invItem) {
          const newStock = Math.max(0, Number(invItem.current_stock) - qty);
          await supabase
            .from("inventory_items")
            .update({ current_stock: newStock, updated_at: new Date().toISOString() })
            .eq("id", invItem.id);
          await supabase.from("stock_movements").insert({
            item_id: invItem.id,
            movement_type: "OUT",
            quantity: qty,
            reference_doc: receptionReq.requisition_number,
            project_id: receptionReq.project_id,
            performed_by: currentUser.id,
            notes: `Réception DRI ${receptionReq.requisition_number} : ${item.item_name} (${qty} ${item.unit || "unités"})`,
          });
        }
      }
    }

    if (!error) {
      setReceptionReq(null);
      setReceptionNotes("");
      fetchData();
    } else {
      alert("Erreur lors de la réception : " + error.message);
    }
    setReceptionSaving(false);
  };

  // ─── Handler Suppression ───────────────────────────────────────────────────
  const handleDeleteRequisition = async (id: string, reqNumber: string) => {
    if (!window.confirm(`Confirmez-vous la suppression de ${reqNumber} ?`)) return;
    setActionLoading(id);
    const { error } = await supabase.from("material_requisitions").delete().eq("id", id);
    if (!error) fetchData();
    else alert("Erreur : " + error.message);
    setActionLoading(null);
  };

  // ─── Badge statut lisible ─────────────────────────────────────────────────
  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: "Brouillon", color: "bg-slate-100 text-slate-500 border-slate-200" },
    submitted: { label: "Soumis — Terrain", color: "bg-sky-50 text-sky-700 border-sky-200" },
    pending_admin: { label: "En attente Direction", color: "bg-amber-50 text-amber-700 border-amber-200" },
    admin_approved: { label: "Approuvé — Direction", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    approved: { label: "Approuvé", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    site_manager_approved: { label: "Approuvé — CM", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    disbursed: { label: "Décaissé — Caisse", color: "bg-purple-50 text-purple-700 border-purple-200" },
    purchased: { label: "Acheté — PO émis", color: "bg-blue-50 text-blue-700 border-blue-200" },
    received: { label: "Réceptionné ✓", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    delivered: { label: "Livré ✓", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    fulfilled: { label: "Clôturé ✓", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected: { label: "Rejeté", color: "bg-rose-50 text-rose-700 border-rose-200" },
    cancelled: { label: "Annulé", color: "bg-slate-100 text-slate-400 border-slate-200" },
  };

  function StatusPill({ status }: { status: string }) {
    const s = statusLabels[status] || { label: status, color: "bg-slate-100 text-slate-500" };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.color}`}>
        {s.label}
      </span>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1C1F23] tracking-tight flex items-center gap-2.5">
            <FileCheck2 className="w-7 h-7 text-amber-500" />
            <span>Demandes de Réquisition (DRI)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Circuit étanche 4 étapes : <strong className="text-slate-700">Terrain</strong> →{" "}
            <strong className="text-slate-700">Direction</strong> →{" "}
            <strong className="text-slate-700">Caisse</strong> →{" "}
            <strong className="text-slate-700">Achat & Réception</strong>
          </p>
        </div>

        {canCreateDRI && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#8E2424] hover:bg-[#751D1D] text-white text-xs font-bold shadow-lg shadow-[#8E2424]/20 border border-[#8E2424] transition flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle DRI</span>
          </button>
        )}
      </div>

      {/* ── KPI Bar ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { key: "all", label: "Toutes", count: requisitions.length, color: "bg-slate-50 border-slate-200 text-slate-700" },
          { key: "submitted", label: "Soumises", count: (statusCounts["submitted"] || 0), color: "bg-sky-50 border-sky-200 text-sky-700" },
          { key: "pending_admin", label: "Attente Dir.", count: (statusCounts["pending_admin"] || 0), color: "bg-amber-50 border-amber-300 text-amber-800" },
          { key: "admin_approved", label: "Approuvées", count: (statusCounts["admin_approved"] || 0) + (statusCounts["approved"] || 0), color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
          { key: "disbursed", label: "Décaissées", count: (statusCounts["disbursed"] || 0), color: "bg-purple-50 border-purple-200 text-purple-700" },
          { key: "purchased", label: "PO émis", count: (statusCounts["purchased"] || 0), color: "bg-blue-50 border-blue-200 text-blue-700" },
          { key: "received", label: "Réceptionnées", count: (statusCounts["received"] || 0) + (statusCounts["fulfilled"] || 0) + (statusCounts["delivered"] || 0), color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
        ].map((kpi) => (
          <button
            key={kpi.key}
            onClick={() => setFilterStatus(kpi.key)}
            className={`p-3 rounded-xl border text-center transition hover:shadow-sm ${kpi.color} ${filterStatus === kpi.key ? "ring-2 ring-offset-1 ring-current" : ""}`}
          >
            <div className="text-xl font-black">{kpi.count}</div>
            <div className="text-[10px] font-semibold">{kpi.label}</div>
          </button>
        ))}
      </div>

      {/* ── Liste DRI ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Chargement…</div>
      ) : filteredRequisitions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-100 shadow-sm text-xs">
          Aucune demande pour ce filtre.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequisitions.map((req) => {
            const isTerminated = ["received", "fulfilled", "delivered", "rejected", "cancelled"].includes(req.status);

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-slate-200 transition space-y-4 overflow-hidden"
              >
                {/* ── Header de la carte ─────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-900">{req.requisition_number}</span>
                        {req.urgent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-[#8E2424] border border-rose-200 animate-pulse">
                            URGENT
                          </span>
                        )}
                        <StatusPill status={req.status} />
                        {req.po_number && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {req.po_number}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Chantier : <strong className="text-slate-800">{req.project?.title}</strong> ({req.project?.code}) •{" "}
                        <span>Par {req.requester?.full_name || "—"}</span> •{" "}
                        <span>{formatDate(req.created_at)}</span>
                      </p>
                    </div>
                  </div>

                  {/* ── Boutons d'action ────────────────────────────────── */}
                  <div className="flex items-center gap-2 flex-wrap">

                    {/* Étape 1 → Soumettre à la Direction */}
                    {canCreateDRI && req.status === "submitted" && req.requested_by === currentUser?.id && (
                      <button
                        onClick={() => handleSubmitToAdmin(req.id)}
                        disabled={actionLoading === req.id}
                        className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Soumettre à la Direction</span>
                      </button>
                    )}

                    {/* Étape 2 → Validation Direction */}
                    {canAdminApprove && req.status === "pending_admin" && (
                      <button
                        onClick={() => {
                          setAdminArbitrateReq(req);
                          setAdminNewStatus("admin_approved");
                          setAdminComment(req.admin_comment || "");
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Valider / Rejeter</span>
                      </button>
                    )}

                    {/* Admin peut toujours arbitrer */}
                    {currentUser?.role === "admin" && !["received", "fulfilled", "rejected", "cancelled"].includes(req.status) && (
                      <button
                        onClick={() => {
                          setAdminArbitrateReq(req);
                          setAdminNewStatus(req.status);
                          setAdminComment(req.admin_comment || "");
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold flex items-center gap-1.5 transition"
                        title="Arbitrage Super-Admin"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Arbitrer</span>
                      </button>
                    )}

                    {/* Étape 3 → Décaissement Caisse */}
                    {canDisburse && (req.status === "admin_approved" || req.status === "approved") && (
                      <button
                        onClick={() => {
                          setDisbursementReq(req);
                          setDisbursementAmount(req.estimated_amount?.toString() || req.disbursement_amount?.toString() || "");
                        }}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>Décaisser</span>
                      </button>
                    )}

                    {/* Étape 4a → Achat Fournisseur */}
                    {canBuy && req.status === "disbursed" && !req.po_number && (
                      <button
                        onClick={() => setPoModalReq(req)}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Saisir Devis & PO</span>
                      </button>
                    )}

                    {/* Étape 4b → Réception Matériel */}
                    {canReceive && req.status === "purchased" && (
                      <button
                        onClick={() => setReceptionReq(req)}
                        className="px-3 py-1.5 rounded-lg bg-[#7BA238] hover:bg-[#6A8D2F] text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>Confirmer Réception</span>
                      </button>
                    )}

                    {/* Suppression Admin */}
                    {currentUser?.role === "admin" && (
                      <button
                        onClick={() => handleDeleteRequisition(req.id, req.requisition_number)}
                        disabled={actionLoading === req.id}
                        title="Supprimer (Admin)"
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-[#8E2424] border border-rose-200 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Stepper visuel ────────────────────────────────────── */}
                <div className="px-5 pb-3">
                  <RequisitionStepper status={req.status} />
                </div>

                {/* ── Tableau des articles ──────────────────────────────── */}
                <div className="px-5 pb-4 space-y-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Matériaux Réquisitionnés :
                  </span>
                  <div className="overflow-x-auto rounded-xl border border-slate-100 bg-slate-50/50">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-100">
                        <tr>
                          <th className="py-2.5 px-4">Désignation</th>
                          <th className="py-2.5 px-4">Quantité</th>
                          <th className="py-2.5 px-4">Unité</th>
                          <th className="py-2.5 px-4">Justification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {req.items?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-4 font-semibold text-slate-800">{item.item_name}</td>
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{item.quantity}</td>
                            <td className="py-2.5 px-4 text-slate-500">{item.unit}</td>
                            <td className="py-2.5 px-4 text-slate-600">{item.justification || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* ── Informations de traçabilité ───────────────────── */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    {req.estimated_amount && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                        <span className="text-amber-700 font-semibold">Montant estimé :</span>
                        <span className="ml-1 font-black text-amber-900">{formatUSD(req.estimated_amount)}</span>
                      </div>
                    )}
                    {req.disbursement_amount && (
                      <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-100">
                        <span className="text-purple-700 font-semibold">Décaissé :</span>
                        <span className="ml-1 font-black text-purple-900">{formatUSD(req.disbursement_amount)}</span>
                        {req.disbursement_ref && <span className="ml-1 text-purple-600">({req.disbursement_ref})</span>}
                        {req.disbursed_at && <span className="ml-1 text-purple-500">• {formatDate(req.disbursed_at)}</span>}
                      </div>
                    )}
                    {req.po_number && req.supplier_quotes && (
                      <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                        <span className="text-blue-700 font-semibold">{req.po_number} :</span>
                        <span className="ml-1 font-black text-blue-900">{req.supplier_name}</span>
                        {req.final_amount && <span className="ml-1 font-bold text-blue-800">— {formatUSD(req.final_amount)}</span>}
                      </div>
                    )}
                  </div>

                  {/* Devis comparatifs */}
                  {req.po_number && req.supplier_quotes && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 text-amber-700 font-bold">
                        <BadgePercent className="w-4 h-4" />
                        <span>Comparatif Fournisseurs — {req.po_number}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {req.supplier_quotes.map((q, idx) => (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-xl border ${
                              q.selected ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"
                            }`}
                          >
                            <div className="flex items-center justify-between font-semibold">
                              <span>{q.supplier_name}</span>
                              {q.selected && <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">RETENU</span>}
                            </div>
                            <div className="mt-1 font-mono font-bold text-slate-900">{formatUSD(q.amount)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Commentaires */}
                  {(req.supervisor_comment || req.admin_comment || req.validation_comment || req.reception_notes) && (
                    <div className="space-y-1.5">
                      {req.supervisor_comment && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="font-semibold text-slate-800">Commentaire terrain : </span>
                          {req.supervisor_comment}
                        </div>
                      )}
                      {req.admin_comment && (
                        <div className="text-xs text-indigo-800 bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
                          <span className="font-semibold">Décision Direction : </span>
                          {req.admin_comment}
                        </div>
                      )}
                      {req.reception_notes && (
                        <div className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                          <span className="font-semibold">Notes de réception : </span>
                          {req.reception_notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALES
          ═══════════════════════════════════════════════════════════════════ */}

      {/* ── Modale Nouvelle DRI ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-600" />
                <span>Nouvelle Demande de Réquisition (DRI)</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRequisition} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Chantier *</label>
                  <select
                    required
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Montant estimé (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 500.00"
                    value={estimatedAmount}
                    onChange={(e) => setEstimatedAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-rose-50 border border-rose-200 rounded-xl w-full">
                    <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} className="rounded" />
                    <span className="font-bold text-[#8E2424]">Demande URGENTE</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Commentaire / Justification générale</label>
                <textarea
                  rows={2}
                  value={supervisorComment}
                  onChange={(e) => setSupervisorComment(e.target.value)}
                  placeholder="Contexte de la demande (chantier, travaux, urgence)..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300 resize-none"
                />
              </div>

              {/* Articles */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Articles Requis *</span>
                  <button type="button" onClick={handleAddItemRow} className="text-[11px] text-[#8E2424] font-semibold hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Ajouter une ligne
                  </button>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        required
                        type="text"
                        placeholder="Désignation"
                        value={item.item_name}
                        onChange={(e) => handleItemChange(idx, "item_name", e.target.value)}
                        className="col-span-4 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
                      />
                      <input
                        required
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                        className="col-span-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-300"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                        className="col-span-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
                      >
                        {["sac", "kg", "litre", "m²", "m³", "ml", "pc", "boite", "rouleau", "palette", "lot"].map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Justification"
                        value={item.justification || ""}
                        onChange={(e) => handleItemChange(idx, "justification", e.target.value)}
                        className="col-span-3 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
                      />
                      <button type="button" onClick={() => handleRemoveItemRow(idx)} className="col-span-1 p-2 text-slate-400 hover:text-rose-500 transition">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#8E2424] text-white text-xs font-black hover:bg-[#751D1D] transition disabled:opacity-60">
                  {saving ? "Création…" : "Créer la DRI"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modale Validation Direction (Étape 2) ───────────────────────────── */}
      {adminArbitrateReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Décision Direction — {adminArbitrateReq.requisition_number}</span>
              </h3>
              <button onClick={() => setAdminArbitrateReq(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminArbitrate} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-[11px]">
                <strong>Chantier :</strong> {adminArbitrateReq.project?.title} ({adminArbitrateReq.project?.code})<br />
                {adminArbitrateReq.estimated_amount && (
                  <><strong>Montant estimé :</strong> {formatUSD(adminArbitrateReq.estimated_amount)}<br /></>
                )}
                <strong>Articles :</strong> {adminArbitrateReq.items?.length || 0} ligne(s)
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Décision *</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${adminNewStatus === "admin_approved" ? "bg-indigo-50 border-indigo-400 text-indigo-800" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                    <input type="radio" name="decision" value="admin_approved" checked={adminNewStatus === "admin_approved"} onChange={() => setAdminNewStatus("admin_approved")} />
                    <span className="font-bold"><CheckCircle className="w-3.5 h-3.5 inline mr-1 text-[#7BA238]" />Approuver</span>
                  </label>
                  <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${adminNewStatus === "rejected" ? "bg-rose-50 border-rose-400 text-rose-800" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                    <input type="radio" name="decision" value="rejected" checked={adminNewStatus === "rejected"} onChange={() => setAdminNewStatus("rejected")} />
                    <span className="font-bold"><XCircle className="w-3.5 h-3.5 inline mr-1 text-rose-500" />Rejeter</span>
                  </label>
                </div>
              </div>

              {/* Admin peut aussi choisir n'importe quel statut */}
              {currentUser?.role === "admin" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Forcer un statut (Super-Admin)</label>
                  <select
                    value={adminNewStatus}
                    onChange={(e) => setAdminNewStatus(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                  >
                    {["submitted", "pending_admin", "admin_approved", "disbursed", "purchased", "received", "rejected", "cancelled"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Commentaire de décision</label>
                <textarea
                  rows={3}
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  placeholder="Motif d'approbation ou de rejet…"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setAdminArbitrateReq(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition">
                  Annuler
                </button>
                <button type="submit" disabled={adminSaving} className={`flex-1 py-2.5 rounded-xl text-white text-xs font-black transition disabled:opacity-60 ${adminNewStatus === "rejected" ? "bg-[#8E2424] hover:bg-[#751D1D]" : "bg-indigo-600 hover:bg-indigo-700"}`}>
                  {adminSaving ? "Enregistrement…" : adminNewStatus === "rejected" ? "Confirmer le Rejet" : "Confirmer l'Approbation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modale Décaissement Caisse (Étape 3) ────────────────────────────── */}
      {disbursementReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-purple-600" />
                <span>Décaissement Caisse — {disbursementReq.requisition_number}</span>
              </h3>
              <button onClick={() => setDisbursementReq(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-purple-900 text-[11px]">
              ⚠️ Cette action est <strong>irréversible</strong>. Le décaissement sera tracé avec votre identité et horodaté.
            </div>

            <form onSubmit={handleDisburse} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Montant décaissé *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="1"
                    value={disbursementAmount}
                    onChange={(e) => setDisbursementAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-purple-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Devise *</label>
                  <select
                    value={disbursementCurrency}
                    onChange={(e) => setDisbursementCurrency(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="CDF">CDF</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Référence caisse / N° bon de sortie</label>
                <input
                  type="text"
                  value={disbursementRef}
                  onChange={(e) => setDisbursementRef(e.target.value)}
                  placeholder="Ex: BS-2026-0142"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-300"
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setDisbursementReq(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition">
                  Annuler
                </button>
                <button type="submit" disabled={disburseSaving} className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black transition disabled:opacity-60">
                  {disburseSaving ? "Décaissement…" : "Confirmer le Décaissement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modale Achat Fournisseur / PO (Étape 4a) ────────────────────────── */}
      {poModalReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-amber-600" />
                <span>Bon de Commande & Devis — {poModalReq.requisition_number}</span>
              </h3>
              <button onClick={() => setPoModalReq(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
              <strong>Règle SIX SIGMA :</strong> Minimum 2 devis comparatifs obligatoires avant tout engagement fournisseur.
              {poModalReq.disbursement_amount && (
                <> Budget décaissé : <strong>{formatUSD(poModalReq.disbursement_amount)}</strong>.</>
              )}
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4 text-xs">
              {[
                { idx: 1, name: supplier1Name, setName: setSupplier1Name, amount: supplier1Amount, setAmount: setSupplier1Amount },
                { idx: 2, name: supplier2Name, setName: setSupplier2Name, amount: supplier2Amount, setAmount: setSupplier2Amount },
              ].map(({ idx, name, setName, amount, setAmount }) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Devis Fournisseur {idx}</span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-emerald-700 font-semibold text-[11px]">
                      <input type="radio" name="selectedSupplier" checked={selectedSupplierIndex === idx} onChange={() => setSelectedSupplierIndex(idx)} />
                      Offre retenue
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input required type="text" placeholder="Nom fournisseur" value={name} onChange={(e) => setName(e.target.value)}
                      className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-300" />
                    <input required type="number" step="0.01" placeholder="Montant USD" value={amount} onChange={(e) => setAmount(e.target.value)}
                      className="p-2.5 bg-white border border-slate-200 rounded-xl font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-slate-300" />
                  </div>
                </div>
              ))}

              <div className="flex gap-3">
                <button type="button" onClick={() => setPoModalReq(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition">
                  Annuler
                </button>
                <button type="submit" disabled={poSaving} className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition disabled:opacity-60">
                  {poSaving ? "Émission PO…" : "Émettre le Bon de Commande"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modale Réception Terrain (Étape 4b) ─────────────────────────────── */}
      {receptionReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-[#7BA238]" />
                <span>Réception Matériel — {receptionReq.requisition_number}</span>
              </h3>
              <button onClick={() => setReceptionReq(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-900 text-[11px]">
              Confirmez la réception physique du matériel sur chantier. Cette action clôture la DRI et met à jour le stock.
            </div>

            <form onSubmit={handleReceive} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Notes de réception (optionnel)</label>
                <textarea
                  rows={3}
                  value={receptionNotes}
                  onChange={(e) => setReceptionNotes(e.target.value)}
                  placeholder="État du matériel reçu, réserves, manquants éventuels…"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setReceptionReq(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition">
                  Annuler
                </button>
                <button type="submit" disabled={receptionSaving} className="flex-1 py-2.5 rounded-xl bg-[#7BA238] hover:bg-[#6A8D2F] text-white text-xs font-black transition disabled:opacity-60">
                  {receptionSaving ? "Confirmation…" : "Confirmer la Réception"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
