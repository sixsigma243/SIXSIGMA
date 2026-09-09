"use client";

import React, { useState } from "react";
import { formatUSD } from "@/lib/utils";
import { TrendingUp, Calendar, ArrowUpRight } from "lucide-react";

interface MonthlyData {
  month: string;
  shortMonth: string;
  actual: number; // in USD
  budget: number; // in USD
  change: string;
}

const SAMPLE_2026_DATA: MonthlyData[] = [
  { month: "Janvier", shortMonth: "Jan", actual: 8200, budget: 10000, change: "-18%" },
  { month: "Février", shortMonth: "Fév", actual: 12400, budget: 13000, change: "-5%" },
  { month: "Mars", shortMonth: "Mar", actual: 19800, budget: 16000, change: "+24%" },
  { month: "Avril", shortMonth: "Avr", actual: 18500, budget: 19000, change: "-3%" },
  { month: "Mai", shortMonth: "Mai", actual: 28400, budget: 22000, change: "+29%" },
  { month: "Juin", shortMonth: "Juin", actual: 24200, budget: 25000, change: "-3%" },
  { month: "Juillet", shortMonth: "Juil", actual: 31000, budget: 28000, change: "+11%" },
  { month: "Août", shortMonth: "Août", actual: 29500, budget: 31000, change: "-5%" },
  { month: "Septembre", shortMonth: "Sep", actual: 35000, budget: 34000, change: "+3%" },
];

export function FinancialPerformanceChart() {
  const [hoveredIndex, setHoveredIndex] = useState<number>(4); // Default to Mai (index 4) as in Slide 04
  const [year, setYear] = useState("2026");

  const data = SAMPLE_2026_DATA;
  const maxVal = 40000;

  // Chart dimensions
  const width = 640;
  const height = 240;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const getX = (index: number) => paddingLeft + (index / (data.length - 1)) * chartW;
  const getY = (val: number) => paddingTop + chartH - (val / maxVal) * chartH;

  // Generate smooth cubic bezier spline for actual line
  const splinePoints = data.map((d, i) => ({ x: getX(i), y: getY(d.actual) }));
  let actualPath = `M ${splinePoints[0].x} ${splinePoints[0].y}`;
  for (let i = 0; i < splinePoints.length - 1; i++) {
    const p0 = splinePoints[i === 0 ? 0 : i - 1];
    const p1 = splinePoints[i];
    const p2 = splinePoints[i + 1];
    const p3 = splinePoints[i + 2 >= splinePoints.length ? splinePoints.length - 1 : i + 2];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    actualPath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  // Area under curve path
  const areaPath = `${actualPath} L ${getX(data.length - 1)} ${paddingTop + chartH} L ${getX(0)} ${paddingTop + chartH} Z`;

  // Forecast path (dashed linear/soft curve)
  const budgetPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.budget) }));
  let budgetPath = `M ${budgetPoints[0].x} ${budgetPoints[0].y}`;
  for (let i = 0; i < budgetPoints.length - 1; i++) {
    const midX = (budgetPoints[i].x + budgetPoints[i + 1].x) / 2;
    budgetPath += ` Q ${midX} ${(budgetPoints[i].y + budgetPoints[i + 1].y) / 2}, ${budgetPoints[i + 1].x} ${budgetPoints[i + 1].y}`;
  }

  const activeData = data[hoveredIndex] || data[4];
  const activeX = getX(hoveredIndex);
  const activeY = getY(activeData.actual);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-5">
      {/* Header (Inspired by Slide 04) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Revenus & Décaissements Chantiers
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Suivi des dépenses réelles et alignement prévisionnel
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8E2424]" />
              <span>Dépenses</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span>Budget prévu</span>
            </span>
          </div>

          {/* Year selector */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{year}</span>
          </div>
        </div>
      </div>

      {/* SVG Chart Canvas */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
        >
          <defs>
            {/* Soft vertical gradient for area under curve */}
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8E2424" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#8E2424" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#8E2424" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines & Y Axis */}
          {[0, 10000, 20000, 30000, 40000].map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                  strokeDasharray={tick === 0 ? "none" : "2,4"}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-slate-400 font-medium"
                >
                  {tick === 0 ? "0" : `${tick / 1000}k`}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#curveGradient)" />

          {/* Forecast Budget line (dashed gray) */}
          <path
            d={budgetPath}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1.8"
            strokeDasharray="4,4"
            opacity="0.8"
          />

          {/* Actual Expense Spline Curve (#8E2424) */}
          <path
            d={actualPath}
            fill="none"
            stroke="#8E2424"
            strokeWidth="2.8"
            strokeLinecap="round"
          />

          {/* Vertical indicator guideline on active point */}
          <line
            x1={activeX}
            y1={paddingTop}
            x2={activeX}
            y2={paddingTop + chartH}
            stroke="#8E2424"
            strokeWidth="1.2"
            strokeDasharray="3,3"
            opacity="0.4"
          />

          {/* X Axis Labels & Interactive trigger points */}
          {data.map((d, idx) => {
            const x = getX(idx);
            const y = getY(d.actual);
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={d.month}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
              >
                {/* Invisible large hit area */}
                <rect
                  x={x - 20}
                  y={paddingTop}
                  width={40}
                  height={chartH + paddingBottom}
                  fill="transparent"
                />

                {/* Data point dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? "5" : "3.5"}
                  fill="#FFFFFF"
                  stroke="#8E2424"
                  strokeWidth={isHovered ? "3" : "2"}
                  className="transition-all duration-200"
                />

                {/* X Axis Month Label */}
                <text
                  x={x}
                  y={paddingTop + chartH + 18}
                  textAnchor="middle"
                  className={`text-[11px] font-sans transition-colors ${
                    isHovered ? "fill-[#8E2424] font-bold" : "fill-slate-400 font-medium"
                  }`}
                >
                  {d.shortMonth}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Interactive Floating Tooltip (Inspired by Slide 04 AdminPro) */}
        <div
          className="absolute pointer-events-none transition-all duration-200"
          style={{
            left: `${(activeX / width) * 100}%`,
            top: `${(activeY / height) * 100}%`,
            transform: "translate(-50%, -125%)",
          }}
        >
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] text-center min-w-[120px] animate-in fade-in zoom-in-95">
            <span className="text-[10px] text-slate-400 font-medium block">
              {activeData.month} {year}
            </span>
            <div className="text-sm font-extrabold text-[#1C1F23] mt-0.5">
              {formatUSD(activeData.actual)}
            </div>
            <div className="mt-1 flex items-center justify-center gap-1">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeData.change.startsWith("+")
                    ? "bg-[#7BA238]/10 text-[#5e7c2b]"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {activeData.change} vs budget
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
