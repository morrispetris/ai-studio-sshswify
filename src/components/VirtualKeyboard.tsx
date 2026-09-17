import React from 'react';

interface VirtualKeyboardProps {
  onSendKey: (data: string) => void;
  onClose: () => void;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ onSendKey, onClose }) => {
  const keys = [
    { label: 'ESC', code: '\x1b' },
    { label: 'TAB', code: '\t' },
    { label: 'CTRL+C', code: '\x03', accent: true },
    { label: 'CTRL+D', code: '\x04' },
    { label: 'CTRL+Z', code: '\x1a' },
    { label: 'CTRL+L', code: '\x0c' },
    { label: '↑', code: '\x1b[A' },
    { label: '↓', code: '\x1b[B' },
    { label: '←', code: '\x1b[D' },
    { label: '→', code: '\x1b[C' },
    { label: 'HOME', code: '\x1b[H' },
    { label: 'END', code: '\x1b[F' },
    { label: 'PGUP', code: '\x1b[5~' },
    { label: 'PGDN', code: '\x1b[6~' },
    { label: '~', code: '~' },
    { label: '|', code: '|' },
    { label: '/', code: '/' },
    { label: '-', code: '-' },
  ];

  return (
    <div className="bg-[#141720] border-t border-zinc-800 px-2 py-1.5 flex items-center justify-between space-x-2 text-xs select-none z-10">
      <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 mr-1 hidden sm:inline">
          Keys:
        </span>
        {keys.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onSendKey(k.code);
            }}
            className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-all active:scale-95 flex-shrink-0 ${
              k.accent
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-[#1e2330] text-zinc-300 border border-zinc-700/60 hover:bg-[#252b3b] hover:text-white'
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded hover:bg-zinc-800 flex-shrink-0"
        title="Hide keyboard bar"
      >
        Dismiss
      </button>
    </div>
  );
};
