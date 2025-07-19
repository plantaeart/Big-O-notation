import {
  ComplexityResult,
  MethodAnalysis,
  AlgorithmicPatterns,
} from "../types";
import { analyzeLoopComplexity } from "../patterns/loopPatterns";
import { getRecursionComplexity } from "../patterns/recursionPatterns";
import {
  detectConstantTime,
  detectLogarithmic,
  detectLinear,
  hasLinearBuiltins,
} from "../patterns/basicPatterns";
import {
  combineComplexities,
  complexityToNumeric,
} from "../utils/complexityHelper";
import { isFunctionDefinition, extractFunctionName } from "../utils/codeParser";
import { analyzeSpaceComplexity } from "./spaceAnalyzer";
import { ComplexityNotation } from "../constants/complexityNotations";

// Main function to analyze code complexity
export function analyzeCodeComplexity(code: string): MethodAnalysis[] {
  const lines = code.split("\n");
  const methods: MethodAnalysis[] = [];

  let currentMethod: MethodAnalysis | null = null;
  let methodLines: string[] = [];
  let methodStartLine = 0;

  // First pass: collect all functions
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Start of a new function
    if (isFunctionDefinition(line)) {
      // Process previous method if exists
      if (currentMethod && methodLines.length > 0) {
        currentMethod.complexity = analyzeMethodComplexity(
          methodLines,
          currentMethod.name,
          lines // Pass full code context for import detection
        );
        updateMethodWithSpaceAnalysis(currentMethod, methodLines);
        currentMethod.lineEnd = i - 1;
        methods.push(currentMethod);
      }

      // Start new method
      const functionName = extractFunctionName(line);
      methodStartLine = i;
      currentMethod = {
        name: functionName,
        lineStart: methodStartLine,
        lineEnd: methodStartLine,
        complexity: {
          notation: ComplexityNotation.CONSTANT,
          description: "Constant time",
          confidence: 100,
        },
        spaceComplexity: {
          notation: ComplexityNotation.CONSTANT,
          description: "Constant space",
          confidence: 100,
          dataStructures: [],
        },
        explanation: "Initial analysis",
      };
      methodLines = [line];
    } else if (currentMethod) {
      // Add line to current method
      methodLines.push(line);
    }
  }

  // Process final method
  if (currentMethod && methodLines.length > 0) {
    currentMethod.complexity = analyzeMethodComplexity(
      methodLines,
      currentMethod.name,
      lines // Pass full code context for import detection
    );
    updateMethodWithSpaceAnalysis(currentMethod, methodLines);
    currentMethod.lineEnd = lines.length - 1;
    methods.push(currentMethod);
  }

  // Second pass: analyze function calls and propagate complexity
  // Build dependency graph
  const dependencies = new Map<string, string[]>();
  methods.forEach((method) => {
    const methodLines = lines.slice(method.lineStart, method.lineEnd + 1);
    const calledFunctions = extractFunctionCalls(methodLines);
    dependencies.set(method.name, calledFunctions);
  });

  // Perform topological sort to process functions in dependency order (children first)
  const processedFunctions = new Set<string>();
  const processingStack = new Set<string>();

  function processFunction(functionName: string): void {
    if (
      processedFunctions.has(functionName) ||
      processingStack.has(functionName)
    ) {
      return; // Already processed or currently processing (circular dependency)
    }

    const method = methods.find((m) => m.name === functionName);
    if (!method) {
      return; // Function not found in current file
    }

    processingStack.add(functionName);

    // First, process all dependencies (children)
    const calledFunctions = dependencies.get(functionName) || [];
    for (const calledFunc of calledFunctions) {
      if (methods.find((m) => m.name === calledFunc)) {
        processFunction(calledFunc);
      }
    }

    // Now process this function (parent)
    let worstCalledComplexity: string = ComplexityNotation.CONSTANT;
    for (const calledFunc of calledFunctions) {
      const calledMethod = methods.find((m) => m.name === calledFunc);
      if (calledMethod) {
        console.log(
          `${functionName} calls ${calledFunc} (${calledMethod.complexity.notation})`
        );
        const currentComplexity = method.complexity.notation;
        const calledComplexity = calledMethod.complexity.notation;
        const combinedComplexity = combineComplexities([
          currentComplexity,
          calledComplexity,
        ]);

        if (
          complexityToNumeric(combinedComplexity) >
          complexityToNumeric(worstCalledComplexity)
        ) {
          worstCalledComplexity = combinedComplexity;
        }
      }
    }

    // Update complexity if calls to other functions make it worse
    if (
      complexityToNumeric(worstCalledComplexity) >
      complexityToNumeric(method.complexity.notation)
    ) {
      const oldComplexity = method.complexity.notation;
      method.complexity = {
        notation: worstCalledComplexity,
        description: getComplexityDescription(worstCalledComplexity),
        confidence: Math.max(method.complexity.confidence - 10, 70),
      };
      method.explanation = `Time: ${method.complexity.notation}, Space: ${method.spaceComplexity.notation} (includes function calls)`;
      console.log(
        `Updated ${functionName} complexity from ${oldComplexity} to ${worstCalledComplexity} due to function calls`
      );
    } else {
      console.log(
        `${functionName} complexity remains ${method.complexity.notation} (no update needed)`
      );
    }

    processingStack.delete(functionName);
    processedFunctions.add(functionName);
  }

  // Process all functions in dependency order
  methods.forEach((method) => {
    processFunction(method.name);
  });

  return methods;
}

