import { PythonASTParser } from "./parsers/PythonASTParser";
import { ASTNode, FunctionNode } from "./models/ASTNode";
import { SpaceComplexityResult } from "../models/SpaceComplexityResult.model";
import { TimeComplexityNotation } from "../constants/timeComplexityNotationsConst";
import { compareComplexityPriority } from "../utils/timeComplexityComparatorUtils";
import { getSpaceComplexityDescription } from "../utils/spaceComplexityUtils";

/**
 * AST-based space complexity visitor for Python code
 */
export class SpaceComplexityVisitor {
  private dataStructures: string[] = [];
  private maxSpaceComplexity: string = TimeComplexityNotation.CONSTANT;
  private confidence: number = 80;

  // Track variables that are created as empty and then populated in loops
  private emptyListVariables: Set<string> = new Set();
  private inLoop: boolean = false;
  private currentFunction: string | null = null;

  /**
   * Analyze space complexity of a function node
   */
  analyzeFunctionSpaceComplexity(
    functionNode: FunctionNode
  ): SpaceComplexityResult {
    this.reset();
    this.currentFunction = functionNode.functionName;

    // Analyze the function body
    this.analyzeNodeSpaceComplexity(functionNode.bodyNode);

    return {
      notation: this.maxSpaceComplexity,
      description: getSpaceComplexityDescription(this.maxSpaceComplexity),
      confidence: Math.min(100, this.confidence),
      dataStructures: [...new Set(this.dataStructures)], // Remove duplicates
    };
  }

  /**
   * Reset analyzer state for new analysis
   */
  private reset(): void {
    this.dataStructures = [];
    this.maxSpaceComplexity = TimeComplexityNotation.CONSTANT;
    this.confidence = 80;
    this.emptyListVariables.clear();
    this.inLoop = false;
    this.currentFunction = null;
  }

  /**
   * Analyze space complexity of any AST node
   */
  private analyzeNodeSpaceComplexity(node: ASTNode): void {
    if (!node || !node.type) {
      return;
    }

    // Handle different node types
    switch (node.type) {
      case "block":
      case "suite":
        this.analyzeBlockSpaceComplexity(node);
        break;
      case "for_statement":
      case "while_statement":
        this.analyzeLoopSpaceComplexity(node);
        break;
      case "assignment":
        this.analyzeAssignmentSpaceComplexity(node);
        break;
      case "call":
        this.analyzeCallSpaceComplexity(node);
        break;
      case "list":
      case "dict":
      case "set":
        this.analyzeDataStructureCreation(node);
        break;
      case "attribute":
        this.analyzeAttributeSpaceComplexity(node);
        break;
      default:
        // Recursively analyze children
        this.analyzeChildrenSpaceComplexity(node);
        break;
    }
  }

  /**
   * Analyze block space complexity
   */
  private analyzeBlockSpaceComplexity(node: ASTNode): void {
    const wasInLoop = this.inLoop;

    // Analyze all children
    for (const child of node.children) {
      this.analyzeNodeSpaceComplexity(child);
    }

    // Restore loop state
    this.inLoop = wasInLoop;
  }

  /**
   * Analyze loop space complexity
   */
  private analyzeLoopSpaceComplexity(node: ASTNode): void {
    const wasInLoop = this.inLoop;
    this.inLoop = true;

    // Analyze loop body
    this.analyzeChildrenSpaceComplexity(node);

    this.inLoop = wasInLoop;
  }

  /**
   * Analyze assignment space complexity
   */
  private analyzeAssignmentSpaceComplexity(node: ASTNode): void {
    // Get left and right sides of assignment
    const children = node.children;
    if (children.length < 2) {
      this.analyzeChildrenSpaceComplexity(node);
      return;
    }

    const leftSide = children[0]; // Variable being assigned
    const rightSide = children[1]; // Value being assigned

    // Check for empty list creation: var = []
    if (this.isEmptyListCreation(rightSide)) {
      const varName = leftSide.text.trim();
      this.emptyListVariables.add(varName);
    }

    // Check for data structure creation
    this.analyzeDataStructureAssignment(leftSide, rightSide);

    // Analyze children recursively
    this.analyzeChildrenSpaceComplexity(node);
  }

  /**
   * Analyze function call space complexity
   */
  private analyzeCallSpaceComplexity(node: ASTNode): void {
    const functionName = this.extractFunctionName(node);

    // Check for recursive calls (stack space)
    if (functionName === this.currentFunction) {
      this.updateMaxSpaceComplexity(TimeComplexityNotation.LINEAR);
      this.dataStructures.push("recursion stack");
    }

    // Check for append operations on tracked variables
    if (this.inLoop && this.isAppendOperation(node)) {
      const varName = this.extractAppendVariable(node);
      if (varName && this.emptyListVariables.has(varName)) {
        this.updateMaxSpaceComplexity(TimeComplexityNotation.LINEAR);
        this.dataStructures.push("dynamic list growth");
      }
    }

    // Analyze children
    this.analyzeChildrenSpaceComplexity(node);
  }

  /**
   * Analyze data structure creation
   */
  private analyzeDataStructureCreation(node: ASTNode): void {
    switch (node.type) {
      case "list":
        this.analyzeListCreation(node);
        break;
      case "dict":
        this.dataStructures.push("dictionary");
        this.updateMaxSpaceComplexity(TimeComplexityNotation.LINEAR);
        break;
      case "set":
        this.dataStructures.push("set");
        this.updateMaxSpaceComplexity(TimeComplexityNotation.LINEAR);
        break;
    }

    this.analyzeChildrenSpaceComplexity(node);
  }

