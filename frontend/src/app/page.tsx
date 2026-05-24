"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  TrendingUp, 
  Globe, 
  Terminal, 
  Activity, 
  Cpu,
  Zap,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<"COT" | "NEWS">("COT");
  
  // Platform States
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>("EURUSD");
  const [cotData, setCotData] = useState<COTRecord[]>([]);
  const [newsFeed, setNewsFeed] = useState<NewsItem[]>([]);
  const [assetFilter, setAssetFilter] = useState<"ALL" | "FOREX" | "COMMODITY">("ALL");

  // AI Precedent Matcher view states
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
          // Set EURUSD as default
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

  // Fetch news feed (contains both forex & commodities news)
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

  const filteredAssets = assets.filter(
    (a) => assetFilter === "ALL" || a.type === assetFilter
  );

  const selectedAssetObject = assets.find((a) => a.code === selectedAsset) || {
    code: selectedAsset,
    name: selectedAsset,
    type: "FOREX"
  };

  return (
    <main className="min-h-screen bg-[#04060c] p-4 md:p-6 lg:p-8 relative overflow-hidden font-sans text-zinc-100">
      {/* Drifting particle background */}
      <ParticleBackground />

      {/* Grid overlay lines */}
      <div className="grid-overlay" />

      {/* Brand Header */}
      <header className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-[#1b2742]/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 border border-blue-500/20 bg-blue-500/5 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.06)]">
            <Terminal className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-wider text-white uppercase flex items-center gap-2">
              GLOBAL MACRO EDGE 
              <span className="flex items-center gap-1 text-[9px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded font-black">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" /> LIVE CONNECTED
              </span>
            </h1>
            <p className="text-[10px] text-zinc-550 uppercase tracking-widest mt-0.5 font-bold">
              Institutional Positioning & Precedent Volatility Analytics
            </p>
          </div>
        </div>
        
        {/* System parameters */}
        <div className="flex items-center gap-6 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-500" />
            <span>SYS: <span className="text-blue-400">OPERATIONAL</span></span>
          </div>
          <div className="h-3 w-[1px] bg-[#1b2742]/45" />
          <div>
            <span>DATE: <span className="text-zinc-200">2026-05-24</span></span>
          </div>
        </div>
      </header>

      {/* Top horizontal view switcher toolbar */}
      <div className="relative z-10 flex p-0.5 border border-[#1a1d26] rounded-xl bg-[#0c0d12]/50 max-w-[480px] mx-auto my-6 shadow-xl">
        <button
          onClick={() => setCurrentView("COT")}
          className={`flex-1 text-[9.5px] font-black tracking-widest px-4 py-2.5 rounded-lg transition-all duration-300 cursor-pointer uppercase text-center ${
            currentView === "COT"
              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_2px_12px_rgba(59,130,246,0.08)]"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          📊 Institutional Flows (COT)
        </button>
        <button
          onClick={() => setCurrentView("NEWS")}
          className={`flex-1 text-[9.5px] font-black tracking-widest px-4 py-2.5 rounded-lg transition-all duration-300 cursor-pointer uppercase text-center ${
            currentView === "NEWS"
              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_2px_12px_rgba(59,130,246,0.08)]"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          📰 Macro News & Impact Analyzer
        </button>
      </div>

      {/* Main Container Section */}
      <div className="relative z-10 max-w-[1400px] mx-auto">
        
        {/* VIEW 1: Institutional COT Dashboard */}
        {currentView === "COT" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start animate-slide-up">
            
            {/* Left Column: Quotes Rates table and Sentiment (5 cols) */}
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

            {/* Right Column: Asset Selectors & COT Chart (7 cols) */}
            <div className="xl:col-span-7 space-y-6 w-full">
              
              {/* Asset Selectors Directory */}
              <div className="p-5 border border-[#1a1d26] bg-[#111317] rounded-xl shadow-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1a1d26] pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-400" />
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
                            ? "bg-[#111317] border border-[#1b1e25] text-blue-400"
                            : "text-zinc-500 hover:text-zinc-300"
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
                          className={`flex flex-col items-center justify-center p-3.5 border rounded-xl transition-all duration-200 text-center cursor-pointer ${
                            isSelected
                              ? "bg-blue-500/5 border-blue-500/30 text-blue-400 font-black shadow-md shadow-blue-500/1"
                              : "border-[#1a1d26] bg-[#0c0d12]/30 text-zinc-500 hover:border-zinc-800 hover:text-zinc-300 hover:bg-[#0c0d12]/60"
                          }`}
                        >
                          <span className="text-[12px] font-bold tracking-tight">{asset.name}</span>
                          <span className="text-[8px] uppercase text-zinc-550 mt-1 font-extrabold tracking-widest">{asset.code}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* COT Positioning Chart Card */}
              <div className="p-5 border border-[#1a1d26] bg-[#111317] rounded-xl shadow-lg">
                <div className="flex items-center justify-between mb-4 border-b border-[#1a1d26] pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                      Institutional Positioning: {selectedAssetObject.name} ({selectedAssetObject.code})
                    </span>
                  </div>
                  <span className="text-[9px] px-2.5 py-0.5 bg-blue-500/5 text-blue-400 border border-blue-500/15 rounded font-black uppercase tracking-widest">
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

        {/* VIEW 2: Macro News & Precedent Analysis */}
        {currentView === "NEWS" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start animate-slide-up">
            
            {/* Left Column: AI Precedent Matcher & Calculator (5 cols) */}
            <div className="xl:col-span-5 w-full space-y-6">
              <div className="p-6 border border-[#1a1d26] bg-[#111317] rounded-xl shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 border-b border-[#1a1d26] pb-4">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Cpu className="w-4.5 h-4.5" />
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
                  Enter any macroeconomic headline or central bank decision to estimate its short-term volatility window, direction, and affected currencies/commodities based on historic matches.
                </p>

                <form onSubmit={handleAnalyzeHeadline} className="space-y-4">
                  <div className="flex flex-col gap-2.5">
                    <input
                      type="text"
                      value={customHeadline}
                      onChange={(e) => setCustomHeadline(e.target.value)}
                      placeholder="E.g. Fed signals delaying rate cuts or Saudi cuts oil output"
                      className="text-xs px-4 py-3 border border-[#1a1d26] rounded-xl bg-[#0c0d12] text-white placeholder-zinc-650 focus:outline-none focus:border-blue-500/40 transition-all font-medium"
                    />
                    <button
                      type="submit"
                      disabled={isAnalyzing}
                      className="text-[10px] font-black px-5 py-3 border border-blue-500/20 rounded-xl bg-blue-500/5 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/40 transition-all cursor-pointer disabled:opacity-50 uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      {isAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                      {isAnalyzing ? "Processing..." : "Analyze Precedent"}
                    </button>
                  </div>
                </form>

                {/* Calculation matched output */}
                {adhocResult ? (
                  <div className="p-4 border border-[#1a1d26] bg-[#0c0d12]/40 rounded-xl space-y-4 text-[10px] animate-slide-up">
                    <div className="flex justify-between items-center text-[9px] text-zinc-500 border-b border-[#1a1d26] pb-2 font-black uppercase tracking-wider">
                      <span>Statistical Estimation</span>
                      <span className="text-emerald-450">Calculated</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-3.5 gap-x-4">
                      <div>
                        <span className="block text-zinc-550 text-[8px] uppercase font-black tracking-widest leading-none">Probable Direction</span>
                        <span className={`font-black tracking-wider text-xs block mt-1.5 ${
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

                    <div className="pt-3 border-t border-[#1a1d26]/40">
                      <span className="block text-zinc-555 text-[8px] uppercase font-black tracking-widest mb-1.5">Impacted Instrument Targets</span>
                      <div className="flex flex-wrap gap-1.5">
                        {adhocResult.asset_tags.split(",").map((tag: string) => (
                          <span key={tag} className="px-2 py-0.5 border border-[#1a1d26] rounded bg-[#111317] text-blue-400 font-extrabold text-[9px]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border border-[#1a1d26] bg-[#0c0d12]/30 rounded-xl text-center text-zinc-600 text-[10px] uppercase font-semibold tracking-widest">
                    Awaiting headline input...
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Full timeline of historical economic events (7 cols) */}
            <div className="xl:col-span-7 w-full p-5 border border-[#1a1d26] bg-[#111317] rounded-xl shadow-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-[#1a1d26] pb-3">
                <Calendar className="w-4 h-4 text-blue-400" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-300">Macro Timeline History</h4>
                  <p className="text-[8px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">Historical news precedents database</p>
                </div>
              </div>

              {/* News cards list */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1.5 scrollbar-thin">
                {newsFeed.length === 0 ? (
                  <div className="p-6 text-center text-zinc-600 text-xs font-semibold uppercase tracking-widest border border-dashed border-[#1a1d26] rounded-xl">
                    No data in news feed
                  </div>
                ) : (
                  newsFeed.map((item) => {
                    const isBullish = item.impact_direction === "Bullish";
                    const isBearish = item.impact_direction === "Bearish";
                    const hasHighSeverity = item.impact_severity === "High";
                    
                    let categoryColor = "text-zinc-500";
                    let borderAccent = "border-l-[3px] border-l-[#1a1d26]";

                    if (isBullish) {
                      categoryColor = "text-emerald-400";
                      borderAccent = "border-l-[3px] border-l-emerald-500";
                    } else if (isBearish) {
                      categoryColor = "text-rose-400";
                      borderAccent = "border-l-[3px] border-l-rose-500";
                    }

                    return (
                      <div 
                        key={item.id}
                        className={`p-4 bg-[#0c0d12]/40 border border-[#1a1d26] rounded-xl hover:border-zinc-800 hover:bg-[#0c0d12]/70 flex flex-col space-y-2.5 transition-all duration-200 ${borderAccent}`}
                      >
                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest leading-none">
                          <span className={categoryColor}>{isBullish ? "BULLISH FLOW" : isBearish ? "BEARISH WAVE" : "STABILITY REPORT"}</span>
                          <span className="text-zinc-650 font-bold">{new Date(item.timestamp).toLocaleString()}</span>
                        </div>

                        <h5 className="text-[11.5px] font-extrabold text-zinc-200 leading-snug">
                          {item.headline}
                        </h5>

                        <div className="p-2.5 border border-[#1a1d26] bg-[#111317]/50 rounded-xl flex flex-col gap-1.5 text-[9.5px]">
                          <div className="flex justify-between font-semibold">
                            <span className="text-zinc-550">Historical Impact:</span>
                            <span className={`font-black ${isBullish ? "text-emerald-400" : isBearish ? "text-rose-400" : "text-amber-500"}`}>
                              {item.impact_direction.toUpperCase()} ({Math.round(item.confidence_score * 100)}% Confidence)
                            </span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span className="text-zinc-550">Affected Pairs & Commodities:</span>
                            <span className="text-blue-400 font-bold">{item.asset_tags}</span>
                          </div>
                          <div className="flex justify-between text-[8.5px] text-zinc-500 font-bold">
                            <span>4H Volatility: {item.volatility_4h}</span>
                            <span>24H Volatility: {item.volatility_24h}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[8px] text-zinc-600 uppercase tracking-widest font-black pt-1.5 border-t border-[#1a1d26]/40 mt-1 select-none">
                          <span>Source: {item.source}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[8px] border font-black tracking-normal ${
                            hasHighSeverity ? "bg-rose-500/5 border-rose-500/20 text-rose-400" : "bg-zinc-800/40 border-[#1a1d26] text-zinc-500"
                          }`}>
                            {item.impact_severity.toUpperCase()} IMPACT
                          </span>
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
    </main>
  );
}
