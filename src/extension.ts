// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "big-o-notation" is now active!'
  );

  // Register the main command to analyze Python file and add Big-O comments
  const analyzeAndAddComments = vscode.commands.registerCommand(
    "big-o-notation.analyzeComplexity",
    async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showErrorMessage(
          "No active editor found. Please open a Python file."
        );
        return;
      }

      const document = activeEditor.document;
      if (!document.fileName.endsWith(".py")) {
        vscode.window.showErrorMessage(
          "Please open a Python file (.py) to analyze."
        );
        return;
      }

      const fileContent = document.getText();
      const analysis = analyzePythonComplexity(fileContent);

      if (analysis.length === 0) {
        vscode.window.showInformationMessage(
          "No Python methods found in the current file."
        );
        return;
      }

      await addBigOComments(activeEditor, analysis);

      vscode.window.showInformationMessage(
        `✅ Added Big-O comments to ${analysis.length} method(s)!`
      );
    }
  );

  // Add command to subscriptions
  context.subscriptions.push(analyzeAndAddComments);
}

// This method is called when your extension is deactivated
export function deactivate() {}

// Function to add Big-O comments above Python methods
async function addBigOComments(
  editor: vscode.TextEditor,
  analysis: MethodAnalysis[]
): Promise<void> {
  await editor.edit((editBuilder) => {
    // Sort analysis by line number in reverse order to avoid line number shifts
    const sortedAnalysis = analysis.sort((a, b) => b.lineStart - a.lineStart);

    sortedAnalysis.forEach((method) => {
      const lineIndex = method.lineStart - 1; // Convert to 0-based index
      const line = editor.document.lineAt(lineIndex);
      const indent = getIndentFromLine(line.text);

      // Create the Big-O comment
      const comment = `${indent}# Time Complexity: ${method.complexity.notation} - ${method.complexity.description}\n`;

      // Insert comment above the method
      const position = new vscode.Position(lineIndex, 0);
      editBuilder.insert(position, comment);
    });
  });
}

// Helper function to get indentation from a line
function getIndentFromLine(lineText: string): string {
  const match = lineText.match(/^(\s*)/);
  return match ? match[1] : "";
}

// Interface for complexity analysis results
interface ComplexityResult {
  notation: string;
  description: string;
  confidence: number;
}

interface MethodAnalysis {
  name: string;
  lineStart: number;
  lineEnd: number;
  complexity: ComplexityResult;
  explanation: string;
}

