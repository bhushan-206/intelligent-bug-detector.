import { SupportedLanguage } from '../types';

/**
 * Unescapes literal backslash-escaped newlines and tabs that can occur
 * when LLMs or JSON parsers serialize code strings.
 */
export function unescapeLiteralEscapes(code: string): string {
  if (!code) return '';
  let result = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Detect if literal '\n' sequences exist
  const literalNewlineCount = (result.match(/\\n/g) || []).length;
  const actualNewlineCount = (result.match(/\n/g) || []).length;

  if (literalNewlineCount > 0 && (actualNewlineCount <= 2 || literalNewlineCount >= actualNewlineCount)) {
    result = result
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '  ')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");
  }
  return result;
}

/**
 * Determines if a code string has collapsed into a single line or unformatted block
 */
export function isCollapsedCode(code: string, originalCode?: string): boolean {
  if (!code) return false;
  const normalized = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const lineCount = normalized.split('\n').length;

  if (originalCode) {
    const origCount = originalCode.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n').length;
    if (origCount > 2 && lineCount <= 2) {
      return true;
    }
  }

  // If code is long (> 60 chars) but has only 1 line
  if (lineCount === 1 && normalized.length > 60) {
    return true;
  }

  return false;
}

/**
 * Formats C-style languages (C, C++, Java, JavaScript) into clean, properly indented multi-line code.
 */
export function formatCStyleCode(code: string, indentSize = 2): string {
  const unescaped = unescapeLiteralEscapes(code);
  const indentStr = ' '.repeat(indentSize);

  // If the code is already nicely multi-line (> 2 lines) and not severely collapsed,
  // we do a structure-preserving indentation cleanup rather than a destructive full tokenize
  const rawLines = unescaped.split('\n');
  const hasMultipleLines = rawLines.length > 3;
  const isOneLiner = rawLines.length <= 2 && unescaped.length > 40;

  if (!isOneLiner && hasMultipleLines) {
    // Preserves existing line structure while fixing indentation and stray collapses
    let indentLevel = 0;
    const formattedLines: string[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      let line = rawLines[i].trim();
      if (!line) {
        // Keep at most 1 blank line
        if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
          formattedLines.push('');
        }
        continue;
      }

      // Preprocessor directive (C/C++)
      if (line.startsWith('#')) {
        formattedLines.push(line);
        continue;
      }

      // Adjust indent before line if line starts with closing brace
      if (line.startsWith('}') || line.startsWith(')')) {
        indentLevel = Math.max(0, indentLevel - 1);
      } else if (line.startsWith('case ') || line.startsWith('default:') || line.startsWith('public:') || line.startsWith('private:') || line.startsWith('protected:')) {
        // Dedent labels by 1 level
        const labelIndent = Math.max(0, indentLevel - 1);
        formattedLines.push(indentStr.repeat(labelIndent) + line);
        continue;
      }

      formattedLines.push(indentStr.repeat(indentLevel) + line);

      // Adjust indent after line if line ends with opening brace or increases scope
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      const netBraces = openBraces - closeBraces;

      if (!line.startsWith('}') && netBraces > 0) {
        indentLevel += netBraces;
      } else if (line.startsWith('}') && netBraces > 0) {
        indentLevel += (netBraces - 1);
      }
    }

    return formattedLines.join('\n');
  }

  // Tokenize and format single-line or squashed C-style code from scratch
  const tokens: string[] = [];
  let currentToken = '';
  let inString: string | null = null;
  let inComment = false;
  let inMultiComment = false;
  let parenDepth = 0;

  for (let i = 0; i < unescaped.length; i++) {
    const char = unescaped[i];
    const nextChar = unescaped[i + 1] || '';

    // Handle string boundaries
    if ((char === '"' || char === "'" || char === '`') && !inComment && !inMultiComment) {
      if (!inString) {
        inString = char;
        currentToken += char;
        continue;
      } else if (inString === char && unescaped[i - 1] !== '\\') {
        inString = null;
        currentToken += char;
        continue;
      }
    }

    if (inString) {
      currentToken += char;
      continue;
    }

    // Handle comments
    if (char === '/' && nextChar === '/' && !inMultiComment) {
      inComment = true;
      currentToken += char;
      continue;
    }
    if (inComment) {
      currentToken += char;
      if (char === '\n') inComment = false;
      continue;
    }

    if (char === '/' && nextChar === '*' && !inComment) {
      inMultiComment = true;
      currentToken += char;
      continue;
    }
    if (inMultiComment) {
      currentToken += char;
      if (unescaped[i - 1] === '*' && char === '/') inMultiComment = false;
      continue;
    }

    // Parentheses tracking for 'for (...)' loops
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth = Math.max(0, parenDepth - 1);

    // Structural breakpoints
    if (char === ';') {
      currentToken += ';';
      if (parenDepth === 0) {
        tokens.push(currentToken.trim());
        currentToken = '';
      }
    } else if (char === '{') {
      currentToken += '{';
      tokens.push(currentToken.trim());
      currentToken = '';
    } else if (char === '}') {
      if (currentToken.trim()) {
        tokens.push(currentToken.trim());
        currentToken = '';
      }
      tokens.push('}');
    } else if (char === '\n') {
      if (currentToken.trim().startsWith('#')) {
        tokens.push(currentToken.trim());
        currentToken = '';
      } else {
        currentToken += ' ';
      }
    } else {
      currentToken += char;
    }
  }

  if (currentToken.trim()) {
    tokens.push(currentToken.trim());
  }

  // Assemble formatted lines with proper indentation
  const resultLines: string[] = [];
  let indent = 0;

  for (let i = 0; i < tokens.length; i++) {
    let t = tokens[i].trim();
    if (!t) continue;

    if (t.startsWith('}')) {
      indent = Math.max(0, indent - 1);
    }

    // Combine '} else' or '} catch' if next token follows
    if (t === '}' && i + 1 < tokens.length && (tokens[i + 1].startsWith('else') || tokens[i + 1].startsWith('catch'))) {
      t = '} ' + tokens[i + 1].trim();
      i++;
    }

    resultLines.push(indentStr.repeat(indent) + t);

    if (t.endsWith('{')) {
      indent++;
    }
  }

  return resultLines.join('\n');
}

