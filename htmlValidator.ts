import { ExecutionResult, CompilerDiagnostic } from '../sandbox/sandboxTypes';

// Void elements in HTML that should not have closing tags
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

function maskHtmlNonTagRegions(code: string): string {
  let result = code;
  result = result.replace(/<!--[\s\S]*?-->/g, (match) => {
    return '<!--' + match.slice(4, -3).replace(/[^\n]/g, ' ') + '-->';
  });
  result = result.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (_, open, content, close) => {
    return open + content.replace(/[^\n]/g, ' ') + close;
  });
  result = result.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, open, content, close) => {
    return open + content.replace(/[^\n]/g, ' ') + close;
  });
  return result;
}

export function validateHtmlStructure(htmlCode: string): ExecutionResult {
  const startTime = Date.now();
  const diagnostics: CompilerDiagnostic[] = [];
  const lines = htmlCode.split('\n');

  // 1. Tag matching stack
  interface OpenTag {
    name: string;
    line: number;
    col: number;
  }
  const tagStack: OpenTag[] = [];

  // Track IDs for duplicate detection
  const seenIds = new Map<string, number>();

  lines.forEach((lineText, lineIdx) => {
    const lineNum = lineIdx + 1;

    // Check for duplicate IDs
    const idMatches = lineText.matchAll(/\bid=["']([^"']+)["']/g);
    for (const idMatch of idMatches) {
      const idVal = idMatch[1];
      if (seenIds.has(idVal)) {
        diagnostics.push({
          line: lineNum,
          column: idMatch.index,
          severity: 'error',
          message: `Duplicate HTML ID attribute "${idVal}" (previously declared at line ${seenIds.get(idVal)}). IDs must be document-unique.`,
          codeSnippet: lineText.trim(),
          raw: lineText,
        });
      } else {
        seenIds.set(idVal, lineNum);
      }
    }

    // Check for accessibility: img missing alt
    if (/<img\b/i.test(lineText) && !/\balt=["']/i.test(lineText)) {
      diagnostics.push({
        line: lineNum,
        severity: 'warning',
        message: 'Accessibility defect: <img> element is missing required alt attribute for screen-readers (WCAG 2.1).',
        codeSnippet: lineText.trim(),
        raw: lineText,
      });
    }

    // Check for unencoded entities in raw text (outside script/style tags)
    if (/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(lineText) && !lineText.includes('<script') && !lineText.includes('<style')) {
      diagnostics.push({
        line: lineNum,
        severity: 'warning',
        message: 'Bare unescaped ampersand "&" in HTML text. Use "&amp;" entity.',
        codeSnippet: lineText.trim(),
        raw: lineText,
      });
    }
  });

  // 2. Precision document-wide tag matching with comment/script masking
  const maskedCode = maskHtmlNonTagRegions(htmlCode);
  const tagRegex = /<(\/?)([a-zA-Z0-9\-]+)([^>]*)>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(maskedCode)) !== null) {
    const isClosing = match[1] === '/';
    const tagName = match[2].toLowerCase();
    const isSelfClosing = match[3].trim().endsWith('/') || VOID_ELEMENTS.has(tagName);
    const lineNum = htmlCode.slice(0, match.index).split('\n').length;
    const colNum = match.index - htmlCode.lastIndexOf('\n', match.index);

    if (VOID_ELEMENTS.has(tagName) || tagName.startsWith('!')) {
      if (isClosing && VOID_ELEMENTS.has(tagName)) {
        diagnostics.push({
          line: lineNum,
          column: colNum,
          severity: 'error',
          message: `Void element <${tagName}> must not have a closing tag </${tagName}>.`,
          codeSnippet: lines[lineNum - 1]?.trim() || '',
          raw: match[0],
        });
      }
      continue;
    }

    if (isClosing) {
      if (tagStack.length === 0) {
        diagnostics.push({
          line: lineNum,
          column: colNum,
          severity: 'error',
          message: `Unexpected closing tag </${tagName}> without matching opening tag.`,
          codeSnippet: lines[lineNum - 1]?.trim() || '',
          raw: match[0],
        });
      } else {
        const lastTag = tagStack[tagStack.length - 1];
        if (lastTag.name === tagName) {
          tagStack.pop();
        } else {
          // Search up the stack to find matching ancestor
          const ancestorIdx = tagStack.slice(0, -1).map(t => t.name).lastIndexOf(tagName);
          if (ancestorIdx !== -1) {
            // Elements above ancestorIdx were left unclosed before this tag closed
            const unclosedTags = tagStack.splice(ancestorIdx + 1);
            tagStack.pop(); // Pop the matching ancestor tag as well

            for (const unclosed of unclosedTags) {
              diagnostics.push({
                line: unclosed.line,
                column: unclosed.col,
                severity: 'error',
                message: `Unclosed tag <${unclosed.name}> opened at line ${unclosed.line} was never closed before </${tagName}> on line ${lineNum}.`,
                codeSnippet: lines[unclosed.line - 1]?.trim() || '',
                raw: `<${unclosed.name}>`,
              });
            }
          } else {
            // Stray closing tag with no matching opening tag
            diagnostics.push({
              line: lineNum,
              column: colNum,
              severity: 'error',
              message: `Unexpected closing tag </${tagName}> without matching opening tag.`,
              codeSnippet: lines[lineNum - 1]?.trim() || '',
              raw: match[0],
            });
            // Do not pop from tagStack to avoid cascading false errors
          }
        }
      }
    } else if (!isSelfClosing) {
      tagStack.push({ name: tagName, line: lineNum, col: colNum });
    }
  }

  // Report unclosed tags remaining on stack at document end
  for (const unclosed of tagStack) {
    diagnostics.push({
      line: unclosed.line,
      column: unclosed.col,
      severity: 'error',
      message: `Unclosed tag <${unclosed.name}> opened at line ${unclosed.line} was never closed.`,
      codeSnippet: lines[unclosed.line - 1]?.trim() || '',
      raw: `<${unclosed.name}>`,
    });
  }

  const hasErrors = diagnostics.some((d) => d.severity === 'error');
  const executionTimeMs = Date.now() - startTime;

  return {
    success: !hasErrors,
    status: hasErrors ? 'COMPILE_ERROR' : 'SUCCESS',
    exitCode: hasErrors ? 1 : 0,
    stdout: `HTML DOM Validation: ${diagnostics.length} issue(s) detected.`,
    stderr: diagnostics.map((d) => `Line ${d.line}: [${d.severity.toUpperCase()}] ${d.message}`).join('\n'),
    compilationOutput: hasErrors
      ? `HTML validation failed with ${diagnostics.length} structural defect(s).`
      : 'HTML DOM structure and markup validation passed.',
    diagnostics,
    executionTimeMs,
    timedOut: false,
    resourceLimitReached: false,
    toolUsed: 'htmlParser',
    toolAvailable: true,
  };
}
