// ==============================================================================
// SOIA OS - Electron Main Process (Autonomous Linux / Dev Harness)
// ==============================================================================
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ptyManager } from './ptyManager.js';
import { windowTabsManager, TabDefinition } from './windowTabs.js';
import { securityPolicy, SecurityProfile } from './securityPolicy.js';

const execFileAsync = promisify(execFile);

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

  // ============================================================================
  // Network & Wi-Fi Management (NetworkManager / nmcli on Linux)
  // ============================================================================
  ipcMain.handle('soia:net-status', async () => {
    if (os.platform() !== 'linux') {
      return {
        success: true,
        devices: [
          { device: 'eth0', type: 'ethernet', state: 'connected', connection: 'Host Network (Dev)' }
        ]
      };
    }
    try {
      const { stdout } = await execFileAsync('nmcli', ['-t', '-f', 'DEVICE,TYPE,STATE,CONNECTION', 'device', 'status'], {
        timeout: 8000
      });
      const devices = stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [device = '', type = '', state = '', connection = ''] = line.split(':');
          return { device, type, state, connection };
        })
        .filter((d) => d.type === 'wifi' || d.type === 'ethernet');
      return { success: true, devices };
    } catch (err: any) {
      return { success: false, devices: [], error: err?.message || 'nmcli not available' };
    }
  });

  ipcMain.handle('soia:wifi-scan', async () => {
    if (os.platform() !== 'linux') {
      return {
        success: true,
        networks: [
          { inUse: true, ssid: 'Host-WiFi-Preview', signal: 90, security: 'WPA2' }
        ]
      };
    }
    try {
      // Ensure Wi-Fi radio is enabled
      await execFileAsync('nmcli', ['radio', 'wifi', 'on'], { timeout: 5000 }).catch(() => {});
      let stdout = '';
      try {
        const res = await execFileAsync(
          'nmcli',
          ['-t', '-f', 'IN-USE,SSID,SIGNAL,SECURITY', 'device', 'wifi', 'list', '--rescan', 'yes'],
          { timeout: 15000 }
        );
        stdout = res.stdout;
      } catch {
        const res = await execFileAsync(
          'nmcli',
          ['-t', '-f', 'IN-USE,SSID,SIGNAL,SECURITY', 'device', 'wifi', 'list'],
          { timeout: 10000 }
        );
        stdout = res.stdout;
      }

      const bySsid = new Map<string, { inUse: boolean; ssid: string; signal: number; security: string }>();
      for (const rawLine of stdout.split('\n')) {
        const line = rawLine.trim();
        if (!line) continue;
        // nmcli escapes ':' inside fields as '\:'
        const parts = line.split(/(?<!\\):/).map((p) => p.replace(/\\:/g, ':'));
        const inUse = parts[0] === '*';
        const ssid = (parts[1] || '').trim();
        const signal = parseInt(parts[2] || '0', 10) || 0;
        const security = (parts[3] || 'Open').trim() || 'Open';
        if (!ssid) continue;

        const existing = bySsid.get(ssid);
        if (!existing || inUse || signal > existing.signal) {
          bySsid.set(ssid, { inUse: inUse || existing?.inUse || false, ssid, signal, security });
        }
      }

      const networks = Array.from(bySsid.values()).sort((a, b) => {
        if (a.inUse !== b.inUse) return a.inUse ? -1 : 1;
        return b.signal - a.signal;
      });
      return { success: true, networks };
    } catch (err: any) {
      return { success: false, networks: [], error: err?.stderr || err?.message || 'Wi-Fi scan failed' };
    }
  });

  ipcMain.handle('soia:wifi-connect', async (_event, { ssid, password }: { ssid: string; password?: string }) => {
    if (!ssid) return { success: false, error: 'SSID is required' };
    if (os.platform() !== 'linux') {
      return { success: true, message: `Simulated connection to ${ssid}` };
    }
    try {
      const args = ['device', 'wifi', 'connect', ssid];
      if (password && password.length > 0) {
        args.push('password', password);
      }
      const { stdout } = await execFileAsync('nmcli', args, { timeout: 25000 });
      return { success: true, message: stdout.trim() || `Connected to ${ssid}` };
    } catch (err: any) {
      return {
        success: false,
        error: (err?.stderr || err?.stdout || err?.message || 'Failed to connect').trim()
      };
    }
  });

  ipcMain.handle('soia:wifi-disconnect', async (_event, { device }: { device: string }) => {
    if (!device) return { success: false, error: 'Device name is required' };
    if (os.platform() !== 'linux') return { success: true };
    try {
      await execFileAsync('nmcli', ['device', 'disconnect', device], { timeout: 10000 });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: (err?.stderr || err?.message || 'Disconnect failed').trim() };
    }
  });

  // ============================================================================
  // Multi-Provider AI Chat (Ollama Local + OpenAI / Gemini / Anthropic / OpenRouter / Groq / Custom)
  // ============================================================================
  ipcMain.handle(
    'soia:ai-chat',
    async (
      _event,
      payload: {
        config: {
          provider: string;
          model: string;
          apiKey?: string;
          baseUrl?: string;
          temperature?: number;
        };
        messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
      }
    ) => {
      const { config, messages } = payload;
      const provider = config.provider || 'ollama';
      const model = (config.model || '').trim();
      const apiKey = (config.apiKey || '').trim();
      const temperature = typeof config.temperature === 'number' ? config.temperature : 0.7;

      if (!model) {
        return { success: false, error: 'Model name is empty. Configure a model in Settings -> Models & AI.' };
      }

      try {
        // 1. Ollama (Local)
        if (provider === 'ollama') {
          const base = (config.baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
          const res = await fetch(`${base}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              messages,
              stream: false,
              options: { temperature }
            })
          });
          if (!res.ok) {
            const txt = await res.text();
            return { success: false, error: `Ollama error (${res.status}): ${txt.slice(0, 300)}` };
          }
          const data: any = await res.json();
          return { success: true, content: data?.message?.content || data?.response || '' };
        }

        if (!apiKey && provider !== 'custom') {
          return {
            success: false,
            error: `API Key mancante per il provider "${provider}". Inseriscila in Settings -> Models & AI.`
          };
        }

        // 2. Google Gemini REST API
        if (provider === 'gemini') {
          const systemMsg = messages.find((m) => m.role === 'system')?.content;
          const contents = messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            }));
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
          const body: any = {
            contents,
            generationConfig: { temperature }
          };
          if (systemMsg) {
            body.systemInstruction = { parts: [{ text: systemMsg }] };
          }
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          const data: any = await res.json();
          if (!res.ok) {
            return { success: false, error: data?.error?.message || `Gemini HTTP ${res.status}` };
          }
          const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
          return { success: true, content: text };
        }

        // 3. Anthropic Claude Messages API
        if (provider === 'anthropic') {
          const systemMsg = messages.find((m) => m.role === 'system')?.content;
          const chatMessages = messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role, content: m.content }));
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model,
              max_tokens: 2048,
              temperature,
              ...(systemMsg ? { system: systemMsg } : {}),
              messages: chatMessages
            })
          });
          const data: any = await res.json();
          if (!res.ok) {
            return { success: false, error: data?.error?.message || `Anthropic HTTP ${res.status}` };
          }
          const text = Array.isArray(data?.content)
            ? data.content.map((c: any) => c.text || '').join('')
            : '';
          return { success: true, content: text };
        }

        // 4. OpenAI / OpenRouter / Groq / Custom OpenAI-compatible
        const defaultBases: Record<string, string> = {
          openai: 'https://api.openai.com/v1',
          openrouter: 'https://openrouter.ai/api/v1',
          groq: 'https://api.groq.com/openai/v1',
          custom: 'https://api.openai.com/v1'
        };
        const base = (config.baseUrl || defaultBases[provider] || defaultBases.openai).replace(/\/+$/, '');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
        if (provider === 'openrouter') {
          headers['HTTP-Referer'] = 'https://soia-os.local';
          headers['X-Title'] = 'SOIA OS';
        }
        const res = await fetch(`${base}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model,
            messages,
            temperature
          })
        });
        const data: any = await res.json();
        if (!res.ok) {
          return { success: false, error: data?.error?.message || `${provider} HTTP ${res.status}` };
        }
        const text = data?.choices?.[0]?.message?.content || '';
        return { success: true, content: text };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Network or AI provider error' };
      }
    }
  );
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
