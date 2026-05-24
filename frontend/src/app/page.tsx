"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  TrendingUp, 
  Globe, 
  Terminal, 
  Activity, 
  Cpu,
  Zap
} from "lucide-react";
import TraderTerminal from "../components/TraderTerminal";
import TraderTerminalCopy from "../components/TraderTerminalCopy";
import COTChart from "../components/COTChart";
import ParticleBackground from "../components/ParticleBackground";

interface Asset {
  code: string;
  name: string;
  type: string;
}

interface COTRecord {
  date: string;
  long_contracts: number;
  short_contracts: number;
  net_position: number;
  asset_price: number;
}

interface NewsItem {
  id: number;
  timestamp: string;
  headline: string;
  summary?: string;
  source: string;
  asset_tags: string;
  impact_direction: string;
  volatility_4h: string;
  volatility_24h: string;
  confidence_score: number;
  impact_severity: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Dashboard() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>("GOLD");
  const [cotData, setCotData] = useState<COTRecord[]>([]);
  const [newsFeed, setNewsFeed] = useState<NewsItem[]>([]);
  const [assetFilter, setAssetFilter] = useState<"ALL" | "FOREX" | "COMMODITY">("ALL");
  const [currentView, setCurrentView] = useState<"COT" | "COPIER">("COT");


