import { BugSeverity, DetectedBug, AnalysisSummary, SupportedLanguage, CertaintyLevel } from '../types';

/**
 * Calculates line numbers for a given character index in source code.
 */
export function getLineAndColumn(code: string, index: number): { line: number; column: number } {
  const lines = code.slice(0, index).split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  return { line, column };
}

/**
 * Extracts a safe code snippet around a given line number.
 */
export function getSnippet(code: string, lineNumber: number, contextLines: number = 1): string {
  const lines = code.split('\n');
  const targetIndex = lineNumber - 1;
  if (targetIndex < 0 || targetIndex >= lines.length) return '';
  
  const start = Math.max(0, targetIndex - contextLines);
  const end = Math.min(lines.length - 1, targetIndex + contextLines);
  
  return lines.slice(start, end + 1).join('\n');
}

/**
 * Checks for bracket/parenthesis/brace balance and reports exact positions.
 */
/**
 * Checks for bracket/parenthesis/brace balance with language-aware string and comment handling.
 */
export function checkBracketBalance(code: string, language?: SupportedLanguage): DetectedBug[] {
  const bugs: DetectedBug[] = [];
  const stack: { char: string; line: number; col: number; index: number }[] = [];
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const closing: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  
  const lines = code.split('\n');
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let inBlockComment = false;
  let inHtmlComment = false;
  let inTripleSingle = false;
  let inTripleDouble = false;

  for (let l = 0; l < lines.length; l++) {
    const lineStr = lines[l];
    let inLineComment = false;

    for (let c = 0; c < lineStr.length; c++) {
      const char = lineStr[c];
      const next = lineStr[c + 1] || '';
      const next2 = lineStr[c + 2] || '';
      const next3 = lineStr[c + 3] || '';
      const prev = c > 0 ? lineStr[c - 1] : '';

      // HTML comment handling
      if (language === 'html') {
        if (!inHtmlComment && char === '<' && next === '!' && next2 === '-' && next3 === '-') {
          inHtmlComment = true;
          c += 3;
          continue;
        }
        if (inHtmlComment) {
          if (char === '-' && next === '-' && next2 === '>') {
            inHtmlComment = false;
            c += 2;
          }
          continue;
        }
      }

      // Python triple quote handling
      if (language === 'python') {
        if (!inSingleQuote && !inDoubleQuote && !inLineComment) {
          if (!inTripleDouble && char === '"' && next === '"' && next2 === '"') {
            inTripleDouble = !inTripleDouble;
            c += 2;
            continue;
          }
          if (!inTripleSingle && char === "'" && next === "'" && next2 === "'") {
            inTripleSingle = !inTripleSingle;
            c += 2;
            continue;
          }
          if (inTripleDouble || inTripleSingle) continue;
        }
      }

      // Comments handling
      if (!inSingleQuote && !inDoubleQuote && !inBacktick && !inTripleSingle && !inTripleDouble) {
        // C-style line comments // (C, C++, Java, JS)
        if (language !== 'python' && language !== 'html') {
          if (!inBlockComment && char === '/' && next === '/') {
            inLineComment = true;
            break;
          }
          if (!inBlockComment && char === '/' && next === '*') {
            inBlockComment = true;
            c++;
            continue;
          }
          if (inBlockComment && char === '*' && next === '/') {
            inBlockComment = false;
            c++;
            continue;
          }
        }

        // Python hash comment #
        if (language === 'python' || (!language && char === '#' && (next !== '!' || l > 0))) {
          if (char === '#') {
            inLineComment = true;
            break;
          }
        }
      }

      if (inLineComment || inBlockComment || inHtmlComment || inTripleSingle || inTripleDouble) continue;

      // String literal handling
      if (char === "'" && prev !== '\\' && !inDoubleQuote && !inBacktick) {
        inSingleQuote = !inSingleQuote;
        continue;
      }
      if (char === '"' && prev !== '\\' && !inSingleQuote && !inBacktick) {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }
      if (char === '`' && prev !== '\\' && !inSingleQuote && !inDoubleQuote) {
        inBacktick = !inBacktick;
        continue;
      }

      if (inSingleQuote || inDoubleQuote || inBacktick) continue;

      if (pairs[char]) {
        stack.push({ char, line: l + 1, col: c + 1, index: c });
      } else if (closing[char]) {
        if (stack.length === 0) {
          bugs.push({
            id: `SYNTAX-${l + 1}-${c + 1}`,
            title: `Unmatched closing '${char}'`,
            type: 'Syntax',
            severity: 'Critical',
            certainty: 'Confirmed Error',
            confidence: 0.99,
            line: l + 1,
            column: c + 1,
            message: `Unexpected closing '${char}' without corresponding opening '${closing[char]}'.`,
            explanation: `An extra or misplaced '${char}' was found with no matching opening delimiter.`,
            whyProblem: 'Mismatched delimiters cause syntax parse errors and prevent code execution.',
            suggestedFix: `Remove or balance the closing '${char}'.`,
            codeSnippet: lineStr.trim(),
            source: 'Static Analyzer',
            ruleId: 'syntax/unmatched-delimiter'
          });
        } else {
          const top = stack.pop()!;
          if (pairs[top.char] !== char) {
            bugs.push({
              id: `SYNTAX-${l + 1}-${c + 1}`,
              title: `Mismatched bracket pair: opened '${top.char}', closed with '${char}'`,
              type: 'Syntax',
              severity: 'Critical',
              certainty: 'Confirmed Error',
              confidence: 0.99,
              line: l + 1,
              column: c + 1,
              message: `Mismatched '${top.char}' opened on line ${top.line} closed by '${char}' on line ${l + 1}.`,
              explanation: `Expected '${pairs[top.char]}' to close the opening '${top.char}' from line ${top.line}, but found '${char}'.`,
              whyProblem: 'Improper nesting breaks code structure and generates compilation/syntax failures.',
              suggestedFix: `Change '${char}' to '${pairs[top.char]}' or check delimiter placement.`,
              codeSnippet: lineStr.trim(),
              source: 'Static Analyzer',
              ruleId: 'syntax/mismatched-delimiter'
            });
          }
        }
      }
    }
  }

  while (stack.length > 0) {
    const unclosed = stack.pop()!;
    const rawLine = lines[unclosed.line - 1] || '';
    const closingChar = pairs[unclosed.char] || ')';
    bugs.push({
      id: `SYNTAX-${unclosed.line}-${unclosed.col}`,
      title: `Unclosed '${unclosed.char}'`,
      type: 'Syntax',
      severity: 'Critical',
      certainty: 'Confirmed Error',
      confidence: 0.98,
      line: unclosed.line,
      column: unclosed.col,
      message: `Unclosed delimiter '${unclosed.char}' opened on line ${unclosed.line}, col ${unclosed.col}.`,
      explanation: `The opening delimiter '${unclosed.char}' was never closed with '${closingChar}'.`,
      whyProblem: 'Unclosed blocks or parameter lists cause parse failure across remaining source lines.',
      suggestedFix: `Add closing '${closingChar}' at line ${unclosed.line}.`,
      codeSnippet: rawLine,
      fixedSnippet: rawLine.endsWith('\n') ? rawLine.slice(0, -1) + closingChar + '\n' : rawLine + closingChar,
      source: 'Static Analyzer',
      ruleId: 'syntax/unclosed-delimiter'
    });
  }

  return bugs;
}

