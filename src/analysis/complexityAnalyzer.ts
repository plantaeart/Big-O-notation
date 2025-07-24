import { ASTTimeComplexityAnalyzer } from "../ast/ASTTimeComplexityAnalyzer";
import { ComplexityAnalysisResult } from "../models/ComplexityAnalysisResult.model";

// AST-based complexity analyzer instance
const astAnalyzer = new ASTTimeComplexityAnalyzer();

/**
 * Main function to analyze code complexity using AST parsing
 * This replaces the previous regex-based implementation
 */
export function analyzeCodeComplexity(code: string): ComplexityAnalysisResult {
  return astAnalyzer.analyzeCodeComplexity(code);
}
