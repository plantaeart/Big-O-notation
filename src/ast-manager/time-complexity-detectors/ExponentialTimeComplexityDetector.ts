import { TimeComplexityPatternDetector } from "./TimeComplexityPatternDetector";
import {
  ComplexityPattern,
  ComplexityAnalysisContext,
} from "../../models/ComplexityNode";
import { TimeComplexityNotation } from "../../constants/timeComplexityNotationsConst";

export class ExponentialTimeComplexityDetector extends TimeComplexityPatternDetector {
  protected readonly complexityNotation = TimeComplexityNotation.EXPONENTIAL;
  protected readonly minConfidence = 70;

  detect(context: ComplexityAnalysisContext): ComplexityPattern | null {
    const { node } = context;
    const patterns: string[] = [];
    const reasons: string[] = [];
    let confidence = 0;

    // HIGH CONFIDENCE PATTERNS (90-95%) - Regex-style specific detection

    // Pattern 1: Classic Fibonacci recursion (95% confidence)
    if (this.detectClassicFibonacci(node)) {
      patterns.push("classic_fibonacci");
      reasons.push(
        "Classic fibonacci with two recursive calls: fibonacci(n-1) + fibonacci(n-2)"
      );
      confidence += 95;
    }

    // Pattern 2: Tower of Hanoi pattern (90% confidence)
    if (this.detectTowerOfHanoi(node)) {
      patterns.push("tower_of_hanoi");
      reasons.push(
        "Tower of Hanoi pattern with exponential recursive structure"
      );
      confidence += 90;
    }

    // Pattern 3: Binary tree all paths (85% confidence)
    if (this.detectBinaryTreeAllPaths(node)) {
      patterns.push("binary_tree_paths");
      reasons.push("Generates all paths in binary tree structure");
      confidence += 85;
    }

    // Pattern 4: Boolean formula evaluation (90% confidence)
    if (this.detectBooleanFormulaEvaluation(node)) {
      patterns.push("boolean_formula_evaluation");
      reasons.push("Boolean formula evaluation with recursive branching");
      confidence += 90;
    }

    // Pattern 5: Exhaustive search (knapsack, subset sum) (85% confidence)
    if (this.detectExhaustiveSearch(node)) {
      patterns.push("exhaustive_search");
      reasons.push("Exhaustive search with include/exclude decisions");
      confidence += 85;
    }

    // MEDIUM CONFIDENCE PATTERNS (70-80%)

    // Pattern 6: Classic binary recursion (improved)
    if (this.detectBinaryRecursion(node)) {
      patterns.push("binary_recursion");
      reasons.push("Two recursive calls per function call");
      confidence += 75; // Increased from 45
    }

    // Pattern 7: Subset/powerset generation (improved)
    if (this.detectSubsetGeneration(node)) {
      patterns.push("subset_generation");
      reasons.push("Generates all subsets or combinations");
      confidence += 70; // Increased from 40
    }

    // Pattern 6: Single recursion with binary choice
    if (this.detectSingleRecursionBinaryChoice(node)) {
      patterns.push("single_recursion_binary_choice");
      reasons.push("Single recursion with binary decision pattern");
      confidence += 35;
    }

    // Pattern 7: Backtracking without memoization
    if (this.detectBacktracking(node)) {
      patterns.push("backtracking");
      reasons.push("Backtracking algorithm without memoization");
      confidence += 30;
    }

    // Pattern 8: Exponential keywords
    if (this.detectExponentialKeywords(node)) {
      patterns.push("exponential_keywords");
      reasons.push("Contains exponential-complexity keywords");
      confidence += 20;
    }

    // Exclude if it's actually divide-and-conquer (sorting)
    if (this.isSortingAlgorithm(node)) {
      confidence = Math.max(0, confidence - 50);
      reasons.push("Excluded: Appears to be sorting algorithm");
    }

    return confidence >= this.minConfidence
      ? this.createPattern(confidence, patterns, reasons)
      : null;
  }