/**
 * Calculates a realistic code health score between 0 and 100 based on detected issues.
 */
export function calculateHealthScore(bugs: DetectedBug[], linesOfCode: number): number {
  if (bugs.length === 0) return 100;
  
  let deductions = 0;
  for (const bug of bugs) {
    const confidenceWeight = bug.confidence || 0.8;
    switch (bug.severity) {
      case 'Critical':
        deductions += 25 * confidenceWeight;
        break;
      case 'High':
        deductions += 15 * confidenceWeight;
        break;
      case 'Medium':
        deductions += 8 * confidenceWeight;
        break;
      case 'Low':
        deductions += 3 * confidenceWeight;
        break;
      case 'Info':
        deductions += 1 * confidenceWeight;
        break;
    }
  }

  // Normalize by lines of code so large files aren't overly penalized for minor warnings
  const score = Math.max(0, Math.min(100, Math.round(100 - deductions)));
  return score;
}

/**
 * Generates an aggregated summary object from bug list.
 */
export function generateSummary(
  bugs: DetectedBug[],
  language: SupportedLanguage,
  code: string,
  engineUsed: string = 'Multi-Layer Static & AI Engine'
): AnalysisSummary {
  const linesOfCode = code.split('\n').filter(l => l.trim().length > 0).length;
  
  const summary: AnalysisSummary = {
    totalIssues: bugs.length,
    critical: bugs.filter(b => b.severity === 'Critical').length,
    high: bugs.filter(b => b.severity === 'High').length,
    medium: bugs.filter(b => b.severity === 'Medium').length,
    low: bugs.filter(b => b.severity === 'Low').length,
    info: bugs.filter(b => b.severity === 'Info').length,
    syntaxErrors: bugs.filter(b => b.type === 'Syntax').length,
    logicErrors: bugs.filter(b => b.type === 'Logical').length,
    securityIssues: bugs.filter(b => b.type === 'Security').length,
    runtimeRisks: bugs.filter(b => b.type === 'Runtime').length,
    semanticErrors: bugs.filter(b => b.type === 'Semantic').length,
    warnings: bugs.filter(b => b.certainty === 'Warning' || b.certainty === 'Suggestion').length,
    healthScore: calculateHealthScore(bugs, linesOfCode),
    analyzedAt: new Date().toISOString(),
    language,
    linesOfCode,
    engineUsed
  };

  return summary;
}