  const [customHeadline, setCustomHeadline] = useState("");
  const [adhocResult, setAdhocResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Live simulation & alerts generation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Latest prices cache for terminal Quotes Table
  const [latestPrices, setLatestPrices] = useState<Record<string, { price: number; change: number }>>({
    EURUSD: { price: 1.08425, change: 0.12 },
    GBPUSD: { price: 1.26312, change: -0.08 },
    USDJPY: { price: 156.84, change: 0.22 },
    AUDUSD: { price: 0.66321, change: -0.15 },
    USDCAD: { price: 1.36854, change: 0.05 },
    USDCHF: { price: 0.90241, change: -0.11 },
    GOLD: { price: 2154.32, change: 1.41 },
    SILVER: { price: 24.15, change: 0.85 },
    WTI: { price: 78.14, change: -2.10 },
    BRENT: { price: 82.35, change: -1.95 },
    NATURAL_GAS: { price: 2.542, change: 3.12 },
    COPPER: { price: 4.821, change: -0.45 }
  });

  // Sync COT data last recorded price into latestPrices state
  useEffect(() => {
    if (cotData && cotData.length > 0) {
      const latestRecord = cotData[cotData.length - 1];
      const prevRecord = cotData.length > 1 ? cotData[cotData.length - 2] : latestRecord;
      const pctChange = ((latestRecord.asset_price - prevRecord.asset_price) / prevRecord.asset_price) * 100;
      
      setLatestPrices(prev => ({
        ...prev,
        [selectedAsset]: {
          price: latestRecord.asset_price,
          change: pctChange || prev[selectedAsset]?.change || 0
        }
      }));
    }
  }, [cotData, selectedAsset]);

  // Handle single manual news generation
  const handleGenerateNews = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/news/generate`, {
        method: "POST"
      });
      if (res.ok) {
        await fetchNewsFeed(); // Refresh the feed
      }
    } catch (err) {
      console.error("Failed to generate live news event", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle live simulation
  useEffect(() => {
    if (isSimulating) {
      handleGenerateNews();
      simulationIntervalRef.current = setInterval(() => {
        handleGenerateNews();
      }, 7000);
    } else {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    }

    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, [isSimulating]);

  // Load static assets
  useEffect(() => {
    async function loadAssets() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/assets`, {
          headers: { "bypass-tunnel-reminder": "true" }
        });
        if (res.ok) {
          const data = await res.json();
          setAssets(data);
        }
      } catch (err) {
        console.error("Failed to load assets", err);
      }
    }
    loadAssets();
  }, []);

  // Fetch news feed
  const fetchNewsFeed = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/news`, {
        headers: { "bypass-tunnel-reminder": "true" }
      });
      if (res.ok) {
        const data = await res.json();
        setNewsFeed(data);
      }
    } catch (err) {
      console.error("Failed to fetch news feed", err);
    }
  };

  useEffect(() => {
    fetchNewsFeed();
  }, []);

  // Load COT positioning
  useEffect(() => {
    async function fetchCOT() {
      if (!selectedAsset) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/cot/${selectedAsset}`, {
          headers: { "bypass-tunnel-reminder": "true" }
        });
        if (res.ok) {
          const data = await res.json();
          setCotData(data);
        }
      } catch (err) {
        console.error(`Failed to fetch COT data for ${selectedAsset}`, err);
      }
    }
    fetchCOT();
  }, [selectedAsset]);

  // Run custom headline check
  const handleAnalyzeHeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customHeadline.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/news/impact-check`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "bypass-tunnel-reminder": "true"
        },
        body: JSON.stringify({ headline: customHeadline })
      });
      if (res.ok) {
        const data = await res.json();
        setAdhocResult(data);
      }
    } catch (err) {
      console.error("Failed to analyze custom headline", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredAssets = assets.filter(
    (a) => assetFilter === "ALL" || a.type === assetFilter
  );

  const selectedAssetObject = assets.find((a) => a.code === selectedAsset) || {
    code: selectedAsset,
    name: selectedAsset,
    type: "COMMODITY"
  };

  return (
    <main className="min-h-screen bg-[#030305] p-4 md:p-6 relative overflow-hidden">
      {/* Dynamic drifting canvas particles background */}
      <ParticleBackground />

      {/* Decorative background grid overlay */}
      <div className="grid-overlay" />

      {/* Header bar */}
      <header className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-6 pb-5 mb-8 border-b border-white/[0.04]">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 border border-emerald-500/20 bg-emerald-500/5 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.06)]">
            <Terminal className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-wider text-white uppercase flex items-center gap-2">
              GLOBAL MACRO EDGE 
              <span className="flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" /> LIVE CONNECTED
              </span>
            </h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 font-medium">
              Institutional Flow Dashboard & Copy Trading Terminals
            </p>
          </div>
        </div>

        {/* Center: View Switcher */}
        <div className="flex p-0.5 border border-zinc-850 rounded-xl bg-zinc-950/40 relative z-10">
          <button
            onClick={() => setCurrentView("COT")}
            className={`text-[9.5px] font-black tracking-widest px-4 py-2 rounded-lg transition-all duration-300 cursor-pointer ${
              currentView === "COT"
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_2px_12px_rgba(99,102,241,0.08)] font-black"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            INSTITUTIONAL FLOWS (COT)
          </button>
          <button
            onClick={() => setCurrentView("COPIER")}
            className={`text-[9.5px] font-black tracking-widest px-4 py-2 rounded-lg transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
              currentView === "COPIER"
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_2px_12px_rgba(99,102,241,0.08)] font-black"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> MT COPY TRADING
          </button>
        </div>
        
        {/* Right: System parameters */}
        <div className="flex items-center gap-6 text-[10px] text-zinc-400 font-semibold">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>SYS: <span className="text-emerald-400">OPERATIONAL</span></span>
          </div>
          <div className="h-3 w-[1px] bg-zinc-800" />
          <div>
            <span>REFRESH: <span className="text-zinc-200">REAL-TIME (T+7S)</span></span>
          </div>
          <div className="h-3 w-[1px] bg-zinc-800" />
          <div>
            <span>DATE: <span className="text-zinc-200">2026-05-24</span></span>
          </div>
        </div>
      </header>

      {/* Dynamic View rendering */}
      {currentView === "COT" ? (
        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column (Trader Terminal Device Screen) */}
        <section className="xl:col-span-5 flex justify-center xl:sticky xl:top-6">
          <TraderTerminal 
            assets={assets}
            selectedAsset={selectedAsset}
            onSelectAsset={setSelectedAsset}
            news={newsFeed}
            onTriggerAlert={handleGenerateNews}
            isSimulating={isSimulating}
            onToggleSimulation={() => setIsSimulating(!isSimulating)}
            isGenerating={isGenerating}
            latestPrices={latestPrices}
          />
        </section>

        {/* Right Column (Asset Selector, Charts, and AI Precedent Calculator) */}
        <section className="xl:col-span-7 space-y-6">
          {/* Asset selectors */}
          <div className="p-5 border border-white/[0.04] bg-white/[0.01] rounded-xl glass-panel">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-900 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Asset Directory
                </span>
              </div>
              
              {/* Directory Filter */}
              <div className="flex p-0.5 border border-zinc-850 rounded-lg bg-zinc-950/40">
                {(["ALL", "FOREX", "COMMODITY"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setAssetFilter(filter)}
                    className={`text-[9px] font-bold px-3 py-1 rounded-md transition-all cursor-pointer ${
                      assetFilter === filter
                        ? "bg-emerald-500/10 text-emerald-400 shadow-[0_2px_8px_rgba(16,185,129,0.05)]"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Directory buttons */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {filteredAssets.length === 0 ? (
                <div className="col-span-full py-4 text-center text-zinc-600 text-xs">
                  Loading assets...
                </div>
              ) : (
                filteredAssets.map((asset) => {
                  const isSelected = selectedAsset === asset.code;
                  return (
                    <button
                      key={asset.code}
                      onClick={() => setSelectedAsset(asset.code)}
                      className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all duration-300 text-center cursor-pointer ${
                        isSelected
                          ? "bg-emerald-500/5 border-emerald-500/35 text-emerald-400 font-bold shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                          : "border-white/[0.03] bg-zinc-950/10 text-zinc-500 hover:border-zinc-800 hover:text-zinc-300 hover:bg-zinc-950/20"
                      }`}
                    >
                      <span className="text-[11px] tracking-tight">{asset.name}</span>
                      <span className="text-[8px] uppercase text-zinc-600 mt-1 font-bold">{asset.code}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Synchronized Recharts positioning dashboard */}
          <div className="p-5 border border-white/[0.04] bg-white/[0.01] rounded-xl glass-panel">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Institutional Positioning: {selectedAssetObject.name} ({selectedAssetObject.code})
                </span>
              </div>
              <span className="text-[9px] px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full uppercase font-bold tracking-wider">
                {selectedAssetObject.type}
              </span>
            </div>

            <COTChart 
              data={cotData} 
              assetCode={selectedAssetObject.code} 
              assetName={selectedAssetObject.name} 
            />
          </div>

          {/* Ad-hoc Analyzer tool */}
          <div className="p-5 border border-white/[0.04] bg-white/[0.01] rounded-xl glass-panel relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                AI Precedent Impact Calculator
              </span>
            </div>
            
            <p className="text-[10px] text-zinc-500 mb-4 leading-relaxed font-light">
              Enter any custom macroeconomic headline to estimate short-term direction, price volatility thresholds, and target asset impacts based on statistical models.
            </p>

            <form onSubmit={handleAnalyzeHeadline} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customHeadline}
                  onChange={(e) => setCustomHeadline(e.target.value)}
                  placeholder="E.g., Saudi Arabia announces oil supply cuts of 500k bpd"
                  className="flex-1 text-xs px-3.5 py-2.5 border border-zinc-800 rounded-xl bg-zinc-950/40 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all font-light"
                />
                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="text-[10px] font-bold px-4 py-2.5 border border-emerald-500/30 rounded-xl bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all cursor-pointer disabled:opacity-50 uppercase font-bold"
                >
                  {isAnalyzing ? "Run..." : "Analyze"}
                </button>
              </div>
            </form>

            {/* Analysis output */}
            {adhocResult && (
              <div className="mt-4 p-4 border border-zinc-900 bg-zinc-950/30 rounded-xl space-y-3 text-[10px] animate-slide-up">
                <div className="flex justify-between items-center text-[9px] text-zinc-500 border-b border-zinc-900 pb-2 font-bold">
                  <span>SEMANTIC PRECEDENT CALCULATION</span>
                  <span className="text-emerald-400">MATCHED</span>
                </div>
                
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                  <div>
                    <span className="block text-zinc-500 text-[8px] uppercase font-bold">PROBABLE DIRECTION</span>
                    <span className={`font-extrabold tracking-wider text-xs block mt-0.5 ${
                      adhocResult.impact_direction === "Bullish" 
                        ? "text-emerald-400 glow-text-emerald" 
                        : adhocResult.impact_direction === "Bearish" 
                          ? "text-rose-400 glow-text-rose" 
                          : "text-amber-500"
                    }`}>
                      {adhocResult.impact_direction.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="block text-zinc-500 text-[8px] uppercase font-bold">IMPACT SEVERITY</span>
                    <span className={`font-extrabold tracking-wider text-xs block mt-0.5 ${
                      adhocResult.impact_severity === "High" 
                        ? "text-rose-400 glow-text-rose" 
                        : adhocResult.impact_severity === "Medium" 
                          ? "text-amber-400" 
                          : "text-zinc-400"
                    }`}>
                      {adhocResult.impact_severity?.toUpperCase()} IMPACT
                    </span>
                  </div>
                  <div>
                    <span className="block text-zinc-500 text-[8px] uppercase font-bold">PRECEDENT CONFIDENCE</span>
                    <span className="font-bold text-zinc-200 text-xs block mt-0.5">{Math.round(adhocResult.confidence_score * 100)}%</span>
                  </div>
                  <div>
                    <span className="block text-zinc-500 text-[8px] uppercase font-bold">VOLATILITY RANGE (4H)</span>
                    <span className="font-bold text-zinc-300 text-xs block mt-0.5">{adhocResult.volatility_4h}</span>
                  </div>
                  <div>
                    <span className="block text-zinc-500 text-[8px] uppercase font-bold">VOLATILITY RANGE (24H)</span>
                    <span className="font-bold text-zinc-300 text-xs block mt-0.5">{adhocResult.volatility_24h}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-900/60">
                  <span className="block text-zinc-500 text-[8px] uppercase font-bold mb-1.5">AFFECTED TARGET INDEX</span>
                  <div className="flex flex-wrap gap-1">
                    {adhocResult.asset_tags.split(",").map((tag: string) => (
                      <span key={tag} className="px-2.5 py-0.5 border border-zinc-800 rounded bg-zinc-900/50 text-zinc-300 text-[9px] font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      ) : (
        <TraderTerminalCopy />
      )}
    </main>
  );
}
