import { analyzeLoopComplexity } from "../patterns/loopPatterns";
import { getRecursionComplexity } from "../patterns/recursionPatterns";
import {
  combineComplexities,
  complexityToNumeric,
} from "../utils/complexityHelperUtils";
import {
  isFunctionDefinition,
  extractFunctionName,
  extractFunctionCalls,
  extractNestedFunctions,
} from "../utils/codeParserUtils";
import { analyzeSpaceComplexity } from "./spaceAnalyzer";
import { TimeComplexityNotation } from "../constants/timeComplexityNotationsConst";
import { PythonKeywords } from "../constants/pythonKeyWordsConst";
import {
  calculateConfidence,
  getTimeComplexityDescription,
} from "../utils/timeComplexityUtils";
import { ComplexityHierarchyManager } from "./complexityHierarchy";
import { MethodAnalysis } from "../models/MethodAnalysis.model";
import { ComplexityResult } from "../models/ComplexityResult.model";

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
          notation: TimeComplexityNotation.CONSTANT,
          description: "Constant time",
          confidence: 100,
        },
        spaceComplexity: {
          notation: TimeComplexityNotation.CONSTANT,
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

  // Second pass: analyze function calls and propagate complexity using hierarchy
  const hierarchyManager = new ComplexityHierarchyManager();

  // Add all functions to the hierarchy
  methods.forEach((method) => {
    hierarchyManager.addFunction(
      method.name,
      method.complexity,
      method.spaceComplexity
    );
  });

  // Build dependency graph - detect both direct calls and nested function relationships
  const dependencies = new Map<string, string[]>();
  const nestedFunctions = extractNestedFunctions(lines);

  methods.forEach((method) => {
    const methodLines = lines.slice(method.lineStart, method.lineEnd + 1);

    // Extract function calls (excluding self-calls)
    const calledFunctions = extractFunctionCalls(methodLines, method.name);

    // Only keep functions that exist in our current file
    const validCalledFunctions = calledFunctions.filter((funcName) =>
      methods.some((m) => m.name === funcName)
    );

    // Add nested functions as dependencies (parent calls nested function)
    const nestedChildren = nestedFunctions.get(method.name) || [];
    const validNestedChildren = nestedChildren.filter((funcName) =>
      methods.some((m) => m.name === funcName)
    );

    // Combine direct calls and nested function calls
    const allDependencies = [...validCalledFunctions, ...validNestedChildren];
    dependencies.set(method.name, [...new Set(allDependencies)]);

    console.log(`${method.name} dependencies: [${allDependencies.join(", ")}]`);
  });

  // Process complexity inheritance using the hierarchy
  hierarchyManager.processComplexityInheritance(dependencies);

  // Update the original methods with the final complexities
  methods.forEach((method) => {
    const hierarchyFunction = hierarchyManager.getFunctionComplexity(
      method.name
    );
    if (hierarchyFunction) {
      method.complexity = hierarchyFunction.timeComplexity;
      method.spaceComplexity = hierarchyFunction.spaceComplexity;
      method.explanation = `Time: ${method.complexity.notation}, Space: ${method.spaceComplexity.notation}`;

      // Add child summary to explanation if function has children
      if (hierarchyFunction.childFunctions.length > 0) {
        method.explanation += ` (includes function calls)`;
      }
    }
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
      notation: TimeComplexityNotation.CONSTANT,
      description: getTimeComplexityDescription(
        TimeComplexityNotation.CONSTANT
      ),
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

  // Check for O(k^n) patterns (exponential with k base, worse than 2^n)
  const hasExponentialKPatterns = (() => {
    const hasRecursiveCall = bodyLines.some((line) => {
      const functionCallPattern = new RegExp(`\\b${functionName}\\s*\\(`, "g");
      return functionCallPattern.test(line);
    });

    const hasNestedLoops = loopLines.length >= 2;

    // Pattern: for item in recursive_function(): for other in collection:
    const hasLoopOverRecursiveResult = bodyLines.some((line) => {
      const functionCallPattern = new RegExp(
        `for.*in\\s+${functionName}\\s*\\(`,
        "g"
      );
      return functionCallPattern.test(line);
    });

    // Specific password/combination generation pattern
    // Look for patterns where we iterate over recursive results and then over another collection
    const hasPasswordGenerationPattern =
      hasLoopOverRecursiveResult &&
      bodyLines.some((line) =>
        /for.*in\s+(characters|items|chars|alphabet)/.test(line)
      ) &&
      bodyLines.some((line) => /append\s*\(\s*\w+\s*\+/.test(line));

    // K^n exponential pattern: recursive call with nested processing over k items
    return (
      hasRecursiveCall &&
      hasNestedLoops &&
      (hasLoopOverRecursiveResult || hasPasswordGenerationPattern)
    );
  })();

  // Check for O(2^n) patterns (exponential algorithms)
  const hasExponentialPatterns =
    bodyLines.some(
      (line) =>
        /2\*\*|pow\(2/.test(line) ||
        /range\(2\*\*/.test(line) ||
        /2\s*\*\*\s*n/.test(line) ||
        // Power set generation pattern: range(2**n) or range(2**len(...))
        /range\s*\(\s*2\s*\*\*\s*(n|len\()/i.test(line) ||
        // Bit manipulation patterns often indicate exponential
        /1\s*<<\s*|<<\s*\w+/.test(line)
    ) ||
    // Check for recursive patterns with multiple calls (like fibonacci, hanoi)
    (() => {
      // Count recursive calls to the same function
      const recursiveCallLines = bodyLines.filter((line) => {
        const functionCallPattern = new RegExp(
          `\\b${functionName}\\s*\\(`,
          "g"
        );
        return functionCallPattern.test(line);
      });

      // If we have multiple recursive calls or multiple calls in extend/append operations
      const totalRecursiveCalls = recursiveCallLines.reduce((count, line) => {
        const functionCallPattern = new RegExp(
          `\\b${functionName}\\s*\\(`,
          "g"
        );
        const matches = line.match(functionCallPattern);
        return count + (matches ? matches.length : 0);
      }, 0);

      // Check for patterns like hanoi: moves.extend(hanoi(...)) appears twice
      const hasMultipleExtendCalls =
        bodyLines.filter((line) => /extend\s*\(\s*\w+\s*\(/.test(line))
          .length >= 2;

      // Classic exponential: 2 or more recursive calls total
      return totalRecursiveCalls >= 2 || hasMultipleExtendCalls;
    })() ||
    // Power set generation: loops with 2^n iterations combined with nested structure
    (bodyLines.some((line) => /range\s*\(\s*2\s*\*\*/.test(line)) &&
      bodyLines.some((line) => /for.*range\(.*n.*\)/.test(line)));

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
      trimmed.startsWith(PythonKeywords.RETURN) ||
      trimmed.startsWith(PythonKeywords.IF) ||
      /^[a-zA-Z_]\w*\s*=/.test(trimmed) ||
      /^[a-zA-Z_]\w*\s*\[/.test(trimmed) ||
      trimmed === PythonKeywords.PASS
    );
  });

  if (hasSortingPatterns || hasDivideConquer) {
    return {
      notation: TimeComplexityNotation.LINEARITHMIC,
      description: getTimeComplexityDescription(
        TimeComplexityNotation.LINEARITHMIC
      ),
      confidence: 85,
    };
  }

  if (hasLogPatterns) {
    return {
      notation: TimeComplexityNotation.LOGARITHMIC,
      description: getTimeComplexityDescription(
        TimeComplexityNotation.LOGARITHMIC
      ),
      confidence: 85,
    };
  }

  if (hasFactorialPatterns) {
    return {
      notation: TimeComplexityNotation.FACTORIAL,
      description: getTimeComplexityDescription(
        TimeComplexityNotation.FACTORIAL
      ),
      confidence: 85,
    };
  }

  if (hasExponentialKPatterns) {
    return {
      notation: TimeComplexityNotation.EXPONENTIAL_K,
      description: getTimeComplexityDescription(
        TimeComplexityNotation.EXPONENTIAL_K
      ),
      confidence: 85,
    };
  }

  if (hasExponentialPatterns || hasBacktrackingPattern) {
    return {
      notation: TimeComplexityNotation.EXPONENTIAL,
      description: getTimeComplexityDescription(
        TimeComplexityNotation.EXPONENTIAL
      ),
      confidence: 85,
    };
  }

  if (hasCubicPatterns) {
    return {
      notation: TimeComplexityNotation.CUBIC,
      description: getTimeComplexityDescription(TimeComplexityNotation.CUBIC),
      confidence: 85,
    };
  }

  if (hasQuadraticPatterns) {
    return {
      notation: TimeComplexityNotation.QUADRATIC,
      description: getTimeComplexityDescription(
        TimeComplexityNotation.QUADRATIC
      ),
      confidence: 85,
    };
  }

  if (hasLinearPatterns || loopLines.length === 1) {
    return {
      notation: TimeComplexityNotation.LINEAR,
      description: getTimeComplexityDescription(TimeComplexityNotation.LINEAR),
      confidence: 85,
    };
  }

  if (allSimpleOperations && bodyLines.length <= 5) {
    return {
      notation: TimeComplexityNotation.CONSTANT,
      description: getTimeComplexityDescription(
        TimeComplexityNotation.CONSTANT
      ),
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
    description: getTimeComplexityDescription(finalComplexity),
    confidence: calculateConfidence(bodyLines, finalComplexity),
  };
}

// Update method to include space analysis
function updateMethodWithSpaceAnalysis(
  method: MethodAnalysis,
  lines: string[]
): void {
  method.spaceComplexity = analyzeSpaceComplexity(lines);
  method.explanation = `Time: ${method.complexity.notation}, Space: ${method.spaceComplexity.notation}`;
}
