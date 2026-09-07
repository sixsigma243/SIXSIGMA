"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { FleetVehicle, DispatchMission, Project, VehicleStatus, Profile } from "@/types/database";
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
  Edit3,
  Trash2,
  Check,
} from "lucide-react";

export default function FleetPage() {
  const supabase = createClient();

  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [missions, setMissions] = useState<DispatchMission[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // New Mission Modal
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverLicenseExpiry, setDriverLicenseExpiry] = useState(
    new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0]
  );
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [departurePlace, setDeparturePlace] = useState("Dépôt Central Limete");
  const [destination, setDestination] = useState("");
  const [cargo, setCargo] = useState("");
  const [fuelLiters, setFuelLiters] = useState("30");
  const [savingMission, setSavingMission] = useState(false);

  // New Vehicle Modal State
  const [showCreateVehicleModal, setShowCreateVehicleModal] = useState(false);
  const [newPlate, setNewPlate] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newType, setNewType] = useState("Camion Benne 20T");
  const [newStatus, setNewStatus] = useState<VehicleStatus>("available");
  const [newMileage, setNewMileage] = useState("0");
  const [newDriver, setNewDriver] = useState("");
  const [newMaintenanceDate, setNewMaintenanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [creatingVehicle, setCreatingVehicle] = useState(false);

  // Edit Vehicle Modal State
  const [editingVehicle, setEditingVehicle] = useState<FleetVehicle | null>(null);
  const [editPlate, setEditPlate] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editType, setEditType] = useState("");
  const [editMileage, setEditMileage] = useState("");
  const [editDriver, setEditDriver] = useState("");
  const [editMaintenanceDate, setEditMaintenanceDate] = useState("");
  const [updatingVehicle, setUpdatingVehicle] = useState(false);

  const fetchFleetData = async () => {
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

  // CREATE VEHICLE
  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingVehicle(true);

    const { error } = await supabase.from("fleet_vehicles").insert({
      plate_number: newPlate.trim().toUpperCase(),
      model: newModel.trim(),
      vehicle_type: newType.trim(),
      status: newStatus,
      current_mileage: parseInt(newMileage, 10) || 0,
      assigned_driver: newDriver.trim() || null,
      last_maintenance_date: newMaintenanceDate || null,
    });

    if (!error) {
      setShowCreateVehicleModal(false);
      setNewPlate("");
      setNewModel("");
      setNewMileage("0");
      setNewDriver("");
      fetchFleetData();
    } else {
      alert("Erreur lors de la création de l'engin : " + error.message);
    }
    setCreatingVehicle(false);
  };

  // OPEN EDIT VEHICLE
  const handleOpenEditVehicle = (v: FleetVehicle) => {
    setEditingVehicle(v);
    setEditPlate(v.plate_number);
    setEditModel(v.model);
    setEditType(v.vehicle_type);
    setEditMileage(String(v.current_mileage));
    setEditDriver(v.assigned_driver || "");
    setEditMaintenanceDate(v.last_maintenance_date ? v.last_maintenance_date.split("T")[0] : "");
  };

  // UPDATE VEHICLE
  const handleUpdateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    setUpdatingVehicle(true);

    const { error } = await supabase
      .from("fleet_vehicles")
      .update({
        plate_number: editPlate.trim().toUpperCase(),
        model: editModel.trim(),
        vehicle_type: editType.trim(),
        current_mileage: parseInt(editMileage, 10) || 0,
        assigned_driver: editDriver.trim() || null,
        last_maintenance_date: editMaintenanceDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingVehicle.id);

    if (!error) {
      setEditingVehicle(null);
      fetchFleetData();
    } else {
      alert("Erreur lors de la mise à jour de l'engin : " + error.message);
    }
    setUpdatingVehicle(false);
  };

  // DELETE VEHICLE
  const handleDeleteVehicle = async (vehicleId: string, plateNumber: string) => {
    if (!window.confirm(`Confirmez-vous la suppression de l'engin/véhicule immatriculé "${plateNumber}" ?`)) {
      return;
    }

    const { error } = await supabase.from("fleet_vehicles").delete().eq("id", vehicleId);
    if (!error) {
      fetchFleetData();
    } else {
      alert("Erreur lors de la suppression de l'engin : " + error.message);
    }
  };

  // CREATE MISSION
  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMission(true);

    const { error } = await supabase.from("dispatch_missions").insert({
      vehicle_id: selectedVehicleId,
      driver_name: driverName.trim(),
      driver_license_expiry: driverLicenseExpiry,
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

      setShowMissionModal(false);
      setDestination("");
      setCargo("");
      setDriverName("");
      fetchFleetData();
    } else {
      alert("Erreur lors de l'affectation de mission : " + error.message);
    }
    setSavingMission(false);
  };

  const handleUpdateVehicleStatus = async (vehicleId: string, newStatus: VehicleStatus) => {
    const { error } = await supabase
      .from("fleet_vehicles")
      .update({ status: newStatus })
      .eq("id", vehicleId);

    if (!error) fetchFleetData();
  };

  const canManageFleet = currentUser && ["admin", "company_management", "workshop_manager"].includes(currentUser.role);

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

        <div className="flex items-center gap-2.5">
          {canManageFleet && (
            <button
              onClick={() => setShowCreateVehicleModal(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-sky-400" />
              <span>+ Nouvel Engin</span>
            </button>
          )}

          <button
            onClick={() => setShowMissionModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-rose-800 hover:from-red-600 hover:to-rose-700 text-white text-xs font-bold shadow-lg shadow-red-950/50 border border-red-600/30 transition flex items-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            <span>Ordre de Mission</span>
          </button>
        </div>
      </div>

      {/* Vehicles Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            État du Parc & Disponibilité des Engins
          </h2>
          <span className="text-xs text-slate-400">
            {vehicles.length} engin(s) inventorié(s)
          </span>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Chargement des engins...
          </div>
        ) : vehicles.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center text-slate-400 text-xs">
            Aucun engin dans la flotte. Cliquez sur &ldquo;+ Nouvel Engin&rdquo; pour ajouter un véhicule.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                    <div className="flex items-center gap-2">
                      <StatusBadge status={v.status} type="vehicle" />
                      {canManageFleet && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditVehicle(v)}
                            title="Modifier l'engin"
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteVehicle(v.id, v.plate_number)}
                            title="Supprimer l'engin"
                            className="p-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 hover:text-rose-100 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
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
                      <strong className="font-mono">{v.current_mileage.toLocaleString()} km / h</strong>
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
                    <td className="py-3 px-4 text-slate-200">
                      <div className="font-semibold text-white">{m.driver_name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <span>Permis :</span>
                        <span
                          className={`font-mono font-medium ${
                            m.driver_license_expiry &&
                            new Date(m.driver_license_expiry).getTime() < Date.now()
                              ? "text-rose-400"
                              : "text-sky-300"
                          }`}
                        >
                          {m.driver_license_expiry ? formatDate(m.driver_license_expiry) : "En règle"}
                        </span>
                      </div>
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

      {/* CREATE VEHICLE MODAL */}
      {showCreateVehicleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] rounded-2xl border border-slate-700 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-400" />
                <span>Ajouter un Nouvel Engin / Véhicule</span>
              </h3>
              <button
                onClick={() => setShowCreateVehicleModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVehicle} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Immatriculation / N° Parc *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: KN-8921-BG"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Type d&apos;Engin *</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="Camion Benne 20T">Camion Benne 20T</option>
                    <option value="Pelle Mécanique CAT">Pelle Mécanique Chenille</option>
                    <option value="Bétonnière Toupie">Bétonnière Toupie 8m³</option>
                    <option value="Bulldozer / Chargeur">Bulldozer / Chargeur</option>
                    <option value="Grue Mobile BTP">Grue Mobile BTP</option>
                    <option value="Compacteur / Rouleau">Compacteur / Rouleau</option>
                    <option value="Véhicule Liaison 4x4">Véhicule Liaison 4x4</option>
                    <option value="Groupe Électrogène 250kVA">Groupe Électrogène Mobile</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Modèle & Marque *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Mercedes Actros 3340 6x4"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Statut Initial *</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as VehicleStatus)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="available">Disponible</option>
                    <option value="in_mission">En Mission</option>
                    <option value="under_maintenance">En Atelier</option>
                    <option value="out_of_service">Hors Service</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Compteur Initial (km/h) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newMileage}
                    onChange={(e) => setNewMileage(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Chauffeur / Opérateur</label>
                  <input
                    type="text"
                    placeholder="ex: André Lukoki"
                    value={newDriver}
                    onChange={(e) => setNewDriver(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Dernier Entretien</label>
                  <input
                    type="date"
                    value={newMaintenanceDate}
                    onChange={(e) => setNewMaintenanceDate(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateVehicleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creatingVehicle}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition disabled:opacity-50"
                >
                  {creatingVehicle ? "Enregistrement..." : "Ajouter au Parc"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT VEHICLE MODAL */}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] rounded-2xl border border-slate-700 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-sky-400" />
                <span>Modifier l&apos;Engin : {editingVehicle.plate_number}</span>
              </h3>
              <button
                onClick={() => setEditingVehicle(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateVehicle} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Immatriculation / N° Parc *</label>
                  <input
                    type="text"
                    required
                    value={editPlate}
                    onChange={(e) => setEditPlate(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Type d&apos;Engin *</label>
                  <input
                    type="text"
                    required
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Modèle & Marque *</label>
                <input
                  type="text"
                  required
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Compteur Relevé (km/h) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editMileage}
                    onChange={(e) => setEditMileage(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Dernier Entretien</label>
                  <input
                    type="date"
                    value={editMaintenanceDate}
                    onChange={(e) => setEditMaintenanceDate(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Chauffeur / Opérateur Attitré</label>
                <input
                  type="text"
                  value={editDriver}
                  onChange={(e) => setEditDriver(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={updatingVehicle}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition disabled:opacity-50"
                >
                  {updatingVehicle ? "Enregistrement..." : "Mettre à jour"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW MISSION MODAL */}
      {showMissionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] rounded-2xl border border-slate-700 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Navigation className="w-4 h-4 text-sky-400" />
                <span>Créer un Ordre de Mission (Dispatch)</span>
              </h3>
              <button
                onClick={() => setShowMissionModal(false)}
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
                  <label className="block text-slate-300 font-semibold mb-1">Validité Permis Chauffeur *</label>
                  <input
                    type="date"
                    required
                    value={driverLicenseExpiry}
                    onChange={(e) => setDriverLicenseExpiry(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Chantier Lié</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">Hors chantier (Transport Général)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.title}
                    </option>
                  ))}
                </select>
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
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowMissionModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingMission}
                  className="px-5 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold transition disabled:opacity-50"
                >
                  {savingMission ? "Affectation..." : "Lancer la Mission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
