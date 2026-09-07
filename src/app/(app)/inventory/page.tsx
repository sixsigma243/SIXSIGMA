"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { InventoryItem, StockMovement, Project, Profile } from "@/types/database";
import { formatUSD, formatDate } from "@/lib/utils";
import {
  Boxes,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Package,
  Layers,
  Search,
  X,
  RefreshCw,
} from "lucide-react";

export default function InventoryPage() {
  const supabase = createClient();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Stock Movement Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [movementType, setMovementType] = useState<"IN" | "OUT" | "ADJUSTMENT">("OUT");
  const [quantity, setQuantity] = useState("10");
  const [referenceDoc, setReferenceDoc] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchInventory = async () => {
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

    const { data: itData } = await supabase
      .from("inventory_items")
      .select("*")
      .order("category");

    if (itData) {
      setItems(itData as InventoryItem[]);
      if (itData.length > 0 && !selectedItemId) setSelectedItemId(itData[0].id);
    }

    const { data: movData } = await supabase
      .from("stock_movements")
      .select("*, item:item_id(*), project:project_id(*), performer:performed_by(*)")
      .order("created_at", { ascending: false })
      .limit(10);

    if (movData) setMovements(movData as StockMovement[]);

    const { data: prjData } = await supabase.from("projects").select("*");
    if (prjData) setProjects(prjData as Project[]);

    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);

    const { error } = await supabase.from("stock_movements").insert({
      item_id: selectedItemId,
      movement_type: movementType,
      quantity: parseFloat(quantity) || 0,
      reference_doc: referenceDoc.trim() || null,
      project_id: selectedProjectId || null,
      performed_by: currentUser.id,
      notes: notes.trim() || null,
    });

    if (!error) {
      setShowModal(false);
      setReferenceDoc("");
      setNotes("");
      fetchInventory();
    } else {
      alert("Erreur lors de l'enregistrement du mouvement : " + error.message);
    }
    setSaving(false);
  };

  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = items.filter((i) => Number(i.current_stock) <= Number(i.min_threshold)).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-teal-500" />
            <span>Gestion des Stocks & Matériaux (Dépôt Central & Chantiers)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Suivi en temps réel des liants, armatures, hydrocarbures, outillage et seuils d&apos;alerte de réapprovisionnement.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-rose-800 hover:from-red-600 hover:to-rose-700 text-white text-xs font-bold shadow-lg shadow-red-950/50 border border-red-600/30 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Mouvement de Stock</span>
        </button>
      </div>

      {/* Critical Stock Alert */}
      {lowStockCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex items-center gap-3 text-xs text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <strong className="font-bold">Alerte Réapprovisionnement BTP : </strong>
            <span>{lowStockCount} article(s) ont atteint ou dépassé leur seuil critique minimal. Veuillez initier une commande d&apos;achat fournisseur.</span>
          </div>
        </div>
      )}

      {/* Inventory Grid / Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrer par désignation, SKU, catégorie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500"
            />
          </div>

          <span className="text-xs text-slate-400">
            {filteredItems.length} référence(s) en catalogue
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Chargement de l&apos;inventaire...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">SKU / Code</th>
                  <th className="py-3 px-4">Désignation Matériau</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Stock Disponible</th>
                  <th className="py-3 px-4">Seuil Critique</th>
                  <th className="py-3 px-4">Coût Unitaire Ref</th>
                  <th className="py-3 px-4 text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredItems.map((it) => {
                  const isLow = Number(it.current_stock) <= Number(it.min_threshold);
                  return (
                    <tr key={it.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-red-400">
                        {it.sku}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {it.name}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {it.category}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-bold text-white">
                          {it.current_stock}
                        </span>{" "}
                        <span className="text-slate-400">{it.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono">
                        {it.min_threshold} {it.unit}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {formatUSD(Number(it.unit_cost))}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isLow ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                            Stock Bas
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            Optimal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Movements Section */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <span>Derniers Mouvements de Stock (Entrées / Sorties / Ajustements)</span>
        </h3>

        {movements.length === 0 ? (
          <p className="text-xs text-slate-500">Aucun mouvement récent.</p>
        ) : (
          <div className="divide-y divide-slate-800 text-xs">
            {movements.map((m) => (
              <div key={m.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`p-1.5 rounded-lg ${
                      m.movement_type === "IN"
                        ? "bg-emerald-950 text-emerald-400"
                        : m.movement_type === "OUT"
                        ? "bg-rose-950 text-rose-400"
                        : "bg-blue-950 text-blue-400"
                    }`}
                  >
                    {m.movement_type === "IN" ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </span>
                  <div>
                    <span className="font-semibold text-white">
                      {m.item?.name}
                    </span>
                    <span className="text-slate-400 ml-2">
                      ({m.movement_type === "IN" ? "Entrée" : m.movement_type === "OUT" ? "Sortie" : "Ajustement"} : {m.quantity} {m.item?.unit})
                    </span>
                    {m.project && (
                      <span className="text-[11px] text-slate-500 block">
                        Affectation : {m.project.code} - {m.project.title}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right text-slate-400">
                  <span>{formatDate(m.created_at)}</span>
                  <span className="text-[10px] text-slate-500 block">
                    Par {m.performer?.full_name || "Magasinier"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Movement Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] rounded-2xl border border-slate-700 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-teal-400" />
                <span>Enregistrer un Mouvement de Stock</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Article / Matériau *</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  required
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.sku} - {it.name} (Dispo : {it.current_stock} {it.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Type de Mouvement</label>
                  <select
                    value={movementType}
                    onChange={(e) => setMovementType(e.target.value as any)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="OUT">Sortie Chantier (OUT)</option>
                    <option value="IN">Entrée Fournisseur (IN)</option>
                    <option value="ADJUSTMENT">Ajustement Inventaire</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Quantité</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Chantier de Destination</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">Dépôt Central / Stock Général</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">N° Bon de Livraison / Réquisition</label>
                <input
                  type="text"
                  placeholder="ex: BL-2026-441 ou DRI-2026-001"
                  value={referenceDoc}
                  onChange={(e) => setReferenceDoc(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Remarques</label>
                <input
                  type="text"
                  placeholder="ex: Réception camion 15T sable lavé"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
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
                  {saving ? "Enregistrement..." : "Valider Mouvement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
