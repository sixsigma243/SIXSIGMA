"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Building2,
  Users,
  Package,
  DollarSign,
  FileCheck2,
  LayoutGrid,
  ChevronRight,
  ArrowRight,
  Loader2,
  CornerDownLeft,
} from "lucide-react";
import { SearchResultItem } from "@/app/api/search/route";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle Search
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      timer = setTimeout(fetchResults, 150);
    }

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[selectedIndex]) {
          router.push(results[selectedIndex].link);
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, router, onClose]);

  if (!isOpen) return null;

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "project":
        return <Building2 className="w-4 h-4 text-[#8E2424]" />;
      case "employee":
        return <Users className="w-4 h-4 text-emerald-600" />;
      case "inventory":
        return <Package className="w-4 h-4 text-sky-600" />;
      case "finance":
        return <DollarSign className="w-4 h-4 text-amber-600" />;
      case "requisition":
        return <FileCheck2 className="w-4 h-4 text-indigo-600" />;
      default:
        return <LayoutGrid className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20 select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Modal dialog box */}
      <div className="relative mx-auto max-w-2xl transform rounded-2xl bg-white border border-slate-100 shadow-2xl transition-all overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="relative border-b border-slate-100 flex items-center px-4">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un chantier, collaborateur, matériel, transaction de caisse..."
            className="w-full border-0 bg-transparent px-3 py-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0"
          />
          {loading && <Loader2 className="w-4 h-4 text-[#8E2424] animate-spin mr-2" />}
          {query && !loading && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 rounded border border-slate-200">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-50">
          {results.length > 0 ? (
            results.map((item, idx) => {
              const isSelected = selectedIndex === idx;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    router.push(item.link);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition ${
                    isSelected ? "bg-slate-50 text-[#8E2424]" : "hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition ${
                        isSelected ? "bg-white shadow-xs" : "bg-slate-100"
                      }`}
                    >
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1C1F23] truncate">
                          {item.title}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 flex-shrink-0">
                          {item.categoryLabel}
                        </span>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#8E2424]/10 text-[#8E2424] flex-shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-3 flex-shrink-0">
                    {isSelected && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-medium text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                        <span>Ouvrir</span>
                        <CornerDownLeft className="w-2.5 h-2.5" />
                      </span>
                    )}
                    <ChevronRight
                      className={`w-4 h-4 transition ${
                        isSelected ? "text-[#8E2424] translate-x-0.5" : "text-slate-300"
                      }`}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 px-4">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                Aucun résultat pour &laquo; {query} &raquo;
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Vérifiez l&apos;orthographe ou naviguez directement via le menu latéral.
              </p>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-[11px] text-slate-400 px-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                ↑
              </kbd>
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                ↓
              </kbd>
              <span>pour naviguer</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                ↵
              </kbd>
              <span>pour ouvrir</span>
            </span>
          </div>
          <span className="font-medium text-slate-500">SIX SIGMA ERP v2.6</span>
        </div>
      </div>
    </div>
  );
}
