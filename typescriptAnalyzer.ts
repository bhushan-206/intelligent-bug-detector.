import { DetectedBug } from '../types';
import { analyzeJavaScriptCode } from './javascriptAnalyzer';

export function analyzeTypeScriptCode(code: string): DetectedBug[] {
  // Start with standard JS checks
  const bugs = analyzeJavaScriptCode(code);
  const lines = code.split('\n');

  lines.forEach((rawLine, index) => {
    const lineNum = index + 1;
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

    // Check obvious type mismatch declarations: const x: number = "str"
    const typeMismatchPattern = /(const|let|var)\s+([a-zA-Z0-9_$]+)\s*:\s*(number|string|boolean|number\[\]|string\[\])\s*=\s*([^;]+);?/;
    const match = trimmed.match(typeMismatchPattern);
    if (match) {
      const declaredType = match[3];
      const assignedVal = match[4].trim();

      let isMismatch = false;
      let reason = '';

      if (declaredType === 'number' && (/^['"`]/.test(assignedVal) || assignedVal === 'true' || assignedVal === 'false')) {
        isMismatch = true;
        reason = `Type '${assignedVal}' is not assignable to type 'number'.`;
      } else if (declaredType === 'string' && (/^[0-9]+(\.[0-9]+)?$/.test(assignedVal) || assignedVal === 'true' || assignedVal === 'false')) {
        isMismatch = true;
        reason = `Type '${assignedVal}' is not assignable to type 'string'.`;
      } else if (declaredType === 'boolean' && (/^[0-9]+$/.test(assignedVal) || /^['"`]/.test(assignedVal))) {
        isMismatch = true;
        reason = `Type '${assignedVal}' is not assignable to type 'boolean'.`;
      }

      if (isMismatch) {
        bugs.push({
          id: `TS-SEMANTIC-TYPE-MISMATCH-${lineNum}`,
          title: `Type Mismatch in Variable Assignment (TS2322)`,
          type: 'Semantic',
          severity: 'Critical',
          certainty: 'Confirmed Error',
          confidence: 0.98,
          line: lineNum,
          message: reason,
          explanation: `Variable '${match[2]}' is declared as '${declaredType}' but assigned value '${assignedVal}'.`,
          whyProblem: 'TypeScript compiler emits TS2322 and will fail compilation in strict mode.',
          suggestedFix: `Assign a value matching type '${declaredType}', or update the type annotation.`,
          codeSnippet: rawLine,
          source: 'Static Analyzer',
          ruleId: 'typescript/type-mismatch'
        });
      }
    }

    // Check unsafe 'any' usage
    if (/:\s*any\b/.test(trimmed) && !trimmed.includes('//') && !trimmed.includes('/*')) {
      bugs.push({
        id: `TS-SEMANTIC-EXPLICIT-ANY-${lineNum}`,
        title: "Unsafe 'any' Type Annotation (@typescript-eslint/no-explicit-any)",
        type: 'Semantic',
        severity: 'Low',
        certainty: 'Suggestion',
        confidence: 0.85,
        line: lineNum,
        message: "Using 'any' disables compile-time type safety for this expression.",
        explanation: "'any' defeats the purpose of TypeScript by bypassing type checking completely.",
        whyProblem: 'Masks runtime type bugs, missing properties, and invalid method calls.',
        suggestedFix: "Replace 'any' with 'unknown', a generic type parameter, or a specific interface.",
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'typescript/no-explicit-any'
      });
    }

    // Check double assertion: as unknown as Type
    if (/as\s+unknown\s+as\s+[A-Za-z0-9_$]+/.test(trimmed)) {
      bugs.push({
        id: `TS-SEMANTIC-DOUBLE-CAST-${lineNum}`,
        title: 'Unsafe Forced Type Casting (as unknown as T)',
        type: 'Semantic',
        severity: 'Medium',
        certainty: 'Warning',
        confidence: 0.90,
        line: lineNum,
        message: "Forced casting via 'as unknown as ...' overrides TypeScript compiler safety.",
        explanation: 'Double assertion forces incompatible types to be cast without structural validation.',
        whyProblem: 'Can cause runtime crashes if the object shape does not actually conform to the cast target.',
        suggestedFix: 'Implement a type guard function (isType) or validate object structure before casting.',
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'typescript/no-unsafe-cast'
      });
    }
  });

  return bugs;
}
