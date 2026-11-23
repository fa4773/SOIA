// ==============================================================================
// SOIA OS - Electron Main Process (Autonomous Linux / Dev Harness)
// ==============================================================================
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ptyManager } from './ptyManager.js';
import { windowTabsManager, TabDefinition } from './windowTabs.js';
import { securityPolicy, SecurityProfile } from './securityPolicy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;

function getDocumentsDir(): string {
  const home = os.homedir();
  const soiaDocs = path.join(home, 'SOIA_Documents');
  if (!fs.existsSync(soiaDocs)) {
    try {
      fs.mkdirSync(soiaDocs, { recursive: true });
    } catch {
      return home;
    }
  }
  return soiaDocs;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    title: 'SOIA OS',
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 650,
    fullscreen: !isDev && os.platform() === 'linux',
    frame: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#09090b',
      symbolColor: '#a1a1aa',
      height: 38
    },
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true
    }
  });

  windowTabsManager.setMainWindow(mainWindow);

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    windowTabsManager.closeAllDetached();
  });
}

// Forward terminal (PTY) output to the main window
ptyManager.on('data', (data: string) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('soia:shell-output', data);
  }
});

// Register IPC handlers
function registerIpcHandlers(): void {
  // System info for widgets & settings
  ipcMain.handle('soia:get-system-info', async () => {
    const totalMem = Math.round(os.totalmem() / (1024 * 1024));
    const freeMem = Math.round(os.freemem() / (1024 * 1024));
    const usedMem = totalMem - freeMem;

    return {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptimeSeconds: os.uptime(),
      cpus: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || 'Standard CPU',
      totalMemoryMB: totalMem,
      usedMemoryMB: usedMem,
      freeMemoryMB: freeMem,
      isLinux: os.platform() === 'linux',
      isLiveDebian: fs.existsSync('/lib/live/mount') || fs.existsSync('/run/live')
    };
  });

  // Shell input & resize
  ipcMain.on('soia:shell-input', (_event, input: string) => {
    ptyManager.write(input);
  });

  // Detachable tab management (Drag-out)
  ipcMain.handle('soia:detach-tab', async (_event, tab: TabDefinition) => {
    return windowTabsManager.detachTab(tab);
  });

  ipcMain.handle('soia:reattach-tab', async (_event, tabId: string) => {
    return windowTabsManager.reattachTab(tabId);
  });

  // Security profile management
  ipcMain.handle('soia:get-security-profile', async () => {
    return securityPolicy.getProfile();
  });

  ipcMain.handle('soia:set-security-profile', async (_event, profile: SecurityProfile) => {
    securityPolicy.setProfile(profile);
    return true;
  });

  ipcMain.handle('soia:check-command-security', async (_event, command: string) => {
    return securityPolicy.evaluateCommand(command);
  });

  // File System & Document Creation (.doc / .docx / .txt)
  ipcMain.handle('soia:fs-list', async (_event, targetPath?: string) => {
    const dir = targetPath || getDocumentsDir();
    try {
      if (!fs.existsSync(dir)) return [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      return entries.map((item) => ({
        name: item.name,
        isDirectory: item.isDirectory(),
        path: path.join(dir, item.name),
        extension: item.name.includes('.') ? item.name.split('.').pop() : ''
      }));
    } catch (err: any) {
      console.error('[FS List Error]:', err);
      return [];
    }
  });

  ipcMain.handle('soia:fs-create-doc', async (_event, { name, content, format }: { name: string; content: string; format: 'doc' | 'txt' | 'md' }) => {
    const docsDir = getDocumentsDir();
    const cleanName = name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const ext = format === 'doc' ? 'doc' : format === 'md' ? 'md' : 'txt';
    const filePath = path.join(docsDir, cleanName.endsWith(`.${ext}`) ? cleanName : `${cleanName}.${ext}`);

    try {
      if (format === 'doc') {
        // Standard RTF/Word-compatible document generatable anywhere
        const rtfHeader = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang1033{\\fonttbl{\\f0\\fnil\\fcharset0 Segoe UI;}{\\f1\\fnil\\fcharset0 Arial;}}\r\n`;
        const rtfBody = `{\\*\\generator SOIA Document Engine;}\\viewkind4\\uc1\r\n\\pard\\b\\fs28 SOIA Document: ${cleanName}\\b0\\fs20\\par\\par\r\n${content.replace(/\n/g, '\\par ')}\r\n}`;
        fs.writeFileSync(filePath, rtfHeader + rtfBody, 'utf-8');
      } else {
        fs.writeFileSync(filePath, content, 'utf-8');
      }
      return { success: true, filePath };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('soia:fs-read', async (_event, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, content };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Expand Linux environment (install Desktop Environment or packages)
  ipcMain.on('soia:install-package', (_event, packageName: string) => {
    const cmd = os.platform() === 'linux'
      ? `sudo apt-get update && sudo apt-get install -y ${packageName}\n`
      : `Write-Host "Simulated installation of '${packageName}' in Windows development environment"\n`;
    ptyManager.write(cmd);
  });

  ipcMain.on('soia:open-external', (_event, url: string) => {
    shell.openExternal(url);
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
