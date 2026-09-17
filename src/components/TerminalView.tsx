import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { 
  RefreshCw, 
  Square, 
  Trash2, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Clipboard, 
  Wifi, 
  AlertTriangle 
} from 'lucide-react';
import { TerminalSession, AppSettings } from '../types.js';
import { TERMINAL_THEMES } from '../theme.js';

interface TerminalViewProps {
  session: TerminalSession;
  settings: AppSettings;
  onUpdateSessionState: (id: string, updates: Partial<TerminalSession>) => void;
  onVirtualKeyInput?: (callback: (data: string) => void) => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  session,
  settings,
  onUpdateSessionState,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<any>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const activeTheme = TERMINAL_THEMES[settings.theme] || TERMINAL_THEMES.sshwifty;

  // Helper to send message over websocket
  const sendWsMessage = useCallback((msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Send input to backend
  const handleSendInput = useCallback((data: string) => {
    if (!data) return;
    try {
      // Base64 encode binary/text data
      const utf8Bytes = new TextEncoder().encode(data);
      let binary = '';
      for (let i = 0; i < utf8Bytes.length; i++) {
        binary += String.fromCharCode(utf8Bytes[i]);
      }
      const b64 = btoa(binary);
      sendWsMessage({ action: 'input', data: b64 });
    } catch (err) {
      console.error('Error encoding input:', err);
    }
  }, [sendWsMessage]);

  // Connect WebSocket and initiate session
  const connectSession = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // ignore
      }
    }

    onUpdateSessionState(session.id, {
      state: 'connecting',
      errorMessage: undefined,
    });

    const term = termRef.current;
    if (term) {
      term.write(`\r\n\x1b[33mConnecting to ${session.host}${session.port ? ':' + session.port : ''} via ${session.protocol.toUpperCase()}...\x1b[0m\r\n`);
    }

    // Determine WS protocol & url
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      const cols = term ? term.cols : 80;
      const rows = term ? term.rows : 24;

      ws.send(
        JSON.stringify({
          action: 'connect',
          protocol: session.protocol,
          host: session.host,
          port: session.port,
          username: session.username,
          authType: session.authType,
          password: session.password,
          privateKey: session.privateKey,
          passphrase: session.passphrase,
          term: 'xterm-256color',
          cols,
          rows,
          sharedKey: settings.sharedKey,
        })
      );

