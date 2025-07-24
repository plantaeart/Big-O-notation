import { ComplexityPatternDetector } from "./ComplexityPatternDetector";
import {
  ComplexityPattern,
  ComplexityAnalysisContext,
} from "../../models/ComplexityNode";

export class LogarithmicComplexityDetector extends ComplexityPatternDetector {
  protected readonly complexityNotation = "O(log n)";
  protected readonly minConfidence = 70;

  detect(context: ComplexityAnalysisContext): ComplexityPattern | null {
    const { node } = context;
    const patterns: string[] = [];
    const reasons: string[] = [];
    let confidence = 0;

    // Pattern 1: Binary search patterns
    if (this.detectBinarySearch(node)) {
      patterns.push("binary_search");
      reasons.push("Binary search algorithm");
      confidence += 50;
    }

    // Pattern 2: Tree traversal (single path)
    if (this.detectTreeTraversal(node)) {
      patterns.push("tree_traversal");
      reasons.push("Tree traversal down single path");
      confidence += 40;
    }

    // Pattern 3: Halving operations
    if (this.detectHalvingOperations(node)) {
      patterns.push("halving_operations");
      reasons.push("Operations that halve input size");
      confidence += 45;
    }

    // Pattern 4: Heap operations
    if (this.detectHeapOperations(node)) {
      patterns.push("heap_operations");
      reasons.push("Individual heap operations");
      confidence += 35;
    }

    // Pattern 5: Logarithmic keywords
    if (this.detectLogarithmicKeywords(node)) {
      patterns.push("logarithmic_keywords");
      reasons.push("Contains logarithmic complexity keywords");
      confidence += 25;
    }

    return confidence >= this.minConfidence
      ? this.createPattern(confidence, patterns, reasons)
      : null;
  }

  private detectBinarySearch(node: any): boolean {
    const binarySearchKeywords = ["binary", "search", "bisect"];

    const hasBSKeywords = node.keywords.some((kw: string) =>
      binarySearchKeywords.some((keyword) => kw.toLowerCase().includes(keyword))
    );

    // Look for binary search pattern: while left <= right
    let hasBinarySearchPattern = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "while_statement") {
        const condition = astNode.text;
        if (
          condition.includes("<=") &&
          ((condition.includes("left") && condition.includes("right")) ||
            (condition.includes("low") && condition.includes("high")) ||
            (condition.includes("start") && condition.includes("end")))
        ) {
          // Look for mid calculation
          this.traverseAST(astNode, (child) => {
            if (child.type === "assignment") {
              const assignText = child.text;
              if (
                assignText.includes("mid") &&
                (assignText.includes("//") || assignText.includes("/")) &&
                assignText.includes("2")
              ) {
                hasBinarySearchPattern = true;
              }
            }
          });
        }
      }
    });

    return hasBSKeywords || hasBinarySearchPattern;
  }

  private detectTreeTraversal(node: any): boolean {
    const treeKeywords = [
      "tree",
      "node",
      "root",
      "left",
      "right",
      "parent",
      "child",
    ];

    const hasTreeKeywords = node.keywords.some((kw: string) =>
      treeKeywords.some((keyword) => kw.toLowerCase().includes(keyword))
    );

    // Look for single path traversal (not visiting all nodes)
    let hasSinglePathTraversal = false;
    if (node.recursiveCallCount > 0) {
      this.traverseAST(node.astNode, (astNode) => {
        if (astNode.type === "if_statement") {
          // Look for conditional tree traversal (going down one path)
          let recursiveCallsInCondition = 0;
          this.traverseAST(astNode, (child) => {
            if (child.type === "call" && child.childCount > 0) {
              const functionName = child.child(0);
              if (functionName && functionName.text === node.funcName) {
                recursiveCallsInCondition++;
              }
            }
          });

          // Single recursive call in conditional suggests single path
          if (recursiveCallsInCondition === 1) {
            hasSinglePathTraversal = true;
          }
        }
      });
    }

    return hasTreeKeywords || hasSinglePathTraversal;
  }

  private detectHalvingOperations(node: any): boolean {
    // Look for loop variable being halved
    let hasHalvingLoop = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "while_statement") {
        // Look for patterns like: while n > 0: n = n // 2
        this.traverseAST(astNode, (child) => {
          if (child.type === "assignment") {
            const assignText = child.text;
            if (
              (assignText.includes("//") && assignText.includes("2")) ||
              (assignText.includes("/") && assignText.includes("2")) ||
              (assignText.includes("*") && assignText.includes("2"))
            ) {
              hasHalvingLoop = true;
            }
          }
        });
      }
    });

    // Look for recursive calls with halved parameters
    let hasHalvingRecursion = false;
    if (node.recursiveCallCount > 0) {
      this.traverseAST(node.astNode, (astNode) => {
        if (astNode.type === "call" && astNode.childCount > 0) {
          const functionName = astNode.child(0);
          if (functionName && functionName.text === node.funcName) {
            // Check if arguments involve halving
            const callText = astNode.text;
            if (callText.includes("//") && callText.includes("2")) {
              hasHalvingRecursion = true;
            }
          }
        }
      });
    }

    return hasHalvingLoop || hasHalvingRecursion;
  }

  private detectHeapOperations(node: any): boolean {
    const heapKeywords = ["heap", "heappush", "heappop", "heapify"];

    const hasHeapKeywords = node.keywords.some((kw: string) =>
      heapKeywords.some((keyword) => kw.toLowerCase().includes(keyword))
    );

    // Must not be in a loop (that would be O(n log n))
    const notInLoop = node.forLoopCount + node.whileLoopCount === 0;

    return hasHeapKeywords && notInLoop;
  }

  private detectLogarithmicKeywords(node: any): boolean {
    const logarithmicIndicators = [
      "log",
      "logarithmic",
      "binary",
      "halve",
      "divide",
      "search",
      "bisection",
      "dichotomy",
    ];

    return node.keywords.some((kw: string) =>
      logarithmicIndicators.some((indicator) =>
        kw.toLowerCase().includes(indicator)
      )
    );
  }
}
