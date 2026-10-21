import React, { useState } from 'react';
import { 
  FolderTree, 
  FileCode, 
  Layers, 
  Boxes, 
  Network, 
  X, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Search,
  Code2
} from 'lucide-react';
import { ProjectIndex, SupportedLanguage } from '../types';

interface ProjectAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFileAndLine: (fileName: string, line: number) => void;
  onLoadProjectFiles: (files: Array<{ name: string; content: string; language?: string }>) => Promise<void>;
  projectIndex: ProjectIndex | null;
  isLoading: boolean;
}

export const ProjectAnalyzerModal: React.FC<ProjectAnalyzerModalProps> = ({
  isOpen,
  onClose,
  onSelectFileAndLine,
  onLoadProjectFiles,
  projectIndex,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'symbols' | 'dependencies' | 'callgraph'>('overview');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const filesArray: Array<{ name: string; content: string; language?: string }> = [];
    let readCount = 0;
    const total = fileList.length;

    for (let i = 0; i < total; i++) {
      const file = fileList[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          const ext = file.name.split('.').pop()?.toLowerCase();
          let lang = 'python';
          if (ext === 'c' || ext === 'h') lang = 'c';
          else if (ext === 'cpp' || ext === 'hpp' || ext === 'cc') lang = 'cpp';
          else if (ext === 'java') lang = 'java';
          else if (ext === 'js' || ext === 'ts' || ext === 'jsx' || ext === 'tsx') lang = 'javascript';
          else if (ext === 'html') lang = 'html';

          filesArray.push({
            name: file.name,
            content,
            language: lang,
          });
        }
        readCount++;
        if (readCount === total) {
          onLoadProjectFiles(filesArray);
        }
      };
      reader.readAsText(file);
    }
  };

  const filteredFunctions = projectIndex?.functions.filter(
    (fn) => fn.name.toLowerCase().includes(searchTerm.toLowerCase()) || fn.file.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredClasses = projectIndex?.classes.filter(
    (cls) => cls.name.toLowerCase().includes(searchTerm.toLowerCase()) || cls.file.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Project Index &amp; Symbol Graph Analysis</h2>
              <p className="text-xs text-slate-400">
                Multi-file AST indexing: symbols, functions, classes, imports, and call dependencies
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800/80 text-xs font-semibold text-slate-200 hover:text-white transition-colors">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              Upload Folder/Files
              <input
                type="file"
                multiple
                // @ts-ignore
                webkitdirectory=""
                directory=""
                onChange={handleFolderUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-900/50 gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview &amp; Metrics
          </button>
          <button
            onClick={() => setActiveTab('symbols')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'symbols'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            Symbols &amp; Functions ({projectIndex?.functions.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('dependencies')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'dependencies'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Dependencies ({projectIndex?.dependencies.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('callgraph')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'callgraph'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            Call Graph ({projectIndex?.callGraph.length || 0})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="py-12 text-center text-cyan-400 flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <div className="text-sm font-semibold">Indexing multi-file project AST &amp; call dependencies...</div>
            </div>
          ) : !projectIndex ? (
            <div className="py-12 text-center text-slate-400">
              <FolderTree className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <div className="text-sm font-semibold text-slate-200">No Multi-File Project Loaded Yet</div>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Click "Upload Folder/Files" above to parse a directory of source files into an AST symbol graph.
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-xs text-slate-400 uppercase font-semibold">Total Files</div>
                      <div className="text-2xl font-bold text-slate-100 mt-1">{projectIndex.totalFiles}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-xs text-slate-400 uppercase font-semibold">Total Lines of Code</div>
                      <div className="text-2xl font-bold text-cyan-400 mt-1">
                        {projectIndex.totalLines.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-xs text-slate-400 uppercase font-semibold">Functions / Methods</div>
                      <div className="text-2xl font-bold text-indigo-400 mt-1">
                        {projectIndex.summary.totalFunctions}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-xs text-slate-400 uppercase font-semibold">Classes Defined</div>
                      <div className="text-2xl font-bold text-emerald-400 mt-1">{projectIndex.summary.totalClasses}</div>
                    </div>
                  </div>

                  {/* Languages Breakdown */}
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                      Language Distribution
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(projectIndex.summary.languages).map(([lang, count]) => (
                        <span
                          key={lang}
                          className="px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-xs font-semibold text-slate-200"
                        >
                          {lang.toUpperCase()}: <span className="text-cyan-400">{count} file(s)</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Files List */}
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                      Indexed Files ({projectIndex.totalFiles})
                    </h3>
                    <div className="space-y-1.5">
                      {projectIndex.files.map((file, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            onSelectFileAndLine(file.name, 1);
                            onClose();
                          }}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <FileCode className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs font-mono font-medium text-slate-200">{file.name}</span>
                          </div>
                          <span className="text-xs text-slate-400 font-mono">{file.lineCount} lines</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'symbols' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search functions, classes, or symbols..."
                      className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-2">
                    {filteredFunctions.map((fn, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          onSelectFileAndLine(fn.file, fn.line);
                          onClose();
                        }}
                        className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                            <Code2 className="w-3.5 h-3.5" />
                            {fn.name}()
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {fn.file}:{fn.line}
                          </span>
                        </div>
                        {fn.signature && (
                          <div className="text-[11px] text-slate-400 font-mono mt-1 truncate">
                            {fn.signature}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'dependencies' && (
                <div className="space-y-2">
                  {projectIndex.dependencies.length === 0 ? (
                    <div className="text-slate-400 text-xs py-4 text-center">No imports or includes declared.</div>
                  ) : (
                    projectIndex.dependencies.map((dep, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 text-slate-200">
                          <span className="text-cyan-400 font-bold">{dep.fromFile}</span>
                          <span className="text-slate-500">&rarr;</span>
                          <span className="text-emerald-300">{dep.toModuleOrFile}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {dep.type} (line {dep.line})
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'callgraph' && (
                <div className="space-y-2">
                  {projectIndex.callGraph.length === 0 ? (
                    <div className="text-slate-400 text-xs py-4 text-center">No cross-function calls detected.</div>
                  ) : (
                    projectIndex.callGraph.map((cg, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          onSelectFileAndLine(cg.file, cg.line);
                          onClose();
                        }}
                        className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-colors flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-indigo-300 font-bold">{cg.caller}()</span>
                          <span className="text-slate-500">invokes</span>
                          <span className="text-cyan-300 font-bold">{cg.callee}()</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {cg.file}:{cg.line}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
