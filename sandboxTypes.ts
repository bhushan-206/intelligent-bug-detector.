export interface ExecutionLimits {
  timeoutMs: number; // e.g. 5000ms
  memoryLimitMb: number; // e.g. 256MB
  maxOutputBytes: number; // e.g. 65536 bytes
  maxProcesses: number;
}

export interface CompilerDiagnostic {
  file?: string;
  line: number;
  column?: number;
  severity: 'error' | 'warning' | 'note' | 'info';
  message: string;
  codeSnippet?: string;
  raw: string;
}

export type ExecutionStatus =
  | 'SUCCESS'
  | 'COMPILE_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIMEOUT'
  | 'RESOURCE_LIMIT'
  | 'TOOL_UNAVAILABLE';

export interface ExecutionResult {
  success: boolean;
  status: ExecutionStatus;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  compilationOutput?: string;
  diagnostics: CompilerDiagnostic[];
  executionTimeMs: number;
  timedOut: boolean;
  resourceLimitReached: boolean;
  toolUsed: string;
  toolAvailable: boolean;
}
