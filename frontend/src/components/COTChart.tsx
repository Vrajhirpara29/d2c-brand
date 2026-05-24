"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from "recharts";

interface COTRecord {
  date: string;
  long_contracts: number;
  short_contracts: number;
  net_position: number;
  asset_price: number;
}

interface COTChartProps {
  data: COTRecord[];
  assetCode: string;
  assetName: string;
}

export default function COTChart({ data, assetCode, assetName }: COTChartProps) {
  const chartData = useMemo(() => {
    return data.map((record) => ({
      ...record,
      formattedDate: new Date(record.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "2-digit",
        timeZone: "UTC"
      }),
      short_neg: -record.short_contracts,
      long_contracts: record.long_contracts,
      net_position: record.net_position
    }));
  }, [data]);

  const formatPrice = (val: number) => {
    if (assetCode.includes("JPY")) return val.toFixed(2);
    if (assetCode === "GOLD" || assetCode === "WTI" || assetCode === "BRENT" || assetCode === "SILVER") return `$${val.toFixed(2)}`;
    if (assetCode === "NATURAL_GAS" || assetCode === "COPPER") return `$${val.toFixed(3)}`;
    return val.toFixed(4);
  };

  const formatContracts = (val: number) => {
    return Math.abs(val).toLocaleString();
  };

  if (!data || data.length === 0) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center border border-zinc-800/80 rounded-xl bg-zinc-950/10 glass-panel">
        <span className="text-xs font-semibold text-zinc-500 animate-pulse">Awaiting positioning data stream...</span>
      </div>
    );
  }

  const latest = data[data.length - 1];
  const previous = data.length > 1 ? data[data.length - 2] : latest;
  
  const netShift = latest.net_position - previous.net_position;
  const isNetLong = latest.net_position > 0;
  const isShiftPositive = netShift > 0;

  return (
    <div className="space-y-6">
      {/* Redesigned stat cards banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border border-white/[0.04] bg-white/[0.01] rounded-xl glass-panel relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
          <span className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Asset Price</span>
          <span className="text-xl font-bold tracking-tight text-white mt-1 block">{formatPrice(latest.asset_price)}</span>
        </div>
        
        <div className={`p-4 border border-white/[0.04] bg-white/[0.01] rounded-xl glass-panel relative overflow-hidden group`}>
          <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl transition-colors ${isNetLong ? "bg-emerald-500/5 group-hover:bg-emerald-500/10" : "bg-rose-500/5 group-hover:bg-rose-500/10"}`} />
          <span className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Institutional Net</span>
          <span className={`text-xl font-bold tracking-tight mt-1 block ${isNetLong ? "text-emerald-400 glow-text-emerald" : "text-rose-400 glow-text-rose"}`}>
            {latest.net_position > 0 ? "+" : ""}{latest.net_position.toLocaleString()}
          </span>
        </div>
        
        <div className="p-4 border border-white/[0.04] bg-white/[0.01] rounded-xl glass-panel relative overflow-hidden group">
          <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl ${isShiftPositive ? "bg-emerald-500/5" : "bg-rose-500/5"}`} />
          <span className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Weekly Shift</span>
          <span className={`text-xl font-bold tracking-tight mt-1 block ${isShiftPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {isShiftPositive ? "+" : ""}{netShift.toLocaleString()}
          </span>
        </div>
        
        <div className="p-4 border border-white/[0.04] bg-white/[0.01] rounded-xl glass-panel relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl" />
          <span className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Long / Short Ratio</span>
          <span className="text-xl font-bold tracking-tight text-zinc-300 mt-1 block">
            {((latest.long_contracts / (latest.long_contracts + latest.short_contracts)) * 100).toFixed(1)}% <span className="text-zinc-600 text-xs">/</span> {((latest.short_contracts / (latest.long_contracts + latest.short_contracts)) * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Synchronized Charts */}
      <div className="space-y-4">
        {/* CHART 1: Price line overlay */}
        <div className="p-4 border border-white/[0.03] bg-zinc-950/20 glass-panel">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Asset Price Progression</span>
            <span className="text-[9px] px-2 py-0.5 border border-zinc-800/80 rounded-md text-zinc-500 bg-zinc-950/50 font-semibold font-mono">NODE_PR_HIST</span>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} syncId="cot-sync" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.02)" />
                <XAxis dataKey="formattedDate" stroke="#52525b" fontSize={9} tickLine={false} />
                <YAxis 
                  domain={["auto", "auto"]} 
                  stroke="#52525b" 
                  fontSize={9} 
                  orientation="right"
                  tickLine={false}
                  tickFormatter={(val) => val.toFixed(assetCode.includes("JPY") || assetCode === "GOLD" ? 0 : 3)}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(10, 10, 12, 0.95)", borderColor: "rgba(255,255,255,0.06)", borderRadius: "8px", backdropFilter: "blur(8px)" }}
                  labelStyle={{ color: "#a1a1aa", fontSize: "10px", fontWeight: "bold" }}
                  itemStyle={{ fontSize: "11px", color: "#f4f4f5" }}
                  formatter={(value: any) => [formatPrice(Number(value)), "Price"]}
                />
                <Area type="monotone" dataKey="asset_price" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#colorPrice)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: COT allocations (long vs short) */}
        <div className="p-4 border border-white/[0.03] bg-zinc-950/20 glass-panel">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">COT Institutional Allocations (Non-Commercial Speculators)</span>
            <div className="flex items-center gap-3 text-[9px] font-bold">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Longs</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-rose-500 rounded-full"></span> Shorts</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-blue-400"></span> Net Position</span>
            </div>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} syncId="cot-sync" margin={{ top: 10, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.02)" />
                <XAxis dataKey="formattedDate" stroke="#52525b" fontSize={9} tickLine={false} />
                <YAxis 
                  stroke="#52525b" 
                  fontSize={9} 
                  tickLine={false}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(10, 10, 12, 0.95)", borderColor: "rgba(255,255,255,0.06)", borderRadius: "8px", backdropFilter: "blur(8px)" }}
                  labelStyle={{ color: "#a1a1aa", fontSize: "10px", fontWeight: "bold" }}
                  itemStyle={{ fontSize: "11px" }}
                  formatter={(value: any, name: any) => {
                    const cleanName = name === "long_contracts" ? "Longs" : name === "short_neg" ? "Shorts" : "Net Contracts";
                    const cleanVal = formatContracts(Number(value));
                    const color = name === "long_contracts" ? "#10b981" : name === "short_neg" ? "#ef4444" : "#3b82f6";
                    return [<span style={{ color }}>{cleanVal}</span>, cleanName];
                  }}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                {/* Longs */}
                <Bar dataKey="long_contracts" fill="#10b981" stackId="stack" barSize={10} fillOpacity={0.8} radius={[2, 2, 0, 0]} />
                {/* Shorts */}
                <Bar dataKey="short_neg" fill="#f43f5e" stackId="stack" barSize={10} fillOpacity={0.8} radius={[0, 0, 2, 2]} />
                {/* Net */}
                <Line type="monotone" dataKey="net_position" stroke="#3b82f6" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
