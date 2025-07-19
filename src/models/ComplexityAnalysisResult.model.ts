import { MethodAnalysis } from "./MethodAnalysis.model";

export interface ComplexityAnalysisResult {
  methods: MethodAnalysis[];
  hierarchy: Map<string, string[]>; // parent -> children mapping
  fileName?: string;
}
