import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  type?: "project" | "requisition" | "report" | "presence" | "vehicle";
  className?: string;
}

export function StatusBadge({ status, type = "project", className }: StatusBadgeProps) {
  let label = status;
  // Default Neutral
  let colorClasses = "bg-slate-100 text-slate-600 border-slate-200";

  switch (status) {
    // Project statuses
    case "in_progress":
      label = "En Cours";
      colorClasses = "bg-sky-50 text-sky-700 border-sky-200";
      break;
    case "completed":
      label = "Achevé";
      colorClasses = "bg-[#7BA238]/10 text-[#5e7c2b] border-[#7BA238]/30";
      break;
    case "on_hold":
      label = "En Attente";
      colorClasses = "bg-amber-50 text-amber-700 border-amber-200";
      break;
    case "cancelled":
      label = "Annulé";
      colorClasses = "bg-rose-50 text-[#8E2424] border-rose-200";
      break;
    case "draft":
      label = "Brouillon";
      colorClasses = "bg-slate-100 text-slate-600 border-slate-200";
      break;

    // Requisition / DRI statuses
    case "submitted":
      label = "Soumis (En attente)";
      colorClasses = "bg-amber-50 text-amber-700 border-amber-200";
      break;
    case "approved":
    case "site_manager_approved":
      label = "Approuvé";
      colorClasses = "bg-[#7BA238]/10 text-[#5e7c2b] border-[#7BA238]/30";
      break;
    case "delivered":
    case "fulfilled":
      label = "Délivré";
      colorClasses = "bg-[#7BA238]/15 text-[#5e7c2b] border-[#7BA238]/40 font-bold";
      break;
    case "rejected":
      label = "Rejeté";
      colorClasses = "bg-rose-50 text-[#8E2424] border-rose-200";
      break;

    // Daily report statuses
    case "validated":
      label = "Validé";
      colorClasses = "bg-[#7BA238]/10 text-[#5e7c2b] border-[#7BA238]/30";
      break;

    // Presence statuses
    case "present":
      label = "Présent";
      colorClasses = "bg-[#7BA238]/10 text-[#5e7c2b] border-[#7BA238]/30";
      break;
    case "late":
      label = "En Retard";
      colorClasses = "bg-amber-50 text-amber-700 border-amber-200";
      break;
    case "absent":
      label = "Absent";
      colorClasses = "bg-rose-50 text-[#8E2424] border-rose-200";
      break;
    case "leave":
      label = "En Congé";
      colorClasses = "bg-slate-100 text-slate-600 border-slate-200";
      break;

    // Vehicle statuses
    case "available":
      label = "Disponible";
      colorClasses = "bg-[#7BA238]/10 text-[#5e7c2b] border-[#7BA238]/30";
      break;
    case "in_mission":
      label = "En Mission";
      colorClasses = "bg-sky-50 text-sky-700 border-sky-200";
      break;
    case "under_maintenance":
      label = "En Atelier";
      colorClasses = "bg-amber-50 text-amber-700 border-amber-200";
      break;
    case "out_of_service":
      label = "Hors Service";
      colorClasses = "bg-rose-50 text-[#8E2424] border-rose-200";
      break;

    // Generic Active / Inactive
    case "active":
      label = "Actif";
      colorClasses = "bg-[#7BA238]/10 text-[#5e7c2b] border-[#7BA238]/30";
      break;
    case "inactive":
      label = "Inactif";
      colorClasses = "bg-rose-50 text-[#8E2424] border-rose-200";
      break;

    default:
      label = status;
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide select-none shadow-2xs",
        colorClasses,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-85"></span>
      {label}
    </span>
  );
}
