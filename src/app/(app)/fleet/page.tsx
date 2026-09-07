"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { FleetVehicle, DispatchMission, Project, VehicleStatus } from "@/types/database";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import {
  Truck,
  Plus,
  Wrench,
  Navigation,
  Fuel,
  Gauge,
  User,
  Calendar,
  X,
  MapPin,
} from "lucide-react";

export default function FleetPage() {
  const supabase = createClient();

  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [missions, setMissions] = useState<DispatchMission[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // New Mission Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [departurePlace, setDeparturePlace] = useState("Dépôt Central Limete");
  const [destination, setDestination] = useState("");
  const [cargo, setCargo] = useState("");
  const [fuelLiters, setFuelLiters] = useState("30");
  const [saving, setSaving] = useState(false);

  const fetchFleetData = async () => {
    setLoading(true);
    const { data: vData } = await supabase
      .from("fleet_vehicles")
      .select("*")
      .order("plate_number");

    if (vData) {
      setVehicles(vData as FleetVehicle[]);
      if (vData.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(vData[0].id);
      }
    }

    const { data: mData } = await supabase
      .from("dispatch_missions")
      .select("*, vehicle:vehicle_id(*), project:project_id(*)")
      .order("departure_date", { ascending: false });

    if (mData) setMissions(mData as DispatchMission[]);

    const { data: prjData } = await supabase.from("projects").select("*");
    if (prjData) {
      setProjects(prjData as Project[]);
      if (prjData.length > 0 && !selectedProjectId) {
        setSelectedProjectId(prjData[0].id);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchFleetData();
  }, []);

  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("dispatch_missions").insert({
      vehicle_id: selectedVehicleId,
      driver_name: driverName.trim(),
      project_id: selectedProjectId || null,
      departure_place: departurePlace.trim(),
      destination: destination.trim(),
      cargo_description: cargo.trim() || null,
      departure_date: new Date().toISOString(),
      fuel_consumed_liters: parseFloat(fuelLiters) || 0,
      status: "in_transit",
    });

    if (!error) {
      // Mark vehicle as in_mission
      await supabase
        .from("fleet_vehicles")
        .update({ status: "in_mission" })
        .eq("id", selectedVehicleId);

      setShowModal(false);
      setDestination("");
      setCargo("");
      setDriverName("");
      fetchFleetData();
    } else {
      alert("Erreur lors de l'affectation de mission : " + error.message);
    }
    setSaving(false);
  };

  const handleUpdateVehicleStatus = async (vehicleId: string, newStatus: VehicleStatus) => {
    const { error } = await supabase
      .from("fleet_vehicles")
      .update({ status: newStatus })
      .eq("id", vehicleId);

    if (!error) fetchFleetData();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-sky-500" />
            <span>Parc Roulant, Engins Lourds & Dispatch</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestion du charroi automobile BTP, pelles sur chenilles, camions bennes, grues et ordres de transport.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-rose-800 hover:from-red-600 hover:to-rose-700 text-white text-xs font-bold shadow-lg shadow-red-950/50 border border-red-600/30 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvel Ordre de Mission</span>
        </button>
      </div>

      {/* Vehicles Grid */}
      <div>
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
          État du Parc & Disponibilité des Engins
        </h2>

        {loading ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Chargement des engins...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-sky-900/50 transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-red-400">
                      {v.plate_number}
                    </span>
                    <StatusBadge status={v.status} type="vehicle" />
                  </div>

                  <h3 className="text-sm font-bold text-white">
                    {v.model}
                  </h3>
                  <span className="text-xs text-slate-400 block">
                    Type : {v.vehicle_type}
                  </span>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-slate-500" />
                        <span>Compteur :</span>
                      </span>
                      <strong className="font-mono">{v.current_mileage.toLocaleString()} km</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>Chauffeur :</span>
                      </span>
                      <span className="truncate max-w-[120px]">{v.assigned_driver || "Non assigné"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-slate-500" />
                        <span>Entretien :</span>
                      </span>
                      <span>{formatDate(v.last_maintenance_date)}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Status Switcher for Workshop / Dispatch */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Changer état :</span>
                  <select
                    value={v.status}
                    onChange={(e) => handleUpdateVehicleStatus(v.id, e.target.value as VehicleStatus)}
                    className="p-1 bg-slate-900 border border-slate-700 rounded text-slate-200 text-[11px]"
                  >
                    <option value="available">Disponible</option>
                    <option value="in_mission">En Mission</option>
                    <option value="under_maintenance">En Atelier</option>
                    <option value="out_of_service">Hors Service</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dispatch Missions Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Navigation className="w-4 h-4 text-sky-400" />
            <span>Missions de Dispatch & Déplacements Logistiques</span>
          </h3>
          <span className="text-xs text-slate-400">{missions.length} mission(s) répertoriée(s)</span>
        </div>

        {missions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Aucune mission enregistrée pour l&apos;instant.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Engin / Immatriculation</th>
                  <th className="py-3 px-4">Conducteur / Chauffeur</th>
                  <th className="py-3 px-4">Itinéraire (Départ &rarr; Destination)</th>
                  <th className="py-3 px-4">Chantier Lié</th>
                  <th className="py-3 px-4">Cargaison / Matériel</th>
                  <th className="py-3 px-4">Carburant</th>
                  <th className="py-3 px-4 text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {missions.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-white">
                      {m.vehicle?.plate_number || "Engin"}
                      <span className="block text-[11px] text-slate-400 font-normal">
                        {m.vehicle?.model}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-medium">
                      {m.driver_name}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        <span>{m.departure_place} &rarr; <strong className="text-white">{m.destination}</strong></span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {m.project ? `${m.project.code}` : "Transport Général"}
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                      {m.cargo_description || "Sans fret"}
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-300">
                      {m.fuel_consumed_liters} L
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          m.status === "in_transit"
                            ? "bg-blue-950 text-blue-300 border-blue-800"
                            : m.status === "completed"
                            ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {m.status === "in_transit"
                          ? "En Route"
                          : m.status === "completed"
                          ? "Terminée"
                          : m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Mission Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] rounded-2xl border border-slate-700 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Navigation className="w-4 h-4 text-sky-400" />
                <span>Créer un Ordre de Mission (Dispatch)</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMission} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Véhicule / Engin *</label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  required
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate_number} - {v.model} ({v.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Chauffeur Assigné *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: André Lukoki"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Chantier Lié</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="">Hors chantier</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Lieu de Départ *</label>
                  <input
                    type="text"
                    required
                    value={departurePlace}
                    onChange={(e) => setDeparturePlace(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Destination *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Chantier Nsele"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Cargaison / Fret</label>
                  <input
                    type="text"
                    placeholder="ex: 15 tonnes sable lavé"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Carburant Alloué (Litres)</label>
                  <input
                    type="number"
                    min="1"
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
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
                  {saving ? "Affectation..." : "Lancer la Mission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
