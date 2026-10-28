import React from 'react';
import { 
  Home,
  Clock,
  Wrench,
  ClipboardList,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  FileCheck,
  Sparkles
} from 'lucide-react';
import { AppNavMode } from '../types';

interface SidebarProps {
  currentNav: AppNavMode;
  onSelectNav: (nav: AppNavMode) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentNav,
  onSelectNav,
  isCollapsed,
  onToggleCollapse,
}) => {
  const navItems = [
    { id: 'home' as AppNavMode, label: 'Home', icon: Home },
    { id: 'recents' as AppNavMode, label: 'Recents', icon: Clock },
    { id: 'tools' as AppNavMode, label: 'Tools', icon: Wrench },
    { id: 'history' as AppNavMode, label: 'Tasks History', icon: ClipboardList },
    { id: 'preferences' as AppNavMode, label: 'Preferences', icon: Settings },
  ];

  return (
    <aside
      className={`bg-[#18181b] border-r border-[#27272a] flex flex-col h-full shrink-0 select-none transition-all duration-200 ${
        isCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Brand Header */}
      <div className="p-3 border-b border-[#27272a] flex items-center justify-between">
        <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? 'justify-center w-full' : ''}`}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-md shadow-brand-500/20 shrink-0">
            <FileCheck className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-sm text-white tracking-tight flex items-center gap-1.5 truncate">
                OmniPDF
                <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/30">
                  PRO
                </span>
              </h1>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <button
            onClick={onToggleCollapse}
            title="Recolher barra lateral"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {isCollapsed && (
        <div className="p-2 flex justify-center border-b border-[#27272a]">
          <button
            onClick={onToggleCollapse}
            title="Expandir barra lateral"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Buttons (Identical to iLovePDF screenshot) */}
      <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentNav === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectNav(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left text-xs font-medium ${
                isActive
                  ? 'bg-[#27272a] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:bg-[#27272a]/60 hover:text-slate-200'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-rose-400' : 'text-slate-400'}`} />
              
              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}

              {/* Active Orange Indicator Bar on Right (Exact iLovePDF match) */}
              {isActive && (
                <div className="absolute right-0 top-1.5 bottom-1.5 w-1 rounded-l-full bg-rose-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-[#27272a] text-[11px] text-slate-500 flex items-center justify-between">
        {!isCollapsed ? (
          <>
            <span className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              Offline & Seguro
            </span>
            <span className="font-mono text-[10px]">v1.1.0</span>
          </>
        ) : (
          <div className="w-full flex justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
        )}
      </div>
    </aside>
  );
};
