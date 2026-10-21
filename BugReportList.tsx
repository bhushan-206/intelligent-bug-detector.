import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  ShieldAlert, 
  Search, 
  Filter, 
  ArrowRight, 
  Check, 
  Copy, 
  Sparkles, 
  Wrench, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Languages
} from 'lucide-react';
import { DetectedBug, BugSeverity, BugCategory, ExplanationLanguage, EXPLANATION_LANGUAGES } from '../types';
import { voiceSynthesizer, VoiceState } from '../utils/voiceSynthesizer';
import { TRANSLATIONS } from '../utils/languageTranslations';

interface BugReportListProps {
  bugs: DetectedBug[];
  onJumpToLine: (line: number) => void;
  onApplySingleFix?: (bug: DetectedBug) => void;
  onFixAllIssues?: () => void;
  isFixing?: boolean;
  explanationLanguage?: ExplanationLanguage;
}

export const BugReportList: React.FC<BugReportListProps> = ({
  bugs,
  onJumpToLine,
  onApplySingleFix,
  onFixAllIssues,
  isFixing = false,
  explanationLanguage = 'en'
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'critical' | 'security' | 'logic' | 'syntax'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBugId, setExpandedBugId] = useState<string | null>(null);
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>(voiceSynthesizer.getState());

  useEffect(() => {
    const unsubscribe = voiceSynthesizer.subscribe((state) => {
      setVoiceState(state);
    });
    return () => unsubscribe();
  }, []);

  const t = TRANSLATIONS[explanationLanguage] || TRANSLATIONS.en;
  const currentLangObj = EXPLANATION_LANGUAGES.find((l) => l.code === explanationLanguage);

  // Filter and search logic
  const filteredBugs = bugs.filter(bug => {
    // Category / Severity Filter
    if (selectedFilter === 'critical') {
      if (bug.severity !== 'Critical' && bug.severity !== 'High') return false;
    } else if (selectedFilter === 'security') {
      if (bug.type !== 'Security') return false;
    } else if (selectedFilter === 'logic') {
      if (bug.type !== 'Logical' && bug.type !== 'Runtime') return false;
    } else if (selectedFilter === 'syntax') {
      if (bug.type !== 'Syntax' && bug.type !== 'Semantic') return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        bug.title.toLowerCase().includes(q) ||
        bug.message.toLowerCase().includes(q) ||
        bug.explanation.toLowerCase().includes(q) ||
        bug.whyProblem.toLowerCase().includes(q) ||
        bug.id.toLowerCase().includes(q) ||
        (bug.voiceExplanation && bug.voiceExplanation.toLowerCase().includes(q)) ||
        (bug.ruleId && bug.ruleId.toLowerCase().includes(q))
      );
    }

    return true;
  });

  const handleSpeakBug = (bug: DetectedBug, e: React.MouseEvent) => {
    e.stopPropagation();
    if (voiceState.isSpeaking && voiceState.activeId === bug.id) {
      if (voiceState.isPaused) {
        voiceSynthesizer.resume();
      } else {
        voiceSynthesizer.pause();
      }
      return;
    }

    const currentLang: ExplanationLanguage = (explanationLanguage as ExplanationLanguage) || 'en';
    const script = voiceSynthesizer.generateBugVoiceScript(bug, currentLang);
    voiceSynthesizer.speak(script, bug.id, currentLang);
  };

  const getSeverityBadge = (severity: BugSeverity) => {
    switch (severity) {
      case 'Critical':
        return (
          <span className="flex items-center space-x-1 rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping" />
            <span>🔴 Critical</span>
          </span>
        );
      case 'High':
        return (
          <span className="flex items-center space-x-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <span>🟠 High</span>
          </span>
        );
      case 'Medium':
        return (
          <span className="flex items-center space-x-1 rounded-md bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
            <span>🟡 Medium</span>
          </span>
        );
      case 'Low':
        return (
          <span className="flex items-center space-x-1 rounded-md bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            <span>🔵 Low</span>
          </span>
        );
      case 'Info':
      default:
        return (
          <span className="flex items-center space-x-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span>⚪ Info</span>
          </span>
        );
    }
  };

  const getSourceBadge = (source: string) => {
    if (source === 'Gemini AI') {
      return (
        <span className="flex items-center space-x-1 rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
          <Sparkles className="h-3 w-3" />
          <span>Gemini AI</span>
        </span>
      );
    } else if (source === 'Combined Analysis') {
      return (
        <span className="flex items-center space-x-1 rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          <Layers className="h-3 w-3" />
          <span>Combined Analysis</span>
        </span>
      );
    }
    return (
      <span className="flex items-center space-x-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        <Cpu className="h-3 w-3" />
        <span>Static Analyzer</span>
      </span>
    );
  };

  const copySnippet = async (id: string, text?: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-xl backdrop-blur-md transition-colors">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-white">
              {t.detectedBugsTitle} ({filteredBugs.length} / {bugs.length})
            </h3>
            {bugs.length === 0 && (
              <span className="rounded-full bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                All Clean ✨
              </span>
            )}
            <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/30">
              {currentLangObj?.nativeName || 'English'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Detailed diagnosis, root causes, severity metrics, and remediation fixes.
          </p>
        </div>

        {/* Global Fix All Button */}
        {bugs.length > 0 && onFixAllIssues && (
          <button
            id="btn-fix-all-bugs"
            onClick={onFixAllIssues}
            disabled={isFixing}
            className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs sm:text-sm font-bold text-slate-950 shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 transition-all transform active:scale-95"
          >
            <Wrench className="h-4 w-4" />
            <span>{isFixing ? 'Generating Global Fix...' : t.fixAllIssues}</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            id="filter-all"
            onClick={() => setSelectedFilter('all')}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              selectedFilter === 'all'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/50'
            }`}
          >
            {t.allIssues} ({bugs.length})
          </button>
          <button
            id="filter-critical"
            onClick={() => setSelectedFilter('critical')}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              selectedFilter === 'critical'
                ? 'bg-rose-500 text-white font-bold shadow-sm'
                : 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 border border-rose-900/40'
            }`}
          >
            {t.criticalHigh} ({bugs.filter(b => b.severity === 'Critical' || b.severity === 'High').length})
          </button>
          <button
            id="filter-security"
            onClick={() => setSelectedFilter('security')}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              selectedFilter === 'security'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 border border-emerald-900/40'
            }`}
          >
            {t.security} ({bugs.filter(b => b.type === 'Security').length})
          </button>
          <button
            id="filter-logic"
            onClick={() => setSelectedFilter('logic')}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              selectedFilter === 'logic'
                ? 'bg-purple-500 text-white font-bold shadow-sm'
                : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/50 border border-purple-900/40'
            }`}
          >
            {t.logicRuntime} ({bugs.filter(b => b.type === 'Logical' || b.type === 'Runtime').length})
          </button>
          <button
            id="filter-syntax"
            onClick={() => setSelectedFilter('syntax')}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              selectedFilter === 'syntax'
                ? 'bg-indigo-500 text-white font-bold shadow-sm'
                : 'bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/50 border border-indigo-900/40'
            }`}
          >
            {t.syntaxSemantic} ({bugs.filter(b => b.type === 'Syntax' || b.type === 'Semantic').length})
          </button>
        </div>

        {/* Search input */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            id="search-bugs-input"
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700/80 bg-slate-800/90 pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* Bugs List Accordion Cards */}
      <div className="mt-4 space-y-3">
        {filteredBugs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 mb-3">
              <Check className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-200">
              {bugs.length === 0 ? t.zeroDefects : 'No matching issues found'}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {bugs.length === 0
                ? t.zeroDefectsDesc
                : 'Try adjusting your search query or filter criteria.'}
            </p>
          </div>
        ) : (
          filteredBugs.map((bug, index) => {
            const isExpanded = expandedBugId === bug.id || index === 0;
            const isSpeakingThisBug = voiceState.isSpeaking && voiceState.activeId === bug.id;

            return (
              <div
                key={bug.id || index}
                id={`bug-card-${bug.id}`}
                className={`overflow-hidden rounded-xl border transition-all ${
                  isSpeakingThisBug
                    ? 'border-cyan-500/70 bg-slate-900/95 ring-1 ring-cyan-500/50 shadow-lg shadow-cyan-500/10'
                    : 'border-slate-800/80 bg-slate-950/60'
                }`}
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedBugId(isExpanded ? null : bug.id)}
                  className="flex cursor-pointer items-start justify-between p-4 hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="pt-0.5 flex flex-col items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onJumpToLine(bug.line);
                        }}
                        title={`Jump to line ${bug.line}`}
                        className="rounded-lg bg-cyan-500/10 px-2 py-1 text-xs font-mono font-bold text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30 transition-colors"
                      >
                        {t.jumpToLine} {bug.line}
                      </button>

                      {/* Voice button on card header */}
                      <button
                        id={`btn-voice-bug-${bug.id}`}
                        onClick={(e) => handleSpeakBug(bug, e)}
                        title={isSpeakingThisBug ? 'Pause Voice' : 'Listen to this bug explanation'}
                        className={`rounded-lg p-1.5 transition-all shadow-sm ${
                          isSpeakingThisBug
                            ? 'bg-cyan-500 text-slate-950 animate-pulse'
                            : 'bg-slate-800 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30'
                        }`}
                      >
                        {isSpeakingThisBug ? (
                          voiceState.isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                      </button>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-400">
                          [{bug.id}]
                        </span>
                        <h4 className="text-sm font-bold text-slate-100">
                          {bug.title}
                        </h4>
                        {getSeverityBadge(bug.severity)}
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700">
                          {bug.certainty}
                        </span>
                        {getSourceBadge(bug.source)}
                      </div>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        {bug.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1 pl-2">
                    <div className="text-right text-[11px] text-slate-400 hidden sm:block">
                      <span className="font-semibold text-slate-300">
                        {Math.round(bug.confidence * 100)}%
                      </span> {t.confidence}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-slate-900/95 p-4 text-xs space-y-4">
                    {/* Voice audio narrative banner */}
                    {bug.voiceExplanation && (
                      <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/30 p-3 flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-2.5">
                          <Volume2 className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-semibold text-indigo-300 block mb-0.5 text-xs">
                              {t.voiceAudioExplanation} ({currentLangObj?.name}):
                            </span>
                            <p className="text-slate-200 leading-relaxed text-xs italic">
                              "{bug.voiceExplanation}"
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleSpeakBug(bug, e)}
                          className="shrink-0 flex items-center space-x-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-bold text-white transition-colors shadow-sm"
                        >
                          <Play className="h-3.5 w-3.5" />
                          <span>{t.listenToExplanation}</span>
                        </button>
                      </div>
                    )}

                    {/* 1️⃣ WHAT TYPE OF ERROR */}
                    <div className="rounded-xl bg-slate-800/60 p-3.5 border border-slate-700/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-100 flex items-center gap-1.5 text-xs tracking-wide">
                          {t.whatErrorType}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-slate-700/80 px-2 py-0.5 text-[11px] font-mono text-cyan-300 border border-slate-600">
                            {bug.type} Error
                          </span>
                          {bug.ruleId && (
                            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                              Rule: {bug.ruleId}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-200 leading-relaxed text-xs">
                        {bug.explanation || bug.message}
                      </p>
                    </div>

                    {/* 2️⃣ WHERE IS THE ERROR */}
                    <div className="rounded-xl bg-rose-950/20 p-3.5 border border-rose-900/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-300 flex items-center gap-1.5 text-xs tracking-wide">
                          {t.whereErrorIs}
                        </span>
                        <span className="rounded bg-rose-900/40 px-2.5 py-0.5 text-xs font-mono font-bold text-rose-200 border border-rose-700/60">
                          {t.jumpToLine} {bug.line}{bug.column ? `:${bug.column}` : ''}
                        </span>
                      </div>

                      {bug.codeSnippet && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>{t.problematicCode}</span>
                            <button
                              onClick={() => copySnippet(`snip-${bug.id}`, bug.codeSnippet)}
                              className="flex items-center space-x-1 hover:text-slate-200 text-slate-400 transition-colors"
                            >
                              {copiedSnippetId === `snip-${bug.id}` ? (
                                <span className="text-emerald-400">{t.copied}</span>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>{t.copy}</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="rounded-lg bg-slate-950 p-2.5 font-mono text-xs text-rose-300 overflow-x-auto border border-rose-900/40">
                            {bug.codeSnippet}
                          </pre>
                        </div>
                      )}

                      <p className="text-slate-300 text-xs leading-relaxed">
                        {bug.whyProblem}
                      </p>
                    </div>

                    {/* 3️⃣ HOW TO FIX THE ERROR */}
                    <div className="rounded-xl bg-emerald-950/25 p-3.5 border border-emerald-800/50 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs tracking-wide">
                          {t.howToFix}
                        </span>
                        {onApplySingleFix && (
                          <button
                            id={`btn-apply-fix-${bug.id}`}
                            onClick={() => onApplySingleFix(bug)}
                            disabled={isFixing}
                            className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 px-3 py-1 text-xs font-bold text-white transition-all shadow-md shadow-emerald-900/30 cursor-pointer disabled:opacity-50"
                          >
                            <Wrench className="h-3.5 w-3.5" />
                            <span>{t.applyFix}</span>
                          </button>
                        )}
                      </div>

                      <p className="text-slate-200 text-xs leading-relaxed">
                        {bug.suggestedFix}
                      </p>

                      {bug.fixedSnippet && (
                        <div className="space-y-1">
                          <div className="text-[11px] font-medium text-emerald-400">
                            Corrected Code Preview:
                          </div>
                          <pre className="rounded-lg bg-slate-950 p-2.5 font-mono text-xs text-emerald-300 overflow-x-auto border border-emerald-800/40">
                            {bug.fixedSnippet}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

