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
import { TrendingUp, Activity, BarChart2, ShieldAlert } from "lucide-react";

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
      <div className="h-[400px] flex flex-col items-center justify-center border border-[#1a1d26] rounded-2xl bg-[#0c0d12]/40 backdrop-blur-md">
        <span className="text-xs font-semibold text-zinc-500 animate-pulse uppercase tracking-widest">Awaiting Positioning Telemetry Data...</span>
      </div>
    );
  }

  const latest = data[data.length - 1];
  const previous = data.length > 1 ? data[data.length - 2] : latest;
  
  const netShift = latest.net_position - previous.net_position;
  const isNetLong = latest.net_position > 0;
  const isShiftPositive = netShift > 0;

  const longRatio = latest.long_contracts / (latest.long_contracts + latest.short_contracts);
  const shortRatio = 1 - longRatio;
  
  return (
    <div className="space-y-6">
      {/* Telemetry STAT Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Asset Price */}
        <div className="p-4 bg-[#0c0d12]/40 border border-[#1b2742]/40 rounded-2xl relative overflow-hidden group card-tilt-hover hud-node-border">
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-blue-500/10 rounded-full blur-lg group-hover:bg-blue-500/20 transition-all duration-500" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-zinc-550 font-bold uppercase tracking-widest text-[8px]">
              <Activity className="w-3.5 h-3.5 text-[#00f0ff] animate-pulse" />
              <span>Spot Rate</span>
            </div>
            <span className="text-[7px] text-[#00f0ff] bg-[#00f0ff]/10 px-1 py-0.5 rounded font-black tracking-wider uppercase">Live Feed</span>
          </div>
          <div className="flex items-baseline justify-between mt-3.5">
            <span className="text-xl font-black font-mono tracking-tight text-white glow-text-blue">{formatPrice(latest.asset_price)}</span>
            
            {/* Radar Wave SVG */}
            <svg className="w-8 h-5 text-blue-500/40" viewBox="0 0 40 20">
              <path d="M0,10 Q5,0 10,10 T20,10 T30,10 T40,10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="100" strokeDashoffset="0" className="animate-float" />
            </svg>
          </div>
        </div>
        
        {/* Net Speculator Positions */}
        <div className="p-4 bg-[#0c0d12]/40 border border-[#1b2742]/40 rounded-2xl relative overflow-hidden group card-tilt-hover hud-node-border">
          <div className={`absolute -top-4 -right-4 w-12 h-12 rounded-full blur-lg transition-all duration-500 ${isNetLong ? "bg-emerald-500/10 group-hover:bg-emerald-500/20" : "bg-rose-500/10 group-hover:bg-rose-500/20"}`} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-zinc-550 font-bold uppercase tracking-widest text-[8px]">
              <TrendingUp className={`w-3.5 h-3.5 ${isNetLong ? "text-[#00ff88]" : "text-[#ff0055]"}`} />
              <span>Net Position</span>
            </div>
            <span className={`text-[7px] px-1 py-0.5 rounded font-black tracking-wider uppercase ${isNetLong ? "text-[#00ff88] bg-[#00ff88]/10" : "text-[#ff0055] bg-[#ff0055]/10"}`}>
              {isNetLong ? "LONG" : "SHORT"}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-3.5">
            <span className={`text-xl font-black font-mono tracking-tight ${isNetLong ? "text-[#00ff88] glow-text-emerald" : "text-[#ff0055] glow-text-rose"}`}>
              {latest.net_position > 0 ? "+" : ""}{latest.net_position.toLocaleString()}
            </span>
            
            {/* Up/Down Arrow SVG */}
            <svg className={`w-5 h-5 ${isNetLong ? "text-[#00ff88]" : "text-[#ff0055]"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              {isNetLong ? (
                <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </div>
        </div>
        
        {/* Weekly Volume Shift */}
        <div className="p-4 bg-[#0c0d12]/40 border border-[#1b2742]/40 rounded-2xl relative overflow-hidden group card-tilt-hover hud-node-border">
          <div className={`absolute -top-4 -right-4 w-12 h-12 rounded-full blur-lg ${isShiftPositive ? "bg-emerald-500/10" : "bg-rose-500/10"}`} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-zinc-550 font-bold uppercase tracking-widest text-[8px]">
              <BarChart2 className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span>Weekly Shift</span>
            </div>
            <span className="text-[7px] text-[#00f0ff] bg-[#00f0ff]/10 px-1 py-0.5 rounded font-black tracking-wider uppercase">Volume Δ</span>
          </div>
          <div className="flex items-baseline justify-between mt-3.5">
            <span className={`text-xl font-black font-mono tracking-tight ${isShiftPositive ? "text-[#00ff88]" : "text-[#ff0055]"}`}>
              {isShiftPositive ? "+" : ""}{netShift.toLocaleString()}
            </span>
            
            {/* Level Bars Indicator SVG */}
            <div className="flex items-end gap-0.5 h-4 mb-1">
              <div className={`w-[3px] h-1.5 rounded-sm ${isShiftPositive ? "bg-[#00ff88]" : "bg-[#ff0055]"}`} />
              <div className={`w-[3px] h-3 rounded-sm ${isShiftPositive ? "bg-[#00ff88]" : "bg-[#ff0055]"}`} />
              <div className={`w-[3px] h-4 rounded-sm ${isShiftPositive ? "bg-[#00ff88]" : "bg-[#ff0055]"}`} />
            </div>
          </div>
        </div>
        
        {/* Long / Short Speculator Ratio Donut */}
        <div className="p-4 bg-[#0c0d12]/40 border border-[#1b2742]/40 rounded-2xl relative overflow-hidden group card-tilt-hover hud-node-border">
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-blue-500/10 rounded-full blur-lg" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-zinc-550 font-bold uppercase tracking-widest text-[8px]">
              <ShieldAlert className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span>Speculator Ratio</span>
            </div>
            <span className="text-[7px] text-[#00ff88] bg-[#00ff88]/10 px-1 py-0.5 rounded font-black tracking-wider uppercase">L / S</span>
          </div>
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-[13px] font-black tracking-tight text-zinc-200 font-mono">
              <span className="text-[#00ff88]">{(longRatio * 100).toFixed(0)}%</span>
              <span className="text-zinc-600 mx-1">/</span>
              <span className="text-[#ff0055]">{(shortRatio * 100).toFixed(0)}%</span>
            </span>
            
            {/* Mini Donut Gauge SVG */}
            <svg className="w-7 h-7 transform -rotate-90" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="12" fill="transparent" stroke="rgba(255,23,68,0.3)" strokeWidth="4" />
              <circle 
                cx="16" cy="16" r="12" 
                fill="transparent" 
                stroke="#00ff88" 
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 12}`}
                strokeDashoffset={`${2 * Math.PI * 12 * (1 - longRatio)}`}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Modern High-Performance Telemetry Charts */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Price Progression Chart */}
        <div className="p-5 bg-[#0c0d12]/30 border border-[#1b2742]/40 rounded-2xl relative overflow-hidden laser-scan-container">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[9px] uppercase font-black text-zinc-400 tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-pulse" /> Rate Progression Chart
            </span>
            <span className="text-[8px] px-2 py-0.5 border border-[#1b2742]/40 rounded text-zinc-500 bg-[#0c0d12]/80 font-black tracking-wider uppercase">TELEMETRY_PR_HIST</span>
          </div>
          
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} syncId="cot-sync" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.02)" />
                <XAxis dataKey="formattedDate" stroke="#1f2937" fontSize={8} tickLine={false} />
                <YAxis 
                  domain={["auto", "auto"]} 
                  stroke="#1f2937" 
                  fontSize={8} 
                  orientation="right"
                  tickLine={false}
                  tickFormatter={(val) => val.toFixed(assetCode.includes("JPY") || assetCode === "GOLD" ? 0 : 3)}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(5, 8, 16, 0.95)", borderColor: "rgba(0, 240, 255, 0.2)", borderRadius: "12px", backdropFilter: "blur(16px)" }}
                  labelStyle={{ color: "#9ca3af", fontSize: "9px", fontWeight: "bold" }}
                  itemStyle={{ fontSize: "10.5px", color: "#00f0ff" }}
                  formatter={(value: any) => [formatPrice(Number(value)), "Rate"]}
                />
                <Area type="monotone" dataKey="asset_price" stroke="#00f0ff" strokeWidth={1.8} fillOpacity={1} fill="url(#colorPrice)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Speculator Volume allocations */}
        <div className="p-5 bg-[#0c0d12]/30 border border-[#1b2742]/40 rounded-2xl relative overflow-hidden laser-scan-container">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <span className="text-[9px] uppercase font-black text-zinc-400 tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse" /> Institutional Allocations (Speculator Contracts)
            </span>
            <div className="flex items-center gap-4 text-[8px] font-black uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#00ff88]/20 border border-[#00ff88] rounded"></span> Longs</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#ff0055]/20 border border-[#ff0055] rounded"></span> Shorts</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-0.5 bg-[#00f0ff]"></span> Net Position</span>
            </div>
          </div>
          
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} syncId="cot-sync" margin={{ top: 10, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.02)" />
                <XAxis dataKey="formattedDate" stroke="#1f2937" fontSize={8} tickLine={false} />
                <YAxis 
                  stroke="#1f2937" 
                  fontSize={8} 
                  tickLine={false}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(5, 8, 16, 0.95)", borderColor: "rgba(59, 130, 246, 0.2)", borderRadius: "12px", backdropFilter: "blur(16px)" }}
                  labelStyle={{ color: "#9ca3af", fontSize: "9px", fontWeight: "bold" }}
                  itemStyle={{ fontSize: "10.5px" }}
                  formatter={(value: any, name: any) => {
                    const cleanName = name === "long_contracts" ? "Long Allocations" : name === "short_neg" ? "Short Allocations" : "Net Contracts";
                    const cleanVal = formatContracts(Number(value));
                    const color = name === "long_contracts" ? "#00ff88" : name === "short_neg" ? "#ff0055" : "#00f0ff";
                    return [<span style={{ color }} className="font-mono">{cleanVal}</span>, cleanName];
                  }}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
                {/* Longs */}
                <Bar dataKey="long_contracts" fill="#00ff88" stackId="stack" barSize={10} fillOpacity={0.4} stroke="#00ff88" strokeWidth={1} radius={[2, 2, 0, 0]} />
                {/* Shorts */}
                <Bar dataKey="short_neg" fill="#ff0055" stackId="stack" barSize={10} fillOpacity={0.4} stroke="#ff0055" strokeWidth={1} radius={[0, 0, 2, 2]} />
                {/* Net Position */}
                <Line type="monotone" dataKey="net_position" stroke="#00f0ff" strokeWidth={1.8} dot={false} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
