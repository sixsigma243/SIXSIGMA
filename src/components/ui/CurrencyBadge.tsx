import React from "react";
import { CurrencyCode } from "@/types/database";
import { formatCurrency, convertUsdToCdf, convertCdfToUsd, cn } from "@/lib/utils";

interface CurrencyBadgeProps {
  amount: number;
  currency: CurrencyCode;
  showConverted?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function CurrencyBadge({
  amount,
  currency,
  showConverted = true,
  className,
  size = "md",
}: CurrencyBadgeProps) {
  const formatted = formatCurrency(amount, currency);
  const converted =
    currency === "USD"
      ? formatCurrency(convertUsdToCdf(amount), "CDF")
      : formatCurrency(convertCdfToUsd(amount), "USD");

  const sizeStyles = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-lg font-bold",
  };

  return (
    <div className={cn("inline-flex flex-col items-start", className)}>
      <span
        className={cn(
          "font-semibold tracking-tight",
          currency === "USD" ? "text-emerald-400" : "text-amber-400",
          sizeStyles[size]
        )}
      >
        {formatted}
      </span>
      {showConverted && (
        <span className="text-[10px] text-slate-400">
          ≈ {converted}
        </span>
      )}
    </div>
  );
}
