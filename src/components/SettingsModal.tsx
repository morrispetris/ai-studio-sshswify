import React, { useState } from 'react';
import { 
  X, 
  Settings as SettingsIcon, 
  Palette, 
  Type, 
  Key, 
  RotateCcw, 
  Check, 
  Keyboard 
} from 'lucide-react';
import { AppSettings } from '../types.js';
import { TERMINAL_THEMES } from '../theme.js';
import { DEFAULT_SETTINGS } from '../utils/storage.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  sharedKeyRequired: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  sharedKeyRequired,
}) => {
  const [current, setCurrent] = useState<AppSettings>(settings);
  const [keyVerifiedMessage, setKeyVerifiedMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...current, [key]: value };
    setCurrent(updated);
    onSaveSettings(updated);
  };

  const handleReset = () => {
    setCurrent(DEFAULT_SETTINGS);
    onSaveSettings(DEFAULT_SETTINGS);
  };

  const handleTestSharedKey = async () => {
    try {
      const res = await fetch('/api/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: current.sharedKey }),
      });
      const data = await res.json();
      if (data.valid) {
        setKeyVerifiedMessage('Key accepted successfully!');
      } else {
        setKeyVerifiedMessage('Invalid key. Please check your SSHWIFTY_SHAREDKEY.');
      }
      setTimeout(() => setKeyVerifiedMessage(null), 3500);
    } catch (e) {
      setKeyVerifiedMessage('Failed to verify key with server.');
      setTimeout(() => setKeyVerifiedMessage(null), 3500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#151821] border border-zinc-700/80 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-14 border-b border-zinc-800 px-5 flex items-center justify-between bg-[#12141a]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 font-mono">Preferences</h3>
              <p className="text-[11px] text-zinc-400">Terminal display and connection options</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {/* Section: Terminal Theme */}
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider mb-2.5">
              <Palette className="w-3.5 h-3.5 text-emerald-400" />
              <span>Color Theme</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(TERMINAL_THEMES).map((t) => {
                const isSelected = current.theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleChange('theme', t.id as any)}
                    className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-zinc-800 border-emerald-500 shadow-sm'
                        : 'bg-[#181c26] border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <div
                        className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0"
                        style={{ backgroundColor: t.previewColor }}
                      />
                      <span className="text-xs font-mono text-zinc-200 truncate">{t.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Typography & Cursor */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
              <Type className="w-3.5 h-3.5 text-emerald-400" />
              <span>Typography & Cursor</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Font Size */}
              <div>
                <label className="block text-xs text-zinc-400 font-mono mb-1">Font Size</label>
                <select
                  value={current.fontSize}
                  onChange={(e) => handleChange('fontSize', Number(e.target.value))}
                  className="w-full bg-[#101217] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value={12}>12 px (Compact)</option>
                  <option value={13}>13 px</option>
                  <option value={14}>14 px (Standard)</option>
                  <option value={16}>16 px (Large)</option>
                  <option value={18}>18 px</option>
                  <option value={20}>20 px (Extra Large)</option>
                </select>
              </div>

              {/* Cursor Style */}
              <div>
                <label className="block text-xs text-zinc-400 font-mono mb-1">Cursor Style</label>
                <select
                  value={current.cursorStyle}
                  onChange={(e) => handleChange('cursorStyle', e.target.value as any)}
                  className="w-full bg-[#101217] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="block">Block █</option>
                  <option value="underline">Underline   </option>
                  <option value="bar">Vertical Bar |</option>
                </select>
              </div>
            </div>

            {/* Cursor Blink & Scrollback */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs text-zinc-400 font-mono mb-1">Scrollback Buffer</label>
                <select
                  value={current.scrollback}
                  onChange={(e) => handleChange('scrollback', Number(e.target.value))}
                  className="w-full bg-[#101217] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value={1000}>1,000 lines</option>
                  <option value={2000}>2,000 lines</option>
                  <option value={5000}>5,000 lines (Default)</option>
                  <option value={10000}>10,000 lines</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={current.cursorBlink}
                    onChange={(e) => handleChange('cursorBlink', e.target.checked)}
                    className="rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Blinking Cursor</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section: Touch & On-screen Keys */}
          <div className="space-y-2 pt-1 border-t border-zinc-800">
            <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
              <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mobile & Touch Controls</span>
            </div>
            <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={current.showMobileKeyboard}
                onChange={(e) => handleChange('showMobileKeyboard', e.target.checked)}
                className="rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-0"
              />
              <span>Always show on-screen terminal helper keys bar (ESC, CTRL, Arrows, etc.)</span>
            </label>
          </div>

          {/* Section: Sshwifty Shared Key (Access Protection) */}
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                <span>Shared Key (Access Password)</span>
              </div>
              {sharedKeyRequired && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                  Required by Server
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">
              If the server environment has <code className="text-zinc-300">SSHWIFTY_SHAREDKEY</code> configured, enter it below to authorize session connections.
            </p>
            <div className="flex space-x-2">
              <input
                type="password"
                placeholder="Enter Sshwifty shared key..."
                value={current.sharedKey}
                onChange={(e) => handleChange('sharedKey', e.target.value)}
                className="flex-1 bg-[#101217] border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleTestSharedKey}
                className="px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
              >
                Verify
              </button>
            </div>
            {keyVerifiedMessage && (
              <p className="text-xs font-mono text-emerald-400">{keyVerifiedMessage}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 border-t border-zinc-800 px-5 flex items-center justify-between bg-[#12141a]">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center space-x-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-mono font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