const INLINE_TAGS = new Set([
  'title', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span',
  'a', 'button', 'li', 'td', 'th', 'label', 'b', 'strong',
  'i', 'em', 'small', 'code', 'kbd', 'badge'
]);

/**
 * Formats HTML markup with clean hierarchical indentation, standard tag line breaks,
 * and preserves inline text elements without collapsing.
 */
export function formatHtmlCode(html: string, originalCode?: string, indentSize = 2): string {
  const unescaped = unescapeLiteralEscapes(html);
  const indentStr = ' '.repeat(indentSize);

  const voidElements = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]);

  // Clean and tokenize HTML: tags vs text content
  const tokens: string[] = [];
  const tagRegex = /(<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<[^>]+>|[^<]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(unescaped)) !== null) {
    const val = match[0].trim();
    if (val) {
      tokens.push(val);
    }
  }

  if (tokens.length === 0) {
    // Fallback: split by opening tag boundary if single-line
    if (unescaped.includes('<') && unescaped.split('\n').length <= 2) {
      return unescaped.replace(/(<[a-zA-Z0-9\/!])/g, '\n$1').trim();
    }
    return unescaped;
  }

  const lines: string[] = [];
  let indentLevel = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // 1. DOCTYPE
    if (/^<!doctype/i.test(token)) {
      lines.push(token);
      continue;
    }

    // 2. Comments
    if (token.startsWith('<!--')) {
      lines.push(indentStr.repeat(indentLevel) + token);
      continue;
    }

    // 3. Script / Style blocks
    if (/^<script\b/i.test(token) || /^<style\b/i.test(token)) {
      lines.push(indentStr.repeat(indentLevel) + token);
      continue;
    }

    // 4. Closing tags </tag>
    if (token.startsWith('</')) {
      indentLevel = Math.max(0, indentLevel - 1);
      lines.push(indentStr.repeat(indentLevel) + token);
      continue;
    }

    // 5. Opening or self-closing tags <tag ...>
    if (token.startsWith('<')) {
      const tagMatch = token.match(/^<([a-zA-Z0-9\-]+)/);
      const tagName = tagMatch ? tagMatch[1].toLowerCase() : '';
      const isSelfClosing = token.endsWith('/>') || voidElements.has(tagName);

      // Check if this inline tag wraps simple text and closes immediately: e.g. <h1>Title</h1> or <p>Text</p>
      if (!isSelfClosing && INLINE_TAGS.has(tagName) && i + 2 < tokens.length) {
        const nextToken = tokens[i + 1];
        const closeToken = tokens[i + 2];
        const isMatchingClose = closeToken.toLowerCase() === `</${tagName}>`;
        const isSimpleContent = !nextToken.startsWith('<') && nextToken.length < 80 && !nextToken.includes('\n');

        if (isMatchingClose && isSimpleContent) {
          lines.push(indentStr.repeat(indentLevel) + `${token}${nextToken}${closeToken}`);
          i += 2;
          continue;
        }
      }

      lines.push(indentStr.repeat(indentLevel) + token);

      if (!isSelfClosing) {
        indentLevel++;
      }
      continue;
    }

    // 6. Text content node
    lines.push(indentStr.repeat(indentLevel) + token);
  }

  // Safety check: ensure multi-token HTML is never squished to 1 line
  if (lines.length <= 1 && tokens.length > 1) {
    return tokens.join('\n');
  }

  return lines.join('\n');
}

