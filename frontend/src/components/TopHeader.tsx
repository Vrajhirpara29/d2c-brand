import React, { useState } from "react";
import { 
  Activity, 
  ChevronDown, 
  Circle,
  Database,
  TrendingUp,
  Percent,
  Sliders,
  DollarSign
} from "lucide-react";

interface TopHeaderProps {
  stats: {
    avgDelay: number;
    successRate: number;
    totalProfit: number;
    dailyGain: number;
    drawdown: number;
  };
}

export default function TopHeader({ stats }: TopHeaderProps) {
  const [selectedAccount, setSelectedAccount] = useState("MT5 Master - #294821");
  const [showDropdown, setShowDropdown] = useState(false);

  const accounts = [
    "MT5 Master - #294821",
    "FTMO Challenge - #108520",
    "IC Markets Live - #592833",
    "PropFirm Demo - #492811"
  ];

  return (
    <header className="bg-[#0b0c10]/80 backdrop-blur-md border-b border-[#1a1d26] h-16 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Account Selector Section */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-[#1a1d26] bg-[#12141a]/40 text-xs text-zinc-300 font-semibold cursor-pointer hover:bg-zinc-900/60 transition-all select-none"
          >
            <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400 animate-pulse" />
            <span>{selectedAccount}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          </button>
          
          {showDropdown && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute left-0 mt-1.5 w-56 rounded-xl border border-[#1a1d26] bg-[#0c0d12] shadow-2xl p-1 z-20">
                {accounts.map((acc) => (
                  <button
                    key={acc}
                    onClick={() => {
                      setSelectedAccount(acc);
                      setShowDropdown(false);
                    }}
                    className={`w-full text-left text-[11px] font-medium px-3 py-2 rounded-lg cursor-pointer ${
                      selectedAccount === acc
                        ? "bg-emerald-500/5 text-emerald-400 font-bold"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40"
                    }`}
                  >
                    {acc}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Live sync badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/5 border border-emerald-500/10 text-[9px] font-black uppercase tracking-wider text-emerald-400">
          <Database className="w-3 h-3" />
          <span>SYNCED (T+3S)</span>
        </div>
      </div>

      {/* KPI Tiles Row (Desktop only) */}
      <div className="hidden lg:flex items-center gap-5">
        {/* Metric 1 */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center">
            <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div>
            <span className="block text-[8px] text-zinc-500 font-black uppercase tracking-wider">NET PROFIT</span>
            <span className="text-xs font-extrabold text-zinc-200">${stats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="w-[1px] h-6 bg-[#1a1d26]" />

        {/* Metric 2 */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center">
            <Percent className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <span className="block text-[8px] text-zinc-500 font-black uppercase tracking-wider">WIN RATE</span>
            <span className="text-xs font-extrabold text-emerald-400">{stats.successRate}%</span>
          </div>
        </div>

        <div className="w-[1px] h-6 bg-[#1a1d26]" />

        {/* Metric 3 */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/5 border border-amber-500/10 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <span className="block text-[8px] text-zinc-500 font-black uppercase tracking-wider">DAILY GAIN</span>
            <span className="text-xs font-extrabold text-zinc-200">+{stats.dailyGain}%</span>
          </div>
        </div>

        <div className="w-[1px] h-6 bg-[#1a1d26]" />

        {/* Metric 4 */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/5 border border-rose-500/10 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div>
            <span className="block text-[8px] text-zinc-500 font-black uppercase tracking-wider">LATENCY</span>
            <span className="text-xs font-extrabold text-zinc-200">{stats.avgDelay}ms</span>
          </div>
        </div>
      </div>

      {/* Right End Section */}
      <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
          <span className="text-[10px] text-zinc-400 uppercase tracking-widest hidden md:inline">SYSTEM RUNNING</span>
        </div>
      </div>
    </header>
  );
}
