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
}

export function SixSigmaLogo({
  className,
  size = "md",
  showText = true,
  showSlogan = true,
  variant = "full",
}: SixSigmaLogoProps) {
  // Height scale for the official logo graphic
  const heightMap = {
    sm: "h-12",
    md: "h-16",
    lg: "h-20",
    xl: "h-24",
  };

  if (variant === "badge") {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center p-2.5 rounded-xl bg-white shadow-sm border border-slate-200",
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
          className="h-10 w-auto object-contain flex-shrink-0"
          priority
        />
        {showText && (
          <div className="flex flex-col">
            <span className="font-black tracking-wider uppercase text-white font-sans text-base leading-tight">
              SIX SIGMA
            </span>
            {showSlogan && (
              <span className="text-slate-400 italic font-medium tracking-tight text-[10px] mt-0.5">
                « La constance dans la qualité »
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default: Full authentic official logo graphic (seamless on dark mode)
  return (
    <div className={cn("relative flex items-center justify-center select-none", className)}>
      <Image
        src="/images/logo-dark-mode.png"
        alt="SIX SIGMA - La constance dans la qualité"
        width={220}
        height={156}
        className={cn(heightMap[size], "w-auto object-contain")}
        priority
      />
    </div>
  );
}
