import React from 'react';
import {
  Bot,
  Globe,
  Terminal,
  FileText,
  X,
  ExternalLink,
  Plus
} from 'lucide-react';

export interface TabItem {
  id: string;
  title: string;
  type: 'harness' | 'browser' | 'terminal' | 'editor';
  url?: string;
  closable: boolean;
  detachable: boolean;
  meta?: any;
}

interface TabBarProps {
  tabs: TabItem[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onDetachTab: (tab: TabItem) => void;
  onNewTab: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onDetachTab,
  onNewTab
}) => {
  const getTabIcon = (type: TabItem['type']) => {
    switch (type) {
      case 'harness':
        return <Bot size={15} className="text-emerald-400" />;
      case 'browser':
        return <Globe size={15} className="text-blue-400" />;
      case 'terminal':
        return <Terminal size={15} className="text-amber-400" />;
      case 'editor':
        return <FileText size={15} className="text-purple-400" />;
    }
  };

  return (
    <div className="h-10 bg-zinc-950 border-b border-zinc-800 flex items-center px-2 gap-1 overflow-x-auto select-none no-scrollbar">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isPinnedHarness = tab.id === 'tab-0';

        return (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`group relative flex items-center gap-2 px-3 py-1.5 h-8 rounded-md text-xs font-medium cursor-pointer transition-all border ${
              isActive
                ? 'bg-zinc-900 text-zinc-100 border-zinc-700 shadow-sm'
                : 'bg-zinc-950/60 text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200 border-transparent'
            }`}
          >
            {getTabIcon(tab.type)}
            <span className="truncate max-w-[130px]">{tab.title}</span>

            {/* Detach Window Action (for all tabs except Tab 0) */}
            {tab.detachable && !isPinnedHarness && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDetachTab(tab);
                }}
                title="Detach tab into independent window"
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-opacity"
              >
                <ExternalLink size={12} />
              </button>
            )}

            {/* Close Action */}
            {tab.closable && !isPinnedHarness && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                title="Close tab"
                className="p-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}

      <button
        onClick={onNewTab}
        title="Open new tab"
        className="p-1.5 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors ml-1"
      >
        <Plus size={15} />
      </button>
    </div>
  );
};