/**
 * Formats Python code, ensuring 4-space indentation and proper statement breaks.
 */
export function formatPythonCode(code: string, originalCode?: string): string {
  const unescaped = unescapeLiteralEscapes(code);
  const rawLines = unescaped.split('\n');

  // If the code is already nicely multi-line, clean up trailing spaces and indentation
  if (rawLines.length > 2) {
    return rawLines
      .map(line => line.replace(/\t/g, '    ').trimEnd())
      .join('\n');
  }

  // If squashed to 1 line, split statements by semicolons and keywords
  let expanded = unescaped.replace(/;\s*/g, '\n');

  // Split control headers if compressed
  expanded = expanded.replace(/(:\s*)(def|class|if|elif|else|for|while|try|except|finally|with|return)\b/g, '$1\n$2');

  const lines = expanded.split('\n');
  const formatted: string[] = [];
  let indent = 0;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      if (formatted.length > 0 && formatted[formatted.length - 1] !== '') {
        formatted.push('');
      }
      continue;
    }

    if (/^(elif|else|except|finally)\b/.test(trimmed)) {
      indent = Math.max(0, indent - 1);
    }

    formatted.push('    '.repeat(indent) + trimmed);

    if (trimmed.endsWith(':')) {
      indent++;
    }
  }

  return formatted.join('\n');
}

/**
 * Master universal code formatting function.
 * Guarantees that remediated code ALWAYS has proper line breaks, indentation,
 * and layout across all 6 supported languages.
 */
export function ensureProperFormatting(
  code: string,
  originalCode: string,
  language: SupportedLanguage
): string {
  if (!code || !code.trim()) {
    return originalCode || '';
  }

  // Exact character-for-character match
  if (code === originalCode) {
    return originalCode;
  }

  const unescaped = unescapeLiteralEscapes(code);
  const unescapedOriginal = unescapeLiteralEscapes(originalCode || '');

  // If identical to original or original unescaped, retain original character-for-character
  if (unescaped === unescapedOriginal || unescaped === originalCode) {
    return originalCode;
  }

  // If code trimmed is identical to original trimmed (no semantic or textual fix applied)
  if (unescaped.trim() === unescapedOriginal.trim()) {
    return originalCode;
  }

  switch (language) {
    case 'html':
      return formatHtmlCode(unescaped, originalCode);
    case 'python':
      return formatPythonCode(unescaped, originalCode);
    case 'c':
    case 'cpp':
    case 'java':
    case 'javascript':
    default:
      return formatCStyleCode(unescaped);
  }
}
