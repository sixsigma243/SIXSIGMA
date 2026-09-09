"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface SixSigmaLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showSlogan?: boolean;
  variant?: "full" | "horizontal" | "badge";
  theme?: "light" | "dark";
}

export function SixSigmaLogo({
  className,
  size = "md",
  showText = true,
  showSlogan = true,
  variant = "full",
  theme = "light",
}: SixSigmaLogoProps) {
  const heightMap = {
    sm: "h-10",
    md: "h-14",
    lg: "h-18",
    xl: "h-22",
  };

  if (variant === "badge") {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center p-2 rounded-xl bg-white shadow-sm border border-slate-100",
          className
        )}
      >
        <Image
          src="/logo.jpg"
          alt="SIX SIGMA - La constance dans la qualité"
          width={220}
          height={156}
          className={cn(heightMap[size], "w-auto object-contain")}
          priority
        />
      </div>
    );
  }

  if (variant === "horizontal") {
    return (
      <div className={cn("flex items-center gap-3 select-none", className)}>
        <Image
          src="/icons/emblem-transparent.png"
          alt="SIX SIGMA Emblem"
          width={56}
          height={38}
          className="h-9 w-auto object-contain flex-shrink-0"
          priority
        />
        {showText && (
          <div className="flex flex-col">
            <span
              className={cn(
                "font-bold tracking-tight uppercase font-sans text-base leading-tight",
                theme === "dark" ? "text-white" : "text-[#1C1F23]"
              )}
            >
              SIX SIGMA
            </span>
            {showSlogan && (
              <span
                className={cn(
                  "italic font-medium tracking-tight text-[10px] mt-0.5",
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
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

  // Default: Full authentic official logo graphic
  const logoSrc = theme === "dark" ? "/images/logo-dark-mode.png" : "/images/logo-transparent.png";

  return (
    <div className={cn("relative flex items-center justify-center select-none", className)}>
      <Image
        src={logoSrc}
        alt="SIX SIGMA - La constance dans la qualité"
        width={220}
        height={156}
        className={cn(heightMap[size], "w-auto object-contain")}
        priority
      />
    </div>
  );
}
