import { TimeComplexityPatternDetector } from "./TimeComplexityPatternDetector";
import {
  ComplexityPattern,
  ComplexityAnalysisContext,
} from "../../models/ComplexityNode";

export class ExponentialTimeComplexityDetector extends TimeComplexityPatternDetector {
  protected readonly complexityNotation = "O(2^n)";
  protected readonly minConfidence = 70;

  detect(context: ComplexityAnalysisContext): ComplexityPattern | null {
    const { node } = context;
    const patterns: string[] = [];
    const reasons: string[] = [];
    let confidence = 0;

    // Pattern 1: Classic binary recursion (fibonacci-like)
    if (this.detectBinaryRecursion(node)) {
      patterns.push("binary_recursion");
      reasons.push("Two recursive calls per function call");
      confidence += 45;
    }

    // Pattern 2: Single recursion with binary choice
    if (this.detectSingleRecursionBinaryChoice(node)) {
      patterns.push("single_recursion_binary_choice");
      reasons.push("Single recursion with binary decision pattern");
      confidence += 35;
    }

    // Pattern 3: Subset/powerset generation
    if (this.detectSubsetGeneration(node)) {
      patterns.push("subset_generation");
      reasons.push("Generates all subsets or combinations");
      confidence += 40;
    }

    // Pattern 4: Backtracking without memoization
    if (this.detectBacktracking(node)) {
      patterns.push("backtracking");
      reasons.push("Backtracking algorithm without memoization");
      confidence += 30;
    }

    // Pattern 5: Exponential keywords
    if (this.detectExponentialKeywords(node)) {
      patterns.push("exponential_keywords");
      reasons.push("Contains exponential-complexity keywords");
      confidence += 20;
    }

    // Exclude if it's actually divide-and-conquer (sorting)
    if (this.isSortingAlgorithm(node)) {
      confidence = Math.max(0, confidence - 50);
      reasons.push("Excluded: Appears to be sorting algorithm");
    }

    return confidence >= this.minConfidence
      ? this.createPattern(confidence, patterns, reasons)
      : null;
  }

  private detectBinaryRecursion(node: any): boolean {
    // Must have at least 2 recursive calls
    if (node.recursiveCallCount < 2) {
      return false;
    }

    // Look for classic fibonacci pattern: func(n-1) + func(n-2)
    let hasFibonacciPattern = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "binary_operator" && astNode.text.includes("+")) {
        // Check if both operands are recursive calls
        let recursiveCallCount = 0;
        this.traverseAST(astNode, (child) => {
          if (child.type === "call" && child.childCount > 0) {
            const functionName = child.child(0);
            if (functionName && functionName.text === node.funcName) {
              recursiveCallCount++;
            }
          }
        });

        if (recursiveCallCount >= 2) {
          hasFibonacciPattern = true;
        }
      }
    });

    return hasFibonacciPattern;
  }

  private detectSingleRecursionBinaryChoice(node: any): boolean {
    // Must have recursive calls
    if (node.recursiveCallCount === 0) {
      return false;
    }

    // Look for binary choice patterns in comments or structure
    const hasBinaryChoiceKeywords = node.keywords.some((kw: string) =>
      ["include", "exclude", "choice", "binary", "two"].includes(
        kw.toLowerCase()
      )
    );

    // Look for if-else patterns with recursive calls
    let hasIfElseRecursion = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "if_statement") {
        let hasRecursiveInIf = false;
        let hasRecursiveInElse = false;

        // Check if condition and else clause
        for (let i = 0; i < astNode.childCount; i++) {
          const child = astNode.child(i);
          if (child) {
            if (
              child.type === "block" ||
              child.type === "expression_statement"
            ) {
              this.traverseAST(child, (grandchild) => {
                if (grandchild.type === "call" && grandchild.childCount > 0) {
                  const functionName = grandchild.child(0);
                  if (functionName && functionName.text === node.funcName) {
                    if (i <= astNode.childCount / 2) {
                      hasRecursiveInIf = true;
                    } else {
                      hasRecursiveInElse = true;
                    }
                  }
                }
              });
            }
          }
        }

        if (hasRecursiveInIf && hasRecursiveInElse) {
          hasIfElseRecursion = true;
        }
      }
    });

    return hasBinaryChoiceKeywords || hasIfElseRecursion;
  }

  private detectSubsetGeneration(node: any): boolean {
    const subsetKeywords = [
      "subset",
      "powerset",
      "power_set",
      "combination",
      "generate",
      "all_subsets",
      "binary_tree",
      "paths",
    ];

    const hasSubsetKeywords = node.keywords.some((kw: string) =>
      subsetKeywords.some((keyword) => kw.toLowerCase().includes(keyword))
    );

    // Look for append operations with recursive calls
    let hasAppendWithRecursion = false;
    if (node.recursiveCallCount > 0) {
      this.traverseAST(node.astNode, (astNode) => {
        if (astNode.type === "call" && astNode.childCount > 0) {
          const methodCall = astNode.child(0);
          if (methodCall && methodCall.text.includes("append")) {
            hasAppendWithRecursion = true;
          }
        }
      });
    }

    return hasSubsetKeywords || hasAppendWithRecursion;
  }

  private detectBacktracking(node: any): boolean {
    const backtrackingKeywords = [
      "backtrack",
      "maze",
      "solve",
      "path",
      "visited",
      "mark",
      "unmark",
      "restore",
      "undo",
    ];

    const hasBacktrackKeywords = node.keywords.some((kw: string) =>
      backtrackingKeywords.some((keyword) => kw.toLowerCase().includes(keyword))
    );

    // Look for patterns that mark and unmark (backtracking)
    let hasMarkUnmarkPattern = false;
    this.traverseAST(node.astNode, (astNode) => {
      const nodeText = astNode.text.toLowerCase();
      if (
        nodeText.includes("mark") ||
        nodeText.includes("visited") ||
        nodeText.includes("pop") ||
        nodeText.includes("restore")
      ) {
        hasMarkUnmarkPattern = true;
      }
    });

    return hasBacktrackKeywords || hasMarkUnmarkPattern;
  }

  private detectExponentialKeywords(node: any): boolean {
    const exponentialIndicators = [
      "fibonacci",
      "fib",
      "tower",
      "hanoi",
      "exponential",
      "2^n",
      "binary_choice",
      "exhaustive",
      "brute_force",
    ];

    return node.keywords.some((kw: string) =>
      exponentialIndicators.some((indicator) =>
        kw.toLowerCase().includes(indicator)
      )
    );
  }

  private isSortingAlgorithm(node: any): boolean {
    const sortingKeywords = [
      "sort",
      "sorted",
      "merge",
      "quick",
      "heap",
      "partition",
      "divide",
      "conquer",
    ];

    return node.keywords.some((kw: string) =>
      sortingKeywords.includes(kw.toLowerCase())
    );
  }
}
