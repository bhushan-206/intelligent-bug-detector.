import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Play, 
  RefreshCw, 
  Code2, 
  Layers, 
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Tag
} from 'lucide-react';
import { SAMPLE_TEST_CASES } from '../data/testSuites';
import { runStaticAnalysis } from '../analyzers';
import { SampleTestCase, SupportedLanguage } from '../types';

interface TestSuiteRunnerProps {
  onLoadTest: (test: SampleTestCase) => void;
}

export const TestSuiteRunner: React.FC<TestSuiteRunnerProps> = ({ onLoadTest }) => {
  const [selectedLang, setSelectedLang] = useState<string>('all');
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { passed: boolean; bugsFound: number; error?: string }>>({});

  const filteredTests = SAMPLE_TEST_CASES.filter(t => {
    if (selectedLang !== 'all' && t.language !== selectedLang) return false;
    return true;
  });

  const runSingleTest = (test: SampleTestCase) => {
    try {
      const { bugs } = runStaticAnalysis(test.code, test.language);
      const isCleanCase = test.category === 'Clean';
      
      let passed = false;
      if (isCleanCase) {
        // For clean code, passing means 0 bugs found (zero false positives!)
        passed = bugs.length === 0;
      } else {
        // For buggy code, passing means at least 1 bug was detected
        passed = bugs.length > 0;
      }

      setTestResults(prev => ({
        ...prev,
        [test.id]: { passed, bugsFound: bugs.length }
      }));
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [test.id]: { passed: false, bugsFound: 0, error: err.message }
      }));
    }
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    const newResults: Record<string, { passed: boolean; bugsFound: number }> = {};

    for (const test of SAMPLE_TEST_CASES) {
      const { bugs } = runStaticAnalysis(test.code, test.language);
      const isClean = test.category === 'Clean';
      const passed = isClean ? bugs.length === 0 : bugs.length > 0;
      newResults[test.id] = { passed, bugsFound: bugs.length };
    }

    setTestResults(newResults);
    setIsRunningAll(false);
  };

  const totalRun = Object.keys(testResults).length;
  const passedCount = (Object.values(testResults) as Array<{ passed: boolean; bugsFound: number }>).filter(r => r.passed).length;

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-xl backdrop-blur-md transition-colors space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">
              Multi-Language Automated Test Suite ({SAMPLE_TEST_CASES.length} Test Cases)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Demonstrates detection across Syntax, Semantic, Logic, Runtime, Security, and Clean code.
          </p>
        </div>

        <button
          id="btn-run-all-tests"
          onClick={runAllTests}
          disabled={isRunningAll}
          className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 px-4 py-2 text-xs sm:text-sm font-bold text-slate-950 shadow-md shadow-cyan-500/25 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 transition-all transform active:scale-95"
        >
          {isRunningAll ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Executing Tests...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-slate-950" />
              <span>Run All {SAMPLE_TEST_CASES.length} Test Cases</span>
            </>
          )}
        </button>
      </div>

      {/* Test Runner Status Banner */}
      {totalRun > 0 && (
        <div className={`flex items-center justify-between rounded-xl p-4 border ${
          passedCount === totalRun 
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
            : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
        }`}>
          <div className="flex items-center space-x-2 text-xs sm:text-sm font-bold">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span>
              Test Suite Run Complete: {passedCount} / {totalRun} Test Cases Passed Successfully
            </span>
          </div>
          <span className="text-xs font-mono font-bold">
            Accuracy: {Math.round((passedCount / totalRun) * 100)}%
          </span>
        </div>
      )}

      {/* Language Filter */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {['all', 'python', 'javascript', 'java', 'c', 'cpp', 'html'].map((lang) => (
          <button
            key={lang}
            onClick={() => setSelectedLang(lang)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase transition-colors ${
              selectedLang === lang
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/50'
            }`}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Test Cases List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTests.map((test) => {
          const res = testResults[test.id];

          return (
            <div
              key={test.id}
              className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4 hover:bg-slate-800/60 transition-all space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[11px] font-bold uppercase text-cyan-300">
                      {test.language}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold border ${
                      test.category === 'Clean'
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                        : test.category === 'Security'
                        ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                        : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                    }`}>
                      {test.category}
                    </span>
                  </div>

                  {/* Run status badge */}
                  {res && (
                    <div className="flex items-center space-x-1 text-xs font-bold">
                      {res.passed ? (
                        <span className="flex items-center space-x-1 text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Passed ({res.bugsFound} bugs)</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-rose-400">
                          <XCircle className="h-4 w-4" />
                          <span>Failed</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <h4 className="text-sm font-bold text-slate-100 mt-2">
                  {test.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {test.description}
                </p>

                {/* Tags */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {test.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-slate-800/80 border border-slate-700/60 px-1.5 py-0.5 text-[10px] font-mono text-slate-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => runSingleTest(test)}
                  className="flex items-center space-x-1 rounded-lg border border-slate-700/80 bg-slate-800/90 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700/90"
                >
                  <Play className="h-3 w-3" />
                  <span>Test Run</span>
                </button>

                <button
                  onClick={() => onLoadTest(test)}
                  className="flex items-center space-x-1 rounded-lg bg-cyan-500 px-3 py-1 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition-colors shadow-sm"
                >
                  <span>Load in Editor</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
