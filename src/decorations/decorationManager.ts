import * as vscode from "vscode";
import {
  excellentDecorationType,
  goodDecorationType,
  fairDecorationType,
  poorDecorationType,
  badDecorationType,
  terribleDecorationType,
} from "./textDecorations";
import { COMPLEXITY_INDICATOR } from "../constants/complexityIndicatorsConst";
import { getMatchDecorationType } from "../utils/complexityIndicatorUtils";
import {
  getComplexityIndicator,
  getSpaceComplexityIndicator,
} from "../utils/complexityHelperUtils";
import { getIndentFromLine } from "../utils/codeParserUtils";
import { MethodAnalysis } from "../models/MethodAnalysis.model";

// Apply color decorations to complexity indicators
export function applyComplexityDecorations(editor: vscode.TextEditor): void {
  const document = editor.document;

  // Clear existing decorations
  editor.setDecorations(excellentDecorationType, []);
  editor.setDecorations(goodDecorationType, []);
  editor.setDecorations(fairDecorationType, []);
  editor.setDecorations(poorDecorationType, []);
  editor.setDecorations(badDecorationType, []);
  editor.setDecorations(terribleDecorationType, []);

  const excellentRanges: vscode.Range[] = [];
  const goodRanges: vscode.Range[] = [];
  const fairRanges: vscode.Range[] = [];
  const poorRanges: vscode.Range[] = [];
  const badRanges: vscode.Range[] = [];
  const terribleRanges: vscode.Range[] = [];

  // Find complexity indicators in comments
  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    const text = line.text;

    // Look for complexity indicators in comments
    if (text.trim().startsWith("#") && text.includes("Time:")) {
      const excellentMatch = getMatchDecorationType(
        text,
        COMPLEXITY_INDICATOR.EXCELLENT
      );
      const goodMatch = getMatchDecorationType(text, COMPLEXITY_INDICATOR.GOOD);
      const fairMatch = getMatchDecorationType(text, COMPLEXITY_INDICATOR.FAIR);
      const poorMatch = getMatchDecorationType(text, COMPLEXITY_INDICATOR.POOR);
      const badMatch = getMatchDecorationType(text, COMPLEXITY_INDICATOR.BAD);
      const terribleMatch = getMatchDecorationType(
        text,
        COMPLEXITY_INDICATOR.TERRIBLE
      );

      if (excellentMatch) {
        let startIndex = 0;
        excellentMatch.forEach(() => {
          const index = text.indexOf(
            COMPLEXITY_INDICATOR.EXCELLENT,
            startIndex
          );
          if (index !== -1) {
            const range = new vscode.Range(
              new vscode.Position(i, index),
              new vscode.Position(
                i,
                index + COMPLEXITY_INDICATOR.EXCELLENT.length
              )
            );
            excellentRanges.push(range);
            startIndex = index + COMPLEXITY_INDICATOR.EXCELLENT.length;
          }
        });
      }

      if (goodMatch) {
        let startIndex = 0;
        goodMatch.forEach(() => {
          const index = text.indexOf(COMPLEXITY_INDICATOR.GOOD, startIndex);
          if (index !== -1) {
            const range = new vscode.Range(
              new vscode.Position(i, index),
              new vscode.Position(i, index + COMPLEXITY_INDICATOR.GOOD.length)
            );
            goodRanges.push(range);
            startIndex = index + COMPLEXITY_INDICATOR.GOOD.length;
          }
        });
      }

      if (fairMatch) {
        let startIndex = 0;
        fairMatch.forEach(() => {
          const index = text.indexOf(COMPLEXITY_INDICATOR.FAIR, startIndex);
          if (index !== -1) {
            const range = new vscode.Range(
              new vscode.Position(i, index),
              new vscode.Position(i, index + COMPLEXITY_INDICATOR.FAIR.length)
            );
            fairRanges.push(range);
            startIndex = index + COMPLEXITY_INDICATOR.FAIR.length;
          }
        });
      }

      if (poorMatch) {
        let startIndex = 0;
        poorMatch.forEach(() => {
          const index = text.indexOf(COMPLEXITY_INDICATOR.POOR, startIndex);
          if (index !== -1) {
            const range = new vscode.Range(
              new vscode.Position(i, index),
              new vscode.Position(i, index + COMPLEXITY_INDICATOR.POOR.length)
            );
            poorRanges.push(range);
            startIndex = index + COMPLEXITY_INDICATOR.POOR.length;
          }
        });
      }

      if (badMatch) {
        let startIndex = 0;
        badMatch.forEach(() => {
          const index = text.indexOf(COMPLEXITY_INDICATOR.BAD, startIndex);
          if (index !== -1) {
            const range = new vscode.Range(
              new vscode.Position(i, index),
              new vscode.Position(i, index + COMPLEXITY_INDICATOR.BAD.length)
            );
            badRanges.push(range);
            startIndex = index + COMPLEXITY_INDICATOR.BAD.length;
          }
        });
      }

      if (terribleMatch) {
        let startIndex = 0;
        terribleMatch.forEach(() => {
          const index = text.indexOf(COMPLEXITY_INDICATOR.TERRIBLE, startIndex);
          if (index !== -1) {
            const range = new vscode.Range(
              new vscode.Position(i, index),
              new vscode.Position(
                i,
                index + COMPLEXITY_INDICATOR.TERRIBLE.length
              )
            );
            terribleRanges.push(range);
            startIndex = index + COMPLEXITY_INDICATOR.TERRIBLE.length;
          }
        });
      }
    }
  }

  // Apply decorations
  editor.setDecorations(excellentDecorationType, excellentRanges);
  editor.setDecorations(goodDecorationType, goodRanges);
  editor.setDecorations(fairDecorationType, fairRanges);
  editor.setDecorations(poorDecorationType, poorRanges);
  editor.setDecorations(badDecorationType, badRanges);
  editor.setDecorations(terribleDecorationType, terribleRanges);
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
        /^#\s*(EXCELLENT|GOOD|FAIR|POOR|BAD|TERRIBLE)/.test(trimmedLine)
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
