import { ComplexityPatternDetector } from "./ComplexityPatternDetector";
import {
  ComplexityPattern,
  ComplexityAnalysisContext,
} from "../../models/ComplexityNode";

export class ConstantComplexityDetector extends ComplexityPatternDetector {
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

    return noLoops && noRecursion;
  }

  private detectDirectAccess(node: any): boolean {
    const directAccessKeywords = [
      "get",
      "set",
      "access",
      "index",
      "key",
      "hash",
      "dict",
      "map",
    ];

    const hasDirectAccessKeywords = node.keywords.some((kw: string) =>
      directAccessKeywords.some((keyword) => kw.toLowerCase().includes(keyword))
    );

    // Look for direct indexing operations
    let hasDirectIndexing = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "subscript") {
        // Check if it's simple indexing (not in a loop)
        hasDirectIndexing = true;
      }
    });

    return hasDirectAccessKeywords || hasDirectIndexing;
  }

  private detectMathematicalOps(node: any): boolean {
    const mathKeywords = [
      "add",
      "subtract",
      "multiply",
      "divide",
      "mod",
      "abs",
      "max",
      "min",
      "round",
      "floor",
      "ceil",
      "sqrt",
      "pow",
    ];

    const hasMathKeywords = node.keywords.some((kw: string) =>
      mathKeywords.some((keyword) => kw.toLowerCase().includes(keyword))
    );

    // Look for mathematical operators
    let hasMathOperations = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "binary_operator") {
        const operator = astNode.text;
        if (
          ["+", "-", "*", "/", "%", "//", "**"].some((op) =>
            operator.includes(op)
          )
        ) {
          hasMathOperations = true;
        }
      }
    });

    return hasMathKeywords || hasMathOperations;
  }

  private detectConstantKeywords(node: any): boolean {
    const constantIndicators = [
      "constant",
      "o1",
      "direct",
      "immediate",
      "instant",
      "cache",
      "lookup",
      "hash",
      "map",
      "dict",
    ];

    return node.keywords.some((kw: string) =>
      constantIndicators.some((indicator) =>
        kw.toLowerCase().includes(indicator)
      )
    );
  }

  private detectFixedOperations(node: any): boolean {
    // Check if function has very few statements
    let statementCount = 0;
    this.traverseAST(node.astNode, (astNode) => {
      if (
        astNode.type === "expression_statement" ||
        astNode.type === "assignment" ||
        astNode.type === "return_statement"
      ) {
        statementCount++;
      }
    });

    // Few statements usually indicate constant time
    const hasFewStatements = statementCount <= 5;

    // Look for simple variable assignments
    let hasSimpleAssignments = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "assignment") {
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
