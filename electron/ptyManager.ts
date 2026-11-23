// ==============================================================================
// SOIA PTY / Shell Session Manager (Cross-Platform Linux & Windows)
// ==============================================================================
import { spawn, ChildProcess } from 'node:child_process';
import os from 'node:os';
import { EventEmitter } from 'node:events';

export interface ShellOutputPayload {
  data: string;
}

export class PtyManager extends EventEmitter {
  private shellProcess: ChildProcess | null = null;
  private isWindows: boolean = os.platform() === 'win32';

  constructor() {
    super();
    this.initShell();
  }

  private initShell(): void {
    const defaultShell = this.isWindows
      ? (process.env.COMSPEC || 'powershell.exe')
      : (process.env.SHELL || '/bin/bash');

    const shellArgs = this.isWindows ? ['-NoLogo'] : ['-i'];

    try {
      this.shellProcess = spawn(defaultShell, shellArgs, {
        cwd: os.homedir(),
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          SOIA_HARNESS: '1'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.shellProcess.stdout?.on('data', (chunk: Buffer) => {
        this.emit('data', chunk.toString('utf-8'));
      });

      this.shellProcess.stderr?.on('data', (chunk: Buffer) => {
        this.emit('data', chunk.toString('utf-8'));
      });

      this.shellProcess.on('exit', (code) => {
        this.emit('data', `\r\n[SOIA Shell exited with code: ${code}. Restarting...]\r\n`);
        setTimeout(() => this.initShell(), 1500);
      });

      this.shellProcess.on('error', (err) => {
        this.emit('data', `\r\n[SOIA Shell Error: ${err.message}]\r\n`);
      });

      const initialMessage = this.isWindows
        ? `\x1b[1;36m[SOIA OS Dev Harness - Windows Host]\x1b[0m\r\nShell: ${defaultShell}\r\n\r\n`
        : `\x1b[1;32m[SOIA OS Linux Debian Harness]\x1b[0m\r\nKernel: ${os.release()} (${os.arch()})\r\n\r\n`;

      setTimeout(() => this.emit('data', initialMessage), 200);
    } catch (error) {
      console.error('[PtyManager] Error starting shell:', error);
    }
  }

  public write(input: string): void {
    if (this.shellProcess && this.shellProcess.stdin && !this.shellProcess.stdin.destroyed) {
      this.shellProcess.stdin.write(input);
    }
  }

  public resize(_cols: number, _rows: number): void {
    // Handle resize if supported
  }

  public kill(): void {
    if (this.shellProcess) {
      this.shellProcess.kill();
      this.shellProcess = null;
    }
  }
}

export const ptyManager = new PtyManager();
