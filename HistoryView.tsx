import React, { useState } from 'react';
import { 
  History, 
  Trash2, 
  ArrowUpRight, 
  Code2, 
  Calendar, 
  AlertOctagon, 
  AlertTriangle,
  Search,
  CheckCircle2
} from 'lucide-react';
import { AnalysisHistoryItem, SupportedLanguage } from '../types';

interface HistoryViewProps {
  history: AnalysisHistoryItem[];
  onRestoreItem: (item: AnalysisHistoryItem) => void;
  onClearHistory: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onRestoreItem,
  onClearHistory
}) => {
  const [selectedLang, setSelectedLang] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = history.filter(item => {
    if (selectedLang !== 'all' && item.language !== selectedLang) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.language.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.bugs.some(b => b.title.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-xl backdrop-blur-md transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <History className="h-5 w-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">
              Analysis History ({history.length})
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Previous scan logs, health scores, and saved analysis sessions.
          </p>
        </div>

        {history.length > 0 && (
          <button
            id="btn-clear-all-history"
            onClick={onClearHistory}
            className="flex items-center space-x-1 rounded-lg border border-rose-900/40 bg-rose-950/30 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {['all', 'python', 'javascript', 'java', 'c', 'cpp', 'html'].map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLang(lang)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium uppercase transition-colors ${
                selectedLang === lang
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/50'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search past scans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700/80 bg-slate-800/90 pl-8 pr-3 py-1 text-xs text-slate-100 placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* History Items List */}
      <div className="mt-4 space-y-3">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-12 text-center">
            <History className="h-8 w-8 text-slate-500 mb-2" />
            <h4 className="text-sm font-semibold text-slate-300">
              No History Records Yet
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Run an analysis on any Python, JavaScript, Java, C, C++, or HTML snippet to start tracking history.
            </p>
          </div>
        ) : (
          filteredHistory.map((item) => {
            const formattedDate = new Date(item.timestamp).toLocaleString();
            const scoreColor =
              item.healthScore >= 90
                ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'
                : item.healthScore >= 50
                ? 'text-amber-400 bg-amber-950/40 border-amber-500/30'
                : 'text-rose-400 bg-rose-950/40 border-rose-500/30';

            return (
              <div
                key={item.id}
                className="flex flex-col md:flex-row md:items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4 hover:bg-slate-800/60 transition-all gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-xs font-bold uppercase text-cyan-300">
                      {item.language}
                    </span>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-bold border ${scoreColor}`}>
                      Health: {item.healthScore}/100
                    </span>
                    <span className="text-xs text-slate-400 flex items-center space-x-1">
                      <Calendar className="h-3 w-3 inline" />
                      <span>{formattedDate}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span><strong>{item.totalBugs}</strong> Total Issues</span>
                    {item.criticalCount > 0 && (
                      <span className="text-rose-400 font-semibold">
                        • {item.criticalCount} Critical
                      </span>
                    )}
                    {item.highCount > 0 && (
                      <span className="text-amber-400 font-semibold">
                        • {item.highCount} High
                      </span>
                    )}
                  </div>

                  {/* Snippet Preview */}
                  <pre className="mt-1 rounded bg-slate-900 border border-slate-800 px-2.5 py-1 text-[11px] font-mono text-slate-300 truncate max-w-xl">
                    {item.codeSnippetPreview || item.code.slice(0, 100)}
                  </pre>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onRestoreItem(item)}
                    className="flex items-center space-x-1 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-sm hover:bg-cyan-400 transition-colors"
                  >
                    <span>Restore in Editor</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
