import { TimeComplexityPatternDetector } from "./TimeComplexityPatternDetector";
import {
  ComplexityPattern,
  ComplexityAnalysisContext,
} from "../../models/ComplexityNode";
import { AST_NODE_TYPES } from "../../constants/ASTNodeTypes";
import { ALGORITHM_KEYWORDS } from "../../constants/AlgorithmKeywords";
import {
  traverseAST,
  findNodesByType,
  isMathOperation,
} from "../utils/ASTUtils";

export class ConstantTimeComplexityDetector extends TimeComplexityPatternDetector {
  protected readonly complexityNotation = "O(1)";
  protected readonly minConfidence = 50;

  detect(context: ComplexityAnalysisContext): ComplexityPattern | null {
    const { node } = context;
    const patterns: string[] = [];
    const reasons: string[] = [];
    let confidence = 0;

    // Pattern 1: No loops or recursion
    if (this.detectNoLoopsOrRecursion(node)) {
      patterns.push("no_loops_recursion");
      reasons.push("No loops or recursive calls");
      confidence += 40;
    }

    // Pattern 2: Direct access operations
    if (this.detectDirectAccess(node)) {
      patterns.push("direct_access");
      reasons.push("Direct access operations only");
      confidence += 35;
    }

    // Pattern 3: Mathematical operations
    if (this.detectMathematicalOps(node)) {
      patterns.push("mathematical_ops");
      reasons.push("Simple mathematical operations");
      confidence += 30;
    }

    // Pattern 4: Constant keywords
    if (this.detectConstantKeywords(node)) {
      patterns.push("constant_keywords");
      reasons.push("Contains constant complexity keywords");
      confidence += 25;
    }

    // Pattern 5: Fixed number of operations
    if (this.detectFixedOperations(node)) {
      patterns.push("fixed_operations");
      reasons.push("Fixed number of operations regardless of input size");
      confidence += 20;
    }

    return confidence >= this.minConfidence
      ? this.createPattern(confidence, patterns, reasons)
      : null;
  }

  private detectNoLoopsOrRecursion(node: any): boolean {
    // No loops and no recursive calls
    const noLoops = node.forLoopCount === 0 && node.whileLoopCount === 0;
    const noRecursion = node.recursiveCallCount === 0;

    // Also check for list comprehensions, which are O(n) loops
    let hasListComprehensions = false;
    traverseAST(node.astNode, (astNode) => {
      if (
        astNode.type === AST_NODE_TYPES.LIST_COMPREHENSION ||
        astNode.type === AST_NODE_TYPES.SET_COMPREHENSION ||
        astNode.type === AST_NODE_TYPES.DICTIONARY_COMPREHENSION
      ) {
        hasListComprehensions = true;
      }
    });

    return noLoops && noRecursion && !hasListComprehensions;
  }

  private detectDirectAccess(node: any): boolean {
    const hasDirectAccessKeywords = node.keywords.some((kw: string) =>
      ALGORITHM_KEYWORDS.DIRECT_ACCESS.some((keyword) =>
        kw.toLowerCase().includes(keyword)
      )
    );

    // Look for direct indexing operations
    let hasDirectIndexing = false;
    traverseAST(node.astNode, (astNode) => {
      if (astNode.type === AST_NODE_TYPES.SUBSCRIPT) {
        // Check if it's simple indexing (not in a loop)
        hasDirectIndexing = true;
      }
    });

    return hasDirectAccessKeywords || hasDirectIndexing;
  }

  private detectMathematicalOps(node: any): boolean {
    // Linear operations that should NOT be considered constant
    const linearOps = [
      "sum",
      "max",
      "min",
      "count",
      "index",
      "reversed",
      "reverse",
      "sort",
      "sorted",
    ];

    // Note: "len" is O(1) in Python, so we don't exclude it

    const functionText = node.astNode.text.toLowerCase();

    // Exclude if function contains linear operations on collections
    const hasLinearOps = linearOps.some(
      (op) =>
        functionText.includes(`${op}(`) || functionText.includes(`.${op}(`)
    );

    if (hasLinearOps) {
      return false; // Not constant if it has linear operations
    }

    const hasMathKeywords = node.keywords.some((kw: string) =>
      ALGORITHM_KEYWORDS.MATH_FUNCTIONS.some((keyword) =>
        kw.toLowerCase().includes(keyword)
      )
    );

    // Look for mathematical operators
    let hasMathOperations = false;
    traverseAST(node.astNode, (astNode) => {
      if (astNode.type === AST_NODE_TYPES.BINARY_OPERATOR) {
        const operator = astNode.text;
        if (
          ALGORITHM_KEYWORDS.MATH_OPERATORS.some((op) => operator.includes(op))
        ) {
          hasMathOperations = true;
        }
      }
    });

    return hasMathKeywords || hasMathOperations;
  }

  private detectConstantKeywords(node: any): boolean {
    return node.keywords.some((kw: string) =>
      ALGORITHM_KEYWORDS.CONSTANT_INDICATORS.some((indicator) =>
        kw.toLowerCase().includes(indicator)
      )
    );
  }

  private detectFixedOperations(node: any): boolean {
    // Check if function has very few statements
    let statementCount = 0;
    traverseAST(node.astNode, (astNode) => {
      if (
        astNode.type === AST_NODE_TYPES.EXPRESSION_STATEMENT ||
        astNode.type === AST_NODE_TYPES.ASSIGNMENT ||
        astNode.type === AST_NODE_TYPES.RETURN_STATEMENT
      ) {
        statementCount++;
      }
    });

    // Few statements usually indicate constant time
    const hasFewStatements = statementCount <= 5;

    // Look for simple variable assignments
    let hasSimpleAssignments = false;
    traverseAST(node.astNode, (astNode) => {
      if (astNode.type === AST_NODE_TYPES.ASSIGNMENT) {
        const assignText = astNode.text;
        // Simple assignments without complex operations
        if (!assignText.includes("(") || assignText.split("(").length <= 2) {
          hasSimpleAssignments = true;
        }
      }
    });

    return hasFewStatements || hasSimpleAssignments;
  }
}
