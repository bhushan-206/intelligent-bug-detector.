import * as fs from 'fs';
import * as path from 'path';
import { ExecutionResult } from '../sandbox/sandboxTypes';
import { withSandbox, runCommandInSandbox } from '../sandbox/safeExecutor';
import { parseJavaDiagnostics } from './diagnosticParser';
import { detectSystemTools } from '../toolDetection/toolDetector';
import { CompilerOptions } from './cCompiler';

/**
 * Extract public class name or default to Main
 */
function extractJavaClassName(sourceCode: string): string {
  const match = sourceCode.match(/public\s+class\s+([A-Za-z0-9_$]+)/);
  if (match && match[1]) {
    return match[1];
  }
  const classMatch = sourceCode.match(/class\s+([A-Za-z0-9_$]+)/);
  return classMatch && classMatch[1] ? classMatch[1] : 'Main';
}

export async function compileAndRunJava(
  sourceCode: string,
  options: CompilerOptions = {}
): Promise<ExecutionResult> {
  const tools = detectSystemTools(true);
  if (!tools.tools.javac.available) {
    return {
      success: false,
      status: 'TOOL_UNAVAILABLE',
      exitCode: null,
      stdout: '',
      stderr: 'Java Compiler (javac) is not available in the host environment.',
      diagnostics: [],
      executionTimeMs: 0,
      timedOut: false,
      resourceLimitReached: false,
      toolUsed: 'javac',
      toolAvailable: false,
    };
  }

  const className = extractJavaClassName(sourceCode);
  return withSandbox('java', async (sandboxDir) => {
    const srcFile = path.join(sandboxDir, `${className}.java`);
    fs.writeFileSync(srcFile, sourceCode, 'utf-8');

    // 1. Compile with javac
    const compileStartTime = Date.now();
    const compileRes = await runCommandInSandbox('javac', [`${className}.java`], {
      cwd: sandboxDir,
      limits: { timeoutMs: 12000, maxOutputBytes: 64 * 1024, memoryLimitMb: 384, maxProcesses: 5 },
    });

    const diagnostics = parseJavaDiagnostics(compileRes.stderr || compileRes.stdout);
    const compileTime = Date.now() - compileStartTime;

    const classFile = path.join(sandboxDir, `${className}.class`);
    if (compileRes.exitCode !== 0 || !fs.existsSync(classFile)) {
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
        toolUsed: 'javac',
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
        compilationOutput: compileRes.stderr || 'Java compilation successful.',
        diagnostics,
        executionTimeMs: compileTime,
        timedOut: false,
        resourceLimitReached: false,
        toolUsed: 'javac',
        toolAvailable: true,
      };
    }

    // 2. Run with java JVM
    const execRes = await runCommandInSandbox('java', ['-Xmx128m', className], {
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
      compilationOutput: compileRes.stderr || 'Java compilation successful.',
      diagnostics,
      executionTimeMs: compileTime + execRes.executionTimeMs,
      timedOut: execRes.timedOut,
      resourceLimitReached: execRes.timedOut,
      toolUsed: 'javac',
      toolAvailable: true,
    };
  });
}
