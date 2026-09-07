"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SixSigmaLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showSlogan?: boolean;
}

export function SixSigmaLogo({
  className,
  size = "md",
  showText = true,
  showSlogan = false,
}: SixSigmaLogoProps) {
  const sizeMap = {
    sm: { icon: "w-8 h-8", text: "text-sm", slogan: "text-[9px]" },
    md: { icon: "w-10 h-10", text: "text-base", slogan: "text-[10px]" },
    lg: { icon: "w-12 h-12", text: "text-xl", slogan: "text-xs" },
    xl: { icon: "w-16 h-16", text: "text-2xl", slogan: "text-xs" },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      {/* Official Emblem: Roof structure, Steel Truelle & Natural Green Drop */}
      <div
        className={cn(
          currentSize.icon,
          "relative flex-shrink-0 rounded-xl bg-[#1C1F23] border border-[#252932] flex items-center justify-center shadow-lg p-1.5 overflow-hidden group transition-all"
        )}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Roof Structure / Pignon BTP (Brick Red #8E2424) */}
          <path
            d="M6 24L24 8L42 24L38 27L24 14.5L10 27L6 24Z"
            fill="#8E2424"
          />

          {/* Steel Beam / Truelle base (Steel Dark #1C1F23 with #252932 outline) */}
          <path
            d="M14 26H34L37 38H11L14 26Z"
            fill="#14171D"
            stroke="#252932"
            strokeWidth="1.5"
          />

          {/* Six Sigma Symbol 6Σ (Brick Red & Pure White) */}
          <text
            x="24"
            y="35"
            textAnchor="middle"
            fontFamily="monospace, system-ui, sans-serif"
            fontWeight="900"
            fontSize="10"
            fill="#FFFFFF"
            letterSpacing="-0.5"
          >
            6Σ
          </text>

          {/* Natural Green Drop / Accentuation écologique (#7BA238) */}
          <path
            d="M24 17C24 17 28 21.5 28 23.5C28 25.7 26.2 27.5 24 27.5C21.8 27.5 20 25.7 20 23.5C20 21.5 24 17 24 17Z"
            fill="#7BA238"
          />
          <circle cx="23" cy="22" r="1.2" fill="#A4CE4E" />
        </svg>
      </div>

      {/* Brand Typographic Block */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                currentSize.text,
                "font-black tracking-wider uppercase text-white font-sans"
              )}
            >
              SIX SIGMA
            </span>
          </div>

          {showSlogan && (
            <span
              className={cn(
                currentSize.slogan,
                "text-slate-400 italic font-medium tracking-tight mt-0.5"
              )}
            >
              « La constance dans la qualité »
            </span>
          )}
        </div>
      )}
    </div>
  );
}
