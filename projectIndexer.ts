export interface ProjectFile {
  name: string;
  path: string;
  content: string;
  language: string;
  lineCount: number;
}

export interface SymbolInfo {
  name: string;
  kind: 'function' | 'class' | 'variable' | 'interface' | 'import' | 'macro';
  line: number;
  column?: number;
  file: string;
  signature?: string;
  parentScope?: string;
}

export interface ProjectDependency {
  fromFile: string;
  toModuleOrFile: string;
  type: 'import' | 'include' | 'require';
  line: number;
}

export interface CallRelationship {
  caller: string;
  callee: string;
  file: string;
  line: number;
}

export interface ProjectIndex {
  files: ProjectFile[];
  totalFiles: number;
  totalLines: number;
  functions: SymbolInfo[];
  classes: SymbolInfo[];
  variables: SymbolInfo[];
  dependencies: ProjectDependency[];
  callGraph: CallRelationship[];
  summary: {
    totalFunctions: number;
    totalClasses: number;
    totalSymbols: number;
    languages: Record<string, number>;
  };
}

/**
 * Index a single source code string or multi-file project into an AST-aware project graph
 */
export function indexProject(
  files: Array<{ name: string; content: string; language?: string }>,
  defaultLanguage = 'python'
): ProjectIndex {
  const projectFiles: ProjectFile[] = [];
  const functions: SymbolInfo[] = [];
  const classes: SymbolInfo[] = [];
  const variables: SymbolInfo[] = [];
  const dependencies: ProjectDependency[] = [];
  const callGraph: CallRelationship[] = [];
  const langCounts: Record<string, number> = {};

  let totalLines = 0;

  for (const f of files) {
    const lines = f.content.split('\n');
    totalLines += lines.length;
    const lang = (f.language || defaultLanguage).toLowerCase();
    langCounts[lang] = (langCounts[lang] || 0) + 1;

    projectFiles.push({
      name: f.name,
      path: f.name,
      content: f.content,
      language: lang,
      lineCount: lines.length,
    });

    // Parse symbols based on language
    parseFileSymbols(f.name, lines, lang, {
      functions,
      classes,
      variables,
      dependencies,
      callGraph,
    });
  }

  return {
    files: projectFiles,
    totalFiles: projectFiles.length,
    totalLines,
    functions,
    classes,
    variables,
    dependencies,
    callGraph,
    summary: {
      totalFunctions: functions.length,
      totalClasses: classes.length,
      totalSymbols: functions.length + classes.length + variables.length,
      languages: langCounts,
    },
  };
}

function parseFileSymbols(
  fileName: string,
  lines: string[],
  language: string,
  out: {
    functions: SymbolInfo[];
    classes: SymbolInfo[];
    variables: SymbolInfo[];
    dependencies: ProjectDependency[];
    callGraph: CallRelationship[];
  }
) {
  let currentClass: string | null = null;
  let currentFunction: string | null = null;

  lines.forEach((lineText, lineIdx) => {
    const lineNum = lineIdx + 1;
    const trimmed = lineText.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
      return;
    }

    // 1. Dependency indexing: #include, import, require
    const cIncludeMatch = trimmed.match(/^#include\s*[<"]([^>"]+)[>"]/);
    if (cIncludeMatch) {
      out.dependencies.push({
        fromFile: fileName,
        toModuleOrFile: cIncludeMatch[1],
        type: 'include',
        line: lineNum,
      });
    }

    const pyImportMatch = trimmed.match(/^(?:from\s+([a-zA-Z0-9_.]+)\s+import|import\s+([a-zA-Z0-9_.]+))/);
    if (pyImportMatch) {
      out.dependencies.push({
        fromFile: fileName,
        toModuleOrFile: pyImportMatch[1] || pyImportMatch[2],
        type: 'import',
        line: lineNum,
      });
    }

    const jsImportMatch = trimmed.match(/^import\s+.*?from\s+['"]([^'"]+)['"]/);
    if (jsImportMatch) {
      out.dependencies.push({
        fromFile: fileName,
        toModuleOrFile: jsImportMatch[1],
        type: 'import',
        line: lineNum,
      });
    }

    // 2. Class declarations
    const classMatch = trimmed.match(/\bclass\s+([A-Za-z0-9_]+)/);
    if (classMatch) {
      currentClass = classMatch[1];
      out.classes.push({
        name: classMatch[1],
        kind: 'class',
        line: lineNum,
        file: fileName,
        signature: trimmed,
      });
    }

    // 3. Function / Method declarations
    let fnName: string | null = null;
    let signature = trimmed;

    // Python def
    const pyDef = trimmed.match(/^def\s+([a-zA-Z0-9_]+)\s*\((.*?)\):/);
    if (pyDef) {
      fnName = pyDef[1];
    }

    // C/C++ or Java methods: e.g. int calculate(int x) or void process()
    const cMethod = trimmed.match(/^(?:[a-zA-Z0-9_*&<>]+\s+)+([a-zA-Z0-9_]+)\s*\(([^;]*)\)\s*(?:const)?\s*\{?$/);
    if (cMethod && !['if', 'while', 'for', 'switch', 'catch'].includes(cMethod[1])) {
      fnName = cMethod[1];
    }

    // JS/TS function foo() or const foo = () =>
    const jsFn = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/);
    const jsArrow = trimmed.match(/^(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/);
    if (jsFn) fnName = jsFn[1];
    else if (jsArrow) fnName = jsArrow[1];

    if (fnName) {
      currentFunction = fnName;
      out.functions.push({
        name: fnName,
        kind: 'function',
        line: lineNum,
        file: fileName,
        signature,
        parentScope: currentClass || undefined,
      });
    }

    // 4. Call graph indexing
    if (currentFunction) {
      const callMatches = trimmed.matchAll(/\b([a-zA-Z0-9_]+)\s*\(/g);
      for (const cm of callMatches) {
        const calledName = cm[1];
        if (
          !['if', 'for', 'while', 'switch', 'catch', 'sizeof', 'typeof', 'printf', 'print', 'console', 'return', currentFunction].includes(
            calledName
          )
        ) {
          out.callGraph.push({
            caller: currentFunction,
            callee: calledName,
            file: fileName,
            line: lineNum,
          });
        }
      }
    }
  });
}
