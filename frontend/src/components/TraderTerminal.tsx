"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  Info, 
  Play, 
  Pause,
  RefreshCw,
  Zap,
  Globe
} from "lucide-react";

interface Asset {
  code: string;
  name: string;
  type: string;
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

interface TraderTerminalProps {
  assets: Asset[];
  selectedAsset: string;
  onSelectAsset: (code: string) => void;
  news: NewsItem[];
  onTriggerAlert: () => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  isGenerating: boolean;
  latestPrices: Record<string, { price: number; change: number }>;
}

export default function TraderTerminal({
  assets,
  selectedAsset,
  onSelectAsset,
  news,
  onTriggerAlert,
  isSimulating,
  onToggleSimulation,
  isGenerating,
  latestPrices
}: TraderTerminalProps) {
  const [utcTime, setUtcTime] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // UTC clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getUTCHours()).padStart(2, "0");
      const mins = String(now.getUTCMinutes()).padStart(2, "0");
      const secs = String(now.getUTCSeconds()).padStart(2, "0");
      setUtcTime(`${hrs}:${mins}:${secs}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter quotes to display only FOREX assets
  const displayedAssets = useMemo(() => {
    let filtered = assets.filter(a => a.type === "FOREX");
    if (searchQuery.trim()) {
      filtered = filtered.filter(a => 
        a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [assets, searchQuery]);

  const getAssetDisplayName = (code: string) => {
    switch (code) {
      case "EURUSD": return { name: "EUR/USD", desc: "Euro / US Dollar", initials: "EU" };
      case "GBPUSD": return { name: "GBP/USD", desc: "Pound / US Dollar", initials: "GB" };
      case "USDJPY": return { name: "USD/JPY", desc: "US Dollar / Yen", initials: "UJ" };
      case "AUDUSD": return { name: "AUD/USD", desc: "Aussie / US Dollar", initials: "AU" };
      case "USDCAD": return { name: "USD/CAD", desc: "US Dollar / Loonie", initials: "UC" };
      case "USDCHF": return { name: "USD/CHF", desc: "USD / Swiss Franc", initials: "UF" };
      default: return { name: code, desc: "Forex Spot Price", initials: code.slice(0, 2) };
    }
  };

  const formatQuotePrice = (price: number, code: string) => {
    if (!price) return { base: "0.0000", pip: "" };
    let str = price.toFixed(5);
    if (code.includes("JPY")) {
      str = price.toFixed(3);
    }
    return { base: str.slice(0, -1), pip: str.slice(-1) };
  };

  const sentiment = useMemo(() => {
    const activeNews = news.filter(n => n.impact_direction !== "Neutral");
    if (activeNews.length === 0) return { bullish: 64, bearish: 36 };
    const bullishCount = activeNews.filter(n => n.impact_direction === "Bullish").length;
    const total = activeNews.length;
    const bullishPct = Math.round((bullishCount / total) * 100);
    return { bullish: bullishPct, bearish: 100 - bullishPct };
  }, [news]);

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

  return (
    <div className="w-full space-y-6 relative select-none">
      
      {/* Live Quotes Panel */}
      <div className="p-5 border border-[#1a1d26] bg-[#111317] rounded-xl shadow-lg relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a1d26] pb-4 mb-4">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              Live Forex Rates
            </h3>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest mt-1">
              Real-time currency liquidity feeds
            </p>
          </div>
          
          <div className="flex items-center gap-2.5">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Pair..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-[#1a1d26] bg-[#0c0d12]/60 text-[10px] rounded-lg text-white placeholder-zinc-650 focus:outline-none focus:border-emerald-500/40 w-36 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Quotes Table */}
        <div className="space-y-2">
          <div className="grid grid-cols-12 text-[8px] text-zinc-600 font-extrabold uppercase tracking-wider px-3 pb-1 border-b border-[#1a1d26]/40">
            <div className="col-span-5">Currency Pair</div>
            <div className="col-span-3 text-right">Price</div>
            <div className="col-span-3 text-right">Net Change</div>
            <div className="col-span-1"></div>
          </div>

          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
            {displayedAssets.length === 0 ? (
              <div className="py-6 text-center text-zinc-600 text-[10px] font-medium uppercase tracking-widest">
                No matching forex pairs found
              </div>
            ) : (
              displayedAssets.map((asset) => {
                const nameInfo = getAssetDisplayName(asset.code);
                const priceData = latestPrices[asset.code] || { price: 1.0842, change: 0.12 };
                const formatted = formatQuotePrice(priceData.price, asset.code);
                const isPositive = priceData.change >= 0;
                const isSelected = selectedAsset === asset.code;
                
                const sparkBars = isPositive 
                  ? [4, 7, 5, 8, 10] 
                  : [10, 8, 6, 5, 3];

                return (
                  <div
                    key={asset.code}
                    onClick={() => onSelectAsset(asset.code)}
                    className={`grid grid-cols-12 items-center p-3 border rounded-xl cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? "border-emerald-500/25 bg-emerald-500/[0.03] shadow-[0_0_15px_rgba(16,185,129,0.03)]" 
                        : "border-[#1a1d26] bg-[#0c0d12]/30 hover:border-zinc-800 hover:bg-[#0c0d12]/60"
                    }`}
                  >
                    {/* Initials & Labels */}
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-[10px] font-black border ${
                        isSelected 
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" 
                          : "border-[#1a1d26] bg-[#0c0d12] text-zinc-400"
                      }`}>
                        {nameInfo.initials}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[11px] font-black text-zinc-200 tracking-tight leading-none truncate">{nameInfo.name}</span>
                        <span className="block text-[8px] text-zinc-500 font-semibold uppercase tracking-widest mt-1 truncate">{nameInfo.desc}</span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="col-span-3 text-right font-mono font-bold text-xs tracking-tight text-zinc-200">
                      {formatted.base}
                      <sup className="text-[9px] font-black ml-[0.5px]">{formatted.pip}</sup>
                    </div>

