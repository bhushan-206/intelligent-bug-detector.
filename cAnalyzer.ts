import { DetectedBug } from '../types';
import { checkBracketBalance } from './common';

interface VarState {
  type: string;
  isInitialized: boolean;
  constantValue?: number | string | null;
  lineDeclared: number;
}

export function analyzeCCode(code: string): DetectedBug[] {
  const bugs: DetectedBug[] = [];
  const lines = code.split('\n');

  // 1. Bracket and delimiter balance
  bugs.push(...checkBracketBalance(code));

  // Variable tracking for dataflow analysis (division by zero, uninitialized reads)
  const variables = new Map<string, VarState>();

  // Track if main exists and if it has a return statement
  let hasMain = false;
  let mainLine = 1;
  let mainHasReturn = false;

  // Track standard includes
  const includedHeaders = new Set<string>();
  const includeMatches = code.matchAll(/#include\s*<([^>]+)>/g);
  for (const m of includeMatches) {
    includedHeaders.add(m[1].toLowerCase());
  }

  // Pre-scan pass to register declarations and constant initializers
  lines.forEach((rawLine, index) => {
    const lineNum = index + 1;
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

    if (/\bint\s+main\s*\(/.test(trimmed)) {
      hasMain = true;
      mainLine = lineNum;
    }
    if (hasMain && /\breturn\b/.test(trimmed)) {
      mainHasReturn = true;
    }

    // Check variable declarations: e.g. int y = 0; or float val = 0.0; or int x = 10;
    const declRegex = /\b(int|float|double|long|short|unsigned|size_t)\s+([a-zA-Z_]\w*)\s*(?:=\s*([^;]+))?\s*;/g;
    let match;
    while ((match = declRegex.exec(trimmed)) !== null) {
      const type = match[1];
      const varName = match[2];
      const initValStr = match[3] ? match[3].trim() : undefined;

      let numVal: number | undefined;
      if (initValStr !== undefined) {
        if (/^-?\d+(\.\d+)?f?$/.test(initValStr)) {
          numVal = parseFloat(initValStr);
        }
      }

      variables.set(varName, {
        type,
        isInitialized: initValStr !== undefined,
        constantValue: numVal !== undefined ? numVal : null,
        lineDeclared: lineNum,
      });
    }

    // Check standalone assignments: e.g. y = 0; or y = 0.0;
    const assignMatch = trimmed.match(/^([a-zA-Z_]\w*)\s*=\s*([^;]+)\s*;/);
    if (assignMatch) {
      const varName = assignMatch[1];
      const valStr = assignMatch[2].trim();
      const existing = variables.get(varName);
      if (existing) {
        existing.isInitialized = true;
        if (/^-?\d+(\.\d+)?f?$/.test(valStr)) {
          existing.constantValue = parseFloat(valStr);
        } else {
          existing.constantValue = null;
        }
      }
    }
  });

  // Main line-by-line inspection pass
  lines.forEach((rawLine, index) => {
    const lineNum = index + 1;
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

    // --- 1. Division / Modulo by Zero (Literal or Tracked Variable) ---
    // A. Literal division by zero: e.g. / 0, % 0, /= 0, %= 0
    const literalDivZero = /(?:[^/]\/|%|\/=|%=)\s*0(?:\.0+)?f?(?!\d)/.exec(trimmed);
    if (literalDivZero && !trimmed.startsWith('//')) {
      bugs.push({
        id: `C-RUNTIME-DIV-ZERO-LITERAL-${lineNum}`,
        title: 'Fatal Division by Zero (Literal)',
        type: 'Runtime',
        severity: 'Critical',
        certainty: 'Confirmed Error',
        confidence: 1.0,
        line: lineNum,
        message: 'Arithmetic operation divides or modulos by literal zero.',
        explanation: 'Division by zero is undefined behavior in C (ISO/IEC 9899) and triggers a fatal SIGFPE (Floating Point Exception) runtime crash.',
        whyProblem: 'Hardware traps and immediately aborts process execution on CPU arithmetic fault.',
        suggestedFix: 'Ensure the divisor is non-zero before performing the division.',
        codeSnippet: rawLine,
        fixedSnippet: rawLine.replace(/(\/|%)\s*0(?:\.0+)?f?/, '$1 1 /* verified non-zero */'),
        source: 'Static Analyzer',
        ruleId: 'c/division-by-zero',
        cwe: 'CWE-369'
      });
    }

    // B. Variable division by zero: e.g. x / y or x % y where y is known to be 0
    for (const [varName, state] of variables.entries()) {
      if (state.constantValue === 0) {
        // Pattern: / varName or % varName or /= varName or %= varName
        const divVarRegex = new RegExp(`(?:[^/]\\/|%|\\/=|%=)\\s*${varName}\\b`);
        if (divVarRegex.test(trimmed)) {
          bugs.push({
            id: `C-RUNTIME-DIV-ZERO-VAR-${lineNum}`,
            title: `Fatal Division by Zero (Variable '${varName}' is 0)`,
            type: 'Runtime',
            severity: 'Critical',
            certainty: 'Confirmed Error',
            confidence: 0.98,
            line: lineNum,
            message: `Denominator variable '${varName}' was initialized or assigned to 0 on line ${state.lineDeclared}.`,
            explanation: `The variable '${varName}' has a value of 0. Dividing '${trimmed}' by '${varName}' invokes undefined behavior and triggers an immediate SIGFPE floating-point exception crash.`,
            whyProblem: 'CPU integer or floating-point division by zero generates an unhandled fatal signal, terminating the application abruptly.',
            suggestedFix: `Initialize '${varName}' to a non-zero value, or add a guard 'if (${varName} != 0)' before division.`,
            codeSnippet: rawLine,
            fixedSnippet: `    if (${varName} != 0) {\n    ${rawLine}\n    } else {\n        printf("Error: Division by zero avoided\\n");\n    }`,
            source: 'Static Analyzer',
            ruleId: 'c/division-by-zero',
            cwe: 'CWE-369'
          });
        }
      }
    }

    // --- 2. Check Missing Semicolon on Standard C Statements ---
    const needsSemicolon = /^(int|char|float|double|long|short|void|unsigned|struct\s+\w+|size_t)\s+[^;{}]+$|^(return(\s+[^;]+)?|printf\s*\(.*\)|scanf\s*\(.*\)|free\s*\(.*\)|exit\s*\(.*\))$/;
    if (needsSemicolon.test(trimmed) && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}') && !trimmed.startsWith('#')) {
      bugs.push({
        id: `C-SYNTAX-SEMICOLON-${lineNum}`,
        title: "Missing Semicolon ';' at End of Statement",
        type: 'Syntax',
        severity: 'Critical',
        certainty: 'Confirmed Error',
        confidence: 0.99,
        line: lineNum,
        message: "C statement is missing a required semicolon ';'.",
        explanation: 'C requires all declarations and statements to terminate with a semicolon.',
        whyProblem: 'Compiler error: expected \';\' before token.',
        suggestedFix: `Add ';' to the end of the line: '${trimmed};'`,
        codeSnippet: rawLine,
        fixedSnippet: rawLine + ';',
        source: 'Static Analyzer',
        ruleId: 'c/missing-semicolon'
      });
    }

    // --- 3. Assignment inside Conditional (if (x = 0) or if (x = y)) ---
    const assignInIf = trimmed.match(/^if\s*\(\s*([a-zA-Z_]\w*)\s*=\s*([^=;]+)\s*\)/);
    if (assignInIf) {
      const varName = assignInIf[1];
      const val = assignInIf[2].trim();
      bugs.push({
        id: `C-LOGIC-ASSIGN-IN-IF-${lineNum}`,
        title: "Accidental Assignment '=' in 'if' Condition (Should be '==')",
        type: 'Logical',
        severity: 'High',
        certainty: 'Confirmed Error',
        confidence: 0.95,
        line: lineNum,
        message: `Condition uses assignment operator '=' instead of comparison '==': 'if (${varName} = ${val})'.`,
        explanation: "Using a single '=' assigns the value to the variable and tests the truthiness of the assigned value rather than testing equality.",
        whyProblem: "Causes unexpected branch execution and mutates variable state unintentionally.",
        suggestedFix: `Replace '=' with '==' for equality check: 'if (${varName} == ${val})'.`,
        codeSnippet: rawLine,
        fixedSnippet: rawLine.replace(new RegExp(`if\\s*\\(\\s*${varName}\\s*=\\s*`), `if (${varName} == `),
        source: 'Static Analyzer',
        ruleId: 'c/assignment-in-conditional'
      });
    }

    // --- 4. Trailing Semicolon on Control Flow (if (...); or while (...); or for (...);) ---
    const emptyControlFlow = trimmed.match(/^(if|while|for)\s*\([^)]*\)\s*;/);
    if (emptyControlFlow && !trimmed.startsWith('//')) {
      const kw = emptyControlFlow[1];
      bugs.push({
        id: `C-LOGIC-EMPTY-CONTROL-FLOW-${lineNum}`,
        title: `Misplaced Semicolon Terminating '${kw}' Statement Prematurely`,
        type: 'Logical',
        severity: 'High',
        certainty: 'Confirmed Error',
        confidence: 0.94,
        line: lineNum,
        message: `The '${kw}' construct has an immediate trailing semicolon ';', creating an empty body.`,
        explanation: `In C, a semicolon immediately following an '${kw}' condition creates a null statement. Any subsequent indented block or code will execute unconditionally.`,
        whyProblem: "Silent logic inversion: guarded code executes regardless of whether the condition was true or false.",
        suggestedFix: `Remove the trailing semicolon after '${kw} (...)'.`,
        codeSnippet: rawLine,
        fixedSnippet: rawLine.replace(/;\s*$/, ''),
        source: 'Static Analyzer',
        ruleId: 'c/accidental-empty-control-flow'
      });
    }

    // --- 5. Dangerous gets() Function (CWE-242 / Removed in C11) ---
    if (/\bgets\s*\(/.test(trimmed)) {
      bugs.push({
        id: `C-SEC-DANGEROUS-GETS-${lineNum}`,
        title: 'Banned and Critical Function: gets() (CWE-242)',
        type: 'Security',
        severity: 'Critical',
        certainty: 'Confirmed Error',
        confidence: 0.99,
        line: lineNum,
        message: 'The gets() function is fundamentally unsafe and removed from the C standard.',
        explanation: 'gets() cannot check buffer bounds and reads until a newline, guaranteeing buffer overflow vulnerabilities.',
        whyProblem: 'High probability of memory corruption and remote code execution exploits.',
        suggestedFix: 'Replace gets(buf) with fgets(buf, sizeof(buf), stdin).',
        codeSnippet: rawLine,
        fixedSnippet: rawLine.replace(/gets\s*\(([^)]+)\)/, 'fgets($1, sizeof($1), stdin)'),
        source: 'Static Analyzer',
        ruleId: 'c/banned-gets',
        cwe: 'CWE-242'
      });
    }

    // --- 6. Unsafe strcpy / strcat / sprintf Without Bounds (CWE-120) ---
    if (/\b(strcpy|strcat|sprintf)\s*\(/.test(trimmed)) {
      const fnName = trimmed.match(/\b(strcpy|strcat|sprintf)\b/)?.[0] || 'string function';
      bugs.push({
        id: `C-SEC-UNBOUNDED-STRING-OP-${lineNum}`,
        title: `Buffer Overflow Risk in Unbounded ${fnName} (CWE-120)`,
        type: 'Security',
        severity: 'High',
        certainty: 'Potential Bug',
        confidence: 0.91,
        line: lineNum,
        message: `Use of bounded functions (strncpy, snprintf) is recommended instead of ${fnName}.`,
        explanation: 'Unbounded string copy functions copy until null terminator without checking destination buffer size.',
        whyProblem: 'Causes stack/heap buffer overflow if source length exceeds destination capacity (CWE-120).',
        suggestedFix: 'Use snprintf(dest, sizeof(dest), ...) or strncpy(dest, src, sizeof(dest) - 1).',
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'c/unbounded-string-op',
        cwe: 'CWE-120'
      });
    }

    // --- 7. Format String Vulnerability: printf(var) Without Format String (CWE-134) ---
    if (/printf\s*\(\s*([a-zA-Z0-9_$]+)\s*\)/.test(trimmed)) {
      const match = trimmed.match(/printf\s*\(\s*([a-zA-Z0-9_$]+)\s*\)/);
      if (match && !match[1].startsWith('"')) {
        bugs.push({
          id: `C-SEC-FORMAT-STRING-${lineNum}`,
          title: 'Format String Vulnerability (CWE-134)',
          type: 'Security',
          severity: 'Critical',
          certainty: 'Confirmed Error',
          confidence: 0.95,
          line: lineNum,
          message: 'Passing a variable directly as the format string parameter to printf().',
          explanation: "If the variable contains format specifiers like '%x' or '%n', attackers can read/write process memory.",
          whyProblem: 'Arbitrary memory disclosure and code execution vulnerability.',
          suggestedFix: `Change to printf("%s", ${match[1]});`,
          codeSnippet: rawLine,
          fixedSnippet: rawLine.replace(/printf\s*\(\s*([a-zA-Z0-9_$]+)\s*\)/, 'printf("%s", $1)'),
          source: 'Static Analyzer',
          ruleId: 'c/format-string-injection',
          cwe: 'CWE-134'
        });
      }
    }

    // --- 8. Direct NULL Pointer Dereference (CWE-476) ---
    if (/int\s*\*\s*([a-zA-Z0-9_$]+)\s*=\s*NULL;?\s*\*([a-zA-Z0-9_$]+)\s*=\s*/.test(trimmed) ||
        (trimmed.includes('= NULL') && lines[index + 1] && lines[index + 1].includes('*'))) {
      bugs.push({
        id: `C-RUNTIME-NULL-DEREF-${lineNum}`,
        title: 'NULL Pointer Dereference (Segmentation Fault)',
        type: 'Runtime',
        severity: 'Critical',
        certainty: 'Confirmed Error',
        confidence: 0.98,
        line: lineNum,
        message: 'Dereferencing a pointer initialized to NULL without checking.',
        explanation: 'Accessing memory at address 0x0 causes a fatal SIGSEGV (Segmentation Fault).',
        whyProblem: 'Immediate process crash.',
        suggestedFix: 'Allocate valid memory (e.g. malloc) or verify pointer != NULL before dereferencing.',
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'c/null-pointer-dereference',
        cwe: 'CWE-476'
      });
    }

    // --- 9. Memory Leak (malloc Without free in Scope) (CWE-401) ---
    if (/malloc\s*\(/.test(trimmed)) {
      if (!code.includes('free(')) {
        bugs.push({
          id: `C-RUNTIME-MEM-LEAK-${lineNum}`,
          title: 'Potential Memory Leak (malloc without free)',
          type: 'Runtime',
          severity: 'High',
          certainty: 'Potential Bug',
          confidence: 0.88,
          line: lineNum,
          message: 'Dynamically allocated memory via malloc() is never freed with free().',
          explanation: 'Memory allocated on the heap remains allocated until process termination if not freed.',
          whyProblem: 'Causes process memory bloat and eventual out-of-memory crashes (CWE-401).',
          suggestedFix: 'Ensure every malloc() has a corresponding free(ptr) when the resource is no longer needed.',
          codeSnippet: rawLine,
          source: 'Static Analyzer',
          ruleId: 'c/memory-leak',
          cwe: 'CWE-401'
        });
      }
    }

    // --- 10. Use-After-Free Vulnerability (CWE-416) ---
    if (/free\s*\(\s*([a-zA-Z0-9_$]+)\s*\)/.test(trimmed)) {
      const match = trimmed.match(/free\s*\(\s*([a-zA-Z0-9_$]+)\s*\)/);
      if (match) {
        const varName = match[1];
        const followingLines = lines.slice(index + 1, Math.min(lines.length, index + 6)).join('\n');
        if (new RegExp(`(\\*${varName}|${varName}->|${varName}\\[)`).test(followingLines)) {
          bugs.push({
            id: `C-RUNTIME-USE-AFTER-FREE-${lineNum}`,
            title: 'Use-After-Free Vulnerability (CWE-416)',
            type: 'Runtime',
            severity: 'Critical',
            certainty: 'Confirmed Error',
            confidence: 0.96,
            line: lineNum,
            message: `Pointer '${varName}' is accessed after being deallocated with free().`,
            explanation: 'Accessing memory after calling free() leads to undefined behavior or exploitation if memory is reallocated.',
            whyProblem: 'Memory corruption and security vulnerability (CWE-416).',
            suggestedFix: `Set '${varName} = NULL;' immediately after free(${varName}); and do not reuse.`,
            codeSnippet: rawLine,
            source: 'Static Analyzer',
            ruleId: 'c/use-after-free',
            cwe: 'CWE-416'
          });
        }
      }
    }

    // --- 11. Missing Standard Header Inclusions ---
    if (/\b(printf|scanf|puts|gets|fgets|fopen|fclose)\s*\(/.test(trimmed) && !includedHeaders.has('stdio.h')) {
      bugs.push({
        id: `C-SYNTAX-MISSING-STDIO-${lineNum}`,
        title: "Missing Required Header '#include <stdio.h>'",
        type: 'Syntax',
        severity: 'Medium',
        certainty: 'Confirmed Error',
        confidence: 0.95,
        line: lineNum,
        message: `Standard I/O function '${trimmed.match(/\b(printf|scanf|puts|fgets|fopen)\b/)?.[0]}' used without including <stdio.h>.`,
        explanation: 'C standard library I/O functions require declarations from <stdio.h>. Missing header causes implicit declaration warnings or compiler errors in modern C (C99+).',
        whyProblem: 'Compilation error: implicit declaration of function.',
        suggestedFix: "Add '#include <stdio.h>' at top of file.",
        codeSnippet: rawLine,
        fixedSnippet: '#include <stdio.h>\n' + rawLine,
        source: 'Static Analyzer',
        ruleId: 'c/missing-header-stdio'
      });
    }

    if (/\b(malloc|calloc|realloc|free|exit|atoi|atof)\s*\(/.test(trimmed) && !includedHeaders.has('stdlib.h')) {
      bugs.push({
        id: `C-SYNTAX-MISSING-STDLIB-${lineNum}`,
        title: "Missing Required Header '#include <stdlib.h>'",
        type: 'Syntax',
        severity: 'Medium',
        certainty: 'Confirmed Error',
        confidence: 0.95,
        line: lineNum,
        message: `Memory/utility function used without including <stdlib.h>.`,
        explanation: 'Standard memory allocation and process control functions require declarations from <stdlib.h>.',
        whyProblem: 'Implicit declaration of function leads to pointer truncation on 64-bit systems.',
        suggestedFix: "Add '#include <stdlib.h>' at top of file.",
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'c/missing-header-stdlib'
      });
    }
  });

  // --- 12. Check Missing Return in int main() ---
  if (hasMain && !mainHasReturn) {
    bugs.push({
      id: `C-SEMANTIC-MAIN-NO-RETURN-${mainLine}`,
      title: "Missing 'return 0;' in 'int main()' Entry Point",
      type: 'Semantic',
      severity: 'Low',
      certainty: 'Warning',
      confidence: 0.90,
      line: mainLine,
      message: "'int main()' function should explicitly return an exit status integer.",
      explanation: "While C99+ implicitly returns 0 if execution reaches the end of main, explicit 'return 0;' ensures standard compliance across ANSI C compilers.",
      whyProblem: "Older C compilers (C89/C90) or strict lint flags trigger compiler warnings.",
      suggestedFix: "Add 'return 0;' before closing brace of main.",
      codeSnippet: lines[mainLine - 1] || 'int main()',
      fixedSnippet: '    return 0;\n}',
      source: 'Static Analyzer',
      ruleId: 'c/missing-main-return'
    });
  }

  return bugs;
}
