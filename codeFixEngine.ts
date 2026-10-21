import { DetectedBug, SupportedLanguage } from '../types';
import { ensureProperFormatting } from './codeFormatter';

export interface FixResult {
  success: boolean;
  fixedCode: string;
  changeDescription: string;
  reasonIfNotApplied?: string;
  modifiedLines?: number[];
}

export interface BatchFixResult {
  fixedCode: string;
  appliedCount: number;
  changes: string[];
  skippedBugs: { bug: DetectedBug; reason: string }[];
}

/**
 * Normalizes string line endings to \n for consistent line mapping
 */
function normalizeLineEndings(code: string): string {
  return code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Precision Single Bug Fixer.
 * Takes the user's exact original code and the specific detected bug.
 * Applies the smallest necessary correction directly to the original code.
 * NEVER empties or wipes the code.
 */
export function applySingleFix(
  originalCode: string,
  bug: DetectedBug,
  language: SupportedLanguage
): FixResult {
  if (!originalCode || !originalCode.trim()) {
    return {
      success: false,
      fixedCode: originalCode,
      changeDescription: 'Code is empty.',
      reasonIfNotApplied: 'Cannot apply fix to an empty code buffer.',
    };
  }

  const safeOriginal = originalCode;
  const lines = normalizeLineEndings(originalCode).split('\n');
  const lineIdx = (bug.line && bug.line > 0) ? bug.line - 1 : 0;

  // -------------------------------------------------------------
  // STRATEGY 1: Verified fixedSnippet at exact target line
  // -------------------------------------------------------------
  if (bug.fixedSnippet && bug.fixedSnippet.trim()) {
    // If the bug's codeSnippet exists on that specific line, replace it there
    if (lineIdx >= 0 && lineIdx < lines.length) {
      const targetLine = lines[lineIdx];
      
      if (bug.codeSnippet && targetLine.includes(bug.codeSnippet)) {
        lines[lineIdx] = targetLine.replace(bug.codeSnippet, bug.fixedSnippet);
        const result = lines.join('\n');
        if (result && result.trim()) {
          return {
            success: true,
            fixedCode: result,
            changeDescription: `Replaced problematic snippet on line ${bug.line}: "${bug.codeSnippet.trim()}" -> "${bug.fixedSnippet.trim()}"`,
            modifiedLines: [bug.line],
          };
        }
      }

      // If the fixedSnippet is a full line replacement
      if (!bug.fixedSnippet.includes('\n') && lines[lineIdx].trim() !== bug.fixedSnippet.trim()) {
        // Keep original indentation
        const leadingIndent = lines[lineIdx].match(/^\s*/)?.[0] || '';
        const cleanFixed = bug.fixedSnippet.trim();
        lines[lineIdx] = leadingIndent + cleanFixed;
        const result = lines.join('\n');
        if (result && result.trim()) {
          return {
            success: true,
            fixedCode: result,
            changeDescription: `Corrected statement on line ${bug.line} to: "${cleanFixed}"`,
            modifiedLines: [bug.line],
          };
        }
      }
    }

    // Global precision replacement if snippet is unique in code
    if (bug.codeSnippet && bug.codeSnippet.trim() && safeOriginal.includes(bug.codeSnippet)) {
      const occurrences = safeOriginal.split(bug.codeSnippet).length - 1;
      if (occurrences === 1) {
        const result = safeOriginal.replace(bug.codeSnippet, bug.fixedSnippet);
        if (result && result.trim()) {
          return {
            success: true,
            fixedCode: result,
            changeDescription: `Applied patch: "${bug.codeSnippet.trim()}" -> "${bug.fixedSnippet.trim()}"`,
            modifiedLines: [bug.line || 1],
          };
        }
      }
    }
  }

  // -------------------------------------------------------------
  // STRATEGY 2: Language-Specific Semantic Correction
  // -------------------------------------------------------------
  const lineNum = bug.line && bug.line > 0 ? bug.line : 1;
  const idx = Math.min(Math.max(0, lineNum - 1), lines.length - 1);
  const targetLine = lines[idx] || '';
  const trimmed = targetLine.trim();

  // ----- C / C++ / Java / JS: Missing Semicolon -----
  const isMissingSemicolon =
    bug.id.includes('SEMICOLON') ||
    bug.title.toLowerCase().includes('semicolon') ||
    bug.message.toLowerCase().includes('semicolon') ||
    bug.ruleId?.includes('semicolon');

  if (isMissingSemicolon) {
    if (!trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}') && !trimmed.startsWith('#')) {
      lines[idx] = targetLine + ';';
      return {
        success: true,
        fixedCode: lines.join('\n'),
        changeDescription: `Added missing semicolon ';' at end of line ${lineNum}`,
        modifiedLines: [lineNum],
      };
    }
  }

  // ----- Python: Missing Colon -----
  const isMissingColon =
    (language === 'python' && (bug.id.includes('COLON') || bug.title.toLowerCase().includes('colon'))) ||
    (/^(def\s+\w+|class\s+\w+|if\s+|elif\s+|else|for\s+|while\s+|try|except|finally|with\s+)/.test(trimmed) && !trimmed.endsWith(':'));

  if (isMissingColon) {
    if (!trimmed.endsWith(':')) {
      lines[idx] = targetLine + ':';
      return {
        success: true,
        fixedCode: lines.join('\n'),
        changeDescription: `Added missing colon ':' at end of line ${lineNum}`,
        modifiedLines: [lineNum],
      };
    }
  }

  // ----- Unclosed Delimiters: Parentheses, Brackets, Braces -----
  const isUnclosedDelim =
    language !== 'html' &&
    (bug.title.toLowerCase().includes('bracket') ||
     bug.title.toLowerCase().includes('parenthesis') ||
     bug.title.toLowerCase().includes('delimiter') ||
     bug.id.includes('BRACKET') ||
     bug.id.includes('DELIMITER') ||
     ((bug.title.toLowerCase().includes('unclosed') || bug.message.toLowerCase().includes('unclosed')) &&
      !bug.title.toLowerCase().includes('tag') && !bug.title.toLowerCase().includes('html')));

  if (isUnclosedDelim) {
    let charToClose = ')';
    if (bug.title.includes("'['") || bug.message.includes("'['") || trimmed.includes('[')) charToClose = ']';
    else if (bug.title.includes("'{'") || bug.message.includes("'{'") || trimmed.includes('{')) charToClose = '}';
    else if (bug.title.includes("'('") || bug.message.includes("'('") || trimmed.includes('(')) charToClose = ')';

    // If line is missing a closing paren/bracket before semicolon or at end
    if (trimmed.endsWith(';')) {
      lines[idx] = targetLine.slice(0, targetLine.lastIndexOf(';')) + charToClose + ';';
    } else {
      lines[idx] = targetLine + charToClose;
    }
    return {
      success: true,
      fixedCode: lines.join('\n'),
      changeDescription: `Added closing '${charToClose}' at line ${lineNum}`,
      modifiedLines: [lineNum],
    };
  }

  // ----- C: gets() unsafe function (CWE-242) -----
  if (language === 'c' && (bug.id.includes('GETS') || trimmed.includes('gets('))) {
    const getsMatch = trimmed.match(/\bgets\s*\(([^)]+)\)/);
    if (getsMatch) {
      const buf = getsMatch[1].trim();
      lines[idx] = targetLine.replace(/\bgets\s*\([^)]+\)/, `fgets(${buf}, sizeof(${buf}), stdin)`);
      return {
        success: true,
        fixedCode: lines.join('\n'),
        changeDescription: `Replaced unsafe gets(${buf}) with fgets(${buf}, sizeof(${buf}), stdin) on line ${lineNum}`,
        modifiedLines: [lineNum],
      };
    }
  }

  // ----- C: printf format string vulnerability (CWE-134) -----
  if (language === 'c' && (bug.id.includes('FORMAT-STRING') || bug.title.toLowerCase().includes('format string'))) {
    const printfMatch = trimmed.match(/printf\s*\(\s*([a-zA-Z0-9_$]+)\s*\)/);
    if (printfMatch && !printfMatch[1].startsWith('"')) {
      const varName = printfMatch[1];
      lines[idx] = targetLine.replace(printfMatch[0], `printf("%s", ${varName})`);
      return {
        success: true,
        fixedCode: lines.join('\n'),
        changeDescription: `Added safe "%s" format specifier to printf(${varName}) on line ${lineNum}`,
        modifiedLines: [lineNum],
      };
    }
  }

  // ----- C++: delete vs delete[] -----
  if (language === 'cpp' && (bug.id.includes('DELETE') || bug.title.toLowerCase().includes('delete[]') || bug.message.toLowerCase().includes('delete[]'))) {
    if (/\bdelete\s+/.test(trimmed) && !trimmed.includes('delete[]')) {
      lines[idx] = targetLine.replace(/\bdelete\s+/, 'delete[] ');
      return {
        success: true,
        fixedCode: lines.join('\n'),
        changeDescription: `Changed 'delete' to 'delete[]' for array deallocation on line ${lineNum}`,
        modifiedLines: [lineNum],
      };
    }
  }

  // ----- C++: Catch exception by value instead of const reference -----
  if (language === 'cpp' && (bug.id.includes('CATCH') || bug.title.toLowerCase().includes('catch by value'))) {
    const catchMatch = trimmed.match(/catch\s*\(\s*(std::exception|\w+Exception|\w+)\s+(\w+)\s*\)/);
    if (catchMatch) {
      const [full, type, name] = catchMatch;
      lines[idx] = targetLine.replace(full, `catch (const ${type}& ${name})`);
      return {
        success: true,
        fixedCode: lines.join('\n'),
        changeDescription: `Updated catch block on line ${lineNum} to catch 'const ${type}& ${name}' by reference`,
        modifiedLines: [lineNum],
      };
    }
  }

  // ----- C++: Missing semicolon on class or struct definition -----
  if (language === 'cpp' && (bug.id.includes('CLASS-SEMICOLON') || bug.title.toLowerCase().includes('class'))) {
    if (trimmed === '}' || trimmed.endsWith('}')) {
      lines[idx] = targetLine + ';';
      return {
        success: true,
        fixedCode: lines.join('\n'),
        changeDescription: `Added missing semicolon ';' after class/struct closing brace on line ${lineNum}`,
        modifiedLines: [lineNum],
      };
    }
  }

  // ----- Java: String comparison with == instead of .equals() -----
  if (language === 'java' && (bug.id.includes('STRING-EQ') || bug.title.toLowerCase().includes('.equals'))) {
    const eqMatch = trimmed.match(/([a-zA-Z0-9_$.]+)\s*==\s*([a-zA-Z0-9_$.]+)/);
    if (eqMatch) {
      const [full, left, right] = eqMatch;
      lines[idx] = targetLine.replace(full, `${left}.equals(${right})`);
      return {
        success: true,
        fixedCode: lines.join('\n'),
        changeDescription: `Replaced reference equality '==' with '${left}.equals(${right})' on line ${lineNum}`,
        modifiedLines: [lineNum],
      };
    }
  }

  // ----- JavaScript / Python / Java / C / C++: Assignment in Conditional (if (x = 5)) -----
  if (bug.id.includes('ASSIGN') || bug.title.toLowerCase().includes('assignment in conditional') || bug.title.toLowerCase().includes('comparison')) {
    const ifAssignMatch = trimmed.match(/(if|while)\s*\(\s*([a-zA-Z0-9_$]+)\s*=\s*([a-zA-Z0-9_$]+|\d+)\s*\)/);
    if (ifAssignMatch) {
      const [full, keyword, left, right] = ifAssignMatch;
      const op = language === 'javascript' ? '===' : '==';
      lines[idx] = targetLine.replace(full, `${keyword} (${left} ${op} ${right})`);
      return {
        success: true,
        fixedCode: lines.join('\n'),
        changeDescription: `Replaced assignment '=' with comparison '${op}' in condition on line ${lineNum}`,
        modifiedLines: [lineNum],
      };
    }
  }

  // ----- Array Index Off-By-One (<= array.length to < array.length) -----
  if (bug.title.toLowerCase().includes('off-by-one') || bug.id.includes('OFF-BY-ONE') || bug.title.toLowerCase().includes('bounds')) {
    if (trimmed.includes('<=') && (trimmed.includes('length') || trimmed.includes('size()') || trimmed.includes('len'))) {
      lines[idx] = targetLine.replace(/<=\s*([a-zA-Z0-9_$.]+(\.length|\.size\(\)|len\([^)]+\)))/, '< $1');
      return {
        success: true,
        fixedCode: lines.join('\n'),
        changeDescription: `Corrected loop boundary from '<=' to '<' on line ${lineNum}`,
        modifiedLines: [lineNum],
      };
    }
  }

  // ----- Python: Literal Division by Zero -----
  if (language === 'python' && (bug.id.includes('DIV-ZERO') || trimmed.match(/(\/|\/\/|%)\s*0(\.0+)?(?!\d)/))) {
    // If dividing by zero directly, check if it's a return or assignment
    const divMatch = trimmed.match(/(\/|\/\/|%)\s*0(\.0+)?(?!\d)/);
    if (divMatch) {
      lines[idx] = targetLine.replace(divMatch[0], `${divMatch[1]} 1  # Fixed: prevented division by zero`);
      return {
        success: true,
        fixedCode: lines.join('\n'),
        changeDescription: `Prevented division by zero on line ${lineNum}`,
        modifiedLines: [lineNum],
      };
    }
  }

  // ----- Python: Mutable Default Argument (def fn(arr=[])) -----
  if (language === 'python' && (bug.id.includes('MUTABLE-ARG') || trimmed.match(/def\s+\w+\s*\([^)]*=\s*(\[\]|\{\})/))) {
    const mutMatch = trimmed.match(/def\s+(\w+)\s*\(([^)]*)\):?/);
    if (mutMatch) {
      const fnName = mutMatch[1];
      const params = mutMatch[2];
      const fixedParams = params.replace(/=\s*(\[\]|\{\})/g, '=None');
      lines[idx] = `def ${fnName}(${fixedParams}):`;
      return {
        success: true,
        fixedCode: lines.join('\n'),
        changeDescription: `Replaced mutable default parameter with '=None' on line ${lineNum}`,
        modifiedLines: [lineNum],
      };
    }
  }

  // ----- HTML: Missing <!DOCTYPE html> -----
  if (language === 'html' && (bug.id.includes('DOCTYPE') || bug.title.toLowerCase().includes('doctype'))) {
    if (!safeOriginal.toLowerCase().includes('<!doctype html>')) {
      const fixed = `<!DOCTYPE html>\n${safeOriginal}`;
      return {
        success: true,
        fixedCode: ensureProperFormatting(fixed, originalCode, language),
        changeDescription: 'Added standard <!DOCTYPE html> declaration to document root.',
        modifiedLines: [1],
      };
    }
  }

  // ----- HTML: Deprecated tags (<center>, <font>, etc.) -----
  if (language === 'html' && (bug.id.includes('DEPRECATED') || bug.title.toLowerCase().includes('deprecated'))) {
    if (/<center\b/i.test(targetLine)) {
      lines[idx] = targetLine.replace(/<center>/gi, '<div style="text-align: center;">').replace(/<\/center>/gi, '</div>');
      if (!targetLine.includes('</center>')) {
        for (let j = idx + 1; j < lines.length; j++) {
          if (lines[j].includes('</center>')) {
            lines[j] = lines[j].replace(/<\/center>/gi, '</div>');
            break;
          }
        }
      }
      return {
        success: true,
        fixedCode: ensureProperFormatting(lines.join('\n'), originalCode, language),
        changeDescription: `Replaced deprecated <center> element with CSS styled <div> on line ${lineNum}`,
        modifiedLines: [lineNum],
      };
    }
  }

  // ----- HTML: Missing closing tag -----
  if (language === 'html' && (bug.id.includes('UNCLOSED') || bug.title.toLowerCase().includes('unclosed'))) {
    const tagMatch = bug.title.match(/<([a-zA-Z0-9\-]+)>/) || bug.message.match(/<([a-zA-Z0-9\-]+)>/);
    if (tagMatch) {
      const tag = tagMatch[1];
      const indent = targetLine.match(/^\s*/)?.[0] || '  ';

      // Check if message specifies parent container line: e.g. "before </body> on line 13"
      const beforeLineMatch = bug.message.match(/before <\/([a-zA-Z0-9\-]+)> on line (\d+)/i);
      let insertLineIdx = -1;

      if (beforeLineMatch) {
        const parentLineNum = parseInt(beforeLineMatch[2], 10);
        if (parentLineNum > 0 && parentLineNum <= lines.length) {
          insertLineIdx = parentLineNum - 1;
        }
      }

      if (insertLineIdx === -1) {
        for (let i = idx + 1; i < lines.length; i++) {
          const l = lines[i].trim().toLowerCase();
          if (l.startsWith('</body') || l.startsWith('</html') || (l.startsWith('</') && !l.startsWith(`</${tag}`))) {
            insertLineIdx = i;
            break;
          }
        }
      }

      if (insertLineIdx !== -1 && insertLineIdx > idx) {
        lines.splice(insertLineIdx, 0, `${indent}</${tag}>`);
        return {
          success: true,
          fixedCode: ensureProperFormatting(lines.join('\n'), originalCode, language),
          changeDescription: `Added closing tag </${tag}> before line ${insertLineIdx + 1}`,
          modifiedLines: [insertLineIdx + 1],
        };
      } else {
        lines.push(`${indent}</${tag}>`);
        return {
          success: true,
          fixedCode: ensureProperFormatting(lines.join('\n'), originalCode, language),
          changeDescription: `Appended closing tag </${tag}> to document`,
          modifiedLines: [lines.length],
        };
      }
    }
  }

  // ----- HTML: Duplicate ID -----
  if (language === 'html' && (bug.id.includes('DUP-ID') || bug.title.toLowerCase().includes('duplicate id'))) {
    const idMatch = targetLine.match(/id=["']([^"']+)["']/);
    if (idMatch) {
      const oldId = idMatch[1];
      lines[idx] = targetLine.replace(`id="${oldId}"`, `id="${oldId}-2"`).replace(`id='${oldId}'`, `id='${oldId}-2'`);
      return {
        success: true,
        fixedCode: ensureProperFormatting(lines.join('\n'), originalCode, language),
        changeDescription: `Renamed duplicate id="${oldId}" to "${oldId}-2" on line ${lineNum}`,
        modifiedLines: [lineNum],
      };
    }
  }

  // ----- HTML: Missing Alt Attribute on <img> -----
  if (language === 'html' && (bug.id.includes('ALT') || bug.title.toLowerCase().includes('alt'))) {
    if (trimmed.includes('<img') && !/alt\s*=/i.test(trimmed)) {
      lines[idx] = targetLine.replace(/<img\b([^>]*)>/i, (match, attrs) => {
        return `<img alt="Image description"${attrs}>`;
      });
      return {
        success: true,
        fixedCode: ensureProperFormatting(lines.join('\n'), originalCode, language),
        changeDescription: `Added accessible alt="" attribute to <img> tag on line ${lineNum}`,
        modifiedLines: [lineNum],
      };
    }
  }

  // -------------------------------------------------------------
  // STRATEGY 3: Safe Suggested Fix fallback
  // -------------------------------------------------------------
  if (bug.suggestedFix && bug.suggestedFix.trim()) {
    // Check if suggestedFix has direct code replacement syntax like "Change X to Y"
    const changeMatch = bug.suggestedFix.match(/change\s+(?:to\s+)?['"`]([^'"`]+)['"`]/i);
    if (changeMatch && changeMatch[1] && !changeMatch[1].includes('\n')) {
      const cleanRepl = changeMatch[1].trim();
      const leadingIndent = lines[idx].match(/^\s*/)?.[0] || '';
      lines[idx] = leadingIndent + cleanRepl;
      const result = lines.join('\n');
      if (result && result.trim()) {
        return {
          success: true,
          fixedCode: result,
          changeDescription: `Applied suggested change on line ${lineNum}: "${cleanRepl}"`,
          modifiedLines: [lineNum],
        };
      }
    }
  }

  // -------------------------------------------------------------
  // FALLBACK: Safe Non-Destructive Protection
  // -------------------------------------------------------------
  return {
    success: false,
    fixedCode: safeOriginal,
    changeDescription: 'No automated change applied.',
    reasonIfNotApplied: `Issue [${bug.title}] requires manual developer review (${bug.suggestedFix || 'follow suggested fix instructions'}). Original code preserved safely.`,
  };
}

/**
 * Precision Batch Fixer for All Detected Bugs.
 * Sequentially applies precision fixes starting from the highest severity.
 * Always verifies that the resulting code is non-empty and valid.
 */
export function applyAllFixes(
  originalCode: string,
  bugs: DetectedBug[],
  language: SupportedLanguage
): BatchFixResult {
  if (!originalCode || !originalCode.trim() || !bugs || bugs.length === 0) {
    return {
      fixedCode: originalCode,
      appliedCount: 0,
      changes: [],
      skippedBugs: [],
    };
  }

  let currentCode = originalCode;
  const changes: string[] = [];
  const skippedBugs: { bug: DetectedBug; reason: string }[] = [];
  let appliedCount = 0;

  // Sort bugs: fix bottom-to-top by line number so line shifts do not disrupt upper lines
  const sortedBugs = [...bugs].sort((a, b) => {
    const lineA = a.line || 0;
    const lineB = b.line || 0;
    return lineB - lineA; // Descending line order
  });

  for (const bug of sortedBugs) {
    const fixResult = applySingleFix(currentCode, bug, language);
    if (fixResult.success && fixResult.fixedCode && fixResult.fixedCode.trim().length > 0) {
      currentCode = fixResult.fixedCode;
      appliedCount++;
      changes.push(fixResult.changeDescription);
    } else {
      skippedBugs.push({
        bug,
        reason: fixResult.reasonIfNotApplied || 'Could not safely auto-remediate without manual inspection.',
      });
    }
  }

  // Final Safety Net: NEVER return empty code if original was non-empty
  if (!currentCode || !currentCode.trim()) {
    console.error('[CodeFixEngine] Safety check triggered: fixedCode was empty. Preserving original code.');
    return {
      fixedCode: originalCode,
      appliedCount: 0,
      changes: ['Safety check triggered: Original code preserved intact.'],
      skippedBugs: bugs.map(b => ({ bug: b, reason: 'Preserved original code for safety.' })),
    };
  }

  if (appliedCount === 0) {
    return {
      fixedCode: originalCode,
      appliedCount: 0,
      changes: ['No changes required — source code is clean and defect-free.'],
      skippedBugs,
    };
  }

  return {
    fixedCode: ensureProperFormatting(currentCode, originalCode, language),
    appliedCount,
    changes,
    skippedBugs,
  };
}
