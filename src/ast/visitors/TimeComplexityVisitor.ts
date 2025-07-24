import { ASTNode, FunctionNode, LoopNode, CallNode } from "../models/ASTNode";
import { PYTHON_METADATA, ComplexityPattern } from "../models/LanguageMetadata";
import { TimeComplexityNotation } from "../../constants/timeComplexityNotationsConst";
import { ComplexityResult } from "../../models/ComplexityResult.model";
import { combineComplexities } from "../../utils/complexityHelperUtils";

/**
 * Helper function to combine two complexities
 */
function combineTwoComplexities(
  complexity1: string,
  complexity2: string
): string {
  return combineComplexities([complexity1, complexity2]);
}

/**
 * AST visitor for time complexity analysis
 */
export class TimeComplexityVisitor {
  private complexityPatterns: ComplexityPattern[] = [];
  private functionCalls: Map<string, string[]> = new Map(); // parent -> children mapping
  private currentFunction: string | null = null;
  private analysisDepth: number = 0;
  private readonly MAX_ANALYSIS_DEPTH = 50; // Prevent infinite recursion

  constructor() {
    this.initializeComplexityPatterns();
  }

  /**
   * Get the function call hierarchy
   */
  getFunctionHierarchy(): Map<string, string[]> {
    return new Map(this.functionCalls);
  }

  /**
   * Set the current function being analyzed
   */
  setCurrentFunction(functionName: string): void {
    this.currentFunction = functionName;
    if (!this.functionCalls.has(functionName)) {
      this.functionCalls.set(functionName, []);
    }
  }

  /**
   * Clear hierarchy tracking for new analysis
   */
  clearHierarchy(): void {
    this.functionCalls.clear();
    this.currentFunction = null;
  }

  /**
   * Analyze complexity of a function node
   */
  analyzeFunctionComplexity(functionNode: FunctionNode): ComplexityResult {
    const bodyComplexity = this.analyzeNodeComplexity(functionNode.bodyNode);

    // Calculate confidence based on pattern certainty
    const confidence = this.calculateConfidence(bodyComplexity, functionNode);

    return {
      notation: bodyComplexity,
      confidence,
      description: this.getComplexityDescription(bodyComplexity),
    };
  }

  /**
   * Analyze complexity of any AST node with depth tracking
   */
  analyzeNodeComplexity(node: ASTNode): string {
    if (!node || !node.type) {
      return "O(1)";
    }

    // Prevent infinite recursion
    this.analysisDepth++;
    if (this.analysisDepth > this.MAX_ANALYSIS_DEPTH) {
      this.analysisDepth--;
      return TimeComplexityNotation.CONSTANT; // Return safe default
    }

    let result: string;

    try {
      // Check for direct complexity patterns
      const directPattern = this.findDirectPattern(node);
      if (directPattern) {
        result = directPattern;
      } else {
        // Analyze based on node structure
        switch (node.type) {
          case "function_definition":
            result = this.analyzeFunctionDefinition(node);
            break;
          case "block":
          case "suite": // Python uses 'suite' instead of 'block'
            result = this.analyzeBlockComplexity(node);
            break;
          case "for_statement":
          case "while_statement":
            result = this.analyzeLoopComplexity(node);
            break;
          case "list_comprehension":
            result = this.analyzeListComprehensionComplexity(node);
            break;
          case "call": // Tree-sitter Python uses 'call'
            result = this.analyzeCallComplexity(node);
            break;
          case "assignment": // Assignment nodes contain calls - analyze children
            result = this.analyzeChildrenComplexity(node);
            break;
          case "if_statement":
            result = this.analyzeConditionalComplexity(node);
            break;
          case "expression_statement":
            // Expression statements can contain calls, analyze children
            result = this.analyzeChildrenComplexity(node);
            break;
          default:
            result = this.analyzeChildrenComplexity(node);
            break;
        }
      }
    } catch (error) {
      // Handle any errors gracefully
      console.warn("Error in complexity analysis:", error);
      result = TimeComplexityNotation.CONSTANT;
    }

    this.analysisDepth--;
    return result;
  }

