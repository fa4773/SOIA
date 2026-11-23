import React, { useState } from 'react';
import {
  X,
  Shield,
  Bot,
  HardDrive,
  Cpu,
  Layers,
  Download,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemInfo: any;
  securityProfile: 'strict' | 'balanced' | 'autonomous';
  onUpdateSecurityProfile: (profile: 'strict' | 'balanced' | 'autonomous') => void;
  onInstallPackage: (pkg: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  systemInfo,
  securityProfile,
  onUpdateSecurityProfile,
  onInstallPackage
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'security' | 'system' | 'expand'>('ai');
  const [aiProvider, setAiProvider] = useState('ollama');
  const [modelName, setModelName] = useState('llama3.2:latest');
  const [temperature, setTemperature] = useState(0.7);
  const [contextWindow, setContextWindow] = useState('8192');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl h-[560px] flex flex-col shadow-2xl overflow-hidden text-zinc-100 text-xs">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400 text-xs">
              SO
            </div>
            <h2 className="font-semibold text-sm text-zinc-100">Impostazioni Sistema & AI</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body: Left Nav + Right Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-48 bg-zinc-900/60 border-r border-zinc-800 p-2 space-y-1">
            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'ai'
                  ? 'bg-zinc-800 text-emerald-400'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
              }`}
            >
              <Bot size={15} />
              <span>Modelli & AI</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'security'
                  ? 'bg-zinc-800 text-emerald-400'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
              }`}
            >
              <Shield size={15} />
              <span>Sicurezza OS</span>
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'system'
                  ? 'bg-zinc-800 text-emerald-400'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
              }`}
            >
              <HardDrive size={15} />
              <span>Risorse & Storage</span>
            </button>
            <button
              onClick={() => setActiveTab('expand')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'expand'
                  ? 'bg-zinc-800 text-emerald-400'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
              }`}
            >
              <Layers size={15} />
              <span>Espandi Linux</span>
            </button>
          </div>

          {/* Right Panel */}
          <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
            {activeTab === 'ai' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                  <Bot size={16} className="text-emerald-400" />
                  Provider di Inferenza AI
                </h3>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Provider</label>
                  <select
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ollama">Ollama (Locale Offline / 100% Privato)</option>
                    <option value="openai">OpenAI (API Cloud)</option>
                    <option value="anthropic">Anthropic Claude (API Cloud)</option>
                    <option value="gemini">Google Gemini (API Cloud)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Nome Modello</label>
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-zinc-400 mb-1 font-medium">Temperatura ({temperature})</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1 font-medium">Finestra Contesto (tokens)</label>
                    <input
                      type="text"
                      value={contextWindow}
                      onChange={(e) => setContextWindow(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 text-[11px]">
                  ✓ Modalità Live-First attiva: se Ollama è attivo su localhost:11434, SOIA eseguirà tutti i task agentici e di navigazione in locale senza connessione Internet.
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                  <Shield size={16} className="text-emerald-400" />
                  Profili di Sicurezza & Policy Esecuzione
                </h3>

                <div className="space-y-2">
                  {[
                    {
                      id: 'strict',
                      name: 'Strict (Massima Protezione)',
                      desc: 'Qualsiasi comando bash non di sola lettura richiede conferma interattiva dell\'utente.'
                    },
                    {
                      id: 'balanced',
                      name: 'Balanced (Predefinito Consigliato)',
                      desc: 'Esecuzione automatica dei comandi operativi e di navigazione; blocco e conferma obbligatoria per comandi distruttivi (rm, mkfs, dd).'
                    },
                    {
                      id: 'autonomous',
                      name: 'Autonomous (Piena Autonomia)',
                      desc: 'L\'agente opera in piena autonomia per task prolungati o script di build.'
                    }
                  ].map((p) => (
                    <div
                      key={p.id}
                      onClick={() => onUpdateSecurityProfile(p.id as any)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        securityProfile === p.id
                          ? 'bg-zinc-900 border-emerald-500 text-zinc-100'
                          : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-zinc-200">{p.name}</span>
                        {securityProfile === p.id && (
                          <CheckCircle2 size={15} className="text-emerald-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400">{p.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                  <Cpu size={16} className="text-emerald-400" />
                  Stato Hardware & Persistenza
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                    <div className="text-zinc-500 text-[10px] uppercase font-semibold">Piattaforma</div>
                    <div className="font-bold text-zinc-200 mt-1">{systemInfo?.platform || 'Linux'}</div>
                    <div className="text-[10px] text-zinc-400">{systemInfo?.release}</div>
                  </div>
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                    <div className="text-zinc-500 text-[10px] uppercase font-semibold">Memoria RAM</div>
                    <div className="font-bold text-zinc-200 mt-1">
                      {systemInfo?.usedMemoryMB || 0} / {systemInfo?.totalMemoryMB || 0} MB
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Disponibile: {systemInfo?.freeMemoryMB || 0} MB
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                    <div className="text-zinc-500 text-[10px] uppercase font-semibold">Processore</div>
                    <div className="font-bold text-zinc-200 mt-1">{systemInfo?.cpus || 1} Core Logici</div>
                    <div className="text-[10px] text-zinc-400 truncate">{systemInfo?.cpuModel}</div>
                  </div>
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                    <div className="text-zinc-500 text-[10px] uppercase font-semibold">Modalità Live</div>
                    <div className="font-bold text-zinc-200 mt-1">
                      {systemInfo?.isLiveDebian ? 'Debian Live (RAM/USB)' : 'Host Locale'}
                    </div>
                    <div className="text-[10px] text-zinc-400">Persistenza Stile Tails supportata</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'expand' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                    <Layers size={16} className="text-emerald-400" />
                    Espandi Ambiente Linux (Package Manager)
                  </h3>
                </div>

                <p className="text-zinc-400 text-[11px]">
                  Puoi installare al volo software desktop o interi ambienti grafici direttamente nel sistema Debian live o installato tramite il terminale integrato:
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { name: 'XFCE Desktop Environment', pkg: 'xfce4 xfce4-goodies', type: 'DE' },
                    { name: 'KDE Plasma Desktop', pkg: 'kde-plasma-desktop', type: 'DE' },
                    { name: 'GNOME Shell Minimal', pkg: 'gnome-core', type: 'DE' },
                    { name: 'LibreOffice Suite Completa', pkg: 'libreoffice libreoffice-l10n-it', type: 'App' },
                    { name: 'GIMP & Inkscape', pkg: 'gimp inkscape', type: 'Grafica' },
                    { name: 'Build Essential & Clang', pkg: 'build-essential clang cmake', type: 'Dev' }
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-200">{item.name}</span>
                          <span className="text-[9px] px-1 rounded bg-zinc-800 text-zinc-400">
                            {item.type}
                          </span>
                        </div>
                        <code className="text-[10px] text-zinc-500 block mt-1">apt install {item.pkg}</code>
                      </div>
                      <button
                        onClick={() => {
                          onInstallPackage(item.pkg);
                          onClose();
                        }}
                        className="mt-3 w-full py-1.5 px-2 rounded bg-zinc-800 hover:bg-emerald-600 hover:text-white text-zinc-200 flex items-center justify-center gap-1.5 transition-colors font-medium text-[11px]"
                      >
                        <Download size={12} />
                        <span>Installa nel Terminale</span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-[11px]">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>I pacchetti installati verranno preservati automaticamente se la persistenza è attiva.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
