"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface SixSigmaLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showSlogan?: boolean;
  variant?: "badge" | "transparent" | "full";
}

export function SixSigmaLogo({
  className,
  size = "md",
  showText = true,
  showSlogan = false,
  variant = "badge",
}: SixSigmaLogoProps) {
  const sizeMap = {
    sm: { icon: "w-8 h-8", px: 32, text: "text-sm", slogan: "text-[9px]" },
    md: { icon: "w-10 h-10", px: 40, text: "text-base", slogan: "text-[10px]" },
    lg: { icon: "w-12 h-12", px: 48, text: "text-xl", slogan: "text-xs" },
    xl: { icon: "w-16 h-16", px: 64, text: "text-2xl", slogan: "text-xs" },
  };

  const currentSize = sizeMap[size];

  if (variant === "full") {
    return (
      <div className={cn("relative flex items-center select-none", className)}>
        <Image
          src="/images/logo-dark-mode.png"
          alt="SIX SIGMA - La constance dans la qualité"
          width={280}
          height={198}
          className="w-auto h-12 object-contain"
          priority
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      {/* Official Physical Emblem from Downloads */}
      <div
        className={cn(
          currentSize.icon,
          variant === "transparent"
            ? "relative flex-shrink-0 flex items-center justify-center p-0.5"
            : "relative flex-shrink-0 rounded-xl bg-white border border-[#252932] flex items-center justify-center shadow-md p-1 overflow-hidden transition-transform group-hover:scale-105"
        )}
      >
        <Image
          src={variant === "transparent" ? "/icons/emblem-transparent.png" : "/icons/icon-512x512.png"}
          alt="SIX SIGMA"
          width={currentSize.px}
          height={currentSize.px}
          className="w-full h-full object-contain"
          priority
        />
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