function getBugClusterKey(bug: DetectedBug): string {
  const line = bug.line;
  const text = `${bug.title} ${bug.message} ${bug.ruleId || ''} ${bug.cwe || ''}`.toLowerCase();
  
  if ((text.includes('colon') || text.includes("':'") || text.includes("expected ':'")) && !text.includes('semicolon')) return `${line}:syntax:colon`;
  if (text.includes('semicolon') || text.includes("';'")) return `${line}:syntax:semicolon`;
  if (text.includes('bracket') || text.includes('delimiter') || text.includes('parenthes') || text.includes('brace')) return `${line}:syntax:bracket`;
  if (text.includes('undef') || text.includes('undeclared') || text.includes('not defined')) return `${line}:semantic:undef`;
  if (text.includes('sqli') || text.includes('sql injection') || bug.cwe === 'CWE-89') return `${line}:security:sqli`;
  if (text.includes('xss') || text.includes('cross-site') || text.includes('innerhtml') || bug.cwe === 'CWE-79') return `${line}:security:xss`;
  if (text.includes('command injection') || bug.cwe === 'CWE-78') return `${line}:security:cmdi`;
  if (text.includes('buffer overflow') || text.includes('gets()') || bug.cwe === 'CWE-120' || bug.cwe === 'CWE-242') return `${line}:security:bof`;
  if (text.includes('format string') || bug.cwe === 'CWE-134') return `${line}:security:fmt`;
  if (text.includes('null') && (text.includes('pointer') || text.includes('dereference') || text.includes('access'))) return `${line}:runtime:null`;
  if (text.includes('use-after-free') || text.includes('after free') || bug.cwe === 'CWE-416') return `${line}:runtime:uaf`;
  if (text.includes('memory leak') || bug.cwe === 'CWE-401') return `${line}:runtime:memleak`;
  if (text.includes('divide by zero') || text.includes('division by zero')) return `${line}:runtime:divzero`;
  if (text.includes('nan comparison') || text.includes('isnan')) return `${line}:logic:nan`;
  if (text.includes('equals') || text.includes('string comparison')) return `${line}:logic:strequals`;
  if (text.includes('off-by-one') || text.includes('out of bounds') || text.includes('loop bound')) return `${line}:logic:bounds`;

  const norm = bug.title.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().split(/\s+/).slice(0, 3).join(' ');
  return `${line}:${bug.type}:${norm}`;
}

/**
 * Reconciles and deduplicates detected bugs across multiple analysis passes.
 * Retains the highest confidence, best explanation, fixed snippet, and severity.
 */
