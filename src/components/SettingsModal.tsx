import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Bot,
  HardDrive,
  Cpu,
  Layers,
  Download,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
  Globe,
  Plug
} from 'lucide-react';
import { AiConfig, AiProvider, NetworkDevice, WifiNetwork } from '../types/soia';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'ai' | 'network' | 'security' | 'system' | 'expand';
  systemInfo: any;
  securityProfile: 'strict' | 'balanced' | 'autonomous';
  onUpdateSecurityProfile: (profile: 'strict' | 'balanced' | 'autonomous') => void;
  onInstallPackage: (pkg: string) => void;
  aiConfig: AiConfig;
  onUpdateAiConfig: (config: AiConfig) => void;
}

const PROVIDER_DEFAULTS: Record<
  AiProvider,
  { label: string; defaultModel: string; baseUrl: string; presets: string[]; needsKey: boolean }
> = {
  gemini: {
    label: 'Google Gemini (Online API)',
    defaultModel: 'gemini-2.5-flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    presets: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
    needsKey: true
  },
  openai: {
    label: 'OpenAI (Online API)',
    defaultModel: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    presets: ['gpt-4o-mini', 'gpt-4o', 'o3-mini'],
    needsKey: true
  },
  anthropic: {
    label: 'Anthropic Claude (Online API)',
    defaultModel: 'claude-3-5-sonnet-latest',
    baseUrl: 'https://api.anthropic.com/v1',
    presets: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
    needsKey: true
  },
  openrouter: {
    label: 'OpenRouter (Multi-Model Online)',
    defaultModel: 'google/gemini-2.0-flash-001',
    baseUrl: 'https://openrouter.ai/api/v1',
    presets: ['google/gemini-2.0-flash-001', 'openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.3-70b-instruct'],
    needsKey: true
  },
  groq: {
    label: 'Groq Cloud (Fast Online API)',
    defaultModel: 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
    presets: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    needsKey: true
  },
  custom: {
    label: 'Custom OpenAI-Compatible Endpoint',
    defaultModel: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    presets: [],
    needsKey: true
  },
  ollama: {
    label: 'Ollama (Local Offline / 100% Private)',
    defaultModel: 'llama3.2:latest',
    baseUrl: 'http://localhost:11434',
    presets: ['llama3.2:latest', 'qwen2.5:7b', 'mistral:latest', 'deepseek-r1:8b'],
    needsKey: false
  }
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'ai',
  systemInfo,
  securityProfile,
  onUpdateSecurityProfile,
  onInstallPackage,
  aiConfig,
  onUpdateAiConfig
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'network' | 'security' | 'system' | 'expand'>(initialTab);
  const [showApiKey, setShowApiKey] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  // Network / Wi-Fi state
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [wifiList, setWifiList] = useState<WifiNetwork[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedSsid, setSelectedSsid] = useState<string | null>(null);
  const [wifiPassword, setWifiPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [netFeedback, setNetFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const refreshNetwork = async (scan = true) => {
    if (!window.soia?.getNetworkStatus) return;
    setIsScanning(true);
    setNetFeedback(null);
    try {
      const statusRes = await window.soia.getNetworkStatus();
      if (statusRes.success) {
        setDevices(statusRes.devices || []);
      }
      if (scan && window.soia.scanWifiNetworks) {
        const scanRes = await window.soia.scanWifiNetworks();
        if (scanRes.success) {
          setWifiList(scanRes.networks || []);
        } else if (scanRes.error) {
          setNetFeedback({ type: 'err', text: scanRes.error });
        }
      }
    } catch (err: any) {
      setNetFeedback({ type: 'err', text: err?.message || 'Errore lettura rete' });
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'network') {
      refreshNetwork(true);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const providerMeta = PROVIDER_DEFAULTS[aiConfig.provider] || PROVIDER_DEFAULTS.ollama;

  const handleProviderChange = (newProvider: AiProvider) => {
    const meta = PROVIDER_DEFAULTS[newProvider];
    onUpdateAiConfig({
      ...aiConfig,
      provider: newProvider,
      model: meta.defaultModel,
      baseUrl: meta.baseUrl
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1500);
  };

  const handleFieldChange = (patch: Partial<AiConfig>) => {
    onUpdateAiConfig({ ...aiConfig, ...patch });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1500);
  };

  const handleConnectWifi = async (ssid: string) => {
    if (!window.soia?.connectWifi) return;
    setIsConnecting(true);
    setNetFeedback(null);
    try {
      const res = await window.soia.connectWifi(ssid, wifiPassword);
      if (res.success) {
        setNetFeedback({ type: 'ok', text: `Connesso a "${ssid}"!` });
        setSelectedSsid(null);
        setWifiPassword('');
        await refreshNetwork(false);
      } else {
        setNetFeedback({ type: 'err', text: res.error || 'Connessione fallita' });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (device: string) => {
    if (!window.soia?.disconnectNetwork) return;
    const res = await window.soia.disconnectNetwork(device);
    if (res.success) {
      setNetFeedback({ type: 'ok', text: `Dispositivo ${device} disconnesso.` });
      await refreshNetwork(false);
    } else {
      setNetFeedback({ type: 'err', text: res.error || 'Disconnessione fallita' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl h-[600px] flex flex-col shadow-2xl overflow-hidden text-zinc-100 text-xs">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400 text-xs">
              SO
            </div>
            <h2 className="font-semibold text-sm text-zinc-100">System, Network & AI Settings</h2>
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
          <div className="w-48 bg-zinc-900/60 border-r border-zinc-800 p-2 space-y-1 shrink-0">
            <button
              onClick={() => setActiveTab('network')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'network'
                  ? 'bg-zinc-800 text-emerald-400'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
              }`}
            >
              <Wifi size={15} />
              <span>Network & Wi-Fi</span>
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'ai'
                  ? 'bg-zinc-800 text-emerald-400'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
              }`}
            >
              <Bot size={15} />
              <span>Models & AI</span>
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
              <span>OS Security</span>
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
              <span>Resources & Storage</span>
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
              <span>Expand Linux</span>
            </button>
          </div>

          {/* Right Panel */}
          <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
            {activeTab === 'network' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                    <Wifi size={16} className="text-emerald-400" />
                    Network & Wi-Fi Manager
                  </h3>
                  <button
                    onClick={() => refreshNetwork(true)}
                    disabled={isScanning}
                    className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={isScanning ? 'animate-spin text-emerald-400' : ''} />
                    <span>{isScanning ? 'Scansione...' : 'Aggiorna / Scansiona'}</span>
                  </button>
                </div>

                {/* Active Interfaces */}
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase font-semibold text-zinc-500">Interfacce di Rete</div>
                  {devices.length === 0 ? (
                    <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-zinc-400">
                      Nessuna interfaccia rilevata ancora. Clicca su Aggiorna.
                    </div>
                  ) : (
                    devices.map((d) => (
                      <div
                        key={d.device}
                        className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Plug size={13} className={d.state === 'connected' ? 'text-emerald-400' : 'text-zinc-500'} />
                          <div>
                            <span className="font-semibold text-zinc-200">{d.device}</span>
                            <span className="text-zinc-500 ml-1.5">({d.type})</span>
                            <div className="text-[10px] text-zinc-400">
                              {d.state === 'connected' ? `Connesso: ${d.connection}` : d.state}
                            </div>
                          </div>
                        </div>
                        {d.state === 'connected' && (
                          <button
                            onClick={() => handleDisconnect(d.device)}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-red-500/20 hover:text-red-300 text-zinc-300 text-[10px]"
                          >
                            Disconnetti
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {netFeedback && (
                  <div
                    className={`p-2.5 rounded-lg text-[11px] border ${
                      netFeedback.type === 'ok'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    {netFeedback.text}
                  </div>
                )}

                {/* Available Wi-Fi Networks */}
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase font-semibold text-zinc-500">
                    Reti Wi-Fi Disponibili ({wifiList.length})
                  </div>
                  {wifiList.length === 0 ? (
                    <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 text-zinc-400">
                      {isScanning
                        ? 'Ricerca reti Wi-Fi in corso...'
                        : 'Nessuna rete Wi-Fi trovata. Verifica che il Wi-Fi sia attivo o collega un cavo Ethernet.'}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {wifiList.map((net) => {
                        const isSelected = selectedSsid === net.ssid;
                        return (
                          <div
                            key={net.ssid}
                            className={`p-2.5 rounded-lg border transition-colors ${
                              net.inUse
                                ? 'bg-emerald-500/10 border-emerald-500/40'
                                : isSelected
                                  ? 'bg-zinc-900 border-emerald-500/60'
                                  : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Wifi size={14} className={net.inUse ? 'text-emerald-400' : 'text-zinc-400'} />
                                <span className="font-semibold text-zinc-100">{net.ssid}</span>
                                {net.inUse && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                    Connesso
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                                {net.security && net.security !== 'Open' && net.security !== '--' && (
                                  <Lock size={11} className="text-zinc-500" />
                                )}
                                <span>{net.signal}%</span>
                                {!net.inUse && (
                                  <button
                                    onClick={() => {
                                      setSelectedSsid(isSelected ? null : net.ssid);
                                      setWifiPassword('');
                                    }}
                                    className="px-2 py-1 rounded bg-zinc-800 hover:bg-emerald-600 hover:text-white text-zinc-200 transition-colors"
                                  >
                                    {isSelected ? 'Annulla' : 'Connetti'}
                                  </button>
                                )}
                              </div>
                            </div>

                            {isSelected && (
                              <div className="mt-2.5 pt-2.5 border-t border-zinc-800 flex items-center gap-2">
                                <input
                                  type="password"
                                  value={wifiPassword}
                                  onChange={(e) => setWifiPassword(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleConnectWifi(net.ssid)}
                                  placeholder="Inserisci password Wi-Fi (lascia vuoto se aperta)"
                                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-md px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-emerald-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleConnectWifi(net.ssid)}
                                  disabled={isConnecting}
                                  className="px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold disabled:opacity-50"
                                >
                                  {isConnecting ? 'Connessione...' : 'OK'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                    <Bot size={16} className="text-emerald-400" />
                    AI Inference Provider (Online & Local)
                  </h3>
                  {savedNotice && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Salvato
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Provider</label>
                  <select
                    value={aiConfig.provider}
                    onChange={(e) => handleProviderChange(e.target.value as AiProvider)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    {(Object.keys(PROVIDER_DEFAULTS) as AiProvider[]).map((key) => (
                      <option key={key} value={key}>
                        {PROVIDER_DEFAULTS[key].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Model Name</label>
                  <input
                    type="text"
                    value={aiConfig.model}
                    onChange={(e) => handleFieldChange({ model: e.target.value })}
                    placeholder={providerMeta.defaultModel}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                  />
                  {providerMeta.presets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {providerMeta.presets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleFieldChange({ model: preset })}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                            aiConfig.model === preset
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {providerMeta.needsKey && (
                  <div>
                    <label className="block text-zinc-400 mb-1 font-medium">API Key</label>
                    <div className="flex items-center gap-2">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={aiConfig.apiKey}
                        onChange={(e) => handleFieldChange({ apiKey: e.target.value })}
                        placeholder={`Incolla la tua API key per ${aiConfig.provider}...`}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-1.5 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-zinc-200"
                        title={showApiKey ? 'Nascondi API Key' : 'Mostra API Key'}
                      >
                        {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                )}

                {(aiConfig.provider === 'ollama' ||
                  aiConfig.provider === 'custom' ||
                  aiConfig.provider === 'openrouter' ||
                  aiConfig.provider === 'groq' ||
                  aiConfig.provider === 'openai') && (
                  <div>
                    <label className="block text-zinc-400 mb-1 font-medium flex items-center gap-1">
                      <Globe size={12} /> Base URL
                    </label>
                    <input
                      type="text"
                      value={aiConfig.baseUrl}
                      onChange={(e) => handleFieldChange({ baseUrl: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Temperature ({aiConfig.temperature.toFixed(2)})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={aiConfig.temperature}
                    onChange={(e) => handleFieldChange({ temperature: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 text-[11px]">
                  {aiConfig.provider === 'ollama'
                    ? '✓ Modalità Locale (Ollama): le richieste vengono inviate al tuo server locale senza Internet.'
                    : `✓ Modalità Online (${aiConfig.provider}): assicurati di essere connesso nella tab Network & Wi-Fi e di aver inserito una API Key valida.`}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                  <Shield size={16} className="text-emerald-400" />
                  Security Profiles & Execution Policy
                </h3>

                <div className="space-y-2">
                  {[
                    {
                      id: 'strict',
                      name: 'Strict (Maximum Protection)',
                      desc: 'Any non-read-only bash command requires interactive user confirmation.'
                    },
                    {
                      id: 'balanced',
                      name: 'Balanced (Recommended Default)',
                      desc: 'Automatic execution of operational and browsing commands; blocks and requires confirmation for destructive commands (rm, mkfs, dd).'
                    },
                    {
                      id: 'autonomous',
                      name: 'Autonomous (Full Autonomy)',
                      desc: 'The agent operates with full autonomy for long-running tasks or build scripts.'
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
                  Hardware & Persistence Status
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                    <div className="text-zinc-500 text-[10px] uppercase font-semibold">Platform</div>
                    <div className="font-bold text-zinc-200 mt-1">{systemInfo?.platform || 'Linux'}</div>
                    <div className="text-[10px] text-zinc-400">{systemInfo?.release}</div>
                  </div>
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                    <div className="text-zinc-500 text-[10px] uppercase font-semibold">RAM Memory</div>
                    <div className="font-bold text-zinc-200 mt-1">
                      {systemInfo?.usedMemoryMB || 0} / {systemInfo?.totalMemoryMB || 0} MB
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Available: {systemInfo?.freeMemoryMB || 0} MB
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                    <div className="text-zinc-500 text-[10px] uppercase font-semibold">Processor</div>
                    <div className="font-bold text-zinc-200 mt-1">{systemInfo?.cpus || 1} Logical Cores</div>
                    <div className="text-[10px] text-zinc-400 truncate">{systemInfo?.cpuModel}</div>
                  </div>
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                    <div className="text-zinc-500 text-[10px] uppercase font-semibold">Live Mode</div>
                    <div className="font-bold text-zinc-200 mt-1">
                      {systemInfo?.isLiveDebian ? 'Debian Live (RAM/USB)' : 'Local Host'}
                    </div>
                    <div className="text-[10px] text-zinc-400">Tails-style Persistence supported</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'expand' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                    <Layers size={16} className="text-emerald-400" />
                    Expand Linux Environment (Package Manager)
                  </h3>
                </div>

                <p className="text-zinc-400 text-[11px]">
                  You can install desktop software or full desktop environments on the fly directly into your live or installed Debian system via the integrated terminal:
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { name: 'XFCE Desktop Environment', pkg: 'xfce4 xfce4-goodies', type: 'DE' },
                    { name: 'KDE Plasma Desktop', pkg: 'kde-plasma-desktop', type: 'DE' },
                    { name: 'GNOME Shell Minimal', pkg: 'gnome-core', type: 'DE' },
                    { name: 'LibreOffice Full Suite', pkg: 'libreoffice', type: 'App' },
                    { name: 'GIMP & Inkscape', pkg: 'gimp inkscape', type: 'Graphics' },
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
                        <span>Install in Terminal</span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-[11px]">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>Installed packages will be automatically preserved if persistence is active.</span>
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
