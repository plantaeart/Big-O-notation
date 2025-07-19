import * as vscode from "vscode";
import { analyzeCodeComplexity } from "./analysis/complexityAnalyzer";
import { BigOWebviewProvider } from "./webview/BigOWebviewProvider";
import {
  getComplexityEmoji,
  getSpaceComplexityEmoji,
} from "./utils/complexityHelper";
import { MethodAnalysis } from "./types";
import { PRIORITIES } from "./constants/complexityNotations";
import {
  badDecorationType,
  excellentDecorationType,
  fairDecorationType,
  goodDecorationType,
  poorDecorationType,
  terribleDecorationType,
} from "./decorations/textDecorations";
import { getMatchDecorationType } from "./utils/complexityIndicatorUtils";
import {
  BAD,
  EXCELLENT,
  FAIR,
  GOOD,
  POOR,
  TERRIBLE,
} from "./constants/complexityIndicators";

export function activate(context: vscode.ExtensionContext) {
  console.log("Big-O Notation extension is now active!");

  // Create webview provider
  const provider = new BigOWebviewProvider(context.extensionUri);

  // Register webview provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      BigOWebviewProvider.viewType,
      provider
    )
  );

  // Register the main command to analyze Python file and add Big-O comments
  const analyzeComplexityCommand = vscode.commands.registerCommand(
    "bigONotation.analyzeComplexity",
    async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showErrorMessage(
          "No active editor found. Please open a Python file."
        );
        return;
      }

      const document = activeEditor.document;
      if (!document.fileName.endsWith(".py")) {
        vscode.window.showErrorMessage(
          "Please open a Python file (.py) to analyze."
        );
        return;
      }

      const fileContent = document.getText();
      const methods = analyzeCodeComplexity(fileContent);

      if (methods.length === 0) {
        vscode.window.showInformationMessage(
          "No Python functions found in the current file."
        );
        provider.updateAnalysis([]);
        return;
      }

      // Update the webview with analysis results
      provider.updateAnalysis(methods);

      // Add comments to the code
      await addBigOComments(activeEditor, methods);

      // Apply decorations to color the complexity indicators
      applyComplexityDecorations(activeEditor, methods);

      vscode.window.showInformationMessage(
        `✅ Updated Big-O comments for ${methods.length} function(s)! Comments replaced with latest analysis. Check the Big-O Analysis panel for detailed results.`
      );
    }
  );

  // Register command to show analysis in status bar
  const showStatusBarCommand = vscode.commands.registerCommand(
    "bigONotation.showInStatusBar",
    () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor || !activeEditor.document.fileName.endsWith(".py")) {
        return;
      }

      const fileContent = activeEditor.document.getText();
      const methods = analyzeCodeComplexity(fileContent);

      if (methods.length > 0) {
        const worstComplexity = methods.reduce((worst, method) => {
          const currentComplexity = method.complexity.notation;
          return compareComplexityPriority(currentComplexity, worst) > 0
            ? currentComplexity
            : worst;
        }, "O(1)");

        const emoji = getComplexityEmoji(worstComplexity);
        vscode.window.showInformationMessage(
          `${emoji} Worst case complexity: ${worstComplexity}`
        );
      }
    }
  );

  context.subscriptions.push(analyzeComplexityCommand, showStatusBarCommand);

  // Auto-analyze when Python file is opened
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.fileName.endsWith(".py")) {
        const methods = analyzeCodeComplexity(editor.document.getText());
        provider.updateAnalysis(methods);
      }
    })
  );
}

// Add Big-O comments to the code
async function addBigOComments(
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

// Apply color decorations to complexity indicators
function applyComplexityDecorations(
  editor: vscode.TextEditor,
  methods: MethodAnalysis[]
): void {
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
      const excellentMatch = getMatchDecorationType(text, EXCELLENT);
      const goodMatch = getMatchDecorationType(text, GOOD);
      const fairMatch = getMatchDecorationType(text, FAIR);
      const poorMatch = getMatchDecorationType(text, POOR);
      const badMatch = getMatchDecorationType(text, BAD);
      const terribleMatch = getMatchDecorationType(text, TERRIBLE);

      if (excellentMatch) {
        let startIndex = 0;
        excellentMatch.forEach(() => {
          const index = text.indexOf(EXCELLENT, startIndex);
          if (index !== -1) {
            const range = new vscode.Range(
              new vscode.Position(i, index),
              new vscode.Position(i, index + EXCELLENT.length)
            );
            excellentRanges.push(range);
            startIndex = index + EXCELLENT.length;
          }
        });
      }

      if (goodMatch) {
        let startIndex = 0;
        goodMatch.forEach(() => {
          const index = text.indexOf(GOOD, startIndex);
          if (index !== -1) {
            const range = new vscode.Range(
              new vscode.Position(i, index),
              new vscode.Position(i, index + GOOD.length)
            );
            goodRanges.push(range);
            startIndex = index + GOOD.length;
          }
        });
      }

      if (fairMatch) {
        let startIndex = 0;
        fairMatch.forEach(() => {
          const index = text.indexOf(FAIR, startIndex);
          if (index !== -1) {
            const range = new vscode.Range(
              new vscode.Position(i, index),
              new vscode.Position(i, index + FAIR.length)
            );
            fairRanges.push(range);
            startIndex = index + FAIR.length;
          }
        });
      }

      if (poorMatch) {
        let startIndex = 0;
        poorMatch.forEach(() => {
          const index = text.indexOf(POOR, startIndex);
          if (index !== -1) {
            const range = new vscode.Range(
              new vscode.Position(i, index),
              new vscode.Position(i, index + POOR.length)
            );
            poorRanges.push(range);
            startIndex = index + POOR.length;
          }
        });
      }

      if (badMatch) {
        let startIndex = 0;
        badMatch.forEach(() => {
          const index = text.indexOf(BAD, startIndex);
          if (index !== -1) {
            const range = new vscode.Range(
              new vscode.Position(i, index),
              new vscode.Position(i, index + BAD.length)
            );
            badRanges.push(range);
            startIndex = index + BAD.length;
          }
        });
      }

      if (terribleMatch) {
        let startIndex = 0;
        terribleMatch.forEach(() => {
          const index = text.indexOf(TERRIBLE, startIndex);
          if (index !== -1) {
            const range = new vscode.Range(
              new vscode.Position(i, index),
              new vscode.Position(i, index + TERRIBLE.length)
            );
            terribleRanges.push(range);
            startIndex = index + TERRIBLE.length;
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

// Helper function to get indentation from a line
function getIndentFromLine(lineText: string): string {
  const match = lineText.match(/^(\s*)/);
  return match ? match[1] : "";
}

// Compare complexity priorities (higher number = worse complexity)
function compareComplexityPriority(
  complexity1: string,
  complexity2: string
): number {
  const priority1 = PRIORITIES[complexity1] || 0;
  const priority2 = PRIORITIES[complexity2] || 0;

  return priority1 - priority2;
}

export function deactivate() {}
