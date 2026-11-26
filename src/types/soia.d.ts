// Global SOIA Window Definition
export interface FileEntry {
  name: string;
  isDirectory: boolean;
  path: string;
  extension?: string;
}

export interface SystemInfo {
  platform: string;
  release: string;
  arch: string;
  hostname: string;
  uptimeSeconds: number;
  cpus: number;
  cpuModel: string;
  totalMemoryMB: number;
  usedMemoryMB: number;
  freeMemoryMB: number;
  isLinux: boolean;
  isLiveDebian: boolean;
}

export interface NetworkDevice {
  device: string;
  type: string;
  state: string;
  connection: string;
}

export interface WifiNetwork {
  inUse: boolean;
  ssid: string;
  signal: number;
  security: string;
}

export type AiProvider =
  | 'ollama'
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'openrouter'
  | 'groq'
  | 'custom';

export interface AiConfig {
  provider: AiProvider;
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature: number;
}

export interface SoiaBridge {
  getSystemInfo: () => Promise<SystemInfo>;
  sendShellInput: (input: string) => void;
  onShellOutput: (callback: (data: string) => void) => () => void;
  detachTab: (tab: any) => Promise<boolean>;
  reattachTab: (tabId: string) => Promise<boolean>;
  onTabReattached: (callback: (data: { tabId: string }) => void) => () => void;
  getSecurityProfile: () => Promise<'strict' | 'balanced' | 'autonomous'>;
  setSecurityProfile: (profile: 'strict' | 'balanced' | 'autonomous') => Promise<boolean>;
  checkCommandSecurity: (command: string) => Promise<{ allowed: boolean; needsConfirmation: boolean; reason?: string }>;
  listFiles: (targetPath?: string) => Promise<FileEntry[]>;
  createDocument: (name: string, content: string, format: 'doc' | 'txt' | 'md') => Promise<{ success: boolean; filePath?: string; error?: string }>;
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  installLinuxPackage: (packageName: string) => void;
  openExternal: (url: string) => void;
  getNetworkStatus: () => Promise<{ success: boolean; devices: NetworkDevice[]; error?: string }>;
  scanWifiNetworks: () => Promise<{ success: boolean; networks: WifiNetwork[]; error?: string }>;
  connectWifi: (ssid: string, password?: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  disconnectNetwork: (device: string) => Promise<{ success: boolean; error?: string }>;
  aiChat: (payload: {
    config: AiConfig;
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  }) => Promise<{ success: boolean; content?: string; error?: string }>;
}

declare global {
  interface Window {
    soia?: SoiaBridge;
  }
  namespace JSX {
    interface IntrinsicElements {
      webview: any;
    }
  }
}
