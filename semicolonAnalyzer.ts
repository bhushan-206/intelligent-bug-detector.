import { DetectedBug, SupportedLanguage } from '../types';

/**
 * Universal Semicolon Syntax and Logic Analyzer
 * Detects missing semicolons, accidental control-flow semicolons,
 * struct/class terminator omissions, and unidiomatic semicolon usage.
 */
export function analyzeSemicolons(code: string, language: SupportedLanguage): DetectedBug[] {
  const bugs: DetectedBug[] = [];
  const lines = code.split('\n');

  // Track if we are inside a multi-line comment or string
  let inBlockComment = false;

  // Track do-while loops to avoid false positive on `while (...);` at the end of do-while
  const doWhileStartLines = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    if (/\bdo\s*\{?/.test(lines[i].trim())) {
      doWhileStartLines.add(i + 1);
    }
  }

  // Track struct / class / enum / union definitions in C / C++ with accurate brace matching
  const structClosingBraceExpectSemicolon = new Set<number>();
  if (['c', 'cpp'].includes(language)) {
    let currentBraceLevel = 0;
    const structLevelStack: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '').trim();
      const isStructDecl = /^(typedef\s+)?(struct|class|enum|union)\b(\s+[A-Za-z0-9_$]+)?\s*\{?/.test(l) && !l.endsWith(';') && !l.includes('(');

      if (isStructDecl) {
        structLevelStack.push(currentBraceLevel);
      }

      for (let c = 0; c < l.length; c++) {
        const ch = l[c];
        if (ch === '{') {
          currentBraceLevel++;
        } else if (ch === '}') {
          currentBraceLevel--;
          if (structLevelStack.length > 0 && structLevelStack[structLevelStack.length - 1] === currentBraceLevel) {
            structLevelStack.pop();
            // This '}' closes the struct/class! Check if it has a semicolon
            const afterBrace = l.slice(c + 1).trim();
            const nextLine = (lines[i + 1] || '').trim();
            const hasSemicolon = afterBrace.includes(';') || nextLine.startsWith(';') || /^[A-Za-z0-9_$,\s*]+;/.test(nextLine);
            if (!hasSemicolon) {
              structClosingBraceExpectSemicolon.add(i + 1);
            }
          }
        }
      }
    }
  }

  lines.forEach((rawLine, index) => {
    const lineNum = index + 1;
    const trimmed = rawLine.trim();

    // 1. Comment handling
    if (trimmed.startsWith('/*')) inBlockComment = true;
    if (inBlockComment) {
      if (trimmed.includes('*/')) inBlockComment = false;
      return;
    }
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) {
      return;
    }

    // Strip inline single-line comments for analysis
    const cleanLine = trimmed
      .replace(/\/\/.*$/, '')
      .replace(/#.*$/, '')
      .trim();

    if (!cleanLine) return;

    // =========================================================================
    // Check 1: Accidental Semicolon on Control Statements (C, C++, Java, JS)
    // e.g. `if (x > 0); { doSomething(); }` or `for (int i=0; i<10; i++);`
    // =========================================================================
    if (['c', 'cpp', 'java', 'javascript'].includes(language)) {
      // Check `if (...) ;`
      if (/^if\s*\([^;)]+\)\s*;(\s*\{.*|\s*$)/.test(cleanLine)) {
        bugs.push({
          id: `SEMICOLON-ACCIDENTAL-IF-${lineNum}`,
          title: "Accidental Semicolon After 'if' Condition",
          type: 'Logical',
          severity: 'Critical',
          certainty: 'Confirmed Error',
          confidence: 0.98,
          line: lineNum,
          message: "A semicolon immediately follows the 'if' condition, creating an empty conditional statement.",
          explanation: "Placing a semicolon right after 'if (...);' terminates the if statement immediately. The subsequent block or statement will always execute unconditionally.",
          whyProblem: "The condition has no effect on the following code block, leading to severe logical execution flaws.",
          suggestedFix: `Remove the trailing semicolon from the 'if' condition: '${cleanLine.replace(/;\s*\{/, ' {').replace(/;\s*$/, '')}'`,
          codeSnippet: rawLine,
          fixedSnippet: rawLine.replace(/;\s*(\{?)/, ' $1').trimEnd(),
          source: 'Static Analyzer',
          ruleId: 'control/accidental-semicolon-if'
        });
      }

      // Check `for (...) ;` (when semicolon is directly after closing parenthesis)
      if (/^for\s*\([^)]+\)\s*;(\s*\{.*|\s*$)/.test(cleanLine)) {
        bugs.push({
          id: `SEMICOLON-ACCIDENTAL-FOR-${lineNum}`,
          title: "Accidental Semicolon After 'for' Loop Header",
          type: 'Logical',
          severity: 'High',
          certainty: 'Confirmed Error',
          confidence: 0.96,
          line: lineNum,
          message: "A semicolon immediately follows the 'for' loop header, resulting in an empty loop body.",
          explanation: "The loop iterates without executing any statements in its body, and the subsequent code block only executes once with the final iterator value.",
          whyProblem: "Causes loop bodies to be detached from iterations, triggering logic failures and unintended state mutations.",
          suggestedFix: "Remove the semicolon after the closing parenthesis of the for loop header.",
          codeSnippet: rawLine,
          fixedSnippet: rawLine.replace(/;\s*(\{?)/, ' $1').trimEnd(),
          source: 'Static Analyzer',
          ruleId: 'control/accidental-semicolon-for'
        });
      }

      // Check `while (...) ;` (Ensure not part of do-while)
      if (/^while\s*\([^;)]+\)\s*;(\s*\{.*|\s*$)/.test(cleanLine)) {
        // Look back 15 lines to see if there's an active `do` block
        let isDoWhile = false;
        for (let back = Math.max(0, index - 15); back < index; back++) {
          if (/\bdo\s*\{?/.test(lines[back])) {
            isDoWhile = true;
            break;
          }
        }

        if (!isDoWhile) {
          bugs.push({
            id: `SEMICOLON-ACCIDENTAL-WHILE-${lineNum}`,
            title: "Accidental Semicolon After 'while' Condition",
            type: 'Logical',
            severity: 'Critical',
            certainty: 'Confirmed Error',
            confidence: 0.97,
            line: lineNum,
            message: "A semicolon immediately follows the 'while' condition, creating an empty loop body.",
            explanation: "If the condition evaluates to true, this results in an immediate infinite loop freezing execution. If false, the loop terminates immediately.",
            whyProblem: "Freezes the thread/application in an infinite loop or bypasses the intended loop body entirely.",
            suggestedFix: "Remove the semicolon directly following the while condition.",
            codeSnippet: rawLine,
            fixedSnippet: rawLine.replace(/;\s*(\{?)/, ' $1').trimEnd(),
            source: 'Static Analyzer',
            ruleId: 'control/accidental-semicolon-while'
          });
        }
      }

      // Check accidental semicolon after function/method header before `{`
      if (/^(void|int|float|double|char|long|short|unsigned|public|private|protected|static|auto|function)\s+.*\)\s*;\s*\{/.test(cleanLine)) {
        bugs.push({
          id: `SEMICOLON-ACCIDENTAL-FUNC-HEADER-${lineNum}`,
          title: "Accidental Semicolon on Function/Method Definition",
          type: 'Syntax',
          severity: 'Critical',
          certainty: 'Confirmed Error',
          confidence: 0.99,
          line: lineNum,
          message: "Semicolon placed after function signature before opening brace '{'.",
          explanation: "In C/C++/Java, placing ';' after a function header turns it into a forward declaration/prototype, leaving the '{...}' as an invalid orphaned block.",
          whyProblem: "Causes compilation syntax error or structural parse failure.",
          suggestedFix: "Remove the ';' before '{'.",
          codeSnippet: rawLine,
          fixedSnippet: rawLine.replace(/;\s*\{/, ' {'),
          source: 'Static Analyzer',
          ruleId: 'syntax/accidental-semicolon-function'
        });
      }

      // Check double/redundant semicolons: `;;`
      if (/;\s*;/.test(cleanLine) && !cleanLine.includes('for (') && !cleanLine.includes('for(')) {
        bugs.push({
          id: `SEMICOLON-REDUNDANT-${lineNum}`,
          title: "Redundant Double Semicolon ';;'",
          type: 'Syntax',
          severity: 'Low',
          certainty: 'Suggestion',
          confidence: 0.95,
          line: lineNum,
          message: "Duplicate semicolon ';;' found on statement.",
          explanation: "Extra semicolons create empty no-op statements. While compilers tolerate them in some contexts, they are redundant noise.",
          whyProblem: "Decreases code quality and can cause parse ambiguities.",
          suggestedFix: "Remove the duplicate semicolon.",
          codeSnippet: rawLine,
          fixedSnippet: rawLine.replace(/;\s*;/g, ';'),
          source: 'Static Analyzer',
          ruleId: 'syntax/redundant-semicolon'
        });
      }
    }

    // =========================================================================
    // Check 2: Missing Semicolons in C, C++, and Java
    // =========================================================================
    if (['c', 'cpp', 'java'].includes(language)) {
      // Must not end with: ; { } , : or be preprocessor directive (#) or control statement without body
      const endsWithValidTerminator = /[;{},:\\]$/.test(cleanLine) || cleanLine.startsWith('#');
      const isControlHeader = /^(if|for|while|switch|else|do|try|catch|finally)\b/.test(cleanLine);
      const isClassOrFunctionSignature = /(\)\s*(\{|const|noexcept|throws\s+[\w,\s]+)?$|\b(class|struct|interface|enum|namespace)\s+\w+)/.test(cleanLine) && (cleanLine.endsWith('{') || !cleanLine.includes(';'));

      if (!endsWithValidTerminator) {
        let isMissing = false;
        let statementType = '';

        // Java Package & Imports
        if (/^(package|import)\s+[\w\.\*]+$/.test(cleanLine)) {
          isMissing = true;
          statementType = `${cleanLine.startsWith('package') ? 'Package' : 'Import'} declaration`;
        }
        // Variable declarations with types (C/C++/Java)
        else if (/^(int|long|double|float|boolean|bool|char|byte|short|size_t|uint\d+_t|int\d+_t|void\*?|String|std::string|std::vector|auto|const|final|static|volatile|[A-Z]\w*(<[^>]+>)?)\s+(\*|&)*\w+(\s*\[[^\]]*\])?(\s*=\s*[^;{}]+)?$/.test(cleanLine)) {
          isMissing = true;
          statementType = 'Variable declaration';
        }
        // Variable assignments: `x = 10`, `count += 1`, `arr[i] = 5`, `ptr->val = 20`, `*ptr = 10`
        else if (/^(\*?\w+(\[[^\]]+\])?(\s*->\s*\w+|\s*\.\s*\w+)*)\s*(=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|<<=|>>=)\s*[^;{}]+$/.test(cleanLine)) {
          isMissing = true;
          statementType = 'Assignment expression';
        }
        // Increments & decrements: `i++`, `++i`, `i--`, `--i`
        else if (/^(\w+\+\+|\+\+\w+|\w+--|--\w+)$/.test(cleanLine)) {
          isMissing = true;
          statementType = 'Increment/decrement statement';
        }
        // Common function calls & I/O: printf, scanf, free, malloc, System.out.println, std::cout, customCall(...)
        else if (/^(printf|scanf|puts|free|exit|malloc|calloc|realloc|memset|memcpy|System\.out\.print(ln)?|std::cout\s*<<.*|std::cin\s*>>.*|\w+(\.\w+|->\w+)*\s*\([^)]*\))$/.test(cleanLine)) {
          isMissing = true;
          statementType = 'Function or method call';
        }
        // Control flow: return, throw, break, continue, goto
        else if (/^(return(\s+[^;{}]+)?|throw\s+new\s+[^;{}]+|throw\s+[^;{}]+|break|continue|goto\s+\w+)$/.test(cleanLine)) {
          isMissing = true;
          statementType = 'Return/flow control statement';
        }

        if (isMissing) {
          bugs.push({
            id: `${language.toUpperCase()}-SYNTAX-MISSING-SEMICOLON-${lineNum}`,
            title: `Missing Semicolon ';' on ${statementType}`,
            type: 'Syntax',
            severity: 'Critical',
            certainty: 'Confirmed Error',
            confidence: 0.99,
            line: lineNum,
            message: `${statementType} is missing a required statement terminator ';'.`,
            explanation: `In ${language.toUpperCase()}, all statements, variable declarations, and expressions must terminate with a semicolon.`,
            whyProblem: `Compiler error: expected ';' before end of line or next token.`,
            suggestedFix: `Append ';' to the end of the line: '${cleanLine};'`,
            codeSnippet: rawLine,
            fixedSnippet: rawLine + ';',
            source: 'Static Analyzer',
            ruleId: `${language}/missing-semicolon`
          });
        }
      }

      // Check Struct/Class in C/C++ missing trailing semicolon after closing brace `}`
      if (['c', 'cpp'].includes(language)) {
        if (structClosingBraceExpectSemicolon.has(lineNum)) {
          bugs.push({
            id: `${language.toUpperCase()}-SYNTAX-STRUCT-SEMICOLON-${lineNum}`,
            title: "Missing Semicolon ';' After Struct/Class/Enum Declaration",
            type: 'Syntax',
            severity: 'Critical',
            certainty: 'Confirmed Error',
            confidence: 0.98,
            line: lineNum,
            message: `Missing required semicolon ';' after closing brace '}' of ${language.toUpperCase()} struct/class/enum.`,
            explanation: `In ${language.toUpperCase()}, struct, class, union, and enum definitions must end with a semicolon after the closing brace: '} ;'.`,
            whyProblem: "Compiler error: expected ';' after struct/class definition.",
            suggestedFix: "Add ';' after '}': '};'",
            codeSnippet: rawLine,
            fixedSnippet: '};',
            source: 'Static Analyzer',
            ruleId: `${language}/struct-missing-semicolon`
          });
        }
      }
    }

    // =========================================================================
    // Check 3: Python Semicolon Misuse
    // =========================================================================
    if (language === 'python') {
      // Check misplaced semicolon on block header statements (e.g. `if x > 0;`, `def foo();`, `while True;`)
      const pyBlockRegex = /^(def\s+\w+\s*\(.*\)|class\s+\w+(\(.*\))?|if\s+.+|elif\s+.+|else|for\s+.+\s+in\s+.+|while\s+.+|try|except(\s+.*)?|finally|with\s+.+)\s*;$/;
      if (pyBlockRegex.test(cleanLine)) {
        bugs.push({
          id: `PY-SYNTAX-SEMICOLON-HEADER-${lineNum}`,
          title: "Misplaced Semicolon ';' on Python Block Header (Expected ':')",
          type: 'Syntax',
          severity: 'Critical',
          certainty: 'Confirmed Error',
          confidence: 0.99,
          line: lineNum,
          message: `Python compound statement ends with ';' instead of required colon ':'.`,
          explanation: "In Python, header statements introducing an indented block must end with a colon (:), not a semicolon (;).",
          whyProblem: "Causes a fatal SyntaxError: invalid syntax.",
          suggestedFix: `Replace the trailing ';' with ':': '${cleanLine.slice(0, -1)}:'`,
          codeSnippet: rawLine,
          fixedSnippet: rawLine.replace(/;\s*$/, ':'),
          source: 'Static Analyzer',
          ruleId: 'python/semicolon-block-header'
        });
      }

      // Check unidiomatic trailing semicolon in Python (PEP 8 violation)
      if (cleanLine.endsWith(';') && !cleanLine.includes('#') && !pyBlockRegex.test(cleanLine)) {
        bugs.push({
          id: `PY-STYLE-TRAILING-SEMICOLON-${lineNum}`,
          title: "Unnecessary Trailing Semicolon ';' in Python (PEP 8)",
          type: 'Semantic',
          severity: 'Low',
          certainty: 'Suggestion',
          confidence: 0.92,
          line: lineNum,
          message: "Statement ends with an unnecessary semicolon ';'.",
          explanation: "Python does not require statement terminators. Trailing semicolons violate PEP 8 style conventions.",
          whyProblem: "Considered anti-pattern in Python and reduces code readability.",
          suggestedFix: `Remove the trailing semicolon: '${cleanLine.replace(/;+$/, '')}'`,
          codeSnippet: rawLine,
          fixedSnippet: rawLine.replace(/;+\s*$/, ''),
          source: 'Static Analyzer',
          ruleId: 'python/trailing-semicolon'
        });
      }
    }
  });

  return bugs;
}
