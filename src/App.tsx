import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TabBar, TabItem } from './components/TabBar';
import { AgentHarnessChat } from './components/AgentHarnessChat';
import { AgenticBrowser } from './components/AgenticBrowser';
import { TerminalTab } from './components/TerminalTab';
import { DocumentViewerTab } from './components/DocumentViewerTab';
import { SettingsModal } from './components/SettingsModal';
import { AiConfig, FileEntry, SystemInfo } from './types/soia';

const DEFAULT_AI_CONFIG: AiConfig = {
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  apiKey: '',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  temperature: 0.7
};

function loadSavedAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem('soia_ai_config');
    if (raw) {
      return { ...DEFAULT_AI_CONFIG, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_AI_CONFIG;
}

export const App: React.FC = () => {
  // Detect detached window via URL query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const detachedTabId = searchParams.get('detachedTab');
  const detachedTabType = searchParams.get('tabType');

  const [tabs, setTabs] = useState<TabItem[]>([
    {
      id: 'tab-0',
      title: 'Agentic Desktop',
      type: 'harness',
      closable: false,
      detachable: false
    },
    {
      id: 'tab-browser',
      title: 'Agentic Browser',
      type: 'browser',
      url: 'https://duckduckgo.com',
      closable: true,
      detachable: true
    },
    {
      id: 'tab-terminal',
      title: 'Linux Terminal',
      type: 'terminal',
      closable: true,
      detachable: true
    }
  ]);

  const [activeTabId, setActiveTabId] = useState<string>('tab-0');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<'ai' | 'network' | 'security' | 'system' | 'expand'>('ai');
  const [aiConfig, setAiConfig] = useState<AiConfig>(loadSavedAiConfig);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [securityProfile, setSecurityProfile] = useState<'strict' | 'balanced' | 'autonomous'>('balanced');

  const handleOpenSettings = (tab: 'ai' | 'network' | 'security' | 'system' | 'expand' = 'ai') => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  const handleUpdateAiConfig = (next: AiConfig) => {
    setAiConfig(next);
    try {
      localStorage.setItem('soia_ai_config', JSON.stringify(next));
    } catch {}
  };

  useEffect(() => {
    // Initial loading of system info and files
    const initData = async () => {
      if (window.soia) {
        try {
          const sys = await window.soia.getSystemInfo();
          setSystemInfo(sys);
          const sec = await window.soia.getSecurityProfile();
          setSecurityProfile(sec);
          const fsList = await window.soia.listFiles();
          setFiles(fsList);
        } catch (err) {
          console.error('[SOIA Init Error]', err);
        }
      }
    };

    initData();

    // Listen for detached window reattach events
    const cleanupReattach = window.soia?.onTabReattached(({ tabId }) => {
      console.log(`[Tab Reattached] ${tabId}`);
    });

    return () => {
      cleanupReattach?.();
    };
  }, []);

  const refreshFiles = async () => {
    if (window.soia?.listFiles) {
      const updated = await window.soia.listFiles();
      setFiles(updated);
    }
  };

  const handleSelectTab = (id: string) => {
    // If the selected tab is not in the list (e.g., previously closed), reopen it
    if (!tabs.some((t) => t.id === id)) {
      if (id === 'tab-browser') {
        setTabs((prev) => [
          ...prev,
          { id: 'tab-browser', title: 'Agentic Browser', type: 'browser', closable: true, detachable: true }
        ]);
      } else if (id === 'tab-terminal') {
        setTabs((prev) => [
          ...prev,
          { id: 'tab-terminal', title: 'Linux Terminal', type: 'terminal', closable: true, detachable: true }
        ]);
      }
    }
    setActiveTabId(id);
  };

  const handleCloseTab = (id: string) => {
    if (id === 'tab-0') return; // Tab 0 is never closable
    setTabs((prev) => prev.filter((t) => t.id !== id));
    if (activeTabId === id) {
      setActiveTabId('tab-0');
    }
  };

  const handleDetachTab = async (tab: TabItem) => {
    if (tab.id === 'tab-0') return;
    if (window.soia?.detachTab) {
      await window.soia.detachTab(tab);
      // Temporarily remove from the main bar while detached
      setTabs((prev) => prev.filter((t) => t.id !== tab.id));
      if (activeTabId === tab.id) {
        setActiveTabId('tab-0');
      }
    }
  };

  const handleNewTab = () => {
    const newId = `tab-custom-${Date.now()}`;
    const newTab: TabItem = {
      id: newId,
      title: 'New Terminal',
      type: 'terminal',
      closable: true,
      detachable: true
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleOpenFile = (file: FileEntry) => {
    const tabId = `file-${file.path.replace(/[^a-zA-Z0-9]/g, '_')}`;
    if (!tabs.some((t) => t.id === tabId)) {
      const fileTab: TabItem = {
        id: tabId,
        title: file.name,
        type: 'editor',
        closable: true,
        detachable: true,
        meta: { file }
      };
      setTabs((prev) => [...prev, fileTab]);
    }
    setActiveTabId(tabId);
  };

  const handleCreateDoc = async (name?: string, content?: string) => {
    const docName = name || `Note_${Date.now().toString().slice(-4)}`;
    const docContent = content || `New document created in SOIA OS on ${new Date().toLocaleString()}\n`;
    if (window.soia?.createDocument) {
      await window.soia.createDocument(docName, docContent, 'doc');
      await refreshFiles();
      handleOpenFile({
        name: `${docName}.doc`,
        isDirectory: false,
        path: `~/SOIA_Documents/${docName}.doc`,
        extension: 'doc'
      });
    }
  };

  const handleUpdateSecurityProfile = async (profile: 'strict' | 'balanced' | 'autonomous') => {
    setSecurityProfile(profile);
    if (window.soia?.setSecurityProfile) {
      await window.soia.setSecurityProfile(profile);
    }
  };

  const handleInstallPackage = (pkg: string) => {
    if (window.soia?.installLinuxPackage) {
      window.soia.installLinuxPackage(pkg);
    }
    // Show terminal to follow installation progress
    handleSelectTab('tab-terminal');
  };

  // If this window is a detached window (independent popup)
  if (detachedTabId) {
    return (
      <div className="w-screen h-screen bg-zinc-950 flex flex-col overflow-hidden text-zinc-100">
        {detachedTabType === 'browser' && <AgenticBrowser />}
        {detachedTabType === 'terminal' && <TerminalTab />}
        {detachedTabType === 'editor' && (
          <DocumentViewerTab
            file={{
              name: 'Detached Window',
              isDirectory: false,
              path: '',
              extension: 'txt'
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 font-sans select-none text-zinc-100">
      {/* Left Sidebar (ChatGPT Desktop Style) */}
      <Sidebar
        activeTabId={activeTabId}
        onSelectTab={handleSelectTab}
        onOpenSettings={() => handleOpenSettings('ai')}
        files={files}
        onCreateDoc={() => handleCreateDoc()}
        onOpenFile={handleOpenFile}
        onOpenNewChat={() => setActiveTabId('tab-0')}
        systemInfo={systemInfo}
      />

      {/* Main Area: Top TabBar + Fullscreen Content Pane */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950">
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={setActiveTabId}
          onCloseTab={handleCloseTab}
          onDetachTab={handleDetachTab}
          onNewTab={handleNewTab}
        />

        <div className="flex-1 overflow-hidden relative">
          {/* Tab 0: Agent Desktop Chat */}
          <div className={`w-full h-full ${activeTabId === 'tab-0' ? 'block' : 'hidden'}`}>
            <AgentHarnessChat
              onExecuteInShell={(cmd) => window.soia?.sendShellInput(cmd)}
              onCreateDocRequest={(name, content) => handleCreateDoc(name, content)}
              onOpenBrowserUrl={(_url) => {
                handleSelectTab('tab-browser');
              }}
              onOpenSettings={handleOpenSettings}
              systemInfo={systemInfo}
              securityProfile={securityProfile}
              aiConfig={aiConfig}
            />
          </div>

          {/* Agentic Browser Tab */}
          {tabs.some((t) => t.id === 'tab-browser') && (
            <div className={`w-full h-full ${activeTabId === 'tab-browser' ? 'block' : 'hidden'}`}>
              <AgenticBrowser />
            </div>
          )}

          {/* Linux Terminal Tabs */}
          {tabs
            .filter((t) => t.type === 'terminal')
            .map((tab) => (
              <div
                key={tab.id}
                className={`w-full h-full ${activeTabId === tab.id ? 'block' : 'hidden'}`}
              >
                <TerminalTab isActive={activeTabId === tab.id} />
              </div>
            ))}

          {/* Open Document & Editor Tabs */}
          {tabs
            .filter((t) => t.type === 'editor')
            .map((tab) => (
              <div
                key={tab.id}
                className={`w-full h-full ${activeTabId === tab.id ? 'block' : 'hidden'}`}
              >
                <DocumentViewerTab file={tab.meta?.file} />
              </div>
            ))}
        </div>
      </main>

      {/* OS & AI Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsTab}
        systemInfo={systemInfo}
        securityProfile={securityProfile}
        onUpdateSecurityProfile={handleUpdateSecurityProfile}
        onInstallPackage={handleInstallPackage}
        aiConfig={aiConfig}
        onUpdateAiConfig={handleUpdateAiConfig}
      />
    </div>
  );
};
export default App;
