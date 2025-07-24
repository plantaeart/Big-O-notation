import { TimeComplexityPatternDetector } from "./TimeComplexityPatternDetector";
import {
  ComplexityPattern,
  ComplexityAnalysisContext,
} from "../models/ComplexityNode";
import { SyntaxNode } from "tree-sitter";

export class CubicTimeComplexityDetector extends TimeComplexityPatternDetector {
  protected readonly complexityNotation = "O(n³)";
  protected readonly minConfidence = 70;

  detect(context: ComplexityAnalysisContext): ComplexityPattern | null {
    const { node } = context;
    const patterns: string[] = [];
    const reasons: string[] = [];
    let confidence = 0;

    // Pattern 1: Classic matrix multiplication (95% confidence)
    if (this.detectClassicMatrixMultiplication(node.astNode)) {
      patterns.push("classic_matrix_multiplication");
      reasons.push("Classic matrix multiplication algorithm");
      confidence += 95;
    }

    // Pattern 2: Triple nested loops with input dependency (90% confidence)
    if (this.detectTripleNestedLoops(node.astNode)) {
      patterns.push("triple_nested_loops");
      reasons.push("Three nested loops all dependent on input size");
      confidence += 90;
    }

    // Pattern 3: 3D matrix/tensor operations (85% confidence)
    if (this.detect3DMatrixOperations(node.astNode)) {
      patterns.push("3d_matrix_operations");
      reasons.push("3D matrix or tensor operations");
      confidence += 85;
    }

    // Pattern 4: All triplets operations (80% confidence)
    if (this.detectAllTripletsOperations(node.astNode)) {
      patterns.push("all_triplets");
      reasons.push("Operations on all triplets of elements");
      confidence += 80;
    }

    // Pattern 5: Cubic algorithm keywords (75% confidence)
    if (this.detectCubicKeywords(node.astNode)) {
      patterns.push("cubic_keywords");
      reasons.push("Contains cubic-complexity keywords");
      confidence += 75;
    }

    return confidence >= this.minConfidence
      ? this.createPattern(confidence, patterns, reasons)
      : null;
  }

  /**
   * Detect classic matrix multiplication: A[i][j] += A[i][k] * B[k][j]
   */
  private detectClassicMatrixMultiplication(node: SyntaxNode): boolean {
    let tripleNestedLoops = 0;
    let hasMatrixAccess = false;
    let hasMatrixMultiplication = false;

    this.traverseAST(node, (astNode) => {
      // Count nested for loops
      if (astNode.type === "for_statement") {
        const nestedCount = this.countNestedLoops(astNode);
        if (nestedCount >= 3) {
          tripleNestedLoops++;

          // Check for matrix access and multiplication in the inner loop
          this.traverseAST(astNode, (innerNode) => {
            if (innerNode.type === "subscript") {
              const text = innerNode.text;
              if (text.includes("[") && text.includes("]")) {
                hasMatrixAccess = true;
              }
            }

            if (
              innerNode.type === "assignment" ||
              innerNode.type === "augmented_assignment"
            ) {
              const text = innerNode.text;
              if (text.includes("*") && text.includes("[")) {
                hasMatrixMultiplication = true;
              }
            }
          });
        }
      }
    });

    return tripleNestedLoops > 0 && hasMatrixAccess && hasMatrixMultiplication;
  }

  /**
   * Detect triple nested loops with input dependency
   */
  private detectTripleNestedLoops(node: SyntaxNode): boolean {
    let hasTripleNested = false;

    this.traverseAST(node, (astNode) => {
      if (astNode.type === "for_statement") {
        const nestedCount = this.countNestedLoops(astNode);
        if (nestedCount >= 3) {
          // Check if loops are input-dependent
          const text = astNode.text;
          if (this.areLoopsInputDependent(text)) {
            hasTripleNested = true;
          }
        }
      }
    });

    return hasTripleNested;
  }

  /**
   * Detect 3D matrix operations
   */
  private detect3DMatrixOperations(node: SyntaxNode): boolean {
    let has3DAccess = false;

    this.traverseAST(node, (astNode) => {
      if (astNode.type === "subscript") {
        const dimensions = this.count3DSubscripts(astNode);
        if (dimensions >= 3) {
          has3DAccess = true;
        }
      }
    });

    return has3DAccess;
  }

  /**
   * Detect all triplets operations
   */
  private detectAllTripletsOperations(node: SyntaxNode): boolean {
    let hasTripleNested = false;

    this.traverseAST(node, (astNode) => {
      if (astNode.type === "for_statement") {
        const nestedCount = this.countNestedLoops(astNode);
        if (nestedCount >= 3) {
          hasTripleNested = true;
        }
      }
    });

    return hasTripleNested;
  }

  /**
   * Detect cubic algorithm keywords
   */
  private detectCubicKeywords(node: SyntaxNode): boolean {
    const cubicKeywords = [
      "matrix_multiply",
      "matrix_multiplication",
      "floyd_warshall",
      "all_pairs_shortest",
      "three_nested",
      "triple_loop",
      "cubic_complexity",
      "O(n³)",
      "O(n^3)",
      "n_cubed",
    ];

    return this.hasAnyKeyword(node, cubicKeywords);
  }

  /**
   * Helper methods
   */
  private countNestedLoops(node: SyntaxNode): number {
    let count = 0;
    let current = node;

    while (current) {
      let foundNested = false;

      this.traverseAST(current, (child) => {
        if (
          child.type === "for_statement" &&
          child !== current &&
          !foundNested
        ) {
          count++;
          current = child;
          foundNested = true;
        }
      });

      if (!foundNested) {
        break;
      }
    }

    return count;
  }

  private areLoopsInputDependent(text: string): boolean {
    // Check if loops use variables that suggest input dependency
    return (
      text.includes("range(n)") ||
      text.includes("range(len(") ||
      text.includes("range(size") ||
      text.includes("range(rows") ||
      text.includes("range(cols")
    );
  }

  private count3DSubscripts(node: SyntaxNode): number {
    let dimensions = 0;
    let current: SyntaxNode | null = node;

    // Count chained subscripts: arr[i][j][k]
    while (current && current.type === "subscript") {
      dimensions++;
      current = current.child(0); // Get the base expression
    }

    return dimensions;
  }

  private hasAnyKeyword(node: SyntaxNode, keywords: string[]): boolean {
    const nodeText = node.text.toLowerCase();
    return keywords.some((keyword) => nodeText.includes(keyword.toLowerCase()));
  }
}
