import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Terminal,
  FileText,
  Play,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Cpu,
  ShieldCheck,
  Bot
} from 'lucide-react';

interface ToolExecution {
  id: string;
  tool: string;
  args: any;
  status: 'running' | 'success' | 'failed';
  output?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tools?: ToolExecution[];
}

interface AgentHarnessChatProps {
  onExecuteInShell: (cmd: string) => void;
  onCreateDocRequest: (name: string, content: string) => void;
  onOpenBrowserUrl: (url: string) => void;
  systemInfo: any;
  securityProfile: string;
}

export const AgentHarnessChat: React.FC<AgentHarnessChatProps> = ({
  onExecuteInShell,
  onCreateDocRequest,
  onOpenBrowserUrl,
  systemInfo,
  securityProfile
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-welcome',
      sender: 'assistant',
      content: `Benvenuto in **SOIA OS**! Sono il tuo Harness Agentico di sistema.

Posso eseguire comandi Linux, navigare e interagire su pagine web tramite il browser integrato, creare documenti formattati (\`.doc\`, \`.txt\`, note) ed espandere l'ambiente Debian con qualsiasi software tu desideri.

Come posso assisterti adesso?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConsoleDrawer, setShowConsoleDrawer] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userText = input;
    setInput('');
    const newMsgId = `msg-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      { id: newMsgId, sender: 'user', content: userText, timestamp }
    ]);

    setIsProcessing(true);

    // Esecuzione agentica autonoma/reattiva intelligente
    setTimeout(() => {
      processAgentResponse(userText, timestamp);
    }, 600);
  };

  const processAgentResponse = (userText: string, timestamp: string) => {
    const lower = userText.toLowerCase();
    const tools: ToolExecution[] = [];
    let assistantReply = '';

    if (lower.includes('crea') && (lower.includes('doc') || lower.includes('documento') || lower.includes('word'))) {
      const docName = 'Rapporto_SOIA_' + Date.now().toString().slice(-4);
      const docContent = `RAPPORTO OPERATIVO GENERATO DA SOIA OS\nData: ${new Date().toLocaleDateString()}\nStato Sistema: Operativo e Attivo\n\nQuesto documento è stato generato nativamente dall'Agent Harness di SOIA.`;
      
      tools.push({
        id: 't-doc',
        tool: 'fs_create_document',
        args: { name: `${docName}.doc`, format: 'doc' },
        status: 'success',
        output: `File generato con successo: ~/SOIA_Documents/${docName}.doc`
      });

      onCreateDocRequest(docName, docContent);
      assistantReply = `Ho generato il documento **${docName}.doc** direttamente nel file system locale e l'ho aggiunto al tuo workspace. Puoi aprirlo ed esportarlo in qualsiasi momento.`;
    } else if (lower.includes('naviga') || lower.includes('browser') || lower.includes('cerca su internet') || lower.includes('sito')) {
      const targetUrl = 'https://duckduckgo.com';
      tools.push({
        id: 't-browser',
        tool: 'agentic_browser_navigate',
        args: { url: targetUrl },
        status: 'success',
        output: `Browser inizializzato su ${targetUrl}`
      });
      onOpenBrowserUrl(targetUrl);
      assistantReply = `Ho aperto la scheda **Browser Agentico** su \`${targetUrl}\`. Posso leggere il DOM, estrarre articoli ed eseguire azioni per tuo conto.`;
    } else if (lower.includes('hardware') || lower.includes('ram') || lower.includes('cpu') || lower.includes('sistema')) {
      tools.push({
        id: 't-sys',
        tool: 'os_get_system_metrics',
        args: { platform: systemInfo?.platform },
        status: 'success',
        output: `CPU: ${systemInfo?.cpuModel} (${systemInfo?.cpus} cores) | RAM: ${systemInfo?.usedMemoryMB}/${systemInfo?.totalMemoryMB} MB`
      });
      assistantReply = `Ecco lo stato attuale delle risorse SOIA:
* **Host / Kernel:** ${systemInfo?.platform === 'win32' ? 'Windows Host (Dev Harness)' : 'Debian Linux Live'} (${systemInfo?.release || 'Linux'})
* **CPU:** ${systemInfo?.cpuModel} con ${systemInfo?.cpus} core logici
* **Memoria RAM:** ${systemInfo?.usedMemoryMB} MB in uso su ${systemInfo?.totalMemoryMB} MB totali
* **Profilo Sicurezza:** ${securityProfile.toUpperCase()}`;
    } else if (lower.startsWith('run ') || lower.startsWith('cmd ') || lower.startsWith('bash ')) {
      const command = userText.replace(/^(run|cmd|bash)\s+/i, '');
      tools.push({
        id: 't-sh',
        tool: 'shell_execute',
        args: { command },
        status: 'success',
        output: `Comando inviato alla shell: ${command}`
      });
      onExecuteInShell(command + '\n');
      assistantReply = `Comando inviato ed eseguito nella shell del sistema operativo: \`${command}\`.`;
    } else {
      assistantReply = `Ho analizzato la tua richiesta: *"${userText}"*.\n\nPosso interagire direttamente con l'hardware e i software del sistema operativo, eseguire script shell, navigare sul web con Chromium o creare report e note in tempo reale.`;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `reply-${Date.now()}`,
        sender: 'assistant',
        content: assistantReply,
        timestamp,
        tools: tools.length > 0 ? tools : undefined
      }
    ]);

    if (tools.length > 0) {
      setConsoleLogs((prev) => [
        ...prev,
        ...tools.map((t) => `[TOOL ${t.tool}] -> ${t.output || 'OK'}`)
      ]);
    }

    setIsProcessing(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-hidden relative">
      {/* Top Action / Status Bar */}
      <div className="h-10 px-4 border-b border-zinc-900 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium text-zinc-300">
            <Bot size={15} className="text-emerald-400" />
            SOIA Agentic Desktop
          </span>
          <span className="text-zinc-600">|</span>
          <span className="flex items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-400" />
            Security: <strong className="text-zinc-200 capitalize">{securityProfile}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConsoleDrawer(!showConsoleDrawer)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
          >
            <Terminal size={13} className="text-amber-400" />
            <span>Agent Activity Console ({consoleLogs.length})</span>
            {showConsoleDrawer ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-zinc-400">
              <span className="font-semibold text-zinc-300">
                {msg.sender === 'user' ? 'Francesco' : 'SOIA Harness'}
              </span>
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>

            <div
              className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                msg.sender === 'user'
                  ? 'bg-zinc-800 text-zinc-100 rounded-tr-sm border border-zinc-700/60'
                  : 'bg-zinc-900/90 text-zinc-200 rounded-tl-sm border border-zinc-800/80'
              }`}
            >
              {msg.content}

              {/* Tool Execution Transparency Block */}
              {msg.tools && msg.tools.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-zinc-800 space-y-2">
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu size={13} className="text-emerald-400" />
                    Azioni di Sistema Eseguite
                  </div>
                  {msg.tools.map((tool) => (
                    <div
                      key={tool.id}
                      className="bg-zinc-950/70 rounded-md p-2 text-xs border border-zinc-800/80 font-mono"
                    >
                      <div className="flex items-center justify-between text-zinc-400 mb-1">
                        <span className="text-emerald-400 font-semibold">{tool.tool}</span>
                        <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                          <CheckCircle2 size={12} className="text-emerald-400" />
                          Success
                        </span>
                      </div>
                      {tool.output && <div className="text-zinc-300 text-[11px]">{tool.output}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-zinc-400 italic py-2">
            <Clock size={14} className="animate-spin text-emerald-400" />
            L'agente sta elaborando la richiesta e coordinando i tool di sistema...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating System Quick-Actions */}
      <div className="px-4 py-1.5 flex flex-wrap gap-2 text-xs">
        <button
          onClick={() => handleSendWithText('Crea un documento doc con il resoconto')}
          className="px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 flex items-center gap-1.5 transition-colors"
        >
          <FileText size={13} className="text-blue-400" />
          <span>Crea Documento Word/Doc</span>
        </button>
        <button
          onClick={() => handleSendWithText('Apri browser su duckduckgo.com')}
          className="px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 flex items-center gap-1.5 transition-colors"
        >
          <Play size={13} className="text-emerald-400" />
          <span>Avvia Browser Agentico</span>
        </button>
        <button
          onClick={() => handleSendWithText('Mostra stato hardware, RAM e CPU')}
          className="px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 flex items-center gap-1.5 transition-colors"
        >
          <Cpu size={13} className="text-amber-400" />
          <span>Stato Risorse SOIA</span>
        </button>
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-zinc-900 bg-zinc-950">
        <div className="max-w-4xl mx-auto flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 shadow-lg focus-within:border-zinc-700 transition-colors">
          <button
            title="Allega file o sorgente"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <Paperclip size={18} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Chiedi a SOIA (es. crea documento, esegui comando, naviga su una pagina)..."
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className={`p-2 rounded-xl transition-all ${
              input.trim() && !isProcessing
                ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Drawer Console Logs */}
      {showConsoleDrawer && (
        <div className="h-44 border-t border-zinc-800 bg-zinc-950 p-3 flex flex-col text-xs font-mono">
          <div className="flex items-center justify-between pb-1 mb-2 border-b border-zinc-800/80 text-zinc-400 text-[11px]">
            <span>Registro Azioni Agente & Tool Execution</span>
            <button
              onClick={() => setConsoleLogs([])}
              className="text-zinc-500 hover:text-zinc-300 text-[10px]"
            >
              Cancella log
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar text-zinc-300">
            {consoleLogs.length === 0 ? (
              <div className="text-zinc-600 italic">Nessuna azione recente registrata.</div>
            ) : (
              consoleLogs.map((log, idx) => (
                <div key={idx} className="leading-tight">
                  <span className="text-emerald-500">➜</span> {log}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  function handleSendWithText(text: string) {
    setInput(text);
  }
};
