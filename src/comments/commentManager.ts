import * as vscode from "vscode";
import {
  getComplexityIndicator,
  getSpaceComplexityIndicator,
} from "../utils/complexityHelperUtils";
import { MethodAnalysis } from "../models/MethodAnalysis.model";

// Helper function to get indentation from a line
export function getIndentFromLine(lineText: string): string {
  const match = lineText.match(/^(\s*)/);
  return match ? match[1] : "";
}

// Add Big-O comments to the code
export async function addBigOComments(
  editor: vscode.TextEditor,
  methods: MethodAnalysis[]
): Promise<void> {
  const document = editor.document;
  const edits: vscode.TextEdit[] = [];

  for (const method of methods) {
    const lineStart = method.lineStart;
    const line = document.lineAt(lineStart);
    const lineText = line.text;
    const indent = getIndentFromLine(lineText);

    // Check if Big-O comment already exists above the function
    const prevLineIndex = lineStart - 1;
    let hasExistingComment = false;
    let commentLineIndex = prevLineIndex;

    if (prevLineIndex >= 0) {
      const prevLine = document.lineAt(prevLineIndex);
      const trimmedLine = prevLine.text.trim();

      // Check for various Big-O comment patterns
      if (
        trimmedLine.startsWith("# Big-O:") ||
        trimmedLine.startsWith("# Time:") ||
        (trimmedLine.includes("Time:") && trimmedLine.includes("Space:")) ||
        /^#.*O\([^)]*\)/.test(trimmedLine) ||
        /^#\s*(EXCELLENT|GOOD|FAIR|POOR|BAD|TERRIBLE|UNKNOWN)/.test(trimmedLine)
      ) {
        hasExistingComment = true;
        commentLineIndex = prevLineIndex;
      }
    }

    // Create the Big-O comment with text indicators
    const timeIndicator = getComplexityIndicator(method.complexity.notation);
    const spaceIndicator = getSpaceComplexityIndicator(
      method.spaceComplexity.notation
    );

    // Debug logging to check indicator generation
    console.log(`Generating comment for ${method.name}:`);
    console.log(
      `  Time complexity: ${method.complexity.notation} -> ${timeIndicator}`
    );
    console.log(
      `  Space complexity: ${method.spaceComplexity.notation} -> ${spaceIndicator}`
    );

    // Create comment with text indicators
    const bigOComment = `${indent}# ${timeIndicator} Time: ${method.complexity.notation} | ${spaceIndicator} Space: ${method.spaceComplexity.notation}`;

    console.log(`  Generated comment: ${bigOComment}`);

    if (hasExistingComment) {
      // Replace existing comment
      const commentLine = document.lineAt(commentLineIndex);
      const range = new vscode.Range(
        new vscode.Position(commentLineIndex, 0),
        new vscode.Position(commentLineIndex, commentLine.text.length)
      );

      edits.push(vscode.TextEdit.replace(range, bigOComment));
    } else {
      // Add new comment before function definition
      const position = new vscode.Position(lineStart, 0);
      edits.push(vscode.TextEdit.insert(position, bigOComment + "\n"));
    }
  }

  if (edits.length > 0) {
    const workspaceEdit = new vscode.WorkspaceEdit();
    workspaceEdit.set(document.uri, edits);

    // Apply the edit
    const success = await vscode.workspace.applyEdit(workspaceEdit);

    if (!success) {
      console.error("Failed to apply Big-O comment edits");
      vscode.window.showErrorMessage("Failed to update Big-O comments");
    } else {
      console.log("Successfully applied Big-O comment edits");
    }
  }
}
