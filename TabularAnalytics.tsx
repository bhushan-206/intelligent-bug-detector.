import React, { useState, useMemo } from 'react';
import { 
  Table, 
  Search, 
  Filter, 
  Download, 
  ArrowUpDown, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Copy, 
  ExternalLink, 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  ShieldCheck, 
  Layers, 
  Clock, 
  DollarSign, 
  Sparkles, 
  FileSpreadsheet, 
  CheckCircle2, 
  Wrench,
  Cpu
} from 'lucide-react';
import { DetectedBug, AnalysisHistoryItem, SupportedLanguage, BugSeverity, BugCategory } from '../types';

interface TabularAnalyticsProps {
  bugs: DetectedBug[];
  history: AnalysisHistoryItem[];
  currentLanguage?: SupportedLanguage;
  onApplySingleFix?: (bug: DetectedBug) => void;
  onJumpToLine?: (line: number) => void;
}

type SortField = 'line' | 'title' | 'severity' | 'type' | 'confidence' | 'source' | 'ruleId';
type SortOrder = 'asc' | 'desc';

export const TabularAnalytics: React.FC<TabularAnalyticsProps> = ({
  bugs = [],
  history = [],
  currentLanguage = 'python',
  onApplySingleFix,
  onJumpToLine,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'master' | 'crosstab' | 'remediation' | 'rules'>('master');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('severity');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedBugIds, setSelectedBugIds] = useState<Set<string>>(new Set());
  const [expandedBugId, setExpandedBugId] = useState<string | null>(null);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);
  const [hourlyDevRate, setHourlyDevRate] = useState<number>(85);

  // Aggregate all bugs across history and current session
  const combinedBugs: DetectedBug[] = useMemo(() => {
    const historicalBugs = history.flatMap(h => h.bugs);
    // Combine and deduplicate by unique signature
    const all = [...bugs, ...historicalBugs];
    const uniqueMap = new Map<string, DetectedBug>();
    all.forEach(b => {
      const key = `${b.id}-${b.line}-${b.title}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, b);
      }
    });
    return Array.from(uniqueMap.values());
  }, [bugs, history]);

  // Severity Weight for sorting
  const severityWeight: Record<BugSeverity, number> = {
    Critical: 5,
    High: 4,
    Medium: 3,
    Low: 2,
    Info: 1
  };

  // Filter and sort master bugs
  const filteredBugs = useMemo(() => {
    return combinedBugs.filter(b => {
      if (severityFilter !== 'all' && b.severity !== severityFilter) return false;
      if (categoryFilter !== 'all' && b.type !== categoryFilter) return false;
      if (sourceFilter !== 'all' && b.source !== sourceFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          b.title.toLowerCase().includes(q) ||
          b.explanation.toLowerCase().includes(q) ||
          (b.ruleId && b.ruleId.toLowerCase().includes(q)) ||
          b.type.toLowerCase().includes(q) ||
          b.severity.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'line') {
        comparison = a.line - b.line;
      } else if (sortField === 'severity') {
        comparison = severityWeight[a.severity] - severityWeight[b.severity];
      } else if (sortField === 'confidence') {
        comparison = a.confidence - b.confidence;
      } else if (sortField === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortField === 'type') {
        comparison = a.type.localeCompare(b.type);
      } else if (sortField === 'source') {
        comparison = a.source.localeCompare(b.source);
      } else if (sortField === 'ruleId') {
        comparison = (a.ruleId || '').localeCompare(b.ruleId || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [combinedBugs, severityFilter, categoryFilter, sourceFilter, searchQuery, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedBugIds.size === filteredBugs.length) {
      setSelectedBugIds(new Set());
    } else {
      setSelectedBugIds(new Set(filteredBugs.map(b => b.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedBugIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedBugIds(next);
  };

  // Export to CSV
  const exportToCSV = () => {
    const targets = selectedBugIds.size > 0 
      ? filteredBugs.filter(b => selectedBugIds.has(b.id))
      : filteredBugs;

    const headers = ['ID', 'Line', 'Title', 'Severity', 'Category', 'Confidence', 'Source', 'Rule ID', 'Explanation', 'Suggested Fix'];
    const rows = targets.map(b => [
      `"${b.id}"`,
      b.line,
      `"${b.title.replace(/"/g, '""')}"`,
      `"${b.severity}"`,
      `"${b.type}"`,
      `${Math.round(b.confidence * 100)}%`,
      `"${b.source}"`,
      `"${b.ruleId || 'N/A'}"`,
      `"${b.explanation.replace(/"/g, '""')}"`,
      `"${(b.suggestedFix || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `code_vulnerabilities_tabular_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const exportToJSON = () => {
    const targets = selectedBugIds.size > 0 
      ? filteredBugs.filter(b => selectedBugIds.has(b.id))
      : filteredBugs;

    const blob = new Blob([JSON.stringify(targets, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `code_vulnerabilities_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Cross-Tab Pivot Matrix Data
  const crossTabLanguages: SupportedLanguage[] = ['python', 'javascript', 'java', 'c', 'cpp', 'html'];
  const crossTabSeverities: BugSeverity[] = ['Critical', 'High', 'Medium', 'Low', 'Info'];

  const pivotMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    crossTabLanguages.forEach(lang => {
      matrix[lang] = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0, Total: 0 };
    });

    history.forEach(item => {
      item.bugs.forEach(bug => {
        if (matrix[item.language]) {
          matrix[item.language][bug.severity] = (matrix[item.language][bug.severity] || 0) + 1;
          matrix[item.language].Total += 1;
        }
      });
    });

    // Add current session bugs to currentLanguage
    bugs.forEach(bug => {
      if (matrix[currentLanguage]) {
        matrix[currentLanguage][bug.severity] = (matrix[currentLanguage][bug.severity] || 0) + 1;
        matrix[currentLanguage].Total += 1;
      }
    });

    return matrix;
  }, [history, bugs, currentLanguage]);

  // Remediation estimates
  const remediationData = useMemo(() => {
    return combinedBugs.map(b => {
      let estMinutes = 20;
      let riskScore = 4;
      if (b.severity === 'Critical') { estMinutes = 60; riskScore = 9.5; }
      else if (b.severity === 'High') { estMinutes = 40; riskScore = 7.8; }
      else if (b.severity === 'Medium') { estMinutes = 25; riskScore = 5.2; }
      else if (b.severity === 'Low') { estMinutes = 15; riskScore = 3.0; }
      else { estMinutes = 10; riskScore = 1.5; }

      if (b.type === 'Security') { estMinutes += 30; riskScore = Math.min(10, riskScore + 2); }
      if (b.type === 'Syntax') { estMinutes = Math.max(5, estMinutes - 10); }

      const costSaved = Math.round((estMinutes / 60) * hourlyDevRate);
      const hasAutoFix = Boolean(b.fixedSnippet || b.suggestedFix);

      return {
        bug: b,
        estMinutes,
        riskScore,
        costSaved,
        hasAutoFix,
        priority: b.severity === 'Critical' ? 'P0' : b.severity === 'High' ? 'P1' : b.severity === 'Medium' ? 'P2' : 'P3'
      };
    });
  }, [combinedBugs, hourlyDevRate]);

  // Total ROI stats
  const totalFixMinutes = remediationData.reduce((acc, curr) => acc + curr.estMinutes, 0);
  const totalCostEstimate = Math.round((totalFixMinutes / 60) * hourlyDevRate);
  const totalAutoFixable = remediationData.filter(r => r.hasAutoFix).length;

  // Rule Frequency Data
  const ruleFrequency = useMemo(() => {
    const rulesMap = new Map<string, { id: string; count: number; severity: BugSeverity; type: BugCategory; engine: string; desc: string }>();
    combinedBugs.forEach(b => {
      const rid = b.ruleId || `RULE-${b.type.toUpperCase()}-01`;
      if (!rulesMap.has(rid)) {
        rulesMap.set(rid, {
          id: rid,
          count: 0,
          severity: b.severity,
          type: b.type,
          engine: b.source,
          desc: b.title
        });
      }
      rulesMap.get(rid)!.count += 1;
    });

    return Array.from(rulesMap.values()).sort((a, b) => b.count - a.count);
  }, [combinedBugs]);

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-6">
      {/* Top Header & Sub-Tab Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-inner">
            <Table className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-white">
                Tabular Output Analytics & Data Grid
              </h3>
              <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-bold text-cyan-300 border border-cyan-500/30">
                {combinedBugs.length} Records
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Multi-dimensional cross-tabulation, sortable defect registries, and remediation ROI metrics.
            </p>
          </div>
        </div>

        {/* Sub-tab Switchers */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            id="tab-sub-master"
            onClick={() => setActiveSubTab('master')}
            className={`flex items-center space-x-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              activeSubTab === 'master'
                ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Table className="h-3.5 w-3.5" />
            <span>Master Registry</span>
          </button>

          <button
            id="tab-sub-crosstab"
            onClick={() => setActiveSubTab('crosstab')}
            className={`flex items-center space-x-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              activeSubTab === 'crosstab'
                ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Cross-Tab Matrix</span>
          </button>

          <button
            id="tab-sub-remediation"
            onClick={() => setActiveSubTab('remediation')}
            className={`flex items-center space-x-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              activeSubTab === 'remediation'
                ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Remediation & ROI</span>
          </button>

          <button
            id="tab-sub-rules"
            onClick={() => setActiveSubTab('rules')}
            className={`flex items-center space-x-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              activeSubTab === 'rules'
                ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Rule Telemetry</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Master Defect Data Grid */}
      {activeSubTab === 'master' && (
        <div className="space-y-4">
          {/* Controls Bar: Search, Filters & Export Buttons */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by title, rule ID, or CWE..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-900 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Severity Filter */}
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none"
              >
                <option value="all">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
                <option value="Info">Info</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="Syntax">Syntax</option>
                <option value="Semantic">Semantic</option>
                <option value="Logical">Logical</option>
                <option value="Runtime">Runtime</option>
                <option value="Security">Security</option>
              </select>

              {/* Source Engine */}
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none"
              >
                <option value="all">All Detection Engines</option>
                <option value="Static Analyzer">Static AST</option>
                <option value="Compiler/Parser">Compiler / Parser</option>
                <option value="Gemini AI">Gemini AI</option>
                <option value="Combined Analysis">Combined Analysis</option>
              </select>
            </div>

            {/* Export Actions */}
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={exportToCSV}
                className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition-colors shadow-sm"
                title="Export filtered records to CSV"
              >
                <Download className="h-3.5 w-3.5 text-cyan-400" />
                <span>Export CSV ({filteredBugs.length})</span>
              </button>

              <button
                onClick={exportToJSON}
                className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition-colors shadow-sm"
                title="Export filtered records to JSON"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                <span>JSON</span>
              </button>
            </div>
          </div>

          {/* Table Element */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80 shadow-inner">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800 select-none">
                <tr>
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={filteredBugs.length > 0 && selectedBugIds.size === filteredBugs.length}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th 
                    onClick={() => handleSort('line')} 
                    className="p-3 cursor-pointer hover:text-white"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Line</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('title')} 
                    className="p-3 cursor-pointer hover:text-white min-w-[220px]"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Defect Description & Rule</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('severity')} 
                    className="p-3 cursor-pointer hover:text-white"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Severity</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('type')} 
                    className="p-3 cursor-pointer hover:text-white"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Category</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('confidence')} 
                    className="p-3 cursor-pointer hover:text-white"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Confidence</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('source')} 
                    className="p-3 cursor-pointer hover:text-white"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Detection Engine</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredBugs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No defects matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredBugs.map((bug) => {
                    const isSelected = selectedBugIds.has(bug.id);
                    const isExpanded = expandedBugId === bug.id;

                    const severityBadgeClass = 
                      bug.severity === 'Critical' ? 'bg-rose-950/80 text-rose-300 border-rose-800/80' :
                      bug.severity === 'High' ? 'bg-amber-950/80 text-amber-300 border-amber-800/80' :
                      bug.severity === 'Medium' ? 'bg-yellow-950/60 text-yellow-300 border-yellow-800/60' :
                      'bg-sky-950/60 text-sky-300 border-sky-800/60';

                    return (
                      <React.Fragment key={bug.id}>
                        <tr 
                          className={`hover:bg-slate-800/40 transition-colors ${
                            isSelected ? 'bg-cyan-950/20' : ''
                          }`}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(bug.id)}
                              className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-mono font-bold text-cyan-300">
                            {onJumpToLine ? (
                              <button
                                onClick={() => onJumpToLine(bug.line)}
                                className="hover:underline"
                                title={`Jump to line ${bug.line}`}
                              >
                                L{bug.line}
                              </button>
                            ) : (
                              `L${bug.line}`
                            )}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-white">{bug.title}</div>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                              {bug.ruleId && <span className="font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">{bug.ruleId}</span>}
                              {bug.cwe && <span className="font-mono text-rose-300">{bug.cwe}</span>}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${severityBadgeClass}`}>
                              {bug.severity}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700">
                              {bug.type}
                            </span>
                          </td>
                          <td className="p-3 font-mono">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-emerald-400">{Math.round(bug.confidence * 100)}%</span>
                              <div className="h-1.5 w-12 rounded-full bg-slate-800 overflow-hidden">
                                <div className="h-full bg-emerald-400" style={{ width: `${Math.round(bug.confidence * 100)}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-[11px] text-slate-400">
                            <span className="inline-flex items-center space-x-1">
                              <Cpu className="h-3 w-3 text-slate-400" />
                              <span>{bug.source}</span>
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setExpandedBugId(isExpanded ? null : bug.id)}
                              className="rounded-lg p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                              title="Toggle Details"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded details row */}
                        {isExpanded && (
                          <tr className="bg-slate-900/90 border-b border-slate-800">
                            <td colSpan={8} className="p-4 space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                                  <div className="font-semibold text-slate-300 mb-1">📖 Root Cause & Impact</div>
                                  <p className="text-slate-300 leading-relaxed">{bug.explanation}</p>
                                  <div className="mt-2 text-rose-300 font-medium">⚠️ {bug.whyProblem}</div>
                                </div>

                                <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3">
                                  <div className="flex items-center justify-between font-semibold text-emerald-300 mb-1">
                                    <span>💡 Suggested Fix</span>
                                    {bug.fixedSnippet && onApplySingleFix && (
                                      <button
                                        onClick={() => onApplySingleFix(bug)}
                                        className="flex items-center space-x-1 rounded bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-emerald-500"
                                      >
                                        <Wrench className="h-3 w-3" />
                                        <span>Apply Fix</span>
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-emerald-200/90 leading-relaxed">{bug.suggestedFix}</p>
                                </div>
                              </div>

                              {bug.codeSnippet && (
                                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-amber-200/90 overflow-x-auto">
                                  <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Code Context:</div>
                                  <pre>{bug.codeSnippet}</pre>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Language vs Severity Cross-Tab Matrix */}
      {activeSubTab === 'crosstab' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <h4 className="text-sm font-bold text-white mb-1">Cross-Tabulation Pivot: Programming Language × Severity</h4>
            <p className="text-xs text-slate-400 mb-4">
              Distribution of static & AI discovered defects by language environment and severity tier.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-200">
                <thead className="bg-slate-900 font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3 text-left">Language</th>
                    <th className="p-3 text-rose-400">Critical</th>
                    <th className="p-3 text-amber-400">High</th>
                    <th className="p-3 text-yellow-400">Medium</th>
                    <th className="p-3 text-sky-400">Low</th>
                    <th className="p-3 text-slate-400">Info</th>
                    <th className="p-3 bg-slate-800/80 text-white font-extrabold">Total Bugs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {crossTabLanguages.map((lang) => {
                    const row = pivotMatrix[lang] || { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0, Total: 0 };
                    const isCurrent = lang === currentLanguage;
                    return (
                      <tr key={lang} className={`hover:bg-slate-800/40 ${isCurrent ? 'bg-cyan-950/20 font-semibold' : ''}`}>
                        <td className="p-3 text-left uppercase font-bold text-slate-300 flex items-center space-x-2">
                          <span>{lang}</span>
                          {isCurrent && <span className="text-[10px] text-cyan-400 font-mono">(Active)</span>}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-bold ${row.Critical > 0 ? 'bg-rose-950 text-rose-300 border border-rose-800/60' : 'text-slate-600'}`}>
                            {row.Critical}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-bold ${row.High > 0 ? 'bg-amber-950 text-amber-300 border border-amber-800/60' : 'text-slate-600'}`}>
                            {row.High}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-bold ${row.Medium > 0 ? 'bg-yellow-950/60 text-yellow-300' : 'text-slate-600'}`}>
                            {row.Medium}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{row.Low}</td>
                        <td className="p-3 text-slate-500">{row.Info}</td>
                        <td className="p-3 font-extrabold text-cyan-300 bg-slate-900/60">
                          {row.Total}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Remediation & ROI Table */}
      {activeSubTab === 'remediation' && (
        <div className="space-y-4">
          {/* Top ROI KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>Est. Manual Fix Effort</span>
                <Clock className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white">
                {Math.round(totalFixMinutes / 60 * 10) / 10} Hours
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Across {remediationData.length} identified defects</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>Automated Fix Coverage</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-400">
                {remediationData.length > 0 ? Math.round((totalAutoFixable / remediationData.length) * 100) : 0}%
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{totalAutoFixable} 1-click patchable issues</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>Developer Cost Saved (@${hourlyDevRate}/hr)</span>
                <DollarSign className="h-4 w-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-400">
                ${totalCostEstimate.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Immediate engineering ROI</div>
            </div>
          </div>

          {/* Remediation Work Orders Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Line</th>
                  <th className="p-3">Defect Description</th>
                  <th className="p-3">Fix ETA</th>
                  <th className="p-3">Risk Score</th>
                  <th className="p-3">Automation Status</th>
                  <th className="p-3 text-right">Cost Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {remediationData.map(({ bug, estMinutes, riskScore, costSaved, hasAutoFix, priority }) => (
                  <tr key={bug.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold font-mono text-[10px] ${
                        priority === 'P0' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        priority === 'P1' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {priority}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-cyan-300">L{bug.line}</td>
                    <td className="p-3 font-semibold text-white">{bug.title}</td>
                    <td className="p-3 text-slate-300">{estMinutes} mins</td>
                    <td className="p-3">
                      <span className={`font-bold ${riskScore >= 7 ? 'text-rose-400' : 'text-yellow-400'}`}>
                        {riskScore}/10
                      </span>
                    </td>
                    <td className="p-3">
                      {hasAutoFix ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold">
                          <Check className="h-3.5 w-3.5" />
                          <span>1-Click Patch</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">Manual Refactor</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-amber-400">
                      ${costSaved}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Rule Telemetry */}
      {activeSubTab === 'rules' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <h4 className="text-sm font-bold text-white mb-1">Static AST & Security Rule Telemetry</h4>
            <p className="text-xs text-slate-400 mb-4">
              Frequency of rule triggers, CWE vulnerability mappings, and detection engine attribution.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-slate-900 font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Rule Identifier</th>
                    <th className="p-3">Associated Vulnerability</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Engine</th>
                    <th className="p-3 text-right">Trigger Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {ruleFrequency.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-cyan-300">{r.id}</td>
                      <td className="p-3 text-white font-medium">{r.desc}</td>
                      <td className="p-3">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                          {r.type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{r.engine}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-400">
                        {r.count} hits
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
