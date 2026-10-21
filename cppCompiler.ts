import * as fs from 'fs';
import * as path from 'path';
import { ExecutionResult } from '../sandbox/sandboxTypes';
import { withSandbox, runCommandInSandbox } from '../sandbox/safeExecutor';
import { parseGccDiagnostics } from './diagnosticParser';
import { detectSystemTools } from '../toolDetection/toolDetector';
import { CompilerOptions } from './cCompiler';

export async function compileAndRunCpp(
  sourceCode: string,
  options: CompilerOptions = {}
): Promise<ExecutionResult> {
  const tools = detectSystemTools();
  if (!tools.tools.gpp.available) {
    return {
      success: false,
      status: 'TOOL_UNAVAILABLE',
      exitCode: null,
      stdout: '',
      stderr: 'G++ C++ Compiler is not available in the host environment.',
      diagnostics: [],
      executionTimeMs: 0,
      timedOut: false,
      resourceLimitReached: false,
      toolUsed: 'g++',
      toolAvailable: false,
    };
  }

  return withSandbox('cpp', async (sandboxDir) => {
    const srcFile = path.join(sandboxDir, 'main.cpp');
    const outFile = path.join(sandboxDir, 'program.out');
    fs.writeFileSync(srcFile, sourceCode, 'utf-8');

    // 1. Compile with G++ (-std=c++17 -Wall -Wextra)
    const compileStartTime = Date.now();
    const compileRes = await runCommandInSandbox(
      'g++',
      ['-std=c++17', '-Wall', '-Wextra', 'main.cpp', '-o', 'program.out', ...(options.extraFlags || [])],
      {
        cwd: sandboxDir,
        limits: { timeoutMs: 12000, maxOutputBytes: 64 * 1024, memoryLimitMb: 384, maxProcesses: 5 },
      }
    );

    const diagnostics = parseGccDiagnostics(compileRes.stderr || compileRes.stdout);
    const compileTime = Date.now() - compileStartTime;

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
        toolUsed: 'g++',
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
        compilationOutput: compileRes.stderr || 'C++ compilation successful.',
        diagnostics,
        executionTimeMs: compileTime,
        timedOut: false,
        resourceLimitReached: false,
        toolUsed: 'g++',
        toolAvailable: true,
      };
    }

    // 2. Execute binary
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
      compilationOutput: compileRes.stderr || 'C++ compilation successful.',
      diagnostics,
      executionTimeMs: compileTime + execRes.executionTimeMs,
      timedOut: execRes.timedOut,
      resourceLimitReached: execRes.timedOut,
      toolUsed: 'g++',
      toolAvailable: true,
    };
  });
}