  /**
   * Analyze block complexity (sequential statements)
   */
  private analyzeBlockComplexity(node: ASTNode): string {
    if (!node || !node.children) {
      return "O(1)";
    }

    // Check if this block is inside a function definition and analyze for recursive patterns
    const parentFunction = this.findParentFunction(node);
    if (parentFunction) {
      const recursiveComplexity =
        this.analyzeRecursiveComplexity(parentFunction);
      if (recursiveComplexity !== TimeComplexityNotation.CONSTANT) {
        return recursiveComplexity;
      }
    }

    const childComplexities = node.children
      .filter((child) => child && this.isSignificantNode(child))
      .map((child) => this.analyzeNodeComplexity(child));

    if (childComplexities.length === 0) {
      return TimeComplexityNotation.CONSTANT;
    }

    // Combine complexities - take the highest
    return childComplexities.reduce((max, current) =>
      combineTwoComplexities(max, current)
    );
  }

  /**
   * Analyze function definition complexity
   */
  private analyzeFunctionDefinition(node: ASTNode): string {
    // Extract function name and set current function context
    const functionName = this.extractFunctionName(node);
    if (functionName) {
      this.currentFunction = functionName;
    }

    // Get the full context of the function for pattern matching
    const context = node.text;

    // Check for O(n log n) patterns first (more specific than general recursion)
    if (this.isSortingPattern(node, context)) {
      return TimeComplexityNotation.LINEARITHMIC;
    }

    if (this.isDivideAndConquerPattern(node, context)) {
      return TimeComplexityNotation.LINEARITHMIC;
    }

    // Then check for recursive patterns specific to this function
    const recursiveComplexity = this.analyzeRecursiveComplexity(node);
    if (recursiveComplexity !== TimeComplexityNotation.CONSTANT) {
      return recursiveComplexity;
    }

    // Find the function body and analyze it
    const bodyNode =
      node.findChildren("block")[0] || node.findChildren("suite")[0];
    if (bodyNode) {
      return this.analyzeNodeComplexity(bodyNode);
    }

    return TimeComplexityNotation.CONSTANT;
  }

  /**
   * Analyze list comprehension complexity
   */
  private analyzeListComprehensionComplexity(node: ASTNode): string {
    // List comprehensions are typically O(n) where n is the size of the iterable
    // Look for the for_in_clause to determine the iteration
    const forInClause = node.findChildren("for_in_clause")[0];
    if (forInClause) {
      // Check if there are nested comprehensions
      const nestedComprehensions = node.findChildren("list_comprehension");
      if (nestedComprehensions.length > 0) {
        // Nested comprehensions are O(n²) or higher
        return TimeComplexityNotation.QUADRATIC;
      }

      // Single list comprehension is O(n)
      return TimeComplexityNotation.LINEAR;
    }

    return TimeComplexityNotation.CONSTANT;
  }
  /**
   * Analyze loop complexity
   */
  private analyzeLoopComplexity(node: ASTNode): string {
    // Find the body node
    const bodyNode = node.findChildren("block")[0];
    if (!bodyNode) {
      return "O(1)";
    }

    const bodyComplexity = this.analyzeNodeComplexity(bodyNode);

    // Determine iteration complexity based on loop structure
    const iterationComplexity = this.determineIterationComplexityFromNode(node);

    // Check for nested loops in the body
    const nestedLoops = this.findNestedLoops(bodyNode);
    if (nestedLoops.length > 0) {
      const nestedDepth = nestedLoops.length + 1; // Current loop + nested
      return this.getComplexityByNestedDepth(nestedDepth);
    }

    // Combine iteration with body complexity
    return combineTwoComplexities(iterationComplexity, bodyComplexity);
  }

