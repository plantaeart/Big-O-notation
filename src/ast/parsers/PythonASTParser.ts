import Parser from "tree-sitter";
import { ASTNode, FunctionNode, LoopNode, CallNode } from "../models/ASTNode";
import { PYTHON_METADATA } from "../models/LanguageMetadata";

// Import Python language
const Python = require("tree-sitter-python");

/**
 * Tree-sitter based Python AST parser
 */
export class PythonASTParser {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(Python);
  }

  /**
   * Parse Python code into AST
   */
  parse(code: string): ASTNode {
    const tree = this.parser.parse(code);
    return this.wrapNode(tree.rootNode);
  }

  /**
   * Extract all function definitions from AST
   */
  getFunctionNodes(ast: ASTNode): FunctionNode[] {
    const functions: FunctionNode[] = [];
    this.traverseForFunctions(ast, functions);
    return functions;
  }

  /**
   * Extract all loop nodes from AST
   */
  getLoopNodes(ast: ASTNode): LoopNode[] {
    const loops: LoopNode[] = [];
    this.traverseForLoops(ast, loops);
    return loops;
  }

  /**
   * Extract all function call nodes from AST
   */
  getCallNodes(ast: ASTNode): CallNode[] {
    const calls: CallNode[] = [];
    this.traverseForCalls(ast, calls);
    return calls;
  }

  /**
   * Wrap Tree-sitter node with our interface with depth limit to prevent infinite recursion
   */
  private wrapNode(
    node: any,
    depth: number = 0,
    maxDepth: number = 100
  ): ASTNode {
    // Prevent infinite recursion with depth limit
    if (depth > maxDepth) {
      return {
        type: node.type,
        text: node.text.substring(0, 100) + "...", // Truncate text for deep nodes
        startPosition: node.startPosition,
        endPosition: node.endPosition,
        children: [],
        child: () => null,
        childCount: 0,
        namedChild: () => null,
        namedChildCount: 0,
        firstChild: null,
        lastChild: null,
        nextSibling: null,
        previousSibling: null,
        hasChild: () => false,
        findChildren: () => [],
        findChildrenByTypes: () => [],
        getChildrenText: () => [],
      };
    }

    const wrapped: ASTNode = {
      type: node.type,
      text: node.text,
      startPosition: node.startPosition,
      endPosition: node.endPosition,
      children: [], // Will be populated below
      child: (index: number) => null, // Simplified - not used in our analysis
      childCount: node.childCount,
      namedChild: (index: number) => null, // Simplified - not used in our analysis
      namedChildCount: node.namedChildCount,
      firstChild: null, // Simplified - not used in our analysis
      lastChild: null, // Simplified - not used in our analysis
      nextSibling: null, // Simplified - not used in our analysis
      previousSibling: null, // Simplified - not used in our analysis

      // Helper methods
      hasChild: (type: string) => this.hasChildOfType(node, type),
      findChildren: (type: string) => this.findChildrenOfType(node, type),
      findChildrenByTypes: (types: string[]) =>
        this.findChildrenOfTypes(node, types),
      getChildrenText: () => {
        const children = [];
        for (let i = 0; i < node.namedChildCount; i++) {
          const child = node.namedChild(i);
          if (child) {
            children.push(child.text);
          }
        }
        return children;
      },
    };

    // Populate children using namedChildren from Tree-sitter with depth control
    const children = [];
    const maxChildren = Math.min(node.namedChildCount, 50); // Limit children to prevent memory issues
    for (let i = 0; i < maxChildren; i++) {
      const child = node.namedChild(i);
      if (child) {
        // Recursively wrap children with incremented depth
        children.push(this.wrapNode(child, depth + 1, maxDepth));
      }
    }
    wrapped.children = children;

    return wrapped;
  }

  /**
   * Traverse AST to find function definitions
   */
  private traverseForFunctions(node: ASTNode, functions: FunctionNode[]): void {
    if (node.type === "function_definition") {
      const functionNode = this.createFunctionNode(node);
      if (functionNode) {
        functions.push(functionNode);
      }
    }

    node.children.forEach((child) =>
      this.traverseForFunctions(child, functions)
    );
  }

  /**
   * Traverse AST to find loop nodes
   */
  private traverseForLoops(node: ASTNode, loops: LoopNode[]): void {
    if (node.type === "for_statement" || node.type === "while_statement") {
      const loopNode = this.createLoopNode(node);
      if (loopNode) {
        loops.push(loopNode);
      }
    }

    node.children.forEach((child) => this.traverseForLoops(child, loops));
  }

  /**
   * Traverse AST to find function calls
   */
  private traverseForCalls(node: ASTNode, calls: CallNode[]): void {
    if (node.type === "call") {
      const callNode = this.createCallNode(node);
      if (callNode) {
        calls.push(callNode);
      }
    }

    node.children.forEach((child) => this.traverseForCalls(child, calls));
  }

  /**
   * Create FunctionNode from AST node
   */
  private createFunctionNode(node: ASTNode): FunctionNode | null {
    const nameNode = node.findChildren("identifier")[0];
    const parametersNode = node.findChildren("parameters")[0];
    const bodyNode = node.findChildren("block")[0];

    if (!nameNode || !bodyNode) {
      return null;
    }

    const functionName = nameNode.text;
    const parameters = this.extractParameters(parametersNode);
    const isAsync = node.text.startsWith("async");

    return {
      ...node,
      functionName,
      parameters,
      isAsync,
      bodyNode,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
    } as FunctionNode;
  }

  /**
   * Create LoopNode from AST node
   */
  private createLoopNode(node: ASTNode): LoopNode | null {
    const loopType = node.type === "for_statement" ? "for" : "while";
    const bodyNode = node.findChildren("block")[0];

    if (!bodyNode) {
      return null;
    }

    let iteratorVariable: string | undefined;
    let iterableExpression: string | undefined;
    let conditionExpression: string | undefined;

    if (loopType === "for") {
      const leftNode = node.findChildren("pattern")[0];
      const rightNode = node.findChildren("expression")[0];
      iteratorVariable = leftNode?.text;
      iterableExpression = rightNode?.text;
    } else {
      const conditionNode = node.findChildren("expression")[0];
      conditionExpression = conditionNode?.text;
    }

    // Find nested loops
    const nestedLoops: LoopNode[] = [];
    this.traverseForLoops(bodyNode, nestedLoops);

    return {
      ...node,
      loopType,
      iteratorVariable,
      iterableExpression,
      conditionExpression,
      bodyNode,
      nestedLoops,
    } as LoopNode;
  }

  /**
   * Create CallNode from AST node
   */
  private createCallNode(node: ASTNode): CallNode | null {
    const functionNode =
      node.findChildren("identifier")[0] || node.findChildren("attribute")[0];

    if (!functionNode) {
      return null;
    }

    const functionName = this.extractFunctionName(functionNode);
    const argumentsNode = node.findChildren("argument_list")[0];
    const args = argumentsNode
      ? argumentsNode.children.filter(
          (child) =>
            child.type !== "," && child.type !== "(" && child.type !== ")"
        )
      : [];

    const isBuiltinFunction = this.isBuiltinFunction(functionName);

    return {
      ...node,
      functionName,
      arguments: args,
      isBuiltinFunction,
    } as CallNode;
  }

  /**
   * Extract function parameters
   */
  private extractParameters(parametersNode: ASTNode | undefined): string[] {
    if (!parametersNode) {
      return [];
    }

    return parametersNode.children
      .filter((child) => child.type === "identifier")
      .map((child) => child.text);
  }

  /**
   * Extract function name from call node
   */
  private extractFunctionName(node: ASTNode): string {
    if (node.type === "identifier") {
      return node.text;
    } else if (node.type === "attribute") {
      const objectNode = node.findChildren("identifier")[0];
      const attributeNode = node.findChildren("identifier")[1];
      return attributeNode ? attributeNode.text : node.text;
    }
    return node.text;
  }

  /**
   * Check if function is a Python builtin
   */
  private isBuiltinFunction(functionName: string): boolean {
    const allBuiltins = [
      ...PYTHON_METADATA.builtinFunctions.constant,
      ...PYTHON_METADATA.builtinFunctions.linear,
      ...PYTHON_METADATA.builtinFunctions.logarithmic,
      ...PYTHON_METADATA.builtinFunctions.quadratic,
      ...PYTHON_METADATA.builtinFunctions.sorting,
    ];
    return allBuiltins.includes(functionName);
  }

  /**
   * Helper method to check if node has child of specific type
   */
  private hasChildOfType(node: any, type: string): boolean {
    return node.children.some((child: any) => child.type === type);
  }

  /**
   * Helper method to find children of specific type
   */
  private findChildrenOfType(node: any, type: string): ASTNode[] {
    return node.children
      .filter((child: any) => child.type === type)
      .map((child: any) => this.wrapNode(child));
  }

  /**
   * Helper method to find children of multiple types
   */
  private findChildrenOfTypes(node: any, types: string[]): ASTNode[] {
    return node.children
      .filter((child: any) => types.includes(child.type))
      .map((child: any) => this.wrapNode(child));
  }
}
