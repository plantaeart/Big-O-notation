import { TimeComplexityPatternDetector } from "./TimeComplexityPatternDetector";
import {
  ComplexityPattern,
  ComplexityAnalysisContext,
} from "../../models/ComplexityNode";
import { TimeComplexityNotation } from "../../constants/timeComplexityNotationsConst";

export class QuadraticTimeComplexityDetector extends TimeComplexityPatternDetector {
  protected readonly complexityNotation = TimeComplexityNotation.QUADRATIC;
  protected readonly minConfidence = 70;

  detect(context: ComplexityAnalysisContext): ComplexityPattern | null {
    const { node } = context;
    const patterns: string[] = [];
    const reasons: string[] = [];
    let confidence = 0;

    // Pattern 1: True nested loops (both dependent on input size)
    if (this.detectTrueNestedLoops(node)) {
      patterns.push("nested_loops");
      reasons.push("Two nested loops both dependent on input size");
      confidence += 50;
    }

    // Pattern 2: Matrix operations
    if (this.detectMatrixOperations(node)) {
      patterns.push("matrix_operations");
      reasons.push("Matrix operations on square matrices");
      confidence += 40;
    }

    // Pattern 3: All pairs operations
    if (this.detectAllPairsOperations(node)) {
      patterns.push("all_pairs");
      reasons.push("Operations on all pairs of elements");
      confidence += 35;
    }

    // Pattern 4: Simple sorting algorithms
    if (this.detectSimpleSorting(node)) {
      patterns.push("simple_sorting");
      reasons.push("Simple sorting algorithm (bubble, selection, insertion)");
      confidence += 30;
    }

    // Pattern 5: Quadratic keywords
    if (this.detectQuadraticKeywords(node)) {
      patterns.push("quadratic_keywords");
      reasons.push("Contains quadratic-complexity keywords");
      confidence += 20;
    }

    // Exclude false positives
    if (this.isFalsePositive(node)) {
      confidence = Math.max(0, confidence - 40);
      reasons.push("Excluded: Likely false positive");
    }

    return confidence >= this.minConfidence
      ? this.createPattern(confidence, patterns, reasons)
      : null;
  }