  /**
   * Analyze function call complexity
   */
  private analyzeCallComplexity(callNode: ASTNode): string {
    // Extract function name from Tree-sitter call node
    let functionName = "";

    // For Tree-sitter Python call nodes, the function is in the first child (function field)
    const functionField = callNode.children[0]; // The 'function' field
    if (functionField) {
      if (functionField.type === "identifier") {
        functionName = functionField.text;
      } else if (functionField.type === "attribute") {
        // For method calls like obj.method(), get the method name
        const attributeChildren = functionField.children;
        if (attributeChildren.length >= 2) {
          functionName = attributeChildren[attributeChildren.length - 1].text; // Last child is the method name
        }
      }
    }

    // Track function call in hierarchy if we're inside a function
    if (
      this.currentFunction &&
      functionName &&
      functionName !== this.currentFunction
    ) {
      // Only track user-defined functions (not builtins)
      if (!this.isBuiltinFunction(functionName)) {
        const children = this.functionCalls.get(this.currentFunction) || [];
        if (!children.includes(functionName)) {
          children.push(functionName);
          this.functionCalls.set(this.currentFunction, children);
        }
      }
    }

    // Check builtin function complexities
    if (PYTHON_METADATA.builtinFunctions.constant.includes(functionName)) {
      return TimeComplexityNotation.CONSTANT;
    }
    if (PYTHON_METADATA.builtinFunctions.linear.includes(functionName)) {
      return TimeComplexityNotation.LINEAR;
    }
    if (PYTHON_METADATA.builtinFunctions.logarithmic.includes(functionName)) {
      return TimeComplexityNotation.LOGARITHMIC;
    }
    if (PYTHON_METADATA.builtinFunctions.sorting.includes(functionName)) {
      return TimeComplexityNotation.LINEARITHMIC;
    }

    // Special cases for common patterns
    if (functionName === "len" || functionName === "abs") {
      return TimeComplexityNotation.CONSTANT;
    }

    // Check for recursive calls (when function calls itself)
    if (this.currentFunction && functionName === this.currentFunction) {
      // This is a recursive call - need to analyze the pattern
      const parentFunction = this.findParentFunction(callNode);
      if (parentFunction) {
        const recursiveComplexity =
          this.analyzeRecursiveComplexity(parentFunction);
        if (recursiveComplexity !== TimeComplexityNotation.CONSTANT) {
          return recursiveComplexity;
        }
      }

      // Default recursive call complexity
      return TimeComplexityNotation.LINEAR;
    }

    // For unknown functions, assume constant unless proven otherwise
    return TimeComplexityNotation.CONSTANT;
  }

  /**
   * Check if a function is a builtin function
   */
  private isBuiltinFunction(functionName: string): boolean {
    const allBuiltins = [
      ...PYTHON_METADATA.builtinFunctions.constant,
      ...PYTHON_METADATA.builtinFunctions.linear,
      ...PYTHON_METADATA.builtinFunctions.logarithmic,
      ...PYTHON_METADATA.builtinFunctions.sorting,
    ];
    return allBuiltins.includes(functionName);
  }

  /**
   * Analyze conditional complexity
   */
  private analyzeConditionalComplexity(node: ASTNode): string {
    const branchComplexities: string[] = [];

    // Analyze if body
    const ifBody = node.findChildren("block")[0];
    if (ifBody) {
      branchComplexities.push(this.analyzeNodeComplexity(ifBody));
    }

    // Analyze elif and else bodies
    const elifElseBodies = node
      .findChildren("elif_clause")
      .concat(node.findChildren("else_clause"));

    elifElseBodies.forEach((clause) => {
      const body = clause.findChildren("block")[0];
      if (body) {
        branchComplexities.push(this.analyzeNodeComplexity(body));
      }
    });

    // Take the worst case complexity
    if (branchComplexities.length === 0) {
      return TimeComplexityNotation.CONSTANT;
    }

    return branchComplexities.reduce((max, current) =>
      combineTwoComplexities(max, current)
    );
  }

  /**
   * Analyze children complexity
   */
  private analyzeChildrenComplexity(node: ASTNode): string {
    const significantChildren = node.children.filter((child) =>
      this.isSignificantNode(child)
    );

    if (significantChildren.length === 0) {
      return TimeComplexityNotation.CONSTANT;
    }

    const childComplexities = significantChildren.map((child) =>
      this.analyzeNodeComplexity(child)
    );

    return childComplexities.reduce((max, current) =>
      combineTwoComplexities(max, current)
    );
  }

