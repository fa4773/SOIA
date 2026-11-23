import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TabBar, TabItem } from './components/TabBar';
import { AgentHarnessChat } from './components/AgentHarnessChat';
import { AgenticBrowser } from './components/AgenticBrowser';
import { TerminalTab } from './components/TerminalTab';
import { DocumentViewerTab } from './components/DocumentViewerTab';
import { SettingsModal } from './components/SettingsModal';
import { FileEntry, SystemInfo } from './types/soia';

export const App: React.FC = () => {
  // Rilevamento eventuale finestra staccata tramite URL query
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
      title: 'Browser Agentico',
      type: 'browser',
      url: 'https://duckduckgo.com',
      closable: true,
      detachable: true
    },
    {
      id: 'tab-terminal',
      title: 'Terminale Linux',
      type: 'terminal',
      closable: true,
      detachable: true
    }
  ]);

  const [activeTabId, setActiveTabId] = useState<string>('tab-0');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [securityProfile, setSecurityProfile] = useState<'strict' | 'balanced' | 'autonomous'>('balanced');

  useEffect(() => {
    // Caricamento iniziale informazioni sistema e file
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

    // Ascolto evento di riaggancio finestre staccate
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
    // Se la tab selezionata non è presente nell'elenco (ad es. chiusa precedentemente), riaprila
    if (!tabs.some((t) => t.id === id)) {
      if (id === 'tab-browser') {
        setTabs((prev) => [
          ...prev,
          { id: 'tab-browser', title: 'Browser Agentico', type: 'browser', closable: true, detachable: true }
        ]);
      } else if (id === 'tab-terminal') {
        setTabs((prev) => [
          ...prev,
          { id: 'tab-terminal', title: 'Terminale Linux', type: 'terminal', closable: true, detachable: true }
        ]);
      }
    }
    setActiveTabId(id);
  };

  const handleCloseTab = (id: string) => {
    if (id === 'tab-0') return; // Tab 0 non è mai chiudibile
    setTabs((prev) => prev.filter((t) => t.id !== id));
    if (activeTabId === id) {
      setActiveTabId('tab-0');
    }
  };

  const handleDetachTab = async (tab: TabItem) => {
    if (tab.id === 'tab-0') return;
    if (window.soia?.detachTab) {
      await window.soia.detachTab(tab);
      // Rimuove temporaneamente dalla barra principale mentre è staccata
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
      title: 'Nuovo Terminale',
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
    const docName = name || `Nota_${Date.now().toString().slice(-4)}`;
    const docContent = content || `Nuovo documento creato in SOIA OS il ${new Date().toLocaleString()}\n`;
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
    // Mostra il terminale per seguire l'installazione
    handleSelectTab('tab-terminal');
  };

  // Se questa finestra è una finestra staccata (popup indipendente)
  if (detachedTabId) {
    return (
      <div className="w-screen h-screen bg-zinc-950 flex flex-col overflow-hidden text-zinc-100">
        {detachedTabType === 'browser' && <AgenticBrowser />}
        {detachedTabType === 'terminal' && <TerminalTab />}
        {detachedTabType === 'editor' && (
          <DocumentViewerTab
            file={{
              name: 'Finestra Indipendente',
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
      {/* Sidebar Sinistra ChatGPT Desktop Style */}
      <Sidebar
        activeTabId={activeTabId}
        onSelectTab={handleSelectTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        files={files}
        onCreateDoc={() => handleCreateDoc()}
        onOpenFile={handleOpenFile}
        onOpenNewChat={() => setActiveTabId('tab-0')}
        systemInfo={systemInfo}
      />

      {/* Area Principale: TabBar in alto + Content Pane a tutto schermo */}
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
              systemInfo={systemInfo}
              securityProfile={securityProfile}
            />
          </div>

          {/* Tab Browser Agentico */}
          {tabs.some((t) => t.id === 'tab-browser') && (
            <div className={`w-full h-full ${activeTabId === 'tab-browser' ? 'block' : 'hidden'}`}>
              <AgenticBrowser />
            </div>
          )}

          {/* Tab Terminale Linux */}
          {tabs.some((t) => t.id === 'tab-terminal') && (
            <div className={`w-full h-full ${activeTabId === 'tab-terminal' ? 'block' : 'hidden'}`}>
              <TerminalTab />
            </div>
          )}

          {/* Schede Documenti & Editor Aperti */}
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

      {/* Modal Impostazioni OS & AI */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        systemInfo={systemInfo}
        securityProfile={securityProfile}
        onUpdateSecurityProfile={handleUpdateSecurityProfile}
        onInstallPackage={handleInstallPackage}
      />
    </div>
  );
};
export default App;
