import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Terminal, 
  Server, 
  Plus, 
  Radio, 
  Settings, 
  Cloud, 
  ShieldCheck, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Header } from './components/Header.js';
import { TerminalView } from './components/TerminalView.js';
import { ConnectorModal } from './components/ConnectorModal.js';
import { SettingsModal } from './components/SettingsModal.js';
import { CloudRunModal } from './components/CloudRunModal.js';
import { VirtualKeyboard } from './components/VirtualKeyboard.js';
import { 
  TerminalSession, 
  KnownRemote, 
  AppSettings, 
  ProtocolType, 
  RemotePreset, 
  ServerConfig 
} from './types.js';
import { 
  loadSettings, 
  saveSettings, 
  loadKnownRemotes, 
  saveKnownRemotes, 
  DEFAULT_SETTINGS 
} from './utils/storage.js';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [knownRemotes, setKnownRemotes] = useState<KnownRemote[]>(loadKnownRemotes());
  const [serverConfig, setServerConfig] = useState<ServerConfig>({
    sharedKeyRequired: false,
    presets: [],
    version: '0.3.5',
    features: { ssh: true, telnet: true, localShell: true },
  });

  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Modals
  const [isConnectorOpen, setIsConnectorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCloudRunOpen, setIsCloudRunOpen] = useState(false);

  // Ref to route virtual keyboard input to active terminal
  const activeInputHandlerRef = useRef<((data: string) => void) | null>(null);

  // Fetch server configuration
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data: ServerConfig) => {
        setServerConfig(data);
      })
      .catch((err) => {
        console.warn('Could not fetch server config:', err);
      });
  }, []);

  // Save settings when modified
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Known remotes handlers
  const handleSaveRemote = (remote: KnownRemote) => {
    setKnownRemotes((prev) => {
      const idx = prev.findIndex((r) => r.id === remote.id);
      let updated: KnownRemote[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = remote;
      } else {
        updated = [remote, ...prev];
      }
      saveKnownRemotes(updated);
      return updated;
    });
  };

  const handleDeleteRemote = (id: string) => {
    setKnownRemotes((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      saveKnownRemotes(updated);
      return updated;
    });
  };

  const handleImportRemotes = (imported: KnownRemote[]) => {
    setKnownRemotes((prev) => {
      const updated = [...imported, ...prev];
      saveKnownRemotes(updated);
      return updated;
    });
  };

  // Session Management
  const handleConnect = useCallback((params: {
    protocol: ProtocolType;
    host: string;
    port: number;
    username?: string;
    authType?: 'password' | 'key';
    password?: string;
    privateKey?: string;
    passphrase?: string;
    title?: string;
  }) => {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newSession: TerminalSession = {
      id: sessionId,
      title: params.title || (params.protocol === 'local' ? 'Local Container Shell' : `${params.username ? params.username + '@' : ''}${params.host}`),
      protocol: params.protocol,
      host: params.host,
      port: params.port,
      username: params.username,
      authType: params.authType,
      password: params.password,
      privateKey: params.privateKey,
      passphrase: params.passphrase,
      state: 'connecting',
    };

    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(sessionId);
  }, []);

  const handleCloseSession = useCallback((id: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
      }
      return remaining;
    });
  }, [activeSessionId]);

  const handleUpdateSessionState = useCallback((id: string, updates: Partial<TerminalSession>) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + N -> Open Connector
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsConnectorOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Send virtual key to active terminal
  const handleSendVirtualKey = (keyData: string) => {
    if (activeInputHandlerRef.current) {
      activeInputHandlerRef.current(keyData);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0d0f14] text-zinc-100 font-sans select-none">
      {/* App Header & Session Tabs */}
      <Header
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onCloseSession={handleCloseSession}
        onOpenConnector={() => setIsConnectorOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCloudRunInfo={() => setIsCloudRunOpen(true)}
        settings={settings}
        onToggleVirtualKeyboard={() =>
          handleUpdateSettings({
            ...settings,
            showMobileKeyboard: !settings.showMobileKeyboard,
          })
        }
        sharedKeyRequired={serverConfig.sharedKeyRequired}
        hasValidKey={!!settings.sharedKey}
      />

      {/* Main Terminal Stage */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {activeSession ? (
          <div className="flex-1 w-full h-full relative">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`absolute inset-0 ${
                  session.id === activeSessionId ? 'block' : 'hidden'
                }`}
              >
                <TerminalView
                  session={session}
                  settings={settings}
                  onUpdateSessionState={handleUpdateSessionState}
                />
              </div>
            ))}
          </div>
        ) : (
          /* Empty / Welcome State */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
            <div className="max-w-md w-full space-y-6">
              {/* Monospace ASCII / Sshwifty Badge */}
              <div className="space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-950">
                  <Terminal className="w-7 h-7" />
                </div>
                <h1 className="text-xl font-bold font-mono text-zinc-100 tracking-wider">
                  sshwifty
                </h1>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Web SSH & Telnet client connector running on Google Cloud Run. Open multiple sessions in tabs, manage known remotes, and connect securely.
                </p>
              </div>

              {/* Primary Call to Action */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsConnectorOpen(true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2 transition-all active:scale-95"
                >
                  <Server className="w-4 h-4" />
                  <span>Open Connector</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleConnect({
                      protocol: 'local',
                      host: 'localhost',
                      port: 0,
                      username: 'root',
                      title: 'Local Container Shell',
                    })
                  }
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#1a1f2c] hover:bg-[#222838] border border-zinc-700/80 text-zinc-200 text-xs font-mono font-medium flex items-center justify-center space-x-2 transition-all active:scale-95"
                >
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>Launch Container Shell</span>
                </button>
              </div>

              {/* Quick Presets & Remotes */}
              <div className="bg-[#141722] border border-zinc-800 rounded-xl p-4 text-left space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span className="uppercase tracking-wider text-[10px] font-semibold text-zinc-500">
                    Quick Connect
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Alt + N for new session
                  </span>
                </div>

                <div className="space-y-1.5">
                  {/* Telehack BBS */}
                  <div
                    onClick={() =>
                      handleConnect({
                        protocol: 'telnet',
                        host: 'telehack.com',
                        port: 23,
                        title: 'Telehack (BBS Simulation)',
                      })
                    }
                    className="p-2 rounded-lg bg-[#181d2a] hover:bg-[#202738] border border-zinc-800/80 flex items-center justify-between cursor-pointer transition-all group"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Radio className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-medium font-mono text-zinc-200 group-hover:text-emerald-300">
                          Telehack (Public BBS Simulation)
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500">
                          telehack.com:23 (Telnet)
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400" />
                  </div>

                  {/* SDF UNIX */}
                  <div
                    onClick={() =>
                      handleConnect({
                        protocol: 'ssh',
                        host: 'sdf.org',
                        port: 22,
                        username: 'new',
                        title: 'SDF Public Access UNIX',
                      })
                    }
                    className="p-2 rounded-lg bg-[#181d2a] hover:bg-[#202738] border border-zinc-800/80 flex items-center justify-between cursor-pointer transition-all group"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Server className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-medium font-mono text-zinc-200 group-hover:text-emerald-300">
                          SDF Public Access UNIX
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500">
                          new@sdf.org:22 (SSH)
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* Google Cloud Run Footer notice */}
              <div className="flex items-center justify-center space-x-2 text-[11px] text-zinc-500 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Google Cloud Run WebSocket Ready</span>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setIsCloudRunOpen(true)}
                  className="text-blue-400 hover:underline"
                >
                  Deployment guide
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile / Touch Helper Virtual Keyboard Bar */}
        {settings.showMobileKeyboard && activeSession && (
          <VirtualKeyboard
            onSendKey={handleSendVirtualKey}
            onClose={() =>
              handleUpdateSettings({
                ...settings,
                showMobileKeyboard: false,
              })
            }
          />
        )}
      </main>

      {/* Modals */}
      <ConnectorModal
        isOpen={isConnectorOpen}
        onClose={() => setIsConnectorOpen(false)}
        onConnect={handleConnect}
        knownRemotes={knownRemotes}
        onSaveRemote={handleSaveRemote}
        onDeleteRemote={handleDeleteRemote}
        onImportRemotes={handleImportRemotes}
        serverPresets={serverConfig.presets}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleUpdateSettings}
        sharedKeyRequired={serverConfig.sharedKeyRequired}
      />

      <CloudRunModal
        isOpen={isCloudRunOpen}
        onClose={() => setIsCloudRunOpen(false)}
      />
    </div>
  );
}