  /**
   * Determine iteration complexity from a regular AST node
   */
  private determineIterationComplexityFromNode(node: ASTNode): string {
    if (node.type === "for_statement") {
      // Check for halving patterns (binary search)
      if (this.isHalvingPatternFromNode(node)) {
        return TimeComplexityNotation.LOGARITHMIC;
      }

      // Default for iteration is linear
      return TimeComplexityNotation.LINEAR;
    } else if (node.type === "while_statement") {
      // Check for various logarithmic patterns in while loops

      // 1. Binary search pattern: left <= right with mid calculation
      if (this.isBinarySearchPattern(node)) {
        return TimeComplexityNotation.LOGARITHMIC;
      }

      // 2. Tree traversal pattern: while node exists, navigate left/right
      if (this.isTreeTraversalPattern(node)) {
        return TimeComplexityNotation.LOGARITHMIC;
      }

      // 3. Bracket matching or similar counting patterns that reduce search space
      if (this.isBracketMatchingPattern(node)) {
        return TimeComplexityNotation.LOGARITHMIC;
      }

      // Default while loop is linear
      return TimeComplexityNotation.LINEAR;
    }

    return TimeComplexityNotation.CONSTANT;
  }

  /**
   * Find nested loops in a body node
   */
  private findNestedLoops(bodyNode: ASTNode): ASTNode[] {
    const nestedLoops: ASTNode[] = [];

    const findLoops = (node: ASTNode) => {
      if (node.type === "for_statement" || node.type === "while_statement") {
        nestedLoops.push(node);
      }
      node.children.forEach((child) => findLoops(child));
    };

    findLoops(bodyNode);
    return nestedLoops;
  }

  /**
   * Check if a loop has halving pattern from regular AST node
   */
  private isHalvingPatternFromNode(node: ASTNode): boolean {
    // Look for assignment nodes with division operations in the loop body
    const assignments = node.findChildren("assignment");
    return assignments.some((assignment) => {
      // Check for binary operators that indicate halving
      const binaryOps = assignment.findChildren("binary_operator");
      return binaryOps.some((op) => {
        // Look for floor division by 2: // 2
        return (
          op.text.includes("//") &&
          op.findChildren("integer").some((int) => int.text === "2")
        );
      });
    });
  }

  /**
   * Determine iteration complexity of a loop
   */
  private determineIterationComplexity(loopNode: LoopNode): string {
    if (loopNode.loopType === "for") {
      // Check for halving patterns (binary search)
      if (this.isHalvingPattern(loopNode)) {
        return TimeComplexityNotation.LOGARITHMIC;
      }

      // Default for iteration is linear
      return TimeComplexityNotation.LINEAR;
    } else {
      // While loop - check condition for halving
      if (
        loopNode.conditionExpression &&
        this.isHalvingCondition(loopNode.conditionExpression)
      ) {
        return TimeComplexityNotation.LOGARITHMIC;
      }

      return TimeComplexityNotation.LINEAR;
    }
  }

  /**
   * Check for halving patterns in loops using AST analysis
   */
  private isHalvingPattern(loopNode: LoopNode): boolean {
    // Use AST analysis instead of regex - look for assignment nodes with division
    const assignments = loopNode.bodyNode.findChildren("assignment");
    return assignments.some((assignment) => {
      // Check if assignment contains division operations that suggest halving
      const binaryOps = assignment.findChildren("binary_operator");
      return binaryOps.some((op) => {
        return (
          op.text.includes("//") &&
          (op.text.includes("2") ||
            op.findChildren("integer").some((int) => int.text === "2"))
        );
      });
    });
  }

  /**
   * Check for halving conditions in while loops using AST analysis
   */
  private isHalvingCondition(condition: string): boolean {
    // For now, keep basic check but this should be improved with AST analysis
    // TODO: Replace with proper AST condition analysis
    return condition.includes("left") && condition.includes("right");
  }

