import { TimeComplexityPatternDetector } from "./TimeComplexityPatternDetector";
import {
  ComplexityPattern,
  ComplexityAnalysisContext,
} from "../models/ComplexityNode";

export class LinearTimeComplexityDetector extends TimeComplexityPatternDetector {
  protected readonly complexityNotation = "O(n)";
  protected readonly minConfidence = 60;

  detect(context: ComplexityAnalysisContext): ComplexityPattern | null {
    const { node } = context;
    const patterns: string[] = [];
    const reasons: string[] = [];
    let confidence = 0;

    // Pattern 1: Single loop through input
    if (this.detectSingleLoop(node)) {
      patterns.push("single_loop");
      reasons.push("Single loop through input data");
      confidence += 40;
    }

    // Pattern 2: Built-in linear operations
    if (this.detectBuiltinLinearOps(node)) {
      patterns.push("builtin_linear_ops");
      reasons.push("Uses built-in linear operations");
      confidence += 35;
    }

    // Pattern 3: List comprehensions
    if (this.detectListComprehensions(node)) {
      patterns.push("list_comprehensions");
      reasons.push("List comprehensions over input");
      confidence += 30;
    }

    // Pattern 4: Linear recursive calls
    if (this.detectLinearRecursion(node)) {
      patterns.push("linear_recursion");
      reasons.push("Linear recursive pattern");
      confidence += 25;
    }

    // Pattern 5: Linear keywords
    if (this.detectLinearKeywords(node)) {
      patterns.push("linear_keywords");
      reasons.push("Contains linear complexity keywords");
      confidence += 20;
    }

    // Exclude if it's actually higher complexity
    if (this.isHigherComplexity(node)) {
      confidence = Math.max(0, confidence - 30);
      reasons.push("Excluded: Appears to be higher complexity");
    }

    return confidence >= this.minConfidence
      ? this.createPattern(confidence, patterns, reasons)
      : null;
  }

  private detectSingleLoop(node: any): boolean {
    // Must have exactly one loop (for or while)
    const totalLoops = node.forLoopCount + node.whileLoopCount;
    if (totalLoops !== 1) {
      return false;
    }

    // Must not be nested
    if (node.isNested) {
      return false;
    }

    // Look for loop over input data
    let loopsOverInput = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "for_statement") {
        const loopText = astNode.text;
        // Common patterns: for item in array, for i in range(len(array))
        if (
          loopText.includes("in ") &&
          (loopText.includes("range") ||
            loopText.includes("len") ||
            !loopText.includes("range("))
        ) {
          loopsOverInput = true;
        }
      }
    });

    return loopsOverInput;
  }

  private detectBuiltinLinearOps(node: any): boolean {
    const linearOps = [
      "sum",
      "max",
      "min",
      "len",
      "count",
      "index",
      "find",
      "append",
      "extend",
      "remove",
      "pop",
      "insert",
    ];

    return node.keywords.some((kw: string) =>
      linearOps.includes(kw.toLowerCase())
    );
  }

  private detectListComprehensions(node: any): boolean {
    // Look for list comprehension patterns in AST
    let hasListComp = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (
        astNode.type === "list_comprehension" ||
        astNode.type === "set_comprehension" ||
        astNode.type === "dictionary_comprehension"
      ) {
        hasListComp = true;
      }

      // Also check for comprehension-like patterns
      if (astNode.type === "assignment") {
        const assignText = astNode.text;
        if (
          assignText.includes("[") &&
          assignText.includes("for") &&
          assignText.includes("in") &&
          assignText.includes("]")
        ) {
          hasListComp = true;
        }
      }
    });

    return hasListComp;
  }

  private detectLinearRecursion(node: any): boolean {
    // Must have recursive calls but not multiple calls per level
    if (node.recursiveCallCount === 0) {
      return false;
    }

    // Look for single recursive call pattern (tail recursion or linear recursion)
    let hasSingleRecursiveCall = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "return_statement") {
        let recursiveCallsInReturn = 0;
        this.traverseAST(astNode, (child) => {
          if (child.type === "call" && child.childCount > 0) {
            const functionName = child.child(0);
            if (functionName && functionName.text === node.funcName) {
              recursiveCallsInReturn++;
            }
          }
        });

        // Single recursive call in return statement
        if (recursiveCallsInReturn === 1) {
          hasSingleRecursiveCall = true;
        }
      }
    });

    return hasSingleRecursiveCall;
  }

  private detectLinearKeywords(node: any): boolean {
    const linearIndicators = [
      "linear",
      "scan",
      "traverse",
      "iterate",
      "pass",
      "single_pass",
      "one_pass",
      "sequential",
      "stream",
    ];

    return node.keywords.some((kw: string) =>
      linearIndicators.some((indicator) => kw.toLowerCase().includes(indicator))
    );
  }

  private isHigherComplexity(node: any): boolean {
    // Exclude if nested loops
    if (node.isNested) {
      return true;
    }

    // Exclude if multiple recursive calls
    if (node.recursiveCallCount > 1) {
      return true;
    }

    // Exclude if sorting operations
    const sortingKeywords = ["sort", "sorted", "merge", "quick", "heap"];
    const hasSorting = node.keywords.some((kw: string) =>
      sortingKeywords.includes(kw.toLowerCase())
    );

    return hasSorting;
  }
}
