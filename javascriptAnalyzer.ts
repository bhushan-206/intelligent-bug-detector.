import { parse } from '@babel/parser';
import { DetectedBug } from '../types';
import { checkBracketBalance } from './common';

export function analyzeJavaScriptCode(code: string): DetectedBug[] {
  const bugs: DetectedBug[] = [];
  const lines = code.split('\n');

  // Layer 1 & 2: Compiler / Interpreter Syntax Validation via Babel Parser
  try {
    parse(code, { sourceType: 'unambiguous', plugins: ['jsx', 'typescript'] });
  } catch (err: any) {
    if (err && err.loc) {
      const lineNum = err.loc.line;
      const colNum = err.loc.column;
      const cleanMsg = (err.message || '').replace(/\s*\(\d+:\d+\)$/, '');
      bugs.push({
        id: `JS-PARSER-SYNTAX-${lineNum}-${colNum}`,
        title: `Syntax Error: ${cleanMsg}`,
        type: 'Syntax',
        severity: 'Critical',
        certainty: 'Confirmed Error',
        confidence: 1.0,
        line: lineNum,
        column: colNum,
        message: cleanMsg,
        explanation: `The JavaScript engine parser encountered a fatal syntax error at line ${lineNum}, column ${colNum}: ${cleanMsg}.`,
        whyProblem: 'A JavaScript SyntaxError prevents the script or module from compiling or executing.',
        suggestedFix: `Check syntax around line ${lineNum}, column ${colNum}. Verify matching parentheses, braces, commas, or semicolons.`,
        codeSnippet: lines[lineNum - 1] || '',
        source: 'Compiler/Parser',
        ruleId: 'javascript/syntax-error'
      });
    }
  }

  // 1. Delimiter balance
  bugs.push(...checkBracketBalance(code, 'javascript'));

  // 2. Track variable declarations to detect undeclared variables
  const declaredVars = new Set<string>([
    'console', 'Math', 'window', 'document', 'process', 'JSON', 'Object', 'Array',
    'String', 'Number', 'Boolean', 'Promise', 'Date', 'RegExp', 'Map', 'Set', 'Error',
    'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'EvalError', 'URIError',
    'Intl', 'URL', 'URLSearchParams', 'Headers', 'Request', 'Response', 'AbortController',
    'Blob', 'File', 'FormData', 'crypto', 'btoa', 'atob', 'TextEncoder', 'TextDecoder',
    'WeakMap', 'WeakSet', 'ArrayBuffer', 'DataView', 'Uint8Array', 'Int8Array', 'Uint16Array',
    'Int16Array', 'Uint32Array', 'Int32Array', 'Float32Array', 'Float64Array', 'BigInt64Array',
    'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI', 'encodeURIComponent',
    'decodeURIComponent', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
    'fetch', 'require', 'module', 'exports', 'arguments', 'undefined', 'null', 'true',
    'false', 'NaN', 'Infinity', 'this', 'globalThis', 'Symbol', 'BigInt', 'alert', 'prompt',
    'performance', 'navigator', 'location', 'history', 'localStorage', 'sessionStorage',
    'CustomEvent', 'Event', 'MutationObserver', 'IntersectionObserver', 'ResizeObserver'
  ]);

  // First pass: collect declared identifiers
  lines.forEach((rawLine) => {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) return;
    
    // let a = 10, const b = 20, var c = 30
    const declMatches = trimmed.matchAll(/(?:let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g);
    for (const match of declMatches) {
      declaredVars.add(match[1]);
    }
    // function foo(x, y = 1) or (a, b) => or method(a, b)
    const funcMatches = trimmed.matchAll(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/g);
    for (const match of funcMatches) {
      declaredVars.add(match[1]);
      match[2].split(',').forEach((param) => {
        const p = param.trim().split('=')[0].trim().split(':')[0].trim();
        if (p && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(p)) declaredVars.add(p);
      });
    }
    // Arrow function parameter patterns: (a, b) =>
    const arrowMatches = trimmed.matchAll(/\(([^)]*)\)\s*=>/g);
    for (const match of arrowMatches) {
      match[1].split(',').forEach((param) => {
        const p = param.trim().split('=')[0].trim().split(':')[0].trim();
        if (p && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(p)) declaredVars.add(p);
      });
    }
    // for (let i ...)
    const forMatches = trimmed.matchAll(/for\s*\(\s*(?:let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g);
    for (const match of forMatches) {
      declaredVars.add(match[1]);
    }
  });

  // Second pass: detect undeclared identifiers used in expressions (e.g. `+ c` or `(c)` or `console.log(..., c)`)
  lines.forEach((rawLine, index) => {
    const lineNum = index + 1;
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) return;
    if (/^(?:let|const|var|import|export|function|class|interface|type)\b/.test(trimmed)) return;

    // Strip string literals
    const codeWithoutStrings = trimmed.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');
    
    const identifierMatches = codeWithoutStrings.matchAll(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g);
    for (const match of identifierMatches) {
      const id = match[1];
      const keywords = new Set([
        'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return',
        'try', 'catch', 'finally', 'throw', 'new', 'typeof', 'instanceof', 'in', 'of',
        'void', 'delete', 'await', 'async', 'yield', 'log', 'warn', 'error', 'info',
        'push', 'pop', 'shift', 'unshift', 'slice', 'splice', 'map', 'filter', 'reduce',
        'forEach', 'length', 'includes', 'indexOf', 'split', 'join', 'replace', 'trim'
      ]);
      if (keywords.has(id)) continue;
      
      const matchIndex = match.index || 0;
      if (matchIndex > 0 && codeWithoutStrings[matchIndex - 1] === '.') continue;
      if (codeWithoutStrings[matchIndex + id.length] === ':') continue;

      if (!declaredVars.has(id)) {
        bugs.push({
          id: `JS-SEMANTIC-UNDECLARED-VAR-${lineNum}-${id}`,
          title: `Undeclared Variable '${id}' (ReferenceError)`,
          type: 'Semantic',
          severity: 'High',
          certainty: 'Confirmed Error',
          confidence: 0.95,
          line: lineNum,
          message: `'${id}' is not defined or used before declaration.`,
          explanation: `Variable '${id}' is referenced without prior declaration, which triggers a ReferenceError at runtime.`,
          whyProblem: `Referencing undeclared variable '${id}' results in an unhandled ReferenceError and crashes script execution.`,
          suggestedFix: `Declare '${id}' before use (e.g., 'let ${id} = ...;') or replace '${id}' with the intended variable name.`,
          codeSnippet: rawLine,
          source: 'Static Analyzer',
          ruleId: 'javascript/no-undef'
        });
        declaredVars.add(id);
      }
    }
  });

  lines.forEach((rawLine, index) => {
    const lineNum = index + 1;
    const trimmed = rawLine.trim();

    // Skip empty lines or pure single-line comments
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

    // Check assignment in conditional expressions: if (x = 5)
    const assignInIfRegex = /if\s*\(\s*([a-zA-Z0-9_$]+)\s*=\s*([^=][^)]*)\)/;
    if (assignInIfRegex.test(trimmed)) {
      bugs.push({
        id: `JS-LOGIC-ASSIGN-IN-COND-${lineNum}`,
        title: 'Assignment Operator Used in Conditional Statement',
        type: 'Logical',
        severity: 'High',
        certainty: 'Confirmed Error',
        confidence: 0.96,
        line: lineNum,
        message: "Assignment operator '=' used inside condition instead of comparison '==='.",
        explanation: "Using '=' assigns the right-hand value to the variable and tests truthiness rather than testing equality.",
        whyProblem: 'Usually evaluates to true (or truthy), producing subtle control flow bugs.',
        suggestedFix: "Change '=' to '===' or '=='.",
        codeSnippet: rawLine,
        fixedSnippet: rawLine.replace(/if\s*\(\s*([a-zA-Z0-9_$]+)\s*=\s*([^=])/, 'if ($1 === $2'),
        source: 'Static Analyzer',
        ruleId: 'javascript/no-cond-assign'
      });
    }

    // Check NaN comparison: x === NaN or x == NaN
    if (/===\s*NaN\b|\bNaN\s*===|==\s*NaN\b|\bNaN\s*==/.test(trimmed)) {
      bugs.push({
        id: `JS-LOGIC-NAN-COMPARE-${lineNum}`,
        title: 'Incorrect NaN Comparison (NaN === NaN is always false)',
        type: 'Logical',
        severity: 'High',
        certainty: 'Confirmed Error',
        confidence: 0.99,
        line: lineNum,
        message: "Direct comparison with NaN using '===' or '==' always returns false.",
        explanation: 'In IEEE 754 floating point specification, NaN is never equal to any value, including itself.',
        whyProblem: 'The conditional branch comparing to NaN will never execute as intended.',
        suggestedFix: 'Use Number.isNaN(value) or isNaN(value) instead.',
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'javascript/use-isnan'
      });
    }

    // Check loose equality == with potential type coercion
    if (/[^!=]==[^=]/.test(trimmed) && !trimmed.includes('typeof') && !trimmed.includes('//')) {
      bugs.push({
        id: `JS-LOGIC-EQEQ-${lineNum}`,
        title: "Use of Loose Equality '==' Instead of Strict '==='",
        type: 'Logical',
        severity: 'Low',
        certainty: 'Suggestion',
        confidence: 0.85,
        line: lineNum,
        message: "Expected '===' and instead saw '=='.",
        explanation: "Loose equality ('==') performs implicit type coercion, converting disparate data types unpredictably.",
        whyProblem: "e.g. '' == 0 is true, [] == false is true, leading to hard-to-trace logical discrepancies.",
        suggestedFix: "Use strict equality '===' to verify both type and value.",
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'javascript/eqeqeq'
      });
    }

    // Check off-by-one error in array loops: i <= arr.length
    if (/for\s*\(\s*(let|var|const)?\s*\w+\s*=\s*0\s*;\s*\w+\s*<=\s*([a-zA-Z0-9_$]+)\.length\s*;/.test(trimmed)) {
      bugs.push({
        id: `JS-LOGIC-OFF-BY-ONE-${lineNum}`,
        title: 'Off-by-One Array Index (i <= array.length)',
        type: 'Logical',
        severity: 'High',
        certainty: 'Confirmed Error',
        confidence: 0.97,
        line: lineNum,
        message: 'Loop condition uses <= array.length, which accesses out-of-bounds undefined index.',
        explanation: 'Array indices are 0-indexed up to length - 1. The final iteration accesses array[length] which yields undefined.',
        whyProblem: 'Causes unexpected undefined values or TypeError in subsequent operations.',
        suggestedFix: "Change '<=' to '<' in loop condition (e.g. i < array.length).",
        codeSnippet: rawLine,
        fixedSnippet: rawLine.replace(/<=\s*([a-zA-Z0-9_$]+)\.length/, '< $1.length'),
        source: 'Static Analyzer',
        ruleId: 'javascript/for-loop-bounds'
      });
    }

    // Check dangerous eval
    if (/\beval\s*\(/.test(trimmed)) {
      bugs.push({
        id: `JS-SEC-EVAL-${lineNum}`,
        title: 'Dangerous eval() Execution',
        type: 'Security',
        severity: 'Critical',
        certainty: 'Potential Bug',
        confidence: 0.95,
        line: lineNum,
        message: 'eval() allows execution of arbitrary JavaScript strings in the local scope.',
        explanation: 'Passing dynamic strings or user inputs to eval exposes the entire runtime environment to code injection.',
        whyProblem: 'Critical security risk enabling Cross-Site Scripting (XSS) or remote command execution (CWE-95).',
        suggestedFix: 'Parse data with JSON.parse() or rewrite without dynamic code execution.',
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'javascript/no-eval',
        cwe: 'CWE-95'
      });
    }

    // Check direct innerHTML assignment (XSS)
    if (/\.innerHTML\s*=/.test(trimmed)) {
      const rhs = trimmed.split(/\.innerHTML\s*=\s*/)[1] || '';
      const isDynamic = rhs.includes('+') || rhs.includes('${') || /^[a-zA-Z_$][a-zA-Z0-9_$]*\b/.test(rhs.trim()) || /[a-zA-Z_$][a-zA-Z0-9_$]*\s*\)/.test(rhs);
      if (isDynamic) {
        bugs.push({
          id: `JS-SEC-INNERHTML-XSS-${lineNum}`,
          title: 'Potential Cross-Site Scripting (XSS) via innerHTML',
          type: 'Security',
          severity: 'High',
          certainty: 'Confirmed Error',
          confidence: 0.92,
          line: lineNum,
          message: 'Direct assignment of unsanitized dynamic variables to innerHTML.',
          explanation: 'If the assigned variable contains unescaped HTML tags (e.g. <img src=x onerror=alert(1)>), malicious script executes in the client browser.',
          whyProblem: 'Allows attacker to steal session cookies, tokens, or perform unauthorized DOM actions (CWE-79).',
          suggestedFix: 'Use textContent for plain text, or sanitize HTML using DOMPurify before inserting.',
          codeSnippet: rawLine,
          source: 'Static Analyzer',
          ruleId: 'javascript/dom-xss-innerhtml',
          cwe: 'CWE-79'
        });
      }
    }

    // Check document.write
    if (/document\.write(ln)?\s*\(/.test(trimmed)) {
      bugs.push({
        id: `JS-SEC-DOC-WRITE-${lineNum}`,
        title: 'Use of document.write is Dangerous and Deprecated',
        type: 'Security',
        severity: 'Medium',
        certainty: 'Warning',
        confidence: 0.92,
        line: lineNum,
        message: 'document.write() is unsafe, blocks DOM parsing, and has severe performance/security implications.',
        explanation: 'Calling document.write after page load completely overwrites document content and enables XSS.',
        whyProblem: 'Destroys page layout, prevents optimizations, and exposes XSS injection surface.',
        suggestedFix: 'Use standard DOM manipulation methods like document.createElement() or appendChild().',
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'javascript/no-document-write'
      });
    }

    // Check hardcoded tokens / secrets
    const jsSecretPattern = /(apiKey|api_key|clientSecret|password|jwtSecret|authToken)\s*[:=]\s*['"][a-zA-Z0-9_\-]{8,}['"]/i;
    if (jsSecretPattern.test(trimmed)) {
      bugs.push({
        id: `JS-SEC-SECRET-${lineNum}`,
        title: 'Hardcoded Secret or Access Token',
        type: 'Security',
        severity: 'High',
        certainty: 'Confirmed Error',
        confidence: 0.94,
        line: lineNum,
        message: 'Plaintext secret or API key identified in source code.',
        explanation: 'Exposing credentials in client-side or repository code allows attackers to hijack services.',
        whyProblem: 'Direct credential compromise (CWE-798).',
        suggestedFix: 'Store secrets in server-side environment variables (e.g. process.env.API_KEY).',
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'javascript/no-hardcoded-secret',
        cwe: 'CWE-798'
      });
    }

    // Check potential unhandled promise or async missing await
    if (/async\s+function\s+\w+|\basync\s*\(/.test(trimmed)) {
      // Valid async definition
    } else if (/\.then\s*\(/.test(trimmed) && !trimmed.includes('.catch(')) {
      const blockStr = lines.slice(index, Math.min(lines.length, index + 5)).join(' ');
      if (!blockStr.includes('.catch(')) {
        bugs.push({
          id: `JS-RUNTIME-UNHANDLED-PROMISE-${lineNum}`,
          title: 'Promise Chain Missing .catch() Error Handler',
          type: 'Runtime',
          severity: 'Medium',
          certainty: 'Warning',
          confidence: 0.84,
          line: lineNum,
          message: 'Promise chain lacks rejection handler (.catch).',
          explanation: 'Rejections in promises without catch handlers cause UnhandledPromiseRejection errors.',
          whyProblem: 'In modern Node.js runtimes, unhandled rejections can terminate the process.',
          suggestedFix: 'Append .catch(err => console.error(err)) or use try/catch with async/await.',
          codeSnippet: rawLine,
          source: 'Static Analyzer',
          ruleId: 'javascript/handle-promise-rejection'
        });
      }
    }
  });

  return bugs;
}
