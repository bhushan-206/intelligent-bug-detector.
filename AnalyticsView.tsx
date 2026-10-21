import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  ShieldCheck, 
  Bug, 
  Lock, 
  Zap, 
  Activity, 
  CheckCircle2, 
  Table, 
  Compass, 
  Layers, 
  ArrowUpRight, 
  Sparkles, 
  Cpu, 
  Radar as RadarIcon, 
  Download,
  ArrowRight,
  Code2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar 
} from 'recharts';
import { AnalysisHistoryItem, DetectedBug, SupportedLanguage, BugSeverity, BugCategory, UserProfile } from '../types';
import { TabularAnalytics } from './TabularAnalytics';
import { TableauAiDashboard } from './TableauAiDashboard';

interface AnalyticsViewProps {
  history: AnalysisHistoryItem[];
  currentBugs?: DetectedBug[];
  currentLanguage?: SupportedLanguage;
  onApplySingleFix?: (bug: DetectedBug) => void;
  onJumpToLine?: (line: number) => void;
  onNavigateToAnalyzer?: () => void;
  currentUser?: UserProfile | null;
  initialTab?: 'tableau-ai' | 'graphical' | 'pie' | 'tabular';
}

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f59e0b',
  Medium: '#eab308',
  Low: '#38bdf8',
  Info: '#94a3b8'
};

const CATEGORY_COLORS: Record<string, string> = {
  Security: '#f43f5e',
  Logical: '#a855f7',
  Runtime: '#f97316',
  Syntax: '#06b6d4',
  Semantic: '#10b981'
};

