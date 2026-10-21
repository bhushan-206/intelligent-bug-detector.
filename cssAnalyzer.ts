import { DetectedBug } from '../types';

export function analyzeCssCode(code: string): DetectedBug[] {
  const bugs: DetectedBug[] = [];
  const lines = code.split('\n');

  // Common CSS property typo corrections
  const COMMON_PROPERTY_TYPOS: Record<string, string> = {
    'colr': 'color',
    'colour': 'color',
    'clor': 'color',
    'pading': 'padding',
    'paddng': 'padding',
    'marginn': 'margin',
    'magin': 'margin',
    'bakground': 'background',
    'backgorund': 'background',
    'bacground': 'background',
    'heigth': 'height',
    'widht': 'width',
    'witdh': 'width',
    'font-siez': 'font-size',
    'font-weigth': 'font-weight',
    'dislpay': 'display',
    'displa': 'display',
    'positon': 'position',
    'z-indx': 'z-index',
    'bordr': 'border',
    'boder': 'border',
    'text-aligne': 'text-align',
    'cursor-pointer': 'cursor',
  };

  let openBraceCount = 0;
  let inRuleBlock = false;
  let ruleStartLine = 1;

  lines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    const trimmed = rawLine.trim();

    // Skip empty lines or pure comment lines
    if (!trimmed || trimmed.startsWith('/*')) return;

    // Track braces
    for (let i = 0; i < trimmed.length; i++) {
      if (trimmed[i] === '{') {
        openBraceCount++;
        inRuleBlock = true;
        ruleStartLine = lineNum;
      } else if (trimmed[i] === '}') {
        openBraceCount--;
        if (openBraceCount <= 0) {
          inRuleBlock = false;
          openBraceCount = 0;
        }
      }
    }

    // Inside a rule block: Check property syntax
    if (inRuleBlock && trimmed.includes(':') && !trimmed.startsWith('@') && !trimmed.startsWith('/*')) {
      const parts = trimmed.split(':');
      const propName = parts[0].trim().toLowerCase();
      const propValWithSemi = parts.slice(1).join(':').trim();

      // Check property typos
      if (COMMON_PROPERTY_TYPOS[propName]) {
        const correctProp = COMMON_PROPERTY_TYPOS[propName];
        bugs.push({
          id: `CSS-TYPO-PROP-${lineNum}-${propName}`,
          title: `Misspelled CSS Property '${propName}'`,
          type: 'Syntax',
          severity: 'High',
          certainty: 'Confirmed Error',
          confidence: 0.98,
          line: lineNum,
          message: `Unknown property '${propName}'. Did you mean '${correctProp}'?`,
          explanation: 'CSS parsers silently discard unrecognized property declarations.',
          whyProblem: 'The intended style will not be rendered on the target selector.',
          suggestedFix: `Replace '${propName}' with '${correctProp}'.`,
          codeSnippet: rawLine,
          fixedSnippet: rawLine.replace(propName, correctProp),
          source: 'Static Analyzer',
          ruleId: 'css/no-unknown-property',
        });
      }

      // Check missing semicolon at the end of declaration line (unless it's closed with '}')
      if (
        !propValWithSemi.endsWith(';') &&
        !propValWithSemi.endsWith('}') &&
        !propValWithSemi.endsWith('{') &&
        !trimmed.endsWith(',') &&
        !trimmed.endsWith('{')
      ) {
        bugs.push({
          id: `CSS-MISSING-SEMI-${lineNum}`,
          title: 'Missing Semicolon in CSS Declaration',
          type: 'Syntax',
          severity: 'High',
          certainty: 'Confirmed Error',
          confidence: 0.95,
          line: lineNum,
          message: `Declaration for '${propName}' must terminate with a semicolon ';'.`,
          explanation: 'In CSS syntax, each style declaration in a rule set must be separated by a semicolon.',
          whyProblem: 'Missing semicolons concatenate with the next line, breaking subsequent style rules.',
          suggestedFix: `Append ';' at the end of the line: '${trimmed};'`,
          codeSnippet: rawLine,
          fixedSnippet: rawLine + ';',
          source: 'Static Analyzer',
          ruleId: 'css/missing-semicolon',
        });
      }

      // Check invalid unitless non-zero length values (e.g. width: 100, font-size: 16)
      const lengthProps = ['width', 'height', 'max-width', 'min-width', 'max-height', 'min-height', 'top', 'bottom', 'left', 'right', 'margin', 'padding', 'font-size'];
      if (lengthProps.includes(propName)) {
        const valOnly = propValWithSemi.replace(/;$/, '').trim();
        if (/^[1-9]\d*$/.test(valOnly)) {
          bugs.push({
            id: `CSS-UNITLESS-LENGTH-${lineNum}`,
            title: `Unitless Length for Property '${propName}'`,
            type: 'Syntax',
            severity: 'Medium',
            certainty: 'Confirmed Error',
            confidence: 0.94,
            line: lineNum,
            message: `CSS property '${propName}: ${valOnly}' is missing a unit (e.g. px, rem, %, em).`,
            explanation: 'Non-zero length values in CSS require an explicit unit identifier.',
            whyProblem: 'Browsers treat unitless non-zero values as invalid syntax and ignore the rule.',
            suggestedFix: `Specify a unit such as '${valOnly}px' or '${valOnly}rem'.`,
            codeSnippet: rawLine,
            fixedSnippet: rawLine.replace(valOnly, `${valOnly}px`),
            source: 'Static Analyzer',
            ruleId: 'css/length-unit-required',
          });
        }
      }

      // Check invalid hex colors
      const hexMatch = /#([0-9a-fA-F]+)/.exec(propValWithSemi);
      if (hexMatch) {
        const hex = hexMatch[1];
        if (![3, 4, 6, 8].includes(hex.length)) {
          bugs.push({
            id: `CSS-INVALID-HEX-${lineNum}`,
            title: `Invalid Hex Color Code '#${hex}'`,
            type: 'Semantic',
            severity: 'Medium',
            certainty: 'Confirmed Error',
            confidence: 0.97,
            line: lineNum,
            message: `Hex color '#${hex}' has invalid length (${hex.length} digits). Must be 3, 4, 6, or 8 hexadecimal digits.`,
            explanation: 'Valid CSS hex colors must contain 3, 4, 6, or 8 hexadecimal characters.',
            whyProblem: 'Invalid color codes evaluate to transparent or inherit, breaking intended palette styling.',
            suggestedFix: 'Correct the hex value to standard 6-digit or 3-digit hex notation.',
            codeSnippet: rawLine,
            source: 'Static Analyzer',
            ruleId: 'css/valid-hex-color',
          });
        }
      }
    }
  });

  // Check unclosed brace blocks
  if (openBraceCount > 0) {
    bugs.push({
      id: `CSS-UNCLOSED-BRACE-${ruleStartLine}`,
      title: 'Unclosed CSS Rule Block ({)',
      type: 'Syntax',
      severity: 'Critical',
      certainty: 'Confirmed Error',
      confidence: 0.99,
      line: ruleStartLine,
      message: `CSS rule block starting on line ${ruleStartLine} is missing a closing brace '}'.`,
      explanation: 'Every CSS selector block opened with "{" must be closed with a corresponding "}".',
      whyProblem: 'An unclosed rule block consumes the entire remainder of the stylesheet.',
      suggestedFix: "Add '}' at the end of the rule block.",
      codeSnippet: lines[ruleStartLine - 1] || '',
      fixedSnippet: (lines[lines.length - 1] || '') + '\n}',
      source: 'Static Analyzer',
      ruleId: 'css/unclosed-brace-block',
    });
  }

  return bugs;
}
