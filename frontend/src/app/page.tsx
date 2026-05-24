"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  TrendingUp, 
  Globe, 
  Terminal, 
  Activity, 
  Cpu,
  Info,
  Calendar,
  RefreshCw,
  Play,
  Pause,
  Clock,
  Server
} from "lucide-react";
import TraderTerminal from "../components/TraderTerminal";
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://insidertradingnews.onrender.com";

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<"COT" | "NEWS">("COT");
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Platform States
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>("EURUSD");
  const [cotData, setCotData] = useState<COTRecord[]>([]);
  const [newsFeed, setNewsFeed] = useState<NewsItem[]>([]);
  const [assetFilter, setAssetFilter] = useState<"ALL" | "FOREX" | "COMMODITY">("ALL");

  // HUD Dynamic Stats
  const [timeStr, setTimeStr] = useState("");
  const [latency, setLatency] = useState(34);

  // AI Precedent Matcher states
  const [customHeadline, setCustomHeadline] = useState("");
  const [adhocResult, setAdhocResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Simulation & alerts states
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

  // Clock Update
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toUTCString().replace("GMT", "UTC"));
    };
    updateTime();
    const clockTimer = setInterval(updateTime, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Latency simulator
  useEffect(() => {
    const latTimer = setInterval(() => {
      setLatency(prev => Math.max(15, Math.min(95, prev + Math.floor(Math.random() * 15) - 7)));
    }, 5000);
    return () => clearInterval(latTimer);
  }, []);

  // Mouse Move Event for background neon tracking glow
  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      containerRef.current.style.setProperty("--mouse-x", `${x}px`);
      containerRef.current.style.setProperty("--mouse-y", `${y}px`);
    }
  };

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
          if (data.length > 0) {
            setSelectedAsset("EURUSD");
          }
        }
      } catch (err) {
        console.error("Failed to load assets", err);
      }
    }
    loadAssets();
    fetchNewsFeed();
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

  // Analyze Headline
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

  // Sentiment ratio calculations
  const sentiment = useMemo(() => {
    const activeNews = newsFeed.filter(n => n.impact_direction !== "Neutral");
    if (activeNews.length === 0) return { bullish: 64, bearish: 36 };
    const bullishCount = activeNews.filter(n => n.impact_direction === "Bullish").length;
    const total = activeNews.length;
    const bullishPct = Math.round((bullishCount / total) * 100);
    return { bullish: bullishPct, bearish: 100 - bullishPct };
  }, [newsFeed]);

  const getNewsRelativeTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins === 1) return "1m ago";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs === 1) return "1h ago";
    return `${hrs}h ago`;
  };

  const filteredAssets = assets.filter(
    (a) => assetFilter === "ALL" || a.type === assetFilter
  );

  const selectedAssetObject = assets.find((a) => a.code === selectedAsset) || {
    code: selectedAsset,
    name: selectedAsset,
    type: "FOREX"
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="min-h-screen bg-[#020306] p-4 md:p-6 lg:p-8 relative overflow-hidden font-sans text-zinc-150"
    >
      {/* Drifting particle canvas */}
      <ParticleBackground />

      {/* Grid overlay background */}
      <div className="grid-overlay" />

      {/* Reactive Cursor Tracking Glow */}
      <div className="interactive-glow-bg" />

      {/* Brand Header with custom HUD layout */}
      <header className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 pb-5 border-b border-[#1b2742]/40 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 border border-[#00f0ff]/20 bg-[#00f0ff]/5 rounded-xl shadow-[0_0_15px_rgba(0,240,255,0.06)]">
            <Terminal className="w-5 h-5 text-[#00f0ff] animate-float" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-wider text-white uppercase flex items-center gap-2">
              GLOBAL MACRO EDGE 
              <span className="flex items-center gap-1 text-[9px] text-[#00f0ff] bg-blue-500/10 border border-[#00f0ff]/20 px-2 py-0.5 rounded font-black">
                <span className="w-1.5 h-1.5 bg-[#00f0ff] rounded-full animate-ping" /> LIVE CONNECTED
              </span>
            </h1>
            <p className="text-[10px] text-zinc-550 uppercase tracking-widest mt-0.5 font-bold">
              Institutional Positioning & Precedent Volatility Analytics
            </p>
          </div>
        </div>
        
        {/* Dynamic Telemetry HUD widgets */}
        <div className="flex flex-wrap items-center gap-4 md:gap-6 text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1b2742]/30 bg-[#0c0d12]/50">
            <Activity className="w-3.5 h-3.5 text-[#00f0ff] animate-pulse" />
            <span>SYS: <span className="text-[#00f0ff]">OPERATIONAL</span></span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1b2742]/30 bg-[#0c0d12]/50">
            <Server className="w-3.5 h-3.5 text-[#00ff88]" />
            <span>PING: <span className="text-[#00ff88] font-mono">{latency}MS</span></span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1b2742]/30 bg-[#0c0d12]/50">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span><span className="text-zinc-300 font-mono">{timeStr || "LOADING UTC..."}</span></span>
          </div>
        </div>
      </header>

      {/* Horizontal View Switcher Toolbar with sliding capsule */}
      <div className="relative z-10 flex p-1 border border-[#1b2742]/45 rounded-xl bg-[#080a10]/80 w-[416px] mx-auto my-6 shadow-xl select-none">
        
        {/* Sliding Capsule Background overlay */}
        <div 
          className={`absolute top-1 bottom-1 w-[201px] bg-[#00f0ff]/10 border border-[#00f0ff]/20 rounded-lg transition-all duration-300 ${
            currentView === "COT" ? "left-1" : "left-[210px]"
          }`} 
        />
        
        <button
          onClick={() => setCurrentView("COT")}
          className={`relative z-10 flex-1 text-[9.5px] font-black tracking-widest px-4 py-2.5 rounded-lg transition-all duration-300 cursor-pointer uppercase text-center ${
            currentView === "COT" ? "text-[#00f0ff] glow-text-blue" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          📊 COT Positioning
        </button>
        
        <button
          onClick={() => setCurrentView("NEWS")}
          className={`relative z-10 flex-1 text-[9.5px] font-black tracking-widest px-4 py-2.5 rounded-lg transition-all duration-300 cursor-pointer uppercase text-center ${
            currentView === "NEWS" ? "text-[#00f0ff] glow-text-blue" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          📰 News & Impact Analyzer
        </button>
      </div>

      {/* Main Container Section */}
      <div className="relative z-10 max-w-[1400px] mx-auto">
        
        {/* VIEW 1: Institutional COT Dashboard (News completely removed) */}
        {currentView === "COT" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start animate-slide-up">
            
            {/* Left Column: Live quotes card grid (5 cols) */}
            <div className="xl:col-span-5 w-full">
              <TraderTerminal 
                assets={assets}
                selectedAsset={selectedAsset}
                onSelectAsset={setSelectedAsset}
                latestPrices={latestPrices}
              />
            </div>

            {/* Right Column: Asset Selector pills & Recharts Chart (7 cols) */}
            <div className="xl:col-span-7 space-y-6 w-full">
              
              {/* Asset Selector pills */}
              <div className="p-5 border border-[#1b2742]/45 bg-[#0c0d12]/45 rounded-xl shadow-lg relative overflow-hidden hud-node-border">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1b2742]/20 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#00f0ff]" />
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                      Market Asset Directory
                    </span>
                  </div>
                  
                  {/* Directory Filter tabs */}
                  <div className="flex p-0.5 border border-[#1b2742]/40 rounded-lg bg-[#06080d]">
                    {(["ALL", "FOREX", "COMMODITY"] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setAssetFilter(filter)}
                        className={`text-[9px] font-black px-3 py-1.5 rounded transition-all cursor-pointer uppercase ${
                          assetFilter === filter
                            ? "bg-[#111317] border border-blue-500/10 text-[#00f0ff]"
                            : "text-zinc-550 hover:text-zinc-300"
                        }`}
                      >
                        {filter === "ALL" ? "All" : filter === "FOREX" ? "Forex" : "Commodities"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Directory button grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {filteredAssets.length === 0 ? (
                    <div className="col-span-full py-4 text-center text-zinc-650 text-xs font-semibold uppercase tracking-widest">
                      Loading assets...
                    </div>
                  ) : (
                    filteredAssets.map((asset) => {
                      const isSelected = selectedAsset === asset.code;
                      return (
                        <button
                          key={asset.code}
                          onClick={() => setSelectedAsset(asset.code)}
                          className={`flex flex-col items-center justify-center p-3.5 border rounded-xl transition-all duration-300 text-center cursor-pointer ${
                            isSelected
                              ? "bg-blue-500/5 border-[#00f0ff]/35 text-[#00f0ff] font-black shadow-md shadow-blue-500/1"
                              : "border-[#1b2742]/40 bg-[#06080d]/30 text-zinc-500 hover:border-zinc-700 hover:text-zinc-350 hover:bg-[#0c0d12]/50"
                          }`}
                        >
                          <span className="text-[12px] font-bold tracking-tight">{asset.name}</span>
                          <span className="text-[8px] uppercase text-zinc-550 mt-1.5 font-extrabold tracking-widest">{asset.code}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* COT Positioning Area Chart */}
              <div className="p-5 border border-[#1b2742]/45 bg-[#0c0d12]/45 rounded-xl shadow-lg relative overflow-hidden hud-node-border">
                <div className="flex items-center justify-between mb-4 border-b border-[#1b2742]/20 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#00f0ff]" />
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                      Institutional Positioning: {selectedAssetObject.name} ({selectedAssetObject.code})
                    </span>
                  </div>
                  <span className="text-[9px] px-2.5 py-0.5 bg-[#00f0ff]/5 text-[#00f0ff] border border-[#00f0ff]/20 rounded font-black uppercase tracking-widest">
                    COT POSITIONING
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

        {/* VIEW 2: Macro News & Precedent Analysis (Timeline + Sentiment + Calculator) */}
        {currentView === "NEWS" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start animate-slide-up">
            
            {/* Left Column: AI Precedent Matcher & Sentiment Meter (5 cols) */}
            <div className="xl:col-span-5 w-full space-y-6">
              
              {/* Sentiment Gauge Card */}
              <div className="p-5 border border-[#1b2742]/45 bg-[#0c0d12]/45 rounded-xl shadow-lg space-y-4 relative overflow-hidden hud-node-border">
                <div className="flex justify-between items-center border-b border-[#1b2742]/20 pb-3">
                  <div>
                    <h4 className="text-xs font-black tracking-wider text-zinc-300 uppercase">Market Sentiment Bias</h4>
                    <p className="text-[8px] text-zinc-550 uppercase font-semibold tracking-wider mt-0.5">Aggregate retail & bank positioning</p>
                  </div>
                  <Info className="w-4 h-4 text-zinc-600 cursor-pointer hover:text-zinc-400" />
                </div>

                {/* Circular Sentiment SVG ring */}
                <div className="flex flex-col items-center justify-center py-4 space-y-4">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* Bullish Outer Track */}
                      <circle cx="50" cy="50" r="42" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="8" fill="transparent" />
                      <circle 
                        cx="50" cy="50" r="42" 
                        stroke="#00ff88" 
                        strokeWidth="8" 
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 42}`}
                        strokeDashoffset={`${2 * Math.PI * 42 * (1 - sentiment.bullish / 100)}`}
                        strokeLinecap="round"
                        className="sentiment-gauge-value-bullish"
                      />
                      
                      {/* Bearish Inner Track */}
                      <circle cx="50" cy="50" r="32" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="6" fill="transparent" />
                      <circle 
                        cx="50" cy="50" r="32" 
                        stroke="#ff0055" 
                        strokeWidth="6" 
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 32}`}
                        strokeDashoffset={`${2 * Math.PI * 32 * (1 - sentiment.bearish / 100)}`}
                        strokeLinecap="round"
                        className="sentiment-gauge-value-bearish"
                      />
                    </svg>
                    
                    {/* Center Text Panel */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center leading-none select-none">
                      <span className="text-[9px] text-zinc-550 font-black tracking-widest uppercase mb-1">SENTIMENT</span>
                      <span className="text-xl font-black text-white font-mono tracking-tight glow-text-blue">
                        {sentiment.bullish}<span className="text-xs text-zinc-500 font-normal">%</span>
                      </span>
                      <span className="text-[7.5px] font-extrabold text-[#00ff88] mt-1.5 uppercase">BULLISH BIAS</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full text-[9px] font-black uppercase tracking-wider px-6 pt-2 border-t border-[#1b2742]/20">
                    <span className="text-[#00ff88] flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88]" /> Bullish {sentiment.bullish}%</span>
                    <span className="text-[#ff0055] flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#ff0055] shadow-[0_0_8px_#ff0055]" /> Bearish {sentiment.bearish}%</span>
                  </div>
                </div>
              </div>

              {/* AI Precedent Matcher & Calculator */}
              <div className="p-6 border border-[#1b2742]/45 bg-[#0c0d12]/45 rounded-xl shadow-xl space-y-4 relative overflow-hidden hud-node-border">
                <div className="flex items-center gap-2.5 border-b border-[#1b2742]/20 pb-4">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[#00f0ff] flex items-center justify-center">
                    <Cpu className="w-4.5 h-4.5 animate-float" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-200">
                      AI Impact Matcher
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest mt-0.5">
                      Macro headline precedent calculator
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Input any macroeconomic headline or central bank decision to estimate its short-term volatility window, direction, and affected currencies/commodities based on historic matches.
                </p>

                <form onSubmit={handleAnalyzeHeadline} className="space-y-4">
                  <div className="flex flex-col gap-2.5">
                    <input
                      type="text"
                      value={customHeadline}
                      onChange={(e) => setCustomHeadline(e.target.value)}
                      placeholder="E.g. Fed signals delaying rate cuts or Saudi cuts oil output"
                      className="text-xs px-4 py-3 border border-[#1b2742]/40 rounded-xl bg-[#06080d] text-white placeholder-zinc-650 focus:outline-none focus:border-[#00f0ff]/40 transition-all font-medium"
                    />
                    <button
                      type="submit"
                      disabled={isAnalyzing}
                      className="text-[10px] font-black px-5 py-3 border border-[#00f0ff]/20 rounded-xl bg-[#00f0ff]/5 text-[#00f0ff] hover:bg-[#00f0ff]/10 hover:border-[#00f0ff]/40 transition-all cursor-pointer disabled:opacity-50 uppercase tracking-wider flex items-center justify-center gap-2 active:scale-98"
                    >
                      {isAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                      {isAnalyzing ? "Processing..." : "Analyze Precedent"}
                    </button>
                  </div>
                </form>

                {/* Calculation matched output */}
                {adhocResult ? (
                  <div className="p-4 border border-[#1b2742]/40 bg-[#06080d]/60 rounded-xl space-y-4 text-[10px] animate-slide-up">
                    <div className="flex justify-between items-center text-[9px] text-zinc-500 border-b border-[#1b2742]/20 pb-2 font-black uppercase tracking-wider">
                      <span>Statistical Estimation</span>
                      <span className="text-[#00ff88]">Calculated</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-3.5 gap-x-4">
                      <div>
                        <span className="block text-zinc-550 text-[8px] uppercase font-black tracking-widest leading-none">Probable Direction</span>
                        <span className={`font-black tracking-wider text-xs block mt-1.5 ${
                          adhocResult.impact_direction === "Bullish" 
                            ? "text-[#00ff88]" 
                            : adhocResult.impact_direction === "Bearish" 
                              ? "text-[#ff0055]" 
                              : "text-amber-500"
                        }`}>
                          {adhocResult.impact_direction.toUpperCase()}
                        </span>
                      </div>
                      
                      <div>
                        <span className="block text-zinc-550 text-[8px] uppercase font-black tracking-widest leading-none">Confidence Score</span>
                        <span className="font-extrabold text-zinc-200 text-xs block mt-1.5">{Math.round(adhocResult.confidence_score * 100)}%</span>
                      </div>

                      <div>
                        <span className="block text-zinc-550 text-[8px] uppercase font-black tracking-widest leading-none">4H Volatility Range</span>
                        <span className="font-extrabold text-zinc-300 text-xs block mt-1.5">{adhocResult.volatility_4h}</span>
                      </div>

                      <div>
                        <span className="block text-zinc-550 text-[8px] uppercase font-black tracking-widest leading-none">24H Volatility Range</span>
                        <span className="font-extrabold text-zinc-300 text-xs block mt-1.5">{adhocResult.volatility_24h}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#1b2742]/30">
                      <span className="block text-zinc-555 text-[8px] uppercase font-black tracking-widest mb-1.5">Impacted Instrument Targets</span>
                      <div className="flex flex-wrap gap-1.5">
                        {adhocResult.asset_tags.split(",").map((tag: string) => (
                          <span key={tag} className="px-2 py-0.5 border border-[#1b2742]/40 rounded bg-[#111317]/60 text-[#00f0ff] font-extrabold text-[9px]">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border border-[#1b2742]/40 bg-[#06080d]/40 rounded-xl text-center text-zinc-600 text-[10px] uppercase font-semibold tracking-widest">
                    Awaiting headline input...
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Full timeline of historical economic events (7 cols) */}
            <div className="xl:col-span-7 w-full p-5 border border-[#1b2742]/45 bg-[#0c0d12]/45 rounded-xl shadow-lg space-y-4 relative overflow-hidden hud-node-border">
              <div className="flex items-center justify-between border-b border-[#1b2742]/20 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#00f0ff]" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-300">Macro Timeline History</h4>
                    <p className="text-[8px] text-zinc-550 font-semibold uppercase tracking-wider mt-0.5">Historical news precedents database</p>
                  </div>
                </div>
                
                {/* Simulation Control Buttons */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsSimulating(!isSimulating)}
                    className={`p-1.5 border rounded-lg transition-colors cursor-pointer ${
                      isSimulating 
                        ? "bg-blue-500/10 border-[#00f0ff]/35 text-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.06)]"
                        : "border-[#1b2742]/40 text-zinc-550 hover:text-zinc-300 hover:bg-[#06080d]"
                    }`}
                    title={isSimulating ? "Pause Simulation" : "Start Simulation"}
                  >
                    {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button 
                    onClick={handleGenerateNews}
                    disabled={isGenerating}
                    className="p-1.5 border border-[#1b2742]/40 text-zinc-450 hover:border-zinc-700 hover:text-zinc-200 rounded-lg cursor-pointer disabled:opacity-50"
                    title="Force Trigger Macro Alert"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* News cards list with vertical connector timeline rail */}
              <div className="relative pl-6 space-y-6 max-h-[620px] overflow-y-auto pr-1.5 scrollbar-thin select-none">
                
                {/* Dashed Timeline Connector Line */}
                <div className="absolute left-2.5 top-2 bottom-2 w-[1px] border-l border-dashed border-[#1b2742]/60 z-0" />

                {newsFeed.length === 0 ? (
                  <div className="p-6 text-center text-zinc-650 text-xs font-semibold uppercase tracking-widest border border-dashed border-[#1b2742]/30 rounded-xl">
                    No data in news feed
                  </div>
                ) : (
                  newsFeed.map((item) => {
                    const isBullish = item.impact_direction === "Bullish";
                    const isBearish = item.impact_direction === "Bearish";
                    const hasHighSeverity = item.impact_severity === "High";
                    
                    let categoryColor = "text-zinc-400";
                    let bulletColor = "text-zinc-600 bg-[#06080d] border-zinc-700";
                    let glowBorder = "border-[#1b2742]/40 bg-[#0c0d12]/20";

                    if (isBullish) {
                      categoryColor = "text-[#00ff88]";
                      bulletColor = "text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/30";
                      glowBorder = "border-[#00ff88]/20 bg-[#00ff88]/[0.01]";
                    } else if (isBearish) {
                      categoryColor = "text-[#ff0055]";
                      bulletColor = "text-[#ff0055] bg-[#ff0055]/10 border-[#ff0055]/30";
                      glowBorder = "border-[#ff0055]/20 bg-[#ff0055]/[0.01]";
                    }

                    return (
                      <div key={item.id} className="relative z-10">
                        {/* Timeline Bullet Node with Radar Pulse */}
                        <div className={`absolute -left-[28.5px] top-1.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center timeline-pulse-node ${bulletColor}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-currentColor" />
                        </div>

                        {/* News Event Card with Laser Scan */}
                        <div 
                          className={`p-4 border rounded-xl hover:border-blue-500/30 hover:bg-[#0c0d12]/70 flex flex-col space-y-2.5 transition-all duration-300 card-tilt-hover laser-scan-container ${glowBorder}`}
                        >
                          <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest leading-none">
                            <span className={categoryColor}>{isBullish ? "BULLISH FLOW" : isBearish ? "BEARISH WAVE" : "STABILITY REPORT"}</span>
                            <span className="text-zinc-550 font-bold">{getNewsRelativeTime(item.timestamp)}</span>
                          </div>

                          <h5 className="text-[11.5px] font-extrabold text-zinc-200 leading-snug">
                            {item.headline}
                          </h5>

                          <div className="p-2.5 border border-[#1b2742]/30 bg-[#06080d]/80 rounded-lg flex flex-col gap-1.5 text-[9.5px]">
                            <div className="flex justify-between font-semibold">
                              <span className="text-zinc-550">Historical Impact:</span>
                              <span className={`font-black ${isBullish ? "text-[#00ff88]" : isBearish ? "text-[#ff0055]" : "text-amber-500"}`}>
                                {item.impact_direction.toUpperCase()} ({Math.round(item.confidence_score * 100)}% Confidence)
                              </span>
                            </div>
                            <div className="flex justify-between font-semibold">
                              <span className="text-zinc-550">Affected Pairs & Commodities:</span>
                              <span className="text-[#00f0ff] font-bold">{item.asset_tags}</span>
                            </div>
                            <div className="flex justify-between text-[8.5px] text-zinc-500 font-bold">
                              <span>4H Volatility: {item.volatility_4h}</span>
                              <span>24H Volatility: {item.volatility_24h}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[8px] text-zinc-650 uppercase tracking-widest font-black pt-1.5 border-t border-[#1b2742]/20 mt-1 select-none">
                            <span>Source: {item.source}</span>
                            <span className={`px-2 py-0.5 rounded text-[7.5px] border font-black tracking-normal ${
                              hasHighSeverity ? "bg-rose-500/5 border-[#ff0055]/30 text-[#ff0055]" : "bg-zinc-800/40 border-[#1b2742]/30 text-zinc-500"
                            }`}>
                              {item.impact_severity.toUpperCase()} IMPACT
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
