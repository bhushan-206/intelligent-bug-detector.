import React from 'react';
import { 
  ShieldCheck, 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  Bug, 
  Cpu, 
  Lock, 
  Zap, 
  CheckCircle2 
} from 'lucide-react';
import { AnalysisSummary } from '../types';

interface SummaryMetricsProps {
  summary: AnalysisSummary;
}

export const SummaryMetrics: React.FC<SummaryMetricsProps> = ({ summary }) => {
  const {
    totalIssues,
    critical,
    high,
    medium,
    low,
    syntaxErrors,
    logicErrors,
    securityIssues,
    runtimeRisks,
    healthScore,
    language,
    linesOfCode,
    engineUsed
  } = summary;

  // Determine health score color & label
  const getHealthMeta = (score: number) => {
    if (score >= 90) {
      return {
        color: 'text-emerald-400',
        bg: 'bg-emerald-950/40 border-emerald-500/30',
        label: 'Excellent (Clean & Secure)',
        bar: 'bg-emerald-400',
      };
    } else if (score >= 75) {
      return {
        color: 'text-cyan-400',
        bg: 'bg-cyan-950/40 border-cyan-500/30',
        label: 'Good (Minor Issues)',
        bar: 'bg-cyan-400',
      };
    } else if (score >= 50) {
      return {
        color: 'text-amber-400',
        bg: 'bg-amber-950/40 border-amber-500/30',
        label: 'Needs Attention',
        bar: 'bg-amber-400',
      };
    } else {
      return {
        color: 'text-rose-400',
        bg: 'bg-rose-950/40 border-rose-500/30',
        label: 'Critical Vulnerabilities',
        bar: 'bg-rose-400',
      };
    }
  };

  const healthMeta = getHealthMeta(healthScore);

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-xl backdrop-blur-md transition-colors">
      {/* Top Header & Health Score Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-white">
              Analysis Results & Code Health
            </h2>
            <span className="rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-xs font-semibold uppercase text-slate-200">
              {language}
            </span>
            <span className="text-xs text-slate-400">
              ({linesOfCode} lines analyzed)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Engine: {engineUsed}
          </p>
        </div>

        {/* Health Score Meter */}
        <div className={`flex items-center space-x-4 rounded-xl border p-3 ${healthMeta.bg}`}>
          <div className="text-center">
            <div className="text-xs font-medium text-slate-400">
              Code Health Score
            </div>
            <div className={`text-2xl font-black ${healthMeta.color}`}>
              {healthScore}<span className="text-sm font-semibold text-slate-400">/100</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-700/80" />
          <div>
            <div className={`text-xs font-bold ${healthMeta.color}`}>
              {healthMeta.label}
            </div>
            <div className="mt-1 h-2 w-28 rounded-full bg-slate-800 overflow-hidden">
              <div 
                className={`h-full ${healthMeta.bar} transition-all duration-500`} 
                style={{ width: `${healthScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Clean Code Notice when Zero Bugs */}
      {totalIssues === 0 && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-2.5 text-xs text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-bold text-emerald-300">No bugs found — code is clean</span>
            <span className="text-slate-300 hidden sm:inline">— All syntax, runtime, and security checks passed with 100% Code Health Score.</span>
          </div>
          <span className="rounded-full bg-emerald-900/80 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 w-fit">
            Excellent
          </span>
        </div>
      )}

      {/* Metrics Stat Badges Grid */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
        {/* Total Issues */}
        <div className="rounded-xl border border-slate-800 bg-slate-800/60 p-2.5">
          <div className="text-xs font-semibold text-slate-400">Total Issues</div>
          <div className="text-xl font-bold text-slate-100">{totalIssues}</div>
        </div>

        {/* Critical */}
        <div className="rounded-xl border border-rose-900/40 bg-rose-950/30 p-2.5">
          <div className="flex items-center justify-center space-x-1 text-xs font-semibold text-rose-400">
            <AlertOctagon className="h-3 w-3" />
            <span>Critical</span>
          </div>
          <div className="text-xl font-bold text-rose-400">{critical}</div>
        </div>

        {/* High */}
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/30 p-2.5">
          <div className="flex items-center justify-center space-x-1 text-xs font-semibold text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            <span>High</span>
          </div>
          <div className="text-xl font-bold text-amber-400">{high}</div>
        </div>

        {/* Medium */}
        <div className="rounded-xl border border-yellow-900/40 bg-yellow-950/30 p-2.5">
          <div className="text-xs font-semibold text-yellow-400">Medium</div>
          <div className="text-xl font-bold text-yellow-400">{medium}</div>
        </div>

        {/* Low / Info */}
        <div className="rounded-xl border border-sky-900/40 bg-sky-950/30 p-2.5">
          <div className="text-xs font-semibold text-sky-400">Low / Info</div>
          <div className="text-xl font-bold text-sky-400">{low}</div>
        </div>

        {/* Syntax Errors */}
        <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/30 p-2.5">
          <div className="flex items-center justify-center space-x-1 text-xs font-semibold text-indigo-400">
            <Bug className="h-3 w-3" />
            <span>Syntax</span>
          </div>
          <div className="text-xl font-bold text-indigo-400">{syntaxErrors}</div>
        </div>

        {/* Logic Errors */}
        <div className="rounded-xl border border-purple-900/40 bg-purple-950/30 p-2.5">
          <div className="flex items-center justify-center space-x-1 text-xs font-semibold text-purple-400">
            <Zap className="h-3 w-3" />
            <span>Logic</span>
          </div>
          <div className="text-xl font-bold text-purple-400">{logicErrors}</div>
        </div>

        {/* Security Issues */}
        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 p-2.5">
          <div className="flex items-center justify-center space-x-1 text-xs font-semibold text-emerald-400">
            <Lock className="h-3 w-3" />
            <span>Security</span>
          </div>
          <div className="text-xl font-bold text-emerald-400">{securityIssues}</div>
        </div>
      </div>
    </div>
  );
};
