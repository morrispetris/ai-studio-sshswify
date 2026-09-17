import { AppSettings, KnownRemote } from '../types.js';

const STORAGE_KEYS = {
  REMOTES: 'sshwifty_known_remotes',
  SETTINGS: 'sshwifty_settings',
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'sshwifty',
  fontSize: 14,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  cursorStyle: 'block',
  cursorBlink: true,
  scrollback: 5000,
  bellSound: false,
  showMobileKeyboard: false,
  sharedKey: '',
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load settings from localStorage:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to localStorage:', e);
  }
}

export function loadKnownRemotes(): KnownRemote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REMOTES);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch (e) {
    console.error('Failed to load known remotes:', e);
  }

  // Prepopulate with a helpful starter remote
  const initial: KnownRemote[] = [
    {
      id: 'default-cloud-run',
      name: 'Local Container Shell (Google Cloud Run)',
      protocol: 'local',
      host: 'localhost',
      port: 0,
      username: 'root',
      description: 'Interactive container terminal directly on this Cloud Run instance',
      favorite: true,
      createdAt: Date.now(),
    },
    {
      id: 'default-telehack',
      name: 'Telehack (Public BBS Simulation)',
      protocol: 'telnet',
      host: 'telehack.com',
      port: 23,
      username: '',
      description: 'Dial-up era UNIX/BBS simulation, explore commands, text files, and games',
      favorite: false,
      createdAt: Date.now(),
    }
  ];
  saveKnownRemotes(initial);
  return initial;
}

export function saveKnownRemotes(remotes: KnownRemote[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.REMOTES, JSON.stringify(remotes));
  } catch (e) {
    console.error('Failed to save known remotes:', e);
  }
}

export function exportRemotesToJson(remotes: KnownRemote[]): string {
  // Strip sensitive passwords from export for safety, keeping host configs
  const sanitized = remotes.map((r) => ({
    ...r,
    password: '',
    passphrase: '',
  }));
  return JSON.stringify(sanitized, null, 2);
}

export function importRemotesFromJson(jsonStr: string): KnownRemote[] {
  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) throw new Error('Uploaded file is not a valid list of remotes');

  return parsed.map((item, index) => ({
    id: item.id || `imported-${Date.now()}-${index}`,
    name: item.name || 'Unnamed Remote',
    protocol: item.protocol === 'telnet' ? 'telnet' : item.protocol === 'local' ? 'local' : 'ssh',
    host: item.host || 'localhost',
    port: Number(item.port) || 22,
    username: item.username || '',
    authType: item.authType || 'password',
    description: item.description || '',
    favorite: !!item.favorite,
    createdAt: item.createdAt || Date.now(),
    lastUsedAt: item.lastUsedAt,
  }));
}