  private detectTrueNestedLoops(node: any): boolean {
    // Must have at least 2 loops and nesting
    if (node.forLoopCount + node.whileLoopCount < 2 || !node.isNested) {
      return false;
    }

    // Look for true nested loops (inner loop depends on outer loop)
    let hasTrueNesting = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "for_statement") {
        // Check if this loop contains another loop
        let innerLoopCount = 0;
        this.traverseAST(astNode, (child) => {
          if (
            child !== astNode &&
            (child.type === "for_statement" || child.type === "while_statement")
          ) {
            innerLoopCount++;

            // Check if inner loop uses variables from outer loop
            const outerLoopVar = this.extractLoopVariable(astNode);
            const innerLoopCondition = this.extractLoopCondition(child);

            if (
              outerLoopVar &&
              innerLoopCondition &&
              innerLoopCondition.includes(outerLoopVar)
            ) {
              hasTrueNesting = true;
            }
          }
        });

        // Even without variable dependency, nested loops are often O(n²)
        if (innerLoopCount > 0) {
          hasTrueNesting = true;
        }
      }
    });

    return hasTrueNesting;
  }

  private detectMatrixOperations(node: any): boolean {
    const matrixKeywords = [
      "matrix",
      "grid",
      "board",
      "table",
      "row",
      "col",
      "column",
      "multiply",
      "transpose",
      "determinant",
    ];

    const hasMatrixKeywords = node.keywords.some((kw: string) =>
      matrixKeywords.some((keyword) => kw.toLowerCase().includes(keyword))
    );

    // Look for double indexing patterns: arr[i][j]
    let hasDoubleIndexing = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "subscript") {
        // Check if this subscript contains another subscript
        this.traverseAST(astNode, (child) => {
          if (child !== astNode && child.type === "subscript") {
            hasDoubleIndexing = true;
          }
        });
      }
    });

    return hasMatrixKeywords || hasDoubleIndexing;
  }

  private detectAllPairsOperations(node: any): boolean {
    const pairKeywords = [
      "pairs",
      "compare",
      "distance",
      "similarity",
      "correlation",
      "combination",
      "cartesian",
      "product",
    ];

    const hasPairKeywords = node.keywords.some((kw: string) =>
      pairKeywords.some((keyword) => kw.toLowerCase().includes(keyword))
    );

    // Look for patterns that compare all elements with all others
    let hasAllPairsPattern = false;
    if (node.forLoopCount >= 2) {
      // Check if loops iterate over same or related ranges
      this.traverseAST(node.astNode, (astNode) => {
        if (astNode.type === "for_statement") {
          const loopText = astNode.text;
          if (loopText.includes("range") && loopText.includes("len")) {
            hasAllPairsPattern = true;
          }
        }
      });
    }

    return hasPairKeywords || hasAllPairsPattern;
  }

  private detectSimpleSorting(node: any): boolean {
    const simpleSortKeywords = [
      "bubble",
      "selection",
      "insertion",
      "sort",
      "swap",
    ];

    const hasSortKeywords = node.keywords.some((kw: string) =>
      simpleSortKeywords.some((keyword) => kw.toLowerCase().includes(keyword))
    );

    // Look for swap operations in nested loops
    let hasSwapInNestedLoop = false;
    if (node.isNested) {
      this.traverseAST(node.astNode, (astNode) => {
        if (astNode.type === "assignment") {
          const assignText = astNode.text;
          if (assignText.includes("=") && assignText.includes(",")) {
            // Likely a swap operation
            hasSwapInNestedLoop = true;
          }
        }
      });
    }

    return hasSortKeywords || hasSwapInNestedLoop;
  }

  private detectQuadraticKeywords(node: any): boolean {
    const quadraticIndicators = [
      "quadratic",
      "n^2",
      "n2",
      "nested",
      "double_loop",
      "pairwise",
    ];

    return node.keywords.some((kw: string) =>
      quadraticIndicators.some((indicator) =>
        kw.toLowerCase().includes(indicator)
      )
    );
  }

  private isFalsePositive(node: any): boolean {
    // Exclude constants in inner loop
    const constantLoopKeywords = ["keywords", "constant", "fixed"];

    const hasConstantInnerLoop = node.keywords.some((kw: string) =>
      constantLoopKeywords.includes(kw.toLowerCase())
    );

    // Exclude if it's actually a single loop with constant operations
    if (node.forLoopCount + node.whileLoopCount === 1) {
      return true;
    }

    // NEW: Enhanced detection of constant-sized inner loops
    if (this.hasConstantSizedInnerLoop(node)) {
      return true;
    }

    return hasConstantInnerLoop;
  }

  /**
   * Detect if nested loops have constant-sized inner collections
   */
  private hasConstantSizedInnerLoop(node: any): boolean {
    let hasConstantInnerLoop = false;

    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "for_statement") {
        // Check if this is an outer loop
        let hasInnerLoop = false;
        let innerLoopOverConstant = false;

        this.traverseAST(astNode, (child) => {
          if (child !== astNode && child.type === "for_statement") {
            hasInnerLoop = true;
            const innerLoopText = child.text;

            // Check for constant-sized collections in inner loop
            if (this.isLoopOverConstantCollection(innerLoopText)) {
              innerLoopOverConstant = true;
            }
          }
        });

        if (hasInnerLoop && innerLoopOverConstant) {
          hasConstantInnerLoop = true;
        }
      }
    });

    return hasConstantInnerLoop;
  }

  /**
   * Check if a loop iterates over a constant-sized collection
   */
  private isLoopOverConstantCollection(loopText: string): boolean {
    // Pattern 1: for item in small_list where small_list is defined as constant
    const constantCollectionPatterns = [
      /for\s+\w+\s+in\s+\[.*\]/, // for item in ['a', 'b', 'c']
      /for\s+\w+\s+in\s+keywords/, // for keyword in keywords
      /for\s+\w+\s+in\s+error_patterns/, // for pattern in error_patterns
      /for\s+\w+\s+in\s+patterns/, // for pattern in patterns
      /for\s+\w+\s+in\s+\w*_?patterns?\w*/, // various pattern variables
    ];

    // Check if loop matches constant collection patterns
    if (constantCollectionPatterns.some((pattern) => pattern.test(loopText))) {
      return true;
    }

    // Pattern 2: for item in range(small_constant) where constant < 20
    const rangeMatch = loopText.match(/for\s+\w+\s+in\s+range\((\d+)\)/);
    if (rangeMatch) {
      const rangeSize = parseInt(rangeMatch[1]);
      if (rangeSize <= 20) {
        // Consider small constants
        return true;
      }
    }

    // Pattern 3: Look for explicit constant collections defined earlier
    // This would require more sophisticated analysis of variable definitions
    return false;
  }

  private extractLoopVariable(loopNode: any): string | null {
    // Extract loop variable from for statement
    const loopText = loopNode.text;
    const match = loopText.match(/for\s+(\w+)\s+in/);
    return match ? match[1] : null;
  }

  private extractLoopCondition(loopNode: any): string {
    // Extract loop condition/range
    return loopNode.text;
  }
}