  /**
   * Detects boolean formula evaluation with recursive branching
   * Pattern: recursive calls with boolean operations (and, or, not)
   */
  private detectBooleanFormulaEvaluation(node: any): boolean {
    const functionText = node.astNode.text.toLowerCase();

    // Look for boolean-related keywords
    const hasBooleanKeywords =
      functionText.includes("boolean") ||
      functionText.includes("formula") ||
      functionText.includes("evaluate") ||
      functionText.includes("assignment") ||
      (functionText.includes("and") && functionText.includes("or"));

    // Must have recursive calls
    if (node.recursiveCallCount === 0) {
      return false;
    }

    // Look for binary operations with recursive calls
    let hasBinaryOperationWithRecursion = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "binary_operator") {
        const operatorText = astNode.text.toLowerCase();
        if (
          operatorText.includes("and") ||
          operatorText.includes("or") ||
          operatorText.includes("&") ||
          operatorText.includes("|")
        ) {
          // Check if this operation involves recursive calls
          let recursiveCallsInOperation = 0;
          this.traverseAST(astNode, (child) => {
            if (child.type === "call" && child.childCount > 0) {
              const functionName = child.child(0);
              if (functionName && functionName.text === node.funcName) {
                recursiveCallsInOperation++;
              }
            }
          });
          if (recursiveCallsInOperation >= 2) {
            hasBinaryOperationWithRecursion = true;
          }
        }
      }
    });

    return hasBooleanKeywords || hasBinaryOperationWithRecursion;
  }

  /**
   * Detects exhaustive search patterns like knapsack, subset sum
   * Pattern: recursive calls with include/exclude decisions
   */
  private detectExhaustiveSearch(node: any): boolean {
    const functionText = node.astNode.text.toLowerCase();

    // Look for exhaustive search keywords
    const hasSearchKeywords =
      functionText.includes("knapsack") ||
      functionText.includes("brute_force") ||
      functionText.includes("exhaustive") ||
      functionText.includes("subset_sum") ||
      functionText.includes("combination") ||
      (functionText.includes("include") && functionText.includes("exclude"));

    // Check if this is a function that contains nested helper functions
    let hasNestedHelperFunction = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "function_definition") {
        const funcText = astNode.text.toLowerCase();
        if (
          funcText.includes("helper") ||
          (funcText.includes("def ") && funcText !== node.astNode.text)
        ) {
          hasNestedHelperFunction = true;
        }
      }
    });

    // If we have a knapsack function with nested helper, it's likely exponential
    if (hasSearchKeywords && hasNestedHelperFunction) {
      return true;
    }

    // Must have recursive calls for regular detection
    if (node.recursiveCallCount === 0) {
      return false;
    }

    // Look for include/exclude pattern in recursive calls
    let hasIncludeExcludePattern = false;
    this.traverseAST(node.astNode, (astNode) => {
      const nodeText = astNode.text.toLowerCase();

      // Look for comments or variable names with include/exclude
      if (nodeText.includes("include") && nodeText.includes("exclude")) {
        hasIncludeExcludePattern = true;
      }

      // Look for helper function calls with different parameters
      if (astNode.type === "call" && astNode.childCount > 0) {
        const callText = astNode.text.toLowerCase();
        if (callText.includes("helper") && node.recursiveCallCount > 0) {
          hasIncludeExcludePattern = true;
        }
      }

      // Look for two recursive calls pattern (one with item, one without)
      if (astNode.type === "call" && astNode.childCount > 0) {
        const functionName = astNode.child(0);
        if (functionName && functionName.text === node.funcName) {
          // Check if there are multiple similar recursive calls
          let similarCalls = 0;
          this.traverseAST(node.astNode, (otherCall) => {
            if (otherCall.type === "call" && otherCall.childCount > 0) {
              const otherFunctionName = otherCall.child(0);
              if (
                otherFunctionName &&
                otherFunctionName.text === node.funcName
              ) {
                similarCalls++;
              }
            }
          });
          if (similarCalls >= 2) {
            hasIncludeExcludePattern = true;
          }
        }
      }
    });

    // Look for max/min operations (common in optimization problems)
    let hasOptimizationOperation = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "call" && astNode.childCount > 0) {
        const callName = astNode.child(0);
        if (callName && (callName.text === "max" || callName.text === "min")) {
          hasOptimizationOperation = true;
        }
      }
    });

    // Look for typical exhaustive search structure: index progression
    let hasIndexProgression = false;
    this.traverseAST(node.astNode, (astNode) => {
      const nodeText = astNode.text.toLowerCase();
      if (
        nodeText.includes("index") &&
        nodeText.includes("+") &&
        nodeText.includes("1")
      ) {
        hasIndexProgression = true;
      }
    });

    return (
      hasSearchKeywords ||
      (hasIncludeExcludePattern && hasOptimizationOperation) ||
      (hasIndexProgression &&
        hasOptimizationOperation &&
        node.recursiveCallCount > 0)
    );
  }

  private detectBinaryRecursion(node: any): boolean {
    // Must have at least 2 recursive calls
    if (node.recursiveCallCount < 2) {
      return false;
    }

    const functionText = node.astNode.text.toLowerCase();

    // Exclude divide-and-conquer algorithms that should be O(n log n)
    if (
      functionText.includes("sort") ||
      functionText.includes("merge") ||
      functionText.includes("partition") ||
      functionText.includes("pivot") ||
      functionText.includes("divide") ||
      functionText.includes("conquer")
    ) {
      return false;
    }

    // Look for classic fibonacci pattern: func(n-1) + func(n-2)
    let hasFibonacciPattern = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "binary_operator" && astNode.text.includes("+")) {
        // Check if both operands are recursive calls
        let recursiveCallCount = 0;
        this.traverseAST(astNode, (child) => {
          if (child.type === "call" && child.childCount > 0) {
            const functionName = child.child(0);
            if (functionName && functionName.text === node.funcName) {
              recursiveCallCount++;
            }
          }
        });

        if (recursiveCallCount >= 2) {
          hasFibonacciPattern = true;
        }
      }
    });

    return hasFibonacciPattern;
  }

  private detectSingleRecursionBinaryChoice(node: any): boolean {
    // Must have recursive calls
    if (node.recursiveCallCount === 0) {
      return false;
    }

    // Look for binary choice patterns in comments or structure
    const hasBinaryChoiceKeywords = node.keywords.some((kw: string) =>
      ["include", "exclude", "choice", "binary", "two"].includes(
        kw.toLowerCase()
      )
    );

    // Look for if-else patterns with recursive calls
    let hasIfElseRecursion = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "if_statement") {
        let hasRecursiveInIf = false;
        let hasRecursiveInElse = false;

        // Check if condition and else clause
        for (let i = 0; i < astNode.childCount; i++) {
          const child = astNode.child(i);
          if (child) {
            if (
              child.type === "block" ||
              child.type === "expression_statement"
            ) {
              this.traverseAST(child, (grandchild) => {
                if (grandchild.type === "call" && grandchild.childCount > 0) {
                  const functionName = grandchild.child(0);
                  if (functionName && functionName.text === node.funcName) {
                    if (i <= astNode.childCount / 2) {
                      hasRecursiveInIf = true;
                    } else {
                      hasRecursiveInElse = true;
                    }
                  }
                }
              });
            }
          }
        }

        if (hasRecursiveInIf && hasRecursiveInElse) {
          hasIfElseRecursion = true;
        }
      }
    });

    return hasBinaryChoiceKeywords || hasIfElseRecursion;
  }

  private detectSubsetGeneration(node: any): boolean {
    // AST-based algorithmic detection for O(2^n) subset generation patterns
    
    // Pattern 1: Detect range(2**n) or range(2^n) - iterative power set generation
    const hasExponentialRange = this.detectExponentialRangePattern(node.astNode);
    if (hasExponentialRange) {
      return true;
    }
    
    // Pattern 2: Detect recursive subset generation (classic divide and conquer)
    const hasRecursiveSubsetPattern = this.detectRecursiveSubsetPattern(node);
    if (hasRecursiveSubsetPattern) {
      return true;
    }

    // Pattern 3: Detect bit manipulation for subset generation
    const hasBitManipulationPattern = this.detectBitManipulationPattern(node.astNode);
    if (hasBitManipulationPattern) {
      return true;
    }

    return false;
  }

  private detectExponentialRangePattern(astNode: any): boolean {
    // Look for range(2**n), range(2^n), or similar exponential iteration patterns
    let hasExponentialRange = false;
    
    this.traverseAST(astNode, (node) => {
      if (node.type === "call" && node.children) {
        // Check if this is a range() call
        const functionName = node.children.find(child => child.type === "identifier");
        if (functionName && functionName.text === "range") {
          
          // Look for arguments containing exponential expressions
          const argumentList = node.children.find(child => child.type === "argument_list");
          if (argumentList) {
            this.traverseAST(argumentList, (argNode) => {
              // Check for 2**n or 2^n patterns in arguments
              if (argNode.type === "binary_operator" && argNode.children && argNode.children.length >= 3) {
                const left = argNode.children[0];
                const operator = argNode.children[1];
                const right = argNode.children[2];
                
                // Detect 2**n pattern (Python exponentiation)
                if (left && left.text === "2" && 
                    operator && operator.text === "**" &&
                    right && this.isVariableOrParameter(right)) {
                  hasExponentialRange = true;
                }
                
                // Detect 2^n pattern (bitwise XOR used as exponentiation in some contexts)
                if (left && left.text === "2" && 
                    operator && operator.text === "^" &&
                    right && this.isVariableOrParameter(right)) {
                  hasExponentialRange = true;
                }
              }
              
              // Check for pow(2, n) pattern
              if (argNode.type === "call" && argNode.children) {
                const powFunction = argNode.children.find(child => child.type === "identifier");
                if (powFunction && powFunction.text === "pow") {
                  const powArgs = argNode.children.find(child => child.type === "argument_list");
                  if (powArgs && powArgs.children && powArgs.children.length >= 3) {
                    const firstArg = powArgs.children[0];
                    const secondArg = powArgs.children[2]; // Skip comma
                    if (firstArg && firstArg.text === "2" && 
                        secondArg && this.isVariableOrParameter(secondArg)) {
                      hasExponentialRange = true;
                    }
                  }
                }
              }
            });
          }
        }
      }
    });
    
    return hasExponentialRange;
  }

  private detectRecursiveSubsetPattern(node: any): boolean {
    // Detect classic recursive subset generation pattern
    if (node.recursiveCallCount < 1) {
      return false;
    }

    let hasSubsetBuildingPattern = false;
    let hasSubsetBaseCase = false;
    
    this.traverseAST(node.astNode, (astNode) => {
      // Look for list operations typical in subset generation
      if (astNode.type === "assignment" || astNode.type === "expression_statement") {
        const nodeText = astNode.text.toLowerCase();
        if (nodeText.includes("extend") || 
            nodeText.includes("append") ||
            (nodeText.includes("|") && nodeText.includes("{"))) { // Set union operations
          hasSubsetBuildingPattern = true;
        }
      }

      // Look for base case patterns
      if (astNode.type === "if_statement") {
        const conditionText = astNode.text.toLowerCase();
        if (conditionText.includes("not") ||
            conditionText.includes("empty") ||
            (conditionText.includes("len") && conditionText.includes("0"))) {
          hasSubsetBaseCase = true;
        }
      }
    });

    return hasSubsetBuildingPattern && hasSubsetBaseCase;
  }

  private detectBitManipulationPattern(astNode: any): boolean {
    // Detect bit manipulation for subset generation (e.g., using bit positions)
    let hasBitOperations = false;
    let hasIterationOverBits = false;
    
    this.traverseAST(astNode, (node) => {
      // Look for bitwise operations
      if (node.type === "binary_operator" && node.children && node.children.length >= 3) {
        const operator = node.children[1];
        if (operator && (operator.text === "&" || operator.text === "|" || 
                        operator.text === "<<" || operator.text === ">>")) {
          hasBitOperations = true;
        }
      }
      
      // Look for iteration patterns with bit checking
      if (node.type === "for_statement") {
        const nodeText = node.text.toLowerCase();
        if (nodeText.includes("range") && (nodeText.includes("&") || nodeText.includes("bit"))) {
          hasIterationOverBits = true;
        }
      }
    });
    
    return hasBitOperations && hasIterationOverBits;
  }

  private isVariableOrParameter(node: any): boolean {
    // Check if node represents a variable (identifier) that could be n
    return node && (node.type === "identifier" || 
                   node.type === "subscript" ||
                   node.type === "attribute");
  }

  private detectBacktracking(node: any): boolean {
    const backtrackingKeywords = [
      "backtrack",
      "maze",
      "solve",
      "path",
      "visited",
      "mark",
      "unmark",
      "restore",
      "undo",
    ];

    const hasBacktrackKeywords = node.keywords.some((kw: string) =>
      backtrackingKeywords.some((keyword) => kw.toLowerCase().includes(keyword))
    );

    // Look for patterns that mark and unmark (backtracking)
    let hasMarkUnmarkPattern = false;
    this.traverseAST(node.astNode, (astNode) => {
      const nodeText = astNode.text.toLowerCase();
      if (
        nodeText.includes("mark") ||
        nodeText.includes("visited") ||
        nodeText.includes("pop") ||
        nodeText.includes("restore")
      ) {
        hasMarkUnmarkPattern = true;
      }
    });

    return hasBacktrackKeywords || hasMarkUnmarkPattern;
  }

  private detectExponentialKeywords(node: any): boolean {
    const exponentialIndicators = [
      "fibonacci",
      "fib",
      "tower",
      "hanoi",
      "exponential",
      "2^n",
      "binary_choice",
      "exhaustive",
      "brute_force",
    ];

    return node.keywords.some((kw: string) =>
      exponentialIndicators.some((indicator) =>
        kw.toLowerCase().includes(indicator)
      )
    );
  }

  // HIGH CONFIDENCE DETECTION METHODS - Regex-style specific patterns

  /**
   * Detects classic fibonacci recursion pattern
   * Similar to regex: /fibonacci.*return.*fibonacci.*\(.*n.*-.*1.*\).*\+.*fibonacci.*\(.*n.*-.*2.*\)/
   */
  private detectClassicFibonacci(node: any): boolean {
    const functionText = node.astNode.text.toLowerCase();

    // Must be named fibonacci or fib
    if (!functionText.includes("fibonacci") && !functionText.includes("fib")) {
      return false;
    }

    let hasBaseCase = false;
    let hasTwoRecursiveCalls = false;
    let hasNMinus1AndNMinus2 = false;
    let hasReturnSum = false;

    this.traverseAST(node.astNode, (astNode) => {
      // Check for base case: if n <= 1 return n
      if (astNode.type === "if_statement") {
        const conditionText = astNode.text.toLowerCase();
        if (
          (conditionText.includes("<=") || conditionText.includes("<")) &&
          conditionText.includes("1")
        ) {
          hasBaseCase = true;
        }
      }

      // Check for return statement with addition
      if (astNode.type === "return_statement") {
        const returnText = astNode.text.toLowerCase();
        if (
          returnText.includes("+") &&
          (returnText.includes("fibonacci") || returnText.includes("fib"))
        ) {
          hasReturnSum = true;

          // Check for n-1 and n-2 patterns
          if (
            (returnText.includes("n-1") || returnText.includes("n - 1")) &&
            (returnText.includes("n-2") || returnText.includes("n - 2"))
          ) {
            hasNMinus1AndNMinus2 = true;
          }
        }
      }
    });

    // Count recursive calls
    let recursiveCalls = 0;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "call") {
        const callText = astNode.text.toLowerCase();
        if (callText.includes("fibonacci") || callText.includes("fib")) {
          recursiveCalls++;
        }
      }
    });

    hasTwoRecursiveCalls = recursiveCalls >= 2;

    return (
      hasBaseCase &&
      hasTwoRecursiveCalls &&
      hasNMinus1AndNMinus2 &&
      hasReturnSum
    );
  }

  /**
   * Detects Tower of Hanoi recursive pattern
   * Similar to regex: /hanoi.*hanoi.*hanoi.*hanoi/
   */
  private detectTowerOfHanoi(node: any): boolean {
    const functionText = node.astNode.text.toLowerCase();

    // Must have tower/hanoi related terms
    if (!functionText.includes("hanoi") && !functionText.includes("tower")) {
      return false;
    }

    let hasThreeRecursiveCalls = false;
    let hasBaseCase = false;

    // Count recursive calls (Tower of Hanoi typically has 3: 2 recursive + 1 move)
    let recursiveCalls = 0;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "call") {
        const callText = astNode.text.toLowerCase();
        if (callText.includes("hanoi") || callText.includes("tower")) {
          recursiveCalls++;
        }
      }

      // Check for base case
      if (astNode.type === "if_statement") {
        const conditionText = astNode.text.toLowerCase();
        if (conditionText.includes("<=") || conditionText.includes("==")) {
          hasBaseCase = true;
        }
      }
    });

    hasThreeRecursiveCalls = recursiveCalls >= 2; // At least 2 recursive calls

    return hasThreeRecursiveCalls && hasBaseCase;
  }

  /**
   * Detects binary tree all paths pattern
   * Similar to regex: /paths.*left.*right.*append.*pop/
   */
  private detectBinaryTreeAllPaths(node: any): boolean {
    const functionText = node.astNode.text.toLowerCase();

    // Must have tree/path related terms
    const hasTreeTerms =
      functionText.includes("path") ||
      functionText.includes("tree") ||
      functionText.includes("root") ||
      functionText.includes("leaf") ||
      (functionText.includes("left") && functionText.includes("right"));

    // Enhanced pattern detection for all paths generation
    const isPathFunction =
      functionText.includes("all_root_to_leaf_paths") ||
      functionText.includes("all_paths") ||
      (functionText.includes("path") &&
        (functionText.includes("all") || functionText.includes("generate")));

    if (!hasTreeTerms && !isPathFunction) {
      return false;
    }

    let hasLeftRightRecursion = false;
    let hasPathBuildingPattern = false;
    let recursiveCalls = 0;

    this.traverseAST(node.astNode, (astNode) => {
      // Look for recursive calls with left/right - relaxed pattern
      if (astNode.type === "call") {
        recursiveCalls++;
        const callText = astNode.text.toLowerCase();
        if (callText.includes(node.funcName)) {
          // Check if we have left/right access patterns
          this.traverseAST(node.astNode, (child) => {
            const childText = child.text.toLowerCase();
            if (
              childText.includes(".left") ||
              childText.includes(".right") ||
              (childText.includes("left") && childText.includes("right"))
            ) {
              hasLeftRightRecursion = true;
            }
          });
        }
      }

      // Look for path building patterns - more flexible
      if (astNode.type === "call") {
        const callText = astNode.text.toLowerCase();
        if (
          callText.includes("extend") ||
          callText.includes("append") ||
          callText.includes("add")
        ) {
          hasPathBuildingPattern = true;
        }
      }

      // Look for list comprehension patterns typical in path generation
      const nodeText = astNode.text.toLowerCase();
      if (
        nodeText.includes("for") &&
        nodeText.includes("in") &&
        (nodeText.includes("path") ||
          nodeText.includes("left") ||
          nodeText.includes("right"))
      ) {
        hasPathBuildingPattern = true;
      }

      // Look for path concatenation patterns
      if (nodeText.includes("+") && nodeText.includes("path")) {
        hasPathBuildingPattern = true;
      }
    });

    const hasRecursiveCalls = recursiveCalls >= 1; // Relaxed from 2 to 1

    // Check for base case typical in tree traversal
    let hasTreeBaseCase = false;
    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "if_statement") {
        const conditionText = astNode.text.toLowerCase();
        if (
          (conditionText.includes("not") && conditionText.includes("root")) ||
          conditionText.includes("none") ||
          (conditionText.includes("not") &&
            (conditionText.includes("left") || conditionText.includes("right")))
        ) {
          hasTreeBaseCase = true;
        }
      }
    });

    return (
      (hasLeftRightRecursion && hasRecursiveCalls && hasPathBuildingPattern) ||
      (isPathFunction && hasRecursiveCalls && hasTreeBaseCase) ||
      (hasPathBuildingPattern && hasTreeBaseCase && hasRecursiveCalls)
    );
  }

  private isSortingAlgorithm(node: any): boolean {
    const sortingKeywords = [
      "sort",
      "sorted",
      "merge",
      "quick",
      "heap",
      "partition",
      "divide",
      "conquer",
    ];

    return node.keywords.some((kw: string) =>
      sortingKeywords.includes(kw.toLowerCase())
    );
  }
}