  /**
   * Analyze list creation space complexity
   */
  private analyzeListCreation(node: ASTNode): void {
    // Check if it's a list comprehension or has elements
    if (node.children && node.children.length > 0) {
      // Non-empty list creation
      this.dataStructures.push("list");
      this.updateMaxSpaceComplexity(TimeComplexityNotation.LINEAR);
    }
  }

  /**
   * Analyze attribute access for space complexity patterns
   */
  private analyzeAttributeSpaceComplexity(node: ASTNode): void {
    // Check for in-place operations that don't increase space
    if (this.isInPlaceOperation(node)) {
      this.confidence += 10;
    }

    this.analyzeChildrenSpaceComplexity(node);
  }

  /**
   * Check if a node represents empty list creation
   */
  private isEmptyListCreation(node: ASTNode): boolean {
    return (
      node.type === "list" && (!node.children || node.children.length === 0)
    );
  }

  /**
   * Check if a call is an append operation
   */
  private isAppendOperation(node: ASTNode): boolean {
    // Look for pattern: variable.append(...)
    const children = node.children;
    if (children.length < 1) {
      return false;
    }

    const functionPart = children[0];
    return (
      functionPart.type === "attribute" && functionPart.text.includes(".append")
    );
  }

  /**
   * Extract variable name from append operation
   */
  private extractAppendVariable(node: ASTNode): string | null {
    const children = node.children;
    if (children.length < 1) {
      return null;
    }

    const functionPart = children[0];
    if (functionPart.type === "attribute") {
      // Get the object part before .append
      const parts = functionPart.text.split(".");
      return parts[0]?.trim() || null;
    }
    return null;
  }

  /**
   * Extract function name from call node
   */
  private extractFunctionName(node: ASTNode): string | null {
    const children = node.children;
    if (children.length < 1) {
      return null;
    }

    const functionPart = children[0];
    if (functionPart.type === "identifier") {
      return functionPart.text.trim();
    }
    return null;
  }

  /**
   * Check if operation is in-place
   */
  private isInPlaceOperation(node: ASTNode): boolean {
    const text = node.text;
    return /\.(sort|reverse|clear|pop|remove)\s*\(/.test(text);
  }

  /**
   * Analyze data structure assignment patterns
   */
  private analyzeDataStructureAssignment(
    leftSide: ASTNode,
    rightSide: ASTNode
  ): void {
    // Check for various data structure creation patterns
    if (rightSide.type === "list" || rightSide.text.includes("[")) {
      this.dataStructures.push("list");
      if (!this.isEmptyListCreation(rightSide)) {
        this.updateMaxSpaceComplexity(TimeComplexityNotation.LINEAR);
      }
    } else if (rightSide.type === "dict" || rightSide.text.includes("{")) {
      this.dataStructures.push("dictionary");
      this.updateMaxSpaceComplexity(TimeComplexityNotation.LINEAR);
    } else if (rightSide.type === "set" || rightSide.text.includes("set(")) {
      this.dataStructures.push("set");
      this.updateMaxSpaceComplexity(TimeComplexityNotation.LINEAR);
    }
  }

  /**
   * Analyze children space complexity
   */
  private analyzeChildrenSpaceComplexity(node: ASTNode): void {
    for (const child of node.children) {
      this.analyzeNodeSpaceComplexity(child);
    }
  }

  /**
   * Update maximum space complexity if new complexity is higher
   */
  private updateMaxSpaceComplexity(newComplexity: string): void {
    if (compareComplexityPriority(newComplexity, this.maxSpaceComplexity) > 0) {
      this.maxSpaceComplexity = newComplexity;
    }
  }
}

/**
 * AST-based space complexity analyzer for Python code
 */
export class ASTSpaceComplexityAnalyzer {
  private parser: PythonASTParser;
  private visitor: SpaceComplexityVisitor;

  constructor() {
    this.parser = new PythonASTParser();
    this.visitor = new SpaceComplexityVisitor();
  }

  /**
   * Analyze space complexity of Python code using pure AST
   */
  analyzeCodeSpaceComplexity(code: string): SpaceComplexityResult {
    try {
      // Parse code into AST
      const ast = this.parser.parse(code);

      // Extract function nodes
      const functionNodes = this.parser.getFunctionNodes(ast);

      if (functionNodes.length === 0) {
        // No functions found, return default
        return {
          notation: TimeComplexityNotation.CONSTANT,
          description: getSpaceComplexityDescription(
            TimeComplexityNotation.CONSTANT
          ),
          confidence: 60,
          dataStructures: [],
        };
      }

      // For now, analyze the first function
      // TODO: Support multiple function analysis
      const firstFunction = functionNodes[0];
      return this.visitor.analyzeFunctionSpaceComplexity(firstFunction);
    } catch (error) {
      console.error("Error analyzing space complexity with AST:", error);

      // Return default result instead of fallback
      return {
        notation: TimeComplexityNotation.CONSTANT,
        description: getSpaceComplexityDescription(
          TimeComplexityNotation.CONSTANT
        ),
        confidence: 30,
        dataStructures: ["error: AST parsing failed"],
      };
    }
  }
}
