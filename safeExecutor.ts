import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ExecutionLimits, ExecutionResult } from './sandboxTypes';

export const DEFAULT_LIMITS: ExecutionLimits = {
  timeoutMs: 5000,
  memoryLimitMb: 256,
  maxOutputBytes: 64 * 1024, // 64 KB
  maxProcesses: 5,
};

// Sensitive environment variable names that must NEVER be leaked to user code
const RESTRICTED_ENV_VARS = [
  'GEMINI_API_KEY',
  'API_KEY',
  'SECRET',
  'PASSWORD',
  'TOKEN',
  'PRIVATE_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'GCP_SERVICE_ACCOUNT',
  'DATABASE_URL',
  'SESSION_SECRET',
  'JWT_SECRET',
];

/**
 * Clean environment variables for sandbox execution
 */
export function getSanitizedEnv(): NodeJS.ProcessEnv {
  const safeEnv: NodeJS.ProcessEnv = {
    PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
    LANG: 'C.UTF-8',
    LC_ALL: 'C.UTF-8',
    HOME: '/tmp',
    TMPDIR: '/tmp',
    NODE_ENV: 'sandbox',
    PYTHONUNBUFFERED: '1',
    PYTHONDONTWRITEBYTECODE: '1',
  };

  // Strip any env vars that might contain secrets
  for (const [key, value] of Object.entries(process.env)) {
    const isRestricted = RESTRICTED_ENV_VARS.some((restricted) =>
      key.toUpperCase().includes(restricted)
    );
    if (!isRestricted && !safeEnv[key] && value !== undefined) {
      safeEnv[key] = value;
    }
  }

  return safeEnv;
}

/**
 * Execute a command safely in an isolated directory with resource limits
 */
export async function runCommandInSandbox(
  executable: string,
  args: string[],
  options: {
    cwd: string;
    stdin?: string;
    limits?: Partial<ExecutionLimits>;
  }
): Promise<{
  exitCode: number | null;
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  timedOut: boolean;
}> {
  const limits: ExecutionLimits = { ...DEFAULT_LIMITS, ...options.limits };
  const startTime = Date.now();

  return new Promise((resolve) => {
    let stdoutData = '';
    let stderrData = '';
    let timedOut = false;
    let killed = false;

    // Spawn process directly with arguments array - NO SHELL
    const proc = spawn(executable, args, {
      cwd: options.cwd,
      env: getSanitizedEnv(),
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
    });

    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      killed = true;
      try {
        proc.kill('SIGKILL');
      } catch {
        // ignore
      }
    }, limits.timeoutMs);

    // Pipe stdin if provided
    if (options.stdin && proc.stdin) {
      try {
        proc.stdin.write(options.stdin);
        proc.stdin.end();
      } catch {
        // ignore
      }
    } else if (proc.stdin) {
      try {
        proc.stdin.end();
      } catch {
        // ignore
      }
    }

    if (proc.stdout) {
      proc.stdout.on('data', (chunk) => {
        if (stdoutData.length < limits.maxOutputBytes) {
          stdoutData += chunk.toString('utf-8');
          if (stdoutData.length > limits.maxOutputBytes) {
            stdoutData = stdoutData.slice(0, limits.maxOutputBytes) + '\n[Output truncated: Limit reached]';
          }
        }
      });
    }

    if (proc.stderr) {
      proc.stderr.on('data', (chunk) => {
        if (stderrData.length < limits.maxOutputBytes) {
          stderrData += chunk.toString('utf-8');
          if (stderrData.length > limits.maxOutputBytes) {
            stderrData = stderrData.slice(0, limits.maxOutputBytes) + '\n[Output truncated: Limit reached]';
          }
        }
      });
    }

    proc.on('error', (err) => {
      clearTimeout(timeoutTimer);
      resolve({
        exitCode: -1,
        stdout: stdoutData,
        stderr: stderrData ? `${stderrData}\nProcess error: ${err.message}` : `Process error: ${err.message}`,
        executionTimeMs: Date.now() - startTime,
        timedOut,
      });
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutTimer);
      resolve({
        exitCode: code,
        stdout: stdoutData,
        stderr: stderrData,
        executionTimeMs: Date.now() - startTime,
        timedOut,
      });
    });
  });
}

/**
 * Create a temporary isolated workspace for a compilation or execution session
 */
export async function withSandbox<T>(
  prefix: string,
  fn: (sandboxDir: string) => Promise<T>
): Promise<T> {
  const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), `sandbox_${prefix}_`));
  try {
    return await fn(sandboxDir);
  } finally {
    try {
      fs.rmSync(sandboxDir, { recursive: true, force: true });
    } catch (err) {
      console.warn(`[Sandbox] Failed to clean up ${sandboxDir}:`, err);
    }
  }
}
