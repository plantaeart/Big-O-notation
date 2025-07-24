// NEW AST-MANAGER ARCHITECTURE
import { ASTTimeComplexityAnalyzer } from "../ast-manager/ASTTimeComplexityAnalyzer";
import { ComplexityAnalysisResult } from "../models/ComplexityAnalysisResult.model";

// AST-based time complexity analyzer
const astAnalyzer = new ASTTimeComplexityAnalyzer();

/**
 * Main function to analyze code complexity using NEW AST-manager architecture
 * This replaces the previous AST implementation with the new time-complexity detectors
 */
export function analyzeCodeComplexity(code: string): ComplexityAnalysisResult {
  return astAnalyzer.analyzeCodeTimeComplexity(code);
}
