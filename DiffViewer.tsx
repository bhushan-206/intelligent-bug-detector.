import React, { useState } from 'react';
import { 
  Check, 
  Copy, 
  Download, 
  ArrowLeftRight, 
  Wrench, 
  CheckCircle2, 
  FileCode2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { SupportedLanguage, FixVerificationResult, DetectedBug } from '../types';
import { ensureProperFormatting, unescapeLiteralEscapes } from '../utils/codeFormatter';

interface DiffViewerProps {
  originalCode: string;
  fixedCode: string;
  language: SupportedLanguage;
  onApplyFix: (newCode: string) => void;
  onClose?: () => void;
  explanation?: string;
  changesList?: string[];
  verification?: FixVerificationResult;
  bugs?: DetectedBug[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  originalCode,
  fixedCode,
  language,
  onApplyFix,
  onClose,
  explanation,
  changesList = [],
  verification,
  bugs = [],
}) => {
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const safeOriginalCode = unescapeLiteralEscapes(originalCode || '');
  const isNoBugsOrIdentical = 
    !fixedCode ||
    fixedCode === originalCode ||
    fixedCode.trim() === originalCode.trim() ||
    unescapeLiteralEscapes(fixedCode || '') === safeOriginalCode ||
    unescapeLiteralEscapes(fixedCode || '').trim() === safeOriginalCode.trim();

  // If code is clean/identical, display the EXACT SAME code character for character, line for line
  const safeFixedCode = isNoBugsOrIdentical
    ? safeOriginalCode
    : ensureProperFormatting(fixedCode || '', originalCode || '', language);

  const originalLines = safeOriginalCode.split('\n');
  const fixedLines = safeFixedCode.split('\n');
  const maxLines = Math.max(originalLines.length, fixedLines.length);

  // Set of 1-based line numbers that have verified bugs on non-empty lines
  const buggyLineNumbers = React.useMemo(() => {
    const set = new Set<number>();
    if (isNoBugsOrIdentical || !bugs || bugs.length === 0) return set;

    for (const b of bugs) {
      const lineNum = b.line;
      if (typeof lineNum === 'number' && lineNum >= 1 && lineNum <= originalLines.length) {
        const lineContent = originalLines[lineNum - 1];
        // Only include if the line actually contains code (is NOT blank or whitespace-only)
        if (lineContent && lineContent.trim().length > 0) {
          set.add(lineNum);
        }
      }
      if (b.endLine && typeof b.endLine === 'number') {
        for (let l = Math.max(1, b.line); l <= Math.min(originalLines.length, b.endLine); l++) {
          const lineContent = originalLines[l - 1];
          if (lineContent && lineContent.trim().length > 0) {
            set.add(l);
          }
        }
      }
    }
    return set;
  }, [bugs, originalLines, isNoBugsOrIdentical]);

  const handleCopyFixed = async () => {
    await navigator.clipboard.writeText(safeFixedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extensions: Record<SupportedLanguage, string> = {
      python: 'py',
      javascript: 'js',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      html: 'html'
    };
    const ext = extensions[language] || 'txt';
    const blob = new Blob([safeFixedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fixed_code.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const confirmAndApply = () => {
    if (!safeFixedCode || !safeFixedCode.trim()) {
      setShowConfirm(false);
      return;
    }
    onApplyFix(safeFixedCode);
    setShowConfirm(false);
  };

  const handleDirectApplyFix = () => {
    if (isNoBugsOrIdentical || !safeFixedCode || !safeFixedCode.trim()) {
      return;
    }
    onApplyFix(safeFixedCode);
  };

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-xl backdrop-blur-md transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Code Remediation & Diff Preview
            </h3>
            <p className="text-xs text-slate-400">
              Compare original problematic code against the corrected version.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-copy-fixed-code"
            onClick={handleCopyFixed}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-700/80 bg-slate-800/90 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700/90 hover:text-white transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-cyan-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Fixed Code'}</span>
          </button>

          <button
            id="btn-download-fixed-code"
            onClick={handleDownload}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-700/80 bg-slate-800/90 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700/90 hover:text-white transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download File</span>
          </button>

          <button
            id="btn-apply-fix-to-editor"
            onClick={handleDirectApplyFix}
            disabled={isNoBugsOrIdentical || !safeFixedCode}
            className={`flex items-center space-x-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
              isNoBugsOrIdentical || !safeFixedCode
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50 opacity-60'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 cursor-pointer active:scale-95'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Apply Fix to Editor</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal / Banner */}
      {showConfirm && (
        <div className="my-3 rounded-xl border border-amber-900/50 bg-amber-950/40 p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-amber-200">
                Confirm Code Replacement
              </h4>
              <p className="text-xs text-amber-300 mt-0.5">
                Applying this fix will overwrite the current code in your editor with the corrected version. Would you like to proceed?
              </p>
              <div className="mt-3 flex items-center space-x-2">
                <button
                  id="btn-confirm-apply-fix"
                  onClick={confirmAndApply}
                  className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-500 transition-colors shadow-sm"
                >
                  Yes, Overwrite & Apply
                </button>
                <button
                  id="btn-cancel-apply-fix"
                  onClick={() => setShowConfirm(false)}
                  className="rounded-lg border border-slate-700/80 bg-slate-800/90 px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700/90 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real Fix Verification Banner */}
      {verification && (
        <div
          className={`my-3 rounded-xl p-3.5 text-xs border ${
            verification.status === 'FIX_VERIFIED'
              ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200'
              : 'bg-amber-950/40 border-amber-600/50 text-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm">
              {verification.status === 'FIX_VERIFIED' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">FIX VERIFIED</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300">FIX PROPOSED — NOT FULLY VERIFIED</span>
                </>
              )}
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Verified in {verification.executionTimeMs}ms
            </span>
          </div>

          {/* Evidence List */}
          {verification.verificationEvidence && verification.verificationEvidence.length > 0 && (
            <ul className="mt-2 space-y-1 text-slate-300 text-[11px] font-mono">
              {verification.verificationEvidence.map((ev, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="text-cyan-400">•</span>
                  <span>{ev}</span>
                </li>
              ))}
            </ul>
          )}

          {verification.compilerOutput && (
            <div className="mt-2 p-2 rounded bg-slate-900/90 text-slate-300 font-mono text-[11px] max-h-24 overflow-y-auto whitespace-pre-wrap">
              {verification.compilerOutput}
            </div>
          )}
        </div>
      )}

      {/* Clean Code Notice when Zero Bugs / Identical */}
      {isNoBugsOrIdentical ? (
        <div className="my-3 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3.5 text-xs text-emerald-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="font-bold text-emerald-300">No bugs found — code is clean</span>
            </div>
            <span className="rounded-full bg-emerald-900/80 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 w-fit">
              Health Score: 100% (Excellent)
            </span>
          </div>
          <p className="mt-1.5 text-slate-300 text-xs">
            Both panels display the exact same code character-for-character with zero modifications or reformatting needed.
          </p>
        </div>
      ) : explanation ? (
        <div className="my-3 rounded-xl bg-slate-800/50 p-3 text-xs text-slate-300 border border-slate-700/60">
          <div className="font-semibold text-slate-100 mb-0.5">
            Fix Summary:
          </div>
          <p>{explanation}</p>
          {changesList.length > 0 && (
            <ul className="mt-2 list-disc list-inside space-y-0.5 text-slate-400">
              {changesList.map((ch, idx) => (
                <li key={idx}>{ch}</li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {/* Side-by-Side Diff Display */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Original Code */}
        <div className={`rounded-xl border ${isNoBugsOrIdentical ? 'border-emerald-900/40' : 'border-rose-900/40'} bg-slate-950 overflow-hidden`}>
          <div className={`flex items-center justify-between border-b border-slate-800 ${isNoBugsOrIdentical ? 'bg-emerald-950/30 text-emerald-300' : 'bg-rose-950/30 text-rose-300'} px-3 py-2 text-xs font-semibold`}>
            <span>{isNoBugsOrIdentical ? 'Original Code (Clean & Verified)' : 'Original Code (with Issues)'}</span>
            <span className="text-[11px] font-mono text-slate-400">{originalLines.length} lines</span>
          </div>
          <div className="max-h-[420px] overflow-auto p-3 font-mono text-xs text-slate-200 leading-6">
            {originalLines.map((line, idx) => {
              const lineNum = idx + 1;
              const isBlank = !line || line.trim().length === 0;

              // Only highlight in red the EXACT line(s) that contain an actual, real, verified bug.
              // Never highlight blank lines, empty lines, trailing whitespace-only lines, or unrelated lines.
              let isBuggy = false;
              if (!isNoBugsOrIdentical && !isBlank) {
                if (bugs && bugs.length > 0) {
                  isBuggy = buggyLineNumbers.has(lineNum);
                } else {
                  // Fallback if no bugs array is provided: only highlight non-blank differing lines
                  isBuggy = originalLines[idx] !== fixedLines[idx];
                }
              }

              return (
                <div 
                  key={idx} 
                  className={`flex ${isBuggy ? 'bg-rose-950/50 text-rose-300' : ''}`}
                >
                  <span className="w-8 select-none text-slate-600 text-right pr-3 font-mono text-[11px]">
                    {lineNum}
                  </span>
                  <span className="flex-1 whitespace-pre">{line || ' '}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Fixed Code */}
        <div className="rounded-xl border border-emerald-900/40 bg-slate-950 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 bg-emerald-950/30 px-3 py-2 text-xs font-semibold text-emerald-300">
            <span>{isNoBugsOrIdentical ? 'Remediated Fixed Code (Identical — No Changes Needed)' : 'Remediated Fixed Code'}</span>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-mono text-slate-400">{fixedLines.length} lines</span>
              {/* Apply Fix button positioned just above Remediated Fixed Code panel, aligned to top-right corner */}
              <button
                id="btn-apply-fix"
                onClick={handleDirectApplyFix}
                disabled={isNoBugsOrIdentical || !safeFixedCode}
                title={isNoBugsOrIdentical ? "Code is already clean — no fixes needed" : "Apply remediated fixed code to editor"}
                className={`flex items-center space-x-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                  isNoBugsOrIdentical || !safeFixedCode
                    ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/50 opacity-60'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/20 active:scale-95 cursor-pointer'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Apply Fix</span>
              </button>
            </div>
          </div>
          <div className="max-h-[420px] overflow-auto p-3 font-mono text-xs text-slate-200 leading-6">
            {fixedLines.map((line, idx) => {
              const isBlank = !line || line.trim().length === 0;
              const isDifferent = !isNoBugsOrIdentical && !isBlank && originalLines[idx] !== fixedLines[idx];
              return (
                <div 
                  key={idx} 
                  className={`flex ${isDifferent ? 'bg-emerald-950/50 text-emerald-300 font-semibold' : ''}`}
                >
                  <span className="w-8 select-none text-slate-600 text-right pr-3 font-mono text-[11px]">
                    {idx + 1}
                  </span>
                  <span className="flex-1 whitespace-pre">{line || ' '}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
