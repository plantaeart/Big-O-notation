import { TimeComplexityPatternDetector } from "./TimeComplexityPatternDetector";
import {
  ComplexityPattern,
  ComplexityAnalysisContext,
} from "../../models/ComplexityNode";
import { TimeComplexityNotation } from "../../constants/timeComplexityNotationsConst";

export class LogarithmicTimeComplexityDetector extends TimeComplexityPatternDetector {
  protected readonly complexityNotation = TimeComplexityNotation.LOGARITHMIC;
  protected readonly minConfidence = 70;

  detect(context: ComplexityAnalysisContext): ComplexityPattern | null {
    const { node } = context;
    const patterns: string[] = [];
    const reasons: string[] = [];
    let confidence = 0;

    // HIGH CONFIDENCE PATTERNS (90-95%) - Regex-style specific detection

    // Pattern 1: Classic Binary Search (95% confidence)
    if (this.detectClassicBinarySearch(node)) {
      patterns.push("classic_binary_search");
      reasons.push(
        "Classic binary search with left/right pointers and mid calculation"
      );
      confidence += 95;
    }

    // Pattern 2: BST Traversal (90% confidence)
    if (this.detectBSTTraversal(node)) {
      patterns.push("bst_traversal");
      reasons.push("Binary Search Tree traversal with left/right navigation");
      confidence += 90;
    }

    // Pattern 3: Divide by 2 Loop (85% confidence)
    if (this.detectDivideByTwoLoop(node)) {
      patterns.push("divide_by_two");
      reasons.push("Loop that divides problem size by 2 each iteration");
      confidence += 85;
    }

    // Pattern 4: Bracket Matching/Counting (80% confidence)
    if (this.detectBracketMatching(node)) {
      patterns.push("bracket_matching");
      reasons.push(
        "Bracket matching or counting algorithm with early termination"
      );
      confidence += 80;
    }

    // MEDIUM CONFIDENCE PATTERNS (70-80%)

    // Pattern 4: Binary search patterns (improved)
    if (this.detectBinarySearch(node)) {
      patterns.push("binary_search");
      reasons.push("Binary search algorithm");
      confidence += 75;
    }

    // Pattern 5: Tree traversal (single path) (improved)
    if (this.detectTreeTraversal(node)) {
      patterns.push("tree_traversal");
      reasons.push("Tree traversal down single path");
      confidence += 70;
    }

    // Pattern 6: Halving operations
    if (this.detectHalvingOperations(node)) {
      patterns.push("halving_operations");
      reasons.push("Operations that halve input size");
      confidence += 45;
    }

    // Pattern 7: Heap operations (80% confidence for individual heap operations)
    if (this.detectHeapOperations(node)) {
      patterns.push("heap_operations");
      reasons.push("Individual heap operations (heappush, heappop, heapify)");
      confidence += 80;
    }

    // Pattern 8: Mathematical logarithmic operations (90% confidence)
    if (this.detectMathematicalLogarithms(node)) {
      patterns.push("mathematical_logarithms");
      reasons.push(
        "Mathematical logarithmic functions (log, log2, log10) depending on input"
      );
      confidence += 90;
    }

    // Pattern 9: Logarithmic keywords
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
    const treeKeywords = ["tree", "node", "root", "parent", "child", "bst"];

    const hasTreeKeywords = node.keywords.some((kw: string) =>
      treeKeywords.some((keyword) => kw.toLowerCase().includes(keyword))
    );

    // Don't classify merge operations as tree traversal
    const mergeKeywords = ["merge", "combine", "left", "right", "result"];
    const isMergeOperation = node.keywords.some((kw: string) =>
      mergeKeywords.includes(kw.toLowerCase())
    );

    // If this looks like a merge operation, don't classify as tree traversal
    if (isMergeOperation && !hasTreeKeywords) {
      return false;
    }

    // Look for single path traversal (not visiting all nodes)
    let hasSinglePathTraversal = false;

    // Check recursive single path traversal
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

    // Check iterative single path traversal (while loops)
    if (node.whileLoopCount > 0) {
      this.traverseAST(node.astNode, (astNode) => {
        if (astNode.type === "while_statement") {
          const whileText = astNode.text.toLowerCase();
          // Look for patterns indicating single path tree traversal
          if (
            (hasTreeKeywords && whileText.includes("root")) ||
            (whileText.includes("left") && whileText.includes("right")) ||
            whileText.includes("parent") ||
            whileText.includes("node")
          ) {
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

    // Individual heap operations are O(log n)
    // Multiple heap operations in a loop would be O(n log n) (handled by LinearithmicDetector)
    let hasIndividualHeapOps = false;

    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "call" && astNode.childCount > 0) {
        const functionName = astNode.child(0);
        if (functionName) {
          const callText = functionName.text.toLowerCase();
          if (
            callText.includes("heappush") ||
            callText.includes("heappop") ||
            callText.includes("heapify")
          ) {
            hasIndividualHeapOps = true;
          }
        }
      }
    });

    return hasHeapKeywords && hasIndividualHeapOps;
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

  /**
   * Detects mathematical logarithmic functions that depend on input size
   * Patterns include: math.log2(n), math.log(n), math.log10(n), np.log2(n), etc.
   */
  private detectMathematicalLogarithms(node: any): boolean {
    const nodeText = node.astNode ? node.astNode.text : "";

    // Look for mathematical logarithmic function calls with input-dependent arguments
    const logPatterns = [
      /\bmath\.log2?\s*\(\s*[^)]*\b(n|len|size)\b[^)]*\)/i,
      /\bmath\.log10\s*\(\s*[^)]*\b(n|len|size)\b[^)]*\)/i,
      /\bnp\.log2?\s*\(\s*[^)]*\b(n|len|size)\b[^)]*\)/i,
      /\bnp\.log10\s*\(\s*[^)]*\b(n|len|size)\b[^)]*\)/i,
      /\bmath\.log\s*\(\s*[^)]*\b(n|len|size)\b[^)]*\)/i,
      /\bnumpy\.log2?\s*\(\s*[^)]*\b(n|len|size)\b[^)]*\)/i,
      /\bnumpy\.log10\s*\(\s*[^)]*\b(n|len|size)\b[^)]*\)/i,
      // Also detect common tree height calculations
      /\bmath\.log2?\s*\(\s*[^)]*\+\s*1\s*\)/i,
      /\bmath\.ceil\s*\(\s*math\.log2?\s*\([^)]*\)\s*\)/i,
      /\bmath\.floor\s*\(\s*math\.log2?\s*\([^)]*\)\s*\)/i,
    ];

    for (const pattern of logPatterns) {
      if (pattern.test(nodeText)) {
        return true;
      }
    }

    return false;
  }

  // HIGH CONFIDENCE DETECTION METHODS - Regex-style specific patterns

  /**
   * Detects classic binary search with left/right pointers and mid calculation
   * Similar to regex: /while.*left.*<=.*right.*mid.*=.*(left.*\+.*right).*\/\/.*2/
   */
  private detectClassicBinarySearch(node: any): boolean {
    const functionText = node.astNode.text.toLowerCase();

    // Must have binary search keywords
    const hasBinarySearchTerms =
      (functionText.includes("left") && functionText.includes("right")) ||
      (functionText.includes("low") && functionText.includes("high")) ||
      (functionText.includes("start") && functionText.includes("end"));

    if (!hasBinarySearchTerms) {
      return false;
    }

    let hasWhileLoop = false;
    let hasMidCalculation = false;
    let hasPointerUpdate = false;

    this.traverseAST(node.astNode, (astNode) => {
      // Check for while loop with comparison
      if (astNode.type === "while_statement") {
        const whileText = astNode.text.toLowerCase();
        if (whileText.includes("<=") || whileText.includes("<")) {
          hasWhileLoop = true;
        }
      }

      // Check for mid calculation: mid = (left + right) // 2
      if (astNode.type === "assignment") {
        const assignText = astNode.text.toLowerCase();
        if (
          assignText.includes("mid") &&
          (assignText.includes("//") || assignText.includes("/")) &&
          assignText.includes("2")
        ) {
          hasMidCalculation = true;
        }
      }

      // Check for pointer updates: left = mid + 1 or right = mid - 1
      if (astNode.type === "assignment") {
        const assignText = astNode.text.toLowerCase();
        if (
          (assignText.includes("left") ||
            assignText.includes("right") ||
            assignText.includes("low") ||
            assignText.includes("high")) &&
          assignText.includes("mid")
        ) {
          hasPointerUpdate = true;
        }
      }
    });

    return hasWhileLoop && hasMidCalculation && hasPointerUpdate;
  }

  /**
   * Detects BST traversal with root.left/root.right navigation
   * Similar to regex: /while.*root.*root\.left.*root\.right/
   */
  private detectBSTTraversal(node: any): boolean {
    const functionText = node.astNode.text.toLowerCase();

    // Must have tree/BST related terms
    const hasTreeTerms =
      functionText.includes("root") ||
      functionText.includes("node") ||
      functionText.includes("bst") ||
      functionText.includes("tree");

    if (!hasTreeTerms) {
      return false;
    }

    let hasWhileLoop = false;
    let hasLeftRightNavigation = false;
    let hasValueComparison = false;

    this.traverseAST(node.astNode, (astNode) => {
      // Check for while loop
      if (astNode.type === "while_statement") {
        hasWhileLoop = true;

        // Look for left/right navigation within the while loop
        this.traverseAST(astNode, (child) => {
          if (child.type === "assignment") {
            const assignText = child.text.toLowerCase();
            if (
              (assignText.includes(".left") || assignText.includes(".right")) &&
              (assignText.includes("root") || assignText.includes("node"))
            ) {
              hasLeftRightNavigation = true;
            }
          }

          // Look for value comparison (root.val == target)
          if (child.type === "comparison_operator") {
            const compText = child.text.toLowerCase();
            if (
              compText.includes(".val") ||
              compText.includes(".data") ||
              compText.includes(".value")
            ) {
              hasValueComparison = true;
            }
          }
        });
      }
    });

    return hasWhileLoop && hasLeftRightNavigation && hasValueComparison;
  }

  /**
   * Detects loops that divide by 2 each iteration
   * Similar to regex: /while.*n.*>.*n.*\/\/.*2/ or /while.*n.*>.*n.*\/.*2/
   */
  private detectDivideByTwoLoop(node: any): boolean {
    let hasDivideByTwoPattern = false;

    this.traverseAST(node.astNode, (astNode) => {
      if (astNode.type === "while_statement") {
        // Look for assignments that divide by 2 within the while loop
        this.traverseAST(astNode, (child) => {
          // Check for regular assignment: n = n // 2
          if (child.type === "assignment") {
            const assignText = child.text.toLowerCase();
            // Check for patterns like: n = n // 2, i = i // 2, size = size / 2
            if (
              (assignText.includes("//") || assignText.includes("/")) &&
              assignText.includes("2")
            ) {
              // Ensure it's actually dividing a variable by 2
              const leftSide = assignText.split("=")[0]?.trim();
              const rightSide = assignText.split("=")[1]?.trim();
              if (
                leftSide &&
                rightSide &&
                rightSide.includes(leftSide.split(".")[0])
              ) {
                hasDivideByTwoPattern = true;
              }
            }
          }
          
          // Check for compound assignment: n //= 2, n /= 2
          if (child.type === "augmented_assignment") {
            const assignText = child.text.toLowerCase();
            if (
              (assignText.includes("//=") || assignText.includes("/=")) &&
              assignText.includes("2")
            ) {
              hasDivideByTwoPattern = true;
            }
          }
        });
      }
    });

    return hasDivideByTwoPattern;
  }

  /**
   * Detects bracket matching/counting patterns
   * Similar to regex: /bracket.*match.*count.*while.*count.*[>0|==0]/
   */
  private detectBracketMatching(node: any): boolean {
    const functionText = node.astNode.text.toLowerCase();

    // Must have bracket-related terms
    const hasBracketTerms =
      functionText.includes("bracket") ||
      functionText.includes("paren") ||
      functionText.includes("match") ||
      (functionText.includes("(") && functionText.includes(")")) ||
      (functionText.includes("[") && functionText.includes("]")) ||
      (functionText.includes("{") && functionText.includes("}"));

    if (!hasBracketTerms) {
      return false;
    }

    let hasCounterVariable = false;
    let hasCounterIncrement = false;
    let hasCounterDecrement = false;
    let hasEarlyTermination = false;

    this.traverseAST(node.astNode, (astNode) => {
      // Look for counter initialization
      if (astNode.type === "assignment") {
        const assignText = astNode.text.toLowerCase();
        if (
          assignText.includes("count") &&
          (assignText.includes("= 1") || assignText.includes("= 0"))
        ) {
          hasCounterVariable = true;
        }
      }

      // Look for while loop with counter condition
      if (astNode.type === "while_statement") {
        const conditionText = astNode.text.toLowerCase();
        if (
          conditionText.includes("count") &&
          (conditionText.includes("> 0") || conditionText.includes("!= 0"))
        ) {
          hasEarlyTermination = true;
        }
      }

      // Look for counter increment/decrement
      if (
        astNode.type === "assignment" ||
        astNode.type === "augmented_assignment"
      ) {
        const assignText = astNode.text.toLowerCase();
        if (assignText.includes("count")) {
          if (
            assignText.includes("+ 1") ||
            assignText.includes("++") ||
            assignText.includes("+= 1")
          ) {
            hasCounterIncrement = true;
          }
          if (
            assignText.includes("- 1") ||
            assignText.includes("--") ||
            assignText.includes("-= 1")
          ) {
            hasCounterDecrement = true;
          }
        }
      }

      // Look for conditional increment/decrement based on character
      if (astNode.type === "if_statement") {
        const ifText = astNode.text.toLowerCase();
        if (
          (ifText.includes("(") ||
            ifText.includes("[") ||
            ifText.includes("{")) &&
          ifText.includes("count") &&
          (ifText.includes("+") || ifText.includes("-"))
        ) {
          hasCounterIncrement = true;
          hasCounterDecrement = true;
        }
      }
    });

    // Bracket matching typically has: counter variable, increment/decrement, early termination
    return (
      hasCounterVariable &&
      hasCounterIncrement &&
      hasCounterDecrement &&
      hasEarlyTermination
    );
  }
}