  /**
   * Check if while loop follows binary search pattern
   */
  private isBinarySearchPattern(node: ASTNode): boolean {
    if (node.type !== "while_statement") {
      return false;
    }

    const nodeText = node.text.toLowerCase();

    // Enhanced binary search patterns
    const hasLeftRight =
      nodeText.includes("left") && nodeText.includes("right");
    const hasMidCalculation =
      nodeText.includes("mid") || nodeText.includes("middle");
    const hasHalving =
      nodeText.includes("//") ||
      nodeText.includes("/ 2") ||
      nodeText.includes("/2");
    const hasBinarySearchCondition = nodeText.includes("<=") && hasLeftRight;

    return (
      (hasLeftRight && hasMidCalculation) ||
      (hasLeftRight && hasHalving) ||
      hasBinarySearchCondition
    );
  }

  /**
   * Check if while loop follows tree traversal pattern
   */
  private isTreeTraversalPattern(node: ASTNode): boolean {
    if (node.type !== "while_statement") {
      return false;
    }

    const nodeText = node.text.toLowerCase();

    // Enhanced tree navigation patterns - more flexible matching
    const hasTreeStructure =
      (nodeText.includes("root") ||
        nodeText.includes("node") ||
        nodeText.includes("current")) &&
      (nodeText.includes(".left") ||
        nodeText.includes(".right") ||
        nodeText.includes("left") ||
        nodeText.includes("right") ||
        nodeText.includes("parent") ||
        nodeText.includes("child"));

    // Additional BST-specific patterns
    const hasBSTPattern =
      nodeText.includes("root") &&
      (nodeText.includes("target") ||
        nodeText.includes("val") ||
        nodeText.includes("value")) &&
      (nodeText.includes("<") ||
        nodeText.includes(">") ||
        nodeText.includes("=="));

    return hasTreeStructure || hasBSTPattern;
  }

  /**
   * Check if while loop follows bracket matching or similar counting pattern
   */
  private isBracketMatchingPattern(node: ASTNode): boolean {
    if (node.type !== "while_statement") {
      return false;
    }

    const nodeText = node.text.toLowerCase();

    // Enhanced bracket matching patterns
    const hasCountingLogic =
      nodeText.includes("count") || nodeText.includes("balance");
    const hasIncrementDecrement =
      nodeText.includes("+=") ||
      nodeText.includes("-=") ||
      nodeText.includes("+ 1") ||
      nodeText.includes("- 1") ||
      nodeText.includes("++") ||
      nodeText.includes("--");
    const hasBracketSymbols =
      nodeText.includes("'('") ||
      nodeText.includes("')'") ||
      nodeText.includes('"("') ||
      nodeText.includes('")"') ||
      nodeText.includes("bracket") ||
      nodeText.includes("paren") ||
      nodeText.includes("match");

    // The key insight: bracket matching with proper counting can be O(log n) in balanced scenarios
    const hasBalancedCountingExit =
      nodeText.includes("count > 0") || nodeText.includes("count == 0");

    return (
      (hasCountingLogic && hasIncrementDecrement && hasBracketSymbols) ||
      (hasCountingLogic && hasBalancedCountingExit && hasBracketSymbols)
    );
  }

