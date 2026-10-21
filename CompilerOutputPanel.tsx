import React, { useState } from 'react';
import { 
  Terminal, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Cpu, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Layers,
  Wrench,
  AlertTriangle
} from 'lucide-react';
import { ExecutionResult, SystemToolReport } from '../types';

interface CompilerOutputPanelProps {
  result: ExecutionResult | null;
  isRunning: boolean;
  systemTools?: SystemToolReport | null;
  stdin: string;
  setStdin: (val: string) => void;
  onRunAgain?: () => void;
  onSelectLine?: (line: number) => void;
}

export const CompilerOutputPanel: React.FC<CompilerOutputPanelProps> = ({
  result,
  isRunning,
  systemTools,
  stdin,
  setStdin,
  onRunAgain,
  onSelectLine,
}) => {
  const [activeTab, setActiveTab] = useState<'output' | 'diagnostics' | 'stdin' | 'toolchain'>('output');
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleCopy = async () => {
    const textToCopy = `${result?.stdout || ''}\n${result?.stderr || ''}`.trim();
    if (!textToCopy) return;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = () => {
    if (isRunning) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
          <Clock className="w-3 h-3 animate-spin" /> Compiling & Executing...
        </span>
      );
    }
    if (!result) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
          Ready for execution
        </span>
      );
    }
    switch (result.status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Execution Succeeded (Exit 0)
          </span>
        );
      case 'COMPILE_ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3 h-3" /> Compilation Error (Exit {result.exitCode ?? 1})
          </span>
        );
      case 'RUNTIME_ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
            <AlertTriangle className="w-3 h-3" /> Runtime Error (Exit {result.exitCode})
          </span>
        );
      case 'TIMEOUT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
            <Clock className="w-3 h-3" /> Execution Timed Out (&gt; 5s limit)
          </span>
        );
      case 'TOOL_UNAVAILABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Wrench className="w-3 h-3" /> Toolchain Unavailable
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
            Status: {result.status}
          </span>
        );
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-slate-800/90 bg-slate-950/95 shadow-2xl overflow-hidden font-mono text-xs">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200 uppercase tracking-wider text-xs">
            Compiler &amp; Sandbox Console
          </span>
          {result?.toolUsed && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
              Tool: {result.toolUsed}
            </span>
          )}
          {getStatusBadge()}
        </div>

        <div className="flex items-center gap-2">
          {result && (
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {result.executionTimeMs}ms
            </span>
          )}

          {/* Copy output */}
          <button
            onClick={handleCopy}
            disabled={!result}
            title="Copy Console Output"
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Collapse/expand toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Sub-tabs */}
          <div className="flex items-center border-b border-slate-800/80 bg-slate-900/50 px-4 py-1.5 gap-3">
            <button
              onClick={() => setActiveTab('output')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'output'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Output (stdout/stderr)
            </button>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'diagnostics'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Compiler Diagnostics
              {result?.diagnostics && result.diagnostics.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/30 text-rose-300 border border-rose-500/40">
                  {result.diagnostics.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('stdin')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'stdin'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Custom Stdin {stdin.trim() ? '•' : ''}
            </button>
            <button
              onClick={() => setActiveTab('toolchain')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                activeTab === 'toolchain'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3 h-3 text-cyan-400" />
              Real Host Toolchain
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4 max-h-72 overflow-y-auto font-mono text-[12px] leading-relaxed select-text">
            {activeTab === 'output' && (
              <div>
                {isRunning && (
                  <div className="flex items-center gap-2 text-cyan-400 py-3">
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Compiling in safe temporary sandbox with resource limits...</span>
                  </div>
                )}
                {!isRunning && !result && (
                  <div className="text-slate-500 py-4 text-center">
                    Press <span className="text-cyan-300 font-bold">RUN</span> in the toolbar to execute your code in the real host sandbox.
                  </div>
                )}
                {!isRunning && result && (
                  <div className="space-y-2">
                    {/* Compilation output banner if compile failed */}
                    {result.status === 'COMPILE_ERROR' && (
                      <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-200 mb-2">
                        <div className="font-bold flex items-center gap-1.5 text-rose-300">
                          <XCircle className="w-3.5 h-3.5" />
                          Compiler Rejected Source Code:
                        </div>
                        <pre className="mt-1 text-[11px] whitespace-pre-wrap text-rose-300/90 font-mono">
                          {result.stderr || result.stdout || result.compilationOutput}
                        </pre>
                      </div>
                    )}

                    {/* Stdout */}
                    {result.stdout && (
                      <div>
                        <div className="text-[11px] font-bold uppercase text-emerald-400 mb-1">Standard Output (stdout):</div>
                        <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 whitespace-pre-wrap">
                          {result.stdout}
                        </pre>
                      </div>
                    )}

                    {/* Stderr (if not compile error already shown) */}
                    {result.stderr && result.status !== 'COMPILE_ERROR' && (
                      <div>
                        <div className="text-[11px] font-bold uppercase text-amber-400 mb-1">Standard Error (stderr):</div>
                        <pre className="p-2.5 rounded-lg bg-slate-900 border border-amber-900/40 text-amber-200 whitespace-pre-wrap">
                          {result.stderr}
                        </pre>
                      </div>
                    )}

                    {/* Clean empty output */}
                    {!result.stdout && !result.stderr && result.status === 'SUCCESS' && (
                      <div className="text-emerald-400 py-2">
                        ✓ Program exited successfully with exit code 0 (no output printed to stdout/stderr).
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'diagnostics' && (
              <div className="space-y-2">
                {(!result || result.diagnostics.length === 0) ? (
                  <div className="text-slate-500 py-3 text-center">
                    No compiler diagnostics reported. Code compiled cleanly without syntax warnings or errors.
                  </div>
                ) : (
                  result.diagnostics.map((diag, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSelectLine && onSelectLine(diag.line)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all hover:scale-[1.005] ${
                        diag.severity === 'error'
                          ? 'bg-rose-950/30 border-rose-800/70 text-rose-200'
                          : 'bg-amber-950/30 border-amber-800/70 text-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                              diag.severity === 'error'
                                ? 'bg-rose-600 text-white'
                                : 'bg-amber-600 text-white'
                            }`}
                          >
                            {diag.severity}
                          </span>
                          Line {diag.line}{diag.column ? `:${diag.column}` : ''}
                        </span>
                        <span className="text-[11px] text-cyan-400 hover:underline">Click to jump to line &rarr;</span>
                      </div>
                      <div className="mt-1 font-semibold">{diag.message}</div>
                      {diag.codeSnippet && (
                        <pre className="mt-1.5 p-1.5 rounded bg-slate-900/90 text-slate-300 font-mono text-[11px]">
                          {diag.codeSnippet}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'stdin' && (
              <div className="space-y-2">
                <div className="text-slate-300 text-xs">
                  Supply standard input (stdin) for programs that read via <code className="text-cyan-300">scanf</code>, <code className="text-cyan-300">cin</code>, or <code className="text-cyan-300">input()</code>:
                </div>
                <textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  placeholder="Enter inputs here (each line will be fed to stdin)..."
                  rows={4}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                {onRunAgain && (
                  <button
                    onClick={onRunAgain}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs"
                  >
                    Re-run with this Stdin
                  </button>
                )}
              </div>
            )}

            {activeTab === 'toolchain' && (
              <div className="space-y-3">
                <div className="text-slate-300 text-xs">
                  Real Hardware Compilers &amp; Runtimes detected in this container:
                </div>
                {systemTools?.tools ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(Object.entries(systemTools.tools) as [string, SystemToolReport['tools'][string]][]).map(([key, tool]) => (
                      <div
                        key={key}
                        className={`p-2.5 rounded-lg border ${
                          tool.available
                            ? 'bg-slate-900/90 border-slate-800 text-slate-200'
                            : 'bg-slate-900/40 border-slate-800/40 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-100">{tool.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tool.available
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {tool.available ? 'AVAILABLE ✓' : 'UNAVAILABLE'}
                          </span>
                        </div>
                        {tool.version && (
                          <div className="text-[11px] text-slate-400 mt-1 font-mono truncate">
                            {tool.version}
                          </div>
                        )}
                        {tool.path && (
                          <div className="text-[10px] text-slate-500 font-mono truncate">
                            Binary: {tool.path}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400">Loading system toolchain status...</div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
