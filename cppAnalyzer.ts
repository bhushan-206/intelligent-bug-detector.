import { DetectedBug } from '../types';
import { analyzeCCode } from './cAnalyzer';

export function analyzeCppCode(code: string): DetectedBug[] {
  const bugs = analyzeCCode(code);
  const lines = code.split('\n');

  lines.forEach((rawLine, index) => {
    const lineNum = index + 1;
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

    // Check array delete mismatch: new int[] matched with delete instead of delete[]
    if (/new\s+\w+\s*\[/.test(code)) {
      if (/\bdelete\s+([a-zA-Z0-9_$]+)\s*;/.test(trimmed) && !trimmed.includes('delete[]') && !trimmed.includes('delete []')) {
        bugs.push({
          id: `CPP-RUNTIME-DELETE-MISMATCH-${lineNum}`,
          title: "Mismatched Operator delete for Array (Should be delete[])",
          type: 'Runtime',
          severity: 'Critical',
          certainty: 'Confirmed Error',
          confidence: 0.94,
          line: lineNum,
          message: "Using scalar 'delete ptr' instead of array 'delete[] ptr' on dynamically allocated array.",
          explanation: 'Memory allocated with new[] must be freed with delete[]. Using scalar delete results in undefined behavior and destructor skipping.',
          whyProblem: 'Resource leak and heap corruption (CWE-762).',
          suggestedFix: "Change 'delete ptr;' to 'delete[] ptr;'.",
          codeSnippet: rawLine,
          fixedSnippet: rawLine.replace(/delete\s+/, 'delete[] '),
          source: 'Static Analyzer',
          ruleId: 'cpp/mismatched-new-delete',
          cwe: 'CWE-762'
        });
      }
    }

    // Check catching exceptions by value (Object slicing)
    if (/catch\s*\(\s*(?:const\s+)?([a-zA-Z0-9_:]+)\s+[a-zA-Z0-9_$]+\s*\)/.test(trimmed) && !trimmed.includes('&') && !trimmed.includes('...')) {
      const match = trimmed.match(/catch\s*\(\s*(?:const\s+)?([a-zA-Z0-9_:]+)\s+([a-zA-Z0-9_$]+)\s*\)/);
      const exType = match ? match[1] : '';
      const isPrimitive = /^(int|char|long|short|float|double|bool|void\*)$/.test(exType);
      if (!isPrimitive) {
        bugs.push({
          id: `CPP-LOGIC-CATCH-BY-VALUE-${lineNum}`,
          title: 'Catching Exception by Value (Object Slicing)',
          type: 'Logical',
          severity: 'Medium',
          certainty: 'Warning',
          confidence: 0.90,
          line: lineNum,
          message: `Catching polymorphic exception type '${exType}' by value instead of const reference.`,
          explanation: 'Catching by value slices derived class attributes, invokes unnecessary copy constructors, and loses polymorphism.',
          whyProblem: 'Loses custom exception data and runtime error hierarchy polymorphism.',
          suggestedFix: `Catch by const reference (e.g., 'catch (const ${exType}& ${match ? match[2] : 'e'})').`,
          codeSnippet: rawLine,
          fixedSnippet: rawLine.replace(/catch\s*\(\s*(?:const\s+)?([a-zA-Z0-9_:]+)\s+([a-zA-Z0-9_$]+)\s*\)/, 'catch (const $1& $2)'),
          source: 'Static Analyzer',
          ruleId: 'cpp/catch-by-value'
        });
      }
    }

    // Check missing #include <iostream> if cin/cout/endl used
    if (/\b(std::)?(cout|cin|cerr|endl)\b/.test(trimmed) && !code.includes('<iostream>')) {
      bugs.push({
        id: `CPP-SYNTAX-MISSING-IOSTREAM-${lineNum}`,
        title: "Missing Required Header '#include <iostream>'",
        type: 'Syntax',
        severity: 'Medium',
        certainty: 'Confirmed Error',
        confidence: 0.96,
        line: lineNum,
        message: `C++ stream I/O element '${trimmed.match(/\b(std::)?(cout|cin|cerr|endl)\b/)?.[0]}' requires <iostream>.`,
        explanation: 'Standard C++ stream objects (std::cin, std::cout, std::endl) are declared in <iostream>.',
        whyProblem: "Compilation fails with 'cout was not declared in this scope'.",
        suggestedFix: "Add '#include <iostream>' and optionally 'using namespace std;' at the top of the file.",
        codeSnippet: rawLine,
        fixedSnippet: '#include <iostream>\n' + rawLine,
        source: 'Static Analyzer',
        ruleId: 'cpp/missing-iostream'
      });
    }

    // Check raw pointer memory management when modern RAII (std::unique_ptr) should be preferred
    if (/new\s+[A-Za-z0-9_$]+(\(.*\))?;/.test(trimmed) && !code.includes('std::unique_ptr') && !code.includes('std::shared_ptr')) {
      bugs.push({
        id: `CPP-SUGGESTION-RAII-${lineNum}`,
        title: 'Manual Memory Management instead of RAII (Smart Pointers)',
        type: 'Runtime',
        severity: 'Low',
        certainty: 'Suggestion',
        confidence: 0.82,
        line: lineNum,
        message: "Consider using std::unique_ptr or std::make_unique instead of raw 'new'.",
        explanation: 'Modern C++ emphasizes RAII (Resource Acquisition Is Initialization) to guarantee exception-safe cleanup.',
        whyProblem: 'If an exception is thrown before manual delete, memory is leaked.',
        suggestedFix: 'Use auto ptr = std::make_unique<Type>(...);',
        codeSnippet: rawLine,
        source: 'Static Analyzer',
        ruleId: 'cpp/prefer-smart-pointers'
      });
    }
  });

  return bugs;
}
