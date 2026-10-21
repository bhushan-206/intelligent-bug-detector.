import { ExecutionResult } from '../sandbox/sandboxTypes';
import { compileAndRunC, CompilerOptions } from './cCompiler';
import { compileAndRunCpp } from './cppCompiler';
import { compileAndRunPython } from './pythonRunner';
import { compileAndRunNode } from './nodeRunner';
import { compileAndRunJava } from './javaCompiler';
import { validateHtmlStructure } from './htmlValidator';

export async function executeCodeInSandbox(
  language: string,
  code: string,
  options: CompilerOptions = {}
): Promise<ExecutionResult> {
  const normLang = (language || '').toLowerCase().trim();

  switch (normLang) {
    case 'c':
      return await compileAndRunC(code, options);
    case 'cpp':
    case 'c++':
      return await compileAndRunCpp(code, options);
    case 'python':
    case 'py':
      return await compileAndRunPython(code, options);
    case 'javascript':
    case 'js':
    case 'typescript':
    case 'ts':
      return await compileAndRunNode(code, options);
    case 'java':
      return await compileAndRunJava(code, options);
    case 'html':
      return validateHtmlStructure(code);
    default:
      return {
        success: false,
        status: 'TOOL_UNAVAILABLE',
        exitCode: null,
        stdout: '',
        stderr: `Unsupported execution language: "${language}". Supported languages are: c, cpp, python, javascript, java, html.`,
        diagnostics: [],
        executionTimeMs: 0,
        timedOut: false,
        resourceLimitReached: false,
        toolUsed: 'unknown',
        toolAvailable: false,
      };
  }
}

export async function compileCodeOnly(
  language: string,
  code: string,
  options: Omit<CompilerOptions, 'runExecution'> = {}
): Promise<ExecutionResult> {
  return await executeCodeInSandbox(language, code, { ...options, runExecution: false });
}
