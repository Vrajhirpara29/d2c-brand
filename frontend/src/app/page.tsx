"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  TrendingUp, 
  Globe, 
  Terminal, 
  Activity, 
  Cpu
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
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>("EURUSD");
  const [cotData, setCotData] = useState<COTRecord[]>([]);
  const [newsFeed, setNewsFeed] = useState<NewsItem[]>([]);
  
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
    USDCHF: { price: 0.90241, change: -0.11 }
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
          // Filter to show ONLY Forex assets
          const forexOnly = data.filter((a: Asset) => a.type === "FOREX");
          setAssets(forexOnly);
          
          // Default selected asset should be the first forex pair (EURUSD)
          if (forexOnly.length > 0) {
            setSelectedAsset(forexOnly[0].code);
          }
        }
      } catch (err) {
        console.error("Failed to load assets", err);
      }
    }
    loadAssets();
    fetchNewsFeed();
  }, []);

  // Fetch news feed and filter to show only FOREX news
  const fetchNewsFeed = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/news`, {
        headers: { "bypass-tunnel-reminder": "true" }
      });
      if (res.ok) {
        const data = await res.json();
        
        // Filter out non-Forex news (keep news with Forex tags like #EURUSD, #GBPUSD, #USD)
        const forexNews = data.filter((item: NewsItem) => {
          const tags = item.asset_tags.toLowerCase();
          return (
            tags.includes("usd") ||
            tags.includes("eur") ||
            tags.includes("gbp") ||
            tags.includes("jpy") ||
            tags.includes("aud") ||
            tags.includes("cad") ||
            tags.includes("chf")
          );
        });
        
        setNewsFeed(forexNews);
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

  const selectedAssetObject = assets.find((a) => a.code === selectedAsset) || {
    code: selectedAsset,
    name: selectedAsset,
    type: "FOREX"
  };

  return (
    <main className="min-h-screen bg-[#07080a] p-4 md:p-6 lg:p-8 relative overflow-hidden font-sans text-zinc-100">
      {/* Drifting particle background */}
      <ParticleBackground />

      {/* Grid overlay lines */}
      <div className="grid-overlay" />

      {/* Header bar */}
      <header className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 mb-8 border-b border-[#1a1d26]">
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
              Forex Institutional Flow & Macro News Dashboard
            </p>
          </div>
        </div>
        
        {/* Right: System parameters */}
        <div className="flex items-center gap-6 text-[10px] text-zinc-400 font-semibold">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>SYS: <span className="text-emerald-400">OPERATIONAL</span></span>
          </div>
          <div className="h-3 w-[1px] bg-zinc-800" />
          <div>
            <span>REFRESH: <span className="text-zinc-200">REAL-TIME (T+8S)</span></span>
          </div>
          <div className="h-3 w-[1px] bg-zinc-800" />
          <div>
            <span>DATE: <span className="text-zinc-200">2026-05-24</span></span>
          </div>
        </div>
      </header>

      {/* Main 2-Column Dashboard grid */}
      <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start max-w-[1400px] mx-auto">
        
        {/* Left Column: Quotes, Sentiment & Timeline (5 cols) */}
        <section className="xl:col-span-5 w-full">
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

        {/* Right Column: COT Charts & Directory (7 cols) */}
        <section className="xl:col-span-7 space-y-6 w-full">
          
          {/* Forex Asset Directory */}
          <div className="p-5 border border-[#1a1d26] bg-[#111317] rounded-xl shadow-lg">
            <div className="flex items-center gap-2 border-b border-[#1a1d26] pb-4 mb-4">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                Forex Pair Selector Directory
              </span>
            </div>

            {/* Directory buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {assets.length === 0 ? (
                <div className="col-span-full py-4 text-center text-zinc-600 text-xs font-semibold uppercase tracking-widest">
                  Loading pairs...
                </div>
              ) : (
                assets.map((asset) => {
                  const isSelected = selectedAsset === asset.code;
                  return (
                    <button
                      key={asset.code}
                      onClick={() => setSelectedAsset(asset.code)}
                      className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all duration-200 text-center cursor-pointer ${
                        isSelected
                          ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-400 font-black shadow-md shadow-emerald-500/1"
                          : "border-[#1a1d26] bg-[#0c0d12]/30 text-zinc-500 hover:border-zinc-800 hover:text-zinc-300 hover:bg-[#0c0d12]/60"
                      }`}
                    >
                      <span className="text-[12px] font-bold tracking-tight">{asset.name}</span>
                      <span className="text-[8px] uppercase text-zinc-500 mt-1 font-extrabold tracking-widest">{asset.code}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Institutional Recharts positioning dashboard */}
          <div className="p-5 border border-[#1a1d26] bg-[#111317] rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-4 border-b border-[#1a1d26] pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                  Institutional Positioning: {selectedAssetObject.name} ({selectedAssetObject.code})
                </span>
              </div>
              <span className="text-[9px] px-2.5 py-0.5 bg-emerald-500/5 text-emerald-400 border border-emerald-500/15 rounded font-black uppercase tracking-widest">
                COT DATA
              </span>
            </div>

            <COTChart 
              data={cotData} 
              assetCode={selectedAssetObject.code} 
              assetName={selectedAssetObject.name} 
            />
          </div>

        </section>
      </div>
    </main>
  );
}
