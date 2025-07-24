import { TimeComplexityPatternDetector } from "./TimeComplexityPatternDetector";
import {
  ComplexityPattern,
  ComplexityAnalysisContext,
} from "../../models/ComplexityNode";

export class LinearithmicTimeComplexityDetector extends TimeComplexityPatternDetector {
  protected readonly complexityNotation = "O(n log n)";
  protected readonly minConfidence = 70;

  detect(context: ComplexityAnalysisContext): ComplexityPattern | null {
    const { node } = context;
    const patterns: string[] = [];
    const reasons: string[] = [];
    let confidence = 0;

    // Pattern 1: Built-in sorting operations
    if (this.detectBuiltinSorting(node)) {
      patterns.push("builtin_sorting");
      reasons.push("Uses built-in sorting functions");
      confidence += 50;
    }

    // Pattern 2: Divide and conquer with merge
    if (this.detectDivideAndConquer(node)) {
      patterns.push("divide_and_conquer");
      reasons.push("Divide and conquer algorithm with merge step");
      confidence += 45;
    }

    // Pattern 3: Heap operations in loop
    if (this.detectHeapOperations(node)) {
      patterns.push("heap_operations");
      reasons.push("Heap operations in linear loop");
      confidence += 40;
    }

    // Pattern 4: Binary search in linear context
    if (this.detectBinarySearchInLoop(node)) {
      patterns.push("binary_search_loop");
      reasons.push("Binary search within linear loop");
      confidence += 35;
    }

    // Pattern 5: Linearithmic keywords
    if (this.detectLinearithmicKeywords(node)) {
      patterns.push("linearithmic_keywords");
      reasons.push("Contains n log n complexity keywords");
      confidence += 25;
    }

    return confidence >= this.minConfidence
      ? this.createPattern(confidence, patterns, reasons)
      : null;
  }

  private detectBuiltinSorting(node: any): boolean {
    const sortingKeywords = [
      "sorted",
      "sort",
      "heapsort",
      "mergesort",
      "quicksort",
    ];

    return node.keywords.some((kw: string) =>
      sortingKeywords.includes(kw.toLowerCase())
    );
  }

  private detectDivideAndConquer(node: any): boolean {
    // Must have recursive calls
    if (node.recursiveCallCount === 0) {
      return false;
    }

    const divideConquerKeywords = [
      "merge",
      "split",
      "divide",
      "conquer",
      "mid",
      "partition",
    ];

    const hasDCKeywords = node.keywords.some((kw: string) =>
      divideConquerKeywords.some((keyword) =>
        kw.toLowerCase().includes(keyword)
      )
    );

    // Look for divide pattern: mid = (left + right) // 2
    let hasDividePattern = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "assignment") {
        const assignText = astNode.text;
        if (
          assignText.includes("//") &&
          assignText.includes("2") &&
          (assignText.includes("mid") || assignText.includes("middle"))
        ) {
          hasDividePattern = true;
        }
      }
    });

    // Look for merge/combine operation
    let hasMergePattern = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "call" && astNode.childCount > 0) {
        const functionName = astNode.child(0);
        if (
          functionName &&
          (functionName.text.includes("merge") ||
            functionName.text.includes("combine"))
        ) {
          hasMergePattern = true;
        }
      }
    });

    return hasDCKeywords || (hasDividePattern && hasMergePattern);
  }

  private detectHeapOperations(node: any): boolean {
    const heapKeywords = ["heap", "heappush", "heappop", "heapify", "priority"];

    const hasHeapKeywords = node.keywords.some((kw: string) =>
      heapKeywords.some((keyword) => kw.toLowerCase().includes(keyword))
    );

    // Look for heap operations in a loop
    let hasHeapInLoop = false;
    if (node.forLoopCount > 0 || node.whileLoopCount > 0) {
      this.traverseAST(node.astNode, (astNode) => {
        if (
          astNode.type === "for_statement" ||
          astNode.type === "while_statement"
        ) {
          this.traverseAST(astNode, (child) => {
            if (child.type === "call" && child.childCount > 0) {
              const functionName = child.child(0);
              if (
                functionName &&
                (functionName.text.includes("heap") ||
                  functionName.text.includes("push") ||
                  functionName.text.includes("pop"))
              ) {
                hasHeapInLoop = true;
              }
            }
          });
        }
      });
    }

    return hasHeapKeywords || hasHeapInLoop;
  }

  private detectBinarySearchInLoop(node: any): boolean {
    // Must have loops
    if (node.forLoopCount + node.whileLoopCount === 0) {
      return false;
    }

    const binarySearchKeywords = ["binary", "bisect", "search", "find"];

    const hasBSKeywords = node.keywords.some((kw: string) =>
      binarySearchKeywords.some((keyword) => kw.toLowerCase().includes(keyword))
    );

    // Look for binary search pattern inside loop
    let hasBinarySearchInLoop = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (
        astNode.type === "for_statement" ||
        astNode.type === "while_statement"
      ) {
        // Look for while loop with left <= right pattern inside
        this.traverseAST(astNode, (child) => {
          if (child.type === "while_statement") {
            const condition = child.text;
            if (
              condition.includes("<=") &&
              (condition.includes("left") ||
                condition.includes("right") ||
                condition.includes("low") ||
                condition.includes("high"))
            ) {
              hasBinarySearchInLoop = true;
            }
          }
        });
      }
    });

    return hasBSKeywords || hasBinarySearchInLoop;
  }

  private detectLinearithmicKeywords(node: any): boolean {
    const linearithmicIndicators = [
      "nlogn",
      "n_log_n",
      "linearithmic",
      "efficient_sort",
      "optimal_sort",
      "merge_sort",
      "quick_sort",
      "heap_sort",
    ];

    return node.keywords.some((kw: string) =>
      linearithmicIndicators.some((indicator) =>
        kw.toLowerCase().includes(indicator)
      )
    );
  }
}
