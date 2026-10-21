import { CompilerDiagnostic } from '../sandbox/sandboxTypes';

/**
 * Parse standard GCC, G++, and Clang compiler output into structured diagnostics
 * Example: main.c:5:14: error: expected ';' before 'return'
 */
export function parseGccDiagnostics(output: string): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  const lines = output.split('\n');

  // Regex matching filename:line:column: severity: message
  const gccRegex = /^([^:\n]+):(\d+):(?:(\d+):)?\s*(error|warning|fatal error|note):\s*(.+)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(gccRegex);
    if (match) {
      const severityStr = match[4].toLowerCase();
      let severity: CompilerDiagnostic['severity'] = 'error';
      if (severityStr.includes('warning')) severity = 'warning';
      else if (severityStr.includes('note')) severity = 'note';
      else if (severityStr.includes('error')) severity = 'error';

      // Lookahead for code snippet caret line if present
      let codeSnippet: string | undefined = undefined;
      if (i + 1 < lines.length && lines[i + 1].trim().length > 0 && !lines[i + 1].match(gccRegex)) {
        codeSnippet = lines[i + 1];
        if (i + 2 < lines.length && lines[i + 2].includes('^')) {
          codeSnippet += '\n' + lines[i + 2];
        }
      }

      diagnostics.push({
        file: match[1],
        line: parseInt(match[2], 10),
        column: match[3] ? parseInt(match[3], 10) : undefined,
        severity,
        message: match[5].trim(),
        codeSnippet,
        raw: line,
      });
    }
  }

  return diagnostics;
}

/**
 * Parse Python SyntaxError and Traceback diagnostics
 */
export function parsePythonDiagnostics(output: string): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  const lines = output.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match: File "script.py", line 4
    const fileLineMatch = line.match(/File\s+"([^"]+)",\s+line\s+(\d+)/i);
    if (fileLineMatch) {
      const file = fileLineMatch[1];
      const lineNum = parseInt(fileLineMatch[2], 10);
      let message = 'Python Error';
      let codeSnippet: string | undefined = undefined;

      // Extract next lines for snippet and error name
      if (i + 1 < lines.length && !lines[i + 1].startsWith('  File ')) {
        codeSnippet = lines[i + 1].trim();
      }

      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (/^[a-zA-Z0-9_]+Error:/.test(lines[j].trim())) {
          message = lines[j].trim();
          break;
        }
      }

      diagnostics.push({
        file,
        line: lineNum,
        severity: 'error',
        message,
        codeSnippet,
        raw: line,
      });
    }
  }

  return diagnostics;
}

/**
 * Parse javac compiler error output
 * Example: Main.java:4: error: ';' expected
 */
export function parseJavaDiagnostics(output: string): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  const lines = output.split('\n');
  const javaRegex = /^([^:\n]+):(\d+):\s*(error|warning):\s*(.+)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(javaRegex);
    if (match) {
      let codeSnippet: string | undefined = undefined;
      if (i + 1 < lines.length && !lines[i + 1].match(javaRegex)) {
        codeSnippet = lines[i + 1];
        if (i + 2 < lines.length && lines[i + 2].includes('^')) {
          codeSnippet += '\n' + lines[i + 2];
        }
      }

      diagnostics.push({
        file: match[1],
        line: parseInt(match[2], 10),
        severity: match[3].toLowerCase() === 'warning' ? 'warning' : 'error',
        message: match[4].trim(),
        codeSnippet,
        raw: line,
      });
    }
  }

  return diagnostics;
}

/**
 * Parse Node.js JavaScript syntax and runtime errors
 */
export function parseNodeDiagnostics(output: string): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  const lines = output.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // file.js:4:12 or file.js:4
    const nodeLineMatch = line.match(/^([^:\n]+):(\d+)(?::(\d+))?$/);
    if (nodeLineMatch) {
      const file = nodeLineMatch[1];
      const lineNum = parseInt(nodeLineMatch[2], 10);
      const column = nodeLineMatch[3] ? parseInt(nodeLineMatch[3], 10) : undefined;

      let message = 'JavaScript Error';
      let codeSnippet: string | undefined = undefined;

      if (i + 1 < lines.length) {
        codeSnippet = lines[i + 1];
      }

      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        if (/^[a-zA-Z0-9_]+Error:/.test(lines[j])) {
          message = lines[j];
          break;
        }
      }

      diagnostics.push({
        file,
        line: lineNum,
        column,
        severity: 'error',
        message,
        codeSnippet,
        raw: line,
      });
    }
  }

  return diagnostics;
}