// Function to analyze Python file and extract methods with their complexity
function analyzePythonComplexity(fileContent: string): MethodAnalysis[] {
  const lines = fileContent.split("\n");
  const methods: MethodAnalysis[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect function definitions
    const functionMatch = line.match(/^def\s+(\w+)\s*\(/);
    if (functionMatch) {
      const methodName = functionMatch[1];
      const startLine = i + 1; // 1-based line numbers

      // Find the end of the function
      let endLine = startLine;
      let indentLevel = getIndentLevel(lines[i]);

      for (let j = i + 1; j < lines.length; j++) {
        const currentLine = lines[j];
        if (currentLine.trim() === "") {
          continue; // Skip empty lines
        }

        const currentIndent = getIndentLevel(currentLine);
        if (currentIndent <= indentLevel && currentLine.trim() !== "") {
          endLine = j;
          break;
        }
        endLine = j + 1;
      }

      // Extract method body for analysis
      const methodBody = lines.slice(i, endLine).join("\n");
      const complexity = analyzeCodeComplexity(methodBody);

      methods.push({
        name: methodName,
        lineStart: startLine,
        lineEnd: endLine,
        complexity: complexity,
        explanation: generateExplanation(methodBody, complexity),
      });
    }
  }

  return methods;
}

// Helper function to get indentation level
function getIndentLevel(line: string): number {
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

// Function to analyze code complexity based on simple patterns from the article
function analyzeCodeComplexity(code: string): ComplexityResult {
  const lowerCode = code.toLowerCase();

  // Count loops
  const forLoops = (code.match(/\bfor\b/g) || []).length;
  const whileLoops = (code.match(/\bwhile\b/g) || []).length;
  const totalLoops = forLoops + whileLoops;

  // Check for recursion
  const functionMatch = code.match(/def\s+(\w+)/);
  const functionName = functionMatch ? functionMatch[1] : "";
  const hasRecursion = functionName && code.includes(functionName + "(");

  // Count recursive calls
  const recursiveCalls = hasRecursion
    ? (code.match(new RegExp(functionName + "\\(", "g")) || []).length - 1
    : 0;

  // Check for specific patterns
  const hasBinarySearch =
    lowerCode.includes("binary") ||
    (lowerCode.includes("mid") &&
      lowerCode.includes("left") &&
      lowerCode.includes("right") &&
      lowerCode.includes("while"));

  const hasSorting =
    lowerCode.includes("sorted(") ||
    lowerCode.includes("sort()") ||
    lowerCode.includes("merge_sort") ||
    lowerCode.includes("quick_sort");

  const hasHashAccess =
    lowerCode.includes("dict") ||
    (lowerCode.includes("[") &&
      lowerCode.includes("]") &&
      totalLoops === 0 &&
      !hasRecursion);

  // Check for array/list access without loops
  const hasSimpleAccess =
    (lowerCode.includes("[0]") || lowerCode.includes("arr[0]")) &&
    totalLoops === 0 &&
    !hasRecursion;

  // Analysis based on the article's patterns:

  // O(n!) - Factorial: ONLY for recursive algorithms with loops (like permutation generation)
  // This is very specific - must have recursion AND loops AND multiple recursive calls
  if (hasRecursion && totalLoops > 0 && recursiveCalls >= 1) {
    return {
      notation: "O(n!)",
      description: "Factorial - Recursive permutation/factorial algorithm",
      confidence: 90,
    };
  }

  // O(n log n) - Linearithmic: Sorting algorithms (including merge sort)
  if (
    hasSorting ||
    (hasRecursion &&
      recursiveCalls >= 2 &&
      (lowerCode.includes("merge") ||
        lowerCode.includes("sort") ||
        lowerCode.includes("mid") ||
        lowerCode.includes("left") ||
        lowerCode.includes("right")))
  ) {
    return {
      notation: "O(n log n)",
      description: "Linearithmic - Sorting operation",
      confidence: 90,
    };
  }

  // O(2^n) - Exponential: Multiple recursive calls (like Fibonacci, but NOT merge sort)
  if (
    hasRecursion &&
    recursiveCalls >= 2 &&
    !lowerCode.includes("merge") &&
    !lowerCode.includes("sort") &&
    !lowerCode.includes("left") &&
    !lowerCode.includes("right")
  ) {
    return {
      notation: "O(2^n)",
      description: "Exponential - Multiple recursive calls",
      confidence: 95,
    };
  }

  // O(log n) - Logarithmic: Binary search patterns
  if (hasBinarySearch) {
    return {
      notation: "O(log n)",
      description: "Logarithmic - Binary search pattern",
      confidence: 95,
    };
  }

  // O(n^3) - Cubic: Three nested loops
  if (totalLoops >= 3) {
    return {
      notation: "O(n³)",
      description: "Cubic - Triple nested loops",
      confidence: 90,
    };
  }

  // O(n^2) - Quadratic: Two nested loops
  if (totalLoops === 2) {
    return {
      notation: "O(n²)",
      description: "Quadratic - Nested loops",
      confidence: 85,
    };
  }

  // O(n) - Linear: Single loop or simple recursion
  if (totalLoops === 1) {
    return {
      notation: "O(n)",
      description: "Linear - Single loop",
      confidence: 90,
    };
  }

  // O(n) - Linear: Simple recursion (single recursive call)
  if (hasRecursion && recursiveCalls === 1) {
    return {
      notation: "O(n)",
      description: "Linear - Simple recursion",
      confidence: 85,
    };
  }

  // O(1) - Constant: Simple array access
  if (hasSimpleAccess) {
    return {
      notation: "O(1)",
      description: "Constant - Direct array access",
      confidence: 95,
    };
  }

  // O(1) - Constant: Hash access
  if (hasHashAccess) {
    return {
      notation: "O(1)",
      description: "Constant - Hash table access",
      confidence: 85,
    };
  }

  // O(1) - Default: No loops, simple operations
  return {
    notation: "O(1)",
    description: "Constant - Simple operations",
    confidence: 70,
  };
}

// Function to generate simple explanation for the complexity analysis
function generateExplanation(
  code: string,
  complexity: ComplexityResult
): string {
  const explanations = [];

  const loops = (code.match(/\b(for|while)\b/g) || []).length;
  if (loops > 0) {
    explanations.push(`${loops} loop(s) detected`);
  }

  const functionMatch = code.match(/def\s+(\w+)/);
  const functionName = functionMatch ? functionMatch[1] : "";
  const hasRecursion = functionName && code.includes(functionName + "(");

  if (hasRecursion) {
    const recursiveCalls =
      (code.match(new RegExp(functionName + "\\(", "g")) || []).length - 1;
    explanations.push(`Recursive calls: ${recursiveCalls}`);

    if (loops > 0) {
      explanations.push("Recursion with loops (factorial pattern)");
    }
  }

  if (code.includes("sorted(") || code.includes("sort()")) {
    explanations.push("Sorting operation detected");
  }

  if (code.includes("dict") || code.includes("{}")) {
    explanations.push("Hash table usage detected");
  }

  if (
    code.includes("binary") ||
    (code.includes("mid") && code.includes("left") && code.includes("right"))
  ) {
    explanations.push("Binary search pattern detected");
  }

  if (code.includes("[0]") && loops === 0 && !hasRecursion) {
    explanations.push("Direct array access");
  }

  return explanations.length > 0
    ? explanations.join(", ")
    : "Simple operations only";
}
