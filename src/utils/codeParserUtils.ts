// Utility functions for code parsing and analysis
import { PythonKeywords } from "../constants/pythonKeyWordsConst";
import { AlgorithmicPatterns } from "../types";

// Helper function to get indentation level
export function getIndentLevel(line: string): number {
  let indent = 0;
  for (const char of line) {
    if (char === " ") {
      indent++;
    } else if (char === "\t") {
      indent += 4; // Count tab as 4 spaces
    } else {
      break;
    }
  }
  return indent;
}

// Helper function to get indentation from a line
export function getIndentFromLine(lineText: string): string {
  const match = lineText.match(/^(\s*)/);
  return match ? match[1] : "";
}

// Helper function to detect function definitions
export function isFunctionDefinition(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith(PythonKeywords.DEF + " ") &&
    trimmed.includes("(") &&
    trimmed.endsWith(":")
  );
}

// Helper function to extract function name from definition
export function extractFunctionName(line: string): string {
  const trimmed = line.trim();
  const defIndex = trimmed.indexOf(PythonKeywords.DEF + " ");
  const parenIndex = trimmed.indexOf("(");
  if (defIndex !== -1 && parenIndex !== -1) {
    return trimmed.substring(defIndex + 4, parenIndex).trim();
  }
  return "";
}

// Helper function to count function calls in a line
export function countFunctionCalls(line: string, functionName: string): number {
  let count = 0;
  let index = 0;

  while ((index = line.indexOf(functionName + "(", index)) !== -1) {
    // Check if it's a valid function call (not part of another identifier)
    const beforeChar = index > 0 ? line[index - 1] : " ";
    const isValidCall = /[\s\(\)\[\]\{\},;=+\-*/!<>]/.test(beforeChar);

    if (isValidCall) {
      count++;
    }
    index += functionName.length + 1;
  }

  return count;
}

// Helper function to detect list comprehensions which are also loops
export function isListComprehension(line: string): boolean {
  return (
    (line.includes("[") &&
      line.includes(PythonKeywords.FOR) &&
      line.includes("in") &&
      line.includes("]")) ||
    (line.includes("(") &&
      line.includes(PythonKeywords.FOR) &&
      line.includes(PythonKeywords.IN) &&
      line.includes(")"))
  );
}

// Helper function to detect loop statements
export function isLoopStatement(line: string): boolean {
  const trimmed = line.trim();

  // Match for loop patterns
  if (trimmed.startsWith(PythonKeywords.FOR + " ")) {
    // Check if it's a proper for loop (has 'in' keyword)
    return (
      trimmed.includes(" " + PythonKeywords.IN + " ") && trimmed.endsWith(":")
    );
  }

  // Match while loop patterns
  if (trimmed.startsWith(PythonKeywords.WHILE + " ")) {
    // Check if it's a proper while loop (has ':' at the end)
    return trimmed.endsWith(":");
  }

  return false;
}

// Extract function calls from method lines
export function extractFunctionCalls(lines: string[]): string[] {
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

// Check if line creates a variable/data structure
export function isVariableCreation(line: string): boolean {
  return /^\s*\w+\s*=/.test(line) && !line.includes("==");
}

// Check if line has recursive function call
export function isRecursiveCall(line: string): boolean {
  // Look for function calls that might be recursive
  return /\w+\(.*\w+.*[-+*/]\s*\d+.*\)/.test(line);
}

// Check if operation is in-place
export function isInPlaceOperation(line: string): boolean {
  // Operations that modify existing data structures
  return /\.append\(|\.pop\(|\.sort\(|\.reverse\(|\[\s*\w+\s*\]\s*=/.test(line);
}

// Check if a function name is a built-in Python function
function isBuiltinFunction(functionName: string): boolean {
  const builtins = [
    PythonKeywords.PRINT,
    PythonKeywords.LEN,
    PythonKeywords.RANGE,
    PythonKeywords.SUM,
    PythonKeywords.MAX,
    PythonKeywords.MIN,
    PythonKeywords.SORTED,
    PythonKeywords.LIST,
    PythonKeywords.TUPLE,
    PythonKeywords.SET,
    PythonKeywords.DICT,
    PythonKeywords.STR,
    PythonKeywords.INT,
    PythonKeywords.FLOAT,
    PythonKeywords.BOOL,
    PythonKeywords.ENUMERATE,
    PythonKeywords.ZIP,
    PythonKeywords.MAP,
    PythonKeywords.FILTER,
    PythonKeywords.APPEND,
    PythonKeywords.EXTEND,
    PythonKeywords.INSERT,
    PythonKeywords.REMOVE,
    PythonKeywords.POP,
    PythonKeywords.CLEAR,
    PythonKeywords.INDEX,
    PythonKeywords.COUNT,
    PythonKeywords.SORT,
    PythonKeywords.REVERSE,
    PythonKeywords.COPY,
    PythonKeywords.GET,
    PythonKeywords.KEYS,
    PythonKeywords.VALUES,
    PythonKeywords.ITEMS,
  ];
  return builtins.includes(functionName);
}
