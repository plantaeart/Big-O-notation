/**
 * Generic AST Node interface for Tree-sitter nodes
 */
export interface ASTNode {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children: ASTNode[];
  parent?: ASTNode;

  // Tree-sitter specific methods
  child(index: number): ASTNode | null;
  childCount: number;
  namedChild(index: number): ASTNode | null;
  namedChildCount: number;
  firstChild: ASTNode | null;
  lastChild: ASTNode | null;
  nextSibling: ASTNode | null;
  previousSibling: ASTNode | null;

  // Helper methods for complexity analysis
  hasChild(type: string): boolean;
  findChildren(type: string): ASTNode[];
  findChildrenByTypes(types: string[]): ASTNode[];
  getChildrenText(): string[];
}

/**
 * Function-specific AST node with complexity metadata
 */
export interface FunctionNode extends ASTNode {
  functionName: string;
  parameters: string[];
  isAsync: boolean;
  bodyNode: ASTNode;
  startLine: number;
  endLine: number;
}

/**
 * Loop-specific AST node for complexity analysis
 */
export interface LoopNode extends ASTNode {
  loopType: "for" | "while";
  iteratorVariable?: string;
  iterableExpression?: string;
  conditionExpression?: string;
  bodyNode: ASTNode;
  nestedLoops: LoopNode[];
}

/**
 * Call expression node for function call analysis
 */
export interface CallNode extends ASTNode {
  functionName: string;
  arguments: ASTNode[];
  isBuiltinFunction: boolean;
}

/**
 * Binary operation node for mathematical analysis
 */
export interface BinaryOpNode extends ASTNode {
  operator: string;
  leftOperand: ASTNode;
  rightOperand: ASTNode;
}