      // Setup ping
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ action: 'ping', timestamp: Date.now() }));
        }
      }, 5000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'pong') {
          const rtt = Date.now() - msg.timestamp;
          setLatency(rtt);
          onUpdateSessionState(session.id, { pingMs: rtt });
        } else if (msg.type === 'status') {
          onUpdateSessionState(session.id, {
            state: msg.state,
            errorMessage: msg.state === 'error' ? msg.message : undefined,
            connectedAt: msg.state === 'connected' ? Date.now() : session.connectedAt,
          });

          if (term && msg.message) {
            term.write(`\r\n\x1b[36m[sshwifty] ${msg.message}\x1b[0m\r\n`);
          }
          if (term && msg.banner) {
            term.write(`\r\n\x1b[90m${msg.banner}\x1b[0m\r\n`);
          }
        } else if (msg.type === 'output' && msg.data) {
          if (term) {
            try {
              // Decode base64 to binary
              const binary = atob(msg.data);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              term.write(bytes);
            } catch (err) {
              console.error('Failed to decode base64 output:', err);
            }
          }
        } else if (msg.type === 'error') {
          onUpdateSessionState(session.id, {
            state: 'error',
            errorMessage: msg.message,
          });
          if (term) {
            term.write(`\r\n\x1b[31;1m[Error] ${msg.message}\x1b[0m\r\n`);
          }
        }
      } catch (err) {
        console.error('Error handling WS message:', err);
      }
    };

    ws.onerror = () => {
      onUpdateSessionState(session.id, {
        state: 'error',
        errorMessage: 'WebSocket network error.',
      });
      if (term) {
        term.write(`\r\n\x1b[31m[sshwifty] WebSocket connection error.\x1b[0m\r\n`);
      }
    };

    ws.onclose = () => {
      onUpdateSessionState(session.id, {
        state: 'disconnected',
      });
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      setLatency(null);
      if (term) {
        term.write(`\r\n\x1b[33m[sshwifty] Connection closed.\x1b[0m\r\n`);
      }
    };
  }, [session, settings.sharedKey, onUpdateSessionState]);

  // Initialize Terminal instance
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: activeTheme.theme,
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      cursorStyle: settings.cursorStyle,
      cursorBlink: settings.cursorBlink,
      scrollback: settings.scrollback,
      allowProposedApi: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(containerRef.current);
    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Small delay to let container calculate client dimensions
    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch (e) {
        // ignore
      }
    }, 50);

    // Terminal user input
    const inputDisposable = term.onData((data) => {
      handleSendInput(data);
    });

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && termRef.current) {
        try {
          fitAddonRef.current.fit();
          const { cols, rows } = termRef.current;
          sendWsMessage({ action: 'resize', cols, rows });
        } catch (e) {
          // ignore
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    // Initial connection
    connectSession();

    return () => {
      inputDisposable.dispose();
      resizeObserver.disconnect();
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {
          // ignore
        }
      }
      term.dispose();
    };
  }, []);

  // Update theme & font settings dynamically on terminal instance
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = activeTheme.theme;
      termRef.current.options.fontSize = settings.fontSize;
      termRef.current.options.cursorStyle = settings.cursorStyle;
      termRef.current.options.cursorBlink = settings.cursorBlink;
      termRef.current.options.scrollback = settings.scrollback;
      if (fitAddonRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch (e) {
          // ignore
        }
      }
    }
  }, [settings, activeTheme]);

  // Actions
  const handleClear = () => {
    if (termRef.current) {
      termRef.current.clear();
      termRef.current.focus();
    }
  };

  const handleDisconnect = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'disconnect' }));
      wsRef.current.close();
    }
    onUpdateSessionState(session.id, { state: 'disconnected' });
  };

  const handleReconnect = () => {
    connectSession();
  };

  const handleCopySelection = () => {
    if (termRef.current) {
      const selection = termRef.current.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
        setCopiedNotification(true);
        setTimeout(() => setCopiedNotification(false), 2000);
      }
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleSendInput(text);
      }
    } catch (e) {
      console.warn('Clipboard read failed:', e);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (fitAddonRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch (e) {
          // ignore
        }
      }
    }, 100);
  };

  return (
    <div 
      className={`flex flex-col h-full w-full relative ${activeTheme.backgroundClass} ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* Session Toolbar */}
      <div className="h-9 bg-[#161922] border-b border-[#232733] flex items-center justify-between px-3 text-xs select-none flex-shrink-0">
        {/* Left: Host Info & Status */}
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="flex items-center space-x-1.5 font-mono text-zinc-300 truncate">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-semibold uppercase">
              {session.protocol}
            </span>
            <span className="font-semibold text-zinc-200 truncate">
              {session.username ? `${session.username}@` : ''}{session.host}{session.port ? `:${session.port}` : ''}
            </span>
          </div>

          {/* Latency badge */}
          {latency !== null && session.state === 'connected' && (
            <div className="flex items-center space-x-1 text-[11px] font-mono text-zinc-400 hidden sm:flex">
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span>{latency}ms</span>
            </div>
          )}

          {/* Status badge */}
          <div className="flex items-center space-x-1 text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                session.state === 'connected'
                  ? 'bg-emerald-400'
                  : session.state === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : session.state === 'error'
                  ? 'bg-rose-500'
                  : 'bg-zinc-600'
              }`}
            />
            <span className="text-zinc-400 capitalize hidden md:inline">
              {session.state}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-1">
          {session.state === 'connected' ? (
            <button
              type="button"
              onClick={handleDisconnect}
              className="flex items-center space-x-1 px-2 py-1 rounded text-zinc-300 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
              title="Disconnect session"
            >
              <Square className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Disconnect</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReconnect}
              className="flex items-center space-x-1 px-2 py-1 rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              title="Reconnect session"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Reconnect</span>
            </button>
          )}

          <div className="h-3 w-px bg-zinc-700/60 mx-1" />

          {/* Copy selection */}
          <button
            type="button"
            onClick={handleCopySelection}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors relative"
            title="Copy selected text"
          >
            <Copy className="w-3.5 h-3.5" />
            {copiedNotification && (
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                Copied!
              </span>
            )}
          </button>

          {/* Paste from clipboard */}
          <button
            type="button"
            onClick={handlePasteClipboard}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Paste from clipboard"
          >
            <Clipboard className="w-3.5 h-3.5" />
          </button>

          {/* Clear screen */}
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Clear terminal buffer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="flex-1 relative overflow-hidden p-2">
        <div 
          ref={containerRef} 
          className="h-full w-full focus:outline-none"
          onClick={() => termRef.current?.focus()}
        />

        {/* Disconnected / Error Overlay Card */}
        {session.state !== 'connected' && session.state !== 'connecting' && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-[#181c26] border border-zinc-700/80 rounded-lg p-5 shadow-2xl max-w-sm w-full text-center pointer-events-auto">
              <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 mx-auto flex items-center justify-center text-zinc-300 mb-3">
                {session.state === 'error' ? (
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-zinc-400" />
                )}
              </div>

              <h4 className="text-sm font-semibold text-zinc-100 mb-1">
                {session.state === 'error' ? 'Connection Error' : 'Session Disconnected'}
              </h4>

              <p className="text-xs text-zinc-400 mb-4 break-words">
                {session.errorMessage || 'The remote session has been terminated or closed.'}
              </p>

              <div className="flex items-center justify-center space-x-2">
                <button
                  type="button"
                  onClick={handleReconnect}
                  className="flex items-center space-x-1.5 px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-all active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reconnect</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
