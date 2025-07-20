// Utility functions for code parsing and analysis
import { PythonKeywords } from "../constants/pythonKeyWordsConst";
import { AlgorithmicPatterns } from "../models/AlgorithmicPatterns.model";

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
    (trimmed.startsWith(PythonKeywords.DEF + " ") ||
      trimmed.startsWith("async " + PythonKeywords.DEF + " ")) &&
    trimmed.includes("(") &&
    trimmed.endsWith(":")
  );
}

// Helper function to extract function name from definition
export function extractFunctionName(line: string): string {
  const trimmed = line.trim();

  // Handle both regular and async function definitions
  let defIndex = trimmed.indexOf(PythonKeywords.DEF + " ");
  if (defIndex === -1) {
    // Try async def pattern
    const asyncDefPattern = `${PythonKeywords.ASYNC} ${PythonKeywords.DEF} `;
    defIndex = trimmed.indexOf(asyncDefPattern);
    if (defIndex !== -1) {
      defIndex += 6; // Skip "async " part (6 characters)
    }
  }

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

// Extract function calls from method lines, excluding self-calls and considering scope
export function extractFunctionCalls(
  lines: string[],
  currentFunctionName: string = ""
): string[] {
  const functionCalls: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip lines that are comments or strings (basic check)
    if (
      trimmed.startsWith("#") ||
      trimmed.startsWith('"""') ||
      trimmed.startsWith("'''")
    ) {
      continue;
    }

    // Skip string literals that might contain function-like patterns
    if (isWithinString(line)) {
      continue;
    }

    // Look for function calls: functionName(
    const matches = line.match(/([a-zA-Z_]\w*)\s*\(/g);
    if (matches) {
      for (const match of matches) {
        const functionName = match.replace(/\s*\(/, "");

        // Get the position of this match in the line
        const matchIndex = line.indexOf(match);
        const beforeMatch = line.substring(0, matchIndex);

        // Filter out false positives:
        // 1. Method calls on objects (has dot before)
        if (beforeMatch.trim().endsWith(".")) {
          continue;
        }

        // 2. Dictionary/map assignments (like operations = {'1': self.func})
        if (
          beforeMatch.includes(":") &&
          (beforeMatch.includes("{") || beforeMatch.includes("="))
        ) {
          continue;
        }

        // 3. Function references in data structures (not actual calls)
        if (beforeMatch.includes("[") || beforeMatch.includes(",")) {
          // Check if it's actually a call or just a reference
          const afterMatch = line.substring(matchIndex + match.length);
          if (!afterMatch.trim().startsWith(")") && !afterMatch.includes(")")) {
            continue;
          }
        }

        // 4. Built-in functions, common Python functions, and self-calls
        if (
          !isBuiltinFunction(functionName) &&
          functionName !== currentFunctionName
        ) {
          functionCalls.push(functionName);
        }
      }
    }
  }

  return [...new Set(functionCalls)]; // Remove duplicates
}

// Helper function to check if a function call is within a string literal
function isWithinString(line: string): boolean {
  // Basic check for string literals
  const singleQuoteCount = (line.match(/'/g) || []).length;
  const doubleQuoteCount = (line.match(/"/g) || []).length;

  // If odd number of quotes, likely within string (simple heuristic)
  return singleQuoteCount % 2 === 1 || doubleQuoteCount % 2 === 1;
}

// Extract nested function definitions and their relationships
export function extractNestedFunctions(lines: string[]): Map<string, string[]> {
  const nestedFunctions = new Map<string, string[]>();
  const functionStack: { name: string; indent: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const indent = getIndentLevel(line);

    if (isFunctionDefinition(line)) {
      const functionName = extractFunctionName(line);

      // Remove functions from stack that are at same or higher indentation
      while (
        functionStack.length > 0 &&
        functionStack[functionStack.length - 1].indent >= indent
      ) {
        functionStack.pop();
      }

      // If there's a parent function, this is nested
      if (functionStack.length > 0) {
        const parentFunction = functionStack[functionStack.length - 1].name;
        if (!nestedFunctions.has(parentFunction)) {
          nestedFunctions.set(parentFunction, []);
        }
        nestedFunctions.get(parentFunction)!.push(functionName);
        console.log(
          `Detected nested function: ${functionName} inside ${parentFunction}`
        );
      }

      // Add current function to stack
      functionStack.push({ name: functionName, indent });
    }
  }

  return nestedFunctions;
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
