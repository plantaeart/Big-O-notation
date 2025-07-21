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
import { ComplexityAnalysisResult } from "../models/ComplexityAnalysisResult.model";

// Main function to analyze code complexity
export function analyzeCodeComplexity(code: string): ComplexityAnalysisResult {
  const lines = code.split("\n");
  const methods: MethodAnalysis[] = [];

  let currentMethod: MethodAnalysis | null = null;
  let methodLines: string[] = [];
  let methodStartLine = 0;

  // First pass: collect all functions
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if this line starts a new function
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
      // Check if we've reached the end of the current function
      // A function ends when we encounter:
      // 1. Another function definition (handled above)
      // 2. Code at the same or lower indentation level as the function definition that's not part of the function
      const currentFunctionIndent =
        lines[currentMethod.lineStart].length -
        lines[currentMethod.lineStart].trimStart().length;
      const lineIndent = line.length - line.trimStart().length;

      // If we hit a line that's at the same indentation as the function definition or less,
      // and it's not empty or a comment, then we've likely left the function
      if (
        trimmed !== "" &&
        !trimmed.startsWith("#") &&
        lineIndent <= currentFunctionIndent
      ) {
        // This line is not part of the current function
        // Finish the current method
        currentMethod.complexity = analyzeMethodComplexity(
          methodLines,
          currentMethod.name,
          lines // Pass full code context for import detection
        );
        updateMethodWithSpaceAnalysis(currentMethod, methodLines);
        currentMethod.lineEnd = i - 1;
        methods.push(currentMethod);
        currentMethod = null;
        methodLines = [];
      } else {
        // Add line to current method
        methodLines.push(line);
      }
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

  return {
    methods: methods,
    hierarchy: dependencies,
  };
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
      (/while.*n:|while.*n\s*>/.test(line) && /\/\/\s*2|\/\s*2/.test(line)) ||
      // Binary search patterns
      /(left|right).*\/\/\s*2|mid\s*=.*(left|right).*\/\/\s*2/.test(line) ||
      /while.*left.*<=.*right/.test(line) ||
      /while.*start.*<=.*end/.test(line)
  );

  // Check for O(n log n) patterns (sorting, divide and conquer)
  // Check both bodyLines and fullCodeContext for sorting patterns
  const hasSortingPatterns =
    bodyLines.some(
      (line) =>
        /\bsorted\(|\.sort\(/.test(line) ||
        /heapify|heappop.*range|heappop.*len/.test(line) ||
        (/for.*range.*len/.test(line) && /heappop/.test(line))
    ) ||
    (fullCodeContext &&
      fullCodeContext.some(
        (line) =>
          /\bsorted\(|\.sort\(/.test(line) ||
          /heapify|heappop.*range|heappop.*len/.test(line) ||
          (/for.*range.*len/.test(line) && /heappop/.test(line))
      ));

  // Check for divide and conquer patterns
  const hasDivideConquer = bodyLines.some(
    (line) =>
      /\[.*for.*if.*<|if.*<.*pivot/.test(line) ||
      /merge_sort|quick_sort|merge\s*\(|divide_and_conquer/.test(line)
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
    // Check for actual nested structure by analyzing indentation levels
    (() => {
      const loopInfo: Array<{ indent: number; line: string }> = [];

      for (const line of bodyLines) {
        const indent = line.length - line.trimStart().length;
        const trimmedLine = line.trim();

        // Check if this line contains a loop
        if (/^(for\s+\w+\s+in\s+|while\s+)/.test(trimmedLine)) {
          loopInfo.push({ indent, line: trimmedLine });
        }
      }

      // Check if we have loops at different indentation levels (indicating nesting)
      if (loopInfo.length < 2) {
        return false;
      }

      // Sort by indentation to check for proper nesting
      const sortedLoops = [...loopInfo].sort((a, b) => a.indent - b.indent);

      // Check for truly nested loops with significant indentation difference
      for (let i = 1; i < sortedLoops.length; i++) {
        const outerLoop = sortedLoops[i - 1];
        const innerLoop = sortedLoops[i];

        // Must have significant indentation difference (at least 2 spaces)
        if (innerLoop.indent - outerLoop.indent >= 2) {
          // Check if inner loop is over a small constant list (like keywords, operators)
          // This is to avoid false positives where inner loop is over predefined constants
          const isInnerLoopSmallConstant =
            /for\s+\w+\s+in\s+(keywords|operators|symbols|["'][^"']{0,20}["'])\s*:?\s*$/.test(
              innerLoop.line
            ) ||
            (/for\s+\w+\s+in\s+\[.*\]\s*:?\s*$/.test(innerLoop.line) &&
              innerLoop.line.length < 50);

          // Consider it quadratic if inner loop is NOT over a small constant
          // This allows legitimate nested loops like: for row in matrix + for col in row
          if (!isInnerLoopSmallConstant) {
            return true; // Found truly nested loops with variable iteration
          }
        }
      }

      return false;
    })();

  // Check for O(n³) patterns - actual triple nested loops or matrix multiplication
  const hasCubicPatterns =
    bodyLines.some((line) =>
      // Matrix multiplication pattern
      /for.*range\(.*\).*for.*range\(.*\).*for.*range\(.*\)/.test(
        line.replace(/\s+/g, " ")
      )
    ) ||
    // Check for triple nested structure by analyzing indentation levels
    (() => {
      const loopIndentLevels: number[] = [];

      for (const line of bodyLines) {
        const indent = line.length - line.trimStart().length;
        const trimmedLine = line.trim();

        // Check if this line contains a loop
        if (/^(for\s+\w+\s+in\s+|while\s+)/.test(trimmedLine)) {
          loopIndentLevels.push(indent);
        }
      }

      // Need at least 3 loops for cubic complexity
      if (loopIndentLevels.length < 3) {
        return false;
      }

      // Sort indentation levels to check for proper triple nesting
      const sortedIndents = [...loopIndentLevels].sort((a, b) => a - b);

      // Check if we have at least 3 distinct indentation levels (indicating triple nesting)
      const uniqueIndents = [...new Set(sortedIndents)];
      if (uniqueIndents.length >= 3) {
        // Verify the indentation differences are significant (at least 2 spaces apart)
        for (let i = 2; i < uniqueIndents.length; i++) {
          if (uniqueIndents[i] - uniqueIndents[0] >= 4) {
            // At least 2 levels of nesting
            return true;
          }
        }
      }

      return false;
    })();

  // Check for O(k^n) patterns (exponential with k base, worse than 2^n)
  const hasExponentialKPatterns = (() => {
    const hasRecursiveCall = bodyLines.some((line) => {
      const functionCallPattern = new RegExp(`\\b${functionName}\\s*\\(`, "g");
      const matches = line.match(functionCallPattern);
      if (!matches) {
        return false;
      }

      // Check if it's not a method call on an object
      return matches.some((match) => {
        const beforeMatch = line.substring(0, line.indexOf(match));
        return !beforeMatch.trim().endsWith(".");
      });
    });

    // Check for actual nested loops (not just multiple sequential loops)
    const hasNestedLoops = (() => {
      const loopIndentLevels: number[] = [];

      for (const line of bodyLines) {
        const indent = line.length - line.trimStart().length;
        const trimmedLine = line.trim();

        if (/^(for\s+\w+\s+in\s+|while\s+)/.test(trimmedLine)) {
          loopIndentLevels.push(indent);
        }
      }

      if (loopIndentLevels.length < 2) {
        return false;
      }

      // Check if we have loops at different indentation levels
      const sortedIndents = [...loopIndentLevels].sort((a, b) => a - b);
      for (let i = 1; i < sortedIndents.length; i++) {
        if (sortedIndents[i] - sortedIndents[i - 1] >= 2) {
          return true;
        }
      }

      return false;
    })();

    // Pattern: for item in recursive_function(): for other in collection:
    const hasLoopOverRecursiveResult = bodyLines.some((line) => {
      const functionCallPattern = new RegExp(
        `for.*in\\s+${functionName}\\s*\\(`,
        "g"
      );
      const matches = line.match(functionCallPattern);
      if (!matches) {
        return false;
      }

      // Check if it's not a method call on an object
      return matches.some((match) => {
        const beforeMatch = line.substring(0, line.indexOf(match));
        return !beforeMatch.trim().endsWith(".");
      });
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
        /\brange\s*\(\s*2\s*\*\*\s*(n|len\()/i.test(line) ||
        // Bit manipulation patterns often indicate exponential
        /\b1\s*<<\s*\w+|\w+\s*<<\s*\w+/.test(line)
    ) ||
    // Check for recursive patterns with multiple calls (like fibonacci, hanoi)
    (() => {
      // Count recursive calls to the same function
      const recursiveCallLines = bodyLines.filter((line) => {
        // More specific pattern: look for calls that are actually to this function
        // Not just any occurrence of the function name
        const patterns = [
          // Direct recursive call: functionName(...)
          new RegExp(`\\b${functionName}\\s*\\(`, "g"),
          // Return recursive call: return functionName(...)
          new RegExp(`return\\s+${functionName}\\s*\\(`, "g"),
          // Assignment with recursive call: var = functionName(...)
          new RegExp(`=\\s*${functionName}\\s*\\(`, "g"),
        ];

        // Check if this line contains a recursive call pattern
        return patterns.some((pattern) => {
          const matches = line.match(pattern);
          if (!matches) {
            return false;
          }

          // Additional check: make sure it's not a method call on an object
          // like self.close() or obj.functionName()
          const beforeMatch = line.substring(0, line.indexOf(matches[0]));
          // If there's a dot right before the function name, it's likely a method call on an object
          return !beforeMatch.trim().endsWith(".");
        });
      });

      // If we have multiple recursive calls or multiple calls in extend/append operations
      const totalRecursiveCalls = recursiveCallLines.reduce((count, line) => {
        const patterns = [
          new RegExp(`\\b${functionName}\\s*\\(`, "g"),
          new RegExp(`return\\s+${functionName}\\s*\\(`, "g"),
          new RegExp(`=\\s*${functionName}\\s*\\(`, "g"),
        ];

        let lineCount = 0;
        patterns.forEach((pattern) => {
          const matches = line.match(pattern);
          if (matches) {
            // Filter out method calls on objects
            matches.forEach((match) => {
              const beforeMatch = line.substring(0, line.indexOf(match));
              if (!beforeMatch.trim().endsWith(".")) {
                lineCount++;
              }
            });
          }
        });
        return count + lineCount;
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
