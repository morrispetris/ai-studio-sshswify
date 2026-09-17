export type ProtocolType = 'ssh' | 'telnet' | 'local';

export interface ConnectMessage {
  action: 'connect';
  protocol: ProtocolType;
  host: string;
  port: number;
  username?: string;
  authType?: 'password' | 'key';
  password?: string;
  privateKey?: string;
  passphrase?: string;
  term?: string;
  cols?: number;
  rows?: number;
  sharedKey?: string;
}

export interface InputMessage {
  action: 'input';
  data: string; // base64 encoded bytes
}

export interface ResizeMessage {
  action: 'resize';
  cols: number;
  rows: number;
}

export interface DisconnectMessage {
  action: 'disconnect';
}

export interface PingMessage {
  action: 'ping';
  timestamp: number;
}

export type ClientMessage = ConnectMessage | InputMessage | ResizeMessage | DisconnectMessage | PingMessage;

export interface ServerStatusMessage {
  type: 'status';
  state: 'connecting' | 'connected' | 'disconnected' | 'error';
  message?: string;
  banner?: string;
  fingerprint?: string;
}

export interface ServerOutputMessage {
  type: 'output';
  data: string; // base64 encoded
}

export interface ServerErrorMessage {
  type: 'error';
  message: string;
}

export interface ServerPongMessage {
  type: 'pong';
  timestamp: number;
}

export type ServerMessage = ServerStatusMessage | ServerOutputMessage | ServerErrorMessage | ServerPongMessage;

export interface RemotePreset {
  id: string;
  name: string;
  protocol: ProtocolType;
  host: string;
  port: number;
  username?: string;
  description?: string;
}
