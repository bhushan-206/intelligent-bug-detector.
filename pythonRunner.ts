import * as fs from 'fs';
import * as path from 'path';
import { ExecutionResult } from '../sandbox/sandboxTypes';
import { withSandbox, runCommandInSandbox } from '../sandbox/safeExecutor';
import { parsePythonDiagnostics } from './diagnosticParser';
import { detectSystemTools } from '../toolDetection/toolDetector';
import { CompilerOptions } from './cCompiler';

export async function compileAndRunPython(
  sourceCode: string,
  options: CompilerOptions = {}
): Promise<ExecutionResult> {
  const tools = detectSystemTools();
  if (!tools.tools.python3.available) {
    return {
      success: false,
      status: 'TOOL_UNAVAILABLE',
      exitCode: null,
      stdout: '',
      stderr: 'Python 3 interpreter is not available in the host environment.',
      diagnostics: [],
      executionTimeMs: 0,
      timedOut: false,
      resourceLimitReached: false,
      toolUsed: 'python3',
      toolAvailable: false,
    };
  }

  return withSandbox('python', async (sandboxDir) => {
    const srcFile = path.join(sandboxDir, 'script.py');
    fs.writeFileSync(srcFile, sourceCode, 'utf-8');

    // 1. Syntax check via py_compile
    const compileStartTime = Date.now();
    const compileRes = await runCommandInSandbox('python3', ['-m', 'py_compile', 'script.py'], {
      cwd: sandboxDir,
      limits: { timeoutMs: 5000, maxOutputBytes: 32 * 1024, memoryLimitMb: 128, maxProcesses: 3 },
    });

    const diagnostics = parsePythonDiagnostics(compileRes.stderr || compileRes.stdout);
    const compileTime = Date.now() - compileStartTime;

    if (compileRes.exitCode !== 0) {
      return {
        success: false,
        status: compileRes.timedOut ? 'TIMEOUT' : 'COMPILE_ERROR',
        exitCode: compileRes.exitCode,
        stdout: compileRes.stdout,
        stderr: compileRes.stderr,
        compilationOutput: compileRes.stderr || compileRes.stdout,
        diagnostics,
        executionTimeMs: compileTime,
        timedOut: compileRes.timedOut,
        resourceLimitReached: false,
        toolUsed: 'python3',
        toolAvailable: true,
      };
    }

    if (options.runExecution === false) {
      return {
        success: true,
        status: 'SUCCESS',
        exitCode: 0,
        stdout: compileRes.stdout,
        stderr: compileRes.stderr,
        compilationOutput: 'Python syntax validation passed.',
        diagnostics,
        executionTimeMs: compileTime,
        timedOut: false,
        resourceLimitReached: false,
        toolUsed: 'python3',
        toolAvailable: true,
      };
    }

    // 2. Run Python script in sandbox
    const execRes = await runCommandInSandbox('python3', ['script.py'], {
      cwd: sandboxDir,
      stdin: options.stdin,
      limits: options.limits,
    });

    const runtimeDiagnostics = execRes.exitCode !== 0 ? parsePythonDiagnostics(execRes.stderr) : [];

    return {
      success: execRes.exitCode === 0,
      status: execRes.timedOut
        ? 'TIMEOUT'
        : execRes.exitCode === 0
        ? 'SUCCESS'
        : 'RUNTIME_ERROR',
      exitCode: execRes.exitCode,
      stdout: execRes.stdout,
      stderr: execRes.stderr,
      compilationOutput: 'Python syntax validation passed.',
      diagnostics: diagnostics.length > 0 ? diagnostics : runtimeDiagnostics,
      executionTimeMs: compileTime + execRes.executionTimeMs,
      timedOut: execRes.timedOut,
      resourceLimitReached: execRes.timedOut,
      toolUsed: 'python3',
      toolAvailable: true,
    };
  });
}
