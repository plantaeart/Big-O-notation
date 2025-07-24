import { TimeComplexityPatternDetector } from "./TimeComplexityPatternDetector";
import {
  ComplexityPattern,
  ComplexityAnalysisContext,
} from "../models/ComplexityNode";

export class FactorialTimeComplexityDetector extends TimeComplexityPatternDetector {
  protected readonly complexityNotation = "O(n!)";
  protected readonly minConfidence = 70;

  detect(context: ComplexityAnalysisContext): ComplexityPattern | null {
    const { node } = context;
    const patterns: string[] = [];
    const reasons: string[] = [];
    let confidence = 0;

    // Pattern 1: All permutations generation
    if (this.detectPermutationGeneration(node)) {
      patterns.push("permutation_generation");
      reasons.push("Generates all permutations of input");
      confidence += 40;
    }

    // Pattern 2: N recursive calls each making (N-1) calls
    if (this.detectFactorialRecursion(node)) {
      patterns.push("factorial_recursion");
      reasons.push("N recursive calls with (N-1) branching factor");
      confidence += 35;
    }

    // Pattern 3: Traveling salesman brute force
    if (this.detectTSPPattern(node)) {
      patterns.push("tsp_brute_force");
      reasons.push("Tries all possible routes/arrangements");
      confidence += 30;
    }

    // Pattern 4: Keywords indicating factorial complexity
    if (this.detectFactorialKeywords(node)) {
      patterns.push("factorial_keywords");
      reasons.push("Contains factorial-complexity keywords");
      confidence += 20;
    }

    return confidence >= this.minConfidence
      ? this.createPattern(confidence, patterns, reasons)
      : null;
  }

  private detectPermutationGeneration(node: any): boolean {
    // Look for permutation generation patterns in AST
    const hasPermutationKeywords = node.keywords.some((kw: string) =>
      ["permutations", "factorial", "arrangements"].includes(kw)
    );

    // Check for nested recursion with N branches
    let hasNBranching = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "for_statement") {
        // Look for pattern: for i in range(len(arr))
        const forBody = astNode.toString();
        if (forBody.includes("range") && forBody.includes("len")) {
          hasNBranching = true;
        }
      }
    });

    return hasPermutationKeywords || hasNBranching;
  }

  private detectFactorialRecursion(node: any): boolean {
    // Must have recursive calls
    if (node.recursiveCallCount === 0) {
      return false;
    }

    // Look for multiple recursive calls in a loop pattern
    let hasLoopWithRecursion = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "for_statement") {
        // Check if this for loop contains recursive calls
        let recursiveCallsInLoop = 0;
        this.traverseAST(astNode, (child) => {
          if (child.type === "call" && child.childCount > 0) {
            const functionName = child.child(0);
            if (functionName && functionName.text === node.funcName) {
              recursiveCallsInLoop++;
            }
          }
        });

        if (recursiveCallsInLoop > 0) {
          hasLoopWithRecursion = true;
        }
      }
    });

    return hasLoopWithRecursion;
  }

  private detectTSPPattern(node: any): boolean {
    // Look for traveling salesman patterns
    const tspKeywords = ["route", "path", "visit", "distance", "tour"];
    const hasKeywords = node.keywords.some((kw: string) =>
      tspKeywords.includes(kw.toLowerCase())
    );

    // Look for all-pairs or all-arrangements patterns
    const hasNestedLoopsWithRecursion =
      node.isNested && node.recursiveCallCount > 0;

    return hasKeywords || hasNestedLoopsWithRecursion;
  }

  private detectFactorialKeywords(node: any): boolean {
    const factorialIndicators = [
      "permutation",
      "factorial",
      "arrangement",
      "tsp",
      "traveling",
      "salesman",
      "n_queens",
      "queens",
      "all_routes",
    ];

    return node.keywords.some((kw: string) =>
      factorialIndicators.some((indicator) =>
        kw.toLowerCase().includes(indicator)
      )
    );
  }
}
