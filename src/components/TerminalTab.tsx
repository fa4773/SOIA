import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Terminal as TerminalIcon, Play, Trash2 } from 'lucide-react';

interface TerminalTabProps {
  onQuickCommand?: (cmd: string) => void;
}

export const TerminalTab: React.FC<TerminalTabProps> = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<XTerm | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Consolas, "Fira Code", monospace',
      theme: {
        background: '#09090b',
        foreground: '#e4e4e7',
        cursor: '#10b981',
        selectionBackground: '#27272a',
        black: '#18181b',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#d946ef',
        cyan: '#06b6d4',
        white: '#f4f4f5'
      }
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(terminalRef.current);
    fit.fit();

    xtermInstance.current = term;
    fitAddon.current = fit;

    // Ascolto input da tastiera dell'utente e invio via IPC
    term.onData((data) => {
      window.soia?.sendShellInput(data);
    });

    // Ascolto output dal processo shell principale
    const cleanupListener = window.soia?.onShellOutput((data) => {
      term.write(data);
    });

    const handleResize = () => {
      try {
        fit.fit();
      } catch {}
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cleanupListener?.();
      term.dispose();
    };
  }, []);

  const sendCommand = (cmd: string) => {
    window.soia?.sendShellInput(cmd + '\n');
  };

  const handleClear = () => {
    xtermInstance.current?.clear();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Terminal Toolbar */}
      <div className="h-10 px-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <TerminalIcon size={15} className="text-emerald-400" />
          <span className="font-semibold text-zinc-200">Terminale di Sistema SOIA (Native PTY)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick system buttons */}
          <button
            onClick={() => sendCommand('uname -a')}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1 transition-colors"
          >
            <Play size={11} className="text-blue-400" />
            <span>uname</span>
          </button>
          <button
            onClick={() => sendCommand('df -h')}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1 transition-colors"
          >
            <Play size={11} className="text-amber-400" />
            <span>Storage (df -h)</span>
          </button>
          <button
            onClick={() => sendCommand('ls -la')}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1 transition-colors"
          >
            <Play size={11} className="text-emerald-400" />
            <span>ls -la</span>
          </button>
          <button
            onClick={handleClear}
            title="Pulisci terminale"
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors ml-2"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Terminal Container */}
      <div className="flex-1 p-2 bg-zinc-950 overflow-hidden">
        <div ref={terminalRef} className="w-full h-full" />
      </div>
    </div>
  );
};
