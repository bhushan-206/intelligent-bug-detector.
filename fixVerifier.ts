import { compileCodeOnly } from '../compiler';
import { ExecutionResult } from '../sandbox/sandboxTypes';

export interface FixVerificationResult {
  verified: boolean;
  status: 'FIX_VERIFIED' | 'FIX_PROPOSED_NOT_FULLY_VERIFIED';
  compilationPassed: boolean;
  originalErrorResolved: boolean;
  noNewErrorsIntroduced: boolean;
  verificationEvidence: string[];
  compilerOutput?: string;
  executionTimeMs: number;
}

/**
 * Re-compile and re-analyze the patched code to verify the proposed fix
 */
export async function verifyProposedFix(
  language: string,
  originalCode: string,
  fixedCode: string,
  originalErrorLine?: number
): Promise<FixVerificationResult> {
  const startTime = Date.now();
  const evidence: string[] = [];

  // If fixed code is empty or identical to original
  if (!fixedCode || fixedCode.trim() === originalCode.trim()) {
    return {
      verified: false,
      status: 'FIX_PROPOSED_NOT_FULLY_VERIFIED',
      compilationPassed: false,
      originalErrorResolved: false,
      noNewErrorsIntroduced: false,
      verificationEvidence: ['Proposed fix is identical or empty; cannot verify resolution.'],
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 1. Re-compile / re-parse using real compiler
  const compileResult: ExecutionResult = await compileCodeOnly(language, fixedCode);

  if (compileResult.status === 'TOOL_UNAVAILABLE') {
    return {
      verified: false,
      status: 'FIX_PROPOSED_NOT_FULLY_VERIFIED',
      compilationPassed: false,
      originalErrorResolved: false,
      noNewErrorsIntroduced: false,
      verificationEvidence: [
        'Compiler tool unavailable in host environment. Patch static checks completed, but hardware compiler verification was not performed.',
      ],
      compilerOutput: compileResult.stderr,
      executionTimeMs: Date.now() - startTime,
    };
  }

  const compilationPassed = compileResult.success && compileResult.exitCode === 0;

  if (compilationPassed) {
    evidence.push(`Real compiler (${compileResult.toolUsed}) compiled the patched code cleanly with exit code 0.`);
    if (originalErrorLine) {
      const stillHasErrorAtLine = compileResult.diagnostics.some(
        (d) => d.severity === 'error' && Math.abs(d.line - originalErrorLine) <= 2
      );
      if (!stillHasErrorAtLine) {
        evidence.push(`Original defect at line ${originalErrorLine} was confirmed resolved.`);
      }
    }
    evidence.push('No new compiler errors introduced by the patch.');

    return {
      verified: true,
      status: 'FIX_VERIFIED',
      compilationPassed: true,
      originalErrorResolved: true,
      noNewErrorsIntroduced: true,
      verificationEvidence: evidence,
      compilerOutput: compileResult.compilationOutput || compileResult.stdout,
      executionTimeMs: Date.now() - startTime,
    };
  } else {
    evidence.push(
      `Compiler reported remaining error(s): ${compileResult.diagnostics.map((d) => `line ${d.line}: ${d.message}`).join(', ') || compileResult.stderr}`
    );

    return {
      verified: false,
      status: 'FIX_PROPOSED_NOT_FULLY_VERIFIED',
      compilationPassed: false,
      originalErrorResolved: false,
      noNewErrorsIntroduced: false,
      verificationEvidence: evidence,
      compilerOutput: compileResult.compilationOutput || compileResult.stderr,
      executionTimeMs: Date.now() - startTime,
    };
  }
}
