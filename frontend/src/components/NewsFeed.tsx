"use client";

import React, { useState, useEffect, useRef } from "react";
import { AlertCircle, Clock, Zap, ArrowUpRight, ArrowDownRight, Minus, RefreshCw, Play, Pause } from "lucide-react";

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

interface NewsFeedProps {
  initialNews: NewsItem[];
  onNewEvent: () => void;
}

export default function NewsFeed({ initialNews, onNewEvent }: NewsFeedProps) {
  const [news, setNews] = useState<NewsItem[]>(initialNews);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state with props
  useEffect(() => {
    setNews(initialNews);
  }, [initialNews]);

  // Handle single manual news generation
  const handleGenerateNews = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_BASE_URL}/api/news/generate`, {
        method: "POST"
      });
      if (res.ok) {
        onNewEvent(); // Trigger refresh in parent
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

  const getTagsList = (tagsStr: string) => {
    if (!tagsStr) return [];
    return tagsStr.split(",").filter(t => t.trim());
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case "HIGH":
        return "bg-rose-500/10 border-rose-500/30 text-rose-400 font-extrabold shadow-[0_0_10px_rgba(244,63,94,0.04)]";
      case "MEDIUM":
        return "bg-amber-500/10 border-amber-500/25 text-amber-400 font-bold";
      default:
        return "bg-zinc-500/10 border-zinc-700/50 text-zinc-400 font-medium";
    }
  };

  const getDirectionDetails = (direction: string) => {
    switch (direction.toUpperCase()) {
      case "BULLISH":
        return {
          bg: "bg-emerald-500/5 border-emerald-500/30 text-emerald-400 glow-text-emerald",
          icon: <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />,
          label: "BULLISH IMPACT"
        };
      case "BEARISH":
        return {
          bg: "bg-rose-500/5 border-rose-500/30 text-rose-400 glow-text-rose",
          icon: <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />,
          label: "BEARISH IMPACT"
        };
      default:
        return {
          bg: "bg-zinc-500/5 border-zinc-700/50 text-zinc-400",
          icon: <Minus className="w-3.5 h-3.5 text-zinc-400" />,
          label: "NEUTRAL IMPACT"
        };
    }
  };

  const formatTime = (timeStr: string) => {
    const d = new Date(timeStr);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header controls bar */}
      <div className="flex items-center justify-between p-4 glass-panel bg-zinc-950/20 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
          <span className="text-xs font-bold tracking-widest text-zinc-200">MARKET SHAKING EVENTS</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 border rounded-lg transition-all duration-300 font-medium cursor-pointer ${
              isSimulating 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.08)]" 
                : "border-zinc-800/80 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
            }`}
          >
            {isSimulating ? (
              <>
                <Pause className="w-3 h-3 animate-spin" /> SIMULATING
              </>
            ) : (
              <>
                <Play className="w-3 h-3" /> SIMULATE FEED
              </>
            )}
          </button>
          
          <button
            onClick={handleGenerateNews}
            disabled={isGenerating}
            className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 border border-emerald-500/20 rounded-lg bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all duration-300 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isGenerating ? "animate-spin" : ""}`} />
            TRIGGER ALERT
          </button>
        </div>
      </div>

      {/* Feed list timeline */}
      <div className="flex-1 overflow-y-auto pr-1.5 space-y-4 max-h-[680px]">
        {news.length === 0 ? (
          <div className="h-[250px] flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/10 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-zinc-700 mb-3 animate-pulse" />
            <p className="text-xs font-semibold text-zinc-400">No market-impacting news found.</p>
            <p className="text-[10px] text-zinc-600 mt-1 max-w-[240px] leading-relaxed">Only macroeconomic stories with significant bullish or bearish signals will be logged here.</p>
            <button 
              onClick={handleGenerateNews} 
              className="text-[10px] font-bold text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 rounded-lg mt-4 hover:bg-emerald-500/10 cursor-pointer"
            >
              Generate Impact Event
            </button>
          </div>
        ) : (
          news.map((item, idx) => {
            const dir = getDirectionDetails(item.impact_direction);
            const tags = getTagsList(item.asset_tags);
            
            return (
              <div 
                key={item.id} 
                className="group relative flex gap-4 p-5 glass-panel bg-zinc-950/10 hover:bg-zinc-950/30 animate-slide-up hover:border-zinc-800/80 transition-all-smooth"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {/* Timeline connector line */}
                {idx < news.length - 1 && (
                  <div className="absolute left-[33px] top-[48px] bottom-[-24px] w-[1px] bg-gradient-to-b from-zinc-800 via-zinc-800/40 to-transparent"></div>
                )}
                
                {/* Time bubble */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center w-[38px] h-[38px] rounded-full border border-zinc-800/80 bg-zinc-950/60 text-[10px] font-semibold text-zinc-400 tracking-tight shadow-inner">
                  {formatTime(item.timestamp)}
                </div>

                {/* Content block */}
                <div className="flex-grow min-w-0 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">{item.source}</span>
                    
                    {/* Visual Asset tag badges */}
                    <div className="flex gap-1">
                      {tags.map(tag => (
                        <span 
                          key={tag} 
                          className="text-[9px] font-medium px-2 py-0.5 border border-zinc-800 rounded bg-zinc-900/60 text-zinc-300 transition-colors group-hover:border-zinc-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <h3 className="text-sm font-semibold text-zinc-200 leading-snug group-hover:text-emerald-400 transition-colors duration-300">
                    {item.headline}
                  </h3>
                  
                  {item.summary && (
                    <p className="text-xs text-zinc-400 leading-relaxed font-light">
                      {item.summary}
                    </p>
                  )}

                  {/* Impact matrix badges layout */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-3 border-t border-zinc-900/60">
                    {/* Badge 1: Direction detail */}
                    <div className={`flex items-center justify-center gap-1.5 py-1.5 px-3 border rounded-lg text-[10px] font-bold tracking-wider ${dir.bg}`}>
                      {dir.icon}
                      <span>{dir.label}</span>
                    </div>
                    {/* Badge 1.5: Severity badge */}
                    <div className={`flex items-center justify-center py-1.5 px-3 border rounded-lg text-[10px] tracking-wider font-bold ${getSeverityStyle(item.impact_severity)}`}>
                      <span>{item.impact_severity.toUpperCase()} IMPACT</span>
                    </div>
                    {/* Badge 2: Volatility bounds */}
                    <div className="flex flex-col justify-center border border-zinc-900/80 rounded-lg py-1 px-3 bg-zinc-950/30">
                      <span className="text-[7.5px] text-zinc-500 uppercase tracking-widest font-bold">4H Volatility</span>
                      <span className="font-semibold text-zinc-200 text-[10px] tracking-tight">{item.volatility_4h}</span>
                    </div>
                    {/* Badge 3: Confidence percent */}
                    <div className="flex flex-col justify-center border border-zinc-900/80 rounded-lg py-1 px-3 bg-zinc-950/30">
                      <span className="text-[7.5px] text-zinc-500 uppercase tracking-widest font-bold">Confidence</span>
                      <span className="font-semibold text-zinc-200 text-[10px] tracking-tight">{Math.round(item.confidence_score * 100)}% Match</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
