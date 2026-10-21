import { DetectedBug } from '../types';
import { checkBracketBalance } from './common';

interface JavaVarState {
  type: string;
  constantValue?: number | string | null;
  lineDeclared: number;
}

export function analyzeJavaCode(code: string): DetectedBug[] {
  const bugs: DetectedBug[] = [];
  const lines = code.split('\n');

  // 1. Bracket and delimiter balance
  bugs.push(...checkBracketBalance(code));

  // Variable tracking for dataflow analysis
  const variables = new Map<string, JavaVarState>();

  // Pre-scan for variable initializations and zero assignments
  lines.forEach((rawLine, index) => {
    const lineNum = index + 1;
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

    // e.g. int y = 0; or double val = 0.0;
    const declRegex = /\b(int|long|double|float|short|byte)\s+([a-zA-Z_$]\w*)\s*(?:=\s*([^;]+))?\s*;/g;
    let match;
    while ((match = declRegex.exec(trimmed)) !== null) {
      const type = match[1];
      const varName = match[2];
      const valStr = match[3]?.trim();
      let numVal: number | null = null;
      if (valStr && /^-?\d+(\.\d+)?[fFdD]?$/.test(valStr)) {
        numVal = parseFloat(valStr);
      }
      variables.set(varName, {
        type,
        constantValue: numVal,
        lineDeclared: lineNum
      });
    }

    // Standalone assignment: y = 0;
    const assignMatch = trimmed.match(/^([a-zA-Z_$]\w*)\s*=\s*([^;]+)\s*;/);
    if (assignMatch) {
      const varName = assignMatch[1];
      const valStr = assignMatch[2].trim();
      const existing = variables.get(varName);
      if (existing) {
        if (/^-?\d+(\.\d+)?[fFdD]?$/.test(valStr)) {
          existing.constantValue = parseFloat(valStr);
        } else {
          existing.constantValue = null;
        }
      }
    }
  });

  lines.forEach((rawLine, index) => {
    const lineNum = index + 1;
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

    // Check missing semicolon on standard statements
    const needsSemicolonRegex = /^(int|long|double|float|boolean|char|byte|short|String|[A-Z]\w*)\s+\w+(\s*=\s*[^;]+)?$|^(System\.out\.print(ln)?\s*\(.*\)|return(\s+[^;]+)?|throw\s+new\s+[^;]+)$/;
    if (needsSemicolonRegex.test(trimmed) && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}')) {
      bugs.push({
        id: `JAVA-SYNTAX-SEMICOLON-${lineNum}`,
        title: "Missing Semicolon ';' at End of Statement",
        type: 'Syntax',
        severity: 'Critical',
        certainty: 'Confirmed Error',
        confidence: 0.99,
        line: lineNum,
        message: "Java statement is missing a required semicolon ';'.",
        explanation: 'In Java, all expression statements, variable declarations, and return statements must end with a semicolon.',
        whyProblem: "Compilation error: java: ';' expected.",
        suggestedFix: `Add ';' at the end of the line: '${trimmed};'`,
        codeSnippet: rawLine,
        fixedSnippet: rawLine + ';',
        source: 'Static Analyzer',
        ruleId: 'java/missing-semicolon'
      });
    }

    // Check String == String comparison
    if (/\b\w+\s*==\s*("[^"]*"|\w+)/.test(trimmed) && (trimmed.includes('"') || trimmed.toLowerCase().includes('str') || trimmed.toLowerCase().includes('name'))) {
      if (!trimmed.includes('null') && !trimmed.includes('0') && !trimmed.includes('true') && !trimmed.includes('false')) {
        bugs.push({
          id: `JAVA-LOGIC-STRING-EQUALITY-${lineNum}`,
          title: "Comparing Strings Using '==' Instead of .equals()",
          type: 'Logical',
          severity: 'High',
          certainty: 'Confirmed Error',
          confidence: 0.93,
          line: lineNum,
          message: "String comparison uses reference equality '==' rather than content equality .equals().",
          explanation: "In Java, '==' tests whether two String references point to the exact same memory object, not whether their contents are identical.",
          whyProblem: 'Fails unexpectedly when comparing Strings created dynamically or loaded from input/database.',
          suggestedFix: "Use stringA.equals(stringB) or Objects.equals(stringA, stringB).",
          codeSnippet: rawLine,
          source: 'Static Analyzer',
          ruleId: 'java/string-equals'
        });
      }
    }

    // Check literal division by zero
    if (/(?:[^/]\/|%|\/=|%=)\s*0(?:\.0+)?[fFdD]?(?!\d)/.test(trimmed) && !trimmed.startsWith('//')) {
      bugs.push({
        id: `JAVA-RUNTIME-DIV-ZERO-LITERAL-${lineNum}`,
        title: 'ArithmeticException: Integer Division by Zero',
        type: 'Runtime',
        severity: 'Critical',
        certainty: 'Confirmed Error',
        confidence: 0.99,
        line: lineNum,
        message: 'Direct division or modulo by literal zero.',
        explanation: 'Dividing an integer by 0 in Java raises an unhandled java.lang.ArithmeticException: / by zero.',
        whyProblem: 'Abruptly terminates the thread or application.',
        suggestedFix: 'Validate that the divisor is non-zero before performing division.',
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'java/division-by-zero'
      });
    }

    // Check variable division by zero (tracked variable)
    for (const [varName, state] of variables.entries()) {
      if (state.constantValue === 0) {
        const divVarRegex = new RegExp(`(?:[^/]\\/|%|\\/=|%=)\\s*${varName}\\b`);
        if (divVarRegex.test(trimmed)) {
          bugs.push({
            id: `JAVA-RUNTIME-DIV-ZERO-VAR-${lineNum}`,
            title: `ArithmeticException: Division by Zero (Variable '${varName}' is 0)`,
            type: 'Runtime',
            severity: 'Critical',
            certainty: 'Confirmed Error',
            confidence: 0.98,
            line: lineNum,
            message: `Denominator variable '${varName}' was initialized to 0 on line ${state.lineDeclared}.`,
            explanation: `Dividing by '${varName}' (value 0) throws an unhandled java.lang.ArithmeticException: / by zero at runtime.`,
            whyProblem: 'Causes thread termination or server 500 error if unhandled.',
            suggestedFix: `Check '${varName} != 0' before division, or initialize to a non-zero value.`,
            codeSnippet: rawLine,
            fixedSnippet: `    if (${varName} != 0) {\n    ${rawLine}\n    }`,
            source: 'Static Analyzer',
            ruleId: 'java/division-by-zero'
          });
        }
      }
    }

    // Check array or list off-by-one error
    if (/for\s*\(\s*int\s+\w+\s*=\s*0\s*;\s*\w+\s*<=\s*([a-zA-Z0-9_$]+)\.(length|size\(\))\s*;/.test(trimmed)) {
      bugs.push({
        id: `JAVA-LOGIC-OFF-BY-ONE-${lineNum}`,
        title: 'ArrayIndexOutOfBoundsException / IndexOutOfBoundsException in Loop',
        type: 'Logical',
        severity: 'High',
        certainty: 'Confirmed Error',
        confidence: 0.97,
        line: lineNum,
        message: 'Loop condition uses <= array.length or <= list.size(), exceeding valid index limits.',
        explanation: 'Arrays and collections are indexed 0 to N-1. Indexing with size/length throws IndexOutOfBoundsException.',
        whyProblem: 'Guaranteed runtime crash during final iteration.',
        suggestedFix: "Change '<=' to '<' in the loop test condition.",
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'java/loop-bounds'
      });
    }

    // Check accidental semicolon after control flow (if (...); or while (...);)
    const emptyControl = trimmed.match(/^(if|while|for)\s*\([^)]*\)\s*;/);
    if (emptyControl && !trimmed.startsWith('//')) {
      bugs.push({
        id: `JAVA-LOGIC-EMPTY-CONTROL-${lineNum}`,
        title: `Premature Semicolon Terminating '${emptyControl[1]}' Statement`,
        type: 'Logical',
        severity: 'High',
        certainty: 'Confirmed Error',
        confidence: 0.95,
        line: lineNum,
        message: `Statement '${emptyControl[1]}' ends with immediate semicolon ';', resulting in empty body.`,
        explanation: 'The conditional statement has no effect on the subsequent block, executing it unconditionally.',
        whyProblem: 'Inverts program logic and bypasses condition evaluation.',
        suggestedFix: 'Remove the trailing semicolon.',
        codeSnippet: rawLine,
        fixedSnippet: rawLine.replace(/;\s*$/, ''),
        source: 'Static Analyzer',
        ruleId: 'java/empty-control-statement'
      });
    }

    // Check SQL injection in JDBC
    if (/Statement\s+\w+\s*=\s*conn\.createStatement\(\)/.test(trimmed) || /executeQuery\s*\(\s*("[^"]*"\s*\+)/.test(trimmed)) {
      bugs.push({
        id: `JAVA-SEC-SQL-INJECTION-${lineNum}`,
        title: 'SQL Injection via Unparameterized JDBC Statement',
        type: 'Security',
        severity: 'High',
        certainty: 'Potential Bug',
        confidence: 0.92,
        line: lineNum,
        message: 'Constructing dynamic SQL queries with string concatenation.',
        explanation: 'Direct concatenation of parameters into SQL commands exposes the database to SQL injection attacks.',
        whyProblem: 'Severe vulnerability allowing data extraction or manipulation (CWE-89).',
        suggestedFix: 'Use java.sql.PreparedStatement with placeholder parameters (?).',
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'java/sql-injection',
        cwe: 'CWE-89'
      });
    }

    // Check command injection (Runtime.getRuntime().exec)
    if (/Runtime\.getRuntime\(\)\.exec\s*\(/.test(trimmed) || /new\s+ProcessBuilder\s*\(/.test(trimmed)) {
      bugs.push({
        id: `JAVA-SEC-CMD-EXEC-${lineNum}`,
        title: 'Process Execution Security Risk (Runtime.getRuntime().exec)',
        type: 'Security',
        severity: 'High',
        certainty: 'Potential Bug',
        confidence: 0.90,
        line: lineNum,
        message: 'Executing OS commands directly from Java runtime.',
        explanation: 'Executing system commands with unsanitized parameters enables command injection (CWE-78).',
        whyProblem: 'Allows malicious users to execute arbitrary host commands.',
        suggestedFix: 'Validate and whitelist all input arguments strictly, or use high-level Java APIs instead of OS commands.',
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'java/command-execution',
        cwe: 'CWE-78'
      });
    }

    // Check unclosed resources (e.g. FileInputStream, BufferedReader without try-with-resources)
    if (/(new\s+FileInputStream|new\s+FileReader|new\s+BufferedReader|new\s+Scanner)\s*\(/.test(trimmed)) {
      const codeBlock = lines.slice(Math.max(0, index - 2), index + 1).join(' ');
      if (!codeBlock.includes('try (') && !codeBlock.includes('try(')) {
        bugs.push({
          id: `JAVA-RUNTIME-RESOURCE-LEAK-${lineNum}`,
          title: 'Unclosed Resource Leak (Missing try-with-resources)',
          type: 'Runtime',
          severity: 'Medium',
          certainty: 'Warning',
          confidence: 0.86,
          line: lineNum,
          message: 'I/O Stream or Scanner opened without try-with-resources block.',
          explanation: 'Failing to close OS resource handles causes memory and file descriptor leaks.',
          whyProblem: 'Exhausts system file descriptors under high traffic.',
          suggestedFix: 'Wrap in a try-with-resources statement: try (FileInputStream fis = new FileInputStream(...)) { ... }',
          codeSnippet: rawLine,
          source: 'Static Analyzer',
          ruleId: 'java/unclosed-resource'
        });
      }
    }
  });

  return bugs;
}
