// Type definitions for Big-O notation analysis

export interface ComplexityResult {
  notation: string;
  description: string;
  confidence: number;
}

export interface SpaceComplexityResult {
  notation: string;
  description: string;
  confidence: number;
  dataStructures: string[];
}

export interface MethodAnalysis {
  name: string;
  lineStart: number;
  lineEnd: number;
  complexity: ComplexityResult;
  spaceComplexity: SpaceComplexityResult;
  explanation: string;
}

export interface LoopNestingResult {
  maxNesting: number;
  totalLoops: number;
}

export interface RecursionAnalysisResult {
  hasRecursion: boolean;
  recursiveCalls: number;
  functionName: string;
}

export interface AlgorithmicPatterns {
  isBinarySearch: boolean;
  isDivideByHalf: boolean;
  isSorting: boolean;
  isFactorial: boolean;
  isHashAccess: boolean;
  isDirectAccess: boolean;
  isPermutations: boolean;
  isPowerSet: boolean;
  isBuiltinSort: boolean;
  hasExponentialLoop: boolean;
}

export interface NestedFunctionAnalysis {
  hasNestedFunctions: boolean;
  hasFactorialPattern: boolean;
  maxNestedComplexity: string;
}

export interface BuiltinFunctionAnalysis {
  isLinear: boolean;
  isLogarithmic: boolean;
  hasComplexBuiltins: boolean;
}

export interface NestedFunctionCallsAnalysis {
  hasHighComplexityCalls: boolean;
  maxNestedComplexity: string;
  nestedCallTypes: string[];
}
