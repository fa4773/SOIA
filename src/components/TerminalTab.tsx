import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Terminal as TerminalIcon, Play, Trash2, Send, Wifi } from 'lucide-react';

interface TerminalTabProps {
  isActive?: boolean;
  onQuickCommand?: (cmd: string) => void;
}

export const TerminalTab: React.FC<TerminalTabProps> = ({ isActive = true }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<XTerm | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const [commandInput, setCommandInput] = useState('');

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Consolas, "DejaVu Sans Mono", "Fira Code", monospace',
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
    try {
      fit.fit();
    } catch {}

    xtermInstance.current = term;
    fitAddon.current = fit;

    // Listen for user keyboard input and send via IPC
    term.onData((data) => {
      window.soia?.sendShellInput(data);
    });

    // Listen for output from the main shell process
    const cleanupListener = window.soia?.onShellOutput((data) => {
      term.write(data);
    });

    const handleResize = () => {
      try {
        fit.fit();
      } catch {}
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(terminalRef.current);

    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      cleanupListener?.();
      term.dispose();
    };
  }, []);

  // Re-fit and focus XTerm whenever this tab becomes visible
  useEffect(() => {
    if (isActive && xtermInstance.current && fitAddon.current) {
      const timer = setTimeout(() => {
        try {
          fitAddon.current?.fit();
          xtermInstance.current?.focus();
        } catch {}
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  const sendCommand = (cmd: string) => {
    if (!cmd.trim()) return;
    window.soia?.sendShellInput(cmd + '\r');
    xtermInstance.current?.focus();
  };

  const handleSubmitInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    sendCommand(commandInput);
    setCommandInput('');
  };

  const handleClear = () => {
    xtermInstance.current?.clear();
    xtermInstance.current?.focus();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-hidden select-text">
      {/* Terminal Toolbar */}
      <div className="h-10 px-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon size={15} className="text-emerald-400" />
          <span className="font-semibold text-zinc-200">SOIA System Terminal (Native PTY)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => sendCommand('nmcli device wifi list')}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1 transition-colors"
          >
            <Wifi size={11} className="text-emerald-400" />
            <span>Wi-Fi List</span>
          </button>
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
            <span>Storage</span>
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
            title="Clear terminal"
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors ml-1"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Interactive XTerm Container */}
      <div
        className="flex-1 p-2 bg-zinc-950 overflow-hidden cursor-text"
        onClick={() => xtermInstance.current?.focus()}
      >
        <div ref={terminalRef} className="w-full h-full" />
      </div>

      {/* Explicit Command Input Bar (always visible & clickable) */}
      <form
        onSubmit={handleSubmitInput}
        className="px-3 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2 shrink-0"
      >
        <span className="text-emerald-400 font-mono text-xs font-bold">$</span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          placeholder="Scrivi un comando bash (es. nmtui, nmcli device status, ls) e premi Invio..."
          className="flex-1 bg-zinc-950 border border-zinc-700 rounded-md px-3 py-1.5 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          className="px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition-colors"
        >
          <Send size={12} />
          <span>Run</span>
        </button>
      </form>
    </div>
  );
};
