/**
 * AST Utility Functions
 * Shared utility functions for AST analysis and traversal
 */

import Parser from "tree-sitter";
import { AST_NODE_TYPES } from "../../constants/ASTNodeTypes";

/**
 * Traverses AST nodes using depth-first search
 * @param node - Root node to start traversal
 * @param visitor - Function called for each node
 */
export function traverseAST(
  node: Parser.SyntaxNode,
  visitor: (node: Parser.SyntaxNode) => void | boolean
): void {
  const shouldContinue = visitor(node);

  // If visitor returns false, stop traversing this branch
  if (shouldContinue === false) {
    return;
  }

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) {
      traverseAST(child, visitor);
    }
  }
}

/**
 * Finds all nodes of specific types in the AST
 * @param node - Root node to search
 * @param nodeTypes - Array of node types to find
 * @returns Array of matching nodes
 */
export function findNodesByType(
  node: Parser.SyntaxNode,
  nodeTypes: string[]
): Parser.SyntaxNode[] {
  const foundNodes: Parser.SyntaxNode[] = [];

  traverseAST(node, (currentNode) => {
    if (nodeTypes.includes(currentNode.type)) {
      foundNodes.push(currentNode);
    }
  });

  return foundNodes;
}

/**
 * Gets all function definition nodes from AST
 * @param rootNode - Root AST node
 * @returns Array of function definition nodes
 */
export function getFunctionNodes(
  rootNode: Parser.SyntaxNode
): Parser.SyntaxNode[] {
  return findNodesByType(rootNode, [AST_NODE_TYPES.FUNCTION_DEFINITION]);
}

/**
 * Finds all loop nodes (for and while loops)
 * @param node - Root node to search
 * @returns Array of loop nodes
 */
export function getLoopNodes(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
  return findNodesByType(node, [
    AST_NODE_TYPES.FOR_STATEMENT,
    AST_NODE_TYPES.WHILE_STATEMENT,
  ]);
}

/**
 * Finds all comprehension nodes
 * @param node - Root node to search
 * @returns Array of comprehension nodes
 */
export function getComprehensionNodes(
  node: Parser.SyntaxNode
): Parser.SyntaxNode[] {
  return findNodesByType(node, [
    AST_NODE_TYPES.LIST_COMPREHENSION,
    AST_NODE_TYPES.SET_COMPREHENSION,
    AST_NODE_TYPES.DICTIONARY_COMPREHENSION,
    AST_NODE_TYPES.GENERATOR_EXPRESSION,
  ]);
}

/**
 * Counts direct children of a specific type
 * @param node - Parent node
 * @param childType - Type of children to count
 * @returns Count of direct children of specified type
 */
export function countDirectChildren(
  node: Parser.SyntaxNode,
  childType: string
): number {
  let count = 0;
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && child.type === childType) {
      count++;
    }
  }
  return count;
}

/**
 * Checks if a node contains any recursive function calls
 * @param node - Node to analyze
 * @param functionName - Name of the function to check for recursion
 * @returns True if recursive calls are found
 */
export function hasRecursiveCalls(
  node: Parser.SyntaxNode,
  functionName: string
): boolean {
  let hasRecursion = false;

  traverseAST(node, (currentNode) => {
    if (
      currentNode.type === AST_NODE_TYPES.CALL &&
      currentNode.firstChild?.text === functionName
    ) {
      hasRecursion = true;
      return false; // Stop traversal
    }
  });

  return hasRecursion;
}

/**
 * Gets the text content of a node, handling null cases
 * @param node - Node to get text from
 * @returns Text content or empty string if null
 */
export function getNodeText(node: Parser.SyntaxNode | null): string {
  return node?.text || "";
}

/**
 * Checks if a node represents a mathematical operation
 * @param node - Node to check
 * @returns True if node is a mathematical operation
 */
export function isMathOperation(node: Parser.SyntaxNode): boolean {
  const mathOperators = [
    AST_NODE_TYPES.BINARY_OPERATOR,
    "unary_operator",
    "augmented_assignment",
  ];

  return mathOperators.includes(node.type);
}

/**
 * Finds nodes with specific text content
 * @param rootNode - Root node to search
 * @param textPattern - Text pattern to match (can be string or regex)
 * @returns Array of nodes with matching text
 */
export function findNodesByText(
  rootNode: Parser.SyntaxNode,
  textPattern: string | RegExp
): Parser.SyntaxNode[] {
  const foundNodes: Parser.SyntaxNode[] = [];

  traverseAST(rootNode, (node) => {
    const nodeText = node.text;
    const matches =
      typeof textPattern === "string"
        ? nodeText.includes(textPattern)
        : textPattern.test(nodeText);

    if (matches) {
      foundNodes.push(node);
    }
  });

  return foundNodes;
}

/**
 * Checks if a loop is nested within another loop
 * @param loopNode - Loop node to check
 * @param rootNode - Root node to search for parent loops
 * @returns True if the loop is nested
 */
export function isNestedLoop(
  loopNode: Parser.SyntaxNode,
  rootNode: Parser.SyntaxNode
): boolean {
  let currentNode = loopNode.parent;

  while (currentNode && currentNode !== rootNode) {
    if (
      currentNode.type === AST_NODE_TYPES.FOR_STATEMENT ||
      currentNode.type === AST_NODE_TYPES.WHILE_STATEMENT
    ) {
      return true;
    }
    currentNode = currentNode.parent;
  }

  return false;
}

/**
 * Gets nesting depth of loops
 * @param node - Node to analyze
 * @returns Maximum nesting depth of loops
 */
export function getLoopNestingDepth(node: Parser.SyntaxNode): number {
  let maxDepth = 0;

  function calculateDepth(
    currentNode: Parser.SyntaxNode,
    currentDepth: number
  ): void {
    if (
      currentNode.type === AST_NODE_TYPES.FOR_STATEMENT ||
      currentNode.type === AST_NODE_TYPES.WHILE_STATEMENT
    ) {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    }

    for (let i = 0; i < currentNode.childCount; i++) {
      const child = currentNode.child(i);
      if (child) {
        calculateDepth(child, currentDepth);
      }
    }
  }

  calculateDepth(node, 0);
  return maxDepth;
}

/**
 * Checks if a node is within a function definition
 * @param node - Node to check
 * @returns True if node is inside a function
 */
export function isWithinFunction(node: Parser.SyntaxNode): boolean {
  let currentNode = node.parent;

  while (currentNode) {
    if (currentNode.type === AST_NODE_TYPES.FUNCTION_DEFINITION) {
      return true;
    }
    currentNode = currentNode.parent;
  }

  return false;
}