const PIE_PALETTE = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981'];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  history = [],
  currentBugs = [],
  currentLanguage = 'python',
  onApplySingleFix,
  onJumpToLine,
  onNavigateToAnalyzer,
  currentUser,
  initialTab = 'tableau-ai'
}) => {
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<'tableau-ai' | 'graphical' | 'pie' | 'tabular'>(initialTab);
  const [pieChartAngle, setPieChartAngle] = useState<'severity' | 'category' | 'engine' | 'confidence'>('severity');

  // Aggregate bugs across all history items + current session (real dynamic data only)
  const allBugs: DetectedBug[] = useMemo(() => {
    const historicalBugs = history.flatMap(h => h.bugs || []);
    const combined = [...currentBugs, ...historicalBugs];
    const uniqueMap = new Map<string, DetectedBug>();
    combined.forEach(b => {
      const key = `${b.id}-${b.line}-${b.title}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, b);
    });
    return Array.from(uniqueMap.values());
  }, [currentBugs, history]);

  const totalScans = history.length + (currentBugs.length > 0 ? 1 : 0);
  const isDataEmpty = totalScans === 0 && allBugs.length === 0;

  // Severity Breakdown
  const severityCounts: Record<BugSeverity, number> = useMemo(() => {
    const counts: Record<BugSeverity, number> = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 };
    allBugs.forEach(b => { counts[b.severity] = (counts[b.severity] || 0) + 1; });
    return counts;
  }, [allBugs]);

  // Category Breakdown
  const categoryCounts: Record<BugCategory, number> = useMemo(() => {
    const counts: Record<BugCategory, number> = { Syntax: 0, Semantic: 0, Logical: 0, Runtime: 0, Security: 0 };
    allBugs.forEach(b => { counts[b.type] = (counts[b.type] || 0) + 1; });
    return counts;
  }, [allBugs]);

  // Language Breakdown from actual scans
  const languageCounts = useMemo(() => {
    const counts: Record<string, number> = { python: 0, javascript: 0, java: 0, c: 0, cpp: 0, html: 0 };
    history.forEach(h => { counts[h.language] = (counts[h.language] || 0) + 1; });
    if (currentBugs.length > 0 && !history.some(h => h.id.includes(currentBugs[0]?.id || 'never'))) {
      counts[currentLanguage] = (counts[currentLanguage] || 0) + 1;
    }
    return counts;
  }, [history, currentBugs, currentLanguage]);

  // Average Health Score from real history and current bugs
  const avgHealth = useMemo(() => {
    if (history.length > 0) {
      return Math.round(history.reduce((acc, curr) => acc + (curr.healthScore || 100), 0) / history.length);
    }
    if (currentBugs.length > 0) {
      return Math.max(20, 100 - currentBugs.length * 15);
    }
    return 100;
  }, [history, currentBugs]);

  // Chart Data: Bar chart for Severity Breakdown
  const severityBarData = useMemo(() => {
    return [
      { name: 'Critical', count: severityCounts.Critical, fill: SEVERITY_COLORS.Critical },
      { name: 'High', count: severityCounts.High, fill: SEVERITY_COLORS.High },
      { name: 'Medium', count: severityCounts.Medium, fill: SEVERITY_COLORS.Medium },
      { name: 'Low', count: severityCounts.Low, fill: SEVERITY_COLORS.Low },
      { name: 'Info', count: severityCounts.Info, fill: SEVERITY_COLORS.Info },
    ];
  }, [severityCounts]);

  // Chart Data: Bar chart for Language breakdown
  const languageBarData = useMemo(() => {
    return Object.entries(languageCounts).map(([lang, count]) => ({
      name: lang.toUpperCase(),
      scans: count,
    }));
  }, [languageCounts]);

  // Chart Data: Trend Line / Area over History
  const historyTrendData = useMemo(() => {
    if (history.length === 0) {
      return [
        { scan: 'Active Run', healthScore: avgHealth, defects: currentBugs.length },
      ];
    }
    return history.slice(-8).map((h, idx) => ({
      scan: `Scan #${idx + 1}`,
      healthScore: h.healthScore,
      defects: h.totalBugs,
      language: h.language.toUpperCase(),
    }));
  }, [history, currentBugs, avgHealth]);

  // Radar Quality Dimensions from actual bug counts
  const radarQualityData = useMemo(() => {
    const total = allBugs.length || 1;
    return [
      { subject: 'Security Shield', A: Math.max(15, 100 - (categoryCounts.Security / total) * 100), fullMark: 100 },
      { subject: 'Syntax Precision', A: Math.max(20, 100 - (categoryCounts.Syntax / total) * 100), fullMark: 100 },
      { subject: 'Runtime Stability', A: Math.max(25, 100 - (categoryCounts.Runtime / total) * 100), fullMark: 100 },
      { subject: 'Logical Consistency', A: Math.max(20, 100 - (categoryCounts.Logical / total) * 100), fullMark: 100 },
      { subject: 'Semantic Accuracy', A: Math.max(30, 100 - (categoryCounts.Semantic / total) * 100), fullMark: 100 },
      { subject: 'Code Cleanliness', A: avgHealth, fullMark: 100 },
    ];
  }, [allBugs, categoryCounts, avgHealth]);

  // Pie Chart Data dynamically switched by state
  const pieChartData = useMemo(() => {
    if (pieChartAngle === 'severity') {
      return Object.entries(severityCounts).map(([name, value]) => ({
        name,
        value,
        color: SEVERITY_COLORS[name] || '#94a3b8',
      }));
    } else if (pieChartAngle === 'category') {
      return Object.entries(categoryCounts).map(([name, value]) => ({
        name,
        value,
        color: CATEGORY_COLORS[name] || '#06b6d4',
      }));
    } else if (pieChartAngle === 'engine') {
      const engines: Record<string, number> = {};
      allBugs.forEach(b => { engines[b.source] = (engines[b.source] || 0) + 1; });
      return Object.entries(engines).map(([name, value], i) => ({
        name,
        value,
        color: PIE_PALETTE[i % PIE_PALETTE.length],
      }));
    } else {
      // Confidence tiers
      const tiers = { '95-100%': 0, '85-94%': 0, '70-84%': 0, '<70%': 0 };
      allBugs.forEach(b => {
        const c = b.confidence || 0.95;
        if (c >= 0.95) tiers['95-100%'] += 1;
        else if (c >= 0.85) tiers['85-94%'] += 1;
        else if (c >= 0.70) tiers['70-84%'] += 1;
        else tiers['<70%'] += 1;
      });
      return Object.entries(tiers).map(([name, value], i) => ({
        name,
        value,
        color: PIE_PALETTE[i % PIE_PALETTE.length],
      }));
    }
  }, [pieChartAngle, severityCounts, categoryCounts, allBugs]);

  // Empty state handling
  if (isDataEmpty) {
    return (
      <div 
        id="analytics-empty-state"
        className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 sm:p-14 text-center shadow-2xl backdrop-blur-xl space-y-6"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
          <Compass className="h-8 w-8 animate-pulse" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h3 className="text-xl font-bold text-white">
            Analytics & BI Dashboard
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            No analytics data available yet. Analyze some code to generate analytics.
          </p>
        </div>

        {onNavigateToAnalyzer && (
          <div className="pt-2">
            <button
              id="analytics-empty-state-btn"
              onClick={onNavigateToAnalyzer}
              className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:from-cyan-400 hover:to-sky-400 transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              <Code2 className="h-4 w-4" />
              <span>Go to Code Analyzer</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-5 sm:p-7 shadow-2xl backdrop-blur-xl transition-all space-y-6">
      {/* Top Header & Analytics Navigation Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 shadow-md shadow-orange-500/20 text-slate-950">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-extrabold text-white tracking-tight">
                Analytics & Tableau AI BI Studio
              </h3>
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/30">
                Live Data Synchronized
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Tableau AI intelligence, interactive visual marks, multi-dimensional pie analysis, and raw tabular records.
            </p>
          </div>
        </div>

        {/* 4 Core Mode Selectors */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-start lg:self-auto">
          <button
            id="analytics-tab-tableau"
            onClick={() => setActiveAnalyticsTab('tableau-ai')}
            className={`flex items-center space-x-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              activeAnalyticsTab === 'tableau-ai'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                : 'text-amber-400 hover:text-amber-200 hover:bg-amber-950/40 border border-amber-500/30'
            }`}
          >
            <Compass className="h-4 w-4" />
            <span>Tableau AI BI</span>
          </button>

          <button
            id="analytics-tab-graphical"
            onClick={() => setActiveAnalyticsTab('graphical')}
            className={`flex items-center space-x-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              activeAnalyticsTab === 'graphical'
                ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Graphical Charts</span>
          </button>

          <button
            id="analytics-tab-pie"
            onClick={() => setActiveAnalyticsTab('pie')}
            className={`flex items-center space-x-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              activeAnalyticsTab === 'pie'
                ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <PieChartIcon className="h-4 w-4" />
            <span>Pie Studio</span>
          </button>

          <button
            id="analytics-tab-tabular"
            onClick={() => setActiveAnalyticsTab('tabular')}
            className={`flex items-center space-x-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              activeAnalyticsTab === 'tabular'
                ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Table className="h-4 w-4" />
            <span>Tabular Output</span>
          </button>
        </div>
      </div>

      {/* MODE 1: Tableau AI BI Studio (Featured / Primary) */}
      {activeAnalyticsTab === 'tableau-ai' && (
        <TableauAiDashboard
          bugs={allBugs}
          history={history}
          currentLanguage={currentLanguage}
          onNavigateToAnalyzer={onNavigateToAnalyzer}
          currentUser={currentUser}
        />
      )}

      {/* MODE 2: Graphical Representations (Bar, Line, Area, Radar) */}
      {activeAnalyticsTab === 'graphical' && (
        <div className="space-y-6">
          {/* Top 4 KPI Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>Scanned Audits</span>
                <Activity className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-white">{totalScans}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Across test suite executions</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>Average Health Score</span>
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-emerald-400">{avgHealth}/100</div>
              <div className="text-[11px] text-slate-400 mt-0.5">AST static & runtime rating</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>Total Defects Found</span>
                <Bug className="h-4 w-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-white">{allBugs.length}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Syntax, logic & security bugs</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>Critical Security Flaws</span>
                <Lock className="h-4 w-4 text-rose-400" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-rose-400">{categoryCounts.Security}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">High priority vulnerabilities</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart 1: Bugs by Severity */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Defect Severity Distribution (Bar Chart)
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">{allBugs.length} Total</span>
              </div>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={severityBarData} margin={{ top: 10, right: 10, left: -15, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} 
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {severityBarData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart 2: Analyses by Language */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Scans by Programming Language
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">6 Languages</span>
              </div>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={languageBarData} margin={{ top: 10, right: 10, left: -15, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} 
                    />
                    <Bar dataKey="scans" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Line / Area Chart: Health Score Evolution Trend */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Code Health Score Trend (Area Chart)
                </h4>
                <span className="text-[11px] text-emerald-400 font-mono">Score out of 100</span>
              </div>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 10 }}>
                    <defs>
                      <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="scan" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                    <Area type="monotone" dataKey="healthScore" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#healthGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Radar Chart: 6 Quality Dimensions */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Code Quality & Reliability Dimensions (Radar)
                </h4>
                <span className="text-[11px] text-cyan-400 font-mono">AST vs Gemini</span>
              </div>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius={80} data={radarQualityData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10} />
                    <PolarRadiusAxis stroke="#64748b" />
                    <Radar name="Quality Index" dataKey="A" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.4} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: Pie & Donut Chart Studio */}
      {activeAnalyticsTab === 'pie' && (
        <div className="space-y-6">
          {/* Angle Switcher Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-300">Slice Dimensions:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'severity', label: 'By Severity' },
                  { id: 'category', label: 'By Category' },
                  { id: 'engine', label: 'By Detection Engine' },
                  { id: 'confidence', label: 'By Confidence Tier' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setPieChartAngle(item.id as any)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      pieChartAngle === item.id
                        ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs font-mono text-cyan-400">
              Interactive SVG Donut with Percentage Labels
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Donut Chart Canvas */}
            <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-slate-950/90 p-6 flex flex-col items-center justify-center">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                      formatter={(val: any) => [`${val} bugs`, 'Count']}
                    />
                    <Legend />
                    <Pie
                      data={pieChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={4}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Breakdown Legend Cards */}
            <div className="lg:col-span-5 space-y-3">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Slice Proportions & Totals
                </h4>
                <div className="space-y-2">
                  {pieChartData.map(slice => {
                    const total = allBugs.length || 1;
                    const percent = Math.round((slice.value / total) * 100);
                    return (
                      <div key={slice.name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="flex items-center space-x-2.5">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.color }} />
                          <span className="text-xs font-semibold text-white">{slice.name}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="font-bold text-white">{slice.value} bugs</span>
                          <span className="text-[11px] text-slate-400 font-mono">({percent}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 4: Tabular Output Analytics (Full Grid, Matrix, ROI & Rules) */}
      {activeAnalyticsTab === 'tabular' && (
        <TabularAnalytics
          bugs={allBugs}
          history={history}
          currentLanguage={currentLanguage}
          onApplySingleFix={onApplySingleFix}
          onJumpToLine={onJumpToLine}
        />
      )}
    </div>
  );
};
