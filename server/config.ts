import { RemotePreset } from './types.js';

export function getSharedKey(): string {
  return process.env.SSHWIFTY_SHAREDKEY || '';
}

export function isSharedKeyRequired(): boolean {
  const key = getSharedKey();
  return key.trim().length > 0;
}

export function verifySharedKey(providedKey?: string): boolean {
  if (!isSharedKeyRequired()) return true;
  return (providedKey || '') === getSharedKey();
}

export function getServerPresets(): RemotePreset[] {
  const defaultPresets: RemotePreset[] = [
    {
      id: 'local-shell',
      name: 'Cloud Run Container Shell',
      protocol: 'local',
      host: 'localhost',
      port: 0,
      username: 'root',
      description: 'Interactive container shell on this Cloud Run environment',
    },
    {
      id: 'telehack-bbs',
      name: 'Telehack (Public BBS/Simulation)',
      protocol: 'telnet',
      host: 'telehack.com',
      port: 23,
      username: '',
      description: 'Public dial-up era simulation server with retro utilities and games',
    },
    {
      id: 'sdf-lonestar',
      name: 'SDF Public Access UNIX',
      protocol: 'ssh',
      host: 'sdf.org',
      port: 22,
      username: 'new',
      description: 'Public Access UNIX System (create account or guest login)',
    },
  ];

  if (process.env.SSHWIFTY_PRESETS) {
    try {
      const customPresets = JSON.parse(process.env.SSHWIFTY_PRESETS);
      if (Array.isArray(customPresets)) {
        return [...defaultPresets, ...customPresets];
      }
    } catch (e) {
      console.warn('Failed to parse SSHWIFTY_PRESETS:', e);
    }
  }

  return defaultPresets;
}
