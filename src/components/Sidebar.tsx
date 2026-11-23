import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  FolderTree,
  Settings,
  FileText,
  FileCode,
  Terminal,
  Globe,
  HardDrive,
  Cpu,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { FileEntry } from '../types/soia';

interface SidebarProps {
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onOpenSettings: () => void;
  files: FileEntry[];
  onCreateDoc: () => void;
  onOpenFile: (file: FileEntry) => void;
  onOpenNewChat: () => void;
  systemInfo: any;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTabId,
  onSelectTab,
  onOpenSettings,
  files,
  onCreateDoc,
  onOpenFile,
  onOpenNewChat,
  systemInfo
}) => {
  const [activeSection, setActiveSection] = useState<'chats' | 'files'>('chats');
  const [filesExpanded, setFilesExpanded] = useState(true);

  // Esempi chat recenti
  const [chatHistory] = useState([
    { id: 'chat-1', title: 'Configurazione rete e persistenza Debian' },
    { id: 'chat-2', title: 'Generazione report Word e sintesi dati' },
    { id: 'chat-3', title: 'Script shell per partizionamento disco' }
  ]);

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full select-none text-zinc-300">
      {/* Brand Header */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400 text-xs">
            SO
          </div>
          <div>
            <h1 className="font-semibold text-sm text-zinc-100 tracking-wide">SOIA OS</h1>
            <p className="text-[10px] text-zinc-400">Autonomous Desktop</p>
          </div>
        </div>
        <button
          onClick={onOpenNewChat}
          title="Nuova Chat Agentica"
          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Nav Switcher */}
      <div className="flex border-b border-zinc-800/80 px-2 pt-2 gap-1 text-xs font-medium">
        <button
          onClick={() => setActiveSection('chats')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-md transition-colors ${
            activeSection === 'chats'
              ? 'bg-zinc-900 text-zinc-100 border-t border-l border-r border-zinc-700/60'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <MessageSquare size={14} />
          <span>Chat</span>
        </button>
        <button
          onClick={() => setActiveSection('files')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-md transition-colors ${
            activeSection === 'files'
              ? 'bg-zinc-900 text-zinc-100 border-t border-l border-r border-zinc-700/60'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <FolderTree size={14} />
          <span>Documenti & File</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar text-xs">
        {activeSection === 'chats' ? (
          <div>
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              <span>Recenti</span>
            </div>
            <div className="space-y-0.5 mt-1">
              <button
                onClick={() => onSelectTab('tab-0')}
                className={`w-full text-left px-2.5 py-2 rounded-md flex items-center gap-2 transition-colors ${
                  activeTabId === 'tab-0'
                    ? 'bg-zinc-800 text-emerald-400 font-medium'
                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate">Sessione Principale (Live)</span>
              </button>
              {chatHistory.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => onSelectTab('tab-0')}
                  className="w-full text-left px-2.5 py-1.5 rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 truncate transition-colors flex items-center gap-2"
                >
                  <MessageSquare size={13} className="shrink-0 text-zinc-500" />
                  <span className="truncate">{chat.title}</span>
                </button>
              ))}
            </div>

            {/* Quick System Tools */}
            <div className="pt-4 border-t border-zinc-900">
              <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Strumenti SOIA
              </div>
              <div className="space-y-0.5 mt-1">
                <button
                  onClick={() => onSelectTab('tab-browser')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md flex items-center gap-2 transition-colors ${
                    activeTabId === 'tab-browser'
                      ? 'bg-zinc-800 text-blue-400'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <Globe size={14} className="text-blue-400" />
                  <span>Browser Agentico</span>
                </button>
                <button
                  onClick={() => onSelectTab('tab-terminal')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md flex items-center gap-2 transition-colors ${
                    activeTabId === 'tab-terminal'
                      ? 'bg-zinc-800 text-emerald-400'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <Terminal size={14} className="text-emerald-400" />
                  <span>Terminale Linux</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between px-2 py-1">
              <button
                onClick={() => setFilesExpanded(!filesExpanded)}
                className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider hover:text-zinc-200"
              >
                {filesExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>Documenti & Dati</span>
              </button>
              <button
                onClick={onCreateDoc}
                title="Crea nuovo documento o nota"
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>

            {filesExpanded && (
              <div className="space-y-0.5 mt-1">
                {files.length === 0 ? (
                  <div className="px-2 py-3 text-center text-zinc-500 italic">
                    Nessun documento creato. Clicca + per iniziare.
                  </div>
                ) : (
                  files.map((file, idx) => (
                    <button
                      key={idx}
                      onClick={() => onOpenFile(file)}
                      className="w-full text-left px-2.5 py-1.5 rounded-md text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100 flex items-center gap-2 truncate transition-colors"
                    >
                      {file.extension === 'doc' || file.extension === 'docx' ? (
                        <FileText size={14} className="text-blue-400 shrink-0" />
                      ) : file.extension === 'md' || file.extension === 'txt' ? (
                        <FileText size={14} className="text-emerald-400 shrink-0" />
                      ) : (
                        <FileCode size={14} className="text-amber-400 shrink-0" />
                      )}
                      <span className="truncate">{file.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer & OS Status */}
      <div className="p-2 border-t border-zinc-800 bg-zinc-950/80 space-y-1">
        {systemInfo && (
          <div className="px-2 py-1 text-[10px] text-zinc-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Cpu size={12} className="text-zinc-400" />
              {systemInfo.cpus} Core
            </span>
            <span className="flex items-center gap-1">
              <HardDrive size={12} className="text-zinc-400" />
              {systemInfo.usedMemoryMB || 0} / {systemInfo.totalMemoryMB || 0} MB
            </span>
          </div>
        )}
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100 transition-colors text-xs font-medium"
        >
          <span className="flex items-center gap-2">
            <Settings size={15} className="text-zinc-400" />
            <span>Impostazioni OS & AI</span>
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
            {systemInfo?.platform === 'win32' ? 'Win Dev' : 'Debian'}
          </span>
        </button>
      </div>
    </aside>
  );
};