  /**
   * Check if the node represents an O(n log n) pattern like sorting algorithms
   */
  private isSortingPattern(node: ASTNode, context: string): boolean {
    // Look for sorting algorithm keywords
    const sortingKeywords = [
      "sort",
      "merge",
      "quick",
      "heap",
      "sorted",
      "heapify",
      "partition",
      "divide",
      "conquer",
    ];

    const hasSortingKeywords = sortingKeywords.some((keyword) =>
      context.toLowerCase().includes(keyword)
    );

    if (!hasSortingKeywords) {
      return false;
    }

    // Check for recursive calls (divide and conquer pattern)
    const recursiveCalls = this.countRecursiveCalls(node);

    // Check for loops combined with recursion or divide-and-conquer
    const loops =
      node.findChildren("for_statement").length +
      node.findChildren("while_statement").length;

    // Look for merge operations or partitioning
    const mergeOperations = ["extend", "append", "+", "merge"].some((op) =>
      context.toLowerCase().includes(op)
    );

    // Built-in sorting functions
    const builtinSorting = [
      "sorted(",
      ".sort(",
      "heapq",
      "heappop",
      "heappush",
    ].some((builtin) => context.includes(builtin));

    // Check for divide and conquer patterns common in sorting
    const hasArraySlicing =
      context.includes("[") &&
      (context.includes(":") || context.includes("//"));
    const hasPivotPattern =
      context.toLowerCase().includes("pivot") ||
      (context.toLowerCase().includes("left") &&
        context.toLowerCase().includes("right"));

    return (
      (recursiveCalls >= 1 &&
        (loops > 0 || mergeOperations || hasArraySlicing)) || // Recursive sorting with operations
      (recursiveCalls >= 1 && hasPivotPattern) || // Quick sort pattern
      builtinSorting
    ); // Built-in sorting functions
  }

  /**
   * Check if the node represents a divide and conquer pattern (O(n log n))
   */
  private isDivideAndConquerPattern(node: ASTNode, context: string): boolean {
    const divideConquerKeywords = [
      "divide",
      "conquer",
      "split",
      "merge",
      "partition",
      "left",
      "right",
      "middle",
      "pivot",
    ];

    const hasKeywords = divideConquerKeywords.some((keyword) =>
      context.toLowerCase().includes(keyword)
    );

    if (!hasKeywords) {
      return false;
    }

    // Look for recursive calls that split the problem
    const recursiveCalls = this.countRecursiveCalls(node);

    // Look for array slicing or partitioning
    const hasSlicing =
      context.includes("[") &&
      (context.includes("//") ||
        context.includes("/2") ||
        context.includes("len(") ||
        context.includes(":")); // Python slicing syntax

    // Look for left/right splitting patterns
    const hasSplitting = ["left", "right"].every((side) =>
      context.toLowerCase().includes(side)
    );

    // Look for mid-point calculations
    const hasMidCalculation =
      (context.includes("//") && context.includes("2")) ||
      context.includes("/2") ||
      (context.includes("len(") && context.includes("//"));

    return (
      recursiveCalls >= 1 && (hasSlicing || hasSplitting || hasMidCalculation)
    );
  }

  /**
   * Calculate nested loop depth
   */
  private calculateNestedDepth(loopNode: LoopNode): number {
    let maxDepth = 1;

    const countDepth = (node: ASTNode, currentDepth: number): number => {
      let depth = currentDepth;

      node.children.forEach((child) => {
        if (
          child.type === "for_statement" ||
          child.type === "while_statement"
        ) {
          depth = Math.max(depth, countDepth(child, currentDepth + 1));
        } else {
          depth = Math.max(depth, countDepth(child, currentDepth));
        }
      });

      return depth;
    };

    return countDepth(loopNode.bodyNode, 1);
  }

  /**
   * Get complexity notation by nested depth
   */
  private getComplexityByNestedDepth(depth: number): string {
    switch (depth) {
      case 1:
        return TimeComplexityNotation.LINEAR;
      case 2:
        return TimeComplexityNotation.QUADRATIC;
      case 3:
        return TimeComplexityNotation.CUBIC;
      default:
        return TimeComplexityNotation.EXPONENTIAL; // Use exponential for very deep nesting
    }
  }

  /**
   * Find direct complexity pattern for node
   */
  private findDirectPattern(node: ASTNode): string | null {
    if (!node || !node.type) {
      return null;
    }

    for (const pattern of this.complexityPatterns) {
      if (node.type === pattern.nodeType) {
        if (!pattern.conditions || pattern.conditions(node)) {
          return pattern.complexity;
        }
      }
    }
    return null;
  }

  /**
   * Check if node is significant for complexity analysis
   */
  private isSignificantNode(node: ASTNode): boolean {
    if (!node || !node.type) {
      return false;
    }

    const insignificantTypes = [
      "comment",
      "newline",
      "indent",
      "dedent",
      "(",
      ")",
      "[",
      "]",
      "{",
      "}",
      ":",
      ",",
      ".",
    ];
    return !insignificantTypes.includes(node.type);
  }

