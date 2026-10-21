import * as fs from 'fs';
import * as path from 'path';
import { ExecutionResult } from '../sandbox/sandboxTypes';
import { withSandbox, runCommandInSandbox } from '../sandbox/safeExecutor';
import { parseNodeDiagnostics } from './diagnosticParser';
import { detectSystemTools } from '../toolDetection/toolDetector';
import { CompilerOptions } from './cCompiler';

export async function compileAndRunNode(
  sourceCode: string,
  options: CompilerOptions = {}
): Promise<ExecutionResult> {
  const tools = detectSystemTools();
  if (!tools.tools.node.available) {
    return {
      success: false,
      status: 'TOOL_UNAVAILABLE',
      exitCode: null,
      stdout: '',
      stderr: 'Node.js runtime is not available in the host environment.',
      diagnostics: [],
      executionTimeMs: 0,
      timedOut: false,
      resourceLimitReached: false,
      toolUsed: 'node',
      toolAvailable: false,
    };
  }

  return withSandbox('js', async (sandboxDir) => {
    const srcFile = path.join(sandboxDir, 'script.js');
    fs.writeFileSync(srcFile, sourceCode, 'utf-8');

    // 1. Syntax check using node --check
    const compileStartTime = Date.now();
    const compileRes = await runCommandInSandbox('node', ['--check', 'script.js'], {
      cwd: sandboxDir,
      limits: { timeoutMs: 5000, maxOutputBytes: 32 * 1024, memoryLimitMb: 128, maxProcesses: 3 },
    });

    const diagnostics = parseNodeDiagnostics(compileRes.stderr || compileRes.stdout);
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
        toolUsed: 'node',
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
        compilationOutput: 'JavaScript syntax validation passed.',
        diagnostics,
        executionTimeMs: compileTime,
        timedOut: false,
        resourceLimitReached: false,
        toolUsed: 'node',
        toolAvailable: true,
      };
    }

    // 2. Run script in isolated sandbox
    const execRes = await runCommandInSandbox('node', ['script.js'], {
      cwd: sandboxDir,
      stdin: options.stdin,
      limits: options.limits,
    });

    const runtimeDiagnostics = execRes.exitCode !== 0 ? parseNodeDiagnostics(execRes.stderr) : [];

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
      compilationOutput: 'JavaScript syntax validation passed.',
      diagnostics: diagnostics.length > 0 ? diagnostics : runtimeDiagnostics,
      executionTimeMs: compileTime + execRes.executionTimeMs,
      timedOut: execRes.timedOut,
      resourceLimitReached: execRes.timedOut,
      toolUsed: 'node',
      toolAvailable: true,
    };
  });
}
