"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  TrendingUp, 
  Globe, 
  Terminal, 
  Activity, 
  Cpu,
  Zap,
  Settings,
  Database,
  RefreshCw,
  Info,
  Layers
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import TopHeader from "../components/TopHeader";
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
  const [currentView, setCurrentView] = useState<"COT" | "COPIER" | "AI_CALC" | "SETTINGS">("COT");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Platform States
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>("GOLD");
  const [cotData, setCotData] = useState<COTRecord[]>([]);
  const [newsFeed, setNewsFeed] = useState<NewsItem[]>([]);
  const [assetFilter, setAssetFilter] = useState<"ALL" | "FOREX" | "COMMODITY">("ALL");

  // AI Precedent Matcher view states
  const [customHeadline, setCustomHeadline] = useState("");
  const [adhocResult, setAdhocResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Copier stats for TopHeader
  const [copierStats, setCopierStats] = useState({
    avgDelay: 38,
    successRate: 99.98,
    totalProfit: 5525.08,
    dailyGain: 2.26,
    drawdown: 2.41
  });

  // Settings view states
  const [showParticles, setShowParticles] = useState(true);
  const [glowEffects, setGlowEffects] = useState(true);
  const [apiStatus, setApiStatus] = useState<"online" | "offline" | "checking">("checking");
  const [isReseeding, setIsReseeding] = useState(false);

  // Simulation & alerts states
  const [isSimulating, setIsSimulating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Latest prices cache
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

  // Sync COT data last recorded price
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

  // Load Copier Stats
  const fetchCopierStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/copier/stats`, {
        headers: { "bypass-tunnel-reminder": "true" }
      });
      if (res.ok) {
        const data = await res.json();
        setCopierStats({
          avgDelay: data.avg_delay,
          successRate: data.success_rate,
          totalProfit: data.total_profit,
          dailyGain: data.daily_gain,
          drawdown: data.drawdown
        });
        setApiStatus("online");
      }
    } catch (err) {
      console.error("Failed to load copier stats", err);
      setApiStatus("offline");
    }
  };

  useEffect(() => {
    fetchCopierStats();
    const interval = setInterval(fetchCopierStats, 8000);
    return () => clearInterval(interval);
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

  // Generate news alert
  const handleGenerateNews = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/news/generate`, {
        method: "POST"
      });
      if (res.ok) {
        await fetchNewsFeed();
      }
    } catch (err) {
      console.error("Failed to generate live news event", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Simulation loop
  useEffect(() => {
    if (isSimulating) {
      handleGenerateNews();
      simulationIntervalRef.current = setInterval(handleGenerateNews, 8000);
    } else {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    }
    return () => {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };
  }, [isSimulating]);

  // Load assets
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

  // Analyze custom headline
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

  // Re-seed Database
  const handleReseedDb = async () => {
    if (isReseeding) return;
    setIsReseeding(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/news/generate`, {
        method: "POST"
      });
      if (res.ok) {
        alert("Database reseeded successfully!");
        fetchNewsFeed();
      }
    } catch (err) {
      alert("Failed to reseed database");
    } finally {
      setIsReseeding(false);
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
    <div className="min-h-screen bg-[#07080a] text-zinc-100 flex relative overflow-x-hidden font-sans">
      {/* Drifting particle background */}
      {showParticles && <ParticleBackground />}

      {/* Grid overlay lines */}
      <div className="grid-overlay" />

      {/* Sidebar Navigation */}
      <Sidebar 
        currentView={currentView}
        onChangeView={setCurrentView}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Workspace Area */}
      <div className="flex-1 flex flex-col min-h-screen relative z-10 overflow-hidden">
        {/* Top Header bar */}
        <TopHeader stats={copierStats} />

        {/* View Main Content wrapper */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto max-w-[1400px] mx-auto w-full">
          
          {/* TAB 1: Dashboard (Institutional COT Flows) */}
          {currentView === "COT" && (
            <div className="space-y-6 animate-slide-up">
              {/* Asset Selectors Directory */}
              <div className="p-5 border border-[#1a1d26] bg-[#111317] rounded-xl shadow-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1a1d26] pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                      Market Asset Directory
                    </span>
                  </div>
                  
                  {/* Directory Filter */}
                  <div className="flex p-0.5 border border-[#1a1d26] rounded-lg bg-[#0c0d12]">
                    {(["ALL", "FOREX", "COMMODITY"] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setAssetFilter(filter)}
                        className={`text-[9px] font-black px-3 py-1.5 rounded transition-all cursor-pointer uppercase ${
                          assetFilter === filter
                            ? "bg-[#111317] border border-[#1b1e25] text-emerald-400"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Directory button grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {filteredAssets.length === 0 ? (
                    <div className="col-span-full py-4 text-center text-zinc-600 text-xs font-semibold uppercase tracking-widest">
                      Loading assets...
                    </div>
                  ) : (
                    filteredAssets.map((asset) => {
                      const isSelected = selectedAsset === asset.code;
                      return (
                        <button
                          key={asset.code}
                          onClick={() => setSelectedAsset(asset.code)}
                          className={`flex flex-col items-center justify-center p-3.5 border rounded-xl transition-all duration-200 text-center cursor-pointer ${
                            isSelected
                              ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-400 font-black shadow-md shadow-emerald-500/1"
                              : "border-[#1a1d26] bg-[#0c0d12]/30 text-zinc-500 hover:border-zinc-800 hover:text-zinc-300 hover:bg-[#0c0d12]/60"
                          }`}
                        >
                          <span className="text-[11px] tracking-tight">{asset.name}</span>
                          <span className="text-[8px] uppercase text-zinc-500 mt-1 font-extrabold tracking-widest">{asset.code}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Main 2-Column Dashboard grid */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* Left Column: Quotes & Sentiment (Trader Terminal Components) */}
                <div className="xl:col-span-5 w-full">
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
                </div>

                {/* Right Column: Chart */}
                <div className="xl:col-span-7 w-full p-5 border border-[#1a1d26] bg-[#111317] rounded-xl shadow-lg">
                  <div className="flex items-center justify-between mb-4 border-b border-[#1a1d26] pb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                        COT Positioning: {selectedAssetObject.name} ({selectedAssetObject.code})
                      </span>
                    </div>
                    <span className="text-[9px] px-2.5 py-0.5 bg-emerald-500/5 text-emerald-400 border border-emerald-500/15 rounded font-black uppercase tracking-widest">
                      {selectedAssetObject.type}
                    </span>
                  </div>

                  <COTChart 
                    data={cotData} 
                    assetCode={selectedAssetObject.code} 
                    assetName={selectedAssetObject.name} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MT Copy Trading Terminal */}
          {currentView === "COPIER" && <TraderTerminalCopy />}

          {/* TAB 3: AI Precedent Matcher */}
          {currentView === "AI_CALC" && (
            <div className="max-w-3xl mx-auto space-y-6 animate-slide-up">
              <div className="p-6 border border-[#1a1d26] bg-[#111317] rounded-xl shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 border-b border-[#1a1d26] pb-4">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Cpu className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-200">
                      AI Precedent Impact Calculator
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest mt-0.5">
                      Macroeconomic semantic risk calculator
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Input any breaking financial news headline to analyze its semantic implications. The engine matches historical precedents, evaluates volatility thresholds, and maps target asset tags.
                </p>

                <form onSubmit={handleAnalyzeHeadline} className="space-y-4">
                  <div className="flex gap-2.5">
                    <input
                      type="text"
                      value={customHeadline}
                      onChange={(e) => setCustomHeadline(e.target.value)}
                      placeholder="E.g., ECB cuts deposit facility rate by 25 basis points as inflation falls"
                      className="flex-1 text-xs px-4 py-3 border border-[#1a1d26] rounded-xl bg-[#0c0d12] text-white placeholder-zinc-650 focus:outline-none focus:border-emerald-500/40 transition-all font-medium"
                    />
                    <button
                      type="submit"
                      disabled={isAnalyzing}
                      className="text-[10px] font-black px-5 py-3 border border-emerald-500/20 rounded-xl bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all cursor-pointer disabled:opacity-50 uppercase tracking-wider flex items-center gap-2"
                    >
                      {isAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                      {isAnalyzing ? "Calculating..." : "Analyze"}
                    </button>
                  </div>
                </form>

                {/* Calculation results */}
                {adhocResult && (
                  <div className="p-5 border border-[#1a1d26] bg-[#0c0d12]/40 rounded-xl space-y-4 text-[10px] animate-slide-up">
                    <div className="flex justify-between items-center text-[9px] text-zinc-500 border-b border-[#1a1d26] pb-2 font-black uppercase tracking-wider">
                      <span>Semantic Inference Result</span>
                      <span className="text-emerald-400">Match Found</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                      <div>
                        <span className="block text-zinc-500 text-[8px] uppercase font-black tracking-widest">Probable Direction</span>
                        <span className={`font-black tracking-wider text-xs block mt-1 ${
                          adhocResult.impact_direction === "Bullish" 
                            ? "text-emerald-400" 
                            : adhocResult.impact_direction === "Bearish" 
                              ? "text-rose-400" 
                              : "text-amber-500"
                        }`}>
                          {adhocResult.impact_direction.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="block text-zinc-500 text-[8px] uppercase font-black tracking-widest">Impact Severity</span>
                        <span className={`font-black tracking-wider text-xs block mt-1 ${
                          adhocResult.impact_severity === "High" 
                            ? "text-rose-400" 
                            : adhocResult.impact_severity === "Medium" 
                              ? "text-amber-400" 
                              : "text-zinc-400"
                        }`}>
                          {adhocResult.impact_severity?.toUpperCase()} SEVERITY
                        </span>
                      </div>
                      <div>
                        <span className="block text-zinc-500 text-[8px] uppercase font-black tracking-widest">Precedent Confidence</span>
                        <span className="font-bold text-zinc-200 text-xs block mt-1">{Math.round(adhocResult.confidence_score * 100)}%</span>
                      </div>
                      <div>
                        <span className="block text-zinc-500 text-[8px] uppercase font-black tracking-widest">4-Hour Volatility</span>
                        <span className="font-bold text-zinc-300 text-xs block mt-1">{adhocResult.volatility_4h}</span>
                      </div>
                      <div>
                        <span className="block text-zinc-500 text-[8px] uppercase font-black tracking-widest">24-Hour Volatility</span>
                        <span className="font-bold text-zinc-300 text-xs block mt-1">{adhocResult.volatility_24h}</span>
                      </div>
                    </div>

                    <div className="pt-3.5 border-t border-[#1a1d26]/60">
                      <span className="block text-zinc-500 text-[8px] uppercase font-black tracking-widest mb-2">Affected Targets</span>
                      <div className="flex flex-wrap gap-1.5">
                        {adhocResult.asset_tags.split(",").map((tag: string) => (
                          <span key={tag} className="px-2.5 py-1 border border-[#1a1d26] rounded bg-[#111317] text-zinc-300 text-[9px] font-bold">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: System Settings */}
          {currentView === "SETTINGS" && (
            <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
              <div className="p-6 border border-[#1a1d26] bg-[#111317] rounded-xl shadow-xl space-y-6">
                <div className="flex items-center gap-2.5 border-b border-[#1a1d26] pb-4">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Settings className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-200">
                      System Settings
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest mt-0.5">
                      Platform credentials & dashboard toggles
                    </p>
                  </div>
                </div>

                {/* Dashboard Options */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">UI Accents & Graphics</h4>
                  
                  <div className="flex items-center justify-between p-3 border border-[#1a1d26] bg-[#0c0d12]/30 rounded-xl">
                    <div>
                      <span className="block text-xs font-bold text-zinc-200">Canvas Particles Background</span>
                      <span className="block text-[8px] text-zinc-500 uppercase font-semibold tracking-wider mt-0.5">Drifting neon background nodes</span>
                    </div>
                    <button
                      onClick={() => setShowParticles(!showParticles)}
                      className={`w-10 h-5.5 rounded-full p-1 transition-colors duration-300 cursor-pointer ${
                        showParticles ? "bg-emerald-500" : "bg-zinc-800"
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-300 ${
                        showParticles ? "translate-x-4.5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Connection Status Details */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Database Connection</h4>
                  
                  <div className="p-4 border border-[#1a1d26] bg-[#0c0d12]/30 rounded-xl space-y-3 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span className="text-zinc-500">API Status:</span>
                      <span className={`font-black uppercase ${
                        apiStatus === "online" ? "text-emerald-400" : apiStatus === "offline" ? "text-rose-400" : "text-amber-500"
                      }`}>
                        {apiStatus}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-zinc-500">Server Host:</span>
                      <span className="text-zinc-300 font-mono break-all">{API_BASE_URL}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-zinc-500">Local SQLite DB:</span>
                      <span className="text-zinc-300 font-mono">cot_dashboard.db</span>
                    </div>
                  </div>
                </div>

                {/* Utilities / Seeders */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">System Utilities</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleReseedDb}
                      disabled={isReseeding}
                      className="flex-1 py-3 border border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer disabled:opacity-50 text-center flex items-center justify-center gap-2"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isReseeding ? "animate-spin" : ""}`} />
                      Reseed Database Positioning
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
