"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Search, Globe, Activity } from "lucide-react";

interface Asset {
  code: string;
  name: string;
  type: string;
}

interface TraderTerminalProps {
  assets: Asset[];
  selectedAsset: string;
  onSelectAsset: (code: string) => void;
  latestPrices: Record<string, { price: number; change: number }>;
}

// Inner Component to track individual Quote Card ticks and trigger flashes
interface QuoteCardProps {
  asset: Asset;
  selectedAsset: string;
  priceData: { price: number; change: number };
  onSelectAsset: (code: string) => void;
}

function QuoteCard({ asset, selectedAsset, priceData, onSelectAsset }: QuoteCardProps) {
  const [tickClass, setTickClass] = useState("");
  const prevPriceRef = useRef(priceData.price);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (priceData.price !== prevPriceRef.current) {
      if (priceData.price > prevPriceRef.current) {
        setTickClass("animate-tick-up");
      } else {
        setTickClass("animate-tick-down");
      }
      prevPriceRef.current = priceData.price;
      const timer = setTimeout(() => setTickClass(""), 1200);
      return () => clearTimeout(timer);
    }
  }, [priceData.price]);

  const getAssetDisplayName = (code: string) => {
    switch (code) {
      case "EURUSD": return { name: "EUR/USD", desc: "Euro / US Dollar", initials: "EU" };
      case "GBPUSD": return { name: "GBP/USD", desc: "Pound / US Dollar", initials: "GB" };
      case "USDJPY": return { name: "USD/JPY", desc: "US Dollar / Yen", initials: "UJ" };
      case "AUDUSD": return { name: "AUD/USD", desc: "Aussie / US Dollar", initials: "AU" };
      case "USDCAD": return { name: "USD/CAD", desc: "US Dollar / Loonie", initials: "UC" };
      case "USDCHF": return { name: "USD/CHF", desc: "USD / Swiss Franc", initials: "UF" };
      case "GOLD": return { name: "GOLD Spot", desc: "Gold vs USD", initials: "AU" };
      case "SILVER": return { name: "SILVER Spot", desc: "Silver vs USD", initials: "AG" };
      case "WTI": return { name: "WTI Crude", desc: "Crude Oil WTI", initials: "WT" };
      case "BRENT": return { name: "Brent Crude", desc: "Brent Crude Oil", initials: "BR" };
      case "NATURAL_GAS": return { name: "Natural Gas", desc: "Henry Hub Gas", initials: "NG" };
      case "COPPER": return { name: "Copper", desc: "Copper COMEX", initials: "CU" };
      default: return { name: code, desc: "Spot Rate", initials: code.slice(0, 2) };
    }
  };

  const formatQuotePrice = (price: number, code: string) => {
    if (!price) return { base: "0.0000", pip: "" };
    let str = "";
    if (code.includes("JPY") || code === "WTI" || code === "BRENT" || code === "GOLD") {
      str = price.toFixed(2);
      return { base: str.slice(0, -1), pip: str.slice(-1) };
    } else if (code === "NATURAL_GAS" || code === "COPPER" || code === "SILVER") {
      str = price.toFixed(3);
      return { base: str.slice(0, -1), pip: str.slice(-1) };
    } else {
      str = price.toFixed(5);
      return { base: str.slice(0, -1), pip: str.slice(-1) };
    }
  };

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--card-mouse-x", `${x}px`);
    card.style.setProperty("--card-mouse-y", `${y}px`);
  };

  const nameInfo = getAssetDisplayName(asset.code);
  const formatted = formatQuotePrice(priceData.price, asset.code);
  const isPositive = priceData.change >= 0;
  const isSelected = selectedAsset === asset.code;

  // SVG Sparkline path
  const sparkPoints = isPositive 
    ? "M 0 12 L 6 9 L 12 11 L 18 3 L 24 7 L 30 1 L 36 2" 
    : "M 0 2 L 6 7 L 12 4 L 18 10 L 24 8 L 30 13 L 36 12";

  return (
    <div
      ref={cardRef}
      onClick={() => onSelectAsset(asset.code)}
      onMouseMove={handleCardMouseMove}
      className={`modern-card p-4 flex flex-col justify-between min-h-[145px] cursor-pointer transition-all duration-300 card-tilt-hover hud-node-border ${
        isSelected 
          ? "border-[#00f0ff]/40 bg-blue-500/[0.03] shadow-[0_0_20px_rgba(0,240,255,0.08)] scale-[1.02]" 
          : "border-[#1b2742]/40 bg-[#0c0d12]/40"
      } ${tickClass}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center text-[10px] font-black border transition-colors ${
            isSelected 
              ? "border-[#00f0ff]/30 bg-[#00f0ff]/10 text-[#00f0ff]" 
              : "border-[#1b2742]/40 bg-[#06080d] text-zinc-400"
          }`}>
            {nameInfo.initials}
          </div>
          <div className="min-w-0 leading-none">
            <span className="block text-[11px] font-black text-zinc-100 truncate">{nameInfo.name}</span>
            <span className="block text-[7.5px] text-zinc-550 font-bold uppercase tracking-widest mt-1.5 truncate">{nameInfo.desc}</span>
          </div>
        </div>
        
        {/* Pulsing indicator */}
        <span className={`w-1.5 h-1.5 rounded-full transition-all ${
          isSelected 
            ? "bg-[#00f0ff] animate-pulse shadow-[0_0_8px_#00f0ff]" 
            : "bg-zinc-800"
        }`} />
      </div>

      {/* Price */}
      <div className="my-2.5 flex items-baseline gap-1">
        <span className="text-xl font-black font-mono tracking-tight text-white select-all">
          {formatted.base}
        </span>
        <span className="text-xs font-black text-[#00f0ff] font-mono leading-none">
          {formatted.pip}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-end justify-between w-full pt-2 border-t border-[#1b2742]/30">
        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border tracking-tight leading-none ${
          isPositive 
            ? "bg-[#00ff88]/5 border-[#00ff88]/20 text-[#00ff88]" 
            : "bg-[#ff0055]/5 border-[#ff0055]/20 text-[#ff0055]"
        }`}>
          {isPositive ? "+" : ""}{priceData.change.toFixed(2)}%
        </span>

        {/* Dynamic Mini Sparkline SVG */}
        <svg className="w-10 h-5 opacity-70 group-hover:opacity-100 transition-opacity" viewBox="0 0 36 15">
          <path 
            d={sparkPoints} 
            fill="none" 
            stroke={isPositive ? "#00ff88" : "#ff0055"} 
            strokeWidth="1.5" 
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

export default function TraderTerminal({
  assets,
  selectedAsset,
  onSelectAsset,
  latestPrices
}: TraderTerminalProps) {
  const [activeTab, setActiveTab] = useState<"FOREX" | "COMMODITY">("FOREX");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter assets by tab & search
  const displayedAssets = useMemo(() => {
    let filtered = assets.filter(a => a.type === activeTab);
    if (searchQuery.trim()) {
      filtered = filtered.filter(a => 
        a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [assets, activeTab, searchQuery]);

  return (
    <div className="w-full space-y-4">
      {/* Search & Tabs Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b2742]/30 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00f0ff] animate-ping" />
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            Live Market Rates
          </h3>
        </div>
        
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-650 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ticker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-[#1b2742]/40 bg-[#0c0d12]/50 text-[10px] rounded-lg text-white placeholder-zinc-650 focus:outline-none focus:border-blue-500/40 w-32 sm:w-36 transition-all"
            />
          </div>

          <div className="flex p-0.5 border border-[#1b2742]/40 rounded-lg bg-[#0c0d12]">
            {(["FOREX", "COMMODITY"] as const).map((tab) => (
              <button 
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSearchQuery("");
                }}
                className={`text-[8.5px] font-black px-3 py-1 rounded transition-all cursor-pointer uppercase ${
                  activeTab === tab 
                    ? "bg-[#111317] text-blue-450 border border-blue-500/10 shadow-sm" 
                    : "text-zinc-550 hover:text-zinc-300"
                }`}
              >
                {tab === "FOREX" ? "Forex" : "Commodities"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-2 gap-4">
        {displayedAssets.length === 0 ? (
          <div className="col-span-full py-12 text-center text-zinc-600 text-[10px] uppercase font-black tracking-widest border border-dashed border-[#1b2742]/40 rounded-2xl bg-[#0c0d12]/20">
            No active feeds matched
          </div>
        ) : (
          displayedAssets.map((asset) => {
            const priceData = latestPrices[asset.code] || { price: 0, change: 0 };
            return (
              <QuoteCard
                key={asset.code}
                asset={asset}
                selectedAsset={selectedAsset}
                priceData={priceData}
                onSelectAsset={onSelectAsset}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
