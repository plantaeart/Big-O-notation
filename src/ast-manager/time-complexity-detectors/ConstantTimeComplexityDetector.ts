import { TimeComplexityPatternDetector } from "./TimeComplexityPatternDetector";
import {
  ComplexityPattern,
  ComplexityAnalysisContext,
} from "../../models/ComplexityNode";
import { AST_NODE_TYPES, AST_NODE_GROUPS } from "../../constants/ASTNodeTypes";
import { ALGORITHM_KEYWORDS } from "../../constants/AlgorithmKeywords";
import { TimeComplexityNotation } from "../../constants/timeComplexityNotationsConst";
import { PythonKeywords } from "../../constants/pythonKeyWordsConst";
import {
  traverseAST,
  findNodesByType,
  isMathOperation,
} from "../utils/ASTUtils";

export class ConstantTimeComplexityDetector extends TimeComplexityPatternDetector {
  protected readonly complexityNotation = TimeComplexityNotation.CONSTANT;
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
      if (AST_NODE_GROUPS.COMPREHENSIONS.includes(astNode.type as any)) {
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
      PythonKeywords.SUM,
      PythonKeywords.MAX,
      PythonKeywords.MIN,
      PythonKeywords.COUNT,
      PythonKeywords.INDEX,
      PythonKeywords.REVERSE,
      PythonKeywords.SORT,
      PythonKeywords.SORTED,
      PythonKeywords.REVERSED,
    ];

    // Note: PythonKeywords.LEN is O(1) in Python, so we don't exclude it

    const functionText = node.astNode.text.toLowerCase();

    // Special case: allow single append/pop outside of loops as O(1)
    let hasLoop = node.forLoopCount > 0 || node.whileLoopCount > 0;
    let hasSingleStackOp = false;
    if (!hasLoop) {
      // Look for single append/pop not in a loop
      let foundStackOp = false;
      traverseAST(node.astNode, (astNode) => {
        if (
          astNode.type === "call" &&
          astNode.text &&
          (astNode.text.includes(".append(") || astNode.text.includes(".pop(") )
        ) {
          foundStackOp = true;
        }
      });
      if (foundStackOp) {
        hasSingleStackOp = true;
      }
    }

    // Exclude if function contains other linear operations on collections
    const hasLinearOps = linearOps.some(
      (op) =>
        functionText.includes(`${op}(`) || functionText.includes(`.${op}(`)
    );

    if (hasLinearOps && !hasSingleStackOp) {
      return false; // Not constant if it has linear operations (except single append/pop)
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
      if (AST_NODE_GROUPS.STATEMENTS.includes(astNode.type as any)) {
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
