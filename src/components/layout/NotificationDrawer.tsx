"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  X,
  Bell,
  RefreshCw,
  Clock,
  DollarSign,
  Package,
  FileCheck2,
  HardHat,
  Scale,
  ShieldCheck,
  MessageSquare,
  ChevronRight,
  Filter,
  CheckCheck,
} from "lucide-react";
import { AppNotification } from "@/app/api/notifications/route";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export function NotificationDrawer({
  isOpen,
  onClose,
  onUnreadCountChange,
}: NotificationDrawerProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Load read notification IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sixsigma_read_notifications");
      if (stored) {
        setReadIds(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveReadIds = (newSet: Set<string>) => {
    setReadIds(newSet);
    try {
      localStorage.setItem("sixsigma_read_notifications", JSON.stringify(Array.from(newSet)));
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        if (data?.notifications) {
          setNotifications(data.notifications);
        }
      }
    } catch (err) {
      console.error("Erreur chargement notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Compute unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readIds.has(n.id)).length;
  }, [notifications, readIds]);

  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  // Mark all as read
  const handleMarkAllAsRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    saveReadIds(allIds);
  };

  // Mark single as read
  const handleMarkAsRead = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    saveReadIds(next);
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Type filter
      if (selectedFilter !== "ALL") {
        if (selectedFilter === "FINANCE" && n.type !== "cashbox") return false;
        if (selectedFilter === "STOCK" && n.type !== "stock" && n.type !== "requisition") return false;
        if (selectedFilter === "SITE" && n.type !== "report" && n.type !== "attendance") return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          n.title.toLowerCase().includes(q) ||
          n.authorName.toLowerCase().includes(q) ||
          n.authorRoleLabel.toLowerCase().includes(q) ||
          n.writtenText.toLowerCase().includes(q) ||
          (n.secondaryText && n.secondaryText.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [notifications, selectedFilter, searchQuery]);

  if (!isOpen) return null;

  const getModuleIcon = (type: string) => {
    switch (type) {
      case "cashbox":
        return <DollarSign className="w-4 h-4 text-[#8E2424]" />;
      case "stock":
        return <Package className="w-4 h-4 text-sky-600" />;
      case "requisition":
        return <FileCheck2 className="w-4 h-4 text-amber-600" />;
      case "report":
        return <HardHat className="w-4 h-4 text-[#7BA238]" />;
      case "attendance":
        return <Scale className="w-4 h-4 text-indigo-600" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      if (diffDays === 1) return "Hier";
      if (diffDays < 7) return `Il y a ${diffDays} j`;
      return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md md:max-w-lg bg-white border-l border-slate-100 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#8E2424]/10 text-[#8E2424] flex items-center justify-center font-bold">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1C1F23] flex items-center gap-2">
                    Activités & Mouvements
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#8E2424] text-white">
                        {unreadCount}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Traçabilité en direct des saisies rédigées par chaque rôle
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={fetchNotifications}
                  title="Rafraîchir les activités"
                  className={`p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition ${
                    loading ? "animate-spin text-[#8E2424]" : ""
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="mt-4 space-y-2.5">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par auteur, rôle ou texte rédigé..."
                  className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8E2424] transition shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  {[
                    { id: "ALL", label: "Tous" },
                    { id: "FINANCE", label: "Caisse" },
                    { id: "STOCK", label: "Stocks & DRI" },
                    { id: "SITE", label: "Chantiers & RH" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                        selectedFilter === tab.id
                          ? "bg-[#8E2424] text-white shadow-xs"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    title="Tout marquer comme lu"
                    className="flex items-center gap-1 text-[11px] font-bold text-[#8E2424] hover:underline whitespace-nowrap px-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Tout lire</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Notifications Scrollable List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notif) => {
                const isRead = readIds.has(notif.id);

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleMarkAsRead(notif.id)}
                    className={`p-4 rounded-2xl border transition shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] group ${
                      isRead
                        ? "bg-white border-slate-200/80"
                        : "bg-white border-l-4 border-l-[#8E2424] border-slate-200"
                    }`}
                  >
                    {/* Card Header: Module, Time, Author */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          {getModuleIcon(notif.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              {notif.module}
                            </span>
                            {!isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#8E2424]" />
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-[#1C1F23]">
                            {notif.title}
                          </h4>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(notif.timestamp)}
                        </span>
                        {notif.statusBadge && (
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              notif.statusBadge.variant === "success"
                                ? "bg-[#7BA238]/15 text-[#5A7C22]"
                                : notif.statusBadge.variant === "danger"
                                ? "bg-rose-50 text-rose-700"
                                : notif.statusBadge.variant === "warning"
                                ? "bg-amber-50 text-amber-700"
                                : notif.statusBadge.variant === "info"
                                ? "bg-sky-50 text-sky-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {notif.statusBadge.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Author & Action */}
                    <div className="mt-2.5 flex items-center gap-2 text-xs">
                      <div className="w-5 h-5 rounded-full bg-[#1C1F23] text-white flex items-center justify-center font-bold text-[9px]">
                        {notif.authorName
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-800">{notif.authorName}</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                        {notif.authorRoleLabel}
                      </span>
                    </div>

                    {/* THE EXACT TEXT WRITTEN BY THE ROLE (Highlight Box) */}
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 border-l-4 border-[#8E2424] space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <MessageSquare className="w-3 h-3 text-[#8E2424]" />
                        <span>Saisie / Motif rédigé par l&apos;opérateur :</span>
                      </div>
                      <p className="text-xs text-slate-900 font-medium leading-relaxed italic whitespace-pre-wrap">
                        &laquo; {notif.writtenText} &raquo;
                      </p>
                      {notif.secondaryText && (
                        <p className="text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-200/60">
                          {notif.secondaryText}
                        </p>
                      )}
                    </div>

                    {/* Metadata chips */}
                    {notif.metadata && notif.metadata.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {notif.metadata.map((m, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 font-medium"
                          >
                            <span className="text-slate-400 mr-1">{m.label}:</span>
                            <strong className="text-slate-800 font-semibold">{m.value}</strong>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Link Button */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {notif.action}
                      </span>
                      <Link
                        href={notif.link}
                        onClick={onClose}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#8E2424] hover:text-[#751D1D] group-hover:translate-x-0.5 transition-transform"
                      >
                        <span>Ouvrir dans le module</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-100">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">
                  Aucun mouvement récent
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Toutes les transactions, réquisitions et modifications d&apos;équipes apparaîtront ici dès leur saisie.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
