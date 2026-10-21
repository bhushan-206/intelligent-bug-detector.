import * as fs from 'fs';
import * as path from 'path';
import { ExecutionResult, ExecutionLimits } from '../sandbox/sandboxTypes';
import { withSandbox, runCommandInSandbox } from '../sandbox/safeExecutor';
import { parseGccDiagnostics } from './diagnosticParser';
import { detectSystemTools } from '../toolDetection/toolDetector';

export interface CompilerOptions {
  stdin?: string;
  runExecution?: boolean;
  limits?: Partial<ExecutionLimits>;
  extraFlags?: string[];
}

export async function compileAndRunC(
  sourceCode: string,
  options: CompilerOptions = {}
): Promise<ExecutionResult> {
  const tools = detectSystemTools();
  if (!tools.tools.gcc.available) {
    return {
      success: false,
      status: 'TOOL_UNAVAILABLE',
      exitCode: null,
      stdout: '',
      stderr: 'GCC C Compiler is not available in the host environment.',
      diagnostics: [],
      executionTimeMs: 0,
      timedOut: false,
      resourceLimitReached: false,
      toolUsed: 'gcc',
      toolAvailable: false,
    };
  }

  return withSandbox('c', async (sandboxDir) => {
    const srcFile = path.join(sandboxDir, 'main.c');
    const outFile = path.join(sandboxDir, 'program.out');
    fs.writeFileSync(srcFile, sourceCode, 'utf-8');

    // 1. Compile with GCC (-Wall -Wextra -lm)
    const compileStartTime = Date.now();
    const compileRes = await runCommandInSandbox(
      'gcc',
      ['-Wall', '-Wextra', 'main.c', '-o', 'program.out', '-lm', ...(options.extraFlags || [])],
      {
        cwd: sandboxDir,
        limits: { timeoutMs: 10000, maxOutputBytes: 64 * 1024, memoryLimitMb: 256, maxProcesses: 5 },
      }
    );

    const diagnostics = parseGccDiagnostics(compileRes.stderr || compileRes.stdout);
    const compileTime = Date.now() - compileStartTime;

    // Check if compilation failed
    if (compileRes.exitCode !== 0 || !fs.existsSync(outFile)) {
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
        toolUsed: 'gcc',
        toolAvailable: true,
      };
    }

    // If only compiling without running
    if (options.runExecution === false) {
      return {
        success: true,
        status: 'SUCCESS',
        exitCode: 0,
        stdout: compileRes.stdout,
        stderr: compileRes.stderr,
        compilationOutput: compileRes.stderr || 'Compilation successful.',
        diagnostics,
        executionTimeMs: compileTime,
        timedOut: false,
        resourceLimitReached: false,
        toolUsed: 'gcc',
        toolAvailable: true,
      };
    }

    // 2. Execute compiled binary in sandbox with limits and optional stdin
    const execRes = await runCommandInSandbox('./program.out', [], {
      cwd: sandboxDir,
      stdin: options.stdin,
      limits: options.limits,
    });

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
      compilationOutput: compileRes.stderr || 'Compilation successful.',
      diagnostics,
      executionTimeMs: compileTime + execRes.executionTimeMs,
      timedOut: execRes.timedOut,
      resourceLimitReached: execRes.timedOut,
      toolUsed: 'gcc',
      toolAvailable: true,
    };
  });
}
