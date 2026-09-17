export type ProtocolType = 'ssh' | 'telnet' | 'local';

export type SessionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface TerminalSession {
  id: string;
  title: string;
  protocol: ProtocolType;
  host: string;
  port: number;
  username?: string;
  authType?: 'password' | 'key';
  password?: string;
  privateKey?: string;
  passphrase?: string;
  state: SessionState;
  errorMessage?: string;
  connectedAt?: number;
  pingMs?: number;
}

export interface KnownRemote {
  id: string;
  name: string;
  protocol: ProtocolType;
  host: string;
  port: number;
  username?: string;
  authType?: 'password' | 'key';
  password?: string;
  privateKey?: string;
  passphrase?: string;
  description?: string;
  favorite?: boolean;
  createdAt: number;
  lastUsedAt?: number;
}

export interface RemotePreset {
  id: string;
  name: string;
  protocol: ProtocolType;
  host: string;
  port: number;
  username?: string;
  description?: string;
}

export interface AppSettings {
  theme: 'sshwifty' | 'matrix' | 'monokai' | 'nord' | 'cyberpunk' | 'solarized' | 'light';
  fontSize: number;
  fontFamily: string;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
  scrollback: number;
  bellSound: boolean;
  showMobileKeyboard: boolean;
  sharedKey: string;
}

export interface ServerConfig {
  sharedKeyRequired: boolean;
  presets: RemotePreset[];
  version: string;
  features: {
    ssh: boolean;
    telnet: boolean;
    localShell: boolean;
  };
}