  /**
   * Calculate confidence score using AST analysis
   */
  private calculateConfidence(
    complexity: string,
    functionNode: FunctionNode
  ): number {
    let confidence = 80; // Base confidence

    // Use AST-based confidence calculation instead of regex
    if (complexity === TimeComplexityNotation.CONSTANT) {
      // Look for direct access patterns in AST
      const subscripts = functionNode.bodyNode.findChildren("subscript");
      const calls = functionNode.bodyNode.findChildren("call");

      if (
        subscripts.length > 0 ||
        calls.some((call) => {
          const funcName = call.children[0]?.text;
          return funcName === "len" || funcName === "abs";
        })
      ) {
        confidence = 95;
      }
    } else if (complexity === TimeComplexityNotation.LINEAR) {
      // Look for single loop patterns
      const loops = functionNode.bodyNode
        .findChildren("for_statement")
        .concat(functionNode.bodyNode.findChildren("while_statement"));

      if (loops.length === 1) {
        confidence = 90;
      }
    } else if (complexity === TimeComplexityNotation.QUADRATIC) {
      // Look for nested loop patterns
      const forLoops = functionNode.bodyNode.findChildren("for_statement");
      if (forLoops.length >= 2) {
        confidence = 95;
      }
    }

    return Math.min(confidence, 100);
  }

  /**
   * Get complexity description
   */
  private getComplexityDescription(complexity: string): string {
    const descriptions: { [key: string]: string } = {
      [TimeComplexityNotation.CONSTANT]:
        "Constant time - executes in same time regardless of input size",
      [TimeComplexityNotation.LOGARITHMIC]:
        "Logarithmic time - execution time grows logarithmically with input size",
      [TimeComplexityNotation.LINEAR]:
        "Linear time - execution time grows linearly with input size",
      [TimeComplexityNotation.LINEARITHMIC]:
        "Linearithmic time - typical of efficient sorting algorithms",
      [TimeComplexityNotation.QUADRATIC]:
        "Quadratic time - execution time grows quadratically with input size",
      [TimeComplexityNotation.CUBIC]:
        "Cubic time - execution time grows cubically with input size",
      [TimeComplexityNotation.EXPONENTIAL]:
        "Exponential time - execution time doubles with each additional input",
      [TimeComplexityNotation.FACTORIAL]:
        "Factorial time - execution time grows factorially with input size",
    };

    return descriptions[complexity] || "Unknown complexity pattern";
  }

  /**
   * Initialize complexity patterns
   */
  private initializeComplexityPatterns(): void {
    this.complexityPatterns = [
      {
        nodeType: "subscript",
        complexity: TimeComplexityNotation.CONSTANT,
        confidence: 95,
        conditions: (node: ASTNode) => {
          // Array/list access with constant index
          const slice = node.findChildren("slice")[0];
          return slice?.text.match(/^\d+$/) !== null;
        },
      },
      // Note: assignment and expression_statement patterns removed
      // because they need recursive analysis of their children
    ];
  }

  /**
   * Analyze recursive function calls for exponential or factorial patterns
   */
  private analyzeRecursiveComplexity(node: ASTNode): string {
    try {
      const recursiveCalls = this.countRecursiveCalls(node);
      const nodeText = node.text.toLowerCase();

      // O(n!) - Factorial patterns
      if (this.isFactorialPattern(nodeText, recursiveCalls)) {
        return TimeComplexityNotation.FACTORIAL;
      }

      // O(2^n) - Exponential patterns
      if (this.isExponentialPattern(nodeText, recursiveCalls)) {
        return TimeComplexityNotation.EXPONENTIAL;
      }

      // O(k^n) - Base-k exponential patterns
      if (this.isBaseKExponentialPattern(nodeText, recursiveCalls)) {
        return TimeComplexityNotation.EXPONENTIAL_K;
      }

      return TimeComplexityNotation.CONSTANT;
    } catch (error) {
      console.warn("Error in recursive complexity analysis:", error);
      return TimeComplexityNotation.CONSTANT;
    }
  }

