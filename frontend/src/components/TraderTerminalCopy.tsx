"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Zap, 
  Settings, 
  Layers, 
  Terminal as TerminalIcon, 
  CheckCircle, 
  TrendingUp, 
  RefreshCw, 
  AlertTriangle,
  Server,
  Link2,
  Sliders,
  DollarSign
} from "lucide-react";

interface Account {
  account_number: number;
  name: string;
  broker: string;
  type: string;
  equity: number;
  balance: number;
  status: string;
}

interface Trade {
  id: number;
  ticket: number;
  symbol: string;
  type: string;
  volume: number;
  open_price: number;
  close_price: number | null;
  profit: number | null;
  execution_delay_ms: number;
  status: string;
  timestamp: string;
}

interface Log {
  id: number;
  timestamp: string;
  message: string;
  level: string;
}

export default function TraderTerminalCopy() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState({
    avg_delay: 28,
    success_rate: 99.98,
    total_profit: 650.00,
    daily_gain: 1.15,
    drawdown: 2.41
  });
  
  // Copier Settings state
  const [copierActive, setCopierActive] = useState(true);
  const [lotMultiplier, setLotMultiplier] = useState(1.0);
  const [maxSlippage, setMaxSlippage] = useState(3.0);
  const [copySlTp, setCopySlTp] = useState(true);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isForcingTrade, setIsForcingTrade] = useState(false);
  const [activePulseIndices, setActivePulseIndices] = useState<number[]>([]);

  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Fetch accounts, trades, logs, stats, and settings
  const fetchAllData = async () => {
    try {
      const headers = { "bypass-tunnel-reminder": "true" };
      
      const accountsRes = await fetch(`${API_BASE_URL}/api/copier/accounts`, { headers });
      if (accountsRes.ok) setAccounts(await accountsRes.ok ? await accountsRes.json() : []);
      
      const tradesRes = await fetch(`${API_BASE_URL}/api/copier/trades`, { headers });
      if (tradesRes.ok) setTrades(await tradesRes.json());
      
      const logsRes = await fetch(`${API_BASE_URL}/api/copier/logs`, { headers });
      if (logsRes.ok) setLogs(await logsRes.json());
      
      const statsRes = await fetch(`${API_BASE_URL}/api/copier/stats`, { headers });
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error("Failed to load copy trading data", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/copier/settings`, {
        headers: { "bypass-tunnel-reminder": "true" }
      });
      if (res.ok) {
        const data = await res.json();
        setCopierActive(data.is_active);
        setLotMultiplier(data.lot_multiplier);
        setMaxSlippage(data.max_slippage);
        setCopySlTp(data.copy_sl_tp);
      }
    } catch (err) {
      console.error("Failed to load copier settings", err);
    }
  };

  // Initial load and periodic polling
  useEffect(() => {
    fetchSettings();
    fetchAllData();
    
    // Poll every 4 seconds to catch background simulated trade events
    const interval = setInterval(fetchAllData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Scroll terminal logs to bottom when updated
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Trigger copy network pulses when a new trade is logged
  useEffect(() => {
    if (trades.length > 0 && trades[0].status === "OPEN") {
      // Trigger animations for follower indexes (0, 1, 2 representing Followers)
      setActivePulseIndices([0, 1, 2]);
      const timer = setTimeout(() => {
        setActivePulseIndices([]);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [trades]);

  // Update Settings handler
  const saveSettings = async (updates: { is_active?: boolean; mult?: number; slip?: number; sl_tp?: boolean }) => {
    setIsUpdatingSettings(true);
    
    const active = updates.is_active !== undefined ? updates.is_active : copierActive;
    const mult = updates.mult !== undefined ? updates.mult : lotMultiplier;
    const slip = updates.slip !== undefined ? updates.slip : maxSlippage;
    const sl_tp = updates.sl_tp !== undefined ? updates.sl_tp : copySlTp;

    try {
      const res = await fetch(`${API_BASE_URL}/api/copier/settings`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "bypass-tunnel-reminder": "true" 
        },
        body: JSON.stringify({
          lot_multiplier: mult,
          max_slippage: slip,
          copy_sl_tp: sl_tp,
          is_active: active
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCopierActive(data.is_active);
        setLotMultiplier(data.lot_multiplier);
        setMaxSlippage(data.max_slippage);
        setCopySlTp(data.copy_sl_tp);
      }
    } catch (err) {
      console.error("Failed to update settings", err);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  // Force Simulate Copy Order handler
  const handleForceSimulateTrade = async () => {
    if (isForcingTrade) return;
    setIsForcingTrade(true);
    
    // Trigger local animation immediately
    setActivePulseIndices([0, 1, 2]);
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/copier/simulate-trade`, {
        method: "POST",
        headers: { "bypass-tunnel-reminder": "true" }
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error("Failed to force simulated copy-trade", err);
    } finally {
      setIsForcingTrade(false);
      setTimeout(() => setActivePulseIndices([]), 2000);
    }
  };

  // Separating accounts: Provider vs Followers
  const provider = accounts.find(a => a.type === "PROVIDER") || {
    account_number: 892015, name: "Aggressive Alpha HFT", broker: "IC Markets", equity: 85241.50, balance: 85000.00, status: "CONNECTED"
  };
  const followers = accounts.filter(a => a.type === "FOLLOWER");

  // Default follower values in case DB is still loading
  const defaultFollowers = [
    { account_number: 509214, name: "Follower Retail-01", broker: "Pepperstone", equity: 12410.80, status: "SYNCING", delay: "28ms" },
    { account_number: 304891, name: "Follower High-Net-Worth", broker: "Vantage FX", equity: 450215.10, status: "CONNECTED", delay: "24ms" },
    { account_number: 709142, name: "Follower Risk-Controlled", broker: "FP Markets", equity: 5124.90, status: "CONNECTED", delay: "32ms" }
  ];

  return (
    <div className="relative z-10 w-full max-w-[1300px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 animate-slide-up">
      
      {/* LEFT COLUMN: Node Connection Map & Copier Control Console */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* STATS KPIs GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          
          <div className="p-4 border border-white/[0.04] bg-white/[0.01] rounded-xl glass-panel relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors" />
            <span className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Execution Speed</span>
            <span className="text-xl font-bold tracking-tight text-emerald-400 glow-text-emerald mt-1 block">
              {stats.avg_delay}ms
            </span>
            <span className="text-[8px] text-zinc-600 block mt-0.5">Average Copy Latency</span>
          </div>

          <div className="p-4 border border-white/[0.04] bg-white/[0.01] rounded-xl glass-panel relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors" />
            <span className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Success Rate</span>
            <span className="text-xl font-bold tracking-tight text-emerald-400 glow-text-emerald mt-1 block">
              {stats.success_rate.toFixed(2)}%
            </span>
            <span className="text-[8px] text-zinc-600 block mt-0.5">Replication Accuracy</span>
          </div>

          <div className="p-4 border border-white/[0.04] bg-white/[0.01] rounded-xl glass-panel relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-colors" />
            <span className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Follower P&L</span>
            <span className={`text-xl font-bold tracking-tight mt-1 block ${stats.total_profit >= 0 ? "text-emerald-400 glow-text-emerald" : "text-rose-400 glow-text-rose"}`}>
              ${stats.total_profit.toLocaleString()}
            </span>
            <span className="text-[8px] text-zinc-600 block mt-0.5">Net Copied Profit</span>
          </div>

          <div className="p-4 border border-white/[0.04] bg-white/[0.01] rounded-xl glass-panel relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl" />
            <span className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Daily Gain</span>
            <span className="text-xl font-bold tracking-tight text-indigo-400 mt-1 block">
              +{stats.daily_gain.toFixed(2)}%
            </span>
            <span className="text-[8px] text-zinc-600 block mt-0.5">Max Drawdown: {stats.drawdown}%</span>
          </div>

        </div>

        {/* 1. NODE CONNECTION NETWORK MAP */}
        <div className="p-5 border border-white/[0.04] bg-white/[0.01] rounded-xl glass-panel relative overflow-hidden flex flex-col items-center justify-center min-h-[380px]">
          
          <div className="absolute top-4 left-5 flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Replication Topology Map</span>
          </div>

          {/* SVG Connection Paths Overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: "380px" }}>
            {/* Connection Line 1: Provider -> Follower 1 (Top) */}
            <path d="M 270,190 L 510,90" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="2" fill="none" />
            {/* Connection Line 2: Provider -> Follower 2 (Middle) */}
            <path d="M 270,190 L 510,190" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="2" fill="none" />
            {/* Connection Line 3: Provider -> Follower 3 (Bottom) */}
            <path d="M 270,190 L 510,290" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="2" fill="none" />

            {/* Glowing signal pulses flowing down the lines */}
            {activePulseIndices.includes(0) && (
              <circle r="4" fill="#10b981" className="shadow-[0_0_10px_#10b981]">
                <animateMotion dur="0.8s" repeatCount="indefinite" path="M 270,190 L 510,90" />
              </circle>
            )}
            {activePulseIndices.includes(1) && (
              <circle r="4" fill="#10b981" className="shadow-[0_0_10px_#10b981]">
                <animateMotion dur="0.8s" repeatCount="indefinite" path="M 270,190 L 510,190" />
              </circle>
            )}
            {activePulseIndices.includes(2) && (
              <circle r="4" fill="#10b981" className="shadow-[0_0_10px_#10b981]">
                <animateMotion dur="0.8s" repeatCount="indefinite" path="M 270,190 L 510,290" />
              </circle>
            )}
          </svg>

          {/* Grid Layout of node items */}
          <div className="relative w-full grid grid-cols-12 items-center min-h-[320px] pt-8">
            
            {/* Column 1: Provider Node */}
            <div className="col-span-5 flex justify-center">
              <div className="w-full max-w-[210px] p-4 border border-indigo-500/35 bg-indigo-500/[0.03] rounded-2xl relative shadow-[0_0_20px_rgba(99,102,241,0.06)] group hover:scale-[1.02] transition-transform duration-300">
                <div className="absolute top-2 right-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                  <span className="text-[8px] text-indigo-400 font-extrabold uppercase">PROVIDER</span>
                </div>
                
                <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">{provider.broker}</span>
                <h4 className="text-xs font-black text-white mt-0.5 truncate">{provider.name}</h4>
                <div className="h-px bg-zinc-900 my-2.5" />
                
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Account:</span>
                    <span className="text-zinc-300 font-bold">{provider.account_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Equity:</span>
                    <span className="text-emerald-400 font-bold font-mono">${provider.equity.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Center gap with pulse stats indicator */}
            <div className="col-span-2 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-8 h-8 rounded-full bg-zinc-950/60 border border-zinc-900 flex items-center justify-center relative">
                <Link2 className="w-4 h-4 text-zinc-500" />
                {activePulseIndices.length > 0 && (
                  <span className="absolute inset-0 rounded-full border border-emerald-500/60 animate-ping" />
                )}
              </div>
              <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest block">COPIER ENGINE</span>
            </div>

            {/* Column 3: Follower Nodes Stack */}
            <div className="col-span-5 flex flex-col space-y-3.5 pl-6">
              {(followers.length > 0 ? followers : defaultFollowers).map((fol, idx) => {
                const isSyncing = fol.status === "SYNCING";
                const borderStyles = isSyncing 
                  ? "border-amber-500/20 bg-amber-500/[0.01]" 
                  : "border-zinc-900 bg-zinc-950/20 hover:border-zinc-800";
                
                const statusColor = isSyncing ? "text-amber-500" : "text-emerald-500";
                const delayMs = (fol as any).delay || `${stats.avg_delay + idx * 4}ms`;

                return (
                  <div 
                    key={fol.account_number}
                    className={`p-3 border rounded-xl flex items-center justify-between text-left relative group hover:scale-[1.01] transition-transform duration-300 max-w-[240px] ${borderStyles}`}
                  >
                    <div>
                      <span className="block text-[8px] text-zinc-500 font-semibold">{fol.broker}</span>
                      <h5 className="text-[11px] font-bold text-zinc-200 truncate max-w-[140px]">{fol.name}</h5>
                      <span className="text-[9px] font-mono text-zinc-500 mt-1 block">#{fol.account_number}</span>
                    </div>

                    <div className="text-right space-y-1.5 flex-shrink-0">
                      <span className={`text-[8px] font-black uppercase tracking-wider block ${statusColor}`}>
                        {fol.status}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-zinc-400 bg-zinc-950/60 border border-zinc-900/80 px-2 py-0.5 rounded block">
                        +{delayMs}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* 2. TERMINAL LOGS CONSOLE */}
        <div className="p-5 border border-white/[0.04] bg-white/[0.01] rounded-xl glass-panel relative overflow-hidden flex flex-col space-y-3">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Terminal Audit Log Stream</span>
            </div>
            
            <span className="text-[9px] px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-bold uppercase tracking-wider">
              SYS ONLINE
            </span>
          </div>

          <div className="h-[210px] overflow-y-auto p-4 border border-zinc-900/80 bg-zinc-950/80 rounded-xl font-mono text-[10px] space-y-2 select-text scrollbar-thin">
            {logs.length === 0 ? (
              <div className="text-zinc-700 italic">No events logged. Start the copier system to generate streams.</div>
            ) : (
              logs.map((log) => {
                let levelColor = "text-zinc-500";
                if (log.level === "SUCCESS") levelColor = "text-emerald-400";
                else if (log.level === "WARNING") levelColor = "text-rose-400 font-semibold";
                else if (log.level === "INFO") levelColor = "text-zinc-300";

                const formattedTime = new Date(log.timestamp).toLocaleTimeString("en-US", { hour12: false });

                return (
                  <div key={log.id} className="flex gap-2.5 leading-relaxed items-start">
                    <span className="text-zinc-600 flex-shrink-0 select-none">[{formattedTime}]</span>
                    <span className={levelColor}>{log.message}</span>
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Copier Active Trades, History & Settings */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* 1. COPIER SETTINGS CONFIGURATOR */}
        <div className="p-5 border border-indigo-500/15 bg-white/[0.01] rounded-xl glass-panel relative overflow-hidden space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Copier Settings</span>
          </div>

          <div className="space-y-4 text-xs">
            
            {/* System active switch */}
            <div className="flex items-center justify-between p-3 border border-zinc-900 bg-zinc-950/20 rounded-xl">
              <div>
                <span className="block font-bold text-zinc-200">Replication Engine</span>
                <span className="block text-[8px] text-zinc-500">Enable or pause copied operations</span>
              </div>
              <button
                onClick={() => saveSettings({ is_active: !copierActive })}
                disabled={isUpdatingSettings}
                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 cursor-pointer ${
                  copierActive ? "bg-emerald-500" : "bg-zinc-800"
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                  copierActive ? "translate-x-6" : "translate-x-0"
                }`} />
              </button>
            </div>

            {/* Lot Multiplier Slider */}
            <div className="space-y-2">
              <div className="flex justify-between font-semibold">
                <span className="text-zinc-400">Lot Multiplier</span>
                <span className="text-white font-mono">{lotMultiplier.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={lotMultiplier}
                onChange={(e) => setLotMultiplier(parseFloat(e.target.value))}
                onMouseUp={() => saveSettings({ mult: lotMultiplier })}
                onTouchEnd={() => saveSettings({ mult: lotMultiplier })}
                className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-[8px] text-zinc-500 leading-none block">
                Calculates follower trade lots (Provider Lot × Multiplier)
              </span>
            </div>

            {/* Max Slippage */}
            <div className="space-y-2">
              <div className="flex justify-between font-semibold">
                <span className="text-zinc-400">Max Slippage Tolerance</span>
                <span className="text-white font-mono">{maxSlippage.toFixed(1)} Pips</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="10.0"
                step="0.5"
                value={maxSlippage}
                onChange={(e) => setMaxSlippage(parseFloat(e.target.value))}
                onMouseUp={() => saveSettings({ slip: maxSlippage })}
                onTouchEnd={() => saveSettings({ slip: maxSlippage })}
                className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-[8px] text-zinc-500 leading-none block">
                Rejects follower order if slippage exceeds pips limit
              </span>
            </div>

            {/* Copy SL / TP checkbox */}
            <div className="flex items-center justify-between py-1">
              <div>
                <span className="block font-bold text-zinc-300">Synchronize SL / TP</span>
                <span className="block text-[8px] text-zinc-500">Replicates provider target stops</span>
              </div>
              <input
                type="checkbox"
                checked={copySlTp}
                onChange={(e) => saveSettings({ sl_tp: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-900 bg-zinc-950 text-indigo-500 focus:ring-indigo-500 focus:ring-opacity-50 cursor-pointer"
              />
            </div>

            <button
              onClick={handleForceSimulateTrade}
              disabled={isForcingTrade || !copierActive}
              className="w-full py-3 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/35 text-indigo-400 hover:border-indigo-500/50 hover:text-indigo-300 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all duration-300 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isForcingTrade ? "animate-spin" : ""}`} />
              {isForcingTrade ? "Executing Copy..." : "Force Copy Order"}
            </button>

          </div>
        </div>

        {/* 2. COPIED TRADES LIST (ACTIVE & CLOSED) */}
        <div className="p-5 border border-white/[0.04] bg-white/[0.01] rounded-xl glass-panel relative overflow-hidden flex flex-col space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Live Copied Positions</span>
          </div>

          {/* Active Positions Stack */}
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1.5 scrollbar-thin">
            {trades.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-zinc-900 rounded-xl bg-zinc-950/10 text-zinc-600 text-[10px]">
                No active copied positions open.
              </div>
            ) : (
              trades.map((trade) => {
                const isBuy = trade.type === "BUY";
                const isOpen = trade.status === "OPEN";
                const profitNum = trade.profit || 0.00;
                
                return (
                  <div
                    key={trade.id}
                    className={`p-3 border rounded-xl flex flex-col space-y-2 relative transition-all duration-300 ${
                      isOpen 
                        ? "border-emerald-500/30 bg-emerald-500/[0.02]" 
                        : "border-zinc-900 bg-zinc-950/30 text-zinc-500"
                    }`}
                  >
                    <div className="flex justify-between items-center text-[9px] font-extrabold">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded font-black ${
                          isBuy 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          {trade.type}
                        </span>
                        <span className="text-zinc-200 font-extrabold">{trade.symbol}</span>
                        <span className="text-zinc-500 font-light">{trade.volume.toFixed(2)} Lot</span>
                      </div>
                      
                      <span className="font-mono text-zinc-500 font-bold">#{trade.ticket}</span>
                    </div>

                    <div className="flex justify-between items-center text-[10px]">
                      <div>
                        <span className="block text-zinc-500 text-[8px] uppercase font-bold leading-none mb-1">Open Price</span>
                        <span className="font-bold text-zinc-300 font-mono">{trade.open_price.toFixed(5)}</span>
                      </div>
                      
                      {!isOpen && (
                        <div>
                          <span className="block text-zinc-500 text-[8px] uppercase font-bold leading-none mb-1">Close Price</span>
                          <span className="font-bold text-zinc-300 font-mono">{trade.close_price?.toFixed(5)}</span>
                        </div>
                      )}

                      <div className="text-right">
                        <span className="block text-zinc-500 text-[8px] uppercase font-bold leading-none mb-1">Profit/Loss</span>
                        <span className={`font-black font-mono tracking-tight ${
                          profitNum >= 0 
                            ? "text-emerald-400 glow-text-emerald" 
                            : "text-rose-400 glow-text-rose"
                        }`}>
                          {profitNum >= 0 ? "+" : ""}${profitNum.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-zinc-900/60 text-[8px] text-zinc-500 uppercase tracking-widest font-bold">
                      <span className="flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 text-emerald-400" />
                        Delay: {trade.execution_delay_ms}ms
                      </span>
                      <span>{isOpen ? "ACTIVE SYNC" : "CLOSED ORDER"}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