                    {/* Change badge */}
                    <div className="col-span-3 text-right flex justify-end">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border tracking-tight ${
                        isPositive 
                          ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" 
                          : "bg-rose-500/5 border-rose-500/10 text-rose-400"
                      }`}>
                        {isPositive ? "+" : ""}{priceData.change.toFixed(2)}%
                      </span>
                    </div>

                    {/* Sparkline */}
                    <div className="col-span-1 flex items-end justify-end gap-[1.5px] h-3.5 px-1">
                      {sparkBars.map((height, i) => (
                        <div 
                          key={i} 
                          className={`w-[1.5px] rounded-t-sm ${isPositive ? "bg-emerald-500/35" : "bg-rose-500/35"}`} 
                          style={{ height: `${height * 10}%` }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Sentiment Gauge Card */}
      <div className="p-5 border border-[#1a1d26] bg-[#111317] rounded-xl shadow-lg space-y-4">
        <div className="flex justify-between items-center border-b border-[#1a1d26] pb-3">
          <div>
            <h4 className="text-xs font-black tracking-wider text-zinc-300 uppercase">Forex Sentiment Meter</h4>
            <p className="text-[8px] text-zinc-500 uppercase font-semibold tracking-wider mt-0.5">Aggregate retail & bank positioning</p>
          </div>
          <Info className="w-4 h-4 text-zinc-600 cursor-pointer hover:text-zinc-400" />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-black tracking-wider">
            <span className="text-emerald-400">BULLISH {sentiment.bullish}%</span>
            <span className="text-rose-400">BEARISH {sentiment.bearish}%</span>
          </div>
          
          <div className="w-full h-2 rounded-full overflow-hidden flex bg-[#0c0d12] border border-[#1a1d26]/40">
            <div className="h-full bg-emerald-500 shadow-[0_0_8px_#10b981]" style={{ width: `${sentiment.bullish}%` }} />
            <div className="h-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" style={{ width: `${sentiment.bearish}%` }} />
          </div>
          
          <p className="text-[8px] text-zinc-500 text-center font-medium leading-none pt-1">
            Calculated from active news headlines
          </p>
        </div>
      </div>

      {/* Breaking News Feed Card */}
      <div className="p-5 border border-[#1a1d26] bg-[#111317] rounded-xl shadow-lg space-y-4">
        <div className="flex justify-between items-center border-b border-[#1a1d26] pb-3">
          <div>
            <h4 className="text-xs font-black tracking-wider text-zinc-300 uppercase">Live Forex Macro Feed</h4>
            <p className="text-[8px] text-zinc-500 uppercase font-semibold tracking-wider mt-0.5">Impactful central bank & currency updates</p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={onToggleSimulation}
              className={`p-1.5 border rounded-lg transition-colors cursor-pointer ${
                isSimulating 
                  ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.06)]"
                  : "border-[#1a1d26] text-zinc-500 hover:text-zinc-300 hover:bg-[#0c0d12]"
              }`}
              title={isSimulating ? "Pause Simulation" : "Start Simulation"}
            >
              {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <button 
              onClick={onTriggerAlert}
              disabled={isGenerating}
              className="p-1.5 border border-[#1a1d26] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 rounded-lg cursor-pointer disabled:opacity-50"
              title="Force Trigger Macro Alert"
            >
              <RefreshCw className={`w-3 h-3 ${isGenerating ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Timeline Feed stack */}
        <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
          {news.length === 0 ? (
            <div className="p-4 text-center border border-dashed border-[#1a1d26] rounded-xl bg-[#0c0d12]/30 text-zinc-600 text-[10px]">
              Waiting for Forex news updates...
            </div>
          ) : (
            news.map((item) => {
              const isBullish = item.impact_direction === "Bullish";
              const isBearish = item.impact_direction === "Bearish";
              const hasHighSeverity = item.impact_severity === "High";
              
              let categoryText = "MARKET REPORT";
              let categoryColor = "text-zinc-400";
              let borderAccent = "border-l-[3px] border-l-[#1a1d26]";

              if (isBullish) {
                categoryText = hasHighSeverity ? "BREAKING ANALYSIS" : "BULLISH ALERT";
                categoryColor = "text-emerald-400";
                borderAccent = "border-l-[3px] border-l-emerald-500";
              } else if (isBearish) {
                categoryText = hasHighSeverity ? "VOLATILITY ALERT" : "BEARISH WARNING";
                categoryColor = "text-rose-400";
                borderAccent = "border-l-[3px] border-l-rose-500";
              }

              return (
                <div
                  key={item.id}
                  className={`p-3 bg-[#0c0d12]/40 border border-[#1a1d26] rounded-xl hover:border-zinc-800 hover:bg-[#0c0d12]/80 flex flex-col space-y-1.5 transition-all duration-200 ${borderAccent}`}
                >
                  <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest leading-none">
                    <span className={categoryColor}>{categoryText}</span>
                    <div className="flex items-center gap-1.5 text-zinc-500 font-bold">
                      <span>{getNewsRelativeTime(item.timestamp)}</span>
                      {hasHighSeverity && <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500 animate-pulse" />}
                    </div>
                  </div>

                  <h5 className="text-[10.5px] font-bold text-zinc-200 leading-snug">
                    {item.headline}
                  </h5>

                  <div className="flex justify-between items-center pt-1.5 text-[7px] text-zinc-500 uppercase tracking-widest font-black border-t border-[#1a1d26]/40 mt-1">
                    <span>Source: {item.source}</span>
                    <span className="text-zinc-450 font-black">{item.asset_tags}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
