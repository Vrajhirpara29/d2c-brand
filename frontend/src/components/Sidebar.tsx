import React from "react";
import { 
  BarChart3, 
  Zap, 
  Brain, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck
} from "lucide-react";

interface SidebarProps {
  currentView: "COT" | "COPIER" | "AI_CALC" | "SETTINGS";
  onChangeView: (view: "COT" | "COPIER" | "AI_CALC" | "SETTINGS") => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  currentView,
  onChangeView,
  isCollapsed,
  onToggleCollapse
}: SidebarProps) {
  const menuItems = [
    {
      id: "COT" as const,
      label: "Institutional Flows",
      sublabel: "COT Positioning",
      icon: BarChart3
    },
    {
      id: "COPIER" as const,
      label: "MT Copy Trading",
      sublabel: "Trade Copier Workstation",
      icon: Zap
    },
    {
      id: "AI_CALC" as const,
      label: "AI Precedent Matcher",
      sublabel: "Semantic Risk Engine",
      icon: Brain
    },
    {
      id: "SETTINGS" as const,
      label: "System Settings",
      sublabel: "Risk & Parameters",
      icon: Settings
    }
  ];

  return (
    <aside 
      className={`fixed md:sticky top-0 left-0 h-screen bg-[#0b0c10] border-r border-[#1a1d26] flex flex-col transition-all duration-300 z-30 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-[#1a1d26] justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <div className="animate-fade-in">
              <h2 className="text-xs font-black tracking-wider text-white uppercase leading-none">
                TRADEFXBOOK
              </h2>
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest block mt-0.5">
                MACRO ENGINE
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-2.5 py-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-250 cursor-pointer text-left group relative ${
                isActive
                  ? "bg-emerald-500/5 text-emerald-400 border border-emerald-500/15 shadow-[0_0_15px_rgba(16,185,129,0.03)]"
                  : "text-zinc-500 hover:text-zinc-300 border border-transparent hover:bg-zinc-900/40"
              }`}
            >
              {/* Active Highlight Line */}
              {isActive && (
                <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-emerald-400 rounded-r" />
              )}
              
              <Icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-250 group-hover:scale-105 ${
                isActive ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"
              }`} />
              
              {!isCollapsed && (
                <div className="flex flex-col leading-none animate-fade-in">
                  <span className="text-xs font-bold">{item.label}</span>
                  <span className="text-[8px] text-zinc-500 mt-1 uppercase font-semibold tracking-wider">
                    {item.sublabel}
                  </span>
                </div>
              )}

              {/* Tooltip for Collapsed State */}
              {isCollapsed && (
                <div className="absolute left-16 scale-0 group-hover:scale-100 transition-all duration-150 origin-left ml-4 px-2 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-200 font-semibold uppercase tracking-widest whitespace-nowrap pointer-events-none z-50">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle Footer */}
      <div className="p-3 border-t border-[#1a1d26] flex justify-end">
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-950/40 border border-[#1a1d26] text-zinc-500 hover:text-zinc-300 cursor-pointer hover:bg-zinc-900/60"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