// Analyze complexity of a single method
function analyzeMethodComplexity(
  lines: string[],
  functionName: string,
  fullCodeContext?: string[]
): ComplexityResult {
  // Filter out the function definition line and empty lines for analysis
  const bodyLines = lines
    .slice(1)
    .filter((line) => line.trim() !== "" && !line.trim().startsWith("#"));

  // If function has no body or only simple statements, it's O(1)
  if (bodyLines.length === 0) {
    return {
      notation: ComplexityNotation.CONSTANT,
      description: getComplexityDescription(ComplexityNotation.CONSTANT),
      confidence: 95,
    };
  }

  // Check for specific O(log n) patterns first
  const hasLogPatterns = bodyLines.some(
    (line) =>
      /math\.log|math\.ceil.*log|log2|log10/.test(line) ||
      /heappush|heappop|heapify/.test(line) ||
      /n\s*\/\/\s*2|n\s*>>=|n\s*>>\s*1/.test(line) ||
      (/while.*n:|while.*n\s*>/.test(line) && /\/\/\s*2|\/\s*2/.test(line))
  );

  // Check for O(n log n) patterns (sorting, divide and conquer)
  const hasSortingPatterns = bodyLines.some(
    (line) =>
      /sorted\(|\.sort\(/.test(line) ||
      /heapify|heappop.*range|heappop.*len/.test(line) ||
      (/for.*range.*len/.test(line) && /heappop/.test(line))
  );

  // Check for divide and conquer patterns
  const hasDivideConquer = bodyLines.some(
    (line) =>
      /\[.*for.*if.*<|if.*<.*pivot/.test(line) ||
      /merge|split|divide/.test(line)
  );

  // Check for O(n) patterns (single loops, linear operations)
  const hasLinearPatterns = bodyLines.some(
    (line) =>
      /for\s+\w+\s+in\s+\w+:|for\s+.*enumerate\(/.test(line) ||
      /sum\(|max\(|min\(|len\(/.test(line) ||
      /\.count\(|\.index\(|\.remove\(/.test(line) ||
      /list\(|tuple\(|set\(/.test(line) ||
      /reversed\(/.test(line)
  );

  // More sophisticated nested loop detection for O(n²) and O(n³)
  const loopLines = bodyLines.filter(
    (line) => /for\s+\w+\s+in\s+/.test(line) || /while\s+/.test(line)
  );

  // Check for O(n²) patterns - look for nested loops and quadratic operations
  const hasQuadraticPatterns =
    loopLines.length === 2 || // Two loops suggests nesting
    bodyLines.some(
      (line) =>
        // Classic bubble sort pattern
        /for.*range\(.*n.*\).*:.*for.*range\(.*n.*\)/.test(
          line.replace(/\s+/g, " ")
        ) ||
        // Selection sort pattern
        /for.*range\(n\).*for.*range\(i.*\+.*1.*n\)/.test(
          line.replace(/\s+/g, " ")
        ) ||
        // Nested loop patterns with range(len())
        /for.*range\(len\(.*\)\).*for.*range\(.*len\(.*\)\)/.test(
          line.replace(/\s+/g, " ")
        )
    ) ||
    // Check for nested structure by looking at indentation
    (() => {
      let nestedLoops = 0;
      let currentIndent = 0;
      for (const line of bodyLines) {
        const indent = line.length - line.trimStart().length;
        if (/for\s+\w+\s+in\s+|while\s+/.test(line)) {
          if (indent > currentIndent) {
            nestedLoops++;
          } else {
            nestedLoops = 1;
          }
          currentIndent = indent;
        }
      }
      return nestedLoops >= 2;
    })();

  // Check for O(n³) patterns - 3 or more loops, often matrix multiplication
  const hasCubicPatterns =
    loopLines.length >= 3 ||
    bodyLines.some((line) =>
      // Matrix multiplication pattern
      /for.*range\(.*\).*for.*range\(.*\).*for.*range\(.*\)/.test(
        line.replace(/\s+/g, " ")
      )
    );

  // Check for O(2^n) patterns (exponential algorithms)
  const hasExponentialPatterns =
    bodyLines.some(
      (line) =>
        /2\*\*|pow\(2/.test(line) ||
        /range\(2\*\*/.test(line) ||
        /2\s*\*\*\s*n/.test(line)
    ) ||
    // Check for recursive patterns with multiple calls (like fibonacci pattern)
    bodyLines.some((line) => {
      // Look for patterns like "func(n-1) + func(n-2)" or "func(...) or func(...)"
      const recursiveCalls = (line.match(/\w+\(/g) || []).length;
      return recursiveCalls >= 2 && /\+|\|or\b/.test(line);
    });

  // Check for O(n!) patterns (factorial algorithms)
  const fullCode = fullCodeContext ? fullCodeContext.join(" ") : "";
  const hasFactorialPatterns =
    bodyLines.some(
      (line) =>
        /factorial|math\.factorial/.test(line) ||
        /range\(.*\!\)/.test(line) ||
        // Import and usage patterns
        /permutations\(/.test(line) ||
        /list\(permutations/.test(line)
    ) ||
    // Check imports in full code context for itertools.permutations
    (fullCodeContext &&
      /from.*itertools.*import.*permutations|import.*itertools/.test(
        fullCode
      ) &&
      bodyLines.some((line) => /permutations\(/.test(line))) ||
    // Check for recursive patterns that generate all arrangements
    bodyLines.some((line) => {
      // Look for loops over range(n) with recursive calls that extend/append results
      return (
        /for.*in.*range\(/.test(line) &&
        bodyLines.some(
          (otherLine) =>
            /extend\(|append\(/.test(otherLine) &&
            /\w+\(.*,.*\+.*1|\w+\(.*,.*-.*1/.test(otherLine)
        )
      );
    });

  // Special check for backtracking patterns that indicate exponential complexity
  const hasBacktrackingPattern = bodyLines.some((line) => {
    // Look for return statements with OR and function calls
    return /return\s*\(.*or/.test(line) && /\w+\(/.test(line);
  });

  // Check if all lines are simple O(1) operations
  const allSimpleOperations = bodyLines.every((line) => {
    const trimmed = line.trim();
    return (
      trimmed.startsWith("return ") ||
      trimmed.startsWith("if ") ||
      /^[a-zA-Z_]\w*\s*=/.test(trimmed) ||
      /^[a-zA-Z_]\w*\s*\[/.test(trimmed) ||
      trimmed === "pass"
    );
  });

  if (hasSortingPatterns || hasDivideConquer) {
    return {
      notation: ComplexityNotation.LINEARITHMIC,
      description: getComplexityDescription(ComplexityNotation.LINEARITHMIC),
      confidence: 85,
    };
  }

  if (hasLogPatterns) {
    return {
      notation: ComplexityNotation.LOGARITHMIC,
      description: getComplexityDescription(ComplexityNotation.LOGARITHMIC),
      confidence: 85,
    };
  }

  if (hasFactorialPatterns) {
    return {
      notation: ComplexityNotation.FACTORIAL,
      description: getComplexityDescription(ComplexityNotation.FACTORIAL),
      confidence: 85,
    };
  }

  if (hasCubicPatterns) {
    return {
      notation: ComplexityNotation.CUBIC,
      description: getComplexityDescription(ComplexityNotation.CUBIC),
      confidence: 85,
    };
  }

  if (hasQuadraticPatterns) {
    return {
      notation: ComplexityNotation.QUADRATIC,
      description: getComplexityDescription(ComplexityNotation.QUADRATIC),
      confidence: 85,
    };
  }

  if (hasExponentialPatterns || hasBacktrackingPattern) {
    return {
      notation: ComplexityNotation.EXPONENTIAL,
      description: getComplexityDescription(ComplexityNotation.EXPONENTIAL),
      confidence: 85,
    };
  }

  if (hasLinearPatterns || loopLines.length === 1) {
    return {
      notation: ComplexityNotation.LINEAR,
      description: getComplexityDescription(ComplexityNotation.LINEAR),
      confidence: 85,
    };
  }

  if (allSimpleOperations && bodyLines.length <= 5) {
    return {
      notation: ComplexityNotation.CONSTANT,
      description: getComplexityDescription(ComplexityNotation.CONSTANT),
      confidence: 90,
    };
  }

  // Get complexity from different analysis approaches
  const loopComplexity = analyzeLoopComplexity(bodyLines);
  const recursionComplexity = getRecursionComplexity(bodyLines, functionName);

  // Use the worst complexity between loops and recursion
  const finalComplexity = combineComplexities([
    loopComplexity,
    recursionComplexity,
  ]);

  return {
    notation: finalComplexity,
    description: getComplexityDescription(finalComplexity),
    confidence: calculateConfidence(bodyLines, finalComplexity),
  };
}

// Extract function calls from method lines
function extractFunctionCalls(lines: string[]): string[] {
  const functionCalls: string[] = [];

  for (const line of lines) {
    // Look for function calls: functionName(
    const matches = line.match(/([a-zA-Z_]\w*)\s*\(/g);
    if (matches) {
      for (const match of matches) {
        const functionName = match.replace(/\s*\(/, "");
        // Filter out built-in functions and common Python functions
        if (!isBuiltinFunction(functionName)) {
          functionCalls.push(functionName);
        }
      }
    }
  }

  return [...new Set(functionCalls)]; // Remove duplicates
}

// Check if a function name is a built-in Python function
function isBuiltinFunction(functionName: string): boolean {
  const builtins = [
    "print",
    "len",
    "range",
    "sum",
    "max",
    "min",
    "sorted",
    "list",
    "tuple",
    "set",
    "dict",
    "str",
    "int",
    "float",
    "bool",
    "enumerate",
    "zip",
    "map",
    "filter",
    "append",
    "extend",
    "insert",
    "remove",
    "pop",
    "clear",
    "index",
    "count",
    "sort",
    "reverse",
    "copy",
    "get",
    "keys",
    "values",
    "items",
  ];
  return builtins.includes(functionName);
}

// Update method to include space analysis
function updateMethodWithSpaceAnalysis(
  method: MethodAnalysis,
  lines: string[]
): void {
  method.spaceComplexity = analyzeSpaceComplexity(lines);
  method.explanation = `Time: ${method.complexity.notation}, Space: ${method.spaceComplexity.notation}`;
}

// Detect specific algorithmic patterns
export function detectAlgorithmicPatterns(
  lines: string[]
): AlgorithmicPatterns {
  const codeText = lines.join("\n").toLowerCase();

  return {
    isBinarySearch: /binary.*search|left.*right.*mid|search.*sorted/.test(
      codeText
    ),
    isDivideByHalf: /\/\/\s*2|\/\s*2|\*\s*2/.test(codeText),
    isSorting: /sort|sorted|merge_sort|quick_sort|heap_sort/.test(codeText),
    isFactorial: /factorial|permut|arrangement|n!/.test(codeText),
    isHashAccess: /\[.*\](?!\s*=)/.test(codeText),
    isDirectAccess: /\[\d+\]/.test(codeText),
    isPermutations: /permut|arrangement/.test(codeText),
    isPowerSet: /powerset|subset|2\*\*/.test(codeText),
    isBuiltinSort: /\.sort\(|sorted\(/.test(codeText),
    hasExponentialLoop: /2\*\*|pow\(2|fibonacci|subset|powerset/.test(codeText),
  };
}

// Get human-readable description for complexity
function getComplexityDescription(complexity: string): string {
  const descriptions: { [key: string]: string } = {
    [ComplexityNotation.CONSTANT]: "Constant time - excellent performance",
    [ComplexityNotation.LOGARITHMIC]:
      "Logarithmic time - very good performance",
    [ComplexityNotation.LINEAR]: "Linear time - good performance",
    [ComplexityNotation.LINEARITHMIC]:
      "Linearithmic time - acceptable performance",
    [ComplexityNotation.QUADRATIC]:
      "Quadratic time - poor performance for large inputs",
    [ComplexityNotation.CUBIC]: "Cubic time - very poor performance",
    [ComplexityNotation.EXPONENTIAL]:
      "Exponential time - impractical for large inputs",
    [ComplexityNotation.FACTORIAL]:
      "Factorial time - only suitable for very small inputs",
  };

  return descriptions[complexity] || "Unknown complexity";
}

// Calculate confidence in the analysis
function calculateConfidence(lines: string[], complexity: string): number {
  let confidence = 50; // Base confidence

  // Increase confidence for clear patterns
  if (
    complexity === ComplexityNotation.CONSTANT &&
    lines.every((line) => detectConstantTime(line) || line.trim() === "")
  ) {
    confidence = 95;
  } else if (
    complexity === ComplexityNotation.LOGARITHMIC &&
    lines.some((line) => detectLogarithmic(line))
  ) {
    confidence = 85;
  } else if (complexity === ComplexityNotation.LINEAR && detectLinear(lines)) {
    confidence = 90;
  } else if (complexity === ComplexityNotation.QUADRATIC) {
    const nestedLoops = lines.filter((line) =>
      /\s+for.*in.*:/.test(line)
    ).length;
    confidence = nestedLoops > 0 ? 85 : 70;
  } else if (complexity === ComplexityNotation.CUBIC) {
    const tripleLoops = lines.filter((line) => /for.*in.*:/.test(line)).length;
    confidence = tripleLoops >= 3 ? 90 : 75;
  } else if (complexity === ComplexityNotation.EXPONENTIAL) {
    const hasExponentialPatterns = lines.some((line) =>
      /2\*\*|pow\(2|fibonacci|subset|powerset/.test(line)
    );
    confidence = hasExponentialPatterns ? 90 : 75;
  } else if (complexity === ComplexityNotation.FACTORIAL) {
    const hasFactorialPatterns = lines.some((line) =>
      /factorial|permut|arrangement/.test(line)
    );
    confidence = hasFactorialPatterns ? 90 : 75;
  }

  // Decrease confidence for ambiguous cases
  if (lines.length < 3) {
    confidence -= 20;
  }

  return Math.max(10, Math.min(100, confidence));
}
