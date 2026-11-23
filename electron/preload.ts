// ==============================================================================
// SOIA Preload Script - Secure Context Bridge
// ==============================================================================
import { contextBridge, ipcRenderer } from 'electron';

export interface SoiaAPI {
  getSystemInfo: () => Promise<any>;
  sendShellInput: (input: string) => void;
  onShellOutput: (callback: (data: string) => void) => () => void;
  detachTab: (tab: any) => Promise<boolean>;
  reattachTab: (tabId: string) => Promise<boolean>;
  onTabReattached: (callback: (data: { tabId: string }) => void) => () => void;
  getSecurityProfile: () => Promise<string>;
  setSecurityProfile: (profile: string) => Promise<boolean>;
  checkCommandSecurity: (command: string) => Promise<{ allowed: boolean; needsConfirmation: boolean; reason?: string }>;
  listFiles: (targetPath?: string) => Promise<any[]>;
  createDocument: (name: string, content: string, format: 'doc' | 'txt' | 'md') => Promise<{ success: boolean; filePath?: string; error?: string }>;
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  installLinuxPackage: (packageName: string) => void;
  openExternal: (url: string) => void;
}

const soiaBridge: SoiaAPI = {
  getSystemInfo: () => ipcRenderer.invoke('soia:get-system-info'),
  sendShellInput: (input: string) => ipcRenderer.send('soia:shell-input', input),
  onShellOutput: (callback: (data: string) => void) => {
    const handler = (_event: any, data: string) => callback(data);
    ipcRenderer.on('soia:shell-output', handler);
    return () => ipcRenderer.removeListener('soia:shell-output', handler);
  },
  detachTab: (tab: any) => ipcRenderer.invoke('soia:detach-tab', tab),
  reattachTab: (tabId: string) => ipcRenderer.invoke('soia:reattach-tab', tabId),
  onTabReattached: (callback: (data: { tabId: string }) => void) => {
    const handler = (_event: any, data: { tabId: string }) => callback(data);
    ipcRenderer.on('soia:tab-reattached', handler);
    return () => ipcRenderer.removeListener('soia:tab-reattached', handler);
  },
  getSecurityProfile: () => ipcRenderer.invoke('soia:get-security-profile'),
  setSecurityProfile: (profile: string) => ipcRenderer.invoke('soia:set-security-profile', profile),
  checkCommandSecurity: (command: string) => ipcRenderer.invoke('soia:check-command-security', command),
  listFiles: (targetPath?: string) => ipcRenderer.invoke('soia:fs-list', targetPath),
  createDocument: (name: string, content: string, format: 'doc' | 'txt' | 'md') =>
    ipcRenderer.invoke('soia:fs-create-doc', { name, content, format }),
  readFile: (filePath: string) => ipcRenderer.invoke('soia:fs-read', filePath),
  installLinuxPackage: (packageName: string) => ipcRenderer.send('soia:install-package', packageName),
  openExternal: (url: string) => ipcRenderer.send('soia:open-external', url)
};

contextBridge.exposeInMainWorld('soia', soiaBridge);