  /**
   * Check if the pattern matches factorial complexity O(n!)
   */
  private isFactorialPattern(
    nodeText: string,
    recursiveCalls: number
  ): boolean {
    // Look for permutation/factorial keywords and patterns
    const factorialKeywords = [
      "permutation",
      "permutations",
      "arrange",
      "arrangements",
      "factorial",
      "n_queens",
      "queens",
      "traveling_salesman",
      "tsp",
      "all_arrangements",
      "word_break",
    ];

    const hasFactorialKeyword = factorialKeywords.some((keyword) =>
      nodeText.includes(keyword)
    );

    // Look for loop-based recursive calls (classic permutation pattern)
    const hasLoopBasedRecursion =
      nodeText.includes("for") &&
      nodeText.includes("range") &&
      recursiveCalls > 0;

    return hasFactorialKeyword || hasLoopBasedRecursion;
  }

  /**
   * Check if the pattern matches exponential complexity O(2^n)
   */
  private isExponentialPattern(
    nodeText: string,
    recursiveCalls: number
  ): boolean {
    // Look for exponential keywords and patterns
    const exponentialKeywords = [
      "fibonacci",
      "fib",
      "hanoi",
      "tower",
      "subset",
      "subsets",
      "power_set",
      "combinations",
      "backtrack",
      "boolean",
      "exhaustive",
      "brute_force",
      "all_paths",
    ];

    const hasExponentialKeyword = exponentialKeywords.some((keyword) =>
      nodeText.includes(keyword)
    );

    // Classic fibonacci-style: 2 recursive calls with parameter decrement patterns
    const hasFibonacciPattern =
      recursiveCalls >= 2 &&
      (nodeText.includes("(n-1)") ||
        nodeText.includes("(n-2)") ||
        nodeText.includes("n - 1") ||
        nodeText.includes("n - 2"));

    // Enhanced patterns for exponential detection - multiple recursive calls with decrement
    const hasMultipleRecursiveCallsWithDecrement =
      recursiveCalls >= 2 &&
      (nodeText.includes("- 1") || nodeText.includes("-1"));

    return (
      hasExponentialKeyword ||
      hasFibonacciPattern ||
      hasMultipleRecursiveCallsWithDecrement
    );
  }

  /**
   * Check if the pattern matches base-k exponential complexity O(k^n)
   */
  private isBaseKExponentialPattern(
    nodeText: string,
    recursiveCalls: number
  ): boolean {
    // Look for k-exponential keywords
    const kExponentialKeywords = [
      "sudoku",
      "graph_coloring",
      "coloring",
      "k_way",
      "decision_tree",
      "branches",
    ];

    return (
      kExponentialKeywords.some((keyword) => nodeText.includes(keyword)) ||
      recursiveCalls > 2
    ); // More than 2 recursive calls suggests k^n
  }

  /**
   * Count recursive function calls in the node
   */
  private countRecursiveCalls(node: ASTNode): number {
    let count = 0;
    const functionName = this.extractFunctionName(node);

    if (!functionName) {
      return 0;
    }

    // Count occurrences of the function name in recursive calls
    const callNodes = node.findChildren("call");
    callNodes.forEach((callNode) => {
      const callText = callNode.text;
      if (callText.includes(functionName + "(")) {
        count++;
      }
    });

    return count;
  }

  /**
   * Extract function name from function definition node
   */
  private extractFunctionName(node: ASTNode): string | null {
    try {
      if (node.type === "function_definition") {
        const identifierNode = node.findChildren("identifier")[0];
        return identifierNode ? identifierNode.text : null;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Find the parent function definition node if this node is inside a function
   */
  private findParentFunction(node: ASTNode): ASTNode | null {
    let current = node.parent;
    while (current) {
      if (current.type === "function_definition") {
        return current;
      }
      current = current.parent;
    }
    return null;
  }
}
