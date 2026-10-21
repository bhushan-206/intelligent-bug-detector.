import { spawnSync } from 'child_process';

export interface ToolInfo {
  name: string;
  command: string;
  available: boolean;
  version?: string;
  path?: string;
  category: 'compiler' | 'interpreter' | 'analyzer' | 'parser';
  languages: string[];
}

export interface SystemToolReport {
  timestamp: string;
  tools: Record<string, ToolInfo>;
  supportedLanguages: string[];
  summary: {
    totalTools: number;
    availableCount: number;
    unavailableCount: number;
  };
}

let cachedReport: SystemToolReport | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

function checkTool(
  name: string,
  command: string,
  versionArgs: string[],
  category: ToolInfo['category'],
  languages: string[]
): ToolInfo {
  try {
    const whichRes = spawnSync('which', [command], { encoding: 'utf-8', timeout: 3000 });
    if (whichRes.status !== 0 || !whichRes.stdout.trim()) {
      return {
        name,
        command,
        available: false,
        category,
        languages,
      };
    }

    const toolBinaryPath = whichRes.stdout.trim().split('\n')[0];
    const verRes = spawnSync(command, versionArgs, { encoding: 'utf-8', timeout: 3000 });
    const output = (verRes.stdout || verRes.stderr || '').trim().split('\n')[0];

    return {
      name,
      command,
      available: true,
      path: toolBinaryPath,
      version: output || 'Installed',
      category,
      languages,
    };
  } catch {
    return {
      name,
      command,
      available: false,
      category,
      languages,
    };
  }
}

/**
 * Scan the runtime host environment for installed compilers and tools
 */
export function detectSystemTools(forceRefresh = false): SystemToolReport {
  const now = Date.now();
  if (!forceRefresh && cachedReport && now - lastCheckTime < CACHE_TTL_MS) {
    return cachedReport;
  }

  const tools: Record<string, ToolInfo> = {
    gcc: checkTool('GCC C Compiler', 'gcc', ['--version'], 'compiler', ['c']),
    gpp: checkTool('G++ C++ Compiler', 'g++', ['--version'], 'compiler', ['cpp']),
    clang: checkTool('Clang Compiler', 'clang', ['--version'], 'compiler', ['c', 'cpp']),
    python3: checkTool('Python 3 Interpreter', 'python3', ['--version'], 'interpreter', ['python']),
    node: checkTool('Node.js JavaScript Engine', 'node', ['--version'], 'interpreter', ['javascript']),
    javac: checkTool('Java Compiler (javac)', 'javac', ['-version'], 'compiler', ['java']),
    java: checkTool('Java Runtime (JVM)', 'java', ['-version'], 'interpreter', ['java']),
    htmlParser: {
      name: 'HTML DOM / AST Parser',
      command: 'internal',
      available: true,
      version: 'Built-in AST Engine',
      category: 'parser',
      languages: ['html'],
    },
  };

  const supportedLanguages = ['c', 'cpp', 'python', 'javascript', 'java', 'html'];
  const allToolList = Object.values(tools);
  const availableCount = allToolList.filter((t) => t.available).length;

  cachedReport = {
    timestamp: new Date().toISOString(),
    tools,
    supportedLanguages,
    summary: {
      totalTools: allToolList.length,
      availableCount,
      unavailableCount: allToolList.length - availableCount,
    },
  };

  lastCheckTime = now;
  return cachedReport;
}
