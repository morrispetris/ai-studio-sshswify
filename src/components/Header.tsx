import React from 'react';
import { 
  Terminal, 
  Plus, 
  X, 
  Settings, 
  Server, 
  Cloud, 
  Lock, 
  Unlock, 
  Keyboard as KeyboardIcon 
} from 'lucide-react';
import { TerminalSession, AppSettings } from '../types.js';

interface HeaderProps {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCloseSession: (id: string) => void;
  onOpenConnector: () => void;
  onOpenSettings: () => void;
  onOpenCloudRunInfo: () => void;
  settings: AppSettings;
  onToggleVirtualKeyboard: () => void;
  sharedKeyRequired: boolean;
  hasValidKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCloseSession,
  onOpenConnector,
  onOpenSettings,
  onOpenCloudRunInfo,
  settings,
  onToggleVirtualKeyboard,
  sharedKeyRequired,
  hasValidKey,
}) => {
  return (
    <header className="h-12 bg-[#12141a] border-b border-[#232733] flex items-center justify-between px-3 select-none flex-shrink-0 z-20">
      {/* Brand & Sessions */}
      <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar flex-1 min-w-0 mr-3">
        {/* Logo */}
        <div 
          onClick={onOpenConnector}
          className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#1e2330] cursor-pointer transition-colors text-zinc-200 group flex-shrink-0"
          title="Sshwifty Connector"
        >
          <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-400">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="font-mono font-bold text-sm tracking-wide text-zinc-100">sshwifty</span>
            <span className="text-[10px] font-mono uppercase px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50 hidden sm:inline-block">web</span>
          </div>
        </div>

        {/* Tab Separator */}
        <div className="h-4 w-px bg-zinc-800 flex-shrink-0" />

        {/* Tabs List */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-1">
          {sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            return (
              <div
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                className={`group flex items-center space-x-2 px-3 py-1 rounded-md text-xs font-mono transition-all cursor-pointer border max-w-[200px] flex-shrink-0 ${
                  isActive
                    ? 'bg-[#1e2330] text-zinc-100 border-zinc-700 shadow-sm'
                    : 'bg-[#151820]/60 text-zinc-400 border-transparent hover:bg-[#181c26] hover:text-zinc-300'
                }`}
              >
                {/* State indicator dot */}
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    s.state === 'connected'
                      ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                      : s.state === 'connecting'
                      ? 'bg-amber-400 animate-pulse'
                      : s.state === 'error'
                      ? 'bg-rose-500'
                      : 'bg-zinc-600'
                  }`}
                  title={`Status: ${s.state}`}
                />

                {/* Protocol badge */}
                <span className="text-[9px] uppercase font-semibold tracking-wider text-zinc-400 px-1 py-0.2 rounded bg-zinc-800/80">
                  {s.protocol}
                </span>

                {/* Tab title */}
                <span className="truncate text-xs font-medium" title={s.title}>
                  {s.title}
                </span>

                {/* Close Tab Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseSession(s.id);
                  }}
                  className="opacity-60 group-hover:opacity-100 hover:text-rose-400 p-0.5 rounded transition-colors ml-1"
                  title="Close tab"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          {/* New Tab Button */}
          <button
            type="button"
            onClick={onOpenConnector}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs text-zinc-400 hover:text-emerald-400 hover:bg-[#1e2330] border border-transparent hover:border-emerald-500/30 transition-colors flex-shrink-0"
            title="Open Connector / New Session"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline font-mono">New</span>
          </button>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center space-x-1.5 flex-shrink-0">
        {/* Virtual Keyboard Toggle */}
        <button
          type="button"
          onClick={onToggleVirtualKeyboard}
          className={`p-1.5 rounded transition-colors ${
            settings.showMobileKeyboard
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1e2330]'
          }`}
          title="Toggle On-screen Terminal Keys"
        >
          <KeyboardIcon className="w-4 h-4" />
        </button>

        {/* Cloud Run Deployment / Status button */}
        <button
          type="button"
          onClick={onOpenCloudRunInfo}
          className="flex items-center space-x-1.5 px-2 py-1 rounded text-xs text-zinc-300 hover:text-white bg-[#181d28] hover:bg-[#202736] border border-zinc-700/60 transition-colors"
          title="Google Cloud Run Deployment Info"
        >
          <Cloud className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden lg:inline text-[11px] font-mono">Cloud Run</span>
        </button>

        {/* Connector Shortcut */}
        <button
          type="button"
          onClick={onOpenConnector}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
        >
          <Server className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Connector</span>
        </button>

        {/* SharedKey Indicator */}
        {sharedKeyRequired && (
          <div
            className={`p-1.5 rounded text-xs flex items-center ${
              hasValidKey
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-amber-400 bg-amber-500/10'
            }`}
            title={hasValidKey ? 'Authenticated with SharedKey' : 'SharedKey Required'}
          >
            {hasValidKey ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          </div>
        )}

        {/* Settings button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-[#1e2330] transition-colors"
          title="Preferences & Terminal Themes"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
