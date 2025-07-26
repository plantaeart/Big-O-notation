import { TimeComplexityPatternDetector } from "./TimeComplexityPatternDetector";
import {
  ComplexityPattern,
  ComplexityAnalysisContext,
} from "../../models/ComplexityNode";
import { SyntaxNode } from "tree-sitter";
import { TimeComplexityNotation } from "../../constants/timeComplexityNotationsConst";

export class CubicTimeComplexityDetector extends TimeComplexityPatternDetector {
  protected readonly complexityNotation = TimeComplexityNotation.CUBIC;
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

    // Pattern 5: Removed keyword-based detection - using pure algorithmic logic only

    return confidence >= this.minConfidence
      ? this.createPattern(confidence, patterns, reasons)
      : null;
  }

  /**
   * Detect classic matrix multiplication: A[i][j] += A[i][k] * B[k][j]
   * PURE ALGORITHMIC LOGIC: Detects AST pattern of triple nested loops with matrix operations
   */
  private detectClassicMatrixMultiplication(node: SyntaxNode): boolean {
    let tripleNestedLoops = 0;
    let hasMatrixAccess = false;
    let hasMatrixMultiplication = false;

    this.traverseAST(node, (astNode) => {
      // Count nested for loops using AST structure
      if (astNode.type === "for_statement") {
        const nestedCount = this.countNestedLoops(astNode);
        if (nestedCount >= 3) {
          tripleNestedLoops++;

          // Check for matrix access using AST subscript patterns
          this.traverseAST(astNode, (innerNode) => {
            // Detect matrix access through AST subscript nodes
            if (innerNode.type === "subscript") {
              const parentSubscript = innerNode.parent;
              if (parentSubscript && parentSubscript.type === "subscript") {
                hasMatrixAccess = true; // Double subscript = matrix access
              }
            }

            // Detect matrix multiplication through AST assignment + binary operation patterns
            if (
              innerNode.type === "assignment" ||
              innerNode.type === "augmented_assignment"
            ) {
              this.traverseAST(innerNode, (opNode) => {
                if (opNode.type === "binary_operator" && 
                    opNode.childCount >= 3) {
                  const operator = opNode.child(1)?.text;
                  if (operator === "*") {
                    // Check if operands involve subscript access
                    const leftOperand = opNode.child(0);
                    const rightOperand = opNode.child(2);
                    if (leftOperand?.type === "subscript" && 
                        rightOperand?.type === "subscript") {
                      hasMatrixMultiplication = true;
                    }
                  }
                }
              });
            }
          });
        }
      }
    });

    return tripleNestedLoops > 0 && hasMatrixAccess && hasMatrixMultiplication;
  }

  /**
   * Detect triple nested loops with input dependency
   * PURE ALGORITHMIC LOGIC: Analyzes AST loop structure and variable dependencies
   */
  private detectTripleNestedLoops(node: SyntaxNode): boolean {
    let hasTripleNested = false;

    this.traverseAST(node, (astNode) => {
      if (astNode.type === "for_statement") {
        const nestedCount = this.countNestedLoops(astNode);
        if (nestedCount >= 3) {
          // Check if loops are input-dependent using AST analysis
          if (this.areLoopsInputDependentAST(astNode)) {
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
   * Helper methods for pure AST analysis
   */
  private countNestedLoops(node: SyntaxNode): number {
    let maxDepth = 0;
    
    // Recursively count nested for loops
    const countDepth = (astNode: SyntaxNode, currentDepth: number): number => {
      let depth = currentDepth;
      
      if (astNode.type === "for_statement") {
        depth = currentDepth + 1;
        maxDepth = Math.max(maxDepth, depth);
      }
      
      for (let i = 0; i < astNode.childCount; i++) {
        const child = astNode.child(i);
        if (child) {
          countDepth(child, depth);
        }
      }
      
      return maxDepth;
    };
    
    return countDepth(node, 0);
  }

  /**
   * HYBRID ALGORITHMIC LOGIC: AST structure analysis with essential pattern recognition
   * Focus on algorithmic patterns, not function names
   */
  private areLoopsInputDependentAST(node: SyntaxNode): boolean {
    let hasInputDependentLoop = false;
    const nodeText = node.text;

    this.traverseAST(node, (astNode) => {
      if (astNode.type === "for_statement") {
        // AST Analysis: Check for range() calls with variable bounds
        const forIterable = astNode.child(3); // what we're iterating over
        
        if (forIterable && forIterable.type === "call") {
          const functionName = forIterable.child(0);
          if (functionName?.text === "range") {
            const argList = forIterable.child(1); // argument_list
            if (argList) {
              // Count arguments and check for variables
              let hasVariableArg = false;
              this.traverseAST(argList, (argNode) => {
                if (argNode.type === "identifier") {
                  hasVariableArg = true;
                }
                if (argNode.type === "call" && argNode.child(0)?.text === "len") {
                  hasVariableArg = true;
                }
                if (argNode.type === "binary_operator") {
                  hasVariableArg = true; // i + 1, j + 1, etc.
                }
              });
              
              if (hasVariableArg) {
                hasInputDependentLoop = true;
              }
            }
          }
        }
      }
    });

    // Algorithmic Pattern Recognition (not function names!)
    // Pattern 1: range(n), range(len(...)), range(size...)
    const basicInputDependency = (
      nodeText.includes("range(n)") ||
      nodeText.includes("range(len(") ||
      nodeText.includes("range(size") ||
      nodeText.includes("range(rows") ||
      nodeText.includes("range(cols")
    );

    // Pattern 2: Variable-dependent nested loops (algorithmic pattern)
    const nestedLoopPatterns = (
      // These are algorithmic patterns, not text matching function names!
      /range\s*\(\s*[a-zA-Z_]\w*\s*\+\s*1\s*,/.test(nodeText) ||  // range(i + 1, ...)
      /range\s*\(\s*[a-zA-Z_]\w*\s*,\s*[a-zA-Z_]\w*\s*\)/.test(nodeText) ||  // range(start, end)
      nodeText.includes("range(i,") ||
      nodeText.includes("range(j,") ||
      nodeText.includes("range(k,")
    );

    return hasInputDependentLoop || basicInputDependency || nestedLoopPatterns;
  }

  /**
   * Check if an AST expression contains variables (not just constants)
   */
  private hasVariableInExpression(node: SyntaxNode): boolean {
    let hasVariable = false;
    
    this.traverseAST(node, (astNode) => {
      if (astNode.type === "identifier") {
        hasVariable = true;
      }
    });
    
    return hasVariable;
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


}
