import * as vscode from "vscode";
import { analyzeCodeComplexity } from "../analysis/complexityAnalyzer";
import { BigOWebviewProvider } from "../webview/BigOWebviewProvider";
import { getComplexityEmoji } from "../utils/complexityHelper";
import { addBigOComments } from "../comments/commentManager";
import { applyComplexityDecorations } from "../decorations/decorationManager";
import { compareComplexityPriority } from "../utils/complexityComparator";

// Register the main command to analyze Python file and add Big-O comments
export function registerAnalyzeComplexityCommand(
  context: vscode.ExtensionContext,
  provider: BigOWebviewProvider
): vscode.Disposable {
  return vscode.commands.registerCommand(
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
}

// Register command to show analysis in status bar
export function registerShowStatusBarCommand(
  context: vscode.ExtensionContext
): vscode.Disposable {
  return vscode.commands.registerCommand("bigONotation.showInStatusBar", () => {
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
  });
}

// Register auto-analyze when Python file is opened
export function registerAutoAnalyzeCommand(
  context: vscode.ExtensionContext,
  provider: BigOWebviewProvider
): vscode.Disposable {
  return vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor && editor.document.fileName.endsWith(".py")) {
      const methods = analyzeCodeComplexity(editor.document.getText());
      provider.updateAnalysis(methods);
    }
  });
}
