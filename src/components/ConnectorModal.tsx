import React, { useState, useRef } from 'react';
import { 
  X, 
  Terminal, 
  Server, 
  Bookmark, 
  Radio, 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  Trash2, 
  Upload, 
  Download, 
  Star, 
  Search, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { KnownRemote, ProtocolType, RemotePreset } from '../types.js';

interface ConnectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (params: {
    protocol: ProtocolType;
    host: string;
    port: number;
    username?: string;
    authType?: 'password' | 'key';
    password?: string;
    privateKey?: string;
    passphrase?: string;
    title?: string;
  }) => void;
  knownRemotes: KnownRemote[];
  onSaveRemote: (remote: KnownRemote) => void;
  onDeleteRemote: (id: string) => void;
  onImportRemotes: (remotes: KnownRemote[]) => void;
  serverPresets: RemotePreset[];
}

export const ConnectorModal: React.FC<ConnectorModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  knownRemotes,
  onSaveRemote,
  onDeleteRemote,
  onImportRemotes,
  serverPresets,
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'known' | 'presets'>('manual');

  // Manual Form State
  const [protocol, setProtocol] = useState<ProtocolType>('ssh');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('root');
  const [authType, setAuthType] = useState<'password' | 'key'>('password');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [saveToKnown, setSaveToKnown] = useState(true);
  const [remoteName, setRemoteName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Search filter for known remotes
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProtocolChange = (p: ProtocolType) => {
    setProtocol(p);
    if (p === 'ssh') {
      if (port === '23' || port === '0') setPort('22');
    } else if (p === 'telnet') {
      if (port === '22' || port === '0') setPort('23');
    } else if (p === 'local') {
      setPort('0');
      setHost('localhost');
      setUsername('root');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const targetHost = protocol === 'local' ? 'localhost' : host.trim();
    if (!targetHost) {
      setErrorMsg('Please specify a valid hostname or IP address.');
      return;
    }

    const targetPort = protocol === 'local' ? 0 : parseInt(port, 10) || (protocol === 'ssh' ? 22 : 23);

    const title = remoteName.trim() || (protocol === 'local' ? 'Local Container Shell' : `${username ? username + '@' : ''}${targetHost}`);

    // If user checked save to known remotes
    if (saveToKnown) {
      const newRemote: KnownRemote = {
        id: `remote-${Date.now()}`,
        name: title,
        protocol,
        host: targetHost,
        port: targetPort,
        username: username.trim(),
        authType,
        password: authType === 'password' ? password : '',
        privateKey: authType === 'key' ? privateKey : '',
        passphrase: authType === 'key' ? passphrase : '',
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
      };
      onSaveRemote(newRemote);
    }

    onConnect({
      protocol,
      host: targetHost,
      port: targetPort,
      username: username.trim(),
      authType,
      password,
      privateKey,
      passphrase,
      title,
    });

    onClose();
  };

  const handleConnectKnown = (remote: KnownRemote) => {
    onConnect({
      protocol: remote.protocol,
      host: remote.host,
      port: remote.port,
      username: remote.username,
      authType: remote.authType,
      password: remote.password,
      privateKey: remote.privateKey,
      passphrase: remote.passphrase,
      title: remote.name,
    });
    onClose();
  };

  const handleConnectPreset = (preset: RemotePreset) => {
    onConnect({
      protocol: preset.protocol,
      host: preset.host,
      port: preset.port,
      username: preset.username,
      title: preset.name,
    });
    onClose();
  };

  const handleKeyFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        setPrivateKey(content);
        setAuthType('key');
      }
    };
    reader.readAsText(file);
  };

  const handleExportRemotes = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(knownRemotes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sshwifty-remotes-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          onImportRemotes(parsed);
        }
      } catch (err) {
        alert('Invalid remotes JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const filteredRemotes = knownRemotes.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.host.toLowerCase().includes(q) ||
      (r.username && r.username.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#151821] border border-zinc-700/80 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-14 border-b border-zinc-800 px-5 flex items-center justify-between bg-[#12141a]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 font-mono">Connector</h3>
              <p className="text-[11px] text-zinc-400">Establish remote SSH & Telnet connections</p>
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

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 px-5 bg-[#141720]">
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`py-3 px-3 text-xs font-mono font-medium border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'manual'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Manual connection</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('known')}
            className={`py-3 px-3 text-xs font-mono font-medium border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'known'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Known remotes ({knownRemotes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`py-3 px-3 text-xs font-mono font-medium border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'presets'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Presets ({serverPresets.length})</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto">
          {/* TAB 1: MANUAL CONNECTION */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Protocol Select */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">Protocol</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleProtocolChange('ssh')}
                    className={`py-2 px-3 rounded-lg text-xs font-mono flex items-center justify-center space-x-2 border transition-all ${
                      protocol === 'ssh'
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-semibold'
                        : 'bg-[#1a1e29] border-zinc-800 text-zinc-400 hover:bg-[#202533]'
                    }`}
                  >
                    <span>SSH</span>
                    <span className="text-[10px] opacity-60">:22</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProtocolChange('telnet')}
                    className={`py-2 px-3 rounded-lg text-xs font-mono flex items-center justify-center space-x-2 border transition-all ${
                      protocol === 'telnet'
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-semibold'
                        : 'bg-[#1a1e29] border-zinc-800 text-zinc-400 hover:bg-[#202533]'
                    }`}
                  >
                    <span>Telnet</span>
                    <span className="text-[10px] opacity-60">:23</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProtocolChange('local')}
                    className={`py-2 px-3 rounded-lg text-xs font-mono flex items-center justify-center space-x-2 border transition-all ${
                      protocol === 'local'
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-semibold'
                        : 'bg-[#1a1e29] border-zinc-800 text-zinc-400 hover:bg-[#202533]'
                    }`}
                  >
                    <span>Container Shell</span>
                  </button>
                </div>
              </div>

              {/* Host & Port */}
              {protocol !== 'local' ? (
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-zinc-300 mb-1 font-mono">
                      Hostname or IP Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 192.168.1.100 or server.example.com"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      className="w-full bg-[#101217] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1 font-mono">Port</label>
                    <input
                      type="number"
                      required
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      className="w-full bg-[#101217] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs">
                  Runs directly inside the active Google Cloud Run container instance with access to the container filesystem and tools.
                </div>
              )}

              {/* Username (for SSH/Local) */}
              {protocol !== 'telnet' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1 font-mono">Username</label>
                  <input
                    type="text"
                    placeholder="e.g. root, ubuntu, or admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#101217] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* SSH Authentication type */}
              {protocol === 'ssh' && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">Authentication</label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setAuthType('password')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono flex items-center justify-center space-x-2 border transition-all ${
                          authType === 'password'
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-semibold'
                            : 'bg-[#1a1e29] border-zinc-800 text-zinc-400 hover:bg-[#202533]'
                        }`}
                      >
                        <Lock className="w-3 h-3" />
                        <span>Password</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthType('key')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono flex items-center justify-center space-x-2 border transition-all ${
                          authType === 'key'
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-semibold'
                            : 'bg-[#1a1e29] border-zinc-800 text-zinc-400 hover:bg-[#202533]'
                        }`}
                      >
                        <Key className="w-3 h-3" />
                        <span>Private Key</span>
                      </button>
                    </div>
                  </div>

                  {authType === 'password' ? (
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1 font-mono">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Leave empty if using interactive prompt"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-[#101217] border border-zinc-700/80 rounded-lg pl-3 pr-10 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-zinc-300 font-mono">Private Key (PEM/OpenSSH)</label>
                        <label className="cursor-pointer text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-1">
                          <Upload className="w-3 h-3" />
                          <span>Upload key file</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleKeyFileUpload}
                          />
                        </label>
                      </div>
                      <textarea
                        rows={4}
                        placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                        className="w-full bg-[#101217] border border-zinc-700/80 rounded-lg p-2.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                      />
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1 font-mono">Key Passphrase (optional)</label>
                        <input
                          type="password"
                          placeholder="Passphrase for encrypted private key"
                          value={passphrase}
                          onChange={(e) => setPassphrase(e.target.value)}
                          className="w-full bg-[#101217] border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Save to Known Remotes */}
              <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveToKnown}
                    onChange={(e) => setSaveToKnown(e.target.checked)}
                    className="rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Save configuration to Known remotes for quick access</span>
                </label>

                {saveToKnown && (
                  <div>
                    <input
                      type="text"
                      placeholder="Display Name (optional, e.g. Production Web 1)"
                      value={remoteName}
                      onChange={(e) => setRemoteName(e.target.value)}
                      className="w-full bg-[#101217] border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-mono font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-950 transition-all flex items-center space-x-1.5 active:scale-95"
                >
                  <span>Connect</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: KNOWN REMOTES */}
          {activeTab === 'known' && (
            <div className="space-y-4">
              {/* Top controls: search & import/export */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search saved remotes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#101217] border border-zinc-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={handleExportRemotes}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 flex items-center space-x-1"
                    title="Export remotes to JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 flex items-center space-x-1"
                    title="Import remotes from JSON"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Import</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".json"
                    onChange={handleImportFile}
                  />
                </div>
              </div>

              {/* Remotes List */}
              {filteredRemotes.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  No saved remotes found. Connect using "Manual connection" to add your hosts.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {filteredRemotes.map((remote) => (
                    <div
                      key={remote.id}
                      className="bg-[#191d29] hover:bg-[#1f2433] border border-zinc-800 hover:border-zinc-700 rounded-lg p-3 flex items-center justify-between transition-all group"
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-9 h-9 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300 flex-shrink-0">
                          {remote.protocol === 'local' ? (
                            <Terminal className="w-4 h-4 text-cyan-400" />
                          ) : remote.protocol === 'telnet' ? (
                            <Radio className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Server className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>

                        <div className="truncate">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-zinc-100 font-mono">
                              {remote.name}
                            </span>
                            <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                              {remote.protocol}
                            </span>
                            {remote.favorite && (
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-zinc-400 truncate">
                            {remote.protocol === 'local'
                              ? 'Interactive container shell'
                              : `${remote.username ? remote.username + '@' : ''}${remote.host}:${remote.port}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => onDeleteRemote(remote.id)}
                          className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete remote"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleConnectKnown(remote)}
                          className="px-3 py-1.5 rounded-md bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-mono font-medium flex items-center space-x-1 shadow transition-all active:scale-95"
                        >
                          <span>Connect</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400 font-mono">
                Server-configured remote presets. Click any preset to connect immediately.
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {serverPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="bg-[#191d29] hover:bg-[#1f2433] border border-zinc-800 hover:border-zinc-700 rounded-lg p-3.5 flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300 flex-shrink-0">
                        {preset.protocol === 'local' ? (
                          <Terminal className="w-4 h-4 text-cyan-400" />
                        ) : preset.protocol === 'telnet' ? (
                          <Radio className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Server className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>

                      <div className="truncate">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-zinc-100 font-mono">
                            {preset.name}
                          </span>
                          <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                            {preset.protocol}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {preset.description || `${preset.host}:${preset.port}`}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleConnectPreset(preset)}
                      className="px-3.5 py-1.5 rounded-md bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-mono font-medium flex items-center space-x-1 shadow transition-all active:scale-95 flex-shrink-0"
                    >
                      <span>Connect</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
