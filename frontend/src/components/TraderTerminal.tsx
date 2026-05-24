"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Zap, 
  Search, 
  Bell, 
  Menu, 
  Info, 
  ArrowUpRight, 
  ArrowDownRight, 
  Play, 
  Pause,
  RefreshCw,
  CheckCircle,
  X
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
  const [activeTab, setActiveTab] = useState<"FOREX" | "COMMODITY">("FOREX");
  const [utcTime, setUtcTime] = useState("");
  const [simulatedOrder, setSimulatedOrder] = useState<any>(null);
  
  // Real-time clock update (UTC)
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

  // Filter assets based on activeTab (FOREX vs COMMODITIES)
  const displayedAssets = useMemo(() => {
    return assets.filter(a => a.type === activeTab).slice(0, 4);
  }, [assets, activeTab]);

  // Format quotes helper
  const getAssetDisplayName = (code: string) => {
    switch (code) {
      case "EURUSD": return { name: "EUR/USD", desc: "EURO / US DOLLAR", initials: "EU" };
      case "GBPUSD": return { name: "GBP/USD", desc: "POUND / US DOLLAR", initials: "GB" };
      case "USDJPY": return { name: "USD/JPY", desc: "USD / YEN", initials: "UJ" };
      case "AUDUSD": return { name: "AUD/USD", desc: "AUD / US DOLLAR", initials: "AU" };
      case "USDCAD": return { name: "USD/CAD", desc: "USD / CAD", initials: "UC" };
      case "USDCHF": return { name: "USD/CHF", desc: "USD / SWISS FRANC", initials: "UF" };
      case "GOLD": return { name: "XAU/USD", desc: "GOLD SPOT", initials: "AU" };
      case "SILVER": return { name: "XAG/USD", desc: "SILVER SPOT", initials: "AG" };
      case "WTI": return { name: "Crude Oil", desc: "WTI / US DOLLAR", initials: "WT" };
      case "BRENT": return { name: "Brent Crude", desc: "BRENT / US DOLLAR", initials: "BR" };
      case "NATURAL_GAS": return { name: "Natural Gas", desc: "NGAS / US DOLLAR", initials: "NG" };
      case "COPPER": return { name: "Copper", desc: "COPPER / USD", initials: "CU" };
      default: return { name: code, desc: "ASSET SPOT", initials: code.slice(0, 2) };
    }
  };

  // Extract pip components for representation
  const formatQuotePrice = (price: number, code: string) => {
    if (!price) return { base: "0.0000", pip: "" };
    
    let str = "";
    if (code.includes("JPY") || code === "WTI" || code === "BRENT" || code === "GOLD") {
      str = price.toFixed(2);
      // For 2 decimals, make the last one smaller
      return { base: str.slice(0, -1), pip: str.slice(-1) };
    } else if (code === "NATURAL_GAS" || code === "COPPER") {
      str = price.toFixed(3);
      return { base: str.slice(0, -1), pip: str.slice(-1) };
    } else {
      // 4 or 5 decimals
      str = price.toFixed(5);
      // E.g., 1.08425 -> base "1.0842", pip "5"
      return { base: str.slice(0, -1), pip: str.slice(-1) };
    }
  };

  // Calculate sentiment percentages dynamically based on news feed
  const sentiment = useMemo(() => {
    const activeNews = news.filter(n => n.impact_direction !== "Neutral");
    if (activeNews.length === 0) return { bullish: 64, bearish: 36 }; // default from screenshot
    
    const bullishCount = activeNews.filter(n => n.impact_direction === "Bullish").length;
    const total = activeNews.length;
    const bullishPct = Math.round((bullishCount / total) * 100);
    return {
      bullish: bullishPct,
      bearish: 100 - bullishPct
    };
  }, [news]);

  // Handle simulated trade
  const handleTrade = (direction: "BUY" | "SELL") => {
    const selectedAssetInfo = getAssetDisplayName(selectedAsset);
    const priceData = latestPrices[selectedAsset] || { price: 1.0842, change: 0.12 };
    const formatted = formatQuotePrice(priceData.price, selectedAsset);
    
    setSimulatedOrder({
      direction,
      assetName: selectedAssetInfo.name,
      price: `${formatted.base}${formatted.pip}`,
      volume: "1.00 Lot",
      timestamp: new Date().toLocaleTimeString()
    });
  };

  // Convert news items to relative times or styled tags
  const getNewsRelativeTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins === 1) return "1 min ago";
    if (mins < 60) return `${mins} mins ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs === 1) return "1 hour ago";
    return `${hrs} hours ago`;
  };

  return (
    <div className="relative w-full max-w-[380px] mx-auto rounded-3xl border-2 border-indigo-500/20 bg-[#090a0c] text-white shadow-[0_20px_50px_rgba(0,0,0,0.8),_0_0_30px_rgba(99,102,241,0.05)] overflow-hidden font-sans select-none flex flex-col h-[820px] transition-all duration-300">
      
      {/* Device notch decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-4 bg-black rounded-b-xl z-20 flex items-center justify-center">
        <div className="w-12 h-1 bg-zinc-900 rounded-full" />
      </div>

      {/* 1. Header Bar */}
      <header className="relative z-10 pt-6 px-4 pb-3 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/40">
        <div className="flex items-center gap-3">
          <Menu className="w-4 h-4 text-zinc-400 hover:text-white cursor-pointer transition-colors" />
          <span className="text-[11px] font-black tracking-widest text-white uppercase">TRADERTERMINAL</span>
        </div>
        <div className="flex items-center gap-3">
          <Search className="w-4 h-4 text-zinc-400 hover:text-white cursor-pointer transition-colors" />
          <div className="relative">
            <Bell className="w-4 h-4 text-zinc-400 hover:text-white cursor-pointer transition-colors" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>
        </div>
      </header>

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
        
        {/* 2. Market Overview */}
        <section className="space-y-2">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Market Overview</h2>
            <p className="text-[10px] text-zinc-500 font-light mt-0.5">Real-time institutional liquidity feeds</p>
          </div>
          
          <div className="flex items-center justify-between p-3 border border-zinc-900/80 rounded-xl bg-zinc-950/30">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 glow-text-emerald">MARKET STATUS: OPEN</span>
            </div>
            <span className="text-[9px] font-mono text-zinc-500 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900">UTC {utcTime}</span>
          </div>
        </section>

        {/* 3. Live Quotes */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-400">Live Quotes</h3>
            
            {/* Segmented Filter Tab */}
            <div className="flex p-0.5 border border-zinc-800 rounded-lg bg-zinc-950/80">
              <button 
                onClick={() => setActiveTab("FOREX")}
                className={`text-[8px] font-bold px-3 py-1 rounded transition-all cursor-pointer ${
                  activeTab === "FOREX" 
                    ? "bg-white text-black shadow-sm" 
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                FOREX
              </button>
              <button 
                onClick={() => setActiveTab("COMMODITY")}
                className={`text-[8px] font-bold px-3 py-1 rounded transition-all cursor-pointer ${
                  activeTab === "COMMODITY" 
                    ? "bg-white text-black shadow-sm" 
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                COMMODITIES
              </button>
            </div>
          </div>

          {/* Quotes Table */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 text-[8px] text-zinc-600 font-extrabold uppercase tracking-wider px-2">
              <div className="col-span-5">Asset</div>
              <div className="col-span-3 text-right">Price</div>
              <div className="col-span-3 text-right">Change %</div>
              <div className="col-span-1"></div>
            </div>

            <div className="space-y-1.5">
              {displayedAssets.map((asset) => {
                const nameInfo = getAssetDisplayName(asset.code);
                const priceData = latestPrices[asset.code] || { price: 1.0842, change: 0.12 };
                const formatted = formatQuotePrice(priceData.price, asset.code);
                const isPositive = priceData.change >= 0;
                const isSelected = selectedAsset === asset.code;

                // Dynamic mini bar-chart sparkline data
                const sparkBars = isPositive 
                  ? [4, 7, 5, 8, 10] 
                  : [10, 8, 6, 5, 3];

                return (
                  <div
                    key={asset.code}
                    onClick={() => onSelectAsset(asset.code)}
                    className={`grid grid-cols-12 items-center p-2.5 border rounded-xl cursor-pointer transition-all duration-300 ${
                      isSelected 
                        ? "border-emerald-500/35 bg-emerald-500/[0.04] shadow-[0_0_12px_rgba(16,185,129,0.04)]" 
                        : "border-zinc-900/60 bg-zinc-950/20 hover:border-zinc-800 hover:bg-zinc-950/40"
                    }`}
                  >
                    {/* Circle Badge + Name */}
                    <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-extrabold border ${
                        isSelected 
                          ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-400" 
                          : "border-zinc-800 bg-zinc-900/60 text-zinc-300"
                      }`}>
                        {nameInfo.initials}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[11px] font-bold text-zinc-100 tracking-tight leading-tight truncate">{nameInfo.name}</span>
                        <span className="block text-[8px] text-zinc-500 font-light truncate">{nameInfo.desc}</span>
                      </div>
                    </div>

                    {/* Price with Pip superscript */}
                    <div className="col-span-3 text-right font-semibold text-xs tracking-tight text-zinc-200">
                      {formatted.base}
                      <sup className="text-[9px] font-extrabold ml-[0.5px]">{formatted.pip}</sup>
                    </div>

                    {/* Change % pill */}
                    <div className="col-span-3 text-right flex justify-end">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border tracking-tight ${
                        isPositive 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 glow-text-emerald" 
                          : "bg-rose-500/10 border-rose-500/20 text-rose-400 glow-text-rose"
                      }`}>
                        {isPositive ? "+" : ""}{priceData.change.toFixed(2)}%
                      </span>
                    </div>

                    {/* Sparkline mini-bars */}
                    <div className="col-span-1 flex items-end justify-end gap-[1.5px] h-3 px-1">
                      {sparkBars.map((height, i) => (
                        <div 
                          key={i} 
                          className={`w-[1.5px] rounded-t-sm ${isPositive ? "bg-emerald-500/40" : "bg-rose-500/40"}`} 
                          style={{ height: `${height * 10}%` }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <button 
              onClick={() => onSelectAsset(displayedAssets[0]?.code || "GOLD")}
              className="w-full text-center py-2 bg-zinc-950/60 border border-zinc-900 rounded-xl hover:border-zinc-800 transition-colors text-[9px] font-bold uppercase tracking-wider text-zinc-400 mt-2 cursor-pointer"
            >
              View all assets ({assets.length})
            </button>
          </div>
        </section>

        {/* 4. Sentiment */}
        <section className="p-3.5 border border-zinc-900 bg-zinc-950/20 rounded-xl space-y-3.5">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-extrabold tracking-widest text-zinc-400 uppercase">Sentiment</h4>
            <Info className="w-3 h-3 text-zinc-600 cursor-pointer hover:text-zinc-400" />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-extrabold tracking-wide">
              <span className="text-emerald-400 glow-text-emerald">BULLISH {sentiment.bullish}%</span>
              <span className="text-rose-400 glow-text-rose">BEARISH {sentiment.bearish}%</span>
            </div>
            
            {/* Split Progress Bar */}
            <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-zinc-900">
              <div className="h-full bg-emerald-500" style={{ width: `${sentiment.bullish}%` }} />
              <div className="h-full bg-rose-500" style={{ width: `${sentiment.bearish}%` }} />
            </div>
            
            <p className="text-[8px] text-zinc-500 text-center font-light leading-none pt-0.5">
              Based on active market-shaking precedent indicators
            </p>
          </div>

          {/* Top News Volume (Precedents volume) */}
          <div className="space-y-1.5 pt-2.5 border-t border-zinc-900/60 text-[9px]">
            <span className="block text-zinc-500 uppercase tracking-widest font-extrabold text-[8px]">TOP NEWS VOLUME</span>
            <div className="flex justify-between text-zinc-200">
              <span>FED Interest Rates</span>
              <span className="font-semibold text-zinc-400">High</span>
            </div>
            <div className="flex justify-between text-zinc-200">
              <span>US Non-Farm Payroll</span>
              <span className="font-semibold text-zinc-400">Medium</span>
            </div>
          </div>
        </section>

        {/* 5. Instant Trade */}
        <section className="p-3.5 border border-zinc-900 bg-zinc-950/20 rounded-xl space-y-3">
          <h4 className="text-[10px] font-extrabold tracking-widest text-amber-500 uppercase">Instant Trade</h4>
          
          <div className="grid grid-cols-2 gap-3.5">
            <button
              onClick={() => handleTrade("BUY")}
              className="py-3 px-4 bg-[#00c076] hover:bg-[#00d683] transition-colors rounded-xl text-center cursor-pointer shadow-[0_4px_12px_rgba(0,192,118,0.2)] active:scale-95 duration-150"
            >
              <span className="block font-black text-xs text-white leading-tight">BUY</span>
              <span className="block text-[8px] text-white/70 uppercase font-bold tracking-wider mt-0.5">MARKET</span>
            </button>
            
            <button
              onClick={() => handleTrade("SELL")}
              className="py-3 px-4 bg-[#ff4a6b] hover:bg-[#ff5d7b] transition-colors rounded-xl text-center cursor-pointer shadow-[0_4px_12px_rgba(255,74,107,0.2)] active:scale-95 duration-150"
            >
              <span className="block font-black text-xs text-white leading-tight">SELL</span>
              <span className="block text-[8px] text-white/70 uppercase font-bold tracking-wider mt-0.5">MARKET</span>
            </button>
          </div>
        </section>

        {/* 6. Breaking Analysis Timeline (News timeline) */}
        <section className="space-y-3.5">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-extrabold tracking-widest text-zinc-400 uppercase">Breaking Feed</h4>
            
            {/* Simulation controls */}
            <div className="flex gap-2">
              <button 
                onClick={onToggleSimulation}
                className={`p-1.5 border rounded-lg transition-colors cursor-pointer ${
                  isSimulating 
                    ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.06)]"
                    : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
                }`}
                title={isSimulating ? "Pause Simulation" : "Start Simulation"}
              >
                {isSimulating ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
              </button>
              <button 
                onClick={onTriggerAlert}
                disabled={isGenerating}
                className="p-1.5 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 rounded-lg cursor-pointer disabled:opacity-50"
                title="Force Trigger Macro Alert"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isGenerating ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Timeline Stack */}
          <div className="space-y-3">
            {news.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-zinc-900 rounded-xl bg-zinc-950/10 text-zinc-600 text-[10px]">
                Waiting for market-impacting macro updates...
              </div>
            ) : (
              news.slice(0, 5).map((item) => {
                const isBullish = item.impact_direction === "Bullish";
                const isBearish = item.impact_direction === "Bearish";
                const hasHighSeverity = item.impact_severity === "High";
                
                // Color mapping matching screenshot accents
                let categoryText = "MARKET REPORT";
                let categoryColor = "text-zinc-400";
                let borderAccent = "border-l-[3px] border-l-zinc-700";

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
                    className={`p-3 bg-zinc-950/30 border border-zinc-900/60 rounded-xl transition-all duration-300 hover:border-zinc-850 hover:bg-zinc-950/50 flex flex-col space-y-1.5 ${borderAccent}`}
                  >
                    <div className="flex items-center justify-between text-[8px] font-extrabold uppercase tracking-widest leading-none">
                      <span className={categoryColor}>{categoryText}</span>
                      <div className="flex items-center gap-1 text-zinc-500 font-bold lowercase">
                        <span>{getNewsRelativeTime(item.timestamp)}</span>
                        {hasHighSeverity && <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500 animate-pulse" />}
                      </div>
                    </div>

                    <h5 className="text-[11px] font-bold text-zinc-200 leading-snug">
                      {item.headline}
                    </h5>

                    {/* Small tag row */}
                    <div className="flex justify-between items-center pt-1 text-[7px] text-zinc-500 uppercase tracking-widest font-semibold border-t border-zinc-900/40 mt-0.5">
                      <span>SRC: {item.source}</span>
                      <span>{item.asset_tags.split(",")[0]}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* 7. Home screen swipe bar decoration */}
      <div className="h-4 bg-[#090a0c] z-10 flex items-center justify-center pb-2">
        <div className="w-28 h-1 bg-zinc-700 rounded-full" />
      </div>

      {/* 8. Order Execution Modal Overlay */}
      {simulatedOrder && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-30 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-[280px] p-5 border border-zinc-800 bg-[#0d0e12] rounded-2xl text-center space-y-4 shadow-[0_15px_40px_rgba(0,0,0,0.9)] animate-scale-up relative">
            <button 
              onClick={() => setSimulatedOrder(null)}
              className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#00c076] flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(0,192,118,0.1)]">
              <CheckCircle className="w-6 h-6" />
            </div>

            <div>
              <h5 className="text-xs font-black uppercase tracking-wider text-emerald-400 leading-none">ORDER EXECUTED</h5>
              <p className="text-[9px] text-zinc-500 uppercase mt-1">Simulated Market Trade Success</p>
            </div>

            <div className="p-3 border border-zinc-900 bg-zinc-950/40 rounded-xl space-y-2 text-[10px] text-left text-zinc-400 font-mono">
              <div className="flex justify-between">
                <span>ACTION:</span>
                <span className={`font-bold ${simulatedOrder.direction === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
                  {simulatedOrder.direction}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ASSET:</span>
                <span className="text-white font-bold">{simulatedOrder.assetName}</span>
              </div>
              <div className="flex justify-between">
                <span>PRICE:</span>
                <span className="text-white font-bold">{simulatedOrder.price}</span>
              </div>
              <div className="flex justify-between">
                <span>VOLUME:</span>
                <span className="text-white font-bold">{simulatedOrder.volume}</span>
              </div>
              <div className="flex justify-between text-[8px] text-zinc-600 border-t border-zinc-900/60 pt-1.5">
                <span>TIME:</span>
                <span>{simulatedOrder.timestamp}</span>
              </div>
            </div>

            <button
              onClick={() => setSimulatedOrder(null)}
              className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-[#00c076] rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
