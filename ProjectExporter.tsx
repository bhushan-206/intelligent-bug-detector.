import React, { useState } from 'react';
import { 
  Download, 
  FileArchive, 
  FileText, 
  BookOpen, 
  Check, 
  Sparkles, 
  Copy,
  Terminal,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import JSZip from 'jszip';
import { AnalysisResult, SupportedLanguage } from '../types';

interface ProjectExporterProps {
  currentResult?: AnalysisResult | null;
  currentCode?: string;
  currentLanguage?: SupportedLanguage;
}

export const ProjectExporter: React.FC<ProjectExporterProps> = ({
  currentResult,
  currentCode = '',
  currentLanguage = 'javascript',
}) => {
  const [isZipping, setIsZipping] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);

  const generateMarkdownReport = (): string => {
    if (!currentResult) {
      return '# Intelligent Bug Detector Analysis Report\n\nNo analysis results loaded yet.';
    }

    const { summary, bugs, fixedCode } = currentResult;
    let md = `# 🛡️ Intelligent Bug Detector — Comprehensive Analysis Report\n\n`;
    md += `**Date:** ${new Date(summary.analyzedAt).toLocaleString()}\n`;
    md += `**Language:** ${summary.language.toUpperCase()}\n`;
    md += `**Engine:** ${summary.engineUsed}\n`;
    md += `**Lines of Code:** ${summary.linesOfCode}\n`;
    md += `**Code Health Score:** ${summary.healthScore} / 100\n\n`;

    md += `## 📊 Executive Summary\n\n`;
    md += `- **Total Issues:** ${summary.totalIssues}\n`;
    md += `- **🔴 Critical:** ${summary.critical}\n`;
    md += `- **🟠 High:** ${summary.high}\n`;
    md += `- **🟡 Medium:** ${summary.medium}\n`;
    md += `- **🔵 Low / Info:** ${summary.low + summary.info}\n`;
    md += `- **Syntax Errors:** ${summary.syntaxErrors}\n`;
    md += `- **Logic Errors:** ${summary.logicErrors}\n`;
    md += `- **Security Vulnerabilities:** ${summary.securityIssues}\n`;
    md += `- **Runtime Risks:** ${summary.runtimeRisks}\n\n`;

    md += `## 🔍 Detected Defects & Vulnerabilities\n\n`;
    if (bugs.length === 0) {
      md += `*Zero bugs detected. The source code passed all static and semantic verification rules.*\n\n`;
    } else {
      bugs.forEach((bug, index) => {
        md += `### ${index + 1}. [${bug.id}] ${bug.title}\n`;
        md += `- **Location:** Line ${bug.line}${bug.column ? `, Col ${bug.column}` : ''}\n`;
        md += `- **Category:** ${bug.type} | **Severity:** ${bug.severity} | **Certainty:** ${bug.certainty}\n`;
        md += `- **Detection Source:** ${bug.source} (Confidence: ${Math.round(bug.confidence * 100)}%)\n`;
        if (bug.cwe) md += `- **Security Identifier:** ${bug.cwe}\n`;
        md += `\n**Message:**\n>${bug.message}\n\n`;
        md += `**In-Depth Explanation:**\n${bug.explanation}\n\n`;
        md += `**Why This is a Problem:**\n${bug.whyProblem}\n\n`;
        md += `**Suggested Fix:**\n${bug.suggestedFix}\n\n`;
        if (bug.codeSnippet) {
          md += `\`\`\`${summary.language}\n${bug.codeSnippet}\n\`\`\`\n\n`;
        }
        md += `---\n\n`;
      });
    }

    if (fixedCode) {
      md += `## 💡 Complete Corrected Code\n\n`;
      md += `\`\`\`${summary.language}\n${fixedCode}\n\`\`\`\n\n`;
    }

    return md;
  };

  const handleDownloadReportMd = () => {
    const md = generateMarkdownReport();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bug_analysis_report_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyReportMd = async () => {
    const md = generateMarkdownReport();
    await navigator.clipboard.writeText(md);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleDownloadProjectZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();

      // README file content
      const readmeContent = `# Intelligent Bug Detector

An advanced multi-language intelligent code analysis, defect detection, and remediation system.

## 🚀 Supported Programming Languages
1. **Python** (.py)
2. **JavaScript** (.js, .jsx, .mjs)
3. **Java** (.java)
4. **C** (.c, .h)
5. **C++** (.cpp, .cc, .hpp)
6. **HTML** (.html, .htm)

## 🛠️ Architecture & Multi-Layer Pipeline
The analysis pipeline operates across distinct validation stages:
\`\`\`
User Source Code
       ↓
Language Normalization & Preprocessing
       ↓
Bracket / Delimiter & Syntax AST Analysis
       ↓
Language-Specific Static Rules Engine
       ↓
Semantic & Type Safety Verification
       ↓
Runtime & Memory Risk Scanner (Buffer overflows, Leaks, Null pointers)
       ↓
Security & Vulnerability Analysis (SQLi, XSS, Command Injection, CWEs)
       ↓
Gemini AI Reasoning Layer (Server-Side)
       ↓
Unified Bug Normalization, Confidence Scoring & Health Report
\`\`\`

## 📋 System Requirements
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm** or **bun** or **yarn**

## ⚙️ Local Setup Instructions
1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
2. Configure Environment Variables:
   Copy \`.env.example\` to \`.env\` and add your Google Gemini API key:
   \`\`\`env
   GEMINI_API_KEY="your-gemini-api-key"
   \`\`\`
3. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`
4. Open \`http://localhost:3000\` in your web browser.

## 🏗️ Build & Production Deployment
\`\`\`bash
npm run build
npm start
\`\`\`
`;

      zip.file('README.md', readmeContent);
      zip.file('.env.example', 'GEMINI_API_KEY=\nAPP_URL=\n');
      
      // Include current report if present
      if (currentResult) {
        zip.file('reports/latest_analysis.md', generateMarkdownReport());
        zip.file('reports/latest_analysis.json', JSON.stringify(currentResult, null, 2));
      }

      // Generate zip blob
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `intelligent_bug_detector_project_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create zip', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-xl backdrop-blur-md transition-colors space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div className="flex items-center space-x-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Project ZIP & Report Exporter
            </h3>
            <p className="text-xs text-slate-400">
              Download the complete codebase package, full README, or analysis report.
            </p>
          </div>
        </div>

        {/* Quick Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-download-project-zip"
            onClick={handleDownloadProjectZip}
            disabled={isZipping}
            className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 px-4 py-2 text-xs sm:text-sm font-bold text-slate-950 shadow-md shadow-cyan-500/25 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 transition-all"
          >
            <FileArchive className="h-4 w-4" />
            <span>{isZipping ? 'Packaging ZIP...' : 'Download Project ZIP'}</span>
          </button>
        </div>
      </div>

      {/* Export Options Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Markdown Report Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <FileText className="h-4 w-4 text-cyan-400" />
            <span>Analysis Report Export</span>
          </div>
          <p className="text-xs text-slate-400">
            Export the complete Markdown vulnerability audit report with line-by-line breakdowns and remediation instructions.
          </p>
          <div className="flex items-center space-x-2 pt-1">
            <button
              onClick={handleDownloadReportMd}
              className="flex items-center space-x-1.5 rounded-lg border border-slate-700/80 bg-slate-800/90 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700/90 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Report (.md)</span>
            </button>
            <button
              onClick={handleCopyReportMd}
              className="flex items-center space-x-1.5 rounded-lg border border-slate-700/80 bg-slate-800/90 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700/90 transition-colors"
            >
              {copiedMd ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-300" />}
              <span>{copiedMd ? 'Copied!' : 'Copy Markdown'}</span>
            </button>
          </div>
        </div>

        {/* Local Deployment & Run Instructions */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span>Local Run Quickstart</span>
          </div>
          <div className="rounded-lg bg-slate-900 border border-slate-800 p-3 font-mono text-[11px] text-slate-200 space-y-1">
            <div className="text-slate-500"># 1. Install dependencies</div>
            <div className="text-emerald-400">npm install</div>
            <div className="text-slate-500"># 2. Run local server (Port 3000)</div>
            <div className="text-cyan-400">npm run dev</div>
          </div>
        </div>
      </div>

      {/* Built-in README & Architecture Documentation */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
        <div className="flex items-center space-x-2 text-white font-bold text-sm">
          <BookOpen className="h-4 w-4 text-cyan-400" />
          <span>Intelligent Bug Detector — Technical Reference & Architecture</span>
        </div>

        <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
          <p>
            The <strong className="text-white">Intelligent Bug Detector</strong> integrates deterministic static code analysis, abstract syntax tree (AST) delimiter tracking, and server-side <strong className="text-cyan-300">Google Gemini AI</strong> reasoning into a unified multi-layer code analysis engine.
          </p>

          <h5 className="font-bold text-slate-100">Supported Languages & Detection Capabilities:</h5>
          <ul className="list-disc list-inside space-y-1 pl-1 text-slate-400">
            <li><strong className="text-slate-200">Python:</strong> SyntaxError, missing colons, mixed tabs/spaces, mutable default arguments, 'is' vs '==' comparison, division by zero, bare except, arbitrary eval/exec execution, command injection (os.system), SQL injection via f-strings, range(len() + 1) off-by-one.</li>
            <li><strong className="text-slate-200">JavaScript:</strong> Unmatched delimiters, assignment in conditional if (x = 5), NaN === NaN comparisons, loose equality type coercion, loop bounds off-by-one, eval() execution, DOM XSS via innerHTML, unhandled promise rejections, hardcoded API secrets.</li>
            <li><strong className="text-slate-200">HTML:</strong> Unclosed tags, deprecated/obsolete HTML elements, missing accessibility alt attributes, invalid nested structure.</li>
            <li><strong className="text-slate-200">Java:</strong> Missing semicolons, String == reference equality, integer division by zero, ArrayIndexOutOfBoundsException in loop boundaries, SQL injection in JDBC Statement, command execution (Runtime.getRuntime().exec), unclosed stream resource leaks.</li>
            <li><strong className="text-slate-200">C:</strong> Missing semicolons, banned gets() function (CWE-242), unbounded string operations (strcpy/sprintf), format string vulnerabilities (CWE-134), NULL pointer dereferences, heap memory leaks (malloc without free), use-after-free (CWE-416).</li>
            <li><strong className="text-slate-200">C++:</strong> Array delete[] vs scalar delete mismatches (CWE-762), polymorphic exception slicing (catch by value), raw pointer lifecycle vs modern RAII smart pointers (std::unique_ptr).</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
