import { SyntaxNode } from "tree-sitter";

export interface ComplexityNode {
  funcName: string;
  hasParent: boolean;
  hasChild: boolean;
  parent: ComplexityNode | null;
  children: ComplexityNode[];
  timeNotation: string | null;
  spaceNotation: string | null;
  astNode: SyntaxNode;
  // Analysis metadata
  forLoopCount: number;
  whileLoopCount: number;
  isNested: boolean;
  recursiveCallCount: number;
  keywords: string[];
  depth: number;
  confidence: number;
}

export interface ComplexityPattern {
  notation: string;
  confidence: number;
  patterns: string[];
  reasons: string[];
}

export interface ComplexityAnalysisContext {
  node: ComplexityNode;
  ancestorComplexities: string[];
  siblingComplexities: string[];
  globalKeywords: Set<string>;
}