export function reconcileAndDeduplicateBugs(bugs: DetectedBug[]): DetectedBug[] {
  const severityWeight: Record<BugSeverity, number> = {
    Critical: 5,
    High: 4,
    Medium: 3,
    Low: 2,
    Info: 1
  };

  const certaintyWeight: Record<CertaintyLevel, number> = {
    'Confirmed Error': 4,
    'Potential Bug': 3,
    'Warning': 2,
    'Suggestion': 1
  };

  // Group bugs by line and canonical problem signature
  const groups = new Map<string, DetectedBug[]>();

  for (const bug of bugs) {
    const key = getBugClusterKey(bug);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(bug);
  }

  const result: DetectedBug[] = [];

  for (const [_, bugGroup] of groups) {
    if (bugGroup.length === 1) {
      result.push(bugGroup[0]);
      continue;
    }

    // Merge group into one best representation
    let best = bugGroup[0];

    for (let i = 1; i < bugGroup.length; i++) {
      const candidate = bugGroup[i];
      const bestScore = (severityWeight[best.severity] || 0) * 10 + (best.confidence || 0) * 5 + (certaintyWeight[best.certainty] || 0);
      const candScore = (severityWeight[candidate.severity] || 0) * 10 + (candidate.confidence || 0) * 5 + (certaintyWeight[candidate.certainty] || 0);

      if (candScore > bestScore) {
        // Carry over any fixedSnippet or ruleId if missing in candidate
        const merged: DetectedBug = {
          ...candidate,
          fixedSnippet: candidate.fixedSnippet || best.fixedSnippet,
          codeSnippet: candidate.codeSnippet || best.codeSnippet,
          cwe: candidate.cwe || best.cwe,
          column: candidate.column || best.column
        };
        best = merged;
      } else {
        // Best wins, but adopt fixedSnippet/cwe if missing
        if (!best.fixedSnippet && candidate.fixedSnippet) best.fixedSnippet = candidate.fixedSnippet;
        if (!best.cwe && candidate.cwe) best.cwe = candidate.cwe;
        if (!best.column && candidate.column) best.column = candidate.column;
      }
    }

    result.push(best);
  }

  // Secondary pass: if same line has identical title or rule, keep only the highest severity
  const lineTitleMap = new Map<string, DetectedBug>();
  const finalFiltered: DetectedBug[] = [];

  for (const b of result) {
    const key = `${b.line}:${b.ruleId || b.title.toLowerCase().slice(0, 20)}`;
    if (!lineTitleMap.has(key)) {
      lineTitleMap.set(key, b);
      finalFiltered.push(b);
    } else {
      const existing = lineTitleMap.get(key)!;
      if ((severityWeight[b.severity] || 0) > (severityWeight[existing.severity] || 0)) {
        const idx = finalFiltered.indexOf(existing);
        if (idx !== -1) {
          finalFiltered[idx] = b;
          lineTitleMap.set(key, b);
        }
      }
    }
  }

  return finalFiltered.sort((a, b) => a.line - b.line);
}

/**
 * Ensures bug line numbers are strictly mapped to non-empty lines containing real code.
 * Prevents bugs from ever pointing to trailing empty lines, whitespace-only lines, or out-of-range lines.
 */
export function alignAndValidateBugLines(bugs: DetectedBug[], code: string): DetectedBug[] {
  if (!code || bugs.length === 0) return bugs;
  const lines = code.split('\n');
  const validBugs: DetectedBug[] = [];

  for (const bug of bugs) {
    let lineNum = bug.line;
    if (typeof lineNum !== 'number' || isNaN(lineNum) || lineNum < 1) {
      lineNum = 1;
    }
    if (lineNum > lines.length) {
      lineNum = lines.length;
    }

    const currentLine = lines[lineNum - 1];

    // If the line is empty or only whitespace, re-align to the actual code line
    if (!currentLine || currentLine.trim() === '') {
      let matchedLine: number | null = null;

      // 1. If bug has a codeSnippet, search for the line that actually contains that snippet
      if (bug.codeSnippet && bug.codeSnippet.trim() !== '') {
        const snippetTrimmed = bug.codeSnippet.trim();
        for (let i = 0; i < lines.length; i++) {
          const lTrimmed = lines[i].trim();
          if (lTrimmed !== '' && (lines[i].includes(snippetTrimmed) || snippetTrimmed.includes(lTrimmed))) {
            matchedLine = i + 1;
            break;
          }
        }
      }

      // 2. If no snippet match, look backwards for the preceding non-empty line
      if (!matchedLine) {
        for (let prev = lineNum - 1; prev >= 1; prev--) {
          if (lines[prev - 1] && lines[prev - 1].trim() !== '') {
            matchedLine = prev;
            break;
          }
        }
      }

      // 3. If still nothing backwards, look forwards
      if (!matchedLine) {
        for (let next = lineNum + 1; next <= lines.length; next++) {
          if (lines[next - 1] && lines[next - 1].trim() !== '') {
            matchedLine = next;
            break;
          }
        }
      }

      if (matchedLine) {
        lineNum = matchedLine;
      }
    }

    // Only keep if the target line actually has real code (never report on blank lines)
    if (lines[lineNum - 1] && lines[lineNum - 1].trim() !== '') {
      validBugs.push({
        ...bug,
        line: lineNum,
        codeSnippet: bug.codeSnippet && bug.codeSnippet.trim() !== '' ? bug.codeSnippet : lines[lineNum - 1],
      });
    }
  }

  return validBugs;
}

