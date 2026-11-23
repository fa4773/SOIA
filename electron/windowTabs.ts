// ==============================================================================
// SOIA Window & Tabs Manager (Detachable Tabs Architecture)
// ==============================================================================
import { BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TabDefinition {
  id: string;
  title: string;
  type: 'harness' | 'browser' | 'terminal' | 'editor';
  url?: string;
  closable: boolean;
  detachable: boolean;
}

export class WindowTabsManager {
  private detachedWindows: Map<string, BrowserWindow> = new Map();
  private mainWindow: BrowserWindow | null = null;

  public setMainWindow(win: BrowserWindow): void {
    this.mainWindow = win;
  }

  public detachTab(tab: TabDefinition, bounds?: { x: number; y: number; width: number; height: number }): boolean {
    // Tab 0 / desktop harness is immutable and cannot be detached
    if (tab.id === 'tab-0' || tab.type === 'harness' || !tab.detachable) {
      console.warn(`[WindowTabsManager] Attempted to detach pinned tab: ${tab.id}`);
      return false;
    }

    if (this.detachedWindows.has(tab.id)) {
      this.detachedWindows.get(tab.id)?.focus();
      return true;
    }

    const detachedWin = new BrowserWindow({
      title: `${tab.title} - SOIA Window`,
      width: bounds?.width || 1000,
      height: bounds?.height || 700,
      x: bounds?.x ? bounds.x + 30 : undefined,
      y: bounds?.y ? bounds.y + 30 : undefined,
      frame: true,
      autoHideMenuBar: true,
      backgroundColor: '#09090b',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        webviewTag: true
      }
    });

    const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;
    const loadUrl = isDev
      ? `${process.env.VITE_DEV_SERVER_URL}?detachedTab=${tab.id}&tabType=${tab.type}`
      : `file://${path.join(__dirname, '../dist/index.html')}?detachedTab=${tab.id}&tabType=${tab.type}`;

    detachedWin.loadURL(loadUrl);

    detachedWin.on('closed', () => {
      this.detachedWindows.delete(tab.id);
      // Notify the main window that the detached window was closed or reattached
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('soia:tab-reattached', { tabId: tab.id });
      }
    });

    this.detachedWindows.set(tab.id, detachedWin);
    return true;
  }

  public reattachTab(tabId: string): boolean {
    const win = this.detachedWindows.get(tabId);
    if (win && !win.isDestroyed()) {
      win.close();
      this.detachedWindows.delete(tabId);
      return true;
    }
    return false;
  }

  public closeAllDetached(): void {
    for (const [, win] of this.detachedWindows) {
      if (!win.isDestroyed()) {
        win.close();
      }
    }
    this.detachedWindows.clear();
  }
}

export const windowTabsManager = new WindowTabsManager();
