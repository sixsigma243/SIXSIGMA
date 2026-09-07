import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  type?: "project" | "requisition" | "report" | "presence" | "vehicle";
  className?: string;
}

export function StatusBadge({ status, type = "project", className }: StatusBadgeProps) {
  let label = status;
  let colorClasses = "bg-slate-800 text-slate-300 border-slate-700";

  switch (status) {
    // Project statuses
    case "in_progress":
      label = "En Cours";
      colorClasses = "bg-blue-950/80 text-blue-300 border-blue-800";
      break;
    case "completed":
      label = "Achevé";
      colorClasses = "bg-emerald-950/80 text-emerald-300 border-emerald-800";
      break;
    case "on_hold":
      label = "En Attente";
      colorClasses = "bg-amber-950/80 text-amber-300 border-amber-800";
      break;
    case "cancelled":
      label = "Annulé";
      colorClasses = "bg-red-950/80 text-red-300 border-red-800";
      break;
    case "draft":
      label = "Brouillon";
      colorClasses = "bg-slate-800/80 text-slate-400 border-slate-700";
      break;

    // Requisition / DRI statuses
    case "submitted":
      label = "Soumis (En attente)";
      colorClasses = "bg-amber-950/80 text-amber-300 border-amber-800";
      break;
    case "site_manager_approved":
      label = "Approuvé Site Mgr";
      colorClasses = "bg-indigo-950/80 text-indigo-300 border-indigo-800";
      break;
    case "fulfilled":
      label = "Délivré / Servi";
      colorClasses = "bg-emerald-950/80 text-emerald-300 border-emerald-800";
      break;
    case "rejected":
      label = "Rejeté";
      colorClasses = "bg-rose-950/80 text-rose-300 border-rose-800";
      break;

    // Daily report statuses
    case "validated":
      label = "Validé";
      colorClasses = "bg-emerald-950/80 text-emerald-300 border-emerald-800";
      break;

    // Presence statuses
    case "present":
      label = "Présent";
      colorClasses = "bg-emerald-950/80 text-emerald-300 border-emerald-800";
      break;
    case "late":
      label = "En Retard";
      colorClasses = "bg-amber-950/80 text-amber-300 border-amber-800";
      break;
    case "absent":
      label = "Absent";
      colorClasses = "bg-rose-950/80 text-rose-300 border-rose-800";
      break;
    case "leave":
      label = "En Congé";
      colorClasses = "bg-cyan-950/80 text-cyan-300 border-cyan-800";
      break;

    // Vehicle statuses
    case "available":
      label = "Disponible";
      colorClasses = "bg-emerald-950/80 text-emerald-300 border-emerald-800";
      break;
    case "in_mission":
      label = "En Mission";
      colorClasses = "bg-blue-950/80 text-blue-300 border-blue-800";
      break;
    case "under_maintenance":
      label = "En Atelier";
      colorClasses = "bg-amber-950/80 text-amber-300 border-amber-800";
      break;
    case "out_of_service":
      label = "Hors Service";
      colorClasses = "bg-rose-950/80 text-rose-300 border-rose-800";
      break;

    default:
      label = status;
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide",
        colorClasses,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80"></span>
      {label}
    </span>
  );
}
