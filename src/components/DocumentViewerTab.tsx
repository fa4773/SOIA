import React, { useState, useEffect } from 'react';
import { FileText, Save, Check } from 'lucide-react';
import { FileEntry } from '../types/soia';

interface DocumentViewerTabProps {
  file: FileEntry;
}

export const DocumentViewerTab: React.FC<DocumentViewerTabProps> = ({ file }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchFile = async () => {
      setLoading(true);
      if (window.soia?.readFile) {
        const res = await window.soia.readFile(file.path);
        if (isMounted) {
          if (res.success && res.content !== undefined) {
            setContent(res.content);
          } else {
            setContent(`Errore o file vuoto: ${res.error || 'Nessun contenuto'}`);
          }
        }
      } else {
        if (isMounted) {
          setContent('Anteprima documento (modalità simulata / standalone).');
        }
      }
      if (isMounted) setLoading(false);
    };

    fetchFile();
    return () => {
      isMounted = false;
    };
  }, [file.path]);

  const handleSave = async () => {
    if (window.soia?.createDocument) {
      const ext = (file.extension as 'doc' | 'txt' | 'md') || 'txt';
      await window.soia.createDocument(file.name, content, ext);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Document Toolbar */}
      <div className="h-10 px-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-purple-400" />
          <span className="font-semibold text-zinc-200">{file.name}</span>
          <span className="text-zinc-500 text-[11px]">({file.path})</span>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
        >
          {saved ? <Check size={13} className="text-emerald-400" /> : <Save size={13} />}
          <span>{saved ? 'Salvato' : 'Salva Modifiche'}</span>
        </button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 p-4 bg-zinc-950 overflow-hidden">
        {loading ? (
          <div className="text-xs text-zinc-500 italic p-4">Caricamento documento in corso...</div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full bg-zinc-900/40 text-zinc-100 border border-zinc-800 rounded-lg p-4 font-mono text-xs focus:outline-none focus:border-zinc-700 resize-none custom-scrollbar"
            placeholder="Scrivi qui il contenuto del file..."
          />
        )}
      </div>
    </div>
  );
};
