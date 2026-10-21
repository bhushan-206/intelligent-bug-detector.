import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, 
  Trash2, 
  Copy, 
  Upload, 
  Check, 
  FileCode2, 
  Sparkles, 
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Info,
  ShieldAlert
} from 'lucide-react';
import { SupportedLanguage, DetectedBug, PipelineStage, ExplanationLanguage, EXPLANATION_LANGUAGES } from '../types';
import { SAMPLE_TEST_CASES } from '../data/testSuites';

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  explanationLanguage?: ExplanationLanguage;
  onExplanationLanguageChange?: (lang: ExplanationLanguage) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onRunCode?: () => void;
  isRunning?: boolean;
  onOpenProjectAnalyzer?: () => void;
  activeBugLine?: number;
  onSelectBugByLine?: (line: number) => void;
  bugs?: DetectedBug[];
  stages?: PipelineStage[];
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  setCode,
  language,
  setLanguage,
  explanationLanguage = 'en',
  onExplanationLanguageChange,
  onAnalyze,
  isAnalyzing,
  onRunCode,
  isRunning = false,
  onOpenProjectAnalyzer,
  activeBugLine,
  onSelectBugByLine,
  bugs = [],
  stages = []
}) => {
  const [copied, setCopied] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lines = code.split('\n');
  const lineCount = Math.max(lines.length, 12);

  // Group bugs by line for line-marker rendering (strictly excluding empty/blank lines)
  const bugsByLine = React.useMemo(() => {
    const map = new Map<number, DetectedBug[]>();
    bugs.forEach(bug => {
      const lineText = lines[bug.line - 1];
      if (!lineText || lineText.trim() === '') return;

      const lineList = map.get(bug.line) || [];
      lineList.push(bug);
      map.set(bug.line, lineList);
    });
    return map;
  }, [bugs, lines]);

  // Synchronize scroll between line numbers and textarea
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleCopy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file);
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCode(content);
        // Auto-detect language by file extension
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'py') setLanguage('python');
        else if (ext === 'js' || ext === 'mjs' || ext === 'jsx') setLanguage('javascript');
        else if (ext === 'java') setLanguage('java');
        else if (ext === 'c' || ext === 'h') setLanguage('c');
        else if (ext === 'cpp' || ext === 'cc' || ext === 'hpp') setLanguage('cpp');
        else if (ext === 'html' || ext === 'htm') setLanguage('html');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      readFile(e.dataTransfer.files[0]);
    }
  };

  const loadSample = (sampleId: string) => {
    const sample = SAMPLE_TEST_CASES.find(s => s.id === sampleId);
    if (sample) {
      setLanguage(sample.language);
      setCode(sample.code);
    }
  };

  // Scroll to active bug line when activeBugLine changes
  useEffect(() => {
    if (activeBugLine && textareaRef.current) {
      const lineHeight = 24; // approximate line height in px
      const targetScroll = (activeBugLine - 3) * lineHeight;
      textareaRef.current.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }
  }, [activeBugLine]);

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/90 shadow-xl overflow-hidden backdrop-blur-md">
      {/* Top Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 bg-slate-900/95 px-4 py-3 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Language Selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Language:
            </span>
            <select
              id="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              className="rounded-lg border border-slate-700/80 bg-slate-800/90 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-100 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="python">🐍 Python (.py)</option>
              <option value="javascript">📜 JavaScript (.js)</option>
              <option value="java">☕ Java (.java)</option>
              <option value="c">⚡ C (.c)</option>
              <option value="cpp">⚙️ C++ (.cpp)</option>
              <option value="html">🌐 HTML (.html)</option>
            </select>
          </div>

          {/* Preset Sample Selector */}
          <div className="flex items-center space-x-1.5">
            <select
              id="sample-code-select"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  loadSample(e.target.value);
                  e.target.value = '';
                }
              }}
              className="rounded-lg border border-slate-700/80 bg-slate-800/90 px-3 py-1.5 text-xs text-slate-200 shadow-sm focus:border-cyan-500 focus:outline-none"
            >
              <option value="" disabled>Load Buggy / Clean Example...</option>
              <optgroup label="Python Samples">
                <option value="py-syntax">Python: Syntax & Indentation</option>
                <option value="py-logic">Python: Mutable Default & is</option>
                <option value="py-runtime">Python: Division by Zero & Except</option>
                <option value="py-security">Python: SQL Injection & Command Exec</option>
                <option value="py-clean">Python: Clean Code (0 Bugs)</option>
              </optgroup>
              <optgroup label="JavaScript Samples">
                <option value="js-syntax">JavaScript: Unmatched Delimiters</option>
                <option value="js-logic">JavaScript: NaN & Assignment in if</option>
                <option value="js-runtime">JavaScript: Loop Bounds & Promises</option>
                <option value="js-security">JavaScript: eval() & DOM XSS</option>
                <option value="js-clean">JavaScript: Clean Code (0 Bugs)</option>
              </optgroup>
              <optgroup label="Java Samples">
                <option value="java-syntax">Java: Missing Semicolons</option>
                <option value="java-logic">Java: String Equality & Bounds</option>
                <option value="java-security">Java: SQLi & Runtime.exec</option>
                <option value="java-clean">Java: Clean Class (0 Bugs)</option>
              </optgroup>
              <optgroup label="C / C++ Samples">
                <option value="c-security">C: Dangerous gets() & Format String</option>
                <option value="c-runtime">C: NULL Deref & Use-After-Free</option>
                <option value="c-clean">C: Clean Memory-Safe C</option>
                <option value="cpp-runtime">C++: delete[] Mismatch & Catch Slicing</option>
                <option value="cpp-clean">C++: Clean Modern C++ RAII</option>
              </optgroup>
              <optgroup label="HTML Samples">
                <option value="html-syntax">HTML: Unclosed Tags & Deprecated</option>
                <option value="html-clean">HTML: Clean HTML5 Document</option>
              </optgroup>
            </select>
          </div>

          {/* Explanation Language Selector */}
          {onExplanationLanguageChange && (
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Explain In:
              </span>
              <select
                id="explanation-language-select"
                value={explanationLanguage}
                onChange={(e) => onExplanationLanguageChange(e.target.value as ExplanationLanguage)}
                className="rounded-lg border border-cyan-500/40 bg-slate-800/90 px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-cyan-300 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                title="Select language for full bug explanation and audio narration"
              >
                {EXPLANATION_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-100">
                    {lang.flag} {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1.5">
          {/* File Upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".py,.js,.jsx,.java,.c,.h,.cpp,.hpp,.html,.htm,.txt"
            className="hidden"
          />
          <button
            id="btn-upload-code"
            onClick={() => fileInputRef.current?.click()}
            title="Upload Code File (Drag & Drop supported)"
            className="flex items-center space-x-1 rounded-lg border border-slate-700/80 bg-slate-800/90 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700/90 hover:text-white transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </button>

          {/* Copy Code */}
          <button
            id="btn-copy-code"
            onClick={handleCopy}
            title="Copy source code"
            className="flex items-center space-x-1 rounded-lg border border-slate-700/80 bg-slate-800/90 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700/90 hover:text-white transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-cyan-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Clear Code */}
          <button
            id="btn-clear-code"
            onClick={() => setCode('')}
            title="Clear editor"
            className="flex items-center space-x-1 rounded-lg border border-slate-700/80 bg-slate-800/90 px-2.5 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-950/40 hover:border-rose-800/60 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>

          {/* Project Index Button */}
          {onOpenProjectAnalyzer && (
            <button
              id="btn-project-analyzer"
              onClick={onOpenProjectAnalyzer}
              title="Open Multi-File Project Indexer & Call Graph"
              className="flex items-center space-x-1 rounded-lg border border-slate-700/80 bg-slate-800/90 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700/90 hover:text-cyan-300 transition-colors"
            >
              <FileCode2 className="h-3.5 w-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Project Index</span>
            </button>
          )}

          {/* Real Compiler Sandbox Execution (RUN) Button */}
          {onRunCode && (
            <button
              id="btn-run-code"
              onClick={onRunCode}
              disabled={isRunning || !code.trim()}
              title="Compile and Run in Safe Sandbox (gcc / g++ / python3 / node / javac)"
              className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-slate-950 shadow-md shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-950" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-slate-950 text-slate-950" />
                  <span>RUN</span>
                </>
              )}
            </button>
          )}

          {/* Run Analysis Button */}
          <button
            id="btn-analyze-code"
            onClick={onAnalyze}
            disabled={isAnalyzing || !code.trim()}
            className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 px-4 py-1.5 text-xs sm:text-sm font-bold text-slate-950 shadow-md shadow-cyan-500/25 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-slate-950" />
                <span>Analyze Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Main Canvas with Line Numbers & Bug Markers */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`relative flex min-h-[380px] max-h-[580px] font-mono text-sm bg-slate-950 text-slate-100 transition-colors ${
          isDragOver ? 'ring-2 ring-cyan-500 bg-slate-900' : ''
        }`}
      >
        {/* Line Numbers & Error Markers */}
        <div 
          ref={lineNumbersRef}
          className="select-none flex flex-col py-4 pl-3 pr-2 text-right text-xs text-slate-500 bg-slate-900/90 border-r border-slate-800/80 min-w-[54px] overflow-hidden"
        >
          {Array.from({ length: lineCount }).map((_, i) => {
            const lineNum = i + 1;
            const lineBugs = bugsByLine.get(lineNum) || [];
            const hasCritical = lineBugs.some(b => b.severity === 'Critical');
            const hasHigh = lineBugs.some(b => b.severity === 'High');
            const hasMedium = lineBugs.some(b => b.severity === 'Medium');
            const hasLow = lineBugs.some(b => b.severity === 'Low');
            const isTargetLine = activeBugLine === lineNum;

            return (
              <div 
                key={lineNum} 
                onClick={() => {
                  if (lineBugs.length > 0 && onSelectBugByLine) {
                    onSelectBugByLine(lineNum);
                  }
                }}
                className={`flex items-center justify-between h-6 leading-6 px-1 rounded cursor-pointer transition-colors ${
                  isTargetLine 
                    ? 'bg-amber-500/20 text-amber-300 font-bold' 
                    : lineBugs.length > 0
                    ? 'hover:bg-slate-800'
                    : ''
                }`}
                title={lineBugs.length > 0 ? `${lineBugs.length} issue(s) on line ${lineNum}: ${lineBugs[0].title}` : undefined}
              >
                {/* Marker icon */}
                <span className="w-3 text-center">
                  {hasCritical ? (
                    <span className="inline-block h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  ) : hasHigh ? (
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                  ) : hasMedium ? (
                    <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
                  ) : hasLow ? (
                    <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />
                  ) : isTargetLine ? (
                    <span className="text-amber-400 text-[10px]">▶</span>
                  ) : null}
                </span>
                <span className={isTargetLine ? 'text-amber-400 font-bold' : ''}>
                  {lineNum}
                </span>
              </div>
            );
          })}
        </div>

        {/* Textarea Code Input */}
        <textarea
          id="code-editor-textarea"
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onScroll={handleScroll}
          spellCheck={false}
          placeholder={`// Paste or write ${language.toUpperCase()} code here...\n// Or click "Load Buggy Example" to test detection capabilities.`}
          className="flex-1 w-full bg-transparent p-4 font-mono text-sm leading-6 text-slate-100 placeholder-slate-600 focus:outline-none resize-none overflow-y-auto"
        />

        {/* Drag & Drop Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm text-white">
            <Upload className="h-10 w-10 animate-bounce text-cyan-400 mb-2" />
            <p className="font-semibold text-base">Drop your code file here to load</p>
          </div>
        )}
      </div>

      {/* Real-Time Pipeline Progress Indicator */}
      {isAnalyzing && (
        <div className="border-t border-slate-800 bg-slate-900/90 px-4 py-3 text-xs text-slate-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-cyan-400 animate-spin" />
              <span className="font-semibold text-slate-200">
                Running Multi-Layer Code Analysis Pipeline...
              </span>
            </div>
            <span className="text-slate-400 animate-pulse">Processing...</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="flex items-center space-x-1.5 text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              <span>1. Syntax & AST</span>
            </div>
            <div className="flex items-center space-x-1.5 text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              <span>2. Static Rules</span>
            </div>
            <div className="flex items-center space-x-1.5 text-cyan-400 animate-pulse">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>3. AI Reasoning</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              <span>4. Final Report</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
