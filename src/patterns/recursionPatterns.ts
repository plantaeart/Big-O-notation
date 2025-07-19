import {
  countFunctionCalls,
  extractFunctionName,
  isFunctionDefinition,
} from "../utils/codeParser";

// Analyze recursive patterns in a function
export function analyzeRecursion(
  lines: string[],
  functionName: string
): {
  isRecursive: boolean;
  recursiveCallsPerLevel: number;
  hasBaseCase: boolean;
  recursionType: "linear" | "binary" | "multiple" | "none";
} {
  let totalRecursiveCalls = 0;
  let hasBaseCase = false;
  let maxCallsInLine = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for base case patterns
    if (
      trimmed.startsWith("if ") &&
      (trimmed.includes("return") ||
        trimmed.includes("<=") ||
        trimmed.includes("=="))
    ) {
      hasBaseCase = true;
    }

    // Count recursive calls in this line
    const callsInLine = countFunctionCalls(line, functionName);
    totalRecursiveCalls += callsInLine;
    maxCallsInLine = Math.max(maxCallsInLine, callsInLine);
  }

  const isRecursive = totalRecursiveCalls > 0;

  let recursionType: "linear" | "binary" | "multiple" | "none" = "none";
  if (isRecursive) {
    if (maxCallsInLine === 1) {
      recursionType = "linear";
    } else if (maxCallsInLine === 2) {
      recursionType = "binary";
    } else if (maxCallsInLine > 2) {
      recursionType = "multiple";
    }
  }

  return {
    isRecursive,
    recursiveCallsPerLevel: maxCallsInLine,
    hasBaseCase,
    recursionType,
  };
}

// Detect exponential patterns
export function detectExponential(
  lines: string[],
  functionName: string
): boolean {
  const recursionInfo = analyzeRecursion(lines, functionName);

  // Multiple recursive calls per function call = exponential
  if (recursionInfo.recursiveCallsPerLevel >= 2) {
    return true;
  }

  // Check for patterns like generating all subsets
  const hasSubsetPattern = lines.some((line) =>
    /subset|powerset|combination/.test(line.toLowerCase())
  );

  // Check for backtracking patterns
  const hasBacktracking = lines.some((line) =>
    /backtrack|permut|all_/.test(line.toLowerCase())
  );

  return hasSubsetPattern || hasBacktracking;
}

// Detect factorial patterns
export function detectFactorial(
  lines: string[],
  functionName: string
): boolean {
  const recursionInfo = analyzeRecursion(lines, functionName);

  // Look for patterns that suggest factorial complexity
  const hasPermutationPattern = lines.some((line) =>
    /permut|factorial|arrangement/.test(line.toLowerCase())
  );

  const hasNestedRecursion = lines.some((line) => {
    const calls = countFunctionCalls(line, functionName);
    return calls > 0 && /for|while/.test(line);
  });

  return hasPermutationPattern || hasNestedRecursion;
}

// Get complexity based on recursion analysis
export function getRecursionComplexity(
  lines: string[],
  functionName: string
): string {
  const recursionInfo = analyzeRecursion(lines, functionName);

  // If not recursive, return O(1) - the function is not adding complexity through recursion
  if (!recursionInfo.isRecursive) {
    return "O(1)";
  }

  // Check for factorial patterns first
  if (detectFactorial(lines, functionName)) {
    return "O(n!)";
  }

  // Check for exponential patterns
  if (detectExponential(lines, functionName)) {
    return "O(2^n)";
  }

  // Linear recursion with work per call
  if (recursionInfo.recursionType === "linear") {
    // Check if there's additional work in each call
    const hasLinearWork = lines.some(
      (line) =>
        /for|while|sum|max|min/.test(line) &&
        !countFunctionCalls(line, functionName)
    );

    return hasLinearWork ? "O(n²)" : "O(n)";
  }

  // Binary recursion (like Fibonacci)
  if (recursionInfo.recursionType === "binary") {
    return "O(2^n)";
  }

  // Multiple recursion
  if (recursionInfo.recursionType === "multiple") {
    return "O(n!)";
  }

  return "O(n)";
}

// Detect tail recursion (which is often O(n))
export function isTailRecursive(
  lines: string[],
  functionName: string
): boolean {
  const returnLines = lines.filter(
    (line) =>
      line.trim().startsWith("return") &&
      countFunctionCalls(line, functionName) > 0
  );

  // In tail recursion, the recursive call should be the last operation
  return returnLines.some((line) => {
    const trimmed = line.trim();
    const returnIndex = trimmed.indexOf("return");
    const callIndex = trimmed.indexOf(functionName + "(");

    // The function call should be directly after 'return'
    return (
      callIndex > returnIndex &&
      trimmed.substring(callIndex).indexOf(")") === trimmed.length - 1
    );
  });
}
