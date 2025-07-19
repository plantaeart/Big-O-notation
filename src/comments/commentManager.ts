import * as vscode from "vscode";
import { MethodAnalysis } from "../types";
import {
  getComplexityEmoji,
  getSpaceComplexityEmoji,
} from "../utils/complexityHelper";

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
        /^#\s*[\u{1F7E2}\u{1F7E1}\u{1F7E0}\u{1F534}\u{1F7E3}\u{26AB}\u{26AA}]/u.test(
          trimmedLine
        ) || // Unicode emoji patterns
        /^#.*O\([^)]*\)/.test(trimmedLine)
      ) {
        hasExistingComment = true;
        commentLineIndex = prevLineIndex;
      }
    }

    // Create the Big-O comment with emojis
    const timeEmoji = getComplexityEmoji(method.complexity.notation);
    const spaceEmoji = getSpaceComplexityEmoji(method.spaceComplexity.notation);

    // Debug logging to check emoji generation
    console.log(`Generating comment for ${method.name}:`);
    console.log(
      `  Time complexity: ${method.complexity.notation} -> ${timeEmoji}`
    );
    console.log(
      `  Space complexity: ${method.spaceComplexity.notation} -> ${spaceEmoji}`
    );

    // Create comment with emojis
    const bigOComment = `${indent}# ${timeEmoji} Time: ${method.complexity.notation} | ${spaceEmoji} Space: ${method.spaceComplexity.notation}`;

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
