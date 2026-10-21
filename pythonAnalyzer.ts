import { DetectedBug } from '../types';
import { checkBracketBalance } from './common';

export function analyzePythonCode(code: string): DetectedBug[] {
  const bugs: DetectedBug[] = [];
  const lines = code.split('\n');

  // 1. Bracket & Delimiter Checking
  bugs.push(...checkBracketBalance(code));

  // 2. Syntax & Indentation Analysis
  let prevIndent = 0;
  const indentStack: number[] = [0];

  // Variable tracking for Python dataflow analysis
  const zeroVariables = new Map<string, number>();
  lines.forEach((rawLine, index) => {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const assignMatch = trimmed.match(/^([a-zA-Z_]\w*)\s*=\s*(0(?:\.0+)?)\s*$/);
    if (assignMatch) {
      zeroVariables.set(assignMatch[1], index + 1);
    }
  });

  lines.forEach((rawLine, index) => {
    const lineNum = index + 1;
    const trimmed = rawLine.trim();

    // Skip empty lines or pure comments
    if (!trimmed || trimmed.startsWith('#')) return;

    // Check mixed tabs and spaces
    if (rawLine.includes('\t') && rawLine.includes('  ')) {
      bugs.push({
        id: `PY-INDENT-MIXED-${lineNum}`,
        title: 'Mixed Tabs and Spaces in Indentation',
        type: 'Syntax',
        severity: 'Medium',
        certainty: 'Confirmed Error',
        confidence: 0.95,
        line: lineNum,
        message: 'Mixed use of tabs and spaces in indentation detected (TabError risk).',
        explanation: 'Python 3 disallows mixing tabs and spaces for indentation in the same file.',
        whyProblem: 'Leads to unpredictable block parsing or immediate TabError exceptions at runtime.',
        suggestedFix: 'Standardize on 4 spaces per indentation level.',
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'python/mixed-indentation'
      });
    }

    // Check missing colon after compound statement keywords
    const blockKeywordsRegex = /^(def\s+\w+\s*\(.*\)|class\s+\w+(\(.*\))?|if\s+.+|elif\s+.+|else|for\s+.+\s+in\s+.+|while\s+.+|try|except(\s+.*)?|finally|with\s+.+)/;
    if (blockKeywordsRegex.test(trimmed) && !trimmed.endsWith(':')) {
      bugs.push({
        id: `PY-SYNTAX-COLON-${lineNum}`,
        title: 'Missing Colon at End of Statement',
        type: 'Syntax',
        severity: 'Critical',
        certainty: 'Confirmed Error',
        confidence: 0.98,
        line: lineNum,
        message: `Statement '${trimmed.split(' ')[0]}' must end with a colon ':'.`,
        explanation: 'In Python, header statements introducing a code block require a trailing colon (:).',
        whyProblem: 'Causes a fatal SyntaxError upon parsing.',
        suggestedFix: `Add ':' at the end of the line: '${trimmed}:'`,
        codeSnippet: rawLine,
        fixedSnippet: rawLine + ':',
        source: 'Static Analyzer',
        ruleId: 'python/missing-colon'
      });
    }

    // Check mutable default arguments in functions
    const mutableDefaultRegex = /def\s+\w+\s*\([^)]*=\s*(\[\]|\{\}|set\(\))/;
    if (mutableDefaultRegex.test(trimmed)) {
      bugs.push({
        id: `PY-LOGIC-MUTABLE-ARG-${lineNum}`,
        title: 'Mutable Default Argument in Function Definition',
        type: 'Logical',
        severity: 'High',
        certainty: 'Potential Bug',
        confidence: 0.92,
        line: lineNum,
        message: 'Default parameter uses mutable object (list/dict/set).',
        explanation: 'Default arguments are evaluated once at function definition time, not every call.',
        whyProblem: 'Mutations persist across subsequent invocations, creating unexpected shared state bugs.',
        suggestedFix: 'Use None as default parameter and initialize inside the function (e.g., if arg is None: arg = []).',
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'python/mutable-default-argument'
      });
    }

    // Check division by zero (literal)
    if (/(\/|\/\/|%)\s*0(\.0+)?(?!\d)/.test(trimmed)) {
      bugs.push({
        id: `PY-RUNTIME-DIV-ZERO-${lineNum}`,
        title: 'Literal Division by Zero',
        type: 'Runtime',
        severity: 'Critical',
        certainty: 'Confirmed Error',
        confidence: 0.99,
        line: lineNum,
        message: 'Arithmetic operation divides by zero directly.',
        explanation: 'Attempting to divide or modulo by integer zero raises ZeroDivisionError in Python.',
        whyProblem: 'Causes immediate unhandled runtime crash.',
        suggestedFix: 'Ensure denominator is non-zero or add validation before division.',
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'python/division-by-zero'
      });
    }

    // Check division by zero (variable assigned 0)
    for (const [varName, declLine] of zeroVariables.entries()) {
      const divVarRegex = new RegExp(`(?:[^/]\\/|\\/\\/|%)\\s*${varName}\\b`);
      if (divVarRegex.test(trimmed)) {
        bugs.push({
          id: `PY-RUNTIME-DIV-ZERO-VAR-${lineNum}`,
          title: `ZeroDivisionError: Division by Zero (Variable '${varName}' is 0)`,
          type: 'Runtime',
          severity: 'Critical',
          certainty: 'Confirmed Error',
          confidence: 0.98,
          line: lineNum,
          message: `Variable '${varName}' was assigned 0 on line ${declLine}. Dividing by '${varName}' raises ZeroDivisionError.`,
          explanation: `In Python, evaluating an expression with a denominator of 0 raises an unhandled ZeroDivisionError.`,
          whyProblem: 'Causes immediate Python process or script termination.',
          suggestedFix: `Add 'if ${varName} != 0:' check before division or set a non-zero value.`,
          codeSnippet: rawLine,
          fixedSnippet: `if ${varName} != 0:\n    ${rawLine}\nelse:\n    print("Division by zero prevented")`,
          source: 'Static Analyzer',
          ruleId: 'python/division-by-zero'
        });
      }
    }

    // Check 'is' vs '==' for literals
    if (/\bis\s+([0-9]+|"[^"]*"|'[^']*')\b/.test(trimmed) || /\b([0-9]+|"[^"]*"|'[^']*')\s+is\b/.test(trimmed)) {
      bugs.push({
        id: `PY-LOGIC-IS-LITERAL-${lineNum}`,
        title: "Using 'is' for Literal Comparison",
        type: 'Logical',
        severity: 'Medium',
        certainty: 'Warning',
        confidence: 0.90,
        line: lineNum,
        message: "Comparison uses 'is' with literal constant instead of '=='.",
        explanation: "'is' compares object identity (memory address), whereas '==' compares equality of values.",
        whyProblem: 'Can fail non-deterministically across different Python implementations or large integers/strings.',
        suggestedFix: "Replace 'is' with '==' for value equality checks.",
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'python/is-literal-comparison'
      });
    }

    // Check bare except clause
    if (/^except\s*:/.test(trimmed)) {
      bugs.push({
        id: `PY-RUNTIME-BARE-EXCEPT-${lineNum}`,
        title: 'Bare except Clause Catches SystemExit and KeyboardInterrupt',
        type: 'Runtime',
        severity: 'Medium',
        certainty: 'Warning',
        confidence: 0.88,
        line: lineNum,
        message: "Bare 'except:' intercepts all exceptions including KeyboardInterrupt and SystemExit.",
        explanation: 'Catching BaseException masks severe system events and makes debugging very difficult.',
        whyProblem: 'Prevents graceful termination and hides programmer errors like NameError or TypeError.',
        suggestedFix: "Use 'except Exception:' to catch standard application errors without blocking interrupt signals.",
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'python/bare-except'
      });
    }

    // Check dangerous eval / exec
    if (/\b(eval|exec)\s*\(/.test(trimmed)) {
      bugs.push({
        id: `PY-SEC-EVAL-${lineNum}`,
        title: 'Arbitrary Code Execution via eval()/exec()',
        type: 'Security',
        severity: 'Critical',
        certainty: 'Potential Bug',
        confidence: 0.94,
        line: lineNum,
        message: 'Dynamic execution of strings using eval() or exec() poses serious security risks.',
        explanation: 'If input passed to eval/exec is derived from user data, attackers can execute arbitrary system commands.',
        whyProblem: 'High severity Remote Code Execution (RCE) vulnerability (CWE-95).',
        suggestedFix: 'Use ast.literal_eval for safe data parsing or redesign without dynamic evaluation.',
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'python/unsafe-eval',
        cwe: 'CWE-95'
      });
    }

    // Check command injection (os.system, subprocess with shell=True)
    if (/\bos\.system\s*\(/.test(trimmed) || (/\bsubprocess\./.test(trimmed) && /shell\s*=\s*True/.test(trimmed))) {
      bugs.push({
        id: `PY-SEC-CMD-INJECT-${lineNum}`,
        title: 'Command Injection Risk via Shell Execution',
        type: 'Security',
        severity: 'High',
        certainty: 'Potential Bug',
        confidence: 0.91,
        line: lineNum,
        message: 'Running shell commands with string concatenation or shell=True.',
        explanation: 'Passing unsanitized strings to shell execution functions allows command chaining (e.g. `; rm -rf`).',
        whyProblem: 'Allows unauthorized system access or host compromise (CWE-78).',
        suggestedFix: 'Use subprocess.run(["cmd", "arg1", "arg2"], shell=False) with parameterized arguments.',
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'python/command-injection',
        cwe: 'CWE-78'
      });
    }

    // Check hardcoded secrets / API keys
    const secretPattern = /(api[_-]?key|secret[_-]?key|password|auth[_-]?token|jwt[_-]?token)\s*=\s*['"][a-zA-Z0-9_\-]{8,}['"]/i;
    if (secretPattern.test(trimmed)) {
      bugs.push({
        id: `PY-SEC-HARDCODED-SECRET-${lineNum}`,
        title: 'Hardcoded Secret or API Key in Source Code',
        type: 'Security',
        severity: 'High',
        certainty: 'Confirmed Error',
        confidence: 0.93,
        line: lineNum,
        message: 'Sensitive credential or secret key appears to be hardcoded in plaintext.',
        explanation: 'Credentials stored directly in source repositories can be leaked through version control.',
        whyProblem: 'Violates credential management security policies (CWE-798).',
        suggestedFix: 'Load sensitive credentials from environment variables using os.environ.get(...).',
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'python/hardcoded-credentials',
        cwe: 'CWE-798'
      });
    }

    // Check SQL injection in string formatting
    const sqlPattern = /(SELECT\s+.+\s+FROM|INSERT\s+INTO|UPDATE\s+.+\s+SET|DELETE\s+FROM)/i;
    if (sqlPattern.test(trimmed) && (trimmed.includes('f"') || trimmed.includes("f'") || trimmed.includes('%') || trimmed.includes('.format(') || trimmed.includes('+'))) {
      bugs.push({
        id: `PY-SEC-SQLI-${lineNum}`,
        title: 'Potential SQL Injection via String Interpolation',
        type: 'Security',
        severity: 'High',
        certainty: 'Potential Bug',
        confidence: 0.89,
        line: lineNum,
        message: 'SQL query constructed via string concatenation or f-string formatting.',
        explanation: 'Interpolating variables directly into SQL queries allows attackers to alter query logic.',
        whyProblem: 'Leads to unauthorized database reading, tampering, or data loss (CWE-89).',
        suggestedFix: 'Use parameterized queries / prepared statements (e.g. cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))).',
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'python/sql-injection',
        cwe: 'CWE-89'
      });
    }

    // Check off-by-one error with range(len(...) + 1)
    if (/range\s*\(\s*len\s*\(.+\)\s*\+\s*1\s*\)/.test(trimmed)) {
      bugs.push({
        id: `PY-LOGIC-OFF-BY-ONE-${lineNum}`,
        title: 'Off-by-One Index Error in range(len(...) + 1)',
        type: 'Logical',
        severity: 'High',
        certainty: 'Confirmed Error',
        confidence: 0.96,
        line: lineNum,
        message: 'range(len(items) + 1) iterates beyond valid 0-indexed bounds.',
        explanation: 'Indices in Python range from 0 to len-1. Indexing with len(items) triggers IndexError.',
        whyProblem: 'Causes IndexError: list index out of range during loop execution.',
        suggestedFix: 'Iterate directly over the sequence or use range(len(items)).',
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'python/range-len-plus-one'
      });
    }

    // Check infinite loop pattern while True with no break
    if (/^while\s+True\s*:/.test(trimmed)) {
      const remainingCode = lines.slice(index).join('\n');
      if (!remainingCode.includes('break') && !remainingCode.includes('return') && !remainingCode.includes('raise') && !remainingCode.includes('sys.exit')) {
        bugs.push({
          id: `PY-LOGIC-INFINITE-LOOP-${lineNum}`,
          title: 'Potential Unbounded Infinite Loop (while True without exit)',
          type: 'Logical',
          severity: 'High',
          certainty: 'Potential Bug',
          confidence: 0.87,
          line: lineNum,
          message: 'Loop header specifies while True but no terminating break/return was detected.',
          explanation: 'Loops without reachable exit conditions consume 100% CPU and freeze program execution.',
          whyProblem: 'Causes Denial of Service or hanging application threads.',
          suggestedFix: 'Add a loop condition or a conditional break statement.',
          codeSnippet: rawLine,
          source: 'Static Analyzer',
          ruleId: 'python/infinite-loop'
        });
      }
    }
  });

  return bugs;
}
