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
  let colorClasses = "bg-[#1C1F23] text-slate-300 border-[#252932]";

  switch (status) {
    // Project statuses
    case "in_progress":
      label = "En Cours";
      colorClasses = "bg-sky-950/40 text-sky-300 border-sky-800/60";
      break;
    case "completed":
      label = "Achevé";
      colorClasses = "bg-[#7BA238]/15 text-[#A5CE5B] border-[#7BA238]/50";
      break;
    case "on_hold":
      label = "En Attente";
      colorClasses = "bg-amber-950/40 text-amber-300 border-amber-800/60";
      break;
    case "cancelled":
      label = "Annulé";
      colorClasses = "bg-[#8E2424]/20 text-[#E58585] border-[#8E2424]/60";
      break;
    case "draft":
      label = "Brouillon";
      colorClasses = "bg-slate-900/60 text-slate-400 border-slate-700/60";
      break;

    // Requisition / DRI statuses
    case "submitted":
      label = "Soumis (En attente)";
      colorClasses = "bg-amber-950/40 text-amber-300 border-amber-800/60";
      break;
    case "site_manager_approved":
      label = "Approuvé Site Mgr";
      colorClasses = "bg-[#7BA238]/15 text-[#A5CE5B] border-[#7BA238]/50";
      break;
    case "fulfilled":
      label = "Délivré / Servi";
      colorClasses = "bg-[#7BA238]/20 text-[#B2DB68] border-[#7BA238]/70 font-semibold";
      break;
    case "rejected":
      label = "Rejeté";
      colorClasses = "bg-[#8E2424]/20 text-[#E58585] border-[#8E2424]/60";
      break;

    // Daily report statuses
    case "validated":
      label = "Validé";
      colorClasses = "bg-[#7BA238]/15 text-[#A5CE5B] border-[#7BA238]/50";
      break;

    // Presence statuses
    case "present":
      label = "Présent";
      colorClasses = "bg-[#7BA238]/15 text-[#A5CE5B] border-[#7BA238]/50";
      break;
    case "late":
      label = "En Retard";
      colorClasses = "bg-amber-950/40 text-amber-300 border-amber-800/60";
      break;
    case "absent":
      label = "Absent";
      colorClasses = "bg-[#8E2424]/20 text-[#E58585] border-[#8E2424]/60";
      break;
    case "leave":
      label = "En Congé";
      colorClasses = "bg-slate-800/60 text-slate-300 border-slate-700/60";
      break;

    // Vehicle statuses
    case "available":
      label = "Disponible";
      colorClasses = "bg-[#7BA238]/15 text-[#A5CE5B] border-[#7BA238]/50";
      break;
    case "in_mission":
      label = "En Mission";
      colorClasses = "bg-sky-950/40 text-sky-300 border-sky-800/60";
      break;
    case "under_maintenance":
      label = "En Atelier";
      colorClasses = "bg-amber-950/40 text-amber-300 border-amber-800/60";
      break;
    case "out_of_service":
      label = "Hors Service";
      colorClasses = "bg-[#8E2424]/20 text-[#E58585] border-[#8E2424]/60";
      break;

    default:
      label = status;
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide select-none",
        colorClasses,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-90"></span>
      {label}
    </span>
  );
}
