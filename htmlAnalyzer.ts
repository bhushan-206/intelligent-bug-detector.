import { DetectedBug } from '../types';

/**
 * Masks comments, script blocks, and style blocks with space characters,
 * preserving exact string lengths, line breaks, and column offsets.
 */
function maskHtmlNonTagRegions(code: string): string {
  let result = code;
  // 1. Comments: <!-- ... -->
  result = result.replace(/<!--[\s\S]*?-->/g, (match) => {
    return '<!--' + match.slice(4, -3).replace(/[^\n]/g, ' ') + '-->';
  });
  // 2. Scripts: <script[^>]*>...</script>
  result = result.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (_, open, content, close) => {
    return open + content.replace(/[^\n]/g, ' ') + close;
  });
  // 3. Styles: <style[^>]*>...</style>
  result = result.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, open, content, close) => {
    return open + content.replace(/[^\n]/g, ' ') + close;
  });
  return result;
}

export function analyzeHtmlCode(code: string): DetectedBug[] {
  const bugs: DetectedBug[] = [];
  const lines = code.split('\n');

  // 1. Check for DOCTYPE if document looks like a full page
  const hasHtmlTag = /<html\b/i.test(code);
  const hasDoctype = /<!doctype\s+html>/i.test(code);
  if (hasHtmlTag && !hasDoctype) {
    bugs.push({
      id: 'HTML-SYNTAX-NO-DOCTYPE-1',
      title: 'Missing <!DOCTYPE html> Declaration',
      type: 'Syntax',
      severity: 'Low',
      certainty: 'Warning',
      confidence: 0.95,
      line: 1,
      message: 'HTML5 documents should start with <!DOCTYPE html> to prevent quirks mode rendering.',
      explanation: 'Without a DOCTYPE declaration, modern browsers may switch to quirks mode, causing inconsistent rendering and CSS box model bugs.',
      whyProblem: 'Quirks mode alters the CSS box-sizing and layout algorithms unpredictably across browsers.',
      suggestedFix: 'Prepend <!DOCTYPE html> to the very first line of the document.',
      codeSnippet: lines[0] || '',
      fixedSnippet: '<!DOCTYPE html>\n' + (lines[0] || ''),
      source: 'Static Analyzer',
      ruleId: 'html/doctype-required',
    });
  }

  // 2. Tag balancing and unclosed tags inspection
  const voidTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]);

  const deprecatedTags = new Set([
    'center', 'font', 'marquee', 'blink', 'strike', 'big', 'tt', 'frameset', 'frame', 'applet'
  ]);

  const idMap = new Map<string, number>();

  lines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    const trimmed = rawLine.trim();

    // Check deprecated tags
    deprecatedTags.forEach((depTag) => {
      const depRegex = new RegExp(`<${depTag}\\b`, 'i');
      if (depRegex.test(trimmed)) {
        bugs.push({
          id: `HTML-DEPRECATED-TAG-${lineNum}-${depTag}`,
          title: `Deprecated HTML Element <${depTag}>`,
          type: 'Semantic',
          severity: 'Medium',
          certainty: 'Confirmed Error',
          confidence: 0.98,
          line: lineNum,
          message: `The <${depTag}> element is obsolete and deprecated in HTML5.`,
          explanation: `Modern web standards prohibit the use of <${depTag}>. Styling should be achieved via CSS.`,
          whyProblem: 'Deprecated elements may be unsupported or poorly rendered in modern user agents.',
          suggestedFix: `Replace <${depTag}> with modern semantic HTML elements and CSS classes.`,
          codeSnippet: rawLine,
          source: 'Static Analyzer',
          ruleId: 'html/no-deprecated-tags',
        });
      }
    });

    // Check missing alt attribute on img
    const imgRegex = /<img\b([^>]*)>/gi;
    let imgMatch: RegExpExecArray | null;
    while ((imgMatch = imgRegex.exec(rawLine)) !== null) {
      const attrs = imgMatch[1];
      if (!/\balt\s*=/i.test(attrs)) {
        bugs.push({
          id: `HTML-A11Y-IMG-NO-ALT-${lineNum}`,
          title: 'Image Missing alt Attribute',
          type: 'Semantic',
          severity: 'Medium',
          certainty: 'Confirmed Error',
          confidence: 0.95,
          line: lineNum,
          message: '<img> element is missing an "alt" text attribute.',
          explanation: 'The alt attribute provides alternative text for screen readers and search engines when images fail to load.',
          whyProblem: 'Fails WCAG 2.1 accessibility criteria and impairs screen-reader users.',
          suggestedFix: 'Add a descriptive alt="..." attribute (e.g. <img src="..." alt="Description" />).',
          codeSnippet: rawLine,
          source: 'Static Analyzer',
          ruleId: 'html/img-alt-required',
        });
      }
    }

    // Check dangerous inline event handlers (XSS vector)
    const dangerousInline = /\bon(load|error|click|mouseover|submit|keydown|keyup)\s*=\s*["'][^"']*["']/i;
    if (dangerousInline.test(trimmed) && /eval|alert|document\.cookie|window\.location/i.test(trimmed)) {
      bugs.push({
        id: `HTML-SEC-INLINE-EXEC-${lineNum}`,
        title: 'Dangerous Inline JavaScript Execution in HTML',
        type: 'Security',
        severity: 'High',
        certainty: 'Warning',
        confidence: 0.92,
        line: lineNum,
        message: 'Potentially unsafe inline script execution in HTML attribute.',
        explanation: 'Inline event handlers containing dynamic evaluations or document access create Cross-Site Scripting (XSS) risks.',
        whyProblem: 'Violates Content Security Policy (CSP) best practices and invites injection attacks.',
        suggestedFix: 'Separate JavaScript logic into external event listeners using addEventListener.',
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'html/no-inline-script-events',
        cwe: 'CWE-79',
      });
    }

    // Check Duplicate IDs
    const idAttrRegex = /\bid\s*=\s*["']([^"']+)["']/gi;
    let idMatch: RegExpExecArray | null;
    while ((idMatch = idAttrRegex.exec(rawLine)) !== null) {
      const idVal = idMatch[1];
      if (idMap.has(idVal)) {
        const firstLine = idMap.get(idVal)!;
        bugs.push({
          id: `HTML-DUPLICATE-ID-${lineNum}-${idVal}`,
          title: `Duplicate HTML ID Attribute '${idVal}'`,
          type: 'Semantic',
          severity: 'High',
          certainty: 'Confirmed Error',
          confidence: 0.99,
          line: lineNum,
          message: `ID '${idVal}' is already defined on line ${firstLine}. IDs must be unique per document.`,
          explanation: 'HTML specifications require every id attribute to be globally unique within the DOM tree.',
          whyProblem: 'document.getElementById() and querySelector() will only locate the first element, breaking script bindings.',
          suggestedFix: `Assign a unique identifier or switch to a class attribute (class="${idVal}").`,
          codeSnippet: rawLine,
          source: 'Static Analyzer',
          ruleId: 'html/unique-ids',
        });
      } else {
        idMap.set(idVal, lineNum);
      }
    }
  });

  // 3. Document-wide precision unclosed tag checker with comment/script masking
  const maskedCode = maskHtmlNonTagRegions(code);
  const tagStack: { tag: string; line: number; raw: string }[] = [];
  const tagRegex = /<(\/?)([\w-]+)([^>]*)>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(maskedCode)) !== null) {
    const isClosing = match[1] === '/';
    const tagName = match[2].toLowerCase();
    const isSelfClosing = match[3].trim().endsWith('/') || voidTags.has(tagName);
    const lineNum = code.slice(0, match.index).split('\n').length;

    if (voidTags.has(tagName) || tagName.startsWith('!')) {
      continue;
    }

    if (isClosing) {
      if (tagStack.length === 0) {
        bugs.push({
          id: `HTML-UNMATCHED-CLOSE-${lineNum}-${tagName}`,
          title: `Unmatched Closing Tag </${tagName}>`,
          type: 'Syntax',
          severity: 'Critical',
          certainty: 'Confirmed Error',
          confidence: 0.98,
          line: lineNum,
          message: `Found stray closing tag </${tagName}> on line ${lineNum} without a matching open tag.`,
          explanation: 'An orphaned closing tag disrupts DOM construction and layout trees.',
          whyProblem: 'Browser HTML parsers will attempt error recovery, causing unpredictable nesting.',
          suggestedFix: `Remove the stray </${tagName}> tag or add the matching <${tagName}> opening tag.`,
          codeSnippet: lines[lineNum - 1] || '',
          source: 'Static Analyzer',
          ruleId: 'html/unmatched-closing-tag',
        });
      } else {
        const last = tagStack[tagStack.length - 1];
        if (last.tag === tagName) {
          tagStack.pop();
        } else {
          // Search up the stack to see if tagName is an ancestor
          const ancestorIdx = tagStack.slice(0, -1).map(t => t.tag).lastIndexOf(tagName);
          if (ancestorIdx !== -1) {
            // All tags above ancestorIdx were left unclosed before this closing tag
            const unclosedTags = tagStack.splice(ancestorIdx + 1);
            tagStack.pop(); // Pop the matching ancestor tag as well

            for (const unclosed of unclosedTags) {
              bugs.push({
                id: `HTML-UNCLOSED-TAG-${unclosed.line}-${unclosed.tag}`,
                title: `Unclosed HTML Tag <${unclosed.tag}>`,
                type: 'Syntax',
                severity: 'Critical',
                certainty: 'Confirmed Error',
                confidence: 0.96,
                line: unclosed.line,
                message: `Element <${unclosed.tag}> opened on line ${unclosed.line} was not closed before </${tagName}> on line ${lineNum}.`,
                explanation: `Non-void HTML elements require a corresponding closing tag (</${unclosed.tag}>).`,
                whyProblem: 'Unclosed containers distort DOM hierarchies and swallow subsequent elements.',
                suggestedFix: `Add closing tag </${unclosed.tag}> before </${tagName}> on line ${lineNum}.`,
                codeSnippet: lines[unclosed.line - 1] || '',
                source: 'Static Analyzer',
                ruleId: 'html/unclosed-tag',
              });
            }
          } else {
            // Stray closing tag with no matching ancestor
            bugs.push({
              id: `HTML-UNMATCHED-CLOSE-${lineNum}-${tagName}`,
              title: `Unmatched Closing Tag </${tagName}>`,
              type: 'Syntax',
              severity: 'Critical',
              certainty: 'Confirmed Error',
              confidence: 0.98,
              line: lineNum,
              message: `Found stray closing tag </${tagName}> on line ${lineNum} without a matching open tag.`,
              explanation: 'An orphaned closing tag disrupts DOM construction and layout trees.',
              whyProblem: 'Browser HTML parsers will attempt error recovery, causing unpredictable nesting.',
              suggestedFix: `Remove the stray </${tagName}> tag or add the matching <${tagName}> opening tag.`,
              codeSnippet: lines[lineNum - 1] || '',
              source: 'Static Analyzer',
              ruleId: 'html/unmatched-closing-tag',
            });
            // Do not pop from tagStack to avoid cascading false errors
          }
        }
      }
    } else if (!isSelfClosing) {
      tagStack.push({ tag: tagName, line: lineNum, raw: match[0] });
    }
  }

  // Report any remaining unclosed tags at document end
  tagStack.forEach((unclosed) => {
    bugs.push({
      id: `HTML-UNCLOSED-TAG-${unclosed.line}-${unclosed.tag}`,
      title: `Unclosed HTML Tag <${unclosed.tag}>`,
      type: 'Syntax',
      severity: 'Critical',
      certainty: 'Confirmed Error',
      confidence: 0.96,
      line: unclosed.line,
      message: `Element <${unclosed.tag}> opened on line ${unclosed.line} is never closed.`,
      explanation: `Non-void HTML elements require a corresponding closing tag (</${unclosed.tag}>).`,
      whyProblem: 'Unclosed containers swallow subsequent sibling elements into their subtree.',
      suggestedFix: `Add closing tag </${unclosed.tag}> where the block terminates.`,
      codeSnippet: lines[unclosed.line - 1] || '',
      source: 'Static Analyzer',
      ruleId: 'html/unclosed-tag',
    });
  });

  return bugs;
}
