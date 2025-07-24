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

    // HIGH CONFIDENCE PATTERNS (90-95%) - Regex-style specific detection

    // Pattern 1: Classic merge sort pattern (95% confidence)
    if (this.detectClassicMergeSort(node)) {
      patterns.push("classic_merge_sort");
      reasons.push("Classic merge sort with divide-and-conquer and merge");
      confidence += 95;
    }

    // Pattern 2: Built-in sorting functions (90% confidence)
    if (this.detectBuiltinSortingCalls(node)) {
      patterns.push("builtin_sorting_calls");
      reasons.push("Direct calls to built-in sorting functions (sorted, sort)");
      confidence += 90;
    }

    // Pattern 3: Quick sort pattern (85% confidence)
    if (this.detectClassicQuickSort(node)) {
      patterns.push("classic_quick_sort");
      reasons.push("Classic quicksort with partition and recursive calls");
      confidence += 85;
    }

    // MEDIUM-HIGH CONFIDENCE PATTERNS (75-80%)

    // Pattern 4: Heap sort pattern (80% confidence)
    if (this.detectHeapSort(node)) {
      patterns.push("heap_sort");
      reasons.push("Heap sort with heapify operations");
      confidence += 80;
    }

    // Pattern 5: Divide and conquer with merge (75% confidence)
    if (this.detectDivideAndConquerMerge(node)) {
      patterns.push("divide_conquer_merge");
      reasons.push("Divide and conquer algorithm with linear merge step");
      confidence += 75;
    }

    // Pattern 5b: General divide and conquer pattern (80% confidence)
    if (this.detectGeneralDivideAndConquer(node)) {
      patterns.push("general_divide_conquer");
      reasons.push("Divide and conquer algorithm with recursive structure");
      confidence += 80;
    }

    // MEDIUM CONFIDENCE PATTERNS (60-70%)

    // Pattern 6: Binary search in linear context (70% confidence)
    if (this.detectBinarySearchInLoop(node)) {
      patterns.push("binary_search_loop");
      reasons.push("Binary search within linear loop");
      confidence += 70;
    }

    // Pattern 7: Heap operations in loop (65% confidence)
    if (this.detectHeapOperations(node)) {
      patterns.push("heap_operations");
      reasons.push("Heap operations in linear loop");
      confidence += 65;
    }

    // BASIC PATTERN CHECKS (30-50%)

    // Pattern 8: General sorting keywords (50% confidence)
    if (this.detectLinearithmicKeywords(node)) {
      patterns.push("linearithmic_keywords");
      reasons.push("Contains n log n complexity keywords");
      confidence += 50;
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
    // Must have multiple loops for O(n log n) - binary search inside another loop
    if (node.forLoopCount + node.whileLoopCount < 2) {
      return false;
    }

    const binarySearchKeywords = ["binary", "bisect", "search", "find"];

    const hasBSKeywords = node.keywords.some((kw: string) =>
      binarySearchKeywords.some((keyword) => kw.toLowerCase().includes(keyword))
    );

    // Look for binary search pattern inside ANOTHER loop (nested structure)
    let hasBinarySearchInLoop = false;
    let outerLoopCount = 0;

    this.traverseAST(node.astNode, (astNode) => {
      if (
        astNode.type === "for_statement" ||
        astNode.type === "while_statement"
      ) {
        outerLoopCount++;

        // Look for nested binary search pattern inside this loop
        this.traverseAST(astNode, (child) => {
          if (child.type === "while_statement" && child !== astNode) {
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

    // Only match if we have binary search keywords AND nested loop structure
    return hasBSKeywords && hasBinarySearchInLoop && outerLoopCount >= 2;
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

  // HIGH CONFIDENCE DETECTION METHODS - Regex-style specific patterns

  /**
   * Detects classic merge sort pattern
   * Similar to regex: /merge.*sort.*recursive.*merge/i
   */
  private detectClassicMergeSort(node: any): boolean {
    const functionText = node.astNode.text.toLowerCase();

    // Must have merge sort keywords
    if (
      !functionText.includes("merge") ||
      (!functionText.includes("sort") && !functionText.includes("merge_sort"))
    ) {
      return false;
    }

    let hasRecursiveCall = false;
    let hasMergeFunction = false;
    let hasDividePattern = false;
    let hasBaseCase = false;

    this.traverseAST(node.astNode, (astNode) => {
      // Check for recursive calls
      if (astNode.type === "call") {
        const callText = astNode.text.toLowerCase();
        if (
          callText.includes(node.funcName.toLowerCase()) ||
          callText.includes("merge_sort") ||
          callText.includes("mergesort")
        ) {
          hasRecursiveCall = true;
        }

        // Check for merge function call
        if (callText.includes("merge") && !callText.includes("merge_sort")) {
          hasMergeFunction = true;
        }
      }

      // Check for divide pattern: mid = len(arr) // 2
      if (astNode.type === "assignment") {
        const assignText = astNode.text.toLowerCase();
        if (
          (assignText.includes("//") || assignText.includes("/")) &&
          assignText.includes("2") &&
          (assignText.includes("mid") || assignText.includes("middle"))
        ) {
          hasDividePattern = true;
        }
      }

      // Check for base case
      if (astNode.type === "if_statement") {
        const condText = astNode.text.toLowerCase();
        if (
          (condText.includes("len") || condText.includes("length")) &&
          condText.includes("<=")
        ) {
          hasBaseCase = true;
        }
      }
    });

    return (
      hasRecursiveCall && hasMergeFunction && hasDividePattern && hasBaseCase
    );
  }

  /**
   * Detects built-in sorting function calls
   * Similar to regex: /sorted\s*\(|\.sort\s*\(/i
   */
  private detectBuiltinSortingCalls(node: any): boolean {
    const functionText = node.astNode.text.toLowerCase();

    let hasSortedCall = false;
    let hasListSortCall = false;

    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "call") {
        const callText = astNode.text.toLowerCase();

        // Check for sorted() function
        if (callText.startsWith("sorted(") || callText.includes(" sorted(")) {
          hasSortedCall = true;
        }

        // Check for .sort() method
        if (callText.includes(".sort(")) {
          hasListSortCall = true;
        }
      }
    });

    return hasSortedCall || hasListSortCall;
  }

  /**
   * Detects classic quicksort pattern
   * Similar to regex: /quick.*sort.*partition.*recursive/i or pivot-based sorting
   */
  private detectClassicQuickSort(node: any): boolean {
    const functionText = node.astNode.text.toLowerCase();

    // Must have quicksort keywords
    if (!functionText.includes("quick") || !functionText.includes("sort")) {
      return false;
    }

    let hasPartitionOrPivot = false;
    let hasRecursiveCall = false;
    let hasPivotLogic = false;

    this.traverseAST(node.astNode, (astNode) => {
      // Check for partition function call or logic
      if (astNode.type === "call") {
        const callText = astNode.text.toLowerCase();
        if (callText.includes("partition")) {
          hasPartitionOrPivot = true;
        }

        // Check for recursive quicksort calls
        if (
          callText.includes(node.funcName.toLowerCase()) ||
          callText.includes("quick_sort") ||
          callText.includes("quicksort")
        ) {
          hasRecursiveCall = true;
        }
      }

      // Check for pivot selection and partitioning logic
      if (astNode.type === "assignment") {
        const assignText = astNode.text.toLowerCase();
        if (assignText.includes("pivot")) {
          hasPartitionOrPivot = true;
        }
      }

      // Check for list comprehensions used for partitioning (modern quicksort style)
      if (astNode.type === "list_comprehension") {
        const compText = astNode.text.toLowerCase();
        if (
          compText.includes("pivot") &&
          (compText.includes("<") ||
            compText.includes(">") ||
            compText.includes("=="))
        ) {
          hasPivotLogic = true;
          hasPartitionOrPivot = true;
        }
      }

      // Look for classic partitioning with loops
      if (
        astNode.type === "for_statement" ||
        astNode.type === "while_statement"
      ) {
        const loopText = astNode.text.toLowerCase();
        if (
          loopText.includes("pivot") &&
          (loopText.includes("left") || loopText.includes("right"))
        ) {
          hasPivotLogic = true;
          hasPartitionOrPivot = true;
        }
      }
    });

    return (
      hasPartitionOrPivot &&
      hasRecursiveCall &&
      (hasPivotLogic || hasPartitionOrPivot)
    );
  }

  /**
   * Detects heap sort pattern
   * Similar to regex: /heap.*sort.*heapify/i
   */
  private detectHeapSort(node: any): boolean {
    const functionText = node.astNode.text.toLowerCase();

    // Must have heap sort keywords
    if (!functionText.includes("heap")) {
      return false;
    }

    let hasHeapify = false;
    let hasHeapOperations = false;

    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "call") {
        const callText = astNode.text.toLowerCase();

        // Check for heapify operations
        if (
          callText.includes("heapify") ||
          callText.includes("heap_push") ||
          callText.includes("heap_pop") ||
          callText.includes("heappush") ||
          callText.includes("heappop")
        ) {
          hasHeapify = true;
          hasHeapOperations = true;
        }
      }
    });

    return hasHeapify && hasHeapOperations;
  }

  /**
   * Detects divide and conquer with merge pattern
   * Similar to regex: /divide.*conquer.*merge.*recursive/i
   */
  private detectDivideAndConquerMerge(node: any): boolean {
    // Must have recursive calls
    if (node.recursiveCallCount < 2) {
      return false;
    }

    const functionText = node.astNode.text.toLowerCase();

    let hasDividePattern = false;
    let hasMergePattern = false;
    let hasRecursiveStructure = false;
    let hasLinearWork = false;

    // Check for divide keywords
    if (
      functionText.includes("divide") ||
      functionText.includes("split") ||
      functionText.includes("mid")
    ) {
      hasDividePattern = true;
    }

    // Check for merge pattern - REQUIRED for O(n log n)
    // Look for merge operations in the function body, not the function name

    // Must have explicit merge/combine operation for O(n log n)
    this.traverseAST(node.astNode, (astNode) => {
      // Look for mid calculation
      if (astNode.type === "assignment") {
        const assignText = astNode.text.toLowerCase();
        if (
          assignText.includes("//") &&
          assignText.includes("2") &&
          (assignText.includes("mid") || assignText.includes("middle"))
        ) {
          hasRecursiveStructure = true;
        }

        // Check for merge-like operations in assignments
        if (
          assignText.includes("merge") ||
          assignText.includes("combine") ||
          assignText.includes("concat") ||
          assignText.includes("+") // Simple concatenation
        ) {
          hasMergePattern = true;
          hasLinearWork = true;
        }
      }

      // Look for merge function calls
      if (astNode.type === "call") {
        const callText = astNode.text.toLowerCase();
        if (
          callText.includes("merge(") ||
          callText.includes("combine(") ||
          callText.includes("concat(") ||
          callText.includes("extend(") ||
          callText.includes("append(")
        ) {
          hasMergePattern = true;
          hasLinearWork = true;
        }
      }

      // Look for loops that do linear work (merge operations)
      if (
        astNode.type === "for_statement" ||
        astNode.type === "while_statement"
      ) {
        const loopText = astNode.text.toLowerCase();
        if (
          loopText.includes("result") ||
          loopText.includes("merge") ||
          loopText.includes("combine")
        ) {
          hasMergePattern = true;
          hasLinearWork = true;
        }
      }
    });

    // For true O(n log n), we need divide, merge, and linear work
    return (
      hasDividePattern &&
      hasMergePattern &&
      hasRecursiveStructure &&
      hasLinearWork
    );
  }

  /**
   * Detects general divide and conquer pattern (more relaxed)
   * For algorithms that divide but may not have explicit merge
   */
  private detectGeneralDivideAndConquer(node: any): boolean {
    // Must have recursive calls - STRICT requirement for O(n log n)
    if (node.recursiveCallCount < 2) {
      return false;
    }

    const functionText = node.astNode.text.toLowerCase();

    let hasDividePattern = false;
    let hasRecursiveStructure = false;
    let hasLinearWork = false;

    // Check for divide keywords or patterns
    if (
      functionText.includes("divide") ||
      functionText.includes("conquer") ||
      functionText.includes("split") ||
      functionText.includes("mid")
    ) {
      hasDividePattern = true;
    }

    // Check for classic divide and conquer structure
    this.traverseAST(node.astNode, (astNode) => {
      // Look for mid calculation
      if (astNode.type === "assignment") {
        const assignText = astNode.text.toLowerCase();
        if (
          assignText.includes("//") &&
          assignText.includes("2") &&
          (assignText.includes("mid") || assignText.includes("middle"))
        ) {
          hasRecursiveStructure = true;
        }
      }

      // Look for linear work (only loops that do merge/combine operations)
      if (
        astNode.type === "for_statement" ||
        astNode.type === "while_statement"
      ) {
        const loopText = astNode.text.toLowerCase();
        if (
          loopText.includes("merge") ||
          loopText.includes("combine") ||
          loopText.includes("extend") ||
          loopText.includes("append") ||
          loopText.includes("result")
        ) {
          hasLinearWork = true;
        }
      }

      if (astNode.type === "call") {
        const callText = astNode.text.toLowerCase();
        if (
          callText.includes("merge") ||
          callText.includes("extend") ||
          callText.includes("append") ||
          callText.includes("combine")
        ) {
          hasLinearWork = true;
        }
      }
    });

    // FIXED: More nuanced approach to divide-and-conquer complexity
    // 1. If we have explicit merge operations -> definitely O(n log n)
    // 2. If we have divide-and-conquer structure but name suggests incomplete merge sort -> O(log n)
    // 3. Otherwise, follow original logic for compatibility

    const isIncompleteMergeSort =
      functionText.includes("merge") &&
      !hasLinearWork &&
      hasDividePattern &&
      hasRecursiveStructure;

    if (isIncompleteMergeSort) {
      return false; // Let logarithmic detector handle this
    }

    // For other divide-and-conquer patterns, require either linear work OR classic structure
    const hasClassicDACStructure = hasDividePattern && hasRecursiveStructure;
    const hasLinearDACWork = hasClassicDACStructure && hasLinearWork;

    return hasLinearDACWork || hasClassicDACStructure;
  }
}
